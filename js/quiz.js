import { esc, wordHTML, wordKey, normVi, shuffle, beep, buzz, icon, toast } from './util.js';
import { D, LEVELS, TOPICS } from './data.js';
import { S } from './settings.js';
import { review, status, dueDirs, errCount, isStar, toggleStar, stats, progDir } from './srs.js';
import { speak, ttsReady } from './tts.js';
import { chips, bindChips, readChip, readChips, bindSay, sayBtn, wordDetailHTML, topicOpts, emptyState } from './ui.js';
import { kvGet, kvSet } from './db.js';

export const DIRS = [['vj', 'Việt → Nhật'], ['jv', 'Nhật → Việt'], ['kr', 'Kanji → cách đọc'], ['au', 'Nghe → nghĩa'], ['mix', 'Trộn']];
export const SCRIPTS = [['kana', 'Chữ mềm/cứng'], ['kanji', 'Kanji'], ['furi', 'Kanji + furigana']];

// ---------- chọn từ ----------
export function selectItems({ levels = [], topics = [], source = 'all', needKanji = false }) {
  let pool = D.vocab.filter(it =>
    (!levels.length || levels.includes(it.level)) &&
    (!topics.length || it.topics.some(t => topics.includes(t))) &&
    (!needKanji || it.kanji));
  const now = Date.now();
  if (source === 'due') pool = pool.filter(it => dueDirs(it, now).length);
  else if (source === 'new') {
    pool = pool.filter(it => status(it) === 'new');
    pool.sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
  }
  else if (source === 'wrong') pool = pool.filter(it => errCount(it) > 0).sort((a, b) => errCount(b) - errCount(a));
  else if (source === 'star') pool = pool.filter(it => isStar(it.id));
  return pool;
}
export const newLeftToday = () => Math.max(0, S.newPerDay - stats(D.vocab).newToday);

export function buildQuestions(o) {
  const allowMix = ['vj', 'jv', 'kr', ...(ttsReady() ? ['au'] : [])];
  const pool = selectItems({ ...o, needKanji: o.dir === 'kr' });
  let qs = [];
  if (o.source === 'due') {
    for (const it of shuffle(pool)) {
      const dd = dueDirs(it);
      let d;
      if (o.dir === 'mix') d = dd[Math.floor(Math.random() * dd.length)];
      else if (dd.includes(progDir(o.dir))) d = o.dir;
      else continue;
      qs.push({ it, dir: d });
    }
  } else {
    let list = o.source === 'all' || o.source === 'star' ? shuffle(pool) : pool;
    if (o.source === 'new') list = list.slice(0, newLeftToday());
    for (const it of list) {
      let d = o.dir;
      if (d === 'mix') { const c = allowMix.filter(x => x !== 'kr' || it.kanji); d = c[Math.floor(Math.random() * c.length)]; }
      qs.push({ it, dir: d });
    }
  }
  qs = qs.slice(0, o.count);
  return o.source === 'new' ? qs : shuffle(qs);
}

// ---------- đáp án & nhiễu ----------
function answerOf(it, dir, script) {
  if (dir === 'vj') return { key: wordKey(it, script), html: `<span lang="ja">${wordHTML(it, script)}</span>`, jp: true };
  if (dir === 'kr') return { key: it.kana, html: `<span lang="ja">${esc(it.kana)}</span>`, jp: true };
  return { key: normVi(it.vi), html: esc(it.vi), jp: false };
}
export function distractors(it, dir, script, n = 3) {
  const mine = answerOf(it, dir, script).key;
  const syn = new Set(it.syn || []);
  const conf = new Set(it.confuse || []);
  const scored = [];
  for (const o of D.vocab) {
    if (o.id === it.id || syn.has(o.id) || (o.syn || []).includes(it.id)) continue;
    if (dir === 'kr' && !o.kanji) continue;
    let s = Math.random() * 6;
    if (conf.has(o.id) || (o.confuse || []).includes(it.id)) s += 100;
    if (o.topics.some(t => it.topics.includes(t))) s += 10;
    if (o.sub && o.sub === it.sub) s += 4;
    if (o.pos === it.pos) s += 5;
    if (o.level === it.level) s += 2;
    if (dir === 'kr') s -= Math.abs(o.kana.length - it.kana.length) * 2;
    scored.push([s, o]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const out = [], keys = new Set([mine]);
  for (const [, o] of scored) {
    const a = answerOf(o, dir, script);
    if (keys.has(a.key)) continue;
    keys.add(a.key); out.push(a);
    if (out.length >= n) break;
  }
  return out;
}

// ---------- màn chọn ----------
export async function renderQuizSetup(view, ctx) {
  const saved = await kvGet('quizSetup', {});
  const o = { dir: 'jv', script: S.script, source: 'due', levels: [], topics: [], count: S.qCount, ...saved };
  if (!D.vocab.length) { view.innerHTML = emptyState('Chưa có từ vựng nào. Vào Dữ liệu để nhập gói từ.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const st = stats(D.vocab);
  view.innerHTML = `
    <h1 class="h1">Trắc nghiệm từ vựng</h1>
    <form class="setup" onsubmit="return false">
      <fieldset><legend>Kiểu câu hỏi</legend>${chips('dir', DIRS, o.dir, false)}</fieldset>
      <fieldset><legend>Hiển thị chữ Nhật</legend>${chips('script', SCRIPTS, o.script, false)}</fieldset>
      <fieldset><legend>Lấy từ nào</legend>${chips('source', [['due', 'Đến hạn ôn', st.due], ['new', 'Từ mới', st.new], ['wrong', 'Hay sai'], ['star', 'Gắn sao'], ['all', 'Tất cả', st.total]], o.source, false)}</fieldset>
      <fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels)}</fieldset>
      <fieldset><legend>Chủ đề <small>(không chọn = tất cả)</small></legend>${chips('topics', topicOpts(), o.topics)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30, 50].map(n => [String(n), String(n)]), String(o.count), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>`;
  const form = view.querySelector('.setup');
  const read = () => ({
    dir: readChip(form, 'dir'), script: readChip(form, 'script'), source: readChip(form, 'source'),
    levels: readChips(form, 'levels'), topics: readChips(form, 'topics'), count: +readChip(form, 'count'),
  });
  const upd = () => {
    const x = read();
    const n = buildQuestions({ ...x, count: 9999 }).length;
    const p = form.querySelector('.setup-count');
    let msg = n ? `Có ${n} câu phù hợp.` : 'Không có từ nào khớp lựa chọn này.';
    if (x.source === 'new' && newLeftToday() === 0) msg = `Hôm nay đã học đủ ${S.newPerDay} từ mới. Đổi giới hạn trong Cài đặt nếu muốn học thêm.`;
    if (x.source === 'due' && !n) msg = 'Không có từ nào đến hạn ôn. Chọn "Từ mới" để học thêm.';
    if (x.dir === 'au' && !ttsReady()) msg = 'Máy chưa có giọng đọc tiếng Nhật — chưa dùng được kiểu Nghe. Xem Cài đặt.';
    p.textContent = msg;
    form.querySelector('[data-act=start]').disabled = !n || (x.dir === 'au' && !ttsReady());
  };
  bindChips(form, upd);
  upd();
  form.querySelector('[data-act=start]').onclick = async () => {
    const x = read();
    await kvSet('quizSetup', x);
    runQuiz(view, buildQuestions(x), x, ctx);
  };
}

// ---------- chạy ----------
export function runQuiz(view, qs, o, ctx) {
  if (!qs.length) { toast('Không có câu hỏi nào.'); return; }
  const st = { qs: [...qs], i: 0, total: qs.length, score: 0, wrong: [], again: new Set(), seen: new Set(), lock: false };
  const script = o.script || S.script;
  let keyHandler = null;
  const setKeys = h => { if (keyHandler) document.removeEventListener('keydown', keyHandler); keyHandler = h; if (h) document.addEventListener('keydown', h); };
  ctx.onLeave(() => setKeys(null));

  const head = () => `<div class="run-top">
      <button type="button" class="icon-btn" data-act="quit" aria-label="Dừng lượt học">${icon('close')}</button>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${st.qs.length}" aria-valuenow="${st.i}"><i style="width:${(st.i / st.qs.length) * 100}%"></i></div>
      <span class="run-n">${Math.min(st.i + 1, st.qs.length)}/${st.qs.length}</span>
    </div>`;
  const tag = it => `<div class="label-head"><span class="label-tag">${esc(it.sub || TOPICS[it.topics[0]] || 'Từ vựng')}</span><span class="label-lv">${esc(it.level)}</span></div>`;

  function next() { st.i++; show(); }
  function quit() { if (st.i > 0) finish(true); else ctx.go('#/hoc'); }

  function show() {
    if (st.i >= st.qs.length) return finish();
    const q = st.qs[st.i];
    if (S.introNew && !q.again && status(q.it) === 'new' && !st.seen.has(q.it.id)) return intro(q);
    ask(q);
  }

  function intro(q) {
    const it = q.it;
    view.innerHTML = `<div class="run">${head()}
      <article class="label-card is-intro">
        <div class="label-head"><span class="label-tag">Từ mới</span><span class="label-lv">${esc(it.level)}</span></div>
        ${wordDetailHTML(it)}
      </article>
      <button class="btn btn-primary btn-block" data-act="go">Đã xem, kiểm tra ngay</button></div>`;
    bindSay(view);
    view.querySelector('[data-act=quit]').onclick = quit;
    const go = () => { st.seen.add(it.id); ask(q); };
    view.querySelector('[data-act=go]').onclick = go;
    view.querySelector('[data-act=go]').focus();
    if (S.autoSpeak) speak(it.kana);
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }

  function ask(q) {
    const { it, dir } = q;
    const right = answerOf(it, dir, script);
    const opts = shuffle([right, ...distractors(it, dir, script)]);
    let prompt, hint;
    if (dir === 'vj') { prompt = `<p class="prompt-vi">${esc(it.vi)}</p>`; hint = 'Chọn từ tiếng Nhật'; }
    else if (dir === 'jv') { prompt = `<div class="prompt-row"><p class="prompt-jp" lang="ja">${wordHTML(it, script)}</p>${sayBtn(it.kana)}</div>`; hint = 'Chọn nghĩa tiếng Việt'; }
    else if (dir === 'kr') { prompt = `<p class="prompt-jp" lang="ja">${esc(it.kanji)}</p>`; hint = 'Chọn cách đọc'; }
    else { prompt = `<button type="button" class="say-big" data-say="${esc(it.kana)}" aria-label="Nghe lại">${icon('speaker')}<span>Nghe lại</span></button>`; hint = 'Nghe rồi chọn nghĩa tiếng Việt'; }
    view.innerHTML = `<div class="run">${head()}
      <article class="label-card">${tag(it)}${prompt}<p class="prompt-hint">${hint}</p><div class="stamp" aria-hidden="true"></div></article>
      <div class="opts ${right.jp ? 'opts-jp' : ''}">${opts.map((a, k) => `<button type="button" class="opt" data-k="${esc(a.key)}"><span class="opt-n">${k + 1}</span><span class="opt-t">${a.html}</span></button>`).join('')}</div>
      <div class="after" hidden></div></div>`;
    bindSay(view);
    view.querySelector('[data-act=quit]').onclick = quit;
    if (dir === 'au' || (dir === 'jv' && S.autoSpeak)) setTimeout(() => speak(it.kana), 150);
    st.lock = false;
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(q, b.dataset.k, right));
    setKeys(e => {
      if (st.lock) return;
      const n = +e.key;
      if (n >= 1 && n <= opts.length) view.querySelectorAll('.opt')[n - 1].click();
    });
  }

  async function answer(q, key, right) {
    if (st.lock) return;
    st.lock = true;
    const ok = key === right.key;
    view.querySelectorAll('.opt').forEach(b => {
      b.disabled = true;
      if (b.dataset.k === right.key) b.classList.add('is-ok');
      else if (b.dataset.k === key) b.classList.add('is-ng');
    });
    const stamp = view.querySelector('.stamp');
    stamp.className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
    if (S.sound) beep(ok);
    if (!ok && S.vibrate) buzz();
    if (!q.again) {
      if (ok) st.score++; else st.wrong.push(q.it);
      review(q.it.id, q.dir, ok);
      if (!ok && !st.again.has(q.it.id)) {
        st.again.add(q.it.id);
        st.qs.splice(Math.min(st.i + 4, st.qs.length), 0, { ...q, again: true });
      }
    }
    const after = view.querySelector('.after');
    after.hidden = false;
    after.innerHTML = `${ok ? '' : `<p class="after-msg">Đáp án đúng: <b>${right.html}</b>${q.again ? '' : ' — từ này sẽ hỏi lại cuối lượt.'}</p>`}
      ${wordDetailHTML(q.it, { compact: true })}`;
    // nút Tiếp ghim ở đáy màn hình — không cuộn trang, để vẫn thấy đáp án và dấu chấm
    const bar = document.createElement('div');
    bar.className = 'next-bar';
    bar.innerHTML = `<button type="button" class="btn btn-ghost" data-act="star" aria-pressed="${isStar(q.it.id)}" aria-label="Gắn sao">${icon('star')}</button>
      <button type="button" class="btn btn-primary" data-act="next">Tiếp</button>`;
    view.querySelector('.run').appendChild(bar);
    bar.querySelector('[data-act=next]').onclick = next;
    bar.querySelector('[data-act=star]').onclick = async e => { const b = e.currentTarget; const on = await toggleStar(q.it.id); b.setAttribute('aria-pressed', on); };
    const nb = bar.querySelector('[data-act=next]');
    nb.focus({ preventScroll: true });
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    if (ok && S.autoNext) setTimeout(() => { if (view.contains(nb)) next(); }, S.autoNext);
  }

  function finish(early = false) {
    setKeys(null);
    const answered = early ? st.score + st.wrong.length : st.total;
    const wrongU = [...new Map(st.wrong.map(it => [it.id, it])).values()];
    view.innerHTML = `<section class="result">
      <h1 class="h1">${early ? 'Đã dừng lượt' : 'Xong lượt'}</h1>
      <p class="result-score"><b>${st.score}</b><span>/${answered}</span></p>
      <p class="result-sub">câu đúng ngay lần đầu</p>
      ${wrongU.length ? `<h2 class="h2">Từ trả lời sai</h2><ul class="wlist">${wrongU.map(it => `<li><span lang="ja">${wordHTML(it, 'furi')}</span><span>${esc(it.vi)}</span></li>`).join('')}</ul>` : '<p class="result-good">Không sai câu nào.</p>'}
      <div class="row-btns stack">
        ${wrongU.length ? '<button class="btn btn-primary" data-act="redo">Ôn lại từ sai</button>' : ''}
        <button class="btn ${wrongU.length ? 'btn-ghost' : 'btn-primary'}" data-act="again">Lượt mới</button>
        <a class="btn btn-ghost" href="#/">Về trang chủ</a>
      </div></section>`;
    view.querySelector('[data-act=again]').onclick = () => ctx.go('#/hoc', true);
    const r = view.querySelector('[data-act=redo]');
    if (r) r.onclick = () => runQuiz(view, wrongU.map(it => ({ it, dir: o.dir === 'mix' ? 'jv' : o.dir })), o, ctx);
    ctx.sessionDone?.();
  }

  show();
}
