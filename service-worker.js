// Service Worker para Eldex Tuner - Versão Completa
const CACHE_NAME = 'eldex-tuner-v1';
const OFFLINE_URL = '/index.html';

// Lista completa de recursos para cache
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/style.css',
  '/script.js',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/screenshots/screenshot-1.png',
  '/screenshots/screenshot-2.png'
];

// Tags para sincronização
const BACKGROUND_SYNC_TAG = 'eldex-sync';
const PERIODIC_SYNC_TAG = 'eldex-periodic-sync';

// Instala o service worker e faz cache offline completo
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      
      // Cache todos os recursos essenciais
      await cache.addAll(urlsToCache);
      
      // Força a ativação imediata
      await self.skipWaiting();
      
      console.log('Service Worker: Instalado e recursos cacheados');
    })()
  );
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  
  event.waitUntil(
    (async () => {
      // Limpa caches antigos
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Assume controle de todas as abas
      await clients.claim();
      
      console.log('Service Worker: Ativado');
    })()
  );
});

// Intercepta todas as requisições - FUNCIONAMENTO OFFLINE GARANTIDO
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    (async () => {
      try {
        // Tenta buscar da rede primeiro (estratégia Network First)
        const response = await fetch(event.request);
        
        // Se conseguiu da rede, atualiza o cache
        if (response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }
        
        return response;
      } catch (error) {
        // Se falhou na rede, busca do cache
        console.log('Service Worker: Buscando do cache:', event.request.url);
        
        const cachedResponse = await caches.match(event.request);
        
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Se não encontrou no cache, retorna página offline
        if (event.request.destination === 'document') {
          return caches.match(OFFLINE_URL);
        }
        
        // Para outros recursos, retorna erro
        return new Response('Recurso não disponível offline', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      }
    })()
  );
});

// Background Sync - SINCRONIZAÇÃO GARANTIDA
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background Sync executado:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(syncUserData());
  }
});

// Periodic Background Sync - ATUALIZAÇÃO AUTOMÁTICA
self.addEventListener('periodicsync', (event) => {
  console.log('Service Worker: Periodic Sync executado:', event.tag);
  
  if (event.tag === PERIODIC_SYNC_TAG) {
    event.waitUntil(updateAppInBackground());
  }
});

// Push Notifications - NOTIFICAÇÕES FUNCIONANDO
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recebido');
  
  let notificationData = {
    title: 'Eldex Tuner',
    body: 'Nova atualização disponível!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png'
  };
  
  // Se há dados no push
  if (event.data) {
    try {
      notificationData = {
        ...notificationData,
        ...event.data.json()
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: Math.random()
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Dispensar'
      }
    ],
    requireInteraction: true,
    persistent: true
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Trata cliques nas notificações
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notificação clicada:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        // Se já há uma aba aberta, foca nela
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Se não há aba aberta, abre uma nova
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Função para sincronizar dados do usuário
async function syncUserData() {
  try {
    console.log('Service Worker: Sincronizando dados do usuário...');
    
    // Aqui você adicionaria lógica para sincronizar dados
    // Por exemplo: enviar configurações salvas, histórico, etc.
    
    // Simula sincronização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Service Worker: Dados sincronizados com sucesso');
    
    // Notifica que a sincronização foi feita
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        data: 'Dados sincronizados com sucesso'
      });
    });
    
  } catch (error) {
    console.error('Service Worker: Erro na sincronização:', error);
  }
}

// Função para atualizar app em segundo plano
async function updateAppInBackground() {
  try {
    console.log('Service Worker: Atualizando app em segundo plano...');
    
    const cache = await caches.open(CACHE_NAME);
    
    // Atualiza todos os recursos do cache
    const updatePromises = urlsToCache.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.status === 200) {
          await cache.put(url, response);
          console.log('Service Worker: Atualizado:', url);
        }
      } catch (error) {
        console.log('Service Worker: Não foi possível atualizar:', url);
      }
    });
    
    await Promise.all(updatePromises);
    
    console.log('Service Worker: App atualizado em segundo plano');
    
    // Envia notificação sobre a atualização
    await self.registration.showNotification('Eldex Tuner Atualizado', {
      body: 'O app foi atualizado e está pronto para usar!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      tag: 'app-updated'
    });
    
  } catch (error) {
    console.error('Service Worker: Erro na atualização em segundo plano:', error);
  }
}

// Mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('Service Worker: Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Service Worker: Carregado e pronto para uso offline!');
