// Bewegung aus einer GLB-Datei unverändert als Animationsclip ablegen (asset-src/data/anim_<name>.json).
// Gedacht für die Figuren mit dem einheitlichen Mixamo-Skelett (Vorbild Tamm, siehe docs/assets.md, „Mixamo-Skelett“):
// Blender schreibt die Bewegung aus dem Mixamo-Paket mit `export_clip` (Text figur_mixamo in Figuren.blend) als GLB,
// dieses Skript macht daraus die Spuren für THREE.AnimationClip.parse. Es wird nichts umgerechnet, nur abgetastet.
//   node scripts/glb-anim.mjs <clip.glb> <name> [--fps=30] [--inplace] [--in=s --out=s] [--alt=s]
//   --inplace  Vorwärtsbewegung der Hüfte herausnehmen (gleichmäßiger Anteil; das Wiegen bleibt). Tempo steht in meta.
import fs from 'fs';
const args = process.argv.slice(2), flag = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = '1'] = a.slice(2).split('='); return [k, v]; }));
const [inp, name] = args.filter(a => !a.startsWith('--'));
const FPS = +(flag.fps || 30), INPLACE = !!flag.inplace;
const b = fs.readFileSync(inp), jl = b.readUInt32LE(12), j = JSON.parse(b.subarray(20, 20 + jl).toString('utf8')), bin = b.subarray(20 + jl + 8);
const acc = i => {
  const a = j.accessors[i], v = j.bufferViews[a.bufferView], n = { SCALAR: 1, VEC3: 3, VEC4: 4 }[a.type];
  const off = (v.byteOffset || 0) + (a.byteOffset || 0), buf = Buffer.from(bin.subarray(off, off + a.count * n * 4));
  return { n, data: new Float32Array(buf.buffer, buf.byteOffset, a.count * n) };
};
const anim = j.animations?.[0];
if (!anim) throw new Error('keine Animation in der Datei');
const chans = anim.channels.map(c => { const s = anim.samplers[c.sampler]; return { bone: j.nodes[c.target.node].name, path: c.target.path, t: acc(s.input).data, v: acc(s.output) }; })
  .filter(c => c.path === 'rotation' || (c.path === 'translation' && c.bone === 'Hips'));
const t0 = Math.min(...chans.map(c => c.t[0])), tEnd = Math.max(...chans.map(c => c.t[c.t.length - 1]));
const T0 = t0 + +(flag.in || 0), T1 = flag.out ? Math.min(tEnd, t0 + +flag.out) : tEnd, DUR = T1 - T0;
const frames = Math.max(2, Math.round(DUR * FPS) + 1), times = Array.from({ length: frames }, (_, i) => +Math.min(DUR, i / FPS).toFixed(4));
const sample = (c, t) => {   // linear zwischen den Stützstellen; Drehungen danach normiert
  const T = c.t, n = c.v.n, d = c.v.data; let i = 0;
  while (i < T.length - 2 && T[i + 1] < t) i++;
  const f = T.length < 2 ? 0 : Math.max(0, Math.min(1, (t - T[i]) / Math.max(1e-9, T[i + 1] - T[i]))), a = i * n, bb = Math.min(T.length - 1, i + 1) * n, o = [];
  let dot = 0; if (n === 4) for (let k = 0; k < 4; k++) dot += d[a + k] * d[bb + k];
  for (let k = 0; k < n; k++) o.push(d[a + k] * (1 - f) + (n === 4 && dot < 0 ? -1 : 1) * d[bb + k] * f);
  if (n === 4) { const l = Math.hypot(...o) || 1; for (let k = 0; k < 4; k++) o[k] /= l; }
  return o;
};
const tracks = []; let hips = null;
for (const c of chans) {
  const values = []; let prev = null;
  for (const t of times) {
    const q = sample(c, T0 + t);
    if (c.v.n === 4 && prev && prev[0] * q[0] + prev[1] * q[1] + prev[2] * q[2] + prev[3] * q[3] < 0) for (let k = 0; k < 4; k++) q[k] = -q[k];   // gleiche Halbkugel
    prev = q; values.push(...q);
  }
  if (c.path === 'translation') hips = values;
  else tracks.push({ name: `${c.bone}.quaternion`, type: 'quaternion', times, values: values.map(v => +v.toFixed(5)) });
}
if (!hips) throw new Error('keine Hüftspur');
// Tempo: Die Hüfte liegt in Zentimetern unter dem Skelett-Objekt (Maßstab 0,01), vorwärts ist +Z
const fwd = times.map((_, i) => hips[i * 3 + 2] * 0.01), dist = fwd[frames - 1] - fwd[0];
if (INPLACE) for (let i = 0; i < frames; i++) hips[i * 3 + 2] -= (dist / 0.01) * (times[i] / DUR);
tracks.push({ name: 'Hips.position', type: 'vector', times, values: hips.map(v => +v.toFixed(3)) });
const raw = fwd.map((_, i) => { const a = Math.max(0, i - 1), c = Math.min(frames - 1, i + 1); return (fwd[c] - fwd[a]) / Math.max(1e-6, times[c] - times[a]); });
const speed = raw.map((_, i) => { let s = 0, n = 0; for (let k = Math.max(0, i - 2); k <= Math.min(frames - 1, i + 2); k++) { s += raw[k]; n++; } return +Math.max(0, s / n).toFixed(3); });
const meta = { fps: FPS, pace: +(dist / DUR).toFixed(3), inplace: INPLACE, ...(INPLACE ? { speed } : {}), ...(flag.alt ? { alt: +flag.alt } : {}) };
const file = `asset-src/data/anim_${name}.json`;
fs.writeFileSync(file, JSON.stringify({ name, duration: +DUR.toFixed(4), meta, tracks }));
const ys = hips.filter((_, i) => i % 3 === 1);
console.log(`${name}: ${tracks.length} Spuren, ${frames} Bilder (${FPS}/s), ${DUR.toFixed(2)} s, Tempo ${meta.pace} m/s${INPLACE ? ' (auf der Stelle)' : ''}, Hüfthöhe ${Math.min(...ys).toFixed(1)}–${Math.max(...ys).toFixed(1)} cm → ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
