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
export function clearParticles() { parts = []; }

export function updateParticles(dt: number) {
  const k = Math.pow(0.4, dt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.vx *= k; p.vy *= k; p.vz *= k;
    p.life -= dt;
    if (p.life <= 0) parts.splice(i, 1);
  }
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
}
