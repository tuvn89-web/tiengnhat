import { esc, wordHTML, normVi, shuffle, beep, buzz, icon, rich, plain } from './util.js';
import { verbInfo, conjugate } from './conj.js';
import { D, LEVELS } from './data.js';
import { S } from './settings.js';
import { review, stats } from './srs.js';
import { chips, bindChips, readChip, readChips, topicOpts, emptyState, wtabs } from './ui.js';
import { selectItems, sameMeaning } from './quiz.js';
import { kvGet, kvSet } from './db.js';
import { beginSession, goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';
import { bookSourceOpts } from './notes.js';

export const PAIR_TYPES = [['vi-kana', 'Việt – chữ mềm/cứng'], ['vi-kanji', 'Việt – Kanji'], ['kana-kanji', 'Chữ mềm/cứng – Kanji (không furigana)'],
  ['ru-masu', 'Thể từ điển – thể ます'], ['tu-tha', 'Tự động từ – tha động từ'], ['trai-nghia', 'Trái nghĩa'], ['chu-hv', 'Chữ Hán – âm Hán Việt (không furigana)']];
const VOCAB_TYPES = ['vi-kana', 'vi-kanji', 'kana-kanji'];
// Một vế của cặp tham chiếu tới từ khác: mã trong kho hoặc {w, vi}
const refSide = r => {
  if (r && typeof r === 'object') return r.w ? { k: plain(r.w), h: rich(r.w), jp: 1 } : null;
  const o = D.items.get(r);
  return o ? { k: o.kanji || o.kana, h: wordHTML(o, 'furi'), jp: 1 } : null;
};
// Cặp kiểu mới: dựng sẵn hai vế từ dữ liệu
function extraPairs(type, base) {
  const out = [];
  if (type === 'ru-masu') for (const it of base) { if (!['v1', 'v5', 'v3'].includes(it.pos)) continue; const v = verbInfo(it), m = v && conjugate(v, 'masu'); if (m) out.push({ id: it.id, L: { k: plain(v.dict), h: rich(v.dict), jp: 1 }, R: { k: plain(m.mark), h: rich(m.mark), jp: 1 } }); }
  if (type === 'tu-tha') for (const it of base) {
    if (it.vt !== 'tu' || !it.pair) continue;
    const r = refSide(it.pair); if (r) out.push({ id: it.id, L: { k: it.kanji || it.kana, h: wordHTML(it, 'furi'), jp: 1 }, R: r });
  }
  if (type === 'trai-nghia') for (const it of base) {
    const r = (it.ant || []).map(refSide).find(Boolean); if (r) out.push({ id: it.id, L: { k: it.kanji || it.kana, h: wordHTML(it, 'furi'), jp: 1 }, R: r });
  }
  if (type === 'chu-hv') for (const k of D.kanji) out.push({ id: k.id, L: { k: k.char, h: esc(k.char), jp: 1, bare: 1 }, R: { k: k.hv, h: `<b>${esc(k.hv)}</b> <small>${esc(k.nghia || '')}</small>` } });
  // bỏ cặp trùng (A–B và B–A)
  const seen = new Set();
  return out.filter(p => { const key = [p.L.k, p.R.k].sort().join('|'); if (seen.has(key)) return false; seen.add(key); return true; });
}
const PER = 6;

function sides(it, type) {
  if (it.L) return [it.L, it.R];
  if (type === 'vi-kana') return [{ k: normVi(it.vi), h: esc(it.vi) }, { k: it.kana, h: esc(it.kana), jp: 1 }];
  // Việt – Kanji: kanji có furigana. Chữ mềm/cứng – Kanji là bài luyện đọc kanji nên kanji để trần.
  if (type === 'vi-kanji') return [{ k: normVi(it.vi), h: esc(it.vi) }, { k: it.kanji || it.kana, h: wordHTML(it, 'furi'), jp: 1 }];
  return [{ k: it.kana, h: esc(it.kana), jp: 1 }, { k: it.kanji, h: wordHTML(it, 'bare'), jp: 1 }];
}

// chia thành các màn 6 cặp, trong một màn không có hai ô trùng chữ (tránh hai đáp án cùng đúng)
export function buildRounds(pool, type, rounds) {
  const out = [];
  let rest = [...pool];
  for (let r = 0; r < rounds && rest.length >= 3; r++) {
    const pick = [], L = new Set(), R = new Set(), left = [];
    // cùng màn không có hai nghĩa đụng nhau (掃除 / 片付け) hay hai từ cùng chữ khác cách đọc
    const clash = it => it.vi && pick.some(p => p.vi && (sameMeaning(p, it) || (type === 'kana-kanji' && p.kana === it.kana)));
    for (const it of rest) {
      const [a, b] = sides(it, type);
      if (pick.length < PER && !L.has(a.k) && !R.has(b.k) && !clash(it)) { pick.push(it); L.add(a.k); R.add(b.k); }
      else left.push(it);
    }
    if (pick.length < 3) break;
    out.push(pick);
    rest = left;
  }
  return out;
}

export async function renderMatchSetup(view, ctx) {
  const o = { type: 'vi-kana', source: 'learned', levels: [], topics: [], rounds: S.matchRounds, ...(await kvGet('matchSetup', {})) };
  if (!D.vocab.length) { view.innerHTML = emptyState('Chưa có từ vựng nào. Vào Dữ liệu để nhập gói từ.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const st = stats(D.vocab);
  view.innerHTML = `
    <h1 class="h1">Luyện tập</h1>${wtabs('match')}
    <form class="setup" onsubmit="return false">
      <fieldset><legend>Kiểu ghép</legend>${chips('type', PAIR_TYPES, o.type, false)}</fieldset>
      <fieldset><legend>Lấy từ nào</legend>${chips('source', [['learned', 'Từ đã học', st.total - st.new], ['today', 'Học hôm nay'], ['week', '7 ngày qua'], ['due', 'Đến hạn ôn', st.due], ['wrong', 'Hay sai'], ['star', 'Gắn sao'], ...bookSourceOpts(D.vocab), ['all', 'Tất cả', st.total]], o.source === 'new' ? 'learned' : o.source, false)}</fieldset>
      <fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels)}</fieldset>
      <fieldset><legend>Chủ đề <small>(không chọn = tất cả)</small></legend>${chips('topics', topicOpts(), o.topics)}</fieldset>
      <fieldset><legend>Số màn</legend>${chips('rounds', [1, 2, 3, 4, 5].map(n => [String(n), String(n)]), String(o.rounds), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>`;
  const form = view.querySelector('.setup');
  const read = () => ({ type: readChip(form, 'type'), source: readChip(form, 'source'), levels: readChips(form, 'levels'), topics: readChips(form, 'topics'), rounds: +readChip(form, 'rounds') });
  const pool = x => {
    if (!VOCAB_TYPES.includes(x.type)) return shuffle(extraPairs(x.type, x.type === 'chu-hv' ? [] : selectItems({ ...x, source: x.source === 'due' ? 'all' : x.source })));
    const p = selectItems({ ...x, needKanji: x.type !== 'vi-kana' }); return x.source === 'new' ? p : shuffle(p);
  };
  const upd = () => {
    const x = read();
    const rs = buildRounds(pool(x), x.type, x.rounds);
    form.querySelector('.setup-count').textContent = rs.length
      ? `Đủ cho ${rs.length} màn (${rs.reduce((s, r) => s + r.length, 0)} từ).`
      : ({ 'tu-tha': 'Chưa đủ cặp tự – tha trong kho (cần dữ liệu cặp từ skill). Thử chọn "Tất cả".', 'trai-nghia': 'Chưa đủ cặp trái nghĩa trong kho (cần dữ liệu từ skill). Thử chọn "Tất cả".', 'chu-hv': 'Cần ít nhất 3 thẻ chữ Hán.' }[x.type] || 'Chưa đủ từ khớp lựa chọn này (cần ít nhất 3 từ). Thử chọn "Tất cả" hoặc bỏ bớt bộ lọc.');
    form.querySelector('[data-act=start]').disabled = !rs.length;
  };
  bindChips(form, upd); upd();
  form.querySelector('[data-act=start]').onclick = async () => {
    const x = read();
    await kvSet('matchSetup', x);
    runMatch(view, buildRounds(pool(x), x.type, x.rounds), x.type, ctx);
  };
}

export function runMatch(view, rounds, type, ctx, { onDone, again } = {}) {
  const wrong = new Set(), all = rounds.flat();
  let r = 0, mistakes = 0, t0 = 0, timer = null, sel = { L: null, R: null };
  const fmt = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  ctx.onLeave(() => clearInterval(timer));
  beginSession(ctx);

  function round() {
    const items = rounds[r];
    const L = shuffle(items), R = shuffle(items);
    view.innerHTML = `<div class="run">
      <div class="run-top">
        <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
        <div class="bar"><i style="width:${(r / rounds.length) * 100}%"></i></div>
        <span class="run-n">Màn ${r + 1}/${rounds.length}</span>
      </div>
      <p class="match-info"><span class="clock">${fmt(t0 ? Date.now() - t0 : 0)}</span> <span>Sai: <b class="mis">${mistakes}</b></span></p>
      <div class="match">
        <div class="mcol">${L.map(it => tile(it, 0)).join('')}</div>
        <div class="mcol">${R.map(it => tile(it, 1)).join('')}</div>
      </div></div>`;
    view.querySelector('[data-act=quit]').onclick = () => (r > 0 || t0 ? finish(true) : goBack(ctx));
    view.querySelector('.match').addEventListener('click', onTap);
  }
  function tile(it, side) {
    const s = sides(it, type)[side];
    return `<button type="button" class="tile ${s.jp ? 'tile-jp' : ''}" data-id="${esc(it.id)}" data-side="${side ? 'R' : 'L'}" ${s.jp ? 'lang="ja"' : ''} ${(type === 'kana-kanji' && side) || s.bare ? 'data-bare' : ''}>${s.h}</button>`;
  }
  function onTap(e) {
    const b = e.target.closest('.tile');
    if (!b || b.disabled) return;
    if (!t0) { t0 = Date.now(); timer = setInterval(() => { const c = view.querySelector('.clock'); if (c) c.textContent = fmt(Date.now() - t0); }, 1000); }
    const side = b.dataset.side;
    if (sel[side]) sel[side].setAttribute('aria-pressed', 'false');
    sel[side] = b; b.setAttribute('aria-pressed', 'true');
    if (!sel.L || !sel.R) return;
    const a = sel.L, c = sel.R;
    sel = { L: null, R: null };
    a.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', 'false');
    if (a.dataset.id === c.dataset.id) {
      a.disabled = c.disabled = true;
      a.classList.add('done'); c.classList.add('done');
      if (S.sound) beep(true);
      if (![...view.querySelectorAll('.tile')].some(t => !t.disabled)) {
        r++;
        setTimeout(() => (r < rounds.length ? round() : finish()), 450);
      }
    } else {
      mistakes++;
      wrong.add(a.dataset.id); wrong.add(c.dataset.id);
      view.querySelector('.mis').textContent = mistakes;
      a.classList.add('is-ng'); c.classList.add('is-ng');
      if (S.sound) beep(false);
      if (S.vibrate) buzz();
      setTimeout(() => { a.classList.remove('is-ng'); c.classList.remove('is-ng'); }, 600);
    }
  }
  async function finish(early = false) {
    clearInterval(timer);
    const played = early ? rounds.slice(0, r + 1).flat() : all;
    const dir = type === 'kana-kanji' ? 'kr' : 'jv';
    const finished = new Set(rounds.slice(0, r).flat().map(x => x.id)); // chỉ tính đúng cho màn đã xong
    for (const it of VOCAB_TYPES.includes(type) ? played : []) {
      if (wrong.has(it.id)) await review(it.id, dir, false);
      else if (finished.has(it.id)) await review(it.id, dir, true, { onlyIfDue: true });
    }
    const wl = all.filter(it => wrong.has(it.id));
    ctx.inRun = true;
    view.innerHTML = `<section class="result">${crumbHTML(ctx)}
      <h1 class="h1">${early ? 'Đã dừng' : 'Xong'}</h1>
      <p class="result-score"><b>${fmt(t0 ? Date.now() - t0 : 0)}</b></p>
      <p class="result-sub">${mistakes} lần ghép sai</p>
      ${wl.length ? `<h2 class="h2">Cặp ghép nhầm</h2><ul class="wlist">${wl.map(it => it.L ? `<li><span lang="ja" ${it.L.bare ? 'data-bare' : ''}>${it.L.h}</span><span ${it.R.jp ? 'lang="ja"' : ''}>${it.R.h}</span></li>` : `<li><span lang="ja">${wordHTML(it, 'furi')}</span><span>${esc(it.vi)}</span></li>`).join('')}</ul>` : ''}
      <div class="row-btns stack">
        <button class="btn btn-primary" data-act="again">Chơi lượt mới</button>
      </div>${resultNavHTML(ctx)}</section>`;
    view.querySelector('[data-act=again]').onclick = () => (again ? again() : ctx.go('#/ghep', true));
    bindResultNav(view, ctx);
    onDone?.({ early, mistakes, wrong: wl });
    ctx.sessionDone?.();
  }
  round();
}
