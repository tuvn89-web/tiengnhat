// v51 "Đọc vừa sức": mỗi hội thoại / bài đọc — bao nhiêu % từ trong bài bạn đã học.
// Tính trên từ có nghĩa có trong kho từ của app (từ chú thích riêng của bài đã kèm nghĩa nên không tính), không tính trợ từ, đuôi câu. Nghiên cứu đọc hiểu đo trên mọi chữ:
// ≥ 98% đọc trôi, 95–98% đọc được khi có chú giải. Trợ từ / đuôi câu chiếm gần nửa số chữ và đều đã biết; app chỉ đếm từ trong kho
// (nhiều từ cơ bản không nằm trong kho như あの, それ, どう nên không được đếm là "đã biết") → quy đổi sang thang của app:
// ≥ 95% "đọc trôi" · 85–94% "đọc có chú giải" · dưới 85% "nhiều từ mới". Ngưỡng là ước lượng mềm.
// Danh sách từ của từng bài tính sẵn (data/docwords.json, dựng bằng docwords.py lúc đóng gói); bài chưa có trong tệp thì tính tại chỗ.
import { esc, wordHTML } from './util.js';
import { D } from './data.js';
import { status, progVersion } from './srs.js';
import { detectWords } from './explain.js';

let M = null, P = null;
export function loadDocWords() {
  if (!P) P = fetch('data/docwords.json').then(r => (r.ok ? r.json() : {})).then(j => {
    M = new Map();
    const W = j.w || [];
    for (const [id, s] of Object.entries(j.d || {})) M.set(id, { w: s ? s.split('|').map(x => { const [w, n] = x.split('*'); return [W[+w] ?? w, +(n || 1)]; }) : [], g: (j.g || {})[id] || 0 });
  }).catch(() => { M = new Map(); });
  return P;
}
export const docWordsReady = () => !!M;
const linesOf = it => it.turns || it.sents || [];
// tính tại chỗ (bài nhập thêm, bài mới chưa có trong tệp): mỗi câu — từ trong kho dò được + từ chú thích riêng
export function docWordsNow(it) {
  const cnt = new Map(); let g = 0;
  for (const t of linesOf(it)) {
    const ids = new Set(detectWords(t.jp || ''));
    for (const w of t.words || []) if (typeof w === 'string' && D.items.get(w)?._type === 'vocab') ids.add(w);
    for (const id of ids) if (D.items.get(id)?._type === 'vocab') cnt.set(id, (cnt.get(id) || 0) + 1);
    // chú thích riêng của bài (tên riêng, từ ngoài kho, dạng chia) đã có nghĩa ngay trong bài → không tính; chỉ đếm để tham khảo
    g += (t.gloss || []).length;
  }
  return { w: [...cnt], g };
}
const cache = new Map(); let cacheV = -1;
export function docFit(it) {
  if (!it) return null;
  if (cacheV !== progVersion()) { cache.clear(); cacheV = progVersion(); }
  if (cache.has(it.id)) return cache.get(it.id);
  const dw = M?.get(it.id) || docWordsNow(it);
  let known = 0, total = 0;
  const fresh = [];
  for (const [id, n] of dw.w) {
    const x = D.items.get(id);
    if (!x) continue;
    total += n;
    if (status(x) !== 'new') known += n; else fresh.push(x);
  }
  if (!total) { cache.set(it.id, null); return null; }
  const pct = Math.floor((known / total) * 100);
  const lv = pct >= 95 ? 'troi' : pct >= 85 ? 'chugiai' : 'kho';
  const r = { pct, lv, fresh, gloss: dw.g };
  cache.set(it.id, r);
  return r;
}
export const FIT = { troi: 'Đọc trôi', chugiai: 'Đọc có chú giải', kho: 'Nhiều từ mới' };
export const fitBadgeHTML = f => (f ? `<span class="fit fit-${f.lv}" title="${FIT[f.lv]}: đã học ${f.pct}% từ trong bài">${f.pct}%</span>` : '');
// khối trên đầu trang đọc: mức vừa sức + từ chưa học (đưa vào lịch ôn)
export function fitNoteHTML(it) {
  const f = docFit(it);
  if (!f) return '';
  const tip = { troi: 'Bạn biết gần hết từ — đọc liền một mạch, tắt nghĩa tiếng Việt để luyện đọc thật.', chugiai: 'Vừa sức để học: bật nghĩa tiếng Việt khi cần, chạm vào câu để xem từ.', kho: 'Còn nhiều từ mới — nên học từ của bài trước, hoặc đọc kèm nghĩa tiếng Việt từng câu.' }[f.lv];
  const fr = f.fresh.slice(0, 40);
  return `<div class="fitbox fitbox-${f.lv}"><p><b>${FIT[f.lv]}</b> · bạn đã học <b>${f.pct}%</b> từ trong bài. <span class="small">${tip}</span></p>
    ${fr.length ? `<details class="fit-new"><summary class="small">${f.fresh.length} từ trong bài bạn chưa học</summary>
      <ul class="xl">${fr.map(x => `<li class="xw"><button type="button" class="xw-b" data-wopen="${esc(x.id)}"><span class="xw-jp" lang="ja">${wordHTML(x, 'furi')}</span><span class="xw-vi">${esc(x.vi)}</span></button></li>`).join('')}</ul>
      <div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-fitadd>Đưa ${fr.length} từ này vào lịch ôn</button></div>
      <p class="small muted">Từ đưa vào sẽ được hỏi lại từ ngày mai như từ đã học.</p></details>` : ''}</div>`;
}
export function bindFitNote(root, it, onDone) {
  const b = root.querySelector('[data-fitadd]');
  if (!b) return;
  b.onclick = async () => {
    const { setLearned } = await import('./srs.js');
    const f = docFit(it), xs = (f?.fresh || []).slice(0, 40);
    for (const x of xs) await setLearned(x, 'learned');
    b.disabled = true; b.textContent = `Đã đưa ${xs.length} từ vào lịch ôn ✓`;
    onDone?.(xs.length);
  };
}
