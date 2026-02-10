
const CACHE_NAME = 'cla-vendas-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Tenta cachear arquivos críticos
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Falha ao cachear assets iniciais', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. CRÍTICO: NÃO INTERFERIR COM SUPABASE
  // Ignora qualquer requisição que vá para o domínio do Supabase ou seja uma API externa
  if (url.hostname.includes('supabase') || url.hostname.includes('googleapis') || event.request.method !== 'GET') {
    return; // Deixa o navegador lidar com a rede normalmente
  }

  // 2. Cache First para Arquivos Estáticos (JS, CSS, Imagens, Fontes)
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        });
      })
    );
    return;
  }

  // 3. Network First para Navegação (HTML) com Fallback para Offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html');
      })
    );
  }
});
