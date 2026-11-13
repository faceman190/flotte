import * as THREE from 'three';
import { onCoop, coopSend } from './coop';
import { scene, camera, view, ux } from '../core/engine';
import { rng, hashStr } from '../core/util';
import { sfx, snd } from '../core/audio';
import { P, saveGame } from './state';
import { world } from './world';
import { terrainAt, liquidAt } from './surface';
import { kitPart, LID_HINGE } from './mineArt';
import { buildShipModel } from '../models/playerShips';
import { GEAR_IDS, RARITY, gearDef } from '../data/gear';
import { addItem, canAdd } from './inventory';
import { SECTOR } from '../data/galaxy';
import { radio } from '../ui/radio';
import type { ShipId } from '../data/ships';

// =====================================================================================
// Bergung auf Planeten (Alpha 0.84): abgestürzte Schiffe (Wracks) und Versorgungskisten in der Landschaft.
// Fest je Planet (Zufall aus dem Sektornamen), geöffnete Kisten bleiben 60 Minuten leer (P.salvage).
// Wracks tragen eine Tresorkiste: dort liegen auch die legendären Gegenstände, die es sonst nirgends gibt.
// =====================================================================================

interface Crate { x: number; y: number; z: number; big: boolean; idx: number; g: THREE.Group; lid: THREE.Object3D; open: boolean; wreck: number }
interface Wreck { x: number; z: number; r: number; name: string; g: THREE.Group; smoke: number }
const S = { sector: '', crates: [] as Crate[], wrecks: [] as Wreck[], msg: [] as { t: string; c: string; life: number }[] };
export const SALV = S;
const LEGEND = ['sw_lanze', 'sy_orakel', 'waffe_splitter', 'helm_kristall'];
const TIERC = ['#aab4c0', '#5fd0ff', '#c070ff', '#ffb347'];
const WRECKS: { cls: ShipId; n: string }[] = [{ cls: 'falke', n: 'Wrack eines Falken' }, { cls: 'elster', n: 'Wrack einer Elster' }, { cls: 'kaerrner', n: 'Wrack eines Kärrners' }, { cls: 'habicht', n: 'Wrack eines Habichts' }, { cls: 'maulwurf', n: 'Wrack eines Maulwurfs' }];

function state() {
  P.salvage = P.salvage || {};
  let st = P.salvage[S.sector];
  if (!st || Date.now() - st.t > 60 * 60000) st = P.salvage[S.sector] = { t: Date.now(), open: [] };
  return st;
}

function crateModel(big: boolean) {
  const kn = big ? 'tresorkiste' : 'kiste', body = kitPart(kn), lm = kitPart(kn + '_deckel');
  const g = new THREE.Group(), lid = new THREE.Group();
  if (body && lm) { const hg = LID_HINGE[kn]; g.add(body); lid.position.set(hg[0], hg[1], hg[2]); lid.add(lm); g.add(lid); }
  else {
    const s = big ? 1.5 : 1, m = new THREE.MeshStandardMaterial({ color: big ? 0x6a5a44 : 0x55606a, roughness: 0.7, metalness: 0.4 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.9 * s, 0.5 * s, 0.6 * s), m); b.position.y = 0.25 * s; g.add(b);
    lid.position.set(0, 0.5 * s, -0.3 * s); const l = new THREE.Mesh(new THREE.BoxGeometry(0.94 * s, 0.12 * s, 0.64 * s), m); l.position.set(0, 0.06 * s, 0.3 * s); lid.add(l); g.add(lid);
  }
  g.traverse((o: any) => { if (o.isMesh) o.castShadow = true; });
  return { g, lid };
}

// Wrack: Schiffsmodell, verkohlt (eigene Materialkopien), schief und halb im Boden
function wreckModel(cls: ShipId, R: () => number) {
  const m = buildShipModel(cls);
  for (const o of [...m.glows, ...m.navs]) o.visible = false;
  m.shield.visible = false;
  m.g.traverse((o: any) => {
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const cl = ms.map((x: any) => { const c = x.clone(); if (c.color) c.color.multiplyScalar(0.28 + R() * 0.1); if (c.emissive) c.emissive.setScalar(0); if ('roughness' in c) c.roughness = Math.min(1, (c.roughness || 0.5) + 0.35); if ('metalness' in c) c.metalness *= 0.6; return c; });
    o.material = Array.isArray(o.material) ? cl : cl[0]; o.castShadow = true;
  });
  return m.g;
}

export function buildSalvage(sector: string) {
  S.sector = sector; S.crates = []; S.wrecks = []; S.msg = [];
  if (!world.surface) return;
  const R = rng(hashStr(sector + ':bergung')), st = state();
  const dry = (x: number, z: number) => !liquidAt(x, z) && Math.abs(terrainAt(x + 4, z) - terrainAt(x - 4, z)) + Math.abs(terrainAt(x, z + 4) - terrainAt(x, z - 4)) < 5;
  const spot = (r0: number, r1: number) => { for (let t = 0; t < 40; t++) { const a = R.range(0, Math.PI * 2), d = R.range(r0, r1), x = Math.cos(a) * d, z = Math.sin(a) * d; if (dry(x, z)) return [x, z]; } return null; };
  let idx = 0;
  const addCrate = (x: number, z: number, big: boolean, wreck: number) => {
    const { g, lid } = crateModel(big), y = terrainAt(x, z);
    g.position.set(x, y - 0.03, z); g.rotation.set(R.range(-0.08, 0.08), R.range(0, 6.28), R.range(-0.08, 0.08));
    scene.add(g); world.extras.push(g);
    const c: Crate = { x, y, z, big, idx: idx++, g, lid, open: st.open.includes(idx - 1), wreck };
    if (c.open) lid.rotation.x = -1.9;
    S.crates.push(c);
  };
  // vier Wracks mit Tresorkiste und zwei Kisten daneben
  for (let w = 0; w < 4; w++) {
    const p = spot(450, 2700); if (!p) continue;
    const def = WRECKS[Math.floor(R.next() * WRECKS.length)], g = wreckModel(def.cls, R.next);
    const box = new THREE.Box3(); g.updateMatrixWorld(true); g.traverse((o: any) => { if (o.isMesh && o.visible && !o.isSprite) box.expandByObject(o); });   // ohne Schildkugel und Leuchtpunkte
    const size = box.getSize(new THREE.Vector3()), r = Math.max(size.x, size.z) * 0.5;
    const y = terrainAt(p[0], p[1]);
    g.position.set(p[0], y - size.y * 0.18, p[1]); g.rotation.set(R.range(-0.25, 0.25), R.range(0, 6.28), R.range(0.35, 0.85) * (R.next() < 0.5 ? -1 : 1));
    scene.add(g); world.extras.push(g);
    S.wrecks.push({ x: p[0], z: p[1], r: r * 0.75, name: def.n, g, smoke: R.next() * 3 });
    const a = R.range(0, Math.PI * 2);
    addCrate(p[0] + Math.cos(a) * (r * 0.8 + 3), p[1] + Math.sin(a) * (r * 0.8 + 3), true, w);
    for (let k = 0; k < 2; k++) { const b = a + R.range(0.8, 2.4) * (k ? 1 : -1); addCrate(p[0] + Math.cos(b) * (r * 0.9 + R.range(3, 8)), p[1] + Math.sin(b) * (r * 0.9 + R.range(3, 8)), false, w); }
  }
  // verstreute Versorgungskisten (abgeworfen, verloren, vergessen)
  for (let k = 0; k < 12; k++) { const p = spot(250, 3000); if (p) addCrate(p[0], p[1], R.next() < 0.15, -1); }
}

function lootId(R: () => number, tierMax: number, legend: boolean): string {
  const dg = (SECTOR[P.sector] && SECTOR[P.sector].danger) || 1;
  if (legend) return LEGEND[Math.floor(R() * LEGEND.length)];
  const r = R(); let tier = r < 0.52 - dg * 0.05 ? 0 : r < 0.88 - dg * 0.04 ? 1 : 2;
  if (tierMax >= 3) tier = Math.min(3, tier + 1 + (R() < 0.12 ? 1 : 0));                 // Tresorkiste: eine Stufe höher
  tier = Math.min(tier, tierMax);
  const pool = GEAR_IDS.filter(id => { const d = gearDef(id)!; return d.rar === tier && !LEGEND.includes(id); });
  return pool[Math.floor(R() * pool.length)] || 'fund_datenkern';
}
function say(t: string, c = '#dfe8f0') { S.msg.unshift({ t, c, life: 6 }); if (S.msg.length > 5) S.msg.pop(); }

export function nearCrate(x: number, z: number) {
  let best: Crate | null = null, bd = 2.4;
  for (const c of S.crates) { if (c.open) continue; const d = Math.hypot(c.x - x, c.z - z); if (d < bd) { bd = d; best = c; } }
  return best;
}
// shared: ein Mitspieler hat die Kiste geöffnet – Deckel geht auf, jeder bekommt seinen eigenen Fund (Koop, src/game/coop.ts)
export function openCrate(c: Crate, shared = false) {
  if (c.open) return;
  const st = state(), R = rng(hashStr(S.sector + ':' + c.idx + ':' + st.t)), wreck = c.wreck >= 0;
  // Tresorkiste im Wrack: jede vierte etwa enthält ein legendäres Stück, sonst Stufe 2–3
  const legend = c.big && wreck && R.next() < 0.25;
  const id = lootId(R.next, c.big ? 3 : 1, legend), d = gearDef(id)!;
  if (!canAdd(id) && !shared) { say('Rucksack voll. Die Kiste bleibt zu.', '#ff6b5b'); snd(180, 0.2, 'square', 0.04, -60); return; }
  if (!canAdd(id)) say('Ein Mitspieler hat eine Kiste geöffnet – dein Rucksack ist voll, dein Anteil verfällt.', '#ff6b5b');
  else {
    const cr = Math.round((c.big ? 450 : 50) * (wreck ? 1.4 : 1) * (0.7 + R.next() * 0.6));
    addItem(id, 1); P.credits += cr; P.earned += cr;
    say(`${shared ? 'Geteilte Beute: ' : ''}${d.n} (${RARITY[d.rar].n})`, TIERC[Math.min(3, d.rar)]); say(`+${cr} Credits`, '#ffb347');
    if (legend) radio('SYSTEM', `Legendärer Fund im Wrack: ${d.n}.`);
    if (c.big && R.next() < 0.5) { const f = R.next() < 0.5 ? 'fund_relikt' : 'fund_datenkern'; if (addItem(f, 1)) say(gearDef(f)!.n, TIERC[Math.min(3, gearDef(f)!.rar)]); }
  }
  c.open = true; if (!st.open.includes(c.idx)) st.open.push(c.idx);
  sfx('pickup', shared ? 0.4 : 0.7, 1, () => snd(700, 0.2, 'triangle', 0.05, 300)); saveGame();
  if (!shared) coopSend('scr', { s: S.sector, i: c.idx });
}
// Koop: offene Kisten an neue Mitspieler; Meldungen der anderen
export function salvageFull() { if (S.sector) coopSend('sfull', { s: S.sector, cr: S.crates.filter(c => c.open).map(c => c.idx) }); }
onCoop('scr', m => { if (m.s !== S.sector) return; const c = S.crates.find(q => q.idx === +m.i); if (c) openCrate(c, true); });
onCoop('sfull', m => {
  if (m.s !== S.sector) return;
  const st = state();
  for (const idx of Array.isArray(m.cr) ? m.cr : []) { const c = S.crates.find(q => q.idx === +idx); if (c && !c.open) { c.open = true; if (!st.open.includes(c.idx)) st.open.push(c.idx); } }
});

let smokeT = 0;
export function updateSalvage(dt: number, puff: (x: number, y: number, z: number) => void) {
  for (const c of S.crates) if (c.open && c.lid.rotation.x > -1.9) c.lid.rotation.x = Math.max(-1.9, c.lid.rotation.x - dt * 4);
  for (const m of S.msg) m.life -= dt;
  S.msg = S.msg.filter(m => m.life > 0);
  // Wracks qualmen noch leicht
  if ((smokeT -= dt) <= 0) { smokeT = 0.25; for (const w of S.wrecks) if (Math.hypot(w.x - camera.position.x, w.z - camera.position.z) < 900) puff(w.x + (Math.random() - 0.5) * w.r, terrainAt(w.x, w.z) + 2, w.z + (Math.random() - 0.5) * w.r); }
}
// Hindernisse zu Fuß und für den Rover
export function salvageBlock(x: number, z: number, r: number) {
  for (const w of S.wrecks) { const d = Math.hypot(x - w.x, z - w.z); if (d < w.r + r) return w; }
  return null;
}

// Anzeige: Wracks in Sichtweite, Kisten in der Nähe, Fundmeldungen
const _p = new THREE.Vector3();
export function drawSalvageHUD(px: number, pz: number) {
  if (!world.surface || !S.crates.length) return;
  const W = view.W, H = view.H;
  ux.save(); ux.textAlign = 'center'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace';
  const mark = (x: number, y: number, z: number, t: string, col: string) => {
    _p.set(x, y, z).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1 || Math.abs(_p.y) > 1) return;
    ux.fillStyle = col; ux.fillText(t, (_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H);
  };
  for (const w of S.wrecks) { const d = Math.hypot(w.x - px, w.z - pz); if (d < 1200 && d > 12) mark(w.x, terrainAt(w.x, w.z) + 9, w.z, `◇ ${w.name.toUpperCase()} · ${Math.round(d)} m`, '#e0b030'); }
  for (const c of S.crates) { if (c.open) continue; const d = Math.hypot(c.x - px, c.z - pz); if (d < 60 && d > 2.5) mark(c.x, c.y + 1.4, c.z, c.big ? `▣ TRESORKISTE · ${Math.round(d)} m` : `▪ KISTE · ${Math.round(d)} m`, c.big ? '#ffb347' : '#9fd8ff'); }
  ux.textAlign = 'left'; ux.font = '600 14px "Share Tech Mono",Consolas,monospace';
  S.msg.forEach((m, i) => { ux.globalAlpha = Math.min(1, m.life); ux.fillStyle = m.c; ux.fillText(m.t, 24, H * 0.42 + i * 20); });
  ux.restore();
}
