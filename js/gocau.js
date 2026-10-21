// v50: "Gỡ câu 2 bước" (bài cầu nối N4 → N3). Tiếng Nhật đặt phần bổ nghĩa TRƯỚC danh từ (昨日買った魚), tiếng Việt đặt SAU ("con cá mà hôm qua mua").
//  Bước 1: tìm danh từ được bổ nghĩa (danh từ trung tâm) — bấm chọn cụm trong câu.
//  Bước 2: đưa danh từ đó lên trước như tiếng Việt, rồi hiểu cả câu (chọn nghĩa đúng).
// Dữ liệu: câu ví dụ của gói caunoi-02, caunoi-03 — [[mệnh đề bổ nghĩa]] rồi danh từ trung tâm đứng ngay sau ]].
import { esc, shuffle, parseJP, rubyHTML, stripHL, isKanjiCh } from './util.js';
import { D } from './data.js';
import { emptyState } from './ui.js';
import { runDrill, opt } from './drill.js';

export const GOCAU_PACKS = new Set(['caunoi-02', 'caunoi-03']);
export const isGoCau = g => !!g && GOCAU_PACKS.has(g._pack);

const cls = ch => /[ぁ-ゟ]/.test(ch) ? 'h' : /[゠-ヿ]/.test(ch) ? 'k' : (isKanjiCh(ch) || ch === '々') ? 'K' : /[、。！？「」『』（）・：…,.!?\s]/.test(ch) ? 'p' : 'l';
// Câu → các cụm để bấm (cắt ở chỗ chữ Hán / katakana nối sau hiragana; luôn cắt ở đầu và cuối phần [[ ]])
function chunk(jp) {
  const units = [];
  for (const g of parseJP(jp)) {
    if (g.r) units.push({ src: `${g.t}[${g.r}]`, c: 'K', hl: g.hl, t: g.t });
    else for (const ch of g.t) units.push({ src: ch, c: cls(ch), hl: g.hl, t: ch });
  }
  // Cắt ở chỗ hiragana → chữ Hán / katakana, trừ okurigana giữa từ (飲み終わる, 引っ越し, 指差し); お・ご đứng trước chữ Hán đi theo từ sau (お金)
  const MID = new Set(['み', 'き', 'り', 'し', 'ち', 'び', 'っ', 'え', 'け', 'せ', 'ぎ', 'じ']);
  const segs = [];
  let cur = null, prev = null, run = '';
  units.forEach((u, i) => {
    const edge = prev && u.hl !== prev.hl; // ranh giới phần bổ nghĩa
    const word = u.c === 'K' || u.c === 'k' || u.c === 'l';
    let brk = !cur || edge || (u.c !== 'p' && prev.c === 'p');
    if (!brk && word && prev.c === 'h' && !(run.length === 1 && MID.has(run)) && !(cur.units.length === 1 && /^[おご]$/.test(run))) brk = true;
    if (!brk && u.c === 'h' && /^[おご]$/.test(u.t) && prev.c !== 'p' && units[i + 1] && units[i + 1].c === 'K' && units[i + 1].hl === u.hl) brk = true;
    if (brk && word && cur && !edge && /^[おご]$/.test(prev.t) && cur.units.length > 1 && cur.units.at(-1) === prev && run.length > 1) { cur.units.pop(); cur = { units: [prev], hl: u.hl, at: i - 1 }; segs.push(cur); brk = false; }
    if (brk) { cur = { units: [], hl: u.hl, at: i }; segs.push(cur); }
    cur.units.push(u); prev = u;
    run = u.c === 'h' ? (brk ? u.t : run + u.t) : '';
  });
  for (const s of segs) { s.src = s.units.map(u => u.src).join(''); s.text = s.units.map(u => u.t).join(''); s.noun = s.units.some(u => u.c === 'K' || u.c === 'k'); }
  const hi = segs.findIndex((s, i) => i > 0 && !s.hl && segs[i - 1].hl);
  return { segs, hi };
}
// Danh từ trung tâm (để hiện): chữ Hán / katakana liền nhau ở đầu cụm, kèm お・ご đứng trước
function headWord(seg) {
  let out = '', st = 0;
  for (const u of seg.units) {
    if (st === 0 && u.c === 'h' && /^[おご]$/.test(u.t)) { out += u.src; st = 1; continue; }
    if (u.c === 'K' || u.c === 'k' || (u.t === 'ー' && out)) { out += u.src; st = 2; continue; }
    if (st === 0 && u.c === 'h') { out += u.src; continue; } // danh từ viết kana: lấy tới trợ từ
    break;
  }
  return out || seg.src;
}
export function gocauQs(gs, count = 6) {
  const pool = [];
  for (const g of gs.filter(isGoCau)) for (const ex of g.ex || []) if (ex.jp && ex.vi && /\[\[/.test(ex.jp) && !/[AB]：/.test(ex.jp)) pool.push({ g, ex });
  const allVi = [...new Set(D.grammar.filter(isGoCau).flatMap(g => (g.ex || []).map(e => e.vi)).filter(Boolean))];
  const qs = [];
  for (const { g, ex } of shuffle(pool).slice(0, count)) {
    const { segs, hi } = chunk(ex.jp);
    if (hi < 1) continue;
    const head = segs[hi], clause = segs.filter(s => s.hl);
    // phương án: cụm trung tâm + 3 cụm có chữ Hán / katakana khác (ưu tiên trong phần bổ nghĩa — chỗ hay chọn nhầm), giữ thứ tự trong câu
    const seen = new Set([head.text]);
    const others = segs.filter((s, i) => i !== hi && s.noun && !seen.has(s.text) && seen.add(s.text));
    const inCl = shuffle(others.filter(s => s.hl)), outCl = shuffle(others.filter(s => !s.hl));
    const picks = [...inCl.slice(0, 2), ...outCl.slice(0, 1)];
    for (const s of [...inCl.slice(2), ...outCl.slice(1)]) { if (picks.length >= 3) break; picks.push(s); }
    if (picks.length < 2) continue;
    const opts = [head, ...picks].sort((a, b) => a.at - b.at);
    const hw = headWord(head), clSrc = clause.map(s => s.src).join('');
    const marked = segs.map((s, i) => i === hi ? `<b class="gc-h">${rubyHTML(s.src)}</b>` : s.hl ? `<span class="gc-cl">${rubyHTML(s.src)}</span>` : rubyHTML(s.src)).join('');
    const undo = `<p class="gc-undo"><span class="gc-n">Gỡ</span> <b class="gc-h" lang="ja">${rubyHTML(hw)}</b> ← <span class="gc-cl" lang="ja">${rubyHTML(clSrc)}</span><br><small class="muted">= "${esc(stripHL(hw).replace(/\[[^\]]*\]/g, ''))} mà …": tiếng Việt nói danh từ trước, phần bổ nghĩa sau.</small></p>`;
    const sent = `<p class="prompt-sent" lang="ja">${rubyHTML(stripHL(ex.jp))}</p>`;
    qs.push({
      kind: 'choice', tag: 'Gỡ câu · bước 1', level: g.level, prompt: sent,
      hint: 'Phần bổ nghĩa đứng TRƯỚC danh từ. Danh từ được bổ nghĩa (danh từ trung tâm) là cụm nào?',
      opts: opts.map(s => opt(s === head ? 'ok' : 's' + s.at, rubyHTML(s.src), true)), answer: 'ok', noSlow: true,
      after: `<p class="after-sent gc-sent" lang="ja">${marked}</p>${undo}`,
    });
    const ds = shuffle(allVi.filter(v => v !== ex.vi)).slice(0, 3);
    if (ds.length < 3) continue;
    qs.push({
      kind: 'choice', tag: 'Gỡ câu · bước 2', level: g.level, review: { id: g.id, dir: 'gp' },
      prompt: `<p class="prompt-sent gc-sent" lang="ja">${marked}</p>${undo}`, hint: 'Đưa danh từ lên trước như tiếng Việt, rồi chọn nghĩa của cả câu',
      opts: shuffle([ex.vi, ...ds]).map((v, i) => opt(v === ex.vi ? 'ok' : 'x' + i, esc(v), false)), answer: 'ok',
      after: `<p class="small muted">${esc(ex.vi)}</p>`,
    });
  }
  return qs;
}
// #/gocau/<mã mẫu ngữ pháp | mã bài>
export function runGoCau(view, ctx, key) {
  const g = D.items.get(key), L = globalThis.__lessonById?.(key);
  const gs = g ? [g] : L ? L.grammar.map(id => D.items.get(id)).filter(Boolean) : [];
  const qs = gocauQs(gs, g ? 5 : 6);
  if (!qs.length) { view.innerHTML = emptyState('Chưa có câu để luyện gỡ câu.', '<a class="btn btn-ghost" href="#/lotrinh">Về Lộ trình</a>'); return; }
  runDrill(view, qs, ctx, { title: 'Gỡ câu 2 bước', again: () => ctx.go('#/gocau/' + encodeURIComponent(key), true) });
}
