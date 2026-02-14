const CACHE_NAME = 'bahai-clock-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', event => {
  console.log('Service Worker: Installation...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Mise en cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker: Activation...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Forcer une nouvelle détection si coordonnées > 24h anciennes
function shouldForceGeolocation() {
  const lastCheck = localStorage.getItem('lastGeolocationCheck');
  if (!lastCheck) return true;
  
  const hoursSinceLastCheck = (Date.now() - parseInt(lastCheck)) / 3600000;
  return hoursSinceLastCheck > 24;
}

// Dans updateLocationAndSunTimes() :
async function updateLocationAndSunTimes() {
  const t = translations[currentLang];
  
  // Forcer la géolocalisation si nécessaire
  if (shouldForceGeolocation()) {
    localStorage.removeItem('lastLocation');
  }
  
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        // Sauvegarder timestamp
        localStorage.setItem('lastGeolocationCheck', Date.now().toString());
        
        const locationText = await reverseGeocode(lat, lon, currentLang);
        document.getElementById('location').textContent = `📍 ${locationText}`;
        fetchSunTimes(lat, lon);
      },
      // ... reste du code
    );
  }
}
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then(response => {
            if (event.request.method === 'GET' && response.status === 200) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseClone);
                });
            }
            return response;
          })
          .catch(err => {
            console.error('Service Worker: Erreur', err);
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
          });
      })
  );
});
