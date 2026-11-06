// CACHE_NAME, ASSETS, audio storage helpers and rangeResponse are injected by scripts/build-sw.js.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(
        ASSETS.map((url) => new Request(url, { cache: "reload" })),
      );
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith("vienna-tour-") && key !== CACHE_NAME)
          await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});
self.addEventListener("message", (event) => {
  if (event.data?.type !== "CHECK_OFFLINE") return;
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        const present = await Promise.all(
          ASSETS.map(async (url) => (await cache.match(url))?.status === 200),
        );
        event.ports[0]?.postMessage({ ready: present.every(Boolean) });
      } catch {
        event.ports[0]?.postMessage({ ready: false });
      }
    })(),
  );
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (
    request.method !== "GET" ||
    (new URL(request.url).origin !== self.location.origin && !isRemoteAudioUrl(request.url))
  )
    return;
  event.respondWith(
    (async () => {
      if (request.headers.get("X-Vienna-Refresh") === "1")
        return fetch(request);
      const cache = await caches.open(CACHE_NAME);
      const routeCache = await caches.open("vienna-poi-downloads-v1");
      const cached =
        (await cache.match(request, {
          ignoreSearch: request.mode === "navigate",
          ignoreVary: true,
        })) || (await routeCache.match(request, { ignoreVary: true }));
      if (cached) {
        const range = request.headers.get("Range");
        return range ? rangeResponse(cached, range) : cached;
      }
      try {
        return await fetch(request);
      } catch {
        if (request.mode === "navigate")
          return (await cache.match("/index.html")) || Response.error();
        return Response.error();
      }
    })(),
  );
});
