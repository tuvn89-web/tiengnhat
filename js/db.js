// IndexedDB: kv (cài đặt, cấu hình), progress (tiến độ), user (từ tự thêm/sửa), imported (gói nhập tay)
const NAME = 'tiengnhat', VER = 1;
let dbp;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(NAME, VER);
    r.onupgradeneeded = () => {
      const d = r.result;
      if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv');
      for (const s of ['progress', 'user', 'imported'])
        if (!d.objectStoreNames.contains(s)) d.createObjectStore(s, { keyPath: 'id' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const done = t => new Promise((res, rej) => { t.oncomplete = () => res(); t.onerror = t.onabort = () => rej(t.error); });

export async function get(store, key) { const d = await open(); return req(d.transaction(store).objectStore(store).get(key)); }
export async function all(store) { const d = await open(); return req(d.transaction(store).objectStore(store).getAll()); }
export async function put(store, val, key) {
  const d = await open(); const t = d.transaction(store, 'readwrite');
  key === undefined ? t.objectStore(store).put(val) : t.objectStore(store).put(val, key);
  return done(t);
}
export async function putMany(store, vals) {
  const d = await open(); const t = d.transaction(store, 'readwrite'); const os = t.objectStore(store);
  for (const v of vals) os.put(v);
  return done(t);
}
export async function del(store, key) { const d = await open(); const t = d.transaction(store, 'readwrite'); t.objectStore(store).delete(key); return done(t); }
export async function clear(store) { const d = await open(); const t = d.transaction(store, 'readwrite'); t.objectStore(store).clear(); return done(t); }

export const kvGet = async (k, def) => { const v = await get('kv', k); return v === undefined ? def : v; };
export const kvSet = (k, v) => put('kv', v, k);
