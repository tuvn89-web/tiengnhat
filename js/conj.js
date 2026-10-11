// Máy chia động từ — tự chia mọi động từ trong kho, giữ furigana.
// Nhóm 1 (v5), nhóm 2 (v1), nhóm 3 (する, 来る, danh từ + する).

// Thứ tự = thứ tự hiện trong bảng chia của thẻ từ
export const FORMS = {
  masu: 'thể ます', masen: 'phủ định lịch sự', mashita: 'quá khứ lịch sự',
  te: 'thể て', ta: 'thể た', nai: 'thể ない', nakatta: 'quá khứ phủ định', tai: 'muốn (たい)', teiru: 'đang (ている)',
  kano: 'thể khả năng', ikou: 'thể ý chí', ba: 'điều kiện ば', tara: 'điều kiện たら',
  ukemi: 'thể bị động', shieki: 'thể sai khiến', shiekiukemi: 'sai khiến bị động', meirei: 'thể mệnh lệnh', kinshi: 'cấm (〜な)',
};
export const FORM_LEVEL = {
  masu: 'N5', masen: 'N5', mashita: 'N5', te: 'N5', ta: 'N5', nai: 'N5', nakatta: 'N5', tai: 'N5', teiru: 'N5',
  kano: 'N4', ikou: 'N4', ba: 'N4', tara: 'N4', ukemi: 'N4', shieki: 'N4', shiekiukemi: 'N3', meirei: 'N4', kinshi: 'N4',
};
export const N5_FORMS = Object.keys(FORMS).filter(f => FORM_LEVEL[f] === 'N5');
// Thể "phái sinh" — kết quả là động từ nhóm 2 mới (đuôi る), chia tiếp được: 切らせる → 切らせました
export const DERIVED = ['kano', 'ukemi', 'shieki', 'shiekiukemi'];

// Nghĩa tiếng Việt của từng thể, {v} = nghĩa động từ
const FORM_VI = {
  masu: '{v} (lịch sự)', masen: 'không {v}', mashita: 'đã {v}', te: '{v} rồi… (nối câu; 〜てください = hãy {v})',
  ta: 'đã {v} (thể thường)', nai: 'không {v} (thể thường)', nakatta: 'đã không {v}', tai: 'muốn {v}', teiru: 'đang {v}',
  kano: 'có thể {v}, {v} được', ikou: '{v} thôi; định {v}', ba: 'nếu {v}', tara: 'nếu / khi {v} (xong)',
  ukemi: 'bị / được {v}', shieki: 'bắt / cho (ai) {v}', shiekiukemi: 'bị bắt {v}', meirei: '{v} đi! (ra lệnh mạnh)', kinshi: 'cấm {v}!',
};
// Nghĩa ngắn của một từ: phần trước dấu phẩy / chấm phẩy / ngoặc
export const shortVi = vi => String(vi || '').split(/[,;(（]/)[0].trim();
export const formVi = (form, vi) => (FORM_VI[form] || '{v}').replaceAll('{v}', shortVi(vi));

const ROW = {
  i: { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' },
  a: { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' },
  e: { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' },
  o: { う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' },
};
const TE = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
const toTa = te => te.replace(/て$/, 'た').replace(/で$/, 'だ');

// Đuôi theo nhóm. Nhóm 1 tính từ âm cuối u; nhóm 2 nối vào thân (bỏ る).
const GODAN = {
  masu: u => ROW.i[u] + 'ます', masen: u => ROW.i[u] + 'ません', mashita: u => ROW.i[u] + 'ました', tai: u => ROW.i[u] + 'たい',
  te: u => TE[u], ta: u => toTa(TE[u]), tara: u => toTa(TE[u]) + 'ら', teiru: u => TE[u] + 'いる',
  nai: u => ROW.a[u] + 'ない', nakatta: u => ROW.a[u] + 'なかった',
  kano: u => ROW.e[u] + 'る', ikou: u => ROW.o[u] + 'う', ba: u => ROW.e[u] + 'ば',
  ukemi: u => ROW.a[u] + 'れる', shieki: u => ROW.a[u] + 'せる', shiekiukemi: u => ROW.a[u] + (u === 'す' ? 'せられる' : 'される'),
  meirei: u => ROW.e[u], kinshi: u => u + 'な',
};
const ICHI = {
  masu: 'ます', masen: 'ません', mashita: 'ました', tai: 'たい', te: 'て', ta: 'た', tara: 'たら', teiru: 'ている',
  nai: 'ない', nakatta: 'なかった', kano: 'られる', ikou: 'よう', ba: 'れば', ukemi: 'られる', shieki: 'させる', shiekiukemi: 'させられる',
  meirei: 'ろ', kinshi: 'るな',
};
const SURU = {
  masu: 'します', masen: 'しません', mashita: 'しました', tai: 'したい', te: 'して', ta: 'した', tara: 'したら', teiru: 'している',
  nai: 'しない', nakatta: 'しなかった', kano: 'できる', ikou: 'しよう', ba: 'すれば', ukemi: 'される', shieki: 'させる', shiekiukemi: 'させられる',
  meirei: 'しろ', kinshi: 'するな',
};
// 来る: cách đọc chữ 来 đổi theo thể
const KURU_R = { masu: 'き', masen: 'き', mashita: 'き', tai: 'き', te: 'き', ta: 'き', tara: 'き', teiru: 'き', nai: 'こ', nakatta: 'こ', kano: 'こ', ikou: 'こ', ba: 'く', ukemi: 'こ', shieki: 'こ', shiekiukemi: 'こ', meirei: 'こ', kinshi: 'く' };
const KURU_E = { masu: 'ます', masen: 'ません', mashita: 'ました', tai: 'たい', te: 'て', ta: 'た', tara: 'たら', teiru: 'ている', nai: 'ない', nakatta: 'なかった', kano: 'られる', ikou: 'よう', ba: 'れば', ukemi: 'られる', shieki: 'させる', shiekiukemi: 'させられる', meirei: 'い', kinshi: 'るな' };

// Động từ không có (hoặc không dùng) một số thể
const NO_FORMS = {
  ある: ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'meirei', 'kinshi', 'tai', 'ikou', 'teiru'],
  わかる: ['kano', 'ukemi', 'shiekiukemi', 'meirei', 'kinshi'],
  できる: ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'meirei', 'kinshi'],
  いる: [], // いる (có, ở) chia bình thường
};
// Động từ kính ngữ: thân thể ます là い (いらっしゃいます), mệnh lệnh là い (いらっしゃい)
const HONORIFIC = ['いらっしゃる', 'くださる', 'なさる', 'おっしゃる', 'ござる'];

// Động từ nào chia được: nhóm 1/2/3 và danh từ + する; bỏ từ Kansai.
export function verbInfo(it) {
  if (!it || it.reg === 'kansai') return null;
  const kana = it.kana;
  if (it.pos === 'n-suru') {
    const mark = it.kanji ? (it.kf || `${it.kanji}[${it.kana}]`) : it.kana;
    return { group: 'suru', base: mark, baseKana: kana, dict: mark + 'する', dictKana: kana + 'する', na: [] };
  }
  if (it.pos === 'v3') {
    if (kana === 'する') return { group: 'suru', base: '', baseKana: '', dict: 'する', dictKana: 'する', na: [] };
    if (kana === 'くる') return { group: 'kuru', dict: it.kf || (it.kanji ? '来[く]る' : 'くる'), dictKana: 'くる', kanji: !!it.kanji, na: [] };
    if (/する$/.test(kana)) { // 勉強する ghi dạng v3
      const base = (it.kf || it.kanji || kana).replace(/する$/, '');
      return { group: 'suru', base, baseKana: kana.replace(/する$/, ''), dict: base + 'する', dictKana: kana, na: [] };
    }
    return null;
  }
  if (it.pos !== 'v5' && it.pos !== 'v1') return null;
  const dictMark = it.kf || (it.kanji && it.kanji !== it.kana ? null : kana);
  if (!dictMark) return null;
  const u = kana.slice(-1);
  if (it.pos === 'v5' && !ROW.i[u]) return null;
  if (it.pos === 'v1' && u !== 'る') return null;
  if (!dictMark.endsWith(u)) return null;
  const na = HONORIFIC.includes(kana) ? ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'tai', 'ikou', 'teiru'] : it.pos === 'v5' && kana === 'いる' ? [] : NO_FORMS[kana] || [];
  return {
    group: it.pos, u, stem: dictMark.slice(0, -1), stemKana: kana.slice(0, -1), dict: dictMark, dictKana: kana, na,
    iku: it.pos === 'v5' && /(い|ゆ)く$/.test(kana) && kana.length <= 3, aru: it.pos === 'v5' && kana === 'ある', hon: HONORIFIC.includes(kana),
  };
}
export const hasForm = (v, form) => !!v && !(v.na || []).includes(form);

export function conjugate(it, form) {
  const v = typeof it.group === 'string' ? it : verbInfo(it);
  if (!v || !FORMS[form] || !hasForm(v, form)) return null;
  if (v.group === 'suru') return { mark: v.base + SURU[form], kana: v.baseKana + SURU[form] };
  if (v.group === 'kuru') {
    const r = KURU_R[form], e = KURU_E[form];
    return v.kanji ? { mark: `来[${r}]` + e, kana: r + e } : { mark: r + e, kana: r + e };
  }
  if (v.group === 'v1') return { mark: v.stem + ICHI[form], kana: v.stemKana + ICHI[form] };
  let end = GODAN[form](v.u);
  if (v.iku && ['te', 'ta', 'tara', 'teiru'].includes(form)) end = { te: 'って', ta: 'った', tara: 'ったら', teiru: 'っている' }[form];
  if (v.aru && form === 'nai') return { mark: 'ない', kana: 'ない' };
  if (v.aru && form === 'nakatta') return { mark: 'なかった', kana: 'なかった' };
  if (v.hon && ['masu', 'masen', 'mashita', 'tai'].includes(form)) end = end.replace(/^り/, 'い');
  if (v.hon && form === 'meirei') end = 'い';
  return { mark: v.stem + end, kana: v.stemKana + end };
}

// Thân để ghép mẫu câu: 'stem' = thân thể ます (洗い), 'nakereba' = 洗わなければ
export function conjPart(it, form) {
  if (form === 'dict') { const v = typeof it.group === 'string' ? it : verbInfo(it); return v ? { mark: v.dict, kana: v.dictKana } : null; }
  if (form === 'stem') { const m = conjugate(it, 'masu'); return m && { mark: m.mark.replace(/ます$/, ''), kana: m.kana.replace(/ます$/, '') }; }
  if (form === 'nakereba') { const m = conjugate(it, 'nai'); return m && { mark: m.mark.replace(/い$/, 'ければ'), kana: m.kana.replace(/い$/, 'ければ') }; }
  if (form === 'shiekite') { const m = conjugate(it, 'shieki'); return m && { mark: m.mark.replace(/る$/, 'て'), kana: m.kana.replace(/る$/, 'て') }; }
  // thể phái sinh + đuôi lịch sự: 'kano.masu' → 洗えます, 'shieki.mashita' → 洗わせました
  const [f, tail] = form.split('.');
  const m = conjugate(it, f);
  if (!m) return null;
  if (!tail) return m;
  const T = { masu: 'ます', mashita: 'ました', masen: 'ません', te: 'て', ta: 'た' }[tail];
  return { mark: m.mark.replace(/る$/, T), kana: m.kana.replace(/る$/, T) };
}

// Đáp án nhiễu: lỗi chia hay gặp trước, rồi tới các thể khác của cùng động từ
export function wrongForms(it, form) {
  const v = verbInfo(it);
  if (!v) return [];
  const right = conjugate(v, form)?.mark;
  const out = [];
  const add = m => { if (m && m !== right && !out.includes(m)) out.push(m); };
  if (v.group === 'v5') {
    const i = v.stem + ROW.i[v.u], a = v.stem + ROW.a[v.u], e = v.stem + ROW.e[v.u];
    const wrongTe = ['いて', 'って', 'んで', 'して'].map(x => v.stem + x).concat(i + 'て');
    if (form === 'te') wrongTe.forEach(add);
    if (form === 'teiru') wrongTe.forEach(x => add(x + 'いる'));
    if (form === 'ta' || form === 'tara') { for (const x of ['いた', 'った', 'んだ', 'した']) add(v.stem + x + (form === 'tara' ? 'ら' : '')); add(i + 'た' + (form === 'tara' ? 'ら' : '')); }
    if (form === 'nai') { add(i + 'ない'); if (v.u === 'う') add(v.stem + 'あない'); add(e + 'ない'); }
    if (form === 'nakatta') { add(i + 'なかった'); if (v.u === 'う') add(v.stem + 'あなかった'); }
    if (form === 'masu' || form === 'masen' || form === 'mashita') { const t = { masu: 'ます', masen: 'ません', mashita: 'ました' }[form]; add(a + t); add(v.dict + t); }
    if (form === 'tai') { add(a + 'たい'); add(v.dict + 'たい'); }
    if (form === 'kano') { add(a + 'れる'); add(i + 'られる'); }
    if (form === 'ikou') { add(v.stem + ROW.o[v.u] + 'よう'); add(v.dict + 'よう'); }
    if (form === 'ba') { add(v.dict + 'れば'); add(a + 'ば'); }
    if (form === 'ukemi') { add(e + 'る'); add(a + 'せる'); }
    if (form === 'shieki') { add(a + 'れる'); add(a + 'させる'); }
    if (form === 'shiekiukemi') { add(a + 'させられる'); add(e + 'させられる'); }
    if (form === 'meirei') { add(i); add(e + 'ろ'); }
    if (form === 'kinshi') { add(i + 'な'); add(a + 'ないな'); }
  } else if (v.group === 'v1') {
    const map = { te: 'って', ta: 'った', tara: 'ったら', teiru: 'っている', nai: 'らない', nakatta: 'らなかった', masu: 'ります', masen: 'りません', mashita: 'りました', tai: 'りたい', kano: 'れる', ikou: 'ろう', ba: 'れれば', ukemi: 'させる', shieki: 'らせる', shiekiukemi: 'らされる', meirei: 'れ', kinshi: 'ないな' };
    add(v.stem + map[form]);
    if (form === 'kano' || form === 'ukemi') add(v.stem + 'させる');
  } else if (v.group === 'suru') {
    const map = { te: ['すって', 'しって'], ta: ['すった'], tara: ['すったら'], teiru: ['すっている'], nai: ['すらない', 'さない'], nakatta: ['さなかった'], masu: ['すります'], masen: ['すりません'], mashita: ['すりました'], tai: ['すりたい'], kano: ['される', 'すれる'], ikou: ['すろう'], ba: ['しれば'], ukemi: ['させる'], shieki: ['される'], shiekiukemi: ['されられる'], meirei: ['せろ', 'すれ'], kinshi: ['しな'] };
    for (const x of map[form] || []) add(v.base + x);
  } else if (v.group === 'kuru') {
    const k = r => (v.kanji ? `来[${r}]` : r);
    const map = { te: [k('く') + 'て', k('こ') + 'て'], ta: [k('く') + 'た'], tara: [k('く') + 'たら'], teiru: [k('く') + 'ている'], nai: [k('き') + 'ない', k('く') + 'らない'], nakatta: [k('き') + 'なかった'], masu: [k('こ') + 'ます', k('く') + 'ます'], masen: [k('こ') + 'ません'], mashita: [k('こ') + 'ました'], tai: [k('こ') + 'たい'], kano: [k('き') + 'られる'], ikou: [k('き') + 'よう'], ba: [k('こ') + 'れば'], ukemi: [k('き') + 'られる'], shieki: [k('き') + 'させる'], shiekiukemi: [k('き') + 'させられる'], meirei: [k('き') + 'い', k('こ') + 'ろ'], kinshi: [k('こ') + 'るな'] };
    for (const m of map[form] || []) add(m);
  }
  for (const f of Object.keys(FORMS)) if (f !== form) add(conjugate(v, f)?.mark);
  return out;
}

// Giải thích luật chia (hiện sau khi trả lời)
export function ruleText(it, form) {
  const v = verbInfo(it);
  if (!v) return '';
  const F = FORMS[form];
  if (v.group === 'suru') return `Nhóm 3 (する): する → ${SURU[form]}.`;
  if (v.group === 'kuru') return `Nhóm 3 (来[く]る): ${F} là ${v.kanji ? `来[${KURU_R[form]}]` : KURU_R[form]}${KURU_E[form]} — cách đọc của chữ này đổi theo từng thể.`;
  if (v.group === 'v1') return `Nhóm 2 (đuôi る): bỏ る rồi thêm ${ICHI[form]}.`;
  const u = v.u;
  if (v.aru && (form === 'nai' || form === 'nakatta')) return 'Ngoại lệ: ある → ない (không nói あらない).';
  const rules = {
    masu: `đổi đuôi ${u} sang hàng い (${ROW.i[u]}) rồi thêm ます`,
    masen: `đổi đuôi ${u} sang hàng い (${ROW.i[u]}) rồi thêm ません`,
    mashita: `đổi đuôi ${u} sang hàng い (${ROW.i[u]}) rồi thêm ました`,
    tai: `đổi đuôi ${u} sang hàng い (${ROW.i[u]}) rồi thêm たい`,
    te: v.iku ? 'riêng 行[い]く → 行[い]って (ngoại lệ)' : `đuôi ${u} → ${TE[u]}`,
    teiru: v.iku ? 'riêng 行[い]く → 行[い]っている (ngoại lệ)' : `thể て (đuôi ${u} → ${TE[u]}) rồi thêm いる`,
    ta: v.iku ? 'riêng 行[い]く → 行[い]った (ngoại lệ)' : `đuôi ${u} → ${toTa(TE[u])}`,
    tara: v.iku ? 'riêng 行[い]く → 行[い]ったら (ngoại lệ)' : `thể た (đuôi ${u} → ${toTa(TE[u])}) rồi thêm ら`,
    nai: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm ない${u === 'う' ? ' — đuôi う đổi thành わ, không phải あ' : ''}`,
    nakatta: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm なかった${u === 'う' ? ' — đuôi う đổi thành わ' : ''}`,
    kano: `đổi đuôi ${u} sang hàng え (${ROW.e[u]}) rồi thêm る`,
    ikou: `đổi đuôi ${u} sang hàng お (${ROW.o[u]}) rồi thêm う`,
    ba: `đổi đuôi ${u} sang hàng え (${ROW.e[u]}) rồi thêm ば`,
    ukemi: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm れる`,
    shieki: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm せる`,
    shiekiukemi: u === 'す' ? 'đuôi す: đổi thành さ rồi thêm せられる (không rút gọn)' : `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm される (dạng đầy đủ ${ROW.a[u]}せられる cũng đúng)`,
    meirei: `đổi đuôi ${u} sang hàng え (${ROW.e[u]})`,
    kinshi: 'giữ nguyên thể từ điển rồi thêm な',
  };
  return `Nhóm 1: ${rules[form]}.`;
}

export const GROUP_VI = { v5: 'Nhóm 1', v1: 'Nhóm 2', suru: 'Nhóm 3', kuru: 'Nhóm 3' };
