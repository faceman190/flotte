import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { texMat, boxUV } from '../core/textures';
import { setSky } from '../core/sky';
import { setAmbience } from '../core/ambience';
import { rng, hashStr, rand, d3 } from '../core/util';
import { SECTOR, gatePos, FACTION, type SectorDef, type StationDef, type FieldDef, type Faction } from '../data/galaxy';
import { ITEMS, type ItemId, type RockKind } from '../data/items';
import { oreTable, rockKinds } from '../data/ores';
import { buildCarrier, CARRIER_DOCK, CARRIER_LAUNCH, carrierSpheres } from '../models/ships';
import { buildStation, buildOutpost, buildGate } from '../models/structures';
import { burst, clearParticles } from './fx';
import { snd } from '../core/audio';
import { planetLook } from '../data/planets';
import { buildModelStation } from '../models/stationModels';
import { SHARED } from './shared';

// ---------------- Typen der Sektor-Objekte ----------------
export interface Station {
  def: StationDef; id: string; kind: StationDef['kind']; name: string;
  x: number; y: number; z: number; yaw: number;
  mesh: THREE.Group; model: any;
  dock: { x: number; y: number; z: number };
  launch: { x: number; y: number; z: number; yaw: number };
  sph: number[][]; R: number; flak: number;
}
export interface Gate {
  to: string; name: string; faction: Faction;
  x: number; y: number; z: number; nx: number; nz: number;
  mesh: THREE.Group; model: ReturnType<typeof buildGate>;
}
export interface Field { def: FieldDef; x: number; y: number; z: number; r: number; n: number; rng: ReturnType<typeof rng> }
export interface Ore { k: ItemId; p: number }
export interface Asteroid {
  x: number; y: number; z: number; r: number; r0: number; kind: RockKind; hp: number;
  vx: number; vy: number; vz: number; wx: number; wy: number; mesh: THREE.Mesh; field: Field | null;
  id?: number;       // Kennung in der gemeinsamen Welt (vom Gastgeber vergeben)
  comp: Ore[];       // Zusammensetzung, absteigend nach Anteil
  yld: number;       // verbleibender Ertrag in Einheiten
  max: number;
  scanT: number;     // > 0: vom Scanner erfasst (Sekunden)
}
export interface Pickup { x: number; y: number; z: number; vx: number; vy: number; vz: number; k: ItemId; amt: number; life: number; mesh: THREE.Mesh }

export const world = {
  def: null as SectorDef | null,
  stations: [] as Station[],
  gates: [] as Gate[],
  fields: [] as Field[],
  asteroids: [] as Asteroid[],
  pickups: [] as Pickup[],
  traffic: [] as any[],
  allies: [] as any[],
  enemies: [] as any[],
  bullets: [] as any[],
  ebullets: [] as any[],
  rockets: [] as any[],
  spawnT: 0, trafficT: 0, regrowT: 0, allyT: 0,
  hiveT: [] as number[],
  // Planetenoberfläche
  surface: null as null | { planet: string; limit: number },
  ground: null as null | ((x: number, z: number) => number),
  extras: [] as THREE.Object3D[],       // zusätzliche Szenenobjekte (Gelände, Anflugzone) – werden beim Leeren entfernt
  orbit: null as null | { x: number; y: number; z: number; name: string; mesh: THREE.Object3D },
};
export const SECTOR_RADIUS = 6200;

// ---------------- Asteroiden ----------------
const ROCK: Record<RockKind, THREE.MeshStandardMaterial> = {
  metal: texMat(0xffffff, 'rock', { roughness: 0.85, metalness: 0.1, emissive: 0x2e2a24 }),
  ice: texMat(0xeaf6ff, 'rock', { roughness: 0.3, metalness: 0.1, emissive: 0x2a3e52 }),
  crystal: texMat(0x9484b0, 'rock', { roughness: 0.5, metalness: 0.3, emissive: 0x1c0c34 }),
};
// Gesteinsfarbe und leuchtende Adern verraten das Haupterz
const TINT: Partial<Record<ItemId, number>> = { kupfer: 0xffd2bc, titan: 0xd2deff, iridium: 0xeee4c4 };
const ROCK_T: Record<string, THREE.MeshStandardMaterial> = {};
function rockMat(kind: RockKind, main: ItemId) {
  if (kind !== 'metal' || !TINT[main]) return ROCK[kind];
  return ROCK_T[main] || (ROCK_T[main] = texMat(TINT[main]!, 'rock', { roughness: 0.85, metalness: 0.2, emissive: 0x1a1612 }));
}
const ORE_M: Record<string, THREE.Material> = {};
const oreMat = (k: ItemId) => ORE_M[k] || (ORE_M[k] = new THREE.MeshBasicMaterial({ color: ITEMS[k].c }));
export const yieldFor = (r: number) => (r >= 40 ? 26 : r >= 26 ? 13 : 5);

// Zusammensetzung aus der Erztabelle der Region
function makeComp(kind: RockKind, field: Field | null, R: () => number): Ore[] {
  const def = world.def;
  const table = def && field ? oreTable(def, field.def, kind) : kind === 'ice' ? { eis: 1 } : kind === 'crystal' ? { ferrit: 1 } : { erz: 1 };
  const entries = Object.entries(table) as [ItemId, number][];
  const pickW = (ex: ItemId[]) => {
    const c = entries.filter(([k]) => !ex.includes(k)), tot = c.reduce((a, [, w]) => a + w, 0);
    let r = R() * tot;
    for (const [k, w] of c) { r -= w; if (r <= 0) return k; }
    return c.length ? c[c.length - 1][0] : null;
  };
  const main = pickW([])!, comp: Ore[] = [{ k: main, p: 0.5 + R() * 0.3 }];
  const second = R() < 0.6 ? pickW([main]) : null;
  if (second) {
    const third = R() < 0.3 ? pickW([main, second]) : null;
    const rest = 1 - comp[0].p;
    if (third) { comp.push({ k: second, p: rest * 0.65 }, { k: third, p: rest * 0.35 }); }
    else comp.push({ k: second, p: rest });
  } else comp[0].p = 1;
  return comp;
}
export function pickOre(a: Asteroid): ItemId {
  let r = Math.random();
  for (const o of a.comp) { r -= o.p; if (r <= 0) return o.k; }
  return a.comp[0].k;
}
// Gemeinsame Welt: Meldungen an den Netzcode, wenn dieser Client nicht Gastgeber ist
export const astHooks = { gone: (_a: Asteroid, _how: 'mined' | 'break' | 'blast') => {}, yld: (_a: Asteroid) => {} };
const ORE_GEO = new THREE.OctahedronGeometry(1);
const SHARD_M = new THREE.MeshStandardMaterial({ color: 0xb070ff, emissive: 0x7030ff, emissiveIntensity: 1.1, metalness: 0.2, roughness: 0.15, flatShading: true });

function rockGeo(r: number) {
  const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, m = new Map<string, number>();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
    let s = m.get(k);
    if (s === undefined) { s = rand(0.7, 1.12); m.set(k, s); }
    p.setXYZ(i, x * s, y * s * 0.85, z * s);
  }
  g.computeVertexNormals();
  return g;
}

export function makeAst(x: number, y: number, z: number, r: number, kind: RockKind, field: Field | null = null, comp?: Ore[], yieldFrac = 1) {
  comp = comp || makeComp(kind, field, field ? field.rng.next : Math.random);
  const m = new THREE.Mesh(rockGeo(r), rockMat(kind, comp[0].k));
  boxUV(m, 1 / (r * 1.4));
  for (let i = 0; i < 5; i++) {
    const o = new THREE.Mesh(ORE_GEO, oreMat(comp[Math.min(comp.length - 1, i < 3 ? 0 : i - 2)].k));
    o.position.set(rand(-1, 1), rand(-1, 1) * 0.85, rand(-1, 1)).normalize().multiplyScalar(r * 0.82);
    o.scale.setScalar(r * (kind === 'crystal' ? 0.14 : 0.1));
    m.add(o);
  }
  if (kind === 'crystal') {
    // herausragende Kristallsplitter
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(ORE_GEO, SHARD_M), dir = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      s.position.copy(dir).multiplyScalar(r * 0.8);
      s.scale.set(r * 0.12, r * 0.45, r * 0.12);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      m.add(s);
    }
  }
  m.position.set(x, y, z);
  m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
  scene.add(m);
  const mx = yieldFor(r), yld = Math.max(1, Math.round(mx * yieldFrac));
  const a: Asteroid = { x, y, z, r, r0: r, kind, hp: r * 1.3, vx: rand(-3, 3), vy: rand(-1.5, 1.5), vz: rand(-3, 3), wx: rand(-0.3, 0.3), wy: rand(-0.3, 0.3), mesh: m, field, comp, yld, max: mx, scanT: 0 };
  world.asteroids.push(a);
  return a;
}
export function removeAst(i: number) {
  const a = world.asteroids[i];
  scene.remove(a.mesh);
  a.mesh.geometry.dispose();
  world.asteroids.splice(i, 1);
}
export function breakAst(i: number, drops = true) {
  const a = world.asteroids[i];
  const col = a.kind === 'ice' ? '#d8f0ff' : a.kind === 'crystal' ? '#c070ff' : '#d9822b';
  burst(a.x, a.y, a.z, col, 20 + a.r, a.r * 1.6, 1);
  burst(a.x, a.y, a.z, '#8a8f9a', 14, a.r, 1.3);
  snd(160, 0.18, 'triangle', 0.05, -100);
  removeAst(i);
  const nr = a.r0 > 36 ? 30 : a.r0 > 20 ? 16 : 0, frac = a.yld / a.max;
  // Mitspieler (nicht Gastgeber): Bruchstücke erzeugt der Gastgeber, die Beute bleibt hier
  if (SHARED.client) { astHooks.gone(a, 'break'); if (!nr) for (let j = 0; j < Math.max(1, Math.round(a.yld * 0.3)); j++) dropPick(a.x, a.y, a.z, pickOre(a), 1); return; }
  if (nr && frac > 0.3) for (let j = 0; j < 2; j++) {
    const c = makeAst(a.x + rand(-8, 8), a.y + rand(-8, 8), a.z + rand(-8, 8), nr, a.kind, a.field, a.comp, frac);
    c.vx = a.vx + rand(-30, 30); c.vy = a.vy + rand(-18, 18); c.vz = a.vz + rand(-30, 30);
    c.scanT = a.scanT;
  }
  const n = nr ? 1 : Math.max(1, Math.round(a.yld * 0.3));
  if (drops) for (let j = 0; j < n; j++) dropPick(a.x, a.y, a.z, pickOre(a), 1);
}

function fieldRock(f: Field, edge = false) {
  const R = f.rng, d = f.def;
  for (let t = 0; t < 20; t++) {
    const dir = new THREE.Vector3(R.range(-1, 1), R.range(-1, 1), R.range(-1, 1)).normalize();
    const dist = edge ? f.r * R.range(0.85, 1) : f.r * Math.cbrt(R.next());
    const x = f.x + dir.x * dist, y = f.y + dir.y * dist * 0.35, z = f.z + dir.z * dist;
    if (world.stations.some(s => d3(x, y, z, s.x, s.y, s.z) < s.R + 160)) continue;
    if (world.gates.some(g => d3(x, y, z, g.x, g.y, g.z) < 260)) continue;
    const roll = R.next(), kinds = rockKinds(d);
    const kind: RockKind = kinds.length === 1 ? kinds[0] : roll < (d.kind === 'mixed' ? 0.6 : 0.7) ? kinds[0] : kinds[1];
    return makeAst(x, y, z, R.pick([44, 44, 30, 30, 16]), kind, f);
  }
  return null;
}

// Treibende Asteroiden bleiben grob in ihrem Feld; abgebaute Felder wachsen langsam nach
export function updateAsteroids(dt: number) {
  for (const a of world.asteroids) {
    a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
    if (a.field) {
      const f = a.field, dx = a.x - f.x, dz = a.z - f.z, dist = Math.hypot(dx, dz);
      if (dist > f.r * 1.3) { a.vx -= dx / dist * 6 * dt; a.vz -= dz / dist * 6 * dt; }
      const k = Math.pow(0.97, dt); a.vx *= k; a.vy *= k; a.vz *= k;
    }
    a.mesh.position.set(a.x, a.y, a.z);
    a.mesh.rotation.x += a.wx * dt; a.mesh.rotation.y += a.wy * dt;
  }
  world.regrowT -= dt;
  if (world.regrowT <= 0 && !SHARED.client) {   // nachwachsen lässt nur der Gastgeber
    world.regrowT = 12;
    for (const f of world.fields) {
      const cnt = world.asteroids.filter(a => a.field === f).length;
      if (cnt < f.n * 0.75) fieldRock(f, true);
    }
  }
}

// ---------------- Beute ----------------
const PICK_GEO = new THREE.OctahedronGeometry(1.8), SCRAP_GEO = new THREE.TorusGeometry(1.4, 0.5, 6, 8);
const PICK_M = {} as Record<ItemId, THREE.Material>, PICK_G = {} as Record<ItemId, THREE.SpriteMaterial>;
for (const k of Object.keys(ITEMS) as ItemId[]) { PICK_M[k] = new THREE.MeshBasicMaterial({ color: ITEMS[k].c }); PICK_G[k] = glowMat(ITEMS[k].c, 0.7); }

export function dropPick(x: number, y: number, z: number, k: ItemId, amt: number, sp = 35) {
  const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(8, sp));
  const m = new THREE.Mesh(k === 'schrott' ? SCRAP_GEO : PICK_GEO, PICK_M[k]);
  const g = new THREE.Sprite(PICK_G[k]); g.scale.setScalar(9); m.add(g);
  m.position.set(x, y, z);
  scene.add(m);
  world.pickups.push({ x, y, z, vx: v.x, vy: v.y, vz: v.z, k, amt, life: 90, mesh: m });
}

// ---------------- Stationen & Tore ----------------
const Y = new THREE.Vector3(0, 1, 0);
export function addStation(sd: StationDef, yaw: number) {
  let model: any;
  if (sd.kind === 'carrier') {
    const c = buildCarrier();
    model = { g: c.g, lights: c.lights, navs: [], glows: c.glows, turrets: c.turrets, dock: CARRIER_DOCK, launch: CARRIER_LAUNCH, sph: carrierSpheres(), R: 250 };
    yaw = 0;
  } else {
    // KI-Modelle, falls geladen; sonst die eingebauten Grundformen
    const isBase = sd.id.endsWith('_base');
    model = (isBase ? buildModelStation('base', 170, { ground: 14, cell: 26, R: 130 })
      : sd.kind === 'station' ? buildModelStation('station', 380, { cell: 40, R: 230 })
      : buildModelStation('outpost', 210, { cell: 30, R: 130 }))
      || (sd.kind === 'station' ? buildStation() : buildOutpost());
  }
  model.g.position.set(...sd.pos);
  model.g.rotation.y = yaw;
  scene.add(model.g);
  const tf = (o: { x: number; y: number; z: number }) => {
    const v = new THREE.Vector3(o.x, o.y, o.z).applyAxisAngle(Y, yaw);
    return { x: sd.pos[0] + v.x, y: sd.pos[1] + v.y, z: sd.pos[2] + v.z };
  };
  const L = tf(model.launch);
  world.stations.push({
    def: sd, id: sd.id, kind: sd.kind, name: sd.name, x: sd.pos[0], y: sd.pos[1], z: sd.pos[2], yaw,
    mesh: model.g, model, dock: tf(model.dock), launch: { ...L, yaw: model.launch.yaw + yaw },
    sph: model.sph.map(([x, y, z, r]: number[]) => { const v = new THREE.Vector3(x, y, z).applyAxisAngle(Y, yaw); return [v.x, v.y, v.z, r]; }),
    R: model.R, flak: 0,
  });
}
function addGate(to: string) {
  const def = world.def!, p = gatePos(def.id, to), toDef = SECTOR[to];
  const m = buildGate(FACTION[toDef.faction].gate);
  m.g.position.set(...p);
  m.g.lookAt(0, p[1], 0);
  scene.add(m.g);
  const l = Math.hypot(p[0], p[2]) || 1;
  world.gates.push({ to, name: toDef.name, faction: toDef.faction, x: p[0], y: p[1], z: p[2], nx: -p[0] / l, nz: -p[2] / l, mesh: m.g, model: m });
}

// ---------------- Sektor laden / leeren ----------------
export function disposeTree(o: THREE.Object3D) { o.traverse((c: any) => { if (c.geometry) c.geometry.dispose(); }); }

export function clearSector() {
  for (const s of world.stations) { scene.remove(s.mesh); disposeTree(s.mesh); }
  for (const g of world.gates) { scene.remove(g.mesh); disposeTree(g.mesh); }
  for (const a of world.asteroids) { scene.remove(a.mesh); a.mesh.geometry.dispose(); }
  for (const t of world.traffic) { scene.remove(t.mesh); disposeTree(t.mesh); }
  for (const a of world.allies) scene.remove(a.mesh);
  for (const l of [world.enemies, world.bullets, world.ebullets, world.rockets, world.pickups]) for (const e of l) scene.remove(e.mesh);
  world.stations = []; world.gates = []; world.fields = []; world.asteroids = []; world.pickups = [];
  world.traffic = []; world.allies = []; world.enemies = []; world.bullets = []; world.ebullets = []; world.rockets = [];
  world.hiveT = [];
  for (const o of world.extras) { scene.remove(o); disposeTree(o); }
  world.extras = []; world.orbit = null; world.surface = null; world.ground = null;
  clearParticles();
  world.def = null;
}

export function buildSector(id: string) {
  clearSector();
  const def = SECTOR[id];
  world.def = def;
  const R = rng(hashStr(id));
  setSky({
    neb: def.neb, tint: def.tint, gain: def.sky?.gain,
    rot: (() => { const r: [number, number, number] = [R.range(-0.5, 0.5), R.range(0, 6.28), R.range(-0.4, 0.4)]; return def.sky?.rot || r; })(),
    sunDir: [R.range(-1, 1), R.range(0.2, 1), R.range(-1, 1)],
    planet: def.planet && { ...def.planet, ...planetLook(id) },
  });
  setAmbience({ id: def.id, neb: def.neb, faction: def.faction, fields: def.fields });
  for (const sd of def.stations) addStation(sd, R.range(0, Math.PI * 2));
  for (const to of def.links) addGate(to);
  for (const fd of def.fields) {
    const f: Field = { def: fd, x: fd.pos[0], y: fd.pos[1], z: fd.pos[2], r: fd.r, n: fd.n, rng: rng(hashStr(id + fd.pos.join(','))) };
    world.fields.push(f);
    for (let i = 0; i < fd.n; i++) fieldRock(f);
  }
  world.regrowT = 12;
}

export const stationById = (id: string) => world.stations.find(s => s.id === id) || null;
export const gateTo = (to: string) => world.gates.find(g => g.to === to) || null;
