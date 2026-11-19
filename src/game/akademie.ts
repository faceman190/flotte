import * as THREE from 'three';
import { GLOW, scene, ux, view } from '../core/engine';
import { d3, rand, fmtD } from '../core/util';
import { snd, sfx, boom } from '../core/audio';
import { world, sectorHooks } from './world';
import { ORTE, ZIELE, orteHud, dropOrt, type Ziel, type HudKit } from './orte';
import { P, G, saveGame } from './state';
import { burst } from './fx';
import { radio } from '../ui/radio';
import { buildModelStation } from '../models/stationModels';
import { buildOutpost } from '../models/structures';
import { buildShipModel } from '../models/playerShips';
import { SF } from './schnellflug';

// =====================================================================================
// Akademie-Übungsgelände in Heimstatt (Phase 2, docs/heimstatt.md): 12 km nordöstlich der Bastion.
//  · Leitstand (Außenposten-Modell, nicht andockbar)
//  · Ringparcours: zwölf Ringe als Rundkurs. Durch den Startring fliegen startet die Uhr, der letzte Durchflug ist wieder der Startring.
//  · Schießstand: ausgemusterte Venoms als ferngesteuerte Zieldrohnen. Der erste Treffer startet die Übung, zwölf Abschüsse beenden sie.
// Beides läuft nur beim eigenen Piloten (Mehrspieler: jeder fliegt für sich). Bestzeiten und Abzeichen im Spielstand (P.akademie),
// Lohn einmal je Abzeichen (Bronze, Silber, Gold). Keine Gefahr: Die Drohnen schießen nicht zurück.
// =====================================================================================

const C = new THREE.Vector3(10500, 400, -6500);       // Leitstand
const R_ORT = 3600;                                   // Ausdehnung des Geländes (Navigation, Fernansicht)
const N_RING = 12, RING_R = 40;                       // Ringe: Anzahl, lichter Radius (m)
const CR = new THREE.Vector3(1700, 0, -1500);         // Mitte des Rundkurses relativ zum Leitstand
const CS = new THREE.Vector3(-1500, 60, 1000);        // Mitte des Schießstands relativ zum Leitstand (Seite zur Bastion)
const RANGE_R = 900, N_DRONE = 4, KILLS = 12;
const LOHN = [250, 500, 1000];                        // Bronze, Silber, Gold (je Disziplin einmal)
const MED_N = ['Bronze', 'Silber', 'Gold'], MED_C = ['#c8905a', '#cfd8e0', '#ffd27a'];

type RingRec = { p: THREE.Vector3; n: THREE.Vector3; lights: number[] };
type Drone = Ziel & { mesh: THREE.Object3D; c: THREE.Vector3; amp: THREE.Vector3; w: THREE.Vector3; ph: THREE.Vector3; t: number; respawn: number; flash: number; mats: THREE.MeshStandardMaterial[] };
const A = {
  root: null as THREE.Group | null,
  rings: [] as RingRec[], L: 0,
  pts: null as THREE.Points | null, col: null as Float32Array | null,
  drones: [] as Drone[],
  station: null as any,
  run: null as null | { kind: 'ring' | 'schuss'; t: number; next: number; kills: number; idle: number },
  side: [] as number[],                                // Seite der Ringebene im letzten Bild (Durchflug erkennen)
  told: false, msg: null as null | { t: string; c: string; life: number },
};
export const AKADEMIE = A;

const med = (kind: 'ring' | 'schuss', s: number) => {
  const g = kind === 'ring' ? [A.L / 120, A.L / 170, A.L / 240] : [85, 55, 35];   // Sekunden für Bronze, Silber, Gold
  return s <= g[2] ? 3 : s <= g[1] ? 2 : s <= g[0] ? 1 : 0;
};
const fmtT = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0').replace('.', ',')}`;
function ak() { return (P.akademie = P.akademie || { med: { ring: 0, schuss: 0 } }); }

// ---------- Aufbau ----------
function ringGeo() {
  // Fachwerkring: vier Gurte (Kastenprofile 1,6 m) im Quadrat 4 × 3,6 m um den lichten Radius, Pfosten und Diagonalen dazwischen.
  // Dazu vier Klammergehäuse (eigene Geometrie, Signalfarbe) mit Lampenkasten und Antenne.
  const parts: THREE.BufferGeometry[] = [], hous: THREE.BufferGeometry[] = [], seg = 28, r0 = RING_R + 1, r1 = RING_R + 5, hz = 1.8;
  const bar = (a: THREE.Vector3, b: THREE.Vector3, w: number, list = parts) => {
    const len = a.distanceTo(b), g = new THREE.BoxGeometry(w, w, len + w * 0.6);
    g.applyMatrix4(new THREE.Matrix4().lookAt(a, b, Math.abs(b.z - a.z) > len * 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); list.push(g);
  };
  const P3 = (r: number, a: number, z: number) => new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, z);
  for (let i = 0; i < seg; i++) {
    const a0 = i / seg * Math.PI * 2, a1 = (i + 1) / seg * Math.PI * 2;
    for (const r of [r0, r1]) for (const z of [-hz, hz]) bar(P3(r, a0, z), P3(r, a1, z), 1.6);                 // Gurte
    bar(P3(r0, a0, -hz), P3(r1, a0, -hz), 0.8); bar(P3(r0, a0, hz), P3(r1, a0, hz), 0.8);                       // Pfosten
    bar(P3(r0, a0, -hz), P3(r0, a0, hz), 0.8); bar(P3(r1, a0, -hz), P3(r1, a0, hz), 0.8);
    bar(i % 2 ? P3(r0, a0, -hz) : P3(r1, a0, -hz), i % 2 ? P3(r1, a1, -hz) : P3(r0, a1, -hz), 0.6);           // Diagonalen
    bar(i % 2 ? P3(r1, a0, hz) : P3(r0, a0, hz), i % 2 ? P3(r0, a1, hz) : P3(r1, a1, hz), 0.6);
  }
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + Math.PI / 4, c = (r0 + r1) / 2;
    const b = new THREE.BoxGeometry(9, 7.5, 6.4); b.rotateZ(a + Math.PI / 2); b.translate(Math.cos(a) * c, Math.sin(a) * c, 0); hous.push(b);
    const lamp = new THREE.BoxGeometry(3.2, 1.6, 2.4); lamp.rotateZ(a + Math.PI / 2); lamp.translate(Math.cos(a) * (r1 + 2.5), Math.sin(a) * (r1 + 2.5), 0); parts.push(lamp);
    const ant = new THREE.CylinderGeometry(0.12, 0.12, 6, 6); ant.rotateZ(a - Math.PI / 2); ant.translate(Math.cos(a) * (r1 + 5.5), Math.sin(a) * (r1 + 5.5), 1.2); parts.push(ant);
  }
  return { frame: mergeGeos(parts), housing: mergeGeos(hous) };
}
function mergeGeos(list: THREE.BufferGeometry[]) {
  // kleine Zusammenführung ohne Zusatzmodul (alle Teile haben dieselben Attribute: Position, Normale, UV, Index)
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index!.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
  let ov = 0, oi = 0;
  for (const g of list) {
    pos.set(g.attributes.position.array as Float32Array, ov * 3); nor.set(g.attributes.normal.array as Float32Array, ov * 3); uv.set(g.attributes.uv.array as Float32Array, ov * 2);
    const ix = g.index!.array; for (let k = 0; k < ix.length; k++) idx[oi + k] = ix[k] + ov;
    ov += g.attributes.position.count; oi += ix.length; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1)); out.computeBoundingSphere();
  return out;
}
export { mergeGeos };

function coursePoint(i: number) {
  const th = Math.PI + i / N_RING * Math.PI * 2;
  return new THREE.Vector3(CR.x + Math.cos(th) * 1600, CR.y + Math.sin(2 * th) * 230 + Math.sin(3 * th + 0.7) * 110, CR.z + Math.sin(th) * 1000);
}

function build(id: string) {
  dropOrt('akademie', A.drones);
  A.root = null; A.rings = []; A.drones = []; A.run = null; A.side = []; A.station = null; A.pts = null;
  if (id !== 'heimstatt') return;
  const root = new THREE.Group(); root.position.copy(C); scene.add(root); world.extras.push(root); A.root = root;
  // Leitstand
  const yaw = Math.atan2(-C.x, -C.z);                 // Front zur Bastion
  const m = buildModelStation('outpost', 210, { cell: 30, R: 130 }) || buildOutpost();
  m.g.rotation.y = yaw; root.add(m.g); A.station = m;
  const Y = new THREE.Vector3(0, 1, 0);
  world.solids.push({ x: C.x, y: C.y, z: C.z, R: m.R, sph: m.sph.map(([x, y, z, r]: number[]) => { const v = new THREE.Vector3(x, y, z).applyAxisAngle(Y, yaw); return [v.x, v.y, v.z, r]; }) });
  // Ringe (ein InstancedMesh) und ihre Positionslichter (Punkte)
  const rg = ringGeo();
  const im = new THREE.InstancedMesh(rg.frame, new THREE.MeshStandardMaterial({ color: 0x7d838a, metalness: 0.6, roughness: 0.5 }), N_RING); root.add(im);
  const ih = new THREE.InstancedMesh(rg.housing, new THREE.MeshStandardMaterial({ color: 0xa8582a, metalness: 0.3, roughness: 0.62 }), N_RING); root.add(ih);
  const lp: number[] = [], q = new THREE.Quaternion(), mtx = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  const pts = Array.from({ length: N_RING }, (_, i) => coursePoint(i));
  A.L = 0;
  for (let i = 0; i < N_RING; i++) {
    const p = pts[i], n = pts[(i + 1) % N_RING].clone().sub(pts[(i + N_RING - 1) % N_RING]).normalize();
    A.L += p.distanceTo(pts[(i + 1) % N_RING]);
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); mtx.compose(p, q, one); im.setMatrixAt(i, mtx); ih.setMatrixAt(i, mtx);
    const lights: number[] = [];
    for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2 + Math.PI / 4, rl = k % 2 ? RING_R + 6 : RING_R + 8.6, v = new THREE.Vector3(Math.cos(a) * rl, Math.sin(a) * rl, k % 2 ? 2.9 : 0).applyQuaternion(q).add(p);
      lights.push(lp.length / 3); lp.push(v.x, v.y, v.z);
    }
    A.rings.push({ p, n, lights });
    world.solids.push(...frameSolids(p, q));
  }
  im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); ih.instanceMatrix.needsUpdate = true; ih.computeBoundingSphere();
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  A.col = new Float32Array(lp.length); geo.setAttribute('color', new THREE.BufferAttribute(A.col, 3));
  const pm = new THREE.PointsMaterial({ size: 7, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false, fog: false });
  A.pts = new THREE.Points(geo, pm); A.pts.frustumCulled = false; root.add(A.pts);
  // Zieldrohnen
  for (let i = 0; i < N_DRONE; i++) A.drones.push(makeDrone(i));
  ORTE.push({ id: 'akademie', name: 'Akademie-Übungsgelände', x: C.x, y: C.y, z: C.z, R: R_ORT, mesh: root, dot: 0xcfe6ff });
}
// Kollision des Rahmens: Kugeln entlang des Rings (Weltkoordinaten relativ zur Ringmitte → hier relativ zum Leitstand gespeichert)
function frameSolids(p: THREE.Vector3, q: THREE.Quaternion) {
  const sph: number[][] = [];
  for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2, v = new THREE.Vector3(Math.cos(a) * (RING_R + 3), Math.sin(a) * (RING_R + 3), 0).applyQuaternion(q); sph.push([v.x, v.y, v.z, 3]); }
  return [{ x: C.x + p.x, y: C.y + p.y, z: C.z + p.z, R: RING_R + 8, sph }];
}

function makeDrone(i: number): Drone {
  const sm = buildShipModel('venom', 'Red');
  for (const o of sm.glows) o.visible = true;
  sm.shield.visible = false;
  const mats: THREE.MeshStandardMaterial[] = [];
  sm.g.traverse((o: any) => {
    if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
    o.material = o.material.clone(); mats.push(o.material);
  });
  A.root!.add(sm.g);
  const d: Drone = {
    type: 'ziel', x: 0, y: 0, z: 0, r: 9, hp: 45, maxhp: 45, alive: true, mesh: sm.g, mats,
    c: new THREE.Vector3(), amp: new THREE.Vector3(), w: new THREE.Vector3(), ph: new THREE.Vector3(), t: rand(0, 50), respawn: 0, flash: 0,
    hit: (dmg: number) => hitDrone(d, dmg),
  };
  placeDrone(d, i);
  ZIELE.push(d);
  return d;
}
function placeDrone(d: Drone, i = Math.floor(Math.random() * 1000)) {
  const a = i * 2.39996 + rand(-0.4, 0.4), r = rand(150, RANGE_R - 350);
  d.c.set(CS.x + Math.cos(a) * r, CS.y + rand(-140, 140), CS.z + Math.sin(a) * r);
  d.amp.set(rand(140, 300), rand(50, 140), rand(140, 300));
  d.w.set(rand(0.09, 0.16), rand(0.07, 0.13), rand(0.09, 0.16));
  d.ph.set(rand(0, 6.28), rand(0, 6.28), rand(0, 6.28));
  d.hp = d.maxhp = 45; d.alive = true; d.mesh.visible = true; d.respawn = 0;
}
function hitDrone(d: Drone, dmg: number) {
  if (!d.alive) return;
  if (!A.run && !(G.dead)) startRun('schuss');
  d.hp -= dmg; d.flash = 0.12;
  snd(900, 0.04, 'square', 0.015, -300);
  if (d.hp > 0) return;
  d.alive = false; d.mesh.visible = false; d.respawn = 2.2;
  if (G.lockT === d) G.lockT = null;
  burst(d.x, d.y, d.z, '#ffd27a', 50, 60, 0.9); burst(d.x, d.y, d.z, '#9aa4ae', 30, 40, 1.4);
  boom(0.45, 1.25, () => snd(130, 0.35, 'sawtooth', 0.05, -60));
  if (A.run?.kind === 'schuss') {
    A.run.kills++; A.run.idle = 0;
    if (A.run.kills >= KILLS) finishRun();
  }
}

// ---------- Übungen ----------
function startRun(kind: 'ring' | 'schuss') {
  if (A.run) return;
  A.run = { kind, t: 0, next: 1, kills: 0, idle: 0 };
  sfx('lock_tone', 0.6);
  say(kind === 'ring' ? 'Ringparcours: Uhr läuft. Zwölf Ringe, Ziel ist wieder der Startring.' : `Schießübung: Uhr läuft. ${KILLS} Zieldrohnen.`, '#cfe6ff');
}
function stopRun(why: string) { if (!A.run) return; A.run = null; say(why, '#ff9b7a'); snd(300, 0.3, 'sine', 0.03, -120); }
function finishRun() {
  const r = A.run!; A.run = null;
  const s = r.t, a = ak(), key = r.kind, best = a[key], m = med(key, s), had = a.med[key] || 0;
  const neu = !best || s < best;
  if (neu) a[key] = Math.round(s * 10) / 10;
  let lohn = 0;
  for (let k = had; k < m; k++) lohn += LOHN[k];
  if (m > had) a.med[key] = m;
  if (lohn) { P.credits += lohn; P.earned += lohn; }
  const name = key === 'ring' ? 'Ringparcours' : 'Schießübung';
  const txt = `${name}: ${fmtT(s)}${neu && best ? ' · neue Bestzeit' : ''}${m ? ` · Abzeichen ${MED_N[m - 1]}` : ''}${lohn ? ` · +${lohn} Credits` : ''}`;
  say(txt, m ? MED_C[m - 1] : '#cfe6ff');
  radio('AKADEMIE', m > had ? `${txt}. Gut geflogen, Pilot.` : m === 3 ? `${txt}.` : `${txt}. Für ${MED_N[m]} brauchst du unter ${fmtT(medLimit(key, m))}.`);
  sfx('pickup', 0.8, 1, () => snd(880, 0.3, 'triangle', 0.05, 400));
  saveGame();
}
const medLimit = (kind: 'ring' | 'schuss', m: number) => (kind === 'ring' ? [A.L / 120, A.L / 170, A.L / 240] : [85, 55, 35])[m];
function say(t: string, c: string) { A.msg = { t, c, life: 6 }; }

// ---------- pro Bild ----------
const _a = new THREE.Vector3(), _q = new THREE.Vector3();
export function updateAkademie(dt: number) {
  if (!A.root || world.def?.id !== 'heimstatt' || world.surface) return;
  if (A.msg && (A.msg.life -= dt) <= 0) A.msg = null;
  const near = d3(P.x, P.y, P.z, C.x, C.y, C.z) < R_ORT + 4000;
  if (!near && !A.run) return;                        // weit weg: nichts zu tun (die Fernansicht zeigt den Ort verkleinert)
  const t = G.time, live = G.mode === 'play' && !G.dead;
  if (live && !A.told && d3(P.x, P.y, P.z, C.x, C.y, C.z) < R_ORT) {
    A.told = true;
    if (!P.akademie) radio('AKADEMIE', 'Willkommen auf dem Übungsgelände der Flottenakademie. Ringparcours im Norden: durch den Startring fliegen. Schießstand zur Bastion hin: einfach eine Zieldrohne treffen. Die Drohnen schießen nicht zurück.');
  }
  // Ringparcours: Durchflug durch den nächsten Ring (bzw. den Startring, solange keine Übung läuft)
  const want = A.run?.kind === 'ring' ? A.run.next % N_RING : !A.run ? 0 : -1;
  if (want >= 0 && live) {
    const r = A.rings[want];
    _a.set(P.x - C.x - r.p.x, P.y - C.y - r.p.y, P.z - C.z - r.p.z);
    const side = _a.dot(r.n), prev = A.side[want];
    if (prev !== undefined && prev < 0 && side >= 0) {
      _q.copy(_a).addScaledVector(r.n, -side);
      if (_q.length() < RING_R) {
        if (!A.run) startRun('ring');
        else if (A.run.next >= N_RING) finishRun();
        else { A.run.next++; A.run.idle = 0; snd(1180, 0.08, 'sine', 0.04, 200); }
      }
    }
    A.side.length = 0; A.side[want] = side;
  }
  // laufende Übung: Uhr, Abbruch
  if (A.run) {
    A.run.t += dt; A.run.idle += dt;
    const dOrt = d3(P.x, P.y, P.z, C.x, C.y, C.z), dS = d3(P.x, P.y, P.z, C.x + CS.x, C.y + CS.y, C.z + CS.z);
    if (G.dead) stopRun('Übung abgebrochen.');
    else if (SF.phase !== 'off') stopRun('Übung abgebrochen: Schnellflug.');
    else if (A.run.kind === 'ring' && (dOrt > R_ORT + 1500 || A.run.idle > 90)) stopRun('Ringparcours abgebrochen.');
    else if (A.run.kind === 'schuss' && (dS > RANGE_R + 1800 || A.run.idle > 60)) stopRun('Schießübung abgebrochen.');
  }
  // Lichter der Ringe: nächster Ring blinkt hell, der übernächste ruhig, durchflogene sind aus
  const col = A.col!;
  const nx = A.run?.kind === 'ring' ? A.run.next % N_RING : 0, ringRun = A.run?.kind === 'ring';
  for (let i = 0; i < N_RING; i++) {
    let c: [number, number, number];
    if (ringRun) {
      const passed = i !== 0 ? i < A.run!.next : false;
      if (i === nx) c = Math.sin(t * 9) > 0 ? [0.55, 1, 0.65] : [0.12, 0.25, 0.14];
      else if (i === (nx + 1) % N_RING && A.run!.next < N_RING) c = [0.9, 0.62, 0.25];
      else if (passed) c = [0.04, 0.03, 0.02];
      else c = [0.3, 0.2, 0.08];
    } else if (i === 0) c = Math.sin(t * 4) > 0 ? [0.85, 1, 0.85] : [0.25, 0.3, 0.25];
    else c = (Math.floor(t * 1.2) + i) % 6 === 0 ? [0.9, 0.6, 0.25] : [0.28, 0.18, 0.07];
    for (const li of A.rings[i].lights) col.set(c, li * 3);
  }
  (A.pts!.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  // Leitstand: Lichter blinken wie an Stationen
  const m = A.station;
  if (m) {
    m.lights?.forEach((l: THREE.Sprite, i: number) => { (l.material as THREE.SpriteMaterial).opacity = ((Math.floor(t * 6) - Math.floor(i / 2)) % 7 + 7) % 7 === 0 ? 1 : 0.25; });
    m.navs?.forEach((n: THREE.Sprite, i: number) => { (n.material as THREE.SpriteMaterial).opacity = Math.sin(t * 3 + i) > 0.6 ? 1 : 0.15; });
  }
  // Zieldrohnen
  const k = A.run?.kind === 'schuss' ? 1 + A.run.kills * 0.07 : 0.8;
  for (const d of A.drones) {
    if (!d.alive) {
      if ((d.respawn -= dt) <= 0) { placeDrone(d); d.t = rand(0, 50); burst(C.x + d.c.x, C.y + d.c.y, C.z + d.c.z, '#cfe6ff', 30, 50, 0.6); }
      continue;
    }
    d.t += dt * k;
    const lx = d.c.x + d.amp.x * Math.sin(d.w.x * d.t * 6.28 + d.ph.x), ly = d.c.y + d.amp.y * Math.sin(d.w.y * d.t * 6.28 + d.ph.y), lz = d.c.z + d.amp.z * Math.sin(d.w.z * d.t * 6.28 + d.ph.z);
    const vx = lx - (d.x - C.x), vy = ly - (d.y - C.y), vz = lz - (d.z - C.z);
    d.mesh.position.set(lx, ly, lz);
    if (vx * vx + vy * vy + vz * vz > 1e-6) d.mesh.lookAt(C.x + lx - vx, C.y + ly - vy, C.z + lz - vz);   // Bug (−z) in Flugrichtung
    d.x = C.x + lx; d.y = C.y + ly; d.z = C.z + lz;
    if (d.flash > 0) d.flash -= dt;
    const e = d.flash > 0 ? 0.6 : 0;
    for (const mt of d.mats) mt.emissive.setRGB(e, e * 0.5, e * 0.2);
  }
}

// ---------- Anzeige ----------
orteHud.push((h: HudKit) => {
  if (!A.root || world.def?.id !== 'heimstatt' || world.surface) return;
  const dC = d3(P.x, P.y, P.z, C.x, C.y, C.z);
  if (dC > R_ORT + 2500 && !A.run) return;
  drawAk(h);
});
function label(h: HudKit, x: number, y: number, z: number, t: string, col: string, arrow = false) {
  const p = h.proj(x, y, z);
  if (h.onScreen(p, 20)) { ux.fillStyle = col; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center'; ux.fillText(t, p.x, p.y); return p; }
  if (arrow) h.edgeArrow(p, col, t);
  return null;
}
function drawAk(h: HudKit) {
  const a = ak(), W = view.W, H = view.H;
  ux.save(); ux.textAlign = 'center';
  // Startring und Schießstand, solange keine Übung läuft
  if (!A.run) {
    const r0 = A.rings[0], s0 = C.clone().add(r0.p), dr = d3(P.x, P.y, P.z, s0.x, s0.y, s0.z);
    label(h, s0.x, s0.y + RING_R + 18, s0.z, `RINGPARCOURS · START · ${fmtD(dr)}${a.ring ? ` · BEST ${fmtT(a.ring)}` : ''}`, '#bfe8c8');
    const sc = C.clone().add(CS), ds = d3(P.x, P.y, P.z, sc.x, sc.y, sc.z);
    if (ds > RANGE_R * 0.7) label(h, sc.x, sc.y + 260, sc.z, `SCHIESSSTAND · ${fmtD(ds)}${a.schuss ? ` · BEST ${fmtT(a.schuss)}` : ''}`, '#ffc890');
  }
  // Ringparcours: nächster Ring
  if (A.run?.kind === 'ring') {
    const i = A.run.next % N_RING, r = A.rings[i], x = C.x + r.p.x, y = C.y + r.p.y, z = C.z + r.p.z, d = d3(P.x, P.y, P.z, x, y, z);
    const p = h.proj(x, y, z);
    if (h.onScreen(p)) { const rr = Math.max(14, Math.min(220, RING_R * 900 / Math.max(p.d, 1))); h.brackets(p, rr, '#9ff0b0', 2); ux.fillStyle = '#9ff0b0'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(`${A.run.next >= N_RING ? 'ZIEL' : 'RING ' + (A.run.next)} · ${fmtD(d)}`, p.x, p.y - rr - 8); }
    else h.edgeArrow(p, '#9ff0b0', `${A.run.next >= N_RING ? 'ZIEL' : 'RING ' + A.run.next} · ${fmtD(d)}`);
  }
  // Zieldrohnen
  const sch = A.run?.kind === 'schuss', dS = d3(P.x, P.y, P.z, C.x + CS.x, C.y + CS.y, C.z + CS.z);
  if (sch || dS < RANGE_R + 1500) for (const d of A.drones) {
    if (!d.alive) continue;
    const p = h.proj(d.x, d.y, d.z), dd = d3(P.x, P.y, P.z, d.x, d.y, d.z), locked = G.lockT === d;
    if (h.onScreen(p)) {
      const r = Math.max(11, Math.min(46, 1500 / Math.max(dd, 1)));
      h.brackets(p, r, locked ? '#ffd27a' : '#ffb070', locked ? 2 : 1.3);
      if (d.hp < d.maxhp) { ux.fillStyle = '#0e1e28'; ux.fillRect(p.x - r, p.y - r - 9, r * 2, 4); ux.fillStyle = '#ffb070'; ux.fillRect(p.x - r, p.y - r - 9, r * 2 * Math.max(0, d.hp) / d.maxhp, 4); }
      if (locked) { ux.fillStyle = '#ffd27a'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillText(P.rockets > 0 ? 'ERFASST · RECHTSKLICK: RAKETE' : 'ERFASST', p.x, p.y - r - 14); }
      else if (dd > 600) { ux.fillStyle = 'rgba(255,176,112,.7)'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillText(fmtD(dd), p.x, p.y + r + 12); }
    } else if (sch && dd < 2500) h.edgeArrow(p, '#ffb070', '');
  }
  // Uhr der laufenden Übung (unter dem Kompass)
  if (A.run) {
    const best = a[A.run.kind];
    const t = A.run.kind === 'ring'
      ? `RINGPARCOURS  ${fmtT(A.run.t)}  ·  RING ${Math.min(A.run.next, N_RING)}/${N_RING}${best ? `  ·  BEST ${fmtT(best)}` : ''}`
      : `SCHIESSÜBUNG  ${fmtT(A.run.t)}  ·  ${A.run.kills}/${KILLS}${best ? `  ·  BEST ${fmtT(best)}` : ''}`;
    ux.font = '700 15px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = 'rgba(4,12,18,.55)';
    const w = ux.measureText(t).width + 28; ux.fillRect(W / 2 - w / 2, H * 0.13 - 18, w, 26);
    ux.fillStyle = '#e4eef5'; ux.fillText(t, W / 2, H * 0.13);
  }
  if (A.msg) { ux.globalAlpha = Math.min(1, A.msg.life); ux.font = '700 14px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = A.msg.c; ux.fillText(A.msg.t, W / 2, H * 0.13 + 28); ux.globalAlpha = 1; }
  ux.restore();
}

sectorHooks.push({ build, clear: () => { dropOrt('akademie', A.drones); A.root = null; A.rings = []; A.drones = []; A.run = null; A.station = null; A.pts = null; A.side = []; } });
