// Hướng dẫn & lộ trình (đợt 5a, Đ7): màn Bắt đầu · Lộ trình theo chặng · Kế hoạch hôm nay + dự báo.
import { esc, rich, plain, DAY, startOfDay } from './util.js';
import { D, LEVELS, setPrefs, actToday } from './data.js';
import { status, stats, P } from './srs.js';
import { chips, bindChips, readChip } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { passedLevels, thresholds } from './level.js';
import { kanaProgress, kanaDone } from './kana.js';
import { mixedDue } from './practice.js';
import { allLessons, lessonsOf, currentLesson, lessonCardHTML, lessonListHTML, lessonState, dueReviews, reviewDue, isDone, STEPS } from './lesson.js';

export const GOALS = [['N5', 'N5'], ['N4', 'N4'], ['N3', 'N3 · 特定技能2号'], ['N2', 'N2']];
const MINS = [[10, '10 phút'], [20, '20 phút'], [40, '40 phút']];
const START = [['zero', 'Chưa biết chữ nào'], ['kana', 'Đã biết kana'], ['n5', 'Khoảng N5'], ['n4', 'Khoảng N4']];
// Nhịp học theo số phút mỗi ngày: từ mới / mẫu ngữ pháp / chữ Hán mỗi ngày
const PACE = { 10: { v: 5, g: 1 / 3, k: 2 }, 20: { v: 10, g: 0.5, k: 3 }, 40: { v: 20, g: 1, k: 5 } };
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
      <fieldset><legend>Mỗi ngày học bao lâu</legend>${chips('mins', MINS.map(([m, l]) => [String(m), l]), String(p.mins || 20), false)}</fieldset>
      <fieldset><legend>Hiện đang ở đâu</legend>${chips('start', START, p.start || 'kana', false)}</fieldset>
      <p class="setup-count small"></p>
      <button class="btn btn-primary btn-block" data-act="save">Lưu và xem lộ trình</button>
    </form>`;
  const f = view.querySelector('.setup');
  const hint = { zero: 'App sẽ mở Chặng 0 — Kana: học bảng hiragana và katakana trước.', kana: 'Bắt đầu từ chặng N5. Có thể làm Xếp lớp nhanh để bỏ qua phần đã biết.', n5: 'Nên làm Xếp lớp nhanh (10–15 phút): phần đã biết sẽ được đánh dấu, khỏi học lại.', n4: 'Nên làm Xếp lớp nhanh (10–15 phút): phần đã biết sẽ được đánh dấu, khỏi học lại.' };
  const upd = () => { f.querySelector('.setup-count').textContent = hint[readChip(f, 'start')] || ''; };
  bindChips(f, upd); upd();
  f.querySelector('[data-act=save]').onclick = async () => {
    const start = readChip(f, 'start');
    await setPrefs({ goal: readChip(f, 'goal'), mins: +readChip(f, 'mins'), start, onboard: Date.now(), ...(start !== 'zero' ? { kanaOK: true } : {}) });
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
export function stageInfo() {
  const passed = passedLevels();
  const off = new Set(D.disabled.list || []);
  const st = LEVELS.map(L => {
    const packs = D.packs.filter(p => p.level === L && p.type !== 'phrase' && !off.has(p.id)).sort((a, b) => packOrder(a) - packOrder(b));
    const items = [...D.vocab, ...D.grammar, ...D.kanji].filter(it => it.level === L);
    const s = stats(items);
    return { L, packs, total: s.total, learned: s.known + s.learning, known: s.known, passed: passed.has(L) };
  });
  const cur = kanaDone() ? (st.find(x => !x.passed)?.L || 'N1') : 'kana';
  return { st, cur };
}
export function renderRoadmap(view, ctx) {
  const { st, cur } = stageInfo();
  const G = goal(), gi = LEVELS.indexOf(G), { lo } = thresholds();
  const kp = kanaProgress();
  const fc = forecast();
  const stage = (x, i) => {
    const state = x.passed ? 'done' : x.L === cur ? 'cur' : 'next';
    const dim = state === 'next' || i > gi;
    return `<section class="card stage stage-${state}${dim ? ' is-dim' : ''}" id="st-${x.L}">
      <div class="stage-h"><h2 class="h2">Chặng ${esc(x.L)}${i > gi ? ' <small>(ngoài mục tiêu)</small>' : ''}</h2><span class="stage-b">${state === 'done' ? 'Đã qua' : state === 'cur' ? 'Đang học' : 'Sắp tới'}</span></div>
      ${x.total ? `<div class="stack-bar" role="img" aria-label="Đã thuộc ${x.known}, đang học ${x.learned - x.known}, tổng ${x.total}"><i class="sb-known" style="width:${(x.known / x.total) * 100}%"></i><i class="sb-learning" style="width:${((x.learned - x.known) / x.total) * 100}%"></i></div>
        <p class="small muted">${x.learned}/${x.total} mục đã học (${x.known} đã thuộc) · ${x.packs.length} gói</p>` : '<p class="small muted">Kho chưa có dữ liệu chặng này — sẽ có trong các đợt dữ liệu tới.</p>'}
      ${(() => {
        const ls = lessonsOf(x.L);
        if (!ls.length) return '';
        const nd = ls.filter(isDone).length, cl = currentLesson(x.L);
        return `<p class="sub-label">Bài học · xong ${nd}/${ls.length}${ls[0].auto ? ' <small class="muted">(app tự chia bài từ gói dữ liệu)</small>' : ''}</p>
          ${state === 'cur' && cl ? lessonCardHTML(cl) : ''}
          <details ${state === 'cur' ? 'open' : ''}><summary>Danh sách ${ls.length} bài</summary>${lessonListHTML(x.L)}</details>`;
      })()}
      ${x.packs.length ? (() => {
        const rows = x.packs.map(p => [p, packStat(p)]);
        const li = ([p, s]) => `<li class="pack"><span class="pack-t"><b>${rich(p.title)}</b><span class="mini"><i style="width:${s.total ? (s.learned / s.total) * 100 : 0}%"></i></span><small class="muted">${{ vocab: 'Từ vựng', grammar: 'Ngữ pháp', kanji: 'Chữ Hán' }[p.type] || ''} · ${s.learned}/${s.total}</small></span>${packAction(p, s)}</li>`;
        const next = rows.filter(([, s]) => s.fresh).slice(0, 4);
        return `<details><summary>Theo gói dữ liệu · ${rows.length} gói</summary><ul class="packs">${rows.map(li).join('')}</ul></details>`;
      })() : ''}
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
  // chặng đang học lên đầu, rồi các chặng tiếp theo; chặng đã qua xuống cuối
  const shown = st.slice(0, 4).map((x, i) => [x, i]);
  const open = shown.filter(([x]) => !x.passed), done = shown.filter(([x]) => x.passed);
  const top = (cur === 'kana' ? kanaSec : '') + open.map(([x, i]) => stage(x, i)).join('');
  const bottom = (cur !== 'kana' ? kanaSec : '') + done.map(([x, i]) => stage(x, i)).join('');
  view.innerHTML = `<h1 class="h1">Lộ trình</h1>
    <p class="lv-goal">Mục tiêu <b>${esc(GOALS.find(g => g[0] === G)?.[1] || G)}</b> · ${mins()} phút/ngày <a class="btn btn-ghost btn-sm" href="#/batdau">Đổi</a></p>
    ${fc ? `<p class="note small">${fc}</p>` : ''}
    <p class="small muted">Mỗi chặng chia thành bài học: từ mới, chữ Hán, ngữ pháp, luyện tập, đọc & hội thoại, kiểm tra cuối bài. Chặng đang học ở trên cùng, chặng đã qua ở cuối trang; bài và chặng sau vẫn mở được (không khóa).</p>
    <div class="row-btns wrap"><a class="btn btn-ghost btn-sm" href="#/noiduoc">Nói được gì</a><a class="btn btn-ghost btn-sm" href="#/doc">Hội thoại & bài đọc</a></div>
    ${top}
    ${bottom ? `<h2 class="h2 stage-sep">Chặng đã qua</h2>${bottom}` : ''}
    <p class="small muted">Chặng N1 sẽ thêm khi kho dữ liệu làm đến N1. <a href="#/huongdan">Xem bài hướng dẫn học theo từng cấp</a>.</p>`;
  view.querySelectorAll('[data-test]').forEach(b => b.onclick = async () => {
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
export function forecast() {
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
  const t0 = startOfDay() - 13 * DAY, plan = PACE[mins()] || PACE[20];
  const real = { vocab: learnedSinceT(D.vocab, t0) / 14, grammar: learnedSinceT(D.grammar, t0) / 14, kanji: learnedSinceT(D.kanji, t0) / 14 };
  const useReal = real.vocab >= 1;
  const pace = { vocab: useReal ? real.vocab : plan.v, grammar: useReal && real.grammar > 0 ? real.grammar : plan.g, kanji: useReal && real.kanji > 0 ? real.kanji : plan.k };
  const days = Math.ceil(Math.max(rem.vocab / pace.vocab, rem.grammar / pace.grammar, rem.kanji / pace.kanji));
  const d = new Date(Date.now() + days * DAY);
  const when = days < 45 ? `khoảng ${days} ngày nữa` : `khoảng tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  return `${useReal ? `Giữ nhịp 14 ngày qua (khoảng ${Math.round(pace.vocab)} từ mới/ngày)` : `Học ${mins()} phút mỗi ngày (khoảng ${plan.v} từ mới/ngày)`}, bạn học hết khối lượng ${esc(G)} ${when}. Còn khoảng ${rem.vocab} từ, ${rem.grammar} mẫu ngữ pháp, ${rem.kanji} chữ Hán (ước tính).`;
}
// Danh sách việc hôm nay, theo số phút đã chọn
export function planToday() {
  const m = mins(), plan = PACE[m] || PACE[20];
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
  // ôn bài cũ theo lịch 1–3–7–14 ngày (tối đa 2 bài mỗi ngày)
  for (const l of allLessons().filter(x => (D.lessons[x.id]?.rev || []).some(t => t >= sod))) out.push({ done: true, label: `Ôn bài cũ: bài ${l.n} (${l.level})`, sub: 'Đã ôn hôm nay', href: `#/bai/${encodeURIComponent(l.id)}`, btn: 'Xem' });
  for (const l of dueReviews().slice(0, 2)) out.push({ done: false, label: `Ôn bài cũ: bài ${l.n} (${l.level})`, sub: `Lần ${reviewDue(l).k + 1}/4 · ${plain(l.title)}`, href: `#/onbai/${encodeURIComponent(l.id)}`, btn: 'Ôn' });
  // bài đang học: bước tiếp theo
  const cl = currentLesson(cur);
  if (cl) { const s = lessonState(cl), nx = s.next >= 0 ? s.next : 7, did = actToday('lesson'); out.push({ done: did > 0, label: `Bài ${cl.n}: ${plain(cl.title)}`, sub: `${s.nDone}/8 bước${did ? ` · hôm nay đã làm ${did} lượt` : ''} · tiếp: ${STEPS[nx][1]}`, href: `#/bai/${encodeURIComponent(cl.id)}?b=${nx + 1}`, btn: 'Học' }); }
  const hasNewV = D.vocab.some(it => status(it) === 'new');
  const lnew = cl && cl.words.some(id => { const it = D.items.get(id); return it && status(it) === 'new'; });
  if (hasNewV) out.push({ done: newV >= plan.v, label: `Học ${plan.v} từ mới`, sub: `Hôm nay đã học ${newV}${lnew ? ` · từ của bài ${cl.n}` : ''}`, href: lnew ? `#/bai/${encodeURIComponent(cl.id)}/hoc` : '#/moi', btn: 'Học' });
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
  if (hasNewK) out.push({ done: newK >= plan.k, label: `${plan.k} chữ Hán`, sub: `Hôm nay đã học ${newK}${lk ? ` · chữ của bài ${cl.n}` : ''}`, href: lk ? `#/bai/${encodeURIComponent(cl.id)}?b=3` : '#/chuhan/moi', btn: 'Học' });
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
