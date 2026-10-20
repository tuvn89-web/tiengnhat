import { fpsText } from './fxpanel.js';
import { BARE_MODES, bareMode, bareHintOn, setBare } from './bare.js';
import { esc, toast, APP_VERSION, checkUpdate } from './util.js';
import { S, saveSettings, resetSettings } from './settings.js';
import { jaVoices, speak, ttsReady, pickVoice } from './tts.js';
import { chips, bindChips, readChip, field } from './ui.js';
import { SCRIPTS } from './quiz.js';
import { paceFieldsHTML, bindPaceFields, readPace } from './roadmap.js';
import { setPrefs } from './data.js';
import { seasonTry, weatherText } from './season.js';
import { JP_FONTS, VI_FONTS, FONT_GROUPS, SAMPLE, fontOf, fallback, pvFamily, loadPreview } from './fonts.js';

// v32: chọn phông chữ — bấm mở mới tải mẫu xem trước (vài KB mỗi phông)
function fontPicker(kind, cur, legend) {
  const L = kind === 'jp' ? JP_FONTS : VI_FONTS, f = fontOf(kind, cur);
  const opt = x => `<button type="button" class="fp-opt" data-font="${x[0]}" aria-pressed="${x[0] === f[0]}"><span class="fp-name">${esc(x[2])}</span><span class="fp-sample" ${kind === 'jp' ? 'lang="ja"' : ''} style="font-family: ${x[3] ? `'${pvFamily(kind, x[0])}', ` : ''}${fallback(kind, x[0])}">${esc(SAMPLE[kind])}</span></button>`;
  return `<details class="fontpick" data-kind="${kind}"><summary><span class="fp-l">${legend}</span> <b class="fp-cur">${esc(f[2])}</b></summary>
    ${FONT_GROUPS.map(([g, gl]) => { const fs = L.filter(x => x[1] === g); return fs.length ? `<p class="fp-g">${gl}</p><div class="fp-list">${fs.map(opt).join('')}</div>` : ''; }).join('')}
  </details>`;
}

export function renderSettings(view, ctx) {
  const voices = jaVoices();
  view.innerHTML = `
    <h1 class="h1">Cài đặt</h1>
    <p class="muted small">Cài đặt lưu riêng trên từng máy, vì máy tính và điện thoại thường cần cỡ chữ khác nhau.</p>

    <section class="card">
      <h2 class="h2">Giao diện</h2>
      <fieldset><legend>Màu nền</legend>${chips('theme', [['auto', 'Theo máy'], ['light', 'Sáng'], ['dark', 'Tối']], S.theme, false)}</fieldset>
      ${field('Cỡ chữ tiếng Nhật', `<input type="range" min="20" max="56" step="2" name="fsJp" value="${S.fsJp}">`)}
      ${field('Cỡ chữ tiếng Việt', `<input type="range" min="14" max="26" step="1" name="fsVi" value="${S.fsVi}">`)}
      <fieldset><legend>Cỡ nút bấm</legend>${chips('btn', [['sm', 'Nhỏ'], ['md', 'Vừa'], ['lg', 'Lớn'], ['xl', 'Rất lớn']], S.btn, false)}</fieldset>
      ${fontPicker('jp', S.jpFont, 'Phông chữ Nhật')}
      ${fontPicker('vi', S.viFont, 'Phông chữ Việt')}
      <p class="small muted">Phông "mặc định" có sẵn trong máy. Phông khác tải từ Google Fonts lần đầu chọn (cần mạng; Google thấy địa chỉ mạng của máy), sau đó dùng được khi không có mạng. Chữ Hán hiếm mà phông không có thì hiện bằng phông của máy. Thư pháp, viết tay đẹp nhưng nhận mặt chữ khó hơn — lúc mới học chữ nên dùng Gothic hoặc Viết tay chuẩn.</p>
      <div class="preview label-card">
        <div class="label-head"><span class="label-tag">Xem trước</span><span class="label-lv">N2</span></div>
        <p class="prompt-jp" lang="ja"><ruby>解凍<rt>かいとう</rt></ruby></p>
        <p class="prompt-hint">rã đông — chữ sẽ hiện cỡ này khi học</p>
        <button type="button" class="opt" tabindex="-1"><span class="opt-n">1</span><span class="opt-t">Nút đáp án cỡ này</span></button>
      </div>
    </section>

    <section class="card fxcard">
      <h2 class="h2">Giao diện mùa & hiệu ứng</h2>
      <p class="muted small">Mỗi tháng một họa tiết (hoa anh đào, mưa, pháo hoa, lá phong, tuyết…), trời đổi theo giờ, ngày lễ Nhật và Việt Nam. Hiệu ứng nằm phía sau thẻ. Máy yếu hoặc muốn đỡ tốn pin thì giảm mật độ hoặc tắt bớt.</p>
      <fieldset><legend>Giao diện mùa</legend>${chips('season', [['auto', 'Theo tháng'], ['off', 'Tắt'], ...Array.from({ length: 12 }, (_, i) => [String(i + 1), `T${i + 1}`])], S.season, false)}</fieldset>
      <label class="check"><input type="checkbox" name="fxBg" ${S.fxBg !== false ? 'checked' : ''}> <b>Hiệu ứng nền</b> (hạt rơi, trời, mưa, sao băng…). Tắt thì màu và hoa văn theo mùa vẫn giữ. Nút nhỏ "Bật / tắt hiệu ứng nền" ở góc dưới bên phải mở bảng chỉnh nhanh ở mọi trang.</label>
      <label class="check"><input type="checkbox" name="motion" ${S.motion ? 'checked' : ''}> Chuyển động mượt (trang trượt, bảng hiện từ nhỏ thành to, điểm đếm lên). Máy bật "giảm chuyển động" thì app tự tắt.</label>
      <fieldset><legend>Mật độ hạt</legend>${chips('fxDensity', [['low', 'Ít'], ['mid', 'Vừa'], ['high', 'Nhiều']], S.fxDensity, false)}</fieldset>
      <fieldset><legend>Tốc độ rơi</legend>${chips('fxSpeed', [['slow', 'Chậm'], ['mid', 'Vừa'], ['fast', 'Nhanh']], S.fxSpeed, false)}</fieldset>
      <fieldset><legend>Khung hình hiệu ứng nền</legend>${chips('fxFps', [['auto', 'Theo màn hình'], ['60', '60'], ['90', '90'], ['120', '120']], S.fxFps || 'auto', false)}
        <p class="small muted">"Theo màn hình": màn hình 60, 90, 120 Hz… thì nền vẽ đủ bấy nhiêu khung mỗi giây, mượt nhất. Chọn số nhỏ hơn để đỡ tốn pin. Máy không theo kịp thì app tự giảm độ nét, số hạt. Chuyển trang, bảng chi tiết luôn chạy theo màn hình.</p>
        <p class="small fx-fps">${esc(fpsText())}</p></fieldset>
      <fieldset><legend>Bật / tắt từng hiệu ứng</legend><div class="fx-grid">${[['fxFall', 'Hạt rơi theo tháng'], ['fxDayNight', 'Ngày – đêm'], ['fxClouds', 'Mây'], ['fxStars', 'Sao & trăng'], ['fxMeteor', 'Sao băng, mưa sao băng'], ['fxPlane', 'Máy bay bay qua'], ['fxBlackhole', 'Hố đen'], ['fxFireworks', 'Pháo hoa'], ['fxFireflies', 'Đom đóm'], ['fxLanterns', 'Đèn lồng ngày lễ'], ['fxHolVN', 'Ngày lễ Việt Nam'], ['fxHolJP', 'Ngày lễ Nhật'], ['fxWind', 'Gió'], ['fxLightning', 'Chớp khi mưa to'], ['fxBurst', 'Chùm hạt khi trả lời đúng']].map(([k, t]) => `<label class="check"><input type="checkbox" name="${k}" ${S[k] ? 'checked' : ''}> ${t}</label>`).join('')}</div></fieldset>
      <fieldset><legend>Mưa</legend>${chips('fxRain', [['season', 'Theo mùa mưa'], ['weather', 'Theo thời tiết thật'], ['always', 'Luôn có mưa'], ['off', 'Tắt']], S.fxRain, false)}</fieldset>
      ${field('Thành phố (cho "Theo thời tiết thật")', `<input class="input" name="fxCity" value="${esc(S.fxCity || '')}" placeholder="vd. Kobe, Himeji, Akashi">`, 'Cần có mạng. App gửi tên thành phố tới dịch vụ thời tiết miễn phí Open-Meteo, không dùng định vị GPS. Mất mạng thì quay về mưa theo mùa.')}
      <p class="small muted fx-w">${esc(weatherText())}</p>
      <p class="small">Thử ngay:</p>
      <div class="fx-try">${[['meteor', 'Sao băng'], ['shower', 'Mưa sao băng'], ['plane', 'Máy bay'], ['hole', 'Hố đen'], ['fw', 'Pháo hoa'], ['bolt', 'Chớp'], ['gust', 'Cơn gió'], ['lantern', 'Đèn lồng'], ['koi', 'Cá chép'], ['burst', 'Chùm hạt']].map(([k, t]) => `<button type="button" class="btn btn-ghost btn-sm" data-fxtry="${k}">${t}</button>`).join('')}</div>
    </section>

    <section class="card">
      <h2 class="h2">Hiển thị</h2>
      <fieldset><legend>Chế độ chữ mặc định</legend>${chips('script', SCRIPTS, S.script, false)}</fieldset>
      <p class="muted small">Chữ kanji luôn có furigana nhỏ bên trên, trừ câu chữ Hán để trần (dưới đây) và các bài luyện mặt chữ (thẻ chữ Hán, chữ trông giống, Đếm số, ghép Kana – Kanji).</p>
      <fieldset><legend>Câu chữ Hán để trần (không furigana)</legend>${chips('bareMode', BARE_MODES, bareMode(), false)}</fieldset>
      <p class="muted small">Câu "Kanji → cách đọc" hiện từ bằng chữ Hán không furigana. <b>Theo trình độ</b>: chỉ hỏi từ thuộc cấp đã qua hoặc đang học <i>và</i> mọi chữ Hán trong từ đã học thẻ chữ (Đếm số, ghép Kana – Kanji cũng chỉ lấy chữ đã học). <b>Tắt</b>: không hỏi để trần ở các bài app tự trộn; lịch ôn hướng đọc tạm chờ, bật lại thì chạy tiếp. Tự chọn kiểu "Kanji → cách đọc" trong Trắc nghiệm vẫn làm được. Xếp lớp, Thi vượt cấp, Thi thử luôn như đề thật. Phần này đồng bộ giữa các máy.</p>
      <label class="check"><input type="checkbox" name="bareHint" ${bareHintOn() ? 'checked' : ''}> Hiện nghĩa tiếng Việt dưới chữ để trần (gợi ý)</label>
      <label class="check"><input type="checkbox" name="showHv" ${S.showHv ? 'checked' : ''}> Hiện âm Hán Việt</label>
    </section>

    <section class="card">
      <h2 class="h2">Học</h2>
      <fieldset><legend>Số câu mỗi lượt trắc nghiệm</legend>${chips('qCount', [10, 20, 30, 50].map(n => [String(n), String(n)]), String(S.qCount), false)}</fieldset>
      <fieldset><legend>Số màn ghép cặp</legend>${chips('matchRounds', [1, 2, 3, 4, 5].map(n => [String(n), String(n)]), String(S.matchRounds), false)}</fieldset>
      <fieldset><legend>Đúng mà chậm thì chưa lên hộp</legend>${chips('slowSec', [['0', 'Tắt'], ['6', '6 giây'], ['8', '8 giây'], ['10', '10 giây'], ['15', '15 giây']], String(S.slowSec), false)}</fieldset>
      <p class="muted small">Câu chọn đáp án của từ vựng và chữ Hán: trả lời đúng nhưng nghĩ lâu hơn số giây này thì mục giữ nguyên hộp và được hỏi lại sớm hơn. Thời gian tắt màn hình, chuyển app không tính.</p>
      <fieldset><legend>Tự sang câu sau khi trả lời đúng</legend>${chips('autoNext', [['0', 'Tắt'], ['800', 'Nhanh'], ['1600', 'Chậm']], String(S.autoNext), false)}</fieldset>
      <label class="check"><input type="checkbox" name="introNew" ${S.introNew ? 'checked' : ''}> Từ chưa học lẫn trong lượt trắc nghiệm: hiện thẻ để học (Đã học / Biết rồi / Để sau), không hỏi ngay</label>
      <label class="check"><input type="checkbox" name="sound" ${S.sound ? 'checked' : ''}> Âm báo đúng/sai</label>
      <label class="check"><input type="checkbox" name="vibrate" ${S.vibrate ? 'checked' : ''}> Rung khi sai (Android)</label>
      <label class="check"><input type="checkbox" name="romaji" ${S.romaji ? 'checked' : ''}> Ô gõ tiếng Nhật: gõ romaji tự đổi sang kana (kakareru → かかれる; chữ IN HOA → katakana)</label>
    </section>

    <section class="card" data-pace>
      <h2 class="h2">Nhịp học mỗi ngày</h2>
      <p class="muted small">Dùng cho "Kế hoạch hôm nay" và dự báo ngày học xong. Phần này đồng bộ giữa các máy.</p>
      ${paceFieldsHTML()}
    </section>

    <section class="card">
      <h2 class="h2">Giọng đọc</h2>
      ${voices.length ? field('Giọng tiếng Nhật', `<select class="input" name="voice"><option value="">Tự chọn (ưu tiên giọng cài trong máy)</option>${voices.map(v => `<option value="${esc(v.name)}" ${v.name === S.voice ? 'selected' : ''}>${esc(v.name)}${v.localService ? '' : ' — cần mạng'}</option>`).join('')}</select>`)
      : `<div class="warn">Máy chưa có giọng đọc tiếng Nhật. Android: Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói → Dịch vụ của Google → tải dữ liệu giọng nói Tiếng Nhật. Windows: Cài đặt → Thời gian và ngôn ngữ → Giọng nói → thêm giọng Tiếng Nhật. Xong mở lại app.</div>`}
      ${field('Tốc độ đọc', `<input type="range" min="0.5" max="1.3" step="0.1" name="rate" value="${S.rate}">`)}
      <label class="check"><input type="checkbox" name="autoSpeak" ${S.autoSpeak ? 'checked' : ''}> Tự đọc khi hiện từ tiếng Nhật</label>
      <button type="button" class="btn btn-ghost" data-act="test">Nghe thử</button>
      <p class="muted small">${ttsReady() ? `Đang dùng: ${esc(pickVoice()?.name || '')}` : ''}</p>
    </section>

    <section class="card">
      <h2 class="h2">Máy này</h2>
      ${field('Tên máy (hiện trong lịch sử đồng bộ)', `<input class="input" name="deviceName" value="${esc(S.deviceName)}">`)}
      <p class="small">Phiên bản app: <b>${esc(APP_VERSION)}</b></p>
      <div class="row-btns wrap">
        <button type="button" class="btn btn-ghost" data-act="upd">Kiểm tra bản mới</button>
        <button type="button" class="btn btn-ghost btn-danger" data-act="reset">Đặt lại cài đặt mặc định</button>
      </div>
    </section>`;

  const save = () => saveSettings();
  bindChips(view, name => {
    if (name === 'minsq') return; // nút phút nhanh: phần Nhịp học tự lo
    if (name === 'bareMode') return setBare({ bareMode: readChip(view, 'bareMode') }); // v41: lưu theo người học (đồng bộ)
    const v = readChip(view, name);
    S[name] = ['qCount', 'matchRounds', 'autoNext', 'slowSec'].includes(name) ? +v : v;
    save();
  });
  view.addEventListener('input', e => {
    const el = e.target;
    if (!el.name || el.closest('.pace')) return;
    if (el.name === 'bareHint') return setBare({ bareHint: el.checked });
    if (el.type === 'range') S[el.name] = +el.value;
    else if (el.type === 'checkbox') S[el.name] = el.checked;
    else S[el.name] = el.value;
    save();
  });
  const paceBox = view.querySelector('[data-pace]');
  let paceT = 0;
  bindPaceFields(paceBox, () => { clearTimeout(paceT); paceT = setTimeout(() => setPrefs(readPace(paceBox)), 400); });
  view.querySelectorAll('.fontpick').forEach(d => {
    const kind = d.dataset.kind, L = kind === 'jp' ? JP_FONTS : VI_FONTS;
    d.addEventListener('toggle', () => { if (d.open) L.forEach(x => loadPreview(kind, x[0])); });
    d.addEventListener('click', e => {
      const b = e.target.closest('.fp-opt'); if (!b) return;
      S[kind === 'jp' ? 'jpFont' : 'viFont'] = b.dataset.font;
      d.querySelectorAll('.fp-opt').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
      d.querySelector('.fp-cur').textContent = fontOf(kind, b.dataset.font)[2];
      save();
      if (!navigator.onLine && fontOf(kind, b.dataset.font)[3]) toast('Đang không có mạng: phông này hiện khi có mạng (lần đầu), tạm dùng phông của máy.');
    });
  });
  view.querySelectorAll('[data-fxtry]').forEach(b => b.onclick = () => { if (!seasonTry(b.dataset.fxtry)) toast('Hiệu ứng nền đang tắt (hoặc giao diện mùa tắt, hoặc máy đang bật giảm chuyển động).'); });
  // đổi trong bảng "Bật / tắt hiệu ứng nền" khi đang ở trang này → cập nhật các ô đánh dấu và chip
  const syncFx = () => {
    if (!view.querySelector('.fxcard')) return removeEventListener('tn-settings', syncFx);
    view.querySelectorAll('.fxcard input[type=checkbox][name]').forEach(c => { c.checked = S[c.name] !== false; });
    view.querySelectorAll('.chips[data-multi="0"]').forEach(g => { if (g.dataset.name in S) g.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(S[g.dataset.name])))); });
  };
  addEventListener('tn-settings', syncFx);
  const fpsT = setInterval(() => { const p = view.querySelector('.fx-fps'); if (!p || !p.isConnected) return clearInterval(fpsT); p.textContent = fpsText(); }, 500);
  view.querySelector('[data-act=test]').onclick = () => { if (!speak('作業の前に手を洗ってください。')) toast('Máy chưa có giọng đọc tiếng Nhật.'); };
  view.querySelector('[data-act=upd]').onclick = async e => {
    const b = e.currentTarget; b.disabled = true;
    toast(await checkUpdate());
    b.disabled = false;
  };
  view.querySelector('[data-act=reset]').onclick = async () => { await resetSettings(); ctx.go('#/caidat', true); toast('Đã đặt lại.'); };
}
