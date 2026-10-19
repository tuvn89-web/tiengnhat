// Giao diện mùa (v31): 12 tháng · ngày – đêm · mưa · ngày lễ Nhật & Việt Nam · hiệu ứng vẽ trên một canvas nằm sau nội dung.
// Mỗi hiệu ứng bật / tắt riêng trong Cài đặt; tôn trọng "giảm chuyển động" của máy; dừng vẽ khi app chạy nền.
import { S } from './settings.js';
import { rich } from './util.js';

// ---------- màu ----------
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const toHex = a => '#' + a.map(x => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((x, i) => x + (hex(b)[i] - x) * t));
const rgba = (h, al) => `rgba(${hex(h).join(',')},${al})`;

// ---------- 12 tháng ----------
const M = {
  1: { acc: '#E0A43C', word: '正月[しょうがつ] · 初日[はつひ]の出[で]', vi: 'năm mới, mặt trời đầu năm', kinds: ['snowL', 'gold'], pat: 'kikko' },
  2: { acc: '#E58FB0', word: '梅[うめ] · 節分[せつぶん]', vi: 'hoa mai Nhật, lễ ném đậu', kinds: ['plum'], pat: 'ume' },
  3: { acc: '#F08FA0', word: '桃[もも] · 菜[な]の花[はな]', vi: 'hoa đào, hoa cải', kinds: ['peach', 'nanohana'], pat: 'nano' },
  4: { acc: '#F29BB8', word: '桜[さくら] · 花見[はなみ]', vi: 'anh đào, ngắm hoa', kinds: ['sakura'], pat: 'sakura' },
  5: { acc: '#6CC28A', word: '新緑[しんりょく] · 鯉[こい]のぼり', vi: 'lá non, cờ cá chép', kinds: ['leafGreen', 'wisteria'], pat: 'asanoha' },
  6: { acc: '#8FA6F5', word: '梅雨[つゆ] · 紫陽花[あじさい]', vi: 'mùa mưa, cẩm tú cầu', kinds: ['hydrangea'], pat: 'ame' },
  7: { acc: '#7FB2FF', word: '七夕[たなばた] · 風鈴[ふうりん]', vi: 'Thất tịch, chuông gió', kinds: ['stardust'], pat: 'hoshi' },
  8: { acc: '#4FC3C9', word: '花火[はなび] · 蛍[ほたる]', vi: 'pháo hoa, đom đóm', kinds: ['sunflower'], pat: 'seigaiha' },
  9: { acc: '#E8C66A', word: '月見[つきみ] · 赤[あか]とんぼ', vi: 'ngắm trăng, chuồn chuồn đỏ', kinds: ['cosmos', 'dragonfly'], pat: 'tsuki' },
  10: { acc: '#F2C14E', word: '銀杏[いちょう] · 秋桜[コスモス]', vi: 'lá bạch quả, hoa cosmos', kinds: ['ginkgo'], pat: 'icho' },
  11: { acc: '#F08A4B', word: '紅葉[もみじ] · 落葉[おちば]', vi: 'lá đỏ, lá rụng', kinds: ['maple'], pat: 'momiji' },
  12: { acc: '#9EC9F5', word: '雪[ゆき] · 大晦日[おおみそか]', vi: 'tuyết, giao thừa', kinds: ['snow'], pat: 'yuki' },
};
const MONTH_VI = m => `Tháng ${m}`;

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

// ---------- ngày lễ ----------
const TET = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08' };
const TRUNGTHU = { 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19', 2033: '09-08', 2034: '09-27', 2035: '09-16' };
const SHOWERS = [['Quadrantid', 1, 3, 4], ['Lyrid', 4, 21, 22], ['Eta Aquariid', 5, 5, 6], ['Perseid', 8, 11, 13], ['Orionid', 10, 20, 22], ['Leonid', 11, 16, 18], ['Geminid', 12, 13, 14]];
const dayDiff = (d, y, md) => { if (!md) return null; const t = new Date(`${y}-${md}T00:00:00`); const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round((a - t) / 864e5); };
const HOL = {
  tet: { id: 'tet', vi: 'Tết Nguyên Đán', kinds: ['maiVang', 'dao'], acc: '#E53935' },
  trungthu: { id: 'trungthu', vi: 'Tết Trung thu', lantern: 'star', bigMoon: true },
  quockhanh: { id: 'quockhanh', vi: 'Quốc khánh 2/9' },
  shogatsu: { id: 'shogatsu', vi: 'お正月[しょうがつ] — năm mới' },
  setsubun: { id: 'setsubun', vi: '節分[せつぶん] — ném đậu đuổi quỷ', kinds: ['plum', 'bean'] },
  kodomo: { id: 'kodomo', vi: 'こどもの日[ひ] — cờ cá chép', koi: true },
  tanabata: { id: 'tanabata', vi: '七夕[たなばた] — Thất tịch', kinds: ['tanzaku', 'stardust'], milky: true },
  obon: { id: 'obon', vi: 'お盆[ぼん]', lantern: 'round' },
  tsukimi: { id: 'tsukimi', vi: '十五夜[じゅうごや] — trăng rằm', bigMoon: true },
  xmas: { id: 'xmas', vi: 'クリスマス — Giáng sinh', lights: true },
  oomisoka: { id: 'oomisoka', vi: '大晦日[おおみそか] — giao thừa' },
};
export const HOLIDAY_IDS = Object.keys(HOL);
export const HOLIDAYS = Object.values(HOL).map(h => [h.id, h.vi.replace(/\[[^\]]*\]/g, '')]); // tên để chọn (bỏ furigana)
export const seasonReduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const seasonOverrides = () => ({ ...OV });
function holidays(d) {
  const m = d.getMonth() + 1, dd = d.getDate(), h = d.getHours(), y = d.getFullYear(), out = [];
  if (S.fxHolVN) {
    const t = dayDiff(d, y, TET[y]);
    if (t != null && t >= -3 && t <= 3) out.push({ id: 'tet', vi: 'Tết Nguyên Đán', kinds: ['maiVang', 'dao'], acc: '#E53935', fw: (t === -1 && h >= 20) || (t === 0 && h < 2) || (t >= 0 && h >= 19) });
    const tt = dayDiff(d, y, TRUNGTHU[y]);
    if (tt != null && tt >= -2 && tt <= 1) out.push({ id: 'trungthu', vi: 'Tết Trung thu', lantern: 'star', bigMoon: tt === 0 });
    if (m === 9 && dd === 2) out.push({ id: 'quockhanh', vi: 'Quốc khánh 2/9', fw: h >= 19 });
  }
  if (S.fxHolJP) {
    if (m === 1 && dd <= 3) out.push({ id: 'shogatsu', vi: 'お正月[しょうがつ] — năm mới', fw: dd === 1 && h < 1 });
    if (m === 2 && dd === 3) out.push({ id: 'setsubun', vi: '節分[せつぶん] — ném đậu đuổi quỷ', kinds: ['plum', 'bean'] });
    if (m === 5 && dd >= 1 && dd <= 5) out.push({ id: 'kodomo', vi: 'こどもの日[ひ] — cờ cá chép', koi: true });
    if (m === 7 && dd === 7) out.push({ id: 'tanabata', vi: '七夕[たなばた] — Thất tịch', kinds: ['tanzaku', 'stardust'], milky: true });
    if (m === 8 && dd >= 13 && dd <= 16) out.push({ id: 'obon', vi: 'お盆[ぼん]', lantern: 'round' });
    if (m === 9 && TRUNGTHU[y] === `09-${String(dd).padStart(2, '0')}`) out.push({ id: 'tsukimi', vi: '十五夜[じゅうごや] — trăng rằm', bigMoon: true });
    if (m === 12 && (dd === 24 || dd === 25)) out.push({ id: 'xmas', vi: 'クリスマス — Giáng sinh', lights: true });
    if (m === 12 && dd === 31) out.push({ id: 'oomisoka', vi: '大晦日[おおみそか] — giao thừa', fw: h >= 21 });
  }
  return out;
}
const showerOf = d => { const m = d.getMonth() + 1, dd = d.getDate(); return SHOWERS.find(([, mm, a, b]) => mm === m && dd >= a && dd <= b)?.[0] || ''; };

// ---------- trăng: tuổi trăng (ngày âm lịch xấp xỉ) ----------
const SYN = 29.530588853;
export const moonAge = (t = Date.now()) => (((t - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % SYN + SYN) % SYN;

// ---------- bản thử (demo): ép tháng, buổi, nền, mưa, ngày lễ, mưa sao băng ----------
const OV = {};
export function seasonOverride(o) { for (const k of Object.keys(o)) { if (o[k] == null) delete OV[k]; else OV[k] = o[k]; } refresh(); }

// ---------- trạng thái ----------
const st = { on: false, dark: true, month: 10, hol: [], phase: 'day', rain: 0, snowW: false, thunder: false, wind: 0, gust: 0, gustT: 0, w: 0, h: 0, dpr: 1, run: false, last: 0 };
const fx = { parts: [], stars: [], clouds: [], meteors: [], planes: [], holes: [], fw: [], sparks: [], flies: [], lanterns: [], drops: [], bursts: [], flash: 0, bolt: null, koi: [] };
const timers = {};
let cv = null, ctx = null;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionOK = () => S.motion !== false && !reduced(); // chuyển động giao diện (trang trượt, bảng phóng to)
// v32: hiệu ứng nền (canvas) có công tắc riêng S.fxBg — không phụ thuộc "Chuyển động mượt"
const bgWanted = () => st.on && S.fxBg !== false;
const bgOK = () => bgWanted() && !reduced();
const dens = () => ({ low: 0.5, mid: 1, high: 1.8 })[S.fxDensity] || 1;
const spd = () => ({ slow: 0.55, mid: 1, fast: 1.6 })[S.fxSpeed] || 1;
const isDarkTheme = () => S.theme === 'dark' || (S.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
function phaseOf(d) { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night'; }
const night = () => st.phase === 'night' || (!S.fxDayNight && st.dark);
const curMonth = d => (S.season && S.season !== 'auto' && S.season !== 'off' ? +S.season : d.getMonth() + 1);

// ---------- mưa: mùa mưa (5/6–20/7) và vài ngày ngẫu nhiên — cố định theo ngày ----------
const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
function seasonRain(d) {
  const key = d.toISOString().slice(0, 10), r = hash('mua' + key), m = d.getMonth() + 1, dd = d.getDate();
  const tsuyu = (m === 6 && dd >= 5) || (m === 7 && dd <= 20);
  if (tsuyu) return r < 0.7 ? (r < 0.25 ? 2 : 1) : 0;
  if (m === 12 || m === 1 || m === 2) return 0;
  return r < 0.1 ? 1 : 0;
}
// ---------- thời tiết thật (Open-Meteo, miễn phí, không cần khoá) ----------
const WKEY = 'tn-weather';
function readW() { try { return JSON.parse(localStorage.getItem(WKEY) || 'null'); } catch { return null; } }
async function fetchWeather() {
  const city = (S.fxCity || '').trim();
  if (S.fxRain !== 'weather' || !city || !navigator.onLine) return;
  const old = readW();
  if (old && old.city === city && Date.now() - old.t < 30 * 60e3) return;
  try {
    let { lat, lon } = old && old.city === city ? old : {};
    if (lat == null) {
      const g = await (await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=ja`)).json();
      const r = g.results?.[0];
      if (!r) { localStorage.setItem(WKEY, JSON.stringify({ city, t: Date.now(), err: 'Không tìm thấy thành phố' })); return; }
      lat = r.latitude; lon = r.longitude;
    }
    const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,precipitation&timezone=auto`)).json();
    localStorage.setItem(WKEY, JSON.stringify({ city, lat, lon, t: Date.now(), code: w.current?.weather_code ?? null }));
    refresh();
  } catch { /* không có mạng: dùng mưa theo mùa */ }
}
export function weatherText() {
  const w = readW();
  if (!w || w.city !== (S.fxCity || '').trim()) return '';
  if (w.err) return w.err;
  const c = w.code;
  const t = c == null ? 'chưa rõ' : c >= 95 ? 'có giông' : (c >= 51 && c <= 67) || (c >= 80 && c <= 82) ? 'có mưa' : (c >= 71 && c <= 77) || c === 85 || c === 86 ? 'có tuyết' : c >= 45 && c <= 48 ? 'có sương mù' : c >= 2 ? 'nhiều mây' : 'trời quang';
  return `${w.city}: ${t} (cập nhật ${new Date(w.t).toTimeString().slice(0, 5)})`;
}
function rainState(d) {
  st.snowW = false; st.thunder = false;
  if (S.fxRain === 'off') return 0;
  if (S.fxRain === 'always') return 1;
  if (S.fxRain === 'weather') {
    const w = readW();
    if (w && w.city === (S.fxCity || '').trim() && w.code != null && Date.now() - w.t < 3 * 3600e3) {
      const c = w.code;
      if ((c >= 71 && c <= 77) || c === 85 || c === 86) { st.snowW = true; return 0; }
      if (c >= 95) { st.thunder = true; return 2; }
      if (c === 65 || c === 67 || c === 82) return 2;
      if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 1;
      return 0;
    }
  }
  return seasonRain(d);
}

// ---------- hoa văn nền (SVG lặp) ----------
function patSVG(kind, c, op) {
  const g = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><g fill="none" stroke="${c}" stroke-width="1" opacity="${op}">${body}</g></svg>`;
  const flower = (x, y, s, n = 5, rr = 'c') => Array.from({ length: n }, (_, i) => `<ellipse cx="${x}" cy="${y - 4 * s}" rx="${2.6 * s}" ry="${4 * s}" transform="rotate(${i * 360 / n} ${x} ${y})"/>`).join('') + `<circle cx="${x}" cy="${y}" r="${1.2 * s}" fill="${c}"/>`;
  switch (kind) {
    case 'kikko': return g(52, 90, '<path d="M13 0 39 0 52 22.5 39 45 13 45 0 22.5z M13 45 39 45 52 67.5 39 90 13 90 0 67.5z"/>');
    case 'ume': return g(110, 110, flower(28, 30, 1.6) + flower(80, 82, 1.1));
    case 'nano': return g(96, 96, flower(24, 26, 1.2, 4) + flower(70, 72, 0.9, 4));
    case 'sakura': return g(120, 120, flower(28, 30, 1.8) + flower(84, 86, 1.2));
    case 'asanoha': return g(60, 60, '<path d="M30 0v60M0 15l60 30M0 45l60-30M0 0l30 15 30-15M0 60l30-15 30 15"/>');
    case 'ame': return g(40, 40, '<path d="M8 4l-3 10M28 20l-3 10M18 30l-2 7"/>');
    case 'hoshi': return g(90, 90, '<path d="M20 14l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z M66 60l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><circle cx="70" cy="18" r="1" fill="' + c + '"/><circle cx="34" cy="70" r=".8" fill="' + c + '"/>');
    case 'seigaiha': { const arcs = (x, y) => [18, 13, 8, 3].map(r => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join(''); return g(40, 20, arcs(0, 10) + arcs(40, 10) + arcs(20, 20)); }
    case 'tsuki': return g(110, 110, '<path d="M30 18a12 12 0 1 0 10 18 9 9 0 1 1-10-18z"/><path d="M78 98c4-14 10-24 18-30M84 98c1-10 5-18 10-24"/>');
    case 'icho': return g(110, 110, '<path d="M30 40v-10c-4-1-12-4-12-10 5-5 9-6 12-6s8 1 12 6c0 6-8 9-12 10" transform="rotate(-20 30 30)"/><path d="M80 90v-8c-3-1-9-3-9-8 4-4 7-5 9-5s6 1 9 5c0 5-6 7-9 8" transform="rotate(25 80 80)"/>');
    case 'momiji': return g(120, 120, '<path d="M30 14l2 6 5-2-2 5 6 1-5 3 2 5-6-2-1 6h-1l-1-6-6 2 2-5-5-3 6-1-2-5 5 2z" transform="scale(1.4) translate(-8 -4)"/><path d="M84 70l2 6 5-2-2 5 6 1-5 3 2 5-6-2-1 6h-1l-1-6-6 2 2-5-5-3 6-1-2-5 5 2z"/>');
    default: return g(110, 110, [0, 60, 120].map(a => `<path d="M30 20v20M20 30h20" transform="rotate(${a} 30 30)"/>`).join('') + [0, 60, 120].map(a => `<path d="M80 74v12M74 80h12" transform="rotate(${a} 80 80)"/>`).join(''));
  }
}

// ---------- áp dụng màu, hoa văn, bầu trời ----------
const VARS = ['--bg', '--surface', '--surface-solid', '--surface-2', '--line', '--blue', '--blue-ink', '--blue-soft', '--season-pat', '--season-sky'];
function applyTheme() {
  const r = document.documentElement;
  if (!st.on) { VARS.forEach(v => r.style.removeProperty(v)); delete r.dataset.season; delete r.dataset.sky; return; }
  const hol = st.hol.find(h => h.acc), acc = hol ? hol.acc : M[st.month].acc, dark = st.dark;
  const set = (k, v) => r.style.setProperty(k, v);
  if (dark) {
    const sf = mix('#15212A', acc, 0.08);
    set('--bg', mix('#0D161C', acc, 0.07)); set('--surface', rgba(sf, 0.86)); set('--surface-solid', sf); set('--surface-2', mix('#1D2C36', acc, 0.1));
    set('--line', mix('#2A3C48', acc, 0.16)); set('--blue', mix(acc, '#FFFFFF', 0.08)); set('--blue-ink', '#0D161C'); set('--blue-soft', mix('#15212A', acc, 0.26));
  } else {
    set('--bg', mix('#EAF0F3', acc, 0.12)); set('--surface', 'rgba(255,255,255,.86)'); set('--surface-solid', '#FFFFFF'); set('--surface-2', mix('#DCE5EA', acc, 0.12));
    set('--line', mix('#C3D1D9', acc, 0.18)); set('--blue', mix(acc, '#000000', 0.48)); set('--blue-ink', '#FFFFFF'); set('--blue-soft', mix('#FFFFFF', acc, 0.2));
  }
  set('--season-pat', `url("data:image/svg+xml,${encodeURIComponent(patSVG(M[st.month].pat, acc, dark ? 0.11 : 0.16))}")`);
  const sky = !S.fxDayNight ? 'none' : {
    dawn: dark ? 'radial-gradient(130% 55% at 50% 0%, rgba(255,150,120,.20), transparent 70%)' : 'radial-gradient(130% 55% at 50% 0%, rgba(255,170,140,.35), transparent 70%)',
    day: dark ? 'radial-gradient(130% 50% at 50% 0%, rgba(120,180,255,.10), transparent 70%)' : 'radial-gradient(130% 50% at 50% 0%, rgba(150,200,255,.35), transparent 70%)',
    dusk: dark ? 'radial-gradient(130% 55% at 50% 0%, rgba(255,120,80,.22), rgba(120,60,140,.10) 45%, transparent 75%)' : 'radial-gradient(130% 55% at 50% 0%, rgba(255,150,100,.35), rgba(190,140,220,.18) 45%, transparent 75%)',
    night: dark ? 'radial-gradient(130% 60% at 50% 0%, rgba(40,70,140,.30), transparent 72%)' : 'radial-gradient(130% 55% at 50% 0%, rgba(90,100,170,.22), transparent 72%)',
  }[st.phase];
  set('--season-sky', sky);
  r.dataset.season = String(st.month);
  r.dataset.sky = st.phase;
}

// ---------- hạt ----------
function kindsNow() {
  if (st.snowW) return ['snow'];
  const h = st.hol.find(x => x.kinds);
  return h ? h.kinds : M[st.month].kinds;
}
function newPart(kind, init) {
  const k = KIND[kind], d = rnd(0.55, 1), cols = !st.dark && k.lc ? k.lc : k.c;
  const p = { kind, k, d, size: rnd(...k.z) * (0.7 + 0.3 * d), col: pick(cols), ph: rnd(0, 6.3), sw: k.sw * rnd(0.5, 1), rot: rnd(0, 6.3), vr: (k.r * Math.PI / 180) * rnd(-1, 1), a: rnd(0.55, 0.95) * (0.55 + 0.45 * d), flake: k.flakes && Math.random() < k.flakes };
  if (k.fly) { p.y = rnd(0.15, 0.8) * st.h; p.dir = Math.random() < 0.5 ? 1 : -1; p.x = init ? rnd(0, st.w) : (p.dir > 0 ? -30 : st.w + 30); p.vx = rnd(30, 60) * p.dir; p.t = 0; return p; }
  p.vy = rnd(...k.v) * (0.6 + 0.4 * d);
  p.x = rnd(-20, st.w + 20);
  p.y = init ? rnd(-20, st.h) : (p.vy < 0 ? st.h + 20 : -20);
  return p;
}
function seedParts() {
  fx.parts = [];
  if (!S.fxFall) return;
  for (const kind of kindsNow()) { const n = Math.round(KIND[kind].n * dens() * (st.w < 500 ? 0.75 : 1)); for (let i = 0; i < n; i++) fx.parts.push(newPart(kind, true)); }
}
function seedSky() {
  const n = Math.round(90 * dens() * (st.w < 500 ? 0.6 : 1));
  fx.stars = Array.from({ length: n }, () => ({ x: rnd(0, st.w), y: rnd(0, st.h * 0.65) * rnd(0.3, 1), r: rnd(0.4, 1.4), tw: rnd(0.6, 2.2), ph: rnd(0, 6.3) }));
  if (st.hol.some(h => h.milky)) for (let i = 0; i < 160; i++) { const t = Math.random(); fx.stars.push({ x: t * st.w + rnd(-40, 40), y: (0.05 + t * 0.4) * st.h + rnd(-40, 40), r: rnd(0.3, 0.9), tw: rnd(1, 3), ph: rnd(0, 6.3), milky: 1 }); }
  fx.clouds = Array.from({ length: st.w < 500 ? 2 : 4 }, () => ({ x: rnd(0, st.w), y: 80 + rnd(0, 0.25) * st.h, s: rnd(40, 80), v: rnd(5, 12), blobs: Array.from({ length: 5 }, () => [rnd(-1.2, 1.2), rnd(-0.35, 0.25), rnd(0.45, 0.8)]) }));
  fx.flies = [];
  const m = st.month;
  if (S.fxFireflies && night() && m >= 6 && m <= 8) fx.flies = Array.from({ length: Math.round(14 * dens()) }, () => ({ x: rnd(0, st.w), y: rnd(0.35, 0.95) * st.h, vx: rnd(-12, 12), vy: rnd(-8, 8), ph: rnd(0, 6.3), bl: rnd(1.5, 3.5) }));
  fx.drops = [];
  if (st.rain) for (let i = 0; i < Math.round((st.rain === 2 ? 150 : 70) * dens() * (st.w < 500 ? 0.6 : 1)); i++) fx.drops.push({ x: rnd(-50, st.w + 50), y: rnd(-st.h, st.h), v: rnd(600, 900), l: rnd(10, 18) });
}

// ---------- sự kiện ngẫu nhiên ----------
function every(name, a, b, f, first) {
  clearTimeout(timers[name]);
  const go = () => { if (st.run) f(); timers[name] = setTimeout(go, rnd(a, b) * 1000); };
  timers[name] = setTimeout(go, (first ?? rnd(a, b)) * 1000);
}
function meteor() {
  const x = rnd(0.2, 1.05) * st.w, y = rnd(-0.02, 0.3) * st.h, ang = rnd(2.4, 2.75), v = rnd(650, 950);
  fx.meteors.push({ x, y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: 0, max: rnd(0.6, 1), len: rnd(80, 160) });
}
function plane() {
  const dir = Math.random() < 0.5 ? 1 : -1;
  fx.planes.push({ x: dir > 0 ? -30 : st.w + 30, y: 72 + rnd(0, 0.22) * st.h, vx: dir * rnd(45, 70), vy: rnd(-4, 4), trail: [], tt: 0 });
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
function lantern(kind) { fx.lanterns.push({ kind, x: rnd(0.05, 0.95) * st.w, y: st.h + 20, vy: -rnd(14, 26), sw: rnd(8, 20), ph: rnd(0, 6.3), s: rnd(10, 16), col: kind === 'star' ? pick(['#FF5252', '#FFD740', '#FF9100']) : '#FFB74D' }); }
function schedule() {
  Object.keys(timers).forEach(k => clearTimeout(timers[k]));
  if (!st.on) return;
  const shower = st.shower;
  if (S.fxMeteor) every('meteor', shower ? 1.5 : 15, shower ? 5 : 45, () => { if (night()) meteor(); }, shower ? 3 : 8);
  if (S.fxPlane) every('plane', 70, 200, plane, rnd(20, 60));
  if (S.fxBlackhole) every('hole', 300, 600, blackHole, rnd(90, 150));
  if (S.fxWind) every('gust', 20, 50, gust);
  const fwOn = () => S.fxFireworks && ((st.month === 8 && night()) || st.hol.some(h => h.fw));
  every('fw', 3, 10, () => { if (fwOn()) firework(); }, 2);
  if (st.rain === 2 && S.fxLightning) every('bolt', 12, 35, lightning);
  if (st.hol.some(h => h.koi)) every('koi', 25, 60, koiFly, 6);
  const lan = st.hol.find(h => h.lantern);
  if (lan && S.fxLanterns) every('lantern', 1.2, 3, () => { if (lan.lantern === 'star' || night()) lantern(lan.lantern); }, 1);
}

// ---------- vẽ ----------
function drawPart(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.k.fly) { // chuồn chuồn
    ctx.rotate(p.dir > 0 ? 0 : Math.PI); ctx.globalAlpha = p.a;
    ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-p.size * 0.5, 0); ctx.lineTo(p.size * 0.5, 0); ctx.stroke();
    const fl = Math.sin(p.t * 40) * 0.25 + 0.75;
    ctx.fillStyle = st.dark ? 'rgba(220,235,255,.35)' : 'rgba(90,110,140,.25)';
    for (const sx of [0.12, -0.05]) for (const sy of [-1, 1]) { ctx.beginPath(); ctx.ellipse(p.size * sx, sy * p.size * 0.26 * fl, p.size * 0.32, p.size * 0.1, sy * 0.25, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  ctx.rotate(p.rot);
  const s = p.size / 20;
  ctx.scale(s, s);
  let a = p.a;
  if (p.k.tw) a *= 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.ph * 3));
  ctx.globalAlpha = a;
  if (p.flake) { ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke(SHAPE.flake); }
  else if (p.k.fill === 1 && p.k.s === 'ginkgo') { ctx.fillStyle = p.col; ctx.fill(SHAPE.ginkgo); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.stroke(SHAPE.ginkgo); }
  else { ctx.fillStyle = p.col; ctx.fill(SHAPE[p.k.s] || SHAPE.dot); }
  ctx.restore();
}
function drawMoon(big) {
  const age = moonAge(), k = age / SYN, f = (1 - Math.cos(2 * Math.PI * k)) / 2;
  const r = big ? 36 : 22, x = st.w - (big ? 84 : 60), y = big ? 124 : 104;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 3.2);
  g.addColorStop(0, st.dark ? 'rgba(255,240,200,.18)' : 'rgba(255,230,170,.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = st.dark ? '#FFF3CF' : '#F7E3A6'; ctx.fill();
  ctx.clip();
  ctx.fillStyle = st.dark ? 'rgba(13,22,28,.93)' : 'rgba(120,130,160,.55)';
  const off = 2 * r * f * (k < 0.5 ? -1 : 1);
  if (f < 0.98) { ctx.beginPath(); ctx.arc(x + off, y, r * 1.02, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
function drawPlane(pl, dt) {
  pl.x += pl.vx * dt; pl.y += pl.vy * dt; pl.tt += dt;
  if (pl.tt > 0.08) { pl.tt = 0; pl.trail.push({ x: pl.x - Math.sign(pl.vx) * 10, y: pl.y + 1, a: 1 }); }
  for (const t of pl.trail) t.a -= dt / (night() ? 3 : 7);
  pl.trail = pl.trail.filter(t => t.a > 0);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < pl.trail.length; i++) {
    const a = pl.trail[i - 1], b = pl.trail[i];
    ctx.strokeStyle = night() ? `rgba(200,210,230,${a.a * 0.18})` : `rgba(255,255,255,${a.a * (st.dark ? 0.35 : 0.85)})`;
    ctx.lineWidth = 1 + (1 - a.a) * 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.translate(pl.x, pl.y); if (pl.vx < 0) ctx.scale(-1, 1);
  ctx.fillStyle = night() ? 'rgba(40,50,60,.9)' : (st.dark ? 'rgba(210,220,235,.85)' : 'rgba(70,85,105,.75)');
  ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-8, -1.4); ctx.lineTo(-8, 1.4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-3, -7); ctx.lineTo(-5, -7); ctx.lineTo(-2, 0); ctx.lineTo(-5, 7); ctx.lineTo(-3, 7); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-9, -3.5); ctx.lineTo(-10, -3.5); ctx.lineTo(-8.5, 0); ctx.closePath(); ctx.fill();
  if (night()) { const on = Math.sin(performance.now() / 160) > 0.6; if (on) { ctx.fillStyle = '#FF4A4A'; ctx.fillRect(-4.5, -7.5, 2, 2); ctx.fillStyle = '#4AFF8A'; ctx.fillRect(-4.5, 5.5, 2, 2); } }
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
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
  ctx.restore();
  return k;
}
function step(now) {
  if (!st.run) return;
  requestAnimationFrame(step);
  if (now - st.last < 32) return; // ~30 khung hình/giây là đủ, đỡ tốn pin
  const dt = Math.min(0.1, (now - st.last) / 1000) * spd();
  st.last = now;
  const W = st.w, H = st.h, t = now / 1000;
  ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  // gió
  if (st.gustT > 0) st.gustT -= dt; else st.gust *= 0.96;
  const wind = (S.fxWind ? st.wind + st.gust : 0);
  // bầu trời
  if (S.fxStars && night()) {
    for (const s of fx.stars) { ctx.globalAlpha = (s.milky ? 0.45 : 0.35) + 0.5 * (0.5 + 0.5 * Math.sin(t * s.tw + s.ph)); ctx.fillStyle = st.dark ? '#E8F0FF' : '#5C6F86'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    drawMoon(st.hol.some(h => h.bigMoon));
  }
  if (S.fxClouds && !night() && S.fxDayNight) for (const c of fx.clouds) {
    c.x += (c.v + wind * 0.1) * dt; if (c.x - c.s * 2 > W) c.x = -c.s * 2; if (c.x + c.s * 2 < 0) c.x = W + c.s * 2;
    for (const [bx, by, br] of c.blobs) { const g = ctx.createRadialGradient(c.x + bx * c.s, c.y + by * c.s, 0, c.x + bx * c.s, c.y + by * c.s, br * c.s); g.addColorStop(0, st.dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x + bx * c.s, c.y + by * c.s, br * c.s, 0, Math.PI * 2); ctx.fill(); }
  }
  // sao băng
  for (const m of fx.meteors) {
    m.life += dt; m.x += m.vx * dt; m.y += m.vy * dt;
    const a = Math.max(0, 1 - m.life / m.max), n = Math.hypot(m.vx, m.vy);
    const tx = m.x - m.vx / n * m.len, ty = m.y - m.vy / n * m.len;
    const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
  }
  fx.meteors = fx.meteors.filter(m => m.life < m.max);
  // máy bay, cá chép
  for (const pl of fx.planes) drawPlane(pl, dt);
  fx.planes = fx.planes.filter(p => p.x > -60 || p.trail.length).filter(p => p.x < W + 60 || p.trail.length);
  for (const kf of fx.koi) {
    kf.x += kf.vx * dt; kf.t += dt;
    ctx.save(); ctx.translate(kf.x, kf.y); if (kf.vx < 0) ctx.scale(-1, 1);
    ['#2B2B2B', '#E53935', '#1E88E5'].forEach((c, i) => { const w = Math.sin(kf.t * 6 + i) * 3; ctx.fillStyle = c; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.ellipse(-i * 26, w, 13 - i * 2, 5 - i * 0.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(-i * 26 - 12, w); ctx.lineTo(-i * 26 - 20, w - 5); ctx.lineTo(-i * 26 - 20, w + 5); ctx.closePath(); ctx.fill(); });
    ctx.restore();
  }
  fx.koi = fx.koi.filter(k => k.x > -160 && k.x < W + 160);
  // hố đen: hút các hạt ở gần
  for (const hb of fx.holes) {
    const k = drawHole(hb, dt);
    for (const p of fx.parts) {
      const dx = hb.x - p.x, dy = hb.y - p.y, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
      if (d < 260 && d > 0) { const v = Math.min(900, 4e5 * k / Math.max(d2, 400)); p.x += ((dx / d) + (-dy / d) * 0.6) * v * dt; p.y += ((dy / d) + (dx / d) * 0.6) * v * dt; }
      if (d < hb.r * 0.8 * k) Object.assign(p, newPart(p.kind, false));
    }
  }
  fx.holes = fx.holes.filter(h => h.t < h.life);
  // pháo hoa
  for (const f of fx.fw) {
    f.y += f.vy * dt; f.vy += 140 * dt;
    ctx.fillStyle = `rgba(${f.hue.join(',')},.9)`; ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, Math.PI * 2); ctx.fill();
    if (f.y <= f.ty || f.vy >= -40) { f.done = 1; for (let i = 0; i < 56; i++) { const a = rnd(0, Math.PI * 2), v = rnd(60, 190); fx.sparks.push({ x: f.x, y: f.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: rnd(1.2, 1.9), hue: f.hue }); } }
  }
  fx.fw = fx.fw.filter(f => !f.done);
  for (const s of fx.sparks) { s.life += dt; s.vx *= 0.985; s.vy = s.vy * 0.985 + 70 * dt; s.x += s.vx * dt; s.y += s.vy * dt; const a = Math.max(0, 1 - s.life / s.max); ctx.fillStyle = `rgba(${s.hue.join(',')},${a})`; ctx.beginPath(); ctx.arc(s.x, s.y, 1.8, 0, Math.PI * 2); ctx.fill(); }
  fx.sparks = fx.sparks.filter(s => s.life < s.max);
  // đèn lồng
  for (const l of fx.lanterns) {
    l.y += l.vy * dt; l.ph += dt; const x = l.x + Math.sin(l.ph * 0.8) * l.sw;
    ctx.save(); ctx.translate(x, l.y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, l.s * 2.4); g.addColorStop(0, rgba(l.col, 0.35)); g.addColorStop(1, rgba(l.col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, l.s * 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = l.col; ctx.globalAlpha = 0.9;
    if (l.kind === 'star') { ctx.rotate(Math.sin(l.ph) * 0.2); ctx.scale(l.s / 10, l.s / 10); ctx.fill(SHAPE.star5); }
    else { ctx.beginPath(); ctx.ellipse(0, 0, l.s * 0.7, l.s, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  fx.lanterns = fx.lanterns.filter(l => l.y > -60);
  // đom đóm
  for (const f of fx.flies) {
    f.ph += dt; f.vx += rnd(-20, 20) * dt; f.vy += rnd(-20, 20) * dt; f.vx *= 0.98; f.vy *= 0.98; f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.x < 0) f.x = W; if (f.x > W) f.x = 0; if (f.y < H * 0.3) f.vy += 10 * dt; if (f.y > H) f.y = H * 0.4;
    const a = 0.1 + 0.9 * Math.max(0, Math.sin(f.ph * f.bl));
    const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 9); g.addColorStop(0, `rgba(255,246,170,${a})`); g.addColorStop(1, 'rgba(255,236,140,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(f.x, f.y, 9, 0, Math.PI * 2); ctx.fill();
  }
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
  for (const b of fx.bursts) { b.life += dt / spd(); b.vy += 260 * dt / spd(); b.vx *= 0.985; b.x += b.vx * dt / spd(); b.y += b.vy * dt / spd(); b.rot += b.vr * dt; b.a = Math.max(0, 1 - b.life / b.max); drawPart(b); }
  fx.bursts = fx.bursts.filter(b => b.life < b.max);
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
  st.dpr = Math.min(devicePixelRatio || 1, 1.5);
  st.w = innerWidth; st.h = innerHeight;
  cv.width = Math.round(st.w * st.dpr); cv.height = Math.round(st.h * st.dpr);
  seedParts(); seedSky();
}
function startLoop() {
  const want = bgOK() && !document.hidden;
  if (want && !st.run) { st.run = true; st.last = performance.now(); requestAnimationFrame(step); }
  if (!want) { st.run = false; if (ctx) ctx.clearRect(0, 0, cv.width, cv.height); }
  if (cv) cv.hidden = !want;
}
function refresh() {
  const d = new Date();
  st.on = S.season !== 'off';
  st.dark = OV.dark ?? isDarkTheme();
  st.month = OV.month ?? curMonth(d);
  st.phase = OV.phase ?? (S.fxDayNight ? phaseOf(d) : (st.dark ? 'night' : 'day'));
  st.hol = !st.on ? [] : OV.hol ? [{ ...HOL[OV.hol], fw: ['tet', 'quockhanh', 'oomisoka', 'shogatsu'].includes(OV.hol) }] : holidays(d);
  st.rain = !st.on ? 0 : OV.rain ?? rainState(d);
  if (OV.rain != null) { st.thunder = OV.rain === 2; st.snowW = false; }
  st.shower = OV.shower ?? (S.fxMeteor ? showerOf(d) : '');
  st.wind = S.fxWind ? ({ 3: 10, 4: 12, 10: 14, 11: 16, 12: 8 }[st.month] || 6) : 0;
  document.documentElement.classList.toggle('calm', !motionOK());
  applyTheme();
  if (cv) { seedParts(); seedSky(); }
  schedule();
  startLoop();
}

// ---------- dùng ở chỗ khác ----------
// Chùm hạt nhỏ của tháng ở một điểm (trả lời đúng, màn kết quả)
export function seasonBurst(x, y, n = 14) {
  if (!st.on || !S.fxBurst || !st.run) return;
  const kinds = kindsNow().filter(k => !KIND[k].fly);
  for (let i = 0; i < n; i++) {
    const p = newPart(pick(kinds.length ? kinds : ['sakura']), true), a = rnd(-Math.PI, 0), v = rnd(120, 260);
    Object.assign(p, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: rnd(0.9, 1.4), a: 1, size: p.size * 1.15 });
    fx.bursts.push(p);
  }
}
export const burstAtEl = (el, n) => { if (!el) return; const r = el.getBoundingClientRect(); seasonBurst(r.left + r.width / 2, r.top + r.height / 2, n); };
// Thử ngay một hiệu ứng (nút trong Cài đặt)
export function seasonTry(name) {
  if (!st.run) return false;
  ({ meteor, shower: () => { for (let i = 0; i < 8; i++) setTimeout(meteor, i * 350); }, plane, hole: () => { fx.holes = []; blackHole(); }, fw: () => { for (let i = 0; i < 4; i++) setTimeout(() => firework(), i * 400); }, bolt: lightning, gust, koi: koiFly,
    lantern: () => { for (let i = 0; i < 6; i++) setTimeout(() => lantern(Math.random() < 0.5 ? 'star' : 'round'), i * 300); }, burst: () => seasonBurst(innerWidth / 2, innerHeight / 2, 30) })[name]?.();
  return true;
}
// Chip mùa trên Trang chủ
export function seasonChipHTML() {
  if (!st.on) return '';
  const m = M[st.month], hol = st.hol.map(h => h.vi), shower = S.fxMeteor ? st.shower : '';
  const extra = [...hol.map(rich), shower ? `Mưa sao băng ${shower}${night() ? ' — đêm nay' : ' — tối nay'}` : '', st.rain ? (st.rain === 2 ? 'Mưa to' : 'Mưa') : '', st.snowW ? 'Tuyết' : ''].filter(Boolean);
  return `<p class="season-chip"><b>${MONTH_VI(st.month)}</b> · <span lang="ja">${rich(m.word)}</span> <span class="muted">— ${m.vi}</span>${extra.length ? `<br><span class="season-x">${extra.join(' · ')}</span>` : ''}</p>`;
}
export const seasonOn = () => st.on;

export function initSeason() {
  cv = document.createElement('canvas');
  cv.id = 'fx'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  ctx = cv.getContext('2d');
  resize();
  let rsT = 0, wfT = 0;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(resize, 150); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); else startLoop(); });
  addEventListener('tn-settings', () => { refresh(); clearTimeout(wfT); wfT = setTimeout(fetchWeather, 1500); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', refresh);
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', refresh);
  setInterval(() => { refresh(); fetchWeather(); }, 10 * 60e3); // đổi giờ (ngày – đêm), đổi ngày, thời tiết
  refresh();
  fetchWeather();
  watchResults();
}

// ---------- màn kết quả: điểm đếm lên + chùm hạt ----------
function watchResults() {
  const view = document.getElementById('view');
  if (!view) return;
  new MutationObserver(() => {
    const r = view.querySelector('.result:not([data-fx])');
    if (!r) return;
    r.dataset.fx = '1';
    const b = r.querySelector('.result-score b');
    if (b && motionOK()) {
      const n = parseInt(b.textContent, 10);
      if (n > 0) { const t0 = performance.now(), dur = Math.min(900, 300 + n * 25); const tick = now => { const k = Math.min(1, (now - t0) / dur); b.textContent = String(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); }; b.textContent = '0'; requestAnimationFrame(tick); }
    }
    setTimeout(() => burstAtEl(b || r, 30), 250);
  }).observe(view, { childList: true, subtree: true });
}
