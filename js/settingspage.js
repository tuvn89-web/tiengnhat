import { esc, toast, APP_VERSION, checkUpdate } from './util.js';
import { S, saveSettings, resetSettings } from './settings.js';
import { jaVoices, speak, ttsReady, pickVoice } from './tts.js';
import { chips, bindChips, readChip, field } from './ui.js';
import { SCRIPTS } from './quiz.js';

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
      <fieldset><legend>Kiểu chữ Nhật</legend>${chips('jpFont', [['gothic', 'Chữ không chân (ゴシック)'], ['mincho', 'Chữ có chân — giống giấy tờ']], S.jpFont, false)}</fieldset>
      <div class="preview label-card">
        <div class="label-head"><span class="label-tag">Xem trước</span><span class="label-lv">N2</span></div>
        <p class="prompt-jp" lang="ja"><ruby>解凍<rt>かいとう</rt></ruby></p>
        <p class="prompt-hint">rã đông — chữ sẽ hiện cỡ này khi học</p>
        <button type="button" class="opt" tabindex="-1"><span class="opt-n">1</span><span class="opt-t">Nút đáp án cỡ này</span></button>
      </div>
    </section>

    <section class="card">
      <h2 class="h2">Hiển thị</h2>
      <fieldset><legend>Chế độ chữ mặc định</legend>${chips('script', SCRIPTS, S.script, false)}</fieldset>
      <p class="muted small">Chữ kanji luôn có furigana nhỏ bên trên. Chỉ hai bài luyện đọc kanji (Kanji → cách đọc, ghép Chữ mềm/cứng – Kanji) mới ẩn furigana.</p>
      <label class="check"><input type="checkbox" name="showHv" ${S.showHv ? 'checked' : ''}> Hiện âm Hán Việt</label>
    </section>

    <section class="card">
      <h2 class="h2">Học</h2>
      <fieldset><legend>Số câu mỗi lượt trắc nghiệm</legend>${chips('qCount', [10, 20, 30, 50].map(n => [String(n), String(n)]), String(S.qCount), false)}</fieldset>
      <fieldset><legend>Số màn ghép cặp</legend>${chips('matchRounds', [1, 2, 3, 4, 5].map(n => [String(n), String(n)]), String(S.matchRounds), false)}</fieldset>
      <fieldset><legend>Tự sang câu sau khi trả lời đúng</legend>${chips('autoNext', [['0', 'Tắt'], ['800', 'Nhanh'], ['1600', 'Chậm']], String(S.autoNext), false)}</fieldset>
      <label class="check"><input type="checkbox" name="introNew" ${S.introNew ? 'checked' : ''}> Giới thiệu từ mới trước khi hỏi</label>
      <label class="check"><input type="checkbox" name="sound" ${S.sound ? 'checked' : ''}> Âm báo đúng/sai</label>
      <label class="check"><input type="checkbox" name="vibrate" ${S.vibrate ? 'checked' : ''}> Rung khi sai (Android)</label>
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
    const v = readChip(view, name);
    S[name] = ['qCount', 'matchRounds', 'autoNext'].includes(name) ? +v : v;
    save();
  });
  view.addEventListener('input', e => {
    const el = e.target;
    if (!el.name) return;
    if (el.type === 'range') S[el.name] = +el.value;
    else if (el.type === 'checkbox') S[el.name] = el.checked;
    else S[el.name] = el.value;
    save();
  });
  view.querySelector('[data-act=test]').onclick = () => { if (!speak('作業の前に手を洗ってください。')) toast('Máy chưa có giọng đọc tiếng Nhật.'); };
  view.querySelector('[data-act=upd]').onclick = async e => {
    const b = e.currentTarget; b.disabled = true;
    toast(await checkUpdate());
    b.disabled = false;
  };
  view.querySelector('[data-act=reset]').onclick = async () => { await resetSettings(); ctx.go('#/caidat', true); toast('Đã đặt lại.'); };
}
