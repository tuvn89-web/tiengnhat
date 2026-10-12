// Hội thoại & bài đọc (H1, H8 · Đ11): đọc song ngữ · dịch từng câu · đóng vai (chọn / gõ câu của mình) · điền từ khóa ·
// câu hỏi hiểu · nghe cả bài (chỉnh tốc độ). Không có phần luyện nói / ghi âm.
import { esc, rich, plain, rubyHTML, reading, shuffle, icon, toast, wordHTML } from './util.js';
import { D, LEVELS, CTX, saveLesson } from './data.js';
import { S } from './settings.js';
import { emptyState, bindSay, sayBtn, chips, bindChips, readChip } from './ui.js';
import { runDrill, opt } from './drill.js';
import { sentences, sentQ, judgeJa } from './dich.js';
import { jaVoices, pickVoice, ttsReady } from './tts.js';

const KIND = { thongbao: 'Thông báo', tinnhan: 'Tin nhắn', email: 'Email', bienbao: 'Biển báo', giayto: 'Giấy tờ', doanvan: 'Đoạn văn' };
const MEDIUM = { tructiep: 'Nói trực tiếp', dienthoai: 'Gọi điện', line: 'Tin nhắn LINE' };
const linesOf = it => it.turns || it.sents || [];
const isDialog = it => it._type === 'dialog';
const roleOf = (it, k) => (it.roles || []).find(r => r.key === k) || { key: k, name: k };
const meKey = it => (it.roles || []).find(r => r.me)?.key;
const docDone = id => !!D.lessons[id]?.done;

// ---------- danh sách ----------
export function renderDocList(view) {
  const all = [...D.dialog, ...D.text];
  if (!all.length) { view.innerHTML = `<a class="back" href="#/luyen">Các dạng bài</a><h1 class="h1">Hội thoại & bài đọc</h1>` + emptyState('Chưa có bài hội thoại / bài đọc nào. Skill đang soạn — có gói mới là bài hiện ở đây và trong từng bài học của Lộ trình.'); return; }
  view.innerHTML = `<a class="back" href="#/luyen">Các dạng bài</a><h1 class="h1">Hội thoại & bài đọc</h1>
    <p class="muted small">${D.dialog.length} bài hội thoại · ${D.text.length} bài đọc. Bài gắn với bài học nào thì cũng có trong trang bài học đó (bước 7).</p>
    ${LEVELS.filter(L => all.some(x => x.level === L)).map(L => `<h2 class="h2">${esc(L)}</h2><ul class="rows">${all.filter(x => x.level === L).map(x => `<li><a class="row" href="#/doc/${encodeURIComponent(x.id)}"><span class="row-jp">${icon(isDialog(x) ? 'chat' : 'book')} <b>${esc(x.title)}</b></span><span class="row-vi small">${esc(isDialog(x) ? MEDIUM[x.medium] || 'Hội thoại' : KIND[x.kind] || 'Bài đọc')} · ${esc(CTX[x.ctx] || '')}${docDone(x.id) ? ' · ✓' : ''}</span></a></li>`).join('')}</ul>`).join('')}`;
}

// ---------- trang một bài ----------
const MODES = [['doc', 'Đọc'], ['dich', 'Dịch'], ['vai', 'Đóng vai'], ['khoa', 'Từ khóa'], ['hoi', 'Câu hỏi'], ['nghe', 'Nghe cả bài']];
export function renderDoc(view, ctx, id, mode = 'doc') {
  const it = D.items.get(id);
  if (!it || !['dialog', 'text'].includes(it._type)) { view.innerHTML = emptyState('Không có bài này.', '<a class="btn btn-ghost" href="#/doc">Hội thoại & bài đọc</a>'); return; }
  const L = it.lesson && D.items.get(it.lesson);
  const modes = MODES.filter(([m]) => (m !== 'vai' || isDialog(it)) && (m !== 'khoa' || linesOf(it).some(t => t.key)) && (m !== 'nghe' || ttsReady()));
  if (!modes.some(([m]) => m === mode)) mode = 'doc';
  const back = L ? `#/bai/${encodeURIComponent(L.id)}?b=7` : '#/doc';
  view.innerHTML = `<a class="back" href="${back}">${L ? `Bài ${L.order}: ${esc(L.title)}` : 'Hội thoại & bài đọc'}</a>
    <h1 class="h1">${esc(it.title)}${docDone(id) ? ' <small class="muted">✓</small>' : ''}</h1>
    <p class="small muted">${esc(it.level)} · ${esc(isDialog(it) ? MEDIUM[it.medium] || 'Hội thoại' : KIND[it.kind] || 'Bài đọc')} · ${esc(CTX[it.ctx] || '')}</p>
    ${it.setting ? `<p class="doc-set">${rich(it.setting)}</p>` : ''}
    <div class="tabs doc-tabs" role="tablist">${modes.map(([m, l]) => `<a role="tab" href="#/doc/${encodeURIComponent(id)}${m === 'doc' ? '' : '?m=' + m}" aria-selected="${m === mode}">${l}</a>`).join('')}</div>
    <div class="doc-body"></div>`;
  const body = view.querySelector('.doc-body');
  bindSay(view);
  ({ doc: readMode, dich: dichMode, vai: vaiMode, khoa: khoaMode, hoi: hoiMode, nghe: ngheMode }[mode])(body, ctx, it, view);
}

// ---------- 1. Đọc song ngữ ----------
function lineHTML(it, t, i) {
  const me = isDialog(it) && t.who === meKey(it), r = isDialog(it) ? roleOf(it, t.who) : null;
  const words = (t.words || []).map(w => typeof w === 'string' ? D.items.get(w) : null).filter(Boolean);
  const gram = (t.grammar || []).map(g => D.items.get(g)).filter(Boolean);
  const x = [
    t.std ? `<p class="small"><b>Nói chuẩn:</b> <span lang="ja">${rich(t.std)}</span></p>` : '',
    (t.gloss || []).length ? `<p class="small muted">${t.gloss.map(g => `<span lang="ja">${rich(g.w)}</span>: ${esc(g.vi)}`).join(' · ')}</p>` : '',
    t.note ? `<p class="small dl-note">💡 ${rich(t.note)}</p>` : '',
    words.length || gram.length ? `<p class="dl-words">${words.map(w => `<button type="button" class="chip" data-wopen="${esc(w.id)}" lang="ja">${wordHTML(w, 'furi')}</button>`).join('')}${gram.map(g => `<a class="chip" href="#/nguphap/${encodeURIComponent(g.id)}" lang="ja">${rich(g.pattern)}</a>`).join('')}</p>` : '',
  ].join('');
  const cls = isDialog(it) ? `dl${me ? ' dl-me' : ''}` : `tx${t.fmt === 'h' ? ' tx-h' : t.fmt === 'r' ? ' tx-r' : ''}${t.br ? ' tx-br' : ''}`;
  return `<div class="${cls}" data-i="${i}">
    ${r ? `<span class="dl-who">${rich(r.name)}${r.vi ? ` <small>${esc(r.vi)}</small>` : ''}</span>` : ''}
    <div class="dl-line"><p class="dl-jp" lang="ja">${rich(t.jp)}</p>${sayBtn(reading(t.jp))}</div>
    <p class="dl-vi" hidden>${esc(t.vi)}</p>
    ${x ? `<div class="dl-x" hidden>${x}</div>` : ''}</div>`;
}
function readMode(body, ctx, it) {
  const ls = linesOf(it);
  body.innerHTML = `<label class="check small"><input type="checkbox" data-o="vi"> Hiện tiếng Việt cả bài</label>
    <p class="small muted">Chạm vào một câu để xem nghĩa, từ, ghi chú. Bấm loa để nghe.</p>
    <div class="${isDialog(it) ? `dlg${it.medium === 'line' ? ' dlg-line' : ''}` : `txt txt-${esc(it.kind || 'doanvan')}`}">${ls.map((t, i) => lineHTML(it, t, i)).join('')}</div>
    <div class="row-btns"><a class="btn btn-primary" href="#/doc/${encodeURIComponent(it.id)}?m=hoi">Trả lời câu hỏi</a></div>`;
  body.querySelector('[data-o=vi]').onchange = e => body.querySelectorAll('.dl-vi, .dl-x').forEach(v => { v.hidden = !e.target.checked; });
  body.querySelector('.dlg, .txt').onclick = e => {
    if (e.target.closest('[data-say], [data-wopen], a')) return;
    const d = e.target.closest('[data-i]');
    if (!d) return;
    const v = d.querySelector('.dl-vi'), x = d.querySelector('.dl-x'), show = v.hidden;
    v.hidden = !show; if (x) x.hidden = !show;
  };
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
  body.innerHTML = `<p>Cậu Cả đóng vai <b>${rich(roleOf(it, me).name)}</b>. App hiện câu người kia nói (có đọc nếu máy có giọng tiếng Nhật); đến lượt mình thì chọn hoặc gõ câu đúng.</p>
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
  const ls = linesOf(it);
  const vs = jaVoices(), roles = (it.roles || []).map(r => r.key);
  body.innerHTML = `<div class="row-btns listen-bar"><button class="btn btn-primary" data-act="play">${icon('speaker')} Nghe cả bài</button><button class="btn btn-ghost" data-act="stop" disabled>Dừng</button></div>
    <fieldset><legend>Tốc độ</legend>${chips('rate', [['0.6', 'Chậm'], ['0.8', 'Vừa'], ['1', 'Thường'], ['1.2', 'Nhanh']], String(S.rate && S.rate <= 0.7 ? 0.6 : 0.8), false)}</fieldset>
    <label class="check small"><input type="checkbox" data-o="vi"> Hiện tiếng Việt</label> <label class="check small"><input type="checkbox" data-o="jp" checked> Hiện chữ Nhật</label>
    <div class="${isDialog(it) ? 'dlg' : 'txt'} listen-doc">${ls.map((t, i) => lineHTML(it, t, i)).join('')}</div>`;
  bindChips(body);
  const docEl = body.querySelector('.listen-doc');
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
