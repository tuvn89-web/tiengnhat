// v56: lớp nối với Firebase thật (đăng nhập Google + Firestore lite). cloud.js chỉ gọi qua lớp này,
// nên khi kiểm thử có thể thay bằng máy chủ giả có cùng hình dạng.
import * as F from './vendor/firebase.js';

const toRef = (db, path) => F.doc(db, ...String(path).split('/'));
const toCol = (db, path) => F.collection(db, ...String(path).split('/'));
const fromSnap = s => (s.exists() ? s.data() : null);
const userOf = u => (u ? { uid: u.uid, name: u.displayName || '', email: u.email || '', photo: u.photoURL || '' } : null);
const errMsg = e => {
  const c = e?.code || '';
  if (/popup-closed|cancelled-popup|user-cancelled/.test(c)) return 'Đã đóng cửa sổ đăng nhập.';
  if (/popup-blocked/.test(c)) return 'Máy đang chặn cửa sổ bật lên. Cho phép cửa sổ bật lên rồi bấm lại.';
  if (/unauthorized-domain/.test(c)) return 'Trang app chưa được thêm vào "Authorized domains" của Firebase.';
  if (/network|unavailable/.test(c)) return 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.';
  if (/permission-denied/.test(c)) return 'Máy chủ từ chối (không đủ quyền).';
  if (/requires-recent-login/.test(c)) return 'Cần đăng nhập lại để làm việc này.';
  return e?.message || 'Lỗi không rõ.';
};

export function makeBackend(cfg) {
  const app = F.initializeApp(cfg);
  const auth = F.initializeAuth(app, { persistence: [F.indexedDBLocalPersistence, F.browserLocalPersistence], popupRedirectResolver: F.browserPopupRedirectResolver });
  const db = F.getFirestore(app);
  const provider = () => { const p = new F.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' }); return p; };
  const wrap = f => async (...a) => { try { return await f(...a); } catch (e) { const x = new Error(errMsg(e)); x.code = e?.code; throw x; } };
  const mkQuery = (path, o = {}) => {
    const parts = [];
    for (const w of o.where || []) parts.push(F.where(...w));
    if (o.orderBy) parts.push(F.orderBy(...o.orderBy));
    if (o.limit) parts.push(F.limit(o.limit));
    return F.query(toCol(db, path), ...parts);
  };
  const tx = (t) => ({
    get: async p => fromSnap(await t.get(toRef(db, p))),
    set: (p, d, o) => t.set(toRef(db, p), d, o || {}),
    update: (p, d) => t.update(toRef(db, p), d),
    remove: p => t.delete(toRef(db, p)),
  });
  return {
    kind: 'firebase',
    now: () => F.serverTimestamp(),
    del: () => F.deleteField(),
    ts: ms => F.Timestamp.fromMillis(ms),
    ms: v => (v == null ? null : typeof v === 'number' ? v : v.toMillis ? v.toMillis() : null),
    bytes: u8 => F.Bytes.fromUint8Array(u8),
    unbytes: b => (b?.toUint8Array ? b.toUint8Array() : new Uint8Array()),
    onUser: cb => F.onAuthStateChanged(auth, u => cb(userOf(u))),
    signIn: wrap(async () => userOf((await F.signInWithPopup(auth, provider())).user)),
    signOut: wrap(() => F.signOut(auth)),
    deleteMe: wrap(async () => {
      try { await F.deleteUser(auth.currentUser); }
      catch (e) {
        if (!/requires-recent-login/.test(e?.code || '')) throw e;
        await F.reauthenticateWithPopup(auth.currentUser, provider());
        await F.deleteUser(auth.currentUser);
      }
    }),
    get: wrap(async p => fromSnap(await F.getDoc(toRef(db, p)))),
    set: wrap((p, d, o) => F.setDoc(toRef(db, p), d, o || {})),
    update: wrap((p, d) => F.updateDoc(toRef(db, p), d)),
    remove: wrap(p => F.deleteDoc(toRef(db, p))),
    list: wrap(async (path, o) => (await F.getDocs(mkQuery(path, o))).docs.map(s => ({ id: s.id, ...s.data() }))),
    count: wrap(async (path, o) => (await F.getCount(mkQuery(path, o))).data().count),
    tx: wrap(fn => F.runTransaction(db, t => fn(tx(t)))),
    batch: wrap(async ops => {
      for (let i = 0; i < ops.length; i += 400) {
        const b = F.writeBatch(db);
        for (const [op, p, d, o] of ops.slice(i, i + 400)) {
          if (op === 'set') b.set(toRef(db, p), d, o || {});
          else if (op === 'update') b.update(toRef(db, p), d);
          else if (op === 'remove') b.delete(toRef(db, p));
        }
        await b.commit();
      }
    }),
  };
}
