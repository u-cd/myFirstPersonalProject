// This is a basic service worker for offline support
self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request).catch(() => {
                // Optionally, return a fallback page or just nothing
                return new Response('Offline or resource not found', { status: 503, statusText: 'Service Unavailable' });
            });
        })
    );
});
