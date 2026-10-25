// v71: CÂU THEO DẠNG — câu thật viết sẵn cho từng dạng chia (đơn + ghép thì) của từng động từ / tính từ.
// Chỉ dạng tự nhiên với chính từ đó, mỗi dạng 1 câu; kiểm bằng máy (đúng dạng của đúng từ, đủ furigana, có câu dịch, có tình huống).
// Tệp data/cauthe/<cấp>.json?v=<mã nội dung> (N5, N4; N3 trở lên nằm trong nội dung khóa của cấp đó — v72) (tải khi cần, giữ trong bộ nhớ đệm dữ liệu để dùng khi không có mạng):
//   { v, level, n, w: { '<mã từ>': [[kana của dạng, mã thể, câu (dạng bọc [[ ]]), câu dịch, tình huống], …] } }
// Mã thể: 'masu', 'ukemi', 'adj:nai'… hoặc dạng ghép 'ukemi+teiru+mashita' (thái → thể ghép → thì).
// Dùng ở: Chuyển thể (chỉ hỏi dạng có câu; câu ví dụ đầu tiên; "Điền dạng vào câu"), thẻ từ (bảng Chia thể: chạm "Câu ví dụ"),
// bảng "Ngữ pháp dùng thể X", Luyện thể → Thể trong câu, Thể động từ trong câu.
import { esc, rubyHTML } from './util.js';

export const CT_FILES = { N4: 'data/cauthe/n4.json?v=e3e93045', N5: 'data/cauthe/n5.json?v=65a53a7b' };
export const CT_CTX = { doisong: 'Đời sống', xuong: 'Xưởng', thutuc: 'Thủ tục', hoithoai: 'Hội thoại', kansai: 'Kansai' };
const W = new Map(); // mã từ → Map(kana → câu)
const F = new Map(); // mã từ → Map(mã thể → câu)
const loaded = new Set(), pending = new Map();
// v72: cấp khóa (N3…) không có tệp công khai: câu nằm trong nội dung khóa của cấp đó (kv 'lock:<cấp>'.appdata.cauthe), chỉ có khi cấp đã mở
const LOCKED = ['N3', 'N2', 'N1'];
export const ctHas = lv => !!CT_FILES[lv] || LOCKED.includes(lv);
export const ctReady = lv => loaded.has(lv);
async function lockCT(l) {
  const [{ hasLockContent }, { kvGet }] = await Promise.all([import('./data.js'), import('./db.js')]);
  if (!hasLockContent(l)) return; // chưa mở cấp này: không có câu (lần sau mở thì tải lại)
  const ext = (await kvGet('lock:' + l, null))?.appdata?.cauthe;
  if (ext?.w) ingest(ext);
  loaded.add(l);
}
// tải dữ liệu các cấp (mặc định: mọi cấp đang có); trả về true khi tải xong hết, false khi lỗi (không có mạng, chưa có trong bộ nhớ)
export function loadCT(levels = [...Object.keys(CT_FILES), ...LOCKED]) {
  return Promise.all(levels.filter(l => ctHas(l) && !loaded.has(l)).map(l => {
    if (!pending.has(l)) {
      const job = CT_FILES[l]
        ? fetch(CT_FILES[l]).then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)))).then(j => { ingest(j); loaded.add(l); })
        : lockCT(l);
      pending.set(l, job.finally(() => pending.delete(l)));
    }
    return pending.get(l);
  })).then(() => true, () => false);
}
function ingest(j) {
  for (const [id, rows] of Object.entries(j.w || {})) {
    const m = W.get(id) || new Map(), mf = F.get(id) || new Map();
    for (const [k, f, jp, vi, ctx] of rows) { const o = { id, k, f, jp, vi, ctx }; m.set(k, o); if (!mf.has(f)) mf.set(f, o); }
    W.set(id, m); F.set(id, mf);
  }
}
export const ctGet = (id, kana) => W.get(id)?.get(kana) || null;
export const ctByForm = (id, f) => F.get(id)?.get(f) || null;
export const ctOf = id => W.get(id) || null;
// cấp của từ đã có dữ liệu và đã tải: chỉ hỏi / chỉ hiện dạng có câu
// v72: theo từng từ — cấp đã có dữ liệu nhưng từ chưa có câu nào thì hỏi như cũ
export const ctGate = it => !!(it && !globalThis.__tnNoCT && ctReady(it.level) && W.has(it.id)); // __tnNoCT: chỉ dùng trong bài kiểm bộ chọn thể (v67, v68)
// câu có chỗ trống thay cho dạng ([[…]] → \u0000)
export const ctFrame = jp => jp.replace(/\[\[(.+?)\]\](?!\])/, '\u0000');
export const ctSitu = o => CT_CTX[o?.ctx] || '';
// một câu dạng HTML (chạm câu → bảng giải thích câu)
export const ctSentHTML = (o, extra = '') => `<p class="snt ct-s" lang="ja" data-jp="${esc(o.jp)}" data-vi="${esc(o.vi)}">${rubyHTML(o.jp)}</p><p class="small muted ct-vi">${esc(o.vi)}${ctSitu(o) ? ` <span class="tag">${esc(ctSitu(o))}</span>` : ''}${extra}</p>`;

// ---- thẻ từ: bảng Chia thể / Các dạng — dạng có câu thì có nút "Câu ví dụ" (chạm để mở / đóng câu ngay dưới hàng) ----
export const ctBtnHTML = (id, kana) => (ctGet(id, kana) ? `<button type="button" class="ctab-exb" data-ctex="${esc(kana)}" data-ctw="${esc(id)}" aria-expanded="false">Câu ví dụ ›</button>` : '');
// bảng dựng lúc dữ liệu chưa tải: tải xong thì gắn nút vào các hàng đang hiện
export function ensureCT(it) {
  if (!it || !ctHas(it.level) || ctReady(it.level)) return;
  loadCT([it.level]).then(ok => {
    if (!ok || !ctReady(it.level)) return;
    document.querySelectorAll(`[data-ctcell][data-ctw="${CSS.escape(it.id)}"]`).forEach(td => {
      if (td.querySelector('.ctab-exb')) return;
      const h = ctBtnHTML(it.id, td.dataset.ctk);
      if (h) td.insertAdjacentHTML('beforeend', h);
    });
  });
}
export function toggleCTRow(b) {
  const tr = b.closest('tr'), nx = tr?.nextElementSibling;
  if (!tr) return;
  if (nx?.classList.contains('ctab-exrow')) { nx.remove(); b.setAttribute('aria-expanded', 'false'); b.textContent = 'Câu ví dụ ›'; return; }
  const o = ctGet(b.dataset.ctw, b.dataset.ctex);
  if (!o) return;
  tr.insertAdjacentHTML('afterend', `<tr class="ctab-exrow"><td colspan="${tr.children.length}">${ctSentHTML(o)}</td></tr>`);
  b.setAttribute('aria-expanded', 'true'); b.textContent = 'Ẩn câu ‹';
}
