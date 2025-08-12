// Nome do cache
const CACHE_NAME = 'meu-app-cache-v1';

// Arquivos para cache (adicione seus arquivos aqui)
const FILES_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js'
];

// Instala o Service Worker
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Cache criado');
        return cache.addAll(FILES_TO_CACHE);
      })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativado');
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Intercepta requisições e responde do cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});
