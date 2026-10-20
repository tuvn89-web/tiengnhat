// Kiểm tra trình độ (đợt 5a — Đ1, Đ2): Xếp lớp nhanh (thích ứng N5 → …) · Thi vượt cấp (một cấp, ~55 câu) · Kiểm tra theo gói (10 câu).
// Kết quả đổi tiến độ theo ngưỡng (mặc định 85% / 70%), chỉ đổi khi bấm Áp dụng, hoàn tác được trong 7 ngày.
import { esc, rich, plain, rubyHTML, stripHL, reading, shuffle, wordHTML, fmtDate, toast, DAY } from './util.js';
import { bareOK, bareHintHTML } from './bare.js';
import { D, LEVELS, saveTest, testList, setPrefs } from './data.js';
import { status, bulkApply, progSnapshot, progRestore } from './srs.js';
import { answerOf, distractors, readHint } from './quiz.js';
import { kanjiQuestion } from './kanji.js';
import { GQ, buildGrammarQs } from './gdrill.js';
import { runDrill, opt } from './drill.js';
import { chips, bindChips, readChip, emptyState, bindSay } from './ui.js';
import { goBack, crumbHTML, resultNavHTML, bindResultNav } from './nav.js';
import { runLearn } from './learn.js';
import { ttsReady } from './tts.js';
import { nextFrame, loadingHTML, curGen } from './lazy.js';
import { kvGet, kvSet, del } from './db.js';

// ---------- nhãn ----------
export const SK = { vocab: 'Từ vựng', kread: 'Đọc chữ Hán', kanji: 'Thẻ chữ Hán', grammar: 'Ngữ pháp', read: 'Đọc hiểu', listen: 'Nghe' };
const KIND = { xeplop: 'Xếp lớp nhanh', vuotcap: 'Thi vượt cấp', goi: 'Kiểm tra theo gói', thithu: 'Thi thử JLPT' };
// chủ đề của từ / bối cảnh câu ví dụ → một nhóm chung để vẽ biểu đồ
const TG = { doisong: 'Đời sống', xuong: 'Xưởng & thủy sản', thuysan: 'Xưởng & thủy sản', thuevisa: 'Thủ tục & giấy tờ', thutuc: 'Thủ tục & giấy tờ', hoithoai: 'Hội thoại', kansai: 'Kansai-ben', jlpt: 'JLPT chung' };
const SPEC = new Set(['xuong', 'thuysan', 'thuevisa', 'kansai']);
// Từ chuyên ngành (xưởng, thủy sản, thủ tục, Kansai): qua đề JLPT chưa chắc đã biết → mặc định không tự đánh dấu
export const isSpec = v => v.reg === 'kansai' || (v.topics.length > 0 && v.topics.every(t => SPEC.has(t)));
const vTopic = v => TG[v.topics.find(t => t !== 'jlpt') || v.topics[0]] || 'JLPT chung';

export const thresholds = () => ({ hi: D.prefs.lvHi || 85, lo: D.prefs.lvLo || 70 });
const pctOf = res => (res.length ? Math.round((res.filter(r => r.ok).length / res.length) * 100) : 0);
const bandOf = p => { const { hi, lo } = thresholds(); return p >= hi ? 'hi' : p >= lo ? 'mid' : 'lo'; };

// ---------- chọn mục rải đều các gói ----------
function spread(items, key = it => it._pack) {
  const groups = new Map();
  for (const it of shuffle([...items])) { const k = key(it); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(it); }
  const lanes = shuffle([...groups.values()]), out = [];
  while (lanes.some(l => l.length)) for (const l of lanes) if (l.length) out.push(l.shift());
  return out;
}
const vocabOf = L => D.vocab.filter(v => v.level === L);

// ---------- từng loại câu ----------
function vocabQ(v, dir, L, lesson = false) {
  const right = answerOf(v, dir, 'furi');
  const ds = distractors(v, dir, 'furi');
  if (ds.length < 3) return null;
  const base = { kind: 'choice', level: L, opts: shuffle([right, ...ds]).map(a => opt(a.key, a.html, a.jp)), answer: right.key, review: { id: v.id, dir }, topic: vTopic(v) };
  if (dir === 'kr') return { ...base, sk: 'kread', tag: SK.kread, promptBare: true, prompt: `<p class="prompt-jp" lang="ja" data-bare>${esc(v.kanji)}</p>${lesson ? bareHintHTML(v) : readHint(v)}`, hint: 'Chọn cách đọc' };
  if (dir === 'vj') return { ...base, sk: 'vocab', tag: SK.vocab, prompt: `<p class="prompt-vi">${esc(v.vi)}</p>`, hint: 'Chọn từ tiếng Nhật' };
  if (dir === 'au') return { ...base, sk: 'listen', tag: SK.listen, prompt: '<p class="prompt-hint">Nghe từ (bấm loa để nghe lại) rồi chọn nghĩa</p>', say: v.kana, autoSay: true };
  return { ...base, sk: 'vocab', tag: SK.vocab, prompt: `<p class="prompt-jp" lang="ja">${wordHTML(v, 'furi')}</p>`, hint: 'Chọn nghĩa' };
}
function grammarQ(g) {
  const tries = [];
  for (const ex of shuffle([...(g.ex || [])])) { tries.push(() => [GQ.blank(g, ex), ex.ctx]); tries.push(() => [GQ.star(g, ex), ex.ctx]); }
  for (const s of g.situ || []) tries.push(() => [GQ.situ(g, s), 'hoithoai']);
  for (const f of shuffle(tries)) {
    const [q, c] = f();
    if (q && q.kind === 'choice') return { ...q, sk: 'grammar', tag: SK.grammar, topic: TG[c] || 'JLPT chung' };
  }
  return null;
}
function kanjiQ(k) {
  const q = kanjiQuestion(k, 'kh');
  return q ? { ...q, sk: 'kanji', tag: SK.kanji, topic: '' } : null;
}
// Đọc hiểu / nghe câu: câu ví dụ → chọn nghĩa. Đáp án nhiễu: câu khác của cùng mẫu / cùng từ (cùng ý chính, khác nội dung) → phải hiểu cả câu.
function sentQ(src, ex, sibs, pool, L, listen) {
  const seen = new Set([ex.vi]), ds = [];
  for (const x of [...shuffle(sibs), ...pool]) { if (!x.vi || seen.has(x.vi)) continue; seen.add(x.vi); ds.push(x.vi); if (ds.length >= 3) break; }
  if (ds.length < 3) return null;
  const jp = stripHL(ex.jp);
  const review = src.pattern ? { id: src.id, dir: 'gp' } : { id: src.id, dir: 'jv' };
  const base = { kind: 'choice', level: L, opts: shuffle([ex.vi, ...ds]).map((v, i) => opt(v === ex.vi ? 'ok' : 'x' + i, esc(v), false)), answer: 'ok', review,
    topic: TG[ex.ctx] || (src.pattern ? 'JLPT chung' : vTopic(src)), after: `<p class="after-sent" lang="ja">${rubyHTML(jp, true)}</p>` };
  if (listen) return { ...base, sk: 'listen', tag: SK.listen, prompt: '<p class="prompt-hint">Nghe câu (bấm loa để nghe lại) rồi chọn nghĩa đúng</p>', say: reading(jp), autoSay: true };
  return { ...base, sk: 'read', tag: SK.read, prompt: `<p class="prompt-sent" lang="ja">${rubyHTML(jp, true)}</p>`, hint: 'Câu này nghĩa là gì?' };
}
function sentSources(L, pool) {
  const out = [];
  for (const g of pool ? pool.grammar : D.grammar.filter(g => g.level === L)) for (const ex of g.ex || []) if (ex.jp && ex.vi && !/B：/.test(ex.jp)) out.push({ src: g, ex, sibs: g.ex.filter(x => x !== ex) });
  for (const v of pool ? pool.vocab : vocabOf(L)) for (const ex of v.ex || []) if (ex.jp && ex.vi) out.push({ src: v, ex, sibs: v.ex.filter(x => x !== ex) });
  return out;
}

// ---------- dựng đề một cấp ----------
// spec: số câu mỗi loại. Thiếu loại nào thì bù bằng từ vựng.
const PLACE = { jv: 3, vj: 2, kr: 1, kh: 1, g: 5 };
const FULL = { kr: 8, jv: 6, vj: 4, kh: 4, g: 18, read: 10, listen: 5 };
export const buildLevelQs = (L, spec) => buildPoolQs(null, spec, L);
// v40: soạn đề dần từng phần (mỗi lượt vài ms rồi nhường máy) — đề 55 câu soạn liền một mạch mất hơn 1 giây trên điện thoại → đứng hình
export const buildLevelQsAsync = (L, spec) => buildPoolQsAsync(null, spec, L);
export function buildPoolQs(pool, spec, L) {
  const g = poolQsGen(pool, spec, L);
  let r;
  while (!(r = g.next()).done);
  return r.value;
}
export async function buildPoolQsAsync(pool, spec, L, budget = 8) {
  const g = poolQsGen(pool, spec, L), gen = curGen();
  let r, t = performance.now();
  while (!(r = g.next()).done) if (performance.now() - t > budget) {
    await nextFrame(); t = performance.now();
    if (gen !== curGen()) return null; // đã sang trang khác: thôi soạn
  }
  return r.value;
}
// pool = {vocab, grammar, kanji}: đề từ một nhóm mục cho sẵn (bài kiểm tra cuối bài, ôn bài cũ); không có thì lấy cả cấp L
function* poolQsGen(pool, spec, L) {
  const out = [], used = new Set();
  const add = q => { if (q && !used.has(q.review.id + q.sk)) { used.add(q.review.id + q.sk); out.push(q); return true; } return false; };
  // từ vựng chung trước, từ chuyên ngành chỉ dùng khi thiếu
  const vs = (pool ? pool.vocab : vocabOf(L)).filter(v => v.reg !== 'kansai');
  const vocab = [...spread(vs.filter(v => !isSpec(v))), ...spread(vs.filter(isSpec))];
  const take = function* (n, mk, cands) { let k = 0; for (const c of cands) { if (k >= n) break; if (add(mk(c))) k++; yield; } return n - k; };
  let short = 0;
  // thẻ chữ Hán: thiếu thì bù bằng câu từ vựng
  short += yield* take(spec.kh || 0, kanjiQ, spread(pool ? pool.kanji : D.kanji.filter(k => k.level === L)));
  // v41: Xếp lớp, Thi vượt cấp (không có pool) luôn như đề thật; bài kiểm tra trong bài học theo công tắc "câu chữ Hán để trần"
  short += yield* take(spec.kr || 0, v => vocabQ(v, 'kr', v.level || L, !!pool), vocab.filter(v => v.kanji && (!pool || bareOK(v))));
  short += yield* take(spec.g || 0, grammarQ, spread(pool ? pool.grammar : D.grammar.filter(g => g.level === L)));
  if (spec.read || spec.listen) {
    const src = sentSources(L, pool);
    const exPool = shuffle(src.map(s => s.ex));
    const usedEx = new Set();
    const mkS = listen => s => { if (usedEx.has(s.ex)) return null; usedEx.add(s.ex); return sentQ(s.src, s.ex, s.sibs, exPool, s.src.level || L, listen); };
    short += yield* take(spec.read || 0, mkS(false), spread(src, s => s.src.id));
    if (ttsReady()) {
      const nl = spec.listen || 0, half = Math.ceil(nl / 2);
      short += yield* take(half, mkS(true), spread(src, s => s.src.id));
      short += yield* take(nl - half, v => vocabQ(v, 'au', L), vocab);
    } else short += spec.listen || 0;
  }
  short += yield* take(spec.jv || 0, v => vocabQ(v, 'jv', v.level || L), vocab);
  short += yield* take(spec.vj || 0, v => vocabQ(v, 'vj', v.level || L), vocab);
  if (short > 0) yield* take(short, v => vocabQ(v, Math.random() < .5 ? 'jv' : 'vj', v.level || L), vocab);
  // xếp theo phần như đề thật: từ vựng – chữ Hán → ngữ pháp → đọc hiểu → nghe
  const order = ['kread', 'vocab', 'kanji', 'grammar', 'read', 'listen'];
  return order.flatMap(s => shuffle(out.filter(q => q.sk === s)));
}
// Cấp đủ dữ liệu để ra đề: có ít nhất 3 mẫu ngữ pháp và 20 từ vựng chung
export const levelsWithData = () => LEVELS.filter(L => D.grammar.filter(g => g.level === L).length >= 3 && vocabOf(L).filter(v => !isSpec(v)).length >= 20);

// ---------- trang Kiểm tra trình độ ----------
export async function renderLevelHub(view, ctx) {
  const { hi, lo } = thresholds();
  const lv = levelsWithData();
  const saved = await kvGet('lvSetup', {});
  const L0 = lv.includes(saved.level) ? saved.level : (suggestLevel() || lv[0]);
  const undo = await undoInfo();
  const hist = testList();
  const packs = packsForCheck();
  view.innerHTML = `<h1 class="h1">Kiểm tra trình độ</h1>
    ${undo ? `<div class="note">Lần áp dụng kết quả ${esc(KIND[undo.kind] || '')} lúc ${fmtDate(undo.t)} đã đổi ${undo.n} mục. <button type="button" class="btn btn-ghost btn-sm" data-act="undo">Hoàn tác</button> <span class="small muted">(còn ${Math.max(1, Math.ceil((undo.t + 7 * DAY - Date.now()) / DAY))} ngày)</span></div>` : ''}
    ${lv.length ? '' : emptyState('Kho chưa đủ dữ liệu để ra đề. Nhập gói từ, ngữ pháp ở trang Dữ liệu.')}
    <section class="card lv-card">
      <h2 class="h2">Xếp lớp nhanh</h2>
      <p class="small muted">Bắt đầu từ ${esc(lv[0] || 'N5')}, mỗi cấp 12 câu (từ vựng, đọc chữ Hán, ngữ pháp). Đạt từ ${lo}% thì lên cấp kế; dưới ${lo}% thì dừng. Khoảng 10–15 phút, không tính giờ. Chữ Hán ở câu đọc để trần như đề thật.</p>
      <button class="btn btn-primary btn-block" data-act="place" ${lv.length ? '' : 'disabled'}>Bắt đầu xếp lớp</button>
    </section>
    <section class="card lv-card">
      <h2 class="h2">Thi vượt cấp</h2>
      <p class="small muted">Một cấp, khoảng 55 câu chia phần như JLPT: từ vựng – chữ Hán, ngữ pháp, đọc hiểu câu ngắn${ttsReady() ? ', nghe' : ' (máy chưa có giọng đọc nên bỏ phần nghe)'}. Đạt từ ${lo}% là qua chặng trong Lộ trình.</p>
      <fieldset><legend>Cấp</legend>${chips('level', lv.map(l => [l, l]), L0, false)}</fieldset>
      <fieldset><legend>Đồng hồ</legend>${chips('timer', [['on', 'Tính giờ (40 giây/câu)'], ['off', 'Không tính giờ']], saved.timer || 'on', false)}</fieldset>
      <p class="setup-count" aria-live="polite"></p>
      <button class="btn btn-primary btn-block" data-act="full" ${lv.length ? '' : 'disabled'}>Bắt đầu thi vượt cấp</button>
    </section>
    <section class="card lv-card">
      <h2 class="h2">Đề thi thử JLPT</h2>
      <p class="small muted">Đề chia đúng các phần thi như JLPT (đọc chữ Hán, cách viết, chọn từ, từ gần nghĩa, ngữ pháp, câu ★, đọc hiểu, nghe hội thoại), câu hỏi kiểu đề thật. Chấm theo phần thi, ước lượng đỗ / trượt theo điểm đỗ của JLPT. Không đổi tiến độ học.</p>
      <a class="btn btn-ghost btn-block" href="#/thithu">Mở đề thi thử JLPT</a>
    </section>
    ${packs.length ? `<section class="card"><h2 class="h2">Kiểm tra theo gói</h2>
      <p class="small muted">Gói đã học từ 80% trở lên: làm 10 câu của riêng gói đó. Kết quả tính vào lịch ôn như bài luyện thường.</p>
      ${packList(packs.slice(0, 5))}${packs.length > 5 ? `<details><summary class="small">Xem thêm ${packs.length - 5} gói</summary>${packList(packs.slice(5))}</details>` : ''}</section>` : ''}
    ${hist.length ? `<section class="card"><h2 class="h2">Lịch sử kiểm tra</h2>${sparkHTML(hist)}
      <ul class="lv-hist">${hist.slice(0, 15).map(histRow).join('')}</ul></section>` : ''}
    <details class="card lv-set"><summary class="h2">Cách xử lý kết quả</summary>
      <table class="lv-rule"><thead><tr><th>Điểm của cấp</th><th>Câu làm đúng</th><th>Câu làm sai</th><th>Mục không có trong đề</th></tr></thead><tbody>
        <tr><th>từ ${hi}%</th><td>Đã thuộc</td><td>Đang học (ôn ngày mai)</td><td>Đã thuộc (ôn kiểm lại sau 16 ngày)</td></tr>
        <tr><th>${lo}–${hi - 1}%</th><td>Đã thuộc</td><td>Đang học</td><td>Đã gặp — cần kiểm (ôn sau 4 ngày; đúng 2 lần liền là đã thuộc)</td></tr>
        <tr><th>dưới ${lo}%</th><td>Đang học</td><td>Từ chưa học: xếp đầu hàng Học từ mới</td><td>Giữ nguyên</td></tr></tbody></table>
      <p class="small muted">Mục đã thuộc mà làm sai chỉ chuyển sang đang học, không bao giờ về chưa học. App hiện bảng tóm tắt và chỉ đổi khi bấm Áp dụng.</p>
      <fieldset><legend>Ngưỡng "đã thuộc cả cấp"</legend>${chips('hi', [80, 85, 90].map(n => [String(n), n + '%']), String(hi), false)}</fieldset>
      <fieldset><legend>Ngưỡng đạt</legend>${chips('lo', [60, 70, 75].map(n => [String(n), n + '%']), String(lo), false)}</fieldset>
      <label class="check"><input type="checkbox" data-act="remind" ${D.prefs.lvRemind === false ? '' : 'checked'}> Nhắc kiểm tra lại mỗi 2 tuần (trên Trang chủ)</label>
    </details>`;
  const f = view;
  const upd = async name => {
    if (name === 'hi' || name === 'lo') {
      await setPrefs({ lvHi: +readChip(f, 'hi'), lvLo: +readChip(f, 'lo') });
      ctx.sessionDone?.();
      return renderLevelHub(view, ctx);
    }
    const L = readChip(f, 'level');
    const c = f.querySelector('.setup-count');
    // v40: soạn sẵn đề của cấp đang chọn ở nền (từng phần, không đứng hình); số câu hiện khi soạn xong, bấm Bắt đầu dùng luôn đề này
    if (L && pre?.L !== L) pre = { L, p: buildLevelQsAsync(L, FULL) };
    if (!c) return;
    if (!L) { c.textContent = ''; return; }
    const my = pre, gen = curGen();
    c.innerHTML = loadingHTML('Đang soạn đề…');
    const qs = await my.p;
    if (!qs || gen !== curGen() || my !== pre || !c.isConnected) return;
    const n = qs.length;
    c.textContent = n ? `Đề ${L} có ${n} câu${readChip(f, 'timer') === 'on' ? `, ${Math.ceil(n * 40 / 60)} phút` : ''}.${n < 40 ? ' Kho cấp này còn ít dữ liệu nên đề ngắn hơn.' : ''}` : '';
  };
  let pre = null;
  bindChips(f, upd); upd();
  f.querySelector('[data-act=remind]').onchange = async e => { await setPrefs({ lvRemind: e.target.checked }); ctx.sessionDone?.(); };
  f.querySelector('[data-act=place]').onclick = () => { ctx.backTo = '#/trinhdo'; runPlacement(view, ctx); };
  f.querySelector('[data-act=full]').onclick = async e => {
    const L = readChip(f, 'level'), timer = readChip(f, 'timer');
    const b = e.currentTarget;
    if (b.disabled) return;
    b.disabled = true; b.innerHTML = '<span class="tn-spin" aria-hidden="true"></span> Đang soạn đề…';
    await kvSet('lvSetup', { level: L, timer });
    const qs = await (pre?.L === L ? pre.p : buildLevelQsAsync(L, FULL));
    pre = null;
    if (!qs || !b.isConnected) return;
    ctx.backTo = '#/trinhdo';
    runFull(view, ctx, L, timer === 'on', qs);
  };
  f.querySelectorAll('[data-pack]').forEach(b => b.onclick = () => { ctx.backTo = '#/trinhdo'; runPackCheck(view, ctx, b.dataset.pack); });
  const u = f.querySelector('[data-act=undo]');
  if (u) u.onclick = async () => { const n = await doUndo(); toast(`Đã hoàn tác — trả ${n} mục về như trước.`); ctx.sessionDone?.(); renderLevelHub(view, ctx); };
}
// cấp gợi ý: cấp cao nhất đã có tiến độ mà chưa qua
function suggestLevel() {
  const passed = passedLevels();
  return LEVELS.find(L => !passed.has(L) && D.vocab.some(v => v.level === L));
}
// Cấp đã qua: Thi vượt cấp đạt ngưỡng, hoặc Xếp lớp đạt ngưỡng "đã thuộc" ở cấp đó
export function passedLevels() {
  const { hi, lo } = thresholds(), s = new Set();
  for (const t of testList()) {
    if (t.kind === 'vuotcap' && t.pct >= lo) s.add(t.level);
    if (t.kind === 'xeplop') for (const [L, [a, b]] of Object.entries(t.levels || {})) if (b && (a / b) * 100 >= hi) s.add(L);
  }
  return s;
}
function histRow(t) {
  const when = fmtDate(t.at || t.t);
  let what = '';
  if (t.kind === 'xeplop') what = `ước lượng <b>${esc(t.est || 'chưa qua ' + (Object.keys(t.levels || {})[0] || 'N5'))}</b> · ${Object.entries(t.levels || {}).map(([L, [a, b]]) => `${L} ${Math.round((a / b) * 100)}%`).join(' · ')}`;
  else if (t.kind === 'vuotcap') what = `${esc(t.level)} <b>${t.pct}%</b> — ${t.pct >= thresholds().lo ? 'đạt' : 'chưa đạt'}`;
  else if (t.kind === 'thithu') what = `${esc(t.level)} <b>${t.pts}/180</b> — ${t.pass == null ? 'chưa thi phần nghe' : t.pass ? 'ước lượng đỗ' : 'ước lượng chưa đỗ'}`;
  else what = `${rich(t.title || t.pack || '')} <b>${t.pct}%</b>`;
  const st = t.undone ? ' · đã hoàn tác' : t.applied ? ' · đã áp dụng' : '';
  return `<li><span class="muted small">${when} · ${esc(KIND[t.kind] || '')}${st}</span><span>${what}</span></li>`;
}
// Đường tiến bộ: điểm các lần Xếp lớp / Thi vượt cấp gần đây
function sparkHTML(hist) {
  const pts = hist.filter(t => t.kind !== 'goi').slice(0, 12).reverse();
  if (pts.length < 2) return '';
  const W = 300, H = 70, x = i => 8 + (i * (W - 16)) / (pts.length - 1), y = p => H - 8 - ((H - 16) * p) / 100;
  const val = t => (t.kind === 'xeplop' ? LEVELS.indexOf(t.est) >= 0 ? ((LEVELS.indexOf(t.est) + 1) / LEVELS.length) * 100 : 5 : t.pct);
  const lo = thresholds().lo;
  return `<svg class="lv-spark" viewBox="0 0 ${W} ${H}" role="img" aria-label="Điểm các lần kiểm tra gần đây">
    <line x1="0" x2="${W}" y1="${y(lo)}" y2="${y(lo)}" class="lv-spark-lo"/>
    <polyline points="${pts.map((t, i) => `${x(i)},${y(val(t))}`).join(' ')}"/>
    ${pts.map((t, i) => `<circle cx="${x(i)}" cy="${y(val(t))}" r="3.5"><title>${esc(fmtDate(t.at || t.t))}: ${t.kind === 'xeplop' ? 'ước lượng ' + (t.est || '—') : t.level + ' ' + t.pct + '%'}</title></circle>`).join('')}
  </svg><p class="small muted">Đường ngang: ngưỡng đạt ${lo}%. Điểm Xếp lớp vẽ theo cấp ước lượng.</p>`;
}
const packList = ps => `<ul class="packs">${ps.map(p => `<li class="pack"><span class="pack-t"><b>${rich(p.title)}</b><small class="muted">${esc(p.level || '')} · đã học ${p.learned}/${p.total}${p.last ? ` · kiểm tra gần nhất ${p.last}%` : ''}</small></span><button type="button" class="btn btn-ghost btn-sm" data-pack="${esc(p.id)}">10 câu</button></li>`).join('')}</ul>`;
// Gói học xong từ 80%: gói chưa kiểm tra lần nào đứng trước
function packsForCheck() {
  const out = [];
  for (const p of D.packs) {
    if (!['vocab', 'grammar', 'kanji'].includes(p.type) || (D.disabled.list || []).includes(p.id)) continue;
    const items = p.items.map(x => D.items.get(x.id)).filter(Boolean);
    if (items.length < 5) continue;
    const learned = items.filter(it => status(it) !== 'new').length;
    const last = testList().find(t => t.kind === 'goi' && t.pack === p.id);
    if (learned / items.length >= 0.8) out.push({ id: p.id, title: p.title, level: p.level, total: items.length, learned, last: last ? last.pct : null, lt: last ? last.at : 0 });
  }
  return out.sort((a, b) => a.lt - b.lt || LEVELS.indexOf(a.level) - LEVELS.indexOf(b.level) || a.id.localeCompare(b.id));
}

// ---------- chạy đề ----------
function runPlacement(view, ctx) {
  const lv = levelsWithData();
  const st = { results: [], i: 0, secs: 0 };
  const done = () => showResult(view, ctx, { kind: 'xeplop', results: st.results, secs: st.secs });
  let nextQs = null;
  const next = async () => {
    const L = lv[st.i];
    // v40: soạn đề từng phần, trong lúc soạn hiện vòng ⟳
    view.innerHTML = `<div class="page-wait">${loadingHTML(`Đang soạn đề ${L}…`)}</div>`;
    const gen = curGen();
    const qs = await (nextQs?.L === L ? nextQs.p : buildLevelQsAsync(L, PLACE));
    if (!qs || gen !== curGen()) return;
    runDrill(view, qs, ctx, {
      title: `Xếp lớp nhanh · ${L}`, mode: 'test', noReview: true,
      onDone: (res, info) => {
        if (info.empty) return st.results.length ? done() : goBack(ctx);
        st.results.push({ L, res }); st.secs += info.secs;
        const p = pctOf(res), { lo } = thresholds();
        if (info.quit || p < lo || st.i + 1 >= lv.length) return done();
        const N = lv[st.i + 1];
        view.innerHTML = `<section class="result lv-step">
          <p class="lv-step-l">${esc(L)}</p>
          <p class="result-score"><b>${res.filter(r => r.ok).length}</b><span>/${res.length}</span></p>
          <p class="result-sub">${p}% — đạt. Làm tiếp phần ${esc(N)} (<span data-n>…</span> câu)?</p>
          <div class="row-btns stack"><button class="btn btn-primary" data-act="go">Làm tiếp ${esc(N)}</button><button class="btn btn-ghost" data-act="stop">Dừng, xem kết quả</button></div></section>`;
        nextQs = { L: N, p: buildLevelQsAsync(N, PLACE) };
        nextQs.p.then(q => { const el = view.querySelector('[data-n]'); if (el && q) el.textContent = q.length; });
        view.querySelector('[data-act=go]').onclick = () => { st.i++; next(); };
        view.querySelector('[data-act=stop]').onclick = done;
        window.scrollTo(0, 0);
      },
    });
  };
  next();
}
function runFull(view, ctx, L, timer, pre) {
  const qs = pre || buildLevelQs(L, FULL);
  runDrill(view, qs, ctx, {
    title: `Thi vượt cấp ${L}`, mode: 'test', noReview: true, timeLimit: timer ? qs.length * 40 : 0,
    onDone: (res, info) => (info.empty ? goBack(ctx) : showResult(view, ctx, { kind: 'vuotcap', results: [{ L, res }], secs: info.secs })),
  });
}
function runPackCheck(view, ctx, packId) {
  const p = D.packs.find(x => x.id === packId);
  if (!p) return;
  const items = p.items.map(x => D.items.get(x.id)).filter(Boolean);
  let qs;
  if (p.type === 'vocab') qs = shuffle(items).map(v => vocabQ(v, bareOK(v) && Math.random() < .3 ? 'kr' : Math.random() < .5 ? 'jv' : 'vj', v.level)).filter(Boolean).slice(0, 10);
  else if (p.type === 'grammar') { qs = []; for (let k = 0; k < 4 && qs.length < 10; k++) for (const g of shuffle(items)) { const q = grammarQ(g); if (q && qs.length < 10) qs.push(q); } }
  else qs = shuffle(items).map(k => kanjiQuestion(k, Math.random() < .5 ? 'kh' : 'hk')).filter(Boolean).map(q => ({ ...q, sk: 'kanji', topic: '' })).slice(0, 10);
  if (!qs.length) { toast('Gói này chưa đủ dữ liệu để ra đề.'); return; }
  runDrill(view, qs, ctx, {
    title: plain(p.title), mode: 'test',
    onDone: (res, info) => (info.empty ? goBack(ctx) : showResult(view, ctx, { kind: 'goi', results: [{ L: p.level, res }], pack: p, secs: info.secs })),
  });
}

// ---------- kết quả ----------
// v41: nhận xét phần còn yếu (để không đánh giá nhầm: nghĩa từ tốt mà đọc chữ Hán yếu thì nói rõ, chỉ việc cần học)
function skillNotesHTML(t, lo, L) {
  const pc = k => (t[k] && t[k][1] >= 3 ? Math.round((t[k][0] / t[k][1]) * 100) : null);
  const weak = k => pc(k) != null && pc(k) < lo;
  const out = [];
  if (weak('kread')) out.push(`<b>Đọc chữ Hán</b> còn yếu (${pc('kread')}%)${pc('vocab') != null && pc('vocab') >= lo ? ` trong khi nghĩa từ tốt (${pc('vocab')}%)` : ''} → học thẻ chữ Hán cấp ${esc(L)} (Chữ Hán → Học chữ mới) và luyện Trắc nghiệm kiểu "Kanji → cách đọc".`);
  if (weak('vocab')) out.push(`<b>Từ vựng</b> còn yếu (${pc('vocab')}%) → học từ mới cấp ${esc(L)} theo Lộ trình, ôn từ đến hạn mỗi ngày.`);
  if (weak('kanji')) out.push(`<b>Thẻ chữ Hán</b> còn yếu (${pc('kanji')}%) → Ôn chữ Hán.`);
  if (weak('grammar')) out.push(`<b>Ngữ pháp</b> còn yếu (${pc('grammar')}%) → Bài tập ngữ pháp cấp ${esc(L)}.`);
  if (weak('read')) out.push(`<b>Đọc hiểu câu</b> còn yếu (${pc('read')}%) → Luyện dịch theo câu, Hội thoại & bài đọc.`);
  if (weak('listen')) out.push(`<b>Nghe</b> còn yếu (${pc('listen')}%) → luyện Nghe – hiểu trong bài học, bật tự đọc khi học từ.`);
  if (!out.length) return Object.keys(t).length ? `<p class="small lv-note">Các phần đều đạt từ ${lo}%.</p>` : '';
  return `<div class="note lv-note"><p class="small"><b>Nhận xét:</b></p><ul class="small">${out.map(x => `<li>${x}</li>`).join('')}</ul></div>`;
}
function barRows(map) {
  return Object.entries(map).filter(([k, [, b]]) => k && b).map(([k, [a, b]]) => `<tr><th scope="row">${esc(k)}</th><td><span class="mini"><i style="width:${(a / b) * 100}%"></i></span></td><td class="num">${a}/${b}</td></tr>`).join('');
}
function tally(res, key) {
  const m = {};
  for (const r of res) { const k = key(r.q); if (!k) continue; m[k] = m[k] || [0, 0]; m[k][1]++; if (r.ok) m[k][0]++; }
  return m;
}
async function showResult(view, ctx, { kind, results, pack, secs }) {
  ctx.inRun = true;
  const { lo } = thresholds();
  const all = results.flatMap(x => x.res);
  const levels = Object.fromEntries(results.map(({ L, res }) => [L, [res.filter(r => r.ok).length, res.length]]));
  let est = '';
  for (const { L, res } of results) { if (pctOf(res) >= lo) est = L; else break; }
  const pct = pctOf(all);
  const rec = { id: 't' + Date.now().toString(36), at: Date.now(), kind, pct, est, levels, secs,
    level: kind === 'xeplop' ? '' : results[0].L, pack: pack?.id || '', title: pack?.title || '',
    skills: Object.fromEntries(Object.entries(tally(all, q => q.sk)).map(([k, v]) => [k, v])) };
  await saveTest(rec);
  ctx.sessionDone?.();

  const head = kind === 'xeplop'
    ? `<p class="lv-est-l">Trình độ ước lượng</p><p class="lv-est">${esc(est || 'Chưa qua ' + results[0].L)}</p>
       <p class="result-sub">${results.map(({ L, res }) => `${L} ${pctOf(res)}%`).join(' · ')}</p>`
    : `<p class="result-score"><b>${all.filter(r => r.ok).length}</b><span>/${all.length}</span></p>
       <p class="result-sub">${pct}%${kind === 'vuotcap' ? ` — ${pct >= lo ? `<b class="lv-pass">đạt, qua chặng ${esc(results[0].L)}</b>` : `chưa đạt (cần ${lo}%)`}` : ''}${secs >= 60 ? ` · ${Math.round(secs / 60)} phút` : ''}</p>`;
  const wrong = all.filter(r => !r.ok);
  const wrongV = [...new Map(wrong.filter(r => r.q.review && !r.q.review.id.startsWith('g:') && !r.q.review.id.startsWith('k:')).map(r => [r.q.review.id, D.items.get(r.q.review.id)])).values()].filter(Boolean);
  const wrongG = [...new Set(wrong.filter(r => r.q.review?.id.startsWith('g:')).map(r => r.q.review.id))];
  const ansHTML = q => q.opts.find(o => o.key === q.answer)?.html || '';
  view.innerHTML = `<section class="result lv-res">${crumbHTML(ctx)}
    <h1 class="h1">${kind === 'goi' ? 'Kiểm tra gói · ' + rich(pack?.title || '') : esc(KIND[kind])}${kind === 'vuotcap' ? ' ' + esc(results[0].L) : ''}</h1>
    ${head}
    ${kind === 'xeplop' && results.length > 1 ? `<table class="topics"><tbody>${barRows(levels)}</tbody></table>` : ''}
    <h2 class="h2">Theo kỹ năng</h2><table class="topics bytag"><tbody>${barRows(Object.fromEntries(Object.entries(tally(all, q => q.sk)).map(([k, v]) => [SK[k] || k, v])))}</tbody></table>
    ${skillNotesHTML(tally(all, q => q.sk), lo, kind === 'xeplop' ? (results.find(x => pctOf(x.res) < lo)?.L || results[results.length - 1].L) : results[0].L)}
    ${Object.keys(tally(all, q => q.topic)).length > 1 ? `<h2 class="h2">Theo chủ đề</h2><table class="topics bytag"><tbody>${barRows(tally(all, q => q.topic))}</tbody></table>` : ''}
    ${kind === 'goi' ? '<p class="small muted">Kết quả đã tính vào lịch ôn.</p>' : '<div class="lv-plan card" aria-live="polite"><p class="muted small">Đang tính…</p></div>'}
    <div class="row-btns stack">
      ${wrongV.length ? `<button class="btn btn-ghost" data-act="learnw">Học ngay ${wrongV.length} từ làm sai</button>` : ''}
      ${wrongG.length ? `<button class="btn btn-ghost" data-act="gramw">Luyện ${wrongG.length} mẫu ngữ pháp làm sai</button>` : ''}
    </div>
    ${wrong.length ? `<details class="lv-wrong"><summary class="h2">Câu sai và bỏ trống (${wrong.length})</summary><ul class="wlist wlist-drill">${wrong.map(r => `<li><span class="muted small">${esc(r.q.tag || '')} · ${esc(r.q.level || '')}</span><div class="wq">${r.q.prompt}</div>${r.skip ? '<p class="muted small">Bỏ trống</p>' : `<p class="small">Đã chọn: <span lang="ja">${r.q.opts.find(o => o.key === r.chosen)?.html || ''}</span></p>`}<p>Đáp án: <b lang="ja">${ansHTML(r.q)}</b></p>${r.q.after || ''}</li>`).join('')}</ul></details>` : '<p class="result-good">Không sai câu nào.</p>'}
    ${resultNavHTML(ctx, { kind: 'test' })}</section>`;
  bindSay(view);
  view.querySelectorAll('.result [data-nokj]').forEach(x => x.removeAttribute('data-nokj'));
  bindResultNav(view, ctx, { kind: 'test' });
  const lw = view.querySelector('[data-act=learnw]');
  if (lw) lw.onclick = () => runLearn(view, wrongV, ctx);
  const gw = view.querySelector('[data-act=gramw]');
  if (gw) gw.onclick = () => runDrill(view, buildGrammarQs({ type: 'mix', ids: wrongG, count: 20 }), ctx, { title: 'Luyện mẫu làm sai' });
  window.scrollTo(0, 0);
  if (kind !== 'goi') renderPlan(view.querySelector('.lv-plan'), ctx, results, rec);
}

// ---------- đổi tiến độ theo kết quả ----------
// Gộp kết quả theo mục: sai ở bất kỳ câu nào = sai. Câu bỏ trống không tính (coi như mục không có trong đề).
function itemResults(res) {
  const m = new Map();
  for (const r of res) {
    if (r.skip || !r.q.review) continue;
    const it = D.items.get(r.q.review.id); if (!it) continue;
    const x = m.get(it.id) || { it, ok: true, dir: r.q.review.dir };
    if (!r.ok) { x.ok = false; x.dir = r.q.review.dir; }
    m.set(it.id, x);
  }
  return m;
}
const GROUPS = [['gen', 'Từ vựng chung', true], ['spec', 'Từ chuyên ngành (xưởng, thủy sản, thủ tục, Kansai)', false], ['kanji', 'Thẻ chữ Hán', true], ['grammar', 'Mẫu ngữ pháp', true]];
const groupOf = it => (it._type === 'kanji' ? 'kanji' : it._type === 'grammar' ? 'grammar' : isSpec(it) ? 'spec' : 'gen');
export function planChanges(results, groups) {
  const plan = []; // {it, op, dir?, cat: k|c|l|p}
  for (const { L, res } of results) {
    const band = bandOf(pctOf(res));
    const tested = itemResults(res);
    const hadKanji = res.some(r => r.q.sk === 'kanji');
    for (const { it, ok, dir } of tested.values()) {
      const st = status(it);
      if (ok) {
        if (band !== 'lo') plan.push({ it, op: 'known', dir, cat: st === 'known' ? '' : 'k' });
        else plan.push({ it, op: st === 'new' ? 'learn' : 'right', dir, cat: st === 'new' ? 'l' : '' });
      } else if (band === 'lo' && st === 'new') plan.push({ it, op: 'pri', cat: it._type === 'vocab' ? 'p' : '' });
      else plan.push({ it, op: 'wrong', dir, cat: 'l' });
    }
    if (band === 'lo') continue;
    const pool = [...D.vocab.filter(v => v.level === L), ...(hadKanji ? D.kanji.filter(k => k.level === L) : []), ...D.grammar.filter(g => g.level === L)];
    for (const it of pool) {
      if (tested.has(it.id) || !groups.has(groupOf(it)) || status(it) === 'known') continue;
      plan.push({ it, op: band === 'hi' ? 'known' : 'check', cat: band === 'hi' ? 'k' : 'c' });
    }
  }
  return plan;
}
const CAT = { k: 'Đã thuộc', c: 'Đã gặp — cần kiểm (ôn sau 4 ngày)', l: 'Đang học (ôn ngày mai)', p: 'Xếp đầu hàng Học từ mới' };
const TY = { vocab: 'từ', kanji: 'chữ Hán', grammar: 'mẫu ngữ pháp' };
async function renderPlan(box, ctx, results, rec) {
  const sel = new Set(GROUPS.filter(g => g[2]).map(g => g[0]));
  const draw = async () => {
    const plan = planChanges(results, sel);
    // bỏ các mục không đổi gì (vd. đã ở hộp 3 mà xếp "cần kiểm")
    const real = new Set(await bulkApply(plan.filter(c => ['known', 'check', 'learn'].includes(c.op)).map(c => ({ it: c.it, op: c.op })), { dry: true }));
    const shown = plan.filter(c => c.cat && (c.cat === 'l' || c.cat === 'p' || real.has(c.it.id)));
    const cnt = {};
    for (const c of shown) { cnt[c.cat] = cnt[c.cat] || {}; const t = c.it._type || 'vocab'; cnt[c.cat][t] = (cnt[c.cat][t] || 0) + 1; }
    const lines = Object.keys(CAT).filter(k => cnt[k]).map(k => `<li><b>${CAT[k]}:</b> ${Object.entries(cnt[k]).map(([t, n]) => `${n} ${TY[t] || t}`).join(' · ')}</li>`).join('');
    const bands = results.map(({ L, res }) => `${L} ${pctOf(res)}% → ${{ hi: 'đã thuộc cả cấp', mid: 'đã gặp, cần kiểm', lo: 'giữ nguyên phần chưa có trong đề' }[bandOf(pctOf(res))]}`).join('<br>');
    box.innerHTML = `<h2 class="h2">Đổi tiến độ theo kết quả</h2>
      <p class="small">${bands}</p>
      ${lines ? `<ul class="lv-sum">${lines}</ul>` : '<p class="muted">Kết quả này không đổi tiến độ mục nào.</p>'}
      ${results.some(({ res }) => bandOf(pctOf(res)) !== 'lo') ? `<fieldset><legend>Đánh dấu cả mục <b>không có trong đề</b> thuộc nhóm</legend>${GROUPS.map(([k, l]) => `<label class="check"><input type="checkbox" data-g="${k}" ${sel.has(k) ? 'checked' : ''}> ${esc(l)}</label>`).join('')}</fieldset>` : ''}
      ${lines ? `<p class="small muted">Lưu bản tiến độ trước khi đổi — hoàn tác được trong 7 ngày (trang Kiểm tra trình độ).</p>
      <div class="row-btns"><button type="button" class="btn btn-ghost" data-act="skip">Bỏ qua</button><button type="button" class="btn btn-primary" data-act="apply">Áp dụng</button></div>` : ''}`;
    box.querySelectorAll('[data-g]').forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.g) : sel.delete(c.dataset.g); draw(); });
    const sk = box.querySelector('[data-act=skip]');
    if (sk) sk.onclick = () => { box.innerHTML = '<p class="muted small">Không đổi tiến độ. Kết quả vẫn lưu trong Lịch sử kiểm tra.</p>'; };
    const ap = box.querySelector('[data-act=apply]');
    if (ap) ap.onclick = async () => {
      ap.disabled = true;
      const n = await applyPlan(plan, rec);
      box.innerHTML = `<p class="saved-ok">Đã đổi tiến độ ${n} mục.</p><button type="button" class="btn btn-ghost btn-sm" data-act="undo">Hoàn tác</button>`;
      box.querySelector('[data-act=undo]').onclick = async () => { const k = await doUndo(); box.innerHTML = `<p class="muted">Đã hoàn tác — trả ${k} mục về như trước.</p>`; ctx.sessionDone?.(); };
      ctx.sessionDone?.();
    };
  };
  draw();
}
async function applyPlan(plan, rec) {
  const ch = plan.filter(c => c.op !== 'pri');
  const pri = plan.filter(c => c.op === 'pri' && c.it._type === 'vocab').map(c => c.it.id);
  const before = progSnapshot(ch.map(c => c.it.id));
  const oldPri = D.prefs.priNew || [];
  const done = new Set(await bulkApply(ch));
  if (pri.length) await setPrefs({ priNew: [...new Set([...pri, ...oldPri])].filter(id => D.items.has(id) && status(D.items.get(id)) === 'new').slice(0, 400) });
  const n = done.size + pri.length;
  await kvSet('lvUndo', { t: Date.now(), testId: rec.id, kind: rec.kind, n, before: before.filter(([id]) => done.has(id)), pri: pri.length ? oldPri : null });
  await saveTest({ ...D.tests[rec.id], applied: Date.now() });
  return n;
}
async function undoInfo() {
  const u = await kvGet('lvUndo', null);
  if (!u) return null;
  if (Date.now() - u.t > 7 * DAY) { await del('kv', 'lvUndo'); return null; }
  return u;
}
async function doUndo() {
  const u = await undoInfo();
  if (!u) return 0;
  const n = await progRestore(u.before);
  if (u.pri) await setPrefs({ priNew: u.pri });
  await del('kv', 'lvUndo');
  if (D.tests[u.testId]) await saveTest({ ...D.tests[u.testId], undone: Date.now() });
  return n;
}
// Nhắc kiểm tra lại mỗi 2 tuần (Trang chủ)
export function remindHTML() {
  if (D.prefs.lvRemind === false) return '';
  const last = testList().find(t => t.kind !== 'goi');
  if (!last || Date.now() - (last.at || last.t) < 14 * DAY) return '';
  const L = suggestLevel();
  return `<p class="note small">Đã ${Math.floor((Date.now() - (last.at || last.t)) / DAY)} ngày chưa kiểm tra lại trình độ. <a href="#/trinhdo">Kiểm tra${L ? ' ' + esc(L) : ''}</a></p>`;
}
