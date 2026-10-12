// Đồng bộ tiến độ qua một kho GitHub RIÊNG TƯ (contents API). Không cần máy chủ.
// Gộp theo dấu thời gian: bản nào sửa sau thì thắng (theo từng từ, từng chiều học).
import { kvGet, kvSet, putMany, all, clear } from './db.js';
import { P } from './srs.js';
import { D, rebuild, assemblePacks, packEntry } from './data.js';
import { S } from './settings.js';

const API = 'https://api.github.com';
let busy = false;

export const getSyncCfg = async () => normalizeCfg(await kvGet('sync', {}));
export const setSyncCfg = c => kvSet('sync', normalizeCfg(c));
export const lastSync = () => kvGet('lastSync', 0);
export const lastSyncError = () => kvGet('lastSyncError', '');

// ---------- cài đặt: chuẩn hoá những gì người dùng gõ/dán ----------
const TOKEN_RE = /^(github_pat_|ghp_|gho_|ghu_|ghs_)/;

// Tên tài khoản lấy từ địa chỉ app: https://<tài-khoản>.github.io/<kho>/
export function ownerFromSite(host = location.hostname) {
  const m = /^([a-z0-9-]+)\.github\.io$/i.exec(host || '');
  return m ? m[1] : '';
}
function parseOwner(s) {
  s = String(s || '').trim().replace(/^https?:\/\//i, '').replace(/^@/, '');
  let m = /^([A-Za-z0-9-]+)\.github\.io/i.exec(s);
  if (m) return m[1];
  m = /^(?:www\.)?github\.com\/([A-Za-z0-9-]+)/i.exec(s);
  if (m) return m[1];
  return s.split(/[/?#\s]/)[0];
}
function parseRepo(s) {
  s = String(s || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  if (/^github\.com\//i.test(s)) s = s.slice('github.com/'.length);
  const parts = s.split(/[/?#\s]/).filter(Boolean);
  if (parts.length >= 2) return { owner: parts[0], repo: parts[1].replace(/\.git$/i, '') };
  return { repo: (parts[0] || '').replace(/\.git$/i, '') };
}
// Nhận cả: link kho, "tài-khoản/kho", link trang app, dấu cách thừa, token bị xuống dòng.
export function normalizeCfg(c = {}) {
  const r = parseRepo(c.repo);
  return {
    owner: r.owner || parseOwner(c.owner) || ownerFromSite(),
    repo: r.repo,
    token: String(c.token || '').replace(/\s+/g, ''),
    branch: String(c.branch || '').trim() || 'main',
    path: String(c.path || '').trim().replace(/^\/+/, '') || 'tiengnhat-sync.json',
  };
}
export function missingFields(c) {
  const m = [];
  if (!c.owner) m.push('tên tài khoản GitHub');
  if (!c.repo) m.push('tên kho');
  if (!c.token) m.push('token');
  return m;
}
// Lỗi điền form (chưa cần mạng): token dán nhầm ô, hoặc còn thiếu ô.
export function formProblem(c) {
  if (TOKEN_RE.test(c.repo)) return 'Token đang bị dán vào ô tên kho. Ô tên kho chỉ ghi tiengnhat-tiendo; token dán vào ô Token.';
  if (TOKEN_RE.test(c.owner)) return 'Token đang bị dán vào ô tên tài khoản. Dán token vào ô Token.';
  const miss = missingFields(c);
  if (miss.length) return `Máy này còn thiếu: ${miss.join(', ')}. Mỗi máy (điện thoại, máy tính) phải điền một lần.`;
  return '';
}
// Che token khi hiện ra màn hình: github_pat_…abcd
export const maskToken = t => (!t ? '' : t.length <= 16 ? '…' + t.slice(-4) : `${t.slice(0, 11)}…${t.slice(-4)}`);

// ---------- chuyển cài đặt sang máy khác (mã QR / đường link) ----------
const b64u = s => { const b = new TextEncoder().encode(s); let x = ''; for (const c of b) x += String.fromCharCode(c); return btoa(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64u = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));
export function transferLink(cfg) {
  const c = normalizeCfg(cfg);
  const code = b64u(JSON.stringify({ v: 1, o: c.owner, r: c.repo, t: c.token, b: c.branch, p: c.path }));
  return `${location.origin}${location.pathname}#/nhan?c=${code}`;
}
export function readTransferCode(code) {
  try {
    const j = JSON.parse(unb64u(code));
    if (j.v !== 1 || !j.t) return null;
    return normalizeCfg({ owner: j.o, repo: j.r, token: j.t, branch: j.b, path: j.p });
  } catch { return null; }
}

const headers = c => ({ Authorization: `Bearer ${c.token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
const repoUrl = (o, r) => `${API}/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}`;
const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();
class HttpErr extends Error { constructor(status) { super(httpMsg(status)); this.status = status; } }

// Kiểm tra từng bước, trả về danh sách để hiện cho người dùng.
// ok: true = đạt · 'warn' = lưu ý · false = hỏng (dừng ở đây). fix: những gì app tự sửa được.
export async function diagnose(cfg) {
  const c = normalizeCfg(cfg);
  const steps = [], fix = {};
  const out = ok => ({ ok, steps, fix, cfg: { ...c, ...fix } });
  const prob = formProblem(c);
  if (prob) { steps.push({ ok: false, text: prob }); return out(false); }
  if (!TOKEN_RE.test(c.token)) steps.push({ ok: 'warn', text: 'Token thường bắt đầu bằng github_pat_. Kiểm tra lại đã dán đúng token (không phải tên token).' });
  if (!navigator.onLine) { steps.push({ ok: false, text: 'Máy đang không có mạng.' }); return out(false); }
  const H = headers(c);
  const get = u => fetch(u, { headers: H, cache: 'no-store' });
  try {
    // 1. token
    const u = await get(`${API}/user`);
    if (u.status === 401) { steps.push({ ok: false, text: 'Token sai hoặc đã hết hạn. Tạo token mới trên GitHub rồi dán lại.' }); return out(false); }
    if (!u.ok) { steps.push({ ok: false, text: `GitHub trả lỗi ${u.status} khi kiểm tra token.` }); return out(false); }
    const login = (await u.json()).login;
    steps.push({ ok: true, text: `Token hợp lệ, thuộc tài khoản ${login}.` });
    // 2. tài khoản
    let owner = c.owner;
    if (!same(owner, login)) {
      const alt = await get(repoUrl(login, c.repo));
      if (alt.ok) {
        fix.owner = login; owner = login;
        steps.push({ ok: 'warn', text: `Ô tên tài khoản đang ghi ${c.owner}, nhưng kho ${c.repo} nằm ở tài khoản ${login}. App đã tự sửa thành ${login}.` });
      } else {
        steps.push({ ok: false, text: `Token thuộc tài khoản ${login}, còn ô tên tài khoản đang ghi ${c.owner}. Kho tiến độ và token phải nằm cùng một tài khoản: tạo kho ${c.repo} trong tài khoản ${login}, hoặc đăng nhập ${c.owner} để tạo token mới.` });
        return out(false);
      }
    }
    // 3. kho
    const rp = await get(repoUrl(owner, c.repo));
    if (rp.status === 404) {
      steps.push({ ok: false, text: `Không thấy kho ${owner}/${c.repo}. Kiểm tra tên kho (đúng từng chữ, từng dấu gạch), và lúc tạo token đã chọn kho này ở mục "Only select repositories" chưa.` });
      return out(false);
    }
    if (!rp.ok) { steps.push({ ok: false, text: `GitHub trả lỗi ${rp.status} khi mở kho.` }); return out(false); }
    const repo = await rp.json();
    steps.push(repo.private
      ? { ok: true, text: `Thấy kho ${owner}/${c.repo} (riêng tư).` }
      : { ok: 'warn', text: `Kho ${owner}/${c.repo} đang để công khai — ai cũng xem được tiến độ. Nên đổi sang Private (Settings của kho → Change visibility).` });
    // 4. nhánh
    const br = await get(`${repoUrl(owner, c.repo)}/branches/${encodeURIComponent(c.branch)}`);
    if (br.status === 404) {
      if (repo.size === 0 || !repo.default_branch) {
        steps.push({ ok: false, text: 'Kho đang trống. Vào kho trên GitHub bấm "Add file → Create new file", đặt tên bất kỳ (ví dụ README.md) rồi Commit, sau đó đồng bộ lại.' });
        return out(false);
      }
      fix.branch = repo.default_branch;
      steps.push({ ok: 'warn', text: `Kho không có nhánh ${c.branch}. App đã đổi sang nhánh chính của kho: ${repo.default_branch}.` });
    } else if (!br.ok) { steps.push({ ok: false, text: `GitHub trả lỗi ${br.status} khi đọc nhánh.` }); return out(false); }
    // 5. file tiến độ (đọc được = có quyền Contents)
    const branch = fix.branch || c.branch;
    const fp = c.path.split('/').map(encodeURIComponent).join('/');
    const f = await get(`${repoUrl(owner, c.repo)}/contents/${fp}?ref=${encodeURIComponent(branch)}`);
    if (f.ok) steps.push({ ok: true, text: 'Đã có file tiến độ trên kho.' });
    else if (f.status === 404) steps.push({ ok: true, text: 'Chưa có file tiến độ — lần đồng bộ đầu tiên sẽ tạo.' });
    else if (f.status === 403) { steps.push({ ok: false, text: 'Token chưa có quyền đọc nội dung kho. Sửa token: Permissions → Contents → Read and write.' }); return out(false); }
    else { steps.push({ ok: false, text: `GitHub trả lỗi ${f.status} khi đọc file tiến độ.` }); return out(false); }
    return out(true);
  } catch {
    steps.push({ ok: false, text: 'Không kết nối được GitHub. Kiểm tra mạng rồi thử lại.' });
    return out(false);
  }
}

function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}
function httpMsg(st) {
  return {
    401: 'Token sai hoặc đã hết hạn — tạo token mới và dán lại.',
    403: 'Token chỉ có quyền đọc — sửa token: Permissions → Contents → Read and write.',
    404: 'Không thấy kho — bấm "Kiểm tra kết nối" để xem sai ở đâu.',
    409: 'Kho đang trống — tạo một file bất kỳ trong kho rồi đồng bộ lại.',
  }[st] || `GitHub trả lỗi ${st}.`;
}

async function snapshot() {
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
    out[id] = r;
  }
  return out;
}
function mergeMap(a = {}, b = {}, key) {
  const out = {};
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) out[id] = newer(a[id], b[id], key);
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
    prefs: newer(a.prefs, b.prefs),
    tests: mergeMap(a.tests, b.tests),
    kana: mergeMap(a.kana, b.kana),
  };
}

export async function applySnapshot(m) {
  const prog = Object.values(m.progress || {});
  await putMany('progress', prog);
  P.clear(); for (const r of prog) P.set(r.id, r);
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
  rebuild();
}

async function pushPull(c) {
  const path = c.path.split('/').map(encodeURIComponent).join('/');
  const url = `${repoUrl(c.owner, c.repo)}/contents/${path}`;
  const branch = c.branch;
  const H = headers(c);
  for (let attempt = 0; attempt < 3; attempt++) {
    let sha, remote = null;
    const r = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: H, cache: 'no-store' });
    if (r.ok) {
      const j = await r.json();
      sha = j.sha;
      let text;
      if (j.content && j.encoding === 'base64') text = b64decode(j.content);
      else {
        const r2 = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: { ...H, Accept: 'application/vnd.github.raw+json' }, cache: 'no-store' });
        if (!r2.ok) throw new HttpErr(r2.status);
        text = await r2.text();
      }
      try { remote = JSON.parse(text); } catch { remote = null; }
    } else if (r.status !== 404) throw new HttpErr(r.status);

    const local = await snapshot();
    const merged = remote ? merge(local, remote) : local;
    await applySnapshot(merged);
    const body = { message: `đồng bộ từ ${S.deviceName || 'may'} ${new Date().toISOString()}`, content: b64encode(JSON.stringify(merged)), branch };
    if (sha) body.sha = sha;
    const w = await fetch(url, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (w.status === 409 && sha) continue;         // có máy khác vừa ghi → đọc lại, gộp lại
    if (w.status === 422 && sha) continue;
    if (!w.ok) throw new HttpErr(w.status);
    return;
  }
  throw new Error('Có máy khác đang ghi cùng lúc — thử lại sau ít phút.');
}

export async function syncNow() {
  let c = await getSyncCfg();
  const prob = formProblem(c);
  if (prob) return { skipped: prob, problem: prob };
  if (!navigator.onLine) return { skipped: 'Đang không có mạng.' };
  if (busy) return { skipped: 'Đang đồng bộ.' };
  busy = true;
  let fixed = '';
  try {
    try {
      await pushPull(c);
    } catch (e) {
      if (!(e instanceof HttpErr)) throw e;
      // Lỗi tài khoản / kho / quyền: tự kiểm tra từng bước, sửa được thì sửa rồi thử lại một lần.
      const d = await diagnose(c);
      if (d.ok && (d.fix.owner || d.fix.branch)) {
        c = d.cfg;
        await setSyncCfg(c);
        fixed = d.steps.filter(s => s.ok === 'warn' && /tự sửa|đã đổi/.test(s.text)).map(s => s.text).join(' ');
        await pushPull(c);
      } else {
        const bad = d.steps.find(s => s.ok === false);
        const err = new Error(bad ? bad.text : e.message);
        err.diag = d;
        throw err;
      }
    }
    await kvSet('lastSync', Date.now());
    await kvSet('lastSyncError', '');
    return { ok: true, fixed };
  } catch (e) {
    const msg = e?.message?.includes('Failed to fetch') ? 'Không kết nối được GitHub.' : (e?.message || 'Lỗi không rõ.');
    await kvSet('lastSyncError', msg);
    return { error: msg, diag: e?.diag };
  } finally { busy = false; }
}

// Sao lưu ra file (không cần GitHub)
export const backupJSON = async () => JSON.stringify(await snapshot());
export async function restoreJSON(text, mode = 'merge') {
  const j = JSON.parse(text);
  if (j.app !== 'tiengnhat' || !j.progress) throw new Error('File không phải bản sao lưu của app.');
  if (mode === 'merge') { await applySnapshot(merge(await snapshot(), j)); return; }
  for (const s of ['progress', 'user', 'imported']) await clear(s);
  await applySnapshot({ ...j, disabled: j.disabled || { list: [], t: Date.now() }, reports: j.reports || {}, tests: j.tests || {}, kana: j.kana || {} });
}
