// Hội thoại & bài đọc (H1, H8 · Đ11): đọc song ngữ · dịch từng câu · đóng vai (chọn / gõ câu của mình) · điền từ khóa ·
// câu hỏi hiểu · nghe cả bài (chỉnh tốc độ). Không có phần luyện nói / ghi âm.
import { esc, rich, plain, rubyHTML, reading, shuffle, icon, toast, wordHTML } from './util.js';
import { D, LEVELS, CTX, saveLesson } from './data.js';
import { S } from './settings.js';
import { emptyState, bindSay, sayBtn, chips, bindChips, readChip } from './ui.js';
import { runDrill, opt } from './drill.js';
import { sentences, sentQ, judgeJa } from './dich.js';
import { jaVoices, pickVoice, ttsReady } from './tts.js';
import { openExplain } from './explain.js';
import { loadDocWords, docWordsReady, docFit, fitBadgeHTML, fitNoteHTML, bindFitNote } from './docfit.js';

const KIND = { thongbao: 'Thông báo', tinnhan: 'Tin nhắn', email: 'Email', bienbao: 'Biển báo', giayto: 'Giấy tờ', doanvan: 'Đoạn văn' };
const MEDIUM = { tructiep: 'Nói trực tiếp', dienthoai: 'Gọi điện', line: 'Tin nhắn LINE' };
const linesOf = it => it.turns || it.sents || [];
const isDialog = it => it._type === 'dialog';
const roleOf = (it, k) => (it.roles || []).find(r => r.key === k) || { key: k, name: k };
const meKey = it => (it.roles || []).find(r => r.me)?.key;
const docDone = id => !!D.lessons[id]?.done;

// ---------- danh sách ----------
export function renderDocList(view) {
  // v51: % từ đã học của từng bài — chờ tệp tính sẵn (thường đã tải xong lúc mở app) rồi vẽ lại
  if (!docWordsReady()) loadDocWords().then(() => { if (view.isConnected && location.hash === '#/doc') renderDocList(view); });
  const all = [...D.dialog, ...D.text];
  if (!all.length) { view.innerHTML = `<a class="back" href="#/luyen">Các dạng bài</a><h1 class="h1">Hội thoại & bài đọc</h1>` + emptyState('Chưa có bài hội thoại / bài đọc nào. Skill đang soạn — có gói mới là bài hiện ở đây và trong từng bài học của Lộ trình.'); return; }
  // v43: mỗi cấp — bài luyện thêm (không gắn bài học) hiện trước; bài mở đầu của các bài học gom vào một mục thu gọn
  const row = x => `<li><a class="row" href="#/doc/${encodeURIComponent(x.id)}"><span class="row-jp">${icon(isDialog(x) ? 'chat' : 'book')} <b>${esc(x.title)}</b></span><span class="row-vi small">${esc(isDialog(x) ? MEDIUM[x.medium] || 'Hội thoại' : KIND[x.kind] || 'Bài đọc')} · ${esc(CTX[x.ctx] || '')}${docDone(x.id) ? ' · ✓' : ''}${docWordsReady() ? fitBadgeHTML(docFit(x)) : ''}</span></a></li>`;
  const block = L => {
    const xs = all.filter(x => x.level === L), free = xs.filter(x => !x.intro && !x.tonghop), intro = xs.filter(x => x.intro), th = xs.filter(x => x.tonghop);
    const done = a => a.filter(x => docDone(x.id)).length;
    return `<h2 class="h2">${esc(L)}</h2>${free.length ? `<p class="small muted">Bài luyện thêm · đã làm ${done(free)}/${free.length}</p><ul class="rows">${free.map(row).join('')}</ul>` : ''}
      ${th.length ? `<details class="doc-intros"><summary class="small">Tình huống thật — ôn sau mỗi 5 bài (${th.length}) · đã làm ${done(th)}</summary><ul class="rows">${th.map(row).join('')}</ul></details>` : ''}
      ${intro.length ? `<details class="doc-intros"${free.length ? '' : ' open'}><summary class="small">Bài mở đầu của các bài học (${intro.length}) · đã làm ${done(intro)}</summary><ul class="rows">${intro.map(row).join('')}</ul></details>` : ''}`;
  };
  view.innerHTML = `<a class="back" href="#/luyen">Các dạng bài</a><h1 class="h1">Hội thoại & bài đọc</h1>
    <p class="muted small">${D.dialog.length} bài hội thoại · ${D.text.length} bài đọc. Số % là phần từ trong bài bạn đã học: <span class="fit fit-troi">≥ 95%</span> đọc trôi · <span class="fit fit-chugiai">85–94%</span> đọc có chú giải — vừa sức để học · <span class="fit fit-kho">dưới 85%</span> nhiều từ mới. Bài luyện thêm có câu hỏi kiểu đề thi (từ N3 hỏi bằng tiếng Nhật) và được dùng trong Đề thi thử JLPT. Bài mở đầu gắn với bài học nào thì cũng có trong trang bài học đó (tab Mở đầu và Đọc hiểu).</p>
    ${speedLine()}
    ${LEVELS.filter(L => all.some(x => x.level === L)).map(block).join('')}`;
}
// v55: tốc độ đọc gần đây (chế độ Đọc bấm giờ)
function speedLine() {
  const h = readSpeedHist().slice(0, 5);
  if (!h.length) return '<p class="small muted">Mới: mỗi bài có thêm chế độ <b>Đọc bấm giờ</b> (đọc lặp lại 3 lượt, đo số chữ / phút) và <b>Nghe 3 lượt</b>.</p>';
  const avg = a => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
  return `<p class="small">Tốc độ đọc ${h.length} bài gần đây: lượt 1 trung bình <b>${avg(h.map(x => cpm(x.c, x.s[0])))}</b> chữ/phút, lượt 3 <b>${avg(h.map(x => cpm(x.c, x.s[x.s.length - 1])))}</b> chữ/phút.</p>`;
}

// ---------- trang một bài ----------
const MODES = [['doc', 'Đọc'], ['dich', 'Dịch'], ['vai', 'Đóng vai'], ['khoa', 'Từ khóa'], ['hoi', 'Câu hỏi'], ['nghe', 'Nghe cả bài'], ['nghe3', 'Nghe 3 lượt'], ['gio', 'Đọc bấm giờ']];
export function renderDoc(view, ctx, id, mode = 'doc') {
  const it = D.items.get(id);
  if (!it || !['dialog', 'text'].includes(it._type)) { view.innerHTML = emptyState('Không có bài này.', '<a class="btn btn-ghost" href="#/doc">Hội thoại & bài đọc</a>'); return; }
  const L = it.lesson && D.items.get(it.lesson);
  const modes = MODES.filter(([m]) => (m !== 'vai' || isDialog(it)) && (m !== 'khoa' || linesOf(it).some(t => t.key)) && (!['nghe', 'nghe3'].includes(m) || ttsReady()));
  if (!modes.some(([m]) => m === mode)) mode = 'doc';
  const back = L ? `#/bai/${encodeURIComponent(L.id)}?b=${it.intro ? 1 : 6}` : '#/doc';
  view.innerHTML = `<a class="back" href="${back}">${L ? `Bài ${L.order}: ${esc(L.title)}` : 'Hội thoại & bài đọc'}</a>
    <h1 class="h1">${esc(it.title)}${docDone(id) ? ' <small class="muted">✓</small>' : ''}</h1>
    <p class="small muted">${esc(it.level)} · ${esc(isDialog(it) ? MEDIUM[it.medium] || 'Hội thoại' : KIND[it.kind] || 'Bài đọc')} · ${esc(CTX[it.ctx] || '')}</p>
    ${it.setting ? `<p class="doc-set">${rich(it.setting)}</p>` : ''}
    ${mode === 'doc' ? fitNoteHTML(it) : ''}
    <div class="tabs doc-tabs" role="tablist">${modes.map(([m, l]) => `<a role="tab" href="#/doc/${encodeURIComponent(id)}${m === 'doc' ? '' : '?m=' + m}" aria-selected="${m === mode}">${l}</a>`).join('')}</div>
    <div class="doc-body"></div>`;
  const body = view.querySelector('.doc-body');
  bindSay(view);
  bindFitNote(view, it, n => toast(`Đã đưa ${n} từ vào lịch ôn — ngày mai bắt đầu hỏi lại.`));
  ({ doc: readMode, dich: dichMode, vai: vaiMode, khoa: khoaMode, hoi: hoiMode, nghe: ngheMode, nghe3: nghe3Mode, gio: gioMode }[mode])(body, ctx, it, view);
}

// ---------- 1. Đọc song ngữ ----------
// Một câu: chữ Nhật (furigana) + loa + nghĩa Việt; câu Kansai / khẩu ngữ có dòng "Nói chuẩn". Chạm vào câu → bảng giải thích.
function lineHTML(it, t, i, { vi = false, cut = 0 } = {}) {
  const me = isDialog(it) && t.who === meKey(it), r = isDialog(it) ? roleOf(it, t.who) : null;
  const cls = isDialog(it) ? `dl${me ? ' dl-me' : ''}` : `tx${t.fmt === 'h' ? ' tx-h' : t.fmt === 'r' ? ' tx-r' : ''}${t.br ? ' tx-br' : ''}`;
  const fc = !cut ? '' : i >= cut ? ' fold-x' : i === cut - 1 ? ' fold-last' : '';
  return `<div class="${cls}${fc}" data-i="${i}" data-nokj role="button" tabindex="0" aria-label="Giải thích câu ${i + 1}">
    ${r ? `<span class="dl-who">${rich(r.name)}${r.vi ? ` <small>${esc(r.vi)}</small>` : ''}</span>` : ''}
    ${/^✗/.test(t.note || '') ? '<span class="dl-bad">✗ Câu nói sai — chạm để xem vì sao</span>' : ''}
    <div class="dl-line"><p class="dl-jp" lang="ja">${rich(t.jp)}</p>${sayBtn(reading(t.jp))}</div>
    <p class="dl-vi" ${vi ? '' : 'hidden'}>${esc(t.vi)}</p>
    ${t.std ? `<p class="dl-std small" ${vi ? '' : 'hidden'}><b>Nói chuẩn:</b> <span lang="ja">${rich(t.std)}</span></p>` : ''}</div>`;
}
const boxCls = it => (isDialog(it) ? `dlg${it.medium === 'line' ? ' dlg-line' : ''}` : `txt txt-${esc(it.kind || 'doanvan')}`);
// v30 — bài dài (từ 9 câu / lượt nói) mặc định chỉ hiện 5 câu đầu; bài đọc có chỗ hết đoạn ở câu 4–6 thì cắt đúng chỗ đó.
// Mỗi lần mở bài đều rút gọn lại (không nhớ trạng thái).
const FOLD_MIN = 9, FOLD_N = 5;
export function foldCut(it) {
  const ls = linesOf(it);
  if (ls.length < FOLD_MIN) return 0;
  if (!isDialog(it)) for (const k of [5, 4, 6]) if (ls[k]?.br) return k;
  return FOLD_N;
}
const foldLabel = (it, cut, open) => open ? 'Thu gọn ▴' : `Xem cả bài · còn ${linesOf(it).length - cut} câu ▾`;
const foldBarHTML = (it, cut) => cut ? `<div class="fold-bar"><button type="button" class="btn btn-ghost btn-sm fold-btn" data-fold aria-expanded="false">${foldLabel(it, cut, false)}</button></div>` : '';
// Gắn nút Xem cả bài / Thu gọn; trả về hàm mở cả bài (dùng khi Nghe cả bài chạy tới phần đang ẩn)
function bindFold(root, box, it) {
  const b = root.querySelector('[data-fold]'), cut = foldCut(it);
  if (!b || !box || !cut) return () => {};
  const set = open => {
    box.classList.toggle('fold-on', !open);
    b.setAttribute('aria-expanded', String(open));
    b.textContent = foldLabel(it, cut, open);
  };
  b.onclick = () => {
    const open = box.classList.contains('fold-on');
    set(open);
    // thu gọn khi đang ở cuối bài dài → đưa đầu bài về lại trong màn hình
    if (!open && box.getBoundingClientRect().top < 64) box.scrollIntoView({ block: 'start' });
  };
  return () => { if (box.classList.contains('fold-on')) set(true); };
}
// Cả bài (dùng ở trang Đọc và bài mở đầu của bài học)
export function passageHTML(it, { vi = true } = {}) {
  const cut = foldCut(it);
  return `<div class="${boxCls(it)} passage${cut ? ' fold-on' : ''}">${linesOf(it).map((t, i) => lineHTML(it, t, i, { vi, cut })).join('')}</div>${foldBarHTML(it, cut)}`;
}
export function bindPassage(root, it) {
  const box = root.querySelector('.passage');
  if (!box) return;
  bindFold(root, box, it);
  const open = d => { const t = linesOf(it)[+d.dataset.i]; if (t) openExplain({ ...t, words: t.words, grammar: t.grammar }); };
  box.onclick = e => {
    if (e.target.closest('[data-say], [data-wopen], [data-gopen], a')) return;
    const d = e.target.closest('[data-i]');
    if (d) open(d);
  };
  box.onkeydown = e => { const d = e.target.closest('[data-i]'); if (d && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(d); } };
}
export const viToggleHTML = (on = true) => `<label class="check small"><input type="checkbox" data-o="vi" ${on ? 'checked' : ''}> Hiện nghĩa tiếng Việt</label>`;
export function bindViToggle(root) {
  const c = root.querySelector('[data-o=vi]');
  if (c) c.onchange = () => root.querySelectorAll('.passage .dl-vi, .passage .dl-std').forEach(v => { v.hidden = !c.checked; });
}
function readMode(body, ctx, it) {
  body.innerHTML = `${viToggleHTML(true)}
    <p class="small muted">Chạm vào một câu để xem nghĩa từng từ, cụm từ và ngữ pháp trong câu. Bấm loa để nghe.</p>
    ${passageHTML(it)}
    <div class="row-btns"><a class="btn btn-primary" href="#/doc/${encodeURIComponent(it.id)}?m=hoi">Trả lời câu hỏi</a></div>`;
  bindViToggle(body);
  bindPassage(body, it);
}

// ---------- 2. Dịch từng câu ----------
const sentOf = t => sentences().find(s => s.kind === 'd' && plain(s.jp) === plain(t.jp));
function dichMode(body, ctx, it) {
  body.innerHTML = `<form class="setup" onsubmit="return false">
    <fieldset><legend>Chiều dịch</legend>${chips('dir', [['mix', isDialog(it) ? 'Câu của mình Việt → Nhật, câu người kia Nhật → Việt' : 'Trộn'], ['nv', 'Nhật → Việt'], ['vn', 'Việt → Nhật']], 'mix', false)}</fieldset>
    <fieldset><legend>Cách làm</legend>${chips('how', [['choice', 'Chọn câu đúng'], ['type', 'Tự gõ']], 'choice', false)}</fieldset>
    <button class="btn btn-primary btn-block" data-act="go">Bắt đầu</button></form>
    <p class="small muted">Câu dịch sai sẽ quay lại trong lịch ôn như câu Luyện dịch.</p>`;
  const f = body.querySelector('.setup');
  bindChips(f);
  f.querySelector('[data-act=go]').onclick = () => {
    const dir = readChip(f, 'dir'), how = readChip(f, 'how'), me = meKey(it);
    const pool = shuffle(sentences().filter(s => s.kind === 'd' || s.level === it.level)).slice(0, 300);
    const qs = [];
    for (const t of linesOf(it)) {
      const s = sentOf(t);
      if (!s) continue;
      const d = dir !== 'mix' ? dir : isDialog(it) ? (t.who === me ? 'vn' : 'nv') : (qs.length % 2 ? 'vn' : 'nv');
      const q = sentQ(s, d, how, pool, false) || sentQ(s, d === 'vn' ? 'nv' : d, 'choice', pool, false);
      if (q) qs.push(q);
    }
    ctx.backTo = `#/doc/${encodeURIComponent(it.id)}?m=dich`;
    runDrill(body.closest('.page'), qs, ctx, { title: 'Dịch · ' + it.title, again: () => ctx.go(ctx.backTo, true) });
  };
}

// ---------- 3. Đóng vai ----------
function vaiMode(body, ctx, it) {
  const me = meKey(it), ls = linesOf(it), mine = ls.filter(t => t.who === me);
  body.innerHTML = `<p>Bạn đóng vai <b>${rich(roleOf(it, me).name)}</b>. App hiện câu người kia nói (có đọc nếu máy có giọng tiếng Nhật); đến lượt mình thì chọn hoặc gõ câu đúng.</p>
    <form class="setup" onsubmit="return false"><fieldset><legend>Cách trả lời</legend>${chips('how', [['choice', 'Chọn câu'], ['type', 'Tự gõ']], 'choice', false)}</fieldset>
    <button class="btn btn-primary btn-block" data-act="go">Bắt đầu đóng vai</button></form>`;
  const f = body.querySelector('.setup');
  bindChips(f);
  f.querySelector('[data-act=go]').onclick = () => {
    const how = readChip(f, 'how');
    const others = shuffle([...D.dialog.filter(d => d !== it).flatMap(d => linesOf(d).filter(t => t.who === meKey(d)))]);
    const qs = [];
    ls.forEach((t, i) => {
      if (t.who !== me) return;
      const ctxLines = ls.slice(Math.max(0, i - 2), i).map(p => `<p class="rp-l${p.who === me ? ' rp-me' : ''}"><span class="dl-who">${rich(roleOf(it, p.who).name)}</span> <span lang="ja">${rich(p.jp)}</span></p>`).join('');
      const prev = ls[i - 1];
      const prompt = `<div class="rp">${ctxLines || '<p class="small muted">Mình mở lời.</p>'}</div><p class="prompt-vi">${esc(t.vi)}</p>`;
      const after = `<p class="after-sent" lang="ja">${rubyHTML(t.jp, true)}</p>${t.note ? `<p class="small">💡 ${rich(t.note)}</p>` : ''}${(t.alt || []).length ? `<p class="small muted">Cũng nói được: ${t.alt.map(a => `<span lang="ja">${rich(a)}</span>`).join(' · ')}</p>` : ''}`;
      const say = prev && prev.who !== me ? reading(prev.jp) : '';
      const s = sentOf(t);
      if (how === 'type' && s && !t.std) {
        qs.push({ kind: 'type', tag: 'Đóng vai', level: it.level, prompt, hint: 'Gõ câu mình nói (kana hoặc chữ Hán)', say, autoSay: !!say, judge: x => judgeJa(s, x), answerHTML: rich(t.jp), after, review: { id: s.id, dir: 'vn' } });
        return;
      }
      const seen = new Set([plain(t.jp)]), ds = [];
      for (const o of [...shuffle(mine.filter(x => x !== t)), ...others]) { const p = plain(o.jp); if (seen.has(p)) continue; seen.add(p); ds.push(o.jp); if (ds.length >= 3) break; }
      if (ds.length < 2) return;
      qs.push({ kind: 'choice', tag: 'Đóng vai', level: it.level, prompt, hint: 'Chọn câu mình nói', say, autoSay: !!say,
        opts: shuffle([t.jp, ...ds]).map((j, k) => opt(j === t.jp ? 'ok' : 'x' + k, rich(j))), answer: 'ok', after, ...(s ? { review: { id: s.id, dir: 'vn' } } : {}) });
    });
    if (!qs.length) { toast('Bài này chưa đủ lượt để đóng vai.'); return; }
    ctx.backTo = `#/doc/${encodeURIComponent(it.id)}?m=vai`;
    runDrill(body.closest('.page'), qs, ctx, { title: 'Đóng vai · ' + it.title, again: () => ctx.go(ctx.backTo, true) });
  };
}

// ---------- 4. Điền từ khóa ----------
function khoaMode(body, ctx, it) {
  const ls = linesOf(it).filter(t => t.key && t.jp.includes(t.key));
  const keys = [...new Set([...linesOf(it), ...[...D.dialog, ...D.text].filter(d => d !== it && d.level === it.level).flatMap(linesOf)].map(t => t.key).filter(Boolean))];
  const qs = [];
  for (const t of ls) {
    const frame = t.jp.split(t.key).join('\u0000');
    const ds = shuffle(keys.filter(k => plain(k) !== plain(t.key))).slice(0, 3);
    if (ds.length < 2) continue;
    qs.push({ kind: 'choice', tag: 'Điền từ khóa', level: it.level,
      prompt: `${isDialog(it) ? `<p class="small muted">${rich(roleOf(it, t.who).name)}:</p>` : ''}<p class="prompt-sent" lang="ja">${rubyHTML(frame, true).split('\u0000').join('<span class="blank">　　　</span>')}</p><p class="prompt-vi-s">${esc(t.vi)}</p>`,
      opts: shuffle([t.key, ...ds]).map((k, i) => opt(k === t.key ? 'ok' : 'x' + i, rich(k))), answer: 'ok', after: `<p class="after-sent" lang="ja">${rubyHTML(t.jp, true)}</p>` });
  }
  if (!qs.length) { body.innerHTML = '<p class="small">Bài này chưa đủ từ khóa để làm bài điền.</p>'; return; }
  body.innerHTML = `<p>${qs.length} câu: điền từ khóa còn thiếu.</p><button class="btn btn-primary btn-block" data-act="go">Bắt đầu</button>`;
  body.querySelector('[data-act=go]').onclick = () => {
    ctx.backTo = `#/doc/${encodeURIComponent(it.id)}?m=khoa`;
    runDrill(body.closest('.page'), shuffle(qs), ctx, { title: 'Từ khóa · ' + it.title, again: () => ctx.go(ctx.backTo, true) });
  };
}

// ---------- 5. Câu hỏi hiểu ----------
function hoiMode(body, ctx, it) {
  const qs = (it.questions || []).filter(x => (x.opts || []).length >= 2).map(x => ({
    kind: 'choice', tag: 'Câu hỏi hiểu', level: it.level, prompt: `<p class="prompt-vi">${rich(x.q)}</p>`,
    opts: shuffle(x.opts.map((o, k) => opt(k === x.ans ? 'ok' : 'x' + k, rich(o), /[ぁ-ヿ一-龯]/.test(o)))), answer: 'ok', after: x.why ? `<p>${rich(x.why)}</p>` : '',
  }));
  if (!qs.length) { body.innerHTML = '<p class="small">Bài này chưa có câu hỏi.</p>'; return; }
  const r = D.lessons[it.id];
  body.innerHTML = `<p>${qs.length} câu hỏi về nội dung bài. Làm xong là bài có ✓${it.tonghop ? ' (mục Tình huống thật trong Lộ trình)' : it.intro ? ' (đạt từ 50% là xong bước Đọc hiểu của bài học)' : ''}.</p>
    ${r?.done ? `<p class="small muted">Lần trước: ${r.pct}% đúng.</p>` : ''}
    <label class="check small"><input type="checkbox" data-o="show" checked> Xem bài trong lúc làm</label>
    <button class="btn btn-primary btn-block" data-act="go">Bắt đầu</button>`;
  body.querySelector('[data-act=go]').onclick = () => {
    const show = body.querySelector('[data-o=show]').checked;
    const doc = show ? `<details class="rp-doc"><summary class="small">Xem lại bài</summary><div class="${isDialog(it) ? 'dlg' : 'txt'}">${linesOf(it).map((t, i) => lineHTML(it, t, i)).join('')}</div></details>` : '';
    ctx.backTo = `#/doc/${encodeURIComponent(it.id)}`;
    runDrill(body.closest('.page'), qs.map(q => ({ ...q, prompt: q.prompt + doc })), ctx, { title: it.title, again: () => ctx.go(`#/doc/${encodeURIComponent(it.id)}?m=hoi`, true), onDone: async (res, info) => {
      if (info.early && res.length < qs.length) return;
      const pct = Math.round((res.filter(x => x.ok).length / Math.max(1, res.length)) * 100);
      // bài có ✓ khi trả lời đúng từ một nửa số câu
      await saveLesson(it.id, { done: D.lessons[it.id]?.done || (pct >= 50 ? Date.now() : 0), pct });
      if (pct < 50) toast('Đúng dưới một nửa — đọc lại bài rồi trả lời lại để bài có ✓.');
      ctx.sessionDone?.();
    } });
  };
}

// ---------- 6. Nghe cả bài ----------
function ngheMode(body, ctx, it) {
  const ls = linesOf(it), cut = foldCut(it);
  const vs = jaVoices(), roles = (it.roles || []).map(r => r.key);
  body.innerHTML = `<div class="row-btns listen-bar"><button class="btn btn-primary" data-act="play">${icon('speaker')} Nghe cả bài</button><button class="btn btn-ghost" data-act="stop" disabled>Dừng</button></div>
    <fieldset><legend>Tốc độ</legend>${chips('rate', [['0.6', 'Chậm'], ['0.8', 'Vừa'], ['1', 'Thường'], ['1.2', 'Nhanh']], String(S.rate && S.rate <= 0.7 ? 0.6 : 0.8), false)}</fieldset>
    <label class="check small"><input type="checkbox" data-o="vi"> Hiện tiếng Việt</label> <label class="check small"><input type="checkbox" data-o="jp" checked> Hiện chữ Nhật</label>
    <div class="${isDialog(it) ? 'dlg' : 'txt'} listen-doc${cut ? ' fold-on' : ''}">${ls.map((t, i) => lineHTML(it, t, i, { cut })).join('')}</div>${foldBarHTML(it, cut)}`;
  bindChips(body);
  const docEl = body.querySelector('.listen-doc');
  const unfold = bindFold(body, docEl, it);
  const setVis = () => { const vi = body.querySelector('[data-o=vi]').checked, jp = body.querySelector('[data-o=jp]').checked; docEl.querySelectorAll('.dl-vi').forEach(v => { v.hidden = !vi; }); docEl.classList.toggle('hide-jp', !jp); };
  body.querySelectorAll('[data-o]').forEach(c => c.onchange = setVis);
  let run = 0;
  const stop = () => { run++; try { speechSynthesis.cancel(); } catch { } docEl.querySelectorAll('.is-say').forEach(e => e.classList.remove('is-say')); body.querySelector('[data-act=stop]').disabled = true; };
  ctx.onLeave(stop);
  body.querySelector('[data-act=stop]').onclick = stop;
  body.querySelector('[data-act=play]').onclick = () => {
    stop();
    const me = ++run, rate = +readChip(body, 'rate') || 0.8;
    body.querySelector('[data-act=stop]').disabled = false;
    const step = i => {
      if (me !== run) return;
      docEl.querySelectorAll('.is-say').forEach(e => e.classList.remove('is-say'));
      if (i >= ls.length) { body.querySelector('[data-act=stop]').disabled = true; return; }
      if (cut && i >= cut) unfold(); // nghe tới phần đang ẩn → mở cả bài để chữ chạy theo tiếng
      const el = docEl.querySelector(`[data-i="${i}"]`);
      el?.classList.add('is-say'); el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const u = new SpeechSynthesisUtterance(reading(ls[i].jp));
      u.lang = 'ja-JP'; u.rate = rate;
      // mỗi vai một giọng (nếu máy có nhiều giọng tiếng Nhật)
      const k = isDialog(it) ? roles.indexOf(ls[i].who) : 0;
      u.voice = vs.length > 1 && k > 0 ? vs[k % vs.length] : pickVoice();
      u.onend = () => setTimeout(() => step(i + 1), 450);
      u.onerror = () => step(i + 1);
      speechSynthesis.speak(u);
    };
    step(0);
  };
}

// ---------- v55 (đợt 8, mục 8): Nghe 3 lượt ----------
// Lượt 1 không nhìn chữ → câu hỏi ý chính · lượt 2 nhìn chữ + nghĩa, chậm hơn · lượt 3 lại không nhìn chữ, tốc độ thường → câu hỏi.
function playLines(it, docEl, rate, onEnd, alive) {
  const ls = linesOf(it), vs = jaVoices(), roles = (it.roles || []).map(r => r.key);
  const step = i => {
    if (!alive()) return;
    docEl.querySelectorAll('.is-say').forEach(e => e.classList.remove('is-say'));
    if (i >= ls.length) { onEnd(); return; }
    const el = docEl.querySelector(`[data-i="${i}"]`);
    el?.classList.add('is-say'); if (!docEl.classList.contains('hide-jp')) el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const u = new SpeechSynthesisUtterance(reading(ls[i].jp));
    u.lang = 'ja-JP'; u.rate = rate;
    const k = isDialog(it) ? roles.indexOf(ls[i].who) : 0;
    try { u.voice = vs.length > 1 && k > 0 ? vs[k % vs.length] : pickVoice(); } catch { }
    u.onend = () => setTimeout(() => step(i + 1), 450);
    u.onerror = () => step(i + 1);
    try { speechSynthesis.speak(u); } catch { step(i + 1); }
  };
  step(0);
}
const inlineQ = (x, n) => `<div class="n3-q" data-n="${n}"><p>${rich(x.q)}</p><div class="gt-opts">${shuffle(x.opts.map((o, k) => k)).map(k => `<button type="button" class="btn btn-ghost gt-o" data-k="${k}"><span>${rich(x.opts[k])}</span></button>`).join('')}</div><p class="small n3-why" hidden>${x.why ? rich(x.why) : ''}</p></div>`;
function nghe3Mode(body, ctx, it) {
  const ls = linesOf(it), qs = (it.questions || []).filter(x => (x.opts || []).length >= 2);
  const STEP = [
    ['Lượt 1 — chỉ nghe, không nhìn chữ', 'Nghe để nắm ý chính: ai nói với ai, chuyện gì. Nghe xong trả lời một câu hỏi.', 0.9, true, false],
    ['Lượt 2 — nghe và nhìn chữ, có nghĩa', 'Nhìn chữ chạy theo tiếng; chỗ nào lượt 1 nghe không ra thì để ý. Chạm vào câu để xem giải thích.', 0.8, false, true],
    ['Lượt 3 — lại chỉ nghe, tốc độ thường', 'Nghe lại không nhìn chữ. Lần này phần lớn câu sẽ nghe ra — đó là lúc tai quen tiếng.', 1, true, false],
  ];
  let s = 0, run = 0;
  const stop = () => { run++; try { speechSynthesis.cancel(); } catch { } };
  ctx.onLeave(stop);
  const draw = () => {
    const [t, d, , hide, vi] = STEP[s];
    body.innerHTML = `<p class="small muted">Nghe đúng cách: không nhìn chữ → nhìn chữ → lại không nhìn chữ. Nghe kèm chữ cùng ngôn ngữ ở lượt giữa giúp nhận ra từ và hiểu bài.</p>
      <ol class="n3-steps">${STEP.map((x, i) => `<li class="${i < s ? 'is-done' : i === s ? 'is-cur' : ''}">${esc(x[0].split(' — ')[0])}</li>`).join('')}</ol>
      <h2 class="h2">${esc(t)}</h2><p class="small">${esc(d)}</p>
      <div class="row-btns"><button class="btn btn-primary" data-act="play">${icon('speaker')} Nghe</button><button class="btn btn-ghost" data-act="stop">Dừng</button></div>
      <div class="${isDialog(it) ? 'dlg' : 'txt'} listen-doc passage${hide ? ' hide-jp n3-hide' : ''}">${ls.map((x, i) => lineHTML(it, x, i, { vi })).join('')}</div>
      <div class="n3-after"></div>`;
    if (!hide) bindPassage(body, it);
    const docEl = body.querySelector('.listen-doc'), after = body.querySelector('.n3-after');
    const next = () => {
      if (s === 0 && qs[0]) after.innerHTML = `<h3 class="h3">Câu hỏi ý chính</h3>${inlineQ(qs[0], 0)}<div class="row-btns"><button class="btn btn-primary" data-act="next">Sang lượt 2</button></div>`;
      else if (s < 2) after.innerHTML = `<div class="row-btns"><button class="btn btn-primary" data-act="next">Sang lượt ${s + 2}</button></div>`;
      else after.innerHTML = `<p>Xong 3 lượt nghe.</p><div class="row-btns">${qs.length ? `<a class="btn btn-primary" href="#/doc/${encodeURIComponent(it.id)}?m=hoi">Trả lời ${qs.length} câu hỏi</a>` : ''}<button class="btn btn-ghost" data-act="again">Nghe lại từ lượt 1</button></div>`;
    };
    body.querySelector('[data-act=play]').onclick = () => { stop(); const me = ++run; playLines(it, docEl, STEP[s][2] * ((S.rate || 0.9) / 0.9), next, () => me === run); };
    body.querySelector('[data-act=stop]').onclick = () => { stop(); next(); };
    after.onclick = e => {
      if (e.target.closest('[data-act=next]')) { stop(); s++; draw(); window.scrollTo(0, 0); return; }
      if (e.target.closest('[data-act=again]')) { stop(); s = 0; draw(); window.scrollTo(0, 0); return; }
      const o = e.target.closest('.gt-o'), q = e.target.closest('.n3-q');
      if (o && q && !q.dataset.done) {
        q.dataset.done = '1';
        const x = qs[+q.dataset.n];
        q.querySelectorAll('.gt-o').forEach(b => { b.disabled = true; if (+b.dataset.k === x.ans) b.classList.add('is-ok'); });
        if (+o.dataset.k !== x.ans) o.classList.add('is-bad');
        q.querySelector('.n3-why').hidden = false;
      }
    };
  };
  draw();
}

// ---------- v55 (đợt 8, mục 3): Đọc lặp lại có bấm giờ ----------
// Đọc một bài 3 lượt, mỗi lượt bấm giờ → số chữ / phút. Lượt 2 có thể bật giọng máy đọc kèm. Không đặt "chuẩn" — chỉ so với chính mình.
const JPCH = /[ぁ-ゖァ-ヺー一-龯々〆0-9０-９A-Za-zＡ-Ｚａ-ｚ]/g;
export const charCount = it => linesOf(it).reduce((n, t) => n + (plain(t.jp).match(JPCH) || []).length, 0);
export function readSpeedHist() {
  return Object.entries(D.lessons).filter(([, r]) => r?.rr?.s?.length).map(([id, r]) => ({ id, ...r.rr })).sort((a, b) => b.t - a.t);
}
const cpm = (c, sec) => Math.round(c / Math.max(1, sec) * 60);
function gioMode(body, ctx, it) {
  const C = charCount(it);
  const hist = readSpeedHist().filter(h => h.id !== it.id).slice(0, 8);
  const prev = D.lessons[it.id]?.rr;
  const sec = [];
  let t0 = 0, run = 0, tick = 0;
  const stop = () => { run++; clearInterval(tick); try { speechSynthesis.cancel(); } catch { } };
  ctx.onLeave(stop);
  const lap = () => sec.length + 1;
  const draw = () => {
    const done = sec.length >= 3;
    body.innerHTML = `<p class="small muted">Đọc lặp lại cùng một bài 3 lần, mỗi lần bấm giờ — đọc trôi dần, tốc độ đọc tăng (cách này đã được thử trên chính người Việt học ngoại ngữ). Bài có <b>${C}</b> chữ. Đọc thầm, hiểu tới đâu đọc tới đó, không tra từ.</p>
      ${prev ? `<p class="small">Lần trước (${new Date(prev.t).toLocaleDateString('vi-VN')}): ${prev.s.map((x, i) => `lượt ${i + 1}: <b>${cpm(prev.c, x)}</b>`).join(' · ')} chữ/phút.</p>` : ''}
      <ol class="n3-steps">${[1, 2, 3].map(i => `<li class="${i <= sec.length ? 'is-done' : i === lap() ? 'is-cur' : ''}">Lượt ${i}${sec[i - 1] ? ` · ${cpm(C, sec[i - 1])} chữ/phút` : ''}</li>`).join('')}</ol>
      ${done ? '' : `<div class="row-btns"><button class="btn btn-primary" data-act="start">Bắt đầu lượt ${lap()}</button>
        ${lap() === 2 && ttsReady() ? '<label class="check small"><input type="checkbox" data-o="tts"> Lượt 2: bật giọng máy đọc kèm, mắt đọc theo</label>' : ''}</div>`}
      <div class="rr-doc" hidden><p class="rr-time" aria-live="off">0:00</p>${passageHTML(it, { vi: false })}<div class="row-btns"><button class="btn btn-primary btn-block" data-act="end">Xong lượt ${lap()}</button></div></div>
      <div class="rr-sum">${done ? sumHTML() : ''}</div>
      ${hist.length ? `<details class="small"><summary>Tốc độ đọc các bài gần đây (lượt 1 → lượt 3)</summary><ul>${hist.map(h => { const x = D.items.get(h.id); return `<li>${esc(x?.title || h.id)}: ${cpm(h.c, h.s[0])} → ${cpm(h.c, h.s[h.s.length - 1])} chữ/phút</li>`; }).join('')}</ul></details>` : ''}`;
    const box = body.querySelector('.rr-doc');
    bindPassage(body, it);
    // mở cả bài, không gập
    box.querySelector('.passage')?.classList.remove('fold-on'); box.querySelector('.fold-bar')?.remove();
    body.querySelector('[data-act=start]')?.addEventListener('click', () => {
      const tts = body.querySelector('[data-o=tts]')?.checked;
      box.hidden = false; body.querySelector('[data-act=start]').closest('.row-btns').hidden = true;
      t0 = Date.now();
      const tEl = box.querySelector('.rr-time');
      tick = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); tEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 500);
      box.scrollIntoView({ block: 'start' });
      if (tts) { const me = ++run; playLines(it, box.querySelector('.passage'), 0.9, () => { }, () => me === run); }
    });
    body.querySelector('[data-act=end]')?.addEventListener('click', async () => {
      stop();
      const s1 = Math.max(1, Math.round((Date.now() - t0) / 1000));
      // nhanh quá sức người (trên 1.500 chữ/phút) → chắc bấm nhầm: không tính lượt này
      if (cpm(C, s1) > 1500) { toast(`Lượt này ${cpm(C, s1)} chữ/phút — nhanh quá, chắc bấm nhầm. Đọc lại lượt ${lap()}.`); draw(); return; }
      sec.push(s1);
      if (sec.length >= 3) await saveLesson(it.id, { rr: { t: Date.now(), c: C, s: sec.slice() } });
      draw();
      if (sec.length >= 3) body.querySelector('.rr-sum')?.scrollIntoView({ block: 'start' });
    });
  };
  const sumHTML = () => {
    const v = sec.map(x => cpm(C, x)), up = v[0] ? Math.round((v[2] / v[0] - 1) * 100) : 0;
    return `<div class="note"><p><b>Tốc độ đọc:</b> ${v.map((x, i) => `lượt ${i + 1}: <b>${x}</b>`).join(' · ')} chữ/phút${up > 0 ? ` — lượt 3 nhanh hơn lượt 1 khoảng <b>${up}%</b>` : ''}.</p>
      <p class="small">Đọc lặp lại giúp mắt quen mặt chữ và cách nối câu; lần sau gặp bài mới, lượt 1 sẽ nhanh dần. So tốc độ với chính mình, không cần so với người khác.</p></div>
      <div class="row-btns">${(it.questions || []).length ? `<a class="btn btn-primary" href="#/doc/${encodeURIComponent(it.id)}?m=hoi">Trả lời câu hỏi</a>` : ''}<button class="btn btn-ghost" data-act="redo">Đọc lại từ đầu</button></div>`;
  };
  body.addEventListener('click', e => { if (e.target.closest('[data-act=redo]')) { sec.length = 0; draw(); } });
  draw();
}
