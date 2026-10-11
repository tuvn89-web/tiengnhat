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

export const APP_VERSION = 'v5 · 11/10/2026'; // đổi cùng lúc với VERSION trong sw.js

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
export function blankHTML(s, blank = '<span class="blank" aria-label="chỗ trống">　　　</span>') {
  return rubyHTML(s.replace(/\[\[[\s\S]*?\]\]/, '\u0000'), true).replace('\u0000', blank);
}
export const hlText = s => (/\[\[([\s\S]*?)\]\]/.exec(s) || [])[1] || '';
export const stripHL = s => s.replace(/\[\[|\]\]/g, '');
export const kanjiChars = s => [...new Set([...(s || '')].filter(c => isKanjiCh(c) && c !== '々'))];

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

export function toast(msg, { action, onAction, ms = 3200 } = {}) {
  const box = $('#toasts');
  box.querySelectorAll('.toast:not(.has-action)').forEach(t => t.remove()); // thông báo mới thay thông báo cũ
  const el = document.createElement('div');
  if (action) el.classList.add('has-action');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button class="btn btn-sm btn-ghost">${esc(action)}</button>` : '');
  if (action) el.querySelector('button').onclick = () => { onAction?.(); el.remove(); };
  box.appendChild(el);
  if (!action) setTimeout(() => el.remove(), ms);
  return el;
}

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
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M17 17h4v4h-4"/>',
};
export const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;
