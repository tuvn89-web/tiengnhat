// v50: "Học lại" một bài hoặc cả chặng — 3 cách:
//  A. Kiểm tra nhanh → chỉ học lại phần đã quên (khuyên dùng): bài kiểm tra tự nó là một lần ôn; mục còn nhớ thì chỉ dời lịch ôn,
//     mục quên gắn nhãn "cần học lại" (giữ tiến độ cũ), học lại ngay, hôm sau hỏi lại; đúng ở 2 ngày khác nhau thì gỡ nhãn.
//  B. Đi lại từng bài, giữ tiến độ cũ (✓ lần đầu để mờ, ✓ lần đi lại đánh riêng) — xem lesson.js redoOf().
//  C. Học lại từ đầu: xoá tiến độ của bài / chặng (app giữ bản sao để khôi phục; hỏi lại 2 lần).
import { esc, rich, plain, wordHTML, shuffle, toast, fmtDate, rubyHTML, stripHL, reading, download } from './util.js';
import { loadingHTML } from './lazy.js';
import { D, LEVELS, saveLesson } from './data.js';
import { kvGet, kvSet } from './db.js';
import { status, isRelearn, setRelearnMany, review, refreshDue, dirRec, resetItems, progSnapshot, progRestore, rlMark } from './srs.js';
import { emptyState, confirmBox, bindSay, sayBtn } from './ui.js';
import { runDrill } from './drill.js';
import { buildPoolQsAsync, thresholds, passedLevels } from './level.js';
import { lessonById, lessonsOf, lessonPool, RQ_LOW, needRelearn, redoOf, lessonCardHTML } from './lesson.js';
import { crumbHTML, goBack, bindResultNav } from './nav.js';
import { backupJSON } from './sync.js';

const STAGE_N = 10, STAGE_PER = 4; // kiểm nhanh chặng: 10 bài (bài lâu chưa kiểm trước) × 4 câu ≈ 10 phút
const LESSON_SPEC = { kr: 2, jv: 3, vj: 2, kh: 1, g: 4, read: 2, listen: 1 };
const STAGE_SPEC = { kr: 1, jv: 1, g: 1, read: 1 };

function scopeOf(key) {
  if (LEVELS.includes(key)) { const ls = lessonsOf(key); return ls.length ? { key, L: key, lessons: ls, stage: true, name: `chặng ${key}` } : null; }
  const x = lessonById(key);
  return x ? { key, L: x.level, lessons: [x], stage: false, x, name: `bài ${x.n}` } : null;
}
const href = (sc, tail = '') => `#/hoclai/${encodeURIComponent(sc.key)}${tail}`;
function poolItems(ls) {
  const seen = new Set(), out = [];
  for (const x of ls) { const p = lessonPool(x); for (const it of [...p.vocab, ...p.grammar, ...p.kanji]) if (!seen.has(it.id)) { seen.add(it.id); out.push(it); } }
  return out;
}
const rlItems = sc => poolItems(sc.lessons).filter(it => isRelearn(it.id));
const learnedOnly = l => { const a = l.filter(it => status(it) !== 'new'); return a.length ? a : l; };

// ---------- trang chọn cách học lại ----------
export async function renderRelearn(view, ctx, key) {
  const sc = scopeOf(key);
  if (!sc) { view.innerHTML = emptyState('Không có bài / chặng này.', '<a class="btn btn-ghost" href="#/lotrinh">Về Lộ trình</a>'); return; }
  const back = sc.stage ? '#/lotrinh' : `#/bai/${encodeURIComponent(sc.x.id)}`;
  const rl = rlItems(sc), undo = (await kvGet('rlUndo', [])).find(u => u.key === sc.key);
  const sr = sc.stage ? D.lessons['lv:' + sc.L]?.redo : null, srOn = !!(sr && !sr.done);
  const lr = !sc.stage ? redoOf(sc.x) : null;
  const redoCur = srOn ? sc.lessons.find(l => redoOf(l)) : null;
  const nRedo = srOn ? sc.lessons.filter(l => (D.lessons[l.id]?.redo?.done || 0) >= sr.t).length : 0;
  let status1 = '';
  if (sc.stage) {
    const ck = sc.lessons.filter(l => D.lessons[l.id]?.rq), low = sc.lessons.filter(l => needRelearn(l));
    const lq = D.lessons['lv:' + sc.L]?.rq;
    status1 = `<p class="small">${ck.length ? `Đã kiểm nhanh ${ck.length}/${sc.lessons.length} bài${lq ? ` · lần gần nhất ${fmtDate(lq.t)}: ${lq.pct}%` : ''}.` : 'Chưa kiểm nhanh bài nào của chặng này.'}</p>
      ${low.length ? `<p class="sub-label">Bài cần học lại (dưới ${RQ_LOW}%)</p><ol class="lessons">${low.slice(0, 12).map(l => `<li class="ls"><a href="${href({ key: l.id })}"><span class="ls-n">${l.n}</span><span class="ls-t"><b>${rich(l.title)}</b><small>Kiểm nhanh ${D.lessons[l.id].rq.pct}% · ${needRelearn(l)} mục cần học lại</small></span><span class="ls-p"><span class="ls-rl">↺</span></span></a></li>`).join('')}</ol>` : ''}`;
  } else {
    const q = D.lessons[sc.x.id]?.rq;
    status1 = `<p class="small">${q ? `Kiểm tra nhanh lần gần nhất (${fmtDate(q.t)}): <b>${q.pct}%</b>.` : 'Chưa kiểm tra nhanh bài này.'}</p>`;
  }
  view.innerHTML = `<a class="back" href="${back}">${sc.stage ? 'Lộ trình' : `Bài ${sc.x.n}`}</a>
    <h1 class="h1">↺ Học lại ${esc(sc.name)}</h1>
    ${sc.stage ? '' : `<p class="small muted">${rich(sc.x.title)}</p>`}
    ${status1}
    ${rl.length ? `<div class="note"><p><b>${rl.length} mục</b> đang gắn nhãn "cần học lại".</p><div class="row-btns"><a class="btn btn-primary btn-sm" href="${href(sc, '/hoc')}">Học lại ${rl.length} mục</a></div></div>` : ''}

    <section class="card rl-opt"><h2 class="h2">A. Kiểm tra nhanh rồi học lại phần đã quên <span class="rl-tag">Nên dùng</span></h2>
      <p>${sc.stage ? `${STAGE_N * STAGE_PER} câu từ ${STAGE_N} bài (bài lâu chưa kiểm trước) · khoảng 10 phút. Làm vài lần là phủ cả chặng.` : '15 câu: từ, đọc chữ Hán, ngữ pháp, hiểu câu · khoảng 4 phút.'}</p>
      <p class="small muted">Mục làm đúng chỉ dời lịch ôn. Mục làm sai được gắn nhãn "cần học lại" (tiến độ cũ giữ nguyên), học lại ngay; hôm sau app hỏi lại, đúng ở 2 ngày khác nhau thì gỡ nhãn. Học lại thứ đã quên nhanh hơn học lần đầu, nên chỉ học lại phần quên là đỡ tốn thời gian nhất.</p>
      <div class="row-btns"><a class="btn btn-primary" href="${href(sc, '/kt')}">Bắt đầu kiểm tra nhanh</a></div></section>

    <section class="card rl-opt"><h2 class="h2">B. Đi lại từng bài (giữ tiến độ)</h2>
      <p>Các bước của bài hiện lại từ đầu: ✓ lần học đầu để mờ, ✓ lần đi lại đánh riêng; làm lại bài kiểm tra cuối bài. Lịch ôn của từ giữ nguyên.</p>
      <p class="small muted">Hợp khi muốn ôn có trình tự, ví dụ trước kỳ thi.</p>
      ${srOn ? `<p class="small"><b>Đang đi lại chặng ${esc(sc.L)}</b> từ ${fmtDate(sr.t)} · xong ${nRedo}/${sc.lessons.length} bài.</p>${redoCur ? lessonCardHTML(redoCur) : ''}<div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-act="redooff">Thôi đi lại</button></div>`
      : lr ? `<p class="small"><b>Đang đi lại bài này</b> từ ${fmtDate(lr.t)}.</p><div class="row-btns"><a class="btn btn-primary btn-sm" href="#/bai/${encodeURIComponent(sc.x.id)}">Tiếp tục</a><button type="button" class="btn btn-ghost btn-sm" data-act="redooff">Thôi đi lại</button></div>`
      : `<div class="row-btns"><button type="button" class="btn btn-ghost" data-act="redo">${sc.stage ? `Đi lại chặng ${esc(sc.L)} từ bài 1` : 'Đi lại bài này'}</button></div>`}</section>

    <section class="card rl-opt rl-c"><h2 class="h2">C. Học lại từ đầu (xoá tiến độ)</h2>
      <p>Chỉ dùng khi thật cần: bỏ học rất lâu, hoặc muốn làm lại như mới. Từ, ngữ pháp, chữ Hán của ${esc(sc.name)} về "chưa học"; ✓ các bước, kết quả kiểm tra và lịch ôn bài bị xoá. Câu đã tự viết giữ lại.${sc.stage ? ` Kết quả Thi vượt cấp ${esc(sc.L)} trước đây không tính nữa — chặng về "Đang học".` : ''}</p>
      <p class="small muted">App giữ một bản sao tiến độ ngay trước khi xoá để khôi phục được ở trang này.</p>
      <div class="row-btns wrap"><button type="button" class="btn btn-danger" data-act="reset">Học lại từ đầu…</button></div>
      ${undo ? `<p class="small">Lần xoá gần nhất: ${fmtDate(undo.t)}. <button type="button" class="btn btn-ghost btn-sm" data-act="undo">Khôi phục tiến độ trước lần xoá</button></p>` : ''}</section>`;
  view.onclick = async e => {
    const a = e.target.closest('[data-act]')?.dataset.act;
    if (!a) return;
    if (a === 'redo') {
      const now = Date.now();
      if (sc.stage) { await saveLesson('lv:' + sc.L, { redo: { t: now } }); toast(`Bắt đầu đi lại chặng ${sc.L}.`); return ctx.go(`#/bai/${encodeURIComponent(sc.lessons[0].id)}`); }
      await saveLesson(sc.x.id, { redo: { t: now, steps: {} } }); toast('Bắt đầu đi lại bài này.');
      return ctx.go(`#/bai/${encodeURIComponent(sc.x.id)}`);
    }
    if (a === 'redooff') {
      if (!(await confirmBox('Thôi đi lại? Tiến độ cũ và các ✓ lần đi lại vẫn giữ.', 'Thôi đi lại', 'Đi tiếp'))) return;
      const now = Date.now();
      if (srOn) await saveLesson('lv:' + sc.L, { redo: { ...sr, done: now, stop: 1 } });
      for (const l of sc.lessons) { const r = D.lessons[l.id]?.redo; if (r && !r.done) await saveLesson(l.id, { redo: { ...r, done: now, stop: 1 } }); }
      toast('Đã thôi đi lại.'); return renderRelearn(view, ctx, key);
    }
    if (a === 'reset') {
      const n = poolItems(sc.lessons).filter(it => status(it) !== 'new').length;
      if (!(await confirmBox(`Học lại ${sc.name} từ đầu? ${n} mục đã học sẽ về "chưa học".`, 'Tiếp tục', 'Huỷ'))) return;
      if (!(await confirmBox(`Xác nhận lần 2: xoá tiến độ của ${sc.name}? App giữ bản sao để khôi phục ở trang này.`, 'Xoá tiến độ', 'Huỷ'))) return;
      await resetScope(sc);
      toast(`Đã xoá tiến độ ${sc.name}.`, { action: 'Hoàn tác', onAction: async () => { await undoReset(sc.key); renderRelearn(view, ctx, key); } });
      return ctx.go(sc.stage ? '#/lotrinh' : `#/bai/${encodeURIComponent(sc.x.id)}`);
    }
    if (a === 'undo') {
      if (!(await confirmBox(`Khôi phục tiến độ ${sc.name} như trước lần xoá ngày ${fmtDate(undo.t)}?`, 'Khôi phục', 'Huỷ'))) return;
      await undoReset(sc.key); toast('Đã khôi phục.'); return renderRelearn(view, ctx, key);
    }
  };
}

// ---------- C. xoá tiến độ (có bản sao để hoàn tác) ----------
async function resetScope(sc) {
  const ids = poolItems(sc.lessons).map(it => it.id);
  const docs = sc.lessons.flatMap(x => x.texts || []);
  const recs = [...sc.lessons.map(x => x.id), ...docs, ...(sc.stage ? ['lv:' + sc.L] : [])];
  const snap = { key: sc.key, t: Date.now(), prog: progSnapshot(ids), lessons: Object.fromEntries(recs.map(id => [id, D.lessons[id] ? structuredClone(D.lessons[id]) : null])) };
  await kvSet('rlUndo', [snap, ...(await kvGet('rlUndo', [])).filter(u => u.key !== sc.key)].slice(0, 3));
  await resetItems(ids);
  const now = Date.now();
  for (const x of sc.lessons) { const w = D.lessons[x.id]?.writes; D.lessons[x.id] = { reset: now, t: now, ...(w ? { writes: w } : {}) }; }
  for (const d of docs) if (D.lessons[d]) D.lessons[d] = { reset: now, t: now };
  if (sc.stage) D.lessons['lv:' + sc.L] = { reset: now, t: now };
  await kvSet('lessons', D.lessons);
}
async function undoReset(key) {
  const list = await kvGet('rlUndo', []), u = list.find(z => z.key === key);
  if (!u) return;
  await progRestore(u.prog);
  const now = Date.now();
  for (const [id, r] of Object.entries(u.lessons)) D.lessons[id] = r ? { ...r, t: now } : { t: now };
  await kvSet('lessons', D.lessons);
  await kvSet('rlUndo', list.filter(z => z !== u && z.key !== key));
}

// ---------- A. kiểm tra nhanh ----------
export async function runQuickCheck(view, ctx, key) {
  const sc = scopeOf(key);
  if (!sc) return ctx.go('#/lotrinh');
  let lessons = sc.lessons;
  if (sc.stage) {
    const learned = lessons.filter(x => { const p = lessonPool(x); return [...p.vocab, ...p.grammar].some(it => status(it) !== 'new'); });
    lessons = [...(learned.length ? learned : lessons)].sort((a, b) => (D.lessons[a.id]?.rq?.t || 0) - (D.lessons[b.id]?.rq?.t || 0) || a.n - b.n).slice(0, STAGE_N).sort((a, b) => a.n - b.n);
  }
  view.innerHTML = `<div class="page-wait">${loadingHTML('Đang soạn đề…')}</div>`;
  const qs = [];
  for (const x of lessons) {
    const p = lessonPool(x);
    const got = await buildPoolQsAsync({ vocab: learnedOnly(p.vocab), grammar: learnedOnly(p.grammar), kanji: learnedOnly(p.kanji) }, sc.stage ? STAGE_SPEC : LESSON_SPEC, x.level);
    if (!got) return; // đã sang trang khác
    for (const q of got.slice(0, sc.stage ? STAGE_PER : 15)) qs.push({ ...q, _ls: x.id });
  }
  if (qs.length < 4) { view.innerHTML = emptyState('Chưa đủ dữ liệu để kiểm tra nhanh.', `<a class="btn btn-ghost" href="${href(sc)}">Quay lại</a>`); return; }
  ctx.backTo = href(sc);
  runDrill(view, qs, ctx, { title: `Kiểm tra nhanh · ${sc.name}`, mode: 'test', noReview: true, onDone: async (res, info) => {
    if (info.empty) return goBack(ctx);
    const now = Date.now(), wrong = [], per = new Map();
    for (const r of res) {
      const id = r.q.review?.id;
      if (r.skip || !id || !D.items.has(id)) continue;
      const e = per.get(r.q._ls) || { ok: 0, n: 0 }; e.n++; if (r.ok) e.ok++; per.set(r.q._ls, e);
      const dir = r.q.review.dir;
      if (r.ok) { const x = dirRec(id, dir); if (!x?.b || x.due <= now) await review(id, dir, true); else await refreshDue(id, dir); } // còn nhớ: chỉ dời lịch ôn
      else { await review(id, dir, false); wrong.push(id); } // quên: về hộp 1 → mai hỏi lại
    }
    await setRelearnMany(wrong, 'kt');
    let ok = 0, n = 0;
    for (const [id, e] of per) { ok += e.ok; n += e.n; await saveLesson(id, { rq: { t: now, ok: e.ok, n: e.n, pct: Math.round((e.ok / e.n) * 100) } }); }
    const pct = n ? Math.round((ok / n) * 100) : 0;
    if (sc.stage) await saveLesson('lv:' + sc.L, { rq: { t: now, ok, n, pct } });
    ctx.sessionDone?.();
    showResult(view, ctx, sc, { ok, n, pct, per, wrong: [...new Set(wrong)] });
  } });
}
function showResult(view, ctx, sc, { ok, n, pct, per, wrong }) {
  const { lo } = thresholds();
  const its = wrong.map(id => D.items.get(id)).filter(Boolean);
  const left = sc.stage ? sc.lessons.filter(l => !D.lessons[l.id]?.rq).length : 0;
  ctx.inRun = true;
  view.innerHTML = `<section class="result">${crumbHTML(ctx)}
    <h1 class="h1">Kết quả kiểm tra nhanh</h1>
    <p class="result-score"><b>${pct}%</b><span> (${ok}/${n})</span></p>
    <p class="result-sub">${its.length ? `${its.length} mục đã quên — đã gắn nhãn "cần học lại", tiến độ cũ giữ nguyên. Học lại ngay: xem lại thẻ rồi trả lời lại; ngày mai app hỏi lại lần nữa.` : 'Nhớ hết — các mục làm đúng đã được dời lịch ôn.'}</p>
    ${sc.stage ? `<p class="sub-label">Từng bài</p><ol class="lessons">${[...per].map(([id, e]) => { const l = lessonById(id), p = Math.round((e.ok / e.n) * 100); return `<li class="ls"><a href="#/bai/${encodeURIComponent(id)}"><span class="ls-n">${l.n}</span><span class="ls-t"><b>${rich(l.title)}</b></span><span class="ls-p">${e.ok}/${e.n}${p < RQ_LOW ? ' <span class="ls-rl">↺ Học lại</span>' : ''}</span></a></li>`; }).join('')}</ol>` : ''}
    ${sc.stage && pct < lo && passedLevels().has(sc.L) ? `<p class="note small">Kết quả dưới mức qua chặng (${lo}%). Học lại xong nên làm lại Thi vượt cấp ${esc(sc.L)}. Dấu "Đã qua" vẫn giữ.</p>` : ''}
    ${its.length ? `<h2 class="h2">Mục đã quên</h2><ul class="rows">${its.map(it => `<li><span class="row"><span class="row-jp" lang="ja">${itemJP(it)}</span><span class="row-vi">${esc(itemVI(it))}</span></span></li>`).join('')}</ul>` : ''}
    <div class="row-btns stack">
      ${its.length ? `<a class="btn btn-primary" href="${href(sc, '/hoc')}" data-nav="go">Học lại ${its.length} mục ngay</a>` : ''}
      ${sc.stage ? `<a class="btn btn-ghost" href="${href(sc, '/kt')}" data-nav="go">Kiểm tra tiếp ${STAGE_N} bài${left ? ` (còn ${left} bài chưa kiểm)` : ''}</a>` : ''}
      <a class="btn btn-ghost" href="${href(sc)}" data-nav="go">Về trang Học lại</a></div></section>`;
  bindResultNav(view, ctx, { kind: 'test' });
}
const itemJP = it => it._type === 'grammar' ? rich(it.pattern) : it._type === 'kanji' ? `${esc(it.char)} <small>${esc(it.hv || '')}</small>` : wordHTML(it, 'furi');
const itemVI = it => it._type === 'grammar' ? plain(it.meaning || '') : it.vi || it.nghia || '';

// ---------- học lại các mục gắn nhãn: xem lại thẻ → hỏi lại ----------
export async function runRelearnItems(view, ctx, key) {
  const sc = scopeOf(key);
  if (!sc) return ctx.go('#/lotrinh');
  const its = rlItems(sc);
  if (!its.length) { view.innerHTML = emptyState('Không còn mục nào gắn nhãn "cần học lại".', `<a class="btn btn-ghost" href="${href(sc)}">Về trang Học lại</a>`); return; }
  const ex = it => (it.ex || [])[0];
  view.innerHTML = `<a class="back" href="${href(sc)}">Học lại ${esc(sc.name)}</a>
    <h1 class="h1">Xem lại ${its.length} mục</h1>
    <p class="small muted">Đọc lại từng mục và câu ví dụ (bấm loa để nghe). Xem xong thì trả lời lại — câu sai được hỏi lại cuối lượt.</p>
    <ul class="rl-cards">${its.map(it => { const e = ex(it); return `<li class="card rl-card"><p class="rl-jp" lang="ja">${itemJP(it)}${it._type === 'vocab' ? ' ' + sayBtn(it.kana) : ''}</p><p class="rl-vi">${esc(itemVI(it))}</p>
      ${it._type === 'kanji' && it.note ? `<p class="small muted">${rich(it.note)}</p>` : ''}
      ${e?.jp ? `<p class="after-sent" lang="ja">${rubyHTML(stripHL(e.jp), true)} ${sayBtn(reading(stripHL(e.jp)))}</p><p class="small muted">${esc(e.vi || '')}</p>` : ''}</li>`; }).join('')}</ul>
    <div class="row-btns"><button type="button" class="btn btn-primary" data-act="go">Đã xem — trả lời lại</button></div>`;
  bindSay(view);
  view.querySelector('[data-act=go]').onclick = async () => {
    const pool = { vocab: its.filter(it => it._type === 'vocab'), grammar: its.filter(it => it._type === 'grammar'), kanji: its.filter(it => it._type === 'kanji') };
    const nv = pool.vocab.length;
    view.innerHTML = `<div class="page-wait">${loadingHTML('Đang soạn câu hỏi…')}</div>`;
    const qs = await buildPoolQsAsync(pool, { jv: Math.ceil(nv / 2), vj: Math.floor(nv / 2), kh: pool.kanji.length, g: pool.grammar.length }, sc.L);
    if (!qs) return;
    // trả lời đúng: chỉ đếm cho nhãn (không lên hộp, mai vẫn hỏi lại) · sai: về hộp 1
    for (const q of qs) { const id = q.review?.id; if (id) q.onAnswer = ok => (ok ? rlMark(id, true) : review(id, q.review.dir, false)); }
    ctx.backTo = href(sc);
    runDrill(view, shuffle(qs), ctx, { title: `Học lại · ${sc.name}`, noReview: true, again: () => ctx.go(href(sc), true) });
  };
}
