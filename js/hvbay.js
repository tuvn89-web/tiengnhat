// v50: "Bẫy Hán Việt" — từ có chữ Hán đọc ra một từ Hán Việt quen trong tiếng Việt nhưng nghĩa tiếng Nhật khác (勉強 MIỄN CƯỠNG ≠ "miễn cưỡng").
// Dữ liệu riêng của app: data/hvbay.json { items: { <mã từ>: { vn, vnghia, luu_y } } }. Tải một lần lúc mở app; chưa tải xong thì chỉ không hiện nhãn.
import { esc, rich } from './util.js';

let M = null, P = null;
export function loadHvBay() {
  if (!P) P = fetch('data/hvbay.json').then(r => (r.ok ? r.json() : {})).then(j => { M = new Map(Object.entries(j.items || {})); }).catch(() => { M = new Map(); });
  return P;
}
export const hvTrap = it => (it?.id && M?.get(it.id)) || null;
// Nhãn trên thẻ từ: tiếng Việt hiểu thế nào ≠ tiếng Nhật nghĩa gì
export function hvTrapHTML(it) {
  const t = hvTrap(it);
  if (!t) return '';
  const vn = t.vn ? `“${esc(t.vn)}”` : esc(String(it.hv || '').toLowerCase());
  return `<p class="wd-trap"><b>⚠ Bẫy Hán Việt:</b> tiếng Việt ${vn}${t.vnghia ? ` là ${esc(t.vnghia)}` : ''}, còn <span lang="ja">${esc(it.kanji || it.kana)}</span> trong tiếng Nhật là “${esc(it.vi)}”.${t.luu_y ? ` <span class="muted">${rich(t.luu_y)}</span>` : ''}</p>`;
}
