const STATIC_CACHE = "jakalburg-admin-static-v1";
const CACHE_PREFIX = "jakalburg-admin-";
const LEGACY_CACHE_PREFIX = "kay-admin-";
const OFFLINE_URL = "/offline.html";
const SAFE_PRECACHE_URLS = [
  OFFLINE_URL,
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(SAFE_PRECACHE_URLS))
      .catch((error) => {
        console.error("Jakalburg Admin service worker install failed:", error);
      }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(
              (cacheName) =>
                (cacheName.startsWith(CACHE_PREFIX) ||
                  cacheName.startsWith(LEGACY_CACHE_PREFIX)) &&
                cacheName !== STATIC_CACHE,
            )
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        const offlineResponse = await cache.match(OFFLINE_URL);
        return (
          offlineResponse ||
          new Response("Jakalburg Admin is offline.", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          })
        );
      }),
    );
    return;
  }

  if (!SAFE_PRECACHE_URLS.includes(url.pathname)) {
    return;
  }

  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const cached = await cache.match(url.pathname);
      if (cached) {
        return cached;
      }

      return fetch(request);
    }),
  );
});
