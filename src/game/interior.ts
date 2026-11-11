import * as THREE from 'three';
import { scene, camera, view, ux, gl, setExposure } from '../core/engine';
import { texMat, std, boxUV } from '../core/textures';
import { keys, mouse } from '../core/input';
import { rng, hashStr, clamp, fmtN } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, stats, cargoUsed, settings } from './state';
import type { Station } from './world';
import { SHIP } from './player';
import { buildShipModel, type ShipModel } from '../models/playerShips';
import { shipsAt, board } from './fleet';
import { SHIPS, hasInterior } from '../data/ships';
import { SECTORS, FACTION } from '../data/galaxy';
import type { Paint } from '../models/gltfShips';
import { hasChar, charInstance, animInit, animStep, animTalk, type CharAnim } from '../models/charModels';
import { buildShipRoom, type ShipRoom, type ShipSpot } from './shipInterior';
import { computeStats, type ShipId, type Up } from '../data/ships';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { SECTOR } from '../data/galaxy';
import { sectorOres } from '../data/ores';
import { world } from './world';
import { saveGame } from './state';
import { hasMeshRoom, meshRoomReady, loadMeshRoom, buildMeshRoom, interiorEnv } from './meshRoom';

// =====================================================================================
// Begehbare Stationen: Hangar → Korridor → Promenade, in der Ego-Ansicht.
// Der Innenraum steht an der Startöffnung der Station; durch das Kraftfeld des Hangars sieht man den echten Sektor.
// =====================================================================================

type Rect = [number, number, number, number]; // x0, x1, z0, z1
interface Inter { x: number; z: number; r: number; label: () => string; act: () => void }
interface Label { p: THREE.Vector3; text: string; col: string }
interface Person { g: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group; head: THREE.Object3D; mixer?: THREE.AnimationMixer; walk?: THREE.AnimationAction | null; idle?: THREE.AnimationAction | null; moving?: boolean; anim?: CharAnim }
interface Walker { p: Person; path: number[][]; i: number; x: number; z: number; ph: number; wait: number; rest: boolean }

export const interiorHooks = {
  openTab: (_tab: string, _note: string) => {},
  undock: () => {},
  openMap: () => {},
  pause: () => {},
  tabs: () => [] as string[],
  takeoff: () => {},     // Planet: vom Pilotensitz aus abheben
  toRover: () => {},     // Planet: über die Rampe zurück zum Rover
};
export const IN = {
  active: false, station: null as Station | null, locked: false,
  x: 0, z: 0, yaw: 0, pitch: 0, bob: 0, dist: 0, area: 'Hangardeck',
  fy: 0,   // Bodenhöhe (nur in Innenräumen aus Modellen mit mehreren Decks ≠ 0)
  jy: 0, jv: 0,   // Sprung: Höhe über dem Boden und Geschwindigkeit nach oben
  target: null as Inter | null,
  say: { who: '', text: '', t: 0 },
  ship: null as null | { cls: string; uid: number; name: string; ctx: 'hangar' | 'planet' },
  panel: null as null | { title: string; lines: any[]; x: number; z: number },
};

// ---------- Maße (lokal: +Z zeigt aus dem Hangartor in den Raum, Boden bei y = 0) ----------
const HW = 92, HZ0 = -50, HZ1 = 112, HH = 42, DW = 62, DH = 32;  // Hangar (184 × 162 × 42 m, Platz für drei große Schiffe), Tor
const PADX = 60, PADZ = 28;                                      // Stellplätze: Mitte und ±PADX, Schiffsmitte bei PADZ
const CW = 3, CL = 12, CH = 4.6;                                 // Korridor
const PZ1 = HZ0 - CL;                                            // Promenade beginnt hier
const PROM = { station: { w: 15, d: 48, h: 8 }, carrier: { w: 13, d: 44, h: 6.5 }, outpost: { w: 11, d: 40, h: 5.6 } };
const PAL = {
  station: { accent: 0x3fb7a0, css: '#3fb7a0', wall: 0x9a9ea6, floor: 0x7a7e86, hall: 'Promenade' },
  carrier: { accent: 0xd9822b, css: '#ffb347', wall: 0x80848c, floor: 0x666a72, hall: 'Hauptdeck' },
  outpost: { accent: 0xe0b030, css: '#e0b030', wall: 0x948c80, floor: 0x726a60, hall: 'Gemeinschaftsraum' },
};
const TAB_N: Record<string, string> = { markt: 'Markt', raffinerie: 'Raffinerie', auftraege: 'Aufträge', missionen: 'Missionen', lager: 'Lager', hangar: 'Hangar', werft: 'Werft', werkstatt: 'Werkstatt', service: 'Service', info: 'Auskunft' };
const GREET: Record<string, string> = {
  markt: 'Zeig her, was du im Frachtraum hast. Oder suchst du Ware?',
  raffinerie: 'Die Öfen laufen. Was soll eingeschmolzen werden?',
  auftraege: 'Wir haben immer Bedarf. Schau dir die Aufträge an.',
  missionen: 'Wir suchen verlässliche Piloten. Hier sind die Missionen unserer Fraktion.',
  lager: 'Dein Lagerabteil ist bei uns sicher.',
  werft: 'Auf der Suche nach einem neuen Schiff?',
  werkstatt: 'Was sollen wir an deinem Schiff verbessern?',
  service: 'Reparatur, Munition, Sprengladungen. Alles da.',
  info: 'Willkommen an Bord. Frag, was du wissen willst.',
  hangar: 'Deine Schiffe stehen bereit.',
};
const NAMES = ['Mira', 'Jonte', 'Ansgar', 'Leta', 'Corvin', 'Ilka', 'Tamo', 'Brann', 'Sefa', 'Okko', 'Runa', 'Henrik', 'Yara', 'Falk', 'Edda', 'Marek', 'Tilda', 'Bosse', 'Nele', 'Arvid', 'Kaja', 'Lorenz'];

// ---------- Laufzeitdaten des aktuellen Innenraums ----------
let group: THREE.Group | null = null, stationGroup: THREE.Group | null = null;
let rects: Rect[] = [], obstacles: Rect[] = [], shipObs: Rect[] = [];
let inters: Inter[] = [], shipInters: Inter[] = [];
let labels: Label[] = [], shipLabels: Label[] = [];
let persons: { p: Person; x: number; z: number; face: number; name?: string }[] = [], walkers: Walker[] = [];
let parked: { m: ShipModel; uid: number }[] = [];
let field: THREE.Mesh | null = null, holo: THREE.Object3D | null = null, standGroup: THREE.Group | null = null;
let shipPad = { y: 0, z: 4 };
let dims = PROM.station, kind: 'station' | 'carrier' | 'outpost' = 'station';
const disposables: (THREE.Material | THREE.Texture)[] = [];
let room: ShipRoom | null = null, roomModel: THREE.Object3D | null = null, outsideEnv: THREE.Texture | null = null;
let mesh: ReturnType<typeof buildMeshRoom> = null, boarding = false;   // Innenraum aus einem Modell (Laufkarte statt Rechtecke)
let saved: null | { group: THREE.Group | null; rects: Rect[]; obstacles: Rect[]; shipObs: Rect[]; inters: Inter[]; shipInters: Inter[]; labels: Label[]; shipLabels: Label[]; x: number; z: number; yaw: number; lamps: [THREE.Vector3, number, number][] } = null;

// Drei feste Lichter (immer in der Szene, außerhalb mit Stärke 0 – so müssen keine Shader neu gebaut werden)
const lamps = [0, 1, 2].map(() => { const l = new THREE.PointLight(0xfff0dc, 0, 100, 0); scene.add(l); return l; });

// ---------- Bau-Helfer ----------
function box(parent: THREE.Object3D, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
function signTex(text: string, bg: string, fg = '#0c0d10') {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 104;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, 512, 104);
  g.fillStyle = fg; g.font = '700 58px "Share Tech Mono",Consolas,monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text.toUpperCase(), 256, 56);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  disposables.push(t);
  return t;
}
function mat<T extends THREE.Material>(m: T) { disposables.push(m); if ((m as any).isMeshStandardMaterial) (m as any).envMapIntensity = 0.3; return m; }

const WALK_V = 1.5;   // Gehtempo der Leute in den Stationen (m/s)
// KI-Figur mit Skelett, falls geladen (Händler stehen, Arbeiter laufen); sonst die einfache Figur aus Grundformen
function buildPerson(suit: number, skin: number, hair: number, badge: number, role: 'idle' | 'walk' = 'idle'): Person {
  const cn = role === 'walk' ? 'worker' : 'merchant';
  if (hasChar(cn)) {
    const c = charInstance(cn, 0.85 + Math.random() * 0.2);
    c.g.traverse((o: any) => { if (o.isMesh) { o.userData.shared = true; if (o.material !== undefined) disposables.push(o.material); } });
    const d = () => new THREE.Group();
    animInit(c.anim, role === 'walk');
    return { g: c.g, legL: d(), legR: d(), armL: d(), armR: d(), head: d(), mixer: c.mixer, walk: c.walk, idle: c.idle, moving: role === 'walk', anim: c.anim };
  }
  const g = new THREE.Group();
  const ms = mat(std(suit, { flatShading: false, roughness: 0.85, metalness: 0.05 }));
  const mk = mat(std(skin, { flatShading: false, roughness: 0.9, metalness: 0 }));
  const mh = mat(std(hair, { flatShading: false, roughness: 0.9, metalness: 0 }));
  const limb = (r: number, len: number, x: number, y: number, m: THREE.Material) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.85, len, 8), m); c.position.y = -len / 2; pivot.add(c);
    g.add(pivot);
    return pivot;
  };
  const legL = limb(0.105, 0.86, -0.12, 0.88, ms), legR = limb(0.105, 0.86, 0.12, 0.88, ms);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.21, 0.42, 4, 10), ms); torso.position.y = 1.2; g.add(torso);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.02), mat(new THREE.MeshBasicMaterial({ color: badge }))); b.position.set(0.09, 1.36, 0.2); g.add(b);
  const armL = limb(0.07, 0.62, -0.3, 1.47, ms), armR = limb(0.07, 0.62, 0.3, 1.47, ms);
  const head = new THREE.Group(); head.position.y = 1.64; g.add(head);
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.135, 14, 10), mk); head.add(face);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mh); hr.position.set(0, 0.015, -0.02); head.add(hr);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), mat(new THREE.MeshBasicMaterial({ color: 0x101010 }))); e.position.set(s * 0.05, 0.01, 0.125); head.add(e); }
  return { g, legL, legR, armL, armR, head };
}

// ---------- Innenraum aufbauen ----------
function build(st: Station) {
  kind = st.kind;
  dims = PROM[kind];
  const pal = PAL[kind], R = rng(hashStr(st.id + ':innen'));
  const { w: PW, d: PD, h: PH } = dims, PZ0 = PZ1 - PD;
  const g = new THREE.Group(), S = new THREE.Group(), deco = new THREE.Group();
  g.add(S, deco);
  // Materialien
  const mFloor = mat(texMat(pal.floor, 'hull_mil', { roughness: 0.85, metalness: 0.25 }));
  const mWall = mat(texMat(pal.wall, 'hull_light', { roughness: 0.7, metalness: 0.2 }));
  const mDark = mat(texMat(0x4a4e56, 'hull_mil', { roughness: 0.7, metalness: 0.5 }));
  const mCeil = mat(texMat(0x34383e, 'hull_mil', { roughness: 0.9, metalness: 0.3 }));
  const mHall = mat(texMat(kind === 'outpost' ? 0x8a8070 : 0x8e949c, 'hull_light', { roughness: 0.75, metalness: 0.15 }));
  const mLight = mat(new THREE.MeshBasicMaterial({ color: 0xfff2dc }));
  const mAccent = mat(new THREE.MeshBasicMaterial({ color: pal.accent }));
  const mYellow = mat(new THREE.MeshBasicMaterial({ color: 0xc89a20 }));
  const mGlass = mat(new THREE.MeshStandardMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.6, depthWrite: false }));
  const mGreen = mat(std(0x3a7a44, { roughness: 0.9, metalness: 0 }));
  rects = []; obstacles = []; inters = []; labels = []; persons = []; walkers = [];
  const block = (x0: number, x1: number, z0: number, z1: number) => obstacles.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]);

  // ===== Hangar =====
  const HL = HZ1 - HZ0, HC = (HZ0 + HZ1) / 2;
  box(S, mFloor, HW * 2, 0.5, HL, 0, -0.25, HC);
  box(S, mCeil, HW * 2, 0.5, HL, 0, HH + 0.25, HC);
  for (const s of [-1, 1]) {
    box(S, mWall, 0.6, HH, HL, s * (HW + 0.3), HH / 2, HC);
    box(deco, mAccent, 0.1, 0.5, HL, s * (HW - 0.06), 1.4, HC);
    box(deco, mLight, 0.1, 0.25, HL - 8, s * (HW - 0.06), 9, HC);
    // Rückwand links/rechts der Tür, Torrahmen
    box(S, mWall, HW - CW, HH, 0.6, s * (HW + CW) / 2, HH / 2, HZ0 - 0.3);
    box(S, mDark, HW - DW, HH, 1.2, s * (HW + DW) / 2, HH / 2, HZ1 + 0.6);
    box(deco, mAccent, 0.4, DH, 0.4, s * DW, DH / 2, HZ1 - 0.1);
    // Stützpfeiler
    for (let z = HZ0 + 14; z < HZ1 - 6; z += 22) box(S, mDark, 1.6, HH, 1.6, s * (HW - 0.8), HH / 2, z);
  }
  box(S, mWall, CW * 2, HH - CH, 0.6, 0, (HH + CH) / 2, HZ0 - 0.3);
  box(S, mDark, DW * 2, HH - DH, 1.2, 0, (HH + DH) / 2, HZ1 + 0.6);
  box(deco, mAccent, DW * 2, 0.4, 0.4, 0, DH, HZ1 - 0.1);
  // Kraftfeld im Tor
  field = new THREE.Mesh(new THREE.PlaneGeometry(DW * 2, DH), mat(new THREE.MeshBasicMaterial({ color: 0x60b8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })));
  field.position.set(0, DH / 2, HZ1);
  deco.add(field);
  // Deckenlichter und Bodenmarkierungen
  for (const x of [-75, -45, -15, 15, 45, 75]) box(deco, mLight, 1.6, 0.15, HL - 16, x, HH - 0.1, HC);
  for (let z = HZ0 + 10; z < HZ1; z += 20) box(S, mDark, HW * 2, 1.2, 1.2, 0, HH - 0.6, z);
  for (const px of [-PADX, 0, PADX]) {
    const hw = px ? 26 : 30, z0 = PADZ - 52, z1 = PADZ + 52;
    for (const s of [-1, 1]) box(deco, mYellow, 0.25, 0.02, z1 - z0, px + s * hw, 0.011, (z0 + z1) / 2);
    box(deco, mYellow, hw * 2, 0.02, 0.25, px, 0.011, z0);
    box(deco, mYellow, hw * 2, 0.02, 0.25, px, 0.011, z1);
  }
  box(deco, mAccent, 0.5, 0.02, 12, 0, 0.012, HZ0 + 7);
  // Kisten und Tanks an den Wänden
  const crateCols = [0xc0604a, 0x4a80c0, 0xe0b850, 0x5fa06a, 0xb0b4ba];
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const z = HZ0 + 6 + i * 26 + R.range(-3, 3), x = s * (HW - 3.2), n = 1 + Math.floor(R.next() * 3);
    const cm = mat(texMat(R.pick(crateCols), 'hull_light', { roughness: 0.75 }));
    for (let k = 0; k < n; k++) box(S, cm, 2.2, 2.2, 2.2, x - s * (k === 2 ? 2.4 : 0), 1.1 + (k === 1 ? 2.2 : 0), z);
    block(x - s * 3.8, x + s * 1.3, z - 1.3, z + 1.3);
    if (i % 2 === 0) {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 5, 14), mDark); t.position.set(x, 2.5, z + 6); S.add(t);
      block(x - 1.5, x + 1.5, z + 4.5, z + 7.5);
    }
  }
  // Hangar-Terminal mit Deckmeister
  const nm = [...NAMES].sort(() => R.next() - 0.5);
  {
    const tx = 9, tz = HZ0 + 2.2;
    box(S, mDark, 3, 1.15, 0.9, tx, 0.575, tz);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), mat(new THREE.MeshBasicMaterial({ map: signTex('Hangar', pal.css) })));
    scr.position.set(tx, 2.9, HZ0 + 0.05); deco.add(scr);
    block(tx - 1.6, tx + 1.6, HZ0, tz + 0.6);
    const p = buildPerson(0x4a5a6a, 0xd8a888, 0x2a2018, pal.accent);
    p.g.position.set(tx + 3, 0, tz + 0.4); deco.add(p.g);
    const name = nm.pop()!;
    persons.push({ p, x: tx + 3, z: tz + 0.4, face: 0, name });
    labels.push({ p: new THREE.Vector3(tx + 3, 2.0, tz + 0.4), text: `${name} · Hangar`, col: pal.css });
    inters.push({ x: tx + 1.5, z: tz + 2, r: 3.4, label: () => `${name} ansprechen · Hangar`, act: () => talk(name, 'hangar') });
  }
  rects.push([-HW, HW, HZ0, HZ1 - 1.5]);

  // ===== Korridor =====
  const CC = HZ0 - CL / 2;
  box(S, mFloor, CW * 2, 0.5, CL + 1.2, 0, -0.25, CC);
  box(S, mCeil, CW * 2, 0.5, CL + 1.2, 0, CH + 0.25, CC);
  for (const s of [-1, 1]) {
    box(S, mWall, 0.6, CH, CL, s * (CW + 0.3), CH / 2, CC);
    box(deco, mAccent, 0.08, 0.3, CL, s * (CW - 0.05), 1.2, CC);
  }
  box(deco, mLight, 0.5, 0.08, CL - 2, 0, CH - 0.05, CC);
  rects.push([-CW, CW, PZ1 - 2, HZ0 + 2]);

  // ===== Promenade =====
  const PC = (PZ0 + PZ1) / 2, WW = PW - 5, WY0 = 1.5, WY1 = PH - 1.4;
  box(S, mHall, PW * 2, 0.5, PD, 0, -0.25, PC);
  box(S, mCeil, PW * 2, 0.5, PD, 0, PH + 0.25, PC);
  for (const s of [-1, 1]) {
    box(S, mWall, 0.6, PH, PD, s * (PW + 0.3), PH / 2, PC);
    box(S, mWall, PW - CW, PH, 0.6, s * (PW + CW) / 2, PH / 2, PZ1 + 0.3);
    box(S, mWall, PW - WW, PH, 0.6, s * (PW + WW) / 2, PH / 2, PZ0 - 0.3);
    box(deco, mAccent, 0.1, 0.35, PD, s * (PW - 0.06), PH - 0.9, PC);
  }
  box(S, mWall, CW * 2, PH - CH, 0.6, 0, (PH + CH) / 2, PZ1 + 0.3);
  box(S, mWall, WW * 2, WY0, 0.6, 0, WY0 / 2, PZ0 - 0.3);
  box(S, mWall, WW * 2, PH - WY1, 0.6, 0, (PH + WY1) / 2, PZ0 - 0.3);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW * 2, WY1 - WY0), mGlass); glass.position.set(0, (WY0 + WY1) / 2, PZ0 - 0.1); deco.add(glass);
  for (let x = -WW; x <= WW + 0.1; x += WW / 3) box(S, mDark, 0.35, WY1 - WY0, 0.5, x, (WY0 + WY1) / 2, PZ0 - 0.1);
  for (let z = PZ0 + 6; z < PZ1 - 2; z += 9) {
    box(deco, mLight, PW * 1.1, 0.1, 0.5, 0, PH - 0.06, z);
    box(S, mDark, PW * 2, 0.5, 0.6, 0, PH - 0.25, z + 4.5);
  }
  rects.push([-PW, PW, PZ0, PZ1]);

  // Stände: links Handel, rechts Technik
  const tabs = interiorHooks.tabs().filter(t => t !== 'hangar');
  const left = tabs.filter(t => ['markt', 'raffinerie', 'auftraege', 'lager'].includes(t)), right = tabs.filter(t => !left.includes(t));
  const suits = [0x8a5a3a, 0x3a5a8a, 0x5a7a4a, 0x7a4a6a, 0x4a6a7a, 0x8a7a3a], skins = [0xe0b090, 0xc89070, 0x9a6a4a, 0xf0c8a8, 0x7a5238], hairs = [0x1a1410, 0x4a3020, 0x8a6a40, 0x909090, 0x2a2a30];
  const goods: Record<string, number[]> = { markt: [0xd9822b, 0xbfe6ff, 0xe8664a], raffinerie: [0xc4c8d0, 0xff9a6a, 0xc8dcff], auftraege: [0xe8e2d6], missionen: [0x7cc4ff, 0xffb347], lager: [0x8a8f9a, 0x5a6068], werft: [0x6a9ad8], werkstatt: [0xffb347, 0x9aa0a8], service: [0xff6b5b, 0xffd27a], info: [0x7cc4ff] };
  for (const [list, s] of [[left, -1], [right, 1]] as const) {
    list.forEach((tab, i) => {
      const z = list.length === 1 ? PC : PZ1 - 9 - i * ((PD - 18) / (list.length - 1));
      const wx = s * PW, name = nm.pop() || 'Kim';
      box(S, mDark, 0.4, 3.4, 5.4, wx - s * 0.2, 1.7, z);
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.93), mat(new THREE.MeshBasicMaterial({ map: signTex(TAB_N[tab], pal.css) })));
      sg.position.set(wx - s * 0.45, 3.9, z); sg.rotation.y = -s * Math.PI / 2; deco.add(sg);
      box(S, mDark, 1, 1.1, 4.6, wx - s * 3, 0.55, z);
      box(deco, mAccent, 1.06, 0.05, 4.66, wx - s * 3, 1.13, z);
      box(deco, mLight, 0.5, 0.06, 4, wx - s * 2, 3.3, z);
      box(S, mDark, 2.6, 0.12, 5.2, wx - s * 1.6, 3.38, z);
      (goods[tab] || [0xaaaaaa]).forEach((c, k) => box(deco, mat(std(c, { roughness: 0.6 })), 0.24, 0.2, 0.24, wx - s * 3.15, 1.25, z + (k % 2 ? 1 : -1) * (1.3 + Math.floor(k / 2) * 0.4)));
      block(wx - s * 3.6, wx, z - 2.5, z + 2.5);
      const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent);
      p.g.position.set(wx - s * 1.6, 0, z); p.g.rotation.y = -s * Math.PI / 2; deco.add(p.g);
      persons.push({ p, x: wx - s * 1.6, z, face: -s * Math.PI / 2, name });
      labels.push({ p: new THREE.Vector3(wx - s * 1.6, 2.0, z), text: `${name} · ${TAB_N[tab]}`, col: pal.css });
      inters.push({ x: wx - s * 4.4, z, r: 3.2, label: () => `${name} ansprechen · ${TAB_N[tab]}`, act: () => talk(name, tab) });
    });
  }
  // Holo-Tisch mit Galaxiekarte
  {
    const hz = PC + 2;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.9, 20), mDark); base.position.set(0, 0.45, hz); S.add(base);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 6, 32), mAccent); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.92, hz); deco.add(ring);
    const h = new THREE.Group(); h.position.set(0, 1.5, hz);
    const pos: number[] = [], col: number[] = [], c = new THREE.Color();
    for (const sec of SECTORS) { pos.push((sec.map[0] - 500) / 400, ((hashStr(sec.id) % 100) / 100 - 0.5) * 0.3, (sec.map[1] - 300) / 400); c.set(FACTION[sec.faction].c); col.push(c.r, c.g, c.b); }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    h.add(new THREE.Points(pg, mat(new THREE.PointsMaterial({ size: 0.05, vertexColors: true, opacity: 0.8, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }))));
    const lp: number[] = [];
    for (const sec of SECTORS) for (const l of sec.links) { if (sec.id > l) continue; const o = SECTORS.find(x => x.id === l)!; lp.push((sec.map[0] - 500) / 400, 0, (sec.map[1] - 300) / 400, (o.map[0] - 500) / 400, 0, (o.map[1] - 300) / 400); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    h.add(new THREE.LineSegments(lg, mat(new THREE.LineBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }))));
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.3, 1.1, 20, 1, true), mat(new THREE.MeshBasicMaterial({ color: pal.accent, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })));
    cone.position.set(0, 1.45, hz); deco.add(cone);
    deco.add(h); holo = h;
    block(-1.9, 1.9, hz - 1.9, hz + 1.9);
    labels.push({ p: new THREE.Vector3(0, 2.6, hz), text: 'Galaxiekarte', col: '#7cc4ff' });
    inters.push({ x: 0, z: hz, r: 4, label: () => 'Galaxiekarte öffnen', act: () => interiorHooks.openMap() });
  }
  // Bänke und Pflanzkübel
  for (const s of [-1, 1]) {
    const bz = PZ0 + 5;
    box(S, mDark, 4, 0.45, 1, s * (WW - 3.5), 0.225, bz); block(s * (WW - 3.5) - 2.1, s * (WW - 3.5) + 2.1, bz - 0.6, bz + 0.6);
    for (const pz of [PZ1 - 2.5, PZ0 + 2.2]) {
      const px = s * (pz > PC ? CW + 3 : PW - 2);
      box(S, mDark, 1.4, 0.8, 1.4, px, 0.4, pz);
      const bush = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.8, 7), mGreen); bush.position.set(px, 1.7, pz); deco.add(bush);
      block(px - 0.8, px + 0.8, pz - 0.8, pz + 0.8);
    }
  }
  // Leute, die unterwegs sind
  const lx = PW - 6.2, loop = [[-lx, PZ1 - 5], [-lx, PZ0 + 8], [lx, PZ0 + 8], [lx, PZ1 - 5]];
  const mkWalker = (path: number[][], start: number) => {
    const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent, 'walk');
    deco.add(p.g);
    walkers.push({ p, path, i: start % path.length, x: path[start % path.length][0], z: path[start % path.length][1], ph: R.range(0, 6), wait: 0, rest: false });
  };
  for (let i = 0; i < (kind === 'outpost' ? 2 : 4); i++) mkWalker(i % 2 ? [...loop].reverse() : loop, i);
  mkWalker([[-30, HZ0 + 8], [30, HZ0 + 8], [32, -30], [-32, -30]], 0);
  mkWalker([[86, 90], [86, -40], [-86, -40], [-86, 90]], 1);

  boxUV(S, 1 / 6);
  standGroup = new THREE.Group();
  g.add(standGroup);
  return g;
}

// ---------- Schiffe im Hangar ----------
function measure(m: ShipModel) {
  const sh = m.shield, par = sh.parent;
  par?.remove(sh);
  const pos = m.g.position.clone(), rot = m.g.rotation.clone();
  m.g.position.set(0, 0, 0); m.g.rotation.set(0, 0, 0); m.g.updateMatrixWorld(true);
  // nur der Rumpf: Triebwerksglühen und andere Leuchteffekte zählen nicht (sonst schwebt das Schiff)
  const skip = new Set<THREE.Object3D>(m.glows), b = new THREE.Box3(), bb = new THREE.Box3();
  m.g.traverse((o: any) => {
    if (!o.isMesh || o.isSprite) return;
    for (let q: THREE.Object3D | null = o; q; q = q.parent) if (skip.has(q)) return;
    if (o.material?.blending === THREE.AdditiveBlending) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    b.union(bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
  });
  if (b.isEmpty()) b.setFromObject(m.g);
  par?.add(sh);
  m.g.position.copy(pos); m.g.rotation.copy(rot);
  return b;
}
function disposeParked() {
  for (const p of parked) { scene.remove(p.m.g); p.m.g.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); }); }
  parked = [];
}
// Setzt ein Schiffsmodell auf einen Stellplatz (lokale Koordinaten), Bug zum Tor
function park(m: ShipModel, px: number, pz: number, name: string, cls: string, onUse: Inter) {
  const b = measure(m), y = -b.min.y + 0.02, w = b.max.x - b.min.x, l = b.max.z - b.min.z;   // steht auf dem Hangarboden (Fahrwerk oder Rumpf)
  const wp = group!.localToWorld(new THREE.Vector3(px, y, pz));
  m.g.position.copy(wp);
  m.g.rotation.set(0, group!.rotation.y + Math.PI, 0);
  m.g.visible = true;
  for (const gl2 of m.glows) gl2.visible = false;
  // Sperrzone unter dem Rumpf: kleine Schiffe nur der schmale Mittelteil (unter den Flügeln kann man durch), große Schiffe breiter
  const hw = Math.max(1.2, w * (w > 30 ? 0.3 : 0.16)), hl = l * 0.44;
  shipObs.push([px - hw, px + hw, pz - hl, pz + hl]);
  shipLabels.push({ p: new THREE.Vector3(px, y + (b.max.y - b.min.y) / 2 + 1.5, pz), text: `${name} · ${cls}`, col: '#e8e2d6' });
  onUse.x = px; onUse.z = pz; onUse.r = Math.max(hw, hl) + 3.5;
  (onUse as any).box = [px - hw, px + hw, pz - hl, pz + hl];
  shipInters.push(onUse);
  return y;
}
export function refreshHangarShips() {
  if (!IN.active || !group) return;
  disposeParked();
  shipObs = []; shipLabels = []; shipInters = [];
  while (standGroup!.children.length) { const c = standGroup!.children[0] as THREE.Mesh; standGroup!.remove(c); c.geometry.dispose(); }
  const st = IN.station!;
  shipPad.z = PADZ;
  shipPad.y = park(SHIP, 0, shipPad.z, P.shipName, SHIPS[P.cls].role, { x: 0, z: 0, r: 0, label: () => hasInterior(P.cls) ? `An Bord der ${P.shipName} gehen` : `In die ${P.shipName} steigen und ablegen`, act: () => hasInterior(P.cls) ? enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'hangar' }, SHIP) : interiorHooks.undock() });
  const others = shipsAt(st.id).slice(0, 2);
  others.forEach((r, i) => {
    const m = buildShipModel(r.cls, (r.paint || 'Orange') as Paint);
    scene.add(m.g);
    parked.push({ m, uid: r.uid });
    park(m, i ? PADX : -PADX, PADZ, r.name, SHIPS[r.cls].role, {
      x: 0, z: 0, r: 0, label: () => hasInterior(r.cls) ? `An Bord der ${r.name} gehen` : `Auf die ${r.name} umsteigen`,
      act: () => {
        if (hasInterior(r.cls)) { enterShip({ cls: r.cls, uid: r.uid, name: r.name, ctx: 'hangar' }, m); return; }
        // kleiner Flieger: direkt umsteigen
        if (board(r, { sector: P.sector, station: st.id })) { say('SYSTEM', `Du bist auf die ${P.shipName} umgestiegen.`); snd(400, 0.4, 'sine', 0.05, 300); refreshHangarShips(); }
      },
    });
  });
}
// ---------- Start und Landung im Hangar ----------
// Start: abheben, Fahrwerk einziehen, durchs Tor fliegen (das Tor liegt genau am Startpunkt der Station). Landung: umgekehrt.
const SEQ = { t: -1, dur: 0, dir: 1, done: null as null | (() => void), gear: true };
export const hangarSequence = () => SEQ.t >= 0;
const seqP = () => { const q = clamp(SEQ.t / SEQ.dur, 0, 1); return SEQ.dir > 0 ? q : 1 - q; };   // 0 = auf dem Platz, 1 = im Tor
const ease = (x: number) => x * x * (3 - 2 * x);
function seqOffset() {
  const q = seqP(), fw = clamp((q - 0.2) / 0.8, 0, 1);
  return { y: (DH / 2 - shipPad.y) * ease(clamp(q / 0.42, 0, 1)), z: (HZ1 - shipPad.z) * fw * fw };
}
export const hangarGearDown = () => SEQ.t < 0 || seqP() < 0.3;
function beginSeq(dir: number, dur: number, done: null | (() => void)) {
  SEQ.t = 0; SEQ.dur = dur; SEQ.dir = dir; SEQ.done = done; SEQ.gear = dir > 0;   // Start: Fahrwerk noch draußen, Landung: noch eingezogen
  IN.panel = null; IN.target = null;
  G.mode = 'launch';
  if (document.pointerLockElement === gl) { IN.locked = false; document.exitPointerLock(); }
  for (const g2 of SHIP.glows) g2.visible = true;
  sfx('launch', dir > 0 ? 0.7 : 0.45, dir > 0 ? 1 : 0.85, () => snd(300, 0.6, 'sawtooth', 0.05, dir > 0 ? 500 : -300));
}
export function startLaunch(done: () => void) {
  if (!IN.active || !IN.station || SEQ.t >= 0) return false;
  if (room) leaveShip();
  if (!group) return false;
  beginSeq(1, 5.5, done);
  return true;
}
export function updateHangarSequence(dt: number) {
  if (SEQ.t < 0) return;
  SEQ.t += dt;
  { const gd = hangarGearDown(); if (gd !== SEQ.gear) { SEQ.gear = gd; sfx('gear', 0.6); } }   // Fahrwerk fährt ein oder aus
  if (SEQ.t < SEQ.dur) return;
  const done = SEQ.done, dir = SEQ.dir;
  SEQ.t = -1; SEQ.done = null;
  G.mode = 'walk';
  if (dir > 0) done?.();
  else { for (const g2 of SHIP.glows) g2.visible = false; grabT = 0; sfx('touchdown', 0.7); }
}

// Das aktive Schiff jeden Frame auf dem Stellplatz halten (das Modell kann beim Umsteigen wechseln)
const _wp = new THREE.Vector3();
export function syncParkedShip() {
  if (!group) return;
  if (!IN.station) { SHIP.g.visible = !IN.ship || !!mesh; return; }   // Planet: Schiff steht auf dem Landeplatz
  if (saved) { SHIP.g.visible = !(IN.ship && IN.ship.uid === P.uid) || !!mesh; return; }   // Modell-Raum: das Schiffsmodell ist der Innenraum   // im Schiffsraum: Stationsgruppe ist gespeichert
  const so = SEQ.t >= 0 ? seqOffset() : null;
  group.localToWorld(_wp.set(0, shipPad.y + (so ? so.y : 0), shipPad.z + (so ? so.z : 0)));
  SHIP.g.position.copy(_wp);
  SHIP.g.rotation.set(0, group.rotation.y + Math.PI, 0);
  SHIP.g.visible = true;
  (SHIP.shield.material as THREE.MeshBasicMaterial).opacity = 0;
}

// ---------- Betreten / Verlassen ----------
export function enterInterior(st: Station) {
  if (IN.active) leaveInterior();
  IN.active = true; IN.station = st;
  group = build(st);
  stationGroup = group;
  const Y = st.launch.yaw, fx = -Math.sin(Y), fz = -Math.cos(Y);
  group.position.set(st.launch.x - fx * HZ1, st.launch.y - DH / 2, st.launch.z - fz * HZ1);
  group.rotation.y = Y + Math.PI;
  group.updateMatrixWorld(true);
  scene.add(group);
  st.mesh.visible = false;
  const PZ0 = PZ1 - dims.d, L = Math.PI;
  const lp: [number, number, number, number, number][] = [[0, HH - 4, PADZ, 280, 0.5], [0, dims.h - 1, (PZ0 + PZ1) / 2, 75, 0.5], [0, CH - 0.5, HZ0 - CL / 2, 22, 0.36]];
  setExposure(0.2);
  lamps.forEach((l, i) => { group!.localToWorld(l.position.set(lp[i][0], lp[i][1], lp[i][2])); l.distance = lp[i][3]; l.intensity = lp[i][4] * L; });
  refreshHangarShips();
  // Neben dem Schiff aussteigen, Blick zur Tür
  const hw = (shipObs[0][1] - shipObs[0][0]) / 2;
  IN.x = Math.min(HW - 6, hw + 5); IN.z = -30;
  IN.yaw = Math.atan2(IN.x, 20); IN.pitch = 0; IN.bob = 0; IN.dist = 0; IN.target = null;
  camera.near = 0.12; camera.updateProjectionMatrix();
  G.inside = true;
  G.mode = 'walk';
  beginSeq(-1, 4.5, null);   // Landung: das Schiff kommt durchs Tor herein und setzt auf
  say('SYSTEM', `Willkommen auf ${st.name}. Folge dem Korridor zur ${PAL[kind].hall}.`);
}
export function leaveInterior() {
  if (room) leaveShip();
  if (!IN.active) return;
  if (document.pointerLockElement === gl) document.exitPointerLock();
  disposeParked();
  clearOthers();
  stationGroup = null;
  if (group) {
    scene.remove(group);
    group.traverse((c: any) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); });
  }
  for (const d of disposables) d.dispose();
  disposables.length = 0;
  group = null; field = null; holo = null; standGroup = null;
  for (const l of lamps) l.intensity = 0;
  setExposure(1);
  if (IN.station) IN.station.mesh.visible = true;
  for (const gl2 of SHIP.glows) gl2.visible = true;
  camera.near = 0.5; camera.updateProjectionMatrix();
  IN.active = false; IN.station = null; IN.target = null; IN.say.t = 0;
  G.inside = false;
}

// ---------- Eigene Schiffe betreten ----------
type ShipInfo = NonNullable<typeof IN.ship>;
const _sv = new THREE.Vector3();
// Betritt den Innenraum eines Schiffs. Im Hangar wird der Stationsraum zwischengespeichert, auf Planeten gibt es keinen.
export function enterShip(info: ShipInfo, m: ShipModel) {
  const planet = info.ctx === 'planet', active = info.uid === P.uid;
  const rec = active ? null : P.fleet.find(f => f.uid === info.uid) || null;
  const cargo = active ? P.cargo : rec ? rec.cargo : {};
  const cap = active ? stats().cargo : rec ? computeStats(rec.cls, rec.up as Up).cargo : 0;
  // Innenraum aus dem Modell: noch nicht geladen → laden und Bescheid geben (meist längst im Hintergrund geladen)
  // Danach geht es von selbst an Bord (wenn man noch am Schiff steht); scheitert das Laden, gibt es den Standardraum.
  if (hasMeshRoom(info.cls) && !meshRoomReady(info.cls)) {
    if (boarding) return;
    boarding = true; say('SYSTEM', 'Der Innenraum wird geladen …');
    const x0 = IN.x, z0 = IN.z, mode = G.mode;
    loadMeshRoom(info.cls).then(L => {
      boarding = false;
      if (G.mode !== mode || room || Math.hypot(IN.x - x0, IN.z - z0) > 6) return;
      // läuft gerade noch das Vorladen und scheitert, zählt das nicht: dann sofort ein eigener Versuch
      if (!L && hasMeshRoom(info.cls)) { enterShip(info, m); return; }
      if (!L) say('SYSTEM', 'Der Innenraum des Modells konnte nicht geladen werden. Du betrittst den Standardraum.');
      enterShip(info, m);
    });
    return;
  }
  if (room) leaveShip();
  if (!planet) {
    saved = { group, rects, obstacles, shipObs, inters, shipInters, labels, shipLabels, x: IN.x, z: IN.z, yaw: IN.yaw, lamps: lamps.map(l => [l.position.clone(), l.distance, l.intensity] as [THREE.Vector3, number, number]) };
  } else {
    IN.active = true; IN.station = null; G.inside = true;
    camera.near = 0.12; camera.updateProjectionMatrix();
  }
  mesh = hasMeshRoom(info.cls) ? buildMeshRoom(info.cls) : null;
  room = mesh
    ? { g: mesh.g, rects: [], obstacles: [], spots: mesh.spots as any, spawn: mesh.spawn, lamps: mesh.lamps, area: mesh.area, height: 3, disposables: [] }
    : buildShipRoom(info.cls as ShipId, planet ? PAL.outpost.accent : PAL[kind].accent, cargo, cap);
  // Raum dort, wo das Schiff steht; Boden auf etwa einem Drittel der Rumpfhöhe (Modell-Räume: genau im Schiff)
  const b = measure(m);
  m.g.getWorldPosition(_sv);
  room.g.position.set(_sv.x, mesh ? _sv.y : _sv.y + b.min.y + (b.max.y - b.min.y) * 0.3, _sv.z);
  room.g.rotation.set(0, m.g.rotation.y, 0);
  room.g.updateMatrixWorld(true);
  scene.add(room.g);
  roomModel = m.g; m.g.visible = !!mesh;   // Modell-Räume: das Schiffsmodell bleibt stehen, es enthält den Innenraum
  if (mesh) { outsideEnv = scene.environment; scene.environment = interiorEnv(); }   // Spiegelungen wie in einem beleuchteten Raum
  group = room.g;
  rects = room.rects; obstacles = room.obstacles; shipObs = []; shipLabels = []; labels = []; shipInters = [];
  inters = room.spots.map(sp => Object.assign(shipInter(sp, info), { y: (sp as any).y }));
  IN.ship = info; IN.panel = null; IN.target = null;
  IN.x = room.spawn.x; IN.z = room.spawn.z; IN.yaw = room.spawn.yaw; IN.pitch = 0; IN.bob = 0; IN.fy = mesh ? mesh.spawn.y : 0; IN.jy = IN.jv = 0; walkV.x = walkV.z = 0;
  lamps.forEach((l, i) => { const q = room!.lamps[i]; room!.g.localToWorld(l.position.set(q[0], q[1], q[2])); l.distance = 22; l.intensity = mesh ? 0 : q[3] * Math.PI; });   // Modell-Räume bringen eigene Lampen mit
  setExposure(planet ? 0.5 : 0.2);
  G.mode = 'walk';
  sfx('door_open', 0.6, 1, () => snd(220, 0.5, 'sawtooth', 0.03, -120));
  say('SYSTEM', `An Bord der ${info.name}.`);
}
// Verlässt den Schiffsraum: zurück in den Hangar oder (auf Planeten) ganz aus der Ego-Ansicht
export function leaveShip() {
  if (!room) return;
  scene.remove(room.g);
  room.g.traverse((c: any) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); });   // Modell-Räume teilen die Geometrie mit der Vorlage
  mesh = null; IN.fy = 0; IN.jy = IN.jv = 0;
  for (const d of room.disposables) d.dispose();
  if (roomModel) roomModel.visible = true;
  if (outsideEnv) { scene.environment = outsideEnv; outsideEnv = null; }
  room = null; roomModel = null; IN.ship = null; IN.panel = null; IN.target = null;
  if (saved) {
    const s = saved;
    group = s.group; rects = s.rects; obstacles = s.obstacles; shipObs = s.shipObs; inters = s.inters; shipInters = s.shipInters; labels = s.labels; shipLabels = s.shipLabels;
    IN.x = s.x; IN.z = s.z; IN.yaw = s.yaw;
    lamps.forEach((l, i) => { l.position.copy(s.lamps[i][0]); l.distance = s.lamps[i][1]; l.intensity = s.lamps[i][2]; });
    setExposure(0.2);
    saved = null;
    G.mode = 'walk';
    sfx('door_close', 0.6, 1, () => snd(220, 0.5, 'sawtooth', 0.03, 120));
  } else {
    group = null;
    for (const l of lamps) l.intensity = 0;
    setExposure(1);
    camera.near = 0.5; camera.updateProjectionMatrix();
    IN.active = false; G.inside = false; IN.say.t = 0;
    if (document.pointerLockElement === gl) document.exitPointerLock();
  }
}
// Tafel (Logbuch, Scanner): Zeilen sind Text mit Farbe, Wertepaare { k, v } oder Abschnittstitel { h }
type PanelLine = [string, string] | { k: string; v: string; c?: string } | { h: string };
function openPanel(title: string, lines: PanelLine[]) { IN.panel = { title, lines, x: IN.x, z: IN.z }; sfx('ui_open', 0.5, 1, () => snd(880, 0.06, 'sine', 0.03, 200)); }
const esc = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
let shownPanel: unknown = null;
// Fenster im Stil der übrigen Oberfläche (index.html #shipPanel); wird jeden Frame mit IN.panel abgeglichen
function syncShipPanel() {
  const want = IN.active && G.mode === 'walk' ? IN.panel : null;
  if (want === shownPanel) return;
  shownPanel = want;
  const el = document.getElementById('shipPanel'); if (!el) return;
  el.classList.toggle('hidden', !want);
  if (!want) return;
  document.getElementById('spTitle')!.textContent = want.title;
  document.getElementById('spBody')!.innerHTML = (want.lines as PanelLine[]).map(l =>
    Array.isArray(l) ? (l[0] ? `<div class="spline" style="color:${l[1]}">${esc(l[0])}</div>` : '<div style="height:8px"></div>')
      : 'h' in l ? `<div class="spsec">${esc(l.h)}</div>`
        : `<div class="sprow"><span>${esc(l.k)}</span><b${l.c ? ` style="color:${l.c}"` : ''}>${esc(l.v)}</b></div>`).join('');
}
function logLines(): PanelLine[] {
  const S = stats();
  const out: PanelLine[] = [
    { k: 'Pilot', v: P.name },
    { k: 'Credits', v: `${fmtN(P.credits)} Cr`, c: '#ffb347' },
    { k: 'Schiff', v: `${P.shipName} · ${SHIPS[P.cls].role}` },
    { k: 'Hülle', v: `${Math.ceil(P.hull)} / ${S.maxHull}`, c: P.hull < S.maxHull * 0.4 ? '#ff6b5b' : undefined },
    { k: 'Fracht', v: `${cargoUsed()} / ${S.cargo}` },
    { k: 'Route', v: P.route && SECTOR[P.route] ? SECTOR[P.route].name : 'keine (Galaxiekarte: M)' },
    { k: 'Heimathafen', v: SECTOR[P.home.sector]?.stations.find(s => s.id === P.home.station)?.name || '—' },
    { h: P.contracts.length ? 'Aufträge' : 'Keine Aufträge angenommen' },
  ];
  for (const c of P.contracts) out.push({ k: `${c.amount}× ${ITEMS[c.item].n} → ${c.stName} (${SECTOR[c.sector]?.name || ''})`, v: `${fmtN(c.reward)} Cr`, c: P.cargo[c.item] >= c.amount ? '#7fe0a0' : undefined });
  out.push({ h: 'Bilanz' }, { k: 'Abgebaut', v: `${fmtN(P.mined)} E` }, { k: 'Verdient', v: `${fmtN(P.earned)} Cr` }, { k: 'Ferrox abgeschossen', v: String(P.kills) });
  return out;
}
function cargoLines(c: Partial<Record<ItemId, number>>): [string, string][] {
  const l = ITEM_IDS.filter(k => c[k]).map(k => [`${ITEMS[k].n}: ${c[k]}`, ITEMS[k].c] as [string, string]);
  return l.length ? l : [['Frachtraum leer', '#9a9284']];
}
function shipInter(sp: ShipSpot, info: ShipInfo): Inter {
  const active = info.uid === P.uid, planet = info.ctx === 'planet', base = { x: sp.x, z: sp.z, r: sp.r };
  switch (sp.kind) {
    case 'seat': return {
      ...base, label: () => planet ? 'Pilotensitz: abheben' : active ? 'Pilotensitz: ablegen' : `Pilotensitz: auf die ${info.name} umsteigen`,
      act: () => {
        if (planet) interiorHooks.takeoff();
        else if (active) interiorHooks.undock();
        else {
          const r = P.fleet.find(f => f.uid === info.uid), st = IN.station!;
          leaveShip();
          if (r && board(r, { sector: P.sector, station: st.id })) { say('SYSTEM', `Du bist auf die ${P.shipName} umgestiegen.`); snd(400, 0.4, 'sine', 0.05, 300); refreshHangarShips(); }
        }
      },
    };
    case 'hatch': return { ...base, label: () => planet ? 'Über die Rampe zum Rover' : 'Von Bord gehen', act: () => planet ? interiorHooks.toRover() : leaveShip() };
    case 'log': return {
      ...base, label: () => 'Logbuch lesen',
      act: () => openPanel(`Logbuch · ${info.name}`, active ? logLines() : [{ h: 'Geparktes Schiff · Ladung' }, ...cargoLines(P.fleet.find(f => f.uid === info.uid)?.cargo || {})]),
    };
    case 'scanner': return {
      ...base, label: () => 'Scanner-Konsole',
      act: () => { const d = world.def; openPanel(`Scanner · ${d ? d.name : ''}`, d ? [['Rohstoffe in diesem Gebiet:', '#9a9284'], ...sectorOres(d).map(o => [`${ITEMS[o.k].n}  ${Math.round(o.p * 100)} %`, ITEMS[o.k].c] as [string, string]), ['', '#fff'], ['Frachtraum:', '#9a9284'], ...cargoLines(active ? P.cargo : {})] : []); },
    };
    case 'bench': return {
      ...base, label: () => active ? `Werkbank: Hülle flicken (1 Ferrox-Schrott → +30) · ${P.cargo.schrott} Schrott` : 'Werkbank (nur auf dem aktiven Schiff)',
      act: () => {
        if (!active) return;
        const mx = stats().maxHull;
        if (P.hull >= mx) { say('SYSTEM', 'Die Hülle ist unbeschädigt.'); return; }
        if (!P.cargo.schrott) { say('SYSTEM', 'Kein Ferrox-Schrott an Bord. Wracks abgeschossener Ferrox liefern welchen.'); return; }
        P.cargo.schrott--; P.hull = Math.min(mx, P.hull + 30);
        say('SYSTEM', `Hülle geflickt: ${Math.ceil(P.hull)}/${mx}.`); snd(300, 0.3, 'square', 0.03, 200);
      },
    };
    case 'drones': return {
      ...base, label: () => active ? `Drohnenbucht: Drohnen ${P.dronesOn ? 'abschalten' : 'einschalten'}` : 'Drohnenbucht (nur auf dem aktiven Schiff)',
      act: () => { if (!active) return; P.dronesOn = !P.dronesOn; say('SYSTEM', P.dronesOn ? 'Bergbaudrohnen startklar.' : 'Bergbaudrohnen bleiben in der Bucht.'); snd(500, 0.15, 'sine', 0.04, 200); },
    };
    case 'bed': return { ...base, label: () => 'Ausruhen (Spielstand sichern)', act: () => { saveGame(); say('SYSTEM', 'Spielstand gesichert. Du fühlst dich ausgeruht.'); snd(330, 0.6, 'sine', 0.03, -60); } };
    case 'locker': return {
      ...base, label: () => planet ? 'Spind' : 'Spind: Lackierung ändern',
      act: () => planet ? say('SYSTEM', 'Neu lackieren geht nur im Stationshangar.') : interiorHooks.openTab('hangar', 'Spind: Lackierungen für dein Schiff findest du im Hangar.'),
    };
  }
}

// ---------- Sprechen, Benutzen ----------
function say(who: string, text: string) { IN.say = { who, text, t: 5 }; }
// Eine Figur im Raum spricht (Gebärden für die angegebene Dauer). who: ihr Name oder das Kürzel der Geschichte (z. B. ACHTERBERG).
export function npcSpeak(who: string, seconds: number) {
  if (!IN.active || !who) return;
  const k = who.toUpperCase();
  for (const q of persons) if (q.name && q.p.anim && q.name.toUpperCase().includes(k)) animTalk(q.p.anim, seconds);
}
function talk(name: string, tab: string) {
  npcSpeak(name, 3.2);
  say(name, GREET[tab] || '');
  snd(660, 0.08, 'sine', 0.04, 120);
  interiorHooks.openTab(tab, `${name}: „${GREET[tab] || ''}“`);
}
export function interact() {
  if (IN.panel) { IN.panel = null; return; }
  if (IN.target) IN.target.act();
}

// ---------- Laufen ----------
function free(x: number, z: number) {
  if (mesh) return mesh.floorAt(x, z, IN.fy + IN.jy, IN.jy > 0.05) !== null;   // Modell-Raum: Laufkarte (im Sprung: Boden unter den Füßen)
  const R = 0.45;
  let ok = false;
  for (const r of rects) if (x > r[0] + R && x < r[1] - R && z > r[2] + R && z < r[3] - R) { ok = true; break; }
  // Übergänge zwischen zwei Räumen (z. B. Gang → Frachtraum): frei, wenn der Mittelpunkt und alle vier Ränder des
  // Körpers in irgendeinem Raum liegen. Sonst entstand an jeder Raumgrenze eine unsichtbare Wand.
  if (!ok) {
    const inAny = (px: number, pz: number) => rects.some(r => px >= r[0] && px <= r[1] && pz >= r[2] && pz <= r[3]);
    ok = inAny(x, z) && inAny(x - R, z) && inAny(x + R, z) && inAny(x, z - R) && inAny(x, z + R);
  }
  // Durchgänge: im Korridor zählt nur die Breite
  if (!ok && !IN.ship && Math.abs(x) < CW - R && z > PZ1 - 2 && z < HZ0 + 2) ok = true;
  if (!ok) return false;
  for (const o of obstacles) if (x > o[0] - R && x < o[1] + R && z > o[2] - R && z < o[3] + R) return false;
  for (const o of shipObs) if (x > o[0] - R && x < o[1] + R && z > o[2] - R && z < o[3] + R) return false;
  return true;
}
let stepT = 0;
const walkV = { x: 0, z: 0 };   // Laufgeschwindigkeit (m/s) in Raumkoordinaten
// Springen (Leertaste): nur vom Boden aus
export function jump() { if (!IN.active || IN.jy > 0 || IN.jv !== 0) return; IN.jv = 4.6; snd(95, 0.05, 'triangle', 0.02, 40); }
export function updateWalk(dt: number) {
  if (!IN.active || !group) return;
  IN.say.t = Math.max(0, IN.say.t - dt);
  // Blick: Maus eingefangen → direkte Steuerung; sonst dreht die Zeigerposition wie beim Fliegen
  IN.locked = document.pointerLockElement === gl;
  // zu Fuß gehört die Maus dem Blick: sobald der Browser es erlaubt (kurz nach einem Tastendruck oder Klick), wird sie eingefangen
  if (!IN.locked && G.mode === 'walk' && (grabT -= dt) <= 0) { grabT = 0.3; grabMouse(); }
  if (!IN.locked) {
    const mx = clamp((mouse.x - view.W / 2) / (view.W / 2), -1, 1), my = clamp((mouse.y - view.H / 2) / (view.H / 2), -1, 1);
    const dz = 0.14, sh = (v: number) => Math.sign(v) * Math.max(0, Math.abs(v) - dz) / (1 - dz);
    IN.yaw -= sh(mx) * 2.4 * settings.sens * dt;
    const tp = -sh(my) * 1.0 * (settings.invertY ? -1 : 1);
    IN.pitch += (tp - IN.pitch) * Math.min(1, dt * 5);
  }
  if (keys.ArrowLeft) IN.yaw += 2 * dt;
  if (keys.ArrowRight) IN.yaw -= 2 * dt;
  // Bewegung: weich anlaufen und abbremsen (Geschwindigkeit folgt der Eingabe), an Wänden entlanggleiten
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  {
    const run = !!(keys.ShiftLeft || keys.ShiftRight), sp = f || s ? (run ? 10 : 6) / Math.hypot(f, s) : 0, sy = Math.sin(IN.yaw), cy = Math.cos(IN.yaw);
    const k = Math.min(1, dt * (f || s ? 9 : 12));
    walkV.x += ((-sy * f + cy * s) * sp - walkV.x) * k; walkV.z += ((-cy * f - sy * s) * sp - walkV.z) * k;
    if (Math.hypot(walkV.x, walkV.z) < 0.05) walkV.x = walkV.z = 0;
    const dx = walkV.x * dt, dzz = walkV.z * dt, ox = IN.x, oz = IN.z;
    if (dx || dzz) {
      if (free(IN.x + dx, IN.z + dzz)) { IN.x += dx; IN.z += dzz; }
      else if (free(IN.x + dx, IN.z)) { IN.x += dx; walkV.z = 0; }
      else if (free(IN.x, IN.z + dzz)) { IN.z += dzz; walkV.x = 0; }
      else walkV.x = walkV.z = 0;
    }
    const moved = Math.hypot(IN.x - ox, IN.z - oz), v = dt > 0 ? moved / dt : 0;
    IN.dist += moved;
    stepT -= moved;
    if (stepT <= 0 && moved > 0 && IN.jy === 0) { stepT = v > 8 ? 2.3 : 1.9; sfx(mesh && IN.area === 'Frachtraum' ? 'step_grate' + Math.floor(Math.random() * 4) : 'step' + Math.floor(Math.random() * 5), v > 8 ? 0.5 : 0.34, 0.9 + Math.random() * 0.2, () => snd(70 + Math.random() * 20, 0.06, 'triangle', v > 8 ? 0.026 : 0.018, -20)); }
    // Wippen: stärker beim Rennen, klingt aus, wenn man steht
    const amp = Math.min(1, v / 6) * (v > 8 ? 0.075 : 0.045);
    IN.bob += (Math.sin(IN.dist * 3.3) * amp - IN.bob) * Math.min(1, dt * 14);
  }
  // Modell-Raum: Bodenhöhe folgen (Treppen, Rampen, Decks); im Sprung bleibt die Höhe über alles erhalten, der Boden darunter wechselt
  if (mesh) {
    const air = IN.jy > 0.05, fy = mesh.floorAt(IN.x, IN.z, IN.fy + IN.jy, air);
    if (fy !== null) {
      if (air) { const a = IN.fy + IN.jy; IN.fy = fy; IN.jy = Math.max(0, a - fy); }
      else IN.fy += (fy - IN.fy) * Math.min(1, dt * 14);
    }
  }
  // Sprung: Schwerkraft, Kopf stößt nicht durch die Decke
  if (IN.jv !== 0 || IN.jy > 0) {
    IN.jy += IN.jv * dt; IN.jv -= 15 * dt;
    const top = mesh ? Math.max(0, mesh.head() - 1.9) : 0.9;
    if (IN.jy > top) { IN.jy = top; IN.jv = Math.min(IN.jv, 0); }
    if (IN.jy <= 0) { IN.jy = 0; IN.jv = 0; stepT = 0; }   // kein eigener Ton beim Aufkommen: der nächste Schritt folgt sofort
  }
  IN.area = room ? room.area(IN.x, IN.z) : IN.z > HZ0 ? 'Hangardeck' : IN.z > PZ1 ? 'Korridor' : PAL[kind].hall;
  if (IN.panel && Math.hypot(IN.x - IN.panel.x, IN.z - IN.panel.z) > 2.5) IN.panel = null;
  // Was liegt vor mir?
  let best: Inter | null = null, bd = 1e9;
  const vx = -Math.sin(IN.yaw), vz = -Math.cos(IN.yaw);
  for (const it of [...inters, ...shipInters]) {
    const bx = (it as any).box as Rect | undefined;
    const tx = bx ? clamp(IN.x, bx[0], bx[1]) : it.x, tz = bx ? clamp(IN.z, bx[2], bx[3]) : it.z;
    const dx = tx - IN.x, dzz = tz - IN.z, d = Math.hypot(dx, dzz), lim = bx ? 3.6 : it.r;
    if (d > lim) continue;
    if ((it as any).y !== undefined && Math.abs((it as any).y - IN.fy) > 1.6) continue;   // anderes Deck
    if (d > 0.8 && (dx * vx + dzz * vz) / d < 0.25) continue;
    if (d < bd) { bd = d; best = it; }
  }
  IN.target = best;
  // Animationen
  const t = G.time;
  if (field) (field.material as THREE.MeshBasicMaterial).opacity = 0.055 + Math.sin(t * 2.2) * 0.02;
  if (holo) holo.rotation.y += dt * 0.25;
  for (const q of persons) {
    const a = Math.atan2(IN.x - q.x, IN.z - q.z) - q.face, d = Math.hypot(IN.x - q.x, IN.z - q.z);
    const want = d < 9 ? clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1.1, 1.1) : Math.sin(t * 0.4 + q.x) * 0.3;
    q.p.head.rotation.y += (want - q.p.head.rotation.y) * Math.min(1, dt * 4);
    q.p.armL.rotation.x = Math.sin(t * 0.8 + q.z) * 0.06; q.p.armR.rotation.x = -q.p.armL.rotation.x;
    if (q.p.anim) animStep(q.p.anim, dt, false); else if (q.p.mixer) q.p.mixer.update(dt); else q.p.g.position.y = Math.sin(t * 1.3 + q.x) * 0.008;
  }
  updateOthers(dt);
  for (const w of walkers) {
    const n = w.path[(w.i + 1) % w.path.length], dx = n[0] - w.x, dzz = n[1] - w.z, d = Math.hypot(dx, dzz);
    if (d < 0.3) { w.i = (w.i + 1) % w.path.length; w.rest = Math.random() < 0.4; continue; }
    // stehen bleiben, wenn der Spieler im Weg ist (früh genug, um auszulaufen) oder für eine Pause kurz vor einer Wegmarke
    const pd = Math.hypot(IN.x - w.x, IN.z - w.z), ahead = ((IN.x - w.x) * dx + (IN.z - w.z) * dzz) / (d * Math.max(0.01, pd));
    const full = !!w.p.anim?.stop, blocked = pd < (full ? 3.0 : 1.6) && ahead > 0.3;
    if (w.rest && d < 1.5 && w.wait <= 0) { w.wait = 4 + Math.random() * 6; w.rest = false; }
    if (w.wait > 0) w.wait -= dt;
    const go = !blocked && w.wait <= 0;
    let sp = go ? WALK_V : 0;
    // mit Skelett: Anlaufen und Abbremsen geben das Tempo vor (die Füße rutschen nicht); ganz nah am Spieler hält die Figur sofort
    if (w.p.anim) { sp = animStep(w.p.anim, dt, go, WALK_V); if (blocked && pd < 1.2) sp = 0; }
    w.x += dx / d * sp * dt; w.z += dzz / d * sp * dt;
    w.p.g.position.set(w.x, 0, w.z);
    const ta = Math.atan2(dx, dzz), da = Math.atan2(Math.sin(ta - w.p.g.rotation.y), Math.cos(ta - w.p.g.rotation.y));
    w.p.g.rotation.y += da * Math.min(1, dt * 5);
    w.ph += dt * sp * 4.6;
    const sw = sp ? Math.sin(w.ph) * 0.55 : 0;
    w.p.legL.rotation.x = sw; w.p.legR.rotation.x = -sw; w.p.armL.rotation.x = -sw * 0.7; w.p.armR.rotation.x = sw * 0.7;
  }
}

// ---------- Kamera ----------
const _c = new THREE.Vector3();
export function applyWalkCamera() {
  if (!group) return;
  if (SEQ.t >= 0) {   // Start/Landung: Kamera steht seitlich hinter dem Stellplatz im Hangar und folgt dem Schiff
    const so = seqOffset(), cb = Math.min(62, stats().camBack * 0.5 + 22);
    group.localToWorld(_c.set(clamp(cb * 0.6, 8, HW - 5), clamp(shipPad.y + so.y * 0.5 + cb * 0.22 + 2, 2.5, HH - 4), clamp(shipPad.z + so.z * 0.55 - cb, HZ0 + 5, HZ1 - 14)));
    camera.position.copy(_c);
    camera.lookAt(SHIP.g.position);
    if (Math.abs(camera.fov - 62) > 0.05) { camera.fov = 62; camera.updateProjectionMatrix(); }
    return;
  }
  group.localToWorld(_c.set(IN.x, 1.7 + IN.bob + IN.fy + IN.jy, IN.z));
  camera.position.copy(_c);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(IN.pitch, group.rotation.y + IN.yaw, 0);
  if (Math.abs(camera.fov - 72) > 0.05) { camera.fov = 72; camera.updateProjectionMatrix(); }
}

// ---------- Anzeige ----------
const _p = new THREE.Vector3();
export function drawWalkHUD() {
  syncShipPanel();
  if (!IN.active || !group || G.mode !== 'walk') return;
  const W = view.W, H = view.H, pal = IN.ship && !IN.station ? PAL.outpost : PAL[kind], title = IN.ship ? IN.ship.name : IN.station ? IN.station.name : '';
  ux.save();
  // Namen über Figuren und Schiffen
  ux.textAlign = 'center'; ux.font = '12px "Share Tech Mono",Consolas,monospace';
  for (const l of [...labels, ...shipLabels, ...otherLabels()]) {
    const d = Math.hypot(l.p.x - IN.x, l.p.z - IN.z);
    if (d > 26) continue;
    group.localToWorld(_p.copy(l.p)).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1.05 || Math.abs(_p.y) > 1.05) continue;
    ux.globalAlpha = clamp(1.6 - d / 16, 0.25, 1);
    const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H, tw = ux.measureText(l.text).width + 14;
    ux.fillStyle = 'rgba(6,16,26,.7)'; ux.fillRect(x - tw / 2, y - 13, tw, 18);
    ux.fillStyle = l.col; ux.fillText(l.text, x, y);
  }
  ux.globalAlpha = 1;
  // Fadenkreuz
  if (IN.locked) { ux.fillStyle = 'rgba(255,255,255,.75)'; ux.beginPath(); ux.arc(W / 2, H / 2, 2.2, 0, 6.283); ux.fill(); }
  else {
    ux.strokeStyle = 'rgba(255,255,255,.14)'; ux.lineWidth = 1;
    ux.beginPath(); ux.arc(W / 2, H / 2, W / 2 * 0.14, 0, 6.283); ux.stroke();
    ux.fillStyle = 'rgba(255,255,255,.85)'; ux.save(); ux.translate(mouse.x, mouse.y); ux.rotate(Math.PI / 4); ux.fillRect(-3.5, -3.5, 7, 7); ux.restore();
  }
  // Aufforderung
  if (IN.target) {
    const t = `[E] ${IN.target.label()}`;
    ux.font = '600 14px "Share Tech Mono",Consolas,monospace';
    const tw = ux.measureText(t).width + 30, y = H * 0.66;
    ux.fillStyle = 'rgba(6,16,26,.88)'; ux.strokeStyle = pal.css; ux.lineWidth = 1;
    ux.beginPath(); ux.rect(W / 2 - tw / 2, y - 20, tw, 32); ux.fill(); ux.stroke();
    ux.fillStyle = pal.css; ux.fillText(t, W / 2, y + 1);
  }
  // Ortsanzeige oben links
  const k = settings.hud;
  ux.save(); ux.translate(12, 12); ux.scale(k, k);
  ux.fillStyle = 'rgba(6,16,26,.84)'; ux.strokeStyle = '#1e3a4a'; ux.lineWidth = 1;
  ux.beginPath(); ux.rect(0, 0, 236, 84); ux.fill(); ux.stroke();
  ux.textAlign = 'left'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#5fd0ff'; ux.fillText(title.toUpperCase(), 12, 20);
  const rows: [string, string, string][] = [['Ort', IN.area, pal.css], ['Credits', fmtN(P.credits) + ' Cr', '#ffb347'], ['Fracht', `${cargoUsed()}/${stats().cargo}`, '#e4eef5']];
  ux.font = '12px "Share Tech Mono",Consolas,monospace';
  rows.forEach(([a, b, c], i) => { ux.textAlign = 'left'; ux.fillStyle = '#e4eef5'; ux.fillText(a, 12, 40 + i * 16); ux.textAlign = 'right'; ux.fillStyle = c; ux.fillText(b, 224, 40 + i * 16); });
  ux.restore();
  // Gesprochenes
  if (IN.say.t > 0) {
    ux.globalAlpha = Math.min(1, IN.say.t);
    ux.textAlign = 'center'; ux.font = '14px "Share Tech Mono",Consolas,monospace';
    const t = `${IN.say.who}: ${IN.say.text}`, tw = Math.min(W - 40, ux.measureText(t).width + 28);
    ux.fillStyle = 'rgba(6,16,26,.82)'; ux.fillRect(W / 2 - tw / 2, H - 92, tw, 28);
    ux.fillStyle = '#e4eef5'; ux.fillText(t, W / 2, H - 73, W - 60);
    ux.globalAlpha = 1;
  }
  // Tasten stehen in der Steuerungsleiste links unten; hier nur der Hinweis zum Maus-Einfangen
  if (!IN.locked) { ux.textAlign = 'center'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0'; ux.fillText('Klick: Maus einfangen', W / 2, H - 12); }
  ux.restore();
}

// ---------- Maus einfangen (wenn der Browser es erlaubt) ----------
document.addEventListener('mousemove', e => {
  if (!IN.active || G.mode !== 'walk' || document.pointerLockElement !== gl) return;
  const k = 0.0023 * settings.sens;
  IN.yaw -= e.movementX * k;
  IN.pitch = clamp(IN.pitch - e.movementY * k * (settings.invertY ? -1 : 1), -1.3, 1.3);
});
let grabT = 0;
const typing = () => { const t = (document.activeElement as HTMLElement | null)?.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; };
// Maus einfangen, wenn man zu Fuß unterwegs ist. Browser erlauben das nur kurz nach einer Eingabe; ohne Erlaubnis bleibt die Zeigersteuerung.
export function grabMouse(force = false) {
  if (!IN.active || G.mode !== 'walk' || document.pointerLockElement === gl || typing()) return;
  const ua = (navigator as any).userActivation;
  if (!force && ua && !ua.isActive) return;
  try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nicht erlaubt: Zeigersteuerung bleibt */ }
}
gl.addEventListener('click', () => grabMouse(true));
addEventListener('keydown', () => { if (IN.active && G.mode === 'walk') grabT = 0; });
document.addEventListener('pointerlockchange', () => {
  const now = document.pointerLockElement === gl;
  // Esc löst die Maus: dann das Pausenmenü zeigen. Kurz warten: öffnet gerade ein Menü oder das Funkfeld, hat das Spiel die Maus selbst freigegeben.
  if (IN.locked && !now && IN.active && G.mode === 'walk') setTimeout(() => { if (document.pointerLockElement !== gl && IN.active && G.mode === 'walk' && !typing()) interiorHooks.pause(); }, 80);
  IN.locked = now;
});

// =====================================================================================
// Andere Piloten (Mehrspieler) zu Fuß in derselben Station
// Sie stehen im Stationsraum (auch wenn man selbst gerade im eigenen Schiff ist: dann sieht man sie durch die Kanzel).
// Positionen kommen vom Netzcode in Raum-Koordinaten (x, z, Blickrichtung) und werden weich nachgeführt.
// =====================================================================================
interface Other { p: Person; x: number; z: number; ry: number; tx: number; tz: number; tyaw: number; name: string; speed: number }
const others = new Map<number, Other>();
export function syncOtherPilots(list: { id: number; name: string; st: string; x: number; z: number; yaw: number }[]) {
  if (!IN.active || !IN.station || !stationGroup) { if (others.size) clearOthers(); return; }
  const here = IN.station.id, seen = new Set<number>();
  for (const o of list) {
    if (o.st !== here) continue;
    seen.add(o.id);
    let r = others.get(o.id);
    if (!r) {
      const p = buildPerson(0x4a5a6a, 0xd8a888, 0x2a2018, PAL[kind].accent, 'walk');
      p.g.position.set(o.x, 0, o.z); p.g.rotation.y = o.yaw + Math.PI;
      stationGroup.add(p.g);
      r = { p, x: o.x, z: o.z, ry: o.yaw + Math.PI, tx: o.x, tz: o.z, tyaw: o.yaw, name: o.name, speed: 0 };
      others.set(o.id, r);
    }
    r.tx = o.x; r.tz = o.z; r.tyaw = o.yaw; r.name = o.name;
  }
  for (const id of [...others.keys()]) if (!seen.has(id)) removeOther(id);
}
function removeOther(id: number) {
  const r = others.get(id); if (!r) return;
  r.p.g.parent?.remove(r.p.g);
  r.p.g.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose(); });
  others.delete(id);
}
function clearOthers() { for (const id of [...others.keys()]) removeOther(id); }
function updateOthers(dt: number) {
  const k = Math.min(1, dt * 10);
  for (const r of others.values()) {
    const ox = r.x, oz = r.z;
    r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k;
    const v = Math.hypot(r.x - ox, r.z - oz) / Math.max(dt, 1e-3);
    r.speed += (v - r.speed) * Math.min(1, dt * 6);
    r.p.g.position.set(r.x, 0, r.z);
    // Figur schaut in Blickrichtung des Piloten (+Z des Modells → Blickrichtung)
    const want = r.tyaw + Math.PI, da = Math.atan2(Math.sin(want - r.ry), Math.cos(want - r.ry));
    r.ry += da * Math.min(1, dt * 8); r.p.g.rotation.y = r.ry;
    const mv = r.speed > 0.4;
    if (r.p.anim) animStep(r.p.anim, dt, mv, Math.max(0.8, r.speed), false);   // Rennen = schnellere Schritte
    else {
      const sw = mv ? Math.sin(G.time * 9) * 0.55 : 0;
      r.p.legL.rotation.x = sw; r.p.legR.rotation.x = -sw; r.p.armL.rotation.x = -sw * 0.7; r.p.armR.rotation.x = sw * 0.7;
    }
  }
}
// Namensschilder (nur im Stationsraum; im Schiff passen die Koordinaten nicht)
function otherLabels(): Label[] {
  if (room || !others.size) return [];
  return [...others.values()].map(r => ({ p: new THREE.Vector3(r.x, 2.15, r.z), text: r.name, col: '#7fe0a0' }));
}
// nächster anderer Pilot zu Fuß in Reichweite (für „T Handeln“); im eigenen Schiff nicht
export function nearestOther(max = 3.2): { id: number; name: string } | null {
  if (room || !IN.active) return null;
  let best: { id: number; name: string } | null = null, bd = max;
  for (const [id, r] of others) { const d = Math.hypot(r.x - IN.x, r.z - IN.z); if (d < bd) { bd = d; best = { id, name: r.name }; } }
  return best;
}

// Story: eine benannte Figur in den Stationsraum stellen (z. B. die Ausbilderin im Prolog).
// Steht neben dem Spieler, schaut ihn an und lässt sich mit E ansprechen.
// model: 'merchant' ist die Frauenfigur (Mantel), 'worker' die Männerfigur (Arbeitsanzug): passend zur Rolle wählen
export interface NpcLook { model?: 'worker' | 'merchant' | 'achterberg'; tint?: [number, number, number] }
export function storyNpc(name: string, title: string, label: string, act: () => void, col = '#ffb347', at?: { x: number; z: number }, look: NpcLook = {}) {
  if (!IN.active || !stationGroup || IN.ship) return false;
  const x = at ? at.x : IN.x - 2.5, z = at ? at.z : IN.z - 7, face = Math.atan2(IN.x - x, IN.z - z);   // vor dem Spieler (Blick zum Korridor)
  const p = storyPerson(look);
  p.g.position.set(x, 0, z); p.g.rotation.y = face;
  stationGroup.add(p.g);
  persons.push({ p, x, z, face, name });
  labels.push({ p: new THREE.Vector3(x, 2.15, z), text: `${name} · ${title}`, col });
  inters.push({ x, z, r: 3.4, label: () => label, act });
  return true;
}
// Figur für die Geschichte: gewähltes Modell (Arbeiter oder Händler) mit eigenem Farbton, steht und atmet
function storyPerson(look: NpcLook): Person {
  let cn: string = look.model || 'merchant', tint = look.tint || 1;
  if (cn === 'achterberg' && !hasChar(cn)) { cn = 'merchant'; tint = [0.82, 0.86, 0.95]; }   // eigene Figur fehlt: Frauenfigur mit Farbton
  if (!hasChar(cn)) return buildPerson(0x2c3440, 0xc89474, 0x3a2a1c, 0xffb347);
  const c = charInstance(cn, tint);
  c.g.traverse((o: any) => { if (o.isMesh) { o.userData.shared = true; if (o.material !== undefined) disposables.push(o.material); } });
  const d = () => new THREE.Group();
  animInit(c.anim, false);
  return { g: c.g, legL: d(), legR: d(), armL: d(), armR: d(), head: d(), mixer: c.mixer, walk: c.walk, idle: c.idle, moving: false, anim: c.anim };
}
