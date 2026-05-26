const CACHE_NAME = 'doruk-v2';
const ASSETS = [
  '/Doruk/',
  '/Doruk/index.html',
  '/Doruk/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap',
  'https://unpkg.com/lucide@latest'
];

// Kurulum: tüm dosyaları önbelleğe al
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: önce cache, yoksa network, o da yoksa cache'den sun
self.addEventListener('fetch', event => {
  // Binance/API isteklerini SW'ye sokma — her zaman canlı gitsin
  const url = event.request.url;
  if (
    url.includes('api.binance.com') ||
    url.includes('api.genelpara.com') ||
    url.includes('api.earthquake') ||
    url.includes('kandilli') ||
    url.includes('google.com/favicon')
  ) {
    return; // tarayıcının normal davranışına bırak
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          // Başarılı yanıtı cache'e ekle
          if (response && response.status === 200 && response.type !== 'opaque') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Network de başarısız — cache'den tekrar dene
          return caches.match(event.request);
        });
    })
  );
});
