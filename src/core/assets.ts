// =====================================================================================
// Spieldaten laden und auf dem Gerät behalten
// Die Paketliste public/assets/manifest.json nennt jede Datei mit Prüfsumme im Namen und ihrem Paket:
//  - core:  vor dem Hauptmenü nötig (mit Ladebalken)
//  - world: weitere Nebel und Planeten, werden danach still im Hintergrund geholt
// Ein Service Worker (public/sw.js) legt die Dateien dauerhaft im Browser ab; beim nächsten Start kommen sie
// von der Festplatte. Ohne Service Worker (Entwicklung, claude.ai) hilft der normale Browser-Zwischenspeicher.
// Für den Spielcode werden daraus die bekannten Verzeichnisse gebaut (window.TEXDATA, SHIPDATA …) – mit
// Dateiadressen statt eingebetteter Daten.
// =====================================================================================
export interface AssetFile { url: string; size: number; pack: string }
// embed: nur in der Artifact-Fassung (claude.ai stellt keine .glb-Dateien bereit): Modelle gebündelt in einer JSON-Datei
export interface Manifest { v: string; packs: Record<string, { files: number; size: number }>; files: Record<string, AssetFile>; embed?: { url?: string; urls?: string[]; size: number } }
declare global {
  interface Window {
    TEXDATA?: Record<string, string>; NEBDATA?: Record<string, string>;
    PLANETDATA?: { map: Record<string, string>; ground: Record<string, string>; groundn?: Record<string, string>; groundr?: Record<string, string> };
    SHIPDATA?: { models: Record<string, string>; paints: Record<string, string> };
    STATIONDATA?: Record<string, string>; CHARDATA?: Record<string, string>;
    SOUNDDATA?: Record<string, string>;
  }
}
export const CACHE = 'lc-assets-v1';
export let MANIFEST: Manifest | null = null;
export const ASSET_STATE = { sw: false, persisted: false, stored: 0, worldDone: false };
const $ = (id: string) => document.getElementById(id) as HTMLElement;
const mb = (n: number) => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
const abs = (u: string) => new URL(u, location.href).href;

// ---------- Service Worker ----------
async function registerSW() {
  if ((import.meta as any).env?.DEV || !('serviceWorker' in navigator) || !window.isSecureContext) return false;
  try {
    await navigator.serviceWorker.register('./sw.js');
    // bis er die Seite steuert (beim allerersten Besuch übernimmt er sie sofort), höchstens 3 s warten
    await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 3000))]);
    if (!navigator.serviceWorker.controller) await new Promise(r => { navigator.serviceWorker.addEventListener('controllerchange', () => r(0), { once: true }); setTimeout(r, 1500); });
    return !!navigator.serviceWorker.controller;
  } catch { return false; }
}
async function storedUrls(): Promise<Set<string>> {
  try { if (!('caches' in window)) return new Set(); const c = await caches.open(CACHE); return new Set((await c.keys()).map(r => r.url)); }
  catch { return new Set(); }
}

// ---------- Laden mit Fortschritt ----------
async function fetchFile(f: AssetFile, onBytes: (n: number) => void) {
  for (let tries = 0; ; tries++) {
    try {
      const r = await fetch(f.url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (!r.body) { onBytes((await r.arrayBuffer()).byteLength); return; }
      const rd = r.body.getReader();
      for (;;) { const { done, value } = await rd.read(); if (done) break; onBytes(value.byteLength); }
      return;
    } catch (e) { if (tries >= 2) throw e; await new Promise(r => setTimeout(r, 800 * (tries + 1))); }
  }
}
async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}
function setGlobals(m: Manifest) {
  const g = (p: string) => Object.fromEntries(Object.entries(m.files).filter(([k]) => k.startsWith(p)).map(([k, f]) => [k.slice(p.length), f.url]));
  window.TEXDATA = g('tex/'); window.NEBDATA = g('neb/');
  window.PLANETDATA = { map: g('planet/map/'), ground: g('planet/ground/'), groundn: g('planet/groundn/'), groundr: g('planet/groundr/') };
  window.SHIPDATA = { models: g('ship/'), paints: g('paint/') };
  window.STATIONDATA = g('station/'); window.CHARDATA = g('char/'); window.SOUNDDATA = g('sound/');
  (window as any).CITYDATA = g('city/');   // Städte (src/game/city.ts)
  window.SHIPINT = g('shipint/'); (window as any).DECODATA = g('deco/'); (window as any).DATAFILES = g('data/'); window.WALKMAP = g('walk/');   // begehbare Innenräume (meshRoom.ts)
}
async function loadManifest(): Promise<Manifest> {
  for (;;) {
    try { const r = await fetch('assets/manifest.json', { cache: 'no-cache' }); if (r.ok) return await r.json(); throw new Error('HTTP ' + r.status); }
    catch {
      // offline ohne gespeicherte Paketliste: anbieten, es erneut zu versuchen
      $('bootTxt').textContent = 'Spieldaten nicht erreichbar. Bist du online?';
      const b = $('bootRetry'); b.hidden = false;
      await new Promise(r => (b.onclick = () => { b.hidden = true; $('bootTxt').textContent = 'Neuer Versuch …'; r(0); }));
    }
  }
}

export async function loadAssets() {
  const t0 = performance.now();
  ASSET_STATE.sw = await registerSW();
  const m = (MANIFEST = await loadManifest());
  const have = ASSET_STATE.sw ? await storedUrls() : new Set<string>();
  const all = Object.values(m.files), core = all.filter(f => f.pack === 'core' && !f.url.startsWith('embed:'));
  const missing = core.filter(f => !have.has(abs(f.url)));
  const total = missing.reduce((a, f) => a + f.size, 0) + (m.embed ? m.embed.size : 0);
  let got = 0;
  const show = () => {
    $('bootBar').style.width = `${total ? Math.min(100, (got / total) * 100) : 100}%`;
    $('bootTxt').textContent = total ? `Spieldaten werden geladen · ${mb(got)} von ${mb(total)}` : 'Spieldaten aus dem Speicher geladen';
  };
  $('bootSub').textContent = total > 2e6 ? 'Beim ersten Start einmalig. Danach startet das Spiel aus dem Speicher dieses Geräts.' : '';
  show();
  // Artifact-Fassung: gebündelte Modelle laden und als Dateien im Speicher bereitstellen
  if (m.embed) {
    try {
      // mehrere Teile (claude.ai erlaubt höchstens 16 MB je Datei)
      const parts = await Promise.all((m.embed.urls || [m.embed.url!]).map(u => fetch(u).then(r => r.json() as Promise<Record<string, string>>)));
      got += m.embed.size; show();
      // sehr große Modelle kommen in Stücken („name#0“, „name#1“ …) und werden hier wieder zusammengesetzt
      const chunks: Record<string, Uint8Array[]> = {};
      for (const [k, b64] of parts.flatMap(p => Object.entries(p))) {
        const bin = atob(b64), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        const [name, n] = k.split('#'); (chunks[name] = chunks[name] || [])[+(n || 0)] = u;
      }
      for (const [k, list] of Object.entries(chunks)) if (m.files[k]) m.files[k].url = URL.createObjectURL(new Blob(list, { type: 'model/gltf-binary' }));
    } catch { console.warn('Gebündelte Modelle nicht geladen; das Spiel nutzt Ersatzmodelle.'); }
  }
  setGlobals(m);
  let failed = 0;
  await pool(missing, 4, async f => { try { await fetchFile(f, n => { got += n; show(); }); } catch { failed++; } });
  if (failed) console.warn(`${failed} Spieldateien konnten nicht geladen werden; das Spiel nutzt dafür Ersatzmodelle.`);
  // Ladebildschirm ausblenden (kurz stehen lassen, wenn es schnell ging, damit er nicht nur aufblitzt)
  const wait = Math.max(0, 350 - (performance.now() - t0));
  setTimeout(() => { $('boot').classList.add('done'); setTimeout(() => $('boot').remove(), 700); }, wait);
  // danach: Rest im Hintergrund, alte Dateien aufräumen, dauerhaften Speicher erbitten
  setTimeout(() => prefetchWorld(m, have), 4000);
  if (ASSET_STATE.sw) cleanup(m);
  addEventListener('pointerdown', askPersist, { once: true });
}
async function prefetchWorld(m: Manifest, have: Set<string>) {
  const rest = Object.values(m.files).filter(f => f.pack !== 'core' && !f.url.startsWith('blob:') && !have.has(abs(f.url)));
  await pool(rest, 2, async f => { try { await fetchFile(f, () => {}); } catch { /* später erneut */ } });
  ASSET_STATE.worldDone = true;
  storageInfo();
}
// Dateien früherer Versionen entfernen (alles, was nicht mehr in der Paketliste steht)
async function cleanup(m: Manifest) {
  try {
    const keep = new Set(Object.values(m.files).map(f => abs(f.url))), c = await caches.open(CACHE);
    for (const r of await c.keys()) if (!keep.has(r.url)) await c.delete(r);
  } catch { /* egal */ }
}
async function askPersist() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { /* egal */ }
  storageInfo();
}
// für die Einstellungen: wie viel ist gespeichert, bleibt es dauerhaft?
export async function storageInfo() {
  try { ASSET_STATE.persisted = !!(await navigator.storage?.persisted?.()); } catch { /* egal */ }
  try { if ('caches' in window) { const c = await caches.open(CACHE); let n = 0; for (const r of await c.keys()) { const f = Object.values(MANIFEST?.files || {}).find(x => abs(x.url) === r.url); n += f ? f.size : 0; } ASSET_STATE.stored = n; } } catch { /* egal */ }
  return ASSET_STATE;
}
export async function clearStoredAssets() {
  try { await caches.delete(CACHE); } catch { /* egal */ }
  ASSET_STATE.stored = 0;
}
