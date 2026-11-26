import './core/boot';   // zuerst: Spieldaten laden (Ladebalken), alles Weitere wartet darauf
import { initWeltLeben, updateWeltLeben } from './game/weltLeben';
import { crewHooks, crewStadt } from './game/crewStimmen';
import { dockBark } from './game/barks';
import * as THREE from 'three';
import { warm, camera, render, renderStill, prePass, scene, aimShadows, markShadows, gl, compileFor, warmScene } from './core/engine';
import { hideBoot } from './core/assets';
import { updateSky, sunDir, sky } from './core/sky';
import { updateAmbience, drawFlare, resetAmbienceCamera } from './core/ambience';
import { ux } from './core/engine';
import { perfFrameStart, perfFrameEnd, perfHooks } from './core/perf';
import { onKey, centerMouse, releaseAll, keys, look, steer } from './core/input';
import { ambience, preloadSfx, outside, snd, laserSound, boosterSound, duckMusic, audioDebug, setMusicMode, sfx, sfxHeld, loopVol, powerUp } from './core/audio';
import { rand, clamp, $ } from './core/util';
import { P, G, settings, loadSettings, saveSettings, newPlayer, setPlayer, loadGame, saveGame, saveHooks, stats, retireNote, type Player, type PlayerAt, type Tool } from './game/state';
import { world, buildSector, stationById, gateTo, updateAsteroids } from './game/world';
import { initFerrox, updateSpawning, updateEnemies, updateProjectiles, updateStationDefense } from './game/combat';
import { initTraffic, updateTraffic, initAllies, updateAllies } from './game/npc';
import { updateMissions } from './game/missions';
import { updateAufgaben } from './game/aufgaben';
import { updateBoden, drawBodenHUD, bodenE } from './game/bodenaufgaben';
import { updateBegegnungen } from './game/begegnungen';
import { playIntro, updateIntro, skipIntro, INTRO } from './game/intro';
import { updateGroundShade } from './game/groundShade';
import { updateStory, startPrologue, resumePrologue, skipPrologue, prologActive, sceneNext, storyHooks, noteScan, dialogBusy, sceneActive } from './game/story';
import { updateChapter1 } from './game/chapter1';
import { preloadMeshRooms } from './game/meshRoom';
import { SHIP, placePlayer, updatePlayer, updatePickups, syncShip, nearDock, gateHit, hooks, fwd, setShipModel } from './game/player';
import { updateParticles, syncParticles, puff } from './game/fx';
import { syncBolts } from './game/bolts';
import { scan, updateScan, hideMiningFx, resetDrones } from './game/mining';
import { drawHUD, updatePanels, showBanner, nextHop, hudBootStart, reBanner } from './ui/hud';
import { START, leaveToBlack, startBusy, bootLog, bootReady, openCover, settled, hudOff, hudIn, wait, frames } from './ui/startfx';
import type { IntroEnd } from './game/intro';
import { radio, clearRadio } from './ui/radio';
import { openDock, undock, dockHooks, refreshDock, showMenu, closeMenu, dockTabs } from './ui/dock';
import { quartierFahrt, inKojeAufwachen, startLaunch, updateHangarSequence, hangarGearDown, IN, folgeSchiff, enterInterior, enterStanding, leaveInterior, updateWalk, updateRoomLife, applyWalkCamera, drawWalkHUD, interact, jump, syncParkedShip, refreshHangarShips, interiorHooks, enterShip, nearestOther, rampeHinein } from './game/interior';
import { hasMeshRoom, meshRoomReady } from './game/meshRoom';
import { quartierHooks } from './game/quartier';
import { fzOrdnen } from './game/fahrzeuge';
import { setDustVisible } from './core/ambience';
import type { Mode } from './game/state';
import { buildSurface, addOrbitZone, orbitExit, updateSurfaceFlight, landShip, relandShip, boardShip, unloadRover, nearShip, updateRover, roverCamera, resetRoverCamera, syncLandedShip, drawRoverHUD, hideRover, fahrzeugTauschen, roverView, liquidAt, ROVER, SURF , fzImLaderaum, fzWeg, fzInHalle, landeHoehe } from './game/surface';
import { wieselScan } from './game/wiesel';
import { initTestlabor, updateTestlabor, testHooks } from './game/testlabor';
import { mannyHooks } from './game/mannyAvatar';
import { updateWetter } from './game/wetter';
import { EVA, startEva, updateEva, evaCamera, evaE, evaF, drawEva } from './game/eva';
import { updateRecht, drawRecht, rechtDock, rechtZahlen } from './game/recht';
import { stationFaction } from './game/reputation';
import { TESTF } from './game/testflags';
import { PLANETS, PTYPE, planetBaseId } from './data/planets';
import { d3 } from './core/util';
import { openBand, closeBand, drawBand, bandHooks, openModulPlatz } from './ui/band';
import { updateControls } from './ui/controls';
import { netUpdate, NET, isOnline, gastAusstieg, meldeFehler, gastSchiff, gastFahrt, gastWarnung } from './game/net';
import { cockpitUpdate, cockpitKamera, cockpitUmschalten, cockpitLaden } from './game/cockpit';
import { TRADE, requestTrade } from './game/trade';
import { openChat } from './ui/mp';
// Die Galaxiekarte ist eine App im Flottenband
const openMap = () => openBand('karte'), closeMap = closeBand;
import { menuHooks, showMainMenu, hideMainMenu, showPause, hidePause, applySettings, pauseSubOpen, closePauseSub } from './ui/menus';
import { SECTOR, FACTION } from './data/galaxy';
import { loadShipModels, setGear, setDoors, setKanzel, kanzelInfo, eigeneLeiter, RAMP, type Paint } from './models/gltfShips';
import { leiterZeigen } from './game/ausstieg';
import { laderaumUpdate, hatLaderaum } from './game/laderaum';
import { updateKisten, TRAKTOR, kistenLeeren } from './game/kisten';
import { INNEN } from './models/innenFlaeche';
import { schiffslicht } from './models/gltfShips';
import { BORD, aufstehen, updateBordflug, zumSteuer, ausBord } from './game/bordflug';
import { GUN, schuetzeAn, schuetzeAus, schuetzeGrund, updateSchuetze, turmKamera, drawTurmHUD, turmBild } from './game/turm';
import { modulBild } from './game/modulplatz';
import { invHooks } from './game/inventory';
import type { ShipSlot } from './data/gear';
import { anBordStellen } from './game/fahrzeuge';
import { hasInterior, SHIPS } from './data/ships';
import { loadRockModel } from './game/world';
import { updateFarView } from './game/farview';
import { orteKey } from './game/orte';
import { updateAkademie } from './game/akademie';
import { updateAlteWerft } from './game/altewerft';
import { updateLeitbojen } from './game/leitbojen';
import { updateGedenkboje } from './game/gedenkboje';
import { updateSektor3 } from './game/sektor3';
import { gunReload } from './game/footgun';
import { hideFieldViewModel } from './game/fieldfight';
import { toggleSchnellflug, pickNav, bigSectorHint } from './game/schnellflug';
import { loadStationModels } from './models/stationModels';
import { loadCharModels } from './models/charModels';
import type { Gate, Station } from './game/world';
import { DUN, enterDungeon, leaveDungeon, updateDungeon, dungeonCamera, drawDungeonHUD, dungeonKey, nearEntrance, dunHooks } from './game/dungeon';
import { clearFootFx } from './game/footfx';
import { FOOT, updateFoot, footCamera, footGrenade, drawFootHUD, leaveRover, leaveShipOnFoot, enterRover, footOff, footJump, footHooks, footNearShip, footNearRover, landAtBase, leaveBaseOnFoot, nearFootTarget, drawGroundMarkers, footAt, prewarmFoot } from './game/onfoot';
import { CITY, updateCity, insideCityGate, preloadCities, cityDoorOut, hangarPadPose, cityHooks, cityWorld } from './game/city';
import { updateBaseFx } from './game/basefx';
import { preloadBases } from './models/stationModels';
import { loadDeck, loadHangar, hangarBgLoad, primeStationEarly } from './game/deck';
import { updateApproachPrime, markPrimed } from './game/approachPrime';
import { loadEisenkrone } from './models/eisenkrone';
import { updateChapter2 } from './game/chapter2';
import { updateChapter3 } from './game/chapter3';
import { updateChapter4 } from './game/chapter4';
import { updateChapter5 } from './game/chapter5';
import { updateTestShip } from './game/testship';
import { basePad, nearDoor } from './game/basewalk';
import { nearCrate, openCrate as openSalvage, updateSalvage, drawSalvageHUD, legendRumor } from './game/salvage';
import { toggleView, toggleCrouch } from './game/avatar';

loadSettings(); cockpitLaden();
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
  initWeltLeben();
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
  if (def.size) setTimeout(bigSectorHint, 3200);   // großer Sektor: einmal erklären, wie man die Strecken fliegt
  if (P.route === id) { P.route = null; setTimeout(() => radio('SYSTEM', 'Ziel erreicht. Route beendet.'), 1500); }
  if (first && id !== 'heimstatt') setTimeout(() => radio('SYSTEM', `Neuer Sektor erkundet: ${def.name}. Kartendaten aktualisiert.`), 2200);
  if (first && PLANETS[id]) setTimeout(() => radio('SYSTEM', `Der Planet ${PLANETS[id].name} ist landbar. Die Anflugzone ist markiert.`), 5000);
  legendRumor(id);                                                      // Hinweis auf ein Wrack mit versiegeltem Tresor (feste Fundorte)
  if (def.faction === 'ferrox') setTimeout(() => radio('SYSTEM', 'Warnung: Ferrox-Gebiet. Keine Stationen, keine Hilfe. Ferrit-Kristalle sind hier viel wert.'), 3500);
  else if (def.danger >= 2 && first) setTimeout(() => radio(world.stations[0]?.name.toUpperCase() || 'SYSTEM', 'Willkommen im Grenzgebiet. Hier zahlen wir mehr, aber die Ferrox kommen oft vorbei.'), 3500);
}

// =============== Planetenoberfläche betreten ===============
function enterSurface(sector: string, at?: { x: number; y: number; z: number; yaw: number }): Promise<void> {
  if (IN.active) leaveInterior();
  hideRover();
  hideMiningFx();
  resetAmbienceCamera();
  const info = buildSurface(sector);
  initFerrox();
  for (const e of world.enemies) e.y = Math.max(e.y, (world.ground ? world.ground(e.x, e.z) : 0) + 220);
  initTraffic();
  initAllies();
  initWeltLeben();
  P.sector = sector;
  P.surface = true;
  const a = at || { ...info.arrive, yaw: Math.atan2(-(0 - info.arrive.x), -(0 - info.arrive.z)) };
  placePlayer(a.x, a.y, a.z, a.yaw, at ? 0 : 170);
  if (!at) P.pitch = -0.18;
  const pl = PLANETS[sector], T = PTYPE[pl.type];
  showBanner(pl.name.toUpperCase(), T.n, '#7cc4ff');
  setTimeout(() => radio('SYSTEM', pl.base ? `Willkommen auf ${pl.name}. Die Bodenstation ${pl.base} liegt in der Mitte des Gebiets. Lagerstätten findest du mit dem Scanner [R].` : `${pl.name}: keine Bodenstation. Lande in der Nähe einer Lagerstätte und setze den Rover aus.`), 1500);
  if (pl.danger >= 3) setTimeout(() => radio('SYSTEM', 'Warnung: Ferrox-Aktivität auf der Oberfläche.'), 4000);
  // Die neue Oberfläche bringt viele neue Materialien (Boden, Pflanzen, Basis): übersetzen hinter einer kurzen Blende statt mit Standbildern
  // (gemessen: zwei Bilder von 3,7 und 4,9 s im Testfenster). Danach Rover und Spielfigur vorab (onfoot.ts), nicht erst beim Landen.
  // Landefeld der Basis gleich berechnen: Es baut die Eingangstür mit ihrer Lampe – entstand sie erst beim ersten Schritt zu Fuß, kam ein Licht
  // dazu und alle Materialien brauchten neue Shader (gemessen 23 Shader, langes Standbild beim Aussteigen)
  if (world.stations[0]) basePad(world.stations[0]);
  // Deckt der Eintrittsblitz das Bild, bleibt er stehen, bis alles fertig ist (leise, ohne schwarze Blende); sonst die Blende „Landeanflug“
  const underFlash = parseFloat($('flash').style.opacity || '0') > 0.5;
  return warmScene('Landeanflug', () => prewarmFoot(), 9000, underFlash);      // Rover und Figur bauen und hochladen hinter der Blende
}

// =============== Spiel starten / beenden ===============
// Kulisse für das Intro: Sektor ohne Spieler aufbauen
function introScene(id: string) {
  hideMiningFx();
  buildSector(id);
  initFerrox();
  initTraffic();
  initAllies();
  initWeltLeben();
  SHIP.g.visible = false;
}
// ---------- Standort zu Fuß im Spielstand (seit 2026-11-23) ----------
// Vorher begann „Weiterspielen“ immer im Cockpit: vor der Station, in der man zu Fuß war, oder über dem Landeplatz. Jetzt merkt sich jeder
// Spielstand, wo der Pilot zu Fuß war (P.at, state.ts PlayerAt), und setzt ihn dort wieder ab: in der Station oder Basis am selben Standpunkt,
// auf dem Planeten neben Schiff und Rover. Wer im All flog, beginnt vor der nächsten Station des Sektors (ohne Station: am gespeicherten Ort).
let pendingAt: PlayerAt | null = null;      // solange ein Spielstand geladen wird: sein Standort (ein Speichern mittendrin soll ihn nicht löschen)
const r2 = (n: number) => Math.round(n * 100) / 100;
function whereAmI(): PlayerAt | null | undefined {
  if (pendingAt) return pendingAt;
  if (G.mode === 'menu' || G.mode === 'intro') return undefined;
  if (IN.active && IN.station) return { k: 'st', id: IN.station.id, ...(G.baseWalk ? { base: true } : {}), ...(IN.ship ? {} : { x: r2(IN.x), z: r2(IN.z), yaw: r2(IN.yaw) }) };
  if (G.cityWalk && G.dockedAt) return { k: 'st', id: G.dockedAt.id, city: true };
  if (world.surface && (ROVER.active || FOOT.active || IN.active)) return {
    k: 'land', ship: { x: r2(ROVER.ship.x), y: r2(ROVER.ship.y), z: r2(ROVER.ship.z), yaw: r2(ROVER.ship.yaw) }, rover: { x: r2(ROVER.x), z: r2(ROVER.z), yaw: r2(ROVER.yaw) },
    ...(IN.active ? { foot: 'ship' as const } : FOOT.active ? { foot: { x: r2(FOOT.x), z: r2(FOOT.z), yaw: r2(FOOT.yaw) } } : {}),
  };
  return null;
}
saveHooks.where = whereAmI;
// In der Station oder Basis absetzen. false: geht dort nicht (kein Landefeld) – dann bleibt es beim Flug.
function resumeStation(st: Station, at: Extract<PlayerAt, { k: 'st' }>) {
  const base = !!at.base && !!world.surface;
  if (base && !landAtBase(st, true)) return false;
  P.vx = P.vy = P.vz = 0; G.heat = 0; G.overheat = false;
  footOff(); if (base) ROVER.active = false;
  G.dockedAt = st; G.baseWalk = base;
  $('hud').classList.add('hidden'); releaseAll();
  enterStanding(st, base ? true : at.city && (st.def as any).city ? 'city' : false, at);
  return IN.active;
}
// Auf dem Planeten neben dem gelandeten Schiff absetzen: zu Fuß, im Rover oder (wer an Bord war) hinter der Rampe
function resumeLanded(land: Extract<PlayerAt, { k: 'land' }>) {
  relandShip(land.ship, land.rover);
  const f = land.foot;
  if (f === 'ship' || (ROVER.ohne && !f)) leaveShipOnFoot();
  else if (f && isFinite(f.x) && isFinite(f.z) && Math.abs(f.x) < SURF.limit && Math.abs(f.z) < SURF.limit) footAt(f.x, f.z, f.yaw || 0);
  else footOff();
  G.mode = 'rover'; resetRoverCamera(); releaseAll();
}
// Im All: vor der nächsten Station des Sektors, mit stehendem Schiff
// Testlabor (game/testlabor.ts): sofort an einen Ort, über denselben Weg wie „Weiterspielen“ (resumeAt)
testHooks.reise = (ziel: string) => {
  const [typ, sec, a, b] = ziel.split(':');
  if (!SECTOR[sec]) return;
  if (G.mode === 'map') closeMap();
  if (DUN.active) leaveDungeon(false);
  $('dock').classList.add('hidden');
  footOff(); CITY.walk = false;
  Object.assign(G, { mode: 'play', dead: 0, shake: 0, dockedAt: null, baseWalk: false, cityWalk: false, cruise: false });
  P.vx = P.vy = P.vz = 0;
  let inside = false;
  if (typ === 'st') {
    P.surface = false; P.sector = sec;
    if (b === 'in') inside = resumeAt({ k: 'st', id: a });
    else { enterSector(sec, { station: a }); resumeNearStation(); }
  } else if (typ === 'pl' && PLANETS[sec]) {
    P.sector = sec; P.surface = true;
    if (a === 'basis') {
      // Basis mit Landefeld: zu Fuß davor; Stadt (Talstadt): durchs Tor in den Hangar wie beim Weiterspielen in der Stadt
      P.x = 0; P.y = 600; P.z = 0; void enterSurface(sec, { x: 0, y: 600, z: 0, yaw: 0 });
      const st = world.stations.find(s => s.id === planetBaseId(sec));
      if (st) inside = resumeStation(st, (st.def as any).city ? { k: 'st', id: st.id, city: true } : { k: 'st', id: st.id, base: true });
    }
    else {
      P.fahrzeug = a;
      void enterSurface(sec, { x: 300, y: 600, z: 0, yaw: 0 });
      // trockene, flache Stelle neben der Basis (die liegt in der Mitte)
      let x = 300, z = 0;
      for (const d of [300, 450, 650, 900]) {
        let ok = false;
        for (let k = 0; k < 12 && !ok; k++) {
          const ang = k / 12 * Math.PI * 2, px = Math.cos(ang) * d, pz = Math.sin(ang) * d, h = (q: number, w: number) => world.ground ? world.ground(q, w) : 0;
          if (!liquidAt(px, pz) && !liquidAt(px + 12, pz) && Math.abs(h(px + 8, pz) - h(px - 8, pz)) + Math.abs(h(px, pz + 8) - h(px, pz - 8)) < 3) { x = px; z = pz; ok = true; }
        }
        if (ok) break;
      }
      const r = stats().radius, gy = world.ground ? world.ground(x, z) : 0;
      P.x = x; P.z = z; P.y = gy + 40;
      resumeLanded({ k: 'land', ship: { x, y: gy + landeHoehe(), z, yaw: 0 }, rover: { x: x + r + 7, z, yaw: 0 } });
    }
  }
  if (!inside) $('hud').classList.remove('hidden');
  document.body.classList.add('playing');
  saveGame();
};
testHooks.fuss = () => (FOOT.active && !IN.active ? { x: FOOT.x, y: FOOT.y, z: FOOT.z, yaw: FOOT.yaw } : null);
testHooks.schiffGewechselt = () => { G.camInit = false; refreshHangarShips(); };
function resumeNearStation() {
  let best: Station | null = null, bd = Infinity;
  for (const s of world.stations) { const d = Math.hypot(s.x - P.x, s.y - P.y, s.z - P.z); if (d < bd) { bd = d; best = s; } }
  if (!best) return;
  const L = best.launch, r = stats().radius;
  placePlayer(L.x - Math.sin(L.yaw) * r * 2, L.y, L.z - Math.cos(L.yaw) * r * 2, L.yaw, 0);
}
function resumeAt(at: PlayerAt | null) {
  const find = (id: string) => world.stations.find(s => s.id === id) || null;
  const ok = isFinite(P.x) && isFinite(P.y) && isFinite(P.z) && SECTOR[P.sector];
  if (!ok) { P.sector = P.home.sector; enterSector(P.sector, { station: P.home.station }); return false; }
  if (P.surface && PLANETS[P.sector]) {
    const land = at?.k === 'land' && [at.ship.x, at.ship.y, at.ship.z, at.ship.yaw].every(isFinite) ? at : null;
    enterSurface(P.sector, land ? { ...land.ship } : { x: P.x, y: P.y + 30, z: P.z, yaw: P.yaw });
    if (land) { resumeLanded(land); return false; }
    const st = at?.k === 'st' ? find(at.id) : null;
    return !!st && resumeStation(st, at as Extract<PlayerAt, { k: 'st' }>);
  }
  const want = at?.k === 'st' && SECTOR[P.sector].stations.some(s => s.id === at.id) ? at : null;
  enterSector(P.sector, want ? { station: want.id } : {});
  const st = want ? find(want.id) : null;
  if (st && resumeStation(st, want!)) return true;
  resumeNearStation();
  warmScene('Spiel wird geladen');      // erster Blick in den Sektor hinter der Abdeckung (continueGame)
  return false;
}
function startGame(p: Player, fresh: boolean) {
  setMusicMode(fresh ? 'menu' : 'game');
  setPlayer(p);
  fzOrdnen();      // Fahrzeuge an ihren Ort (game/fahrzeuge.ts): an Bord, wenn sie passen, sonst in die Halle
  setShipModel(P.cls, (P.paint || 'Orange') as Paint, true);
  hideMainMenu();
  clearRadio();
  Object.assign(G, { mode: 'play', dead: 0, shake: 0, hitMark: 0, sinceHit: 99, thrust: 0, jumpT: 0, lockT: null, dockedAt: null, saveT: 20, baseWalk: false, cityWalk: false });
  CITY.walk = false; footOff();
  let inside = false;
  if (fresh) {
    // Neues Spiel: Intro, danach beginnt der Prolog zu Fuß im Hangar der Bastion
    $('hud').classList.add('hidden');
    document.body.classList.remove('playing');
    playIntro(introScene, end => { void introDone(end); });
    // Die erste Einstellung hinter der Abdeckung vorwärmen (sonst stockt ihr erstes Bild), dann geht das Bild aus Schwarz auf
    if (START.on) { warm.cover = true; warmScene('', null, 6000, true).then(() => { if (G.mode === 'intro') warm.cover = false; void openCover(); }); }
    else void openCover();
    return;
  } else {
    pendingAt = P.at || null;
    try { inside = resumeAt(pendingAt); } finally { pendingAt = null; }
    if (!START.on) setTimeout(() => radio('SYSTEM', `Willkommen zurück, ${P.name}.`), 1000);      // sonst steht es im Systemstart
    if (retireNote) setTimeout(() => radio('SYSTEM', retireNote), 5500);
    resumePrologue();
  }
  if (!inside) $('hud').classList.remove('hidden');      // in der Station bleibt die Fluganzeige aus (wie nach dem Andocken)
  document.body.classList.add('playing');
  centerMouse();
}
// Ende des Intros: Der Hangar lädt hinter dem Schwarz, auf dem die letzte Tafel steht. Erst dann beginnt der Prolog, die Tafel verschwindet
// und das Bild geht langsam auf; die Anzeige kommt kurz danach. Vorher: Schnitt, schwarzes Ladebild mit dem Wort „Andocken“, Schnitt.
async function introDone(end: IntroEnd) {
  warm.cover = true;
  hudOff(true);
  try {
    setMusicMode('game');
    enterSector('heimstatt', { station: 'bastion' });
    const b = stationById('bastion');
    if (b) openDock(b);
    await settled();
    warm.wait = START.on;      // das Spiel steht, bis das Bild aufgeht
    startPrologue();
    saveGame();
    if (START.on) await wait(end.card());
  } finally {
    warm.wait = false; warm.cover = false;
    end.open(START.on ? 2400 : 0);
    hudIn(START.on ? 1500 : 0);
  }
}
// Weiterspielen: Menü gleitet weg, Schwarz, Systemstart. Die letzte Zeile wartet wirklich auf das Laden des Sektors; dann geht das Bild auf
// und die Anzeige schaltet sich Teil für Teil ein. Vorher: Schnitt, „Spiel wird geladen“, alles auf einmal da.
async function continueGame() {
  const p = loadGame();
  if (!p || startBusy()) return;
  if (START.on) { setMusicMode('game'); powerUp(); }
  if (!(await leaveToBlack('menu'))) return;
  const t0 = performance.now();
  let foot = false;      // zu Fuß: die ganze Anzeige blendet weich ein, statt sich Teil für Teil einzuschalten
  try {
    const pl = p.surface ? PLANETS[p.sector] : null, sec = SECTOR[p.sector] || SECTOR[p.home?.sector] || SECTOR.heimstatt;
    const ship = (SHIPS as any)[p.cls]?.n || 'Schiff';
    // zu Fuß gespeichert (P.at): Es meldet sich der Anzug, die letzte Zeile nennt die Station oder den Planeten
    const at = p.at && (p.at.k === 'st' || pl) ? p.at : null;
    foot = !!at;
    const stName = at?.k === 'st' ? (pl ? pl.base : sec.stations.find(s => s.id === at.id)?.name) || '' : '';
    if (at) bootLog('Anzugsystem', stName || (pl ? pl.name : sec.name), ['Lebenserhaltung', 'Funk', 'Helmanzeige', 'Ortung'],
      stName ? (pl ? `${pl.city ? 'Stadt' : 'Basis'} ${stName}` : `Station ${stName}`) : `Oberfläche ${pl!.name}`, `Willkommen zurück, ${p.name}.`);
    else bootLog('Bordsystem', p.shipName && p.shipName.toLowerCase() !== ship.toLowerCase() ? `${ship} · ${p.shipName}` : ship, ['Reaktor', 'Lageregelung', 'Schild', 'Sensoren'],
      pl ? `Oberfläche ${pl.name}` : `Sektor ${sec.name}`, `Willkommen zurück, ${p.name}.`);
    await frames();      // die erste Zeile steht, bevor der Aufbau des Sektors das Bild kurz anhält
    warm.cover = true;
    hudOff(foot);
    startGame(p, false);
    await settled();
    if (START.on) {
      warm.wait = true;      // das Spiel steht, bis das Bild aufgeht
      const rest = 1400 - (performance.now() - t0);
      if (rest > 0) await wait(rest);
      bootReady();
      await wait(380);
    }
  } finally {
    warm.wait = false; warm.cover = false;
    if (START.on) { reBanner(); if (!foot) hudBootStart(); }
    hudIn(START.on ? (foot ? 1300 : 1750) : 0);
    void openCover();
  }
}
function toMenu() {
  setMusicMode('menu');
  kistenLeeren();
  BORD.aktiv = false;
  if (IN.active) leaveInterior();
  if (DUN.active) leaveDungeon(false);   // aus der Mine ins Menü: Mine abbauen (sonst blieb ihr letztes Bild stehen, auch nach „Weiterspielen“)
  clearFootFx();
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
dunHooks.unlock = () => pause();
footHooks.unlock = () => pause();
function pause() { if (G.mode !== 'play' && G.mode !== 'walk' && G.mode !== 'rover' && G.mode !== 'dungeon' && G.mode !== 'eva') return; pausedFrom = G.mode; G.mode = 'pause'; if (document.pointerLockElement) document.exitPointerLock(); releaseAll(); $('pSkip').classList.toggle('hidden', !prologActive()); showPause(); duckMusic(0.5); document.body.classList.remove('playing'); }
function resume() { hidePause(); G.mode = pausedFrom; duckMusic(1); document.body.classList.add('playing'); centerMouse(); }

$('pSkip').onclick = () => { skipPrologue(); resume(); };
storyHooks.banner = (t, s, c) => showBanner(t, s, c);
crewHooks.busy = () => dialogBusy() || sceneActive();   // Stimmen der Crew schweigen, solange die Geschichte spricht
menuHooks.newGame = (name, figur) => { const p = newPlayer(NET.account || name); p.figur = figur; startGame(p, true); };   // mit Konto heißt der Pilot wie das Konto; Figur aus der Charaktererstellung
// ohne Übergänge (Prüfskripte, START.on = false): im selben Augenblick wie früher, nichts wird abgewartet
menuHooks.continueGame = () => { if (!START.on) { const p = loadGame(); if (p) startGame(p, false); return; } void continueGame(); };
menuHooks.resume = resume;
menuHooks.quit = () => { saveGame(); toMenu(); };
menuHooks.openMap = openMap;
dockHooks.openMap = openMap;
dockHooks.shipChanged = () => { G.camInit = false; refreshHangarShips(); };
dockHooks.enter = st => enterInterior(st);
dockHooks.leave = leaveInterior;
interiorHooks.openTab = (t, n, s) => showMenu(t, n, s);
quartierHooks.fahren = (owner, deko) => quartierFahrt(owner, deko);      // Aufzug zu den Quartieren (game/quartier.ts, interior.ts)
interiorHooks.undock = undock;
dockHooks.launch = startLaunch;
// Planetenbasis zu Fuß: hinein durch die Tür, hinaus wieder vor die Tür (das Schiff steht auf dem Landefeld)
function enterBase(st: Station) {
  footOff(); ROVER.active = false; laserSound(false);
  dockBark('land', 1400); G.baseWalk = true; G.dockedAt = st; P.shield = stats().maxShield; G.heat = 0; G.overheat = false;
  $('hud').classList.add('hidden'); releaseAll();
  enterInterior(st, true);
  saveGame();
}
function leaveBase() {
  leaveInterior();
  G.baseWalk = false; G.dockedAt = null; $('dock').classList.add('hidden');
  ROVER.active = true; leaveBaseOnFoot(); G.mode = 'rover'; resetRoverCamera(); releaseAll();
  $('hud').classList.remove('hidden'); document.body.classList.add('playing');
  saveGame();
}
dockHooks.leaveBase = leaveBase;
// Stadt zu Fuß (src/game/city.ts): aus der Promenade hinaus auf den Marktplatz und wieder hinein. Das Schiff bleibt im Hangar stehen
// (man sieht es durchs Tor), angedockt bleibt man die ganze Zeit; „Ablegen“ im Menü startet direkt aus dem Hangar.
function cityWalkOut() {
  const st = IN.station; if (!st) return;
  leaveInterior();
  G.cityWalk = true; CITY.walk = true;
  crewStadt(st, P.sector, CITY.name);   // Stimmen der Crew: Sätze der Stadt
  ROVER.ship = hangarPadPose(st, stats().radius * 0.55);
  const rv = cityWorld(st, 52, 0, 4); ROVER.x = rv.x; ROVER.z = rv.z; ROVER.y = rv.y; ROVER.yaw = st.yaw;   // Rover hinten im Hangar
  ROVER.active = true;
  const out = cityDoorOut(); if (out) footAt(out.x, out.z, out.yaw);
  G.mode = 'rover'; resetRoverCamera(); releaseAll();
  $('hud').classList.remove('hidden'); document.body.classList.add('playing');
  radio('SYSTEM', `${st.name}, Marktplatz. Die Tür hinter dir führt zurück in die Promenade.`);
  saveGame();
}
function enterCityPromenade() {
  const st = CITY.st; if (!st) return;
  footOff(); ROVER.active = false; laserSound(false);
  G.cityWalk = false; CITY.walk = false; G.dockedAt = st;
  $('hud').classList.add('hidden'); releaseAll();
  enterInterior(st, 'city');
  saveGame();
}
interiorHooks.toCity = cityWalkOut;
footHooks.enterCity = enterCityPromenade;
dockHooks.leaveCity = () => { footOff(); ROVER.active = false; G.cityWalk = false; CITY.walk = false; };
cityHooks.tab = (t, n) => showMenu(t, n);
cityHooks.rest = () => { P.hull = stats().maxHull; saveGame(); radio('SYSTEM', 'Eine Nacht in der Herberge. Ausgeruht, Spielstand gesichert.'); };
interiorHooks.leaveBase = leaveBase;
interiorHooks.openMap = openMap;
interiorHooks.pause = pause;
interiorHooks.tabs = () => (G.dockedAt ? dockTabs(G.dockedAt) : []);
interiorHooks.takeoff = () => { leaveInterior(); boardShip(); G.mode = 'play'; $('hud').classList.remove('hidden'); saveGame(); };
interiorHooks.toFahrzeug = (kind: string) => { leaveInterior(); ROVER.active = true; if (fzImLaderaum(kind as any)) { footOff(); G.mode = 'rover'; resetRoverCamera(); releaseAll(); $('hud').classList.remove('hidden'); radio('SYSTEM', 'Über die Rampe hinausfahren. Zum Einladen hinauffahren und im Laderaum [E].'); } };
interiorHooks.zumSteuer = () => zumSteuer();
// Schützenplatz (turm.ts): am eigenen Schiff oder als Gast auf dem Schiff eines Mitspielers
interiorHooks.schuetze = () => {
  const sh = IN.ship; if (!sh) return 'Kein Schiff.';
  const g = schuetzeGrund(sh.ctx); if (g) return g;
  const gm = sh.gast ? gastSchiff(sh.gast) : null;
  if (sh.gast && !gm) return 'Das Schiff ist nicht mehr da.';
  return schuetzeAn(sh.cls, gm ? gm.g : SHIP.g, sh.gast || 0, { yaw: IN.yaw, pitch: IN.pitch }) ? '' : 'Dieses Schiff hat keinen Turm.';
};
interiorHooks.modulPlatz = slot => openModulPlatz(slot as ShipSlot);
// Schiffsmodule tauschen: nur gelandet oder angedockt (Nutzer 26.11.2026), auch in der Ausrüstungs-App
invHooks.umbau = () => (G.dockedAt || (IN.active && !!IN.station) || (world.surface && (ROVER.active || FOOT.active || (IN.active && IN.ship?.ctx === 'planet' && !IN.ship.gast))) ? '' : 'Umbauen geht nur gelandet oder angedockt.');
interiorHooks.ausBord = ausBord;
interiorHooks.gastRaus = () => { const o = gastAusstieg(); leaveInterior(); ROVER.active = true; if (o) footAt(o.x, o.z, o.yaw); else leaveShipOnFoot(); G.mode = 'rover'; resetRoverCamera(); releaseAll(); $('hud').classList.remove('hidden'); };      // als Gast aus dem Schiff eines Mitspielers (net.ts)
// Nach dem Landen auf einem Planeten (seit 2026-11-26, Nutzer: „E zum Landen, ob man das Fahrzeug rausfährt, macht man selber“): Begehbare Schiffe
// lassen den Piloten hinter dem Sitz aufstehen, hinaus geht es über die Rampe zu Fuß oder im Fahrzeug aus dem Laderaum. Kleine Flieger: zu Fuß an der
// Leiter. Ist der Innenraum noch nicht geladen, steht man draußen (sonst hinge man bis zum Ende des Ladens zwischen Cockpit und Boden).
function nachLanden() {
  G.mode = 'rover'; resetRoverCamera(); releaseAll();
  if (settings.walk && hasInterior(P.cls) && (!hasMeshRoom(P.cls) || meshRoomReady(P.cls))) {
    footOff(); syncLandedShip(); ROVER.active = false; laserSound(false); $('hud').classList.add('hidden');
    enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'planet' }, SHIP, undefined, true);
  } else leaveShipOnFoot();
}
// zu Fuß die Heckrampe hinauf: an Bord, an derselben Stelle (interior.ts rampeHinein)
footHooks.rampe = (nx, nz, ox, oz) => {
  if (!settings.walk || !FOOT.active) return false;
  const at = rampeHinein(nx, nz, ox, oz, FOOT.y, FOOT.yaw, FOOT.pitch); if (!at) return false;
  footOff(); syncLandedShip(); ROVER.active = false; laserSound(false);
  const u = unloadRover(); if (u.moved) radio('SYSTEM', `${u.moved} Einheiten aus dem Rover in den Frachtraum verladen.`);
  $('hud').classList.add('hidden');
  enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'planet' }, SHIP, at);
  return true;
};
// innen die Rampe hinunter: draußen zu Fuß weiter
interiorHooks.zuFuss = (x, z, yaw, pitch) => { leaveInterior(); ROVER.active = true; footAt(x, z, yaw); FOOT.pitch = pitch; G.mode = 'rover'; $('hud').classList.remove('hidden'); };      // Tasten bleiben gedrückt: man läuft einfach weiter
interiorHooks.toRover = () => { leaveInterior(); ROVER.active = true; leaveShipOnFoot(); G.mode = 'rover'; resetRoverCamera(); releaseAll(); $('hud').classList.remove('hidden'); };
bandHooks.closed = m => {
  if (m === 'pause') showPause();
  if (m === 'play' || m === 'walk' || m === 'rover') { document.body.classList.add('playing'); centerMouse(); }
  if (m === 'dock') refreshDock();
};

// =============== Tasten ===============
onKey(code => {
  if (G.mode === 'launch') return;   // Start/Landung im Hangar läuft von selbst
  // Intro und Szenen: nur überspringen bzw. weiterblättern
  if (G.mode === 'intro') { if (code === 'Escape') skipIntro(); return; }
  if (G.mode === 'scene') { if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter' || code === 'Escape') sceneNext(); return; }
  if (GUN.aktiv && G.mode === 'walk') { if (code === 'KeyE' || code === 'KeyF' || code === 'Escape') schuetzeAus(); return; }      // am Schützenplatz: nur aufstehen (turm.ts)
  if (code === 'Escape') {
    if (G.mode === 'map') closeMap();
    else if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'rover' || G.mode === 'dungeon' || G.mode === 'eva') pause();
    else if (G.mode === 'dock') closeMenu();
    else if (G.mode === 'pause') { if (pauseSubOpen()) closePauseSub(); else resume(); }
    return;
  }
  if ((code === 'Enter' || code === 'NumpadEnter') && openChat()) return;
  // Flottenband: M öffnet die Karte, B/F1 die Übersicht; nochmal drücken schließt
  if (code === 'KeyM' || code === 'KeyB' || code === 'F1' || code === 'KeyI') {
    const app = code === 'KeyM' ? 'karte' : code === 'KeyI' ? 'inventar' : 'start';
    if (G.mode === 'map') closeBand();
    else if (G.mode === 'play' || G.mode === 'dock' || G.mode === 'walk' || G.mode === 'rover' || G.mode === 'dungeon') openBand(app);
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
  // Erkundungsbuggy „Wiesel“: R tastet ab (wiesel.ts); X am Schiff: das andere Fahrzeug nehmen (surface.ts fahrzeugTauschen)
  if (code === 'KeyR' && G.mode === 'rover' && !FOOT.active && ROVER.active && ROVER.kind === 'wiesel' && !G.dead) { wieselScan(ROVER.x, ROVER.y, ROVER.z); return; }
  if (code === 'KeyX' && G.mode === 'rover' && !G.dead && (FOOT.active ? footNearShip() : nearShip())) { const t = fahrzeugTauschen(); if (t) radio('SYSTEM', t); return; }
  if (code === 'KeyR' && (G.mode === 'dungeon' || (G.mode === 'rover' && FOOT.active))) { gunReload(); return; }   // zu Fuß: nachladen (footgun.ts)
  if (code === 'KeyG' && G.mode === 'rover' && FOOT.active) { footGrenade(); return; }
  if (code === 'KeyG' && G.mode === 'play') { aufstehen(); return; }      // im Flug vom Pilotensitz aufstehen, Autopilot hält Kurs (bordflug.ts)      // zu Fuß: Granate werfen (in der Mine: dungeonKey)
  if (code === 'KeyJ' && G.mode === 'play') { toggleJumpDrive(); return; }
  if (code === 'KeyH' && G.mode === 'play') { toggleSchnellflug(); return; }                                  // Schnellflug / Kurzsprung (schnellflug.ts)
  if (code === 'KeyN' && G.mode === 'play' && !world.surface) { pickNav(camera.getWorldDirection(new THREE.Vector3())); return; }   // Navigationsziel im Fadenkreuz
  if ((code === 'ShiftLeft' || code === 'ShiftRight') && G.mode === 'play') { G.cruise = !G.cruise; return; }   // ohne Funkmeldung (Wunsch des Spielers): Ton und blaue Tempoanzeige reichen
  // Ich-Sicht / Außensicht: überall zu Fuß (Station, Hangar, Schiff, Mine, Planetenboden)
  if (code === 'KeyV' && (G.mode === 'walk' || G.mode === 'dungeon' || (G.mode === 'rover' && FOOT.active))) { toggleView(); return; }
  if (code === 'KeyV' && G.mode === 'rover' && ROVER.active && !G.dead) { roverView(); return; }      // im Fahrzeug: Verfolger ↔ Motorhaube/Fahrersitz
  if (G.mode === 'rover' && FOOT.active && code === 'Space') { footJump(); return; }
  if (code === 'KeyC' && (G.mode === 'walk' || G.mode === 'dungeon' || (G.mode === 'rover' && FOOT.active))) { toggleCrouch(); return; }
  // Außenbordeinsatz (eva.ts): F im All bei stehendem Schiff aussteigen, an der Schleuse einsteigen; E birgt Container
  if (code === 'KeyF' && G.mode === 'play' && !world.surface && !G.dead && !nearDock()) { startEva(); return; }
  if (G.mode === 'eva') { if (code === 'KeyF') evaF(); else if (code === 'KeyE') evaE(); return; }
  // F: aus dem Rover aussteigen / wieder einsteigen
  if (code === 'KeyF' && G.mode === 'rover' && !G.dead) { if (FOOT.active) { if (footNearRover()) enterRover(); } else leaveRover(); return; }
  if (code === 'KeyK' && G.mode === 'play' && !G.dead) { cockpitUmschalten(); return; }      // Cockpit-Sicht ↔ Verfolgersicht
  if (code === 'KeyV' && G.mode === 'play') { CAM.lock = !CAM.lock; if (CAM.lock) radio('SYSTEM', 'Freie Kamera: Maus schaut um das Schiff, Pfeiltasten lenken. V beendet sie.'); return; }
  if (G.mode === 'walk' && code === 'Space') { jump(); return; }
  if (code === 'KeyE') {
    if (G.mode === 'walk') interact();
    else if (G.mode === 'dungeon') dungeonKey(code);
    else if (G.mode === 'rover') {
      // im Rover oder zu Fuß (FOOT): Schiff, Mine, Rover
      if (bodenE(FOOT.active ? FOOT.x : ROVER.x, FOOT.active ? FOOT.z : ROVER.z, !FOOT.active && ROVER.active)) return;      // Bodenaufgaben: Außenstelle, vermisster Rover
      if (!FOOT.active && ROVER.model) { const t = fzInHalle(); if (t) { radio('SYSTEM', t); if (!ROVER.model) footAt(ROVER.x + 3, ROVER.z, ROVER.yaw); return; } }      // an der Basis: in die Fahrzeughalle
      // Kormoran und Wisent: im Laderaum abgestellt, das Fahrzeug steht an Bord (Standbild im Laderaum)
      if (!FOOT.active && ROVER.model && !ROVER.leih && hatLaderaum() && nearShip()) { if (Math.abs(ROVER.speed) > 3) { radio('SYSTEM', 'Erst anhalten.'); return; } if (!anBordStellen(ROVER.kind)) { radio('SYSTEM', 'Kein freier Stellplatz, oder das Fahrzeug passt nicht durchs Tor.'); return; } unloadRover(); fzWeg(); laderaumUpdate(null); }
      const atShip = FOOT.active ? footNearShip() : (nearShip() || (!ROVER.model && ROVER.active));
      const mine = atShip ? null : nearEntrance(FOOT.active ? FOOT.x : ROVER.x, FOOT.active ? FOOT.z : ROVER.z);
      const door = FOOT.active ? nearDoor(FOOT.x, FOOT.z) : null;
      if (door) { enterBase(door.st); return; }
      const tgt = FOOT.active ? nearFootTarget() : null;
      if (tgt) { tgt.act(); return; }
      const crate = FOOT.active ? nearCrate(FOOT.x, FOOT.z) : null;
      if (crate) { openSalvage(crate); return; }
      if (FOOT.active && FOOT.act === 'rover') { enterRover(); return; }      // direkt am Fahrzeug (4,5 m): einsteigen, auch neben Mine oder Schiff (onfoot.ts FOOT.act)
      if (mine) { laserSound(false); enterDungeon(mine); }
      else if (!atShip) { if (FOOT.active && FOOT.act === 'rover') enterRover(); }
      else if (settings.walk && hasInterior(P.cls)) {
        // zu Fuß an Bord: Rover bleibt neben dem Schiff stehen (kleine Flieger: direkt einsteigen)
        footOff(); syncLandedShip(); ROVER.active = false; laserSound(false);
        const u = unloadRover(); if (u.moved) radio('SYSTEM', `${u.moved} Einheiten aus dem Rover in den Frachtraum verladen.`);
        $('hud').classList.add('hidden');
        enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'planet' }, SHIP);
      } else { footOff(); boardShip(); G.mode = 'play'; saveGame(); }
    }
    else if (G.mode === 'play') {
      const st = nearDock();
      if (st && world.surface && settings.walk && basePad(st)) { if (landAtBase(st)) { G.mode = 'rover'; resetRoverCamera(); releaseAll(); saveGame(); } }   // Planetenbasis: aufs Landefeld, zu Fuß hinein
      else if (st) { const rd = rechtDock(st.name, stationFaction(st.id, P.sector)); if (!rd.ok) radio(st.name.toUpperCase(), rd.text + '.', '#ff6b5b'); else { if (rd.text) rechtZahlen(rd.zahlen, st.name); openDock(st); } }      // Recht und Ordnung: Bußgeld
      else if (world.surface && landShip()) { nachLanden(); saveGame(); }      // gelandet: an Bord hinter dem Pilotensitz aufstehen bzw. zu Fuß hinaus; das Fahrzeug nimmt man selbst
      else if (!world.surface && !G.dead) { for (const k of orteKey) if (k()) break; }   // Orte im Sektor (z. B. Bergung in der Alten Werft)
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
  sfx('jump_out', 0.8, 1, () => { snd(200, 1.4, 'sine', 0.05, 700); snd(80, 1.4, 'sawtooth', 0.03, 300); });
}
// Sprungantrieb (J): von überall im All in den nächsten Sektor der geplanten Route. Lädt sechs Sekunden, nur im Reiseflug,
// nicht nahe an Stationen oder über Planeten; ein Treffer beendet den Reiseflug und damit das Laden. Tore springen weiter sofort.
const JD_TIME = 6;
let jdSound: null | (() => void) = null;   // laufende Aufnahme des Aufladens
const jdStop = () => { jdSound?.(); jdSound = null; };
function toggleJumpDrive() {
  if (G.jd) { G.jd = 0; jdStop(); radio('SYSTEM', 'Sprung abgebrochen.'); return; }
  const to = nextHop();
  if (!to) radio('SYSTEM', 'Kein Sprungziel. Setze auf der Galaxiekarte (M) eine Route.');
  else if (world.surface) radio('SYSTEM', 'Der Sprungantrieb arbeitet nur im All. Steig erst in den Orbit auf.');
  else if (world.stations.some(s => d3(P.x, P.y, P.z, s.x, s.y, s.z) < s.R + 500)) radio('SYSTEM', 'Zu nah an einer Station für einen Sprung. Flieg ein Stück hinaus.');
  else { G.cruise = true; G.jd = JD_TIME; G.jdTo = to; radio('SYSTEM', `Sprungantrieb lädt, Reiseflug ist an. Ziel: ${SECTOR[to]?.name || to}. Kurs halten.`); jdSound = sfxHeld('jump_charge', 0.75); if (!jdSound) snd(180, 0.5, 'sine', 0.05, 240); }
}
function updateJumpDrive(dt: number) {
  if (!G.jd) return;
  if (!G.cruise || G.dead) { G.jd = 0; jdStop(); radio('SYSTEM', 'Sprung abgebrochen: Reiseflug unterbrochen.'); return; }
  const before = Math.ceil(G.jd);
  G.jd = Math.max(0, G.jd - dt);
  if (!jdSound && G.jd > 0 && Math.ceil(G.jd) !== before) snd(240 + (JD_TIME - before) * 70, 0.12, 'sine', 0.04, 90);   // ohne Aufnahme: Ladeton je Sekunde
  if (G.jd <= 0) { G.cruise = false; jdSound = null; startJump({ to: G.jdTo } as Gate); }
}
function updateJump(dt: number) {
  G.jumpT -= dt;
  const f = fwd(), sp = 300 + (1.3 - G.jumpT) * 900;
  P.vx = f.x * sp; P.vy = f.y * sp; P.vz = f.z * sp;
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  if (G.jumpT <= 0) {
    const fl = $('flash');
    fl.style.transition = 'none'; fl.style.opacity = '1';
    enterSector(G.jumpTo!, { gateFrom: G.jumpFrom! });
    // Der Sprungblitz bleibt stehen, bis der neue Sektor übersetzt ist (vorher zwei Standbilder von bis zu 2 s nach dem Sprung)
    warmScene('', null, 9000, true).then(() => requestAnimationFrame(() => { fl.style.transition = 'opacity 1.1s'; fl.style.opacity = '0'; }));
    G.mode = 'play';
    centerMouse();
    sfx('jump_in', 0.75, 1, () => snd(90, 1.2, 'sine', 0.06, -30));
    saveGame();
  }
}

// =============== Atmosphäreneintritt / Aufstieg in den Orbit ===============
function startEntry(to: 'surface' | 'orbit') {
  G.mode = 'entry';
  if (to === 'surface') sfx('entry', 0.7);   // Rauschen und Rütteln beim Eintritt in die Atmosphäre
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
    // Seit 2026-11-18: Der Blitz bleibt stehen, bis die Shader der neuen Umgebung übersetzt sind (vorher Standbilder beim Ausblenden)
    const ready = to === 'surface' ? enterSurface(P.sector) : (enterSector(P.sector, { orbit: true }), warmScene('', null, 9000, true));
    G.mode = 'play';
    G.shake = 0;
    centerMouse();
    ready.then(() => requestAnimationFrame(() => { fl.style.transition = 'opacity 1.3s'; fl.style.opacity = '0'; setTimeout(() => (fl.style.background = '#fff'), 1400); }));
    saveGame();
  }
}

// =============== Neustart nach Abschuss ===============
hooks.respawn = () => {
  const st = stats();
  P.hull = st.maxHull; P.shield = st.maxShield; P.ammo = st.maxAmmo; P.rockets = st.maxRockets; P.charges = st.maxCharges;
  resetDrones();
  // Quartier mit Koje als Aufwachpunkt (game/quartier.ts): auf der Bastion in der eigenen Koje aufwachen
  if (P.quartier?.koje && SECTOR.heimstatt) {
    P.sector = 'heimstatt'; P.surface = false;
    if (resumeAt({ k: 'st', id: 'bastion' }) && inKojeAufwachen()) { $('hud').classList.add('hidden'); document.body.classList.add('playing'); radio('SYSTEM', 'Du wachst in deiner Koje auf. Draußen wartet ein neuer Jäger im Hangar.'); saveGame(); return; }
  }
  const h = SECTOR[P.home.sector]?.stations.some(s => s.id === P.home.station) ? P.home : { sector: 'heimstatt', station: 'bastion' };
  if (h.sector !== P.sector || world.surface) enterSector(h.sector, { station: h.station });
  else { const s = stationById(h.station) || world.stations[0]; placePlayer(s.launch.x, s.launch.y, s.launch.z, s.launch.yaw, 140); }
  radio('LEITSTELLE', 'Neuer Jäger startklar. Flieg vorsichtig.');
  saveGame();
};

// =============== Hauptmenü-Kulisse ===============
function setupMenuScene() {
  hideMiningFx();
  setShipModel('milan');
  buildSector('heimstatt');
  initTraffic();
  initAllies();
  initWeltLeben();
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
let flyGrabT = 0, flyLocked = false;
const typingNow = () => { const t = document.activeElement?.tagName; return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT'; };
function freeCamera(dt: number) {
  const flying = G.mode === 'play' && !G.dead;
  if (!flying) CAM.lock = false;
  const want = flying && (!!keys.KeyC || look.mid || CAM.lock);
  const direct = settings.steer !== 'zeiger';
  if (want !== look.free) {
    look.free = want; look.dx = look.dy = 0;
    if (!direct) try {      // alte Zeigersteuerung: nur für die freie Kamera einfangen
      if (want) { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); }
      else if (document.pointerLockElement === gl && !IN.active) document.exitPointerLock();
    } catch (e) { /* ohne Einfangen geht es auch */ }
  }
  // Direkte Lenkung: Im Flug bleibt der Zeiger eingefangen (wie zu Fuß). Fehlt er (nach Menü, Karte, Chat), holt ihn das Spiel zurück,
  // sobald der Browser es erlaubt (kurz nach einem Tastendruck oder Klick); sonst reicht ein Klick ins Bild.
  flyLocked = flying && document.pointerLockElement === gl;
  if (!flying) { steer.dx = steer.dy = 0; flyGrabT = 0; }
  else if (direct && document.pointerLockElement !== gl && !typingNow() && (flyGrabT -= dt) <= 0) {
    flyGrabT = 0.4; const ua = (navigator as any).userActivation;
    if (!ua || ua.isActive) try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* Klick nötig */ }
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
document.addEventListener('pointerlockchange', () => {
  const now = document.pointerLockElement === gl;
  if (!now && CAM.lock) CAM.lock = false;
  // Direkte Lenkung: Esc im Flug gibt den Zeiger frei → Pause (wie zu Fuß). Absichtliches Freigeben (Menüs, Chat) wechselt vorher den Modus.
  if (flyLocked && !now && settings.steer !== 'zeiger') setTimeout(() => { if (document.pointerLockElement !== gl && G.mode === 'play' && !G.dead && !typingNow()) pause(); }, 80);
});
// Klick ins Bild im Flug ohne eingefangenen Zeiger: nur einfangen, nicht schießen
gl.addEventListener('mousedown', e => {
  if (settings.steer === 'zeiger' || G.mode !== 'play' || document.pointerLockElement === gl) return;
  try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* nicht erlaubt */ }
  e.stopImmediatePropagation();
}, true);
function updateCamera(dt: number) {
  freeCamera(dt);
  if (G.mode === 'intro') { camera.position.copy(INTRO.pos); camera.lookAt(INTRO.look); setFov(50); return; }
  if (DUN.active) { dungeonCamera(); return; }
  if (G.mode === 'eva' || (G.mode === 'pause' && EVA.active)) { evaCamera(); return; }
  if (IN.active) { if (GUN.aktiv) turmKamera(); else applyWalkCamera(); return; }
  if (G.mode === 'rover' || (G.mode === 'pause' && ROVER.active) || (G.mode === 'map' && ROVER.active)) { if (FOOT.active) footCamera(dt); else roverCamera(dt); return; }
  if (G.mode === 'menu' || (G.mode === 'dock' && G.dockedAt) || (G.mode === 'map' && G.dockedAt)) {
    const big = world.stations[0] && world.stations[0].R > 400;   // neue, doppelt so große Bastion
    const c = G.mode === 'menu' ? { x: 0, y: 0, z: 0, R: 260 } : G.dockedAt;
    const R = G.mode === 'menu' ? (big ? 1450 : 820) : c.R * (c.R > 400 ? 2.6 : 3.2);
    // Hauptmenü: sanft um den Blickwinkel pendeln, an dem der Nebel hinter der Szene liegt; angedockt weiter kreisen
    if (G.mode === 'menu') { menuT += dt; orbit = MENU_ORBIT + Math.sin(menuT * 0.045) * 0.45; } else orbit += dt * 0.04;
    camera.position.set(c.x + Math.cos(orbit) * R, c.y + R * 0.3, c.z + Math.sin(orbit) * R);
    _t.set(c.x, c.y, c.z);
    camera.lookAt(_t);
    if (G.mode === 'menu') { _o.set(1, 0, 0).applyQuaternion(camera.quaternion); _t.addScaledVector(_o, -R * 0.32); camera.lookAt(_t); }
    setFov(55);
    return;
  }
  if (cockpitKamera(CAM.yaw, CAM.pitch)) { setFov(Math.max(settings.fov, 76)); return; }      // Cockpit-Sicht (Taste K, game/cockpit.ts): Kamera am Augpunkt, starr im Schiff
  _e.set(clamp(P.pitch + CAM.pitch, -1.5, 1.5), P.yaw + CAM.yaw, 0);
  const cs = stats(), cm = cs.camBack / 24;
  _o.set(0, cs.camUp * CAM.zoom, cs.camBack * CAM.zoom).applyEuler(_e);
  _t.set(P.x, P.y, P.z).add(_o);
  // Feste Kamera (Alpha 1.15, Wunsch des Spielers): Sie sitzt starr am eingestellten Platz hinter dem Schiff. Kein Nachziehen beim Beschleunigen
  // und Wenden, kein Wackeln bei Treffern, kein weiteres Blickfeld bei Tempo, Sprung oder Eintritt. Abstand (Mausrad), Blickfeld (Einstellungen)
  // und die freie Umsicht (V, C, mittlere Maustaste) bleiben.
  camPos.copy(_t); G.camInit = true;
  camera.position.copy(camPos);
  const f = fwd();
  // normal: Blick voraus; freie Kamera: Blick auf das Schiff
  const a = 40 * cm * (1 - CAM.w);
  camera.lookAt(P.x + f.x * a, P.y + f.y * a + cs.camUp * 0.3 * (1 - CAM.w * 0.6), P.z + f.z * a);
  setFov(settings.fov);
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
  const m = G.mode, live = m === 'play' || m === 'jump' || m === 'dock' || m === 'walk' || m === 'rover' || m === 'entry' || m === 'launch' || m === 'dungeon' || m === 'eva';
  outside.muted = IN.active || DUN.active;   // zu Fuß in Station, Schiff oder Wrack: kein Gefechtslärm von draußen
  outside.k = world.surface && (m === 'rover' || m === 'walk') ? 0.3 : 1;   // zu Fuß oder im Rover auf dem Planeten: das Gefecht ist oben am Himmel
  outside.at.x = camera.position.x; outside.at.y = camera.position.y; outside.at.z = camera.position.z;
  if (!(live || m === 'menu' || m === 'intro')) return;
  G.time += dt;
  if (live) P.playtime += dt;
  if (m !== 'play' && G.jd) { G.jd = 0; jdStop(); }
  if (m === 'play') {
    updatePlayer(dt);
    updateJumpDrive(dt);
    updatePickups(dt);
    const g = gateHit();
    if (g) startJump(g);
    else if (world.orbit && !G.dead && d3(P.x, P.y, P.z, world.orbit.x, world.orbit.y, world.orbit.z) < 62) startEntry('surface');
    else if (world.surface && !G.dead && P.y > SURF.ceiling) startEntry('orbit');
    updateSurfaceFlight(dt);
  } else if (m === 'jump') updateJump(dt);
  else if (m === 'walk') {
    updateBordflug(dt);
    if (!IN.active && GUN.aktiv) schuetzeAus();
    if (G.mode === 'walk') { if (GUN.aktiv) { const f = BORD.aktiv ? 1 : 0, gv = GUN.gast ? gastFahrt(GUN.gast) : null; if (gv) updateSchuetze(dt, gv.x, gv.y, gv.z); else updateSchuetze(dt, P.vx * f, P.vy * f, P.vz * f); } else updateWalk(dt); }      // am Schützenplatz richtet die Maus den Turm (turm.ts)
  }      // im Flug an Bord: Autopilot bewegt das Schiff (bordflug.ts)
  else if (m === 'dungeon') updateDungeon(dt);
  else if (m === 'eva') updateEva(dt);      // Außenbordeinsatz (eva.ts)
  else if ((m as string) === 'launch') { updateHangarSequence(dt); updateRoomLife(dt); }
  else if (m === 'dock' && IN.active) updateRoomLife(dt);
  else if (m === 'entry') updateEntry(dt);
  else if (m === 'rover') { if (G.dead) updatePlayer(dt); else if (FOOT.active) updateFoot(dt); else updateRover(dt); }
  if (world.surface && !IN.active && !DUN.active) updateSalvage(dt, (x, y, z) => puff(x, y, z, (Math.random() - 0.5) * 1.5, 2 + Math.random() * 2, (Math.random() - 0.5) * 1.5, '#2a2622', 2.2));
  if (live) updateMissions(dt);
  updateAufgaben();      // Fristen der Stationsaufgaben
  hook('Wetter', () => updateWetter(dt, camera.position));
  hook('Recht', updateRecht);      // Tag, Nacht und Wetter auf Planeten (wetter.ts)
  if (world.surface && G.mode === 'rover') hook('Bodenaufgaben', () => updateBoden(dt, FOOT.active ? FOOT.x : ROVER.x, FOOT.active ? FOOT.z : ROVER.z));
  if (live) updateBegegnungen(dt);      // Begegnungen unterwegs
  updateAsteroids(dt);
  if (m !== 'menu') { updateSpawning(dt); updateEnemies(dt); updateProjectiles(dt); updateStationDefense(dt); }
  if (m === 'play') updateApproachPrime();   // erstes Andocken an Stationen mit Deck beim Anflug vorbereiten (approachPrime.ts)
  updateTraffic(dt);
  updateWeltLeben(dt);   // Funkverkehr, Schürfer, Frachtkisten, Notrufe (weltLeben.ts)
  if (m !== 'menu' && m !== 'intro') { hook('akademie', () => updateAkademie(dt)); hook('altewerft', () => updateAlteWerft(dt)); hook('gedenkboje', () => updateGedenkboje(dt)); hook('sektor3', () => updateSektor3(dt)); }   // Orte in Heimstatt (Phase 2), Gedenkboje im Sonnenfeld
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
// Zusatzabläufe (Geschichte, Stadt, Effekte) dürfen das Bild nie anhalten: Ein Fehler dort wird einmal gemeldet, der Rest des Bildes läuft weiter.
// (Alpha 0.99 bis 0.99d: Ein Zugriff auf den fehlenden Spielstand im Hauptmenü warf hier in jedem Bild, die Schleife endete, der Schirm blieb leer.)
const hookErr = new Set<string>();
function hook(name: string, f: () => void) { try { f(); } catch (e) { if (!hookErr.has(name)) { hookErr.add(name); console.error('Fehler in ' + name + ':', e); meldeFehler('Fehler in ' + name + ': ' + String((e as any)?.message || e), (e as any)?.stack); } } }      // auch ans Serverlog (net.ts)
let ekHail = false, ekOut = false;      // Funkgruß der Eisenkrone schon gesendet; Schiff war seit dem letzten Ablegen schon weiter draußen
function loop(now: number, manual = false) {
  if (!manual) requestAnimationFrame(t => loop(t));      // zuerst das nächste Bild anmelden: Ein Fehler weiter unten beendet die Schleife nicht
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)) * TESTF.zeit;      // TESTF.zeit: Zeitlupe aus dem Testlabor (sonst 1)
  last = now;
  perfFrameStart();
  // Vorwärmen (engine.ts, warmScene): Solange die Shader eines neuen Innenraums übersetzt werden, steht das Spiel hinter der Blende
  if ((warm.hold || warm.wait) && (!manual || warm.strict)) { perfFrameEnd(); return; }
  simulate(dt);
  hook('Testlabor', () => updateTestlabor(dt));
  if (G.mode === 'scene' && IN.active) updateRoomLife(dt);   // in Kinoszenen steht die Welt, die Figuren im Raum sprechen aber weiter
  hook('Vorspann', () => updateIntro(dt));
  hook('Geschichte', () => updateStory(dt));
  hook('Kapitel 1', () => updateChapter1(dt));
  hook('Kapitel 2', () => updateChapter2(dt));
  hook('Kapitel 3', () => updateChapter3(dt));
  hook('Kapitel 4', () => updateChapter4(dt));
  hook('Kapitel 5', () => updateChapter5(dt));
  hook('Testschiff', () => updateTestShip(dt));
  hook('Stadt', () => updateCity(dt));
  hook('Basis-Effekte', () => updateBaseFx(dt));
  hook('Geländeschatten', () => updateGroundShade(dt));
  // Stadt: durchs offene Hallentor geflogen → andocken (Landeanflug im Hangar übernimmt)
  if (G.mode === 'play' && !G.dead && CITY.st && insideCityGate(P.x, P.y, P.z)) openDock(CITY.st);
  G.eBusy = G.mode === 'play' && (!!nearDock() || !!world.surface);
  // Eisenkrone: Die Gildehütte meldet sich beim ersten Anflug (einmal je Sitzung). Nur von draußen hereinkommend (vorher weiter als 1,4 km):
  // Bis Alpha 1.51 kam der Gruß samt Funkton direkt nach dem Ablegen, weil man dann noch im Umkreis steht.
  if (G.mode === 'play' && !G.dead && !ekHail && world.def?.id === 'heimstatt' && !world.surface) {
    const ek = stationById('eisenkrone'), d = ek ? d3(P.x, P.y, P.z, ek.x, ek.y, ek.z) : 1e9;
    if (d > 1400) ekOut = true;
    else if (ek && ekOut && d < 1100) { ekHail = true; radio('EISENKRONE', 'Gildehütte Eisenkrone an anfliegendes Schiff. Erz zur Annahme, Barren ab Lager. Folge der Lichterkette, das Tor ist frei.', '#ffb347'); }
  } else if (G.mode !== 'play') ekOut = false;
  // Grundgeräusch zu Fuß: im Schiff ein tiefes Brummen, in der Station leiser
  // Grundgeräusch: zu Fuß Schiff, Hangar oder Station; auf einer Planetenoberfläche der Wind (je nach Planetenart)
  {
    const onFoot = IN.active && (G.mode === 'walk' || G.mode === 'launch');
    const ground = !onFoot && !!world.surface && (G.mode === 'rover' || G.mode === 'play');
    const kind = ground ? JSON.stringify([(world.surface as any)?.kind, (world.surface as any)?.type, (world.surface as any)?.ground, (world.def as any)?.id]).toLowerCase() : '';
    const wind = /eis|ice|frost/.test(kind) ? 'amb_planet_ice' : /vulkan|lava|asche/.test(kind) ? 'amb_planet_lava' : 'amb_planet_wind';
    // Mine (seit 2026-11-26): leiser Luftzug statt des Hangar-Brummens (Nutzer: „durchgehend nerviges Geräusch“ in den Minen)
    ambience(DUN.active ? 'amb_planet_wind' : onFoot ? (IN.ship ? 'amb_ship' : IN.area === 'Hangardeck' || G.mode === 'launch' ? 'amb_hangar' : 'amb_station') : ground ? wind : null, DUN.active ? 0.09 : onFoot ? (IN.ship ? 0.2 : 0.22) : 0.3);
    // weitere Schleifen: Rover, Bohrer, Drohnen, Mutterschiff in der Nähe, anfliegender Torpedo
    const rv = ROVER.active && G.mode === 'rover' && !FOOT.active;
    // Rovermotor (seit 2026-11-25): Tonhöhe folgt der Drehzahl, Lautstärke Drehzahl und Gas (vorher nur Lautstärke nach Tempo, im Stand stumm)
    const rpmN = clamp((ROVER.rpm - 900) / 6100, 0, 1);
    loopVol('rover_engine', rv ? 0.1 + rpmN * 0.17 + Math.abs(ROVER.thr) * 0.08 : 0, 0.6 + rpmN * 0.85);
    loopVol('rover_drill', rv && (ROVER as any).drilling ? 0.4 : 0);
    const fly = G.mode === 'play' && !G.dead;
    loopVol('drone_hum', fly && P.dronesOn && stats().drones ? 0.1 : 0);
    let dm = 1e9, dt2 = 1e9;
    if (fly) {
      for (const e of world.enemies as any[]) if (e.type === 'mother') dm = Math.min(dm, d3(P.x, P.y, P.z, e.x, e.y, e.z));
      for (const b of world.ebullets as any[]) if (b.torp) dt2 = Math.min(dt2, d3(P.x, P.y, P.z, b.x, b.y, b.z));
    }
    loopVol('mother_hum', dm < 2600 ? 0.5 * (1 - dm / 2600) : 0);
    loopVol('torpedo_fly', dt2 < 900 ? 0.45 * (1 - dt2 / 900) : 0);
  }
  if (world.def && G.mode !== 'map') {
    animateStructures(dt);
    // Rampe und Leiter (setDoors): im Hangar und am Boden offen, im Flug und beim Landeanflug zu
    // Kanzel der Jäger und der Elster (ausstieg.ts): offen, solange der Pilot draußen ist (am Boden mit Bordleiter, im All beim Außenbord)
    updateKisten(dt);      // Kisten in der Welt, Traktorstrahl zur Rampe (kisten.ts)
    laderaumUpdate(ROVER.model?.g.parent && !ROVER.leih ? ROVER.kind : null);      // draußen = Modell steht in der Szene (auch während man an Bord ist)      // Kisten und Fahrzeug im Laderaum (laderaum.ts)
    if (IN.active && BORD.aktiv) { syncShip(); folgeSchiff(); setGear(SHIP.g, false, dt); setDoors(SHIP.g, false, dt); setKanzel(SHIP.g, false, dt); leiterZeigen(false); }      // im Flug an Bord: Schiff fliegt, Innenraum folgt
    else if (IN.active) { syncParkedShip(); setGear(SHIP.g, hangarGearDown(), dt); setDoors(SHIP.g, hangarGearDown() && RAMP.want, dt); setKanzel(SHIP.g, false, dt); leiterZeigen(false); }
    else if (ROVER.active) { syncLandedShip(); setGear(SHIP.g, true, dt); setDoors(SHIP.g, true, dt); setKanzel(SHIP.g, true, dt); leiterZeigen((kanzelInfo(SHIP.g)?.p || 0) > 0.6 && !eigeneLeiter(SHIP.g), ROVER.ship); }
    else {
      SHIP.g.visible = (G.mode === 'play' || G.mode === 'jump' || G.mode === 'pause' || G.mode === 'entry' || G.mode === 'eva') && !G.dead;
      setGear(SHIP.g, G.mode === 'entry', dt);   // im Flug eingezogen, beim Landeanflug ausgefahren (Milan: fährt aus und ein)
      const draussen = G.mode === 'eva' || (G.mode === 'pause' && EVA.active);
      setDoors(SHIP.g, (draussen && EVA.pump <= 0) || TRAKTOR.offen, dt);      // Außenbord: Heckrampe offen, sobald der Laderaum leer gepumpt ist; Traktorstrahl: offen, wenn eine Kiste naht
      setKanzel(SHIP.g, draussen, dt); leiterZeigen(false);
      for (const g2 of SHIP.glows) g2.visible = !draussen;      // im Flug an (am Boden aus: syncLandedShip; Außenbord aus)
      if (SHIP.g.visible) syncShip();
    }
    setDustVisible(!IN.active);
    INNEN.amb.value = IN.active ? 1 : 0.45;      // Schiffsinnenräume von draußen: weniger Umgebungslicht (innenFlaeche.ts)
    schiffslicht(IN.active || !world.surface ? 1 : 0.6);
    cockpitUpdate(dt, (G.mode === 'play' || G.mode === 'jump' || (G.mode === 'pause' && !EVA.active)) && !G.dead && !IN.active && !ROVER.active && !DUN.active && SHIP.g.visible);      // Leuchten der Schiffe auf Planeten draußen gedämpft (gltfShips.ts)
    turmBild(dt);      // Rückenturm: Stellung ans Modell (turm.ts)
    modulBild();      // Modulplätze im Technikraum: nach einem Umbau neu bestücken (modulplatz.ts)
    if (world.surface && G.mode === 'play') gastWarnung(dt, P.y, SURF.ceiling);      // Gäste an Bord: vor der Wolkendecke warnen (net.ts)
    updateCamera(dt);
    shadowSweep -= dt;
    if (shadowSweep <= 0) { shadowSweep = 0.4; markShadows(scene, sky); }
    if (DUN.active) aimShadows(camera.position.x, camera.position.y, camera.position.z, sunDir, 240, false);   // unter Tage kein Sonnenschatten
    else if (ROVER.active) aimShadows(FOOT.active ? FOOT.x : ROVER.x, FOOT.active ? FOOT.y : ROVER.y, FOOT.active ? FOOT.z : ROVER.z, sunDir, 110, true);
    else if (!IN.active && G.mode !== 'menu' && G.mode !== 'intro') aimShadows(P.x, P.y, P.z, sunDir, world.surface ? 320 : 240, true);
    else aimShadows(camera.position.x, camera.position.y, camera.position.z, sunDir, 240, false);
    updateSky(camera.position);
    hook('leitbojen', () => updateLeitbojen(camera.position));   // Leitbojen in Heimstatt
    updateFarView(camera.position, G.time);   // ferne Stationen und Tore verkleinert heranrücken (große Sektoren)
    updateAmbience(dt);
    syncParticles();
    syncBolts([world.bullets, world.ebullets]);
    render();
  } else if (world.def && prePass.fn) renderStill();   // Flottenband mit Figurenvorschau (Ausrüstung, Garderobe): Das Spiel steht, die Vorschau braucht trotzdem Bilder
  if (G.mode !== 'play' && G.mode !== 'rover') laserSound(false);
  if (G.mode === 'rover' && !FOOT.active) boosterSound(true, Math.min(1, Math.abs(ROVER.speed) / 26) * 0.45, 0.1);
  else if (G.mode === 'entry') boosterSound(true, 1, 0.6, 0.3);
  else if (G.mode === 'play' && !G.dead) boosterSound(true, G.thrust, Math.hypot(P.vx, P.vy, P.vz) / stats().max);
  else if (G.mode === 'jump') boosterSound(true, 1, 1, Math.min(1, (1.3 - G.jumpT) / 1.3));
  else boosterSound(false);
  drawHUD();
  if (world.def && G.mode !== 'map' && !IN.active && !DUN.active) drawFlare(ux, dt, flareOccluders());
  if (!(FOOT.active && world.surface && G.mode === 'rover')) hideFieldViewModel();   // Waffe der Ich-Sicht nur zu Fuß auf einem Planeten (blieb nach Sektorwechsel sonst im Bild, auch in der Station)
  if (GUN.aktiv && G.mode === 'walk') drawTurmHUD(); else drawWalkHUD();
  if (G.mode === 'play' || G.mode === 'rover') drawRecht();
  if (G.mode === 'eva') drawEva();      // Fahndung (recht.ts)
  if (!FOOT.active) { drawRoverHUD(); if (G.mode === 'rover' && ROVER.active) { drawSalvageHUD(ROVER.x, ROVER.z); drawGroundMarkers(); } } else drawFootHUD();
  if (G.mode === 'rover' && world.surface) drawBodenHUD(FOOT.active ? FOOT.x : ROVER.x, FOOT.active ? FOOT.z : ROVER.z, !FOOT.active && ROVER.active);
  drawDungeonHUD(FOOT.active ? FOOT.x : ROVER.x, FOOT.active ? FOOT.z : ROVER.z, ROVER.active, FOOT.active);
  if (G.mode === 'rover') $('prompt').classList.add('hidden');
  if (G.mode === 'play' || G.mode === 'jump' || G.mode === 'entry') updatePanels(dt);
  if (G.mode === 'map') drawBand();
  updateControls(dt, settings.hud);
  // Terminal offen (Kauf, Werft, Dienste): Aufgaben, Funk und Steuerungsleiste ausblenden, sie verdeckten den Schließen-Knopf (style.css body.terminal)
  document.body.classList.toggle('terminal', !$('dock').classList.contains('hidden'));
  netUpdate(dt);
  perfFrameEnd();
}
// Leistungsanzeige (F3): wo der Spieler gerade ist
perfHooks.where = () => {
  const sec = world.def ? (world.def as any).name || (world.def as any).id : 'kein Sektor';
  const at = DUN.active ? 'unter Tage/Wrack' : IN.active ? (IN.ship ? 'im Schiff · ' : 'Station · ') + (IN.station ? IN.station.name + ' · ' : '') + IN.area : CITY.walk ? 'Stadt zu Fuß · ' + CITY.name : CITY.st ? 'Stadt im Flug · ' + CITY.name : world.surface ? 'Oberfläche' : 'Weltraum';
  return `${sec} · ${at} · ${G.mode}`;
};

// Nur im Entwicklungsmodus: Zugriff für Tests über die Browser-Konsole
if ((import.meta as any).env?.DEV) (window as any).__lf = { START, P, G, world, enterShip, SHIP, enterSector, startJump, openDock, undock, openMap, closeMap, gateTo, stationById, placePlayer, audioDebug, sunDir, IN, showMenu, closeMenu, interact, enterSurface, startEntry, ROVER, sim: (sec: number) => { for (let i = 0; i < sec * 60; i++) simulate(1 / 60); },
  // ganze Bilder von Hand laufen lassen (wenn der Browser die Seite im Hintergrund anhält)
  tick: (sec: number, ms = 50) => { for (let i = 0, n = Math.round(sec * 1000 / ms); i < n; i++) loop(last + ms, true); } };   // ms: Bilddauer (Prüfskripte messen auch mit 60 Bildern je Sekunde)

// =============== Start ===============
// Schiffsmodelle laden (kurz), dann Menü zeigen. Ohne Modelle laufen die eingebauten Ersatzmodelle.
// Seit 2026-11-18: Der Ladebildschirm bleibt stehen, bis das Menü fertig vorbereitet ist. Vorher fror das erste Bild des Menüs 3,4 s ein
// (alle Shader auf einmal), und das Auspacken der Hintergrund-Pakete (Städte, Basen, Innenräume) ließ die Menüfahrt bis 10 s lang ruckeln.
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
Promise.all([loadShipModels().catch(() => false), loadStationModels().catch(() => false), loadCharModels().catch(() => false), loadDeck('bastion').catch(() => false), loadHangar().catch(() => false), loadEisenkrone().catch(() => false),
  loadRockModel().catch(() => false)]).then(async () => {     // Felsmodell vor dem Aufbau der Menüszene (sonst stehen dort die alten berechneten Brocken)
  // Hintergrund-Pakete gleich auspacken, solange der Ladebildschirm steht. Was beim ersten Besuch noch aus dem Netz kommt, wartet nicht länger als 6 s.
  const bg = Promise.all([hangarBgLoad().catch(() => false), loadDeck('eisenkrone').catch(() => false), loadDeck('pumpwerk').catch(() => false), preloadMeshRooms(), preloadBases(), preloadCities()]).catch(() => false);
  setTimeout(preloadSfx, 1500);   // Schritte, Klicks, Türen (Klänge entpackt der Browser nebenher)
  setShipModel('milan', 'Orange', true);
  showMainMenu();
  setupMenuScene();
  // Shader der Menüszene übersetzen (der Browser macht das nebenher), dann ein paar Bilder hinter dem Ladebildschirm zeichnen
  await Promise.race([compileFor(scene, scene), sleep(8000)]);
  requestAnimationFrame(loop);
  await Promise.race([bg, sleep(6000)]);
  try { primeStationEarly('bastion'); markPrimed('bastion'); } catch (e) { console.warn('Bastion vorab:', e); }   // erstes Andocken an der Bastion so schnell wie jedes weitere
  await Promise.race([compileFor(scene, scene), sleep(3000)]);    // was inzwischen dazukam (Verkehr, Ersatzmodelle)
  await sleep(250);
  hideBoot();
}).catch(e => { console.error('Start:', e); hideBoot(); });
setTimeout(hideBoot, 40000);   // Notbremse: nie dauerhaft hinter dem Ladebildschirm hängen
try {
  addEventListener('beforeunload', () => { if (G.mode !== 'menu') saveGame(); });
} catch (e) {
  const el = $('err');
  el.textContent = 'Das Spiel konnte nicht gestartet werden: ' + (e as Error).message;
  el.classList.remove('hidden');
  console.error(e);
}

// Testserver (test.letztecrew.de, Zweig test): kleiner Hinweis oben links, damit niemand Test und echtes Spiel verwechselt
if (location.hostname.startsWith('test.')) {
  const b = document.createElement('div'); b.textContent = 'TESTSERVER · F8 TESTLABOR';
  b.style.cssText = 'position:fixed;left:8px;top:6px;z-index:9999;font:700 11px "Share Tech Mono",Consolas,monospace;color:#ffb347;background:rgba(8,12,16,.65);padding:2px 8px;letter-spacing:2px;pointer-events:none';
  document.body.appendChild(b);
}
// Bewegungsstil der Figur: locker in Stationen (zu Fuß, nicht im eigenen Schiff) und Städten, sonst neutral (MannyAnimator setStyle)
mannyHooks.relaxed = () => (IN.active && !!IN.station && !IN.ship) || G.cityWalk;
initTestlabor();      // F8: Testlabor (nur Testserver, Entwicklungsserver, ?dev=1), game/testlabor.ts
