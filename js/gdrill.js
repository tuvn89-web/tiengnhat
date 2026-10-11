// Bài tập ngữ pháp G1–G11: sinh câu hỏi từ dữ liệu mẫu ngữ pháp + máy chia động từ, và trang Luyện tập / Thi thử.
import { esc, rich, rubyHTML, blankHTML, hlText, stripHL, plain, reading, shuffle, wordHTML, autoChunks } from './util.js';
import { D, LEVELS } from './data.js';
import { status, dueDirs, errCount, isStar, stats } from './srs.js';
import { ttsReady } from './tts.js';
import { conjugate, wrongForms, ruleText, FORMS, FORM_LEVEL, verbInfo } from './conj.js';
import { answerOf, distractors } from './quiz.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, readChips, emptyState } from './ui.js';
import { kvGet, kvSet } from './db.js';

export const GTYPES = [
  ['blank', 'Điền chỗ trống'], ['conj', 'Chia động từ'], ['order', 'Sắp xếp câu'], ['star', 'Câu ★ (kiểu JLPT)'],
  ['spot', 'Tìm chỗ sai'], ['situ', 'Chọn cách nói hợp hoàn cảnh'], ['build', 'Ghép câu Việt → Nhật'],
  ['listen', 'Nghe → chọn'], ['shift', 'Đổi lối nói'], ['mix', 'Trộn các dạng'],
];
const TAG = Object.fromEntries(GTYPES);
const END_RE = /[。！？!?]$/;
const JP_RE = /[\u3040-\u30FF\u4E00-\u9FFF]/; // lựa chọn viết tiếng Việt thì không gắn lang=ja

const gHead = g => `<p class="after-g"><b lang="ja">${rich(g.pattern)}</b> — ${rich(g.meaning)}</p>`;
const fullSent = ex => `<p class="after-sent" lang="ja">${rubyHTML(ex.jp, true)}</p><p class="muted">${esc(ex.vi)}</p>`;
const viHint = vi => `<details class="vihint"><summary>Gợi ý: nghĩa câu</summary><p>${esc(vi)}</p></details>`;
const okRepeat = arr => new Set(arr.map(x => plain(x))).size === arr.length;

// Phần ngữ pháp của các câu khác — đáp án nhiễu dự phòng
function otherHL(g) {
  const out = [];
  for (const o of D.grammar) if (o.id !== g.id) for (const e of o.ex || []) { const h = hlText(e.jp); if (h) out.push({ h, lv: o.level === g.level }); }
  return shuffle(out).sort((a, b) => b.lv - a.lv).map(x => x.h);
}
function blankOpts(g, ex) {
  const ans = hlText(ex.jp);
  if (!ans) return null;
  const seen = new Set([plain(ans)]), opts = [];
  for (const w of [...(ex.wrong || []), ...otherHL(g)]) { const p = plain(w); if (seen.has(p)) continue; seen.add(p); opts.push(w); if (opts.length >= 3) break; }
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
const Q = {
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
    const win = ci.ch.slice(s, s + 4), pos = Math.floor(Math.random() * 4);
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
      parts: e.chunks.map(rich), bad: e.bad, fix: rich(e.fix || ''),
      after: `<p>${rich(e.why || '')}</p>` + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
  situ(g, s) {
    if (!Array.isArray(s.opts) || s.ans == null) return null;
    return { kind: 'choice', tag: TAG.situ, level: g.level, prompt: `<p class="prompt-vi-s">${rich(s.q)}</p>`, hint: 'Chọn câu nói phù hợp nhất',
      opts: shuffle(s.opts.map((o, i) => opt(i === s.ans ? 'ok' : 'x' + i, rich(o), JP_RE.test(o)))), answer: 'ok',
      after: `<p>${rich(s.why || '')}</p>` + gHead(g), review: { id: g.id, dir: 'gp' } };
  },
};

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
function conjQ(v, form) {
  const info = verbInfo(v), right = conjugate(v, form);
  if (!info || !right) return null;
  const wr = wrongForms(v, form).slice(0, 3);
  if (wr.length < 2) return null;
  return { kind: 'choice', tag: TAG.conj, level: FORM_LEVEL[form], prompt: `<p class="prompt-jp" lang="ja">${rich(info.dict)}</p><p class="prompt-hint">${esc(v.vi)} → <b>${FORMS[form]}</b></p>`,
    opts: shuffle([right.mark, ...wr].map(m => opt(m === right.mark ? 'ok' : 'x' + m, rich(m)))), answer: 'ok',
    after: `<p>${rich(ruleText(v, form))}</p>` };
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
const EX_TYPES = ['blank', 'listen', 'order', 'build', 'star'];
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
  const types = type === 'mix' ? ['blank', 'order', 'build', 'star', 'spot', 'situ', ...(ttsReady() ? ['listen'] : [])] : [type];
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
    const prompt = dir === 'kr' ? `<p class="prompt-jp" lang="ja" data-bare>${esc(v.kanji)}</p>` : `<p class="prompt-jp" lang="ja">${wordHTML(v, 'furi')}</p>`;
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
      <fieldset class="f-src"><legend>Lấy mẫu nào</legend>${chips('source', [['due', 'Đến hạn ôn', st.due], ['new', 'Mẫu mới', st.new], ['wrong', 'Hay sai'], ['star', 'Gắn sao'], ['all', 'Tất cả', st.total]], o.source, false)}</fieldset>
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
    ctx.backTo = '#/nguphap/luyen';
    runDrill(view, buildGrammarQs(x), ctx, { title: TAG[x.type] || 'Luyện ngữ pháp', again: () => ctx.go('#/nguphap/luyen', true) });
  };
}

export function renderMockSetup(view, ctx) {
  const lv = LEVELS.filter(l => D.grammar.some(g => g.level === l) || D.vocab.some(v => v.level === l));
  view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('thi')}
    <form class="setup" onsubmit="return false">
      <p class="muted small">Đề ngắn kiểu phần Kiến thức ngôn ngữ của JLPT: đọc chữ Hán, nghĩa từ, điền ngữ pháp, câu ★, chọn cách nói. Có tính giờ (45 giây mỗi câu), làm xong mới xem đáp án và giải thích.</p>
      <fieldset><legend>Cấp độ</legend>${chips('level', lv.map(l => [l, l]), lv[0], false)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(n => [String(n), String(n)]), '20', false)}</fieldset>
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
  f.querySelector('[data-act=start]').onclick = () => {
    ctx.backTo = '#/nguphap/thithu';
    runDrill(view, qs, ctx, { title: 'Thi thử ' + readChip(f, 'level'), mode: 'test', timeLimit: qs.length * 45, again: () => ctx.go('#/nguphap/thithu', true) });
  };
}
