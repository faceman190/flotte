import './core/boot';   // zuerst: Spieldaten laden (Ladebalken), alles Weitere wartet darauf
import * as THREE from 'three';
import { camera, render, scene, aimShadows, markShadows, gl } from './core/engine';
import { updateSky, sunDir, sky } from './core/sky';
import { updateAmbience, drawFlare, resetAmbienceCamera } from './core/ambience';
import { ux } from './core/engine';
import { onKey, centerMouse, releaseAll, keys, look } from './core/input';
import { ambience, preloadSfx, snd, laserSound, boosterSound, duckMusic, audioDebug, setMusicMode } from './core/audio';
import { rand, clamp, $ } from './core/util';
import { P, G, settings, loadSettings, saveSettings, newPlayer, setPlayer, loadGame, saveGame, stats, type Player, type Tool } from './game/state';
import { world, buildSector, stationById, gateTo, updateAsteroids } from './game/world';
import { initFerrox, updateSpawning, updateEnemies, updateProjectiles, updateStationDefense } from './game/combat';
import { initTraffic, updateTraffic, initAllies, updateAllies } from './game/npc';
import { updateMissions } from './game/missions';
import { playIntro, updateIntro, skipIntro, INTRO } from './game/intro';
import { updateStory, startPrologue, resumePrologue, skipPrologue, prologActive, sceneNext, storyHooks, noteScan } from './game/story';
import { updateChapter1 } from './game/chapter1';
import { preloadMeshRooms } from './game/meshRoom';
import { SHIP, placePlayer, updatePlayer, updatePickups, syncShip, nearDock, gateHit, hooks, fwd, setShipModel } from './game/player';
import { updateParticles, syncParticles } from './game/fx';
import { scan, updateScan, hideMiningFx, resetDrones } from './game/mining';
import { drawHUD, updatePanels, showBanner } from './ui/hud';
import { radio, clearRadio } from './ui/radio';
import { openDock, undock, dockHooks, refreshDock, showMenu, closeMenu, dockTabs } from './ui/dock';
import { IN, enterInterior, leaveInterior, updateWalk, applyWalkCamera, drawWalkHUD, interact, jump, syncParkedShip, refreshHangarShips, interiorHooks, enterShip, nearestOther } from './game/interior';
import { setDustVisible } from './core/ambience';
import type { Mode } from './game/state';
import { buildSurface, addOrbitZone, orbitExit, updateSurfaceFlight, landShip, boardShip, unloadRover, nearShip, updateRover, roverCamera, resetRoverCamera, syncLandedShip, drawRoverHUD, hideRover, ROVER, SURF } from './game/surface';
import { PLANETS, PTYPE } from './data/planets';
import { d3 } from './core/util';
import { openBand, closeBand, drawBand, bandHooks } from './ui/band';
import { updateControls } from './ui/controls';
import { netUpdate, NET, isOnline } from './game/net';
import { TRADE, requestTrade } from './game/trade';
import { openChat } from './ui/mp';
// Die Galaxiekarte ist eine App im Flottenband
const openMap = () => openBand('karte'), closeMap = closeBand;
import { menuHooks, showMainMenu, hideMainMenu, showPause, hidePause, applySettings, pauseSubOpen, closePauseSub } from './ui/menus';
import { SECTOR, FACTION } from './data/galaxy';
import { loadShipModels, setGear, type Paint } from './models/gltfShips';
import { hasInterior } from './data/ships';
import { loadStationModels } from './models/stationModels';
import { loadCharModels } from './models/charModels';
import type { Gate } from './game/world';

loadSettings();
applySettings();

const yawFromDir = (dx: number, dz: number) => Math.atan2(-dx, -dz);

// =============== Sektor betreten ===============
function enterSector(id: string, arrive: { gateFrom?: string; station?: string; orbit?: boolean }) {
  if (IN.active) leaveInterior();
  hideRover();
  P.surface = false;
  hideMiningFx();
  resetAmbienceCamera();
  buildSector(id);
  initFerrox();
  initTraffic();
  initAllies();
  addOrbitZone(id);
  const def = SECTOR[id], first = !P.visited.includes(id);
  P.sector = id;
  if (first) P.visited.push(id);
  if (arrive.orbit && world.orbit) {
    const o = orbitExit();
    placePlayer(o.x, o.y, o.z, o.yaw, 160);
  } else if (arrive.gateFrom) {
    const g = gateTo(arrive.gateFrom)!;
    placePlayer(g.x + g.nx * 150, g.y, g.z + g.nz * 150, yawFromDir(g.nx, g.nz), 180);
  } else if (arrive.station) {
    const st = stationById(arrive.station) || world.stations[0];
    if (st) placePlayer(st.launch.x, st.launch.y, st.launch.z, st.launch.yaw, 140);
    else placePlayer(0, 0, 0, 0, 0);
  } else placePlayer(P.x, P.y, P.z, P.yaw, 0);
  const fac = FACTION[def.faction];
  showBanner(def.name.toUpperCase(), `${fac.n} · Gefahr ${def.danger}/5`, fac.c);
  if (P.route === id) { P.route = null; setTimeout(() => radio('SYSTEM', 'Ziel erreicht. Route beendet.'), 1500); }
  if (first && id !== 'heimstatt') setTimeout(() => radio('SYSTEM', `Neuer Sektor erkundet: ${def.name}. Kartendaten aktualisiert.`), 2200);
  if (first && PLANETS[id]) setTimeout(() => radio('SYSTEM', `Der Planet ${PLANETS[id].name} ist landbar. Die Anflugzone ist markiert.`), 5000);
  if (def.faction === 'ferrox') setTimeout(() => radio('SYSTEM', 'Warnung: Ferrox-Gebiet. Keine Stationen, keine Hilfe. Ferrit-Kristalle sind hier viel wert.'), 3500);
  else if (def.danger >= 2 && first) setTimeout(() => radio(world.stations[0]?.name.toUpperCase() || 'SYSTEM', 'Willkommen im Grenzgebiet. Hier zahlen wir mehr, aber die Ferrox kommen oft vorbei.'), 3500);
}

// =============== Planetenoberfläche betreten ===============
function enterSurface(sector: string, at?: { x: number; y: number; z: number; yaw: number }) {
  if (IN.active) leaveInterior();
  hideRover();
  hideMiningFx();
  resetAmbienceCamera();
  const info = buildSurface(sector);
  initFerrox();
  for (const e of world.enemies) e.y = Math.max(e.y, (world.ground ? world.ground(e.x, e.z) : 0) + 220);
  initTraffic();
  initAllies();
  P.sector = sector;
  P.surface = true;
  const a = at || { ...info.arrive, yaw: Math.atan2(-(0 - info.arrive.x), -(0 - info.arrive.z)) };
  placePlayer(a.x, a.y, a.z, a.yaw, at ? 0 : 170);
  if (!at) P.pitch = -0.18;
  const pl = PLANETS[sector], T = PTYPE[pl.type];
  showBanner(pl.name.toUpperCase(), T.n, '#7cc4ff');
  setTimeout(() => radio('SYSTEM', pl.base ? `Willkommen auf ${pl.name}. Die Bodenstation ${pl.base} liegt in der Mitte des Gebiets. Lagerstätten findest du mit dem Scanner [R].` : `${pl.name}: keine Bodenstation. Lande in der Nähe einer Lagerstätte und setze den Rover aus.`), 1500);
  if (pl.danger >= 3) setTimeout(() => radio('SYSTEM', 'Warnung: Ferrox-Aktivität auf der Oberfläche.'), 4000);
}

// =============== Spiel starten / beenden ===============
// Kulisse für das Intro: Sektor ohne Spieler aufbauen
function introScene(id: string) {
  hideMiningFx();
  buildSector(id);
  initFerrox();
  initTraffic();
  initAllies();
  SHIP.g.visible = false;
}
function startGame(p: Player, fresh: boolean) {
  setMusicMode(fresh ? 'menu' : 'game');
  setPlayer(p);
  setShipModel(P.cls, (P.paint || 'Orange') as Paint, true);
  hideMainMenu();
  clearRadio();
  Object.assign(G, { mode: 'play', dead: 0, shake: 0, hitMark: 0, sinceHit: 99, thrust: 0, jumpT: 0, lockT: null, dockedAt: null, saveT: 20 });
  if (fresh) {
    // Neues Spiel: Intro, danach beginnt der Prolog zu Fuß im Hangar der Bastion
    $('hud').classList.add('hidden');
    document.body.classList.remove('playing');
    playIntro(introScene, () => {
      setMusicMode('game');
      enterSector('heimstatt', { station: 'bastion' });
      const b = stationById('bastion');
      if (b) openDock(b);
      startPrologue();
      saveGame();
    });
    return;
  } else {
    const ok = isFinite(P.x) && isFinite(P.y) && isFinite(P.z) && SECTOR[P.sector];
    if (!ok) { P.sector = P.home.sector; enterSector(P.sector, { station: P.home.station }); }
    else if (P.surface && PLANETS[P.sector]) enterSurface(P.sector, { x: P.x, y: P.y + 30, z: P.z, yaw: P.yaw });
    else enterSector(P.sector, {});
    setTimeout(() => radio('SYSTEM', `Willkommen zurück, ${P.name}.`), 1000);
    resumePrologue();
  }
  $('hud').classList.remove('hidden');
  document.body.classList.add('playing');
  centerMouse();
  snd(300, 0.6, 'sawtooth', 0.05, 500);
}
function toMenu() {
  setMusicMode('menu');
  if (IN.active) leaveInterior();
  hideRover();
  G.dockedAt = null;
  $('dock').classList.add('hidden');
  G.mode = 'menu';
  duckMusic(1);
  hidePause();
  releaseAll();
  document.body.classList.remove('playing');
  showMainMenu();
  setupMenuScene();
}
let pausedFrom: Mode = 'play';
function pause() { if (G.mode !== 'play' && G.mode !== 'walk' && G.mode !== 'rover') return; pausedFrom = G.mode; G.mode = 'pause'; releaseAll(); $('pSkip').classList.toggle('hidden', !prologActive()); showPause(); duckMusic(0.5); document.body.classList.remove('playing'); }
function resume() { hidePause(); G.mode = pausedFrom; duckMusic(1); document.body.classList.add('playing'); centerMouse(); }

$('pSkip').onclick = () => { skipPrologue(); resume(); };
storyHooks.banner = (t, s, c) => showBanner(t, s, c);
menuHooks.newGame = name => startGame(newPlayer(NET.account || name), true);   // mit Konto heißt der Pilot wie das Konto
menuHooks.continueGame = () => { const p = loadGame(); if (p) startGame(p, false); };
menuHooks.resume = resume;
menuHooks.quit = () => { saveGame(); toMenu(); };
menuHooks.openMap = openMap;
dockHooks.openMap = openMap;
dockHooks.shipChanged = () => { G.camInit = false; refreshHangarShips(); };
dockHooks.enter = st => enterInterior(st);
dockHooks.leave = leaveInterior;
interiorHooks.openTab = (t, n) => showMenu(t, n);
interiorHooks.undock = undock;
interiorHooks.openMap = openMap;
interiorHooks.pause = pause;
interiorHooks.tabs = () => (G.dockedAt ? dockTabs(G.dockedAt) : []);
interiorHooks.takeoff = () => { leaveInterior(); boardShip(); G.mode = 'play'; $('hud').classList.remove('hidden'); saveGame(); };
interiorHooks.toRover = () => { leaveInterior(); ROVER.active = true; G.mode = 'rover'; resetRoverCamera(); releaseAll(); $('hud').classList.remove('hidden'); };
bandHooks.closed = m => {
  if (m === 'pause') showPause();
  if (m === 'play' || m === 'walk' || m === 'rover') { document.body.classList.add('playing'); centerMouse(); }
  if (m === 'dock') refreshDock();
};

// =============== Tasten ===============
onKey(code => {
  // Intro und Szenen: nur überspringen bzw. weiterblättern
  if (G.mode === 'intro') { if (code === 'Escape') skipIntro(); return; }
  if (G.mode === 'scene') { if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter' || code === 'Escape') sceneNext(); return; }
  if (code === 'Escape') {
    if (G.mode === 'map') closeMap();
    else if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'rover') pause();
    else if (G.mode === 'dock' && G.inside) closeMenu();
    else if (G.mode === 'pause') { if (pauseSubOpen()) closePauseSub(); else resume(); }
    return;
  }
  if ((code === 'Enter' || code === 'NumpadEnter') && openChat()) return;
  // Flottenband: M öffnet die Karte, B/F1 die Übersicht; nochmal drücken schließt
  if (code === 'KeyM' || code === 'KeyB' || code === 'F1') {
    const app = code === 'KeyM' ? 'karte' : 'start';
    if (G.mode === 'map') closeBand();
    else if (G.mode === 'play' || G.mode === 'dock' || G.mode === 'walk' || G.mode === 'rover') openBand(app);
    return;
  }
  if (G.mode === 'play' && (code === 'Digit1' || code === 'Digit2' || code === 'Digit3' || code === 'Tab')) {
    const st = stats(), avail: Tool[] = ['guns', ...(st.laser ? ['laser' as Tool] : []), ...(st.maxCharges ? ['charge' as Tool] : [])];
    const t: Tool = code === 'Digit1' ? 'guns' : code === 'Digit2' ? 'laser' : code === 'Digit3' ? 'charge' : avail[(avail.indexOf(P.tool) + 1) % avail.length];
    if (!avail.includes(t)) { radio('SYSTEM', `Die ${st.cls.n} hat ${t === 'laser' ? 'keinen Bergbaulaser' : 'keine Sprengladungen'}.`); return; }
    if (t !== P.tool) { P.tool = t; snd(t === 'laser' ? 520 : t === 'charge' ? 300 : 380, 0.1, 'square', 0.03, 120); }
    return;
  }
  if (code === 'Digit4' && G.mode === 'play') {
    if (!stats().drones) radio('SYSTEM', 'Dieses Schiff hat keine Bergbaudrohnen.');
    else { P.dronesOn = !P.dronesOn; radio('SYSTEM', P.dronesOn ? 'Bergbaudrohnen aktiviert. Sie bauen Asteroiden in der Nähe ab.' : 'Bergbaudrohnen kehren zurück.'); }
    return;
  }
  // Handel: T öffnet eine eingegangene Anfrage oder bietet dem Piloten daneben (zu Fuß) einen Handel an
  if (code === 'KeyT' && (G.mode === 'walk' || G.mode === 'play' || G.mode === 'dock' || G.mode === 'rover')) {
    if (TRADE.ask && performance.now() - TRADE.ask.at < 90000) { openBand('handel'); return; }
    const o = G.mode === 'walk' && isOnline() ? nearestOther() : null;
    if (o) requestTrade(o.id);
    return;
  }
  if (code === 'KeyR' && G.mode === 'play') { scan(); noteScan(); return; }
  if (code === 'KeyV' && G.mode === 'play') { CAM.lock = !CAM.lock; radio('SYSTEM', CAM.lock ? 'Freie Kamera: Maus schaut um das Schiff, Pfeiltasten lenken. V beendet sie.' : 'Kamera wieder hinter dem Schiff.'); return; }
  if (G.mode === 'walk' && code === 'Tab') { showMenu(); return; }
  if (G.mode === 'walk' && code === 'Space') { jump(); return; }
  if (code === 'KeyE') {
    if (G.mode === 'walk') interact();
    else if (G.mode === 'dock' && !G.inside) undock();
    else if (G.mode === 'rover') {
      if (!nearShip()) { /* nichts */ }
      else if (settings.walk && hasInterior(P.cls)) {
        // zu Fuß an Bord: Rover bleibt neben dem Schiff stehen (kleine Flieger: direkt einsteigen)
        syncLandedShip(); ROVER.active = false; laserSound(false);
        const u = unloadRover(); if (u.moved) radio('SYSTEM', `${u.moved} Einheiten aus dem Rover in den Frachtraum verladen.`);
        $('hud').classList.add('hidden');
        enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'planet' }, SHIP);
      } else { boardShip(); G.mode = 'play'; saveGame(); }
    }
    else if (G.mode === 'play') {
      const st = nearDock();
      if (st) openDock(st);
      else if (world.surface && landShip()) { G.mode = 'rover'; resetRoverCamera(); releaseAll(); saveGame(); }
    }
  }
});

// =============== Sprung durch ein Tor ===============
function startJump(g: Gate) {
  G.mode = 'jump';
  G.jumpT = 1.3;
  G.jumpTo = g.to;
  G.jumpFrom = world.def!.id;
  releaseAll();
  snd(200, 1.4, 'sine', 0.05, 700);
  snd(80, 1.4, 'sawtooth', 0.03, 300);
}
function updateJump(dt: number) {
  G.jumpT -= dt;
  const f = fwd(), sp = 300 + (1.3 - G.jumpT) * 900;
  P.vx = f.x * sp; P.vy = f.y * sp; P.vz = f.z * sp;
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  if (G.jumpT <= 0) {
    const fl = $('flash');
    fl.style.transition = 'none'; fl.style.opacity = '1';
    requestAnimationFrame(() => { fl.style.transition = 'opacity 1.1s'; fl.style.opacity = '0'; });
    enterSector(G.jumpTo!, { gateFrom: G.jumpFrom! });
    G.mode = 'play';
    centerMouse();
    snd(90, 1.2, 'sine', 0.06, -30);
    saveGame();
  }
}

// =============== Atmosphäreneintritt / Aufstieg in den Orbit ===============
function startEntry(to: 'surface' | 'orbit') {
  G.mode = 'entry';
  G.transT = to === 'surface' ? 2.4 : 1.4;
  G.transTo = to;
  releaseAll();
  snd(to === 'surface' ? 120 : 200, G.transT, 'sawtooth', 0.04, to === 'surface' ? -40 : 400);
  if (to === 'surface') radio('SYSTEM', `Eintritt in die Atmosphäre von ${PLANETS[P.sector].name}.`);
}
function updateEntry(dt: number) {
  G.transT -= dt;
  const f = fwd(), sp = G.transTo === 'surface' ? 320 : 380;
  P.vx = f.x * sp; P.vy = f.y * sp; P.vz = f.z * sp;
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  const fl = $('flash'), total = G.transTo === 'surface' ? 2.4 : 1.4, k = 1 - Math.max(0, G.transT) / total;
  fl.style.transition = 'none';
  fl.style.background = G.transTo === 'surface' ? '#ff8a40' : '#d8ecff';
  fl.style.opacity = String(Math.min(1, k * k * 1.1));
  if (G.transTo === 'surface') G.shake = Math.min(1.4, k * 1.6);
  if (G.transT <= 0) {
    const to = G.transTo;
    if (to === 'surface') enterSurface(P.sector);
    else enterSector(P.sector, { orbit: true });
    G.mode = 'play';
    G.shake = 0;
    centerMouse();
    requestAnimationFrame(() => { fl.style.transition = 'opacity 1.3s'; fl.style.opacity = '0'; setTimeout(() => (fl.style.background = '#fff'), 1400); });
    saveGame();
  }
}

// =============== Neustart nach Abschuss ===============
hooks.respawn = () => {
  const st = stats();
  P.hull = st.maxHull; P.shield = st.maxShield; P.ammo = st.maxAmmo; P.rockets = st.maxRockets; P.charges = st.maxCharges;
  resetDrones();
  const h = SECTOR[P.home.sector]?.stations.some(s => s.id === P.home.station) ? P.home : { sector: 'heimstatt', station: 'bastion' };
  if (h.sector !== P.sector || world.surface) enterSector(h.sector, { station: h.station });
  else { const s = stationById(h.station) || world.stations[0]; placePlayer(s.launch.x, s.launch.y, s.launch.z, s.launch.yaw, 140); }
  radio('LEITSTELLE', 'Neuer Jäger startklar. Flieg vorsichtig.');
  saveGame();
};

// =============== Hauptmenü-Kulisse ===============
function setupMenuScene() {
  hideMiningFx();
  setShipModel('falke');
  buildSector('heimstatt');
  initTraffic();
  initAllies();
  SHIP.g.visible = false;
}

// =============== Kamera ===============
const camPos = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _o = new THREE.Vector3(), _t = new THREE.Vector3();
let orbit = 0.6, menuT = 0;
const MENU_ORBIT = 0.6;   // Blickwinkel im Hauptmenü: dahinter liegt der Heimstatt-Nebel (galaxy.ts, sky.rot)
function setFov(f: number) { if (Math.abs(camera.fov - f) > 0.05) { camera.fov = f; camera.updateProjectionMatrix(); } }
// Freie Kamera im Flug: C oder mittlere Maustaste halten (V = fest), die Maus dreht die Kamera um das Schiff; Mausrad = Abstand.
// Beim Loslassen schwenkt sie zurück hinter das Schiff. Der Zeiger wird solange eingefangen, damit er danach wieder dort steht, wo er war.
const CAM = { yaw: 0, pitch: 0, w: 0, zoom: 1, lock: false };
function freeCamera(dt: number) {
  const flying = G.mode === 'play' && !G.dead;
  if (!flying) CAM.lock = false;
  const want = flying && (!!keys.KeyC || look.mid || CAM.lock);
  if (want !== look.free) {
    look.free = want; look.dx = look.dy = 0;
    try {
      if (want) { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); }
      else if (document.pointerLockElement === gl && !IN.active) document.exitPointerLock();
    } catch (e) { /* ohne Einfangen geht es auch */ }
  }
  if (look.free) {
    const k = 0.0032 * settings.sens;
    CAM.yaw -= look.dx * k;
    CAM.pitch = clamp(CAM.pitch - look.dy * k * (settings.invertY ? -1 : 1), -1.45 - P.pitch, 1.45 - P.pitch);
  } else {
    const back = Math.exp(-dt * 5);   // zurück hinter das Schiff, auf dem kürzeren Weg
    CAM.yaw = Math.atan2(Math.sin(CAM.yaw), Math.cos(CAM.yaw)) * back; CAM.pitch *= back;
  }
  look.dx = look.dy = 0;
  CAM.w += ((look.free ? 1 : 0) - CAM.w) * Math.min(1, dt * 6);
  if (look.wheel && (flying || G.mode === 'entry')) { settings.camZoom = clamp((settings.camZoom || 1) * Math.pow(1.13, look.wheel), 0.4, 3.5); saveSettings(); }
  look.wheel = 0;
  CAM.zoom += ((settings.camZoom || 1) - CAM.zoom) * Math.min(1, dt * 9);
}
// Esc gibt den Zeiger frei: dann auch die feste freie Kamera beenden
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== gl && CAM.lock) CAM.lock = false; });
function updateCamera(dt: number) {
  freeCamera(dt);
  if (G.mode === 'intro') { camera.position.copy(INTRO.pos); camera.lookAt(INTRO.look); setFov(50); return; }
  if (IN.active) { applyWalkCamera(); return; }
  if (G.mode === 'rover' || (G.mode === 'pause' && ROVER.active) || (G.mode === 'map' && ROVER.active)) { roverCamera(dt); return; }
  if (G.mode === 'menu' || (G.mode === 'dock' && G.dockedAt) || (G.mode === 'map' && G.dockedAt)) {
    const c = G.mode === 'menu' ? { x: 0, y: 0, z: 0, R: 260 } : G.dockedAt;
    const R = G.mode === 'menu' ? 820 : c.R * 3.2;
    // Hauptmenü: sanft um den Blickwinkel pendeln, an dem der Nebel hinter der Szene liegt; angedockt weiter kreisen
    if (G.mode === 'menu') { menuT += dt; orbit = MENU_ORBIT + Math.sin(menuT * 0.045) * 0.45; } else orbit += dt * 0.04;
    camera.position.set(c.x + Math.cos(orbit) * R, c.y + R * 0.3, c.z + Math.sin(orbit) * R);
    _t.set(c.x, c.y, c.z);
    camera.lookAt(_t);
    if (G.mode === 'menu') { _o.set(1, 0, 0).applyQuaternion(camera.quaternion); _t.addScaledVector(_o, -R * 0.32); camera.lookAt(_t); }
    setFov(55);
    return;
  }
  _e.set(clamp(P.pitch + CAM.pitch, -1.5, 1.5), P.yaw + CAM.yaw, 0);
  const cs = stats(), cm = cs.camBack / 24;
  _o.set(0, cs.camUp * CAM.zoom, cs.camBack * CAM.zoom).applyEuler(_e);
  _t.set(P.x, P.y, P.z).add(_o);
  if (!G.camInit) { camPos.copy(_t); G.camInit = true; }
  camPos.lerp(_t, 1 - Math.exp(-dt * 7));
  camera.position.copy(camPos);
  if (G.shake > 0) camera.position.add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(G.shake));
  const f = fwd();
  // normal: Blick voraus; freie Kamera: Blick auf das Schiff
  const a = 40 * cm * (1 - CAM.w);
  camera.lookAt(P.x + f.x * a, P.y + f.y * a + cs.camUp * 0.3 * (1 - CAM.w * 0.6), P.z + f.z * a);
  const sp = Math.hypot(P.vx, P.vy, P.vz);
  setFov(settings.fov + clamp(sp / stats().max, 0, 1) * 10 + (G.mode === 'jump' ? (1.3 - G.jumpT) * 40 : 0) + (G.mode === 'entry' ? 14 : 0));
}

// Lichter, Ringe, Tore animieren
function animateStructures(dt: number) {
  const t = G.time;
  for (const s of world.stations) {
    const m = s.model;
    if (m.spin) m.spin.rotation.y += dt * 0.04;
    m.lights.forEach((l: THREE.Sprite, i: number) => { (l.material as THREE.SpriteMaterial).opacity = ((Math.floor(t * 6) - Math.floor(i / 2)) % 7 + 7) % 7 === 0 ? 1 : 0.25; });
    m.navs.forEach((n: THREE.Sprite, i: number) => { (n.material as THREE.SpriteMaterial).opacity = Math.sin(t * 3 + i) > 0.6 ? 1 : 0.15; });
  }
  for (const g of world.gates) {
    (g.model.disc.material as THREE.MeshBasicMaterial).opacity = 0.11 + Math.sin(t * 2 + g.x) * 0.05;
    g.model.core.scale.setScalar(140 + Math.sin(t * 1.5 + g.z) * 15);
    g.model.lights.forEach((l, i) => { (l.material as THREE.SpriteMaterial).opacity = ((Math.floor(t * 8) + i) % 8) < 2 ? 1 : 0.35; });
  }
  const blink = (n: THREE.Sprite) => { (n.material as THREE.SpriteMaterial).opacity = Math.sin(t * 5 + n.id) > 0.55 ? 1 : 0.12; };
  SHIP.navs.forEach(blink);
  for (const w of world.allies) if (w.alive) w.f.navs.forEach(blink);
}

// Ein Simulationsschritt der Spielwelt
function simulate(dt: number) {
  const m = G.mode, live = m === 'play' || m === 'jump' || m === 'dock' || m === 'walk' || m === 'rover' || m === 'entry';
  if (!(live || m === 'menu' || m === 'intro')) return;
  G.time += dt;
  if (live) P.playtime += dt;
  if (m === 'play') {
    updatePlayer(dt);
    updatePickups(dt);
    const g = gateHit();
    if (g) startJump(g);
    else if (world.orbit && !G.dead && d3(P.x, P.y, P.z, world.orbit.x, world.orbit.y, world.orbit.z) < 62) startEntry('surface');
    else if (world.surface && !G.dead && P.y > SURF.ceiling) startEntry('orbit');
    updateSurfaceFlight(dt);
  } else if (m === 'jump') updateJump(dt);
  else if (m === 'walk') updateWalk(dt);
  else if (m === 'entry') updateEntry(dt);
  else if (m === 'rover') { if (G.dead) updatePlayer(dt); else updateRover(dt); }
  if (live) updateMissions(dt);
  updateAsteroids(dt);
  if (m !== 'menu') { updateSpawning(dt); updateEnemies(dt); updateProjectiles(dt); updateStationDefense(dt); }
  updateTraffic(dt);
  updateAllies(dt);
  updateParticles(dt);
  if (live) updateScan(dt);
  G.shake = Math.max(0, G.shake - dt * 3);
  G.hitMark = Math.max(0, G.hitMark - dt);
  if (live) { G.saveT -= dt; if (G.saveT <= 0) { G.saveT = 20; saveGame(); } }
}

// Was die Sonne verdecken kann (für die Linsenreflexe)
function flareOccluders() {
  const c = camera.position, out: { x: number; y: number; z: number; r: number }[] = [];
  for (const a of world.asteroids) if (Math.abs(a.x - c.x) < 2500 && Math.abs(a.z - c.z) < 2500) out.push({ x: a.x, y: a.y, z: a.z, r: a.r * 0.85 });
  for (const s of world.stations) out.push({ x: s.x, y: s.y, z: s.z, r: s.R * 0.55 });
  for (const t of world.traffic) out.push({ x: t.x, y: t.y, z: t.z, r: t.R * 0.4 });
  return out;
}

// =============== Hauptschleife ===============
let last = performance.now(), shadowSweep = 0;
function loop(now: number, manual = false) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
  last = now;
  simulate(dt);
  updateIntro(dt);
  updateStory(dt);
  updateChapter1(dt);
  // Grundgeräusch zu Fuß: im Schiff ein tiefes Brummen, in der Station leiser
  ambience(IN.active && G.mode === 'walk' ? (IN.ship ? 'amb_ship' : 'amb_station') : null, IN.ship ? 0.16 : 0.09);
  if (world.def && G.mode !== 'map') {
    animateStructures(dt);
    if (IN.active) { syncParkedShip(); setGear(SHIP.g, true); }
    else if (ROVER.active) { syncLandedShip(); setGear(SHIP.g, true); }
    else {
      SHIP.g.visible = (G.mode === 'play' || G.mode === 'jump' || G.mode === 'pause' || G.mode === 'entry') && !G.dead;
      setGear(SHIP.g, G.mode === 'entry');   // im Flug eingezogen, beim Landeanflug ausgefahren
      if (SHIP.g.visible) syncShip();
    }
    setDustVisible(!IN.active);
    updateCamera(dt);
    shadowSweep -= dt;
    if (shadowSweep <= 0) { shadowSweep = 0.4; markShadows(scene, sky); }
    if (ROVER.active) aimShadows(ROVER.x, ROVER.y, ROVER.z, sunDir, 110, true);
    else if (!IN.active && G.mode !== 'menu' && G.mode !== 'intro') aimShadows(P.x, P.y, P.z, sunDir, world.surface ? 320 : 240, true);
    else aimShadows(camera.position.x, camera.position.y, camera.position.z, sunDir, 240, false);
    updateSky(camera.position);
    updateAmbience(dt);
    syncParticles();
    render();
  }
  if (G.mode !== 'play' && G.mode !== 'rover') laserSound(false);
  if (G.mode === 'rover') boosterSound(true, Math.min(1, Math.abs(ROVER.speed) / 26) * 0.45, 0.1);
  else if (G.mode === 'entry') boosterSound(true, 1, 0.6, 0.3);
  else if (G.mode === 'play' && !G.dead) boosterSound(true, G.thrust, Math.hypot(P.vx, P.vy, P.vz) / stats().max);
  else if (G.mode === 'jump') boosterSound(true, 1, 1, Math.min(1, (1.3 - G.jumpT) / 1.3));
  else boosterSound(false);
  drawHUD();
  if (world.def && G.mode !== 'map' && !IN.active) drawFlare(ux, dt, flareOccluders());
  drawWalkHUD();
  drawRoverHUD();
  if (G.mode === 'rover') $('prompt').classList.add('hidden');
  if (G.mode === 'play' || G.mode === 'jump' || G.mode === 'entry') updatePanels(dt);
  if (G.mode === 'map') drawBand();
  updateControls(dt, settings.hud);
  netUpdate(dt);
  if (!manual) requestAnimationFrame(t => loop(t));
}

// Nur im Entwicklungsmodus: Zugriff für Tests über die Browser-Konsole
if ((import.meta as any).env?.DEV) (window as any).__lf = { P, G, world, enterShip, SHIP, enterSector, startJump, openDock, undock, openMap, closeMap, gateTo, stationById, placePlayer, audioDebug, sunDir, IN, showMenu, closeMenu, interact, enterSurface, startEntry, ROVER, sim: (sec: number) => { for (let i = 0; i < sec * 60; i++) simulate(1 / 60); },
  // ganze Bilder von Hand laufen lassen (wenn der Browser die Seite im Hintergrund anhält)
  tick: (sec: number) => { for (let i = 0; i < sec * 20; i++) loop(last + 50, true); } };

// =============== Start ===============
// Schiffsmodelle laden (kurz), dann Menü zeigen. Ohne Modelle laufen die eingebauten Ersatzmodelle.
Promise.all([loadShipModels().catch(() => false), loadStationModels().catch(() => false), loadCharModels().catch(() => false)]).then(() => {
  setTimeout(preloadMeshRooms, 3000);
  setTimeout(preloadSfx, 1500);   // Schritte, Klicks, Türen   // begehbare Innenräume aus Modellen im Hintergrund vorladen
  setShipModel('falke', 'Orange', true);
  showMainMenu();
  setupMenuScene();
  requestAnimationFrame(loop);
});
try {
  addEventListener('beforeunload', () => { if (G.mode !== 'menu') saveGame(); });
} catch (e) {
  const el = $('err');
  el.textContent = 'Das Spiel konnte nicht gestartet werden: ' + (e as Error).message;
  el.classList.remove('hidden');
  console.error(e);
}
