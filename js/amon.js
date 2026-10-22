// v54: quy luật âm Hán Việt → âm On. Biết âm Hán Việt thì đoán được "khung" của âm On:
//  phụ âm đầu → hàng kana đầu (HỌC: h → hàng カ), vần cuối → đuôi âm On (HỌC: -c → ク/キ) ⇒ ガク.
// Đếm trên 1.984 thẻ chữ Hán của kho (22/10/2026): vần cuối khớp 99%; phụ âm đầu khớp 55–100% tùy âm (bảng INI).
// Chỉ dùng hv, on có sẵn trong thẻ chữ — không cần dữ liệu mới.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ROWS = { カ: 'カキクケコガギグゲゴ', サ: 'サシスセソザジズゼゾ', タ: 'タチツテトダヂヅデド', ナ: 'ナニヌネノ', ハ: 'ハヒフヘホバビブベボパピプペポ', マ: 'マミムメモ', ヤ: 'ヤユヨ', ラ: 'ラリルレロ', ワ: 'ワヲ', ア: 'アイウエオ' };
const ROW = {};
for (const [r, ks] of Object.entries(ROWS)) for (const k of ks) ROW[k] = r;
const SMALL = 'ャュョァィゥェォ';
const kata = s => String(s || '').replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));
export const rowOf = on => ROW[kata(on)[0]] || '';
const morae = on => [...kata(on)].filter(c => !SMALL.includes(c)).length;
export const moraN = morae;
export const toHira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const hvFirst = hv => String(hv || '').split(/[\s/]/)[0];
// đuôi âm On: n (ン) · c (2 âm tiết, cuối ク/キ) · t (2 âm tiết, cuối ツ/チ) · v (kéo dài: cuối ウ/イ/ー) · o (một âm tiết)
export function finOf(on) {
  const s = kata(on), last = s[s.length - 1], m = morae(s);
  if (last === 'ン') return 'n';
  if (m === 2 && 'クキ'.includes(last)) return 'c';
  if (m === 2 && 'ツチ'.includes(last)) return 't';
  if ('ウイー'.includes(last)) return 'v';
  return m === 1 ? 'o' : 'x';
}
const strip = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
// phụ âm đầu Hán Việt → hàng kana (hàng chính trước); nhãn hiển thị
const INI = [
  ['ngh', ['カ']], ['ng', ['カ']], ['nh', ['サ', 'ナ', 'カ'], 'ニ / ジ, đôi khi ガ'], ['kh', ['カ']], ['ph', ['ハ']], ['th', ['サ', 'タ']], ['tr', ['タ', 'サ']], ['ch', ['サ']], ['gi', ['カ']], ['qu', ['カ']],
  ['b', ['ハ']], ['c', ['カ']], ['đ', ['タ']], ['d', ['ヤ', 'ア']], ['g', ['カ']], ['h', ['カ', 'ワ', 'ア'], 'カ (HO-, HOA- đôi khi ワ / オ)'], ['k', ['カ']], ['l', ['ラ']], ['m', ['マ', 'ハ'], 'マ / バ'], ['n', ['ナ', 'タ'], 'ナ / ダ'],
  ['s', ['サ']], ['t', ['サ']], ['v', ['ア', 'ハ', 'ワ', 'マ'], 'ア / ワ, hoặc バ / マ'], ['x', ['サ']], ['r', ['ラ']],
];
export function iniOf(hv) {
  const h = strip(String(hv || '').split(/[\s/]/)[0]);
  for (const x of INI) if (h.startsWith(x[0])) return { ini: x[0], rows: x[1], label: x[2] || x[1].join(' / ') };
  return { ini: 'nguyên âm', rows: ['ア', 'ヤ'], label: 'ア / ヤ' };
}
const FIN = [['ng', ['v'], 'ウ / イ (kéo dài)'], ['nh', ['v'], 'イ / ウ (kéo dài)'], ['ch', ['c'], 'キ / ク'], ['c', ['c'], 'ク / キ'], ['t', ['t'], 'ツ / チ'], ['p', ['v', 't'], 'ウ (kéo dài) / ツ'], ['m', ['n'], 'ン'], ['n', ['n'], 'ン']];
export function finRule(hv) {
  const h = strip(String(hv || '').split(/[\s/]/)[0]).replace(/đ/g, 'd');
  for (const x of FIN) if (h.endsWith(x[0])) return { fin: '-' + x[0], fins: x[1], label: x[2] };
  return { fin: 'vần mở', fins: ['o', 'v'], label: 'một âm tiết, hoặc kéo dài ウ / イ' };
}
// một cách đọc On có khớp quy luật với âm Hán Việt không
export function fits(hv, on) {
  const i = iniOf(hv), f = finRule(hv);
  return { ini: i.rows.includes(rowOf(on)), fin: f.fins.includes(finOf(on)) };
}
// chữ "đều": có ít nhất một âm On khớp cả đầu lẫn cuối → trả về âm đó
export function regularOn(k) {
  if (!k?.hv || !(k.on || []).length) return null;
  return k.on.find(o => { const x = fits(k.hv, o); return x.ini && x.fin; }) || null;
}
const hv1 = hv => String(hv || '').split(/[\s/]/)[0];
// dòng giải thích ngắn: "QUẢN → カン: qu → hàng カ · -n → ン"
export function ruleLine(k, on) {
  const i = iniOf(k.hv), f = finRule(k.hv), x = fits(k.hv, on);
  const a = `${esc(i.ini)} → hàng ${esc(i.label)}${x.ini ? '' : ' <b class="am-x">✗</b>'}`, b = `${esc(f.fin)} → ${esc(f.label)}${x.fin ? '' : ' <b class="am-x">✗</b>'}`;
  return `<span class="am-hv">${esc(hv1(k.hv))}</span> → <span lang="ja">${esc(on)}</span>: ${a} · ${b}`;
}
// ghi chú trên thẻ chữ Hán
export function amonNoteHTML(k) {
  if (!k?.hv || !(k.on || []).length) return '';
  const reg = regularOn(k);
  const on = reg || k.on[0];
  return `<p class="am-note"><b>Từ âm Hán Việt:</b> ${ruleLine(k, on)}${reg ? '' : ' — <i>ngoại lệ</i>, nhớ riêng chữ này.'} <a href="#/huongdan/amon">Quy luật</a></p>`;
}
