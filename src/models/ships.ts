import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { std, texMat, boxUV } from '../core/textures';
import { mesh, alongZ, lathe, extrude } from './helpers';
import { rand, pick, ri } from '../core/util';

// Gemeinsame Materialien für menschliche Schiffe und Stationen
export const GM = texMat(0xc4c8ce, 'hull_mil');
export const DK = texMat(0x80868e, 'hull_mil');
export const LT = texMat(0xe6e8ec, 'hull_mil');
export const CIV = texMat(0xffffff, 'hull_civ', { roughness: 0.75 });
export const CW = texMat(0xffffff, 'hull_light', { flatShading: false, roughness: 0.4 });
export const MK = std(0xd9822b, { emissive: 0x2a1200 });
export const BLK = std(0x0b0c0f, { roughness: 0.9 });
export const WIN = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });

// ---------- Jäger (Spieler & Patrouillen) ----------
export function buildFighter(markCol: number) {
  const M = {
    hull: texMat(0xd8dce2, 'hull_mil', { flatShading: false, roughness: 0.5 }, 0.7),
    mark: std(markCol, { emissive: markCol, emissiveIntensity: 0.08, flatShading: false }),
    trim: texMat(0x5a606a, 'hull_mil', { metalness: 0.85, roughness: 0.35, flatShading: false }, 0.7),
    glass: std(0x2a2010, { metalness: 1, roughness: 0.05, flatShading: false, emissive: 0x2a1a00, emissiveIntensity: 0.5 }),
    core: new THREE.MeshBasicMaterial({ color: 0xffd8a0 }),
  };
  const g = new THREE.Group(), body = new THREE.Group();
  g.add(body);
  const hullB = lathe([[0, -5.6], [1.0, -5.6], [1.5, -4.2], [1.7, -1.5], [1.6, 1.5], [1.25, 3.8], [0, 3.8]], M.hull);
  hullB.scale.z = 0.72; body.add(hullB);
  const nose = lathe([[0, 3.8], [1.25, 3.8], [1.0, 5], [0.6, 6.4], [0.22, 7.3], [0, 7.55]], M.hull);
  nose.scale.z = 0.72; body.add(nose);
  for (const z of [-3.8, -4.4]) { const r = mesh(new THREE.TorusGeometry(z === -3.8 ? 1.27 : 1.12, 0.1, 8, 32), M.mark, 0, 0, z); r.scale.y = 0.72; body.add(r); }
  const ring2 = mesh(new THREE.TorusGeometry(1.62, 0.08, 8, 32), M.trim, 0, 0, -0.2); ring2.scale.y = 0.72; body.add(ring2);
  const base = mesh(new THREE.SphereGeometry(1, 24, 16), M.trim, 0, 0.78, -2.1); base.scale.set(0.95, 0.52, 2.25); body.add(base);
  const canopy = mesh(new THREE.SphereGeometry(1, 24, 16), M.glass, 0, 0.95, -2.25); canopy.scale.set(0.82, 0.6, 2.05); body.add(canopy);
  body.add(mesh(new THREE.BoxGeometry(0.6, 0.4, 4.6), M.hull, 0, 1.05, 1.9));
  body.add(mesh(new THREE.BoxGeometry(0.2, 0.42, 4.65), M.mark, 0, 1.07, 1.9));
  body.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4), M.trim, 0, 1.8, 3.6));
  const navs: THREE.Sprite[] = [];
  for (const s of [-1, 1]) {
    const w = extrude([[s * 1.1, -1.2], [s * 6.3, 2.3], [s * 6.6, 3.7], [s * 1.1, 3.9]], 0.2, M.hull); w.rotation.x = Math.PI / 2; w.position.y = 0.02; body.add(w);
    const wt = extrude([[s * 5.4, 1.75], [s * 6.3, 2.3], [s * 6.6, 3.7], [s * 5.4, 3.75]], 0.24, M.mark, 0.06); wt.rotation.x = Math.PI / 2; wt.position.y = 0.06; body.add(wt);
    for (const z of [1.2, 2.6]) body.add(mesh(new THREE.BoxGeometry(1.4, 0.08, 0.9), M.trim, s * 3.2, 0.14, z));
    body.add(alongZ(mesh(new THREE.CylinderGeometry(0.24, 0.24, 3.4, 12), M.trim, s * 6.55, -0.06, 2.4)));
    body.add(alongZ(mesh(new THREE.ConeGeometry(0.24, 0.7, 12), M.trim, s * 6.55, -0.06, 0.35)));
    const nl = new THREE.Sprite(glowMat(s < 0 ? 0xff3030 : 0x30ff70, 1)); nl.position.set(s * 6.6, 0.1, 4.1); nl.scale.setScalar(1.8); body.add(nl); navs.push(nl);
    body.add(mesh(new THREE.BoxGeometry(0.55, 0.45, 2.2), M.trim, s * 1.45, -0.55, -1.6));
    body.add(alongZ(mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), M.trim, s * 1.45, -0.55, -4)));
    const intake = mesh(new THREE.BoxGeometry(0.5, 0.75, 1.8), M.trim, s * 1.5, 0.1, -0.4); intake.rotation.y = s * 0.12; body.add(intake);
    body.add(mesh(new THREE.BoxGeometry(1, 0.32, 2.6), M.hull, s * 1.65, -0.12, 3.9));
    body.add(alongZ(mesh(new THREE.CylinderGeometry(0.95, 1.08, 4.6, 24), M.trim, s * 2.15, -0.15, 4.2)));
    body.add(mesh(new THREE.TorusGeometry(0.96, 0.12, 8, 24), M.trim, s * 2.15, -0.15, 1.9));
    body.add(mesh(new THREE.TorusGeometry(0.92, 0.15, 8, 24), M.mark, s * 2.15, -0.15, 6.5));
    body.add(mesh(new THREE.CircleGeometry(0.78, 24), M.core, s * 2.15, -0.15, 6.53));
    const fg = new THREE.Group(); fg.position.set(s * 1.0, 0.75, 2.4); fg.rotation.z = s * -0.38; body.add(fg);
    const fin = extrude([[0, 0], [2.5, 0], [3.0, 2.3], [2.0, 2.45]], 0.12, M.hull, 0.05); fin.rotation.y = -Math.PI / 2; fin.position.x = -0.06; fg.add(fin);
    const ft = extrude([[2.3, 1.7], [2.86, 1.7], [3.0, 2.3], [2.0, 2.45]], 0.16, M.mark, 0.04); ft.rotation.y = -Math.PI / 2; ft.position.x = -0.08; fg.add(ft);
    for (const k of [0, 1]) {
      body.add(alongZ(mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8), M.trim, s * (3.6 + k * 1.1), -0.42, 1.4)));
      body.add(alongZ(mesh(new THREE.ConeGeometry(0.16, 0.5, 8), M.mark, s * (3.6 + k * 1.1), -0.42, -0.05)));
    }
  }
  const extraGuns = new THREE.Group();
  for (const s of [-1, 1]) {
    extraGuns.add(alongZ(mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.6, 12), M.trim, s * 6.55, -0.06, -0.6)));
    extraGuns.add(alongZ(mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.2, 8), M.trim, s * 6.55, -0.06, -2.4)));
  }
  body.add(extraGuns);
  const glows: THREE.Sprite[] = [];
  for (const s of [-1, 1]) { const sp = new THREE.Sprite(glowMat(0xffb070, 0.9)); sp.position.set(s * 2.15, -0.15, 6.9); sp.scale.setScalar(4); body.add(sp); glows.push(sp); }
  const shield = new THREE.Mesh(new THREE.SphereGeometry(9.5, 24, 16), new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  g.add(shield);
  boxUV(g, 1 / 7);
  g.rotation.order = 'YXZ';
  return { g, body, extraGuns, glows, shield, navs };
}

// ---------- Trägerschiff Bastion (liegt als Flaggschiff in Heimstatt vor Anker) ----------
export const CARRIER_DOCK = { x: 0, y: 56, z: 130 };
export const CARRIER_LAUNCH = { x: 0, y: -58, z: -275, yaw: 0 };
export function carrierSpheres() { return Array.from({ length: 12 }, (_, i) => [0, 0, -230 + i * 40, 42]); }
export function buildCarrier() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.BoxGeometry(80, 32, 340), GM, 0, -6, 10));
  g.add(mesh(new THREE.BoxGeometry(62, 22, 280), LT, 0, 20, 30));
  const bw = new THREE.Group(); bw.position.set(0, -4, -200); bw.rotation.x = -Math.PI / 2; g.add(bw);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(30, 80, 4), GM); bow.scale.set(1.35, 1, 0.8); bw.add(bow);
  g.add(mesh(new THREE.BoxGeometry(56, 18, 40), DK, 0, -14, -150));
  g.add(mesh(new THREE.BoxGeometry(22, 34, 40), DK, 0, 47, -40));
  g.add(mesh(new THREE.BoxGeometry(26, 8, 30), LT, 0, 66, -44));
  g.add(mesh(new THREE.BoxGeometry(26.4, 2.2, 0.6), WIN, 0, 66, -59.4));
  for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(0.6, 2, 24), WIN, s * 13.2, 66, -44));
  for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(0.5, 0.5, 18, 4), DK, -6 + i * 6, 80, -40));
  g.add(mesh(new THREE.BoxGeometry(96, 50, 50), DK, 0, 4, 195));
  const glows: THREE.Sprite[] = [];
  for (const x of [-26, 26]) for (const y of [-9, 17]) {
    g.add(alongZ(mesh(new THREE.CylinderGeometry(13, 15, 20, 16), DK, x, y, 226)));
    g.add(mesh(new THREE.CircleGeometry(11, 20), new THREE.MeshBasicMaterial({ color: 0xffc080 }), x, y, 236.2));
    const sp = new THREE.Sprite(glowMat(0xffa860, 0.5)); sp.position.set(x, y, 244); sp.scale.setScalar(40); g.add(sp); glows.push(sp);
  }
  for (const s of [-1, 1]) {
    const pl = mesh(new THREE.BoxGeometry(8, 26, 300), GM, s * 42, -4, 10); pl.rotation.z = s * 0.15; g.add(pl);
    g.add(mesh(new THREE.BoxGeometry(8.6, 4, 110), MK, s * 43, 10, -70));
    g.add(mesh(new THREE.BoxGeometry(8.6, 4, 30), MK, s * 43, 10, 90));
    for (let z = -110; z <= 150; z += 26) g.add(mesh(new THREE.BoxGeometry(1, 1.6, 8), WIN, s * 44.5, -2, z));
  }
  g.add(mesh(new THREE.BoxGeometry(34, 4, 84), BLK, 0, 31.5, 130));
  const lights: THREE.Sprite[] = [];
  for (let z = 92; z <= 170; z += 13) for (const s of [-1, 1]) { const sp = new THREE.Sprite(glowMat(0xffa030, 1)); sp.position.set(s * 19, 34, z); sp.scale.setScalar(5); g.add(sp); lights.push(sp); }
  const turrets: THREE.Group[] = [];
  for (const z of [-120, -40, 40, 110]) for (const s of [-1, 1]) {
    const t = new THREE.Group(); t.position.set(s * 31, 31.5, z); t.add(mesh(new THREE.CylinderGeometry(5, 6, 4, 8), DK));
    for (const o of [-1.6, 1.6]) t.add(mesh(new THREE.BoxGeometry(1, 1, 14), DK, o, 2.6, -7));
    g.add(t); turrets.push(t);
  }
  for (let i = 0; i < 80; i++) {
    const top = Math.random() < 0.55, w = rand(3, 12), h = rand(1.5, 5), d = rand(4, 22);
    const m = mesh(new THREE.BoxGeometry(w, h, d), Math.random() < 0.5 ? DK : LT, top ? rand(-26, 26) : pick([-1, 1]) * rand(30, 40), top ? 31 + h / 2 : rand(-18, 8), rand(-140, 85));
    if (top && Math.abs(m.position.x) < 20 && m.position.z > 85) continue;
    g.add(m);
  }
  boxUV(g, 1 / 42);
  return { g, glows, lights, turrets };
}

// ---------- Zivilschiffe (Verkehr zwischen Stationen und Toren) ----------
export const SHIPDEF = {
  liner: { n: 'Passagierschiff', hp: 850, sph: [[0, 0, -55, 20], [0, 0, 0, 20], [0, 0, 55, 20]], R: 90, spd: 70 },
  freighter: { n: 'Frachter', hp: 700, sph: [[0, 2, -45, 24], [0, 2, 0, 24], [0, 2, 45, 24]], R: 85, spd: 55 },
  tanker: { n: 'Tanker', hp: 550, sph: [[0, 0, -38, 22], [0, 0, 0, 22], [0, 0, 38, 22]], R: 75, spd: 60 },
};
export type CivType = keyof typeof SHIPDEF;
// Namen der Frachter und Fähren im Verkehr: schlichte, übliche Schiffsnamen (Vornamen, Vögel, Sterne). Auf Wunsch des Nutzers keine erfundenen Wortbildungen.
export const SHIPNAMES = ['Morgenrot', 'Hoffnung', 'Nordlicht', 'Aurora', 'Kompass', 'Abendstern', 'Polaris', 'Kranich', 'Albatros', 'Möwe', 'Seeadler', 'Sturmvogel', 'Nordstern', 'Greta', 'Hanna', 'Frieda', 'Lotte', 'Paula', 'Anton', 'Heimat'];

export function buildCivilian(type: CivType) {
  const g = new THREE.Group(), glows: THREE.Sprite[] = [];
  const eng = (x: number, y: number, z: number, r: number) => {
    g.add(alongZ(mesh(new THREE.CylinderGeometry(r, r * 1.15, r * 1.6, 12), DK, x, y, z)));
    const sp = new THREE.Sprite(glowMat(0xffc080, 0.8)); sp.position.set(x, y, z + r * 1.2); sp.scale.setScalar(r * 4); g.add(sp); glows.push(sp);
  };
  if (type === 'liner') {
    g.add(alongZ(mesh(new THREE.CylinderGeometry(13, 13, 130, 20), CW, 0, 0, 0)));
    g.add(alongZ(mesh(new THREE.SphereGeometry(13, 20, 12), CW, 0, 0, -65)));
    for (let z = -50; z <= 50; z += 25) g.add(mesh(new THREE.TorusGeometry(13.4, 1, 6, 24), DK, 0, 0, z));
    for (const s of [-1, 1]) for (const y of [4, -2]) g.add(mesh(new THREE.BoxGeometry(0.6, 1.4, 118), WIN, s * Math.sqrt(169 - y * y) + s * 0.2, y, 0));
    g.add(mesh(new THREE.BoxGeometry(14, 8, 26), LT, 0, 15, -40));
    g.add(mesh(new THREE.BoxGeometry(14.4, 1.6, 0.5), WIN, 0, 16, -53.2));
    g.add(mesh(new THREE.BoxGeometry(30, 14, 20), DK, 0, 0, 70));
    eng(-8, 0, 82, 6); eng(8, 0, 82, 6);
  } else if (type === 'freighter') {
    g.add(mesh(new THREE.BoxGeometry(10, 10, 130), CIV, 0, 0, 0));
    const pal = [0xc0604a, 0x4a80c0, 0xe0b850, 0x5fa06a, 0xb0b4ba, 0x8a5fa8];
    for (let z = -52; z <= 42; z += 12.5) for (const s of [-1, 1]) for (let k = 0; k < ri(1, 3); k++)
      g.add(mesh(new THREE.BoxGeometry(10, 9.5, 11.5), texMat(pick(pal), 'hull_light', { roughness: 0.7 }), s * 10.5, k * 10 - 2, z));
    g.add(mesh(new THREE.BoxGeometry(18, 16, 16), CIV, 0, 12, 56));
    g.add(mesh(new THREE.BoxGeometry(18.4, 2, 0.5), WIN, 0, 16, 47.8));
    g.add(mesh(new THREE.BoxGeometry(6, 3, 40), GM, 0, -7, -40));
    eng(0, 0, 70, 7);
  } else {
    g.add(mesh(new THREE.BoxGeometry(8, 8, 124), DK, 0, 0, 0));
    const tm = texMat(0xf0c860, 'hull_light', { flatShading: false, roughness: 0.45 });
    for (const z of [-38, 0, 38]) { g.add(mesh(new THREE.SphereGeometry(17, 20, 14), tm, 0, 0, z)); g.add(mesh(new THREE.TorusGeometry(17.2, 0.8, 6, 24), DK, 0, 0, z)); }
    g.add(mesh(new THREE.BoxGeometry(14, 12, 14), LT, 0, 8, 62));
    g.add(mesh(new THREE.BoxGeometry(14.4, 1.6, 0.5), WIN, 0, 11, 54.8));
    eng(-5, 0, 72, 5); eng(5, 0, 72, 5);
  }
  boxUV(g, 1 / 30);
  return { g, glows };
}
