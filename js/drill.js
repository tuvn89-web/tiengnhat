// Bộ chạy bài tập dùng chung: chọn đáp án · sắp xếp mảnh câu · chạm vào chỗ sai.
// Dùng cho ôn chữ Hán, bài tập ngữ pháp và thi thử.
import { esc, shuffle, beep, buzz, icon, toast, orderOK, altOrders, activeNow } from './util.js';
import { S, saveSettings } from './settings.js';
import { attachRomaji, romajiToKana, normKana } from './romaji.js';
import { knownBtnHTML, bindKnownBtn } from './quiz.js';
import { D, logAct, actOf } from './data.js';
import { answerExplainHTML } from './explain.js';
import { review, isLeech, SLOW_DIRS, itemType } from './srs.js';
import { leechSeen, markLeech, leechCardHTML, leechBarHTML } from './leech.js';
import { confuseCmpHTML, isConfusable } from './wordx.js';
import { isSimilar, similarCmpHTML } from './kanji.js';
import { burstAtEl } from './season.js';
import { speak, ttsReady } from './tts.js';
import { bindSay, confirmBox } from './ui.js';
import { beginSession, goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';

/* Một câu hỏi:
  { kind: 'choice' | 'order' | 'spot', tag: 'Điền chỗ trống', level: 'N5',
    prompt: html, hint: chữ, say: chữ để đọc, autoSay: bool, promptBare: bool (kanji không được chạm),
    opts: [{ key, html, jp }], answer: key,           ← choice
    chunks: [html…] (đúng thứ tự), extra: [html…],    ← order
    parts: [html…], bad: số thứ tự, fix: html,        ← spot
    accept: [chữ…], answerHTML: html, placeholder      ← type (tự gõ; so sau khi chuẩn hoá kana)
    after: html (giải thích sau khi trả lời), review: { id, dir } }  */
export function runDrill(view, qs, ctx, { title = 'Luyện tập', mode = 'practice', timeLimit = 0, timeBox = 0, again, againLabel = '', noReview = false, onDone, runClass = '' } = {}) {
  if (!qs.length) { view.innerHTML = '<div class="empty"><p>Chưa đủ dữ liệu cho bài này.</p></div>'; return; }
  beginSession(ctx);
  if (mode === 'test') return runTest(view, qs, ctx, { title, timeLimit, again, noReview, onDone });
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
  // v31 (M4): lượt giới hạn thời gian (giây, chỉ tính lúc app đang hiện) — hết giờ thì làm nốt câu đang dở rồi dừng
  const tb0 = activeNow();
  const tbLeft = () => Math.max(0, Math.ceil(timeBox - (activeNow() - tb0) / 1000));
  if (timeBox) timer = setInterval(() => {
    const c = view.querySelector('.clock'); if (c) c.textContent = st.expired ? 'Hết giờ' : fmt(tbLeft());
    const bi = view.querySelector('.run-top .bar i'); if (bi) bi.style.width = (100 - (tbLeft() / timeBox) * 100) + '%';
    if (!st.expired && tbLeft() <= 0) { st.expired = true; if (c) c.textContent = 'Hết giờ'; c?.classList.add('is-over'); }
  }, 500);

  const head = () => `<div class="run-top">
      <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
      ${timeBox ? `<div class="bar bar-time" role="timer" aria-label="Thời gian còn lại"><i style="width:${100 - (tbLeft() / timeBox) * 100}%"></i></div>
      <span class="run-n"><span class="clock${st.expired ? ' is-over' : ''}">${st.expired ? 'Hết giờ' : fmt(tbLeft())}</span> · câu ${st.res.length + 1}</span>`
      : `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${st.qs.length}" aria-valuenow="${st.i}"><i style="width:${(st.i / st.qs.length) * 100}%"></i></div>
      <span class="run-n">${test && timeLimit ? `<span class="clock">${fmt(left())}</span> · ` : ''}${Math.min(st.i + 1, st.qs.length)}/${st.qs.length}</span>`}
    </div>`;
  const card = q => `<article class="label-card" data-nokj ${q.promptBare ? 'data-bare' : ''}>
      <div class="label-head"><span class="label-tag">${esc(q.tag || title)}</span>${q.level ? `<span class="label-lv">${esc(q.level)}</span>` : ''}</div>
      ${q.prompt}
      ${q.hint ? `<p class="prompt-hint">${q.hint}</p>` : ''}
      ${q.say ? `<div class="say-row"><button type="button" class="icon-btn say" data-say="${esc(q.say)}" aria-label="Nghe">${icon('speaker')}</button></div>` : ''}
      <div class="stamp" aria-hidden="true"></div></article>`;

  function show() {
    if (st.i >= st.qs.length || st.expired) return finish();
    const q = st.qs[st.i];
    // v31 (N5): mục cứng đầu — xem lại thẻ đầy đủ rồi mới hỏi (mỗi mục 1 lần mỗi ngày)
    const li = q.review && !noReview && !q._again && q.kind !== 'info' ? D.items.get(q.review.id) : null;
    if (li && isLeech(li) && !leechSeen(li.id)) {
      markLeech(li.id);
      view.innerHTML = `<div class="run ${runClass}">${head()}${leechCardHTML(li)}${leechBarHTML()}</div>`;
      bindSay(view);
      view.querySelector('[data-act=quit]').onclick = () => (st.i > 0 || st.res.length ? finish(true) : goBack(ctx));
      const go = () => { window.scrollTo(0, 0); showQ(q); };
      view.querySelector('[data-act=leechgo]').onclick = go;
      setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      return;
    }
    showQ(q);
  }
  function showQ(q) {
    st.lock = false;
    q._t0 = activeNow();
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
    } else if (q.kind === 'type') {
      body = `<form class="typebox" onsubmit="return false">
          <input class="input type-in" type="text" lang="${q.lang || (q.romajiOff ? 'en' : 'ja')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="Gõ câu trả lời" placeholder="${esc(q.placeholder || (S.romaji ? 'gõ romaji (vd. kakareru) hoặc kana' : 'gõ bằng kana'))}">
          <button type="submit" class="btn btn-primary" data-act="tcheck">Kiểm tra</button></form>
        ${q.romajiOff ? '' : `<label class="check small type-rj"><input type="checkbox" data-act="romaji" ${S.romaji ? 'checked' : ''}> Gõ romaji tự đổi sang kana</label>
        <p class="small muted type-tip">Bàn phím tiếng Việt (Telex) sẽ đổi chữ khi gõ romaji — chuyển sang bàn phím tiếng Anh hoặc tiếng Nhật.</p>`}`;
    }
    view.innerHTML = `<div class="run ${runClass}">${head()}${card(q)}${body}<div class="after" hidden></div></div>`;
    bindSay(view);
    // đã trả lời câu nào thì dừng là ra màn kết quả (tính là đã làm), chưa trả lời thì quay lại trang trước
    view.querySelector('[data-act=quit]').onclick = () => (st.i > 0 || st.res.length ? finish(true) : goBack(ctx));
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
      chk.onclick = () => {
        // mảnh trùng chữ với mảnh mẫu ở đúng vị trí thì coi như đúng mảnh đó
        const seq = picked.map((n, i) => (q._pool[n].h === q.chunks[i] ? i : q._pool[n].k));
        q._seq = seq;
        answer(q, orderOK(q.chunks, seq));
      };
      sync();
      setKeys(null);
    } else if (q.kind === 'info') {
      view.querySelector('.stamp')?.remove();
      const bar = document.createElement('div');
      bar.className = 'next-bar';
      bar.innerHTML = `<button type="button" class="btn btn-primary" data-act="next">${esc(q.btn || 'Đã xem — làm bài')}</button>`;
      view.querySelector('.run').appendChild(bar);
      const nb = bar.querySelector('[data-act=next]');
      nb.onclick = () => { st.i++; show(); };
      setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); nb.click(); } });
    } else if (q.kind === 'spot') {
      view.querySelectorAll('.spot .chunk').forEach(b => b.onclick = () => answer(q, +b.dataset.n === q.bad, b));
      setKeys(null);
    } else if (q.kind === 'type') {
      const inp = view.querySelector('.type-in');
      const rj = () => S.romaji && !q.romajiOff;
      attachRomaji(inp, rj);
      const rb = view.querySelector('[data-act=romaji]');
      if (rb) rb.onchange = e => { S.romaji = e.target.checked; saveSettings(); inp.placeholder = S.romaji ? 'gõ romaji (vd. kakareru) hoặc kana' : 'gõ bằng kana'; inp.focus(); };
      view.querySelector('.typebox').onsubmit = e => {
        e.preventDefault();
        if (st.lock) return;
        const typed = (rj() ? romajiToKana(inp.value, true) : inp.value).trim();
        if (!typed) { inp.focus(); return; }
        inp.value = typed;
        q._typed = typed;
        // câu dịch: hàm chấm riêng (so từ khoá / so cả câu, nhiều thứ tự) trả về {ok, html}
        if (q.judge) { const j = q.judge(typed); q._judgeHTML = j.html; return answer(q, j.ok); }
        answer(q, (q.accept || []).some(a => normKana(a) === normKana(typed)));
      };
      setKeys(null);
      setTimeout(() => inp.focus({ preventScroll: true }), 50);
    }
  }

  async function answer(q, ok, picked) {
    if (st.lock) return;
    st.lock = true;
    const first = !q._again;
    const entry = first ? { q, ok } : null;
    if (first) { st.res.push(entry); if (ok) st.score++; }
    // ghi lịch ôn / điểm theo thể; câu tự gõ thì chờ bấm Tiếp (còn nút "Tôi gõ đúng" để chấm lại)
    let committed = false;
    // v31 (N3): câu chọn đáp án của từ vựng / chữ Hán đúng mà nghĩ quá lâu → chưa lên hộp
    const secs = Math.round((activeNow() - (q._t0 || activeNow())) / 1000);
    const slow = ok && first && !noReview && q.kind === 'choice' && S.slowSec > 0 && !!q.review && SLOW_DIRS.has(q.review.dir) && !q.noSlow && secs > S.slowSec;
    const commit = () => {
      if (committed) return; committed = true; st.pending = null;
      const okv = entry ? entry.ok : ok;
      const done = q.review && first && !noReview ? review(q.review.id, q.review.dir, okv, { slow: slow && okv }) : null;
      if (first && q.onAnswer) q.onAnswer(okv);
      return done;
    };
    if (q.kind === 'type') st.pending = commit; else commit();
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
    if (ok) burstAtEl(view.querySelector('.opt.is-ok, .spot .chunk.is-ok') || view.querySelector('.stamp'));
    let againQ = null;
    if (!ok && first && !st.again.has(st.i)) {
      st.again.add(st.i);
      againQ = { ...q, _again: true };
      st.qs.splice(Math.min(st.i + 4, st.qs.length), 0, againQ);
    }
    const after = view.querySelector('.after');
    after.hidden = false;
    let right = '';
    if (!ok && q.kind === 'choice') right = `<p class="after-msg">Đáp án đúng: <b lang="ja">${q.opts.find(o => o.key === q.answer)?.html || ''}</b></p>`;
    if (q.kind === 'order') right = orderMsg(q, ok);
    if (!ok && q.kind === 'spot') right = `<p class="after-msg">Chỗ sai là mảnh được tô xanh. Sửa thành: <b lang="ja">${q.fix}</b></p>`;
    if (q.kind === 'type') {
      view.querySelectorAll('.typebox input, .typebox button, [data-act=romaji]').forEach(b => { b.disabled = true; });
      right = (q._judgeHTML || (ok ? `<p class="after-ok">Đúng: <b lang="ja">${q.answerHTML}</b></p>`
        : `<p class="after-msg">Đáp án: <b lang="ja">${q.answerHTML}</b> · Bạn gõ: <span lang="ja">${esc(q._typed || '')}</span></p>`))
        + (!ok && first ? `<button type="button" class="btn btn-ghost btn-sm" data-act="override">${q.judge ? 'Tôi dịch đúng — tính là đúng' : 'Tôi gõ đúng — tính là đúng'}</button>` : '');
    }
    // v31 (L1, L2): chọn nhầm sang từ dễ nhầm / chữ trông giống → hiện bảng so sánh
    let cmp = '';
    if (!ok && q.kind === 'choice' && picked && !q.noCmp) {
      const ri = D.items.get(q.cmpRight || q.review?.id || ''), pk = picked.dataset.k, pi = D.items.get((q.cmpOf || {})[pk] || pk);
      if (ri && pi && itemType(ri) === 'kanji' && isSimilar(ri, pi)) cmp = similarCmpHTML([ri, pi], { focus: ri.char, picked: pi.char, title: 'Hai chữ này trông giống' });
      else if (ri && pi && itemType(ri) === 'vocab' && isConfusable(ri, pi)) cmp = confuseCmpHTML([ri, pi], { focus: ri.id, picked: pi.id, title: 'Hai từ này dễ nhầm' });
    }
    const slowMsg = slow ? `<p class="after-slow small">Đúng nhưng chậm (${secs} giây) — chưa lên hộp, sẽ hỏi lại sớm hơn.</p>` : '';
    after.innerHTML = right + slowMsg + cmp + (q.after || '') + answerExplainHTML(q);
    const ov = after.querySelector('[data-act=override]');
    if (ov) ov.onclick = () => {
      if (!entry || entry.ok) return;
      entry.ok = true; st.score++;
      if (againQ) { const k = st.qs.indexOf(againQ); if (k > st.i) st.qs.splice(k, 1); st.again.delete(st.i); }
      view.querySelector('.stamp').className = 'stamp stamp-ok';
      ov.replaceWith(Object.assign(document.createElement('p'), { className: 'small muted', textContent: 'Đã tính là đúng.' }));
    };
    // phần giải thích nằm dưới thanh "Tiếp" (thanh dính đáy màn hình) thì cuộn lên cho thấy hết
    requestAnimationFrame(() => { if (after.getBoundingClientRect().bottom > innerHeight - 150) after.scrollIntoView({ block: 'end', behavior: 'smooth' }); });
    const bar = document.createElement('div');
    bar.className = 'next-bar';
    // mục có lịch ôn (từ, chữ Hán, mẫu, câu dịch): thêm nút "Đã thuộc"
    const kItem = q.review && !noReview ? (D.items.get(q.review.id) || (q.review.id.startsWith('s:') ? { id: q.review.id } : null)) : null;
    bar.innerHTML = `${kItem ? knownBtnHTML(kItem) : ''}<button type="button" class="btn btn-primary" data-act="next">Tiếp</button>`;
    view.querySelector('.run').appendChild(bar);
    // câu tự gõ: ghi kết quả trước rồi mới đánh dấu thuộc (để kết quả ghi sau không xoá dấu thuộc)
    if (kItem) bindKnownBtn(bar, kItem, () => { if (againQ) { const k = st.qs.indexOf(againQ); if (k > st.i) { st.qs.splice(k, 1); return () => st.qs.splice(k, 0, againQ); } } }, () => st.pending?.());
    const nb = bar.querySelector('[data-act=next]');
    nb.onclick = () => { st.pending?.(); st.i++; show(); };
    if (timeBox && st.expired) nb.textContent = 'Xem kết quả';
    nb.focus({ preventScroll: true });
    setKeys(e => { if (e.key === 'Enter') { e.preventDefault(); nb.click(); } });
    if (ok && S.autoNext) setTimeout(() => { if (view.contains(nb)) nb.click(); }, S.autoNext);
  }

  function finish(early = false) {
    st.pending?.();
    setKeys(null); clearInterval(timer); timer = null;
    if (st.res.length) logAct(actOf(ctx.back), actOf(ctx.back) === 'kana' ? st.res.length : 1);
    onDone?.(st.res, { early, score: st.score, total: st.total, practice: true });
    renderResult(view, ctx, { title, mode, test, early: early && !st.expired, res: st.res, total: st.total, score: st.score, again, againLabel, timeBox,
      redo: wrong => runDrill(view, wrong.map(w => ({ ...w.q, _again: false })), ctx, { title, mode, again, noReview }) });
  }
  show();
}

// Lời nhận xét bài sắp xếp câu: câu mẫu + các thứ tự khác cũng đúng
function orderMsg(q, ok) {
  const alts = altOrders(q.chunks);
  const line = c => `<span lang="ja" class="ans-line">${c.join(' ')}</span>`;
  const same = ok && (q._seq || []).every((k, i) => k === i);
  let h = `<p class="${ok ? 'after-ok' : 'after-msg'}">${ok ? (same ? 'Đúng thứ tự.' : 'Đúng! Câu mẫu xếp:') : alts.length ? 'Các thứ tự đúng:' : 'Thứ tự đúng:'} ${ok && same ? '' : line(q.chunks)}</p>`;
  const rest = ok && !same ? alts.filter(c => c.some((x, i) => x !== q.chunks[(q._seq || [])[i]])) : alts;
  if (rest.length) h += `<p class="after-alt small">${ok ? 'Cũng đúng:' : 'Hoặc:'} ${rest.map(line).join(' <span class="muted">·</span> ')}</p>`;
  return h;
}

// Màn kết quả dùng chung (luyện tập và thi thử)
function renderResult(view, ctx, { title, test, early, res, total, score, again, againLabel = '', timeBox = 0, redo }) {
  ctx.inRun = true; // màn kết quả: nút Back của điện thoại về trang trước khi vào bài
  const answered = res.filter(r => !r.skip).length;
  const wrong = res.filter(r => !r.ok);
  const byTag = {};
  for (const r of res) { const t = r.q.tag || ''; byTag[t] = byTag[t] || [0, 0]; byTag[t][1]++; if (r.ok) byTag[t][0]++; }
  const pct = total ? Math.round((score / total) * 100) : 0;
  const ansHTML = q => q.kind === 'choice' ? (q.opts.find(o => o.key === q.answer)?.html || '') : q.kind === 'order' ? [q.chunks, ...altOrders(q.chunks)].map(c => c.join(' ')).join(' <span class="muted small">hoặc</span> ') : q.kind === 'type' ? q.answerHTML : q.fix;
  const chosenHTML = r => r.q.kind === 'type' ? `<p class="small">Đã gõ: <span lang="ja">${esc(r.q._typed || '')}</span></p>` : r.q.kind !== 'choice' ? '' : r.skip ? '<p class="muted small">Bỏ trống</p>' : `<p class="small">Đã chọn: <span lang="ja">${r.q.opts.find(o => o.key === r.chosen)?.html || ''}</span></p>`;
  view.innerHTML = `<section class="result">${crumbHTML(ctx)}
      <h1 class="h1">${test ? 'Kết quả thi thử' : early ? 'Đã dừng' : timeBox ? 'Xong ' + esc(title.toLowerCase()) : 'Xong lượt'}</h1>
      <p class="result-score"><b>${score}</b><span>/${test ? total : answered}</span></p>
      <p class="result-sub">${test ? `${pct}% · ${answered < total ? `bỏ trống ${total - answered} câu` : 'làm đủ các câu'}` : 'câu đúng ngay lần đầu'}</p>
      ${test ? `<table class="topics bytag"><tbody>${Object.entries(byTag).map(([t, [a, b]]) => `<tr><th scope="row">${esc(t)}</th><td><span class="mini"><i style="width:${(a / b) * 100}%"></i></span></td><td class="num">${a}/${b}</td></tr>`).join('')}</tbody></table>` : ''}
      ${wrong.length ? `<h2 class="h2">${test ? 'Câu sai và câu bỏ trống' : 'Câu trả lời sai'}</h2><ul class="wlist wlist-drill">${wrong.map(r => `<li><span class="muted small">${esc(r.q.tag || '')}</span><div class="wq">${r.q.prompt}</div>${test || r.q.kind === 'type' ? chosenHTML(r) : ''}<p>Đáp án: <b lang="ja">${ansHTML(r.q)}</b></p>${r.q.after || ''}${answerExplainHTML(r.q, { open: false })}</li>`).join('')}</ul>` : answered ? '<p class="result-good">Không sai câu nào.</p>' : ''}
      <div class="row-btns stack">
        ${wrong.length && redo ? `<button class="btn btn-primary" data-act="redo">${test ? 'Luyện lại các câu sai (không tính điểm)' : 'Làm lại câu sai'}</button>` : ''}
        ${again ? `<button class="btn ${wrong.length && redo && !againLabel ? 'btn-ghost' : 'btn-primary'}" data-act="again">${test ? 'Làm đề mới' : esc(againLabel || 'Lượt mới')}</button>` : ''}
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
function runTest(view, qs, ctx, { title, timeLimit, again, noReview = false, onDone }) {
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
        ${q.say ? `<div class="say-row"><button type="button" class="icon-btn say" data-say="${esc(q.say)}" aria-label="Nghe">${icon('speaker')}</button></div>` : ''}
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
    view.querySelector('.run')._q = q; // (để kiểm thử tự động đọc được câu đang hiện)
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
    if (quit && nAns() === 0) {
      clearInterval(timer); setKeys(null); st.done = true;
      if (onDone) return onDone(qs.map(q => ({ q, chosen: null, skip: true, ok: false })), { quit, empty: true, secs: 0 });
      return goBack(ctx);
    }
    if (quit && !(await confirmBox('Dừng thi và nộp bài với các câu đã làm?', 'Nộp bài', 'Làm tiếp'))) return;
    st.done = true; clearInterval(timer); setKeys(null);
    const res = qs.map((q, k) => ({ q, chosen: st.ans[k], skip: st.ans[k] == null, ok: st.ans[k] === q.answer }));
    logAct(actOf(ctx.back));
    if (!noReview) for (const r of res) if (!r.skip && r.q.review) review(r.q.review.id, r.q.review.dir, r.ok);
    // bài kiểm tra trình độ tự xử lý kết quả
    if (onDone) return onDone(res, { quit, secs: Math.round((Date.now() - st.t0) / 1000) });
    // thi xong: luyện lại câu sai và câu bỏ trống, không tính vào lịch ôn (đã tính khi nộp bài)
    const redo = wrong => runDrill(view, wrong.map(w => ({ ...w.q, _again: false })), ctx, { title: title + ' · luyện lại', again, noReview: true });
    renderResult(view, ctx, { title, test: true, res, total: n, score: res.filter(r => r.ok).length, again, redo });
  }
  show();
}

// Gắn nhãn cho phương án (chữ Nhật có furigana)
export const opt = (key, html, jp = true) => ({ key, html, jp });
export const ttsOK = () => ttsReady();
