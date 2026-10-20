// v40: lõi hiệu ứng nền (tính chuyển động + vẽ hạt, sao, mưa, pháo hoa…), tách khỏi season.js để chạy được ở LUỒNG RIÊNG
// (Web Worker + OffscreenCanvas): trang dựng nặng cỡ nào nền vẫn trôi, luồng chính rảnh hơn cho trang.
// Không dùng gì của trang (document, window): mọi thông tin (cài đặt, tháng, ngày – đêm, mưa, cỡ màn hình) do season.js gửi sang.
// Máy / trình duyệt không chạy được ở luồng riêng thì season.js dùng chính lõi này trên luồng chính như trước.

// ---------- màu ----------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgba = (h, al) => `rgba(${hex(h).join(',')},${al})`;

// ---------- hình các loại hạt (vẽ trong ô 20×20, tâm ở giữa) ----------
const P2 = d => new Path2D(d);
const SHAPE = {
  petal: P2('M0 10C-7 4-9-4-5-9c2-3 4-2 5 1 1-3 3-4 5-1 4 5 2 13-5 19z'),
  round: P2('M0-7a7 7 0 1 1 0 14a7 7 0 1 1 0-14z'),
  oval: P2('M0-9C5-6 6 3 0 9C-6 3-5-6 0-9z'),
  flower4: (() => { const p = new Path2D(); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; p.ellipse(Math.cos(a) * 4, Math.sin(a) * 4, 4, 3, a, 0, Math.PI * 2); } return p; })(),
  flower5: (() => { const p = new Path2D(); for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 - Math.PI / 2; p.ellipse(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 4.2, 3.2, a, 0, Math.PI * 2); } return p; })(),
  leaf: P2('M0-10C6-5 6 5 0 10C-6 5-6-5 0-10z'),
  maple: P2('M0-11l2 6 5-2-2 5 6 1-5 3 2 5-6-2-1 6h-1l-1-6-6 2 2-5-5-3 6-1-2-5 5 2z'),
  ginkgo: P2('M0 10V2C-3 1-9-2-9-7c3-3 6-4 9-4s6 1 9 4c0 5-6 8-9 9'),
  star4: P2('M0-8L2-2 8 0 2 2 0 8-2 2-8 0-2-2z'),
  strip: P2('M-3-8h6v16h-6z'),
  dot: P2('M0-5a5 5 0 1 1 0 10a5 5 0 1 1 0-10z'),
  flake: (() => { const p = new Path2D(); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3; const c = Math.cos(a), s = Math.sin(a); p.moveTo(-9 * c, -9 * s); p.lineTo(9 * c, 9 * s); } return p; })(),
  star5: (() => { const p = new Path2D(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 4 : 10, a = i * Math.PI / 5 - Math.PI / 2; i ? p.lineTo(Math.cos(a) * r, Math.sin(a) * r) : p.moveTo(Math.cos(a) * r, Math.sin(a) * r); } p.closePath(); return p; })(),
};
// loại hạt: hình, màu (nền tối / nền sáng), cỡ, tốc độ rơi (px/giây), lắc, xoay, số lượng ở mức "Vừa", kiểu chuyển động
const KIND = {
  sakura: { s: 'petal', c: ['#F7B6CB', '#F29BB8', '#FCD3E0'], z: [9, 16], v: [28, 55], sw: 28, r: 140, n: 22 },
  plum: { s: 'round', c: ['#FFFFFF', '#F7C6D6', '#F29BB8'], lc: ['#F29BB8', '#E58FB0', '#F7C6D6'], z: [6, 10], v: [25, 48], sw: 22, r: 90, n: 20 },
  peach: { s: 'oval', c: ['#F59AA8', '#F7B3BE', '#F08FA0'], z: [8, 13], v: [28, 52], sw: 26, r: 120, n: 16 },
  nanohana: { s: 'flower4', c: ['#F4D03F', '#F7DC6F'], lc: ['#E5B800', '#F4C430'], z: [6, 9], v: [22, 40], sw: 18, r: 60, n: 8 },
  leafGreen: { s: 'leaf', c: ['#7CCB8A', '#9BD99F', '#5FB574'], z: [8, 14], v: [26, 50], sw: 30, r: 120, n: 12 },
  wisteria: { s: 'oval', c: ['#B39DDB', '#9575CD', '#CE93D8'], z: [5, 9], v: [24, 44], sw: 20, r: 80, n: 10 },
  hydrangea: { s: 'flower4', c: ['#8FA6F5', '#B39DDB', '#90CAF9'], z: [7, 11], v: [22, 40], sw: 20, r: 60, n: 12 },
  stardust: { s: 'star4', c: ['#FFF6C8', '#BFD9FF', '#FFE08A'], lc: ['#C9A227', '#6F8FD0', '#D9A21B'], z: [3, 6], v: [-18, -8], sw: 14, r: 40, n: 24, tw: 1 },
  sunflower: { s: 'oval', c: ['#F7C948', '#F4B400'], z: [8, 13], v: [26, 48], sw: 24, r: 110, n: 12 },
  cosmos: { s: 'oval', c: ['#F7A1C4', '#FFFFFF', '#E57BB0'], lc: ['#F7A1C4', '#E57BB0', '#D46A9F'], z: [8, 13], v: [26, 50], sw: 26, r: 120, n: 14 },
  dragonfly: { s: 'dragonfly', c: ['#E2553F', '#D84A33'], z: [16, 22], v: [0, 0], sw: 0, r: 0, n: 4, fly: 1 },
  ginkgo: { s: 'ginkgo', c: ['#F2C14E', '#E9B53A', '#F7D774'], lc: ['#E0A800', '#D4A017', '#EBC13F'], z: [12, 19], v: [30, 58], sw: 34, r: 150, n: 16, fill: 1 },
  maple: { s: 'maple', c: ['#E8622C', '#F08A4B', '#D9A23A', '#B8401F'], z: [12, 21], v: [30, 58], sw: 36, r: 170, n: 15 },
  snow: { s: 'dot', c: ['#FFFFFF', '#EAF4FF', '#DCEBFB'], lc: ['#9FB8D3', '#B8CCE0', '#8EA9C6'], z: [2.5, 6], v: [22, 48], sw: 18, r: 0, n: 46, flakes: 0.12 },
  snowL: { s: 'dot', c: ['#FFFFFF', '#EAF4FF'], lc: ['#9FB8D3', '#B8CCE0'], z: [2, 5], v: [20, 40], sw: 16, r: 0, n: 20 },
  gold: { s: 'star4', c: ['#F0C060', '#FFD98A'], lc: ['#C9961E', '#D9A621'], z: [3, 5], v: [10, 22], sw: 10, r: 30, n: 10, tw: 1 },
  maiVang: { s: 'flower5', c: ['#F7C531', '#FFD54F', '#F2B01E'], lc: ['#E8A800', '#F2B01E'], z: [8, 12], v: [26, 46], sw: 26, r: 90, n: 16 },
  dao: { s: 'petal', c: ['#F48FB1', '#F8BBD0', '#EC6F9E'], z: [8, 14], v: [26, 50], sw: 26, r: 130, n: 14 },
  bean: { s: 'round', c: ['#D9B27C', '#C89B5F'], z: [5, 7], v: [60, 90], sw: 6, r: 0, n: 6 },
  tanzaku: { s: 'strip', c: ['#E57373', '#64B5F6', '#81C784', '#FFD54F', '#BA68C8'], z: [9, 13], v: [24, 40], sw: 30, r: 140, n: 10 },
};

// ---------- trăng: tuổi trăng (ngày âm lịch xấp xỉ) ----------
export const SYN = 29.530588853;
export const moonAge = (t = Date.now()) => (((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % SYN + SYN) % SYN;

const Q = [{ dpr: 1.5, n: 1 }, { dpr: 1.25, n: 0.8 }, { dpr: 1, n: 0.6 }]; // mức chi tiết: 0 đầy đủ → 2 nhẹ nhất
export const KIND_FLY = k => !!KIND[k]?.fly;

// ---------- v42: chòm sao (toạ độ gần đúng trong ô 1×1) — đường nối nhấp nháy, có tên ----------
const CONS = {
  bacdau: { vi: 'Bắc Đẩu', jp: '北斗七星', s: [[0, .12], [.05, .38], [.31, .44], [.34, .2], [.53, .13], [.71, .08], [.94, .2]], l: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]] },
  thienhau: { vi: 'Thiên Hậu', jp: 'カシオペヤ座', s: [[0, .22], [.22, .6], [.46, .32], [.7, .64], [.94, .26]], l: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  lahan: { vi: 'Lạp Hộ', jp: 'オリオン座', s: [[.22, .1], [.76, .15], [.48, 0], [.38, .5], [.5, .53], [.62, .56], [.3, .95], [.8, .88]], l: [[2, 0], [2, 1], [0, 3], [1, 5], [3, 4], [4, 5], [3, 6], [5, 7]] },
  songtu: { vi: 'Song Tử', jp: 'ふたご座', s: [[.1, 0], [.32, .04], [.14, .33], [.2, .66], [.16, .98], [.38, .38], [.46, .7], [.56, .96]], l: [[0, 2], [2, 3], [3, 4], [1, 5], [5, 6], [6, 7], [0, 1], [2, 5]] },
  xunu: { vi: 'Xử Nữ', jp: 'おとめ座', s: [[.55, .96], [.45, .62], [.3, .46], [.08, .32], [.2, .05], [.5, .15], [.76, .5], [.96, .66]], l: [[0, 1], [1, 2], [2, 3], [2, 5], [5, 4], [1, 6], [6, 7]] },
  sutu: { vi: 'Sư Tử', jp: 'しし座', s: [[.2, .82], [.18, .52], [.26, .3], [.36, .14], [.47, .2], [.7, .55], [.96, .7], [.7, .82]], l: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [6, 7], [7, 0]] },
  thienyet: { vi: 'Thiên Yết', jp: 'さそり座', s: [[.06, .08], [.14, .2], [.1, .33], [.3, .36], [.4, .5], [.45, .66], [.52, .8], [.66, .93], [.81, .9], [.9, .78], [.86, .66]], l: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10]] },
  thienga: { vi: 'Thiên Nga', jp: 'はくちょう座', s: [[.5, 0], [.5, .4], [.5, 1], [.08, .34], [.92, .46]], l: [[0, 1], [1, 2], [3, 1], [1, 4]] },
  chucnu: { vi: 'Chức Nữ', jp: 'こと座', s: [[.3, 0], [.4, .3], [.7, .36], [.62, .82], [.32, .76]], l: [[0, 1], [0, 2], [1, 2], [2, 3], [3, 4], [4, 1]] },
  nguulang: { vi: 'Ngưu Lang', jp: 'わし座', s: [[.5, .5], [.4, .42], [.6, .58], [.08, .28], [.92, .82], [.55, 1], [.45, 0]], l: [[1, 0], [0, 2], [3, 0], [0, 4], [0, 5], [0, 6]] },
};
// mỗi mùa: các chòm dễ thấy (tháng → danh sách); Thất tịch luôn có Chức Nữ – Ngưu Lang hai bên dải ngân hà
const CONS_BY_MONTH = { 1: ['lahan', 'songtu', 'thienhau', 'bacdau'], 2: ['lahan', 'songtu', 'bacdau', 'sutu'], 3: ['sutu', 'bacdau', 'songtu', 'xunu'],
  4: ['sutu', 'xunu', 'bacdau'], 5: ['xunu', 'bacdau', 'sutu', 'thienyet'], 6: ['thienyet', 'chucnu', 'nguulang', 'bacdau'], 7: ['chucnu', 'nguulang', 'thienga', 'thienyet'],
  8: ['thienga', 'chucnu', 'nguulang', 'thienyet'], 9: ['thienga', 'nguulang', 'thienhau', 'bacdau'], 10: ['thienhau', 'thienga', 'bacdau', 'chucnu'],
  11: ['thienhau', 'lahan', 'bacdau', 'thienga'], 12: ['lahan', 'songtu', 'thienhau', 'bacdau'] };
const METEOR_COL = ['255,255,255', '160,230,255', '255,214,165', '255,175,190', '200,255,190', '214,196,255'];
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

/** Tạo một bộ máy vẽ. makeCanvas(w, h): tạo khung vẽ phụ (ảnh hạt); raf: requestAnimationFrame của luồng đang chạy;
 *  onStats({fps, q}): báo số khung/giây và mức chi tiết mỗi giây. */
export function createFx({ makeCanvas, raf, onStats }) {
  let S = {}, cv = null, ctx = null;
  // on, dark, month, phase, hol, rain, snowW, thunder, shower, wind, kinds, want (có nên chạy), hz (tần số màn hình), w, h, dpr0 (do trang gửi)
  const st = { on: false, dark: true, month: 10, hol: [], phase: 'day', rain: 0, snowW: false, thunder: false, shower: '', wind: 0, kinds: [], want: false, hz: 60,
    gust: 0, gustT: 0, w: 0, h: 0, dpr0: 1, dpr: 1, run: false, last: 0, prev: 0, acc: 0, fc: 0, fT: 0, fps: 0, work: 0, slow: 0, q: 0 };
const fx = { parts: [], stars: [], cons: [], clouds: [], meteors: [], planes: [], holes: [], fw: [], sparks: [], flies: [], lanterns: [], drops: [], bursts: [], flash: 0, bolt: null, koi: [] };
const timers = {};
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
  const dens = () => (({ low: 0.5, mid: 1, high: 1.8 })[S.fxDensity] || 1) * Q[st.q].n;
  const spd = () => ({ slow: 0.55, mid: 1, fast: 1.6 })[S.fxSpeed] || 1;
  const night = () => st.phase === 'night' || (!S.fxDayNight && st.dark);
  const fpsCap = () => { const c = +S.fxFps || 0; return c && c < st.hz - 2 ? c : 0; };

function newPart(kind, init) {
  const k = KIND[kind], d = rnd(0.55, 1), cols = !st.dark && k.lc ? k.lc : k.c;
  const p = { kind, k, d, size: rnd(...k.z) * (0.7 + 0.3 * d), col: pick(cols), ph: rnd(0, 6.3), sw: k.sw * rnd(0.5, 1), rot: rnd(0, 6.3), vr: (k.r * Math.PI / 180) * rnd(-1, 1), a: rnd(0.55, 0.95) * (0.55 + 0.45 * d), flake: k.flakes && Math.random() < k.flakes };
  if (k.fly) { p.y = rnd(0.15, 0.8) * st.h; p.dir = Math.random() < 0.5 ? 1 : -1; p.x = init ? rnd(0, st.w) : (p.dir > 0 ? -30 : st.w + 30); p.vx = rnd(30, 60) * p.dir; p.t = 0; return p; }
  p.vy = rnd(...k.v) * (0.6 + 0.4 * d);
  p.x = rnd(-20, st.w + 20);
  p.y = init ? rnd(-20, st.h) : (p.vy < 0 ? st.h + 20 : -20);
  return p;
}
// v43: chỉ gieo lại khi thứ quyết định hạt thay đổi (loại hạt, mật độ, mức chi tiết, màu nền). Đổi cỡ khung (thanh địa chỉ
// điện thoại co giãn khi cuộn, xoay máy…), quay lại app, lưu cài đặt khác → giữ nguyên hạt, chỉ co giãn vị trí theo khung mới.
let partKey = '', skyKey = '';
function seedParts() {
  if (!st.w || !st.h) return;
  const key = [st.kinds.join(','), !!S.fxFall, S.fxDensity, st.q, st.w < 500, st.dark].join('|');
  if (key === partKey && st.partW) {
    if (st.partW !== st.w || st.partH !== st.h) { for (const p of fx.parts) { p.x *= st.w / st.partW; p.y *= st.h / st.partH; } st.partW = st.w; st.partH = st.h; }
    return;
  }
  partKey = key; st.partW = st.w; st.partH = st.h;
  fx.parts = [];
  if (!S.fxFall) return;
  for (const kind of st.kinds) { const n = Math.round(KIND[kind].n * dens() * (st.w < 500 ? 0.75 : 1)); for (let i = 0; i < n; i++) fx.parts.push(newPart(kind, true)); }
}
function seedSky() {
  if (!st.w || !st.h) return;
  const m = st.month, milky = st.hol.some(h => h.milky), ff = !!(S.fxFireflies && night() && m >= 6 && m <= 8);
  const key = [m, S.fxConst !== false, milky, st.rain, S.fxDensity, st.q, st.w < 500, ff].join('|');
  if (key === skyKey && st.skyW) { if (st.skyW !== st.w || st.skyH !== st.h) layoutSky(); return; }
  skyKey = key;
  const W = st.w, H = st.h;
  // sao lưu theo tỉ lệ khung (xf, yf) để đổi cỡ khung không phải gieo lại
  const n = Math.round(90 * dens() * (W < 500 ? 0.6 : 1));
  fx.stars = Array.from({ length: n }, () => ({ xf: rnd(0, 1), yf: rnd(0, 0.65) * rnd(0.3, 1), r: rnd(0.4, 1.4), tw: rnd(0.6, 2.2), ph: rnd(0, 6.3) }));
  if (milky) for (let i = 0; i < 160; i++) { const t = Math.random(); fx.stars.push({ xf: t + rnd(-40, 40) / W, yf: 0.05 + t * 0.4 + rnd(-40, 40) / H, r: rnd(0.3, 0.9), tw: rnd(1, 3), ph: rnd(0, 6.3), milky: 1 }); }
  // v42: 3 chòm sao theo mùa, đặt ở 3 vùng trời không chồng nhau
  fx.cons = [];
  if (S.fxConst !== false) {
    let names = [...(CONS_BY_MONTH[m] || CONS_BY_MONTH[1])];
    if (milky) names = ['chucnu', 'nguulang', ...names.filter(x => x !== 'chucnu' && x !== 'nguulang')];
    else names = names.sort(() => Math.random() - 0.5);
    // chừa góc phải trên cho mặt trăng; điện thoại 3 chòm, màn rộng 4 chòm
    const slots = W < 500 ? [[0.05, 0.1], [0.55, 0.24], [0.12, 0.42]] : [[0.05, 0.09], [0.4, 0.06], [0.62, 0.3], [0.2, 0.38]];
    fx.cons = names.slice(0, W < 500 ? 3 : 4).map((nm, i) => {
      const c = CONS[nm], [fx0, fy0] = slots[i];
      return { n: nm, c, fx: fx0 + rnd(-0.03, 0.03), fy: fy0 + rnd(-0.02, 0.03), rot: rnd(-0.3, 0.3), km: rnd(0.85, 1.1), sp: c.s.map(() => ({ r: rnd(1.3, 2.3), ph: rnd(0, 6.3) })), ph: rnd(0, 6.3), lab: `${c.vi} · ${c.jp}`, tw: 0 };
    });
  }
  fx.clouds = Array.from({ length: W < 500 ? 2 : 4 }, () => ({ x: rnd(0, W), y: 80 + rnd(0, 0.25) * H, s: rnd(40, 80), v: rnd(5, 12), blobs: Array.from({ length: 5 }, () => [rnd(-1.2, 1.2), rnd(-0.35, 0.25), rnd(0.45, 0.8)]) }));
  fx.flies = [];
  if (ff) fx.flies = Array.from({ length: Math.round(14 * dens()) }, () => ({ x: rnd(0, W), y: rnd(0.35, 0.95) * H, vx: rnd(-12, 12), vy: rnd(-8, 8), ph: rnd(0, 6.3), bl: rnd(1.5, 3.5) }));
  fx.drops = [];
  if (st.rain) for (let i = 0; i < Math.round((st.rain === 2 ? 150 : 70) * dens() * (W < 500 ? 0.6 : 1)); i++) fx.drops.push({ x: rnd(-50, W + 50), y: rnd(-H, H), v: rnd(600, 900), l: rnd(10, 18) });
  st.skyW = 0;
  layoutSky();
}
// đặt sao, chòm sao theo cỡ khung hiện tại (không ngẫu nhiên); mây, đom đóm, mưa co giãn theo khung mới
function layoutSky() {
  const W = st.w, H = st.h, ow = st.skyW || W, oh = st.skyH || H;
  // chỉ chiều cao đổi ít (thanh địa chỉ của trình duyệt điện thoại hiện / ẩn khi cuộn) → giữ nguyên chỗ, không xê dịch bầu trời
  if (st.skyW === W && st.skyH && Math.abs(H - oh) / oh < 0.2) return;
  for (const s of fx.stars) { s.x = s.xf * W; s.y = s.yf * H; }
  const sz = Math.min(W * 0.34, H * 0.22, 230);
  for (const k of fx.cons) {
    const cs = Math.cos(k.rot), sn = Math.sin(k.rot), kk = sz * k.km, ox = k.fx * W, oy = k.fy * H;
    k.stars = k.c.s.map(([x, y], i) => { const X = (x - 0.5) * kk, Y = (y - 0.5) * kk; return { x: ox + kk / 2 + X * cs - Y * sn, y: oy + kk / 2 + X * sn + Y * cs, r: k.sp[i].r, ph: k.sp[i].ph }; });
    let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of k.stars) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
    k.cx = (x0 + x1) / 2; k.bot = y1;
  }
  if (ow !== W || oh !== H) {
    for (const c of fx.clouds) { c.x *= W / ow; c.y *= H / oh; }
    for (const f of fx.flies) { f.x *= W / ow; f.y *= H / oh; }
    for (const d of fx.drops) d.x *= W / ow;
  }
  st.skyW = W; st.skyH = H;
}

// ---------- sự kiện ngẫu nhiên ----------
function every(name, a, b, f, first) {
  clearTimeout(timers[name]);
  const go = () => { if (st.run) f(); timers[name] = setTimeout(go, rnd(a, b) * 1000); };
  timers[name] = setTimeout(go, (first ?? rnd(a, b)) * 1000);
}
function meteor() {
  // v42: nhiều màu, đậm nhạt khác nhau, hướng rơi đổi chút
  const left = Math.random() < 0.3, x = (left ? rnd(-0.05, 0.6) : rnd(0.3, 1.05)) * st.w, y = rnd(-0.02, 0.35) * st.h;
  const ang = left ? rnd(0.4, 0.75) : rnd(2.4, 2.75), v = rnd(600, 1000);
  fx.meteors.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 0, max: rnd(0.55, 1.1), len: rnd(80, 190), col: Math.random() < 0.45 ? '255,255,255' : pick(METEOR_COL), w: rnd(1.2, 2.8) });
}
function plane() {
  // v42: to nhỏ khác nhau (máy bay gần thì to, bay nhanh), bay ngang, dọc hoặc chéo
  const s = Math.random() < 0.25 ? rnd(1.6, 2.5) : rnd(0.55, 1.3), m = Math.random();
  const ang = m < 0.45 ? (Math.random() < 0.5 ? 0 : Math.PI) + rnd(-0.16, 0.16) : m < 0.72 ? (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) + rnd(-0.22, 0.22) : rnd(0, Math.PI * 2);
  const v = rnd(38, 70) * (0.75 + 0.3 * s), R = Math.hypot(st.w, st.h) / 2 + 60, cx = st.w / 2, cy = st.h * 0.42, off = rnd(-0.38, 0.38) * Math.min(st.w, st.h);
  const x = cx - Math.cos(ang) * R - Math.sin(ang) * off, y = cy - Math.sin(ang) * R + Math.cos(ang) * off;
  fx.planes.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, s, trail: [], tt: 0, life: 0, R });
}
function blackHole() {
  if (fx.holes.length) return;
  fx.holes.push({ x: rnd(0.2, 0.8) * st.w, y: rnd(0.12, 0.4) * st.h, t: 0, life: 26, r: Math.min(30, st.w * 0.06), spin: 0 });
}
function firework(x) {
  const hue = pick([[255, 90, 90], [255, 200, 80], [120, 200, 255], [180, 120, 255], [120, 255, 160], [255, 140, 220]]);
  fx.fw.push({ x: x ?? rnd(0.15, 0.85) * st.w, y: st.h + 10, vy: -rnd(380, 480), ty: rnd(0.1, 0.35) * st.h, hue });
}
function gust() { st.gust = rnd(60, 120) * (Math.random() < 0.5 ? -1 : 1); st.gustT = rnd(2, 4); }
function lightning() {
  fx.flash = 1;
  const x = rnd(0.15, 0.85) * st.w, pts = [[x, 0]];
  let y = 0, cx = x;
  while (y < st.h * 0.35) { y += rnd(14, 30); cx += rnd(-22, 22); pts.push([cx, y]); }
  fx.bolt = { pts, life: 0.25 };
}
function koiFly() { const dir = Math.random() < 0.5 ? 1 : -1; fx.koi.push({ x: dir > 0 ? -90 : st.w + 90, y: 80 + rnd(0, 0.22) * st.h, vx: dir * rnd(50, 75), t: 0 }); }
function lantern(kind) { fx.lanterns.push({ kind, x: rnd(0.05, 0.95) * st.w, y: st.h + 20, vy: -rnd(12, 26), sw: rnd(8, 20), ph: rnd(0, 6.3), s: rnd(8, 17) * (kind === 'sky' ? rnd(0.7, 1.15) : 1), col: kind === 'star' ? pick(['#FF5252', '#FFD740', '#FF9100', '#FF6EC7', '#7CFFCB']) : kind === 'sky' ? pick(['#FFB74D', '#FFCC80', '#FF8A65', '#FFE082']) : pick(['#FFB74D', '#FF8A65', '#FFD54F']) }); }
function schedule() {
  Object.keys(timers).forEach(k => clearTimeout(timers[k]));
  if (!st.on) return;
  const shower = st.shower;
  // v42: sao băng dày hơn (đêm thường vài giây một vệt, mưa sao băng liên tục), đôi khi hai vệt liền
  if (S.fxMeteor) every('meteor', shower ? 0.5 : 3.5, shower ? 1.8 : 11, () => { if (night()) { meteor(); if (Math.random() < 0.25) setTimeout(meteor, rnd(150, 700)); } }, shower ? 1 : 3);
  if (S.fxPlane) every('plane', 12, 32, () => { plane(); if (Math.random() < 0.2) setTimeout(plane, rnd(1500, 5000)); }, rnd(4, 12));
  if (S.fxBlackhole) every('hole', 180, 420, blackHole, rnd(60, 120));
  if (S.fxWind) every('gust', 20, 50, gust);
  const fwOn = () => S.fxFireworks && ((st.month === 8 && night()) || st.hol.some(h => h.fw));
  every('fw', 3, 10, () => { if (fwOn()) firework(); }, 2);
  if (st.rain === 2 && S.fxLightning) every('bolt', 12, 35, lightning);
  if (st.hol.some(h => h.koi)) every('koi', 25, 60, koiFly, 6);
  const lan = st.hol.find(h => h.lantern);
  if (lan && S.fxLanterns) every('lantern', 0.45, 1.3, () => { if (lan.lantern === 'star' || night()) lantern(lan.lantern); }, 1);
  // v42: đêm thường cũng có đèn trời (khổng minh) bay lên thưa thưa
  else if (S.fxLanterns) every('skylan', 5, 14, () => { if (night()) { lantern('sky'); if (Math.random() < 0.3) setTimeout(() => lantern('sky'), rnd(400, 1500)); } }, 4);
}

// ---------- vẽ ----------
function drawPart(p) {
  if (p.k.fly) { // chuồn chuồn
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.dir > 0 ? 0 : Math.PI); ctx.globalAlpha = p.a;
    ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-p.size * 0.5, 0); ctx.lineTo(p.size * 0.5, 0); ctx.stroke();
    const fl = Math.sin(p.t * 40) * 0.25 + 0.75;
    ctx.fillStyle = st.dark ? 'rgba(220,235,255,.35)' : 'rgba(90,110,140,.25)';
    for (const sx of [0.12, -0.05]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.ellipse(p.size * sx, sy * p.size * 0.26 * fl, p.size * 0.32, p.size * 0.1, sy * 0.25, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  let a = p.a;
  if (p.k.tw) a *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph * 3));
  if (a <= 0.01) return;
  const s = p.size * (p._s ?? 1) / 20 * st.dpr, c = Math.cos(p.rot) * s, n = Math.sin(p.rot) * s;
  ctx.setTransform(c, n, -n, c, p.x * st.dpr, p.y * st.dpr);
  ctx.globalAlpha = a;
  ctx.drawImage(sprite(p), -SPR_B / 2, -SPR_B / 2, SPR_B, SPR_B);
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); ctx.globalAlpha = 1;
}
// v37: mỗi kiểu hạt (hình + màu) vẽ sẵn một lần ra ảnh nhỏ; mỗi khung chỉ việc đặt ảnh (nhanh hơn tô hình từng hạt)
const SPR = new Map(), SPR_B = 26, SPR_U = 3;
function sprite(p) {
  const key = (p.flake ? 'flake' : p.k.s) + '|' + p.col + (p.k.fill === 1 ? '|1' : '');
  let c = SPR.get(key);
  if (c) return c;
  c = makeCanvas(SPR_B * SPR_U, SPR_B * SPR_U);
  const g = c.getContext('2d');
  g.setTransform(SPR_U, 0, 0, SPR_U, SPR_B * SPR_U / 2, SPR_B * SPR_U / 2);
  if (p.flake) { g.strokeStyle = p.col; g.lineWidth = 2; g.lineCap = 'round'; g.stroke(SHAPE.flake); }
  else if (p.k.fill === 1 && p.k.s === 'ginkgo') { g.fillStyle = p.col; g.fill(SHAPE.ginkgo); g.strokeStyle = 'rgba(0,0,0,.15)'; g.stroke(SHAPE.ginkgo); }
  else { g.fillStyle = p.col; g.fill(SHAPE[p.k.s] || SHAPE.dot); }
  SPR.set(key, c);
  return c;
}
// v40: quầng sáng tròn (mây, đom đóm, đèn lồng) vẽ sẵn một lần ra ảnh; trước đây mỗi khung tạo lại dải màu cho từng đốm
const GLOW = new Map();
function glow(c0, c1) {
  const key = c0 + '|' + c1;
  let c = GLOW.get(key);
  if (c) return c;
  c = makeCanvas(64, 64);
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, `rgba(${c0},1)`); gr.addColorStop(1, `rgba(${c1},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  GLOW.set(key, c);
  return c;
}
const glowAt = (img, x, y, r, a) => { ctx.globalAlpha = a; ctx.drawImage(img, x - r, y - r, r * 2, r * 2); };
// v42: dải ngân hà — vẽ sẵn một lần ra ảnh (lõi sáng, mây sao hồng, tím, xanh, vệt bụi tối, hàng nghìn sao nhỏ), mỗi khung chỉ xoay ảnh:
// dải vắt ngang rồi dần dọc, chéo… (một vòng khoảng 25 phút), sáng tối nhè nhẹ
let MW = null, mwKey = '';
function milkyTex() {
  const key = `${st.dark}|${Math.round(st.w / 50)}|${Math.round(st.h / 50)}|${st.q}`;
  if (MW && mwKey === key) return MW;
  const L = Math.ceil(Math.hypot(st.w, st.h) * 1.25), H = Math.ceil(Math.min(st.w, st.h) * 0.5), sc = st.q ? 0.6 : 0.85;
  const c = makeCanvas(Math.ceil(L * sc), Math.ceil(H * sc)), g = c.getContext('2d');
  g.scale(sc, sc);
  const lg = g.createLinearGradient(0, 0, 0, H);
  lg.addColorStop(0, 'rgba(170,180,255,0)'); lg.addColorStop(0.3, 'rgba(160,170,255,.1)'); lg.addColorStop(0.5, 'rgba(240,232,255,.34)'); lg.addColorStop(0.7, 'rgba(160,170,255,.1)'); lg.addColorStop(1, 'rgba(170,180,255,0)');
  g.fillStyle = lg; g.fillRect(0, 0, L, H);
  const cols = ['255,140,200', '175,125,255', '120,205,255', '255,205,150', '140,255,220'];
  for (let i = 0; i < 34; i++) {
    const x = rnd(0, L), y = H / 2 + gauss() * H * 0.12, r = rnd(H * 0.1, H * 0.32), c0 = pick(cols), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, `rgba(${c0},${rnd(0.07, 0.18)})`); gr.addColorStop(1, `rgba(${c0},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 22; i++) {
    const x = rnd(0, L), y = H / 2 + H * 0.03 + gauss() * H * 0.04, r = rnd(H * 0.04, H * 0.12), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  g.globalCompositeOperation = 'source-over';
  const n = Math.round(L * H / (st.q ? 1400 : 900));
  for (let i = 0; i < n; i++) {
    const x = rnd(0, L), y = H / 2 + gauss() * H * 0.17, big = Math.random() < 0.06, r = big ? rnd(0.9, 1.6) : rnd(0.35, 0.8);
    g.globalAlpha = rnd(0.25, 0.95); g.fillStyle = big ? pick(['#FFFFFF', '#DDE6FF', '#FFE9D6']) : '#FFFFFF';
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  MW = { c, L, H }; mwKey = key;
  return MW;
}
function drawMilky(t) {
  const m = milkyTex();
  if (st.mw0 == null) st.mw0 = rnd(0, Math.PI);
  const a = st.mw0 + t * 0.0042, al = (st.dark ? 0.85 : 0.35) * (0.86 + 0.14 * Math.sin(t * 0.21));
  ctx.save(); ctx.translate(st.w / 2, st.h * 0.4); ctx.rotate(a); ctx.globalAlpha = al;
  ctx.drawImage(m.c, -m.L / 2, -m.H / 2, m.L, m.H);
  ctx.restore();
}
// chòm sao: sao lấp lánh, đường nối sáng lên tắt xuống, đốm sáng chạy dọc đường nối, tên chòm mờ mờ; cả chòm trôi nhẹ
function drawCons(t) {
  const lineC = st.dark ? '170,200,255' : '70,90,150', starImg = glow('220,232,255', '150,180,255');
  ctx.font = '600 11px system-ui, sans-serif'; ctx.textBaseline = 'top';
  fx.cons.forEach((k, i) => {
    const dx = Math.sin(t / 95 + i * 2) * 10, dy = Math.cos(t / 120 + i) * 6;
    ctx.lineWidth = 1; ctx.lineCap = 'round';
    k.c.l.forEach(([a, b], j) => {
      const A = k.stars[a], B = k.stars[b], al = 0.08 + 0.26 * (0.5 + 0.5 * Math.sin(t * 0.9 + k.ph + j * 0.8));
      ctx.strokeStyle = `rgba(${lineC},${al})`; ctx.beginPath(); ctx.moveTo(A.x + dx, A.y + dy); ctx.lineTo(B.x + dx, B.y + dy); ctx.stroke();
      const f = (t * 0.22 + j * 0.37 + k.ph) % 1;
      glowAt(starImg, A.x + (B.x - A.x) * f + dx, A.y + (B.y - A.y) * f + dy, 4, 0.55 * Math.sin(Math.PI * f));
    });
    for (const sp of k.stars) {
      const tw = 0.7 + 0.3 * Math.sin(t * 2.2 + sp.ph);
      glowAt(starImg, sp.x + dx, sp.y + dy, sp.r * 4.2 * tw, 0.55 * tw);
      ctx.globalAlpha = 0.95; ctx.fillStyle = st.dark ? '#FFFFFF' : '#4A5C8A'; ctx.beginPath(); ctx.arc(sp.x + dx, sp.y + dy, sp.r * 0.75, 0, Math.PI * 2); ctx.fill();
    }
    // tên chòm dưới chòm sao, không tràn khỏi màn hình
    // v43: bề rộng chữ, vị trí tên tính một lần (trước đây đo chữ, dựng mảng mỗi khung → rác bộ nhớ, thỉnh thoảng khựng khi dọn rác)
    if (!k.tw) k.tw = ctx.measureText(k.lab).width;
    const lx = Math.max(6, Math.min(st.w - k.tw - 6, k.cx - k.tw / 2 + dx));
    ctx.globalAlpha = 0.42 + 0.14 * Math.sin(t * 0.5 + i); ctx.fillStyle = st.dark ? '#CFE0FF' : '#3E4E78';
    ctx.fillText(k.lab, lx, k.bot + dy + 8);
  });
  ctx.globalAlpha = 1;
}
let moonG = null, moonKey = '';
function drawMoon(big) {
  const age = moonAge(), k = age / SYN, f = (1 - Math.cos(2 * Math.PI * k)) / 2;
  const r = big ? 36 : 22, x = st.w - (big ? 84 : 60), y = big ? 124 : 104;
  ctx.save();
  const mk = `${x},${y},${r},${st.dark}`;
  if (mk !== moonKey) { moonKey = mk; moonG = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2); moonG.addColorStop(0, st.dark ? 'rgba(255,240,200,.18)' : 'rgba(255,230,170,.35)'); moonG.addColorStop(1, 'rgba(255,240,200,0)'); }
  ctx.fillStyle = moonG; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = st.dark ? '#FFF3CF' : '#F7E3A6'; ctx.fill();
  ctx.clip();
  ctx.fillStyle = st.dark ? 'rgba(13,22,28,.93)' : 'rgba(120,130,160,.55)';
  const off = 2 * r * f * (k < 0.5 ? -1 : 1);
  if (f < 0.98) { ctx.beginPath(); ctx.arc(x + off, y, r * 1.02, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawPlane(pl, dt) {
  // v42: bay theo mọi hướng, to nhỏ khác nhau; vệt khói hai bên động cơ; đèn nháy ban đêm
  pl.x += pl.vx * dt; pl.y += pl.vy * dt; pl.tt += dt; pl.life += dt;
  const ang = Math.atan2(pl.vy, pl.vx), c = Math.cos(ang), n = Math.sin(ang), s = (pl.s || 1) * (pl._s ?? 1);
  if (pl.tt > 0.07 && !pl.dead) { pl.tt = 0; pl.trail.push({ x: pl.x - c * 9 * s, y: pl.y - n * 9 * s, a: 1 }); }
  for (const t of pl.trail) t.a -= dt / (night() ? 3 : 7);
  pl.trail = pl.trail.filter(t => t.a > 0);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < pl.trail.length; i++) {
    const a = pl.trail[i - 1], b = pl.trail[i];
    ctx.strokeStyle = night() ? `rgba(200,210,230,${a.a * 0.18})` : `rgba(255,255,255,${a.a * (st.dark ? 0.35 : 0.85)})`;
    ctx.lineWidth = (1 + (1 - a.a) * 6) * Math.min(1.6, s); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  if (!pl.dead) {
    ctx.translate(pl.x, pl.y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.fillStyle = night() ? 'rgba(40,50,60,.9)' : (st.dark ? 'rgba(210,220,235,.85)' : 'rgba(70,85,105,.75)');
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-8, -1.4); ctx.lineTo(-8, 1.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-3, -7); ctx.lineTo(-5, -7); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-9, -3.5); ctx.lineTo(-10, -3.5); ctx.lineTo(-8.5, 0); ctx.closePath(); ctx.fill();
    if (night()) {
      const on = Math.sin(performance.now() / 160 + (pl.ph || 0)) > 0.6;
      if (on) { ctx.fillStyle = '#FF4A4A'; ctx.fillRect(-4.5, -7.5, 2, 2); ctx.fillStyle = '#4AFF8A'; ctx.fillRect(-4.5, 5.5, 2, 2); }
      if (Math.sin(performance.now() / 420 + (pl.ph || 0)) > 0.85) { ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-9.5, -0.8, 1.6, 1.6); }
    }
  }
  ctx.restore();
}
function drawHole(hb, dt) {
  hb.t += dt; hb.spin += dt * 1.6;
  const k = hb.t < 2.5 ? hb.t / 2.5 : hb.t > hb.life - 2.5 ? Math.max(0, (hb.life - hb.t) / 2.5) : 1, r = hb.r * (0.15 + 0.85 * k);
  ctx.save(); ctx.translate(hb.x, hb.y);
  const halo = ctx.createRadialGradient(0, 0, r * 0.8, 0, 0, r * 4);
  halo.addColorStop(0, `rgba(255,170,80,${0.32 * k})`); halo.addColorStop(0.4, `rgba(180,80,255,${0.12 * k})`); halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(0, 0, r * 4, 0, Math.PI * 2); ctx.fill();
  ctx.rotate(-0.35);
  for (let i = 0; i < 26; i++) { // đĩa bồi tụ quay
    const a0 = hb.spin + i * (Math.PI * 2 / 26);
    ctx.strokeStyle = `rgba(255,${150 + (i % 5) * 20},${70 + (i % 3) * 40},${(0.35 + 0.45 * Math.abs(Math.sin(a0))) * k})`;
    ctx.lineWidth = r * 0.22; ctx.beginPath(); ctx.ellipse(0, 0, r * 2.1, r * 0.55, 0, a0, a0 + 0.18); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,236,200,${0.85 * k})`; ctx.lineWidth = 1.6; ctx.stroke();
  if (hb.eat > 0) { ctx.beginPath(); ctx.arc(0, 0, r * (1.3 + 0.5 * (1 - hb.eat)), 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,220,170,${0.7 * hb.eat})`; ctx.lineWidth = 2.5; ctx.stroke(); hb.eat = Math.max(0, hb.eat - dt * 1.8); }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  return k;
}
function step(now) {
  if (!st.run) return;
  raf(step);
  // v37: vẽ theo tần số quét của màn hình (60 / 90 / 120 Hz…); chọn giới hạn thấp hơn thì bỏ bớt khung theo nhịp đều
  const cap = fpsCap();
  if (cap) {
    st.acc += now - st.prev; st.prev = now;
    const iv = 1000 / cap;
    if (st.acc < iv - 1) return;
    st.acc = Math.min(st.acc - iv, iv);
  } else st.prev = now;
  st.gap = Math.max(st.gap || 0, now - st.last); // khoảng cách lớn nhất giữa hai khung trong giây qua (khung bị nghẽn)
  const dt = Math.min(0.1, (now - st.last) / 1000) * spd();
  st.last = now;
  st.fc++; if (now - st.fT >= 1000) { st.fps = Math.round(st.fc * 1000 / (now - st.fT)); st.fc = 0; st.fT = now; }
  const w0 = performance.now();
  draw(now, dt);
  // máy không theo kịp (vẽ một khung tốn quá nửa thời gian cho phép) liên tục ~1,5 giây thì giảm độ nét và số hạt một bậc
  const work = performance.now() - w0, budget = 1000 / (cap || st.hz);
  st.work = st.work * 0.9 + work * 0.1;
  if (st.work > budget * 0.5) { if (++st.slow > (cap || st.hz) * 1.5 && st.q < Q.length - 1) { st.q++; st.slow = 0; st.work = 0; resize(); } } else st.slow = 0;
}
function draw(now, dt) {
  const W = st.w, H = st.h, t = now / 1000;
  // v37: hệ số giảm dần trước đây tính cho 30 khung/giây — đổi theo thời gian thật để 60 / 90 / 120 khung chuyển động y như nhau
  const rdt = dt / spd(), k = x => Math.pow(x, rdt * 30);
  const g96 = k(0.96), g985 = k(0.985), g98 = Math.pow(0.98, dt * 30);
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0); ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, W, H);
  // gió
  if (st.gustT > 0) st.gustT -= dt; else st.gust *= g96;
  const wind = (S.fxWind ? st.wind + st.gust : 0);
  // bầu trời
  if (S.fxMilky !== false && night()) drawMilky(t);
  if (S.fxStars && night()) {
    // v37: gom sao theo 8 bậc sáng, mỗi bậc tô một lần (đỡ hàng trăm lần tô mỗi khung)
    const B = 8, paths = Array.from({ length: B }, () => new Path2D());
    for (const s of fx.stars) { const a = (s.milky ? 0.45 : 0.35) + 0.5 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph)); const i = Math.min(B - 1, Math.max(0, Math.round((a - 0.35) / 0.6 * (B - 1)))); paths[i].moveTo(s.x + s.r, s.y); paths[i].arc(s.x, s.y, s.r, 0, Math.PI * 2); }
    ctx.fillStyle = st.dark ? '#E8F0FF' : '#5C6F86';
    for (let i = 0; i < B; i++) { ctx.globalAlpha = 0.35 + 0.6 * i / (B - 1); ctx.fill(paths[i]); }
    ctx.globalAlpha = 1;
    if (S.fxConst !== false && fx.cons.length) drawCons(t);
    drawMoon(st.hol.some(h => h.bigMoon));
  }
  if (S.fxClouds && !night() && S.fxDayNight) for (const c of fx.clouds) {
    c.x += (c.v + wind * 0.1) * dt; if (c.x - c.s * 2 > W) c.x = -c.s * 2; if (c.x + c.s * 2 < 0) c.x = W + c.s * 2;
    const img = glow('255,255,255', '255,255,255'), a = st.dark ? 0.07 : 0.55;
    for (const [bx, by, br] of c.blobs) glowAt(img, c.x + bx * c.s, c.y + by * c.s, br * c.s, a);
    ctx.globalAlpha = 1;
  }
  // sao băng
  for (const m of fx.meteors) {
    m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt;
    const a = Math.max(0, 1 - m.life / m.max), n = Math.hypot(m.vx, m.vy);
    const tx = m.x - m.vx / n * m.len, ty = m.y - m.vy / n * m.len;
    const col = m.col || '255,255,255', g = ctx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, `rgba(${col},${a})`); g.addColorStop(0.35, `rgba(${col},${a * 0.45})`); g.addColorStop(1, `rgba(${col},0)`);
    ctx.strokeStyle = g; ctx.lineWidth = m.w || 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
    glowAt(glow(col, col), m.x, m.y, 3 + (m.w || 2) * 2, a * 0.9); ctx.globalAlpha = 1;
  }
  fx.meteors = fx.meteors.filter(m => m.life < m.max && !m.dead);
  // máy bay, cá chép
  for (const pl of fx.planes) drawPlane(pl, dt);
  fx.planes = fx.planes.filter(p => (!p.dead && (p.life < 2 || Math.hypot(p.x - W / 2, p.y - H * 0.42) < (p.R || W) + 80)) || p.trail.length);
  for (const kf of fx.koi) {
    kf.x += kf.vx * dt; kf.t += dt;
    ctx.save(); ctx.translate(kf.x, kf.y); if (kf.vx < 0) ctx.scale(-1, 1);
    ['#2B2B2B', '#E53935', '#1E88E5'].forEach((c, i) => { const w = Math.sin(kf.t * 6 + i) * 3; ctx.fillStyle = c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(-i * 26, w, 13 - i * 2, 5 - i * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-i * 26 - 12, w); ctx.lineTo(-i * 26 - 20, w - 5); ctx.lineTo(-i * 26 - 20, w + 5); ctx.closePath(); ctx.fill(); });
    ctx.restore();
  }
  fx.koi = fx.koi.filter(k => k.x > -160 && k.x < W + 160 && !k.dead);
  // hố đen (v42): hút xoáy MỌI vật ở gần hoặc bay ngang qua — hạt rơi, sao băng, máy bay, đèn lồng, đom đóm, pháo hoa, cá chép…:
  // càng gần càng quay nhanh, nhỏ dần rồi biến mất ở chân trời sự kiện (vành sáng lóe lên)
  if (fx.holes.length) st.hadHole = true;
  else if (st.hadHole) { st.hadHole = false; for (const arr of [fx.parts, fx.meteors, fx.planes, fx.lanterns, fx.flies, fx.sparks, fx.bursts, fx.koi, fx.fw]) for (const o of arr) o._s = null; }
  for (const hb of fx.holes) {
    const k = drawHole(hb, dt), R = Math.max(240, Math.min(W, H) * 0.55) * (0.45 + 0.55 * k);
    const pull = (o, kill, damp) => {
      const dx = hb.x - o.x, dy = hb.y - o.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      if (d >= R || d === 0) { o._s = null; return; }
      const v = Math.min(1150, 5.5e5 * k / Math.max(d2, 300)), sw = 0.55 + 1.6 * (1 - d / R);
      o.x += ((dx / d) + (-dy / d) * sw) * v * dt; o.y += ((dy / d) + (dx / d) * sw) * v * dt;
      if (damp) { const f = Math.pow(0.9, dt * 30); if (o.vx != null) o.vx *= f; if (o.vy != null) o.vy *= f; }
      o._s = Math.max(0.12, Math.min(1, (d - hb.r * k) / (R * 0.45)));
      if (d < hb.r * 0.9 * k) { hb.eat = Math.min(1, (hb.eat || 0) + 0.3); kill(o); }
    };
    for (const p of fx.parts) pull(p, o => Object.assign(o, newPart(o.kind, false), { _s: null }), false);
    for (const arr of [fx.meteors, fx.planes, fx.lanterns, fx.flies, fx.sparks, fx.bursts, fx.koi, fx.fw]) for (const o of arr) if (!o.dead) pull(o, x => { x.dead = true; }, true);
  }
  fx.holes = fx.holes.filter(h => h.t < h.life);
  // pháo hoa
  for (const f of fx.fw) {
    f.y += f.vy * dt; f.vy += 140 * dt;
    ctx.fillStyle = `rgba(${f.hue.join(',')},.9)`; ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, Math.PI * 2); ctx.fill();
    if (f.y <= f.ty || f.vy >= -40) { f.done = 1; for (let i = 0; i < 56; i++) { const a = rnd(0, Math.PI * 2), v = rnd(60, 190); fx.sparks.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(1.2, 1.9), hue: f.hue }); } }
  }
  fx.fw = fx.fw.filter(f => !f.done && !f.dead);
  for (const s of fx.sparks) { s.life += dt; s.vx *= Math.pow(0.985, dt * 30); s.vy = s.vy * Math.pow(0.985, dt * 30) + 70 * dt; s.x += s.vx * dt; s.y += s.vy * dt; const a = Math.max(0, 1 - s.life / s.max); ctx.fillStyle = `rgba(${s.hue.join(',')},${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
  fx.sparks = fx.sparks.filter(s => s.life < s.max && !s.dead);
  // đèn lồng
  for (const l of fx.lanterns) {
    l.y += l.vy * dt; l.ph += dt; const x = l.x + Math.sin(l.ph * 0.8) * l.sw;
    ctx.save(); ctx.translate(x, l.y);
    const lc = hex(l.col).join(',');
    glowAt(glow(lc, lc), 0, 0, l.s * 2.4, 0.35);
    ctx.fillStyle = l.col; ctx.globalAlpha = 0.9;
    if (l._s != null) ctx.scale(l._s, l._s);
    if (l.kind === 'star') { ctx.rotate(Math.sin(l.ph) * 0.2); ctx.scale(l.s / 10, l.s / 10); ctx.fill(SHAPE.star5); }
    else if (l.kind === 'sky') { // đèn trời: thân giấy loe trên, lửa sáng ở đáy, chập chờn
      const w = l.s * 0.75, h = l.s * 1.15, fl = 0.75 + 0.25 * Math.sin(l.ph * 9);
      ctx.rotate(Math.sin(l.ph * 0.7) * 0.08);
      ctx.beginPath(); ctx.moveTo(-w, -h * 0.55); ctx.quadraticCurveTo(0, -h * 0.8, w, -h * 0.55); ctx.lineTo(w * 0.62, h * 0.55); ctx.lineTo(-w * 0.62, h * 0.55); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.85 * fl; ctx.fillStyle = '#FFF3C4'; ctx.beginPath(); ctx.ellipse(0, h * 0.42, w * 0.3, h * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    }
    else { ctx.beginPath(); ctx.ellipse(0, 0, l.s * 0.7, l.s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  fx.lanterns = fx.lanterns.filter(l => l.y > -60 && !l.dead);
  // đom đóm
  if (fx.flies.some(f => f.dead)) fx.flies = fx.flies.filter(f => !f.dead);
  for (const f of fx.flies) {
    f.ph += dt; f.vx += rnd(-20, 20) * dt; f.vy += rnd(-20, 20) * dt; f.vx *= g98; f.vy *= g98; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < 0) f.x = W; if (f.x > W) f.x = 0; if (f.y < H * 0.3) f.vy += 10 * dt; if (f.y > H) f.y = H * 0.4;
    const a = 0.1 + 0.9 * Math.max(0, Math.sin(f.ph * f.bl));
    glowAt(glow('255,246,170', '255,236,140'), f.x, f.y, 9 * (f._s ?? 1), a);
  }
  ctx.globalAlpha = 1;
  // hạt rơi
  for (const p of fx.parts) {
    p.ph += dt;
    if (p.k.fly) { p.t += dt; p.x += p.vx * dt; p.y += Math.sin(p.t * 2) * 12 * dt; if ((p.vx > 0 && p.x > W + 40) || (p.vx < 0 && p.x < -40)) Object.assign(p, newPart(p.kind, false)); drawPart(p); continue; }
    p.x += (Math.sin(p.ph * 1.3) * p.sw + wind * p.d) * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.y > H + 30 || p.y < -40 || p.x < -80 || p.x > W + 80) Object.assign(p, newPart(p.kind, false));
    drawPart(p);
  }
  // chùm hạt khi trả lời đúng
  for (const b of fx.bursts) { b.life += dt / spd(); b.vy += 260 * dt / spd(); b.vx *= g985; b.x += b.vx * dt / spd(); b.y += b.vy * dt / spd(); b.rot += b.vr * dt; b.a = Math.max(0, 1 - b.life / b.max); drawPart(b); }
  fx.bursts = fx.bursts.filter(b => b.life < b.max && !b.dead);
  // mưa
  if (fx.drops.length) {
    ctx.strokeStyle = st.dark ? 'rgba(170,200,230,.35)' : 'rgba(70,100,130,.35)'; ctx.lineWidth = 1; ctx.beginPath();
    const sx = wind / 700;
    for (const d of fx.drops) { d.y += d.v * dt; d.x += wind * dt; if (d.y > H) { d.y = rnd(-60, -10); d.x = rnd(-50, W + 50); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - sx * d.l * 2, d.y - d.l); }
    ctx.stroke();
  }
  // chớp
  if (fx.bolt) { fx.bolt.life -= dt; ctx.strokeStyle = `rgba(230,240,255,${Math.max(0, fx.bolt.life * 3)})`; ctx.lineWidth = 2; ctx.beginPath(); fx.bolt.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); if (fx.bolt.life <= 0) fx.bolt = null; }
  if (fx.flash > 0) { ctx.fillStyle = `rgba(235,242,255,${fx.flash * 0.22})`; ctx.fillRect(0, 0, W, H); fx.flash = Math.max(0, fx.flash - dt * 2.5); }
  // đèn Giáng sinh
  if (st.hol.some(h => h.lights)) for (let i = 0; i < W / 26; i++) { const on = Math.sin(t * 2 + i) > 0; ctx.fillStyle = ['#FF5252', '#FFD740', '#69F0AE', '#40C4FF'][i % 4]; ctx.globalAlpha = on ? 0.9 : 0.25; ctx.beginPath(); ctx.arc(13 + i * 26, 60 + Math.sin(i) * 4, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

  // ---------- khung vẽ ----------
  function resize() {
    if (!cv) return;
    st.dpr = Math.min(st.dpr0 || 1, Q[st.q].dpr);
    cv.width = Math.round(st.w * st.dpr); cv.height = Math.round(st.h * st.dpr);
    seedParts(); seedSky();
  }
  function startLoop() {
    const want = st.want;
    if (want && !st.run) { st.run = true; st.last = st.prev = st.fT = performance.now(); st.acc = st.fc = st.slow = 0; raf(step); }
    if (!want) { st.run = false; if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); }
  }
  let statT = 0;
  const report = () => { clearInterval(statT); statT = setInterval(() => { onStats?.({ fps: st.run ? st.fps : 0, q: st.q, gap: Math.round(st.gap || 0) }); st.gap = 0; }, 1000); };
  return {
    setCanvas(c) { cv = c; ctx = c.getContext('2d'); resize(); report(); },
    // cài đặt + hoàn cảnh mới (đổi tháng, ngày – đêm, mưa, ngày lễ, bật / tắt hiệu ứng…)
    config(settings, env, { reseed = true, requality = false } = {}) {
      S = settings || {};
      Object.assign(st, env);
      if (requality && st.q) { st.q = 0; resize(); }
      else if (reseed && cv) { seedParts(); seedSky(); }
      schedule();
      startLoop();
    },
    resize(w, h, dpr0) { st.w = w; st.h = h; st.dpr0 = dpr0; resize(); },
    setHz(hz) { st.hz = hz; },
    // chùm hạt nhỏ của tháng ở một điểm (trả lời đúng, màn kết quả)
    burst(x, y, n = 14) {
      if (!st.on || !S.fxBurst || !st.run) return;
      const kinds = st.kinds.filter(k => !KIND[k].fly);
      for (let i = 0; i < n; i++) {
        const p = newPart(pick(kinds.length ? kinds : ['sakura']), true), a = rnd(-Math.PI, 0), v = rnd(120, 260);
        Object.assign(p, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: rnd(0.9, 1.4), a: 1, size: p.size * 1.15 });
        fx.bursts.push(p);
      }
    },
    // thử ngay một hiệu ứng (nút trong Cài đặt)
    tryFx(name) {
      if (!st.run) return false;
      const self = this;
      ({ meteor, shower: () => { for (let i = 0; i < 8; i++) setTimeout(meteor, i * 350); }, plane, hole: () => { fx.holes = []; blackHole(); }, fw: () => { for (let i = 0; i < 4; i++) setTimeout(() => firework(), i * 400); }, bolt: lightning, gust, koi: koiFly,
        lantern: () => { for (let i = 0; i < 6; i++) setTimeout(() => lantern(Math.random() < 0.5 ? 'star' : 'round'), i * 300); }, burst: () => self.burst(st.w / 2, st.h / 2, 30) })[name]?.();
      return true;
    },
    stats: () => ({ fps: st.run ? st.fps : 0, q: st.q }),
    peek: () => ({ cons: fx.cons.map(k => [k.n, Math.round(k.stars[0].x), Math.round(k.stars[0].y)]), star: fx.stars[0] && [Math.round(fx.stars[0].x), Math.round(fx.stars[0].y)], parts: fx.parts.length }),
  };
}
