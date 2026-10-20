// Đề thi thử JLPT theo cấp (v43): đề chia đúng các phần thi (問題) như JLPT — đọc chữ Hán, cách viết, chọn từ theo ngữ cảnh,
// từ gần nghĩa, ngữ pháp, sắp xếp câu ★, đọc hiểu, nghe hiểu. Chấm theo phần thi, quy tỉ lệ đúng ra thang điểm của JLPT
// để so với điểm đỗ (chỉ là ước lượng: điểm JLPT thật được quy đổi theo độ khó từng đề).
import { esc, rich, rubyHTML, parseJP, stripHL, reading, plain, shuffle, fmtDate, icon } from './util.js';
import { D, LEVELS, saveTest, testList } from './data.js';
import { answerOf, distractors, sameMeaning } from './quiz.js';
import { GQ } from './gdrill.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, emptyState, bindSay } from './ui.js';
import { ttsReady, jaVoices, pickVoice } from './tts.js';
import { S } from './settings.js';
import { nextFrame, loadingHTML, curGen } from './lazy.js';
import { kvGet, kvSet } from './db.js';
import { goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';
import { runLearn } from './learn.js';
import { isSpec, levelsWithData } from './level.js';

// ---------- khung đề ----------
// Điểm đỗ và điểm sàn từng phần thi (jlpt.jp): N1 100 · N2 90 · N3 95 · N4 90 · N5 80 trên 180; mỗi phần ≥ 19/60 (N4, N5: phần Kiến thức ngôn ngữ · Đọc hiểu ≥ 38/120).
export const PASS = { N1: 100, N2: 90, N3: 95, N4: 90, N5: 80 };
const PART = {
  yomi: { jp: '漢字[かんじ]読[よ]み', vi: 'Đọc chữ Hán', ins: '＿＿＿のことばはひらがなでどう書[か]きますか。', go: '#/hoc', tip: 'Luyện kiểu "Kanji → cách đọc" ở Trắc nghiệm; để ý trường âm (こう/こ), âm ngắt っ, âm đục (か/が).' },
  hyoki: { jp: '表記[ひょうき]', vi: 'Cách viết', ins: '＿＿＿のことばはどう書[か]きますか。', go: '#/chuhan/on', tip: 'Ôn thẻ chữ Hán, nhất là chữ trông giống nhau và chữ cùng âm Hán.' },
  bunmyaku: { jp: '文脈規定[ぶんみゃくきてい]', vi: 'Chọn từ theo ngữ cảnh', ins: '（　　）に何[なに]を入[い]れますか。', go: '#/hoc', tip: 'Luyện kiểu "Nghĩa → từ tiếng Nhật" và đọc câu ví dụ của từ, không chỉ học nghĩa trơn.' },
  iikae: { jp: '言[い]い換[か]え類義[るいぎ]', vi: 'Từ gần nghĩa', ins: '＿＿＿の意味[いみ]がいちばん近[ちか]いものを選[えら]んでください。', go: '#/kho', tip: 'Khi học từ, xem mục "đồng nghĩa" trong thẻ từ; học từ theo cặp gần nghĩa.' },
  bunpo: { jp: '文法形式[ぶんぽうけいしき]の判断[はんだん]', vi: 'Ngữ pháp điền chỗ trống', ins: '（　　）に何[なに]を入[い]れますか。', go: '#/nguphap/luyen', tip: 'Luyện dạng "Điền chỗ trống" ở Ngữ pháp; đọc lại phần "dễ nhầm" của từng mẫu.' },
  kumitate: { jp: '文[ぶん]の組[く]み立[た]て', vi: 'Sắp xếp câu ★', ins: '★に入[はい]るものはどれですか。', go: '#/nguphap/luyen', tip: 'Luyện dạng "Câu ★" và "Sắp xếp câu": tìm mẫu ngữ pháp trước, ghép các mảnh quanh nó.' },
  dokkai: { jp: '読解[どっかい]', vi: 'Đọc hiểu', ins: 'つぎの文章[ぶんしょう]を読[よ]んで、質問[しつもん]に答[こた]えてください。', go: '#/doc', tip: 'Đọc bài ở trang Hội thoại & bài đọc: đọc câu hỏi trước, rồi tìm câu trả lời trong bài.' },
  chokai: { jp: '聴解[ちょうかい]', vi: 'Nghe hội thoại', ins: '会話[かいわ]を聞[き]いて、質問[しつもん]に答[こた]えてください。', go: '#/doc', tip: 'Dùng "Nghe cả bài" ở trang Hội thoại & bài đọc, tắt chữ Nhật rồi nghe lại nhiều lần.' },
  sokuji: { jp: '即時応答[そくじおうとう]', vi: 'Đáp lời ngay', ins: 'ことばを聞[き]いて、いちばんいい返事[へんじ]を選[えら]んでください。', go: '#/hoc', tip: 'Học câu chào hỏi kèm câu đáp (mục "đáp lại" trong thẻ từ).' },
};
const ORDER = ['yomi', 'hyoki', 'bunmyaku', 'iikae', 'bunpo', 'kumitate', 'dokkai', 'chokai', 'sokuji'];
const COUNT = {
  N5: { yomi: 7, hyoki: 5, bunmyaku: 6, iikae: 3, bunpo: 9, kumitate: 4, dokkai: 6, chokai: 6, sokuji: 3 },
  N4: { yomi: 7, hyoki: 5, bunmyaku: 7, iikae: 4, bunpo: 10, kumitate: 4, dokkai: 7, chokai: 7, sokuji: 3 },
  N3: { yomi: 6, hyoki: 5, bunmyaku: 7, iikae: 4, bunpo: 9, kumitate: 4, dokkai: 10, chokai: 9, sokuji: 0 },
  N2: { yomi: 5, hyoki: 5, bunmyaku: 6, iikae: 4, bunpo: 9, kumitate: 4, dokkai: 12, chokai: 10, sokuji: 0 },
};
COUNT.N1 = COUNT.N2;
// giây mỗi câu (để tính giờ cả đề)
const SECS = { yomi: 40, hyoki: 40, bunmyaku: 45, iikae: 45, bunpo: 50, kumitate: 70, dokkai: 110, chokai: 50, sokuji: 25 };
const SECTIONS = L => (L === 'N5' || L === 'N4')
  ? [{ k: 'gd', jp: '言語知識[げんごちしき]・読解[どっかい]', vi: 'Kiến thức ngôn ngữ · Đọc hiểu', max: 120, base: 38, parts: ['yomi', 'hyoki', 'bunmyaku', 'iikae', 'bunpo', 'kumitate', 'dokkai'] },
     { k: 'ck', jp: '聴解[ちょうかい]', vi: 'Nghe hiểu', max: 60, base: 19, parts: ['chokai', 'sokuji'] }]
  : [{ k: 'g', jp: '言語知識[げんごちしき]', vi: 'Kiến thức ngôn ngữ (chữ, từ, ngữ pháp)', max: 60, base: 19, parts: ['yomi', 'hyoki', 'bunmyaku', 'iikae', 'bunpo', 'kumitate'] },
     { k: 'd', jp: '読解[どっかい]', vi: 'Đọc hiểu', max: 60, base: 19, parts: ['dokkai'] },
     { k: 'ck', jp: '聴解[ちょうかい]', vi: 'Nghe hiểu', max: 60, base: 19, parts: ['chokai', 'sokuji'] }];

// ---------- chữ ----------
const hira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const isKata = s => /^[゠-ヿー]+$/.test(s || '');
const segMk = s => (s.r ? `${s.t}[${s.r}]` : s.t);
const ROW = new Map(['かきくけこ', 'がぎぐげご', 'さしすせそ', 'たちつてと', 'なにぬねの', 'ばびぶべぼ', 'まみむめも', 'らりるれろ', 'わいうえお'].flatMap((r, i) => [...r].map(c => [c, i]))); ROW.set('っ', 3); ROW.set('ん', 6);
const KRUN = /^([ぁ-ゖ]*)([一-鿿㐀-䶿々]+)([ぁ-ゖ]*)$/;
const rank = L => LEVELS.indexOf(L);
// câu ví dụ dùng được trong đề: câu đơn (không phải hội thoại A：B：), không quá dài
const exOf = v => (v.ex || []).filter(e => e && e.jp && !/[：:]/.test(plain(e.jp)) && !e.jp.includes('[[') && plain(e.jp).length <= 42);

// Tìm từ v (có chữ Hán) trong câu: phần gạch dưới = kana đầu + cụm chữ Hán + phần okurigana chung giữa thể từ điển và câu
// (洗う trong 洗って → 洗; 静か trong 静かな → 静か). Cụm chữ Hán phải đứng riêng (không nằm giữa từ ghép dài hơn).
function locate(v, jp) {
  const m = (v.kanji || '').match(KRUN); if (!m) return null;
  const [, pk, run, ok] = m, kana = hira(v.kana);
  if (!kana.startsWith(pk) || !kana.endsWith(ok) || kana.length <= pk.length + ok.length) return null;
  const runR = kana.slice(pk.length, kana.length - ok.length);
  const segs = parseJP(stripHL(jp));
  for (let i = 0; i < segs.length; i++) {
    if (!segs[i].r || (i > 0 && segs[i - 1].r && !pk)) continue;
    let t = '', r = '', j = i;
    while (j < segs.length && segs[j].r && t.length < run.length) { t += segs[j].t; r += segs[j].r; j++; }
    if (t !== run || hira(r) !== runR || (segs[j] && segs[j].r)) continue;
    const preT = segs.slice(0, i).map(segMk).join('');
    if (pk && !preT.endsWith(pk)) continue;
    const after = segs.slice(j).map(s => ({ ...s }));
    let okc = '';
    if (ok && after[0] && !after[0].r) {
      const a = after[0].t; let k = 0;
      while (k < ok.length && k < a.length && a[k] === ok[k]) k++;
      // động từ nhóm 1: chữ cuối đổi theo thể nhưng cùng hàng (休む → 休み, 書く → 書か) → gạch dưới cả chữ đó
      if (/^v5/.test(v.pos || '') && k === ok.length - 1 && a[k] && ROW.get(a[k]) != null && ROW.get(a[k]) === ROW.get(ok[k])) k++;
      okc = a.slice(0, k); after[0].t = a.slice(k);
    }
    return { pre: preT.slice(0, preT.length - pk.length), w: pk + run + okc, r: pk + runR + okc, pk, run, runR, ok, okc, full: okc === ok && !(after[0] && /^[ぁ-ゖ]/.test(after[0].t) && /^(adj-i|v)/.test(v.pos || '') && !/^[をにがはでへともやの、。]/.test(after[0].t)), post: after.map(segMk).join('') };
  }
  return null;
}
// Từ chỉ viết bằng kana (katakana, phó từ…): tìm nguyên chữ, không dính vào chữ katakana khác
function locateKana(v, jp) {
  const w = v.kana; if (!w || v.kanji) return null;
  const segs = parseJP(stripHL(jp)), kt = isKata(w);
  if (!kt && w.length < 3) return null;
  for (let i = 0; i < segs.length; i++) {
    if (segs[i].r) continue;
    const s = segs[i].t;
    for (let k = s.indexOf(w); k >= 0; k = s.indexOf(w, k + 1)) {
      const b = s[k - 1] || '', a = s[k + w.length] || '';
      if (kt && (/[゠-ヿー]/.test(b) || /[゠-ヿー]/.test(a))) continue;
      return { pre: segs.slice(0, i).map(segMk).join('') + s.slice(0, k), w, r: hira(w), full: true, post: s.slice(k + w.length) + segs.slice(i + 1).map(segMk).join('') };
    }
  }
  return null;
}
const sentHTML = (p, mid) => `<p class="prompt-sent jt-sent" lang="ja">${rubyHTML(p.pre)}${mid}${rubyHTML(p.post)}</p>`;
const U = h => `<u class="jt-u">${h}</u>`;

// ---------- phương án nhiễu cách đọc (kiểu đề thật: がっこう / がっこ / がこう) ----------
const DAK = { か: 'が', き: 'ぎ', く: 'ぐ', け: 'げ', こ: 'ご', さ: 'ざ', し: 'じ', す: 'ず', せ: 'ぜ', そ: 'ぞ', た: 'だ', ち: 'ぢ', つ: 'づ', て: 'で', と: 'ど', は: 'ば', ひ: 'び', ふ: 'ぶ', へ: 'べ', ほ: 'ぼ' };
const UNDAK = Object.fromEntries(Object.entries(DAK).map(([a, b]) => [b, a]));
const HANDAK = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ', ば: 'ぱ', び: 'ぴ', ぶ: 'ぷ', べ: 'ぺ', ぼ: 'ぽ', ぱ: 'ば', ぴ: 'び', ぷ: 'ぶ', ぺ: 'べ', ぽ: 'ぼ' };
const ROW_OU = 'こそとのほもよろごぞどぼぽょくすつぬふむゆるぐずづぶぷゅ', ROW_E = 'けせてねへめれげぜでべぺ', SOKU = 'かきくけこさしすせそたちつてとぱぴぷぺぽ';
function mutants(r) {
  const A = [...r], out = new Set();
  const rep = (i, c) => A.slice(0, i).join('') + c + A.slice(i + 1).join('');
  const ins = (i, c) => A.slice(0, i).join('') + c + A.slice(i).join('');
  const del = i => A.slice(0, i).join('') + A.slice(i + 1).join('');
  A.forEach((c, i) => {
    if (DAK[c]) out.add(rep(i, DAK[c]));
    if (UNDAK[c]) out.add(rep(i, UNDAK[c]));
    if (HANDAK[c] && i > 0) out.add(rep(i, HANDAK[c]));
    const nx = A[i + 1];
    if (ROW_OU.includes(c)) out.add(nx === 'う' ? del(i + 1) : ins(i + 1, 'う'));
    if (ROW_E.includes(c)) out.add(nx === 'い' ? del(i + 1) : ins(i + 1, 'い'));
    if (c === 'っ') out.add(del(i));
    else if (i > 0 && SOKU.includes(c) && A[i - 1] !== 'っ' && A[i - 1] !== 'ん') out.add(ins(i, 'っ'));
    if ('ゃゅょ'.includes(c)) { for (const s of 'ゃゅょ') if (s !== c) out.add(rep(i, s)); out.add(rep(i, { ゃ: 'や', ゅ: 'ゆ', ょ: 'よ' }[c])); }
    if (c === 'ん' && i > 0) out.add(del(i));
  });
  out.delete(r);
  return [...out].filter(x => x.length >= 2 && !/^[っんー]/.test(x) && !/っ$/.test(x));
}
function readingFoils(p, v) {
  const real = new Set(D.vocab.filter(o => o.kanji && o.kanji === v.kanji).map(o => hira(o.kana)));
  const wrap = x => p.pk + x + p.okc;
  const dict = x => p.pk + x + p.ok;
  const one = shuffle(mutants(p.runR)).filter(x => !real.has(dict(x)));
  const out = [];
  for (const x of one) { if (out.length >= 2) break; out.push(x); }
  // một phương án sai hai chỗ (がっこう → がこ)
  for (const x of shuffle([...out])) { const y = shuffle(mutants(x)).find(z => z !== p.runR && !out.includes(z) && !real.has(dict(z))); if (y) { out.push(y); break; } }
  for (const x of one) { if (out.length >= 3) break; if (!out.includes(x)) out.push(x); }
  return out.slice(0, 3).map(wrap);
}

// ---------- phương án nhiễu cách viết: chữ cùng âm Hán, chữ trông giống ----------
let _onIdx = null, _onN = -1;
function onIndex() {
  if (_onIdx && _onN === D.kanji.length) return _onIdx;
  const m = new Map();
  for (const k of D.kanji) for (const o of k.on || []) { const h = hira(o); if (!m.has(h)) m.set(h, []); m.get(h).push(k); }
  _onIdx = m; _onN = D.kanji.length; return m;
}
function kanjiAlts(c, L) {
  const k = D.kanjiByChar.get(c), out = [];
  for (const s of k?.similar || []) out.push({ c: s.c, why: 'giống' });
  for (const o of D.kanji) if ((o.similar || []).some(s => s.c === c)) out.push({ c: o.char, why: 'giống' });
  const idx = onIndex();
  for (const on of k?.on || []) for (const o of idx.get(hira(on)) || []) if (o.char !== c && rank(o.level) <= rank(L) + 1) out.push({ c: o.char, why: 'cùng âm' });
  const seen = new Set();
  return shuffle(out).filter(x => !seen.has(x.c) && seen.add(x.c));
}
function writingFoils(p, v, L) {
  const realSame = new Set(D.vocab.filter(o => o.kanji && hira(o.kana) === hira(v.kana)).map(o => o.kanji));
  const cand = [];
  [...p.run].forEach((c, i) => { for (const a of kanjiAlts(c, L)) cand.push({ s: p.pk + p.run.slice(0, i) + a.c + p.run.slice(i + 1), why: a.why }); });
  const out = [], seen = new Set([p.w]);
  // ưu tiên một chữ trông giống, còn lại chữ cùng âm
  for (const pass of ['giống', 'cùng âm', null]) for (const x of shuffle(cand)) {
    if (out.length >= 3) break;
    if (pass && x.why !== pass) continue;
    if (seen.has(x.s) || realSame.has(x.s + p.ok)) continue;
    if (pass === 'giống' && out.some(o => o.why === 'giống')) continue;
    seen.add(x.s); out.push(x);
  }
  return out.map(x => x.s + p.okc);
}
const KMUT = { カ: 'ガ', キ: 'ギ', ク: 'グ', ケ: 'ゲ', コ: 'ゴ', サ: 'ザ', シ: 'ジ', ス: 'ズ', セ: 'ゼ', ソ: 'ゾ', タ: 'ダ', チ: 'ヂ', ツ: 'ヅ', テ: 'デ', ト: 'ド', ハ: 'バ', ヒ: 'ビ', フ: 'ブ', ヘ: 'ベ', ホ: 'ボ' };
const KUN = Object.fromEntries(Object.entries(KMUT).map(([a, b]) => [b, a]));
const KLOOK = { シ: 'ツ', ツ: 'シ', ソ: 'ン', ン: 'ソ', ク: 'ワ', ワ: 'ク', ヌ: 'ス', ス: 'ヌ', ル: 'レ', レ: 'ル', メ: 'ナ' };
function kataFoils(w) {
  const A = [...w], out = new Set();
  const rep = (i, c) => A.slice(0, i).join('') + c + A.slice(i + 1).join('');
  A.forEach((c, i) => {
    if (KMUT[c]) out.add(rep(i, KMUT[c]));
    if (KUN[c]) out.add(rep(i, KUN[c]));
    if (KLOOK[c]) out.add(rep(i, KLOOK[c]));
    if (c === 'ー') out.add(rep(i, ''));
    else if (i > 0 && A[i + 1] !== 'ー' && /[アカサタナハマヤラワガザダバパオコソトノホモヨロゴゾドボポ]/.test(c)) out.add(A.slice(0, i + 1).join('') + 'ー' + A.slice(i + 1).join(''));
    if (c === 'ッ') out.add(rep(i, ''));
    if ('ャュョ'.includes(c)) out.add(rep(i, { ャ: 'ヤ', ュ: 'ユ', ョ: 'ヨ' }[c]));
  });
  out.delete(w);
  return shuffle([...out]).filter(x => x.length >= 2).slice(0, 3);
}

// ---------- từng phần thi ----------
const GRP = p => (/^v/.test(p || '') ? 'v' : p === 'adj-i' ? 'ai' : p === 'adj-na' ? 'an' : p === 'adv' || p === 'ono' ? 'adv' : p === 'n' || p === 'n-suru' || p === 'ctr' ? 'n' : 'x');
const optsOf = (right, foils, jp = true) => shuffle([right, ...foils]).map(x => opt(x === right ? 'ok' : 'x' + foils.indexOf(x), esc(x), jp));
const exAfter = ex => `<p class="after-sent" lang="ja">${rich(ex.jp)}</p><p class="small">${esc(ex.vi)}</p>`;

function yomiQ(v) {
  if (!v.kanji) return null;
  for (const ex of shuffle(exOf(v))) {
    const p = locate(v, ex.jp); if (!p) continue;
    const fo = readingFoils(p, v); if (fo.length < 3) return null;
    return { part: 'yomi', promptBare: true, prompt: sentHTML(p, U(esc(p.w))), opts: optsOf(p.r, fo), answer: 'ok', after: exAfter(ex), review: { id: v.id, dir: 'kr' } };
  }
  return null;
}
function hyokiQ(v, L) {
  for (const ex of shuffle(exOf(v))) {
    if (v.kanji) {
      const p = locate(v, ex.jp); if (!p) continue;
      const fo = writingFoils(p, v, L); if (fo.length < 3) return null;
      return { part: 'hyoki', prompt: sentHTML(p, U(esc(p.r))), opts: optsOf(p.w, fo), answer: 'ok', after: exAfter(ex), review: null };
    }
    if (!isKata(v.kana)) return null;
    const p = locateKana(v, ex.jp); if (!p) continue;
    const fo = kataFoils(v.kana); if (fo.length < 3) return null;
    return { part: 'hyoki', prompt: sentHTML(p, U(esc(p.r))), opts: optsOf(v.kana, fo), answer: 'ok', after: exAfter(ex), review: null };
  }
  return null;
}
// phương án là từ cùng loại (danh từ với danh từ…), nghĩa không đụng nhau (distractors đã loại từ cùng nghĩa, đồng nghĩa)
function wordOpts(v, extraBan = []) {
  const g = GRP(v.pos);
  const ds = distractors(v, 'vj', 'furi', 12).filter(a => a.it && GRP(a.it.pos) === g && !extraBan.some(b => b === a.it || sameMeaning(b, a.it))).slice(0, 3);
  return ds.length < 3 ? null : ds;
}
function bunmyakuQ(v) {
  if (GRP(v.pos) === 'x') return null;
  for (const ex of shuffle(exOf(v))) {
    const p = v.kanji ? locate(v, ex.jp) : locateKana(v, ex.jp);
    if (!p || !p.full) continue;
    const ds = wordOpts(v); if (!ds) return null;
    const right = answerOf(v, 'vj', 'furi');
    return { part: 'bunmyaku', prompt: sentHTML(p, '<span class="blank jt-blank" aria-label="chỗ trống">（　　　）</span>') + `<p class="prompt-vi-s">${esc(ex.vi)}</p>`,
      opts: shuffle([right, ...ds]).map(a => opt(a === right ? 'ok' : 'x' + ds.indexOf(a), a.html, true)), answer: 'ok', after: exAfter(ex), review: { id: v.id, dir: 'vj' } };
  }
  return null;
}
let _rev = null, _revN = -1;
function synsOf(v) {
  if (!_rev || _revN !== D.vocab.length) {
    _rev = new Map(); _revN = D.vocab.length;
    for (const o of D.vocab) for (const s of o.syn || []) if (typeof s === 'string') { if (!_rev.has(s)) _rev.set(s, []); _rev.get(s).push(o); }
  }
  const out = [];
  for (const s of v.syn || []) {
    if (typeof s === 'string') { const o = D.items.get(s); if (o && o.level && rank(o.level) <= rank(v.level) + 1) out.push({ html: `<span lang="ja">${rich(o.kf || (o.kanji ? `${o.kanji}[${o.kana}]` : o.kana))}</span>`, it: o }); }
    else if (s && s.w) out.push({ html: `<span lang="ja">${rich(s.w)}</span>`, it: null });
  }
  for (const o of _rev.get(v.id) || []) if (rank(o.level) <= rank(v.level) + 1) out.push({ html: `<span lang="ja">${rich(o.kf || (o.kanji ? `${o.kanji}[${o.kana}]` : o.kana))}</span>`, it: o });
  return out;
}
function iikaeQ(v) {
  const syns = synsOf(v); if (!syns.length || GRP(v.pos) === 'x') return null;
  for (const ex of shuffle(exOf(v))) {
    const p = v.kanji ? locate(v, ex.jp) : locateKana(v, ex.jp);
    if (!p || !p.full) continue;
    const syn = syns[Math.floor(Math.random() * syns.length)];
    const ds = wordOpts(v, syn.it ? [syn.it] : []); if (!ds) return null;
    const word = rubyHTML(v.kanji ? `${p.pk ? p.pk : ''}${p.run}[${p.runR}]${p.okc}` : p.w);
    return { part: 'iikae', prompt: sentHTML(p, U(word)),
      opts: shuffle([syn, ...ds]).map(a => opt(a === syn ? 'ok' : 'x' + ds.indexOf(a), a.html, true)), answer: 'ok',
      after: exAfter(ex) + `<p class="small">${esc(plain(v.kanji || v.kana))} ≈ <span lang="ja">${syn.html}</span></p>`, review: { id: v.id, dir: 'jv' } };
  }
  return null;
}
const stripVi = h => h.replace(/<p class="prompt-vi-s">[\s\S]*?<\/p>/, '');
function bunpoQ(g) {
  for (const ex of shuffle([...(g.ex || [])])) {
    const q = GQ.blank(g, ex);
    if (q && q.kind === 'choice') return { ...q, part: 'bunpo', prompt: stripVi(q.prompt), hint: '' };
  }
  return null;
}
function kumitateQ(g) {
  for (const ex of shuffle([...(g.ex || [])])) {
    const q = GQ.star(g, ex);
    // câu chỉ có 4 mảnh (cả câu là ô trống, không còn ngữ cảnh) → bỏ; đề thật không cho nghĩa câu
    if (q && q.kind === 'choice' && !q.prompt.includes('prompt-vi-s')) return { ...q, part: 'kumitate', hint: '', prompt: q.prompt.replace(/<details class="vihint">[\s\S]*?<\/details>/, '') };
  }
  return null;
}

// ---------- đọc hiểu, nghe hiểu ----------
const usableQs = it => (it.questions || []).filter(x => (x.opts || []).length >= 2 && x.ans != null);
// bài luyện thêm (không gắn bài học) trước, bài mở đầu của bài học sau
function docsOf(list, L, maxLines = 0) {
  const ok = list.filter(x => x.level === L && usableQs(x).length && (!maxLines || (x.turns || x.sents || []).length <= maxLines));
  return [...shuffle(ok.filter(x => !x.intro)), ...shuffle(ok.filter(x => x.intro))];
}
function passHTML(it) {
  const paras = [];
  for (const s of it.sents || []) {
    const cls = s.fmt === 'h' ? 'jt-h' : s.fmt === 'r' ? 'jt-r' : '';
    if (cls || s.br || !paras.length || paras[paras.length - 1].cls) paras.push({ cls, html: rich(s.jp) });
    else paras[paras.length - 1].html += rich(s.jp);
  }
  return `<div class="jt-pass" lang="ja" tabindex="0">${paras.map(p => `<p${p.cls ? ` class="${p.cls}"` : ''}>${p.html}</p>`).join('')}</div>`;
}
function docQs(it, part, mkPrompt, after) {
  const qs = usableQs(it);
  return qs.map((x, k) => {
    const right = x.opts[x.ans], jp = o => /[ぁ-ヿ一-龯]/.test(o);
    return { part, grp: it.id, prompt: mkPrompt(x, k, qs.length), reviewPrompt: `<p class="small muted">${esc(it.title)}</p><p class="prompt-vi">${rich(x.q)}</p>`,
      opts: shuffle(x.opts.map((o, i) => opt(o === right && i === x.ans ? 'ok' : 'x' + i, rich(o), jp(o)))), answer: 'ok',
      after: (x.why ? `<p>${rich(x.why)}</p>` : '') + after, review: null };
  });
}
function dokkaiQs(it) {
  return docQs(it, 'dokkai', (x, k, n) => `${passHTML(it)}<p class="jt-qn small muted">Câu ${k + 1}/${n} của bài này</p><p class="prompt-vi jt-q">${rich(x.q)}</p>`, '');
}
const transcript = it => `<details class="jt-tr"><summary class="small">Lời hội thoại</summary>${(it.turns || []).map(t => { const r = (it.roles || []).find(x => x.key === t.who); return `<p lang="ja"><b>${rich(r?.name || t.who)}</b>：${rich(t.jp)}</p>`; }).join('')}</details>`;
function chokaiQs(it) {
  return docQs(it, 'chokai', (x, k, n) => `<div class="jt-listen"><button type="button" class="btn btn-ghost jt-play" data-jt-play="${esc(it.id)}">${icon('speaker')} Nghe hội thoại</button>
      <span class="small muted">${k ? 'nghe lại được' : 'tự phát khi mở câu'}</span></div>
    ${it.setting ? `<p class="doc-set small">${rich(it.setting)}</p>` : ''}<p class="jt-qn small muted">Câu ${k + 1}/${n} của bài này</p><p class="prompt-vi jt-q">${rich(x.q)}</p>`, transcript(it))
    .map((q, k) => ({ ...q, autoDlg: k === 0 ? it.id : '', onShow: bindListen }));
}
function sokujiQ(v, pool) {
  const right = v.reply[0].jp, mine = new Set(v.reply.map(r => plain(r.jp)));
  const others = [];
  for (const o of shuffle(pool)) {
    if (o === v || sameMeaning(o, v)) continue;
    for (const r of o.reply) { const p = plain(r.jp); if (!mine.has(p) && !others.some(x => plain(x) === p)) { others.push(r.jp); break; } }
    if (others.length >= 2) break;
  }
  if (others.length < 2) return null;
  const all = shuffle([right, ...others]);
  return { part: 'sokuji', prompt: '<p class="prompt-hint">Nghe câu nói (bấm loa để nghe lại), rồi chọn câu đáp phù hợp nhất</p>', say: reading(v.kf || v.kanji || v.kana), autoSay: true,
    opts: all.map(t => opt(t === right ? 'ok' : 'x' + others.indexOf(t), rich(t), true)), answer: 'ok',
    after: `<p lang="ja">${rich(v.kf || v.kanji || v.kana)} → ${rich(right)}</p>`, review: null };
}

// ---------- phát hội thoại nhiều giọng ----------
let playRun = 0, played = new Set();
export function stopAudio() { playRun++; try { speechSynthesis.cancel(); } catch { } document.querySelectorAll('.jt-play.is-on').forEach(b => b.classList.remove('is-on')); }
function playDialog(it, btn) {
  stopAudio();
  const me = ++playRun, vs = jaVoices(), roles = (it.roles || []).map(r => r.key), ls = it.turns || [];
  btn?.classList.add('is-on');
  const step = i => {
    if (me !== playRun) return;
    if (i >= ls.length) { btn?.classList.remove('is-on'); return; }
    const u = new SpeechSynthesisUtterance(reading(ls[i].jp));
    u.lang = 'ja-JP'; u.rate = S.rate || 0.9;
    const k = Math.max(0, roles.indexOf(ls[i].who));
    // mỗi vai một giọng; máy chỉ có một giọng tiếng Nhật thì đổi độ cao giọng để phân biệt người nói
    if (vs.length > 1) u.voice = k > 0 ? vs[k % vs.length] : pickVoice(); else { u.voice = pickVoice(); u.pitch = [1, 0.75, 1.3, 0.9][k % 4]; }
    u.onend = () => setTimeout(() => step(i + 1), 450);
    u.onerror = () => step(i + 1);
    speechSynthesis.speak(u);
  };
  step(0);
}
function bindListen(view) {
  const q = this;
  const b = view.querySelector('[data-jt-play]'); if (!b) return;
  const it = D.items.get(b.dataset.jtPlay); if (!it) return;
  b.onclick = () => playDialog(it, b);
  if (q.autoDlg && !played.has(q.autoDlg)) { played.add(q.autoDlg); setTimeout(() => b.isConnected && playDialog(it, b), 300); }
}

// ---------- dựng đề ----------
function* examGen(L) {
  const C = COUNT[L] || COUNT.N2, out = [], usedV = new Set(), usedG = new Set();
  const vocab = D.vocab.filter(v => v.level === L && v.reg !== 'kansai');
  const gen = [...shuffle(vocab.filter(v => !isSpec(v))), ...shuffle(vocab.filter(isSpec))];
  const take = function* (part, n, mk, cands, used) {
    let k = 0;
    for (const c of cands) {
      if (k >= n) break;
      if (used && used.has(c.id)) continue;
      const q = mk(c);
      if (q) { out.push(q); used?.add(c.id); k++; }
      yield;
    }
  };
  yield* take('yomi', C.yomi, yomiQ, gen.filter(v => v.kanji), usedV);
  yield* take('hyoki', C.hyoki, v => hyokiQ(v, L), gen, usedV);
  yield* take('bunmyaku', C.bunmyaku, bunmyakuQ, gen, usedV);
  yield* take('iikae', C.iikae, iikaeQ, [...gen.filter(v => (v.syn || []).length), ...gen], usedV);
  const gs = shuffle(D.grammar.filter(g => g.level === L));
  yield* take('bunpo', C.bunpo, bunpoQ, gs, usedG);
  yield* take('kumitate', C.kumitate, kumitateQ, [...gs.filter(g => !usedG.has(g.id)), ...gs], null);
  let nd = 0;
  for (const it of docsOf(D.text, L)) { if (nd >= C.dokkai) break; const qs = dokkaiQs(it); out.push(...qs); nd += qs.length; yield; }
  if (ttsReady()) {
    let nc = 0;
    for (const it of docsOf(D.dialog, L, 24)) { if (nc >= C.chokai) break; const qs = chokaiQs(it); out.push(...qs); nc += qs.length; yield; }
    if (C.sokuji) {
      const pool = D.vocab.filter(v => (v.reply || []).length && v.reply[0].jp && rank(v.level) <= rank(L));
      yield* take('sokuji', C.sokuji, v => sokujiQ(v, pool), shuffle(pool), null);
    }
  }
  const qs = ORDER.flatMap(p => out.filter(q => q.part === p));
  return qs.map(q => ({ kind: 'choice', level: L, ...q, tag: `${plain(PART[q.part].jp)} · ${PART[q.part].vi}`,
    prompt: `<p class="jt-ins" lang="ja">${rich(PART[q.part].ins)}</p>${q.prompt}`, hint: q.hint ?? '' }));
}
export async function buildExam(L, budget = 8) {
  const g = examGen(L), gen = curGen();
  let r, t = performance.now();
  while (!(r = g.next()).done) if (performance.now() - t > budget) {
    await nextFrame(); t = performance.now();
    if (gen !== curGen()) return null;
  }
  return r.value;
}
const examSecs = qs => qs.reduce((s, q) => s + (SECS[q.part] || 45), 0);
const partCount = qs => Object.fromEntries(ORDER.map(p => [p, qs.filter(q => q.part === p).length]));

// ---------- trang Đề thi thử JLPT ----------
export async function renderJlptHub(view, ctx) {
  const lv = levelsWithData();
  const saved = await kvGet('jtSetup', {});
  const L0 = lv.includes(saved.level) ? saved.level : lv[0];
  const hist = testList().filter(t => t.kind === 'thithu');
  view.innerHTML = `<a class="back" href="#/trinhdo">Kiểm tra trình độ</a><h1 class="h1">Đề thi thử JLPT</h1>
    <p class="muted small">Đề chia đúng các phần thi như JLPT, câu hỏi kiểu đề thật (chữ Hán ở câu đọc để trần). Làm xong mới xem đáp án. Kết quả không đổi tiến độ học.</p>
    ${lv.length ? '' : emptyState('Kho chưa đủ dữ liệu để ra đề.')}
    <section class="card">
      <fieldset><legend>Cấp</legend>${chips('level', lv.map(l => [l, l]), L0, false)}</fieldset>
      <fieldset><legend>Đồng hồ</legend>${chips('timer', [['on', 'Tính giờ như phòng thi'], ['off', 'Không tính giờ']], saved.timer || 'on', false)}</fieldset>
      ${ttsReady() ? '' : '<p class="note small">Máy chưa có giọng đọc tiếng Nhật nên đề bỏ phần nghe hiểu (không ước lượng được đỗ / trượt). Cài giọng đọc ở Cài đặt.</p>'}
      <div class="jt-plan" aria-live="polite"></div>
      <button class="btn btn-primary btn-block" data-act="start" ${lv.length ? '' : 'disabled'}>Bắt đầu thi</button>
    </section>
    <details class="card"><summary class="h2">Cách chấm</summary>
      <p class="small">Mỗi phần thi tính tỉ lệ câu đúng rồi quy ra thang điểm của JLPT (tổng 180). Muốn đỗ phải đủ điểm tổng và không phần nào dưới điểm sàn:</p>
      <table class="lv-rule"><thead><tr><th>Cấp</th><th>Điểm đỗ</th><th>Điểm sàn từng phần</th></tr></thead><tbody>
        ${['N5', 'N4', 'N3', 'N2', 'N1'].map(L => `<tr><th>${L}</th><td>${PASS[L]}/180</td><td>${L === 'N5' || L === 'N4' ? 'Kiến thức ngôn ngữ · Đọc hiểu 38/120; Nghe 19/60' : 'mỗi phần 19/60'}</td></tr>`).join('')}</tbody></table>
      <p class="small muted">Đây chỉ là ước lượng: điểm JLPT thật được quy đổi theo độ khó từng đề, và đề trong app ngắn hơn đề thật khoảng một nửa.</p>
    </details>
    ${hist.length ? `<section class="card"><h2 class="h2">Các lần thi thử</h2><ul class="lv-hist">${hist.slice(0, 12).map(histRowJ).join('')}</ul></section>` : ''}`;
  let pre = null;
  const plan = view.querySelector('.jt-plan');
  const upd = async () => {
    const L = readChip(view, 'level'); if (!L || !plan) return;
    if (pre?.L !== L) pre = { L, p: buildExam(L) };
    const my = pre, gen = curGen();
    plan.innerHTML = loadingHTML('Đang soạn đề…');
    const qs = await my.p;
    if (!qs || gen !== curGen() || my !== pre || !plan.isConnected) return;
    const pc = partCount(qs);
    plan.innerHTML = `<table class="topics jt-parts"><tbody>${ORDER.filter(p => pc[p]).map(p => `<tr><th scope="row"><span lang="ja">${rich(PART[p].jp)}</span> <small class="muted">${esc(PART[p].vi)}</small></th><td class="num">${pc[p]} câu</td></tr>`).join('')}</tbody></table>
      <p class="small">${qs.length} câu${readChip(view, 'timer') === 'on' ? ` · ${Math.ceil(examSecs(qs) / 60)} phút` : ''}${(COUNT[L] && qs.length < Object.values(COUNT[L]).reduce((a, b) => a + b, 0) - 3) ? ' · kho cấp này còn ít dữ liệu nên đề ngắn hơn' : ''}.</p>`;
  };
  bindChips(view, upd); upd();
  view.querySelector('[data-act=start]').onclick = async e => {
    const b = e.currentTarget, L = readChip(view, 'level'), timer = readChip(view, 'timer');
    if (b.disabled || !L) return;
    b.disabled = true; b.innerHTML = '<span class="tn-spin" aria-hidden="true"></span> Đang soạn đề…';
    await kvSet('jtSetup', { level: L, timer });
    const qs = await (pre?.L === L ? pre.p : buildExam(L));
    pre = null;
    if (!qs || !b.isConnected) return;
    ctx.backTo = '#/thithu';
    runExam(view, ctx, L, qs, timer === 'on');
  };
}
function histRowJ(t) {
  return `<li><span class="muted small">${fmtDate(t.at || t.t)} · ${esc(t.level)}</span><span><b>${t.pts}/180</b> · ${t.pass == null ? 'chưa thi phần nghe' : t.pass ? '<b class="lv-pass">ước lượng đỗ</b>' : 'ước lượng chưa đỗ'} <small class="muted">(${t.pct}% câu đúng)</small></span></li>`;
}
function runExam(view, ctx, L, qs, timer) {
  played = new Set();
  ctx.onLeave(stopAudio);
  runDrill(view, qs, ctx, {
    title: `Thi thử JLPT ${L}`, mode: 'test', noReview: true, timeLimit: timer ? examSecs(qs) : 0,
    onDone: (res, info) => { stopAudio(); return info.empty ? goBack(ctx) : showExamResult(view, ctx, L, res, info.secs); },
  });
}

// ---------- kết quả ----------
async function showExamResult(view, ctx, L, res, secs) {
  ctx.inRun = true;
  const by = {};
  for (const r of res) { const p = r.q.part; by[p] = by[p] || [0, 0]; by[p][1]++; if (r.ok) by[p][0]++; }
  const secs3 = SECTIONS(L).map(s => {
    let a = 0, b = 0;
    for (const p of s.parts) if (by[p]) { a += by[p][0]; b += by[p][1]; }
    const pts = b ? Math.round((a / b) * s.max) : null;
    return { ...s, a, b, pts };
  });
  const missing = secs3.some(s => s.pts == null);
  const total = secs3.reduce((x, s) => x + (s.pts || 0), 0);
  const pass = missing ? null : total >= PASS[L] && secs3.every(s => s.pts >= s.base);
  const nOk = res.filter(r => r.ok).length, pct = Math.round((nOk / res.length) * 100);
  await saveTest({ id: 'j' + Date.now().toString(36), at: Date.now(), kind: 'thithu', level: L, pct, pts: total, pass, secs,
    sec: Object.fromEntries(secs3.map(s => [s.k, [s.pts, s.max]])), parts: by });
  ctx.sessionDone?.();
  const weak = ORDER.filter(p => by[p] && by[p][1] >= 2 && by[p][0] / by[p][1] < 0.6).sort((x, y) => by[x][0] / by[x][1] - by[y][0] / by[y][1]).slice(0, 3);
  const wrong = res.filter(r => !r.ok);
  const wrongV = [...new Map(wrong.filter(r => r.q.review && r.q.review.id.startsWith('v:')).map(r => [r.q.review.id, D.items.get(r.q.review.id)])).values()].filter(Boolean);
  const ansHTML = q => q.opts.find(o => o.key === q.answer)?.html || '';
  const chosen = r => (r.skip ? '<p class="muted small">Bỏ trống</p>' : `<p class="small">Đã chọn: <span lang="ja">${r.q.opts.find(o => o.key === r.chosen)?.html || ''}</span></p>`);
  view.innerHTML = `<section class="result jt-res">${crumbHTML(ctx)}
    <h1 class="h1">Kết quả thi thử JLPT ${esc(L)}</h1>
    <p class="result-score"><b>${total}</b><span>/180</span></p>
    <p class="result-sub">${pass == null ? 'Chưa có phần nghe nên chưa ước lượng được đỗ / trượt' : pass ? `<b class="lv-pass">Ước lượng: đỗ</b> (điểm đỗ ${PASS[L]})` : `Ước lượng: chưa đỗ (điểm đỗ ${PASS[L]}${secs3.some(s => s.pts != null && s.pts < s.base) ? ', có phần dưới điểm sàn' : ''})`} · ${nOk}/${res.length} câu đúng${secs >= 60 ? ` · ${Math.round(secs / 60)} phút` : ''}</p>
    <h2 class="h2">Theo phần thi</h2>
    <table class="topics jt-sec"><tbody>${secs3.map(s => `<tr><th scope="row"><span lang="ja">${rich(s.jp)}</span><small class="muted"> ${esc(s.vi)}</small></th>
      <td><span class="mini"><i style="width:${s.pts == null ? 0 : (s.pts / s.max) * 100}%"></i></span></td><td class="num">${s.pts == null ? '—' : `${s.pts}/${s.max}`}${s.pts != null && s.pts < s.base ? ' <b class="jt-low">dưới sàn</b>' : ''}</td></tr>`).join('')}</tbody></table>
    <h2 class="h2">Theo từng 問題</h2>
    <table class="topics bytag"><tbody>${ORDER.filter(p => by[p]).map(p => `<tr><th scope="row"><span lang="ja">${rich(PART[p].jp)}</span><small class="muted"> ${esc(PART[p].vi)}</small></th><td><span class="mini"><i style="width:${(by[p][0] / by[p][1]) * 100}%"></i></span></td><td class="num">${by[p][0]}/${by[p][1]}</td></tr>`).join('')}</tbody></table>
    <div class="note lv-note"><b>Nhận xét</b>${weak.length ? `<ul>${weak.map(p => `<li><b>${esc(PART[p].vi)}</b> (${Math.round((by[p][0] / by[p][1]) * 100)}%): ${esc(PART[p].tip)} <a href="${PART[p].go}">Luyện ngay</a></li>`).join('')}</ul>` : `<p>Không phần nào dưới 60%. ${pass ? 'Giữ nhịp ôn đều, thử đề cấp cao hơn khi Lộ trình tới chặng sau.' : 'Làm thêm vài đề để kết quả chắc hơn.'}</p>`}
      ${pass == null ? '' : secs3.filter(s => s.pts != null && s.pts < s.base).map(s => `<p class="small">Phần <b>${esc(s.vi)}</b> dưới điểm sàn (${s.pts}/${s.base}) — dù tổng đủ cũng bị trượt, cần ưu tiên phần này.</p>`).join('')}</div>
    <div class="row-btns stack">
      ${wrongV.length ? `<button class="btn btn-ghost" data-act="learnw">Học ngay ${wrongV.length} từ làm sai</button>` : ''}
      ${wrong.length ? '<button class="btn btn-ghost" data-act="redo">Luyện lại các câu sai (không tính điểm)</button>' : ''}
      <button class="btn btn-primary" data-act="again">Làm đề mới</button>
    </div>
    ${wrong.length ? `<details class="lv-wrong"><summary class="h2">Câu sai và bỏ trống (${wrong.length})</summary><ul class="wlist wlist-drill">${wrong.map(r => `<li><span class="muted small">${esc(r.q.tag || '')}</span><div class="wq">${r.q.reviewPrompt || r.q.prompt.replace(/<p class="jt-ins"[\s\S]*?<\/p>/, '')}</div>${chosen(r)}<p>Đáp án: <b lang="ja">${ansHTML(r.q)}</b></p>${r.q.after || ''}</li>`).join('')}</ul></details>` : ''}
    ${resultNavHTML(ctx, { kind: 'test' })}</section>`;
  bindSay(view);
  view.querySelectorAll('.result [data-nokj]').forEach(x => x.removeAttribute('data-nokj'));
  bindResultNav(view, ctx, { kind: 'test' });
  const lw = view.querySelector('[data-act=learnw]');
  if (lw) lw.onclick = () => runLearn(view, wrongV, ctx);
  const rd = view.querySelector('[data-act=redo]');
  if (rd) rd.onclick = () => { played = new Set(); runDrill(view, wrong.map(r => ({ ...r.q, _again: false })), ctx, { title: `Thi thử ${L} · luyện lại`, noReview: true }); };
  view.querySelector('[data-act=again]').onclick = () => ctx.go('#/thithu', true);
  window.scrollTo(0, 0);
}
