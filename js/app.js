import { $, esc, icon, toast, debounce, fmtDate } from './util.js';
import { loadSettings, S } from './settings.js';
import { D, loadAll, TOPICS } from './data.js';
import { loadProgress, stats } from './srs.js';
import { renderQuizSetup, runQuiz, buildQuestions, newLeftToday } from './quiz.js';
import { renderMatchSetup } from './match.js';
import { renderGrammarList, renderGrammar } from './grammar.js';
import { renderWordList, renderWordForm } from './words.js';
import { renderData } from './datapage.js';
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
  ['#/hoc', 'quiz', 'Trắc nghiệm', /^(hoc|on|moi)$/],
  ['#/ghep', 'match', 'Ghép cặp', /^ghep$/],
  ['#/nguphap', 'book', 'Ngữ pháp', /^nguphap/],
  ['#/kho', 'list', 'Kho từ', /^(kho|them|sua)/],
  ['#/dulieu', 'box', 'Dữ liệu', /^dulieu$/, 'rail'],
  ['#/caidat', 'gear', 'Cài đặt', /^caidat$/, 'rail'],
];

const ROUTES = [
  [/^$/, renderHome],
  [/^hoc$/, v => renderQuizSetup(v, ctx)],
  [/^on$/, v => startQuick(v, 'due')],
  [/^moi$/, v => startQuick(v, 'new')],
  [/^ghep$/, v => renderMatchSetup(v, ctx)],
  [/^nguphap$/, v => renderGrammarList(v)],
  [/^nguphap\/(.+)$/, (v, m) => renderGrammar(v, decodeURIComponent(m[1]))],
  [/^kho$/, v => renderWordList(v, ctx)],
  [/^them$/, v => renderWordForm(v, ctx)],
  [/^sua\/(.+)$/, (v, m) => renderWordForm(v, ctx, decodeURIComponent(m[1]))],
  [/^dulieu$/, v => renderData(v, ctx)],
  [/^caidat$/, v => renderSettings(v, ctx)],
];

function route() {
  leave.forEach(f => { try { f(); } catch { } });
  leave = [];
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
  const o = { dir: source === 'new' ? 'jv' : 'mix', script: S.script, source, levels: [], topics: [], count: source === 'new' ? Math.min(newLeftToday(), S.qCount) : 50 };
  const qs = buildQuestions(o);
  if (!qs.length) {
    v.innerHTML = emptyState(source === 'due' ? 'Không có từ nào đến hạn ôn. Học thêm từ mới nhé.' : `Hôm nay đã học đủ ${S.newPerDay} từ mới, hoặc đã học hết từ trong kho.`,
      '<a class="btn btn-primary" href="#/hoc">Chọn lượt học khác</a>');
    return;
  }
  runQuiz(v, qs, o, ctx);
}

function renderHome(v) {
  const st = stats(D.vocab);
  const left = newLeftToday();
  const pct = n => st.total ? (n / st.total) * 100 : 0;
  const topics = Object.keys(TOPICS).map(t => {
    const items = D.vocab.filter(it => it.topics.includes(t));
    return [t, items.length, stats(items).known];
  }).filter(x => x[1]);
  v.innerHTML = `
    <section class="today">
      <p class="today-l">Hôm nay</p>
      ${st.due
        ? `<p class="today-n">Cần ôn <b>${st.due}</b> từ</p><div class="row-btns wrap"><a class="btn btn-primary" href="#/on">Ôn ngay</a>${left ? `<a class="btn btn-ghost" href="#/moi">Học ${Math.min(left, S.qCount)} từ mới</a>` : ''}</div>`
        : st.total
          ? `<p class="today-n">${left ? `Không còn từ nào đến hạn ôn.` : 'Đã xong việc hôm nay.'}</p><div class="row-btns wrap">${left ? `<a class="btn btn-primary" href="#/moi">Học ${Math.min(left, S.qCount)} từ mới</a>` : ''}<a class="btn btn-ghost" href="#/ghep">Chơi ghép cặp</a></div>`
          : `<p class="today-n">Chưa có dữ liệu.</p><a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>`}
      ${st.newToday ? `<p class="small muted">Hôm nay đã học ${st.newToday} từ mới.</p>` : ''}
    </section>

    ${D.errors.length ? `<div class="warn">${D.errors.map(esc).join('<br>')}</div>` : ''}

    <section class="card">
      <h2 class="h2">Tiến độ từ vựng</h2>
      <div class="stack-bar" role="img" aria-label="Đã thuộc ${st.known}, đang học ${st.learning}, chưa học ${st.new}">
        <i class="sb-known" style="width:${pct(st.known)}%"></i><i class="sb-learning" style="width:${pct(st.learning)}%"></i>
      </div>
      <ul class="legend">
        <li><span class="dot dot-known"></span>Đã thuộc <b>${st.known}</b></li>
        <li><span class="dot dot-learning"></span>Đang học <b>${st.learning}</b></li>
        <li><span class="dot dot-new"></span>Chưa học <b>${st.new}</b></li>
      </ul>
      <table class="topics"><tbody>${topics.map(([t, n, k]) => `<tr><th scope="row">${esc(TOPICS[t])}</th><td><span class="mini"><i style="width:${n ? (k / n) * 100 : 0}%"></i></span></td><td class="num">${k}/${n}</td></tr>`).join('')}</tbody></table>
    </section>

    <nav class="modes" aria-label="Các phần học">
      ${[
      ['#/hoc', 'quiz', 'Trắc nghiệm', 'Việt ↔ Nhật, đọc kanji, nghe chọn nghĩa'],
      ['#/ghep', 'match', 'Ghép 6 cặp', 'Việt – chữ mềm/cứng, Việt – kanji, kana – kanji'],
      ['#/nguphap', 'book', 'Ngữ pháp', `${D.grammar.length} mẫu, mỗi mẫu 10 câu ví dụ`],
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
  b.title = !c.token ? 'Chưa cài đồng bộ' : err ? `Lỗi đồng bộ: ${err}` : `Đồng bộ lần cuối ${fmtDate(ls)}`;
  b.setAttribute('aria-label', b.title);
}
const scheduleSync = debounce(async () => { const r = await syncNow(); syncBadge(); if (r.error) toast('Chưa đồng bộ được: ' + r.error); }, 1500);

function registerSW() {
  if (!('serviceWorker' in navigator) || !location.protocol.startsWith('http')) return;
  const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w?.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller)
          toast('Có bản cập nhật mới của app.', { action: 'Cập nhật', onAction: () => w.postMessage('skipWaiting') });
      });
    });
  }).catch(() => { });
  let done = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!had || done) return; done = true; location.reload(); });
}

async function init() {
  await loadSettings();
  chrome();
  view.innerHTML = '<p class="muted loading">Đang tải dữ liệu…</p>';
  try { await loadAll(); } catch (e) { D.errors.push('Lỗi tải dữ liệu: ' + (e?.message || e)); }
  await loadProgress();
  window.addEventListener('hashchange', route);
  route();
  registerSW();
  try { navigator.storage?.persist?.(); } catch { }
  syncBadge();
  const r = await syncNow();
  syncBadge();
  if (r.ok && /^#?\/?$/.test(location.hash)) route();
  window.addEventListener('online', scheduleSync);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') syncNow().then(syncBadge); });
}
init();
