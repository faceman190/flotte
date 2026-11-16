// Vergleichsbilder des Hangars der Bastion (Testfenster auf dem Entwicklungsserver, nach decktest.js und DT.enter('bastion')):
//   (0, eval)(await (await fetch('/scripts/hangarbilder.js')).text()); await __hangarBilder('vorher')
// Fährt feste Ansichten an und schickt jedes Bild an einen Empfänger auf localhost:5190 (Scratchpad recv.cjs). Ohne Empfänger: nur Helligkeit.
window.HANSICHTEN = [
  ['ankunft', 20, -30, 0.35, -0.12],      // Rückwand mit Ausgang und Deckmeister
  ['halle', -40, 60, 2.6, 0.12],         // quer durch die Halle zum Containerlager hinten rechts
  ['tor', 0, 104, 0, 0.08],              // vom Tor aus in die Halle
  ['fussweg', -84, 10, 0.25, -0.1],        // Fußweg an der linken Wand, Wandfüllungen aus der Nähe
  ['stellplatz', 52, 10, -2.2, 0.25],    // Stellplatz, Boden und Lichtinseln
  ['dach', 10, 30, 1.2, -0.9],           // nach oben: Binder und Hallenleuchten
];
window.__hangarBilder = async (tag) => {
  const T = window.DT, lf = T.lf, E = T.E, out = {};
  const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const cx = cv.getContext('2d', { willReadFrequently: true });
  for (const [name, x, z, yaw, pitch] of window.HANSICHTEN) {
    for (let i = 0; i < 4; i++) T.go(x, z, yaw, pitch, 0.3);
    lf.tick(0.05);
    cx.drawImage(E.renderer.domElement, 0, 0, 1280, 720);
    const d = cx.getImageData(0, 0, 1280, 720).data; let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i] + d[i + 1] + d[i + 2];
    out[name] = +(s / (d.length / 16 * 3)).toFixed(1);
    try { await fetch('http://127.0.0.1:5190/save?name=hangar-' + tag + '-' + name + '.jpg', { method: 'POST', body: cv.toDataURL('image/jpeg', 0.88) }); } catch (e) { out.empfaenger = 'nicht erreichbar'; }
  }
  return out;
};
