// Đợt 6 (v31) — học nhanh, nhớ lâu:
// M1 học từ mới đoán nghĩa trước + luyện đoán nghĩa từ Hán Việt · L1 phân biệt từ / mẫu dễ nhầm · L2 chữ Hán trông giống
// N5 đánh từ cứng đầu · M4 ôn nhanh 3 phút · N4 nhắc lại từ mới cuối ngày
import { esc, rich, plain, shuffle, wordHTML, blankHTML, rubyHTML, startOfDay, DAY, toast } from './util.js';
import { bareOK } from './bare.js';
import { D, LEVELS, setPrefs } from './data.js';
import { S } from './settings.js';
import { status, dueDirs, isLeech, errCount, learnedSince, overdueMs, P } from './srs.js';
import { selectItems, answerOf, distractors, runQuiz } from './quiz.js';
import { runLearn, hvBreakdownHTML, canGuess } from './learn.js';
import { runDrill, opt } from './drill.js';
import { chips, readChip, readChips, emptyState } from './ui.js';
import { kvGet } from './db.js';
import { setupPage, vocabChoiceQ } from './practice.js';
import { confuseCmpHTML, confuseOf } from './wordx.js';
import { kanjiQuestion, similarCmpHTML } from './kanji.js';
import { buildGrammarQs } from './gdrill.js';

const backLink = '<a class="back" href="#/luyen">Các dạng bài</a>';
const lvField = o => `<fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels || [])}</fieldset>`;
const inLv = (o, x) => !o.levels?.length || o.levels.includes(x.level);
const sentHTML = jp => `<p class="after-sent" lang="ja">${rubyHTML(String(jp).replace(/\[\[|\]\]/g, ''), true)}</p>`;

// ---------- M1: học từ mới — đoán nghĩa trước ----------
export function renderGuessLearn(view, ctx) {
  const items = selectItems({ source: 'new' }).filter(canGuess).slice(0, S.qCount);
  if (!items.length) { view.innerHTML = backLink + emptyState('Đã học hết từ Hán mới (từ có âm Hán Việt) trong kho.', '<a class="btn btn-primary" href="#/moi">Học từ mới</a>'); return; }
  runLearn(view, items, ctx, { guess: true, again: () => ctx.go('#/moi/doan', true) });
}

// ---------- M1: luyện đoán nghĩa từ Hán Việt (không đổi lịch ôn) ----------
function hvQ(it) {
  const right = answerOf(it, 'jv', 'furi'), ds = distractors(it, 'jv', 'furi');
  if (ds.length < 2) return null;
  return { kind: 'choice', tag: 'Đoán nghĩa từ Hán Việt', level: it.level,
    prompt: `<p class="prompt-jp" lang="ja">${wordHTML(it, 'furi')}</p><p class="guess-hv">${esc(it.hv)}</p>`, hint: 'Nhìn âm Hán Việt, chọn nghĩa',
    opts: shuffle([right, ...ds]).map(a => opt(a.key, a.html, false)), answer: right.key,
    cmpOf: Object.fromEntries(ds.filter(a => a.it).map(a => [a.key, a.it.id])), cmpRight: it.id, after: hvBreakdownHTML(it) };
}
export const buildHanViet = o => shuffle(selectItems(o).filter(canGuess)).slice(0, Math.min(o.count * 2, 400)).map(hvQ).filter(Boolean).slice(0, o.count);
export async function renderHanViet(view, ctx) {
  const o = { source: 'new', levels: [], ...(await kvGet('pHV', {})) };
  setupPage(view, ctx, { key: 'pHV', title: 'Đoán nghĩa từ Hán Việt', route: '#/luyen/hanviet',
    intro: 'Thấy từ Hán và âm Hán Việt thì đoán nghĩa. Sau mỗi câu có nghĩa từng chữ. Bài này không đổi lịch ôn — chỉ rèn thói quen đoán nghĩa nhờ âm Hán Việt.',
    fields: `<fieldset><legend>Lấy từ nào</legend>${chips('source', [['new', 'Từ chưa học'], ['learned', 'Từ đã học'], ['all', 'Tất cả']], o.source, false)}</fieldset>${lvField(o)}`,
    read: f => ({ source: readChip(f, 'source'), levels: readChips(f, 'levels') }), build: buildHanViet, drillOpts: { noReview: true } });
}

// ---------- L1: phân biệt từ dễ nhầm / mẫu ngữ pháp gần nghĩa ----------
const surfaceIn = (it, jp) => [it.kf, it.kanji && it.kanji !== it.kana ? `${it.kanji}[${it.kana}]` : null, it.kana].filter(Boolean).find(s => jp.includes(s));
function vocabGroups(o) {
  const seen = new Set(), out = [];
  for (const it of shuffle(D.vocab.filter(it => (it.confuse || []).length && inLv(o, it) && (o.source !== 'learned' || status(it) !== 'new')))) {
    const g = [it, ...confuseOf(it)].slice(0, 3);
    if (g.length < 2) continue;
    const key = g.map(x => x.id).sort().join('|');
    if (seen.has(key)) continue;
    seen.add(key); out.push(g);
  }
  return out;
}
function vocabClozeQ(it, g) {
  const opts = shuffle(g).map(o => opt(o.id, wordHTML(o, 'furi')));
  for (const ex of shuffle([...(it.ex || [])])) {
    const s = ex.jp && ex.vi ? surfaceIn(it, ex.jp) : null;
    if (!s || g.some(o => o !== it && surfaceIn(o, ex.jp))) continue;
    const frame = rubyHTML(ex.jp.replace(s, '\u0000').replace(/\[\[|\]\]/g, ''), true).replace('\u0000', '<span class="blank">　　　</span>');
    return { kind: 'choice', tag: 'Từ dễ nhầm — chọn từ hợp câu', level: it.level, prompt: `<p class="prompt-sent" lang="ja">${frame}</p><p class="prompt-vi-s">${esc(ex.vi)}</p>`,
      hint: 'Chọn từ đúng cho chỗ trống', opts, answer: it.id, cmpRight: it.id, after: sentHTML(ex.jp) };
  }
  return { kind: 'choice', tag: 'Từ dễ nhầm — chọn từ đúng nghĩa', level: it.level, prompt: `<p class="prompt-vi">${esc(it.vi)}</p>`, hint: 'Chọn từ tiếng Nhật đúng với nghĩa', opts, answer: it.id, cmpRight: it.id };
}
const notesHTML = g => { const ns = g.filter(x => x.note); return ns.length ? `<ul class="cmp-notes">${ns.map(x => `<li><b lang="ja">${wordHTML(x, 'furi')}</b>: ${rich(x.note)}</li>`).join('')}</ul>` : ''; };

const normPat = p => plain(p || '').replace(/[〜～~\s]/g, '').replace(/[（(][^）)]*[）)]/g, '');
function grammarGroups(o) {
  const m = new Map();
  for (const g of D.grammar) for (const part of plain(g.pattern).split(/[/／・]/)) if (normPat(part)) m.set(normPat(part), g);
  const seen = new Set(), out = [];
  for (const g of shuffle(D.grammar.filter(g => inLv(o, g) && (o.source !== 'learned' || status(g) !== 'new')))) {
    for (const c of g.compare || []) {
      const h = plain(c.pattern || '').split(/[/／・]/).map(x => m.get(normPat(x))).find(x => x && x !== g);
      if (!h) continue;
      const key = [g.id, h.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key); out.push({ g, h, diff: c.diff || '' });
    }
  }
  return out;
}
const patExs = g => shuffle((g.ex || []).filter(e => e.vi && /\[\[.+?\]\]/.test(e.jp || '')));
function patQ(owner, other, ex, diff) {
  return { kind: 'choice', tag: 'Mẫu ngữ pháp dễ nhầm', level: owner.level, prompt: `<p class="prompt-sent" lang="ja">${blankHTML(ex.jp)}</p><p class="prompt-vi-s">${esc(ex.vi)}</p>`,
    hint: 'Chỗ trống dùng mẫu nào?', opts: shuffle([owner, other]).map(x => opt(x.id, rich(x.pattern))), answer: owner.id,
    after: sentHTML(ex.jp) + (diff ? `<p class="small">${rich(diff)}</p>` : '') };
}
export function buildDenHam(o) {
  const qs = [];
  if (o.kind === 'np') {
    for (const { g, h, diff } of grammarGroups(o).slice(0, o.count)) {
      const sub = [...patExs(g).slice(0, 2).map(ex => patQ(g, h, ex, diff)), ...patExs(h).slice(0, 2).map(ex => patQ(h, g, ex, diff))];
      if (!sub.length) continue;
      qs.push({ kind: 'info', tag: 'Mẫu dễ nhầm — xem kỹ', level: g.level,
        prompt: `<div class="cmp"><p class="cmp-t">Hai mẫu này dễ nhầm</p><table class="cmp-tb"><tbody>${[g, h].map(x => `<tr><th scope="row" lang="ja">${rich(x.pattern)}</th><td>${rich(x.meaning || '')}</td></tr>`).join('')}</tbody></table>${diff ? `<p class="cmp-diff">${rich(diff)}</p>` : ''}</div>` },
        ...shuffle(sub));
    }
    return qs;
  }
  for (const g of vocabGroups(o).slice(0, o.count)) {
    qs.push({ kind: 'info', tag: 'Từ dễ nhầm — xem kỹ', level: g[0].level, prompt: confuseCmpHTML(g, { title: 'Các từ này dễ nhầm' }) + notesHTML(g) }, ...shuffle(g.map(it => vocabClozeQ(it, g))));
  }
  return qs;
}
export async function renderDenHam(view, ctx) {
  const o = { kind: 'tu', source: 'learned', levels: [], ...(await kvGet('pDH', {})) };
  setupPage(view, ctx, { key: 'pDH', title: 'Phân biệt từ dễ nhầm', route: '#/luyen/denham', unit: 'nhóm', counts: [3, 5, 8],
    intro: 'Mỗi nhóm: xem các từ (hoặc mẫu ngữ pháp) dễ nhầm đặt cạnh nhau, rồi chọn đúng theo câu. Bài này không đổi lịch ôn.',
    fields: `<fieldset><legend>Loại</legend>${chips('kind', [['tu', 'Từ vựng'], ['np', 'Mẫu ngữ pháp']], o.kind, false)}</fieldset>
      <fieldset><legend>Lấy từ nào</legend>${chips('source', [['learned', 'Đã học'], ['all', 'Tất cả']], o.source, false)}</fieldset>${lvField(o)}`,
    read: f => ({ kind: readChip(f, 'kind'), source: readChip(f, 'source'), levels: readChips(f, 'levels') }), build: buildDenHam,
    drillOpts: { noReview: true }, empty: 'Chưa có nhóm dễ nhầm nào cho lựa chọn này.' });
}

// ---------- L2: chữ Hán trông giống ----------
function lookAlikes(k) {
  const sim = (k.similar || []).map(s => D.kanjiByChar.get(s.c)).filter(o => o && o !== k);
  const back = D.kanji.filter(o => o !== k && !sim.includes(o) && (o.similar || []).some(s => s.c === k.char));
  return [...sim, ...back];
}
function giongQ(k) {
  const al = shuffle(lookAlikes(k)).slice(0, 3);
  if (!al.length) return null;
  const opts = [k, ...al];
  if (opts.length < 3) opts.push(...shuffle(D.kanji.filter(o => !opts.includes(o) && (o.parts || []).some(p => (k.parts || []).some(q => q.c === p.c)))).slice(0, 3 - opts.length));
  const ws = D.vocab.filter(v => (v.kanji || '').includes(k.char) && v.kanji.length >= 2);
  const w = shuffle(ws.filter(v => status(v) !== 'new'))[0] || shuffle(ws)[0];
  const prompt = w
    ? `<p class="prompt-jp" lang="ja" data-bare>${esc(w.kanji).replace(k.char, '<span class="kblank">□</span>')}</p><p class="prompt-sub" lang="ja">${esc(w.kana)}</p><p class="prompt-hint">${esc(w.vi)}</p>`
    : `<p class="prompt-vi">${esc(k.hv)}</p><p class="prompt-hint">${esc(k.nghia || '')}</p>`;
  return { kind: 'choice', tag: 'Chữ trông giống', level: k.level, promptBare: true, prompt, hint: w ? 'Chọn chữ đúng cho ô trống' : 'Chọn đúng chữ',
    opts: shuffle(opts).map(o => opt(o.id, `<span class="kc-opt" data-bare>${esc(o.char)}</span>`)), answer: k.id, noCmp: true,
    after: (w ? `<p class="small"><span lang="ja">${wordHTML(w, 'furi')}</span> — ${esc(w.vi)}</p>` : '') + similarCmpHTML([k, ...al], { focus: k.char, title: 'Các chữ trông giống' }) };
}
export const buildGiongChu = o => shuffle(D.kanji.filter(k => inLv(o, k) && (o.source !== 'learned' || status(k) !== 'new') && lookAlikes(k).length)).slice(0, Math.min(o.count * 2, 300)).map(giongQ).filter(Boolean).slice(0, o.count);
export async function renderGiongChu(view, ctx) {
  const o = { source: 'learned', levels: [], ...(await kvGet('pGC', {})) };
  setupPage(view, ctx, { key: 'pGC', title: 'Chữ Hán trông giống', route: '#/luyen/giongchu',
    intro: 'Một từ bị che một chữ Hán: chọn đúng chữ giữa các chữ trông giống nhau. Đây là bài nhận mặt chữ nên chữ trong câu hỏi không có furigana. Bài này không đổi lịch ôn.',
    fields: `<fieldset><legend>Lấy chữ nào</legend>${chips('source', [['learned', 'Chữ đã học'], ['all', 'Tất cả']], o.source, false)}</fieldset>${lvField(o)}`,
    read: f => ({ source: readChip(f, 'source'), levels: readChips(f, 'levels') }), build: buildGiongChu, drillOpts: { noReview: true },
    empty: 'Chưa có chữ nào có chữ trông giống trong lựa chọn này. Chọn "Tất cả".' });
}

// ---------- N5: đánh từ cứng đầu ----------
const worstDir = (it, dirs) => {
  const d = P.get(it.id)?.d || {};
  return dirs.filter(x => x !== 'kr' || bareOK(it)).sort((a, b) => (d[b]?.ng || 0) - (d[a]?.ng || 0))[0];
};
export function renderCungDau(view, ctx) {
  const lv = D.vocab.filter(isLeech).sort((a, b) => errCount(b) - errCount(a)), lk = D.kanji.filter(isLeech).sort((a, b) => errCount(b) - errCount(a));
  view.innerHTML = `${backLink}<h1 class="h1">Đánh từ cứng đầu</h1>
    <p class="muted small">Từ và chữ Hán đã sai từ 4 lần trở lên mà chưa thuộc. Mỗi mục: xem lại thẻ đầy đủ (âm Hán Việt, thơ nhớ chữ, câu ví dụ, từ dễ nhầm) rồi mới hỏi. Mục nào lên tới "đã thuộc" thì tự rời danh sách.</p>
    ${!lv.length && !lk.length ? emptyState('Chưa có mục nào cứng đầu.') : `<div class="row-btns stack">
      ${lv.length ? `<button type="button" class="btn btn-primary" data-a="v">Luyện ${Math.min(lv.length, 20)} từ cứng đầu</button>` : ''}
      ${lk.length ? `<button type="button" class="btn ${lv.length ? 'btn-ghost' : 'btn-primary'}" data-a="k">Luyện ${Math.min(lk.length, 20)} chữ Hán cứng đầu</button>` : ''}</div>`}
    ${lv.length ? `<h2 class="h2">Từ vựng · ${lv.length}</h2><ul class="rows">${lv.map(it => `<li><button type="button" class="row" data-wopen="${esc(it.id)}"><span class="row-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="row-vi">${esc(it.vi)} <small class="muted">· sai ${errCount(it)} lần</small></span></button></li>`).join('')}</ul>` : ''}
    ${lk.length ? `<h2 class="h2">Chữ Hán · ${lk.length}</h2><div class="kgrid">${lk.map(k => `<button type="button" class="ktile" data-kopen="${esc(k.char)}" data-bare><span class="ktile-c" lang="ja">${esc(k.char)}</span><span class="ktile-hv">${esc(k.hv)} · ${errCount(k)}</span></button>`).join('')}</div>` : ''}`;
  const back = () => ctx.go('#/luyen/cungdau', true);
  const bv = view.querySelector('[data-a=v]');
  if (bv) bv.onclick = () => { ctx.backTo = '#/luyen/cungdau'; runQuiz(view, lv.slice(0, 20).map(it => ({ it, dir: worstDir(it, ['vj', 'jv', 'kr']) })), { dir: 'mix', script: S.script, source: 'leech', again: back }, ctx); };
  const bk = view.querySelector('[data-a=k]');
  if (bk) bk.onclick = () => { ctx.backTo = '#/luyen/cungdau'; runDrill(view, lk.slice(0, 20).map(k => kanjiQuestion(k, worstDir(k, ['kh', 'hk']))).filter(Boolean), ctx, { title: 'Chữ Hán cứng đầu', again: back }); };
}

// ---------- M4: ôn nhanh 3 phút ----------
export function runQuick3(view, ctx) {
  // v39: xếp theo độ quá hạn trước (rẻ), chỉ dựng câu hỏi cho 80 mục đầu — trước đây dựng câu (kèm đáp án nhiễu) cho mọi mục đến hạn rồi mới cắt
  const now = Date.now(), list = [];
  for (const it of D.vocab) { const dd = dueDirs(it, now); if (dd.length) list.push([overdueMs(it, now), () => vocabChoiceQ(it, dd[Math.floor(Math.random() * dd.length)])]); }
  for (const k of D.kanji) { const dd = dueDirs(k, now); if (dd.length) list.push([overdueMs(k, now), () => kanjiQuestion(k, dd[Math.floor(Math.random() * dd.length)])]); }
  for (const q of buildGrammarQs({ type: 'mix', source: 'due', count: 40 }).filter(q => q.kind === 'choice' && q.review)) {
    const g = D.items.get(q.review.id);
    if (g) list.push([overdueMs(g, now), () => q]);
  }
  list.sort((a, b) => b[0] - a[0]);
  let qs = [], noReview = false;
  for (const [, mk] of list) { if (qs.length >= 80) break; const q = mk(); if (q) qs.push(q); }
  if (!qs.length) {
    const recent = D.vocab.filter(it => learnedSince(it, startOfDay() - 6 * DAY));
    qs = shuffle(recent).slice(0, 60).map((it, i) => vocabChoiceQ(it, i % 2 ? 'vj' : 'jv', { noReview: true })).filter(Boolean);
    noReview = true;
    if (qs.length) toast('Không có mục đến hạn — nhắc lại từ mới học trong 7 ngày qua (không đổi lịch ôn).');
  }
  if (!qs.length) { view.innerHTML = emptyState('Không có mục đến hạn, và chưa học từ nào trong 7 ngày qua.', '<a class="btn btn-primary" href="#/moi">Học từ mới</a>'); return; }
  runDrill(view, qs, ctx, { title: 'Ôn nhanh 3 phút', timeBox: 180, again: () => ctx.go('#/nhanh3', true), againLabel: 'Thêm 3 phút', noReview, runClass: 'run-quick' });
}

// ---------- N4: nhắc lại từ mới học hôm nay (sau ít nhất 4 giờ, không đổi lịch ôn) ----------
const RECAP_MS = 4 * 3600e3;
export function recapState() {
  const sod = startOfDay(), now = Date.now(), r = D.prefs.recap || {};
  const done = new Set(r.d === sod ? r.ids || [] : []);
  const today = D.vocab.filter(it => (P.get(it.id)?.first || 0) >= sod && status(it) === 'learning');
  const ready = today.filter(it => P.get(it.id).first <= now - RECAP_MS && !done.has(it.id));
  return { today: today.length, ready, done: today.filter(it => done.has(it.id)).length };
}
export function runRecap(view, ctx) {
  const { ready } = recapState();
  if (!ready.length) { view.innerHTML = emptyState('Chưa có từ nào cần nhắc lại. Từ học hôm nay được nhắc lại sau ít nhất 4 giờ.', '<a class="btn btn-primary" href="#/">Về trang chủ</a>'); return; }
  runQuiz(view, shuffle(ready).map((it, i) => ({ it, dir: i % 2 ? 'vj' : 'jv' })), { dir: 'mix', script: S.script, source: 'recap', noReview: true, again: () => ctx.go('#/nhaclai', true),
    onFinish: ({ answered }) => {
      if (!answered) return;
      const sod = startOfDay(), r = D.prefs.recap || {};
      setPrefs({ recap: { d: sod, ids: [...new Set([...(r.d === sod ? r.ids || [] : []), ...ready.map(it => it.id)])] } });
    } }, ctx);
}
