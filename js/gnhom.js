// v54 (đợt 7, mục 5): Ngữ pháp theo NHÓM CHỨC NĂNG — các mẫu cùng ra một nghĩa tiếng Việt ("vì", "hình như"…) đặt cạnh nhau,
// bảng so sánh (cấp, nghĩa, văn nói / viết, sắc thái) và bài "chọn mẫu đúng sắc thái".
// Học các mẫu gần nghĩa CÙNG LÚC lần đầu thì dễ nhiễu; ôn trộn SAU KHI đã học thì nhớ lâu hơn → bài luyện chỉ lấy mẫu đã học.
// Dữ liệu riêng của app: data/gnhom.json { groups: [{id, name, vi, intro, axes}], items: { <mã mẫu>: {g, g2?, reg, note} } }.
import { esc, rich, plain, shuffle } from './util.js';
import { D, LEVELS } from './data.js';
import { status } from './srs.js';
import { runDrill, opt } from './drill.js';
import { emptyState } from './ui.js';
import { gtabs, buildGrammarQs } from './gdrill.js';

let P = null, G = null;
export function loadGN() {
  if (!P) P = import('./lock.js').then(m => m.appData('gnhom', { groups: [], items: {} })).catch(() => ({ groups: [], items: {} })).then(j => { G = j; return j; }); // v57
  return P;
}
const REG = { noi: 'khẩu ngữ', ca: 'nói & viết', viet: 'văn viết', trang: 'trang trọng' };
const members = gid => D.grammar.filter(g => { const x = G.items[g.id]; return x && (x.g === gid || x.g2 === gid); })
  .sort((a, b) => LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level));
const learned = g => status(g) !== 'new';
const grp = gid => G.groups.find(x => x.id === gid);

export async function renderGroups(view) {
  await loadGN();
  if (!G.groups.length || !Object.keys(G.items).length) { view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('nhom')}` + emptyState('Chưa có dữ liệu nhóm ngữ pháp. Cập nhật app khi có mạng.'); return; }
  const rows = G.groups.map(x => { const m = members(x.id); return { x, n: m.length, k: m.filter(learned).length }; }).filter(r => r.n);
  view.innerHTML = `<h1 class="h1">Ngữ pháp</h1>${gtabs('nhom')}
    <p class="muted small">Từ N3, nhiều mẫu cùng ra một nghĩa tiếng Việt: "vì" có から, ので, ため, おかげで, せいで, 〜からこそ, 〜ゆえに… Học thuộc nghĩa Việt thì chọn sai. Ở đây các mẫu cùng chức năng đặt cạnh nhau, kèm chỗ khác nhau (văn nói / viết, tốt / xấu, ai nói…).</p>
    <p class="muted small">Mẫu chưa học hiện mờ. Bài luyện của nhóm <b>chỉ lấy mẫu đã học</b> — học nhiều mẫu gần nghĩa cùng lúc lần đầu dễ nhiễu; ôn trộn sau khi đã học mới giúp nhớ lâu. Sai nhiều khi ôn trộn là bình thường.</p>
    <ul class="rows gn-list">${rows.map(({ x, n, k }) => `<li><a class="row" href="#/nguphap/nhom/${x.id}"><span class="row-jp"><b>${esc(x.name)}</b></span><span class="row-vi">${esc(x.vi)} · ${n} mẫu${k ? ` · đã học ${k}` : ''}</span></a></li>`).join('')}</ul>`;
}

const maskNote = (note, g) => {
  const core = plain(g.pattern).replace(/[〜～]/g, '').split(/[・／/（(]/)[0].trim();
  return core.length >= 2 ? String(note).split(core).join('＿＿') : note;
};
export async function renderGroup(view, ctx, gid) {
  await loadGN();
  const x = grp(gid);
  if (!x) { view.innerHTML = emptyState('Không có nhóm này.', '<a class="btn btn-ghost" href="#/nguphap/nhom">Các nhóm</a>'); return; }
  const m = members(gid), k = m.filter(learned);
  const by = LEVELS.map(l => [l, m.filter(g => g.level === l)]).filter(([, a]) => a.length);
  view.innerHTML = `<a class="back" href="#/nguphap/nhom">Các nhóm</a>
    <h1 class="h1">${esc(x.name)}</h1>
    <p class="muted small">Tiếng Việt: ${esc(x.vi)} · ${m.length} mẫu · đã học ${k.length}</p>
    ${x.intro ? `<div class="note"><p>${rich(x.intro)}</p>${(x.axes || []).length ? `<p class="small"><b>Khi chọn mẫu, hỏi:</b> ${x.axes.map(esc).join(' · ')}</p>` : ''}</div>` : ''}
    <div class="row-btns">${k.length >= 2 ? `<a class="btn btn-primary" href="#/nguphap/nhom/${gid}/luyen">Luyện chọn mẫu đúng (${k.length} mẫu đã học)</a>` : `<p class="small muted">Học ít nhất 2 mẫu của nhóm thì mở được bài luyện chọn mẫu.</p>`}</div>
    ${by.map(([l, arr]) => `<h2 class="h2">${l}</h2><ul class="gn-rows">
      ${arr.map(g => { const it = G.items[g.id]; return `<li class="${learned(g) ? '' : 'is-new'}"><a href="#/nguphap/${encodeURIComponent(g.id)}"><span class="gn-p" lang="ja">${rich(g.pattern)}</span><span class="gn-reg">${esc(REG[it.reg] || '')}${it.g !== gid ? ' · nhóm phụ' : ''}${learned(g) ? '' : ' · chưa học'}</span>
        <span class="gn-m">${rich(g.meaning)}</span><span class="gn-n">${rich(it.note)}</span></a></li>`; }).join('')}
    </ul>`).join('')}`;
}

// các dạng của một mẫu (〜せいで・〜せいか → せいで, せいか) — hai mẫu có dạng trùng / lồng nhau thì không đặt cùng một câu
const cores = g => plain(g.pattern).replace(/[〜～]/g, '').replace(/[（(][^）)]*[）)]/g, '').split(/[・／/]/).map(s => s.trim()).filter(s => s.length >= 2);
const overlap = (a, b) => { const A = cores(a), B = cores(b); return A.some(x => B.some(y => x.includes(y) || y.includes(x))); };
// câu "chọn mẫu đúng sắc thái": nghĩa + ghi chú (đã che tên mẫu) → chọn mẫu trong nhóm (chỉ mẫu đã học)
function nuanceQ(g, pool, gid) {
  const it = G.items[g.id];
  const ds = shuffle(pool.filter(o => o !== g && plain(o.pattern) !== plain(g.pattern) && !overlap(o, g))).slice(0, 3);
  if (!ds.length) return null;
  return { kind: 'choice', tag: 'Chọn mẫu đúng sắc thái', level: g.level, noCmp: true,
    prompt: `<p class="prompt-vi-s">${rich(g.meaning)}</p><p class="prompt-hint">${rich(maskNote(it.note, g))} <small>(${esc(REG[it.reg] || '')})</small></p>`,
    hint: 'Mẫu nào đúng với nghĩa và sắc thái này?',
    opts: shuffle([g, ...ds]).map(o => opt(o.id, rich(o.pattern))), answer: g.id,
    after: `<table class="gn-tbl small"><tbody>${[g, ...ds].map(o => `<tr${o === g ? ' class="is-ok"' : ''}><td lang="ja">${rich(o.pattern)}</td><td>${rich(G.items[o.id]?.note || '')}</td></tr>`).join('')}</tbody></table><p class="small"><a href="#/nguphap/nhom/${gid}">Bảng so sánh cả nhóm</a></p>` };
}
export async function runGroupDrill(view, ctx, gid) {
  await loadGN();
  const x = grp(gid);
  const k = x ? members(gid).filter(learned) : [];
  if (k.length < 2) { view.innerHTML = emptyState('Cần học ít nhất 2 mẫu của nhóm này.', `<a class="btn btn-ghost" href="#/nguphap/nhom/${gid}">Về nhóm</a>`); return; }
  const a = shuffle(k).map(g => nuanceQ(g, k, gid)).filter(Boolean);
  const b = buildGrammarQs({ type: 'situ', ids: k.map(g => g.id), count: 10 });
  const qs = shuffle([...a.slice(0, 10), ...b]).slice(0, 15);
  ctx.backTo = `#/nguphap/nhom/${gid}`;
  runDrill(view, qs, ctx, { title: `Nhóm: ${x.name}`, noReview: true, again: () => ctx.go(`#/nguphap/nhom/${gid}/luyen`, true) });
}

// thẻ nhỏ ở trang chi tiết mẫu: "Nhóm: Nguyên nhân – lý do →"
export async function groupChip(view, g) {
  await loadGN();
  const it = G.items[g.id];
  const slot = view.querySelector('.gram-meaning');
  if (!it || !slot) return;
  const gs = [it.g, it.g2].filter(Boolean).map(grp).filter(Boolean);
  slot.insertAdjacentHTML('afterend', `<p class="small gn-chip">Nhóm chức năng: ${gs.map(x => `<a href="#/nguphap/nhom/${x.id}">${esc(x.name)}</a>`).join(' · ')} · <span class="muted">${esc(REG[it.reg] || '')}</span><br><span class="muted">${rich(it.note)}</span></p>`);
}
