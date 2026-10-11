// Bộ chạy bài tập dùng chung: chọn đáp án · sắp xếp mảnh câu · chạm vào chỗ sai.
// Dùng cho ôn chữ Hán, bài tập ngữ pháp và thi thử.
import { esc, shuffle, beep, buzz, icon, toast } from './util.js';
import { S } from './settings.js';
import { review } from './srs.js';
import { speak, ttsReady } from './tts.js';
import { bindSay, confirmBox } from './ui.js';
import { beginSession, goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';

/* Một câu hỏi:
  { kind: 'choice' | 'order' | 'spot', tag: 'Điền chỗ trống', level: 'N5',
    prompt: html, hint: chữ, say: chữ để đọc, autoSay: bool, promptBare: bool (kanji không được chạm),
    opts: [{ key, html, jp }], answer: key,           ← choice
    chunks: [html…] (đúng thứ tự), extra: [html…],    ← order
    parts: [html…], bad: số thứ tự, fix: html,        ← spot
    after: html (giải thích sau khi trả lời), review: { id, dir } }  */
export function runDrill(view, qs, ctx, { title = 'Luyện tập', mode = 'practice', timeLimit = 0, again, noReview = false } = {}) {
  if (!qs.length) { view.innerHTML = '<div class="empty"><p>Chưa đủ dữ liệu cho bài này.</p></div>'; return; }
  beginSession(ctx);
  if (mode === 'test') return runTest(view, qs, ctx, { title, timeLimit, again });
  const test = false;
  const st = { qs: [...qs], i: 0, total: qs.length, score: 0, res: [], again: new Set(), lock: false, t0: Date.now() };
  let keyHandler = null, timer = null;
  const setKeys = h => { if (keyHandler) document.removeEventListener('keydown', keyHandler); keyHandler = h; if (h) document.addEventListener('keydown', h); };
  ctx.onLeave(() => { setKeys(null); clearInterval(timer); });
  const left = () => Math.max(0, timeLimit - Math.floor((Date.now() - st.t0) / 1000));
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  if (test && timeLimit) timer = setInterval(() => {
    const c = view.querySelector('.clock'); if (c) c.textContent = fmt(left());
    if (left() <= 0) finish(true);
  }, 1000);

  const head = () => `<div class="run-top">
      <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${st.qs.length}" aria-valuenow="${st.i}"><i style="width:${(st.i / st.qs.length) * 100}%"></i></div>
      <span class="run-n">${test && timeLimit ? `<span class="clock">${fmt(left())}</span> · ` : ''}${Math.min(st.i + 1, st.qs.length)}/${st.qs.length}</span>
    </div>`;
  const card = q => `<article class="label-card" data-nokj ${q.promptBare ? 'data-bare' : ''}>
      <div class="label-head"><span class="label-tag">${esc(q.tag || title)}</span>${q.level ? `<span class="label-lv">${esc(q.level)}</span>` : ''}</div>
      ${q.prompt}
      ${q.hint ? `<p class="prompt-hint">${q.hint}</p>` : ''}
      ${q.say ? `<div class="say-row"><button type="button" class="icon-btn say" data-say="${esc(q.say)}" aria-label="Nghe">${icon('speaker')}</button></div>` : ''}
      <div class="stamp" aria-hidden="true"></div></article>`;

  function show() {
    if (st.i >= st.qs.length) return finish();
    const q = st.qs[st.i];
    st.lock = false;
    let body = '';
    if (q.kind === 'choice') {
      const jp = q.opts.some(o => o.jp);
      body = `<div class="opts ${jp ? 'opts-jp' : ''}">${q.opts.map((o, k) => `<button type="button" class="opt" data-k="${esc(o.key)}"><span class="opt-n">${k + 1}</span><span class="opt-t" ${o.jp ? 'lang="ja"' : ''}>${o.html}</span></button>`).join('')}</div>`;
    } else if (q.kind === 'order') {
      const pool = shuffle([...q.chunks.map((h, k) => ({ h, k })), ...(q.extra || []).map((h, k) => ({ h, k: 'x' + k }))]);
      q._pool = pool;
      body = `<div class="build" lang="ja" aria-label="Câu đang ghép"></div>
        <div class="pool" lang="ja">${pool.map((c, n) => `<button type="button" class="chunk" data-n="${n}">${c.h}</button>`).join('')}</div>
        <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="clear">Xếp lại</button><button type="button" class="btn btn-primary" data-act="check" disabled>Kiểm tra</button></div>`;
    } else if (q.kind === 'spot') {
      body = `<div class="spot" lang="ja">${q.parts.map((h, n) => `<button type="button" class="chunk" data-n="${n}">${h}</button>`).join('')}</div>`;
    }
    view.innerHTML = `<div class="run">${head()}${card(q)}${body}<div class="after" hidden></div></div>`;
    bindSay(view);
    view.querySelector('[data-act=quit]').onclick = () => (st.i > 0 ? finish(true) : goBack(ctx));
    if (q.autoSay && q.say) setTimeout(() => speak(q.say), 150);
    if (q.kind === 'choice') {
      view.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q, b.dataset.k === q.answer, b));
      setKeys(e => { if (st.lock) return; const n = +e.key; if (n >= 1 && n <= q.opts.length) view.querySelectorAll('.opt')[n - 1].click(); });
    } else if (q.kind === 'order') {
      const build = view.querySelector('.build'), poolEl = view.querySelector('.pool'), chk = view.querySelector('[data-act=check]');
      const picked = [];
      const sync = () => {
        build.innerHTML = picked.map((n, i) => `<button type="button" class="chunk on" data-i="${i}">${q._pool[n].h}</button>`).join('') || '<span class="muted small">Chạm các mảnh bên dưới theo đúng thứ tự</span>';
        poolEl.querySelectorAll('.chunk').forEach(b => { b.hidden = picked.includes(+b.dataset.n); });
        chk.disabled = picked.length !== q.chunks.length;
      };
      poolEl.onclick = e => { const b = e.target.closest('.chunk'); if (!b || st.lock) return; if (picked.length < q.chunks.length) { picked.push(+b.dataset.n); sync(); } };
      build.onclick = e => { const b = e.target.closest('.chunk'); if (!b || st.lock) return; picked.splice(+b.dataset.i, 1); sync(); };
      view.querySelector('[data-act=clear]').onclick = () => { if (st.lock) return; picked.length = 0; sync(); };
      chk.onclick = () => answer(q, picked.every((n, i) => q._pool[n].k === i || q._pool[n].h === q.chunks[i]));
      sync();
      setKeys(null);
    } else if (q.kind === 'spot') {
      view.querySelectorAll('.spot .chunk').forEach(b => b.onclick = () => answer(q, +b.dataset.n === q.bad, b));
      setKeys(null);
    }
  }

  async function answer(q, ok, picked) {
    if (st.lock) return;
    st.lock = true;
    const first = !q._again;
    if (first) { st.res.push({ q, ok }); if (ok) st.score++; }
    if (q.review && first && !noReview) review(q.review.id, q.review.dir, ok);
    if (test) { st.i++; return show(); }
    // đánh dấu đáp án
    if (q.kind === 'choice') view.querySelectorAll('.opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.k === q.answer) b.classList.add('is-ok'); else if (b === picked) b.classList.add('is-ng');
    });
    if (q.kind === 'spot') view.querySelectorAll('.spot .chunk').forEach((b, n) => {
      b.disabled = true;
      if (n === q.bad) b.classList.add('is-ok'); else if (b === picked) b.classList.add('is-ng');
    });
    if (q.kind === 'order') view.querySelectorAll('.chunk, [data-act]').forEach(b => { if (b.dataset.act !== 'quit') b.disabled = true; });
    view.querySelector('.stamp').className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
    view.querySelector('.label-card').removeAttribute('data-nokj');
    if (S.sound) beep(ok);
    if (!ok && S.vibrate) buzz();
    if (!ok && first && !st.again.has(st.i)) {
      st.again.add(st.i);
      st.qs.splice(Math.min(st.i + 4, st.qs.length), 0, { ...q, _again: true });
    }
    const after = view.querySelector('.after');
    after.hidden = false;
    let right = '';
    if (!ok && q.kind === 'choice') right = `<p class="after-msg">Đáp án đúng: <b lang="ja">${q.opts.find(o => o.key === q.answer)?.html || ''}</b></p>`;
    if (q.kind === 'order') right = `<p class="${ok ? 'after-ok' : 'after-msg'}">${ok ? 'Đúng thứ tự.' : 'Thứ tự đúng:'} <span lang="ja" class="ans-line">${q.chunks.join(' ')}</span></p>`;
    if (!ok && q.kind === 'spot') right = `<p class="after-msg">Chỗ sai là mảnh được tô xanh. Sửa thành: <b lang="ja">${q.fix}</b></p>`;
    after.innerHTML = right + (q.after || '');
    const bar = document.createElement('div');
    bar.className = 'next-bar';
    bar.innerHTML = `<button type="button" class="btn btn-primary" data-act="next">Tiếp</button>`;
    view.querySelector('.run').appendChild(bar);
    const nb = bar.querySelector('[data-act=next]');
    nb.onclick = () => { st.i++; show(); };
    nb.focus({ preventScroll: true });
    setKeys(e => { if (e.key === 'Enter') { e.preventDefault(); nb.click(); } });
    if (ok && S.autoNext) setTimeout(() => { if (view.contains(nb)) nb.click(); }, S.autoNext);
  }

  function finish(early = false) {
    setKeys(null); clearInterval(timer); timer = null;
    renderResult(view, ctx, { title, mode, test, early, res: st.res, total: st.total, score: st.score, again,
      redo: wrong => runDrill(view, wrong.map(w => ({ ...w.q, _again: false })), ctx, { title, mode, again, noReview }) });
  }
  show();
}

// Màn kết quả dùng chung (luyện tập và thi thử)
function renderResult(view, ctx, { title, test, early, res, total, score, again, redo }) {
  ctx.inRun = true; // màn kết quả: nút Back của điện thoại về trang trước khi vào bài
  const answered = res.filter(r => !r.skip).length;
  const wrong = res.filter(r => !r.ok);
  const byTag = {};
  for (const r of res) { const t = r.q.tag || ''; byTag[t] = byTag[t] || [0, 0]; byTag[t][1]++; if (r.ok) byTag[t][0]++; }
  const pct = total ? Math.round((score / total) * 100) : 0;
  const ansHTML = q => q.kind === 'choice' ? (q.opts.find(o => o.key === q.answer)?.html || '') : q.kind === 'order' ? q.chunks.join(' ') : q.fix;
  const chosenHTML = r => r.q.kind !== 'choice' ? '' : r.skip ? '<p class="muted small">Bỏ trống</p>' : `<p class="small">Đã chọn: <span lang="ja">${r.q.opts.find(o => o.key === r.chosen)?.html || ''}</span></p>`;
  view.innerHTML = `<section class="result">${crumbHTML(ctx)}
      <h1 class="h1">${test ? 'Kết quả thi thử' : early ? 'Đã dừng' : 'Xong lượt'}</h1>
      <p class="result-score"><b>${score}</b><span>/${test ? total : answered}</span></p>
      <p class="result-sub">${test ? `${pct}% · ${answered < total ? `bỏ trống ${total - answered} câu` : 'làm đủ các câu'}` : 'câu đúng ngay lần đầu'}</p>
      ${test ? `<table class="topics bytag"><tbody>${Object.entries(byTag).map(([t, [a, b]]) => `<tr><th scope="row">${esc(t)}</th><td><span class="mini"><i style="width:${(a / b) * 100}%"></i></span></td><td class="num">${a}/${b}</td></tr>`).join('')}</tbody></table>` : ''}
      ${wrong.length ? `<h2 class="h2">${test ? 'Câu sai và câu bỏ trống' : 'Câu trả lời sai'}</h2><ul class="wlist wlist-drill">${wrong.map(r => `<li><span class="muted small">${esc(r.q.tag || '')}</span><div class="wq">${r.q.prompt}</div>${test ? chosenHTML(r) : ''}<p>Đáp án: <b lang="ja">${ansHTML(r.q)}</b></p>${r.q.after || ''}</li>`).join('')}</ul>` : answered ? '<p class="result-good">Không sai câu nào.</p>' : ''}
      <div class="row-btns stack">
        ${wrong.length && redo ? `<button class="btn btn-primary" data-act="redo">${test ? 'Luyện lại các câu sai (không tính điểm)' : 'Làm lại câu sai'}</button>` : ''}
        ${again ? `<button class="btn ${wrong.length && redo ? 'btn-ghost' : 'btn-primary'}" data-act="again">${test ? 'Làm đề mới' : 'Lượt mới'}</button>` : ''}
      </div>${resultNavHTML(ctx, { kind: test ? 'test' : 'practice' })}</section>`;
  bindSay(view);
  view.querySelectorAll('.result [data-nokj]').forEach(x => x.removeAttribute('data-nokj'));
  const r = view.querySelector('[data-act=redo]');
  if (r) r.onclick = () => redo(wrong);
  const a = view.querySelector('[data-act=again]');
  if (a) a.onclick = () => again();
  bindResultNav(view, ctx, { kind: test ? 'test' : 'practice' });
  window.scrollTo(0, 0);
  ctx.sessionDone?.();
}

// Thi thử: chọn đáp án → bấm "Tiếp tục" mới sang câu sau; quay lại câu cũ đổi đáp án được; làm xong bấm "Nộp bài".
function runTest(view, qs, ctx, { title, timeLimit, again }) {
  const n = qs.length;
  const st = { i: 0, ans: new Array(n).fill(null), later: new Set(), t0: Date.now(), done: false };
  let keyHandler = null, timer = null;
  const setKeys = h => { if (keyHandler) document.removeEventListener('keydown', keyHandler); keyHandler = h; if (h) document.addEventListener('keydown', h); };
  ctx.onLeave(() => { setKeys(null); clearInterval(timer); });
  const left = () => Math.max(0, timeLimit - Math.floor((Date.now() - st.t0) / 1000));
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const nAns = () => st.ans.filter(a => a != null).length;
  if (timeLimit) timer = setInterval(() => {
    const c = view.querySelector('.clock'); if (c) c.textContent = fmt(left());
    if (left() <= 0 && !st.done) { toast('Hết giờ — đã nộp bài.'); submit(); }
  }, 1000);

  function show() {
    const q = qs[st.i], last = st.i === n - 1, cur = st.ans[st.i];
    view.innerHTML = `<div class="run test">
      <div class="run-top">
        <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${nAns()}"><i style="width:${(nAns() / n) * 100}%"></i></div>
        <span class="run-n">${timeLimit ? `<span class="clock">${fmt(left())}</span> · ` : ''}${st.i + 1}/${n}</span>
      </div>
      <article class="label-card" data-nokj ${q.promptBare ? 'data-bare' : ''}>
        <div class="label-head"><span class="label-tag">${esc(q.tag || title)}</span>${q.level ? `<span class="label-lv">${esc(q.level)}</span>` : ''}</div>
        ${q.prompt}${q.hint ? `<p class="prompt-hint">${q.hint}</p>` : ''}
      </article>
      <div class="opts ${q.opts.some(o => o.jp) ? 'opts-jp' : ''}">${q.opts.map((o, k) => `<button type="button" class="opt" data-k="${esc(o.key)}" aria-pressed="${cur === o.key}"><span class="opt-n">${k + 1}</span><span class="opt-t" ${o.jp ? 'lang="ja"' : ''}>${o.html}</span></button>`).join('')}</div>
      <details class="tnav"><summary>Danh sách câu · đã làm ${nAns()}/${n}</summary>
        <div class="tgrid">${qs.map((_, k) => `<button type="button" class="tnum${st.ans[k] != null ? ' is-ans' : ''}${k === st.i ? ' is-cur' : ''}${st.later.has(k) ? ' is-later' : ''}" data-go="${k}" aria-label="Câu ${k + 1}">${k + 1}</button>`).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-act="submit">Nộp bài</button>
      </details>
      <div class="next-bar test-bar">
        <button type="button" class="btn btn-ghost" data-act="prev" ${st.i ? '' : 'disabled'} aria-label="Câu trước">←</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="later">Để sau</button>
        <button type="button" class="btn btn-primary" data-act="${last ? 'submit' : 'next'}" ${cur == null && !last ? 'disabled' : ''}>${last ? 'Nộp bài' : 'Tiếp tục'}</button>
      </div></div>`;
    bindSay(view);
    view.querySelector('[data-act=quit]').onclick = () => submit(true);
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(b.dataset.k));
    view.querySelector('[data-act=prev]').onclick = () => go(st.i - 1);
    view.querySelector('[data-act=later]').onclick = () => { st.later.add(st.i); if (!last) go(st.i + 1); else toast('Câu này để sau. Mở Danh sách câu để quay lại.'); };
    const nx = view.querySelector('[data-act=next]'); if (nx) nx.onclick = () => go(st.i + 1);
    view.querySelectorAll('[data-act=submit]').forEach(b => b.onclick = () => submit());
    view.querySelector('.tgrid').onclick = e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); };
    setKeys(e => {
      const k = +e.key;
      if (k >= 1 && k <= q.opts.length) view.querySelectorAll('.opt')[k - 1].click();
      else if (e.key === 'Enter' && st.ans[st.i] != null) { e.preventDefault(); last ? submit() : go(st.i + 1); }
      else if (e.key === 'ArrowLeft' && st.i) go(st.i - 1);
      else if (e.key === 'ArrowRight' && st.i < n - 1) go(st.i + 1);
    });
    if (q.autoSay && q.say) setTimeout(() => speak(q.say), 150);
  }
  function pick(key) {
    st.ans[st.i] = key; st.later.delete(st.i);
    view.querySelectorAll('.opt').forEach(b => b.setAttribute('aria-pressed', b.dataset.k === key));
    const nx = view.querySelector('[data-act=next]'); if (nx) nx.disabled = false;
    // cập nhật thanh tiến độ và danh sách câu
    view.querySelector('.tgrid [data-go="' + st.i + '"]')?.classList.add('is-ans');
    view.querySelector('.tgrid [data-go="' + st.i + '"]')?.classList.remove('is-later');
    const sm = view.querySelector('.tnav summary'); if (sm) sm.textContent = `Danh sách câu · đã làm ${nAns()}/${n}`;
    const bi = view.querySelector('.run-top .bar i'); if (bi) bi.style.width = (nAns() / n) * 100 + '%';
  }
  function go(i) { if (i < 0 || i >= n) return; st.i = i; show(); window.scrollTo(0, 0); }
  async function submit(quit = false) {
    if (st.done) return;
    const empty = n - nAns();
    if (!quit && empty && left() > 0 && !(await confirmBox(`Còn ${empty} câu chưa làm. Nộp bài luôn?`, 'Nộp bài', 'Làm tiếp'))) return;
    if (quit && nAns() === 0) { clearInterval(timer); setKeys(null); return goBack(ctx); }
    if (quit && !(await confirmBox('Dừng thi và nộp bài với các câu đã làm?', 'Nộp bài', 'Làm tiếp'))) return;
    st.done = true; clearInterval(timer); setKeys(null);
    const res = qs.map((q, k) => ({ q, chosen: st.ans[k], skip: st.ans[k] == null, ok: st.ans[k] === q.answer }));
    for (const r of res) if (!r.skip && r.q.review) review(r.q.review.id, r.q.review.dir, r.ok);
    // thi xong: luyện lại câu sai và câu bỏ trống, không tính vào lịch ôn (đã tính khi nộp bài)
    const redo = wrong => runDrill(view, wrong.map(w => ({ ...w.q, _again: false })), ctx, { title: title + ' · luyện lại', again, noReview: true });
    renderResult(view, ctx, { title, test: true, res, total: n, score: res.filter(r => r.ok).length, again, redo });
  }
  show();
}

// Gắn nhãn cho phương án (chữ Nhật có furigana)
export const opt = (key, html, jp = true) => ({ key, html, jp });
export const ttsOK = () => ttsReady();
