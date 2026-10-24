// Gộp và sao lưu tiến độ học. v61: bỏ đồng bộ qua kho GitHub — đồng bộ giữa các máy đi theo tài khoản Google (cloud.js dùng snapshot / merge / applySnapshot ở đây).
// Gộp theo dấu thời gian: bản nào sửa sau thì thắng (theo từng từ, từng chiều học).
import { kvSet, putMany, all, clear, del } from './db.js';
import { P, bumpProgress } from './srs.js';
import { D, rebuild, assemblePacks, packEntry } from './data.js';

// v61: xoá cài đặt đồng bộ GitHub cũ (có token) khỏi máy — app không dùng nữa
export async function forgetGitHub() {
  for (const k of ['sync', 'lastSync', 'lastSyncError']) await del('kv', k).catch(() => { });
}

export async function snapshot() {
  const imported = {};
  for (const x of await all('imported')) imported[x.id] = x;
  return {
    schema: 1, app: 'tiengnhat', t: Date.now(),
    progress: Object.fromEntries(P),
    user: Object.fromEntries(D.user),
    imported,
    disabled: D.disabled,
    reports: D.reports,
    prefs: D.prefs,
    tests: D.tests,
    kana: D.kana,
    fstat: D.fstat,
    cthe: D.cthe,
    lessons: D.lessons,
    nbooks: D.nbooks,
    nmarks: D.nmarks,
  };
}

function newer(a, b, key = 't') { if (!a) return b; if (!b) return a; return (b[key] || 0) > (a[key] || 0) ? b : a; }
function mergeProgress(a = {}, b = {}) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[id], y = b[id];
    if (!x || !y) { out[id] = x || y; continue; }
    const r = { id, d: {}, t: Math.max(x.t || 0, y.t || 0), first: Math.min(x.first || Infinity, y.first || Infinity) };
    if (r.first === Infinity) delete r.first;
    for (const d of new Set([...Object.keys(x.d || {}), ...Object.keys(y.d || {})])) r.d[d] = newer(x.d?.[d], y.d?.[d]);
    const s = (y.st || 0) > (x.st || 0) ? y : x;
    if (s.st) { r.star = !!s.star; r.st = s.st; }
    const q = (y.rlt || 0) > (x.rlt || 0) ? y : x; // v41: nhãn "cần học lại" của chữ Hán — bản đổi sau cùng thắng
    if (q.rlt) { r.rl = !!q.rl; r.rlok = q.rlok || 0; r.rlt = q.rlt; if (q.rld) r.rld = q.rld; if (q.rlk) r.rlk = q.rlk; }
    out[id] = r;
  }
  return out;
}
function mergeMap(a = {}, b = {}, key) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) out[id] = newer(a[id], b[id], key);
  return out;
}
// v68: cài đặt học lấy nguyên bản mới hơn; riêng các phần có mốc thời gian của chính nó (at) thì lấy bản mới hơn của phần đó
// — vd. thể / thì đang luyện (hrt): máy mới vừa làm bước đầu (cài đặt mới hơn) vẫn nhận lựa chọn đã lưu trên tài khoản
const PREF_PARTS = ['hrt'];
function mergePrefs(a, b) {
  const p = newer(a, b);
  if (!a || !b || !p) return p;
  const out = { ...p };
  for (const k of PREF_PARTS) { const x = a[k], y = b[k], w = (x?.at || 0) >= (y?.at || 0) ? x : y; if (w) out[k] = w; }
  return out;
}
export function merge(a, b) {
  return {
    schema: 1, app: 'tiengnhat', t: Date.now(),
    progress: mergeProgress(a.progress, b.progress),
    user: mergeMap(a.user, b.user, '_t'),
    imported: mergeMap(a.imported, b.imported, '_t'),
    disabled: newer(a.disabled, b.disabled),
    reports: mergeMap(a.reports, b.reports),
    prefs: mergePrefs(a.prefs, b.prefs),
    tests: mergeMap(a.tests, b.tests),
    kana: mergeMap(a.kana, b.kana),
    fstat: mergeMap(a.fstat, b.fstat),
    cthe: mergeMap(a.cthe, b.cthe),
    lessons: mergeMap(a.lessons, b.lessons),
    nbooks: mergeMap(a.nbooks, b.nbooks),
    nmarks: mergeMap(a.nmarks, b.nmarks),
  };
}

export async function applySnapshot(m) {
  const prog = Object.values(m.progress || {});
  await putMany('progress', prog);
  P.clear(); for (const r of prog) P.set(r.id, r); bumpProgress();
  const users = Object.values(m.user || {});
  await putMany('user', users);
  D.user = new Map(users.map(u => [u.id, u]));
  const imps = Object.values(m.imported || {});
  await putMany('imported', imps);
  D.imported = imps.filter(x => !x._del).map(x => packEntry(x.pack, x.items, 'imported', x._t));
  assemblePacks();
  if (m.prefs) { D.prefs = { ...D.prefs, ...m.prefs }; await kvSet('prefs', D.prefs); }
  if (m.disabled) { D.disabled = m.disabled; await kvSet('disabled', D.disabled); }
  if (m.reports) { D.reports = m.reports; await kvSet('reports', D.reports); }
  if (m.tests) { D.tests = m.tests; await kvSet('tests', D.tests); }
  if (m.kana) { D.kana = m.kana; await kvSet('kana', D.kana); }
  if (m.fstat) { D.fstat = m.fstat; await kvSet('fstat', D.fstat); }
  if (m.cthe) { D.cthe = m.cthe; await kvSet('cthe', D.cthe); }
  if (m.lessons) { D.lessons = m.lessons; await kvSet('lessons', D.lessons); }
  if (m.nbooks) { D.nbooks = m.nbooks; await kvSet('nbooks', D.nbooks); }
  if (m.nmarks) { D.nmarks = m.nmarks; await kvSet('nmarks', D.nmarks); }
  rebuild();
}

// Sao lưu ra file
export const backupJSON = async () => JSON.stringify(await snapshot());
export async function restoreJSON(text, mode = 'merge') {
  const j = JSON.parse(text);
  if (j.app !== 'tiengnhat' || !j.progress) throw new Error('File không phải bản sao lưu của app.');
  if (mode === 'merge') { await applySnapshot(merge(await snapshot(), j)); return; }
  for (const s of ['progress', 'user', 'imported']) await clear(s);
  await applySnapshot({ ...j, disabled: j.disabled || { list: [], t: Date.now() }, reports: j.reports || {}, tests: j.tests || {}, kana: j.kana || {}, fstat: j.fstat || {}, cthe: j.cthe || {}, lessons: j.lessons || {}, nbooks: j.nbooks || {}, nmarks: j.nmarks || {} });
}
