// v31 (N5): mục "cứng đầu" — sai từ 4 lần trở lên mà chưa thuộc.
// Trong lượt ôn, trước khi hỏi một mục cứng đầu, app hiện thẻ đầy đủ để xem lại (mỗi mục tối đa 1 lần mỗi ngày).
import { esc, startOfDay } from './util.js';
import { D } from './data.js';
import { errCount, itemType } from './srs.js';
import { wordDetailHTML } from './wordx.js';
import { kanjiCardHTML, poemHTML } from './kanji.js';

const seen = new Map(); // id → ngày đã xem thẻ
export const leechSeen = id => seen.get(id) === startOfDay();
export const markLeech = id => seen.set(id, startOfDay());

// Thơ nhớ chữ của các chữ Hán trong từ (chữ có thẻ)
function poemsOf(it) {
  const ks = [...new Set([...(it.kanji || '')])].map(c => D.kanjiByChar.get(c)).filter(k => k && (k.tho || []).length);
  if (!ks.length) return '';
  return `<section class="leech-poems" data-bare data-kj-ok><p class="kc-label">Thơ nhớ chữ</p>${ks.map(k => `<div class="leech-poem"><span class="mini-k-c" lang="ja">${esc(k.char)}</span><p class="kc-poem small">${poemHTML(k.tho)}</p></div>`).join('')}</section>`;
}

export function leechCardHTML(it) {
  const n = errCount(it);
  const head = `<div class="label-head"><span class="label-tag leech-tag">Cứng đầu · đã sai ${n} lần</span><span class="label-lv">${esc(it.level || '')}</span></div>
    <p class="small muted leech-tip">Xem kỹ lại thẻ này một lượt rồi mới trả lời.</p>`;
  if (itemType(it) === 'kanji') return `<article class="label-card is-intro leech">${head}${kanjiCardHTML(it.char)}</article>`;
  return `<article class="label-card is-intro leech">${head}${wordDetailHTML(it)}${poemsOf(it)}</article>`;
}
export const leechBarHTML = () => `<div class="next-bar"><button type="button" class="btn btn-primary" data-act="leechgo">Đã xem — hỏi tôi</button></div>`;
