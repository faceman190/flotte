import * as THREE from 'three';
import { GLOW, scene } from '../core/engine';
import { d3 } from '../core/util';
import { world, sectorHooks } from './world';
import { ORTE } from './orte';
import { G } from './state';
import { mergeGeos } from './akademie';

// =====================================================================================
// Leitbojen in Heimstatt (Phase 2, docs/heimstatt.md): kleine Bojen alle 2 km entlang der Verkehrswege von der Bastion zu den Stationen,
// den Toren und den Orten (Übungsgelände, Werft), jeweils 220 m rechts neben der Strecke. Ein Lichtpuls läuft von der Bastion nach außen
// (zeigt die Richtung „weg von zu Hause“). Ferne Bojen werden dunkler, damit der Himmel nicht voller Punkte ist.
// Aufbau beim ersten Bild im Sektor (dann stehen auch die Orte schon), ohne Kollision.
// =====================================================================================

const STEP = 2000, SIDE = 220, PULSE_V = 1800, PULSE_L = 9000;
const B = { built: false, pts: null as THREE.Points | null, col: null as Float32Array | null, pos: [] as number[], along: [] as number[] };

function bojeGeo() {
  // Schwimmkörper, Kragen, Mast mit Lampe, kleines Sonnensegel: zusammen gut 9 m. Kragen und Lampenkasten getrennt (Signalfarbe).
  const parts: THREE.BufferGeometry[] = [], band: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(0.8, 0.9, 4.6, 10); parts.push(body);
  const collar = new THREE.CylinderGeometry(1.25, 1.25, 0.6, 12); collar.translate(0, 1.2, 0); band.push(collar);
  const ring2 = new THREE.CylinderGeometry(0.95, 0.95, 0.35, 12); ring2.translate(0, -1.6, 0); band.push(ring2);
  const cone = new THREE.CylinderGeometry(0.25, 0.8, 1.1, 10); cone.translate(0, 2.85, 0); parts.push(cone);
  const mast = new THREE.CylinderGeometry(0.09, 0.09, 3.2, 6); mast.translate(0, 5, 0); parts.push(mast);
  const lamp = new THREE.CylinderGeometry(0.28, 0.28, 0.5, 8); lamp.translate(0, 6.7, 0); band.push(lamp);
  const panel = new THREE.BoxGeometry(2.4, 0.06, 1.1); panel.translate(0, 4.2, 0); parts.push(panel);
  const foot = new THREE.CylinderGeometry(0.5, 0.2, 1.2, 8); foot.translate(0, -2.9, 0); parts.push(foot);
  return { body: mergeGeos(parts), band: mergeGeos(band) };
}

function build() {
  B.built = true; B.pos = []; B.along = [];
  const targets: { x: number; y: number; z: number; R: number }[] = [];
  for (const s of world.stations) if (s.kind !== 'carrier') targets.push({ x: s.x, y: s.y, z: s.z, R: s.R + 800 });
  for (const g of world.gates) targets.push({ x: g.x, y: g.y, z: g.z, R: 1200 });
  for (const o of ORTE) targets.push({ x: o.x, y: o.y, z: o.z, R: o.R + 600 });
  const mats: THREE.Matrix4[] = [], q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  for (const t of targets) {
    const L = Math.hypot(t.x, t.y, t.z), dx = t.x / L, dy = t.y / L, dz = t.z / L, rx = -dz, rz = dx, rl = Math.hypot(rx, rz) || 1;
    for (let s = STEP; s < L - t.R; s += STEP) {
      const x = dx * s + rx / rl * SIDE, y = dy * s - 15, z = dz * s + rz / rl * SIDE;
      if (world.fields.some(f => d3(x, y, z, f.x, f.y, f.z) < f.r + 150)) continue;   // nicht mitten in ein Asteroidenfeld
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), s * 0.001);
      mats.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, one));
      B.pos.push(x, y + 6.7, z); B.along.push(s);
    }
  }
  if (!mats.length) return;
  const bg = bojeGeo();
  for (const [geo, mat] of [[bg.body, new THREE.MeshStandardMaterial({ color: 0x80868c, metalness: 0.55, roughness: 0.6 })], [bg.band, new THREE.MeshStandardMaterial({ color: 0xa8582a, metalness: 0.3, roughness: 0.62 })]] as const) {
    const im = new THREE.InstancedMesh(geo, mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m)); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere();
    scene.add(im); world.extras.push(im);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(B.pos, 3));
  B.col = new Float32Array(B.pos.length); geo.setAttribute('color', new THREE.BufferAttribute(B.col, 3));
  B.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 6, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: false, fog: false }));
  B.pts.frustumCulled = false; scene.add(B.pts); world.extras.push(B.pts);
}

export function updateLeitbojen(cam: THREE.Vector3) {
  if (world.def?.id !== 'heimstatt' || world.surface) return;
  if (!B.built) build();
  if (!B.pts) return;
  const col = B.col!, t = G.time, head = t * PULSE_V;
  for (let i = 0, n = B.along.length; i < n; i++) {
    const d = d3(cam.x, cam.y, cam.z, B.pos[i * 3], B.pos[i * 3 + 1], B.pos[i * 3 + 2]);
    const fade = d < 3000 ? 1 : Math.max(0, 1 - (d - 3000) / 9000);
    const ph = (((head - B.along[i]) % PULSE_L) + PULSE_L) % PULSE_L, pulse = ph < 700 ? 1 - ph / 700 : 0;
    const k = fade * (0.28 + 0.72 * pulse);
    col[i * 3] = k; col[i * 3 + 1] = k * 0.66; col[i * 3 + 2] = k * 0.3;
  }
  (B.pts.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
}

sectorHooks.push({ build: () => {}, clear: () => { B.built = false; B.pts = null; B.col = null; B.pos = []; B.along = []; } });
