// Nome do cache (mude se fizer grandes atualizações)
const CACHE_NAME = "ranking-bt-v1";

// Lista de arquivos que serão armazenados em cache
const FILES_TO_CACHE = [
  "/",
  "/index.html",
  "/instalar.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

// Instalação — adiciona arquivos ao cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting(); // força ativação imediata
});

// Ativação — limpa caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // ativa o SW sem precisar recarregar
});

// Intercepta requisições — usa cache se offline
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna o cache se existir, senão busca da internet
      return response || fetch(event.request);
    })
  );
});
