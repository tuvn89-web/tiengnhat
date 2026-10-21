// Học từ mới (A1–A4): xem thẻ → "Đã học" / "Biết rồi" / "Để sau". Không kiểm tra ngay; lật lại được thẻ trước.
import { esc, wordHTML, icon, toast, shuffle, beep, buzz } from './util.js';
import { fillWordMore } from './wordx.js';
import { D } from './data.js';
import { S } from './settings.js';
import { logAct, actOf } from './data.js';
import { setLearned, unsetLearned, status } from './srs.js';
import { speak } from './tts.js';
import { bindSay, wordDetailHTML, emptyState } from './ui.js';
import { beginSession, goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';
import { hvTrap } from './hvbay.js';

const DEC = { learned: 'Đã học', known: 'Biết rồi', later: 'Để sau' };

export function learnCardHTML(it, dec, { lazyRest = true } = {}) {
  return `<article class="label-card is-intro">
      <div class="label-head"><span class="label-tag">Từ mới</span>${dec ? `<span class="label-dec">Đã chọn: ${DEC[dec]}</span>` : ''}<span class="label-lv">${esc(it.level || '')}</span></div>
      ${wordDetailHTML(it, { lazyRest })}
    </article>`;
}
export const learnBarHTML = (canBack = false) => `<div class="next-bar learn-bar">
    ${canBack ? `<button type="button" class="btn btn-ghost" data-l="back" aria-label="Thẻ trước">←</button>` : ''}
    <button type="button" class="btn btn-ghost btn-sm" data-l="later">Để sau</button>
    <button type="button" class="btn btn-ghost btn-sm" data-l="known">Biết rồi</button>
    <button type="button" class="btn btn-primary" data-l="learned">Đã học</button>
  </div>`;
// Ghi lựa chọn vào tiến độ
export async function applyDecision(it, dec, prev) {
  if (dec === 'learned') await setLearned(it, 'learned');
  else if (dec === 'known') await setLearned(it, 'known');
  else if (dec === 'later' && (prev === 'learned' || prev === 'known')) await unsetLearned(it);
}

// v31 (M1): đoán nghĩa từ âm Hán Việt — từng chữ Hán của từ: chữ, âm, nghĩa (lấy từ thẻ chữ nếu có)
export function hvBreakdownHTML(it) {
  const cs = [...(it.kanji || '')].filter(c => /[\u4e00-\u9fff]/.test(c));
  const hv = String(it.hv || '').split(/\s+/).filter(Boolean);
  if (!cs.length) return '';
  return `<div class="hvb" data-bare>${cs.map((c, i) => { const k = D.kanjiByChar.get(c); return `<${k ? `button type="button" data-kopen="${esc(c)}"` : 'span'} class="hvb-c"><b lang="ja">${esc(c)}</b><span>${esc(k?.hv || hv[i] || '')}${k?.nghia ? ` — ${esc(k.nghia)}` : ''}</span></${k ? 'button' : 'span'}>`; }).join('<span class="hvb-plus">+</span>')}</div>`;
}
// v50: từ "bẫy Hán Việt" không cho đoán nghĩa từ âm (đoán theo tiếng Việt là sai) — thẻ từ hiện nhãn cảnh báo thay vào đó
export const canGuess = it => !!(it.kanji && it.hv && /[\u4e00-\u9fff]/.test(it.kanji)) && !hvTrap(it);

export function runLearn(view, items, ctx, { again, onFinish, guess = false } = {}) {
  if (!items.length) { view.innerHTML = emptyState('Đã học hết từ mới trong kho (theo bộ lọc đang chọn). Nhập thêm gói từ ở trang Dữ liệu.', '<a class="btn btn-primary" href="#/luyen">Về Luyện tập</a>'); return; }
  const st = { i: 0, dec: new Map(), guessed: new Map() };
  beginSession(ctx);
  let keyH = null;
  const setKeys = h => { if (keyH) document.removeEventListener('keydown', keyH); keyH = h; if (h) document.addEventListener('keydown', h); };
  ctx.onLeave(() => setKeys(null));

  function show() {
    if (st.i >= items.length) return finish();
    const it = items[st.i];
    if (guess && canGuess(it) && !st.guessed.has(it.id)) return guessQ(it);
    view.innerHTML = `<div class="run">
      <div class="run-top">
        <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${st.i}"><i style="width:${(st.i / items.length) * 100}%"></i></div>
        <span class="run-n">${st.i + 1}/${items.length}</span>
      </div>
      ${learnCardHTML(it, st.dec.get(it.id))}
      ${learnBarHTML(st.i > 0)}</div>`;
    fillWordMore(view);
    bindSay(view);
    view.querySelector('[data-act=quit]').onclick = () => (st.i > 0 || st.dec.size ? finish(true) : goBack(ctx));
    view.querySelector('.learn-bar').onclick = e => { const b = e.target.closest('[data-l]'); if (b) act(b.dataset.l); };
    // vuốt sang phải = lật lại thẻ trước
    const card = view.querySelector('.label-card');
    let x0 = null;
    card.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', e => { if (x0 != null && e.changedTouches[0].clientX - x0 > 70 && st.i > 0) act('back'); x0 = null; });
    setKeys(e => {
      if (e.target.closest('input, textarea')) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act('learned'); }
      if (e.key === 'ArrowLeft' && st.i > 0) act('back');
    });
    window.scrollTo(0, 0);
    if (S.autoSpeak) speak(it.kana);
  }
  // Bước đoán: thấy từ + âm Hán Việt, chọn nghĩa; đoán xong mới hiện thẻ (không đổi lịch ôn)
  async function guessQ(it) {
    const { answerOf, distractors } = await import('./quiz.js');
    const right = answerOf(it, 'jv', 'furi'), opts = shuffle([right, ...distractors(it, 'jv', 'furi')]);
    view.innerHTML = `<div class="run">
      <div class="run-top">
        <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
        <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${st.i}"><i style="width:${(st.i / items.length) * 100}%"></i></div>
        <span class="run-n">${st.i + 1}/${items.length}</span>
      </div>
      <article class="label-card guess" data-nokj>
        <div class="label-head"><span class="label-tag">Đoán nghĩa trước</span><span class="label-lv">${esc(it.level || '')}</span></div>
        <p class="prompt-jp" lang="ja">${wordHTML(it, 'furi')}</p>
        <p class="guess-hv">${esc(it.hv)}</p>
        <p class="prompt-hint">Nhìn âm Hán Việt, đoán nghĩa của từ</p><div class="stamp" aria-hidden="true"></div>
      </article>
      <div class="opts">${opts.map((a, k) => `<button type="button" class="opt" data-k="${esc(a.key)}"><span class="opt-n">${k + 1}</span><span class="opt-t">${a.html}</span></button>`).join('')}</div>
      <div class="after" hidden></div></div>`;
    view.querySelector('[data-act=quit]').onclick = () => (st.i > 0 || st.dec.size ? finish(true) : goBack(ctx));
    const pick = key => {
      if (st.guessed.has(it.id)) return;
      const ok = key === right.key;
      st.guessed.set(it.id, ok);
      view.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.k === right.key) b.classList.add('is-ok'); else if (b.dataset.k === key) b.classList.add('is-ng'); });
      view.querySelector('.stamp').className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
      view.querySelector('.label-card').removeAttribute('data-nokj');
      if (S.sound) beep(ok);
      if (!ok && S.vibrate) buzz();
      if (ok) import('./season.js').then(m => m.burstAtEl(view.querySelector('.opt.is-ok')));
      const after = view.querySelector('.after');
      after.hidden = false;
      after.innerHTML = `<p class="${ok ? 'after-ok' : 'after-msg'}">${ok ? 'Đoán đúng!' : `Nghĩa đúng: <b>${esc(it.vi)}</b>`}</p>${hvBreakdownHTML(it)}`;
      const bar = document.createElement('div');
      bar.className = 'next-bar';
      bar.innerHTML = '<button type="button" class="btn btn-primary" data-act="card">Xem thẻ</button>';
      view.querySelector('.run').appendChild(bar);
      const nb = bar.querySelector('[data-act=card]');
      nb.onclick = () => show();
      nb.focus({ preventScroll: true });
      setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); } });
    };
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(b.dataset.k));
    setKeys(e => { const n = +e.key; if (n >= 1 && n <= opts.length) pick(opts[n - 1].key); });
    window.scrollTo(0, 0);
  }
  async function act(a) {
    if (a === 'back') { st.i--; return show(); }
    const it = items[st.i];
    await applyDecision(it, a, st.dec.get(it.id));
    st.dec.set(it.id, a);
    st.i++; show();
  }
  function finish(early = false) {
    setKeys(null);
    const learned = items.filter(it => st.dec.get(it.id) === 'learned');
    const known = items.filter(it => st.dec.get(it.id) === 'known');
    const later = items.filter(it => st.dec.get(it.id) === 'later');
    ctx.inRun = true;
    view.innerHTML = `<section class="result">${crumbHTML(ctx)}
      <h1 class="h1">${early ? 'Đã dừng' : 'Xong lượt học'}</h1>
      <p class="result-score"><b>${learned.length}</b><span> từ đã học</span></p>
      <p class="result-sub">${known.length ? `${known.length} từ đã biết · ` : ''}${later.length ? `${later.length} từ để sau · ` : ''}lần ôn đầu: ngày mai</p>
      ${st.guessed.size ? `<p class="result-sub">Đoán nghĩa đúng <b>${[...st.guessed.values()].filter(Boolean).length}/${st.guessed.size}</b> từ nhờ âm Hán Việt</p>` : ''}
      ${learned.length ? `<ul class="wlist">${learned.map(it => `<li><button type="button" class="row" data-wopen="${esc(it.id)}"><span lang="ja">${wordHTML(it, 'furi')}</span><span>${esc(it.vi)}</span></button></li>`).join('')}</ul>` : ''}
      <div class="row-btns stack">
        ${learned.length ? `<button class="btn btn-primary" data-act="test">Kiểm tra nhanh ${learned.length} từ này</button>` : ''}
        ${again ? `<button class="btn ${learned.length ? 'btn-ghost' : 'btn-primary'}" data-act="more">Học thêm từ mới</button>` : ''}
      </div>${resultNavHTML(ctx, { kind: learned.length ? 'learn' : 'practice' })}</section>`;
    const t = view.querySelector('[data-act=test]');
    if (t) t.onclick = async () => {
      const { runQuiz } = await import('./quiz.js');
      runQuiz(view, learned.map(it => ({ it, dir: Math.random() < 0.5 ? 'jv' : 'vj' })), { dir: 'mix', script: S.script, source: 'learned', noReview: true }, ctx);
    };
    const m = view.querySelector('[data-act=more]');
    if (m) m.onclick = () => again();
    bindResultNav(view, ctx, { kind: learned.length ? 'learn' : 'practice' });
    if (learned.length || known.length) toast(`Đã lưu ${learned.length + known.length} từ vào lịch ôn.`);
    if (st.dec.size) logAct(actOf(ctx.back));
    onFinish?.({ learned, known, later, early });
    ctx.sessionDone?.();
  }
  show();
}
export const isNew = it => status(it) === 'new';
