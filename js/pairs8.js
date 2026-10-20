// v38: GHÉP 8 CẶP ngay trong lượt ôn / bài học — chuyển qua lại với trắc nghiệm giữa chừng, không mất tiến độ của lượt.
// Từ vựng: nghĩa tiếng Việt ↔ từ tiếng Nhật (furigana theo cài đặt). Chữ Hán: chữ (không furigana) ↔ âm Hán Việt + nghĩa.
// Mỗi mục báo kết quả đúng một lần: ghép đúng ngay → đúng; đã từng ghép nhầm → sai (vẫn phải ghép cho xong).
import { esc, icon, wordHTML, shuffle, beep, buzz } from './util.js';
import { D } from './data.js';
import { S } from './settings.js';
import { sameMeaning } from './quiz.js';
import { speak } from './tts.js';

export const PAIRS = 8;
const isKanji = it => String(it.id).startsWith('k:');
export const pairable = it => !!it && (isKanji(it) ? !!(it.char && it.hv) : !!(it.vi && (it.kanji || it.kana)));
// bỏ trùng, chỉ giữ mục ghép được
export const pairItems = list => [...new Map(list.filter(pairable).map(it => [it.id, it])).values()];

// hàng nút đổi kiểu luyện (đặt ngay dưới thanh tiến độ)
export const modeSwHTML = cur => `<div class="mode-sw" role="group" aria-label="Kiểu luyện">
    <button type="button" class="chip" data-mode="quiz" aria-pressed="${cur === 'quiz'}">Trắc nghiệm</button>
    <button type="button" class="chip" data-mode="pairs" aria-pressed="${cur === 'pairs'}">${icon('match')}Ghép 8 cặp</button></div>`;

function sides(it, script) {
  if (isKanji(it)) return [{ k: it.char, h: `<span class="pk-c" lang="ja" data-bare>${esc(it.char)}</span>` }, { k: it.hv, h: `<b>${esc(it.hv)}</b>${it.nghia ? `<small>${esc(it.nghia)}</small>` : ''}` }];
  return [{ k: it.vi, h: esc(it.vi) }, { k: it.kanji || it.kana, h: wordHTML(it, script), jp: 1 }];
}
// chia màn tối đa 8 cặp; trong một màn không có hai ô trùng chữ hay hai nghĩa đụng nhau (tránh hai đáp án cùng đúng)
function makeRounds(items) {
  // từ vựng và chữ Hán ghép ở các màn riêng (không trộn hai kiểu ô trong một màn)
  return [...roundsOf(items.filter(it => !isKanji(it))), ...roundsOf(items.filter(isKanji))];
}
function roundsOf(items) {
  const out = [];
  let rest = [...items];
  while (rest.length) {
    const pick = [], left = [], L = new Set(), R = new Set();
    for (const it of rest) {
      const [a, b] = sides(it, 'bare');
      const clash = !isKanji(it) && pick.some(p => !isKanji(p) && sameMeaning(p, it));
      if (pick.length < PAIRS && !L.has(a.k) && !R.has(b.k) && !clash) { pick.push(it); L.add(a.k); R.add(b.k); } else left.push(it);
    }
    if (!pick.length) break;
    out.push(pick);
    rest = left;
  }
  // màn cuối chỉ còn 1 cặp: nhập vào màn trước nếu còn chỗ (một cặp thì không còn gì để ghép)
  if (out.length > 1 && out.at(-1).length === 1 && out.at(-2).length < PAIRS) out.at(-2).push(...out.pop());
  return out;
}

// head(done, total) → HTML thanh trên của lượt (nút ✕, tiến độ). Gọi lại mỗi lần ghép xong một cặp.
export function runPairs(view, items, { head, onQuit, onResult, onSwitch, onDone, setKeys }) {
  const all = pairItems(items);
  const rounds = makeRounds(shuffle(all));
  const bad = new Set(), done = new Set();
  const script = S.script === 'kana' ? 'kana' : 'furi';
  let r = 0, sel = { L: null, R: null }, busy = false;
  setKeys?.(null);
  const tile = (it, side) => {
    const s = sides(it, script)[side];
    return `<button type="button" class="tile${s.jp ? ' tile-jp' : ''}${isKanji(it) && !side ? ' tile-kc' : ''}" data-id="${esc(it.id)}" data-side="${side ? 'R' : 'L'}" ${s.jp ? 'lang="ja"' : ''}>${s.h}</button>`;
  };
  function round() {
    const set = rounds[r];
    view.innerHTML = `<div class="run run-pairs">${head(done.size, all.length)}${modeSwHTML('pairs')}
      <p class="small muted pairs-hint">Màn ${r + 1}/${rounds.length} · chạm một ô bên trái rồi chạm ô hợp với nó bên phải.</p>
      <div class="match">
        <div class="mcol">${shuffle([...set]).map(it => tile(it, 0)).join('')}</div>
        <div class="mcol">${shuffle([...set]).map(it => tile(it, 1)).join('')}</div>
      </div></div>`;
    view.querySelector('[data-act=quit]').onclick = () => onQuit();
    view.querySelector('.mode-sw').onclick = e => {
      const b = e.target.closest('[data-mode=quiz]');
      if (b && !busy) onSwitch(all.filter(it => !done.has(it.id)));
    };
    view.querySelector('.match').onclick = onTap;
  }
  async function onTap(e) {
    const b = e.target.closest('.tile');
    if (!b || b.disabled || busy) return;
    const side = b.dataset.side;
    if (sel[side]) sel[side].setAttribute('aria-pressed', 'false');
    sel[side] = b; b.setAttribute('aria-pressed', 'true');
    if (side === 'R' && S.autoSpeak) { const it = D.items.get(b.dataset.id); if (it && !isKanji(it)) speak(it.kana); }
    if (!sel.L || !sel.R) return;
    const a = sel.L, c = sel.R;
    sel = { L: null, R: null };
    a.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', 'false');
    if (a.dataset.id === c.dataset.id) {
      a.disabled = c.disabled = true; a.classList.add('done'); c.classList.add('done');
      if (S.sound) beep(true);
      const it = all.find(x => x.id === a.dataset.id);
      done.add(it.id);
      busy = true;
      try { await onResult(it, !bad.has(it.id)); } finally { busy = false; }
      const top = view.querySelector('.run-top');
      if (top) top.outerHTML = head(done.size, all.length);
      view.querySelector('[data-act=quit]')?.addEventListener('click', () => onQuit());
      if (![...view.querySelectorAll('.tile')].some(t => !t.disabled)) {
        r++;
        setTimeout(() => { if (!view.querySelector('.run-pairs')) return; if (r < rounds.length) round(); else onDone(); }, 450);
      }
    } else {
      bad.add(a.dataset.id); bad.add(c.dataset.id);
      a.classList.add('is-ng'); c.classList.add('is-ng');
      if (S.sound) beep(false);
      if (S.vibrate) buzz();
      setTimeout(() => { a.classList.remove('is-ng'); c.classList.remove('is-ng'); }, 600);
    }
  }
  if (!rounds.length) return onDone();
  round();
}
