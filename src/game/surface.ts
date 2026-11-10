import * as THREE from 'three';
import { scene, camera, view, ux, glowMat } from '../core/engine';
import { texMat, std, boxUV } from '../core/textures';
import { setSky, setSurfaceSky } from '../core/sky';
import { groundTexture } from '../core/planetVis';
import { setAmbience } from '../core/ambience';
import { keys, mouse } from '../core/input';
import { rng, hashStr, clamp, d3, rand, fmtN } from '../core/util';
import { snd, laserSound } from '../core/audio';
import { SECTOR, type StationDef } from '../data/galaxy';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { PLANETS, PTYPE, planetBaseId, type PlanetDef } from '../data/planets';
import { buildGate } from '../models/structures';
import { mesh, alongZ } from '../models/helpers';
import { world, clearSector, addStation, makeAst, removeAst, type Asteroid, type Ore } from './world';
import { P, G, stats, cargoUsed, settings } from './state';
import { SHIP, hurtPlayer } from './player';
import { burst, puff } from './fx';
import { radio } from '../ui/radio';

// =====================================================================================
// Planetenoberflächen: Gelände, Atmosphäre, Lagerstätten, Bodenstation und Bergbau-Rover.
// Die Oberfläche ersetzt beim Landen den Sektor (wie ein eigener kleiner Sektor).
// =====================================================================================
export const SURF = { size: 8000, limit: 3600, ceiling: 2700 };
export const planetOf = (sector: string): PlanetDef | null => PLANETS[sector] || null;

// ---------------- Rauschen (deterministisch) ----------------
function noise2(seed: number) {
  const h = (x: number, z: number) => { const s = Math.sin(x * 127.1 + z * 311.7 + seed * 0.731) * 43758.5453; return s - Math.floor(s); };
  const vn = (x: number, z: number) => {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
    return (a * (1 - sx) + b * sx) * (1 - sz) + (c * (1 - sx) + d * sx) * sz;
  };
  const fbm = (x: number, z: number, o = 6) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * vn(x * f, z * f); n += a; a *= 0.5; f *= 2.03; } return s / n; };
  const ridge = (x: number, z: number) => { let s = 0, a = 0.5, f = 1, n = 0; for (let i = 0; i < 5; i++) { const v = 1 - Math.abs(vn(x * f, z * f) * 2 - 1); s += a * v * v; n += a; a *= 0.5; f *= 2.1; } return s / n; };
  return { fbm, ridge };
}

// ---------------- Höhenfeld ----------------
const N = 257;
let HM = new Float32Array(N * N), liquidLevel = -1e9, plateau = 0;
function heightAt(x: number, z: number) {
  const half = SURF.size / 2, cell = SURF.size / (N - 1);
  const gx = clamp((x + half) / cell, 0, N - 1.001), gz = clamp((z + half) / cell, 0, N - 1.001);
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const a = HM[iz * N + ix], b = HM[iz * N + ix + 1], c = HM[(iz + 1) * N + ix], d = HM[(iz + 1) * N + ix + 1];
  return (a * (1 - fx) + b * fx) * (1 - fz) + (c * (1 - fx) + d * fx) * fz;
}
export const groundAt = (x: number, z: number) => Math.max(heightAt(x, z), liquidLevel);
export const terrainAt = heightAt;
export const liquidAt = (x: number, z: number) => heightAt(x, z) < liquidLevel;

// ---------------- Oberfläche aufbauen ----------------
let curType: ReturnType<typeof ptype> | null = null;
const ptype = (sector: string) => PTYPE[PLANETS[sector].type];
export const surfaceType = () => curType;

function compFrom(table: Partial<Record<ItemId, number>>, R: () => number): Ore[] {
  const e = Object.entries(table) as [ItemId, number][];
  const pick = (ex: ItemId[]) => { const c = e.filter(([k]) => !ex.includes(k)), t = c.reduce((a, [, w]) => a + w, 0); let r = R() * t; for (const [k, w] of c) { r -= w; if (r <= 0) return k; } return c[c.length - 1][0]; };
  const a = pick([]), comp: Ore[] = [{ k: a, p: 0.5 + R() * 0.3 }];
  if (R() < 0.75) { const b = pick([a]); comp.push({ k: b, p: 1 - comp[0].p }); } else comp[0].p = 1;
  return comp;
}

export function buildSurface(sector: string) {
  clearSector();
  const pd = PLANETS[sector], T = PTYPE[pd.type], sec = SECTOR[sector];
  curType = T;
  const R = rng(hashStr(sector + ':oberflaeche')), nz = noise2(hashStr(sector) % 1000);
  // Pseudo-Sektor: gleiche ID (für Preise/Zone), eigener Name und eigene Stationen
  const base: StationDef | null = pd.base ? { id: planetBaseId(sector), kind: 'outpost', name: pd.base, pos: [0, 0, 0], refinery: true, prices: { erden: 0.9, helium: 0.9 } } : null;
  world.def = { ...sec, name: pd.name, danger: pd.danger, stations: base ? [base] : [], fields: [], hives: 0, links: [] };
  // Höhen
  const half = SURF.size / 2, cell = SURF.size / (N - 1);
  const craters = Array.from({ length: T.craters }, () => ({ x: R.range(-3000, 3000), z: R.range(-3000, 3000), r: R.range(250, 700), d: R.range(80, 200) }));
  let mn = 1e9, mx = -1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -half + i * cell, z = -half + j * cell;
    let h = T.amp * (0.6 * nz.fbm(x / 1700, z / 1700) + 0.55 * Math.pow(nz.ridge(x / 950 + 3.1, z / 950 - 1.7), 1.6) - 0.42);
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1) h -= c.d * (1 - d * d);
      h += c.d * 0.45 * Math.exp(-Math.pow((d - 1) * 5, 2));
    }
    // zum Rand hin Gebirge (natürliche Grenze)
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (edge > SURF.limit - 200) h += Math.pow((edge - SURF.limit + 200) / 600, 2) * 260;
    HM[j * N + i] = h;
    mn = Math.min(mn, h); mx = Math.max(mx, h);
  }
  liquidLevel = T.liquid ? T.liquid.level : -1e9;
  // Plateau für die Bodenstation
  plateau = Math.max(heightAt(0, 0), liquidLevel + 35);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -half + i * cell, z = -half + j * cell, d = Math.hypot(x, z);
    if (d < 950) { const t = d < 520 ? 1 : 1 - (d - 520) / 430, s = t * t * (3 - 2 * t); HM[j * N + i] = HM[j * N + i] * (1 - s) + plateau * s; }
  }
  // Geländemodell
  const geo = new THREE.PlaneGeometry(SURF.size, SURF.size, N - 1, N - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), i = Math.round((x + half) / cell), j = Math.round((z + half) / cell);
    pos.setY(k, HM[j * N + i]);
  }
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal as THREE.BufferAttribute, col = new Float32Array(pos.count * 3), slp = new Float32Array(pos.count), uv = geo.attributes.uv as THREE.BufferAttribute;
  const c0 = new THREE.Color(T.ground[0]), c1 = new THREE.Color(T.ground[1]), c2 = new THREE.Color(T.ground[2]), c = new THREE.Color();
  const gTex = groundTexture(pd.type), lum = (q: THREE.Color) => q.r * 0.3 + q.g * 0.59 + q.b * 0.11, l1 = lum(c1);
  for (let k = 0; k < pos.count; k++) {
    const y = pos.getY(k), t = clamp((y - mn) / (mx - mn + 1), 0, 1);
    if (t < 0.5) c.copy(c0).lerp(c1, t * 2); else c.copy(c1).lerp(c2, (t - 0.5) * 2);
    const slope = 1 - nrm.getY(k);
    slp[k] = slope;
    const v = 0.9 + Math.random() * 0.12;
    if (gTex) {
      // Mit Bodentextur: Vertexfarbe nur als Helligkeits- und leichte Farbvariation (Täler dunkler, Gipfel heller)
      const f = clamp(lum(c) / l1, 0.6, 1.5) * v;
      col[k * 3] = (f * 0.7 + 0.3 * c.r / c1.r) * f; col[k * 3 + 1] = (f * 0.7 + 0.3 * c.g / c1.g) * f; col[k * 3 + 2] = (f * 0.7 + 0.3 * c.b / c1.b) * f;
    } else {
      c.lerp(c0.clone().multiplyScalar(0.6), clamp(slope * 2.2, 0, 0.7));
      col[k * 3] = c.r * v; col[k * 3 + 1] = c.g * v; col[k * 3 + 2] = c.b * v;
    }
    uv.setXY(k, pos.getX(k) / 28, pos.getZ(k) / 28);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('slope', new THREE.BufferAttribute(slp, 1));
  const tm = texMat(0xffffff, 'rock', { vertexColors: true, roughness: 0.95, metalness: 0.05, flatShading: false }, 1.4);
  tm.envMapIntensity = 0.25;
  if (gTex) groundShader(tm, gTex, c1);
  const terrain = new THREE.Mesh(geo, tm);
  scene.add(terrain);
  world.extras.push(terrain);
  if (T.liquid) {
    const L = T.liquid;
    const lm = L.glow ? new THREE.MeshBasicMaterial({ color: L.color }) : new THREE.MeshStandardMaterial({ color: L.color, roughness: 0.12, metalness: 0.6, transparent: true, opacity: 0.88 });
    const lq = new THREE.Mesh(new THREE.PlaneGeometry(SURF.size, SURF.size), lm);
    lq.rotation.x = -Math.PI / 2; lq.position.y = L.level;
    scene.add(lq); world.extras.push(lq);
    if (L.glow) { const gl2 = new THREE.PointLight(0xff6a20, 2.5, 900, 1.5); gl2.position.set(0, L.level + 80, 0); lq.add(gl2); }
  }
  // Himmel (gleiche Sonne wie im Orbit, aber etwas höher)
  const SR = rng(hashStr(sector));
  const rot: [number, number, number] = [SR.range(-0.5, 0.5), SR.range(0, 6.28), SR.range(-0.4, 0.4)];
  const sd: [number, number, number] = [SR.range(-1, 1), SR.range(0.2, 1), SR.range(-1, 1)];
  sd[1] = Math.max(0.45, sd[1]);
  setSky({ neb: sec.neb, tint: sec.tint, rot, sunDir: sd });
  setSurfaceSky({ horizon: T.sky[0], zenith: T.sky[1], fog: T.fog, fogDensity: T.fogDensity });
  setAmbience({ id: sector + ':oberflaeche', neb: sec.neb, faction: sec.faction, fields: [] }, 0);
  // Bodenstation
  if (base) { base.pos = [0, plateau + 14, 0]; addStation(base, R.range(0, Math.PI * 2)); }
  // Lagerstätten in Gruppen
  for (let g = 0; g < 6; g++) {
    let cx = 0, cz = 0;
    for (let t = 0; t < 30; t++) {
      const a = R.range(0, Math.PI * 2), d = R.range(1000, 3100);
      cx = Math.cos(a) * d; cz = Math.sin(a) * d;
      if (heightAt(cx, cz) > liquidLevel + 15) break;
    }
    const n = 9 + Math.floor(R.next() * 6);
    for (let i = 0; i < n; i++) {
      const x = cx + R.range(-220, 220), z = cz + R.range(-220, 220), h = heightAt(x, z);
      if (h < liquidLevel + 4) continue;
      const r = R.pick([9, 12, 12, 16]);
      const a = makeAst(x, h + r * 0.28, z, r, T.rock, null, compFrom(T.ore, R.next));
      a.vx = a.vy = a.vz = 0; a.wx = a.wy = 0;
      a.max = a.yld = r >= 16 ? 60 : r >= 12 ? 40 : 24;
    }
  }
  scatterRocks(pd.type, T, R);
  world.surface = { planet: sector, limit: SURF.limit };
  world.ground = groundAt;
  world.regrowT = 1e9;
  return { plateau, arrive: { x: -2300, y: plateau + 1300, z: 2300 } };
}

// Gelände-Shader: flache Stellen mit Bodentextur (zwei Maßstäbe gegen sichtbare Wiederholung), Steilhänge mit Fels
function groundShader(m: THREE.MeshStandardMaterial, g: THREE.Texture, cliff: THREE.Color) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.groundMap = { value: g };
    sh.uniforms.cliffCol = { value: cliff.clone() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float slope; varying float vSlope; varying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlope = slope; vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D groundMap; uniform vec3 cliffCol; varying float vSlope; varying vec3 vWPos;')
      .replace('#include <map_fragment>', `
        vec4 rockC = texture2D(map, vMapUv);
        vec3 g1 = texture2D(groundMap, vWPos.xz / 24.0).rgb, g2 = texture2D(groundMap, vWPos.xz / 110.0 + 0.37).rgb;
        vec3 gC = mix(g1, g2, 0.42);
        float sm = smoothstep(0.2, 0.4, vSlope);
        diffuseColor.rgb *= mix(gC, rockC.rgb * cliffCol * 2.4, sm);`);
  };
  m.customProgramCacheKey = () => 'ground';
}

// Streuobjekte: Hunderte kleine Felsen, Eisbrocken oder Kristalle (eine Instanz-Gruppe, kaum Kosten)
function scatterRocks(type: string, T: typeof PTYPE[keyof typeof PTYPE], R: ReturnType<typeof rng>) {
  const cry = type === 'kristall', ice = type === 'eis';
  const geo = cry ? new THREE.OctahedronGeometry(1, 0) : new THREE.DodecahedronGeometry(1, 0);
  if (cry) geo.scale(0.45, 1.6, 0.45);
  const mat = cry ? std(0x8a60d0, { emissive: 0x6a30c0, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.3 })
    : ice ? std(0xd8ecff, { roughness: 0.3, metalness: 0.05 })
    : texMat(new THREE.Color(T.ground[1]).multiplyScalar(1.5), 'rock', { roughness: 0.9, metalness: 0.1 }, 1.2);
  const n = 900, im = new THREE.InstancedMesh(geo, mat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  let k = 0;
  for (let i = 0; i < n * 3 && k < n; i++) {
    // in Haufen verteilt: Mittelpunkt + Streuung
    const x = R.range(-3400, 3400), z = R.range(-3400, 3400), h = heightAt(x, z);
    if (h < liquidLevel + 2 || Math.hypot(x, z) < 620) continue;
    const big = R.next() < 0.08, s = big ? R.range(5, 11) : R.range(0.8, 3.2);
    sc.set(s * R.range(0.8, 1.4), s * R.range(0.5, 1.0), s * R.range(0.8, 1.4));
    if (cry) sc.set(s * 0.8, s * R.range(0.9, 1.8), s * 0.8);
    e.set(cry ? R.range(-0.4, 0.4) : R.range(0, 6.28), R.range(0, 6.28), cry ? R.range(-0.4, 0.4) : R.range(0, 6.28));
    ps.set(x, h + (cry ? s * 0.5 : -s * 0.25), z);
    im.setMatrixAt(k++, m.compose(ps, q.setFromEuler(e), sc));
  }
  im.count = k;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  scene.add(im); world.extras.push(im);
}

// ---------------- Anflugzone im Orbit ----------------
export function addOrbitZone(sector: string) {
  const pd = PLANETS[sector], sec = SECTOR[sector];
  if (!pd || !sec.planet) return;
  const d = new THREE.Vector3(...sec.planet.dir).normalize(), h = new THREE.Vector3(d.x, 0, d.z).normalize();
  const x = h.x * 5000, z = h.z * 5000, y = clamp(d.y * 2200, -900, 900);
  const m = buildGate(0x7cc4ff);
  m.g.position.set(x, y, z);
  m.g.lookAt(0, y, 0);
  scene.add(m.g);
  world.extras.push(m.g);
  world.orbit = { x, y, z, name: pd.name, mesh: m.g };
  (m.g.userData as any).model = m;
}
export const orbitExit = () => {
  const o = world.orbit!, l = Math.hypot(o.x, o.z) || 1;
  return { x: o.x - (o.x / l) * 180, y: o.y, z: o.z - (o.z / l) * 180, yaw: Math.atan2(o.x / l, o.z / l) };
};

// ---------------- Fliegen über der Oberfläche ----------------
let liquidWarn = 0;
export function updateSurfaceFlight(dt: number) {
  if (!world.surface || !curType) return;
  liquidWarn -= dt;
  const L = curType.liquid;
  if (L && L.deadly && P.y < L.level + 10 && !G.dead) {
    hurtPlayer(40 * dt);
    if (liquidWarn <= 0) { radio('SYSTEM', `Achtung: ${L.n}! Sofort steigen!`); liquidWarn = 4; }
  }
}
export function landInfo() {
  if (!world.surface || G.dead) return null;
  const alt = P.y - heightAt(P.x, P.z), sp = Math.hypot(P.vx, P.vy, P.vz), r = stats().radius;
  if (alt > r + 70 || sp > 75) return null;
  if (liquidAt(P.x, P.z)) return { ok: false, text: 'Hier kann nicht gelandet werden' };
  // nicht zu steil
  const s = 10, dx = heightAt(P.x + s, P.z) - heightAt(P.x - s, P.z), dz = heightAt(P.x, P.z + s) - heightAt(P.x, P.z - s);
  if (Math.hypot(dx, dz) / (2 * s) > 0.6) return { ok: false, text: 'Gelände zu steil: flachere Stelle suchen' };
  return { ok: true, text: '[E] Landen und Rover aussetzen' };
}

// ---------------- Rover ----------------
export function buildRover() {
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const hull = texMat(0xd8c8a0, 'hull_mil', { roughness: 0.6 }, 0.8), dark = texMat(0x4a4e56, 'hull_mil', { roughness: 0.6, metalness: 0.6 });
  const mark = std(0xe09030, { emissive: 0x301800 }), glass = std(0x203040, { metalness: 0.9, roughness: 0.1, emissive: 0x0a1420, flatShading: false });
  body.add(mesh(new THREE.BoxGeometry(3.2, 1, 5.2), hull, 0, 1.2, 0));
  body.add(mesh(new THREE.BoxGeometry(2.6, 1.3, 2), hull, 0, 2.3, -0.6));
  body.add(mesh(new THREE.BoxGeometry(2.4, 0.8, 0.1), glass, 0, 2.4, -1.62));
  body.add(mesh(new THREE.BoxGeometry(3.3, 0.25, 5.3), mark, 0, 1.72, 0));
  body.add(mesh(new THREE.BoxGeometry(2.8, 1, 1.8), dark, 0, 2.1, 1.6));
  // Bohrarm
  const arm = new THREE.Group(); arm.position.set(0, 1.1, -2.6); body.add(arm);
  arm.add(mesh(new THREE.BoxGeometry(0.6, 0.6, 1.2), dark, 0, 0, -0.4));
  const drill = alongZ(mesh(new THREE.ConeGeometry(0.45, 1.6, 10), std(0xb0b4bc, { metalness: 0.9, roughness: 0.3 }), 0, 0, -1.6));
  drill.rotation.x = Math.PI / 2; arm.add(drill);
  // Räder
  const wheels: THREE.Mesh[] = [];
  for (const z of [-1.8, 0, 1.8]) for (const s of [-1, 1]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.55, 14), dark);
    w.rotation.z = Math.PI / 2; w.position.set(s * 1.85, 0.75, z); body.add(w); wheels.push(w);
  }
  // Lichter
  for (const s of [-1, 1]) { const l = new THREE.Sprite(glowMat(0xfff0d0, 0.9)); l.position.set(s * 1.1, 1.5, -2.65); l.scale.setScalar(1.6); body.add(l); }
  const beacon = new THREE.Sprite(glowMat(0xffa030, 1)); beacon.position.set(0, 3.1, -0.6); beacon.scale.setScalar(1.2); body.add(beacon);
  const head = new THREE.SpotLight(0xfff0d0, 0, 120, 0.55, 0.5, 1.2); head.position.set(0, 1.6, -2.6); head.target.position.set(0, 0, -30); body.add(head, head.target);
  boxUV(g, 1 / 3);
  return { g, body, wheels, drill, beacon, head };
}
type RoverModel = ReturnType<typeof buildRover>;
export const ROVER = {
  active: false, x: 0, y: 0, z: 0, yaw: 0, speed: 0, model: null as RoverModel | null,
  ship: { x: 0, y: 0, z: 0, yaw: 0 }, target: null as Asteroid | null, acc: 0, drilling: false, prompt: '',
  cap: 40, warn: 0,
};
export const roverLoad = () => ITEM_IDS.reduce((a, k) => a + (P.rover?.[k] || 0), 0);

export function landShip() {
  const li = landInfo();
  if (!li || !li.ok) { if (li) radio('SYSTEM', li.text + '.'); return false; }
  const r = stats().radius;
  ROVER.ship = { x: P.x, y: heightAt(P.x, P.z) + r * 0.55, z: P.z, yaw: P.yaw };
  P.vx = P.vy = P.vz = 0; P.pitch = 0;
  if (!P.rover) P.rover = {};
  const m = ROVER.model || buildRover();
  ROVER.model = m;
  scene.add(m.g);
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  ROVER.x = P.x + rx * (r + 7); ROVER.z = P.z + rz * (r + 7); ROVER.yaw = P.yaw; ROVER.speed = 0;
  ROVER.y = heightAt(ROVER.x, ROVER.z);
  ROVER.active = true;
  m.head.intensity = 0;
  burst(ROVER.x, ROVER.y + 1, ROVER.z, '#4a4238', 30, 14, 1.0);
  snd(180, 0.6, 'sawtooth', 0.04, -80);
  radio('SYSTEM', 'Gelandet. Rover ausgesetzt: WASD fahren, Klick halten zum Bohren, [E] am Schiff einsteigen.');
  return true;
}

// Roverladung in den Frachtraum umladen (beim Abheben und beim Betreten des Schiffs zu Fuß)
export function unloadRover() {
  const st = stats();
  let moved = 0, left = 0;
  for (const k of ITEM_IDS) {
    const n = P.rover?.[k] || 0;
    if (!n) continue;
    const m = Math.min(n, st.cargo - cargoUsed());
    P.cargo[k] += m; P.rover![k] = n - m; moved += m; left += n - m;
  }
  return { moved, left };
}
export function boardShip() {
  const { moved, left } = unloadRover();
  ROVER.active = false;
  laserSound(false);
  if (ROVER.model) scene.remove(ROVER.model.g);
  P.x = ROVER.ship.x; P.y = ROVER.ship.y + 14; P.z = ROVER.ship.z; P.yaw = ROVER.ship.yaw; P.pitch = 0;
  P.vx = P.vy = P.vz = 0;
  G.camInit = false;
  snd(300, 0.6, 'sawtooth', 0.05, 500);
  radio('SYSTEM', moved ? `${moved} Einheiten in den Frachtraum verladen.${left ? ` ${left} passen nicht mehr und bleiben im Rover.` : ''}` : 'Rover verstaut. Abheben mit [W].');
}

const _f = new THREE.Vector3();
export function updateRover(dt: number) {
  if (!ROVER.active || !ROVER.model) return;
  const m = ROVER.model, R = ROVER;
  R.warn -= dt;
  // Steuerung
  const th = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), steer = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  if (th > 0) R.speed += 16 * dt; else if (th < 0) R.speed -= (R.speed > 0 ? 26 : 10) * dt; else R.speed *= Math.pow(0.35, dt);
  R.speed = clamp(R.speed, -9, keys.ShiftLeft || keys.ShiftRight ? 36 : 26);
  R.yaw += steer * 1.25 * dt * clamp(Math.abs(R.speed) / 8, 0.25, 1) * Math.sign(R.speed || 1);
  const fx = -Math.sin(R.yaw), fz = -Math.cos(R.yaw);
  let nx = R.x + fx * R.speed * dt, nz = R.z + fz * R.speed * dt;
  // Steigung bremst, Wasser/Lava ist eine Grenze
  const climb = (heightAt(nx, nz) - heightAt(R.x, R.z)) / Math.max(0.01, Math.abs(R.speed * dt));
  if (climb > 0.75) { R.speed *= 0.85; nx = R.x; nz = R.z; }
  if (liquidAt(nx, nz)) {
    const L = curType?.liquid;
    if (R.warn <= 0) { radio('SYSTEM', L?.deadly ? 'Lava! Zu heiß für den Rover.' : `${L?.n || 'Wasser'}: Der Rover kann hier nicht weiter.`); R.warn = 3; }
    nx = R.x; nz = R.z; R.speed *= 0.3;
  }
  if (Math.abs(nx) > SURF.limit || Math.abs(nz) > SURF.limit) { nx = R.x; nz = R.z; R.speed = 0; }
  // Kollision mit Lagerstätten, Station, Schiff
  const obst: { x: number; z: number; r: number }[] = world.asteroids.map(a => ({ x: a.x, z: a.z, r: a.r * 0.85 + 1.6 }));
  for (const s of world.stations) obst.push({ x: s.x, z: s.z, r: 34 }, { x: s.dock.x, z: s.dock.z, r: 6 });
  obst.push({ x: R.ship.x, z: R.ship.z, r: stats().radius * 0.75 + 1.6 });
  for (const o of obst) { const d = Math.hypot(nx - o.x, nz - o.z); if (d < o.r) { nx = o.x + (nx - o.x) / d * o.r; nz = o.z + (nz - o.z) / d * o.r; R.speed *= 0.6; } }
  R.x = nx; R.z = nz;
  R.y = heightAt(R.x, R.z);
  // Lage am Gelände ausrichten
  const s = 2.2, hf = heightAt(R.x + fx * s, R.z + fz * s), hb = heightAt(R.x - fx * s, R.z - fz * s);
  const rx = Math.cos(R.yaw), rz = -Math.sin(R.yaw), hr = heightAt(R.x + rx * s, R.z + rz * s), hl = heightAt(R.x - rx * s, R.z - rz * s);
  m.g.position.set(R.x, R.y, R.z);
  m.g.rotation.order = 'YXZ';
  m.g.rotation.set(Math.atan2(hf - hb, 2 * s), R.yaw, Math.atan2(hl - hr, 2 * s));
  for (const w of m.wheels) w.rotation.x += R.speed * dt / 0.75;
  (m.beacon.material as THREE.SpriteMaterial).opacity = Math.sin(G.time * 6) > 0 ? 1 : 0.2;
  if (Math.abs(R.speed) > 4 && Math.random() < 0.25) puff(R.x - fx * 2.6 + rand(-1, 1), R.y + 0.4, R.z - fz * 2.6 + rand(-1, 1), rand(-2, 2), rand(1, 3), rand(-2, 2), '#3a342c', 1.0);
  // Bohren
  const dpx = R.x + fx * 4.2, dpz = R.z + fz * 4.2, dpy = R.y + 1.1;
  R.target = null;
  let bd = 1e9;
  for (const a of world.asteroids) { const d = d3(dpx, dpy, dpz, a.x, a.y, a.z) - a.r; if (d < 3.5 && d < bd) { bd = d; R.target = a; } }
  R.drilling = !!(mouse.down || keys.Space) && !!R.target && !G.dead;
  m.drill.rotation.y += (R.drilling ? 30 : 2) * dt;
  if (R.drilling && R.target) {
    const a = R.target;
    laserSound(true, 30);
    for (let i = 0; i < 2; i++) puff(dpx, dpy, dpz, rand(-6, 6), rand(1, 8), rand(-6, 6), Math.random() < 0.5 ? '#ffd27a' : ITEMS[a.comp[0].k].c, 0.5);
    R.acc += 2.4 * dt;
    while (R.acc >= 1 && a.yld > 0) {
      R.acc -= 1;
      if (roverLoad() >= R.cap) { if (R.warn <= 0) { radio('SYSTEM', 'Rover voll! Zum Schiff fahren und mit [E] verladen.'); R.warn = 5; } R.acc = 0; break; }
      let r = Math.random(), k = a.comp[0].k;
      for (const o of a.comp) { r -= o.p; if (r <= 0) { k = o.k; break; } }
      P.rover![k] = (P.rover![k] || 0) + 1;
      P.mined++;
      a.yld--;
      snd(900 + Math.random() * 200, 0.05, 'sine', 0.02, 300);
      const f = Math.max(0, a.yld / a.max), sc = 0.45 + 0.55 * Math.cbrt(f);
      a.mesh.scale.setScalar(sc); a.r = a.r0 * sc;
      if (a.yld <= 0) {
        burst(a.x, a.y, a.z, ITEMS[a.comp[0].k].c, 40, a.r0, 1.1);
        removeAst(world.asteroids.indexOf(a));
        R.target = null;
        break;
      }
    }
  } else laserSound(false);
  // Hinweise
  const dShip = Math.hypot(R.x - R.ship.x, R.z - R.ship.z);
  R.prompt = dShip < stats().radius + 12 ? `[E] ${settings.walk ? `An Bord der ${P.shipName} gehen` : `In die ${P.shipName} einsteigen`}${roverLoad() ? ` und ${roverLoad()} E verladen` : ''}` : R.target ? (roverLoad() >= R.cap ? 'Rover voll' : 'Klick halten: bohren') : '';
}
export const nearShip = () => ROVER.active && Math.hypot(ROVER.x - ROVER.ship.x, ROVER.z - ROVER.ship.z) < stats().radius + 12;

// Gelandetes Schiff an seinem Platz halten
export function syncLandedShip() {
  SHIP.g.position.set(ROVER.ship.x, ROVER.ship.y, ROVER.ship.z);
  SHIP.g.rotation.set(0, ROVER.ship.yaw, 0);
  SHIP.g.visible = true;
  for (const g2 of SHIP.glows) g2.scale.setScalar(0.6 * (g2.userData.base || 1));
}

// Verfolgerkamera hinter dem Rover
const _cam = new THREE.Vector3(), _look = new THREE.Vector3();
let camInit = false;
export function roverCamera(dt: number) {
  const R = ROVER, fx = -Math.sin(R.yaw), fz = -Math.cos(R.yaw);
  const want = new THREE.Vector3(R.x - fx * 13, 0, R.z - fz * 13);
  want.y = Math.max(R.y + 5.5, heightAt(want.x, want.z) + 2.5);
  if (!camInit) { _cam.copy(want); camInit = true; }
  _cam.lerp(want, 1 - Math.exp(-dt * 5));
  camera.position.copy(_cam);
  _look.set(R.x + fx * 8, R.y + 2, R.z + fz * 8);
  camera.lookAt(_look);
  if (Math.abs(camera.fov - 70) > 0.05) { camera.fov = 70; camera.updateProjectionMatrix(); }
}
export function resetRoverCamera() { camInit = false; }

// ---------------- Anzeige für den Rover ----------------
const _p = new THREE.Vector3();
export function drawRoverHUD() {
  if (!ROVER.active || G.mode !== 'rover') return;
  const W = view.W, H = view.H, R = ROVER;
  ux.save();
  // Lagerstätten in der Nähe
  ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left';
  for (const a of world.asteroids) {
    const d = Math.hypot(a.x - R.x, a.z - R.z);
    if (d > 260) continue;
    _p.set(a.x, a.y + a.r * 0.6, a.z).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1 || Math.abs(_p.y) > 1) continue;
    const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H, m = a.comp[0];
    ux.globalAlpha = clamp(1.4 - d / 220, 0.3, 1);
    ux.fillStyle = ITEMS[m.k].c;
    ux.fillText(`◆ ${ITEMS[m.k].n} ${Math.round(m.p * 100)}%${a.comp[1] ? ' + ' + ITEMS[a.comp[1].k].short : ''} · ${a.yld} E`, x + 6, y);
  }
  ux.globalAlpha = 1;
  // Richtung zum Schiff
  _p.set(R.ship.x, R.ship.y + 10, R.ship.z).project(camera);
  const dShip = Math.hypot(R.x - R.ship.x, R.z - R.ship.z);
  ux.textAlign = 'center';
  if (_p.z < 1 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1) {
    const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H;
    ux.fillStyle = '#5fd0ff'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillText(`${P.shipName.toUpperCase()} · ${Math.round(dShip)} m`, x, y);
  } else {
    const ang = Math.atan2(R.ship.x - R.x, R.ship.z - R.z) - Math.atan2(-Math.sin(R.yaw), -Math.cos(R.yaw));
    ux.save(); ux.translate(W / 2, 70); ux.rotate(-ang); ux.fillStyle = '#5fd0ff';
    ux.beginPath(); ux.moveTo(0, -14); ux.lineTo(8, 6); ux.lineTo(-8, 6); ux.closePath(); ux.fill(); ux.restore();
    ux.fillStyle = '#5fd0ff'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(`${P.shipName} · ${Math.round(dShip)} m`, W / 2, 96);
  }
  // Rover-Panel unten rechts
  const k = clamp(Math.min(W / 1250, H / 780), 0.62, 1) * settings.hud, w = 300, h = 150;
  ux.translate(W - 14 - w * k, H - 14 - h * k); ux.scale(k, k);
  ux.fillStyle = 'rgba(10,12,14,.86)'; ux.strokeStyle = '#1e3a4a'; ux.lineWidth = 1; ux.beginPath(); ux.rect(0, 0, w, h); ux.fill(); ux.stroke();
  ux.strokeStyle = '#e09030'; ux.lineWidth = 2; ux.beginPath(); ux.moveTo(0, 1); ux.lineTo(100, 1); ux.stroke();
  ux.textAlign = 'left'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#e09030'; ux.fillText('BERGBAU-ROVER', 14, 20);
  ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#e4eef5'; ux.fillText(`${Math.abs(Math.round(R.speed * 3.6))} km/h`, w - 14, 20);
  const load = roverLoad();
  ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.fillText('LADUNG', 14, 46);
  ux.textAlign = 'right'; ux.fillStyle = load >= R.cap ? '#ff6b5b' : '#e4eef5'; ux.fillText(`${load}/${R.cap}`, w - 14, 46);
  ux.fillStyle = '#0e1e28'; ux.fillRect(14, 52, w - 28, 6);
  let fx2 = 14;
  for (const it of ITEM_IDS) { const n = P.rover?.[it] || 0; if (!n) continue; const ww = (w - 28) * n / R.cap; ux.fillStyle = ITEMS[it].c; ux.fillRect(fx2, 52, ww, 6); fx2 += ww; }
  ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0';
  const items = ITEM_IDS.filter(it => P.rover?.[it]).map(it => `${ITEMS[it].short} ${P.rover![it]}`).join(' · ');
  ux.fillText(items || 'leer', 14, 76);
  ux.fillStyle = R.drilling ? '#ffd27a' : R.target ? '#e4eef5' : '#4a5c6a';
  ux.fillText(R.drilling ? '● BOHRT' : R.target ? '○ Lagerstätte erreicht' : '○ keine Lagerstätte vor dem Bohrer', 14, 98);
  ux.fillStyle = '#8aa0b0'; ux.fillText(`Schiff: ${Math.round(dShip)} m · Fracht ${cargoUsed()}/${stats().cargo}`, 14, 120);
  
  ux.restore();
  // Hinweis
  if (R.prompt) {
    ux.save(); ux.font = '600 14px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
    const tw = ux.measureText(R.prompt).width + 30, y = H * 0.66;
    ux.fillStyle = 'rgba(6,16,26,.88)'; ux.strokeStyle = '#e09030'; ux.lineWidth = 1;
    ux.beginPath(); ux.rect(W / 2 - tw / 2, y - 20, tw, 32); ux.fill(); ux.stroke();
    ux.fillStyle = '#e09030'; ux.fillText(R.prompt, W / 2, y + 1);
    ux.restore();
  }
}
export function hideRover() { if (ROVER.model) scene.remove(ROVER.model.g); ROVER.active = false; }
