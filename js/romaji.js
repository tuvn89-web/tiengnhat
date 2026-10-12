// Gõ romaji tự đổi sang kana (Đ4): kakareru → かかれる, kitte → きって, shinbun / shimbun → しんぶん.
// Gõ chữ in hoa → katakana (KOOHII → コオヒイ; dấu - → ー).
const T = {
  a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お',
  ka: 'か', ki: 'き', ku: 'く', ke: 'け', ko: 'こ', ga: 'が', gi: 'ぎ', gu: 'ぐ', ge: 'げ', go: 'ご',
  sa: 'さ', si: 'し', shi: 'し', su: 'す', se: 'せ', so: 'そ', za: 'ざ', zi: 'じ', ji: 'じ', zu: 'ず', ze: 'ぜ', zo: 'ぞ',
  ta: 'た', ti: 'ち', chi: 'ち', tu: 'つ', tsu: 'つ', te: 'て', to: 'と', da: 'だ', di: 'ぢ', du: 'づ', de: 'で', do: 'ど',
  na: 'な', ni: 'に', nu: 'ぬ', ne: 'ね', no: 'の',
  ha: 'は', hi: 'ひ', hu: 'ふ', fu: 'ふ', he: 'へ', ho: 'ほ', ba: 'ば', bi: 'び', bu: 'ぶ', be: 'べ', bo: 'ぼ', pa: 'ぱ', pi: 'ぴ', pu: 'ぷ', pe: 'ぺ', po: 'ぽ',
  ma: 'ま', mi: 'み', mu: 'む', me: 'め', mo: 'も', ya: 'や', yu: 'ゆ', yo: 'よ',
  ra: 'ら', ri: 'り', ru: 'る', re: 'れ', ro: 'ろ', la: 'ら', li: 'り', lu: 'る', le: 'れ', lo: 'ろ',
  wa: 'わ', wi: 'うぃ', we: 'うぇ', wo: 'を', nn: 'ん', "n'": 'ん', vu: 'ゔ', va: 'ゔぁ', vi: 'ゔぃ', ve: 'ゔぇ', vo: 'ゔぉ',
  sha: 'しゃ', shu: 'しゅ', she: 'しぇ', sho: 'しょ', cha: 'ちゃ', chu: 'ちゅ', che: 'ちぇ', cho: 'ちょ', ja: 'じゃ', ju: 'じゅ', je: 'じぇ', jo: 'じょ',
  tsa: 'つぁ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', thi: 'てぃ', dhi: 'でぃ', twu: 'とぅ', dwu: 'どぅ',
  xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', xtu: 'っ', xtsu: 'っ', xwa: 'ゎ',
  '-': 'ー', ',': '、', '.': '。', '?': '？', '!': '！',
};
// kya, gya, nya, hya, mya, rya, bya, pya, jya, sya, tya, dya…
for (const [c, k] of Object.entries({ k: 'き', g: 'ぎ', n: 'に', h: 'ひ', m: 'み', r: 'り', b: 'び', p: 'ぴ', j: 'じ', s: 'し', t: 'ち', d: 'ぢ', z: 'じ', c: 'ち', l: 'り' }))
  for (const [v, s] of [['a', 'ゃ'], ['u', 'ゅ'], ['e', 'ぇ'], ['o', 'ょ']]) T[c + 'y' + v] = k + s;
T.lya = 'ゃ'; T.lyu = 'ゅ'; T.lyo = 'ょ'; T.ltu = 'っ'; T.ltsu = 'っ'; T.la = 'ら';
const VOW = 'aiueo', MAXL = 4;
const toKata = s => s.replace(/[ぁ-ゖ]/g, c => String.fromCharCode(c.charCodeAt(0) + 0x60));

// Đổi phần đã gõ xong; phần đang dở (k, sh, n…) giữ nguyên ở cuối. final = true thì n cuối thành ん.
export function romajiToKana(src, final = false) {
  let out = '', i = 0;
  const s = String(src);
  while (i < s.length) {
    const ch = s[i];
    const lo = ch.toLowerCase();
    if (!/[a-z'\-,.?!]/i.test(ch)) { out += ch; i++; continue; }
    const kata = ch !== lo;
    const put = k => { out += kata ? toKata(k) : k; };
    // phụ âm đôi → っ (kk, tt, ss, pp…; trừ nn)
    const nx = (s[i + 1] || '').toLowerCase();
    if (lo === 'm' && /[bpm]/.test(nx)) { put('ん'); i++; continue; } // shimbun, sampo → しんぶん, さんぽ
    if (lo === 'n' && nx === 'n' && /[aiueoy]/i.test(s[i + 2] || '')) { put('ん'); i++; continue; } // onna, konnichiha → おんな, こんにちは
    if (lo === nx && /[bcdfghjkmpqrstvwxyz]/.test(lo)) { put('っ'); i++; continue; }
    if (lo === 't' && nx === 'c') { put('っ'); i++; continue; } // tch → っち
    // n đứng trước phụ âm (trừ y) → ん
    if (lo === 'n' && nx && !VOW.includes(nx) && nx !== 'y' && nx !== 'n' && nx !== "'" && /[a-z]/.test(nx)) { put('ん'); i++; continue; }
    let hit = '';
    for (let L = MAXL; L >= 1; L--) { const k = s.slice(i, i + L).toLowerCase(); if (T[k] && k.length === L) { hit = k; break; } }
    if (hit) {
      // "n" + nguyên âm / y là hàng な, không phải ん: "na" khớp trước "n"
      put(T[hit]); i += hit.length; continue;
    }
    // chưa đủ để đổi: phần còn lại là đang gõ dở
    const rest = s.slice(i);
    if (i + MAXL > s.length && /^[a-z']+$/i.test(rest) && !final) { out += rest; break; }
    if (lo === 'n') { put('ん'); i++; continue; }
    out += ch; i++;
  }
  return out;
}
// Gắn vào một ô nhập: mỗi lần gõ thì đổi phần romaji đã đủ âm
export function attachRomaji(input, on = () => true) {
  input.addEventListener('input', e => {
    if (!on() || e.isComposing) return;
    const v = input.value, pos = input.selectionStart;
    if (pos !== v.length) return; // chỉ đổi khi đang gõ ở cuối
    const nv = romajiToKana(v);
    if (nv !== v) { input.value = nv; input.setSelectionRange(nv.length, nv.length); }
  });
}
// Chuẩn hoá để so đáp án: bỏ cách, dấu câu; katakana → hiragana; chữ toàn khổ → nửa khổ
export function normKana(s) {
  return String(s || '').normalize('NFKC').replace(/[\s、。，．,.！!？?「」『』（）()・〜~]/g, '')
    .replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).toLowerCase();
}
