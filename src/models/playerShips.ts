import * as THREE from 'three';
import { glowMat, basicAdd } from '../core/engine';
import { std, texMat, boxUV } from '../core/textures';
import { mesh, alongZ } from './helpers';
import { buildFighter, GM, DK, LT, CIV, MK } from './ships';
import { SHIPS, type ShipId } from '../data/ships';
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
  drones: THREE.Group[];    // angedockte Drohnen (Bergbaudrohnen)
}

function shieldFor(r: number) {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
}
// Triebwerksstrahl: kurzer, weicher, blassblauer Schweif direkt an der Düse (zwei Lagen: breiter Schleier, heller Kern).
// Hängt am Glühpunkt und wächst mit ihm (Schub), zeigt nach hinten (+Z).
const cone = (r: number, len: number) => { const c = new THREE.ConeGeometry(r, len, 14, 1, true); c.rotateX(Math.PI / 2); c.translate(0, 0, len / 2); return c; };
const JET_OUTER = cone(0.36, 1.25), JET_CORE = cone(0.17, 0.8);
function addJet(sp: THREE.Sprite) {
  const mo = basicAdd(0x8fc8ff); mo.opacity = 0.26; mo.side = THREE.DoubleSide;
  const mc = basicAdd(0xeaf6ff); mc.opacity = 0.5; mc.side = THREE.DoubleSide;
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
// Positionslichter (rot/grün) sind entfallen; die Funktion bleibt als leerer Platzhalter für die Aufrufer
function nav(_g: THREE.Group, _navs: THREE.Sprite[], _x: number, _y: number, _z: number, _s = 2) { /* nichts */ }

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

// Schiff aus einem glTF-Modell: Triebwerke, Waffen und Laser werden aus den Abmessungen abgeleitet
function gltfShip(cls: ShipId, paint: Paint): ShipModel {
  const c = SHIPS[cls], m = modelInstance(c.model, c.len, paint), g = new THREE.Group(), glows: THREE.Sprite[] = [], navs: THREE.Sprite[] = [], drones: THREE.Group[] = [];
  g.add(m.obj);
  const { w, h, l } = m, rear = l * 0.5, front = -l * 0.5;
  const ex = w * 0.1;
  // Pfeil: vier Triebwerke nebeneinander am Heck
  // Kormoran: zwei Haupt- und zwei Hilfstriebwerke am Heck (Maße aus dem Blender-Modell, Schiffskoordinaten in Metern)
  // Würger: zwei flache Schubdüsen am Ende der Gondeln (Blender: y ±3,05, z 2,45, Düsenende x −12,75; Mitte des Modells x −0,375, z 2,49)
  // Elster: zwei Gondeln (Blender y ±2,35, z 3,15, Düsenende x −12,2; Mitte des Modells x −0,8, z 3,13)
  // Wisent: zwei ovale Düsen am Ende der Gondeln (Blender: y ±17, z 7,6, x −32,9; Mitte des Modells x 1,33, z 10,17)
  // Milan: zwei Schubdüsen im Heck (Blender: y ±0,8, z 2,3, Düsenende x −7,55; Mitte des Modells x 0,283, z 2,14; mil-gelenke.json)
  // Dohle: zwei Gondeln an Pylonen (Blender: y ±2,95, z 3,45, Düsenende x −7,15; Mitte des Modells x 1,0, z 2,746)
  // Kranich: zwei Gondeln an Stummelflügeln (Blender: y ±6,15, z 3,45, Düsenende x −16,0; Mitte des Modells x −0,062, z 3,985; kra-gelenke.json)
  // Möwe: zwei Schubdüsen in der Heckfläche über der Rampe (Blender: y ±2,4, z 7,65, x −20,9; Mitte des Modells x −2,411, z 6,065; moe-gelenke.json)
  const enginePts = cls === 'moewe' ? [[-2.4, 1.58, 18.49], [2.4, 1.58, 18.49]] : cls === 'kranich' ? [[-6.15, -0.535, 15.94], [6.15, -0.535, 15.94]] : cls === 'dohle' ? [[-2.95, 0.7, 8.15], [2.95, 0.7, 8.15]] : cls === 'milan' ? [[-0.8, 0.16, 7.83], [0.8, 0.16, 7.83]] : cls === 'wisent' ? [[-17, -2.57, 34.2], [17, -2.57, 34.2]] : cls === 'elster' ? [[-3.15, -0.01, 11.25], [3.15, -0.01, 11.25]] : cls === 'wuerger' ? [[-3.05, -0.04, 12.35], [3.05, -0.04, 12.35]] : cls === 'kormoran' ? [[-4.8, 0.17, 22.4], [4.8, 0.17, 22.4], [-7.9, -0.43, 22.1], [7.9, -0.43, 22.1]] : cls === 'pfeil' ? [-0.164, -0.055, 0.055, 0.164].map(f => [l * f, -h * 0.02, rear * 0.97])   /* an der Länge bemessen: die Seitenflügel machen das Modell breiter als das Heck */ : [[-ex, 0, rear * 0.96], [ex, 0, rear * 0.96]];
  for (const e of enginePts) {
    const sp = new THREE.Sprite(glowMat(0xbfe2ff, 0.8));
    sp.position.set(e[0], e[1], e[2] + 0.5);
    const gk = cls === 'moewe' ? l / 34 : cls === 'kranich' ? l / 30 : cls === 'dohle' ? l / 30 : cls === 'milan' ? l / 26 : cls === 'pfeil' ? l / 36 : cls === 'wisent' ? l / 20 : cls === 'wuerger' ? l / 24 : cls === 'elster' ? l / 28 : cls === 'kormoran' ? (Math.abs(e[0]) > 6 ? l / 60 : l / 34) : l / 15;   // Pfeil: vier kleinere Leuchten statt zwei großer
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
  // Elster: der Strahl kommt aus dem Emitter des Laserturms unter dem Kinn
  const laserPts = cls === 'dohle' ? [[0, -1.12, -7.74]] : cls === 'milan' ? [[0, -0.46, -5.74]] : cls === 'elster' ? [[0, -2.39, -11.09]] : c.beams > 1 ? [[-w * 0.22, -h * 0.15, front], [w * 0.22, -h * 0.15, front]] : c.laser ? [[0, -h * 0.15, front]] : [];
  return {
    g, glows, navs, shield, extraGuns: new THREE.Group(),
    // Würger: Flügelkanonen unter der Vorderkante, ab Stufe 2 dazu die Schienenkanone unter der Nase
    // Wisent: Flügeltürme, ab Stufe 2 dazu der große Turm oben vorn
    gunPts: cls === 'moewe' ? [[3.98, 2.085, -17.361]] : cls === 'kranich' ? [[3.55, -0.94, 0.8]] : cls === 'dohle' ? [[1.0, -0.79, -6.81]] : cls === 'milan' ? [[1.04, 0.6, -2.6]] : cls === 'wisent' ? [[10.5, 3.8, -9.1]] : cls === 'kormoran' ? [[7.0, -2.54, -8.8]] : cls === 'elster' ? [[1.32, -0.74, -10.49]] : cls === 'wuerger' ? [[4.9, -0.52, -5.2]] : [[w * 0.16, -h * 0.05, front * 0.8]],
    extraGunPts: cls === 'wisent' ? [[0.6, 6.6, -16.1]] : cls === 'wuerger' ? [[0, -1.1, -12.3]] : [],
    laserPts, enginePts, drones,
  };
}

// Patrouillenjäger der Bastion: seit 2026-11-18 unser Würger (vorher Modelle aus dem alten Gratis-Paket); ohne Modell der prozedurale Jäger
export function buildAllyModel(_i: number, markCol: number) {
  if (!hasModel(SHIPS.wuerger.model)) { const f = buildFighter(markCol); return { g: f.g, glows: f.glows, navs: f.navs }; }
  const m = gltfShip('wuerger', 'Orange');
  return { g: m.g, glows: m.glows, navs: m.navs };
}

export function buildShipModel(cls: ShipId, paint: Paint = 'Orange'): ShipModel {
  if (hasModel(SHIPS[cls].model)) return gltfShip(cls, paint);
  if (cls === 'elster') return elster();
  const f = buildFighter(SHIPS[cls]?.col ?? SHIPS.milan.col);
  for (const gl of f.glows) gl.userData.base = 1;
  return {
    g: f.g, glows: f.glows, navs: f.navs, shield: f.shield, extraGuns: f.extraGuns,
    gunPts: [[1.45, -0.55, -5.6]], extraGunPts: [[6.55, -0.06, -3.6]], laserPts: [[0, -0.55, -7.2]],
    enginePts: [[-2.15, -0.15, 7], [2.15, -0.15, 7]], drones: [],
  };
}
