// Giải thích câu (v15): nghĩa từng từ / cụm từ có trong câu + mẫu ngữ pháp dùng trong câu.
// Chạm vào từ → thẻ từ; chạm vào mẫu → bài học của mẫu (bảng trượt). Dùng ở bài mở đầu, hội thoại, bài đọc và khi hiện đáp án.
import { esc, rich, plain, parseJP, isKanjiCh, wordHTML, rubyHTML, reading, stripHL } from './util.js';
import { D, POS } from './data.js';
import { openSheet, sayBtn, bindSay } from './ui.js';
import { markBtnHTML } from './notes.js';

// ---------- dò từ trong câu (giống scripts/validate_pack.py) ----------
let _idx = null, _ik = '';
const KATA = /^[ァ-ヶー]+$/, HIRA = /^[ぁ-ゖー]+$/;
function detIndex() {
  const key = `${D.vocab.length}:${D.items.size}`;
  if (_idx && _ik === key) return _idx;
  const m = new Map();
  const add = (surf, c) => { if (!m.has(surf)) m.set(surf, []); m.get(surf).push(c); };
  for (const it of D.vocab) {
    const kanji = it.kanji || '', kana = it.kana || '', pos = it.pos;
    const verbish = ['v1', 'v5', 'v3', 'adj-i'].includes(pos);
    if (kanji) {
      if (verbish && kanji.length > 1 && !isKanjiCh(kanji.at(-1)) && kana.length > 1) add(kanji.slice(0, -1), { id: it.id, rd: kana.slice(0, -1), need: isKanjiCh(kanji.at(-2)) });
      else add(kanji, { id: it.id, rd: kana, need: false });
    } else if (KATA.test(kana) && kana.length >= 2) add(kana, { id: it.id, rd: kana, need: false });
    else if (HIRA.test(kana) && !/^〜/.test(kana)) {
      // từ chỉ viết kana: tính từ い lấy thân (おいし), từ khác lấy nguyên chữ; bỏ từ quá ngắn dễ dò nhầm
      const s = pos === 'adj-i' ? kana.slice(0, -1) : ['v1', 'v5', 'v3'].includes(pos) ? null : kana;
      if (s && s.length >= 3) add(s, { id: it.id, rd: s, need: false, hira: true });
    }
  }
  _idx = [...m.entries()].sort((a, b) => b[0].length - a[0].length);
  _ik = key;
  return _idx;
}
const hira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const NUM_ID = { 一: 'v:一:いち', 二: 'v:二:に', 三: 'v:三:さん', 四: 'v:四:よん', 五: 'v:五:ご', 六: 'v:六:ろく', 七: 'v:七:なな', 八: 'v:八:はち', 九: 'v:九:きゅう', 十: 'v:十:じゅう', 百: 'v:百:ひゃく', 千: 'v:千:せん', 万: 'v:万:まん' };
const NUM_GROUP = /^([〇一二三四五六七八九十百千万]+)(本|個|枚|冊|円|分|時間|時|人|歳|回|階|杯|匹|度|番|台|か月|週間|年|月|軒|件|箱|着|足|通|泊|点)?$/;
// Trả về mã từ theo thứ tự xuất hiện trong câu
export function detectWords(jp) {
  const segs = parseJP(stripHL(jp || ''));
  let text = ''; const groups = [];
  for (const s of segs) { const st = text.length; text += s.t; if (s.r) groups.push([st, text.length, s.r]); }
  const used = new Array(text.length).fill(false), found = [];
  // cụm số + trợ số từ gộp một nhóm furigana (三百円[さんびゃくえん]): nhận từng chữ số và trợ số từ
  for (const [g0, g1] of groups) {
    const m = text.slice(g0, g1).match(NUM_GROUP);
    if (!m) continue;
    [...m[1]].forEach((ch, k) => { const id = NUM_ID[ch]; if (id && D.items.has(id)) { found.push([g0 + k, id]); used[g0 + k] = true; } });
    if (m[2]) {
      const c = D.vocab.find(x => x.kanji === m[2] && x.pos === 'ctr') || D.vocab.find(x => x.kanji === m[2]);
      if (c) { found.push([g0 + m[1].length, c.id]); for (let k = g0 + m[1].length; k < g1; k++) used[k] = true; }
    }
  }
  const spanRd = (i, j) => {
    let out = '', p = i;
    while (p < j) {
      const g = groups.find(g => g[0] <= p && p < g[1]);
      if (g) { if (g[0] !== p || g[1] > j) return null; out += g[2]; p = g[1]; } else { out += text[p]; p++; }
    }
    return out;
  };
  for (const [surf, cands] of detIndex()) {
    let from = 0;
    for (;;) {
      const i = text.indexOf(surf, from);
      if (i < 0) break;
      from = i + 1;
      const j = i + surf.length;
      if (used.slice(i, j).some(Boolean)) continue;
      let ok = cands.filter(c => !c.need || j >= text.length || !isKanjiCh(text[j]));
      if (!ok.length) continue;
      if (ok[0].hira && j < text.length && 'りるれろらっ'.includes(text[j])) continue; // じゃあ ⊂ じゃありません
      if (!ok[0].hira) {
        const rd = spanRd(i, j);
        if (rd != null) ok = ok.filter(c => hira(c.rd) === hira(rd));
        else {
          const g = groups.find(g => g[0] <= i && i < g[1]);
          if (g) ok = ok.filter(c => g[0] === i && hira(g[2]).startsWith(hira(c.rd)) && j - i >= 2);
        }
      }
      if (!ok.length) continue;
      for (let k = i; k < j; k++) used[k] = true;
      found.push([i, ok[0].id]);
    }
  }
  return [...new Set(found.sort((a, b) => a[0] - b[0]).map(x => x[1]))];
}

// ---------- dò mẫu ngữ pháp trong câu ----------
// Lấy phần chữ của mẫu (bỏ 〜, furigana, tên thể trong ngoặc); mẫu có nhiều dạng (・) thì khớp một dạng là đủ.
// Chỉ nhận dấu hiệu đủ dài để khỏi đoán nhầm (〜を, 〜は〜です… quá chung nên bỏ).
let _gi = null, _gk = '';
const STEM_END = /[うくぐすつぬぶむるだ]$/;
// biến thể âm đục sau động từ: 〜てもいい / 読んでもいい, 〜たら / 読んだら
const voiced = f => (/^て/.test(f) ? [f, 'で' + f.slice(1)] : /^た/.test(f) ? [f, 'だ' + f.slice(1)] : [f]);
function gramIndex() {
  const key = `${D.grammar.length}`;
  if (_gi && _gk === key) return _gi;
  const out = [];
  // kho câu để loại dấu hiệu quá chung (ます, ました…): xuất hiện ở hơn 2% số câu thì bỏ
  const corpus = [...D.grammar.flatMap(g => (g.ex || []).map(e => plain(stripHL(e.jp || '')))), ...D.vocab.slice(0, 1500).flatMap(v => (v.ex || []).slice(0, 1).map(e => plain(e.jp || '')))];
  const df = sig => corpus.reduce((n, c) => n + (c.includes(sig) ? 1 : 0), 0) / Math.max(1, corpus.length);
  for (const g of D.grammar) {
    let p = plain(g.pattern || '');
    const par = p.match(/[（(]([^）)]*)[）)]/);
    if (par && /[ぁ-ゖ]/.test(par[1]) && !/[ぁ-ゖ]/.test(p.replace(par[0], ''))) p = par[1]; // 可能形（〜られる・〜える）→ 〜られる・〜える
    p = p.replace(/[（(][^）)]*[）)]/g, '');
    const alts = [], allFrags = [];
    for (const alt of p.split(/[・\/]/)) {
      const frags = alt.split(/[〜～…、,＋+ ]/).map(f => f.trim()).filter(Boolean).map(f => (f.length >= 3 && STEM_END.test(f) ? f.slice(0, -1) : f)).map(f => (f.length > 5 ? f.slice(0, -1) : f));
      if (!frags.length || frags.some(f => /[A-Za-zÀ-ỹ]/.test(f))) continue;
      allFrags.push(...frags);
      const long = frags.filter(f => f.length >= 2);
      const strong = frags.some(f => f.length >= 4 || (f.length >= 3 && /[一-龯]/.test(f))) || (long.length >= 2 && long.join('').length >= 4);
      if (strong && frags.every(f => f.length >= 1)) alts.push(frags);
    }
    // dấu hiệu học từ chính câu ví dụ: đuôi chung của phần [[ ]] (食べながら, 聞きながら → ながら)
    const hl = (g.ex || []).map(e => (String(e.jp || '').match(/\[\[([\s\S]*?)\]\]/) || [])[1]).filter(Boolean).map(x => plain(x));
    if (hl.length >= 4) {
      for (let L = 7; L >= 3; L--) {
        const cnt = new Map();
        for (const h of hl) if (h.length >= L) { const suf = h.slice(-L); if (/^[ぁ-ゖー]/.test(suf) || /[ぁ-ゖ]/.test(suf)) cnt.set(suf, (cnt.get(suf) || 0) + 1); }
        const best = [...cnt.entries()].sort((x, y) => y[1] - x[1])[0];
        if (best && best[1] >= Math.ceil(hl.length * 0.5) && !/^[。、！？]/.test(best[0])) {
          const sig = best[0].replace(/[。！？]$/, '');
          // dấu hiệu phải dính tới chữ của mẫu (ながら ⊂ ながらも), không thì là đuôi câu chung (ことです…)
          const related = allFrags.some(f => sig.includes(f) || f.includes(sig));
          if (sig.length >= 3 && related && df(sig) < 0.02) {
            // dấu hiệu dài hơn và chứa dạng ngắn của mẫu thì chỉ dùng dấu hiệu (〜ながら（も） → ながらも)
            for (let k = alts.length - 1; k >= 0; k--) if (alts[k].length === 1 && sig.includes(alts[k][0]) && sig !== alts[k][0]) alts.splice(k, 1);
            alts.push([sig]); break;
          }
        }
      }
    }
    if (alts.length) out.push({ id: g.id, alts });
  }
  _gi = out; _gk = key;
  return out;
}
export function detectGrammar(jp) {
  const t = plain(stripHL(jp || ''));
  const hit = [];
  for (const { id, alts } of gramIndex()) {
    let best = null;
    for (const fr of alts) {
      let p = 0, st = -1, ok = true;
      for (const f of fr) {
        const i = Math.min(...voiced(f).map(v => { const k = t.indexOf(v, p); return k < 0 ? Infinity : k; }));
        if (i === Infinity) { ok = false; break; }
        if (st < 0) st = i;
        p = i + f.length;
      }
      if (ok && (!best || p - st > best[1] - best[0])) best = [st, p];
    }
    if (best) hit.push({ id, a: best[0], b: best[1] });
  }
  // mẫu nằm gọn trong chỗ khớp của mẫu dài hơn thì bỏ (みたい ⊃ たい, かわりに ⊃ わりに, てしかたがない ⊃ しか〜ない)
  return hit.filter(h => !hit.some(o => o !== h && o.a <= h.a && o.b >= h.b && (o.b - o.a) > (h.b - h.a))).map(h => h.id);
}

// ---------- HTML ----------
const posName = it => POS[it.pos] || '';
function wordRow(it) {
  return `<li class="xw"><button type="button" class="xw-b" data-wopen="${esc(it.id)}"><span class="xw-jp" lang="ja">${wordHTML(it, 'furi')}</span><span class="xw-vi">${esc(it.vi)}<small class="muted"> · ${esc(posName(it))}${it.level ? ' · ' + esc(it.level) : ''}</small></span></button>${markBtnHTML(it.id, { label: false, cls: 'icon-btn' })}</li>`;
}
const refRow = (w, vi, cls = '') => `<li class="xw ${cls}"><span class="xw-b"><span class="xw-jp" lang="ja">${rich(w)}</span><span class="xw-vi">${esc(vi || '')}</span></span></li>`;
function gramRow(g) {
  return `<li class="xg"><button type="button" class="xw-b" data-gopen="${esc(g.id)}"><span class="xw-jp" lang="ja">${rich(g.pattern)}</span><span class="xw-vi">${rich(g.meaning || '')}<small class="muted"> · ${esc(g.level || '')} · xem bài</small></span></button></li>`;
}
// line = {jp, vi, words, grammar, gloss, phr, std, note}; head = có hiện lại câu ở đầu không
export function explainHTML(line, { head = true } = {}) {
  const jp = line.jp || '';
  const listed = (line.words || []).filter(w => typeof w === 'string');
  const wid = [...new Set([...detectWords(jp), ...listed])].filter(id => D.items.get(id)?._type === 'vocab');
  const phrPlain = new Set((line.phr || []).map(p => plain(p.w)));
  // từ trùng hẳn với một cụm đã giải thích (おはようございます…) thì không lặp lại
  const words = wid.map(id => D.items.get(id)).filter(it => !phrPlain.has(it.kanji || it.kana) && !phrPlain.has(it.kana) && !(it.kf && phrPlain.has(plain(it.kf))));
  const inline = (line.words || []).filter(w => w && typeof w === 'object' && w.w);
  const gid = [...new Set([...(line.grammar || []), ...detectGrammar(jp)])].filter(id => D.items.has(id));
  const gs = gid.map(id => D.items.get(id));
  // chú thích trùng với từ đã dò được trong kho thì bỏ (từ trong kho đã có dòng riêng)
  const phr = line.phr || [], gl = (line.gloss || []).filter(g => !phr.some(p => plain(p.w) === plain(g.w)) && !(() => { const d = detectWords(g.w), it = d.length === 1 && D.items.get(d[0]); return it && wid.includes(d[0]) && [it.kanji, it.kana, it.kf && plain(it.kf)].includes(plain(g.w)); })());
  const parts = [];
  if (head) parts.push(`<div class="xh"><p class="xh-jp" lang="ja">${rubyHTML(stripHL(jp), true)}</p>${sayBtn(reading(stripHL(jp)))}</div>${line.vi ? `<p class="xh-vi">${esc(line.vi)}</p>` : ''}`);
  if (line.std) parts.push(`<p class="small"><b>Nói chuẩn:</b> <span lang="ja">${rich(line.std)}</span></p>`);
  if (phr.length) parts.push(`<p class="sub-label">Cụm từ</p><ul class="xl">${phr.map(p => refRow(p.w, p.vi, 'xp')).join('')}</ul>`);
  if (words.length || gl.length || inline.length) parts.push(`<p class="sub-label">Từ trong câu</p><ul class="xl">${words.map(wordRow).join('')}${[...gl, ...inline].map(g => refRow(g.w, g.vi)).join('')}</ul>`);
  if (gs.length) parts.push(`<p class="sub-label">Ngữ pháp trong câu</p><ul class="xl">${gs.map(gramRow).join('')}</ul>`);
  if (line.note) parts.push(`<p class="small dl-note">💡 ${rich(line.note)}</p>`);
  if (!words.length && !gs.length && !phr.length && !gl.length) parts.push('<p class="small muted">Câu này không có từ nào trong kho để giải thích thêm.</p>');
  return `<div class="xpl-b">${parts.join('')}</div>`;
}
export function openExplain(line) {
  const s = openSheet(`<h2 class="h2">Giải thích câu</h2>${explainHTML(line)}`, { label: 'Giải thích câu' });
  bindSay(s.el);
  return s;
}
// Câu (dạng 漢字[よみ]) lấy lại từ HTML đã có furigana (<ruby>漢字<rt>よみ</rt></ruby>)
function markupFrom(el) {
  let s = '';
  for (const n of el.childNodes) {
    if (n.nodeType === 3) s += n.textContent;
    else if (n.tagName === 'RUBY') { const rt = n.querySelector('rt')?.textContent || ''; const base = [...n.childNodes].filter(c => c.tagName !== 'RT' && c.tagName !== 'RP').map(c => c.textContent).join(''); s += base + (rt ? `[${rt}]` : ''); }
    else if (n.tagName !== 'BUTTON' && n.tagName !== 'RT') s += markupFrom(n);
  }
  return s;
}
// Câu của một câu hỏi: q.sent, không có thì lấy câu đầy đủ trong phần đáp án (.after-sent)
export function qSent(q) {
  if (q?.sent) return q.sent;
  if (!q?.after || !q.after.includes('after-sent')) return '';
  const d = new DOMParser().parseFromString(`<div>${q.after}</div>`, 'text/html');
  const el = d.querySelector('.after-sent');
  return el ? markupFrom(el).trim() : '';
}
// Khối giải thích dưới đáp án (bài luyện): câu + q.gram / q.gloss / q.phr tùy chọn; mẫu của câu hỏi ngữ pháp tự thêm
export function answerExplainHTML(q, { open = true } = {}) {
  const sent = qSent(q);
  if (!sent) return '';
  const gram = [...new Set([...(q.gram || []), ...(q.review?.id?.startsWith('g:') ? [q.review.id] : [])])];
  return `<details class="xpl" ${open ? 'open' : ''}><summary>Giải thích từ & ngữ pháp trong câu</summary>${explainHTML({ jp: sent, grammar: gram, gloss: q.gloss, phr: q.phr, words: q.words }, { head: false })}</details>`;
}
// Bài học của một mẫu ngữ pháp trong bảng trượt
export async function openGrammarSheet(id) {
  const g = D.items.get(id);
  if (!g) return;
  const { renderGrammar } = await import('./grammar.js');
  const s = openSheet('<div class="gsheet"></div>', { label: plain(g.pattern) });
  const box = s.body.querySelector('.gsheet');
  renderGrammar(box, id);
  box.querySelector('.back')?.remove();
  box.insertAdjacentHTML('beforeend', `<p class="small"><a href="#/nguphap/${encodeURIComponent(id)}">Mở trang riêng của mẫu này →</a></p>`);
}
