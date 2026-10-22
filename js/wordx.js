// Thẻ từ đầy đủ: đồng âm, đồng nghĩa, trái nghĩa, cụm đi kèm, ví dụ theo tình huống,
// bảng chia động từ / tính từ kèm nghĩa, cặp tự–tha, kính ngữ, trợ số từ, thang phó từ, câu đáp, từ gốc katakana.
import { esc, rubyHTML, wordHTML, reading, icon, rich, kanjiChars } from './util.js';
import { slotHTML, fillSlots } from './lazy.js';
import { D, TOPICS, POS, REG, CTX } from './data.js';
import { S } from './settings.js';
import { FORMS, FORM_LEVEL, verbInfo, conjugate, formVi, GROUP_VI, hasForm } from './conj.js';
import { AFORMS, adjInfo, adjConj, adjVi } from './adj.js';
import { COUNTERS, counterOf, numKanji, counterMark, SCALES, NEG_ADV } from './counters.js';
import { markBtnHTML } from './marks.js';
import { hvTrapHTML, hvDaoHTML } from './hvbay.js';

const sayBtn = (text, label = 'Nghe') => `<button type="button" class="icon-btn say" data-say="${esc(text)}" aria-label="${label}">${icon('speaker')}</button>`;
export const hira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
const isKata = s => /^[゠-ヿー・]+$/.test(s || '');
const VCTX = { ...CTX, doisong: 'Đời sống', xuong: 'Xưởng', thutuc: 'Giấy tờ', hoithoai: 'Hội thoại', kansai: 'Kansai' };
const CTX_ORDER = ['doisong', 'xuong', 'thutuc', 'hoithoai', 'kansai'];

export function exampleHTML(ex, { ctx } = {}) {
  return `<div class="ex">
    <div class="ex-row"><p class="ex-jp" lang="ja">${rubyHTML(ex.jp, true)}</p>${sayBtn(reading(ex.jp))}</div>
    <p class="ex-vi">${esc(ex.vi)}${ctx ? ` <span class="tag">${esc(ctx)}</span>` : ''}</p>
  </div>`;
}

// Dải "Chữ Hán trong từ này" — chạm để mở thẻ chữ
export const kanjiStripHTML = it => {
  const cs = kanjiChars(it.kanji);
  if (!cs.length) return '';
  return `<p class="kstrip" data-bare><span class="muted small">Chữ Hán trong từ:</span> ${cs.map(c => `<button type="button" class="kchip ${D.kanjiByChar.has(c) ? 'has' : ''}" data-kopen="${esc(c)}"><b lang="ja">${esc(c)}</b>${D.kanjiByChar.has(c) ? `<small>${esc(D.kanjiByChar.get(c).hv)}</small>` : ''}</button>`).join('')}</p>`;
};

// Tham chiếu tới từ khác: mã trong kho (chạm để mở) hoặc {w, vi} viết thẳng
export function refHTML(ref) {
  if (ref && typeof ref === 'object') return `<span class="wref"><span lang="ja">${rich(ref.w || '')}</span>${ref.vi ? ` <small>${esc(ref.vi)}</small>` : ''}</span>`;
  const o = D.items.get(ref);
  if (o && o._type === 'vocab') return `<button type="button" class="wref" data-wopen="${esc(o.id)}"><span lang="ja">${wordHTML(o, 'furi')}</span> <small>${esc(o.vi)}</small></button>`;
  const kana = String(ref || '').split(':')[2];
  return kana ? `<span class="wref"><span lang="ja">${esc(kana.split('#')[0])}</span></span>` : '';
}
const refsRow = (label, refs) => (refs || []).length ? `<div class="wrel"><span class="wrel-l">${label}</span><div class="wrel-v">${refs.map(refHTML).join('')}</div></div>` : '';

// B1: đồng âm — cùng cách đọc, khác từ
export const homophones = it => {
  const k = hira(it.kana);
  return D.vocab.filter(o => o.id !== it.id && hira(o.kana) === k && (o.kanji || o.kana) !== (it.kanji || it.kana) && !(it.syn || []).includes(o.id));
};

// Ví dụ, nhóm theo tình huống, giữ thứ tự dễ → khó trong mỗi nhóm
function examplesHTML(it, max) {
  const ex = (it.ex || []).slice(0, max);
  if (!ex.length) return '';
  const tagged = ex.some(e => e.ctx);
  if (!tagged) return ex.map(e => exampleHTML(e)).join('');
  const order = [...ex].sort((a, b) => CTX_ORDER.indexOf(a.ctx) - CTX_ORDER.indexOf(b.ctx));
  return `<h3 class="h3">Ví dụ (${ex.length})</h3>` + order.map(e => exampleHTML(e, { ctx: VCTX[e.ctx] || '' })).join('');
}

// ---------- động từ ----------
export const learnedForms = () => new Set(D.prefs?.forms || []);
export function verbHeadExtra(it) {
  const v = verbInfo(it);
  if (!v) return '';
  const m = conjugate(v, 'masu');
  return m ? `<span class="wd-masu" lang="ja"> · ${rich(m.mark)}</span>` : '';
}
function verbTagHTML(it) {
  const v = verbInfo(it);
  if (!v) return '';
  const vt = it.vt === 'tu' ? 'tự động từ (〜が …)' : it.vt === 'tha' ? 'tha động từ (〜を …)' : '';
  return `<p class="wd-tags"><span class="tag">${GROUP_VI[v.group]}</span>${vt ? `<span class="tag">${esc(vt)}</span>` : ''}</p>`;
}
function conjTableHTML(it) {
  const v = verbInfo(it);
  if (!v) return '';
  const learned = learnedForms();
  const row = f => {
    const c = conjugate(v, f);
    return c ? `<tr><th scope="row">${esc(FORMS[f])}<small>${FORM_LEVEL[f]}</small></th><td lang="ja">${rich(c.mark)}</td><td>${esc(formVi(f, it))}</td></tr>` : '';
  };
  const fs = Object.keys(FORMS).filter(f => hasForm(v, f));
  const a = fs.filter(f => learned.has(f)), b = fs.filter(f => !learned.has(f));
  return `<h3 class="h3">Chia thể <small class="muted">(app tự chia)</small></h3>
    <table class="ctab"><tbody>${a.map(row).join('')}</tbody></table>
    ${b.length ? `<details class="ctab-more"><summary>Các thể chưa đánh dấu đã học (${b.length})</summary><table class="ctab ctab-dim"><tbody>${b.map(row).join('')}</tbody></table>
      <p class="muted small">Đánh dấu thể đã học ở Luyện tập → Thể động từ trong câu.</p></details>` : ''}`;
}
function pairHTML(it) {
  if (!it.pair) return '';
  const lab = it.vt === 'tu' ? 'Cặp tha động từ (〜を)' : it.vt === 'tha' ? 'Cặp tự động từ (〜が)' : 'Cặp tự – tha';
  return refsRow(lab, [it.pair]);
}
function keigoHTML(it) {
  const k = it.keigo;
  if (!k || (!k.ton && !k.khiem)) return '';
  return `<div class="wrel"><span class="wrel-l">Kính ngữ</span><div class="wrel-v">${k.ton ? `<span class="wref"><small>tôn kính</small> <span lang="ja">${rich(k.ton)}</span></span>` : ''}${k.khiem ? `<span class="wref"><small>khiêm nhường</small> <span lang="ja">${rich(k.khiem)}</span></span>` : ''}</div></div>`;
}
function fxHTML(it) {
  if (!(it.fx || []).length) return '';
  return `<h3 class="h3">Câu theo thể</h3>` + it.fx.map(x => exampleHTML(x, { ctx: FORMS[x.f] || '' })).join('');
}

// ---------- tính từ ----------
function adjTableHTML(it) {
  const a = adjInfo(it);
  if (!a) return '';
  const rows = Object.keys(AFORMS).map(f => {
    const c = adjConj(a, f);
    return c ? `<tr><th scope="row">${esc(AFORMS[f])}</th><td lang="ja">${rich(c.mark)}${c.pol && c.pol !== c.mark ? `<small class="pol">${rich(c.pol)}</small>` : ''}</td><td>${esc(adjVi(f, it.vi))}</td></tr>` : '';
  }).join('');
  return `<h3 class="h3">Các dạng <small class="muted">(app tự chia)</small></h3><table class="ctab"><tbody>${rows}</tbody></table>`;
}

// ---------- trợ số từ ----------
export function countMark(cn, n) {
  const r = COUNTERS[cn].r[n - 1], num = numKanji(n);
  if (cn === 'つ') return r.endsWith('つ') ? `${num}[${r.slice(0, -1)}]つ` : `${num}[${r}]`;
  if (cn === 'か月') return `${num}[${r.replace(/かげつ$/, '')}]か月[げつ]`;
  return `${num}${cn}[${r}]`;
}
const askMark = cn => (cn === 'つ' ? 'いくつ' : cn === 'か月' ? `何[なん]か月[げつ]` : `何${cn}[${COUNTERS[cn].q}]`);
export function counterTableHTML(cn, { open = false } = {}) {
  const C = COUNTERS[cn];
  if (!C) return '';
  return `<details class="ctr" ${open ? 'open' : ''}><summary>Đếm bằng <b lang="ja">${rich(counterMark(cn))}</b> — ${esc(C.vi)}: <span lang="ja">${[1, 2, 3].map(n => rich(countMark(cn, n))).join('、')}…</span></summary>
    <div class="ctr-grid" lang="ja">${[...Array(10).keys()].map(i => `<span>${rich(countMark(cn, i + 1))}</span>`).join('')}<span class="ctr-q">${rich(askMark(cn))}?</span></div></details>`;
}
function ctrHTML(it) {
  if (it.pos === 'ctr') { const c = counterOf(it.kanji) || counterOf(it.kana); return c ? counterTableHTML(c.c, { open: true }) : ''; }
  if (!it.ctr) return '';
  const list = [].concat(it.ctr);
  return `<h3 class="h3">Đếm</h3>` + list.map(c => COUNTERS[c] ? counterTableHTML(c) : `<p class="small">Đếm bằng <b lang="ja">${rich(c)}</b></p>`).join('');
}

// ---------- phó từ ----------
function advHTML(it) {
  const k = hira(it.kana);
  const sc = SCALES.filter(s => s.items.some(x => x[0] === k));
  const neg = it.with === 'phudinh' || NEG_ADV.includes(k);
  if (!sc.length && !neg) return '';
  return (neg ? '<p class="wd-tags"><span class="tag tag-warn">đi với câu phủ định</span></p>' : '') +
    sc.map(s => `<div class="scale"><span class="wrel-l">${esc(s.name)}</span><ol class="scale-l">${s.items.map(([kn, vi, n]) => `<li class="${kn === k ? 'on' : ''}"><span lang="ja">${esc(kn)}</span><small>${esc(vi)}${n ? ' · + phủ định' : ''}</small></li>`).join('')}</ol></div>`).join('');
}

// ---------- câu đáp, katakana ----------
function replyHTML(it) {
  if (!(it.reply || []).length) return '';
  return `<h3 class="h3">Đáp lại thế nào</h3>` + it.reply.map(r => exampleHTML(r)).join('');
}
function gocHTML(it) {
  if (!isKata(it.kana) && !it.goc) return '';
  return `<p class="wd-goc">${isKata(it.kana) ? '<span class="tag">từ ngoại lai</span> ' : ''}${it.goc ? `Gốc: <b>${esc(it.goc)}</b>` : ''}${it.wasei ? '<br><span class="tag tag-warn">nghĩa khác tiếng gốc</span> Người Nhật dùng theo nghĩa riêng — đừng dịch theo tiếng Anh.' : ''}</p>`;
}

// v31 (L1): từ dễ nhầm đặt cạnh nhau — chữ, âm Hán Việt, nghĩa. focus = từ đang học / đáp án đúng, picked = từ đã chọn nhầm.
export const confuseOf = it => (it.confuse || []).filter(c => c !== it.pair).map(id => D.items.get(id)).filter(o => o && o.id !== it.id);
export const isConfusable = (a, b) => !!a && !!b && a.id !== b.id && ((a.confuse || []).includes(b.id) || (b.confuse || []).includes(a.id));
export function confuseCmpHTML(items, { focus = null, picked = null, title = 'So sánh từ dễ nhầm' } = {}) {
  if (items.length < 2) return '';
  return `<div class="cmp"><p class="cmp-t">${esc(title)}</p><table class="cmp-tb"><tbody>${items.map(o => `<tr class="${o.id === focus ? 'is-focus' : ''}${o.id === picked ? ' is-picked' : ''}">
    <th scope="row"><button type="button" class="cmp-w" data-wopen="${esc(o.id)}" lang="ja">${wordHTML(o, 'furi')}</button></th>
    <td>${o.hv ? `<small class="cmp-hv">${esc(o.hv)}</small>` : ''}${esc(o.vi)}${o.id === picked ? ' <small class="cmp-mark">← bạn chọn</small>' : ''}</td></tr>`).join('')}</tbody></table></div>`;
}

// v40: lazyRest — phần dưới (ví dụ, bảng chia, đồng nghĩa…) dựng ở khung hình sau; người gọi phải gọi fillWordMore(root) sau khi gắn HTML
const _rest = new Map();
let _rn = 0;
export function fillWordMore(root) {
  const fns = {};
  root.querySelectorAll('[data-slot^="wdm-"]').forEach(el => { const k = el.dataset.slot, f = _rest.get(k); _rest.delete(k); if (f) fns[k] = f; });
  return fillSlots(root, fns);
}
export function wordDetailHTML(it, { compact = false, lazyRest = false } = {}) {
  const tn = (it.topics || []).map(t => TOPICS[t] || t).join(', ');
  const reg = it.reg && it.reg !== 'thuong' && !tn.includes(REG[it.reg]) ? REG[it.reg] : '';
  const meta = [POS[it.pos] || it.pos, it.level, tn, reg].filter(Boolean);
  const head = `<div class="wd-head">
      <p class="wd-word" lang="ja">${wordHTML(it, 'furi')}${verbHeadExtra(it)}</p>
      ${sayBtn(it.kana)}${it.id ? markBtnHTML(it.id) : ''}
    </div>
    ${it.kanji ? `<p class="wd-kana" lang="ja">${esc(it.kana)}</p>` : ''}
    ${S.showHv && it.hv ? `<p class="wd-hv">Hán Việt: <b>${esc(it.hv)}</b></p>` : ''}
    ${hvTrapHTML(it)}${hvDaoHTML(it)}`;
  if (compact) return `<div class="wd">${head}
    <p class="wd-vi">${esc(it.vi)}</p>
    ${it.std ? `<p class="wd-std">Tiếng chuẩn: <span lang="ja">${rich(it.std)}</span></p>` : ''}
    ${(it.ex || []).slice(0, 1).map(e => exampleHTML(e)).join('')}</div>`;
  const top = `${head}
    ${kanjiStripHTML(it)}
    <p class="wd-vi">${esc(it.vi)}</p>
    ${confuseCmpHTML([it, ...confuseOf(it)].slice(0, 4), { focus: it.id, title: 'Dễ nhầm — so sánh' })}
    ${it.std ? `<p class="wd-std">Tiếng chuẩn: <span lang="ja">${rich(it.std)}</span></p>` : ''}
    <p class="wd-meta">${meta.map(esc).join(' / ')}</p>
    ${verbTagHTML(it)}
    ${gocHTML(it)}`;
  const rest = () => restHTML(it);
  if (lazyRest) { const k = 'wdm-' + (++_rn); _rest.set(k, rest); return `<div class="wd">${top}${slotHTML(k, 'Đang tải ví dụ…', 160)}</div>`; }
  return `<div class="wd">${top}${rest()}</div>`;
}
function restHTML(it) {
  const homo = homophones(it);
  return `${(it.coll || []).length ? `<h3 class="h3">Cụm hay đi kèm</h3><ul class="coll">${it.coll.map(c => `<li><span lang="ja">${rich(c.jp)}</span><small>${esc(c.vi || '')}</small></li>`).join('')}</ul>` : ''}
    ${examplesHTML(it, 9)}
    ${refsRow('Đồng nghĩa', it.syn) + refsRow('Trái nghĩa', it.ant) + refsRow('Đồng âm', homo.map(o => o.id)) + refsRow('Cùng gốc', it.rel) + pairHTML(it) + keigoHTML(it)}
    ${conjTableHTML(it)}
    ${fxHTML(it)}
    ${adjTableHTML(it)}
    ${ctrHTML(it)}
    ${advHTML(it)}
    ${replyHTML(it)}
    ${it.note ? `<p class="wd-note">${rich(it.note)}</p>` : ''}
    ${it.flag ? `<p class="wd-flag">Mục này đang được đánh dấu cần kiểm lại.</p>` : ''}
    ${D.reports[it.id] && !D.reports[it.id]._del ? `<p class="wd-flag">Bạn đã báo sai mục này${D.reports[it.id].note ? ': ' + rich(D.reports[it.id].note) : ''}.</p>` : ''}`;
}
