import { $, esc, icon, toast, debounce, fmtDate } from './util.js';
import { loadSettings, S } from './settings.js';
import { D, loadAll, TOPICS } from './data.js';
import { loadProgress, stats } from './srs.js';
import { renderQuizSetup, runQuiz, buildQuestions } from './quiz.js';
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

const view = $('#view');
let leave = [];
const ctx = {
  onLeave: f => leave.push(f),
  go: (hash, force) => { if (location.hash === hash || (hash === '#/' && !location.hash)) { if (force) route(); } else location.hash = hash; },
  sessionDone: () => scheduleSync(),
  refreshSync: () => syncBadge(),
};

const NAV = [
  ['#/', 'home', 'Trang chủ', /^$/],
  ['#/hoc', 'quiz', 'Luyện từ', /^(hoc|on|moi|ghep)$/],
  ['#/chuhan', 'han', 'Chữ Hán', /^(chuhan|onchu)/],
  ['#/nguphap', 'book', 'Ngữ pháp', /^(nguphap|onngu)/],
  ['#/kho', 'list', 'Kho từ', /^(kho|them|sua)/],
  ['#/dulieu', 'box', 'Dữ liệu', /^(dulieu|nhan)/, 'rail'],
  ['#/caidat', 'gear', 'Cài đặt', /^caidat$/, 'rail'],
];

const ROUTES = [
  [/^$/, renderHome],
  [/^hoc$/, v => renderQuizSetup(v, ctx)],
  [/^on$/, v => startQuick(v, 'due')],
  [/^moi$/, v => startQuick(v, 'new')],
  [/^ghep$/, v => renderMatchSetup(v, ctx)],
  [/^chuhan$/, v => renderKanjiList(v)],
  [/^chuhan\/on$/, v => renderKanjiQuizSetup(v, ctx)],
  [/^onchu$/, v => quickKanji(v)],
  [/^nguphap$/, v => renderGrammarList(v)],
  [/^nguphap\/luyen(?:\?g=(.+))?$/, (v, m) => renderGrammarPractice(v, ctx, m[1] ? decodeURIComponent(m[1]) : null)],
  [/^nguphap\/thithu$/, v => renderMockSetup(v, ctx)],
  [/^onngu$/, v => quickGrammar(v)],
  [/^nguphap\/(.+)$/, (v, m) => renderGrammar(v, decodeURIComponent(m[1]))],
  [/^kho$/, v => renderWordList(v, ctx)],
  [/^them$/, v => renderWordForm(v, ctx)],
  [/^sua\/(.+)$/, (v, m) => renderWordForm(v, ctx, decodeURIComponent(m[1]))],
  [/^dulieu$/, v => renderData(v, ctx)],
  [/^nhan\?c=([A-Za-z0-9_-]+)$/, (v, m) => receiveSetup(v, ctx, m[1])],
  [/^caidat$/, v => renderSettings(v, ctx)],
];

function route() {
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
  ctx.backTo = '#/';
  runDrill(v, qs, ctx, { title: 'Ôn chữ Hán', again: () => ctx.go('#/chuhan/on') });
}
function quickGrammar(v) {
  const qs = buildGrammarQs({ type: 'mix', source: 'due', count: 20 });
  if (!qs.length) { v.innerHTML = emptyState('Không có mẫu ngữ pháp nào đến hạn ôn.', '<a class="btn btn-primary" href="#/nguphap/luyen">Luyện ngữ pháp</a>'); return; }
  ctx.backTo = '#/';
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
  const nNew = Math.min(st.new, S.qCount);
  const task = (label, n, unit, href, btn) => n ? `<li class="task"><span><b>${n}</b> ${unit}</span><span class="muted small">${label}</span><a class="btn btn-primary btn-sm" href="${href}">${btn}</a></li>` : '';
  const tasks = [
    task('Từ vựng đến hạn ôn', st.due, 'từ', '#/on', 'Ôn từ'),
    task('Chữ Hán đến hạn ôn', sk.due, 'chữ', '#/onchu', 'Ôn chữ'),
    task('Mẫu ngữ pháp đến hạn ôn', sg.due, 'mẫu', '#/onngu', 'Luyện'),
  ].join('');
  const bar = (label, s) => s.total ? `<tr><th scope="row">${label}</th><td><span class="mini"><i style="width:${pct(s.known, s.total)}%"></i></span></td><td class="num">${s.known}/${s.total}</td></tr>` : '';
  v.innerHTML = `
    <section class="today">
      <p class="today-l">Hôm nay</p>
      ${st.total || sk.total || sg.total
        ? `${tasks ? `<ul class="tasks">${tasks}</ul>` : '<p class="today-n">Không còn gì đến hạn ôn.</p>'}
           <div class="row-btns wrap">${nNew ? `<a class="btn ${tasks ? 'btn-ghost' : 'btn-primary'}" href="#/moi">Học ${nNew} từ mới</a>` : ''}<a class="btn btn-ghost" href="#/ghep">Ghép cặp</a></div>`
        : `<p class="today-n">Chưa có dữ liệu.</p><a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>`}
      ${st.newToday ? `<p class="small muted">Hôm nay đã học ${st.newToday} từ mới.</p>` : ''}
    </section>

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
      ['#/hoc', 'quiz', 'Luyện từ', 'Trắc nghiệm Việt ↔ Nhật, đọc kanji, nghe; ghép 6 cặp'],
      ['#/chuhan', 'han', 'Chữ Hán', `${D.kanji.length} thẻ chữ, câu lục bát nhớ mặt chữ, ôn chữ Hán`],
      ['#/nguphap', 'book', 'Ngữ pháp', `${D.grammar.length} mẫu — bài học, luyện tập, thi thử`],
      ['#/kho', 'list', 'Kho từ', `${st.total} từ — tìm, sửa, thêm từ mới`],
      ['#/dulieu', 'box', 'Dữ liệu & đồng bộ', 'Nhập gói từ skill, sao lưu, GitHub'],
      ['#/caidat', 'gear', 'Cài đặt', 'Cỡ chữ, cỡ nút, màu nền, giọng đọc'],
    ].map(([h, ic, t, d]) => `<a class="mode" href="${h}">${icon(ic)}<span><b>${t}</b><small>${esc(d)}</small></span></a>`).join('')}
    </nav>`;
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
