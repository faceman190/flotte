// =====================================================================================
// Bewegungssatz der Spielerfigur packen: aus den GLB-Dateien des Game Animation Sample (Mannys Skelett) die in
// scripts/clipset.mjs gewählten Clips lesen und als EINE kompakte Datei schreiben (Format LCA1, unten beschrieben).
//
// Warum ein eigenes Format: Als GLB braucht jeder Clip 483 Kanäle mit je eigenem Eintrag; bei 321 Clips waren 28 von 40 MB
// der Datei reine Verwaltung (JSON). Hier gibt es je Clip nur eine Zeile, die Daten liegen als 16-Bit-Drehungen in fester
// Bildfolge (30 je Sekunde) und werden mit Meshopt verdichtet. Spuren, die sich im Clip nicht ändern, kosten einen Wert;
// Spuren in Ruhelage kosten nichts.
//
// Aufruf:  node scripts/build-clips.mjs            packt nach asset-src/lazy/Bewegungen.lca und trägt lazy/Bewegungen in die
//                                                   Paketliste ein (public/assets)
//          node scripts/build-clips.mjs --liste    nur zeigen, was gewählt ist
// Quelle:  asset-src/neu/spielfigur/animationen/*.glb (nicht im Repository; Kopie von OneDrive Blender/Spielfigur/Animationen)
//          und asset-src/neu/lyra/anims/*.glb (Waffenhaltung aus dem Lyra-Paket, nur Oberkörper; OneDrive Blender/lyra_paket.zip).
//          Fehlt der Ordner, bleibt asset-src/lazy/Bewegungen.lca die Quelle – sie liegt im Repository.
//
// Format LCA1 (alles Little Endian):
//   'LCA1' · u32 Länge des JSON · JSON · Auffüllen auf 4 Bytes · Daten
//   JSON: { v, fps, rb: [Knochen mit Drehspur], tb: [Knochen mit Verschiebespur], rest: { r: [...], t: [...] },
//           clips: [{ n: Name, f: Bilder, r: Art je Knochen aus rb, t: Art je Knochen aus tb, o: Beginn in den Daten,
//                     lr, lt: Länge der beiden verdichteten Blöcke }] }
//   Art: 'a' = Spur über alle Bilder, 'c' = ein fester Wert, 'r' = Ruhelage (nichts gespeichert)
//   Daten je Clip: [Meshopt: Drehungen aller 'a'-Knochen, Knochen für Knochen, je Bild 4 × int16 (x, y, z, w) · 32767]
//                  [Meshopt: Verschiebungen aller 'a'-Knochen, je Bild 3 × int32 in 1/50000 m]
//                  [feste Drehungen: je 'c' 4 × int16] [feste Verschiebungen: je 'c' 3 × float32]
// Gelesen wird die Datei von src/game/manny/ClipStore.js.
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { MeshoptEncoder } from 'meshoptimizer';
import { BASE, EXTRA, DROP_BONES, LYRA, LYRA_BONES, LYRA_MOVE } from './clipset.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'neu', 'spielfigur', 'animationen');
const SRC_LYRA = path.join(ROOT, 'asset-src', 'neu', 'lyra', 'anims');      // Waffenhaltung (Lyra Starter Game), siehe clipset.mjs
const LCA = path.join(ROOT, 'asset-src', 'lazy', 'Bewegungen.lca');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const FPS = 30, TSCALE = 50000;
const EPS_ROT = 0.03 * Math.PI / 180, EPS_TR = 2e-5;      // darunter gilt eine Spur als fest bzw. als Ruhelage
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const onlyList = process.argv.includes('--liste');

function readGlb(p) {
  const b = fs.readFileSync(p), jl = b.readUInt32LE(12);
  return { j: JSON.parse(b.toString('utf8', 20, 20 + jl)), bin: b.subarray(20 + jl + 8), cache: new Map() };
}
function acc(g, i) {
  let out = g.cache.get(i); if (out) return out;
  const a = g.j.accessors[i], bv = g.j.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
  if (a.componentType !== 5126 || !n || (bv.byteStride && bv.byteStride !== n * 4) || a.sparse) throw new Error('Accessor ' + i + ': unerwartetes Format');
  const off = (bv.byteOffset || 0) + (a.byteOffset || 0);
  out = new Float32Array(a.count * n);
  new Uint8Array(out.buffer).set(g.bin.subarray(off, off + out.byteLength));
  g.cache.set(i, out);
  return out;
}
const angle = (a, i, b, j) => 2 * Math.acos(Math.min(1, Math.abs(a[i] * b[j] + a[i + 1] * b[j + 1] + a[i + 2] * b[j + 2] + a[i + 3] * b[j + 3])));
// Spur auf die feste Bildfolge bringen (die Quellen sind schon so abgetastet; sonst linear zwischen den Schlüsseln)
function grid(times, vals, n, frames, step) {
  let uniform = times.length === frames;
  for (let k = 0; uniform && k < frames; k++) if (Math.abs(times[k] - k / FPS) > 2e-3) uniform = false;
  if (uniform) return vals;
  const out = new Float32Array(frames * n);
  let k = 0;
  for (let f = 0; f < frames; f++) {
    const t = f / FPS;
    while (k < times.length - 2 && times[k + 1] < t) k++;
    const t0 = times[k], t1 = times[Math.min(k + 1, times.length - 1)];
    const u = t1 > t0 ? (step ? (t >= t1 - 1e-4 ? 1 : 0) : Math.min(1, Math.max(0, (t - t0) / (t1 - t0)))) : 0;   // STEP: der Wert gilt bis zum nächsten Schlüssel
    const a = k * n, b = Math.min(k + 1, times.length - 1) * n;
    let s = 1;
    if (n === 4 && vals[a] * vals[b] + vals[a + 1] * vals[b + 1] + vals[a + 2] * vals[b + 2] + vals[a + 3] * vals[b + 3] < 0) s = -1;
    let len = 0;
    for (let c = 0; c < n; c++) { out[f * n + c] = vals[a + c] * (1 - u) + s * vals[b + c] * u; len += out[f * n + c] ** 2; }
    if (n === 4) { len = Math.sqrt(len) || 1; for (let c = 0; c < 4; c++) out[f * 4 + c] /= len; }
  }
  return out;
}

// ---------- Auswahl ----------
const want = n => BASE.includes(n) || EXTRA.some(re => re.test(n));
if (!fs.existsSync(SRC)) { console.log('Quellordner fehlt (' + SRC + ') – asset-src/lazy/Bewegungen.lca bleibt, wie sie ist.'); install(); process.exit(0); }
if (!fs.existsSync(SRC_LYRA)) throw new Error('Quellordner der Waffenhaltung fehlt: ' + SRC_LYRA + ' (lyra_paket.zip dorthin entpacken)');
const glbs = d => fs.readdirSync(d).filter(x => x.toLowerCase().endsWith('.glb')).sort().map(x => path.join(d, x));
const files = [...glbs(SRC).map(p => ({ p, lyra: false })), ...glbs(SRC_LYRA).map(p => ({ p, lyra: true }))];
let bones = null, rest = null, parents = null;
const clips = [], seen = new Set(), stats = { quellClips: 0, scaleMax: 0, resampled: 0, fremd: 0 };
for (const { p: fp, lyra } of files) {
  const fn = path.basename(fp), g = readGlb(fp), J = g.j;
  // Knochen: alle Knoten unter dem obersten (Manny), in der Reihenfolge der ersten Datei
  const names = J.nodes.map(n => n.name), isBone = J.nodes.map(() => false);
  const walk = i => { isBone[i] = true; for (const c of J.nodes[i].children || []) walk(c); };
  walk(names.indexOf('root'));
  if (!bones) {
    bones = names.filter((n, i) => isBone[i]);
    rest = bones.map(n => { const nd = J.nodes[names.indexOf(n)]; return { r: nd.rotation || [0, 0, 0, 1], t: nd.translation || [0, 0, 0] }; });
    parents = bones.map(n => { const i = names.indexOf(n), p = J.nodes.findIndex(q => (q.children || []).includes(i)); return bones.indexOf(names[p]); });
  }
  const bi = new Map(); names.forEach((n, i) => { const k = bones.indexOf(n); if (isBone[i] && k >= 0) bi.set(i, k); });
  for (const an of J.animations || []) {
    stats.quellClips++;
    if (lyra ? !LYRA.some(re => re.test(an.name)) : !want(an.name)) continue;
    if (seen.has(an.name)) { console.warn('doppelt, übersprungen:', an.name, fn); continue; }
    seen.add(an.name);
    if (onlyList) { clips.push({ n: an.name }); continue; }
    let dur = 0;
    const tr = [];
    for (const ch of an.channels) {
      const b = bi.get(ch.target.node); if (b === undefined) { stats.fremd++; continue; }
      if (lyra && (!LYRA_BONES.test(bones[b]) || (ch.target.path === 'translation' && !LYRA_MOVE.test(bones[b])))) continue;   // Waffenhaltung: nur Oberkörper
      const s = an.samplers[ch.sampler], times = acc(g, s.input);
      if (s.interpolation && s.interpolation !== 'LINEAR' && s.interpolation !== 'STEP') throw new Error(an.name + ': Interpolation ' + s.interpolation);
      dur = Math.max(dur, times[times.length - 1]);
      tr.push({ b, path: ch.target.path, times, vals: acc(g, s.output), step: s.interpolation === 'STEP' });
    }
    const frames = Math.round(dur * FPS) + 1;
    const R = new Array(bones.length).fill(null), T = new Array(bones.length).fill(null);
    for (const t of tr) {
      if (t.path === 'scale') { for (const v of t.vals) stats.scaleMax = Math.max(stats.scaleMax, Math.abs(v - 1)); continue; }
      const n = t.path === 'rotation' ? 4 : 3, v = grid(t.times, t.vals, n, frames, t.step);
      if (v !== t.vals) stats.resampled++;
      (n === 4 ? R : T)[t.b] = v;
    }
    clips.push({ n: an.name, f: frames, R, T, src: fn });
  }
}
const missing = BASE.filter(n => !seen.has(n));
if (missing.length) throw new Error('In den Quellen fehlen ' + missing.length + ' Clips der Grundauswahl, z. B. ' + missing.slice(0, 5).join(', '));
clips.sort((a, b) => (a.n < b.n ? -1 : 1));
if (onlyList) { console.log(clips.length + ' Clips gewählt von ' + stats.quellClips); const fam = {}; for (const c of clips) { const k = c.n.replace(/^M_Neutral_/, '').split('_').slice(0, 2).join('_'); fam[k] = (fam[k] || 0) + 1; } console.log(Object.entries(fam).map(([k, v]) => k + ' ×' + v).join(' · ')); process.exit(0); }

// ---------- Art jeder Spur: Ruhelage, fest oder über alle Bilder ----------
const NB = bones.length, drop = bones.map(n => DROP_BONES.some(re => re.test(n)));
for (const c of clips) {
  c.rk = new Array(NB); c.tk = new Array(NB);
  for (let b = 0; b < NB; b++) {
    const q = c.R[b], p = c.T[b], r0 = rest[b];
    if (!q) c.rk[b] = 'r';
    else {
      // Vorzeichen durchgehend gleich (q und −q sind dieselbe Drehung; so bleiben die Schritte zwischen den Bildern klein)
      for (let f = 1; f < c.f; f++) { const i = f * 4, j = i - 4; if (q[i] * q[j] + q[i + 1] * q[j + 1] + q[i + 2] * q[j + 2] + q[i + 3] * q[j + 3] < 0) for (let k = 0; k < 4; k++) q[i + k] = -q[i + k]; }
      let m = 0; for (let f = 1; f < c.f; f++) m = Math.max(m, angle(q, f * 4, q, 0));
      c.rk[b] = m > EPS_ROT ? 'a' : angle(q, 0, r0.r, 0) > EPS_ROT ? 'c' : 'r';
    }
    if (!p) c.tk[b] = 'r';
    else {
      let m = 0; for (let f = 1; f < c.f; f++) m = Math.max(m, Math.abs(p[f * 3] - p[0]), Math.abs(p[f * 3 + 1] - p[1]), Math.abs(p[f * 3 + 2] - p[2]));
      c.tk[b] = m > EPS_TR ? 'a' : Math.max(Math.abs(p[0] - r0.t[0]), Math.abs(p[1] - r0.t[1]), Math.abs(p[2] - r0.t[2])) > EPS_TR ? 'c' : 'r';
    }
    if (drop[b]) c.rk[b] = c.tk[b] = 'r';
  }
}
const rbI = [], tbI = [];
for (let b = 0; b < NB; b++) { if (clips.some(c => c.rk[b] !== 'r')) rbI.push(b); if (clips.some(c => c.tk[b] !== 'r')) tbI.push(b); }

// ---------- Schreiben ----------
await MeshoptEncoder.ready;
const parts = [], meta = [];
let off = 0, sizeR = 0, sizeT = 0, sizeC = 0, keysR = 0, keysT = 0, secs = 0;
const push = u8 => { parts.push(u8); off += u8.length; };
for (const c of clips) {
  const ra = rbI.filter(b => c.rk[b] === 'a'), rc = rbI.filter(b => c.rk[b] === 'c'), ta = tbI.filter(b => c.tk[b] === 'a'), tc = tbI.filter(b => c.tk[b] === 'c');
  const o = off; let lr = 0, lt = 0;
  if (ra.length) {
    const a = new Int16Array(c.f * ra.length * 4); let k = 0;
    for (const b of ra) { const q = c.R[b]; for (let i = 0; i < c.f * 4; i++) a[k++] = Math.round(Math.max(-1, Math.min(1, q[i])) * 32767); }
    const e = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(a.buffer), c.f * ra.length, 8);
    lr = e.length; push(e); sizeR += lr; keysR += c.f * ra.length;
  }
  if (ta.length) {
    const a = new Int32Array(c.f * ta.length * 3); let k = 0;
    for (const b of ta) { const p = c.T[b]; for (let i = 0; i < c.f * 3; i++) a[k++] = Math.round(p[i] * TSCALE); }
    const e = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(a.buffer), c.f * ta.length, 12);
    lt = e.length; push(e); sizeT += lt; keysT += c.f * ta.length;
  }
  if (rc.length) { const a = new Int16Array(rc.length * 4); rc.forEach((b, i) => { for (let k = 0; k < 4; k++) a[i * 4 + k] = Math.round(c.R[b][k] * 32767); }); push(new Uint8Array(a.buffer)); sizeC += a.byteLength; }
  if (tc.length) { const a = new Float32Array(tc.length * 3); tc.forEach((b, i) => { for (let k = 0; k < 3; k++) a[i * 3 + k] = c.T[b][k]; }); push(new Uint8Array(a.buffer)); sizeC += a.byteLength; }
  while (off % 4) push(new Uint8Array(1));
  meta.push({ n: c.n, f: c.f, r: rbI.map(b => c.rk[b]).join(''), t: tbI.map(b => c.tk[b]).join(''), o, lr, lt });
  secs += (c.f - 1) / FPS;
}
const head = { v: 1, fps: FPS, ts: TSCALE, rb: rbI.map(b => bones[b]), tb: tbI.map(b => bones[b]), clips: meta };
let json = Buffer.from(JSON.stringify(head), 'utf8');
if (json.length % 4) json = Buffer.concat([json, Buffer.alloc(4 - json.length % 4, 0x20)]);
const pre = Buffer.alloc(8); pre.write('LCA1', 0, 'latin1'); pre.writeUInt32LE(json.length, 4);
const buf = Buffer.concat([pre, json, ...parts.map(p => Buffer.from(p.buffer, p.byteOffset, p.length))]);
fs.mkdirSync(path.dirname(LCA), { recursive: true });
fs.writeFileSync(LCA, buf);
const mb = n => (n / 1048576).toFixed(2) + ' MB';
console.log(`${clips.length} Clips (${secs.toFixed(0)} s) aus ${stats.quellClips} · Knochen ${NB}, mit Drehspur ${rbI.length}, mit Verschiebespur ${tbI.length}`);
console.log(`Datei ${mb(buf.length)}: Kopf ${mb(json.length)}, Drehungen ${mb(sizeR)} (${keysR} Werte, ${(sizeR / keysR).toFixed(2)} Byte je Wert), Verschiebungen ${mb(sizeT)} (${keysT} Werte), feste Werte ${mb(sizeC)}`);
console.log(`Skalierung weicht höchstens ${stats.scaleMax.toExponential(1)} von 1 ab (nicht gespeichert) · neu abgetastete Spuren: ${stats.resampled} · Kanäle außerhalb des Skeletts: ${stats.fremd}`);
install();

// asset-src/lazy/Bewegungen.lca in die Paketliste eintragen (wie scripts/build-manny.mjs)
function install() {
  if (!fs.existsSync(LCA) || !fs.existsSync(MAN)) return;
  const b = fs.readFileSync(LCA), m = JSON.parse(fs.readFileSync(MAN, 'utf8')), key = 'lazy/Bewegungen', rel = `${key}.${hash(b)}.bin`;
  for (const k of [key, 'lazy/Manny']) if (m.files[k]) { fs.rmSync(path.join(OUT, m.files[k].url.slice('assets/'.length)), { force: true }); delete m.files[k]; }
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), b);
  m.files[key] = { url: 'assets/' + rel, size: b.length, pack: 'lazy' };
  const packs = {};
  for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
  m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
  fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
  console.log('Paketliste:', rel, mb2(b.length));
}
function mb2(n) { return (n / 1048576).toFixed(2) + ' MB'; }
