// Máy chia tính từ — tính từ い và tính từ な, giữ furigana.
import { shortVi } from './conj.js';

export const AFORMS = {
  desu: 'khẳng định', nai: 'phủ định', ta: 'quá khứ', nakatta: 'quá khứ phủ định', te: 'thể て (nối câu)',
  ba: 'điều kiện (nếu)', adv: 'thành phó từ', naru: 'trở nên', attr: 'đứng trước danh từ', sa: 'danh từ chỉ độ (〜さ)', sou: 'trông có vẻ (〜そう)', sugi: 'quá (〜すぎる)',
  suru: 'làm cho (〜くする / 〜にする)', mi: 'danh từ cảm nhận (〜み)',
};
const AVI = {
  desu: '{a}', nai: 'không {a}', ta: '(đã) {a} — quá khứ', nakatta: 'đã không {a}', te: '{a}, và… / vì {a} nên…', ba: 'nếu {a}',
  adv: '(một cách) {a}', naru: 'trở nên {a}', attr: '(cái) {a}', sa: 'độ {a}, sự {a}', sou: 'trông có vẻ {a}', sugi: 'quá {a}',
  suru: 'làm cho {a}', mi: '(cảm giác, vị) {a}',
};
// Tính từ có danh từ 〜み thông dụng (重み, 痛み, 甘み…)
const MI = ['おもい', 'いたい', 'たのしい', 'あまい', 'にがい', 'あかい', 'あおい', 'ふかい', 'つよい', 'よわい', 'かなしい', 'あたたかい', 'まるい', 'くるしい', 'うまい', 'からい', 'ありがたい'];
// nghĩa gốc đã mang chữ "không" (だめ "không được") → phủ định nói "không phải là …", khỏi thành "không không được"
export const adjVi = (form, vi) => {
  const a = shortVi(vi);
  if (/^không\s/.test(a) && (form === 'nai' || form === 'nakatta')) return (form === 'nai' ? 'không phải là ' : 'đã không phải là ') + a;
  return (AVI[form] || '{a}').replaceAll('{a}', a);
};

export function adjInfo(it) {
  if (!it || it.reg === 'kansai') return null;
  // tính từ な toàn chữ Hán không có kf (暇, 簡単, 大丈夫) → tự ghép furigana từ kana
  const mark = it.kf || (it.kanji && /^[一-鿿々]+$/.test(it.kanji) ? `${it.kanji}[${it.kana}]` : it.kanji || it.kana);
  if (it.pos === 'adj-i') {
    if (!it.kana.endsWith('い') || !mark.endsWith('い')) return null;
    // いい / かっこいい: chia theo よい (よくない, よかった) — v71: trừ かわいい (không phải từ ghép với いい: かわいくない)
    if (it.kana.endsWith('いい') && mark.endsWith('いい') && !/かわいい$/.test(it.kana)) return { type: 'i', base: mark, stem: mark.slice(0, -2) + 'よ', stemKana: it.kana.slice(0, -2) + 'よ' };
    return { type: 'i', base: mark, stem: mark.slice(0, -1), stemKana: it.kana.slice(0, -1) };
  }
  if (it.pos === 'adj-na') return { type: 'na', base: mark.replace(/な$/, ''), baseKana: it.kana.replace(/な$/, '') };
  return null;
}

// { mark, pol? } — pol: dạng lịch sự đi kèm
export function adjConj(it, form) {
  const a = typeof it.type === 'string' ? it : adjInfo(it);
  if (!a) return null;
  if (a.type === 'i') {
    const s = a.stem;
    // 〜そう: ない → なさそう, いい → よさそう; còn lại bỏ い thêm そう (少ない → 少なそう)
    // v71: かわいい không có 〜そう (かわいそう là từ khác: "đáng thương") → bỏ dạng này
    const sou = /かわい$/.test(a.stemKana || '') ? null : a.stemKana === 'な' || a.stemKana === 'よ' || a.base.endsWith('良い') || (a.base.endsWith('いい') && s.endsWith('よ')) ? s + 'さそう' : s + 'そう';
    const M = {
      desu: [a.base, a.base + 'です'], nai: [s + 'くない', s + 'くないです'], ta: [s + 'かった', s + 'かったです'], nakatta: [s + 'くなかった', s + 'くなかったです'],
      te: [s + 'くて'], ba: [s + 'ければ'], adv: [s + 'く'], naru: [s + 'くなる', s + 'くなります'], attr: [a.base],
      sa: [s + 'さ'], sou: sou ? [sou, sou + 'です'] : null, sugi: [s + 'すぎる', s + 'すぎます'],
      suru: [s + 'くする', s + 'くします'], mi: MI.includes(a.stemKana + 'い') ? [s + 'み'] : null,
    }[form];
    return M ? { mark: M[0], pol: M[1] || '' } : null;
  }
  const b = a.base;
  const M = {
    desu: [b + 'だ', b + 'です'], nai: [b + 'じゃない', b + 'じゃないです / ' + b + 'ではありません'], ta: [b + 'だった', b + 'でした'],
    nakatta: [b + 'じゃなかった', b + 'じゃなかったです'], te: [b + 'で'], ba: [b + 'なら'], adv: [b + 'に'], naru: [b + 'になる', b + 'になります'],
    attr: [b + 'な'], sou: [b + 'そう', b + 'そうです'], sugi: [b + 'すぎる', b + 'すぎます'], suru: [b + 'にする', b + 'にします'],
  }[form];
  return M ? { mark: M[0], pol: M[1] || '' } : null;
}
export const adjForms = it => { const a = adjInfo(it); return a ? Object.keys(AFORMS).filter(f => adjConj(a, f)) : []; };

// Lỗi hay gặp: chia tính từ い theo kiểu な (高いだった) và ngược lại (きれかった, 有名くない); いい chia theo い (いかった)
export function adjWrong(it, form) {
  const a = typeof it.type === 'string' ? it : adjInfo(it);
  if (!a) return [];
  const right = adjConj(a, form)?.mark;
  const out = [];
  const add = m => { if (m && m !== right && !out.includes(m)) out.push(m); };
  if (a.type === 'i') {
    if (!['ba', 'sou'].includes(form)) add(adjConj({ type: 'na', base: a.base }, form)?.mark); // 高いだった (高いなら, 高いそう vẫn đúng ngữ pháp → bỏ)
    if (a.base.endsWith('いい')) add(adjConj({ type: 'i', base: a.base, stem: a.base.slice(0, -1), stemKana: '' }, form)?.mark); // いかった
    if (form === 'ta') add(a.base + 'でした');
    if (form === 'nai') add(a.base + 'じゃない');
  } else {
    const b = a.base, st = /い$/.test(b) ? b.slice(0, -1) : b;
    add(adjConj({ type: 'i', base: st + 'い', stem: st, stemKana: '' }, form)?.mark); // きれかった, 有名くない
    if (form === 'attr') add(b + 'の');
    if (form === 'ta') add(b + 'かった');
  }
  for (const f of Object.keys(AFORMS)) if (f !== form) add(adjConj(a, f)?.mark);
  return out;
}
// Danh từ + だ
export const NFORMS = { da: 'khẳng định (だ)', desu: 'lịch sự (です)', janai: 'phủ định (thể thường)', datta: 'quá khứ (thể thường)', janakatta: 'quá khứ phủ định (thể thường)', deshita: 'quá khứ lịch sự', de: 'nối câu (で)', nara: 'nếu là (なら)', nanode: 'vì là (なので)', nanoni: 'dù là (なのに)', no: 'bổ nghĩa danh từ (の)' };
const NEND = { da: ['だ'], desu: ['です'], janai: ['じゃない', 'ではない'], datta: ['だった'], janakatta: ['じゃなかった', 'ではなかった'], deshita: ['でした'], de: ['で'], nara: ['なら'], nanode: ['なので'], nanoni: ['なのに'], no: ['の'] };
export const nounConj = (mark, f) => (NEND[f] || []).map(e => mark + e);
export function nounWrong(mark, f) {
  const right = nounConj(mark, f);
  const W = { da: ['い', 'な'], desu: ['だです', 'ます'], janai: ['くない', 'ない', 'だない'], datta: ['かった', 'だだった'], janakatta: ['くなかった', 'じゃないだった'], deshita: ['だでした', 'かったです'], de: ['て', 'くて', 'だで'], nara: ['だなら', 'ければ'], nanode: ['ので', 'だので'], nanoni: ['のに', 'だのに'], no: ['な', 'だ'] }[f] || [];
  const out = W.map(e => mark + e.split(' ')[0]);
  // cùng nghĩa khác mức lịch sự (だ / です, だった / でした) không làm đáp án nhiễu của nhau
  const twin = { da: 'desu', desu: 'da', datta: 'deshita', deshita: 'datta' }[f];
  for (const g of Object.keys(NFORMS)) if (g !== f && g !== twin) out.push(nounConj(mark, g)[0]);
  return [...new Set(out)].filter(m => !right.includes(m));
}
