const VERSION = 'farming420-0.22.1';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/icon.svg',
  './src/app.js',
  './src/navigation-dedupe.js',
  './src/data.js',
  './src/runtime-data-patches.js',
  './src/styles.css',
  './src/enhancements.js',
  './src/enhancements.css',
  './src/enchant-presentation.js',
  './src/tooltip-scanner.js',
  './src/tool-scan-apply.js',
  './src/tool-scanner-ui.js',
  './src/ux-simplify.js',
  './src/ux-simplify.css',
  './src/config.js',
  './src/progression.js',
  './src/setups.js',
  './src/exclusivity.js',
  './src/pet-strategy.js',
  './src/resource-pack.js',
  './src/item-assets.js',
  './src/item-art-ui.js',
  './src/item-art-ui.css',
  './src/item-editor.js',
  './src/skull-art.js',
  './src/item-editor.css',
  './src/item-catalog.js',
  './src/armor-fortune.js',
  './src/equipment-fortune.js',
  './src/snapshot-apply.js',
  './src/help-locations.js',
  './src/scopes.js',
  './src/live-sync.js',
  './src/hypixel-client.js',
  './src/credentials.js',
  './src/migrations.js',
  './src/backup.js',
  './src/hypixel-import.js',
  './src/nbt.js',
  './src/item-normalizer.js',
  './src/profile-items.js',
  './src/profile-normalizer.js',
  './src/profile-sync.js',
  './src/foundation.js',
  './src/foundation.css',
  './research/equipment-fortune.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => Promise.all(APP_FILES.map(path =>
        fetch(new Request(path, { cache: 'reload' })).then(response => {
          if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
          return cache.put(path, response);
        })
      )))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'version' && event.ports?.[0]) event.ports[0].postMessage(VERSION);
  if (event.data === 'activate-now') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/sw.js')) return;

  event.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(event.request);
      const network = fetch(event.request)
        .then(response => {
          if (response?.ok && response.type === 'basic') cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => null);
      return cached || await network || cache.match('./index.html');
    })
  );
});
