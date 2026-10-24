// Luyện thể (đợt 5b — Đ3, Đ4): gõ thể, chuỗi biến đổi, nhận diện ngược, nghe → thể, đổi câu, cặp tự – tha, kính ngữ,
// tính từ (có bẫy きれい / いい), danh từ + だ, phó từ trong câu, katakana; 60 giây tốc độ; bảng chia tự kiểm; điểm theo thể (B4).
import { esc, rich, rubyHTML, plain, reading, shuffle, wordHTML, toast, icon } from './util.js';
import { D, setPrefs, logAct } from './data.js';
import { status, errCount, isStar } from './srs.js';
import { verbInfo, conjugate, conjPart, wrongForms, ruleText, FORMS, FORM_LEVEL, BASE_FORMS, EXT_FORMS, CASUAL, DERIVED, formVi, shortVi, verbVi } from './conj.js';
import { adjInfo, adjConj, adjWrong, AFORMS, adjVi, NFORMS, nounConj, nounWrong } from './adj.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, readChips } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { G2F } from './formgram.js';
import { ttsReady } from './tts.js';
import { recForm, formScore } from './fstat.js';
import { buildThe, buildNgPhap, verbPhrases, grammarTemplates, makeSent, FTPL } from './practice.js';
import { learnedForms } from './wordx.js';
import { viClash } from './quiz.js';
import { beginSession, goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';

const sentHTML = jp => `<p class="after-sent" lang="ja">${rubyHTML(jp, true)}</p>`;
const rec = (f, g) => ok => recForm(f, g, ok);
const uniqBy = (arr, key) => { const s = new Set(); return arr.filter(x => { const k = key(x); if (s.has(k)) return false; s.add(k); return true; }); };

// ---------- mẫu ngữ pháp → thể (B1) — bảng G2F chuyển sang formgram.js (v67) ----------
export function formsForGrammar(g) {
  if (!g) return [];
  const p = plain(g.pattern).replace(/[（(].*$/, m => m); // giữ cả chú thích trong ngoặc (様態…)
  for (const [re, fs] of G2F) if (re.test(p) || re.test(plain(g.pattern))) return fs;
  return [];
}

// ---------- chọn từ theo nguồn (chọn được nhiều) ----------
const SRC = [['learning', 'Đang học'], ['known', 'Đã thuộc'], ['wrong', 'Hay sai'], ['all', 'Tất cả']];
const KINDS = [['verb', 'Động từ'], ['adj', 'Tính từ'], ['noun', 'Danh từ + だ'], ['other', 'Phó từ, katakana']];
function baseOf(kind) {
  if (kind === 'verb') return D.vocab.filter(v => verbInfo(v));
  if (kind === 'adj') return D.vocab.filter(v => adjInfo(v));
  if (kind === 'noun') return D.vocab.filter(v => v.pos === 'n' && v.reg !== 'kansai' && (v.kf || v.kanji || v.kana));
  return D.vocab.filter(v => v.reg !== 'kansai' && (((v.pos === 'adv' || v.pos === 'ono') && (v.ex || []).length) || (v.goc && /^[ァ-ヶー・]+$/.test(v.kana))));
}
export function pickWords(kind, srcs) {
  const base = baseOf(kind);
  if (!srcs.length || srcs.includes('all')) return base;
  return base.filter(it => (srcs.includes('learning') && status(it) === 'learning') || (srcs.includes('known') && status(it) === 'known') || (srcs.includes('wrong') && errCount(it) > 0));
}

// ---------- động từ ----------
const vHead = (it, f) => `<p class="prompt-jp" lang="ja">${rich(verbInfo(it).dict)}</p><p class="prompt-hint">${esc(verbVi(it))} → <b>${esc(FORMS[f])}</b></p>`;
const vAfter = (it, f) => `<p>${rich(ruleText(it, f))}</p><p class="muted small">Nghĩa: ${esc(formVi(f, it))}</p>`;
function typeVerbQ(it, f) {
  const v = verbInfo(it), c = conjugate(v, f);
  if (!c) return null;
  return { kind: 'type', tag: 'Gõ thể — ' + FORMS[f], level: FORM_LEVEL[f], prompt: vHead(it, f), accept: [c.kana, plain(c.mark)], answerHTML: rich(c.mark), after: vAfter(it, f), onAnswer: rec(f, v.group) };
}
function conjChoiceQ(it, f) {
  const v = verbInfo(it), c = conjugate(v, f);
  if (!c) return null;
  const wr = uniqBy(wrongForms(v, f).filter(m => plain(m) !== plain(c.mark)), plain).slice(0, 3);
  if (wr.length < 3) return null;
  return { kind: 'choice', tag: 'Chọn thể — ' + FORMS[f], level: FORM_LEVEL[f], prompt: vHead(it, f),
    opts: shuffle([c.mark, ...wr]).map((m, i) => opt(m === c.mark ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after: vAfter(it, f), onAnswer: rec(f, v.group) };
}
// Chuỗi biến đổi: một động từ qua 5 thể liền; sai bước nào thì phần giải thích nói luật bước đó
function chainQs(it, forms) {
  const v = verbInfo(it);
  const seq = ['masu', 'te', 'nai', 'ta'].filter(f => conjugate(v, f));
  const extra = shuffle(forms.filter(f => !seq.includes(f) && conjugate(v, f)))[0];
  if (extra) seq.push(extra);
  const done = [v.dict], out = [];
  seq.forEach((f, k) => {
    const c = conjugate(v, f);
    const wr = uniqBy(wrongForms(v, f).filter(m => plain(m) !== plain(c.mark)), plain).slice(0, 3);
    if (wr.length >= 2) {
      out.push({ kind: 'choice', tag: `Chuỗi biến đổi ${k + 1}/${seq.length}`, level: FORM_LEVEL[f],
        prompt: `<p class="chain" lang="ja">${done.map(m => rich(m)).join(' → ')} → <span class="chain-q">？</span></p><p class="prompt-hint">${esc(verbVi(it))} → <b>${esc(FORMS[f])}</b></p>`,
        opts: shuffle([c.mark, ...wr]).map((m, i) => opt(m === c.mark ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after: vAfter(it, f), onAnswer: rec(f, v.group) });
    }
    done.push(c.mark);
  });
  return out;
}
// Nhận diện ngược: thấy 書[か]かされた → chọn thể. Các thể ra cùng một mặt chữ (食べられる = khả năng / bị động) gộp làm một đáp án.
const TAILS = { masu: 'lịch sự', mashita: 'quá khứ lịch sự', masen: 'phủ định lịch sự', te: 'thể て', ta: 'quá khứ' };
const codeLabel = c => { const [f, t] = c.split('.'); return FORMS[f] + (t ? ' · ' + TAILS[t] : ''); };
const ALL_CODES = [...BASE_FORMS, ...EXT_FORMS, ...DERIVED.flatMap(d => Object.keys(TAILS).map(t => d + '.' + t))];
function identQ(it, forms, listen = false) {
  const v = verbInfo(it);
  const surf = new Map();
  for (const c of ALL_CODES) {
    const m = conjPart(v, c);
    if (!m) continue;
    const k = plain(m.mark);
    if (!surf.has(k)) surf.set(k, { m, codes: [] });
    surf.get(k).codes.push(c);
  }
  const mineCodes = shuffle([...forms.filter(f => conjPart(v, f)), ...DERIVED.filter(d => forms.includes(d)).flatMap(d => ['mashita', 'ta', 'te'].map(t => d + '.' + t))]);
  const mine = mineCodes[0];
  if (!mine) return null;
  const m = conjPart(v, mine), S0 = surf.get(plain(m.mark));
  const [mf, mt] = mine.split('.');
  const score = x => x.codes.reduce((s, c) => { const [f, t] = c.split('.'); return Math.max(s, (t && t === mt ? 2 : 0) + (DERIVED.includes(f) && DERIVED.includes(mf) ? 2 : 0) + (forms.includes(f) ? 1 : 0)); }, 0) + Math.random();
  const others = [...surf.values()].filter(x => x !== S0).sort((a, b) => score(b) - score(a)).slice(0, 3);
  if (others.length < 3) return null;
  const lab = x => x.codes.map(codeLabel).join(' / ');
  return { kind: 'choice', tag: listen ? 'Nghe → chọn thể' : 'Nhận diện thể', level: FORM_LEVEL[mf],
    prompt: listen ? '<p class="prompt-hint">Nghe (bấm loa để nghe lại) rồi chọn đây là thể gì</p>' : `<p class="prompt-jp" lang="ja">${rich(m.mark)}</p>`,
    hint: listen ? '' : 'Đây là thể gì?', say: listen ? m.kana : undefined, autoSay: listen,
    opts: shuffle([S0, ...others]).map((x, i) => opt(x === S0 ? 'ok' : 'x' + i, esc(lab(x)), false)), answer: 'ok',
    after: `<p><span lang="ja">${rich(m.mark)}</span> = <b>${esc(lab(S0))}</b> của <span lang="ja">${rich(v.dict)}</span> (${esc(verbVi(it))}).</p><p class="muted small">${rich(ruleText(it, mf))}</p>`,
    onAnswer: rec(mf, v.group) };
}
// Đổi câu: thường ↔ lịch sự, khẩu ngữ ↔ chuẩn, câu → sai khiến, sai khiến → sai khiến bị động
const ME = '私[わたし]', BOSS = '班長[はんちょう]';
const end = s => s + '。';
function politeQ(ph) {
  const v = ph.v;
  const mk = c => (c === 'dict' ? v.dict : c === 'masendeshita' ? (conjugate(v, 'masen')?.mark || '') + 'でした' : conjugate(v, c)?.mark);
  const P = [['dict', 'masu'], ['nai', 'masen'], ['ta', 'mashita'], ['nakatta', 'masendeshita']];
  if (P.some(([a, b]) => !mk(a) || !mk(b) || mk(b) === 'でした')) return null;
  const k = Math.floor(Math.random() * 4), up = Math.random() < 0.5;
  const from = end(ph.pre + mk(P[k][up ? 0 : 1])), right = end(ph.pre + mk(P[k][up ? 1 : 0]));
  const opts = P.map(p => end(ph.pre + mk(p[up ? 1 : 0])));
  return { kind: 'choice', tag: 'Đổi câu — thường ↔ lịch sự', level: 'N5',
    prompt: `<p class="prompt-hint">${up ? 'Nói lại cho lịch sự (thể ます), giữ nguyên nghĩa' : 'Nói lại bằng thể thường (với bạn bè), giữ nguyên nghĩa'}</p><p class="prompt-sent" lang="ja">${rubyHTML(from, true)}</p>`,
    opts: shuffle(opts).map((s, i) => opt(s === right ? 'ok' : 'x' + i, rich(s))), answer: 'ok', after: sentHTML(right) + `<p class="muted small">${esc(ph.vi)}</p>`, onAnswer: rec(P[k][1] === 'masendeshita' ? 'masen' : P[k][1], v.group) };
}
const STD = { teshimau: v => conjugate(v, 'teshimau')?.mark, teoku: v => conjugate(v, 'teoku')?.mark, teiru: v => conjugate(v, 'teiru')?.mark, nakereba: v => (conjugate(v, 'nakereba')?.mark || '') + 'ならない', tewa: v => conjugate(v, 'tewa')?.mark };
function casualQ(ph) {
  const v = ph.v;
  const cs = shuffle(Object.keys(CASUAL).filter(c => conjugate(v, c) && STD[CASUAL[c]](v)));
  if (cs.length < 4) return null;
  const c = cs[0], toStd = Math.random() < 0.6;
  const cas = x => conjugate(v, x).mark, std = x => STD[CASUAL[x]](v);
  const from = end(ph.pre + (toStd ? cas(c) : std(c))), right = end(ph.pre + (toStd ? std(c) : cas(c)));
  const opts = cs.slice(0, 4).map(x => end(ph.pre + (toStd ? std(x) : cas(x))));
  return { kind: 'choice', tag: 'Đổi câu — khẩu ngữ ↔ chuẩn', level: FORM_LEVEL[c],
    prompt: `<p class="prompt-hint">${toStd ? 'Câu nói tắt ở xưởng → nói lại bằng tiếng chuẩn' : 'Câu chuẩn → cách nói tắt hằng ngày'}</p><p class="prompt-sent" lang="ja">${rubyHTML(from, true)}</p>`,
    opts: shuffle(opts).map((s, i) => opt(s === right ? 'ok' : 'x' + i, rich(s))), answer: 'ok',
    after: sentHTML(right) + `<p class="muted small">${esc(FORMS[c])} = ${esc(FORMS[CASUAL[c]])}</p>`, onAnswer: rec(c, v.group) };
}
function causeQ(ph) {
  const v = ph.v, pre = ph.pre;
  if (/私/.test(pre) || !['shieki', 'ukemi', 'shiekiukemi'].every(f => conjugate(v, f))) return null;
  const tr = /を$/.test(pre) || /を/.test(plain(pre));
  const who = tr ? ME + 'に' : ME + 'を';
  const P = f => conjPart(v, f + '.mashita').mark;
  const base = end(ME + 'は' + pre + conjugate(v, 'mashita').mark);
  const caus = end(BOSS + 'は' + who + pre + P('shieki'));
  const pass = end(ME + 'は' + BOSS + 'に' + pre + P('ukemi'));
  const cpas = end(ME + 'は' + BOSS + 'に' + pre + P('shiekiukemi'));
  if (Math.random() < 0.5) {
    const wrongCaus = tr ? end(BOSS + 'は' + ME + 'を' + pre + P('shieki')) : end(BOSS + 'は' + who + pre + (wrongForms(v, 'shieki').find(m => /る$/.test(m)) || '').replace(/る$/, 'ました'));
    const opts = uniqBy([caus, pass, cpas, wrongCaus].filter(s => s && !s.endsWith('。。')), plain);
    if (opts.length < 3) return null;
    return { kind: 'choice', tag: 'Đổi câu — sai khiến', level: 'N4', prompt: `<p class="prompt-hint">Đổi thành câu "Tổ trưởng bắt / cho tôi…"</p><p class="prompt-sent" lang="ja">${rubyHTML(base, true)}</p>`,
      opts: shuffle(opts).map((s, i) => opt(s === caus ? 'ok' : 'x' + i, rich(s))), answer: 'ok', after: sentHTML(caus) + `<p class="muted small">Tổ trưởng bắt tôi ${esc(ph.vi)}. ${tr ? 'Động từ có を → người bị bắt làm đi với に.' : 'Động từ không có を → người bị bắt làm đi với を.'}</p>`, onAnswer: rec('shieki', v.group) };
  }
  const wrongSubj = end(BOSS + 'は' + who + pre + P('shiekiukemi'));
  const opts = uniqBy([cpas, pass, caus, wrongSubj], plain);
  return { kind: 'choice', tag: 'Đổi câu — sai khiến bị động', level: 'N3', prompt: `<p class="prompt-hint">Nói lại từ phía "tôi": Tôi bị tổ trưởng bắt…</p><p class="prompt-sent" lang="ja">${rubyHTML(caus, true)}</p>`,
    opts: shuffle(opts).map((s, i) => opt(s === cpas ? 'ok' : 'x' + i, rich(s))), answer: 'ok', after: sentHTML(cpas) + `<p class="muted small">Tôi bị tổ trưởng bắt ${esc(ph.vi)}.</p>`, onAnswer: rec('shiekiukemi', v.group) };
}
// Cặp tự – tha: お湯[ゆ]＿＿ → を沸[わ]かす / が沸[わ]く
function pairQ(it) {
  const o = D.items.get(it.pair), v = verbInfo(it), w = o && verbInfo(o);
  if (!v || !w) return null;
  const want = it.vt === 'tu' ? 'が' : it.vt === 'tha' ? 'を' : '';
  const ph = verbPhrases(it).find(p => want && p.pre.endsWith(want) && p.pre.length > 1);
  if (!ph) return null;
  const noun = ph.pre.slice(0, -1), right = want + v.dict;
  const opts = ['が' + v.dict, 'を' + v.dict, 'が' + w.dict, 'を' + w.dict];
  const tu = it.vt === 'tu' ? v.dict : w.dict, tha = it.vt === 'tu' ? w.dict : v.dict;
  return { kind: 'choice', tag: 'Cặp tự – tha', level: it.level, prompt: `<p class="prompt-vi">${esc(ph.vi)}</p><p class="prompt-sent" lang="ja">${rich(noun)}<span class="blank">　　　</span></p>`,
    hint: 'Chọn trợ từ + động từ: tự động từ (が) hay tha động từ (を)?',
    opts: shuffle(opts).map((s, i) => opt(s === right ? 'ok' : 'x' + i, rich(s))), answer: 'ok',
    after: `<p><span lang="ja">${rich(tu)}</span> — tự động từ: việc tự xảy ra, đi với が · <span lang="ja">${rich(tha)}</span> — tha động từ: có người làm, đi với を</p>`, onAnswer: rec('pair', v.group) };
}
// Kính ngữ: từ riêng (行く → いらっしゃる / 参る) và khuôn お〜になる / お〜する
const GEN_WRONG_OK = ['いく', 'くる', 'みる', 'いう', 'する', 'いる', 'ねる', 'きる', 'しぬ']; // お行きになる… là sai → dùng làm nhiễu
const GEN = { まつ: 'tk', もつ: 'tk', かく: 'tk', おくる: 'tk', よぶ: 'tk', わたす: 'tk', かえす: 'tk', つかう: 't', かえる: 't', やすむ: 't', つたえる: 'tk', しらせる: 'k', とどける: 'k', ねがう: 'k', きめる: 't', でかける: 't' };
const KT = { ton: 'tôn kính ngữ — nói về việc khách, cấp trên làm', khiem: 'khiêm nhường ngữ — nói về việc mình làm cho người trên' };
function keigoList() {
  const out = [];
  for (const it of D.vocab) {
    const v = verbInfo(it); if (!v) continue;
    if (it.keigo) { for (const t of ['ton', 'khiem']) if (it.keigo[t]) out.push({ it, v, t, ans: it.keigo[t], special: true }); continue; }
    const g = GEN[it.kana];
    if (!g || it.pos === 'n-suru') continue;
    const st = conjPart(v, 'stem')?.mark;
    if (!st) continue;
    if (g.includes('t')) out.push({ it, v, t: 'ton', ans: 'お' + st + 'になる' });
    if (g.includes('k')) out.push({ it, v, t: 'khiem', ans: 'お' + st + 'する' });
  }
  return out;
}
function keigoQ(k, list) {
  const st = conjPart(k.v, 'stem')?.mark || '';
  const ws = [];
  const other = k.it.keigo?.[k.t === 'ton' ? 'khiem' : 'ton'];
  if (other) ws.push(other);
  if (k.special && GEN_WRONG_OK.includes(k.v.dictKana) && st) ws.push('お' + st + (k.t === 'ton' ? 'になる' : 'する'));
  if (!k.special) { ws.push('お' + k.v.dict + 'になる'); ws.push('お' + st + (k.t === 'ton' ? 'する' : 'になる')); ws.push('ご' + st + 'になる'); }
  const mine = new Set(Object.values(k.it.keigo || {}).map(plain));
  const shared = ['いく', 'くる'].includes(k.v.dictKana) ? ['伺う', '伺[うかが]う'] : [];
  for (const x of shuffle(list)) if (x.t === k.t && x.it !== k.it && !mine.has(plain(x.ans)) && !shared.includes(x.ans)) ws.push(x.ans);
  const opts = uniqBy(ws.filter(w => plain(w) !== plain(k.ans)), plain).slice(0, 3);
  if (opts.length < 2) return null;
  return { kind: 'choice', tag: 'Kính ngữ', level: 'N4', prompt: `<p class="prompt-jp" lang="ja">${rich(k.v.dict)}</p><p class="prompt-hint">${esc(verbVi(k.it))} → <b>${k.t === 'ton' ? 'tôn kính ngữ' : 'khiêm nhường ngữ'}</b></p>`,
    opts: shuffle([k.ans, ...opts]).map((s, i) => opt(s === k.ans ? 'ok' : 'x' + i, rich(s))), answer: 'ok',
    after: `<p><span lang="ja">${rich(k.ans)}</span> — ${esc(KT[k.t])}.${k.special ? '' : ` Khuôn: お + thân thể ます + ${k.t === 'ton' ? 'になる' : 'する'}.`}</p>`, onAnswer: rec('keigo', k.v.group) };
}

// Thể trong câu: khung câu của thể đó, chỗ trống là động từ đã chia (chọn hoặc tự gõ)
function sentFormQ(ph, f, typed) {
  const t = shuffle(FTPL.filter(x => x.form === f && x.f === f && !x.mod && !x.suf))[0];
  if (!t) return null;
  const s = makeSent(ph, t);
  if (!s) return null;
  const frame = s.chunks.map(c => (c === s.verb ? '\u0000' : c)).join('') + (/[！？。]$/.test(plain(s.chunks.at(-1))) ? '' : '。');
  const prompt = `<p class="prompt-sent" lang="ja">${rubyHTML(frame, true).replace('\u0000', '<span class="blank">　　　</span>')}</p><p class="prompt-vi-s">${esc(s.vi)}</p><p class="prompt-hint">Động từ: <span lang="ja">${rich(ph.v.dict)}</span> → <b>${esc(FORMS[f])}</b></p>`;
  const after = sentHTML(s.jp) + `<p class="muted small">${rich(ruleText(ph.it, f))}</p>`;
  if (typed) return { kind: 'type', tag: 'Gõ thể trong câu — ' + FORMS[f], level: FORM_LEVEL[f], prompt, accept: [reading(s.verb), plain(s.verb)], answerHTML: rich(s.verb), after, onAnswer: rec(f, ph.v.group) };
  const wr = uniqBy(wrongForms(ph.v, f).filter(m => plain(m) !== plain(s.verb)), plain).slice(0, 3);
  if (wr.length < 3) return null;
  return { kind: 'choice', tag: 'Thể trong câu — ' + FORMS[f], level: FORM_LEVEL[f], prompt, opts: shuffle([s.verb, ...wr]).map((m, i) => opt(m === s.verb ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after, onAnswer: rec(f, ph.v.group) };
}

// ---------- tính từ ----------
const AF_ALL = Object.keys(AFORMS);
const aHead = (it, f) => `<p class="prompt-jp" lang="ja">${wordHTML(it, 'furi')}</p><p class="prompt-hint">${esc(shortVi(it.vi))} (${adjInfo(it).type === 'i' ? 'tính từ い' : 'tính từ な'}) → <b>${esc(AFORMS[f])}</b></p>`;
function adjAccept(a, f, mark) {
  const acc = [reading(mark), plain(mark)];
  if (a.type === 'na' && f === 'nai') acc.push(reading(a.base + 'ではない'), plain(a.base + 'ではない'));
  if (a.type === 'na' && f === 'nakatta') acc.push(reading(a.base + 'ではなかった'), plain(a.base + 'ではなかった'));
  return acc;
}
function adjQ(it, f, typed) {
  const a = adjInfo(it), c = adjConj(a, f);
  if (!c) return null;
  const after = `<p>${esc(adjVi(f, it.vi))}${c.pol ? ` · lịch sự: <span lang="ja">${rich(c.pol)}</span>` : ''}</p>${a.type === 'na' && /い$/.test(plain(a.base)) ? `<p class="muted small"><span lang="ja">${rich(a.base)}</span> tận cùng bằng い nhưng là tính từ な — chia như tính từ な.</p>` : ''}${a.base.endsWith('いい') ? '<p class="muted small">いい chia theo よい: よくない, よかった, よくて.</p>' : ''}`;
  if (typed) return { kind: 'type', tag: 'Gõ dạng tính từ — ' + AFORMS[f], level: it.level, prompt: aHead(it, f), accept: adjAccept(a, f, c.mark), answerHTML: rich(c.mark), after, onAnswer: rec('adj:' + f, a.type) };
  const wr = uniqBy(adjWrong(a, f).filter(m => plain(m) !== plain(c.mark)), plain).slice(0, 3);
  if (wr.length < 3) return null;
  return { kind: 'choice', tag: 'Tính từ — ' + AFORMS[f], level: it.level, prompt: aHead(it, f),
    opts: shuffle([c.mark, ...wr]).map((m, i) => opt(m === c.mark ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after, onAnswer: rec('adj:' + f, a.type) };
}
// ---------- danh từ + だ ----------
function nounQ(it, f, typed) {
  const mark = it.kf || (it.kanji && it.kanji !== it.kana ? `${it.kanji}[${it.kana}]` : it.kana);
  const right = nounConj(mark, f);
  const head = `<p class="prompt-jp" lang="ja">${rich(mark)}</p><p class="prompt-hint">${esc(shortVi(it.vi))} → <b>${esc(NFORMS[f])}</b></p>`;
  const after = `<p>Danh từ + ${esc(right.map(m => plain(m).slice(plain(mark).length)).join(' / '))}</p>`;
  if (typed) return { kind: 'type', tag: 'Gõ — danh từ + だ', level: it.level, prompt: head, accept: right.flatMap(m => [reading(m), plain(m)]), answerHTML: right.map(rich).join(' / '), after, onAnswer: rec('n:' + f, 'n') };
  const wr = nounWrong(mark, f).slice(0, 3);
  return { kind: 'choice', tag: 'Danh từ + だ', level: it.level, prompt: head, opts: shuffle([right[0], ...wr]).map((m, i) => opt(m === right[0] ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after, onAnswer: rec('n:' + f, 'n') };
}
// ---------- phó từ, từ tượng thanh trong câu; katakana ----------
const surfaceIn = (it, jp) => [it.kf, it.kanji && it.kanji !== it.kana ? `${it.kanji}[${it.kana}]` : null, it.kana].filter(Boolean).find(s => jp.includes(s));
function advQ(it, pool) {
  for (const ex of shuffle([...(it.ex || [])])) {
    const s = surfaceIn(it, ex.jp || '');
    if (!s || !ex.vi) continue;
    const others = shuffle(pool.filter(o => o.id !== it.id && o.pos === it.pos && !viClash(o.vi, it.vi) && !(o.syn || []).includes(it.id) && !(it.syn || []).includes(o.id)))
      .sort((a, b) => ((b.with || '') === (it.with || '')) - ((a.with || '') === (it.with || '')));
    const ws = uniqBy(others, o => plain(wordHTML(o, 'kana'))).slice(0, 3);
    if (ws.length < 3) return null;
    const frame = rubyHTML(ex.jp.replace(s, '\u0000'), true).replace('\u0000', '<span class="blank">　　　</span>');
    return { kind: 'choice', tag: it.pos === 'ono' ? 'Từ tượng thanh trong câu' : 'Phó từ trong câu', level: it.level,
      prompt: `<p class="prompt-sent" lang="ja">${frame}</p><p class="prompt-vi-s">${esc(ex.vi)}</p>`, hint: 'Chọn từ hợp với câu (theo nghĩa câu)',
      opts: shuffle([it, ...ws]).map((o, i) => opt(o === it ? 'ok' : 'x' + i, wordHTML(o, 'furi'))), answer: 'ok',
      after: sentHTML(ex.jp) + `<p class="muted small"><span lang="ja">${wordHTML(it, 'furi')}</span> — ${esc(it.vi)}${it.with === 'phudinh' ? ' (đi với câu phủ định)' : ''}</p>` };
  }
  return null;
}
function kataQ(it) {
  return { kind: 'type', tag: 'Katakana', level: it.level, prompt: `<p class="prompt-vi">${esc(it.goc)}</p><p class="prompt-hint">${esc(it.vi)} — gõ bằng katakana</p>`,
    placeholder: 'gõ chữ IN HOA (vd. TORAKKU) hoặc bàn phím Nhật', accept: [it.kana], answerHTML: esc(it.kana),
    after: it.wasei ? '<p class="muted small">Từ "Anh kiểu Nhật" (和製英語) — người bản xứ nói tiếng Anh không dùng như vậy.</p>' : '' };
}

// ---------- dựng lượt ----------
export const VTYPES = [['type', 'Gõ thể'], ['conj', 'Chọn thể'], ['chain', 'Chuỗi biến đổi'], ['ident', 'Nhận diện ngược'], ['listen', 'Nghe → chọn thể'], ['shift', 'Đổi câu'], ['sent', 'Thể trong câu'], ['pair', 'Cặp tự – tha'], ['keigo', 'Kính ngữ'], ['mix', 'Trộn']];
const ATYPES = [['type', 'Gõ dạng'], ['conj', 'Chọn dạng'], ['mix', 'Trộn']];
const OTYPES = [['adv', 'Phó từ, tượng thanh trong câu'], ['kata', 'Gõ katakana'], ['mix', 'Trộn']];
export function buildFormQs(o) {
  const n = o.count || 10, out = [];
  const words = shuffle(o.items || pickWords(o.kind || 'verb', o.srcs || []));
  if (o.kind === 'adj' || o.kind === 'noun') {
    const fs = o.kind === 'adj' ? AF_ALL : Object.keys(NFORMS);
    for (let r = 0; r < 3 && out.length < n; r++) for (const it of words) {
      const t = o.type === 'mix' ? (Math.random() < 0.5 ? 'type' : 'conj') : o.type;
      const f = shuffle(fs)[0];
      const q = o.kind === 'adj' ? adjQ(it, f, t === 'type') : nounQ(it, f, t === 'type');
      if (q) out.push(q);
      if (out.length >= n) break;
    }
    return out;
  }
  if (o.kind === 'other') {
    const pool = baseOf('other');
    for (const it of words) {
      const t = o.type === 'mix' ? (it.goc ? 'kata' : 'adv') : o.type;
      const q = t === 'kata' ? (it.goc ? kataQ(it) : null) : (it.pos === 'adv' || it.pos === 'ono') ? advQ(it, pool) : null;
      if (q) out.push(q);
      if (out.length >= n) break;
    }
    return out;
  }
  // động từ
  const forms = (o.forms && o.forms.length ? o.forms : [...learnedForms()]).filter(f => FORMS[f]);
  if (!forms.length) return [];
  const types = o.type === 'mix' ? ['type', 'conj', 'chain', 'ident', 'shift', 'sent', ...(ttsReady() ? ['listen'] : [])] : [o.type];
  if (types.includes('sent')) {
    // câu theo thể: khung câu có sẵn (chọn / gõ động từ) + câu ghép nhiều thể + khuôn riêng (tpl) của mẫu ngữ pháp
    const quota = o.type === 'sent' ? n : Math.ceil(n / 3), sq = [];
    for (const it of words) {
      const ph = shuffle(verbPhrases(it))[0];
      const f = shuffle(forms)[0];
      const q = ph && sentFormQ(ph, f, Math.random() < 0.4);
      if (q) sq.push(q);
      if (sq.length >= quota) break;
    }
    if (forms.length >= 2) sq.push(...buildThe({ items: words, forms, qt: 'mix', count: quota }));
    if (o.grammar) sq.push(...buildNgPhap({ items: words, pats: [o.grammar], count: quota }));
    out.push(...shuffle(sq).slice(0, quota));
  }
  if (types.includes('keigo')) {
    const all = keigoList(), mine = all.filter(k => words.includes(k.it));
    for (const k of shuffle(mine.length >= 3 ? mine : all)) { const q = keigoQ(k, all); if (q) out.push(q); if (out.length >= n) break; }
  }
  const loop = types.filter(t => t !== 'sent' && t !== 'keigo');
  let i = 0;
  for (let round = 0; round < 4 && loop.length && out.length < n; round++) for (const it of words) {
    if (out.length >= n) break;
    const t = loop[i++ % loop.length];
    const f = shuffle(forms.filter(x => conjugate(verbInfo(it), x)))[0];
    let q = null;
    if (t === 'type' && f) q = typeVerbQ(it, f);
    else if (t === 'conj' && f) q = conjChoiceQ(it, f);
    else if (t === 'ident') q = identQ(it, forms);
    else if (t === 'listen') q = identQ(it, forms, true);
    else if (t === 'chain') { const c = chainQs(it, forms); if (c.length && (o.type === 'chain' || out.length + c.length <= n)) { out.push(...c); continue; } }
    else if (t === 'shift') { const ph = shuffle(verbPhrases(it))[0]; if (ph) q = [politeQ, casualQ, causeQ][Math.floor(Math.random() * 3)](ph); }
    else if (t === 'pair') q = it.pair ? pairQ(it) : null;
    if (q) out.push(q);
  }
  // trộn nhưng giữ liền các bước của một chuỗi biến đổi
  const blocks = [];
  for (const q of out) { if (/^Chuỗi biến đổi [2-9]/.test(q.tag) && blocks.length) blocks[blocks.length - 1].push(q); else blocks.push([q]); }
  const res = [];
  for (const b of shuffle(blocks)) { if (res.length >= n) break; res.push(...b); }
  return res;
}

// ---------- trang Luyện thể ----------
const formChips = sel => {
  const lv = f => FORM_LEVEL[f];
  const groups = [['Thể gốc', BASE_FORMS], ['Thể mở rộng và khẩu ngữ', EXT_FORMS]];
  // nhóm thể mở rộng thu gọn khi chưa chọn thể nào trong đó (danh sách dài trên điện thoại)
  const openExt = (sel || []).some(f => EXT_FORMS.includes(f));
  return `<p class="sub-label">${groups[0][0]}</p>${chips('forms', groups[0][1].map(f => [f, `${FORMS[f]} · ${lv(f)}`]), sel)}
    <details class="f-ext" ${openExt ? 'open' : ''}><summary>${groups[1][0]} (${EXT_FORMS.length})</summary>${chips('forms', groups[1][1].map(f => [f, `${FORMS[f]} · ${lv(f)}`]), sel)}</details>`;
};
export async function renderForms(view, ctx, gid) {
  const g = gid ? D.items.get(gid) : null;
  const gForms = formsForGrammar(g);
  const saved = await kvGet('pForms', {});
  const o = { kind: 'verb', type: 'mix', srcs: ['learning', 'known'], count: 10, ...saved };
  if (g) Object.assign(o, { kind: 'verb', type: 'mix', forms: gForms.length ? gForms : o.forms });
  const forms0 = g ? (gForms.length ? gForms : []) : (o.forms?.length ? o.forms : [...learnedForms()]);
  const best = D.prefs.speedBest || 0;
  view.innerHTML = `<a class="back" href="${g ? '#/nguphap/' + encodeURIComponent(g.id) : '#/luyen'}">${g ? esc(plain(g.pattern)) : 'Các dạng bài'}</a>
    <h1 class="h1">${g ? `Luyện thể của mẫu <span lang="ja">${rich(g.pattern)}</span>` : 'Luyện thể'}</h1>
    <p class="muted small">${g ? 'Câu hỏi chỉ xoay quanh thể của mẫu này, dùng động từ bạn đang học / đã thuộc và cụm hay đi kèm của chính động từ đó.' : 'Chia và nhận diện thể của động từ, tính từ, danh từ; đổi câu; cặp tự – tha; kính ngữ. Ô gõ nhận kana hoặc romaji (tự đổi sang kana).'}</p>
    <form class="setup" onsubmit="return false">
      ${g ? '' : `<fieldset><legend>Loại từ</legend>${chips('kind', KINDS, o.kind, false)}</fieldset>`}
      <fieldset class="f-type"><legend>Dạng bài</legend><div class="f-type-in"></div></fieldset>
      <fieldset class="f-forms"><legend>Thể <small>(không chọn = các thể đã học)</small></legend>${formChips(forms0)}</fieldset>
      <fieldset class="f-src"><legend>Lấy từ <small>(chọn được nhiều)</small></legend>${chips('srcs', SRC, o.srcs)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 30].map(x => [String(x), String(x)]), String(o.count), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>
    ${g ? '' : `<section class="card"><h2 class="h2">Thử thách</h2>
      <div class="row-btns wrap"><button type="button" class="btn btn-ghost" data-act="speed">60 giây tốc độ${best ? ` · kỷ lục ${best}` : ''}</button><button type="button" class="btn btn-ghost" data-act="table">Bảng chia tự kiểm</button></div></section>
    <section class="card fheat-card"><h2 class="h2">Điểm theo thể</h2>${heatHTML()}</section>`}`;
  const f = view.querySelector('.setup');
  const kind = () => (g ? 'verb' : readChip(f, 'kind'));
  const drawTypes = () => {
    const k = kind();
    const T = k === 'verb' ? VTYPES.filter(([t]) => t !== 'listen' || ttsReady()) : k === 'other' ? OTYPES : ATYPES;
    const cur = T.some(([t]) => t === o.type) ? o.type : 'mix';
    f.querySelector('.f-type-in').innerHTML = chips('type', T, cur, false);
    f.querySelector('.f-forms').hidden = k !== 'verb' || ['keigo', 'pair'].includes(cur);
  };
  const read = () => ({ kind: kind(), type: readChip(f, 'type'), forms: readChips(f, 'forms'), srcs: readChips(f, 'srcs'), count: +readChip(f, 'count'), grammar: g?.id });
  const upd = name => {
    if (name === 'kind') { o.type = 'mix'; drawTypes(); }
    const x = read();
    f.querySelector('.f-forms').hidden = x.kind !== 'verb' || ['keigo', 'pair'].includes(x.type);
    const words = pickWords(x.kind, x.srcs);
    const nq = buildFormQs({ ...x, count: 30 }).length;
    f.querySelector('.setup-count').textContent = !words.length ? 'Chưa có từ nào ở nguồn này. Chọn thêm "Tất cả".' : nq ? `${words.length} từ phù hợp.` : 'Chưa ra được câu nào cho lựa chọn này — chọn thêm thể hoặc nguồn "Tất cả".';
    f.querySelector('[data-act=start]').disabled = !nq;
  };
  drawTypes();
  bindChips(f, upd); upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = read();
    if (!g) await kvSet('pForms', { kind: x.kind, type: x.type, srcs: x.srcs, count: x.count, forms: x.forms });
    ctx.backTo = g ? '#/luyen/chia?g=' + encodeURIComponent(g.id) : '#/luyen/chia';
    runDrill(view, buildFormQs(x), ctx, { title: g ? 'Luyện thể · ' + plain(g.pattern) : 'Luyện thể', again: () => ctx.go(ctx.backTo, true) });
  };
  view.querySelector('[data-act=speed]')?.addEventListener('click', () => { ctx.backTo = '#/luyen/chia'; runSpeed(view, ctx, read()); });
  view.querySelector('[data-act=table]')?.addEventListener('click', () => { ctx.backTo = '#/luyen/chia'; runTable(view, ctx, read()); });
}

// ---------- B4: bảng nhiệt thể × nhóm ----------
const HG = [['v5', 'Nhóm 1'], ['v1', 'Nhóm 2'], ['v3', 'Nhóm 3']];
export function heatHTML() {
  const rows = [...BASE_FORMS, ...EXT_FORMS, 'pair', 'keigo'].filter(f => D.fstat[f]);
  const ar = Object.keys(D.fstat).filter(f => f.startsWith('adj:') || f.startsWith('n:'));
  if (!rows.length && !ar.length) return '<p class="muted small">Chưa có dữ liệu. Làm vài lượt Luyện thể, Chia động từ hoặc Thể động từ trong câu — app ghi đúng / sai theo từng thể và từng nhóm động từ.</p>';
  const cell = x => {
    if (!x || !x[1]) return '<td class="fh-na">—</td>';
    const p = Math.round((x[0] / x[1]) * 100);
    return `<td style="--p:${p}" class="fh${p < 70 ? ' fh-weak' : ''}" title="${x[0]}/${x[1]}">${p}%<small>${x[1]}</small></td>`;
  };
  const name = f => (f === 'pair' ? 'cặp tự – tha' : f === 'keigo' ? 'kính ngữ' : FORMS[f]);
  const aname = f => (f.startsWith('adj:') ? 'tính từ · ' + AFORMS[f.slice(4)] : 'danh từ · ' + NFORMS[f.slice(2)]);
  return `<p class="small muted">Ô đỏ: đúng dưới 70% — thể này tự vào Ôn hỗn hợp hôm nay (khi đã làm từ 5 lần).</p>
    <div class="fheat-wrap"><table class="fheat"><thead><tr><th>Thể</th>${HG.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(f => `<tr><th scope="row">${esc(name(f))}</th>${HG.map(([k]) => cell(D.fstat[f][k])).join('')}</tr>`).join('')}</tbody></table></div>
    ${ar.length ? `<table class="fheat"><tbody>${ar.map(f => { const s = formScore(f); return `<tr><th scope="row">${esc(aname(f))}</th>${cell([s.a, s.n])}</tr>`; }).join('')}</tbody></table>` : ''}`;
}

// ---------- B2-6: 60 giây tốc độ ----------
function runSpeed(view, ctx, o) {
  const forms = (o.forms?.length ? o.forms : [...learnedForms()]).filter(f => FORMS[f]);
  const verbs = shuffle(pickWords('verb', o.srcs?.length ? o.srcs : ['all']));
  if (!verbs.length || !forms.length) { toast('Chưa có động từ hoặc thể nào để luyện.'); return; }
  beginSession(ctx);
  let i = 0, ok = 0, ng = 0, lock = false;
  const t0 = Date.now(), LIM = 60;
  const next = () => {
    let q = null;
    for (let k = 0; k < 20 && !q; k++) { const it = verbs[(i++) % verbs.length]; const f = shuffle(forms.filter(x => conjugate(verbInfo(it), x)))[0]; if (f) q = conjChoiceQ(it, f); }
    return q;
  };
  let q = next();
  const timer = setInterval(() => { const c = view.querySelector('.speed-t'); const l = LIM - Math.floor((Date.now() - t0) / 1000); if (c) c.textContent = Math.max(0, l); if (l <= 0) done(); }, 250);
  ctx.onLeave(() => clearInterval(timer));
  function show() {
    if (!q) return done();
    view.innerHTML = `<div class="run speed"><div class="run-top"><button type="button" class="icon-btn" data-act="quit" aria-label="Dừng">${icon('close')}</button>
      <span class="speed-t" aria-live="off">${LIM}</span><span class="run-n">Đúng <b>${ok}</b> · sai ${ng}</span></div>
      <article class="label-card" data-nokj><div class="label-head"><span class="label-tag">${esc(q.tag)}</span></div>${q.prompt}</article>
      <div class="opts opts-jp">${q.opts.map((x, k) => `<button type="button" class="opt" data-k="${esc(x.key)}"><span class="opt-n">${k + 1}</span><span class="opt-t" lang="ja">${x.html}</span></button>`).join('')}</div></div>`;
    view.querySelector('.speed-t').textContent = Math.max(0, LIM - Math.floor((Date.now() - t0) / 1000));
    view.querySelector('[data-act=quit]').onclick = () => done(true);
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (lock) return; lock = true;
      const good = b.dataset.k === q.answer;
      good ? ok++ : ng++;
      q.onAnswer?.(good);
      b.classList.add(good ? 'is-ok' : 'is-ng');
      if (!good) view.querySelector(`.opt[data-k="${q.answer}"]`)?.classList.add('is-ok');
      setTimeout(() => { lock = false; q = next(); show(); }, good ? 250 : 900);
    });
  }
  let finished = false;
  async function done(quit = false) {
    if (finished) return; finished = true; clearInterval(timer);
    if (ok) logAct('the');
    const rec0 = D.prefs.speedBest || 0, isRec = !quit && ok > rec0;
    if (isRec) { await setPrefs({ speedBest: ok }); ctx.sessionDone?.(); }
    ctx.inRun = true;
    view.innerHTML = `<section class="result">${crumbHTML(ctx)}<h1 class="h1">60 giây tốc độ</h1>
      <p class="result-score"><b>${ok}</b><span> thể đúng</span></p>
      <p class="result-sub">${ng} câu sai${isRec ? ' · <b class="lv-pass">kỷ lục mới!</b>' : rec0 ? ` · kỷ lục ${rec0}` : ''}</p>
      <div class="row-btns stack"><button class="btn btn-primary" data-act="again">Thử lại</button></div>${resultNavHTML(ctx, { kind: 'test' })}</section>`;
    view.querySelector('[data-act=again]').onclick = () => runSpeed(view, ctx, o);
    bindResultNav(view, ctx, { kind: 'test' });
  }
  show();
}

// ---------- B2-7: bảng chia tự kiểm ----------
function runTable(view, ctx, o) {
  const verbs = shuffle(pickWords('verb', o.srcs?.length ? o.srcs : ['all']));
  const it = verbs[0];
  if (!it) { toast('Chưa có động từ nào.'); return; }
  const v = verbInfo(it);
  const fs = (o.forms?.length ? o.forms : [...learnedForms()]).filter(f => conjugate(v, f));
  beginSession(ctx);
  const marks = {};
  view.innerHTML = `<div class="run selftab">${crumbHTML(ctx)}
    <h1 class="h1">Bảng chia tự kiểm</h1>
    <p class="prompt-jp" lang="ja">${rich(v.dict)}</p><p class="muted" style="text-align:center">${esc(it.vi)}</p>
    <p class="small muted">Nhẩm từng thể trong đầu, chạm ô để lật xem, rồi tự chấm <b>Biết</b> / <b>Chưa</b>.</p>
    <table class="ctab selftab-t"><tbody>${fs.map(f => `<tr data-f="${f}"><th scope="row">${esc(FORMS[f])}<small>${FORM_LEVEL[f]}</small></th>
      <td><button type="button" class="st-cell" data-f="${f}" aria-label="Lật thể ${esc(FORMS[f])}"><span class="st-hide">？</span><span class="st-show" lang="ja" hidden>${rich(conjugate(v, f).mark)}</span></button></td>
      <td class="st-mark"><button type="button" class="btn btn-ghost btn-sm" data-m="1" hidden>Biết</button><button type="button" class="btn btn-ghost btn-sm" data-m="0" hidden>Chưa</button></td></tr>`).join('')}</tbody></table>
    <div class="row-btns stack"><button class="btn btn-primary" data-act="done">Xong</button><button class="btn btn-ghost" data-act="other">Động từ khác</button></div></div>`;
  view.querySelectorAll('.st-cell').forEach(b => b.onclick = () => {
    b.querySelector('.st-hide').hidden = true; b.querySelector('.st-show').hidden = false;
    b.closest('tr').querySelectorAll('[data-m]').forEach(x => { x.hidden = false; });
  });
  view.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
    const tr = b.closest('tr'), f = tr.dataset.f;
    if (marks[f] == null) recForm(f, v.group, b.dataset.m === '1');
    marks[f] = b.dataset.m === '1';
    tr.querySelectorAll('[data-m]').forEach(x => x.setAttribute('aria-pressed', x === b));
    tr.classList.toggle('st-ok', marks[f]); tr.classList.toggle('st-ng', !marks[f]);
  });
  view.querySelector('[data-act=other]').onclick = () => runTable(view, ctx, o);
  view.querySelector('[data-act=done]').onclick = () => {
    logAct('the');
    const k = Object.values(marks).filter(Boolean).length, n = Object.keys(marks).length;
    toast(n ? `Biết ${k}/${n} thể. Đã ghi vào Điểm theo thể.` : 'Chưa chấm ô nào.');
    ctx.sessionDone?.();
    goBack(ctx);
  };
}
