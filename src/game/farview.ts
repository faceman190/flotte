import * as THREE from 'three';
import { scene, GLOW } from '../core/engine';
import { world } from './world';
import { FACTION } from '../data/galaxy';
import { ORTE } from './orte';

// Fernansicht (seit Alpha 1.50, für große Sektoren wie Heimstatt mit 60 km Radius)
// Stationen, Tore und die Anflugzone weiter als NEAR rücken verkleinert auf NEAR an die Kamera heran, in ihrer echten Richtung und mit
// derselben Bildgröße. So bleiben sie über jede Entfernung sichtbar (die Kamera reicht nur 30 km weit) und flimmern nicht (der Tiefenpuffer ist nah
// genau). Die Spiellogik rechnet weiter mit den Koordinaten der Station (s.x/y/z), nie mit der Lage des Modells. Dazu ein kleiner Lichtpunkt ab ~4 km,
// damit man Orte am Himmel findet (Positionslicht, kein Neon).
const NEAR = 7000, DOT0 = 3500, DOT1 = 6500;
type Far = { o: THREE.Object3D; home: THREE.Vector3; scale: THREE.Vector3; dot: THREE.Sprite; pulse: number };
const list: Far[] = [];
let forDef: unknown = null;
const _d = new THREE.Vector3();

function dot(col: number, size: number) {
  const m = new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, sizeAttenuation: false });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size); s.renderOrder = 2; s.visible = false; s.frustumCulled = false;
  scene.add(s);
  return s;
}
function restore(f: Far) { f.o.position.copy(f.home); f.o.scale.copy(f.scale); f.dot.visible = false; }
function rebuild() {
  for (const f of list) { if (f.o.parent) restore(f); scene.remove(f.dot); f.dot.material.dispose(); }
  list.length = 0;
  forDef = world.def;
  const add = (o: THREE.Object3D, col: number, size: number, pulse = 0) => list.push({ o, home: o.position.clone(), scale: o.scale.clone(), dot: dot(col, size), pulse });
  for (const s of world.stations) add(s.mesh, 0xffe2b8, s.R > 400 ? 0.016 : 0.011);
  for (const g of world.gates) add(g.mesh, FACTION[g.faction].gate, 0.011, 1);
  if (world.orbit) add(world.orbit.mesh, 0x7cc4ff, 0.01, 1);
  for (const o of ORTE) add(o.mesh, o.dot, 0.009);                    // Übungsgelände, Werft (orte.ts)
}
const expected = () => world.stations.length + world.gates.length + (world.orbit ? 1 : 0) + ORTE.length;

// pro Bild vor dem Zeichnen, nach der Kamera
export function updateFarView(cam: THREE.Vector3, t: number) {
  // Neu aufbauen, wenn der Sektor wechselt oder ein Modell ausgetauscht wurde (Eisenkrone, Städte laden nach)
  if (world.def !== forDef || list.length !== expected() || list.some(f => !f.o.parent)) rebuild();
  const on = !!world.def && !world.surface;
  for (const f of list) {
    _d.copy(f.home).sub(cam);
    const d = _d.length();
    if (!on) { restore(f); continue; }
    if (d <= NEAR) { f.o.position.copy(f.home); f.o.scale.copy(f.scale); }
    else { const k = NEAR / d; f.o.position.copy(cam).addScaledVector(_d, k); f.o.scale.copy(f.scale).multiplyScalar(k); }
    const a = Math.min(1, Math.max(0, (d - DOT0) / (DOT1 - DOT0)));
    f.dot.visible = a > 0.01;
    if (f.dot.visible) {
      f.dot.position.copy(f.o.position);
      f.dot.material.opacity = 0.8 * a * (f.pulse ? 0.75 + 0.25 * Math.sin(t * 2.2) : 1);
    }
  }
}
