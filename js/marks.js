// v38: ĐÁNH DẤU ★ từ vựng / chữ Hán để ôn riêng. Dấu lưu trong tiến độ học (đồng bộ, sao lưu cùng tiến độ).
// Nút ★ có ở: thẻ từ, thẻ chữ Hán, phần đáp án sau mỗi câu, danh sách Kho từ. Ôn: Luyện tập → "Đã đánh dấu ★" (trắc nghiệm hoặc ghép 8 cặp).
import { esc, icon, toast } from './util.js';
import { isStar, toggleStar } from './srs.js';

export const markBtnHTML = (id, { label = false } = {}) => {
  const on = isStar(id);
  return `<button type="button" class="${label ? 'btn btn-ghost btn-sm' : 'icon-btn'} mark-btn" data-mark="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Bỏ đánh dấu ôn' : 'Đánh dấu để ôn'}" title="Đánh dấu ★ để ôn riêng">${icon('star')}${label ? `<span>${on ? 'Đã đánh dấu' : 'Đánh dấu để ôn'}</span>` : ''}</button>`;
};
export function initMarks() {
  // bắt sớm (capture): nút ★ nằm trong hàng danh sách, thẻ, bảng… không kích hoạt việc của phần tử bên ngoài
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-mark]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const id = b.dataset.mark, on = await toggleStar(id);
    document.querySelectorAll('[data-mark]').forEach(x => {
      if (x.dataset.mark !== id) return;
      x.setAttribute('aria-pressed', String(on));
      x.setAttribute('aria-label', on ? 'Bỏ đánh dấu ôn' : 'Đánh dấu để ôn');
      const t = x.querySelector('span'); if (t) t.textContent = on ? 'Đã đánh dấu' : 'Đánh dấu để ôn';
    });
    toast(on ? 'Đã đánh dấu ★ — ôn ở Luyện tập → Đã đánh dấu.' : 'Đã bỏ đánh dấu.');
    dispatchEvent(new CustomEvent('tn-marks'));
  }, true);
}

// ---------- trang "Đã đánh dấu ★" (#/danhdau): ôn riêng các mục đã đánh dấu ----------
export async function renderMarked(view, ctx) {
  const { D } = await import('./data.js');
  const { wordHTML, shuffle } = await import('./util.js');
  const { emptyState } = await import('./ui.js');
  const draw = () => {
    if (!view.isConnected) return removeEventListener('tn-marks', draw);
    const vs = D.vocab.filter(it => isStar(it.id)), ks = D.kanji.filter(k => isStar(k.id));
    const btns = (k, n) => `<div class="row-btns wrap"><button type="button" class="btn btn-primary" data-run="${k}-quiz" ${n ? '' : 'disabled'}>Trắc nghiệm</button><button type="button" class="btn btn-ghost" data-run="${k}-pairs" ${n >= 3 ? '' : 'disabled'}>${icon('match')} Ghép 8 cặp</button></div>`;
    view.innerHTML = `<h1 class="h1">${icon('star')} Đã đánh dấu</h1>
      <p class="muted small">Bấm ★ ở thẻ từ, thẻ chữ Hán, phần đáp án sau mỗi câu hoặc trong Kho từ để đưa vào đây. Ôn ở đây cũng tính vào lịch ôn. Bấm ★ lần nữa để bỏ.</p>
      ${!vs.length && !ks.length ? emptyState('Chưa đánh dấu mục nào.') : ''}
      <section class="card"><h2 class="h2">Từ vựng · ${vs.length}</h2>${btns('v', vs.length)}
        ${vs.length ? `<ul class="rows mk-rows">${vs.map(it => `<li><span class="row"><span class="row-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="row-vi">${esc(it.vi)}</span></span>${markBtnHTML(it.id)}</li>`).join('')}</ul>` : '<p class="muted small">Chưa có từ nào.</p>'}</section>
      <section class="card"><h2 class="h2">Chữ Hán · ${ks.length}</h2>${btns('k', ks.length)}
        ${ks.length ? `<ul class="rows mk-rows">${ks.map(k => `<li><span class="row"><span class="row-jp" lang="ja" data-bare>${esc(k.char)}</span><span class="row-vi"><b>${esc(k.hv)}</b> — ${esc(k.nghia || '')}</span></span>${markBtnHTML(k.id)}</li>`).join('')}</ul>` : '<p class="muted small">Chưa có chữ nào.</p>'}</section>`;
  };
  addEventListener('tn-marks', draw);
  draw();
  view.addEventListener('click', async e => {
    const b = e.target.closest('[data-run]');
    if (!b || b.disabled) return;
    const [kind, mode] = b.dataset.run.split('-');
    removeEventListener('tn-marks', draw);
    ctx.backTo = '#/danhdau';
    const again = () => ctx.go('#/danhdau', true);
    if (kind === 'v') {
      const { runQuiz } = await import('./quiz.js');
      const { S } = await import('./settings.js');
      const items = shuffle(D.vocab.filter(it => isStar(it.id))).slice(0, 50);
      const qs = items.map(it => ({ it, dir: it.kanji && Math.random() < 0.25 ? 'kr' : Math.random() < 0.5 ? 'jv' : 'vj' }));
      return runQuiz(view, qs, { dir: 'mix', script: S.script, source: 'star', again, startPairs: mode === 'pairs', noIntro: true }, ctx); // mục tự đánh dấu: hỏi luôn, không hiện thẻ giới thiệu từ mới
    }
    const { buildKanjiQs } = await import('./kanji.js');
    const { runDrill } = await import('./drill.js');
    runDrill(view, buildKanjiQs({ dir: 'mix', source: 'star', count: 50 }), ctx, { title: 'Chữ Hán đã đánh dấu', again, startPairs: mode === 'pairs' });
  });
}
