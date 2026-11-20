import * as THREE from 'three';
import { scene, GLOW } from '../core/engine';
import { rand, pick, d3 } from '../core/util';
import { sndOut as snd } from '../core/audio';
import { world, dropPick } from './world';
import { P, G } from './state';
import { radio } from '../ui/radio';
import { ITEMS, type ItemId } from '../data/items';
import { buildShipModel } from '../models/playerShips';
import { spawnEnemy } from './combat';
import { addRep, stationFaction } from './reputation';
import { buyPrice, sellsHere } from './economy';
import { crewHooks } from './crewStimmen';
import { SHARED } from './shared';
import { burst } from './fx';

// =====================================================================================
// Weltleben im All (seit 2026-11-20): Funkverkehr im Hintergrund, Bergbauschiffe an den Asteroidenfeldern,
// treibende Frachtkisten und Notrufe von Frachtern. Ergänzt den Verkehr in npc.ts (der seit demselben Tag auch andockt).
// Alles hier ist örtlich (jeder Spieler sieht seine eigenen Schürfer und Kisten); nur die Angreifer eines Notrufs sind echte Ferrox
// und kommen beim Gastgeber ins Spiel wie jeder Ferrox.
// =====================================================================================
const _v = new THREE.Vector3();
const FUNK_COL: Record<string, string> = { BRUMMER: '#7cc4ff', LEITSTELLE: '#5fd0ff', SCHÜRFER: '#d9b06a', MARKT: '#ffb347', NOTRUF: '#ff7a5c' };

// ---------- Funk im Hintergrund ----------
let funkT = 30, queue: { at: number; who: string; text: string; col?: string; antwort: boolean }[] = [];
const said: string[] = [];
function lotse() {
  if (world.def?.id === 'heimstatt') return { who: 'BRUMMER', col: FUNK_COL.BRUMMER };
  const st = world.stations[0];
  return { who: st ? st.name.toUpperCase() : 'LEITSTELLE', col: FUNK_COL.LEITSTELLE };
}
const q = (who: string, text: string, delay: number, col?: string) => queue.push({ at: G.time + delay, who, text, col, antwort: delay > 0 });   // Antworten dürfen sich wiederholen
const nameOf = (t: any) => `„${t.name}“`;
const BANTER: [string, string][] = [
  ['{b}, bist du das hinter mir?', 'Wer sonst. Halt deinen Kurs.'],
  ['{b}, hast du noch Kaffee an Bord?', 'Nur das Zeug aus dem Automaten. Willst du trotzdem?'],
  ['Schöne Ladung, {b}. Wohin damit?', 'Werft. Wie immer. Die Werft frisst alles.'],
  ['{b}, dein Positionslicht links ist aus.', 'Weiß ich. Seit drei Wochen. Bestellt ist es.'],
];
const PATROUILLE = ['Streife Nord, alles ruhig.', 'Hab was auf dem Schirm … nein, nur Geröll.', 'Leitstelle, ich dreh noch eine Runde ums Tor.', 'Sektor sauber. Zurück zur Station.', 'Sieht ruhig aus heute. Zu ruhig, wenn du mich fragst.'];
const SCHUERF = ['Brocken geknackt. Gutes Eisen hier draußen.', 'Mein Bohrkopf glüht. Pause in zehn.', 'Wer hat den dicken Brocken in Feld zwei markiert? Der gehört mir.', 'Laderaum halb voll. Noch zwei Stunden, dann fliege ich rein.', 'Hier liegt mehr Kupfer, als die Karte sagt. Psst.'];
const LEITSTELLE = ['Leitstelle an alle: Wartung an den Positionslichtern beim Tor, Abstand halten.', 'Leitstelle an alle: Frachter bitte in der Anflugschneise bleiben. Danke.', 'Leitstelle an alle: Funkcheck. Wer mich hört, alles normal.'];

function funkZeile(): boolean {
  const L = lotse(), traffic = world.traffic.filter(t => t.alive && !t.story), opts: (() => boolean)[] = [];
  const anflug = traffic.filter(t => t.goal?.dockStage === 2 && G.time - (t.dockT || 0) < 25);
  if (anflug.length) opts.push(() => { const t = pick(anflug); q(L.who, `${nameOf(t)}, Hangar ist frei. Langsam rein, das Tor steht offen.`, 0, L.col); q(t.name.toUpperCase(), `Verstanden. Gehen runter auf dreißig.`, 3.2, '#d0b0ff'); return true; });
  const ab = traffic.filter(t => t.outT && G.time - t.outT < 40);
  if (ab.length) opts.push(() => { const t = pick(ab); q(L.who, `${nameOf(t)}, Ausflug frei. Gute Reise.`, 0, L.col); q(t.name.toUpperCase(), 'Danke. Bis zum nächsten Mal.', 3, '#d0b0ff'); return true; });
  if (traffic.length >= 2) opts.push(() => { const [a, b] = [pick(traffic), pick(traffic)]; if (a === b) return false; const [x, y] = pick(BANTER); q(a.name.toUpperCase(), x.replace('{b}', `„${b.name}“`), 0, '#d0b0ff'); q(b.name.toUpperCase(), y, 3.4, '#d0b0ff'); return true; });
  const allies = world.allies.filter(a => a.alive);
  if (allies.length) opts.push(() => { const a = pick(allies); q(a.name, pick(PATROUILLE), 0, a.col); return true; });
  if (miners.length) opts.push(() => { const m = pick(miners); q(m.name, pick(SCHUERF), 0, FUNK_COL.SCHÜRFER); return true; });
  const st = world.stations[0];
  if (st) opts.push(() => {
    // Angebot des Marktes: eine Ware, die hier gerade deutlich unter dem Grundpreis zu haben ist (echter Preis)
    const sec = world.def!.id, cand = (Object.keys(ITEMS) as ItemId[]).filter(k => { try { return sellsHere(st.def, sec, k) && buyPrice(st.def, sec, k) < ITEMS[k].base * 0.95; } catch { return false; } });
    if (!cand.length) return false;
    const k = pick(cand); q(`${st.name.toUpperCase()} · MARKT`, `Heute ${ITEMS[k].n} günstig, ${buyPrice(st.def, sec, k)} Credits das Stück. Wer zuerst kommt …`, 0, FUNK_COL.MARKT); return true;
  });
  opts.push(() => { q(L.who, pick(LEITSTELLE).replace('Leitstelle', L.who === 'BRUMMER' ? 'Brummer' : 'Leitstelle'), 0, L.col); return true; });
  for (let i = 0; i < 4; i++) if (pick(opts)()) return true;
  return false;
}
function updateFunk(dt: number) {
  // fällige Zeilen senden (bricht ab, wenn der Pilot nicht mehr fliegt)
  for (let i = queue.length - 1; i >= 0; i--) if (queue[i].at <= G.time) { const z = queue.splice(i, 1)[0]; if (G.mode === 'play' && (z.antwort || !said.includes(z.text))) { radio(z.who, z.text, z.col); said.push(z.text); while (said.length > 12) said.shift(); } }
  if (G.mode !== 'play' || !world.def || world.def.faction === 'ferrox') return;
  funkT -= dt;
  if (funkT > 0) return;
  funkT = rand(55, 100);
  const fight = world.enemies.some(e => d3(e.x, e.y, e.z, P.x, P.y, P.z) < 3000);
  if (fight || crewHooks.busy() || queue.length) { funkT = rand(15, 25); return; }
  funkZeile();
}

// ---------- Bergbauschiffe (Elster) an den Feldern ----------
// Ein Schürfer hängt an einem Brocken, ein Strahl läuft vom Bug zum Gestein, ab und zu fliegen Splitter. Nach einer Weile fliegt er zum nächsten.
interface Miner { glut: THREE.Sprite; name: string; g: THREE.Object3D; x: number; y: number; z: number; tx: number; ty: number; tz: number; rock: { x: number; y: number; z: number; r: number } | null; t: number; beam: THREE.Mesh; spark: number }
const miners: Miner[] = [];
const BEAM_GEO = new THREE.CylinderGeometry(0.9, 0.9, 1, 8, 1, true); BEAM_GEO.rotateX(Math.PI / 2); BEAM_GEO.translate(0, 0, 0.5);
const BEAM_MAT = new THREE.MeshBasicMaterial({ color: 0xffa860, transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false });
const MINER_NAMES = ['ELSTER 3', 'ELSTER 7', 'ELSTER 12', 'SCHÜRFER HAGEN', 'SCHÜRFERIN OKKA'];
function freeRock(near?: { x: number; y: number; z: number }) {
  const rocks = world.asteroids.filter((a: any) => a.r > 12 && a.hp > 0);
  if (!rocks.length) return null;
  if (!near) return pick(rocks);
  let best: any = null, bd = Infinity;
  for (let i = 0; i < 30; i++) { const r = pick(rocks), d = d3(r.x, r.y, r.z, near.x, near.y, near.z); if (d < bd && d > 80) { bd = d; best = r; } }
  return best;
}
function standOff(r: { x: number; y: number; z: number; r: number }) {
  _v.set(rand(-1, 1), rand(-0.3, 0.6), rand(-1, 1)).normalize().multiplyScalar(r.r * 1.45 + 28);   // Brocken sind sichtbar größer als ihr Rechenradius
  return { x: r.x + _v.x, y: r.y + _v.y, z: r.z + _v.z };
}
export function initWeltLeben() {
  clearWeltLeben();
  funkT = rand(25, 50);
  const def = world.def;
  if (!def || def.faction === 'ferrox' || !world.asteroids.length) return;
  const n = def.faction === 'core' ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const r = freeRock(); if (!r) break;
    let g: THREE.Object3D;
    try { g = buildShipModel('elster', pick(['Orange', 'Blue', 'Green'] as const)).g; } catch { break; }
    const p = standOff(r); g.position.set(p.x, p.y, p.z); scene.add(g);
    const beam = new THREE.Mesh(BEAM_GEO, BEAM_MAT); beam.visible = false; scene.add(beam);
    const glut = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff9a50, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); glut.visible = false; scene.add(glut);
    miners.push({ glut, name: MINER_NAMES[i % MINER_NAMES.length], g, x: p.x, y: p.y, z: p.z, tx: p.x, ty: p.y, tz: p.z, rock: r, t: rand(40, 90), beam, spark: 0 });
  }
  cargoT = rand(120, 240); notT = rand(240, 420);
}
export function clearWeltLeben() {
  for (const m of miners) { scene.remove(m.g); scene.remove(m.beam); scene.remove(m.glut); }
  miners.length = 0; queue = [];
  if (crate) { scene.remove(crate.g); crate = null; }
  notruf = null;
}
function updateMiners(dt: number) {
  for (const m of miners) {
    const dx = m.tx - m.x, dy = m.ty - m.y, dz = m.tz - m.z, d = Math.hypot(dx, dy, dz);
    if (d > 2) {
      const sp = Math.min(60, d * 0.5 + 4);
      m.x += dx / d * sp * dt; m.y += dy / d * sp * dt; m.z += dz / d * sp * dt;
      m.g.position.set(m.x, m.y, m.z);
      _v.set(m.x - dx, m.y - dy, m.z - dz); m.g.lookAt(_v);          // Bug in Flugrichtung (Modelle schauen nach −Z)
      m.beam.visible = false; m.glut.visible = false;
      continue;
    }
    if (!m.rock) continue;
    // am Brocken: zum Gestein drehen, Strahl, Splitter
    _v.set(2 * m.x - m.rock.x, 2 * m.y - m.rock.y, 2 * m.z - m.rock.z); m.g.lookAt(_v);
    const bx = m.rock.x - m.x, by = m.rock.y - m.y, bz = m.rock.z - m.z, bl = Math.hypot(bx, by, bz) - m.rock.r * 0.8;
    m.beam.visible = true; m.beam.position.set(m.x, m.y - 1.5, m.z); m.beam.lookAt(m.rock.x, m.rock.y, m.rock.z); m.beam.scale.set(1, 1, Math.max(4, bl));
    (m.beam.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(G.time * 23 + m.x) * 0.2;
    { const k = 1 - (m.rock.r * 0.8) / Math.max(1, Math.hypot(bx, by, bz)); m.glut.visible = true; m.glut.position.set(m.x + bx * k, m.y - 1.5 + by * k, m.z + bz * k); m.glut.scale.setScalar(10 + Math.sin(G.time * 17 + m.z) * 3); }   // Glutpunkt am Gestein
    m.spark -= dt;
    if (m.spark <= 0 && d3(m.x, m.y, m.z, P.x, P.y, P.z) < 2500) {
      m.spark = rand(0.25, 0.6);
      const k = 1 - (m.rock.r * 0.8) / Math.max(1, Math.hypot(bx, by, bz));
      burst(m.x + bx * k, m.y + by * k, m.z + bz * k, '#ffb070', 6, 25, 0.5);
    }
    m.t -= dt;
    if (m.t <= 0) { const r = freeRock(m.rock); if (r) { m.rock = r; const p = standOff(r); m.tx = p.x; m.ty = p.y; m.tz = p.z; } m.t = rand(50, 110); }
  }
}

// ---------- Treibende Frachtkiste ----------
// Ein Frachter hat eine Kiste verloren: Funkmeldung mit grober Lage (beim Tor nach …), blinkendes Licht weithin sichtbar.
// Wer auf 60 m heranfliegt, birgt sie: Ware schwebt heraus und wird wie Beute eingesammelt.
let crate: { g: THREE.Group; x: number; y: number; z: number; life: number; lamp: THREE.Sprite } | null = null, cargoT = 180;
const CRATE_MAT = new THREE.MeshStandardMaterial({ color: 0x6a7058, roughness: 0.7, metalness: 0.4 });
function spawnCrate() {
  const def = world.def; if (!def || !world.gates.length || !world.stations.length) return;
  const g0 = pick(world.gates), st = pick(world.stations), k = rand(0.25, 0.7);
  const off = new THREE.Vector3(rand(-1, 1), rand(-0.2, 0.2), rand(-1, 1)).normalize().multiplyScalar(rand(300, 700));
  const x = g0.x + (st.x - g0.x) * k + off.x, y = g0.y + (st.y - g0.y) * k + off.y, z = g0.z + (st.z - g0.z) * k + off.z;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.BoxGeometry(6, 4, 9), CRATE_MAT));
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffb040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  lamp.position.y = 2.6; lamp.scale.setScalar(40); g.add(lamp);
  g.position.set(x, y, z); g.rotation.set(rand(0, 6), rand(0, 6), 0); scene.add(g);
  crate = { g, x, y, z, life: 600, lamp };
  const who = world.traffic.length ? `„${pick(world.traffic).name}“` : 'Ein Frachter';
  radio(lotse().who, `${who} hat eine Frachtkiste verloren, irgendwo zwischen dem Tor nach ${g0.name} und ${st.name}. Wer sie findet, darf sie behalten.`, lotse().col);
}
function updateCrate(dt: number) {
  if (!crate) return;
  crate.life -= dt;
  crate.g.rotation.y += dt * 0.15; crate.g.rotation.x += dt * 0.07;
  crate.lamp.material.opacity = Math.sin(G.time * 5) > 0.3 ? 1 : 0.15;
  if (G.mode === 'play' && !G.dead && d3(crate.x, crate.y, crate.z, P.x, P.y, P.z) < 60) {
    const goods: ItemId[] = ['stahl', 'kupferb', 'zellen', 'titanb', 'erz', 'kupfer', 'eis'];
    for (let i = 0; i < 3; i++) dropPick(crate.x, crate.y, crate.z, pick(goods), Math.round(rand(2, 6)), 30);
    burst(crate.x, crate.y, crate.z, '#ffd080', 40, 50, 0.9); snd(660, 0.12, 'sine', 0.04, 300);
    radio('SYSTEM', 'Frachtkiste geborgen. Die Ladung schwebt heraus.');
    scene.remove(crate.g); crate = null; return;
  }
  if (crate.life <= 0) { scene.remove(crate.g); crate = null; }
}
export const weltKiste = () => crate;      // für Tests und eine mögliche Anzeige

// ---------- Notruf eines Frachters ----------
// Nur an der Grenze und in unsicheren Kernsektoren (Gefahr ab 1), nicht in Heimstatt. Drei bis vier Ferrox fallen über einen Frachter her;
// überlebt er zwei Minuten und sind die Angreifer weg, bedankt sich die Besatzung: Credits und Ruf bei der Fraktion der Station.
let notruf: { t: any; foes: any[]; until: number; done: boolean } | null = null, notT = 300;
function startNotruf() {
  const def = world.def; if (!def || def.danger < 1 || def.id === 'heimstatt' || SHARED.client) return;
  const cand = world.traffic.filter(t => t.alive && !t.story && !t.goal?.dockStage && d3(t.x, t.y, t.z, P.x, P.y, P.z) < 9000);
  if (!cand.length) return;
  const t = pick(cand), foes: any[] = [];
  for (let i = 0; i < (def.danger >= 3 ? 4 : 3); i++) {
    const e = spawnEnemy('drone', t.x + rand(-500, 500), t.y + rand(-120, 120), t.z + rand(-500, 500), { x: t.x, y: t.y, z: t.z });
    e.target = { ship: t }; e.rt = 30; foes.push(e);
  }
  notruf = { t, foes, until: G.time + 120, done: false };
  radio(`${t.name.toUpperCase()} · NOTRUF`, `Hier ${t.def.n} „${t.name}“! Ferrox greifen uns an! Wer in der Nähe ist, bitte helfen!`, FUNK_COL.NOTRUF);
  snd(520, 0.2, 'square', 0.035); setTimeout(() => snd(520, 0.2, 'square', 0.035), 260);
}
function updateNotruf() {
  if (!notruf || notruf.done) return;
  const n = notruf, alive = n.foes.filter(e => world.enemies.includes(e) && e.hp > 0);
  if (!n.t.alive) { notruf = null; return; }                         // verloren: npc.ts meldet es schon
  for (const e of alive) if (!e.target) { e.target = { ship: n.t }; e.rt = 20; }
  if (!alive.length) {
    n.done = true;
    const near = d3(n.t.x, n.t.y, n.t.z, P.x, P.y, P.z) < 4000;
    if (near) {
      const lohn = Math.round(rand(350, 700) / 10) * 10, st = world.stations[0];
      P.credits += lohn; P.earned += lohn;
      if (st) addRep(stationFaction(st.id, world.def!.id), 12);
      radio(n.t.name.toUpperCase(), `Danke, Pilot! Ohne dich wären wir Futter gewesen. ${lohn} Credits sind unterwegs.`, '#d0b0ff');
    } else radio(n.t.name.toUpperCase(), 'Die Patrouille hat sie vertrieben. Danke an alle, die gekommen sind.', '#d0b0ff');
    notruf = null;
  } else if (G.time > n.until + 120) notruf = null;                // zu lange: still auflösen (die Ferrox bleiben)
}
export const weltNotruf = () => notruf;

// ---------- pro Bild ----------
export function updateWeltLeben(dt: number) {
  if (!world.def) return;
  updateFunk(dt);
  updateMiners(dt);
  updateCrate(dt);
  updateNotruf();
  if (G.mode !== 'play' || world.def.faction === 'ferrox') return;
  cargoT -= dt; if (cargoT <= 0) { cargoT = rand(300, 540); if (!crate && Math.random() < 0.6) spawnCrate(); }
  notT -= dt; if (notT <= 0) { notT = rand(420, 780); if (!notruf && !world.enemies.length && Math.random() < 0.5) startNotruf(); }
}
// für Tests
export const weltTest = { spawnCrate, startNotruf, funkZeile, miners: () => miners.length, minerAt: (i = 0) => miners[i] ? { x: miners[i].x, y: miners[i].y, z: miners[i].z, rock: miners[i].rock, beam: miners[i].beam.visible } : null };
