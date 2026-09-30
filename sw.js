const CACHE_NAME = 'doruk-v2';

const APP_PATH = '/Doruk/';

const STATIC_ASSETS = [
  `${APP_PATH}`,
  `${APP_PATH}index.html`,
  `${APP_PATH}manifest.json`,
  `${APP_PATH}icon-192.png`,
  `${APP_PATH}icon-512.png`,
  `${APP_PATH}apple-touch-icon.png`
];

// Service Worker kurulumu
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(() => {})
  );

  // Yeni Service Worker hemen aktif olsun
  self.skipWaiting();
});

// Eski cache'leri temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('doruk-') && key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Dosya istekleri
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // API istekleri her zaman canlı çalışsın
  const isLiveApi =
    url.hostname.includes('binance.com') ||
    url.hostname.includes('genelpara.com') ||
    url.hostname.includes('truncgil.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('earthquake') ||
    url.hostname.includes('kandilli');

  if (isLiveApi) {
    return;
  }

  // Sadece GET isteklerini ele al
  if (request.method !== 'GET') {
    return;
  }

  const isAppFile =
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'manifest';

  // index.html ve JS/CSS için önce yeni dosyayı GitHub'dan al
  if (isAppFile) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );

    return;
  }

  // Resim ve ikonlarda cache kullanılabilir
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();

            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, copy);
            });
          }

          return response;
        })
        .catch(() => caches.match(request));
    })
  );
});
