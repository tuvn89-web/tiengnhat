import { kvGet, kvSet } from './db.js';

// Cài đặt để riêng từng máy (không đồng bộ) — vì máy tính và điện thoại cần cỡ chữ khác nhau.
export const DEFAULTS = {
  theme: 'auto',      // auto | light | dark
  fsJp: 32,           // cỡ chữ tiếng Nhật ở câu hỏi (px)
  fsVi: 17,           // cỡ chữ tiếng Việt (px)
  btn: 'md',          // sm | md | lg | xl
  jpFont: 'gothic',   // gothic | mincho
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
}
