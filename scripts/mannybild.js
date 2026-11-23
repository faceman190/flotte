// Bildhelfer für die Spielerfigur (nach decktest.js und mannytest.js, nur im eigenen Testfenster auf dem Entwicklungsserver):
//   (0, eval)(await (await fetch('/scripts/mannybild.js')).text()); await __bild();
//   MB.strip(spalten, zeilen, w, h)   legt ein Bildraster an (Vollbild-Überlagerung)
//   MB.cell(winkel, abstand, höhe, blickhöhe, text)   zeichnet die Figur aus dieser Richtung ins nächste Feld
//                                                     (winkel 0 = von vorn, π = von hinten; ohne lf.tick, zeigt den Stand von jetzt)
//   MB.hold(code, an)                 Taste halten / loslassen
//   MB.save(name)                     Raster an die Bildablage schicken (scratchpad/shotsink.cjs, Port 5191)
//   MB.frames(sek, schritte, …cell)   n Bilder im Abstand sek, je eines ins Raster
window.__bild = async () => {
  const E = window.DT.E, a = window.MT.anim, lf = window.DT.lf;
  const T3 = await (new Function('u', 'return imp' + 'ort(u)'))(performance.getEntriesByType('resource').map(r => r.name).find(u => u.includes('/node_modules/.vite/deps/three.js')));
  const M = (window.MB = { T3 });
  let cv = null, cx = null, n = 0, cols = 1, W = 480, H = 480;
  M.strip = (c, r, w = 480, h = 480) => {
    if (cv) cv.remove();
    cols = c; W = w; H = h; n = 0;
    cv = document.createElement('canvas'); cv.width = W * c; cv.height = H * r; cv.id = '__strip';
    cv.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;object-fit:contain;background:#000';
    document.body.appendChild(cv); cx = cv.getContext('2d');
  };
  M.cell = (ang, dist = 2.3, h = 1.2, look = 1.0, label = '') => {
    a.model.updateWorldMatrix(true, false);
    const p = new T3.Vector3().setFromMatrixPosition(a.model.matrixWorld), q = new T3.Quaternion().setFromRotationMatrix(a.model.matrixWorld);
    const up = new T3.Vector3(0, 1, 0).applyQuaternion(q), f = new T3.Vector3(0, 0, 1).applyQuaternion(q), r = new T3.Vector3(1, 0, 0).applyQuaternion(q);
    const c = E.camera;
    c.position.copy(p).addScaledVector(f, Math.cos(ang) * dist).addScaledVector(r, Math.sin(ang) * dist).addScaledVector(up, h);
    c.up.copy(up); c.lookAt(p.clone().addScaledVector(up, look)); c.updateMatrixWorld(true);
    E.render();
    const d = E.renderer.domElement, s = Math.max(W / d.width, H / d.height), sw = W / s, sh = H / s, x0 = (n % cols) * W, y0 = Math.floor(n / cols) * H;
    cx.drawImage(d, (d.width - sw) / 2, (d.height - sh) / 2, sw, sh, x0, y0, W, H);
    cx.fillStyle = '#fff'; cx.font = '18px sans-serif'; cx.fillText(label, x0 + 8, y0 + 22);
    n++;
  };
  M.frames = (sec, steps, ang, dist, h, look, label = '') => { for (let i = 0; i < steps; i++) { lf.tick(sec); M.cell(ang, dist, h, look, `${label} ${((i + 1) * sec).toFixed(2)} s ${a.state}`); } };
  M.hold = (c, on) => window.dispatchEvent(new KeyboardEvent(on ? 'keydown' : 'keyup', { code: c, key: c, bubbles: true }));
  M.save = async (name) => (await fetch('http://127.0.0.1:5191/' + name, { method: 'POST', body: cv.toDataURL('image/jpeg', 0.88) })).text();
  return 'ok';
};
