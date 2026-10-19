// v32: chọn phông chữ tiếng Nhật và tiếng Việt.
// Phông "mặc định" dùng phông có sẵn trong máy (không cần mạng). Phông khác tải từ Google Fonts khi chọn (cần mạng lần đầu);
// service worker giữ lại các tệp phông đã tải nên sau đó dùng được khi không có mạng.
// Phông tiếng Nhật được Google chia nhỏ theo nhóm chữ: chỉ tải phần chữ đang hiện trên màn hình.
// Chữ nào phông không có (chữ Hán hiếm) thì tự lấy từ phông mặc định của máy.

// [mã, nhóm, tên hiện, tên phông Google, các độ đậm]
export const JP_FONTS = [
  ['gothic', 'thuong', 'Gothic — không chân (mặc định của máy)', null],
  ['mincho', 'thuong', 'Mincho — có chân, giống giấy tờ', 'Noto Serif JP', '400;700'],
  ['bizud', 'thuong', 'UD Gothic — nét rõ, dễ đọc', 'BIZ UDPGothic', '400;700'],
  ['shippori', 'thuong', 'Mincho thanh lịch', 'Shippori Mincho', '400;600'],
  ['klee', 'viettay', 'Viết tay chuẩn (giống chữ sách giáo khoa)', 'Klee One', '400;600'],
  ['yomogi', 'viettay', 'Viết tay nhẹ nhàng', 'Yomogi'],
  ['hachimaru', 'viettay', 'Viết tay tròn, dễ thương', 'Hachi Maru Pop'],
  ['yusei', 'viettay', 'Viết bút dạ', 'Yusei Magic'],
  ['syuku', 'thuphap', 'Thư pháp bút lông', 'Yuji Syuku'],
  ['boku', 'thuphap', 'Thư pháp nét đậm', 'Yuji Boku'],
  ['kurenaido', 'thuphap', 'Bút lông mềm', 'Zen Kurenaido'],
  ['zenmaru', 'memmai', 'Tròn, mềm mại', 'Zen Maru Gothic', '400;700'],
  ['kiwimaru', 'memmai', 'Tròn, nét bút', 'Kiwi Maru', '400;500'],
  ['mplusr', 'memmai', 'Tròn, hiện đại', 'M PLUS Rounded 1c', '400;700'],
];
export const VI_FONTS = [
  ['system', 'thuong', 'Mặc định của máy', null],
  ['bevn', 'thuong', 'Be Vietnam Pro — làm riêng cho tiếng Việt', 'Be Vietnam Pro', '400;600;700'],
  ['lexend', 'thuong', 'Lexend — rõ, dễ đọc', 'Lexend', '400;600;700'],
  ['notoserif', 'thuong', 'Có chân, như chữ sách', 'Noto Serif', '400;700'],
  ['lora', 'thuong', 'Có chân, mềm', 'Lora', '400;600;700'],
  ['mali', 'viettay', 'Viết tay', 'Mali', '400;600;700'],
  ['pangolin', 'viettay', 'Viết tay bút bi', 'Pangolin'],
  ['patrick', 'viettay', 'Viết tay chữ in', 'Patrick Hand'],
  ['itim', 'viettay', 'Viết tay tròn', 'Itim'],
  ['dancing', 'thuphap', 'Thư pháp nét liền', 'Dancing Script', '400;700'],
  ['charm', 'thuphap', 'Thư pháp mềm', 'Charm', '400;700'],
  ['nunito', 'memmai', 'Tròn, mềm mại', 'Nunito', '400;600;700;800'],
  ['quicksand', 'memmai', 'Tròn, nét mảnh', 'Quicksand', '400;600;700'],
];
export const FONT_GROUPS = [['thuong', 'Thường'], ['viettay', 'Viết tay'], ['thuphap', 'Thư pháp'], ['memmai', 'Mềm mại']];
export const SAMPLE = { jp: '手を洗ってください。冷凍・解凍', vi: 'Rửa tay trước khi vào xưởng. Ẩm ướt, nhiệt độ' };

const list = kind => (kind === 'jp' ? JP_FONTS : VI_FONTS);
export const fontOf = (kind, id) => list(kind).find(f => f[0] === id) || list(kind)[0];
const MINCHO = new Set(['mincho', 'shippori']);
// phông máy dự phòng cho từng lựa chọn
export const fallback = (kind, id) => (kind === 'jp' ? (MINCHO.has(id) ? 'var(--jp-mincho)' : 'var(--jp-gothic)') : 'var(--ui-sys)');
// địa chỉ CSS của Google Fonts
const cssURL = (f, text) => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f[3]).replace(/%20/g, '+')}${f[4] && !text ? ':wght@' + f[4] : ''}${text ? '&text=' + encodeURIComponent(text) : '&display=swap'}`;
// chuỗi font-family (phông chọn + phông máy dự phòng)
export function stack(kind, id) {
  const f = fontOf(kind, id);
  return (f[3] ? `"${f[3]}", ` : '') + fallback(kind, f[0]);
}

function setLink(id, href) {
  let l = document.getElementById(id);
  if (!href) { l?.remove(); return; }
  if (l && l.getAttribute('href') === href) return;
  if (!l) { l = document.createElement('link'); l.id = id; l.rel = 'stylesheet'; l.crossOrigin = 'anonymous'; document.head.append(l); }
  l.href = href;
}
// Gọi từ applySettings mỗi lần đổi cài đặt
export function applyFonts(S) {
  const r = document.documentElement.style;
  const jp = fontOf('jp', S.jpFont), vi = fontOf('vi', S.viFont);
  setLink('font-jp', jp[3] ? cssURL(jp) : '');
  setLink('font-vi', vi[3] ? cssURL(vi) : '');
  r.setProperty('--jp', stack('jp', jp[0]));
  if (vi[3]) r.setProperty('--ui', stack('vi', vi[0])); else r.removeProperty('--ui');
}

// Xem trước trong Cài đặt: chỉ tải đúng mấy chữ mẫu (vài KB mỗi phông), đặt tên riêng "pv-…" để không lẫn với phông đang dùng
const pv = new Set();
export const pvFamily = (kind, id) => `pv-${kind}-${id}`;
export async function loadPreview(kind, id) {
  const f = fontOf(kind, id), key = kind + ':' + id;
  if (!f[3] || pv.has(key)) return;
  pv.add(key);
  try {
    const res = await fetch(cssURL(f, SAMPLE[kind] + 'ABCabc123'), { mode: 'cors' });
    if (!res.ok) throw new Error(res.status);
    const css = (await res.text()).replace(/font-family:\s*'[^']+'/g, `font-family: '${pvFamily(kind, id)}'`);
    const st = document.createElement('style');
    st.dataset.pv = key; st.textContent = css;
    document.head.append(st);
  } catch { pv.delete(key); }
}
