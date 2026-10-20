// v41: câu chữ Hán để trần (không furigana) — công tắc 3 mức và nút "Chưa học" cho chữ Hán.
//  • Tắt: không hỏi để trần ở các chỗ app tự trộn (Trộn, Ôn hỗn hợp, Ôn nhanh, luyện trong bài, Đã đánh dấu…);
//    lịch ôn hướng "đọc chữ Hán" tạm chờ (không tính đến hạn), bật lại thì chạy tiếp.
//  • Theo trình độ (mặc định): chỉ từ thuộc cấp đã qua / đang học VÀ mọi chữ Hán trong từ đã học thẻ chữ (không gắn "cần học lại").
//  • Luôn: như trước v41.
// Xếp lớp, Thi vượt cấp, Thi thử: luôn như đề thật, không theo công tắc. Nhóm luyện mặt chữ (thẻ chữ, chữ trông giống, kana) không đổi;
// Đếm số và Ghép cặp Kana – Kanji ở mức "Theo trình độ" chỉ lấy chữ đã học.
import { D, LEVELS, setPrefs } from './data.js';
import { status, progVersion, setDirFilter, setRelearn, isRelearn, bumpProgress } from './srs.js';
import { esc, kanjiChars, toast } from './util.js';
import { passedLevels } from './level.js';
import { kanaDone } from './kana.js';
import { readHint } from './quiz.js';

export const BARE_MODES = [['off', 'Tắt'], ['level', 'Theo trình độ'], ['always', 'Luôn']];
export const bareMode = () => (['off', 'level', 'always'].includes(D.prefs.bareMode) ? D.prefs.bareMode : 'level');
export const bareHintOn = () => D.prefs.bareHint !== false;
export async function setBare(patch) {
  await setPrefs(patch);
  bumpProgress(); // số mục đến hạn, danh sách ôn… tính lại
}

// ---------- điều kiện (nhớ tạm tới khi tiến độ / kho / công tắc đổi) ----------
let _key = '', _lv = null, _ok = new Map();
function fresh() {
  const k = `${progVersion()}:${D.items.size}:${bareMode()}:${D.tests ? Object.keys(D.tests).length : 0}`;
  if (k === _key) return;
  _key = k; _ok = new Map();
  const passed = passedLevels();
  const cur = kanaDone() ? LEVELS.find(L => !passed.has(L)) : null;
  _lv = new Set([...passed, ...(cur ? [cur] : [])]);
}
// chữ đã học: có thẻ chữ, đã học thẻ đó, không gắn "cần học lại"
export function kanjiLearned(c) {
  const k = D.kanjiByChar.get(c);
  return !!k && status(k) !== 'new' && !isRelearn(k.id);
}
// từ này có được hỏi để trần (Kanji → cách đọc) không
export function bareOK(it) {
  if (!it?.kanji) return false;
  const m = bareMode();
  if (m === 'always') return true;
  if (m === 'off') return false;
  fresh();
  let r = _ok.get(it.id);
  if (r == null) { r = _lv.has(it.level) && kanjiChars(it.kanji).every(kanjiLearned); _ok.set(it.id, r); }
  return r;
}
// Đếm số, Ghép cặp Kana – Kanji: ở mức "Theo trình độ" chỉ lấy chữ đã học
export const charsOK = s => bareMode() !== 'level' || kanjiChars(s || '').every(kanjiLearned);
// gợi ý dưới chữ để trần: nghĩa tiếng Việt (công tắc), không thì như cũ (chỉ khi có từ khác cùng chữ viết)
export const bareHintHTML = it => (bareHintOn() ? `<p class="prompt-sub">${esc(it.vi)}</p>` : readHint(it));

// lịch ôn hướng "đọc chữ Hán" chỉ đến hạn khi từ đủ điều kiện hỏi để trần
setDirFilter((it, d) => d !== 'kr' || bareOK(it));

// ---------- nút "Chưa học" ----------
// dải chữ Hán của từ (sau khi trả lời câu để trần): mỗi chữ có thẻ một nút bật / tắt "Chưa học"
export function relearnStripHTML(it) {
  const ks = kanjiChars(it?.kanji || '').map(c => D.kanjiByChar.get(c)).filter(Boolean);
  if (!ks.length) return '';
  return `<div class="rl-strip" data-bare><span class="muted small">Chữ Hán trong từ — chưa học chữ nào thì bấm:</span>
    ${ks.map(k => rlBtnHTML(k)).join('')}</div>`;
}
export const rlBtnHTML = (k, cls = '') => {
  const on = isRelearn(k.id);
  return `<button type="button" class="rl-btn ${cls}" data-rl="${esc(k.id)}" aria-pressed="${on}"><b lang="ja">${esc(k.char)}</b><span>${esc(k.hv || '')}</span><small>${on ? '↺ cần học lại' : 'Chưa học'}</small></button>`;
};
// gắn / gỡ nhãn; trả về true nếu vừa gắn. onChange(on) để màn hình đang mở cập nhật (hiện furigana, bỏ tính điểm…)
export async function toggleRelearn(id, { onChange } = {}) {
  const k = D.items.get(id);
  if (!k) return false;
  const on = !isRelearn(id);
  await setRelearn(id, on);
  syncBtns(id);
  onChange?.(on);
  toast(on ? `Đã đánh dấu chưa học chữ ${k.char} — từ có chữ này sẽ hiện furigana; chữ lên đầu "Học chữ Hán mới".` : `Đã gỡ nhãn cần học lại của chữ ${k.char}.`, {
    action: 'Hoàn tác', onAction: async () => { await setRelearn(id, !on); syncBtns(id); onChange?.(!on); },
  });
  return on;
}
function syncBtns(id) {
  const on = isRelearn(id);
  document.querySelectorAll(`[data-rl="${CSS.escape(id)}"]`).forEach(b => {
    b.setAttribute('aria-pressed', on);
    const s = b.querySelector('small');
    if (s) s.textContent = b.classList.contains('rl-card') ? (on ? 'Đã học lại ✓' : 'Chưa học chữ này') : (on ? '↺ cần học lại' : 'Chưa học');
  });
  document.querySelectorAll(`.kc-rl-note[data-for="${CSS.escape(id)}"]`).forEach(n => { n.hidden = !on; });
}
// danh sách chữ đang gắn nhãn (lên đầu "Học chữ Hán mới")
export const relearnKanji = () => D.kanji.filter(k => isRelearn(k.id));
