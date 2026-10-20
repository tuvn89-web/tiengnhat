import { esc, wordHTML, hasKanji, isKanjiCh, plain, reading, rubyHTML, icon, toast, debounce } from './util.js';
import { D, LEVELS, TOPICS, POS, REG, saveUserItem, deleteUserItem, report, unreport } from './data.js';
import { status, isStar, toggleStar, P, TOP, isLeech } from './srs.js';
import { markBtnHTML } from './marks.js';
import { appendChunks } from './lazy.js';
import { chips, bindChips, readChip, readChips, openSheet, wordDetailHTML, field, emptyState, confirmBox } from './ui.js';

const ST_LABEL = { new: 'Chưa học', learning: 'Đang học', known: 'Đã thuộc' };
const LIMIT = 150;

export function renderWordList(view, ctx) {
  view.innerHTML = `
    <div class="list-head"><h1 class="h1">Kho từ</h1><a class="btn btn-primary btn-sm" href="#/them">${icon('plus')} Thêm từ</a></div>
    <input class="input search" type="search" placeholder="Tìm: kana, kanji, nghĩa, Hán Việt" aria-label="Tìm từ">
    <details class="filters"><summary>Bộ lọc</summary>
      ${chips('st', [['all', 'Tất cả'], ['new', 'Chưa học'], ['learning', 'Đang học'], ['known', 'Đã thuộc'], ['leech', 'Cứng đầu'], ['star', 'Đã đánh dấu ★'], ['rep', 'Đã báo sai'], ['mine', 'Tự thêm/sửa']], 'all', false)}
      ${chips('levels', LEVELS.map(l => [l, l]), [])}
      ${chips('topics', Object.entries(TOPICS), [])}
    </details>
    <p class="list-count muted" aria-live="polite"></p>
    <ul class="rows wordrows"></ul>
    <button class="btn btn-ghost btn-block more" hidden>Hiện thêm</button>`;
  const q = view.querySelector('.search'), ul = view.querySelector('.wordrows'), more = view.querySelector('.more');
  let shown = LIMIT, res = [];
  const run = () => {
    const s = q.value.trim().toLowerCase();
    const stf = readChip(view, 'st'), lv = readChips(view, 'levels'), tp = readChips(view, 'topics');
    res = D.vocab.filter(it => {
      if (lv.length && !lv.includes(it.level)) return false;
      if (tp.length && !it.topics.some(t => tp.includes(t))) return false;
      if (stf === 'rep' && !(D.reports[it.id] && !D.reports[it.id]._del)) return false;
      if (stf === 'mine' && !it._user) return false;
      if (stf === 'leech' && !isLeech(it)) return false;
      if (stf === 'star' && !isStar(it.id)) return false;
      if (['new', 'learning', 'known'].includes(stf) && status(it) !== stf) return false;
      if (!s) return true;
      return it.kana.includes(s) || (it.kanji || '').includes(s) || it.vi.toLowerCase().includes(s) || (it.hv || '').toLowerCase().includes(s) || (it.std || '').includes(s);
    });
    shown = LIMIT; draw();
  };
  // v40: 150 dòng mỗi lần ghép dần từng mẻ (20 dòng đầu hiện ngay), lọc / tìm lại thì mẻ cũ dừng
  const rowH = it => `<li><button type="button" class="row" data-id="${esc(it.id)}">
      <span class="row-jp" lang="ja">${wordHTML(it, 'furi')}</span>
      <span class="row-vi">${esc(it.vi)}${isLeech(it) ? ' <small class="leech-tag">cứng đầu</small>' : ''}</span>
      <span class="dot dot-${status(it)}" title="${ST_LABEL[status(it)]}"></span></button>${markBtnHTML(it.id)}</li>`;
  let drawN = 0;
  const put = (from, to) => {
    const my = drawN;
    more.hidden = true;
    appendChunks(ul, res.slice(from, to), rowH, { first: 20, alive: () => my === drawN }).then(ok => { if (ok && my === drawN) more.hidden = res.length <= shown; });
  };
  const draw = () => {
    view.querySelector('.list-count').textContent = `${res.length} từ`;
    drawN++;
    ul.innerHTML = res.length ? '' : `<li>${emptyState('Không có từ nào khớp.')}</li>`;
    if (res.length) put(0, shown); else more.hidden = true;
  };
  more.onclick = () => { const from = shown; shown += LIMIT; put(from, shown); };
  q.addEventListener('input', debounce(run, 150));
  bindChips(view, run);
  ul.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) showWord(b.dataset.id, ctx, run); });
  run();
}

export function showWord(id, ctx, refresh) {
  const it = D.items.get(id);
  if (!it) return;
  const r = P.get(id);
  const rep = D.reports[id] && !D.reports[id]._del;
  const prog = r ? ['vj', 'jv', 'kr'].filter(d => r.d?.[d]).map(d => `${{ vj: 'Việt→Nhật', jv: 'Nhật→Việt', kr: 'Đọc kanji' }[d]}: hộp ${r.d[d].b}/${TOP}${r.d[d].m ? ' (thuộc hẳn)' : ''}`).join(', ') : 'chưa học';
  const s = openSheet(`${wordDetailHTML(it)}
    <p class="muted small">Tiến độ: ${esc(prog)}. ${it._user ? 'Bản do bạn thêm/sửa.' : `Gói: ${esc(it._pack)}.`}</p>
    <div class="row-btns wrap">
      <a class="btn btn-ghost" href="#/sua/${encodeURIComponent(id)}" data-a="edit">Sửa</a>
      <button class="btn btn-ghost" data-a="rep">${icon('flag')} ${rep ? 'Bỏ báo sai' : 'Báo sai'}</button>
      ${it._user ? `<button class="btn btn-ghost btn-danger" data-a="del">${D.packs.some(p => p.items.some(x => x.id === id)) ? 'Bỏ bản sửa' : 'Xoá từ'}</button>` : ''}
    </div>`, { label: it.kanji || it.kana });
  s.body.addEventListener('click', async e => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (a === 'star') { const on = await toggleStar(id); e.target.closest('[data-a]').setAttribute('aria-pressed', on); refresh?.(); }
    if (a === 'edit') s.close();
    if (a === 'rep') {
      s.close();
      if (rep) { await unreport(id); toast('Đã bỏ báo sai.'); refresh?.(); return; }
      const s2 = openSheet(`<h2 class="h2">Báo sai</h2>
        ${field('Sai ở đâu? (không bắt buộc)', '<textarea class="input" rows="3" placeholder="Ví dụ: nghĩa chưa đúng với cách dùng ở xưởng"></textarea>')}
        <div class="row-btns"><button class="btn btn-primary" data-a="ok">Lưu báo sai</button></div>`, { label: 'Báo sai' });
      s2.body.querySelector('[data-a=ok]').onclick = async () => { await report(id, s2.body.querySelector('textarea').value.trim()); s2.close(); toast('Đã ghi. Xuất ở Dữ liệu để skill sửa.'); refresh?.(); };
    }
    if (a === 'del') {
      if (!(await confirmBox('Xoá bản này? Tiến độ học vẫn giữ.', 'Xoá'))) return;
      await deleteUserItem(id); s.close(); toast('Đã xoá.'); refresh?.();
    }
  });
}

// ---------- thêm / sửa ----------
const KANA_RE = /^[぀-ヿー・〜～ ]+$/;
export function renderWordForm(view, ctx, editId) {
  const it = editId ? D.items.get(editId) : null;
  if (editId && !it) { view.innerHTML = emptyState('Không tìm thấy từ này.'); return; }
  const v = it || { kana: '', kanji: '', kf: '', hv: '', vi: '', pos: 'n', level: 'N4', topics: ['xuong'], sub: '', reg: 'thuong', std: '', ex: [], note: '' };
  const ex = v.ex?.[0] || { jp: '', vi: '' };
  const sel = (name, obj, cur) => `<select class="input" name="${name}">${Object.entries(obj).map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  view.innerHTML = `
    <a class="back" href="#/kho">Kho từ</a>
    <h1 class="h1">${it ? 'Sửa từ' : 'Thêm từ'}</h1>
    <form class="wform" novalidate>
      ${field('Kana (chữ mềm/cứng) *', `<input class="input" name="kana" lang="ja" value="${esc(v.kana)}" ${it ? 'readonly' : ''} required>`, it ? 'Không đổi được kana và kanji của từ đã có (tiến độ học gắn vào đây). Muốn đổi thì thêm từ mới.' : 'Gõ bằng bàn phím tiếng Nhật, ví dụ かいとう.')}
      ${field('Kanji', `<input class="input" name="kanji" lang="ja" value="${esc(v.kanji)}" ${it ? 'readonly' : ''}>`, 'Bỏ trống nếu từ không có kanji.')}
      ${field('Kanji có furigana', `<input class="input" name="kf" lang="ja" value="${esc(v.kf || '')}">`, 'Chỉ cần khi kanji lẫn kana. Ghi cách đọc trong ngoặc vuông ngay sau kanji: <code data-bare>洗[あら]う</code>')}
      ${field('Âm Hán Việt', `<input class="input" name="hv" value="${esc(v.hv)}">`, 'Viết hoa, mỗi chữ Hán một âm: GIẢI ĐÔNG')}
      <p class="hv-check small"></p>
      ${field('Nghĩa tiếng Việt *', `<input class="input" name="vi" value="${esc(v.vi)}" required>`)}
      <div class="grid2">
        ${field('Loại từ', sel('pos', POS, v.pos))}
        ${field('Cấp', sel('level', Object.fromEntries(LEVELS.map(l => [l, l])), v.level))}
      </div>
      <fieldset><legend>Chủ đề *</legend>${chips('topics', Object.entries(TOPICS), v.topics)}</fieldset>
      <div class="grid2">
        ${field('Sắc thái', sel('reg', REG, v.reg))}
        ${field('Nhóm nhỏ', `<input class="input" name="sub" value="${esc(v.sub || '')}" placeholder="Ví dụ: Thao tác">`)}
      </div>
      ${field('Dạng tiếng chuẩn (với từ Kansai)', `<input class="input" name="std" lang="ja" value="${esc(v.std || '')}">`)}
      ${field('Câu ví dụ', `<input class="input" name="exjp" lang="ja" value="${esc(ex.jp)}">`, 'Ghi furigana kiểu <code data-bare>手[て]を洗[あら]います。</code> — xem trước hiện ngay bên dưới.')}
      <p class="ex-prev" lang="ja"></p>
      ${field('Dịch câu ví dụ', `<input class="input" name="exvi" value="${esc(ex.vi)}">`)}
      ${field('Ghi chú', `<textarea class="input" name="note" rows="2">${esc(v.note || '')}</textarea>`)}
      <p class="form-err" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit">${it ? 'Lưu thay đổi' : 'Thêm vào kho'}</button>
    </form>`;
  const f = view.querySelector('.wform');
  bindChips(f);
  const val = n => f.elements[n].value.trim();
  const live = () => {
    const kanji = val('kanji'), hv = val('hv');
    const nk = [...kanji].filter(isKanjiCh).length, ns = hv ? hv.split(/\s+/).length : 0;
    f.querySelector('.hv-check').textContent = kanji ? (nk === ns ? '' : `Kanji có ${nk} chữ Hán, âm Hán Việt đang có ${ns} âm.`) : '';
    const ej = val('exjp');
    f.querySelector('.ex-prev').innerHTML = ej ? rubyHTML(ej) : '';
  };
  f.addEventListener('input', live); live();
  f.onsubmit = async e => {
    e.preventDefault();
    const err = m => { f.querySelector('.form-err').textContent = m; };
    const kana = val('kana'), kanji = val('kanji'), kf = val('kf');
    if (!kana || !KANA_RE.test(kana)) return err('Kana chỉ được chứa hiragana/katakana.');
    if (kanji && !hasKanji(kanji)) return err('Ô kanji không có chữ Hán nào — bỏ trống nếu từ không có kanji.');
    if (kf && plain(kf) !== kanji) return err('Ô "kanji có furigana" bỏ phần trong ngoặc phải ra đúng ô kanji.');
    if (!val('vi')) return err('Cần nghĩa tiếng Việt.');
    const topics = readChips(f, 'topics');
    if (!topics.length) return err('Chọn ít nhất một chủ đề.');
    const id = it ? it.id : `v:${kanji || kana}:${kana}`;
    if (!it && D.items.has(id) && !(await confirmBox('Từ này đã có trong kho. Ghi đè bằng bản bạn vừa nhập?', 'Ghi đè'))) return;
    const exjp = val('exjp');
    const rec = {
      ...(it ? Object.fromEntries(Object.entries(it).filter(([k]) => !k.startsWith('_'))) : {}),
      id, kana, kanji, hv: val('hv').toUpperCase(), vi: val('vi'), pos: f.elements.pos.value, level: f.elements.level.value,
      topics, reg: f.elements.reg.value, ex: exjp ? [{ jp: exjp, vi: val('exvi'), ...(it?.ex?.[0]?.ctx ? { ctx: it.ex[0].ctx } : {}) }, ...((it?.ex || []).slice(1))] : (it?.ex || []).slice(1),
      _pack: it?._pack || 'tu-them',
    };
    for (const k of ['kf', 'sub', 'std', 'note']) { const x = val(k); if (x) rec[k] = x; else delete rec[k]; }
    await saveUserItem(rec);
    toast(it ? 'Đã lưu thay đổi.' : 'Đã thêm vào kho.');
    ctx.go(it ? '#/kho' : '#/them', !it);
  };
}
