import { esc, rubyHTML, wordHTML, reading, jp, icon, toast, $ } from './util.js';
import { TOPICS, POS, REG, D } from './data.js';
import { S } from './settings.js';
import { speak, ttsReady } from './tts.js';

// ---- nhóm chip (chọn một hoặc nhiều) ----
export function chips(name, opts, selected, multi = true) {
  const sel = new Set([].concat(selected ?? []));
  return `<div class="chips" role="group" data-name="${name}" data-multi="${multi ? 1 : 0}">` +
    opts.map(([v, label, extra]) => `<button type="button" class="chip" data-v="${esc(v)}" aria-pressed="${sel.has(v)}">${esc(label)}${extra != null ? ` <small>${esc(extra)}</small>` : ''}</button>`).join('') +
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

export function exampleHTML(ex, { ctx } = {}) {
  return `<div class="ex">
    <div class="ex-row"><p class="ex-jp" lang="ja">${rubyHTML(ex.jp, S.furi)}</p>${sayBtn(reading(ex.jp))}</div>
    <p class="ex-vi">${esc(ex.vi)}${ctx ? ` <span class="tag">${esc(ctx)}</span>` : ''}</p>
  </div>`;
}

export const topicNames = it => (it.topics || []).map(t => TOPICS[t] || t).join(', ');

export function wordDetailHTML(it, { compact = false } = {}) {
  const tn = topicNames(it);
  const reg = it.reg && it.reg !== 'thuong' && !tn.includes(REG[it.reg]) ? REG[it.reg] : '';
  const meta = [POS[it.pos] || it.pos, it.level, tn, reg].filter(Boolean);
  return `<div class="wd">
    <div class="wd-head">
      <p class="wd-word" lang="ja">${wordHTML(it, 'furi')}</p>
      ${sayBtn(it.kana)}
    </div>
    ${it.kanji ? `<p class="wd-kana" lang="ja">${esc(it.kana)}</p>` : ''}
    ${S.showHv && it.hv ? `<p class="wd-hv">Hán Việt: <b>${esc(it.hv)}</b></p>` : ''}
    <p class="wd-vi">${esc(it.vi)}</p>
    ${it.std ? `<p class="wd-std">Tiếng chuẩn: <span lang="ja">${esc(it.std)}</span></p>` : ''}
    <p class="wd-meta">${meta.map(esc).join(' / ')}</p>
    ${(it.ex || []).slice(0, compact ? 1 : 9).map(e => exampleHTML(e)).join('')}
    ${it.note ? `<p class="wd-note">${esc(it.note)}</p>` : ''}
    ${it.flag ? `<p class="wd-flag">Mục này đang được đánh dấu cần kiểm lại.</p>` : ''}
    ${D.reports[it.id] && !D.reports[it.id]._del ? `<p class="wd-flag">Cậu Cả đã báo sai mục này${D.reports[it.id].note ? ': ' + esc(D.reports[it.id].note) : ''}.</p>` : ''}
  </div>`;
}

// ---- bảng trượt từ dưới lên ----
export function openSheet(html, { onClose, label = 'Chi tiết' } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(label)}">
    <button type="button" class="icon-btn sheet-x" aria-label="Đóng">${icon('close')}</button>
    <div class="sheet-body">${html}</div></div>`;
  document.body.appendChild(wrap);
  const prev = document.activeElement;
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); prev?.focus?.(); onClose?.(); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.sheet-x')) close(); });
  bindSay(wrap);
  setTimeout(() => wrap.querySelector('.sheet-x').focus(), 0);
  return { el: wrap, close, body: wrap.querySelector('.sheet-body') };
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

export const field = (label, inner, hint = '') => `<label class="field"><span class="field-l">${esc(label)}</span>${inner}${hint ? `<span class="field-h">${hint}</span>` : ''}</label>`;
export const emptyState = (msg, actionHTML = '') => `<div class="empty"><p>${esc(msg)}</p>${actionHTML}</div>`;
export const topicOpts = () => {
  const used = new Set(); for (const it of D.vocab) for (const t of it.topics) used.add(t);
  return Object.entries(TOPICS).filter(([k]) => used.has(k)).map(([k, v]) => [k, v]);
};
