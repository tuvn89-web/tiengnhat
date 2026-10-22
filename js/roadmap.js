// Hướng dẫn & lộ trình (đợt 5a, Đ7): màn Bắt đầu · Lộ trình theo chặng · Kế hoạch hôm nay + dự báo.
import { esc, rich, plain, DAY, startOfDay } from './util.js';
import { recapState } from './dot6.js';
import { D, LEVELS, setPrefs, actToday, saveLesson } from './data.js';
import { status, stats, P, progVersion, dueDirs, overdueMs } from './srs.js';
import { chips, bindChips, readChip } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { passedLevels, thresholds } from './level.js';
import { kanaProgress, kanaDone } from './kana.js';
import { mixedDue } from './practice.js';
import { allLessons, lessonsOf, currentLesson, lessonCardHTML, lessonListHTML, lessonRowsOf, lessonState, dueReviews, reviewDue, isDone, STEPS, redoOf, needRelearn } from './lesson.js';
import { slotHTML, lazyDetails, bindLazy, fillSlots, appendChunks } from './lazy.js';

export const GOALS = [['N5', 'N5'], ['N4', 'N4'], ['N3', 'N3 · 特定技能2号'], ['N2', 'N2'], ['N1', 'N1']];
const START = [['zero', 'Chưa biết chữ nào'], ['kana', 'Đã biết kana'], ['n5', 'Khoảng N5'], ['n4', 'Khoảng N4']];
// Nhịp học (v22): số phút mỗi ngày tự nhập (5–180). Từ mới / chữ Hán mỗi ngày: tự nhập, hoặc tự động theo số phút.
// Đây là MỤC TIÊU cho Kế hoạch hôm nay, không phải giới hạn — học thêm lúc nào cũng được.
// Bảng mốc [phút, từ mới, mẫu ngữ pháp, chữ Hán]; số phút ở giữa hai mốc thì nội suy.
const PACE_PTS = [[5, 3, 0.25, 1], [10, 5, 1 / 3, 2], [20, 10, 0.5, 3], [40, 20, 1, 5], [60, 30, 1, 7], [180, 90, 2, 15]];
const clampN = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export function autoPace(m) {
  m = clampN(m, 5, 180);
  for (let i = 1; i < PACE_PTS.length; i++) {
    const [m0, v0, g0, k0] = PACE_PTS[i - 1], [m1, v1, g1, k1] = PACE_PTS[i];
    if (m <= m1) { const t = (m - m0) / (m1 - m0); return { v: Math.round(v0 + t * (v1 - v0)), g: g0 + t * (g1 - g0), k: Math.round(k0 + t * (k1 - k0)) }; }
  }
  return { v: 90, g: 2, k: 15 };
}
// nhịp đang dùng: v từ mới, g mẫu ngữ pháp, k chữ Hán mỗi ngày
export function pace() {
  const a = autoPace(mins()), p = D.prefs;
  return { v: Number.isFinite(p.nw) ? p.nw : a.v, g: a.g, k: Number.isFinite(p.nk) ? p.nk : a.k };
}
const QUICK_MINS = [10, 20, 40, 60];
// Ô nhập nhịp học — dùng ở màn Bắt đầu và trang Cài đặt
export function paceFieldsHTML() {
  const p = D.prefs, m = mins(), a = autoPace(m);
  const num = (name, val, min, max, unit, off) => `<span class="num-row"><input class="input num" type="number" inputmode="numeric" name="${name}" min="${min}" max="${max}" step="1" value="${val}" ${off ? 'disabled' : ''} aria-label="${unit}"> <span>${unit}</span></span>`;
  const own = k => Number.isFinite(p[k]);
  return `<div class="pace">
    <fieldset><legend>Mỗi ngày học bao lâu</legend>${num('mins', m, 5, 180, 'phút')}
      ${chips('minsq', QUICK_MINS.map(q => [String(q), `${q} phút`]), QUICK_MINS.includes(m) ? String(m) : [], false).replace('data-multi="0"', 'data-multi="0" data-free="1"')}</fieldset>
    <fieldset><legend>Số từ mới mỗi ngày</legend>
      <label class="check"><input type="checkbox" name="nwAuto" ${own('nw') ? '' : 'checked'}> Tự động theo số phút (<b class="nw-a">${a.v}</b> từ)</label>
      ${num('nw', own('nw') ? p.nw : a.v, 0, 100, 'từ', !own('nw'))}</fieldset>
    <fieldset><legend>Số chữ Hán mới mỗi ngày</legend>
      <label class="check"><input type="checkbox" name="nkAuto" ${own('nk') ? '' : 'checked'}> Tự động theo số phút (<b class="nk-a">${a.k}</b> chữ)</label>
      ${num('nk', own('nk') ? p.nk : a.k, 0, 30, 'chữ', !own('nk'))}</fieldset>
    <p class="small muted">Đây là mục tiêu để "Kế hoạch hôm nay" đánh dấu ✓ khi học đủ, không phải giới hạn — muốn học thêm lúc nào cũng được.</p>
  </div>`;
}
export function readPace(root) {
  const q = s => root.querySelector(s);
  const m = clampN(Math.round(+q('[name=mins]').value || 20), 5, 180);
  const rd = (n, max) => q(`[name=${n}Auto]`).checked ? null : clampN(Math.round(+q(`[name=${n}]`).value || 0), 0, max);
  return { mins: m, nw: rd('nw', 100), nk: rd('nk', 30) };
}
export function bindPaceFields(root, onChange) {
  const q = s => root.querySelector(s);
  const upd = () => {
    const m = clampN(Math.round(+q('[name=mins]').value || 20), 5, 180), a = autoPace(m);
    q('.nw-a').textContent = a.v; q('.nk-a').textContent = a.k;
    for (const [n, k] of [['nw', 'v'], ['nk', 'k']]) {
      const auto = q(`[name=${n}Auto]`).checked, inp = q(`[name=${n}]`);
      inp.disabled = auto; if (auto) inp.value = a[k];
    }
    root.querySelectorAll('.chips[data-name="minsq"] .chip').forEach(c => c.setAttribute('aria-pressed', +c.dataset.v === m));
  };
  root.addEventListener('click', e => {
    const c = e.target.closest('.chips[data-name="minsq"] .chip');
    if (!c) return;
    q('[name=mins]').value = c.dataset.v; upd(); onChange?.();
  });
  root.addEventListener('input', e => { if (e.target.closest('.pace')) { upd(); onChange?.(); } });
  root.addEventListener('change', e => { if (e.target.closest('.pace') && e.target.type === 'number') { e.target.value = readPace(root)[e.target.name] ?? e.target.value; upd(); onChange?.(); } });
  upd();
}
// Lượng cần biết của từng cấp (ước tính theo lộ trình skill; kho có nhiều hơn thì lấy theo kho)
const TARGET = { vocab: { N5: 700, N4: 700, N3: 1500, N2: 2500, N1: 3000 }, grammar: { N5: 44, N4: 67, N3: 105, N2: 150, N1: 150 }, kanji: { N5: 100, N4: 200, N3: 350, N2: 350, N1: 1000 } };
export const goal = () => D.prefs.goal || 'N3';
export const mins = () => D.prefs.mins || 20;

// ---------- Bắt đầu ----------
export function renderStart(view, ctx) {
  const p = D.prefs;
  view.innerHTML = `<h1 class="h1">Bắt đầu</h1>
    <p class="muted">Ba câu hỏi để app xếp kế hoạch mỗi ngày và lộ trình cho bạn. Đổi lại lúc nào cũng được.</p>
    <form class="setup" onsubmit="return false">
      <fieldset><legend>Mục tiêu</legend>${chips('goal', GOALS, p.goal || 'N3', false)}</fieldset>
      ${paceFieldsHTML()}
      <fieldset><legend>Hiện đang ở đâu</legend>${chips('start', START, p.start || 'kana', false)}</fieldset>
      <p class="setup-count small"></p>
      <button class="btn btn-primary btn-block" data-act="save">Lưu và xem lộ trình</button>
    </form>`;
  const f = view.querySelector('.setup');
  const hint = { zero: 'App sẽ mở Chặng 0 — Kana: học bảng hiragana và katakana trước.', kana: 'Bắt đầu từ chặng N5. Có thể làm Xếp lớp nhanh để bỏ qua phần đã biết.', n5: 'Nên làm Xếp lớp nhanh (10–15 phút): phần đã biết sẽ được đánh dấu, khỏi học lại.', n4: 'Nên làm Xếp lớp nhanh (10–15 phút): phần đã biết sẽ được đánh dấu, khỏi học lại.' };
  const upd = () => { f.querySelector('.setup-count').textContent = hint[readChip(f, 'start')] || ''; };
  bindChips(f, upd); bindPaceFields(f); upd();
  f.querySelector('[data-act=save]').onclick = async () => {
    const start = readChip(f, 'start');
    await setPrefs({ goal: readChip(f, 'goal'), ...readPace(f), start, onboard: Date.now(), ...(start !== 'zero' ? { kanaOK: true } : {}) });
    ctx.sessionDone?.();
    ctx.go(start === 'zero' ? '#/kana' : start === 'kana' ? '#/lotrinh' : '#/trinhdo');
  };
}

// ---------- Lộ trình ----------
// thứ tự gói trong một chặng: từ JLPT và ngữ pháp đan xen theo số gói → từ chủ đề → chữ Hán
function packOrder(p) {
  const n = +(p.id.match(/(\d+)$/) || [0, 0])[1];
  if (p.type === 'vocab' && /^jlpt-/.test(p.id)) return n * 2;
  if (p.type === 'grammar') return n * 2 + 1;
  if (p.type === 'vocab') return 1000 + n;
  return 2000 + n;
}
function packStat(p) {
  const items = p.items.map(x => D.items.get(x.id)).filter(Boolean);
  const s = stats(items);
  return { items, total: s.total, learned: s.known + s.learning, known: s.known, fresh: s.new };
}
function packAction(p, st) {
  if (!st.fresh) return '<span class="lv-tick" aria-label="Đã học hết">✓</span>';
  if (p.type === 'vocab') return `<a class="btn btn-ghost btn-sm" href="#/moi?p=${encodeURIComponent(p.id)}">Học</a>`;
  if (p.type === 'grammar') { const g = st.items.find(it => status(it) === 'new'); return g ? `<a class="btn btn-ghost btn-sm" href="#/nguphap/${encodeURIComponent(g.id)}">Học</a>` : ''; }
  return '<a class="btn btn-ghost btn-sm" href="#/chuhan/moi">Học</a>';
}
let _si = null, _siKey = '';
export function stageInfo() {
  const passed = passedLevels();
  const off = new Set(D.disabled.list || []);
  // v39: thống kê từng cấp chỉ tính lại khi tiến độ, kho dữ liệu hay kết quả kiểm tra đổi (Trang chủ, Lộ trình đều gọi)
  const key = `${progVersion()}:${D.items.size}:${D.disabled.t || 0}:${[...passed].join('')}:${startOfDay()}`;
  if (_si && _siKey === key) return { st: _si, cur: kanaDone() ? (_si.find(x => !x.passed)?.L || 'N1') : 'kana' };
  const st = LEVELS.map(L => {
    const packs = D.packs.filter(p => p.level === L && p.type !== 'phrase' && !off.has(p.id)).sort((a, b) => packOrder(a) - packOrder(b));
    const items = [...D.vocab, ...D.grammar, ...D.kanji].filter(it => it.level === L);
    const s = stats(items);
    return { L, packs, total: s.total, learned: s.known + s.learning, known: s.known, passed: passed.has(L) };
  });
  _si = st; _siKey = key;
  const cur = kanaDone() ? (st.find(x => !x.passed)?.L || 'N1') : 'kana';
  return { st, cur };
}
// v40: dựng từng phần — tiêu đề + chặng đang học (đủ một màn hình) hiện ngay; các chặng sau dựng dần (⟳ "Đang tải…");
// "Danh sách N bài", "Theo gói dữ liệu" chỉ dựng khi mở, dài thì ghép từng mẻ. Trước v40 dựng cả ~4.300 phần tử một lần → khựng.
export function renderRoadmap(view, ctx) {
  const { st, cur } = stageInfo();
  const G = goal(), gi = LEVELS.indexOf(G), { lo } = thresholds();
  const kp = kanaProgress();
  const lazy = {};
  const stage = (x, i) => {
    const state = x.passed ? 'done' : x.L === cur ? 'cur' : 'next';
    const dim = state === 'next' || i > gi;
    const lessons = () => {
      const ls = lessonsOf(x.L);
      if (!ls.length) return '';
      const nd = ls.filter(isDone).length, cl = currentLesson(x.L);
      const sr = D.lessons['lv:' + x.L]?.redo, rc = sr && !sr.done ? ls.find(l => redoOf(l)) : null, nr = ls.filter(l => isDone(l) && needRelearn(l)).length;
      lazy['ls-' + x.L] = body => {
        const { list, row } = lessonRowsOf(x.L);
        body.innerHTML = '<ol class="lessons"></ol>';
        appendChunks(body.firstChild, list, row, { first: 12 });
      };
      return `<p class="sub-label">Bài học · xong ${nd}/${ls.length}${ls[0].auto ? ' <small class="muted">(app tự chia bài từ gói dữ liệu)</small>' : ''}</p>
          ${rc ? `<p class="small lredo-s">↺ <b>Đang đi lại chặng ${esc(x.L)}</b> — xong ${ls.filter(l => (D.lessons[l.id]?.redo?.done || 0) >= sr.t).length}/${ls.length} bài.</p>${lessonCardHTML(rc)}` : ''}
          ${state === 'cur' && cl && !rc ? lessonCardHTML(cl) : ''}
          ${x.passed || nd >= 5 || nr ? `<div class="row-btns"><a class="btn btn-ghost btn-sm" href="#/hoclai/${esc(x.L)}">↺ Học lại chặng ${esc(x.L)}${nr ? ` · ${nr} bài cần học lại` : ''}</a></div>` : ''}
          ${lazyDetails('ls-' + x.L, `Danh sách ${ls.length} bài`, { open: state === 'cur', label: 'Đang tải danh sách bài…' })}`;
    };
    const packs = () => {
      if (!x.packs.length) return '';
      lazy['pk-' + x.L] = body => {
        const li = p => { const s = packStat(p); return `<li class="pack"><span class="pack-t"><b>${rich(p.title)}</b><span class="mini"><i style="width:${s.total ? (s.learned / s.total) * 100 : 0}%"></i></span><small class="muted">${{ vocab: 'Từ vựng', grammar: 'Ngữ pháp', kanji: 'Chữ Hán' }[p.type] || ''} · ${s.learned}/${s.total}</small></span>${packAction(p, s)}</li>`; };
        body.innerHTML = '<ul class="packs"></ul>';
        appendChunks(body.firstChild, x.packs, li, { first: 10 });
      };
      return lazyDetails('pk-' + x.L, `Theo gói dữ liệu · ${x.packs.length} gói`, { label: 'Đang tải các gói…' });
    };
    return `<section class="card stage stage-${state}${dim ? ' is-dim' : ''}" id="st-${x.L}">
      <div class="stage-h"><h2 class="h2">Chặng ${esc(x.L)}${i > gi ? ' <small>(ngoài mục tiêu)</small>' : ''}</h2><span class="stage-b">${state === 'done' ? 'Đã qua' : state === 'cur' ? 'Đang học' : 'Sắp tới'}</span></div>
      ${x.total ? `<div class="stack-bar" role="img" aria-label="Đã thuộc ${x.known}, đang học ${x.learned - x.known}, tổng ${x.total}"><i class="sb-known" style="width:${(x.known / x.total) * 100}%"></i><i class="sb-learning" style="width:${((x.learned - x.known) / x.total) * 100}%"></i></div>
        <p class="small muted">${x.learned}/${x.total} mục đã học (${x.known} đã thuộc) · ${x.packs.length} gói</p>` : '<p class="small muted">Kho chưa có dữ liệu chặng này — sẽ có trong các đợt dữ liệu tới.</p>'}
      ${lessons()}
      ${packs()}
      ${x.total ? `<p class="small">${x.passed ? `Đã qua: Thi vượt cấp ${esc(x.L)} đạt từ ${lo}%.` : `Qua chặng khi <b>Thi vượt cấp ${esc(x.L)}</b> đạt từ ${lo}%.`} <button type="button" class="btn btn-ghost btn-sm" data-test="${esc(x.L)}">Thi vượt cấp ${esc(x.L)}</button></p>` : ''}
    </section>`;
  };
  const kanaSec = `<section class="card stage ${kanaDone() ? 'stage-done' : 'stage-cur'}">
      <div class="stage-h"><h2 class="h2">Chặng 0 — Kana</h2><span class="stage-b">${kanaDone() ? 'Đã qua' : 'Đang học'}</span></div>
      <table class="topics"><tbody>
        <tr><th scope="row">Hiragana</th><td><span class="mini"><i style="width:${(kp.h / kp.ht) * 100}%"></i></span></td><td class="num">${kp.h}/${kp.ht}</td></tr>
        <tr><th scope="row">Katakana</th><td><span class="mini"><i style="width:${(kp.k / kp.kt) * 100}%"></i></span></td><td class="num">${kp.k}/${kp.kt}</td></tr></tbody></table>
      <p class="small">${D.prefs.kanaOK ? 'Đã đánh dấu: biết kana.' : 'Qua chặng khi thuộc 90% chữ cơ bản của hai bảng.'} <a class="btn btn-ghost btn-sm" href="#/kana">Mở bảng kana</a></p>
    </section>`;
  // chặng đang học lên đầu, rồi các chặng tiếp theo; chặng đã qua xuống cuối.
  // Chặng đầu tiên (đang học) dựng ngay; các chặng còn lại là chỗ trống điền dần.
  const shown = st.map((x, i) => [x, i]);
  const open = shown.filter(([x]) => !x.passed), done = shown.filter(([x]) => x.passed);
  const slots = {};
  const later = ([x, i]) => { slots['st-' + x.L] = () => stage(x, i); return slotHTML('st-' + x.L, `Đang tải chặng ${x.L}…`, 180); };
  const top = (cur === 'kana' ? kanaSec : '') + open.map((xi, k) => (k === 0 ? stage(...xi) : later(xi))).join('');
  const bottom = (cur !== 'kana' ? kanaSec : '') + done.map(later).join('');
  slots.fc = () => { const fc = forecast(); return fc ? `<p class="note small">${fc}</p>` : ''; };
  view.innerHTML = `<h1 class="h1">Lộ trình</h1>
    <p class="lv-goal">Mục tiêu <b>${esc(GOALS.find(g => g[0] === G)?.[1] || G)}</b> · ${mins()} phút/ngày <a class="btn btn-ghost btn-sm" href="#/batdau">Đổi</a></p>
    ${slotHTML('fc', 'Đang tính dự báo…', 44)}
    <p class="small muted">Mỗi chặng chia thành bài học: từ mới, chữ Hán, ngữ pháp, luyện tập, đọc & hội thoại, kiểm tra cuối bài. Chặng đang học ở trên cùng, chặng đã qua ở cuối trang; bài và chặng sau vẫn mở được (không khóa).</p>
    <div class="row-btns wrap"><a class="btn btn-ghost btn-sm" href="#/noiduoc">Nói được gì</a><a class="btn btn-ghost btn-sm" href="#/doc">Hội thoại & bài đọc</a></div>
    ${top}
    ${bottom ? `<h2 class="h2 stage-sep">Chặng đã qua</h2>${bottom}` : ''}
    <p class="small muted"><a href="#/huongdan">Xem bài hướng dẫn học theo từng cấp</a>.</p>`;
  const go = bindLazy(view, lazy);
  fillSlots(view, slots, { lazy: go });
  view.addEventListener('click', async e => {
    const b = e.target.closest('[data-test]');
    if (!b) return;
    await kvSet('lvSetup', { ...(await kvGet('lvSetup', {})), level: b.dataset.test });
    ctx.go('#/trinhdo');
  });
}

// ---------- Thẻ lộ trình trên Trang chủ: chặng đang học + 3 gói học tiếp ----------
export function roadmapCardHTML() {
  const { st, cur } = stageInfo();
  if (cur === 'kana') {
    const kp = kanaProgress();
    return `<section class="card rm-card"><div class="stage-h"><h2 class="h2">Lộ trình · Chặng 0 — Kana</h2><span class="stage-b">Đang học</span></div>
      <p class="small muted">Hiragana ${kp.h}/${kp.ht} · Katakana ${kp.k}/${kp.kt}</p>
      <div class="row-btns wrap"><a class="btn btn-primary btn-sm" href="#/kana">Luyện kana</a><a class="btn btn-ghost btn-sm" href="#/lotrinh">Xem cả lộ trình →</a></div></section>`;
  }
  const x = st.find(y => y.L === cur);
  if (!x) return '';
  const { lo } = thresholds();
  const ls = lessonsOf(x.L), cl = currentLesson(x.L), nd = ls.filter(isDone).length;
  const next = cl ? ls.slice(cl.n, cl.n + 2) : [];
  return `<section class="card rm-card"><div class="stage-h"><h2 class="h2">Lộ trình · Chặng ${esc(x.L)}</h2><span class="stage-b">Đang học</span></div>
    ${x.total ? `<div class="stack-bar" role="img" aria-label="Đã thuộc ${x.known}, đang học ${x.learned - x.known}, tổng ${x.total}"><i class="sb-known" style="width:${(x.known / x.total) * 100}%"></i><i class="sb-learning" style="width:${((x.learned - x.known) / x.total) * 100}%"></i></div>
      <p class="small muted">${ls.length ? `Xong ${nd}/${ls.length} bài · ` : ''}${x.learned}/${x.total} mục đã học · qua chặng khi Thi vượt cấp ${esc(x.L)} đạt từ ${lo}%</p>` : ''}
    ${cl ? lessonCardHTML(cl) : ls.length ? '<p class="small">Đã xong mọi bài của chặng này — làm Thi vượt cấp để qua chặng.</p>' : ''}
    ${next.length ? `<p class="sub-label">Bài tiếp theo</p><ol class="lessons">${next.map(n => `<li class="ls"><a href="#/bai/${encodeURIComponent(n.id)}"><span class="ls-n">${n.n}</span><span class="ls-t"><b>${rich(n.title)}</b><small>${rich(n.goal)}</small></span></a></li>`).join('')}</ol>` : ''}
    <div class="row-btns wrap"><a class="btn btn-ghost btn-sm" href="#/lotrinh">Xem cả lộ trình →</a><a class="btn btn-ghost btn-sm" href="#/noiduoc">Nói được gì</a><a class="btn btn-ghost btn-sm" href="#/trinhdo">Thi vượt cấp ${esc(x.L)}</a></div></section>`;
}

// ---------- Kế hoạch hôm nay + dự báo ----------
function learnedSinceT(list, t) { let n = 0; for (const it of list) { const r = P.get(it.id); if (r?.first >= t && status(it) !== 'new') n++; } return n; }
// v40: dự báo duyệt hết mọi mục → nhớ kết quả, chỉ tính lại khi tiến độ / kho / mục tiêu / nhịp học đổi
let _fc = null, _fcKey = '';
export function forecast() {
  const key = `${progVersion()}:${D.items.size}:${startOfDay()}:${goal()}:${mins()}:${JSON.stringify(pace())}`;
  if (_fcKey === key) return _fc;
  _fc = forecastNow(); _fcKey = key;
  return _fc;
}
function forecastNow() {
  const G = goal(), gi = LEVELS.indexOf(G);
  if (gi < 0) return '';
  const lvls = LEVELS.slice(0, gi + 1);
  const rem = {};
  for (const [t, list] of [['vocab', D.vocab], ['grammar', D.grammar], ['kanji', D.kanji]]) {
    rem[t] = 0;
    for (const L of lvls) {
      const items = list.filter(it => it.level === L && !(t === 'vocab' && it.reg === 'kansai'));
      const done = items.filter(it => status(it) !== 'new').length;
      rem[t] += Math.max(0, Math.max(TARGET[t][L], items.length) - done);
    }
  }
  if (!rem.vocab && !rem.grammar && !rem.kanji) return `Đã học hết khối lượng ${esc(G)} — làm Thi vượt cấp ${esc(G)} để qua chặng.`;
  // nhịp thật 14 ngày qua (nếu có), không thì theo số phút đã chọn
  const t0 = startOfDay() - 13 * DAY, plan = pace();
  const real = { vocab: learnedSinceT(D.vocab, t0) / 14, grammar: learnedSinceT(D.grammar, t0) / 14, kanji: learnedSinceT(D.kanji, t0) / 14 };
  const useReal = real.vocab >= 1;
  const pc = { vocab: useReal ? real.vocab : plan.v, grammar: useReal && real.grammar > 0 ? real.grammar : plan.g, kanji: useReal && real.kanji > 0 ? real.kanji : plan.k };
  if ((rem.vocab && !pc.vocab) || (rem.kanji && !pc.kanji)) return `Đang đặt 0 ${!pc.vocab ? 'từ mới' : 'chữ Hán'} mỗi ngày nên chưa dự báo được ngày học xong ${esc(G)}. Còn khoảng ${rem.vocab} từ, ${rem.grammar} mẫu ngữ pháp, ${rem.kanji} chữ Hán (ước tính).`;
  const days = Math.ceil(Math.max(rem.vocab / (pc.vocab || 1), rem.grammar / pc.grammar, rem.kanji / (pc.kanji || 1)));
  const d = new Date(Date.now() + days * DAY);
  const when = days < 45 ? `khoảng ${days} ngày nữa` : `khoảng tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  return `${useReal ? `Giữ nhịp 14 ngày qua (khoảng ${Math.round(pc.vocab)} từ mới/ngày)` : `Học ${mins()} phút mỗi ngày (khoảng ${plan.v} từ mới/ngày)`}, bạn học hết khối lượng ${esc(G)} ${when}. Còn khoảng ${rem.vocab} từ, ${rem.grammar} mẫu ngữ pháp, ${rem.kanji} chữ Hán (ước tính).`;
}
// v54: gợi ý "Kiểm tra nhanh chặng" — chặng đã qua, hơn 30 ngày chưa kiểm nhanh, có từ 15 mục quá hạn ≥ 3 ngày.
// Tối đa một lần mỗi tuần (không phải chuỗi ngày): ngày gợi ý lưu ở D.lessons['lv:sug'].day; trong ngày đó giữ nguyên gợi ý.
let _sg = null, _sgKey = '';
export function stageSuggest(cur) {
  const sod = startOfDay(), key = `${progVersion()}:${sod}:${cur}`;
  if (_sgKey === key) return _sg;
  _sgKey = key; _sg = null;
  const last = D.lessons['lv:sug'];
  if (last?.day === sod) return (_sg = last.L);
  if (last?.day && sod - last.day < 7 * DAY) return null;
  const ci = LEVELS.indexOf(cur), done = ci > 0 ? LEVELS.slice(0, ci) : cur === 'kana' ? [] : ci < 0 ? LEVELS.slice() : [];
  let best = null;
  for (const L of done) {
    const rq = D.lessons['lv:' + L]?.rq;
    if (rq && sod - rq.t < 30 * DAY) continue;
    let n = 0;
    for (const list of [D.vocab, D.kanji, D.grammar]) for (const it of list) if (it.level === L && dueDirs(it).length && overdueMs(it) >= 3 * DAY) n++;
    if (n >= 15 && (!best || n > best.n)) best = { L, n };
  }
  if (best) { saveLesson('lv:sug', { day: sod, L: best.L, n: best.n }); _sg = best.L; }
  return _sg;
}
// Danh sách việc hôm nay, theo số phút đã chọn
export function planToday() {
  const m = mins(), plan = pace();
  const sod = startOfDay();
  const md = mixedDue(), nDue = md.vocab.length + md.kanji.length + md.grammar.length + md.sent.length;
  const newV = learnedSinceT(D.vocab, sod), newG = learnedSinceT(D.grammar, sod), newK = learnedSinceT(D.kanji, sod);
  const wantG = plan.g >= 1 ? 1 : (Math.floor(sod / DAY) % Math.round(1 / plan.g) === 0 ? 1 : 0); // 1 mẫu mỗi 2–3 ngày
  const { cur } = stageInfo();
  const out = [];
  if (cur === 'kana') {
    const kp = kanaProgress();
    out.push({ done: actToday('kana') >= 20, label: `Luyện kana 20 câu`, sub: `Hôm nay đã luyện ${actToday('kana')} câu · Hiragana ${kp.h}/${kp.ht} · Katakana ${kp.k}/${kp.kt}`, href: '#/kana', btn: 'Luyện' });
    return out;
  }
  const didOn = actToday('on');
  out.push({ done: nDue === 0 || didOn > 0, label: nDue && !didOn ? `Ôn ${nDue} mục đến hạn` : 'Ôn đến hạn — xong', sub: didOn && nDue ? `Đã ôn hôm nay · còn ${nDue} mục, ôn thêm nếu còn thời gian` : 'Từ vựng, chữ Hán, ngữ pháp', href: '#/onhon', btn: 'Ôn', more: !!(didOn && nDue) });
  const sg = stageSuggest(cur);
  if (sg) { const q = D.lessons['lv:' + sg]?.rq; out.push({ done: !!q && q.t >= sod, label: `Kiểm tra nhanh chặng ${sg} (khoảng 10 phút)`, sub: q && q.t >= sod ? `Đã kiểm hôm nay: ${q.pct}%` : 'Chặng đã qua, lâu chưa kiểm — chỉ học lại phần đã quên', href: `#/hoclai/${sg}/kt`, btn: 'Kiểm tra' }); }
  // ôn bài cũ theo lịch 1–3–7–14 ngày (tối đa 2 bài mỗi ngày)
  for (const l of allLessons().filter(x => (D.lessons[x.id]?.rev || []).some(t => t >= sod))) out.push({ done: true, label: `Ôn bài cũ: bài ${l.n} (${l.level})`, sub: 'Đã ôn hôm nay', href: `#/bai/${encodeURIComponent(l.id)}`, btn: 'Xem' });
  for (const l of dueReviews().slice(0, 2)) out.push({ done: false, label: `Ôn bài cũ: bài ${l.n} (${l.level})`, sub: `Lần ${reviewDue(l).k + 1}/4 · ${plain(l.title)}`, href: `#/onbai/${encodeURIComponent(l.id)}`, btn: 'Ôn' });
  // bài đang học: bước tiếp theo
  const cl = currentLesson(cur);
  if (cl) { const s = lessonState(cl), nx = s.next >= 0 ? s.next : STEPS.length - 1, did = actToday('lesson'); out.push({ done: did > 0, label: `Bài ${cl.n}: ${plain(cl.title)}`, sub: `${s.nDone}/${STEPS.length} bước${did ? ` · hôm nay đã làm ${did} lượt` : ''} · tiếp: ${STEPS[nx][1]}`, href: `#/bai/${encodeURIComponent(cl.id)}?b=${nx + 1}`, btn: 'Học' }); }
  const hasNewV = D.vocab.some(it => status(it) === 'new');
  const lnew = cl && cl.words.some(id => { const it = D.items.get(id); return it && status(it) === 'new'; });
  if (hasNewV && plan.v > 0) out.push({ done: newV >= plan.v, label: `Học ${plan.v} từ mới`, sub: `Hôm nay đã học ${newV}${lnew ? ` · từ của bài ${cl.n}` : ''}`, href: lnew ? `#/bai/${encodeURIComponent(cl.id)}?b=2` : '#/moi', btn: 'Học' });
  // v31 (N4): nhắc lại từ mới học hôm nay, sau ít nhất 4 giờ
  const rc = recapState();
  if (rc.ready.length) out.push({ done: false, label: `Nhắc lại ${rc.ready.length} từ mới hôm nay`, sub: 'Học từ 4 giờ trước — lượt ngắn, không đổi lịch ôn', href: '#/nhaclai', btn: 'Nhắc lại' });
  else if (rc.done) out.push({ done: true, label: 'Nhắc lại từ mới hôm nay', sub: `Đã nhắc lại ${rc.done} từ`, href: '#/nhaclai', btn: 'Nhắc lại' });
  // mẫu mới: ưu tiên mẫu của bài đang học
  const g = (cl ? cl.grammar.map(id => D.items.get(id)).filter(x => x && status(x) === 'new') : [])[0] || D.grammar.filter(x => status(x) === 'new').sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level))[0];
  if (wantG && g) out.push({ done: newG >= 1, label: '1 mẫu ngữ pháp mới', sub: newG ? 'Đã học hôm nay' : plain(g.pattern), href: `#/nguphap/${encodeURIComponent(g.id)}`, btn: 'Học' });
  // xen kẽ: ngày chẵn luyện thể, ngày lẻ luyện dịch
  // làm bài kia (dịch thay cho thể, hay ngược lại) cũng tính là xong
  if (m >= 20) {
    const ad = actToday('dich'), at = actToday('the'), alt = ad || at ? (ad && at ? 'Hôm nay đã luyện dịch và luyện thể' : ad ? 'Hôm nay đã luyện dịch' : 'Hôm nay đã luyện thể') : '';
    out.push(Math.floor(sod / DAY) % 2 ? { done: ad + at > 0, label: 'Một bài luyện dịch', sub: alt || 'Nhật ↔ Việt theo câu', href: '#/dich', btn: 'Dịch' } : { done: ad + at > 0, label: 'Một bài luyện thể', sub: alt || 'Gõ thể, chuỗi biến đổi, đổi câu…', href: '#/luyen/chia', btn: 'Luyện' });
  }
  const hasNewK = D.kanji.some(k => status(k) === 'new');
  const lk = cl && cl.kanji.some(c => { const k = D.kanjiByChar.get(c); return k && status(k) === 'new'; });
  if (hasNewK && plan.k > 0) out.push({ done: newK >= plan.k, label: `${plan.k} chữ Hán`, sub: `Hôm nay đã học ${newK}${lk ? ` · chữ của bài ${cl.n}` : ''}`, href: lk ? `#/bai/${encodeURIComponent(cl.id)}?b=3` : '#/chuhan/moi', btn: 'Học' });
  return out;
}
export function planHTML() {
  const items = planToday();
  if (!items.length) return '';
  return `<section class="card plan"><h2 class="h2">Kế hoạch hôm nay <small>· ${mins()} phút</small></h2>
    <ul class="plan-l">${items.map(x => `<li class="${x.done ? 'is-done' : ''}"><span class="plan-c" aria-hidden="true">${x.done ? '✓' : ''}</span><span><b>${esc(x.label)}</b><small class="muted" ${/[ぁ-ん一-龯]/.test(x.sub) ? 'lang="ja"' : ''}>${esc(x.sub)}</small></span>${x.done && !x.more ? '' : `<a class="btn btn-ghost btn-sm" href="${x.href}">${esc(x.btn)}</a>`}</li>`).join('')}</ul>
    <p class="small muted">${forecast()} <a href="#/lotrinh">Lộ trình</a></p></section>`;
}
export const needsOnboard = () => !D.prefs.onboard;
