import { esc, rubyHTML, reading } from './util.js';
import { D, LEVELS, CTX } from './data.js';
import { S } from './settings.js';
import { bindSay, sayBtn, emptyState } from './ui.js';

export function renderGrammarList(view) {
  if (!D.grammar.length) { view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>` + emptyState('Chưa có gói ngữ pháp nào. Nhờ skill jp-v01-data làm gói rồi nhập vào.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const by = LEVELS.map(l => [l, D.grammar.filter(g => g.level === l)]).filter(([, a]) => a.length);
  view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>` + by.map(([l, arr]) => `
    <section class="glevel"><h2 class="h2">${l}</h2>
      <ul class="rows">${arr.map(g => `<li><a class="row" href="#/nguphap/${encodeURIComponent(g.id)}">
        <span class="row-jp" lang="ja">${esc(g.pattern)}</span><span class="row-vi">${esc(g.meaning)}</span></a></li>`).join('')}</ul>
    </section>`).join('');
}

export function renderGrammar(view, id) {
  const g = D.items.get(id);
  if (!g) { view.innerHTML = emptyState('Không tìm thấy mẫu ngữ pháp này.', '<a class="btn btn-ghost" href="#/nguphap">Về danh sách</a>'); return; }
  const para = s => String(s || '').split(/\n\n+/).map(p => `<p>${esc(p)}</p>`).join('');
  view.innerHTML = `<article class="gram">
    <a class="back" href="#/nguphap">Danh sách ngữ pháp</a>
    <header class="gram-head">
      <h1 class="gram-pattern" lang="ja">${esc(g.pattern)}</h1>
      <span class="label-lv">${esc(g.level)}</span>
    </header>
    <p class="gram-meaning">${esc(g.meaning)}</p>

    <h2 class="h2">Cấu trúc</h2>
    <ul class="gram-struct">${(g.structure || []).map(s => `<li lang="ja">${esc(s)}</li>`).join('')}</ul>

    <h2 class="h2">Giải thích</h2>
    <div class="prose">${para(g.explain)}</div>

    ${g.casual ? `<h2 class="h2">Khi nói nhanh, nói tắt</h2><div class="prose">${para(g.casual)}</div>` : ''}

    ${(g.compare || []).length ? `<h2 class="h2">Dễ nhầm với</h2><dl class="gram-cmp">${g.compare.map(c => `<dt lang="ja">${esc(c.pattern)}</dt><dd>${esc(c.diff)}</dd>`).join('')}</dl>` : ''}

    ${(g.mistakes || []).length ? `<h2 class="h2">Lỗi hay mắc</h2><ul class="gram-mis">${g.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul>` : ''}

    <h2 class="h2">${(g.ex || []).length} câu ví dụ <small>từ dễ đến khó</small></h2>
    <ol class="gram-ex">${(g.ex || []).map(e => `<li>
      <div class="ex-row"><p class="ex-jp" lang="ja">${rubyHTML(e.jp, S.furi)}</p>${sayBtn(reading(e.jp))}</div>
      <p class="ex-vi">${esc(e.vi)} <span class="tag">${esc(CTX[e.ctx] || e.ctx || '')}</span></p></li>`).join('')}</ol>
    <p class="muted">Bài luyện điền chỗ trống và sắp xếp câu cho ngữ pháp có ở giai đoạn 2.</p>
  </article>`;
  bindSay(view);
}
