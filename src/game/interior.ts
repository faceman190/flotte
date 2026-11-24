import { drawPrompt, drawPlaceLine, drawSpeechBubble } from '../ui/footHud';
import * as THREE from 'three';
import { scene, camera, view, ux, gl, setExposure, ambient, rim, sun, warmScene, compileFor, warm, uploadAll } from '../core/engine';
import { texMat, std, boxUV, lightmapTex, WHITE_TEX } from '../core/textures';
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
import { RAMP, RAMP_ENTRY, doorProgress, type Paint } from '../models/gltfShips';
import { hasChar, charInstance, animInit, animStep, animTalk, animTurn, animTurning, animHasTurn, type CharAnim } from '../models/charModels';
import { buildShipRoom, type ShipRoom, type ShipSpot } from './shipInterior';
import { computeStats, type ShipId, type Up } from '../data/ships';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { SECTOR } from '../data/galaxy';
import { sectorOres } from '../data/ores';
import { world } from './world';
import { saveGame } from './state';
import { hasMeshRoom, meshRoomReady, loadMeshRoom, buildMeshRoom, interiorEnv } from './meshRoom';
import { stationTemplate } from '../models/stationModels';
import { applyKit, kitMeta } from '../models/kit';
import { HANGAR_BLOCKS } from '../data/hangarBlocks';
import { VIEW, STANCE, footPace, footBrake, footAccel, setIntent, eyeH, syncAvatar, driveAvatar, freeAvatar, tpCamPos, resetTpCam, readNetFlags, figGear, gearFromNet, type Avatar, type NetAct } from './avatar';
import { bodyView, fpBody } from './avatar';
import { viewModelId } from './mineArt';
import { staffBark, isFem } from './barks';
import { crewBesuch, crewSpruch, crewFetzen, crewDurchsage, crewEile, crewHooks } from './crewStimmen';
import { loadDeck, buildDeck, hasDeck, loadHangar, buildHangar, type Deck, type HangarBuild, type DeckQuartier } from './deck';
import { QS, eigeneDeko, nrText, FUND_FARBE, ortKennung, type QDeko } from './quartier';
import { REP } from './reputation';

// =====================================================================================
// Begehbare Stationen: Hangar → Korridor → Promenade, in der Ego-Ansicht.
// Der Innenraum steht an der Startöffnung der Station; durch das Kraftfeld des Hangars sieht man den echten Sektor.
// =====================================================================================

type Rect = [number, number, number, number]; // x0, x1, z0, z1
interface Inter { x: number; z: number; r: number; label: () => string; act: () => void }
interface Label { p: THREE.Vector3; text: string; col: string }
interface Person { g: THREE.Group; legL: THREE.Group; legR: THREE.Group; armL: THREE.Group; armR: THREE.Group; head: THREE.Object3D; mixer?: THREE.AnimationMixer; walk?: THREE.AnimationAction | null; idle?: THREE.AnimationAction | null; moving?: boolean; anim?: CharAnim }
// Stehende Figur (Personal, Figuren der Geschichte, Gesprächsgruppen). home: Blickrichtung, in die sie zurückkehrt; span: wie weit sie sich
// davon wegdrehen darf (Personal hinter der Theke); want: Richtung, in die sie sich gerade dreht; fix: dreht den Körper nicht zum Piloten
// (Gesprächsgruppe); look: eigener Blickpunkt statt der Kamera; cust: Läufer, der gerade bei ihr steht
interface Stand { p: Person; x: number; z: number; face: number; name?: string; home?: number; span?: number; want?: number | null; seen?: number; away?: number; fix?: boolean; look?: THREE.Vector3; cust?: Walker | null; story?: boolean }
// Haltepunkt eines Läufers abseits seines Wegs: Standort, Blickrichtung, Dauer (s, von–bis), Wahrscheinlichkeit; who: Personal, mit dem er dort redet
interface Stop { x: number; z: number; face: number; t: [number, number]; p: number; who?: Stand; busy?: boolean }
interface Walker { p: Person; path: number[][]; stops: (Stop | null)[]; i: number; to: number; x: number; z: number; ph: number; wait: number; rest: boolean; at: Stop | null; leave: boolean; say: number; sayI: number; look: THREE.Vector3 }
// Gesprächsgruppe: zwei oder drei Leute, die abwechselnd reden (sp = wer gerade spricht, t = Zeit bis zum Wechsel, gap = Pause)
interface Chat { m: Stand[]; x: number; z: number; sp: number; t: number; gap: boolean }
// Figur der Geschichte, die nach ihrer Szene abgeht (zum Gang und hinaus): erst kurz warten, umdrehen, dann den Weg gehen
// end: Die Figur kommt herein statt hinauszugehen; am Ende des Wegs nimmt sie ihren Platz ein (storyNpc)
interface Leaver { p: Person; x: number; z: number; path: number[][]; i: number; wait: number; turned: boolean; end?: () => void; name?: string }

export const interiorHooks = {
  toCity: () => {},
  openTab: (_tab: string, _note: string, _sub?: string) => {},
  undock: () => {},
  openMap: () => {},
  pause: () => {},
  tabs: () => [] as string[],
  takeoff: () => {},     // Planet: vom Pilotensitz aus abheben
  toRover: () => {},     // Planet: über die Rampe zurück zum Rover
  leaveBase: () => {},   // Planetenbasis: durch die Tür wieder hinaus (zu Fuß)
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
const TAB_N: Record<string, string> = { ausruester: 'Ausrüster', markt: 'Markt', raffinerie: 'Raffinerie', auftraege: 'Aufträge', missionen: 'Missionen', lager: 'Lager', hangar: 'Hangar', werft: 'Werft', werkstatt: 'Werkstatt', service: 'Service', info: 'Auskunft' };
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
let persons: Stand[] = [], walkers: Walker[] = [], chats: Chat[] = [], leavers: Leaver[] = [];
let settledT = 0;   // seit wann der Pilot in diesem Raum steht (Landeablauf vorbei), in Spielzeit
let parked: { m: ShipModel; uid: number }[] = [];
let field: THREE.Mesh | null = null, holo: THREE.Object3D | null = null, standGroup: THREE.Group | null = null;
let shipPad = { y: 0, z: 4 };
let dims = PROM.station, kind: 'station' | 'carrier' | 'outpost' = 'station';
const disposables: (THREE.Material | THREE.Texture)[] = [];
let room: ShipRoom | null = null, roomModel: THREE.Object3D | null = null, outsideEnv: THREE.Texture | null = null;
let mesh: ReturnType<typeof buildMeshRoom> = null, boarding = false;   // Innenraum aus einem Modell (Laufkarte statt Rechtecke)
// eigene Figur in der Außensicht (Taste V): hängt in einem Halter, der dem aktuellen Raum folgt (Station oder Schiff)
const meHolder = new THREE.Group(); meHolder.matrixAutoUpdate = false; meHolder.visible = false; scene.add(meHolder);
let me: Avatar | null = null;
let saved: null | { group: THREE.Group | null; rects: Rect[]; obstacles: Rect[]; shipObs: Rect[]; inters: Inter[]; shipInters: Inter[]; labels: Label[]; shipLabels: Label[]; x: number; z: number; yaw: number; lamps: [THREE.Vector3, number, number][]; light: [number, number, number] } = null;

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

import { gearFactor, shipMods } from './inventory';
import { aufgabeLabel, aufgabeTalk } from './aufgaben';
const WALK_V = 1.5;   // Gehtempo der Leute in den Stationen (m/s)
// KI-Figur mit Skelett, falls geladen (Händler stehen, Arbeiter laufen); sonst die einfache Figur aus Grundformen
function buildPerson(suit: number, skin: number, hair: number, badge: number, role: 'idle' | 'walk' = 'idle', model?: string): Person {
  // model: bestimmte Figur (Mechaniker, Lagerarbeiter …), falls geladen; sonst Arbeiter fürs Gehen und Händlerin fürs Stehen
  const cn = model && hasChar(model) ? model : role === 'walk' ? 'worker' : 'merchant';
  if (hasChar(cn)) {
    // etwas heller oder dunkler und ein Hauch Farbton, damit gleiche Modelle nebeneinander nicht wie Abzüge wirken
    const k = 0.82 + Math.random() * 0.22, v = () => k * (0.93 + Math.random() * 0.14);
    const c = charInstance(cn, [v(), v(), v()]);
    c.g.traverse((o: any) => { if (o.isMesh) { o.userData.shared = true; if (o.material !== undefined) disposables.push(o.material); } });
    const d = () => new THREE.Group();
    animInit(c.anim, role === 'walk');
    c.anim.look = camera.position;   // Kopf folgt dem Spieler, wenn er nah vorbeikommt
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

// Hangar als Modell aus Blender (asset-src/neu/hangar/Hangar.blend → asset-src/glb/station/Hangar.glb), gebaut in genau den Maßen oben.
// Zwei Netze: die Hülle (Boden, Wände, Decke) mit vorberechnetem Licht als Bild (tex/hangar_lightmap, zweiter Satz Texturkoordinaten)
// und alles Übrige (Details, Requisiten) mit vorberechnetem Licht in den Eckpunktfarben. Die Materialien tragen Namen (hangar_*):
// Boden und Wände nehmen die Farbe der Station, die Akzentfarbe folgt dem Stationstyp, Leuchtflächen strahlen von selbst.
// Oberflächen: tex/hangar_floor, hangar_wall, hangar_metal, hangar_paint (scripts/make-hangar-tex.mjs). Fehlt das Modell, entsteht der frühere Hangar.
const HANGAR_LIGHT = 5;   // Stärke des vorberechneten Lichts
// Seit Alpha 0.68 ist der Hangar ein Baukasten-Modell (asset-src/neu/station/hangar_kit.py): Materialien und Licht kommen dann aus src/models/kit.ts,
// Standflächen aus data/kit_Hangar.json. Der Zweig darunter gilt nur noch für das frühere Modell ohne Baukasten-Angaben.
const HANGAR_KIT_LIGHT = 3.4;
let kitHangar = false;
// Für Städte (src/game/city.ts): der Hangar als Ansicht durchs offene Tor, an derselben Stelle wie im Innenraum
export function hangarDisplay(accent = PAL.station.accent) {
  const tpl = stationTemplate('Hangar');
  if (!tpl || !kitMeta('Hangar').blocks) return null;
  const body = tpl.clone(true);
  body.children[0].position.set(0, 0, 0);
  applyKit(body, { lightmap: 'hangar_lightmap', intensity: HANGAR_KIT_LIGHT, accent });
  body.traverse((o: any) => { if (o.isMesh) o.userData.shared = true; });
  return body;
}
function addHangarModel(parent: THREE.Object3D, pal: { accent: number; wall: number; floor: number }) {
  const tpl = stationTemplate('Hangar');
  kitHangar = false;
  if (!tpl) return false;
  const body = tpl.clone(true);
  body.children[0].position.set(0, 0, 0);
  if (kitMeta('Hangar').blocks) {
    applyKit(body, { lightmap: 'hangar_lightmap', intensity: HANGAR_KIT_LIGHT, accent: pal.accent });
    body.traverse((o: any) => { if (o.isMesh) o.userData.shared = true; });
    parent.add(body);
    kitHangar = true;
    return true;
  }
  const LM = lightmapTex('hangar_lightmap');
  // ohne Lichtbild (Datei fehlt) bekommen die Flächen ein schwaches Eigenleuchten, damit die Halle nicht schwarz bleibt
  const fill = (c: number) => (LM ? 0x000000 : new THREE.Color(c).multiplyScalar(0.3).getHex());
  const shell = (c: number, t: string, o: THREE.MeshStandardMaterialParameters = {}) => {
    const m = mat(texMat(c, t, { roughness: 0.8, metalness: 0.2, emissive: fill(c), ...o }));
    if (LM) { m.lightMap = LM; m.lightMapIntensity = HANGAR_LIGHT; }
    return m;
  };
  const prop = (c: number, t: string | null, o: THREE.MeshStandardMaterialParameters = {}) => {
    const m = mat(t ? texMat(c, t, { roughness: 0.65, metalness: 0.25, emissive: fill(c), ...o }) : std(c, { roughness: 0.9, metalness: 0, emissive: fill(c), ...o }));
    if (LM) { m.vertexColors = true; m.lightMap = WHITE_TEX; m.lightMapIntensity = HANGAR_LIGHT; }
    return m;
  };
  const glow = (c: number) => mat(new THREE.MeshBasicMaterial({ color: c }));
  const M: Record<string, [THREE.Material, number]> = {     // Material und Kachelgröße (eine Wiederholung je so viele Meter)
    hangar_floor: [shell(pal.floor, 'hangar_floor', { roughness: 0.78, metalness: 0.3 }), 14],
    hangar_floor_dark: [shell(0x5a5e66, 'hangar_floor', { roughness: 0.82, metalness: 0.3 }), 14],
    hangar_wall: [shell(pal.wall, 'hangar_wall'), 14],
    hangar_wall_dark: [shell(0x5f646d, 'hangar_wall', { metalness: 0.3 }), 14],
    hangar_panel: [shell(0x9aa0a8, 'hangar_wall', { roughness: 0.7 }), 9],
    hangar_ceiling: [shell(0x41454c, 'hangar_metal', { roughness: 0.85, metalness: 0.3 }), 10],
    hangar_steel: [prop(0x70747b, 'hangar_metal', { roughness: 0.5, metalness: 0.55 }), 5],
    hangar_dark: [prop(0x2c2e33, 'hangar_metal', { roughness: 0.6, metalness: 0.45 }), 5],
    hangar_pipe: [prop(0x8a6a3a, 'hangar_metal', { roughness: 0.45, metalness: 0.6 }), 4],
    hangar_accent: [prop(pal.accent, 'hangar_paint'), 5],
    hangar_yellow: [prop(0xe2b21c, 'hangar_paint'), 5],
    hangar_red: [prop(0xb02a1e, 'hangar_paint'), 5],
    hangar_white: [prop(0xd4d6da, 'hangar_paint'), 5],
    hangar_blue: [prop(0x2a5aa8, 'hangar_paint'), 5],
    hangar_green: [prop(0x3f8a52, 'hangar_paint'), 5],
    hangar_rubber: [prop(0x17171a, null), 0],
    hangar_light: [glow(0xfff2dc), 0], hangar_lamp: [glow(0xffa030), 0], hangar_redlamp: [glow(0xff3a24), 0],
    hangar_screen: [glow(0x3f9fd0), 0], hangar_glass: [glow(0x7fb0cc), 0],
  };
  body.updateMatrixWorld(true);
  body.traverse((o: any) => {
    if (!o.isMesh) return;
    o.userData.shared = true;                       // Geometrie gehört der Vorlage und bleibt beim Verlassen erhalten
    const e = M[o.material.name];
    if (!e) return;
    o.material = e[0];
    if (e[1] && (e[0] as any).map) boxUV(o, 1 / e[1], body);   // Kachelung in Metern des Hangars, nicht in den gepackten Koordinaten des Netzes
  });
  parent.add(body);
  return true;
}

// Promenade und Korridor als Baukasten-Modell (asset-src/neu/station/promenade_kit.py → asset-src/glb/station/Promenade.glb), in den Maßen des Spiels.
// Licht ist vorberechnet (tex/promenade_lightmap); Wegweiser und Lichtfugen nehmen die Akzentfarbe der Station. Ladenplätze, Standflächen und Maße
// kommen aus data/kit_Promenade.json. Fehlt das Modell, entstehen Korridor und Halle wie früher aus Grundformen.
const PROM_LIGHT = 2.0;   // Stärke des vorberechneten Lichts
let hasProm = false;
// Bastion: Deck 3 aus dem Bastion-Baukasten ersetzt Korridor und Promenade (src/game/deck.ts). Ist das Modell nicht geladen, bleibt es beim alten Aufbau.
let deck: Deck | null = null, hangarBody: THREE.Object3D | null = null, hangarUpdate: null | ((x: number, z: number) => void) = null;
let hangarBuild: HangarBuild | null = null;      // Hangar der Bastion (deck.ts): für den späten Austausch gegen die neue Art und ihre Raumspiegelung
// Weg der Story-Figuren vom Hangar hinaus (herein in umgekehrter Folge): durch den Korridor oder durch die Schleuse aufs Deck
const outPath = (off: number): number[][] => (deck ? deck.way(off) : [[off, HZ0 + 4], [off * 0.6, HZ0 - 1], [off * 0.6, PZ1 + 1.5]]);
// In Korridor und Promenade trägt das vorberechnete Licht: Grundlicht und Gegenlicht des Spiels werden dort zurückgenommen (0 = Hangar, 1 = Halle)
const RIM_IN = new THREE.Color(0x4a4640), rimOut = new THREE.Color();
let ambIn = 0, sunIn = 0, zoneT = -1, ambSet = -1;
function zoneLight() {
  if (!(hasProm || kitHangar || deck) || room) return;
  if (ambSet >= 0 && Math.abs(ambient.intensity - ambSet) > 1e-5) { ambIn = ambient.intensity; sunIn = sun.intensity; zoneT = -1; }   // die Belichtung wurde von außen neu gesetzt
  const t = kitHangar ? 1 : Math.min(1, Math.max(0, (HZ0 + 1 - IN.z) / (CL - 2)));      // Baukasten-Hangar: überall vorberechnetes Licht
  if (Math.abs(t - zoneT) < 0.002) return;
  zoneT = t;
  ambient.intensity = ambSet = ambIn * (1 - 0.8 * t);
  sun.intensity = sunIn * (1 - 0.62 * t);
  rim.color.copy(rimOut).lerp(RIM_IN, t);
  lamps[0].intensity = hangarUpdate ? Math.PI * 0.42 : kitHangar ? Math.PI * 0.1 : Math.PI * 0.5 * (1 - 0.7 * t);      // neuer Hangar der Bastion: Flächen nehmen kein Lampenlicht, die Lampe gilt allein den Schiffen und Figuren
       // im Hangar beleuchtet diese Lampe vor allem die Schiffe
}
function promMeta() { const m = kitMeta('Promenade'); return stationTemplate('Promenade') && m.slots && m.dims ? m : null; }
function addPromModel(parent: THREE.Object3D, accent: number) {
  const body = stationTemplate('Promenade')!.clone(true);
  body.children[0].position.set(0, 0, 0);
  applyKit(body, { lightmap: 'promenade_lightmap', intensity: PROM_LIGHT, accent });
  body.traverse((o: any) => { if (o.isMesh) o.userData.shared = true; });      // Geometrie gehört der Vorlage und bleibt beim Verlassen erhalten
  parent.add(body);
  return body;
}

// ---------- Innenraum aufbauen ----------
function build(st: Station) {
  kind = st.kind;
  deck = hasDeck(st.id) ? buildDeck(st.id, HZ0) : null;
  if (hasDeck(st.id) && !deck) loadDeck(st.id);      // noch nicht da: beim nächsten Betreten
  const dk = deck, pm = dk ? null : promMeta();
  hasProm = !!pm;
  dims = pm ? pm.dims! : PROM[kind];
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

  rects = []; obstacles = []; inters = []; labels = []; persons = []; walkers = []; chats = []; leavers = []; settledT = G.time;
  const stalls: { x: number; z: number; s: number; who: Stand }[] = [];   // Stände mit Personal (für die Besorgungen der Läufer)
  const block = (x0: number, x1: number, z0: number, z1: number) => obstacles.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]);

  // ===== Hangar =====
  const HL = HZ1 - HZ0, HC = (HZ0 + HZ1) / 2;
  // Bastion: Hangar im Look des Bastion-Baukastens (deck.ts). Sonst das Hangar-Modell aller Stationen; ohne Modell die Grundformen unten
  const nh = st.id === 'bastion' ? buildHangar() : null;
  if (st.id === 'bastion' && !nh) loadHangar();
  const hm = nh ? true : addHangarModel(g, pal);
  if (nh) { g.add(nh.group); kitHangar = true; }      // vorberechnetes Licht wie beim Baukasten-Hangar (zoneLight)
  hangarUpdate = nh ? nh.update : null; hangarBuild = nh;
  hangarBody = nh ? nh.group : hm ? g.children[g.children.length - 1] : null;
  if (!hm) {
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
  }
  // Kraftfeld im Tor
  field = new THREE.Mesh(new THREE.PlaneGeometry(DW * 2, DH), mat(new THREE.MeshBasicMaterial({ color: 0x60b8ff, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })));
  field.position.set(0, DH / 2, HZ1);
  deco.add(field);
  if (!hm) {
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
  } else if (nh) for (const b of nh.blocks) obstacles.push(b);      // Standflächen aus den Bausteinen (Spantfüße, Regale, Container, Fahrzeuge, Wandfüllungen)
  else for (const b of (kitHangar ? kitMeta('Hangar').blocks! : HANGAR_BLOCKS)) block(b[0], b[1], b[2], b[3]);   // Requisiten des Modells
  // Hangar-Terminal mit Deckmeister
  const nm = [...NAMES].sort(() => R.next() - 0.5);
  let master: Stand | null = null;
  // Personal: Figur passend zum Namen (bis Alpha 1.18 stand an jedem Stand die Frauenfigur, auch wenn eine Männerstimme antwortete)
  const staffModel = (name: string) => (isFem(name) ? 'merchant' : ['worker', 'mechaniker', 'lagerarbeiter'][hashStr(name) % 3]);
  {
    const tx = 9, tz = HZ0 + 2.2;
    if (!hm) box(S, mDark, 3, 1.15, 0.9, tx, 0.575, tz);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), mat(new THREE.MeshBasicMaterial({ map: signTex('Hangar', pal.css) })));
    scr.position.set(tx, hm ? 3.3 : 2.9, HZ0 + (hm ? 0.33 : 0.05)); deco.add(scr);
    block(tx - 1.6, tx + 1.6, HZ0, tz + 0.6);
    const name = nm.pop()!;
    const p = buildPerson(0x4a5a6a, 0xd8a888, 0x2a2018, pal.accent, 'idle', isFem(name) ? 'merchant' : 'mechaniker');   // Deckmeister oder Deckmeisterin
    p.g.position.set(tx + 3, 0, tz + 0.4); deco.add(p.g);
    persons.push({ p, x: tx + 3, z: tz + 0.4, face: 0, name });
    master = persons[persons.length - 1];
    labels.push({ p: new THREE.Vector3(tx + 3, 2.0, tz + 0.4), text: `${name} · Hangar`, col: pal.css });
    inters.push({ x: tx + 1.5, z: tz + 2, r: 3.4, label: () => `${name} ansprechen · Hangar`, act: () => talk(name, 'hangar') });
  }
  rects.push([-HW, HW, HZ0, HZ1 - 1.5]);

  // ===== Bastion: Deck 3 statt Korridor und Promenade =====
  if (dk) {
    g.add(dk.group);
    for (const r of dk.rects) rects.push(r);
    for (const b of dk.blocks) obstacles.push(b);
  }
  // ===== Korridor =====
  const CC = HZ0 - CL / 2;
  const promBody = pm ? addPromModel(g, pal.accent) : null;
  if (!pm && !dk) {
  box(S, mFloor, CW * 2, 0.5, CL + 1.2, 0, -0.25, CC);
  box(S, mCeil, CW * 2, 0.5, CL + 1.2, 0, CH + 0.25, CC);
  for (const s of [-1, 1]) {
    box(S, mWall, 0.6, CH, CL, s * (CW + 0.3), CH / 2, CC);
    box(deco, mAccent, 0.08, 0.3, CL, s * (CW - 0.05), 1.2, CC);
  }
  box(deco, mLight, 0.5, 0.08, CL - 2, 0, CH - 0.05, CC);
  }
  if (!dk) rects.push([-CW, CW, PZ1 - 2, HZ0 + 2]);

  // ===== Promenade =====
  const PC = (PZ0 + PZ1) / 2, WW = PW - 5, WY0 = 1.5, WY1 = PH - 1.4;
  if (!pm && !dk) {
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
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW * 2, WY1 - WY0), mGlass); glass.position.set(0, (WY0 + WY1) / 2, PZ0 - 0.1); if (!dk) deco.add(glass);
  if (!pm && !dk) {
  for (let x = -WW; x <= WW + 0.1; x += WW / 3) box(S, mDark, 0.35, WY1 - WY0, 0.5, x, (WY0 + WY1) / 2, PZ0 - 0.1);
  for (let z = PZ0 + 6; z < PZ1 - 2; z += 9) {
    box(deco, mLight, PW * 1.1, 0.1, 0.5, 0, PH - 0.06, z);
    box(S, mDark, PW * 2, 0.5, 0.6, 0, PH - 0.25, z + 4.5);
  }
  }
  if (!dk) rects.push([-PW, PW, PZ0, PZ1]);

  // Stände: links Handel, rechts Technik
  const tabs = interiorHooks.tabs().filter(t => t !== 'hangar');
  const left = tabs.filter(t => ['markt', 'ausruester', 'raffinerie', 'auftraege', 'lager'].includes(t)), right = tabs.filter(t => !left.includes(t));
  const suits = [0x8a5a3a, 0x3a5a8a, 0x5a7a4a, 0x7a4a6a, 0x4a6a7a, 0x8a7a3a], skins = [0xe0b090, 0xc89070, 0x9a6a4a, 0xf0c8a8, 0x7a5238], hairs = [0x1a1410, 0x4a3020, 0x8a6a40, 0x909090, 0x2a2a30];
  const goods: Record<string, number[]> = { ausruester: [0x5fd0ff, 0xc070ff, 0x8a8f9a], markt: [0xd9822b, 0xbfe6ff, 0xe8664a], raffinerie: [0xc4c8d0, 0xff9a6a, 0xc8dcff], auftraege: [0xe8e2d6], missionen: [0x7cc4ff, 0xffb347], lager: [0x8a8f9a, 0x5a6068], werft: [0x6a9ad8], werkstatt: [0xffb347, 0x9aa0a8], service: [0xff6b5b, 0xffd27a], info: [0x7cc4ff] };
  if (!dk) for (const [list, s] of [[left, -1], [right, 1]] as const) {
    if (pm) {
      // Modell: feste Ladennischen (fünf je Seite); belegt wird gleichmäßig verteilt, leere Nischen bleiben geschlossen
      const sl = pm.slots!.filter(q => Math.sign(q.x) === s).sort((a, b) => b.z - a.z), used = new Set<number>();
      list.forEach((tab, i) => {
        const k = Math.min(sl.length - 1, Math.max(0, Math.round((i + 0.5) * sl.length / list.length - 0.5))), q = sl[k], name = nm.pop() || 'Kim';
        used.add(k);
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.91), mat(new THREE.MeshBasicMaterial({ map: signTex(TAB_N[tab], pal.css) })));
        sg.position.set(q.sx, q.sy, q.sz); sg.rotation.y = -s * Math.PI / 2; deco.add(sg);
        const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent, 'idle', staffModel(name));
        p.g.position.set(q.x, 0, q.z); p.g.rotation.y = -s * Math.PI / 2; deco.add(p.g);
        persons.push({ p, x: q.x, z: q.z, face: -s * Math.PI / 2, name, span: 1.2 });
        stalls.push({ x: q.tx, z: q.tz, s, who: persons[persons.length - 1] });
        labels.push({ p: new THREE.Vector3(q.x, 2.0, q.z), text: `${name} · ${TAB_N[tab]}`, col: pal.css });
        inters.push({ x: q.tx, z: q.tz, r: 3.2, label: () => `${name} ansprechen · ${TAB_N[tab]}`, act: () => talk(name, tab) });
      });
      // Rollläden des Modells (Shutter_L0 … Shutter_R4): nur vor leeren Nischen sichtbar
      promBody!.traverse((o: any) => { const m = /^Shutter_([LR])(\d)/.exec(o.name || ''); if (m && (m[1] === 'L') === (s < 0)) o.visible = !used.has(+m[2]); });
      sl.forEach((q, k) => {
        if (used.has(k)) return;
        const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 0.91), mat(new THREE.MeshBasicMaterial({ map: signTex('Geschlossen', '#2a2e36', '#7a808a') })));
        sg.position.set(q.sx, q.sy, q.sz); sg.rotation.y = -s * Math.PI / 2; deco.add(sg);
      });
      continue;
    }
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
      const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent, 'idle', staffModel(name));
      p.g.position.set(wx - s * 1.6, 0, z); p.g.rotation.y = -s * Math.PI / 2; deco.add(p.g);
      persons.push({ p, x: wx - s * 1.6, z, face: -s * Math.PI / 2, name, span: 1.2 });
      stalls.push({ x: wx - s * 4.4, z, s, who: persons[persons.length - 1] });
      labels.push({ p: new THREE.Vector3(wx - s * 1.6, 2.0, z), text: `${name} · ${TAB_N[tab]}`, col: pal.css });
      inters.push({ x: wx - s * 4.4, z, r: 3.2, label: () => `${name} ansprechen · ${TAB_N[tab]}`, act: () => talk(name, tab) });
    });
  }
  // Holo-Tisch mit Galaxiekarte
  if (!dk) {
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
  if (pm) for (const b of pm.blocks || []) block(b[0], b[1], b[2], b[3]);   // Standflächen aus dem Modell (Läden, Bänke, Kübel, Automaten)
  // Bänke und Pflanzkübel
  if (!pm && !dk) for (const s of [-1, 1]) {
    const bz = PZ0 + 5;
    box(S, mDark, 4, 0.45, 1, s * (WW - 3.5), 0.225, bz); block(s * (WW - 3.5) - 2.1, s * (WW - 3.5) + 2.1, bz - 0.6, bz + 0.6);
    for (const pz of [PZ1 - 2.5, PZ0 + 2.2]) {
      const px = s * (pz > PC ? CW + 3 : PW - 2);
      box(S, mDark, 1.4, 0.8, 1.4, px, 0.4, pz);
      const bush = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.8, 7), mGreen); bush.position.set(px, 1.7, pz); deco.add(bush);
      block(px - 0.8, px + 0.8, pz - 0.8, pz + 0.8);
    }
  }
  // Leute, die unterwegs sind. Seit Alpha 1.19 erledigen sie dabei etwas: Sie treten an einen Stand und reden mit dem Personal, bleiben am
  // Fenster oder an der Galaxiekarte stehen, prüfen im Hangar ein Wandgerät oder sprechen beim Deckmeister vor. Ein Haltepunkt ist eine
  // Wegmarke mit Stop; ob die Figur ihn anläuft, entscheidet sie an der Marke davor (nextNode), sonst überspringt sie ihn.
  type Node = [number, number, Stop | null];
  const mkWalker = (nodes: Node[], start: number, rev = false) => {
    // Startmarke: eine ohne Haltepunkt, falls es welche gibt (start zählt dann nur diese)
    const ns = rev ? [...nodes].reverse() : nodes, free = ns.map((n, i) => (n[2] ? -1 : i)).filter(i => i >= 0), i = free.length ? free[start % free.length] : start % ns.length;
    // gemischte Belegschaft: Frauen (Händlerin im Mantel) und Männer zu gleichen Teilen
    const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent, 'walk', R.pick(['worker', 'merchant', 'mechaniker', 'merchant', 'lagerarbeiter', 'merchant']));
    deco.add(p.g);
    const w: Walker = { p, path: ns.map(n => [n[0], n[1]]), stops: ns.map(n => n[2]), i, to: i, x: ns[i][0], z: ns[i][1], ph: R.range(0, 6), wait: 0, rest: false, at: null, leave: false, say: 0, sayI: 0, look: new THREE.Vector3() };
    nextNode(w); walkers.push(w);
  };
  const lx = PW - 6.2, hz = PC + 2, toward = (x: number, z: number, tx: number, tz: number) => Math.atan2(tx - x, tz - z);
  const stallStop = (q: typeof stalls[0], dz: number): Node => { const x = q.s * (Math.abs(q.x) - 0.1), z = q.z + dz; return [x, z, { x, z, face: toward(x, z, q.who.x, q.who.z), t: [7, 15], p: 0.24, who: q.who }]; };
  const look = (x: number, z: number, face: number, t: [number, number], p: number): Node => [x, z, { x, z, face, t, p }];
  // Runde über die Promenade (Uhrzeigersinn von oben: linke Seite hinunter, am Fenster entlang, rechte Seite hinauf)
  const loop: Node[] = [[-lx, PZ1 - 5, null],
    ...stalls.filter(q => q.s < 0).sort((a, b) => b.z - a.z).map(q => stallStop(q, 0.9)),
    [-lx, PZ0 + 8, null], look(-2.4, PZ0 + 6.9, Math.PI, [6, 14], 0.35), look(2.6, PZ0 + 6.9, Math.PI, [6, 14], 0.35), [lx, PZ0 + 8, null],
    ...stalls.filter(q => q.s > 0).sort((a, b) => a.z - b.z).flatMap(q => (q.z < hz && q.z > hz - 9 ? [stallStop(q, -0.9), look(2.7, hz + 0.4, toward(2.7, hz + 0.4, 0, hz), [5, 10], 0.25)] : [stallStop(q, -0.9)])),
    [lx, PZ1 - 5, null]];
  if (!dk) for (let i = 0; i < (kind === 'outpost' ? 2 : 4); i++) mkWalker(loop, i, i % 2 === 1);
  // Hangar: einer pendelt zwischen dem Regal an der Rückwand und dem Deckmeister, einer geht die große Runde an den Wandgeräten vorbei.
  // Die kleine Runde liegt 9 m vor dem Treffpunkt der Geschichte (hangarSpot), damit niemand durch ein Gespräch läuft.
  const mz = HZ0 + 16;
  mkWalker([[-50, mz, null], look(-52, HZ0 + 7.2, Math.PI, [6, 12], 0.5), [-50, mz + 6, null], [30, mz + 6, null], [30, mz, null],
    ...(master ? [[15.6, HZ0 + 5.6, { x: 15.6, z: HZ0 + 5.6, face: toward(15.6, HZ0 + 5.6, master.x, master.z), t: [7, 13], p: 0.5, who: master }] as Node] : []), [14, mz, null]], 0);
  // An jeder Längswand pendelt jemand zwischen Tor und Rückwand und sieht unterwegs nach den Wandgeräten. An den Enden bleibt er kurz stehen
  // und kehrt mit einer halben Drehung um. (Bis Alpha 1.18 lief eine Figur die große Runde, auch dicht am Treffpunkt der Geschichte vorbei.)
  for (const sd of [1, -1]) {
    // Wandgerät: von der Gehspur (1,7 m vor den Wandpfeilern) hin und zurück; die Spurmarken davor und dahinter halten den Weg von den Pfeilern frei
    const wx = sd * 85.6, unit = [63.5, 19.5, -24.5].map(z => [[wx, z + 4.5, null], look(sd * 87.3, z, sd * Math.PI / 2, [6, 12], 0.35), [wx, z - 4.5, null]] as Node[]);
    mkWalker([look(wx, 92, 0, [5, 10], 1), ...unit.flat(), look(wx, HZ0 + 13, Math.PI, [4, 8], 1), ...unit.map(u => [...u].reverse()).reverse().flat()], sd > 0 ? 0 : 5, sd < 0);
  }

  // Gesprächsgruppen (seit Alpha 1.19): zwei oder drei Leute stehen beisammen und reden abwechselnd, die anderen sehen den Sprecher an.
  // Sie stehen neben den Laufwegen und sind für den Piloten ein Hindernis wie ein Möbel.
  const mkChat = (x: number, z: number, n: number) => {
    const kinds = ['merchant', 'worker', 'mechaniker', 'lagerarbeiter'].sort(() => R.next() - 0.5), a0 = R.range(0, 6.28), r = n === 2 ? 0.68 : 0.88, m: Stand[] = [];
    for (let i = 0; i < n; i++) {
      const a = a0 + i * 6.2832 / n + R.range(-0.2, 0.2), px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r, face = a + Math.PI + R.range(-0.22, 0.22);
      const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent, 'idle', kinds[i]);
      p.g.position.set(px, 0, pz); p.g.rotation.y = face; deco.add(p.g);
      const q: Stand = { p, x: px, z: pz, face, home: face, fix: true, look: new THREE.Vector3() };
      if (p.anim) p.anim.look = q.look!;
      persons.push(q); m.push(q);
    }
    block(x - r - 0.35, x + r + 0.35, z - r - 0.35, z + r + 0.35);
    chats.push({ m, x, z, sp: 0, t: R.range(0.5, 4), gap: true });
  };
  const gx = Math.min(3.9, lx - 3.2);
  if (!dk) mkChat(-gx, PZ1 - PD * 0.28, 3);
  if (!dk && kind !== 'outpost') mkChat(gx - 0.7, PZ0 + PD * 0.28, 2);
  // im Hangar links vom Ausgang und weit rechts: Der Treffpunkt der Geschichte (hangarSpot) liegt dazwischen und bleibt frei
  mkChat(-22, HZ0 + 9, kind === 'outpost' ? 2 : 3);
  if (kind !== 'outpost') mkChat(58, HZ0 + 8.5, 2);

  // Bastion, Deck 3: Das Personal der Dienste steht an den Tresen in den Räumen (statt an den Ständen der Promenade), dazu Läufer und Gruppen
  if (dk) {
    const here = new Set(interiorHooks.tabs()), byTab: Record<string, Stand> = {};
    for (const sp of dk.spots) {
      const svc = sp.tab in TAB_N;      // sonst eine Figur ohne Dienst (Krankenstation, Schmelzmeister): sagt nur ihren Satz
      if (svc && !here.has(sp.tab)) continue;
      const name = nm.pop() || 'Kim', title = svc ? TAB_N[sp.tab] : sp.titel || 'Krankenstation', line = sp.satz || 'Alles ruhig hier. Wer verletzt ist, legt sich hin und wartet.';
      const p = buildPerson(R.pick(suits), R.pick(skins), R.pick(hairs), pal.accent, 'idle', staffModel(name));
      p.g.position.set(sp.x, 0, sp.z); p.g.rotation.y = sp.face; deco.add(p.g);
      const q: Stand = { p, x: sp.x, z: sp.z, face: sp.face, name, span: 1.2 };
      persons.push(q); byTab[sp.tab] = q;
      labels.push({ p: new THREE.Vector3(sp.x, 2.0, sp.z), text: `${name} · ${title}`, col: pal.css });
      // Figuren ohne Dienst können eine Stationsaufgabe vergeben (aufgaben.ts); sonst sagen sie ihren Satz
      const stId = st.id;
      inters.push({ x: sp.tx, z: sp.tz, r: 2.3, label: () => (svc ? null : aufgabeLabel(stId, sp.tab, name)) || `${name} ansprechen · ${title}`, act: svc ? () => talk(name, sp.tab) : () => { if (!aufgabeTalk(stId, sp.tab, name, say)) say(name, line); } });
    }
    labels.push({ p: new THREE.Vector3(dk.map.x, 2.7, dk.map.z), text: 'Galaxiekarte', col: '#7cc4ff' });
    inters.push({ x: dk.map.x, z: dk.map.z, r: 2.6, label: () => 'Galaxiekarte öffnen', act: () => interiorHooks.openMap() });
    dk.routes.forEach((rt, i) => {
      const nodes: Node[] = rt.map(n => [n.x, n.z, n.stop ? { x: n.x, z: n.z, face: n.stop.face, t: n.stop.t, p: n.stop.p, who: n.stop.who ? byTab[n.stop.who] : undefined } : null]);
      mkWalker(nodes, i * 3);
      if (i < 2) mkWalker(nodes, i * 3 + 7, true);
    });
    for (const [x, z, n] of dk.chats) mkChat(x, z, n);
    if (dk.quartier) quartierAufbau(dk.quartier, g);      // Aufzug auf Deck 3 und das Quartier (game/quartier.ts)
  }

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
  const re = activeRamp();
  if (re) {      // Rampenschalter außen am Fuß der Heckrampe (Wisent)
    SHIP.g.updateMatrixWorld(true); const p = group!.worldToLocal(SHIP.g.localToWorld(new THREE.Vector3(re.hw + 1.2, 0, re.foot - 0.6)));
    shipInters.push({ x: p.x, z: p.z, r: 1.8, label: () => RAMP.want ? 'Laderampe schließen' : 'Laderampe öffnen', act: () => { RAMP.want = !RAMP.want; sfx('gear', 0.6, 1, () => snd(140, 0.5, 'sawtooth', 0.03, RAMP.want ? -40 : 40)); say('SYSTEM', RAMP.want ? 'Laderampe fährt aus.' : 'Laderampe fährt ein.'); } } as Inter);
  }
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
  // direkte Lenkung: Zeiger eingefangen lassen, gleich danach wird geflogen (sonst stünde er irgendwo und müsste neu geholt werden)
  IN.locked = false; if (settings.steer === 'zeiger' && document.pointerLockElement === gl) document.exitPointerLock();
  for (const g2 of SHIP.glows) g2.visible = true;
  sfx('launch', dir > 0 ? 0.7 : 0.45, dir > 0 ? 1 : 0.85, () => snd(300, 0.6, 'sawtooth', 0.05, dir > 0 ? 500 : -300));
}
// Spielstand zu Fuß geladen (main.ts, resumeAt): Das Schiff steht schon auf dem Platz, kein Landeablauf. at: Standpunkt beim Speichern,
// gilt nur, wenn dort frei ist (sonst bleibt es beim Platz neben dem Schiff).
let noSeq = false;
export function enterStanding(st: Station, mode: boolean | 'city', at?: { x?: number; z?: number; yaw?: number }) {
  noSeq = true;
  try { enterInterior(st, mode); } finally { noSeq = false; }
  if (!IN.active) return;
  for (const g2 of SHIP.glows) g2.visible = false;      // Triebwerke aus, wie nach dem Aufsetzen
  if (at && at.x !== undefined && at.z !== undefined && isFinite(at.x) && isFinite(at.z) && free(at.x, at.z)) { IN.x = at.x; IN.z = at.z; IN.yaw = at.yaw || 0; }
  // im Quartier gespeichert: im eigenen Quartier weiter (ohne eigenes Quartier vor dem Aufzug auf Deck 3)
  const Q = deck?.quartier;
  if (Q && Q.drin(IN.x, IN.z)) {
    if (P.quartier) quartierSetzen(P.name, eigeneDeko());
    else { [IN.x, IN.z, IN.yaw] = Q.halle.ankunft; }
  }
}
// Nach einem Abschuss in der eigenen Koje aufwachen (main.ts, hooks.respawn): Figur auf die Bettkante
export function inKojeAufwachen() {
  const Q = deck?.quartier; if (!Q || !IN.active || !P.quartier) return false;
  quartierSetzen(P.name, eigeneDeko());
  IN.x = Q.koje[0]; IN.z = Q.koje[1]; IN.yaw = Math.atan2(Q.koje[0] - Q.mitte[0], Q.koje[1] - Q.mitte[1]); IN.pitch = 0;
  return true;
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
// mode: false = mit dem Schiff (Landeanflug), true = Planetenbasis zu Fuß, 'city' = aus der Stadt zu Fuß durch die Promenadentür
export function enterInterior(st: Station, mode: boolean | 'city' = false) {
  QS.in = false; QS.owner = ''; QS.deko = null;
  const onFoot = mode === true, fromCity = mode === 'city';
  if (IN.active) leaveInterior();
  IN.active = true; IN.station = st;
  crewBesuch(st, P.sector); bub = null; barkT = 0; paDone = false;
  group = build(st);
  stationGroup = group;
  const Y = st.launch.yaw, fx = -Math.sin(Y), fz = -Math.cos(Y);
  group.position.set(st.launch.x - fx * HZ1, st.launch.y - DH / 2, st.launch.z - fz * HZ1);
  if (onFoot) group.position.y -= 600;   // Planetenbasis zu Fuß: Innenraum tief unter dem Gelände (sonst ragt der Boden hinein)
  group.rotation.y = Y + Math.PI;
  group.updateMatrixWorld(true);
  scene.add(group);
  st.mesh.visible = false;
  const PZ0 = PZ1 - dims.d, L = Math.PI;
  const lp: [number, number, number, number, number][] = [[0, HH - 4, PADZ, 280, 0.5], [0, dims.h - 1.4, (PZ0 + PZ1) / 2, 75, hasProm ? 0.3 : 0.5], [0, CH - 0.5, HZ0 - CL / 2, 22, hasProm ? 0.16 : 0.36]];
  setExposure(0.2);
  lamps.forEach((l, i) => { group!.localToWorld(l.position.set(lp[i][0], lp[i][1], lp[i][2])); l.distance = lp[i][3]; l.intensity = lp[i][4] * L; });
  ambIn = ambient.intensity; sunIn = sun.intensity; rimOut.copy(rim.color); zoneT = -1; ambSet = -1;
  refreshHangarShips();
  // Neben dem Schiff aussteigen, Blick zur Tür
  const hw = (shipObs[0][1] - shipObs[0][0]) / 2;
  IN.x = Math.min(HW - 6, hw + 5); IN.z = -30;
  IN.yaw = Math.atan2(IN.x, 20); IN.pitch = 0; IN.bob = 0; IN.dist = 0; IN.target = null;
  camera.near = 0.12; camera.updateProjectionMatrix();
  G.inside = true; resetTpCam();
  G.mode = 'walk';
  if (onFoot) {
    // Planetenbasis zu Fuß: im Gang hinter der Außentür, Hangar dahinter gesperrt
    obstacles.push([-HW, HW, HZ0 - 0.7, HZ1]);
    const door = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.BoxGeometry(CW * 2 + 0.4, CH, 0.3), mat(new THREE.MeshStandardMaterial({ color: 0x5a5e66, roughness: 0.55, metalness: 0.6 })));
    wall.position.set(0, CH / 2, HZ0 - 0.4); door.add(wall);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.12), mat(new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.4, metalness: 0.8 })));
    leaf.position.set(0, 1.3, HZ0 - 0.6); door.add(leaf);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.32), mat(new THREE.MeshBasicMaterial({ map: signTex('Ausgang', PAL[kind].css), toneMapped: false })));
    sign.position.set(0, 2.95, HZ0 - 0.62); sign.rotation.y = Math.PI; door.add(sign);
    group.add(door);
    inters.push({ x: 0, z: HZ0 - 1.4, r: 2.4, label: () => `${st.name} verlassen`, act: () => interiorHooks.leaveBase() });
    // Landefeld-Terminal links neben der Tür: Schiffe wechseln, verkaufen, lackieren. Seit Alpha 1.25 gibt es kein Stationsmenü mehr,
    // und in der Basis fehlt der Hangar mit dem Deckmeister; das Schiff steht draußen auf dem Landefeld.
    const lt = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.3), mat(new THREE.MeshBasicMaterial({ map: signTex('Landefeld', PAL[kind].css), toneMapped: false })));
    lt.position.set(-2.15, 1.7, HZ0 - 0.62); lt.rotation.y = Math.PI; door.add(lt);
    inters.push({ x: -2.1, z: HZ0 - 1.3, r: 1.5, label: () => 'Landefeld-Terminal · deine Schiffe', act: () => interiorHooks.openTab('hangar', 'Landefeld-Terminal: deine Schiffe an dieser Basis.') });
    IN.x = 0; IN.z = HZ0 - 2.6; IN.yaw = 0;
    say('SYSTEM', `Willkommen in ${st.name}. Der Gang führt zur ${PAL[kind].hall}.`);
  } else if (fromCity) {
    IN.x = 0; IN.z = PZ0 + 2.6; IN.yaw = Math.PI;   // hinter der Tür am Ende der Promenade, Blick zum Hangar
    say('SYSTEM', `Promenade von ${st.name}. Dein Schiff steht im Hangar.`);
  } else {
    if (!noSeq) beginSeq(-1, 4.5, null);   // Landung: das Schiff kommt durchs Tor herein und setzt auf
    say('SYSTEM', deck ? `Willkommen auf ${st.name}. Durch die Schleuse an der Rückwand geht es auf ${deck.name === 'Deck 3' ? 'Deck 3' : 'das ' + deck.name}.` : `Willkommen auf ${st.name}. Folge dem Korridor zur ${PAL[kind].hall}.`);
  }
  // Stadt: Tür am Ende der Promenade hinaus auf den Marktplatz
  if ((st.def as any).city && !onFoot) {
    const door = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.9, 0.14), mat(new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.4, metalness: 0.8 })));
    leaf.position.set(0, 1.45, PZ0 + 0.25); door.add(leaf);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.6), mat(new THREE.MeshStandardMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.6 })));
    glass.position.set(0, 1.75, PZ0 + 0.33); door.add(glass);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.42), mat(new THREE.MeshBasicMaterial({ map: signTex('Stadt · Markt', PAL[kind].css), toneMapped: false })));
    sign.position.set(0, 3.25, PZ0 + 0.34); door.add(sign);
    group.add(door);
    inters.push({ x: 0, z: PZ0 + 1.2, r: 2.4, label: () => `Hinaus in die Stadt ${st.name}`, act: () => interiorHooks.toCity() });
  }
  // Shader des Innenraums im Hintergrund übersetzen, so lange steht das Spiel hinter einer kurzen Blende (statt eines Standbilds mitten in der Landung)
  // Hinter der Blende: Spiegelungen und alle Bilder und Formen des Innenraums (auch gerade unsichtbare). Den Zustand „an Bord“ wärmt
  // prewarmShipRoom erst nach der Landung vor (updateWalk): Hinter der Blende passt die Szene noch nicht dazu (gemessen: 14 Shader beim Einsteigen).
  warmScene(onFoot || fromCity ? 'Eintreten' : 'Andocken', () => { deck?.prime(); hangarBuild?.prime(); if (group) uploadAll(group); });
}
// ---------- Schiffsinnenraum vorwärmen (seit 2026-11-18) ----------
// Beim Einsteigen kommen die Lampen des Innenraums als neue Lichter in die Szene, dazu eine andere Umgebungsspiegelung. Danach brauchten alle
// Materialien (Hangar, Deck, Schiffe, Figuren) eine neue Shader-Fassung: Beim ersten Einsteigen stand das Bild 1 bis 3 s. Jetzt wird der
// Innenraum gleich nach dem Andocken (sobald die Blende offen ist, oder nach einem Schiffswechsel) für einen Augenblick dazugesetzt, alles
// Sichtbare für diesen Zustand übersetzt (der Browser macht das nebenher) und gleich wieder herausgenommen. Gezeichnet wird dazwischen nichts.
// Nur Sichtbares: three.js übersetzt sonst jedes Objekt der Szene, auch versteckte (andere Schiffsmodelle, Ersatzmodelle) – das waren 40
// statt gut 13 Shader und dauerte 7 s.
let shipWarmKey = '';
// Leuchtflächen im Schiffsinnenraum: Von außen sollen Fenster und Lichter leuchten, drinnen blendeten Deckenlichter und Lichtbänder
// (Leuchtstärke 2,7 bis 3, dazu der Lichtschein). Solange man an Bord ist, leuchten sie schwächer (gleiches Material, nur ein Wert: kein neuer Shader).
// Kormoran: Deckenlicht, Lichtband, Blitzlicht; Wisent: Leuchte (Deckenleisten), Bodenlicht (Felder im Boden), Portallicht. Zusätze wie „ |tor“ zählen mit.
const ROOM_GLOW: Record<string, number> = { 'Deckenlicht (Spiel)': 0.2, 'Lichtband (Spiel)': 0.22, 'Blitzlicht (Spiel)': 0.25, 'Leuchte (Spiel)': 0.15, 'Bodenlicht (Spiel)': 0.32, 'Portallicht (Spiel)': 0.4, 'Licht Rot (Spiel)': 0.6, 'Licht bernstein (Spiel)': 0.5, 'Licht petrol (Spiel)': 0.6, 'Ambientlicht (Spiel)': 0.7, 'Energiekern (Spiel)': 0.6 };
let glowDim: [THREE.MeshStandardMaterial, number, number][] = [];
// Leuchtenabdeckungen: an Bord nur Eigenleuchten, keine Grundfarbe (sonst strahlen die Lampen darunter sie zusätzlich an)
const ROOM_GLOW_FLAT = new Set(['Deckenlicht (Spiel)', 'Lichtband (Spiel)', 'Blitzlicht (Spiel)', 'Leuchte (Spiel)', 'Bodenlicht (Spiel)']);
function dimRoomGlow(root: THREE.Object3D) {
  undimRoomGlow();
  const seen = new Set<THREE.Material>();
  root.traverse((o: any) => { if (!o.isMesh) return; for (const m of (Array.isArray(o.material) ? o.material : [o.material]) as THREE.MeshStandardMaterial[]) {
    const nm = m ? m.name.split(' |')[0] : '', k = ROOM_GLOW[nm]; if (!k || seen.has(m)) continue; seen.add(m); glowDim.push([m, m.emissiveIntensity, m.color.getHex()]); m.emissiveIntensity *= k; if (ROOM_GLOW_FLAT.has(nm)) m.color.setHex(0x000000); } });
}
function undimRoomGlow() {
  for (const [m, v, c] of glowDim) { m.emissiveIntensity = v; m.color.setHex(c); } glowDim = [];
}
// Läuft im ersten Bild zu Fuß nach der Landung (stepShipWarm in updateWalk), in einem Zug: Auf viele Bilder verteilt war es schlechter
// (gemessen: ein Bild mit 1,3 s – die normalen neuen Shader mussten hinter der Warteschlange warten). Teile mit Lichtern werden zerlegt,
// damit keine Lampe doppelt zählt.
let shipWarm: { g: THREE.Group; queue: THREE.Object3D[] } | null = null;
function prewarmShipRoom() {
  const cls = P.cls;
  if (room || !IN.active || !hasMeshRoom(cls) || !meshRoomReady(cls)) return;
  const key = (IN.station?.id || '') + ':' + cls;
  if (shipWarmKey === key) return;
  const mr = buildMeshRoom(cls); if (!mr) return;
  shipWarmKey = key;
  SHIP.g.getWorldPosition(mr.g.position); mr.g.rotation.y = SHIP.g.rotation.y; mr.g.updateMatrixWorld(true);
  shipWarm = { g: mr.g, queue: [...mr.g.children, ...scene.children.filter(c => c.visible)] };
}
const hasLight = (o: THREE.Object3D) => { let l = false; o.traverseVisible((c: any) => { if (c.isLight) l = true; }); return l; };
function stepShipWarm() {
  if (!shipWarm) return;
  if (room) { shipWarm = null; return; }
  if (G.mode !== 'walk' || warm.hold) return;
  const W = shipWarm, env0 = scene.environment;
  scene.add(W.g); scene.environment = interiorEnv();
  try {
    while (W.queue.length) {
      const r = W.queue.shift()!;
      if ((r as any).isLight || !r.visible || r === W.g) continue;
      if (hasLight(r)) { W.queue.unshift(...r.children); continue; }      // Lichter nicht doppelt zählen: in Teile ohne Lichter zerlegen
      // versteckte Zweige für den Aufruf aus den Kinderlisten nehmen (ohne Ereignisse, Reihenfolge bleibt erhalten)
      const cut: [THREE.Object3D, number][] = [];
      const visit = (o: THREE.Object3D) => { for (let i = 0; i < o.children.length; i++) { const c = o.children[i]; if (!c.visible) cut.push([c, i]); else visit(c); } };
      visit(r);
      for (let i = cut.length - 1; i >= 0; i--) cut[i][0].parent!.children.splice(cut[i][1], 1);
      try { compileFor(r, scene).catch?.(() => {}); } finally { for (const [c, i] of cut) c.parent!.children.splice(i, 0, c); }
    }
  } catch (e) { console.warn('Schiffsinnenraum vorwärmen:', e); W.queue.length = 0; }
  finally { scene.remove(W.g); scene.environment = env0; }
  if (!W.queue.length) shipWarm = null;
}
// direkte Lenkung: beim Wechsel ins Fliegen den Zeiger nicht freigeben
const keepLockForFlight = () => settings.steer !== 'zeiger' && (G.mode === 'play' || G.mode === 'launch');
export function leaveInterior() {
  shipWarmKey = ''; shipWarm = null;
  if (room) leaveShip();
  if (!IN.active) return;
  if ((hasProm || kitHangar) && zoneT >= 0) rim.color.copy(rimOut);
  if (document.pointerLockElement === gl && !keepLockForFlight()) document.exitPointerLock();
  disposeParked();
  clearOthers();
  stationGroup = null;
  if (group) {
    scene.remove(group);
    group.traverse((c: any) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); if (c.isLight && c.dispose) c.dispose(); });      // Lichter: Schattenkarten freigeben (Strahler im Lichtraum, deck.ts)
  }
  for (const d of disposables) d.dispose();
  disposables.length = 0;
  if (deck) deck.release();
  group = null; field = null; holo = null; standGroup = null; deck = null; hangarBody = null; hangarUpdate = null; hangarBuild = null;
  for (const l of lamps) l.intensity = 0;
  setExposure(1);
  if (IN.station) IN.station.mesh.visible = true;
  for (const gl2 of SHIP.glows) gl2.visible = true;
  camera.near = 0.5; camera.updateProjectionMatrix();
  IN.active = false; IN.station = null; IN.target = null; IN.say.t = 0;
  G.inside = false; meHolder.visible = false;
  QS.in = false; QS.owner = ''; QS.deko = null; qDeko = null; qSchild = null; qSchirm = null;
}

// ---------- Quartier auf der Bastion (seit 2026-11-24, game/quartier.ts) ----------
// Das Modell steht im Deck (Anbau, deck.ts). Hier: Aufzug, Koje, Spind, Regal, Bildschirm, Fenster, Türschild mit Nummer und Name, und im
// Regal die Schiffe und Fundstücke des Besitzers (seine Ausstattung, QDeko). Die Fahrt versetzt die Figur hinter einer kurzen Blende.
let qDeko: THREE.Group | null = null, qSchild: { tex: THREE.CanvasTexture; cv: HTMLCanvasElement } | null = null, qQ: DeckQuartier | null = null;
let qSchirm: { tex: THREE.CanvasTexture; cv: HTMLCanvasElement } | null = null;
function quartierAufbau(Q: DeckQuartier, g: THREE.Group) {
  qQ = Q;
  qDeko = new THREE.Group(); qDeko.visible = false; g.add(qDeko);
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 190;
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; disposables.push(tex);
  const pm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }); disposables.push(pm);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(Q.schild.w * 0.94, Q.schild.h * 0.9), pm);
  pl.position.set(Q.schild.x + Q.schild.nx * 0.004, Q.schild.y, Q.schild.z + Q.schild.nz * 0.004); pl.rotation.y = Math.atan2(Q.schild.nx, Q.schild.nz);
  g.add(pl); qSchild = { tex, cv }; schildMalen(null);
  // Hauptschirm am Schreibtisch: eigene Anzeige (Pilot, Credits, Ruf, Uhr) statt der Streifen aus Blender
  if (Q.monitor) {
    const M = Q.monitor, cv2 = document.createElement('canvas'); cv2.width = 1024; cv2.height = 594;
    const t2 = new THREE.CanvasTexture(cv2); t2.colorSpace = THREE.SRGBColorSpace; t2.anisotropy = 4; disposables.push(t2);
    const m2 = new THREE.MeshBasicMaterial({ map: t2, toneMapped: false }); disposables.push(m2);
    const sp = new THREE.Mesh(new THREE.PlaneGeometry(M.w * 0.935, M.h * 0.92), m2);
    sp.position.set(M.x + M.nx * 0.003, M.y, M.z + M.nz * 0.003); sp.rotation.order = 'YXZ'; sp.rotation.set(-M.tilt, Math.atan2(M.nx, M.nz), 0);
    g.add(sp); qSchirm = { tex: t2, cv: cv2 };
  }
  if (Q.karte) {      // Sternkarte über dem Tisch: die Sektoren der Galaxiekarte mit ihren Verbindungen, Heimstatt markiert
    const M = Q.karte, cv3 = document.createElement('canvas'); cv3.width = 768; cv3.height = 648; karteMalen(cv3);
    const t3 = new THREE.CanvasTexture(cv3); t3.colorSpace = THREE.SRGBColorSpace; t3.anisotropy = 4; disposables.push(t3);
    const m3 = new THREE.MeshBasicMaterial({ map: t3, toneMapped: false }); disposables.push(m3);
    const kp = new THREE.Mesh(new THREE.PlaneGeometry(M.w * 0.97, M.h * 0.97), m3);
    kp.position.set(M.x + M.nx * 0.003, M.y, M.z + M.nz * 0.003); kp.rotation.y = Math.atan2(M.nx, M.nz);
    g.add(kp);
  }
  const own = () => QS.owner === P.name;
  const [hx, hz] = Q.halle.aufzug;
  inters.push({ x: hx, z: hz, r: 2.4, label: () => 'Aufzug · Quartiere', act: () => { QS.mode = 'aufzug'; interiorHooks.openTab('quartier', ''); } });
  inters.push({ x: Q.aufzug[0], z: Q.aufzug[1], r: 1.5, label: () => 'Aufzug · zurück auf Deck 3', act: () => quartierFahrt('', null) });
  inters.push({ x: Q.koje[0], z: Q.koje[1], r: 1.7, label: () => (own() ? 'Koje · ausruhen' : `Koje von ${QS.owner}`), act: () => (own() ? kojeRuhen() : say('SYSTEM', `Das ist die Koje von ${QS.owner}. Du bist hier zu Gast.`)) });
  inters.push({ x: Q.spind[0], z: Q.spind[1], r: 1.5, label: () => (own() ? 'Spind öffnen' : `Spind von ${QS.owner} · abgeschlossen`), act: () => { if (own()) interiorHooks.openTab('ausruester', 'Dein Spind im Quartier: einlagern und herausnehmen.', 'spind'); else say('SYSTEM', 'Abgeschlossen.'); } });
  inters.push({ x: Q.regal[0], z: Q.regal[1], r: 1.6, label: () => 'Regal · Sammlung ansehen', act: () => { QS.mode = 'regal'; interiorHooks.openTab('quartier', ''); } });
  inters.push({ x: Q.tisch[0], z: Q.tisch[1], r: 1.5, label: () => (own() ? 'Bildschirm · Übersicht und Gäste' : `Bildschirm von ${QS.owner} · gesperrt`), act: () => { if (own()) { QS.mode = 'schirm'; interiorHooks.openTab('quartier', ''); } else say('SYSTEM', 'Gesperrt. Nur der Besitzer kommt an seinen Bildschirm.'); } });
  inters.push({ x: Q.fenster[0], z: Q.fenster[1], r: 1.8, label: () => 'Aus dem Fenster sehen', act: () => say('SYSTEM', FENSTER[Math.floor(Math.random() * FENSTER.length)]) });
}
const FENSTER = ['Unter der Bastion dreht sich der Planet. Wolkenbänder ziehen über das Meer, auf der Nachtseite glimmen Städte.',
  'Draußen ist es still. Ab und zu blinkt ein Frachter auf dem Weg zum Sprungtor.', 'Die Lufthülle des Planeten leuchtet blau am Rand. Von hier oben sieht alles friedlich aus.'];
function schirmMalen(d: QDeko | null) {
  if (!qSchirm) return;
  const { cv, tex } = qSchirm, c = cv.getContext('2d')!, W = cv.width, H = cv.height, own = !!d && d.name === P.name;
  const bg = c.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#06141a'); bg.addColorStop(1, '#030a0e'); c.fillStyle = bg; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(120,220,230,0.05)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);      // Zeilen
  c.fillStyle = '#0d2a33'; c.fillRect(0, 0, W, 64);
  c.font = 'bold 30px "Segoe UI", Arial, sans-serif'; c.fillStyle = '#7fe6ee'; c.textAlign = 'left';
  c.fillText(`BASTION · QUARTIER ${d ? nrText(d.nr) : ''}`, 28, 43);
  const now = new Date(); c.textAlign = 'right'; c.fillText(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`, W - 28, 43);
  c.textAlign = 'left';
  if (!own) { c.font = 'bold 64px "Segoe UI", Arial, sans-serif'; c.fillStyle = '#ff9b5a'; c.fillText('GESPERRT', 60, 250); c.font = '30px "Segoe UI", Arial, sans-serif'; c.fillStyle = '#8fb0b8'; c.fillText(d ? `Persönlicher Schirm von ${d.name}` : '', 60, 300); tex.needsUpdate = true; return; }
  c.font = 'bold 52px "Segoe UI", Arial, sans-serif'; c.fillStyle = '#e8f4f6'; c.fillText(P.name.toUpperCase(), 40, 140);
  c.font = '28px "Segoe UI", Arial, sans-serif'; c.fillStyle = '#7fa8b0'; c.fillText(`Pilot der Flotte · ${P.shipName}`, 40, 182);
  const rows: [string, string][] = [['Credits', `${Math.floor(P.credits).toLocaleString('de-DE')} Cr`], ['Abschüsse', String(P.kills)], ['Schiffe', String(1 + P.fleet.length)], ['Sektoren', `${P.visited.length} / 18`]];
  rows.forEach(([k, v], i) => { const y = 250 + i * 52; c.fillStyle = '#6f939a'; c.fillText(k, 40, y); c.fillStyle = '#d9eef1'; c.textAlign = 'right'; c.fillText(v, 470, y); c.textAlign = 'left'; c.fillStyle = 'rgba(127,230,238,0.12)'; c.fillRect(40, y + 14, 430, 2); });
  // Ruf als Balken
  c.fillStyle = '#7fe6ee'; c.font = 'bold 26px "Segoe UI", Arial, sans-serif'; c.fillText('RUF', 540, 120);
  Object.entries(P.rep || {}).slice(0, 4).forEach(([f, v], i) => {
    const y = 160 + i * 70, k = Math.max(0, Math.min(1, (+v + 100) / 1100));
    c.font = '26px "Segoe UI", Arial, sans-serif'; c.fillStyle = '#9fc0c6'; c.fillText((REP as Record<string, { n: string }>)[f]?.n || f, 540, y);
    c.fillStyle = '#0f3039'; c.fillRect(540, y + 14, 440, 14); c.fillStyle = '#ffb35a'; c.fillRect(540, y + 14, 440 * k, 14);
  });
  // kleine Kurve: Verdienst
  c.strokeStyle = '#37c7d4'; c.lineWidth = 3; c.beginPath();
  for (let i = 0; i <= 40; i++) { const x = 540 + i * 11, y = 520 - 50 * (0.5 + 0.35 * Math.sin(i * 0.45 + P.earned * 0.001) + 0.15 * Math.sin(i * 1.7)); if (i) c.lineTo(x, y); else c.moveTo(x, y); }
  c.stroke(); c.fillStyle = '#6f939a'; c.font = '22px "Segoe UI", Arial, sans-serif'; c.fillText('Markt Heimstatt · Erzpreise', 540, 570);
  tex.needsUpdate = true;
}
function karteMalen(cv: HTMLCanvasElement) {
  const c = cv.getContext('2d')!, W = cv.width, H = cv.height;
  c.fillStyle = '#040b12'; c.fillRect(0, 0, W, H);
  c.strokeStyle = 'rgba(90,170,210,0.08)'; c.lineWidth = 1;
  for (let x = 0; x < W; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (let y = 0; y < H; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  const R0 = (s: number) => { let h = s; return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296; };
  const rnd = R0(7); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(200,220,255,${0.15 + rnd() * 0.5})`; c.fillRect(rnd() * W, rnd() * H, 1.5, 1.5); }
  const px = (m: [number, number]) => [40 + m[0] / 1000 * (W - 80), 70 + m[1] / 600 * (H - 130)];
  const secs = Object.values(SECTOR) as any[];
  c.strokeStyle = 'rgba(120,200,230,0.35)'; c.lineWidth = 1.5;
  for (const s of secs) for (const l of s.links || []) { const o = (SECTOR as any)[l]; if (!o || l < s.id) continue; const [a, b] = px(s.map), [e, f] = px(o.map); c.beginPath(); c.moveTo(a, b); c.lineTo(e, f); c.stroke(); }
  c.font = '15px "Segoe UI", Arial, sans-serif'; c.textAlign = 'center';
  for (const s of secs) {
    const [x, y] = px(s.map), home = s.id === 'heimstatt', seen = P.visited.includes(s.id);
    c.fillStyle = home ? '#ffb35a' : seen ? '#7fe6ee' : '#3d6470'; c.beginPath(); c.arc(x, y, home ? 7 : 4.5, 0, Math.PI * 2); c.fill();
    if (home) { c.strokeStyle = 'rgba(255,179,90,0.6)'; c.beginPath(); c.arc(x, y, 13, 0, Math.PI * 2); c.stroke(); }
    c.fillStyle = home ? '#ffcf96' : seen ? '#a9cdd4' : '#4f7480'; c.fillText(s.name, x, y - 12);
  }
  c.textAlign = 'left'; c.fillStyle = '#7fe6ee'; c.font = 'bold 22px "Segoe UI", Arial, sans-serif'; c.fillText('STERNKARTE · BEKANNTE SEKTOREN', 26, 38);
  c.fillStyle = '#6f939a'; c.font = '16px "Segoe UI", Arial, sans-serif'; c.fillText(`erkundet ${P.visited.length} von ${secs.length}`, 26, H - 22);
}
function schildMalen(d: QDeko | null) {
  if (!qSchild) return;
  const { cv, tex } = qSchild, c = cv.getContext('2d')!;
  c.fillStyle = '#0a0d10'; c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = 'rgba(255,170,80,0.35)'; c.lineWidth = 4; c.strokeRect(8, 8, cv.width - 16, cv.height - 16);
  c.textAlign = 'center'; c.fillStyle = '#ffb35a'; c.font = 'bold 92px "Segoe UI", Arial, sans-serif';
  c.fillText(d ? nrText(d.nr) : 'Q', cv.width / 2, 108);
  c.fillStyle = '#b9c2cc'; c.font = '34px "Segoe UI", Arial, sans-serif'; c.fillText(d ? d.name.toUpperCase() : 'QUARTIER', cv.width / 2, 160);
  tex.needsUpdate = true;
}
// Schiffsmodelle und Fundstücke des Besitzers ins Regal
function quartierDeko(d: QDeko | null) {
  if (!qDeko || !qQ) return;
  while (qDeko.children.length) {
    const c = qDeko.children[0]; qDeko.remove(c);
    c.traverse((o: any) => { if (o.isMesh && !o.userData.shared) { o.geometry?.dispose(); (o.material as THREE.Material)?.dispose?.(); } });
  }
  qDeko.visible = !!d; schildMalen(d); schirmMalen(d);
  if (!d) return;
  const box = new THREE.Box3(), sz = new THREE.Vector3();
  d.schiffe.forEach((cls, i) => {
    const slot = qQ!.schiffe[i]; if (!slot || !(cls in SHIPS)) return;
    const m = buildShipModel(cls as ShipId, (cls === P.cls && d.name === P.name ? P.paint || 'Orange' : 'Orange') as Paint);
    m.g.traverse((o: any) => { o.userData.shared = true; if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    m.g.position.set(0, 0, 0); m.g.rotation.set(0, 0, 0); m.g.scale.setScalar(1); m.g.updateMatrixWorld(true);
    box.setFromObject(m.g); box.getSize(sz);
    const k = 0.3 / Math.max(0.01, sz.x, sz.z);
    const w = new THREE.Group(); w.add(m.g);
    m.g.scale.setScalar(k); m.g.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k + 0.045, -(box.min.z + box.max.z) / 2 * k);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.04, 14), new THREE.MeshStandardMaterial({ color: 0x23272c, metalness: 0.7, roughness: 0.4 }));
    st.position.y = 0.02; w.add(st);
    w.position.set(slot[0], slot[1], slot[2]); w.rotation.y = 0.7 + i * 0.35;
    qDeko!.add(w);
  });
  d.funde.forEach((id, i) => {
    const slot = qQ!.funde[i]; if (!slot) return;
    const col = FUND_FARBE[id] || 0xffffff;
    const kr = new THREE.Mesh(new THREE.OctahedronGeometry(0.035, 0), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.2, transparent: true, opacity: 0.92 }));
    kr.scale.set(1, 1.7, 1); kr.position.set(slot[0], slot[1] + 0.075, slot[2]); kr.rotation.set(0.15, i * 0.9, 0.1);
    const ft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.02, 16), new THREE.MeshStandardMaterial({ color: 0x1a1d21, metalness: 0.6, roughness: 0.45 }));
    ft.position.set(slot[0], slot[1] + 0.01, slot[2]);
    qDeko!.add(kr, ft);
  });
}
function quartierSetzen(owner: string, deko: QDeko | null) {
  QS.in = !!owner; QS.owner = owner; QS.deko = owner ? deko : null;
  quartierDeko(QS.deko);
}
// Aufzug fahren: ins Quartier (owner = Besitzer) oder zurück auf Deck 3 (owner leer)
export function quartierFahrt(owner: string, deko: QDeko | null) {
  const Q = deck?.quartier; if (!Q || !IN.active || room) return;
  IN.panel = null;
  sfx('ui_confirm', 0.35, 0.6, () => snd(240, 0.25, 'sine', 0.03, -40));
  snd(70, 1.6, 'sawtooth', 0.012, 30);      // Brummen des Aufzugs
  setTimeout(() => snd(1320, 0.5, 'sine', 0.035, -20), 1300);      // Glocke bei der Ankunft
  void warmScene(owner ? 'Aufzug zu den Quartieren' : 'Aufzug nach Deck 3', () => {
    quartierSetzen(owner, deko);
    const [x, z, yaw] = owner ? Q.ankunft : Q.halle.ankunft;
    IN.x = x; IN.z = z; IN.yaw = yaw; IN.pitch = 0; walkV.x = walkV.z = 0;
    deck?.update(IN.x, IN.z); deck?.prime();
  }).then(() => {
    if (!owner) return;
    if (owner === P.name) say('SYSTEM', `Quartier ${nrText(deko?.nr || P.quartier?.nr || 0)}. Willkommen zu Hause.`);
    else say('SYSTEM', `Quartier ${nrText(deko?.nr || 0)} von ${owner}. Du bist hier zu Gast.`);
  });
}
function kojeRuhen() {
  snd(330, 0.8, 'sine', 0.03, -60);
  void warmScene('Ein paar Stunden Schlaf', () => {
    const S = stats(); P.hull = S.maxHull; P.shield = S.maxShield;
    if (P.quartier) P.quartier.koje = true;
    saveGame();
  }).then(() => say('SYSTEM', 'Ausgeruht. Dein Schiff ist gewartet, der Spielstand gesichert. Nach einem Abschuss wachst du hier auf.'));
}

// ---------- Eigene Schiffe betreten ----------
type ShipInfo = NonNullable<typeof IN.ship>;
const _sv = new THREE.Vector3();
// Betritt den Innenraum eines Schiffs. Im Hangar wird der Stationsraum zwischengespeichert, auf Planeten gibt es keinen.
export function enterShip(info: ShipInfo, m: ShipModel, at?: { x: number; z: number }) {
  const planet = info.ctx === 'planet', active = info.uid === P.uid;
  const rec = active ? null : P.fleet.find(f => f.uid === info.uid) || null;
  const cargo = active ? P.cargo : rec ? rec.cargo : {};
  const cap = active ? stats().cargo : rec ? computeStats(rec.cls, rec.up as Up, shipMods(rec.gear)).cargo : 0;
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
    saved = { group, rects, obstacles, shipObs, inters, shipInters, labels, shipLabels, x: IN.x, z: IN.z, yaw: IN.yaw, lamps: lamps.map(l => [l.position.clone(), l.distance, l.intensity] as [THREE.Vector3, number, number]), light: [ambient.intensity, sun.intensity, rim.intensity] };
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
  if (mesh) dimRoomGlow(m.g);
  if (mesh) { outsideEnv = scene.environment; scene.environment = interiorEnv(); }   // Spiegelungen wie in einem beleuchteten Raum
  group = room.g;
  rects = room.rects; obstacles = room.obstacles; shipObs = []; shipLabels = []; labels = []; shipInters = [];
  inters = room.spots.map(sp => Object.assign(shipInter(sp, info), { y: (sp as any).y }));
  IN.ship = info; IN.panel = null; IN.target = null;
  const yaw0 = IN.yaw + (saved?.group ? saved.group.rotation.y : 0) - room.g.rotation.y, pitch0 = IN.pitch;
  IN.x = room.spawn.x; IN.z = room.spawn.z; IN.yaw = room.spawn.yaw; IN.pitch = 0; IN.bob = 0; IN.fy = mesh ? mesh.spawn.y : 0; IN.jy = IN.jv = 0; walkV.x = walkV.z = 0;
  if (at && mesh) {      // über die Rampe hineingelaufen: gleiche Stelle und Blickrichtung, Boden der Laufkarte dort (Höhe des Hangarbodens)
    const ground = (saved?.group ? saved.group.localToWorld(_sv.set(0, 0, 0)).y : room.g.position.y) - room.g.position.y;
    const fy = mesh.floorAt(at.x, at.z, ground + 0.5);      // Rampenboden bis 1 m über dem Hangarboden
    if (fy !== null) { IN.x = at.x; IN.z = at.z; IN.fy = Math.max(ground, fy - 0.3); IN.yaw = yaw0; IN.pitch = pitch0; }      // knapp unter dem Rampenboden beginnen, die Bodenhöhe folgt weich (kleinerer Sprung der Augenhöhe)
  }
  lamps.forEach((l, i) => { const q = room!.lamps[i]; room!.g.localToWorld(l.position.set(q[0], q[1], q[2])); l.distance = 22; l.intensity = mesh ? 0 : q[3] * Math.PI; });   // Modell-Räume bringen eigene Lampen mit
  setExposure(planet ? 0.5 : 0.2);
  // Modell-Räume: Grund- und Sonnenlicht von draußen gelten auch an Bord und machten weiße Flächen (Leuchtenabdeckungen, Wände) von allein
  // überhell. An Bord tragen die Lampen des Innenraums; das Grundlicht bleibt als Aufhellung der Schatten (leaveShip setzt es zurück).
  if (mesh) { ambient.intensity *= 0.3; sun.intensity *= 0.3; rim.intensity *= 0.3; }
  G.mode = 'walk';
  if (!at) sfx('door_open', 0.6, 1, () => snd(220, 0.5, 'sawtooth', 0.03, -120));
  say('SYSTEM', `An Bord der ${info.name}.`);
}
// Verlässt den Schiffsraum: zurück in den Hangar oder (auf Planeten) ganz aus der Ego-Ansicht
export function leaveShip(exitWorld?: THREE.Vector3) {
  if (!room) return;
  const yawW = room.g.rotation.y + IN.yaw;
  scene.remove(room.g);
  room.g.traverse((c: any) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); });   // Modell-Räume teilen die Geometrie mit der Vorlage
  mesh = null; IN.fy = 0; IN.jy = IN.jv = 0;
  for (const d of room.disposables) d.dispose();
  undimRoomGlow();
  if (roomModel) roomModel.visible = true;
  if (outsideEnv) { scene.environment = outsideEnv; outsideEnv = null; }
  room = null; roomModel = null; IN.ship = null; IN.panel = null; IN.target = null;
  if (saved) {
    const s = saved;
    group = s.group; rects = s.rects; obstacles = s.obstacles; shipObs = s.shipObs; inters = s.inters; shipInters = s.shipInters; labels = s.labels; shipLabels = s.shipLabels;
    IN.x = s.x; IN.z = s.z; IN.yaw = s.yaw;
    if (exitWorld && group) { const p = group.worldToLocal(exitWorld.clone()); IN.x = p.x; IN.z = p.z; IN.yaw = yawW - group.rotation.y; }
    lamps.forEach((l, i) => { l.position.copy(s.lamps[i][0]); l.distance = s.lamps[i][1]; l.intensity = s.lamps[i][2]; });
    // genau das Licht von vor dem Einsteigen (früher setExposure(0.2): Die Hangar-Lichtsteuerung hielt das für eine neue Grundhelligkeit und
    // dunkelte noch einmal ab, Schiffe und Figuren im Hangar waren danach zu dunkel)
    ambient.intensity = s.light[0]; sun.intensity = s.light[1]; rim.intensity = s.light[2];
    saved = null;
    G.mode = 'walk';
    if (!exitWorld) sfx('door_close', 0.6, 1, () => snd(220, 0.5, 'sawtooth', 0.03, 120));
  } else {
    group = null;
    for (const l of lamps) l.intensity = 0;
    setExposure(1);
    camera.near = 0.5; camera.updateProjectionMatrix();
    IN.active = false; G.inside = false; IN.say.t = 0; meHolder.visible = false;
    if (document.pointerLockElement === gl && !keepLockForFlight()) document.exitPointerLock();
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
    case 'ramp': return {
      ...base, label: () => !active ? 'Rampenschalter (nur am aktiven Schiff)' : RAMP.want ? 'Laderampe schließen' : 'Laderampe öffnen',
      act: () => { if (!active) return; RAMP.want = !RAMP.want; sfx('gear', 0.6, 1, () => snd(140, 0.5, 'sawtooth', 0.03, RAMP.want ? -40 : 40)); say('SYSTEM', RAMP.want ? 'Laderampe fährt aus.' : 'Laderampe fährt ein.'); },
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
// Eine neue Zeile beginnt: Alle anderen Figuren im Raum hören auf zu gebärden (wer eine Zeile überspringt, sah sonst zwei zugleich reden)
export function npcHush(who?: string) {
  const k = (who || '').toUpperCase();
  for (const q of persons) if (q.p.anim && !(k && q.name && q.name.toUpperCase().includes(k))) q.p.anim.talkT = Math.min(q.p.anim.talkT, 0.25);
}
function talk(name: string, tab: string) {
  npcSpeak(name, 3.2); staffBark(name, tab);
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
  if (mesh) { const e = rampOfRoom(); if (e && z > e.door - 0.3 && doorProgress(roomModel!, 'rampe') < 0.999) return false; return mesh.floorAt(x, z, IN.fy + IN.jy, IN.jy > 0.05) !== null; }   // Modell-Raum: Laufkarte (im Sprung: Boden unter den Füßen); Rampe nur offen begehbar
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
  if (!ok && !IN.ship && !deck && Math.abs(x) < CW - R && z > PZ1 - 2 && z < HZ0 + 2) ok = true;
  if (!ok) return false;
  for (const o of obstacles) if (x > o[0] - R && x < o[1] + R && z > o[2] - R && z < o[3] + R) return false;
  for (const o of shipObs) if (x > o[0] - R && x < o[1] + R && z > o[2] - R && z < o[3] + R) return false;
  if (!IN.ship && rampSideBlock(x, z)) return false;
  return true;
}
// ---------- Heckrampe: ohne Taste an Bord und von Bord (Wisent) ----------
// Das aktive Schiff steht im Hangar; sein Innenraum aus dem Modell liegt deckungsgleich darin. Wer am Fuß der offenen Rampe hineinläuft,
// ist an Bord (gleiche Stelle, gleiche Blickrichtung); wer innen die Rampe ganz hinuntergeht, steht wieder im Hangar.
const rampOfRoom = () => IN.ship && roomModel ? RAMP_ENTRY[SHIPS[IN.ship.cls as ShipId]?.model || ''] || null : null;
const activeRamp = () => RAMP_ENTRY[SHIPS[P.cls]?.model || ''] || null;
const _rv = new THREE.Vector3();
function hangarToShip(x: number, z: number) { group!.localToWorld(_rv.set(x, 0, z)); return SHIP.g.worldToLocal(_rv); }
function rampSideBlock(x: number, z: number) {      // offene Rampe im Hangar: nur vom Fuß her betreten, nicht seitlich hindurchlaufen
  const e = activeRamp(); if (!e || !group || !SHIP.g.visible || !hangarBuild || doorProgress(SHIP.g, 'rampe') < 0.05) return false;
  const p = hangarToShip(x, z); return Math.abs(p.x) < e.hw + 0.5 && p.z > e.door - 0.5 && p.z < e.foot - 1.1;
}
let rampPrev = 0;
function rampTransit() {
  if (G.mode !== 'walk' || IN.panel) return;
  if (!room) {
    const e = activeRamp(); if (!e || !hangarBuild || !SHIP.g.visible || doorProgress(SHIP.g, 'rampe') < 0.999 || !hasMeshRoom(P.cls) || !meshRoomReady(P.cls)) { rampPrev = 1e9; return; }
    const p = hangarToShip(IN.x, IN.z), inward = p.z < rampPrev - 1e-4; rampPrev = p.z;
    if (inward && Math.abs(p.x) < e.hw - 0.3 && p.z > e.foot - 1.0 && p.z < e.foot + 0.6) enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'hangar' }, SHIP, { x: p.x, z: Math.min(p.z, e.foot - 0.35) });
  } else if (mesh && IN.ship && IN.ship.uid === P.uid && saved?.group) {
    const e = rampOfRoom(); if (!e) return;
    const outward = IN.z > rampPrev + 1e-4; rampPrev = IN.z;
    if (outward && Math.abs(IN.x) < e.hw && IN.z > e.foot - 0.3) { const w = room.g.localToWorld(new THREE.Vector3(IN.x, 0, e.foot + 0.9)); rampPrev = -1e9; leaveShip(w); }
  }
}
export const walkFree = (x: number, z: number) => free(x, z);      // für Prüfskripte (scripts/decktest.js)
let stepT = 0;
const walkV = { x: 0, z: 0 };   // Laufgeschwindigkeit (m/s) in Raumkoordinaten
// Bodenhöhe unter einem Fuß der eigenen Figur (Schiffsräume mit Laufkarte: Rampen, Stufen); nur für Manny (avatar.ts, Drive.ground).
// Erst nach der Kopfhöhen-Abfrage des Bildes aufgerufen (floorAt merkt sich die Kopfhöhe der letzten Abfrage).
const footGround = (x: number, z: number) => (mesh ? mesh.floorAt(x, z, IN.fy) : null);
// Springen (Leertaste): nur vom Boden aus
export function jump() { if (!IN.active || IN.jy > 0 || IN.jv !== 0) return; IN.jv = 4.6; snd(95, 0.05, 'triangle', 0.02, 40); }
export function updateWalk(dt: number) {
  if (!IN.active || !group) return;
  zoneLight();
  IN.say.t = Math.max(0, IN.say.t - dt);
  // Blick: Maus eingefangen → direkte Steuerung; sonst dreht die Zeigerposition wie beim Fliegen
  IN.locked = document.pointerLockElement === gl;
  if (!room && !warm.hold && G.mode === 'walk' && shipWarmKey !== (IN.station?.id || '') + ':' + P.cls) prewarmShipRoom();   // z. B. nach einem Schiffswechsel im Hangar
  stepShipWarm();
  // zu Fuß gehört die Maus dem Blick: sobald der Browser es erlaubt (kurz nach einem Tastendruck oder Klick), wird sie eingefangen
  if (!IN.locked && G.mode === 'walk' && (grabT -= dt) <= 0) { grabT = 0.3; grabMouse(); }
  // ohne eingefangenen Zeiger nur bei der alten Zeigersteuerung drehen (sonst drehte ein stehengebliebener Zeiger den Blick weg)
  if (!IN.locked && settings.steer === 'zeiger') {
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
    const run = !!(keys.ShiftLeft || keys.ShiftRight), sp = f || s ? footPace(f, s, run, 6, 6.8) * gearFactor('tempo') / Math.hypot(f, s) : 0, sy = Math.sin(IN.yaw), cy = Math.cos(IN.yaw);
    setIntent(IN.yaw, f, s, run, dt);
    const k = Math.min(1, dt * (f || s ? footAccel(9) : footBrake(12)));
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
    if (stepT <= 0 && moved > 0 && IN.jy === 0) { stepT = v > 6.4 ? 2.3 : 1.9; sfx(mesh && IN.area === 'Frachtraum' ? 'step_grate' + Math.floor(Math.random() * 4) : 'step' + Math.floor(Math.random() * 5), v > 6.4 ? 0.5 : 0.34, 0.9 + Math.random() * 0.2, () => snd(70 + Math.random() * 20, 0.06, 'triangle', v > 6.4 ? 0.026 : 0.018, -20)); }
    // Wippen: stärker beim Rennen, klingt aus, wenn man steht
    const amp = Math.min(1, v / 6) * (v > 6.4 ? 0.075 : 0.045);
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
  rampTransit();
  // Sprung: Schwerkraft, Kopf stößt nicht durch die Decke
  if (IN.jv !== 0 || IN.jy > 0) {
    IN.jy += IN.jv * dt; IN.jv -= 15 * dt;
    const top = mesh ? Math.max(0, mesh.head() - 1.9) : 0.9;
    if (IN.jy > top) { IN.jy = top; IN.jv = Math.min(IN.jv, 0); }
    if (IN.jy <= 0) { IN.jy = 0; IN.jv = 0; stepT = 0; }   // kein eigener Ton beim Aufkommen: der nächste Schritt folgt sofort
  }
  IN.area = room ? room.area(IN.x, IN.z) : IN.z > HZ0 ? 'Hangardeck' : deck ? deck.area(IN.x, IN.z) : IN.z > PZ1 ? 'Korridor' : PAL[kind].hall;
  // Hangar der Bastion: Ist die neue Art (Lichtraum 2) erst nach dem Betreten fertig geladen, den Hangar austauschen (hinter der Blende).
  // Standflächen und Personal bleiben, sie stammen aus denselben Daten.
  if (hangarBuild && !room && hangarBuild.stale()) {
    const nh = buildHangar(), old = hangarBuild.group, par = old.parent;
    if (nh && par) {
      par.remove(old); par.add(nh.group);
      old.traverse((c: any) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); });
      hangarBuild = nh; hangarUpdate = nh.update; hangarBody = nh.group;
      warmScene('Hangar wird geladen', () => { deck?.prime(); nh.prime(); });
    }
  }
  if (hangarUpdate && !room) hangarUpdate(IN.x, IN.z);      // Hangar der Bastion: ferne Kleinteile ausblenden
  if (deck && !room) {      // ferne Bereiche des Decks ausblenden; eine Lampe geht mit, damit die Figuren im Deck Licht haben
    if (deck.stale() && IN.station) {
      // Die Lichträume sind erst nach dem Betreten fertig geladen (erster Start, großes Deckmodell): Deck neu bauen und austauschen.
      // Laufflächen, Standflächen und Personal stammen aus denselben Deckdaten und bleiben, wie sie sind.
      const neu = buildDeck(IN.station.id, HZ0), par = deck.group.parent;
      if (neu && par) {
        par.remove(deck.group); par.add(neu.group);
        deck.group.traverse((c: any) => { if (c.geometry && !c.userData.shared) c.geometry.dispose(); if (c.isLight && c.dispose) c.dispose(); });
        deck = neu;
        warmScene('Deck wird geladen', () => { deck?.prime(); hangarBuild?.prime(); });      // neue Lichtlage (Strahler des Decks): alle Shader brauchen eine neue Fassung
      }
    }
    deck.update(IN.x, IN.z);
    const on = deck.inside(IN.z);
    if (on && group) group.localToWorld(lamps[1].position.set(IN.x, 2.3, IN.z));
    lamps[1].intensity = on ? Math.PI * 0.26 : 0; lamps[1].distance = 15; lamps[2].intensity = 0;
    lamps[0].intensity = on ? Math.PI * 0.08 : hangarUpdate ? Math.PI * 0.42 : Math.PI * 0.1;      // die Hangarlampe reicht bis ins Deck: dort zurücknehmen
    // was vom Standort aus nicht zu sehen ist, wird nicht gezeichnet: der Hangar hinter der Schleuse und Figuren in anderen Räumen
    const hs = deck.hangarSeen();
    if (hangarBody) hangarBody.visible = hs;
    for (const q of persons) q.p.g.visible = deck.seen(q.x, q.z);
    for (const w of walkers) w.p.g.visible = deck.seen(w.x, w.z);
  }
  // eigene Figur: Außensicht, oder Ich-Sicht mit ganzem Körper (avatar.ts bodyView, seit 2026-11-24)
  const tpOn = SEQ.t < 0 && (VIEW.tp || bodyView());
  if (tpOn) me = syncAvatar(meHolder, me, figGear());
  meHolder.visible = tpOn && !!me;
  if (me && tpOn) {
    meHolder.matrix.copy(group.matrixWorld); meHolder.matrixWorldNeedsUpdate = true;
    driveAvatar(me, dt, { x: IN.x, y: IN.fy + IN.jy, z: IN.z, yaw: IN.yaw, pitch: IN.pitch, vx: walkV.x, vz: walkV.z, wid: viewModelId(P.gear?.waffe), crouch: STANCE.crouch, air: IN.jy > 0.05, ground: mesh ? footGround : null, fp: !VIEW.tp });
  }
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
  updateRoomLife(dt);
}
// nur für Tests (Testfenster): Einblick in Figuren, Läufer und Gesprächsgruppen des aktuellen Raums
export const lifeDebug = () => ({ persons, walkers, chats, leavers });
const wrapA = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
// Kopfhöhe einer Figur als Punkt in der Welt (Blickziel für andere)
const headOf = (p: Person, out: THREE.Vector3) => p.g.localToWorld(out.set(0, 1.6, 0));
// Figur auf eine Blickrichtung drehen: großer Winkel mit Schritten (Dreh-Clip aus charModels.ts), kleiner Winkel oder Figur ohne Clip weich.
// Rückgabe true = angekommen. Mit Clip wartet sie, bis sie ruhig steht (nach dem Abbremsen oder einer Gebärde), statt zu gleiten.
function turnStep(p: Person, want: number, dt: number) {
  const d = wrapA(want - p.g.rotation.y);
  if (p.anim && animTurning(p.anim)) return false;
  if (Math.abs(d) < 0.02) return true;
  if (p.anim && Math.abs(d) >= 0.45 && animHasTurn(p.anim)) { animTurn(p.anim, d); return false; }
  p.g.rotation.y += clamp(d, -1.4 * dt, 1.4 * dt);
  return false;
}
// Nächste Wegmarke eines Läufers: Haltepunkte nur mit ihrer Wahrscheinlichkeit und wenn dort niemand steht, sonst weiter zur übernächsten
function nextNode(w: Walker) {
  const n = w.path.length; let j = (w.i + 1) % n;
  for (let k = 0; k < n; k++) { const s = w.stops[j]; if (!s) break; if (!s.busy && Math.random() < s.p * stopK) { s.busy = true; break; } j = (j + 1) % n; }
  w.to = j;
}
// ---------- Stimmen der Crew (seit 2026-11-20, crewStimmen.ts) ----------
// Geht der Pilot nah an jemandem vorbei, sagt die Figur ab und zu einen Satz (Sprechblase über dem Kopf, Gebärde, Läufer bleiben kurz stehen).
// Gruppen geben einen Gesprächsfetzen preis. Höchstens eine Blase zugleich, danach 6 bis 12 s Ruhe, dieselbe Figur frühestens nach 75 s.
// Still, solange die Geschichte spricht, man im eigenen Schiff ist oder der Landeablauf läuft. Einmal je Besuch eine Durchsage.
let bub: { p: Person; text: string; t: number; dur: number } | null = null, barkT = 0, paDone = false, stopK = 1;
const barkCool = new WeakMap<Person, number>();
function crewTick(t: number) {
  if (bub && (G.time - (bub as any).t0 > bub.dur)) bub = null;
  if (G.mode !== 'walk' || IN.ship || crewHooks.busy()) return;
  const since = t - settledT;
  if (since < 5) return;
  if (!paDone && since > 7.5) { paDone = true; const d = crewDurchsage(); if (d) { say('DURCHSAGE', d); IN.say.t = 7; snd(784, 0.12, 'sine', 0.035, 300); setTimeout(() => snd(1046, 0.16, 'sine', 0.03, 300), 180); } }
  if (bub || t < barkT) return;
  let best: { p: Person; d: number; chat: boolean; w?: Walker } | null = null;
  const consider = (p: Person, x: number, z: number, chat: boolean, w?: Walker) => {
    const d = Math.hypot(IN.x - x, IN.z - z);
    if (d < 3.2 && d > 0.6 && (barkCool.get(p) || 0) < t && (!best || d < best.d)) best = { p, d, chat, w };
  };
  for (const w of walkers) consider(w.p, w.x, w.z, false, w);
  for (const q of persons) if (!q.story) consider(q.p, q.x, q.z, chats.some(c => c.m.includes(q)));
  const b = best as { p: Person; d: number; chat: boolean; w?: Walker } | null;
  if (!b) return;
  barkT = t + 2.5;
  if (Math.random() > 0.6) { barkCool.set(b.p, t + 20); return; }      // diesmal schweigt sie
  const text = b.chat ? crewFetzen() : crewSpruch();
  if (!text) return;
  const dur = clamp(2.2 + text.length * 0.055, 3.2, 8);
  bub = { p: b.p, text, t: 0, dur }; (bub as any).t0 = G.time;
  barkCool.set(b.p, t + 75); barkT = t + dur + 6 + Math.random() * 6;
  if (b.p.anim) animTalk(b.p.anim, dur * 0.8);
  if (b.w && !b.w.at) b.w.wait = Math.max(b.w.wait, Math.min(dur, 3.5));      // Läufer bleibt kurz stehen
}
// für Tests (Testfenster): wo stehen und gehen die Leute, welche Blase ist offen
export const crewDebug = () => ({ walkers: walkers.map(w => [w.x, w.z]), persons: persons.filter(q => !q.story).map(q => [q.x, q.z, chats.some(c => c.m.includes(q)) ? 1 : 0]), bub: bub ? bub.text : null, bubAt: bub ? [bub.p.g.position.x, bub.p.g.position.z] : null, barkT, t: G.time, settled: G.time - settledT });
// Sprechblase zeichnen (drawWalkHUD): über dem Kopf, mit Zeilenumbruch, weich ein- und ausgeblendet
function drawBubble(W: number, H: number) {
  if (!bub) return;
  const age = G.time - (bub as any).t0, p = bub.p.g.position;
  if (Math.hypot(p.x - IN.x, p.z - IN.z) > 10) return;
  if (deck && !room && p.z <= HZ0 && !deck.seen(p.x, p.z)) return;
  headOf(bub.p, _p); _p.y += 0.3; _p.project(camera);
  if (_p.z > 1 || Math.abs(_p.x) > 1.05 || Math.abs(_p.y) > 1.05) return;
  drawSpeechBubble((_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H, bub.text, Math.min(age * 4, (bub.dur - age) * 2));
}
// Leben im Raum: Figuren atmen, gebärden und schauen, Läufer gehen ihre Wege. Läuft auch, wenn der Pilot gerade nicht selbst läuft
// (Kinoszene, Stationsmenü, Start und Landung): Bis Alpha 1.07 standen die Figuren dort eingefroren, in den Szenen der Geschichte
// also ausgerechnet dann, wenn sie sprechen.
export function updateRoomLife(dt: number) {
  if (!IN.active) return;
  const t = G.time;
  if (G.mode === 'launch' || G.mode === 'play') settledT = t;   // Start und Landung: Der Pilot steht noch nicht im Raum
  if (field) (field.material as THREE.MeshBasicMaterial).opacity = 0.055 + Math.sin(t * 2.2) * 0.02;
  if (holo) holo.rotation.y += dt * 0.25;
  for (const q of persons) {
    const a = Math.atan2(IN.x - q.x, IN.z - q.z) - q.face, d = Math.hypot(IN.x - q.x, IN.z - q.z);
    const want = d < 9 ? clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1.1, 1.1) : Math.sin(t * 0.4 + q.x) * 0.3;
    q.p.head.rotation.y += (want - q.p.head.rotation.y) * Math.min(1, dt * 4);
    q.p.armL.rotation.x = Math.sin(t * 0.8 + q.z) * 0.06; q.p.armR.rotation.x = -q.p.armL.rotation.x;
    // Zuwenden (seit Alpha 1.19): Steht der Pilot nah und deutlich seitlich, dreht sich die Figur nach kurzem Zögern zu ihm um
    // (der Kopf geht voraus, siehe lookStep); ist er eine Weile fort, dreht sie sich zurück. Gesprächsgruppen bleiben einander zugewandt.
    if (!q.fix && !IN.ship) {
      if (q.home === undefined) q.home = q.face;
      const to = Math.atan2(IN.x - q.x, IN.z - q.z), off = Math.abs(wrapA(to - q.p.g.rotation.y));
      if (d < 4.6) {
        q.away = 0; q.seen = off > 0.8 ? (q.seen || 0) + dt : 0;
        if (q.seen > 0.6) { q.want = q.span ? q.home + clamp(wrapA(to - q.home), -q.span, q.span) : to; q.seen = 0; }
      } else { q.seen = 0; q.away = (q.away || 0) + dt; if (d > 8 && q.away > 3.5) q.want = q.home; }
      if (q.want != null && turnStep(q.p, q.want, dt)) q.want = null;
      q.face = q.p.g.rotation.y;
    }
    // Personal sieht den Kunden an, der vor der Theke steht, solange der Pilot nicht selbst in der Nähe ist
    if (q.p.anim && q.cust) q.p.anim.look = d < 5 ? camera.position : q.cust.look;
    if (q.p.anim) animStep(q.p.anim, dt, false); else if (q.p.mixer) q.p.mixer.update(dt); else q.p.g.position.y = Math.sin(t * 1.3 + q.x) * 0.008;
  }
  for (const c of chats) {
    // Wortwechsel: einer redet 2,5 bis 7 s, kurze Pause, dann ein anderer; ab und zu schweigen alle eine Weile
    c.t -= dt;
    if (c.t <= 0) {
      if (c.gap) {
        c.sp = (c.sp + 1 + Math.floor(Math.random() * (c.m.length - 1))) % c.m.length;
        const len = 2.5 + Math.random() * 4.5, an = c.m[c.sp].p.anim;
        if (an) animTalk(an, len);
        c.t = len + 0.3; c.gap = false;
      } else { c.gap = true; c.t = Math.random() < 0.2 ? 4 + Math.random() * 7 : 0.4 + Math.random() * 1.1; }
    }
    // Blicke: zum Sprecher; der Sprecher zum Nächsten in der Runde. Kommt der Pilot ganz nah, sieht ihn an, wer ihm zugewandt steht (lookStep).
    const near = Math.hypot(IN.x - c.x, IN.z - c.z) < 3.4 && !IN.ship;
    c.m.forEach((q, i) => {
      if (!q.p.anim || !q.look) return;
      const o = c.m[i === c.sp ? (i + 1) % c.m.length : c.sp];
      if (near && Math.abs(wrapA(Math.atan2(IN.x - q.x, IN.z - q.z) - q.face)) < 1.0) q.look.copy(camera.position);
      else headOf(o.p, q.look);
    });
  }
  updateOthers(dt);
  crewTick(t);
  const V = WALK_V * crewEile(); stopK = V > WALK_V ? 0.3 : 1;     // nach einem Angriff im Sektor: schneller, seltener stehen bleiben
  for (const w of walkers) {
    const an = w.p.anim;
    headOf(w.p, w.look);
    if (w.at) {
      // am Haltepunkt: hindrehen, verweilen (am Stand im Wechsel mit dem Personal gebärden), zum nächsten Ziel drehen und weitergehen
      const s = w.at, n = w.path[w.to];
      if (an) animStep(an, dt, false, V);
      if (!w.leave) {
        turnStep(w.p, s.face, dt);
        w.wait -= dt;
        if (s.who && an) {
          an.look = s.who.look || (s.who.look = new THREE.Vector3()); headOf(s.who.p, s.who.look);
          s.who.cust = w;
          if ((w.say -= dt) <= 0) { const len = 2.2 + Math.random() * 2.6, who = w.sayI++ % 2 ? s.who.p.anim : an; if (who) animTalk(who, len); w.say = len + 0.5 + Math.random() * 1.2; }
        }
        if (w.wait <= 0) w.leave = true;
      } else if (turnStep(w.p, Math.atan2(n[0] - w.x, n[1] - w.z), dt) || !an) {
        s.busy = false; w.at = null;
        if (s.who) { s.who.cust = null; if (s.who.p.anim) s.who.p.anim.look = camera.position; }
        if (an) an.look = camera.position;
      }
      continue;
    }
    const n = w.path[w.to], dx = n[0] - w.x, dzz = n[1] - w.z, d = Math.hypot(dx, dzz);
    if (d < 0.3) {
      w.i = w.to;
      const s = w.stops[w.i];
      if (s) { w.at = s; w.leave = false; w.wait = s.t[0] + Math.random() * (s.t[1] - s.t[0]); w.say = 0.8 + Math.random(); w.sayI = Math.random() < 0.5 ? 0 : 1; }
      else w.rest = Math.random() < 0.15;
      nextNode(w);
      continue;
    }
    // stehen bleiben, wenn der Spieler im Weg ist (früh genug, um auszulaufen) oder für eine Pause kurz vor einer Wegmarke
    const pd = Math.hypot(IN.x - w.x, IN.z - w.z), ahead = ((IN.x - w.x) * dx + (IN.z - w.z) * dzz) / (d * Math.max(0.01, pd));
    const full = !!w.p.anim?.stop, blocked = pd < (full ? 3.0 : 1.6) && ahead > 0.3;
    if (w.rest && d < 1.5 && w.wait <= 0) { w.wait = 4 + Math.random() * 6; w.rest = false; }
    if (w.wait > 0) w.wait -= dt;
    const go = !blocked && w.wait <= 0;
    let sp = go ? V : 0;
    // mit Skelett: Anlaufen und Abbremsen geben das Tempo vor (die Füße rutschen nicht); ganz nah am Spieler hält die Figur sofort
    if (w.p.anim) { sp = animStep(w.p.anim, dt, go, V); if (blocked && pd < 1.2) sp = 0; }
    w.x += dx / d * sp * dt; w.z += dzz / d * sp * dt;
    w.p.g.position.set(w.x, 0, w.z);
    const ta = Math.atan2(dx, dzz), da = Math.atan2(Math.sin(ta - w.p.g.rotation.y), Math.cos(ta - w.p.g.rotation.y));
    w.p.g.rotation.y += da * Math.min(1, dt * 5);
    w.ph += dt * sp * 4.6;
    const sw = sp ? Math.sin(w.ph) * 0.55 : 0;
    w.p.legL.rotation.x = sw; w.p.legR.rotation.x = -sw; w.p.armL.rotation.x = -sw * 0.7; w.p.armR.rotation.x = sw * 0.7;
  }
  // Figuren der Geschichte, die abgehen (storyNpcsLeave): umdrehen, zum Gang gehen, am Ende des Gangs aus dem Raum nehmen
  for (let i = leavers.length - 1; i >= 0; i--) {
    const w = leavers[i], an = w.p.anim, n = w.path[w.i], dx = n[0] - w.x, dzz = n[1] - w.z, d = Math.hypot(dx, dzz), ta = Math.atan2(dx, dzz);
    w.wait -= dt;
    if (w.wait <= 0 && !w.turned) w.turned = turnStep(w.p, ta, dt) || !an;
    const go = w.wait <= 0 && w.turned, sp = an ? animStep(an, dt, go, WALK_V) : go ? WALK_V : 0;
    if (!go) continue;
    if (d < 0.35) { if (++w.i >= w.path.length) { if (w.end) w.end(); else w.p.g.removeFromParent(); leavers.splice(i, 1); } continue; }
    w.x += dx / d * sp * dt; w.z += dzz / d * sp * dt; w.p.g.position.set(w.x, 0, w.z);
    w.p.g.rotation.y += wrapA(ta - w.p.g.rotation.y) * Math.min(1, dt * 5);
  }
}

// ---------- Kamera ----------
const _c = new THREE.Vector3();
// Deckenhöhe über dem Boden an der Spielerposition (für die Kamera der Außensicht)
function ceilY() {
  if (mesh) { mesh.floorAt(IN.x, IN.z, IN.fy); return IN.fy + Math.max(2.1, mesh.head() - 0.15); }   // head(): Kopffreiheit über dem zuletzt abgefragten Boden
  if (room) return room.height - 0.15;
  if (deck && IN.z <= HZ0) return deck.ceil(IN.x, IN.z);
  return (IN.z > HZ0 ? HH : IN.z > PZ1 ? CH : dims.h) - 0.2;
}
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
  if (VIEW.tp && me) {
    // Außensicht: über der rechten Schulter, rückt vor Wänden und unter der Decke heran
    const top = ceilY();
    tpCamPos(_c, IN.x, IN.fy + IN.jy, IN.z, IN.yaw, IN.pitch, (x, y, z) => free(x, z) && y > IN.fy + 0.3 && y < top);
    if (deck) deck.view(_c.x, _c.z);      // die Sichtprüfung des Decks rechnet auch von der Kamera aus
    group.localToWorld(_c);
  } else { if (deck) deck.view(1e9, 1e9); group.localToWorld(_c.set(IN.x, eyeH() + IN.bob + IN.fy + IN.jy, IN.z)); }
  camera.position.copy(_c);
  camera.rotation.order = 'YXZ';
  camera.rotation.set(IN.pitch, group.rotation.y + IN.yaw, 0);
  if (!VIEW.tp && me) fpBody(camera);      // Ich-Sicht: Kopf der Figur an die Kamera (mannyAvatar.ts)
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
  ux.textAlign = 'center'; ux.font = '600 13px Rajdhani, "IBM Plex Sans", sans-serif';
  for (const l of [...labels, ...shipLabels, ...otherLabels()]) {
    const d = Math.hypot(l.p.x - IN.x, l.p.z - IN.z);
    if (d > 26) continue;
    if (deck && !room && l.p.z <= HZ0 && !deck.seen(l.p.x, l.p.z)) continue;      // Deck: Namen hinter Wänden nicht zeigen (Figur ist dann auch ausgeblendet)
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
  // Aufforderung (seit Alpha 1.54 dieselbe wie auf Planeten und in Minen, ui/footHud.ts)
  if (IN.target) drawPrompt(IN.target.label(), pal.css, H * 0.66);
  // Ort oben in der Mitte statt des Kastens oben links (Credits und Fracht stehen an den Terminals und im Flottenband)
  drawPlaceLine(title && IN.area ? `${title} · ${IN.area}` : title || IN.area);
  drawBubble(W, H);
  // Gesprochenes
  if (IN.say.t > 0) {
    ux.globalAlpha = Math.min(1, IN.say.t);
    ux.textAlign = 'center'; ux.font = '500 15px Rajdhani, "IBM Plex Sans", sans-serif';
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
interface Other extends NetAct { p: Person | null; av: Avatar | null; x: number; y: number; ty: number; z: number; ry: number; tx: number; tz: number; tyaw: number; name: string; speed: number; vx: number; vz: number; gear: { helm?: string; anzug?: string; rucksack?: string }; wid: string }
const others = new Map<number, Other>();
export function syncOtherPilots(list: { id: number; name: string; st: string; x: number; z: number; yaw: number; y?: number; g?: string[] | null }[]) {
  if (!IN.active || !IN.station || !stationGroup) { if (others.size) clearOthers(); return; }
  const here = ortKennung(IN.station.id), seen = new Set<number>();      // im Quartier: „bastion#q:<Besitzer>“ (game/quartier.ts)
  for (const o of list) {
    if (o.st !== here) continue;
    seen.add(o.id);
    let r = others.get(o.id);
    const ng = gearFromNet(o.g), gear = ng.gear, wid = ng.wid;   // mit Aussehen (Kopf, Farbe) des Mitspielers
    if (!r) {
      // Soldat wie die eigene Figur (src/game/avatar.ts); fehlt das Modell, die einfache Figur
      const av = syncAvatar(stationGroup, null, gear, false);      // Mitspieler: eigene Figur aus figur.ts (fremdFigur.ts)
      const p = av ? null : buildPerson(0x4a5a6a, 0xd8a888, 0x2a2018, PAL[kind].accent, 'walk');
      if (p) { p.g.position.set(o.x, 0, o.z); p.g.rotation.y = o.yaw + Math.PI; stationGroup.add(p.g); }
      r = { p, av, x: o.x, y: o.y || 0, ty: o.y || 0, z: o.z, ry: o.yaw + Math.PI, tx: o.x, tz: o.z, tyaw: o.yaw, name: o.name, speed: 0, vx: 0, vz: 0, gear, wid, crouch: false, hit: 0, fire: 0, fl: '' };
      others.set(o.id, r);
    }
    r.tx = o.x; r.tz = o.z; r.ty = o.y || 0; r.tyaw = o.yaw; r.name = o.name; r.wid = wid; readNetFlags(r, o.g?.[4]);
    if (r.av) { r.gear = gear; r.av = syncAvatar(stationGroup, r.av, gear, false); r.av.tracht = ng.tracht; }
  }
  for (const id of [...others.keys()]) if (!seen.has(id)) removeOther(id);
}
function removeOther(id: number) {
  const r = others.get(id); if (!r) return;
  if (r.p) { r.p.g.parent?.remove(r.p.g); r.p.g.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose(); }); }
  if (r.av) freeAvatar(r.av);
  others.delete(id);
}
function clearOthers() { for (const id of [...others.keys()]) removeOther(id); }
function updateOthers(dt: number) {
  const k = Math.min(1, dt * 10);
  for (const r of others.values()) {
    const ox = r.x, oz = r.z;
    r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k; r.y += (r.ty - r.y) * Math.min(1, dt * 14);
    const ivx = (r.x - ox) / Math.max(dt, 1e-3), ivz = (r.z - oz) / Math.max(dt, 1e-3), v = Math.hypot(ivx, ivz);
    r.speed += (v - r.speed) * Math.min(1, dt * 6);
    r.vx += (ivx - r.vx) * Math.min(1, dt * 6); r.vz += (ivz - r.vz) * Math.min(1, dt * 6);
    if (r.av) {
      // Laufrichtung relativ zur Blickrichtung des Piloten ergibt die Richtungsclips (vor, seitlich, zurück)
      r.fire -= dt;
      driveAvatar(r.av, dt, { x: r.x, y: r.y, air: r.air, dead: r.dead, z: r.z, yaw: r.tyaw, pitch: 0, vx: Math.abs(r.vx) < 0.05 ? 0 : r.vx, vz: Math.abs(r.vz) < 0.05 ? 0 : r.vz, wid: r.wid, crouch: r.crouch, hit: r.hit, fire: r.fire > 0, shots: r.shots });
      continue;
    }
    if (!r.p) continue;
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
// Eigene Figuren der Geschichte: 'achterberg', 'hollweg', 'roth', 'tamm', 'kessler', 'krull', 'varga', 'sander' (Brandt steht in Neonhafen, siehe chapter3.ts). Fehlt die Datei, steht dort ersatzweise eine der beiden Grundfiguren mit Farbton.
export interface NpcLook { model?: 'worker' | 'merchant' | 'achterberg' | 'mechaniker' | 'lagerarbeiter' | 'hollweg' | 'roth' | 'tamm' | 'kessler' | 'krull' | 'varga' | 'sander'; tint?: [number, number, number] }
const NPC_FALLBACK: Record<string, [string, [number, number, number]]> = {
  achterberg: ['merchant', [0.82, 0.86, 0.95]], hollweg: ['worker', [0.72, 0.8, 1.05]], roth: ['merchant', [0.6, 0.85, 0.55]], tamm: ['merchant', [1.1, 0.92, 0.68]],
  kessler: ['mechaniker', [0.95, 0.85, 0.7]], krull: ['merchant', [1.05, 0.95, 0.8]],
  varga: ['lagerarbeiter', [0.7, 0.8, 1.05]], sander: ['mechaniker', [0.8, 1.0, 0.95]],      // Kapitel 5 (eigene Figuren seit Alpha 1.18)
};
export function storyNpc(name: string, title: string, label: string, act: () => void, col = '#ffb347', at?: { x: number; z: number }, look: NpcLook = {}) {
  if (!IN.active || !stationGroup || IN.ship) return false;
  // Dieselbe Figur steht oder kommt schon (ein Schritt wurde neu betreten): Die alte weicht, damit nie zwei ineinander stehen
  if (leavers.some(w => w.end && w.name === name)) return true;
  for (let i = persons.length - 1; i >= 0; i--) {
    const q = persons[i]; if (!q.story || q.name !== name) continue;
    const same = (px: number, pz: number) => Math.abs(px - q.x) < 0.05 && Math.abs(pz - q.z) < 0.05;
    for (let j = inters.length - 1; j >= 0; j--) if (same(inters[j].x, inters[j].z)) inters.splice(j, 1);
    for (let j = labels.length - 1; j >= 0; j--) if (same(labels[j].p.x, labels[j].p.z)) labels.splice(j, 1);
    q.p.g.removeFromParent(); persons.splice(i, 1);
  }
  const x = at ? at.x : IN.x - 2.5, z = at ? at.z : IN.z - 7;   // ohne Ortsangabe: vor dem Spieler (Blick zum Korridor)
  const p = storyPerson(look);
  stationGroup.add(p.g);
  const settle = () => {
    const face = Math.atan2(IN.x - x, IN.z - z);
    p.g.position.set(x, 0, z);
    persons.push({ p, x, z, face: p.g.rotation.y, name, home: face, want: face, story: true });
    labels.push({ p: new THREE.Vector3(x, 2.15, z), text: `${name} · ${title}`, col });
    inters.push({ x, z, r: 3.4, label: () => label, act });
  };
  // Steht der Pilot schon länger im Raum (ein Kapitel beginnt, während er im Hangar ist), kommt die Figur durch den Gang herein und geht an
  // ihren Platz, statt vor ihm aufzutauchen. Nach dem Andocken (die Figuren warten schon) steht sie sofort da.
  if (at && G.mode === 'walk' && G.time - settledT > 4) {
    const k = leavers.filter(w => w.end).length, off = (k % 2 ? 1 : -1) * (0.5 + 0.35 * k), op = outPath(off), [sx, sz] = op[op.length - 1];
    p.g.position.set(sx, 0, sz); p.g.rotation.y = 0;
    if (p.anim) p.anim.look = null;
    leavers.push({ p, x: sx, z: sz, path: [...op.slice(0, -1).reverse(), [x, z]], i: 0, wait: k * 1.4, turned: true, name, end: () => { if (p.anim) p.anim.look = camera.position; settle(); } });
  } else { p.g.rotation.y = Math.atan2(IN.x - x, IN.z - z); settle(); }
  return true;
}
// Die Szene ist vorbei: Alle Figuren der Geschichte im Raum gehen ab (durch den Gang hinaus) und lassen sich nicht mehr ansprechen.
// Ohne das blieben sie nach dem Ende eines Kapitels stehen. Begann das nächste Kapitel an derselben Station, stellte es seine Figuren in die
// alten hinein, und die Taste E traf den alten, abgeschlossenen Ansprechpunkt: Es ging erst nach Ablegen und erneutem Andocken weiter
// (gefunden im Probelauf zu Alpha 1.19, Übergang Kapitel 3 → 4 und 4 → 5 in der Bastion).
export function storyNpcsLeave() {
  if (!IN.active || IN.ship || !stationGroup) return;
  for (const w of leavers) if (w.end) { w.end = undefined; w.path = outPath(0.5); w.i = 0; w.turned = false; }   // wer noch hereinkommt, kehrt um
  let k = 0;
  for (let i = persons.length - 1; i >= 0; i--) {
    const q = persons[i]; if (!q.story) continue;
    persons.splice(i, 1);
    const same = (x: number, z: number) => Math.abs(x - q.x) < 0.05 && Math.abs(z - q.z) < 0.05;
    for (let j = inters.length - 1; j >= 0; j--) if (same(inters[j].x, inters[j].z)) inters.splice(j, 1);
    for (let j = labels.length - 1; j >= 0; j--) if (same(labels[j].p.x, labels[j].p.z)) labels.splice(j, 1);
    if (q.p.anim) { q.p.anim.look = null; q.p.anim.talkT = 0; }
    const off = (k % 2 ? 1 : -1) * (0.5 + 0.35 * k);      // nebeneinander durch die Tür, nicht ineinander
    leavers.push({ p: q.p, x: q.x, z: q.z, path: outPath(off), i: 0, wait: 1.2 + k * 1.1, turned: false });
    k++;
  }
  if (IN.target && !inters.includes(IN.target)) IN.target = null;
}
// Treffpunkt für Figuren der Geschichte: im Hangar links vom Ausgang, rund 15 m vom Platz, an dem der Pilot aussteigt.
// Hängt nicht davon ab, wo der Pilot gerade steht (er kann auch im Stationsmenü oder auf der Promenade sein).
export function hangarSpot(minX = -7) { const hw = shipObs[0] ? (shipObs[0][1] - shipObs[0][0]) / 2 : 5; return { x: Math.max(minX, Math.min(HW - 6, hw + 5) - 16), z: -43 }; }
// Steht der Pilot zu Fuß bei dieser Figur der Geschichte (für die Auftragszeile „hingehen“)?
export function nearNpc(name: string, r = 4.2) { if (!IN.active || IN.ship) return false; const p = persons.find(q => q.name === name); return !!p && Math.hypot(p.x - IN.x, p.z - IN.z) < r; }
// Figur für die Geschichte: gewähltes Modell (Arbeiter oder Händler) mit eigenem Farbton, steht und atmet
function storyPerson(look: NpcLook): Person {
  let cn: string = look.model || 'merchant', tint = look.tint || 1;
  if (NPC_FALLBACK[cn] && !hasChar(cn)) [cn, tint] = NPC_FALLBACK[cn];   // eigene Figur fehlt: Grundfigur mit Farbton
  if (!hasChar(cn)) return buildPerson(0x2c3440, 0xc89474, 0x3a2a1c, 0xffb347);
  const c = charInstance(cn, tint);
  c.g.traverse((o: any) => { if (o.isMesh) { o.userData.shared = true; if (o.material !== undefined) disposables.push(o.material); } });
  const d = () => new THREE.Group();
  animInit(c.anim, false);
  c.anim.look = camera.position;
  return { g: c.g, legL: d(), legR: d(), armL: d(), armR: d(), head: d(), mixer: c.mixer, walk: c.walk, idle: c.idle, moving: false, anim: c.anim };
}
