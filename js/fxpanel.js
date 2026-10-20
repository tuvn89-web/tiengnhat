// v33: nút nhỏ "Bật / tắt hiệu ứng nền" (góc dưới bên phải, mọi trang) — bấm mở / thu gọn bảng chỉnh nhanh giao diện mùa,
// giống nút "Bảng thử" trong bản thử. Các lựa chọn trong bảng là cài đặt thật (lưu lại, giống trong Cài đặt);
// riêng phần "Xem thử" chỉ đổi tạm (mở lại app là về như thật).
import { esc, toast } from './util.js';
import { S, saveSettings } from './settings.js';
import { seasonTry, seasonOverride, seasonOverrides, seasonReduced, HOLIDAYS, screenHz, fxFpsNow, fxQuality, fxThread } from './season.js';

const MONTHS = ['Tháng 1 — năm mới', 'Tháng 2 — hoa mai Nhật', 'Tháng 3 — hoa đào, hoa cải', 'Tháng 4 — anh đào', 'Tháng 5 — lá non, tử đằng', 'Tháng 6 — mùa mưa, cẩm tú cầu',
  'Tháng 7 — Thất tịch, bụi sao', 'Tháng 8 — pháo hoa, đom đóm', 'Tháng 9 — trăng thu, chuồn chuồn', 'Tháng 10 — lá bạch quả', 'Tháng 11 — lá phong', 'Tháng 12 — tuyết'];
const SEL = [ // [khoá cài đặt, nhãn, lựa chọn]
  ['season', 'Giao diện mùa', [['auto', 'Theo tháng (tự đổi)'], ['off', 'Tắt giao diện mùa'], ...MONTHS.map((t, i) => [String(i + 1), t])]],
  ['theme', 'Nền', [['auto', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']]],
  ['fxRain', 'Mưa', [['season', 'Theo mùa mưa'], ['weather', 'Theo thời tiết thật'], ['always', 'Luôn có mưa'], ['off', 'Tắt']]],
  ['fxDensity', 'Mật độ hạt', [['low', 'Ít'], ['mid', 'Vừa'], ['high', 'Nhiều']]],
  ['fxSpeed', 'Tốc độ rơi', [['slow', 'Chậm'], ['mid', 'Vừa'], ['fast', 'Nhanh']]],
  ['fxFps', 'Khung hình', () => FPS_OPTS()],
];
// v37: khung hình của hiệu ứng nền — theo tần số quét màn hình hoặc giới hạn 60 / 90 / 120
export const FPS_OPTS = () => [['auto', `Theo màn hình (${screenHz()} Hz)`], ['60', 'Tối đa 60 khung/giây'], ['90', 'Tối đa 90 khung/giây'], ['120', 'Tối đa 120 khung/giây']];
export function fpsText() {
  const f = fxFpsNow(), hz = screenHz(), cap = +S.fxFps || 0;
  return `Màn hình ~${hz} Hz · nền đang vẽ ${f ? `${f} khung/giây${fxThread() === 'worker' ? ' (luồng riêng)' : ''}` : '— (đang tắt)'}`
    + (cap > hz ? ` · màn hình chỉ có ${hz} Hz nên tối đa ${hz}` : '') + (fxQuality() ? ' · đã tự giảm độ nét, số hạt cho đỡ giật' : '');
}
const PREVIEW = [ // xem thử tạm: [khoá, nhãn, lựa chọn] — '' = như thật
  ['phase', 'Buổi', [['', 'Theo giờ thật'], ['dawn', 'Bình minh'], ['day', 'Ban ngày'], ['dusk', 'Hoàng hôn'], ['night', 'Ban đêm']]],
  ['rain', 'Mưa', [['', 'Như thật'], ['0', 'Không mưa'], ['1', 'Mưa nhẹ'], ['2', 'Mưa to, có giông']]],
  ['hol', 'Ngày lễ', [['', 'Theo ngày thật'], ...HOLIDAYS]],
];
const CK = [['fxFall', 'Hạt rơi theo tháng'], ['fxDayNight', 'Ngày – đêm'], ['fxClouds', 'Mây'], ['fxStars', 'Sao & trăng'], ['fxMeteor', 'Sao băng'], ['fxPlane', 'Máy bay'], ['fxBlackhole', 'Hố đen'],
  ['fxFireworks', 'Pháo hoa'], ['fxFireflies', 'Đom đóm'], ['fxLanterns', 'Đèn lồng'], ['fxHolVN', 'Lễ Việt Nam'], ['fxHolJP', 'Lễ Nhật'], ['fxWind', 'Gió'], ['fxLightning', 'Chớp'], ['fxBurst', 'Chùm hạt khi đúng'], ['motion', 'Chuyển động mượt']];
const TRY = [['meteor', 'Sao băng'], ['shower', 'Mưa sao băng'], ['plane', 'Máy bay'], ['hole', 'Hố đen'], ['fw', 'Pháo hoa'], ['bolt', 'Chớp'], ['gust', 'Cơn gió'], ['lantern', 'Đèn lồng'], ['koi', 'Cá chép'], ['burst', 'Chùm hạt']];

let fab = null, panel = null;
const LABEL_CLOSED = 'Bật / tắt hiệu ứng nền ▴', LABEL_OPEN = 'Đóng bảng ▾';
const opts = (list, cur) => list.map(([v, t]) => `<option value="${esc(v)}" ${String(cur) === v ? 'selected' : ''}>${esc(t)}</option>`).join('');

function panelHTML() {
  const ov = seasonOverrides();
  return `<h2>Hiệu ứng nền</h2>
    <label class="ck fxp-main"><input type="checkbox" data-k="fxBg" ${S.fxBg !== false ? 'checked' : ''}> <span><b>Hiệu ứng nền</b> — hạt rơi, trời, mưa, sao băng… Tắt thì màu và hoa văn theo mùa vẫn giữ.</span></label>
    ${SEL.map(([k, t, l]) => `<label class="row2">${t} <select data-k="${k}">${opts(typeof l === 'function' ? l() : l, S[k])}</select></label>`).join('')}
    <p class="fxp-note fxp-fps" aria-live="off">${esc(fpsText())}</p>
    <h3>Xem thử (tạm thời)</h3>
    <p class="fxp-note">Đổi buổi, mưa, ngày lễ để xem; mở lại app là về như thật.</p>
    ${PREVIEW.map(([k, t, l]) => `<label class="row2">${t} <select data-ov="${k}">${opts(l, ov[k] ?? '')}</select></label>`).join('')}
    <button type="button" class="fxp-real" data-act="real">Về như thật</button>
    <h3>Bật / tắt từng hiệu ứng</h3>
    <div class="grid2">${CK.map(([k, t]) => `<label class="ck"><input type="checkbox" data-k="${k}" ${S[k] !== false ? 'checked' : ''}> ${t}</label>`).join('')}</div>
    <h3>Thử ngay</h3>
    <div class="tries">${TRY.map(([k, t]) => `<button type="button" data-try="${k}">${t}</button>`).join('')}</div>
    <p class="fxp-more"><a href="#/caidat" data-act="settings">Cài đặt đầy đủ (thành phố cho thời tiết thật…) →</a></p>`;
}
// cập nhật các ô theo cài đặt hiện tại (đổi ở trang Cài đặt hay ở bảng này)
function sync() {
  if (!panel || panel.hidden) return;
  panel.querySelectorAll('select[data-k]').forEach(s => { s.value = String(S[s.dataset.k]); });
  panel.querySelectorAll('input[data-k]').forEach(c => { c.checked = S[c.dataset.k] !== false; });
  const ov = seasonOverrides();
  panel.querySelectorAll('select[data-ov]').forEach(s => { s.value = ov[s.dataset.ov] == null ? '' : String(ov[s.dataset.ov]); });
}
let fpsT = 0;
function setOpen(open) {
  clearInterval(fpsT);
  if (open) {
    panel.innerHTML = panelHTML();
    panel.hidden = false; panel.classList.remove('is-closing');
    fpsT = setInterval(() => { const p = panel.querySelector('.fxp-fps'); if (p) p.textContent = fpsText(); }, 500);
  } else if (!panel.hidden) {
    if (document.documentElement.classList.contains('calm')) panel.hidden = true;
    else { panel.classList.add('is-closing'); setTimeout(() => { if (panel.classList.contains('is-closing')) { panel.hidden = true; panel.classList.remove('is-closing'); } }, 220); }
  }
  fab.textContent = open ? LABEL_OPEN : LABEL_CLOSED;
  fab.setAttribute('aria-expanded', String(open));
}
const isOpen = () => !panel.hidden && !panel.classList.contains('is-closing');

export function initFxPanel() {
  fab = document.createElement('button');
  fab.type = 'button'; fab.className = 'fx-fab'; fab.textContent = LABEL_CLOSED;
  fab.setAttribute('aria-expanded', 'false'); fab.setAttribute('aria-controls', 'fx-panel');
  panel = document.createElement('section');
  panel.className = 'fx-panel'; panel.id = 'fx-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Bảng hiệu ứng nền');
  document.body.append(panel, fab);
  fab.onclick = () => setOpen(!isOpen());
  panel.addEventListener('change', async e => {
    const el = e.target;
    if (el.dataset.ov) {
      const v = el.value;
      seasonOverride({ [el.dataset.ov]: v === '' ? null : el.dataset.ov === 'rain' ? +v : v });
      return;
    }
    const k = el.dataset.k; if (!k) return;
    S[k] = el.type === 'checkbox' ? el.checked : el.value;
    await saveSettings();
    if (k === 'fxBg' && el.checked && seasonReduced()) toast('Máy đang bật "giảm chuyển động" nên app không chạy hiệu ứng nền.');
  });
  panel.addEventListener('click', e => {
    const t = e.target.closest('[data-try]');
    if (t) { if (!seasonTry(t.dataset.try)) toast('Hiệu ứng nền đang tắt (hoặc giao diện mùa tắt, hoặc máy đang bật giảm chuyển động).'); return; }
    if (e.target.closest('[data-act=real]')) { seasonOverride({ phase: null, rain: null, hol: null }); sync(); return; }
    if (e.target.closest('[data-act=settings]')) setOpen(false);
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen() && !document.querySelector('.sheet-wrap:not(.is-closing)')) setOpen(false); });
  addEventListener('tn-settings', sync);
  addEventListener('tn-hz', () => { const s = panel.querySelector('select[data-k=fxFps]'); if (s) s.innerHTML = opts(FPS_OPTS(), S.fxFps); });
}
