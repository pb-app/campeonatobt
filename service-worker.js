// service-worker.js
const CACHE_NAME = 'ranking-bt-v4.0.4'; // Mudei a versão para forçar a atualização

// Arquivos principais do app (App Shell)
const APP_SHELL_URLS = [
  'teste.html',
  'manifest.json', // Corrigido (era manifest.webmanifest)
  'icon-192.png',
  'icon-512.png'
];

// URLs de CDNs que seu app usa
const CDN_URLS = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js',
  'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js'
];

// 1. Instalação: Salva tudo em cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pré-cache do App Shell e CDNs');

      // Cacheia o App Shell
      const appShellPromise = cache.addAll(APP_SHELL_URLS);

      // Cacheia as CDNs
      cache.addAll(CDN_URLS).catch(err => console.warn("[Service Worker] Falha ao cachear CDNs:", err));

      return appShellPromise;
    })
  );
});

// 2. Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Limpando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// 3. Fetch (Estratégia: Cache-First)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('firestore.googleapis.com')) {
    return event.respondWith(fetch(event.request));
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response;
      }
      return fetch(event.request).then((networkResponse) => {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          if (event.request.method === 'GET' && networkResponse.status === 200) {
             cache.put(event.request, responseToCache);
          }
        });
        return networkResponse;
      });
    })
  );
});
