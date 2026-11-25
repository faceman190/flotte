import * as THREE from 'three';
// Kachelbare Rauschbilder für Rechenmaterialien (vorher in game/deck.ts, seit dem 25.11.2026 auch für die Schiffsinnenräume,
// models/innenFlaeche.ts). Einmal erzeugt, von allen geteilt.
let L2NOISE: [THREE.DataTexture, THREE.DataTexture] | null = null;
// Rauschbilder (kachelbar, 256 Punkte): A = zwei unabhängige Fleckenmuster (r, g) und das Korn (b); N = Gefälle des Korns für das Relief
export function l2Noise() {
  if (L2NOISE) return L2NOISE;
  const S = 256, A = new Uint8Array(S * S * 4), N = new Uint8Array(S * S * 4), H = new Float32Array(S * S);
  const hash = (x: number, y: number, k: number) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 2147483629)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const vn = (x: number, y: number, P: number, k: number) => {      // Wertrauschen mit Periode P
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), w = (q: number) => ((q % P) + P) % P;
    const a = hash(w(x0), w(y0), k), b = hash(w(x0 + 1), w(y0), k), c = hash(w(x0), w(y0 + 1), k), d = hash(w(x0 + 1), w(y0 + 1), k);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (u: number, v: number, P: number, oct: number, k: number) => { let t = 0, amp = 0.5, n = 0; for (let o = 0; o < oct; o++) { t += amp * vn(u * P, v * P, P, k + o * 17); n += amp; amp *= 0.5; P *= 2; } return t / n; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, u = x / S, v = y / S;
    A[i] = fbm(u, v, 16, 4, 1) * 255; A[i + 1] = fbm(u, v, 16, 4, 91) * 255; A[i + 2] = (H[y * S + x] = fbm(u, v, 32, 3, 173)) * 255; A[i + 3] = 255;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, h = (a: number, b: number) => H[((b + S) % S) * S + ((a + S) % S)];
    N[i] = Math.max(0, Math.min(255, 127.5 + (h(x - 1, y) - h(x + 1, y)) * 900)); N[i + 1] = Math.max(0, Math.min(255, 127.5 + (h(x, y - 1) - h(x, y + 1)) * 900)); N[i + 2] = 255; N[i + 3] = 255;
  }
  const mk = (d: Uint8Array) => { const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; };
  return (L2NOISE = [mk(A), mk(N)]);
}
