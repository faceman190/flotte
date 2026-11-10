import * as THREE from 'three';
import { scene, camera, view } from './engine';
import { sunDir, planetInfo } from './sky';
import { rng, hashStr } from './util';

// Atmosphäre im Sektor: vorbeiziehender Weltraumstaub, lokale Gaswolken, Linsenreflexe der Sonne.

// ---------- Weltraumstaub (Streifen in Flugrichtung) ----------
const DUST = 900, BOX = 700, HALF = BOX / 2;
const dustP = new Float32Array(DUST * 3);
for (let i = 0; i < DUST * 3; i++) dustP[i] = (Math.random() - 0.5) * BOX;
const dustPos = new Float32Array(DUST * 6), dustCol = new Float32Array(DUST * 6);
const dustGeo = new THREE.BufferGeometry();
dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
dustGeo.setAttribute('color', new THREE.BufferAttribute(dustCol, 3));
const dust = new THREE.LineSegments(dustGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
dust.frustumCulled = false;
scene.add(dust);
const lastCam = new THREE.Vector3(), camVel = new THREE.Vector3();
let camInit = false;

function updateDust(dt: number) {
  const c = camera.position;
  if (!camInit) { lastCam.copy(c); camInit = true; }
  if (dt > 0) {
    const v = new THREE.Vector3().subVectors(c, lastCam).divideScalar(dt);
    if (v.length() > 2000) v.set(0, 0, 0);   // Sprung/Teleport: keine Riesenstreifen
    camVel.lerp(v, Math.min(1, dt * 8));
  }
  lastCam.copy(c);
  const sp = camVel.length(), k = Math.min(0.09, 0.02 + sp * 0.00012);
  for (let i = 0; i < DUST; i++) {
    let x = dustP[i * 3] - c.x, y = dustP[i * 3 + 1] - c.y, z = dustP[i * 3 + 2] - c.z;
    x = ((x + HALF) % BOX + BOX) % BOX - HALF; y = ((y + HALF) % BOX + BOX) % BOX - HALF; z = ((z + HALF) % BOX + BOX) % BOX - HALF;
    dustP[i * 3] = c.x + x; dustP[i * 3 + 1] = c.y + y; dustP[i * 3 + 2] = c.z + z;
    const d = Math.sqrt(x * x + y * y + z * z), fade = Math.max(0, 1 - d / HALF) * (0.25 + Math.min(0.75, sp / 250));
    const j = i * 6;
    dustPos[j] = c.x + x; dustPos[j + 1] = c.y + y; dustPos[j + 2] = c.z + z;
    dustPos[j + 3] = c.x + x - camVel.x * k - 0.4; dustPos[j + 4] = c.y + y - camVel.y * k; dustPos[j + 5] = c.z + z - camVel.z * k;
    const b = fade * 0.55;
    dustCol[j] = dustCol[j + 3] = b * 0.8; dustCol[j + 1] = dustCol[j + 4] = b * 0.88; dustCol[j + 2] = dustCol[j + 5] = b;
    dustCol[j + 3] *= 0.1; dustCol[j + 4] *= 0.1; dustCol[j + 5] *= 0.1;
  }
  dustGeo.attributes.position.needsUpdate = true;
  dustGeo.attributes.color.needsUpdate = true;
}

// ---------- Gaswolken ----------
function cloudTexture(seed: number) {
  const N = 256, c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d')!, img = g.createImageData(N, N), R = rng(seed);
  // Wertrauschen auf Gittern verschiedener Größe
  const layers = [4, 8, 16, 32].map(s => ({ s, v: Array.from({ length: (s + 1) * (s + 1) }, () => R.next()) }));
  const sample = (L: { s: number; v: number[] }, x: number, y: number) => {
    const fx = x * L.s, fy = y * L.s, ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, s1 = L.s + 1;
    const a = L.v[iy * s1 + ix], b = L.v[iy * s1 + ix + 1], cc = L.v[(iy + 1) * s1 + ix], d = L.v[(iy + 1) * s1 + ix + 1];
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    return (a * (1 - sx) + b * sx) * (1 - sy) + (cc * (1 - sx) + d * sx) * sy;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    let n = 0, amp = 0.55;
    for (const L of layers) { n += sample(L, u, v) * amp; amp *= 0.5; }
    const dx = u - 0.5, dy = v - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2;
    const a = Math.max(0, n - 0.35) * 1.8 * Math.max(0, 1 - r * r) ;
    const i = (y * N + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
    img.data[i + 3] = Math.min(255, a * 255);
  }
  g.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}
const CLOUD_TEX = [cloudTexture(11), cloudTexture(23), cloudTexture(37)];
const clouds: { s: THREE.Sprite; base: number; size: number }[] = [];
const PAL: Record<string, number[]> = {
  red: [0xff7050, 0xd05a40, 0xa04a90, 0xff9a60], blue: [0x4a78d8, 0x30a0b8, 0x6050c8, 0x5a90e0], green: [0x30c080, 0x40d0a0, 0x2a9a70, 0x60c0a0],
  gold: [0xe0a050, 0xd08040, 0xb07040, 0xf0c070], violet: [0x9040e0, 0xb050ff, 0x6a30b0, 0xc070ff], crimson: [0xc03040, 0x902030, 0xa04060, 0xd05050],
};

export function setAmbience(def: { id: string; neb: string; faction: string; fields: { pos: number[]; r: number }[] }, count?: number) {
  for (const c of clouds) { scene.remove(c.s); c.s.material.dispose(); }
  clouds.length = 0;
  const R = rng(hashStr(def.id + ':wolken')), pal = PAL[def.neb] || PAL.blue;
  const n = count ?? 9 + Math.floor(R.next() * 6);
  for (let i = 0; i < n; i++) {
    let x: number, y: number, z: number;
    if (def.fields.length && R.next() < 0.6) {
      const f = R.pick(def.fields), a = R.range(0, Math.PI * 2), d = R.range(0.3, 1.6) * f.r;
      x = f.pos[0] + Math.cos(a) * d; y = f.pos[1] + R.range(-300, 300); z = f.pos[2] + Math.sin(a) * d;
    } else { const a = R.range(0, Math.PI * 2), d = R.range(800, 5200); x = Math.cos(a) * d; y = R.range(-700, 700); z = Math.sin(a) * d; }
    const size = R.range(900, 2600), base = R.range(0.07, 0.15);
    const m = new THREE.SpriteMaterial({ map: CLOUD_TEX[i % 3], color: R.pick(pal), transparent: true, opacity: base, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, rotation: R.range(0, Math.PI * 2) });
    const s = new THREE.Sprite(m);
    s.position.set(x, y, z);
    s.scale.setScalar(size);
    scene.add(s);
    clouds.push({ s, base, size });
  }
}
function updateClouds() {
  const c = camera.position;
  for (const o of clouds) {
    const d = c.distanceTo(o.s.position), near = o.size * 0.55;
    (o.s.material as THREE.SpriteMaterial).opacity = d < near ? o.base * Math.pow(d / near, 2) : o.base;
  }
}

// ---------- Linsenreflexe (2D über dem Bild) ----------
let flareVis = 0;
const _p = new THREE.Vector3(), _ray = new THREE.Ray();
export function drawFlare(ux: CanvasRenderingContext2D, dt: number, occluders: { x: number; y: number; z: number; r: number }[]) {
  const W = view.W, H = view.H;
  _p.copy(camera.position).addScaledVector(sunDir, 15000).project(camera);
  const inFront = _p.z < 1, sx = (_p.x + 1) / 2 * W, sy = (1 - _p.y) / 2 * H;
  let target = inFront && sx > -W * 0.2 && sx < W * 1.2 && sy > -H * 0.2 && sy < H * 1.2 ? 1 : 0;
  // Verdeckt durch Planet oder Objekte in Blickrichtung zur Sonne?
  if (target && planetInfo.on && sunDir.angleTo(planetInfo.dir) < planetInfo.angR * 0.95) target = 0;
  if (target) {
    _ray.set(camera.position, sunDir);
    for (const o of occluders) { if (_ray.intersectsSphere(new THREE.Sphere(new THREE.Vector3(o.x, o.y, o.z), o.r))) { target = 0; break; } }
  }
  flareVis += (target - flareVis) * Math.min(1, dt * 8);
  if (flareVis < 0.02) return;
  const edge = Math.min(1, Math.max(0, 1 - Math.max(Math.abs(sx - W / 2) / (W * 0.7), Math.abs(sy - H / 2) / (H * 0.7))));
  const v = flareVis * (0.4 + 0.6 * edge);
  ux.save();
  ux.globalCompositeOperation = 'lighter';
  // Strahlenkranz um die Sonne
  const g = ux.createRadialGradient(sx, sy, 0, sx, sy, 160);
  g.addColorStop(0, `rgba(255,240,215,${0.35 * v})`); g.addColorStop(0.3, `rgba(255,190,120,${0.1 * v})`); g.addColorStop(1, 'rgba(255,160,90,0)');
  ux.fillStyle = g; ux.fillRect(sx - 160, sy - 160, 320, 320);
  ux.strokeStyle = `rgba(255,225,190,${0.18 * v})`; ux.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI + 0.3, l = i % 2 ? 120 : 210;
    ux.beginPath(); ux.moveTo(sx - Math.cos(a) * l, sy - Math.sin(a) * l); ux.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); ux.stroke();
  }
  // Geisterbilder entlang der Linie durch die Bildmitte
  const cx = W / 2, cy = H / 2, ghosts: [number, number, string, number, boolean][] = [
    [0.35, 26, '255,170,90', 0.10, false], [0.62, 12, '140,200,255', 0.12, true], [0.9, 40, '255,200,120', 0.06, false],
    [1.25, 18, '120,255,190', 0.08, true], [1.55, 60, '160,140,255', 0.05, false], [1.9, 24, '255,150,110', 0.07, true],
  ];
  for (const [t, r, col, a, hex] of ghosts) {
    const gx = sx + (cx - sx) * t * 2, gy = sy + (cy - sy) * t * 2;
    const gg = ux.createRadialGradient(gx, gy, 0, gx, gy, r);
    gg.addColorStop(0, `rgba(${col},${a * v * 0.6})`); gg.addColorStop(0.8, `rgba(${col},${a * v})`); gg.addColorStop(1, `rgba(${col},0)`);
    ux.fillStyle = gg;
    ux.beginPath();
    if (hex) for (let k = 0; k < 6; k++) { const an = k / 6 * Math.PI * 2; k ? ux.lineTo(gx + Math.cos(an) * r, gy + Math.sin(an) * r) : ux.moveTo(gx + Math.cos(an) * r, gy + Math.sin(an) * r); }
    else ux.arc(gx, gy, r, 0, Math.PI * 2);
    ux.fill();
  }
  ux.restore();
}

export function updateAmbience(dt: number) {
  updateDust(dt);
  updateClouds();
}
export function setDustVisible(v: boolean) { dust.visible = v; }
export function resetAmbienceCamera() { camInit = false; camVel.set(0, 0, 0); }
