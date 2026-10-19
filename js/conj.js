// Máy chia động từ — tự chia mọi động từ trong kho, giữ furigana.
// Nhóm 1 (v5), nhóm 2 (v1), nhóm 3 (する, 来る, danh từ + する).

// Thứ tự = thứ tự hiện trong bảng chia của thẻ từ
export const FORMS = {
  masu: 'thể ます', masen: 'phủ định lịch sự', mashita: 'quá khứ lịch sự',
  te: 'thể て', ta: 'thể た', nai: 'thể ない', nakatta: 'quá khứ phủ định', tai: 'muốn (たい)', teiru: 'đang (ている)',
  kano: 'thể khả năng', ikou: 'thể ý chí', ba: 'điều kiện ば', tara: 'điều kiện たら',
  ukemi: 'thể bị động', shieki: 'thể sai khiến', shiekiukemi: 'sai khiến bị động', meirei: 'thể mệnh lệnh', kinshi: 'cấm (〜な)',
  // thể mở rộng (bản v11): ghép từ các thể trên
  sou: 'trông như sắp (〜そう)', sugiru: 'quá (〜すぎる)', yasui: 'dễ (〜やすい)', nikui: 'khó (〜にくい)', nagara: 'vừa… vừa (〜ながら)',
  kata: 'cách làm (〜方)', tari: 'liệt kê (〜たり)', zu: 'không… mà (〜ずに)', teshimau: 'lỡ / xong hẳn (〜てしまう)', chau: '〜ちゃう (nói tắt てしまう)',
  teoku: 'làm sẵn (〜ておく)', toku: '〜とく (nói tắt ておく)', teru: '〜てる (nói tắt ている)', nakereba: 'nếu không (〜なければ)',
  nakya: '〜なきゃ (nói tắt: phải)', tewa: 'không được (〜てはいけない)', chadame: '〜ちゃだめ (nói tắt: không được)', sasete: 'xin cho tôi (〜させてください)',
  shiekiS: 'sai khiến rút gọn (〜す, khẩu ngữ)',
};
export const FORM_LEVEL = {
  masu: 'N5', masen: 'N5', mashita: 'N5', te: 'N5', ta: 'N5', nai: 'N5', nakatta: 'N5', tai: 'N5', teiru: 'N5',
  kano: 'N4', ikou: 'N4', ba: 'N4', tara: 'N4', ukemi: 'N4', shieki: 'N4', shiekiukemi: 'N3', meirei: 'N4', kinshi: 'N4',
  sou: 'N4', sugiru: 'N4', yasui: 'N4', nikui: 'N4', nagara: 'N4', kata: 'N4', tari: 'N5', zu: 'N4', teshimau: 'N4', chau: 'N4',
  teoku: 'N4', toku: 'N3', teru: 'N3', nakereba: 'N5', nakya: 'N3', tewa: 'N5', chadame: 'N3', sasete: 'N4', shiekiS: 'N3',
};
// Thể gốc (18 thể đầu) và thể mở rộng
export const BASE_FORMS = ['masu', 'masen', 'mashita', 'te', 'ta', 'nai', 'nakatta', 'tai', 'teiru', 'kano', 'ikou', 'ba', 'tara', 'ukemi', 'shieki', 'shiekiukemi', 'meirei', 'kinshi'];
export const EXT_FORMS = Object.keys(FORMS).filter(f => !BASE_FORMS.includes(f));
// Thể khẩu ngữ ↔ thể chuẩn tương ứng
export const CASUAL = { chau: 'teshimau', toku: 'teoku', teru: 'teiru', nakya: 'nakereba', chadame: 'tewa' };
export const N5_FORMS = Object.keys(FORMS).filter(f => FORM_LEVEL[f] === 'N5');
// Thể "phái sinh" — kết quả là động từ nhóm 2 mới (đuôi る), chia tiếp được: 切らせる → 切らせました
export const DERIVED = ['kano', 'ukemi', 'shieki', 'shiekiukemi'];

// Nghĩa tiếng Việt của từng thể, {v} = nghĩa động từ
const FORM_VI = {
  masu: '{v} (lịch sự)', masen: 'không {v}', mashita: 'đã {v}', te: '{v} rồi… (nối câu; 〜てください = hãy {v})',
  ta: 'đã {v} (thể thường)', nai: 'không {v} (thể thường)', nakatta: 'đã không {v}', tai: 'muốn {v}', teiru: 'đang {v}',
  kano: 'có thể {v}, {v} được', ikou: '{v} thôi; định {v}', ba: 'nếu {v}', tara: 'nếu / khi {v} (xong)',
  ukemi: 'bị / được {v}', shieki: 'bắt / cho (ai) {v}', shiekiukemi: 'bị bắt {v}', meirei: '{v} đi! (ra lệnh mạnh)', kinshi: 'cấm {v}!',
  sou: 'trông như sắp {v}', sugiru: '{v} quá mức', yasui: 'dễ {v}', nikui: 'khó {v}', nagara: 'vừa {v} vừa…', kata: 'cách {v}',
  tari: '{v} (nào là…, lúc thì…)', zu: 'không {v} mà…', teshimau: 'lỡ {v}; {v} xong hẳn', chau: 'lỡ {v} (nói tắt)', teoku: '{v} sẵn',
  toku: '{v} sẵn (nói tắt)', teru: 'đang {v} (nói tắt)', nakereba: 'nếu không {v}', nakya: 'phải {v} (nói tắt)', tewa: 'không được {v}',
  chadame: 'không được {v} (nói tắt)', sasete: 'xin cho tôi {v}', shiekiS: 'bắt (ai) {v} (khẩu ngữ)',
};
// Nghĩa ngắn của một từ: đoạn đầu (trước dấu phẩy / chấm phẩy nằm ngoài ngoặc), bỏ phần trong ngoặc — "(trời) mưa" → "mưa"
const PAREN = /\s*[（(][^()（）]*[)）]\s*/g;
function segs(vi) {
  const s = String(vi || ''), out = [];
  let depth = 0, from = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(' || c === '（') depth++;
    else if (c === ')' || c === '）') depth = Math.max(0, depth - 1);
    else if (!depth && (c === ',' || c === ';' || c === '；')) { out.push(s.slice(from, i)); from = i + 1; }
  }
  out.push(s.slice(from));
  // bỏ phần trong ngoặc và phần ghi chú sau dấu gạch dài ("thật — khẩu ngữ giới trẻ" → "thật")
  return out.map(x => x.split(/\s+—\s+/)[0].replace(PAREN, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean);
}
export const shortVi = vi => segs(vi)[0] || String(vi || '').trim();
// v33: nghĩa làm động từ (để ghép nghĩa các thể: có thể …, đã …, bị …).
// Danh từ + する: ưu tiên đoạn "việc / sự …" (料理: "món ăn; việc nấu ăn" → "nấu ăn"), bỏ chữ "sự / việc / cuộc" ở đầu.
const NOUNISH = /^(sự|việc|cuộc)\s+/i;
export function verbVi(it) {
  if (!it || typeof it !== 'object') return shortVi(it);
  const ss = segs(it.vi);
  if (it.pos === 'n-suru') {
    const act = ss.find(x => NOUNISH.test(x));
    return ((NOUNISH.test(ss[0] || '') ? ss[0] : act) || ss[0] || '').replace(NOUNISH, '');
  }
  return ss[0] || '';
}
// nghĩa gốc đã có chữ "bị / được" (刺さる "bị đâm", けが "bị thương") → thể bị động ghi "bị đâm (bị động)", không thành "bị / được bị đâm"
export const formVi = (form, x) => {
  const v = verbVi(x);
  if (form === 'ukemi' && /^(bị|được)\s/.test(v)) return v + ' (bị động)';
  return (FORM_VI[form] || '{v}').replaceAll('{v}', v);
};

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
  ある: ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'meirei', 'kinshi', 'tai', 'ikou', 'teiru', 'yasui', 'nikui', 'kata', 'zu', 'teshimau', 'chau', 'teoku', 'toku', 'teru', 'tewa', 'chadame', 'shiekiS'],
  わかる: ['kano', 'ukemi', 'shiekiukemi', 'meirei', 'kinshi', 'teoku', 'toku', 'kata', 'sasete', 'shiekiS'],
  できる: ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'meirei', 'kinshi', 'yasui', 'nikui', 'kata', 'teoku', 'toku', 'sasete', 'shiekiS'],
  いる: [], // いる (có, ở) chia bình thường
};
// Động từ kính ngữ: thân thể ます là い (いらっしゃいます), mệnh lệnh là い (いらっしゃい)
const HONORIFIC = ['いらっしゃる', 'くださる', 'なさる', 'おっしゃる', 'ござる'];
const HON_NO = ['sugiru', 'yasui', 'nikui', 'kata', 'zu', 'chau', 'teoku', 'toku', 'teru', 'nakya', 'tewa', 'chadame', 'sasete', 'shiekiS'];

// Động từ nào chia được: nhóm 1/2/3 và danh từ + する; bỏ từ Kansai.
export function verbInfo(it) {
  if (!it || it.reg === 'kansai') return null;
  const kana = it.kana;
  if (it.pos === 'n-suru') {
    const mark = it.kanji ? (it.kf || `${it.kanji}[${it.kana}]`) : it.kana;
    return { group: 'suru', base: mark, baseKana: kana, dict: mark + 'する', dictKana: kana + 'する', na: ['kata', 'shiekiS'] };
  }
  if (it.pos === 'v3') {
    if (kana === 'する') return { group: 'suru', base: '', baseKana: '', dict: 'する', dictKana: 'する', na: ['kata', 'shiekiS'] };
    if (kana === 'くる') return { group: 'kuru', dict: it.kf || (it.kanji ? '来[く]る' : 'くる'), dictKana: 'くる', kanji: !!it.kanji, na: ['shiekiS'] };
    if (/する$/.test(kana)) { // 勉強する ghi dạng v3
      const base = (it.kf || it.kanji || kana).replace(/する$/, '');
      return { group: 'suru', base, baseKana: kana.replace(/する$/, ''), dict: base + 'する', dictKana: kana, na: ['kata', 'shiekiS'] };
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
  const na = HONORIFIC.includes(kana) ? ['kano', 'ukemi', 'shieki', 'shiekiukemi', 'tai', 'ikou', 'teiru', ...HON_NO] : it.pos === 'v5' && kana === 'いる' ? [] : NO_FORMS[kana] || [];
  return {
    group: it.pos, u, stem: dictMark.slice(0, -1), stemKana: kana.slice(0, -1), dict: dictMark, dictKana: kana, na,
    iku: it.pos === 'v5' && /(い|ゆ)く$/.test(kana) && kana.length <= 3, aru: it.pos === 'v5' && kana === 'ある', hon: HONORIFIC.includes(kana),
  };
}
export const hasForm = (v, form) => !!v && !(v.na || []).includes(form);

// Thể mở rộng: lấy một thể gốc rồi đổi đuôi
const swap = (re, to) => m => (re.test(m) ? m.replace(re, to) : null);
const TE_SWAP = (t, d) => m => (/て$/.test(m) ? m.replace(/て$/, t) : /で$/.test(m) ? m.replace(/で$/, d) : null);
const EXT = {
  sou: ['stem', m => m + 'そう', 'thân thể ます + そう'],
  sugiru: ['stem', m => m + 'すぎる', 'thân thể ます + すぎる'],
  yasui: ['stem', m => m + 'やすい', 'thân thể ます + やすい'],
  nikui: ['stem', m => m + 'にくい', 'thân thể ます + にくい'],
  nagara: ['stem', m => m + 'ながら', 'thân thể ます + ながら'],
  kata: ['stem', m => m + '方[かた]', 'thân thể ます + 方[かた]', 'かた'],
  tari: ['ta', m => m + 'り', 'thể た + り'],
  zu: ['nai', swap(/ない$/, 'ずに'), 'thể ない bỏ ない + ずに (する → せずに)'],
  teshimau: ['te', m => m + 'しまう', 'thể て + しまう'],
  chau: ['te', TE_SWAP('ちゃう', 'じゃう'), 'thể て: て → ちゃう, で → じゃう'],
  teoku: ['te', m => m + 'おく', 'thể て + おく'],
  toku: ['te', TE_SWAP('とく', 'どく'), 'thể て: て → とく, で → どく'],
  teru: ['te', m => m + 'る', 'thể て + る (bỏ い của ている)'],
  nakereba: ['nai', swap(/い$/, 'ければ'), 'thể ない: い → ければ'],
  nakya: ['nai', swap(/ない$/, 'なきゃ'), 'thể ない: ない → なきゃ'],
  tewa: ['te', m => m + 'はいけない', 'thể て + はいけない'],
  chadame: ['te', TE_SWAP('ちゃだめ', 'じゃだめ'), 'thể て: て → ちゃだめ, で → じゃだめ'],
  sasete: ['shieki', swap(/る$/, 'てください'), 'thể sai khiến: る → てください'],
  shiekiS: ['shieki', swap(/せる$/, 'す'), 'thể sai khiến: せる → す (khẩu ngữ)'],
};
export const extRule = f => EXT[f]?.[2] || '';
function conjExt(v, form) {
  const [from, fn, , addKana] = EXT[form];
  let b = from === 'stem' ? conjugate(v, 'masu') : conjugate(v, from);
  if (!b) return null;
  if (from === 'stem') b = { mark: b.mark.replace(/ます$/, ''), kana: b.kana.replace(/ます$/, '') };
  if (form === 'zu' && v.group === 'suru') return { mark: v.base + 'せずに', kana: v.baseKana + 'せずに' };
  const mark = fn(b.mark), kana = addKana ? b.kana + addKana : fn(b.kana);
  return mark && kana ? { mark, kana } : null;
}

export function conjugate(it, form) {
  const v = typeof it.group === 'string' ? it : verbInfo(it);
  if (!v || !FORMS[form] || !hasForm(v, form)) return null;
  if (EXT[form]) return conjExt(v, form);
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
  const v = typeof it.group === 'string' ? it : verbInfo(it);
  if (!v) return [];
  const right = conjugate(v, form)?.mark;
  const out = [];
  const add = m => { if (m && m !== right && !out.includes(m)) out.push(m); };
  if (EXT[form]) {
    // lỗi hay gặp của thể gốc, rồi ghép đuôi như thể đúng
    const [from, fn] = EXT[form];
    const baseF = from === 'stem' ? 'masu' : from;
    for (const w of wrongForms(v, baseF).slice(0, 4)) {
      if (from === 'stem' && !/ます$/.test(w)) continue;
      const m = fn(from === 'stem' ? w.replace(/ます$/, '') : w);
      add(m);
    }
    // nhầm sang thể mở rộng khác cùng gốc (〜ておく / 〜てしまう…)
    for (const f of Object.keys(EXT)) if (f !== form && EXT[f][0] === from) add(conjugate(v, f)?.mark);
    return out;
  }
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
  if (EXT[form]) { const c = conjugate(v, form); return `${F}: ${EXT[form][2]}${c ? ` → ${c.mark}` : ''}.`; }
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
