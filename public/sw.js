// =====================================================================================
// Letzte Crew – Service Worker: behält die Spieldaten dauerhaft auf diesem Gerät.
//  - Spieldaten (assets/…, Dateinamen mit Prüfsumme): erst aus dem Speicher, sonst laden und ablegen.
//    Ändert sich eine Datei, hat sie einen neuen Namen; alte räumt das Spiel nach dem Start weg (assets.ts).
//  - Seite, Code, Paketliste: erst aus dem Netz (immer aktuell), ohne Netz aus dem Speicher (Einzelspieler offline).
//  - Musik (wird gestreamt), Mehrspieler und Statusseite gehen unverändert durch.
// =====================================================================================
const ASSETS = 'lc-assets-v1', SHELL = 'lc-shell-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== ASSETS && k !== SHELL) await caches.delete(k);
  await self.clients.claim();   // gleich beim ersten Besuch die Seite übernehmen, damit schon der erste Download gespeichert wird
})()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                                   // Schriften usw.
  const p = url.pathname;
  if (p.includes('/music/') || p.endsWith('/ws') || p.endsWith('/status')) return;
  if (p.includes('/assets/') && !p.endsWith('/manifest.json')) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkFirst(req));
});

async function cacheFirst(req) {
  const c = await caches.open(ASSETS);
  const hit = await c.match(req, { ignoreVary: true });
  if (hit) return hit;
  const r = await fetch(req);
  if (r.ok && r.status === 200) c.put(req, r.clone());
  return r;
}
async function networkFirst(req) {
  const c = await caches.open(SHELL);
  try {
    const r = await fetch(req);
    if (r.ok && r.status === 200) c.put(req, r.clone());
    return r;
  } catch (err) {
    const hit = await c.match(req, { ignoreSearch: true, ignoreVary: true });
    if (hit) return hit;
    throw err;
  }
}
