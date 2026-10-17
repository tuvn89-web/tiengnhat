import { esc, rubyHTML, reading, rich, richParas } from './util.js';
import { D, LEVELS, CTX } from './data.js';
import { status, dueDirs, errCount, stats, setLearned } from './srs.js';
import { bindSay, sayBtn, emptyState } from './ui.js';
import { gtabs } from './gdrill.js';
import { formsForGrammar } from './forms.js';
import { grammarTemplates } from './practice.js';

const ST = { new: 'Chưa học', learning: 'Đang học', known: 'Đã thuộc' };
const row = g => `<li><a class="row" href="#/nguphap/${encodeURIComponent(g.id)}">
  <span class="row-jp" lang="ja">${rich(g.pattern)}</span><span class="row-vi">${rich(g.meaning)}</span>
  <span class="dot dot-${status(g)}" title="${ST[status(g)]}${dueDirs(g).length ? ' · đến hạn ôn' : ''}"></span></a></li>`;

export function renderGrammarList(view) {
  if (!D.grammar.length) { view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('list')}` + emptyState('Chưa có gói ngữ pháp nào. Nhờ skill jp-v01-data làm gói rồi nhập vào.', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const st = stats(D.grammar);
  const hard = D.grammar.filter(g => errCount(g) > 0).sort((a, b) => errCount(b) - errCount(a)).slice(0, 5);
  const by = LEVELS.map(l => [l, D.grammar.filter(g => g.level === l)]).filter(([, a]) => a.length);
  view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('list')}
    <p class="muted small">${st.total} mẫu · đã thuộc ${st.known} · đang học ${st.learning}${st.due ? ` · <b>${st.due} mẫu đến hạn ôn</b> — vào tab Luyện tập, chọn "Đến hạn ôn"` : ''}.</p>
    ${hard.length ? `<section class="glevel"><h2 class="h2">Mẫu hay sai</h2><ul class="rows">${hard.map(row).join('')}</ul></section>` : ''}
    ${by.map(([l, arr]) => `<section class="glevel"><h2 class="h2">${l}</h2><ul class="rows">${arr.map(row).join('')}</ul></section>`).join('')}`;
}

// B1: mẫu gắn với thể động từ (〜ている, 受身形, 〜てしまう…) hoặc có khuôn câu riêng → luyện thể đó với động từ của mình
const formsBtn = (g, block) => (formsForGrammar(g).length || grammarTemplates(g).length ? `<a class="btn btn-ghost${block ? ' btn-block' : ''}" href="#/luyen/chia?g=${encodeURIComponent(g.id)}">Luyện thể này với động từ của tôi</a>` : '');
export function renderGrammar(view, id) {
  const g = D.items.get(id);
  if (!g) { view.innerHTML = emptyState('Không tìm thấy mẫu ngữ pháp này.', '<a class="btn btn-ghost" href="#/nguphap">Về danh sách</a>'); return; }
  view.innerHTML = `<article class="gram">
    <a class="back" href="#/nguphap">Danh sách ngữ pháp</a>
    <header class="gram-head">
      <h1 class="gram-pattern" lang="ja">${rich(g.pattern)}</h1>
      <span class="label-lv">${esc(g.level)}</span>
    </header>
    <p class="gram-meaning">${rich(g.meaning)}</p>
    <div class="row-btns wrap"><a class="btn btn-primary" href="#/nguphap/luyen?g=${encodeURIComponent(g.id)}">Luyện mẫu này</a>${formsBtn(g)}</div>

    <h2 class="h2">Cấu trúc</h2>
    <ul class="gram-struct">${(g.structure || []).map(s => `<li>${rich(s)}</li>`).join('')}</ul>

    <h2 class="h2">Giải thích</h2>
    <div class="prose">${richParas(g.explain)}</div>

    ${g.casual ? `<h2 class="h2">Khi nói nhanh, nói tắt</h2><div class="prose">${richParas(g.casual)}</div>` : ''}

    ${(g.compare || []).length ? `<h2 class="h2">Dễ nhầm với</h2><dl class="gram-cmp">${g.compare.map(c => `<dt lang="ja">${rich(c.pattern)}</dt><dd>${rich(c.diff)}</dd>`).join('')}</dl>` : ''}

    ${(g.mistakes || []).length ? `<h2 class="h2">Lỗi hay mắc</h2><ul class="gram-mis">${g.mistakes.map(m => `<li>${rich(m)}</li>`).join('')}</ul>` : ''}

    <h2 class="h2">${(g.ex || []).length} câu ví dụ <small>từ dễ đến khó</small></h2>
    <ol class="gram-ex">${(g.ex || []).map(e => `<li>
      <div class="ex-row"><p class="ex-jp" lang="ja">${rubyHTML(e.jp, true)}</p>${sayBtn(reading(e.jp))}</div>
      <p class="ex-vi">${esc(e.vi)} <span class="tag">${esc(CTX[e.ctx] || e.ctx || '')}</span></p></li>`).join('')}</ol>
    <div class="row-btns stack">${status(g) === 'new' ? '<button type="button" class="btn btn-primary btn-block" data-act="glearned">Đã học xong bài này</button>' : '<p class="small muted gdone">✓ Đã học mẫu này — sẽ ôn theo lịch.</p>'}
      <a class="btn ${status(g) === 'new' ? 'btn-ghost' : 'btn-primary'} btn-block" href="#/nguphap/luyen?g=${encodeURIComponent(g.id)}">Luyện mẫu này</a>${formsBtn(g, true)}</div>
  </article>`;
  bindSay(view);
  const gl = view.querySelector('[data-act=glearned]');
  if (gl) gl.onclick = async () => { await setLearned(g, 'learned'); gl.replaceWith(Object.assign(document.createElement('p'), { className: 'small muted gdone', textContent: '✓ Đã học mẫu này — sẽ ôn theo lịch.' })); };
}
