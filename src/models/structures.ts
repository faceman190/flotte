import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { std, boxUV } from '../core/textures';
import { mesh } from './helpers';
import { GM, DK, LT, CIV, WIN, BLK, MK } from './ships';

const SOL = std(0x1a2a4a, { metalness: 0.6, roughness: 0.3, emissive: 0x050a18 });

export interface StructureModel {
  g: THREE.Group;
  spin?: THREE.Object3D;          // dreht sich langsam (Wohnring)
  lights: THREE.Sprite[];          // Lauflichter an der Andockbucht
  navs: THREE.Sprite[];            // Positionslichter
  dock: { x: number; y: number; z: number };                // Andockpunkt (lokal)
  launch: { x: number; y: number; z: number; yaw: number }; // Startpunkt (lokal)
  sph: number[][];                 // Kollisionskugeln [x,y,z,r] (lokal)
  R: number;
}

// ---------- Ringstation: Spindel, rotierender Wohnring, Andockbucht unten ----------
export function buildStation(): StructureModel {
  const g = new THREE.Group(), lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  g.add(mesh(new THREE.CylinderGeometry(16, 16, 220, 16), GM, 0, 0, 0));
  g.add(mesh(new THREE.CylinderGeometry(26, 26, 34, 16), DK, 0, 40, 0));
  g.add(mesh(new THREE.CylinderGeometry(22, 22, 14, 16), LT, 0, 70, 0));
  for (let i = 0; i < 6; i++) g.add(mesh(new THREE.BoxGeometry(6, 26, 6), DK, Math.cos(i) * 20, -30, Math.sin(i) * 20));
  // Wohnring
  const ring = new THREE.Group(); ring.position.y = 40; g.add(ring);
  const torus = new THREE.Mesh(new THREE.TorusGeometry(150, 14, 12, 64), CIV); torus.rotation.x = Math.PI / 2; ring.add(torus);
  const winRing = new THREE.Mesh(new THREE.TorusGeometry(163.5, 1.1, 4, 96), WIN); winRing.rotation.x = Math.PI / 2; ring.add(winRing);
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2, sp = mesh(new THREE.BoxGeometry(8, 6, 112), DK, Math.sin(a) * 80, 0, Math.cos(a) * 80);
    sp.rotation.y = a; ring.add(sp);
  }
  for (let i = 0; i < 12; i++) {
    const a = (i + 0.5) / 12 * Math.PI * 2, mo = mesh(new THREE.BoxGeometry(20, 9, 30), i % 3 ? LT : MK, Math.sin(a) * 150, 15, Math.cos(a) * 150);
    mo.rotation.y = a; ring.add(mo);
  }
  // Andockbucht (öffnet nach +Z)
  g.add(mesh(new THREE.BoxGeometry(84, 38, 84), GM, 0, -128, 0));
  g.add(mesh(new THREE.BoxGeometry(56, 22, 6), BLK, 0, -128, 40));
  g.add(mesh(new THREE.BoxGeometry(60, 3, 60), DK, 0, -146, 70));
  for (let z = 48; z <= 98; z += 10) for (const s of [-1, 1]) {
    const sp = new THREE.Sprite(glowMat(0xffa030, 1)); sp.position.set(s * 27, -143, z); sp.scale.setScalar(5); g.add(sp); lights.push(sp);
  }
  // Mast, Schüssel, Solarflügel
  g.add(mesh(new THREE.CylinderGeometry(1.4, 1.4, 90, 6), DK, 0, 155, 0));
  const dish = mesh(new THREE.ConeGeometry(16, 7, 20, 1, true), LT, 0, 120, 18); dish.rotation.x = -1.1; g.add(dish);
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.BoxGeometry(60, 3, 3), DK, s * 46, 88, 0));
    g.add(mesh(new THREE.BoxGeometry(130, 1.5, 34), SOL, s * 140, 88, 0));
    const nl = new THREE.Sprite(glowMat(s < 0 ? 0xff3030 : 0x30ff70, 1)); nl.position.set(s * 206, 88, 0); nl.scale.setScalar(10); g.add(nl); navs.push(nl);
  }
  const top = new THREE.Sprite(glowMat(0xffffff, 1)); top.position.set(0, 201, 0); top.scale.setScalar(9); g.add(top); navs.push(top);
  boxUV(g, 1 / 40);
  const sph: number[][] = [];
  for (let y = -100; y <= 100; y += 25) sph.push([0, y, 0, 24]);
  sph.push([0, -128, 0, 48]);
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; sph.push([Math.sin(a) * 150, 40, Math.cos(a) * 150, 20]); }
  return { g, spin: ring, lights, navs, dock: { x: 0, y: -132, z: 78 }, launch: { x: 0, y: -132, z: 150, yaw: Math.PI }, sph, R: 230 };
}

// ---------- Außenposten: Modulcluster mit Landeplattform ----------
export function buildOutpost(): StructureModel {
  const g = new THREE.Group(), lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  g.add(mesh(new THREE.SphereGeometry(26, 20, 14), GM, 0, 0, 0));
  g.add(mesh(new THREE.CylinderGeometry(12, 12, 90, 12), LT, 0, 0, 0).rotateZ(Math.PI / 2));
  g.add(mesh(new THREE.CylinderGeometry(10, 10, 60, 12), DK, 0, 0, -40).rotateX(Math.PI / 2));
  for (const s of [-1, 1]) {
    g.add(mesh(new THREE.SphereGeometry(14, 14, 10), GM, s * 50, 0, 0));
    g.add(mesh(new THREE.BoxGeometry(3, 3, 80), DK, s * 50, 18, 0));
    g.add(mesh(new THREE.BoxGeometry(26, 1.5, 70), SOL, s * 50, 22, 0));
  }
  g.add(mesh(new THREE.CylinderGeometry(1.2, 1.2, 70, 6), DK, 0, 55, 0));
  const top = new THREE.Sprite(glowMat(0xff4040, 1)); top.position.set(0, 91, 0); top.scale.setScalar(8); g.add(top); navs.push(top);
  // Verbindungssteg und Landeplattform (nach +Z)
  g.add(mesh(new THREE.BoxGeometry(10, 8, 34), DK, 0, -4, 40));
  g.add(mesh(new THREE.BoxGeometry(50, 3, 50), DK, 0, -8, 80));
  g.add(mesh(new THREE.BoxGeometry(30, 3.2, 4), MK, 0, -8, 80));
  for (const [x, z] of [[-23, 57], [23, 57], [-23, 103], [23, 103], [0, 57], [0, 103], [-23, 80], [23, 80]]) {
    const sp = new THREE.Sprite(glowMat(0xffa030, 1)); sp.position.set(x, -5.5, z); sp.scale.setScalar(5); g.add(sp); lights.push(sp);
  }
  boxUV(g, 1 / 30);
  return {
    g, lights, navs, dock: { x: 0, y: 4, z: 80 }, launch: { x: 0, y: 6, z: 130, yaw: Math.PI },
    sph: [[0, 0, 0, 30], [-50, 0, 0, 16], [50, 0, 0, 16], [0, 0, -40, 14], [0, -8, 80, 28]], R: 120,
  };
}

// ---------- Sprungtor: Ring mit leuchtender Membran ----------
export function buildGate(col: number) {
  const g = new THREE.Group(), lights: THREE.Sprite[] = [];
  g.add(new THREE.Mesh(new THREE.TorusGeometry(72, 6, 10, 64), DK));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(82, 2.2, 6, 64), GM));
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, p = mesh(new THREE.BoxGeometry(14, 22, 18), GM, Math.cos(a) * 76, Math.sin(a) * 76, 0);
    p.rotation.z = a; g.add(p);
    const sp = new THREE.Sprite(glowMat(col, 1)); sp.position.set(Math.cos(a) * 88, Math.sin(a) * 88, 0); sp.scale.setScalar(14); g.add(sp); lights.push(sp);
  }
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(68, 48),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
  );
  g.add(disc);
  const core = new THREE.Sprite(glowMat(col, 0.35)); core.scale.setScalar(150); g.add(core);
  boxUV(g, 1 / 30);
  return { g, disc, core, lights };
}
