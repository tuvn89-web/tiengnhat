import { kvGet, kvSet } from './db.js';
import { applyFonts } from './fonts.js';

// Cài đặt để riêng từng máy (không đồng bộ) — vì máy tính và điện thoại cần cỡ chữ khác nhau.
export const DEFAULTS = {
  theme: 'auto',      // auto | light | dark
  fsJp: 32,           // cỡ chữ tiếng Nhật ở câu hỏi (px)
  fsVi: 17,           // cỡ chữ tiếng Việt (px)
  btn: 'md',          // sm | md | lg | xl
  jpFont: 'gothic',   // gothic | mincho | v32: thêm phông viết tay, thư pháp, mềm mại (xem fonts.js)
  viFont: 'system',   // v32: phông chữ tiếng Việt (xem fonts.js)
  script: 'furi',     // kana | furi  (kanji luôn kèm furigana)
  showHv: true,       // hiện âm Hán Việt
  qCount: 20,
  matchRounds: 3,
  introNew: true,
  autoNext: 0,        // ms, 0 = tắt
  vibrate: true,
  sound: true,
  voice: '',
  rate: 0.9,
  autoSpeak: false,
  romaji: true,       // ô gõ tiếng Nhật: gõ romaji tự đổi sang kana
  slowSec: 8,         // v31: trả lời đúng mà nghĩ quá số giây này thì chưa lên hộp (0 = tắt)
  // v31: giao diện mùa & hiệu ứng (bật / tắt riêng từng thứ)
  season: 'auto',     // auto (theo tháng) | off | '1'…'12' (giữ một tháng)
  motion: true,       // chuyển động giao diện (trang trượt, bảng phóng to, điểm đếm lên)
  fxBg: true,         // v32: hiệu ứng nền (canvas: hạt rơi, trời, mưa…) — công tắc chung, có nút nhỏ ở góc dưới
  fxFall: true, fxDensity: 'mid', fxSpeed: 'mid', fxFps: 'auto',
  fxDayNight: true, fxClouds: true, fxStars: true, fxMeteor: true, fxPlane: true, fxBlackhole: true, fxConst: true, fxMilky: true,
  fxFireworks: true, fxFireflies: true, fxLanterns: true, fxHolVN: true, fxHolJP: true, fxWind: true, fxLightning: true,
  fxRain: 'season',   // season (mùa mưa + vài ngày) | weather (thời tiết thật) | always | off
  fxCity: '',         // thành phố lấy thời tiết thật
  fxBurst: true,      // chùm hạt khi trả lời đúng, ở màn kết quả
  deviceName: '',
};
export const S = { ...DEFAULTS };
const BTN_H = { sm: 44, md: 54, lg: 64, xl: 76 };

export async function loadSettings() {
  Object.assign(S, await kvGet('settings', {}));
  if (S.script !== 'kana') S.script = 'furi';
  delete S.furi;
  if (!S.deviceName) S.deviceName = /Android/i.test(navigator.userAgent) ? 'dien-thoai' : 'may-tinh';
  applySettings();
}
export async function saveSettings() {
  await kvSet('settings', { ...S });
  try { localStorage.setItem('tn-theme', S.theme); } catch { }
  applySettings();
}
export async function resetSettings() {
  const dn = S.deviceName;
  Object.assign(S, DEFAULTS, { deviceName: dn });
  await saveSettings();
}
export function applySettings() {
  const r = document.documentElement;
  if (S.theme === 'auto') delete r.dataset.theme; else r.dataset.theme = S.theme;
  r.style.setProperty('--fs-jp', S.fsJp + 'px');
  r.style.setProperty('--fs-vi', S.fsVi + 'px');
  r.style.setProperty('--btn-h', (BTN_H[S.btn] || 54) + 'px');
  r.dataset.jpfont = S.jpFont;
  try { applyFonts(S); } catch { }
  window.dispatchEvent(new Event('tn-settings'));
}
