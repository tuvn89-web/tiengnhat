import { esc, rubyHTML, wordHTML, reading, jp, icon, toast, $, rich, kanjiChars } from './util.js';
import { TOPICS, POS, REG, D } from './data.js';
export { wordDetailHTML, exampleHTML, kanjiStripHTML } from './wordx.js';
import { S } from './settings.js';
import { speak, ttsReady } from './tts.js';

// ---- nhóm chip (chọn một hoặc nhiều) ----
export function chips(name, opts, selected, multi = true) {
  const sel = new Set([].concat(selected ?? []));
  // chọn một: giá trị đã lưu không còn trong danh sách (vd. nguồn cũ đã bỏ) → chọn mục đầu
  if (!multi && opts.length && !opts.some(([v]) => sel.has(v))) { sel.clear(); sel.add(opts[0][0]); }
  return `<div class="chips" role="group" data-name="${name}" data-multi="${multi ? 1 : 0}">` +
    opts.map(([v, label, extra, html]) => `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${sel.has(v)}" ${html ? 'lang="ja"' : ''}>${html ? label : esc(label)}${extra != null ? ` <small>${esc(extra)}</small>` : ''}</button>`).join('') +
    `</div>`;
}
export function bindChips(root, onChange) {
  root.addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    const g = b.closest('.chips');
    if (g.dataset.multi === '1') b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true');
    else { g.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', c === b)); }
    onChange?.(g.dataset.name);
  });
}
export const readChips = (root, name) => [...root.querySelectorAll(`.chips[data-name="${name}"] .chip[aria-pressed="true"]`)].map(b => b.dataset.v);
export const readChip = (root, name) => readChips(root, name)[0];

// ---- đọc to ----
export function sayBtn(text, label = 'Nghe') {
  return `<button type="button" class="icon-btn say" data-say="${esc(text)}" aria-label="${label}">${icon('speaker')}</button>`;
}
export function bindSay(root) {
  if (root.__say) return; // chỉ gắn một lần cho mỗi khung
  root.__say = true;
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-say]');
    if (!b) return;
    if (!ttsReady() || !speak(b.dataset.say)) toast('Máy chưa có giọng đọc tiếng Nhật. Xem mục Giọng đọc trong Cài đặt.');
  });
}

export const topicNames = it => (it.topics || []).map(t => TOPICS[t] || t).join(', ');

// ---- bảng trượt từ dưới lên ----
export function openSheet(html, { onClose, label = 'Chi tiết' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">
    <button type="button" class="icon-btn sheet-x" aria-label="Đóng">${icon('close')}</button>
    <div class="sheet-body">${html}</div></div>`;
  document.body.appendChild(wrap);
  // v37: chờ trình duyệt dựng xong nội dung bảng (2 khung) rồi mới chạy hiệu ứng mở — khung đầu không bị nuốt, bảng trượt lên đều
  if (!document.documentElement.classList.contains('calm')) { wrap.classList.add('tn-wait'); requestAnimationFrame(() => requestAnimationFrame(() => wrap.classList.remove('tn-wait'))); }
  const prev = document.activeElement;
  // v32: đóng bảng cũng mượt (mờ dần, thu nhỏ nhẹ) rồi mới gỡ khỏi trang; chế độ yên (tắt chuyển động) thì gỡ ngay
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    if (document.documentElement.classList.contains('calm')) wrap.remove();
    else {
      wrap.classList.add('is-closing'); wrap.setAttribute('aria-hidden', 'true');
      const done = () => wrap.remove();
      wrap.addEventListener('animationend', e => { if (e.target === wrap) done(); });
      setTimeout(done, 340);
    }
    wrap.dispatchEvent(new Event('sheetclose')); // v66: chồng bảng (tap.js) hiện lại bảng dưới trước khi trả lại tiêu điểm
    prev?.focus?.(); onClose?.();
  };
  const onKey = e => { if (e.key === 'Escape' && [...document.querySelectorAll('.sheet-wrap:not(.is-closing)')].pop() === wrap) close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.sheet-x')) close(); });
  bindSay(wrap);
  setTimeout(() => wrap.querySelector('.sheet-x').focus(), 0);
  const h = { el: wrap, close, body: wrap.querySelector('.sheet-body') };
  wrap.__sheet = h;
  return h;
}

export function confirmBox(msg, okLabel = 'Đồng ý', cancelLabel = 'Huỷ') {
  return new Promise(res => {
    const s = openSheet(`<p class="confirm-msg">${esc(msg)}</p>
      <div class="row-btns"><button class="btn btn-ghost" data-a="no">${esc(cancelLabel)}</button><button class="btn btn-primary" data-a="yes">${esc(okLabel)}</button></div>`,
      { onClose: () => res(false), label: 'Xác nhận' });
    s.body.addEventListener('click', e => {
      const a = e.target.closest('[data-a]')?.dataset.a;
      if (!a) return;
      res(a === 'yes'); s.el.remove();
    });
  });
}

// Tab trên đầu trang Luyện từ
export const wtabs = cur => `<div class="tabs" role="tablist">
  <a role="tab" href="#/luyen" aria-selected="${cur === 'hub'}">Các dạng bài</a>
  <a role="tab" href="#/hoc" aria-selected="${cur === 'quiz'}">Trắc nghiệm</a>
  <a role="tab" href="#/ghep" aria-selected="${cur === 'match'}">Ghép 6 cặp</a></div>`;

export const field = (label, inner, hint = '') => `<label class="field"><span class="field-l">${esc(label)}</span>${inner}${hint ? `<span class="field-h">${hint}</span>` : ''}</label>`;
export const emptyState = (msg, actionHTML = '') => `<div class="empty"><p>${esc(msg)}</p>${actionHTML}</div>`;
export const topicOpts = () => {
  const used = new Set(); for (const it of D.vocab) for (const t of it.topics) used.add(t);
  return Object.entries(TOPICS).filter(([k]) => used.has(k)).map(([k, v]) => [k, v]);
};
