import * as THREE from 'three';
import { KEEP } from './keep';
import { ausgabe, wahl } from './fahrzeuge';
import { scene, camera, view, ux, glowMat } from '../core/engine';
import { texMat, std, boxUV } from '../core/textures';
import { setSky, setSurfaceSky } from '../core/sky';
import { groundTexture, groundNormal, groundRough, groundLayer } from '../core/planetVis';
import { setAmbience } from '../core/ambience';
import { keys, mouse } from '../core/input';
import { rng, hashStr, clamp, d3, rand, fmtN } from '../core/util';
import { snd, laserSound } from '../core/audio';
import { SECTOR, type StationDef } from '../data/galaxy';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { PLANETS, PTYPE, planetBaseId, type PlanetDef } from '../data/planets';
import { buildGate } from '../models/structures';
import { buildFahrzeug, fzLaden, fzBereit, FZ, GETRIEBE, drehmoment, normFz, type FzId, type RoverNeu, type RoverRad } from '../models/rover';
import { updateFahrer, fahrerWeg, fahrerZeigen } from './fahrer';
import { updateWieselScan, drawWieselScan, wieselScanWeg, WSCAN } from './wiesel';
import { BODEN_OBST, bodenHooks } from './bodenaufgaben';
import { wetterStart, WETTER } from './wetter';
import { buildFlora, updateFlora } from './flora';
import { gearFactor } from './inventory';
import { buildDungeonEntrances } from './dungeon';
import { buildSalvage, SALV } from './salvage';
import { buildFieldFoes } from './fieldfight';
import { setOutpostDust, loadBase, buildDeco } from '../models/stationModels';
import { mesh, alongZ } from '../models/helpers';
import { world, clearSector, addStation, makeAst, removeAst, type Asteroid, type Ore } from './world';
import { P, G, stats, cargoUsed, settings } from './state';
import { SHIP, hurtPlayer } from './player';
import { burst, puff } from './fx';
import { radio } from '../ui/radio';
import { groundShade, GROUND_SHADE_PARS } from './groundShade';

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
  // Genau die Dreiecke des Geländenetzes (PlaneGeometry teilt jedes Feld an der Diagonale von (ix, iz + 1) nach (ix + 1, iz)). Bis 24.11.2026
  // stand hier eine bilineare Mitte über die vier Ecken: Bei 31 m Feldern lag sie bis zu 4 m neben dem sichtbaren Boden – Figuren sanken ein,
  // der Rover kippte gegen die Fläche.
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
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
  const base: StationDef | null = pd.base ? { id: planetBaseId(sector), kind: pd.city ? 'station' : 'outpost', name: pd.base, pos: [0, 0, 0], refinery: true, prices: { erden: 0.9, helium: 0.9 }, city: pd.city, model: pd.model, refineBonus: pd.refineBonus } : null;
  KEEP.r = pd.city ? 360 : pd.model ? 270 : 130;
  world.def = { ...sec, name: pd.name, danger: pd.danger, stations: base ? [base] : [], fields: [], hives: 0, links: [] };
  // Höhen
  const half = SURF.size / 2, cell = SURF.size / (N - 1);
  const craters = Array.from({ length: T.craters }, () => ({ x: R.range(-3000, 3000), z: R.range(-3000, 3000), r: R.range(250, 700), d: R.range(80, 200) }));
  let mn = 1e9, mx = -1e9;
  // Höhenformel: gilt für die Karte und für das ferne Gelände drumherum
  const hfun = (x: number, z: number) => {
    let h = T.amp * (0.6 * nz.fbm(x / 1700, z / 1700) + 0.55 * Math.pow(nz.ridge(x / 950 + 3.1, z / 950 - 1.7), 1.6) - 0.42);
    h += T.amp * 0.03 * (nz.fbm(x / 130 + 7.7, z / 130 - 2.3, 4) - 0.5);          // feine Unruhe
    for (const c of craters) {
      const d = Math.hypot(x - c.x, z - c.z) / c.r;
      if (d < 1) h -= c.d * (1 - d * d);
      h += c.d * 0.45 * Math.exp(-Math.pow((d - 1) * 5, 2));
    }
    // zum Rand hin Gebirge (natürliche Grenze); draußen läuft es als Bergland bis zum Horizont weiter
    const edge = Math.max(Math.abs(x), Math.abs(z));
    if (edge > SURF.limit - 200) {
      const t = (edge - SURF.limit + 200) / 600;
      h += t <= 1 ? t * t * 260 : 260 + Math.min(t - 1, 3) * 300 * (nz.ridge(x / 2600 - 1.3, z / 2600 + 4.2) * 1.7 - 0.3) + Math.min(t - 1, 1) * 150 * (nz.ridge(x / 480 + 9.1, z / 480 - 6.4) - 0.45);
    }
    return h;
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = hfun(-half + i * cell, -half + j * cell);
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
  if (gTex) groundShader(tm, gTex, c1, pd.type, T.fog, liquidLevel > -1e8 ? liquidLevel : mn, GROUNDSET[sector] || TYPESET[pd.type]);
  const terrain = new THREE.Mesh(geo, tm);
  scene.add(terrain);
  world.extras.push(terrain);
  // Fernes Gelände bis zum Horizont: grobes Netz um die Karte herum (gleiche Höhenformel, gleiche Oberfläche). Unter der Karte liegt es tiefer,
  // am Kartenrand schließt es an; so sieht man aus der Luft keine Kante mehr.
  {
    const FS = 34000, FN = 272, fg = new THREE.PlaneGeometry(FS, FS, FN, FN); fg.rotateX(-Math.PI / 2);
    const fp = fg.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < fp.count; k++) {
      const x = fp.getX(k), z = fp.getZ(k), e = Math.max(Math.abs(x), Math.abs(z));
      fp.setY(k, hfun(x, z) - (e < half - 1 ? 70 : e < half + 1 ? 5 : 0));
    }
    fg.computeVertexNormals();
    const fn = fg.attributes.normal as THREE.BufferAttribute, fc = new Float32Array(fp.count * 3), fsl = new Float32Array(fp.count), fuv = fg.attributes.uv as THREE.BufferAttribute;
    for (let k = 0; k < fp.count; k++) {
      const t = clamp((fp.getY(k) - mn) / (mx - mn + 1), 0, 1);
      if (t < 0.5) c.copy(c0).lerp(c1, t * 2); else c.copy(c1).lerp(c2, (t - 0.5) * 2);
      fsl[k] = Math.min(1, (1 - fn.getY(k)) * 3.2);
      if (gTex) { const f = clamp(lum(c) / l1, 0.6, 1.5); fc[k * 3] = (f * 0.7 + 0.3 * c.r / c1.r) * f; fc[k * 3 + 1] = (f * 0.7 + 0.3 * c.g / c1.g) * f; fc[k * 3 + 2] = (f * 0.7 + 0.3 * c.b / c1.b) * f; }
      else { fc[k * 3] = c.r; fc[k * 3 + 1] = c.g; fc[k * 3 + 2] = c.b; }
      fuv.setXY(k, fp.getX(k) / 28, fp.getZ(k) / 28);
    }
    fg.setAttribute('color', new THREE.BufferAttribute(fc, 3)); fg.setAttribute('slope', new THREE.BufferAttribute(fsl, 1));
    const far = new THREE.Mesh(fg, tm); far.userData.sh = false;            // weder Schatten werfen noch empfangen (liegt außerhalb des Schattenbereichs)
    scene.add(far); world.extras.push(far);
  }
  if (T.liquid) {
    const L = T.liquid;
    const lm = L.glow ? new THREE.MeshBasicMaterial({ color: L.color }) : new THREE.MeshStandardMaterial({ color: new THREE.Color(L.color).lerp(new THREE.Color(T.sky[1]), 0.35), roughness: 0.1, metalness: 0, envMapIntensity: 0.15, transparent: true, opacity: 0.9 });   // spiegelt den Himmel, nicht das All
    const lq = new THREE.Mesh(new THREE.PlaneGeometry(34000, 34000), lm);
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
  const SL = SKYLOOK[pd.type];
  setSurfaceSky({ horizon: T.sky[0], zenith: T.sky[1], fog: T.fog, fogDensity: T.fogDensity, clouds: SL.clouds, cloudCol: SL.cloudCol, stars: SL.stars, body: skyBody(sector),
    ...(pd.type === 'mond' ? { air: 0.15, moon: { dir: [-0.86, 0.5, -0.1] as [number, number, number], rad: 0.036, col: 0xb8bcc4 } } : {}) });
  wetterStart(sector, pd.type, { fog: T.fog, fogDensity: T.fogDensity, clouds: SL.clouds, stars: SL.stars, air: pd.type === 'mond' ? 0.15 : 1 });      // Tag, Nacht, Wetter (wetter.ts)
  setAmbience({ id: sector + ':oberflaeche', neb: sec.neb, faction: sec.faction, fields: [] }, 0);
  // Bodenstation
  // Staub bzw. Schnee auf waagrechten Flächen des Außenpostens in der Bodenfarbe des Planeten
  setOutpostDust(T.ground[2], pd.type === 'eis' ? 0.45 : pd.type === 'wueste' ? 0.35 : 0.25);
  // Stadt: Boden 0,3 m über dem Plateau, Tor zeigt zum Anflugpunkt (Nordwesten); Basis: Stationspunkt 14 m über dem Plateau
  if (base && base.city) { base.pos = [0, plateau + 0.3, 0]; addStation(base, -Math.PI / 4); }
  else if (base) { base.pos = [0, plateau + 14, 0]; addStation(base, R.range(0, Math.PI * 2)); }
  // Lagerstätten in Gruppen
  const rigs: [number, number][] = [];
  for (let g = 0; g < 6; g++) {
    let cx = 0, cz = 0;
    for (let t = 0; t < 30; t++) {
      const a = R.range(0, Math.PI * 2), d = R.range(1000, 3100);
      cx = Math.cos(a) * d; cz = Math.sin(a) * d;
      if (heightAt(cx, cz) > liquidLevel + 15) break;
    }
    rigs.push([cx, cz]);
    const n = 9 + Math.floor(R.next() * 6);
    for (let i = 0; i < n; i++) {
      const x = cx + R.range(-220, 220), z = cz + R.range(-220, 220), h = heightAt(x, z);
      if (h < liquidLevel + 4) continue;
      if (pd.type === 'mond' && Math.hypot(x - cx, z - cz) < 26) continue;      // Platz für den Bohrturm in der Mitte
      const r = R.pick([9, 12, 12, 16]);
      const a = makeAst(x, h + r * 0.28, z, r, T.rock, null, compFrom(T.ore, R.next));
      a.vx = a.vy = a.vz = 0; a.wx = a.wy = 0;
      a.max = a.yld = r >= 16 ? 60 : r >= 12 ? 40 : 24;
    }
  }
  buildFlora(pd.type, R, heightAt, liquidLevel, hashStr(sector) % 1000);
  buildDungeonEntrances(sector, heightAt, liquidLevel);                         // Stolleneingänge (src/game/dungeon.ts)
  void 0;      // Felsbrocken, Felsnadeln, Pflanzen (src/game/flora.ts)
  world.surface = { planet: sector, limit: SURF.limit, type: pd.type };
  // Bergbaumond: an jeder Lagerstätte steht ein Bohrturm (Modell aus dem Hintergrund-Paket, kommt nach, sobald es geladen ist)
  if (pd.type === 'mond') loadBase('Bohrturm').then(ok => {
    if (!ok || !world.surface || world.surface.planet !== sector) return;
    for (const [i, [x, z]] of rigs.entries()) {
      const o = buildDeco('Bohrturm'); if (!o) return;
      o.position.set(x, heightAt(x, z) - 0.35, z); o.rotation.y = i * 1.3; o.traverse((q: any) => { if (q.isMesh) q.castShadow = true; });
      scene.add(o); world.extras.push(o);
    }
  });
  world.ground = groundAt;
  buildSalvage(sector);                                                          // Wracks und Versorgungskisten (src/game/salvage.ts)
  buildFieldFoes(sector);                                                        // Ferrox-Wachdrohnen (src/game/fieldfight.ts)
  world.regrowT = 1e9;
  return { plateau, arrive: { x: -2300, y: plateau + 1300, z: 2300 } };
}

// Bodenbilder (Poly Haven, siehe asset-src/tex-src/polyhaven/ground.json): Kachelgröße in Metern wie eingescannt und wie stark
// die Farbe zur Bodenfarbe des Planetentyps (planets.ts, ground[1]) gezogen wird (0 = Foto, 1 = ganz Planetenfarbe).
const GROUND: Record<string, { m: number; tint: number; nrm: number }> = {
  fels: { m: 2, tint: 0.45, nrm: 1 }, wueste: { m: 1.5, tint: 0.55, nrm: 0.8 }, eis: { m: 2, tint: 0.35, nrm: 0.7 },
  vulkan: { m: 2.4, tint: 0.75, nrm: 1 }, asche: { m: 3.1, tint: 0.85, nrm: 1 }, kristall: { m: 2, tint: 0.9, nrm: 1 }, mond: { m: 2.6, tint: 0.25, nrm: 1.15 },
};
// Materialsatz (nur wo hier eingetragen): Statt eines Bodenbilds liegen drei Böden nebeneinander, die zusammenpassen:
// „fine“ in Flecken auf flachen Stellen, „scree“ als Decke des sanften Geländes, das bisherige Geröll an den Hängen und in Flecken dazwischen,
// darüber wie bisher der Fels der Steilwände. Die Grenzen folgen der Hangneigung und groben Flecken; im Übergang entscheidet die Höhenkarte
// der Bilder (Alphakanal, siehe build-assets.mjs): Steine ragen aus dem Gras, statt zu verlaufen. Oberhalb der Schneegrenze endet der Bewuchs.
// tex: Bodenbild eines anderen Planetentyps (liegt schon im Spiel), m: Kachelgröße in Metern, col/tint: Zielfarbe und wie stark dorthin gefärbt wird.
interface GroundLayer { tex: string; m: number; col: number; tint: number }
// veg: Der Satz ist Bewuchs und endet an der Schneegrenze (Felsplaneten). Ohne veg gilt er in jeder Höhe (Sand, Schnee, Asche, Staub).
interface GroundSet { fine: GroundLayer; scree: GroundLayer; veg?: boolean }
// Je Planetentyp (Alpha 1.16, Bilder und Farben ab 1.17); ein Eintrag in GROUNDSET für einen Sektor geht vor. Fehlt eines der Bilder, bleibt es
// beim einen Bodenbild. Farben: Die drei Böden eines Planeten liegen im Ton nah beieinander und unterscheiden sich im Muster; mit größerem Abstand
// stehen die Flächen als Pfützen im Gelände. tint mischt zur Zielfarbe: Auf dunklen Welten muss es fast 1 sein, sonst schlägt die helle
// Eigenfarbe des Bilds durch (getrockneter Schlamm als Lavakruste).
const TYPESET: Record<string, GroundSet> = {
  // Felsplaneten: Wiese und Waldboden wie auf Heimstatt II
  fels: { fine: { tex: 'l_gras', m: 12, col: 0x626a30, tint: 0.55 }, scree: { tex: 'l_wald', m: 2, col: 0x626a30, tint: 0.4 }, veg: true },
  // Wüste: rissige Lehmpfannen in den Senken, Kiesebene als Decke, der bisherige Sand an den Hängen und in Verwehungen
  wueste: { fine: { tex: 'l_lehm', m: 5, col: 0xd2b48a, tint: 0.6 }, scree: { tex: 'l_kies', m: 2.5, col: 0xb89060, tint: 0.6 } },
  // Eiswelt: verwehtes Eisfeld mit dunklen Stellen (Luftbild, hier auf 30 m gelegt), harschiger Schnee als Decke, Pulverschnee an den Hängen
  eis: { fine: { tex: 'l_eisfeld', m: 30, col: 0xa8c4dc, tint: 0.6 }, scree: { tex: 'l_harsch', m: 2.5, col: 0xd4e0ea, tint: 0.5 } },
  // Vulkan: erstarrte Lavakruste in Schollen auf den Ebenen, Schlackekies als Decke
  vulkan: { fine: { tex: 'l_kruste', m: 3.5, col: 0x30261f, tint: 1 }, scree: { tex: 'l_schlacke', m: 1.8, col: 0x4a3a30, tint: 0.95 } },
  // Aschewelt: feine Asche in den Senken, verkohlter Schutt als Decke
  asche: { fine: { tex: 'l_asche', m: 2.2, col: 0x6a5a68, tint: 0.95 }, scree: { tex: 'l_brand', m: 1.6, col: 0x44383f, tint: 0.95 } },
  // Kristallwüste: dicht gesprungene Glasflächen, Bruchstücke als Decke
  kristall: { fine: { tex: 'l_sprung', m: 3, col: 0x56427c, tint: 1 }, scree: { tex: 'l_bruch', m: 3, col: 0x40325e, tint: 1 } },
  // Mond: Staubflächen mit kleinen Einschlägen, feiner Regolith als Decke, das bisherige Geröll an den Hängen
  mond: { fine: { tex: 'l_einschlag', m: 6, col: 0x8e8e92, tint: 0.75 }, scree: { tex: 'l_regolith', m: 3.1, col: 0x7c7c80, tint: 0.75 } },
};
const GROUNDSET: Record<string, GroundSet> = {
  // Heimstatt II: saftige Wiese mit Steinnestern in den Ebenen (Luftbild, hier auf 12 m gelegt), Waldboden mit Gras und Zweigen als Decke
  // (beide zur selben Grasfarbe gezogen: Aus der Luft stünden die Wiesenflecken sonst als dunkle Dreiecke im helleren Waldboden)
  heimstatt: { fine: { tex: 'l_gras', m: 12, col: 0x626a30, tint: 0.55 }, scree: { tex: 'l_wald', m: 2, col: 0x626a30, tint: 0.4 }, veg: true },
  // Neuhafen IV: dieselben Böden, aber fahl und feucht statt saftig (Regenwelt mit Industrie)
  neuhafen: { fine: { tex: 'l_gras', m: 12, col: 0x55583a, tint: 0.7 }, scree: { tex: 'l_wald', m: 2, col: 0x4c4c36, tint: 0.6 }, veg: true },
};
// Gelände-Shader: flache Stellen mit Bodenbild, Steilhänge mit Fels.
// Das Bodenbild wird aus drei Richtungen projiziert (von oben und von zwei Seiten, gewichtet nach der Flächenneigung), damit es an Hängen
// nicht zu Streifen gezogen wird. Nah liegt es in echter Größe, mit der Entfernung gröber (7,3- und 41-fach); ein grobes Muster bricht die
// Wiederholung. Relief und Rauheit kommen aus eigenen Bildern; die Farbe wird über den Mittelwert des Bilds (kleinste Mip-Stufe) zur Planetenfarbe gezogen.
// Gewichte nahe null werden übersprungen: So liest jeder Bildpunkt meist nur ein bis zwei Maßstäbe und eine Richtung.
// Himmel und Bodenauflage je Planetentyp: Wolkenmenge und -farbe, Sterne am Tag, Auflage (Farbe, Stärke, Höhe ab der sie zunimmt), Dunst in den Tälern
const SKYLOOK: Record<string, { clouds: number; cloudCol: number; stars: number; snow: [number, number, number]; mist: number; veg?: [number, number] }> = {
  fels: { clouds: 0.4, cloudCol: 0xffffff, stars: 0.25, snow: [0xdde3ea, 0.9, 240], mist: 0.7, veg: [0x6a6c38, 0.7] },          // Schnee in Flecken, oben mehr
  wueste: { clouds: 0.3, cloudCol: 0xffe8cc, stars: 0.1, snow: [0xd2b488, 0.45, -200], mist: 0.4 },      // helle Sandverwehungen
  eis: { clouds: 0.32, cloudCol: 0xf4f8ff, stars: 0.2, snow: [0x7fb0d4, 0.7, -200], mist: 0.3 },          // blankes blaues Eis zwischen dem Schnee
  vulkan: { clouds: 0.55, cloudCol: 0x3c2822, stars: 0, snow: [0x6a625c, 0.45, -200], mist: 0.6 },       // graue Asche
  asche: { clouds: 0.35, cloudCol: 0x8a70a0, stars: 0.5, snow: [0x9a8a98, 0.55, -200], mist: 0.6 },
  kristall: { clouds: 0.12, cloudCol: 0xc8a0ff, stars: 0.9, snow: [0x8a70c8, 0.4, -200], mist: 0.45 },   // violetter Reif
  mond: { clouds: 0, cloudCol: 0xffffff, stars: 1, snow: [0xb9b9be, 0.42, -200], mist: 0.12 },             // heller Staub in Flecken, kein Dunst
};
// Nachbarplanet am Himmel: Richtung, Größe, Farbe und Ring stehen je Sektor fest
function skyBody(sector: string) {
  // Bergbaumond: Der Gasriese, den der Mond umkreist, füllt ein gutes Stück des Himmels und steht halb hinter dem Horizont
  if (PLANETS[sector]?.type === 'mond') return { dir: [-0.55, 0.27, -0.79] as [number, number, number], rad: 0.44, col: 0xd9b48c, ring: 0, giant: 1 };
  const h = hashStr(sector + ':himmel'), a = (h % 628) / 100, el = 0.3 + ((h >> 4) % 30) / 100, cols = [0xe8d8b8, 0xc8d0e8, 0xe0b090, 0xb8c8b0, 0xd8b8d8];
  return { dir: [Math.cos(a) * Math.cos(el), Math.sin(el), Math.sin(a) * Math.cos(el)] as [number, number, number], rad: 0.07 + ((h >> 8) % 60) / 1000, col: cols[h % cols.length], ring: (h >> 3) % 5 < 3 ? 1 : 0 };
}
function groundShader(m: THREE.MeshStandardMaterial, g: THREE.Texture, cliff: THREE.Color, type: string, fogCol: number, lowY: number, setDef?: GroundSet) {
  const gn = groundNormal(type), gr = groundRough(type), P = GROUND[type] || { m: 24, tint: 0, nrm: 0 };
  // Materialsatz: nur wenn beide weiteren Böden samt Relief vorhanden sind
  const lf = setDef ? groundLayer(setDef.fine.tex) : null, ls = setDef ? groundLayer(setDef.scree.tex) : null;
  const set = setDef && lf && ls && lf.nrm && ls.nrm ? setDef : null;
  if (gn && !m.normalMap) m.normalMap = gn;          // sorgt für Relief im Shader, auch bevor das Felsrelief fertig ist
  m.onBeforeCompile = (sh) => {
    m.userData.sh = sh;                               // Uniforms zum Nachstellen im Spiel erreichbar
    sh.uniforms.groundMap = { value: g };
    sh.uniforms.groundNrm = { value: gn };
    sh.uniforms.groundRgh = { value: gr };
    sh.uniforms.gScale = { value: 1 / P.m };
    sh.uniforms.gTint = { value: P.tint };
    sh.uniforms.gNrmK = { value: gn ? P.nrm : 0 };
    sh.uniforms.gHasR = { value: gr ? 1 : 0 };
    sh.uniforms.gCol = { value: cliff.clone() };
    sh.uniforms.cliffCol = { value: cliff.clone() };
    const SL = SKYLOOK[type] || SKYLOOK.fels;
    sh.uniforms.snowCol = { value: new THREE.Color(SL.snow[0]) }; sh.uniforms.snowK = { value: SL.snow[1] }; sh.uniforms.snowY = { value: SL.snow[2] };
    sh.uniforms.vegCol = { value: new THREE.Color(SL.veg ? SL.veg[0] : 0) }; sh.uniforms.vegK = { value: SL.veg ? SL.veg[1] : 0 };
    sh.uniforms.mistK = { value: SL.mist }; sh.uniforms.mistY = { value: lowY + 25 };
    sh.uniforms.bShMap = groundShade.map; sh.uniforms.bShMat = groundShade.mat; sh.uniforms.bShOn = groundShade.on; sh.uniforms.bShPx = groundShade.px;   // Gebäudeschatten (groundShade.ts)
    if (set) {
      sh.uniforms.gFineMap = { value: lf!.map }; sh.uniforms.gFineNrm = { value: lf!.nrm }; sh.uniforms.gScreeMap = { value: ls!.map }; sh.uniforms.gScreeNrm = { value: ls!.nrm };
      sh.uniforms.gFineCol = { value: new THREE.Color(set.fine.col) }; sh.uniforms.gScreeCol = { value: new THREE.Color(set.scree.col) };
      sh.uniforms.gSetP = { value: new THREE.Vector4(1 / set.fine.m, set.fine.tint, 1 / set.scree.m, set.scree.tint) };
      sh.uniforms.gSetK = { value: 1 };      // 0 schaltet den Satz ab (Vergleich; später für eine sparsame Grafikstufe)
      sh.uniforms.gSetVeg = { value: set.veg ? 1 : 0 };
    }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float slope; varying float vSlope; varying vec3 vWPos; varying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSlope = slope; vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz; vWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        ${set ? '#define GSET\n        uniform sampler2D gFineMap; uniform sampler2D gFineNrm; uniform sampler2D gScreeMap; uniform sampler2D gScreeNrm; uniform vec3 gFineCol; uniform vec3 gScreeCol; uniform vec4 gSetP; uniform float gSetK; uniform float gSetVeg;' : ''}
        uniform sampler2D groundMap; uniform sampler2D groundNrm; uniform sampler2D groundRgh; uniform vec3 cliffCol; uniform vec3 gCol;
        uniform float gScale; uniform float gTint; uniform float gNrmK; uniform float gHasR; uniform vec3 snowCol; uniform float snowK; uniform float snowY; uniform float mistK; uniform float mistY; uniform vec3 vegCol; uniform float vegK; varying float vSlope; varying vec3 vWPos; varying vec3 vWNrm;
        ${GROUND_SHADE_PARS}
        // ein Bild in drei Maßstäben, nach Entfernung überblendet (B.x: nah → mittel, B.y: mittel → fern)
        vec3 gS(sampler2D t, vec2 p, vec2 B){
          float wa = (1.0 - B.x) * (1.0 - B.y), wb = B.x * (1.0 - B.y), wc = B.y, n = 0.0; vec3 r = vec3(0.0);
          if (wa > 0.002) { r += wa * texture2D(t, p).rgb; n += wa; }
          if (wb > 0.002) { r += wb * texture2D(t, p / 7.3 + 0.37).rgb; n += wb; }
          if (wc > 0.002) { r += wc * texture2D(t, p / 41.0 + 0.71).rgb; n += wc; }
          return r / max(n, 1e-4); }
        // dasselbe aus drei Richtungen: w = Gewichte (x: Seite von x, y: von oben, z: Seite von z)
        vec3 gT(sampler2D t, vec3 P, vec3 w, vec2 B){
          vec3 r = vec3(0.0); float n = 0.0;
          if (w.y > 0.01) { r += w.y * gS(t, P.xz, B); n += w.y; }
          if (w.x > 0.01) { r += w.x * gS(t, P.zy + 0.19, B); n += w.x; }
          if (w.z > 0.01) { r += w.z * gS(t, P.xy + 0.53, B); n += w.z; }
          return r / max(n, 1e-4); }`)
      .replace('#include <map_fragment>', `
        vec4 rockC = texture2D(map, vMapUv);
        vec3 gP = vWPos * gScale;
        float gD = length(vWPos - cameraPosition);
        vec2 gB = vec2(smoothstep(12.0, 70.0, gD), smoothstep(140.0, 900.0, gD));
        vec3 gw = pow(abs(normalize(vWNrm)), vec3(4.0)); gw /= (gw.x + gw.y + gw.z);
        vec3 gC = gT(groundMap, gP, gw, gB);
        vec3 gMean = max(textureLod(groundMap, vec2(0.5), 12.0).rgb, vec3(0.02));
        // flacher Blickwinkel: Dort kann die Filterung das feine Bild nicht mehr sauber verkleinern, es verwischt zu Streifen → weniger Kontrast
        float gGraz = smoothstep(0.06, 0.4, abs(dot(normalize(cameraPosition - vWPos), normalize(vWNrm))));
        gC = mix(gMean, gC, mix(1.0, 0.5, gB.x) * mix(1.0, 0.55, gB.y) * mix(0.4, 1.0, gGraz));   // gröbere Stufen mit weniger Kontrast: sonst sieht man das Kachelraster
        float gLum = dot(gMean, vec3(0.3, 0.59, 0.11));
        float gL = dot(texture2D(groundMap, gP.xz / 97.0 + 0.13).rgb, vec3(0.3, 0.59, 0.11)) / gLum;
        float gL2 = dot(texture2D(groundMap, gP.xz / 523.0 + 0.61).rgb, vec3(0.3, 0.59, 0.11)) / gLum;
        gC *= mix(1.0, gL, 0.4) * mix(1.0, gL2, 0.3);                   // grobe Flecken in zwei Größen gegen sichtbare Wiederholung
        gC = gC / gMean * mix(gMean, gCol, gTint);                       // Farbe zur Planetenfarbe ziehen, Muster bleibt
        #ifdef GSET
          // Materialsatz: Anteile nach Hangneigung, von groben Flecken verschoben (x fein, y Geröll, z Schutt)
          // feiner Grund in Flecken auf flachen Stellen, und zwar dort, wo keine Wiese liegt (die Wiese nimmt die hellen Flecken des groben Musters)
          // vSlope ist 1 - Normale.y: 0,004 sind 5 Grad, 0,012 sind 9 Grad, 0,05 sind 18 Grad, 0,1 sind 26 Grad (die Steilwand beginnt bei 0,2 = 37 Grad)
          float gAlt = mix(1.0, 1.0 - smoothstep(snowY - 60.0, snowY + 160.0, vWPos.y), gSetVeg);      // oben wächst nichts mehr (nur bei Bewuchs)
          float gWf = (1.0 - smoothstep(0.004, 0.03, vSlope)) * smoothstep(0.0, 0.2, (1.0 - gL2) * 1.5 + (1.0 - gL) * 0.8) * gAlt;
          // Decke des sanften Geländes bis etwa 20 Grad; in Flecken schaut das Geröll durch
          float gWs = (1.0 - smoothstep(0.05, 0.11, vSlope + (gL - 1.0) * 0.03)) * (1.0 - 0.9 * smoothstep(0.1, 0.28, (gL - 1.0) * 1.7)) * gAlt * (1.0 - gWf);
          gWf *= gSetK; gWs *= gSetK;
          vec3 gHW = vec3(gWf, max(0.0, 1.0 - gWf - gWs), gWs);
          float gCon = mix(1.0, 0.5, gB.x) * mix(1.0, 0.55, gB.y) * mix(0.4, 1.0, gGraz);
          vec3 gFc = vec3(0.0), gSc = vec3(0.0); float gHf = 0.5, gHs = 0.5;
          if (gHW.x > 0.01) {
            vec3 mF = max(textureLod(gFineMap, vec2(0.5), 12.0).rgb, vec3(0.02)), s = mix(mF, gS(gFineMap, vWPos.xz * gSetP.x, gB), gCon);
            gHf = mix((texture2D(gFineMap, vWPos.xz * gSetP.x).a - 0.094) / 0.906, 0.5, gB.x); gFc = s / mF * mix(mF, gFineCol, gSetP.y) * mix(1.0, gL2, 0.25);
          }
          if (gHW.z > 0.01) {
            vec3 mS = max(textureLod(gScreeMap, vec2(0.5), 12.0).rgb, vec3(0.02)), s = mix(mS, gS(gScreeMap, vWPos.xz * gSetP.z, gB), gCon);
            gHs = mix((texture2D(gScreeMap, vWPos.xz * gSetP.z).a - 0.094) / 0.906, 0.5, gB.x); gSc = s / mS * mix(mS, gScreeCol, gSetP.w) * mix(1.0, gL, 0.3);
          }
          // Höhenmischung: Der Anteil hebt einen Boden an, im Übergang gewinnt, was im Bild höher liegt (scharfe, natürliche Ränder statt Überblendung)
          float gHb = mix((texture2D(groundMap, gP.xz).a - 0.094) / 0.906, 0.5, gB.x);      // Höhe aus dem Alphakanal; ohne Höhenkarte ist sie überall 1, dann entscheiden allein die Anteile
          vec3 gHH = vec3(gHf, gHb, gHs) + gHW * 1.6;
          vec3 gMix = max(gHH - (max(gHH.x, max(gHH.y, gHH.z)) - 0.22), 0.0) * step(0.01, gHW);
          gMix /= max(gMix.x + gMix.y + gMix.z, 1e-4);
          gC = gFc * gMix.x + gC * gMix.y + gSc * gMix.z;
        #endif
        float sm = smoothstep(0.2, 0.4, vSlope);
        diffuseColor.rgb *= mix(gC, rockC.rgb * cliffCol * 2.4, sm);
        // Auflage in Flecken (Schnee, Sand, Asche): auf flachen Stellen, nach grobem Muster, mit der Höhe zunehmend
        float gPat = gL2 * 0.3 + gL * 0.22;
        // Wiese: flache, tiefe Lagen bekommen die Farbe des Bewuchses (aus der Ferne wirkt das Gras so geschlossen)
        float vg = vegK * smoothstep(0.36, 0.5, gPat) * (1.0 - smoothstep(0.1, 0.24, vSlope)) * (1.0 - smoothstep(snowY - 60.0, snowY + 160.0, vWPos.y));
        #ifdef GSET
          vg *= 1.0 - 0.85 * gSetK * gSetVeg;      // mit Materialsatz bringen die Böden ihr Grün selbst mit
        #endif
        diffuseColor.rgb = mix(diffuseColor.rgb, vegCol * (0.55 + 0.5 * gL) * (0.6 + 0.4 * dot(gC, vec3(0.34))), vg);
        float sn = snowK * smoothstep(0.5, 0.64, gPat + clamp((vWPos.y - snowY) * 0.0009, -0.4, 0.2)) * (1.0 - smoothstep(0.14, 0.32, vSlope));
        diffuseColor.rgb = mix(diffuseColor.rgb, snowCol * (0.5 + 0.16 * gL), sn);`)
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        if (gHasR > 0.5) roughnessFactor = mix(mix(0.6, 1.0, gT(groundRgh, gP, gw, gB).r), roughness, sm);   // matt halten: glatte Stellen spiegelten sonst den Himmel
        #ifdef GSET
          roughnessFactor = mix(roughnessFactor, 0.93, (gMix.x + gMix.z) * (1.0 - sm));      // feiner Grund und Schutt: matt, ohne eigenes Rauheitsbild
        #endif`)
      .replace('#include <normal_fragment_maps>', `
        #ifdef USE_NORMALMAP_TANGENTSPACE
          vec3 nRock = texture2D(normalMap, vNormalMapUv).xyz * 2.0 - 1.0; nRock.xy *= normalScale;
          vec3 nView = normalize(tbn * nRock);
          if (gNrmK > 0.0) {
            // je Richtung ein eigener Tangentenrahmen; oben gilt der Rahmen der Geländekoordinaten (gleiche Ausrichtung wie x/z)
            mat3 fX = getTangentFrame(- vViewPosition, normal, gP.zy), fZ = getTangentFrame(- vViewPosition, normal, gP.xy);
            float k = gNrmK * (1.0 - 0.45 * gB.x) * (1.0 - 0.5 * gB.y) * mix(0.5, 1.0, gGraz); vec3 acc = vec3(0.0), q;
            if (gw.y > 0.01) { q = gS(groundNrm, gP.xz, gB) * 2.0 - 1.0; q.xy *= k; acc += gw.y * normalize(tbn * q); }
            if (gw.x > 0.01) { q = gS(groundNrm, gP.zy + 0.19, gB) * 2.0 - 1.0; q.xy *= k; acc += gw.x * normalize(fX * q); }
            if (gw.z > 0.01) { q = gS(groundNrm, gP.xy + 0.53, gB) * 2.0 - 1.0; q.xy *= k; acc += gw.z * normalize(fZ * q); }
            #ifdef GSET
              // Relief der weiteren Böden (von oben projiziert), gewichtet wie die Farbe
              vec3 nSet = normalize(acc) * gMix.y;
              if (gMix.x > 0.02) { q = gS(gFineNrm, vWPos.xz * gSetP.x, gB) * 2.0 - 1.0; q.xy *= k; nSet += gMix.x * normalize(tbn * q); }
              if (gMix.z > 0.02) { q = gS(gScreeNrm, vWPos.xz * gSetP.z, gB) * 2.0 - 1.0; q.xy *= k; nSet += gMix.z * normalize(tbn * q); }
              if (dot(nSet, nSet) > 1e-4) acc = nSet;
            #endif
            nView = normalize(mix(normalize(acc), nView, sm));
          }
          normal = nView;
        #endif`);
    // Gebäudeschatten der Bodenstation: nimmt das direkte Licht weg (das Himmelslicht bleibt)
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { float bS = bShade(vWPos); reflectedLight.directDiffuse *= bS; reflectedLight.directSpecular *= bS; }`);
    // Dunst sammelt sich in tiefen Lagen und wächst mit der Entfernung
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <fog_fragment>', `
        #ifdef USE_FOG
          float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          float mist = mistK * (1.0 - exp(-vFogDepth / 1500.0)) * exp(-max(vWPos.y - mistY, 0.0) / 130.0);
          fogFactor = clamp(fogFactor + mist * (1.0 - fogFactor), 0.0, 1.0);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
        #endif`);
  };
  m.customProgramCacheKey = () => (set ? 'ground-set' : 'ground');
}

// ---------------- Anflugzone im Orbit ----------------
export function addOrbitZone(sector: string) {
  const pd = PLANETS[sector], sec = SECTOR[sector];
  if (!pd || !sec.planet) return;
  const d = new THREE.Vector3(...sec.planet.dir).normalize(), h = new THREE.Vector3(d.x, 0, d.z).normalize();
  const D = sec.size?.orbit ?? 5000, x = h.x * D, z = h.z * D, y = clamp(d.y * 2200, -900, 900);   // großer Sektor: Anflugzone weiter draußen (galaxy.ts, size)
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
  updateFlora(camera.position);
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
// Seit 2026-11-24 die Fahrzeuge aus Blender (models/rover.ts): Bergbaurover „Dachs“ oder Erkundungsbuggy „Wiesel“ (P.fahrzeug).
// Solange das Modell lädt (und als Rückfall), steht der alte Rover aus Grundformen da; updateRover tauscht, sobald es geladen ist.
export const fzWahl = (): FzId => ausgabe(true)?.kind || 'dachs';
// an einer Planetenbasis gelandet? (dort stellt die Fahrzeughalle einen Leihrover bereit)
const anBasis = (x: number, z: number) => world.stations.some(s => Math.hypot(s.x - x, s.z - z) < 500);
export function buildRover(kind: FzId = fzWahl()): RoverModel { fzLaden(kind); return buildFahrzeug(kind) || buildRoverAlt(); }
function buildRoverAlt() {
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
  // Kein echtes Scheinwerferlicht mehr (seit 2026-11-18): Es stand immer auf 0, zählte aber als Licht – beim Landen brauchten dadurch alle
  // Materialien neue Shader (Standbild). Die Leuchtpunkte oben bleiben.
  const head = { intensity: 0 };
  boxUV(g, 1 / 3);
  return { g, body, wheels, drill, beacon, head, rads: [] as RoverRad[], neu: false as const, kind: 'dachs' as FzId, sensor: null, seat: null, wheel: null };
}
type RoverModel = ReturnType<typeof buildRoverAlt> | RoverNeu;
// Fahrzustand (seit 2026-11-24 mit Schwung, Federung und Seitenführung): vx/vz Tempo über Grund, vy senkrecht (Sprünge über Kuppen),
// spd Tempo längs, yr Drehrate, steer Lenkeinschlag (rad), pitch/roll Lage der Karosserie, air in der Luft, susp Einfederung je Rad.
// Seit 2026-11-25: thr/st geglättete Eingabe (Gas −1…1, Lenkung −1…1), hb Handbremse gezogen, rpm Drehzahl, gear Gang (0 = rückwärts),
// shift verbleibende Schaltpause (s), view Kamera (0 Verfolger, 1 Motorhaube bzw. Fahrersitz)
export const ROVER = {
  active: false, x: 0, y: 0, z: 0, yaw: 0, speed: 0, model: null as RoverModel | null, kind: 'dachs' as FzId,
  ship: { x: 0, y: 0, z: 0, yaw: 0 }, target: null as Asteroid | null, acc: 0, drilling: false, prompt: '',
  cap: 40, warn: 0, leih: false, ohne: false,      // leih: Leihrover der Basis; ohne: kein Fahrzeug (zu Fuß, game/fahrzeuge.ts)
  vx: 0, vy: 0, vz: 0, yr: 0, steer: 0, pitch: 0, roll: 0, air: false, susp: [0, 0, 0, 0, 0, 0], slip: 0,
  thr: 0, st: 0, hb: false, rpm: 900, gear: 1, shift: 0, view: 0,
};
// Motor und Eingabe in Ruhe (Aussetzen, Fahrzeugtausch)
function roverStill() { const R = ROVER; R.thr = R.st = 0; R.hb = false; R.rpm = GETRIEBE.idle; R.gear = 1; R.shift = 0; }
export const roverLoad = () => ITEM_IDS.reduce((a, k) => a + (P.rover?.[k] || 0), 0);

// quiet: beim Laden eines Spielstands (main.ts, resumeAt) – ohne Prüfung der Fluglage, ohne Staub, Ton und Funk
export function landShip(quiet = false, basis = false) {
  const li = quiet ? null : landInfo();
  if (!quiet && (!li || !li.ok)) { if (li) radio('SYSTEM', li.text + '.'); return false; }
  const r = stats().radius;
  ROVER.ship = { x: P.x, y: heightAt(P.x, P.z) + r * 0.55, z: P.z, yaw: P.yaw };
  P.vx = P.vy = P.vz = 0; P.pitch = 0;
  if (!P.rover) P.rover = {};
  // Fahrzeug nur, wenn eins an Bord ist, an einer Basis sonst der Leihrover; sonst zu Fuß (game/fahrzeuge.ts)
  const aus = ausgabe(basis || anBasis(P.x, P.z));
  ROVER.ohne = !aus; ROVER.leih = !!aus?.leih;
  if (!aus) {
    if (ROVER.model) { scene.remove(ROVER.model.g); ROVER.model = null; }
    fahrerWeg(); ROVER.x = P.x; ROVER.z = P.z; ROVER.y = heightAt(P.x, P.z); ROVER.yaw = P.yaw; ROVER.speed = 0; ROVER.active = true;
    if (!quiet) { burst(P.x, heightAt(P.x, P.z) + 1, P.z, '#4a4238', 24, 12, 0.9); snd(180, 0.6, 'sawtooth', 0.04, -80); radio('SYSTEM', `Gelandet. Die ${P.shipName} trägt kein Fahrzeug: zu Fuß hinaus. Leihrover gibt es an jeder Planetenbasis, eigene Fahrzeuge fahren in Kormoran, Pfeil oder Wisent mit.`); }
    return true;
  }
  const kind = aus.kind;
  if (ROVER.model && ROVER.model.kind !== kind && ROVER.model.neu) { scene.remove(ROVER.model.g); ROVER.model = null; }
  const m = ROVER.model || buildRover(kind);
  ROVER.model = m; ROVER.kind = kind; ROVER.cap = FZ[kind].cap;
  ROVER.vx = ROVER.vz = ROVER.vy = 0; ROVER.air = false; ROVER.yr = ROVER.steer = 0; roverStill();
  scene.add(m.g);
  const rx = Math.cos(P.yaw), rz = -Math.sin(P.yaw);
  ROVER.x = P.x + rx * (r + 7); ROVER.z = P.z + rz * (r + 7); ROVER.yaw = P.yaw; ROVER.speed = 0;
  ROVER.y = heightAt(ROVER.x, ROVER.z);
  ROVER.active = true;
  m.head.intensity = 0;
  if (quiet) return true;
  burst(ROVER.x, ROVER.y + 1, ROVER.z, '#4a4238', 30, 14, 1.0);
  snd(180, 0.6, 'sawtooth', 0.04, -80);
  const mehr = wahl(basis || anBasis(P.x, P.z)).length > 1 ? ' [X] am Schiff: anderes Fahrzeug.' : '';
  radio('SYSTEM', aus.leih ? `Die Fahrzeughalle der Basis stellt dir einen Leihrover „Dachs“ bereit: WASD fahren, Klick halten zum Bohren. Er bleibt auf dem Planeten.${mehr}`
    : kind === 'wiesel' ? `Gelandet. Buggy aus dem Laderaum: WASD fahren, [R] Umgebung abtasten, [E] am Schiff einsteigen.${mehr}`
    : `Gelandet. Rover aus dem Laderaum: WASD fahren, Klick halten zum Bohren, [E] am Schiff einsteigen.${mehr}`);
  return true;
}

// Spielstand auf dem Planeten geladen (main.ts, resumeAt): Schiff und Rover stehen wieder, wo sie beim Speichern standen
export function relandShip(ship: { x: number; y: number; z: number; yaw: number }, rover: { x: number; z: number; yaw: number }) {
  P.x = ship.x; P.y = ship.y; P.z = ship.z; P.yaw = ship.yaw;
  landShip(true);
  if (ROVER.ohne) { ROVER.ship = { ...ship }; return; }
  ROVER.ship = { ...ship };
  if (isFinite(rover.x) && isFinite(rover.z) && Math.abs(rover.x) < SURF.limit && Math.abs(rover.z) < SURF.limit && !liquidAt(rover.x, rover.z)) {
    ROVER.x = rover.x; ROVER.z = rover.z; ROVER.yaw = rover.yaw || 0; ROVER.y = heightAt(ROVER.x, ROVER.z);
  }
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
// Am Schiff das andere Fahrzeug nehmen (Taste X, main.ts): Der Dachs lädt vorher seine Ladung ins Schiff. null: kein zweites Fahrzeug.
export function fahrzeugTauschen(): string | null {
  const w = wahl(anBasis(ROVER.ship.x, ROVER.ship.z));
  if (!ROVER.model || w.length < 2) return null;
  const i = w.findIndex(q => q.kind === ROVER.kind && q.leih === ROVER.leih), nx = w[(i + 1) % w.length], neu: FzId = nx.kind;
  ROVER.leih = nx.leih;
  let msg = '';
  if (ROVER.kind === 'dachs' && roverLoad()) { const { moved, left } = unloadRover(); msg = moved ? ` ${moved} Einheiten Erz in den Frachtraum verladen.${left ? ` ${left} bleiben im Dachs.` : ''}` : ''; }
  scene.remove(ROVER.model.g); fahrerWeg(); laserSound(false);
  P.fahrzeug = neu; ROVER.kind = neu; ROVER.cap = FZ[neu].cap;
  const m = buildRover(neu); ROVER.model = m; scene.add(m.g);
  const r = stats().radius, rx = Math.cos(ROVER.ship.yaw), rz = -Math.sin(ROVER.ship.yaw);
  ROVER.x = ROVER.ship.x + rx * (r + 7); ROVER.z = ROVER.ship.z + rz * (r + 7); ROVER.yaw = ROVER.ship.yaw; ROVER.y = heightAt(ROVER.x, ROVER.z);
  ROVER.vx = ROVER.vz = ROVER.vy = 0; ROVER.speed = 0; ROVER.air = false; ROVER.yr = ROVER.steer = 0; roverStill(); ROVER.drilling = false; ROVER.target = null;
  camInit = false;
  snd(220, 0.5, 'sawtooth', 0.04, 120);
  return (nx.leih ? 'Leihrover „Dachs“ der Basis genommen.' : neu === 'wiesel' ? 'Buggy „Wiesel“ aus dem Laderaum. [R] tastet die Umgebung ab.' : 'Rover „Dachs“ aus dem Laderaum.') + msg;
}
export function boardShip() {
  const { moved, left } = unloadRover();
  ROVER.active = false;
  laserSound(false); fahrerWeg(); wieselScanWeg();
  if (ROVER.model) scene.remove(ROVER.model.g);
  P.x = ROVER.ship.x; P.y = ROVER.ship.y + 14; P.z = ROVER.ship.z; P.yaw = ROVER.ship.yaw; P.pitch = 0;
  P.vx = P.vy = P.vz = 0;
  G.camInit = false;
  snd(300, 0.6, 'sawtooth', 0.05, 500);
  const fz = ROVER.ohne ? '' : ROVER.leih ? ' Der Leihrover fährt zurück in die Halle der Basis.' : ' Fahrzeug im Laderaum.';
  radio('SYSTEM', (moved ? `${moved} Einheiten in den Frachtraum verladen.${left ? ` ${left} passen nicht mehr und bleiben im Rover.` : ''}` : 'An Bord. Abheben mit [W].') + fz);
}

// Motor mit Drehzahl und fünf Gängen (seit 2026-11-25, Werte wie im Fahrzeug-Template aus Unreal 5.8): Die Drehzahl folgt aus dem Tempo,
// dem Radradius und der Übersetzung; der Maßstab ist so gewählt, dass das Höchsttempo mit Umschalt im 5. Gang bei rpmTop liegt (das Spiel
// fährt schneller, als die echten Übersetzungen hergäben). Hochschalten bei 6000, runter bei 2000, dazwischen 0,2 s Schaltpause mit
// kurzem Zugkraftloch (updateRover). Rückwärts fährt im 1. Gang (Anzeige R). In der Luft dreht der Motor frei hoch.
function roverMotor(dt: number, vF: number, th: number, radR: number, vB: number, rpmTop: number) {
  const R = ROVER, T = GETRIEBE, k = rpmTop / (vB / radR * T.achse * 60 / (2 * Math.PI));
  const rpmIn = (g: number) => Math.abs(vF) / radR * T.g[g - 1] * T.achse * 60 / (2 * Math.PI) * k;
  R.shift = Math.max(0, R.shift - dt);
  if (vF < -0.5 && th < 0) R.gear = 0;
  else if (R.gear === 0) R.gear = 1;
  else if (R.shift <= 0 && !R.air) {
    if (R.gear < T.g.length && rpmIn(R.gear) > T.hoch && th > 0) { R.gear++; R.shift = T.pause; }
    else if (R.gear > 1 && rpmIn(R.gear) < T.runter) { R.gear--; R.shift = T.pause * 0.5; }
  }
  const g = Math.max(1, R.gear);
  // Kupplung: bei kleinem Tempo hält das Gas die Drehzahl über dem Leerlauf; in der Luft und in der Schaltpause dreht er nach dem Gas
  let want = Math.max(T.idle + Math.abs(th) * (g === 1 ? 2200 : 900), rpmIn(g));
  if (R.air) want = T.idle + Math.abs(th) * (T.max - T.idle) * 0.85;
  else if (R.shift > 0) want = Math.max(T.idle, rpmIn(g) * (0.85 + 0.15 * Math.abs(th)));
  want = Math.min(want, T.max + (Math.abs(th) > 0 ? Math.sin(G.time * 60) * 120 : 0));      // Begrenzer: flattert am Anschlag
  R.rpm += (want - R.rpm) * Math.min(1, dt * (R.air ? 5 : 14));
}

const _f = new THREE.Vector3();
export function updateRover(dt: number) {
  updateFlora(camera.position);
  if (!ROVER.active || !ROVER.model) return;
  const m = ROVER.model, R = ROVER;
  R.warn -= dt;
  // Modell aus Blender nachgeladen: austauschen
  if (!m.neu || m.kind !== R.kind) {
    if (!fzBereit(R.kind)) fzLaden(R.kind);
    else { const n = buildFahrzeug(R.kind); if (n) { scene.remove(m.g); fahrerWeg(); ROVER.model = n; scene.add(n.g); return; } }
  }
  // ---------- Fahren (seit 2026-11-24): Schwung, Hangabtrieb, Seitenführung, Federung, Sprünge über Kuppen ----------
  // Vorher wurde der Rover einfach auf die Geländehöhe gesetzt und fuhr wie auf Schienen (Tempo längs, keine Trägheit, keine Federung).
  // Die Werte je Fahrzeug stehen in models/rover.ts (FZ): der schwere Dachs, der leichte, schnelle Wiesel.
  const F = FZ[R.kind];
  const thK = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), stK = (keys.KeyA || keys.ArrowLeft ? 1 : 0) - (keys.KeyD || keys.ArrowRight ? 1 : 0);
  // Eingabe glätten (seit 2026-11-25, wie im Fahrzeug-Template): Gas und Lenkung laufen mit begrenzter Rate auf den Tastenwert zu, zurück
  // schneller als hin; die Lenkung wirkt quadratisch (kleine Ausschläge fein, voller Einschlag erst am Ende)
  const ramp = (cur: number, want: number, up: number, down: number) => {
    const rate = Math.abs(want) > Math.abs(cur) && want * cur >= 0 ? up : down;
    return cur + clamp(want - cur, -rate * dt, rate * dt);
  };
  R.thr = ramp(R.thr, thK, F.inp[0], F.inp[1]); R.st = ramp(R.st, stK, F.inp[2], F.inp[3]);
  const th = Math.abs(R.thr) < 0.02 ? 0 : R.thr, stIn = Math.sign(R.st) * R.st * R.st;
  // Handbremse (Q, im Wiesel auch Leertaste: er hat keinen Bohrer): blockiert die Hinterräder
  R.hb = !!(keys.KeyQ || (R.kind === 'wiesel' && keys.Space)) && !G.dead;
  const boost = !!(keys.ShiftLeft || keys.ShiftRight), ice = curType === PTYPE.eis || (curType as any)?.rock === 'ice';
  const hbOn = R.hb && !R.air, HB = F.hb;
  const GR = 9.0, VMAX = boost ? F.vB : F.v, ENG = boost ? F.engB : F.eng, BRAKE = F.brake, ROLL = 0.35, WB = F.wb, DRAG = F.drag, RADR = F.radR;
  const fx = -Math.sin(R.yaw), fz = -Math.cos(R.yaw), rx0 = Math.cos(R.yaw), rz0 = -Math.sin(R.yaw);
  // Gelände unter den Rädern: Ebene durch die Radpunkte (vorn/hinten, links/rechts)
  const hAt = (lx: number, lz: number) => heightAt(R.x + rx0 * lx - fx * lz, R.z + rz0 * lx - fz * lz);      // lz: −vorn … +hinten (Spielachsen)
  const ht = F.trk / 2, axF = F.ax[0], axB = F.ax[F.ax.length - 1];
  const gh = F.ax.map(z => [hAt(-ht, z), hAt(ht, z)]);
  const front = (gh[0][0] + gh[0][1]) / 2, back = (gh[gh.length - 1][0] + gh[gh.length - 1][1]) / 2;
  const left = gh.reduce((a, h) => a + h[0], 0) / gh.length, right = gh.reduce((a, h) => a + h[1], 0) / gh.length;
  const gPitch = Math.atan2(front - back, axB - axF), gRoll = Math.atan2(right - left, F.trk);
  // Tempo längs und quer im Bezug des Fahrzeugs
  let vF = R.vx * fx + R.vz * fz, vL = R.vx * rx0 + R.vz * rz0;
  const onGround = !R.air;
  if (onGround) {
    // Antrieb und Bremse
    // Zugkraft nimmt mit dem Tempo ab, die Drehmomentkurve formt sie leicht, in der Schaltpause fast keine, am Begrenzer keine
    const zug = (R.shift > 0 ? 0.15 : 1) * (R.rpm >= GETRIEBE.max - 50 && R.gear === GETRIEBE.g.length ? 0 : 1) * (0.72 + 0.3 * drehmoment(R.rpm));
    if (th > 0) vF += (vF < -0.5 ? BRAKE : vF < VMAX ? ENG * zug * (1 - 0.6 * clamp(vF / VMAX, 0, 1)) : 0) * th * dt;
    else if (th < 0) vF -= (vF > 0.5 ? BRAKE : ENG * 0.6 * zug) * -th * dt;
    vF -= Math.sign(vF) * Math.min(Math.abs(vF), (ROLL + (th === 0 ? 0.5 : 0)) * dt);      // Rollwiderstand, ohne Gas etwas mehr (Motorbremse)
    if (hbOn) vF -= Math.sign(vF) * Math.min(Math.abs(vF), HB.brk * dt);                   // Handbremse: blockierte Hinterräder bremsen längs nur mäßig
    vF -= vF * Math.abs(vF) * DRAG * dt;                                                 // Luft- und Bodenwiderstand
    vF = clamp(vF, -9, VMAX + 4);
    // Hangabtrieb: Schwerkraft längs der Fläche (bergab schneller, bergauf langsamer; zu steil = kein Hochkommen). Steht der Rover ohne Gas
    // langsam auf flachem Hang, hält die Feststellbremse.
    const slopeF = Math.sin(gPitch), slopeL = Math.sin(gRoll);
    const hold = (th === 0 || hbOn) && Math.abs(vF) < 1.2 && Math.abs(slopeF) < 0.45 && Math.abs(slopeL) < 0.5;
    if (!hold) { vF -= GR * slopeF * dt; vL -= GR * slopeL * dt * 0.6; } else { vF *= Math.pow(0.02, dt); }
    // Seitenführung: Quertempo wird von den Reifen aufgefangen (auf Eis deutlich weniger: der Rover rutscht in Kurven)
    // Handbremse: hinten fast keine Seitenführung mehr, das Heck kommt (Drift)
    const grip = (ice ? F.gripEis : F.grip) * (1 - 0.3 * WETTER.sturm) * (hbOn ? HB.grip : 1);      // im Sturm (wetter.ts) halten die Reifen schlechter
    R.slip = Math.abs(vL);
    vL *= Math.exp(-grip * dt);
    // Lenkung: Einschlag nimmt mit dem Tempo ab; Drehrate nach Einspurmodell, weich nachgeführt
    const maxSt = F.steer - F.steerFade * clamp(Math.abs(vF) / F.steerRef, 0, 1);
    R.steer += (stIn * maxSt - R.steer) * Math.min(1, dt * 10);      // die Eingabe ist schon geglättet
    // Querbeschleunigung begrenzt (Reifen halten so viel, wie sie halten: Dachs 8 m/s², Wiesel 10, auf Eis weniger): schnelle Kurven werden weiter
    // Handbremse: das Heck bricht aus, das Fahrzeug dreht stärker ein, als die Reifen sonst zulassen
    const yrMax = (ice ? F.latEis : F.lat) / Math.max(2, Math.abs(vF)) * (hbOn ? HB.yr : 1);
    const wantYr = clamp((vF * Math.tan(R.steer)) / WB * (hbOn ? 1 + (HB.yr - 1) * 0.6 : 1), -yrMax, yrMax) + (Math.abs(vF) < 0.8 ? stIn * 0.35 : 0);      // im Stand ein wenig auf der Stelle drehen
    R.yr += (wantYr - R.yr) * Math.min(1, dt * (ice ? 4.5 : 8));
  } else { R.steer *= Math.pow(0.3, dt); R.yr *= Math.pow(0.6, dt); }
  R.yaw += R.yr * dt;
  roverMotor(dt, vF, th, F.radR, F.vB, F.rpmTop);
  const fx2 = -Math.sin(R.yaw), fz2 = -Math.cos(R.yaw), rx2 = Math.cos(R.yaw), rz2 = -Math.sin(R.yaw);
  // Bewegung bleibt in der alten Richtung: Hat sich das Fahrzeug gedreht, erscheint das im nächsten Bild als Quertempo, das die Reifen
  // abbauen (normal schnell, auf Eis langsam: der Rover driftet)
  R.vx = fx * vF + rx0 * vL; R.vz = fz * vF + rz0 * vL; R.speed = vF;
  let nx = R.x + R.vx * dt, nz = R.z + R.vz * dt;
  // Wasser und Lava sind eine Grenze, ebenso der Kartenrand
  if (liquidAt(nx, nz)) {
    const L = curType?.liquid;
    if (R.warn <= 0) { radio('SYSTEM', L?.deadly ? 'Lava! Zu heiß für den Rover.' : `${L?.n || 'Wasser'}: Der Rover kann hier nicht weiter.`); R.warn = 3; }
    nx = R.x; nz = R.z; R.vx *= -0.2; R.vz *= -0.2;
  }
  if (Math.abs(nx) > SURF.limit || Math.abs(nz) > SURF.limit) { nx = R.x; nz = R.z; R.vx = R.vz = 0; }
  // Kollision mit Lagerstätten, Station, Schiff, Wracks: hinausschieben, Tempo in die Wand weg (mit etwas Rückprall)
  const obst: { x: number; z: number; r: number }[] = world.asteroids.map(a => ({ x: a.x, z: a.z, r: a.r * 0.85 + 2.0 }));
  for (const s of world.stations) obst.push({ x: s.x, z: s.z, r: 34 }, { x: s.dock.x, z: s.dock.z, r: 6 });
  obst.push({ x: R.ship.x, z: R.ship.z, r: stats().radius * 0.75 + 2.0 });
  for (const w of SALV.wrecks) obst.push({ x: w.x, z: w.z, r: w.r + 2.4 });
  for (const b of BODEN_OBST) obst.push({ x: b.x, z: b.z, r: b.r + 2.0 });      // Außenstelle, verunglückter Rover (bodenaufgaben.ts)
  for (const o of obst) {
    const d = Math.hypot(nx - o.x, nz - o.z);
    if (d >= o.r) continue;
    const ux = (nx - o.x) / d, uz = (nz - o.z) / d, vn = R.vx * ux + R.vz * uz;
    nx = o.x + ux * o.r; nz = o.z + uz * o.r;
    if (vn < 0) { R.vx -= ux * vn * 1.3; R.vz -= uz * vn * 1.3; if (vn < -6) { snd(70, 0.25, 'triangle', 0.06, -30); burst(nx - ux * 2, R.y + 1, nz - uz * 2, '#6a6058', 12, 6, 0.6); } }
  }
  R.x = nx; R.z = nz;
  // Senkrecht: am Boden folgt der Rover dem Gelände (das Tempo nach oben bleibt erhalten); fällt der Boden schneller weg als die Schwerkraft
  // zieht, hebt er ab und landet mit Federschlag
  const gNow = (heightAt(R.x - fx2 * axF, R.z - fz2 * axF) + heightAt(R.x - fx2 * axB, R.z - fz2 * axB) + 2 * heightAt(R.x, R.z)) / 4;
  if (!R.air) {
    const vyG = dt > 0 ? (gNow - R.y) / dt : 0, J = F.jump;
    if (vyG < R.vy - GR * dt * J.k - J.abs && vyG < J.vy && Math.abs(vF) > J.v) { R.air = true; R.vy = Math.min(Math.max(R.vy, 0) * 0.6, 5); }      // Kuppe: der Boden fällt weg (Schwung nach oben begrenzt)
    else { R.vy = clamp(vyG, -30, 30); R.y = gNow; }
  }
  if (R.air) {
    const hAir = R.y - gNow; R.vy -= (GR * 1.8 + Math.max(0, hAir - 2) * 5) * dt; R.y += R.vy * dt;      // in der Luft schwerer als am Boden, je höher desto mehr: kurze Sprünge statt Segeln über Hänge
    if (R.y <= gNow) {
      const hard = -R.vy; R.y = gNow; R.vy = 0; R.air = false;
      if (hard > 4) { snd(60 + Math.random() * 20, 0.3, 'triangle', clamp(hard / 60, 0.03, 0.12), -30); for (let i = 0; i < 10; i++) puff(R.x + rand(-2, 2), R.y + 0.3, R.z + rand(-2, 2), rand(-4, 4), rand(1, 4), rand(-4, 4), '#3a342c', 1.2); R.pitch -= clamp(hard * 0.008, 0, 0.12); }
    }
  }
  // Karosserie: Lage aus der Geländeebene, dazu Einnicken beim Bremsen/Beschleunigen und Neigen in der Kurve (gefedert, weich)
  const aF = th, aL = vF * R.yr;
  const wantP = (R.air ? R.pitch : gPitch) - aF * F.squat * (onGround ? 1 : 0), wantR = (R.air ? R.roll : gRoll) - clamp(aL * F.lean, -0.1, 0.1);
  R.pitch += (wantP - R.pitch) * Math.min(1, dt * (R.air ? 1.5 : 9)); R.roll += (wantR - R.roll) * Math.min(1, dt * (R.air ? 1.5 : 9));
  m.g.position.set(R.x, R.y, R.z);
  m.g.rotation.order = 'YXZ';
  m.g.rotation.set(R.pitch, R.yaw, R.roll);
  // Räder: einfedern bis zum Boden unter jedem Rad (in Senken aus-, auf Buckeln einfedern), drehen mit dem Tempo, vorn lenken
  m.g.updateMatrixWorld(true);
  const spinD = vF * dt / RADR, [s0, s1] = F.susp;
  if (m.rads.length) m.rads.forEach((w, i) => {
    const lx = w.rest.x, lz = w.rest.z, hub = _f.set(lx, w.rest.y, lz).applyMatrix4(m.g.matrixWorld);
    const want = R.air ? s0 : clamp(heightAt(hub.x, hub.z) + RADR - hub.y, s0, s1);
    R.susp[i] += (want - R.susp[i]) * Math.min(1, dt * 18);
    w.mount.position.set(w.rest.x, w.rest.y + R.susp[i], w.rest.z);
    w.mount.rotation.y = w.front ? R.steer : 0;
    w.spin.rotation.x -= spinD;
  });
  else for (const w of m.wheels) w.rotation.x += vF * dt / 0.75;
  (m.beacon.material as THREE.SpriteMaterial).opacity = Math.sin(G.time * 6) > 0 ? 1 : 0.2;
  // Staub hinter den Rädern: mit dem Tempo, mehr beim Rutschen
  if (!R.air && (Math.abs(vF) > 4 || R.slip > 2) && Math.random() < 0.18 + Math.min(0.5, R.slip * 0.08) + (hbOn && Math.abs(vF) > 3 ? 0.3 : 0)) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const back = axB + RADR * 0.5;
    puff(R.x - fx2 * back + rx2 * side * ht + rand(-0.4, 0.4), R.y + 0.3, R.z - fz2 * back + rz2 * side * ht + rand(-0.4, 0.4), -R.vx * 0.15 + rand(-1.5, 1.5), rand(0.8, 2.5), -R.vz * 0.15 + rand(-1.5, 1.5), ice ? '#cfd8e0' : '#3a342c', R.kind === 'wiesel' ? 0.8 : 1.0);
  }
  // Wiesel: Radarleiste dreht, Fahrer im Sitz, Abtasten der Umgebung (wiesel.ts); kein Bohrer
  if (m.sensor) m.sensor.rotation.y += (WSCAN.t >= 0 ? 9 : 2.2) * dt;
  updateFahrer(m, dt);
  if (R.view === 1) fahrerZeigen(false);      // Fahrersicht: die eigene Figur nicht von innen sehen
  if (m.neu) for (const c of m.body.children) if (c.userData.vorn) c.visible = R.view !== 1;      // und nicht in die eigenen Scheinwerfer
  if (R.kind === 'wiesel') updateWieselScan(dt);
  // Bohren (nur der Dachs)
  const dpx = R.x + fx2 * 4.2, dpz = R.z + fz2 * 4.2, dpy = R.y + 1.1;
  R.target = null;
  let bd = 1e9;
  if (F.cap > 0) for (const a of world.asteroids) { const d = d3(dpx, dpy, dpz, a.x, a.y, a.z) - a.r; if (d < 3.5 && d < bd) { bd = d; R.target = a; } }
  R.drilling = !!(mouse.down || keys.Space) && !!R.target && !G.dead;
  if (m.neu) m.drill.rotation.z += (R.drilling ? 30 : 2) * dt; else m.drill.rotation.y += (R.drilling ? 30 : 2) * dt;
  if (R.drilling && R.target) {
    const a = R.target;
    laserSound(true, 30);
    for (let i = 0; i < 2; i++) puff(dpx, dpy, dpz, rand(-6, 6), rand(1, 8), rand(-6, 6), Math.random() < 0.5 ? '#ffd27a' : ITEMS[a.comp[0].k].c, 0.5);
    R.acc += 2.4 * dt * gearFactor('abbau');
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
  const tausch = (P.fahrzeuge || []).includes('wiesel') ? ` · [X] ${R.kind === 'dachs' ? 'Buggy nehmen' : 'Dachs nehmen'}` : '';
  R.prompt = dShip < stats().radius + 12 ? `[E] ${settings.walk ? `An Bord der ${P.shipName} gehen` : `In die ${P.shipName} einsteigen`}${R.kind === 'dachs' && roverLoad() ? ` und ${roverLoad()} E verladen` : ''}${tausch}` : R.target ? (roverLoad() >= R.cap ? 'Rover voll' : 'Klick halten: bohren') : '';
}
export const nearShip = () => ROVER.active && Math.hypot(ROVER.x - ROVER.ship.x, ROVER.z - ROVER.ship.z) < stats().radius + 12;

// Gelandetes Schiff an seinem Platz halten
export function syncLandedShip() {
  SHIP.g.position.set(ROVER.ship.x, ROVER.ship.y, ROVER.ship.z);
  SHIP.g.rotation.set(0, ROVER.ship.yaw, 0);
  SHIP.g.visible = true;
  for (const g2 of SHIP.glows) g2.scale.setScalar(0.6 * (g2.userData.base || 1));
}

// Verfolgerkamera hinter dem Rover. Seit 2026-11-25: Die Kamera schwenkt der Drehung verzögert nach (FZ.camLag; in Drifts sieht man
// das Fahrzeug schräg), das Sichtfeld weitet sich mit dem Tempo (FZ.fov), V schaltet auf Motorhauben- bzw. Fahrersicht (FZ.hood)
const _cam = new THREE.Vector3(), _look = new THREE.Vector3(), _hq = new THREE.Quaternion(), _hx = new THREE.Quaternion(), _xa = new THREE.Vector3(1, 0, 0);
let camInit = false, camYaw = 0, camFov = 70;
export function roverCamera(dt: number) {
  const R = ROVER, F = FZ[R.kind];
  if (!camInit) { camYaw = R.yaw; camFov = F.fov[0]; }
  // Sichtfeld mit dem Tempo, weich nachgeführt
  camFov += (F.fov[0] + (F.fov[1] - F.fov[0]) * clamp(Math.abs(R.speed) / F.vB, 0, 1) - camFov) * Math.min(1, dt * 2.5);
  if (Math.abs(camera.fov - camFov) > 0.05) { camera.fov = camFov; camera.updateProjectionMatrix(); }
  const m = R.model;
  if (R.view === 1 && m) {
    // Motorhaube (Dachs) bzw. Fahrersitz (Wiesel): fest am Aufbau, leicht nach unten geneigt (hood[3])
    m.g.updateMatrixWorld(true);
    _cam.set(F.hood[0], F.hood[1], F.hood[2]); m.body.localToWorld(_cam);
    camera.position.copy(_cam);
    m.body.getWorldQuaternion(_hq); camera.quaternion.copy(_hq).multiply(_hx.setFromAxisAngle(_xa, F.hood[3]));
    camYaw = R.yaw; camInit = true;
    return;
  }
  // Drehung verzögert nachschwenken (kürzester Weg)
  let d = R.yaw - camYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
  camYaw += d * (1 - Math.exp(-dt * F.camLag));
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), hx = -Math.sin(R.yaw), hz = -Math.cos(R.yaw);
  const [cb, cu] = F.cam, want = new THREE.Vector3(R.x - fx * cb, 0, R.z - fz * cb);
  want.y = Math.max(R.y + cu, heightAt(want.x, want.z) + 2.5);
  if (!camInit) { _cam.copy(want); camInit = true; }
  _cam.lerp(want, 1 - Math.exp(-dt * 8));
  camera.position.copy(_cam);
  // Blickpunkt: vor dem Fahrzeug, halb in Kamera-, halb in Fahrzeugrichtung
  _look.set(R.x + (fx + hx) * 4, R.y + 2, R.z + (fz + hz) * 4);
  camera.lookAt(_look);
}
// V im Fahrzeug (main.ts): Verfolger ↔ Motorhaube/Fahrersitz
export function roverView() {
  ROVER.view = ROVER.view ? 0 : 1; camInit = false;
  if (!ROVER.view) fahrerZeigen(true);
  return ROVER.view;
}
export function resetRoverCamera() { camInit = false; }

// ---------------- Anzeige für den Rover ----------------
// Motor (seit 2026-11-25): Gang, Drehzahlbalken mit rotem Bereich ab dem Schaltpunkt, Handbremse. Unterste Zeile im Panel.
function drawMotor(w: number) {
  const R = ROVER, T = GETRIEBE, y = 132, bw = w - 28 - 74, f = clamp(R.rpm / T.max, 0, 1);
  ux.save();
  ux.textAlign = 'left'; ux.font = '700 13px "Share Tech Mono",Consolas,monospace';
  ux.fillStyle = R.shift > 0 ? '#8aa0b0' : '#e4eef5'; ux.fillText(R.gear === 0 ? 'R' : String(R.gear), 14, y + 5);
  ux.fillStyle = '#0e1e28'; ux.fillRect(30, y - 4, bw, 8);
  ux.fillStyle = 'rgba(255,90,70,.35)'; ux.fillRect(30 + bw * T.hoch / T.max, y - 4, bw * (1 - T.hoch / T.max), 8);
  ux.fillStyle = R.rpm > T.hoch ? '#ff6b5b' : '#e09030'; ux.fillRect(30, y - 4, bw * f, 8);
  ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'right';
  ux.fillStyle = R.hb ? '#ff6b5b' : '#8aa0b0'; ux.fillText(R.hb ? 'HANDBR.' : `${Math.round(R.rpm / 100) * 100}`, w - 14, y + 4);
  ux.restore();
}
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
  if (R.kind === 'wiesel') drawWieselScan(R.x, R.z);      // Funde des Sensormasts (wiesel.ts)
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
  ux.textAlign = 'left'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#e09030'; ux.fillText(R.kind === 'wiesel' ? 'ERKUNDUNGSBUGGY' : 'BERGBAU-ROVER', 14, 20);
  ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#e4eef5'; ux.fillText(`${Math.abs(Math.round(R.speed * 3.6))} km/h`, w - 14, 20);
  drawMotor(w);
  if (R.kind === 'wiesel') {
    // Sensormast: Bereitschaft, letzter Scan, Funde in der Anzeige
    const S = WSCAN, n = S.funde.length, cool = S.cool > 0;
    ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.fillText('SENSORMAST', 14, 46);
    ux.textAlign = 'right'; ux.fillStyle = cool ? '#8aa0b0' : '#7fe0c0'; ux.fillText(cool ? `lädt · ${Math.ceil(S.cool)} s` : '[R] bereit', w - 14, 46);
    ux.fillStyle = '#0e1e28'; ux.fillRect(14, 52, w - 28, 6); ux.fillStyle = '#4fd6c4'; ux.fillRect(14, 52, (w - 28) * (1 - clamp(S.cool / S.coolMax, 0, 1)), 6);
    ux.textAlign = 'left'; ux.fillStyle = n ? '#e4eef5' : '#4a5c6a';
    ux.fillText(n ? S.zeile : 'Noch nichts abgetastet: [R] drücken', 14, 76);
    ux.fillStyle = '#8aa0b0'; ux.fillText(n ? `Anzeige noch ${Math.ceil(S.life)} s · Reichweite ${fmtN(S.range)} m` : `Reichweite ${fmtN(S.range)} m`, 14, 98);
    ux.fillText(`Schiff: ${Math.round(dShip)} m · Fracht ${cargoUsed()}/${stats().cargo}`, 14, 120);
    ux.restore();
    drawRoverPrompt(W, H);
    return;
  }
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
  drawRoverPrompt(W, H);
}
function drawRoverPrompt(W: number, H: number) {
  const R = ROVER;
  if (!R.prompt) return;
  ux.save(); ux.font = '600 14px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
  const tw = ux.measureText(R.prompt).width + 30, y = H * 0.66;
  ux.fillStyle = 'rgba(6,16,26,.88)'; ux.strokeStyle = '#e09030'; ux.lineWidth = 1;
  ux.beginPath(); ux.rect(W / 2 - tw / 2, y - 20, tw, 32); ux.fill(); ux.stroke();
  ux.fillStyle = '#e09030'; ux.fillText(R.prompt, W / 2, y + 1);
  ux.restore();
}
bodenHooks(k => buildRover(k) as any, (x, z) => liquidAt(x, z));
export function hideRover() { if (ROVER.model) scene.remove(ROVER.model.g); ROVER.active = false; fahrerWeg(); wieselScanWeg(); }
