// Parcours — mode hors-ligne : garde l'appli, ses librairies et les morceaux de carte déjà vus.
const VERSION = 'parcours-v15';
const LIBCACHE = 'parcours-libs'; // librairies aux adresses figées (gros fichiers de l'IA repas) : gardées d'une version à l'autre
const TILES = 'parcours-tuiles';
const MAX_TILES = 600;
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './foods-data.json'];
const LIBS = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION), libs = await caches.open(LIBCACHE);
    await cache.addAll(SHELL);
    await Promise.all(LIBS.map(async u => (await libs.match(u)) || libs.add(new Request(u, { mode: 'cors' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // on ne supprime que les anciennes versions de l'appli (le modèle d'IA, dans « transformers-cache », est gardé)
    await Promise.all(keys.filter(k => /^parcours-v\d+$/.test(k) && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimTiles() {
  const cache = await caches.open(TILES);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await cache.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Page de l'appli : réseau d'abord (pour recevoir les mises à jour), cache si pas de connexion
  if (req.mode === 'navigate' || (url.origin === location.origin && url.pathname.endsWith('/index.html'))) {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        const cache = await caches.open(VERSION);
        cache.put('./index.html', res.clone());
        return res;
      } catch (e) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Fichiers de l'appli : cache d'abord
  if (url.origin === location.origin) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // Librairies et polices : cache, puis mise à jour en arrière-plan
  if (/(^|\.)cdn\.jsdelivr\.net$|^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    event.respondWith((async () => {
      const pinned = url.hostname === 'cdn.jsdelivr.net' && /@\d/.test(url.pathname);
      const cache = await caches.open(pinned ? LIBCACHE : VERSION);
      const hit = await cache.match(req);
      if (hit && pinned) return hit; // adresse avec numéro de version : le fichier ne change jamais
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await net) || Response.error();
    })());
    return;
  }

  // Carte : style en réseau d'abord, morceaux de carte (tuiles) en cache d'abord
  if (url.hostname === 'tiles.openfreemap.org' || url.hostname === 'tile.openstreetmap.org') {
    const isStyle = url.pathname.startsWith('/styles/') || url.pathname.endsWith('.json');
    event.respondWith((async () => {
      const cache = await caches.open(TILES);
      if (isStyle) {
        try { const res = await fetch(req); if (res.ok) cache.put(req, res.clone()); return res; }
        catch (e) { return (await cache.match(req)) || Response.error(); }
      }
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) { await cache.put(req, res.clone()); trimTiles(); }
        return res;
      } catch (e) { return Response.error(); }
    })());
  }
});
