import { all, put } from './db.js';
import { DAY, startOfDay } from './util.js';

// Lặp lại ngắt quãng 5 hộp. Hộp 0 = chưa học. Đúng → lên hộp, sai → về hộp 1.
// Từ vựng: vj (Việt→Nhật), jv (Nhật→Việt, kể cả nghe), kr (kanji→cách đọc).
// Chữ Hán: kh (chữ → Hán Việt), hk (Hán Việt → chọn chữ).   Ngữ pháp: gp (mọi bài tập của mẫu đó).
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
// Học từ mới (nút "Đã học"): mọi hướng vào hộp 1, ôn lần đầu ngày mai. "Biết rồi": vào hộp 5 (đã thuộc), 16 ngày sau ôn lại một lần.
export async function setLearned(it, level = 'learned') {
  const now = Date.now();
  const r = P.get(it.id) ? structuredClone(P.get(it.id)) : { id: it.id, d: {}, t: 0 };
  const b = level === 'known' ? 5 : 1;
  for (const d of TYPE_DIRS[itemType(it)]) {
    if (d === 'kr' && !it.kanji) continue;
    const x = r.d[d] || { b: 0, due: 0, ok: 0, ng: 0, t: 0 };
    x.b = Math.max(x.b, b); x.due = startOfDay(now) + IV[x.b] * DAY; x.t = now;
    r.d[d] = x;
  }
  if (!r.first) r.first = now;
  r.t = now;
  P.set(it.id, r);
  await put('progress', r);
  onChange();
}
// Bỏ đánh dấu (lật lại thẻ rồi bấm "Để sau"): trả về chưa học nếu chưa từng ôn
export async function unsetLearned(it) {
  const r = P.get(it.id);
  if (!r || Object.values(r.d || {}).some(x => x.ok || x.ng)) return;
  const now = Date.now();
  const n = structuredClone(r);
  for (const d of Object.keys(n.d || {})) n.d[d] = { b: 0, due: 0, ok: 0, ng: 0, t: now }; // giữ mốc thời gian để đồng bộ không khôi phục lại
  delete n.first; n.t = now;
  P.set(it.id, n);
  await put('progress', n);
  onChange();
}
// Học lần đầu từ khi nào (lọc "học hôm nay", "7 ngày qua")
export const learnedSince = (it, t) => { const r = P.get(it.id); return !!r?.first && r.first >= t && status(it) !== 'new'; };

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

const TYPE_DIRS = { vocab: ['vj', 'jv', 'kr'], kanji: ['kh', 'hk'], grammar: ['gp'] };
const KNOWN_DIRS = { vocab: ['vj', 'jv'], kanji: ['kh', 'hk'], grammar: ['gp'] };
export const itemType = it => it._type || (it.id.startsWith('k:') ? 'kanji' : it.id.startsWith('g:') ? 'grammar' : 'vocab');

export function status(it) {
  const r = P.get(it.id);
  if (!r || !Object.values(r.d || {}).some(x => x.b > 0)) return 'new';
  if (KNOWN_DIRS[itemType(it)].every(d => (r.d[d]?.b || 0) >= 5)) return 'known';
  return 'learning';
}
export function dueDirs(it, now = Date.now()) {
  const r = P.get(it.id);
  if (!r) return [];
  return TYPE_DIRS[itemType(it)].filter(d => {
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
