// Çevrimdışı çalışma: önce ağ denenir (güncel sürüm gelsin), ağ yoksa önbellekteki kopya kullanılır.
const ONBELLEK = 'planlayici-v1';
const KABUK = ['./', './index.html', './css/app.css', './js/app.js', './js/db.js',
  './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(ONBELLEK).then((c) => c.addAll(KABUK)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((adlar) => Promise.all(adlar.filter((a) => a !== ONBELLEK).map((a) => caches.delete(a))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const istek = e.request;
  if (istek.method !== 'GET' || new URL(istek.url).origin !== location.origin) return;
  e.respondWith(
    fetch(istek).then((yanit) => {
      if (yanit.ok) {
        const kopya = yanit.clone();
        caches.open(ONBELLEK).then((c) => c.put(istek, kopya));
      }
      return yanit;
    }).catch(() => caches.match(istek, { ignoreSearch: true }).then((y) => y || caches.match('./index.html')))
  );
});
