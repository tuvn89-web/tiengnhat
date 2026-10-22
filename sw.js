// Service worker: chạy offline.
// Sửa bất kỳ file nào của app (html/css/js) thì TĂNG số phiên bản dưới đây để máy tải bản mới.
const VERSION = 'tnt-v55';
const DATA = 'tnt-data';
const FONTS = 'tnt-fonts'; // v32: phông chữ tải từ Google Fonts — giữ lại để dùng khi không có mạng (không xoá khi đổi phiên bản)
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/util.js', 'js/db.js', 'js/settings.js', 'js/tts.js', 'js/data.js', 'js/srs.js', 'js/sync.js',
  'js/vendor/qrcode.js', 'js/lazy.js', 'js/fxcore.js', 'js/fxworker.js', 'js/bare.js', 'js/jlpt.js', 'js/ui.js', 'js/wordx.js', 'js/adj.js', 'js/counters.js', 'js/learn.js', 'js/practice.js', 'js/drill.js', 'js/kanji.js', 'js/conj.js', 'js/gdrill.js', 'js/quiz.js', 'js/match.js', 'js/grammar.js', 'js/words.js', 'js/datapage.js', 'js/settingspage.js', 'js/nav.js',
  'js/level.js', 'js/kana.js', 'js/roadmap.js', 'js/guides.js', 'js/romaji.js', 'js/forms.js', 'js/fstat.js', 'js/dich.js', 'js/notes.js', 'js/heart.js', 'js/lesson.js', 'js/reader.js', 'js/explain.js', 'js/leech.js', 'js/dot6.js', 'js/season.js', 'js/backfab.js', 'js/fonts.js', 'js/pairs8.js', 'js/marks.js', 'js/relearn.js', 'js/hvbay.js', 'js/gocau.js', 'js/docfit.js', 'js/dot7.js', 'js/amon.js', 'js/gnhom.js', 'js/giayto.js', 'js/dot8.js', 'data/docwords.json', 'data/hvbay.json', 'data/gnhom.json', 'data/giayto.json', 'data/truongam.json', 'data/viverb.json', 'data/kougo.json',
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
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return e.respondWith(fontFirst(req));
  if (url.origin !== location.origin) return; // GitHub API đi thẳng, không qua cache
  if (url.pathname.endsWith('/data/manifest.json')) return e.respondWith(networkFirst(req));
  if (url.pathname.includes('/data/packs/')) return e.respondWith(cacheFirst(req, DATA, false, true));
  if (req.mode === 'navigate') return e.respondWith(caches.match('index.html').then(r => r || fetch(req)));
  e.respondWith(cacheFirst(req, VERSION, true));
});

// Phông chữ: có trong bộ nhớ thì dùng luôn; chưa có thì tải và giữ lại
async function fontFirst(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch { return Response.error(); }
}
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
// Gói dữ liệu: bản mới (địa chỉ có ?v=…) tải về xong thì xoá các bản cũ của cùng file khỏi bộ nhớ.
async function cacheFirst(req, name, ignoreSearch, dropOld = false) {
  const cache = await caches.open(name);
  const hit = await cache.match(req, { ignoreSearch });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    if (dropOld) {
      const u = new URL(req.url);
      for (const k of await cache.keys()) { const x = new URL(k.url); if (x.pathname === u.pathname && x.search !== u.search) cache.delete(k); }
    }
  }
  return res;
}
