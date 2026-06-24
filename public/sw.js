/* Flick PWA service worker.
   Caches: app shell, manifest, icons, Google fonts.
   Strategy:
   - Pre-cache the manifest and core icons at install.
   - Cache-first for static assets (long-lived, hash-stable).
   - Network-first with cache fallback for navigations.
   - Network-first for /rest/ and Supabase calls (always fresh data).
*/
const VERSION = "flick-v1";
const CORE = ["/", "/manifest.webmanifest", "/favicon.ico", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CORE).catch(() => undefined)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Always-fresh: Supabase API, realtime, Google OAuth
  if (
    url.host.endsWith("supabase.co") ||
    url.host === "accounts.google.com" ||
    url.host === "fonts.googleapis.com" ||
    url.host === "fonts.gstatic.com"
  ) {
    return; // let the browser do its thing
  }

  // Same-origin static assets: cache-first
  if (url.origin === self.location.origin) {
    if (
      url.pathname.startsWith("/assets/") ||
      /\.(png|jpg|jpeg|svg|ico|webp|woff2?)$/.test(url.pathname)
    ) {
      event.respondWith(
        caches.open(VERSION).then(async (cache) => {
          const cached = await cache.match(req);
          if (cached) return cached;
          try {
            const res = await fetch(req);
            if (res.ok) cache.put(req, res.clone());
            return res;
          } catch {
            return cached || new Response("", { status: 504 });
          }
        }),
      );
      return;
    }
  }

  // Navigations: network-first, cache fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(VERSION)
            .then((cache) => cache.put(req, copy))
            .catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/"))),
    );
  }
});
