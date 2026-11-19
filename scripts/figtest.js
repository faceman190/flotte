// Testhelfer Spielerfigur (im eigenen Tab nach probelauf.js und ph2test.js): await __fig()
// Baut die Figur weit weg von allem, treibt sie mit driveAvatar und speichert Bilder über den Bildempfänger (scratchpad/shotsink.cjs).
window.__fig = async () => {
  await __ph2();
  const lf = window.__lf, T = window.T, E = T.E, THREE = T.THREE;
  const imp = new Function('u', 'return imp' + 'ort(u)');
  const res = performance.getEntriesByType('resource').map(r => r.name), find = k => res.find(n => n.includes(k));
  T.AV = await imp(find('game/avatar.ts')); T.MA = await imp(find('game/mineArt.ts'));
  const holder = new THREE.Group(); holder.position.set(0, 9000, 0); E.scene.add(holder);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x55585c, roughness: 0.9 })); floor.position.y = -0.05; holder.add(floor);
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 6, 4); holder.add(key); key.target = holder;
  const amb = new THREE.HemisphereLight(0xbfd0e0, 0x302820, 1.1); holder.add(amb);
  T.fig = { holder, a: null };
  for (let i = 0; i < 40 && !T.MA.soldierMeta(); i++) await new Promise(r => setTimeout(r, 150));
  T.fig.a = T.AV.makeAvatar({});
  holder.add(T.fig.a.s.g);
  T.drive = (sec, d) => { for (let t = 0; t < sec; t += 1 / 30) T.AV.driveAvatar(T.fig.a, 1 / 30, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, wid: 'smg', ...d }); };
  T.shot = async (name, cam, tgt, fov = 40) => {
    const c = E.camera, f0 = c.fov; c.fov = fov; c.updateProjectionMatrix();
    c.position.set(cam[0], 9000 + cam[1], cam[2]); c.lookAt(tgt[0], 9000 + tgt[1], tgt[2]); c.updateMatrixWorld();
    E.render(); const url = E.renderer.domElement.toDataURL('image/jpeg', 0.88); c.fov = f0; c.updateProjectionMatrix();
    return (await fetch('http://127.0.0.1:5191/' + name + '.jpg', { method: 'POST', body: url })).status;
  };
  return { meta: !!T.MA.soldierMeta(), s_aim: !!(T.MA.soldierMeta() || {}).s_aim, av: !!T.fig.a };
};
