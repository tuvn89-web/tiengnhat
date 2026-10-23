// Chữ Hán: thẻ chữ (bấm vào kanji), trang danh sách, ôn chữ Hán, chữ của ngày.
// Thẻ chữ Hán là "phần học Hán": chữ đang học và câu thơ không gắn furigana.
import { appendChunks } from './lazy.js';
import { esc, rich, kj, wordHTML, kanjiChars, shuffle, icon, toast, debounce } from './util.js';
import { D, LEVELS, KGROUPS, report, unreport } from './data.js';
import { status, dueDirs, errCount, isStar, toggleStar, stats, P, TOP, isRelearn } from './srs.js';
import { toggleRelearn } from './bare.js';
import { markBtnHTML } from './marks.js';
import { chips, bindChips, readChip, readChips, openSheet, emptyState, field } from './ui.js';
import { runDrill, opt } from './drill.js';
import { kvGet, kvSet } from './db.js';
import { amonNoteHTML } from './amon.js';

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

// v31 (M2): gia đình chữ — các thẻ có chung một bộ phận (lấy từ trường parts của thẻ)
let _fam = null;
function famIndex() {
  if (_fam && _fam.n === D.kanji.length) return _fam.m;
  const m = new Map();
  for (const k of D.kanji) for (const p of k.parts || []) {
    if (!m.has(p.c)) m.set(p.c, { c: p.c, hv: p.hv || '', nghia: p.nghia || '', ks: [] });
    const g = m.get(p.c);
    if (!g.ks.includes(k)) g.ks.push(k);
  }
  for (const g of m.values()) g.ks.sort((a, b) => ['N5', 'N4', 'N3', 'N2', 'N1'].indexOf(a.level) - ['N5', 'N4', 'N3', 'N2', 'N1'].indexOf(b.level) || (a.strokes || 0) - (b.strokes || 0));
  _fam = { n: D.kanji.length, m };
  return m;
}
export const familyOfPart = c => famIndex().get(c)?.ks || [];
const kchip = k => `<button type="button" class="kchip kfam-c" data-kopen="${esc(k.char)}"><b lang="ja">${esc(k.char)}</b><small>${esc(k.hv)}</small></button>`;
const chipsMax = (ks, n = 12) => ks.slice(0, n).map(kchip).join('') + (ks.length > n ? `<span class="muted small kfam-more">và ${ks.length - n} chữ khác</span>` : '');
// v55 (đợt 8, mục 7): phần CHỈ ÂM — trong nhóm chữ chung một bộ phận, từ 3 chữ trở lên (kể cả chữ đang xem) cùng một âm On
// → bộ phận đó nhiều khả năng chỉ âm: 青 → 清, 晴, 精, 請 đều đọc セイ
function soundNote(comp, k, os) {
  const all = [k, ...os], cnt = new Map();
  for (const x of all) for (const o of new Set(x.on || [])) cnt.set(o, (cnt.get(o) || 0) + 1);
  const best = [...cnt].filter(([o, n]) => n >= 3 && n / all.length >= 0.5 && (k.on || []).includes(o)).sort((a, b) => b[1] - a[1])[0]; // bộ chỉ nghĩa (口, 氵, 言…) có hàng trăm chữ nên tỉ lệ thấp → bỏ
  if (!best) return '';
  const xs = all.filter(x => (x.on || []).includes(best[0]));
  return `<p class="kfam-snd">Phần <b lang="ja">${esc(comp)}</b> chỉ âm: <b lang="ja">${esc(best[0])}</b> — ${xs.length}/${all.length} chữ cùng đọc như vậy (${xs.slice(0, 8).map(x => `<span lang="ja">${esc(x.char)}</span> ${esc(String(x.hv || '').split(/[\s/]/)[0])}`).join(', ')}). Gặp chữ lạ có phần này thì thử đọc <span lang="ja">${esc(best[0])}</span> trước.</p>`;
}
function familyHTML(k) {
  const rows = [];
  const inMe = familyOfPart(k.char).filter(o => o !== k);
  if (inMe.length) rows.push(`<div class="kfam-row"><p class="kfam-h">Chữ có chứa <b lang="ja">${esc(k.char)}</b></p>${soundNote(k.char, k, inMe)}<div class="kfam-l">${chipsMax(inMe)}</div></div>`);
  for (const p of k.parts || []) {
    const os = familyOfPart(p.c).filter(o => o !== k);
    if (os.length) rows.push(`<div class="kfam-row"><p class="kfam-h">Cùng bộ phận <b lang="ja">${esc(p.c)}</b> ${esc(p.hv || '')}${p.nghia ? ` — ${esc(p.nghia)}` : ''}</p>${soundNote(p.c, k, os)}<div class="kfam-l">${chipsMax(os)}</div></div>`);
  }
  return rows.length ? `<h3 class="h3">Gia đình chữ</h3><div class="kfam">${rows.join('')}</div>` : '';
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
  const prog = r ? ['kh', 'hk'].filter(d => r.d?.[d]).map(d => `${{ kh: 'Chữ → Hán Việt', hk: 'Hán Việt → chữ' }[d]}: hộp ${r.d[d].b}/${TOP}${r.d[d].m ? ' (thuộc hẳn)' : ''}`).join(', ') : 'chưa ôn';
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
      ${markBtnHTML(k.id)}
    </div>
    ${(k.tho || []).length ? `<section class="kc-tho"><p class="kc-label">Mẹo nhớ</p><p class="kc-poem" lang="vi">${poemHTML(k.tho)}</p></section>` : ''}
    ${(k.parts || []).length ? `<h3 class="h3">Bộ phận</h3><div class="kparts">${k.parts.map(partBtn).join('')}</div>` : ''}
    ${familyHTML(k)}
    <h3 class="h3">Cách đọc</h3>
    <dl class="kread" lang="ja">
      ${(k.on || []).length ? `<dt>Âm On</dt><dd>${k.on.map((x, i) => `<span class="${i === 0 ? 'main' : ''}">${esc(x)}</span>`).join('、')}</dd>` : ''}
      ${(k.kun || []).length ? `<dt>Âm Kun</dt><dd>${k.kun.map((x, i) => `<span class="${i === 0 ? 'main' : ''}">${esc(kunText(x))}</span>`).join('、')}</dd>` : ''}
    </dl>
    ${amonNoteHTML(k)}
    ${famHTML}
    ${(k.viet || []).length ? `<h3 class="h3">Từ Hán Việt cùng chữ</h3><p class="kviet">${k.viet.map(esc).join(' · ')}</p>` : ''}
    ${(k.similar || []).length ? `<h3 class="h3">Chữ trông giống, dễ nhầm</h3><ul class="ksim">${k.similar.map(s => `<li>${D.kanjiByChar.has(s.c) ? `<button type="button" class="ksim-c" data-kopen="${esc(s.c)}" lang="ja">${esc(s.c)}</button>` : `<span class="ksim-c" lang="ja">${esc(s.c)}</span>`}<span>${rich(s.note || '')}</span></li>`).join('')}</ul>` : ''}
    ${k.note ? `<p class="wd-note">${rich(k.note)}</p>` : ''}
    ${rep ? `<p class="wd-flag">Bạn đã báo sai thẻ này${D.reports[k.id].note ? ': ' + esc(D.reports[k.id].note) : ''}.</p>` : ''}
    <p class="muted small">Tiến độ: ${esc(prog)}.</p>
    ${status(k) !== 'new' || isRelearn(k.id) ? `<p class="small kc-rl-note" data-for="${esc(k.id)}" ${isRelearn(k.id) ? '' : 'hidden'}>↺ Đang gắn nhãn <b>cần học lại</b>: từ có chữ này hiện furigana, chữ nằm đầu "Học chữ Hán mới". Nhãn tự gỡ khi học lại chữ ở đó hoặc trả lời đúng thẻ chữ 2 lần liền.</p>` : ''}
    <div class="row-btns wrap">
      ${status(k) !== 'new' || isRelearn(k.id) ? `<button type="button" class="btn btn-ghost rl-btn rl-card" data-rl="${esc(k.id)}" aria-pressed="${isRelearn(k.id)}"><small>${isRelearn(k.id) ? 'Đã học lại ✓' : 'Chưa học chữ này'}</small></button>` : ''}
      <button type="button" class="btn btn-ghost" data-ka="rep">${icon('flag')} ${rep ? 'Bỏ báo sai' : 'Báo sai'}</button>
    </div>
  </div>`;
}

export function openKanji(ch) {
  const s = openSheet(kanjiCardHTML(ch), { label: `Chữ ${ch}` });
  const k = D.kanjiByChar.get(ch);
  s.body.addEventListener('click', async e => {
    const rl = e.target.closest('[data-rl]');
    if (rl) { toggleRelearn(rl.dataset.rl); return; } // v41: nút "Chưa học" / "Đã học lại"
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
let _kSorted = null, _kSortKey = '';
export function kanjiOfDay(date = new Date()) {
  if (!D.kanji.length) return null;
  // v39: danh sách chữ xếp theo mã chỉ xếp lại khi kho chữ đổi (trước đây mỗi lần mở Trang chủ đều xếp lại hơn 1.700 chữ)
  if (_kSortKey !== D.kanji.length + ':' + D.items.size) { _kSorted = D.kanji.slice().sort((a, b) => a.id.localeCompare(b.id)); _kSortKey = D.kanji.length + ':' + D.items.size; }
  const pool = _kSorted.filter(k => status(k) !== 'known');
  const list = pool.length ? pool : _kSorted;
  const day = Math.floor((date.getTime() - date.getTimezoneOffset() * 6e4) / 864e5);
  return list[day % list.length];
}

// ---------- trang Chữ Hán ----------
const tabs = cur => `<div class="tabs" role="tablist">
  <a role="tab" href="#/chuhan" aria-selected="${cur === 'list'}">Danh sách</a>
  <a role="tab" href="#/chuhan/on" aria-selected="${cur === 'quiz'}">Ôn chữ Hán</a></div>`;

export function renderKanjiList(view) {
  const miss = missingKanji();
  if (!D.kanji.length && !miss.length) { view.innerHTML = `<h1 class="h1">Chữ Hán</h1>${tabs('list')}` + emptyState('Chưa có gói chữ Hán nào. Mở app khi có mạng để tải dữ liệu, hoặc bật lại nhóm gói đã tắt ở trang Dữ liệu.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const st = stats(D.kanji);
  const usedG = Object.keys(KGROUPS).filter(g => D.kanji.some(k => (k.groups || []).includes(g)));
  view.innerHTML = `<h1 class="h1">Chữ Hán</h1>${tabs('list')}
    <p class="muted small">${D.kanji.length} thẻ chữ · đã thuộc ${st.known} · đang học ${st.learning}. Chạm vào chữ kanji ở bất kỳ đâu trong app để mở thẻ.</p>
    <input class="input search" type="search" placeholder="Tìm: chữ, Hán Việt, nghĩa" aria-label="Tìm chữ Hán">
    ${chips('kview', [['list', 'Từng chữ'], ['fam', 'Theo gia đình chữ']], 'list', false)}
    <details class="filters"><summary>Bộ lọc</summary>
      ${chips('groups', usedG.map(g => [g, KGROUPS[g]]), [])}
      ${chips('levels', LEVELS.map(l => [l, l]), [])}
    </details>
    <div class="kgrid"></div>
    ${miss.length ? `<details class="kmiss"><summary>${miss.length} chữ trong kho từ chưa có thẻ</summary><p class="kmiss-list" lang="ja" data-bare>${miss.map(m => `<button type="button" class="kchip" data-kopen="${esc(m.c)}">${esc(m.c)}</button>`).join('')}</p>
      <p class="muted small">Tải "file gửi skill" ở trang Dữ liệu, skill sẽ làm thẻ cho các chữ này (chữ xuất hiện nhiều làm trước).</p></details>` : ''}`;
  const grid = view.querySelector('.kgrid'), q = view.querySelector('.search');
  const tile = k => `<button type="button" class="ktile" data-kopen="${esc(k.char)}" data-bare><span class="ktile-c" lang="ja">${esc(k.char)}</span><span class="ktile-hv">${esc(k.hv)}</span><span class="dot dot-${status(k)}" title="${ST_LABEL[status(k)]}"></span>${isRelearn(k.id) ? '<span class="kt-rl" title="Cần học lại">↺</span>' : ''}</button>`;
  let drawN = 0;
  const draw = () => {
    drawN++;
    const s = q.value.trim().toLowerCase(), gs = readChips(view, 'groups'), lv = readChips(view, 'levels');
    const okK = k => (!gs.length || (k.groups || []).some(g => gs.includes(g))) && (!lv.length || lv.includes(k.level));
    const hit = k => !s || k.char === s || (k.hv || '').toLowerCase().includes(s) || (k.nghia || '').toLowerCase().includes(s);
    // v31 (M2): xem theo gia đình chữ — nhóm các chữ có chung bộ phận (nhóm từ 3 chữ), nhóm đông xếp trước
    if (readChip(view, 'kview') === 'fam') {
      const groups = [...famIndex().values()].map(g => {
        const head = D.kanjiByChar.get(g.c);
        const ks = g.ks.filter(okK);
        const match = !s || g.c === s || (g.hv || '').toLowerCase().includes(s) || (g.nghia || '').toLowerCase().includes(s) || ks.some(hit);
        return { ...g, head, ks, match };
      }).filter(g => g.ks.length >= 3 && g.match).sort((a, b) => b.ks.length - a.ks.length);
      grid.className = 'kfams';
      grid.innerHTML = groups.map((g, i) => `<details class="kfam-g" data-c="${esc(g.c)}" ${i < 2 ? 'open' : ''}><summary><b class="kfam-gc" lang="ja" data-bare>${esc(g.c)}</b> ${esc(g.head?.hv || g.hv)}${(g.head?.nghia || g.nghia) ? ` — ${esc(g.head?.nghia || g.nghia)}` : ''} <span class="muted small">· ${g.ks.length} chữ</span></summary><div class="kgrid"></div></details>`).join('') || emptyState('Không có nhóm nào khớp.');
      const fill = d => { const g = groups.find(x => x.c === d.dataset.c); const box = d.querySelector('.kgrid'); if (g && !box.childElementCount) box.innerHTML = [...(g.head && okK(g.head) && !g.ks.includes(g.head) ? [g.head] : []), ...g.ks].map(tile).join(''); };
      grid.querySelectorAll('.kfam-g').forEach(d => { if (d.open) fill(d); d.addEventListener('toggle', () => d.open && fill(d)); });
      return;
    }
    const list = D.kanji.filter(k => okK(k) && hit(k));
    // v37: danh sách dài (hơn 1.700 chữ) chia khối 60 chữ — khối nằm ngoài màn hình trình duyệt bỏ qua, mở trang và cuộn không giật
    // v40: 2 khối đầu hiện ngay, các khối sau ghép dần (mỗi khung hình 2 khối); tìm / lọc lại thì lượt ghép cũ dừng
    if (list.length > 120) {
      grid.className = 'kgrid-wrap';
      const blocks = [];
      for (let i = 0; i < list.length; i += 60) blocks.push(list.slice(i, i + 60));
      grid.innerHTML = '';
      const my = ++drawN;
      appendChunks(grid, blocks, b => `<div class="kgrid kchunk">${b.map(tile).join('')}</div>`, { first: 2, per: 2, alive: () => my === drawN });
    } else {
      grid.className = 'kgrid';
      grid.innerHTML = list.map(tile).join('') || emptyState('Không có chữ nào khớp.');
    }
  };
  q.addEventListener('input', debounce(draw, 120));
  bindChips(view, draw);
  draw();
}

// ---------- v31 (L2): chữ trông giống — so sánh ----------
export const isSimilar = (k, o) => !!k && !!o && k.char !== o.char && ((k.similar || []).some(s => s.c === o.char) || (o.similar || []).some(s => s.c === k.char));
const simNote = (k, o) => (k.similar || []).find(s => s.c === o.char)?.note || '';
export function similarCmpHTML(list, { focus = null, picked = null, title = 'Chữ trông giống — so sánh' } = {}) {
  if (list.length < 2) return '';
  const f = list.find(o => o.char === focus) || list[0];
  return `<div class="cmp" data-bare><p class="cmp-t">${esc(title)}</p><table class="cmp-tb"><tbody>${list.map(o => `<tr class="${o.char === focus ? 'is-focus' : ''}${o.char === picked ? ' is-picked' : ''}">
    <th scope="row"><button type="button" class="cmp-k" data-kopen="${esc(o.char)}" lang="ja">${esc(o.char)}</button></th>
    <td><b>${esc(o.hv)}</b> — ${esc(o.nghia || '')}${o.char === picked ? ' <small class="cmp-mark">← bạn chọn</small>' : ''}${o !== f && simNote(f, o) ? `<small class="cmp-note">${esc(simNote(f, o).replace(/^[^—]*—\s*/, ''))}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>`;
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
      <fieldset><legend>Kiểu luyện</legend>${chips('mode', [['quiz', 'Trắc nghiệm'], ['pairs', 'Ghép 8 cặp chữ – Hán Việt']], o.mode || 'quiz', false)}<p class="small muted">Đang làm vẫn đổi qua lại được.</p></fieldset>
      <fieldset><legend>Kiểu câu hỏi</legend>${chips('dir', KDIRS, o.dir, false)}</fieldset>
      <fieldset><legend>Lấy chữ nào</legend>${chips('source', [['due', 'Đến hạn ôn', st.due], ['new', 'Chữ mới', st.new], ['wrong', 'Hay sai'], ['star', 'Đã đánh dấu ★', D.kanji.filter(k => isStar(k.id)).length], ['all', 'Tất cả', st.total]], o.source, false)}</fieldset>
      <fieldset><legend>Nhóm <small>(không chọn = tất cả)</small></legend>${chips('groups', usedG.map(g => [g, KGROUPS[g]]), o.groups)}</fieldset>
      <fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(n => [String(n), String(n)]), String(o.count), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>`;
  const f = view.querySelector('.setup');
  const read = () => ({ dir: readChip(f, 'dir'), source: readChip(f, 'source'), groups: readChips(f, 'groups'), levels: readChips(f, 'levels'), count: +readChip(f, 'count'), mode: readChip(f, 'mode') });
  const upd = () => {
    const n = buildKanjiQs({ ...read(), count: 999 }).length;
    f.querySelector('.setup-count').textContent = n ? `Có ${n} câu phù hợp.` : (read().source === 'due' ? 'Không có chữ nào đến hạn ôn. Chọn "Chữ mới".' : 'Không có chữ nào khớp lựa chọn này.');
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd); upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = read(); await kvSet('kanjiSetup', x);
    ctx.backTo = '#/chuhan/on';
    runDrill(view, buildKanjiQs(x), ctx, { title: 'Ôn chữ Hán', again: () => ctx.go('#/chuhan/on', true), startPairs: x.mode === 'pairs' });
  };
}

