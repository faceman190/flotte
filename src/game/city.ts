import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { scene, camera, glowMat } from '../core/engine';
import { applyKit, kitMeta, loadKitMeta, KIT_GLOW } from '../models/kit';
import { collisionSpheres } from '../models/stationModels';
import { hasChar, charInstance, animInit, animStep, animTalk, type CharAnim } from '../models/charModels';
import { buildShipModel, type ShipModel } from '../models/playerShips';
import { SHIPS, type ShipId } from '../data/ships';
import { makeAvatar, driveAvatar, type Avatar } from './avatar';
import { staffBark } from './barks';
import { world, type Station } from './world';
import { IN, hangarDisplay } from './interior';
import { radio } from '../ui/radio';

// =====================================================================================
// Städte auf Planeten (ab Alpha 0.92): große, begehbare Orte mit Hangar, in den man hineinfliegt.
// Erste Stadt: Talstadt auf Heimstatt II (asset-src/neu/stadt/stadt_kit.py → asset-src/glb/city/Talstadt.glb, Angaben in data/kit_Talstadt.json).
//  - Das Modell liegt im Koordinatensystem des Stations-Innenraums: Hangar und Promenade aus interior.ts liegen deckungsgleich in der Stadt.
//    Von außen sieht man durchs offene Tor den echten Hangar (Hangar.glb), man fliegt hinein (E am Andockpunkt oder einfach durchs Tor).
//  - Von der Promenade führt eine Tür auf den Marktplatz. Draußen geht man zu Fuß durch die Straßen (Wände und Böden aus dem Modell,
//    wie bei den Basen: basewalk.ts); das Schiff bleibt im Hangar.
//  - Leben: Passanten auf festen Wegen, Händler an den Ständen, Wachen am Tor, Schiffe fliegen ein und aus.
// Das Modell kommt aus dem Hintergrund-Paket. Ist es beim Landen noch nicht da, steht vorerst die Basis; sobald es geladen ist,
// wird sie durch die Stadt ersetzt (world.ts → addStation).
// =====================================================================================

export interface CityMeta {
  R?: number; collide_above?: number; city?: boolean;
  door?: { x: number; z: number; out: [number, number]; yaw: number };
  gate?: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number };
  dock?: { x: number; y: number; z: number }; launch?: { x: number; y: number; z: number; yaw: number };
  stalls?: [number, number][]; shops?: [number, number][]; bar?: [number, number]; inn?: [number, number]; monument?: [number, number];
  paths?: [number, number][][]; guards?: [number, number, number][]; traffic?: { far: [number, number, number]; in: [number, number, number] };
  lights?: { k: string; p: [number, number, number]; s: number }[];
}
const meta = (name: string) => kitMeta(name) as unknown as CityMeta;

// ---------- Laden (Hintergrund-Paket, bei Bedarf) ----------
const TPL: Record<string, THREE.Group> = {};
const loading: Record<string, Promise<boolean>> = {};
export const cityLoaded = (name: string) => !!TPL[name];
export function loadCity(name: string): Promise<boolean> {
  if (name in loading) return loading[name];
  const url = (window as any).CITYDATA?.[name] as string | undefined;
  if (!url) return (loading[name] = Promise.resolve(false));
  return (loading[name] = (async () => {
    try {
      const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
      g.scene.traverse((o: any) => { if (o.isMesh) o.userData.shared = true; });
      await loadKitMeta([name]);
      TPL[name] = g.scene;
      return true;
    } catch (e) { console.warn('Stadt nicht geladen:', name, e); return false; }
  })());
}
// nach dem Start still im Hintergrund holen (das erste Landen auf Heimstatt II soll die Stadt schon haben)
export function preloadCities() { for (const n of Object.keys((window as any).CITYDATA || {})) loadCity(n); }

// ---------- Modell ----------
// Rückgabe wie die übrigen Stationsmodelle (world.ts): Gruppe, Kollisionskugeln, Andock- und Startpunkt in lokalen Koordinaten
export function buildCityModel(name: string) {
  const t = TPL[name];
  if (!t) { loadCity(name); return null; }
  const m = meta(name);
  const g = new THREE.Group(), body = t.clone(true);
  applyKit(body);
  g.add(body); g.updateMatrixWorld(true);
  g.userData.walkRoot = body;                           // nur die Stadt selbst ist begehbar (nicht der Hangar dahinter, nicht die Leute)
  const sph = collisionSpheres(body, 7, m.collide_above ?? 1);
  const lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  for (const l of m.lights || []) {
    const sp = new THREE.Sprite(glowMat(KIT_GLOW[l.k] ?? 0xffffff, l.k === 'light' ? 0.5 : 0.9));
    sp.position.set(l.p[0], l.p[1], l.p[2]); sp.scale.setScalar(l.s); g.add(sp);
    if (l.k === 'redlamp' && l.p[1] > 20) navs.push(sp); else if (l.k === 'lamp' && l.p[1] < 1 && l.p[2] > 112) lights.push(sp);   // Leitlichter vor dem Tor
  }
  // Durchs offene Tor: der echte Hangar (dasselbe Modell wie im Innenraum, an derselben Stelle)
  const h = hangarDisplay(); if (h) { h.name = 'hangar'; g.add(h); }
  const d = m.dock || { x: 0, y: 16, z: 175 }, l0 = m.launch || { x: 0, y: 16, z: 112, yaw: Math.PI };
  return { g, lights, navs, sph, R: m.R ?? 340, dock: { ...d }, launch: { ...l0 }, city: name };
}

// ---------- Stadt im Spiel ----------
interface Walker { c: ReturnType<typeof charInstance>; path: [number, number][]; i: number; dir: number; x: number; z: number; v: number; wait: number }
interface Vendor { c: ReturnType<typeof charInstance>; x: number; z: number }
interface Guard { a: Avatar; x: number; z: number; yaw: number }
interface Flyer { m: ShipModel; t: number; dur: number; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; out: boolean }
export const CITY = { st: null as Station | null, name: '', walk: false };
let life: THREE.Group | null = null, walkers: Walker[] = [], vendors: Vendor[] = [], guards: Guard[] = [], flyers: Flyer[] = [], flyT = 8;
export const cityTargets: { x: number; z: number; r: number; label: string; act: () => void }[] = [];
export const cityHooks = { tab: (_t: string, _n: string) => {}, rest: () => {} };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const toWorld = (st: Station, x: number, y: number, z: number) => st.mesh.localToWorld(_v.set(x, y, z)).clone();
export const cityWorld = toWorld;

// Leben aufbauen, sobald die Stadt als Station steht (surface.ts / world.ts nach addStation)
export function initCity(st: Station) {
  const name = (st.def as any).city as string | undefined;
  if (!name || !st.model?.city) return;
  CITY.st = st; CITY.name = name;
  const m = meta(name);
  life = new THREE.Group(); life.name = 'leben'; st.mesh.add(life);
  walkers = []; vendors = []; guards = []; flyers = []; flyT = 6;
  const R = mulberry(name.length * 7919);
  // Passanten: je Weg zwei bis drei, verschiedene Figuren und Helligkeiten
  const kinds = ['worker', 'lagerarbeiter', 'mechaniker', 'worker'].filter(hasChar);
  if (kinds.length) (m.paths || []).forEach((p, pi) => {
    const n = pi < 2 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const c = charInstance(kinds[(pi + k) % kinds.length], 0.8 + R() * 0.35);
      animInit(c.anim, true); c.anim.look = camera.position;
      const i = Math.floor(R() * (p.length - 1)), t = R();
      const x = p[i][0] + (p[i + 1][0] - p[i][0]) * t, z = p[i][1] + (p[i + 1][1] - p[i][1]) * t;
      c.g.position.set(x, 0.18, z); life!.add(c.g);
      walkers.push({ c, path: p, i, dir: 1, x, z, v: 1.25 + R() * 0.4, wait: R() * 3 });
    }
  });
  // Händler hinter den Theken (die Stände stehen am Platzrand und schauen zur Mitte)
  const vk = hasChar('merchant') ? 'merchant' : kinds[0];
  if (vk) for (const s of m.stalls || []) {
    const c = charInstance(vk, 0.85 + R() * 0.3); animInit(c.anim, false); c.anim.look = camera.position;
    const out = s[0] < 0 ? -1 : 1, x = s[0] + out * 3.4, z = s[1];
    c.g.position.set(x, 0.18, z); c.g.rotation.y = out < 0 ? Math.PI / 2 : -Math.PI / 2; life.add(c.g);
    vendors.push({ c, x, z });
  }
  // Wachen (Soldaten mit Gewehr)
  for (const gd of m.guards || []) {
    const a = makeAvatar({ helm: 'wache', anzug: 'panzer' }); if (!a) break;
    life.add(a.s.g); guards.push({ a, x: gd[0], z: gd[1], yaw: gd[2] });
  }
  // Ansprechpunkte zu Fuß (Weltkoordinaten)
  cityTargets.length = 0;
  const tgt = (p: [number, number] | undefined, r: number, label: string, act: () => void) => { if (!p) return; const w = toWorld(st, p[0], 0, p[1]); cityTargets.push({ x: w.x, z: w.z, r, label, act }); };
  (m.stalls || []).forEach((p, i) => tgt(p, 2.6, i === 1 ? 'Imbiss · Händler ansprechen' : i === 6 ? 'Ersatzteile · Händler ansprechen' : 'Marktstand · Händler ansprechen', () => {
    const v = vendors[i]; if (v) animTalk(v.c.anim, 3.2);
    staffBark(i % 2 ? 'Mira' : 'Corvin', 'markt'); cityHooks.tab('markt', 'Händlerin am Markt: „Zeig her, was du im Frachtraum hast.“');
  }));
  const sh = m.shops || [];
  tgt(sh[0], 3.0, 'Sanität · Reparatur und Versorgung', () => { staffBark('Ilka', 'service'); cityHooks.tab('service', 'Sanität Talstadt: „Reparatur, Munition, Sprengladungen. Alles da.“'); });
  tgt(sh[4], 3.0, 'Ersatzteile · Werkstatt', () => { staffBark('Brann', 'werkstatt'); cityHooks.tab('werkstatt', 'Ersatzteile Talstadt: „Was sollen wir an deinem Schiff verbessern?“'); });
  tgt(sh[2], 3.0, 'Lagerhaus · Lagerabteil', () => { staffBark('Okko', 'lager'); cityHooks.tab('lager', 'Lagerhaus Talstadt: „Dein Lagerabteil ist bei uns sicher.“'); });
  tgt(m.bar, 3.2, 'Zur Schleuse · Aufträge am Tresen', () => { staffBark('Runa', 'auftraege'); cityHooks.tab('auftraege', 'Wirtin der „Schleuse“: „Wir haben immer Bedarf. Schau dir die Aufträge an.“'); });
  tgt(m.inn, 3.2, 'Herberge · Ausruhen (Spielstand sichern)', () => cityHooks.rest());
  tgt(m.monument, 4.5, 'Gründerdenkmal lesen', () => radio('TAFEL', 'Dieses Landebein trug die „Talwind“, das erste Siedlerschiff auf Heimstatt II. Aus ihrem Rumpf entstand die Halle, aus ihrer Besatzung diese Stadt.', '#e8d8b0'));
}
export function clearCity() {
  if (life) life.removeFromParent();
  life = null; walkers = []; vendors = []; guards = [];
  for (const f of flyers) { scene.remove(f.m.g); }
  flyers = []; cityTargets.length = 0; CITY.st = null; CITY.name = ''; CITY.walk = false;
}

// Tür des Promenadenhauses (außen) und Platz davor
export function cityDoorNear(x: number, z: number) {
  const st = CITY.st, m = st && meta(CITY.name);
  if (!st || !m?.door) return false;
  const w = toWorld(st, m.door.x, 0, m.door.z);
  return Math.hypot(w.x - x, w.z - z) < 4.0;
}
export function cityDoorOut(): { x: number; z: number; yaw: number } | null {
  const st = CITY.st, m = st && meta(CITY.name);
  if (!st || !m?.door) return null;
  const w = toWorld(st, m.door.out[0], 0, m.door.out[1]);
  return { x: w.x, z: w.z, yaw: st.yaw + m.door.yaw };
}
export function cityDoorPos() { const st = CITY.st, m = st && meta(CITY.name); return st && m?.door ? toWorld(st, m.door.x, 0, m.door.z) : null; }
// im offenen Hallentor? (automatisch andocken)
export function insideCityGate(x: number, y: number, z: number) {
  const st = CITY.st, m = st && meta(CITY.name), gt = m?.gate;
  if (!st || !gt || !st.mesh.visible) return false;
  st.mesh.worldToLocal(_w.set(x, y, z));
  return _w.x > gt.x0 && _w.x < gt.x1 && _w.y > gt.y0 && _w.y < gt.y1 && _w.z > gt.z0 && _w.z < gt.z1;
}
// Lage des eigenen Schiffs im Hangar (für den Stadtgang: es steht dort auf dem mittleren Stellplatz)
export function hangarPadPose(st: Station, lift: number) {
  const p = toWorld(st, 0, lift, 28);
  return { x: p.x, y: p.y, z: p.z, yaw: st.yaw + Math.PI };
}

// ---------- pro Bild ----------
export function updateCity(dt: number) {
  const st = CITY.st;
  if (!st) return;
  if (!world.stations.includes(st)) { clearCity(); return; }
  const visible = st.mesh.visible && !IN.active;
  if (life) life.visible = visible;
  const near = camera.position.distanceTo(st.mesh.position) < st.R + 700;
  if (visible && near) {
    // Passanten auf ihren Wegen (hin und zurück bzw. im Kreis), kurze Pausen an den Wegmarken
    const pl = st.mesh.worldToLocal(_w.copy(camera.position));
    for (const w of walkers) {
      const p = w.path, ni = w.i + w.dir;
      if (ni < 0 || ni >= p.length) { w.dir = -w.dir; continue; }
      const tx = p[ni][0], tz = p[ni][1], dx = tx - w.x, dz = tz - w.z, d = Math.hypot(dx, dz);
      if (d < 0.4) { w.i = ni; if (Math.random() < 0.25) w.wait = 2 + Math.random() * 5; continue; }
      const blocked = Math.hypot(pl.x - w.x, pl.z - w.z) < 1.6 && ((pl.x - w.x) * dx + (pl.z - w.z) * dz) > 0;
      if (w.wait > 0) w.wait -= dt;
      const sp = animStep(w.c.anim, dt, w.wait <= 0 && !blocked, w.v);
      w.x += dx / d * sp * dt; w.z += dz / d * sp * dt;
      w.c.g.position.set(w.x, 0.18, w.z);
      const ta = Math.atan2(dx, dz), da = Math.atan2(Math.sin(ta - w.c.g.rotation.y), Math.cos(ta - w.c.g.rotation.y));
      w.c.g.rotation.y += da * Math.min(1, dt * 5);
    }
    for (const v of vendors) animStep(v.c.anim, dt, false);
    for (const g of guards) driveAvatar(g.a, dt, { x: g.x, y: 0.18, z: g.z, yaw: g.yaw, pitch: 0, vx: 0, vz: 0, wid: 'k12', combat: false });
  }
  // Verkehr: alle 25–45 s ein Schiff, abwechselnd hinein und hinaus
  updateFlyers(dt, st, visible);
}
const NPC_CLS = (): ShipId[] => (['falke', 'elster', 'kaerrner', 'habicht', 'pfeil'] as string[]).filter(c => (SHIPS as any)[c]) as ShipId[];
function updateFlyers(dt: number, st: Station, visible: boolean) {
  const m = meta(CITY.name), tr = m.traffic || { far: [0, 140, 1400], in: [0, 14, 60] };
  if (visible && (flyT -= dt) <= 0 && flyers.length < 2) {
    flyT = 25 + Math.random() * 20;
    const cls = NPC_CLS(); if (cls.length) {
      const out = Math.random() < 0.5, side = (Math.random() - 0.5) * 500;
      const far = toWorld(st, tr.far[0] + side, tr.far[1] + Math.random() * 60, tr.far[2]), front = toWorld(st, side * 0.08, 16, 170), inside = toWorld(st, tr.in[0], tr.in[1], tr.in[2]);
      const sm = buildShipModel(cls[Math.floor(Math.random() * cls.length)]);
      (sm.shield.material as THREE.MeshBasicMaterial).opacity = 0;
      scene.add(sm.g);
      flyers.push(out ? { m: sm, t: 0, dur: 26, a: inside, b: front, c: far, out } : { m: sm, t: 0, dur: 26, a: far, b: front, c: inside, out });
    }
  }
  for (let i = flyers.length - 1; i >= 0; i--) {
    const f = flyers[i]; f.t += dt;
    const u = Math.min(1, f.t / f.dur), e = f.out ? u * u : 1 - (1 - u) * (1 - u);       // hinein: abbremsen, hinaus: beschleunigen
    // quadratische Bahn a → b → c
    const q = (k: 'x' | 'y' | 'z') => (1 - e) * (1 - e) * f.a[k] + 2 * (1 - e) * e * f.b[k] + e * e * f.c[k];
    const ox = f.m.g.position.x, oy = f.m.g.position.y, oz = f.m.g.position.z;
    f.m.g.position.set(q('x'), q('y'), q('z'));
    const vx = f.m.g.position.x - ox, vy = f.m.g.position.y - oy, vz = f.m.g.position.z - oz;
    if (vx * vx + vy * vy + vz * vz > 1e-4) f.m.g.lookAt(f.m.g.position.x - vx, f.m.g.position.y - vy, f.m.g.position.z - vz);
    f.m.g.visible = visible;
    if (u >= 1) { scene.remove(f.m.g); flyers.splice(i, 1); }
  }
}
function mulberry(seed: number) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export type { CharAnim };
