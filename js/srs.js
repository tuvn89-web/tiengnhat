import { all, put } from './db.js';
import { DAY, startOfDay } from './util.js';

// Lặp lại ngắt quãng 5 hộp. Hộp 0 = chưa học. Đúng → lên hộp, sai → về hộp 1.
// Ba chiều theo dõi riêng: vj (Việt→Nhật), jv (Nhật→Việt, kể cả nghe), kr (kanji→cách đọc).
export const IV = [0, 1, 2, 4, 8, 16];
export const P = new Map(); // id -> {id, d:{vj,jv,kr}, star, st, first, t}
let onChange = () => { };
export const setOnChange = f => { onChange = f; };

export async function loadProgress() {
  P.clear();
  for (const r of await all('progress')) P.set(r.id, r);
}
export const progDir = dir => (dir === 'au' ? 'jv' : dir);
export const dirRec = (id, dir) => P.get(id)?.d?.[progDir(dir)];

export async function review(id, dir, ok, { onlyIfDue = false } = {}) {
  const now = Date.now();
  const d = progDir(dir);
  const r = P.get(id) ? structuredClone(P.get(id)) : { id, d: {}, t: 0 };
  const x = r.d[d] || { b: 0, due: 0, ok: 0, ng: 0, t: 0 };
  if (ok && onlyIfDue && x.b > 0 && x.due > now) return;
  if (!r.first) r.first = now;
  if (ok) { x.b = Math.min(5, x.b + 1); x.ok++; } else { x.b = 1; x.ng++; }
  x.due = startOfDay(now) + IV[x.b] * DAY;
  x.t = now;
  r.d[d] = x; r.t = now;
  P.set(id, r);
  await put('progress', r);
  onChange();
}
export async function toggleStar(id) {
  const now = Date.now();
  const r = P.get(id) ? structuredClone(P.get(id)) : { id, d: {}, t: 0 };
  r.star = !r.star; r.st = now; r.t = now;
  P.set(id, r);
  await put('progress', r);
  onChange();
  return r.star;
}
export const isStar = id => !!P.get(id)?.star;

export function status(it) {
  const r = P.get(it.id);
  if (!r || !Object.values(r.d || {}).some(x => x.b > 0)) return 'new';
  if ((r.d.vj?.b || 0) >= 5 && (r.d.jv?.b || 0) >= 5) return 'known';
  return 'learning';
}
export function dueDirs(it, now = Date.now()) {
  const r = P.get(it.id);
  if (!r) return [];
  return ['vj', 'jv', 'kr'].filter(d => {
    const x = r.d?.[d];
    if (!x || x.b === 0 || x.due > now) return false;
    return d !== 'kr' || !!it.kanji;
  });
}
export const errCount = it => { const r = P.get(it.id); return r ? Object.values(r.d || {}).reduce((s, x) => s + (x.ng || 0), 0) : 0; };

export function stats(items) {
  const s = { total: items.length, new: 0, learning: 0, known: 0, due: 0, newToday: 0 };
  const sod = startOfDay();
  for (const it of items) {
    s[status(it)]++;
    if (dueDirs(it).length) s.due++;
    const r = P.get(it.id);
    if (r?.first >= sod) s.newToday++;
  }
  return s;
}
