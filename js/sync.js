// Đồng bộ tiến độ qua một kho GitHub RIÊNG TƯ (contents API). Không cần máy chủ.
// Gộp theo dấu thời gian: bản nào sửa sau thì thắng (theo từng từ, từng chiều học).
import { kvGet, kvSet, putMany, all, clear } from './db.js';
import { P } from './srs.js';
import { D, rebuild } from './data.js';
import { S } from './settings.js';

const API = 'https://api.github.com';
let busy = false;

export const getSyncCfg = () => kvGet('sync', { owner: '', repo: '', branch: 'main', path: 'tiengnhat-sync.json', token: '' });
export const setSyncCfg = c => kvSet('sync', c);
export const lastSync = () => kvGet('lastSync', 0);
export const lastSyncError = () => kvGet('lastSyncError', '');

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
    403: 'Token không có quyền ghi — cần quyền Contents: Read and write cho đúng kho này.',
    404: 'Không thấy kho hoặc nhánh — kiểm tra tên tài khoản, tên kho, và token đã chọn đúng kho chưa.',
    409: 'Kho đang trống — khi tạo kho cần tích "Add a README file".',
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
  D.packs = D.packs.filter(p => p.src !== 'imported').concat(
    imps.filter(x => !x._del).map(x => ({ id: x.id, title: x.pack.title, type: x.pack.type, level: x.pack.level, topics: x.pack.topics || [], count: x.items.length, version: x.pack.version || 1, src: 'imported', items: x.items, _t: x._t })));
  if (m.disabled) { D.disabled = m.disabled; await kvSet('disabled', D.disabled); }
  if (m.reports) { D.reports = m.reports; await kvSet('reports', D.reports); }
  rebuild();
}

export async function syncNow() {
  const c = await getSyncCfg();
  if (!c.token || !c.owner || !c.repo) return { skipped: 'Chưa cài đồng bộ.' };
  if (!navigator.onLine) return { skipped: 'Đang không có mạng.' };
  if (busy) return { skipped: 'Đang đồng bộ.' };
  busy = true;
  try {
    const path = (c.path || 'tiengnhat-sync.json').split('/').map(encodeURIComponent).join('/');
    const url = `${API}/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${path}`;
    const branch = c.branch || 'main';
    const H = { Authorization: `Bearer ${c.token.trim()}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
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
          if (!r2.ok) throw new Error(httpMsg(r2.status));
          text = await r2.text();
        }
        try { remote = JSON.parse(text); } catch { remote = null; }
      } else if (r.status !== 404) throw new Error(httpMsg(r.status));

      const local = await snapshot();
      const merged = remote ? merge(local, remote) : local;
      await applySnapshot(merged);
      const body = { message: `đồng bộ từ ${S.deviceName || 'may'} ${new Date().toISOString()}`, content: b64encode(JSON.stringify(merged)), branch };
      if (sha) body.sha = sha;
      const w = await fetch(url, { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (w.status === 409 || (w.status === 422 && sha)) continue; // có máy khác vừa ghi → đọc lại, gộp lại
      if (!w.ok) throw new Error(httpMsg(w.status));
      await kvSet('lastSync', Date.now());
      await kvSet('lastSyncError', '');
      return { ok: true };
    }
    throw new Error('Có máy khác đang ghi cùng lúc — thử lại sau ít phút.');
  } catch (e) {
    const msg = e?.message?.includes('Failed to fetch') ? 'Không kết nối được GitHub.' : (e?.message || 'Lỗi không rõ.');
    await kvSet('lastSyncError', msg);
    return { error: msg };
  } finally { busy = false; }
}

// Sao lưu ra file (không cần GitHub)
export const backupJSON = async () => JSON.stringify(await snapshot());
export async function restoreJSON(text, mode = 'merge') {
  const j = JSON.parse(text);
  if (j.app !== 'tiengnhat' || !j.progress) throw new Error('File không phải bản sao lưu của app.');
  if (mode === 'merge') { await applySnapshot(merge(await snapshot(), j)); return; }
  for (const s of ['progress', 'user', 'imported']) await clear(s);
  await applySnapshot({ ...j, disabled: j.disabled || { list: [], t: Date.now() }, reports: j.reports || {} });
}
