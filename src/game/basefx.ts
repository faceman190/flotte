import * as THREE from 'three';
import { GLOW } from '../core/engine';
import { rng, hashStr } from '../core/util';
import { kitMeta } from '../models/kit';
import { OUTPOST_Y } from '../models/stationModels';
import { world } from './world';
import { terrainAt } from './surface';

// =====================================================================================
// Bewegte Zutaten einer Planetenbasis aus den Zusatzangaben des Modells (data/kit_<Name>.json):
//   flares  Fackelmasten: flackernde Flamme aus drei Leuchtflächen, weiter Schein, Rauchfahne
//   steam   Schlote: aufsteigende, sich weitende Dampfwolken
//   glow    Ofenglut: pulsierender Schein und ein flackerndes Punktlicht
// Dazu auf Monden vom Typ „mond“ drei Geysire im Gelände (weit sichtbare Dampfsäulen).
// Alles hängt an der Stationsgruppe bzw. an world.extras und verschwindet mit dem Sektor.
// =====================================================================================

interface Plume { sp: THREE.Sprite[]; x: number; y: number; z: number; H: number; s0: number; s1: number; op: number; speed: number; wind: number }
interface Flame { core: THREE.Sprite; mid: THREE.Sprite; out: THREE.Sprite; halo: THREE.Sprite; y: number; k: number; light?: THREE.PointLight }
let builtFor: THREE.Object3D | null = null, plumes: Plume[] = [], flames: Flame[] = [], glows: { sp: THREE.Sprite; light: THREE.PointLight; k: number }[] = [], t = 0;

const mat = (col: number, op: number, add: boolean) => new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: op, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false });
function plume(parent: THREE.Object3D, x: number, y: number, z: number, H: number, s0: number, s1: number, col: number, op: number, n = 7, speed = 0.11): Plume {
  const sp: THREE.Sprite[] = [];
  for (let i = 0; i < n; i++) { const s = new THREE.Sprite(mat(col, 0, false)); s.renderOrder = 2; parent.add(s); sp.push(s); }
  return { sp, x, y, z, H, s0, s1, op, speed, wind: 0.25 };
}

function build(st: { mesh: THREE.Object3D; x: number; y: number; z: number }, m: any, sector: string, type: string) {
  builtFor = st.mesh; plumes = []; flames = []; glows = [];
  const g = st.mesh;
  for (const [i, f] of (m.flares || []).entries()) {
    const y = f[1] + OUTPOST_Y;
    const mk = (col: number, op: number) => { const s = new THREE.Sprite(mat(col, op, true)); s.position.set(f[0], y, f[2]); s.renderOrder = 3; g.add(s); return s; };
    const fl: Flame = { core: mk(0xfff3c8, 0.95), mid: mk(0xffa238, 0.8), out: mk(0xff5a1c, 0.55), halo: mk(0xff7a30, 0.07), y, k: i * 1.7 };
    if (i < 2) { fl.light = new THREE.PointLight(0xff8a40, 900, 260, 1.6); fl.light.position.set(f[0], y + 4, f[2]); g.add(fl.light); }
    flames.push(fl);
    plumes.push(plume(g, f[0], y + 9, f[2], 70, 5, 26, 0x2a2624, 0.3, 10, 0.16));          // dunkle Rauchfahne
  }
  for (const s of m.steam || []) plumes.push(plume(g, s[0], s[1] + OUTPOST_Y + 1, s[2], 95, 5, 40, 0xb8bcc2, 0.24, 12, 0.1));
  for (const [i, p] of (m.glow || []).entries()) {
    const sp = new THREE.Sprite(mat(0xff8a30, 0.5, true)); sp.position.set(p[0], p[1] + OUTPOST_Y, p[2]); sp.scale.setScalar(16); sp.renderOrder = 3; g.add(sp);
    const light = new THREE.PointLight(0xff7a28, 260, 70, 1.8); light.position.set(p[0], p[1] + OUTPOST_Y + 1, p[2]); g.add(light);
    if (i > 0) { g.remove(light); }                                                      // nur ein Punktlicht für beide Öfen (liegen dicht beisammen)
    glows.push({ sp, light, k: i * 2.3 });
  }
  // Geysire im Gelände: feste Plätze je Mond, ein bis zweieinhalb Kilometer von der Basis
  if (type === 'mond') {
    const R = rng(hashStr(sector + ':geysir')), root = new THREE.Group(); root.name = 'geysire';
    for (let i = 0; i < 4; i++) {
      const a = R.range(0, Math.PI * 2), d = R.range(900, 2600), x = Math.cos(a) * d, z = Math.sin(a) * d;
      const p = plume(root, x, terrainAt(x, z), z, R.range(260, 420), 26, R.range(110, 170), 0xc4c8ce, 0.2, 13, 0.06); p.wind = 0.5;
      plumes.push(p);
    }
    g.parent?.add(root); world.extras.push(root);
  }
}

export function updateBaseFx(dt: number) {
  const st = world.surface ? world.stations[0] : null, name = st && (st.def as any).model as string | undefined;
  if (!st || !name) { builtFor = null; return; }
  const m: any = kitMeta(name);
  if (!m.flares && !m.steam) return;
  if (builtFor !== st.mesh) build(st, m, world.surface!.planet, (world.surface as any).type || '');
  t += dt;
  for (const f of flames) {
    const a = 1 + 0.22 * Math.sin(t * 11 + f.k) + 0.14 * Math.sin(t * 27 + f.k * 2.1), b = 1 + 0.2 * Math.sin(t * 7.3 + f.k * 1.3), sw = Math.sin(t * 1.7 + f.k) * 1.2;
    f.core.scale.set(5.5 * b, 9 * a, 1); f.core.position.y = f.y + 3.5 * a;
    f.mid.scale.set(8 * a, 15 * b, 1); f.mid.position.y = f.y + 6.5 * b; f.mid.position.x = f.core.position.x + sw * 0.4;
    f.out.scale.set(10 * b, 22 * a, 1); f.out.position.y = f.y + 10 * a; f.out.position.x = f.core.position.x + sw;
    f.halo.scale.setScalar(46 + 8 * a);
    if (f.light) f.light.intensity = 900 * (0.8 + 0.3 * a);
  }
  for (const g of glows) { const a = 0.75 + 0.2 * Math.sin(t * 6.1 + g.k) + 0.1 * Math.sin(t * 17 + g.k); g.sp.scale.setScalar(16 * a); g.light.intensity = 260 * a; }
  for (const p of plumes) {
    const n = p.sp.length;
    for (let i = 0; i < n; i++) {
      const ph = (t * p.speed + i / n) % 1, s = p.sp[i], sz = p.s0 + (p.s1 - p.s0) * Math.pow(ph, 0.8);
      s.position.set(p.x + ph * ph * p.H * p.wind + Math.sin(i * 2.4 + t * 0.3) * sz * 0.08, p.y + ph * p.H, p.z + Math.cos(i * 1.7) * sz * 0.06);
      s.scale.set(sz, sz * 1.15, 1);
      (s.material as THREE.SpriteMaterial).opacity = p.op * Math.min(1, ph * 8) * (1 - ph) * (1 - ph * 0.3);
    }
  }
}
