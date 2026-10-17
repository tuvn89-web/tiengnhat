// Tim tạm ở bước "Từ mới" của bài học (v18).
// - Tim chỉ nằm trong bộ nhớ, gắn với MỘT bài: không lưu vào máy, không đồng bộ.
// - Giữ tim khi: mở thẻ từ / chữ Hán / bảng giải thích trong trang bài; vào "Luyện từ đã tim" rồi bấm ✕ về bài.
// - Mất tim khi: sang trang khác (router gọi heartRoute), bắt đầu bài luyện khác của bài, tải lại hay đóng app.
// Màn luyện: ghép 8 cặp Việt – Nhật hoặc trắc nghiệm (Việt → Nhật, Nhật → Việt, trộn); không có hồi kết, chỉ nút ✕ mới thoát.
// Lịch ôn: câu đúng làm mới lịch ôn (từ mới / đến hạn: lên một hộp, mỗi chiều một lần mỗi lượt; còn lại: dời hạn từ hôm nay).
// Câu sai không làm tụt hộp.
import { esc, icon, wordHTML, shuffle, beep, buzz, toast } from './util.js';
import { D } from './data.js';
import { S } from './settings.js';
import { review, refreshDue, dirRec } from './srs.js';
import { sameMeaning } from './quiz.js';
import { beginSession, goBack } from './nav.js';
import { sayBtn, bindSay, wordDetailHTML } from './ui.js';
import { speak } from './tts.js';

let H = { lesson: null, ids: new Set() };
export const hearted = (lessonId, id) => H.lesson === lessonId && H.ids.has(id);
export const heartCount = lessonId => (H.lesson === lessonId ? H.ids.size : 0);
export function toggleHeart(lessonId, id) {
  if (H.lesson !== lessonId) H = { lesson: lessonId, ids: new Set() };
  if (H.ids.has(id)) H.ids.delete(id); else H.ids.add(id);
  return H.ids.has(id);
}
export function clearHearts() { H = { lesson: null, ids: new Set() }; }
// Router gọi mỗi lần đổi trang: chỉ trang chính của đúng bài đang tim (#/bai/<mã>, có thể kèm ?b=N) mới giữ tim
export function heartRoute(h) {
  if (!H.lesson) return;
  const m = h.match(/^bai\/([^/?]+)(?:\?b=\d)?$/);
  if (!m || decodeURIComponent(m[1]) !== H.lesson) clearHearts();
}
export const heartBtnHTML = (lessonId, id) => {
  const on = hearted(lessonId, id);
  return `<button type="button" class="icon-btn heart-btn" data-heart="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Bỏ tim' : 'Thả tim'}">${icon('heart')}</button>`;
};

const PAIRS = 8;
const MODES = [['match', 'Ghép 8 cặp Việt – Nhật'], ['quiz', 'Trắc nghiệm']];
const DIRS = [['vj', 'Việt → Nhật'], ['jv', 'Nhật → Việt'], ['mix', 'Trộn']];

// items: các từ đã tim (≥ 2); pool: từ của bài (lấy thêm làm phương án nhiễu)
export function runHeart(view, ctx, items, pool, { onDone } = {}) {
  const st = { mode: 'match', dir: 'mix', round: 0, ok: 0, n: 0, promoted: new Set(), queue: [], lock: false };
  let keyHandler = null;
  const setKeys = h => { if (keyHandler) document.removeEventListener('keydown', keyHandler); keyHandler = h; if (h) document.addEventListener('keydown', h); };
  ctx.onLeave(() => setKeys(null));
  beginSession(ctx);

  // ---- ghi lịch ôn khi trả lời đúng ----
  async function credit(it, dir) {
    st.ok++;
    const key = it.id + '|' + dir, x = dirRec(it.id, dir);
    if (!st.promoted.has(key) && (!x || !x.b || x.due <= Date.now())) { st.promoted.add(key); await review(it.id, dir, true); }
    else await refreshDue(it.id, dir);
  }
  async function exit() {
    setKeys(null);
    await onDone?.(st);
    if (st.n) toast(`Đã luyện ${st.n} lượt · đúng ${st.ok}.`);
    goBack(ctx);
  }

  const head = () => `<div class="run-top">
      <button type="button" class="icon-btn" data-act="quit" aria-label="Thoát">${icon('close')}</button>
      <p class="hrt-count"><b>Màn ${st.round}</b> · đúng ${st.ok}/${st.n}</p>
      <span class="run-n hrt-n">${icon('heart')} ${items.length}</span>
    </div>
    <div class="tabs hrt-tabs" role="tablist">${MODES.map(([k, l]) => `<button type="button" class="tab" role="tab" data-mode="${k}" aria-selected="${st.mode === k}">${l}</button>`).join('')}</div>
    ${st.mode === 'quiz' ? `<div class="chips hrt-dirs" role="group">${DIRS.map(([k, l]) => `<button type="button" class="chip" data-dir="${k}" aria-pressed="${st.dir === k}">${l}</button>`).join('')}</div>` : ''}`;
  function bindHead() {
    view.querySelector('[data-act=quit]').onclick = exit;
    view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { if (st.mode === b.dataset.mode) return; st.mode = b.dataset.mode; st.queue = []; next(true); });
    view.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { st.dir = b.dataset.dir; st.queue = []; next(true); });
  }
  function next(newRound = false) {
    if (st.mode === 'match') { st.round++; return matchRound(); }
    if (newRound || !st.queue.length) { st.round++; st.queue = shuffle([...items]); }
    ask(st.queue.shift());
  }

  // ---- ghép cặp: mỗi màn tối đa 8 cặp, không để hai nghĩa đụng nhau trong cùng màn ----
  function pickPairs() {
    const out = [];
    for (const it of shuffle([...items])) {
      if (out.length >= PAIRS) break;
      if (out.some(o => sameMeaning(o, it) || (o.kanji || o.kana) === (it.kanji || it.kana))) continue;
      out.push(it);
    }
    return out;
  }
  function matchRound() {
    const set = pickPairs(), bad = new Set();
    let sel = { L: null, R: null };
    const tile = (it, side) => side === 'L'
      ? `<button type="button" class="tile" data-id="${esc(it.id)}" data-side="L">${esc(it.vi)}</button>`
      : `<button type="button" class="tile tile-jp" data-id="${esc(it.id)}" data-side="R" lang="ja">${wordHTML(it, S.script === 'kana' ? 'kana' : 'furi')}</button>`;
    view.innerHTML = `<div class="run run-lock hrt">${head()}
      <p class="small muted hrt-hint">Chạm một nghĩa tiếng Việt rồi chạm từ tiếng Nhật đúng với nó.</p>
      <div class="match"><div class="mcol">${shuffle([...set]).map(it => tile(it, 'L')).join('')}</div><div class="mcol">${shuffle([...set]).map(it => tile(it, 'R')).join('')}</div></div></div>`;
    bindHead();
    view.querySelector('.match').onclick = async e => {
      const b = e.target.closest('.tile');
      if (!b || b.disabled) return;
      const side = b.dataset.side;
      if (sel[side]) sel[side].setAttribute('aria-pressed', 'false');
      sel[side] = b; b.setAttribute('aria-pressed', 'true');
      if (side === 'R' && S.autoSpeak) { const it = D.items.get(b.dataset.id); if (it) speak(it.kana); }
      if (!sel.L || !sel.R) return;
      const a = sel.L, c = sel.R;
      sel = { L: null, R: null };
      a.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', 'false');
      if (a.dataset.id === c.dataset.id) {
        a.disabled = c.disabled = true; a.classList.add('done'); c.classList.add('done');
        if (S.sound) beep(true);
        st.n++;
        const it = set.find(x => x.id === a.dataset.id);
        if (it && !bad.has(it.id)) await credit(it, 'jv');
        updCount();
        if (![...view.querySelectorAll('.tile')].some(t => !t.disabled)) setTimeout(() => { if (view.querySelector('.hrt')) next(); }, 500);
      } else {
        bad.add(a.dataset.id); bad.add(c.dataset.id);
        a.classList.add('is-ng'); c.classList.add('is-ng');
        if (S.sound) beep(false);
        if (S.vibrate) buzz();
        setTimeout(() => { a.classList.remove('is-ng'); c.classList.remove('is-ng'); }, 600);
      }
    };
    setKeys(null);
  }
  const updCount = () => { const c = view.querySelector('.hrt-count'); if (c) c.innerHTML = `<b>Màn ${st.round}</b> · đúng ${st.ok}/${st.n}`; };

  // ---- trắc nghiệm 4 phương án; nhiễu lấy từ các từ tim khác trước, thiếu thì lấy từ của bài, rồi từ cùng cấp ----
  function distractors(it, dir) {
    const show = o => (dir === 'vj' ? (o.kanji || o.kana) : o.vi);
    const ok = o => o.id !== it.id && !sameMeaning(o, it) && show(o) !== show(it) && (o.kanji || o.kana) !== (it.kanji || it.kana);
    const out = [];
    for (const src of [items, pool, D.vocab.filter(o => o.level === it.level)]) {
      for (const o of shuffle(src.filter(ok))) {
        if (out.length >= 3) break;
        if (!out.some(x => show(x) === show(o) || sameMeaning(x, o))) out.push(o);
      }
      if (out.length >= 3) break;
    }
    return out;
  }
  function ask(it) {
    const dir = st.dir === 'mix' ? (Math.random() < .5 ? 'vj' : 'jv') : st.dir;
    const script = S.script === 'kana' ? 'kana' : 'furi';
    const opts = shuffle([it, ...distractors(it, dir)]);
    const prompt = dir === 'vj'
      ? `<p class="prompt-vi">${esc(it.vi)}</p><p class="prompt-hint">Chọn từ tiếng Nhật</p>`
      : `<div class="prompt-row"><p class="prompt-jp" lang="ja">${wordHTML(it, script)}</p>${sayBtn(it.kana)}</div><p class="prompt-hint">Chọn nghĩa tiếng Việt</p>`;
    view.innerHTML = `<div class="run run-lock hrt">${head()}
      <article class="label-card" data-nokj><div class="label-head"><span class="label-tag">${dir === 'vj' ? 'Việt → Nhật' : 'Nhật → Việt'}</span><span class="label-lv">${esc(it.level || '')}</span></div>${prompt}<div class="stamp" aria-hidden="true"></div></article>
      <div class="opts ${dir === 'vj' ? 'opts-jp' : ''}">${opts.map((o, k) => `<button type="button" class="opt" data-id="${esc(o.id)}"><span class="opt-n">${k + 1}</span><span class="opt-t" ${dir === 'vj' ? 'lang="ja"' : ''}>${dir === 'vj' ? wordHTML(o, script) : esc(o.vi)}</span></button>`).join('')}</div>
      <div class="after" hidden></div></div>`;
    bindHead(); bindSay(view);
    if (dir === 'jv' && S.autoSpeak) setTimeout(() => speak(it.kana), 150);
    st.lock = false;
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(it, dir, b.dataset.id));
    setKeys(e => { if (st.lock) return; const n = +e.key; if (n >= 1 && n <= opts.length) view.querySelectorAll('.opt')[n - 1].click(); });
  }
  async function answer(it, dir, id) {
    if (st.lock) return;
    st.lock = true;
    const ok = id === it.id;
    view.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.id === it.id) b.classList.add('is-ok'); else if (b.dataset.id === id) b.classList.add('is-ng'); });
    view.querySelector('.label-card').removeAttribute('data-nokj');
    view.querySelector('.stamp').className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
    if (S.sound) beep(ok);
    if (!ok && S.vibrate) buzz();
    st.n++;
    if (ok) await credit(it, dir);
    else { // sai: hỏi lại sớm (sau 2 câu)
      if (st.queue.length < 2) { st.round++; st.queue.push(...shuffle(items.filter(x => x.id !== it.id))); }
      st.queue.splice(Math.min(2, st.queue.length), 0, it);
    }
    updCount();
    if (dir === 'vj' && S.autoSpeak) speak(it.kana);
    if (ok) { setTimeout(() => { if (view.querySelector('.hrt .opt')) next(); }, 650); return; }
    const after = view.querySelector('.after');
    after.hidden = false;
    after.innerHTML = `<p class="after-msg">Đáp án đúng: <b ${dir === 'vj' ? 'lang="ja"' : ''}>${dir === 'vj' ? wordHTML(it, 'furi') : esc(it.vi)}</b> — từ này sẽ hỏi lại sau 2 câu.</p>${wordDetailHTML(it, { compact: true })}`;
    bindSay(after);
    const bar = document.createElement('div');
    bar.className = 'next-bar';
    bar.innerHTML = '<button type="button" class="btn btn-primary" data-act="next">Tiếp</button>';
    view.querySelector('.run').appendChild(bar);
    const nb = bar.querySelector('[data-act=next]');
    nb.onclick = () => next();
    nb.focus({ preventScroll: true });
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
  }

  next();
}
