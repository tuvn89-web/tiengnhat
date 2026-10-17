// Chữ Hán: thẻ chữ (bấm vào kanji), trang danh sách, ôn chữ Hán, chữ của ngày.
// Thẻ chữ Hán là "phần học Hán": chữ đang học và câu thơ không gắn furigana.
import { esc, rich, kj, wordHTML, kanjiChars, shuffle, icon, toast, debounce } from './util.js';
import { D, LEVELS, KGROUPS, report, unreport } from './data.js';
import { status, dueDirs, errCount, isStar, toggleStar, stats, P } from './srs.js';
import { chips, bindChips, readChip, readChips, openSheet, emptyState, field } from './ui.js';
import { runDrill, opt } from './drill.js';
import { kvGet, kvSet } from './db.js';

const ST_LABEL = { new: 'Chưa học', learning: 'Đang học', known: 'Đã thuộc' };
// やす.む → やす(む)
export const kunText = k => k.replace(/^([^.]+)\.(.+)$/, '$1($2)');

// Các từ trong kho có chữ này (gia đình chữ)
export const familyOf = ch => D.vocab.filter(v => (v.kanji || '').includes(ch));
// Chữ kanji xuất hiện trong kho từ nhưng chưa có thẻ
// Chữ Hán đã có trong từ vựng nhưng chưa có thẻ — kèm vài từ ví dụ, cấp và chủ đề để skill xếp ưu tiên
export function missingKanji() {
  const m = new Map();
  for (const v of D.vocab) {
    if (v.reg === 'kansai') continue;
    for (const c of kanjiChars(v.kanji)) {
      if (D.kanjiByChar.has(c)) continue;
      const x = m.get(c) || { c, n: 0, words: [], levels: new Set(), topics: new Set() };
      x.n++; if (x.words.length < 5) x.words.push(v.kanji);
      if (v.level) x.levels.add(v.level);
      for (const t of v.topics || []) x.topics.add(t);
      m.set(c, x);
    }
  }
  return [...m.values()].sort((a, b) => b.n - a.n).map(x => ({ ...x, levels: [...x.levels].sort().reverse(), topics: [...x.topics] }));
}

// Câu thơ: kanji trong ngoặc chạm được nhưng không có furigana
export const poemHTML = lines => (lines || []).map(l => `<span class="pl">${kj(esc(l))}</span>`).join('');

export function kanjiCardHTML(ch) {
  const k = D.kanjiByChar.get(ch);
  const fam = familyOf(ch);
  const famHTML = fam.length ? `<h3 class="h3">Từ trong kho có chữ này</h3>
    <ul class="rows kfam">${fam.slice(0, 20).map(v => `<li><button type="button" class="row" data-wopen="${esc(v.id)}"><span class="row-jp" lang="ja">${wordHTML(v, 'furi')}</span><span class="row-vi">${esc(v.vi)}</span></button></li>`).join('')}</ul>` : '';
  if (!k) return `<div class="kcard" data-bare>
      <div class="kc-head"><div class="kc-char" lang="ja">${esc(ch)}</div><div class="kc-meta"><p class="kc-vi">Chưa có thẻ cho chữ này.</p>
      <p class="muted small">Chữ này có trong kho từ. Tải "file gửi skill" ở trang Dữ liệu, skill sẽ làm thẻ cho mọi chữ còn thiếu.</p></div></div>
      ${famHTML}</div>`;
  const r = P.get(k.id);
  const prog = r ? ['kh', 'hk'].filter(d => r.d?.[d]).map(d => `${{ kh: 'Chữ → Hán Việt', hk: 'Hán Việt → chữ' }[d]}: hộp ${r.d[d].b}/5`).join(', ') : 'chưa ôn';
  const rep = D.reports[k.id] && !D.reports[k.id]._del;
  const partBtn = p => {
    const has = D.kanjiByChar.has(p.c) && p.c !== ch;
    return `<${has ? `button type="button" data-kopen="${esc(p.c)}"` : 'span'} class="kpart"><b lang="ja">${esc(p.c)}</b><span>${esc(p.hv || '')}${p.nghia ? ' — ' + esc(p.nghia) : ''}</span></${has ? 'button' : 'span'}>`;
  };
  return `<div class="kcard" data-bare>
    <div class="kc-head">
      <div class="kc-char" lang="ja">${esc(k.char)}</div>
      <div class="kc-meta">
        <p class="kc-hv">${esc(k.hv)}</p>
        <p class="kc-vi">${esc(k.nghia || '')}</p>
        <p class="kc-sub">${[k.strokes ? `${k.strokes} nét` : '', k.level, ...(k.groups || []).map(g => KGROUPS[g] || g)].filter(Boolean).map(esc).join(' / ')}</p>
      </div>
    </div>
    ${(k.tho || []).length ? `<section class="kc-tho"><p class="kc-label">Mẹo nhớ</p><p class="kc-poem" lang="vi">${poemHTML(k.tho)}</p></section>` : ''}
    ${(k.parts || []).length ? `<h3 class="h3">Bộ phận</h3><div class="kparts">${k.parts.map(partBtn).join('')}</div>` : ''}
    <h3 class="h3">Cách đọc</h3>
    <dl class="kread" lang="ja">
      ${(k.on || []).length ? `<dt>Âm On</dt><dd>${k.on.map((x, i) => `<span class="${i === 0 ? 'main' : ''}">${esc(x)}</span>`).join('、')}</dd>` : ''}
      ${(k.kun || []).length ? `<dt>Âm Kun</dt><dd>${k.kun.map((x, i) => `<span class="${i === 0 ? 'main' : ''}">${esc(kunText(x))}</span>`).join('、')}</dd>` : ''}
    </dl>
    ${famHTML}
    ${(k.viet || []).length ? `<h3 class="h3">Từ Hán Việt cùng chữ</h3><p class="kviet">${k.viet.map(esc).join(' · ')}</p>` : ''}
    ${(k.similar || []).length ? `<h3 class="h3">Chữ trông giống, dễ nhầm</h3><ul class="ksim">${k.similar.map(s => `<li>${D.kanjiByChar.has(s.c) ? `<button type="button" class="ksim-c" data-kopen="${esc(s.c)}" lang="ja">${esc(s.c)}</button>` : `<span class="ksim-c" lang="ja">${esc(s.c)}</span>`}<span>${rich(s.note || '')}</span></li>`).join('')}</ul>` : ''}
    ${k.note ? `<p class="wd-note">${rich(k.note)}</p>` : ''}
    ${rep ? `<p class="wd-flag">Bạn đã báo sai thẻ này${D.reports[k.id].note ? ': ' + esc(D.reports[k.id].note) : ''}.</p>` : ''}
    <p class="muted small">Tiến độ: ${esc(prog)}.</p>
    <div class="row-btns wrap">
      <button type="button" class="btn btn-ghost" data-ka="rep">${icon('flag')} ${rep ? 'Bỏ báo sai' : 'Báo sai'}</button>
    </div>
  </div>`;
}

export function openKanji(ch) {
  const s = openSheet(kanjiCardHTML(ch), { label: `Chữ ${ch}` });
  const k = D.kanjiByChar.get(ch);
  s.body.addEventListener('click', async e => {
    const a = e.target.closest('[data-ka]')?.dataset.ka;
    if (!a || !k) return;
    if (a === 'star') { const b = e.target.closest('[data-ka]'); b.setAttribute('aria-pressed', await toggleStar(k.id)); }
    if (a === 'rep') {
      if (D.reports[k.id] && !D.reports[k.id]._del) { await unreport(k.id); toast('Đã bỏ báo sai.'); s.close(); return; }
      s.close();
      const s2 = openSheet(`<h2 class="h2">Báo sai thẻ chữ ${esc(ch)}</h2>
        ${field('Sai ở đâu? (không bắt buộc)', '<textarea class="input" rows="3" placeholder="Ví dụ: câu thơ sai luật, âm Hán Việt chưa đúng"></textarea>')}
        <div class="row-btns"><button class="btn btn-primary" data-a="ok">Lưu báo sai</button></div>`, { label: 'Báo sai' });
      s2.body.querySelector('[data-a=ok]').onclick = async () => { await report(k.id, s2.body.querySelector('textarea').value.trim()); s2.close(); toast('Đã ghi. Xuất ở Dữ liệu để skill sửa.'); };
    }
  });
  return s;
}

// ---------- chữ của ngày (K12) ----------
export function kanjiOfDay(date = new Date()) {
  if (!D.kanji.length) return null;
  const pool = D.kanji.filter(k => status(k) !== 'known');
  const list = (pool.length ? pool : D.kanji).slice().sort((a, b) => a.id.localeCompare(b.id));
  const day = Math.floor((date.getTime() - date.getTimezoneOffset() * 6e4) / 864e5);
  return list[day % list.length];
}

// ---------- trang Chữ Hán ----------
const tabs = cur => `<div class="tabs" role="tablist">
  <a role="tab" href="#/chuhan" aria-selected="${cur === 'list'}">Danh sách</a>
  <a role="tab" href="#/chuhan/on" aria-selected="${cur === 'quiz'}">Ôn chữ Hán</a></div>`;

export function renderKanjiList(view) {
  const miss = missingKanji();
  if (!D.kanji.length && !miss.length) { view.innerHTML = `<h1 class="h1">Chữ Hán</h1>${tabs('list')}` + emptyState('Chưa có gói chữ Hán nào. Nhờ skill jp-v01-data làm gói rồi nhập vào.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const st = stats(D.kanji);
  const usedG = Object.keys(KGROUPS).filter(g => D.kanji.some(k => (k.groups || []).includes(g)));
  view.innerHTML = `<h1 class="h1">Chữ Hán</h1>${tabs('list')}
    <p class="muted small">${D.kanji.length} thẻ chữ · đã thuộc ${st.known} · đang học ${st.learning}. Chạm vào chữ kanji ở bất kỳ đâu trong app để mở thẻ.</p>
    <input class="input search" type="search" placeholder="Tìm: chữ, Hán Việt, nghĩa" aria-label="Tìm chữ Hán">
    <details class="filters"><summary>Bộ lọc</summary>
      ${chips('groups', usedG.map(g => [g, KGROUPS[g]]), [])}
      ${chips('levels', LEVELS.map(l => [l, l]), [])}
    </details>
    <div class="kgrid"></div>
    ${miss.length ? `<details class="kmiss"><summary>${miss.length} chữ trong kho từ chưa có thẻ</summary><p class="kmiss-list" lang="ja" data-bare>${miss.map(m => `<button type="button" class="kchip" data-kopen="${esc(m.c)}">${esc(m.c)}</button>`).join('')}</p>
      <p class="muted small">Tải "file gửi skill" ở trang Dữ liệu, skill sẽ làm thẻ cho các chữ này (chữ xuất hiện nhiều làm trước).</p></details>` : ''}`;
  const grid = view.querySelector('.kgrid'), q = view.querySelector('.search');
  const draw = () => {
    const s = q.value.trim().toLowerCase(), gs = readChips(view, 'groups'), lv = readChips(view, 'levels');
    const list = D.kanji.filter(k => (!gs.length || (k.groups || []).some(g => gs.includes(g))) && (!lv.length || lv.includes(k.level))
      && (!s || k.char === s || (k.hv || '').toLowerCase().includes(s) || (k.nghia || '').toLowerCase().includes(s)));
    grid.innerHTML = list.map(k => `<button type="button" class="ktile" data-kopen="${esc(k.char)}" data-bare><span class="ktile-c" lang="ja">${esc(k.char)}</span><span class="ktile-hv">${esc(k.hv)}</span><span class="dot dot-${status(k)}" title="${ST_LABEL[status(k)]}"></span></button>`).join('') || emptyState('Không có chữ nào khớp.');
  };
  q.addEventListener('input', debounce(draw, 120));
  bindChips(view, draw);
  draw();
}

// ---------- ôn chữ Hán (K10) ----------
const KDIRS = [['kh', 'Chữ → Hán Việt'], ['hk', 'Hán Việt → chọn chữ'], ['mix', 'Trộn']];
function kOptsFor(k, dir) {
  const sim = new Set((k.similar || []).map(s => s.c));
  const scored = D.kanji.filter(o => o.id !== k.id).map(o => {
    let s = Math.random() * 5;
    if (sim.has(o.char) || (o.similar || []).some(x => x.c === k.char)) s += 100;
    if ((o.parts || []).some(p => (k.parts || []).some(q => q.c === p.c))) s += 20;
    if ((o.groups || []).some(g => (k.groups || []).includes(g))) s += 6;
    if (o.level === k.level) s += 2;
    return [s, o];
  }).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  const seen = new Set([dir === 'kh' ? k.hv : k.char]), out = [];
  for (const o of scored) { const key = dir === 'kh' ? o.hv : o.char; if (seen.has(key)) continue; seen.add(key); out.push(o); if (out.length >= 3) break; }
  return out;
}
export function kanjiQuestion(k, dir) {
  const others = kOptsFor(k, dir);
  if (others.length < 2) return null;
  const after = `<div class="mini-k" data-bare><span class="mini-k-c" lang="ja">${esc(k.char)}</span><span><b>${esc(k.hv)}</b> — ${esc(k.nghia || '')}</span></div>${(k.tho || []).length ? `<p class="kc-poem small" data-bare>${poemHTML(k.tho)}</p>` : ''}<button type="button" class="btn btn-ghost btn-sm" data-kopen="${esc(k.char)}">Mở thẻ chữ</button>`;
  if (dir === 'kh') return {
    kind: 'choice', tag: 'Chữ → Hán Việt', level: k.level, promptBare: true,
    prompt: `<p class="prompt-jp kc-big" lang="ja" data-bare>${esc(k.char)}</p>`, hint: 'Chọn âm Hán Việt và nghĩa',
    opts: shuffle([k, ...others].map(o => opt(o.id, `<b>${esc(o.hv)}</b> — ${esc(o.nghia || '')}`, false))), answer: k.id,
    after, review: { id: k.id, dir: 'kh' },
  };
  return {
    kind: 'choice', tag: 'Hán Việt → chữ', level: k.level, promptBare: true,
    prompt: `<p class="prompt-vi">${esc(k.hv)}</p><p class="prompt-hint">${esc(k.nghia || '')}</p>`, hint: 'Chọn đúng chữ (có chữ trông rất giống)',
    opts: shuffle([k, ...others].map(o => opt(o.id, `<span class="kc-opt" data-bare>${esc(o.char)}</span>`))), answer: k.id,
    after, review: { id: k.id, dir: 'hk' },
  };
}
export function buildKanjiQs(o) {
  let pool = D.kanji.filter(k => (!o.groups?.length || (k.groups || []).some(g => o.groups.includes(g))) && (!o.levels?.length || o.levels.includes(k.level)) && (!o.chars || o.chars.includes(k.char)));
  if (o.source === 'due') pool = pool.filter(k => dueDirs(k).length);
  else if (o.source === 'new') pool = pool.filter(k => status(k) === 'new');
  else if (o.source === 'wrong') pool = pool.filter(k => errCount(k) > 0).sort((a, b) => errCount(b) - errCount(a));
  else if (o.source === 'star') pool = pool.filter(k => isStar(k.id));
  if (o.source !== 'wrong') pool = shuffle(pool);
  const qs = [];
  for (const k of pool) {
    let dir = o.dir;
    if (o.source === 'due') { const dd = dueDirs(k); dir = dir === 'mix' ? dd[Math.floor(Math.random() * dd.length)] : (dd.includes(dir) ? dir : null); }
    else if (dir === 'mix') dir = Math.random() < .5 ? 'kh' : 'hk';
    if (!dir) continue;
    const q = kanjiQuestion(k, dir);
    if (q) qs.push(q);
    if (qs.length >= o.count) break;
  }
  return qs;
}
export async function renderKanjiQuizSetup(view, ctx) {
  const o = { dir: 'mix', source: 'due', groups: [], levels: [], count: 20, ...(await kvGet('kanjiSetup', {})) };
  if (D.kanji.length < 3) { view.innerHTML = `<h1 class="h1">Chữ Hán</h1>${tabs('quiz')}` + emptyState('Cần ít nhất 3 thẻ chữ Hán để ôn.'); return; }
  const st = stats(D.kanji);
  const usedG = Object.keys(KGROUPS).filter(g => D.kanji.some(k => (k.groups || []).includes(g)));
  view.innerHTML = `<h1 class="h1">Chữ Hán</h1>${tabs('quiz')}
    <form class="setup" onsubmit="return false">
      <p class="muted small">Đây là phần kiểm tra chữ Hán nên chữ không có furigana.</p>
      <fieldset><legend>Kiểu câu hỏi</legend>${chips('dir', KDIRS, o.dir, false)}</fieldset>
      <fieldset><legend>Lấy chữ nào</legend>${chips('source', [['due', 'Đến hạn ôn', st.due], ['new', 'Chữ mới', st.new], ['wrong', 'Hay sai'], ['all', 'Tất cả', st.total]], o.source, false)}</fieldset>
      <fieldset><legend>Nhóm <small>(không chọn = tất cả)</small></legend>${chips('groups', usedG.map(g => [g, KGROUPS[g]]), o.groups)}</fieldset>
      <fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(n => [String(n), String(n)]), String(o.count), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>`;
  const f = view.querySelector('.setup');
  const read = () => ({ dir: readChip(f, 'dir'), source: readChip(f, 'source'), groups: readChips(f, 'groups'), levels: readChips(f, 'levels'), count: +readChip(f, 'count') });
  const upd = () => {
    const n = buildKanjiQs({ ...read(), count: 999 }).length;
    f.querySelector('.setup-count').textContent = n ? `Có ${n} câu phù hợp.` : (read().source === 'due' ? 'Không có chữ nào đến hạn ôn. Chọn "Chữ mới".' : 'Không có chữ nào khớp lựa chọn này.');
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd); upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = read(); await kvSet('kanjiSetup', x);
    ctx.backTo = '#/chuhan/on';
    runDrill(view, buildKanjiQs(x), ctx, { title: 'Ôn chữ Hán', again: () => ctx.go('#/chuhan/on', true) });
  };
}

