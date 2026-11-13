// Hochhausfassaden (asset-src/neu/stadt/hochhaus_kit.py): drei kachelnde Fassaden, je 24 m × 25,6 m (8 Geschosse zu 3,2 m) auf 2048 px.
//   kit_hha  Glasraster: 24 Fensterachsen je 1 m, Brüstungspaneele, Pfeiler alle 6 m, Büros in Gruppen beleuchtet
//   kit_hhb  Paneelfassade: schwere Metallpaneele 3 m × 3,2 m mit Fugen, Lüftungsgittern, Wartungsklappen, Schlitzfenstern, Gesimsen
//   kit_hhc  Bandfassade: Betonbrüstungen, durchlaufende Fensterbänder mit Sonnenblende, Klimakästen
// Je Fassade vier Bilder: _col (Farbe), _emi (Leuchten), _nrm (Relief aus der Höhenkarte), _orm (R Verdeckung, G Rauheit, B Metall).
// Die Bilder liegen bewusst NICHT in asset-src/tex (dort landet alles im Kernpaket des Spiels), sondern in asset-src/neu/stadt/tex.
// Oberflächen aus Scans (scripts/kit-scan.mjs): 1 verwittertes Blech, 2 lackierter Stahl, 3 Beton. Das Raster bleibt berechnet.
// Aufruf: node scripts/make-kit-hh.mjs   (danach node scripts/sync-city-tex.mjs und npm run assets)
import fs from 'fs';
import sharp from 'sharp';
import { loadScans } from './kit-scan.mjs';
const N = 2048, OUT = 'asset-src/neu/stadt/tex';
fs.mkdirSync(OUT, { recursive: true });
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function latt(n, R) {
  const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = R();
  const m = (a) => ((a % n) + n) % n, s = (t) => t * t * (3 - 2 * t);
  return (u, v) => { const x = u * n, y = v * n, x0 = Math.floor(x), y0 = Math.floor(y), fx = s(x - x0), fy = s(y - y0);
    const a = g[m(y0) * n + m(x0)], b = g[m(y0) * n + m(x0 + 1)], c = g[m(y0 + 1) * n + m(x0)], d = g[m(y0 + 1) * n + m(x0 + 1)];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; };
}
const W = (a) => ((Math.round(a) % N) + N) % N;
class Tex {
  constructor(seed) {
    this.R = rng(seed); this.H = new Float32Array(N * N).fill(0.5); this.A = new Float32Array(N * N * 3).fill(0.4);
    this.Ro = new Float32Array(N * N).fill(0.6); this.Me = new Float32Array(N * N).fill(0.4); this.E = new Float32Array(N * N * 3);
    this.G = new Uint8Array(N * N);      // 1 = Glas oder Licht: wird nicht verwittert
    this.S = new Uint8Array(N * N);      // Scan-Material je Bildpunkt (0 = keins, 1 Blech, 2 Lackstahl, 3 Beton)
  }
  // o: h Höhe, c Farbe [r,g,b] oder Zahl (Grau), a Deckkraft der Farbe, ro, me, e Leuchten [r,g,b], g Glas-Kennung
  rect(x, y, w, h, o) {
    const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
    const c = o.c === undefined ? null : (typeof o.c === 'number' ? [o.c, o.c, o.c] : o.c), a = o.a === undefined ? 1 : o.a;
    for (let yy = y0; yy < y1; yy++) { const r = W(yy) * N; for (let xx = x0; xx < x1; xx++) { const i = r + W(xx);
      if (o.h !== undefined) this.H[i] = o.h; if (o.dh !== undefined) this.H[i] += o.dh;
      if (c) { this.A[i * 3] += (c[0] - this.A[i * 3]) * a; this.A[i * 3 + 1] += (c[1] - this.A[i * 3 + 1]) * a; this.A[i * 3 + 2] += (c[2] - this.A[i * 3 + 2]) * a; }
      if (o.m !== undefined) { this.A[i * 3] *= o.m; this.A[i * 3 + 1] *= o.m; this.A[i * 3 + 2] *= o.m; }
      if (o.ro !== undefined) this.Ro[i] = o.ro; if (o.me !== undefined) this.Me[i] = o.me;
      if (o.e) { this.E[i * 3] = o.e[0]; this.E[i * 3 + 1] = o.e[1]; this.E[i * 3 + 2] = o.e[2]; }
      if (o.em !== undefined) { this.E[i * 3] *= o.em; this.E[i * 3 + 1] *= o.em; this.E[i * 3 + 2] *= o.em; }
      if (o.g !== undefined) this.G[i] = o.g; if (o.s !== undefined) this.S[i] = o.s; } }
  }
  // Paneel mit Fuge ringsum, heller Kante oben/links und dunkler unten/rechts, optional Schrauben
  panel(x, y, w, h, o) {
    const s = o.seam === undefined ? 4 : o.seam, tone = o.c, hh = o.h === undefined ? 0.5 : o.h;
    this.rect(x, y, w, h, { h: 0.28, c: 0.07, ro: 0.9, me: 0.1, g: 0 });
    this.rect(x + s, y + s, w - 2 * s, h - 2 * s, { h: hh, c: tone, ro: o.ro === undefined ? 0.55 : o.ro, me: o.me === undefined ? 0.5 : o.me, s: o.s });
    this.rect(x + s, y + s, w - 2 * s, 2, { m: 1.22 }); this.rect(x + s, y + s, 2, h - 2 * s, { m: 1.12 });
    this.rect(x + s, y + h - s - 2, w - 2 * s, 2, { m: 0.72 }); this.rect(x + w - s - 2, y + s, 2, h - 2 * s, { m: 0.8 });
    if (o.bolts) for (const [bx, by] of [[x + s + 9, y + s + 9], [x + w - s - 14, y + s + 9], [x + s + 9, y + h - s - 14], [x + w - s - 14, y + h - s - 14]]) this.rect(bx, by, 5, 5, { h: hh + 0.1, m: 0.6 });
  }
  louvers(x, y, w, h, o = {}) {
    this.rect(x, y, w, h, { h: 0.36, c: 0.09, ro: 0.7, me: 0.6 });
    const st = o.step || 9;
    for (let b = 2; b + 4 < h; b += st) this.rect(x + 3, y + b, w - 6, st * 0.55, { h: 0.52, c: o.c === undefined ? 0.26 : o.c, ro: 0.5, me: 0.7 });
  }
  // beleuchtetes Fenster: oben hell (Deckenlicht), unten dunkler, Möbelschatten, manchmal Jalousie
  lit(x, y, w, h, col, lvl) {
    const R = this.R;
    this.rect(x, y, w, h, { h: 0.3, c: [col[0] * 0.75, col[1] * 0.75, col[2] * 0.75], ro: 0.35, me: 0, e: [col[0] * lvl, col[1] * lvl, col[2] * lvl], g: 1 });
    this.rect(x, y, w, h * 0.16, { em: 1.25 }); this.rect(x, y + h * 0.7, w, h * 0.3, { em: 0.62, m: 0.7 });
    if (R() < 0.5) { const sw = w * (0.25 + R() * 0.4), sh = h * (0.2 + R() * 0.3); this.rect(x + R() * (w - sw), y + h - sh, sw, sh, { em: 0.25, m: 0.35 }); }
    if (R() < 0.22) { const bh = h * (0.3 + R() * 0.7); for (let b = 0; b < bh; b += 7) this.rect(x, y + b, w, 3, { em: 0.35, m: 0.5 }); }
  }
  glass(x, y, w, h) {
    const R = this.R, t = 0.16 + R() * 0.12;
    this.rect(x, y, w, h, { h: 0.3, c: [t * 0.85, t * 0.95, t * 1.1], ro: 0.06 + R() * 0.12, me: 0.9, g: 1 });
    this.rect(x, y, w, h * 0.25, { m: 0.8 });      // oben dunkler: Sturzschatten
  }
  async save(name) {
    const { H, A, Ro, Me, E, G, S: SM } = this, R = rng(1000 + name.length * 77 + name.charCodeAt(name.length - 1));
    const SC = await loadScans([null, { id: 'metal_plate_02', px: 256, k: 0.9, hue: 0.3, kr: 0.75, kn: 0.7 }, { id: 'blue_metal_plate', px: 256, k: 1.0, hue: 0.1, kr: 0.7, kn: 0.6 }, { id: 'concrete_wall_008', px: 256, k: 1.2, hue: 0.2, kr: 0.8, kn: 0.9 }]);
    // Weichgezeichnete Höhe (kachelnd): daraus Verdeckung, Kantenabrieb und Relief
    const blur = (src, r) => { const t = new Float32Array(N * N), d = new Float32Array(N * N), k = 1 / (2 * r + 1);
      for (let y = 0; y < N; y++) { let s = 0; for (let i = -r; i <= r; i++) s += src[y * N + W(i)]; for (let x = 0; x < N; x++) { t[y * N + x] = s * k; s += src[y * N + W(x + r + 1)] - src[y * N + W(x - r)]; } }
      for (let x = 0; x < N; x++) { let s = 0; for (let i = -r; i <= r; i++) s += t[W(i) * N + x]; for (let y = 0; y < N; y++) { d[y * N + x] = s * k; s += t[W(y + r + 1) * N + x] - t[W(y - r) * N + x]; } }
      return d; };
    const Hb = blur(blur(H, 5), 5), Hs = blur(H, 1);
    const n1 = latt(12, R), n2 = latt(48, R), n3 = latt(200, R), n4 = latt(700, R), stk = latt(160, R), rst = latt(20, R);
    const AO = new Float32Array(N * N);
    // Ablaufspuren unter Kanten (dort, wo es nach unten in eine Vertiefung geht)
    const drip = new Float32Array(N * N);
    for (let x = 0; x < N; x++) for (let y = 0; y < N; y++) {
      if (H[y * N + x] - H[W(y + 1) * N + x] > 0.12 && R() < 0.012) { const len = 40 + R() * 220, wd = 1 + Math.floor(R() * 4), st = 0.25 + R() * 0.4;
        for (let k = 0; k < len; k++) for (let j = 0; j < wd; j++) { const i = W(y + 1 + k) * N + W(x + j); drip[i] = Math.max(drip[i], st * (1 - k / len)); } }
    }
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, u = x / N, v = y / N;
      const cav = Math.max(0, Math.min(1, (Hb[i] - H[i]) * 5)), edge = Math.max(0, Math.min(1, (H[i] - Hb[i]) * 6));
      AO[i] = 1 - cav * 0.7;
      if (G[i]) { const k = 0.94 + 0.1 * n2(u, v); for (let c = 0; c < 3; c++) A[i * 3 + c] *= k; Ro[i] += 0.1 * n3(u, v) * n2(u, v); continue; }
      const sc = SC[SM[i]], sj = sc ? (y % sc.px) * sc.px + (x % sc.px) : 0;
      if (sc) { for (let c = 0; c < 3; c++) A[i * 3 + c] *= sc.det[sj * 3 + c]; Ro[i] += (sc.rough[sj] - Ro[i]) * sc.kr; }
      let k = sc ? 0.9 + 0.12 * n1(u, v) + 0.08 * n2(u, v) : 0.8 + 0.22 * n1(u, v) + 0.12 * n2(u, v) + 0.08 * n3(u, v) + 0.06 * n4(u, v);
      const s = stk(u, v * 0.06); if (s > 0.6) k *= 1 - (s - 0.6) * 1.1 * (0.5 + 0.5 * n2(u, v));      // senkrechte Läufer
      k *= 1 - cav * 0.55; k *= 1 - drip[i] * 0.8; k += edge * 0.1;
      // Rostflecken dort, wo zwei Rauschfelder zusammenkommen
      const rm = rst(u, v) * 0.55 + n2(u, v) * 0.3 + n3(u, v) * 0.15, rr = Math.max(0, rm - 0.66) * 1.4 * (0.55 + 0.45 * n4(u, v)) + drip[i] * 0.2;
      const g = [A[i * 3] * k, A[i * 3 + 1] * k, A[i * 3 + 2] * k];
      const ru = Math.min(1, rr * (sc ? 1.1 : 2.0)); g[0] += (0.27 - g[0]) * ru * 0.6; g[1] += (0.15 - g[1]) * ru * 0.6; g[2] += (0.09 - g[2]) * ru * 0.6;
      A[i * 3] = g[0]; A[i * 3 + 1] = g[1]; A[i * 3 + 2] = g[2];
      Ro[i] = Math.max(0.05, Math.min(1, Ro[i] + 0.2 * (n3(u, v) - 0.5) + cav * 0.25 + ru * 0.3 - edge * 0.12)); Me[i] = Math.max(0, Me[i] * (1 - ru) * (1 - cav * 0.5));
    }
    const col = Buffer.alloc(N * N * 3), emi = Buffer.alloc(N * N * 3), nrm = Buffer.alloc(N * N * 3), orm = Buffer.alloc(N * N * 3), b = (f) => Math.max(0, Math.min(255, Math.round(f * 255)));
    const S = 9.0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      col[i * 3] = b(A[i * 3]); col[i * 3 + 1] = b(A[i * 3 + 1]); col[i * 3 + 2] = b(A[i * 3 + 2]);
      emi[i * 3] = b(E[i * 3]); emi[i * 3 + 1] = b(E[i * 3 + 1]); emi[i * 3 + 2] = b(E[i * 3 + 2]);
      const dx = (Hs[y * N + W(x + 1)] - Hs[y * N + W(x - 1)]) * S, dy = (Hs[W(y + 1) * N + x] - Hs[W(y - 1) * N + x]) * S;
      const sc = G[i] ? null : SC[SM[i]], sj = sc ? (y % sc.px) * sc.px + (x % sc.px) : 0;
      const nx = -dx + (sc ? sc.nor[sj * 2] * sc.kn : 0), ny = dy + (sc ? sc.nor[sj * 2 + 1] * sc.kn : 0), l = Math.hypot(nx, ny, 1);
      nrm[i * 3] = b(nx / l * 0.5 + 0.5); nrm[i * 3 + 1] = b(ny / l * 0.5 + 0.5); nrm[i * 3 + 2] = b(1 / l * 0.5 + 0.5);
      orm[i * 3] = b(AO[i]); orm[i * 3 + 1] = b(Ro[i]); orm[i * 3 + 2] = b(Me[i]);
    }
    const w = (buf, suf) => sharp(buf, { raw: { width: N, height: N, channels: 3 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}_${suf}@2048.png`);
    await Promise.all([w(col, 'col'), w(emi, 'emi'), w(nrm, 'nrm'), w(orm, 'orm')]);
    console.log(name, 'ok');
  }
}
const COOL = [0.82, 0.9, 1.0], WHITE = [1.0, 0.97, 0.9], WARM = [1.0, 0.82, 0.58], CYAN = [0.55, 0.9, 0.95], AMBER = [1.0, 0.62, 0.25];
const pick = (R) => { const k = R(); return k < 0.5 ? COOL : k < 0.74 ? WHITE : k < 0.93 ? WARM : k < 0.97 ? CYAN : AMBER; };
const ROWS = 8, RH = N / ROWS;

// ------------------------------------------------------------------ A: Glasraster
{
  const T = new Tex(11), R = T.R, COLS = 24, CW = N / COLS;
  T.rect(0, 0, N, N, { h: 0.5, c: 0.3, ro: 0.5, me: 0.6, s: 2 });
  for (let r = 0; r < ROWS; r++) {
    const y = r * RH, wy = y + 16, wh = 150, sy = wy + wh, sh = RH - 16 - wh;
    T.rect(0, y, N, 16, { h: 0.66, c: 0.36, ro: 0.45, me: 0.7, s: 1 }); T.rect(0, y, N, 2, { m: 1.25 }); T.rect(0, y + 14, N, 2, { m: 0.6 });      // Deckenstirn
    // Brüstungspaneele über je zwei Achsen
    for (let c = 0; c < COLS; c += 2) { const t = 0.2 + R() * 0.1; T.panel(c * CW, sy, CW * 2, sh, { c: [t, t * 1.02, t * 1.06], h: 0.52 + R() * 0.04, seam: 3, ro: 0.4 + R() * 0.2, me: 0.7, s: R() < 0.7 ? 2 : 1 }); if (R() < 0.12) T.louvers(c * CW + 14, sy + 16, CW * 2 - 28, sh - 32); }
    T.rect(0, sy + sh * 0.5, N, 2, { h: 0.42, m: 0.6 });
    // Scheiben: Büros in Gruppen beleuchtet
    const litFloor = R() < 0.78; let c = 0;
    while (c < COLS) {
      const on = litFloor && R() < 0.3, len = on ? 1 + Math.floor(R() * R() * 7) : 1 + Math.floor(R() * 6), col = pick(R), lvl = 0.55 + R() * 0.45;
      for (let k = 0; k < len && c < COLS; k++, c++) { const x = c * CW; if (on) T.lit(x, wy, CW, wh, col, lvl * (0.85 + R() * 0.15)); else T.glass(x, wy, CW, wh); }
    }
    // Pfosten
    for (let c2 = 0; c2 < COLS; c2++) { const x = c2 * CW; T.rect(x - 3, wy, 7, wh, { h: 0.62, c: 0.13, ro: 0.4, me: 0.8, e: [0, 0, 0], g: 0 }); }
    T.rect(0, wy + wh - 5, N, 5, { h: 0.6, c: 0.14, ro: 0.4, me: 0.8, e: [0, 0, 0], g: 0 }); T.rect(0, wy, N, 4, { h: 0.6, c: 0.1, e: [0, 0, 0], g: 0 });
  }
  // Pfeiler alle sechs Achsen, über alle Geschosse
  for (let c = 0; c < COLS; c += 6) { const x = c * CW - 13; T.rect(x, 0, 26, N, { h: 0.86, c: 0.34, ro: 0.5, me: 0.6, e: [0, 0, 0], g: 0, s: 3 }); T.rect(x, 0, 3, N, { m: 1.25 }); T.rect(x + 23, 0, 3, N, { m: 0.65 }); T.rect(x + 11, 0, 3, N, { h: 0.7, m: 0.5 });
    for (let r = 0; r < ROWS; r++) T.rect(x, r * RH + 14, 26, 3, { h: 0.6, m: 0.4 }); }
  await T.save('kit_hha');
}

// ------------------------------------------------------------------ B: Paneelfassade
{
  const T = new Tex(23), R = T.R, COLS = 8, CW = N / COLS;
  T.rect(0, 0, N, N, { h: 0.5, c: 0.4, ro: 0.6, me: 0.4, s: 1 });
  const used = new Set();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (used.has(r * COLS + c)) continue;
    const x = c * CW, y = r * RH; let w = CW, h = RH;
    const k = R(), base = 0.34 + R() * 0.16 + (R() < 0.12 ? -0.12 : 0) + (R() < 0.1 ? 0.12 : 0), tone = [base, base * 1.01, base * 1.03], ph = 0.48 + R() * 0.07, sm = R() < 0.55 ? 1 : R() < 0.7 ? 2 : 3;
    if (k < 0.1 && c < COLS - 1 && (c + 1) % 4 !== 0) { w = CW * 2; used.add(r * COLS + c + 1); }
    if (k < 0.5) { T.panel(x, y, w, h, { c: tone, h: ph, bolts: true, s: sm }); if (R() < 0.3) T.rect(x + 12, y + h * (0.3 + R() * 0.4), w - 24, 3, { h: 0.36, m: 0.5 }); if (R() < 0.18) T.rect(x + w * 0.5 - 1, y + 10, 3, h - 20, { h: 0.36, m: 0.5 }); }
    else if (k < 0.64) { const n = 2 + Math.floor(R() * 3); for (let j = 0; j < n; j++) { const t2 = base * (0.85 + R() * 0.3); T.panel(x, y + h * j / n, w, h / n, { c: [t2, t2, t2 * 1.03], h: ph + (R() - 0.5) * 0.05, seam: 3, s: sm }); } }
    else if (k < 0.72) { const n = 2; for (let j = 0; j < n; j++) { const t2 = base * (0.85 + R() * 0.3); T.panel(x + w * j / n, y, w / n, h, { c: [t2, t2, t2 * 1.03], h: ph + (R() - 0.5) * 0.05, seam: 3, bolts: true, s: sm }); } }
    else if (k < 0.8) { T.panel(x, y, w, h, { c: tone, h: ph, s: sm }); T.louvers(x + 22, y + 26, w - 44, h - 60, { step: 11 }); }
    else if (k < 0.92) {      // Schlitzfenster
      T.panel(x, y, w, h, { c: tone, h: ph, s: sm }); const n = w > CW ? 6 : 3, sw = 34, on = R() < 0.4, col = pick(R), lvl = 0.6 + R() * 0.4;
      for (let j = 0; j < n; j++) { const sx = x + (j + 0.5) * w / n - sw / 2; T.rect(sx - 5, y + 38, sw + 10, 168, { h: 0.6, c: 0.12, ro: 0.5, me: 0.7 });
        if (on && R() < 0.8) T.lit(sx, y + 43, sw, 158, col, lvl); else T.glass(sx, y + 43, sw, 158); }
    }
    else if (k < 0.97) {      // Wartungsklappe mit Warnstreifen und Griff
      T.panel(x, y, w, h, { c: tone, h: ph, bolts: true, s: sm }); T.panel(x + 40, y + 46, w - 80, h - 96, { c: base * 0.8, h: ph + 0.08, seam: 3, bolts: true, s: 2 });
      for (let j = 0; j < (w - 96) / 24; j++) T.rect(x + 48 + j * 24, y + h - 70, 12, 10, { c: [0.75, 0.55, 0.08] }); T.rect(x + w / 2 - 20, y + h / 2, 40, 6, { h: 0.75, c: 0.1 });
    }
    else {      // Fensterpaar
      T.panel(x, y, w, h, { c: tone, h: ph, s: sm }); for (let j = 0; j < 2; j++) { const sx = x + 30 + j * (w - 60) / 2 + 6, sw = (w - 60) / 2 - 12; T.rect(sx - 5, y + 55, sw + 10, 120, { h: 0.62, c: 0.12 }); if (R() < 0.45) T.lit(sx, y + 60, sw, 110, pick(R), 0.6 + R() * 0.4); else T.glass(sx, y + 60, sw, 110); }
    }
  }
  // Rippen alle vier Paneele, Gesims alle vier Geschosse
  for (let c = 0; c < COLS; c += 4) { const x = c * CW - 10; T.rect(x, 0, 20, N, { h: 0.82, c: 0.3, ro: 0.5, me: 0.6, e: [0, 0, 0], g: 0 }); T.rect(x, 0, 3, N, { m: 1.25 }); T.rect(x + 17, 0, 3, N, { m: 0.6 }); for (let r = 0; r < ROWS * 2; r++) T.rect(x, r * RH / 2, 20, 3, { h: 0.6, m: 0.4 }); }
  for (let r = 0; r < ROWS; r += 4) { const y = r * RH - 14; T.rect(0, y, N, 28, { h: 0.9, c: 0.36, ro: 0.5, me: 0.5, e: [0, 0, 0], g: 0, s: 3 }); T.rect(0, y, N, 3, { m: 1.3 }); T.rect(0, y + 25, N, 3, { m: 0.55 }); for (let k = 0; k < 26; k++) T.rect(0, y + 28 + k, N, 1, { m: 0.62 + 0.38 * k / 26 }); }
  await T.save('kit_hhb');
}

// ------------------------------------------------------------------ C: Bandfassade
{
  const T = new Tex(37), R = T.R, COLS = 24, CW = N / COLS;
  T.rect(0, 0, N, N, { h: 0.6, c: [0.5, 0.49, 0.47], ro: 0.85, me: 0, s: 3 });
  for (let r = 0; r < ROWS; r++) {
    const y = r * RH, wy = y + 30, wh = 122, sy = wy + wh, sh = RH - 30 - wh;
    T.rect(0, y, N, 18, { h: 0.34, c: 0.1, ro: 0.9, me: 0 });      // Schattenfuge unter der Decke
    T.rect(0, y + 18, N, 12, { h: 0.9, c: [0.42, 0.42, 0.41], ro: 0.6, me: 0.3, s: 2 }); T.rect(0, y + 18, N, 2, { m: 1.25 });      // Sonnenblende
    // Brüstung: Betonplatten 3 m, Schalungsanker
    for (let c = 0; c < 8; c++) { const t = 0.44 + R() * 0.12, x = c * N / 8; T.panel(x, sy, N / 8, sh, { c: [t, t * 0.985, t * 0.95], h: 0.6 + R() * 0.03, seam: 3, ro: 0.85, me: 0, s: 3 });
      for (const [bx, by] of [[40, 24], [N / 8 - 46, 24], [40, sh - 30], [N / 8 - 46, sh - 30]]) T.rect(x + bx, sy + by, 6, 6, { h: 0.45, m: 0.5 }); }
    const litFloor = R() < 0.7; let c = 0;
    while (c < COLS) {
      const on = litFloor && R() < 0.4, len = on ? 2 + Math.floor(R() * 9) : 1 + Math.floor(R() * 7), col = pick(R), lvl = 0.5 + R() * 0.5;
      for (let k = 0; k < len && c < COLS; k++, c++) { const x = c * CW; if (on) T.lit(x, wy, CW, wh, col, lvl * (0.85 + R() * 0.15)); else T.glass(x, wy, CW, wh);
        if (R() < 0.07) { T.rect(x + 12, wy + wh - 52, CW - 24, 50, { h: 0.85, c: 0.3, ro: 0.6, me: 0.5, e: [0, 0, 0], g: 0 }); T.louvers(x + 16, wy + wh - 48, CW - 32, 40, { step: 7 }); T.rect(x + 16, wy + wh - 48, CW - 32, 40, { e: [0, 0, 0], g: 0 }); } }
    }
    for (let c2 = 0; c2 < COLS; c2++) T.rect(c2 * CW - 2, wy, 5, wh, { h: 0.62, c: 0.12, ro: 0.4, me: 0.8, e: [0, 0, 0], g: 0 });
    T.rect(0, sy - 6, N, 8, { h: 0.74, c: 0.36, ro: 0.6, me: 0.3, e: [0, 0, 0], g: 0 });      // Fensterbank
  }
  await T.save('kit_hhc');
}
