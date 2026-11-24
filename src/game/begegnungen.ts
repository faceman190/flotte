import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { d3, rand, clamp } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame, stats, cargoUsed } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy } from './combat';
import { SHARED } from './shared';
import { radio } from '../ui/radio';
import { addRep, type RepId } from './reputation';
import { ortePrompt, orteKey } from './orte';
import { buildCivilian, SHIPNAMES, type CivType } from '../models/ships';
import type { ItemId } from '../data/items';
import { aufgabeKapsel } from './aufgaben';

// =====================================================================================
// Begegnungen unterwegs (seit 2026-11-24): Beim Fliegen durch einen Sektor taucht ab und zu etwas auf, das man ansteuern kann – ein Notruf,
// eine Rettungskapsel, treibende Fracht, ein Frachter mit Antriebsschaden, in unsicheren Sektoren ein Frachter unter Ferrox-Beschuss.
// Funkspruch und Marke im HUD (auch Ziel für Kurzsprung und Schnellflug); wer nicht hinfliegt, verliert das Signal nach einigen Minuten.
// Heimstatt bleibt sicher (Wunsch des Spielers): dort keine Angriffe. Eine Begegnung zur Zeit, nur für den eigenen Piloten (nicht geteilt).
// =====================================================================================

type Kind = 'kapsel' | 'treibgut' | 'panne' | 'angriff';
interface Obj { g: THREE.Object3D; x: number; y: number; z: number; got?: boolean }
interface Ev {
  kind: Kind; x: number; y: number; z: number; age: number; life: number; sector: string;
  root: THREE.Group; objs: Obj[]; name: string; who: string; hold: number; done: boolean; seen: boolean; foes: any[]; leave: number; spawned: boolean;
  ship?: ReturnType<typeof buildCivilian>;
}
const S = { ev: null as Ev | null, next: 160, beam: null as THREE.Line | null };
export const BEGEGNUNG = S;
const NAMEN = ['Mara Lenz', 'Jonas Brück', 'Ida Kern', 'Tobias Hahn', 'Lea Voss', 'Emil Raab', 'Nora Falk', 'Paul Weber', 'Greta Sander', 'Ole Brandt', 'Anni Roth', 'Kai Möller'];
const WAREN: ItemId[] = ['stahl', 'kupferb', 'zellen', 'erz', 'kupfer', 'eis', 'schrott', 'titan'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const dist = () => (S.ev ? d3(P.x, P.y, P.z, S.ev.x, S.ev.y, S.ev.z) : 1e9);
const fmt = (m: number) => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m');

// ---------- Aufbau ----------
const POD_GEO = new THREE.CylinderGeometry(1.6, 1.9, 4.6, 14), POD_M = new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.55, roughness: 0.45 });
const BAND_M = new THREE.MeshStandardMaterial({ color: 0xd06a10, metalness: 0.3, roughness: 0.5, emissive: 0x401800 });
const BOX_GEO = new THREE.BoxGeometry(4, 3, 7), BOX_M = new THREE.MeshStandardMaterial({ color: 0x6a5a40, metalness: 0.5, roughness: 0.6, emissive: 0x1a1206 });
function pod() {
  const g = new THREE.Group(), body = new THREE.Mesh(POD_GEO, POD_M); body.rotation.z = Math.PI / 2; g.add(body);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.6, 14), BAND_M); band.rotation.z = Math.PI / 2; g.add(band);
  const gl = new THREE.Sprite(glowMat(0xff8a30, 0.9)); gl.scale.setScalar(9); g.add(gl); g.userData.blink = gl;
  return g;
}
function crate() {
  const g = new THREE.Group(); g.add(new THREE.Mesh(BOX_GEO, BOX_M));
  const gl = new THREE.Sprite(glowMat(0xffc860, 0.8)); gl.scale.setScalar(11); g.add(gl); g.userData.blink = gl;
  return g;
}
function place(): [number, number, number] | null {
  const def = world.def!, R = def.size?.r ? def.size.r * 0.85 : 7000, H = def.size?.h ? def.size.h * 0.6 : 1200;
  // vor dem Schiff (± 70°), 2,5 bis 6 km weit, nicht in Stationen, Toren oder Feldern
  for (let k = 0; k < 60; k++) {      // zuerst vor dem Schiff, später in jeder Richtung und näher (am Sektorrand, zwischen Feldern)
    const a = P.yaw + (k < 20 ? rand(-1.2, 1.2) : rand(-Math.PI, Math.PI)), r = k < 40 ? rand(2500, def.size ? 6000 : 3500) : rand(1500, 2500);
    const x = P.x - Math.sin(a) * r, z = P.z - Math.cos(a) * r, y = clamp(P.y + rand(-300, 300), -H, H);
    if (Math.hypot(x, z) > R) continue;
    if (world.stations.some(s => d3(x, y, z, s.x, s.y, s.z) < 1500) || world.gates.some(g => d3(x, y, z, g.x, g.y, g.z) < 1500) || world.fields.some(f => d3(x, y, z, f.x, f.y, f.z) < f.r + 400)) continue;
    return [x, y, z];
  }
  return null;
}
function start(force?: Kind) {
  const def = world.def!, p = place(); if (!p) return;
  const kinds: Kind[] = ['kapsel', 'treibgut', 'panne', 'kapsel', 'treibgut', 'panne'];
  if (def.danger >= 1 && def.id !== 'heimstatt') kinds.push('angriff', 'angriff', 'angriff');
  const kind = force || pick(kinds), [x, y, z] = p, root = new THREE.Group(); root.position.set(x, y, z); scene.add(root);
  const ev: Ev = { kind, x, y, z, age: 0, life: 6 * 60, sector: def.id, root, objs: [], name: pick(SHIPNAMES), who: pick(NAMEN), hold: 0, done: false, seen: false, foes: [], leave: 0, spawned: false };
  if (kind === 'kapsel') { const g = pod(); root.add(g); ev.objs.push({ g, x, y, z }); }
  if (kind === 'treibgut') for (let i = 0, n = 3 + Math.floor(Math.random() * 3); i < n; i++) {
    const g = crate(); g.position.set(rand(-160, 160), rand(-50, 50), rand(-160, 160)); g.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3)); root.add(g);
    ev.objs.push({ g, x: x + g.position.x, y: y + g.position.y, z: z + g.position.z });
  }
  if (kind === 'panne' || kind === 'angriff') {
    const b = buildCivilian(pick(['freighter', 'tanker'] as CivType[])); for (const gl of b.glows) { gl.userData.base = gl.scale.x / 10; gl.scale.setScalar(kind === 'panne' ? 0.2 : 3); }
    root.add(b.g); b.g.rotation.set(rand(-0.2, 0.2), rand(0, 6.28), rand(-0.3, 0.3)); ev.ship = b;
  }
  S.ev = ev;
  const at = `${fmt(dist())}`;
  const T: Record<Kind, [string, string]> = {
    kapsel: ['NOTRUF', `Rettungskapsel, hier spricht ${ev.who}. Mein Schiff ist weg, die Luft reicht noch für ein paar Stunden. Ich sende auf allen Kanälen. Wer mich hört: bitte.`],
    treibgut: ['FUNK', `Frachter „${ev.name}“ an alle: Wir haben Container verloren, ${at} von hier treiben sie. Wer sie aufsammelt, darf sie behalten. Wir haben keine Zeit zum Umkehren.`],
    panne: ['NOTRUF', `Frachter „${ev.name}“, Antrieb ausgefallen, wir treiben. Braucht jemand Starthilfe? Wir zahlen. Positionslicht ist an.`],
    angriff: ['NOTRUF', `Frachter „${ev.name}“ unter Beschuss! Ferrox am Rumpf, wir halten nicht lange. Jeder, der eine Kanone hat: Kurs auf uns!`],
  };
  radio(T[kind][0], T[kind][1], kind === 'angriff' ? '#ff6b5b' : '#ffd27a');
  sfx('ui_open', 0.35, 1.2, () => snd(520, 0.3, 'square', 0.03, 0));
}
function end(msg?: [string, string, string?]) {
  const ev = S.ev; if (!ev) return;
  if (msg) radio(msg[0], msg[1], msg[2] || '#9fd8ff');
  ev.root.parent?.remove(ev.root); ev.root.traverse((o: any) => { if (o.isMesh && o.geometry !== POD_GEO && o.geometry !== BOX_GEO) o.geometry?.dispose?.(); });
  if (S.beam) S.beam.visible = false;
  S.ev = null; S.next = rand(180, 360);
}
function lohn(cr: number, fac: RepId | null, ruf: number, text: string) {
  P.credits += cr; if (fac) addRep(fac, ruf);
  radio('SYSTEM', `${text} +${cr.toLocaleString('de-DE')} Credits${fac ? `, +${ruf} Ruf` : ''}.`, '#7fe0a0');
  sfx('ui_confirm', 0.45, 1, () => snd(880, 0.15, 'sine', 0.05, 300)); saveGame();
}

// ---------- pro Bild ----------
export function updateBegegnungen(dt: number) {
  const ev = S.ev;
  if (ev && (!world.def || world.def.id !== ev.sector || world.surface)) { end(); return; }
  if (G.mode !== 'play' || G.dead || !world.def || world.surface) return;      // angedockt, zu Fuß, im Menü: alles steht
  if (!ev) {
    if (P.story?.prolog !== 'done' || G.dockedAt) return;
    if (world.stations.some(s => d3(P.x, P.y, P.z, s.x, s.y, s.z) < 1200)) return;      // nicht direkt an einer Station
    if ((S.next -= dt) <= 0) start();
    return;
  }
  ev.age += dt;
  const d = dist(), t = G.time;
  for (const o of ev.objs) { o.g.rotation.y += dt * 0.4; const b = o.g.userData.blink as THREE.Sprite; if (b) b.visible = !o.got && Math.sin(t * 4 + o.x) > -0.2; }
  if (d < 2000) ev.seen = true;
  if (!ev.done && !ev.seen && ev.age > ev.life) { end(['SYSTEM', 'Das Signal ist abgerissen.']); return; }
  if (ev.done) { if ((ev.leave -= dt) <= 0) end(); else if (ev.ship) { ev.root.position.addScaledVector(new THREE.Vector3(0, 0, -1).applyQuaternion(ev.ship.g.quaternion), 70 * dt); } return; }
  if (ev.seen && d > 9000) { end(['SYSTEM', 'Begegnung zurückgelassen.']); return; }
  if (ev.kind === 'treibgut') {
    for (const o of ev.objs) {
      if (o.got || d3(o.x, o.y, o.z, P.x, P.y, P.z) > 28) continue;
      o.got = true; o.g.visible = false; burst(o.x, o.y, o.z, '#ffc860', 22, 40, 0.6);
      const room = stats().cargo - cargoUsed(), k = pick(WAREN), n = Math.min(room, 2 + Math.floor(Math.random() * 4));
      if (n > 0) { P.cargo[k] += n; radio('SYSTEM', `Container geborgen: ${n} Einheiten an Bord.`, '#cfd6e3'); } else radio('SYSTEM', 'Container geborgen, aber der Frachtraum ist voll.', '#ff9b7a');
      snd(700, 0.15, 'triangle', 0.05, 300);
    }
    if (ev.objs.every(o => o.got)) { ev.done = true; ev.leave = 1; saveGame(); }
  }
  if (ev.kind === 'angriff') {
    if (!ev.spawned && d < 2500) {
      ev.spawned = true;
      const n = clamp(1 + (world.def.danger || 1), 2, 5);
      for (let i = 0; i < n; i++) { const e = spawnEnemy('drone', ev.x + rand(-250, 250), ev.y + rand(-80, 80), ev.z + rand(-250, 250)); if (e) ev.foes.push(e); }
      if (!ev.foes.length) ev.foes = world.enemies.filter((e: any) => d3(e.x, e.y, e.z, ev.x, ev.y, ev.z) < 600);
    }
    if (ev.spawned && ev.foes.length && ev.foes.every((e: any) => !world.enemies.includes(e) || e.hp <= 0)) {
      ev.done = true; ev.leave = 25; if (ev.ship) for (const gl of ev.ship.glows) gl.scale.setScalar(8);
      lohn(Math.round(rand(700, 1000)), 'wacht', 10, `„${ev.name}“: Ihr habt uns rausgehauen. Wir fliegen weiter, danke!`);
    }
    if (ev.spawned && !ev.foes.length && ev.age > 30) { ev.done = true; ev.leave = 25; lohn(500, 'wacht', 5, `„${ev.name}“: Die Ferrox sind abgezogen. Danke fürs Kommen.`); }
  }
  // Kapsel und Panne: E halten (eine Aktion mit Traktorstrahl bzw. Energiekopplung)
  if ((ev.kind === 'kapsel' || ev.kind === 'panne') && ev.hold > 0) {
    const reach = ev.kind === 'kapsel' ? 70 : 220;
    if (d > reach + 60) { ev.hold = 0; if (S.beam) S.beam.visible = false; radio('SYSTEM', 'Verbindung abgebrochen: zu weit weg.', '#ff9b7a'); return; }
    ev.hold += dt;
    if (!S.beam) { S.beam = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.6 })); S.beam.frustumCulled = false; scene.add(S.beam); }
    const a = S.beam.geometry.attributes.position as THREE.BufferAttribute; a.setXYZ(0, P.x, P.y - 2, P.z); a.setXYZ(1, ev.x, ev.y, ev.z); a.needsUpdate = true; S.beam.visible = true;
    (S.beam.material as THREE.LineBasicMaterial).opacity = 0.35 + 0.25 * Math.sin(t * 20);
    if (ev.kind === 'kapsel') ev.root.position.lerp(new THREE.Vector3(P.x, P.y, P.z), Math.min(1, dt * 0.25));
    const need = ev.kind === 'kapsel' ? 3.5 : 5;
    if (ev.hold >= need) {
      S.beam.visible = false; ev.hold = 0; ev.done = true;
      if (ev.kind === 'kapsel') { aufgabeKapsel(); ev.root.visible = false; ev.leave = 0.5; lohn(Math.round(rand(300, 500)), 'rat', 6, `${ev.who} ist an Bord. „Ich dachte, mich findet keiner mehr.“`); }
      else { ev.leave = 22; if (ev.ship) for (const gl of ev.ship.glows) gl.scale.setScalar(6 * (gl.userData.base || 1)); burst(ev.x, ev.y, ev.z, '#9fd8ff', 30, 60, 0.8); lohn(Math.round(rand(450, 700)), 'gilde', 5, `„${ev.name}“: Antrieb läuft! Danke für die Starthilfe.`); }
    }
  }
}
orteKey.push(() => {
  const ev = S.ev; if (!ev || ev.done || ev.hold > 0 || (ev.kind !== 'kapsel' && ev.kind !== 'panne')) return false;
  if (dist() > (ev.kind === 'kapsel' ? 70 : 220)) return false;
  ev.hold = 0.001; snd(400, 0.3, 'sine', 0.03, 300); return true;
});
ortePrompt.push(() => {
  const ev = S.ev; if (!ev || ev.done) return null;
  if (ev.kind === 'kapsel' && dist() <= 70) return ev.hold > 0 ? `Kapsel wird geborgen … ${Math.round(ev.hold / 3.5 * 100)} %` : '[E] Rettungskapsel bergen';
  if (ev.kind === 'panne' && dist() <= 220) return ev.hold > 0 ? `Starthilfe … ${Math.round(ev.hold / 5 * 100)} %` : '[E] Starthilfe geben';
  return null;
});
/** Marken für HUD, Kurzsprung und Schnellflug */
export function begegnungMarkers() {
  const ev = S.ev, out: { x: number; y: number; z: number; label: string; col: string; big?: boolean }[] = [];
  if (!ev || ev.done || !world.def || world.def.id !== ev.sector || world.surface) return out;
  const L: Record<Kind, string> = { kapsel: 'NOTRUF · RETTUNGSKAPSEL', treibgut: 'TREIBGUT', panne: `NOTRUF · ${ev.name.toUpperCase()}`, angriff: `ANGRIFF · ${ev.name.toUpperCase()}` };
  if (ev.kind === 'treibgut' && dist() < 1500) { for (const o of ev.objs) if (!o.got) out.push({ x: o.x, y: o.y, z: o.z, label: 'CONTAINER', col: '#ffc860' }); }
  else out.push({ x: ev.root.position.x, y: ev.root.position.y, z: ev.root.position.z, label: L[ev.kind], col: ev.kind === 'angriff' ? '#ff6b5b' : '#ffd27a', big: true });
  return out;
}
/** nur für Tests: sofort eine Begegnung (Art wählbar) */
/** Außenbordeinsatz (eva.ts): treibender Container in Griffweite (4 m)? take = von Hand bergen (anderthalbmal so viel Ware) */
export function evaContainer(x: number, y: number, z: number, take: boolean): boolean {
  const ev = S.ev; if (!ev || ev.kind !== 'treibgut' || ev.done) return false;
  const o = ev.objs.find(q => !q.got && d3(q.x, q.y, q.z, x, y, z) < 4); if (!o) return false;
  if (!take) return true;
  o.got = true; o.g.visible = false; burst(o.x, o.y, o.z, '#ffc860', 22, 20, 0.5);
  const room = stats().cargo - cargoUsed(), k = pick(WAREN), n = Math.min(room, Math.round((2 + Math.floor(Math.random() * 4)) * 1.5));
  if (n > 0) { P.cargo[k] += n; radio('SYSTEM', `Container von Hand geborgen: ${n} Einheiten an Bord.`, '#cfd6e3'); } else radio('SYSTEM', 'Container geborgen, aber der Frachtraum ist voll.', '#ff9b7a');
  if (ev.objs.every(q => q.got)) { ev.done = true; ev.leave = 1; saveGame(); }
  return true;
}
export function begegnungJetzt(kind?: Kind) { if (S.ev) end(); start(kind); return S.ev?.kind || null; }
