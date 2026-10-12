// Chặng 0 — Kana (đợt 5a, Đ7): bảng hiragana / katakana, luyện nhận mặt chữ, đọc → chọn chữ, nghe → chọn chữ.
import { esc, shuffle } from './util.js';
import { D, saveKana, setPrefs } from './data.js';
import { status } from './srs.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, readChips, bindSay } from './ui.js';
import { ttsReady, speak } from './tts.js';
import { kvGet, kvSet } from './db.js';

// Bảng 50 âm (hàng ngang = một hàng phụ âm; '' = ô trống)
const BASIC = [
  ['あ', 'a'], ['い', 'i'], ['う', 'u'], ['え', 'e'], ['お', 'o'],
  ['か', 'ka'], ['き', 'ki'], ['く', 'ku'], ['け', 'ke'], ['こ', 'ko'],
  ['さ', 'sa'], ['し', 'shi'], ['す', 'su'], ['せ', 'se'], ['そ', 'so'],
  ['た', 'ta'], ['ち', 'chi'], ['つ', 'tsu'], ['て', 'te'], ['と', 'to'],
  ['な', 'na'], ['に', 'ni'], ['ぬ', 'nu'], ['ね', 'ne'], ['の', 'no'],
  ['は', 'ha'], ['ひ', 'hi'], ['ふ', 'fu'], ['へ', 'he'], ['ほ', 'ho'],
  ['ま', 'ma'], ['み', 'mi'], ['む', 'mu'], ['め', 'me'], ['も', 'mo'],
  ['や', 'ya'], ['', ''], ['ゆ', 'yu'], ['', ''], ['よ', 'yo'],
  ['ら', 'ra'], ['り', 'ri'], ['る', 'ru'], ['れ', 're'], ['ろ', 'ro'],
  ['わ', 'wa'], ['', ''], ['', ''], ['', ''], ['を', 'wo (o)'],
  ['ん', 'n'], ['', ''], ['', ''], ['', ''], ['', ''],
];
const DAKU = [
  ['が', 'ga'], ['ぎ', 'gi'], ['ぐ', 'gu'], ['げ', 'ge'], ['ご', 'go'],
  ['ざ', 'za'], ['じ', 'ji'], ['ず', 'zu'], ['ぜ', 'ze'], ['ぞ', 'zo'],
  ['だ', 'da'], ['ぢ', 'ji (di)'], ['づ', 'zu (du)'], ['で', 'de'], ['ど', 'do'],
  ['ば', 'ba'], ['び', 'bi'], ['ぶ', 'bu'], ['べ', 'be'], ['ぼ', 'bo'],
  ['ぱ', 'pa'], ['ぴ', 'pi'], ['ぷ', 'pu'], ['ぺ', 'pe'], ['ぽ', 'po'],
];
const YO_HEAD = [['き', 'k'], ['し', 'sh'], ['ち', 'ch'], ['に', 'n'], ['ひ', 'h'], ['み', 'm'], ['り', 'r'], ['ぎ', 'g'], ['じ', 'j'], ['び', 'b'], ['ぴ', 'p']];
const YOON = YO_HEAD.flatMap(([k, r]) => [['ゃ', 'a'], ['ゅ', 'u'], ['ょ', 'o']].map(([s, v]) => [k + s, (r === 'sh' || r === 'ch' || r === 'j') ? r + v : r + 'y' + v]));
// hiragana → katakana: cộng 0x60
const toKata = s => [...s].map(c => (c >= 'ぁ' && c <= 'ゖ' ? String.fromCharCode(c.charCodeAt(0) + 0x60) : c)).join('');
// Chữ dễ nhầm mặt (ưu tiên làm đáp án nhiễu)
const LOOK = ['ぬめ', 'ねれわ', 'るろ', 'さちき', 'はほけ', 'いり', 'こに', 'うつら', 'しつ', 'あおめ', 'たな', 'まも', 'ソンシツ', 'クケタ', 'ノメナ', 'ワウフラ', 'コユロ', 'チテ', 'アマ', 'ヲラ', 'ルレ', 'セサ', 'ヌス', 'ホオ'];
const lookAlike = ch => LOOK.filter(g => g.includes(ch)).join('').replace(new RegExp(ch, 'g'), '');
const sound = r => r.replace(/\s*\(.*\)$/, '');
// âm nghe giống nhau (を = お) → không cho làm đáp án nhiễu của nhau
const snd = r => (sound(r) === 'wo' ? 'o' : sound(r));

const SETS = { basic: BASIC.filter(x => x[0]), daku: DAKU, yoon: YOON };
export function kanaList(script = 'h', parts = ['basic']) {
  const out = [];
  for (const p of parts) for (const [h, r] of SETS[p]) {
    if (script !== 'k') out.push({ ch: h, r, s: 'h', part: p });
    if (script !== 'h') out.push({ ch: toKata(h), r, s: 'k', part: p });
  }
  return out;
}
const known = ch => (D.kana[ch]?.b || 0) >= 3;
// Tiến độ Chặng 0: số chữ cơ bản đã thuộc (đúng 3 lần liền trở lên)
export function kanaProgress() {
  const h = kanaList('h'), k = kanaList('k');
  return { h: h.filter(x => known(x.ch)).length, ht: h.length, k: k.filter(x => known(x.ch)).length, kt: k.length };
}
export function kanaDone() {
  if (D.prefs.kanaOK) return true;
  // đã học từ 20 từ vựng trở lên thì chắc chắn đã đọc được kana
  let n = 0; for (const v of D.vocab) if (status(v) !== 'new' && ++n >= 20) return true;
  const p = kanaProgress();
  return p.h + p.k >= 0.9 * (p.ht + p.kt);
}

// ---------- câu hỏi ----------
function kanaQ(x, dir, pool) {
  const others = pool.filter(o => o.ch !== x.ch && snd(o.r) !== snd(x.r) && o.s === x.s);
  const near = lookAlike(x.ch);
  const ranked = shuffle(others).sort((a, b) => (near.includes(b.ch) - near.includes(a.ch)) || ((b.part === x.part) - (a.part === x.part)));
  const seen = new Set([dir === 'kr' ? snd(x.r) : x.ch]), ds = [];
  for (const o of ranked) { const key = dir === 'kr' ? snd(o.r) : o.ch; if (seen.has(key)) continue; seen.add(key); ds.push(o); if (ds.length >= 3) break; }
  if (ds.length < 3) return null;
  const onAnswer = ok => {
    const c = D.kana[x.ch] || { b: 0, ok: 0, ng: 0 };
    saveKana({ [x.ch]: ok ? { ...c, b: Math.min(5, c.b + 1), ok: c.ok + 1 } : { ...c, b: Math.max(0, c.b - 2), ng: c.ng + 1 } });
  };
  const tag = x.s === 'h' ? 'Hiragana' : 'Katakana';
  const after = `<p class="kana-after"><span lang="ja" class="kana-big">${esc(x.ch)}</span> = <b>${esc(x.r)}</b></p>`;
  if (dir === 'kr') return { kind: 'choice', tag, prompt: `<p class="prompt-jp kana-q" lang="ja" data-bare>${esc(x.ch)}</p>`, hint: 'Chữ này đọc là gì?',
    opts: shuffle([x, ...ds]).map(o => opt(o.ch, esc(sound(o.r)), false)), answer: x.ch, after, onAnswer, promptBare: true };
  if (dir === 'au') return { kind: 'choice', tag, prompt: '<p class="prompt-hint">Nghe (bấm loa để nghe lại) rồi chọn chữ</p>', say: x.ch, autoSay: true,
    opts: shuffle([x, ...ds]).map(o => opt(o.ch, `<span class="kana-opt">${esc(o.ch)}</span>`)), answer: x.ch, after, onAnswer };
  return { kind: 'choice', tag, prompt: `<p class="prompt-vi kana-r">${esc(sound(x.r))}</p>`, hint: 'Chọn chữ đọc như trên',
    opts: shuffle([x, ...ds]).map(o => opt(o.ch, `<span class="kana-opt">${esc(o.ch)}</span>`)), answer: x.ch, after, onAnswer };
}
export function buildKanaQs({ script = 'h', parts = ['basic'], dir = 'mix', count = 20, weak = false }) {
  const pool = kanaList(script, parts);
  let items = shuffle(pool);
  // ưu tiên chữ chưa thuộc
  items.sort((a, b) => (D.kana[a.ch]?.b || 0) - (D.kana[b.ch]?.b || 0));
  if (weak) items = items.filter(x => !known(x.ch));
  const dirs = dir === 'mix' ? ['kr', 'rk', ...(ttsReady() ? ['au'] : [])] : [dir];
  const qs = [];
  for (const x of items) { const q = kanaQ(x, dirs[qs.length % dirs.length], pool); if (q) qs.push(q); if (qs.length >= count) break; }
  return shuffle(qs);
}

// ---------- trang ----------
function gridHTML(rows, script) {
  const cell = ([h, r]) => {
    if (!h) return '<span class="kcell is-empty"></span>';
    const ch = script === 'k' ? toKata(h) : h, b = D.kana[ch]?.b || 0;
    return `<button type="button" class="kcell${b >= 3 ? ' is-known' : b > 0 ? ' is-learning' : ''}" data-ksay="${esc(ch)}" aria-label="${esc(ch)} — ${esc(r)}"><span lang="ja">${esc(ch)}</span><small>${esc(sound(r))}</small></button>`;
  };
  const cols = rows === YOON ? 3 : 5;
  return `<div class="kgrid-kana" style="--cols:${cols}">${rows.map(cell).join('')}</div>`;
}
export async function renderKana(view, ctx) {
  const o = { script: 'h', parts: ['basic'], dir: 'mix', count: 20, ...(await kvGet('kanaSetup', {})) };
  const p = kanaProgress();
  const tab = o.tab || 'h';
  view.innerHTML = `<h1 class="h1">Chặng 0 — Kana</h1>
    <p class="small muted">Tiếng Nhật có hai bảng chữ mềm: <b>hiragana</b> (từ thuần Nhật, đuôi động từ, trợ từ) và <b>katakana</b> (từ mượn tiếng nước ngoài: トラック, マスク). Học thuộc hai bảng này trước rồi mới vào N5. Mỗi chữ đúng 3 lần liền là tính đã thuộc.</p>
    <section class="card">
      <h2 class="h2">Tiến độ</h2>
      <table class="topics"><tbody>
        <tr><th scope="row">Hiragana</th><td><span class="mini"><i style="width:${(p.h / p.ht) * 100}%"></i></span></td><td class="num">${p.h}/${p.ht}</td></tr>
        <tr><th scope="row">Katakana</th><td><span class="mini"><i style="width:${(p.k / p.kt) * 100}%"></i></span></td><td class="num">${p.k}/${p.kt}</td></tr>
      </tbody></table>
      ${kanaDone() ? `<p class="saved-ok small">${D.prefs.kanaOK ? 'Đã đánh dấu biết kana.' : 'Đã qua Chặng 0.'} <a href="#/lotrinh">Sang chặng N5 →</a></p>` : `<label class="check"><input type="checkbox" data-act="ok"> Tôi đã đọc thông kana — bỏ qua chặng này</label>`}
    </section>
    <section class="card">
      <h2 class="h2">Bảng chữ</h2>
      <div class="tabs" role="tablist"><a role="tab" href="#" data-tab="h" aria-selected="${tab === 'h'}">Hiragana</a><a role="tab" href="#" data-tab="k" aria-selected="${tab === 'k'}">Katakana</a></div>
      <p class="small muted">${ttsReady() ? 'Chạm vào chữ để nghe. ' : ''}Màu xanh: đã thuộc · viền xanh: đang học.</p>
      <h3 class="h3">Âm cơ bản</h3>${gridHTML(BASIC, tab)}
      <h3 class="h3">Thêm dấu ゛ (đục) và ゜ (bán đục)</h3>${gridHTML(DAKU, tab)}
      <h3 class="h3">Âm ghép với ゃ ゅ ょ nhỏ</h3>${gridHTML(YOON, tab)}
      <details class="kana-tips"><summary>Mẹo đọc</summary>
        <ul class="steps">
          <li><span lang="ja">っ / ッ</span> nhỏ: ngắt hơi, nhân đôi phụ âm sau — <span lang="ja">きって</span> = kitte (con tem).</li>
          <li>Trường âm: hiragana thêm nguyên âm (<span lang="ja">おかあさん</span>, <span lang="ja">せんせい</span> đọc "sensē"); katakana dùng dấu <span lang="ja">ー</span> (<span lang="ja">コーヒー</span>).</li>
          <li><span lang="ja">は</span> và <span lang="ja">へ</span> làm trợ từ thì đọc "wa" và "e"; <span lang="ja">を</span> đọc "o".</li>
          <li>Katakana còn có âm ghép riêng cho từ mượn: <span lang="ja">ファ フィ ティ ディ ウェ ヴァ</span> (<span lang="ja">ファックス</span>, <span lang="ja">パーティー</span>).</li>
        </ul></details>
    </section>
    <form class="setup" onsubmit="return false">
      <h2 class="h2">Luyện</h2>
      <fieldset><legend>Bảng</legend>${chips('script', [['h', 'Hiragana'], ['k', 'Katakana'], ['hk', 'Cả hai']], o.script, false)}</fieldset>
      <fieldset><legend>Phần</legend>${chips('parts', [['basic', 'Âm cơ bản'], ['daku', 'Thêm dấu ゛゜'], ['yoon', 'Âm ghép ゃゅょ']], o.parts)}</fieldset>
      <fieldset><legend>Kiểu câu hỏi</legend>${chips('dir', [['kr', 'Nhìn chữ → cách đọc'], ['rk', 'Cách đọc → chữ'], ...(ttsReady() ? [['au', 'Nghe → chữ']] : []), ['mix', 'Trộn']], o.dir, false)}</fieldset>
      <fieldset><legend>Số câu</legend>${chips('count', [10, 20, 40].map(n => [String(n), String(n)]), String(o.count), false)}</fieldset>
      <label class="check"><input type="checkbox" data-act="weak" ${o.weak ? 'checked' : ''}> Chỉ chữ chưa thuộc</label>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="start">Bắt đầu</button>
      <p class="small muted">Gõ kana bằng bàn phím có ở bản sau (đợt 5b).</p>
    </form>`;
  bindSay(view);
  const f = view.querySelector('.setup');
  const read = () => ({ script: readChip(f, 'script'), parts: readChips(f, 'parts'), dir: readChip(f, 'dir'), count: +readChip(f, 'count'), weak: f.querySelector('[data-act=weak]').checked, tab });
  const upd = () => {
    const x = read();
    const n = x.parts.length ? buildKanaQs({ ...x, count: 999 }).length : 0;
    f.querySelector('.setup-count').textContent = !x.parts.length ? 'Chọn ít nhất một phần.' : n ? `Có ${n} chữ phù hợp.` : 'Đã thuộc hết chữ trong phần này.';
    f.querySelector('[data-act=start]').disabled = !n;
  };
  bindChips(f, upd); f.querySelector('[data-act=weak]').onchange = upd; upd();
  view.querySelectorAll('[data-tab]').forEach(a => a.onclick = async e => { e.preventDefault(); await kvSet('kanaSetup', { ...read(), tab: a.dataset.tab }); renderKana(view, ctx); });
  view.querySelectorAll('[data-ksay]').forEach(b => b.onclick = () => { if (ttsReady()) speak(b.dataset.ksay); });
  const ok = view.querySelector('[data-act=ok]');
  if (ok) ok.onchange = async () => { await setPrefs({ kanaOK: ok.checked }); ctx.sessionDone?.(); renderKana(view, ctx); };
  f.querySelector('[data-act=start]').onclick = async () => {
    const x = read(); await kvSet('kanaSetup', x);
    ctx.backTo = '#/kana';
    runDrill(view, buildKanaQs(x), ctx, { title: 'Luyện kana', again: () => ctx.go('#/kana', true) });
  };
}
