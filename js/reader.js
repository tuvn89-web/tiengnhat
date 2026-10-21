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
    const xs = all.filter(x => x.level === L), free = xs.filter(x => !x.intro), intro = xs.filter(x => x.intro);
    const done = a => a.filter(x => docDone(x.id)).length;
    return `<h2 class="h2">${esc(L)}</h2>${free.length ? `<p class="small muted">Bài luyện thêm · đã làm ${done(free)}/${free.length}</p><ul class="rows">${free.map(row).join('')}</ul>` : ''}
      ${intro.length ? `<details class="doc-intros"${free.length ? '' : ' open'}><summary class="small">Bài mở đầu của các bài học (${intro.length}) · đã làm ${done(intro)}</summary><ul class="rows">${intro.map(row).join('')}</ul></details>` : ''}`;
  };
  view.innerHTML = `<a class="back" href="#/luyen">Các dạng bài</a><h1 class="h1">Hội thoại & bài đọc</h1>
    <p class="muted small">${D.dialog.length} bài hội thoại · ${D.text.length} bài đọc. Số % là phần từ trong bài bạn đã học: <span class="fit fit-troi">≥ 95%</span> đọc trôi · <span class="fit fit-chugiai">85–94%</span> đọc có chú giải — vừa sức để học · <span class="fit fit-kho">dưới 85%</span> nhiều từ mới. Bài luyện thêm có câu hỏi kiểu đề thi (từ N3 hỏi bằng tiếng Nhật) và được dùng trong Đề thi thử JLPT. Bài mở đầu gắn với bài học nào thì cũng có trong trang bài học đó (tab Mở đầu và Đọc hiểu).</p>
    ${LEVELS.filter(L => all.some(x => x.level === L)).map(block).join('')}`;
}

// ---------- trang một bài ----------
const MODES = [['doc', 'Đọc'], ['dich', 'Dịch'], ['vai', 'Đóng vai'], ['khoa', 'Từ khóa'], ['hoi', 'Câu hỏi'], ['nghe', 'Nghe cả bài']];
export function renderDoc(view, ctx, id, mode = 'doc') {
  const it = D.items.get(id);
  if (!it || !['dialog', 'text'].includes(it._type)) { view.innerHTML = emptyState('Không có bài này.', '<a class="btn btn-ghost" href="#/doc">Hội thoại & bài đọc</a>'); return; }
  const L = it.lesson && D.items.get(it.lesson);
  const modes = MODES.filter(([m]) => (m !== 'vai' || isDialog(it)) && (m !== 'khoa' || linesOf(it).some(t => t.key)) && (m !== 'nghe' || ttsReady()));
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
  ({ doc: readMode, dich: dichMode, vai: vaiMode, khoa: khoaMode, hoi: hoiMode, nghe: ngheMode }[mode])(body, ctx, it, view);
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
  body.innerHTML = `<p>${qs.length} câu hỏi về nội dung bài. Làm xong là bài có ✓${it.lesson ? ' (bước 7 của bài học)' : ''}.</p>
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
