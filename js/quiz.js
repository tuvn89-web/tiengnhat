import { esc, wordHTML, wordKey, normVi, shuffle, beep, buzz, icon, toast, startOfDay, DAY, plain } from './util.js';
import { D, LEVELS, TOPICS } from './data.js';
import { S } from './settings.js';
import { review, status, dueDirs, errCount, isStar, toggleStar, stats, progDir, learnedSince, setLearned, progSnapshot, progRestore } from './srs.js';
import { runLearn, learnCardHTML, learnBarHTML, applyDecision } from './learn.js';
import { speak, ttsReady } from './tts.js';
import { chips, bindChips, readChip, readChips, bindSay, sayBtn, wordDetailHTML, topicOpts, emptyState, wtabs } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { isBookSrc, matchSrc, bookSourceOpts, markBtnHTML, openMarkSheet } from './notes.js';
import { beginSession, goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';

export const DIRS = [['vj', 'Việt → Nhật'], ['jv', 'Nhật → Việt'], ['kr', 'Kanji → cách đọc (không furigana)'], ['au', 'Nghe → nghĩa'], ['mix', 'Trộn']];
export const SCRIPTS = [['kana', 'Chữ mềm/cứng'], ['furi', 'Kanji + furigana']];
// Kanji luôn kèm furigana; kanji trần chỉ có ở kiểu "Kanji → cách đọc" và ghép "Chữ mềm/cứng – Kanji".
export const fixScript = s => (s === 'kana' ? 'kana' : 'furi');

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
    // từ làm sai trong bài kiểm tra trình độ (cấp chưa đạt) học trước, rồi theo cấp
    const pri = new Map((D.prefs.priNew || []).map((id, i) => [id, i]));
    const pk = it => (pri.has(it.id) ? pri.get(it.id) : 1e6);
    pool.sort((a, b) => pk(a) - pk(b) || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
  }
  else if (source === 'learned') pool = pool.filter(it => status(it) !== 'new');
  else if (source === 'today') pool = pool.filter(it => learnedSince(it, startOfDay()));
  else if (source === 'week') pool = pool.filter(it => learnedSince(it, startOfDay() - 6 * DAY));
  else if (source === 'wrong') pool = pool.filter(it => errCount(it) > 0).sort((a, b) => errCount(b) - errCount(a));
  else if (source === 'star') pool = pool.filter(it => isStar(it.id));
  else if (isBookSrc(source)) pool = pool.filter(it => matchSrc(it.id, source));
  return pool;
}

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
    let list = o.source === 'all' || o.source === 'star' || isBookSrc(o.source) ? shuffle(pool) : pool;
    for (const it of list) {
      let d = o.dir;
      if (d === 'mix') { const c = allowMix.filter(x => x !== 'kr' || it.kanji); d = c[Math.floor(Math.random() * c.length)]; }
      qs.push({ it, dir: d });
    }
  }
  qs = qs.slice(0, o.count);
  return o.source === 'new' ? qs : shuffle(qs);
}

// Nguồn từ dùng chung cho các trang luyện tập (F1)
export const SOURCES = [['learned', 'Từ đã học'], ['today', 'Học hôm nay'], ['week', '7 ngày qua'], ['due', 'Đến hạn ôn'], ['star', 'Gắn sao'], ['wrong', 'Hay sai'], ['all', 'Tất cả']];
export function sourceCounts(filter = () => true) {
  const c = {};
  for (const [k] of SOURCES) c[k] = selectItems({ source: k }).filter(filter).length;
  return c;
}

// ---------- đáp án & nhiễu ----------
// Nghĩa con: nhóm nghĩa tách bằng ; — trong nhóm, các từ tách bằng , (ngoài ngoặc) cùng chung chú thích trong ngoặc của nhóm.
// "đi, mang (giày, tất); mặc (quần, váy)" → đi·mang [giày, tất] | mặc [quần, váy]
const _sense = new Map();
function splitOut(s, seps) {
  const parts = []; let cur = '', depth = 0;
  for (const ch of s) {
    if (ch === '(' || ch === '（') depth++;
    if (ch === ')' || ch === '）') depth = Math.max(0, depth - 1);
    if (!depth && seps.includes(ch)) { parts.push(cur); cur = ''; } else cur += ch;
  }
  parts.push(cur);
  return parts;
}
const squash = x => x.toLowerCase().replace(/\s+/g, ' ').trim();
export function senses(vi) {
  let r = _sense.get(vi);
  if (r) return r;
  r = [];
  for (const g of splitOut(String(vi || ''), ';；')) {
    const q = squash((g.match(/[(（]([^)）]*)[)）]/g) || []).map(x => x.slice(1, -1)).join(' '));
    for (const x of splitOut(g, ',、')) {
      // "vứt đi" = "vứt", "nhanh lên" = "nhanh": chữ "đi", "lên" chỉ hướng / thúc giục ở cuối không đổi nghĩa
      const core = squash(x.replace(/[(（][^)）]*[)）]/g, '')).replace(/^(\S+(?: \S+)*?) (?:đi|lên)$/, '$1');
      if (core) r.push({ core, q });
    }
  }
  _sense.set(vi, r);
  return r;
}
// Hai nghĩa "đụng nhau" khi có một nghĩa con cùng lõi mà chú thích không phân biệt được
export function viClash(a, b) {
  const A = senses(a), B = senses(b);
  return A.some(x => B.some(y => x.core === y.core && !(x.q && y.q && x.q !== y.q)));
}
// Có từ khác cùng chữ viết (一日 いちにち / ついたち) → đề "Kanji → cách đọc" cần gợi ý nghĩa
export function sameWriting(it) {
  return !!it.kanji && D.vocab.some(o => o.id !== it.id && o.kanji === it.kanji && o.kana !== it.kana);
}
export const readHint = it => (sameWriting(it) ? `<p class="prompt-sub">${esc(it.vi)}</p>` : '');
// Từ o có thể cũng là đáp án đúng cho câu hỏi về it → không dùng làm đáp án nhiễu
// Từ Kansai và từ chuẩn tương ứng (ほかす = 捨てる, ええ = いい): cùng nghĩa → không làm đáp án nhiễu của nhau
const stdOf = it => (it.std ? plain(it.std).replace(/^〜/, '') : '');
const forms = it => [it.kanji, it.kana, it.kf && plain(it.kf)].filter(Boolean);
const kansaiPair = (a, b) => !!stdOf(a) && forms(b).includes(stdOf(a));
// Hai từ cùng nghĩa (nghĩa đụng nhau, Kansai – chuẩn, đồng nghĩa) — dùng cho Ghép cặp
export const sameMeaning = (a, b) => viClash(a.vi, b.vi) || kansaiPair(a, b) || kansaiPair(b, a) || (a.syn || []).includes(b.id) || (b.syn || []).includes(a.id);
export function alsoRight(it, o, dir) {
  // Cùng chữ viết (一日 いちにち / ついたち): mặt chữ giống hệt nên ở mọi kiểu câu hỏi đều dễ chọn nhầm → không làm nhiễu
  if (it.kanji && o.kanji === it.kanji) return true;
  if (dir !== 'kr' && (kansaiPair(it, o) || kansaiPair(o, it))) return true;
  if (dir === 'kr') return false;
  if (dir === 'au' && o.kana === it.kana) return true;
  return viClash(it.vi, o.vi);
}
export function answerOf(it, dir, script) {
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
    if (alsoRight(it, o, dir)) continue;
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
  o.script = fixScript(o.script);
  if (!D.vocab.length) { view.innerHTML = emptyState('Chưa có từ vựng nào. Vào Dữ liệu để nhập gói từ.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const st = stats(D.vocab);
  view.innerHTML = `
    <h1 class="h1">Luyện tập</h1>${wtabs('quiz')}
    <form class="setup" onsubmit="return false">
      <fieldset class="f-q"><legend>Kiểu câu hỏi</legend>${chips('dir', DIRS, o.dir, false)}</fieldset>
      <fieldset class="f-q"><legend>Hiển thị chữ Nhật</legend>${chips('script', SCRIPTS, o.script, false)}</fieldset>
      <fieldset><legend>Lấy từ nào</legend>${chips('source', [['due', 'Đến hạn ôn', st.due], ['learned', 'Từ đã học', st.total - st.new], ['today', 'Học hôm nay'], ['week', '7 ngày qua'], ['new', 'Học từ mới', st.new], ['wrong', 'Hay sai'], ['star', 'Gắn sao'], ...bookSourceOpts(D.vocab), ['all', 'Tất cả', st.total]], o.source, false)}</fieldset>
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
    if (x.source === 'new') msg = n ? `Có ${n} từ chưa học. Học từ mới là xem thẻ rồi bấm "Đã học" — không kiểm tra ngay.` : 'Đã học hết từ mới trong kho (theo bộ lọc đang chọn). Nhập thêm gói từ ở trang Dữ liệu.';
    if (x.source === 'due' && !n) msg = 'Không có từ nào đến hạn ôn. Chọn "Từ mới" để học thêm.';
    if (x.dir === 'au' && !ttsReady()) msg = 'Máy chưa có giọng đọc tiếng Nhật — chưa dùng được kiểu Nghe. Xem Cài đặt.';
    p.textContent = msg;
    form.querySelector('[data-act=start]').disabled = !n || (x.dir === 'au' && !ttsReady() && x.source !== 'new');
    form.querySelector('[data-act=start]').textContent = x.source === 'new' ? 'Học từ mới' : 'Bắt đầu';
    form.querySelectorAll('.f-q').forEach(f => { f.hidden = x.source === 'new'; });
  };
  bindChips(form, upd);
  upd();
  form.querySelector('[data-act=start]').onclick = async () => {
    const x = read();
    await kvSet('quizSetup', x);
    if (x.source === 'new') return runLearn(view, selectItems(x).slice(0, x.count), ctx, { again: () => ctx.go('#/moi', true) });
    runQuiz(view, buildQuestions(x), x, ctx);
  };
}

// ---------- nút "Đã thuộc" trong lượt ôn: đánh dấu thuộc hẳn (hộp 5, 16 ngày sau hỏi lại một lần) ----------
export const knownBtnHTML = it => (status(it) === 'known' ? '' : `<button type="button" class="btn btn-ghost btn-sm" data-act="known" title="Không cần ôn nhiều — 16 ngày sau hỏi lại một lần">Đã thuộc</button>`);
export function bindKnownBtn(root, it, onDone) {
  const b = root.querySelector('[data-act=known]');
  if (!b) return;
  b.onclick = async () => {
    const before = progSnapshot([it.id]);
    await setLearned(it, 'known');
    onDone?.();
    b.disabled = true; b.textContent = 'Đã thuộc ✓';
    toast('Đã đánh dấu thuộc — 16 ngày sau hỏi lại một lần.', { action: 'Hoàn tác', onAction: async () => { await progRestore(before); b.disabled = false; b.textContent = 'Đã thuộc'; } });
  };
}

// ---------- chạy ----------
export function runQuiz(view, qs, o, ctx) {
  if (!qs.length) { toast('Không có câu hỏi nào.'); return; }
  const st = { qs: [...qs], i: 0, total: qs.length, score: 0, wrong: [], again: new Set(), seen: new Set(), lock: false };
  beginSession(ctx);
  const script = fixScript(o.script || S.script);
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
  function quit() { if (st.i > 0) finish(true); else goBack(ctx); }

  function show() {
    if (st.i >= st.qs.length) return finish();
    const q = st.qs[st.i];
    if (S.introNew && !q.again && status(q.it) === 'new' && !st.seen.has(q.it.id)) return intro(q);
    ask(q);
  }

  function intro(q) {
    const it = q.it;
    view.innerHTML = `<div class="run">${head()}${learnCardHTML(it)}${learnBarHTML(false)}</div>`;
    bindSay(view);
    view.querySelector('[data-act=quit]').onclick = quit;
    const go = async dec => { st.seen.add(it.id); await applyDecision(it, dec); st.learned = (st.learned || 0) + 1; next(); };
    view.querySelector('.learn-bar').onclick = e => { const b = e.target.closest('[data-l]'); if (b) go(b.dataset.l); };
    if (S.autoSpeak) speak(it.kana);
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go('learned'); } });
  }

  function ask(q) {
    const { it, dir } = q;
    const right = answerOf(it, dir, script);
    const opts = shuffle([right, ...distractors(it, dir, script)]);
    let prompt, hint;
    if (dir === 'vj') { prompt = `<p class="prompt-vi">${esc(it.vi)}</p>`; hint = 'Chọn từ tiếng Nhật'; }
    else if (dir === 'jv') { prompt = `<div class="prompt-row"><p class="prompt-jp" lang="ja">${wordHTML(it, script)}</p>${sayBtn(it.kana)}</div>`; hint = 'Chọn nghĩa tiếng Việt'; }
    else if (dir === 'kr') { prompt = `<p class="prompt-jp" lang="ja" data-bare>${wordHTML(it, 'bare')}</p>${readHint(it)}`; hint = 'Chọn cách đọc'; }
    else { prompt = `<button type="button" class="say-big" data-say="${esc(it.kana)}" aria-label="Nghe lại">${icon('speaker')}<span>Nghe lại</span></button>`; hint = 'Nghe rồi chọn nghĩa tiếng Việt'; }
    view.innerHTML = `<div class="run">${head()}
      <article class="label-card" data-nokj>${tag(it)}${prompt}<p class="prompt-hint">${hint}</p><div class="stamp" aria-hidden="true"></div></article>
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
    view.querySelector('.label-card').removeAttribute('data-nokj');
    const stamp = view.querySelector('.stamp');
    stamp.className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
    if (S.sound) beep(ok);
    if (!ok && S.vibrate) buzz();
    if (!q.again) {
      if (ok) st.score++; else st.wrong.push(q.it);
      if (!o.noReview) review(q.it.id, q.dir, ok);
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
    bar.innerHTML = `${markBtnHTML(q.it.id, { label: false, cls: 'btn btn-ghost' })}
      ${knownBtnHTML(q.it)}
      <button type="button" class="btn btn-primary" data-act="next">Tiếp</button>`;
    view.querySelector('.run').appendChild(bar);
    bindKnownBtn(bar, q.it, () => { const k = st.qs.findIndex((x, j) => j > st.i && x.again && x.it.id === q.it.id); if (k > 0) st.qs.splice(k, 1); });
    bar.querySelector('[data-act=next]').onclick = next;
    bar.querySelector('[data-mark]').onclick = () => openMarkSheet(q.it.id);
    const nb = bar.querySelector('[data-act=next]');
    nb.focus({ preventScroll: true });
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
    if (ok && S.autoNext) setTimeout(() => { if (view.contains(nb)) next(); }, S.autoNext);
  }

  function finish(early = false) {
    setKeys(null);
    const answered = early || st.learned ? st.score + st.wrong.length : st.total;
    const wrongU = [...new Map(st.wrong.map(it => [it.id, it])).values()];
    ctx.inRun = true;
    view.innerHTML = `<section class="result">${crumbHTML(ctx)}
      <h1 class="h1">${early ? 'Đã dừng lượt' : 'Xong lượt'}</h1>
      <p class="result-score"><b>${st.score}</b><span>/${answered}</span></p>
      <p class="result-sub">câu đúng ngay lần đầu</p>
      ${wrongU.length ? `<h2 class="h2">Từ trả lời sai</h2><ul class="wlist">${wrongU.map(it => `<li><span lang="ja">${wordHTML(it, 'furi')}</span><span>${esc(it.vi)}</span></li>`).join('')}</ul>` : '<p class="result-good">Không sai câu nào.</p>'}
      <div class="row-btns stack">
        ${wrongU.length ? '<button class="btn btn-primary" data-act="redo">Ôn lại từ sai</button>' : ''}
        <button class="btn ${wrongU.length ? 'btn-ghost' : 'btn-primary'}" data-act="again">Lượt mới</button>
      </div>${resultNavHTML(ctx)}</section>`;
    view.querySelector('[data-act=again]').onclick = () => (o.again ? o.again() : ctx.go('#/hoc', true));
    const r = view.querySelector('[data-act=redo]');
    if (r) r.onclick = () => runQuiz(view, wrongU.map(it => ({ it, dir: o.dir === 'mix' ? 'jv' : o.dir })), o, ctx);
    bindResultNav(view, ctx);
    o.onFinish?.({ score: st.score, answered, total: st.total, wrong: wrongU, early });
    ctx.sessionDone?.();
  }

  show();
}
