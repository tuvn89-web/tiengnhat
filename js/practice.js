// Trang Luyện tập chung (F1) và các dạng bài dựa trên từ đã học:
// F2 ghép câu từ ví dụ · F3 ghép câu theo ngữ pháp · F4 thể động từ trong câu · F5 tính từ trong câu · E2 đếm số · F7 ôn hỗn hợp.
import { esc, rich, rubyHTML, plain, shuffle, autoChunks, END_PUNCT, wordHTML, icon, HL_RE } from './util.js';
import { D, LEVELS, setPrefs } from './data.js';
import { S } from './settings.js';
import { selectItems, SOURCES, answerOf, distractors, readHint } from './quiz.js';
import { verbInfo, conjPart, FORMS, FORM_LEVEL, shortVi, verbVi, DERIVED, hasForm } from './conj.js';
import { adjInfo, adjConj } from './adj.js';
import { COUNTERS, countWrong, counterMark } from './counters.js';
import { countMark, learnedForms } from './wordx.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, readChips, topicOpts, emptyState, wtabs } from './ui.js';
import { kvGet, kvSet } from './db.js';
import { dueDirs, status, stats, isLeech, isStar } from './srs.js';
import { ttsReady } from './tts.js';
import { recForm, weakForms } from './fstat.js';
import { sentDue, dueSentQs } from './dich.js';

const cap = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const sentHTML = jp => `<p class="after-sent" lang="ja">${rubyHTML(jp, true)}</p>`;
const viHint = vi => `<details class="vihint"><summary>Gợi ý: nghĩa câu</summary><p>${esc(vi)}</p></details>`;
const uniq = arr => new Set(arr.map(plain)).size === arr.length;
const backLink = `<a class="back" href="#/luyen">Các dạng bài</a>`;

// ---------- nguồn từ (F1) ----------
export function sourceBlock(o, filter, { label = 'Lấy từ nào' } = {}) {
  const cnt = {};
  for (const [k] of SOURCES) cnt[k] = selectItems({ source: k }).filter(filter).length;
  return `<fieldset><legend>${label}</legend>${chips('source', SOURCES.map(([k, l]) => [k, l, cnt[k]]), o.source, false)}</fieldset>
    <fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels || [])}</fieldset>
    <fieldset><legend>Chủ đề <small>(không chọn = tất cả)</small></legend>${chips('topics', topicOpts(), o.topics || [])}</fieldset>`;
}
export const readSource = f => ({ source: readChip(f, 'source'), levels: readChips(f, 'levels'), topics: readChips(f, 'topics') });
// o.items: danh sách từ chọn sẵn (trang Luyện thể chọn nhiều nguồn cùng lúc)
const pool = (o, filter) => shuffle((o.items || selectItems(o)).filter(filter));

// Khung trang thiết lập dùng chung: vẽ form, đếm số câu, bấm Bắt đầu
export async function setupPage(view, ctx, { key, title, intro = '', fields, read, build, route, drillTitle, empty, drillOpts = {}, counts = [10, 20, 30], unit = 'câu' }) {
  view.innerHTML = `${backLink}<h1 class="h1">${esc(title)}</h1>${intro ? `<p class="muted small">${intro}</p>` : ''}
    <form class="setup" onsubmit="return false">${fields}
      <fieldset><legend>Số ${unit}</legend>${chips('count', counts.map(n => [String(n), String(n)]), String((await kvGet(key, {})).count || counts[0]), false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
    </form>`;
  const f = view.querySelector('.setup');
  const upd = () => {
    const x = { ...read(f), count: +readChip(f, 'count') };
    const n = build({ ...x, count: 999 }).length;
    f.querySelector('.setup-count').textContent = n ? `Có ${n} câu phù hợp.` : (empty || 'Chưa có câu nào cho lựa chọn này.');
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd); upd();
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = { ...read(f), count: +readChip(f, 'count') };
    await kvSet(key, x);
    ctx.backTo = route;
    runDrill(view, build(x), ctx, { title: drillTitle || title, again: () => ctx.go(route, true), ...drillOpts });
  };
  return f;
}

// ---------- F2: ghép câu từ câu ví dụ ----------
export function exChunks(ex) {
  const s = (ex.jp || '').replace(/\[\[|\]\]/g, '').replace(END_PUNCT, '');
  if (/^[AB]：/.test(s) || s.includes('B：')) return null; // hội thoại A–B: bỏ
  const ch = Array.isArray(ex.chunks) && ex.chunks.length >= 3 ? ex.chunks : autoChunks(s);
  return ch.length >= 3 && uniq(ch) && ch.join('') === s ? ch : null;
}
export function buildCau(o) {
  const out = [], all = [];
  for (const it of pool(o, it => (it.ex || []).length)) {
    const exs = shuffle((it.ex || []).filter(e => e.vi && exChunks(e)));
    if (!exs.length) continue;
    all.push({ it, ex: exs[0], ch: exChunks(exs[0]) });
  }
  for (const [i, x] of all.entries()) {
    const other = all[(i + 1) % all.length];
    const extra = Math.random() < 0.5 && other !== x ? shuffle(other.ch.filter(c => !x.ch.map(plain).includes(plain(c))))[0] : null;
    out.push({ kind: 'order', tag: 'Ghép câu', level: x.it.level, prompt: `<p class="prompt-vi">${esc(x.ex.vi)}</p>`,
      hint: extra ? 'Ghép thành câu tiếng Nhật (có một mảnh thừa)' : 'Ghép thành câu tiếng Nhật',
      chunks: x.ch.map(rich), extra: extra ? [rich(extra)] : [],
      after: sentHTML(x.ex.jp) + `<p class="muted small">Từ: <span lang="ja">${wordHTML(x.it, 'furi')}</span> — ${esc(x.it.vi)}</p>` });
    if (out.length >= o.count) break;
  }
  return out;
}
export const renderCau = (view, ctx) => kvGet('pCau', {}).then(o => setupPage(view, ctx, {
  key: 'pCau', title: 'Ghép câu từ ví dụ', route: '#/luyen/cau',
  intro: 'Sắp xếp các mảnh thành câu ví dụ của những từ bạn đã học. Một nửa số câu có thêm một mảnh thừa.',
  fields: sourceBlock({ source: 'learned', ...o }, it => (it.ex || []).length), read: readSource, build: buildCau,
  empty: 'Chưa có câu nào. Học thêm từ mới, hoặc chọn "Tất cả".',
}));

// ---------- cụm động từ để ghép câu (từ `coll`) ----------
export function verbPhrases(it) {
  const v = verbInfo(it);
  if (!v) return [];
  const out = [];
  for (const c of it.coll || []) {
    const jp = c.jp || '';
    if (jp.endsWith(v.dict)) out.push({ pre: jp.slice(0, -v.dict.length), vi: c.vi || verbVi(it), it, v });
  }
  if (!out.length) out.push({ pre: '', vi: verbVi(it), it, v, bare: true });
  return out;
}
const PRECHUNK = pre => (pre ? (autoChunks(pre).join('') === pre ? autoChunks(pre) : [pre]) : []);
export function makeSent(ph, t) {
  if (t.need && !hasForm(ph.v, t.need)) return null;
  if (t.skip && t.skip.includes(ph.v.dictKana)) return null; // khung câu đã có chính động từ này
  const c = conjPart(ph.v, t.f);
  if (!c) return null;
  let pre = ph.pre;
  if (t.ga) pre = pre.replace(/を$/, 'が');
  // 〜方: 魚を切る → 魚の切り方 (chỉ dùng cụm kết thúc bằng を hoặc động từ trần)
  if (t.no) { if (pre && !/を$/.test(pre)) return null; pre = pre.replace(/を$/, 'の'); }
  const pc = (t.pre || []).map(x => (typeof x === 'function' ? x(ph) : x));
  const verb = (t.mod ? t.mod(c.mark) : c.mark) + (t.suf || '');
  const chunks = [...pc, ...PRECHUNK(pre), verb, ...(t.tail || [])].filter(Boolean);
  const last = chunks[chunks.length - 1];
  const jp = chunks.join('') + (/[！？。]$/.test(plain(last)) ? '' : '。');
  return { jp, vi: cap(t.vi.replace('{VP}', ph.vi)), chunks, verb, t, ph };
}

// ---------- F3: khuôn câu cho từng mẫu ngữ pháp ----------
const GTPL = [
  { keys: ['てください'], f: 'te', tail: ['ください'], vi: 'Hãy {VP}.' },
  { keys: ['ないでください'], f: 'nai', suf: 'で', tail: ['ください'], vi: 'Đừng {VP}.' },
  { keys: ['てもいいですか', 'てもいい'], f: 'te', tail: ['もいいですか'], vi: 'Tôi {VP} có được không?' },
  { keys: ['てはいけません', 'てはいけない'], f: 'te', tail: ['はいけません'], vi: 'Không được {VP}.' },
  { keys: ['なければなりません', 'なければならない'], f: 'nakereba', tail: ['なりません'], vi: 'Phải {VP}.' },
  { keys: ['ないといけません', 'ないといけない'], f: 'nai', suf: 'と', tail: ['いけません'], vi: 'Phải {VP}.' },
  { keys: ['なくてもいいです', 'なくてもいい'], f: 'nai', mod: m => m.replace(/い$/, 'くても'), tail: ['いいです'], vi: 'Không {VP} cũng được.' },
  { keys: ['たいです', 'たい', 'がほしい/たい', 'ほしい/たい'], f: 'stem', tail: ['たいです'], vi: 'Tôi muốn {VP}.' },
  { keys: ['ています', 'ている'], f: 'te', pre: ['今[いま]、'], tail: ['います'], vi: 'Bây giờ tôi đang {VP}.' },
  { keys: ['ましょう'], f: 'stem', pre: ['一緒[いっしょ]に'], tail: ['ましょう'], vi: 'Cùng {VP} nhé.' },
  { keys: ['ませんか'], f: 'stem', pre: ['一緒[いっしょ]に'], tail: ['ませんか'], vi: 'Cùng {VP} không?' },
  { keys: ['ました', 'ます/ません/ました/ませんでした', 'ます'], f: 'mashita', pre: ['昨日[きのう]、'], vi: 'Hôm qua tôi đã {VP}.' },
  { keys: ['たことがある', 'たことがあります'], f: 'ta', tail: ['ことがあります'], vi: 'Tôi đã từng {VP}.' },
  { keys: ['ことができる', 'ことができます'], f: 'dict', tail: ['ことができます'], vi: 'Tôi có thể {VP}.' },
  { keys: ['てから'], f: 'te', suf: 'から、', tail: ['休[やす]みます'], vi: '{VP} xong rồi tôi nghỉ.' },
  { keys: ['つもりです', 'つもり'], f: 'dict', tail: ['つもりです'], vi: 'Tôi định {VP}.' },
];
const normPat = p => plain(p || '').replace(/[〜～~\s]/g, '').replace(/[（(][^）)]*[）)]/g, '');
// Mẫu ngữ pháp trong kho dùng được khuôn nào (khuôn viết sẵn trong app, hoặc trường `tpl` của mẫu)
export function grammarTemplates(g) {
  if (Array.isArray(g.tpl) && g.tpl.length) return g.tpl;
  const segs = normPat(g.pattern).split(/[\/・、,]/).filter(Boolean);
  return GTPL.filter(t => t.keys.some(k => segs.includes(k) || normPat(g.pattern) === k));
}
function makeG(ph, t) {
  const s = makeSent(ph, { ...t, mod: undefined, suf: t.mod ? '' : t.suf });
  if (!s) return null;
  if (!t.mod) return s;
  const verb = t.mod(s.verb);
  const chunks = s.chunks.map(c => (c === s.verb ? verb : c));
  return { ...s, verb, chunks, jp: chunks.join('') + '。' };
}
const tplPatterns = () => D.grammar.filter(g => grammarTemplates(g).length);
function phrasesFrom(o) {
  const out = [];
  for (const it of pool(o, it => verbInfo(it))) for (const ph of verbPhrases(it)) out.push(ph);
  // ưu tiên cụm có sẵn trong dữ liệu (tự nhiên hơn động từ trần)
  return out.sort((a, b) => (a.bare ? 1 : 0) - (b.bare ? 1 : 0));
}
export function buildNgPhap(o) {
  const gs = tplPatterns().filter(g => !o.pats?.length || o.pats.includes(g.id));
  const T = gs.flatMap(g => grammarTemplates(g).map(t => ({ ...t, g })));
  if (!T.length) return [];
  const phs = phrasesFrom(o);
  const out = [];
  let k = 0;
  for (const ph of phs) {
    const t = T[k++ % T.length];
    const s = makeG(ph, t);
    if (!s) continue;
    const head = `<p class="after-g"><b lang="ja">${rich(t.g.pattern)}</b> — ${rich(t.g.meaning || '')}</p>`;
    const r = Math.random();
    if (r < 0.35 && s.chunks.length >= 3 && uniq(s.chunks)) {
      out.push({ kind: 'order', tag: 'Ghép theo ngữ pháp', prompt: `<p class="prompt-vi">${esc(s.vi)}</p>`, hint: 'Sắp xếp thành câu tiếng Nhật', chunks: s.chunks.map(rich), after: sentHTML(s.jp) + head });
    } else if (r < 0.7 && s.chunks.length >= 2 && uniq(s.chunks)) {
      const wrong = ['te', 'stem', 'dict', 'nai', 'ta'].filter(f => f !== t.f).map(f => conjPart(ph.v, f)?.mark).filter(m => m && plain(m) !== plain(s.verb) && !s.chunks.map(plain).includes(plain(m)));
      out.push({ kind: 'order', tag: 'Ghép theo ngữ pháp', prompt: `<p class="prompt-vi">${esc(s.vi)}</p>`, hint: 'Ghép thành câu tiếng Nhật (có một mảnh thừa)', chunks: s.chunks.map(rich), extra: wrong.length ? [rich(shuffle(wrong)[0])] : [], after: sentHTML(s.jp) + head });
    } else {
      // Việt → chọn câu: cùng cụm động từ, khác mẫu
      const others = shuffle(T.filter(x => x !== t && x.vi !== t.vi)).map(x => makeG(ph, x)).filter(x => x && plain(x.jp) !== plain(s.jp));
      const seen = new Set([plain(s.jp)]), opts = [];
      for (const x of others) { if (seen.has(plain(x.jp))) continue; seen.add(plain(x.jp)); opts.push(x); if (opts.length >= 3) break; }
      if (opts.length < 2) continue;
      out.push({ kind: 'choice', tag: 'Ghép theo ngữ pháp', prompt: `<p class="prompt-vi">${esc(s.vi)}</p>`, hint: 'Chọn câu tiếng Nhật đúng nghĩa',
        opts: shuffle([s, ...opts]).map((x, i) => opt(x === s ? 'ok' : 'x' + i, rich(x.jp))), answer: 'ok', after: head });
    }
    if (out.length >= o.count) break;
  }
  return out;
}
export async function renderNgPhap(view, ctx) {
  const o = { source: 'learned', pats: [], ...(await kvGet('pNg', {})) };
  const gs = tplPatterns();
  if (!gs.length) { view.innerHTML = backLink + '<h1 class="h1">Ghép câu theo ngữ pháp</h1>' + emptyState('Kho chưa có mẫu ngữ pháp nào ghép được với động từ (〜てください, 〜てもいいですか, 〜なければなりません…).', '<a class="btn btn-primary" href="#/dulieu">Mở Dữ liệu</a>'); return; }
  const learnedG = gs.filter(g => status(g) !== 'new').map(g => g.id);
  setupPage(view, ctx, {
    key: 'pNg', title: 'Ghép câu theo ngữ pháp', route: '#/luyen/ngphap',
    intro: 'App ghép mẫu ngữ pháp với cụm hay đi kèm của động từ bạn đã học thành câu mới, kèm câu dịch. Dạng bài: sắp xếp câu, ghép câu có mảnh thừa, chọn câu đúng nghĩa.',
    fields: `<fieldset><legend>Mẫu ngữ pháp <small>(không chọn = ${learnedG.length ? 'các mẫu đã học' : 'tất cả'})</small></legend>${chips('pats', gs.map(g => [g.id, rich(g.pattern), undefined, true]), o.pats)}</fieldset>` + sourceBlock(o, it => verbInfo(it), { label: 'Động từ lấy từ' }),
    read: f => ({ ...readSource(f), pats: readChips(f, 'pats').length ? readChips(f, 'pats') : learnedG }),
    build: buildNgPhap,
    empty: 'Chưa có động từ nào khớp. Chọn "Tất cả" ở phần Động từ lấy từ.',
  });
}

// ---------- F4: thể động từ trong câu ----------
const toWo = ph => (/を/.test(plain(ph.pre)) ? '私[わたし]に' : '私[わたし]を');
export const FTPL = [
  { form: 'masu', f: 'masu', vi: 'Tôi {VP}.' },
  { form: 'masen', f: 'masen', vi: 'Tôi không {VP}.' },
  { form: 'mashita', f: 'mashita', pre: ['昨日[きのう]、'], vi: 'Hôm qua tôi đã {VP}.' },
  { form: 'te', f: 'te', tail: ['ください'], vi: 'Hãy {VP}.' },
  { form: 'nai', f: 'nai', suf: 'で', tail: ['ください'], vi: 'Đừng {VP}.' },
  { form: 'ta', f: 'ta', tail: ['ことがあります'], vi: 'Tôi đã từng {VP}.' },
  { form: 'nakatta', f: 'nakatta', pre: ['昨日[きのう]は'], vi: 'Hôm qua tôi đã không {VP}.' },
  { form: 'tai', f: 'stem', need: 'tai', tail: ['たいです'], vi: 'Tôi muốn {VP}.' },
  { form: 'teiru', f: 'te', need: 'teiru', pre: ['今[いま]、'], tail: ['います'], vi: 'Bây giờ tôi đang {VP}.' },
  { form: 'kano', f: 'kano.masu', ga: true, vi: 'Tôi có thể {VP}.' },
  { form: 'ikou', f: 'ikou', tail: ['と思[おも]います'], vi: 'Tôi định {VP}.' },
  { form: 'ba', f: 'ba', suf: '、', tail: ['大丈夫[だいじょうぶ]です'], vi: 'Chỉ cần {VP} là được.' },
  { form: 'tara', f: 'tara', suf: '、', skip: ['おしえる'], tail: ['教[おし]えてください'], vi: '{VP} xong thì báo cho tôi.' },
  { form: 'shieki', f: 'shieki.mashita', pre: ['班長[はんちょう]は', toWo], vi: 'Tổ trưởng bắt tôi {VP}.' },
  { form: 'shieki', f: 'shiekite', tail: ['ください'], vi: 'Xin cho tôi {VP}.' },
  { form: 'shiekiukemi', f: 'shiekiukemi.mashita', pre: ['私[わたし]は', '班長[はんちょう]に'], vi: 'Tôi bị tổ trưởng bắt {VP}.' },
  { form: 'meirei', f: 'meirei', pre: ['早[はや]く'], suf: '！', vi: '{VP} nhanh lên! (ra lệnh)' },
  { form: 'kinshi', f: 'kinshi', suf: '！', vi: 'Cấm {VP}!' },
  // thể mở rộng
  { form: 'sou', f: 'sou', tail: ['です'], vi: 'Có vẻ sắp {VP}.' },
  { form: 'sugiru', f: 'stem', need: 'sugiru', tail: ['すぎました'], vi: 'Tôi đã {VP} quá mức.' },
  { form: 'yasui', f: 'yasui', tail: ['です'], vi: 'Dễ {VP}.' },
  { form: 'nikui', f: 'nikui', tail: ['です'], vi: 'Khó {VP}.' },
  { form: 'nagara', f: 'nagara', skip: ['きく'], tail: ['ラジオを聞[き]きます'], vi: 'Tôi vừa {VP} vừa nghe radio.' },
  { form: 'kata', f: 'kata', no: true, skip: ['おしえる'], tail: ['を教[おし]えてください'], vi: 'Xin chỉ cho tôi cách {VP}.' },
  { form: 'tari', f: 'tari', pre: ['休[やす]みの日[ひ]は'], tail: ['します'], vi: 'Ngày nghỉ tôi làm những việc như {VP}.' },
  { form: 'zu', f: 'zu', skip: ['かえる'], tail: ['帰[かえ]りました'], vi: 'Tôi đã về mà không {VP}.' },
  { form: 'teshimau', f: 'te', need: 'teshimau', tail: ['しまいました'], vi: 'Tôi lỡ {VP} mất rồi.' },
  { form: 'chau', f: 'chau', mod: m => m.replace(/う$/, 'った'), vi: 'Lỡ {VP} mất rồi. (nói tắt)' },
  { form: 'teoku', f: 'te', need: 'teoku', tail: ['おきます'], vi: 'Tôi sẽ {VP} sẵn.' },
  { form: 'toku', f: 'toku', tail: ['ね'], vi: 'Để tôi {VP} sẵn nhé. (nói tắt)' },
  { form: 'teru', f: 'teru', pre: ['今[いま]、'], tail: ['よ'], vi: 'Giờ đang {VP} đây. (nói tắt)' },
  { form: 'nakereba', f: 'nakereba', tail: ['なりません'], vi: 'Phải {VP}.' },
  { form: 'nakya', f: 'nakya', vi: 'Phải {VP} thôi. (nói tắt)' },
  { form: 'tewa', f: 'te', need: 'tewa', tail: ['はいけません'], vi: 'Không được {VP}.' },
  { form: 'chadame', f: 'chadame', tail: ['よ'], vi: 'Không được {VP} đâu. (nói tắt)' },
  { form: 'sasete', f: 'sasete', vi: 'Xin cho tôi {VP}.' },
];
const FQT = [['vn', 'Việt → chọn câu Nhật'], ['nv', 'Nhật → chọn nghĩa'], ['dien', 'Điền thể vào chỗ trống'], ['mix', 'Trộn']];
function fxQs(o, forms) {
  // câu theo thể do skill viết sẵn (fx): [[ ]] bọc thân thể phái sinh (呼ばれ, 切らせ…)
  const out = [];
  for (const it of pool(o, it => verbInfo(it) && (it.fx || []).length)) {
    const v = verbInfo(it);
    for (const x of it.fx) {
      if (!forms.includes(x.f) || !/\[\[/.test(x.jp || '')) continue;
      const right = conjPart(v, x.f)?.mark.replace(/る$/, '');
      const opts = [...new Set(DERIVED.filter(f => f !== x.f).map(f => conjPart(v, f)?.mark.replace(/る$/, '')).filter(Boolean))].filter(m => plain(m) !== plain(right));
      if (!right || opts.length < 2) continue;
      out.push({ kind: 'choice', tag: 'Thể động từ — ' + FORMS[x.f], level: FORM_LEVEL[x.f],
        prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(x.jp.replace(HL_RE, '\u0000'), true).replace('\u0000', '<span class="blank">　　　</span>')}</p><p class="prompt-vi-s">${esc(x.vi)}</p><p class="prompt-hint">Động từ: <span lang="ja">${rich(v.dict)}</span></p>`,
        opts: shuffle([right, ...opts.slice(0, 3)]).map((m, i) => opt(m === right ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after: sentHTML(x.jp.replace(/\[\[|\]\]/g, '')) });
    }
  }
  return out;
}
export function buildThe(o) {
  const forms = o.forms?.length ? o.forms : [...learnedForms()];
  const T = FTPL.filter(t => forms.includes(t.form));
  if (T.length < 2) return [];
  const out = [];
  const types = o.qt === 'mix' || !o.qt ? ['vn', 'nv', 'dien'] : [o.qt];
  for (const ph of phrasesFrom(o)) {
    const mine = shuffle(T).map(t => makeSent(ph, t)).filter(Boolean);
    if (mine.length < 3) continue;
    const s = mine[0], others = mine.slice(1);
    const qt = types[Math.floor(Math.random() * types.length)];
    const lab = 'Thể động từ — ' + FORMS[s.t.form];
    const onAnswer = ok => recForm(s.t.form, ph.v.group, ok);
    const after = sentHTML(s.jp) + `<p class="muted small">${esc(FORMS[s.t.form])} của <span lang="ja">${rich(ph.v.dict)}</span>: <span lang="ja">${rich(conjPart(ph.v, s.t.form)?.mark || '')}</span></p>`;
    if (qt === 'vn') {
      const seen = new Set([plain(s.jp)]), opts = others.filter(x => !seen.has(plain(x.jp)) && seen.add(plain(x.jp))).slice(0, 3);
      if (opts.length < 2) continue;
      out.push({ kind: 'choice', tag: lab, level: FORM_LEVEL[s.t.form], prompt: `<p class="prompt-vi">${esc(s.vi)}</p>`, hint: 'Chọn câu tiếng Nhật đúng nghĩa', opts: shuffle([s, ...opts]).map((x, i) => opt(x === s ? 'ok' : 'x' + i, rich(x.jp))), answer: 'ok', after, onAnswer });
    } else if (qt === 'nv') {
      const seen = new Set([s.vi]), opts = others.filter(x => !seen.has(x.vi) && seen.add(x.vi)).slice(0, 3);
      if (opts.length < 2) continue;
      out.push({ kind: 'choice', tag: lab, level: FORM_LEVEL[s.t.form], prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(s.jp, true)}</p>`, hint: 'Chọn nghĩa đúng', opts: shuffle([s, ...opts]).map((x, i) => opt(x === s ? 'ok' : 'x' + i, esc(x.vi), false)), answer: 'ok', after, onAnswer });
    } else {
      // điền: giữ khung câu của thể đúng, chỗ trống là phần động từ đã chia
      const seen = new Set([plain(s.verb)]), opts = others.map(x => x.verb).filter(m => !seen.has(plain(m)) && seen.add(plain(m))).slice(0, 3);
      if (opts.length < 2) continue;
      const frame = s.chunks.map(c => (c === s.verb ? '\u0000' : c)).join('') + (/[！？。]$/.test(plain(s.chunks.at(-1))) ? '' : '。');
      out.push({ kind: 'choice', tag: lab, level: FORM_LEVEL[s.t.form],
        prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(frame, true).replace('\u0000', '<span class="blank">　　　</span>')}</p><p class="prompt-vi-s">${esc(s.vi)}</p><p class="prompt-hint">Động từ: <span lang="ja">${rich(ph.v.dict)}</span></p>`,
        opts: shuffle([s.verb, ...opts]).map((m, i) => opt(m === s.verb ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after, onAnswer });
    }
    if (out.length >= o.count) break;
  }
  if (types.includes('dien')) out.push(...fxQs(o, forms).slice(0, Math.ceil(o.count / 3)));
  return shuffle(out).slice(0, o.count);
}
export async function renderThe(view, ctx) {
  const o = { source: 'learned', qt: 'mix', ...(await kvGet('pThe', {})) };
  const lf = [...learnedForms()];
  const f = await setupPage(view, ctx, {
    key: 'pThe', title: 'Thể động từ trong câu', route: '#/luyen/the',
    intro: 'Câu ngẫu nhiên ghép từ cụm hay đi kèm của động từ đã học, chia theo các thể bạn đã học: bị động, sai khiến, sai khiến bị động, khả năng… Mỗi câu có 4 phương án chỉ khác nhau ở thể.',
    fields: `<fieldset><legend>Thể đã học <small>(chạm để bật/tắt — app nhớ cho mọi máy)</small></legend>${chips('forms', Object.keys(FORMS).map(k => [k, `${FORMS[k]} · ${FORM_LEVEL[k]}`]), lf)}</fieldset>
      <fieldset><legend>Dạng câu hỏi</legend>${chips('qt', FQT, o.qt, false)}</fieldset>` + sourceBlock(o, it => verbInfo(it), { label: 'Động từ lấy từ' }),
    read: f => ({ ...readSource(f), forms: readChips(f, 'forms'), qt: readChip(f, 'qt') }),
    build: buildThe,
    empty: 'Cần ít nhất 2 thể đã học và vài động từ. Bật thêm thể, hoặc chọn "Tất cả" ở phần Động từ lấy từ.',
  });
  // bật/tắt thể = cập nhật danh sách "thể đã học" (đồng bộ)
  f.querySelector('.chips[data-name=forms]').addEventListener('click', () => setTimeout(() => setPrefs({ forms: readChips(f, 'forms') }), 0));
}

// ---------- F5: tính từ trong câu ----------
const ATPL = [
  { f: 'desu', jp: (S2, a) => `${S2.jp}は${a.pol}`, vi: (S2, v) => `${S2.vi} ${v}.` },
  { f: 'nai', jp: (S2, a) => `${S2.jp}は${a.pol.split(' / ')[0]}`, vi: (S2, v) => `${S2.vi} không ${v}.` },
  { f: 'ta', jp: (S2, a) => `${S2.jp}は昨日[きのう]${a.pol}`, vi: (S2, v) => `${S2.vi} hôm qua ${v}.` },
  { f: 'nakatta', jp: (S2, a) => `${S2.jp}は昨日[きのう]${a.pol}`, vi: (S2, v) => `${S2.vi} hôm qua không ${v}.` },
  { f: 'sou', jp: (S2, a) => `${S2.jp}は${a.pol}`, vi: (S2, v) => `${S2.vi} trông có vẻ ${v}.` },
  { f: 'sugi', jp: (S2, a) => `${S2.jp}は${a.pol}`, vi: (S2, v) => `${S2.vi} quá ${v}.` },
  { f: 'naru', jp: (S2, a) => `${S2.jp}が${a.pol.replace(/ます$/, 'ました')}`, vi: (S2, v) => `${S2.vi} đã trở nên ${v}.` },
];
function buildTinhTu(o) {
  const out = [];
  const adjs = pool(o, it => adjInfo(it));
  for (const it of adjs) {
    const a = adjInfo(it), v = shortVi(it.vi);
    const subj = shuffle(it.subj || [])[0] || { jp: 'これ', vi: 'cái này' };
    const sents = shuffle(ATPL).map(t => { const c = adjConj(a, t.f); return c && c.pol ? { t, jp: t.jp(subj, c) + '。', vi: cap(t.vi(subj, v)) } : null; }).filter(Boolean);
    const r = Math.random();
    if (r < 0.2 && it.ant?.length) {
      // trái nghĩa
      const antR = it.ant[0], antIt = typeof antR === 'string' ? D.items.get(antR) : null;
      const right = antIt ? wordHTML(antIt, 'furi') : typeof antR === 'object' ? rich(antR.w) : '';
      if (right) {
        const wrong = shuffle(adjs.filter(x => x.id !== it.id && x.id !== antIt?.id)).slice(0, 3).map(x => wordHTML(x, 'furi'));
        if (wrong.length >= 2) { out.push({ kind: 'choice', tag: 'Tính từ — trái nghĩa', level: it.level, prompt: `<p class="prompt-jp" lang="ja">${wordHTML(it, 'furi')}</p><p class="prompt-hint">${esc(it.vi)} — từ nào trái nghĩa?</p>`, opts: shuffle([right, ...wrong]).map((h, i) => opt(h === right ? 'ok' : 'x' + i, h)), answer: 'ok' }); continue; }
      }
    }
    if (r < 0.35 && a.type === 'i') {
      const right = adjConj(a, 'sa').mark, wrong = ['adv', 'ta', 'sou'].map(f => adjConj(a, f).mark);
      out.push({ kind: 'choice', tag: 'Tính từ — danh từ chỉ độ', level: it.level, prompt: `<p class="prompt-jp" lang="ja">${wordHTML(it, 'furi')}</p><p class="prompt-hint">${esc(it.vi)} → danh từ "độ ${esc(v)}" là?</p>`, opts: shuffle([right, ...wrong]).map((m, i) => opt(m === right ? 'ok' : 'x' + i, rich(m))), answer: 'ok', after: `<p>〜い → 〜さ: <span lang="ja">${rich(right)}</span> = độ ${esc(v)}.</p>` });
      continue;
    }
    if (sents.length < 3) continue;
    const s = sents[0], opts = sents.slice(1, 4);
    out.push({ kind: 'choice', tag: 'Tính từ trong câu', level: it.level, prompt: `<p class="prompt-vi">${esc(s.vi)}</p>`, hint: 'Chọn câu tiếng Nhật đúng nghĩa',
      opts: shuffle([s, ...opts]).map((x, i) => opt(x === s ? 'ok' : 'x' + i, rich(x.jp))), answer: 'ok', after: sentHTML(s.jp) });
    if (out.length >= o.count) break;
  }
  return out.slice(0, o.count);
}
export const renderTinhTu = (view, ctx) => kvGet('pTT', {}).then(o => setupPage(view, ctx, {
  key: 'pTT', title: 'Tính từ trong câu', route: '#/luyen/tinhtu',
  intro: rich('Chọn câu đúng nghĩa với các dạng: không ~, ~ hôm qua, trông có vẻ ~, quá ~, trở nên ~; danh từ chỉ độ (重[おも]い → 重[おも]さ) và từ trái nghĩa.'),
  fields: sourceBlock({ source: 'learned', ...o }, it => adjInfo(it), { label: 'Tính từ lấy từ' }), read: readSource, build: buildTinhTu,
  empty: 'Chưa có tính từ nào khớp. Chọn "Tất cả".',
}));

// ---------- E2: đếm số ----------
const CNT_DEFAULT = ['つ', '人', '本', '匹', '枚', '個', '台', '杯', '回', '階', '分', '時'];
export function usedCounters() {
  const s = new Set();
  for (const it of D.vocab) { for (const c of [].concat(it.ctr || [])) if (COUNTERS[c]) s.add(c); if (it.pos === 'ctr' && COUNTERS[it.kanji || it.kana]) s.add(it.kanji || it.kana); }
  return s;
}
function buildDem(o) {
  const cs = o.cs?.length ? o.cs : CNT_DEFAULT;
  const out = [];
  for (let k = 0; k < 200 && out.length < o.count; k++) {
    const c = cs[Math.floor(Math.random() * cs.length)], n = 1 + Math.floor(Math.random() * 10);
    const right = COUNTERS[c].r[n - 1], wrong = countWrong(c, n).slice(0, 3);
    if (wrong.length < 2 || out.some(q => q._k === c + n)) continue;
    if (o.qt === 'go' || (o.qt === 'mix' && Math.random() < 0.5)) {
      out.push({ _k: c + n, kind: 'type', tag: 'Đếm số — gõ cách đọc', promptBare: true,
        prompt: `<p class="prompt-jp" lang="ja" data-bare>${n}${esc(c)}</p><p class="prompt-hint">${esc(COUNTERS[c].vi)} — gõ cách đọc bằng kana</p>`,
        accept: [right], answerHTML: esc(right), after: `<p lang="ja">${rich(countMark(c, n))}</p>` });
      continue;
    }
    out.push({ _k: c + n, kind: 'choice', tag: 'Đếm số', promptBare: true,
      prompt: `<p class="prompt-jp" lang="ja" data-bare>${n}${esc(c)}</p><p class="prompt-hint">${esc(COUNTERS[c].vi)} — đọc thế nào?</p>`,
      opts: shuffle([right, ...wrong]).map((r, i) => opt(r === right ? 'ok' : 'x' + i, esc(r))), answer: 'ok',
      after: `<p lang="ja">${rich(countMark(c, n))}</p>` });
  }
  return out;
}
export async function renderDem(view, ctx) {
  const used = usedCounters();
  const o = { cs: [...new Set([...CNT_DEFAULT.filter(c => used.has(c) || ['つ', '人', '本', '匹', '枚', '個'].includes(c))])], ...(await kvGet('pDem', {})) };
  setupPage(view, ctx, {
    key: 'pDem', title: 'Đếm số', route: '#/luyen/dem',
    intro: rich('Đọc số đếm có âm biến: 一本[いっぽん], 三本[さんぼん], 六匹[ろっぴき]… Trong câu hỏi chữ Hán không có furigana vì đây là bài đọc; cách đọc hiện sau khi chọn.'),
    fields: `<fieldset><legend>Trợ số từ</legend>${chips('cs', Object.entries(COUNTERS).map(([c, x]) => [c, `${rich(counterMark(c))} <small>${esc(x.vi.split(/[:,(]/)[0])}</small>`, undefined, true]), o.cs)}</fieldset>
      <fieldset><legend>Cách trả lời</legend>${chips('qt', [['chon', 'Chọn trong 4'], ['go', 'Tự gõ (kana / romaji)'], ['mix', 'Trộn']], o.qt || 'chon', false)}</fieldset>`,
    read: f => ({ cs: readChips(f, 'cs'), qt: readChip(f, 'qt') }), build: buildDem,
  });
}

// Một câu chọn đáp án của từ vựng (dùng cho Ôn hỗn hợp, Ôn nhanh 3 phút). cmpOf: đáp án → mã từ, để so sánh khi chọn nhầm (v31).
export function vocabChoiceQ(it, dir, { noReview = false } = {}) {
  const right = answerOf(it, dir, 'furi'), ds = distractors(it, dir, 'furi');
  if (ds.length < 2) return null;
  const prompt = dir === 'vj' ? `<p class="prompt-vi">${esc(it.vi)}</p>` : dir === 'kr' ? `<p class="prompt-jp" lang="ja" data-bare>${esc(it.kanji)}</p>${readHint(it)}` : `<p class="prompt-jp" lang="ja">${wordHTML(it, 'furi')}</p>`;
  return { kind: 'choice', tag: dir === 'kr' ? 'Từ vựng — đọc chữ Hán' : 'Từ vựng', level: it.level, promptBare: dir === 'kr', prompt,
    hint: dir === 'vj' ? 'Chọn từ tiếng Nhật' : dir === 'kr' ? 'Chọn cách đọc' : 'Chọn nghĩa', opts: shuffle([right, ...ds]).map(a => opt(a.key, a.html, a.jp)), answer: right.key,
    cmpOf: Object.fromEntries(ds.filter(a => a.it).map(a => [a.key, a.it.id])), cmpRight: it.id,
    ...(noReview ? {} : { review: { id: it.id, dir } }) };
}

// ---------- F7: ôn hỗn hợp hôm nay ----------
export function mixedDue() {
  return { vocab: D.vocab.filter(it => dueDirs(it).length), kanji: D.kanji.filter(it => dueDirs(it).length), grammar: D.grammar.filter(it => dueDirs(it).length), sent: sentDue() };
}
export async function renderMixed(view, ctx) {
  const { buildKanjiQs } = await import('./kanji.js');
  const { buildGrammarQs } = await import('./gdrill.js');
  const due = mixedDue();
  const vq = [];
  for (const it of shuffle(due.vocab).slice(0, 25)) {
    let dirs = dueDirs(it);
    if (!ttsReady()) dirs = dirs.filter(d => d !== 'au');
    const q = vocabChoiceQ(it, dirs[Math.floor(Math.random() * dirs.length)] || 'jv');
    if (q) vq.push(q);
  }
  const kq = buildKanjiQs({ dir: 'mix', source: 'due', count: 12 });
  const gq = buildGrammarQs({ type: 'mix', source: 'due', count: 12 });
  const fq = vq.length + kq.length + gq.length + due.sent.length ? buildThe({ source: 'learned', count: 4, qt: 'mix' }) : [];
  // thể hay sai (Điểm theo thể dưới 70%) → thêm vài câu chia đúng thể đó
  const wf = weakForms();
  if (wf.length && (vq.length + kq.length + gq.length + due.sent.length)) {
    const { conjQ } = await import('./gdrill.js');
    const vs = shuffle(D.vocab.filter(it => verbInfo(it) && status(it) !== 'new'));
    for (const f of wf.slice(0, 3)) { const it = vs.find(x => conjPart(x, f)); const q = it && conjQ(it, f); if (q) fq.push({ ...q, tag: 'Thể hay sai — ' + FORMS[f] }); }
  }
  const sq = dueSentQs(6); // câu dịch đến hạn
  // xen kẽ các loại để không ôn liền một mạch một loại
  const lanes = [vq, kq, gq, sq, fq].filter(l => l.length), qs = [];
  while (lanes.some(l => l.length)) for (const l of lanes) if (l.length) qs.push(l.shift());
  if (!qs.length) { view.innerHTML = backLink + emptyState('Hôm nay không còn gì đến hạn ôn. Học thêm từ mới nhé.', '<a class="btn btn-primary" href="#/moi">Học từ mới</a>'); return; }
  runDrill(view, qs, ctx, { title: 'Ôn hỗn hợp hôm nay', again: () => ctx.go('#/onhon', true) });
}

// ---------- F1: trang các dạng bài ----------
export function renderHub(view) {
  const st = stats(D.vocab);
  const verbs = D.vocab.filter(it => verbInfo(it)), adjs = D.vocab.filter(it => adjInfo(it));
  const learnedVerbs = verbs.filter(it => status(it) !== 'new').length;
  const due = mixedDue(), nDue = due.vocab.length + due.kanji.length + due.grammar.length + due.sent.length;
  const newHv = D.vocab.filter(it => it.hv && it.kanji && status(it) === 'new').length || null;
  const nConf = D.vocab.filter(it => (it.confuse || []).length).length;
  const nLeech = [...D.vocab, ...D.kanji].filter(isLeech).length;
  const card = (href, ic, t, d, n) => `<a class="mode" href="${href}">${icon(ic)}<span><b>${t}</b><small>${rich(d)}</small></span>${n != null ? `<span class="mode-n">${n}</span>` : ''}</a>`;
  view.innerHTML = `<h1 class="h1">Luyện tập</h1>${wtabs('hub')}
    <p class="muted small">Mặc định mọi bài chỉ dùng từ bạn đã học; đổi được ở phần "Lấy từ nào" của từng bài.</p>
    ${nDue ? `<a class="btn btn-primary btn-block" href="#/onhon">Ôn hỗn hợp hôm nay · ${nDue} mục đến hạn</a>` : ''}
    <h2 class="h2">Từ vựng</h2>
    <nav class="modes">
      ${card('#/moi', 'plus', 'Học từ mới', 'Xem thẻ rồi bấm "Đã học" — không kiểm tra ngay', st.new)}
      ${card('#/moi/doan', 'plus', 'Học từ mới — đoán nghĩa trước', 'Từ Hán: nhìn âm Hán Việt (冷凍[れいとう] = LÃNH ĐÔNG) đoán nghĩa trước, rồi mới xem thẻ', newHv)}
      ${card('#/hoc', 'quiz', 'Trắc nghiệm', 'Việt ↔ Nhật, đọc chữ Hán, nghe')}
      ${card('#/ghep', 'list', 'Ghép 6 cặp', 'Việt – Nhật, thể từ điển – thể ます, tự – tha, trái nghĩa, chữ Hán – Hán Việt')}
      ${card('#/danhdau', 'star', 'Đã đánh dấu ★', 'Từ và chữ Hán bạn bấm ★ — ôn bằng trắc nghiệm hoặc ghép 8 cặp', [...D.vocab, ...D.kanji].filter(x => isStar(x.id)).length || null)}
      ${card('#/luyen/cau', 'book', 'Ghép câu từ ví dụ', 'Sắp xếp mảnh thành câu ví dụ của từ đã học')}
      ${card('#/luyen/hanviet', 'quiz', 'Đoán nghĩa từ Hán Việt', 'Thấy từ và âm Hán Việt → chọn nghĩa. Không đổi lịch ôn')}
      ${card('#/luyen/denham', 'list', 'Phân biệt từ dễ nhầm', 'Đặt các từ, mẫu ngữ pháp dễ nhầm cạnh nhau rồi chọn đúng theo câu', nConf || null)}
      ${card('#/luyen/cungdau', 'quiz', 'Đánh từ cứng đầu', 'Từ và chữ Hán sai từ 4 lần trở lên: xem lại thẻ đầy đủ rồi luyện', nLeech || null)}
    </nav>
    <h2 class="h2">Động từ và tính từ</h2>
    <nav class="modes">
      ${card('#/luyen/chia', 'list', 'Luyện thể', 'Gõ thể, chuỗi biến đổi, nhận diện ngược, đổi câu, tự – tha, kính ngữ; tính từ, danh từ + だ; 60 giây tốc độ', learnedVerbs)}
      ${card('#/luyen/the', 'quiz', 'Thể động từ trong câu', 'Bị động, sai khiến, khả năng… trong câu ngẫu nhiên', learnedVerbs)}
      ${card('#/nguphap/luyen?t=conj', 'list', 'Chia động từ', 'Chọn thể đúng của từng động từ, có giải thích luật chia', verbs.length)}
      ${card('#/luyen/tinhtu', 'book', 'Tính từ trong câu', 'Không ~, đã ~, trông có vẻ ~, quá ~; 重[おも]い → 重[おも]さ; trái nghĩa', adjs.length)}
    </nav>
    <h2 class="h2">Dịch, đọc & hội thoại</h2>
    <nav class="modes">
      ${card('#/doc', 'chat', 'Hội thoại & bài đọc', 'Đọc song ngữ, dịch, đóng vai, điền từ khóa, câu hỏi, nghe cả bài', D.dialog.length + D.text.length || null)}
      ${card('#/dich', 'book', 'Luyện dịch theo câu', 'Nhật ↔ Việt: chọn câu đúng, tự gõ (app chấm), nghe, ghép mảnh — câu ví dụ theo cấp', due.sent.length ? due.sent.length + ' đến hạn' : null)}
    </nav>
    <h2 class="h2">Ngữ pháp</h2>
    <nav class="modes">
      ${card('#/luyen/ngphap', 'quiz', 'Ghép câu theo ngữ pháp', 'Mẫu ngữ pháp + động từ đã học → câu mới có câu dịch', tplPatterns().length)}
      ${card('#/nguphap/luyen', 'list', 'Bài tập ngữ pháp', '10 dạng: điền, sắp xếp, câu ★, tìm chỗ sai…')}
      ${card('#/nguphap/thithu', 'book', 'Thi thử', 'Đề ngắn theo cấp, tính giờ')}
    </nav>
    <h2 class="h2">Khác</h2>
    <nav class="modes">
      ${card('#/luyen/dem', 'list', 'Đếm số', 'Trợ số từ có âm biến: いっぽん, さんぼん, ろっぴき')}
      ${card('#/chuhan/on', 'han', 'Ôn chữ Hán', 'Chữ → Hán Việt, Hán Việt → chữ')}
      ${card('#/luyen/giongchu', 'han', 'Chữ Hán trông giống', 'Từ bị che một chữ: chọn đúng giữa các chữ trông giống (未[み] / 末[まつ], 待[ま]つ / 持[も]つ)')}
    </nav>`;
}
