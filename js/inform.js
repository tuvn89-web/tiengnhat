// v66: THỂ CỦA TỪ TRONG CÂU — "投げられた = 投げる · bị động · quá khứ → đã bị / được ném".
// Dùng máy chia động từ / tính từ sẵn có: sinh mọi dạng chia (kể cả chia tiếp: bị động + quá khứ, ている + ます, たい + かった…),
// rồi tìm dạng dài nhất khớp với chữ trong câu. Hai cách hiểu trùng chữ (食べられる: khả năng hay bị động) thì không gọi tên thể.
import { plain } from './util.js';
import { FORMS, verbInfo, conjugate, formVi, verbVi } from './conj.js';
import { AFORMS, adjInfo, adjConj, adjVi } from './adj.js';

const hira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
// tên thể gọn: "thể bị động" → "bị động"; giữ "thể て", "thể ます"…
const nm = f => FORMS[f].replace(/^thể (?=[a-zà-ỹ])/i, '');
// đuôi chia tiếp sau một thể (thể phái sinh, ている, てしまう…)
const TAILS = ['masu', 'masen', 'mashita', 'te', 'ta', 'nai', 'nakatta', 'ba', 'tara', 'teiru'];
const TAIL = { masu: 'lịch sự', masen: 'phủ định lịch sự', mashita: 'quá khứ lịch sự', masendeshita: 'quá khứ phủ định lịch sự', te: 'thể て', ta: 'quá khứ', nai: 'phủ định', nakatta: 'quá khứ phủ định', ba: 'điều kiện ば', tara: 'điều kiện たら', teiru: 'đang (ている)' };
const TAIL_VI = { masu: v => v, masen: v => 'không ' + v, mashita: v => 'đã ' + v, masendeshita: v => 'đã không ' + v, te: v => v + ' rồi… (nối câu)', ta: v => 'đã ' + v, nai: v => 'không ' + v, nakatta: v => 'đã không ' + v, ba: v => 'nếu ' + v, tara: v => 'nếu / khi ' + v, teiru: v => 'đang ' + v };
// nghĩa của thể làm gốc khi chia tiếp
const BASE_VI = {
  kano: v => 'có thể ' + v, ukemi: v => (/^(bị|được)\s/.test(v) ? v : 'bị / được ' + v), shieki: v => 'bắt / cho (ai) ' + v, shiekiukemi: v => 'bị bắt ' + v,
  teiru: v => 'đang ' + v, teru: v => 'đang ' + v, teshimau: v => 'lỡ ' + v + ' / ' + v + ' xong hẳn', chau: v => 'lỡ ' + v, teoku: v => v + ' sẵn', toku: v => v + ' sẵn', sugiru: v => v + ' quá mức',
};
// động từ giả để chia tiếp: nhóm 2 (đuôi る) hoặc nhóm 1 (đuôi u)
const v1 = (mark, kana) => ({ group: 'v1', stem: mark.slice(0, -1), stemKana: kana.slice(0, -1), dict: mark, dictKana: kana, na: [] });
const v5 = (mark, kana) => ({ group: 'v5', u: kana.slice(-1), stem: mark.slice(0, -1), stemKana: kana.slice(0, -1), dict: mark, dictKana: kana, na: [] });

function verbCands(it) {
  const v = verbInfo(it);
  if (!v) return [];
  const out = [], vv = verbVi(it);
  let k0 = '';
  const add = (mark, kana, names, vi) => { if (mark) out.push({ mark, s: [plain(mark), hira(kana)], names, vi, key: names.join('|'), k0 }); };
  add(v.dict, v.dictKana, [], '');
  for (const f of Object.keys(FORMS)) { const c = conjugate(v, f); k0 = f; if (c) add(c.mark, c.kana, [nm(f)], formVi(f, it)); }
  k0 = '';
  const m = conjugate(v, 'masen');
  if (m) add(m.mark + 'でした', m.kana + 'でした', [TAIL.masendeshita], TAIL_VI.masendeshita(vv));
  const st = conjugate(v, 'masu');
  if (st) {
    const b = st.mark.replace(/ます$/, ''), bk = st.kana.replace(/ます$/, '');
    add(b + 'ましょう', bk + 'ましょう', ['rủ / đề nghị (ましょう)'], 'cùng ' + vv + ' nào');
    add(b + 'ましょうか', bk + 'ましょうか', ['đề nghị (ましょうか)'], vv + ' giúp nhé? / cùng ' + vv + ' nhé?');
  }
  const nai = conjugate(v, 'nai');
  if (nai) {
    add(nai.mark + 'で', nai.kana + 'で', ['phủ định + で'], 'không ' + vv + ' (mà…) / đừng ' + vv);
    add(nai.mark.replace(/い$/, 'くて'), nai.kana.replace(/い$/, 'くて'), ['phủ định + て'], 'không ' + vv + ' nên… / không ' + vv + ' và…');
  }
  // chia tiếp: thể phái sinh (nhóm 2), ている / てる, てしまう / ちゃう, ておく / とく, すぎる
  const chain = (f, mk, c = conjugate(v, f)) => {
    if (!c) return;
    k0 = f;
    const pv = mk(c.mark, c.kana), bv = (BASE_VI[f] || (x => x))(vv);
    for (const t of TAILS) {
      if (t === 'teiru' && (f === 'teiru' || f === 'teru')) continue;
      const d = conjugate(pv, t);
      if (d) add(d.mark, d.kana, [nm(f), TAIL[t]], TAIL_VI[t](bv));
    }
    const ms = conjugate(pv, 'masen');
    if (ms) add(ms.mark + 'でした', ms.kana + 'でした', [nm(f), TAIL.masendeshita], TAIL_VI.masendeshita(bv));
    k0 = '';
  };
  for (const f of ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'sugiru']) chain(f, v1);
  // sai khiến bị động dạng đầy đủ của nhóm 1 (洗わせられる; dạng ngắn 洗わされる đã có ở trên)
  const sk = v.group === 'v5' && conjugate(v, 'shieki');
  if (sk) { const L = { mark: sk.mark.replace(/る$/, 'られる'), kana: sk.kana.replace(/る$/, 'られる') }; k0 = 'shiekiukemi'; add(L.mark, L.kana, [nm('shiekiukemi')], formVi('shiekiukemi', it)); chain('shiekiukemi', v1, L); }
  chain('teiru', v1); chain('teru', v1);
  for (const f of ['teshimau', 'chau', 'teoku', 'toku']) chain(f, v5);
  // 〜たい, 〜やすい, 〜にくい chia như tính từ い
  for (const f of ['tai', 'yasui', 'nikui']) {
    const c = conjugate(v, f);
    if (!c) continue;
    const a = { type: 'i', base: c.mark, stem: c.mark.slice(0, -1), stemKana: c.kana.slice(0, -1) }, ak = { type: 'i', base: c.kana, stem: c.kana.slice(0, -1), stemKana: c.kana.slice(0, -1) };
    const bv = formVi(f, it).replace(/\s*\(.*\)$/, '');
    for (const af of ['nai', 'ta', 'nakatta', 'te', 'ba', 'sou']) {
      const x = adjConj(a, af), y = adjConj(ak, af);
      if (!x) continue;
      add(x.mark, y.mark, [nm(f), AFORMS[af]], adjVi(af, bv));
      if (x.pol && x.pol !== x.mark && !x.pol.includes('/')) add(x.pol, y.pol, [nm(f), AFORMS[af], 'lịch sự'], adjVi(af, bv));
    }
    add(c.mark + 'です', c.kana + 'です', [nm(f), 'lịch sự'], bv);
  }
  return out;
}

function adjCands(it) {
  const a = adjInfo(it);
  if (!a) return [];
  const out = [];
  const add = (mark, names, vi) => { if (mark) out.push({ mark, s: [plain(mark)], names, vi, key: names.join('|') }); };
  const base = a.type === 'i' ? a.base : a.base;
  add(base, [], '');
  for (const f of Object.keys(AFORMS)) {
    const c = adjConj(a, f);
    if (!c) continue;
    if (c.mark !== base) add(c.mark, [AFORMS[f]], adjVi(f, it.vi));
    for (const p of String(c.pol || '').split(' / ')) if (p && p !== c.mark) add(p, [AFORMS[f], 'lịch sự'], adjVi(f, it.vi));
  }
  return out;
}

const _c = new Map();
const candsOf = it => {
  if (!_c.has(it.id)) _c.set(it.id, it.pos === 'adj-i' || it.pos === 'adj-na' ? adjCands(it) : verbCands(it));
  return _c.get(it.id);
};

// text = câu (chữ trơn), i = chỗ bắt đầu của từ trong câu.
// Trả về null (không phải động từ / tính từ, hoặc không khớp dạng nào) | { mark, names, vi, dict: true khi là dạng từ điển, unsure: true khi hai thể trùng chữ, len: số chữ khớp }
export function formAt(it, text, i = 0) {
  if (!it || !text) return null;
  const cs = candsOf(it);
  if (!cs.length) return null;
  const t = String(text), th = hira(t);
  let len = 0, top = [];
  for (const c of cs) {
    const hit = c.s.find((s, k) => s && (k ? th : t).startsWith(s, i));
    if (!hit) continue;
    if (hit.length > len) { len = hit.length; top = [c]; }
    else if (hit.length === len && !top.some(x => x.key === c.key)) top.push(c);
  }
  if (!top.length) return null;
  const best = top[0];
  if (top.length === 1) return { mark: best.mark, names: best.names, vi: best.vi, dict: !best.names.length, len };
  // nhóm 2: 〜られる vừa là thể khả năng vừa là bị động — ghi cả hai, không chọn thay người học
  const [a, b] = top;
  if (top.length === 2 && new Set([a.k0, b.k0]).size === 2 && [a.k0, b.k0].every(k => k === 'kano' || k === 'ukemi') && a.names.slice(1).join() === b.names.slice(1).join()) {
    const [ps, kn] = a.k0 === 'ukemi' ? [a, b] : [b, a];
    return { mark: best.mark, names: ['bị động hoặc khả năng', ...a.names.slice(1)], vi: `${ps.vi} — hoặc: ${kn.vi} (tùy câu)`, both: true, len };
  }
  return { mark: best.mark, names: [], vi: '', unsure: true, len };
}
