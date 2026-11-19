// Testhelfer Heimstatt Phase 2 (im eigenen Tab nach probelauf.js): await __ph2()
window.__ph2 = async () => {
  (0, eval)(window.name); await __setup();
  const lf = window.__lf, T = window.T, E = T.E;
  T.ST.setPlayer(T.ST.newPlayer('Testpilot'));
  Object.assign(T.ST.P.story, { prolog: 'done', ch1: 'done', ch2: 'done', ch3: 'done', ch4: 'done', ch5: 'done' });
  lf.closeMenu && lf.closeMenu();
  lf.enterSector('heimstatt', { station: 'bastion' }); lf.G.mode = 'play';
  const imp = new Function('u', 'return imp' + 'ort(u)');
  const res = performance.getEntriesByType('resource').map(r => r.name), find = k => res.find(n => n.includes(k));
  T.O = await imp(find('game/orte.ts')); T.AK = await imp(find('game/akademie.ts')); T.AW = await imp(find('game/altewerft.ts'));
  T.SF = await imp(find('game/schnellflug.ts'));
  T.snap = async (name, pos, tgt, fov = 60) => {
    const c = E.camera, f0 = c.fov; c.fov = fov; c.updateProjectionMatrix();
    c.position.set(...pos); c.lookAt(...tgt); c.updateMatrixWorld();
    E.render(); const url = E.renderer.domElement.toDataURL('image/jpeg', 0.85);
    c.fov = f0; c.updateProjectionMatrix();
    return (await fetch('http://127.0.0.1:5191/' + name + '.jpg', { method: 'POST', body: url })).status;
  };
  // Bild aus der Spielkamera samt HUD (beide Leinwände übereinander)
  T.game = async (name) => {
    lf.tick(1 / 20);
    const gl = document.getElementById('gl'), ui = document.getElementById('ui');
    const cv = document.createElement('canvas'); cv.width = gl.width; cv.height = gl.height; const g = cv.getContext('2d');
    E.render(); g.drawImage(gl, 0, 0); g.drawImage(ui, 0, 0, cv.width, cv.height);
    return (await fetch('http://127.0.0.1:5191/' + name + '.jpg', { method: 'POST', body: cv.toDataURL('image/jpeg', 0.85) })).status;
  };
  T.place = (x, y, z, yaw = 0, pitch = 0) => { const P = lf.P; P.x = x; P.y = y; P.z = z; P.vx = P.vy = P.vz = 0; P.yaw = yaw; P.pitch = pitch; };
  return 'ok';
};
