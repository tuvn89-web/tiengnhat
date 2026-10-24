// Tim tạm ở bước "Từ mới" của bài học (v18).
// - Tim chỉ nằm trong bộ nhớ, gắn với MỘT bài: không lưu vào máy, không đồng bộ.
// - Giữ tim khi: mở thẻ từ / chữ Hán / bảng giải thích trong trang bài; vào "Luyện từ đã tim" rồi bấm ✕ về bài.
// - Mất tim khi: sang trang khác (router gọi heartRoute), bắt đầu bài luyện khác của bài, tải lại hay đóng app.
// Màn luyện: ghép 8 cặp Việt – Nhật hoặc trắc nghiệm (Việt → Nhật, Nhật → Việt, trộn); không có hồi kết, chỉ nút ✕ mới thoát.
// v67: trắc nghiệm và chuyển thể không tự sang câu sau — bấm Tiếp (trừ khi bật "Tự sang câu sau" trong Cài đặt).
// v65: thêm "Chuyển thể" (động từ, tính từ đã tim): 投げられる → "có thể ném, ném được"; "ném đi! (ra lệnh mạnh)" → 投げろ. Ghi điểm theo thể, không đổi lịch ôn của từ.
// v67: chọn từng thể muốn luyện — một danh sách gọn có 3 tab N5 / N4 / N3 (động từ và tính từ). v68: lựa chọn nhớ theo tài khoản (đồng bộ).
// Lịch ôn: câu đúng làm mới lịch ôn (từ mới / đến hạn: lên một hộp, mỗi chiều một lần mỗi lượt; còn lại: dời hạn từ hôm nay).
// Câu sai không làm tụt hộp.
// v69: Chuyển thể lấy từ nhiều nguồn (từ đã tim · từ đã học · đã đánh dấu ★ · hay sai), có lối vào riêng ở Luyện tập; "thuộc nhuần nhuyễn"
// từng dạng (cthe.js); ưu tiên chỗ yếu; Nghe → chọn nghĩa (có công tắc "Không nghe được"); 5–10 câu ví dụ sau mỗi câu (vidu.js);
// lượt 3 phút như Ôn nhanh, hết giờ có màn kết quả, "Luyện lại câu sai", "Thêm 3 phút".
// v70: câu ví dụ chỉ lấy câu có đúng dạng đang hỏi của chính từ đó (không lấy từ khác, không lấy thể / thì khác).
import { esc, icon, wordHTML, shuffle, beep, buzz, toast, rubyHTML, reading, plain, activeNow } from './util.js';
import { kvGet } from './db.js';
import { FORMS, FORM_LEVEL, BASE_FORMS, verbInfo, conjugate, formVi, wrongForms, ruleText, shortVi, verbVi } from './conj.js';
import { AFORMS, adjInfo, adjConj, adjVi, adjWrong } from './adj.js';
import { recForm } from './fstat.js';
import { D, setPrefs } from './data.js';
import { S } from './settings.js';
import { review, refreshDue, dirRec, status, isStar } from './srs.js';
import { crec, recCthe, isMastered, wrongRecs, masteredCount, MASTER, fmtDay } from './cthe.js';
import { sameMeaning } from './quiz.js';
import { beginSession, goBack } from './nav.js';
import { sayBtn, bindSay, wordDetailHTML } from './ui.js';
import { speak, ttsReady } from './tts.js';

let H = { lesson: null, ids: new Set() };
export const hearted = (lessonId, id) => H.lesson === lessonId && H.ids.has(id);
export const heartCount = lessonId => (H.lesson === lessonId ? H.ids.size : 0);
export function toggleHeart(lessonId, id) {
  if (H.lesson !== lessonId) H = { lesson: lessonId, ids: new Set() };
  if (H.ids.has(id)) H.ids.delete(id); else H.ids.add(id);
  return H.ids.has(id);
}
export function clearHearts() { H = { lesson: null, ids: new Set() }; }
// Router gọi mỗi lần đổi trang: chỉ trang chính của đúng bài đang tim (#/bai/<mã>, có thể kèm ?b=N) mới giữ tim
export function heartRoute(h) {
  if (!H.lesson) return;
  const m = h.match(/^bai\/([^/?]+)(?:\?b=\d)?$/);
  if (!m || decodeURIComponent(m[1]) !== H.lesson) clearHearts();
}
export const heartBtnHTML = (lessonId, id) => {
  const on = hearted(lessonId, id);
  return `<button type="button" class="icon-btn heart-btn" data-heart="${esc(id)}" aria-pressed="${on}" aria-label="${on ? 'Bỏ tim' : 'Thả tim'}">${icon('heart')}</button>`;
};

const PAIRS = 8;
const MODES = [['match', 'Ghép 8 cặp Việt – Nhật'], ['quiz', 'Trắc nghiệm'], ['form', 'Chuyển thể']];
const DIRS = [['vj', 'Việt → Nhật'], ['jv', 'Nhật → Việt'], ['mix', 'Trộn']];
// ---- v65: chuyển thể — các dạng của động từ / tính từ theo cấp thể đã chọn ----
const LVN = { N5: 5, N4: 4, N3: 3, N2: 2, N1: 1 };
const FLV = ['N5', 'N4', 'N3'];
// hai thể gần nghĩa (ば / たら "nếu…", ません / ない "không…", ました / た "đã…", dạng nói tắt / dạng đủ) không làm phương án của nhau
const NEAR0 = [['ba', 'tara'], ['masen', 'nai'], ['mashita', 'ta'], ['ta', 'te'], ['teiru', 'teru'], ['teshimau', 'chau'], ['teoku', 'toku'], ['tewa', 'chadame'], ['tewa', 'kinshi'], ['chadame', 'kinshi'], ['shieki', 'shiekiS'], ['zu', 'nai']];
const NEAR = {};
for (const [a, b] of NEAR0) { (NEAR[a] ||= []).push(b); (NEAR[b] ||= []).push(a); }
const POLITE = { masen: 'không {v} (lịch sự)', mashita: 'đã {v} (lịch sự)' };
const ADJ_F = { nai: 'N5', ta: 'N5', nakatta: 'N5', te: 'N5', adv: 'N5', naru: 'N5', ba: 'N4', sou: 'N4', sugi: 'N4', suru: 'N4', sa: 'N3', mi: 'N3' };
// v67: mã thể — động từ: mã trong FORMS (masu, te, ukemi…); tính từ: 'adj:' + mã (adj:nai…)
export const formLevel = k => (k.startsWith('adj:') ? ADJ_F[k.slice(4)] : FORM_LEVEL[k]);
export const formName = k => (k.startsWith('adj:') ? AFORMS[k.slice(4)] : FORMS[k]);
const VKEYS = Object.keys(FORMS), AKEYS = Object.keys(ADJ_F).map(f => 'adj:' + f);
// mặc định = như v65 "Thể đến N4": thể gốc N5–N4 của động từ + dạng N5–N4 của tính từ
const DEF_SEL = [...BASE_FORMS.filter(f => LVN[FORM_LEVEL[f]] >= 4), ...AKEYS.filter(k => LVN[formLevel(k)] >= 4)];
// ---- v67: câu hỏi ghép nhiều thể + thì: thái (khả năng / bị động / sai khiến) → thể ghép (ている, てしまう, ておく, たい) → thì ----
const VOICE = ['kano', 'ukemi', 'shieki', 'shiekiukemi'], ASPECT = ['teiru', 'teshimau', 'teoku', 'tai'];
const CHAIN = new Set([...VOICE, ...ASPECT]);
export const TAILS = [['', 'nguyên dạng', 'nguyên dạng'], ['masu', 'ます', 'lịch sự'], ['masen', 'ません', 'phủ định lịch sự'], ['mashita', 'ました', 'quá khứ lịch sự'], ['masendeshita', 'ませんでした', 'quá khứ phủ định lịch sự'],
  ['ta', 'た', 'quá khứ'], ['nai', 'ない', 'phủ định'], ['nakatta', 'なかった', 'quá khứ phủ định'], ['te', 'て', 'nối câu'], ['ba', 'ば', 'điều kiện'], ['tara', 'たら', 'điều kiện']];
const TNAME = Object.fromEntries(TAILS.map(([k, , n]) => [k, n])), ALL = 'all';
const DEF_TAILS = ['', 'masu', 'ta', 'nai', 'mashita'];
const pv1 = (m, k) => ({ group: 'v1', stem: m.slice(0, -1), stemKana: k.slice(0, -1), dict: m, dictKana: k, na: [] });
const pv5 = (m, k) => ({ group: 'v5', u: k.slice(-1), stem: m.slice(0, -1), stemKana: k.slice(0, -1), dict: m, dictKana: k, na: [] });
const VOICE_VI = { kano: v => 'có thể ' + v, ukemi: v => (/^(bị|được)\s/.test(v) ? v : 'bị / được ' + v), shieki: v => 'bắt / cho (ai) ' + v, shiekiukemi: v => 'bị bắt ' + v };
const ASP_VI = { teiru: v => 'đang ' + v, teshimau: v => 'lỡ ' + v, teoku: v => v + ' sẵn', tai: v => 'muốn ' + v };
const cut = (x, w) => (x.startsWith(w + ' ') ? x.slice(w.length + 1) : null);
const negVi = x => { let r; if ((r = cut(x, 'có thể')) != null) return 'không thể ' + r; if ((r = cut(x, 'đang')) != null) return 'chưa / không ' + r; if ((r = cut(x, 'muốn')) != null) return 'không muốn ' + r; return 'không ' + x; };
const pastVi = x => { const r = cut(x, 'đang'); return r != null ? 'lúc đó đang ' + r : 'đã ' + x; };
const pastNegVi = x => { let r; if ((r = cut(x, 'có thể')) != null) return 'đã không thể ' + r; if ((r = cut(x, 'đang')) != null) return 'lúc đó chưa / không ' + r; if ((r = cut(x, 'muốn')) != null) return 'đã không muốn ' + r; return 'đã không ' + x; };
const POL = x => x + ' (lịch sự)';
const TAIL_VI = { '': x => x, masu: POL, masen: x => POL(negVi(x)), mashita: x => POL(pastVi(x)), masendeshita: x => POL(pastNegVi(x)), ta: pastVi, nai: negVi, nakatta: pastNegVi, te: x => x + ' rồi… (nối câu)', ba: x => 'nếu ' + x, tara: x => 'nếu / khi ' + x };
const TAI_END = { '': 'い', masu: 'いです', masen: 'くないです', mashita: 'かったです', masendeshita: 'くなかったです', ta: 'かった', nai: 'くない', nakatta: 'くなかった', te: 'くて', ba: 'ければ', tara: 'かったら' };
const shortNm = f => FORMS[f].replace(/^thể (?=[a-zà-ỹ])/i, '');
// dạng ghép: thái → thể ghép → thì; null khi không chia được / dạng hiếm. steps = các bước chia (投げる → 投げられる → 投げられていた)
export function comboForm(it, voice, aspect, tail) {
  let cur = verbInfo(it);
  if (!cur || (!voice && !aspect) || !(tail in TAIL_VI)) return null;
  if (tail === '' && !(voice && aspect)) return null; // một thể, nguyên dạng = thể đơn (đã có)
  if (aspect === 'teshimau' && /^(nai|nakatta|masen|masendeshita)$/.test(tail)) return null; // 〜てしまわない: hiếm
  let vi = verbVi(it);
  const steps = [cur.dict];
  if (voice) { const c = conjugate(cur, voice); if (!c) return null; cur = pv1(c.mark, c.kana); vi = VOICE_VI[voice](vi); steps.push(c.mark); }
  let out;
  if (aspect === 'tai') {
    const c = conjugate(cur, 'tai'); if (!c) return null;
    vi = ASP_VI.tai(vi); steps.push(c.mark);
    out = { mark: c.mark.slice(0, -1) + TAI_END[tail], kana: c.kana.slice(0, -1) + TAI_END[tail] };
  } else {
    if (aspect) { const c = conjugate(cur, aspect); if (!c) return null; cur = aspect === 'teiru' ? pv1(c.mark, c.kana) : pv5(c.mark, c.kana); vi = ASP_VI[aspect](vi); steps.push(c.mark); }
    if (tail === '') out = { mark: cur.dict, kana: cur.dictKana };
    else if (tail === 'masendeshita') { const c = conjugate(cur, 'masen'); out = c && { mark: c.mark + 'でした', kana: c.kana + 'でした' }; }
    else out = conjugate(cur, tail);
  }
  if (!out) return null;
  if (tail) steps.push(out.mark);
  const fs = [voice, aspect, tail].filter(Boolean);
  return { ...out, vi: TAIL_VI[tail](vi), fs, lv: (voice ? 1 : 0) + (aspect ? 1 : 0), steps, names: [voice && shortNm(voice), aspect && shortNm(aspect), tail && TNAME[tail]].filter(Boolean) };
}
// Một chữ dùng cho hai thể (投げられる: khả năng = bị động với động từ nhóm 2) → gộp nghĩa, không đưa thể kia làm phương án sai
// sel: 'N5' | 'N4' | 'N3' (thể gốc đến cấp đó, như v65) · Set các mã thể đã chọn · null = mọi thể
// tails (v67): Set các thì để ghép (xem TAILS) · ALL = mọi thì · không có = chỉ thể đơn như v65
export function formsOf(it, sel = 'N3', tails = null) {
  const out = new Map();
  const keep = typeof sel === 'string' ? (k => (k.startsWith('adj:') || BASE_FORMS.includes(k)) && LVN[formLevel(k)] >= (LVN[sel] ?? 3)) : sel ? (k => sel.has(k)) : () => true;
  const put = (fs, f, mark, kana, vi, group, extra = {}) => {
    const o = out.get(kana);
    if (o) {
      for (const k of fs) if (!o.fs.includes(k)) o.fs.push(k);
      if (!o.vi.split(' — hoặc: ').includes(vi)) o.vi += ' — hoặc: ' + vi;
      // 投げられた: khả năng = bị động (nhóm 2) → tên thể ghi cả hai
      const n2 = extra.names;
      if (o.names && n2 && o.names[0] !== n2[0] && o.names.slice(1).join() === n2.slice(1).join()) o.names = [[o.names[0], n2[0]].sort((a, b) => (b === 'bị động') - (a === 'bị động')).join(' hoặc '), ...o.names.slice(1)];
      if (extra.cv && extra.cv[0] === 'ukemi') o.cv = extra.cv; // câu ví dụ của từ khác: lấy theo bị động
    }
    else out.set(kana, { fs: [...fs], f, mark, kana, vi, group, lv: 1, ...extra });
  };
  const v = verbInfo(it);
  if (v) {
    const ts = tails === ALL ? new Set(TAILS.map(t => t[0])) : tails;
    for (const f of VKEYS) {
      if (!keep(f)) continue;
      if (ts && CHAIN.has(f) && !ts.has('')) continue; // thể ghép được (bị động, ている…) mà không chọn "nguyên dạng" → chỉ hỏi dạng đã ghép thì
      const c = conjugate(v, f); if (c) put([f], f, c.mark, c.kana, POLITE[f] ? POLITE[f].replaceAll('{v}', formVi('masu', it).replace(/ \(lịch sự\)$/, '')) : formVi(f, it), v.group);
    }
    // v67: ghép nhiều thể + thì — 投げられた, 投げさせられました, 投げられていた, 書きたくなかった
    if (ts) {
      const vs = VOICE.filter(keep), as = ASPECT.filter(keep);
      // thể khả năng không ghép với ている / てしまう / ておく / たい (dạng hiếm, nghĩa gượng)
      const combos = [...vs.map(x => [x, null]), ...as.map(x => [null, x]), ...vs.filter(x => x !== 'kano').flatMap(x => as.map(y => [x, y]))];
      for (const [vo, asp] of combos) for (const t of ts) {
        const c = comboForm(it, vo, asp, t);
        if (c) put(c.fs, c.fs[0], c.mark, c.kana, c.vi, v.group, { lv: c.lv, names: c.names, steps: c.steps, combo: true, cv: [vo, asp, t] });
      }
    }
  } else {
    const a = adjInfo(it);
    if (a) for (const f of Object.keys(ADJ_F)) {
      if (!keep('adj:' + f)) continue;
      const c = adjConj(a, f); if (c) put(['adj:' + f], f, c.mark, reading(c.mark), adjVi(f, it.vi), a.type);
    }
  }
  return [...out.values()];
}

// v69 (C1): ưu tiên chỗ yếu. Thứ tự một vòng: từ có nhiều dạng hay sai (chưa thuộc nhuần nhuyễn) ra trước (lấy mẫu theo trọng số);
// từ sai từ 2 lần trở lên được hỏi thêm một lần nữa ở nửa sau vòng.
export function weakFirst(list) {
  const w = new Map();
  for (const x of wrongRecs()) w.set(x.id, (w.get(x.id) || 0) + Math.min(3, x.r.w));
  const ord = list.map(it => [Math.random() ** (1 / (1 + Math.min(6, w.get(it.id) || 0) * 0.5)), it]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  const extra = ord.filter(it => (w.get(it.id) || 0) >= 2);
  for (const it of extra) ord.splice(Math.ceil(ord.length / 2) + Math.floor(Math.random() * (Math.floor(ord.length / 2) + 1)), 0, it);
  return ord;
}
// trọng số chọn dạng trong một từ: chưa hỏi lần nào 1.2; hay sai / điểm thấp cao hơn; gần đủ 10 thấp hơn
export const formWeight = r => (!r ? 1.2 : Math.max(0.3, 1 + Math.min(5, r.w || 0) * 0.6 + (r.s < 3 ? 0.4 : 0) - (r.s >= 7 ? 0.6 : 0)));
// items: các từ đã tim (≥ 2); pool: từ của bài (lấy thêm làm phương án nhiễu)
// v69: formOnly = mở từ Luyện tập → "Chuyển thể" (không có tim, chỉ có chế độ chuyển thể; mặc định lấy từ đã học)
const SRCS = [['tim', 'Từ đã tim'], ['hoc', 'Từ đã học'], ['sao', 'Đã đánh dấu ★'], ['sai', 'Hay sai']];
const ROUND = 180; // giây — một lượt chuyển thể (như Ôn nhanh 3 phút)
export function runHeart(view, ctx, items, pool, { onDone, formOnly = false } = {}) {
  const st = { mode: formOnly ? 'form' : 'match', dir: 'mix', sel: new Set(DEF_SEL), tails: new Set(DEF_TAILS), src: new Set([items.length ? 'tim' : 'hoc']), quiet: false, inclM: false,
    ftab: 'N5', fopen: false, round: 0, ok: 0, n: 0, promoted: new Set(), queue: [], lock: false, last: {}, curIt: null, curKana: '', qid: 0,
    t0: 0, expired: false, res: [], newM: 0, retry: null };
  // mọi dạng của từ (thể đơn + dạng ghép thì) — phương án nhiễu, kiểm "dạng đúng"; tính một lần cho mỗi từ
  const allMemo = new Map();
  const allOf = it => { if (!allMemo.has(it.id)) allMemo.set(it.id, formsOf(it, null, ALL)); return allMemo.get(it.id); };
  // dạng hỏi được với các thể + thì đang chọn (phương án nhiễu lấy cả dạng ngoài lựa chọn)
  const askOf = it => formsOf(it, st.sel, st.tails);
  // v69: nguồn từ
  const conjOK = it => !!(it && (verbInfo(it) || adjInfo(it)));
  const SRC_WORDS = {
    tim: () => items.filter(conjOK),
    hoc: () => D.vocab.filter(it => status(it) !== 'new' && conjOK(it)),
    sao: () => D.vocab.filter(it => isStar(it.id) && conjOK(it)),
    sai: () => [...new Set(wrongRecs().map(x => x.id))].map(id => D.items.get(id)).filter(conjOK),
  };
  const srcOpts = () => SRCS.filter(([k]) => k !== 'tim' || items.length);
  // danh sách từ của từng nguồn: tính một lần mỗi vòng (vẽ lại khung chọn thể mỗi câu nên không quét kho mỗi lần)
  const srcMemo = new Map();
  const srcWords = k => { if (!srcMemo.has(k)) srcMemo.set(k, SRC_WORDS[k]?.() || []); return srcMemo.get(k); };
  let _pool = null, _pk = '';
  const resetPool = () => { _pool = null; srcMemo.clear(); };
  const wordPool = () => {
    const k = [...st.src].sort().join();
    if (_pool && _pk === k) return _pool;
    const m = new Map();
    for (const s of st.src) for (const it of srcWords(s)) m.set(it.id, it);
    _pool = [...m.values()]; _pk = k;
    return _pool;
  };
  const modes = formOnly ? MODES.filter(([k]) => k === 'form') : MODES;
  // từ đã tim mất khi rời trang nên chỉ nút ✕ mới thoát (run-lock); mở từ Luyện tập thì nút Back hỏi "Dừng lượt này?" như các bài luyện khác
  const RL = formOnly ? '' : ' run-lock';
  let keyHandler = null;
  const setKeys = h => { if (keyHandler) document.removeEventListener('keydown', keyHandler); keyHandler = h; if (h) document.addEventListener('keydown', h); };
  // v69: đồng hồ lượt 3 phút (chỉ tính lúc app đang hiện)
  const left = () => Math.max(0, Math.ceil(ROUND - (activeNow() - st.t0) / 1000));
  const fmtT = n => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  const tick = setInterval(() => {
    if (st.mode !== 'form' || !st.t0 || st.retry) return; // luyện lại câu sai: không tính giờ, xong khi đúng hết
    const c = view.querySelector('.hrt-clock');
    if (!st.expired && left() <= 0) {
      st.expired = true;
      const nb = view.querySelector('.next-bar [data-act=next]'); if (nb) nb.textContent = 'Xem kết quả';
    }
    if (c) { c.textContent = st.expired ? 'Hết giờ' : fmtT(left()); c.classList.toggle('is-over', st.expired); }
  }, 500);
  const startRound = () => { st.t0 = activeNow(); st.expired = false; st.res = []; st.newM = 0; st.wasRetry = false; };
  ctx.onLeave(() => { setKeys(null); clearInterval(tick); });
  beginSession(ctx);

  // ---- ghi lịch ôn khi trả lời đúng ----
  async function credit(it, dir) {
    st.ok++;
    const key = it.id + '|' + dir, x = dirRec(it.id, dir);
    if (!st.promoted.has(key) && (!x || !x.b || x.due <= Date.now())) { st.promoted.add(key); await review(it.id, dir, true); }
    else await refreshDue(it.id, dir);
  }
  async function exit() {
    setKeys(null);
    await onDone?.(st);
    if (st.n) toast(`Đã luyện ${st.n} lượt · đúng ${st.ok}.`);
    goBack(ctx);
  }

  const roundStat = () => { const n = st.res.length, k = st.res.filter(r => r.ok).length; return `đúng ${k}/${n}`; };
  const head = (full = true) => `<div class="run-top">
      <button type="button" class="icon-btn" data-act="quit" aria-label="Thoát">${icon('close')}</button>
      <p class="hrt-count">${st.mode === 'form' ? `<b>${st.retry ? 'Luyện lại câu sai' : 'Chuyển thể'}</b> · ${roundStat()}` : `<b>Màn ${st.round}</b> · đúng ${st.ok}/${st.n}`}</p>
      ${st.mode === 'form' && st.retry ? `<span class="run-n hrt-left">còn ${st.retry.length} câu</span>` : st.mode === 'form' && st.t0 ? `<span class="run-n hrt-clock${st.expired ? ' is-over' : ''}" role="timer" aria-label="Thời gian còn lại">${st.expired ? 'Hết giờ' : fmtT(left())}</span>` : `<span class="run-n hrt-n">${icon('heart')} ${items.length}</span>`}
    </div>
    ${!full ? '' : `${modes.length > 1 ? `<div class="tabs hrt-tabs" role="tablist">${modes.map(([k, l]) => `<button type="button" class="tab" role="tab" data-mode="${k}" aria-selected="${st.mode === k}">${l}</button>`).join('')}</div>` : ''}
    ${st.mode !== 'match' ? dirsHTML() : ''}
    ${st.mode === 'form' ? pickHTML() : ''}`}`;
  // hướng hỏi; chuyển thể có thêm "Nghe" và công tắc "Không nghe được" (chỗ đông người, trên tàu)
  const canListen = () => st.mode === 'form' && ttsReady();
  function dirsHTML() {
    const ds = [...DIRS.slice(0, 2), ...(canListen() ? [['nghe', 'Nghe']] : []), DIRS[2]];
    return `<div class="chips hrt-dirs" role="group">${ds.map(([k, l]) => `<button type="button" class="chip" data-dir="${k}" aria-pressed="${st.dir === k}" ${k === 'nghe' && st.quiet ? 'disabled' : ''}>${l}</button>`).join('')}${st.mode === 'form' ? `<button type="button" class="chip hrt-quiet" data-quiet aria-pressed="${st.quiet}" title="Không hỏi câu nghe, không tự đọc">${st.quiet ? '🔇' : '🔈'} Không nghe được</button>` : ''}</div>`;
  }
  // v67: chọn thể — một danh sách gọn, 3 tab N5 / N4 / N3; mỗi tab: thể động từ, dạng tính từ (chạm để bật / tắt)
  // v69: + hàng "Lấy từ" (nguồn), công tắc "Hỏi cả dạng đã thuộc nhuần nhuyễn"
  const hasV = () => !wordPool().length || wordPool().some(it => verbInfo(it));
  const hasA = () => wordPool().some(it => !verbInfo(it) && adjInfo(it));
  const keysOf = L => [...(hasV() ? VKEYS : []), ...(hasA() ? AKEYS : [])].filter(k => formLevel(k) === L);
  const relSel = () => [...st.sel].filter(k => (k.startsWith('adj:') ? hasA() : hasV())); // thể đang chọn dùng được cho các từ ở nguồn
  function pickHTML() {
    const rel = relSel(), n = rel.length, names = rel.slice(0, 3).map(k => formName(k).replace(/^thể /, '')).join(', '), nw = wordPool().length;
    const nt = [...st.tails].filter(Boolean).length, tl = hasV() ? `<p class="sub-label">Ghép với thì <small class="muted">· cho khả năng, bị động, sai khiến, ている, てしまう, ておく, たい — vd. <span lang="ja">${rubyHTML('投[な]げられていた')}</span></small></p>
      <div class="chips hrt-fks hrt-tls">${TAILS.map(([k, j, nm]) => `<button type="button" class="chip" data-tl="${k}" aria-pressed="${st.tails.has(k)}">${k ? `<span lang="ja">${j}</span> <small>${esc(nm)}</small>` : esc(j)}</button>`).join('')}</div>` : '';
    const chip = k => `<button type="button" class="chip" data-fk="${k}" aria-pressed="${st.sel.has(k)}">${esc(formName(k).replace(/^thể (?=[a-zà-ỹ])/i, ''))}</button>`;
    const ks = keysOf(st.ftab), vb = ks.filter(k => BASE_FORMS.includes(k)), ve = ks.filter(k => !k.startsWith('adj:') && !BASE_FORMS.includes(k)), as = ks.filter(k => k.startsWith('adj:'));
    const grp = (label, list) => (list.length ? `<p class="sub-label">${label}</p><div class="chips hrt-fks">${list.map(chip).join('')}</div>` : '');
    const srcs = srcOpts().map(([k, l]) => `<button type="button" class="chip" data-src="${k}" aria-pressed="${st.src.has(k)}">${esc(l)} <small>${srcWords(k).length}</small></button>`).join('');
    return `<details class="hrt-fpick" ${st.fopen ? 'open' : ''}><summary><span>Thể đang luyện: <b>${n}</b>${n ? ` <small class="muted">· ${esc(names)}${n > 3 ? '…' : ''}${hasV() ? ` · ghép ${nt} thì` : ''}</small>` : ''} <small class="muted">· ${nw} từ</small></span></summary>
      <p class="sub-label">Lấy từ <small class="muted">· chọn được nhiều</small></p><div class="chips hrt-fks hrt-srcs">${srcs}</div>
      <div class="tabs hrt-ftabs" role="tablist">${FLV.map(L => { const all = keysOf(L), on = all.filter(k => st.sel.has(k)).length; return `<button type="button" class="tab" role="tab" data-ftab="${L}" aria-selected="${st.ftab === L}">${L} <small>${on}/${all.length}</small></button>`; }).join('')}</div>
      ${grp('Động từ · thể chính', vb)}${grp('Động từ · thể ghép, nói tắt', ve)}${grp('Tính từ', as)}
      <div class="row-btns"><button type="button" class="btn btn-ghost btn-sm" data-fall="1">Chọn cả ${st.ftab}</button><button type="button" class="btn btn-ghost btn-sm" data-fall="0">Bỏ cả ${st.ftab}</button></div>${tl}
      <label class="check small hrt-im"><input type="checkbox" data-im ${st.inclM ? 'checked' : ''}><span>Hỏi cả dạng đã thuộc nhuần nhuyễn <small class="muted">(đang có ${masteredCount()} dạng; đúng ${MASTER} lần thì 6 tháng sau mới hỏi lại)</small></span></label></details>`;
  }
  // v68: lưu vào cài đặt học (D.prefs) → đồng bộ theo tài khoản như các cài đặt học khác. v69: + nguồn từ (trừ "từ đã tim"), không nghe được, hỏi cả dạng đã thuộc
  const saveSel = () => setPrefs({ hrt: { f: [...st.sel], t: [...st.tails], src: [...st.src].filter(k => k !== 'tim'), q: st.quiet, im: st.inclM, at: Date.now() } }).catch(() => { });
  function bindHead() {
    view.querySelector('[data-act=quit]').onclick = exit;
    view.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => {
      if (st.mode === b.dataset.mode) return;
      st.mode = b.dataset.mode; st.queue = []; st.retry = null;
      if (st.mode === 'form') startRound(); else st.t0 = 0; // rời chuyển thể thì bỏ lượt đang chạy
      next(true);
    });
    view.querySelectorAll('[data-dir]').forEach(b => b.onclick = () => { if (b.disabled) return; st.dir = b.dataset.dir; st.queue = []; next(true); });
    const qb = view.querySelector('[data-quiet]');
    if (qb) qb.onclick = () => { st.quiet = !st.quiet; if (st.quiet && st.dir === 'nghe') st.dir = 'mix'; saveSel(); if (!st.lock && (st.curDir === 'nghe' || !st.curIt)) next(true); else refreshDirs(); };
    const fp = view.querySelector('.hrt-fpick');
    if (fp) {
      fp.ontoggle = () => { st.fopen = fp.open; };
      const im = fp.querySelector('[data-im]');
      if (im) im.onchange = () => { st.inclM = im.checked; saveSel(); st.queue = []; if (!st.lock && !st.curIt) next(true); };
      fp.onclick = e => {
        const t = e.target.closest('[data-ftab], [data-fk], [data-fall], [data-tl], [data-src]');
        if (!t) return;
        if (t.dataset.ftab) { st.ftab = t.dataset.ftab; refreshPick(); return; }
        if (t.dataset.src) { const k = t.dataset.src; if (st.src.has(k)) st.src.delete(k); else st.src.add(k); resetPool(); }
        else if (t.dataset.tl != null) { const k = t.dataset.tl; if (st.tails.has(k)) st.tails.delete(k); else st.tails.add(k); }
        else if (t.dataset.fk) { const k = t.dataset.fk; if (st.sel.has(k)) st.sel.delete(k); else st.sel.add(k); }
        else for (const k of keysOf(st.ftab)) { if (t.dataset.fall === '1') st.sel.add(k); else st.sel.delete(k); }
        saveSel(); st.queue = [];
        refreshPick();
        // câu đang hỏi không còn thuộc lựa chọn (hoặc chưa có câu) → hỏi câu mới; đang xem đáp án thì để bấm Tiếp
        const stillOK = st.curIt && wordPool().some(x => x.id === st.curIt.id) && askOf(st.curIt).some(x => x.kana === st.curKana);
        if (!st.lock && !stillOK && !st.retry) next(true);
      };
    }
  }
  // vẽ lại riêng khung chọn thể (giữ câu đang hỏi)
  function refreshPick() {
    const fp = view.querySelector('.hrt-fpick');
    if (!fp) return;
    fp.outerHTML = pickHTML();
    bindHead();
  }
  function refreshDirs() {
    const d = view.querySelector('.hrt-dirs');
    if (d) { d.outerHTML = dirsHTML(); bindHead(); }
  }
  const weighted = weakFirst;
  function next(newRound = false) {
    if (st.mode === 'match') { st.round++; return matchRound(); }
    if (st.mode !== 'form') {
      if (newRound || !st.queue.length) { st.round++; st.queue = shuffle([...items]); }
      return ask(st.queue.shift());
    }
    if (!st.t0) startRound();
    // v69 (C6): luyện lại câu sai của lượt vừa xong — hỏi lần lượt, sai thì xếp lại cuối
    if (st.retry) {
      if (!st.retry.length) { st.retry = null; st.wasRetry = true; return showResult(); }
      const r = st.retry[0];
      if (askForm(r.it, r.kana)) return;
      st.retry.shift(); return next();
    }
    if (!relSel().length && !st.src.has('sai')) return noForms('sel');
    if (!wordPool().length) return noForms('src');
    for (let tries = 0; tries < 80; tries++) {
      if (newRound || !st.queue.length) { st.round++; resetPool(); st.queue = weighted(wordPool()); newRound = false; if (!st.queue.length) break; }
      if (askForm(st.queue.shift())) return;
    }
    return noForms('none');
  }

  // ---- ghép cặp: mỗi màn tối đa 8 cặp, không để hai nghĩa đụng nhau trong cùng màn ----
  function pickPairs() {
    const out = [];
    for (const it of shuffle([...items])) {
      if (out.length >= PAIRS) break;
      if (out.some(o => sameMeaning(o, it) || (o.kanji || o.kana) === (it.kanji || it.kana))) continue;
      out.push(it);
    }
    return out;
  }
  function matchRound() {
    const set = pickPairs(), bad = new Set();
    let sel = { L: null, R: null };
    const tile = (it, side) => side === 'L'
      ? `<button type="button" class="tile" data-id="${esc(it.id)}" data-side="L">${esc(it.vi)}</button>`
      : `<button type="button" class="tile tile-jp" data-id="${esc(it.id)}" data-side="R" lang="ja">${wordHTML(it, S.script === 'kana' ? 'kana' : 'furi')}</button>`;
    view.innerHTML = `<div class="run${RL} hrt">${head()}
      <p class="small muted hrt-hint">Chạm một nghĩa tiếng Việt rồi chạm từ tiếng Nhật đúng với nó.</p>
      <div class="match"><div class="mcol">${shuffle([...set]).map(it => tile(it, 'L')).join('')}</div><div class="mcol">${shuffle([...set]).map(it => tile(it, 'R')).join('')}</div></div></div>`;
    bindHead();
    view.querySelector('.match').onclick = async e => {
      const b = e.target.closest('.tile');
      if (!b || b.disabled) return;
      const side = b.dataset.side;
      if (sel[side]) sel[side].setAttribute('aria-pressed', 'false');
      sel[side] = b; b.setAttribute('aria-pressed', 'true');
      if (side === 'R' && S.autoSpeak && !st.quiet) { const it = D.items.get(b.dataset.id); if (it) speak(it.kana); }
      if (!sel.L || !sel.R) return;
      const a = sel.L, c = sel.R;
      sel = { L: null, R: null };
      a.setAttribute('aria-pressed', 'false'); c.setAttribute('aria-pressed', 'false');
      if (a.dataset.id === c.dataset.id) {
        a.disabled = c.disabled = true; a.classList.add('done'); c.classList.add('done');
        if (S.sound) beep(true);
        st.n++;
        const it = set.find(x => x.id === a.dataset.id);
        if (it && !bad.has(it.id)) await credit(it, 'jv');
        updCount();
        if (![...view.querySelectorAll('.tile')].some(t => !t.disabled)) setTimeout(() => { if (view.querySelector('.hrt')) next(); }, 500);
      } else {
        bad.add(a.dataset.id); bad.add(c.dataset.id);
        a.classList.add('is-ng'); c.classList.add('is-ng');
        if (S.sound) beep(false);
        if (S.vibrate) buzz();
        setTimeout(() => { a.classList.remove('is-ng'); c.classList.remove('is-ng'); }, 600);
      }
    };
    setKeys(null);
  }
  const updCount = () => { const c = view.querySelector('.hrt-count'); if (c) c.innerHTML = st.mode === 'form' ? `<b>${st.retry ? 'Luyện lại câu sai' : 'Chuyển thể'}</b> · ${roundStat()}` : `<b>Màn ${st.round}</b> · đúng ${st.ok}/${st.n}`; };

  // ---- trắc nghiệm 4 phương án; nhiễu lấy từ các từ tim khác trước, thiếu thì lấy từ của bài, rồi từ cùng cấp ----
  function distractors(it, dir) {
    const show = o => (dir === 'vj' ? (o.kanji || o.kana) : o.vi);
    const ok = o => o.id !== it.id && !sameMeaning(o, it) && show(o) !== show(it) && (o.kanji || o.kana) !== (it.kanji || it.kana);
    const out = [];
    for (const src of [items, pool, D.vocab.filter(o => o.level === it.level)]) {
      for (const o of shuffle(src.filter(ok))) {
        if (out.length >= 3) break;
        if (!out.some(x => show(x) === show(o) || sameMeaning(x, o))) out.push(o);
      }
      if (out.length >= 3) break;
    }
    return out;
  }
  function ask(it) {
    const dir = st.dir === 'mix' ? (Math.random() < .5 ? 'vj' : 'jv') : st.dir;
    const script = S.script === 'kana' ? 'kana' : 'furi';
    const opts = shuffle([it, ...distractors(it, dir)]);
    const prompt = dir === 'vj'
      ? `<p class="prompt-vi">${esc(it.vi)}</p><p class="prompt-hint">Chọn từ tiếng Nhật</p>`
      : `<div class="prompt-row"><p class="prompt-jp" lang="ja">${wordHTML(it, script)}</p>${sayBtn(it.kana)}</div><p class="prompt-hint">Chọn nghĩa tiếng Việt</p>`;
    view.innerHTML = `<div class="run${RL} hrt">${head()}
      <article class="label-card" data-nokj><div class="label-head"><span class="label-tag">${dir === 'vj' ? 'Việt → Nhật' : 'Nhật → Việt'}</span><span class="label-lv">${esc(it.level || '')}</span></div>${prompt}<div class="stamp" aria-hidden="true"></div></article>
      <div class="opts ${dir === 'vj' ? 'opts-jp' : ''}">${opts.map((o, k) => `<button type="button" class="opt" data-id="${esc(o.id)}"><span class="opt-n">${k + 1}</span><span class="opt-t" ${dir === 'vj' ? 'lang="ja"' : ''}>${dir === 'vj' ? wordHTML(o, script) : esc(o.vi)}</span></button>`).join('')}</div>
      <div class="after" hidden></div></div>`;
    bindHead(); bindSay(view);
    if (dir === 'jv' && S.autoSpeak && !st.quiet) setTimeout(() => speak(it.kana), 150);
    st.lock = false;
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => answer(it, dir, b.dataset.id));
    setKeys(e => { if (st.lock) return; const n = +e.key; if (n >= 1 && n <= opts.length) view.querySelectorAll('.opt')[n - 1].click(); });
  }
  async function answer(it, dir, id) {
    if (st.lock) return;
    st.lock = true;
    const ok = id === it.id;
    view.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.id === it.id) b.classList.add('is-ok'); else if (b.dataset.id === id) b.classList.add('is-ng'); });
    view.querySelector('.label-card').removeAttribute('data-nokj');
    view.querySelector('.stamp').className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
    if (S.sound) beep(ok);
    if (!ok && S.vibrate) buzz();
    st.n++;
    if (ok) await credit(it, dir);
    else { // sai: hỏi lại sớm (sau 2 câu)
      if (st.queue.length < 2) { st.round++; st.queue.push(...shuffle(items.filter(x => x.id !== it.id))); }
      st.queue.splice(Math.min(2, st.queue.length), 0, it);
    }
    updCount();
    if (dir === 'vj' && S.autoSpeak && !st.quiet) speak(it.kana);
    if (!ok) {
      const after = view.querySelector('.after');
      after.hidden = false;
      after.innerHTML = `<p class="after-msg">Đáp án đúng: <b ${dir === 'vj' ? 'lang="ja"' : ''}>${dir === 'vj' ? wordHTML(it, 'furi') : esc(it.vi)}</b> — từ này sẽ hỏi lại sau 2 câu.</p>${wordDetailHTML(it, { compact: true })}`;
      bindSay(after);
    }
    nextBar(ok);
  }
  // v67: trả lời xong (cả khi đúng) chờ bấm Tiếp, như các bài luyện khác; chỉ tự sang câu sau khi bật ở Cài đặt → "Tự sang câu sau khi trả lời đúng"
  function nextBar(ok) {
    const bar = document.createElement('div');
    bar.className = 'next-bar';
    const done = () => st.mode === 'form' && st.t0 && st.expired && !st.retry; // v69: hết 3 phút → làm nốt câu đang dở rồi xem kết quả
    bar.innerHTML = `<button type="button" class="btn btn-primary" data-act="next">${done() ? 'Xem kết quả' : 'Tiếp'}</button>`;
    view.querySelector('.run').appendChild(bar);
    const nb = bar.querySelector('[data-act=next]');
    const go = () => (done() ? showResult() : next());
    nb.onclick = go;
    nb.focus({ preventScroll: true });
    setKeys(e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    if (ok && S.autoNext) setTimeout(() => { if (view.contains(nb)) nb.click(); }, S.autoNext);
  }

  // không ra được câu: chưa chọn thể, nguồn không có từ, hoặc mọi dạng đang chọn đã thuộc nhuần nhuyễn
  function noForms(why) {
    st.fopen = true; st.curIt = null; st.lock = false;
    const msg = why === 'sel' ? 'Chọn ít nhất một thể ở danh sách trên để bắt đầu.'
      : why === 'src' ? 'Chưa có từ nào ở nguồn đang chọn — chọn thêm ở hàng "Lấy từ" phía trên.'
      : 'Không còn dạng nào để hỏi: các dạng đang chọn của những từ này đã thuộc nhuần nhuyễn, hoặc từ không chia được theo những thể / thì đó. Chọn thêm thể / thì, thêm nguồn từ, hoặc bật "Hỏi cả dạng đã thuộc nhuần nhuyễn".';
    view.innerHTML = `<div class="run${RL} hrt">${head()}<p class="empty hrt-none">${esc(msg)}</p></div>`;
    bindHead(); setKeys(null);
  }
  // v69 (C6): kết quả lượt 3 phút
  function showResult() {
    setKeys(null); st.lock = true; st.curIt = null;
    const res = st.res, okN = res.filter(r => r.ok).length, seen = new Set();
    const wrong = res.filter(r => !r.ok && !seen.has(r.it.id + '|' + r.c.kana) && seen.add(r.it.id + '|' + r.c.kana));
    view.innerHTML = `<div class="run hrt hrt-res">${head(false)}
      <h1 class="h1">${st.wasRetry ? 'Xong luyện lại câu sai' : 'Xong 3 phút chuyển thể'}</h1>
      <p class="hrt-sum">Đúng <b>${okN}</b>/${res.length} câu${st.newM ? ` · thuộc nhuần nhuyễn thêm <b>${st.newM}</b> dạng` : ''}.</p>
      ${wrong.length ? `<h2 class="h2">Câu sai (${wrong.length})</h2><ul class="hrt-wl">${wrong.map(r => `<li><b lang="ja">${rubyHTML(r.c.mark)}</b> = <span lang="ja">${wordHTML(r.it, 'furi')}</span>${r.c.names ? ` · ${esc(r.c.names.join(' · '))}` : ''} · ${esc(r.c.vi)}${r.c.steps ? `<br><small class="muted" lang="ja">${r.c.steps.map(m => rubyHTML(m)).join(' → ')}</small>` : ''}</li>`).join('')}</ul>` : res.length ? '<p class="result-good">Không sai câu nào.</p>' : ''}
      <div class="row-btns wrap hrt-res-btns">${wrong.length ? `<button type="button" class="btn btn-primary" data-act="retry">Luyện lại câu sai (${wrong.length})</button>` : ''}<button type="button" class="btn ${wrong.length ? 'btn-ghost' : 'btn-primary'}" data-act="more">Thêm 3 phút</button><button type="button" class="btn btn-ghost" data-act="quit2">Thoát</button></div></div>`;
    bindHead();
    const $a = k => view.querySelector(`[data-act=${k}]`);
    if ($a('retry')) $a('retry').onclick = () => { st.retry = wrong.map(r => ({ it: r.it, kana: r.c.kana })); startRound(); next(true); };
    $a('more').onclick = () => { st.retry = null; st.queue = []; startRound(); next(true); };
    $a('quit2').onclick = exit;
  }
  // ---- v65: chuyển thể Nhật → Việt (nghĩa của dạng đã chia) / Việt → Nhật (chọn dạng đúng; có lỗi chia hay gặp làm phương án sai) ----
  const jpOf = x => (S.script === 'kana' ? esc(x.kana) : rubyHTML(x.mark));
  const pjSize = x => { const n = x.kana.length; return n > 11 ? ' pj-xl' : n > 8 ? ' pj-l' : n > 6 ? ' pj-m' : ''; }; // v67: dạng ghép dài
  // trả về false khi từ này không còn dạng nào để hỏi (đã thuộc nhuần nhuyễn hết / không chia được theo lựa chọn)
  function askForm(it, forceKana = '') {
    const cs = allOf(it);
    let ask;
    if (forceKana) ask = cs.filter(x => x.kana === forceKana);
    else {
      // dạng hỏi: trong các thể + thì đang chọn; nguồn "Hay sai" thêm đúng các dạng đã sai của từ; bỏ dạng đã thuộc nhuần nhuyễn (trừ khi bật)
      const mine = new Set(askOf(it).map(x => x.kana));
      if (st.src.has('sai')) for (const w of wrongRecs()) if (w.id === it.id) mine.add(w.kana);
      ask = cs.filter(x => mine.has(x.kana) && (st.inclM || !isMastered(crec(it.id, x.kana))));
    }
    if (!ask.length) return false;
    const listenOK = canListen() && !st.quiet;
    const dir = st.dir === 'mix' ? shuffle(['vj', 'jv', ...(listenOK ? ['nghe'] : [])])[0] : st.dir === 'nghe' && !listenOK ? (Math.random() < .5 ? 'vj' : 'jv') : st.dir;
    const pool0 = ask.filter(x => x.kana !== st.last[it.id]);
    const c = pickForm(it, pool0.length ? pool0 : ask);
    st.last[it.id] = c.kana; st.curIt = it; st.curKana = c.kana; st.curDir = dir; st.qid++;
    const near = new Set(c.fs.flatMap(f => NEAR[f] || []));
    const core = x => x.vi.replace(/\s*\((lịch sự|thể thường|nói tắt)\)/g, '').trim();
    // nghĩa chỉ khác nhãn "(lịch sự)" / "(nói tắt)" thì không làm phương án của câu hỏi chọn nghĩa
    const others = shuffle(cs.filter(x => x !== c && !x.fs.some(f => near.has(f)) && (dir === 'vj' || core(x) !== core(c))));
    // ưu tiên phương án nhiễu gần với dạng hỏi (chung thể / chung thì), rồi tới dạng trong lựa chọn
    const sc = x => x.fs.filter(f => c.fs.includes(f)).length * 2 + (x.fs.some(f => st.sel.has(f) || st.tails.has(f)) ? 1 : 0);
    others.sort((a, b) => sc(b) - sc(a));
    let opts;
    if (dir !== 'vj') opts = shuffle([c, ...others.slice(0, 3)]).map(x => ({ key: x.kana, html: esc(x.vi) }));
    else {
      // phương án "lỗi chia": bỏ mọi dạng ĐÚNG của từ (kể cả thể ngoài cấp đang chọn, vd. 打ってはいけない gần nghĩa với 打つな)
      const vi0 = verbInfo(it), ai = adjInfo(it);
      const valid = new Set([...cs.map(x => x.kana), ...(vi0 ? Object.keys(FORMS).map(f => conjugate(vi0, f)?.kana) : Object.keys(AFORMS).map(f => { const m = ai && adjConj(ai, f)?.mark; return m && reading(m); }))].filter(Boolean));
      const wrong = (c.combo ? comboWrong(it, c) : !c.fs[0].startsWith('adj:') ? wrongForms(verbInfo(it), c.f) : adjWrong(adjInfo(it), c.f))
        .map(m => ({ mark: m, kana: reading(m) })).filter(w => !valid.has(w.kana));
      const pick = [...shuffle(wrong).slice(0, 1), ...others].filter((x, i, a) => a.findIndex(y => y.kana === x.kana) === i).slice(0, 3);
      opts = shuffle([c, ...pick]).map(x => ({ key: x.kana, html: jpOf(x), jp: true }));
    }
    const base = `<span lang="ja">${wordHTML(it, S.script === 'kana' ? 'kana' : 'furi')}</span> (${esc(shortVi(it.vi))})`;
    const r0 = crec(it.id, c.kana), prog = isMastered(r0) ? ' · ✓ đã nhuần nhuyễn' : r0?.m ? ' · kiểm tra lại' : r0?.s ? ` · ${r0.s}/${MASTER}` : '';
    const prompt = dir === 'jv'
      ? `<div class="prompt-row"><p class="prompt-jp${pjSize(c)}" lang="ja">${jpOf(c)}</p>${sayBtn(c.kana)}</div><p class="prompt-hint">Từ gốc ${base} · chọn nghĩa của dạng này</p>`
      : dir === 'nghe'
        ? `<div class="prompt-row hrt-listen"><button type="button" class="icon-btn say say-big" data-say="${esc(c.kana)}" aria-label="Nghe lại">${icon('speaker')}</button></div>
          <p class="prompt-jp hrt-reveal${pjSize(c)}" lang="ja" hidden>${jpOf(c)}</p>
          <p class="prompt-hint">Nghe dạng đã chia của ${base} · chọn nghĩa <button type="button" class="btn btn-ghost btn-sm" data-act="reveal">Hiện chữ</button></p>`
        : `<p class="prompt-vi">${esc(c.vi)}</p><p class="prompt-hint">Chia từ ${base} · chọn dạng tiếng Nhật đúng</p>`;
    view.innerHTML = `<div class="run${RL} hrt">${head()}
      <article class="label-card hrt-fcard" data-nokj><div class="label-head"><span class="label-tag">Chuyển thể · ${dir === 'vj' ? 'Việt → Nhật' : dir === 'nghe' ? 'Nghe' : 'Nhật → Việt'}<small class="hrt-prog">${prog}</small></span><span class="label-lv">${esc(it.level || '')}</span></div>${prompt}<div class="stamp" aria-hidden="true"></div></article>
      <div class="opts ${dir === 'vj' ? 'opts-jp' : ''}">${opts.map((o, k) => `<button type="button" class="opt" data-k="${esc(o.key)}"><span class="opt-n">${k + 1}</span><span class="opt-t" ${o.jp ? 'lang="ja"' : ''}>${o.html}</span></button>`).join('')}</div>
      <div class="after" hidden></div></div>`;
    bindHead(); bindSay(view);
    const rv = view.querySelector('[data-act=reveal]');
    if (rv) rv.onclick = () => { view.querySelector('.hrt-reveal').hidden = false; rv.remove(); };
    if (!st.quiet && (dir === 'nghe' || (dir === 'jv' && S.autoSpeak))) setTimeout(() => speak(c.kana), 150);
    st.lock = false;
    view.querySelectorAll('.opt').forEach(b => b.onclick = () => answerForm(it, c, cs, dir, b.dataset.k));
    setKeys(e => { if (st.lock) return; const n = +e.key; if (n >= 1 && n <= opts.length) view.querySelectorAll('.opt')[n - 1].click(); });
    return true;
  }
  function answerForm(it, c, cs, dir, key) {
    if (st.lock) return;
    st.lock = true;
    const ok = key === c.kana;
    view.querySelectorAll('.opt').forEach(b => { b.disabled = true; if (b.dataset.k === c.kana) b.classList.add('is-ok'); else if (b.dataset.k === key) b.classList.add('is-ng'); });
    view.querySelector('.stamp').className = 'stamp ' + (ok ? 'stamp-ok' : 'stamp-ng');
    view.querySelector('.hrt-reveal')?.removeAttribute('hidden'); view.querySelector('[data-act=reveal]')?.remove();
    if (S.sound) beep(ok);
    if (!ok && S.vibrate) buzz();
    st.n++; if (ok) st.ok++;
    st.res.push({ it, c, ok });
    for (const f of c.fs) if (FORMS[f] || f.startsWith('adj:')) recForm(f, c.group, ok); // điểm theo thể (Luyện tập → Luyện thể), không đổi lịch ôn của từ
    // v69 (B): thuộc nhuần nhuyễn — đúng +1, sai −3; đủ 10 thì 6 tháng sau mới hỏi lại
    const m = recCthe(it.id, c.kana, ok);
    if (m.newly) { st.newM++; toast(`Đã thuộc nhuần nhuyễn ${plain(c.mark)} — 6 tháng sau (${fmtDay(m.r.due)}) mới hỏi lại.`); }
    if (st.retry) { const r = st.retry.shift(); if (!ok) st.retry.push(r); }
    else if (!ok) { if (st.queue.length < 2) { st.round++; resetPool(); st.queue.push(...weighted(wordPool().filter(x => x.id !== it.id))); } st.queue.splice(Math.min(2, st.queue.length), 0, it); }
    updCount();
    if (dir === 'vj' && S.autoSpeak && !st.quiet) speak(c.kana);
    const chosen = cs.find(x => x.kana === key);
    const rule = c.combo ? '' : c.fs.filter(f => !f.startsWith('adj:')).map(f => ruleText(it, f)).filter(Boolean)[0] || '';
    const mline = m.newly ? `✓ Thuộc nhuần nhuyễn dạng này — 6 tháng sau (${fmtDay(m.r.due)}) mới hỏi lại.`
      : m.kept ? `✓ Kiểm tra lại đạt — thuộc nhuần nhuyễn tới ${fmtDay(m.r.due)}.`
      : m.lost ? `Chưa còn nhuần nhuyễn — về ${m.r.s}/${MASTER}, cần thêm ${MASTER - m.r.s} lần đúng.`
      : `Dạng này: ${m.r.s}/${MASTER}${ok ? '' : ' (sai trừ 3)'} — đủ ${MASTER} là thuộc nhuần nhuyễn.`;
    const after = view.querySelector('.after');
    after.hidden = false;
    after.innerHTML = `<p class="after-msg${ok ? ' is-ok' : ''}"><b lang="ja">${jpOf(c)}</b> = <span lang="ja">${wordHTML(it, 'furi')}</span>${c.names ? ` · ${esc(c.names.join(' · '))}` : ''} · ${esc(c.vi)}</p>
      ${c.steps ? `<p class="small hrt-steps">Cách chia: <span lang="ja">${c.steps.map(m => rubyHTML(m)).join(' → ')}</span></p>` : ''}
      ${!ok && chosen ? `<p class="small">Bạn chọn <b lang="ja">${jpOf(chosen)}</b>: ${esc(chosen.vi)}.</p>` : !ok && dir === 'vj' ? '<p class="small">Phương án bạn chọn là lỗi chia hay gặp.</p>' : ''}
      ${rule ? `<p class="small muted">${esc(rule)}</p>` : ''}
      <p class="small hrt-m${m.newly || m.kept ? ' is-ok' : ''}">${esc(mline)}</p>
      <details class="hrt-vd" open><summary>Câu ví dụ</summary><ul class="hrt-vdl"><li class="small muted">Đang tìm câu ví dụ…</li></ul></details>`;
    bindSay(after);
    nextBar(ok);
    fillExamples(it, c, st.qid);
  }
  // v69 (C5) / v70: câu ví dụ — CHỈ câu có đúng dạng đang hỏi của chính từ này (tối đa 10, xen kẽ tình huống, câu ngắn trước);
  // thiếu câu thật thì thêm câu ghép theo khuôn của chính từ này (cũng phải đúng dạng đó)
  async function fillExamples(it, c, qid) {
    const box = () => (st.qid === qid ? view.querySelector('.hrt-vdl') : null);
    const surf = plain(c.mark);
    try {
      const V = await import('./vidu.js');
      const made = [];
      if (!c.combo) {
        const P = await import('./practice.js');
        const cap = x => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x);
        if (!c.fs[0].startsWith('adj:') && verbInfo(it)) {
          for (const ph of P.verbPhrases(it)) for (const t of [...P.FTPL, ...P.GTPL]) { const x = P.makeSent(ph, t); if (x) made.push({ jp: x.jp, vi: x.vi }); }
        } else if (adjInfo(it)) {
          const a = adjInfo(it), v = shortVi(it.vi);
          for (const sj of (it.subj || []).length ? it.subj : [{ jp: 'これ', vi: 'cái này' }]) for (const t of P.ATPL) { const x = adjConj(a, t.f); if (x?.pol) made.push({ jp: t.jp(sj, x) + '。', vi: cap(t.vi(sj, v)) }); }
        }
      }
      // thể khả năng trùng chữ với động từ khác (切れる, 割れる, 売れる…): câu trong dữ liệu có thể là của từ kia → chỉ lấy câu của chính từ này
      const kn = verbInfo(it) && c.fs.includes('kano') && conjugate(verbInfo(it), 'kano');
      const onlyOwn = !!kn && D.vocab.some(o => o.id !== it.id && plain(o.kanji || o.kana) === plain(kn.mark));
      const list = await V.examplesFor({ it, surf, kana: c.kana, made: shuffle(made), max: 10, onlyOwn });
      const b = box(); if (!b) return;
      b.innerHTML = list.length ? list.map(x => `<li><p class="snt hrt-vj" lang="ja" data-jp="${esc(x.jp)}" data-vi="${esc(x.vi)}">${rubyHTML(x.jp)}</p><p class="small muted">${esc(x.vi)} <span class="tag">${esc(x.situ)}</span></p></li>`).join('')
        : `<li class="small muted">Chưa có câu nào có đúng dạng <span lang="ja">${rubyHTML(c.mark)}</span> trong dữ liệu.</li>`;
      const sm = view.querySelector('.hrt-vd summary');
      if (sm && st.qid === qid) sm.innerHTML = list.length ? `Câu ví dụ (${list.length}) · đúng dạng <span lang="ja">${rubyHTML(c.mark)}</span> · chạm câu để xem giải thích` : 'Câu ví dụ (0)';
    } catch { const b = box(); if (b) b.innerHTML = '<li class="small muted">Chưa tìm được câu ví dụ.</li>'; }
  }

  // v67: chọn dạng hỏi — mỗi thể đang chọn có cơ hội như nhau; thể ghép được thì đôi khi ghép thêm một thể nữa (投げられていた)
  // v69 (C1): trong các dạng đó, dạng hay sai / điểm thấp ra nhiều hơn, dạng gần đủ 10 ra ít lại
  function pickForm(it, list) {
    const keys = [...new Set(list.flatMap(x => x.fs.filter(f => st.sel.has(f))))];
    const k = keys.length ? shuffle(keys)[0] : null;
    let cand = k ? list.filter(x => x.fs.includes(k)) : list;
    const two = cand.filter(x => x.lv >= 2), one = cand.filter(x => !(x.lv >= 2));
    if (two.length && one.length) cand = Math.random() < 0.35 ? two : one;
    const w = x => formWeight(crec(it.id, x.kana));
    let tot = cand.reduce((a, x) => a + w(x), 0), roll = Math.random() * tot;
    for (const x of cand) { roll -= w(x); if (roll <= 0) return x; }
    return cand[cand.length - 1];
  }
  // lỗi chia hay gặp cho dạng ghép: lỗi của thể đầu (投げれる, 投げさせる…) rồi chia tiếp thì như dạng đúng
  function comboWrong(it, c) {
    const first = c.fs[0], tail = c.fs.find(f => TNAME[f] && f !== first && !CHAIN.has(f)) || '';
    if (c.lv >= 2 || ASPECT.includes(first)) return [];
    return wrongForms(verbInfo(it), first).filter(m => /る$/.test(m)).map(m => {
      if (!tail) return m;
      const pv = pv1(m, reading(m));
      if (tail === 'masendeshita') { const x = conjugate(pv, 'masen'); return x && x.mark + 'でした'; }
      return conjugate(pv, tail)?.mark;
    }).filter(Boolean);
  }
  // v68: thể + thì đã chọn lần trước — theo tài khoản (D.prefs); bản v67 lưu riêng trong máy → chuyển sang một lần. v69: + nguồn, không nghe được, hỏi cả dạng đã thuộc
  const useSel = (v, t, h = {}) => {
    if (Array.isArray(v)) st.sel = new Set(v.filter(k => formLevel(k)));
    if (Array.isArray(t)) st.tails = new Set(t.filter(k => k in TNAME));
    if (Array.isArray(h.src) && formOnly) { const s2 = h.src.filter(k => SRC_WORDS[k] && k !== 'tim'); if (s2.length) st.src = new Set(s2); }
    st.quiet = !!h.q; st.inclM = !!h.im;
  };
  const start = () => { if (st.mode === 'form') startRound(); next(); };
  if (D.prefs.hrt) { useSel(D.prefs.hrt.f, D.prefs.hrt.t, D.prefs.hrt); start(); }
  else Promise.all([kvGet('hrtForms', null), kvGet('hrtTails', null)]).then(([v, t]) => {
    if (Array.isArray(v) || Array.isArray(t)) { useSel(v, t); saveSel(); }
  }).catch(() => { }).finally(start);
  if (st.mode === 'form' || items.length) setTimeout(() => import('./vidu.js').then(V => V.warmCorpus()).catch(() => { }), 1500); // dựng sẵn kho câu lúc rảnh
}
