// Probelauf durch die Geschichte: Testhelfer und Bot für das Testfenster (Entwicklungsserver). Beschreibung: docs/probelauf.md
// Den ganzen Inhalt in die Konsole des EIGENEN Testfensters geben (nie in das Fenster, in dem gespielt wird).
// Danach:  await __setup(); await __bot(); B.start(); await B.run(20000)      (wiederholen, bis B.done)
// oder viele Läufe in frischen Fenstern:  __orch([{ name: 'neu', ms: 70000 }])  → Ergebnisse in O.res
// Der Text wird zusätzlich in window.name abgelegt: Nach einem Neuladen der Seite genügt  (0, eval)(window.name)

window.name = `
window.__setup = async () => {
  Storage.prototype.setItem = function(){};      // dieses Fenster schreibt keinen Spielstand (der echte liegt im selben Speicher)
  window.__errs = []; window.addEventListener('error', e => window.__errs.push(String(e.message))); window.addEventListener('unhandledrejection', e => window.__errs.push('rej ' + String(e.reason && e.reason.message || e.reason)));
  const oe = console.error; console.error = (...a) => { window.__errs.push(a.map(String).join(' ').slice(0, 300)); oe(...a); };
  for (let i = 0; i < 40 && !window.__lf; i++) await new Promise(r => setTimeout(r, 250));
  await new Promise(r => setTimeout(r, 1500));
  // die Modul-Instanzen des laufenden Spiels (über die Adresse, unter der sie geladen wurden; ein neuer import gäbe leere Kopien)
  const res = performance.getEntriesByType('resource').map(r => r.name), find = k => res.find(n => n.includes(k));
  const T = window.T = {}; const lf = window.__lf;
  T.ST = await import(find('game/state.ts')); T.E = await import(find('core/engine.ts')); T.INT = await import(find('game/interior.ts')); T.THREE = await import(find('deps/three.js'));
  T.S = await import(find('game/story.ts'));
  const E = T.E, THREE = T.THREE;
  // Spiel weiterrechnen, ohne Bilder zu zeichnen (rund fünfzigmal schneller als Echtzeit)
  T.stub = sec => { const r = E.renderer.render; E.renderer.render = function () {}; try { for (let t = 0; t < sec - 1e-6; t += 1 / 30) lf.tick(1 / 30); } finally { E.renderer.render = r; } };
  // Testpilot an einer Station absetzen; st = Stand der Geschichte (Vorgabe: alles abgeschlossen)
  T.dock = (sector, station, st) => {
    T.ST.setPlayer(T.ST.newPlayer('Testpilot'));
    Object.assign(T.ST.P.story, st || { prolog: 'done', ch1: 'done', ch2: 'done', ch3: 'done', ch4: 'done', ch5: 'done' });
    lf.closeMenu && lf.closeMenu();
    lf.enterSector(sector, {}); lf.openDock(lf.stationById(station));
    let n = 0; while (lf.G.mode !== 'walk' && n < 4000) { T.stub(0.1); n++; }
    // Raum → Welt (der Innenraum liegt gedreht und versetzt in der Welt): aus drei Kamerastellungen
    const at = (x, z) => { lf.IN.x = x; lf.IN.z = z; lf.IN.jy = 0; lf.tick(1e-4); return E.camera.position.clone(); };
    const O = at(0, -80), X = at(1, -80).sub(O), Z = at(0, -79).sub(O), Y = new THREE.Vector3().crossVectors(Z, X).normalize();
    T.w = (x, y, z) => O.clone().addScaledVector(X, x).addScaledVector(Z, z + 80).addScaledVector(Y, y - 1.7);
    return lf.G.mode;
  };
  T.ov = url => { let ov = document.getElementById('__ov'); if (!ov) { ov = document.createElement('img'); ov.id = '__ov'; ov.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:99999;object-fit:contain;background:#000'; document.body.appendChild(ov); } ov.src = url; return url.length; };
  // Bildfolge aus fester Kamera (Raumkoordinaten): cells Bilder im Abstand dt, als Raster ins Overlay (danach Bildschirmfoto)
  T.strip = (pos, tgt, fov, cells, dt, cols = 3, pre = 0) => {
    const rows = Math.ceil(cells / cols), cw = 512, ch = 384, cv = document.createElement('canvas'); cv.width = cols * cw; cv.height = rows * ch; const g = cv.getContext('2d');
    T.stub(pre);
    const c = E.camera, f0 = c.fov;
    for (let i = 0; i < cells; i++) {
      if (i) T.stub(dt);
      c.fov = fov; c.updateProjectionMatrix(); c.position.copy(T.w(...pos)); c.up.set(0, 1, 0); c.lookAt(T.w(...tgt)); c.updateMatrixWorld(true);
      E.render();
      g.drawImage(E.renderer.domElement, (i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    }
    c.fov = f0; c.updateProjectionMatrix();
    return T.ov(cv.toDataURL('image/jpeg', 0.88));
  };
  return 'ok';
};

// ---------- Bot ----------
// opts.choice: { c2: 'rat'|'gilde', c3: 'rat'|'wacht', c4: 'rat'|'wacht'|'gilde' } · opts.until: Schlüssel, vor dem er anhält ('ch3:0')
// opts.stop(story, B): Abbruchbedingung · opts.story: Stand, mit dem B.start beginnt (statt Prolog)
window.__bot = async (opts) => {
  opts = opts || {};
  const T = window.T, lf = window.__lf, res = performance.getEntriesByType('resource').map(r => r.name), find = k => res.find(n => n.includes(k));
  const C = await import(find('game/combat.ts')), D = await import(find('game/dungeon.ts')), F = await import(find('game/onfoot.ts')), SU = await import(find('game/surface.ts')), FF = await import(find('game/fieldfight.ts')), CI = await import(find('game/city.ts')), PL = await import(find('data/planets.ts'));
  const S = T.S, P = () => T.ST.P, G = lf.G, W = lf.world, IN = lf.IN, DUN = D.DUN, FOOT = F.FOOT;
  const B = window.B = { log: [], key: '', t0: 0, forced: [], snap: {}, done: false, errN: window.__errs.length, f: {}, choice: Object.assign({ c2: 'rat', c3: 'rat', c4: 'rat' }, opts.choice || {}) };
  const say = (...a) => B.log.push('[' + G.time.toFixed(0) + 's] ' + a.join(' '));
  const tick = sec => T.stub(sec);
  const strip = h => String(h).replace(/<[^>]+>/g, '');
  const obj = () => { const o = S.storyObjective(); return o ? o.title + ' :: ' + o.lines.map(l => (l[1] ? '[x] ' : l[2] ? '(i) ' : '[ ] ') + strip(l[0])).join(' | ') : '(kein Auftrag)'; };
  const mk = () => S.storyMarkers();
  const flying = () => G.mode === 'play' && !G.dockedAt && !IN.active;
  const st = () => P().story;
  const SEC_OF = { bastion: 'heimstatt', sonnenwacht: 'sonnenfeld', splittermine: 'splitter', wachtposten: 'wacht' };
  const leaveDun = () => { DUN.hp = DUN.maxHp; DUN.x = DUN.exit[0] * 3.2; DUN.z = DUN.exit[1] * 3.2; DUN.vx = DUN.vz = 0; tick(0.12); if (DUN.act) { say('  Wrack/Archiv:', DUN.prompt); DUN.act(); tick(0.2); } else say('HINWEIS: Ausgang ohne Aktion (' + DUN.prompt + ')'); };
  // aus Station, Basis, Planet oder Wrack zurück ins All
  const toSpace = () => {
    if (DUN.active) { leaveDun(); return; }
    if (IN.active || G.dockedAt) { lf.undock(); for (let i = 0; i < 400 && !(G.mode === 'play' || G.mode === 'rover'); i++) tick(0.1); return; }
    if (W.surface) { if (FOOT.active || G.mode === 'rover') { F.footOff(); SU.boardShip(); G.mode = 'play'; } lf.enterSector(P().sector, { orbit: true }); tick(0.3); return; }
    if (G.mode !== 'play') tick(0.3);
  };
  const goSector = id => { for (let i = 0; i < 4 && (!flying() || W.surface); i++) toSpace(); if (!flying() || W.surface) return false; if (!W.def || W.def.id !== id) { lf.enterSector(id, {}); tick(0.4); } return true; };
  const waitWalk = () => { for (let i = 0; i < 700 && G.mode !== 'walk'; i++) tick(0.1); return G.mode === 'walk'; };
  const dock = id => { if (G.dockedAt && G.dockedAt.id === id && IN.active && !IN.ship) return G.mode === 'walk' || waitWalk(); if (!goSector(SEC_OF[id])) return false; const s = lf.stationById(id); if (!s) { say('FEHLER: Station fehlt', id); return false; } lf.openDock(s); return waitWalk(); };
  const land = sector => { if (W.surface && P().sector === sector && !IN.active) return true; if (!goSector(sector)) return false; lf.enterSurface(sector); tick(0.5); return !!W.surface; };
  const dockBase = sector => { const id = PL.planetBaseId(sector); if (G.dockedAt && G.dockedAt.id === id && IN.active && !IN.ship) return G.mode === 'walk' || waitWalk(); if (!land(sector)) return false; if (FOOT.active || G.mode === 'rover') { F.footOff(); SU.boardShip(); G.mode = 'play'; } const s = W.stations[0]; if (!s) { say('FEHLER: keine Basis in', sector); return false; } lf.openDock(s); return waitWalk(); };
  const npc = name => T.INT.lifeDebug().persons.find(q => q.story && q.name === name);
  // vor die Figur stellen und E drücken (über das Ansprechziel des Spiels, nicht an ihm vorbei)
  const talkTo = name => { const q = npc(name); if (!q) return false; const a = q.home; IN.x = q.x + Math.sin(a) * 2.2; IN.z = q.z + Math.cos(a) * 2.2; IN.yaw = Math.atan2(-(q.x - IN.x), -(q.z - IN.z)); IN.pitch = 0; tick(0.15); if (!IN.target) { say('HINWEIS: kein Ansprechziel bei', name); return false; } say('  E:', IN.target.label()); lf.interact(); return true; };
  const flyTo = (p, d) => { const pp = P(); pp.x = p[0] + (d || 0); pp.y = p[1]; pp.z = p[2]; pp.vx = pp.vy = pp.vz = 0; };
  const kill = () => { let n = 0; for (let i = W.enemies.length - 1; i >= 0; i--) if (W.enemies[i].type !== 'mother') { C.killEnemy(W.enemies[i], i, true, false); n++; } if (n) say('  ' + n + ' Ferrox abgeschossen'); return n; };
  const foes = () => W.enemies.filter(e => e.type !== 'mother').length;
  const killAfter = sec => { if (!foes()) { B.f.foeT = 0; return; } if (!B.f.foeT) B.f.foeT = G.time; if (G.time - B.f.foeT > sec) { kill(); B.f.foeT = 0; } };
  const markScan = d => { const m = mk()[0]; if (!m) return; flyTo([m.x, m.y, m.z], d || 80); tick(0.3); S.noteScan(); };
  const onFoot = () => {
    if (FOOT.active) return true;
    if (G.mode === 'play' && W.surface) { const pp = P(); for (let i = 0; i < 12; i++) { pp.y = SU.groundAt(pp.x, pp.z) + 12; pp.vx = pp.vy = pp.vz = 0; if (SU.landShip()) { G.mode = 'rover'; break; } pp.x += 70; pp.z += 40; } if (G.mode !== 'rover') { say('HINWEIS: Landen misslungen', JSON.stringify(SU.landInfo())); return false; } }
    if (G.mode === 'rover') { F.leaveShipOnFoot(); tick(0.2); }
    return FOOT.active;
  };
  const footAct = label => { const t = F.footTargets.find(x => !label || x.label === label); if (!t) return false; if (!onFoot()) return false; F.footAt(t.x + 0.8, t.z + 0.8, 0); tick(0.2); const n = F.nearFootTarget(); if (!n) { say('HINWEIS: Fußziel nicht in Reichweite:', t.label); return false; } say('  E (zu Fuß):', n.label); n.act(); return true; };
  const killGuards = () => { let n = 0; for (const f of FF.FIGHT.foes) if (!f.dead && f.id === -1) { f.dead = true; f.g.visible = false; n++; } if (n) say('  ' + n + ' Wachdrohnen ausgeschaltet'); };
  // im Wrack oder Archiv: Schalter der Reihe nach, Wächter, Ziel (3,2 m je Kachel)
  const dunStep = () => {
    DUN.hp = DUN.maxHp; const at = (tx, tz) => { DUN.x = tx * 3.2; DUN.z = tz * 3.2; DUN.vx = DUN.vz = 0; tick(0.12); };
    const sw = DUN.sws.findIndex(q => !q.on);
    if (sw >= 0) { at(DUN.sws[sw].tx, DUN.sws[sw].tz); if (DUN.act) { say('  Wrack/Archiv:', DUN.prompt); DUN.act(); } else say('HINWEIS: Schalter ohne Aktion (' + DUN.prompt + ')'); return; }
    if (DUN.foes.some(f => f.boss)) { if (!B.f.bossT) B.f.bossT = G.time; if (G.time - B.f.bossT > 3) { for (const f of DUN.foes) f.hp = 0; if (!B.f.bossSaid) { B.f.bossSaid = 1; say('  Wächter ausgeschaltet (Trefferpunkte auf 0)'); } } return; }
    if (DUN.goal) { at(DUN.goal.tx, DUN.goal.tz); if (DUN.act) { say('  Wrack/Archiv:', DUN.prompt); DUN.act(); } else say('HINWEIS: Ziel ohne Aktion (' + DUN.prompt + ')'); return; }
  };
  // erst wegfliegen, dann langsam heran (so verlangt es das Spiel an Breschen und Schleusen)
  const approach = () => { const m = mk()[0]; if (!m) return; flyTo([m.x, m.y, m.z], 420); tick(0.4); flyTo([m.x, m.y, m.z], 70); tick(0.4); };
  const c = k => (st()[k] = st()[k] || {});
  const talkThenLeave = (flag, doDock, name) => () => { if (!flag()) { if (doDock()) talkTo(name); } else toSpace(); };
  // je Schritt eine Handlung; sie wird wiederholt, bis das Spiel den Schritt weiterschaltet
  const H = {
    'prolog:0': () => talkTo('Achterberg'),
    'prolog:1': () => { lf.openMap(); tick(0.3); lf.closeMap(); },
    'prolog:2': () => toSpace(),
    'prolog:3': () => { const s = st(), p = s.wp && s.wp[s.wi || 0]; if (p) flyTo(p, 30); },
    'prolog:4': () => { if (G.time - B.t0 > 4) P().cargo.erz = (st().erz0 || 0) + 10; },
    'prolog:5': () => killAfter(4),
    'prolog:6': () => { if (dock('bastion')) { tick(0.5); P().cargo.erz = 0; } },
    'prolog:7': () => { if (dock('bastion')) talkTo('Hollweg'); },
    'ch1:0': () => goSector('sonnenfeld'), 'ch1:1': () => dock('sonnenwacht'),
    'ch1:2': talkThenLeave(() => c('c1').tamm, () => dock('sonnenwacht'), 'Rika Tamm'),
    'ch1:3': () => markScan(),
    'ch1:4': () => { const m = mk()[0]; if (m) flyTo([m.x, m.y - 160, m.z], 500); },
    'ch1:5': () => killAfter(5),
    'ch1:6': () => { const m = mk()[0]; if (m) flyTo([m.x, m.y, m.z], 20); },
    'ch1:7': () => dock('bastion'), 'ch1:8': () => { if (dock('bastion')) talkTo('Hollweg'); },
    'ch2:0': () => goSector('splitter'), 'ch2:1': () => dock('splittermine'),
    'ch2:2': talkThenLeave(() => c('c2').kessler, () => dock('splittermine'), 'Kessler'),
    'ch2:3': () => { markScan(); killAfter(8); },
    'ch2:4': () => land('schlacke'),
    'ch2:5': () => { if (!land('schlacke') || !onFoot()) return; const r = c('c2').ruin; if (!r) return; if (!c('c2').guards) { F.footAt(r[0] + 40, r[1], 0); return; } if (G.time - B.t0 > 6) killGuards(); },
    'ch2:6': () => { if (land('schlacke')) footAct(); },
    'ch2:7': () => dock(B.choice.c2 === 'gilde' ? 'splittermine' : 'bastion'),
    'ch2:8': () => { const g = B.choice.c2 === 'gilde'; if (dock(g ? 'splittermine' : 'bastion')) talkTo(g ? 'Krull' : 'Hollweg'); },
    'ch3:0': () => goSector('wacht'), 'ch3:1': () => dock('wachtposten'),
    'ch3:2': talkThenLeave(() => c('c3').roth, () => dock('wachtposten'), 'Roth'),
    'ch3:3': () => { if (!(W.surface && CI.CITY.name === 'Neonhafen')) { B.slow = true; land('neuhafen'); return; } B.slow = false; if (!FOOT.active) { if (!IN.active) { lf.openDock(CI.CITY.st || W.stations[0]); waitWalk(); return; } T.INT.interiorHooks.toCity(); tick(0.5); return; } footAct('Mit Ilvar Brandt sprechen'); },
    'ch3:4': () => dock('bastion'),
    'ch3:5': talkThenLeave(() => c('c3').acht, () => dock('bastion'), 'Achterberg'),
    'ch3:6': () => { if (c('c3').damp) return; P().cargo.kupferb = Math.max(P().cargo.kupferb || 0, 4); dockBase('kupferbucht'); },
    'ch3:7': () => goSector('narbe'),
    'ch3:8': () => { markScan(250); killAfter(8); },
    'ch3:9': () => approach(),
    'ch3:10': () => { if (DUN.active) dunStep(); else approach(); },
    'ch3:11': () => { if (DUN.active) leaveDun(); else if (G.time - B.t0 > 6) goSector('wacht'); },
    'ch3:12': () => dock(B.choice.c3 === 'wacht' ? 'wachtposten' : 'bastion'),
    'ch3:13': () => { if (dock(B.choice.c3 === 'wacht' ? 'wachtposten' : 'bastion')) talkTo('Achterberg'); },
    'ch4:0': () => dock('bastion'),
    'ch4:1': talkThenLeave(() => c('c4').rat, () => dock('bastion'), 'Hollweg'),
    // Krull zweimal ansprechen: erst ohne Ferrit (sie nennt den Bedarf), dann mit
    'ch4:2': () => { const d = c('c4'); if (d.leser) { toSpace(); return; } if (!dockBase('heimstatt')) return; if (d.krull) P().cargo.ferrit = Math.max(P().cargo.ferrit || 0, 6); talkTo('Krull'); },
    'ch4:3': () => goSector('stummfeld'),
    'ch4:4': () => { const m = mk()[0]; if (m && Math.hypot(P().x - m.x, P().z - m.z) > 160) flyTo([m.x, m.y, m.z], 120); },
    'ch4:5': () => goSector('ferroxkern'),
    'ch4:6': () => land('ferroxkern'),
    'ch4:7': () => { if (land('ferroxkern')) footAct('Archiv der Erbauer betreten'); },
    'ch4:8': () => { if (DUN.active) dunStep(); else if (land('ferroxkern')) footAct('Archiv der Erbauer betreten'); },
    'ch4:9': () => toSpace(),
    'ch4:10': () => { const m = mk()[0]; if (m) flyTo([m.x, m.y, m.z], 250); },
    'ch4:11': () => { const m = mk().find(x => x.label === 'WEITSICHT'); if (m) flyTo([m.x, m.y, m.z], 260); killAfter(7); },
    'ch4:12': () => goSector('grauzone'),
    'ch4:13': () => { const ch = B.choice.c4; if (ch === 'gilde') dockBase('heimstatt'); else dock(ch === 'wacht' ? 'wachtposten' : 'bastion'); },
    'ch4:14': () => { const ch = B.choice.c4; const ok = ch === 'gilde' ? dockBase('heimstatt') : dock(ch === 'wacht' ? 'wachtposten' : 'bastion'); if (ok) talkTo('Achterberg'); },
    'ch5:0': () => dock('bastion'),
    'ch5:1': talkThenLeave(() => c('c5').met, () => dock('bastion'), 'Emil Sander'),
    'ch5:2': talkThenLeave(() => c('c5').tamm, () => dock('sonnenwacht'), 'Rika Tamm'),
    'ch5:3': () => { const d = c('c5'); if (!d.anna) { if (!goSector('lichtwall')) return; const m = mk()[0]; if (m && Math.hypot(P().x - m.x, P().z - m.z) > 800) flyTo([m.x, m.y, m.z], 600); return; } if (!d.core) { if (DUN.active) dunStep(); else approach(); return; } if (DUN.active) { leaveDun(); return; } killAfter(5); },
    'ch5:4': () => { const d = c('c5'); if (d.wach) { toSpace(); return; } if (!dockBase('heimstatt')) return; if (d.krull) { P().cargo.eis = Math.max(P().cargo.eis || 0, 12); P().cargo.helium = Math.max(P().cargo.helium || 0, 6); } talkTo('Krull'); },
    'ch5:5': () => { if (goSector('narbe')) approach(); },
    'ch5:6': () => { if (DUN.active) dunStep(); else approach(); },
    'ch5:7': () => { if (DUN.active) leaveDun(); else if (G.time - B.t0 > 6) goSector('wacht'); },
    'ch5:8': talkThenLeave(() => c('c5').plan, () => dock('bastion'), 'Emil Sander'),
    'ch5:9': () => { if (!goSector('heimstatt')) return; const m = mk()[0]; if (m) flyTo([m.x, m.y, m.z], 200); },
    'ch5:10': () => { if (!goSector('heimstatt')) return; const m = mk()[0]; if (m && !B.f.pos) { B.f.pos = 1; flyTo([m.x, m.y, m.z], 600); } killAfter(12); },
    'ch5:11': () => { if (dock('bastion')) talkTo('Hollweg'); },
  };
  // Schritte, die im All eines bestimmten Sektors spielen: Der Bot fliegt erst dorthin (nach dem Laden oder einem Absturz steht er woanders)
  const NEED = { 'ch1:3': 'sonnenfeld', 'ch1:4': 'sonnenfeld', 'ch1:5': 'sonnenfeld', 'ch1:6': 'sonnenfeld', 'ch2:3': 'splitter', 'ch3:8': 'narbe', 'ch3:9': 'narbe', 'ch3:10': 'narbe', 'ch4:4': 'stummfeld', 'ch4:10': 'ferroxkern', 'ch4:11': 'ferroxkern', 'ch5:6': 'narbe' };
  const LIMIT = { 'ch4:11': 1500, 'ch5:10': 1500, 'ch5:3': 600, 'ch4:4': 400 };
  B.start = () => {
    T.ST.setPlayer(T.ST.newPlayer('Testpilot')); P().story = undefined;
    lf.closeMenu && lf.closeMenu(); lf.enterSector('heimstatt', {}); lf.openDock(lf.stationById('bastion')); waitWalk();
    if (opts.story) { P().story = opts.story; S.resumeStory(); } else S.startPrologue();
    say('START', JSON.stringify(P().story), G.mode);
  };
  B.iter = () => {
    if (window.__errs.length > B.errN) { for (const e of window.__errs.slice(B.errN)) say('FEHLER (JS):', e); B.errN = window.__errs.length; }
    const ch = S.storyChapter();
    if (!ch) {
      const s = st(), k = ['prolog', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5'].find(x => s[x] !== 'done');
      if (!k) { if (B.key) say('   -> Schritt ' + B.key + ' fertig nach ' + (G.time - B.t0).toFixed(0) + ' s'); B.key = ''; B.done = true; say('ALLE KAPITEL FERTIG'); return; }
      // Das Spiel beginnt das nächste Kapitel 22 bis 30 s nach dem vorigen (echte Zeit). Der Bot beginnt es sofort: der Fall „Pilot bleibt im Hangar stehen“.
      if (s[k] === undefined) { if (S.dialogBusy() || S.sceneActive()) { if (S.sceneActive()) S.sceneNext(); tick(0.5); return; } S.resumeStory(); say('--- Kapitel beginnt:', k); }
      tick(0.2); return;
    }
    const key = ch.key + ':' + ch.n;
    if (opts.until && key === opts.until) { B.done = true; say('HALT vor', key); return; }
    if (opts.stop && opts.stop(st(), B)) { B.done = true; say('HALT (Prüfziel erreicht) bei', key); return; }
    if (key !== B.key) { if (B.key) say('   -> Schritt ' + B.key + ' fertig nach ' + (G.time - B.t0).toFixed(0) + ' s'); B.key = key; B.t0 = G.time; B.f = {}; B.snap[key] = JSON.stringify(P()); tick(0.25); say('SCHRITT ' + key + ' [' + G.mode + '] ' + obj() + ' · Marken: ' + (mk().map(m => m.label).join(', ') || '–')); }
    if (S.sceneActive()) { S.sceneNext(); tick(0.05); return; }
    if (S.dialogBusy()) { tick(0.5); return; }
    if (G.dead) { if (!B.f.dead) { B.f.dead = 1; say('HINWEIS: Schiff zerstört in', key); } tick(1); return; }
    P().hull = 1e6;      // der Bot prüft den Ablauf, nicht die Schwierigkeit
    const lim = LIMIT[key] || 300;
    if (G.time - B.t0 > lim) { say('HAENGT: ' + key + ' nach ' + lim + ' s [' + G.mode + '] ' + obj()); B.forced.push(key); S.goto(ch.n + 1); return; }
    try {
      const need = NEED[key];
      if (need && !DUN.active && !(W.def && W.def.id === need && !W.surface && flying())) goSector(need);
      else (H[key] || (() => say('kein Handler', key)))();
    } catch (e) { say('FEHLER in ' + key + ': ' + e.message + ' @ ' + String(e.stack || '').split('\\n').slice(1, 3).join(' | ').slice(0, 300)); B.forced.push(key + ' (Fehler)'); tick(2); }
    tick(0.3);
  };
  // läuft ms Millisekunden und gibt die neuen Protokollzeilen zurück; zwischendurch kurze Pausen, damit nachgeladene Modelle ankommen
  B.run = async ms => { const t0 = performance.now(); let n = 0; while (!B.done && performance.now() - t0 < ms) { B.iter(); if (++n % 25 === 0) await new Promise(r => setTimeout(r, B.slow ? 250 : 0)); } return B.log.splice(0); };
  return 'bot ok';
};

// ---------- viele Läufe nacheinander, jeder in einem frischen Fenster (iframe) ----------
// tests: [{ name, ms, choice?, snap?, stop? }] · snap: Spielstand als Text; er wird über „Weiterspielen“ geladen (der echte Ladeweg)
// stop: Funktionskörper mit den Größen s (Stand der Geschichte) und B
window.__orch = async (tests) => {
  const O = window.O = window.O || { res: [], busy: false, cur: '' };
  if (O.busy) return 'busy'; O.busy = true;
  const pause = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  for (const t of tests) {
    const out = { name: t.name, log: [], forced: [], errs: [], done: false }; O.cur = t.name; let f = null;
    try {
      f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:0;top:0;width:800px;height:600px;opacity:0.02;pointer-events:none;z-index:1';
      await new Promise(r => { f.onload = r; f.src = '/?t=' + Math.random(); document.body.appendChild(f); });
      const w = f.contentWindow;
      w.Storage.prototype.setItem = function () {};
      if (t.snap) { const get = w.Storage.prototype.getItem; w.Storage.prototype.getItem = function (k) { return /save/i.test(k) ? t.snap : get.call(this, k); }; }
      w.name = window.name; w.eval('(0, eval)(window.name)');
      await w.__setup(); await w.__bot({ choice: t.choice, stop: t.stop ? new w.Function('s', 'B', t.stop) : null });
      if (t.snap) { w.__lf.START.on = false; w.document.getElementById('mContinue').click(); w.T.stub(0.3); out.log.push('LADEN: ' + JSON.stringify(w.T.ST.P.story).slice(0, 160) + ' · mode ' + w.__lf.G.mode + ' · Sektor ' + w.T.ST.P.sector + (w.__lf.world.surface ? ' (Oberfläche)' : '')); }
      else w.B.start();
      const t0 = performance.now();
      while (!w.B.done && performance.now() - t0 < (t.ms || 60000)) { const l = await w.B.run(1500); out.log.push(...l); await pause(); }
      out.log.push(...w.B.log.splice(0)); out.done = w.B.done; out.forced = w.B.forced.slice(); out.errs = w.__errs.slice(); out.key = w.B.key; out.snap = w.B.snap; out.story = JSON.stringify(w.T.ST.P.story).slice(0, 300); out.wall = Math.round(performance.now() - t0);
    } catch (e) { out.crash = String(e && e.stack || e).slice(0, 500); }
    if (f) f.remove();
    O.res.push(out);
  }
  O.busy = false; O.cur = ''; return 'fertig';
};
// Lade-Tests aus den Spielständen eines Durchlaufs bauen (base = ein Ergebnis aus O.res mit snap): je Schritt laden und drei Schritte weiterspielen
window.__loadTests = base => Object.entries(base.snap).map(([key, snap]) => { const [chain, n] = key.split(':'); return { name: 'laden-' + key, snap, ms: 30000, stop: "const v = s['" + chain + "']; return v === 'done' || (typeof v === 'number' && v >= " + (+n + 3) + ");" }; });
`;
(0, eval)(window.name);
