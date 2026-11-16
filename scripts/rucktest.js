// Standbilder messen (docs/lichtraum2.md, Abschnitt „Standbilder“). Nur im eigenen Testfenster auf dem Entwicklungsserver, nach decktest.js:
//   (0, eval)(await (await fetch('/scripts/decktest.js')).text()); await __deck();
//   (0, eval)(await (await fetch('/scripts/rucktest.js')).text()); await __ruck();
// Dockt an, betritt das Deck und läuft alle Zellen ab, mit echtem Zeichnen. Gemeldet wird je Abschnitt jedes Bild über 25 ms (mit der Zahl
// der Shader, die in diesem Bild dazukamen) und das längste Bild. Zwischen den Bildern vergeht echte Zeit (rund 12 ms), damit nebenläufiges
// Übersetzen so viel Zeit bekommt wie im Spiel.
window.__ruck = async (id = 'bastion', opt = {}) => {
  const T = window.DT, lf = T.lf, R = T.E.renderer, gl = R.getContext(), st = lf.stationById(id);
  const pause = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });      // setTimeout wäre im versteckten Fenster gedrosselt
  const wait = async ms => { const t = performance.now(); while (performance.now() - t < ms) await pause(); };
  const out = {}; let cur = null, n = 0, heapMax = 0, lastH = 0;
  const marks = []; window.__mk = name => marks.push([name, performance.now()]);      // Zeitmarken der Hauptschleife, falls sie welche setzt (nur bei der Fehlersuche)
  // Zeit je Art von Aufruf an die Grafikschnittstelle (hochladen, übersetzen, zeichnen), je Bild neu gezählt
  const prof = {}, wrap = name => { const f = gl[name]; if (typeof f !== 'function' || f.__ruck) return; const w = function () { const t = performance.now(); const r = f.apply(gl, arguments); const q = prof[name] || (prof[name] = [0, 0]); q[0] += performance.now() - t; q[1]++; return r; }; w.__ruck = true; gl[name] = w; };
  for (const k of ['bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D', 'texStorage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D', 'generateMipmap', 'compileShader', 'linkProgram', 'getProgramParameter', 'getShaderParameter', 'getProgramInfoLog', 'getUniformLocation', 'getActiveUniform', 'getAttribLocation', 'drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'clear', 'blitFramebuffer', 'readPixels', 'createVertexArray', 'useProgram', 'checkFramebufferStatus', 'renderbufferStorageMultisample']) if (opt.profil !== false) wrap(k);      // opt.profil: false = ohne Aufschlüsselung (der Aufsatz erzeugt selbst Abfall für die Speicherbereinigung)
  const part = name => { cur = out[name] = { bilder: 0, max: 0, lang: [] }; };
  const tick = async (tag, dt = 1 / 60) => {
    const p0 = R.info.programs.length, t0 = performance.now();
    for (const k in prof) delete prof[k];
    marks.length = 0; marks.push(['', performance.now()]);
    const m0 = [R.info.memory.geometries, R.info.memory.textures], h0 = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
    lf.tick(dt); const t1 = performance.now(); gl.finish(); const t2 = performance.now();
    const ms = t2 - t0; n++; cur.bilder++;
    if (ms > cur.max) cur.max = Math.round(ms);
    if (ms > 25) {
      const top = Object.entries(prof).filter(q => q[1][0] >= 3).sort((a, b) => b[1][0] - a[1][0]).slice(0, 5).map(q => `${q[0]} ${Math.round(q[1][0])} ms (${q[1][1]}×)`), glSum = Object.values(prof).reduce((a, q) => a + q[0], 0);
      cur.lang.push(`${tag} [${lf.G.mode}, ${lf.IN.area}]: ${Math.round(ms)} ms` + (R.info.programs.length > p0 ? `, ${R.info.programs.length - p0} Shader neu` : '') + ` · Rechnen ${Math.round(t1 - t0 - glSum)}, Grafikaufrufe ${Math.round(glSum)}, Warten auf die Karte ${Math.round(t2 - t1)} · Netze +${R.info.memory.geometries - m0[0]}, Bilder +${R.info.memory.textures - m0[1]}` + (performance.memory ? ' · Skriptspeicher ' + Math.round(h0) + ' → ' + Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '') + (top.length ? ' · ' + top.join(', ') : '') + (marks.length > 1 ? ' · Abschnitte: ' + marks.slice(1).map((q, i) => [q[0], q[1] - marks[i][1]]).filter(q => q[1] >= 5).map(q => q[0] + ' ' + Math.round(q[1])).join(', ') : ''));
    }
    if (performance.memory) { const h = performance.memory.usedJSHeapSize / 1048576; if (h > heapMax) heapMax = h; if (lastH - h > 30) (out.speicherbereinigung = out.speicherbereinigung || []).push(tag + ": " + Math.round(lastH) + " → " + Math.round(h) + " MB, Bild " + Math.round(ms) + " ms"); lastH = h; }
    await wait(Math.max(0, 12 - ms));
  };
  part('start');
  T.station = id; T.ST.setPlayer(T.ST.newPlayer('Testpilot'));
  for (let i = 0; i < 30; i++) await tick('start ' + i);
  // warten, bis Deck und Lichtraum geladen sind (im Spiel lädt beides beim Anflug)
  const t0 = performance.now(), da = () => (T.DK.lichtReady ? T.DK.lichtReady(id) : performance.now() - t0 > 12000);      // ohne Abfrage (alter Stand): feste Wartezeit
  while (!(T.DK.deckReady(id) && da()) && performance.now() - t0 < 60000) await tick('laden');
  out.geladenNach = Math.round(performance.now() - t0);
  for (let i = 0; i < (opt.vorlauf ?? 60); i++) await tick('vor dem Andocken ' + i);      // im Spiel vergeht zwischen Laden und Andocken der Anflug
  part('andocken');
  if (T.E.warm) T.E.warm.strict = true;      // die Blende gilt auch für die von Hand gerechneten Bilder
  const p0 = R.info.programs.length, d0 = performance.now();
  lf.openDock(st);      // betritt den Innenraum, die Landung beginnt (4,5 s)
  let k = 0; while (T.E.warm && T.E.warm.hold && k++ < 3000) await tick('Blende ' + k);
  out.blende = { ms: Math.round(performance.now() - d0), bilder: k, shaderNeu: R.info.programs.length - p0 };
  for (let i = 0; i < 330; i++) await tick('Landung ' + i);
  part('ankunft');
  for (let i = 0; i < 180; i++) await tick('Ankunft ' + i);
  // alle Zellen ablaufen: von Zelle zu Zelle (Sprünge von 4 m, härter als Laufen), je Zelle in vier Richtungen schauen
  part('rundgang');
  const D = await (await fetch(window.DATAFILES['deck_' + id])).json(), K = D.karte, C = D.cell, HZ0 = -50;
  let hr = 0, hc = 0; K.forEach((row, r) => { const c = row.indexOf('H'); if (c >= 0) { hr = r; hc = c; } });
  const gx = y => -(y + hr * C), gz = x => HZ0 - C / 2 - (x - hc * C);
  // Reihenfolge: Breitensuche vom Tor aus, damit benachbarte Zellen nacheinander kommen
  const seen = new Set([hr + ',' + hc]), qu = [[hr, hc]], order = [];
  while (qu.length) { const [r, c] = qu.shift(); order.push([r, c]); for (const [dr, dc] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const a = r + dr, b = c + dc, ch = (K[a] || '')[b]; if (ch && ch !== '.' && !seen.has(a + ',' + b)) { seen.add(a + ',' + b); qu.push([a, b]); } } }
  for (const [r, c] of order) {
    for (let j = 0; j < 4; j++) { lf.IN.x = gx(-r * C); lf.IN.z = gz(c * C); lf.IN.yaw = j * Math.PI / 2; lf.IN.pitch = 0; await tick(`Zelle ${r},${c} ${K[r][c]}`); await tick(`Zelle ${r},${c} ${K[r][c]}`); }
  }
  for (let u = 0; u < (opt.runden ?? 1); u++) {
  part('zweiter rundgang' + (u ? ' ' + (u + 1) : ''));
  for (const [r, c] of order) { lf.IN.x = gx(-r * C); lf.IN.z = gz(c * C); lf.IN.yaw = 0; await tick(`Zelle ${r},${c} ${K[r][c]}`); await tick(`Zelle ${r},${c} ${K[r][c]}`); }
  }
  out.skriptspeicherMax = Math.round(heapMax); out.shader = R.info.programs.length; out.fehler = T.errs.slice(0, 5);
  return out;
};
