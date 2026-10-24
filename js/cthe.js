// v69: "THUỘC NHUẦN NHUYỄN" của Chuyển thể — tính cho từng dạng cụ thể của từng từ (投げる → 投げられた riêng, 投げられました riêng).
// Đúng +1, sai −3 (không dưới 0); đủ 10 thì thuộc nhuần nhuyễn: 6 tháng không hỏi. Hết 6 tháng hỏi lại: đúng → thêm 6 tháng;
// sai → mất "nhuần nhuyễn", về 7/10 (cần 3 lần đúng nữa). Không đổi lịch ôn của từ. Lưu theo tài khoản (đồng bộ như điểm theo thể).
// D.cthe: '<mã từ>|<kana của dạng>' → { s: điểm 0–10, w: số lần sai, n: số lần trả lời, m: lúc đạt (0 = chưa), due: lúc kiểm tra lại, t }
import { D } from './data.js';
import { kvSet } from './db.js';
import { debounce } from './util.js';

export const MASTER = 10, PEN = 3, KEEP = 182 * 864e5;
const save = debounce(() => kvSet('cthe', D.cthe), 800);
export const ckey = (id, kana) => `${id}|${kana}`;
export const crec = (id, kana) => D.cthe?.[ckey(id, kana)] || null;
export const isMastered = (r, now = Date.now()) => !!(r && r.m && r.due > now);
// trả lời một câu: { r, newly (vừa đạt), kept (kiểm tra lại đạt), lost (kiểm tra lại / đang thuộc mà sai) }
export function recCthe(id, kana, ok, now = Date.now()) {
  const k = ckey(id, kana), r = { s: 0, w: 0, n: 0, m: 0, due: 0, ...(D.cthe[k] || {}) };
  let newly = false, kept = false, lost = false;
  r.n++;
  if (ok) {
    if (r.m) { r.due = now + KEEP; kept = true; }
    else { r.s = Math.min(MASTER, r.s + 1); if (r.s >= MASTER) { r.m = now; r.due = now + KEEP; newly = true; } }
  } else {
    r.w++;
    if (r.m) { r.m = 0; r.due = 0; r.s = MASTER - PEN; lost = true; } else r.s = Math.max(0, r.s - PEN);
  }
  r.t = now;
  D.cthe[k] = r; save();
  return { r, newly, kept, lost };
}
// các dạng hay sai (chưa thuộc nhuần nhuyễn), sai nhiều trước: [{ id, kana, r }]
export function wrongRecs(now = Date.now()) {
  const out = [];
  for (const [k, r] of Object.entries(D.cthe || {})) {
    if (!r?.w || isMastered(r, now)) continue;
    const i = k.lastIndexOf('|');
    out.push({ id: k.slice(0, i), kana: k.slice(i + 1), r });
  }
  return out.sort((a, b) => b.r.w - a.r.w || a.r.s - b.r.s);
}
export const masteredCount = (now = Date.now()) => Object.values(D.cthe || {}).filter(r => isMastered(r, now)).length;
export const fmtDay = t => { const d = new Date(t); return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
