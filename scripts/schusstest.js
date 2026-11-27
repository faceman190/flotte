// Prüfhelfer: Trifft der Schuss zu Fuß dort, wo das Fadenkreuz steht, und liegt die Leuchtspur in der Verlängerung des Laufs?
// Nur im eigenen Testfenster auf dem Entwicklungsserver, nach waffentest.js:
//   (0, eval)(await (await fetch('/scripts/waffentest.js')).text()); await __feld('waffe_kg30');
//   (0, eval)(await (await fetch('/scripts/schusstest.js')).text()); __schuss();          // Planet, alle Fälle
// Je Fall zwei Schüsse (der zweite 8 Bilder später, mit Hitze). Werte in Grad:
//   kreuz  Winkel zwischen Bildmitte und Einschlag, von der Kamera des gezeigten Bildes aus (bleibt unter der Streuung sp0 des Schusses)
//   lauf   Winkel zwischen dem Lauf der gezeigten Waffe und der Leuchtspur (Mündung → Einschlag)
//   fit    um so viel hat fitGun (mannyAvatar.ts) die Waffe im Bild des Schusses nachgedreht – so weit lag der Lauf vorher daneben
// Q.alt(): der Schuss von vor dem 27.11.2026 (vom Kopf in Blickrichtung) zum Vergleich, als Winkel zum Fadenkreuz.
window.__schuss = (fälle) => {
  const T3 = M.T3, cam = M.E.camera, F = M.OF.FOOT, FF = M.FF, MA = M.MA, mouse = M.INP.mouse, K = M.INP.keys;
  const deg = (r) => +(r * 180 / Math.PI).toFixed(2), WL = MA.mannyAnim().weapon;
  const Q = (window.Q = {});
  // Lauf der gezeigten Waffe (Welt): Lyras Waffen liegen im Rahmen des Waffenknochens (x = Lauf), die des Spiels im Sockel (−z = Lauf)
  Q.barrel = () => {
    WL.mount.updateWorldMatrix(true, true);
    const q = new T3.Quaternion(), lyra = WL.mount.children.some((c) => c !== WL.socket);
    if (lyra) { WL.mount.getWorldQuaternion(q); return new T3.Vector3(1, 0, 0).applyQuaternion(q); }
    WL.socket.getWorldQuaternion(q); return new T3.Vector3(0, 0, -1).applyQuaternion(q);
  };
  Q.shot = () => {
    const n0 = FF.SHOT.n, sp0 = deg(M.FG.gunSpread(M.D.weapon().spread));
    mouse.down = true; tk(1, 16); mouse.down = false;
    if (FF.SHOT.n === n0) return { kein: true };
    cam.updateMatrixWorld();
    const cp = new T3.Vector3().setFromMatrixPosition(cam.matrixWorld), cd = cam.getWorldDirection(new T3.Vector3());
    const end = FF.SHOT.end.clone(), tr = end.clone().sub(FF.SHOT.a), L = tr.length(); tr.normalize();
    return { kreuz: deg(cd.angleTo(end.clone().sub(cp).normalize())), sp0, lauf: deg(Q.barrel().angleTo(tr)), fit: deg(MA.FIT.last), weit: +cp.distanceTo(end).toFixed(1), spur: +L.toFixed(1) };
  };
  Q.alt = (terrainAt) => {
    const ey = F.y + F.jy + M.AV.eyeH(), c = Math.cos(F.pitch), d = new T3.Vector3(-Math.sin(F.yaw) * c, Math.sin(F.pitch), -Math.cos(F.yaw) * c);
    let t = 0.5; for (; t < 120; t += 0.25) if (terrainAt(F.x + d.x * t, F.z + d.z * t) > ey + d.y * t) break;
    cam.updateMatrixWorld();
    const p = new T3.Vector3(F.x + d.x * t, ey + d.y * t, F.z + d.z * t).sub(new T3.Vector3().setFromMatrixPosition(cam.matrixWorld)).normalize();
    return deg(cam.getWorldDirection(new T3.Vector3()).angleTo(p));
  };
  const out = {};
  const run = (name, tp, pitch, ads, lauf) => {
    if (fälle && !fälle.some((f) => name.startsWith(f))) return;
    M.AV.VIEW.tp = tp; mouse.right = !!ads; F.pitch = pitch; K.KeyW = !!lauf;
    tk(lauf ? 110 : 80, 16);
    const carry = +WL.carryW.toFixed(2), a = Q.shot(); tk(8, 16); const b = Q.shot();
    out[name] = { carry, a, b }; K.KeyW = false; mouse.right = false; tk(20, 16);
  };
  for (const tp of [true, false]) {
    const v = tp ? 'aussen' : 'ich';
    for (const p of [0, -0.2, -0.6, 0.4]) run(`${v}_stand_${p}`, tp, p);
    for (const p of [-0.2, -0.5]) run(`${v}_zielen_${p}`, tp, p, true);
    for (const p of [-0.2, -0.5]) run(`${v}_lauf_${p}`, tp, p, false, true);
  }
  return { out, fehler: (window.__errs || []).slice(0, 5) };
};
