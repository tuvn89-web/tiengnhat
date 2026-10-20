// Giao diện mùa (v31): 12 tháng · ngày – đêm · mưa · ngày lễ Nhật & Việt Nam · hiệu ứng vẽ trên một canvas nằm sau nội dung.
// Mỗi hiệu ứng bật / tắt riêng trong Cài đặt; tôn trọng "giảm chuyển động" của máy; dừng vẽ khi app chạy nền.
import { S } from './settings.js';
import { rich } from './util.js';
import { createFx, moonAge as moonAge0, SYN as SYN0 } from './fxcore.js';

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

// ---------- ngày lễ ----------
const TET = { 2026: '02-17', 2027: '02-06', 2028: '01-26', 2029: '02-13', 2030: '02-03', 2031: '01-23', 2032: '02-11', 2033: '01-31', 2034: '02-19', 2035: '02-08' };
const TRUNGTHU = { 2026: '09-25', 2027: '09-15', 2028: '10-03', 2029: '09-22', 2030: '09-12', 2031: '10-01', 2032: '09-19', 2033: '09-08', 2034: '09-27', 2035: '09-16' };
const SHOWERS = [['Quadrantid', 1, 3, 4], ['Lyrid', 4, 21, 22], ['Eta Aquariid', 5, 5, 6], ['Perseid', 8, 11, 13], ['Orionid', 10, 20, 22], ['Leonid', 11, 16, 18], ['Geminid', 12, 13, 14]];
const dayDiff = (d, y, md) => { if (!md) return null; const t = new Date(`${y}-${md}T00:00:00`); const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round((a - t) / 864e5); };
const HOL = {
  tet: { id: 'tet', vi: 'Tết Nguyên Đán', kinds: ['maiVang', 'dao'], acc: '#E53935' },
  trungthu: { id: 'trungthu', vi: 'Tết Trung thu', lantern: 'star', bigMoon: true , acc: '#F59E0B' },
  quockhanh: { id: 'quockhanh', vi: 'Quốc khánh 2/9' , acc: '#DA251D' },
  shogatsu: { id: 'shogatsu', vi: 'お正月[しょうがつ] — năm mới' , acc: '#C8102E' },
  setsubun: { id: 'setsubun', vi: '節分[せつぶん] — ném đậu đuổi quỷ', kinds: ['plum', 'bean'] , acc: '#D9822B' },
  kodomo: { id: 'kodomo', vi: 'こどもの日[ひ] — cờ cá chép', koi: true , acc: '#2F6FED' },
  tanabata: { id: 'tanabata', vi: '七夕[たなばた] — Thất tịch', kinds: ['tanzaku', 'stardust'], milky: true , acc: '#6C63FF' },
  obon: { id: 'obon', vi: 'お盆[ぼん]', lantern: 'round' , acc: '#F97316' },
  tsukimi: { id: 'tsukimi', vi: '十五夜[じゅうごや] — trăng rằm', bigMoon: true , acc: '#E0B43C' },
  xmas: { id: 'xmas', vi: 'クリスマス — Giáng sinh', lights: true , acc: '#1F9D55' },
  oomisoka: { id: 'oomisoka', vi: '大晦日[おおみそか] — giao thừa' , acc: '#D4A017' },
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
    if (tt != null && tt >= -2 && tt <= 1) out.push({ id: 'trungthu', vi: 'Tết Trung thu', lantern: 'star', bigMoon: tt === 0, acc: '#F59E0B' });
    if (m === 9 && dd === 2) out.push({ id: 'quockhanh', vi: 'Quốc khánh 2/9', fw: h >= 19, acc: '#DA251D' });
  }
  if (S.fxHolJP) {
    if (m === 1 && dd <= 3) out.push({ id: 'shogatsu', vi: 'お正月[しょうがつ] — năm mới', fw: dd === 1 && h < 1, acc: '#C8102E' });
    if (m === 2 && dd === 3) out.push({ id: 'setsubun', vi: '節分[せつぶん] — ném đậu đuổi quỷ', kinds: ['plum', 'bean'], acc: '#D9822B' });
    if (m === 5 && dd >= 1 && dd <= 5) out.push({ id: 'kodomo', vi: 'こどもの日[ひ] — cờ cá chép', koi: true, acc: '#2F6FED' });
    if (m === 7 && dd === 7) out.push({ id: 'tanabata', vi: '七夕[たなばた] — Thất tịch', kinds: ['tanzaku', 'stardust'], milky: true, acc: '#6C63FF' });
    if (m === 8 && dd >= 13 && dd <= 16) out.push({ id: 'obon', vi: 'お盆[ぼん]', lantern: 'round', acc: '#F97316' });
    if (m === 9 && TRUNGTHU[y] === `09-${String(dd).padStart(2, '0')}`) out.push({ id: 'tsukimi', vi: '十五夜[じゅうごや] — trăng rằm', bigMoon: true, acc: '#E0B43C' });
    if (m === 12 && (dd === 24 || dd === 25)) out.push({ id: 'xmas', vi: 'クリスマス — Giáng sinh', lights: true, acc: '#1F9D55' });
    if (m === 12 && dd === 31) out.push({ id: 'oomisoka', vi: '大晦日[おおみそか] — giao thừa', fw: h >= 21, acc: '#D4A017' });
  }
  return out;
}
const showerOf = d => { const m = d.getMonth() + 1, dd = d.getDate(); return SHOWERS.find(([, mm, a, b]) => mm === m && dd >= a && dd <= b)?.[0] || ''; };


// ---------- trăng: tuổi trăng (ngày âm lịch xấp xỉ) — tính ở fxcore.js ----------
export const moonAge = moonAge0;
export const SYN = SYN0;

// ---------- bản thử (demo): ép tháng, buổi, nền, mưa, ngày lễ, mưa sao băng ----------
const OV = {};
export function seasonOverride(o) { for (const k of Object.keys(o)) { if (o[k] == null) delete OV[k]; else OV[k] = o[k]; } refresh(); }


// ---------- trạng thái (ở luồng chính: mùa, ngày lễ, mưa… — phần vẽ ở fxcore.js) ----------
const st = { on: false, dark: true, month: 10, hol: [], phase: 'day', rain: 0, snowW: false, thunder: false, shower: '', wind: 0 };
// v37: tần số quét màn hình (đo bằng khoảng cách các khung requestAnimationFrame) và mức chi tiết tự giảm khi máy không theo kịp
const HZ = { v: 60, ok: false };
const HZ_STEPS = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 180, 240];
function measureHz() {
  if (document.hidden) return;
  const d = []; let last = 0;
  const f = t => { if (last) d.push(t - last); last = t; if (d.length < 40) return requestAnimationFrame(f);
    d.sort((a, b) => a - b); const med = d[d.length >> 1] || 16.7;
    const hz = HZ_STEPS.reduce((a, b) => (Math.abs(b - 1000 / med) < Math.abs(a - 1000 / med) ? b : a));
    const ch = hz !== HZ.v; HZ.v = hz; HZ.ok = true; if (ch) dispatchEvent(new CustomEvent('tn-hz')); };
  requestAnimationFrame(f);
}
export const screenHz = () => HZ.v;
let FXS = { fps: 0, q: 0 }; // số khung/giây và mức chi tiết của nền (bộ vẽ báo về mỗi giây)
export const fxFpsNow = () => (drv && wantRun() ? FXS.fps : 0);
export const fxQuality = () => FXS.q;
export const fxGap = () => FXS.gap || 0; // khung nền bị nghẽn lâu nhất trong giây qua (ms)
export const fxThread = () => drv?.kind || ''; // 'worker' = vẽ ở luồng riêng, 'main' = luồng chính

let cv = null;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionOK = () => S.motion !== false && !reduced(); // chuyển động giao diện (trang trượt, bảng phóng to)
// v32: hiệu ứng nền (canvas) có công tắc riêng S.fxBg — không phụ thuộc "Chuyển động mượt"
const bgWanted = () => st.on && S.fxBg !== false;
const bgOK = () => bgWanted() && !reduced();
const isDarkTheme = () => S.theme === 'dark' || (S.theme !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
function phaseOf(d) { const h = d.getHours() + d.getMinutes() / 60; return h >= 5 && h < 7 ? 'dawn' : h >= 7 && h < 17 ? 'day' : h >= 17 && h < 19 ? 'dusk' : 'night'; }
const night = () => st.phase === 'night' || (!S.fxDayNight && st.dark);
const curMonth = d => (S.season && S.season !== 'auto' && S.season !== 'off' ? +S.season : d.getMonth() + 1);
const wantRun = () => bgOK() && !document.hidden;

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
  // v42: ngày lễ nào cũng có màu riêng (như Tết); đêm có mưa sao băng thì ngả tím
  const hol = st.hol.find(h => h.acc), acc = hol ? hol.acc : (st.shower && night() ? '#7C83FD' : M[st.month].acc), dark = st.dark;
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

// ---------- bộ vẽ: luồng riêng (Worker + OffscreenCanvas) nếu máy hỗ trợ, không thì luồng chính ----------
let drv = null;
const fxS = () => Object.fromEntries(Object.entries(S).filter(([k]) => k.startsWith('fx')));
const env = () => ({ on: st.on, dark: st.dark, month: st.month, phase: st.phase, hol: st.hol, rain: st.rain, snowW: st.snowW, thunder: st.thunder,
  shower: st.shower, wind: st.wind, kinds: kindsNow(), want: wantRun(), hz: HZ.v });
function newCanvas() {
  const c = document.createElement('canvas');
  c.id = 'fx'; c.setAttribute('aria-hidden', 'true');
  return c;
}
function mainDriver() {
  const eng = createFx({
    makeCanvas: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; },
    raf: f => requestAnimationFrame(f),
    onStats: s => { FXS = s; },
  });
  eng.setHz(HZ.v);
  eng.resize(innerWidth, innerHeight, devicePixelRatio || 1);
  eng.setCanvas(cv);
  return { kind: 'main', config: (s, e, o) => eng.config(s, e, o), resize: (w, h, d) => eng.resize(w, h, d), hz: v => eng.setHz(v), burst: (x, y, n) => eng.burst(x, y, n), tryFx: n => eng.tryFx(n) };
}
function workerDriver() {
  if (typeof OffscreenCanvas !== 'function' || !('transferControlToOffscreen' in HTMLCanvasElement.prototype) || typeof Worker !== 'function') return null;
  let w;
  try { w = new Worker(new URL('./fxworker.js', import.meta.url), { type: 'module' }); } catch { return null; }
  let off;
  try { off = cv.transferControlToOffscreen(); } catch { w.terminate(); return null; }
  const d = { kind: 'worker', w, post: m => { try { w.postMessage(m); } catch { } } };
  w.onmessage = e => { const m = e.data; if (m.type === 'stats') FXS = { fps: m.fps, q: m.q, gap: m.gap }; else if (m.type === 'fail') toMain(); };
  w.onerror = () => toMain();
  w.postMessage({ type: 'init', canvas: off, w: innerWidth, h: innerHeight, dpr: devicePixelRatio || 1, hz: HZ.v, S: fxS(), env: env() }, [off]);
  Object.assign(d, {
    config: (s, e, o) => d.post({ type: 'config', S: s, env: e, o }), resize: (W, H, r) => d.post({ type: 'resize', w: W, h: H, dpr: r }),
    hz: v => d.post({ type: 'hz', v }), burst: (x, y, n) => d.post({ type: 'burst', x, y, n }), tryFx: n => d.post({ type: 'try', name: n }),
  });
  return d;
}
// luồng riêng hỏng (trình duyệt thiếu tính năng, lỗi) → bỏ, vẽ ở luồng chính như trước
function toMain() {
  if (drv?.kind !== 'worker') return;
  try { drv.w.terminate(); } catch { }
  const c = newCanvas();
  cv.replaceWith(c); cv = c;
  drv = mainDriver();
  refresh();
}

function refresh({ requality = false } = {}) {
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
  drv?.config(fxS(), env(), { requality });
  if (cv) cv.hidden = !wantRun();
}
// chỉ bật / tắt vẽ (app chạy nền / trở lại), không gieo lại hạt
function setRun() { drv?.config(fxS(), env(), { reseed: false }); if (cv) cv.hidden = !wantRun(); }

// ---------- dùng ở chỗ khác ----------
// Chùm hạt nhỏ của tháng ở một điểm (trả lời đúng, màn kết quả)
export function seasonBurst(x, y, n = 14) {
  if (!st.on || !S.fxBurst || !wantRun()) return;
  drv?.burst(x, y, n);
}
export const burstAtEl = (el, n) => { if (!el) return; const r = el.getBoundingClientRect(); seasonBurst(r.left + r.width / 2, r.top + r.height / 2, n); };
// Thử ngay một hiệu ứng (nút trong Cài đặt)
export function seasonTry(name) {
  if (!drv || !wantRun()) return false;
  drv.tryFx(name);
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
  cv = newCanvas();
  document.body.prepend(cv);
  refresh(); // tính mùa, ngày lễ… trước khi gửi cho bộ vẽ
  drv = workerDriver() || mainDriver();
  refresh();
  setTimeout(measureHz, 600); // v37: đo tần số quét khi app đã mở xong (lúc đầu máy còn bận nạp dữ liệu)
  let rsT = 0, wfT = 0;
  addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { drv?.resize(innerWidth, innerHeight, devicePixelRatio || 1); measureHz(); }, 150); }); // kéo cửa sổ sang màn hình khác
  addEventListener('tn-hz', () => drv?.hz(HZ.v));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { refresh(); setTimeout(measureHz, 300); } else setRun(); });
  addEventListener('tn-settings', () => { refresh({ requality: true }); clearTimeout(wfT); wfT = setTimeout(fetchWeather, 1500); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => refresh());
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', () => refresh());
  setInterval(() => { refresh(); fetchWeather(); }, 10 * 60e3); // đổi giờ (ngày – đêm), đổi ngày, thời tiết
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
