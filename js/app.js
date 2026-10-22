import { heartRoute } from './heart.js';
import { $, esc, icon, toast, toastNewPage, debounce, fmtDate, setFuriFade } from './util.js';
import { loadSettings, S } from './settings.js';
import { D, loadAll, TOPICS } from './data.js';
import { loadProgress, stats, status as stStatus, progVersion } from './srs.js';
import { renderQuizSetup, runQuiz, buildQuestions, selectItems } from './quiz.js';
import { runLearn } from './learn.js';
import { renderHub, renderCau, renderNgPhap, renderThe, renderTinhTu, renderDem, renderMixed, mixedDue } from './practice.js';
import { renderMatchSetup } from './match.js';
import { renderGrammarList, renderGrammar } from './grammar.js';
import { renderGrammarPractice, renderMockSetup, buildGrammarQs } from './gdrill.js';
import { renderKanjiList, renderKanjiQuizSetup, openKanji, kanjiOfDay, buildKanjiQs, poemHTML } from './kanji.js';
import { runDrill } from './drill.js';
import { renderWordList, renderWordForm, showWord } from './words.js';
import { renderData, receiveSetup } from './datapage.js';
import { renderSettings } from './settingspage.js';
import { syncNow, getSyncCfg, lastSync, lastSyncError } from './sync.js';
import { emptyState } from './ui.js';
import { initNav, pageName } from './nav.js';
import { renderLevelHub, remindHTML } from './level.js';
import { renderJlptHub } from './jlpt.js';
import { renderStart, renderRoadmap, planToday, forecast, needsOnboard, roadmapCardHTML } from './roadmap.js';
import { renderKana } from './kana.js';
import { renderForms } from './forms.js';
import { renderDich } from './dich.js';
import { renderGuides, renderGuide } from './guides.js';
import { setPrefs } from './data.js';
import { renderLesson, learnLesson, renderLessonSents, runLessonTest, runLessonReview, runTongHop, renderCanDo } from './lesson.js';
import { renderDocList, renderDoc } from './reader.js';
import { openGrammarSheet } from './explain.js';
import { initSeason, seasonChipHTML } from './season.js';
import { initBackFab, backFabRoute } from './backfab.js';
import { initMarks, renderMarked } from './marks.js';
import { bumpGen } from './lazy.js';
import { relearnKanji } from './bare.js';
import { setRelearn } from './srs.js';
import { renderGuessLearn, renderHanViet, renderDenHam, renderGiongChu, renderCungDau, runQuick3, runRecap } from './dot6.js';

const view = $('#view');
let leave = [];
const ctx = {
  onLeave: f => leave.push(f),
  go: (hash, force) => { if (location.hash === hash || (hash === '#/' && !location.hash)) { if (force) route(); } else location.hash = hash; },
  sessionDone: () => scheduleSync(),
  refreshSync: () => syncBadge(),
};

const NAV = [
  ['#/', 'home', 'Trang chủ', /^(?:|trinhdo|thithu|lotrinh|batdau|kana|noiduoc|nhanh3|nhaclai|huongdan(?:\/.*)?|(?:bai|onbai|tonghop)\/.*)$/],
  ['#/luyen', 'quiz', 'Luyện tập', /^(luyen|hoc|on$|moi|ghep|onhon|dich|doc|giayto)/],
  ['#/chuhan', 'han', 'Chữ Hán', /^(chuhan|onchu)/],
  ['#/nguphap', 'book', 'Ngữ pháp', /^(nguphap|onngu)/],
  ['#/kho', 'list', 'Kho từ', /^(kho|them|sua)/],
  ['#/dulieu', 'box', 'Dữ liệu', /^(dulieu|nhan)/, 'rail'],
  ['#/caidat', 'gear', 'Cài đặt', /^caidat(\/|$)/, 'rail'],
];

const ROUTES = [
  [/^$/, renderHome],
  [/^luyen$/, v => renderHub(v)],
  [/^luyen\/cau$/, v => renderCau(v, ctx)],
  [/^luyen\/ngphap$/, v => renderNgPhap(v, ctx)],
  [/^luyen\/the$/, v => renderThe(v, ctx)],
  [/^luyen\/tinhtu$/, v => renderTinhTu(v, ctx)],
  [/^luyen\/dem$/, v => renderDem(v, ctx)],
  [/^luyen\/chia(?:\?g=(.+))?$/, (v, m) => renderForms(v, ctx, m[1] ? decodeURIComponent(m[1]) : null)],
  [/^onhon$/, v => renderMixed(v, ctx)],
  [/^hoc$/, v => renderQuizSetup(v, ctx)],
  [/^on$/, v => startQuick(v, 'due')],
  [/^moi\/doan$/, v => renderGuessLearn(v, ctx)],
  [/^luyen\/hanviet$/, v => renderHanViet(v, ctx)],
  [/^luyen\/denham$/, v => renderDenHam(v, ctx)],
  [/^luyen\/giongchu$/, v => renderGiongChu(v, ctx)],
  [/^luyen\/cungdau$/, v => renderCungDau(v, ctx)],
  // v54 (đợt 7): lợi thế của người Việt — tải khi mở
  [/^luyen\/amon$/, async v => (await import('./dot7.js')).renderAmOn(v, ctx)],
  [/^luyen\/trotu$/, async v => (await import('./dot7.js')).renderTroTu(v, ctx)],
  [/^luyen\/katakana$/, async v => (await import('./dot7.js')).renderKata(v, ctx)],
  [/^luyen\/truongam$/, async v => (await import('./dot7.js')).renderTruongAm(v, ctx)],
  [/^giayto$/, async v => (await import('./giayto.js')).renderDocs(v, ctx)],
  [/^giayto\/([^/?]+)(?:\/(hoi))?$/, async (v, m) => { const G = await import('./giayto.js'); return m[2] ? G.runDocQuiz(v, ctx, decodeURIComponent(m[1])) : G.renderPaper(v, ctx, decodeURIComponent(m[1])); }],
  [/^nhanh3$/, v => runQuick3(v, ctx)],
  [/^nhaclai$/, v => runRecap(v, ctx)],
  [/^moi$/, v => runLearn(v, selectItems({ source: 'new' }).slice(0, S.qCount), ctx, { again: () => ctx.go('#/moi', true) })],
  [/^moi\?p=(.+)$/, (v, m) => learnPack(v, decodeURIComponent(m[1]))],
  [/^ghep$/, v => renderMatchSetup(v, ctx)],
  [/^danhdau$/, v => renderMarked(v, ctx)],
  [/^chuhan$/, v => renderKanjiList(v)],
  [/^chuhan\/on$/, v => renderKanjiQuizSetup(v, ctx)],
  [/^chuhan\/moi$/, v => newKanji(v)],
  [/^onchu$/, v => quickKanji(v)],
  [/^nguphap$/, v => renderGrammarList(v)],
  [/^nguphap\/luyen(?:\?g=(.+))?$/, (v, m) => renderGrammarPractice(v, ctx, m[1] ? decodeURIComponent(m[1]) : null)],
  [/^nguphap\/luyen\?t=(\w+)$/, (v, m) => renderGrammarPractice(v, ctx, null, m[1])],
  [/^nguphap\/thithu$/, v => renderMockSetup(v, ctx)],
  [/^nguphap\/hieu\?g=(.+)$/, async (v, m) => (await import('./gdrill.js')).runGrammarHieu(v, ctx, decodeURIComponent(m[1]).split(','))],
  [/^nguphap\/tron\?g=(.+)$/, async (v, m) => (await import('./gdrill.js')).runGrammarMix(v, ctx, decodeURIComponent(m[1]))],
  [/^onngu$/, v => quickGrammar(v)],
  [/^nguphap\/nhom$/, async v => (await import('./gnhom.js')).renderGroups(v, ctx)],
  [/^nguphap\/nhom\/([a-z]+)$/, async (v, m) => (await import('./gnhom.js')).renderGroup(v, ctx, m[1])],
  [/^nguphap\/nhom\/([a-z]+)\/luyen$/, async (v, m) => (await import('./gnhom.js')).runGroupDrill(v, ctx, m[1])],
  [/^nguphap\/(.+)$/, (v, m) => renderGrammar(v, decodeURIComponent(m[1]))],
  [/^kho$/, v => renderWordList(v, ctx)],
  [/^them$/, v => renderWordForm(v, ctx)],
  [/^sua\/(.+)$/, (v, m) => renderWordForm(v, ctx, decodeURIComponent(m[1]))],
  [/^dulieu$/, v => renderData(v, ctx)],
  [/^nhan\?c=([A-Za-z0-9_-]+)$/, (v, m) => receiveSetup(v, ctx, m[1])],
  [/^caidat(?:\/([a-z]+))?$/, (v, m) => renderSettings(v, ctx, m[1])],
  [/^dich$/, v => renderDich(v, ctx)],
  [/^dich\?on$/, v => renderDich(v, ctx, { src: 'due', learned: false })],
  [/^trinhdo$/, v => renderLevelHub(v, ctx)],
  [/^thithu$/, v => renderJlptHub(v, ctx)],
  [/^lotrinh$/, v => renderRoadmap(v, ctx)],
  [/^batdau$/, v => renderStart(v, ctx)],
  [/^kana$/, v => renderKana(v, ctx)],
  [/^huongdan$/, v => renderGuides(v)],
  [/^huongdan\/(.+)$/, (v, m) => renderGuide(v, decodeURIComponent(m[1]))],
  [/^bai\/([^/?]+)(?:\?b=(\d))?$/, (v, m) => renderLesson(v, ctx, decodeURIComponent(m[1]), m[2] != null ? +m[2] : null)],
  [/^bai\/([^/?]+)\/hoc$/, (v, m) => learnLesson(v, ctx, decodeURIComponent(m[1]))],
  [/^bai\/([^/?]+)\/cau$/, (v, m) => renderLessonSents(v, ctx, decodeURIComponent(m[1]))],
  [/^bai\/([^/?]+)\/kiemtra$/, (v, m) => runLessonTest(v, ctx, decodeURIComponent(m[1]))],
  [/^onbai\/([^/?]+)$/, (v, m) => runLessonReview(v, ctx, decodeURIComponent(m[1]))],
  [/^gocau\/([^/?]+)$/, async (v, m) => (await import('./gocau.js')).runGoCau(v, ctx, decodeURIComponent(m[1]))],
  [/^hoclai\/([^/?]+)(?:\/(kt|hoc))?$/, async (v, m) => { const R = await import('./relearn.js'); const k = decodeURIComponent(m[1]); return m[2] === 'kt' ? R.runQuickCheck(v, ctx, k) : m[2] === 'hoc' ? R.runRelearnItems(v, ctx, k) : R.renderRelearn(v, ctx, k); }],
  [/^tonghop\/([^/?]+)$/, (v, m) => runTongHop(v, ctx, decodeURIComponent(m[1]))],
  [/^noiduoc$/, v => renderCanDo(v)],
  [/^doc$/, v => renderDocList(v)],
  [/^doc\/([^/?]+)(?:\?m=(\w+))?$/, (v, m) => renderDoc(v, ctx, decodeURIComponent(m[1]), m[2] || 'doc')],
];

// v39: trang dựng lâu (lần trước ≥ 35 ms, hoặc trang vốn nặng) → hiện ngay khung trang + thanh tiến trình mảnh ở mép trên,
// nhường trình duyệt vẽ khung đó rồi mới dựng nội dung (khung hình sau). Trang nhanh dựng thẳng, không nhấp nháy.
const COST = new Map();
// v40: Lộ trình, Luyện tập, bài kiểm tra… nay tự dựng từng phần / có vòng ⟳ riêng → chỉ còn vài trang lần đầu mở còn nặng
const HEAVY0 = /^(chuhan$|nhanh3|onhon|bai\/)/;
const costKey = h => h.replace(/\?.*$/, '').replace(/^(bai|doc|nguphap|sua|tonghop|onbai)\/.+$/, '$1/*');
let pendT = 0, pendN = 0;
function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const c = COST.get(costKey(h)) ?? (HEAVY0.test(h) ? 80 : 0);
  clearTimeout(pendT);
  if (c < 35 || !view.firstElementChild) return routeNow();
  const my = ++pendN;
  progressBar(true);
  view.innerHTML = `<div class="page page-skel" aria-busy="true"><h1 class="h1">${esc(pageName('#/' + h))}</h1>
    <div class="skel skel-l"></div><div class="skel"></div><div class="skel"></div><div class="skel skel-s"></div></div>`;
  window.scrollTo(0, 0);
  requestAnimationFrame(() => { pendT = setTimeout(() => { if (my === pendN) routeNow(); }, 0); });
}
let pbT = 0;
function progressBar(on) {
  let b = document.getElementById('tn-progress');
  if (!b) { b = document.createElement('div'); b.id = 'tn-progress'; b.setAttribute('aria-hidden', 'true'); b.innerHTML = '<i></i>'; document.body.appendChild(b); }
  clearTimeout(pbT);
  if (on) { b.classList.remove('is-done'); b.classList.add('is-on'); }
  else if (b.classList.contains('is-on')) { b.classList.add('is-done'); pbT = setTimeout(() => b.classList.remove('is-on', 'is-done'), 260); }
}
function routeNow() {
  const t0 = performance.now(), hk = costKey(location.hash.replace(/^#\/?/, ''));
  try { routeBody(); } finally { COST.set(hk, performance.now() - t0); progressBar(false); }
}
// v39: chạm vào nút / thẻ / dòng → vòng sáng loang ra ngay dưới ngón tay (chạy trên GPU, vẫn chạy khi máy đang bận dựng trang)
function initTapFx() {
  const SEL = 'a, button, .btn, .chip, .opt, .tile, .mode, label.check';
  addEventListener('pointerdown', e => {
    if (e.button > 0 || document.documentElement.classList.contains('calm')) return;
    const t = e.target.closest?.(SEL);
    if (!t || t.disabled || t.closest('.back-fab, input, select, textarea')) return;
    const r = document.createElement('span');
    r.className = 'tap-fx'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    r.addEventListener('animationend', () => r.remove());
    setTimeout(() => r.remove(), 700);
  }, { passive: true, capture: true });
}
// v39: lúc máy rảnh sau khi mở app, tính sẵn các bảng dùng chung (kho câu, danh sách bài, chỉ mục chữ Hán, trạng thái bài…)
// để bấm sang Lộ trình, Ôn hỗn hợp, Luyện dịch, bài học… không phải tính lần đầu. Mỗi việc một lượt rảnh, không chặn máy.
async function warmUp() {
  const idle = f => new Promise(res => (window.requestIdleCallback ? requestIdleCallback(() => { try { f(); } catch { } res(); }, { timeout: 2000 }) : setTimeout(() => { try { f(); } catch { } res(); }, 50)));
  const [{ sentences }, L, { kanjiOfDay }, { mixedDue }, { warmMeanings }, { nextFrame }] = await Promise.all([import('./dich.js'), import('./lesson.js'), import('./kanji.js'), import('./practice.js'), import('./quiz.js'), import('./lazy.js')]);
  const { warmGrammar } = await import('./gdrill.js');
  const jobs = [() => sentences(), () => L.allLessons(), () => kanjiOfDay(), () => L.warmLessons?.(), () => mixedDue(), () => warmGrammar()];
  for (const j of jobs) await idle(j);
  await new Promise(r => idle(r));
  await warmMeanings(nextFrame); // v40: tách nghĩa cả kho từng mẻ nhỏ → câu hỏi đầu tiên của lượt không phải chờ
  await (await import('./practice.js')).warmCau(nextFrame);
  window.__tnWarm = true; // đã tính sẵn xong (bài kiểm tự động chờ cờ này)
}

function routeBody() {
  // nhớ trang trước (để nút "← Về …" của lượt học tự bắt đầu quay về đúng chỗ)
  const cur = location.hash || '#/';
  if (cur !== ctx.curHash) { ctx.prevHash = ctx.curHash; ctx.curHash = cur; }
  // v32: đánh số mốc lịch sử trong app (nút ‹ nổi biết còn trang trước để lùi hay không)
  const hs = history.state;
  if (hs?.tnIdx == null && !hs?.tntRun) {
    const idx = ctx.idx == null ? 0 : ctx.replaceNext ? ctx.idx : ctx.idx + 1;
    try { history.replaceState({ ...(hs || {}), tnIdx: idx }, ''); } catch { }
  }
  ctx.replaceNext = false;
  ctx.idx = history.state?.tnIdx ?? ctx.idx ?? 0;
  ctx.backTo = null; ctx.inRun = false;
  bumpGen(); // v40: việc dựng dần của trang cũ tự dừng
  leave.forEach(f => { try { f(); } catch { } });
  leave = [];
  // chuyển trang (kể cả nút Back của điện thoại) thì đóng mọi tờ thông tin đang mở
  document.querySelectorAll('.sheet-wrap').forEach(w => w.querySelector('.sheet-x')?.click());
  const h = location.hash.replace(/^#\/?/, '');
  backFabRoute(h);
  heartRoute(h); // tim tạm ở bài học: sang trang khác thì bỏ
  const r = ROUTES.find(([re]) => re.test(h));
  // mỗi lần chuyển trang dùng một khung mới — trình nghe sự kiện của trang cũ bị bỏ theo khung cũ
  const fromSkel = !!view.querySelector('.page-skel'); // v39: thay khung trang bằng nội dung → chỉ mờ nhanh, không trượt lần nữa
  view.innerHTML = '';
  const page = document.createElement('div');
  page.className = fromSkel ? 'page from-skel' : 'page';
  view.appendChild(page);
  if (r) r[1](page, h.match(r[0]));
  else page.innerHTML = emptyState('Không có trang này.', '<a class="btn btn-ghost" href="#/">Về trang chủ</a>');
  document.querySelectorAll('.nav a').forEach(a => {
    const n = NAV.find(x => x[0] === a.getAttribute('href'));
    if (n?.[3].test(h)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  toastNewPage();
}

function startQuick(v, source) {
  const o = { dir: source === 'new' ? 'jv' : 'mix', script: S.script, source, levels: [], topics: [], count: source === 'new' ? S.qCount : 50 };
  const qs = buildQuestions(o);
  if (!qs.length) {
    v.innerHTML = emptyState(source === 'due' ? 'Không có từ nào đến hạn ôn. Học thêm từ mới nhé.' : 'Đã học hết từ mới trong kho. Nhập thêm gói từ ở trang Dữ liệu.',
      '<a class="btn btn-primary" href="#/hoc">Chọn lượt học khác</a>');
    return;
  }
  runQuiz(v, qs, o, ctx);
}
function quickKanji(v) {
  const qs = buildKanjiQs({ dir: 'mix', source: 'due', count: 30 });
  if (!qs.length) { v.innerHTML = emptyState('Không có chữ Hán nào đến hạn ôn.', '<a class="btn btn-primary" href="#/chuhan/on">Ôn chữ Hán</a>'); return; }
  runDrill(v, qs, ctx, { title: 'Ôn chữ Hán', again: () => ctx.go('#/chuhan/on') });
}
// Học từ mới của một gói (từ trang Lộ trình)
function learnPack(v, id) {
  const items = selectItems({ source: 'new' }).filter(it => it._pack === id).slice(0, S.qCount);
  ctx.backTo = '#/lotrinh';
  runLearn(v, items, ctx, { again: () => ctx.go('#/moi?p=' + encodeURIComponent(id), true) });
}
// Chữ Hán mới (Kế hoạch hôm nay): hỏi chữ chưa học, cấp thấp trước
function newKanji(v) {
  // v41: chữ gắn nhãn "cần học lại" (nút "Chưa học") lên đầu; trả lời đúng ở đây là đã học lại → gỡ nhãn
  const rl = relearnKanji();
  const rq = rl.length ? buildKanjiQs({ dir: 'mix', source: 'all', chars: rl.map(k => k.char), count: 10 }) : [];
  rq.forEach(q => { const id = q.review?.id; if (id) q.onAnswer = ok => { if (ok) setRelearn(id, false); }; });
  const qs = [...rq, ...buildKanjiQs({ dir: 'mix', source: 'new', count: 999 }).sort((a, b) => LEVEL_I(a.level) - LEVEL_I(b.level))].slice(0, Math.max(10, rq.length));
  if (!qs.length) { v.innerHTML = emptyState('Đã học hết thẻ chữ Hán trong kho.', '<a class="btn btn-primary" href="#/onchu">Ôn chữ Hán</a>'); return; }
  runDrill(v, qs, ctx, { title: 'Chữ Hán mới', again: () => ctx.go('#/chuhan/moi', true) });
}
const LEVEL_I = l => ['N5', 'N4', 'N3', 'N2', 'N1'].indexOf(l);
function quickGrammar(v) {
  const qs = buildGrammarQs({ type: 'mix', source: 'due', count: 20 });
  if (!qs.length) { v.innerHTML = emptyState('Không có mẫu ngữ pháp nào đến hạn ôn.', '<a class="btn btn-primary" href="#/nguphap/luyen">Luyện ngữ pháp</a>'); return; }
  runDrill(v, qs, ctx, { title: 'Ôn ngữ pháp', again: () => ctx.go('#/nguphap/luyen') });
}

function renderHome(v) {
  const st = stats(D.vocab), sk = stats(D.kanji), sg = stats(D.grammar);
  const pct = (n, t) => (t ? (n / t) * 100 : 0);
  const topics = Object.keys(TOPICS).map(t => {
    const items = D.vocab.filter(it => it.topics.includes(t));
    return [t, items.length, stats(items).known];
  }).filter(x => x[1]);
  const kd = kanjiOfDay();
  const md = mixedDue(), nDue = md.vocab.length + md.kanji.length + md.grammar.length + md.sent.length;
  const S_mins = () => ` <small>· ${D.prefs.mins || 20} phút</small>`;
  const task = (label, n, unit, href, btn) => n ? `<li class="task"><span><b>${n}</b> ${unit}</span><span class="muted small">${label}</span><a class="btn btn-ghost btn-sm" href="${href}">${btn}</a></li>` : '';
  const tasks = [
    task('Từ vựng đến hạn ôn', st.due, 'từ', '#/on', 'Ôn từ'),
    task('Chữ Hán đến hạn ôn', sk.due, 'chữ', '#/onchu', 'Ôn chữ'),
    task('Mẫu ngữ pháp đến hạn ôn', sg.due, 'mẫu', '#/onngu', 'Luyện'),
    task('Câu dịch đến hạn ôn', md.sent.length, 'câu', '#/dich?on', 'Dịch'),
  ].join('');
  const bar = (label, s) => s.total ? `<tr><th scope="row">${label}</th><td><span class="mini"><i style="width:${pct(s.known, s.total)}%"></i></span></td><td class="num">${s.known}/${s.total}</td></tr>` : '';
  // Kế hoạch hôm nay: việc đầu tiên chưa xong là nút chính
  const plan = planToday();
  const firstTodo = plan.findIndex(x => !x.done);
  const planList = plan.map((x, i) => `<li class="plan-i${x.done ? ' is-done' : ''}"><span class="plan-c" aria-hidden="true">${x.done ? '✓' : ''}</span><span class="plan-t"><b>${esc(x.label)}</b><small class="muted" ${/[ぁ-ん一-龯]/.test(x.sub) ? 'lang="ja"' : ''}>${esc(x.sub)}</small></span>${x.done ? '<span class="sr-only">đã xong</span>' : `<a class="btn ${i === firstTodo ? 'btn-primary' : 'btn-ghost'} btn-sm" href="${x.href}">${esc(x.btn)}</a>`}</li>`).join('');
  const fc = forecast();
  v.innerHTML = `
    ${needsOnboard() ? `<section class="card onboard"><h2 class="h2">Chào bạn!</h2><p>Trả lời 3 câu (mục tiêu, mỗi ngày học bao lâu, đang ở đâu) để app xếp kế hoạch hằng ngày và lộ trình.</p>
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="skipob">Để sau</button><a class="btn btn-primary" href="#/batdau">Bắt đầu</a></div></section>` : ''}
    <section class="today">
      ${seasonChipHTML()}
      <p class="today-l">Hôm nay${S_mins()}</p>
      ${st.total || sk.total || sg.total
        ? `<ul class="plan-l">${planList}</ul>
           <a class="btn btn-block quick3" href="#/nhanh3">${icon('quiz')}<span><b>Ôn nhanh 3 phút</b><small>${nDue ? `${nDue} mục đến hạn · mục quá hạn lâu nhất hỏi trước` : 'nhắc lại từ mới học 7 ngày qua'}</small></span></a>
           ${nDue ? `<details class="today-more"><summary>Ôn riêng từng loại · ${nDue} mục đến hạn</summary><ul class="tasks">${tasks}</ul></details>` : ''}
           ${fc ? `<p class="small muted fc">${fc} <a href="#/lotrinh">Lộ trình →</a></p>` : ''}`
        : `<p class="today-n">Chưa có dữ liệu.</p><a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>`}
      ${st.newToday ? `<p class="small muted">Hôm nay đã học ${st.newToday} từ mới.</p>` : ''}
      ${remindHTML()}
    </section>

    ${st.total || sk.total || sg.total ? roadmapCardHTML() : ''}

    ${D.errors.length ? `<div class="warn">${D.errors.map(esc).join('<br>')}</div>` : ''}

    ${kd ? `<section class="card kday" data-bare>
      <h2 class="h2">Chữ Hán hôm nay</h2>
      <button type="button" class="kday-btn" data-kopen="${esc(kd.char)}">
        <span class="kday-c" lang="ja">${esc(kd.char)}</span>
        <span class="kday-t"><b>${esc(kd.hv)}</b><span>${esc(kd.nghia || '')}</span></span>
      </button>
      ${(kd.tho || []).length ? `<p class="kc-poem">${poemHTML(kd.tho)}</p>` : ''}
    </section>` : ''}

    <section class="card">
      <h2 class="h2">Tiến độ</h2>
      <p class="sub-label">Từ vựng</p>
      <div class="stack-bar" role="img" aria-label="Đã thuộc ${st.known}, đang học ${st.learning}, chưa học ${st.new}">
        <i class="sb-known" style="width:${pct(st.known, st.total)}%"></i><i class="sb-learning" style="width:${pct(st.learning, st.total)}%"></i>
      </div>
      <ul class="legend">
        <li><span class="dot dot-known"></span>Đã thuộc <b>${st.known}</b></li>
        <li><span class="dot dot-learning"></span>Đang học <b>${st.learning}</b></li>
        <li><span class="dot dot-new"></span>Chưa học <b>${st.new}</b></li>
      </ul>
      <table class="topics"><tbody>${topics.map(([t, n, k]) => `<tr><th scope="row">${esc(TOPICS[t])}</th><td><span class="mini"><i style="width:${pct(k, n)}%"></i></span></td><td class="num">${k}/${n}</td></tr>`).join('')}</tbody></table>
      <p class="sub-label">Chữ Hán và ngữ pháp <small>(số đã thuộc / tổng)</small></p>
      <table class="topics"><tbody>${bar('Chữ Hán', sk)}${bar('Ngữ pháp', sg)}</tbody></table>
    </section>

    <nav class="modes" aria-label="Các phần học">
      ${[
      ['#/lotrinh', 'route', 'Lộ trình', 'Chặng Kana → N5 → N4 → N3 → N2, chia thành từng bài học'],
      ['#/trinhdo', 'gauge', 'Kiểm tra trình độ', 'Xếp lớp nhanh, thi vượt cấp, đề thi thử JLPT, kiểm tra theo gói'],
      ['#/luyen', 'quiz', 'Luyện tập', 'Học từ mới, trắc nghiệm, ghép cặp, ghép câu, thể động từ, tính từ, đếm số'],
      ['#/chuhan', 'han', 'Chữ Hán', `${D.kanji.length} thẻ chữ, câu lục bát nhớ mặt chữ, ôn chữ Hán`],
      ['#/nguphap', 'book', 'Ngữ pháp', `${D.grammar.length} mẫu — bài học, luyện tập, thi thử`],
      ['#/kho', 'list', 'Kho từ', `${st.total} từ — tìm, sửa, thêm từ mới`],
      ['#/noiduoc', 'chat', 'Nói được gì', 'Những việc đã làm được bằng tiếng Nhật sau mỗi bài'],
      ['#/dulieu', 'box', 'Dữ liệu & đồng bộ', 'Nhập gói từ skill, sao lưu, GitHub'],
      ['#/huongdan', 'help', 'Hướng dẫn học', 'Cho người mới, theo cấp, 特定技能2号, giấy tờ thuế'],
      ['#/caidat', 'gear', 'Cài đặt', 'Cỡ chữ, cỡ nút, màu nền, giọng đọc'],
    ].map(([h, ic, t, d]) => `<a class="mode" href="${h}">${icon(ic)}<span><b>${t}</b><small ${/[一-龯]/.test(d) ? 'lang="ja"' : ''}>${esc(d)}</small></span></a>`).join('')}
    </nav>`;
  const sk0 = v.querySelector('[data-act=skipob]');
  if (sk0) sk0.onclick = async () => { await setPrefs({ onboard: -1 }); scheduleSync(); route(); };
}

// ---- khung: thanh trên + điều hướng ----
function chrome() {
  $('#nav').innerHTML = NAV.map(([h, ic, t, , only]) => `<a href="${h}" class="${only === 'rail' ? 'rail-only' : ''}">${icon(ic)}<span>${t}</span></a>`).join('');
  $('#topbar').innerHTML = `<a class="brand" href="#/"><span class="brand-mark" lang="ja">実</span><span>Tiếng Nhật Thực Chiến</span></a>
    <div class="top-actions"><a class="icon-btn sync-badge" href="#/dulieu" aria-label="Đồng bộ">${icon('sync')}</a><a class="icon-btn mob-only" href="#/caidat" aria-label="Cài đặt">${icon('gear')}</a></div>`;
}
async function syncBadge() {
  const b = $('.sync-badge'); if (!b) return;
  const c = await getSyncCfg(), err = await lastSyncError(), ls = await lastSync();
  b.dataset.state = !c.token ? 'off' : err ? 'err' : 'ok';
  b.title = !c.token ? 'Máy này chưa lưu token đồng bộ' : err ? `Lỗi đồng bộ: ${err}` : `Đồng bộ lần cuối ${fmtDate(ls)}`;
  b.setAttribute('aria-label', b.title);
}
const scheduleSync = debounce(async () => { const r = await syncNow(); syncBadge(); if (r.error) toast('Chưa đồng bộ được: ' + r.error); }, 1500);

function registerSW() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    if (reg.waiting) reg.waiting.postMessage('skipWaiting');
  }).catch(() => { });
  // Bản mới đã cài → tải lại trang. Đang giữa lượt học thì chờ xong lượt (về trang khác) mới tải lại.
  let done = false;
  const reload = () => {
    if (done) return; done = true;
    try { sessionStorage.setItem('tn-updated', '1'); } catch { }
    location.reload();
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!had) return;
    if (document.querySelector('.run')) window.addEventListener('hashchange', reload, { once: true });
    else reload();
  });
}
function announceUpdate() {
  try {
    if (sessionStorage.getItem('tn-updated')) { sessionStorage.removeItem('tn-updated'); toast('Đã cập nhật app lên bản mới.'); }
  } catch { }
}

async function init() {
  await loadSettings();
  try { initSeason(); } catch (e) { console.warn('season', e); }
  // v46: xin trình duyệt giữ dữ liệu lâu dài (cài đặt, tiến độ) — không bị xoá khi máy thiếu bộ nhớ
  try { navigator.storage?.persist?.().catch(() => { }); } catch { }
  initMarks();
  initTapFx();
  chrome();
  try { initBackFab(ctx); } catch (e) { console.warn('backfab', e); }
  import('./watch.js').then(m => m.initWatch()).catch(e => console.warn('watch', e)); // v53: đồng hồ lộ cơ nổi
  initThemeColor();
  initFuriFade();
  // v32: thanh trên trong suốt; cuộn xuống thì thành kính mờ để chữ trang không đè tiêu đề
  const tb = $('#topbar'), tbSync = () => tb.classList.toggle('is-scrolled', scrollY > 4);
  addEventListener('scroll', tbSync, { passive: true }); tbSync();
  view.innerHTML = '<p class="muted loading">Đang tải dữ liệu…</p>';
  import('./hvbay.js').then(m => m.loadHvBay()); // v50: nhãn "bẫy Hán Việt" (tải song song, không chặn mở app)
  import('./docfit.js').then(m => m.loadDocWords()); // v51: % từ đã học của từng bài đọc
  try { await loadAll(); } catch (e) { D.errors.push('Lỗi tải dữ liệu: ' + (e?.message || e)); }
  await loadProgress();
  window.addEventListener('hashchange', route);
  initNav(ctx);
  document.addEventListener('click', e => {
    const ko = e.target.closest('[data-kopen]');
    if (ko) { e.preventDefault(); openKanji(ko.dataset.kopen); return; }
    const go = e.target.closest('[data-gopen]');
    if (go) { e.preventDefault(); openGrammarSheet(go.dataset.gopen); return; }
    const wo = e.target.closest('[data-wopen]');
    if (wo) { e.preventDefault(); showWord(wo.dataset.wopen, ctx, () => { }); return; }
    const k = e.target.closest('.kj');
    if (!k || k.closest('button, a, input, textarea, select, label, summary, [data-nokj]')) return;
    openKanji(k.textContent);
  });
  route();
  // v40: tính sẵn lúc rảnh SAU khi đã tải xong dữ liệu (v39 hẹn 1,2 giây từ lúc mở app — trên điện thoại dữ liệu chưa tải xong nên tính sẵn trên kho rỗng)
  setTimeout(warmUp, 1200);
  announceUpdate();
  registerSW();
  try { navigator.storage?.persist?.(); } catch { }
  syncBadge();
  const r = await syncNow();
  syncBadge();
  if (r.ok && /^#?\/?$/.test(location.hash)) route();
  window.addEventListener('online', scheduleSync);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') syncNow().then(syncBadge);
    // mở lại app từ nền (không tải lại trang) → hỏi xem có bản app mới không
    else navigator.serviceWorker?.getRegistration().then(r => r?.update()).catch(() => { });
  });
}
init();

// v53: app không còn chạy toàn màn hình → thanh trạng thái của điện thoại (giờ, pin) hiện lại; cho nó cùng màu thanh trên cùng của app
// v54: furigana mờ dần — chữ Hán đã thuộc (thẻ chữ ở hộp 5 trở lên) không hiện furigana; chạm để hiện lại
function initFuriFade() {
  let pv = -1, known = new Set();
  const isKnown = c => {
    if (pv !== progVersion()) { pv = progVersion(); known = new Set(D.kanji.filter(k => stStatus(k) === 'known').map(k => k.char)); }
    return known.has(c);
  };
  const KJ = /[\u4E00-\u9FFF\u3400-\u4DBF]/g;
  const apply = () => {
    const m = S.furiFade || 'off', r = document.documentElement;
    r.classList.toggle('ff-doc', m === 'doc'); r.classList.toggle('ff-all', m === 'all');
    setFuriFade(m === 'off' ? null : t => { const ks = String(t).match(KJ); return !!ks && ks.every(isKnown); });
  };
  apply();
  addEventListener('tn-settings', apply);
  // chạm lần đầu vào chữ đang ẩn furigana: chỉ hiện furigana (lần sau mới mở thẻ chữ); nút, đáp án thì để nguyên
  document.addEventListener('click', e => {
    const r = e.target.closest?.('ruby.rf:not(.show)');
    if (!r || r.closest('button, a, label, [role=button]')) return;
    const rt = r.querySelector('rt');
    if (!rt || getComputedStyle(rt).visibility !== 'hidden') return;
    r.classList.add('show'); e.stopPropagation(); e.preventDefault();
  }, true);
}
function initThemeColor() {
  const meta = document.querySelector('meta[name=theme-color]');
  if (!meta) return;
  let q = 0;
  const sync = () => {
    q = 0;
    const tb = document.getElementById('topbar'); if (!tb) return;
    const m = (getComputedStyle(tb).backgroundColor.match(/[\d.]+/g) || []).map(Number);
    if (m.length < 3) return;
    let [r, g, b, a = 1] = m;
    if (a < 1) { // thanh trên trong suốt (nằm trên cảnh nền): trộn với màu nền trang
      const bm = (getComputedStyle(document.documentElement).backgroundColor.match(/[\d.]+/g) || [235, 240, 243]).map(Number);
      r = r * a + bm[0] * (1 - a); g = g * a + bm[1] * (1 - a); b = b * a + bm[2] * (1 - a);
    }
    const c = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    if (meta.content !== c) meta.content = c;
  };
  const later = () => { if (!q) q = requestAnimationFrame(sync); setTimeout(later2, 320); }; // thanh trên đổi màu có chuyển tiếp .25 s
  const later2 = () => { if (!q) q = requestAnimationFrame(sync); };
  const mo = new MutationObserver(later);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-theme'] });
  const tb = document.getElementById('topbar'); if (tb) mo.observe(tb, { attributes: true, attributeFilter: ['class'] });
  addEventListener('tn-settings', later);
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', later);
  later();
}
