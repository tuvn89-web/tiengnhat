// Sổ tay (Đ10): nhiều sổ có tên. "Gắn sao" là sổ mặc định (giữ cờ sao cũ trong tiến độ học).
// Sổ "Sai ở bài kiểm tra" do app tự thêm khi làm sai bài kiểm tra cuối bài. Mọi sổ đồng bộ giữa các máy.
import { esc, icon, toast, wordHTML, rich } from './util.js';
import { D, saveBooks, saveMarks } from './data.js';
import { isStar, toggleStar, status, stats } from './srs.js';
import { openSheet, confirmBox, emptyState, bindSay } from './ui.js';

export const STAR = 'star';
export const WRONG = 'sai';
const SYS = { [STAR]: 'Gắn sao', [WRONG]: 'Sai ở bài kiểm tra' };

// ---------- dữ liệu ----------
const live = () => Object.entries(D.nbooks).filter(([, b]) => !b._del);
export function books() {
  const out = [{ id: STAR, name: SYS[STAR], sys: true }];
  if (D.nbooks[WRONG] && !D.nbooks[WRONG]._del) out.push({ id: WRONG, name: SYS[WRONG], sys: true });
  for (const [id, b] of live().filter(([id]) => id !== WRONG).sort((a, b) => (a[1].c || a[1].t) - (b[1].c || b[1].t))) out.push({ id, name: b.name });
  return out;
}
export const bookName = id => books().find(b => b.id === id)?.name || 'Sổ';
export function inBook(id, book) {
  if (book === STAR) return isStar(id);
  return !!D.nmarks[id]?.b?.[book] && !!D.nbooks[book] && !D.nbooks[book]._del;
}
export const booksOf = id => books().filter(b => inBook(id, b.id));
export const marked = id => booksOf(id).length > 0;
export async function setInBook(id, book, on) {
  if (book === STAR) { if (isStar(id) !== on) await toggleStar(id); return; }
  const r = { b: { ...(D.nmarks[id]?.b || {}) }, t: Date.now() };
  if (on) r.b[book] = 1; else delete r.b[book];
  D.nmarks[id] = r;
  await saveMarks();
}
export async function createBook(name, id) {
  id = id || 'b' + Date.now().toString(36);
  D.nbooks[id] = { name: name.trim().slice(0, 40) || 'Sổ mới', c: Date.now(), t: Date.now() };
  await saveBooks();
  return id;
}
export async function renameBook(id, name) { D.nbooks[id] = { ...D.nbooks[id], name: name.trim().slice(0, 40), t: Date.now() }; await saveBooks(); }
export async function deleteBook(id) { D.nbooks[id] = { ...D.nbooks[id], _del: true, t: Date.now() }; await saveBooks(); }
// Thêm hàng loạt (câu sai ở bài kiểm tra cuối bài)
export async function addMany(ids, book = WRONG) {
  if (book === WRONG && (!D.nbooks[WRONG] || D.nbooks[WRONG]._del)) await createBook(SYS[WRONG], WRONG);
  const now = Date.now();
  for (const id of ids) {
    if (book === STAR) { if (!isStar(id)) await toggleStar(id); continue; }
    D.nmarks[id] = { b: { ...(D.nmarks[id]?.b || {}), [book]: 1 }, t: now };
  }
  await saveMarks();
}
// Các mục trong sổ, chia theo loại
export function bookItems(book) {
  const f = it => inBook(it.id, book);
  return { vocab: D.vocab.filter(f), kanji: D.kanji.filter(f), grammar: D.grammar.filter(f) };
}

// ---------- nguồn cho các trang luyện tập ----------
// source = 'nb:<mã sổ>'
export const isBookSrc = s => typeof s === 'string' && s.startsWith('nb:');
export const srcBook = s => s.slice(3);
export const matchSrc = (id, s) => inBook(id, srcBook(s));
// chip nguồn cho các sổ có tên (sổ "Gắn sao" đã có chip riêng `star`); chỉ hiện sổ có mục phù hợp
export function bookSourceOpts(list, filter = () => true) {
  return books().filter(b => b.id !== STAR).map(b => [`nb:${b.id}`, `Sổ: ${b.name}`, list.filter(it => filter(it) && inBook(it.id, b.id)).length]).filter(x => x[2] > 0);
}

// ---------- nút đánh dấu ----------
export function markBtnHTML(id, { label = true, cls = 'btn btn-ghost btn-sm' } = {}) {
  const on = marked(id);
  return `<button type="button" class="${cls} mark-btn" data-mark="${esc(id)}" aria-pressed="${on}" aria-label="Sổ tay${on ? ' (đã đánh dấu)' : ''}">${icon('bookmark')}${label ? '<span>Sổ tay</span>' : ''}</button>`;
}
function refreshBtns(id) {
  document.querySelectorAll(`[data-mark="${CSS.escape(id)}"]`).forEach(b => { const on = marked(id); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', `Sổ tay${on ? ' (đã đánh dấu)' : ''}`); });
}
// Bảng chọn sổ cho một mục
export function openMarkSheet(id, onChange) {
  const it = D.items.get(id);
  const title = it ? (it._type === 'kanji' ? esc(it.char) : it._type === 'grammar' ? rich(it.pattern) : wordHTML(it, 'furi')) : esc(id);
  const sub = it ? esc(it._type === 'kanji' ? `${it.hv} — ${it.nghia || ''}` : it._type === 'grammar' ? '' : it.vi || '') : '';
  const body = () => `<h2 class="h2">Đưa vào sổ tay</h2><p class="mark-it"><span lang="ja">${title}</span>${sub ? ` <small class="muted">${sub}</small>` : ''}</p>
    <ul class="mark-l">${books().map(b => `<li><label class="check"><input type="checkbox" data-b="${esc(b.id)}" ${inBook(id, b.id) ? 'checked' : ''}> ${esc(b.name)}</label></li>`).join('')}</ul>
    <form class="row-btns mark-new" onsubmit="return false"><input class="input" type="text" maxlength="40" placeholder="Tên sổ mới, vd. Từ xưởng" aria-label="Tên sổ mới"><button type="submit" class="btn btn-ghost">Thêm sổ</button></form>
    <p class="small muted">Luyện riêng một sổ ở trang <a href="#/sotay">Sổ tay</a>, hoặc chọn nguồn "Sổ: …" trong các bài luyện.</p>`;
  const s = openSheet(body(), { label: 'Sổ tay', onClose: () => { refreshBtns(id); onChange?.(); } });
  const bind = () => {
    s.body.querySelectorAll('[data-b]').forEach(c => c.onchange = async () => { await setInBook(id, c.dataset.b, c.checked); refreshBtns(id); });
    s.body.querySelector('.mark-new').onsubmit = async e => {
      e.preventDefault();
      const inp = s.body.querySelector('.mark-new input'), name = inp.value.trim();
      if (!name) { inp.focus(); return; }
      const nb = await createBook(name);
      await setInBook(id, nb, true);
      s.body.innerHTML = body(); bind(); refreshBtns(id);
    };
  };
  bind();
  return s;
}

// ---------- trang Sổ tay ----------
const TN = { vocab: 'Từ vựng', kanji: 'Chữ Hán', grammar: 'Ngữ pháp' };
function rowHTML(it) {
  if (it._type === 'kanji') return `<li><button type="button" class="row" data-kopen="${esc(it.char)}"><span class="row-jp" lang="ja" data-bare>${esc(it.char)}</span><span class="row-vi"><b>${esc(it.hv)}</b> ${esc(it.nghia || '')}</span></button>${markBtnHTML(it.id, { label: false, cls: 'icon-btn' })}</li>`;
  if (it._type === 'grammar') return `<li><a class="row" href="#/nguphap/${encodeURIComponent(it.id)}"><span class="row-jp" lang="ja">${rich(it.pattern)}</span><span class="row-vi">${rich(it.meaning || '')}</span></a>${markBtnHTML(it.id, { label: false, cls: 'icon-btn' })}</li>`;
  return `<li><button type="button" class="row" data-wopen="${esc(it.id)}"><span class="row-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="row-vi">${esc(it.vi)}</span></button>${markBtnHTML(it.id, { label: false, cls: 'icon-btn' })}</li>`;
}
export function renderNotebook(view, ctx, id) {
  if (!id) {
    const bs = books();
    view.innerHTML = `<h1 class="h1">Sổ tay</h1>
      <p class="muted small">Đánh dấu từ, chữ Hán, mẫu ngữ pháp ở mọi chỗ (thẻ từ, trang bài học, giữa lượt ôn) bằng nút ${icon('bookmark')} Sổ tay. Mỗi sổ luyện riêng được; các bài luyện còn có nguồn "Sổ: …".</p>
      <ul class="rows nb-list">${bs.map(b => { const x = bookItems(b.id), n = x.vocab.length + x.kanji.length + x.grammar.length; return `<li><a class="row" href="#/sotay/${encodeURIComponent(b.id)}"><span class="row-jp">${icon(b.id === STAR ? 'star' : 'bookmark')} <b>${esc(b.name)}</b></span><span class="row-vi">${n ? `${n} mục` : 'trống'}</span></a></li>`; }).join('')}</ul>
      <form class="row-btns mark-new" onsubmit="return false"><input class="input" type="text" maxlength="40" placeholder="Tên sổ mới, vd. Từ khó" aria-label="Tên sổ mới"><button type="submit" class="btn btn-primary">Thêm sổ</button></form>`;
    view.querySelector('.mark-new').onsubmit = async e => { e.preventDefault(); const v = view.querySelector('.mark-new input').value.trim(); if (!v) return; await createBook(v); ctx.sessionDone?.(); renderNotebook(view, ctx); };
    return;
  }
  const b = books().find(x => x.id === id);
  if (!b) { view.innerHTML = emptyState('Không có sổ này.', '<a class="btn btn-ghost" href="#/sotay">Về Sổ tay</a>'); return; }
  const x = bookItems(id), n = x.vocab.length + x.kanji.length + x.grammar.length;
  const sv = stats(x.vocab);
  view.innerHTML = `<a class="back" href="#/sotay">Sổ tay</a><h1 class="h1">${esc(b.name)}</h1>
    <p class="muted small">${n ? `${x.vocab.length} từ · ${x.kanji.length} chữ Hán · ${x.grammar.length} mẫu ngữ pháp` : 'Sổ trống. Bấm nút Sổ tay ở thẻ từ, trang bài học hoặc giữa lượt ôn để thêm.'}</p>
    ${n ? `<div class="row-btns wrap nb-acts">
      ${x.vocab.length ? `<button class="btn btn-primary" data-p="quiz">Trắc nghiệm ${x.vocab.length} từ</button>${x.vocab.length >= 3 ? '<button class="btn btn-ghost" data-p="match">Ghép cặp</button>' : ''}${sv.new ? `<button class="btn btn-ghost" data-p="learn">Học ${sv.new} từ chưa học</button>` : ''}<button class="btn btn-ghost" data-p="dich">Dịch câu của các từ</button>` : ''}
      ${x.kanji.length >= 3 ? `<button class="btn btn-ghost" data-p="kanji">Ôn ${x.kanji.length} chữ Hán</button>` : ''}
      ${x.grammar.length ? `<button class="btn btn-ghost" data-p="gram">Luyện ${x.grammar.length} mẫu</button>` : ''}
    </div>` : ''}
    ${Object.entries(x).filter(([, l]) => l.length).map(([t, l]) => `<h2 class="h2">${TN[t]}</h2><ul class="rows nb-items">${l.map(rowHTML).join('')}</ul>`).join('')}
    ${!b.sys || id === WRONG ? `<details class="nb-edit"><summary>Đổi tên / xoá sổ</summary>
      ${b.sys ? '' : `<form class="row-btns" onsubmit="return false" data-f="ren"><input class="input" type="text" maxlength="40" value="${esc(b.name)}" aria-label="Tên sổ"><button type="submit" class="btn btn-ghost">Đổi tên</button></form>`}
      <button type="button" class="btn btn-ghost btn-danger" data-act="delbook">Xoá sổ (các mục vẫn còn trong kho)</button></details>` : ''}`;
  bindSay(view);
  const ren = view.querySelector('[data-f=ren]');
  if (ren) ren.onsubmit = async e => { e.preventDefault(); await renameBook(id, ren.querySelector('input').value); ctx.sessionDone?.(); renderNotebook(view, ctx, id); };
  const del = view.querySelector('[data-act=delbook]');
  if (del) del.onclick = async () => { if (!(await confirmBox(`Xoá sổ "${b.name}"?`, 'Xoá'))) return; await deleteBook(id); ctx.sessionDone?.(); ctx.go('#/sotay'); };
  view.querySelector('.nb-acts')?.addEventListener('click', async e => {
    const p = e.target.closest('[data-p]')?.dataset.p;
    if (!p) return;
    ctx.backTo = '#/sotay/' + encodeURIComponent(id);
    await practiceItems(view, ctx, p, x, { title: b.name, again: () => ctx.go('#/sotay/' + encodeURIComponent(id), true) });
  });
}

// Luyện riêng một danh sách mục (dùng chung cho Sổ tay và trang bài học)
export async function practiceItems(view, ctx, kind, x, { title = 'Luyện riêng', again, onDone } = {}) {
  const { shuffle } = await import('./util.js');
  if (kind === 'quiz') {
    const { runQuiz } = await import('./quiz.js');
    const { ttsReady } = await import('./tts.js');
    const { S } = await import('./settings.js');
    const dirs = ['jv', 'vj', ...(ttsReady() ? ['au'] : [])];
    const qs = shuffle([...x.vocab]).slice(0, 30).map(it => ({ it, dir: (it.kanji && Math.random() < .25) ? 'kr' : dirs[Math.floor(Math.random() * dirs.length)] }));
    return runQuiz(view, qs, { dir: 'mix', script: S.script, source: 'all', onFinish: onDone, again }, ctx);
  }
  if (kind === 'learn') {
    const { runLearn } = await import('./learn.js');
    return runLearn(view, x.vocab.filter(it => status(it) === 'new').slice(0, 30), ctx, { again, onFinish: onDone });
  }
  if (kind === 'match') {
    const { buildRounds, runMatch } = await import('./match.js');
    const rounds = buildRounds(shuffle([...x.vocab]), 'vi-kana', 5);
    if (!rounds.length) { toast('Cần ít nhất 3 từ để ghép cặp.'); return; }
    return runMatch(view, rounds, 'vi-kana', ctx, { onDone, again });
  }
  if (kind === 'kanji') {
    const { buildKanjiQs } = await import('./kanji.js');
    const { runDrill } = await import('./drill.js');
    return runDrill(view, buildKanjiQs({ dir: 'mix', source: 'all', chars: x.kanji.map(k => k.char), count: 30 }), ctx, { title, again, onDone });
  }
  if (kind === 'gram') {
    const { buildGrammarQs } = await import('./gdrill.js');
    const { runDrill } = await import('./drill.js');
    return runDrill(view, buildGrammarQs({ type: 'mix', source: 'all', ids: x.grammar.map(g => g.id), count: 20 }), ctx, { title, again, onDone });
  }
  if (kind === 'dich') {
    const { buildDich } = await import('./dich.js');
    const { runDrill } = await import('./drill.js');
    const ids = new Set([...x.vocab, ...x.grammar].map(it => it.id));
    return runDrill(view, buildDich({ dir: 'mix', how: 'mix', level: 'N1', srcIds: ids, count: 10 }), ctx, { title: title + ' · dịch', again, onDone });
  }
}
