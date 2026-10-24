// v67: THỂ ↔ MẪU NGỮ PHÁP. Bảng chia của thẻ từ: chạm tên thể (thể た, thể ý chí…) → bảng các mẫu ngữ pháp dùng thể đó;
// chạm mẫu → bài của mẫu. Dò từ: tên mẫu (〜てから → thể て) và phần "Cấu trúc" của mẫu ("Động từ thể た + ことがある").
import { D } from './data.js';
import { plain } from './util.js';

// mẫu ngữ pháp → thể (B1, chuyển từ forms.js sang đây để thẻ từ dùng được mà không phải tải forms.js)
export const G2F = [
  [/使役受身形/, ['shiekiukemi']], [/使役形/, ['shieki']], [/受身形/, ['ukemi']], [/可能形/, ['kano']], [/命令形/, ['meirei']], [/禁止形/, ['kinshi']],
  [/^〜ないでください$/, ['nai']], [/^〜てください$/, ['te']], [/〜ます・〜ません/, ['masu', 'masen']], [/〜ました・〜ませんでした/, ['mashita']], [/^〜たい$/, ['tai']],
  [/^〜ています$/, ['teiru']], [/〜てもいいですか/, ['te']], [/〜てはいけません/, ['tewa']], [/〜てから$/, ['te']], [/〜たり〜たりする/, ['tari']],
  [/〜たことがある/, ['ta']], [/〜なければならない/, ['nakereba']], [/〜なくてもいい/, ['nai']], [/〜ようと思う/, ['ikou']], [/〜ようとする/, ['ikou']],
  [/^〜ながら$/, ['nagara']], [/〜そうだ（様態/, ['sou']], [/^〜たら$/, ['tara']], [/^〜ば$/, ['ba']], [/〜てしまう$/, ['teshimau', 'chau']],
  [/^〜ておく$/, ['teoku', 'toku']], [/〜させてください/, ['sasete']], [/〜すぎる/, ['sugiru']], [/〜やすい・〜にくい/, ['yasui', 'nikui']],
  [/^〜方$/, ['kata']], [/〜ないで・〜ずに/, ['zu']], [/〜ずに済む/, ['zu']], [/〜なきゃ/, ['nakya']], [/〜ちゃいけない・〜ちゃだめ/, ['chadame']],
  [/〜とく・〜てる/, ['toku', 'teru']], [/〜たらどうですか/, ['tara']], [/〜たばかり/, ['ta']], [/〜ほうがいい/, ['ta']],
];
// phần "Cấu trúc" ghi rõ thể nối vào mẫu
const STRUCT = [
  ['shiekiukemi', /sai khiến bị động|使役受身/], ['shieki', /thể sai khiến(?! bị động)|使役(?!受身)/], ['ukemi', /thể bị động|受身/],
  ['kano', /thể khả năng|可能形/], ['ikou', /thể ý chí|意向形/], ['meirei', /thể mệnh lệnh|命令形/], ['ba', /thể ば|điều kiện ば|仮定形/],
  ['tara', /thể たら/], ['teiru', /thể ている/], ['te', /[Tt]hể て(?!い)|て形/], ['ta', /[Tt]hể た(?![いらり])|た形|thể quá khứ/],
  ['nai', /[Tt]hể ない|ない形|thân ない/], ['masu', /[Tt]hể ます|thân ます|ます形/], ['tai', /thể たい/],
];
// tên mẫu bắt đầu bằng đuôi của thể
const PAT = [
  ['teiru', /^〜ている/], ['te', /^〜て(?!いる)/], ['tara', /^〜たら/], ['tari', /^〜たり/], ['tai', /^〜たい/],
  ['ta', /^〜た(こと|ばかり|まま|ほうが|ところ|あと|後|うえ|上|すえ|末|とたん|途端|きり|っきり)/],
  ['nai', /^〜な(いで|いと|いように|いうちに|いことには|いわけには|くて|くても)/], ['nakereba', /^〜なければ/], ['nakya', /^〜なきゃ/],
  ['zu', /^〜ず(に|とも|じまい)/], ['ikou', /^〜(（よ）|よ)?うと(思|する|しない)|^〜ようか/], ['ba', /^〜ば(?!かり)/], ['nagara', /^〜ながら/],
  ['sugiru', /^〜すぎる/], ['yasui', /^〜やすい/], ['nikui', /^〜にくい/], ['kata', /^〜方/], ['teshimau', /^〜てしまう/], ['teoku', /^〜ておく/],
  ['sasete', /^〜させてください/], ['sou', /^〜そう(だ)?（様態/], ['tewa', /^〜てはいけな|^〜てはいけません/], ['masu', /^〜ます/],
  ['naru', /^〜(く|に)なる/], ['suru', /^〜(く|に)する/],
];
// dạng của tính từ → thể của động từ có cùng mẫu
const ADJ = { sou: 'sou', sugi: 'sugiru', ba: 'ba', naru: 'naru', suru: 'suru' };
let _m = null, _k = '';
function index() {
  const key = `${D.grammar.length}:${D.items.size}`;
  if (_m && _k === key) return _m;
  const m = new Map();
  for (const g of D.grammar) {
    const p = plain(g.pattern || ''), st = (g.structure || []).join(' '), ks = new Set();
    for (const [re, fs] of G2F) if (re.test(p)) fs.forEach(f => ks.add(f));
    for (const [f, re] of STRUCT) if (re.test(st)) ks.add(f);
    for (const [f, re] of PAT) if (re.test(p)) ks.add(f);
    for (const f of ks) { if (!m.has(f)) m.set(f, []); m.get(f).push(g); }
  }
  const lv = g => ['N5', 'N4', 'N3', 'N2', 'N1'].indexOf(g.level);
  for (const list of m.values()) list.sort((a, b) => lv(a) - lv(b) || plain(a.pattern).localeCompare(plain(b.pattern), 'ja'));
  _m = m; _k = key;
  return m;
}
// key: mã thể động từ (ta, ikou…) hoặc 'adj:<mã>'
const norm = k => (k.startsWith('adj:') ? ADJ[k.slice(4)] || '' : k);
export const gramsForForm = k => index().get(norm(k)) || [];
