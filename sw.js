// Funcționare fără internet: fișierele aplicației sunt păstrate în cache.
const CACHE = 'riffbook-v23';
const CORE = [
  './', 'index.html', 'css/app.css?v=22', 'manifest.webmanifest', 'config.js', 'js/riffbook.js',
  'lib/alphatab/alphaTab.min.js', 'lib/alphatab/font/Bravura.woff2', 'lib/alphatab/font/Bravura.woff', 'lib/alphatab/font/Bravura.otf',
  'lib/alphatab/soundfont/sonivox.sf2', 'icons/icon.svg', 'icons/icon-32.png', 'icons/icon-192.png', 'icons/icon-512.png',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE && !k.startsWith('riffbook-sounds')).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Google Drive merge direct
  // sunetele mari au cache-ul lor (vezi src/sounds.js); sync.php nu se pune în cache
  if (/\.sfp$|lib\/sounds\/|sync\.php/.test(url.pathname)) return;
  // rețea întâi (ca să vină actualizările), cache dacă nu e internet
  e.respondWith(
    // pagina se cere mereu de la server (no-cache), ca să nu rămână o versiune veche
    (e.request.mode === 'navigate' ? fetch(e.request.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(e.request)).then((r) => {
      if (r.ok) { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); }
      return r;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((r) => r || caches.match('index.html')))
  );
});
