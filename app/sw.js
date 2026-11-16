/* SchützenTracker Web-App: Offline-Speicher.
   Bei jedem neuen Upload VERSION erhöhen, dann holen sich alle Geräte die neue Fassung. */
var VERSION = 'v1.7-12';
var CACHE = 'schuetzentracker-' + VERSION;
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'];
var EXTRA = ['https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];  // PDF-Export offline; Fehler hier sind nicht schlimm

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE).then(function () { return Promise.all(EXTRA.map(function (x) { return c.add(x).catch(function () {}); })); }); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf('schuetzentracker-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;                       // Anmeldung und Speichern laufen immer direkt zum Server
  if (/supabase\.co$/.test(u.hostname)) return;          // Vereins- und Kontodaten nie zwischenspeichern
  var own = u.origin === self.location.origin;
  var lib = u.hostname === 'cdnjs.cloudflare.com' || u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com';
  if (!own && !lib) return;
  if (r.mode === 'navigate') {
    // App-Seite: zuerst aus dem Netz (damit Updates sofort ankommen), offline aus dem Speicher
    e.respondWith(fetch(r).then(function (res) {
      var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put('index.html', copy); }); return res;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  e.respondWith(caches.match(r).then(function (hit) {
    var net = fetch(r).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
      return res;
    }).catch(function () { return hit; });
    return hit || net;
  }));
});
