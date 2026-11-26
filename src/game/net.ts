import * as THREE from 'three';
import { scene } from '../core/engine';
import { P, G, settings, saveGame, saveHooks, setSaveSlot, rawSave, writeRawSave, localSave } from './state';
import { world, makeAst, removeAst, breakAst, astHooks, type Asteroid } from './world';
import { crumble, blastAst, MINE } from './mining';
import { burst, flash } from './fx';
import { boltStyle } from './bolts';
import { spawnEnemy, killEnemy, rewardKill, fireBullet, remoteTorp } from './combat';
import { npcSnapshot, applyNpc, npcResync, npcBecameHost } from './npc';
import { SHARED } from './shared';
import type { ItemId, RockKind } from '../data/items';
import { SHIP } from './player';
import { ROVER, buildRover } from './surface';
import { buildFahrzeug, fzLaden, fzBereit, normFz, FZ, type FzId, type RoverNeu } from '../models/rover';
import { IN, syncOtherPilots, bordWelt, enterShip, interiorHooks, walkFree, folgeGast } from './interior';
import { turmFremd, GUN, schuetzeAus } from './turm';
import { hasMeshRoom, meshRoomReady, loadMeshRoom } from './meshRoom';
import { viewModelId } from './mineArt';
import { FOOT, footTargets, footOff } from './onfoot';
import { DUN, syncMinePilots } from './dungeon';
import { newRemoteFig, driveRemote, dropRemote, gearFromNet, readNetFlags, netFlags, lookToNet, type RemoteFig } from './avatar';
import { coopNet, coopReceive, onCoop, coopSend, pack } from './coop';
import { Fahrer } from './fahrer';
import { koerper, koerperWeg } from './koerper';
import { setFieldMates } from './fieldfight';
import { buildShipModel, type ShipModel } from '../models/playerShips';
import { SHIPS, hasInterior, type ShipId } from '../data/ships';
import { setGear, setDoors, setKanzel, setTurm, RAMP_ENTRY, type Paint } from '../models/gltfShips';
import { LEITER, leiterSetzen } from './ausstieg';
import { radio, radioVerlauf } from '../ui/radio';
import { kistenAnNeue } from './kisten';
import { EVA } from './eva';
import { quartierHooks, einladungAn, dekoAusNetz, ortKennung, nrText } from './quartier';

// =====================================================================================
// Mehrspieler (Client): Verbindung zum Server, eigenen Stand senden (10× pro Sekunde),
// andere Piloten im selben Raum (Sektor oder Planetenoberfläche) darstellen, Chat.
// =====================================================================================
export const NET = {
  ws: null as WebSocket | null, status: 'aus' as 'aus' | 'verbinde' | 'online' | 'fehler', id: 0, url: '', err: '',
  roster: [] as { id: number; name: string; room: string }[],
  account: null as string | null, authErr: '', authOk: '', savedAt: 0, tempStore: false,      // authOk: Bestätigung nach dem Anlegen eines Kontos
};
export const netHooks = { changed: () => {}, trade: (_m: any) => {}, lost: () => {}, chat: (_name: string, _text: string, _mine: boolean) => {} };      // chat: eigene Anzeige in ui/mp.ts   // Status oder Online-Liste geändert (Menüs neu zeichnen)
export interface Remote {
  id: number; name: string; cls: string; paint: string; m: string; s: number; w: any[] | null; d: string; g: string[] | null;   // g: Aussehen zu Fuß [Helm, Anzug, Rucksack, Waffe]   // d: Station, an der er angedockt ist   // w: zu Fuß in einer Station [Station, x, z, Blick]
  ship: ShipModel | null; rover: THREE.Group | null;
  rv?: RoverNeu | null; rk?: string; vv?: (string | number)[] | null; fahrer?: Fahrer;      // fahrer: Sitzfigur im Wiesel (seit 2026-11-25)      // Bodenfahrzeug aus Blender (Art, Lage, Tempo, Lenkung; seit 2026-11-24)
  ls?: number[] | null; dy?: number;      // gelandetes Schiff [x, y, z, Kurs, pitch, roll] (seit 2026-11-25, Neigung seit 2026-11-26); dy: Unterschied der Bodenhöhe hier gegenüber dem Absender
  z?: number | null; leiter?: { g: THREE.Group | null };      // bewegliche Teile (Bits 1 Fahrwerk, 2 Rampe, 4 Kanzel, 8 Leiter) und die Leiter dazu
  tv?: THREE.Vector3; tt?: number;      // geschätzte Fahrt und Zeit des letzten Stands (seit 2026-11-26: Flug zwischen den Meldungen weiterrechnen)
  tp: THREE.Vector3; tq: THREE.Quaternion; seen: number; fig?: RemoteFig;   // fig: Figur zu Fuß auf dem Planeten
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
  // schon verbunden (oder beim Verbinden) mit derselben Adresse: nichts tun (2026-11-26: mehrfaches Klicken auf „Verbinden“ trennte jedes Mal)
  if (NET.ws && url === NET.url && (NET.status === 'online' || NET.status === 'verbinde')) { netHooks.changed(); return; }
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
    NET.ws = null; NET.status = wantOnline ? 'fehler' : 'aus'; NET.roster = []; NET.account = null; coopNet.id = 0;
    clearRemotes(); leaveShared(); netHooks.lost();
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
  NET.status = 'aus'; NET.roster = []; NET.id = 0; NET.account = null; coopNet.id = 0;
  clearRemotes(); leaveShared(); netHooks.lost();
  if (!silent) netHooks.changed();
}
export const sendMsg = (m: object) => { if (NET.ws && NET.ws.readyState === 1) NET.ws.send(JSON.stringify(m)); };
coopNet.send = sendMsg;
export function sendChat(text: string) { const t = text.trim().slice(0, 200); if (t) sendMsg({ t: 'chat', text: t }); }

function onMsg(m: any) {
  if (m.t === 'welcome') {
    NET.id = m.id; NET.status = 'online'; NET.tempStore = !!m.temp; coopNet.id = m.id;
    const off = (m.now || 0) - performance.now() / 1000;
    SHARED.now = () => performance.now() / 1000 + off;
    SHARED.market = m.market || {};
    SHARED.online = true;
    // angemeldet bleiben: mit gespeichertem Token automatisch anmelden
    const tok = getToken(); if (tok) sendMsg({ t: 'login', token: tok });
    fehlerSenden();
    if (m.online > 1) radio('SYSTEM', `${m.online - 1 === 1 ? 'Ein weiterer Pilot' : `${m.online - 1} weitere Piloten`} online.`);   // allein: keine Meldung
    netHooks.changed();
  } else if (m.t === 'roster') {
    const before = new Set(NET.roster.map(r => r.id));
    NET.roster = m.list || [];
    for (const r of NET.roster) if (before.size && !before.has(r.id) && r.id !== NET.id) radio('FUNK', `${r.name} ist jetzt online.`, '#7fe0a0');
    netHooks.changed();
  } else if (m.t === 'st') {
    if (m.id === NET.id) return;
    let r = remotes.get(m.id);
    if (!r) { r = { id: m.id, name: m.name, cls: '', paint: '', m: '', s: 0, w: null, d: '', g: null, ship: null, rover: null, tp: new THREE.Vector3(), tq: new THREE.Quaternion(), seen: 0 }; remotes.set(m.id, r); kistenAnNeue(); }      // Neuer im Raum: ihm die treibenden Kisten zeigen
    r.name = m.name; r.s = m.s || 0; r.m = m.m; r.w = Array.isArray(m.w) ? m.w : null; r.d = m.d || ''; r.g = Array.isArray(m.g) ? m.g.map(String) : null;
    if (m.p?.length === 3) {
      const jetzt = performance.now(), dtm = r.tt ? (jetzt - r.tt) / 1000 : 0, tv = r.tv || (r.tv = new THREE.Vector3());
      if (dtm > 0.03 && dtm < 0.5 && m.m === 'schiff') { tv.set((m.p[0] - r.tp.x) / dtm, (m.p[1] - r.tp.y) / dtm, (m.p[2] - r.tp.z) / dtm); if (tv.length() > 450) tv.set(0, 0, 0); } else tv.set(0, 0, 0);
      r.tt = jetzt; r.tp.set(m.p[0], m.p[1], m.p[2]);
    }
    if (m.q?.length === 4) r.tq.set(m.q[0], m.q[1], m.q[2], m.q[3]).normalize();
    const cls = SHIPS[m.cls as ShipId] ? m.cls : 'milan';      // ältere Fassungen (Venom) und Unbekanntes: das Startschiff
    if (!r.ship || r.cls !== cls || r.paint !== m.paint) {
      if (r.ship) disposeObj(r.ship.g);
      r.cls = cls; r.paint = m.paint;
      r.ship = buildShipModel(cls as ShipId, (m.paint || 'Orange') as Paint);
      (r.ship.shield.material as THREE.MeshBasicMaterial).opacity = 0;
      r.ship.g.position.copy(r.tp); r.ship.g.quaternion.copy(r.tq);
      scene.add(r.ship.g);
    }
    r.vv = Array.isArray(m.v) && m.v.length === 10 ? m.v : null;
    // Gelandetes Schiff; fünfter Wert (seit 2026-11-25): Bodenhöhe unter der Mitte beim Absender. Hat dieser ein anderes Gelände (altes Gelände
    // mit ?gelaende=alt gespeichert), steht das Schiff hier um den Unterschied verschoben auf dem eigenen Boden statt in der Luft oder darin.
    const ls = Array.isArray(m.ls) && m.ls.length >= 4 ? m.ls.map(Number) : null;
    r.dy = ls && ls.length >= 5 && world.surface && world.ground && Number.isFinite(ls[4]) ? world.ground(ls[0], ls[2]) - ls[4] : 0;
    r.ls = ls ? [ls[0], ls[1] + r.dy, ls[2], ls[3], ls.length >= 7 ? ls[5] * Math.PI / 180 : 0, ls.length >= 7 ? ls[6] * Math.PI / 180 : 0] : null;      // [x, y, z, Kurs, pitch, roll]
    r.z = typeof m.z === 'number' ? m.z : null;
    if (r.m === 'rover' && !r.rover && !r.vv) { r.rover = buildRover('dachs').g; r.rover.position.copy(r.tp); scene.add(r.rover); }      // ältere Fassung ohne Fahrzeugdaten
    r.seen = performance.now();
  } else if (m.t === 'leave') {
    removeRemote(m.id);
  } else if (m.t === 'host') {
    hostId = m.id; updateRole();
  } else if (m.t === 'w') {
    applyWorld(m.l || []);
  } else if (m.t === 'a') {
    applyAction(m);
  } else if (m.t === 'auth') {
    onAuth(m);
  } else if (m.t === 'saved') {
    NET.savedAt = m.at || Date.now(); netHooks.changed();
  } else if (m.t === 'f') {
    applyFoes(m);
  } else if (m.t === 'fk') {
    if (m.by === NET.id && m.p?.length === 3) rewardKill(m.type, m.p[0], m.p[1], m.p[2]);
  } else if (m.t === 'mkt') {
    (SHARED.market[m.st] = SHARED.market[m.st] || {})[m.k] = { s: m.s, t: m.at };
  } else if (m.t === 'tr') {
    netHooks.trade(m);
  } else if (m.t === 'co') {
    coopReceive(m);
  } else if (m.t === 'chat') {
    // Chat (seit 2026-11-26): eigene Anzeige links oben, immer sichtbar (der Funkkasten liegt im Flug-HUD und war zu Fuß, an Bord und in Stationen aus)
    netHooks.chat(String(m.name || ''), String(m.text || ''), m.id === NET.id);
    radioVerlauf(m.name, m.text, m.id === NET.id ? '#ffb347' : '#7fe0a0');
  } else if (m.t === 'qi') {
    // Einladung ins Quartier eines anderen Piloten (game/quartier.ts)
    const name = String(m.name || ''), d = dekoAusNetz(m.deko, name);
    if (name && d) { einladungAn(name, +m.from || 0, d); radio(name, `Komm vorbei: Quartier ${nrText(d.nr)}. Der Aufzug „Quartiere“ auf Deck 3 bringt dich hin.`, '#ffb35a'); }
  }
}
// Quartier: andere Piloten auf der Bastion einladen
quartierHooks.piloten = () => pilotsHere().map(r => ({ id: r.id, name: r.name }));
quartierHooks.einladen = (id, deko) => { if (NET.status !== 'online') return false; sendMsg({ t: 'qi', to: id, deko }); return true; };
function disposeObj(o: THREE.Object3D) { scene.remove(o); o.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose(); }); }
function removeRemote(id: number) { const r = remotes.get(id); if (!r) return; koerper('rs' + id, null); koerper('rv' + id, null); r.leiter?.g?.removeFromParent(); r.fahrer?.frei(); if (r.fig) dropRemote(r.fig); if (r.ship) disposeObj(r.ship.g); if (r.rover) disposeObj(r.rover); remotes.delete(id); }
function clearRemotes() { for (const id of [...remotes.keys()]) removeRemote(id); syncOtherPilots([]); koerperWeg('rs'); koerperWeg('rv'); }

// Was gerade sichtbar ist: Schiff, Rover oder nichts (zu Fuß in der Station, angedockt)
// Station, an der man gerade ist (angedockt, zu Fuß oder im eigenen Schiff im Hangar)
export function myStation(): string { return (G.dockedAt && G.dockedAt.id) || (IN.active && IN.station ? IN.station.id : '') || ''; }
// andere Piloten in derselben Station
export function pilotsHere() { const st = myStation(); return st ? [...remotes.values()].filter(r => r.d === st) : []; }
const footObj = new THREE.Object3D(), _vor = new THREE.Vector3();
function myState() {
  if (EVA.active && !world.surface) return { o: SHIP.g, m: 'eva' };      // Außenbord: Schiff steht, die Figur schwebt (Lage im Feld w)
  if (DUN.active) { footObj.position.set(DUN.x, 0, DUN.z); footObj.rotation.set(0, DUN.yaw, 0); footObj.updateMatrix(); return { o: footObj, m: 'mine' }; }
  if (FOOT.active && !IN.active) { footObj.position.set(FOOT.x, FOOT.y, FOOT.z);   // zu Fuß (aus dem Rover oder direkt aus dem Schiff)
    footObj.rotation.set(0, FOOT.yaw, 0); footObj.updateMatrix(); return { o: footObj, m: 'fuss' }; }
  // an Bord des eigenen Schiffs (seit 2026-11-25): im Flug fliegt es weiter (Autopilot), gelandet steht es da – für die anderen bleibt es sichtbar
  if (IN.active && IN.ship?.ctx === 'flug') return { o: SHIP.g, m: 'schiff' };
  if (IN.active && IN.ship?.ctx === 'planet') return { o: SHIP.g, m: 'bord' };
  if (IN.active || G.dockedAt) return { o: SHIP.g, m: 'innen' };
  if (ROVER.active && ROVER.model) return { o: ROVER.model.g, m: 'rover' };
  if (ROVER.active && world.surface) return { o: SHIP.g, m: 'bord' };      // gelandet ohne Fahrzeug und nicht zu Fuß: Schiff steht, Pilot unsichtbar
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
  if (key !== room) { room = key; clearRemotes(); hostId = 0; synced = false; foesSynced = false; npcResync(); updateRole(); sendMsg({ t: 'room', room }); }
  flushYld();
  // im Flug die Flugposition (das Modell wird nur beim Zeichnen nachgeführt), sonst die Lage des Modells
  const s = myState(), p = s.m === 'schiff' || s.m === 'eva' ? P : s.o.position, q = s.o.quaternion;
  // zu Fuß in einer Station (nicht im eigenen Schiff): Position im Stationsraum mitschicken
  const bw = s.m === 'bord' && !IN.mitflug ? bordWelt() : null;      // an Bord eines gelandeten Schiffs (eigenes oder als Gast): Lage in der Welt
  const w = bw ? ['bw', ...pack(bw.x, bw.y, bw.z, bw.yaw)] : s.m === 'eva' ? ['eva', EVA.x, EVA.y, EVA.z, EVA.yaw] : DUN.active && DUN.e ? [DUN.e.id, DUN.x, DUN.z, DUN.yaw] : IN.active && IN.station && !IN.ship ? [ortKennung(IN.station.id), IN.x, IN.z, IN.yaw, IN.fy + IN.jy] : null;      // Station: fünfter Eintrag = Höhe (Rampen, Sprung)
  // Bodenfahrzeug: Art, Tempo, Lenkung, Lage und Drehung des Modells (auch wenn der Pilot daneben zu Fuß ist)
  const rm = world.surface && ROVER.active && ROVER.model ? ROVER.model.g : null;
  const v = rm ? [ROVER.kind, ROVER.speed, ROVER.steer, rm.position.x, rm.position.y, rm.position.z, rm.quaternion.x, rm.quaternion.y, rm.quaternion.z, rm.quaternion.w] : undefined;
  // Lage des gelandeten Schiffs: zu Fuß, im Fahrzeug, an Bord oder in der Mine auf dem Planeten
  const ls = world.surface && (ROVER.active || DUN.active || s.m === 'bord' || s.m === 'fuss') ? [ROVER.ship.x, ROVER.ship.y, ROVER.ship.z, ROVER.ship.yaw, world.ground ? world.ground(ROVER.ship.x, ROVER.ship.z) : ROVER.ship.y, (ROVER.ship.pitch || 0) * 180 / Math.PI, (ROVER.ship.roll || 0) * 180 / Math.PI] : undefined;      // 6./7.: Neigung in Grad (seit 2026-11-26; der Server rundet auf 0,01)
  const gr = P.gear || {}, g = [gr.helm || '', gr.anzug || '', gr.rucksack || '', viewModelId(gr.waffe), netFlags(), lookToNet(), String(P.figur ?? 1), gr.weste || '', gr.handschuh || '', gr.stiefel || ''];
  sendMsg({ t: 'st', p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w], s: Math.hypot(P.vx, P.vy, P.vz), cls: P.cls, paint: P.paint, m: s.m, w, d: myStation(), g, v, ls, z: schiffsTeile() });
}
// Bewegliche Teile des eigenen Schiffs, wie main.ts sie gerade stellt (gltfShips.ts merkt sich den Wunsch, ausstieg.ts die Leiter)
function schiffsTeile() { const u = SHIP.g.userData; return (u.zGear ? 1 : 0) | (u.zDoors ? 2 : 0) | (u.zKanzel ? 4 : 0) | (LEITER.an ? 8 : 0); }
setInterval(sendState, 100);
export function netUpdate(dt: number) {
  if (NET.status !== 'online') return;
  SHARED.pilots = [...remotes.values()].filter(r => r.m === 'schiff' && r.ship).map(r => ({ id: r.id, x: r.ship!.g.position.x, y: r.ship!.g.position.y, z: r.ship!.g.position.z, vx: 0, vy: 0, vz: 0 }));
  if (SHARED.client) moveFoes(dt);
  // andere Piloten zu Fuß in derselben Station
  syncOtherPilots([...remotes.values()].filter(r => r.m === 'innen' && r.w).map(r => ({ id: r.id, name: r.name, st: String(r.w![0]), x: +r.w![1], z: +r.w![2], yaw: +r.w![3], y: +(r.w![4] || 0), g: r.g })));
  // andere Piloten in derselben Mine
  syncMinePilots([...remotes.values()].filter(r => r.m === 'mine' && r.w).map(r => ({ id: r.id, name: r.name, e: String(r.w![0]), x: +r.w![1], z: +r.w![2], yaw: +r.w![3], g: r.g })), dt);
  // Mitspieler zu Fuß oder im Rover auf demselben Planeten (Koop gegen die Felddrohnen)
  setFieldMates([...remotes.values()].filter(r => r.m === 'fuss' || r.m === 'rover').map(r => {
    const o = r.m === 'fuss' && r.fig?.init ? { x: r.fig.x, y: r.fig.y, z: r.fig.z } : { x: r.tp.x, y: r.tp.y, z: r.tp.z };
    return { id: r.id, ...o, foot: r.m === 'fuss' };
  }));
  // andere Piloten weich nachführen
  const k = Math.min(1, dt * 8), now = performance.now();
  for (const r of [...remotes.values()]) {
    if (now - r.seen > 6000) { removeRemote(r.id); continue; }   // lange nichts gehört
    const ship = r.ship!, onShip = r.m === 'schiff' || r.m === 'eva', boden = r.m === 'fuss' || r.m === 'rover' || r.m === 'mine' || r.m === 'bord';
    ship.g.visible = onShip || boden;   // am Boden steht das Schiff gelandet da (Lage aus ls, ältere Fassungen: letzter Stand im Flug)
    if (onShip) { ship.g.position.lerp(r.tv && r.tt ? _vor.copy(r.tp).addScaledVector(r.tv, Math.min(0.25, (now - r.tt) / 1000)) : r.tp, k); ship.g.quaternion.slerp(r.tq, k); }
    const tf = turmFremd.get(r.id); if (tf && GUN.gast !== r.id) { if (now - tf.t > 4000) turmFremd.delete(r.id); setTurm(ship.g, tf.y, tf.p); }      // Rückenturm der Mitspieler (turm.ts)
    else if (boden && r.ls) { ship.g.position.set(r.ls[0], r.ls[1], r.ls[2]); ship.g.rotation.order = 'YXZ'; ship.g.rotation.set(r.ls[4] || 0, r.ls[3], r.ls[5] || 0); }
    // bewegliche Teile: wie beim Piloten selbst (z), ältere Fassungen ohne z: am Boden Fahrwerk aus und Rampe offen
    const z = r.z ?? ((boden ? 3 : 0) | (r.m === 'eva' ? 2 : 0));
    // fest zu Fuß (koerper.ts): gelandetes Schiff mit seiner Form, Fahrzeug als Kreis
    koerper('rs' + r.id, world.surface && boden && r.ls ? { art: 'schiff', cls: r.cls, lage: { x: r.ls[0], y: r.ls[1], z: r.ls[2], yaw: r.ls[3], pitch: r.ls[4] || 0, roll: r.ls[5] || 0 }, rampe: !!(z & 2) } : null);
    koerper('rv' + r.id, world.surface && r.rover && r.rover.visible ? { art: 'kreis', x: r.rover.position.x, z: r.rover.position.z, r: 2.3 } : null);
    setGear(ship.g, !!(z & 1), dt); setDoors(ship.g, !!(z & 2), dt); setKanzel(ship.g, !!(z & 4), dt);
    leiterSetzen(r.leiter || (r.leiter = { g: null }), !!(z & 8) && boden && !!r.ls, r.ls ? { x: r.ls[0], y: r.ls[1], z: r.ls[2], yaw: r.ls[3], pitch: r.ls[4] || 0, roll: r.ls[5] || 0 } : undefined, ship.g);
    for (const gl of ship.glows) { gl.visible = r.m === 'schiff'; gl.scale.setScalar((gl.userData.base || 1) * (0.5 + Math.min(1, r.s / 200) * 1.3)); }      // Triebwerke nur im Flug
    if (r.vv) driveRemoteRover(r, dt, k);
    else if (r.rover) { r.rover.visible = r.m === 'rover' || r.m === 'fuss'; if (r.m === 'rover') { r.rover.position.lerp(r.tp, k); r.rover.quaternion.slerp(r.tq, k); } }
    // zu Fuß auf dem Planeten: Soldat mit Laufclips; an Bord eines gelandeten Schiffs (bw): dieselbe Figur im Schiff
    const eva = r.m === 'eva' && !!r.w && r.w.length >= 5, bw = r.m === 'bord' && r.w?.[0] === 'bw' && r.w.length >= 5;
    if (r.m === 'fuss' || eva || bw) {
      const f = r.fig || (r.fig = newRemoteFig()), ng = gearFromNet(r.g);
      f.gear = ng.gear; f.wid = ng.wid; f.tracht = ng.tracht; readNetFlags(f, r.g?.[4]);
      if (bw) { f.ohneWaffe = false; f.air = false; f.tx = +r.w![1]; f.ty = +r.w![2] + (r.dy || 0); f.tz = +r.w![3]; f.yaw = +r.w![4]; }
      else if (eva) { f.tx = +r.w![1]; f.ty = +r.w![2] - 1; f.tz = +r.w![3]; f.yaw = +r.w![4]; f.air = true; f.fire = 0; f.ohneWaffe = true; }      // Außenbord: schwebt (Haltung wie im Sprung), Füße einen Meter unter der Mitte
      else { f.ohneWaffe = false; f.tx = r.tp.x; f.ty = r.tp.y; f.tz = r.tp.z; f.yaw = new THREE.Euler().setFromQuaternion(r.tq, 'YXZ').y; }
      driveRemote(scene, f, dt);
    } else if (r.fig) dropRemote(r.fig);
  }
  gastZiele();
}
// =====================================================================================
// Zu Gast an Bord (seit 2026-11-25): An der offenen Rampe eines gelandeten Kormoran oder Wisent eines Mitspielers steht ein Ziel [E].
// Man betritt den Innenraum aus dem Modell (deckungsgleich im fremden Schiff), läuft herum, sieht den Besitzer, und geht über die Luke
// wieder hinaus. Hebt der Besitzer ab oder geht er offline, steht man draußen.
// =====================================================================================
let gastLs: number[] | null = null, gastCls = '';
const zuWelt = (ls: number[], lx: number, lz: number) => { const c = Math.cos(ls[3]), s = Math.sin(ls[3]); return { x: ls[0] + lx * c + lz * s, z: ls[2] - lx * s + lz * c }; };
function gastEingang(cls: string, ls: number[]) {      // Fuß der Heckrampe (Wisent), sonst hinter dem Schiff
  const e = RAMP_ENTRY[SHIPS[cls as ShipId]?.model || ''], len = SHIPS[cls as ShipId]?.len || 30;
  return e ? { ...zuWelt(ls, 0, e.foot + 1.2), r: e.hw + 2.5, aus: e.foot + 3.5 } : { ...zuWelt(ls, 0, len * 0.5 + 2), r: 6, aus: len * 0.5 + 4 };
}
function gastZiele() {
  for (let i = footTargets.length - 1; i >= 0; i--) if ((footTargets[i] as any).gast) footTargets.splice(i, 1);
  if (IN.active && IN.ship?.gast) {
    // Mitflug (seit 2026-11-26): Hebt der Besitzer ab, bleibt der Gast an Bord und fliegt mit; der Innenraum folgt dem fliegenden Schiff.
    // Hinaus geht es erst, wenn das Schiff aus diesem Raum verschwindet (Orbit, Sprung, offline) oder andockt.
    const r = remotes.get(IN.ship.gast), boden = !!r && (r.m === 'fuss' || r.m === 'rover' || r.m === 'mine' || r.m === 'bord'), flug = !!r && (r.m === 'schiff' || r.m === 'eva');
    if (!r || !r.ship || !(flug || (boden && r.ls))) {
      if (GUN.aktiv) schuetzeAus();
      IN.mitflug = false; interiorHooks.gastRaus();
      radio('SYSTEM', r ? 'Das Schiff hat angedockt. Du stehst wieder am letzten Landeplatz.' : 'Das Schiff ist fort (Orbit, Sprung oder offline). Du stehst wieder am letzten Landeplatz.');
      return;
    }
    if (boden && r.ls) gastLs = [...r.ls];      // nach dem Mitflug woanders gelandet: dort steigt man aus
    if (flug !== IN.mitflug) { IN.mitflug = flug; radio(r.name, flug ? 'Wir heben ab. Halt dich fest.' : 'Gelandet.', '#7fe0a0'); }
    folgeGast();
    return;
  }
  if (!world.surface || !FOOT.active) return;
  for (const r of remotes.values()) {
    if (!r.ls || !r.ship || !(r.m === 'fuss' || r.m === 'rover' || r.m === 'mine' || r.m === 'bord')) continue;
    if (!hasInterior(r.cls) || !hasMeshRoom(r.cls) || !((r.z ?? 2) & 2)) continue;      // Innenraum aus dem Modell, Rampe offen
    const e = gastEingang(r.cls, r.ls), ls = r.ls, rr = r;
    footTargets.push(Object.assign({ x: e.x, z: e.z, r: e.r, label: `An Bord der ${SHIPS[r.cls as ShipId].n} von ${r.name} gehen`, act: () => gastRein(rr, ls) }, { gast: true }));
  }
}
function gastRein(r: Remote, ls: number[]) {
  if (!r.ship) return;
  if (!meshRoomReady(r.cls)) { radio('SYSTEM', 'Der Innenraum wird geladen …'); void loadMeshRoom(r.cls); return; }
  gastLs = [...ls]; gastCls = r.cls;
  footOff(); ROVER.active = false; document.getElementById('hud')?.classList.add('hidden');
  enterShip({ cls: r.cls, uid: -r.id, name: `${SHIPS[r.cls as ShipId].n} von ${r.name}`, ctx: 'planet', gast: r.id }, r.ship);
  if (IN.ship?.gast) for (const d of [1.6, -1.6, 2.4, -2.4]) if (walkFree(IN.x + d, IN.z)) { IN.x += d; break; }      // nicht im Besitzer (gleicher Startpunkt) beginnen
  radio(r.name, 'Willkommen an Bord.', '#7fe0a0');
  IN.mitflug = false; coopSend('gb', { s: r.id, an: 1, n: P.name });
}
/** Modell und Fahrt des Schiffs, auf dem man zu Gast ist (main.ts: Schützenplatz) */
export const gastSchiff = (id: number) => remotes.get(id)?.ship || null;
export const gastFahrt = (id: number) => remotes.get(id)?.tv || null;
// Gäste an Bord des eigenen Schiffs (Meldung der Gäste beim Ein- und Aussteigen): Hinweis für den Piloten
export const GAESTE = new Map<number, string>();
onCoop('gb', (m: any) => {
  if (+m.s !== NET.id) return;
  if (m.an) { GAESTE.set(m.from, String(m.n || 'Ein Pilot')); radio('BORDRECHNER', `${GAESTE.get(m.from)} ist an Bord gekommen.`, '#7fe0a0'); }
  else if (GAESTE.delete(m.from)) radio('BORDRECHNER', `${String(m.n || 'Der Gast')} ist von Bord.`, '#8fd3ff');
});
let gastWarnT = 0;
/** jedes Bild im Flug über dem Planeten (main.ts): mit Gästen an Bord vor der Wolkendecke warnen (dort endet der Raum, der Gast stiege aus) */
export function gastWarnung(dt: number, hoehe: number, decke: number) {
  for (const id of [...GAESTE.keys()]) if (!remotes.has(id)) GAESTE.delete(id);
  gastWarnT -= dt;
  if (GAESTE.size && hoehe > decke * 0.8 && gastWarnT <= 0) { gastWarnT = 20; radio('BORDRECHNER', `${[...GAESTE.values()].join(', ')} an Bord: Über der Wolkendecke endet der Mitflug, dein Gast steht dann wieder am letzten Landeplatz.`, '#ffb347'); }
}
/** wohin man als Gast hinausgeht (main.ts, interiorHooks.gastRaus): ans Ende der Rampe, Blick vom Schiff weg */
export function gastAusstieg() {
  if (IN.ship?.gast) coopSend('gb', { s: IN.ship.gast, an: 0, n: P.name });
  IN.mitflug = false;
  const ls = gastLs; gastLs = null; if (!ls) return null;
  const e = gastEingang(gastCls, ls), p = zuWelt(ls, 0, e.aus);
  return { x: p.x, z: p.z, yaw: ls[3] + Math.PI };
}
// Bodenfahrzeug eines Mitspielers: das richtige Modell (Dachs oder Wiesel), weich nachgeführt, Räder drehen und lenken, Sensor dreht.
// Solange das Modell lädt, steht nichts da (es kommt mit dem Hintergrund-Paket).
const _rp = new THREE.Vector3(), _rq = new THREE.Quaternion(), _hub = new THREE.Vector3();
function driveRemoteRover(r: Remote, dt: number, k: number) {
  const vv = r.vv!, kind = normFz(vv[0]) as FzId;
  if (!r.rv || r.rk !== kind) {
    if (!fzBereit(kind)) { fzLaden(kind); return; }
    if (r.rover) disposeObj(r.rover);
    r.rv = buildFahrzeug(kind); r.rk = kind; if (!r.rv) return;
    r.rover = r.rv.g; r.rover.position.set(+vv[3], +vv[4], +vv[5]); r.rover.quaternion.set(+vv[6], +vv[7], +vv[8], +vv[9]); scene.add(r.rover);
  }
  const m = r.rv!, g = m.g, F = FZ[kind], spd = +vv[1] || 0, steer = +vv[2] || 0;
  g.visible = true;
  _rp.set(+vv[3], +vv[4], +vv[5]); _rq.set(+vv[6], +vv[7], +vv[8], +vv[9]).normalize();
  if (g.position.distanceTo(_rp) > 40) g.position.copy(_rp); else g.position.lerp(_rp, k);
  g.quaternion.slerp(_rq, k); g.updateMatrixWorld(true);
  for (const w of m.rads) {
    _hub.copy(w.rest).applyMatrix4(g.matrixWorld);
    const gy = world.ground ? world.ground(_hub.x, _hub.z) : _hub.y - F.radR;
    const want = Math.max(F.susp[0], Math.min(F.susp[1], gy + F.radR - _hub.y));
    w.mount.position.set(w.rest.x, w.rest.y + want, w.rest.z); w.mount.rotation.y = w.front ? steer : 0;
    w.spin.rotation.x -= spd * dt / F.radR;
  }
  if (m.sensor) m.sensor.rotation.y += 2.2 * dt;
  // Fahrer im offenen Wiesel: Sitzfigur mit seiner Tracht, solange er fährt (im Dachs sitzt er in der geschlossenen Kabine)
  if (r.m === 'rover' && m.seat) (r.fahrer || (r.fahrer = new Fahrer(() => gearFromNet(r.g).tracht))).update(m, dt);
  else r.fahrer?.zeigen(false);
  (m.beacon.material as THREE.SpriteMaterial).opacity = Math.sin(performance.now() / 160) > 0 ? 1 : 0.2;
}
// Für Anzeigen: wo sind die anderen gerade sichtbar?
export function remoteMarkers() {
  const out: { name: string; x: number; y: number; z: number; m: string }[] = [];
  for (const r of remotes.values()) {
    if ((r.m === 'fuss' || r.m === 'eva' || r.m === 'bord') && r.fig?.av) { out.push({ name: r.name, x: r.fig.x, y: r.fig.y + 1.6, z: r.fig.z, m: r.m }); continue; }
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
function leaveShared() { SHARED.pshots.length = 0; SHARED.online = false; SHARED.client = false; SHARED.pilots = []; SHARED.shots.length = 0; SHARED.ev.length = 0; SHARED.ashots.length = 0; hostId = 0; synced = false; foesSynced = false; npcResync(); }
function updateRole() {
  const was = SHARED.client;
  SHARED.client = NET.status === 'online' && !!room && hostId !== 0 && hostId !== NET.id;
  if (was && !SHARED.client) {
    // Gastgeber geworden: Kennungen fortsetzen, Felder wachsen ab jetzt hier nach
    for (const a of world.asteroids) nextAstId = Math.max(nextAstId, (a.id || 0) + 1);
    for (const e of world.enemies) nextFoeId = Math.max(nextFoeId, (e.nid || 0) + 1);
    npcBecameHost();
    // keine Funkmeldung mehr: kam nach jedem Sprung, wenn man allein im Sektor ist
  }
  if (!was && SHARED.client) { synced = false; foesSynced = false; npcResync(); }
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
// Schüsse der anderen Schiffe (seit 2026-11-25): jeder schickt seine eigenen Schüsse 10× pro Sekunde gebündelt an alle im Raum.
// Bei den anderen fliegen sie als Geschoss ohne Schaden (Art 'q'): Treffer zeigen Funken, Schaden rechnet nur der Schütze.
// =====================================================================================
setInterval(() => {
  if (!SHARED.pshots.length) return;
  const l = SHARED.pshots.splice(0);
  if (NET.status === 'online' && room && othersHere()) coopSend('ps', { r: room, l });
}, 100);
onCoop('ps', m => {
  if (m.r !== room || !world.def || !Array.isArray(m.l)) return;
  const r = remotes.get(+m.from); if (r && r.m !== 'schiff') return;
  for (const e of m.l.slice(0, 60)) {
    const [x, y, z, vx, vy, vz, life, bolt] = e; if (![x, y, z, vx, vy, vz].every(Number.isFinite)) continue;
    const sp = Math.hypot(vx, vy, vz) || 1;
    fireBullet(world.bullets, x, y, z, vx / sp, vy / sp, vz / sp, sp, Math.min(2, +life || 0.75), 0, 'q', { remote: true, bolt: String(bolt || 'p1') });
    const bs = boltStyle(String(bolt));
    if (bs.muzzle) flash(x + vx / sp * 1.5, y + vy / sp * 1.5, z + vz / sp * 1.5, '#' + bs.halo.toString(16).padStart(6, '0'), bs.muzzle, 0.05);
  }
});

// =====================================================================================
// Gemeinsame Welt: Ferrox
// Der Gastgeber steuert alle Ferrox (auch gegen andere Piloten) und schickt 10× pro Sekunde ihren Stand und
// ihre Schüsse. Mitspieler zeigen sie an, prüfen Treffer auf das eigene Schiff selbst und melden ihre Treffer.
// Kopfgeld und Beute bekommt, wer den letzten Treffer gesetzt hat.
// =====================================================================================
const FTYPES = ['drone', 'bomber', 'mother'] as const;
let foesSynced = false, nextFoeId = 1;
setInterval(() => {
  const clear = () => { SHARED.shots.length = 0; SHARED.ev.length = 0; SHARED.ashots.length = 0; };
  if (NET.status !== 'online' || SHARED.client || !room || !world.def) { clear(); return; }
  if (!othersHere()) { clear(); return; }
  const l = world.enemies.map((e: any) => {
    if (!e.nid) e.nid = nextFoeId++;
    return [e.nid, FTYPES.indexOf(e.type), r1(e.x), r1(e.y), r1(e.z), r1(e.vx), r1(e.vy), r1(e.vz), Math.ceil(e.hp), e.maxhp];
  });
  // dazu Verkehr und Patrouillen (Stand, Ereignisse, Patrouillenschüsse)
  sendMsg({ t: 'f', l, s: SHARED.shots.splice(0), n: npcSnapshot(), ev: SHARED.ev.splice(0), as: SHARED.ashots.splice(0) });
}, 100);
function applyFoes(m: any) {
  if (!SHARED.client || !world.def) return;
  applyNpc(m.n, m.ev);
  for (const [x, y, z, vx, vy, vz, life] of m.as || []) {
    const sp = Math.hypot(vx, vy, vz) || 1;
    fireBullet(world.bullets, x, y, z, vx / sp, vy / sp, vz / sp, sp, life, 0, 'w', { remote: true });
  }
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
  for (const [x, y, z, vx, vy, vz, life, dmgP, torp, tgt] of m.s || []) {
    if (torp) { const ship = world.traffic.find((o: any) => o.nid === tgt); if (ship) remoteTorp(x, y, z, vx, vy, vz, dmgP, ship); continue; }
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

// =====================================================================================
// Fehler im Browser an den Server melden (seit 2026-11-26): erscheinen im Serverlog mit Name, Fassung und Ort.
// Gleiche Meldungen werden zusammengefasst; ohne Verbindung warten höchstens 10 bis zum Verbinden.
// =====================================================================================
const fehler = new Map<string, { msg: string; wo: string; n: number; sent: number }>();
function fehlerMerken(msg: string, wo: string) {
  if (!msg || /ResizeObserver loop|^Script error\.?$/.test(msg)) return;
  const k = msg + '|' + wo, f = fehler.get(k);
  if (f) { f.n++; return; }
  if (fehler.size >= 30) return;
  fehler.set(k, { msg: msg.slice(0, 300), wo: wo.slice(0, 160), n: 1, sent: 0 });
  fehlerSenden();
}
function fehlerSenden() {
  if (NET.status !== 'online') return;
  const ver = (document.querySelector('.ver')?.textContent || '').split('·')[0].trim();
  const ort = (world.def ? world.def.id + (world.surface ? ':planet' : '') : 'menü') + ' · ' + G.mode;
  for (const f of fehler.values()) if (f.n > f.sent) { sendMsg({ t: 'err', msg: f.msg, wo: f.wo, n: f.n, ver, ort }); f.sent = f.n; }
}
const kurzWo = (stack?: string) => (stack || '').split('\n').slice(1, 3).map(l => l.trim().replace(/https?:\/\/[^/]+\//, '').replace(/^at /, '')).join(' < ');
addEventListener('error', e => fehlerMerken(String(e.message || e.error || 'Fehler'), kurzWo(e.error?.stack) || `${String(e.filename || '').split('/').pop()}:${e.lineno}`));
addEventListener('unhandledrejection', e => { const r: any = e.reason; fehlerMerken('Promise: ' + String(r?.message || r), kurzWo(r?.stack)); });
/** abgefangener Fehler (main.ts hook): trotzdem melden */
export function meldeFehler(msg: string, stack?: string) { fehlerMerken(msg, kurzWo(stack)); }
setInterval(fehlerSenden, 10000);      // Wiederholungen derselben Meldung gesammelt nachreichen

// =====================================================================================
// Pilotenkonten: Spielstand auf dem Server
// Nach der Anmeldung gilt ein eigener Speicherplatz je Konto; jedes Speichern geht zusätzlich (gebremst) an den Server.
// Beim Anmelden gewinnt der neuere Stand (Server oder dieses Gerät), damit Offline-Fortschritt nicht verloren geht.
// =====================================================================================
const TOKEN_KEY = 'lf_token';
const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } };
const setToken = (t: string) => { try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* egal */ } };
export const authHooks = { changed: () => {} };
export function register(name: string, pass: string, takeLocal: boolean) {
  NET.authErr = '';
  const d = takeLocal ? localSave() : null;
  regWait = true;
  sendMsg({ t: 'register', name, pass, data: d && d.v === 2 ? d : null });
}
let regWait = false;
export function login(name: string, pass: string) { regWait = false; NET.authErr = ''; NET.authOk = ''; sendMsg({ t: 'login', name, pass }); }
export function logout() {
  if (NET.account) saveGame();
  sendMsg({ t: 'logout', token: getToken() });
  setToken(''); NET.account = null; setSaveSlot(null);
  authHooks.changed(); netHooks.changed();
}
function onAuth(m: any) {
  if (!m.ok) {
    regWait = false;
    if (m.out) { NET.account = null; if (G.mode === 'menu') setSaveSlot(null); }
    if (m.err) { NET.authErr = m.err; if (/abgelaufen/.test(m.err)) setToken(''); if (m.out) radio('SYSTEM', m.err); }
    authHooks.changed(); netHooks.changed();
    return;
  }
  NET.account = m.name; NET.authErr = '';
  NET.authOk = regWait ? `Konto „${m.name}“ angelegt. Du bist angemeldet und verbunden.` : ''; regWait = false;
  if (m.token) setToken(m.token);
  setSaveSlot(m.name);
  const local = rawSave(), server = m.data;
  if (G.mode !== 'menu' && P.name) {
    // mitten im Spiel neu verbunden: aktuellen Stand hochladen
    pushSave(true);
  } else if (server && (!local || (server.savedAt || 0) >= (local.savedAt || 0))) {
    writeRawSave(server);
  } else if (local) {
    pushRaw(local);   // dieses Gerät ist neuer
  }
  radio('SYSTEM', `Angemeldet als ${m.name}. Dein Spielstand wird auf dem Server gesichert.`);
  authHooks.changed(); netHooks.changed();
}
let pushT = 0, pushTimer = 0;
function pushRaw(d: any) { if (NET.account && d) sendMsg({ t: 'save', data: d }); }
export function pushSave(now = false) {
  if (!NET.account || !P.name) return;
  const wait = now ? 0 : Math.max(0, 5000 - (Date.now() - pushT));
  clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => { pushT = Date.now(); pushRaw(JSON.parse(JSON.stringify(P))); }, wait);
}
saveHooks.saved = () => pushSave();
// alle 30 s im Spiel sichern, damit auch lange Flüge auf dem Server landen
setInterval(() => { if (NET.account && G.mode !== 'menu' && P.name) saveGame(); }, 30000);
addEventListener('beforeunload', () => { if (NET.account && G.mode !== 'menu' && P.name) { P.savedAt = Date.now(); pushRaw(P); } });
