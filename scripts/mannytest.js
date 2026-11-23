// Prüfhelfer für die Testfigur Manny (docs/manny.md). Nur im eigenen Testfenster auf dem Entwicklungsserver, Spiel mit ?manny=1 öffnen:
//   (0, eval)(await (await fetch('/scripts/decktest.js')).text()); await __deck(); DT.enter('bastion'); await DT.ready();
//   (0, eval)(await (await fetch('/scripts/mannytest.js')).text()); await __manny();
// Legt window.MT an:
//   MT.run(schritte)   spielt eine Folge [{ keys: ['KeyW'], sec: 2, yaw?: 0.5 }] ab und misst je Abschnitt
//                        rutsch_cm_je_m  wie weit die aufgesetzten Füße über den Boden gleiten, je Meter Weg der Figur
//                        rutsch_cm_s     mittleres Gleittempo eines aufgesetzten Fußes
//                        blick           größte Abweichung des Körpers von der Kamerarichtung (Grad)
//   MT.alt(true)       alter Anschluss (Tempo statt Absicht, altes Lauftempo) zum Vergleich
//   MT.mm(true)        Motion Matching statt der abgestimmten Zustände (im Spiel: ?mm=1)
//   MT.bench()         Messreihe über viele Richtungen und Loslass-Zeitpunkte: Gleiten (cm) und Haltungssprünge (Grad) je Art
//   MT.log()           welche Bewegungen der Animator gewählt hat
window.__manny = async () => {
  const res = performance.getEntriesByType('resource').map(r => r.name), dyn = new Function('u', 'return imp' + 'ort(u)'), imp = n => dyn(res.find(u => u.includes(n)));
  const AV = await imp('/src/game/avatar.ts'), INP = await imp('/src/core/input.ts'), MA = await imp('/src/game/mannyAvatar.ts'), T = await imp('/node_modules/.vite/deps/three.js');
  const lf = window.__lf, cam = (window.DT || window.T).E.camera;   // nach decktest.js (DT) oder probelauf.js/ph2test.js (T)
  AV.VIEW.tp = true;
  for (let k = 0; k < 90 && !MA.mannyAnim(); k++) { await new Promise(r => setTimeout(r, 1000)); lf.tick(1 / 30); }
  const anim = MA.mannyAnim(); if (!anim) return 'Manny nicht geladen';
  const bone = n => anim.model.getObjectByName(n);
  const balls = [bone('ball_l'), bone('ball_r')], thL = bone('thigh_l'), thR = bone('thigh_r'), pel = bone('pelvis');
  const v = () => new T.Vector3();
  const M = (window.MT = { anim, MA, AV, INP });
  // steht der Fuß laut der gerade gespielten Bewegung auf dem Boden? (Messung der Bewegung selbst: Ballen tief und langsam)
  const planted = () => {
    if (anim.state === 'mm' && anim._mm && anim._mm.name) { const f = anim.feat[anim._mm.name], i = f.index(anim._mm.t); return [!!f.contactL[i], !!f.contactR[i]]; }
    const n = anim.oneShot || (anim.state === 'loop' ? anim._dominantLoop : null), f = n && anim.feat[n];
    if (!f) return [anim.state === 'idle', anim.state === 'idle'];
    const i = f.index(anim.oneShot ? anim.actions[n].time : anim._dominantT);
    return [!!f.contactL[i], !!f.contactR[i]];
  };
  M.mm = on => { MA.MANNY.mm = !!on; return MA.MANNY.mm; };      // Motion Matching (Stufe 3) statt der abgestimmten Zustände
  M.alt = on => { MA.MANNY.alt = !!on; return MA.MANNY.alt; };
  M.log = (n = 40) => anim.log.slice(-n).map(e => `${e.t} ${e.from}>${e.to} ${e.clip.replace('M_Neutral_', '')}`);
  // MT.body = FOOT (onfoot.ts) oder DUN (dungeon.ts) setzen, wenn nicht im Innenraum gelaufen wird
  const B = () => M.body || lf.IN;
  M.run = (steps) => {
    const hz = 20;                                   // lf.tick rechnet immer Bilder von 50 ms
    const dt = 1 / hz, out = [];
    for (const st of steps) {
      if (st.yaw !== undefined && !st.turn) B().yaw = st.yaw;
      if (st.x !== undefined) { B().x = st.x; B().z = st.z; lf.tick(0.05); lf.tick(0.05); }
      for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) INP.keys[k] = (st.keys || []).includes(k);
      const last = balls.map(b => b.getWorldPosition(v())), p0 = pel.getWorldPosition(v());
      const sw0 = anim.mmSwitches || 0, bl0 = anim.inertializer.count, js0 = anim.inertializer.jumpSum || 0; anim.inertializer.jumpMax = 0; let stayMax = 0; let slide = 0, contact = 0, path = 0, blick = 0, ideal = 0, root = 0, cx = B().x, cz = B().z; const log0 = anim.log.length;
      const room = () => anim.model.parent.parent, lastR = balls.map(b => room().worldToLocal(b.getWorldPosition(v())));
      const n = Math.round(st.sec * hz);
      for (let i = 0; i < n; i++) {
        if (st.turn) B().yaw += st.turn * dt;
        lf.tick(dt);
        balls.forEach((b, j) => {
          const w = b.getWorldPosition(v()), h = anim.model.worldToLocal(w.clone()).y;
          const r = room().worldToLocal(w.clone());
          if (planted()[j] && h < 0.09 && i > 0) {
            slide += Math.hypot(w.x - last[j].x, w.z - last[j].z); contact += dt;
            // dasselbe, wenn die Figur genau so weit gegangen wäre wie die Bewegung selbst (unvermeidbarer Rest in den Clips)
            ideal += Math.hypot(r.x - lastR[j].x - (B().x - cx) + anim.rootDelta.x, r.z - lastR[j].z - (B().z - cz) + anim.rootDelta.z);
          }
          last[j].copy(w); lastR[j].copy(r);
        });
        root += Math.hypot(anim.rootDelta.x, anim.rootDelta.z); if (anim.state === 'mm' && anim._mm && Number.isFinite(anim._mm.lastStay)) stayMax = Math.max(stayMax, anim._mm.lastStay);
        path += Math.hypot(B().x - cx, B().z - cz); cx = B().x; cz = B().z;
        const L = thL.getWorldPosition(v()).sub(thR.getWorldPosition(v())); L.y = 0;
        const F = v().crossVectors(L, new T.Vector3(0, 1, 0)), c = cam.getWorldDirection(v());
        const a = Math.atan2(F.x, F.z) - Math.atan2(c.x, c.z); blick = Math.max(blick, Math.abs(Math.atan2(Math.sin(a), Math.cos(a)) * 180 / Math.PI));
      }
      out.push({ was: st.name || (st.keys || []).join('+') || 'stehen', sec: st.sec, weg_m: +path.toFixed(2), tempo: +(path / st.sec).toFixed(2),
        wechsel: (anim.mmSwitches || 0) - sw0, blenden: anim.inertializer.count - bl0, sprung_grad: +((anim.inertializer.jumpSum || 0) - js0).toFixed(1), sprung_max: +(anim.inertializer.jumpMax || 0).toFixed(1), bleibkosten_max: +stayMax.toFixed(1), rutsch_cm: +(slide * 100).toFixed(1), ideal_cm: +(ideal * 100).toFixed(1), clipweg_m: +root.toFixed(2), rutsch_cm_je_m: path > 0.3 ? +(slide * 100 / path).toFixed(1) : null, rutsch_cm_s: contact > 0 ? +(slide * 100 / contact).toFixed(1) : 0,
        blick: Math.round(blick), clips: anim.log.slice(log0).map(e => `${e.to}:${e.clip.replace('M_Neutral_', '')}`).join(' | ').slice(0, 260) });
    }
    for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft']) INP.keys[k] = false;
    return out;
  };
  // Standardlauf: Anlaufen, Laufen, Anhalten, Sprint, seitwärts, rückwärts, Kurve
  M.standard = () => M.run([
    { name: 'stehen', sec: 0.6, ...(M.body ? {} : { x: 0, z: -60, yaw: Math.PI }) },
    { name: 'anlaufen', keys: ['KeyW'], sec: 0.6 }, { name: 'laufen', keys: ['KeyW'], sec: 2 }, { name: 'anhalten', sec: 1.2 },
    { name: 'sprint', keys: ['KeyW', 'ShiftLeft'], sec: 2.5 }, { name: 'anhalten2', sec: 1.2 },
    { name: 'rechts', keys: ['KeyD'], sec: 2 }, { name: 'stopp3', sec: 1 },
    { name: 'zurück', keys: ['KeyS'], sec: 2 }, { name: 'stopp4', sec: 1 },
    { name: 'kurve', keys: ['KeyW'], sec: 2.5, turn: 1.2 }, { name: 'stopp5', sec: 1 },
  ]);
  // Messreihe: jede Richtung mit acht verschiedenen Laufzeiten (also Loslassen in jeder Schrittphase), dazu Sprint und Richtungswechsel.
  // Liefert die Summen je Art: Gleiten (cm) beim Anlaufen, Laufen, Anhalten und Wechseln sowie die Zahl der Sprünge der Suche.
  M.bench = () => {
    // jeder Durchgang beginnt wieder am Ausgangspunkt (freie Fläche im Hangar der Bastion), damit keine Wand im Weg ist
    const H = M.body ? {} : (M.home || { x: -4, z: -18, yaw: Math.PI });
    const steps = [{ name: 'stehen', sec: 0.6, ...H }];
    const dirs = [['KeyW'], ['KeyD'], ['KeyS'], ['KeyA'], ['KeyW', 'KeyD']];
    for (let k = 0; k < 8; k++) for (const d of [dirs[k % dirs.length], dirs[(k + 2) % dirs.length]]) {
      steps.push({ name: 'an', ...H, keys: d, sec: 0.5 }, { name: 'lauf', keys: d, sec: 0.6 + 0.1 * k }, { name: 'halt', sec: 2.4 });
    }
    for (let k = 0; k < 4; k++) steps.push({ name: 'an', ...H, keys: ['KeyW', 'ShiftLeft'], sec: 0.5 }, { name: 'lauf', keys: ['KeyW', 'ShiftLeft'], sec: 1 + 0.15 * k }, { name: 'halt', sec: 2.6 });
    for (let k = 0; k < 4; k++) steps.push({ name: 'an', ...H, keys: ['KeyW'], sec: 0.5 }, { name: 'lauf', keys: ['KeyW'], sec: 0.8 + 0.1 * k }, { name: 'wechsel', keys: ['KeyS'], sec: 1.2 }, { name: 'wechsel', keys: ['KeyD'], sec: 1.2 }, { name: 'halt', sec: 2.4 });
    const r = M.run(steps), sum = {};
    for (const x of r) { const g = (sum[x.was] = sum[x.was] || { n: 0, rutsch_cm: 0, ideal_cm: 0, weg_m: 0, wechsel: 0, max_cm: 0, blenden: 0, sprung_grad: 0, sprung_max: 0 }); g.n++; g.blenden += x.blenden; g.sprung_grad += x.sprung_grad; g.sprung_max = Math.max(g.sprung_max, x.sprung_max); g.rutsch_cm += x.rutsch_cm; g.ideal_cm += x.ideal_cm; g.weg_m += x.weg_m; g.wechsel += x.wechsel; g.max_cm = Math.max(g.max_cm, x.rutsch_cm); }
    for (const g of Object.values(sum)) for (const k of Object.keys(g)) g[k] = +g[k].toFixed(1);
    return sum;
  };
  return { clips: Object.keys(anim.actions).length, analyseMs: anim.analyseMs, loadMs: anim.loadMs, run: +anim.speedOf('run').toFixed(2), sprint: +anim.speedOf('sprint').toFixed(2), crouch: +anim.speedOf('crouch').toFixed(2), walk: +anim.speedOf('walk').toFixed(2),
    rechts: +anim.speedAt('run', 90).toFixed(2), zurueck: +anim.speedAt('run', 180).toFixed(2) };
};
