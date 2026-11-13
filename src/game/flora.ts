import * as THREE from 'three';
import { KEEP } from './keep';
import { scene } from '../core/engine';
import { texMat, std } from '../core/textures';
import { world, rockGeo } from './world';

// =====================================================================================
// Bewuchs und Dekoration der Planetenoberflächen.
//  - Felsbrocken und Felsnadeln stehen fest über die ganze Karte verteilt (Instanzen, kaum Kosten).
//  - Gras, Büsche und Bäume entstehen nur rund um die Kamera und ziehen mit: Die Welt ist in Zellen geteilt, eine feste
//    Zufallszahl je Zelle entscheidet über Pflanze, Platz und Größe. So steht jede Pflanze immer am selben Ort.
// Was wächst, steht je Planetentyp in FLORA.
// =====================================================================================

interface FloraDef {
  grass: number; grassCol: number; shrub: number; shrubCol: number; tree: number; glow?: number;
  spire: number; spireCol: number; spireRough: number; spireGlow?: number; spireH: [number, number]; rock: number;
  stones?: number; stoneCol?: number;      // Geröll rund um die Kamera (Dichte 0–1, Farbe)
}
export const FLORA: Record<string, FloraDef> = {
  fels: { grass: 0.85, grassCol: 0x9a8a50, shrub: 0.3, shrubCol: 0x5c6a38, tree: 0.14, spire: 0.25, spireCol: 0x5a4a40, spireRough: 0.9, spireH: [5, 16], rock: 1 },
  wueste: { grass: 0.14, grassCol: 0xb8a468, shrub: 0.12, shrubCol: 0x7c6c40, tree: 0, spire: 0.5, spireCol: 0xb07848, spireRough: 0.95, spireH: [8, 30], rock: 0.8 },
  eis: { grass: 0, grassCol: 0, shrub: 0.05, shrubCol: 0xa8c4cc, tree: 0, spire: 0.7, spireCol: 0xcfe8ff, spireRough: 0.18, spireH: [6, 24], rock: 0.7 },
  vulkan: { grass: 0, grassCol: 0, shrub: 0.07, shrubCol: 0x1c1816, tree: 0, spire: 0.8, spireCol: 0x1c1614, spireRough: 0.7, spireH: [6, 26], rock: 1 },
  asche: { grass: 0.1, grassCol: 0x625060, shrub: 0.12, shrubCol: 0x3a3038, tree: 0, spire: 1, spireCol: 0x2a2028, spireRough: 0.55, spireH: [8, 34], rock: 0.9 },
  mond: { grass: 0, grassCol: 0, shrub: 0, shrubCol: 0, tree: 0, spire: 0.55, spireCol: 0x74747a, spireRough: 0.92, spireH: [9, 38], rock: 1.8, stones: 0.9, stoneCol: 0xc4c4c8 },
  kristall: { grass: 0.3, grassCol: 0x8a5cc8, shrub: 0, shrubCol: 0, tree: 0, glow: 0.3, spire: 1, spireCol: 0x8a60d0, spireRough: 0.22, spireGlow: 0.8, spireH: [6, 30], rock: 0.4 },
};

// ---------- Bilder für Gras und Büsche (einmal gezeichnet, mit Transparenz) ----------
let CARDS: THREE.CanvasTexture[] | null = null;
function cards() {
  if (CARDS) return CARDS;
  const mk = (draw: (g: CanvasRenderingContext2D, r: () => number) => void) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!; let s = 7;
    draw(g, () => { s = (s * 16807) % 2147483647; return s / 2147483647; });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return t;
  };
  const grass = mk((g, r) => {
    for (let i = 0; i < 46; i++) {
      const x0 = 128 + (r() - 0.5) * 70, lean = (r() - 0.5) * 190, h = 110 + r() * 136, v = 150 + Math.floor(r() * 105);
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 2.5 + r() * 4.5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, 256); g.quadraticCurveTo(x0 + lean * 0.25, 256 - h * 0.6, x0 + lean, 256 - h); g.stroke();
    }
  });
  const shrub = mk((g, r) => {
    const branch = (x: number, y: number, a: number, len: number, w: number, d: number) => {
      const x2 = x + Math.cos(a) * len, y2 = y - Math.sin(a) * len, v = 110 + Math.floor(r() * 110);
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = w; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      if (d > 0) for (let k = 0; k < 3; k++) branch(x2, y2, a + (r() - 0.5) * 1.5, len * (0.55 + r() * 0.25), Math.max(1.2, w * 0.62), d - 1);
      else { g.fillStyle = `rgb(${v + 30},${v + 30},${v + 30})`; g.beginPath(); g.ellipse(x2, y2, 7 + r() * 7, 4 + r() * 4, r() * 3, 0, 6.3); g.fill(); }
    };
    for (let i = 0; i < 5; i++) branch(128 + (r() - 0.5) * 30, 256, 1.57 + (r() - 0.5) * 1.3, 52 + r() * 26, 7, 3);
  });
  return (CARDS = [grass, shrub]);
}
// zwei gekreuzte Flächen; Normalen zeigen nach oben, damit die Pflanzen wie der Boden beleuchtet werden
function crossGeo() {
  const p: number[] = [], uv: number[] = [], n: number[] = [], ix: number[] = [];
  for (let k = 0; k < 2; k++) {
    const c = Math.cos(k * Math.PI / 2 + 0.4), s = Math.sin(k * Math.PI / 2 + 0.4), o = k * 4;
    p.push(-0.5 * c, 0, -0.5 * s, 0.5 * c, 0, 0.5 * s, 0.5 * c, 1, 0.5 * s, -0.5 * c, 1, -0.5 * s);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1); for (let i = 0; i < 4; i++) n.push(0, 1, 0);
    ix.push(o, o + 1, o + 2, o, o + 2, o + 3, o + 2, o + 1, o, o + 3, o + 2, o);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setIndex(ix);
  return g;
}
// Nadelbaum als gezeichnetes Bild auf drei gekreuzten Flächen: Stamm und viele hängende Zweige mit Nadeln, oben heller als unten.
let TREE: THREE.CanvasTexture | null = null;
function treeTex() {
  if (TREE) return TREE;
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
  const g = c.getContext('2d')!; g.scale(2, 2); let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  g.lineCap = 'round';
  g.strokeStyle = '#3a2c20'; g.lineWidth = 9; g.beginPath(); g.moveTo(128, 512); g.lineTo(128, 250); g.stroke();
  g.lineWidth = 5; g.beginPath(); g.moveTo(128, 250); g.lineTo(128, 40); g.stroke();
  // Zweige von unten nach oben, damit die oberen die unteren überdecken
  for (let i = 0; i < 44; i++) {
    const f = i / 43, y = 452 - f * 430, w = (10 + Math.pow(1 - f, 0.85) * 104) * (0.82 + r() * 0.3);
    for (const side of [-1, 1]) {
      const droop = 14 + (1 - f) * 34 + r() * 10, ww = w * (0.85 + r() * 0.3), steps = Math.max(5, Math.round(ww / 2.2));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps, x = 128 + side * ww * t, yy = y + droop * t * t - 6 * Math.sin(t * 3.14);
        for (let n = 0; n < 4; n++) {
          const up = n < 2, v = up ? 0.55 + r() * 0.45 : 0.22 + r() * 0.3;                 // Oberseite im Licht, Unterseite dunkel
          g.strokeStyle = `rgb(${Math.round(50 * v + 12)},${Math.round(80 * v + 18)},${Math.round(42 * v + 10)})`;
          g.lineWidth = 1.5 + r() * 2.2;
          const a = (up ? -0.5 : 0.9) + (r() - 0.5) * 1.1, len = 5 + r() * 8 * (1 - t * 0.4);
          g.beginPath(); g.moveTo(x, yy + (up ? 0 : 3)); g.lineTo(x + side * Math.cos(a) * len, yy + Math.sin(a) * len + (up ? 0 : 3)); g.stroke();
        }
      }
    }
  }
  TREE = new THREE.CanvasTexture(c); TREE.colorSpace = THREE.SRGBColorSpace; TREE.anisotropy = 4;
  return TREE;
}
function treeGeo() {
  const p: number[] = [], uv: number[] = [], n: number[] = [], ix: number[] = [];
  for (let k = 0; k < 3; k++) {
    const c = Math.cos(k * Math.PI / 3 + 0.2) * 0.25, s = Math.sin(k * Math.PI / 3 + 0.2) * 0.25, o = k * 4;
    p.push(-c, 0, -s, c, 0, s, c, 1, s, -c, 1, -s);
    uv.push(0, 0, 1, 0, 1, 1, 0, 1); for (let i = 0; i < 4; i++) n.push(0, 1, 0);
    ix.push(o, o + 1, o + 2, o, o + 2, o + 3, o + 2, o + 1, o, o + 3, o + 2, o);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
  g.setIndex(ix);
  return g;
}

// ---------- Zustand ----------
interface Layer { im: THREE.InstancedMesh; cell: number; rad: number; dens: number; h: [number, number]; w: number; lx: number; lz: number; salt: number; rock?: boolean }
let layers: Layer[] = [], hAt: (x: number, z: number) => number = () => 0, liquid = -1e9, seed = 1;
const hash = (ix: number, iz: number, k: number) => { const s = Math.sin(ix * 127.1 + iz * 311.7 + k * 74.7 + seed * 0.37) * 43758.5453; return s - Math.floor(s); };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _c = new THREE.Color();

export function buildFlora(type: string, R: { range: (a: number, b: number) => number; next: () => number }, heightAt: (x: number, z: number) => number, liquidLevel: number, sd: number) {
  const F = FLORA[type] || FLORA.fels;
  layers = []; hAt = heightAt; liquid = liquidLevel; seed = sd;
  const add = (o: THREE.Object3D) => { scene.add(o); world.extras.push(o); };
  // ----- Felsbrocken (fest) -----
  {
    const n = Math.round(900 * F.rock), mat = type === 'eis' ? std(0xd8ecff, { roughness: 0.3, metalness: 0.05 }) : texMat(type === 'kristall' ? 0x6a5a8a : type === 'mond' ? 0xa6a6aa : 0xb0a898, 'rock', { roughness: 0.92, metalness: 0.05 }, 1.3);
    const im = new THREE.InstancedMesh(rockGeo(1), mat, n); let k = 0;
    for (let i = 0; i < n * 3 && k < n; i++) {
      const cx = R.range(-3500, 3500), cz = R.range(-3500, 3500), cl = R.next() < 0.6 ? 1 + Math.floor(R.next() * 5) : 1;
      for (let j = 0; j < cl && k < n; j++) {
        const x = cx + (j ? R.range(-22, 22) : 0), z = cz + (j ? R.range(-22, 22) : 0), h = heightAt(x, z);
        if (h < liquidLevel + 1 || Math.hypot(x, z) < 400) continue;
        const big = R.next() < 0.1, s = big ? R.range(4, 11) : R.range(0.6, 2.8);
        _s.set(s * R.range(0.8, 1.4), s * R.range(0.5, 1.0), s * R.range(0.8, 1.4));
        _e.set(R.range(0, 6.28), R.range(0, 6.28), R.range(0, 6.28));
        im.setMatrixAt(k++, _m.compose(_p.set(x, h - s * 0.2, z), _q.setFromEuler(_e), _s));
      }
    }
    im.count = k; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = true; add(im);
  }
  // ----- Felsnadeln in Gruppen (fest): schräg stehende, kantige Spitzen -----
  if (F.spire > 0) {
    const n = Math.round(420 * F.spire), geo = new THREE.ConeGeometry(1, 1, 5, 1); geo.translate(0, 0.5, 0);
    const mat = std(F.spireCol, { roughness: F.spireRough, metalness: F.spireGlow ? 0.3 : 0.1, flatShading: true, emissive: F.spireGlow ? F.spireCol : 0x000000, emissiveIntensity: F.spireGlow || 0 });
    const im = new THREE.InstancedMesh(geo, mat, n); let k = 0;
    for (let c = 0; c < n && k < n; c++) {
      const cx = R.range(-3500, 3500), cz = R.range(-3500, 3500);
      if (Math.hypot(cx, cz) < 480) continue;
      const cnt = 3 + Math.floor(R.next() * 7), lean = R.range(0, 6.28), big = R.range(0.6, 1.25);
      for (let j = 0; j < cnt && k < n; j++) {
        const a = R.range(0, 6.28), d = R.range(0, 9) * big, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, h = heightAt(x, z);
        if (h < liquidLevel + 1) continue;
        const hh = R.range(F.spireH[0], F.spireH[1]) * big * (1 - d / 16), r = hh * R.range(0.09, 0.17);
        _e.set(Math.cos(lean) * R.range(0.1, 0.5) + R.range(-0.15, 0.15), R.range(0, 6.28), Math.sin(lean) * R.range(0.1, 0.5) + R.range(-0.15, 0.15));
        im.setMatrixAt(k++, _m.compose(_p.set(x, h - hh * 0.12, z), _q.setFromEuler(_e), _s.set(r, hh, r)));
      }
    }
    im.count = k; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); im.castShadow = true; add(im);
  }
  // ----- Pflanzen rund um die Kamera -----
  const [tGrass, tShrub] = cards();
  const card = (tex: THREE.Texture, col: number, glow = 0) => new THREE.MeshStandardMaterial({ map: tex, color: col, alphaTest: 0.42, roughness: 1, metalness: 0, emissive: glow ? col : 0x000000, emissiveIntensity: glow });
  const layer = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial, max: number, cell: number, rad: number, dens: number, h: [number, number], w: number, salt: number, shadow = false) => {
    const im = new THREE.InstancedMesh(geo, mat, max); im.count = 0; im.frustumCulled = false; add(im);
    im.userData.sh = shadow; im.receiveShadow = true;                          // Gras wirft keinen Schatten (wären Rechtecke)
    if (shadow) { im.castShadow = true; im.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: mat.map, alphaTest: 0.4 }); }
    layers.push({ im, cell, rad, dens, h, w, lx: 1e9, lz: 1e9, salt });
  };
  if (F.grass > 0) layer(crossGeo(), card(tGrass, F.grassCol, F.glow || 0), 6000, 1.3, 50, F.grass, [0.25, 0.7], 1.8, 1);
  if (F.shrub > 0) layer(crossGeo(), card(tShrub, F.shrubCol), 900, 13, 240, F.shrub, [0.9, 2.4], 1.25, 2, true);
  if (F.tree > 0) layer(treeGeo(), card(treeTex(), 0xffffff), 900, 26, 800, F.tree, [9, 21], 1, 3, true);
  // Geröll: kleine Steine dicht um die Kamera, größere Brocken weiter hinaus (halb im Boden, jeder etwas anders gefärbt)
  if (F.stones) {
    const sm = texMat(F.stoneCol ?? 0xa0a0a4, 'rock', { roughness: 0.95, metalness: 0.04 }, 1.2);
    layer(rockGeo(1), sm, 3200, 2.0, 64, F.stones, [0.1, 0.42], 1.6, 4, false);
    layer(rockGeo(1), sm, 900, 8, 250, F.stones * 0.55, [0.5, 1.7], 1.35, 5, true);
    for (const L of layers) if (L.salt >= 4) L.rock = true;
  }
}

// Steht im Umkreis r um (x, z) ein Baum? (gleiche Regeln wie updateFlora; für Laufen zu Fuß und die Kamera der Außensicht)
export function treeNear(x: number, z: number, r: number) {
  const L = layers.find(l => l.salt === 3); if (!L) return false;
  const c0x = Math.floor((x - r) / L.cell) - 1, c1x = Math.floor((x + r) / L.cell), c0z = Math.floor((z - r) / L.cell) - 1, c1z = Math.floor((z + r) / L.cell);
  for (let iz = c0z; iz <= c1z; iz++) for (let ix = c0x; ix <= c1x; ix++) {
    const tx = (ix + hash(ix, iz, 11 + L.salt)) * L.cell, tz = (iz + hash(ix, iz, 12 + L.salt)) * L.cell;
    if (Math.hypot(tx - x, tz - z) > r) continue;
    const patch = hash(Math.floor(ix * L.cell / 70), Math.floor(iz * L.cell / 70), 9 + L.salt) * 0.6 + hash(Math.floor(ix * L.cell / 23), Math.floor(iz * L.cell / 23), 5 + L.salt) * 0.4;
    if (hash(ix, iz, L.salt) > L.dens * (0.25 + 1.5 * patch)) continue;
    if (Math.hypot(tx, tz) < KEEP.r || Math.abs(tx) > 3900 || Math.abs(tz) > 3900) continue;
    const h = hAt(tx, tz);
    if (h < liquid + 0.6 || Math.abs(hAt(tx + 2, tz) - h) + Math.abs(hAt(tx, tz + 2) - h) > 1.5) continue;
    return true;
  }
  return false;
}

// Pflanzen neu setzen, sobald sich die Kamera merklich bewegt hat
export function updateFlora(cam: THREE.Vector3) {
  for (const L of layers) {
    if (Math.abs(cam.x - L.lx) < L.cell * 1.5 && Math.abs(cam.z - L.lz) < L.cell * 1.5) continue;
    if (L.rad < 100 && cam.y - hAt(cam.x, cam.z) > 140) { if (L.im.count) { L.im.count = 0; L.lx = 1e9; } continue; }   // aus der Höhe ist Gras nicht zu sehen
    L.lx = cam.x; L.lz = cam.z;
    const c0x = Math.floor((cam.x - L.rad) / L.cell), c1x = Math.floor((cam.x + L.rad) / L.cell), c0z = Math.floor((cam.z - L.rad) / L.cell), c1z = Math.floor((cam.z + L.rad) / L.cell);
    const max = L.im.instanceMatrix.count; let k = 0;
    for (let iz = c0z; iz <= c1z && k < max; iz++) for (let ix = c0x; ix <= c1x && k < max; ix++) {
      // Bewuchs in Flecken: grobes Muster entscheidet über Wiese oder kahl
      const patch = hash(Math.floor(ix * L.cell / 70), Math.floor(iz * L.cell / 70), 9 + L.salt) * 0.6 + hash(Math.floor(ix * L.cell / 23), Math.floor(iz * L.cell / 23), 5 + L.salt) * 0.4;
      if (hash(ix, iz, L.salt) > L.dens * (0.25 + 1.5 * patch)) continue;
      const x = (ix + hash(ix, iz, 11 + L.salt)) * L.cell, z = (iz + hash(ix, iz, 12 + L.salt)) * L.cell;
      const d = Math.hypot(x - cam.x, z - cam.z);
      if (d > L.rad || Math.hypot(x, z) < KEEP.r || Math.abs(x) > 3900 || Math.abs(z) > 3900) continue;
      const h = hAt(x, z);
      if (h < liquid + 0.6) continue;
      const sl = Math.abs(hAt(x + 2, z) - h) + Math.abs(hAt(x, z + 2) - h);
      if (sl > 1.5) continue;                                              // zu steil
      const fade = Math.min(1, (L.rad - d) / (L.rad * 0.25)), hh = (L.h[0] + (L.h[1] - L.h[0]) * hash(ix, iz, 13 + L.salt)) * (0.35 + 0.65 * fade);
      const cv = hash(ix, iz, 15 + L.salt);
      if (L.rock) {
        // Steine: nur heller oder dunkler (kein Farbstich), gekippt und in jeder Richtung anders gestreckt, halb im Boden
        const g = 0.74 + 0.4 * cv, a = hash(ix, iz, 17 + L.salt), b = hash(ix, iz, 18 + L.salt);
        L.im.setColorAt(k, _c.setRGB(g, g, g * 1.02));
        L.im.setMatrixAt(k++, _m.compose(_p.set(x, h - hh * 0.25, z), _q.setFromEuler(_e.set(a * 1.2 - 0.6, hash(ix, iz, 14) * 6.28, b * 1.2 - 0.6)), _s.set(hh * L.w * (0.65 + 0.7 * a), hh * (0.8 + 0.6 * b), hh * L.w * (0.65 + 0.7 * hash(ix, iz, 19 + L.salt)))));
        continue;
      }
      L.im.setColorAt(k, _c.setRGB(0.72 + 0.4 * cv, 0.78 + 0.34 * hash(ix, iz, 16), 0.7 + 0.3 * cv));       // jede Pflanze etwas anders gefärbt
      L.im.setMatrixAt(k++, _m.compose(_p.set(x, h - 0.04, z), _q.setFromEuler(_e.set(0, hash(ix, iz, 14) * 6.28, 0)), _s.set(hh * L.w, hh, hh * L.w)));
    }
    L.im.count = k; L.im.instanceMatrix.needsUpdate = true; if (L.im.instanceColor) L.im.instanceColor.needsUpdate = true;
  }
}
