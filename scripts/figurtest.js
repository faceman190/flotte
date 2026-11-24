// Prüfhelfer für Figuren und Ausrüstung (docs/spielcharakter.md). Nur im eigenen Testfenster auf dem Entwicklungsserver:
//   (0, eval)(await (await fetch('/scripts/figurtest.js')).text()); await __figur();
// Baut auf scripts/waffentest.js auf (Testpilot im Hangar der Bastion, Lampe an der Figur) und legt window.FT an:
//   await FT.set(figur, { helm: 'helm_01', overall: 'overall_02', … })   Figur und Teile direkt setzen (ohne Gegenstände), wartet aufs Laden
//   FT.shot(sicht)            ein Bild der Figur als Kachel merken; sicht = [Winkel, Abstand, Kamerahöhe, Blickhöhe, Versatz nach vorn]
//   FT.sheet()                alle gemerkten Kacheln nebeneinander als Vollbild-Überlagerung zeigen (und die Liste leeren)
window.__figur = async () => {
  (0, eval)(await (await fetch('/scripts/waffentest.js')).text());
  const r = await __waffe(); if (r !== 'bereit') return r;
  MT.MA.MANNY.test = null;
  const T3 = WT.T3, E = DT.E, model = MT.anim.model, F = (window.FT = { tiles: [] });
  const lamp = new T3.PointLight(0xffffff, 7, 9, 1.1), lamp2 = new T3.PointLight(0xbfd8ff, 4, 9, 1.1); E.scene.add(lamp, lamp2);
  F.set = async (figur, teile = {}) => {
    MT.MA.mannyHooks.tracht = () => ({ figur, teile });
    const fg = MT.MA.mannyFigur();
    for (let i = 0; i < 200; i++) { WT.tk(1); if (fg.fertig) break; await new Promise(r => setTimeout(r, 50)); }
    WT.tk(8);
    return fg.netze.map(m => m.name.slice(4) + (m.visible ? '' : '(aus)')).join(' ');
  };
  F.shot = (view = [-20, 3.1, 1.2, 0.95, 0], fov = 34, w = 260, h = 600) => {
    const [ang, dist, ch, look, fwd] = view, q = model.getWorldQuaternion(new T3.Quaternion());
    const p = model.getWorldPosition(new T3.Vector3()).add(new T3.Vector3(0, 0, fwd || 0).applyQuaternion(q));
    const d = new T3.Vector3(Math.sin(ang * Math.PI / 180), 0, Math.cos(ang * Math.PI / 180)).applyQuaternion(q);
    lamp.position.copy(p).addScaledVector(d, 1.6); lamp.position.y = p.y + 2.0;
    lamp2.position.copy(p).addScaledVector(d, -1.4); lamp2.position.y = p.y + 1.6;
    const oldF = E.camera.fov;
    E.camera.position.copy(p).addScaledVector(d, dist); E.camera.position.y = p.y + ch;
    E.camera.fov = fov; E.camera.updateProjectionMatrix(); E.camera.lookAt(p.x, p.y + look, p.z);
    E.render();
    const src = E.renderer.domElement, sw = src.height * w / h, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    cv.getContext('2d').drawImage(src, (src.width - sw) / 2, 0, sw, src.height, 0, 0, w, h);
    E.camera.fov = oldF; E.camera.updateProjectionMatrix();
    F.tiles.push(cv);
  };
  F.sheet = () => {
    const n = F.tiles.length, w = F.tiles[0].width, h = F.tiles[0].height, cv = document.createElement('canvas'); cv.width = w * n; cv.height = h;
    F.tiles.forEach((t, i) => cv.getContext('2d').drawImage(t, i * w, 0)); F.tiles = [];
    let im = document.getElementById('__shot'); if (!im) { im = document.createElement('img'); im.id = '__shot'; document.body.appendChild(im); }
    im.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;background:#000;width:100vw;height:100vh;object-fit:contain';
    im.src = cv.toDataURL('image/jpeg', 0.92);
    return n + ' Kacheln';
  };
  return 'bereit';
};
