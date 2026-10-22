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

// v55 (đợt 8, mục 5): từ Hán Việt ĐẢO CHỮ — 紹介 = THIỆU GIỚI nhưng tiếng Việt nói "giới thiệu".
// Tự nhận ra: từ 2 chữ Hán, âm Hán Việt đọc ngược trùng đúng một nghĩa tiếng Việt của từ (bỏ "sự", "mức"…), đọc xuôi thì không có.
const DAO_EXTRA = { 限界: 'giới hạn', 苦痛: 'thống khổ' };
const _dao = new WeakMap();
const senses = vi => String(vi || '').toLowerCase().replace(/\([^)]*\)/g, '').split(/[,;/]/).map(s => s.trim().replace(/^(sự|mức|việc|tính|cuộc|lệ|giá|điểm|lời|người|vật)\s+/, ''));
export function hvDao(it) {
  if (!it || !it.kanji) return null;
  if (_dao.has(it)) return _dao.get(it);
  let r = null;
  if (DAO_EXTRA[it.kanji]) r = DAO_EXTRA[it.kanji];
  else if (/^[一-鿿]{2}$/.test(it.kanji)) {
    const hv = String(it.hv || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (hv.length === 2) {
      const rev = `${hv[1]} ${hv[0]}`, fwd = `${hv[0]} ${hv[1]}`, ss = senses(it.vi);
      if (ss.includes(rev) && !ss.includes(fwd)) r = rev;
    }
  }
  _dao.set(it, r);
  return r;
}
export function hvDaoHTML(it) {
  const r = hvDao(it);
  return r ? `<p class="wd-dao"><b>↔ Đảo chữ:</b> âm Hán Việt là <b>${esc(it.hv)}</b>, tiếng Việt nói ngược lại: “${esc(r)}”.</p>` : '';
}
