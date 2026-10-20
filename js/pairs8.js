// v38: GHÉP 8 CẶP ngay trong lượt ôn / bài học — chuyển qua lại với trắc nghiệm giữa chừng, không mất tiến độ của lượt.
// Từ vựng: nghĩa tiếng Việt ↔ từ tiếng Nhật (furigana theo cài đặt). Chữ Hán: chữ (không furigana) ↔ âm Hán Việt + nghĩa.
// Mỗi mục báo kết quả đúng một lần: ghép đúng ngay → đúng; đã từng ghép nhầm → sai (vẫn phải ghép cho xong).
// v40: nút "💡 Quên — xem đáp án": cột trái giữ nguyên, ô bên phải trượt lên / xuống về ngang hàng với ô đúng bên trái.
//      Xem đáp án tính là sai — trừ từ đã đánh dấu "Đã thuộc" (thuộc hẳn): không tính gì.
//      Màn cuối chưa đủ 8 cặp thì thêm mục đến hạn ôn / sắp quên / mới học gần đây cho đủ (ô có chấm nhỏ; ghi lịch ôn, không tính điểm lượt).
import { esc, icon, wordHTML, shuffle, beep, buzz, DAY, startOfDay } from './util.js';
import { D } from './data.js';
import { S } from './settings.js';
import { sameMeaning } from './quiz.js';
import { speak } from './tts.js';
import { P, dueDirs, status, learnedSince, errCount, allMastered, review } from './srs.js';

export const PAIRS = 8;
const isKanji = it => String(it.id).startsWith('k:');
export const pairable = it => !!it && (isKanji(it) ? !!(it.char && it.hv) : !!(it.vi && (it.kanji || it.kana)));
// bỏ trùng, chỉ giữ mục ghép được
export const pairItems = list => [...new Map(list.filter(pairable).map(it => [it.id, it])).values()];

// hàng nút đổi kiểu luyện (đặt ngay dưới thanh tiến độ)
export const modeSwHTML = cur => `<div class="mode-sw" role="group" aria-label="Kiểu luyện">
    <button type="button" class="chip" data-mode="quiz" aria-pressed="${cur === 'quiz'}">Trắc nghiệm</button>
    <button type="button" class="chip" data-mode="pairs" aria-pressed="${cur === 'pairs'}">${icon('match')}Ghép 8 cặp</button></div>`;

function sides(it, script) {
  if (isKanji(it)) return [{ k: it.char, h: `<span class="pk-c" lang="ja" data-bare>${esc(it.char)}</span>` }, { k: it.hv, h: `<b>${esc(it.hv)}</b>${it.nghia ? `<small>${esc(it.nghia)}</small>` : ''}` }];
  return [{ k: it.vi, h: esc(it.vi) }, { k: it.kanji || it.kana, h: wordHTML(it, script), jp: 1 }];
}
// chia màn tối đa 8 cặp; trong một màn không có hai ô trùng chữ hay hai nghĩa đụng nhau (tránh hai đáp án cùng đúng)
const fits = (pick, it) => {
  const [a, b] = sides(it, 'bare');
  return pick.length < PAIRS && !pick.some(p => { const [c, d] = sides(p, 'bare'); return c.k === a.k || d.k === b.k || (!isKanji(p) && !isKanji(it) && sameMeaning(p, it)); });
};
function makeRounds(items) {
  // từ vựng và chữ Hán ghép ở các màn riêng (không trộn hai kiểu ô trong một màn)
  return [...roundsOf(items.filter(it => !isKanji(it))), ...roundsOf(items.filter(isKanji))];
}
function roundsOf(items) {
  const out = [];
  let rest = [...items];
  while (rest.length) {
    const pick = [], left = [];
    for (const it of rest) (fits(pick, it) ? pick : left).push(it);
    if (!pick.length) break;
    out.push(pick);
    rest = left;
  }
  // màn cuối chỉ còn 1 cặp: nhập vào màn trước nếu còn chỗ (một cặp thì không còn gì để ghép)
  if (out.length > 1 && out.at(-1).length === 1 && out.at(-2).length < PAIRS) out.at(-2).push(...out.pop());
  return out;
}

// Mục thêm cho đủ 8 cặp — cùng kiểu (từ / chữ Hán), đã học, chưa "Đã thuộc": đến hạn (quá hạn lâu trước) → sắp quên (đến hạn trong 2 ngày, hay sai) → mới học 7 ngày qua
function fillers(kind, n, exclude, round) {
  const now = Date.now(), pool = (kind === 'kanji' ? D.kanji : D.vocab).filter(it => !exclude.has(it.id) && pairable(it) && status(it) !== 'new' && !allMastered(it));
  const nextDue = it => Math.min(...Object.values(P.get(it.id)?.d || {}).filter(x => x.b > 0 && !x.m).map(x => x.due || Infinity), Infinity);
  const due = pool.filter(it => dueDirs(it, now).length).sort((a, b) => nextDue(a) - nextDue(b));
  const soon = shuffle(pool.filter(it => !dueDirs(it, now).length && (nextDue(it) - now < 2 * DAY || errCount(it) > 0)));
  const recent = shuffle(pool.filter(it => learnedSince(it, startOfDay() - 6 * DAY)));
  const out = [], seen = new Set(), pick = [...round];
  for (const src of [due, soon, recent]) for (const it of src) {
    if (out.length >= n) break;
    if (seen.has(it.id) || !fits(pick, it)) continue;
    seen.add(it.id); out.push(it); pick.push(it);
  }
  return out;
}

// head(done, total) → HTML thanh trên của lượt (nút ✕, tiến độ). onResult(it, ok): ok = true | false | null (không tính — xem đáp án từ đã thuộc).
export function runPairs(view, items, { head, onQuit, onResult, onSwitch, onDone, setKeys, fill = true, exclude = [] }) {
  const all = pairItems(items);
  const rounds = makeRounds(shuffle(all));
  // màn cuối (mỗi kiểu) chưa đủ 8 cặp → thêm mục cần ôn cho đủ
  const extra = new Set();
  if (fill && rounds.length) {
    const ex = new Set([...all.map(it => it.id), ...exclude]);
    for (const kind of ['vocab', 'kanji']) {
      const idx = rounds.map((r, i) => [r, i]).filter(([r]) => (isKanji(r[0]) ? 'kanji' : 'vocab') === kind).map(([, i]) => i).at(-1);
      if (idx == null || rounds[idx].length >= PAIRS) continue;
      for (const it of fillers(kind, PAIRS - rounds[idx].length, ex, rounds[idx])) { rounds[idx].push(it); extra.add(it.id); ex.add(it.id); }
    }
  }
  const bad = new Set(), done = new Set(), peek = new Set();
  const script = S.script === 'kana' ? 'kana' : 'furi';
  let r = 0, sel = { L: null, R: null }, busy = false;
  setKeys?.(null);
  const tile = (it, side) => {
    const s = sides(it, script)[side];
    return `<button type="button" class="tile${s.jp ? ' tile-jp' : ''}${isKanji(it) && !side ? ' tile-kc' : ''}${extra.has(it.id) ? ' is-extra' : ''}" data-id="${esc(it.id)}" data-side="${side ? 'R' : 'L'}" ${s.jp ? 'lang="ja"' : ''} ${extra.has(it.id) && !side ? 'title="Thêm cho đủ 8 cặp: đến hạn ôn, sắp quên hoặc mới học"' : ''}>${s.h}</button>`;
  };
  function round() {
    const set = rounds[r], nx = set.filter(it => extra.has(it.id)).length;
    view.innerHTML = `<div class="run run-pairs">${head(done.size, all.length)}${modeSwHTML('pairs')}
      <div class="pairs-bar"><p class="small muted pairs-hint">Màn ${r + 1}/${rounds.length}${nx ? ` · thêm ${nx} mục cần ôn <span class="dot-x" aria-hidden="true"></span>` : ''}</p>
        <button type="button" class="btn btn-ghost btn-sm pairs-peek" data-act="peek">💡 Quên — xem đáp án</button></div>
      <div class="match">
        <div class="mcol">${shuffle([...set]).map(it => tile(it, 0)).join('')}</div>
        <div class="mcol">${shuffle([...set]).map(it => tile(it, 1)).join('')}</div>
      </div></div>`;
    view.querySelector('[data-act=quit]').onclick = () => onQuit();
    view.querySelector('.mode-sw').onclick = e => {
      const b = e.target.closest('[data-mode=quiz]');
      if (b && !busy) onSwitch(all.filter(it => !done.has(it.id)));
    };
    view.querySelector('[data-act=peek]').onclick = peekAll;
    view.querySelector('.match').onclick = onTap;
    evenRows();
  }
  // mọi ô trong màn cao bằng nhau → khi xếp đáp án, hai ô của một cặp nằm đúng ngang hàng
  function evenRows() {
    const ts = [...view.querySelectorAll('.match .tile')];
    const h = Math.max(...ts.map(t => t.getBoundingClientRect().height));
    if (h > 0) view.querySelector('.match').style.setProperty('--tile-h', Math.ceil(h) + 'px');
  }
  // 💡 xem đáp án: cột trái đứng yên, ô bên phải trượt về ngang hàng với ô đúng (FLIP: đo chỗ cũ → đổi thứ tự → trượt từ chỗ cũ về chỗ mới)
  function peekAll() {
    if (busy) return;
    const [colL, colR] = view.querySelectorAll('.match .mcol');
    const Rs = [...colR.children], first = new Map(Rs.map(b => [b, b.getBoundingClientRect().top]));
    const byId = new Map(Rs.map(b => [b.dataset.id, b]));
    for (const l of colL.children) { const b = byId.get(l.dataset.id); if (b) colR.appendChild(b); }
    const calm = document.documentElement.classList.contains('calm');
    if (!calm) {
      for (const b of Rs) { const dy = first.get(b) - b.getBoundingClientRect().top; if (dy) { b.style.transition = 'none'; b.style.transform = `translate3d(0, ${dy}px, 0)`; } }
      colR.getBoundingClientRect();
      requestAnimationFrame(() => { for (const b of Rs) { b.style.transition = 'transform .55s cubic-bezier(.2, .8, .2, 1)'; b.style.transform = ''; } });
      setTimeout(() => Rs.forEach(b => { b.style.transition = ''; }), 650);
    }
    for (const l of colL.children) if (!l.disabled) { peek.add(l.dataset.id); l.classList.add('is-peek'); byId.get(l.dataset.id)?.classList.add('is-peek'); }
    if (sel.L) sel.L.setAttribute('aria-pressed', 'false');
    if (sel.R) sel.R.setAttribute('aria-pressed', 'false');
    sel = { L: null, R: null };
    const pb = view.querySelector('[data-act=peek]'); pb.disabled = true; pb.textContent = 'Đã xem đáp án — ghép lại để nhớ';
  }
  async function onTap(e) {
    const b = e.target.closest('.tile');
    if (!b || b.disabled || busy) return;
    const side = b.dataset.side;
    if (sel[side]) sel[side].setAttribute('aria-pressed', 'false');
    sel[side] = b; b.setAttribute('aria-pressed', 'true');
    if (side === 'R' && S.autoSpeak) { const it = D.items.get(b.dataset.id); if (it && !isKanji(it)) speak(it.kana); }
    if (!sel.L || !sel.R) return;
    const a = sel.L, c = sel.R;
    sel = { L: null, R: null };
    a.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', 'false');
    if (a.dataset.id === c.dataset.id) {
      a.disabled = c.disabled = true; a.classList.add('done'); c.classList.add('done');
      if (S.sound) beep(true);
      const it = rounds[r].find(x => x.id === a.dataset.id);
      // ghép nhầm → sai; xem đáp án → sai, trừ từ đã đánh dấu "Đã thuộc" (không tính)
      const ok = bad.has(it.id) ? false : peek.has(it.id) ? (allMastered(it) ? null : false) : true;
      busy = true;
      try {
        if (extra.has(it.id)) { if (ok !== null) await review(it.id, isKanji(it) ? 'kh' : 'jv', ok); }
        else { done.add(it.id); await onResult(it, ok); }
      } finally { busy = false; }
      const top = view.querySelector('.run-top');
      if (top) { top.outerHTML = head(done.size, all.length); view.querySelector('[data-act=quit]')?.addEventListener('click', () => onQuit()); }
      if (![...view.querySelectorAll('.tile')].some(t => !t.disabled)) {
        r++;
        setTimeout(() => { if (!view.querySelector('.run-pairs')) return; if (r < rounds.length) round(); else onDone(); }, 450);
      }
    } else {
      bad.add(a.dataset.id); bad.add(c.dataset.id);
      a.classList.add('is-ng'); c.classList.add('is-ng');
      if (S.sound) beep(false);
      if (S.vibrate) buzz();
      setTimeout(() => { a.classList.remove('is-ng'); c.classList.remove('is-ng'); }, 600);
    }
  }
  if (!rounds.length) return onDone();
  round();
}
