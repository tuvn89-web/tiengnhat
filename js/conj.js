// Máy chia động từ — tự chia mọi động từ trong kho, giữ furigana.
// Nhóm 1 (v5), nhóm 2 (v1), nhóm 3 (する, 来る, danh từ + する).

export const FORMS = {
  masu: 'thể ます', te: 'thể て', ta: 'thể た', nai: 'thể ない',
  kano: 'thể khả năng', ikou: 'thể ý chí', ba: 'thể điều kiện ば', ukemi: 'thể bị động', shieki: 'thể sai khiến',
};
export const FORM_LEVEL = { masu: 'N5', te: 'N5', ta: 'N5', nai: 'N5', kano: 'N4', ikou: 'N4', ba: 'N4', ukemi: 'N4', shieki: 'N4' };

const ROW = {
  i: { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' },
  a: { う: 'わ', く: 'か', ぐ: 'が', す: 'さ', つ: 'た', ぬ: 'な', ぶ: 'ば', む: 'ま', る: 'ら' },
  e: { う: 'え', く: 'け', ぐ: 'げ', す: 'せ', つ: 'て', ぬ: 'ね', ぶ: 'べ', む: 'め', る: 'れ' },
  o: { う: 'お', く: 'こ', ぐ: 'ご', す: 'そ', つ: 'と', ぬ: 'の', ぶ: 'ぼ', む: 'も', る: 'ろ' },
};
const TE = { う: 'って', つ: 'って', る: 'って', む: 'んで', ぶ: 'んで', ぬ: 'んで', く: 'いて', ぐ: 'いで', す: 'して' };
const toTa = te => te.replace(/て$/, 'た').replace(/で$/, 'だ');

const GODAN = {
  masu: u => ROW.i[u] + 'ます', te: u => TE[u], ta: u => toTa(TE[u]), nai: u => ROW.a[u] + 'ない',
  kano: u => ROW.e[u] + 'る', ikou: u => ROW.o[u] + 'う', ba: u => ROW.e[u] + 'ば',
  ukemi: u => ROW.a[u] + 'れる', shieki: u => ROW.a[u] + 'せる',
};
const ICHI = { masu: 'ます', te: 'て', ta: 'た', nai: 'ない', kano: 'られる', ikou: 'よう', ba: 'れば', ukemi: 'られる', shieki: 'させる' };
const SURU = { masu: 'します', te: 'して', ta: 'した', nai: 'しない', kano: 'できる', ikou: 'しよう', ba: 'すれば', ukemi: 'される', shieki: 'させる' };
const KURU_R = { masu: 'き', te: 'き', ta: 'き', nai: 'こ', kano: 'こ', ikou: 'こ', ba: 'く', ukemi: 'こ', shieki: 'こ' };
const KURU_E = { masu: 'ます', te: 'て', ta: 'た', nai: 'ない', kano: 'られる', ikou: 'よう', ba: 'れば', ukemi: 'られる', shieki: 'させる' };

// Động từ nào chia được: nhóm 1/2/3 và danh từ + する; bỏ từ Kansai.
export function verbInfo(it) {
  if (it.reg === 'kansai') return null;
  const kana = it.kana;
  if (it.pos === 'n-suru') {
    const mark = it.kanji ? (it.kf || `${it.kanji}[${it.kana}]`) : it.kana;
    return { group: 'suru', base: mark, baseKana: kana, dict: mark + 'する', dictKana: kana + 'する' };
  }
  if (it.pos === 'v3') {
    if (kana === 'する') return { group: 'suru', base: '', baseKana: '', dict: 'する', dictKana: 'する' };
    if (kana === 'くる') return { group: 'kuru', dict: it.kf || (it.kanji ? '来[く]る' : 'くる'), dictKana: 'くる', kanji: !!it.kanji };
    return null;
  }
  if (it.pos !== 'v5' && it.pos !== 'v1') return null;
  const dictMark = it.kf || (it.kanji && it.kanji !== it.kana ? null : kana);
  if (!dictMark) return null;
  const u = kana.slice(-1);
  if (it.pos === 'v5' && !ROW.i[u]) return null;
  if (it.pos === 'v1' && u !== 'る') return null;
  if (!dictMark.endsWith(u)) return null;
  return { group: it.pos, u, stem: dictMark.slice(0, -1), stemKana: kana.slice(0, -1), dict: dictMark, dictKana: kana, iku: it.pos === 'v5' && /(い|ゆ)く$/.test(kana) && kana.length <= 3 };
}

export function conjugate(it, form) {
  const v = typeof it.group === 'string' ? it : verbInfo(it);
  if (!v) return null;
  if (v.group === 'suru') return { mark: v.base + SURU[form], kana: v.baseKana + SURU[form] };
  if (v.group === 'kuru') return v.kanji
    ? { mark: `来[${KURU_R[form]}]` + KURU_E[form], kana: KURU_R[form] + KURU_E[form] }
    : { mark: KURU_R[form] + KURU_E[form], kana: KURU_R[form] + KURU_E[form] };
  if (v.group === 'v1') return { mark: v.stem + ICHI[form], kana: v.stemKana + ICHI[form] };
  let end = GODAN[form](v.u);
  if (v.iku && (form === 'te' || form === 'ta')) end = form === 'te' ? 'って' : 'った';
  return { mark: v.stem + end, kana: v.stemKana + end };
}

// Đáp án nhiễu: lỗi chia hay gặp trước, rồi tới các thể khác của cùng động từ
export function wrongForms(it, form) {
  const v = verbInfo(it);
  if (!v) return [];
  const right = conjugate(v, form).mark;
  const out = [];
  const add = m => { if (m && m !== right && !out.includes(m)) out.push(m); };
  if (v.group === 'v5') {
    const i = v.stem + ROW.i[v.u], a = v.stem + ROW.a[v.u];
    if (form === 'te') { for (const e of ['いて', 'って', 'んで', 'して']) add(v.stem + e); add(i + 'て'); }
    if (form === 'ta') { for (const e of ['いた', 'った', 'んだ', 'した']) add(v.stem + e); add(i + 'た'); }
    if (form === 'nai') { add(i + 'ない'); if (v.u === 'う') add(v.stem + 'あない'); add(v.stem + ROW.e[v.u] + 'ない'); }
    if (form === 'masu') { add(a + 'ます'); add(v.dict + 'ます'); }
    if (form === 'kano') { add(a + 'れる'); add(v.stem + ROW.i[v.u] + 'られる'); }
    if (form === 'ikou') { add(v.stem + ROW.o[v.u] + 'よう'); add(v.dict + 'よう'); }
    if (form === 'ba') { add(v.dict + 'れば'); add(a + 'ば'); }
    if (form === 'ukemi') { add(v.stem + ROW.e[v.u] + 'る'); add(a + 'せる'); }
    if (form === 'shieki') { add(a + 'れる'); add(a + 'させる'); }
  } else if (v.group === 'v1') {
    const map = { te: 'って', ta: 'った', nai: 'らない', masu: 'ります', kano: 'れる', ikou: 'ろう', ba: 'れれば', ukemi: 'させる', shieki: 'らせる' };
    add(v.stem + map[form]);
    if (form === 'kano' || form === 'ukemi') add(v.stem + 'させる');
  } else if (v.group === 'suru') {
    const map = { te: ['すって', 'しって'], ta: ['すった'], nai: ['すらない', 'さない'], masu: ['すります'], kano: ['される', 'すれる'], ikou: ['すろう'], ba: ['しれば'], ukemi: ['させる'], shieki: ['される'] };
    for (const e of map[form] || []) add(v.base + e);
  } else if (v.group === 'kuru') {
    const k = r => (v.kanji ? `来[${r}]` : r);
    const map = { te: [k('く') + 'て', k('こ') + 'て'], ta: [k('く') + 'た'], nai: [k('き') + 'ない', k('く') + 'らない'], masu: [k('こ') + 'ます', k('く') + 'ます'], kano: [k('き') + 'られる'], ikou: [k('き') + 'よう'], ba: [k('こ') + 'れば'], ukemi: [k('き') + 'られる'], shieki: [k('き') + 'させる'] };
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
  if (v.group === 'v1') return `Nhóm 2 (đuôi る, bỏ る): bỏ る rồi thêm ${ICHI[form]}.`;
  const u = v.u;
  const rules = {
    masu: `đổi đuôi ${u} sang hàng い (${ROW.i[u]}) rồi thêm ます`,
    te: v.iku ? 'riêng 行[い]く → 行[い]って (ngoại lệ)' : `đuôi ${u} → ${TE[u]}`,
    ta: v.iku ? 'riêng 行[い]く → 行[い]った (ngoại lệ)' : `đuôi ${u} → ${toTa(TE[u])}`,
    nai: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm ない${u === 'う' ? ' — đuôi う đổi thành わ, không phải あ' : ''}`,
    kano: `đổi đuôi ${u} sang hàng え (${ROW.e[u]}) rồi thêm る`,
    ikou: `đổi đuôi ${u} sang hàng お (${ROW.o[u]}) rồi thêm う`,
    ba: `đổi đuôi ${u} sang hàng え (${ROW.e[u]}) rồi thêm ば`,
    ukemi: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm れる`,
    shieki: `đổi đuôi ${u} sang hàng あ (${ROW.a[u]}) rồi thêm せる`,
  };
  return `Nhóm 1: ${rules[form]}.`;
}
