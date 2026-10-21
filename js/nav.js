// Điều hướng quanh một lượt học (bản v7):
// nhớ trang trước khi vào bài · màn kết quả có nút "← Về …", đường dẫn, gợi ý bước tiếp, dạng bài khác ·
// nút Back của điện thoại: đang làm bài thì hỏi lại, ở màn kết quả thì về trang trước khi vào bài.
import { esc, rich } from './util.js';
import { D } from './data.js';
import { kvGet, kvSet } from './db.js';
import { confirmBox } from './ui.js';
import { status } from './srs.js';

const GT = { blank: 'Điền chỗ trống', conj: 'Chia động từ', order: 'Sắp xếp câu', star: 'Câu ★', spot: 'Tìm chỗ sai', situ: 'Chọn cách nói', build: 'Ghép câu Việt → Nhật', listen: 'Nghe → chọn', shift: 'Đổi lối nói', mix: 'Trộn các dạng' };
const norm = h => (h || '').replace(/^#\/?/, '');

// [mẫu đường dẫn, tên trang (có thể có furigana), trang cha]
const PAGES = [
  [/^$/, () => 'Trang chủ', []],
  [/^luyen$/, () => 'Luyện tập', []],
  [/^luyen\/cau$/, () => 'Ghép câu từ ví dụ', ['luyen']],
  [/^luyen\/ngphap$/, () => 'Ghép câu theo ngữ pháp', ['luyen']],
  [/^luyen\/the$/, () => 'Thể động từ trong câu', ['luyen']],
  [/^luyen\/tinhtu$/, () => 'Tính từ trong câu', ['luyen']],
  [/^luyen\/dem$/, () => 'Đếm số', ['luyen']],
  [/^luyen\/chia\?g=(.+)$/, m => { const g = D.items.get(decodeURIComponent(m[1])); return 'Luyện thể · ' + (g ? g.pattern : ''); }, ['nguphap']],
  [/^luyen\/chia$/, () => 'Luyện thể', ['luyen']],
  [/^hoc$/, () => 'Trắc nghiệm', ['luyen']],
  [/^ghep$/, () => 'Ghép 6 cặp', ['luyen']],
  [/^danhdau$/, () => 'Đã đánh dấu ★', ['luyen']],
  [/^onhon$/, () => 'Ôn hỗn hợp', []],
  [/^moi$/, () => 'Học từ mới', []],
  [/^moi\/doan$/, () => 'Học từ mới — đoán nghĩa trước', ['luyen']],
  [/^luyen\/hanviet$/, () => 'Đoán nghĩa từ Hán Việt', ['luyen']],
  [/^luyen\/denham$/, () => 'Phân biệt từ dễ nhầm', ['luyen']],
  [/^luyen\/giongchu$/, () => 'Chữ Hán trông giống', ['luyen']],
  [/^luyen\/cungdau$/, () => 'Đánh từ cứng đầu', ['luyen']],
  [/^nhanh3$/, () => 'Ôn nhanh 3 phút', []],
  [/^nhaclai$/, () => 'Nhắc lại từ mới hôm nay', []],
  [/^caidat(\/[a-z]+)?$/, () => 'Cài đặt', []],
  [/^dulieu$/, () => 'Dữ liệu', []],
  [/^on$/, () => 'Ôn từ đến hạn', []],
  [/^onchu$/, () => 'Ôn chữ Hán', []],
  [/^onngu$/, () => 'Ôn ngữ pháp', []],
  [/^chuhan$/, () => 'Chữ Hán', []],
  [/^chuhan\/on$/, () => 'Ôn chữ Hán', ['chuhan']],
  [/^nguphap$/, () => 'Ngữ pháp', []],
  [/^nguphap\/luyen\?t=(\w+)$/, m => 'Luyện ngữ pháp · ' + (GT[m[1]] || ''), ['nguphap']],
  [/^nguphap\/luyen(\?g=.*)?$/, () => 'Luyện ngữ pháp', ['nguphap']],
  [/^nguphap\/thithu$/, () => 'Thi thử', ['nguphap']],
  [/^nguphap\/hieu\?g=.+$/, () => 'Hiểu: chọn nghĩa', ['nguphap']],
  [/^nguphap\/tron\?g=.+$/, () => 'Luyện trộn mẫu dễ nhầm', ['nguphap']],
  [/^nguphap\/(.+)$/, m => { const g = D.items.get(decodeURIComponent(m[1])); return g ? g.pattern : 'Mẫu ngữ pháp'; }, ['nguphap']],
  [/^kho$/, () => 'Kho từ', []],
  [/^trinhdo$/, () => 'Kiểm tra trình độ', []],
  [/^dich(\?on)?$/, () => 'Luyện dịch', ['luyen']],
  [/^lotrinh$/, () => 'Lộ trình', []],
  [/^kana$/, () => 'Chặng 0 — Kana', ['lotrinh']],
  [/^moi\?p=(.+)$/, m => { const p = D.packs.find(x => x.id === decodeURIComponent(m[1])); return 'Học gói ' + (p ? p.title : ''); }, ['lotrinh']],
  [/^chuhan\/moi$/, () => 'Chữ Hán mới', ['chuhan']],
  [/^huongdan$/, () => 'Hướng dẫn học', []],
  [/^bai\/([^/?]+)(\?b=\d)?$/, m => { const l = lessonName(decodeURIComponent(m[1])); return l || 'Bài học'; }, ['lotrinh']],
  [/^bai\/([^/?]+)\/(hoc|cau|kiemtra)$/, m => (lessonName(decodeURIComponent(m[1])) || 'Bài học') + { hoc: ' · từ mới', cau: ' · câu', kiemtra: ' · kiểm tra' }[m[2]], ['lotrinh']],
  [/^onbai\/(.+)$/, () => 'Ôn bài cũ', []],
  [/^gocau\/(.+)$/, () => 'Gỡ câu 2 bước', ['lotrinh']],
  [/^hoclai\/([^/?]+)$/, m => 'Học lại ' + (/^N\d$/.test(decodeURIComponent(m[1])) ? 'chặng ' + decodeURIComponent(m[1]) : lessonName(decodeURIComponent(m[1])) || 'bài'), ['lotrinh']],
  [/^hoclai\/([^/?]+)\/(kt|hoc)$/, m => (m[2] === 'kt' ? 'Kiểm tra nhanh' : 'Học lại các mục quên'), ['lotrinh']],
  [/^tonghop\/(.+)$/, () => 'Tình huống thật', ['lotrinh']],
  [/^noiduoc$/, () => 'Nói được gì', ['lotrinh']],
  [/^doc$/, () => 'Hội thoại & bài đọc', ['luyen']],
  [/^doc\/([^/?]+)(\?m=\w+)?$/, m => D.items.get(decodeURIComponent(m[1]))?.title || 'Bài đọc', ['doc']],
];
function page(hash) {
  const h = norm(hash);
  for (const [re, name, parents] of PAGES) { const m = h.match(re); if (m) return { name: name(m), parents }; }
  return { name: 'Trang trước', parents: [] };
}
export const pageName = hash => page(hash).name;
// v32: trang cha (nút ‹ nổi khi không có trang trước trong app): theo bảng trên, không có thì lấy phần đầu đường dẫn, rồi Trang chủ
export function parentOf(hash) {
  const h = norm(hash), p = page(hash).parents;
  if (p.length) return '#/' + p[p.length - 1];
  const top = h.split(/[/?]/)[0];
  return top && top !== h ? '#/' + top : '#/';
}
export function trail(hash) {
  const p = page(hash);
  return [...p.parents.map(x => ['#/' + x, page('#/' + x).name]), [hash, p.name]];
}

// Trang tự bắt đầu lượt học khi mở (từ Trang chủ…) → quay lại trang đã mở nó
const AUTO = /^(moi|moi\/doan|on|onchu|onngu|onhon|nhanh3|nhaclai|chuhan\/moi|onbai\/.+)$/;
// tên bài học cho đường dẫn "← Về …" (lesson.js nạp sau nên đọc qua biến toàn cục)
const lessonName = id => { const x = globalThis.__lessonById?.(id); return x ? `Bài ${x.n}: ${x.title}` : ''; };
export function beginSession(ctx) {
  const h = norm(location.hash);
  let back = ctx.backTo; // trang đặt rõ (vd. luyện riêng một mẫu → về trang mẫu đó)
  if (!back) back = AUTO.test(h) ? (ctx.prevHash && !AUTO.test(norm(ctx.prevHash)) ? ctx.prevHash : '#/') : '#/' + h;
  ctx.back = back || '#/';
  // v32: lượt tự bắt đầu mở từ trang trước → lúc rời lượt thì lùi lịch sử về đúng trang đó (Back lần sau không mở lại lượt học)
  ctx.autoBack = !ctx.backTo && AUTO.test(h) && ctx.back === ctx.prevHash ? ctx.back : null;
  ctx.inRun = true;
  if (!history.state?.tntRun) history.pushState({ tntRun: 1 }, '');
}
// Về trang trước khi vào bài (nút ← Về…, nút ✕ khi chưa làm câu nào)
export function goBack(ctx) {
  if (history.state?.tntRun) { ctx.leaving = true; history.back(); } // bỏ mốc lịch sử của lượt học → bộ nghe popstate đưa về ctx.back
  else leaveRun(ctx);
}
function leaveRun(ctx) {
  ctx.inRun = false;
  if (ctx.autoBack && ctx.autoBack === ctx.back && (history.state?.tnIdx || 0) > 0) { ctx.autoBack = null; history.back(); return; }
  ctx.go(ctx.back || '#/', true);
}
export function initNav(ctx) {
  window.addEventListener('popstate', async () => {
    if (!ctx.inRun) return;
    if (ctx.leaving) { ctx.leaving = false; leaveRun(ctx); return; }
    const run = document.querySelector('#view .run');
    if (run?.classList.contains('run-lock')) { // luyện từ đã tim: chỉ nút ✕ mới thoát
      history.pushState({ tntRun: 1 }, '');
      const { toast } = await import('./util.js');
      toast('Bấm nút ✕ ở góc trên để thoát.');
      return;
    }
    if (run) {
      history.pushState({ tntRun: 1 }, ''); // giữ bài đang làm
      if (run.classList.contains('test')) { run.querySelector('[data-act=quit]')?.click(); return; } // thi thử tự hỏi nộp bài
      if (ctx.asking) return;
      ctx.asking = true;
      const yes = await confirmBox('Dừng lượt này? Các câu đã trả lời vẫn được lưu.', 'Dừng', 'Học tiếp');
      ctx.asking = false;
      if (yes) document.querySelector('#view .run [data-act=quit]')?.click();
      return;
    }
    leaveRun(ctx);
  });
}

// ---------- màn kết quả ----------
const LUYEN = [['luyen/cau', 'Ghép câu từ ví dụ'], ['luyen/chia', 'Luyện thể'], ['dich', 'Luyện dịch'], ['luyen/the', 'Thể động từ'], ['luyen/ngphap', 'Ghép theo ngữ pháp'], ['luyen/tinhtu', 'Tính từ'], ['hoc', 'Trắc nghiệm'], ['ghep', 'Ghép 6 cặp'], ['luyen/dem', 'Đếm số']];
const GTYPES = ['blank', 'order', 'star', 'build', 'spot', 'situ', 'shift', 'conj'];
function others(back) {
  const h = norm(back);
  const i = LUYEN.findIndex(([x]) => x === h);
  if (i >= 0) return [1, 2, 3].map(k => LUYEN[(i + k) % LUYEN.length]).map(([x, l]) => ['#/' + x, l]);
  const m = h.match(/^nguphap\/luyen(?:\?t=(\w+))?$/);
  if (m) {
    const j = Math.max(0, GTYPES.indexOf(m[1]));
    return [1, 2, 3].map(k => GTYPES[(j + k) % GTYPES.length]).map(t => ['#/nguphap/luyen?t=' + t, GT[t]]);
  }
  return [];
}
export function crumbHTML(ctx) {
  const t = trail(ctx.back || '#/');
  return `<nav class="crumb" aria-label="Đã vào bài từ">${t.map(([h, l]) => `<a href="${esc(h)}" data-nav="go">${rich(l)}</a>`).join('<span aria-hidden="true"> › </span>')}</nav>`;
}
// kind: 'learn' | 'test' | 'practice'
export function resultNavHTML(ctx, { kind = 'practice' } = {}) {
  const back = ctx.back || '#/';
  const os = kind === 'test' ? [] : others(back);
  return `<div class="res-nav">
      <button type="button" class="btn btn-ghost btn-block btn-back" data-nav="back">← Về ${rich(pageName(back))}</button>
      <div class="res-next" hidden></div>
      ${os.length ? `<p class="res-other-t">Dạng bài khác</p><div class="row-btns wrap res-other">${os.map(([h, l]) => `<a class="btn btn-ghost btn-sm" href="${esc(h)}" data-nav="go">${esc(l)}</a>`).join('')}</div>` : ''}
      ${back !== '#/' ? '<a class="res-home" href="#/" data-nav="go">Về trang chủ</a>' : ''}
    </div>`;
}
export function bindResultNav(view, ctx, { kind = 'practice' } = {}) {
  view.querySelectorAll('[data-nav]').forEach(a => {
    a.onclick = async e => {
      e.preventDefault();
      if (a.dataset.nav === 'back') return goBack(ctx);
      if (a.dataset.preset) { const p = JSON.parse(a.dataset.preset); await kvSet(p.key, { ...(await kvGet(p.key, {})), ...p.patch }); }
      ctx.inRun = false;
      ctx.go(a.getAttribute('href'), true);
    };
  });
  fillNext(view, ctx, kind);
}
// Gợi ý một bước tiếp theo
async function fillNext(view, ctx, kind) {
  const slot = view.querySelector('.res-next');
  if (!slot) return;
  const back = norm(ctx.back), here = norm(location.hash);
  let n = null;
  if (kind === 'learn') n = ['#/luyen/cau', 'Ghép câu với từ vừa học →', { key: 'pCau', patch: { source: 'today' } }];
  else if (kind !== 'test') {
    const { mixedDue } = await import('./practice.js');
    const d = mixedDue(), due = d.vocab.length + d.kanji.length + d.grammar.length + d.sent.length;
    if (due && here !== 'onhon' && back !== 'onhon') n = ['#/onhon', `Ôn hỗn hợp hôm nay · ${due} mục →`];
    else if (D.vocab.some(it => status(it) === 'new') && here !== 'moi' && back !== 'moi') n = ['#/moi', 'Học từ mới →'];
  }
  if (!n || !view.contains(slot)) return;
  slot.innerHTML = `<a class="btn btn-ghost btn-block btn-next" href="${n[0]}" data-nav="go" ${n[2] ? `data-preset='${esc(JSON.stringify(n[2]))}'` : ''}>${esc(n[1])}</a>`;
  slot.hidden = false;
  const a = slot.querySelector('a');
  a.onclick = async e => {
    e.preventDefault();
    if (n[2]) await kvSet(n[2].key, { ...(await kvGet(n[2].key, {})), ...n[2].patch });
    ctx.inRun = false;
    ctx.go(n[0], true);
  };
}
