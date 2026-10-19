import { all, put, putMany } from './db.js';
import { DAY, startOfDay } from './util.js';

// Lặp lại ngắt quãng 7 hộp (v31): 1 → 2 → 4 → 8 → 16 → 35 → 90 ngày. Hộp 0 = chưa học.
// Đúng → lên hộp. Đúng mà chậm (quá S.slowSec giây, câu chọn đáp án) → giữ hộp, hỏi lại sau đúng khoảng của hộp đó.
// Sai → hộp 1–3 về hộp 1; hộp 4 trở lên lùi 2 hộp (v31).
// Đang ở hộp 7 mà đến hạn vẫn đúng → "thuộc nhuần nhuyễn" (cờ m): không bao giờ đến hạn ôn nữa.
// Mục vào thẳng hộp 5 bằng "Biết rồi" / xếp lớp (cờ k, hoặc hộp 5 chưa từng ôn) → đúng ở lần ôn 16 ngày là thuộc hẳn như trước.
// Làm sai một mục đã thuộc nhuần nhuyễn (khi tự luyện) → bỏ cờ, lùi hộp như thường.
// Từ vựng: vj (Việt→Nhật), jv (Nhật→Việt, kể cả nghe), kr (kanji→cách đọc).
// Chữ Hán: kh (chữ → Hán Việt), hk (Hán Việt → chọn chữ).   Ngữ pháp: gp (mọi bài tập của mẫu đó).
export const IV = [0, 1, 2, 4, 8, 16, 35, 90];
export const TOP = IV.length - 1;
// Chiều có tính "đúng mà chậm" (câu chọn đáp án ngắn): từ vựng, chữ Hán. Nghe, ngữ pháp, câu dịch không tính.
export const SLOW_DIRS = new Set(['jv', 'vj', 'kr', 'kh', 'hk']);
const fastTrack = x => !!x.k || (x.b >= 5 && !x.ok && !x.ng);
export const P = new Map(); // id -> {id, d:{vj,jv,kr}, star, st, first, t}
let onChange = () => { };
export const setOnChange = f => { onChange = f; };

export async function loadProgress() {
  P.clear();
  for (const r of await all('progress')) P.set(r.id, r);
}
export const progDir = dir => (dir === 'au' ? 'jv' : dir);
export const dirRec = (id, dir) => P.get(id)?.d?.[progDir(dir)];

export async function review(id, dir, ok, { onlyIfDue = false, slow = false } = {}) {
  const now = Date.now();
  const d = progDir(dir);
  const r = P.get(id) ? structuredClone(P.get(id)) : { id, d: {}, t: 0 };
  const x = r.d[d] || { b: 0, due: 0, ok: 0, ng: 0, t: 0 };
  if (ok && onlyIfDue && x.b > 0 && x.due > now) return;
  if (!r.first) r.first = now;
  if (ok) {
    if (!slow && x.due <= now && (x.b >= TOP || (x.b >= 5 && fastTrack(x)))) x.m = 1;
    if (!slow || !x.b) x.b = Math.min(TOP, x.b + 1);
    x.ok++;
  } else { x.b = x.b >= 4 ? x.b - 2 : 1; x.ng++; delete x.m; delete x.k; }
  x.due = startOfDay(now) + IV[x.b] * DAY;
  x.t = now;
  r.d[d] = x; r.t = now;
  P.set(id, r);
  await put('progress', r);
  onChange();
}
// Làm mới lịch ôn mà không lên hộp (luyện thêm khi chưa đến hạn): hạn ôn tính lại từ hôm nay, không bao giờ kéo sớm hơn
export async function refreshDue(id, dir) {
  const now = Date.now(), d = progDir(dir);
  const old = P.get(id)?.d?.[d];
  if (!old || !old.b) return;
  const due = Math.max(old.due || 0, startOfDay(now) + IV[old.b] * DAY);
  if (due === old.due) return;
  const r = structuredClone(P.get(id));
  r.d[d] = { ...old, due, t: now }; r.t = now;
  P.set(id, r);
  await put('progress', r);
  onChange();
}
export const mastered = (id, dir) => !!P.get(id)?.d?.[progDir(dir)]?.m;
// Mục đã bấm "Đã thuộc" (mọi chiều học đều có cờ thuộc nhuần nhuyễn)
export const allMastered = it => {
  const r = P.get(it.id);
  const ds = TYPE_DIRS[itemType(it)].filter(d => d !== 'kr' || it.kanji);
  return !!r && ds.every(d => r.d?.[d]?.m);
};
// Học từ mới (nút "Đã học"): mọi hướng vào hộp 1, ôn lần đầu ngày mai. "Biết rồi": vào hộp 5 (cờ k), 16 ngày sau ôn lại một lần, đúng là thuộc hẳn.
// Nút "Đã thuộc" trong lượt ôn (v27): 'mastered' = hộp 5 + cờ thuộc nhuần nhuyễn ở mọi chiều → không bao giờ đến hạn ôn nữa.
export async function setLearned(it, level = 'learned') {
  const now = Date.now();
  const r = P.get(it.id) ? structuredClone(P.get(it.id)) : { id: it.id, d: {}, t: 0 };
  const b = level === 'known' || level === 'mastered' ? 5 : 1;
  for (const d of TYPE_DIRS[itemType(it)]) {
    if (d === 'kr' && !it.kanji) continue;
    const x = r.d[d] || { b: 0, due: 0, ok: 0, ng: 0, t: 0 };
    x.b = Math.max(x.b, b); x.due = startOfDay(now) + IV[x.b] * DAY; x.t = now;
    if (level === 'mastered') x.m = 1;
    if (level === 'known' && !x.ok && !x.ng) x.k = 1;
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
// ---- Kiểm tra trình độ: đổi tiến độ hàng loạt (một lần ghi) ----
// op: known = đã thuộc (hộp 5, ôn lại sau 16 ngày) · check = đã gặp, cần kiểm (hộp 3, ôn sau 4 ngày)
//     learn = bắt đầu học (hộp 1, ôn ngày mai) · wrong = làm sai (chiều bị hỏi về hộp 1, ôn ngày mai)
//     right = làm đúng nhưng giữ hộp (chỉ ghi lần đúng)
// dir: chiều đã hỏi trong đề (để ghi lần đúng/sai); không có = mục không có trong đề
// dry = chỉ tính xem mục nào sẽ đổi, không ghi
export async function bulkApply(changes, { dry = false } = {}) {
  const now = Date.now(), sod = startOfDay(now), out = [];
  for (const { it, op, dir } of changes) {
    const r = P.get(it.id) ? structuredClone(P.get(it.id)) : { id: it.id, d: {}, t: 0 };
    const asked = dir ? progDir(dir) : null;
    let changed = false;
    for (const d of TYPE_DIRS[itemType(it)]) {
      if (d === 'kr' && !it.kanji) continue;
      const x = r.d[d] || { b: 0, due: 0, ok: 0, ng: 0, t: 0 };
      const was = JSON.stringify(x);
      if (op === 'known' && x.b < 5) { x.b = 5; x.k = 1; x.due = sod + IV[5] * DAY; }
      else if (op === 'check' && x.b < 3) { x.b = 3; x.due = sod + IV[3] * DAY; }
      else if (op === 'learn' && x.b < 1) { x.b = 1; x.due = sod + IV[1] * DAY; }
      else if (op === 'wrong' && (d === asked || x.b < 1)) { x.b = 1; x.due = sod + IV[1] * DAY; }
      if (d === asked) { if (op === 'wrong') x.ng++; else x.ok++; }
      if (JSON.stringify(x) !== was) { x.t = now; r.d[d] = x; changed = true; }
    }
    if (!changed) continue;
    if (!r.first && Object.values(r.d).some(x => x.b > 0)) r.first = now;
    r.t = now;
    out.push(r);
  }
  if (dry) return out.map(r => r.id);
  for (const r of out) P.set(r.id, r);
  if (out.length) await putMany('progress', out);
  onChange();
  return out.map(r => r.id);
}
// Chụp tiến độ các mục trước khi đổi hàng loạt (để hoàn tác)
export const progSnapshot = ids => ids.map(id => [id, P.has(id) ? structuredClone(P.get(id)) : null]);
// Hoàn tác: trả từng chiều học về như trước, gắn mốc thời gian mới để đồng bộ không khôi phục lại bản đã đổi
export async function progRestore(before) {
  const now = Date.now(), out = [];
  for (const [id, old] of before) {
    const cur = P.get(id);
    if (!cur && !old) continue;
    const n = old ? structuredClone(old) : { id, d: {} };
    for (const d of new Set([...Object.keys(cur?.d || {}), ...Object.keys(old?.d || {})])) {
      n.d[d] = old?.d?.[d] ? { ...old.d[d], t: now } : { b: 0, due: 0, ok: 0, ng: 0, t: now };
    }
    if (!old) delete n.first;
    if (cur?.st) { n.star = cur.star; n.st = cur.st; }
    n.t = now;
    out.push(n);
  }
  for (const r of out) P.set(r.id, r);
  if (out.length) await putMany('progress', out);
  onChange();
  return out.length;
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

// Câu luyện dịch (s:…): nv = Nhật → Việt, vn = Việt → Nhật
const TYPE_DIRS = { vocab: ['vj', 'jv', 'kr'], kanji: ['kh', 'hk'], grammar: ['gp'], sent: ['nv', 'vn'] };
const KNOWN_DIRS = { vocab: ['vj', 'jv'], kanji: ['kh', 'hk'], grammar: ['gp'], sent: ['nv', 'vn'] };
export const itemType = it => it._type || (it.id.startsWith('k:') ? 'kanji' : it.id.startsWith('g:') ? 'grammar' : it.id.startsWith('s:') ? 'sent' : 'vocab');

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
    if (!x || x.b === 0 || x.m || x.due > now) return false;
    return d !== 'kr' || !!it.kanji;
  });
}
export const errCount = it => { const r = P.get(it.id); return r ? Object.values(r.d || {}).reduce((s, x) => s + (x.ng || 0), 0) : 0; };
// Mục "cứng đầu" (v31): sai từ 4 lần trở lên mà chưa thuộc (từ vựng, chữ Hán)
export const LEECH_N = 4;
export const isLeech = it => !!it && ['vocab', 'kanji'].includes(itemType(it)) && errCount(it) >= LEECH_N && status(it) !== 'known' && !allMastered(it);
// Quá hạn bao lâu (ms) ở chiều đang đến hạn sớm nhất — để "Ôn nhanh 3 phút" hỏi mục quá hạn lâu nhất trước
export function overdueMs(it, now = Date.now()) {
  const r = P.get(it.id);
  let m = -Infinity;
  for (const d of dueDirs(it, now)) m = Math.max(m, now - (r.d[d].due || 0));
  return m;
}

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
