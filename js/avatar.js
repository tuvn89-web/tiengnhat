// v66: ẢNH ĐẠI DIỆN — chạm ảnh ở trang Tài khoản / Hồ sơ → "Xem ảnh đại diện" (ảnh lớn, không khung, không huy hiệu)
// hoặc "Đổi ảnh đại diện" (màn chỉnh: ảnh nằm sau lỗ tròn của khung đang dùng; kéo để dịch, chụm hai ngón / thanh trượt để
// phóng to 1–5×, xoay 90°, "Vừa khung"; xem trước 3 cỡ; đổi khung đã đạt; Lưu thì cắt đúng vùng đã chỉnh).
// Ảnh lưu vẫn ≤ 11 500 ký tự (bảng xếp hạng tải ảnh của 50 người một lúc) — không đổi quy tắc máy chủ.
// Bảng xếp hạng: chạm một người → ảnh lớn, biệt danh, khung, huy hiệu. Không bao giờ có email.
import { esc, icon, toast } from './util.js';
import { LEVELS } from './data.js';
import { openSheet } from './ui.js';
import { cloudUser, cachedProfile, myProfile, saveProfile } from './cloud.js';
import { PRESETS, FRAMES, frameHTML, badgeHTML, myStats, earnedFrames } from './profile.js';

const frameName = f => FRAMES.find(x => x[0] === f)?.[1] || f;
// ảnh Google cỡ lớn: …=s96-c → …=s512-c
export const bigPhoto = u => String(u || '').replace(/=s\d+(-c)?$/, '=s512-c').replace(/\/s\d+(-c)?\//, '/s512-c/');
// ảnh lớn, không khung
export function bigAvHTML(p) {
  const av = p?.av || 'g';
  if (av.startsWith('data:image/')) return `<img class="av-big" src="${av}" alt="Ảnh đại diện">`;
  if (av.startsWith('p:')) {
    const pr = PRESETS.find(x => x[0] === av.slice(2)) || PRESETS[0];
    return `<span class="av-big av-big-pre" style="background:linear-gradient(160deg, ${pr[1]}, ${pr[2]})" lang="ja" role="img" aria-label="Ảnh chữ ${esc(pr[0])}">${esc(pr[0])}</span>`;
  }
  const url = av.startsWith('https://') ? av : p?.photo;
  if (url) return `<img class="av-big" src="${esc(bigPhoto(url))}" alt="Ảnh đại diện" referrerpolicy="no-referrer">`;
  return `<span class="av-big av-big-pre" style="background:linear-gradient(160deg, #3d7be0, #9cc2ff)" role="img" aria-label="Chữ cái đầu">${esc((p?.nick || p?.name || '?').trim().charAt(0).toUpperCase())}</span>`;
}
async function me() {
  const u = cloudUser();
  if (!u) return null;
  let p = await cachedProfile();
  try { p = await myProfile(); } catch { }
  return { ...(p || {}), photo: u.photo, name: u.name };
}

// ---------- chạm ảnh: Xem / Đổi ----------
export function avMenu() {
  const s = openSheet(`<h2 class="h2">Ảnh đại diện</h2>
    <div class="av-opts">
      <button type="button" class="av-opt" data-am="view">${icon('eye')}<span><b>Xem ảnh đại diện</b><small>Ảnh lớn, không khung</small></span></button>
      <button type="button" class="av-opt" data-am="edit">${icon('image')}<span><b>Đổi ảnh đại diện</b><small>Tải ảnh, chỉnh cho vừa khung, đổi khung</small></span></button>
    </div>`, { label: 'Ảnh đại diện' });
  s.body.addEventListener('click', e => {
    const a = e.target.closest('[data-am]')?.dataset.am;
    if (!a) return;
    s.close();
    if (a === 'view') avView(); else avEditor();
  });
  return s;
}
export async function avView() {
  const p = await me();
  if (!p) return;
  const s = openSheet(`<div class="av-view">${bigAvHTML(p)}</div>
    <div class="row-btns"><button type="button" class="btn btn-ghost" data-am="edit">${icon('image')} Đổi ảnh đại diện</button></div>`, { label: 'Ảnh đại diện' });
  s.body.querySelector('[data-am=edit]').onclick = () => { s.close(); avEditor(); };
  return s;
}
// bảng xếp hạng: một người — ảnh lớn, biệt danh, khung, huy hiệu (dòng xếp hạng không có email)
export function rankCard(r) {
  const f = FRAMES.some(x => x[0] === r.frame) ? r.frame : 'khoidau';
  return openSheet(`<div class="av-view">${bigAvHTML(r)}</div>
    <p class="pf-nick av-nick" lang="ja">${esc(r.nick || '')}</p>
    <div class="av-fr">${frameHTML(r, 96, { anim: true, label: `Khung ${frameName(f)}` })}<span><span class="small muted">Khung</span><b>${esc(frameName(f))}</b>${r.ak && f !== 'khoidau' ? '<small class="muted">có ánh kim (★★★)</small>' : ''}</span></div>
    <p class="sub-label">Huy hiệu</p>
    <div class="hh-row">${['kana', ...LEVELS].map(k => badgeHTML(k, r.badges?.[k] || 0, 40)).join('')}</div>`, { label: r.nick || 'Người học' });
}

// ---------- màn chỉnh ----------
const HOLE = 128 / 240; // đường kính lỗ tròn của khung (theo cỡ khung) — xem .fr-av trong app.css
const frameFile = f => (f === 'khoidau' ? 'khoidau' : f.toLowerCase());
export async function avEditor() {
  const p = await me();
  if (!p) return;
  const st = await myStats(), earned = earnedFrames(st);
  const cur = { av: p.av || 'g', frame: earned.includes(p.frame) ? p.frame : earned[earned.length - 1], photo: p.photo, nick: p.nick, name: p.name };
  const akOf = f => f !== 'khoidau' && st.badges[f] >= 3;
  let crop = null; // { img, url, w, h, r (độ), z (1–5), ox, oy (lệch tâm, tính theo đường kính lỗ) }
  const S = Math.max(220, Math.min(300, Math.round(innerWidth * 0.74)));
  const PV = [[132, 'Hồ sơ'], [88, 'Tài khoản'], [42, 'Thanh trên · xếp hạng']];
  const s = openSheet(`<h2 class="h2">Đổi ảnh đại diện</h2>
    <div class="ave">
      <div class="ave-stage" style="--fs:${S}px"></div>
      <div class="ave-tools" hidden>
        <label class="ave-zoom"><span class="small muted">1×</span><input type="range" min="1" max="5" step="0.01" value="1" aria-label="Phóng to, thu nhỏ"><span class="small muted">5×</span></label>
        <div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-ae="rot">${icon('rotate')} Xoay 90°</button><button type="button" class="btn btn-ghost btn-sm" data-ae="fit">Vừa khung</button></div>
        <p class="small muted ave-hint">Kéo ảnh để dịch; chụm hai ngón hoặc kéo thanh để phóng to, thu nhỏ. Phần mờ bên ngoài vòng tròn sẽ bị cắt.</p>
      </div>
      <p class="sub-label">Xem trước</p>
      <div class="ave-prev">${PV.map(([n, l]) => `<figure><div class="ave-pv" data-n="${n}"></div><figcaption class="small muted">${l}</figcaption></figure>`).join('')}</div>
      <p class="sub-label">Chọn ảnh</p>
      <div class="row-btns wrap"><button type="button" class="btn btn-ghost" data-ae="up">${icon('camera')} Tải ảnh từ máy</button>${p.photo ? `<button type="button" class="btn btn-ghost" data-av="g">Ảnh tài khoản Google</button>` : ''}</div>
      <input type="file" accept="image/*" hidden data-in="img">
      <div class="pf-pres">${PRESETS.map(([k, a, b]) => `<button type="button" class="pf-pre" data-av="p:${k}" aria-label="Ảnh chữ ${k}" style="background:linear-gradient(160deg, ${a}, ${b})" lang="ja">${k}</button>`).join('')}</div>
      <p class="sub-label">Khung <small class="muted">· các khung đã đạt</small></p>
      <div class="ave-frames">${FRAMES.filter(([f]) => earned.includes(f)).map(([f, n]) => `<button type="button" class="pf-fr" data-fr="${f}"><img src="icons/khung/${frameFile(f)}.svg" alt="">${akOf(f) ? '<img class="pf-ak" src="icons/khung/anhkim.svg" alt="">' : ''}<span>${esc(n)}</span></button>`).join('')}</div>
      <div class="row-btns ave-act"><button type="button" class="btn btn-ghost" data-ae="cancel">Huỷ</button><button type="button" class="btn btn-primary" data-ae="save">Lưu</button></div>
    </div>`, { label: 'Đổi ảnh đại diện', onClose: () => { if (crop?.url?.startsWith('blob:')) URL.revokeObjectURL(crop.url); } });
  const B = s.body, stage = B.querySelector('.ave-stage'), tools = B.querySelector('.ave-tools'), zoom = tools.querySelector('input[type=range]');

  // ---- vị trí ảnh ----
  const dims = () => (crop.r % 180 ? [crop.h, crop.w] : [crop.w, crop.h]);
  const clamp = () => {
    crop.z = Math.min(5, Math.max(1, crop.z));
    const [W, H] = dims(), m = Math.min(W, H), rw = (W / m) * crop.z, rh = (H / m) * crop.z;
    crop.ox = Math.max(-(rw - 1) / 2, Math.min((rw - 1) / 2, crop.ox));
    crop.oy = Math.max(-(rh - 1) / 2, Math.min((rh - 1) / 2, crop.oy));
  };
  // đặt ảnh để tâm lỗ (đường kính D) nằm ở (cx, cy)
  const place = (img, D, cx, cy) => {
    const [W, H] = dims(), m = Math.min(W, H), iw = (crop.w / m) * crop.z * D, ih = (crop.h / m) * crop.z * D;
    img.style.width = iw + 'px'; img.style.height = ih + 'px';
    img.style.left = (cx + crop.ox * D - iw / 2) + 'px'; img.style.top = (cy + crop.oy * D - ih / 2) + 'px';
    img.style.transform = `rotate(${crop.r}deg)`;
  };
  const cropFrameHTML = (n, ghost) => `<span class="fr ave-fr" data-f="${cur.frame}" style="--fs:${n}px">${ghost ? `<img class="ave-ghost" src="${crop.url}" alt="" draggable="false">` : ''}<span class="fr-av ave-hole"><img src="${crop.url}" alt="" draggable="false"></span><img class="fr-f" src="icons/khung/${frameFile(cur.frame)}.svg" alt="">${akOf(cur.frame) ? '<img class="fr-f" src="icons/khung/anhkim.svg" alt="">' : ''}</span>`;
  let raf = 0;
  const layout = () => {
    raf = 0;
    if (!crop) return;
    const g = stage.querySelector('.ave-ghost'), D = S * HOLE;
    if (g) place(g, D, S / 2, S / 2);
    stage.querySelectorAll('.ave-hole img').forEach(i => place(i, D, D / 2, D / 2));
    B.querySelectorAll('.ave-pv').forEach(pv => { const n = +pv.dataset.n, d = n * HOLE; const i = pv.querySelector('.ave-hole img'); if (i) place(i, d, d / 2, d / 2); });
    zoom.value = String(crop.z);
  };
  const relayout = () => { if (!raf) raf = requestAnimationFrame(layout); };
  const draw = () => {
    const show = { ...cur, ak: akOf(cur.frame) };
    tools.hidden = !crop;
    stage.classList.toggle('is-crop', !!crop);
    stage.innerHTML = crop ? cropFrameHTML(S, true) : frameHTML(show, S);
    B.querySelectorAll('.ave-pv').forEach(pv => { const n = +pv.dataset.n; pv.innerHTML = crop ? cropFrameHTML(n, false) : frameHTML(show, n); });
    B.querySelectorAll('[data-av]').forEach(b => b.setAttribute('aria-pressed', String(!crop && b.dataset.av === cur.av)));
    B.querySelector('[data-ae=up]').setAttribute('aria-pressed', String(!!crop));
    B.querySelectorAll('[data-fr]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.fr === cur.frame)));
    layout();
  };
  const loadImg = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Không đọc được ảnh này — chọn ảnh khác (JPG, PNG, WebP).')); i.src = url; });
  const startCrop = async url => {
    const img = await loadImg(url);
    if (crop?.url?.startsWith('blob:') && crop.url !== url) URL.revokeObjectURL(crop.url);
    crop = { img, url, w: img.naturalWidth, h: img.naturalHeight, r: 0, z: 1, ox: 0, oy: 0 };
    draw();
  };
  // ảnh tải lên trước đây (đã lưu) → mở sẵn để chỉnh lại
  if (cur.av.startsWith('data:image/')) startCrop(cur.av).catch(() => { });
  else draw();

  // ---- kéo, chụm, cuộn chuột ----
  const pts = new Map();
  stage.addEventListener('pointerdown', e => {
    if (!crop) return;
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch { }
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  stage.addEventListener('pointermove', e => {
    if (!crop || !pts.has(e.pointerId)) return;
    const D = S * HOLE, old = pts.get(e.pointerId);
    const nx = e.clientX, ny = e.clientY;
    if (pts.size === 1) { crop.ox += (nx - old.x) / D; crop.oy += (ny - old.y) / D; }
    else {
      const ids = [...pts.keys()], other = pts.get(ids.find(k => k !== e.pointerId));
      const d0 = Math.hypot(old.x - other.x, old.y - other.y), d1 = Math.hypot(nx - other.x, ny - other.y);
      if (d0 > 4) { const z0 = crop.z; crop.z = Math.min(5, Math.max(1, crop.z * (d1 / d0))); const k = crop.z / z0; crop.ox *= k; crop.oy *= k; }
      crop.ox += (nx - old.x) / 2 / D; crop.oy += (ny - old.y) / 2 / D;
    }
    pts.set(e.pointerId, { x: nx, y: ny });
    clamp(); relayout();
  });
  const up = e => { pts.delete(e.pointerId); };
  stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up); stage.addEventListener('lostpointercapture', up);
  stage.addEventListener('wheel', e => { if (!crop) return; e.preventDefault(); const z0 = crop.z; crop.z *= Math.exp(-e.deltaY * 0.002); clamp(); const k = crop.z / z0; crop.ox *= k; crop.oy *= k; clamp(); relayout(); }, { passive: false });
  zoom.addEventListener('input', () => { if (!crop) return; const z0 = crop.z; crop.z = +zoom.value; const k = crop.z / z0; crop.ox *= k; crop.oy *= k; clamp(); relayout(); });

  // ---- cắt đúng vùng đã chỉnh → ảnh vuông ≤ 11 500 ký tự ----
  const cropOut = () => {
    const [W, H] = dims(), m = Math.min(W, H);
    const big = document.createElement('canvas'); big.width = big.height = 384;
    const g = big.getContext('2d'); g.imageSmoothingQuality = 'high';
    g.fillStyle = '#fff'; g.fillRect(0, 0, 384, 384);
    g.translate(192 + crop.ox * 384, 192 + crop.oy * 384); g.rotate(crop.r * Math.PI / 180);
    const iw = (crop.w / m) * crop.z * 384, ih = (crop.h / m) * crop.z * 384;
    g.drawImage(crop.img, -iw / 2, -ih / 2, iw, ih);
    for (const [n, q] of [[128, .82], [112, .72], [96, .62], [80, .55]]) {
      const c = document.createElement('canvas'); c.width = c.height = n;
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(big, 0, 0, n, n);
      let d = c.toDataURL('image/webp', q);
      if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', q);
      if (d.length <= 11500) return d;
    }
    throw new Error('Ảnh quá chi tiết, chọn ảnh khác.');
  };

  B.addEventListener('click', async e => {
    const av = e.target.closest('[data-av]')?.dataset.av;
    if (av) { if (crop?.url?.startsWith('blob:')) URL.revokeObjectURL(crop.url); crop = null; cur.av = av; draw(); return; }
    const fr = e.target.closest('[data-fr]')?.dataset.fr;
    if (fr) { cur.frame = fr; draw(); return; }
    const a = e.target.closest('[data-ae]')?.dataset.ae;
    if (a === 'up') B.querySelector('[data-in=img]').click();
    if (a === 'rot' && crop) { crop.r = (crop.r + 90) % 360; clamp(); relayout(); }
    if (a === 'fit' && crop) { crop.z = 1; crop.ox = crop.oy = 0; relayout(); }
    if (a === 'cancel') s.close();
    if (a === 'save') {
      const b = e.target.closest('button'); b.disabled = true;
      try {
        const out = crop ? cropOut() : cur.av;
        await saveProfile({ av: out, frame: cur.frame });
        toast('Đã lưu ảnh đại diện.');
        dispatchEvent(new CustomEvent('tn-avatar'));
        s.close();
      } catch (er) { toast(er.message || 'Chưa lưu được — thử lại.'); b.disabled = false; }
    }
  });
  B.querySelector('[data-in=img]').onchange = async e => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try { await startCrop(URL.createObjectURL(f)); } catch (er) { toast(er.message); }
  };
  return s;
}
