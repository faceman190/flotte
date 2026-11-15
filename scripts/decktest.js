// Prüfhelfer für Deck 3 der Bastion (docs/bastion-deck.md). Nur im eigenen Testfenster auf dem Entwicklungsserver verwenden:
//   (0, eval)(await (await fetch('/scripts/decktest.js')).text()); await __deck();
// Legt window.DT an: I (interior.ts), E (engine.ts), DK (deck.ts), dazu
//   DT.go(x, z, yaw)        Pilot versetzen und ein paar Bilder rechnen
//   DT.shot(x, z, yaw, p)   dasselbe und das Bild als Vollbild-Überlagerung zeigen (für Bildschirmfotos im versteckten Fenster)
//   DT.walkAll()            läuft jede Zelle, jede Tür und jeden Ansprechpunkt ab und meldet, was nicht erreichbar ist
Storage.prototype.setItem = function () {};      // dieses Fenster schreibt nie einen Spielstand
window.__deck = async () => {
  const res = performance.getEntriesByType('resource').map(r => r.name), dyn = new Function('u', 'return imp' + 'ort(u)'), imp = n => dyn(res.find(u => u.includes(n)));      // ohne das Wort im Klartext: Vite schreibt die Datei sonst um
  const I = await imp('/src/game/interior.ts'), E = await imp('/src/core/engine.ts'), DK = await imp('/src/game/deck.ts'), ST = await imp('/src/game/state.ts');
  const lf = window.__lf, errs = [];
  window.addEventListener('error', e => errs.push(String(e.message)));
  const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce.apply(console, a); };
  let img = null;
  const T = (window.DT = { I, E, DK, ST, lf, errs });
  T.go = (x, z, yaw = 0, pitch = 0, sec = 0.15) => { lf.IN.x = x; lf.IN.z = z; lf.IN.yaw = yaw; lf.IN.pitch = pitch; lf.tick(sec); return { area: lf.IN.area, x: lf.IN.x, z: lf.IN.z }; };
  T.shot = (x, z, yaw = 0, pitch = 0) => {
    const r = T.go(x, z, yaw, pitch);
    if (!img) { img = document.createElement('img'); img.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;object-fit:contain;background:#000'; document.body.appendChild(img); }
    lf.tick(0.05); img.src = E.renderer.domElement.toDataURL('image/jpeg', 0.9);
    return r;
  };
  T.hide = () => { if (img) { img.remove(); img = null; } };
  // Zeichenlast eines ganzen Bildes (alle Durchgänge zusammen) und Zeit je Bild
  T.info = () => { const i = E.renderer.info; i.autoReset = false; i.reset(); const t0 = performance.now(); lf.tick(0.05); const ms = performance.now() - t0; const r = { calls: i.render.calls, tris: i.render.triangles, ms: Math.round(ms), geo: i.memory.geometries, tex: i.memory.textures }; i.autoReset = true; return r; };
  // Spiel starten (Testpilot), an der Station andocken (Bastion oder 'eisenkrone') und den Innenraum betreten
  T.enter = (id = 'bastion') => { T.station = id; ST.setPlayer(ST.newPlayer('Testpilot')); lf.tick(0.2); lf.openDock(lf.stationById(id)); lf.tick(0.5); I.enterInterior(lf.stationById(id)); const r = E.renderer.render; E.renderer.render = function () {}; let n = 0; while (lf.G.mode !== 'walk' && n++ < 40) lf.tick(1); E.renderer.render = r; return lf.G.mode; };
  return Object.keys(DK);
};
// Begehbarkeit: füllt vom Hangar aus alle erreichbaren Punkte (Raster 0,25 m, dieselbe Prüfung wie beim Laufen) und meldet Zellen des Decks
// und Ansprechpunkte, die nicht erreichbar sind. Erst nach __deck() und DT.enter().
window.__walkAll = async () => {
  const T = window.DT, D = await (await fetch(window.DATAFILES['deck_' + (T.station || 'bastion')])).json(), K = D.karte, C = D.cell, HZ0 = -50, S = 0.25;
  let hr = 0, hc = 0; K.forEach((row, r) => { const c = row.indexOf('H'); if (c >= 0) { hr = r; hc = c; } });
  const gx = y => -(y + hr * C), gz = x => HZ0 - C / 2 - (x - hc * C);
  const key = (i, j) => i * 4096 + j, seen = new Set(), qu = [[0, Math.round(-46 / S)]]; seen.add(key(0 + 2048, qu[0][1] + 2048));
  while (qu.length) {
    const [i, j] = qu.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj, x = a * S, z = b * S;
      if (z > -44 || z < -150 || Math.abs(x) > 30 || seen.has(key(a + 2048, b + 2048)) || !T.I.walkFree(x, z)) continue;
      seen.add(key(a + 2048, b + 2048)); qu.push([a, b]);
    }
  }
  const near = (x, z, r) => { for (let a = Math.floor((x - r) / S); a <= Math.ceil((x + r) / S); a++) for (let b = Math.floor((z - r) / S); b <= Math.ceil((z + r) / S); b++) if (seen.has(key(a + 2048, b + 2048)) && Math.hypot(a * S - x, b * S - z) <= r) return true; return false; };
  const cellsOff = [], spotsOff = [];
  K.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.' && !near(gx(-r * C), gz(c * C), 1.4)) cellsOff.push(`${r},${c} ${ch}`); }));
  for (const s of D.personal) if (!near(gx(s.ty), gz(s.tx), 1.6)) spotsOff.push(s.tab);
  if (!near(gx(D.karte_xy[1]), gz(D.karte_xy[0]), 2.4)) spotsOff.push('galaxiekarte');
  return { punkte: seen.size, zellenNichtErreichbar: cellsOff, ansprechpunkteNichtErreichbar: spotsOff };
};
