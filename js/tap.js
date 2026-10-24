// v66: CHẠM CÂU → TỪ → CHỮ HÁN (3 tầng).
// Tầng 1 — chạm một câu (bài đọc, hội thoại, câu ví dụ của thẻ từ / mẫu ngữ pháp, giấy tờ, câu trong bài luyện sau khi đã trả lời,
//   luyện dịch) → bảng câu: nghĩa câu, mẫu ngữ pháp trong câu, từ / cụm từ theo thứ tự trong câu.
// Tầng 2 — chạm một từ / cụm từ trong bảng câu → bảng từ gọn: nghĩa, loại từ, cấp, THỂ ĐANG DÙNG TRONG CÂU, Hán Việt,
//   hàng chữ Hán của từ, nút nghe, ★, + Ôn, "Mở thẻ từ đầy đủ".
// Tầng 3 — chạm chữ trong hàng chữ Hán (hoặc phần đầu thẻ từ đầy đủ, thẻ chữ Hán, bài luyện chữ Hán) → thẻ chữ Hán.
//   Chỗ khác chạm chữ Hán không mở gì nữa.
// Các bảng xếp chồng: nút ‹ về bảng trước (phím Esc cũng vậy); ✕, chạm ra ngoài hoặc vuốt xuống thì đóng hết.
// Đang làm câu hỏi (chưa trả lời: [data-nokj]) thì không mở gì, để khỏi lộ đáp án.
import { esc, rich, wordHTML, kanjiChars, isKanjiCh, icon, plain } from './util.js';
import { D, POS } from './data.js';
import { openSheet, sayBtn } from './ui.js';
import { explainHTML, findLine, markupFrom, detectSpans } from './explain.js';
import { formAt } from './inform.js';
import { markBtnHTML } from './marks.js';
import { status, setLearned } from './srs.js';
import { openKanji } from './kanji.js';

// phần tử là một câu tiếng Nhật chạm được
export const SENT_SEL = '.ex-jp, .after-sent, .dl-jp, .rd-jp, .prompt-sent, .snt';
const NO_TAP = 'button, a, input, textarea, select, label, summary, [data-say], [data-nosent], [data-nokj], .passage';

// ---------- chồng bảng ----------
const STK = [];
export const sheetOf = el => el?.closest?.('.sheet-wrap')?.__sheet || null;
export function closeAll() { for (const s of [...STK].reverse()) s.close(); }
function swipe(sheet) {
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', e => { y0 = sheet.scrollTop <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
  sheet.addEventListener('touchmove', e => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    if (dy < -8) { y0 = null; sheet.style.translate = ''; return; }
    if (dy > 0) sheet.style.translate = `0 ${dy}px`;
  }, { passive: true });
  const end = () => { if (y0 == null) return; y0 = null; if (dy > 90) closeAll(); else sheet.style.translate = ''; dy = 0; };
  sheet.addEventListener('touchend', end); sheet.addEventListener('touchcancel', end);
}
// đưa một bảng vào chồng: bảng dưới tạm ẩn, bảng mới có nút ‹ (tên bảng trước)
export function adopt(s) {
  if (!s?.el || s.el.classList.contains('stk')) return s;
  for (let i = STK.length - 1; i >= 0; i--) if (!STK[i].el.isConnected || STK[i].el.classList.contains('is-closing')) STK.splice(i, 1); // bảng bị gỡ thẳng (không qua close)
  const prev = STK.at(-1);
  s.el.classList.add('stk');
  if (prev) {
    s.el.classList.add('stk-up'); prev.el.classList.add('stk-under');
    const lab = prev.el.querySelector('.sheet')?.getAttribute('aria-label') || 'Quay lại';
    s.el.querySelector('.sheet').insertAdjacentHTML('afterbegin', `<button type="button" class="btn btn-ghost btn-sm sheet-back" aria-label="Quay lại: ${esc(lab)}">${icon('back')}<span>${esc(lab)}</span></button>`);
  }
  STK.push(s);
  s.el.addEventListener('sheetclose', () => {
    const i = STK.indexOf(s);
    if (i >= 0) STK.splice(i, 1);
    if (i === STK.length) STK.at(-1)?.el.classList.remove('stk-under');
  });
  s.el.addEventListener('click', e => {
    if (e.target.closest('.sheet-back')) { e.stopImmediatePropagation(); s.close(); return; }
    if (e.target === s.el || e.target.closest('.sheet-x')) { e.stopImmediatePropagation(); closeAll(); }
  }, true);
  swipe(s.el.querySelector('.sheet'));
  return s;
}
// mở bảng từ một chỗ chạm: chỗ chạm nằm trong bảng → bảng đó vào chồng, bảng mới đè lên
export async function stackOpen(origin, open) {
  const host = sheetOf(origin);
  if (host) adopt(host);
  const s = await open();
  if (s) adopt(s);
  return s;
}

// ---------- tầng 1: bảng câu ----------
export function openSentence(line, { el = null, origin = null } = {}) {
  const host = sheetOf(origin || el);
  if (host) adopt(host);
  el?.classList.add('snt-on');
  const s = openSheet(`<h2 class="h2">Giải thích câu</h2>${explainHTML(line)}`, { label: 'Giải thích câu', onClose: () => el?.classList.remove('snt-on') });
  return adopt(s);
}
// câu của phần tử được chạm: lấy lại chữ (kèm furigana) từ HTML, tra kho câu để có nghĩa, mẫu ngữ pháp, chú thích
function lineOf(el) {
  const jp = el.dataset.jp || markupFrom(el).trim();
  const f = findLine(jp);
  const vi = el.dataset.vi || f?.vi || '';
  return f ? { ...f, vi } : { jp, vi };
}

// ---------- tầng 2: bảng từ gọn ----------
// chữ Hán của từ + âm Hán Việt theo thứ tự (âm lấy từ thẻ chữ, không có thẻ thì lấy từ âm Hán Việt của từ)
function kanjiCells(it) {
  const chars = [...(it.kanji || '')].filter(c => isKanjiCh(c) && c !== '々');
  const hv = String(it.hv || '').trim().split(/\s+/);
  const ok = hv.length === chars.length, seen = new Set(), out = [];
  chars.forEach((c, i) => { if (seen.has(c)) return; seen.add(c); const k = D.kanjiByChar.get(c); out.push({ c, hv: k?.hv?.split(/[,、\s]/)[0] || (ok ? hv[i] : ''), vi: k?.nghia || '', has: !!k }); });
  return out;
}
const kRowHTML = cells => cells.length ? `<p class="sub-label">Chữ Hán <small class="muted">· chạm để mở thẻ chữ</small></p><div class="ws-ks" data-bare>${cells.map(k => `<button type="button" class="ws-k${k.has ? '' : ' no'}" data-kopen="${esc(k.c)}"><b lang="ja">${esc(k.c)}</b><span class="ws-khv">${esc(k.hv || '')}</span>${k.vi ? `<span class="ws-kvi">${esc(k.vi)}</span>` : ''}</button>`).join('')}</div>` : '';
function formBoxHTML(it, tail) {
  const f = tail ? formAt(it, tail, 0) : null;
  if (!f || f.dict) return '';
  const dict = `<span lang="ja">${wordHTML(it, 'furi')}</span>`;
  if (f.unsure) return `<div class="ws-form"><p class="sub-label">Trong câu</p><p><b lang="ja">${rich(f.mark)}</b> · dạng từ điển ${dict}</p></div>`;
  return `<div class="ws-form"><p class="sub-label">Trong câu</p><p><b lang="ja">${rich(f.mark)}</b> = ${dict} · ${f.names.map(esc).join(' · ')}</p>${f.vi ? `<p class="ws-fvi">→ ${esc(f.vi)}</p>` : ''}</div>`;
}
export function wordSheetHTML(it, tail = '') {
  const meta = [POS[it.pos] || '', it.level].filter(Boolean);
  return `<div class="ws">
    <div class="ws-head"><p class="ws-w" lang="ja">${wordHTML(it, 'furi')}</p>${sayBtn(it.kana)}${markBtnHTML(it.id)}</div>
    <p class="ws-vi">${esc(it.vi)}</p>
    <p class="ws-meta">${meta.map(esc).join(' · ')}${it.hv ? ` · Hán Việt <b>${esc(it.hv)}</b>` : ''}</p>
    ${formBoxHTML(it, tail)}
    ${it.std ? `<p class="small">Tiếng chuẩn: <span lang="ja">${rich(it.std)}</span></p>` : ''}
    ${kRowHTML(kanjiCells(it))}
    <div class="row-btns wrap ws-btns">${status(it) === 'new' ? `<button type="button" class="btn btn-ghost btn-sm" data-addrev="${esc(it.id)}">+ Ôn</button>` : ''}<button type="button" class="btn btn-ghost btn-sm" data-wopen="${esc(it.id)}">Mở thẻ từ đầy đủ</button></div>
  </div>`;
}
export function openWordSheet(id, tail = '', origin = null) {
  const it = D.items.get(id);
  if (!it) return null;
  const host = sheetOf(origin);
  if (host) adopt(host);
  return adopt(openSheet(wordSheetHTML(it, tail), { label: plain(it.kf || '') || it.kanji || it.kana }));
}
// cụm từ / chú thích: nghĩa, từ trong cụm, chữ Hán của cụm
export function openPhraseSheet(w, vi, origin = null) {
  const { text, spans } = detectSpans(w);
  const seen = new Set();
  const rows = spans.map(sp => D.items.get(sp.id)).map((it, k) => ({ it, at: spans[k].i })).filter(({ it }) => it?._type === 'vocab' && !seen.has(it.id) && seen.add(it.id));
  const cells = kanjiChars(plain(w)).map(c => { const k = D.kanjiByChar.get(c); return { c, hv: k?.hv?.split(/[,、\s]/)[0] || '', vi: k?.nghia || '', has: !!k }; });
  const host = sheetOf(origin);
  if (host) adopt(host);
  return adopt(openSheet(`<div class="ws">
    <div class="ws-head"><p class="ws-w" lang="ja">${rich(w)}</p>${sayBtn(plain(w).replace(/[〜～]/g, ''))}</div>
    ${vi ? `<p class="ws-vi">${rich(vi)}</p>` : ''}<p class="ws-meta">Cụm từ / chú thích trong câu</p>
    ${rows.length > 1 || (rows.length === 1 && plain(rows[0].it.kanji || rows[0].it.kana) !== plain(w)) ? `<p class="sub-label">Từ trong cụm</p><ul class="xl">${rows.map(({ it, at }) => `<li class="xw"><button type="button" class="xw-b" data-wsheet="${esc(it.id)}" data-tail="${esc(text.slice(at, at + 30))}"><span class="xw-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="xw-vi">${esc(it.vi)}<small class="muted"> · ${esc(POS[it.pos] || '')}</small></span></button></li>`).join('')}</ul>` : rows.length === 1 ? `<div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-wsheet="${esc(rows[0].it.id)}" data-tail="${esc(text.slice(rows[0].at, rows[0].at + 30))}">Xem từ <span lang="ja">${wordHTML(rows[0].it, 'furi')}</span></button></div>` : ''}
    ${kRowHTML(cells)}</div>`, { label: plain(w) }));
}

// ---------- chạm chung cho cả app (app.js gọi trước các xử lý khác) ----------
export function tapClick(e) {
  const t = e.target;
  const ws = t.closest('[data-wsheet]');
  if (ws) { e.preventDefault(); openWordSheet(ws.dataset.wsheet, ws.dataset.tail || '', ws); return true; }
  const ps = t.closest('[data-psheet]');
  if (ps) { e.preventDefault(); openPhraseSheet(ps.dataset.psheet, ps.dataset.vi || '', ps); return true; }
  const k = t.closest('.kj');
  if (k && k.closest('[data-kj-ok]') && !k.closest('button, a, [data-nokj]')) { e.preventDefault(); stackOpen(k, () => openKanji(k.textContent)); return true; }
  if (e.defaultPrevented) return false;
  const el = t.closest(SENT_SEL);
  if (!el || t.closest(NO_TAP) || el.closest(NO_TAP) || el.querySelector('.blank, .kblank')) return false; // câu có ô trống: chạm câu đầy đủ ở phần đáp án
  if (getSelection?.()?.toString()) return false; // đang bôi đen chữ để chép
  e.preventDefault();
  openSentence(lineOf(el), { el });
  return true;
}
// nút "+ Ôn" ở mọi chỗ (bảng câu, bảng từ, khối giải thích dưới đáp án)
export function initTap() {
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-addrev]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const it = D.items.get(b.dataset.addrev);
    if (it) await setLearned(it, 'learned');
    document.querySelectorAll(`[data-addrev="${CSS.escape(b.dataset.addrev)}"]`).forEach(x => { x.disabled = true; x.textContent = 'Đã thêm ✓'; });
  }, true);
}
