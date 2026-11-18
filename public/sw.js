/* နွယ်ငြိမ်းတောင်ပေါ်ကျောင်းတိုက် — service worker
 *
 * Strategy
 *  - Navigations: network-first, cached page as fallback, then /offline.
 *  - Static assets (/_next/static, icons, fonts): cache-first + background fill.
 *  - API, admin routes and the image optimizer are never touched, so admin
 *    data and Drive media always stay fresh.
 */
const VERSION = "v2";
const PAGE_CACHE = `nnh-pages-${VERSION}`;
const ASSET_CACHE = `nnh-assets-${VERSION}`;

const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([PAGE_CACHE, ASSET_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isCacheableAsset(url) {
  if (url.pathname.startsWith("/_next/static/")) return true;
  if (url.pathname.startsWith("/icons/")) return true;
  return /\.(?:css|js|woff2?|ttf|otf|png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname);
}

async function cachePut(cacheName, request, response) {
  if (!response || !response.ok || response.type === "opaque") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) await cachePut(PAGE_CACHE, request, response);
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/offline")) || Response.error();
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    await cachePut(ASSET_CACHE, request, response);
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Leave admin, auth, APIs and the image optimizer alone.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/_next/webpack-hmr")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableAsset(url)) {
    event.respondWith(cacheFirstAsset(request));
  }
});
