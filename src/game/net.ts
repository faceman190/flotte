import * as THREE from 'three';
import { scene } from '../core/engine';
import { P, G, settings } from './state';
import { world } from './world';
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
    clearRemotes();
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
  clearRemotes();
  if (!silent) netHooks.changed();
}
const sendMsg = (m: object) => { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(m)); };
export function sendChat(text: string) { const t = text.trim().slice(0, 200); if (t) sendMsg({ t: 'chat', text: t }); }

function onMsg(m: any) {
  if (m.t === 'welcome') {
    NET.id = m.id; NET.status = 'online';
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
  if (key !== room) { room = key; clearRemotes(); sendMsg({ t: 'room', room }); }
  const s = myState(), p = s.o.position, q = s.o.quaternion;
  sendMsg({ t: 'st', p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w], s: Math.hypot(P.vx, P.vy, P.vz), cls: P.cls, paint: P.paint, m: s.m });
}
setInterval(sendState, 100);
export function netUpdate(dt: number) {
  if (NET.status !== 'online') return;
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
