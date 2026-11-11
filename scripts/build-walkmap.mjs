// Laufkarte für einen begehbaren Schiffsinnenraum aus einem Innenmodell erzeugen.
// Koordinaten wie im Spiel: Schiffsmitte (Mitte des Außenmodells) im Ursprung, Nase nach −Z (Modell um 180° gedreht).
//  1. Senkrechte Strahlen im Raster: waagerechte Flächen mit genug Kopfhöhe darüber sind Boden (mehrere Decks je Spalte).
//  2. Waagerechte Strahlen zwischen Nachbarzellen in Knie-, Bauch- und Kopfhöhe: Wände.
//  3. Nachbarn mit höchstens 0,45 m Höhenunterschied sind verbunden (Treppen, Rampen).
//  4. Abstand zu Wänden: eine Zelle zählt nur, wenn alle acht Nachbarn verbunden sind.
//  5. Der größte zusammenhängende Bereich unter einer Decke ist der Innenraum.
//  6. Punkte: Pilotensitz (ganz vorn), Einstieg (hinten unten), Koje (beim Holz), Logbuch, Spind, Lichter, Bereiche.
// Aufruf: node --max-old-space-size=12000 scripts/build-walkmap.mjs <innen.glb> <außen.glb> <aus.json> [--cell=0.2]
import fs from 'fs';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { getBounds } from '@gltf-transform/functions';
import { io } from './glb-lib.mjs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [inInner, inOuter, out] = args.filter(a => !a.startsWith('--'));
const CELL = +(opt.cell || 0.2), HEAD = 1.95, STEP = 0.45;
const t0 = Date.now();
const outer = await io.read(inOuter), ob = getBounds(outer.getRoot().listScenes()[0]);
const cx = (ob.min[0] + ob.max[0]) / 2, cy = (ob.min[1] + ob.max[1]) / 2, cz = (ob.min[2] + ob.max[2]) / 2;
const toShip = (x, y, z) => [-(x - cx), y - cy, -(z - cz)];   // Mitte abziehen, um 180° drehen
if (opt.debug) console.log(`Mitte (Modellkoordinaten) ${cx.toFixed(2)} / ${cy.toFixed(2)} / ${cz.toFixed(2)} · Modell = (−x + ${cx.toFixed(2)}, y + ${cy.toFixed(2)}, −z + ${cz.toFixed(2)})`);

// Innen- und Außenmodell einlesen (Dreiecke in Schiffskoordinaten), Holz-Bereich merken (für die Koje).
// Beide zusammen: Teile der Decks sind von außen sichtbar und stecken deshalb im Außenmodell; im Spiel stehen beide ineinander.
const doc = await io.read(inInner);
const allNodes = [...doc.getRoot().listNodes(), ...outer.getRoot().listNodes()];
let nv = 0, nt = 0;
for (const n of allNodes) { const m = n.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) { nv += p.getAttribute('POSITION').getCount(); const i = p.getIndices(); nt += i ? i.getCount() / 3 : p.getAttribute('POSITION').getCount() / 3; } }
const pos = new Float32Array(nv * 3), idx = new Uint32Array(nt * 3);
const wood = new THREE.Box3(); let vo = 0, to = 0;
for (const n of allNodes) {
  const m = n.getMesh(); if (!m) continue;
  for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION'), arr = a.getArray(), c = a.getCount(), ind = p.getIndices(), ia = ind ? ind.getArray() : null, tc = ind ? ind.getCount() / 3 : c / 3;
    const isWood = p.getMaterial()?.getName() === 'wood_mat';
    for (let k = 0; k < c; k++) { const s = toShip(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]); pos.set(s, (vo + k) * 3); if (isWood) wood.expandByPoint(new THREE.Vector3(...s)); }
    for (let k = 0; k < tc * 3; k++) idx[to * 3 + k] = vo + (ia ? ia[k] : k);
    vo += c; to += tc;
  }
}
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
const bvh = new MeshBVH(geo); geo.computeBoundingBox();
const box = geo.boundingBox;
const x0 = box.min.x, z0 = box.min.z, NX = Math.ceil((box.max.x - x0) / CELL), NZ = Math.ceil((box.max.z - z0) / CELL);
console.log(`Innenmodell ${nt.toLocaleString('de-DE')} Dreiecke · Raster ${NX} × ${NZ} (${CELL} m) · BVH ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// 1. Böden je Spalte
const ray = new THREE.Ray(), down = new THREE.Vector3(0, -1, 0), tri = new THREE.Triangle(), nrm = new THREE.Vector3(), va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
const faceNy = fi => { const a = idx[fi * 3], b = idx[fi * 3 + 1], c = idx[fi * 3 + 2]; va.fromArray(pos, a * 3); vb.fromArray(pos, b * 3); vc.fromArray(pos, c * 3); tri.set(va, vb, vc); tri.getNormal(nrm); return Math.abs(nrm.y); };
const floors = new Array(NX * NZ);   // je Zelle: [{ y, ceil }]
for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) {
  const x = x0 + (ix + 0.5) * CELL, z = z0 + (iz + 0.5) * CELL;
  ray.origin.set(x, box.max.y + 1, z); ray.direction.copy(down);
  const hits = bvh.raycast(ray, THREE.DoubleSide).sort((a, b) => a.distance - b.distance);
  const list = [];
  for (let k = 0; k < hits.length; k++) {
    const h = hits[k]; if (faceNy(h.faceIndex) < 0.7) continue;
    const above = k > 0 ? hits[k - 1].point.y - h.point.y : Infinity;
    if (above >= HEAD && above < 60) list.push({ y: h.point.y, ceil: above });   // ohne Decke darüber = Außenhaut, kein Deck
  }
  if (list.length) floors[ix * NZ + iz] = list.slice(0, 4);
}
// 1b. Gitterroste und Fugen: Zellen ohne Boden bekommen einen, wenn auf gegenüberliegenden Seiten (bis 0,6 m) Boden gleicher Höhe liegt
//     und darüber genug Kopfhöhe ist. Echte Öffnungen (Treppenschächte, Luken) sind breiter und bleiben offen.
{
  const R = 3, up = new THREE.Vector3(0, 1, 0), add = [];
  const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];
  const find = (ix, iz, y) => { if (ix < 0 || iz < 0 || ix >= NX || iz >= NZ) return null; return (floors[ix * NZ + iz] || []).find(f => Math.abs(f.y - y) <= 0.15) || null; };
  for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) {
    const done = [];
    for (const [dx, dz] of DIRS) for (let a = 1; a <= R; a++) {
      const fa = (floors[(ix + dx * a) * NZ + iz + dz * a] || []); if (ix + dx * a >= NX || iz + dz * a < 0 || iz + dz * a >= NZ) break;
      for (const f of fa) {
        if (done.some(y => Math.abs(y - f.y) < 0.3) || (floors[ix * NZ + iz] || []).some(g => Math.abs(g.y - f.y) < 0.3)) continue;
        let other = null; for (let b = 1; b <= R + 1 - a && !other; b++) other = find(ix - dx * b, iz - dz * b, f.y);
        if (!other) continue;
        const y = (f.y + other.y) / 2;
        ray.origin.set(x0 + (ix + 0.5) * CELL, y + 0.08, z0 + (iz + 0.5) * CELL); ray.direction.copy(up);
        const h = bvh.raycastFirst(ray, THREE.DoubleSide), ceil = h ? h.distance + 0.08 : 60;
        if (ceil >= HEAD && ceil < 60) { add.push([ix * NZ + iz, { y, ceil, filled: true }]); done.push(y); }
      }
    }
  }
  for (const [ci, f] of add) { const l = floors[ci] || (floors[ci] = []); if (l.length < 4) { l.push(f); l.sort((a, b) => b.y - a.y); } }
  console.log(`Lücken geschlossen: ${add.length} Zellen`);
}
// optional: alles unterhalb einer Höhe weglassen (Zwischenräume unter dem Deck, Tanks)
if (opt.minY) for (let i = 0; i < floors.length; i++) if (floors[i]) { floors[i] = floors[i].filter(f => f.y >= +opt.minY); if (!floors[i].length) floors[i] = undefined; }
// 2./3. Verbindungen zwischen Nachbarn (Wände per waagerechter Strahlen)
const node = (ix, iz, li) => floors[ix * NZ + iz]?.[li];
const blocked = (ax, az, bx, bz, y) => {
  const A = new THREE.Vector3(x0 + (ax + 0.5) * CELL, 0, z0 + (az + 0.5) * CELL), B = new THREE.Vector3(x0 + (bx + 0.5) * CELL, 0, z0 + (bz + 0.5) * CELL);
  const d = B.clone().sub(A), len = d.length(); d.normalize();
  for (const h of [0.35, 1.0, 1.6]) { ray.origin.set(A.x, y + h, A.z); ray.direction.copy(d); const r = bvh.raycastFirst(ray, THREE.DoubleSide); if (r && r.distance < len) return true; }
  return false;
};
const key = (ix, iz, li) => (ix * NZ + iz) * 4 + li;
const conn = new Map();   // key → Set(key)
const link = (a, b) => { (conn.get(a) || conn.set(a, new Set()).get(a)).add(b); (conn.get(b) || conn.set(b, new Set()).get(b)).add(a); };
const N8 = [[1, 0], [0, 1], [1, 1], [1, -1]];
for (let ix = 0; ix < NX; ix++) for (let iz = 0; iz < NZ; iz++) {
  const fs0 = floors[ix * NZ + iz]; if (!fs0) continue;
  fs0.forEach((f, li) => {
    for (const [dx, dz] of N8) {
      const jx = ix + dx, jz = iz + dz, fs1 = floors[jx * NZ + jz]; if (!fs1 || jx >= NX || jz < 0 || jz >= NZ) continue;
      fs1.forEach((g, lj) => { if (Math.abs(f.y - g.y) <= STEP && !blocked(ix, iz, jx, jz, Math.max(f.y, g.y))) link(key(ix, iz, li), key(jx, jz, lj)); });
    }
  });
}
// 4. Abstand zu Wänden: alle acht Nachbarn verbunden
const walk = new Set();
for (const [k, s] of conn) if (s.size >= 8) walk.add(k);
// 5. Zusammenhängende Bereiche; der größte mit Decke ist der Innenraum
const seen = new Set(), comps = [];
for (const k of walk) {
  if (seen.has(k)) continue;
  const comp = [], q = [k]; seen.add(k);
  while (q.length) { const c = q.pop(); comp.push(c); for (const n of conn.get(c) || []) if (walk.has(n) && !seen.has(n)) { seen.add(n); q.push(n); } }
  const covered = comp.filter(c => { const ci = Math.floor(c / 4), li = c % 4; return floors[ci][li].ceil < 6; }).length;
  comps.push({ comp, covered });
}
comps.sort((a, b) => b.covered - a.covered);
// --start=x,y,z: der Bereich an dieser Stelle ist das Hauptdeck (sonst der größte)
if (opt.start) {
  const [sx, sy, sz] = opt.start.split(',').map(Number), six = Math.floor((sx - x0) / CELL), siz = Math.floor((sz - z0) / CELL);
  let bi = -1, bd = 1e9;
  comps.forEach((c, i) => { for (const k of c.comp) { const ci = Math.floor(k / 4), ix = Math.floor(ci / NZ), iz = ci % NZ, d = Math.hypot(ix - six, iz - siz) * CELL + Math.abs(floors[ci][k % 4].y - sy) * 3; if (d < bd) { bd = d; bi = i; } } });
  if (bi > 0) comps.unshift(comps.splice(bi, 1)[0]);
  console.log(`Hauptdeck nach --start: ${comps[0].comp.length} Zellen (Abstand ${bd.toFixed(1)} m)`);
}
if (opt.debug) for (const c of comps.slice(0, 12)) {
  const ps = c.comp.map(k => { const ci = Math.floor(k / 4), ix = Math.floor(ci / NZ), iz = ci % NZ; return [x0 + ix * CELL, floors[ci][k % 4].y, z0 + iz * CELL]; });
  const r = i => `${Math.min(...ps.map(p => p[i])).toFixed(1)}…${Math.max(...ps.map(p => p[i])).toFixed(1)}`;
  console.log(`  Bereich ${c.comp.length} Zellen (${c.covered} unter Decke) · x ${r(0)} · y ${r(1)} · z ${r(2)}`);
}
// Türen: Im Modell sind alle Türen geschlossen. Zwischen großen Bereichen wird je Paar die beste Stelle gesucht, an der
// nur eine dünne Trennwand (≤ 0,3 m) steht, mindestens 0,6 m breit und mit passender Bodenhöhe. Dort entsteht ein Durchgang.
const info = c => { const ci = Math.floor(c / 4), li = c % 4, ix = Math.floor(ci / NZ), iz = ci % NZ; return { ix, iz, x: x0 + (ix + 0.5) * CELL, z: z0 + (iz + 0.5) * CELL, y: floors[ci][li].y }; };
const compOf = new Map(); comps.forEach((c, i) => { for (const k of c.comp) compOf.set(k, i); });
const BIG = comps.map((c, i) => (c.covered >= 250 ? i : -1)).filter(i => i >= 0);
const thin = (ax, az, bx, bz, y) => {
  const A = new THREE.Vector3(x0 + (ax + 0.5) * CELL, y + 1.0, z0 + (az + 0.5) * CELL), B = new THREE.Vector3(x0 + (bx + 0.5) * CELL, y + 1.0, z0 + (bz + 0.5) * CELL);
  const d = B.clone().sub(A), L = d.length(); d.normalize();
  ray.origin.copy(A); ray.direction.copy(d); const h1 = bvh.raycastFirst(ray, THREE.DoubleSide);
  ray.origin.copy(B); ray.direction.copy(d).negate(); const h2 = bvh.raycastFirst(ray, THREE.DoubleSide);
  const free1 = !h1 || h1.distance > L, free2 = !h2 || h2.distance > L;
  if (free1 && free2) return 0;            // offener, nur enger Durchgang (z. B. Türrahmen)
  if (free1 || free2) return null;
  return L - h1.distance - h2.distance;    // dünne Trennwand (geschlossene Tür)
};
const cand = new Map();   // "a-b" → [{ka, kb, ax, az, bx, bz, t}]
for (const ci of BIG) for (const ka of comps[ci].comp) {
  const a = info(ka);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let s = 2; s <= 5; s++) {
    const bx = a.ix + dx * s, bz = a.iz + dz * s; if (bx < 0 || bz < 0 || bx >= NX || bz >= NZ) break;
    const fl = floors[bx * NZ + bz]; if (!fl) continue;
    // Boden im anderen Bereich mit höchstens 1,2 m Höhenunterschied (größere Absätze nur als offene Stufe, s. u.)
    const lj = fl.findIndex((g, j) => Math.abs(g.y - a.y) <= 1.2 && walk.has(key(bx, bz, j)) && compOf.get(key(bx, bz, j)) !== ci); if (lj < 0) continue;
    const kb = key(bx, bz, lj), cj = compOf.get(kb);
    if (cj === undefined || cj === ci || !BIG.includes(cj) || !walk.has(kb)) continue;
    const dy = Math.abs(fl[lj].y - a.y), lowCeil = fl[lj].y < a.y ? fl[lj].ceil : floors[a.ix * NZ + a.iz][ka % 4].ceil;
    const t = thin(a.ix, a.iz, bx, bz, Math.max(a.y, fl[lj].y)); if (t === null || t > 0.3) continue;
    if (dy > 0.6 && (t > 0 || lowCeil < dy + 1.8)) continue;   // Stufe nur offen und mit Kopfhöhe über dem unteren Boden
    const pk = Math.min(ci, cj) + '-' + Math.max(ci, cj);
    (cand.get(pk) || cand.set(pk, []).get(pk)).push({ ka, kb, ax: a.ix, az: a.iz, bx, bz, ay: a.y, by: fl[lj].y, t, dx, dz });
    break;
  }
}
const extra = new Map();   // zusätzliche begehbare Zellen in den Türen: Zellindex → y
const doorLinks = [];
for (const [pk, list] of cand) {
  // breiteste zusammenhängende Gruppe (gleiche Richtung, nebeneinander) wählen
  let best = null;
  for (const c of list) {
    const group = list.filter(o => o.dx === c.dx && o.dz === c.dz && Math.abs((o.ax - c.ax) * c.dz) + Math.abs((o.az - c.az) * c.dx) <= 3 && (o.ax - c.ax) * c.dx + (o.az - c.az) * c.dz === 0);
    if (!best || group.length > best.length) best = group;
  }
  if (!best || best.length < 2) continue;
  doorLinks.push(pk.split('-').map(Number));
  for (const c of best) {   // Zellen zwischen A und B begehbar machen
    const n = Math.max(Math.abs(c.bx - c.ax), Math.abs(c.bz - c.az));
    for (let s = 1; s < n; s++) extra.set((c.ax + c.dx * s) * NZ + (c.az + c.dz * s), c.ay + (c.by - c.ay) * (s / n));
  }
}
// Sonde zur Fehlersuche: --probe=x,z0,z1 gibt die Böden entlang einer Linie aus (Höhe, Kopfhöhe, Bereich, begehbar)
if (opt.probe) {
  const [px, pz0, pz1] = opt.probe.split(',').map(Number), ix = Math.floor((px - x0) / CELL);
  for (let z = pz0; z <= pz1; z += CELL) {
    const iz = Math.floor((z - z0) / CELL), fl = floors[ix * NZ + iz] || [];
    console.log(`  z ${z.toFixed(1)}: ` + fl.map((f, li) => `${f.y.toFixed(2)} (Decke +${f.ceil === Infinity ? '∞' : f.ceil.toFixed(1)}, B${compOf.get(key(ix, iz, li)) ?? '-'}${walk.has(key(ix, iz, li)) ? '' : ' x'})`).join(' | '));
  }
}
// Bild zur Fehlersuche: --img=datei.png zeigt die 8 größten Bereiche farbig (oberster Boden je Zelle), Nase oben
if (opt.img) {
  const { default: sharp } = await import('sharp');
  const PX = 2, W = NX * PX, H = NZ * PX, im = Buffer.alloc(W * H * 3, 16);
  const COLS = [[60, 140, 255], [255, 90, 90], [90, 230, 90], [250, 200, 60], [200, 90, 255], [60, 230, 230], [255, 140, 40], [230, 230, 230]];
  const top = new Map();
  comps.slice(0, 8).forEach((c, i) => { for (const k of c.comp) { const ci = Math.floor(k / 4), y = floors[ci][k % 4].y; if (!top.has(ci) || top.get(ci)[0] < y) top.set(ci, [y, i]); } });
  for (const [ci, [, i]] of top) { const ix = Math.floor(ci / NZ), iz = ci % NZ; for (let a = 0; a < PX; a++) for (let b = 0; b < PX; b++) { const o = ((iz * PX + b) * W + ix * PX + a) * 3; im.set(COLS[i], o); } }
  await sharp(im, { raw: { width: W, height: H, channels: 3 } }).png().toFile(opt.img);
  comps.slice(0, 8).forEach((c, i) => console.log(`  Farbe ${['blau', 'rot', 'grün', 'gelb', 'lila', 'türkis', 'orange', 'weiß'][i]}: ${c.comp.length} Zellen`));
}
// alle Bereiche, die über Türen mit dem größten verbunden sind, gehören zum Innenraum
const reach = new Set([0]), qq = [0];
while (qq.length) { const c = qq.pop(); for (const [a, b] of doorLinks) { const o = a === c ? b : b === c ? a : -1; if (o >= 0 && !reach.has(o)) { reach.add(o); qq.push(o); } } }
const inside = [...reach].flatMap(i => comps[i].comp);
console.log(`Türen: ${doorLinks.length} · verbundene Bereiche: ${reach.size} (${[...reach].map(i => comps[i].comp.length).join(', ')} Zellen)`);
const pts = inside.map(info);
console.log(`Böden: ${floors.filter(Boolean).length} Spalten · begehbar ${walk.size} · Bereiche ${comps.length} · Innenraum ${inside.length} Zellen (${(inside.length * CELL * CELL).toFixed(0)} m²) · ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// 6. Punkte
const zs = pts.map(p => p.z), zMin = Math.min(...zs), zMax = Math.max(...zs), xMid = pts.reduce((a, p) => a + p.x, 0) / pts.length;
const near = (x, y, z, filt = () => true) => pts.filter(filt).reduce((b, p) => { const d = Math.hypot(p.x - x, (p.y - y) * 2, p.z - z); return !b || d < b.d ? { ...p, d } : b; }, null);
// Pilotensitz: im vordersten Zehntel die oberste Ebene (Kanzel), dort ganz vorn und nahe der Mitte
const bow = pts.filter(p => p.z < zMin + (zMax - zMin) * 0.12), bowTop = Math.max(...bow.map(p => p.y));
const seat = bow.filter(p => p.y > bowTop - 0.5).reduce((b, p) => { const s = p.z + Math.abs(p.x - xMid) * 0.6; return !b || s < b.s ? { ...p, s } : b; }, null);
// Einstieg: auf dem Hauptdeck (größter Bereich), im hinteren Teil, mit viel Kopfhöhe und Platz rundherum
const main = comps[0].comp.map(info), mz0 = Math.min(...main.map(p => p.z)), mz1 = Math.max(...main.map(p => p.z));
const mainSet = new Set(comps[0].comp.map(c => Math.floor(c / 4)));
const roomy = p => { let n = 0; for (let a = -4; a <= 4; a++) for (let b = -4; b <= 4; b++) if (mainSet.has((p.ix + a) * NZ + p.iz + b)) n++; return n; };
const spawn = main.filter(p => p.z > mz1 - (mz1 - mz0) * 0.3 && floors[p.ix * NZ + p.iz].some(f => Math.abs(f.y - p.y) < 0.01 && f.ceil > 2.3))
  .reduce((b, p) => { const s = roomy(p) - Math.abs(p.x - xMid) * 2; return !b || s > b.s ? { ...p, s } : b; }, null) || main[0];
const woodC = wood.isEmpty() ? null : wood.getCenter(new THREE.Vector3());
const bed = woodC ? near(woodC.x, woodC.y - 1, woodC.z) : near(xMid, spawn.y, (zMin + zMax) / 2);
const log = near(seat.x + 1.6, seat.y, seat.z + 1.5, p => Math.hypot(p.x - seat.x, p.z - seat.z) > 1.2);
const locker = near(spawn.x - 3, spawn.y, spawn.z - 2, p => Math.hypot(p.x - spawn.x, p.z - spawn.z) > 2);
const scanner = near(xMid, seat.y, zMin + (zMax - zMin) * 0.35);
const third = (zMax - zMin) / 3;
// Lichter: acht Punkte, möglichst weit voneinander über die begehbare Fläche verteilt, unter der Decke
const lamps = [];
{
  const cand = pts.filter((_, i) => i % 7 === 0), pick = [cand.reduce((b, p) => (!b || p.z < b.z ? p : b), null)];
  while (pick.length < 8) pick.push(cand.reduce((b, p) => { const d = Math.min(...pick.map(q => Math.hypot(p.x - q.x, (p.y - q.y) * 3, p.z - q.z))); return !b || d > b.d ? { ...p, d } : b; }, null));
  // ein paar Runden k-Means: Lampen von den Rändern in die Mitte ihrer Bereiche ziehen, dann auf die nächste Bodenzelle setzen
  const dist = (p, q) => Math.hypot(p.x - q.x, (p.y - q.y) * 3, p.z - q.z);
  for (let it = 0; it < 8; it++) {
    const acc = pick.map(() => [0, 0, 0, 0]);
    for (const p of cand) { let bi = 0; pick.forEach((q, i) => { if (dist(p, q) < dist(p, pick[bi])) bi = i; }); const a = acc[bi]; a[0] += p.x; a[1] += p.y; a[2] += p.z; a[3]++; }
    acc.forEach((a, i) => { if (!a[3]) return; const m = { x: a[0] / a[3], y: a[1] / a[3], z: a[2] / a[3] }; pick[i] = cand.reduce((b, p) => (!b || dist(p, m) < dist(b, m) ? p : b), null); });
  }
  for (const p of pick) { const f = floors[p.ix * NZ + p.iz].find(g => Math.abs(g.y - p.y) < 0.01); lamps.push([p.x, p.y + Math.min(2.2, (f ? f.ceil : 2.6) - 0.3), p.z, 1]); }
}
const r2 = v => Math.round(v * 100) / 100;
const spot = (kind, p, r = 1.4) => ({ kind, x: r2(p.x), y: r2(p.y), z: r2(p.z), r });
// Laufkarte kompakt: je begehbarer Zelle Index und Bodenhöhe (cm)
const all = inside.map(c => [Math.floor(c / 4), floors[Math.floor(c / 4)][c % 4].y, floors[Math.floor(c / 4)][c % 4].ceil]);
for (const [ci, y] of extra) all.push([ci, y, 2.1]);   // Türen
const cells = new Int32Array(all.length), ys = new Int16Array(all.length), hs = new Uint8Array(all.length);   // hs: Kopfhöhe in Dezimetern (für Sprünge)
all.forEach(([ci, y, h], i) => { cells[i] = ci; ys[i] = Math.round(y * 100); hs[i] = Math.min(255, Math.floor(h * 10)); });
const res = {
  cell: CELL, x0: r2(x0), z0: r2(z0), nx: NX, nz: NZ, step: STEP,
  cells: Buffer.from(cells.buffer).toString('base64'), ys: Buffer.from(ys.buffer).toString('base64'), hs: Buffer.from(hs.buffer).toString('base64'),
  spawn: { x: r2(spawn.x), y: r2(spawn.y), z: r2(spawn.z), yaw: 0 },
  spots: [spot('seat', seat, 1.6), spot('log', log), spot('hatch', spawn, 1.8), spot('bed', bed, 1.8), spot('locker', locker), spot('scanner', scanner, 1.6)],
  lamps: lamps.map(l => l.map(r2)),
  areas: [{ name: 'Cockpit', z1: r2(zMin + third) }, { name: 'Wohndeck', z1: r2(zMin + 2 * third) }, { name: 'Frachtraum', z1: 9999 }],
};
fs.writeFileSync(out, JSON.stringify(res));
console.log(`Sitz z ${seat.z.toFixed(1)} · Einstieg ${spawn.x.toFixed(1)}/${spawn.y.toFixed(1)}/${spawn.z.toFixed(1)} · Koje ${bed.x.toFixed(1)}/${bed.z.toFixed(1)} · Datei ${(fs.statSync(out).size / 1024).toFixed(0)} KB · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
