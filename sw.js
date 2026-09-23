/* Cosmic Reader service worker.
 *
 * Design rule: this file must never be able to break sign-in.
 * Supabase auth is entirely network + localStorage. A service worker cannot
 * touch localStorage, and everything auth-related is passed straight through
 * to the network below without ever calling respondWith().
 *
 * Passed through untouched (the SW does not handle them at all):
 *   - any non-GET request
 *   - any cross-origin request  (supabase.co, wsrv.nl, publisher feeds)
 *   - /api/*                    (the nine serverless functions, all dynamic)
 *   - any URL carrying auth params (?code=, access_token, reset, openauth, error)
 *
 * Navigations are network-first, so an OAuth redirect always hits the live page
 * and a fresh deploy lands immediately. The cache is only ever a fallback for
 * being offline.
 *
 * Kill switch: unregister this worker (DevTools > Application > Service Workers,
 * or navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.unregister())))
 * and the site behaves exactly as it did before the PWA work.
 */

var VERSION = 'v1';
var STATIC = 'cr-static-' + VERSION;
var PAGES = 'cr-pages-' + VERSION;
var OURS = /^cr-(static|pages)-/;

/* Only genuinely static, versioned-by-content assets belong here. No HTML. */
var PRECACHE = [
  '/cosmic-reader.css',
  '/assets/cr-logo-new.svg',
  '/assets/satellite.svg',
  '/assets/cr-icon-192.png',
  '/assets/cr-icon-512.png',
  '/manifest.webmanifest'
];

var AUTH_PARAMS = ['code', 'access_token', 'refresh_token', 'reset', 'openauth', 'error', 'error_description', 'token_hash', 'type'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(STATIC).then(function (c) {
      /* addAll rejects the whole install if any single file 404s, which would
         leave the site with no worker at all. Add individually instead. */
      return Promise.all(PRECACHE.map(function (u) {
        return c.add(u).catch(function () { /* skip anything missing */ });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        /* drop our own old versions; never touch caches we did not create */
        if (OURS.test(k) && k !== STATIC && k !== PAGES) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function hasAuthParam(url) {
  for (var i = 0; i < AUTH_PARAMS.length; i++) {
    if (url.searchParams.has(AUTH_PARAMS[i])) return true;
  }
  return false;
}

function isStaticAsset(url) {
  return /\.(css|js|svg|png|jpg|jpeg|webp|woff2?|ico)$/i.test(url.pathname) &&
         !/^\/(sw\.js)$/.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;

  /* --- pass-through cases: do NOT call respondWith, let the browser do it --- */
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }

  if (url.origin !== self.location.origin) return;   // supabase, wsrv, feeds
  if (url.pathname.indexOf('/api/') === 0) return;    // serverless functions
  if (hasAuthParam(url)) return;                      // any auth handshake
  if (url.pathname === '/sw.js') return;              // never cache ourselves

  /* --- navigations: network-first, cache only as an offline fallback --- */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(PAGES).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req).then(function (hit) {
          return hit || caches.match('/home.html') || Response.error();
        });
      })
    );
    return;
  }

  /* --- static assets: cache-first, refreshed quietly in the background --- */
  if (isStaticAsset(url)) {
    e.respondWith(
      caches.match(req).then(function (hit) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(STATIC).then(function (c) { c.put(req, copy); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || net;
      })
    );
    return;
  }

  /* everything else: leave it to the browser */
});

/* Lets a page trigger an immediate update, and provides a clean self-removal. */
self.addEventListener('message', function (e) {
  if (!e.data) return;
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
  if (e.data === 'CR_SW_UNINSTALL') {
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) { return OURS.test(k) ? caches.delete(k) : null; }));
    }).then(function () { return self.registration.unregister(); });
  }
});
