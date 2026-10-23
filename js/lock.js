// v57: lộ trình khóa N3–N1 — thẻ "Mở khóa", trang bài khóa (xem trước), bài đọc xem trước,
// dữ liệu riêng của app gộp thêm phần của cấp đã mở, nhắc hạn trên Trang chủ.
// Chỉ có hiệu lực khi danh mục công khai có trường "lock" (nội dung các cấp đó đã chuyển lên máy chủ).
import { D, isLockLevel, hasLockContent, trialCount, lockLevels } from './data.js';
import { kvGet } from './db.js';
import { esc, icon, rich } from './util.js';
import { bindSay } from './ui.js';
import { ttsReady } from './tts.js';
import { passageHTML, bindPassage, playLines } from './reader.js';

export const lockActive = () => lockLevels().length > 0;
export const levelLocked = L => isLockLevel(L) && !hasLockContent(L);
export const lessonLocked = x => !!x && levelLocked(x.level) && (x.n || 0) > trialCount();
export const isTrialLesson = x => !!x && levelLocked(x.level) && (x.n || 0) <= trialCount();
export const isPreview = it => !!it?.preview;

export function lockCardHTML(L, { compact = false } = {}) {
  return `<div class="note lock-card"><p>${icon('lock')} <b>Lộ trình ${esc(L)} do quản trị viên mở cho từng tài khoản.</b></p>
    ${compact ? '' : `<p class="small">Học thử được ${trialCount()} bài đầu. Các bài khác xem trước được tên bài và đoạn hội thoại, đoạn văn tiếng Nhật.</p>`}
    <a class="btn btn-primary btn-sm" href="#/taikhoan?mo=1">${icon('lock')} Mở khóa</a></div>`;
}
export const lockTagHTML = () => `<span class="ls-lock" aria-label="Khóa">${icon('lock')}</span>`;

// ---------- xem trước: đoạn hội thoại / đoạn văn chữ Nhật, có giọng đọc ----------
function previewBlock(it) {
  return `<section class="card pv-doc" data-pv="${esc(it.id)}">
    <h2 class="h2">${icon(it._type === 'dialog' ? 'chat' : 'book')} ${esc(it.title)}</h2>
    ${it.setting ? `<p class="doc-set">${rich(it.setting)}</p>` : ''}
    ${ttsReady() ? '<div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-pvplay>Nghe cả bài</button></div>' : ''}
    ${passageHTML(it, { vi: false })}</section>`;
}
function bindPreview(view, list) {
  bindSay(view);
  let run = 0;
  for (const it of list) {
    const sec = view.querySelector(`[data-pv="${CSS.escape(it.id)}"]`); if (!sec) continue;
    bindPassage(sec, it);
    const box = sec.querySelector('.passage');
    if (box) { box.onclick = null; box.onkeydown = null; } // bản xem trước không có giải thích từng câu
    const b = sec.querySelector('[data-pvplay]');
    if (b) b.onclick = () => {
      const my = ++run; try { speechSynthesis.cancel(); } catch { }
      sec.querySelector('[data-fold][aria-expanded="false"]')?.click();
      b.disabled = true;
      playLines(it, box, 1, () => { b.disabled = false; }, () => my === run && view.isConnected);
    };
  }
  addEventListener('hashchange', () => { run++; try { speechSynthesis.cancel(); } catch { } }, { once: true });
}
const lessonTexts = x => {
  const own = (x.texts || []).map(id => D.items.get(id));
  const th = D.dialog.filter(d => d.tonghop && d.lesson === x.id);
  return [...own, ...th].filter(Boolean);
};
export function renderLockedLesson(view, ctx, x) {
  const list = lessonTexts(x);
  view.innerHTML = `<a class="back" href="#/lotrinh">Lộ trình</a>
    <p class="small muted">Chặng ${esc(x.level)} · Bài ${x.n}/${x.total}</p>
    <h1 class="h1">${rich(x.title)}</h1>
    ${x.goal ? `<p class="lgoal">🎯 <b>Sau bài này:</b> ${rich(x.goal)}</p>` : ''}
    ${lockCardHTML(x.level)}
    ${list.length ? `<h2 class="h2 pv-h">Xem trước</h2><p class="small muted">Đoạn hội thoại, đoạn văn chữ Nhật của bài. Nghĩa tiếng Việt, câu hỏi và các phần luyện mở cùng lộ trình.</p>${list.map(previewBlock).join('')}` : ''}`;
  bindPreview(view, list);
}
export function renderLockedLevel(view, L) {
  view.innerHTML = `<a class="back" href="#/lotrinh">Lộ trình</a><h1 class="h1">Chặng ${esc(L)}</h1>${lockCardHTML(L)}`;
}
export function renderPreviewDoc(view, ctx, it) {
  const L = it.lesson && D.items.get(it.lesson);
  view.innerHTML = `<a class="back" href="${L ? `#/bai/${encodeURIComponent(L.id)}` : '#/doc'}">${L ? `Bài ${L.order}: ${esc(L.title)}` : 'Hội thoại & bài đọc'}</a>
    <h1 class="h1">${esc(it.title)}</h1>
    <p class="small muted">${esc(it.level)} · xem trước</p>
    ${lockCardHTML(it.level, { compact: true })}
    ${previewBlock(it)}`;
  bindPreview(view, [it]);
}

// ---------- dữ liệu riêng của app (data/<tên>.json) + phần của các cấp đã mở ----------
export async function appData(name, empty = {}) {
  let base;
  try { const r = await fetch(`data/${name}.json`); base = r.ok ? await r.json() : structuredClone(empty); }
  catch { base = structuredClone(empty); }
  for (const L of lockLevels()) {
    if (!hasLockContent(L)) continue;
    const ext = (await kvGet('lock:' + L, null))?.appdata?.[name];
    if (!ext) continue;
    for (const [k, v] of Object.entries(ext)) {
      if (Array.isArray(v)) base[k] = [...(Array.isArray(base[k]) ? base[k] : []), ...v];
      else if (v && typeof v === 'object') base[k] = { ...(base[k] || {}), ...v };
    }
  }
  return base;
}

// ---------- nhắc hạn (Trang chủ) ----------
export async function expiryNoticeHTML() {
  if (!lockActive()) return '';
  const C = await import('./cloud.js');
  if (!C.cloudUser()) return '';
  const g = await C.myGrants(), out = [];
  const dmy = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}`; };
  for (const L of lockLevels()) {
    const i = C.grantInfo(g[L]);
    if (i.state === 'on' && !i.forever && i.left <= 7) out.push(`Lộ trình ${L} còn <b>${i.left} ngày</b> (đến hết ${dmy(i.until - 1)}). Liên hệ quản trị viên để gia hạn.`);
    else if (i.state === 'grace') out.push(`Lộ trình ${L} đã hết hạn ngày ${dmy(i.until - 1)}; còn dùng được đến hết ${dmy(i.grace - 1)}. Liên hệ quản trị viên để gia hạn.`);
  }
  return out.length ? `<div class="note lock-remind">${out.map(t => `<p class="small">${icon('lock')} ${t}</p>`).join('')}<a class="btn btn-ghost btn-sm" href="#/taikhoan?mo=1">Tài khoản</a></div>` : '';
}
