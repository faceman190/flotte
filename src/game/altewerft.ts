import * as THREE from 'three';
import { GLOW, scene, ux, view } from '../core/engine';
import { d3, rand, rng, hashStr, fmtD } from '../core/util';
import { snd, sfx } from '../core/audio';
import { world, sectorHooks } from './world';
import { ORTE, orteHud, ortePrompt, orteKey, dropOrt, type HudKit } from './orte';
import { P, G, saveGame, stats, cargoUsed } from './state';
import { burst } from './fx';
import { radio } from '../ui/radio';
import { buildModelStation } from '../models/stationModels';
import { buildOutpost } from '../models/structures';
import { buildShipModel } from '../models/playerShips';
import { GEAR_IDS, gearDef, RARITY } from '../data/gear';
import { addItem, canAdd } from './inventory';
import { mergeGeos } from './akademie';
import type { ShipId } from '../data/ships';

// =====================================================================================
// Alte Werft in Heimstatt (Phase 2, docs/heimstatt.md): 40 km westsüdwestlich der Bastion, ohne Gegner.
// Hier hat die Crew der Bastion in den ersten Jahren nach dem Riss ihre ersten Schiffe gebaut; was nicht mehr flog, blieb liegen.
//  · drei Hellinge (offene Stahlgerüste) mit unfertigen Rümpfen, treibende Wracks, Trümmerplatten, die alte Werftverwaltung (dunkel)
//  · Bergungsgut: Container an den Wracks. [E] in der Nähe holt ihn per Traktorstrahl an Bord (4 s): Schrott in den Frachtraum,
//    mit Glück ein Ausrüstungsstück oder ein altes Flottensiegel in den Rucksack. Jeder Container kommt nach 40 Minuten wieder (P.werft).
// =====================================================================================

const W = new THREE.Vector3(-37000, -200, 15000);
const R_ORT = 2600, N_GUT = 14, REACH = 85, HOLD = 4, BACK_MS = 40 * 60000;
type Gut = { i: number; p: THREE.Vector3; home: THREE.Vector3; mesh: THREE.Mesh; there: boolean; li: number };
const S = {
  root: null as THREE.Group | null,
  gut: [] as Gut[],
  pts: null as THREE.Points | null, col: null as Float32Array | null, warn: [] as number[],
  drift: [] as { o: THREE.Object3D; w: THREE.Vector3 }[],
  pull: null as null | { g: Gut; t: number },
  beam: null as THREE.Line | null,
  told: false, msg: [] as { t: string; c: string; life: number }[],
};
export const ALTEWERFT = S;

// Stahl der Gerüste und Container: dunkel, matt, verwittert (realistisch, kein Leuchten)
const STEEL = new THREE.MeshStandardMaterial({ color: 0x4f4c47, metalness: 0.55, roughness: 0.78 });
const CRATE = new THREE.MeshStandardMaterial({ color: 0x6b5236, metalness: 0.4, roughness: 0.7 });
const PLATE = new THREE.MeshStandardMaterial({ color: 0x3e3c39, metalness: 0.5, roughness: 0.85, side: THREE.DoubleSide });

// Helling: offenes Gerüst aus Kastenprofilen, Länge L entlang z; manche Spanten fehlen oder sind verbogen
function hellingGeo(L: number, B: number, Hh: number, R: () => number, s = 3.2) {
  const parts: THREE.BufferGeometry[] = [];
  const beam = (x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, w = s) => {
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), len = a.distanceTo(b);
    const g = new THREE.BoxGeometry(w, w, len); const m = new THREE.Matrix4().lookAt(a, b, new THREE.Vector3(0, 1, 0));
    if (Math.abs(b.y - a.y) > len * 0.99) m.lookAt(a, b, new THREE.Vector3(1, 0, 0));
    g.applyMatrix4(m); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); parts.push(g);
  };
  const hx = B / 2, hy = Hh / 2, hz = L / 2;
  for (const [x, y] of [[-hx, -hy], [hx, -hy], [-hx, hy], [hx, hy]]) beam(x, y, -hz, x, y, hz, s * 1.4);   // Längsträger
  const n = Math.max(3, Math.round(L / 22));
  for (let i = 0; i <= n; i++) {
    const z = -hz + i / n * L;
    if (i > 0 && i < n && R() < 0.18) continue;                       // Spant fehlt
    const bend = i > 0 && i < n && R() < 0.2 ? (R() - 0.5) * 9 : 0;   // verbogen
    beam(-hx, -hy, z, -hx, hy, z + bend); beam(hx, -hy, z, hx, hy, z - bend);
    beam(-hx, hy, z, hx, hy, z); if (R() < 0.7) beam(-hx, -hy, z, hx, -hy, z);
    if (i < n && R() < 0.55) beam(-hx, -hy, z, -hx, hy, z + L / n, s * 0.6);   // Diagonalen
    if (i < n && R() < 0.55) beam(hx, hy, z, hx, -hy, z + L / n, s * 0.6);
  }
  return mergeGeos(parts);
}
// Frachtcontainer der Werft: Kasten mit Kantenrahmen und Sicken an den Längsseiten
function crateGeo() {
  const p: THREE.BufferGeometry[] = [], L = 6, B = 2.5, Hc = 2.6, e = 0.22;
  p.push(new THREE.BoxGeometry(L - 0.1, Hc - 0.1, B - 0.1));
  for (const y of [-1, 1]) for (const z of [-1, 1]) { const g = new THREE.BoxGeometry(L, e, e); g.translate(0, y * (Hc - e) / 2, z * (B - e) / 2); p.push(g); }
  for (const x of [-1, 1]) for (const z of [-1, 1]) { const g = new THREE.BoxGeometry(e, Hc, e); g.translate(x * (L - e) / 2, 0, z * (B - e) / 2); p.push(g); }
  for (const x of [-1, 1]) for (const y of [-1, 1]) { const g = new THREE.BoxGeometry(e, e, B); g.translate(x * (L - e) / 2, y * (Hc - e) / 2, 0); p.push(g); }
  for (let i = 1; i < 10; i++) for (const z of [-1, 1]) { const g = new THREE.BoxGeometry(0.12, Hc - 0.5, 0.08); g.translate(-L / 2 + i * L / 10, 0, z * (B / 2 - 0.02)); p.push(g); }
  return mergeGeos(p);
}
// Kollision eines Gerüsts: Kugeln entlang der vier Längsträger
function hellingSolids(pos: THREE.Vector3, yaw: number, L: number, B: number, Hh: number) {
  const sph: number[][] = [], Y = new THREE.Vector3(0, 1, 0);
  for (const [x, y] of [[-B / 2, -Hh / 2], [B / 2, -Hh / 2], [-B / 2, Hh / 2], [B / 2, Hh / 2]])
    for (let z = -L / 2; z <= L / 2; z += 7) { const v = new THREE.Vector3(x, y, z).applyAxisAngle(Y, yaw); sph.push([v.x, v.y, v.z, 4]); }
  world.solids.push({ x: W.x + pos.x, y: W.y + pos.y, z: W.z + pos.z, R: Math.hypot(L / 2, B / 2, Hh / 2) + 10, sph });
}
// verlassener Rumpf: dunkler, matter, ohne Lichter
function hulk(cls: ShipId) {
  const m = buildShipModel(cls);
  for (const o of [...m.glows, ...m.navs]) o.visible = false;
  m.shield.visible = false;
  m.g.traverse((o: any) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const cl = ms.map((x: any) => { const c = x.clone(); if (c.color) c.color.multiplyScalar(0.42); if (c.emissive) c.emissive.setScalar(0); if ('emissiveIntensity' in c) c.emissiveIntensity = 0; if ('roughness' in c) c.roughness = Math.min(1, (c.roughness || 0.5) + 0.3); return c; });
    o.material = Array.isArray(o.material) ? cl : cl[0];
  });
  return m.g;
}
// Rahmen nur der sichtbaren Teile (ohne die ausgeblendete Schildkugel und Leuchtpunkte)
function visBox(o: THREE.Object3D) {
  o.updateMatrixWorld(true);
  const box = new THREE.Box3();
  o.traverse((c: any) => { if (!c.isMesh || c.isSprite) return; for (let p = c; p; p = p.parent) if (!p.visible) return; box.expandByObject(c); });
  return box;
}
// Kollision eines Rumpfs: Kugeln entlang der längsten Achse seines Rahmens
function hulkSolids(o: THREE.Object3D) {
  const box = visBox(o);
  if (box.isEmpty()) return;
  const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const ax = sz.x >= sz.y && sz.x >= sz.z ? 'x' : sz.z >= sz.y ? 'z' : 'y', other = ax === 'x' ? Math.min(sz.y, sz.z) : ax === 'z' ? Math.min(sz.x, sz.y) : Math.min(sz.x, sz.z);
  const r = Math.max(3, other * 0.42), len = sz[ax], sph: number[][] = [];
  for (let t = -len / 2 + r; t <= len / 2 - r + 0.01; t += r) { const v = c.clone(); v[ax] += t; sph.push([v.x - W.x, v.y - W.y, v.z - W.z, r]); }
  if (!sph.length) sph.push([c.x - W.x, c.y - W.y, c.z - W.z, r]);
  world.solids.push({ x: W.x, y: W.y, z: W.z, R: R_ORT, sph });
}

function build(id: string) {
  S.root = null; S.gut = []; S.drift = []; S.pull = null; S.beam = null; S.pts = null; S.warn = [];
  if (id !== 'heimstatt') return;
  const R = rng(hashStr('altewerft')), r = () => R.next();
  const root = new THREE.Group(); root.position.copy(W); scene.add(root); world.extras.push(root); S.root = root;
  const lights: number[] = [], spots: THREE.Vector3[] = [];
  // drei Hellinge nebeneinander, leicht versetzt, mit unfertigen Rümpfen
  const yaw0 = 0.35, Y = new THREE.Vector3(0, 1, 0);
  // Das Gerüst richtet sich nach dem Rumpf darin (Länge × 1,3, Breite × 1,6, Höhe × 1,7): nebeneinander, leicht versetzt
  const H: { cls: ShipId; dy: number }[] = [{ cls: 'wisent', dy: 0 }, { cls: 'kormoran', dy: 25 }, { cls: 'elster', dy: -15 }];
  let xo = -120;
  for (const h of H) {
    const hull = hulk(h.cls);
    const box = visBox(hull), sz = box.getSize(new THREE.Vector3()), hc = box.getCenter(new THREE.Vector3());
    const L = sz.z * 1.3 + 24, B = Math.max(sz.x * 1.6, 30) + 14, Hh = Math.max(sz.y * 1.7, 22) + 12;
    xo += B / 2;
    const yaw = yaw0 + (r() - 0.5) * 0.12, pos = new THREE.Vector3(xo, h.dy, (r() - 0.5) * 60).applyAxisAngle(Y, yaw0);
    xo += B / 2 + 28;
    const g = new THREE.Mesh(hellingGeo(L, B, Hh, r, Math.max(1.6, Math.min(3, B / 26))), STEEL); g.position.copy(pos); g.rotation.y = yaw; root.add(g);
    hellingSolids(pos, yaw, L, B, Hh);
    for (const [x, z] of [[-B / 2, -L / 2], [B / 2, -L / 2], [-B / 2, L / 2], [B / 2, L / 2]]) {   // rote Warnlichter oben an den Ecken
      const v = new THREE.Vector3(x, Hh / 2 + 2, z).applyAxisAngle(Y, yaw).add(pos); S.warn.push(lights.length / 3); lights.push(v.x, v.y, v.z);
    }
    // Rumpf mittig ins Gerüst (Mitte des Rahmens auf die Mitte des Gerüsts), leicht gekippt, als läge er noch auf den Stützen
    const rot = new THREE.Euler(0.02, yaw + Math.PI, (r() - 0.5) * 0.06);
    hull.rotation.copy(rot); hull.position.copy(pos).sub(hc.clone().applyEuler(rot)).add(new THREE.Vector3(0, -Hh * 0.06, 0)); root.add(hull);
    hulkSolids(hull);
    const h2 = { B, Hh, L };
    spots.push(pos.clone().add(new THREE.Vector3(h2.B / 2 + 18, -h2.Hh / 3, 0).applyAxisAngle(Y, yaw)), pos.clone().add(new THREE.Vector3(-h2.B / 2 - 18, h2.Hh / 4, h2.L * 0.3).applyAxisAngle(Y, yaw)));
  }
  // alte Werftverwaltung, dunkel
  const adm = buildModelStation('outpost', 210, { cell: 30, R: 130 }) || buildOutpost();
  const ap = new THREE.Vector3(420, 60, -330);
  adm.g.position.copy(ap); adm.g.rotation.set(0.05, 2.2, -0.04); root.add(adm.g);
  for (const o of [...(adm.lights || []), ...(adm.navs || []), ...((adm as any).glows || [])]) o.visible = false;
  adm.g.traverse((o: any) => { if (o.isMesh && o.material?.isMeshStandardMaterial) { o.material = o.material.clone(); o.material.color.multiplyScalar(0.5); o.material.emissiveIntensity = 0; } });
  world.solids.push({ x: W.x + ap.x, y: W.y + ap.y, z: W.z + ap.z, R: adm.R, sph: adm.sph.map(([x, y, z, rr]: number[]) => { const v = new THREE.Vector3(x, y, z).applyAxisAngle(Y, 2.2); return [v.x, v.y, v.z, rr]; }) });
  spots.push(ap.clone().add(new THREE.Vector3(0, -150, 170)));
  // treibende Wracks, drehen sich kaum merklich
  const drifters: ShipId[] = ['venom', 'venom', 'wuerger', 'kormoran', 'elster'];
  drifters.forEach((cls, i) => {
    const a = i / drifters.length * Math.PI * 2 + r() * 0.6, d = 300 + r() * 550;
    const o = hulk(cls); o.position.set(Math.cos(a) * d, (r() - 0.5) * 220, Math.sin(a) * d); o.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28); root.add(o);
    S.drift.push({ o, w: new THREE.Vector3((r() - 0.5) * 0.02, (r() - 0.5) * 0.02, (r() - 0.5) * 0.02) });
    spots.push(o.position.clone().add(new THREE.Vector3(30 + r() * 20, 10, 0)));
  });
  // Trümmerplatten in Wolken um Hellinge und Wracks
  const n = 320, plates = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 1), PLATE, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < n; i++) {
    const c = spots[i % spots.length], s = 2 + Math.pow(r(), 2) * 12;
    const p = new THREE.Vector3(c.x + (r() - 0.5) * 260, c.y + (r() - 0.5) * 120, c.z + (r() - 0.5) * 260);
    e.set(r() * 6.28, r() * 6.28, r() * 6.28); q.setFromEuler(e); m4.compose(p, q, new THREE.Vector3(s, s * (0.5 + r()), s * (0.4 + r() * 0.8))); plates.setMatrixAt(i, m4);
  }
  plates.instanceMatrix.needsUpdate = true; plates.computeBoundingSphere(); root.add(plates);
  // Bergungsgut an den Wracks und Gerüsten
  const cg = crateGeo();
  for (let i = 0; i < N_GUT; i++) {
    const c = spots[i % spots.length], p = c.clone().add(new THREE.Vector3((r() - 0.5) * 70, (r() - 0.5) * 40, (r() - 0.5) * 70));
    const mesh = new THREE.Mesh(cg, CRATE); mesh.position.copy(p); mesh.rotation.set(r() * 6.28, r() * 6.28, r() * 6.28); root.add(mesh);
    const li = lights.length / 3; lights.push(p.x, p.y + 2, p.z);
    S.gut.push({ i, p: p.clone(), home: p.clone(), mesh, there: true, li });
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(lights, 3));
  S.col = new Float32Array(lights.length); geo.setAttribute('color', new THREE.BufferAttribute(S.col, 3));
  S.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 6, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false, fog: false }));
  S.pts.frustumCulled = false; root.add(S.pts);
  // Traktorstrahl (eine Linie, nur während der Bergung sichtbar)
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3));
  S.beam = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  S.beam.visible = false; S.beam.frustumCulled = false; scene.add(S.beam); world.extras.push(S.beam);
  refresh();
  ORTE.push({ id: 'altewerft', name: 'Alte Werft', x: W.x, y: W.y, z: W.z, R: R_ORT, mesh: root, dot: 0xd8c8a8 });
}
function refresh() {
  const st = P.werft || {}, now = Date.now();
  for (const g of S.gut) { const t = st[g.i]; g.there = !t || now - t > BACK_MS; g.mesh.visible = g.there; g.p.copy(g.home); g.mesh.position.copy(g.home); }
}

// nächstes Bergungsgut in Reichweite (Weltkoordinaten)
function nearGut() {
  let best: Gut | null = null, bd = REACH + stats().radius;
  for (const g of S.gut) { if (!g.there) continue; const d = d3(P.x, P.y, P.z, W.x + g.p.x, W.y + g.p.y, W.z + g.p.z); if (d < bd) { bd = d; best = g; } }
  return best;
}
function say(t: string, c = '#dfe8f0') { S.msg.unshift({ t, c, life: 6 }); if (S.msg.length > 4) S.msg.pop(); }

orteKey.push(() => {
  if (!S.root || S.pull) return !!S.pull;
  const g = nearGut(); if (!g) return false;
  if (cargoUsed() >= stats().cargo) { say('Frachtraum voll. Erst Fracht verkaufen.', '#ff6b5b'); snd(180, 0.2, 'square', 0.04, -60); return true; }
  S.pull = { g, t: 0 };
  snd(240, HOLD, 'sine', 0.025, 260);
  return true;
});
ortePrompt.push(() => {
  if (!S.root) return null;
  if (S.pull) return `Bergung · ${Math.round(S.pull.t / HOLD * 100)} %`;
  return nearGut() ? '[E] Bergungsgut an Bord holen' : null;
});

function reward(g: Gut) {
  const R = rng(hashStr('werft:' + g.i + ':' + Date.now())), room = stats().cargo - cargoUsed();
  const n = Math.min(room, 4 + Math.floor(R.next() * 6));
  if (n > 0) { P.cargo.schrott += n; say(`+${n} Schrott`, '#cfd6e3'); }
  const x = R.next();
  if (x < 0.02 && canAdd('fund_siegel')) { addItem('fund_siegel', 1); say(`${gearDef('fund_siegel')!.n} (${RARITY[3].n})`, '#ffb347'); radio('BASTION', 'Ein altes Flottensiegel aus der Werft? Das gehörte einem der ersten Schiffe. Gut aufheben.'); }
  else if (x < 0.24) {
    const tier = R.next() < 0.75 ? 0 : 1;
    const pool = GEAR_IDS.filter(id => { const d = gearDef(id)!; return d.rar === tier && d.kind !== 'fund'; });
    const id = pool[Math.floor(R.next() * pool.length)];
    if (id && canAdd(id)) { addItem(id, 1); const d = gearDef(id)!; say(`${d.n} (${RARITY[d.rar].n})`, tier ? '#5fd0ff' : '#aab4c0'); }
  }
  (P.werft = P.werft || {})[g.i] = Date.now();
  sfx('pickup', 0.7, 1, () => snd(700, 0.2, 'triangle', 0.05, 300));
  saveGame();
}

const _s = new THREE.Vector3();
export function updateAlteWerft(dt: number) {
  if (!S.root || world.def?.id !== 'heimstatt' || world.surface) return;
  for (const m of S.msg) m.life -= dt;
  S.msg = S.msg.filter(m => m.life > 0);
  const dW = d3(P.x, P.y, P.z, W.x, W.y, W.z);
  if (dW > R_ORT + 5000) { if (S.pull) { S.pull = null; S.beam!.visible = false; } return; }
  const t = G.time, live = G.mode === 'play' && !G.dead;
  if (live && !S.told && dW < R_ORT) {
    S.told = true;
    if (!P.werft) radio('BASTION', 'Du bist an der Alten Werft. Hier haben wir in den ersten Jahren nach dem Riss unsere ersten Schiffe gebaut, was nicht mehr flog, blieb liegen. Bergung ist erlaubt: Die Container an den Wracks holst du mit E an Bord.');
  }
  // alle paar Sekunden: wiedergekommene Container zeigen
  if (Math.floor(t) % 5 === 0 && !S.pull) { const st = P.werft || {}, now = Date.now(); for (const g of S.gut) if (!g.there && (!st[g.i] || now - st[g.i] > BACK_MS)) { g.there = true; g.mesh.visible = true; } }
  for (const d of S.drift) { d.o.rotation.x += d.w.x * dt; d.o.rotation.y += d.w.y * dt; d.o.rotation.z += d.w.z * dt; }
  // Lichter: rote Warnlichter langsam, Bergungsgut bernstein blinkend
  const col = S.col!;
  for (const i of S.warn) { const on = Math.sin(t * 1.6 + i) > 0.7; col[i * 3] = on ? 0.9 : 0.15; col[i * 3 + 1] = on ? 0.12 : 0.02; col[i * 3 + 2] = on ? 0.08 : 0.02; }
  for (const g of S.gut) { const on = g.there && Math.sin(t * 3 + g.i * 1.7) > 0.4; col[g.li * 3] = on ? 1 : g.there ? 0.25 : 0; col[g.li * 3 + 1] = on ? 0.7 : g.there ? 0.16 : 0; col[g.li * 3 + 2] = on ? 0.3 : g.there ? 0.05 : 0; }
  (S.pts!.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  // Bergung: Container zum Schiff ziehen
  if (S.pull) {
    const g = S.pull.g, wp = _s.set(W.x + g.p.x, W.y + g.p.y, W.z + g.p.z), d = d3(P.x, P.y, P.z, wp.x, wp.y, wp.z);
    if (!live || d > REACH + 80) { S.pull = null; S.beam!.visible = false; say('Bergung abgebrochen: zu weit weg.', '#ff9b7a'); return; }
    S.pull.t += dt;
    const k = Math.min(1, dt * 1.2);
    g.p.x += (P.x - W.x - g.p.x) * k * 0.5; g.p.y += (P.y - W.y - g.p.y) * k * 0.5; g.p.z += (P.z - W.z - g.p.z) * k * 0.5;
    g.mesh.position.copy(g.p); g.mesh.rotation.y += dt * 0.8;
    const a = S.beam!.geometry.attributes.position as THREE.BufferAttribute;
    a.setXYZ(0, P.x, P.y - 2, P.z); a.setXYZ(1, W.x + g.p.x, W.y + g.p.y, W.z + g.p.z); a.needsUpdate = true;
    (S.beam!.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 20);
    S.beam!.visible = true;
    if (S.pull.t >= HOLD) {
      S.pull = null; S.beam!.visible = false; g.there = false; g.mesh.visible = false;
      burst(P.x, P.y, P.z, '#9fd8ff', 16, 25, 0.5);
      reward(g);
    }
  }
}

orteHud.push((h: HudKit) => {
  if (!S.root || world.def?.id !== 'heimstatt' || world.surface) return;
  const dW = d3(P.x, P.y, P.z, W.x, W.y, W.z);
  if (dW > R_ORT + 1500) return;
  ux.save(); ux.textAlign = 'center'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace';
  for (const g of S.gut) {
    if (!g.there || g === S.pull?.g) continue;
    const x = W.x + g.p.x, y = W.y + g.p.y, z = W.z + g.p.z, d = d3(P.x, P.y, P.z, x, y, z);
    if (d > 1300) continue;
    const p = h.proj(x, y + 6, z);
    if (h.onScreen(p)) { ux.fillStyle = d < REACH + 20 ? '#ffd27a' : 'rgba(255,190,110,.85)'; ux.fillText(`▣ BERGUNGSGUT · ${fmtD(d)}`, p.x, p.y); }
  }
  ux.font = '600 14px "Share Tech Mono",Consolas,monospace';
  S.msg.forEach((m, i) => { ux.globalAlpha = Math.min(1, m.life); ux.fillStyle = m.c; ux.fillText(m.t, view.W / 2, view.H * 0.13 + 28 + i * 20); });
  ux.restore();
});

sectorHooks.push({ build, clear: () => { dropOrt('altewerft'); S.root = null; S.gut = []; S.drift = []; S.pull = null; S.beam = null; S.pts = null; S.warn = []; } });
