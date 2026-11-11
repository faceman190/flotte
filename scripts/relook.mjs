// Materialwerte (LOOK in glb-lib.mjs) in fertige Modelle schreiben, ohne die Geometrie neu zu rechnen.
// Aufruf: node scripts/relook.mjs <modell.glb> [weitere.glb …]
import { io, LOOK, applyLook } from './glb-lib.mjs';
for (const f of process.argv.slice(2)) {
  const doc = await io.read(f); let n = 0;
  for (const m of doc.getRoot().listMaterials()) { const l = LOOK[m.getName()]; if (l) { applyLook(m, l); n++; } }
  await io.write(f, doc);
  console.log(f, '·', n, 'Materialien angepasst');
}
