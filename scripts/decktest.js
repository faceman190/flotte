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
  T.enter = (id = 'bastion') => { T.station = id; ST.setPlayer(ST.newPlayer('Testpilot')); lf.tick(0.2); lf.openDock(lf.stationById(id)); lf.tick(0.5); I.enterInterior(lf.stationById(id));
    // Die Landung ohne Zeichnen durchlaufen. Die Mischform bleibt so lange aus: Sonst nähme das Deck Raumspiegelungen auf, während
    // nichts gezeichnet wird, und behielte die schwarzen Bilder.
    const r = E.renderer.render, hy = DK.deckTune.hybrid; E.renderer.render = function () {}; DK.deckTune.hybrid = false;
    let n = 0; while (lf.G.mode !== 'walk' && n++ < 40) lf.tick(1);
    E.renderer.render = r; DK.deckTune.hybrid = hy; return lf.G.mode; };
  // nach DT.enter(): warten, bis das Vorwärmen des Innenraums fertig ist (engine.ts, warmScene; läuft nebenher)
  T.ready = async () => { const p = () => new Promise(q => { const c = new MessageChannel(); c.port1.onmessage = () => q(); c.port2.postMessage(0); }); const t = performance.now(); while (E.warm && E.warm.hold && performance.now() - t < 15000) await p(); lf.tick(0.2); return !(E.warm && E.warm.hold); };
  return Object.keys(DK);
};
// Rundhalle (deck_rund, seit 2026-11-19): Begehbarkeit vom Hangar aus wie __walkAll, geprüft werden Ansprechpunkte, Galaxiekarte, Wegpunkte
// der Läufer und die Lampenplätze der Lichtraum-Teile. bild = true legt eine Draufsicht als Bild bei (grün begehbar, gelb Personal).
window.__walkRund = async (bild = false) => {
  const T = window.DT, D = T.DK.deckData('bastion'), HZ0 = -50, S = 0.25, K0 = D.kx0;
  const gx = y => -y, gz = x => HZ0 - (x - K0);
  const key = (i, j) => (i + 2048) * 8192 + (j + 4096), seen = new Set();
  const fuell = start => {
    const qu = [start], vis = new Set([key(...start)]);      // je Ebene eine eigene Füllung (die Vorhalle gehört zu beiden)
    while (qu.length) {
      const [i, j] = qu.pop();
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj, x = a * S, z = b * S;
        if (z > -44 || z < -190 || Math.abs(x) > 60 || vis.has(key(a, b)) || !T.I.walkFree(x, z)) continue;      // bis −190: Deck 3 seit 2026-11-26 reicht 128 m tief
        vis.add(key(a, b)); qu.push([a, b]);
      }
    }
    for (const k of vis) seen.add(k);
  };
  // Zwei Ebenen (seit 2026-11-27): erst die Hangarebene vom Hangar aus, dann Deck 3 vom Südaufzug aus. Vom Hangar darf das Forum nicht erreichbar sein.
  const eb = D.ebenen && T.I.ebeneSetzen, vorher = T.DK.EBENE ? T.DK.EBENE.e : 'h'; let dicht = null, nH = 0;
  if (eb) T.I.ebeneSetzen('h');
  fuell([0, Math.round(-46 / S)]); nH = seen.size;
  if (eb) {
    dicht = !seen.has(key(Math.round(gx(D.karte_xy[1] + 6) / S), Math.round(gz(D.karte_xy[0]) / S)));
    const a = D.aufzug.bucht; T.I.ebeneSetzen('d'); fuell([Math.round(gx(a[1] + 1.2) / S), Math.round(gz(a[0]) / S)]);
    T.I.ebeneSetzen(vorher);
  }
  const near = (x, z, r) => { for (let a = Math.floor((x - r) / S); a <= Math.ceil((x + r) / S); a++) for (let b = Math.floor((z - r) / S); b <= Math.ceil((z + r) / S); b++) if (seen.has(key(a, b)) && Math.hypot(a * S - x, b * S - z) <= r) return true; return false; };
  const spotsOff = D.personal.filter(s => !near(gx(s.ty), gz(s.tx), 1.6)).map(s => s.tab);
  if (!near(gx(D.karte_xy[1]), gz(D.karte_xy[0]), 2.4)) spotsOff.push('galaxiekarte');
  const wegOff = []; D.wege.forEach((w, i) => w.forEach((n, k) => { if (!near(gx(n[1]), gz(n[0]), 0.6)) wegOff.push(`${i}.${k}`); }));
  const out = { punkte: seen.size, flaeche: Math.round(seen.size * S * S), ansprechpunkteNichtErreichbar: spotsOff, wegpunkteNichtErreichbar: wegOff };
  if (eb) { out.punkteHangarebene = nH; out.punkteDeck3 = seen.size - nH; out.forumVomHangarAusZu = dicht; }
  if (bild) {
    const W = 440, H = 960, sc = 7, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
    const px = (x, z) => [W / 2 + x * sc, (-46 - z) * sc];
    g.fillStyle = '#111'; g.fillRect(0, 0, W, H);
    for (const k of seen) { const i = Math.floor(k / 8192) - 2048, j = (k % 8192) - 4096, [u, v] = px(i * S, j * S); g.fillStyle = '#2a6'; g.fillRect(u, v, 2, 2); }
    g.fillStyle = '#fd4'; for (const s of D.personal) { const [u, v] = px(gx(s.y), gz(s.x)); g.fillRect(u - 2, v - 2, 5, 5); }
    out.bild = cv.toDataURL('image/png');
  }
  return out;
};
// Begehbarkeit: füllt vom Hangar aus alle erreichbaren Punkte (Raster 0,25 m, dieselbe Prüfung wie beim Laufen) und meldet Zellen des Decks
// und Ansprechpunkte, die nicht erreichbar sind. Erst nach __deck() und DT.enter().
window.__walkAll = async () => {
  const T = window.DT, D = (T.DK.deckData && T.DK.deckData(T.station || 'bastion')) || await (await fetch(window.DATAFILES['deck_' + (T.station || 'bastion')])).json(), K = D.karte, C = D.cell, HZ0 = -50, S = 0.25;      // das Deck, das das Spiel geladen hat
  let hr = 0, hc = 0; K.forEach((row, r) => { const c = row.indexOf('H'); if (c >= 0) { hr = r; hc = c; } });
  const gx = y => -(y + hr * C), gz = x => HZ0 - C / 2 - (x - hc * C);
  const key = (i, j) => i * 4096 + j, seen = new Set(), qu = [[0, Math.round(-46 / S)]]; seen.add(key(0 + 2048, qu[0][1] + 2048));
  while (qu.length) {
    const [i, j] = qu.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj, x = a * S, z = b * S;
      if (z > -44 || z < -170 || Math.abs(x) > 70 || seen.has(key(a + 2048, b + 2048)) || !T.I.walkFree(x, z)) continue;
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
