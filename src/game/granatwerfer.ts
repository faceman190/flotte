import * as THREE from 'three';
import { scene, camera, GLOW } from '../core/engine';
import { sfxAny, gunShot } from '../core/audio';
import { grenadeFx, dust, onClearFootFx } from './footfx';
import { camShake } from './footgun';
import type { NadeEnv } from './granate';

// =====================================================================================
// Granatwerfer GW-40 (seit 27.11.2026, aus Epics ShooterGame: Modell, Abschuss, Flug, Explosion, Nachladen; docs/kampfklaenge-granatwerfer.md).
// Waffe waffe_gw40 beim Ausrüster. Statt eines Strahls fliegt ein Geschoss: schnell, mit leichtem Bogen, und zündet beim ersten Kontakt
// mit Boden, Wand oder Gegner (sonst nach LIFE Sekunden in der Luft). Wirkung im Umkreis R, zur Mitte hin voll; trifft auch den Schützen.
// Planet: fieldfight.ts, Mine: dungeon.ts. Die Umgebung gibt der Aufrufer mit wie bei der Granate (granate.ts NadeEnv) und dazu
// hit(x, y, z): steht dort ein Gegner? In der Mine rechnet alles in deren Koordinaten, ox/oy/oz ist der Versatz zur Welt.
// =====================================================================================
export const GW = { id: 'waffe_gw40', v: 40, g: 4, r: 4.5, self: 50, life: 4 };
export interface GwEnv extends NadeEnv { hit?: (x: number, y: number, z: number) => boolean }
interface Shell { m: THREE.Object3D; p: THREE.Vector3; v: THREE.Vector3; t: number; env: GwEnv; dmg: number; smoke: number }
const shells: Shell[] = [];
let GEO: THREE.BufferGeometry | null = null, MAT: THREE.Material | null = null, GLOWM: THREE.SpriteMaterial | null = null;
function model(): THREE.Object3D {
  GEO ||= new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10).rotateX(Math.PI / 2);      // 40 mm, entlang z
  MAT ||= new THREE.MeshStandardMaterial({ color: 0x3a3f34, metalness: 0.5, roughness: 0.5 });
  GLOWM ||= new THREE.SpriteMaterial({ map: GLOW, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
  const g = new THREE.Group(), body = new THREE.Mesh(GEO, MAT), tail = new THREE.Sprite(GLOWM);
  tail.scale.setScalar(0.28); tail.position.z = -0.07; body.frustumCulled = false; g.add(body, tail); g.userData.sh = false;
  return g;
}
const vol = (x: number, y: number, z: number, ref: number) => 1 / (1 + (Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z) / ref) ** 2);

/** Abschussklang (bis die Aufnahmen geladen sind: die Flinte) */
export function launcherShot() {
  sfxAny('gw_schuss', 4, 0.62, 0.97 + Math.random() * 0.06, () => gunShot('shotgun', 0.55, 0.8));
}
/** Geschoss abfeuern: start und dir in den Koordinaten der Umgebung; dmg: Schaden in der Mitte */
export function fireLauncher(start: THREE.Vector3, dir: THREE.Vector3, env: GwEnv, dmg: number) {
  const m = model(); scene.add(m);
  const s: Shell = { m, p: start.clone(), v: dir.clone().normalize().multiplyScalar(GW.v), t: GW.life, env, dmg, smoke: 0 };
  shells.push(s); place(s);
  sfxAny('gw_flug', 2, 0.22, 1.05);
}
function place(s: Shell) {
  const e = s.env, ox = e.ox || 0, oy = e.oy || 0, oz = e.oz || 0;
  s.m.position.set(ox + s.p.x, oy + s.p.y, oz + s.p.z);
  s.m.lookAt(s.m.position.x + s.v.x, s.m.position.y + s.v.y, s.m.position.z + s.v.z);
}

/** je Bild; px, py, pz: Oberkörper des Spielers in den Koordinaten der Umgebung; hurtMe: eigener Schaden */
export function updateLauncher(dt: number, px: number, py: number, pz: number, hurtMe: (d: number) => void) {
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i], e = s.env;
    let boom = (s.t -= dt) <= 0;
    for (let k = 0; k < 5 && !boom; k++) {      // fünf Teilschritte: 40 m/s, sonst durch dünne Wände und an Gegnern vorbei
      const h = dt / 5, q = s.p;
      s.v.y -= GW.g * h;
      const nx = q.x + s.v.x * h, ny = q.y + s.v.y * h, nz = q.z + s.v.z * h;
      if (ny < e.ground(nx, nz) + 0.03 || (e.solid && e.solid(nx, ny, nz)) || (e.hit && e.hit(nx, ny, nz))) { boom = true; break; }      // an der letzten freien Stelle zünden
      q.set(nx, ny, nz);
    }
    place(s);
    const ox = e.ox || 0, oy = e.oy || 0, oz = e.oz || 0;
    if ((s.smoke -= dt) <= 0 && !boom) { s.smoke = 0.025; dust(ox + s.p.x, oy + s.p.y, oz + s.p.z, '#9a948c', 0.22, 0.6, 0.15, 0.35); }      // Rauchfahne
    if (!boom) continue;
    explode(s, px, py, pz, hurtMe);
    scene.remove(s.m); shells.splice(i, 1);
  }
}
function explode(s: Shell, px: number, py: number, pz: number, hurtMe: (d: number) => void) {
  const e = s.env, wx = (e.ox || 0) + s.p.x, wy = (e.oy || 0) + s.p.y + 0.15, wz = (e.oz || 0) + s.p.z;
  grenadeFx(wx, wy, wz);
  const dc = Math.hypot(wx - camera.position.x, wy - camera.position.y, wz - camera.position.z), k = vol(wx, wy, wz, 24);
  const alt = () => { sfxAny('w_x_ge', 3, 0.9 * Math.max(0.12, k)); sfxAny('w_x_gt', 3, 0.7 * Math.max(0.1, k)); };
  if (dc > 40) sfxAny('gw_expl_fern', 3, 0.85 * Math.max(0.15, k * 2), 1, alt);      // fern: dumpfer Knall
  else sfxAny('gw_expl', 5, 0.9 * Math.max(0.15, k), 0.97 + Math.random() * 0.06, alt);
  const d = Math.hypot(s.p.x - px, s.p.y - py, s.p.z - pz);
  camShake(Math.min(1, 7 / Math.max(2, d)));
  e.blast(s.p.x, s.p.y, s.p.z, GW.r, s.dmg);
  const rs = GW.r * 0.85; if (d < rs) hurtMe(GW.self * (1 - d / rs));
}
onClearFootFx(() => { for (const s of shells) scene.remove(s.m); shells.length = 0; });
