// Đợt 8 (v55) — thêm cách giúp người Việt học nhanh:
//  1. Một chữ Việt – nhiều động từ Nhật (#/luyen/dongtu) · 2. Khẩu ngữ rút gọn (#/luyen/khaungu) · 6. Tiền tố – hậu tố Hán (#/luyen/tiento)
// Bài ở đây không đổi lịch ôn (rèn kỹ năng). Dữ liệu: data/viverb.json, data/kougo.json (tự sinh từ câu ví dụ); tiền tố / hậu tố tìm thẳng trong kho.
import { esc, rich, plain, shuffle, wordHTML, rubyHTML } from './util.js';
import { D, LEVELS } from './data.js';
import { status } from './srs.js';
import { opt, runDrill } from './drill.js';
import { chips, readChip, readChips, emptyState, sayBtn } from './ui.js';
import { kvGet } from './db.js';
import { setupPage } from './practice.js';
import { ttsReady } from './tts.js';

const T = s => rich(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
const lvField = o => `<fieldset><legend>Cấp độ <small>(không chọn = tất cả)</small></legend>${chips('levels', LEVELS.map(l => [l, l]), o.levels || [])}</fieldset>`;
const inLv = (o, x) => !o.levels?.length || o.levels.includes(x.level || x.lv);
const take = (arr, f, n) => { const out = []; for (const x of arr) { const q = f(x); if (q) out.push(q); if (out.length >= n) break; } return out; };
const back = '<a class="back" href="#/luyen">Các dạng bài</a>';
const cache = {};
const load = f => cache[f] || (cache[f] = fetch(`data/${f}.json`).then(r => (r.ok ? r.json() : {})).catch(() => ({})));

// ======================================================================
// 1. MỘT CHỮ VIỆT – NHIỀU ĐỘNG TỪ NHẬT
// ======================================================================
function vvQ(g, v, ex) {
  if (!ex.jp.endsWith(v.v)) return null;
  const ok = new Set([v.v, ...(ex.alt || [])]);
  const others = g.verbs.filter(x => !ok.has(x.v)).map(x => x.v);
  if (!others.length) return null;
  const opts = [v.v, ...shuffle(others).slice(0, 3)];
  const head = ex.jp.slice(0, -v.v.length);
  return { kind: 'choice', tag: `"${g.vi}" là động từ nào?`, level: '', noCmp: true,
    prompt: `<p class="prompt-vi">${T(ex.vi)}</p><p class="prompt-jp" lang="ja">${rich(head)}<span class="blank" aria-label="chỗ trống">　　　</span></p>`,
    hint: `Tiếng Việt "${g.vi}" — tiếng Nhật chia nhỏ`, opts: shuffle(opts).map(x => opt(x, rich(x))), answer: v.v,
    after: `<p class="small"><span lang="ja">${rich(ex.jp)}</span> — ${T(ex.vi)}${(ex.alt || []).length ? ` (cũng nói: ${ex.alt.map(a => `<span lang="ja">${rich(head + a)}</span>`).join(', ')})` : ''}</p>${vvTable(g, v.v)}` };
}
const vvTable = (g, hl) => `<table class="gn-tbl small vv-tbl"><tbody>${g.verbs.map(x => `<tr${x.v === hl ? ' class="is-ok"' : ''}><td lang="ja">${rich(x.v)}</td><td>${T(x.use)}</td></tr>`).join('')}</tbody></table>`;
export async function renderViVerb(view, ctx) {
  const d = await load('viverb'), G = d.groups || [];
  if (!G.length) { view.innerHTML = back + emptyState('Chưa có dữ liệu. Cập nhật app khi có mạng.'); return; }
  const o = { groups: [], ...(await kvGet('pVV', {})) };
  const f = setupPage(view, ctx, { key: 'pVV', title: 'Một chữ Việt – nhiều động từ Nhật', route: '#/luyen/dongtu',
    intro: T('Tiếng Việt có nhiều động từ "chung chung" mà tiếng Nhật chia nhỏ: **mặc** áo 着[き]る, mặc quần はく, đội mũ かぶる; **đeo** kính かける, đeo đồng hồ つける… Dịch thẳng từ tiếng Việt là sai. Mỗi câu: cụm có tân ngữ + nghĩa Việt, chọn động từ đúng trong các động từ cùng nhóm. Sai thì app hiện bảng cả nhóm. Bài này không đổi lịch ôn.'),
    fields: `<fieldset><legend>Nhóm <small>(không chọn = tất cả)</small></legend>${chips('groups', G.map(g => [g.vi, g.vi]), o.groups || [])}</fieldset>`,
    read: f => ({ groups: readChips(f, 'groups') }),
    build: x => {
      const gs = G.filter(g => !x.groups?.length || x.groups.includes(g.vi));
      const all = shuffle(gs.flatMap(g => g.verbs.flatMap(v => v.ex.map(ex => [g, v, ex]))));
      return take(all, ([g, v, ex]) => vvQ(g, v, ex), Math.min(x.count, 300));
    }, drillOpts: { noReview: true } });
  // bảng tra từng nhóm (gập lại)
  (await f)?.insertAdjacentHTML('afterend', `<h2 class="h2">Bảng tra</h2>${G.map(g => `<details class="vv-g"><summary><b>${esc(g.vi)}</b> <small class="muted">${g.verbs.map(v => plain(v.v)).join(' · ')}</small></summary>
    <p class="small">${T(g.intro)}</p>
    ${g.verbs.map(v => `<div class="vv-v"><p><b lang="ja">${rich(v.v)}</b> — ${T(v.use)}</p><ul class="small">${v.ex.map(ex => `<li><span lang="ja">${rich(ex.jp)}</span> — ${T(ex.vi)}</li>`).join('')}</ul></div>`).join('')}
  </details>`).join('')}`);
}

// ======================================================================
// 2. KHẨU NGỮ RÚT GỌN
// ======================================================================
const RULE = {
  teru: '〜ている → 〜てる (bỏ い): đang…, trạng thái. 〜ています → 〜てます, 〜ていた → 〜てた.',
  toku: '〜ておく → 〜とく (〜でおく → 〜どく): làm sẵn, để sẵn. 〜ておいて → 〜といて.',
  chau: '〜てしまう → 〜ちゃう (〜でしまう → 〜じゃう): lỡ…, xong hẳn. 〜てしまった → 〜ちゃった.',
  teku: '〜ていく → 〜てく: … đi (mang đi, dần đi). 〜ていった → 〜てった.',
  nakya: '〜なければならない → 〜なきゃいけない (hay chỉ 〜なきゃ): phải…',
  cha: '〜てはいけない → 〜ちゃいけない (〜ではいけない → 〜じゃいけない): không được…',
  ja: 'では → じゃ: 〜ではない → 〜じゃない, 〜ではありません → 〜じゃありません.',
  tte: 'と言う / という → って言う / っていう: nói rằng, gọi là.',
  nda: 'のです / のだ → んです / んだ: giải thích, hỏi lý do (どうしたんですか).',
  hen: 'Kansai: 〜ない → 〜へん (行かへん = 行かない, 食べへん = 食べない, せえへん = しない).',
  ya: 'Kansai: だ → や (やから = だから, やった = だった, そうや = そうだ).',
  honma: 'Kansai: 本当[ほんとう]に → ほんまに.',
  meccha: 'Kansai: とても / すごく → めっちゃ.',
};
const ruleHTML = x => `<ul class="small kr-rules">${[...new Set(x.r)].map(r => `<li>${T(RULE[r] || r)}</li>`).join('')}</ul>`;
const kgAfter = x => `<p class="small">${x.k === 'kansai' ? 'Kansai' : 'Nói ở xưởng'}: <span lang="ja">${rich(x.cas)}</span> ${sayBtn(plain(x.cas))}</p>
  <p class="small">Câu đầy đủ: <span lang="ja">${rich(x.std)}</span></p><p class="small">${esc(x.vi)}</p>${ruleHTML(x)}`;
// A: nghe / đọc câu nói → chọn nghĩa
function kgMean(x, pool, listen) {
  const ds = shuffle(pool.filter(y => y !== x && y.vi !== x.vi && y.lv === x.lv)).slice(0, 3);
  if (ds.length < 3) return null;
  return { kind: 'choice', tag: x.k === 'kansai' ? 'Kansai: hiểu câu' : listen ? 'Nghe câu nói nhanh' : 'Đọc câu nói ở xưởng', level: x.lv, noCmp: true,
    ...(listen ? { say: plain(x.cas), autoSay: true, prompt: '<p class="prompt-hint">Bấm loa để nghe lại. Câu này nghĩa là gì?</p>' } : { prompt: `<p class="prompt-jp" lang="ja">${rich(x.cas)}</p>` }),
    hint: 'Chọn nghĩa đúng', opts: shuffle([x, ...ds]).map(y => opt(y.vi, esc(y.vi), false)), answer: x.vi, after: kgAfter(x) };
}
// B: câu đầy đủ → chọn cách nói đúng (bẫy: てる / とく / ちゃう lẫn nhau)
function kgPick(x) {
  if ((x.alt || []).length !== 2) return null;
  return { kind: 'choice', tag: 'Câu đầy đủ → cách nói ở xưởng', level: x.lv, noCmp: true,
    prompt: `<p class="prompt-jp" lang="ja">${rich(x.std)}</p><p class="prompt-hint">${esc(x.vi)}</p>`, hint: 'Người Nhật nói gọn câu này thế nào?',
    opts: shuffle([x.cas, ...x.alt]).map(y => opt(y, rich(y))), answer: x.cas, after: kgAfter(x) };
}
export async function renderKhauNgu(view, ctx) {
  const d = await load('kougo'), L = d.items || [];
  if (!L.length) { view.innerHTML = back + emptyState('Chưa có dữ liệu. Cập nhật app khi có mạng.'); return; }
  const tts = ttsReady();
  const o = { kind: 'tron', levels: [], ...(await kvGet('pKN', {})) };
  setupPage(view, ctx, { key: 'pKN', title: 'Nghe hiểu khẩu ngữ rút gọn', route: '#/luyen/khaungu',
    intro: T('Ở xưởng người Nhật nói nhanh và rút gọn: 〜ている → **〜てる**, 〜ておく → **〜とく**, 〜てしまう → **〜ちゃう**, 〜なければ → **〜なきゃ**, という → **って**; người Kansai còn nói 〜**へん**, 〜**や**, **めっちゃ**. Sách dạy dạng đầy đủ nên nghe không ra. Câu luyện là câu ví dụ trong kho được đổi sang cách nói. Bài này không đổi lịch ôn.') + (tts ? '' : ' <b>Máy chưa có giọng đọc tiếng Nhật</b> nên dạng nghe đổi thành đọc.'),
    fields: `<fieldset><legend>Dạng câu</legend>${chips('kind', [['tron', 'Trộn'], ['nghe', tts ? 'Nghe → nghĩa' : 'Đọc → nghĩa'], ['chon', 'Câu đầy đủ → cách nói'], ['kansai', 'Kansai']], o.kind, false)}</fieldset>${lvField(o)}`,
    read: f => ({ kind: readChip(f, 'kind'), levels: readChips(f, 'levels') }),
    build: x => {
      const n = Math.min(x.count, 300), th = shuffle(L.filter(y => y.k === 'thuong' && inLv(x, y))), ks = shuffle(L.filter(y => y.k === 'kansai' && inLv(x, y)));
      const poolT = L.filter(y => y.k === 'thuong'), poolK = L.filter(y => y.k === 'kansai');
      if (x.kind === 'nghe') return take(th, y => kgMean(y, poolT, tts), n);
      if (x.kind === 'chon') return take(th, kgPick, n);
      if (x.kind === 'kansai') return take(ks, y => kgMean(y, poolK, false), n);
      const a = take(th, y => kgMean(y, poolT, tts), Math.ceil(n * 0.4)), b = take(th.slice(a.length), kgPick, Math.ceil(n * 0.35));
      return shuffle([...a, ...b, ...take(ks, y => kgMean(y, poolK, false), n - a.length - b.length)]);
    }, drillOpts: { noReview: true } });
}

// ======================================================================
// 6. TIỀN TỐ – HẬU TỐ HÁN
// ======================================================================
// [chữ, vị trí (pre / suf), nhóm, âm Hán Việt, nghĩa, các cách đọc]
const AFF = [
  ['不', 'pre', 'phudinh', 'BẤT', 'không (thiếu, chưa tốt): 不足, 不便, 不良', ['ふ', 'ぶ']],
  ['無', 'pre', 'phudinh', 'VÔ', 'không có: 無料 = không mất tiền, 無断 = không xin phép', ['む', 'ぶ']],
  ['未', 'pre', 'phudinh', 'VỊ', 'CHƯA (sẽ có): 未定 = chưa định, 未払い = chưa trả', ['み']],
  ['非', 'pre', 'phudinh', 'PHI', 'không phải, trái với: 非常 = bất thường, 非課税 = không chịu thuế', ['ひ']],
  ['代', 'suf', 'tien', 'ĐẠI', 'tiền trả cho thứ dùng hằng ngày: 電気代, ガス代, バス代', ['だい']],
  ['料', 'suf', 'tien', 'LIỆU', 'phí dịch vụ, phí có quy định: 手数料, 送料, 授業料', ['りょう']],
  ['費', 'suf', 'tien', 'PHÍ', 'chi phí (khoản chi): 交通費, 生活費, 医療費', ['ひ', 'び', 'ぴ']],
  ['賃', 'suf', 'tien', 'NHẪM', 'tiền thuê, tiền công: 家賃, 運賃', ['ちん']],
  ['金', 'suf', 'tien', 'KIM', 'khoản tiền: 税金, 現金, 貯金, 罰金', ['きん', 'ぎん', 'かね', 'がね']],
  ['者', 'suf', 'nguoi', 'GIẢ', 'người (làm việc / ở tình trạng đó): 担当者, 責任者, 初心者', ['しゃ', 'じゃ']],
  ['員', 'suf', 'nguoi', 'VIÊN', 'thành viên của tổ chức: 会社員, 店員, 作業員', ['いん']],
  ['家', 'suf', 'nguoi', 'GIA', 'nhà chuyên môn (nghề tự do): 作家, 専門家', ['か']],
  ['師', 'suf', 'nguoi', 'SƯ', 'người làm nghề chuyên môn (thầy): 教師, 医師, 看護師', ['し']],
  ['士', 'suf', 'nguoi', 'SĨ', 'người có bằng / chứng chỉ: 弁護士, 消防士, 介護福祉士', ['し']],
  ['手', 'suf', 'nguoi', 'THỦ', 'người làm (lái, chơi): 運転手, 選手, 歌手', ['しゅ']],
  ['化', 'suf', 'tinhchat', 'HÓA', '-hóa, trở thành: 自動化, 機械化', ['か']],
  ['性', 'suf', 'tinhchat', 'TÍNH', 'tính chất: 安全性, 可能性, 重要性', ['せい', 'しょう']],
  ['的', 'suf', 'tinhchat', 'ĐÍCH', 'mang tính, về mặt: 具体的, 基本的', ['てき']],
  ['用', 'suf', 'tinhchat', 'DỤNG', 'dùng cho: 業務用, 子供用, 生食用', ['よう']],
  ['製', 'suf', 'tinhchat', 'CHẾ', 'làm bằng / làm tại: 日本製, 木製', ['せい']],
  ['中', 'suf', 'tinhchat', 'TRUNG', 'đang (làm), trong lúc: 作業中, 会議中, 営業中', ['ちゅう', 'じゅう']],
  ['場', 'suf', 'noi', 'TRƯỜNG', 'nơi (rộng, làm việc): 工場, 駐車場, 売り場', ['じょう', 'ば']],
  ['所', 'suf', 'noi', 'SỞ', 'chỗ, cơ quan: 事務所, 役所, 研究所', ['しょ', 'じょ', 'どころ', 'ところ']],
  ['室', 'suf', 'noi', 'THẤT', 'phòng: 会議室, 休憩室, 冷凍室', ['しつ']],
  ['館', 'suf', 'noi', 'QUÁN', 'tòa nhà lớn (công cộng): 図書館, 映画館', ['かん']],
  ['店', 'suf', 'noi', 'ĐIẾM', 'cửa hàng: 喫茶店, 売店', ['てん']],
  ['局', 'suf', 'noi', 'CỤC', 'cục, bưu cục, nhà thuốc: 郵便局, 薬局', ['きょく']],
  ['課', 'suf', 'noi', 'KHÓA', 'phòng (ban) trong cơ quan: 総務課, 税務課', ['か']],
  ['書', 'suf', 'giay', 'THƯ', 'giấy viết, văn bản: 申請書, 証明書, 契約書', ['しょ']],
  ['証', 'suf', 'giay', 'CHỨNG', 'giấy / thẻ chứng nhận: 保険証, 免許証', ['しょう']],
  ['票', 'suf', 'giay', 'PHIẾU', 'phiếu: 住民票, 源泉徴収票', ['ひょう', 'ぴょう']],
  ['届', 'suf', 'giay', 'GIỚI', 'đơn trình báo: 欠勤届, 退職届', ['とどけ', 'どけ']],
];
const AG = { phudinh: 'Phủ định (đứng trước)', tien: 'Các loại "tiền"', nguoi: 'Chỉ người', tinhchat: 'Tính chất, dùng cho', noi: 'Nơi chốn, cơ quan', giay: 'Giấy tờ' };
const hira = s => String(s || '').replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60));
// từ trong kho có tiền tố / hậu tố: tách được cách đọc phần gốc (để vẫn có furigana)
let _aw = null;
function affWords() {
  if (_aw) return _aw;
  const out = [];
  for (const a of AFF) {
    const [c, pos, , , , rs] = a;
    for (const w of D.vocab) {
      const k = w.kanji || '';
      if (k.length < 2 || !/^[一-鿿々ぁ-ゖァ-ヺー]+$/.test(k)) continue;
      const base = pos === 'pre' ? (k[0] === c ? k.slice(1) : null) : (k[k.length - 1] === c ? k.slice(0, -1) : null);
      if (!base || /^[ぁ-ゖ]/.test(base)) continue;
      const kn = hira(w.kana);
      const r = rs.find(x => (pos === 'pre' ? kn.startsWith(x) : kn.endsWith(x)) && kn.length > x.length);
      if (!r) continue;
      const br = pos === 'pre' ? kn.slice(r.length) : kn.slice(0, -r.length);
      if (!/^[一-鿿々]+$/.test(base)) continue; // phần gốc toàn chữ Hán thì mới ghép furigana gọn
      out.push({ a, w, base, br, r });
    }
  }
  return (_aw = out);
}
function affQ(x, all) {
  const [c, pos, grp] = x.a;
  const exists = new Set(all.filter(y => y.base === x.base).map(y => y.a[0]));
  const cands = AFF.filter(b => b[2] === grp && b[1] === pos && b[0] !== c && !exists.has(b[0])).map(b => b[0]);
  if (cands.length < 2) return null;
  const opts = [c, ...shuffle(cands).slice(0, 3)];
  const bm = `${x.base}[${x.br}]`, blank = '<span class="blank" aria-label="chỗ trống">　</span>';
  return { kind: 'choice', tag: AG[grp], level: x.w.level, noCmp: true,
    prompt: `<p class="prompt-vi">${esc(x.w.vi)}</p><p class="prompt-jp" lang="ja">${pos === 'pre' ? blank + rubyHTML(bm) : rubyHTML(bm) + blank}</p>`,
    hint: pos === 'pre' ? 'Chọn tiền tố đúng' : 'Chọn hậu tố đúng',
    opts: shuffle(opts).map(k => { const a = AFF.find(b => b[0] === k); return opt(k, `<b lang="ja" data-bare>${esc(k)}</b> <small>${esc(a[3])}</small>`); }), answer: c,
    after: `<p class="small"><span lang="ja">${wordHTML(x.w, 'furi')}</span> — ${esc(x.w.vi)}</p><table class="gn-tbl small"><tbody>${AFF.filter(b => opts.includes(b[0])).map(b => `<tr${b[0] === c ? ' class="is-ok"' : ''}><td lang="ja" data-bare>${esc(b[0])} <small>${esc(b[3])}</small></td><td>${T(affNote(b))}</td></tr>`).join('')}</tbody></table>` };
}
// ví dụ trong ghi chú: lấy từ kho để có furigana
const affNote = b => { const [c, pos] = b, ws = affWords().filter(x => x.a === b).slice(0, 3).map(x => x.w.kf || `${x.w.kanji}[${x.w.kana}]`); return b[4].split(':')[0] + (ws.length ? ': ' + ws.join(', ') : ''); };
export async function renderTienTo(view, ctx) {
  const all = affWords();
  const o = { groups: [], source: 'all', levels: [], ...(await kvGet('pTO', {})) };
  const f = setupPage(view, ctx, { key: 'pTO', title: 'Tiền tố – hậu tố Hán', route: '#/luyen/tiento',
    intro: T('Nhiều từ N3 – N1 là "gốc + tiền tố / hậu tố". Biết nghĩa các chữ này (kèm âm Hán Việt) là đoán được từ mới: **未[み]** VỊ = chưa (未定[みてい]), **無[む]** VÔ = không có (無料[むりょう]); 〜**代[だい]**, 〜**料[りょう]**, 〜**費[ひ]**, 〜**賃[ちん]** đều là "tiền" nhưng dùng khác nhau. Mỗi câu: nghĩa + phần gốc, chọn tiền tố / hậu tố đúng. Bài này không đổi lịch ôn.'),
    fields: `<fieldset><legend>Nhóm <small>(không chọn = tất cả)</small></legend>${chips('groups', Object.entries(AG), o.groups || [])}</fieldset>
      <fieldset><legend>Lấy từ nào</legend>${chips('source', [['learned', 'Từ đã học'], ['all', 'Tất cả']], o.source, false)}</fieldset>${lvField(o)}`,
    read: f => ({ groups: readChips(f, 'groups'), source: readChip(f, 'source'), levels: readChips(f, 'levels') }),
    build: x => take(shuffle(all.filter(y => (!x.groups?.length || x.groups.includes(y.a[2])) && inLv(x, y.w) && (x.source !== 'learned' || status(y.w) !== 'new'))), y => affQ(y, all), Math.min(x.count, 300)),
    drillOpts: { noReview: true }, empty: 'Chưa có từ nào cho lựa chọn này. Chọn "Tất cả".' });
  (await f)?.insertAdjacentHTML('afterend', `<h2 class="h2">Bảng tra</h2>${Object.entries(AG).map(([g, name]) => `<details class="vv-g"><summary><b>${esc(name)}</b> <small class="muted" lang="ja">${AFF.filter(b => b[2] === g).map(b => b[0]).join(' ')}</small></summary>
    <table class="gn-tbl small"><tbody>${AFF.filter(b => b[2] === g).map(b => `<tr><td lang="ja" data-bare><b>${b[1] === 'suf' ? '〜' : ''}${esc(b[0])}${b[1] === 'pre' ? '〜' : ''}</b><br><small>${esc(b[3])}</small></td><td>${T(affNote(b))}<br><small class="muted">${all.filter(x => x.a === b).length} từ trong kho</small></td></tr>`).join('')}</tbody></table></details>`).join('')}`);
}
