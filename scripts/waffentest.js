// Prüfhelfer für die Waffe in der Hand der Spielerfigur (docs/lyra.md). Nur im eigenen Testfenster auf dem Entwicklungsserver:
//   (0, eval)(await (await fetch('/scripts/waffentest.js')).text()); await __waffe();
// Stellt einen Testpiloten in den Hangar der Bastion, gibt ihm überall eine Waffe (MANNY.test) und legt window.WT an:
//   WT.X                    die Testwaffe: { id, lyra, aim, shots, hits, reload } – id wie in mineArt WDEFS, lyra 'rifle' | 'pistol' | 'shotgun'
//   WT.tk(n)                n Bilder von 33 ms rechnen
//   WT.strip(zustände, sicht)  je Zustand (Funktion, die WT.X setzt und WT.tk ruft) ein Bild nebeneinander, als Vollbild-Überlagerung
//                           sicht = [Winkel um die Figur in Grad (−70 = von rechts vorn), Abstand, Kamerahöhe, Blickhöhe, Versatz nach vorn]
// Der Hangar ist dunkel: Eine Lampe folgt der Figur.
window.__waffe = async () => {
  Storage.prototype.setItem = function () {};
  window.__errs = window.__errs || []; window.addEventListener('error', e => __errs.push(String(e.message)));
  const oe = console.error; console.error = (...a) => { __errs.push(a.map(String).join(' ').slice(0, 300)); oe(...a); };
  window.requestAnimationFrame = f => setTimeout(() => f(performance.now()), 16);
  (0, eval)(await (await fetch('/scripts/decktest.js')).text()); await __deck(); DT.enter('bastion'); await DT.ready();
  (0, eval)(await (await fetch('/scripts/mannytest.js')).text()); const r = await __manny(); if (typeof r === 'string') return r;
  const dyn = new Function('u', 'return imp' + 'ort(u)'), T3 = await dyn(performance.getEntriesByType('resource').map(e => e.name).find(u => u.includes('/node_modules/.vite/deps/three.js')));
  const lf = window.__lf, E = DT.E, anim = MT.anim, model = anim.model;
  const W = (window.WT = { T3, anim, layer: anim.weapon });
  W.X = MT.MA.MANNY.test = { id: 'ar39', lyra: undefined, aim: true, shots: 0, hits: 0, reload: -1 };
  W.tk = (n = 20) => { for (let i = 0; i < n; i++) lf.tick(1 / 30, 33); };
  const lamp = new T3.PointLight(0xffffff, 6, 8, 1.2); E.scene.add(lamp);
  W.strip = (states, view = [-70, 2.3, 1.45, 1.3, 0.45], fov = 36) => {
    const n = states.length, cw = Math.floor(800 / n), ch = 600, cv = document.createElement('canvas'); cv.width = cw * n; cv.height = ch;
    const g = cv.getContext('2d'), oldF = E.camera.fov;
    states.forEach((fn, i) => {
      const v = fn() || view, q = model.getWorldQuaternion(new T3.Quaternion()), [ang, dist, h, look, fwd] = v;
      const p = model.getWorldPosition(new T3.Vector3()).add(new T3.Vector3(0, 0, fwd || 0).applyQuaternion(q));
      const d = new T3.Vector3(Math.sin(ang * Math.PI / 180), 0, Math.cos(ang * Math.PI / 180)).applyQuaternion(q);
      lamp.position.copy(p).addScaledVector(d, 1.4); lamp.position.y = p.y + 1.9;
      E.camera.position.copy(p).addScaledVector(d, dist); E.camera.position.y = p.y + h;
      E.camera.fov = fov; E.camera.updateProjectionMatrix(); E.camera.lookAt(p.x, p.y + (look ?? 1.2), p.z);
      E.render();
      const src = E.renderer.domElement, sw = src.height * cw / ch;
      g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, i * cw, 0, cw, ch);
    });
    E.camera.fov = oldF; E.camera.updateProjectionMatrix();
    let im = document.getElementById('__shot'); if (!im) { im = document.createElement('img'); im.id = '__shot'; document.body.appendChild(im); }
    im.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;width:100vw;height:100vh;object-fit:contain';
    im.src = cv.toDataURL('image/jpeg', 0.92);
    return 'ok';
  };
  W.tk(40);
  return 'bereit';
};

// Zu Fuß auf Eisgarten mit der Waffe `waffe` (Kennung des Gegenstands), im echten Spielablauf:
//   (0, eval)(await (await fetch('/scripts/waffentest.js')).text()); await __feld('waffe_kg30');
// Legt window.M (Module des laufenden Spiels), tk(n) und show() an (show: Bild und Anzeige zusammen als Vollbild-Überlagerung).
window.__feld = async (waffe = 'waffe_kg30', tp = true) => {
  Storage.prototype.setItem = function () {};
  window.__errs = window.__errs || []; window.addEventListener('error', e => __errs.push(String(e.message)));
  window.addEventListener('unhandledrejection', e => __errs.push('rej ' + String(e.reason).slice(0, 200)));
  const oe = console.error; console.error = (...a) => { __errs.push(a.map(String).join(' ').slice(0, 300)); oe(...a); };
  window.requestAnimationFrame = f => setTimeout(() => f(performance.now()), 16);
  for (let i = 0; i < 60 && !window.__lf; i++) await new Promise(r => setTimeout(r, 250));
  await new Promise(r => setTimeout(r, 2500));
  const dyn = new Function('u', 'return imp' + 'ort(u)'), res = () => performance.getEntriesByType('resource').map(r => r.name);
  window.imp = n => dyn(res().find(u => u.includes(n)));
  const M = (window.M = {});
  for (const [k, p] of Object.entries({ ST: 'game/state.ts', AV: 'game/avatar.ts', MA: 'game/mannyAvatar.ts', OF: 'game/onfoot.ts', FF: 'game/fieldfight.ts', FG: 'game/footgun.ts', FX: 'game/footfx.ts',
    D: 'game/dungeon.ts', INV: 'game/inventory.ts', HUD: 'ui/footHud.ts', INP: 'core/input.ts', E: 'core/engine.ts', AU: 'core/audio.ts', T3: 'deps/three.js' })) M[k] = await imp('/' + (p.startsWith('deps') ? 'node_modules/.vite/' : 'src/') + p);
  const lf = window.__lf; lf.START.on = false;
  M.ST.setPlayer(M.ST.newPlayer('Testpilot')); lf.tick(0.2);
  M.ST.P.gear = Object.assign({}, M.ST.P.gear, { waffe });
  lf.enterSurface('eisgarten'); lf.tick(0.5);
  M.OF.landAtBase(lf.world.stations[0], true); lf.G.mode = 'rover'; M.AV.VIEW.tp = tp;
  window.tk = (n = 20, ms = 33) => { for (let i = 0; i < n; i++) lf.tick(ms / 1000, ms); };
  window.show = (cross = 72) => {
    if (cross) M.HUD.drawFootCross(cross);      // das Fadenkreuz zeichnet das Spiel nur mit eingefangener Maus
    const src = M.E.renderer.domElement, ui = document.getElementById('ui'), cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
    const g = cv.getContext('2d'); g.drawImage(src, 0, 0); if (ui) g.drawImage(ui, 0, 0, cv.width, cv.height);
    let im = document.getElementById('__shot'); if (!im) { im = document.createElement('img'); im.id = '__shot'; document.body.appendChild(im); }
    im.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;width:100vw;height:100vh;object-fit:contain'; im.src = cv.toDataURL('image/jpeg', 0.92);
    return cv.width + 'x' + cv.height;
  };
  for (let k = 0; k < 60 && !M.MA.mannyAnim(); k++) { await new Promise(r => setTimeout(r, 500)); tk(1); }
  tk(30); await new Promise(r => setTimeout(r, 2500)); tk(10);
  return 'bereit';
};
