// v69: CÂU VÍ DỤ CHO MỘT DẠNG CHIA (Chuyển thể, sau khi trả lời). Tìm trong mọi câu đang có trong máy (ví dụ của từ, của mẫu ngữ pháp,
// câu theo thể, hội thoại, bài đọc, câu thực chiến), theo thứ tự: chính từ đó đúng dạng → chính từ đó cùng thể khác thì → câu ghép
// theo khuôn → từ khác cùng dạng. Mỗi nhóm lấy xen kẽ các tình huống (đời sống, xưởng, thủ tục, hội thoại…). Dạng được tô màu.
import { D, CTX, TOPICS } from './data.js';
import { plain, parseJP, stripHL } from './util.js';

const SITU = { ...TOPICS, ...CTX };
let _c = null, _ck = '';
function corpus() {
  const key = `${D.items.size}:${D.vocab.length}:${D.dialog.length}`;
  if (_c && _ck === key) return _c;
  const list = [], seen = new Set();
  const put = (o, ctx, src) => {
    if (!o?.jp || !o.vi) return;
    const jp = stripHL(o.jp), p = plain(jp).replace(/[\s　]/g, '');
    if (!p || seen.has(p)) return;
    seen.add(p); list.push({ jp, vi: o.vi, ctx: o.ctx || ctx || '', src, p });
  };
  for (const it of D.dialog) for (const t of it.turns || []) put(t, it.ctx, 'Hội thoại');
  for (const it of D.text) for (const t of it.sents || []) put(t, it.ctx, 'Bài đọc');
  for (const g of D.grammar) for (const e of g.ex || []) put(e, '', 'Ví dụ ngữ pháp');
  for (const v of D.vocab) { for (const e of v.fx || []) put(e, (v.topics || [])[0], 'Câu theo thể'); for (const e of v.ex || []) put(e, (v.topics || [])[0], 'Ví dụ từ'); }
  for (const p of D.phrase) put(p, (p.topics || [])[0], 'Câu thực chiến');
  // một chuỗi lớn để tìm nhanh, kèm chỗ bắt đầu của từng câu
  const starts = []; let big = '';
  for (const x of list) { starts.push(big.length); big += x.p + '\u0001'; }
  _c = { list, big, starts }; _ck = key;
  return _c;
}
export const warmCorpus = () => { try { corpus(); } catch { } };
// các câu có chứa chuỗi sub (chữ trơn)
function findAll(sub, limit = 30) {
  const { big, starts } = corpus(), out = [];
  if (!sub) return out;
  let i = big.indexOf(sub);
  while (i >= 0 && out.length < limit) {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (starts[m] <= i) lo = m; else hi = m - 1; }
    out.push(lo);
    i = lo + 1 < starts.length ? big.indexOf(sub, starts[lo + 1]) : -1;
  }
  return out;
}
// bọc [[ ]] quanh chỗ đầu tiên có sub (nhóm có furigana bọc trọn nhóm)
export function hlMark(jp, sub) {
  const segs = parseJP(jp), i0 = segs.map(s => s.t).join('').indexOf(sub);
  if (i0 < 0 || !sub) return jp;
  const i1 = i0 + sub.length;
  let out = '', p = 0, st = 0; // st: 0 chưa mở, 1 đang mở, 2 đã đóng
  for (const s of segs) {
    if (s.r) {
      const b = p + s.t.length;
      if (st === 0 && b > i0) { out += '[['; st = 1; }
      out += `${s.t}[${s.r}]`;
      if (st === 1 && b >= i1) { out += ']]'; st = 2; }
      p = b;
    } else for (const ch of s.t) {
      if (st === 0 && p >= i0) { out += '[['; st = 1; }
      out += ch; p++;
      if (st === 1 && p >= i1) { out += ']]'; st = 2; }
    }
  }
  if (st === 1) out += ']]';
  return out;
}
// lấy xen kẽ các tình huống
function spread(idxs) {
  const C = corpus(), by = new Map();
  for (const i of idxs) { const k = C.list[i].ctx || C.list[i].src; if (!by.has(k)) by.set(k, []); by.get(k).push(i); }
  const qs = [...by.values()], out = [];
  for (let r = 0; out.length < idxs.length; r++) for (const q of qs) if (q[r] != null) out.push(q[r]);
  return out;
}
const situ = x => SITU[x.ctx] || x.src;
// surf: dạng đúng (chữ trơn), kana: cách đọc; stem: gốc của thể (投げられ…) hoặc ''; made: câu ghép theo khuôn [{jp, vi}];
// others: hàm trả về dạng cùng kiểu của từ khác (gọi dần, có giới hạn)
export async function examplesFor({ surf, kana, stem = '', made = [], others = [], max = 10, min = 5 }) {
  const C = corpus(), out = [], used = new Set();
  const take = (idxs, sub, kind, cap = max) => {
    // câu ngắn trước (dễ đọc hơn), vẫn xen kẽ tình huống
    for (const i of spread([...new Set(idxs)].filter(i => !used.has(i)).sort((x, y) => C.list[x].p.length - C.list[y].p.length))) {
      if (out.length >= cap) break;
      used.add(i);
      const x = C.list[i];
      out.push({ jp: hlMark(x.jp, sub), vi: x.vi, situ: situ(x), kind });
    }
  };
  take([...findAll(surf), ...(kana && kana !== surf ? findAll(kana) : [])], surf, 'own');
  if (stem) take(findAll(stem), stem, 'stem', Math.min(max, out.length + 4));
  // câu ghép theo khuôn (chính từ này, đúng thể): tối đa 2 câu, nhất là khi dữ liệu có ít câu thật
  for (const m of made.slice(0, out.length < min ? 2 : 1)) { if (out.length >= max) break; out.push({ jp: hlMark(m.jp, m.hl || surf), vi: m.vi, situ: 'Câu mẫu theo khuôn', kind: 'made' }); }
  for (let k = 0; k < others.length && out.length < max; k++) {
    const o = others[k]();
    if (o?.surf) take(findAll(o.surf, 2), o.surf, 'other', Math.min(max, out.length + 1));
    if (k % 40 === 39) await new Promise(r => setTimeout(r, 0)); // không chặn máy
  }
  return out;
}
