// Testhelfer zu Fuß auf einem Planeten (im eigenen Tab nach probelauf.js und ph2test.js): await __fuss('schlacke', 'waffe_smg')
// Landet auf einer flachen Stelle, setzt den Rover aus, steigt aus. Danach T.FF (fieldfight), T.OF (onfoot), T.IN (input), T.AV (avatar).
window.__fuss = async (sec = 'schlacke', waffe = 'waffe_smg') => {
  await __ph2();
  const lf = window.__lf, T = window.T;
  const imp = new Function('u', 'return imp' + 'ort(u)');
  const res = performance.getEntriesByType('resource').map(r => r.name), find = k => res.find(n => n.includes(k));
  T.FF = await imp(find('game/fieldfight.ts')); T.OF = await imp(find('game/onfoot.ts')); T.IN = await imp(find('core/input.ts'));
  T.AV = await imp(find('game/avatar.ts')); T.SU = await imp(find('game/surface.ts')); T.FG = await imp(find('game/footgun.ts'));
  const key = (c, d) => window.dispatchEvent(new KeyboardEvent(d ? 'keydown' : 'keyup', { code: c, key: c }));
  lf.P.gear.waffe = waffe;
  await lf.enterSurface(sec); lf.G.mode = 'play'; T.stub(2);
  for (let i = 0; i < 80; i++) { const x = lf.P.x + (Math.random() - 0.5) * 600, z = lf.P.z + (Math.random() - 0.5) * 600; lf.P.x = x; lf.P.z = z; lf.P.y = lf.world.ground(x, z) + 8; lf.P.vx = lf.P.vy = lf.P.vz = 0; const li = T.SU.landInfo(); if (li && li.ok) break; }
  key('KeyE', 1); lf.tick(0.05); key('KeyE', 0); T.stub(2.5);
  key('KeyF', 1); lf.tick(0.05); key('KeyF', 0); T.stub(2.5);
  // Drohne vor den Spieler holen: T.drohne(abstand)
  T.drohne = (dist = 14, hp = 400) => {
    const F = T.OF.FOOT, f = T.FF.FIGHT.foes.find(q => !q.dead), yaw = F.yaw;
    f.x = F.x - Math.sin(yaw) * dist; f.z = F.z - Math.cos(yaw) * dist; f.hx = f.x; f.hz = f.z; f.y = lf.world.ground(f.x, f.z) + 2.6; f.alert = true; f.cool = 0.2; f.hp = hp;
    F.pitch = Math.atan2(f.y - (F.y + 1.7), dist);
    return f;
  };
  return { mode: lf.G.mode, foot: T.OF.FOOT.active };
};
