import * as THREE from 'three';

// =====================================================================================
// Neues Planetengelände (Testschalter ?gelaende=neu, seit 2026-11-25)
// Das alte Gelände bestand aus 31-m-Dreiecken, auf die Rauschen bis hinunter zu 16 m Wellenlänge gelegt wurde: Das Netz konnte
// diese Details nicht darstellen, daraus wurden Zacken; die Grate waren als spitzes V gebaut (1 - |n|).
// Hier:
//  - Simplex-Rauschen mit begrenzter Feinheit: keine Welle kürzer als 2,5 Gitterfelder (feinere Details liefert der Shader als Relief)
//  - Domain Warping: Die Koordinaten werden vorher selbst durch Rauschen verbogen, die Formen werden gewunden statt rund
//  - weiche Grate (sqrt(n² + k) statt |n|), Gebirge nur in Regionen, dazwischen Ebenen und sanfte Hügel
//  - Erosion: Wassertropfen tragen Material bergab (Rinnen, Talböden mit Sediment), Schutt rutscht an zu steilen Hängen nach unten
//  - Masken für Shader und Bewuchs: Abflussrinnen, Sediment, Schutt, Krümmung; Normalen pro Bildpunkt aus der Höhenkarte
// Ein- und ausschalten: ?gelaende=neu bzw. ?gelaende=alt (bleibt gespeichert).
// =====================================================================================
export const GELAENDE = { neu: false };
try {
  const q = new URLSearchParams(location.search).get('gelaende');
  if (q === 'neu' || q === 'alt') localStorage.setItem('lf_gelaende', q);
  GELAENDE.neu = (q ?? localStorage.getItem('lf_gelaende')) === 'neu';
} catch (e) { /* ohne Speicher: alt */ }

// ---------------- Simplex-Rauschen (2D, nach Stefan Gustavson), deterministisch je Seed ----------------
const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];
export function simplex(seed: number) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512), pm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = perm[i] % 12; }
  // Wert etwa in -1 … 1
  return (x: number, y: number) => {
    const sk = (x + y) * F2, i = Math.floor(x + sk), j = Math.floor(y + sk), t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2, ii = i & 255, jj = j & 255;
    let n = 0, tt = 0.5 - x0 * x0 - y0 * y0;
    if (tt > 0) { const g = GRAD[pm[ii + perm[jj]]]; tt *= tt; n += tt * tt * (g[0] * x0 + g[1] * y0); }
    tt = 0.5 - x1 * x1 - y1 * y1;
    if (tt > 0) { const g = GRAD[pm[ii + i1 + perm[jj + j1]]]; tt *= tt; n += tt * tt * (g[0] * x1 + g[1] * y1); }
    tt = 0.5 - x2 * x2 - y2 * y2;
    if (tt > 0) { const g = GRAD[pm[ii + 1 + perm[jj + 1]]]; tt *= tt; n += tt * tt * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  };
}

// Rauschen in Oktaven, nur bis zur kleinsten erlaubten Wellenlänge minWL (in Metern). Die letzte Oktave wird weich ausgeblendet,
// statt hart abzubrechen, damit es keine Stufe in der Feinheit gibt.
export function noiseSet(seed: number, minWL: number) {
  const s1 = simplex(seed), s2 = simplex(seed + 101), s3 = simplex(seed + 202);
  const fade = (wl: number) => Math.min(1, Math.max(0, (wl / minWL - 1) / 0.8));
  // fBm: Summe -1 … 1 (ungefähr), wl = größte Wellenlänge in Metern
  const fbm = (x: number, z: number, wl: number, oct = 8, gain = 0.5, sn = s1) => {
    let sum = 0, amp = 1, norm = 0, w = wl;
    for (let o = 0; o < oct; o++) {
      const f = fade(w); if (f <= 0) break;
      sum += amp * f * sn(x / w + o * 17.3, z / w - o * 9.1); norm += amp; amp *= gain; w /= 2.02;
    }
    return norm ? sum / norm : 0;
  };
  // Gratrauschen mit runden Kämmen: 1 - sqrt(n² + k) statt 1 - |n|. Jede Oktave wird vom Grat der vorigen gewichtet
  // (wie bei Ridged Multifractal): An den Kämmen wird es feiner, in den Tälern bleibt es glatt.
  const ridge = (x: number, z: number, wl: number, oct = 6, k = 0.035) => {
    let sum = 0, amp = 1, norm = 0, w = wl, prev = 1;
    for (let o = 0; o < oct; o++) {
      const f = fade(w); if (f <= 0) break;
      const n = s2(x / w + o * 31.7, z / w + o * 5.3), r = 1 - Math.sqrt(n * n + k) + Math.sqrt(k), v = r * r * prev;
      sum += amp * f * v; norm += amp; prev = Math.min(1, Math.max(0, v * 1.6)); amp *= 0.42; w /= 2.05;
    }
    return norm ? sum / norm : 0;          // 0 … ~1
  };
  return { fbm, ridge, s1, s2, s3 };
}

const smooth01 = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Formen je Planetentyp: Verbiegung der Koordinaten, Anteil Gebirge, Weichheit der Grate, Erosion, Glätten
export interface TerrainLook { warp: number; mount: number; ridgeK: number; hills: number; erosion: number; thermal: number; talus: number; smooth: number; dunes?: number }
export const TERRAIN_LOOK: Record<string, TerrainLook> = {
  fels: { warp: 650, mount: 0.55, ridgeK: 0.03, hills: 1, erosion: 1, thermal: 1, talus: 0.75, smooth: 1 },
  wueste: { warp: 900, mount: 0.4, ridgeK: 0.05, hills: 0.7, erosion: 0.45, thermal: 1, talus: 0.62, smooth: 2, dunes: 1 },
  eis: { warp: 700, mount: 0.5, ridgeK: 0.08, hills: 0.8, erosion: 0.3, thermal: 0.6, talus: 0.7, smooth: 3 },
  vulkan: { warp: 500, mount: 0.65, ridgeK: 0.02, hills: 0.9, erosion: 0.7, thermal: 1, talus: 0.8, smooth: 1 },
  asche: { warp: 600, mount: 0.5, ridgeK: 0.04, hills: 0.9, erosion: 0.6, thermal: 1, talus: 0.7, smooth: 2 },
  kristall: { warp: 450, mount: 0.6, ridgeK: 0.015, hills: 0.8, erosion: 0.4, thermal: 0.8, talus: 0.9, smooth: 1 },
  mond: { warp: 400, mount: 0.3, ridgeK: 0.06, hills: 0.6, erosion: 0, thermal: 1.2, talus: 0.62, smooth: 2 },
};

export interface Crater { x: number; z: number; r: number; d: number }
// Krater mit glattem Profil: Schüssel, aufgeworfener Rand, Auswurf nach außen abklingend, bei großen ein Zentralberg
export function craterAt(c: Crater, x: number, z: number) {
  const d = Math.hypot(x - c.x, z - c.z) / c.r;
  if (d > 3) return 0;
  let h = 0;
  if (d < 1) h -= c.d * (1 - d * d) * (1 - d * d * 0.35);                       // Schüssel mit flacherem Boden
  h += c.d * 0.42 * Math.exp(-Math.pow((d - 1) / 0.16, 2));                     // Rand
  if (d > 1) h += c.d * 0.12 * Math.exp(-(d - 1) * 2.2) * smooth01(1, 1.2, d);  // Auswurf
  if (c.r > 450) h += c.d * 0.35 * Math.exp(-Math.pow(d / 0.14, 2));            // Zentralberg
  return h;
}

// Höhenformel des neuen Geländes. minWL: kleinste Wellenlänge in Metern (2,5 Gitterfelder der Karte)
export function makeHeightFn(type: string, amp: number, seed: number, craters: Crater[], minWL: number) {
  const L = TERRAIN_LOOK[type] || TERRAIN_LOOK.fels, nz = noiseSet(seed, minWL);
  const windA = (seed % 360) * Math.PI / 180, wx = Math.cos(windA), wz = Math.sin(windA);
  return (x: number, z: number) => {
    // Domain Warping: zwei Stufen, die grobe biegt die feine
    const qx = x + L.warp * nz.fbm(x, z, 4200, 3, 0.45, nz.s3), qz = z + L.warp * nz.fbm(x + 5200, z - 1300, 4200, 3, 0.45, nz.s3);
    const px = qx + L.warp * 0.15 * nz.fbm(qx, qz, 1100, 3, 0.5, nz.s3), pz = qz + L.warp * 0.15 * nz.fbm(qx - 800, qz + 2700, 1100, 3, 0.5, nz.s3);
    // Regionen: wo Gebirge steht und wo Ebene ist
    const region = nz.fbm(qx, qz, 5200, 3) * 0.5 + 0.5;
    const mm = smooth01(0.62 - L.mount * 0.35, 0.82 - L.mount * 0.25, region);
    const hills = nz.fbm(px, pz, 2600, 7, 0.4);                                   // sanfte Hügel überall
    const ridges = nz.ridge(px, pz, 3000, 6, L.ridgeK);
    let h = amp * (0.34 * L.hills * hills + mm * (0.6 * Math.pow(ridges, 1.3) + 0.1 * hills) - 0.12);
    // Wüste: Dünen quer zum Wind auf den Ebenen (asymmetrisch: flache Luvseite, steilere Leeseite), Kämme verbogen
    if (L.dunes) {
      const u = (px * wx + pz * wz) / 260 + 1.4 * nz.fbm(px, pz, 1400, 3, 0.5, nz.s3), f = u - Math.floor(u);
      const prof = f < 0.72 ? smooth01(0, 0.72, f) : 1 - smooth01(0.72, 1, f);
      h += amp * 0.045 * L.dunes * (1 - mm) * prof * (0.6 + 0.4 * nz.fbm(px, pz, 2200, 2, 0.5, nz.s3));
    }
    for (const c of craters) h += craterAt(c, x, z);
    return h;
  };
}

// ---------------- Glätten ----------------
// Weicher 3×3-Filter; k: Stärke 0…1, mask (optional, 0…1) schützt Stellen (1 = bleibt)
export function smoothField(H: Float32Array, N: number, passes: number, k = 0.5, mask?: Float32Array) {
  const T = new Float32Array(H.length);
  for (let p = 0; p < passes; p++) {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const i0 = i > 0 ? i - 1 : i, i1 = i < N - 1 ? i + 1 : i, j0 = j > 0 ? j - 1 : j, j1 = j < N - 1 ? j + 1 : j;
      const c = H[j * N + i];
      const avg = (4 * c + 2 * (H[j * N + i0] + H[j * N + i1] + H[j0 * N + i] + H[j1 * N + i]) + H[j0 * N + i0] + H[j0 * N + i1] + H[j1 * N + i0] + H[j1 * N + i1]) / 16;
      const kk = mask ? k * (1 - mask[j * N + i]) : k;
      T[j * N + i] = c + (avg - c) * kk;
    }
    H.set(T);
  }
}

// ---------------- Erosion ----------------
// Tropfen-Erosion (nach dem bekannten Verfahren von Hans Theobald Beyer, umgesetzt wie bei Sebastian Lague), Höhen intern in Gitterfeldern,
// damit die Parameter unabhängig von der Kartengröße sind. Danach thermische Erosion: Wo ein Hang steiler ist als der Schüttwinkel,
// rutscht Material zum Nachbarn hinunter (Schutthalden). weight (0…1) begrenzt die Wirkung (Kartenrand, Plateau der Bodenstation).
export interface ErodeOut { flow: Float32Array; sed: Float32Array; talus: Float32Array }
export function erode(H: Float32Array, N: number, cell: number, R: () => number, look: TerrainLook, weight: Float32Array): ErodeOut {
  const flow = new Float32Array(N * N), sed = new Float32Array(N * N), talus = new Float32Array(N * N);
  const inv = 1 / cell;
  for (let k = 0; k < H.length; k++) H[k] *= inv;
  // Pinsel für das Abtragen (Radius 3 Felder, gewichtet)
  const RAD = 3, brush: { o: number; dx: number; dy: number; w: number }[] = [];
  let bw = 0;
  for (let y = -RAD; y <= RAD; y++) for (let x = -RAD; x <= RAD; x++) { const d = Math.hypot(x, y); if (d <= RAD) { const w = 1 - d / RAD; brush.push({ o: 0, dx: x, dy: y, w }); bw += w; } }
  for (const b of brush) b.w /= bw;
  const hg = (px: number, py: number) => {
    const x = Math.floor(px), y = Math.floor(py), u = px - x, v = py - y, i = y * N + x;
    const a = H[i], b = H[i + 1], c = H[i + N], d = H[i + N + 1];
    return { h: a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v, gx: (b - a) * (1 - v) + (d - c) * v, gy: (c - a) * (1 - u) + (d - b) * u };
  };
  const drops = look.erosion > 0 ? Math.round(N * N * 0.6 * look.erosion) : 0;
  const inertia = 0.06, capF = 3.2, minCap = 0.01, erodeS = 0.25, depS = 0.25, evap = 0.02, grav = 4, life = 40;
  for (let n = 0; n < drops; n++) {
    let px = 1 + R() * (N - 3), py = 1 + R() * (N - 3), dx = 0, dy = 0, sp = 1, wat = 1, load = 0;
    for (let t = 0; t < life; t++) {
      const x = Math.floor(px), y = Math.floor(py), u = px - x, v = py - y, ci = y * N + x;
      const g = hg(px, py);
      dx = dx * inertia - g.gx * (1 - inertia); dy = dy * inertia - g.gy * (1 - inertia);
      const l = Math.hypot(dx, dy); if (l < 1e-9) break;
      dx /= l; dy /= l; px += dx; py += dy;
      if (px < 1 || py < 1 || px >= N - 2 || py >= N - 2) break;
      const dh = hg(px, py).h - g.h, w = weight[ci];
      flow[ci] += wat * sp;
      const cap = Math.max(-dh * sp * wat * capF, minCap);
      if (load > cap || dh > 0) {
        // ablagern (bergauf: höchstens die Senke füllen)
        const amt = (dh > 0 ? Math.min(dh, load) : (load - cap) * depS) * w;
        load -= amt;
        H[ci] += amt * (1 - u) * (1 - v); H[ci + 1] += amt * u * (1 - v); H[ci + N] += amt * (1 - u) * v; H[ci + N + 1] += amt * u * v;
        sed[ci] += amt;
      } else {
        const amt = Math.min((cap - load) * erodeS, -dh) * w;
        for (const b of brush) {
          const bx = x + b.dx, by = y + b.dy; if (bx < 0 || by < 0 || bx >= N || by >= N) continue;
          const bi = by * N + bx, e = amt * b.w;
          H[bi] -= e; load += e;
        }
      }
      sp = Math.sqrt(Math.max(0, sp * sp + dh * grav)); wat *= 1 - evap;
    }
  }
  // thermische Erosion: Schüttwinkel als Höhenunterschied je Feld (tan)
  const tal = look.talus, it = Math.round(24 * look.thermal);
  for (let r = 0; r < it; r++) {
    for (let j = 1; j < N - 1; j++) for (let i = 1; i < N - 1; i++) {
      const c = j * N + i, w = weight[c]; if (w <= 0) continue;
      let maxD = 0, tot = 0;
      const nb = [c - 1, c + 1, c - N, c + N];
      for (const q of nb) { const d = H[c] - H[q]; if (d > tal) { tot += d - tal; if (d > maxD) maxD = d; } }
      if (tot <= 0) continue;
      const move = 0.5 * (maxD - tal) * w;
      for (const q of nb) { const d = H[c] - H[q]; if (d > tal) { const m = move * (d - tal) / tot; H[q] += m; talus[q] += m; } }
      H[c] -= move;
    }
  }
  for (let k = 0; k < H.length; k++) H[k] *= cell;
  // Masken auf 0…1 bringen (log für den Abfluss: wenige große Rinnen, viele kleine)
  let fm = 0, sm = 0, tm = 0;
  for (let k = 0; k < H.length; k++) { flow[k] = Math.log1p(flow[k]); fm = Math.max(fm, flow[k]); }
  const q = (a: Float32Array) => { const s = Array.from(a).filter(v => v > 0).sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.96)] : 1; };
  sm = q(sed) || 1; tm = q(talus) || 1;
  for (let k = 0; k < H.length; k++) { flow[k] = fm ? Math.min(1, flow[k] / (fm * 0.75)) : 0; sed[k] = Math.min(1, sed[k] / sm); talus[k] = Math.min(1, talus[k] / tm); }
  return { flow, sed, talus };
}

// ---------------- Karten für Shader und Bewuchs ----------------
// nrm: Normale (x, z) als Halbfließkomma-Textur mit linearer Filterung → glattes Licht pro Bildpunkt, ohne Dreieckskanten
// mask: R = Abfluss, G = Sediment, B = Schutt, A = Krümmung (0,5 = eben, > 0,5 Mulde, < 0,5 Kuppe)
export interface TerrainMaps { N: number; size: number; nrm: THREE.DataTexture; mask: THREE.DataTexture; m: Uint8Array; sample: (x: number, z: number) => { flow: number; sed: number; talus: number; curv: number } }
export function buildMaps(H: Float32Array, N: number, size: number, e: ErodeOut | null): TerrainMaps {
  const cell = size / (N - 1), half = size / 2;
  const nd = new Uint16Array(N * N * 4), m = new Uint8Array(N * N * 4);
  const at = (i: number, j: number) => H[Math.min(N - 1, Math.max(0, j)) * N + Math.min(N - 1, Math.max(0, i))];
  const v = new THREE.Vector3();
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    // Sobel-Ableitung: glatter als die einfache Differenz
    const gx = ((at(i + 1, j - 1) + 2 * at(i + 1, j) + at(i + 1, j + 1)) - (at(i - 1, j - 1) + 2 * at(i - 1, j) + at(i - 1, j + 1))) / (8 * cell);
    const gz = ((at(i - 1, j + 1) + 2 * at(i, j + 1) + at(i + 1, j + 1)) - (at(i - 1, j - 1) + 2 * at(i, j - 1) + at(i + 1, j - 1))) / (8 * cell);
    v.set(-gx, 1, -gz).normalize();
    const k = (j * N + i) * 4;
    nd[k] = THREE.DataUtils.toHalfFloat(v.x); nd[k + 1] = THREE.DataUtils.toHalfFloat(v.y); nd[k + 2] = THREE.DataUtils.toHalfFloat(v.z); nd[k + 3] = THREE.DataUtils.toHalfFloat(1);
    // Krümmung über einen Ring von 2 Feldern (Laplace), in Metern Höhenunterschied zum Umfeld
    const lap = (at(i - 2, j) + at(i + 2, j) + at(i, j - 2) + at(i, j + 2)) / 4 - at(i, j);
    const c = (j * N + i);
    m[k] = Math.round(255 * (e ? e.flow[c] : 0)); m[k + 1] = Math.round(255 * (e ? e.sed[c] : 0)); m[k + 2] = Math.round(255 * (e ? e.talus[c] : 0));
    m[k + 3] = Math.round(255 * Math.min(1, Math.max(0, 0.5 + lap / 12)));
  }
  const nrm = new THREE.DataTexture(nd, N, N, THREE.RGBAFormat, THREE.HalfFloatType);
  nrm.magFilter = nrm.minFilter = THREE.LinearFilter; nrm.wrapS = nrm.wrapT = THREE.ClampToEdgeWrapping; nrm.needsUpdate = true;
  const mask = new THREE.DataTexture(m, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  mask.magFilter = THREE.LinearFilter; mask.minFilter = THREE.LinearMipmapLinearFilter; mask.generateMipmaps = true; mask.wrapS = mask.wrapT = THREE.ClampToEdgeWrapping; mask.needsUpdate = true;
  const sample = (x: number, z: number) => {
    const gx = Math.min(N - 1.001, Math.max(0, (x + half) / cell)), gz = Math.min(N - 1.001, Math.max(0, (z + half) / cell));
    const i = Math.floor(gx), j = Math.floor(gz), u = gx - i, w = gz - j;
    const f = (o: number) => { const a = m[(j * N + i) * 4 + o], b = m[(j * N + i + 1) * 4 + o], c = m[((j + 1) * N + i) * 4 + o], d = m[((j + 1) * N + i + 1) * 4 + o]; return ((a * (1 - u) + b * u) * (1 - w) + (c * (1 - u) + d * u) * w) / 255; };
    return { flow: f(0), sed: f(1), talus: f(2), curv: f(3) * 2 - 1 };
  };
  return { N, size, nrm, mask, m, sample };
}
