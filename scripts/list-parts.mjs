// Teile eines Rohmodells auflisten, die einen Quader schneiden (zum Finden von Türen, Möbeln usw.).
// Koordinaten wie im Spiel (Schiffskoordinaten der Pfeil: x = −z_roh, y = y_roh + dy, z = x_roh + dz).
// Aufruf: node --max-old-space-size=12000 scripts/list-parts.mjs <roh.glb> <karte.json> x0,x1,y0,y1,z0,z1 [maxDickeZ] [--dy=0.62 --dz=19.02]
import fs from 'fs';
import { getBounds } from '@gltf-transform/functions';
import { io, partName } from './glb-lib.mjs';
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [inp, mapFile, boxArg, thickArg] = args.filter(a => !a.startsWith('--'));
const dy = +(opt.dy ?? 0.62), dz = +(opt.dz ?? 19.02), map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
const cacheFile = inp + '.parts.json';
let rows;
if (fs.existsSync(cacheFile)) rows = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
else {
  const doc = await io.read(inp); rows = [];
  for (const n of doc.getRoot().listNodes()) {
    const m = n.getMesh(); if (!m) continue;
    const b = getBounds(n); let t = 0; for (const p of m.listPrimitives()) t += (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
    rows.push({ n: partName(n), t, b: [-b.max[2], -b.min[2], b.min[1] + dy, b.max[1] + dy, b.min[0] + dz, b.max[0] + dz].map(v => Math.round(v * 100) / 100) });
  }
  fs.writeFileSync(cacheFile, JSON.stringify(rows));
}
for (const boxS of boxArg.split(';')) {
  const B = boxS.split(',').map(Number), thick = +(thickArg || 99);
  console.log('--- Quader', boxS);
  for (const r of rows) {
    const b = r.b; if (b[1] < B[0] || b[0] > B[1] || b[3] < B[2] || b[2] > B[3] || b[5] < B[4] || b[4] > B[5]) continue;
    if (b[5] - b[4] > thick) continue;
    console.log(r.n.padEnd(34), (map.parts[r.n] || '?').padEnd(14), `x ${b[0]}…${b[1]}`.padEnd(18), `y ${b[2]}…${b[3]}`.padEnd(18), `z ${b[4]}…${b[5]}`.padEnd(18), r.t);
  }
}
