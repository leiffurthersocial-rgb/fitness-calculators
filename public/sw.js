// Self-destroying service worker.
//
// A previous version cached the app shell; after the move to real per-tool
// routes that cache could serve stale HTML pointing at JS chunks that no
// longer exist, breaking navigation on click. This version takes over, purges
// every cache, unregisters itself, and reloads open tabs so everyone gets the
// live site. (No offline caching for now — correctness first.)
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) client.navigate(client.url);
      } catch {
        /* best effort */
      }
    })()
  );
});

// Pass every request straight through to the network (no interception).
self.addEventListener("fetch", () => {});
