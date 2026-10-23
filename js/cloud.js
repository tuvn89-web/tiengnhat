// v56: tài khoản Google + máy chủ Firebase — đăng nhập, hồ sơ, đồng bộ tiến độ theo tài khoản,
// quyền mở lộ trình N3–N1 (do quản trị viên mở, hoặc nhập mã kích hoạt), và các việc của trang quản trị.
// Mã Firebase (≈ 250 KB) chỉ tải khi máy này đã từng đăng nhập hoặc bấm "Đăng nhập".
import { kvGet, kvSet } from './db.js';
import { FIREBASE } from './cloudcfg.js';
import { DAY } from './util.js';

export const LOCKED = ['N3', 'N2', 'N1'];
export const FOREVER = 36500;          // "vĩnh viễn" = 100 năm
export const GRACE_DAYS = 1;           // ân hạn sau ngày hết hạn
let B = null, booting = null, user = null, admin = null, syncing = false;
let SOFF = 0; kvGet('srvOff', 0).then(v => { SOFF = v || 0; }).catch(() => { });
export const serverNow = () => Date.now() + SOFF; // v57: giờ máy chủ (đo lúc đồng bộ) — chỉnh giờ máy không kéo dài được hạn
const subs = new Set();
const emit = () => subs.forEach(f => { try { f(user); } catch { } });

export const cloudEnabled = () => !!(FIREBASE || globalThis.__tnCloudFake);
export const cloudUser = () => user;
export const onCloud = f => { subs.add(f); return () => subs.delete(f); };
export const backend = () => B;
export const tsMs = v => (B ? B.ms(v) : (typeof v === 'number' ? v : null));

export function bootCloud() {
  if (!cloudEnabled()) return Promise.resolve(null);
  if (booting) return booting;
  booting = (async () => {
    B = globalThis.__tnCloudFake || (await import('./cloudfb.js')).makeBackend(FIREBASE);
    await new Promise(res => {
      let first = true;
      B.onUser(async u => {
        const was = user?.uid;
        user = u; if (u?.uid !== was) admin = null;
        if (u) await kvSet('cloudOn', 1);
        emit();
        if (first) { first = false; res(); }
      });
    });
    return B;
  })();
  booting.catch(() => { booting = null; });
  return booting;
}

// ---------- tiện ích ----------
const ALPH = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // bỏ I, L, O, U cho khỏi đọc nhầm
function rnd(n, a = ALPH) { const r = crypto.getRandomValues(new Uint8Array(n)); return [...r].map(x => a[x % a.length]).join(''); }
export const normCode = s => String(s || '').toUpperCase().replace(/[OIL]/g, m => ({ O: '0', I: '1', L: '1' })[m]).replace(/[^0-9A-Z]/g, '');
export const fmtCode = c => (c.length === 10 ? `${c.slice(0, 5)}-${c.slice(5)}` : c);
async function deviceId() {
  let d = await kvGet('deviceId', '');
  if (!d) { d = rnd(12, 'abcdefghijkmnpqrstuvwxyz23456789'); await kvSet('deviceId', d); }
  return d;
}
export const qrLink = uid => `${location.origin}${location.pathname}#/quantri/u/${uid}`;
export const uidFromScan = s => {
  s = String(s || '').trim();
  const m = s.match(/#\/quantri\/u\/([A-Za-z0-9_-]{6,128})/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{20,128}$/.test(s) ? s : '';
};

// ---------- đăng nhập ----------
export async function signIn() {
  await bootCloud();
  user = await B.signIn();
  await kvSet('cloudOn', 1); await kvSet('rankSent', '');
  admin = null;
  emit();
  await touchProfile();
  const r = await cloudSync();
  await refreshGrants().catch(() => { });
  emit();
  return r;
}
export async function signOutCloud() {
  await bootCloud();
  await touching;
  await B.signOut();
  user = null; admin = null;
  await kvSet('cloudOn', 0); await kvSet('cloudGrants', null); await kvSet('cloudSync', 0); await kvSet('cloudErr', '');
  emit();
}
export async function deleteAccount() {
  const uid = user.uid;
  const meta = await B.get(`progress/${uid}`).catch(() => null);
  if (meta?.gen) for (let i = 0; i < meta.n; i++) await B.remove(`progress/${uid}/c/${meta.gen}-${i}`).catch(() => { });
  await B.remove(`progress/${uid}`).catch(() => { });
  await B.remove(`users/${uid}`).catch(() => { });
  await B.deleteMe();
  user = null; admin = null;
  await kvSet('cloudOn', 0); await kvSet('cloudGrants', null); await kvSet('cloudSync', 0);
  emit();
}

// ---------- hồ sơ (để quản trị viên thấy ai đang học tới đâu) ----------
async function profileStats() {
  const [{ stageInfo }, L] = await Promise.all([import('./roadmap.js'), import('./lesson.js')]);
  const { st, cur } = stageInfo();
  const lessons = {};
  for (const lv of ['N5', 'N4', 'N3', 'N2', 'N1']) lessons[lv] = L.lessonsOf(lv).filter(L.isDone).length;
  return { cur, known: st.reduce((a, x) => a + x.known, 0), lessons };
}
let touching = null;
export function touchProfile() {
  if (!user) return Promise.resolve();
  const u = user;
  touching = (async () => {
    const p = `users/${u.uid}`;
    const cur = await B.get(p);
    const data = { name: u.name || '', email: u.email || '', photo: u.photo || '', lastSeen: B.now(), dev: { [await deviceId()]: Date.now() } };
    try { data.stats = await profileStats(); } catch { }
    if (!cur) data.created = B.now();
    if (user?.uid !== u.uid) return; // đã đăng xuất / đổi tài khoản giữa chừng
    await B.set(p, data, { merge: true });
    // v58: hồ sơ công khai (biệt danh, ảnh, khung) + dòng trên bảng xếp hạng
    const prof = { uid: u.uid, nick: cur?.nick || '', av: cur?.av || 'g', frame: cur?.frame || '', hideRank: !!cur?.hideRank };
    await kvSet('profile', prof);
    await pushRank(prof).catch(() => { });
    // v57: đọc lại giờ máy chủ vừa ghi → độ lệch so với giờ máy này
    const t0 = Date.now(), back = await B.get(p), sv = B.ms(back?.lastSeen);
    if (sv) { const off = sv - Math.round((t0 + Date.now()) / 2); SOFF = Math.abs(off) > 120000 ? off : 0; await kvSet('srvOff', SOFF); }
  })().catch(() => { });
  return touching;
}

// ---------- v58: hồ sơ công khai + bảng xếp hạng ----------
export async function myProfile() {
  if (!user) return null;
  const d = (await B.get(`users/${user.uid}`)) || {};
  const p = { uid: user.uid, nick: d.nick || '', av: d.av || 'g', frame: d.frame || '', hideRank: !!d.hideRank };
  await kvSet('profile', p);
  return p;
}
export async function cachedProfile() { const c = await kvGet('profile', null); return c && c.uid === user?.uid ? c : null; }
export async function saveProfile(patch) {
  if (!user) throw new Error('Chưa đăng nhập.');
  await B.set(`users/${user.uid}`, patch, { merge: true });
  const p = { ...((await cachedProfile()) || { uid: user.uid }), ...patch, uid: user.uid };
  await kvSet('profile', p);
  await pushRank(p, true);
  emit();
  return p;
}
export async function pushRank(p, force = false) {
  if (!user || !B) return;
  p = p || (await cachedProfile()) || (await myProfile());
  const path = `ranks/${user.uid}`;
  if (!p?.nick || p.hideRank) {
    if (force || (await kvGet('rankSent', ''))) { await B.remove(path).catch(() => { }); await kvSet('rankSent', ''); }
    return;
  }
  const row = await (await import('./profile.js')).rankRow(p, user);
  const key = JSON.stringify(row);
  if (!force && key === (await kvGet('rankSent', ''))) return;
  try { await B.set(path, { ...row, t: B.now() }); await kvSet('rankSent', key); }
  catch (e) { if (e?.code !== 'permission-denied') throw e; } // bị quản trị viên gỡ khỏi bảng → thôi gửi
}
export async function myRankDoc() { if (!user) return null; const d = await B.get(`ranks/${user.uid}`); return d ? { id: user.uid, ...d } : null; }
const rkField = tab => (tab === 'all' ? 's_all' : 's_' + tab);
export const rankList = tab => B.list('ranks', { orderBy: [rkField(tab), 'desc'], limit: 50 }).then(rs => rs.filter(r => (r[rkField(tab)] || 0) > 0));
export const rankPos = async (tab, s) => 1 + (await B.count('ranks', { where: [[rkField(tab), '>', s || 0]] }));

// ---------- v59: báo sai chung, thông báo chung ----------
export async function sendReport(id, note) {
  if (!user || !B) return false;
  const p = await cachedProfile();
  await B.set(`reports/${rnd(16)}`, { uid: user.uid, nick: p?.nick || '', item: String(id).slice(0, 200), note: String(note || '').slice(0, 500), t: B.now(), st: 'moi', ver: (await import('./util.js')).APP_VERSION.split(' ')[0] });
  return true;
}
export async function fetchNotice() {
  try { await bootCloud(); const n = await B.get('settings/notice'); if (n?.text) { const o = { ...n, t: B.ms(n.t) }; await kvSet('notice', o); return o; } await kvSet('notice', null); return null; }
  catch { return kvGet('notice', null); }
}

// ---------- quyền mở lộ trình ----------
export function grantInfo(g, now = serverNow()) {
  if (!g || !(g.days > 0) || g.start == null) return { state: 'none' };
  const until = g.start + g.days * DAY, grace = until + GRACE_DAYS * DAY;
  return { until, grace, forever: g.days >= FOREVER, state: now < until ? 'on' : now < grace ? 'grace' : 'off', left: Math.ceil((until - now) / DAY) };
}
const plainGrant = g => (g ? { start: B.ms(g.start), days: g.days | 0, by: g.by || '', code: g.code || '', note: g.note || '' } : null);
export async function refreshGrants() {
  if (!user) return {};
  const g = (await B.get(`grants/${user.uid}`)) || {};
  const out = {};
  for (const L of LOCKED) if (g[L]) out[L] = plainGrant(g[L]);
  await kvSet('cloudGrants', { uid: user.uid, g: out, t: Date.now() });
  emit();
  return out;
}
export async function myGrants() {
  const c = await kvGet('cloudGrants', null);
  return c && (!user || c.uid === user.uid) ? c.g || {} : {};
}
export async function redeemCode(raw) {
  if (!user) throw new Error('Đăng nhập trước khi nhập mã.');
  const C = normCode(raw);
  if (C.length !== 10) throw new Error('Mã gồm 10 ký tự (chữ và số). Kiểm tra lại.');
  const uid = user.uid;
  const r = await B.tx(async t => {
    const c = await t.get(`codes/${C}`);
    if (!c) return { err: 'Mã không đúng. Kiểm tra lại từng ký tự.' };
    if (c.revoked) return { err: 'Mã này đã bị thu hồi.' };
    if (c.usedBy) return { err: c.usedBy === uid ? 'Tài khoản này đã dùng mã này rồi.' : 'Mã này đã có người dùng.' };
    const doc = await t.get(`grants/${uid}`);
    const old = doc?.[c.level];
    const active = old && B.ms(old.start) + old.days * DAY > Date.now();
    const neu = active ? { start: old.start, days: old.days + c.days, by: 'code', code: C, at: B.now() }
      : { start: B.now(), days: c.days, by: 'code', code: C, at: B.now() };
    t.update(`codes/${C}`, { usedBy: uid, usedAt: B.now() });
    if (doc) t.update(`grants/${uid}`, { [c.level]: neu });
    else t.set(`grants/${uid}`, { [c.level]: neu });
    return { level: c.level, days: c.days, extended: !!active };
  });
  if (r.err) throw new Error(r.err);
  await refreshGrants();
  syncLocked(); // tải nội dung cấp vừa mở (chạy nền)
  return r;
}
export async function publicSettings() {
  try { const s = (await B.get('settings/public')) || {}; await kvSet('cloudPublic', s); return s; }
  catch { return kvGet('cloudPublic', {}); }
}

// ---------- đồng bộ tiến độ theo tài khoản (nén gzip, chia mảnh ≤ 900 KB) ----------
const CH = 900_000;
async function gz(str) {
  const u8 = new TextEncoder().encode(str);
  if (typeof CompressionStream === 'undefined') return { z: 0, u8 };
  const s = new Blob([u8]).stream().pipeThrough(new CompressionStream('gzip'));
  return { z: 1, u8: new Uint8Array(await new Response(s).arrayBuffer()) };
}
async function gunz(u8, z) {
  if (!z) return new TextDecoder().decode(u8);
  const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(s).text();
}
const concat = parts => { const n = parts.reduce((a, p) => a + p.length, 0), out = new Uint8Array(n); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
async function pullBlob(base, meta, onPart) {
  const parts = [];
  for (let i = 0; i < meta.n; i++) {
    const c = await B.get(`${base}/c/${meta.gen}-${i}`);
    if (!c) throw new Error('Thiếu một phần dữ liệu trên máy chủ — thử lại sau ít phút.');
    parts.push(B.unbytes(c.b)); onPart?.(i + 1, meta.n);
  }
  return JSON.parse(await gunz(concat(parts), meta.z));
}
async function pullProgress(uid) {
  const meta = await B.get(`progress/${uid}`);
  if (!meta?.gen) return { meta, data: null };
  return { meta, data: await pullBlob(`progress/${uid}`, meta) };
}
async function pushProgress(uid, obj, prev) {
  const { z, u8 } = await gz(JSON.stringify(obj));
  const gen = rnd(8), n = Math.max(1, Math.ceil(u8.length / CH)), dev = await deviceId();
  const paths = Array.from({ length: n }, (_, i) => `progress/${uid}/c/${gen}-${i}`);
  for (let i = 0; i < n; i++) await B.set(paths[i], { b: B.bytes(u8.subarray(i * CH, (i + 1) * CH)) });
  // khoá lạc quan: chỉ đổi bản chính khi chưa có máy nào ghi chen vào từ lúc đọc
  const ok = await B.tx(async t => {
    const m = await t.get(`progress/${uid}`);
    if ((m?.ver || 0) !== (prev?.ver || 0)) return false;
    t.set(`progress/${uid}`, { ver: (m?.ver || 0) + 1, gen, n, z, size: u8.length, t: B.now(), dev });
    return true;
  });
  if (!ok) { for (const p of paths) await B.remove(p).catch(() => { }); return false; }
  if (prev?.gen) for (let i = 0; i < prev.n; i++) await B.remove(`progress/${uid}/c/${prev.gen}-${i}`).catch(() => { });
  return true;
}
const sameData = (a, b) => JSON.stringify({ ...a, t: 0 }) === JSON.stringify({ ...b, t: 0 });
export async function cloudSync() {
  if (!user) return { skipped: 'Chưa đăng nhập.' };
  if (!navigator.onLine) return { skipped: 'Đang không có mạng.' };
  if (syncing) return { skipped: 'Đang đồng bộ.' };
  syncing = true;
  try {
    const S = await import('./sync.js');
    for (let a = 0; a < 3; a++) {
      const { meta, data } = await pullProgress(user.uid);
      const local = await S.snapshot();
      const merged = data ? S.merge(local, data) : local;
      await S.applySnapshot(merged);
      if ((data && sameData(merged, data)) || await pushProgress(user.uid, merged, meta)) {
        await kvSet('cloudSync', Date.now()); await kvSet('cloudErr', '');
        touchProfile();
        refreshGrants().then(() => syncLocked()).catch(() => { });
        return { ok: true, first: !meta?.gen };
      }
    }
    throw new Error('Có máy khác đang lưu cùng lúc — thử lại sau ít phút.');
  } catch (e) {
    const msg = e?.message || 'Lỗi không rõ.';
    await kvSet('cloudErr', msg);
    return { error: msg };
  } finally { syncing = false; }
}
export const cloudSyncInfo = async () => ({ t: await kvGet('cloudSync', 0), err: await kvGet('cloudErr', '') });

// ---------- v57: nội dung lộ trình khóa (N3–N1) ----------
// content/<cấp> = { ver, gen, n, z, size, t, made } · content/<cấp>/c/<gen>-<i> = { b } (gzip, ≤ 900 KB/mảnh)
// Máy chủ chỉ cho tải khi tài khoản còn quyền cấp đó (kể cả 1 ngày ân hạn). Tải một lần, giữ trong máy (kv 'lock:<cấp>').
export const lockState = {}; // cấp → 'tai' (đang tải) | 'loi' | 'cho' (admin chưa đẩy nội dung)
let lockBusy = null, lockAgain = false;
async function shiftReviews(bundle, gap) {
  if (!(gap > 0)) return;
  const [{ P, bumpProgress }, { putMany }] = await Promise.all([import('./srs.js'), import('./db.js')]);
  const ids = new Set(); for (const p of bundle.packs || []) for (const it of p.items || []) ids.add(it.id);
  const out = [];
  for (const id of ids) {
    const r = P.get(id); if (!r?.d) continue;
    let ch = false;
    for (const x of Object.values(r.d)) if (x?.due > 0 && !x.m) { x.due += gap; ch = true; }
    if (ch) out.push(r);
  }
  if (out.length) { await putMany('progress', out); bumpProgress(); }
}
export function syncLocked() {
  // đang chạy mà có yêu cầu mới (vừa nhập mã, vừa gia hạn) → chạy lại một lượt ngay sau lượt đang chạy
  if (lockBusy) { lockAgain = true; return lockBusy.then(() => syncLocked()); }
  lockAgain = false;
  lockBusy = (async () => {
    if (!user || !B) return { changed: false };
    const Dm = await import('./data.js');
    const levels = Dm.lockLevels(), st0 = JSON.stringify(lockState);
    let changed = false; const got = [];
    for (const L of levels) {
      const usable = await Dm.grantUsable(L, serverNow()), cache = await kvGet('lock:' + L, null);
      if (!usable) {
        delete lockState[L];
        if (cache) { await kvSet('lock:' + L, null); await kvSet('lockGap:' + L, Date.now()); changed = true; }
        continue;
      }
      if (!navigator.onLine) continue;
      let meta;
      try { meta = await B.get(`content/${L}`); } catch { lockState[L] = 'loi'; continue; }
      if (!meta?.gen) { lockState[L] = 'cho'; continue; }
      if (cache?.ver === meta.ver) { delete lockState[L]; continue; }
      lockState[L] = 'tai'; emit();
      try {
        const b = await pullBlob(`content/${L}`, meta);
        await kvSet('lock:' + L, { ver: meta.ver, level: L, packs: b.packs || [], appdata: b.appdata || {} });
        const gap = await kvGet('lockGap:' + L, 0);
        if (gap && !cache) await shiftReviews(b, Date.now() - gap);
        await kvSet('lockGap:' + L, 0);
        delete lockState[L]; changed = true; got.push(L);
      } catch (e) { lockState[L] = 'loi'; console.warn('lock', L, e); }
    }
    if (changed) await Dm.reloadLocked();
    if (changed || JSON.stringify(lockState) !== st0) emit(); // chỉ báo khi có gì đổi (trang Tài khoản không vẽ lại vô cớ)
    return { changed, got };
  })().finally(() => { lockBusy = null; });
  return lockBusy;
}
export const lockPending = () => lockAgain;

// ---------- quản trị ----------
export async function isAdmin() {
  if (!user) return false;
  if (admin == null) { try { admin = !!(await B.get(`admins/${user.uid}`)); } catch { admin = false; } }
  return admin;
}
async function log(uid, L, kind, before, after, note) {
  await B.set(`logs/${rnd(16)}`, {
    uid, L, kind, note: note || '', by: user.uid, at: B.now(),
    before: before ? { start: before.start, days: before.days } : null,
    after: after ? { start: after.start, days: after.days } : null,
  });
}
export const admin_ = {
  users: () => B.list('users', { orderBy: ['lastSeen', 'desc'], limit: 1000 }),
  grants: async () => Object.fromEntries((await B.list('grants')).map(g => [g.id, Object.fromEntries(LOCKED.filter(L => g[L]).map(L => [L, plainGrant(g[L])]))])),
  user: uid => B.get(`users/${uid}`),
  async grant(uid) { const g = (await B.get(`grants/${uid}`)) || {}; return Object.fromEntries(LOCKED.filter(L => g[L]).map(L => [L, plainGrant(g[L])])); },
  // next: null = khoá lại · { start: 'now' | ms | Timestamp, days }
  async setGrant(uid, L, next, note, kind) {
    const doc = await B.get(`grants/${uid}`);
    const before = doc?.[L] || null;
    const val = next ? { start: next.start === 'now' ? B.now() : typeof next.start === 'number' ? B.ts(next.start) : next.start, days: Math.max(0, Math.round(next.days)), by: user.uid, at: B.now(), ...(note ? { note } : before?.note ? { note: before.note } : {}) } : null;
    if (doc) await B.update(`grants/${uid}`, { [L]: val || B.del() });
    else if (val) await B.set(`grants/${uid}`, { [L]: val });
    await log(uid, L, kind, before, val, note);
  },
  async extend(uid, L, add, note) {
    const cur = (await B.get(`grants/${uid}`))?.[L];
    const active = cur && B.ms(cur.start) + cur.days * DAY > Date.now();
    return this.setGrant(uid, L, active ? { start: cur.start, days: cur.days + add } : { start: 'now', days: add }, note, `+${add} ngày`);
  },
  // ms = 0 giờ của ngày SAU ngày cuối cùng được học; tính từ 0 giờ hôm nay để ngày hết hạn đúng ngày đã chọn
  until(uid, L, ms, note) {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return this.setGrant(uid, L, { start: d0.getTime(), days: Math.max(1, Math.round((ms - d0.getTime()) / DAY)) }, note, 'đến ngày');
  },
  forever(uid, L, note) { return this.setGrant(uid, L, { start: 'now', days: FOREVER }, note, 'vĩnh viễn'); },
  lock(uid, L, note) { return this.setGrant(uid, L, null, note, 'khoá'); },
  async setNote(uid, L, note) { await B.update(`grants/${uid}`, { [`${L}.note`]: note }); },
  logs: async (uid) => {
    const rows = uid ? await B.list('logs', { where: [['uid', '==', uid]] }) : await B.list('logs', { orderBy: ['at', 'desc'], limit: 300 });
    return rows.map(r => ({ ...r, at: B.ms(r.at), before: r.before && { start: B.ms(r.before.start), days: r.before.days }, after: r.after && { start: B.ms(r.after.start), days: r.after.days } })).sort((a, b) => (b.at || 0) - (a.at || 0));
  },
  async createCodes(L, days, n, note) {
    const out = [];
    for (let i = 0; i < n; i++) {
      const C = rnd(10);
      await B.set(`codes/${C}`, { level: L, days, note: note || '', by: user.uid, created: B.now(), usedBy: null, usedAt: null, revoked: false });
      out.push(C);
    }
    return out;
  },
  codes: async () => (await B.list('codes', { orderBy: ['created', 'desc'], limit: 500 })).map(c => ({ ...c, created: B.ms(c.created), usedAt: B.ms(c.usedAt) })),
  revoke: C => B.update(`codes/${C}`, { revoked: true }),
  contentMeta: async L => { const m = await B.get(`content/${L}`); return m ? { ...m, t: B.ms(m.t) } : null; },
  // bó nội dung một cấp (tệp N3.json… trong noidung-khoa-vNN.zip) → máy chủ; trùng bản đang có thì bỏ qua
  async uploadContent(b, onPart) {
    const L = b.level;
    if (b.app !== 'tiengnhat' || b.kind !== 'lock' || !LOCKED.includes(L) || !Array.isArray(b.packs)) throw new Error('Tệp không phải bó nội dung khóa của app.');
    const prev = await B.get(`content/${L}`);
    if (prev?.ver === b.ver) return { L, same: true };
    const { z, u8 } = await gz(JSON.stringify({ packs: b.packs, appdata: b.appdata || {} }));
    const gen = rnd(8), n = Math.max(1, Math.ceil(u8.length / CH));
    for (let i = 0; i < n; i++) { await B.set(`content/${L}/c/${gen}-${i}`, { b: B.bytes(u8.subarray(i * CH, (i + 1) * CH)) }); onPart?.(i + 1, n); }
    await B.set(`content/${L}`, { ver: b.ver, gen, n, z, size: u8.length, made: b.made || '', t: B.now(), by: user.uid });
    if (prev?.gen) for (let i = 0; i < prev.n; i++) await B.remove(`content/${L}/c/${prev.gen}-${i}`).catch(() => { });
    return { L, n, size: u8.length };
  },
  // v58: kiểm duyệt hồ sơ công khai
  publicOf: async uid => ({ rank: await B.get(`ranks/${uid}`), ban: !!(await B.get(`bans/${uid}`)) }),
  async resetNick(uid) { await B.update(`users/${uid}`, { nick: '' }); await B.remove(`ranks/${uid}`).catch(() => { }); },
  async resetAvatar(uid) { await B.update(`users/${uid}`, { av: 'p:星' }); if (await B.get(`ranks/${uid}`)) await B.update(`ranks/${uid}`, { av: 'p:星' }); },
  async ban(uid) { await B.set(`bans/${uid}`, { by: user.uid, at: B.now() }); await B.remove(`ranks/${uid}`).catch(() => { }); },
  unban: uid => B.remove(`bans/${uid}`),
  // v59: hộp báo sai chung, thông báo, thống kê
  reports: async () => (await B.list('reports', { orderBy: ['t', 'desc'], limit: 500 })).map(r => ({ ...r, t: B.ms(r.t) })),
  markReport: (id, st) => B.update(`reports/${id}`, { st }),
  notice: () => B.get('settings/notice').then(n => (n ? { ...n, t: B.ms(n.t) } : null)),
  setNotice: text => (text ? B.set('settings/notice', { text, t: B.now(), id: rnd(8) }) : B.remove('settings/notice')),
  settings: () => B.get('settings/public').then(s => s || {}),
  saveSettings: d => B.set('settings/public', d, { merge: true }),
};
