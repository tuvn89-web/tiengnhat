// Đợt 7 (v54) — tận dụng lợi thế của người Việt:
//  1. Âm On từ âm Hán Việt (#/luyen/amon) · 2. Trợ từ đi theo động từ (#/luyen/trotu)
//  3. Từ katakana: đoán từ gốc (#/luyen/katakana) · 7. Nghe trường âm / âm ngắt / âm ghép (#/luyen/truongam)
// Mọi bài ở đây không đổi lịch ôn (chỉ rèn kỹ năng), dùng dữ liệu có sẵn trong kho.
import { esc, rich, plain, shuffle, wordHTML, blankHTML, stripHL } from './util.js';
import { D, LEVELS } from './data.js';
import { status } from './srs.js';
import { opt } from './drill.js';
import { chips, readChip, readChips, emptyState, sayBtn } from './ui.js';
import { kvGet } from './db.js';
import { setupPage } from './practice.js';
import { regularOn, fits, rowOf, finOf, iniOf, finRule, ruleLine, moraN, toHira, hvFirst } from './amon.js';
import { ttsReady } from './tts.js';

const T = s => rich(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>'); // chữ Nhật có furigana + **đậm**
const lvField = o => `<fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels || [])}</fieldset>`;
const inLv = (o, x) => !o.levels?.length || o.levels.includes(x.level);
const srcOK = (o, x) => o.source !== 'learned' || status(x) !== 'new';
const srcField = (o, a = 'Đã học', b = 'Tất cả') => `<fieldset><legend>Lấy từ đâu</legend>${chips('source', [['learned', a], ['all', b]], o.source, false)}</fieldset>`;
const take = (arr, f, n) => { const out = []; for (const x of arr) { const q = f(x); if (q) out.push(q); if (out.length >= n) break; } return out; };

// ======================================================================
// 1. ÂM ON TỪ ÂM HÁN VIỆT
// ======================================================================
let _pool = null;
function onPool() {
  if (_pool) return _pool;
  const m = new Map();
  for (const k of D.kanji) for (const o of k.on || []) if (!m.has(o)) m.set(o, { on: o, row: rowOf(o), fin: finOf(o), n: moraN(o) });
  return (_pool = [...m.values()]);
}
// 3 âm sai có chủ đích: đúng đầu sai đuôi · sai đầu đúng đuôi · sai cả hai (giải được bằng quy luật, không phải nhớ mò)
function badOns(k, right) {
  const I = iniOf(k.hv), F = finRule(k.hv), n = moraN(right), avoid = new Set(k.on || []);
  const okR = x => I.rows.includes(x.row), okF = x => F.fins.includes(x.fin);
  const pool = onPool().filter(x => !avoid.has(x.on) && x.row);
  const pick = f => (shuffle(pool.filter(x => f(x) && x.n === n))[0] || shuffle(pool.filter(f))[0])?.on;
  return [...new Set([pick(x => okR(x) && !okF(x)), pick(x => !okR(x) && okF(x)), pick(x => !okR(x) && !okF(x))].filter(Boolean))];
}
function wordsOf(ch, n = 2) {
  const ws = D.vocab.filter(v => (v.kanji || '').includes(ch) && v.kanji.length >= 2);
  return [...new Set([...shuffle(ws.filter(w => status(w) !== 'new')), ...shuffle(ws)])].slice(0, n);
}
const wordLine = w => `<p class="small"><span lang="ja">${wordHTML(w, 'furi')}</span> <span class="muted">${esc(w.hv || '')}</span> — ${esc(w.vi)}</p>`;
function amonQ(k) {
  const right = regularOn(k);
  if (!right) return null;
  const ds = badOns(k, right);
  if (ds.length < 3) return null;
  const more = (k.on || []).filter(o => o !== right);
  return { kind: 'choice', tag: 'Âm On từ Hán Việt', level: k.level, promptBare: true,
    prompt: `<p class="prompt-jp kc-big" lang="ja" data-bare>${esc(k.char)}</p><p class="guess-hv">${esc(hvFirst(k.hv))}</p>`,
    hint: 'Nhìn âm Hán Việt, chọn âm On', noCmp: true,
    opts: shuffle([right, ...ds]).map(o => opt(o, esc(o))), answer: right,
    after: `<p class="small am-line">${ruleLine(k, right)}</p>${more.length ? `<p class="small muted">Chữ này còn đọc: <span lang="ja">${more.map(esc).join('、')}</span></p>` : ''}${wordsOf(k.char).map(wordLine).join('')}<button type="button" class="btn btn-ghost btn-sm" data-kopen="${esc(k.char)}">Mở thẻ chữ</button>` };
}
// từ ghép đọc toàn âm On "đều" (管理 = カン + リ = かんり)
const _cp = new WeakMap();
function compound(w) {
  if (_cp.has(w)) return _cp.get(w);
  let r = null;
  const ch = [...(w.kanji || '')];
  if (ch.length >= 2 && ch.length <= 3 && /^[一-鿿]+$/.test(w.kanji) && ch.every(c => D.kanjiByChar.get(c)?.hv)) {
    const ks = ch.map(c => D.kanjiByChar.get(c)), t = w.kana, res = [];
    const rec = (i, pos, acc) => {
      if (res.length) return;
      if (i === ks.length) { if (pos === t.length) res.push(acc); return; }
      for (const o of ks[i].on || []) { const h = toHira(o), f = fits(ks[i].hv, o); if (f.ini && f.fin && t.startsWith(h, pos)) rec(i + 1, pos + h.length, [...acc, o]); }
    };
    rec(0, 0, []);
    if (res[0]) r = { ks, ons: res[0] };
  }
  _cp.set(w, r);
  return r;
}
function tuQ(w) {
  const c = compound(w);
  if (!c) return null;
  const right = toHira(c.ons.join('')), bad = new Set();
  for (const i of shuffle(c.ks.map((_, i) => i).concat(c.ks.map((_, i) => i)))) {
    if (bad.size >= 3) break;
    const b = shuffle(badOns(c.ks[i], c.ons[i]))[0];
    if (!b) continue;
    const s = toHira(c.ons.map((o, j) => (j === i ? b : o)).join(''));
    if (s !== right) bad.add(s);
  }
  if (bad.size < 3) return null;
  return { kind: 'choice', tag: 'Đọc từ Hán bằng quy luật', level: w.level, promptBare: true,
    prompt: `<p class="prompt-jp" lang="ja" data-bare>${esc(w.kanji)}</p><p class="guess-hv">${esc(c.ks.map(k => hvFirst(k.hv)).join(' '))}</p><p class="prompt-hint">${esc(w.vi)}</p>`,
    hint: 'Từ âm Hán Việt từng chữ, chọn cách đọc', noCmp: true,
    opts: shuffle([right, ...bad]).map(o => opt(o, esc(o))), answer: right,
    after: `<p class="small"><span lang="ja">${wordHTML(w, 'furi')}</span> — ${esc(w.vi)}</p>${c.ks.map((k, i) => `<p class="small am-line"><span lang="ja">${esc(k.char)}</span> ${ruleLine(k, c.ons[i])}</p>`).join('')}` };
}
// v55 (đợt 8, mục 4): ÂM BIẾN KHI GHÉP — 学[がく] + 校[こう] = がっこう; 発[はつ] + 表[ひょう] = はっぴょう; 散[さん] + 歩[ほ] = さんぽ
const HA = 'はひふへほ', PA = 'ぱぴぷぺぽ', BA = 'ばびぶべぼ';
const VL = /^[かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽ]/; // vô thanh (đứng sau っ được)
const CH = { soku: '-ク / -キ / -ツ / -チ đứng trước hàng カ, サ, タ, ハ → thành っ (âm ngắt)', pa: 'sau っ hoặc ん, hàng ハ → パ (ぱ, ぴ, ぷ, ぺ, ぽ)', ba: 'sau ん, hàng ハ đôi khi → バ' };
function forms(h, i, n) {
  const out = [{ s: h, ch: [] }];
  const soku = i < n - 1 && /[くきつち]$/.test(h);
  const k = HA.indexOf(h[0]);
  const heads = i > 0 && k >= 0 ? [{ s: PA[k] + h.slice(1), ch: ['pa'] }, { s: BA[k] + h.slice(1), ch: ['ba'] }] : [];
  for (const x of heads) out.push(x);
  if (soku) for (const x of [...out]) out.push({ s: x.s.slice(0, -1) + 'っ', ch: [...x.ch, 'soku'] });
  return out;
}
const _cb = new WeakMap();
function compoundBien(w) {
  if (_cb.has(w)) return _cb.get(w);
  let r = null;
  const ch = [...(w.kanji || '')];
  if (!compound(w) && ch.length >= 2 && ch.length <= 3 && /^[\u4E00-\u9FFF]+$/.test(w.kanji) && ch.every(c => D.kanjiByChar.get(c)?.hv)) {
    const ks = ch.map(c => D.kanjiByChar.get(c)), t = w.kana, res = [];
    const rec = (i, pos, acc) => {
      if (res.length) return;
      if (i === ks.length) { if (pos === t.length) res.push(acc); return; }
      for (const o of ks[i].on || []) {
        const f0 = fits(ks[i].hv, o);
        if (!f0.ini || !f0.fin) continue;
        for (const f of forms(toHira(o), i, ks.length)) {
          if (!t.startsWith(f.s, pos)) continue;
          const prev = acc[acc.length - 1];
          if (f.ch.includes('pa') && !(prev && /[っん]$/.test(prev.s))) continue;
          if (f.ch.includes('ba') && !(prev && /ん$/.test(prev.s))) continue;
          if (prev?.ch.includes('soku') && !VL.test(f.s)) continue;
          rec(i + 1, pos + f.s.length, [...acc, { o, s: f.s, ch: f.ch }]);
        }
      }
    };
    rec(0, 0, []);
    if (res[0] && res[0].some(p => p.ch.length)) r = { ks, parts: res[0] };
  }
  _cb.set(w, r);
  return r;
}
function bienQ(w) {
  const c = compoundBien(w);
  if (!c) return null;
  const right = w.kana, naive = c.parts.map(p => toHira(p.o)).join(''), bad = new Set([naive]);
  // lỗi thật hay gặp: quên một âm biến (はつぴょう), đổi nhầm パ ↔ バ (さんぼ)
  c.parts.forEach((p, i) => {
    const swap = (q, f) => c.parts.map((x, j) => (j === i ? f(x) : x.s)).join('');
    if (p.ch.includes('soku')) bad.add(swap(p, x => x.s.slice(0, -1) + toHira(x.o).slice(-1)));
    const k = PA.indexOf(p.s[0]), kb = BA.indexOf(p.s[0]);
    if (k >= 0) bad.add(swap(p, x => BA[k] + x.s.slice(1)));
    if (kb >= 0) bad.add(swap(p, x => PA[kb] + x.s.slice(1)));
  });
  bad.delete(right);
  for (const i of shuffle(c.ks.map((_, i) => i).concat(c.ks.map((_, i) => i)))) {
    if (bad.size >= 3) break;
    const b = shuffle(badOns(c.ks[i], c.parts[i].o))[0];
    if (!b) continue;
    const s = c.parts.map((p, j) => toHira(j === i ? b : p.o)).join(''); // ghép thẳng, không biến — sai âm một chữ
    if (s !== right) bad.add(s);
  }
  while (bad.size > 3) bad.delete([...bad].pop());
  if (bad.size < 3 || bad.has(right)) return null;
  const used = [...new Set(c.parts.flatMap(p => p.ch))];
  return { kind: 'choice', tag: 'Từ ghép có âm biến', level: w.level, promptBare: true,
    prompt: `<p class="prompt-jp" lang="ja" data-bare>${esc(w.kanji)}</p><p class="guess-hv">${esc(c.ks.map(k => hvFirst(k.hv)).join(' '))}</p><p class="prompt-hint">${esc(w.vi)}</p>`,
    hint: 'Ghép âm từng chữ rồi nhớ âm biến', noCmp: true,
    opts: shuffle([right, ...bad]).map(o => opt(o, esc(o))), answer: right,
    after: `<p class="small"><span lang="ja">${wordHTML(w, 'furi')}</span> — ${esc(w.vi)}</p>
      <p class="small am-line"><span lang="ja">${c.parts.map((p, i) => `${esc(c.ks[i].char)} ${esc(toHira(p.o))}`).join(' + ')}</span> → <b lang="ja">${esc(right)}</b> (không phải <span lang="ja">${esc(naive)}</span>)</p>
      <ul class="small">${used.map(x => `<li>${esc(CH[x])}</li>`).join('')}</ul>` };
}
export function buildAmOn(o) {
  const n = Math.min(o.count, 400), kind = o.kind || 'tron';
  const ks = shuffle(D.kanji.filter(k => inLv(o, k) && srcOK(o, k) && regularOn(k)));
  const ws = kind === 'chu' ? [] : shuffle(D.vocab.filter(w => inLv(o, w) && srcOK(o, w) && compound(w)));
  if (kind === 'chu') return take(ks, amonQ, n);
  if (kind === 'tu') return take(ws, tuQ, n);
  if (kind === 'bien') return take(shuffle(D.vocab.filter(w => inLv(o, w) && srcOK(o, w) && compoundBien(w))), bienQ, n);
  const bs = shuffle(D.vocab.filter(w => inLv(o, w) && srcOK(o, w) && compoundBien(w)));
  const a = take(ks, amonQ, Math.ceil(n * 0.4)), c = take(bs, bienQ, Math.ceil(n * 0.25)), b = take(ws, tuQ, n - a.length - c.length);
  return shuffle([...a, ...b, ...c, ...take(ks.slice(a.length * 2), amonQ, n - a.length - b.length - c.length)]).slice(0, n);
}
export async function renderAmOn(view, ctx) {
  const o = { kind: 'tron', source: 'learned', levels: [], ...(await kvGet('pAO', {})) };
  setupPage(view, ctx, { key: 'pAO', title: 'Âm On từ âm Hán Việt', route: '#/luyen/amon',
    intro: T('Âm Hán Việt cho biết "khung" của âm On: phụ âm đầu → hàng kana đầu (HỌC: h → hàng カ), vần cuối → đuôi (HỌC: -c → ク/キ) ⇒ ガク. Ba phương án sai đều phạm quy luật — giải được bằng quy luật, không cần nhớ mò. Đây là bài đọc chữ nên chữ trong câu hỏi không có furigana. Bài này không đổi lịch ôn.') + ' <a href="#/huongdan/amon">Xem bảng quy luật</a>',
    fields: `<fieldset><legend>Dạng câu</legend>${chips('kind', [['tron', 'Trộn'], ['chu', 'Từng chữ'], ['tu', 'Từ ghép'], ['bien', 'Từ ghép có âm biến']], o.kind, false)}</fieldset>${srcField(o, 'Chữ / từ đã học')}${lvField(o)}`,
    read: f => ({ kind: readChip(f, 'kind'), source: readChip(f, 'source'), levels: readChips(f, 'levels') }), build: buildAmOn,
    drillOpts: { noReview: true }, empty: 'Chưa có chữ nào phù hợp. Chọn "Tất cả" hoặc thêm cấp độ.' });
}

// ======================================================================
// 2. TRỢ TỪ ĐI THEO ĐỘNG TỪ
// ======================================================================
const PS = ['を', 'に', 'が', 'で', 'と', 'から', 'へ', 'まで'];
const PRI = { を: ['が', 'に', 'で'], が: ['を', 'に', 'で'], に: ['で', 'を', 'へ', 'が'], で: ['に', 'を', 'が'], と: ['に', 'を', 'で'], から: ['を', 'で', 'に', 'まで'], へ: ['を', 'で', 'が'], まで: ['から', 'に', 'で'] };
const SET = {
  motion: ['行く', '来る', 'くる', '帰る', '向かう', '戻る', '出かける', '進む', '移る', '引っ越す', '送る', '届く', '届ける', '運ぶ', '着く', '到着する', '急ぐ', '通う', '上る', '登る', '上がる', '下りる', '入る', '寄る', '集まる', '向ける', '出張する', '転勤する'],
  leave: ['出る', '降りる', '離れる', '出発する', '卒業する', '退院する', '発つ', '去る', '辞める', '退職する', '下車する'],
  meet: ['会う', '話す', '相談する', '似る', 'ぶつかる', '結婚する', '約束する', '連絡する', '合う', '電話する', 'けんかする', '喧嘩する', '知り合う', '別れる', '戦う', '交換する', '協力する', '話し合う', '付き合う', '打ち合わせする'],
  become: ['なる', '変わる', '変える', '決める', '決まる', '変更する', '変化する'],
  path: ['歩く', '走る', '通る', '散歩する', '飛ぶ', '泳ぐ', '渡る', '曲がる', '回る', '横断する', '通過する'],
  mat: ['作る', '造る', '製造する', 'できる', '作られる'],
  gaonly: ['分かる', 'わかる', 'できる', '好き', '嫌い', '上手', '下手', '欲しい', '要る', 'いる', 'ある', '必要', '得意', '苦手', '見える', '聞こえる', '気になる', '気がつく', '大好き'],
  exist: ['いる', 'ある', '住む', '勤める', '泊まる', '座る', '置く', '入れる', '入る', '乗る', '並ぶ', '残る', '残す', '貼る', '止める', '止まる', '書く', '集まる', '着く', '預ける', 'かける', '掛ける', '置いておく', 'しまう', '詰める'],
};
const inSet = (k, head) => SET[k].some(v => head === v || head.endsWith(v));
const EXCL = [['motion', 'に', 'へ'], ['leave', 'を', 'から'], ['meet', 'に', 'と'], ['become', 'に', 'と'], ['path', 'を', 'で'], ['mat', 'から', 'で']];
function exclOf(p, head) {
  const x = new Set();
  for (const [s, a, b] of EXCL) if (inSet(s, head) && (p === a || p === b)) x.add(p === a ? b : a);
  if (p === 'が' && inSet('gaonly', head)) x.add('を');
  return x;
}
const BASE = {
  を: '**を**: đánh dấu đối tượng chịu tác động của động từ (tha động từ). Tiếng Việt không có chữ tương ứng — đó là bổ ngữ đứng sau động từ.',
  が: '**が**: đánh dấu chủ thể — thường của tự động từ (việc tự xảy ra) hoặc của trạng thái (có, cần, thích, hiểu…).',
  に: '**に**: điểm đến, nơi có mặt, thời điểm, người nhận, kết quả biến đổi (tiếng Việt: đến, ở, vào, cho, thành).',
  で: '**で**: nơi diễn ra hành động, phương tiện / công cụ, nguyên nhân, phạm vi (tiếng Việt: ở, bằng, vì).',
  と: '**と**: cùng với ai (hai bên cùng làm), hoặc trích dẫn (と言う, と思う).',
  から: '**から**: điểm xuất phát (từ…), nguồn, nguyên liệu biến đổi hẳn.',
  へ: '**へ**: hướng đi tới.',
  まで: '**まで**: đến tận (giới hạn nơi chốn, thời gian).',
};
function whyOf(p, head, it) {
  const pr = it?.pair && D.items.get(it.pair);
  const prW = pr ? ` (cặp: ${pr.kf || pr.kanji || pr.kana})` : '';
  if (p === 'を' && inSet('leave', head)) return '**を** ở đây chỉ **nơi rời khỏi** (ra khỏi, xuống xe, rời đi). Tiếng Việt "ra khỏi nhà" → 家[いえ]を出[で]る.';
  if (p === 'を' && inSet('path', head)) return '**を** ở đây chỉ **nơi đi qua / đi dọc theo** (qua cầu, trên đường, rẽ ở góc).';
  if (p === 'が' && inSet('gaonly', head)) return 'Từ chỉ khả năng, cảm xúc, mong muốn, tồn tại (分[わ]かる, できる, 好[す]き, 欲[ほ]しい, 要[い]る, ある…) đi với **が**, không dùng を.';
  if (p === 'が' && it?.vt === 'tu') return `Tự động từ (việc tự xảy ra) đi với **が**; tha động từ (ai đó làm) mới đi với を${prW}.`;
  if (p === 'を' && it?.vt === 'tha') return `Tha động từ (ai đó làm gì vào vật) đi với **を**; tự động từ thì đi với が${prW}.`;
  if ((p === 'に' || p === 'へ') && inSet('motion', head)) return '**に** / **へ** chỉ nơi đến (に nhấn điểm đến, へ nhấn hướng — ở đây cả hai đều được, nên chỉ một cái có trong phương án).';
  if (p === 'に' && inSet('meet', head)) return '**に**: hướng về một người (gặp, hỏi, nói với). Dùng と khi nhấn hai bên cùng làm.';
  if (p === 'と' && it?.pos === 'ono') return 'Từ tượng thanh / tượng hình + **と** + động từ (thường là する): tả dáng vẻ, âm thanh — ví dụ にっこりと笑[わら]う.';
  if (p === 'と' && inSet('become', head)) return '**と** + なる (văn viết, trang trọng): trở thành, rốt cuộc thành — nhấn kết quả cuối cùng; nói thường thì dùng に + なる.';
  if (p === 'と' && inSet('meet', head)) return '**と**: cùng với ai — hai bên cùng làm (cùng bàn, cưới nhau, hẹn nhau).';
  if (p === 'に' && inSet('become', head)) return '**に** + なる / 変[か]わる / 決[き]める: trở thành, đổi thành, chọn là.';
  if (p === 'に' && inSet('exist', head)) return '**に** chỉ **nơi có mặt / chỗ đặt vào** (ở, vào). Nơi **làm việc gì** thì dùng で: 工場[こうじょう]に いる / 工場[こうじょう]で 働[はたら]く.';
  if (p === 'で') return BASE.で + ' Phân biệt: nơi có mặt / đặt vào dùng に.';
  return BASE[p];
}
const surfaces = it => [it.kf, it.kanji && it.kanji !== it.kana ? `${it.kanji}[${it.kana}]` : null, it.kanji, it.kana].filter(Boolean);
const P_END = /(から|まで|を|が|に|で|へ|と)$/, P_START = /^(から|まで|を|が|に|で|へ|と)/;
let _coll = null;
function collList() {
  if (_coll) return _coll;
  const out = [];
  for (const it of D.vocab) for (const c of it.coll || []) {
    const s = typeof c === 'string' ? c : c.jp;
    if (!s) continue;
    for (const sf of surfaces(it)) {
      if (s.endsWith(sf) && s.length > sf.length) {
        const pre = s.slice(0, -sf.length), m = pre.match(P_END);
        if (!m) break;
        const before = pre.slice(0, -m[1].length);
        if (!before) break;
        // trước trợ từ là hiragana thuần (trạng từ: すぐに, ちゃんと…) → bỏ に / と
        if ((m[1] === 'に' || m[1] === 'と') && /[ぁ-ゖ]$/.test(before)) break;
        const stem = /[ぁ-ゖ]$/.test(sf) ? sf.slice(0, -1) : sf;
        out.push({ it, c, s, p: m[1], head: plain(sf), key: m[1] + stem, off: 0, at: pre.length - m[1].length });
        break;
      }
      if (s.startsWith(sf) && s.length > sf.length) {
        const m = s.slice(sf.length).match(P_START);
        if (!m) break;
        const rest = plain(s.slice(sf.length + m[1].length)).trim();
        if (!rest) break;
        out.push({ it, c, s, p: m[1], head: rest, key: sf + m[1], off: sf.length, at: sf.length });
        break;
      }
    }
  }
  return (_coll = out);
}
function optsFor(p, head) {
  const ex = exclOf(p, head), o = [];
  for (const x of [...PRI[p], ...shuffle(PS)]) if (x !== p && !ex.has(x) && !o.includes(x)) o.push(x);
  return [p, ...o.slice(0, 3)];
}
function ttQ(e, inSent) {
  let jp = e.s, at = e.at, vi = typeof e.c === 'string' ? '' : e.c.vi || '';
  if (inSent) {
    const ex = (e.it.ex || []).map(x => ({ ...x, jp: stripHL(x.jp || '') })).filter(x => { const i = x.jp.indexOf(e.key); return i >= 0 && i === x.jp.lastIndexOf(e.key); });
    const x = shuffle(ex)[0];
    if (!x) return null;
    jp = x.jp; vi = x.vi || '';
    at = x.jp.indexOf(e.key) + e.off;
  }
  const marked = jp.slice(0, at) + '[[' + e.p + ']]' + jp.slice(at + e.p.length);
  if (jp.slice(at, at + e.p.length) !== e.p) return null;
  return { kind: 'choice', tag: inSent ? 'Trợ từ trong câu' : 'Trợ từ theo cụm', level: e.it.level, noCmp: true,
    prompt: `<p class="prompt-jp" lang="ja">${blankHTML(marked)}</p>${vi ? `<p class="prompt-hint">${esc(vi)}</p>` : ''}`, hint: 'Chọn trợ từ đúng',
    opts: shuffle(optsFor(e.p, e.head)).map(x => opt(x, esc(x))), answer: e.p,
    after: `<p class="small"><span lang="ja">${rich(e.s)}</span>${typeof e.c === 'string' ? '' : ` — ${esc(e.c.vi || '')}`}</p><p class="small tt-why">${T(whyOf(e.p, e.head, e.it))}</p>` };
}
export function buildTroTu(o) {
  const n = Math.min(o.count, 400), ps = o.parts?.length ? o.parts : PS;
  const L = shuffle(collList().filter(e => ps.includes(e.p) && inLv(o, e.it) && srcOK(o, e.it)));
  if (o.kind === 'cum') return take(L, e => ttQ(e, false), n);
  if (o.kind === 'cau') return take(L, e => ttQ(e, true), n);
  const a = take(L, e => ttQ(e, true), Math.ceil(n / 2));
  return shuffle([...a, ...take(L.slice(a.length), e => ttQ(e, false), n - a.length)]);
}
export async function renderTroTu(view, ctx) {
  const o = { kind: 'tron', source: 'learned', levels: [], parts: [], ...(await kvGet('pTT', {})) };
  setupPage(view, ctx, { key: 'pTT', title: 'Trợ từ đi theo động từ', route: '#/luyen/trotu',
    intro: T('Tiếng Việt không có trợ từ, nên を / に / で / が hay nhầm tới tận trung cấp. Người học nắm trợ từ nhanh nhất khi học **theo từng động từ** (電車[でんしゃ]に乗[の]る, 部屋[へや]を出[で]る) rồi mới thành luật. Chọn sai thì app giải thích kèm đối chiếu tiếng Việt. Chỗ nào hai trợ từ cùng đúng (に / へ khi đi đến…) thì app chỉ để một cái trong phương án. Bài này không đổi lịch ôn.') + ' <a href="#/huongdan/trotu">Bảng trợ từ</a>',
    fields: `<fieldset><legend>Dạng câu</legend>${chips('kind', [['tron', 'Trộn'], ['cum', 'Theo cụm'], ['cau', 'Trong câu']], o.kind, false)}</fieldset>
      <fieldset><legend>Trợ từ <small>(không chọn = tất cả)</small></legend>${chips('parts', PS.map(p => [p, p]), o.parts || [])}</fieldset>${srcField(o, 'Từ đã học')}${lvField(o)}`,
    read: f => ({ kind: readChip(f, 'kind'), parts: readChips(f, 'parts'), source: readChip(f, 'source'), levels: readChips(f, 'levels') }), build: buildTroTu,
    drillOpts: { noReview: true }, empty: 'Chưa có cụm nào phù hợp. Chọn "Tất cả" hoặc thêm cấp độ.' });
}

// ======================================================================
// 3. TỪ KATAKANA: ĐOÁN TỪ GỐC
// ======================================================================
const isKata = it => /^[ァ-ヺー・]+$/.test(it.kana || '') && !!it.goc;
const gocWord = it => String(it.goc || '').split(/\s*[(（]/)[0].trim();
const KR = [
  [s => /tion\b/.test(s), k => /ション/.test(k), '-tion → ション (station → ステーション)'],
  [s => /sion\b/.test(s), k => /[ジシ]ョン/.test(k), '-sion → ジョン / ション (television → テレビジョン)'],
  [s => /(er|or|ar|ure|our)\b/.test(s), k => /ー$/.test(k) || /ー[^ー]?$/.test(k), '-er, -or, -ar cuối từ → kéo dài ー (computer → コンピューター)'],
  [s => /(ee|ea|oo|ar|or|ir|ur|er|al|aw|ay|ai|oa)/.test(s), k => k.includes('ー'), 'Nguyên âm dài (ee, ea, oo, ar, or, ay…) → ー (cheese → チーズ, card → カード)'],
  [s => /v/.test(s), k => /[ヴバビブベボ]/.test(k), 'v → hàng バ (video → ビデオ)'],
  [s => /l/.test(s), k => /[ラリルレロ]/.test(k), 'l và r đều thành hàng ラ (lamp → ランプ, rice → ライス)'],
  [s => /th/.test(s), k => /[サシスセソザジズゼゾ]/.test(k), 'th → hàng サ / ザ (three → スリー)'],
  [s => /(ck|pp|tt|dd|gg|tch|dge)\b|\b(cup|bag|bed|net|bat|set|top)\b/.test(s), k => k.includes('ッ'), 'Nguyên âm ngắn + phụ âm tắc (cup, bag, check) → thêm ッ (カップ, バッグ, チェック)'],
  [s => /[bcdfgklmnpstxz]\b/.test(s.replace(/e\b/g, '')), k => /[クグスズトドフブプムルツ]$/.test(k), 'Phụ âm cuối được thêm nguyên âm: k → ク, s → ス, t / d → ト / ド, m → ム, l → ル'],
];
function kataRules(it) {
  const s = gocWord(it).toLowerCase(), k = it.kana;
  return KR.filter(([a, b]) => a(s) && b(k)).map(r => r[2]).slice(0, 3);
}
const VOI = { カ: 'ガ', キ: 'ギ', ク: 'グ', ケ: 'ゲ', コ: 'ゴ', サ: 'ザ', シ: 'ジ', ス: 'ズ', セ: 'ゼ', ソ: 'ゾ', タ: 'ダ', テ: 'デ', ト: 'ド', ハ: 'バ', ヒ: 'ビ', フ: 'ブ', ヘ: 'ベ', ホ: 'ボ', パ: 'バ', ピ: 'ビ', プ: 'ブ', ペ: 'ベ', ポ: 'ボ' };
const UNV = Object.fromEntries(Object.entries(VOI).filter(([a]) => !'パピプペポ'.includes(a)).map(([a, b]) => [b, a]));
let _kset = null;
const kanaSet = () => _kset || (_kset = new Set(D.vocab.map(v => v.kana)));
function mutants(k) {
  const a = [...k], out = new Set(), rnd = n => Math.floor(Math.random() * n);
  const iL = a.indexOf('ー');
  if (iL >= 0) out.add(a.filter((_, i) => i !== iL).join(''));
  else if (a.length > 1) { const i = 1 + rnd(a.length - 1); if (!'ーッンャュョァィゥェォ'.includes(a[i - 1])) out.add([...a.slice(0, i), 'ー', ...a.slice(i)].join('')); }
  const iS = a.indexOf('ッ');
  if (iS >= 0) out.add(a.filter((_, i) => i !== iS).join(''));
  else { const c = a.map((x, i) => i).filter(i => i > 0 && !'アイウエオンーャュョァィゥェォッ'.includes(a[i]) && a[i - 1] !== 'ー' && a[i - 1] !== 'ン'); if (c.length) { const i = c[rnd(c.length)]; out.add([...a.slice(0, i), 'ッ', ...a.slice(i)].join('')); } }
  const iv = shuffle(a.map((x, i) => i).filter(i => VOI[a[i]] || UNV[a[i]]))[0];
  if (iv != null) out.add(a.map((x, i) => (i === iv ? VOI[x] || UNV[x] : x)).join(''));
  if (iL >= 0 && a.length > 3) { const j = [...a]; j.splice(iL, 1); const i2 = Math.min(j.length, iL + 1 + rnd(2)); j.splice(i2, 0, 'ー'); out.add(j.join('')); }
  const ks = kanaSet();
  return [...out].filter(x => x !== k && !ks.has(x) && !/^ー|ーー|ッー|ッッ|ッ$/.test(x));
}
function kataAfter(it) {
  const rs = kataRules(it);
  return `<p class="small"><span lang="ja">${esc(it.kana)}</span> ${sayBtn(it.kana)} — gốc: <b>${esc(it.goc)}</b></p>
    ${it.wasei ? `<p class="small">${T('**Từ "Nhật chế"** (和製英語[わせいえいご] hoặc nói tắt, gốc nước khác): người nói tiếng Anh không hiểu theo nghĩa này — nhớ riêng.')}</p>` : ''}
    ${rs.length ? `<ul class="small kr-rules">${rs.map(r => `<li>${esc(r)}</li>`).join('')}</ul>` : ''}`;
}
function kataQA(it, pool) {
  const ds = shuffle(pool.filter(x => x !== it && gocWord(x).toLowerCase() !== gocWord(it).toLowerCase() && x.vi !== it.vi)).slice(0, 3);
  if (ds.length < 3) return null;
  const lab = x => `<b>${esc(gocWord(x))}</b> — ${esc(x.vi)}`;
  return { kind: 'choice', tag: 'Katakana → từ gốc', level: it.level, noCmp: true, say: it.kana, autoSay: true,
    prompt: `<p class="prompt-jp" lang="ja">${esc(it.kana)}</p>`, hint: 'Từ này gốc là từ nào, nghĩa gì?',
    opts: shuffle([it, ...ds]).map(x => opt(x.id, lab(x), false)), answer: it.id, after: kataAfter(it) };
}
function kataQB(it) {
  const ds = shuffle(mutants(it.kana)).slice(0, 3);
  if (ds.length < 3) return null;
  return { kind: 'choice', tag: 'Viết đúng katakana', level: it.level, noCmp: true,
    prompt: `<p class="prompt-vi">${esc(it.vi)}</p><p class="prompt-hint">gốc: ${esc(gocWord(it))}</p>`, hint: 'Chọn cách viết đúng (để ý ー, ッ, âm đục)',
    opts: shuffle([it.kana, ...ds]).map(x => opt(x, esc(x))), answer: it.kana, after: kataAfter(it) };
}
export function buildKata(o) {
  const n = Math.min(o.count, 300), pool = D.vocab.filter(isKata);
  const L = shuffle(pool.filter(it => inLv(o, it) && srcOK(o, it)));
  if (o.kind === 'goc') return take(L, it => kataQA(it, pool), n);
  if (o.kind === 'viet') return take(L, kataQB, n);
  const a = take(L, it => kataQA(it, pool), Math.ceil(n / 2));
  return shuffle([...a, ...take(L.slice(a.length), kataQB, n - a.length)]);
}
export async function renderKata(view, ctx) {
  const o = { kind: 'tron', source: 'all', levels: [], ...(await kvGet('pKT', {})) };
  setupPage(view, ctx, { key: 'pKT', title: 'Từ katakana: đoán từ gốc', route: '#/luyen/katakana',
    intro: T('Từ N3 trở lên, từ katakana tăng nhanh (シフト, クレーム, マニュアル…). Đọc to từ katakana, nhận ra từ gốc (thường là tiếng Anh) là đoán được nghĩa. Hai dạng: nghe / đọc katakana → chọn từ gốc; thấy nghĩa → chọn cách viết đúng (bẫy ở ー, ッ, âm đục). Từ "Nhật chế" có nhãn riêng. Bài này không đổi lịch ôn.') + ' <a href="#/huongdan/katakana">Quy luật đổi âm</a>',
    fields: `<fieldset><legend>Dạng câu</legend>${chips('kind', [['tron', 'Trộn'], ['goc', 'Katakana → từ gốc'], ['viet', 'Viết đúng katakana']], o.kind, false)}</fieldset>${srcField(o, 'Từ đã học')}${lvField(o)}`,
    read: f => ({ kind: readChip(f, 'kind'), source: readChip(f, 'source'), levels: readChips(f, 'levels') }), build: buildKata,
    drillOpts: { noReview: true }, empty: 'Chưa có từ katakana nào phù hợp. Chọn "Tất cả".' });
}

// ======================================================================
// 7. NGHE PHÂN BIỆT TRƯỜNG ÂM / ÂM NGẮT / ÂM GHÉP
// ======================================================================
let _ta = null;
const loadTA = () => _ta || (_ta = fetch('data/truongam.json').then(r => (r.ok ? r.json() : { pairs: [] })).catch(() => ({ pairs: [] })));
const KIND = { truong: ['Trường âm', 'Nguyên âm kéo dài (ー, おう, えい…) dài gấp đôi — một nhịp riêng. Tiếng Việt không phân biệt dài / ngắn nên rất dễ bỏ qua.'],
  ngat: ['Âm ngắt っ', 'っ là một nhịp im lặng ngắn trước phụ âm (きって = き・(nín)・て). Thiếu nhịp này là thành từ khác.'],
  ghep: ['Âm ghép ゃゅょ', 'ゃ ゅ ょ nhỏ ghép vào chữ trước thành một nhịp (きょ = 1 nhịp); や ゆ よ to là một nhịp riêng (きよ = 2 nhịp).'] };
const taOpt = x => `<span lang="ja" class="ta-k">${esc(x[0])}</span><small>${esc(x[2])}</small>`; // chỉ kana + nghĩa (chữ Hán trần không furigana thì không hiện)
function taQ(p) {
  const pick = Math.random() < 0.5 ? p.a : p.b, other = pick === p.a ? p.b : p.a;
  const [name, how] = KIND[p.k];
  return { kind: 'choice', tag: `Nghe: ${name}`, level: p.lv, noCmp: true, say: pick[0], autoSay: true,
    prompt: `<p class="prompt-hint">Bấm loa để nghe lại. Bạn nghe thấy từ nào?</p>`, hint: name,
    opts: [p.a, p.b].map(x => opt(x[0], taOpt(x))), answer: pick[0],
    after: `<p class="small">So sánh: <span lang="ja">${esc(p.a[0])}</span> ${sayBtn(p.a[0])} · <span lang="ja">${esc(p.b[0])}</span> ${sayBtn(p.b[0])}</p><p class="small muted">${esc(how)}</p>` };
}
export async function renderTruongAm(view, ctx) {
  const back = '<a class="back" href="#/luyen">Các dạng bài</a>';
  if (!ttsReady()) { view.innerHTML = back + emptyState('Bài này cần giọng đọc tiếng Nhật trong máy. Vào Cài đặt → Giọng đọc để chọn hoặc cài giọng tiếng Nhật.', '<a class="btn btn-ghost" href="#/caidat">Cài đặt</a>'); return; }
  const data = await loadTA();
  const o = { kinds: [], levels: [], ...(await kvGet('pTA', {})) };
  setupPage(view, ctx, { key: 'pTA', title: 'Nghe: trường âm, âm ngắt', route: '#/luyen/truongam',
    intro: T('Người Việt hay nghe nhầm おばさん / おばあさん, きて / きって, びよういん / びょういん — và phần này không tự tiến bộ theo thời gian học. App đọc một từ trong cặp, bạn chọn từ nghe thấy; sau mỗi câu nghe lại cả hai để so. Bài này không đổi lịch ôn.') + ' <a href="#/huongdan/truongam">Cách nghe</a>',
    fields: `<fieldset><legend>Loại <small>(không chọn = tất cả)</small></legend>${chips('kinds', Object.entries(KIND).map(([k, v]) => [k, v[0]]), o.kinds || [])}</fieldset>${lvField(o)}`,
    read: f => ({ kinds: readChips(f, 'kinds'), levels: readChips(f, 'levels') }),
    build: x => shuffle(data.pairs.filter(p => (!x.kinds?.length || x.kinds.includes(p.k)) && (!x.levels?.length || x.levels.includes(p.lv)))).slice(0, Math.min(x.count, 300)).map(taQ),
    drillOpts: { noReview: true }, empty: 'Chưa có cặp nào cho lựa chọn này.' });
}
