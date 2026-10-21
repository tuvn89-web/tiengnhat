// Bài tập ngữ pháp G1–G11: sinh câu hỏi từ dữ liệu mẫu ngữ pháp + máy chia động từ, và trang Luyện tập / Thi thử.
import { esc, rich, rubyHTML, blankHTML, hlText, stripHL, plain, reading, shuffle, wordHTML, autoChunks, freeRuns } from './util.js';
import { D, LEVELS } from './data.js';
import { status, dueDirs, errCount, isStar, stats } from './srs.js';
import { ttsReady } from './tts.js';
import { conjugate, wrongForms, ruleText, FORMS, FORM_LEVEL, verbInfo } from './conj.js';
import { answerOf, distractors, readHint } from './quiz.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, readChips, emptyState } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { recForm } from './fstat.js';

export const GTYPES = [
  ['blank', 'Điền chỗ trống'], ['conj', 'Chia động từ'], ['order', 'Sắp xếp câu'], ['star', 'Câu ★ (kiểu JLPT)'],
  ['spot', 'Tìm chỗ sai'], ['situ', 'Chọn cách nói hợp hoàn cảnh'], ['build', 'Ghép câu Việt → Nhật'],
  ['listen', 'Nghe → chọn'], ['shift', 'Đổi lối nói'], ['mean', 'Chọn nghĩa (hiểu)'], ['mix', 'Trộn các dạng'],
];
const TAG = { ...Object.fromEntries(GTYPES), sense: 'Hiểu câu' };
const END_RE = /[。！？!?]$/;
const JP_RE = /[\u3040-\u30FF\u4E00-\u9FFF]/; // lựa chọn viết tiếng Việt thì không gắn lang=ja

const gHead = g => `<p class="after-g"><b lang="ja">${rich(g.pattern)}</b> — ${rich(g.meaning)}</p>`;
const fullSent = ex => `<p class="after-sent" lang="ja">${rubyHTML(ex.jp, true)}</p><p class="muted">${esc(ex.vi)}</p>`;
const viHint = vi => `<details class="vihint"><summary>Gợi ý: nghĩa câu</summary><p>${esc(vi)}</p></details>`;
const okRepeat = arr => new Set(arr.map(x => plain(x))).size === arr.length;

// Phần ngữ pháp của các câu khác — đáp án nhiễu dự phòng
// v40: bảng phần ngữ pháp của mọi câu ví dụ dựng một lần (trước đây mỗi câu hỏi dò lại cả kho), và chỉ dùng khi câu thiếu phương án sai
let _hl = null, _hlArr = null, _hlN = -1;
function allHL() {
  if (_hl && _hlArr === D.grammar && _hlN === D.grammar.length) return _hl;
  const out = [];
  for (const o of D.grammar) for (const e of o.ex || []) { const h = hlText(e.jp); if (h) out.push([o.id, o.level, h]); }
  _hl = out; _hlArr = D.grammar; _hlN = D.grammar.length;
  return out;
}
export const warmGrammar = () => { allHL(); };
function otherHL(g) {
  const out = [];
  for (const [id, lv, h] of allHL()) if (id !== g.id) out.push({ h, lv: lv === g.level });
  return shuffle(out).sort((a, b) => b.lv - a.lv).map(x => x.h);
}
function blankOpts(g, ex) {
  const ans = hlText(ex.jp);
  if (!ans) return null;
  const seen = new Set([plain(ans)]), opts = [];
  const tryAdd = w => { const p = plain(w); if (seen.has(p)) return; seen.add(p); opts.push(w); };
  for (const w of ex.wrong || []) { tryAdd(w); if (opts.length >= 3) break; }
  if (opts.length < 3) for (const w of otherHL(g)) { tryAdd(w); if (opts.length >= 3) break; }
  if (opts.length < 2) return null;
  return shuffle([ans, ...opts]).map((h, i) => opt(h === ans ? 'ok' : 'x' + i, rich(h)));
}
function chunkInfo(ex) {
  let ch = ex.chunks;
  if (!Array.isArray(ch) || ch.length < 3) ch = autoGrammarChunks(ex.jp);
  if (!ch || ch.length < 3) return null;
  const h = plain(hlText(ex.jp));
  const gi = ch.findIndex(c => plain(c).includes(h));
  return { ch, gi };
}
// Câu ví dụ chưa có chunks: tự cắt theo trợ từ, rồi gộp các mảnh để phần [[ngữ pháp]] nằm trọn trong một mảnh
function autoGrammarChunks(jp) {
  if (!jp || /B：/.test(jp)) return null;
  const idx = jp.indexOf('[['), hl = hlText(jp);
  const s = stripHL(jp).replace(END_RE, '');
  const ch = autoChunks(s, 7);
  if (idx < 0 || ch.join('') !== s) return null;
  const a = idx, b = idx + hl.length;
  let pos = 0, first = -1, last = -1;
  ch.forEach((c, i) => { const e = pos + c.length; if (e > a && pos < b) { if (first < 0) first = i; last = i; } pos = e; });
  if (first < 0) return null;
  const merged = [...ch.slice(0, first), ch.slice(first, last + 1).join(''), ...ch.slice(last + 1)];
  while (merged.length > 6) { // quá nhiều mảnh: gộp hai mảnh đầu
    merged.splice(0, 2, merged[0] + merged[1]);
  }
  return merged.length >= 3 && merged.join('') === s ? merged : null;
}

// ---------- từng dạng bài ----------
// v51: mẫu dễ nhầm (mục compare của mẫu) → mẫu ngữ pháp có trong kho. Tên trong compare hay kèm chú thích: 〜前に（N5）, 〜ばかり（chỉ toàn）, A / B
const gkeys = p => { const s = plain(p).replace(/\s*[（(][^）)]*[）)]\s*$/, '').trim(); return [...new Set(s.split(/\s*\/\s*|・|、/).map(a => a.replace(/[（(][^）)]*[）)]/g, '').replace(/[〜～\s]/g, '')).filter(Boolean))]; };
let _gi = null, _gk = '';
function gIndex() {
  const key = `${D.grammar.length}:${D.items.size}`;
  if (_gi && _gk === key) return _gi;
  _gi = new Map(); _gk = key;
  for (const g of D.grammar) for (const k of gkeys(g.pattern)) { if (!_gi.has(k)) _gi.set(k, []); _gi.get(k).push(g); }
  return _gi;
}
export function simGrammar(g) {
  const out = [];
  for (const c of g.compare || []) for (const k of gkeys(c.pattern)) for (const x of gIndex().get(k) || []) if (x !== g && !out.includes(x)) out.push(x);
  return out;
}
// mẫu dễ nhầm đã học của một nhóm mẫu (để ôn trộn) — tối đa n mẫu
export const simLearned = (gs, n = 3) => [...new Set(gs.flatMap(simGrammar))].filter(x => !gs.includes(x) && status(x) !== 'new').slice(0, n);
const exOK = ex => ex?.jp && ex.vi && !/[AB]：/.test(ex.jp);
const isSkill = g => /^caunoi-/.test(g?._pack || ''); // "mục" của bài cầu nối là kỹ năng đọc câu, không phải mẫu có nghĩa riêng
const Q = {
  // v51 "hiểu → dùng": phần tô màu ([[ ]]) nghĩa là gì — phương án nhiễu là nghĩa của mẫu dễ nhầm, mẫu cùng bài, mẫu cùng cấp
  mean(g, ex) {
    if (!exOK(ex) || !/\[\[/.test(ex.jp) || !g.meaning || isSkill(g)) return null;
    const right = plain(g.meaning), seen = new Set([right]), ds = [];
    // nghĩa gần trùng (〜ことができる / thể khả năng đều "có thể làm") thì không làm phương án nhiễu — hai đáp án đúng
    const head = m => new Set(m.split(/\s+[—–-]\s+|;/)[0].toLowerCase().replace(/[(),.…/~〜]/g, ' ').split(/\s+/).filter(w => w.length > 1));
    const hr = head(right), close = m => { const h = head(m); let n = 0; for (const w of h) if (hr.has(w)) n++; return n >= 2 || (n >= 1 && Math.min(h.size, hr.size) <= 2); };
    const add = x => { const m = !isSkill(x) && x.meaning && plain(x.meaning); if (m && !seen.has(m) && ds.length < 3 && !close(m)) { seen.add(m); ds.push(x.meaning); } };
    simGrammar(g).forEach(add);
    shuffle(D.grammar.filter(x => x._pack === g._pack && x !== g)).forEach(add);
    if (ds.length < 3) shuffle(D.grammar.filter(x => x.level === g.level && x !== g)).slice(0, 40).forEach(add);
    if (ds.length < 3) return null;
    return { kind: 'choice', tag: TAG.mean, level: g.level, prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(ex.jp, true)}</p>`, hint: 'Phần tô màu nghĩa là gì trong câu này?',
      opts: shuffle([g.meaning, ...ds]).map((m, i) => opt(m === g.meaning ? 'ok' : 'x' + i, rich(m), false)), answer: 'ok', noSlow: true,
      after: `<p class="muted">${esc(ex.vi)}</p>` + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  // hiểu cả câu: nghĩa đúng của câu — phương án nhiễu là câu của mẫu dễ nhầm / mẫu cùng bài
  sense(g, ex) {
    if (!exOK(ex)) return null;
    const seen = new Set([ex.vi]), ds = [];
    for (const x of [...simGrammar(g), ...shuffle(D.grammar.filter(y => y._pack === g._pack && y !== g)), g]) {
      for (const e of shuffle((x.ex || []).filter(exOK))) { if (ds.length >= 3) break; if (!seen.has(e.vi)) { seen.add(e.vi); ds.push(e.vi); if (x !== g) break; } }
      if (ds.length >= 3) break;
    }
    if (ds.length < 3) return null;
    return { kind: 'choice', tag: TAG.sense || 'Hiểu câu', level: g.level, prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(ex.jp, true)}</p>`, hint: 'Câu này nghĩa là gì?',
      opts: shuffle([ex.vi, ...ds]).map((v, i) => opt(v === ex.vi ? 'ok' : 'x' + i, esc(v), false)), answer: 'ok', noSlow: true,
      after: fullSent(ex) + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  blank(g, ex) {
    const opts = blankOpts(g, ex); if (!opts) return null;
    return { kind: 'choice', tag: TAG.blank, level: g.level, prompt: `<p class="prompt-sent" lang="ja">${blankHTML(ex.jp)}</p><p class="prompt-vi-s">${esc(ex.vi)}</p>`,
      hint: 'Chọn phần điền vào chỗ trống', opts, answer: 'ok', after: fullSent(ex) + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  listen(g, ex) {
    if (!ttsReady()) return null;
    const opts = blankOpts(g, ex); if (!opts) return null;
    return { kind: 'choice', tag: TAG.listen, level: g.level, prompt: `<p class="prompt-sent" lang="ja">${blankHTML(ex.jp)}</p>`,
      hint: 'Nghe câu rồi chọn phần còn thiếu', say: reading(stripHL(ex.jp)), autoSay: true, opts, answer: 'ok', after: fullSent(ex) + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  order(g, ex) {
    const ci = chunkInfo(ex); if (!ci || !okRepeat(ci.ch)) return null;
    return { kind: 'order', tag: TAG.order, level: g.level, prompt: `<p class="prompt-vi-s">Sắp xếp thành câu đúng</p>${viHint(ex.vi)}`,
      chunks: ci.ch.map(rich), after: fullSent(ex) + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  build(g, ex) {
    const ci = chunkInfo(ex); if (!ci || !okRepeat(ci.ch)) return null;
    const extra = [];
    const h = hlText(ex.jp);
    if (ci.gi >= 0 && (ex.wrong || []).length) {
      const gp = ci.ch[ci.gi], hp = stripHL(h);
      if (gp.includes(hp)) extra.push(rich(gp.replace(hp, ex.wrong[0])));
    }
    return { kind: 'order', tag: TAG.build, level: g.level, prompt: `<p class="prompt-vi">${esc(ex.vi)}</p>`, hint: extra.length ? 'Ghép thành câu tiếng Nhật (có một mảnh thừa)' : 'Ghép thành câu tiếng Nhật',
      chunks: ci.ch.map(rich), extra, after: fullSent(ex) + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  star(g, ex) {
    const ci = chunkInfo(ex); if (!ci || ci.ch.length < 4 || !okRepeat(ci.ch)) return null;
    const n = ci.ch.length;
    const starts = [...Array(n - 3).keys()];
    const s = starts.find(x => ci.gi >= x && ci.gi < x + 4) ?? starts[0];
    const win = ci.ch.slice(s, s + 4);
    // ô ★ không đặt vào mảnh đổi chỗ được (野菜を / 水で): mảnh đó đứng ô nào cũng đúng → hai đáp án
    const run = freeRuns(ci.ch).slice(s, s + 4);
    const fixed = [0, 1, 2, 3].filter(i => run[i] < 0 || run.filter(r => r === run[i]).length < 2);
    if (!fixed.length) return null;
    const pos = fixed[Math.floor(Math.random() * fixed.length)];
    const end = (stripHL(ex.jp).match(END_RE) || [''])[0];
    const blanks = win.map((_, i) => `<span class="sblank${i === pos ? ' sb-star' : ''}">${i === pos ? '★' : '＿＿'}</span>`).join('');
    const sent = ci.ch.slice(0, s).map(rich).join('') + blanks + ci.ch.slice(s + 4).map(rich).join('') + end;
    const ord = shuffle(win.map((c, i) => ({ c, i })));
    // câu chỉ có 4 mảnh thì cả câu là ô trống, không còn ngữ cảnh → hiện luôn nghĩa tiếng Việt
    const viPart = n > 4 ? viHint(ex.vi) : `<p class="prompt-vi-s">${esc(ex.vi)}</p>`;
    return { kind: 'choice', tag: TAG.star, level: g.level, prompt: `<p class="prompt-sent" lang="ja">${sent}</p>${viPart}`,
      hint: 'Sắp xếp 4 mảnh vào chỗ trống. Mảnh nào nằm ở ô ★?',
      opts: ord.map(o => opt(o.i === pos ? 'ok' : 'x' + o.i, rich(o.c))), answer: 'ok',
      after: `<p class="muted small">Thứ tự đúng: <span lang="ja">${win.map(rich).join(' / ')}</span></p>` + fullSent(ex) + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  spot(g, e) {
    if (!Array.isArray(e.chunks) || e.bad == null) return null;
    return { kind: 'spot', tag: TAG.spot, level: g.level, prompt: `<p class="prompt-vi-s">Câu dưới đây có <b>một</b> chỗ sai. Chạm vào mảnh sai.</p>${e.vi ? viHint(e.vi) : ''}`,
      parts: e.chunks.map(rich), bad: e.bad, fix: rich(e.fix || ''), sent: e.chunks.map((c, i) => (i === e.bad ? e.fix || c : c)).join('') + '。', gram: [g.id],
      after: `<p>${rich(e.why || '')}</p>` + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  situ(g, s) {
    if (!Array.isArray(s.opts) || s.ans == null) return null;
    return { kind: 'choice', tag: TAG.situ, level: g.level, prompt: `<p class="prompt-vi-s">${rich(s.q)}</p>`, hint: 'Chọn câu nói phù hợp nhất',
      opts: shuffle(s.opts.map((o, i) => opt(i === s.ans ? 'ok' : 'x' + i, rich(o), JP_RE.test(o)))), answer: 'ok', ...(JP_RE.test(s.opts[s.ans] || '') ? { sent: s.opts[s.ans], gram: [g.id] } : {}),
      after: `<p>${rich(s.why || '')}</p>` + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
};

export { Q as GQ, TAG as GTAG };

// Đổi lối nói: từ mẫu ngữ pháp (shift) + từ Kansai trong kho (std)
function shiftPool() {
  const pool = [];
  for (const g of D.grammar) for (const s of g.shift || []) pool.push({ from: s.from, to: s.to, note: s.note || '', kind: s.kind || '', wrong: s.wrong || [], g });
  for (const v of D.vocab) if (v.reg === 'kansai' && v.std) pool.push({ from: v.kana, to: v.std, note: v.vi, kind: 'kansai', wrong: [], v });
  return pool;
}
function shiftQ(item, pool) {
  // đáp án nhiễu: ưu tiên câu sai do người soạn viết sẵn (wrong), sau đó mới lấy câu khác cùng loại
  const others = shuffle(pool.filter(p => plain(p.to) !== plain(item.to))).sort((a, b) => (b.kind === item.kind) - (a.kind === item.kind));
  const seen = new Set([plain(item.to)]), opts = [];
  for (const t of [...(item.wrong || []), ...others.map(o => o.to)]) { if (seen.has(plain(t))) continue; seen.add(plain(t)); opts.push(t); if (opts.length >= 3) break; }
  if (opts.length < 2) return null;
  const label = item.kind === 'kansai' ? 'Kansai-ben → tiếng chuẩn' : 'Nói lại bằng tiếng chuẩn lịch sự';
  return { kind: 'choice', tag: TAG.shift, level: item.g?.level || item.v?.level || '', prompt: `<p class="prompt-hint">${label}</p><p class="prompt-jp" lang="ja">${rich(item.from)}</p>`,
    opts: shuffle([item.to, ...opts].map(t => opt(t === item.to ? 'ok' : 'x' + plain(t), rich(t)))), answer: 'ok',
    after: item.note ? `<p>${rich(item.note)}</p>` : '', review: item.g ? { id: item.g.id, dir: 'gp' } : null };
}

// Chia động từ
export const verbs = () => D.vocab.filter(v => verbInfo(v));
export function conjQ(v, form) {
  const info = verbInfo(v), right = conjugate(v, form);
  if (!info || !right) return null;
  const wr = wrongForms(v, form).slice(0, 3);
  if (wr.length < 2) return null;
  return { kind: 'choice', tag: TAG.conj, level: FORM_LEVEL[form], prompt: `<p class="prompt-jp" lang="ja">${rich(info.dict)}</p><p class="prompt-hint">${esc(v.vi)} → <b>${FORMS[form]}</b></p>`,
    opts: shuffle([right.mark, ...wr].map(m => opt(m === right.mark ? 'ok' : 'x' + m, rich(m)))), answer: 'ok',
    after: `<p>${rich(ruleText(v, form))}</p>`, onAnswer: ok => recForm(form, info.group, ok) };
}

// ---------- chọn mẫu và sinh lượt ----------
export function pickGrammar({ source = 'all', levels = [], ids = [] } = {}) {
  let pool = D.grammar.filter(g => (!levels.length || levels.includes(g.level)) && (!ids.length || ids.includes(g.id)));
  if (source === 'due') pool = pool.filter(g => dueDirs(g).length);
  else if (source === 'new') pool = pool.filter(g => status(g) === 'new');
  else if (source === 'wrong') pool = pool.filter(g => errCount(g) > 0);
  else if (source === 'star') pool = pool.filter(g => isStar(g.id));
  return pool;
}
const EX_TYPES = ['blank', 'listen', 'order', 'build', 'star', 'mean'];
export function buildGrammarQs({ type = 'mix', source = 'all', levels = [], ids = [], count = 20, forms = ['te', 'nai', 'masu', 'ta'] } = {}) {
  if (type === 'conj') {
    const fs = forms.length ? forms : [];
    const pairs = shuffle(verbs().flatMap(v => fs.map(f => [v, f])));
    const out = [];
    for (const [v, f] of pairs) { const q = conjQ(v, f); if (q) out.push(q); if (out.length >= count) break; }
    return out;
  }
  if (type === 'shift') {
    const pool = shiftPool();
    return shuffle(pool).map(p => shiftQ(p, pool)).filter(Boolean).slice(0, count);
  }
  const gs = pickGrammar({ source, levels, ids });
  const types = type === 'mix' ? ['blank', 'order', 'build', 'star', 'spot', 'situ', 'mean', ...(ttsReady() ? ['listen'] : [])] : [type];
  const cands = [];
  for (const g of gs) {
    for (const t of types) {
      if (EX_TYPES.includes(t)) for (const ex of g.ex || []) { const q = Q[t](g, ex); if (q) cands.push(q); }
      if (t === 'spot') for (const e of g.errs || []) { const q = Q.spot(g, e); if (q) cands.push(q); }
      if (t === 'situ') for (const s of g.situ || []) { const q = Q.situ(g, s); if (q) cands.push(q); }
    }
  }
  if (type === 'mix') {
    const pool = shiftPool().filter(p => p.g && gs.includes(p.g));
    for (const p of pool) { const q = shiftQ(p, shiftPool()); if (q) cands.push(q); }
  }
  // trộn đều giữa các mẫu và các dạng
  const byKey = new Map();
  for (const q of shuffle(cands)) { const k = (q.review?.id || '') + q.tag; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(q); }
  const lanes = shuffle([...byKey.values()]), out = [];
  while (out.length < count && lanes.some(l => l.length)) for (const l of lanes) { if (l.length && out.length < count) out.push(l.shift()); }
  return out;
}

// v51 "hiểu → dùng": vòng Hiểu — mỗi mẫu 2 câu "phần tô màu nghĩa là gì" + 2 câu "câu này nghĩa là gì" (câu dễ trước), theo từng mẫu
export function buildHieuQs(gs, per = 4) {
  const out = [];
  for (const g of gs) {
    const exs = (g.ex || []).filter(exOK), qs = [];
    for (const ex of isSkill(g) ? [] : exs) { if (qs.filter(q => q.tag === TAG.mean).length >= Math.ceil(per / 2)) break; const q = Q.mean(g, ex); if (q) { qs.push(q); q._ex = ex; } }
    for (const ex of exs.filter(e => !qs.some(q => q._ex === e))) { if (qs.length >= per) break; const q = Q.sense(g, ex); if (q) qs.push(q); }
    out.push(...qs);
  }
  return out;
}

// #/nguphap/hieu?g=<mã,mã> — vòng Hiểu; #/nguphap/tron?g=<mã> — luyện trộn với mẫu dễ nhầm đã học
export function runGrammarHieu(view, ctx, ids) {
  const gs = ids.map(id => D.items.get(id)).filter(g => g?._type === 'grammar');
  const qs = buildHieuQs(gs);
  if (!qs.length) { view.innerHTML = emptyState('Mẫu này chưa đủ câu ví dụ để làm bài chọn nghĩa.', '<a class="btn btn-ghost" href="#/nguphap">Về danh sách ngữ pháp</a>'); return; }
  if (gs.length === 1) ctx.backTo = '#/nguphap/' + encodeURIComponent(gs[0].id);
  runDrill(view, qs, ctx, { title: gs.length === 1 ? 'Hiểu: ' + plain(gs[0].pattern) : 'Hiểu: chọn nghĩa', again: () => ctx.go('#/nguphap/hieu?g=' + encodeURIComponent(ids.join(',')), true) });
}
export function runGrammarMix(view, ctx, id) {
  const g = D.items.get(id);
  if (!g) return ctx.go('#/nguphap');
  const sim = simLearned([g], 3);
  ctx.backTo = '#/nguphap/' + encodeURIComponent(id);
  runDrill(view, buildGrammarQs({ type: 'mix', ids: [id, ...sim.map(x => x.id)], count: 20 }), ctx, { title: `Trộn: ${plain(g.pattern)}${sim.length ? ' + ' + sim.map(x => plain(x.pattern)).join(', ') : ''}`, again: () => ctx.go('#/nguphap/tron?g=' + encodeURIComponent(id), true) });
}

// Thi thử theo cấp: 40% từ vựng (đọc kanji, nghĩa), 60% ngữ pháp (điền, câu ★, cách nói)
export function buildMockTest(level, n = 20) {
  const vocab = shuffle(D.vocab.filter(v => v.level === level && v.reg !== 'kansai'));
  const nv = Math.round(n * 0.4);
  const vq = [];
  for (const v of vocab) {
    if (vq.length >= nv) break;
    const dir = v.kanji && vq.length % 2 === 0 ? 'kr' : 'jv';
    const right = answerOf(v, dir, 'furi');
    const ds = distractors(v, dir, 'furi');
    if (ds.length < 2) continue;
    const prompt = dir === 'kr' ? `<p class="prompt-jp" lang="ja" data-bare>${esc(v.kanji)}</p>${readHint(v)}` : `<p class="prompt-jp" lang="ja">${wordHTML(v, 'furi')}</p>`;
    vq.push({ kind: 'choice', tag: dir === 'kr' ? 'Chữ Hán – cách đọc' : 'Từ vựng – nghĩa', level, promptBare: dir === 'kr', prompt,
      hint: dir === 'kr' ? 'Chọn cách đọc' : 'Chọn nghĩa', opts: shuffle([right, ...ds]).map(a => opt(a.key, a.html, a.jp)), answer: right.key, review: { id: v.id, dir } });
  }
  const gq = buildGrammarQs({ type: 'mix', levels: [level], count: 999 }).filter(q => q.kind === 'choice' && q.tag !== TAG.listen && q.tag !== TAG.shift).slice(0, n - vq.length);
  return shuffle([...vq, ...gq]).slice(0, n);
}

// ---------- giao diện ----------
export const gtabs = cur => `<div class="tabs" role="tablist">
  <a role="tab" href="#/nguphap" aria-selected="${cur === 'list'}">Bài học</a>
  <a role="tab" href="#/nguphap/luyen" aria-selected="${cur === 'luyen'}">Luyện tập</a>
  <a role="tab" href="#/nguphap/thithu" aria-selected="${cur === 'thi'}">Thi thử</a></div>`;

export async function renderGrammarPractice(view, ctx, onlyId, preset) {
  const saved = await kvGet('gpSetup', {});
  const o = { type: 'mix', source: 'all', levels: [], forms: ['te', 'nai'], count: 20, ...saved, ...(preset ? { type: preset } : {}) };
  if (!D.grammar.length && !verbs().length) { view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('luyen')}` + emptyState('Chưa có gói ngữ pháp nào.'); return; }
  if (onlyId) {
    const g = D.items.get(onlyId);
    ctx.backTo = '#/nguphap/' + encodeURIComponent(onlyId);
    return runDrill(view, buildGrammarQs({ type: 'mix', ids: [onlyId], count: 20 }), ctx,
      { title: g ? plain(g.pattern) : 'Luyện mẫu', again: () => renderGrammarPractice(view, ctx, onlyId) });
  }
  const st = stats(D.grammar);
  const types = GTYPES.filter(([t]) => t !== 'listen' || ttsReady());
  view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('luyen')}
    <form class="setup" onsubmit="return false">
      <fieldset><legend>Dạng bài</legend>${chips('type', types, o.type, false)}</fieldset>
      <fieldset class="f-forms"><legend>Thể cần chia</legend>${chips('forms', Object.entries(FORMS).map(([k, v]) => [k, `${v} (${FORM_LEVEL[k]})`]), o.forms)}</fieldset>
      <fieldset class="f-src"><legend>Lấy mẫu nào</legend>${chips('source', [['due', 'Đến hạn ôn', st.due], ['new', 'Mẫu mới', st.new], ['wrong', 'Hay sai'], ['all', 'Tất cả', st.total]], o.source, false)}</fieldset>
      <fieldset class="f-src"><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(n => [String(n), String(n)]), String(o.count), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>`;
  const f = view.querySelector('.setup');
  const read = () => ({ type: readChip(f, 'type'), source: readChip(f, 'source'), levels: readChips(f, 'levels'), forms: readChips(f, 'forms'), count: +readChip(f, 'count') });
  const upd = () => {
    const x = read();
    f.querySelector('.f-forms').hidden = x.type !== 'conj';
    f.querySelectorAll('.f-src').forEach(e => { e.hidden = x.type === 'conj' || x.type === 'shift'; });
    const n = buildGrammarQs({ ...x, count: 999 }).length;
    let msg = n ? `Có ${n} câu phù hợp.` : 'Chưa có câu nào cho lựa chọn này.';
    if (!n && x.source === 'due') msg = 'Không có mẫu nào đến hạn ôn. Chọn "Tất cả" hoặc "Mẫu mới".';
    if (x.type === 'conj') msg = `${verbs().length} động từ trong kho × ${x.forms.length} thể.` + (x.forms.length ? '' : ' Chọn ít nhất một thể.');
    f.querySelector('.setup-count').textContent = msg;
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd); upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = read(); await kvSet('gpSetup', x);
    ctx.backTo = '#/nguphap/luyen?t=' + x.type;
    runDrill(view, buildGrammarQs(x), ctx, { title: TAG[x.type] || 'Luyện ngữ pháp', again: () => ctx.go('#/nguphap/luyen', true) });
  };
}

export async function renderMockSetup(view, ctx) {
  const lv = LEVELS.filter(l => D.grammar.some(g => g.level === l) || D.vocab.some(v => v.level === l));
  const saved = await kvGet('mockSetup', {});
  const lv0 = lv.includes(saved.level) ? saved.level : lv[0], cnt0 = String(saved.count || 20);
  view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('thi')}
    <form class="setup" onsubmit="return false">
      <p class="muted small">Đề ngắn kiểu phần Kiến thức ngôn ngữ của JLPT: đọc chữ Hán, nghĩa từ, điền ngữ pháp, câu ★, chọn cách nói. Có tính giờ (45 giây mỗi câu), làm xong mới xem đáp án và giải thích.</p>
      <fieldset><legend>Cấp độ</legend>${chips('level', lv.map(l => [l, l]), lv0, false)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(n => [String(n), String(n)]), cnt0, false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu thi thử</button>
    </form>`;
  const f = view.querySelector('.setup');
  let qs = []; // đề dựng sẵn khi đổi lựa chọn → số câu báo trước khớp đúng đề sẽ làm
  const upd = () => {
    qs = buildMockTest(readChip(f, 'level'), +readChip(f, 'count'));
    const n = qs.length, want = +readChip(f, 'count');
    f.querySelector('.setup-count').textContent = n ? `Đề gồm ${n} câu, ${Math.ceil(n * 45 / 60)} phút.${n < want ? ` (Kho dữ liệu cấp này mới đủ ${n} câu.)` : ''}` : 'Cấp này chưa đủ dữ liệu để ra đề.';
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd); upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    await kvSet('mockSetup', { level: readChip(f, 'level'), count: +readChip(f, 'count') });
    ctx.backTo = '#/nguphap/thithu';
    runDrill(view, qs, ctx, { title: 'Thi thử ' + readChip(f, 'level'), mode: 'test', timeLimit: qs.length * 45, again: () => ctx.go('#/nguphap/thithu', true) });
  };
}
