// Legacy cleanup worker.
//
// Farming420 updates no longer depend on a manually bumped service-worker cache
// version. Deployments are identified by the Git commit in deploy-version.json,
// and src/update-manager.js retires stale workers/caches from the page as well.
//
// Keep this worker available so browsers that still have the old cache-first
// worker registered can replace it once, delete its caches, and unregister.
self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('farming420-')).map(key => caches.delete(key)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.map(client => client.navigate(client.url).catch(() => null)));
  })());
});

// Intentionally no fetch handler. A service worker must not pin application
// files to a manually maintained cache generation again.
