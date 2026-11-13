import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { scene, camera, glowMat, ambient, sun, rim, bloomPass } from '../core/engine';
import { puff } from './fx';
import { applyKit, kitMeta, loadKitMeta, KIT_GLOW, kitHoloFlicker, setCityLight, cityLook, probeLit } from '../models/kit';
import { setSkyDusk } from '../core/sky';
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
  // Stil „neon“ (Neonhafen): Dunst und Dämmerlicht in den Gassen, Hologramme, Skulptur, Dampf aus den Schächten
  style?: 'neon'; steam?: [number, number][]; sculpture?: [number, number, number]; bounds?: { x: number; z0: number; z1: number };
  holos?: { p: [number, number, number]; r: number; kind: 'sphere' | 'ring' | 'curtain'; col: number; w?: number; h?: number; yaw?: number }[];
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
  applyKit(body, cityLook(name));                       // vorberechnetes Licht und Schatten, falls für diese Stadt gebacken
  g.add(body); g.updateMatrixWorld(true);
  g.userData.walkRoot = body;                           // nur die Stadt selbst ist begehbar (nicht der Hangar dahinter, nicht die Leute)
  const sph = collisionSpheres(body, 7, m.collide_above ?? 1);
  const lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  for (const l of m.lights || []) {
    const sp = new THREE.Sprite(glowMat(KIT_GLOW[l.k] ?? 0xffffff, l.k === 'light' ? 0.5 : 0.9));
    sp.position.set(l.p[0], l.p[1], l.p[2]); sp.scale.setScalar(m.style === 'neon' && l.p[1] < 25 ? Math.min(l.s, 1.0) : l.s); g.add(sp);   // in engen Gassen kleinere Leuchtpunkte
    if (l.k === 'redlamp' && l.p[1] > 20) navs.push(sp); else if (l.k === 'lamp' && l.p[1] < 1 && l.p[2] > 112) lights.push(sp);   // Leitlichter vor dem Tor
  }
  // Durchs offene Tor: der echte Hangar (dasselbe Modell wie im Innenraum, an derselben Stelle)
  const h = hangarDisplay(); if (h) { h.name = 'hangar'; g.add(h); }
  const d = m.dock || { x: 0, y: 16, z: 175 }, l0 = m.launch || { x: 0, y: 16, z: 112, yaw: Math.PI };
  return { g, lights, navs, sph, R: m.R ?? 340, dock: { ...d }, launch: { ...l0 }, city: name };
}

// ---------- Stadt im Spiel ----------
interface Walker { lc?: THREE.Color; c: ReturnType<typeof charInstance>; path: [number, number][]; i: number; dir: number; x: number; z: number; v: number; wait: number }
interface Vendor { lc?: THREE.Color; c: ReturnType<typeof charInstance>; x: number; z: number }
interface Guard { lc?: THREE.Color; a: Avatar; x: number; z: number; yaw: number }
interface Flyer { m: ShipModel; t: number; dur: number; a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; out: boolean }
export const CITY = { st: null as Station | null, name: '', walk: false };
let life: THREE.Group | null = null, walkers: Walker[] = [], vendors: Vendor[] = [], guards: Guard[] = [], flyers: Flyer[] = [], flyT = 8;
export const cityTargets: { x: number; z: number; r: number; label: string; act: () => void }[] = [];
export const cityHooks = { tab: (_t: string, _n: string) => {}, rest: () => {} };
const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const toWorld = (st: Station, x: number, y: number, z: number) => st.mesh.localToWorld(_v.set(x, y, z)).clone();
export const cityWorld = toWorld;

// ---------- Lichtraster für Figuren ----------
// Ein kleines Bild je Stadt (kit_pr_<Name>, eine Zelle je 3 m über die Grenzen der Stadt, oberste Zeile = kleinstes z): Helligkeit und Farbe des
// Stadtlichts am Boden. Figuren lesen es an ihrem Standort ab. Kodierung wie die Lichtkarte (v = x / (1 + x), sRGB).
let probe: { w: number; h: number; d: Float32Array; bx: number; z0: number; z1: number } | null = null, probeFor = '';
const PROBE_K = 5.0;                                     // Stärke wie die Lichtkarte (CITY_LIGHT in kit.ts), etwas angehoben für das Licht von der Seite
function loadProbe(name: string) {
  probe = null; probeFor = name;
  const url = window.TEXDATA?.['kit_pr_' + name]; if (!url) return false;
  const bd = meta(name).bounds || { x: 210, z0: -255, z1: 240 }, im = new Image();
  im.onload = () => {
    if (probeFor !== name) return;
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d')!; g.drawImage(im, 0, 0);
    const px = g.getImageData(0, 0, im.width, im.height).data, d = new Float32Array(im.width * im.height * 3);
    for (let i = 0, n = im.width * im.height; i < n; i++) for (let k = 0; k < 3; k++) {
      const s = px[i * 4 + k] / 255, v = Math.min(0.965, s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4));
      d[i * 3 + k] = v / (1 - v);
    }
    probe = { w: im.width, h: im.height, d, bx: bd.x, z0: bd.z0, z1: bd.z1 };
  };
  im.src = url;
  return true;
}
function probeAt(x: number, z: number, out: THREE.Color, k: number) {
  const p = probe!, fx = Math.min(p.w - 1.001, Math.max(0, (x + p.bx) / (2 * p.bx) * p.w - 0.5)), fz = Math.min(p.h - 1.001, Math.max(0, (z - p.z0) / (p.z1 - p.z0) * p.h - 0.5));
  const x0 = Math.floor(fx), z0 = Math.floor(fz), tx = fx - x0, tz = fz - z0, d = p.d, a = (z0 * p.w + x0) * 3, b = a + 3, c = a + p.w * 3, e = c + 3;
  const w0 = (1 - tx) * (1 - tz) * k, w1 = tx * (1 - tz) * k, w2 = (1 - tx) * tz * k, w3 = tx * tz * k;
  out.setRGB(d[a] * w0 + d[b] * w1 + d[c] * w2 + d[e] * w3, d[a + 1] * w0 + d[b + 1] * w1 + d[c + 1] * w2 + d[e + 1] * w3, d[a + 2] * w0 + d[b + 2] * w1 + d[c + 2] * w2 + d[e + 2] * w3);
}

// Leben aufbauen, sobald die Stadt als Station steht (surface.ts / world.ts nach addStation)
export function initCity(st: Station) {
  const name = (st.def as any).city as string | undefined;
  if (!name || !st.model?.city) return;
  CITY.st = st; CITY.name = name;
  const m = meta(name);
  life = new THREE.Group(); life.name = 'leben'; st.mesh.add(life);
  walkers = []; vendors = []; guards = []; flyers = []; flyT = 6;
  const R = mulberry(name.length * 7919);
  const lit = loadProbe(name);                           // Lichtraster der Stadt: Figuren bekommen das Stadtlicht ihres Standorts
  // Passanten: je Weg zwei bis drei, verschiedene Figuren und Helligkeiten
  const kinds = ['worker', 'lagerarbeiter', 'mechaniker', 'worker'].filter(hasChar);
  const cap = m.style === 'neon' ? 30 : 99;
  if (kinds.length) (m.paths || []).forEach((p, pi) => {
    const n = Math.min(pi < 2 ? 3 : m.style === 'neon' ? 1 : 2, cap - walkers.length);
    for (let k = 0; k < n; k++) {
      const c = charInstance(kinds[(pi + k) % kinds.length], 0.8 + R() * 0.35);
      animInit(c.anim, true); c.anim.look = camera.position;
      const i = Math.floor(R() * (p.length - 1)), t = R();
      const x = p[i][0] + (p[i + 1][0] - p[i][0]) * t, z = p[i][1] + (p[i + 1][1] - p[i][1]) * t;
      c.g.position.set(x, 0.18, z); life!.add(c.g);
      walkers.push({ c, path: p, i, dir: 1, x, z, v: 1.25 + R() * 0.4, wait: R() * 3, lc: lit ? probeLit(c.g) : undefined });
    }
  });
  // Händler hinter den Theken (die Stände stehen am Platzrand und schauen zur Mitte)
  const vk = hasChar('merchant') ? 'merchant' : kinds[0];
  if (vk) for (const s of m.stalls || []) {
    const c = charInstance(vk, 0.85 + R() * 0.3); animInit(c.anim, false); c.anim.look = camera.position;
    const out = s[0] < 0 ? -1 : 1, x = s[0] + out * 3.4, z = s[1];
    c.g.position.set(x, 0.18, z); c.g.rotation.y = out < 0 ? Math.PI / 2 : -Math.PI / 2; life.add(c.g);
    vendors.push({ c, x, z, lc: lit ? probeLit(c.g) : undefined });
  }
  // Wachen (Soldaten mit Gewehr)
  for (const gd of m.guards || []) {
    const a = makeAvatar({ helm: 'wache', anzug: 'panzer' }); if (!a) break;
    life.add(a.s.g); guards.push({ a, x: gd[0], z: gd[1], yaw: gd[2], lc: lit ? probeLit(a.s.g) : undefined });
  }
  if (m.style === 'neon') buildNeon(m);
  // Ansprechpunkte zu Fuß (Weltkoordinaten)
  cityTargets.length = 0;
  const tgt = (p: [number, number] | undefined, r: number, label: string, act: () => void) => { if (!p) return; const w = toWorld(st, p[0], 0, p[1]); cityTargets.push({ x: w.x, z: w.z, r, label, act }); };
  // Steht ein Stand genau an der Stelle der Kneipe (Neonhafen: die Garküche ist der Stand am Platz), gilt dort nur die Kneipe;
  // sonst läge der Markt über dem Tresen und die Aufträge wären nie erreichbar.
  const atBar = (p: [number, number]) => !!m.bar && Math.hypot(p[0] - m.bar[0], p[1] - m.bar[1]) < 1;
  (m.stalls || []).forEach((p, i) => atBar(p) ? undefined : tgt(p, 2.6, i === 1 ? 'Imbiss · Händler ansprechen' : i === 6 ? 'Ersatzteile · Händler ansprechen' : 'Marktstand · Händler ansprechen', () => {
    const v = vendors[i]; if (v) animTalk(v.c.anim, 3.2);
    staffBark(i % 2 ? 'Mira' : 'Corvin', 'markt'); cityHooks.tab('markt', 'Händlerin am Markt: „Zeig her, was du im Frachtraum hast.“');
  }));
  const sh = m.shops || [];
  tgt(sh[0], 3.0, 'Sanität · Reparatur und Versorgung', () => { staffBark('Ilka', 'service'); cityHooks.tab('service', 'Sanität Talstadt: „Reparatur, Munition, Sprengladungen. Alles da.“'); });
  tgt(sh[4], 3.0, 'Ersatzteile · Werkstatt', () => { staffBark('Brann', 'werkstatt'); cityHooks.tab('werkstatt', 'Ersatzteile Talstadt: „Was sollen wir an deinem Schiff verbessern?“'); });
  tgt(sh[2], 3.0, 'Lagerhaus · Lagerabteil', () => { staffBark('Okko', 'lager'); cityHooks.tab('lager', 'Lagerhaus Talstadt: „Dein Lagerabteil ist bei uns sicher.“'); });
  const neon = m.style === 'neon';
  tgt(m.bar, 3.2, neon ? 'Garküche „Schleusenbräu“ · Aufträge am Tresen' : 'Zur Schleuse · Aufträge am Tresen', () => { staffBark('Runa', 'auftraege'); cityHooks.tab('auftraege', neon ? 'Wirtin der Garküche: „Wir haben immer Bedarf. Schau dir die Aufträge an.“' : 'Wirtin der „Schleuse“: „Wir haben immer Bedarf. Schau dir die Aufträge an.“'); });
  tgt(m.inn, 3.2, neon ? 'Kapselhotel · Ausruhen (Spielstand sichern)' : 'Herberge · Ausruhen (Spielstand sichern)', () => cityHooks.rest());
  tgt(m.monument, 4.5, neon ? 'Lichtskulptur betrachten' : 'Gründerdenkmal lesen', () => radio('TAFEL', neon ? '„Der Funke“ – die Lichtskulptur von Neonhafen. Ihre Ringe drehen sich seit dem Tag, an dem die erste Leuchtschrift der Stadt anging, und sind seitdem nie stillgestanden.' : 'Dieses Landebein trug die „Talwind“, das erste Siedlerschiff auf Heimstatt II. Aus ihrem Rumpf entstand die Halle, aus ihrer Besatzung diese Stadt.', '#e8d8b0'));
}
export function clearCity() {
  if (atmoK > 0) setAtmo(0);
  setSkyDusk(0); scene.environmentIntensity = 1;
  atmoBase = null; fx = [];
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
    if (probe) { const k = PROBE_K * (meta(CITY.name).style === 'neon' ? AT.lm0 + (1 - AT.lm0) * atmoK : 1); for (const f of walkers) if (f.lc) probeAt(f.x, f.z, f.lc, k); for (const f of vendors) if (f.lc) probeAt(f.x, f.z, f.lc, k); for (const f of guards) if (f.lc) probeAt(f.x, f.z, f.lc, k); }
    for (const g of guards) driveAvatar(g.a, dt, { x: g.x, y: 0.18, z: g.z, yaw: g.yaw, pitch: 0, vx: 0, vz: 0, wid: 'k12', combat: false });
  }
  // Verkehr: alle 25–45 s ein Schiff, abwechselnd hinein und hinaus
  updateFlyers(dt, st, visible);
  if (meta(CITY.name).style === 'neon') updateNeon(dt, st, visible, near);
}

// ---------- Stil „neon“ ----------
// Atmosphäre: je tiefer man in der Stadt ist (Kamera innerhalb der Grenzen und unter 120 m), desto dichter der Dunst, desto dunkler Sonne und
// Grundlicht, desto stärker das Leuchten (Bloom). Ausgangswerte werden beim Aufbau gemerkt; im Innenraum regelt der Innenraum das Licht.
let atmoK = 0, atmoBase: { fogC: number; fogD: number; amb: number; sun: number; rim: number; bloom: number } | null = null, steamT = 0, tNeon = 0;
let fx: { o: THREE.Object3D; kind: string; spin: number; tex?: THREE.Texture }[] = [];
const NEON_FOG = new THREE.Color(0x1a1f2e), _c = new THREE.Color();
// Abendstimmung: Anteil, um den Grundlicht und Sonne tief in der Stadt sinken, Abdunkeln des Himmels, Stärke des Stadtlichts bei Tag (über der Stadt)
// (rim: Gegenlicht in der Himmelsfarbe, env: Spiegelung der Umgebung; beide würden die dunklen Gassen sonst flach und farbstichig aufhellen)
export const AT = { amb: 0.8, sun: 0.95, rim: 0.85, env: 0.75, sky: 0.85, lm0: 0.3 };
function setAtmo(k: number) {
  const fog = scene.fog as THREE.FogExp2 | null; const b = atmoBase; if (!b) return;
  if (fog) { fog.color.setHex(b.fogC).lerp(NEON_FOG, k); fog.density = b.fogD + (0.0042 - b.fogD) * k; }
  if (!IN.active) { ambient.intensity = b.amb * (1 - AT.amb * k); sun.intensity = b.sun * (1 - AT.sun * k); rim.intensity = b.rim * (1 - AT.rim * k); scene.environmentIntensity = 1 - AT.env * k; }
  setSkyDusk(AT.sky * k); setCityLight(AT.lm0 + (1 - AT.lm0) * k, 'kit_lm_' + CITY.name);
  if (bloomPass) bloomPass.strength = b.bloom + 0.3 * k;
}
function buildNeon(m: CityMeta) {
  const fog = scene.fog as THREE.FogExp2 | null;
  atmoBase = { fogC: fog ? fog.color.getHex() : 0, fogD: fog ? fog.density : 0, amb: ambient.intensity, sun: sun.intensity, rim: rim.intensity, bloom: bloomPass ? bloomPass.strength : 0.5 };
  atmoK = 0; fx = [];
  // Skulptur über der Grube: ineinander drehende Ringe um einen leuchtenden Kern
  if (m.sculpture) {
    const g = new THREE.Group(); g.position.set(m.sculpture[0], m.sculpture[1] + 6.5, m.sculpture[2]);
    const metal = new THREE.MeshStandardMaterial({ color: 0xb8c0c8, metalness: 0.95, roughness: 0.22, envMapIntensity: 1.4 });
    const edge = new THREE.MeshBasicMaterial({ color: 0x5fe8ff, toneMapped: false });
    for (let k = 0; k < 5; k++) {
      const r = 1.6 + k * 0.85, ring = new THREE.Group();
      ring.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.16 + k * 0.035, 10, 48), metal));
      const glowR = new THREE.Mesh(new THREE.TorusGeometry(r + 0.21 + k * 0.035, 0.035, 6, 48), edge); ring.add(glowR);
      for (let j = 0; j < 3 + k; j++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.9), metal); const a = j / (3 + k) * Math.PI * 2; b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); b.rotation.z = a; ring.add(b); }
      ring.rotation.set(Math.random() * 3, Math.random() * 3, 0); g.add(ring);
      fx.push({ o: ring, kind: 'ring', spin: (k % 2 ? -1 : 1) * (0.18 + k * 0.07) });
    }
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.0, 2), new THREE.MeshBasicMaterial({ color: 0xbff8ff, toneMapped: false })); g.add(core);
    const halo = new THREE.Sprite(glowMat(0x5fe8ff, 0.45)); halo.scale.setScalar(7); g.add(halo);
    life!.add(g);
  }
  // Hologramme: Gitterkugel mit Ring, Doppelring, Lichtvorhang
  for (const h of m.holos || []) {
    const add = new THREE.MeshBasicMaterial({ color: h.col, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    const g = new THREE.Group(); g.position.set(h.p[0], h.p[1], h.p[2]);
    if (h.kind === 'sphere') {
      g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(h.r, 2), new THREE.MeshBasicMaterial({ color: h.col, wireframe: true, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(h.r * 1.25, h.r * 0.03, 6, 64), add); ring.rotation.x = Math.PI / 2; g.add(ring);
      fx.push({ o: g, kind: 'holo', spin: 0.35 });
    } else if (h.kind === 'ring') {
      for (let k = 0; k < 2; k++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(h.r * (1 - k * 0.3), h.r * 0.04, 6, 72), add); ring.rotation.x = Math.PI / 2 + k * 0.5; g.add(ring); }
      fx.push({ o: g, kind: 'holo', spin: -0.25 });
    } else {
      // Lichtvorhang: fallende Leuchtstreifen (Bild mit senkrechten Strichen, das nach unten wandert)
      const c = document.createElement('canvas'); c.width = 128; c.height = 256; const x = c.getContext('2d')!;
      x.fillStyle = '#000'; x.fillRect(0, 0, 128, 256);
      for (let k = 0; k < 18; k++) { const px = Math.random() * 128, len = 40 + Math.random() * 160, py = Math.random() * 256; const gr = x.createLinearGradient(0, py, 0, py + len); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(px, py, 2 + Math.random() * 2, len); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      const mat = new THREE.MeshBasicMaterial({ map: t, color: h.col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(h.w || 6, h.h || 10), mat); pl.rotation.y = h.yaw || 0; g.add(pl);
      fx.push({ o: g, kind: 'curtain', spin: 0, tex: t });
    }
    life!.add(g);
  }
}
function updateNeon(dt: number, st: Station, visible: boolean, near: boolean) {
  const m = meta(CITY.name), bd = m.bounds || { x: 210, z0: -255, z1: 240 };
  tNeon += dt; kitHoloFlicker(tNeon);
  // Atmosphäre nach Lage der Kamera
  const pl = st.mesh.worldToLocal(_w.copy(camera.position));
  const inside = visible && Math.abs(pl.x) < bd.x && pl.z > bd.z0 && pl.z < bd.z1 && pl.y < 120;
  const want = inside ? Math.min(1, Math.max(0, (120 - pl.y) / 60)) : 0;
  const k = atmoK + (want - atmoK) * Math.min(1, dt * 1.5);
  if (IN.active) { if (atmoK > 0) { setSkyDusk(0); scene.environmentIntensity = 1; if (atmoBase) rim.intensity = atmoBase.rim; const fog = scene.fog as THREE.FogExp2 | null; if (fog && atmoBase) { fog.color.setHex(atmoBase.fogC); fog.density = atmoBase.fogD; } if (bloomPass && atmoBase) bloomPass.strength = atmoBase.bloom; } atmoK = 0; return; }
  if (Math.abs(k - atmoK) > 1e-4 || (k > 0 && k === atmoK)) setAtmo(k);
  atmoK = k < 1e-3 ? 0 : k;
  if (!visible || !near) return;
  // Skulptur und Hologramme
  for (const f of fx) {
    if (f.kind === 'ring') { f.o.rotation.x += dt * f.spin; f.o.rotation.y += dt * f.spin * 0.6; }
    else if (f.kind === 'holo') { f.o.rotation.y += dt * f.spin; f.o.visible = Math.random() > 0.015; }
    else if (f.kind === 'curtain' && f.tex) f.tex.offset.y += dt * 0.35;
  }
  // Dampf aus den Schächten in der Nähe
  if ((steamT -= dt) <= 0 && m.steam?.length) {
    steamT = 0.08;
    for (let i = 0; i < 2; i++) {
      const s = m.steam[Math.floor(Math.random() * m.steam.length)];
      if (Math.hypot(s[0] - pl.x, s[1] - pl.z) > 90) continue;
      const w = toWorld(st, s[0] + (Math.random() - 0.5) * 0.8, 0.4, s[1] + (Math.random() - 0.5) * 0.8);
      puff(w.x, w.y, w.z, (Math.random() - 0.5) * 0.4, 1.2 + Math.random() * 1.2, (Math.random() - 0.5) * 0.4, '#8a92a0', 3.2);
    }
  }
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
