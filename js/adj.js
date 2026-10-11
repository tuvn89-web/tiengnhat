// Máy chia tính từ — tính từ い và tính từ な, giữ furigana.
import { shortVi } from './conj.js';

export const AFORMS = {
  desu: 'khẳng định', nai: 'phủ định', ta: 'quá khứ', nakatta: 'quá khứ phủ định', te: 'thể て (nối câu)',
  ba: 'điều kiện (nếu)', adv: 'thành phó từ', naru: 'trở nên', attr: 'đứng trước danh từ', sa: 'danh từ chỉ độ (〜さ)', sou: 'trông có vẻ (〜そう)', sugi: 'quá (〜すぎる)',
};
const AVI = {
  desu: '{a}', nai: 'không {a}', ta: '(đã) {a} — quá khứ', nakatta: 'đã không {a}', te: '{a}, và… / vì {a} nên…', ba: 'nếu {a}',
  adv: '(một cách) {a}', naru: 'trở nên {a}', attr: '(cái) {a}', sa: 'độ {a}, sự {a}', sou: 'trông có vẻ {a}', sugi: 'quá {a}',
};
export const adjVi = (form, vi) => (AVI[form] || '{a}').replaceAll('{a}', shortVi(vi));

export function adjInfo(it) {
  if (!it || it.reg === 'kansai') return null;
  const mark = it.kf || it.kanji || it.kana;
  if (it.pos === 'adj-i') {
    if (!it.kana.endsWith('い') || !mark.endsWith('い')) return null;
    // いい / かっこいい: chia theo よい (よくない, よかった)
    if (it.kana.endsWith('いい') && mark.endsWith('いい')) return { type: 'i', base: mark, stem: mark.slice(0, -2) + 'よ', stemKana: it.kana.slice(0, -2) + 'よ' };
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
    const sou = a.stemKana === 'な' || a.base.endsWith('いい') ? s + 'さそう' : s + 'そう';
    const M = {
      desu: [a.base, a.base + 'です'], nai: [s + 'くない', s + 'くないです'], ta: [s + 'かった', s + 'かったです'], nakatta: [s + 'くなかった', s + 'くなかったです'],
      te: [s + 'くて'], ba: [s + 'ければ'], adv: [s + 'く'], naru: [s + 'くなる', s + 'くなります'], attr: [a.base],
      sa: [s + 'さ'], sou: [sou, sou + 'です'], sugi: [s + 'すぎる', s + 'すぎます'],
    }[form];
    return M ? { mark: M[0], pol: M[1] || '' } : null;
  }
  const b = a.base;
  const M = {
    desu: [b + 'だ', b + 'です'], nai: [b + 'じゃない', b + 'じゃないです / ' + b + 'ではありません'], ta: [b + 'だった', b + 'でした'],
    nakatta: [b + 'じゃなかった', b + 'じゃなかったです'], te: [b + 'で'], ba: [b + 'なら'], adv: [b + 'に'], naru: [b + 'になる', b + 'になります'],
    attr: [b + 'な'], sou: [b + 'そう', b + 'そうです'], sugi: [b + 'すぎる', b + 'すぎます'],
  }[form];
  return M ? { mark: M[0], pol: M[1] || '' } : null;
}
export const adjForms = it => { const a = adjInfo(it); return a ? Object.keys(AFORMS).filter(f => adjConj(a, f)) : []; };
