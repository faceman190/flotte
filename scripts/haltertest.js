// Prüfhelfer: Waffe in der Halterung am Körper (Rücken, Oberschenkel), Wegstecken und Ziehen (docs/lyra.md).
// Nur im eigenen Testfenster auf dem Entwicklungsserver, nach waffentest.js:
//   (0, eval)(await (await fetch('/scripts/waffentest.js')).text()); await __feld('waffe_kg30');
//   (0, eval)(await (await fetch('/scripts/haltertest.js')).text()); __halter();
// Legt window.H an:
//   H.strip(sichten, name)        je Sicht ein Bild nebeneinander; Sicht = [Winkel um die Figur in Grad (0 = von hinten, 90 = von rechts,
//                                 180 = von vorn), Abstand, Kamerahöhe, Blickhöhe]
//   H.film(n, bilder, sicht, name)  n Bilder im Abstand von `bilder` Spielbildern (16 ms) aus einer Sicht: Bewegung als Streifen
//   await H.blatt(waffen, name)   je Waffe (Kennung des Gegenstands) eine Reihe mit vier Sichten, weggesteckt
//   H.weg(true | false)           wegstecken / ziehen (footgun.ts gunHolster)
//   H.set(name, werte)            Halterung versetzen (Werte wie WeaponLayer.js HOLSTER, fehlende bleiben)
//   H.mess()                      Abstand Waffenknochen ↔ Halterung und Zustand der Waffenschicht
// Die Bilder gehen als Überlagerung ins Fenster und, wenn die Bildablage läuft (shotsink.cjs, Port 5191), unter `name` auf die Platte.
window.__halter = () => {
  const T3 = M.T3, E = M.E, cam = E.camera, an = M.MA.mannyAnim(), model = an.model, WL = an.weapon;
  const H = (window.H = { WL, an });
  const put = (cv, name) => {
    let im = document.getElementById('__shot'); if (!im) { im = document.createElement('img'); im.id = '__shot'; document.body.appendChild(im); }
    im.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;width:100vw;height:100vh;object-fit:contain';
    const url = cv.toDataURL('image/jpeg', 0.92); im.src = url;
    if (name) fetch('http://127.0.0.1:5191/' + name + '.jpg', { method: 'POST', body: url }).catch(() => {});
  };
  const lamp = new T3.PointLight(0xffffff, 5, 9, 1.2); E.scene.add(lamp);      // nachts und im Schatten: eine Lampe bei der Kamera
  const shot = (g, i, cw, ch, v, fov, x = i * cw, y = 0) => {
    const [ang, dist, h, look] = v, a = ang * Math.PI / 180, q = model.getWorldQuaternion(new T3.Quaternion());
    const p = model.getWorldPosition(new T3.Vector3()), d = new T3.Vector3(-Math.sin(a), 0, -Math.cos(a)).applyQuaternion(q);
    const oldF = cam.fov, op = cam.position.clone(), oq = cam.quaternion.clone();
    cam.position.copy(p).addScaledVector(d, dist); cam.position.y = p.y + h;
    cam.fov = fov; cam.updateProjectionMatrix(); cam.lookAt(p.x, p.y + look, p.z);
    lamp.position.copy(p).addScaledVector(d, 1.6); lamp.position.y = p.y + 2; lamp.visible = true;
    E.render(); lamp.visible = false;
    const src = E.renderer.domElement, sw = Math.min(src.width, src.height * cw / ch);
    g.drawImage(src, (src.width - sw) / 2, 0, sw, src.height, x, y, cw, ch);
    cam.fov = oldF; cam.updateProjectionMatrix(); cam.position.copy(op); cam.quaternion.copy(oq);
  };
  H.strip = (views, name, fov = 30) => {
    const n = views.length, cw = Math.floor(1280 / n), ch = 720, cv = document.createElement('canvas'); cv.width = cw * n; cv.height = ch;
    const g = cv.getContext('2d'); views.forEach((v, i) => shot(g, i, cw, ch, v, fov)); put(cv, name); return 'ok';
  };
  H.film = (n, step, view, name, fov = 30) => {
    const cols = Math.ceil(n / 2), cw = Math.floor(1280 / cols), ch = 360, cv = document.createElement('canvas'); cv.width = cw * cols; cv.height = ch * 2;      // zwei Reihen
    const g = cv.getContext('2d'); for (let i = 0; i < n; i++) { if (i) tk(step, 16); shot(g, i, cw, ch, view, fov, (i % cols) * cw, Math.floor(i / cols) * ch); } put(cv, name); return 'ok';
  };
  const cell = (cv) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = cv.toDataURL('image/jpeg', 0.95); });
  H.blatt = async (ids, name, views = [[0, 3.6, 1.2, 0.95], [55, 3.6, 1.2, 0.95], [90, 3.6, 1.2, 0.95], [-70, 3.6, 1.2, 0.95]], fov = 30) => {
    const cw = 320, ch = 360, cv = document.createElement('canvas'); cv.width = cw * views.length; cv.height = ch * ids.length; const g = cv.getContext('2d');
    for (let k = 0; k < ids.length; k++) {
      M.ST.P.gear.waffe = ids[k]; tk(6, 16); await new Promise((r) => setTimeout(r, 1000)); tk(24, 16);      // Lyras Modelle laden nach
      views.forEach((v, i) => shot(g, i, cw, ch, v, fov, i * cw, k * ch));
    }
    put(cv, name); return 'ok';
  };
  H.weg = (w) => M.FG.gunHolster(w);
  H.set = (name, werte) => { WL.setHolder(name, Object.assign(WL.holders[name].userData.spec, werte)); return WL.holders[name].userData.spec; };
  H.mess = () => {
    const h = WL.holder; if (!h) return { hs: WL.hs, halter: null };
    h.updateWorldMatrix(true, false); WL.wr.updateWorldMatrix(true, false);
    const a = new T3.Vector3().setFromMatrixPosition(h.matrixWorld), b = new T3.Vector3().setFromMatrixPosition(WL.wr.matrixWorld);
    return { hs: WL.hs, u: +WL.u.toFixed(2), w: +WL.w.toFixed(2), inHand: WL.inHand, abstand: +a.distanceTo(b).toFixed(3), halter: model.worldToLocal(a).toArray().map((v) => +v.toFixed(3)), sichtbar: WL.mount.visible };
  };
  return 'bereit';
};
