import * as THREE from 'three';
import { scene, GLOW } from '../core/engine';
import { rand } from '../core/util';

// Partikel: Explosionen, Triebwerksabgase, Treffer (ein einziges Points-Objekt für alles)
const PMAX = 3000;
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const pts = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 3.4, map: GLOW, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
pts.frustumCulled = false;
scene.add(pts);

interface Part { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; r: number; g: number; b: number }
let parts: Part[] = [];
const _c = new THREE.Color(), _v = new THREE.Vector3();

export function burst(x: number, y: number, z: number, col: string, n: number, sp: number, life: number) {
  _c.set(col);
  for (let i = 0; i < n && parts.length < PMAX; i++) {
    _v.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(sp * 0.2, sp));
    parts.push({ x, y, z, vx: _v.x, vy: _v.y, vz: _v.z, life: rand(life * 0.5, life), max: life, r: _c.r, g: _c.g, b: _c.b });
  }
}
export function puff(x: number, y: number, z: number, vx: number, vy: number, vz: number, col: string, life: number) {
  if (parts.length >= PMAX) return;
  _c.set(col);
  parts.push({ x, y, z, vx, vy, vz, life, max: life, r: _c.r, g: _c.g, b: _c.b });
}
export function clearParticles() { parts = []; sparkList = []; for (const f of flashes) { f.life = 0; f.sp.visible = false; } for (const r of ripples) { r.life = 0; r.m.visible = false; } floats.length = 0; }

// ---------- Funkenstreifen (seit Alpha 1.40): Treffer auf Metall, abgelenkte Schüsse am Schild ----------
// Kurze helle Striche in Flugrichtung, Länge je nach Tempo; ein LineSegments-Objekt für alle.
const SMAX = 700;
const sPos = new Float32Array(SMAX * 6), sCol = new Float32Array(SMAX * 6), sGeo = new THREE.BufferGeometry();
sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
sGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
const sLines = new THREE.LineSegments(sGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
sLines.frustumCulled = false;
scene.add(sLines);
interface Spark { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; len: number; r: number; g: number; b: number }
let sparkList: Spark[] = [];
// Funken um die Richtung (nx, ny, nz) gestreut; spread 0 = gebündelt, 1 = Halbkugel
export function sparks(x: number, y: number, z: number, nx: number, ny: number, nz: number, col: string, n: number, sp: number, life: number, spread = 0.8, len = 0.04) {
  _c.set(col);
  for (let i = 0; i < n && sparkList.length < SMAX; i++) {
    _v.set(nx + rand(-1, 1) * spread, ny + rand(-1, 1) * spread, nz + rand(-1, 1) * spread).normalize().multiplyScalar(rand(sp * 0.35, sp));
    sparkList.push({ x, y, z, vx: _v.x, vy: _v.y, vz: _v.z, life: rand(life * 0.45, life), max: life, len, r: _c.r, g: _c.g, b: _c.b });
  }
}

// ---------- Trefferblitze: kurzes, weiches Aufleuchten am Einschlag ----------
const flashes = Array.from({ length: 48 }, () => {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  sp.visible = false; scene.add(sp);
  return { sp, life: 0, max: 1, size: 1 };
});
let flashI = 0;
export function flash(x: number, y: number, z: number, col: string, size: number, life = 0.1) {
  const f = flashes[flashI = (flashI + 1) % flashes.length];
  f.sp.position.set(x, y, z); (f.sp.material as THREE.SpriteMaterial).color.set(col);
  f.life = f.max = life; f.size = size; f.sp.visible = true;
}

// ---------- Schildwelle: Ring, der sich vom Einschlag über die Schildblase ausbreitet ----------
const RIPPLE_GEO = new THREE.PlaneGeometry(2, 2);
function rippleMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uCol: { value: new THREE.Color(0x7cc4ff) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; uniform vec3 uCol; varying vec2 vUv;
      void main(){
        float r = length(vUv); if (r > 1.0) discard;
        float k = 1.0 - uT;
        float ring = smoothstep(0.09, 0.0, abs(r - (0.12 + uT * 0.88))) * k * 0.8;      // wandernder, dünner Ring
        float core = pow(max(0.0, 1.0 - r * 3.0), 2.0) * k * k * 1.8;                   // heller Kern am Einschlag
        float a = (ring + core) * smoothstep(1.0, 0.75, r);
        gl_FragColor = vec4(uCol * a, a);
      }`,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}
const ripples = Array.from({ length: 10 }, () => {
  const m = new THREE.Mesh(RIPPLE_GEO, rippleMat()); m.visible = false; m.frustumCulled = false; scene.add(m);
  return { m, life: 0, max: 1, size: 1, nx: 0, ny: 0, nz: 1, cx: 0, cy: 0, cz: 0, R: 1 };
});
let rippleI = 0;
// (cx, cy, cz) = Mitte der Schildblase, n = Richtung zum Einschlag, R = Halbmesser der Blase
export function shieldRipple(cx: number, cy: number, cz: number, nx: number, ny: number, nz: number, R: number, col = '#7cc4ff') {
  const r = ripples[rippleI = (rippleI + 1) % ripples.length];
  Object.assign(r, { life: 0.38, max: 0.38, size: R * 0.5, nx, ny, nz, cx, cy, cz, R });
  ((r.m.material as THREE.ShaderMaterial).uniforms.uCol.value as THREE.Color).set(col);
  r.m.visible = true;
}
// Die Welle folgt dem Schiff (sonst bliebe sie beim Weiterfliegen zurück)
export function followRipples(cx: number, cy: number, cz: number) {
  for (const r of ripples) if (r.life > 0) { r.cx = cx; r.cy = cy; r.cz = cz; }
}

// ---------- Schwebende Zahlen (+1 FE, +15 Cr): Weltposition, das HUD zeichnet sie ----------
export interface FloatText { x: number; y: number; z: number; text: string; col: string; t: number; key: string; n: number; unit: string }
export const floats: FloatText[] = [];
// Gleiche Sorte kurz hintereinander zählt hoch statt zu stapeln (Laser: +1, +2, +3 FE)
export function floatText(x: number, y: number, z: number, n: number, unit: string, col: string, key = unit) {
  const last = floats.find(f => f.key === key && f.t < 0.45);
  if (last) { last.n += n; last.t = Math.min(last.t, 0.15); last.x = x; last.y = y; last.z = z; return; }
  floats.push({ x, y, z, text: '', col, t: 0, key, n, unit });
  if (floats.length > 24) floats.shift();
}
// Größe der Funken in Metern: im All 3,4, zu Fuß in einer Mine viel kleiner
export function particleSize(s = 3.4) { (pts.material as THREE.PointsMaterial).size = s; }

export function updateParticles(dt: number) {
  const k = Math.pow(0.4, dt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.vx *= k; p.vy *= k; p.vz *= k;
    p.life -= dt;
    if (p.life <= 0) parts.splice(i, 1);
  }
  const ks = Math.pow(0.18, dt);
  for (let i = sparkList.length - 1; i >= 0; i--) {
    const s = sparkList[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    s.vx *= ks; s.vy *= ks; s.vz *= ks;
    s.life -= dt;
    if (s.life <= 0) sparkList.splice(i, 1);
  }
  for (const f of flashes) if (f.life > 0) {
    f.life -= dt;
    const a = Math.max(0, f.life / f.max);
    (f.sp.material as THREE.SpriteMaterial).opacity = a * a;
    f.sp.scale.setScalar(f.size * (0.55 + 0.45 * (1 - a)));
    if (f.life <= 0) f.sp.visible = false;
  }
  for (const r of ripples) if (r.life > 0) {
    r.life -= dt;
    const t = 1 - Math.max(0, r.life / r.max);
    (r.m.material as THREE.ShaderMaterial).uniforms.uT.value = t;
    // an der Blase anliegend: etwas hinter der Oberfläche, damit der Ring über die Wölbung wandert
    r.m.position.set(r.cx + r.nx * r.R * 0.97, r.cy + r.ny * r.R * 0.97, r.cz + r.nz * r.R * 0.97);
    r.m.lookAt(r.m.position.x + r.nx, r.m.position.y + r.ny, r.m.position.z + r.nz);
    r.m.scale.setScalar(r.size * (0.6 + 0.6 * t));
    if (r.life <= 0) r.m.visible = false;
  }
  for (let i = floats.length - 1; i >= 0; i--) { floats[i].t += dt; if (floats[i].t > 1.3) floats.splice(i, 1); }
}
export function syncParticles() {
  const n = parts.length;
  for (let i = 0; i < n; i++) {
    const p = parts[i], a = Math.max(0, Math.min(1, p.life / p.max));
    pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
    pCol[i * 3] = p.r * a; pCol[i * 3 + 1] = p.g * a; pCol[i * 3 + 2] = p.b * a;
  }
  pGeo.setDrawRange(0, n);
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
  const m = sparkList.length;
  for (let i = 0; i < m; i++) {
    const s = sparkList[i], a = Math.max(0, Math.min(1, s.life / s.max)), o = i * 6;
    sPos[o] = s.x; sPos[o + 1] = s.y; sPos[o + 2] = s.z;
    sPos[o + 3] = s.x - s.vx * s.len; sPos[o + 4] = s.y - s.vy * s.len; sPos[o + 5] = s.z - s.vz * s.len;
    const h = a * 1.4;   // Kopf heiß, Schweif verglimmt
    sCol[o] = Math.min(1, s.r * h + a * 0.25); sCol[o + 1] = Math.min(1, s.g * h + a * 0.2); sCol[o + 2] = Math.min(1, s.b * h + a * 0.15);
    sCol[o + 3] = s.r * a * 0.15; sCol[o + 4] = s.g * a * 0.1; sCol[o + 5] = s.b * a * 0.08;
  }
  sGeo.setDrawRange(0, m * 2);
  sGeo.attributes.position.needsUpdate = true;
  sGeo.attributes.color.needsUpdate = true;
}
