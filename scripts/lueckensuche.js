// Lückensuche für die Decks aus dem Bastion-Baukasten (Testfenster auf dem Entwicklungsserver, nach decktest.js):
//   (0, eval)(await (await fetch('/scripts/decktest.js')).text()); await __deck(); DT.enter('eisenkrone');
//   (0, eval)(await (await fetch('/scripts/lueckensuche.js')).text()); await LS.prep(); await LS.scan({ from: 0, to: 20 })
// Blendet alles außer dem Innenraum aus und löscht mit Magenta. Von jeder begehbaren Zelle (Mitte und vier Punkte nahe den Ecken) wird in
// acht Richtungen und zwei Neigungen klein gerendert; jedes Magenta-Pixel ist ein Loch in die Welt. Zweimal: mit der Sichtprüfung des Decks
// (Bereiche, die das Spiel ausblendet) und mit allen Bereichen sichtbar (echte Lücken in der Geometrie).
window.LS = {
  async prep() {
    const T = window.DT, E = T.E, res = performance.getEntriesByType('resource').map(r => r.name), dyn = new Function('u', 'return imp' + 'ort(u)');
    this.SKY = await dyn(res.find(u => u.includes('/src/core/sky.ts')));
    const id = T.station || 'bastion', D = await (await fetch(window.DATAFILES['deck_' + id])).json(), K = D.karte, C = D.cell;
    let hr = 0, hc = 0; K.forEach((row, r) => { const c = row.indexOf('H'); if (c >= 0) { hr = r; hc = c; } });
    const OX = hc * C, OY = -hr * C, Z0 = -52;
    this.gx = y => -(y - OY); this.gz = x => Z0 - (x - OX);
    this.cells = []; K.forEach((row, r) => [...row].forEach((ch, c) => { if (ch !== '.') this.cells.push([r, c, ch]); }));
    this.K = K; this.C = C; this.THREE = await dyn(res.find(u => u.includes('deps/three.js')) ||res.find(u => /three/.test(u) && /deps/.test(u)));
    return { id, zellen: this.cells.length };
  },
  // ein Bild aus Plankoordinaten (px, py), Höhe h, Blickrichtung yaw (Plan: 0 = Osten, π/2 = Norden), Neigung pitch; Rückgabe: Anzahl Magenta-Pixel
  shot(px, py, h, yaw, pitch, all, W = 192, H = 108) {
    const T = window.DT, E = T.E, lf = T.lf, ix = this.gx(py), iz = this.gz(px);
    lf.IN.x = ix; lf.IN.z = iz; lf.tick(0.05);
    let dg = null; const kit = [];
    E.scene.traverse(o => { if (o.isMesh && o.material && o.material.customProgramCacheKey && /^(lm|bk)-/.test(String(o.material.customProgramCacheKey()))) { kit.push(o); dg = dg || o.parent; } });
    if (all) for (const m of kit) m.visible = true;
    let root = dg; while (root.parent && root.parent !== E.scene) root = root.parent;
    // Das offene Hangartor (z = 112 im Innenraum) zeigt zu Recht den Weltraum: dort eine schwarze Wand, damit es nicht als Loch zählt
    if (!this.block || this.block.parent !== root) {
      const TH = this.THREE; this.block = new TH.Mesh(new TH.PlaneGeometry(500, 300), new TH.MeshBasicMaterial({ color: 0x000000, side: TH.DoubleSide }));
      this.block.position.set(0, 50, 110); root.add(this.block);
    }
    const hidden = []; for (const c of E.scene.children) if (c !== root && c.visible && !c.isLight) { hidden.push(c); c.visible = false; }
    dg.updateMatrixWorld(true);
    const M = dg.matrixWorld, V = E.camera.position.constructor, P = new V(ix, h, iz).applyMatrix4(M);
    // Planrichtung (cos yaw, sin yaw) → Innenraum: x_g = −Δy, z_g = −Δx
    const dx = Math.cos(yaw) * Math.cos(pitch), dy = Math.sin(yaw) * Math.cos(pitch), dz = Math.sin(pitch);
    const Tg = new V(ix - dy, h + dz, iz - dx).applyMatrix4(M);
    const cam = E.camera.clone(); cam.position.copy(P); cam.up.set(0, 1, 0); cam.lookAt(Tg); cam.fov = 75; cam.aspect = W / H; cam.near = 0.05; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    const TH = this.THREE, r = E.renderer, bg = E.scene.background, cc = r.getClearColor(new TH.Color()), ca = r.getClearAlpha();
    if (!this.rt2 || this.rt2.width !== W) this.rt2 = new TH.WebGLRenderTarget(W, H);
    E.scene.background = null; r.setClearColor(0xff00ff, 1);
    r.setRenderTarget(this.rt2); r.clear(); r.render(E.scene, cam); const px8 = new Uint8Array(W * H * 4); r.readRenderTargetPixels(this.rt2, 0, 0, W, H, px8); r.setRenderTarget(null);
    E.scene.background = bg; r.setClearColor(cc, ca); for (const c of hidden) c.visible = true;
    let n = 0; for (let i = 0; i < W * H; i++) if (px8[i * 4] > 200 && px8[i * 4 + 1] < 70 && px8[i * 4 + 2] > 200) n++;
    this.last = { px8, W, H };
    return n;
  },
  // dasselbe groß als Bild (data-URL), zum Ansehen einer Fundstelle
  image(px, py, h, yaw, pitch, all, W = 640, H = 360) {
    const n = this.shot(px, py, h, yaw, pitch, all, W, H), { px8 } = this.last, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'), id = g.createImageData(W, H);
    for (let y = 0; y < H; y++) id.data.set(px8.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4);      // Zeilen von unten nach oben
    g.putImageData(id, 0, 0); return { n, url: cv.toDataURL('image/jpeg', 0.9) };
  },
  async scan({ from = 0, to = 1e9, all = false, min = 3 } = {}) {
    const out = [], C = this.C;
    for (const [r, c, ch] of this.cells.slice(from, to)) {
      const room = !'GgHP'.includes(ch), h = 1.6;
      for (const [ox, oy] of [[0, 0], [-1.25, -1.25], [1.25, -1.25], [1.25, 1.25], [-1.25, 1.25]]) {
        for (let k = 0; k < 8; k++) for (const pitch of [0, 0.45]) {
          const n = this.shot(c * C + ox, -r * C + oy, h, k * Math.PI / 4, pitch, all);
          if (n >= min) out.push([r, c, ch, ox, oy, k, pitch, n]);
        }
      }
    }
    return out;
  },
};
