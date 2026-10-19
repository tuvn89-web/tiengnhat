// v32: nút ‹ quay lại nổi — có ở mọi trang trừ Trang chủ.
// Bấm: như nút Back của điện thoại (đang làm bài thì hỏi "Dừng lượt này?"; màn kết quả thì về trang trước khi vào bài).
// Mở thẳng một trang (không có trang trước trong app) thì về trang cha, rồi Trang chủ.
// Giữ 0,7 giây → rung nhẹ → kéo đổi chỗ; thả tay → rung nhẹ, vị trí lưu trên máy này (tính theo tỉ lệ màn hình, xoay máy vẫn đúng chỗ).
import { parentOf } from './nav.js';

const KEY = 'tn-backpos';
const HOLD = 700, SLOP = 10, M = 6;
let btn = null, ctxRef = null;

const loadPos = () => { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && Number.isFinite(p.fx) && Number.isFinite(p.fy) ? p : null; } catch { return null; } };
const savePos = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { } };
const buzz = ms => { try { navigator.vibrate?.(ms); } catch { } };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const size = () => [btn.offsetWidth || 44, btn.offsetHeight || 44];
// vùng được đặt nút: không đè thanh trên, không đè thanh công cụ dưới (điện thoại)
function bounds() {
  const [w, h] = size();
  const tb = document.getElementById('topbar')?.getBoundingClientRect();
  const nav = document.querySelector('.nav')?.getBoundingClientRect();
  const y0 = Math.max(M, (tb ? tb.bottom : 0) + M);
  const y1 = (nav && nav.width > innerWidth / 2 && nav.top > innerHeight / 2 ? nav.top : innerHeight) - h - M;
  return { x0: M, x1: Math.max(M, innerWidth - w - M), y0, y1: Math.max(y0, y1) };
}
function place() {
  const p = loadPos();
  if (!p) { btn.classList.remove('is-free'); btn.style.left = btn.style.top = ''; return; }
  const b = bounds();
  btn.classList.add('is-free');
  btn.style.left = b.x0 + clamp(p.fx, 0, 1) * (b.x1 - b.x0) + 'px';
  btn.style.top = b.y0 + clamp(p.fy, 0, 1) * (b.y1 - b.y0) + 'px';
}

export function goPrev(ctx) {
  if (ctx.inRun || history.state?.tntRun || (history.state?.tnIdx || 0) > 0) { history.back(); return; }
  ctx.replaceNext = true; // về trang cha mà không thêm mốc lịch sử
  location.replace(parentOf(location.hash));
}

function bind() {
  let pid = null, sx = 0, sy = 0, ox = 0, oy = 0, timer = 0, drag = false, moved = false, suppress = false;
  btn.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault(); // không bôi chọn chữ, không kéo-thả kiểu trình duyệt (làm mất sự kiện kéo)
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; drag = moved = suppress = false;
    const r = btn.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (pid == null || moved) return;
      // ghim chỗ hiện tại bằng toạ độ (trước khi nút phóng to lúc kéo)
      const r = btn.getBoundingClientRect();
      btn.style.left = r.left + 'px'; btn.style.top = r.top + 'px'; btn.classList.add('is-free');
      drag = true; btn.classList.add('is-drag'); buzz(30);
      try { btn.setPointerCapture(pid); } catch { }
    }, HOLD);
  });
  btn.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    if (!drag) { if (Math.hypot(e.clientX - sx, e.clientY - sy) > SLOP) { moved = true; clearTimeout(timer); } return; }
    e.preventDefault();
    const b = bounds();
    btn.classList.add('is-free');
    btn.style.left = clamp(e.clientX - ox, b.x0, b.x1) + 'px';
    btn.style.top = clamp(e.clientY - oy, b.y0, b.y1) + 'px';
  });
  const end = e => {
    if (e.pointerId !== pid) return;
    clearTimeout(timer); pid = null;
    if (drag) {
      drag = false; suppress = true; btn.classList.remove('is-drag'); buzz(15);
      const b = bounds(), x = parseFloat(btn.style.left) || b.x0, y = parseFloat(btn.style.top) || b.y0; // toạ độ thật, không tính phần phóng to
      savePos({ fx: clamp((x - b.x0) / Math.max(1, b.x1 - b.x0), 0, 1), fy: clamp((y - b.y0) / Math.max(1, b.y1 - b.y0), 0, 1) });
    } else if (moved) suppress = true;
  };
  btn.addEventListener('pointerup', end);
  btn.addEventListener('pointercancel', end);
  btn.addEventListener('click', e => {
    e.preventDefault();
    if (suppress) { suppress = false; return; }
    goPrev(ctxRef);
  });
  btn.addEventListener('contextmenu', e => e.preventDefault());
  btn.addEventListener('dragstart', e => e.preventDefault());
  let rsT = 0;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { if (btn.classList.contains('is-free')) place(); }, 150); });
}

export function initBackFab(ctx) {
  ctxRef = ctx;
  btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'back-fab'; btn.hidden = true;
  btn.setAttribute('aria-label', 'Quay lại');
  btn.title = 'Quay lại màn hình trước · giữ 0,7 giây rồi kéo để đổi chỗ';
  btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  document.body.append(btn);
  bind();
  place();
}
// gọi mỗi lần chuyển trang: Trang chủ thì ẩn
export function backFabRoute(h) {
  if (!btn) return;
  const was = btn.hidden;
  btn.hidden = !h;
  if (was && !btn.hidden && btn.classList.contains('is-free')) place();
}
