// Straßenbeläge (asset-src/neu/stadt/strassen_kit.py): drei kachelnde Böden mit Relief, Nässe und Abnutzung, je 2048 px.
//   kit_sta  Gehweg/Platz, 8 m × 8 m: Betonplatten 2 m × 1 m im Verband, eine Reihe Entwässerungsrost, eine Reihe Stahlplatten mit Riffelung
//   kit_stb  Fahrbahn, 10,24 m × 10,24 m (u längs, v quer über die ganze Breite): Rinnen mit Rost, gelbe Randlinien, zwei Spuren mit Pfeilen,
//            Mittelbett mit zwei Schienen, Leuchtpunkte (Leuchtkarte)
//   kit_stc  Metalldeck, 4 m × 4 m: Gitterroste 1 m × 1 m im Rahmen, dazwischen Riffelbleche
// Je Boden vier Bilder: _col, _emi, _nrm, _orm (R Verdeckung, G Rauheit, B Metall). Pfützen: glatt, dunkel, kaum Relief.
// Ablage wie die Hochhausfassaden in asset-src/neu/stadt/tex (nicht im Kernpaket des Spiels).
// Aufruf: node scripts/make-kit-str.mjs
import fs from 'fs';
import sharp from 'sharp';
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
    this.R = rng(seed); this.H = new Float32Array(N * N).fill(0.5); this.A = new Float32Array(N * N * 3).fill(0.3);
    this.Ro = new Float32Array(N * N).fill(0.7); this.Me = new Float32Array(N * N); this.E = new Float32Array(N * N * 3);
    this.D = new Float32Array(N * N).fill(1);      // 1 = kann nass werden (Pfützen), 0 = Rost/Gitter (läuft ab)
  }
  rect(x, y, w, h, o) {
    const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
    const c = o.c === undefined ? null : (typeof o.c === 'number' ? [o.c, o.c, o.c] : o.c), a = o.a === undefined ? 1 : o.a;
    for (let yy = y0; yy < y1; yy++) { const r = W(yy) * N; for (let xx = x0; xx < x1; xx++) { const i = r + W(xx);
      if (o.h !== undefined) this.H[i] = o.h; if (o.dh !== undefined) this.H[i] += o.dh;
      if (c) { this.A[i * 3] += (c[0] - this.A[i * 3]) * a; this.A[i * 3 + 1] += (c[1] - this.A[i * 3 + 1]) * a; this.A[i * 3 + 2] += (c[2] - this.A[i * 3 + 2]) * a; }
      if (o.m !== undefined) { this.A[i * 3] *= o.m; this.A[i * 3 + 1] *= o.m; this.A[i * 3 + 2] *= o.m; }
      if (o.ro !== undefined) this.Ro[i] = o.ro; if (o.me !== undefined) this.Me[i] = o.me;
      if (o.e) { this.E[i * 3] = o.e[0]; this.E[i * 3 + 1] = o.e[1]; this.E[i * 3 + 2] = o.e[2]; }
      if (o.d !== undefined) this.D[i] = o.d; } }
  }
  plate(x, y, w, h, o) {      // Platte mit Fuge ringsum und Kantenlicht
    const s = o.seam === undefined ? 4 : o.seam, hh = o.h === undefined ? 0.5 : o.h;
    this.rect(x, y, w, h, { h: 0.3, c: 0.045, ro: 0.95, me: 0 });
    this.rect(x + s, y + s, w - 2 * s, h - 2 * s, { h: hh, c: o.c, ro: o.ro === undefined ? 0.75 : o.ro, me: o.me || 0, d: o.d === undefined ? 1 : o.d });
    this.rect(x + s, y + s, w - 2 * s, 2, { m: 1.18 }); this.rect(x + s, y + h - s - 2, w - 2 * s, 2, { m: 0.75 });
  }
  grate(x, y, w, h, step, along) {      // Gitterrost: Stäbe quer (along=false) oder längs
    this.rect(x, y, w, h, { h: 0.12, c: 0.015, ro: 0.9, me: 0, d: 0 });
    if (along) for (let b = 0; b + 3 < h; b += step) this.rect(x, y + b, w, step * 0.45, { h: 0.52, c: 0.15, ro: 0.42, me: 0.85, d: 0 });
    else for (let b = 0; b + 3 < w; b += step) this.rect(x + b, y, step * 0.45, h, { h: 0.52, c: 0.15, ro: 0.42, me: 0.85, d: 0 });
  }
  tread(x, y, w, h, c) {      // Riffelblech: kleine schräge Stege
    this.plate(x, y, w, h, { c, h: 0.5, ro: 0.42, me: 0.85, seam: 3, d: 0.5 });
    for (let yy = y + 12; yy < y + h - 14; yy += 14) for (let xx = x + 12 + ((Math.round((yy - y) / 14) % 2) * 9); xx < x + w - 16; xx += 18) { const up = Math.round((yy - y) / 14 + (xx - x) / 18) % 2;
      for (let k = 0; k < 8; k++) this.rect(xx + k, yy + (up ? k : 7 - k) * 0.6, 2, 3, { h: 0.6, m: 1.12 }); }
    for (const [bx, by] of [[x + 8, y + 8], [x + w - 14, y + 8], [x + 8, y + h - 14], [x + w - 14, y + h - 14]]) this.rect(bx, by, 6, 6, { h: 0.62, m: 0.55 });
  }
  async save(name, wet = 0.5) {
    const { H, A, Ro, Me, E, D } = this, R = rng(500 + name.charCodeAt(name.length - 1) * 31);
    const blur = (src, r) => { const t = new Float32Array(N * N), d = new Float32Array(N * N), k = 1 / (2 * r + 1);
      for (let y = 0; y < N; y++) { let s = 0; for (let i = -r; i <= r; i++) s += src[y * N + W(i)]; for (let x = 0; x < N; x++) { t[y * N + x] = s * k; s += src[y * N + W(x + r + 1)] - src[y * N + W(x - r)]; } }
      for (let x = 0; x < N; x++) { let s = 0; for (let i = -r; i <= r; i++) s += t[W(i) * N + x]; for (let y = 0; y < N; y++) { d[y * N + x] = s * k; s += t[W(y + r + 1) * N + x] - t[W(y - r) * N + x]; } }
      return d; };
    const n1 = latt(6, R), n2 = latt(22, R), n3 = latt(90, R), n4 = latt(360, R), n5 = latt(900, R), p1 = latt(5, R), p2 = latt(17, R), st = latt(14, R);
    // feines Korn in die Höhe (Beton, Asphalt), dann weichzeichnen
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; if (Me[i] < 0.5) H[i] += (n5(x / N, y / N) - 0.5) * 0.05 + (n4(x / N, y / N) - 0.5) * 0.03; }
    const Hb = blur(blur(H, 5), 5), Hs = blur(H, 1), Wt = new Float32Array(N * N), AO = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, u = x / N, v = y / N;
      const cav = Math.max(0, Math.min(1, (Hb[i] - H[i]) * 5)), edge = Math.max(0, Math.min(1, (H[i] - Hb[i]) * 6));
      AO[i] = 1 - cav * 0.7;
      // Pfützen: große weiche Flecken, dazu Nässe in den Fugen
      const pm = p1(u, v) * 0.62 + p2(u, v) * 0.38, t = Math.max(0, Math.min(1, (pm - (1 - wet * 0.9) + 0.06) / 0.24)), w = Math.min(1, (t * t * (3 - 2 * t)) * D[i] + cav * 0.5 * D[i]);
      Wt[i] = w;
      let k = 0.78 + 0.24 * n1(u, v) + 0.14 * n2(u, v) + 0.1 * n3(u, v) + 0.08 * n4(u, v);
      k *= 1 - cav * 0.5; k += edge * 0.07;
      const s = Math.max(0, st(u, v) * 0.6 + n2(u, v) * 0.4 - 0.7) * 3.0;      // Ölflecken
      k *= 1 - Math.min(0.6, s);
      for (let c = 0; c < 3; c++) A[i * 3 + c] *= k * (1 - 0.42 * w);
      Ro[i] = Math.max(0.04, Math.min(1, (Ro[i] + 0.22 * (n3(u, v) - 0.5) + cav * 0.2 - Math.min(0.3, s) - edge * 0.1) * (1 - w) + 0.05 * w));
    }
    const col = Buffer.alloc(N * N * 3), emi = Buffer.alloc(N * N * 3), nrm = Buffer.alloc(N * N * 3), orm = Buffer.alloc(N * N * 3), b = (f) => Math.max(0, Math.min(255, Math.round(f * 255)));
    const S = 9.0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, f = 1 - 0.9 * Wt[i];
      col[i * 3] = b(A[i * 3]); col[i * 3 + 1] = b(A[i * 3 + 1]); col[i * 3 + 2] = b(A[i * 3 + 2]);
      emi[i * 3] = b(E[i * 3]); emi[i * 3 + 1] = b(E[i * 3 + 1]); emi[i * 3 + 2] = b(E[i * 3 + 2]);
      const dx = (Hs[y * N + W(x + 1)] - Hs[y * N + W(x - 1)]) * S * f, dy = (Hs[W(y + 1) * N + x] - Hs[W(y - 1) * N + x]) * S * f;
      const nx = -dx, ny = dy, l = Math.hypot(nx, ny, 1);
      nrm[i * 3] = b(nx / l * 0.5 + 0.5); nrm[i * 3 + 1] = b(ny / l * 0.5 + 0.5); nrm[i * 3 + 2] = b(1 / l * 0.5 + 0.5);
      orm[i * 3] = b(AO[i]); orm[i * 3 + 1] = b(Ro[i]); orm[i * 3 + 2] = b(Me[i]);
    }
    const w = (buf, suf) => sharp(buf, { raw: { width: N, height: N, channels: 3 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}_${suf}@2048.png`);
    await Promise.all([w(col, 'col'), w(emi, 'emi'), w(nrm, 'nrm'), w(orm, 'orm')]);
    console.log(name, 'ok');
  }
}

// ------------------------------------------------------------------ A: Gehweg / Platz (256 px je Meter)
{
  const T = new Tex(5), R = T.R, M = N / 8;
  T.rect(0, 0, N, N, { h: 0.5, c: 0.3, ro: 0.78, me: 0 });
  for (let r = 0; r < 8; r++) {
    const y = r * M;
    if (r === 3) {      // Entwässerungsrost über die ganze Breite, in Rahmen
      T.rect(0, y, N, M, { h: 0.5, c: 0.2, ro: 0.5, me: 0.8, d: 0 }); T.rect(0, y + 60, N, M - 120, { h: 0.34, c: 0.05, d: 0 });
      for (let x = 0; x < N; x += M * 2) { T.grate(x + 10, y + 66, M * 2 - 20, M - 132, 13, false); T.rect(x - 4, y + 60, 8, M - 120, { h: 0.5, c: 0.2, ro: 0.5, me: 0.8, d: 0 }); }
      for (let x = 20; x < N; x += M) for (const yy of [y + 22, y + M - 34]) T.rect(x, yy, 10, 10, { h: 0.58, m: 0.5 });
      T.rect(0, y, N, 3, { h: 0.3, c: 0.04 }); T.rect(0, y + M - 3, N, 3, { h: 0.3, c: 0.04 });
    } else if (r === 7) {      // Stahlplatten mit Riffelung, eine davon Schachtdeckel mit gelben Ecken
      for (let c = 0; c < 8; c++) { const t = 0.17 + R() * 0.07; T.tread(c * M, y, M, M, [t, t, t * 1.04]);
        if (c === 5) { for (const [bx, by] of [[18, 18], [M - 58, 18], [18, M - 34], [M - 58, M - 34]]) T.rect(c * M + bx, y + by, 40, 16, { c: [0.72, 0.5, 0.06], a: 0.85 }); T.rect(c * M + M / 2 - 26, y + M / 2 - 5, 52, 10, { h: 0.34, c: 0.03 }); } }
    } else {      // Betonplatten 2 m × 1 m, jede zweite Reihe versetzt
      const off = (r % 2) * M;
      for (let c = 0; c < 4; c++) { const t = 0.27 + R() * 0.1, x = c * M * 2 + off; T.plate(x, y, M * 2, M, { c: [t, t * 0.99, t * 0.96], h: 0.5 + (R() - 0.5) * 0.04, ro: 0.72 + R() * 0.15 });
        if (R() < 0.3) { let cx = x + 30 + R() * (M * 2 - 60), cy = y + 6; for (let k = 0; k < 60 && cy < y + M - 6; k++) { T.rect(cx, cy, 2, 5, { h: 0.34, c: 0.06 }); cx += (R() - 0.5) * 7; cy += 4; } }      // Riss
        if (R() < 0.12) T.rect(x + M - 22, y + M / 2 - 22, 44, 44, { h: 0.44, c: 0.14, ro: 0.5, me: 0.8 }); }      // Bodenhülse
    }
  }
  await T.save('kit_sta', 0.52);
}

// ------------------------------------------------------------------ B: Fahrbahn (200 px je Meter; u längs, v quer)
{
  const T = new Tex(9), R = T.R, P = 200;
  T.rect(0, 0, N, N, { h: 0.5, c: 0.085, ro: 0.82, me: 0 });
  // Plattenfugen quer, alle 5,12 m
  for (const x of [0, N / 2]) T.rect(x - 3, 0, 6, N, { h: 0.32, c: 0.03, ro: 0.95 });
  const lane = (y0, y1, dir) => {
    // Fahrspuren der Räder: glatter, dunkler
    for (const f of [0.28, 0.72]) { const yy = y0 + (y1 - y0) * f; for (let k = -34; k < 34; k++) T.rect(0, yy + k, N, 1, { m: 0.86 + 0.14 * Math.abs(k) / 34 }); }
    // Pfeil (abgenutztes Weiß)
    const cy = (y0 + y1) / 2, x0 = N * 0.28, len = 520, hw = 26;
    for (let x = 0; x < len; x++) for (let y = -110; y <= 110; y++) {
      const t = dir > 0 ? x : len - 1 - x; let inside = false;
      if (t < len - 190) inside = Math.abs(y) <= hw; else inside = Math.abs(y) <= (len - t) / 190 * 108;
      if (inside && R() < 0.82) { const i = W(cy + y) * N + W(x0 + x); T.A[i * 3] = 0.62; T.A[i * 3 + 1] = 0.63; T.A[i * 3 + 2] = 0.6; T.Ro[i] = 0.55; T.H[i] = 0.515; }
    }
  };
  const g = 60, yl = 20, c0 = 790, c1 = 1258;
  lane(g + yl, c0, 1); lane(c1, N - g - yl, -1);
  // Rinnen mit Rost, gelbe Randlinien
  for (const [y, yy] of [[0, g], [N - g, N - g - yl]]) {
    T.rect(0, y, N, g, { h: 0.44, c: 0.13, ro: 0.5, me: 0.8, d: 0 }); T.grate(0, y + 10, N, g - 20, 12, false);
    for (let x = 0; x < N; x++) for (let k = 0; k < yl; k++) if (R() < 0.8) { const i = W(yy + k) * N + x; T.A[i * 3] = 0.7; T.A[i * 3 + 1] = 0.5; T.A[i * 3 + 2] = 0.06; T.Ro[i] = 0.55; }
  }
  // Mittelbett: Stahlplatten, zwei Schienen, Rillen, Leuchtpunkte
  T.rect(0, c0, N, c1 - c0, { h: 0.5, c: 0.12, ro: 0.5, me: 0.75, d: 0.6 });
  for (let x = 0; x < N; x += 256) { const t = 0.1 + R() * 0.05; T.plate(x, c0 + 90, 256, c1 - c0 - 180, { c: [t, t, t * 1.05], ro: 0.45, me: 0.8, seam: 3, d: 0.6 }); if (R() < 0.3) T.grate(x + 30, c0 + 130, 196, c1 - c0 - 260, 12, true); }
  for (const ry of [c0 + 40, c1 - 62]) { T.rect(0, ry - 12, N, 46, { h: 0.34, c: 0.03, ro: 0.9, me: 0, d: 0 }); T.rect(0, ry, N, 22, { h: 0.66, c: 0.42, ro: 0.2, me: 1, d: 0 }); T.rect(0, ry + 8, N, 6, { h: 0.6, m: 1.2 }); }
  for (const ly of [c0 + 8, c1 - 20]) for (let x = 128; x < N; x += 512) { T.rect(x - 16, ly - 2, 44, 16, { h: 0.56, c: 0.08, ro: 0.4, me: 0.8, d: 0 }); T.rect(x - 8, ly + 2, 28, 8, { h: 0.58, c: [0.5, 0.9, 0.95], ro: 0.3, e: [0.45, 0.95, 1.0], d: 0 }); }
  await T.save('kit_stb', 0.5);
}

// ------------------------------------------------------------------ C: Metalldeck (512 px je Meter)
{
  const T = new Tex(13), R = T.R, M = N / 4;
  T.rect(0, 0, N, N, { h: 0.5, c: 0.16, ro: 0.45, me: 0.85, d: 0 });
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    const x = c * M, y = r * M;
    if (R() < 0.3) { const t = 0.15 + R() * 0.06; T.tread(x, y, M, M, [t, t, t * 1.05]); }
    else { T.rect(x, y, M, M, { h: 0.3, c: 0.04, d: 0 }); T.rect(x + 5, y + 5, M - 10, M - 10, { h: 0.56, c: 0.19, ro: 0.42, me: 0.85, d: 0 }); T.rect(x + 30, y + 30, M - 60, M - 60, { h: 0.1, c: 0.012, ro: 0.9, me: 0, d: 0 });
      for (let b = 0; b + 4 < M - 60; b += 20) T.rect(x + 30 + b, y + 30, 7, M - 60, { h: 0.5, c: 0.15, ro: 0.42, me: 0.85, d: 0 });
      for (let b = 60; b + 4 < M - 60; b += 110) T.rect(x + 30, y + 30 + b, M - 60, 9, { h: 0.53, c: 0.17, ro: 0.42, me: 0.85, d: 0 });
      for (const [bx, by] of [[12, 12], [M - 22, 12], [12, M - 22], [M - 22, M - 22]]) T.rect(x + bx, y + by, 10, 10, { h: 0.62, m: 0.5 }); }
  }
  await T.save('kit_stc', 0.0);
}
