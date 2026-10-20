// v40: dựng trang từng phần.
// Phần vừa đủ màn hình dựng ngay; phần sau dựng dần, mỗi lượt vài mili giây rồi nhường máy vẽ (nền, cuộn, chạm vẫn mượt).
// Chỗ chưa xong có vòng ⟳ "Đang tải…" (chỉ lộ ra nếu chờ quá 0,15 giây, để khỏi nhấp nháy).
// Danh sách đang đóng chỉ dựng khi bấm mở. Đổi trang thì việc dựng của trang cũ tự dừng.
import { esc } from './util.js';

let GEN = 0;
export const bumpGen = () => ++GEN;      // app.js gọi mỗi lần đổi trang
export const curGen = () => GEN;
const now = () => performance.now();

export const loadingHTML = (label = 'Đang tải…') =>
  `<div class="tn-loading" role="status"><span class="tn-spin" aria-hidden="true"></span><span>${esc(label)}</span></div>`;
// chỗ trống sẽ được điền sau (fillSlots)
export const slotHTML = (key, label, h = 72) => `<div class="tn-slot" data-slot="${esc(key)}" style="min-height:${h}px">${loadingHTML(label)}</div>`;
// <details> chỉ dựng nội dung khi mở (bindLazy)
export const lazyDetails = (key, summary, { open = false, cls = '', label } = {}) =>
  `<details class="lazy ${cls}" data-lazy="${esc(key)}"${open ? ' open' : ''}><summary>${summary}</summary><div class="lazy-body">${loadingHTML(label)}</div></details>`;

// nhường máy một nhịp (trình duyệt kịp vẽ, nhận chạm) rồi làm tiếp.
// Không dùng scheduler.yield: phần tiếp theo của nó được ưu tiên hơn việc vẽ, nhiều nhịp dồn lại thành một khung ~100 ms.
const _mc = typeof MessageChannel === 'function' ? new MessageChannel() : null, _q = [];
if (_mc) _mc.port1.onmessage = () => _q.shift()?.();
export const yieldNow = () => new Promise(r => { if (_mc) { _q.push(r); _mc.port2.postMessage(0); } else setTimeout(r, 0); });
// đợi qua khung hình kế (phần vừa đổi đã được vẽ). Việc dựng dần dùng nhịp này: mỗi khung hình chỉ một mẻ ≤ ~8 ms
export const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
// chạy f lúc rảnh (không có requestIdleCallback thì sau một nhịp)
export const whenIdle = (f, timeout = 1500) => (window.requestIdleCallback ? requestIdleCallback(f, { timeout }) : setTimeout(f, 30));

function put(el, html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  for (const n of t.content.children) n.classList.add('tn-in');
  el.replaceWith(t.content);
}

/** Điền các chỗ `data-slot` trong root: chỗ đang lọt vào màn hình trước, còn lại từ trên xuống.
 *  fns: { key: () => html }. Mỗi lượt tối đa `budget` ms rồi nhường máy. lazy: hàm `go` của bindLazy (danh sách mở sẵn trong chỗ vừa điền).
 *  Trả về false nếu đã đổi trang. */
export async function fillSlots(root, fns, { budget = 8, onDone, lazy } = {}) {
  const gen = GEN;
  // một khoá có thể xuất hiện ở nhiều chỗ (cùng một con số trên hai thẻ) → tính một lần, điền mọi chỗ
  const pending = [...root.querySelectorAll('[data-slot]')].filter(el => el.dataset.slot in fns);
  const done = new Map(), seen = [];
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => {
    for (const e of es) if (e.isIntersecting) seen.push(e.target);
  }, { rootMargin: '200px 0px' }) : null;
  pending.forEach(el => io?.observe(el));
  await nextFrame();   // để phần dựng ngay được vẽ trước đã
  let t = now();
  while (pending.length) {
    if (gen !== GEN) { io?.disconnect(); return false; }
    let i = -1;
    while (seen.length && i < 0) i = pending.indexOf(seen.shift());
    if (i < 0) i = 0;
    const [el] = pending.splice(i, 1);
    io?.unobserve(el);
    const k = el.dataset.slot;
    if (!done.has(k)) { let html = ''; try { html = fns[k]?.() ?? ''; } catch (e) { console.error(e); } done.set(k, html); }
    if (el.isConnected) { put(el, done.get(k)); if (lazy) root.querySelectorAll('details[data-lazy][open]').forEach(lazy); }
    if (now() - t > budget) { await nextFrame(); t = now(); }
  }
  io?.disconnect();
  if (gen === GEN) onDone?.();
  return gen === GEN;
}

/** Ghép danh sách dài vào el theo từng mẻ (mỗi mẻ tối đa `budget` ms). first: số dòng dựng ngay.
 *  per: số dòng tối đa mỗi khung hình. alive: hàm trả false khi danh sách đã bị thay (lọc lại, tìm lại) → dừng. */
export async function appendChunks(el, list, row, { first = 20, budget = 8, per = 24, after, alive } = {}) {
  const gen = GEN;
  let i = 0;
  const step = n => {
    let h = '';
    const end = Math.min(list.length, i + n);
    for (; i < end; i++) h += row(list[i], i);
    el.insertAdjacentHTML('beforeend', h);
  };
  step(first);
  after?.(i);
  if (i >= list.length) return true;
  const tail = document.createElement('div');
  tail.className = 'tn-tail';
  tail.innerHTML = loadingHTML();
  el.after(tail);
  await nextFrame();
  while (i < list.length) {
    if (gen !== GEN || !el.isConnected || alive?.() === false) { tail.remove(); return false; }
    const t = now();
    let h = '';
    // mỗi khung hình tối đa `per` dòng: dựng chuỗi thì nhanh, cái tốn là trình duyệt tính bố cục + vẽ các dòng mới
    const stop = Math.min(list.length, i + per);
    while (i < stop && now() - t < budget) {
      const end = Math.min(stop, i + 6);
      for (; i < end; i++) h += row(list[i], i);
    }
    el.insertAdjacentHTML('beforeend', h);
    after?.(i);
    await nextFrame();
  }
  tail.remove();
  return true;
}

/** Nối các <details data-lazy> trong root với hàm dựng nội dung: mở lần đầu mới dựng. fns: { key: (body) => html } */
export function bindLazy(root, fns) {
  const done = new WeakSet();
  const go = d => {
    if (done.has(d)) return;
    const f = fns[d.dataset.lazy];
    if (!f) return;
    done.add(d);
    const gen = GEN, body = d.querySelector('.lazy-body');
    nextFrame().then(() => {
      if (gen !== GEN || !body?.isConnected) return;
      let html = '';
      try { html = f(body) ?? ''; } catch (e) { console.error(e); }
      if (html) { body.innerHTML = html; body.classList.add('tn-in'); }
    });
  };
  root.addEventListener('toggle', e => { const d = e.target; if (d.open && d.matches?.('details[data-lazy]')) go(d); }, true);
  root.querySelectorAll('details[data-lazy][open]').forEach(go);
  return go;
}
