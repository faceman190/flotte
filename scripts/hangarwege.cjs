// Prüft die Standflächen des Bastion-Hangars (asset-src/data/hangar_bastion2.json, aus lm2_hangar_lauf.py) gegen die Wege und Plätze,
// die im Spiel frei bleiben müssen (src/game/interior.ts):  node scripts/hangarwege.cjs
// Blender-Lage: x wie im Spiel, y = −z des Spiels. Ein Läufer braucht 0,35 m Abstand, ein Standplatz 0,6 m.
const fs = require('fs'), path = require('path');
const B = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'asset-src', 'data', 'hangar_bastion2.json'), 'utf8')).bloecke;
const seg = (ax, ay, bx, by, r, name) => {      // Strecke gegen alle Rechtecke (um r erweitert)
  const hits = [];
  for (const [x0, x1, y0, y1] of B) {
    const X0 = x0 - r, X1 = x1 + r, Y0 = y0 - r, Y1 = y1 + r; let t0 = 0, t1 = 1; const dx = bx - ax, dy = by - ay; let ok = true;
    for (const [p, q] of [[-dx, ax - X0], [dx, X1 - ax], [-dy, ay - Y0], [dy, Y1 - ay]]) {
      if (Math.abs(p) < 1e-9) { if (q < 0) { ok = false; break; } } else { const t = q / p; if (p < 0) { if (t > t1) { ok = false; break; } t0 = Math.max(t0, t); } else { if (t < t0) { ok = false; break; } t1 = Math.min(t1, t); } }
    }
    if (ok && t0 <= t1) hits.push([x0, x1, y0, y1]);
  }
  return hits.length ? [{ name, von: [ax, ay], nach: [bx, by], bloecke: hits }] : [];
};
const pfad = (pts, r, name, zu = false) => { const out = []; for (let i = 0; i + 1 < pts.length; i++) out.push(...seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], r, name + ' ' + i)); if (zu) out.push(...seg(pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1], r, name + ' Schluss')); return out; };
const g = (x, z) => [x, -z];      // Spiel → Blender
let bad = [];
// Läufer hinter den Stellplätzen (mz = −34): Regal, Fahrweg, Deckmeister
bad.push(...pfad([g(-50, -34), g(-52, -42.8), g(-50, -28), g(30, -28), g(30, -34), g(15.6, -44.4), g(14, -34)], 0.35, 'Runde', true));
// Läufer an den Längswänden mit drei Wandgeräten
for (const sd of [1, -1]) { const wx = sd * 85.6, pts = [g(wx, 92)]; for (const z of [63.5, 19.5, -24.5]) pts.push(g(wx, z + 4.5), g(sd * 87.3, z), g(wx, z - 4.5)); pts.push(g(wx, -37)); bad.push(...pfad(pts, 0.35, 'Wand ' + (sd > 0 ? 'rechts' : 'links'))); }
// Plätze: Gesprächsgruppen, Treffpunkt der Geschichte, Buchtenwahl, Deckmeister
for (const [name, x, z, r] of [['Gruppe links', -22, -41, 1.6], ['Gruppe rechts', 58, -41.5, 1.5], ['Treffpunkt', -7, -43, 1.2], ['Treffpunkt', -3, -43, 1.2], ['Buchtenwahl', 0, -46.4, 0.6], ['Deckmeister', 10.5, -45.8, 0.6], ['Meister', 12, -47.4, 0.4]]) bad.push(...seg(x, -z, x, -z, r, name));
// Streifen vor dem Ausgang (x −30 … 30, y 24,5 … 41) und die Schiffe (Stellplätze bis y = 15, Platzbreite)
for (const [x0, x1, y0, y1] of B) {
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (x1 > -30 && x0 < 30 && y1 > 24.5 && y0 < 41 && !(cy > 40)) bad.push({ name: 'Streifen vor dem Ausgang', bloecke: [[x0, x1, y0, y1]] });
  for (const [px, hw] of [[-60, 26], [0, 30], [60, 26]]) if (Math.abs(cx - px) < hw - 1 && cy < 15 && cy > -80) bad.push({ name: 'auf Stellplatz ' + px, bloecke: [[x0, x1, y0, y1]] });
}
console.log(JSON.stringify({ bloecke: B.length, treffer: bad.length, bad }, null, 1));
