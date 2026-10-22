// v53: đồng hồ lộ cơ (skeleton) nổi ở góc màn hình — thấy cả bộ máy cơ bên dưới, các bộ phận chạy như đồng hồ cơ thật:
//  hộp cót (香箱) quay 1 vòng / 6 giờ · bánh xe giữa (二番車) 1 vòng / giờ, mang kim phút · bánh thứ ba (三番車) · bánh thứ tư (四番車) 1 vòng / phút,
//  mang kim giây ở ô số 6 · bánh thoát (ガンギ車) 15 răng nhảy từng nấc · càng hãm (アンクル) lắc qua lại · bánh lắc (テンプ) 3 Hz (21.600 dao động / giờ),
//  biên độ ±280°, dây tóc (ヒゲゼンマイ) co giãn theo bánh lắc. Kim giây nhảy 6 bước mỗi giây, đúng nhịp bánh thoát.
// Tỉ số răng thật: hộp cót 72 / chốt giữa 12 → bánh giữa 80 / chốt ba 10 → bánh ba 75 / chốt bốn 10 → bánh bốn 84 / chốt thoát 7.
// Giữ 0,7 giây rồi kéo để đổi chỗ (lưu trên máy này); bấm để xem lớn, bật tên các bộ phận (tiếng Nhật + tiếng Việt).
// Vẽ bằng canvas: phần đứng yên (nền, cầu, vành số, vỏ) vẽ sẵn một lần; mỗi khung chỉ xoay ảnh các bánh xe, vẽ dây tóc và kim.
import { S, saveSettings } from './settings.js';
import { esc, rubyHTML, toast } from './util.js';
import { openSheet } from './ui.js';

const KEY = 'tn-watchpos';
const HOLD = 700, SLOP = 10, M = 6;
const SIZE = { sm: 56, md: 76, lg: 100 };
const TAU = Math.PI * 2;

// ---------- hình học bộ máy (đơn vị: bán kính vỏ = 1, y hướng xuống) ----------
const C = { x: 0, y: 0 };                        // bánh xe giữa — trục kim giờ, kim phút
const F = { x: 0, y: 0.43 };                     // bánh thứ tư — kim giây ô số 6
const B = polar(C, 0.365, -100);                 // hộp cót: bán kính 0.32 + chốt bánh giữa 0.045
const T = meet(C, 0.34, F, 0.235);              // bánh thứ ba: chạm chốt của nó với bánh giữa và bánh thứ tư
const E = polar(F, 0.20, 205);                   // bánh thoát: 0.17 + chốt 0.03
const W = { x: -0.47, y: 0.07 };                 // bánh lắc
const P = along(E, W, 0.14);                     // trục càng hãm (giữa bánh thoát và bánh lắc)
const CW = polar(B, 0.225, -18);                 // bánh vương miện (lên dây) cạnh bánh cóc
const RING = 0.76;                               // mép lỗ nhìn thấy bộ máy (trong vành số)
// [tâm bộ phận, tên Nhật, nghĩa Việt, dời số đánh dấu khỏi trục (để không che chân kính)]
const PARTS = [
  [B, '香箱[こうばこ]', 'hộp cót — chứa dây cót, nguồn lực của cả máy', -0.16, -0.05],
  [C, '二番車[にばんしゃ]', 'bánh xe giữa — 1 vòng / giờ, mang kim phút', 0.14, -0.06],
  [T, '三番車[さんばんしゃ]', 'bánh thứ ba — truyền lực xuống', 0.07, 0.06],
  [F, '四番車[よんばんしゃ]', 'bánh thứ tư — 1 vòng / phút, mang kim giây', 0.11, 0.07],
  [E, 'ガンギ車[ぐるま]', 'bánh thoát — nhả lực từng nấc', -0.03, 0.09],
  [P, 'アンクル', 'càng hãm — chốt chặn bánh thoát', 0.02, -0.06],
  [W, 'テンプ', 'bánh lắc — dao động 3 lần / giây', -0.1, -0.12],
  [W, 'ヒゲゼンマイ', 'dây tóc — kéo bánh lắc về giữa', 0.06, 0.07],
  [CW, '角穴車[かくあなぐるま]', 'bánh lên dây — xoay núm thì quay', 0.06, -0.03],
];

function polar(o, r, deg) { const a = deg * Math.PI / 180; return { x: o.x + r * Math.cos(a), y: o.y + r * Math.sin(a) }; }
function along(a, b, d) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy); return { x: a.x + dx / l * d, y: a.y + dy / l * d }; }
function meet(a, ra, b, rb) { // giao hai đường tròn, lấy điểm bên phải
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), k = (ra * ra - rb * rb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, ra * ra - k * k));
  const mx = a.x + dx * k / d, my = a.y + dy * k / d;
  return { x: mx + dy * h / d, y: my - dx * h / d };
}

// ---------- màu ----------
const GOLD = ['#f6dc8a', '#d7b056', '#9b7a2c'], STEEL = ['#f4f7fa', '#bcc5cd', '#6f7a84'], RHOD = ['#f1f4f6', '#c9d0d6', '#8a949c'];
const RUBY = '#c0174f', BLUE = '#2c4f9e';
function metal(ctx, r, c, ang = -0.8) {
  const g = ctx.createLinearGradient(Math.cos(ang) * r, Math.sin(ang) * r, -Math.cos(ang) * r, -Math.sin(ang) * r);
  g.addColorStop(0, c[0]); g.addColorStop(0.5, c[1]); g.addColorStop(1, c[2]);
  return g;
}

// ---------- vẽ từng chi tiết (toạ độ đơn vị; ctx đã scale) ----------
function gearPath(ctx, r, n, h) { // vòng răng: chân răng r-h, đỉnh r+0.6h
  const p = TAU / n, rr = r - h, rt = r + h * 0.6;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i * p;
    ctx.arc(0, 0, rr, a - 0.5 * p, a - 0.24 * p);
    ctx.lineTo(Math.cos(a - 0.13 * p) * rt, Math.sin(a - 0.13 * p) * rt);
    ctx.arc(0, 0, rt, a - 0.13 * p, a + 0.13 * p);
    ctx.lineTo(Math.cos(a + 0.24 * p) * rr, Math.sin(a + 0.24 * p) * rr);
    ctx.arc(0, 0, rr, a + 0.24 * p, a + 0.5 * p);
  }
  ctx.closePath();
}
function wheel(ctx, { r, n, spokes = 4, rim = 0.035, hub = 0.04, color = GOLD, pin = 0, pinN = 10, curve = 0.35 }) {
  const h = Math.min(0.012, TAU * r / n * 0.42);
  gearPath(ctx, r, n, h);
  ctx.fillStyle = metal(ctx, r, color); ctx.fill();
  ctx.lineWidth = 0.004; ctx.strokeStyle = 'rgba(60,40,10,.55)'; ctx.stroke();
  // khoét giữa các nan hoa
  const ri = r - h - rim;
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath(); ctx.arc(0, 0, ri, 0, TAU); ctx.fill(); ctx.restore();
  // nan hoa cong + moay ơ
  ctx.fillStyle = metal(ctx, r, color);
  const w = Math.max(0.018, r * 0.09);
  for (let i = 0; i < spokes; i++) {
    ctx.save(); ctx.rotate(i * TAU / spokes);
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.quadraticCurveTo(-w / 2 + ri * curve * 0.5, ri * 0.5, -w * 0.7, ri + 0.004);
    ctx.lineTo(w * 0.7, ri + 0.004);
    ctx.quadraticCurveTo(w / 2 + ri * curve * 0.5, ri * 0.5, w / 2, 0);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.beginPath(); ctx.arc(0, 0, hub, 0, TAU); ctx.fill();
  // viền sáng vành trong
  ctx.beginPath(); ctx.arc(0, 0, ri + 0.002, 0, TAU); ctx.lineWidth = 0.003; ctx.strokeStyle = 'rgba(255,245,210,.55)'; ctx.stroke();
  if (pin) { // chốt (pinion) thép
    gearPath(ctx, pin, pinN, Math.min(0.008, TAU * pin / pinN * 0.4));
    ctx.fillStyle = metal(ctx, pin, STEEL); ctx.fill();
    ctx.lineWidth = 0.003; ctx.strokeStyle = 'rgba(20,25,30,.6)'; ctx.stroke();
  }
}
function barrel(ctx) {
  const r = 0.32;
  wheel(ctx, { r, n: 72, spokes: 5, rim: 0.05, hub: 0.075, curve: 0.6 });
  // dây cót cuộn bên trong (nhìn qua nắp khoét)
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r - 0.06, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(200,210,220,.85)'; ctx.lineWidth = 0.006;
  ctx.beginPath();
  const turns = 9, a0 = 0.08, a1 = r - 0.07;
  for (let i = 0; i <= turns * 48; i++) { const t = i / (turns * 48), a = t * turns * TAU, rr = a0 + (a1 - a0) * Math.pow(t, 0.8); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  ctx.stroke(); ctx.restore();
  // nan nắp hộp cót vẽ lại đè lên dây cót
  ctx.fillStyle = metal(ctx, r, GOLD);
  for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i * TAU / 5 + 0.3); ctx.fillRect(-0.012, 0.07, 0.024, r - 0.13); ctx.restore(); }
}
function escapeWheel(ctx) { // 15 răng hình chùy, thép xanh
  const r = 0.10, n = 15;
  ctx.fillStyle = metal(ctx, r, ['#e9eef4', '#9fb1c4', '#4f6378']);
  ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.fill();
  for (let i = 0; i < n; i++) {
    ctx.save(); ctx.rotate(i * TAU / n);
    ctx.beginPath();
    ctx.moveTo(-0.008, -r * 0.6); ctx.lineTo(0.004, -r * 0.6);
    ctx.lineTo(0.018, -r * 0.98); ctx.lineTo(0.004, -r * 1.02); ctx.lineTo(-0.006, -r * 0.97);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.save(); ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 5; i++) { const a = i * TAU / 5 + 0.6; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.15, 0, TAU); ctx.fill(); }
  ctx.restore();
  gearPath(ctx, 0.03, 7, 0.007); ctx.fillStyle = metal(ctx, 0.03, STEEL); ctx.fill();
}
function balanceWheel(ctx) {
  const r = 0.19;
  ctx.strokeStyle = metal(ctx, r, GOLD); ctx.lineWidth = 0.026;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.lineWidth = 0.003; ctx.strokeStyle = 'rgba(80,55,15,.7)';
  ctx.beginPath(); ctx.arc(0, 0, r + 0.013, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r - 0.013, 0, TAU); ctx.stroke();
  ctx.fillStyle = metal(ctx, r, GOLD);
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.rotate(i * TAU / 3); ctx.fillRect(-0.009, 0, 0.018, r); ctx.restore(); }
  for (let i = 0; i < 10; i++) { // vít điều chỉnh trên vành
    const a = i * TAU / 10 + 0.31; ctx.beginPath(); ctx.arc(Math.cos(a) * (r + 0.016), Math.sin(a) * (r + 0.016), 0.009, 0, TAU);
    ctx.fillStyle = '#e8c870'; ctx.fill(); ctx.lineWidth = 0.002; ctx.strokeStyle = '#7a5a1c'; ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(0, 0, 0.045, 0, TAU); ctx.fillStyle = metal(ctx, 0.045, STEEL); ctx.fill(); // mâm con lăn
  ctx.beginPath(); ctx.arc(0, 0.032, 0.008, 0, TAU); ctx.fillStyle = RUBY; ctx.fill(); // chốt xung lực bằng hồng ngọc
}
function jewel(ctx, p, r = 0.016) { // chân kính hồng ngọc trong khung vàng (chaton)
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.beginPath(); ctx.arc(0, 0, r * 1.6, 0, TAU); ctx.fillStyle = metal(ctx, r * 1.6, GOLD); ctx.fill();
  ctx.lineWidth = 0.002; ctx.strokeStyle = 'rgba(70,50,10,.7)'; ctx.stroke();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#ff8fb3'); g.addColorStop(0.45, RUBY); g.addColorStop(1, '#5e0322');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU); ctx.fillStyle = '#1b0610'; ctx.fill();
  ctx.restore();
}
function screw(ctx, p, r = 0.018, ang = 0.6) { // vít thép tôi xanh
  ctx.save(); ctx.translate(p.x, p.y);
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#9ab8ff'); g.addColorStop(0.5, BLUE); g.addColorStop(1, '#0d1d45');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
  ctx.rotate(ang); ctx.fillStyle = '#081129'; ctx.fillRect(-r * 0.9, -r * 0.13, r * 1.8, r * 0.26);
  ctx.restore();
}
function bridge(ctx, pts, w) { // cầu khoét (rhodium): nét dày bo tròn, vát cạnh sáng
  const path = () => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); };
  ctx.lineCap = ctx.lineJoin = 'round';
  path(); ctx.lineWidth = w + 0.008; ctx.strokeStyle = 'rgba(20,24,28,.75)'; ctx.stroke();
  path(); ctx.lineWidth = w; ctx.strokeStyle = metal(ctx, 0.8, RHOD); ctx.stroke();
  path(); ctx.lineWidth = w * 0.42; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke(); // đường vát sáng giữa cầu
}
const onRing = deg => polar(C, RING - 0.02, deg);

// lớp nền: lỗ nhìn bộ máy, mâm dưới khoét
function drawBase(ctx) {
  const g = ctx.createRadialGradient(-0.2, -0.3, 0.05, 0, 0, 1);
  g.addColorStop(0, '#2a3138'); g.addColorStop(1, '#0b0e11');
  ctx.beginPath(); ctx.arc(0, 0, 0.92, 0, TAU); ctx.fillStyle = g; ctx.fill();
  // mâm dưới (tối hơn, khoét nhiều lỗ) — vòng ngoài + các tay đỡ trục dưới
  ctx.save();
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3a434b'; ctx.lineWidth = 0.05;
  ctx.beginPath(); ctx.arc(0, 0, RING - 0.025, 0, TAU); ctx.stroke();
  ctx.lineWidth = 0.04; ctx.strokeStyle = '#323a41';
  for (const [a, b] of [[onRing(-150), B], [B, C], [C, T], [T, onRing(25)], [C, F], [F, onRing(95)], [F, E], [E, onRing(160)], [W, onRing(215)], [P, E]]) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // vân trai (perlage) trên mâm
  ctx.globalAlpha = 0.18; ctx.strokeStyle = '#9aa6b0'; ctx.lineWidth = 0.003;
  for (let i = 0; i < 60; i++) { const a = i * 0.61, rr = 0.66 + (i % 3) * 0.02; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 0.014, 0, TAU); ctx.stroke(); }
  ctx.restore();
}
// lớp trên: cầu, chân kính, vít, bánh cóc, vành số, ô giây, vỏ
function drawTop(ctx, big) {
  // cầu hộp cót + bánh cóc
  bridge(ctx, [onRing(-155), { x: B.x - 0.05, y: B.y + 0.02 }, onRing(-35)], 0.075);
  ctx.save(); ctx.translate(B.x, B.y);
  gearPath(ctx, 0.15, 60, 0.008); ctx.fillStyle = metal(ctx, 0.15, STEEL); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 0.002;
  for (let i = 0; i < 48; i++) { const a = i * TAU / 48; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 0.03, Math.sin(a) * 0.03); ctx.lineTo(Math.cos(a) * 0.14, Math.sin(a) * 0.14); ctx.stroke(); } // vân mặt trời
  ctx.restore();
  ctx.save(); ctx.translate(CW.x, CW.y);
  gearPath(ctx, 0.07, 28, 0.007); ctx.fillStyle = metal(ctx, 0.07, STEEL); ctx.fill(); ctx.restore();
  // cò (click) giữ bánh cóc
  ctx.save(); ctx.translate(B.x, B.y); ctx.rotate(0.9);
  ctx.beginPath(); ctx.moveTo(0.14, 0.02); ctx.lineTo(0.2, 0.05); ctx.lineTo(0.21, 0.02); ctx.closePath(); ctx.fillStyle = metal(ctx, 0.1, STEEL); ctx.fill(); ctx.restore();
  screw(ctx, B, 0.03, 0.3); screw(ctx, CW, 0.018, 1.2);
  // cầu bánh xe (bánh ba, bánh bốn), cầu càng hãm + bánh thoát, cầu bánh lắc (cock)
  bridge(ctx, [onRing(28), T, F, onRing(100)], 0.06);
  bridge(ctx, [onRing(158), E, P], 0.05);
  bridge(ctx, [onRing(212), { x: W.x + 0.03, y: W.y + 0.02 }], 0.07);
  ctx.beginPath(); ctx.arc(W.x, W.y, 0.045, 0, TAU); ctx.fillStyle = metal(ctx, 0.05, RHOD); ctx.fill(); // đầu cock quanh chân kính
  ctx.save(); ctx.translate(W.x, W.y); ctx.rotate(-0.9); // kim chỉnh nhanh chậm (raquette)
  ctx.beginPath(); ctx.moveTo(-0.01, 0); ctx.lineTo(0.01, 0); ctx.lineTo(0.003, 0.15); ctx.lineTo(-0.003, 0.15); ctx.closePath(); ctx.fillStyle = metal(ctx, 0.1, STEEL); ctx.fill(); ctx.restore();
  for (const p of [T, F, E, P]) jewel(ctx, p, 0.016);
  jewel(ctx, W, 0.019);
  for (const d of [-155, -35, 28, 100, 158, 212]) screw(ctx, onRing(d), 0.02, d / 40);
  // vành số (kính màu khói), vạch phút, cọc giờ mạ vàng
  ctx.beginPath(); ctx.arc(0, 0, 0.905, 0, TAU); ctx.arc(0, 0, RING, 0, TAU, true);
  ctx.fillStyle = 'rgba(12,14,18,.82)'; ctx.fill('evenodd');
  ctx.lineWidth = 0.006; ctx.strokeStyle = 'rgba(214,180,95,.9)';
  ctx.beginPath(); ctx.arc(0, 0, RING + 0.003, 0, TAU); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 0.006;
  for (let i = 0; i < 60; i++) {
    if (i % 5 === 0) continue;
    const a = i * TAU / 60; ctx.beginPath(); ctx.moveTo(Math.sin(a) * 0.885, -Math.cos(a) * 0.885); ctx.lineTo(Math.sin(a) * 0.86, -Math.cos(a) * 0.86); ctx.stroke();
  }
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.rotate(i * TAU / 12);
    const w = i === 0 ? 0.05 : 0.032;
    ctx.fillStyle = metal(ctx, 0.1, GOLD);
    if (i === 0) { ctx.fillRect(-w / 2 - 0.012, -0.888, w * 0.42, 0.1); ctx.fillRect(0.012 - 0.004, -0.888, w * 0.42, 0.1); }
    else ctx.fillRect(-w / 2, -0.888, w, 0.095);
    ctx.restore();
  }
  // ô giây ở số 6 (trên trục bánh thứ tư)
  ctx.beginPath(); ctx.arc(F.x, F.y, 0.115, 0, TAU); ctx.lineWidth = 0.008; ctx.strokeStyle = 'rgba(236,240,244,.85)'; ctx.stroke();
  ctx.lineWidth = 0.004;
  for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(F.x + Math.sin(a) * 0.112, F.y - Math.cos(a) * 0.112); ctx.lineTo(F.x + Math.sin(a) * (i % 3 ? 0.098 : 0.09), F.y - Math.cos(a) * (i % 3 ? 0.098 : 0.09)); ctx.stroke(); }
  if (big) {
    ctx.fillStyle = 'rgba(236,224,190,.9)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 0.052px sans-serif'; ctx.fillText('手巻 · 21石', 0, -0.655); // lên dây tay · 21 chân kính
  }
  // vỏ thép đánh bóng
  const g = ctx.createLinearGradient(-1, -1, 1, 1);
  g.addColorStop(0, '#fbfcfd'); g.addColorStop(0.35, '#aab3bb'); g.addColorStop(0.55, '#eef1f4'); g.addColorStop(1, '#6b747c');
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.arc(0, 0, 0.905, 0, TAU, true); ctx.fillStyle = g; ctx.fill('evenodd');
  ctx.lineWidth = 0.008; ctx.strokeStyle = 'rgba(30,34,38,.7)';
  ctx.beginPath(); ctx.arc(0, 0, 0.997, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, 0.905, 0, TAU); ctx.stroke();
}
function drawGlass(ctx) { // ánh phản chiếu trên mặt kính
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 0.9, 0, TAU); ctx.clip();
  const g = ctx.createLinearGradient(-0.9, -0.9, 0.3, 0.3);
  g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(0.45, 'rgba(255,255,255,.05)'); g.addColorStop(0.46, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
}
function crown(ctx) {
  ctx.fillStyle = metal(ctx, 0.1, STEEL);
  ctx.fillRect(0.995, -0.085, 0.07, 0.17);
  ctx.strokeStyle = 'rgba(40,46,52,.6)'; ctx.lineWidth = 0.005;
  for (let i = 0; i < 9; i++) { const y = -0.075 + i * 0.019; ctx.beginPath(); ctx.moveTo(1.0, y); ctx.lineTo(1.06, y); ctx.stroke(); }
}
function hands(ctx, hA, mA, sA) {
  const hand = (a, len, w, tail) => {
    const path = () => { ctx.beginPath(); ctx.moveTo(0, tail); ctx.lineTo(-w / 2, 0); ctx.lineTo(-w * 0.32, -len * 0.82); ctx.lineTo(0, -len); ctx.lineTo(w * 0.32, -len * 0.82); ctx.lineTo(w / 2, 0); ctx.closePath(); };
    ctx.save(); ctx.translate(0.01, 0.014); ctx.rotate(a); path(); ctx.fillStyle = 'rgba(5,7,9,.55)'; ctx.fill(); ctx.restore(); // bóng đổ xuống bộ máy
    ctx.save(); ctx.rotate(a); path();
    ctx.fillStyle = metal(ctx, len, STEEL); ctx.fill();
    ctx.lineWidth = 0.006; ctx.strokeStyle = 'rgba(20,24,28,.85)'; ctx.stroke();
    // khoét lộ cơ ở thân kim, giữa là dải dạ quang
    ctx.beginPath(); ctx.moveTo(-w * 0.2, -len * 0.18); ctx.lineTo(-w * 0.16, -len * 0.74); ctx.lineTo(0, -len * 0.86); ctx.lineTo(w * 0.16, -len * 0.74); ctx.lineTo(w * 0.2, -len * 0.18); ctx.closePath();
    ctx.fillStyle = '#efe9d2'; ctx.fill();
    ctx.restore();
  };
  hand(hA, 0.47, 0.07, 0.07);
  hand(mA, 0.71, 0.055, 0.09);
  ctx.beginPath(); ctx.arc(0, 0, 0.035, 0, TAU); ctx.fillStyle = metal(ctx, 0.04, STEEL); ctx.fill();
  screw(ctx, { x: 0, y: 0 }, 0.016, 0.2);
  ctx.save(); ctx.translate(F.x, F.y); ctx.rotate(sA); // kim giây ô số 6
  ctx.beginPath(); ctx.moveTo(-0.006, 0.03); ctx.lineTo(0.006, 0.03); ctx.lineTo(0.0025, -0.1); ctx.lineTo(-0.0025, -0.1); ctx.closePath();
  ctx.fillStyle = '#d93a3a'; ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, 0.012, 0, TAU); ctx.fill(); ctx.restore();
}
function palletFork(ctx, a) {
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(Math.atan2(W.y - P.y, W.x - P.x) + a);
  const L = Math.hypot(W.x - P.x, W.y - P.y) - 0.035;
  ctx.fillStyle = metal(ctx, 0.2, STEEL); ctx.strokeStyle = 'rgba(20,24,28,.7)'; ctx.lineWidth = 0.003;
  ctx.beginPath(); ctx.moveTo(0, -0.012); ctx.lineTo(L - 0.03, -0.008); ctx.lineTo(L, -0.022); ctx.lineTo(L + 0.008, -0.012); ctx.lineTo(L - 0.012, 0); ctx.lineTo(L + 0.008, 0.012); ctx.lineTo(L, 0.022); ctx.lineTo(L - 0.03, 0.008); ctx.lineTo(0, 0.012); ctx.closePath(); ctx.fill(); ctx.stroke();
  // hai tay neo về phía bánh thoát, đầu gắn đá hồng ngọc
  ctx.beginPath(); ctx.moveTo(0.01, -0.006); ctx.lineTo(-0.062, -0.072); ctx.lineTo(-0.074, -0.062); ctx.lineTo(-0.012, 0); ctx.lineTo(-0.074, 0.062); ctx.lineTo(-0.062, 0.072); ctx.lineTo(0.01, 0.006); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = RUBY; // đá vào, đá ra chạm răng bánh thoát
  ctx.save(); ctx.translate(-0.07, -0.072); ctx.rotate(0.8); ctx.fillRect(-0.016, -0.005, 0.03, 0.01); ctx.restore();
  ctx.save(); ctx.translate(-0.07, 0.072); ctx.rotate(-0.8); ctx.fillRect(-0.016, -0.005, 0.03, 0.01); ctx.restore();
  ctx.restore();
}
function hairspring(ctx, ang) { // dây tóc: đầu trong theo bánh lắc, đầu ngoài cố định (cọc)
  ctx.save(); ctx.translate(W.x, W.y);
  ctx.beginPath();
  const turns = 8, n = turns * 30, r0 = 0.05, r1 = 0.135;
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = t * turns * TAU + (1 - t) * ang - 2.3, r = r0 + (r1 - r0) * t + 0.004 * ang * Math.sin(t * Math.PI);
    i ? ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) : ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.strokeStyle = 'rgba(170,200,235,.9)'; ctx.lineWidth = 0.0035; ctx.stroke();
  ctx.restore();
}

// ---------- một mặt đồng hồ (canvas) ----------
function face(canvas, px, { big = false } = {}) {
  const dpr = Math.min(3, window.devicePixelRatio || 1), W2 = Math.round(px * dpr);
  canvas.width = canvas.height = W2; canvas.style.width = canvas.style.height = px + 'px';
  const k = big ? 0.93 : 1, s = (W2 / 2) * k; // big: chừa chỗ cho núm vặn
  const layer = (draw, pad = 0) => {
    const c = document.createElement('canvas'); c.width = c.height = W2;
    const x = c.getContext('2d'); x.translate(W2 / 2, W2 / 2); x.scale(s, s); draw(x); return c;
  };
  const sprite = (r, draw) => {
    const n = Math.ceil(2 * r * s) + 4, c = document.createElement('canvas'); c.width = c.height = n;
    const x = c.getContext('2d'); x.translate(n / 2, n / 2); x.scale(s, s); draw(x); return c;
  };
  const base = layer(drawBase), top = layer(x => { drawTop(x, big); if (big) crown(x); }), glass = layer(drawGlass);
  const sp = {
    barrel: sprite(0.34, barrel),
    center: sprite(0.32, x => wheel(x, { r: 0.30, n: 80, spokes: 4, pin: 0.045, pinN: 12 })),
    third: sprite(0.22, x => wheel(x, { r: 0.20, n: 75, spokes: 4, pin: 0.04 })),
    fourth: sprite(0.19, x => wheel(x, { r: 0.17, n: 84, spokes: 5, pin: 0.035 })),
    esc: sprite(0.115, escapeWheel),
    bal: sprite(0.22, balanceWheel),
  };
  const ctx = canvas.getContext('2d');
  const put = (img, p, a) => { ctx.save(); ctx.translate(W2 / 2 + p.x * s, W2 / 2 + p.y * s); ctx.rotate(a); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore(); };
  return function draw(now, live) {
    const d = new Date(now), sec = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    // nhịp bánh thoát: 6 nấc / giây, mỗi nấc chuyển trong ~20 ms
    const k6 = sec * 6, fl = Math.floor(k6), fr = k6 - fl, st = (fl + (live ? Math.min(1, fr / 0.12) ** 2 * (3 - 2 * Math.min(1, fr / 0.12)) : 1)) / 6;
    const centre = TAU * st / 3600;                           // 1 vòng / giờ, chiều kim đồng hồ
    const balA = live ? 4.9 * Math.sin(TAU * 3 * (sec % 1)) : 0; // ±280°, 3 Hz, qua 0 đúng lúc bánh thoát nhảy
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W2, W2);
    ctx.drawImage(base, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.arc(W2 / 2, W2 / 2, RING * s, 0, TAU); ctx.clip();
    put(sp.barrel, B, -centre * 12 / 72);
    put(sp.center, C, centre);
    put(sp.third, T, -centre * 8);
    put(sp.fourth, F, centre * 60);
    put(sp.esc, E, -centre * 720);
    ctx.save(); ctx.translate(W2 / 2, W2 / 2); ctx.scale(s, s);
    palletFork(ctx, 0.16 * Math.max(-1, Math.min(1, -balA / 0.5)));
    ctx.restore();
    put(sp.bal, W, balA);
    ctx.save(); ctx.translate(W2 / 2, W2 / 2); ctx.scale(s, s); hairspring(ctx, balA); ctx.restore();
    ctx.restore();
    ctx.drawImage(top, 0, 0);
    ctx.save(); ctx.translate(W2 / 2, W2 / 2); ctx.scale(s, s);
    hands(ctx, TAU * ((st / 3600) % 12) / 12, centre, centre * 60);
    ctx.restore();
    ctx.drawImage(glass, 0, 0);
  };
}

// ---------- nút nổi ----------
let el = null, drawSmall = null, raf = 0, lastT = 0, bigDraw = null;
const reduced = () => S.watchFull === false || S.motion === false || matchMedia('(prefers-reduced-motion: reduce)').matches;
const loadPos = () => { try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); return p && Number.isFinite(p.fx) && Number.isFinite(p.fy) ? p : null; } catch { return null; } };
const savePos = p => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { } };
const buzz = ms => { try { navigator.vibrate?.(ms); } catch { } };
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function bounds() {
  const w = el.offsetWidth || 56, h = el.offsetHeight || 56;
  const tb = document.getElementById('topbar')?.getBoundingClientRect();
  const nav = document.querySelector('.nav')?.getBoundingClientRect();
  const y0 = Math.max(M, (tb ? tb.bottom : 0) + M);
  const y1 = (nav && nav.width > innerWidth / 2 && nav.top > innerHeight / 2 ? nav.top : innerHeight) - h - M;
  return { x0: M, x1: Math.max(M, innerWidth - w - M), y0, y1: Math.max(y0, y1) };
}
function place() {
  const p = loadPos() || { fx: 1, fy: 0 }, b = bounds(); // mặc định: góc phải, ngay dưới thanh trên cùng
  el.style.left = b.x0 + clamp(p.fx, 0, 1) * (b.x1 - b.x0) + 'px';
  el.style.top = b.y0 + clamp(p.fy, 0, 1) * (b.y1 - b.y0) + 'px';
}
function loop(t) {
  raf = 0;
  if (!el || el.hidden || document.hidden) return;
  const live = !reduced(), gap = live ? (bigDraw ? 16 : 33) : 1000;
  if (t - lastT >= gap - 2) {
    lastT = t; const now = Date.now();
    drawSmall?.(now, live); bigDraw?.(now, live);
  }
  raf = requestAnimationFrame(loop);
}
const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
function render() {
  const on = S.watch !== false;
  el.hidden = !on;
  if (!on) return;
  const px = SIZE[S.watchSize] || SIZE.sm;
  const cv = el.querySelector('canvas');
  if (+cv.dataset.px !== px || cv.dataset.dpr !== String(devicePixelRatio)) { drawSmall = face(cv, px); cv.dataset.px = px; cv.dataset.dpr = String(devicePixelRatio); }
  place(); lastT = 0; kick();
}
function bind() {
  let pid = null, sx = 0, sy = 0, ox = 0, oy = 0, timer = 0, drag = false, moved = false, suppress = false;
  el.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    e.preventDefault();
    pid = e.pointerId; sx = e.clientX; sy = e.clientY; drag = moved = suppress = false;
    const r = el.getBoundingClientRect(); ox = sx - r.left; oy = sy - r.top;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (pid == null || moved) return;
      drag = true; el.classList.add('is-drag'); buzz(30);
      try { el.setPointerCapture(pid); } catch { }
    }, HOLD);
  });
  el.addEventListener('pointermove', e => {
    if (e.pointerId !== pid) return;
    if (!drag) { if (Math.hypot(e.clientX - sx, e.clientY - sy) > SLOP) { moved = true; clearTimeout(timer); } return; }
    e.preventDefault();
    const b = bounds();
    el.style.left = clamp(e.clientX - ox, b.x0, b.x1) + 'px';
    el.style.top = clamp(e.clientY - oy, b.y0, b.y1) + 'px';
  });
  const end = e => {
    if (e.pointerId !== pid) return;
    clearTimeout(timer); pid = null;
    if (drag) {
      drag = false; suppress = true; el.classList.remove('is-drag'); buzz(15);
      const b = bounds(), x = parseFloat(el.style.left) || b.x0, y = parseFloat(el.style.top) || b.y0;
      savePos({ fx: clamp((x - b.x0) / Math.max(1, b.x1 - b.x0), 0, 1), fy: clamp((y - b.y0) / Math.max(1, b.y1 - b.y0), 0, 1) });
    } else if (moved) suppress = true;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('click', e => { e.preventDefault(); if (suppress) { suppress = false; return; } openBig(); });
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBig(); } });
  el.addEventListener('contextmenu', e => e.preventDefault());
}

// ---------- xem lớn ----------
const DOW = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'], DOWJ = '日月火水木金土';
function openBig() {
  const px = Math.min(innerWidth - 48, innerHeight - 260, 440);
  const lab = S.watchLabels !== false;
  const s = openSheet(`<h2 class="h2">Đồng hồ lộ cơ</h2>
    <div class="wbig"><canvas aria-label="Đồng hồ cơ lộ máy"></canvas>
      <div class="wlabels"${lab ? '' : ' hidden'}>${PARTS.map(([p, , vi, dx, dy], i) => `<button type="button" class="wl" data-wi="${i}" style="left:${50 + (p.x + dx) * 46.5}%;top:${50 + (p.y + dy) * 46.5}%" aria-label="${i + 1}: ${esc(vi)}">${i + 1}</button>`).join('')}</div></div>
    <p class="wcap" aria-live="polite" hidden></p>
    <p class="wtime" aria-live="off"></p>
    <label class="check"><input type="checkbox" data-w="labels" ${lab ? 'checked' : ''}> Đánh số và gọi tên các bộ phận</label>
    <ol class="wleg"${lab ? '' : ' hidden'}>${PARTS.map(([, jp, vi], i) => `<li><button type="button" data-wi="${i}"><span class="wn">${i + 1}</span><span><b lang="ja">${rubyHTML(jp)}</b><small>${esc(vi)}</small></span></button></li>`).join('')}</ol>
    <p class="small muted">Bộ máy lên dây tay, 21 chân kính. Bánh lắc dao động 3 lần mỗi giây (21.600 dao động/giờ), bánh thoát nhả từng nấc nên kim giây nhảy 6 bước mỗi giây. Hộp cót quay 1 vòng / 6 giờ, bánh xe giữa 1 vòng / giờ, bánh thứ tư 1 vòng / phút.</p>
    <fieldset><legend>Cỡ đồng hồ nổi</legend><div class="chips" data-name="watchSize">${[['sm', 'Nhỏ'], ['md', 'Vừa'], ['lg', 'Lớn']].map(([v, l]) => `<button type="button" class="chip" data-v="${v}" aria-pressed="${(S.watchSize || 'sm') === v}">${l}</button>`).join('')}</div></fieldset>
    <p class="small muted">Giữ đồng hồ 0,7 giây rồi kéo để đổi chỗ.</p>
    <div class="row-btns"><button type="button" class="btn btn-ghost" data-w="hide">Ẩn đồng hồ nổi</button></div>`, { label: 'Đồng hồ lộ cơ', onClose: () => { bigDraw = null; } });
  const cv = s.el.querySelector('.wbig canvas');
  s.el.querySelector('.wbig').style.width = s.el.querySelector('.wbig').style.height = px + 'px';
  bigDraw = face(cv, px, { big: true });
  const tEl = s.el.querySelector('.wtime');
  const big = bigDraw;
  bigDraw = (now, live) => {
    big(now, live);
    const d = new Date(now), p2 = n => String(n).padStart(2, '0');
    const txt = `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())} · ${DOW[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} · ${d.getMonth() + 1}月${d.getDate()}日（${DOWJ[d.getDay()]}）`;
    if (tEl.textContent !== txt) tEl.textContent = txt;
  };
  s.el.addEventListener('click', async e => {
    const w = e.target.closest('[data-w]')?.dataset.w, chip = e.target.closest('.chips[data-name=watchSize] .chip');
    if (chip) { S.watchSize = chip.dataset.v; s.el.querySelectorAll('.chips[data-name=watchSize] .chip').forEach(c => c.setAttribute('aria-pressed', String(c === chip))); await saveSettings(); }
    const wi = e.target.closest('[data-wi]')?.dataset.wi;
    if (wi != null) {
      const on = !s.el.querySelector(`.wl[data-wi="${wi}"]`).classList.contains('on');
      s.el.querySelectorAll('[data-wi]').forEach(b => b.classList.toggle('on', on && b.dataset.wi === wi));
      const cap = s.el.querySelector('.wcap'), [, jp, vi] = PARTS[wi];
      cap.hidden = !on;
      if (on) cap.innerHTML = `<span class="wn">${+wi + 1}</span> <b lang="ja">${rubyHTML(jp)}</b> ${esc(vi)}`;
    }
    if (w === 'hide') { S.watch = false; await saveSettings(); s.el.remove(); bigDraw = null; toast('Đã ẩn đồng hồ. Bật lại ở Cài đặt → Giao diện.'); }
  });
  s.el.querySelector('[data-w=labels]').onchange = async e => { S.watchLabels = e.target.checked; s.el.querySelector('.wlabels').hidden = s.el.querySelector('.wleg').hidden = !e.target.checked; if (!e.target.checked) s.el.querySelector('.wcap').hidden = true; await saveSettings(); };
  lastT = 0; kick();
}

export function initWatch() {
  if (el) return;
  el = document.createElement('div');
  el.className = 'watch-fab'; el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Đồng hồ lộ cơ — bấm để xem lớn');
  el.innerHTML = '<canvas aria-hidden="true"></canvas>';
  document.body.appendChild(el);
  bind();
  render();
  addEventListener('resize', () => { if (!el.hidden) { render(); } });
  addEventListener('tn-settings', render);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastT = 0; kick(); } });
}
