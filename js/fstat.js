// Điểm theo thể (đợt 5b – B4): mỗi thể × nhóm động từ đếm số lần đúng / số lần làm. Đồng bộ giữa các máy.
import { D } from './data.js';
import { kvSet } from './db.js';
import { debounce } from './util.js';

export const GKEY = g => (g === 'v5' ? 'v5' : g === 'v1' ? 'v1' : g === 'i' || g === 'na' || g === 'n' ? g : 'v3');
const save = debounce(() => kvSet('fstat', D.fstat), 800);
// form: mã thể (te, ukemi, adj:ta…); group: v5 | v1 | suru | kuru | i | na | n
export function recForm(form, group, ok) {
  if (!form) return;
  const x = D.fstat[form] || { t: 0 };
  const k = GKEY(group);
  const c = x[k] || [0, 0];
  x[k] = [c[0] + (ok ? 1 : 0), c[1] + 1];
  x.t = Date.now();
  D.fstat[form] = x;
  save();
}
export function formScore(form) {
  const x = D.fstat[form];
  if (!x) return null;
  let a = 0, n = 0;
  for (const [k, v] of Object.entries(x)) if (k !== 't') { a += v[0]; n += v[1]; }
  return n ? { a, n, pct: Math.round((a / n) * 100) } : null;
}
// Thể yếu: làm từ 5 lần trở lên mà đúng dưới 70%
export const weakForms = () => Object.keys(D.fstat).filter(f => !f.includes(':')).map(f => [f, formScore(f)]).filter(([, s]) => s && s.n >= 5 && s.pct < 70).sort((a, b) => a[1].pct - b[1].pct).map(([f]) => f);
