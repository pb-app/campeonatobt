// service-worker.js

// ATENÇÃO: Mude a versão do cache (ex: v5.0.9) sempre que fizer deploy de novos arquivos
const CACHE_NAME = 'ranking-bt-v5.2.9';

// Arquivos principais do app (App Shell)
// ADICIONEI 'index.html' e atualizei para 'teste2.html' (que você usa)
const APP_SHELL_URLS = [
  'index.html',   // Seu arquivo de produção
  'teste2.html',  // Seu arquivo de teste
  'manifest.json',
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

      // Cacheia as CDNs (sem bloquear a instalação se falhar)
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
    }).then(() => {
        // Força o novo Service Worker a assumir o controle imediatamente
        console.log('[Service Worker] Novo SW ativado e assumindo controle.');
        return self.clients.claim();
    })
  );
});

// 3. Fetch (ESTRATÉGIA CORRIGIDA: Híbrida)
self.addEventListener('fetch', (event) => {
    // Ignora o Firebase (correto, sempre vai para a rede)
    if (event.request.url.includes('firestore.googleapis.com')) {
        return event.respondWith(fetch(event.request));
    }

    // --- LÓGICA CORRIGIDA ---
    
    // Verifica se a requisição é para um documento HTML (navegação)
    // (ex: index.html ou teste2.html)
    if (event.request.mode === 'navigate') {
        // EstratégIA: Network-First (Rede Primeiro)
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Se conseguiu buscar na rede, salva o novo no cache e retorna
                    return caches.open(CACHE_NAME).then((cache) => {
                        console.log('[Service Worker] Salvando HTML novo no cache:', event.request.url);
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                })
                .catch(() => {
                    // Se falhou (offline), pega a versão antiga do cache
                    console.log('[Service Worker] Rede falhou, servindo HTML do cache:', event.request.url);
                    // Garante que temos um fallback para o index.html principal se a URL exata falhar
                    return caches.match(event.request) || caches.match('index.html'); 
                })
        );
    } else {
        // Estratégia: Cache-First (Cache Primeiro)
        // Para todo o resto (CDNs, imagens, manifest.json, etc.)
        event.respondWith(
            caches.match(event.request).then((response) => {
                if (response) {
                    return response; // Encontrou no cache, retorna
                }

                // Não encontrou no cache, busca na rede
                return fetch(event.request).then((networkResponse) => {
                    // Salva a resposta nova no cache para a próxima vez
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
    }
});
