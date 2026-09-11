const CACHE = "reelworld-go-v5";
const CORE = [
  "/apps/reelworld-go",
  "/manifest.webmanifest",
  "/reelworld-go/icon.svg",
  "/reelworld-go/fish-atlas.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("reelworld-go-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) ||
            (await caches.match("/apps/reelworld-go")) ||
            new Response("ReelWorld GO is offline. Reconnect once to refresh the game.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            });
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/reelworld-go/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy));
        return response;
      })),
    );
  }
});
