import { $, esc, icon, toast, debounce, fmtDate } from './util.js';
import { loadSettings, S } from './settings.js';
import { D, loadAll, TOPICS } from './data.js';
import { loadProgress, stats } from './srs.js';
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
import { initNav } from './nav.js';
import { renderLevelHub, remindHTML } from './level.js';
import { renderStart, renderRoadmap, planToday, forecast, needsOnboard, roadmapCardHTML } from './roadmap.js';
import { renderKana } from './kana.js';
import { renderForms } from './forms.js';
import { renderDich } from './dich.js';
import { renderGuides, renderGuide } from './guides.js';
import { setPrefs } from './data.js';

const view = $('#view');
let leave = [];
const ctx = {
  onLeave: f => leave.push(f),
  go: (hash, force) => { if (location.hash === hash || (hash === '#/' && !location.hash)) { if (force) route(); } else location.hash = hash; },
  sessionDone: () => scheduleSync(),
  refreshSync: () => syncBadge(),
};

const NAV = [
  ['#/', 'home', 'Trang chủ', /^(?:|trinhdo|lotrinh|batdau|kana|huongdan(?:\/.*)?)$/],
  ['#/luyen', 'quiz', 'Luyện tập', /^(luyen|hoc|on|moi|ghep|onhon|dich)/],
  ['#/chuhan', 'han', 'Chữ Hán', /^(chuhan|onchu)/],
  ['#/nguphap', 'book', 'Ngữ pháp', /^(nguphap|onngu)/],
  ['#/kho', 'list', 'Kho từ', /^(kho|them|sua)/],
  ['#/dulieu', 'box', 'Dữ liệu', /^(dulieu|nhan)/, 'rail'],
  ['#/caidat', 'gear', 'Cài đặt', /^caidat$/, 'rail'],
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
  [/^moi$/, v => runLearn(v, selectItems({ source: 'new' }).slice(0, S.qCount), ctx, { again: () => ctx.go('#/moi', true) })],
  [/^moi\?p=(.+)$/, (v, m) => learnPack(v, decodeURIComponent(m[1]))],
  [/^ghep$/, v => renderMatchSetup(v, ctx)],
  [/^chuhan$/, v => renderKanjiList(v)],
  [/^chuhan\/on$/, v => renderKanjiQuizSetup(v, ctx)],
  [/^chuhan\/moi$/, v => newKanji(v)],
  [/^onchu$/, v => quickKanji(v)],
  [/^nguphap$/, v => renderGrammarList(v)],
  [/^nguphap\/luyen(?:\?g=(.+))?$/, (v, m) => renderGrammarPractice(v, ctx, m[1] ? decodeURIComponent(m[1]) : null)],
  [/^nguphap\/luyen\?t=(\w+)$/, (v, m) => renderGrammarPractice(v, ctx, null, m[1])],
  [/^nguphap\/thithu$/, v => renderMockSetup(v, ctx)],
  [/^onngu$/, v => quickGrammar(v)],
  [/^nguphap\/(.+)$/, (v, m) => renderGrammar(v, decodeURIComponent(m[1]))],
  [/^kho$/, v => renderWordList(v, ctx)],
  [/^them$/, v => renderWordForm(v, ctx)],
  [/^sua\/(.+)$/, (v, m) => renderWordForm(v, ctx, decodeURIComponent(m[1]))],
  [/^dulieu$/, v => renderData(v, ctx)],
  [/^nhan\?c=([A-Za-z0-9_-]+)$/, (v, m) => receiveSetup(v, ctx, m[1])],
  [/^caidat$/, v => renderSettings(v, ctx)],
  [/^dich$/, v => renderDich(v, ctx)],
  [/^dich\?on$/, v => renderDich(v, ctx, { src: 'due', learned: false })],
  [/^trinhdo$/, v => renderLevelHub(v, ctx)],
  [/^lotrinh$/, v => renderRoadmap(v, ctx)],
  [/^batdau$/, v => renderStart(v, ctx)],
  [/^kana$/, v => renderKana(v, ctx)],
  [/^huongdan$/, v => renderGuides(v)],
  [/^huongdan\/(.+)$/, (v, m) => renderGuide(v, decodeURIComponent(m[1]))],
];

function route() {
  // nhớ trang trước (để nút "← Về …" của lượt học tự bắt đầu quay về đúng chỗ)
  const cur = location.hash || '#/';
  if (cur !== ctx.curHash) { ctx.prevHash = ctx.curHash; ctx.curHash = cur; }
  ctx.backTo = null; ctx.inRun = false;
  leave.forEach(f => { try { f(); } catch { } });
  leave = [];
  // chuyển trang (kể cả nút Back của điện thoại) thì đóng mọi tờ thông tin đang mở
  document.querySelectorAll('.sheet-wrap').forEach(w => w.querySelector('.sheet-x')?.click());
  const h = location.hash.replace(/^#\/?/, '');
  const r = ROUTES.find(([re]) => re.test(h));
  // mỗi lần chuyển trang dùng một khung mới — trình nghe sự kiện của trang cũ bị bỏ theo khung cũ
  view.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  view.appendChild(page);
  if (r) r[1](page, h.match(r[0]));
  else page.innerHTML = emptyState('Không có trang này.', '<a class="btn btn-ghost" href="#/">Về trang chủ</a>');
  document.querySelectorAll('.nav a').forEach(a => {
    const n = NAV.find(x => x[0] === a.getAttribute('href'));
    if (n?.[3].test(h)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
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
  const qs = buildKanjiQs({ dir: 'mix', source: 'new', count: 999 }).sort((a, b) => LEVEL_I(a.level) - LEVEL_I(b.level)).slice(0, 10);
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
    ${needsOnboard() ? `<section class="card onboard"><h2 class="h2">Chào Cậu Cả!</h2><p>Trả lời 3 câu (mục tiêu, mỗi ngày học bao lâu, đang ở đâu) để app xếp kế hoạch hằng ngày và lộ trình.</p>
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="skipob">Để sau</button><a class="btn btn-primary" href="#/batdau">Bắt đầu</a></div></section>` : ''}
    <section class="today">
      <p class="today-l">Hôm nay${S_mins()}</p>
      ${st.total || sk.total || sg.total
        ? `<ul class="plan-l">${planList}</ul>
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
      ['#/lotrinh', 'route', 'Lộ trình', 'Chặng Kana → N5 → N4 → N3 → N2, gói nào học trước'],
      ['#/trinhdo', 'gauge', 'Kiểm tra trình độ', 'Xếp lớp nhanh, thi vượt cấp, kiểm tra theo gói'],
      ['#/luyen', 'quiz', 'Luyện tập', 'Học từ mới, trắc nghiệm, ghép cặp, ghép câu, thể động từ, tính từ, đếm số'],
      ['#/chuhan', 'han', 'Chữ Hán', `${D.kanji.length} thẻ chữ, câu lục bát nhớ mặt chữ, ôn chữ Hán`],
      ['#/nguphap', 'book', 'Ngữ pháp', `${D.grammar.length} mẫu — bài học, luyện tập, thi thử`],
      ['#/kho', 'list', 'Kho từ', `${st.total} từ — tìm, sửa, thêm từ mới`],
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
  chrome();
  view.innerHTML = '<p class="muted loading">Đang tải dữ liệu…</p>';
  try { await loadAll(); } catch (e) { D.errors.push('Lỗi tải dữ liệu: ' + (e?.message || e)); }
  await loadProgress();
  window.addEventListener('hashchange', route);
  initNav(ctx);
  document.addEventListener('click', e => {
    const ko = e.target.closest('[data-kopen]');
    if (ko) { e.preventDefault(); openKanji(ko.dataset.kopen); return; }
    const wo = e.target.closest('[data-wopen]');
    if (wo) { e.preventDefault(); showWord(wo.dataset.wopen, ctx, () => { }); return; }
    const k = e.target.closest('.kj');
    if (!k || k.closest('button, a, input, textarea, select, label, summary, [data-nokj]')) return;
    openKanji(k.textContent);
  });
  route();
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
