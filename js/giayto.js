// v54 (đợt 7, mục 6): ĐỌC GIẤY TỜ THẬT — giấy tờ mẫu trình bày như bản thật (phiếu lương, bảng ca, hợp đồng, thuế cư trú,
// phiếu khấu trừ thuế, nhãn hàng, thông báo nhà ở, đơn gia hạn lưu trú…). Bấm từng ô để xem cách đọc, âm Hán Việt, nghĩa và
// "cần để ý gì"; cuối trang 5 câu hỏi đọc hiểu. Mặc định có furigana; nút "Đọc như giấy thật" ẩn furigana.
// Dữ liệu riêng của app: data/giayto.json (tên, số liệu hư cấu; số tiền chỉ để minh họa; nguồn chính thức + ngày tra).
import { esc, rich, plain, shuffle } from './util.js';
import { emptyState, openSheet } from './ui.js';

let P = null, DOCS = [];
const load = () => P || (P = import('./lock.js').then(m => m.appData('giayto', { docs: [] })).catch(() => ({ docs: [] })).then(j => { DOCS = j.docs || []; return DOCS; })); // v57
const KIND = { xuong: 'Ở chỗ làm', thue: 'Thuế, bảo hiểm', nha: 'Nhà ở, đời sống', visa: 'Lưu trú' };
const BAREKEY = 'tn-gt-bare';
const getBare = () => { try { return localStorage.getItem(BAREKEY) === '1'; } catch { return false; } };
const setBare = v => { try { localStorage.setItem(BAREKEY, v ? '1' : '0'); } catch { } };

export async function renderDocs(view) {
  await load();
  const back = '<a class="back" href="#/luyen">Luyện tập</a>';
  if (!DOCS.length) { view.innerHTML = back + emptyState('Chưa có giấy tờ mẫu. Cập nhật app khi có mạng.'); return; }
  const by = Object.keys(KIND).map(k => [k, DOCS.filter(d => d.kind === k)]).filter(([, a]) => a.length);
  view.innerHTML = `${back}<h1 class="h1">Đọc giấy tờ thật</h1>
    <p class="muted small">Giấy tờ mẫu trình bày như bản thật. Bấm vào từng ô (chữ gạch chân) để xem cách đọc, âm Hán Việt, nghĩa và <b>cần để ý gì</b>; cuối trang có 5 câu hỏi. Tên công ty, tên người, mã số đều hư cấu; số tiền chỉ để minh họa.</p>
    ${by.map(([k, arr]) => `<h2 class="h2">${esc(KIND[k])}</h2><ul class="rows">${arr.map(d => `<li><a class="row" href="#/giayto/${encodeURIComponent(d.id.split(':')[1])}"><span class="row-jp" lang="ja">${rich(d.jpR || d.jp)}</span><span class="row-vi">${rich(d.title)} · ${esc(d.level)}</span></a></li>`).join('')}</ul>`).join('')}`;
}

function termHTML(mk, gl) {
  const t = plain(mk);
  return gl[t] ? `<button type="button" class="gt-t" data-t="${esc(t)}" lang="ja">${rich(mk)}</button>` : `<span lang="ja">${rich(mk)}</span>`;
}
const cellHTML = (mk, gl) => (String(mk || '').includes('{{') ? textHTML(mk, gl) : termHTML(mk, gl));
const textHTML = (s, gl) => String(s || '').split(/\{\{(.+?)\}\}/).map((x, i) => (i % 2 ? termHTML(x, gl) : `<span lang="ja">${rich(x)}</span>`)).join('');
function blockHTML(b, gl) {
  if (b.t === 'head') return `<div class="gt-head"><p class="gt-title" lang="ja">${textHTML(b.jp, gl)}</p>${b.sub ? `<p class="gt-sub" lang="ja">${textHTML(b.sub, gl)}</p>` : ''}</div>`;
  if (b.t === 'meta') return `<dl class="gt-meta">${b.rows.map(([, k, v]) => `<div><dt>${cellHTML(k, gl)}</dt><dd>${cellHTML(v, gl)}</dd></div>`).join('')}</dl>`;
  if (b.t === 'kv') return `<table class="gt-kv">${b.name ? `<caption>${cellHTML(b.nameJ, gl)}</caption>` : ''}<tbody>${b.rows.map(([, k, v]) => `<tr><th>${cellHTML(k, gl)}</th><td>${cellHTML(v, gl)}</td></tr>`).join('')}</tbody></table>`;
  if (b.t === 'table') return `<div class="tbl-wrap"><table class="gt-tb"><thead><tr>${b.head.map(([, m]) => `<th>${cellHTML(m, gl)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(([, m]) => `<td>${cellHTML(m, gl)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  if (b.t === 'fine') return `<p class="gt-fine">${textHTML(b.jp, gl)}</p>`;
  return `<p class="gt-p">${textHTML(b.jp, gl)}</p>`;
}
function openTerm(t, gl) {
  const x = gl[t];
  if (!x) return;
  openSheet(`<div class="gt-term"><p class="gt-term-w" lang="ja">${rich(x.mk)}</p>
    <p class="gt-term-r"><span lang="ja">${esc(x.r)}</span>${x.hv ? ` · <b>${esc(x.hv)}</b>` : ''}</p>
    <p class="gt-term-vi">${rich(x.vi)}</p>
    ${x.chk ? `<p class="note small"><b>Cần để ý:</b> ${rich(x.chk)}</p>` : ''}</div>`, { label: t });
}

export async function renderPaper(view, ctx, key, toQ = false) {
  await load();
  const d = DOCS.find(x => x.id === 'gt:' + key);
  if (!d) { view.innerHTML = emptyState('Không có giấy tờ này.', '<a class="btn btn-ghost" href="#/giayto">Các giấy tờ</a>'); return; }
  const bare = getBare();
  const qs = d.q.map(q => ({ ...q, ord: shuffle(q.opts.map((o, i) => i)) }));
  view.innerHTML = `<a class="back" href="#/giayto">Các giấy tờ</a>
    <h1 class="h1">${rich(d.title)}</h1>
    <p class="small muted">${esc(KIND[d.kind] || '')} · cấp đọc khoảng ${esc(d.level)} · tra nguồn ngày ${esc(d.verified_on.split('-').reverse().join('/'))}</p>
    <p>${rich(d.intro)}</p>
    ${(d.tips || []).length ? `<ul class="small gt-tips">${d.tips.map(t => `<li>${rich(t)}</li>`).join('')}</ul>` : ''}
    <div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-gt="bare" aria-pressed="${bare}">${bare ? 'Hiện furigana' : 'Đọc như giấy thật (ẩn furigana)'}</button></div>
    <div class="gt-paper${bare ? ' bare' : ''}">
      <p class="gt-stamp">MẪU ĐỂ HỌC · ${rich('見本[みほん]')}</p>
      ${d.blocks.map(b => blockHTML(b, d.gl)).join('')}
      <p class="gt-demo">Tên, mã số hư cấu · số tiền chỉ để minh họa</p>
    </div>
    <h2 class="h2" id="gt-q">Câu hỏi đọc hiểu</h2>
    <ol class="gt-qs">${qs.map((q, i) => `<li data-qi="${i}"><p>${rich(q.q)}</p><div class="gt-opts">${q.ord.map(j => `<button type="button" class="btn btn-ghost gt-o" data-o="${j}"><span>${rich(q.opts[j])}</span></button>`).join('')}</div><p class="small gt-why" hidden>${rich(q.why)}</p></li>`).join('')}</ol>
    <p class="small gt-score" aria-live="polite"></p>
    <details class="small"><summary>Nguồn đã tra</summary><ul>${d.src.map(([t, u]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${rich(t)}</a></li>`).join('')}</ul>
      <p class="muted">${rich('Đây là kiến thức tham khảo để đọc hiểu và hỏi đúng chỗ, không phải tư vấn thuế, pháp lý. Quy định có thể đổi — khi cần, hỏi phòng nhân sự, quầy thuế 市役所[しやくしょ] / 区役所[くやくしょ] hoặc cơ quan phụ trách.')}</p></details>`;
  let done = 0, ok = 0;
  view.addEventListener('click', e => {
    const t = e.target.closest('.gt-t');
    if (t) { openTerm(t.dataset.t, d.gl); return; }
    const b = e.target.closest('[data-gt=bare]');
    if (b) { const v = view.querySelector('.gt-paper').classList.toggle('bare'); setBare(v); b.setAttribute('aria-pressed', v); b.textContent = v ? 'Hiện furigana' : 'Đọc như giấy thật (ẩn furigana)'; return; }
    const o = e.target.closest('.gt-o');
    if (o) {
      const li = o.closest('[data-qi]');
      if (li.dataset.done) return;
      li.dataset.done = '1'; done++;
      const right = +o.dataset.o === 0;
      if (right) ok++;
      li.querySelectorAll('.gt-o').forEach(x => { x.disabled = true; if (+x.dataset.o === 0) x.classList.add('is-ok'); });
      if (!right) o.classList.add('is-bad');
      li.querySelector('.gt-why').hidden = false;
      if (done === qs.length) view.querySelector('.gt-score').textContent = `Đúng ${ok}/${qs.length} câu.`;
    }
  });
  if (toQ) view.querySelector('#gt-q')?.scrollIntoView();
}
export const runDocQuiz = (view, ctx, key) => renderPaper(view, ctx, key, true);
