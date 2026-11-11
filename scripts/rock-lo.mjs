// Leichte Fassung des Felsmodells für Geröll und Brocken in den Asteroidenfeldern (viele Hundert Stück je Feld).
// Liest asset-src/data/Rock.json (Positionen und Texturkoordinaten je Dreiecksecke) und schreibt RockLo.json im selben Format.
// Aufruf: node scripts/rock-lo.mjs [Anteil der Dreiecke, Vorgabe 0.3]
import fs from 'fs';
import { MeshoptSimplifier } from 'meshoptimizer';
await MeshoptSimplifier.ready;
const ratio = +(process.argv[2] || 0.3);
const d = JSON.parse(fs.readFileSync('asset-src/data/Rock.json', 'utf8'));
// Ecken mit gleicher Lage und gleicher Texturkoordinate zusammenlegen
const key = new Map(), P = [], U = [], idx = [];
for (let i = 0; i < d.pos.length / 3; i++) {
  const k = [d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2], d.uv[i * 2], d.uv[i * 2 + 1]].join(',');
  let j = key.get(k);
  if (j === undefined) { j = P.length / 3; key.set(k, j); P.push(d.pos[i * 3], d.pos[i * 3 + 1], d.pos[i * 3 + 2]); U.push(d.uv[i * 2], d.uv[i * 2 + 1]); }
  idx.push(j);
}
const target = Math.floor(idx.length * ratio / 3) * 3;
const [out, err] = MeshoptSimplifier.simplify(new Uint32Array(idx), new Float32Array(P), 3, target, 0.2);
const pos = [], uv = [];
for (const j of out) { pos.push(P[j * 3], P[j * 3 + 1], P[j * 3 + 2]); uv.push(U[j * 2], U[j * 2 + 1]); }
fs.writeFileSync('asset-src/data/RockLo.json', JSON.stringify({ pos, uv }));
console.log(`${idx.length / 3} → ${out.length / 3} Dreiecke (Abweichung ${err.toFixed(4)}) → asset-src/data/RockLo.json`);
