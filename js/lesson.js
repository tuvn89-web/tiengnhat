// Lộ trình theo BÀI HỌC (Đ9) · ôn bài cũ 1–3–7–14 ngày, viết 3 câu, tình huống thật, bảng "Nói được gì" (Đ12).
// Cấp có gói bài học (`type: lesson`) thì dùng gói đó; chưa có thì app tự chia bài từ các gói đang có:
// bài thứ i = gói ngữ pháp thứ i + một khúc từ JLPT theo thứ tự (khúc cố định cho từng cấp, thêm từ mới không xáo bài cũ).
import { esc, rich, plain, wordHTML, shuffle, icon, toast, DAY, startOfDay, kanjiChars, rubyHTML, stripHL, reading, fmtDate } from './util.js';
import { loadingHTML } from './lazy.js';
import { D, LEVELS, saveLesson, logAct } from './data.js';
import { status, stats } from './srs.js';
import { S } from './settings.js';
import { emptyState, bindSay, sayBtn } from './ui.js';
import { practiceItems } from './notes.js';
import { heartBtnHTML, heartCount, toggleHeart, hearted, clearHearts, runHeart } from './heart.js';
import { runDrill, opt } from './drill.js';
import { buildPoolQs, buildPoolQsAsync } from './level.js';
import { answerExplainHTML } from './explain.js';
import { passageHTML, bindPassage, viToggleHTML, bindViToggle } from './reader.js';
import { attachRomaji, romajiToKana } from './romaji.js';
import { ttsReady } from './tts.js';
import { goBack, crumbHTML, resultNavHTML, bindResultNav, beginSession } from './nav.js';

export const STEPS = [['words', 'Từ mới'], ['rel', 'Từ liên quan'], ['kanji', 'Chữ Hán'], ['gram', 'Ngữ pháp'], ['pw', 'Luyện từ'], ['ps', 'Luyện câu'], ['read', 'Đọc & hội thoại'], ['test', 'Kiểm tra cuối bài']];
const SHORT = ['Từ mới', 'Liên quan', 'Chữ Hán', 'Ngữ pháp', 'Luyện từ', 'Luyện câu', 'Đọc', 'Kiểm tra']; // nhãn tab
export const PASS = 80;               // % đạt bài kiểm tra cuối bài
export const REV = [1, 3, 7, 14];     // ôn bài cũ: số ngày sau khi xong bài
const W_PER = { N5: 35, N4: 26, N3: 35, N2: 30, N1: 30 };
const pad = n => String(n).padStart(2, '0');
const num = id => +(String(id).match(/(\d+)$/) || [0, 0])[1];
const sub = t => String(t || '').split(/\s+[–-]\s+/).slice(1).join(' – ') || String(t || '');

// ---------- danh sách bài ----------
let _cache = null, _ck = '';
export function allLessons() {
  const key = `${D.items.size}:${D.lesson.length}:${D.packs.length}:${D.disabled.t || 0}`;
  if (_cache && _ck === key) return _cache;
  const out = [];
  for (const L of LEVELS) {
    const real = D.lesson.filter(l => l.level === L).sort((a, b) => (a.order || 0) - (b.order || 0));
    const list = real.length ? real.map(l => fromPack(l)) : autoLessons(L);
    list.forEach((x, i) => { x.n = i + 1; x.total = list.length; });
    out.push(...list);
  }
  out.forEach((x, i) => { x.idx = i; });
  _cache = out; _ck = key;
  return out;
}
const has = id => D.items.has(id);
function fromPack(l) {
  return {
    id: l.id, level: l.level, title: l.title || `Bài ${l.order}`, goal: l.goal || '', topics: l.topics || [],
    grammar: (l.grammar || []).filter(has), words: (l.words || []).filter(id => D.items.get(id)?._type === 'vocab'),
    kanji: (l.kanji || []).filter(c => D.kanjiByChar.has(c)), texts: (l.texts || []).filter(has), auto: false,
  };
}
function autoLessons(L) {
  const off = new Set(D.disabled.list || []);
  const gp = D.packs.filter(p => p.type === 'grammar' && p.level === L && !off.has(p.id)).sort((a, b) => num(a.id) - num(b.id));
  const vp = D.packs.filter(p => p.type === 'vocab' && p.level === L && /^jlpt-/.test(p.id) && !off.has(p.id)).sort((a, b) => num(a.id) - num(b.id));
  const seen = new Set(), words = [], packOf = new Map();
  for (const p of vp) for (const x of p.items) { const it = D.items.get(x.id); if (it?._type === 'vocab' && !seen.has(x.id)) { seen.add(x.id); words.push(x.id); packOf.set(x.id, p); } }
  const W = W_PER[L] || 30, n = Math.max(gp.length, Math.ceil(words.length / W));
  const usedK = new Set(), out = [];
  for (let i = 0; i < n; i++) {
    const g = gp[i] ? gp[i].items.map(x => x.id).filter(has) : [];
    const ws = words.slice(i * W, (i + 1) * W);
    const ks = [];
    for (const id of ws) for (const c of kanjiChars(D.items.get(id).kanji)) if (D.kanjiByChar.has(c) && !usedK.has(c) && ks.length < 6) { usedK.add(c); ks.push(c); }
    const wt = [...new Set(ws.map(id => sub(packOf.get(id).title)))].slice(0, 2).join(' · ');
    const gt = gp[i] ? sub(gp[i].title) : '';
    if (!ws.length && !g.length) continue;
    out.push({
      id: `a:${L.toLowerCase()}-${pad(i + 1)}`, level: L, title: gt || wt || `Bài ${i + 1}`, wtitle: wt,
      goal: g.length ? `Dùng được ${g.map(id => plain(D.items.get(id).pattern)).join(', ')}${wt ? ' — từ vựng: ' + wt.toLowerCase() : ''}` : `Thêm ${ws.length} từ: ${wt.toLowerCase()}`,
      topics: [], grammar: g, words: ws, kanji: ks, texts: [], auto: true,
    });
  }
  return out;
}
export const lessonsOf = L => allLessons().filter(x => x.level === L);
export const lessonById = id => allLessons().find(x => x.id === id);
globalThis.__lessonById = lessonById;
const items = ids => ids.map(id => D.items.get(id)).filter(Boolean);
export const lessonPool = x => ({ vocab: items(x.words), grammar: items(x.grammar), kanji: x.kanji.map(c => D.kanjiByChar.get(c)).filter(Boolean) });

// ---------- tiến độ ----------
export function lessonState(x) {
  const rec = D.lessons[x.id] || {}, st = rec.steps || {};
  const p = lessonPool(x);
  const notNew = l => l.every(it => status(it) !== 'new');
  const textsDone = x.texts.length ? x.texts.every(t => D.lessons[t]?.done) : !!st.read;
  const flags = [
    notNew(p.vocab), !!st.rel || !hasRelated(x), notNew(p.kanji), notNew(p.grammar),
    !!st.pw, !!st.ps, textsDone, (rec.test?.best || 0) >= PASS,
  ];
  const nDone = flags.filter(Boolean).length;
  return { rec, flags, nDone, next: flags.findIndex(f => !f), done: !!rec.done || flags[7], p };
}
export const isDone = x => !!D.lessons[x.id]?.done || (D.lessons[x.id]?.test?.best || 0) >= PASS;
// Bài đang học: bài đầu tiên chưa xong của cấp L (không có L: của cả lộ trình)
export function currentLesson(L) {
  const list = L ? lessonsOf(L) : allLessons();
  return list.find(x => !isDone(x)) || null;
}
// Bài đã xong đến lịch ôn lại (1, 3, 7, 14 ngày)
export function reviewDue(x) {
  const r = D.lessons[x.id];
  if (!r?.done) return null;
  const k = (r.rev || []).length;
  if (k >= REV.length) return null;
  const due = startOfDay(r.done) + REV[k] * DAY;
  return due <= Date.now() ? { k, due } : null;
}
export const dueReviews = () => allLessons().filter(x => reviewDue(x));

// ---------- từ liên quan (bước 2) ----------
const REL = { pair: 'cặp tự – tha', ant: 'trái nghĩa', syn: 'đồng nghĩa', confuse: 'dễ nhầm', rel: 'cùng gốc' };
// v39: chỉ mục chữ Hán → các từ có chữ đó (dựng một lần) — trước đây mỗi chữ quét lại cả 5.000 từ, mở Lộ trình mất vài giây
let _kIdx = null, _kKey = '';
function wordsWithChar(c) {
  const key = `${D.items.size}:${D.vocab.length}`;
  if (!_kIdx || _kKey !== key) {
    _kIdx = new Map(); _kKey = key;
    for (const o of D.vocab) for (const ch of new Set(kanjiChars(o.kanji))) { let a = _kIdx.get(ch); if (!a) _kIdx.set(ch, a = []); a.push(o); }
  }
  return _kIdx.get(c) || [];
}
// Bước "Từ liên quan" có gì để học không — dừng ngay khi thấy một từ (Lộ trình gọi cho mọi bài)
function hasRelated(x) {
  const own = new Set(x.words), ok = id => id && D.items.get(id)?._type === 'vocab' && !own.has(id);
  const ws = items(x.words);
  for (const w of ws) for (const k of Object.keys(REL)) for (const r of [].concat(w[k] || [])) if (typeof r === 'string' && ok(r)) return true;
  for (const w of ws) for (const c of kanjiChars(w.kanji)) for (const o of wordsWithChar(c)) if (o.id !== w.id && !own.has(o.id) && status(o) !== 'new') return true;
  return false;
}
// v39: tính sẵn lúc rảnh (app.js warmUp): chỉ mục chữ Hán và trạng thái các bài của cấp đang học
export function warmLessons() {
  wordsWithChar('');
  const cur = currentLesson();
  if (cur) for (const x of lessonsOf(cur.level)) lessonState(x);
}
export function relatedWords(x) {
  const own = new Set(x.words), out = new Map();
  const add = (id, why) => { const it = D.items.get(id); if (it?._type === 'vocab' && !own.has(id) && !out.has(id)) out.set(id, { it, why }); };
  const ws = items(x.words);
  for (const w of ws) {
    const sw = w.kanji || w.kana;
    for (const k of Object.keys(REL)) for (const r of [].concat(w[k] || [])) if (typeof r === 'string') add(r, `${REL[k]} với ${sw}`);
  }
  // từ đã học có chung chữ Hán
  for (const w of ws) for (const c of kanjiChars(w.kanji)) {
    let n = 0;
    for (const o of wordsWithChar(c)) { if (n >= 2) break; if (o.id !== w.id && status(o) !== 'new' && !own.has(o.id) && !out.has(o.id)) { add(o.id, `chung chữ ${c} với ${w.kanji}`); n++; } }
  }
  return [...out.values()].slice(0, 40);
}

// ---------- HTML dùng chung ----------
export function stepsBarHTML(s) {
  return `<ol class="lsteps" aria-label="Tiến độ ${s.nDone}/8 bước">${STEPS.map(([, l], i) => `<li class="${s.flags[i] ? 'is-done' : i === s.next ? 'is-next' : ''}" title="${esc(l)}"><span>${s.flags[i] ? '✓' : i + 1}</span></li>`).join('')}</ol>`;
}
export function lessonRowHTML(x, cur) {
  const s = lessonState(x), due = reviewDue(x);
  const cls = s.done ? 'is-done' : x === cur ? 'is-cur' : '';
  return `<li class="ls ${cls}"><a href="#/bai/${encodeURIComponent(x.id)}"><span class="ls-n">${s.done ? '✓' : x.n}</span>
    <span class="ls-t"><b>${rich(x.title)}</b><small>${rich(x.goal)}</small></span>
    <span class="ls-p">${due ? '<span class="ls-due">Ôn lại</span>' : s.done ? '' : `${s.nDone}/8`}</span></a></li>`;
}
// v40: từng dòng của danh sách bài (để Lộ trình ghép dần từng mẻ)
export function lessonRowsOf(L) {
  const list = lessonsOf(L), cur = currentLesson(L);
  return { list, cur, row: x => lessonRowHTML(x, cur) + (x.n % 5 === 0 ? thRowHTML(x) : '') };
}
// Danh sách bài của một cấp, kèm mục "Tình huống thật" sau mỗi 5 bài
export function lessonListHTML(L, { limit } = {}) {
  const list = lessonsOf(L), cur = currentLesson(L);
  if (!list.length) return '';
  let rows = list.map(x => lessonRowHTML(x, cur) + (x.n % 5 === 0 ? thRowHTML(x) : ''));
  if (limit && cur) { const i = list.indexOf(cur); rows = rows.slice(Math.max(0, i - 1), i - 1 + limit); }
  return `<ol class="lessons">${rows.join('')}</ol>`;
}
function thRowHTML(x) {
  const d = realDialog(x), r = D.lessons[x.id]?.th;
  const from = x.n - 4;
  return `<li class="ls ls-th${r?.ok ? ' is-done' : ''}"><a href="${d ? `#/doc/${encodeURIComponent(d.id)}` : `#/tonghop/${encodeURIComponent(x.id)}`}"><span class="ls-n">${icon('chat')}</span>
    <span class="ls-t"><b>Tình huống thật · bài ${from}–${x.n}</b><small>${d ? rich(d.title) : 'Ôn tổng hợp 20 câu từ 5 bài vừa học'}</small></span><span class="ls-p">${r?.ok ? '✓' : ''}</span></a></li>`;
}
const realDialog = x => D.dialog.find(d => d.tonghop && d.lesson === x.id);

// Thẻ "Bài đang học" (Trang chủ, Lộ trình)
export function lessonCardHTML(x) {
  if (!x) return '';
  const s = lessonState(x), nx = s.next >= 0 ? s.next : 7;
  return `<div class="lcard"><p class="small muted">Bài đang học · ${esc(x.level)} bài ${x.n}/${x.total}</p>
    <p class="lcard-t"><b>${rich(x.title)}</b></p>
    ${x.goal ? `<p class="small lcard-g">🎯 ${rich(x.goal)}</p>` : ''}
    ${stepsBarHTML(s)}
    <a class="btn btn-primary btn-sm" href="#/bai/${encodeURIComponent(x.id)}?b=${nx + 1}">${s.nDone ? 'Học tiếp' : 'Bắt đầu'}: ${esc(STEPS[nx][1])}</a></div>`;
}

// ---------- trang bài học ----------
export function renderLesson(view, ctx, id, openStep) {
  const x = lessonById(id);
  if (!x) { view.innerHTML = emptyState('Không có bài này (có thể gói dữ liệu đã đổi).', '<a class="btn btn-ghost" href="#/lotrinh">Về Lộ trình</a>'); return; }
  const s = lessonState(x), p = s.p;
  const list = lessonsOf(x.level), prev = list[x.n - 2], next = list[x.n];
  const rel = relatedWords(x);
  const sv = stats(p.vocab), sk = stats(p.kanji), sg = stats(p.grammar);
  const here = '#/bai/' + encodeURIComponent(x.id);
  const wRow = it => `<li><button type="button" class="row" data-wopen="${esc(it.id)}"><span class="row-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="row-vi">${esc(it.vi)}</span><span class="dot dot-${status(it)}"></span></button>${heartBtnHTML(x.id, it.id)}</li>`;
  // v47: trang bài chia tab — 0 Mở đầu · 1–8 tám bước · 9 Viết 3 câu; tab nằm trên địa chỉ (?b=N)
  const panel = (k, cls, inner) => `<section class="card ${cls} lpanel" id="b${k}" data-ltab="${k}" role="tabpanel" aria-labelledby="lt-${k}"${k === cur ? '' : ' hidden'}>${inner}</section>`;
  const step = (i, body, extra = '') => panel(i + 1, `lstep${s.flags[i] ? ' is-done' : ''}`,
    `<h2 class="lstep-hd"><span class="lstep-n">${s.flags[i] ? '✓' : i + 1}</span><span class="lstep-t">${esc(STEPS[i][1])}${extra ? ` <small class="muted">${extra}</small>` : ''}</span></h2><div class="lstep-b">${body}</div>`);
  const nH = heartCount(x.id);
  const heartTip = `<p class="small muted heart-tip">Bấm ${icon('heart')} ở từ muốn luyện thêm (từ 2 từ trở lên), rồi bấm "Luyện từ đã tim". Tim chỉ giữ khi còn ở bài này.</p>`;
  const heartBar = () => `<div class="row-btns heart-bar"><button type="button" class="btn btn-ghost" data-p="heart" ${nH < 2 ? 'disabled' : ''}>${icon('heart')} Luyện từ đã tim${nH ? ` (${nH})` : ''}</button><button type="button" class="btn btn-ghost" data-p="unheart" ${nH ? '' : 'disabled'}>Bỏ tim tất cả</button></div>`;
  const due = reviewDue(x), rec = s.rec;
  const all = x.texts.map(t => D.items.get(t)).filter(Boolean);
  const intro = all.find(t => t.intro), texts = all.filter(t => t !== intro);
  const introDone = intro && D.lessons[intro.id]?.done;
  const tabs = [...(intro ? [[0, 'Mở đầu', introDone, icon(intro._type === 'dialog' ? 'chat' : 'book')]] : []), ...STEPS.map((st, i) => [i + 1, SHORT[i], s.flags[i], i + 1]), [9, 'Viết', (rec.writes || []).length >= 3, icon('pen')]];
  const has = k => tabs.some(t => t[0] === k);
  const cur = openStep != null && has(+openStep) ? +openStep : intro && !introDone ? 0 : s.next >= 0 ? s.next + 1 : 8;
  view.innerHTML = `<a class="back" href="#/lotrinh">Lộ trình</a>
    <p class="small muted">Chặng ${esc(x.level)} · Bài ${x.n}/${x.total}${x.auto ? ' · app tự chia từ gói dữ liệu' : ''}</p>
    <h1 class="h1">${rich(x.title)}</h1>
    ${x.goal ? `<p class="lgoal">🎯 <b>Sau bài này:</b> ${rich(x.goal)}</p>` : ''}
    <p class="small muted">${s.done ? `Đã xong bài${rec.done ? ' ngày ' + fmtDate(rec.done) : ''}.` : `${s.nDone}/8 bước. Bài có ✓ khi bài kiểm tra cuối bài đạt từ ${PASS}%.`}</p>
    ${due ? `<div class="note"><b>Đến lịch ôn bài này</b> (lần ${due.k + 1}/4). <a class="btn btn-primary btn-sm" href="#/onbai/${encodeURIComponent(x.id)}">Ôn 10 câu</a></div>` : ''}
    <div class="ltabs" role="tablist" aria-label="Các phần của bài">${tabs.map(([k, l, ok, n]) => `<button type="button" class="ltab${ok ? ' is-done' : ''}${k >= 1 && k <= 8 && k - 1 === s.next ? ' is-next' : ''}" role="tab" id="lt-${k}" data-lt="${k}" aria-controls="b${k}" aria-selected="${k === cur}"><span class="lt-n">${ok ? '✓' : n}</span><span class="lt-l">${l}</span></button>`).join('')}</div>
    ${intro ? panel(0, 'lintro', `
      <h2 class="h2 lintro-h">${icon(intro._type === 'dialog' ? 'chat' : 'book')} Bài mở đầu: ${esc(intro.title)}${introDone ? ' <small class="muted">· đã đọc ✓</small>' : ''}</h2>
      ${intro.setting ? `<p class="doc-set">${rich(intro.setting)}</p>` : ''}
      <div class="row-btns wrap lintro-t">${viToggleHTML(true)}<span class="small muted">Chạm vào câu để xem nghĩa từng từ, cụm từ, ngữ pháp.</span></div>
      ${passageHTML(intro)}
      <div class="row-btns wrap"><a class="btn btn-ghost" href="#/doc/${encodeURIComponent(intro.id)}?m=hoi">Câu hỏi hiểu bài</a>${ttsReady() ? `<a class="btn btn-ghost" href="#/doc/${encodeURIComponent(intro.id)}?m=nghe">Nghe cả bài</a>` : ''}<a class="btn btn-ghost" href="#/doc/${encodeURIComponent(intro.id)}?m=dich">Dịch từng câu</a>${introDone ? '' : '<button type="button" class="btn btn-primary" data-p="introok">Đã đọc xong</button>'}</div>
    `) : ''}

    ${step(0, `${sv.new ? `<div class="row-btns"><a class="btn btn-primary" href="${here}/hoc">Học ${Math.min(sv.new, S.qCount)} từ mới</a></div>` : '<p class="small">Đã học hết từ mới của bài.</p>'}
      ${heartTip}<ul class="rows lrows">${p.vocab.map(wRow).join('')}</ul>${heartBar()}`, `${sv.total - sv.new}/${sv.total}`)}

    ${step(1, rel.length ? `<p class="small muted">Từ có liên quan tới từ mới: cặp tự – tha, trái nghĩa, đồng nghĩa, dễ nhầm, chung chữ Hán.</p>
      <ul class="rows lrows">${rel.map(({ it, why }) => `<li><button type="button" class="row" data-wopen="${esc(it.id)}"><span class="row-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="row-vi">${esc(it.vi)}<small class="muted lrel"> · ${rich(why)}</small></span></button></li>`).join('')}</ul>
      <div class="row-btns wrap">${rel.length >= 4 ? '<button class="btn btn-ghost" data-p="relquiz">Trắc nghiệm từ liên quan</button>' : ''}<button class="btn btn-ghost" data-p="relok">Đã xem xong</button></div>` : '<p class="small">Chưa có từ liên quan cho bài này.</p>', rel.length ? `${rel.length} từ` : '')}

    ${step(2, p.kanji.length ? `<div class="lkanji">${p.kanji.map(k => `<button type="button" class="lk" data-kopen="${esc(k.char)}" data-bare><span lang="ja">${esc(k.char)}</span><small>${esc(k.hv)}</small><span class="dot dot-${status(k)}"></span></button>`).join('')}</div>
      <div class="row-btns"><button class="btn btn-ghost" data-p="kanji">Ôn ${p.kanji.length} chữ của bài</button></div>` : '<p class="small">Bài này chưa có thẻ chữ Hán.</p>', p.kanji.length ? `${sk.total - sk.new}/${sk.total}` : '')}

    ${step(3, p.grammar.length ? `<ul class="rows lrows">${p.grammar.map(g => `<li><a class="row" href="#/nguphap/${encodeURIComponent(g.id)}"><span class="row-jp" lang="ja">${rich(g.pattern)}</span><span class="row-vi">${rich(g.meaning || '')}</span><span class="dot dot-${status(g)}"></span></a></li>`).join('')}</ul>
      <p class="small muted">Bấm vào mẫu để học bài giảng (mẫu được tính là đã học khi luyện mẫu đó).</p>
      <div class="row-btns"><button class="btn btn-ghost" data-p="gram">Luyện ${p.grammar.length} mẫu của bài</button></div>` : '<p class="small">Bài này không có mẫu ngữ pháp mới.</p>', p.grammar.length ? `${sg.total - sg.new}/${sg.total}` : '')}

    ${step(4, `<p class="small muted">Chỉ dùng từ của bài.</p>
      <div class="row-btns wrap"><button class="btn btn-primary" data-p="quiz">Trắc nghiệm 4 chiều</button>${p.vocab.length >= 3 ? '<button class="btn btn-ghost" data-p="match">Ghép cặp</button>' : ''}<button class="btn btn-ghost" data-p="type">Gõ từ</button></div>`)}

    ${step(5, `<p class="small muted">Câu ví dụ của từ và mẫu trong bài.</p>
      <div class="row-btns wrap"><button class="btn btn-primary" data-p="cau">Ghép câu</button>${p.vocab.some(it => ['v1', 'v5', 'v3'].includes(it.pos)) ? '<button class="btn btn-ghost" data-p="the">Thể động từ trong câu</button>' : ''}<button class="btn btn-ghost" data-p="dich">Dịch Việt ↔ Nhật</button></div>`)}

    ${step(6, texts.length ? `<ul class="rows lrows">${texts.map(t => `<li><a class="row" href="#/doc/${encodeURIComponent(t.id)}"><span class="row-jp">${icon(t._type === 'dialog' ? 'chat' : 'book')} <b>${esc(t.title)}</b></span><span class="row-vi small">${esc(t._type === 'dialog' ? 'Hội thoại' : 'Bài đọc')}${D.lessons[t.id]?.done ? ' · ✓' : ''}</span></a></li>`).join('')}</ul>`
      : intro ? `<p class="small">Bài đọc chính của bài này là <a href="${here}?b=0" data-goto="0">bài mở đầu</a> (tab Mở đầu). Làm thêm: nghe và hiểu câu ví dụ của bài.</p>
      <div class="row-btns wrap"><a class="btn btn-ghost" href="${here}/cau">Đọc câu của bài</a><button class="btn btn-primary" data-p="hieu">Nghe – hiểu 10 câu</button></div>`
      : `<p class="small muted">Bài đọc / hội thoại cho bài này đang được soạn. Trong lúc chờ: đọc và nghe các câu ví dụ của bài.</p>
      <div class="row-btns wrap"><a class="btn btn-ghost" href="${here}/cau">Đọc câu của bài</a><button class="btn btn-primary" data-p="hieu">Nghe – hiểu 10 câu</button></div>`)}

    ${step(7, `<p>15 câu: từ vựng, đọc chữ Hán, ngữ pháp, đọc hiểu${ttsReady() ? ', nghe' : ''}. Đạt từ <b>${PASS}%</b> thì bài có ✓.</p>
      ${rec.test ? `<p class="small">Lần gần nhất: <b>${rec.test.pct}%</b> (${fmtDate(rec.test.t)}) · cao nhất ${rec.test.best}%</p>` : ''}
      <div class="row-btns"><a class="btn btn-primary" href="${here}/kiemtra">Làm bài kiểm tra</a></div>`)}

    ${panel(9, 'lwrite', `<h2 class="h2">${icon('pen')} Viết 3 câu${(rec.writes || []).length ? ` <small class="muted">· đã viết ${(rec.writes || []).length}</small>` : ''}</h2>${writeHTML(x)}`)}
    ${rec.done ? `<p class="small muted">Ôn bài cũ: ${REV.map((d, i) => `${(rec.rev || [])[i] ? '✓' : '·'} sau ${d} ngày`).join(' · ')}</p>` : ''}
    <div class="row-btns lnav">${prev ? `<a class="btn btn-ghost" href="#/bai/${encodeURIComponent(prev.id)}">← Bài ${prev.n}</a>` : '<span></span>'}${next ? `<a class="btn btn-ghost" href="#/bai/${encodeURIComponent(next.id)}">Bài ${next.n} →</a>` : ''}</div>`;
  bindSay(view);
  const tabBar = view.querySelector('.ltabs');
  const show = k => {
    view.querySelectorAll('[data-lt]').forEach(b => b.setAttribute('aria-selected', String(+b.dataset.lt === k)));
    view.querySelectorAll('section[data-ltab]').forEach(sx => { sx.hidden = +sx.dataset.ltab !== k; });
    try { history.replaceState(history.state, '', `${here}?b=${k}`); } catch { }
    if (tabBar.getBoundingClientRect().top < 0) tabBar.scrollIntoView({ block: 'start' });
  };
  tabBar.addEventListener('click', e => { const b = e.target.closest('[data-lt]'); if (b) show(+b.dataset.lt); });
  tabBar.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const bs = [...tabBar.querySelectorAll('[data-lt]')], i = bs.indexOf(document.activeElement); if (i < 0) return;
    const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; n.focus(); show(+n.dataset.lt); e.preventDefault();
  });
  view.querySelector('[data-goto]')?.addEventListener('click', e => { e.preventDefault(); show(+e.currentTarget.dataset.goto); });
  bindWrite(view, x, ctx);
  if (intro) { bindPassage(view.querySelector('.lintro'), intro); bindViToggle(view.querySelector('.lintro')); }
  const heartSync = () => { // cập nhật nút "Luyện từ đã tim" mà không vẽ lại trang
    const n = heartCount(x.id), hb = view.querySelector('[data-p=heart]'), ub = view.querySelector('[data-p=unheart]');
    if (hb) { hb.disabled = n < 2; hb.innerHTML = `${icon('heart')} Luyện từ đã tim${n ? ` (${n})` : ''}`; }
    if (ub) ub.disabled = !n;
  };
  view.onclick = async e => {
    const hbtn = e.target.closest('[data-heart]');
    if (hbtn) {
      const on = toggleHeart(x.id, hbtn.dataset.heart);
      hbtn.setAttribute('aria-pressed', on); hbtn.setAttribute('aria-label', on ? 'Bỏ tim' : 'Thả tim');
      return heartSync();
    }
    const b = e.target.closest('[data-p]');
    if (!b) return;
    const k = b.dataset.p;
    if (k === 'unheart') { clearHearts(); view.querySelectorAll('[data-heart]').forEach(h => { h.setAttribute('aria-pressed', 'false'); h.setAttribute('aria-label', 'Thả tim'); }); return heartSync(); }
    if (k !== 'relok' && k !== 'introok') view.onclick = null; // trang chuyển sang lượt luyện
    if (k !== 'heart' && k !== 'relok' && k !== 'introok') clearHearts(); // sang bài luyện khác của bài: bỏ tim
    const vocab = p.vocab;
    ctx.backTo = here + (b.closest('.lpanel') ? '?b=' + b.closest('.lpanel').dataset.ltab : '');
    const again = () => ctx.go(ctx.backTo, true);
    const mark = key => () => { logAct('lesson'); return saveLesson(x.id, { steps: { ...(D.lessons[x.id]?.steps || {}), [key]: Date.now() } }); };
    if (k === 'introok') { await saveLesson(intro.id, { done: Date.now(), read: true }); logAct('lesson'); ctx.sessionDone?.(); toast('Đã đọc xong bài mở đầu.'); return renderLesson(view, ctx, id, 1); }
    if (k === 'relok') { await mark('rel')(); ctx.sessionDone?.(); toast('Đã xong bước Từ liên quan.'); return renderLesson(view, ctx, id, 3); }
    if (k === 'heart') {
      const items = p.vocab.filter(it => hearted(x.id, it.id));
      if (items.length < 2) return;
      // luyện từ đã tim: có từ của bài nên tính là xong bước "Luyện từ" khi làm đúng ít nhất một câu
      return runHeart(view, ctx, items, p.vocab, { onDone: async st => { if (st.ok) { await mark('pw')(); ctx.sessionDone?.(); } } });
    }
    if (k === 'relquiz') return practiceItems(view, ctx, 'quiz', { vocab: rel.map(r => r.it), kanji: [], grammar: [] }, { title: 'Từ liên quan', again, onDone: mark('rel') });
    if (k === 'kanji') return practiceItems(view, ctx, 'kanji', p, { title: 'Chữ Hán của bài', again });
    if (k === 'gram') return practiceItems(view, ctx, 'gram', p, { title: 'Ngữ pháp của bài', again });
    if (k === 'quiz' || k === 'match') return practiceItems(view, ctx, k, { ...p, vocab }, { title: 'Luyện từ của bài', again, onDone: mark('pw') });
    if (k === 'type') return runDrill(view, typeQs(vocab), ctx, { title: 'Gõ từ của bài', again, onDone: mark('pw') });
    if (k === 'cau') { const { buildCau } = await import('./practice.js'); return runDrill(view, buildCau({ items: vocab, count: 10 }), ctx, { title: 'Ghép câu của bài', again, onDone: mark('ps') }); }
    if (k === 'the') { const { buildThe } = await import('./practice.js'); return runDrill(view, buildThe({ items: vocab, count: 10, qt: 'mix' }), ctx, { title: 'Thể động từ của bài', again, onDone: mark('ps') }); }
    if (k === 'dich') return practiceItems(view, ctx, 'dich', { ...p, vocab }, { title: 'Câu của bài', again, onDone: mark('ps') });
    if (k === 'hieu') {
      const { buildDich } = await import('./dich.js');
      const qs = buildDich({ dir: 'nv', how: ttsReady() ? 'mix' : 'choice', level: 'N1', srcIds: new Set([...x.words, ...x.grammar]), count: 10 }).filter(q => q.kind === 'choice');
      return runDrill(view, qs, ctx, { title: 'Nghe – hiểu câu của bài', again, onDone: mark('read') });
    }
  };
}
// Gõ từ: nhìn nghĩa tiếng Việt → gõ cách đọc (kana hoặc chữ Hán)
function typeQs(vocab) {
  return shuffle([...vocab]).slice(0, 15).map(it => ({
    kind: 'type', tag: 'Gõ từ', level: it.level, prompt: `<p class="prompt-vi">${esc(it.vi)}</p>`, hint: 'Gõ từ tiếng Nhật (kana hoặc chữ Hán)',
    accept: [it.kana, it.kanji, it.kf && plain(it.kf)].filter(Boolean), answerHTML: wordHTML(it, 'furi'), say: it.kana, review: { id: it.id, dir: 'vj' },
  }));
}

// ---------- viết 3 câu ----------
function writePrompts(x) {
  const gs = items(x.grammar), ws = items(x.words).filter(w => status(w) !== 'new');
  const pick = () => shuffle([...ws]).slice(0, 3).map(w => wordHTML(w, 'furi')).join('、');
  const out = gs.slice(0, 3).map(g => ({ key: g.id, q: `Viết một câu dùng <b lang="ja">${rich(g.pattern)}</b> — ${rich(g.meaning || '')}`, frame: (g.structure || [])[0] || '', words: pick(), samples: shuffle((g.ex || []).filter(e => e.ctx !== 'hoithoai')).slice(0, 2) }));
  for (const w of shuffle(items(x.words)).filter(w => (w.ex || []).length)) {
    if (out.length >= 3) break;
    out.push({ key: w.id, q: `Viết một câu có từ <b lang="ja">${wordHTML(w, 'furi')}</b> — ${esc(w.vi)}`, frame: '', words: '', samples: (w.ex || []).slice(0, 2) });
  }
  return out;
}
function writeHTML(x) {
  const ps = writePrompts(x), saved = D.lessons[x.id]?.writes || [];
  if (!ps.length) return '<p class="small">Chưa có gợi ý cho bài này.</p>';
  return `<p class="small muted">Tự viết câu bằng từ và mẫu vừa học, rồi mở câu mẫu để tự so. Câu đã lưu đồng bộ sang máy khác.</p>
    ${ps.map((p, i) => { const sv = saved.find(w => w.k === p.key); return `<div class="wr" data-k="${esc(p.key)}">
      <p>${i + 1}. ${p.q}</p>${p.frame ? `<p class="small muted">Khung: <span lang="ja">${rich(p.frame)}</span></p>` : ''}${p.words ? `<p class="small muted">Gợi ý từ: <span lang="ja">${p.words}</span></p>` : ''}
      <textarea class="input" rows="2" lang="ja" placeholder="${S.romaji ? 'gõ romaji hoặc kana' : 'gõ tiếng Nhật'}">${esc(sv?.text || '')}</textarea>
      <div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-w="save">Lưu</button><button type="button" class="btn btn-ghost btn-sm" data-w="show">Xem câu mẫu</button></div>
      <div class="wr-s" hidden>${p.samples.map(e => `<p lang="ja" class="after-sent">${rubyHTML(stripHL(e.jp), true)} ${sayBtn(reading(stripHL(e.jp)))}</p><p class="small muted">${esc(e.vi)}</p>`).join('')}</div></div>`; }).join('')}`;
}
function bindWrite(view, x, ctx) {
  view.querySelectorAll('.wr textarea').forEach(t => attachRomaji(t, () => S.romaji));
  view.querySelectorAll('.wr').forEach(w => w.addEventListener('click', async e => {
    const a = e.target.closest('[data-w]')?.dataset.w;
    if (a === 'show') w.querySelector('.wr-s').hidden = !w.querySelector('.wr-s').hidden;
    if (a === 'save') {
      const t = w.querySelector('textarea'), text = (S.romaji ? romajiToKana(t.value, true) : t.value).trim();
      t.value = text;
      const list = (D.lessons[x.id]?.writes || []).filter(z => z.k !== w.dataset.k);
      if (text) list.push({ k: w.dataset.k, text, t: Date.now() });
      await saveLesson(x.id, { writes: list });
      ctx.sessionDone?.();
      toast(text ? 'Đã lưu câu.' : 'Đã xoá câu.');
    }
  }));
}

// ---------- học từ mới của bài ----------
export async function learnLesson(view, ctx, id) {
  const x = lessonById(id);
  if (!x) return ctx.go('#/lotrinh');
  const { runLearn } = await import('./learn.js');
  ctx.backTo = '#/bai/' + encodeURIComponent(id) + '?b=1';
  runLearn(view, items(x.words).filter(it => status(it) === 'new').slice(0, S.qCount), ctx, { again: () => ctx.go('#/bai/' + encodeURIComponent(id) + '/hoc', true) });
}
// Đọc câu ví dụ của bài (khi bài chưa có bài đọc / hội thoại)
export function renderLessonSents(view, ctx, id) {
  const x = lessonById(id);
  if (!x) return ctx.go('#/lotrinh');
  const p = lessonPool(x);
  const sents = [...p.grammar.flatMap(g => (g.ex || []).slice(0, 4).map(e => ({ e, src: rich(g.pattern) }))), ...p.vocab.flatMap(w => (w.ex || []).slice(0, 1).map(e => ({ e, src: wordHTML(w, 'furi') })))];
  view.innerHTML = `<a class="back" href="#/bai/${encodeURIComponent(id)}?b=7">Bài ${x.n}</a><h1 class="h1">Câu của bài ${x.n}</h1>
    <label class="check small"><input type="checkbox" data-o="vi"> Hiện tiếng Việt</label>
    <ol class="rd-sents">${sents.map(({ e, src }) => `<li><p lang="ja" class="rd-jp">${rubyHTML(stripHL(e.jp), true)} ${sayBtn(reading(stripHL(e.jp)))}</p><p class="rd-vi small" hidden>${esc(e.vi)} <span class="muted">· <span lang="ja">${src}</span></span></p></li>`).join('')}</ol>
    <div class="row-btns"><button class="btn btn-primary" data-act="ok">Đã đọc xong</button></div>`;
  bindSay(view);
  view.querySelector('[data-o=vi]').onchange = e => view.querySelectorAll('.rd-vi').forEach(v => { v.hidden = !e.target.checked; });
  view.querySelector('.rd-sents').onclick = e => { const li = e.target.closest('li'); if (li && !e.target.closest('[data-say]')) { const v = li.querySelector('.rd-vi'); v.hidden = !v.hidden; } };
  view.querySelector('[data-act=ok]').onclick = async () => {
    await saveLesson(x.id, { steps: { ...(D.lessons[x.id]?.steps || {}), read: Date.now() } });
    ctx.sessionDone?.(); ctx.go('#/bai/' + encodeURIComponent(id) + '?b=8');
  };
}

// ---------- kiểm tra cuối bài ----------
const TEST = { kr: 2, jv: 3, vj: 2, kh: 1, g: 5, read: 1, listen: 1 };
export async function runLessonTest(view, ctx, id) {
  const x = lessonById(id);
  if (!x) return ctx.go('#/lotrinh');
  const pool = lessonPool(x);
  view.innerHTML = `<div class="page-wait">${loadingHTML('Đang soạn đề…')}</div>`; // v40: soạn đề từng phần, không đứng hình
  const all = await buildPoolQsAsync(pool, x.grammar.length ? TEST : { ...TEST, g: 0, jv: 5, vj: 4, read: 2 }, x.level);
  if (!all) return;
  const qs = all.slice(0, 15);
  const here = '#/bai/' + encodeURIComponent(id);
  ctx.backTo = here + '?b=8';
  if (qs.length < 5) { view.innerHTML = emptyState('Bài này chưa đủ dữ liệu để ra đề kiểm tra.', `<a class="btn btn-ghost" href="${here}">Về bài</a>`); return; }
  runDrill(view, qs, ctx, { title: `Kiểm tra bài ${x.n}`, mode: 'test', onDone: async (res, info) => {
    if (info.empty) return goBack(ctx);
    const ok = res.filter(r => r.ok).length, pct = Math.round((ok / res.length) * 100);
    const old = D.lessons[x.id] || {};
    const best = Math.max(pct, old.test?.best || 0);
    const passed = pct >= PASS;
    const wrongIds = [...new Set(res.filter(r => !r.ok && r.q.review).map(r => r.q.review.id).filter(i => D.items.has(i)))];
    await saveLesson(x.id, { test: { pct, best, t: Date.now() }, ...(passed && !old.done ? { done: Date.now() } : {}) });
    ctx.sessionDone?.();
    const next = lessonsOf(x.level)[x.n];
    ctx.inRun = true;
    view.innerHTML = `<section class="result">${crumbHTML(ctx)}
      <h1 class="h1">${passed ? 'Đạt — xong bài!' : 'Chưa đạt'}</h1>
      <p class="result-score"><b>${pct}%</b><span> (${ok}/${res.length})</span></p>
      <p class="result-sub">${passed ? `Bài ${x.n} có ✓. App sẽ nhắc ôn lại sau 1, 3, 7, 14 ngày.` : `Cần từ ${PASS}%. Ôn lại các câu sai rồi làm lại.`}</p>
      ${res.filter(r => !r.ok).length ? `<h2 class="h2">Câu sai</h2><ul class="wlist wlist-drill">${res.filter(r => !r.ok).map(r => `<li><span class="muted small">${esc(r.q.tag || '')}</span><div class="wq">${r.q.prompt}</div><p>Đáp án: <b lang="ja">${r.q.opts.find(o => o.key === r.q.answer)?.html || ''}</b></p>${r.q.after || ''}${answerExplainHTML(r.q, { open: false })}</li>`).join('')}</ul>` : ''}
      <div class="row-btns stack">
        ${res.some(r => !r.ok) ? '<button class="btn btn-primary" data-act="redo">Luyện lại câu sai</button>' : ''}
        ${passed && next ? `<a class="btn ${res.some(r => !r.ok) ? 'btn-ghost' : 'btn-primary'}" href="#/bai/${encodeURIComponent(next.id)}" data-nav="go">Sang bài ${next.n} →</a>` : ''}
        ${!passed ? '<button class="btn btn-ghost" data-act="again">Làm đề mới</button>' : ''}
      </div>${resultNavHTML(ctx, { kind: 'test' })}</section>`;
    bindSay(view);
    bindResultNav(view, ctx, { kind: 'test' });
    const rd = view.querySelector('[data-act=redo]');
    if (rd) rd.onclick = () => runDrill(view, res.filter(r => !r.ok).map(r => ({ ...r.q, _again: false })), ctx, { title: `Luyện lại bài ${x.n}`, noReview: true, again: () => ctx.go(here + '/kiemtra', true) });
    const ag = view.querySelector('[data-act=again]');
    if (ag) ag.onclick = () => runLessonTest(view, ctx, id);
    window.scrollTo(0, 0);
  } });
}

// ---------- ôn bài cũ (1, 3, 7, 14 ngày) ----------
const REVIEW = { jv: 3, vj: 2, kr: 1, kh: 1, g: 2, read: 1 };
export async function runLessonReview(view, ctx, id) {
  const x = lessonById(id);
  if (!x) return ctx.go('#/');
  view.innerHTML = `<div class="page-wait">${loadingHTML('Đang soạn đề…')}</div>`; // v40: soạn đề từng phần, không đứng hình
  const all = await buildPoolQsAsync(lessonPool(x), REVIEW, x.level);
  if (!all) return;
  const qs = all.slice(0, 10);
  if (!qs.length) { view.innerHTML = emptyState('Bài này chưa đủ dữ liệu để ôn.'); return; }
  runDrill(view, shuffle(qs), ctx, { title: `Ôn bài ${x.n}: ${plain(x.title)}`, onDone: async (res, info) => {
    if (info.early && !res.length) return;
    const r = D.lessons[x.id] || {};
    if (r.done && reviewDue(x)) await saveLesson(x.id, { rev: [...(r.rev || []), Date.now()] });
  } });
}

// ---------- tình huống thật: ôn tổng hợp 5 bài (khi chưa có bài hội thoại tổng hợp) ----------
const TH = { jv: 4, vj: 3, kr: 2, kh: 1, g: 7, read: 2, listen: 1 };
export async function runTongHop(view, ctx, id) {
  const x = lessonById(id);
  if (!x) return ctx.go('#/lotrinh');
  const five = lessonsOf(x.level).slice(Math.max(0, x.n - 5), x.n);
  const pool = { vocab: [], grammar: [], kanji: [] };
  for (const l of five) { const p = lessonPool(l); pool.vocab.push(...p.vocab); pool.grammar.push(...p.grammar); pool.kanji.push(...p.kanji); }
  view.innerHTML = `<div class="page-wait">${loadingHTML('Đang soạn đề…')}</div>`; // v40: soạn đề từng phần, không đứng hình
  const all = await buildPoolQsAsync(pool, TH, x.level);
  if (!all) return;
  const qs = all.slice(0, 20);
  ctx.backTo = '#/lotrinh';
  runDrill(view, qs, ctx, { title: `Tình huống thật · bài ${five[0].n}–${x.n}`, mode: 'test', onDone: async (res, info) => {
    if (info.empty) return goBack(ctx);
    const pct = Math.round((res.filter(r => r.ok).length / res.length) * 100);
    await saveLesson(x.id, { th: { pct, ok: pct >= PASS, t: Date.now() } });
    ctx.sessionDone?.();
    toast(pct >= PASS ? `Đạt ${pct}% — qua phần ôn tổng hợp.` : `${pct}% — cần từ ${PASS}%. Ôn lại 5 bài rồi làm lại.`);
    goBack(ctx);
  } });
}

// ---------- Nói được gì ----------
export function renderCanDo(view) {
  const all = allLessons(), done = all.filter(isDone);
  view.innerHTML = `<a class="back" href="#/lotrinh">Lộ trình</a><h1 class="h1">Nói được gì</h1>
    <p class="lgoal">Bạn đã làm được <b>${done.length}</b> việc bằng tiếng Nhật${done.length ? '' : ' — xong bài đầu tiên là có việc đầu tiên'}.</p>
    ${LEVELS.filter(L => lessonsOf(L).length).map(L => `<h2 class="h2">${esc(L)}</h2><ul class="cando">${lessonsOf(L).map(x => `<li class="${isDone(x) ? 'is-done' : ''}"><span class="cd-c" aria-hidden="true">${isDone(x) ? '✓' : ''}</span><a href="#/bai/${encodeURIComponent(x.id)}"><b>Bài ${x.n}</b> · ${rich(x.goal || x.title)}</a></li>`).join('')}</ul>`).join('')}`;
}
