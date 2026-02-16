// Service Worker complet pour Horloge Bahá'í - HORS LIGNE 100%
const CACHE_NAME = 'bahai-clock-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192x192-v2.png',
  '/icons/icon-512x512-v2.png',
  '/icons/apple-touch-icon.png',
  '/icons/apple-touch-icon-167x167.png',
  '/icons/apple-touch-icon-152x152.png',
  '/icons/apple-touch-icon-120x120.png'
];

// INSTALLATION : Mise en cache des ressources critiques
self.addEventListener('install', event => {
  console.log('Service Worker installé - Mise en cache des ressources');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Mise en cache des URLs:', urlsToCache);
        return cache.addAll(urlsToCache)
          .catch(err => {
            console.error('Erreur cache:', err);
            // En cas d'erreur sur une URL, continuer avec les autres
            return Promise.all(
              urlsToCache.map(url => 
                fetch(url).then(response => {
                  if (response.ok) return cache.put(url, response);
                }).catch(() => {})
              )
            );
          });
      })
  );
  self.skipWaiting();
});

// ACTIVATION : Nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('Service Worker activé');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('Suppression ancien cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim();
});

// INTERCEPTION DES REQUÊTES : Mode hors ligne intelligent
self.addEventListener('fetch', event => {
  // Ne PAS mettre en cache les APIs externes (géolocalisation)
  if (event.request.url.includes('api.sunrise-sunset.org') || 
      event.request.url.includes('nominatim.openstreetmap.org') ||
      event.request.url.includes('openstreetmap.org')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. Si en cache → retourner immédiatement (HORS LIGNE)
        if (response) {
          console.log('CACHE HIT:', event.request.url);
          return response;
        }

        // 2. Sinon → essayer le réseau
        return fetch(event.request)
          .then(response => {
            // Vérifier réponse valide
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // 3. Mettre en cache une copie pour le hors ligne futur
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('CACHE MIS À JOUR:', event.request.url);
              });

            return response;
          })
          .catch(() => {
            // 4. En cas d'erreur réseau → retourner index.html (HORS LIGNE)
            if (event.request.mode === 'navigate') {
              console.log('MODE HORS LIGNE - Chargement depuis cache');
              return caches.match('/index.html');
            }
          });
      })
  );
});
