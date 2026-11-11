import * as THREE from 'three';
import { glowMat, basicAdd } from '../core/engine';
import { std, texMat, boxUV } from '../core/textures';
import { mesh, alongZ } from './helpers';
import { buildFighter, GM, DK, LT, CIV, WIN, MK } from './ships';
import { SHIPS, type ShipId } from '../data/ships';
import { pick } from '../core/util';
import { hasModel, modelInstance, type Paint } from './gltfShips';

// Einheitliche Beschreibung eines steuerbaren Schiffsmodells (Bug zeigt nach -Z)
export interface ShipModel {
  g: THREE.Group;
  glows: THREE.Sprite[];
  navs: THREE.Sprite[];
  shield: THREE.Mesh;
  extraGuns: THREE.Object3D;
  gunPts: number[][];       // je Seite gespiegelt (x positiv angeben)
  extraGunPts: number[][];  // ab Kanonen-Stufe 2
  laserPts: number[][];     // Ursprung der Laserstrahlen
  enginePts: number[][];    // für Abgasspuren
  drones: THREE.Group[];    // angedockte Drohnen (Maulwurf)
}

function shieldFor(r: number) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
}
// Triebwerksstrahl: kurzer, weicher, blassblauer Schweif direkt an der Düse (zwei Lagen: breiter Schleier, heller Kern).
// Hängt am Glühpunkt und wächst mit ihm (Schub), zeigt nach hinten (+Z).
const cone = (r: number, len: number) => { const c = new THREE.ConeGeometry(r, len, 14, 1, true); c.rotateX(Math.PI / 2); c.translate(0, 0, len / 2); return c; };
const JET_OUTER = cone(0.36, 1.25), JET_CORE = cone(0.17, 0.8);
function addJet(sp: THREE.Sprite) {
  const mo = basicAdd(0x8fc8ff); mo.opacity = 0.18; mo.side = THREE.DoubleSide;
  const mc = basicAdd(0xeaf6ff); mc.opacity = 0.32; mc.side = THREE.DoubleSide;
  for (const [g, m] of [[JET_OUTER, mo], [JET_CORE, mc]] as const) { const j = new THREE.Mesh(g, m); j.userData.shared = true; sp.add(j); }
}
function engine(g: THREE.Group, glows: THREE.Sprite[], x: number, y: number, z: number, r: number, len: number) {
  g.add(alongZ(mesh(new THREE.CylinderGeometry(r, r * 1.15, len, 16), DK, x, y, z)));
  g.add(mesh(new THREE.TorusGeometry(r * 1.02, r * 0.14, 6, 18), MK, x, y, z + len / 2));
  g.add(mesh(new THREE.CircleGeometry(r * 0.82, 18), new THREE.MeshBasicMaterial({ color: 0xffd8a0 }), x, y, z + len / 2 + 0.03));
  const sp = new THREE.Sprite(glowMat(0xbfe2ff, 0.8));
  sp.position.set(x, y, z + len / 2 + r * 0.6);
  sp.userData.base = r * 0.85;
  sp.scale.setScalar(r * 3);
  addJet(sp);
  g.add(sp); glows.push(sp);
}
function nav(g: THREE.Group, navs: THREE.Sprite[], x: number, y: number, z: number, s = 2) {
  const nl = new THREE.Sprite(glowMat(x < 0 ? 0xff3030 : 0x30ff70, 1)); nl.position.set(x, y, z); nl.scale.setScalar(s); g.add(nl); navs.push(nl);
}

// Kleine Bergbaudrohne (wird auch frei fliegend genutzt)
export function buildDrone() {
  const d = new THREE.Group();
  d.add(mesh(new THREE.OctahedronGeometry(1.4), LT));
  d.add(mesh(new THREE.TorusGeometry(1.7, 0.18, 6, 16), DK).rotateX(Math.PI / 2));
  const eye = new THREE.Sprite(glowMat(0xffa040, 1)); eye.scale.setScalar(2.4); d.add(eye);
  return d;
}

function elster(): ShipModel {
  const g = new THREE.Group(), glows: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  const hull = texMat(0xd8dce2, 'hull_mil', { roughness: 0.5 }, 0.8), mark = std(SHIPS.elster.col, { emissive: SHIPS.elster.col, emissiveIntensity: 0.1 });
  g.add(mesh(new THREE.BoxGeometry(6, 5, 14), hull, 0, 0, 0));
  g.add(mesh(new THREE.BoxGeometry(6.2, 1, 14.2), mark, 0, 1.6, 0));
  // Bergbaukopf vorne
  g.add(alongZ(mesh(new THREE.CylinderGeometry(2.6, 3, 4, 16), DK, 0, -0.4, -9)));
  g.add(alongZ(mesh(new THREE.ConeGeometry(2.6, 3, 16), GM, 0, -0.4, -12.4)).rotateX(Math.PI));
  g.add(mesh(new THREE.TorusGeometry(2.7, 0.3, 6, 20), MK, 0, -0.4, -10.9));
  const em = new THREE.Sprite(glowMat(0xff9a40, 0.8)); em.position.set(0, -0.4, -14); em.scale.setScalar(3); g.add(em);
  // Cockpit
  const can = mesh(new THREE.SphereGeometry(1, 20, 14), std(0x2a2010, { metalness: 1, roughness: 0.05, emissive: 0x2a1a00, emissiveIntensity: 0.5, flatShading: false }), 0, 2.8, -4);
  can.scale.set(1.8, 1.1, 2.6); g.add(can);
  // Frachtkapseln
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(3.4, 3.8, 10), CIV, s * 4.9, -0.3, 1.5));
    g.add(mesh(new THREE.BoxGeometry(3.5, 0.6, 10.1), mark, s * 4.9, 1.2, 1.5));
    g.add(alongZ(mesh(new THREE.CylinderGeometry(0.25, 0.25, 3, 8), DK, s * 4.9, -2.4, -4.5)));
    nav(g, navs, s * 6.8, 1, 6);
  }
  engine(g, glows, -2.3, -0.5, 8.6, 1.3, 4);
  engine(g, glows, 2.3, -0.5, 8.6, 1.3, 4);
  // Scannerschüssel
  const dish = mesh(new THREE.ConeGeometry(1.8, 0.9, 16, 1, true), LT, 0, 3.8, 3.5); dish.rotation.x = -0.6; g.add(dish);
  g.add(mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 6), DK, 0, 3.3, 5.5));
  const shield = shieldFor(13); g.add(shield);
  boxUV(g, 1 / 8);
  g.rotation.order = 'YXZ';
  return { g, glows, navs, shield, extraGuns: new THREE.Group(), gunPts: [[4.9, -2.4, -6]], extraGunPts: [], laserPts: [[0, -0.4, -14]], enginePts: [[-2.3, -0.5, 11], [2.3, -0.5, 11]], drones: [] };
}

function maulwurf(): ShipModel {
  const g = new THREE.Group(), glows: THREE.Sprite[] = [], navs: THREE.Sprite[] = [], drones: THREE.Group[] = [];
  const mark = std(SHIPS.maulwurf.col, { emissive: 0x2a1c00 });
  g.add(mesh(new THREE.BoxGeometry(12, 9, 34), GM, 0, 0, 2));
  g.add(mesh(new THREE.BoxGeometry(12.2, 1.4, 6), mark, 0, -2, -12));
  // Greifarme mit Laseremittern
  for (const s of [-1, 1]) {
    const arm = mesh(new THREE.BoxGeometry(3, 3.4, 15), DK, s * 6.8, -1, -20); arm.rotation.y = s * 0.08; g.add(arm);
    g.add(mesh(new THREE.BoxGeometry(3.6, 4, 3), mark, s * 6.6, -1, -27));
    g.add(alongZ(mesh(new THREE.ConeGeometry(1.4, 2.4, 12), LT, s * 6.4, -1, -29.4)).rotateX(Math.PI));
    const em = new THREE.Sprite(glowMat(0xff9a40, 0.8)); em.position.set(s * 6.4, -1, -30.8); em.scale.setScalar(3.5); g.add(em);
    for (const z of [-6, 6]) g.add(mesh(new THREE.BoxGeometry(1.2, 6, 10), DK, s * 6.4, 0, z));
    nav(g, navs, s * 7.5, 4.6, 16, 3);
    // Drohnenbucht
    g.add(mesh(new THREE.BoxGeometry(2, 4, 6), DK, s * 7, 1.5, 4));
    const d = buildDrone(); d.position.set(s * 8.8, 1.5, 4); g.add(d); drones.push(d);
  }
  // Kommandoturm
  g.add(mesh(new THREE.BoxGeometry(7, 5, 9), LT, 0, 7, -9));
  g.add(mesh(new THREE.BoxGeometry(7.2, 1.2, 0.4), WIN, 0, 7.8, -13.6));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.4, 1.2, 6), WIN, s * 3.6, 7.8, -9));
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 5, 6), DK, 2, 11.5, -8));
  // Erzbunker
  g.add(mesh(new THREE.BoxGeometry(14, 8, 16), DK, 0, 8.5, 9));
  for (let z = 2; z <= 16; z += 4.6) g.add(mesh(new THREE.BoxGeometry(14.2, 1, 1.4), mark, 0, 12.6, z));
  g.add(mesh(new THREE.BoxGeometry(16, 10, 8), GM, 0, 0, 20));
  for (const x of [-4, 4]) for (const y of [-2.5, 2.5]) engine(g, glows, x, y, 25, 2, 4);
  const shield = shieldFor(26); g.add(shield);
  boxUV(g, 1 / 14);
  g.rotation.order = 'YXZ';
  return {
    g, glows, navs, shield, extraGuns: new THREE.Group(), gunPts: [[4, 6.5, -14]], extraGunPts: [], laserPts: [[-6.4, -1, -31], [6.4, -1, -31]],
    enginePts: [[-4, 0, 28], [4, 0, 28]], drones,
  };
}

function kaerrner(): ShipModel {
  const g = new THREE.Group(), glows: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  const mark = std(SHIPS.kaerrner.col, { emissive: 0x0a1428 });
  // Cockpitmodul
  g.add(mesh(new THREE.BoxGeometry(9, 7, 10), LT, 0, 1, -23));
  g.add(alongZ(mesh(new THREE.CylinderGeometry(2.5, 4.4, 5, 8), LT, 0, 1, -30.5)).rotateX(Math.PI));
  g.add(mesh(new THREE.BoxGeometry(9.2, 1.4, 0.4), WIN, 0, 3, -28.2));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.4, 1.4, 8), WIN, s * 4.6, 3, -23));
  g.add(mesh(new THREE.BoxGeometry(9.3, 1.2, 10.2), mark, 0, -1.2, -23));
  g.add(mesh(new THREE.BoxGeometry(2, 1.2, 3), DK, 0, 5, -22));
  // Rückgrat mit Containern
  g.add(mesh(new THREE.BoxGeometry(3.4, 3.4, 42), DK, 0, 0, 0));
  const pal = [0xc0604a, 0x4a80c0, 0xe0b850, 0x5fa06a, 0xb0b4ba, 0x8a5fa8];
  for (let z = -13; z <= 13; z += 8.6) for (const [x, y] of [[-4.4, 2.6], [4.4, 2.6], [-4.4, -2.6], [4.4, -2.6]])
    g.add(mesh(new THREE.BoxGeometry(5.2, 5, 8), texMat(pick(pal), 'hull_light', { roughness: 0.7 }), x, y, z));
  for (const z of [-17.5, 17.5]) g.add(mesh(new THREE.BoxGeometry(14, 12, 1.2), GM, 0, 0, z));
  // Antriebsblock
  g.add(mesh(new THREE.BoxGeometry(12, 9, 8), GM, 0, 0, 22));
  engine(g, glows, -3.4, 0, 28, 3, 5);
  engine(g, glows, 3.4, 0, 28, 3, 5);
  for (const s of [-1, 1]) nav(g, navs, s * 7.2, 0, 22, 3);
  const shield = shieldFor(30); g.add(shield);
  boxUV(g, 1 / 14);
  g.rotation.order = 'YXZ';
  return { g, glows, navs, shield, extraGuns: new THREE.Group(), gunPts: [[1.2, 5.8, -24]], extraGunPts: [], laserPts: [], enginePts: [[-3.4, 0, 31], [3.4, 0, 31]], drones: [] };
}

// Schiff aus einem glTF-Modell: Triebwerke, Waffen und Laser werden aus den Abmessungen abgeleitet
function gltfShip(cls: ShipId, paint: Paint): ShipModel {
  const c = SHIPS[cls], m = modelInstance(c.model, c.len, paint), g = new THREE.Group(), glows: THREE.Sprite[] = [], navs: THREE.Sprite[] = [], drones: THREE.Group[] = [];
  g.add(m.obj);
  const { w, h, l } = m, rear = l * 0.5, front = -l * 0.5;
  const ex = cls === 'maulwurf' || cls === 'kaerrner' || cls === 'venom' ? w * 0.2 : w * 0.1;
  // Pfeil: vier Triebwerke nebeneinander am Heck
  const enginePts = cls === 'pfeil' ? [-0.164, -0.055, 0.055, 0.164].map(f => [l * f, -h * 0.02, rear * 0.97])   /* an der Länge bemessen: die Seitenflügel machen das Modell breiter als das Heck */ : [[-ex, 0, rear * 0.96], [ex, 0, rear * 0.96]];
  for (const e of enginePts) {
    const sp = new THREE.Sprite(glowMat(0xbfe2ff, 0.8));
    sp.position.set(e[0], e[1], e[2] + 0.5);
    const gk = cls === 'pfeil' ? l / 36 : l / 15;   // Pfeil: vier kleinere Leuchten statt zwei großer
    sp.userData.base = gk;
    sp.scale.setScalar(3 * gk);
    addJet(sp);
    g.add(sp); glows.push(sp);
  }
  for (const s of [-1, 1]) nav(g, navs, s * w * 0.47, h * 0.05, l * 0.15, Math.max(0.9, l / 22));
  // Bergbaudrohnen hängen außen am Rumpf; die Pfeil trägt ihre im Rumpf (sonst schweben sie neben dem breiten Schiff), sie starten dann aus der Schiffsmitte
  if (c.drones && cls !== 'pfeil') for (const s of [-1, 1]) { const d = buildDrone(); d.position.set(s * (w * 0.5 + 1.8), 0, 0); g.add(d); drones.push(d); }
  const shield = shieldFor(Math.max(l, w) * 0.62); g.add(shield);
  g.rotation.order = 'YXZ';
  const laserPts = c.beams > 1 ? [[-w * 0.22, -h * 0.15, front], [w * 0.22, -h * 0.15, front]] : c.laser ? [[0, -h * 0.15, front]] : [];
  return {
    g, glows, navs, shield, extraGuns: new THREE.Group(),
    gunPts: [[w * 0.16, -h * 0.05, front * 0.8]], extraGunPts: cls === 'falke' || cls === 'habicht' ? [[w * 0.36, 0, front * 0.4]] : [],
    laserPts, enginePts, drones,
  };
}

// Patrouillenjäger: verschiedene Modelle je Rufzeichen
const ALLY_MODELS: [string, Paint][] = [['Bob', 'Blue'], ['Challenger', 'Green'], ['Spitfire', 'Blue'], ['Dispatcher', 'Green'], ['Bob', 'Orange']];
export function buildAllyModel(i: number, markCol: number) {
  const [name, paint] = ALLY_MODELS[i % ALLY_MODELS.length];
  if (!hasModel(name)) { const f = buildFighter(markCol); return { g: f.g, glows: f.glows, navs: f.navs }; }
  const m = modelInstance(name, 15, paint), g = new THREE.Group(), glows: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  g.add(m.obj);
  for (const s of [-1, 1]) {
    const sp = new THREE.Sprite(glowMat(0xbfe2ff, 0.8)); sp.position.set(s * m.w * 0.1, 0, m.l * 0.5); sp.scale.setScalar(3); g.add(sp); glows.push(sp);
    nav(g, navs, s * m.w * 0.47, 0, m.l * 0.15, 0.9);
  }
  return { g, glows, navs };
}

export function buildShipModel(cls: ShipId, paint: Paint = 'Orange'): ShipModel {
  if (hasModel(SHIPS[cls].model)) return gltfShip(cls, paint);
  if (cls === 'habicht') { const f = buildFighter(SHIPS.habicht.col); for (const gl of f.glows) gl.userData.base = 1; return { g: f.g, glows: f.glows, navs: f.navs, shield: f.shield, extraGuns: f.extraGuns, gunPts: [[1.45, -0.55, -5.6]], extraGunPts: [[6.55, -0.06, -3.6]], laserPts: [], enginePts: [[-2.15, -0.15, 7], [2.15, -0.15, 7]], drones: [] }; }
  if (cls === 'elster') return elster();
  if (cls === 'maulwurf') return maulwurf();
  if (cls === 'kaerrner') return kaerrner();
  const f = buildFighter(SHIPS.falke.col);
  for (const gl of f.glows) gl.userData.base = 1;
  return {
    g: f.g, glows: f.glows, navs: f.navs, shield: f.shield, extraGuns: f.extraGuns,
    gunPts: [[1.45, -0.55, -5.6]], extraGunPts: [[6.55, -0.06, -3.6]], laserPts: [[0, -0.55, -7.2]],
    enginePts: [[-2.15, -0.15, 7], [2.15, -0.15, 7]], drones: [],
  };
}
