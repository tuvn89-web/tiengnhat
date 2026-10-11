// Service worker: chạy offline.
// Sửa bất kỳ file nào của app (html/css/js) thì TĂNG số phiên bản dưới đây để máy tải bản mới.
const VERSION = 'tnt-v2';
const DATA = 'tnt-data';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/util.js', 'js/db.js', 'js/settings.js', 'js/tts.js', 'js/data.js', 'js/srs.js', 'js/sync.js',
  'js/ui.js', 'js/quiz.js', 'js/match.js', 'js/grammar.js', 'js/words.js', 'js/datapage.js', 'js/settingspage.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' = tải thẳng từ mạng, bỏ qua bộ nhớ đệm của trình duyệt (tránh cài bản mới mà lại lấy file cũ)
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))));
  self.skipWaiting(); // bản mới dùng ngay, không phải chờ đóng hết app
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('tnt-v') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // GitHub API đi thẳng, không qua cache
  if (url.pathname.endsWith('/data/manifest.json')) return e.respondWith(networkFirst(req));
  if (url.pathname.includes('/data/packs/')) return e.respondWith(cacheFirst(req, DATA, false));
  if (req.mode === 'navigate') return e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
  e.respondWith(cacheFirst(req, VERSION, true));
});

async function networkFirst(req) {
  const cache = await caches.open(DATA);
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(req, { signal: ctrl.signal, cache: 'no-cache' });
    clearTimeout(t);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || new Response('{"schema":1,"packs":[]}', { headers: { 'Content-Type': 'application/json' } });
  }
}
// Gói dữ liệu có ?v=<version> trong địa chỉ → đổi version là tải bản mới.
async function cacheFirst(req, name, ignoreSearch) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}
