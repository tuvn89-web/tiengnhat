// Tiện ích dùng chung
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const DAY = 864e5;

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function isKanjiCh(ch) {
  const o = ch.codePointAt(0);
  return (o >= 0x4e00 && o <= 0x9fff) || (o >= 0x3400 && o <= 0x4dbf) || '々〆ヶ'.includes(ch);
}
export const hasKanji = s => [...(s || '')].some(isKanjiCh);

export const APP_VERSION = 'v20 · 17/10/2026'; // đổi cùng lúc với VERSION trong sw.js

// Cú pháp: 漢字[よみ] — phần gắn cách đọc là chuỗi kanji liền trước "[".  [[...]] = phần ngữ pháp.
// Dấu [ ] không đứng sau kanji, hoặc bên trong không phải kana, thì giữ nguyên như chữ thường.
const KANA_ONLY = /^[぀-ヿー・ ]+$/;
export function parseJP(s) {
  s = s || '';
  const segs = [];
  let i = 0, hl = false, buf = '';
  const flush = () => { if (buf) { segs.push({ t: buf, r: null, hl }); buf = ''; } };
  while (i < s.length) {
    if (s.startsWith('[[', i)) { flush(); hl = true; i += 2; continue; }
    if (hl && s.startsWith(']]', i)) { flush(); hl = false; i += 2; continue; }
    const ch = s[i];
    if (ch === '[') {
      const j = s.indexOf(']', i + 1);
      const r = j < 0 ? '' : s.slice(i + 1, j);
      let k = buf.length;
      while (k > 0 && isKanjiCh(buf[k - 1])) k--;
      if (j < 0 || k === buf.length || !KANA_ONLY.test(r)) { buf += ch; i++; continue; }
      const pre = buf.slice(0, k), base = buf.slice(k);
      if (pre) segs.push({ t: pre, r: null, hl });
      segs.push({ t: base, r, hl });
      buf = ''; i = j + 1; continue;
    }
    buf += ch; i++;
  }
  flush();
  return segs;
}
// Chữ hỗn hợp Việt–Nhật (ghi chú, giải thích, tên gói…): kanji có [よみ] thì hiện furigana.
export const rich = s => rubyHTML(s, true);
export const richParas = s => String(s || '').split(/\n\n+/).map(p => `<p>${rich(p)}</p>`).join('');
export const plain = s => parseJP(s).map(x => x.t).join('');
export const reading = s => parseJP(s).map(x => x.r || x.t).join('');

// Mỗi chữ kanji bọc trong <span class="kj"> để chạm vào là mở thẻ chữ Hán.
const KJ_RE = /[\u4E00-\u9FFF\u3400-\u4DBF々]/g;
export const kj = html => html.replace(KJ_RE, c => (c === '々' ? c : `<span class="kj">${c}</span>`));

export function rubyHTML(s, furi = true) {
  let out = '', open = false;
  for (const g of parseJP(s)) {
    if (g.hl && !open) { out += '<mark class="gp">'; open = true; }
    if (!g.hl && open) { out += '</mark>'; open = false; }
    out += g.r && furi ? `<ruby>${kj(esc(g.t))}<rt>${esc(g.r)}</rt></ruby>` : kj(esc(g.t));
  }
  if (open) out += '</mark>';
  return out;
}
// Thay phần [[…]] bằng ô trống (bài điền chỗ trống)
// [[ … ]] bọc phần ngữ pháp; phần đó có thể kết thúc bằng furigana: [[方[かた]]] → dấu đóng là "]]" cuối cùng
export const HL_RE = /\[\[([\s\S]*?)\]\](?!\])/;
export function blankHTML(s, blank = '<span class="blank" aria-label="chỗ trống">　　　</span>') {
  return rubyHTML(s.replace(HL_RE, '\u0000'), true).replace('\u0000', blank);
}
export const hlText = s => (HL_RE.exec(s) || [])[1] || '';
export const stripHL = s => s.replace(/\[\[|\]\]/g, '');
export const kanjiChars = s => [...new Set([...(s || '')].filter(c => isKanjiCh(c) && c !== '々'))];

// ---------- câu có nhiều thứ tự đúng ----------
// Các cụm "danh từ + trợ từ chỉ cách" (を に で へ が から まで より) đứng liền nhau thì đổi chỗ cho nhau vẫn đúng:
// 野菜を 水で 洗う = 水で 野菜を 洗う. Cụm có は/も (chủ đề), cụm kết thúc bằng 、 và mệnh đề (động từ + から, て…) thì giữ chỗ.
const FREE_P = ['から', 'まで', 'より', 'を', 'に', 'で', 'へ', 'が'];
const FREE_HEAD = /[一-鿿㐀-䶿々゠-ヿー0-9０-９]$/;
const PRONOUN = /(これ|それ|あれ|ここ|そこ|あそこ|どこ|だれ|なに|みんな|みな)$/;
// Mảnh (HTML có <ruby> hoặc chữ có [よみ]) → chữ trần
export const chunkPlain = h => plain(String(h || '').replace(/<rt>[\s\S]*?<\/rt>|<rp>[\s\S]*?<\/rp>/g, '').replace(/<[^>]+>/g, '')).replace(/\s+/g, '');
const BOUND = /(気[をにが]|右に|左に|ように|ために)$/;
export function isFreeChunk(h) {
  const t = chunkPlain(h);
  if (!t || /[、。，,！？!?」』]$/.test(t) || /^[にをでがはともへのや]/.test(t) || BOUND.test(t)) return false;
  if (/[\u4E00-\u9FFF\u30A0-\u30FFーん]は./.test(t)) return false; // trong mảnh đã có chủ đề (田中さんは私に)
  if (/[ぁ-ゖ][てで]./.test(t)) return false;                           // trong mảnh có mệnh đề thể て (向かって右側の…を, 下げてお礼を)
  if (/^[ぁ-ゖ]{2,}[\u4E00-\u9FFF]/.test(t)) return false;              // phó từ đứng đầu mảnh (あまり政治に, いつか国に)
  if (/[。！？]/.test(t) || /ように|ために/.test(t) || /[ぁ-ゖ](前|後|時|間|うち)[にで]?$/.test(t)) return false; // hai câu trong một mảnh; mệnh đề thời gian (入る前に)
  for (const p of FREE_P) {
    if (!t.endsWith(p) || t.length <= p.length) continue;
    const head = t.slice(0, -p.length);
    if (/[はも]$/.test(head)) return false;
    return FREE_HEAD.test(head) || PRONOUN.test(head);
  }
  return false;
}
// Số hiệu nhóm cho từng mảnh: các mảnh "tự do" liền nhau cùng một nhóm (đổi chỗ trong nhóm được); mảnh cố định = -1
export function freeRuns(chunks) {
  const T = chunks.map(chunkPlain);
  const free = chunks.map((c, i) => {
    if (!isFreeChunk(c)) return false;
    const nx = T[i + 1] || '', pv = T[i - 1] || '';
    if (/^[にをでがはともへの]/.test(nx)) return false;            // mảnh sau còn dính trợ từ (朝七時まで / に会社に)
    if (/に$/.test(T[i]) && /^[なすし]/.test(nx)) return false;      // 〜になる / 〜にする (上手に なった)
    if (/で$/.test(T[i]) && /^き/.test(nx)) return false;            // 確認で / きます = できます
    if (/^な(い|かっ|く|けれ)/.test(nx)) return false;                // 分から / なかった (động từ bị cắt đôi)
    if (/^[\u4E00-\u9FFF]{1,2}[るうくすつむぶぐぬたっ]/.test(nx) && /(前|後|時|間|うち)/.test(nx)) return false; // 工場に / 入る前に
    if (/に$/.test(T[i]) && /^(行|来|帰|戻|出かけ|いらっしゃ|参|伺)/.test(nx)) return false; // 見学に / いらっしゃる, 見に / 行く (đi để làm gì)
    if (/^[\u4E00-\u9FFF]に$/.test(T[i]) && /^[ぁ-ゖ]/.test(nx)) return false;        // 死に / かけた (thân động từ)
    if (/間に$/.test(T[i]) && /^合/.test(nx)) return false;                          // 間に / 合う
    const CLAUSE = /^[\u4E00-\u9FFF]{1,3}[ぁ-ゖ]{1,3}[\u4E00-\u9FFF]/;               // mảnh mở đầu bằng mệnh đề định ngữ (抱いた人に, 悪い人が)
    if (CLAUSE.test(nx)) return false;                                              // 赤ん坊を / 抱いた人に: mảnh trước thuộc mệnh đề đó
    if (CLAUSE.test(T[i]) && /[をがにで]$/.test(pv)) return false;
    // mảnh trước phải khép lại bằng trợ từ hoặc dấu phẩy; nếu không, nó bổ nghĩa cho mảnh này (社員 / みんなが, テーブルの / 上に, この / 量を, 止めていた / 機械が)
    if (pv && !/([をにでへがはもとや]|から|まで|より|、|，)$/.test(pv)) return false;
    if (/に$/.test(T[i]) && /^(注意|興味|関心|影響|気)/.test(nx)) return false; // ノロウイルスに / 注意が
    return true;
  });
  const run = chunks.map(() => -1);
  let id = 0;
  for (let i = 0; i < chunks.length; i++) {
    if (!free[i]) continue;
    let j = i;
    while (j + 1 < chunks.length && free[j + 1]) j++;
    if (j > i) { for (let k = i; k <= j; k++) run[k] = id; id++; }
    i = j;
  }
  return run;
}
// seq = số thứ tự (theo câu mẫu) của từng mảnh người học đã xếp. Đúng khi mỗi mảnh ở đúng chỗ, hoặc đổi chỗ trong cùng nhóm tự do.
export function orderOK(chunks, seq) {
  if (seq.length !== chunks.length) return false;
  const run = freeRuns(chunks);
  return seq.every((k, i) => typeof k === 'number' && (k === i || (run[k] >= 0 && run[k] === run[i])));
}
// Các thứ tự đúng khác câu mẫu (tối đa max cách)
export function altOrders(chunks, max = 3) {
  const run = freeRuns(chunks), groups = {};
  run.forEach((r, i) => { if (r >= 0) (groups[r] = groups[r] || []).push(i); });
  const perms = a => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(p => [x, ...p])));
  let orders = [chunks.map((_, i) => i)];
  for (const idx of Object.values(groups)) {
    const next = [];
    for (const o of orders) for (const p of perms(idx)) { const n = [...o]; idx.forEach((pos, j) => { n[pos] = p[j]; }); next.push(n); }
    orders = next.slice(0, 24);
  }
  return orders.filter(o => o.some((k, i) => k !== i)).slice(0, max).map(o => o.map(k => chunks[k]));
}

// Tự cắt câu thành mảnh theo trợ từ (dùng khi dữ liệu không có sẵn chunks). Đầu vào: chữ có furigana, không có [[ ]] và dấu câu cuối.
// Chỉ cắt sau trợ từ đứng ngay sau chữ Hán / katakana — tránh cắt nhầm trong từ viết bằng hiragana.
const PARTS = ['には', 'では', 'から', 'まで', 'より', 'とは', 'へは', 'にも', 'でも', 'を', 'が', 'は', 'に', 'で', 'へ', 'と', 'も'];
const NOT_AFTER = { が: 'るりっられれろ', で: 'すしょるてたまらりれろ', と: 'るりっれろう', も: 'るりっ', に: 'るりっ' };
export function autoChunks(s, max = 6) {
  const toks = [];
  for (const g of parseJP(s)) {
    if (g.r) toks.push({ m: `${g.t}[${g.r}]`, p: g.t, k: 'K' });
    else for (const ch of g.t) toks.push({ m: ch, p: ch, k: isKanjiCh(ch) ? 'K' : /[\u30A0-\u30FF]/.test(ch) ? 'A' : /[\u3040-\u309F]/.test(ch) ? 'H' : 'O' });
  }
  const out = [];
  let cur = '';
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    cur += t.m;
    if (t.p === '、' || t.p === '，') { out.push(cur); cur = ''; continue; }
    if (t.k !== 'K' && t.k !== 'A') continue;
    let ahead = '';
    for (let j = i + 1; j < toks.length && toks[j].k === 'H' && ahead.length < 2; j++) ahead += toks[j].p;
    const p = PARTS.find(x => ahead.startsWith(x));
    if (!p) continue;
    const nx = toks[i + 1 + p.length];
    if (nx && nx.k === 'H' && (NOT_AFTER[p] || '').includes(nx.p)) continue;
    for (let j = 0; j < p.length; j++) cur += toks[++i].m;
    if (toks[i + 1] && (toks[i + 1].p === '、' || toks[i + 1].p === '，')) cur += toks[++i].m;
    if (i < toks.length - 1) { out.push(cur); cur = ''; }
  }
  if (cur) out.push(cur);
  while (out.length > max) {
    let bi = 0, bl = Infinity;
    for (let i = 0; i < out.length - 1; i++) { const l = plain(out[i]).length + plain(out[i + 1]).length; if (l < bl) { bl = l; bi = i; } }
    out.splice(bi, 2, out[bi] + out[bi + 1]);
  }
  return out;
}
export const END_PUNCT = /[。！？!?]$/;

// Hiển thị một từ theo chế độ chữ: kana (mềm/cứng) | furi (kanji + furigana)
// | bare (kanji trần — CHỈ dùng ở phần kiểm tra Hán–furigana: Kanji → cách đọc, ghép kana – kanji)
export function wordHTML(it, mode = 'furi') {
  if (mode === 'kana' || !it.kanji) return esc(it.kana);
  if (mode === 'bare') return esc(it.kanji);
  if (it.kf) return rubyHTML(it.kf, true);
  return `<ruby>${kj(esc(it.kanji))}<rt>${esc(it.kana)}</rt></ruby>`;
}
export function wordKey(it, mode) {
  if (mode === 'kana' || !it.kanji) return it.kana;
  return it.kanji;
}
export const jp = (html, cls = '') => `<span lang="ja" class="${cls}">${html}</span>`;

export const normVi = s => String(s || '').trim().toLowerCase();

export function shuffle(a) {
  a = [...a];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function startOfDay(t = Date.now()) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function fmtDate(t) {
  if (!t) return '—';
  const d = new Date(t);
  const p = n => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Thông báo nổi. Nếu đang có thanh nút ghim đáy (.next-bar: Đã thuộc / Tiếp…) thì nổi lên TRÊN thanh đó, không che nút.
function placeToasts() {
  const box = $('#toasts');
  const bar = [...document.querySelectorAll('.next-bar')].find(b => b.offsetParent);
  if (!bar) { box.style.bottom = ''; return; }
  const top = bar.getBoundingClientRect().top;
  box.style.bottom = top > 0 && top < innerHeight ? `${Math.round(innerHeight - top + 8)}px` : '';
}
export function toast(msg, { action, onAction, ms = 3200 } = {}) {
  const box = $('#toasts');
  box.querySelectorAll('.toast:not(.has-action)').forEach(t => t.remove()); // thông báo mới thay thông báo cũ
  const el = document.createElement('div');
  el.className = 'toast' + (action ? ' has-action' : '');
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button class="btn btn-sm btn-ghost">${esc(action)}</button>` : '');
  if (action) el.querySelector('button').onclick = () => { onAction?.(); el.remove(); };
  placeToasts();
  box.appendChild(el);
  // thông báo có nút (Hoàn tác) cũng tự tắt sau một lúc — không nằm mãi trên màn hình
  setTimeout(() => el.remove(), action ? Math.max(ms, 6000) : ms);
  return el;
}
addEventListener('resize', () => { if ($('#toasts')?.children.length) placeToasts(); });
addEventListener('scroll', () => { if ($('#toasts')?.children.length) placeToasts(); }, { passive: true });

export function download(name, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export const readFile = f => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsText(f, 'utf-8'); });

let actx;
export function beep(ok) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = ok ? 880 : 220;
    g.gain.setValueAtTime(0.0001, actx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.15, actx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + (ok ? 0.18 : 0.3));
    o.connect(g); g.connect(actx.destination);
    o.start(); o.stop(actx.currentTime + 0.32);
  } catch { /* không có âm thanh cũng không sao */ }
}
export function buzz() { try { navigator.vibrate?.(120); } catch { } }

// Hỏi máy chủ xem có bản app mới không (bản mới tự cài rồi tải lại trang).
export async function checkUpdate() {
  if (!('serviceWorker' in navigator)) return 'Trình duyệt này không hỗ trợ tự cập nhật.';
  if (!navigator.onLine) return 'Đang không có mạng — có mạng rồi thử lại.';
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return 'App chưa cài chế độ offline — mở lại app khi có mạng.';
    await reg.update();
    if (reg.installing || reg.waiting) return 'Đang tải bản mới — app sẽ tự tải lại sau ít giây.';
    return `Đang dùng bản mới nhất (${APP_VERSION}).`;
  } catch { return 'Không kiểm tra được — thử lại sau.'; }
}

export function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

export const ICON = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  quiz: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  match: '<rect x="3" y="4" width="7" height="6" rx="1.5"/><rect x="14" y="14" width="7" height="6" rx="1.5"/><path d="M10 7h4v10"/>',
  book: '<path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z"/><path d="M20 4h-5a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h5z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  box: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>',
  flag: '<path d="M5 21V4h11l-2 4 2 4H5"/>',
  han: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M12 7v10M8 13h8"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7.5a3.5 3.5 0 0 0 0-7h-7a3.5 3.5 0 0 1 0-7H16"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4z"/>',
  heart: '<path d="M12 20s-7-4.4-9-8.6C1.6 8.4 3.4 5 6.8 5c2 0 3.4 1.1 5.2 3 1.8-1.9 3.2-3 5.2-3 3.4 0 5.2 3.4 3.8 6.4-2 4.2-9 8.6-9 8.6z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6"/><circle cx="12" cy="17" r=".6"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M17 17h4v4h-4"/>',
};
export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
