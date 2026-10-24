import { all, put, del, kvGet, kvSet } from './db.js';

export const TOPICS = { doisong: 'Đời sống', xuong: 'Công xưởng', thuysan: 'Thủy sản', thuevisa: 'Thuế & visa', kansai: 'Kansai-ben', jlpt: 'JLPT chung' };
export const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];
export const POS = { n: 'danh từ', 'n-suru': 'danh từ + する', v1: 'động từ nhóm 2', v5: 'động từ nhóm 1', v3: 'động từ nhóm 3', 'adj-i': 'tính từ い', 'adj-na': 'tính từ な', adv: 'phó từ', expr: 'cụm từ', ctr: 'trợ số từ', ono: 'từ tượng thanh, tượng hình', other: 'khác' };
export const REG = { trangtrong: 'văn bản, giấy tờ', lichsu: 'lịch sự', thuong: 'trung tính', khaungu: 'khẩu ngữ', kansai: 'Kansai-ben' };
export const CTX = { doisong: 'Đời sống', xuong: 'Xưởng', thutuc: 'Thủ tục', hoithoai: 'Hội thoại', kansai: 'Kansai' };
const TYPES = ['vocab', 'grammar', 'phrase', 'kanji', 'lesson', 'dialog', 'text'];
export const TYPE_NAME = { vocab: 'Từ vựng', grammar: 'Ngữ pháp', phrase: 'Câu thực chiến', kanji: 'Chữ Hán', lesson: 'Bài học', dialog: 'Hội thoại', text: 'Bài đọc' };
// Nhóm chữ Hán theo nơi hay gặp (K11)
export const KGROUPS = { coban: 'Chữ nền tảng', nhan: 'Nhãn sản phẩm', giayto: 'Giấy tờ & thuế', xuong: 'Công xưởng', antoan: 'Biển an toàn', thuysan: 'Thủy sản' };

// D = toàn bộ dữ liệu đang dùng
export const D = {
  manifest: { packs: [] },
  packs: [],          // gói đang dùng: {id, title, type, level, topics, count, version, src:'builtin'|'imported', items}
  builtin: [],        // mọi gói trên kho (theo manifest)
  imported: [],       // mọi gói nhập tay
  locked: [],         // v57: gói của lộ trình N3–N1 đã mở cho tài khoản (tải từ máy chủ, giữ trong máy)
  shadow: [],         // gói bị bỏ qua vì trùng tên với gói khác mới hơn
  prefs: { forms: ['masu', 'masen', 'mashita', 'te', 'ta', 'nai', 'nakatta', 'tai', 'teiru'], t: 0 }, // cài đặt học có đồng bộ: các thể động từ đã học
  user: new Map(),    // id -> mục tự thêm/sửa (có _t, có thể _del)
  disabled: { list: [], t: 0 },
  reports: {},        // id -> {note, t, _del?}
  tests: {},          // id -> lần kiểm tra trình độ {id, t, kind, level, est, pct, levels, skills, applied, undone}
  kana: {},           // chữ kana -> {b (0–5), ok, ng, t} — Chặng 0
  fstat: {},          // thể -> {v5:[đúng, lần], v1, v3, i, na, n, t} — điểm theo thể (B4)
  lessons: {},        // mã bài -> {steps:{n:t}, test:{pct,t}, done, rev:[t…], writes:[…], t} — tiến độ bài học (Đ9)
  nbooks: {},         // mã sổ -> {name, t, _del?} — Sổ tay (Đ10)
  nmarks: {},         // mã mục -> {b:{mã sổ:1}, t} — mục nằm trong sổ nào
  items: new Map(),
  vocab: [], grammar: [], phrase: [], kanji: [], lesson: [], dialog: [], text: [],
  kanjiByChar: new Map(),
  errors: [],
};
export const typeOfId = id => id.startsWith('g:') ? 'grammar' : id.startsWith('p:') ? 'phrase' : id.startsWith('k:') ? 'kanji' : id.startsWith('l:') ? 'lesson' : id.startsWith('d:') ? 'dialog' : id.startsWith('t:') ? 'text' : 'vocab';

export async function loadAll(onStep) {
  D.errors = [];
  D.disabled = await kvGet('disabled', { list: [], t: 0 });
  D.prefs = { ...D.prefs, ...(await kvGet('prefs', {})) };
  D.reports = await kvGet('reports', {});
  D.tests = await kvGet('tests', {});
  D.kana = await kvGet('kana', {});
  D.fstat = await kvGet('fstat', {});
  D.lessons = await kvGet('lessons', {});
  D.nbooks = await kvGet('nbooks', {});
  D.nmarks = await kvGet('nmarks', {});
  // v64: mở ngay bằng danh mục đã lưu trong máy (không chờ mạng); bản mới kiểm tra ở nền (checkDataUpdate).
  // Chỉ lần đầu (máy chưa có danh mục) mới tải danh mục qua mạng.
  const T = { first: false }, now = () => performance.now();
  let t0 = now();
  D.manifest = await kvGet('manifestCache', null);
  if (!D.manifest?.packs?.length) {
    T.first = true;
    try { D.manifest = await fetchManifest(); if (D.manifest.packs?.length) await kvSet('manifestCache', D.manifest); }
    catch { D.manifest = null; }
    if (!D.manifest?.packs?.length) { D.manifest = { packs: [] }; D.errors.push('Không tải được danh mục gói. Mở app khi có mạng một lần để tải dữ liệu.'); }
  }
  T.man = now() - t0; t0 = now();
  const builtin = await loadBuiltin(D.manifest, onStep, T);
  T.data = now() - t0;
  D.builtin = builtin.filter(Boolean);
  D.imported = (await all('imported')).filter(x => !x._del).map(x => packEntry(x.pack, x.items, 'imported', x._t));
  t0 = now(); onStep?.({ phase: 'lock' });
  await loadLocked();
  T.lock = now() - t0; t0 = now(); onStep?.({ phase: 'build' });
  assemblePacks();
  D.user = new Map((await all('user')).map(x => [x.id, x]));
  rebuild();
  T.build = now() - t0;
  return T;
}

// ---------- v64: nạp gói (theo tệp nhóm nếu danh mục có "bundles", không thì từng gói) ----------
const packUrl = m => `data/packs/${m.file}?v=${m.version || 1}${m.hash ? '.' + m.hash : ''}`;
const bundleUrl = b => `data/bundles/${b.file}`;
export const fetchManifest = async () => { const r = await fetch('data/manifest.json', { cache: 'no-cache' }); if (!r.ok) throw new Error(r.status); return r.json(); };
function packErr(m, e) {
  // Phân biệt: máy chủ trả 404 = trên GitHub chưa có tệp; mã lỗi khác = máy chủ lỗi; không có mã = mất mạng.
  const st = Number(e && e.message);
  D.errors.push(st === 404
    ? `Gói "${m.title}" chưa có trên GitHub: thiếu tệp data/packs/${m.file} — tải tệp này lên kho rồi mở lại app.`
    : st ? `Không tải được gói "${m.title}" (máy chủ báo lỗi ${st}) — thử mở lại app sau ít phút.`
    : e instanceof SyntaxError ? `Gói "${m.title}" bị hỏng (tệp data/packs/${m.file} không đọc được) — tải lại tệp này lên kho.`
    : `Không tải được gói "${m.title}" — máy đang mất mạng, cần mở app khi có mạng.`);
}
async function getJSON(u) { const r = await fetch(u); if (!r.ok) throw new Error(r.status); return r.json(); }
async function loadBuiltin(man, onStep, T) {
  const packs = man.packs || [], bundles = (man.bundles || []).filter(b => Array.isArray(b.packs));
  const items = new Map(), inB = new Set(bundles.flatMap(b => b.packs));
  const single = packs.filter(p => !inB.has(p.id));
  const total = bundles.length + single.length; let done = 0;
  const tick = () => onStep?.({ phase: 'data', done: ++done, total, bytes: T.first ? (bundles.reduce((a, b) => a + (b.gz || 0), 0) || null) : null });
  T.files = total; T.mode = bundles.length ? 'nhom' : 'goi';
  onStep?.({ phase: 'data', done: 0, total, bytes: T.first ? (bundles.reduce((a, b) => a + (b.gz || 0), 0) || null) : null });
  const failed = [];
  await Promise.all([
    ...bundles.map(b => getJSON(bundleUrl(b)).then(j => { for (const x of j.packs || []) items.set(x.id, x.items || []); }).catch(() => failed.push(...b.packs)).finally(tick)),
    ...single.map(m => getJSON(packUrl(m)).then(j => { items.set(m.id, j.items || []); }).catch(e => packErr(m, e)).finally(tick)),
  ]);
  // tệp nhóm không tải được (vd. mất mạng, bộ nhớ đệm bị xoá) → thử từng gói của nhóm đó
  if (failed.length) {
    const ids = new Set(failed);
    await Promise.all(packs.filter(m => ids.has(m.id) && !items.has(m.id)).map(m => getJSON(packUrl(m)).then(j => { items.set(m.id, j.items || []); }).catch(e => packErr(m, e))));
  }
  return packs.filter(m => items.has(m.id)).map(m => ({ ...m, src: 'builtin', items: items.get(m.id) }));
}
// v64: kiểm tra dữ liệu mới ở nền. Có bản mới → tải trước vào bộ nhớ đệm rồi mới lưu danh mục → lần mở sau dùng ngay.
const sigOf = m => JSON.stringify([(m.bundles || []).map(b => b.file), (m.packs || []).map(p => [p.id, p.version, p.hash]), m.lock || null]);
async function cacheUrls(urls) {
  const c = globalThis.caches ? await caches.open('tnt-data') : null;
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map(async u => {
      const abs = new URL(u, location.href).href;
      if (c && await c.match(abs)) return;
      const r = await fetch(abs, { cache: 'no-cache' });
      if (!r.ok) throw new Error(r.status);
      if (c) await c.put(abs, r);
    }));
  }
}
const dataUrls = m => { const inB = new Set((m.bundles || []).flatMap(b => b.packs)); return [...(m.bundles || []).map(bundleUrl), ...(m.packs || []).filter(p => !inB.has(p.id)).map(packUrl)]; };
export async function checkDataUpdate() {
  if (!navigator.onLine) return null;
  let m; try { m = await fetchManifest(); } catch { return null; }
  if (!m?.packs?.length) return null;
  if (sigOf(m) === sigOf(D.manifest)) { cacheUrls(dataUrls(m)).then(() => pruneDataCache(m)).catch(() => { }); return null; } // lần đầu mở: đưa dữ liệu vào bộ nhớ đệm của app
  await cacheUrls(dataUrls(m));
  await kvSet('manifestCache', m);
  pruneDataCache(m).catch(() => { });
  const old = new Map((D.manifest.packs || []).map(p => [p.id, `${p.version}.${p.hash}`]));
  return { n: m.packs.filter(p => old.get(p.id) !== `${p.version}.${p.hash}`).length };
}

// v60: xoá khỏi bộ nhớ đệm của app các gói không còn trong danh mục (vd. gói N3–N1 đầy đủ tải từ trước khi khóa lộ trình)
// v64: cả tệp nhóm cũ; gói đã nằm trong tệp nhóm thì không giữ bản lẻ nữa
export async function pruneDataCache(m) {
  if (!globalThis.caches) return 0;
  const inB = new Set((m.bundles || []).flatMap(b => b.packs || []));
  const keepP = new Set((m.packs || []).filter(p => !inB.has(p.id)).map(p => p.file)), keepB = new Set((m.bundles || []).map(b => b.file));
  const c = await caches.open('tnt-data');
  let n = 0;
  for (const k of await c.keys()) {
    const p = new URL(k.url).pathname, i = p.indexOf('/data/packs/'), j = p.indexOf('/data/bundles/');
    const drop = i >= 0 ? !keepP.has(decodeURIComponent(p.slice(i + 12))) : j >= 0 ? !keepB.has(decodeURIComponent(p.slice(j + 14))) : false;
    if (drop) { await c.delete(k); n++; }
  }
  return n;
}

// ---------- v57: lộ trình khóa (N3–N1) ----------
// Danh mục công khai có "lock": { levels, trial, bundles } khi nội dung các cấp đó đã chuyển lên máy chủ.
// Nội dung một cấp đã mở nằm ở kv 'lock:<cấp>' = { ver, level, packs, appdata }; quyền + hạn ở kv 'cloudGrants' (cloud.js ghi).
// Hết hạn (qua 1 ngày ân hạn) → xoá nội dung cấp đó khỏi máy, ghi mốc 'lockGap:<cấp>' để lúc mở lại giãn lịch ôn.
export const GRACE = 864e5;
export const lockLevels = () => D.manifest.lock?.levels || [];
export const isLockLevel = L => lockLevels().includes(L);
export const trialCount = () => D.manifest.lock?.trial ?? 2;
export const hasLockContent = L => D.locked.some(p => p.level === L);
export const levelOpen = L => !isLockLevel(L) || hasLockContent(L);
export async function grantUsable(L, now) {
  const c = await kvGet('cloudGrants', null), g = c?.g?.[L];
  if (!g || g.start == null || !(g.days > 0)) return false;
  now = now ?? Date.now() + (await kvGet('srvOff', 0));
  return now < g.start + g.days * 864e5 + GRACE;
}
export async function loadLocked() {
  D.locked = [];
  for (const L of lockLevels()) {
    const c = await kvGet('lock:' + L, null);
    if (!c) continue;
    if (!(await grantUsable(L))) { await kvSet('lock:' + L, null); await kvSet('lockGap:' + L, Date.now()); continue; }
    for (const p of c.packs || []) D.locked.push(packEntry({ ...p.pack, level: p.pack.level || L }, p.items || [], 'locked'));
  }
}
// gọi sau khi nội dung khóa thay đổi (tải về / hết hạn)
export async function reloadLocked() {
  await loadLocked();
  assemblePacks();
  rebuild();
  try { dispatchEvent(new CustomEvent('tn-data')); } catch { }
}

// Gói trên kho và gói nhập tay trùng tên: dùng bản có số phiên bản cao hơn (bằng nhau thì dùng bản nhập tay).
// Gói nhập tay đứng trước, gói trên kho đứng sau → một mục có ở hai gói KHÁC tên thì bản trên kho được dùng.
export function assemblePacks() {
  const bi = new Map(D.builtin.map(p => [p.id, p])), im = new Map(D.imported.map(p => [p.id, p]));
  const useI = [], useB = [];
  D.shadow = [];
  for (const p of D.imported) { const b = bi.get(p.id); if (b && (b.version || 1) > (p.version || 1)) D.shadow.push({ ...p, by: b }); else useI.push(p); }
  for (const p of D.builtin) { const i = im.get(p.id); if (i && (i.version || 1) >= (p.version || 1)) D.shadow.push({ ...p, by: i }); else useB.push(p); }
  D.packs = [...useI, ...useB, ...D.locked]; // v57: gói khóa đứng sau cùng → bản đầy đủ thay bản xem trước cùng mã
}
export async function setPrefs(patch) {
  D.prefs = { ...D.prefs, ...patch, t: Date.now() };
  await kvSet('prefs', D.prefs);
}

// Nhật ký việc đã làm trong ngày (Kế hoạch hôm nay đánh dấu ✓): {d: 'YYYY-M-D', a: {dich, the, kana, lesson, doc, gram…}}
export const todayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export const actToday = key => (D.prefs.day?.d === todayKey() ? D.prefs.day.a?.[key] || 0 : 0);
export async function logAct(key, n = 1) {
  if (!key || n <= 0) return;
  const d = todayKey(), a = D.prefs.day?.d === d ? { ...(D.prefs.day.a || {}) } : {};
  a[key] = (a[key] || 0) + n;
  await setPrefs({ day: { d, a } });
}
// Loại việc theo trang đã mở lượt luyện
export function actOf(back) {
  const h = String(back || '').replace(/^#\/?/, '');
  if (/^dich/.test(h)) return 'dich';
  if (/^luyen\/(chia|the|tinhtu)/.test(h)) return 'the';
  if (/^kana/.test(h)) return 'kana';
  if (/^(bai|onbai|tonghop)\//.test(h)) return 'lesson';
  if (/^doc/.test(h)) return 'doc';
  if (/^onhon/.test(h)) return 'on';
  return 'other';
}

// Lịch sử kiểm tra trình độ (đồng bộ giữa các máy)
export async function saveTest(rec) {
  D.tests[rec.id] = { ...rec, t: Date.now() };
  await kvSet('tests', D.tests);
}
export const testList = () => Object.values(D.tests).filter(x => !x._del).sort((a, b) => (b.at || b.t) - (a.at || a.t));
// Tiến độ kana (Chặng 0)
export async function saveKana(patch) {
  const now = Date.now();
  for (const [ch, x] of Object.entries(patch)) D.kana[ch] = { ...x, t: now };
  await kvSet('kana', D.kana);
}

// Tiến độ bài học (đồng bộ)
export async function saveLesson(id, patch) {
  D.lessons[id] = { ...(D.lessons[id] || {}), ...patch, t: Date.now() };
  await kvSet('lessons', D.lessons);
}
// Sổ tay (đồng bộ)
export async function saveBooks() { await kvSet('nbooks', D.nbooks); }
export async function saveMarks() { await kvSet('nmarks', D.nmarks); }

export function packEntry(p, items, src, t) {
  return { id: p.id, title: p.title, type: p.type, level: p.level, topics: p.topics || [], count: items.length, version: p.version || 1, src, items, _t: t };
}

export function rebuild() {
  const off = new Set(D.disabled.list || []);
  const m = new Map();
  for (const p of D.packs) {
    if (off.has(p.id)) continue;
    for (const it of p.items) m.set(it.id, norm({ ...it, _pack: p.id, _type: p.type }));
  }
  for (const u of D.user.values()) {
    if (u._del) { if (u._hide) m.delete(u.id); continue; }
    m.set(u.id, norm({ ...u, _user: true, _type: typeOfId(u.id), _pack: u._pack || 'tu-them' }));
  }
  D.items = m;
  D.vocab = []; D.grammar = []; D.phrase = []; D.kanji = []; D.lesson = []; D.dialog = []; D.text = [];
  for (const it of m.values()) ({ grammar: D.grammar, phrase: D.phrase, kanji: D.kanji, lesson: D.lesson, dialog: D.dialog, text: D.text }[it._type] || D.vocab).push(it);
  D.kanjiByChar = new Map(D.kanji.map(k => [k.char, k]));
}
function norm(it) {
  it.topics = it.topics || [];
  if (it._type === 'vocab') { it.kanji = it.kanji || ''; it.hv = it.hv || ''; it.ex = it.ex || []; }
  return it;
}

export async function setPackEnabled(id, on) {
  const s = new Set(D.disabled.list);
  on ? s.delete(id) : s.add(id);
  D.disabled = { list: [...s], t: Date.now() };
  await kvSet('disabled', D.disabled);
  rebuild();
}
// v61: bật / tắt cả một nhóm gói một lần (trang Dữ liệu)
export async function setPacksEnabled(ids, on) {
  const s = new Set(D.disabled.list);
  for (const id of ids) on ? s.delete(id) : s.add(id);
  D.disabled = { list: [...s], t: Date.now() };
  await kvSet('disabled', D.disabled);
  rebuild();
}

// ---- mục tự thêm / sửa ----
export async function saveUserItem(it) {
  const rec = { ...it, _t: Date.now() };
  for (const k of Object.keys(rec)) if (k.startsWith('_') && !['_t', '_pack'].includes(k)) delete rec[k];
  D.user.set(rec.id, rec);
  await put('user', rec);
  rebuild();
}
export async function deleteUserItem(id) {
  // Mục gốc từ gói: xoá bản sửa (trở về bản gốc). Mục tự thêm: ẩn hẳn.
  const inPack = D.packs.some(p => p.items.some(x => x.id === id));
  const rec = { id, _del: true, _hide: !inPack, _t: Date.now() };
  D.user.set(id, rec);
  await put('user', rec);
  rebuild();
}

// ---- báo sai ----
export async function report(id, note) {
  D.reports[id] = { note: note || '', t: Date.now() };
  await kvSet('reports', D.reports);
  try { dispatchEvent(new CustomEvent('tn-report', { detail: { id, note: note || '' } })); } catch { } // v59: gửi về hộp báo sai chung
}
export async function unreport(id) {
  D.reports[id] = { _del: true, t: Date.now() };
  await kvSet('reports', D.reports);
}
export const activeReports = () => Object.entries(D.reports).filter(([, r]) => !r._del);

// ---- nhập gói ----
export function checkPack(j) {
  const errs = [];
  if (!j || typeof j !== 'object') return ['Không phải JSON hợp lệ'];
  if (j.schema !== 1) errs.push('schema phải là 1');
  const p = j.pack || {};
  if (!p.id || !/^[a-z0-9-]+$/.test(p.id)) errs.push('pack.id thiếu hoặc sai dạng');
  if (!TYPES.includes(p.type)) errs.push('pack.type phải là ' + TYPES.join('/'));
  if (!p.title) errs.push('thiếu pack.title');
  if (!Array.isArray(j.items) || !j.items.length) errs.push('không có mục nào');
  const pre = { vocab: 'v:', grammar: 'g:', phrase: 'p:', kanji: 'k:', lesson: 'l:', dialog: 'd:', text: 't:' }[p.type];
  (j.items || []).forEach((it, i) => {
    const w = `mục ${i + 1}`;
    if (!it.id) errs.push(`${w}: thiếu id`);
    else if (pre && !it.id.startsWith(pre)) errs.push(`${w}: id phải bắt đầu bằng ${pre}`);
    if (p.type === 'vocab' && (!it.kana || !it.vi)) errs.push(`${w}: thiếu kana hoặc vi`);
    if (p.type === 'grammar' && (!it.pattern || !Array.isArray(it.ex))) errs.push(`${w}: thiếu pattern hoặc ex`);
    if (p.type === 'phrase' && (!it.jp || !it.vi)) errs.push(`${w}: thiếu jp hoặc vi`);
    if (p.type === 'kanji' && (!it.char || !it.hv)) errs.push(`${w}: thiếu char hoặc hv`);
    if (p.type === 'lesson' && (!it.level || !Array.isArray(it.words))) errs.push(`${w}: thiếu level hoặc words`);
    if (p.type === 'dialog' && (!Array.isArray(it.roles) || !Array.isArray(it.turns))) errs.push(`${w}: thiếu roles hoặc turns`);
    if (p.type === 'text' && !Array.isArray(it.sents)) errs.push(`${w}: thiếu sents`);
  });
  return errs;
}
export async function importPack(j, mode = 'replace') {
  const id = j.pack.id;
  let items = j.items;
  const old = D.imported.find(p => p.id === id);
  if (mode === 'merge' && old) {
    const m = new Map(old.items.map(x => [x.id, x]));
    for (const it of j.items) m.set(it.id, it);
    items = [...m.values()];
  }
  const rec = { id, pack: j.pack, items, _t: Date.now() };
  await put('imported', rec);
  D.imported = D.imported.filter(p => p.id !== id).concat(packEntry(j.pack, items, 'imported', rec._t));
  assemblePacks();
  rebuild();
  return items.length;
}
export async function removeImported(id) {
  await put('imported', { id, _del: true, _t: Date.now() });
  D.imported = D.imported.filter(p => p.id !== id);
  assemblePacks();
  rebuild();
}
