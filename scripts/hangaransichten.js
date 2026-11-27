// Feste Ansichten des Bastion-Hangars im Testfenster (Entwicklungsserver), dieselben Kameras wie in Blender (bk_halle.py, bk_hangar2.py):
//   (0, eval)(await (await fetch('/scripts/hangaransichten.js')).text()); await __hvinit(); await hview('ankunft', 'neu')
// Braucht localStorage.qa_bv (Helfer __alles, __bvinit, __shot, camAuf) und einen Bildempfänger auf Port 5191; Bilder landen als <tag>-<name>.jpg.
window.HV = { ankunft: [[1.5, 46.0, 1.7], [-4.0, -112.0, 13.0], 17], rueckwand: [[-9.0, 8.0, 1.7], [1.0, 50.0, 14.0], 15], fussweg: [[-88.9, 29.6, 1.65], [-90.8, -40.0, 2.8], 20],
  tor: [[-34.0, -84.0, 1.7], [64.0, -113.0, 14.0], 16], deckmeister: [[15.5, 41.5, 1.6], [6.0, 49.5, 2.3], 20], uebersicht: [[-84.0, 40.0, 30.0], [22.0, -52.0, 2.0], 15],
  stellplatz: [[-42.0, 34.5, 1.7], [-58.0, -40.0, 9.0], 18], lager: [[62.0, 24.5, 1.7], [72.0, 46.0, 4.0], 18], geraet: [[-12.0, 30.5, 1.7], [-27.0, 18.0, 3.2], 18],
  werkstatt: [[-52.5, 33.5, 1.7], [-42.0, 43.5, 2.4], 18], dach: [[-20.0, 20.0, 1.7], [-40.0, -30.0, 40.0], 14], torpfeiler: [[40.0, -86.0, 1.7], [66.0, -112.0, 12.0], 16],
  wand: [[-70.0, -10.0, 1.7], [-92.0, -32.0, 16.0], 16], fracht: [[44.0, 36.0, 1.7], [60.0, 46.0, 1.6], 18], zoom: [[1.5, 46.0, 1.7], [-30.0, -40.0, 0.0], 90],
  boden: [[-8.0, 30.0, 1.7], [-22.0, 10.0, 0.0], 22], platz: [[0.0, 20.0, 1.7], [0.0, -60.0, 2.0], 18] };
window.hview = async (name, tag = 'hv') => {
  const [c, t, lens] = HV[name]; const R = p => T.w(p[0], p[2], -p[1]); __ov.on = false; DT.go(c[0], -c[1], 0);
  for (let i = 0; i < 8; i++) { T.stub(0.1); await __wt(120); }
  const E = T.E, cam = E.camera, f0 = cam.fov; cam.fov = 2 * Math.atan(18 / lens * (cam.aspect < 1.6 ? 0.75 : 9 / 16)) * 180 / Math.PI; cam.updateProjectionMatrix();
  camAuf(R(c), R(t)); const st = await __shot(tag + '-' + name); __ov.on = false; cam.fov = f0; cam.updateProjectionMatrix(); return st;
};
window.__hvinit = async () => {
  Storage.prototype.setItem = function () {}; window.__errs = []; window.addEventListener('error', e => __errs.push(String(e.message)));
  const ce = console.error; console.error = (...a) => { __errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); };
  (0, eval)(localStorage.qa_bv); await __alles();
  DT.enter('bastion'); const E = T.E, t0 = performance.now(); while (E.warm && E.warm.hold && performance.now() - t0 < 40000) await __wt(500);
  const res = performance.getEntriesByType('resource').map(r => r.name), dyn = new Function('u', 'return imp' + 'ort(u)');
  window.DKM = await dyn(res.find(n => n.includes('game/deck.ts'))); window.INT = await dyn(res.find(n => n.includes('game/interior.ts')));
  // Der Hangar der neuen Art lädt nach dem Deck: warten, dann tauscht ihn der Innenraum hinter der Blende aus
  const t1 = performance.now(); while (!DKM.hangar2Ready() && performance.now() - t1 < 60000) await __wt(500);
  for (let i = 0; i < 6; i++) { __lf.tick(0.2); await __wt(300); }
  const t2 = performance.now(); while (E.warm && E.warm.hold && performance.now() - t2 < 40000) await __wt(500);
  __lf.tick(0.3); await __bvinit();
  return { hold: !!(E.warm && E.warm.hold), h2: DKM.hangar2Ready(), sek: Math.round((performance.now() - t0) / 1000), errs: __errs.slice(0, 5) };
};
