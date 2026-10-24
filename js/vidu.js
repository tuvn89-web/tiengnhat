// v69: CÂU VÍ DỤ CHO MỘT DẠNG CHIA (Chuyển thể, sau khi trả lời). Tìm trong mọi câu đang có trong máy (ví dụ của từ, của mẫu ngữ pháp,
// câu theo thể, hội thoại, bài đọc, câu thực chiến), lấy xen kẽ các tình huống, câu ngắn trước. Dạng được tô màu.
// v70: CHỈ lấy câu có đúng dạng đang hỏi của đúng từ đó (沸かそう → câu có 沸かそう); không lấy từ khác, không lấy thể / thì khác của từ
// (câu có 沸かしたい, 沸かしたら không tính là ví dụ của 沸かした). Thiếu câu thật thì thêm câu ghép theo khuôn của chính từ đó.
import { D, CTX, TOPICS } from './data.js';
import { plain, parseJP, stripHL } from './util.js';
import { formAt } from './inform.js';

const SITU = { ...TOPICS, ...CTX };
let _c = null, _ck = '';
function corpus() {
  const key = `${D.items.size}:${D.vocab.length}:${D.dialog.length}`;
  if (_c && _ck === key) return _c;
  const list = [], seen = new Set();
  const put = (o, ctx, src, own = '') => {
    if (!o?.jp || !o.vi) return;
    const jp = stripHL(o.jp), p = plain(jp).replace(/[\s　]/g, '');
    if (!p || seen.has(p)) return;
    seen.add(p); list.push({ jp, vi: o.vi, ctx: o.ctx || ctx || '', src, p, own });
  };
  for (const it of D.dialog) for (const t of it.turns || []) put(t, it.ctx, 'Hội thoại');
  for (const it of D.text) for (const t of it.sents || []) put(t, it.ctx, 'Bài đọc');
  for (const g of D.grammar) for (const e of g.ex || []) put(e, '', 'Ví dụ ngữ pháp');
  for (const v of D.vocab) { for (const e of v.fx || []) put(e, (v.topics || [])[0], 'Câu theo thể', v.id); for (const e of v.ex || []) put(e, (v.topics || [])[0], 'Ví dụ từ', v.id); }
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
const isKana = ch => /[\u3040-\u30ff]/.test(ch || '');
// chữ đứng trước một từ viết bằng kana: đầu câu, dấu câu, khoảng trắng hoặc trợ từ (いた trong 書いた, 見ていた không phải いる)
const PREV_OK = /[\s、。，．「」『』（）()！？!?・…〜をがにではもとへやか]/;
// p: câu chữ trơn, i: chỗ bắt đầu, sub: chữ vừa khớp (dạng đang hỏi). Đúng dạng khi không có dạng chia nào dài hơn của từ bắt đầu ở đó
// (沸かしたい, 沸かしている, 沸かしたら dài hơn 沸かした / 沸かして → là dạng khác). 〜ないで = thể ない + で, 〜です (lịch sự) → vẫn tính.
// chữ ngay sau dạng cho thấy câu dùng dạng khác: 食べた|い, 食べた|く, 食べた|かった, 食べた|ら, 食べた|り · 食べて|いる, 食べて|る, 食べて|おく,
// 食べて|しまう · 食べない|く(て), 食べない|かった, 食べない|ければ, 食べない|さそう (食べたか？, 食べたけど, 食べないで vẫn là đúng dạng)
function nextOK(sub, rest) {
  const e = sub.slice(-1);
  if (e === 'た' || e === 'だ') return !/^(い|く|かっ|けれ|ら|り|ろう)/.test(rest);
  if (e === 'て' || e === 'で') return !/^(い|る|お|しま)/.test(rest);
  if (e === 'い') return !/^(く|かっ|けれ|さ)/.test(rest);
  return true;
}
function exactAt(it, p, i, sub) {
  if (isKana(sub[0]) && i > 0 && !PREV_OK.test(p[i - 1])) return false;
  if (!nextOK(sub, p.slice(i + sub.length, i + sub.length + 2))) return false;
  if (!it) return true;
  const f = formAt(it, p, i);
  if (!f || !f.len || f.len <= sub.length) return true;
  return /^(で|です)$/.test(p.slice(i + sub.length, i + f.len)); // 〜ないで; 高くないです, 食べたいです = cùng dạng, nói lịch sự
}
// it: từ đang hỏi; surf: dạng đúng (chữ trơn); kana: cách đọc (chỉ dùng khi từ viết bằng kana); made: câu ghép theo khuôn [{jp, vi}]
// onlyOwn: dạng trùng chữ với một từ khác (切る → 切れる "có thể cắt" = động từ 切れる "đứt, hết") → chỉ lấy câu ví dụ của chính từ này
export async function examplesFor({ it, surf, kana = '', made = [], max = 10, onlyOwn = false }) {
  const C = corpus(), out = [], seen = new Set();
  if (!surf) return out;
  const subs = [surf, ...(kana && kana !== surf && !/[\u4e00-\u9fff]/.test(it?.kanji || '') ? [kana] : [])];
  // câu thật trong dữ liệu
  const hits = [];
  for (const sub of subs) for (const i of findAll(sub, 80)) {
    const x = C.list[i];
    if (onlyOwn && x.own !== it?.id) continue;
    let k = x.p.indexOf(sub);
    while (k >= 0 && !exactAt(it, x.p, k, sub)) k = x.p.indexOf(sub, k + 1);
    if (k >= 0 && !hits.some(h => h.i === i)) hits.push({ i, sub });
  }
  const subOf = new Map(hits.map(h => [h.i, h.sub]));
  for (const i of spread(hits.map(h => h.i).sort((a, b) => C.list[a].p.length - C.list[b].p.length))) {
    if (out.length >= max) break;
    const x = C.list[i];
    seen.add(x.p);
    out.push({ jp: hlMark(x.jp, subOf.get(i)), vi: x.vi, situ: situ(x), kind: 'own' });
  }
  // câu ghép theo khuôn của chính từ này, cũng phải có đúng dạng đang hỏi
  for (const m of made) {
    if (out.length >= max) break;
    const jp = stripHL(m.jp), p = plain(jp).replace(/[\s　]/g, '');
    if (seen.has(p)) continue;
    let k = p.indexOf(surf);
    while (k >= 0 && !exactAt(it, p, k, surf)) k = p.indexOf(surf, k + 1);
    if (k < 0) continue;
    seen.add(p);
    out.push({ jp: hlMark(jp, surf), vi: m.vi, situ: 'Câu mẫu theo khuôn', kind: 'made' });
  }
  return out;
}
