import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scene, camera, ambient, rim, sun, view, ux, gl } from '../core/engine';
import { keys, mouse, releaseAll } from '../core/input';
import { clamp, rng, hashStr } from '../core/util';
import { snd, sfx } from '../core/audio';
import { texMat, std } from '../core/textures';
import { P, G, settings, saveGame } from './state';
import { world } from './world';
import { burst, clearParticles, particleSize } from './fx';
import { GEAR_IDS, RARITY, gearDef } from '../data/gear';
import { addItem, canAdd, gearStat, gearFactor } from './inventory';
import { SECTOR } from '../data/galaxy';
import { PLANETS, PTYPE } from '../data/planets';

// =====================================================================================
// Dungeons auf Planeten: verlassene Minen als Labyrinth.
//  - Eingänge stehen fest auf der Oberfläche (je Sektor aus einem Zufallswert), man erreicht sie mit dem Rover.
//  - Das Innere ist ein Kachelraster (0 Fels, 1 Boden, 2 Tor): Irrgarten mit Schleifen, unregelmäßigen Kavernen, einem Schalter,
//    einem verschlossenen Tresorraum mit Wächterkern und der großen Kiste. Wände, Boden und Decke sind ein verformtes Felsnetz.
//  - Zu Fuß in der Ego-Ansicht (Modus 'dungeon'): Laufen mit Kachelkollision, Schießen mit der angelegten Waffe, Lebenspunkte,
//    Wächterdrohnen, Kisten mit Beute, Karte, die sich beim Erkunden aufdeckt.
// Der Dungeon liegt weit unter der Welt (y = -60000), damit von der Oberfläche nichts ins Bild ragt.
// =====================================================================================
const TS = 3.2, EYE = 1.62, BASE = new THREE.Vector3(0, -60000, 0);
type Vec2 = [number, number];
interface Entrance { id: string; x: number; y: number; z: number; yaw: number; size: number; name: string }
interface Crate { tx: number; tz: number; g: THREE.Group; lid: THREE.Object3D; open: boolean; big: boolean; idx: number; a: number; med?: boolean }
interface Foe { x: number; z: number; y: number; hp: number; max: number; g: THREE.Group; eye: THREE.MeshBasicMaterial; boss: boolean; cool: number; aim: number; alert: boolean; tx: number; tz: number; ph: number; hit: number }
interface Bolt { m: THREE.Mesh; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; dmg: number }

export const DUN = {
  active: false, e: null as Entrance | null,
  W: 0, H: 0, t: new Uint8Array(0), ceil: new Float32Array(0), seen: new Uint8Array(0), dist: new Int16Array(0),
  x: 0, z: 0, yaw: 0, pitch: 0, bob: 0, walked: 0, vx: 0, vz: 0, locked: false,
  hp: 100, maxHp: 100, hurt: 0, dead: 0, cool: 0, kick: 0, flash: 0,
  crates: [] as Crate[], foes: [] as Foe[], bolts: [] as Bolt[],
  door: null as null | { tx: number; tz: number; open: boolean; k: number; g: THREE.Group; ax: boolean },
  sw: null as null | { tx: number; tz: number; on: boolean; scr: THREE.MeshBasicMaterial },
  exit: [1, 1] as Vec2, prompt: '', act: null as null | (() => void),
  msg: [] as { t: string; c: string; life: number }[], danger: 1, kills: 0, left: 0,
};
let ENTR: Entrance[] = [];
let group: THREE.Group | null = null, lamps: THREE.Vector3[] = [], pool: THREE.PointLight[] = [], head: THREE.SpotLight | null = null, gun: THREE.Group | null = null;
let tracer: THREE.Line | null = null, tracerT = 0, lampT = 0, pathT = 0, stepT = 0, grabT = 0;
const saved = { amb: 0, sun: 0, rim: 0, fogC: 0, fogD: 0, near: 0.5, far: 30000 };
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

// ---------- Raster ----------
const I = (x: number, z: number) => z * DUN.W + x;
const inb = (x: number, z: number) => x >= 0 && z >= 0 && x < DUN.W && z < DUN.H;
const tile = (x: number, z: number) => (inb(x, z) ? DUN.t[I(x, z)] : 0);
const solidT = (x: number, z: number) => { const v = tile(x, z); return v === 0 || (v === 2 && !(DUN.door && DUN.door.open && DUN.door.k > 0.9)); };
const solidAt = (wx: number, wz: number) => solidT(Math.round(wx / TS), Math.round(wz / TS));
const free = (wx: number, wz: number, r = 0.42) => !solidAt(wx - r, wz - r) && !solidAt(wx + r, wz - r) && !solidAt(wx - r, wz + r) && !solidAt(wx + r, wz + r);
// freie Sicht zwischen zwei Punkten (Schritte von 0,4 m)
function los(ax: number, az: number, bx: number, bz: number) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.4);
  for (let i = 1; i < n; i++) if (solidAt(ax + (bx - ax) * i / n, az + (bz - az) * i / n)) return false;
  return true;
}
// Abstand jeder Kachel zum Spieler in Schritten (Wegfindung der Wächter)
function flood(sx: number, sz: number, out: Int16Array, door = false) {
  out.fill(-1); const q = [I(sx, sz)]; out[q[0]] = 0;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], x = c % DUN.W, z = (c - x) / DUN.W;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Vec2[]) {
      const nx = x + dx, nz = z + dz; if (!inb(nx, nz)) continue;
      const v = DUN.t[I(nx, nz)]; if (v === 0 || (v === 2 && !door && !(DUN.door && DUN.door.open))) continue;
      if (out[I(nx, nz)] < 0) { out[I(nx, nz)] = out[c] + 1; q.push(I(nx, nz)); }
    }
  }
}

// ---------- Erzeugung: Irrgarten, Schleifen, Kavernen, Tresor ----------
interface Plan { start: Vec2; vault: Vec2; door: Vec2; doorAx: boolean; sw: Vec2; crates: Vec2[]; foes: Vec2[]; lampsAt: Vec2[] }
function generate(seed: number, n: number): Plan {
  const R = rng(seed), W = 2 * n + 1, H = 2 * n + 1;
  DUN.W = W; DUN.H = H; DUN.t = new Uint8Array(W * H); DUN.ceil = new Float32Array(W * H).fill(3.0); DUN.seen = new Uint8Array(W * H); DUN.dist = new Int16Array(W * H);
  const t = DUN.t, vis = new Uint8Array(n * n), prot = new Uint8Array(W * H);
  // Tresor: 2 × 2 Zellen in der Ecke, die dem Eingang gegenüberliegt; der Irrgarten läuft darum herum
  const vcx = n - 2 - Math.floor(R.next() * 2), vcz = n - 2 - Math.floor(R.next() * Math.max(1, n - 4));
  for (let cz = vcz; cz < vcz + 2; cz++) for (let cx = vcx; cx < vcx + 2; cx++) vis[cz * n + cx] = 1;
  for (let z = 2 * vcz + 1; z <= 2 * vcz + 3; z++) for (let x = 2 * vcx + 1; x <= 2 * vcx + 3; x++) { t[z * W + x] = 1; DUN.ceil[z * W + x] = 4.4; }
  for (let z = 2 * vcz; z <= 2 * vcz + 4; z++) for (let x = 2 * vcx; x <= 2 * vcx + 4; x++) prot[z * W + x] = 1;
  // Irrgarten: Tiefensuche mit Hang zum Geradeauslaufen (lange, gewundene Gänge)
  const st: number[] = [0]; vis[0] = 1; t[1 * W + 1] = 1; let last = -1;
  while (st.length) {
    const c = st[st.length - 1], cx = c % n, cz = (c - cx) / n, opt: number[] = [];
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dz], k) => { const nx = cx + dx, nz = cz + dz; if (nx >= 0 && nz >= 0 && nx < n && nz < n && !vis[nz * n + nx]) opt.push(k); });
    if (!opt.length) { st.pop(); last = -1; continue; }
    const k = opt.includes(last) && R.next() < 0.45 ? last : opt[Math.floor(R.next() * opt.length)]; last = k;
    const [dx, dz] = [[1, 0], [-1, 0], [0, 1], [0, -1]][k], nx = cx + dx, nz = cz + dz;
    vis[nz * n + nx] = 1; t[(2 * cz + 1 + dz) * W + 2 * cx + 1 + dx] = 1; t[(2 * nz + 1) * W + 2 * nx + 1] = 1; st.push(nz * n + nx);
  }
  // Sackgassen merken (vor den Schleifen), dann einige Wände öffnen: Rundwege statt eines einzigen Wegs
  const deg = (x: number, z: number) => (t[z * W + x + 1] ? 1 : 0) + (t[z * W + x - 1] ? 1 : 0) + (t[(z + 1) * W + x] ? 1 : 0) + (t[(z - 1) * W + x] ? 1 : 0);
  const dead: Vec2[] = [];
  for (let cz = 0; cz < n; cz++) for (let cx = 0; cx < n; cx++) { const x = 2 * cx + 1, z = 2 * cz + 1; if (!prot[z * W + x] && deg(x, z) === 1 && !(cx === 0 && cz === 0)) dead.push([x, z]); }
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) {
    if (t[z * W + x] || prot[z * W + x] || (x % 2 === 1) === (z % 2 === 1)) continue;
    const hz = x % 2 === 0;   // Wand zwischen linker und rechter Zelle?
    if ((hz ? t[z * W + x - 1] && t[z * W + x + 1] : t[(z - 1) * W + x] && t[(z + 1) * W + x]) && R.next() < 0.07) t[z * W + x] = 1;
  }
  // Kavernen: unregelmäßige Hohlräume mit höherer Decke, manchmal mit Pfeiler in der Mitte
  const caves: Vec2[] = [];
  for (let k = 0; k < 30 && caves.length < 2 + Math.floor(n / 3); k++) {
    const cx = 3 + 2 * Math.floor(R.next() * (n - 3)), cz = 3 + 2 * Math.floor(R.next() * (n - 3)), rad = 1.3 + R.next() * 1.3, ph = R.next() * 6.28;
    let ok = true;
    for (let z = cz - 3; z <= cz + 3 && ok; z++) for (let x = cx - 3; x <= cx + 3; x++) if (inb(x, z) && prot[z * W + x]) { ok = false; break; }
    if (!ok || (cx < 5 && cz < 5)) continue;
    for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) {
      if (x < 1 || z < 1 || x > W - 2 || z > H - 2) continue;
      const a = Math.atan2(z - cz, x - cx), d = Math.hypot(x - cx, z - cz);
      if (d < rad * (0.8 + 0.3 * Math.sin(a * 3 + ph))) { t[z * W + x] = 1; DUN.ceil[z * W + x] = 4.2 + R.next() * 0.8; }
    }
    if (rad > 2.1) { t[cz * W + cx] = 0; }
    caves.push([cx + (rad > 2.1 ? 1 : 0), cz]);
  }
  // Tor zum Tresor: eine Wandkachel am Rand, hinter der ein Gang liegt
  const cand: [number, number, boolean][] = [];
  for (let k = 0; k < 3; k++) {
    cand.push([2 * vcx, 2 * vcz + 1 + k, true], [2 * vcx + 4, 2 * vcz + 1 + k, true], [2 * vcx + 1 + k, 2 * vcz, false], [2 * vcx + 1 + k, 2 * vcz + 4, false]);
  }
  const okD = cand.filter(([x, z, ax]) => { const ox = ax ? (x === 2 * vcx ? x - 1 : x + 1) : x, oz = ax ? z : (z === 2 * vcz ? z - 1 : z + 1); return inb(ox, oz) && t[oz * W + ox] === 1; });
  const dsel = okD.length ? okD[Math.floor(R.next() * okD.length)] : cand[0];
  if (!okD.length) { const [x, z, ax] = dsel; const ox = ax ? x - 1 : x, oz = ax ? z : z - 1; if (inb(ox, oz)) t[oz * W + ox] = 1; }
  t[dsel[1] * W + dsel[0]] = 2;
  const door: Vec2 = [dsel[0], dsel[1]];
  // Schalter: Sackgasse, die am weitesten vom Tor entfernt liegt; Kisten in den übrigen Sackgassen und Kavernen
  const dD = new Int16Array(W * H), dS = new Int16Array(W * H);
  flood(door[0], door[1], dD, true); flood(1, 1, dS, true);
  dead.sort((a, b) => dD[b[1] * W + b[0]] - dD[a[1] * W + a[0]]);
  const sw: Vec2 = dead.length ? dead[0] : [1, 3];
  const crates: Vec2[] = dead.slice(1).filter(([x, z]) => dS[z * W + x] > 5).slice(0, 4 + Math.floor(n / 2));
  for (const c of caves) if (t[c[1] * W + c[0]] === 1 && crates.length < 9) crates.push(c);
  // Wächter: auf Gängen und in Kavernen, nicht in der Nähe des Eingangs
  const foes: Vec2[] = [], floor: Vec2[] = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (t[z * W + x] === 1 && !prot[z * W + x] && dS[z * W + x] > 7) floor.push([x, z]);
  const want = Math.min(floor.length, 3 + Math.floor(n / 2) + DUN.danger);
  for (let k = 0; k < want * 6 && foes.length < want; k++) {
    const f = floor[Math.floor(R.next() * floor.length)];
    if (foes.every(g => Math.abs(g[0] - f[0]) + Math.abs(g[1] - f[1]) > 4)) foes.push(f);
  }
  // Lampen: an jeder dritten Gangkachel und in den Kavernen
  const lampsAt: Vec2[] = [];
  for (let z = 1; z < H - 1; z++) for (let x = 1; x < W - 1; x++) if (t[z * W + x] === 1 && (x * 7 + z * 13) % 5 === 0) lampsAt.push([x, z]);
  return { start: [1, 1], vault: [2 * vcx + 2, 2 * vcz + 2], door, doorAx: dsel[2], sw, crates, foes, lampsAt };
}

// ---------- Felsnetz ----------
function hash3(x: number, y: number, z: number, s: number) { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + s * 19.19) * 43758.5453; return h - Math.floor(h); }
function noise3(x: number, y: number, z: number, s: number) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a: number, b: number, k: number) => a + (b - a) * k;
  return L(L(L(hash3(xi, yi, zi, s), hash3(xi + 1, yi, zi, s), u), L(hash3(xi, yi + 1, zi, s), hash3(xi + 1, yi + 1, zi, s), u), v),
    L(L(hash3(xi, yi, zi + 1, s), hash3(xi + 1, yi, zi + 1, s), u), L(hash3(xi, yi + 1, zi + 1, s), hash3(xi + 1, yi + 1, zi + 1, s), u), v), w);
}
function buildRock(seed: number, tint: THREE.Color) {
  const pos: number[] = [], col: number[] = [], uv: number[] = [], SUB = 4, W = DUN.W, H = DUN.H;
  // Nähe zum Fels (1 an der Wand, 0 ab gut einem Meter Abstand): wölbt die Decke und hebt den Boden an den Wänden an.
  // Sie hängt nur vom Ort ab, deshalb schließen Boden, Wände und Decke dicht aneinander.
  const edge = (x: number, z: number) => {
    const fx = x / TS, fz = z / TS, cx = Math.round(fx), cz = Math.round(fz); let d = 9;
    for (let tz = cz - 1; tz <= cz + 1; tz++) for (let tx = cx - 1; tx <= cx + 1; tx++) {
      if (tile(tx, tz) !== 0) continue;
      const dx = Math.max(0, Math.abs(fx - tx) - 0.5), dz = Math.max(0, Math.abs(fz - tz) - 0.5); d = Math.min(d, Math.hypot(dx, dz) * TS);
    }
    const k = clamp(1 - d / 1.25, 0, 1); return k * k * (3 - 2 * k);
  };
  const put = (x: number, y: number, z: number, shade: number, u: number, v: number) => {
    const k = clamp(y / 1.0, 0.3, 1), a = 0.42 * k;
    const dx = (noise3(x * 0.9, y * 0.9, z * 0.9, seed) - 0.5) * 2 * a, dz = (noise3(x * 0.9 + 31, y * 0.9 + 7, z * 0.9 + 13, seed) - 0.5) * 2 * a;
    const dy = (noise3(x * 0.7 + 5, y * 0.7 + 19, z * 0.7 + 3, seed) - 0.5) * (y < 0.4 ? 0.16 : 0.7);
    const n = 0.75 + 0.5 * noise3(x * 0.3, y * 0.3, z * 0.3, seed + 3);
    pos.push(x + dx, y + dy, z + dz); col.push(tint.r * shade * n, tint.g * shade * n, tint.b * shade * n); uv.push(u, v);
  };
  const quad = (pf: (a: number, b: number) => [number, number, number, number, number, number]) => {
    for (let j = 0; j < SUB; j++) for (let i = 0; i < SUB; i++) {
      const c = [pf(i / SUB, j / SUB), pf((i + 1) / SUB, j / SUB), pf((i + 1) / SUB, (j + 1) / SUB), pf(i / SUB, (j + 1) / SUB)];
      for (const k of [0, 1, 2, 0, 2, 3]) put(c[k][0], c[k][1], c[k][2], c[k][3], c[k][4], c[k][5]);
    }
  };
  const FL = 0.18, CL = 0.85;      // Anhebung des Bodens und Absenkung der Decke an der Wand
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    if (!DUN.t[z * W + x]) continue;
    const x0 = (x - 0.5) * TS, z0 = (z - 0.5) * TS, h = DUN.ceil[z * W + x];
    quad((a, b) => { const px = x0 + a * TS, pz = z0 + (1 - b) * TS, e = edge(px, pz); return [px, FL * e, pz, 0.9 - 0.3 * e, px / 2.6, pz / 2.6]; });                 // Boden
    quad((a, b) => { const px = x0 + a * TS, pz = z0 + b * TS, e = edge(px, pz); return [px, h - CL * e, pz, 0.5 - 0.15 * e, px / 2.6, pz / 2.6]; });                    // Decke
    // Wände zu Felskacheln; zu Nachbarn mit niedrigerer Decke entsteht ein Sturz
    const sides: [number, number, (a: number) => [number, number]][] = [
      [x + 1, z, a => [x0 + TS, z0 + a * TS]], [x - 1, z, a => [x0, z0 + (1 - a) * TS]], [x, z + 1, a => [x0 + (1 - a) * TS, z0 + TS]], [x, z - 1, a => [x0 + a * TS, z0]]];
    for (const [nx, nz, f] of sides) {
      const nt = tile(nx, nz), nh = nt ? DUN.ceil[nz * W + nx] : 0;
      if (nt && nh >= h) continue;
      quad((a, b) => {
        const [px, pz] = f(a), e = edge(px, pz), lo = nt ? nh - CL * e : FL * e, hi = h - CL * e, y = lo + (hi - lo) * b;
        return [px, y, pz, 0.55 + 0.45 * Math.sin(Math.PI * clamp(b, 0.1, 0.9)), (px + pz) / 2.6, y / 2.6];
      });
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  const m = texMat(0xffffff, 'rock', { roughness: 0.96, metalness: 0.02, vertexColors: true, side: THREE.DoubleSide }, 1.2);
  const mesh = new THREE.Mesh(g, m); mesh.userData.sh = false; mesh.frustumCulled = false;
  return mesh;
}

// ---------- Einbauten ----------
const M = {
  steel: null as THREE.Material | null, dark: null as THREE.Material | null, lamp: null as THREE.Material | null, ore: null as THREE.Material | null,
};
function mats(ore: number) {
  M.steel = texMat(0x6a6259, 'hangar_metal', { roughness: 0.82, metalness: 0.25, flatShading: false }, 1); M.dark = texMat(0x2a2b2e, 'hangar_metal', { roughness: 0.8, metalness: 0.3, flatShading: false }, 1);
  M.lamp = new THREE.MeshBasicMaterial({ color: 0xffd9a0 }); M.ore = std(ore, { roughness: 0.3, metalness: 0.1, emissive: ore, emissiveIntensity: 0.22 });   // Erz als Kristall, kein Leuchtwürfel
}
function uvBox(g: THREE.BufferGeometry, sx: number, sy: number, sz: number, per = 1.6) {
  const uv = g.attributes.uv as THREE.BufferAttribute, dims: Vec2[] = [[sz, sy], [sz, sy], [sx, sz], [sx, sz], [sx, sy], [sx, sy]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / per, uv.getY(i) * dims[f][1] / per); }
  return g;
}
function boxG(list: THREE.BufferGeometry[], sx: number, sy: number, sz: number, x: number, y: number, z: number, ry = 0, rx = 0) {
  const g = uvBox(new THREE.BoxGeometry(sx, sy, sz), sx, sy, sz); g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, 0)), new THREE.Vector3(1, 1, 1)));
  list.push(g);
}
function merged(list: THREE.BufferGeometry[], m: THREE.Material) {
  if (!list.length) return null;
  const mesh = new THREE.Mesh(mergeGeometries(list, false)!, m); mesh.userData.sh = false; mesh.frustumCulled = false;
  for (const g of list) g.dispose();
  return mesh;
}
function buildProps(plan: Plan, R: ReturnType<typeof rng>) {
  const st: THREE.BufferGeometry[] = [], dk: THREE.BufferGeometry[] = [], lm: THREE.BufferGeometry[] = [], or: THREE.BufferGeometry[] = [];
  lamps = [];
  for (let z = 1; z < DUN.H - 1; z++) for (let x = 1; x < DUN.W - 1; x++) {
    if (DUN.t[I(x, z)] !== 1) continue;
    const e = tile(x + 1, z) > 0, w = tile(x - 1, z) > 0, s = tile(x, z + 1) > 0, n = tile(x, z - 1) > 0, h = DUN.ceil[I(x, z)], wx = x * TS, wz = z * TS;
    const alongX = e && w && !s && !n, alongZ = s && n && !e && !w;
    if ((alongX || alongZ) && h < 3.5) {
      // Ausbau: zwei Stützen und ein Träger quer zum Gang, an der Decke ein Rohr und ein Kabelkanal längs
      const ry = alongX ? 0 : Math.PI / 2, o = (a: number, b: number): [number, number] => (alongX ? [wx + a, wz + b] : [wx + b, wz + a]);
      if ((x + z) % 2 === 0) {
        for (const sd of [-1, 1]) { const [px, pz] = o(0, sd * (TS / 2 - 0.22)); boxG(st, 0.2, h - 0.75, 0.2, px, (h - 0.75) / 2 + 0.1, pz); boxG(dk, 0.32, 0.12, 0.32, px, 0.2, pz); }
        boxG(st, 0.24, 0.24, TS - 0.3, wx, h - 0.72, wz, alongX ? 0 : Math.PI / 2);
      }
      { const [px, pz] = o(0, TS / 2 - 0.5); boxG(dk, TS, 0.11, 0.11, px, h - 0.95, pz, ry); const [qx, qz] = o(0, -(TS / 2 - 0.5)); boxG(st, TS, 0.05, 0.16, qx, h - 0.9, qz, ry); }
    }
    // Erzadern: kleine leuchtende Splitter an Wänden
    if (R.next() < 0.22) {
      const dirs: Vec2[] = []; if (!e) dirs.push([1, 0]); if (!w) dirs.push([-1, 0]); if (!s) dirs.push([0, 1]); if (!n) dirs.push([0, -1]);
      if (dirs.length) { const d = dirs[Math.floor(R.next() * dirs.length)]; for (let k = 0; k < 3 + Math.floor(R.next() * 4); k++) boxG(or, 0.05 + R.next() * 0.08, 0.05 + R.next() * 0.1, 0.05 + R.next() * 0.08, wx + d[0] * (TS / 2 - 0.2) + (d[0] ? 0 : R.range(-1, 1)), 0.5 + R.next() * (h - 1), wz + d[1] * (TS / 2 - 0.2) + (d[1] ? 0 : R.range(-1, 1)), R.next() * 3, R.next() * 3); }
    }
  }
  for (const [x, z] of plan.lampsAt) {
    const h = DUN.ceil[I(x, z)], wx = x * TS, wz = z * TS;
    boxG(dk, 0.34, 0.08, 0.18, wx, h - 0.5, wz); boxG(lm, 0.28, 0.05, 0.12, wx, h - 0.56, wz); boxG(st, 0.03, 0.5, 0.03, wx, h - 0.25, wz);
    lamps.push(new THREE.Vector3(wx, h - 0.9, wz));
  }
  for (const [list, m] of [[st, M.steel], [dk, M.dark], [lm, M.lamp], [or, M.ore]] as [THREE.BufferGeometry[], THREE.Material][]) { const o = merged(list, m); if (o) group!.add(o); }
}
const TIERC = ['#aab4c0', '#5fd0ff', '#c070ff', '#ffb347'];
function buildCrate(tx: number, tz: number, big: boolean, idx: number, a: number, med = false): Crate {
  const g = new THREE.Group(), s = big ? 1.5 : 1, col = med ? 0x3ad06a : big ? 0xffb347 : 0x5fd0ff;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.5 * s, 0.6 * s), texMat(med ? 0x5a7460 : big ? 0x6a5a44 : 0x55606a, 'hangar_metal', { roughness: 0.7, metalness: 0.4, flatShading: false }, 1)); body.position.y = 0.25 * s; g.add(body);
  const lid = new THREE.Group(); lid.position.set(0, 0.5 * s, -0.3 * s);
  const lm = new THREE.Mesh(new THREE.BoxGeometry(0.94 * s, 0.12 * s, 0.64 * s), texMat(0x6a6f76, 'hangar_metal', { roughness: 0.65, metalness: 0.45, flatShading: false }, 1)); lm.position.set(0, 0.06 * s, 0.3 * s); lid.add(lm);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.5 * s, 0.05 * s, 0.02), new THREE.MeshBasicMaterial({ color: col })); strip.position.set(0, 0.32 * s, 0.305 * s); g.add(strip);
  for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.56 * s, 0.66 * s), std(0x191b1f, { roughness: 0.7, metalness: 0.6 })); b.position.set(0.4 * s * sx, 0.27 * s, 0); g.add(b); }
  g.add(lid); g.position.set(tx * TS, 0, tz * TS); g.rotation.y = a; group!.add(g);
  g.traverse((o: any) => { o.userData.sh = false; });
  return { tx, tz, g, lid, open: false, big, idx, a, med };
}
function buildFoe(tx: number, tz: number, boss: boolean): Foe {
  const g = new THREE.Group(), s = boss ? 1.9 : 1, eye = new THREE.MeshBasicMaterial({ color: 0xff3020 });
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36 * s, 1), std(boss ? 0x2a2030 : 0x23262b, { roughness: 0.45, metalness: 0.85, flatShading: true })); g.add(shell);
  const e = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 12, 8), eye); e.position.z = 0.3 * s; g.add(e);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46 * s, 0.035 * s, 6, 20), std(0x555b64, { roughness: 0.4, metalness: 0.9 })); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let k = 0; k < 3; k++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.05 * s, 0.3 * s, 0.22 * s), std(0x191b1f, { roughness: 0.6, metalness: 0.7 })); const a = k * 2.094; f.position.set(Math.cos(a) * 0.44 * s, -0.12 * s, Math.sin(a) * 0.44 * s); f.rotation.y = -a; g.add(f); }
  g.traverse((o: any) => { o.userData.sh = false; });
  group!.add(g);
  const hp = (boss ? 260 : 34) * (1 + 0.3 * (DUN.danger - 1));
  return { x: tx * TS, z: tz * TS, y: boss ? 1.9 : 1.5, hp, max: hp, g, eye, boss, cool: 1 + Math.random() * 2, aim: 0, alert: false, tx: tx * TS, tz: tz * TS, ph: Math.random() * 6, hit: 0 };
}

// ---------- Waffe des Piloten ----------
const WEAP: Record<string, { iv: number; n: number; spread: number; auto: boolean; col: string; snd: number }> = {
  waffe_pistole: { iv: 0.3, n: 1, spread: 0.008, auto: false, col: '#ffd9a0', snd: 1.5 }, waffe_karabiner: { iv: 0.13, n: 1, spread: 0.018, auto: true, col: '#ffd9a0', snd: 1.25 },
  waffe_flinte: { iv: 0.85, n: 7, spread: 0.075, auto: false, col: '#ffc080', snd: 0.8 }, waffe_impuls: { iv: 0.2, n: 1, spread: 0.006, auto: true, col: '#b090ff', snd: 1.9 },
  waffe_splitter: { iv: 0.24, n: 2, spread: 0.03, auto: true, col: '#c070ff', snd: 2.2 },
};
const weapon = () => {
  const id = P.gear?.waffe || '', d = gearDef(id), w = WEAP[id];
  return w && d ? { ...w, dmg: (d.st?.schaden || 6) / (w.n > 1 ? w.n * 0.45 : 1), name: d.n } : { iv: 0.42, n: 1, spread: 0.012, auto: false, col: '#ffb060', snd: 2.6, dmg: 5, name: 'Schneidbrenner' };
};
function buildGun() {
  const g = new THREE.Group(), c1 = new THREE.MeshBasicMaterial({ color: 0x1b1d21 }), c2 = new THREE.MeshBasicMaterial({ color: 0x2c3036 }), c3 = new THREE.MeshBasicMaterial({ color: 0x0e0f11 }), c4 = new THREE.MeshBasicMaterial({ color: 0x4a4f57 });
  const long = !!P.gear?.waffe && P.gear.waffe !== 'waffe_pistole', L = long ? 0.42 : 0.2;
  const add = (m: THREE.Material, geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.x = rx; g.add(o); return o; };
  add(c2, new THREE.BoxGeometry(0.036, 0.05, L), 0, 0, -L / 2);                                   // Gehäuse
  add(c1, new THREE.BoxGeometry(0.04, 0.022, L * 0.9), 0, -0.034, -L / 2);                         // Unterteil
  add(c3, new THREE.BoxGeometry(0.03, 0.11, 0.045), 0, -0.085, 0.0, 0.28);                         // Griff
  add(c3, new THREE.CylinderGeometry(0.011, 0.011, long ? 0.22 : 0.07, 10), 0, 0.008, -L - (long ? 0.1 : 0.03), Math.PI / 2);   // Lauf
  add(c4, new THREE.CylinderGeometry(0.015, 0.015, 0.04, 10), 0, 0.008, -L - (long ? 0.2 : 0.065), Math.PI / 2);              // Mündung
  for (let i = 0; i < (long ? 7 : 3); i++) add(c3, new THREE.BoxGeometry(0.03, 0.008, 0.016), 0, 0.03, -0.04 - i * 0.045);     // Schiene
  add(c1, new THREE.BoxGeometry(0.012, 0.022, 0.012), 0, 0.045, -L + 0.02); add(c1, new THREE.BoxGeometry(0.024, 0.02, 0.012), 0, 0.044, -0.03);
  if (long) { add(c3, new THREE.BoxGeometry(0.028, 0.12, 0.05), 0, -0.1, -0.17, -0.12); add(c1, new THREE.BoxGeometry(0.034, 0.035, 0.16), 0, -0.012, 0.09); add(c4, new THREE.BoxGeometry(0.038, 0.008, 0.1), 0, -0.006, -0.3); }
  g.traverse((o: any) => { o.userData.sh = false; o.frustumCulled = false; });
  return g;
}

// ---------- Eingänge auf der Oberfläche ----------
export function buildDungeonEntrances(sector: string, heightAt: (x: number, z: number) => number, liquidLevel: number) {
  ENTR = [];
  const pl = PLANETS[sector]; if (!pl) return;
  const R = rng(hashStr(sector + ':minen'));
  const names = ['Alte Sohle', 'Schacht Tiefe Ader', 'Stollen Nordwand', 'Grube Stillstand', 'Schacht Dreizehn', 'Verlassener Vortrieb'];
  for (let k = 0, tries = 0; k < 3 && tries < 200; tries++) {
    const a = R.next() * 6.283, d = 700 + R.next() * 1900, x = Math.cos(a) * d, z = Math.sin(a) * d, h = heightAt(x, z);
    if (h < liquidLevel + 3 || Math.abs(heightAt(x + 8, z) - h) + Math.abs(heightAt(x, z + 8) - h) > 5) continue;
    if (ENTR.some(e => Math.hypot(e.x - x, e.z - z) < 500)) continue;
    const yaw = Math.atan2(-x, -z);
    ENTR.push({ id: sector + ':' + k, x, y: h, z, yaw, size: 7 + k * 2, name: names[Math.floor(R.next() * names.length)] });
    // Stolleneingang: Betonrahmen mit Tor, Warnstreifen, Lampe und Mast
    const g = new THREE.Group(), con = texMat(0x8a8c8e, 'hangar_wall', { roughness: 0.92, metalness: 0.05, flatShading: false }, 1), dk = texMat(0x3a3c40, 'hangar_metal', { roughness: 0.75, metalness: 0.4, flatShading: false }, 1), amb = std(0xb8862c, { roughness: 0.7, metalness: 0.2 });
    const add = (m: THREE.Material, sx: number, sy: number, sz: number, px: number, py: number, pz: number, rx = 0) => { const o = new THREE.Mesh(uvBox(new THREE.BoxGeometry(sx, sy, sz), sx, sy, sz, 3.2), m); o.position.set(px, py, pz); o.rotation.x = rx; g.add(o); return o; };
    add(con, 1.6, 6.5, 5, -4.2, 2.6, -1); add(con, 1.6, 6.5, 5, 4.2, 2.6, -1); add(con, 10, 1.6, 5.6, 0, 6.4, -1); add(con, 10, 7, 1.2, 0, 2.8, -3.6); add(con, 11, 0.5, 9, 0, -0.15, 1.5);
    add(dk, 6.8, 5.4, 0.4, 0, 2.7, -2.6); add(amb, 6.8, 0.22, 0.42, 0, 5.52, -2.58); add(amb, 0.22, 5.4, 0.42, -3.3, 2.7, -2.58); add(amb, 0.22, 5.4, 0.42, 3.3, 2.7, -2.58);
    add(dk, 0.3, 9, 0.3, 6.2, 4.5, 2); add(new THREE.MeshBasicMaterial({ color: 0xff5030 }), 0.5, 0.5, 0.5, 6.2, 9.2, 2);
    for (let i = 0; i < 5; i++) add(i % 2 ? dk : amb, 1.9, 0.5, 0.2, -3.8 + i * 1.9, 7.5, 1.72);
    g.position.set(x, h, z); g.rotation.y = yaw;
    scene.add(g); world.extras.push(g);
    k++;
  }
}
// Eingang in Reichweite des Rovers (für die Taste E)
export function nearEntrance(px: number, pz: number): Entrance | null {
  for (const e of ENTR) if (Math.hypot(e.x - px, e.z - pz) < 18) return e;
  return null;
}
export const dungeonEntrances = () => ENTR;

// ---------- Beute ----------
function lootId(R: () => number, big: boolean): string {
  // Stufe nach Gefahr des Sektors; die große Kiste liegt eine Stufe höher. Legendäres nur in der großen Kiste und selten.
  const r = R(), dg = DUN.danger;
  let tier = r < 0.5 - dg * 0.06 ? 0 : r < 0.86 - dg * 0.05 ? 1 : 2;
  if (big) tier = Math.min(3, tier + 1 + (R() < 0.08 + dg * 0.03 ? 1 : 0));
  tier = Math.min(tier, big ? 3 : 2);
  const poolIds = GEAR_IDS.filter(id => { const d = gearDef(id)!; return d.rar === tier && !['sw_lanze', 'sy_orakel', 'waffe_splitter', 'helm_kristall'].includes(id); });
  return poolIds[Math.floor(R() * poolIds.length)] || 'fund_datenkern';
}
function say(t: string, c = '#dfe8f0') { DUN.msg.unshift({ t, c, life: 6 }); if (DUN.msg.length > 5) DUN.msg.pop(); }
function openCrate(c: Crate) {
  const st = P.dungeons![DUN.e!.id];
  if (c.med) { DUN.hp = Math.min(DUN.maxHp, DUN.hp + 45); say('Verbandskasten: +45 Leben', '#3ad06a'); }
  else {
    const R = rng(hashStr(DUN.e!.id + ':' + c.idx + ':' + st.t)), id = lootId(R.next, c.big), d = gearDef(id)!;
    if (!canAdd(id)) { say('Rucksack voll. Die Kiste bleibt zu.', '#ff6b5b'); snd(180, 0.2, 'square', 0.04, -60); return; }
    const cr = Math.round((c.big ? 600 : 60) * (1 + DUN.danger * 0.6) * (0.7 + R.next() * 0.6));
    addItem(id, 1); P.credits += cr; P.earned += cr;
    say(`${d.n} (${RARITY[d.rar].n})`, TIERC[d.rar]); say(`+${cr} Credits`, '#ffb347');
    if (c.big) { const f = R.next() < 0.5 ? 'fund_relikt' : 'fund_datenkern'; if (addItem(f, 1)) say(gearDef(f)!.n, TIERC[gearDef(f)!.rar]); }
  }
  c.open = true; st.open.push(c.idx);
  sfx('pickup', 0.7, 1, () => snd(700, 0.2, 'triangle', 0.05, 300)); saveGame();
}

// ---------- Betreten und Verlassen ----------
export function enterDungeon(e: Entrance) {
  const pl = PLANETS[P.sector], T = pl ? PTYPE[pl.type] : null;
  DUN.danger = (SECTOR[P.sector] && SECTOR[P.sector].danger) || 1;
  P.dungeons = P.dungeons || {};
  let st = P.dungeons[e.id];
  if (!st || Date.now() - st.t > 20 * 60000) st = P.dungeons[e.id] = { t: Date.now(), open: [], sw: false };
  DUN.e = e;
  const seed = hashStr(e.id + ':plan'), plan = generate(seed, e.size), R = rng(seed + 7);
  group = new THREE.Group(); group.position.copy(BASE); scene.add(group);
  const tint = new THREE.Color(T ? T.ground[1] : 0x8a8270).lerp(new THREE.Color(0x777777), 0.45).multiplyScalar(1.5);
  group.add(buildRock(seed % 1000, tint));
  const ORE: Record<string, number> = { fels: 0x40c0ff, wueste: 0xffb040, eis: 0x9fe8ff, vulkan: 0xff6030, asche: 0xb070ff, kristall: 0xd080ff };
  mats(ORE[pl?.type || 'fels'] || 0x40c0ff);
  buildProps(plan, R);
  // Kisten (schon geöffnete bleiben offen), dazu ein Verbandskasten auf halbem Weg
  DUN.crates = plan.crates.map((c, i) => buildCrate(c[0], c[1], false, i, R.next() * 6.28, i === 1));
  DUN.crates.push(buildCrate(plan.vault[0], plan.vault[1] + 1, true, 99, Math.PI));
  for (const c of DUN.crates) if (st.open.includes(c.idx)) { c.open = true; c.lid.rotation.x = -1.9; }
  // Tor und Schalter
  {
    const g = new THREE.Group(), fr = std(0x4a4f57, { roughness: 0.5, metalness: 0.85 }), dk = std(0x23262b, { roughness: 0.6, metalness: 0.7 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(TS - 0.3, 2.9, 0.3), dk); slab.position.y = 1.45; slab.name = 'blatt'; g.add(slab);
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.2, 0.5), fr); p.position.set(sx * (TS / 2 - 0.1), 1.6, 0); g.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(TS, 0.3, 0.5), fr); top.position.y = 3.05; g.add(top);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(TS - 0.6, 0.12, 0.34), new THREE.MeshBasicMaterial({ color: 0xff3020 })); bar.position.y = 1.5; bar.name = 'riegel'; g.add(bar);
    g.position.set(plan.door[0] * TS, 0, plan.door[1] * TS); g.rotation.y = plan.doorAx ? Math.PI / 2 : 0; g.traverse((o: any) => { o.userData.sh = false; }); group.add(g);
    DUN.door = { tx: plan.door[0], tz: plan.door[1], open: !!st.sw, k: st.sw ? 1 : 0, g, ax: plan.doorAx };
    const scr = new THREE.MeshBasicMaterial({ color: st.sw ? 0x3ad06a : 0xff3020 }), sg = new THREE.Group();
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.4), dk); box.position.y = 0.55; sg.add(box);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.05), scr); pane.position.set(0, 0.9, 0.2); pane.rotation.x = -0.4; sg.add(pane);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.08), fr); lever.position.set(0.2, 1.2, 0.1); lever.rotation.x = st.sw ? 0.7 : -0.7; lever.name = 'hebel'; sg.add(lever);
    sg.position.set(plan.sw[0] * TS, 0, plan.sw[1] * TS); sg.traverse((o: any) => { o.userData.sh = false; }); group.add(sg);
    DUN.sw = { tx: plan.sw[0], tz: plan.sw[1], on: !!st.sw, scr };
    (DUN.sw as any).g = sg;
  }
  // Förderkorb am Eingang
  {
    const g = new THREE.Group(), fr = std(0x4a4f57, { roughness: 0.5, metalness: 0.85 });
    const pl2 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.12, 20), fr); pl2.position.y = 0.06; g.add(pl2);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.05, 6, 24), new THREE.MeshBasicMaterial({ color: 0x3ad06a })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.14; g.add(ring);
    for (let k = 0; k < 4; k++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.8, 0.08), fr); p.position.set(Math.cos(k * 1.571 + 0.78) * 1.0, 1.4, Math.sin(k * 1.571 + 0.78) * 1.0); g.add(p); }
    g.position.set(plan.start[0] * TS, 0, plan.start[1] * TS); g.traverse((o: any) => { o.userData.sh = false; }); group.add(g);
    DUN.exit = plan.start;
  }
  // Wächter und der Wächterkern im Tresor
  DUN.foes = plan.foes.map(f => buildFoe(f[0], f[1], false));
  if (!st.open.includes(99)) DUN.foes.push(buildFoe(plan.vault[0], plan.vault[1], true));
  DUN.bolts = [];
  // Licht: Welt aus, Stirnlampe und ein kleiner Vorrat an Lampenlichtern, die den nächsten Lampen folgen
  saved.amb = ambient.intensity; saved.sun = sun.intensity; saved.rim = rim.intensity; saved.near = camera.near; saved.far = camera.far;
  const fog = scene.fog as THREE.FogExp2 | null;
  if (fog) { saved.fogC = fog.color.getHex(); saved.fogD = fog.density; fog.color.set(0x030405); fog.density = 0.028; }
  pool = [];
  for (let k = 0; k < 5; k++) { const l = new THREE.PointLight(0xffc890, 0, 13, 1.6); group.add(l); pool.push(l); }
  head = new THREE.SpotLight(0xdfe8ff, 16, 36, 0.66, 0.6, 1.0); scene.add(head); scene.add(head.target);
  gun = buildGun(); scene.add(gun);
  tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.9 })); tracer.frustumCulled = false; tracer.visible = false; scene.add(tracer);
  camera.near = 0.06; camera.far = 260; camera.updateProjectionMatrix();
  // Spieler
  DUN.x = plan.start[0] * TS; DUN.z = plan.start[1] * TS + 0.2; DUN.yaw = Math.PI; DUN.pitch = 0; DUN.vx = DUN.vz = 0;
  DUN.maxHp = 100 + gearStat('schutz') * 2; DUN.hp = DUN.maxHp; DUN.dead = 0; DUN.hurt = 0; DUN.kills = 0; DUN.msg = [];
  // dorthin blicken, wo der Gang weitergeht
  for (const [dx, dz, a] of [[1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [0, -1, 0]] as [number, number, number][]) if (tile(1 + dx, 1 + dz)) { DUN.yaw = a; break; }
  DUN.active = true; G.mode = 'dungeon'; releaseAll(); clearParticles(); particleSize(0.3);
  document.getElementById('hud')?.classList.add('hidden');
  say(`${e.name}: ${DUN.foes.length} Wächter gemeldet. Finde den Schalter, dann das Tor.`, '#ffb347');
  sfx('door_open', 0.6, 0.8, () => snd(160, 0.5, 'sawtooth', 0.05, -60));
  reveal();
}
export function leaveDungeon(died = false) {
  if (!DUN.active) return;
  if (group) { scene.remove(group); group.traverse((o: any) => { if (o.geometry) o.geometry.dispose(); }); group = null; }
  if (head) { scene.remove(head); scene.remove(head.target); head.dispose(); head = null; }
  if (gun) { scene.remove(gun); gun = null; }
  if (tracer) { scene.remove(tracer); tracer.geometry.dispose(); tracer = null; }
  for (const b of DUN.bolts) scene.remove(b.m);
  DUN.bolts = []; DUN.foes = []; DUN.crates = []; pool = [];
  ambient.intensity = saved.amb; sun.intensity = saved.sun; rim.intensity = saved.rim;
  const fog = scene.fog as THREE.FogExp2 | null; if (fog) { fog.color.setHex(saved.fogC); fog.density = saved.fogD; }
  camera.near = saved.near; camera.far = saved.far; camera.updateProjectionMatrix();
  DUN.active = false; G.mode = 'rover'; releaseAll(); clearParticles(); particleSize();
  if (document.pointerLockElement === gl) document.exitPointerLock();
  document.getElementById('hud')?.classList.remove('hidden');
  if (died) DUN.left = 6;
  saveGame();
}

// ---------- Ablauf je Bild ----------
function reveal() {
  const cx = Math.round(DUN.x / TS), cz = Math.round(DUN.z / TS);
  for (let z = cz - 3; z <= cz + 3; z++) for (let x = cx - 3; x <= cx + 3; x++) {
    if (!inb(x, z) || DUN.seen[I(x, z)]) continue;
    if (Math.abs(x - cx) + Math.abs(z - cz) <= 1 || los(DUN.x, DUN.z, x * TS, z * TS) || (tile(x, z) === 0 && (los(DUN.x, DUN.z, (x + Math.sign(cx - x) * 0.6) * TS, (z + Math.sign(cz - z) * 0.6) * TS)))) DUN.seen[I(x, z)] = 1;
  }
}
function hurtPlayer(d: number) {
  if (DUN.dead) return;
  const dmg = d * 100 / (100 + gearStat('schutz') * 3);
  DUN.hp -= dmg; DUN.hurt = 1; sfx('hull_hit' + Math.floor(Math.random() * 3), 0.5, 1.2, () => snd(120, 0.15, 'sawtooth', 0.06, -40));
  if (DUN.hp <= 0) { DUN.hp = 0; DUN.dead = 2.2; say('Du bist zusammengebrochen. Der Förderkorb bringt dich nach oben.', '#ff6b5b'); }
}
function shoot() {
  const w = weapon();
  DUN.cool = w.iv; DUN.kick = 1; DUN.flash = 0.06;
  sfx('gun', 0.32, w.snd, () => snd(900, 0.06, 'square', 0.04, -500));
  const cp = camera.getWorldPosition(_v).clone();
  let end: THREE.Vector3 | null = null;
  for (let s = 0; s < w.n; s++) {
    _e.set(DUN.pitch + (Math.random() - 0.5) * 2 * w.spread, DUN.yaw + (Math.random() - 0.5) * 2 * w.spread, 0);
    const d = new THREE.Vector3(0, 0, -1).applyEuler(_e);
    // Wand: in kleinen Schritten vorwärts, bis Fels, Boden oder Decke erreicht ist
    let tw = 60;
    for (let t = 0.3; t < 60; t += 0.25) {
      const lx = DUN.x + d.x * t, ly = EYE + d.y * t, lz = DUN.z + d.z * t;
      if (ly < 0 || ly > 5.4 || solidAt(lx, lz)) { tw = t; break; }
    }
    // Wächter: Kugeltest entlang des Strahls
    let best: Foe | null = null, bt = tw;
    for (const f of DUN.foes) {
      const ox = f.x - DUN.x, oy = f.y - EYE, oz = f.z - DUN.z, t = ox * d.x + oy * d.y + oz * d.z;
      if (t < 0 || t > bt) continue;
      const r = (f.boss ? 0.8 : 0.48), px = ox - d.x * t, py = oy - d.y * t, pz = oz - d.z * t;
      if (px * px + py * py + pz * pz < r * r) { bt = t; best = f; }
    }
    const hp = cp.clone().addScaledVector(d, bt); end = hp;
    if (best) { best.hp -= w.dmg; best.hit = 0.12; best.alert = true; burst(hp.x, hp.y, hp.z, '#ffb060', 6, 2.2, 0.25); G.hitMark = 0.12; }
    else burst(hp.x, hp.y, hp.z, w.col, 3, 2, 0.2);
  }
  if (tracer && end && gun) {
    const a = gun.localToWorld(_w.set(0, 0.008, -0.6)).clone();
    (tracer.geometry as THREE.BufferGeometry).setFromPoints([a, end]); tracer.visible = true; tracerT = 0.05;
    (tracer.material as THREE.LineBasicMaterial).color.set(w.col);
  }
}
export function dungeonKey(code: string) {
  if (!DUN.active || DUN.dead) return;
  if (code === 'KeyE' && DUN.act) DUN.act();
}
export function updateDungeon(dt: number) {
  if (!DUN.active || !group) return;
  DUN.locked = document.pointerLockElement === gl;
  if (!DUN.locked && (grabT -= dt) <= 0) { grabT = 0.4; const ua = (navigator as any).userActivation; if (!ua || ua.isActive) { try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* bleibt bei Zeigersteuerung */ } } }
  if (DUN.dead > 0) { DUN.dead -= dt; DUN.pitch += (-1.2 - DUN.pitch) * dt * 2; if (DUN.dead <= 0) leaveDungeon(true); return; }
  if (!DUN.locked) {
    const mx = clamp((mouse.x - view.W / 2) / (view.W / 2), -1, 1), my = clamp((mouse.y - view.H / 2) / (view.H / 2), -1, 1), dz = 0.14, sh = (v: number) => Math.sign(v) * Math.max(0, Math.abs(v) - dz) / (1 - dz);
    DUN.yaw -= sh(mx) * 2.4 * settings.sens * dt; DUN.pitch += (-sh(my) * 1.0 * (settings.invertY ? -1 : 1) - DUN.pitch) * Math.min(1, dt * 5);
  }
  // Laufen
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const run = !!(keys.ShiftLeft || keys.ShiftRight), sp = f || s ? (run ? 6.4 : 4.2) * gearFactor('tempo') / Math.hypot(f, s) : 0, sy = Math.sin(DUN.yaw), cy = Math.cos(DUN.yaw), k = Math.min(1, dt * (f || s ? 10 : 13));
  DUN.vx += ((-sy * f + cy * s) * sp - DUN.vx) * k; DUN.vz += ((-cy * f - sy * s) * sp - DUN.vz) * k;
  const dx = DUN.vx * dt, dzz = DUN.vz * dt, ox = DUN.x, oz = DUN.z;
  if (free(DUN.x + dx, DUN.z + dzz)) { DUN.x += dx; DUN.z += dzz; } else if (free(DUN.x + dx, DUN.z)) { DUN.x += dx; DUN.vz = 0; } else if (free(DUN.x, DUN.z + dzz)) { DUN.z += dzz; DUN.vx = 0; } else DUN.vx = DUN.vz = 0;
  const moved = Math.hypot(DUN.x - ox, DUN.z - oz), v = dt > 0 ? moved / dt : 0;
  DUN.walked += moved; stepT -= moved;
  if (stepT <= 0 && moved > 0) { stepT = v > 5 ? 2.1 : 1.6; sfx('step' + Math.floor(Math.random() * 5), v > 5 ? 0.5 : 0.34, 0.8 + Math.random() * 0.2); }
  DUN.bob += (Math.sin(DUN.walked * 4.2) * Math.min(1, v / 4) * 0.045 - DUN.bob) * Math.min(1, dt * 14);
  if (moved > 0) reveal();
  // Schießen
  DUN.cool -= dt; DUN.kick = Math.max(0, DUN.kick - dt * 7); DUN.flash -= dt; DUN.hurt = Math.max(0, DUN.hurt - dt * 1.6);
  const wp = weapon();
  if (mouse.down && DUN.cool <= 0) { shoot(); if (!wp.auto) mouse.down = false; }
  if (tracer && tracer.visible && (tracerT -= dt) <= 0) tracer.visible = false;
  // Was liegt vor mir? (Kiste, Schalter, Förderkorb)
  DUN.prompt = ''; DUN.act = null;
  const near = (tx: number, tz: number, r = 2.2) => Math.hypot(tx * TS - DUN.x, tz * TS - DUN.z) < r;
  for (const c of DUN.crates) if (!c.open && near(c.tx, c.tz)) { DUN.prompt = c.med ? 'Verbandskasten öffnen' : c.big ? 'Tresorkiste öffnen' : 'Kiste öffnen'; DUN.act = () => openCrate(c); }
  if (DUN.sw && !DUN.sw.on && near(DUN.sw.tx, DUN.sw.tz)) {
    DUN.prompt = 'Schalter umlegen';
    DUN.act = () => { DUN.sw!.on = true; DUN.sw!.scr.color.set(0x3ad06a); DUN.door!.open = true; P.dungeons![DUN.e!.id].sw = true; const lv = (DUN.sw as any).g.getObjectByName('hebel'); if (lv) lv.rotation.x = 0.7; say('Das Tor zum Tresor fährt auf.', '#3ad06a'); sfx('door_open', 0.7, 0.7, () => snd(200, 0.6, 'sawtooth', 0.05, 80)); saveGame(); };
  }
  if (near(DUN.exit[0], DUN.exit[1], 1.6)) { DUN.prompt = 'Förderkorb: zurück an die Oberfläche'; DUN.act = () => leaveDungeon(false); }
  for (const c of DUN.crates) if (c.open && c.lid.rotation.x > -1.9) c.lid.rotation.x = Math.max(-1.9, c.lid.rotation.x - dt * 4);
  if (DUN.door && DUN.door.open && DUN.door.k < 1) {
    DUN.door.k = Math.min(1, DUN.door.k + dt * 0.5);
    const bl = DUN.door.g.getObjectByName('blatt'), rg = DUN.door.g.getObjectByName('riegel');
    if (bl) bl.position.y = 1.45 + DUN.door.k * 2.9; if (rg) rg.visible = false;
  }
  // Wächter
  pathT -= dt;
  if (pathT <= 0) { pathT = 0.4; flood(Math.round(DUN.x / TS), Math.round(DUN.z / TS), DUN.dist); }
  for (let i = DUN.foes.length - 1; i >= 0; i--) {
    const fo = DUN.foes[i];
    if (fo.hp <= 0) {
      burst(BASE.x + fo.x, BASE.y + fo.y, BASE.z + fo.z, '#ffb060', fo.boss ? 60 : 22, fo.boss ? 5 : 3.5, 0.6); sfx('explosion0', fo.boss ? 0.7 : 0.4, fo.boss ? 0.8 : 1.5, () => snd(90, 0.4, 'sawtooth', 0.07, -40));
      group.remove(fo.g); DUN.foes.splice(i, 1); DUN.kills++;
      if (fo.boss) say('Wächterkern zerstört. Der Tresor ist frei.', '#ffb347');
      continue;
    }
    const ddx = DUN.x - fo.x, ddz = DUN.z - fo.z, d = Math.hypot(ddx, ddz), sees = d < 26 && los(fo.x, fo.z, DUN.x, DUN.z);
    if (sees && d < (fo.boss ? 20 : 16)) fo.alert = true;
    fo.ph += dt; fo.hit = Math.max(0, fo.hit - dt);
    const spd = fo.boss ? 1.6 : 2.6;
    let mx = 0, mz = 0;
    if (fo.alert) {
      if (sees) { const want = fo.boss ? 6 : 5.5; const k2 = d > want + 1 ? 1 : d < want - 1.5 ? -0.8 : 0; mx = ddx / d * k2 + (-ddz / d) * Math.sin(fo.ph * 0.9) * 0.6; mz = ddz / d * k2 + (ddx / d) * Math.sin(fo.ph * 0.9) * 0.6; }
      else {
        // dem Abstandsfeld folgen: zur Nachbarkachel, die näher am Spieler liegt
        const cx = Math.round(fo.x / TS), cz = Math.round(fo.z / TS), cur = DUN.dist[I(cx, cz)]; let bx = cx, bz = cz, bd = cur < 0 ? 9999 : cur;
        for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Vec2[]) { const v2 = inb(cx + ax, cz + az) ? DUN.dist[I(cx + ax, cz + az)] : -1; if (v2 >= 0 && v2 < bd) { bd = v2; bx = cx + ax; bz = cz + az; } }
        const tx = bx * TS - fo.x, tz = bz * TS - fo.z, tl = Math.hypot(tx, tz) || 1; mx = tx / tl; mz = tz / tl;
        if (cur > 30) fo.alert = false;
      }
    } else {
      // Streife: gemächlich zwischen Nachbarkacheln
      if (Math.hypot(fo.tx - fo.x, fo.tz - fo.z) < 0.3 || Math.random() < dt * 0.1) {
        const cx = Math.round(fo.x / TS), cz = Math.round(fo.z / TS), o: Vec2[] = [];
        for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Vec2[]) if (!solidT(cx + ax, cz + az)) o.push([cx + ax, cz + az]);
        if (o.length) { const p = o[Math.floor(Math.random() * o.length)]; fo.tx = p[0] * TS; fo.tz = p[1] * TS; }
      }
      const tx = fo.tx - fo.x, tz = fo.tz - fo.z, tl = Math.hypot(tx, tz) || 1; mx = tx / tl * 0.4; mz = tz / tl * 0.4;
    }
    const nx = fo.x + mx * spd * dt, nz = fo.z + mz * spd * dt, rr = fo.boss ? 0.8 : 0.5;
    if (free(nx, fo.z, rr)) fo.x = nx; if (free(fo.x, nz, rr)) fo.z = nz;
    fo.g.position.set(fo.x, fo.y + Math.sin(fo.ph * 2.2) * 0.12, fo.z);
    fo.g.rotation.y = fo.alert ? Math.atan2(ddx, ddz) : fo.g.rotation.y + dt * 0.6;
    // Feuern: Auge glüht auf, dann ein Bolzen
    fo.cool -= dt;
    if (fo.alert && sees && fo.cool <= 0.45 && fo.aim === 0) { fo.aim = 0.45; snd(fo.boss ? 300 : 520, 0.4, 'sine', 0.025, 500); }
    if (fo.aim > 0) {
      fo.aim -= dt;
      if (fo.aim <= 0) {
        fo.aim = 0; fo.cool = (fo.boss ? 0.9 : 1.7) + Math.random() * 0.6;
        if (sees) for (let b = 0; b < (fo.boss ? 3 : 1); b++) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(fo.boss ? 0.13 : 0.09, 8, 6), new THREE.MeshBasicMaterial({ color: fo.boss ? 0xc070ff : 0xff5030 })); m.userData.sh = false; scene.add(m);
          const tx = ddx + (b - (fo.boss ? 1 : 0)) * 0.9 * (-ddz / d), tz = ddz + (b - (fo.boss ? 1 : 0)) * 0.9 * (ddx / d), ty = EYE - 0.15 - fo.y, tl = Math.hypot(tx, ty, tz), v0 = fo.boss ? 15 : 12;
          DUN.bolts.push({ m, x: fo.x, y: fo.y, z: fo.z, vx: tx / tl * v0, vy: ty / tl * v0, vz: tz / tl * v0, life: 4, dmg: (fo.boss ? 13 : 8) * (1 + 0.25 * (DUN.danger - 1)) });
          sfx('laser', 0.2, fo.boss ? 0.7 : 1.4, () => snd(300, 0.15, 'sawtooth', 0.04, -200));
        }
      }
    }
    fo.eye.color.setHex(fo.hit > 0 ? 0xffffff : fo.aim > 0 ? 0xffd040 : fo.alert ? 0xff3020 : 0x802018);
  }
  // Bolzen der Wächter
  for (let i = DUN.bolts.length - 1; i >= 0; i--) {
    const b = DUN.bolts[i]; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt;
    b.m.position.set(BASE.x + b.x, BASE.y + b.y, BASE.z + b.z);
    const hitP = Math.hypot(b.x - DUN.x, b.z - DUN.z) < 0.45 && Math.abs(b.y - (EYE - 0.5)) < 1.0;
    if (hitP) hurtPlayer(b.dmg);
    if (hitP || b.life <= 0 || b.y < 0 || solidAt(b.x, b.z)) { burst(BASE.x + b.x, BASE.y + b.y, BASE.z + b.z, '#ff7040', 5, 3, 0.25); scene.remove(b.m); b.m.geometry.dispose(); DUN.bolts.splice(i, 1); }
  }
  // Lampenlichter den nächsten Lampen zuteilen, Stirnlampe mitführen
  lampT -= dt;
  if (lampT <= 0) {
    lampT = 0.3; _v.set(DUN.x, EYE, DUN.z);
    const srt = lamps.map(l => ({ l, d: l.distanceToSquared(_v) })).sort((a, b) => a.d - b.d);
    pool.forEach((p, k) => { const o = srt[k]; if (o && o.d < 900) { p.position.copy(o.l); p.intensity = 26; } else p.intensity = 0; });
  }
  for (const m of DUN.msg) m.life -= dt;
  DUN.msg = DUN.msg.filter(m => m.life > 0);
  ambient.intensity = saved.amb * 0.1; sun.intensity = 0; rim.intensity = 0;
}
// Kamera, Stirnlampe und Waffe im Bild
export function dungeonCamera() {
  camera.position.set(BASE.x + DUN.x, BASE.y + EYE + DUN.bob - (DUN.dead > 0 ? (2.2 - DUN.dead) * 0.5 : 0), BASE.z + DUN.z);
  camera.rotation.order = 'YXZ'; camera.rotation.set(DUN.pitch + DUN.kick * 0.012, DUN.yaw, 0);
  if (Math.abs(camera.fov - 74) > 0.05) { camera.fov = 74; camera.updateProjectionMatrix(); }
  camera.updateMatrixWorld();
  if (head) { head.position.copy(camera.position); head.target.position.copy(camera.position).add(_v.set(0, -0.05, -1).applyQuaternion(camera.quaternion)); head.target.updateMatrixWorld(); }
  if (gun) {
    gun.position.copy(camera.localToWorld(_w.set(0.13, -0.12 + DUN.bob * 0.4, -0.26 + DUN.kick * 0.04)));
    gun.quaternion.copy(camera.quaternion).multiply(_q.setFromEuler(_e.set(DUN.kick * 0.12, 0.03, 0)));
    gun.visible = DUN.dead <= 0;
  }
}
// Maus: Blick bei gefangenem Zeiger
document.addEventListener('mousemove', e => {
  if (!DUN.active || G.mode !== 'dungeon' || document.pointerLockElement !== gl || DUN.dead > 0) return;
  const k = 0.0023 * settings.sens;
  DUN.yaw -= e.movementX * k; DUN.pitch = clamp(DUN.pitch - e.movementY * k * (settings.invertY ? -1 : 1), -1.35, 1.35);
});
// Esc gibt im Browser zuerst nur die Maus frei: dann gleich das Pausenmenü öffnen (main.ts hängt pause() hier ein)
export const dunHooks = { unlock: () => {} };
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const now = document.pointerLockElement === gl;
  if (wasLocked && !now && DUN.active && G.mode === 'dungeon' && DUN.dead <= 0) dunHooks.unlock();
  wasLocked = now;
});
gl.addEventListener('click', () => { if (DUN.active && G.mode === 'dungeon' && document.pointerLockElement !== gl) { try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nicht erlaubt */ } } });

// ---------- Anzeige ----------
export function drawDungeonHUD(roverX = 0, roverZ = 0, roverOn = false) {
  const W = view.W, H = view.H;
  // Oberfläche: Wegweiser zu den Eingängen und Hinweis am Tor
  if (roverOn && G.mode === 'rover' && world.surface) {
    ux.save(); ux.font = '12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
    const range = 1400 * (1 + gearStat('abbau') / 100);
    for (const e of ENTR) {
      const d = Math.hypot(e.x - roverX, e.z - roverZ); if (d > range) continue;
      _v.set(e.x, e.y + 9, e.z).project(camera);
      if (_v.z > 1 || Math.abs(_v.x) > 1 || Math.abs(_v.y) > 1) continue;
      const x = (_v.x + 1) / 2 * W, y = (1 - _v.y) / 2 * H, t = `${e.name} · ${d < 1000 ? Math.round(d) + ' m' : (d / 1000).toFixed(1).replace('.', ',') + ' km'}`, tw = ux.measureText(t).width + 16;
      ux.fillStyle = 'rgba(6,16,26,.72)'; ux.fillRect(x - tw / 2, y - 14, tw, 20); ux.fillStyle = '#ffb347'; ux.fillText(t, x, y);
      ux.beginPath(); ux.moveTo(x, y + 8); ux.lineTo(x - 5, y + 14); ux.lineTo(x + 5, y + 14); ux.fill();
    }
    const ne = nearEntrance(roverX, roverZ);
    if (ne) { const t = `[E]  ${ne.name} betreten`; ux.font = '16px Rajdhani,"Segoe UI",sans-serif'; const tw = ux.measureText(t).width + 30; ux.fillStyle = 'rgba(6,16,26,.8)'; ux.fillRect(W / 2 - tw / 2, H * 0.7, tw, 32); ux.fillStyle = '#ffb347'; ux.fillText(t, W / 2, H * 0.7 + 21); }
    if (DUN.left > 0) { DUN.left -= 0.016; ux.fillStyle = '#ff6b5b'; ux.font = '16px Rajdhani,"Segoe UI",sans-serif'; ux.fillText('Du wurdest aus der Mine geborgen. Die Wächter sind wieder auf Posten.', W / 2, H * 0.3); }
    ux.restore();
  }
  if (!DUN.active || (G.mode !== 'dungeon')) return;
  ux.save();
  // Treffer: roter Rand
  if (DUN.hurt > 0 || DUN.dead > 0) { const a = DUN.dead > 0 ? 0.6 : DUN.hurt * 0.45; const gr = ux.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8); gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, `rgba(160,0,0,${a})`); ux.fillStyle = gr; ux.fillRect(0, 0, W, H); }
  // Fadenkreuz
  ux.strokeStyle = G.hitMark > 0 ? '#ffb347' : 'rgba(255,255,255,.8)'; ux.lineWidth = 1.5;
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ux.beginPath(); ux.moveTo(W / 2 + ax * 5, H / 2 + ay * 5); ux.lineTo(W / 2 + ax * 12, H / 2 + ay * 12); ux.stroke(); }
  if (!DUN.locked) { ux.fillStyle = 'rgba(255,255,255,.7)'; ux.font = '14px Rajdhani,"Segoe UI",sans-serif'; ux.textAlign = 'center'; ux.fillText('Klicken, um die Maus einzufangen', W / 2, H / 2 + 40); }
  // Leben und Waffe
  const wp = weapon(), bx = W - 278, by = H - 54;
  ux.fillStyle = 'rgba(6,16,26,.75)'; ux.fillRect(bx - 8, by - 26, 268, 64);
  ux.font = '12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left'; ux.fillStyle = '#8fa0b0'; ux.fillText('LEBEN', bx, by - 8);
  ux.fillStyle = 'rgba(255,255,255,.1)'; ux.fillRect(bx, by, 250, 10); ux.fillStyle = DUN.hp / DUN.maxHp > 0.35 ? '#3ad06a' : '#ff6b5b'; ux.fillRect(bx, by, 250 * clamp(DUN.hp / DUN.maxHp, 0, 1), 10);
  ux.fillStyle = '#dfe8f0'; ux.textAlign = 'right'; ux.fillText(`${Math.ceil(DUN.hp)} / ${DUN.maxHp}`, bx + 250, by - 8);
  ux.textAlign = 'left'; ux.fillStyle = '#ffb347'; ux.fillText(wp.name.toUpperCase(), bx, by + 28); ux.fillStyle = '#8fa0b0'; ux.textAlign = 'right'; ux.fillText(`${Math.round(wp.dmg * wp.n)} SCHADEN`, bx + 250, by + 28);
  // Meldungen
  ux.textAlign = 'left'; ux.font = '15px Rajdhani,"Segoe UI",sans-serif';
  DUN.msg.forEach((m, i) => { ux.globalAlpha = clamp(m.life, 0, 1); ux.fillStyle = 'rgba(6,16,26,.7)'; const tw = ux.measureText(m.t).width + 16; ux.fillRect(22, 24 + i * 26, tw, 22); ux.fillStyle = m.c; ux.fillText(m.t, 30, 40 + i * 26); });
  ux.globalAlpha = 1;
  // Hinweis
  if (DUN.prompt) { const t = `[E]  ${DUN.prompt}`; ux.textAlign = 'center'; ux.font = '16px Rajdhani,"Segoe UI",sans-serif'; const tw = ux.measureText(t).width + 30; ux.fillStyle = 'rgba(6,16,26,.8)'; ux.fillRect(W / 2 - tw / 2, H * 0.68, tw, 32); ux.fillStyle = '#ffb347'; ux.fillText(t, W / 2, H * 0.68 + 21); }
  // Karte: deckt sich beim Erkunden auf, dreht nicht mit
  const cs = Math.max(4, Math.min(8, Math.floor(190 / DUN.W))), mw = DUN.W * cs, mx0 = W - mw - 22, my0 = 22;
  ux.fillStyle = 'rgba(6,16,26,.72)'; ux.fillRect(mx0 - 8, my0 - 8, mw + 16, DUN.H * cs + 48);
  for (let z = 0; z < DUN.H; z++) for (let x = 0; x < DUN.W; x++) {
    if (!DUN.seen[I(x, z)]) continue;
    const v = DUN.t[I(x, z)];
    ux.fillStyle = v === 0 ? 'rgba(95,208,255,.1)' : v === 2 ? (DUN.door?.open ? '#3ad06a' : '#ff5a40') : 'rgba(150,190,215,.55)';
    ux.fillRect(mx0 + x * cs, my0 + z * cs, cs, cs);
  }
  const dot = (tx: number, tz: number, c: string, r = cs * 0.34) => { if (!DUN.seen[I(tx, tz)]) return; ux.fillStyle = c; ux.beginPath(); ux.arc(mx0 + (tx + 0.5) * cs, my0 + (tz + 0.5) * cs, r, 0, 6.283); ux.fill(); };
  for (const c of DUN.crates) if (!c.open) dot(c.tx, c.tz, c.med ? '#3ad06a' : c.big ? '#ffb347' : '#5fd0ff');
  if (DUN.sw) dot(DUN.sw.tx, DUN.sw.tz, DUN.sw.on ? '#3ad06a' : '#ff5a40');
  dot(DUN.exit[0], DUN.exit[1], '#ffffff', cs * 0.28);
  for (const f of DUN.foes) if (f.alert) dot(Math.round(f.x / TS), Math.round(f.z / TS), '#ff3020', cs * 0.3);
  { const px = mx0 + (DUN.x / TS + 0.5) * cs, pz = my0 + (DUN.z / TS + 0.5) * cs, a = -DUN.yaw; ux.fillStyle = '#ffffff'; ux.beginPath(); ux.moveTo(px - Math.sin(-a) * 0 + Math.sin(DUN.yaw) * -cs * 0.75, pz - Math.cos(DUN.yaw) * cs * 0.75); ux.lineTo(px + Math.cos(DUN.yaw) * cs * 0.45 + Math.sin(DUN.yaw) * cs * 0.4, pz - Math.sin(DUN.yaw) * cs * 0.45 + Math.cos(DUN.yaw) * cs * 0.4); ux.lineTo(px - Math.cos(DUN.yaw) * cs * 0.45 + Math.sin(DUN.yaw) * cs * 0.4, pz + Math.sin(DUN.yaw) * cs * 0.45 + Math.cos(DUN.yaw) * cs * 0.4); ux.fill(); }
  ux.fillStyle = '#8fa0b0'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left';
  ux.fillText(DUN.e ? DUN.e.name.toUpperCase() : '', mx0, my0 + DUN.H * cs + 16, mw); ux.fillStyle = DUN.foes.length ? '#ff8a70' : '#3ad06a'; ux.fillText(`WÄCHTER ${DUN.foes.length}`, mx0, my0 + DUN.H * cs + 31, mw);
  ux.restore();
}
