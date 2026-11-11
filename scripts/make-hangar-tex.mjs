// Erzeugt die kachelbaren Oberflächenbilder des Hangars (asset-src/tex/hangar_*.png, 1024 × 1024, Graustufen mit leichtem Farbstich).
// Alles entsteht rechnerisch und wiederholt sich nahtlos: Rauschen auf einem Gitter, das am Rand umläuft; Linien und Flecken laufen ebenfalls um.
// Die Bilder sind hell gehalten (Mittel um 0,75), weil das Spiel sie mit der Materialfarbe multipliziert; das Relief (Normal-Map)
// errechnet das Spiel selbst aus der Helligkeit (src/core/textures.ts), dunkle Fugen und helle Kanten werden also zu Lichtkanten.
// Aufruf: node scripts/make-hangar-tex.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const N = 1024;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sm = t => t * t * (3 - 2 * t), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), mod = (a, n) => ((a % n) + n) % n;
// Rauschen auf einem umlaufenden Gitter mit px × py Zellen
function lattice(px, py, R) { const g = new Float32Array(px * py); for (let i = 0; i < g.length; i++) g[i] = R(); return (u, v) => { const x = u * px, y = v * py, x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0); const a = g[mod(y0, py) * px + mod(x0, px)], b = g[mod(y0, py) * px + mod(x0 + 1, px)], c = g[mod(y0 + 1, py) * px + mod(x0, px)], d = g[mod(y0 + 1, py) * px + mod(x0 + 1, px)]; return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }; }
function fbm(R, px, py, oct) { const ls = []; for (let o = 0; o < oct; o++) ls.push(lattice(px << o, py << o, R)); return (u, v) => { let s = 0, a = 0.5, n = 0; for (const l of ls) { s += l(u, v) * a; n += a; a *= 0.5; } return s / n; }; }
const field = () => new Float32Array(N * N);
function draw(f, fn) { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) f[y * N + x] = fn(x, y, x / N, y / N); return f; }
// weiche Linie von (x0,y0) nach (x1,y1), umlaufend; add = Helligkeitsänderung
function line(f, x0, y0, x1, y1, w, add) {
  const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(len * 1.5);
  for (let i = 0; i <= steps; i++) { const t = i / steps, cx = x0 + (x1 - x0) * t, cy = y0 + (y1 - y0) * t, fade = Math.sin(t * Math.PI) ** 0.5; for (let dy = -Math.ceil(w); dy <= Math.ceil(w); dy++) for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) { const d = Math.hypot(dx, dy); if (d > w) continue; const k = (1 - d / w) * fade; f[mod(Math.round(cy + dy), N) * N + mod(Math.round(cx + dx), N)] += add * k * 0.5; } }
}
function blob(f, cx, cy, r, add) { for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const d = Math.hypot(dx, dy) / r; if (d < 1) f[mod(Math.round(cy + dy), N) * N + mod(Math.round(cx + dx), N)] += add * sm(1 - d); } }
async function save(name, f, tint = [1, 1, 1]) {
  const buf = Buffer.alloc(N * N * 3);
  for (let i = 0; i < N * N; i++) for (let c = 0; c < 3; c++) buf[i * 3 + c] = Math.round(clamp(f[i] * tint[c]) * 255);
  fs.mkdirSync('asset-src/tex', { recursive: true });
  await sharp(buf, { raw: { width: N, height: N, channels: 3 } }).png().toFile(`asset-src/tex/${name}.png`);
  let s = 0; for (let i = 0; i < N * N; i++) s += f[i];
  console.log(name, 'Mittel', (s / N / N).toFixed(3));
}

// ---------- Boden: Deckplatten mit Fugen, Riffelmuster, Schrauben, Schmutz, Kratzern und Reifenspuren ----------
{
  const R = rng(11), grime = fbm(R, 3, 3, 6), fine = fbm(R, 32, 32, 3), P = 4, cell = N / P, plate = Array.from({ length: P * P }, () => 0.96 + R() * 0.08);
  const f = draw(field(), (x, y, u, v) => {
    const px = Math.floor(x / cell), py = Math.floor(y / cell), lx = x - px * cell, ly = y - py * cell, e = Math.min(lx, ly, cell - lx, cell - ly);
    let c = 0.74 * plate[py * P + px];
    // Riffelblech: kurze schräge Stege, abwechselnd gedreht
    const tx = Math.floor(lx / 18), ty = Math.floor(ly / 18), ox = lx - tx * 18 - 9, oy = ly - ty * 18 - 9, flip = (tx + ty) % 2 ? 1 : -1;
    const along = (ox + flip * oy) * 0.7071, across = (ox - flip * oy) * 0.7071;
    if (e > 9 && Math.abs(along) < 6 && Math.abs(across) < 1.6) c += 0.085 * (1 - Math.abs(across) / 1.6);
    if (e < 2.2) c -= 0.34; else if (e < 4.5) c += 0.07;            // Fuge dunkel, Kante hell
    c *= 0.86 + grime(u, v) * 0.22; c += (fine(u, v) - 0.5) * 0.05;
    return c;
  });
  for (let py = 0; py < P; py++) for (let px = 0; px < P; px++) for (const [ax, ay] of [[12, 12], [cell - 12, 12], [12, cell - 12], [cell - 12, cell - 12]]) { blob(f, px * cell + ax, py * cell + ay, 5, -0.28); blob(f, px * cell + ax, py * cell + ay, 2, 0.2); }
  for (let i = 0; i < 200; i++) { const x = R() * N, y = R() * N, a = R() * Math.PI, l = 14 + R() * 70; line(f, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.8 + R() * 0.6, R() < 0.6 ? 0.08 : -0.09); }
  for (let i = 0; i < 3; i++) { const x = R() * N, y = R() * N, a = R() * Math.PI; for (const o of [-7, 7]) line(f, x + o * Math.sin(a), y - o * Math.cos(a), x + o * Math.sin(a) + Math.cos(a) * 520, y - o * Math.cos(a) + Math.sin(a) * 520, 6, -0.03); }
  for (let i = 0; i < 26; i++) blob(f, R() * N, R() * N, 14 + R() * 46, -0.05 - R() * 0.07);
  await save('hangar_floor', f, [1, 1, 1.01]);
}
// ---------- Wand: lackierte Paneele mit Nähten, Nietenreihen, senkrechten Laufspuren und Lackschäden ----------
{
  const R = rng(23), grime = fbm(R, 4, 2, 5), streak = fbm(R, 96, 3, 3), fine = fbm(R, 48, 48, 2), cw = N / 2, ch = N / 2;
  const f = draw(field(), (x, y, u, v) => {
    const lx = x % cw, ly = y % ch, ex = Math.min(lx, cw - lx), ey = Math.min(ly, ch - ly), e = Math.min(ex, ey);
    let c = 0.8;
    if (e < 2) c -= 0.3; else if (e < 5) c += 0.06;
    const rib = (lx % 64); if (rib < 3 && ey > 14) c -= 0.045; else if (rib < 6 && ey > 14) c += 0.03;     // feine senkrechte Sicken
    c *= 0.9 + grime(u, v) * 0.14; c -= Math.max(0, streak(u, v) - 0.55) * 0.3 * clamp(1 - ly / ch * 0.6); c += (fine(u, v) - 0.5) * 0.035;
    return c;
  });
  for (let k = 0; k < 2; k++) for (let i = 0; i < N; i += 32) { for (const o of [10, ch - 10]) { blob(f, i + 16, k * ch + o, 3.2, -0.2); blob(f, i + 16, k * ch + o - 1, 1.4, 0.2); } for (const o of [10, cw - 10]) { blob(f, k * cw + o, i + 16, 3.2, -0.2); blob(f, k * cw + o, i + 15, 1.4, 0.2); } }
  for (let i = 0; i < 90; i++) { const x = R() * N, y = R() * N; line(f, x, y, x + (R() - 0.5) * 16, y + 20 + R() * 90, 1.2, -0.06); }
  for (let i = 0; i < 70; i++) blob(f, R() * N, R() * N, 2 + R() * 5, -0.12 - R() * 0.1);
  await save('hangar_wall', f, [1, 1, 1]);
}
// ---------- Stahl: gebürstet, mit Kratzern und Anlaufflecken ----------
{
  const R = rng(37), brush = fbm(R, 4, 256, 3), cloud = fbm(R, 3, 3, 5);
  const f = draw(field(), (x, y, u, v) => 0.76 + (brush(u, v) - 0.5) * 0.22 + (cloud(u, v) - 0.5) * 0.14);
  for (let i = 0; i < 160; i++) { const x = R() * N, y = R() * N, a = (R() - 0.5) * 0.5, l = 40 + R() * 240; line(f, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.7 + R() * 0.5, R() < 0.5 ? 0.12 : -0.1); }
  for (let i = 0; i < 18; i++) blob(f, R() * N, R() * N, 20 + R() * 50, -0.05);
  await save('hangar_metal', f, [0.99, 1, 1.02]);
}
// ---------- Lack für Requisiten: fast glatt, mit Schrammen, abgeplatzten Stellen und Schmutzrändern ----------
{
  const R = rng(53), cloud = fbm(R, 4, 4, 5), fine = fbm(R, 64, 64, 2), wear = fbm(R, 10, 10, 4);
  const f = draw(field(), (x, y, u, v) => { let c = 0.86 + (cloud(u, v) - 0.5) * 0.1 + (fine(u, v) - 0.5) * 0.03; const w = wear(u, v); if (w > 0.66) c -= (w - 0.66) * 1.1; return c; });
  for (let i = 0; i < 120; i++) { const x = R() * N, y = R() * N, a = R() * Math.PI, l = 10 + R() * 70; line(f, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 0.8 + R() * 0.8, R() < 0.5 ? 0.09 : -0.16); }
  for (let i = 0; i < 60; i++) blob(f, R() * N, R() * N, 2 + R() * 7, -0.2 - R() * 0.15);
  await save('hangar_paint', f, [1, 1, 1]);
}
