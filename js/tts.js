import { S } from './settings.js';

// Giọng đọc tiếng Nhật có sẵn trong máy. Ưu tiên giọng cài trong máy (đọc được khi offline).
let voices = [];
const has = () => 'speechSynthesis' in window;
function load() {
  if (!has()) return;
  voices = speechSynthesis.getVoices().filter(v => /^ja/i.test(v.lang));
}
if (has()) { load(); speechSynthesis.addEventListener?.('voiceschanged', load); }

export const ttsReady = () => has() && voices.length > 0;
export const jaVoices = () => voices;

export function pickVoice() {
  return voices.find(v => v.name === S.voice) || voices.find(v => v.localService) || voices[0] || null;
}
export function speak(text) {
  if (!has() || !text) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = S.rate || 0.9;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
