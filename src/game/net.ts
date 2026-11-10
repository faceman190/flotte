import * as THREE from 'three';
import { scene } from '../core/engine';
import { P, G, settings } from './state';
import { world, makeAst, removeAst, breakAst, astHooks, type Asteroid } from './world';
import { crumble, blastAst, MINE } from './mining';
import { burst } from './fx';
import { spawnEnemy, killEnemy, rewardKill, fireBullet } from './combat';
import { SHARED } from './shared';
import type { ItemId, RockKind } from '../data/items';
import { SHIP } from './player';
import { ROVER, buildRover } from './surface';
import { IN } from './interior';
import { buildShipModel, type ShipModel } from '../models/playerShips';
import { SHIPS, type ShipId } from '../data/ships';
import type { Paint } from '../models/gltfShips';
import { radio } from '../ui/radio';

// =====================================================================================
// Mehrspieler (Client): Verbindung zum Server, eigenen Stand senden (10× pro Sekunde),
// andere Piloten im selben Raum (Sektor oder Planetenoberfläche) darstellen, Chat.
// =====================================================================================
export const NET = {
  ws: null as WebSocket | null, status: 'aus' as 'aus' | 'verbinde' | 'online' | 'fehler', id: 0, url: '', err: '',
  roster: [] as { id: number; name: string; room: string }[],
};
export const netHooks = { changed: () => {} };   // Status oder Online-Liste geändert (Menüs neu zeichnen)
export interface Remote {
  id: number; name: string; cls: string; paint: string; m: string; s: number;
  ship: ShipModel | null; rover: THREE.Group | null; tp: THREE.Vector3; tq: THREE.Quaternion; seen: number;
}
export const remotes = new Map<number, Remote>();
let room = '', retry = 0, wantOnline = false, sentName = '';

// Standard-Adresse: läuft das Spiel vom Mehrspieler-Server, ist es dieselbe Adresse; sonst der lokale Testserver
export function defaultUrl() {
  const h = location.host, served = /^https?:$/.test(location.protocol) && h && !/claude|5179|5180/.test(h);
  return served ? `${location.protocol === 'https:' ? 'wss' : 'ws'}://${h}/ws` : 'ws://localhost:2567/ws';
}
export const isOnline = () => NET.status === 'online';

export function connect(url = settings.server || defaultUrl()) {
  disconnect(true);
  wantOnline = true;
  NET.url = url; NET.status = 'verbinde'; NET.err = '';
  netHooks.changed();
  let ws: WebSocket;
  try { ws = new WebSocket(url); } catch (e) { NET.status = 'fehler'; NET.err = 'Adresse ungültig'; netHooks.changed(); return; }
  NET.ws = ws;
  ws.onopen = () => { retry = 0; room = ''; sentName = P.name || 'Pilot'; ws.send(JSON.stringify({ t: 'hello', name: sentName })); };
  ws.onmessage = e => { try { onMsg(JSON.parse(e.data)); } catch { /* kaputte Nachricht ignorieren */ } };
  ws.onerror = () => { NET.err = 'Server nicht erreichbar'; };
  ws.onclose = () => {
    if (NET.ws !== ws) return;
    const was = NET.status === 'online';
    NET.ws = null; NET.status = wantOnline ? 'fehler' : 'aus'; NET.roster = [];
    clearRemotes(); leaveShared();
    if (was) radio('SYSTEM', 'Verbindung zum Mehrspieler-Server verloren.');
    netHooks.changed();
    // automatisch neu verbinden, wenn die Verbindung schon einmal stand
    if (wantOnline && was && retry < 5) { retry++; setTimeout(() => { if (wantOnline && !NET.ws) connect(url); }, 2000 * retry); }
  };
}
export function disconnect(silent = false) {
  wantOnline = false;
  const ws = NET.ws; NET.ws = null;
  if (ws) try { ws.close(); } catch { /* egal */ }
  NET.status = 'aus'; NET.roster = []; NET.id = 0;
  clearRemotes(); leaveShared();
  if (!silent) netHooks.changed();
}
const sendMsg = (m: object) => { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(m)); };
export function sendChat(text: string) { const t = text.trim().slice(0, 200); if (t) sendMsg({ t: 'chat', text: t }); }

function onMsg(m: any) {
  if (m.t === 'welcome') {
    NET.id = m.id; NET.status = 'online';
    const off = (m.now || 0) - performance.now() / 1000;
    SHARED.now = () => performance.now() / 1000 + off;
    SHARED.market = m.market || {};
    SHARED.online = true;
    radio('SYSTEM', `Mit dem Mehrspieler-Server verbunden. ${m.online > 1 ? `${m.online - 1} weitere Piloten online.` : 'Du bist der erste Pilot online.'}`);
    netHooks.changed();
  } else if (m.t === 'roster') {
    const before = new Set(NET.roster.map(r => r.id));
    NET.roster = m.list || [];
    for (const r of NET.roster) if (before.size && !before.has(r.id) && r.id !== NET.id) radio('FUNK', `${r.name} ist jetzt online.`, '#7fe0a0');
    netHooks.changed();
  } else if (m.t === 'st') {
    if (m.id === NET.id) return;
    let r = remotes.get(m.id);
    if (!r) { r = { id: m.id, name: m.name, cls: '', paint: '', m: '', s: 0, ship: null, rover: null, tp: new THREE.Vector3(), tq: new THREE.Quaternion(), seen: 0 }; remotes.set(m.id, r); }
    r.name = m.name; r.s = m.s || 0; r.m = m.m;
    if (m.p?.length === 3) r.tp.set(m.p[0], m.p[1], m.p[2]);
    if (m.q?.length === 4) r.tq.set(m.q[0], m.q[1], m.q[2], m.q[3]).normalize();
    const cls = SHIPS[m.cls as ShipId] ? m.cls : 'falke';
    if (!r.ship || r.cls !== cls || r.paint !== m.paint) {
      if (r.ship) disposeObj(r.ship.g);
      r.cls = cls; r.paint = m.paint;
      r.ship = buildShipModel(cls as ShipId, (m.paint || 'Orange') as Paint);
      (r.ship.shield.material as THREE.MeshBasicMaterial).opacity = 0;
      r.ship.g.position.copy(r.tp); r.ship.g.quaternion.copy(r.tq);
      scene.add(r.ship.g);
    }
    if (r.m === 'rover' && !r.rover) { r.rover = buildRover().g; r.rover.position.copy(r.tp); scene.add(r.rover); }
    r.seen = performance.now();
  } else if (m.t === 'leave') {
    removeRemote(m.id);
  } else if (m.t === 'host') {
    hostId = m.id; updateRole();
  } else if (m.t === 'w') {
    applyWorld(m.l || []);
  } else if (m.t === 'a') {
    applyAction(m);
  } else if (m.t === 'f') {
    applyFoes(m);
  } else if (m.t === 'fk') {
    if (m.by === NET.id && m.p?.length === 3) rewardKill(m.type, m.p[0], m.p[1], m.p[2]);
  } else if (m.t === 'mkt') {
    (SHARED.market[m.st] = SHARED.market[m.st] || {})[m.k] = { s: m.s, t: m.at };
  } else if (m.t === 'chat') {
    radio(m.name, m.text, m.id === NET.id ? '#ffb347' : '#7fe0a0');
  }
}
function disposeObj(o: THREE.Object3D) { scene.remove(o); o.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose(); }); }
function removeRemote(id: number) { const r = remotes.get(id); if (!r) return; if (r.ship) disposeObj(r.ship.g); if (r.rover) disposeObj(r.rover); remotes.delete(id); }
function clearRemotes() { for (const id of [...remotes.keys()]) removeRemote(id); }

// Was gerade sichtbar ist: Schiff, Rover oder nichts (zu Fuß in der Station, angedockt)
function myState() {
  if (IN.active || G.dockedAt) return { o: SHIP.g, m: 'innen' };
  if (ROVER.active && ROVER.model) return { o: ROVER.model.g, m: 'rover' };
  return { o: SHIP.g, m: 'schiff' };
}
// Eigenen Stand senden: eigener Takt (10× pro Sekunde), unabhängig vom Bildaufbau.
// So bleibt ein Pilot sichtbar, auch wenn sein Browser-Tab im Hintergrund liegt (dort bremst der Browser nur auf etwa 1× pro Sekunde).
function sendState() {
  if (NET.status !== 'online') return;
  if (P.name && P.name !== sentName) { sentName = P.name; sendMsg({ t: 'hello', name: sentName }); }
  if (!world.def || G.mode === 'menu') { if (room) { room = ''; clearRemotes(); sendMsg({ t: 'room', room: '' }); } return; }
  // Raum: Sektor oder Planetenoberfläche
  const key = world.def.id + (world.surface ? ':planet' : '');
  if (key !== room) { room = key; clearRemotes(); hostId = 0; synced = false; foesSynced = false; updateRole(); sendMsg({ t: 'room', room }); }
  flushYld();
  // im Flug die Flugposition (das Modell wird nur beim Zeichnen nachgeführt), sonst die Lage des Modells
  const s = myState(), p = s.m === 'schiff' ? P : s.o.position, q = s.o.quaternion;
  sendMsg({ t: 'st', p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w], s: Math.hypot(P.vx, P.vy, P.vz), cls: P.cls, paint: P.paint, m: s.m });
}
setInterval(sendState, 100);
export function netUpdate(dt: number) {
  if (NET.status !== 'online') return;
  SHARED.pilots = [...remotes.values()].filter(r => r.m === 'schiff' && r.ship).map(r => ({ id: r.id, x: r.ship!.g.position.x, y: r.ship!.g.position.y, z: r.ship!.g.position.z, vx: 0, vy: 0, vz: 0 }));
  if (SHARED.client) moveFoes(dt);
  // andere Piloten weich nachführen
  const k = Math.min(1, dt * 8), now = performance.now();
  for (const r of [...remotes.values()]) {
    if (now - r.seen > 6000) { removeRemote(r.id); continue; }   // lange nichts gehört
    const ship = r.ship!, onShip = r.m === 'schiff';
    ship.g.visible = onShip || r.m === 'rover';   // im Rover-Modus steht das Schiff gelandet daneben (letzter Stand)
    if (onShip) { ship.g.position.lerp(r.tp, k); ship.g.quaternion.slerp(r.tq, k); }
    for (const gl of ship.glows) gl.scale.setScalar((gl.userData.base || 1) * (0.5 + Math.min(1, r.s / 200) * 1.3) * (onShip ? 1 : 0.4));
    if (r.rover) { r.rover.visible = r.m === 'rover'; if (r.m === 'rover') { r.rover.position.lerp(r.tp, k); r.rover.quaternion.slerp(r.tq, k); } }
  }
}
// Für Anzeigen: wo sind die anderen gerade sichtbar?
export function remoteMarkers() {
  const out: { name: string; x: number; y: number; z: number; m: string }[] = [];
  for (const r of remotes.values()) {
    const o = r.m === 'rover' && r.rover ? r.rover : r.ship?.g;
    if (!o || !o.visible) continue;
    out.push({ name: r.name, x: o.position.x, y: o.position.y, z: o.position.z, m: r.m });
  }
  return out;
}

// =====================================================================================
// Gemeinsame Welt: Asteroiden
// Der Gastgeber (erster Pilot im Raum) schickt jede Sekunde alle Asteroiden; Mitspieler übernehmen den Stand
// und melden ihren Abbau. Die Beute bleibt immer bei dem, der abgebaut hat.
// =====================================================================================
let hostId = 0, synced = false, nextAstId = 1;
const KINDS: RockKind[] = ['metal', 'ice', 'crystal'];
const goneAt = new Map<number, number>(), pendYld = new Map<number, number>();
function leaveShared() { SHARED.online = false; SHARED.client = false; SHARED.pilots = []; SHARED.shots.length = 0; hostId = 0; synced = false; foesSynced = false; }
function updateRole() {
  const was = SHARED.client;
  SHARED.client = NET.status === 'online' && !!room && hostId !== 0 && hostId !== NET.id;
  if (was && !SHARED.client) {
    // Gastgeber geworden: Kennungen fortsetzen, Felder wachsen ab jetzt hier nach
    for (const a of world.asteroids) nextAstId = Math.max(nextAstId, (a.id || 0) + 1);
    for (const e of world.enemies) nextFoeId = Math.max(nextFoeId, (e.nid || 0) + 1);
    radio('SYSTEM', 'Du bist jetzt Gastgeber dieses Sektors: Asteroiden und Nachwuchs laufen über dein Spiel.');
  }
  if (!was && SHARED.client) { synced = false; foesSynced = false; }
}
const scaleAst = (a: Asteroid) => { const f = Math.max(0, a.yld / a.max), sc = 0.45 + 0.55 * Math.cbrt(f); a.mesh.scale.setScalar(sc); a.r = a.r0 * sc; };
const r1 = (v: number) => Math.round(v * 10) / 10;
function compCode(a: Asteroid) { const o = a as any; return o._cc || (o._cc = a.comp.map(c => c.k + ':' + c.p.toFixed(3)).join('|')); }
function othersHere() { return NET.roster.some(r => r.room === room && r.id !== NET.id); }
// Gastgeber: Stand senden
setInterval(() => {
  if (NET.status !== 'online' || SHARED.client || !room || !world.def || !othersHere()) return;
  const l = world.asteroids.map(a => {
    if (!a.id) a.id = nextAstId++;
    return [a.id, a.field ? world.fields.indexOf(a.field) : -1, KINDS.indexOf(a.kind), a.r0, r1(a.x), r1(a.y), r1(a.z), r1(a.vx), r1(a.vy), r1(a.vz), a.yld, a.max, compCode(a)];
  });
  sendMsg({ t: 'w', l });
}, 1000);
// Mitspieler: Stand übernehmen
function dropAst(i: number, fx: boolean) {
  const a = world.asteroids[i];
  if (fx) burst(a.x, a.y, a.z, '#8a8f9a', 16, a.r0, 1);
  a.yld = 0;
  if (MINE.target === a) MINE.target = null;
  removeAst(i);
}
function applyWorld(l: any[]) {
  if (!SHARED.client || !world.def) return;
  if (!synced) { for (let i = world.asteroids.length - 1; i >= 0; i--) dropAst(i, false); synced = true; }
  const byId = new Map<number, Asteroid>(), seen = new Set<number>(), now = performance.now();
  for (const a of world.asteroids) if (a.id) byId.set(a.id, a);
  for (const e of l) {
    const [id, fi, ki, r0, x, y, z, vx, vy, vz, yld, max, cc] = e;
    seen.add(id);
    let a = byId.get(id);
    if (!a) {
      if ((goneAt.get(id) || 0) > now - 4000) continue;   // gerade selbst abgebaut, Gastgeber weiß es noch nicht
      const comp = String(cc).split('|').map(t => { const [k, pp] = t.split(':'); return { k: k as ItemId, p: +pp }; });
      a = makeAst(x, y, z, r0, KINDS[ki] || 'metal', world.fields[fi] || null, comp, 1);
      a.id = id; a.max = max; a.yld = Math.min(yld, max);
      a.vx = vx; a.vy = vy; a.vz = vz;
      scaleAst(a);
    } else {
      a.x += (x - a.x) * 0.5; a.y += (y - a.y) * 0.5; a.z += (z - a.z) * 0.5;
      a.vx = vx; a.vy = vy; a.vz = vz;
      if (yld < a.yld) { a.yld = yld; scaleAst(a); }
    }
  }
  for (let i = world.asteroids.length - 1; i >= 0; i--) { const a = world.asteroids[i]; if (!a.id || !seen.has(a.id)) dropAst(i, true); }
}
// Mitspieler: eigenen Abbau melden
astHooks.gone = (a, how) => { if (!a.id) return; goneAt.set(a.id, performance.now()); pendYld.delete(a.id); sendMsg({ t: 'a', op: how, id: a.id }); };
astHooks.yld = a => { if (a.id) pendYld.set(a.id, a.yld); };
function flushYld() { for (const [id, v] of pendYld) sendMsg({ t: 'a', op: 'yld', id, v }); pendYld.clear(); }
// Gastgeber: Meldungen der Mitspieler anwenden (ohne Beute für den Gastgeber)
function applyAction(m: any) {
  if (SHARED.client) return;
  if (m.op === 'fhit' || m.op === 'fhitp') { foeHitByOther(m); return; }
  const i = world.asteroids.findIndex(a => a.id === m.id);
  if (i < 0) return;
  const a = world.asteroids[i];
  if (m.op === 'yld') { if (m.v < a.yld) { a.yld = Math.max(0, m.v); scaleAst(a); if (a.yld <= 0) crumble(a, true); } }
  else if (m.op === 'mined') crumble(a, true);
  else if (m.op === 'break') breakAst(i, false);
  else if (m.op === 'blast') blastAst(a, false);
}
SHARED.sendMarket = (st, k, n) => sendMsg({ t: 'mkt', st, k, n });

// =====================================================================================
// Gemeinsame Welt: Ferrox
// Der Gastgeber steuert alle Ferrox (auch gegen andere Piloten) und schickt 10× pro Sekunde ihren Stand und
// ihre Schüsse. Mitspieler zeigen sie an, prüfen Treffer auf das eigene Schiff selbst und melden ihre Treffer.
// Kopfgeld und Beute bekommt, wer den letzten Treffer gesetzt hat.
// =====================================================================================
const FTYPES = ['drone', 'bomber', 'mother'] as const;
let foesSynced = false, nextFoeId = 1;
setInterval(() => {
  if (NET.status !== 'online' || SHARED.client || !room || !world.def) { SHARED.shots.length = 0; return; }
  if (!othersHere()) { SHARED.shots.length = 0; return; }
  const l = world.enemies.map((e: any) => {
    if (!e.nid) e.nid = nextFoeId++;
    return [e.nid, FTYPES.indexOf(e.type), r1(e.x), r1(e.y), r1(e.z), r1(e.vx), r1(e.vy), r1(e.vz), Math.ceil(e.hp), e.maxhp];
  });
  sendMsg({ t: 'f', l, s: SHARED.shots.splice(0) });
}, 100);
function applyFoes(m: any) {
  if (!SHARED.client || !world.def) return;
  if (!foesSynced) {
    // eigene Startbelegung durch die des Gastgebers ersetzen
    for (const e of world.enemies) scene.remove(e.mesh);
    world.enemies.length = 0; G.lockT = null; foesSynced = true;
  }
  const byId = new Map<number, any>(), seen = new Set<number>(), now = performance.now();
  for (const e of world.enemies as any[]) if (e.nid) byId.set(e.nid, e);
  for (const [id, ti, x, y, z, vx, vy, vz, hp, maxhp] of m.l || []) {
    seen.add(id);
    let e = byId.get(id);
    if (!e) { e = spawnEnemy(FTYPES[ti] || 'drone', x, y, z); e.nid = id; e.maxhp = maxhp; e.hp = hp; }
    else e.hp = Math.min(e.hp, hp);
    e._t = { x, y, z, vx, vy, vz, at: now };
  }
  for (let i = world.enemies.length - 1; i >= 0; i--) { const e: any = world.enemies[i]; if (!e.nid || !seen.has(e.nid)) killEnemy(e, i, false, false); }
  // Schüsse des Gastgebers nachbilden (Torpedos zielen nur auf NPC-Schiffe des Gastgebers und entfallen hier)
  for (const [x, y, z, vx, vy, vz, life, dmgP, torp] of m.s || []) {
    if (torp) continue;
    const sp = Math.hypot(vx, vy, vz) || 1;
    fireBullet(world.ebullets, x, y, z, vx / sp, vy / sp, vz / sp, sp, life, 0, 'e', { dmgP, dmgS: 0, remote: true });
  }
}
function moveFoes(dt: number) {
  const now = performance.now(), k = Math.min(1, dt * 10);
  for (const e of world.enemies as any[]) {
    const t = e._t; if (!t) continue;
    const ahead = (now - t.at) / 1000;
    e.x += (t.x + t.vx * ahead - e.x) * k; e.y += (t.y + t.vy * ahead - e.y) * k; e.z += (t.z + t.vz * ahead - e.z) * k;
    e.vx = t.vx; e.vy = t.vy; e.vz = t.vz;
    e.mesh.position.set(e.x, e.y, e.z);
    if (e.type === 'mother') { e.mesh.rotation.y += dt * 0.1; if (e.mesh.userData.ring) e.mesh.userData.ring.rotation.z += dt * 0.4; }
    else if (Math.hypot(e.vx, e.vy, e.vz) > 1) e.mesh.lookAt(e.x + e.vx, e.y + e.vy, e.z + e.vz);
  }
}
SHARED.foeHit = (e, dmg, byPlayer) => { if (e.nid) sendMsg({ t: 'a', op: byPlayer ? 'fhitp' : 'fhit', id: e.nid, v: Math.round(dmg) }); };
// Gastgeber: Treffer eines Mitspielers anwenden; bei Abschuss bekommt der Schütze Kopfgeld und Beute
function foeHitByOther(m: any) {
  const j = world.enemies.findIndex((e: any) => e.nid === m.id);
  if (j < 0) return;
  const e: any = world.enemies[j];
  e.hp -= m.v;
  if (e.hp > 0) return;
  if (m.op === 'fhitp') sendMsg({ t: 'fk', id: e.nid, by: m.from, type: e.type, p: [r1(e.x), r1(e.y), r1(e.z)] });
  killEnemy(e, j, false, false);
}
