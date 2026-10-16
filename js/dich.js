// Luyện dịch theo câu (đợt 5c — Đ5): ~5.000 câu ví dụ trong kho. Nhật → Việt / Việt → Nhật; chọn, tự gõ, nghe, ghép mảnh.
// Chấm khi tự gõ (không cần mạng): tiếng Việt so từ chính (tô màu chỗ thiếu, để ý câu phủ định); tiếng Nhật so cả câu
// đã chuẩn hoá (kana thay chữ Hán được, chấp nhận thứ tự mảnh đổi được và cách dịch khác ghi trong dữ liệu `alt`).
// Câu sai vào lịch ôn như từ vựng (mã s:…, chiều nv / vn).
import { esc, rich, rubyHTML, plain, reading, shuffle, stripHL, parseJP, altOrders, HL_RE, wordHTML } from './util.js';
import { D, LEVELS } from './data.js';
import { status, dueDirs, errCount, P } from './srs.js';
import { alsoRight } from './quiz.js';
import { exChunks } from './practice.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, readChips } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { ttsReady } from './tts.js';
import { normKana } from './romaji.js';
import { isBookSrc, matchSrc, bookSourceOpts } from './notes.js';

// ---------- kho câu ----------
const hash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
let _idx = null, _key = '';
export function sentences() {
  const key = `${D.items.size}:${D.vocab.length}:${D.grammar.length}:${D.dialog.length}:${D.text.length}`;
  if (_idx && _key === key) return _idx;
  const seen = new Map();
  const add = (src, ex, kind) => {
    if (!ex?.jp || !ex.vi) return;
    const p = plain(stripHL(ex.jp));
    if (seen.has(p)) return;
    seen.set(p, { id: 's:' + hash(p), jp: ex.jp, vi: ex.vi, src, kind, level: src.level || 'N5', ctx: ex.ctx || '', wrong: ex.wrong || [], chunks: ex.chunks, alt: ex.alt || [], dialog: /[AB]：/.test(ex.jp) });
  };
  for (const g of D.grammar) for (const ex of g.ex || []) add(g, ex, 'g');
  for (const v of D.vocab) if (v.reg !== 'kansai') for (const ex of v.ex || []) add(v, ex, 'v');
  // lượt hội thoại, câu bài đọc (bỏ câu quá ngắn như はい。; câu Kansai / khẩu ngữ chỉ dịch Nhật → Việt)
  for (const d of [...D.dialog, ...D.text]) for (const t of d.turns || d.sents || []) {
    if (!t.jp || !t.vi || plain(t.jp).replace(/[。、！？…\s]/g, '').length < 4 || t.fmt) continue;
    add(d, { jp: t.jp, vi: t.vi, alt: t.alt, ctx: d.ctx }, 'd');
    const s = seen.get(plain(stripHL(t.jp))); if (s && s.src === d) Object.assign(s, { casual: !!t.std, gram: t.grammar || [], gloss: t.gloss, phr: t.phr, words: t.words });
  }
  _idx = [...seen.values()]; _key = key;
  return _idx;
}
const sibs = s => sentences().filter(x => x.src === s.src && x !== s);
export const sentDue = () => sentences().filter(s => dueDirs(s).length);

// ---------- chấm tiếng Việt ----------
const vnorm = s => String(s || '').toLowerCase().normalize('NFC').replace(/[.,!?;:"“”‘’()（）…\-–—/]/g, ' ').replace(/\s+/g, ' ').trim();
const deacc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
const STOP = new Set(['tôi', 'thì', 'là', 'mà', 'à', 'ạ', 'nhé', 'nhỉ', 'đấy', 'nha', 'ơi', 'vậy', 'này', 'ấy', 'đó', 'cái', 'những', 'các', 'rồi']);
const NEG = ['không', 'chưa', 'đừng', 'chẳng', 'cấm'];
export function judgeVi(ref, typed) {
  const R = vnorm(ref).split(' ').filter(Boolean), T = vnorm(typed).split(' ').filter(Boolean);
  const ts = new Set(T), ts2 = new Set(T.map(deacc));
  const hit = w => ts.has(w) || ts2.has(deacc(w));
  const key = R.filter(w => !STOP.has(w));
  const nk = key.filter(hit).length;
  const ratio = key.length ? nk / key.length : 1;
  const negR = R.some(w => NEG.includes(w)), negT = T.some(w => NEG.includes(w));
  const ok = ratio >= 0.7 && negR === negT;
  const marked = String(ref).split(/(\s+)/).map(tok => { const w = vnorm(tok); return !w || STOP.has(w) ? esc(tok) : `<span class="${hit(w) ? 'vh-hit' : 'vh-miss'}">${esc(tok)}</span>`; }).join('');
  const html = `<p class="${ok ? 'after-ok' : 'after-msg'}">${ok ? 'Đạt' : 'Chưa đạt'} — khớp ${nk}/${key.length} từ chính${negR !== negT ? ` · câu gốc ${negR ? 'là câu <b>phủ định</b>' : '<b>không</b> phủ định'}` : ''}</p>
    <p class="vh">Bản mẫu: ${marked}</p><p class="small muted">Cậu Cả dịch: ${esc(typed)}</p><p class="small muted">Chữ gạch dưới đỏ: từ chính bản dịch chưa có. Nghĩa đúng mà dùng từ khác thì bấm "Tôi dịch đúng".</p>`;
  return { ok, html, ratio };
}

// ---------- chấm tiếng Nhật ----------
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PART = { 'は': 'はわ', 'へ': 'へえ', 'を': 'をお' }; // gõ romaji "wa", "e", "o" cho trợ từ cũng được
function jaRegex(markup) {
  let re = '';
  for (const g of parseJP(stripHL(markup))) {
    if (g.r) re += `(?:${escRe(normKana(g.t))}|${escRe(normKana(g.r))})`;
    else re += [...normKana(g.t)].map(c => (PART[c] ? `[${PART[c]}]` : escRe(c))).join('');
  }
  return new RegExp('^' + re + '$');
}
function jaVariants(s) {
  const out = [stripHL(s.jp)];
  const ch = Array.isArray(s.chunks) && s.chunks.length >= 3 ? s.chunks.map(stripHL) : exChunks({ jp: s.jp });
  if (ch && plain(ch.join('')) === plain(stripHL(s.jp)).replace(/[。！？!?]$/, '')) for (const o of altOrders(ch, 5)) out.push(o.join(''));
  for (const a of s.alt || []) out.push(a);
  return out;
}
export function judgeJa(s, typed) {
  const vs = jaVariants(s), t = normKana(typed);
  const ok = vs.some(v => jaRegex(v).test(t));
  const html = `<p class="${ok ? 'after-ok' : 'after-msg'}">${ok ? 'Đúng' : 'Chưa khớp câu mẫu'}</p>
    <p class="after-sent" lang="ja">${rubyHTML(stripHL(s.jp), true)}</p>
    ${vs.length > 1 ? `<p class="small muted">Cũng đúng: ${vs.slice(1, 4).map(v => `<span lang="ja">${rich(v)}</span>`).join(' · ')}</p>` : ''}
    <p class="small muted">Cậu Cả gõ: <span lang="ja">${esc(typed)}</span></p>
    ${ok ? '' : '<p class="small muted">App so cả câu (chữ Hán hay kana đều được). Dịch đúng nghĩa nhưng khác cách nói (thường ↔ lịch sự, từ khác) thì bấm "Tôi dịch đúng".</p>'}`;
  return { ok, html };
}

// ---------- câu hỏi ----------
const tagOf = (s, t) => `${t} · ${s.kind === 'g' ? 'câu ngữ pháp' : s.kind === 'd' ? (s.src.turns ? 'câu hội thoại' : 'câu bài đọc') : 'câu từ vựng'}`;
const srcNote = s => (s.kind === 'd' ? `<p class="muted small">Trong bài: <a href="#/doc/${encodeURIComponent(s.src.id)}">${esc(s.src.title)}</a></p>` : s.kind === 'g' ? `<p class="after-g"><b lang="ja">${rich(s.src.pattern)}</b> — ${rich(s.src.meaning || '')}</p>` : `<p class="muted small">Từ: <span lang="ja">${wordHTML(s.src, 'furi')}</span> — ${esc(s.src.vi)}</p>`);
const fullAfter = s => `<p class="after-sent" lang="ja">${rubyHTML(stripHL(s.jp), true)}</p><p class="muted">${esc(s.vi)}</p>` + srcNote(s);
function viOpts(s, pool) {
  const seen = new Set([s.vi]), ds = [];
  for (const x of [...shuffle(sibs(s)), ...pool]) { if (seen.has(x.vi) || x.dialog !== s.dialog) continue; seen.add(x.vi); ds.push(x.vi); if (ds.length >= 3) break; }
  return ds.length >= 3 ? shuffle([s.vi, ...ds]).map((v, i) => opt(v === s.vi ? 'ok' : 'x' + i, esc(v), false)) : null;
}
function nvChoice(s, pool, listen) {
  const opts = viOpts(s, pool);
  if (!opts) return null;
  const jp = stripHL(s.jp);
  if (listen) return { kind: 'choice', tag: tagOf(s, 'Nghe → nghĩa'), level: s.level, prompt: '<p class="prompt-hint">Nghe câu (bấm loa để nghe lại) rồi chọn nghĩa</p>', say: reading(jp), autoSay: true, opts, answer: 'ok', after: fullAfter(s), review: { id: s.id, dir: 'nv' } };
  return { kind: 'choice', tag: tagOf(s, 'Nhật → Việt'), level: s.level, prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(jp, true)}</p>`, hint: 'Chọn câu dịch đúng', opts, answer: 'ok', after: fullAfter(s), review: { id: s.id, dir: 'nv' } };
}
// Việt → Nhật chọn câu: câu nhiễu khác câu đúng ở đúng chỗ dễ sai (phần ngữ pháp sai / từ dễ nhầm), thiếu thì lấy câu khác cùng từ, cùng mẫu
const markOf = o => o.kf || (o.kanji && o.kanji !== o.kana ? `${o.kanji}[${o.kana}]` : o.kana);
function jaOpts(s, pool) {
  const right = stripHL(s.jp), seen = new Set([plain(right)]), ds = [];
  const push = j => { const p = plain(j); if (!j || seen.has(p)) return; seen.add(p); ds.push(j); };
  if (s.kind === 'g' && HL_RE.test(s.jp)) for (const w of shuffle([...s.wrong])) push(s.jp.replace(HL_RE, w));
  if (s.kind === 'v') {
    // đổi từ chính bằng từ dễ nhầm cùng loại (冷凍 → 冷蔵): câu sai nghĩa nhưng vẫn đúng ngữ pháp
    const m = markOf(s.src);
    if (m && s.jp.includes(m)) {
      const conf = (s.src.confuse || []).map(id => D.items.get(id)).filter(Boolean);
      // cùng loại từ, cùng nhóm nhỏ (sub) trước; bỏ hậu tố một chữ (員, 間…) và mục bắt đầu bằng 〜
      const ok = x => x.pos === s.src.pos && !/^〜/.test(x.kana) && x.kana.length >= 2 && (x.kanji || x.kana).length >= (s.src.kanji || s.src.kana).length - 2;
      const near = shuffle(D.vocab.filter(x => ok(x) && x.topics.some(t => s.src.topics.includes(t))))
        .sort((a, b) => ((b.sub && b.sub === s.src.sub) - (a.sub && a.sub === s.src.sub)) || ((b.level === s.src.level) - (a.level === s.src.level)));
      for (const o of [...conf, ...near]) {
        if (o.id === s.src.id || alsoRight(s.src, o, 'vj') || (s.src.syn || []).includes(o.id) || (o.syn || []).includes(s.src.id) || !markOf(o)) continue;
        push(stripHL(s.jp).replace(m, markOf(o)));
        if (ds.length >= 2) break;
      }
    }
  }
  for (const x of [...shuffle(sibs(s)), ...pool]) { if (ds.length >= 3) break; if (x.dialog === s.dialog) push(stripHL(x.jp)); }
  return ds.length >= 3 ? shuffle([right, ...ds.slice(0, 3)]).map((j, i) => opt(j === right ? 'ok' : 'x' + i, rich(j))) : null;
}
const patHint = (s, hint) => (hint && s.kind === 'g' ? `<p class="prompt-hint">Dùng mẫu: <b lang="ja">${rich(s.src.pattern)}</b></p>` : '');
function vnChoice(s, pool, hint) {
  if (s.casual) return null;
  const opts = jaOpts(s, pool);
  if (!opts) return null;
  return { kind: 'choice', tag: tagOf(s, 'Việt → Nhật'), level: s.level, prompt: `<p class="prompt-vi">${esc(s.vi)}</p>${patHint(s, hint)}`, hint: 'Chọn câu tiếng Nhật đúng', opts, answer: 'ok', after: fullAfter(s), review: { id: s.id, dir: 'vn' } };
}
function nvType(s) {
  const jp = stripHL(s.jp);
  return { kind: 'type', tag: tagOf(s, 'Tự dịch Nhật → Việt'), level: s.level, prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(jp, true)}</p>`, hint: 'Gõ bản dịch tiếng Việt',
    lang: 'vi', romajiOff: true, placeholder: 'gõ tiếng Việt', judge: t => judgeVi(s.vi, t), answerHTML: esc(s.vi), after: srcNote(s), review: { id: s.id, dir: 'nv' } };
}
function vnType(s, hint) {
  if (s.dialog || s.casual) return null;
  return { kind: 'type', tag: tagOf(s, 'Tự dịch Việt → Nhật'), level: s.level, prompt: `<p class="prompt-vi">${esc(s.vi)}</p>${patHint(s, hint)}`, hint: 'Gõ câu tiếng Nhật (kana hoặc chữ Hán)',
    judge: t => judgeJa(s, t), answerHTML: rich(stripHL(s.jp)), after: srcNote(s), review: { id: s.id, dir: 'vn' } };
}
function vnOrder(s, hint) {
  const ch = Array.isArray(s.chunks) && s.chunks.length >= 3 ? s.chunks.map(stripHL) : exChunks({ jp: s.jp });
  if (!ch || ch.length < 3 || new Set(ch.map(plain)).size !== ch.length) return null;
  return { kind: 'order', tag: tagOf(s, 'Ghép mảnh Việt → Nhật'), level: s.level, prompt: `<p class="prompt-vi">${esc(s.vi)}</p>${patHint(s, hint)}`, hint: 'Ghép thành câu tiếng Nhật', chunks: ch.map(rich), after: fullAfter(s), review: { id: s.id, dir: 'vn' } };
}
export function sentQ(s, dir, how, pool, hint = true) {
  const q = dir === 'nv' ? (how === 'type' ? nvType(s) : how === 'listen' ? (ttsReady() ? nvChoice(s, pool, true) : null) : nvChoice(s, pool))
    : (how === 'type' ? vnType(s, hint) : how === 'order' ? vnOrder(s, hint) : vnChoice(s, pool, hint));
  return q && { ...q, sent: stripHL(s.jp), gram: s.kind === 'g' ? [s.src.id] : (s.gram || []), gloss: s.gloss, phr: s.phr, words: s.words };
}

// ---------- chọn câu và dựng lượt ----------
export function pickSentences(o) {
  const maxI = LEVELS.indexOf(o.level || 'N3');
  return sentences().filter(s => {
    if (o.srcIds) return o.srcIds.has(s.src.id) && (!o.learned || s.kind === 'd' || status(s.src) !== 'new');
    if (!(o.kinds || ['v', 'g']).includes(s.kind)) return false;
    if (LEVELS.indexOf(s.level) > maxI) return false;
    if (o.learned && s.kind !== 'd' && status(s.src) === 'new') return false;
    if (o.src === 'due') return dueDirs(s).length > 0;
    if (o.src === 'wrong') return errCount(s) > 0;
    if (isBookSrc(o.src)) return matchSrc(s.src.id, o.src);
    if (o.src === 'new') return !P.has(s.id);
    return true;
  });
}
export function buildDich(o) {
  const list = shuffle(pickSentences(o));
  const n = o.count || 10, out = [];
  const dirs = o.dir === 'mix' ? ['nv', 'vn'] : [o.dir];
  const hows = d => (o.how === 'mix' ? (d === 'nv' ? ['choice', 'type', ...(ttsReady() ? ['listen'] : [])] : ['choice', 'type', 'order']) : [o.how]);
  const pool = shuffle(sentences().filter(s => LEVELS.indexOf(s.level) <= LEVELS.indexOf(o.level || 'N3')));
  let k = 0;
  for (const s of list) {
    let d = dirs[k % dirs.length];
    if (o.src === 'due') { const dd = dueDirs(s); d = dd.includes(d) ? d : dd[0]; }
    const hs = hows(d), h = hs[Math.floor(Math.random() * hs.length)];
    const q = sentQ(s, d, h === 'listen' && d === 'vn' ? 'choice' : h === 'order' && d === 'nv' ? 'choice' : h, pool, o.hint !== false);
    if (q) { out.push(q); k++; }
    if (out.length >= n) break;
  }
  return out;
}
// Ôn hỗn hợp: vài câu dịch đến hạn (chọn câu)
export function dueSentQs(count = 5) {
  const pool = shuffle(sentences()).slice(0, 400);
  const out = [];
  for (const s of shuffle(sentDue())) { const q = sentQ(s, dueDirs(s)[0], 'choice', pool); if (q) out.push(q); if (out.length >= count) break; }
  return out;
}

// ---------- trang Luyện dịch ----------
const DIRS = [['nv', 'Nhật → Việt'], ['vn', 'Việt → Nhật'], ['mix', 'Trộn']];
const HOWS = [['choice', 'Chọn câu đúng'], ['type', 'Tự gõ'], ['listen', 'Nghe (Nhật → Việt)'], ['order', 'Ghép mảnh (Việt → Nhật)'], ['mix', 'Trộn']];
const SRCS = [['all', 'Tất cả'], ['new', 'Câu chưa dịch'], ['due', 'Đến hạn ôn'], ['wrong', 'Hay sai']];
export async function renderDich(view, ctx, preset) {
  const all = sentences();
  const done = all.filter(s => P.has(s.id)).length, due = sentDue().length, wrong = all.filter(s => errCount(s) > 0).length;
  const learnedLv = LEVELS.filter(L => D.vocab.some(v => v.level === L && status(v) !== 'new') || D.grammar.some(g => g.level === L && status(g) !== 'new'));
  const lvDef = learnedLv[learnedLv.length - 1] || 'N5';
  const o = { dir: 'mix', how: 'mix', kinds: ['v', 'g'], level: lvDef, learned: learnedLv.length > 0, src: 'all', hint: true, count: 10, ...(await kvGet('pDich', {})), ...(preset || {}) };
  const lv = LEVELS.filter(L => all.some(s => s.level === L));
  view.innerHTML = `<a class="back" href="#/luyen">Các dạng bài</a><h1 class="h1">Luyện dịch</h1>
    <p class="muted small">${all.length.toLocaleString('vi-VN')} câu ví dụ trong kho. Đã luyện ${done} câu · đến hạn ôn ${due} · hay sai ${wrong}. Câu dịch sai sẽ quay lại theo lịch ôn như từ vựng.</p>
    <form class="setup" onsubmit="return false">
      <fieldset><legend>Chiều dịch</legend>${chips('dir', DIRS, o.dir, false)}</fieldset>
      <fieldset><legend>Cách làm</legend>${chips('how', HOWS.filter(([h]) => h !== 'listen' || ttsReady()), o.how, false)}</fieldset>
      <fieldset><legend>Câu lấy từ</legend>${chips('kinds', [['v', 'Câu ví dụ của từ vựng'], ['g', 'Câu ví dụ ngữ pháp'], ...(all.some(s => s.kind === 'd') ? [['d', 'Câu hội thoại, bài đọc']] : [])], o.kinds)}</fieldset>
      <fieldset><legend>Đến cấp <small>(chỉ lấy câu từ cấp này trở xuống)</small></legend>${chips('level', lv.map(l => [l, l]), lv.includes(o.level) ? o.level : lv[lv.length - 1], false)}</fieldset>
      <fieldset><legend>Ôn lại</legend>${chips('src', [...SRCS.map(([k, l]) => [k, l, k === 'due' ? due : k === 'wrong' ? wrong : undefined]), ...bookSourceOpts([...D.vocab, ...D.grammar]).map(([k, l]) => [k, l])], o.src, false)}</fieldset>
      <label class="check"><input type="checkbox" data-o="learned" ${o.learned ? 'checked' : ''}> Chỉ câu của từ / mẫu ngữ pháp đã học</label>
      <label class="check"><input type="checkbox" data-o="hint" ${o.hint ? 'checked' : ''}> Việt → Nhật: cho biết mẫu ngữ pháp cần dùng (câu ngữ pháp)</label>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(n => [String(n), String(n)]), String(o.count), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>
    <details class="card dich-help"><summary class="h2">Cách chấm khi tự gõ</summary>
      <ul class="steps">
        <li><b>Nhật → Việt:</b> app so các từ chính của bản mẫu với bản dịch (không cần đúng từng chữ, gõ thiếu dấu vẫn nhận), tô đỏ từ còn thiếu; câu gốc phủ định mà bản dịch không phủ định (hoặc ngược lại) thì tính sai.</li>
        <li><b>Việt → Nhật:</b> so cả câu sau khi bỏ dấu câu, khoảng trắng; gõ kana thay chữ Hán được, trợ từ は/へ/を gõ "wa"/"e"/"o" cũng được; câu có mảnh đổi chỗ được thì mọi thứ tự đúng đều nhận.</li>
        <li>App chấm bằng so khớp, không dùng AI — dịch đúng nghĩa mà khác cách nói thì bấm <b>Tôi dịch đúng</b>.</li>
      </ul></details>`;
  const f = view.querySelector('.setup');
  const read = () => ({ dir: readChip(f, 'dir'), how: readChip(f, 'how'), kinds: readChips(f, 'kinds'), level: readChip(f, 'level'), src: readChip(f, 'src'),
    learned: f.querySelector('[data-o=learned]').checked, hint: f.querySelector('[data-o=hint]').checked, count: +readChip(f, 'count') });
  const upd = () => {
    const x = read(), n = pickSentences(x).length;
    f.querySelector('.setup-count').textContent = n ? `Có ${n} câu phù hợp.` : x.src === 'due' ? 'Không có câu nào đến hạn ôn.' : x.learned ? 'Chưa có câu nào — bỏ chọn "Chỉ câu của từ đã học" hoặc học thêm từ.' : 'Chưa có câu nào cho lựa chọn này.';
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd);
  f.querySelectorAll('[data-o]').forEach(c => c.onchange = upd);
  upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = read(); await kvSet('pDich', x);
    const qs = buildDich(x);
    if (!qs.length) { f.querySelector('.setup-count').textContent = 'Chưa dựng được câu hỏi nào — đổi cách làm hoặc cấp.'; return; }
    ctx.backTo = '#/dich';
    runDrill(view, qs, ctx, { title: 'Luyện dịch', again: () => ctx.go('#/dich', true) });
  };
}
