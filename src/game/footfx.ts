import * as THREE from 'three';
import { scene, camera, GLOW } from '../core/engine';
import { rand } from '../core/util';
import { sfx, sfxAny } from '../core/audio';
import { sparks, flash } from './fx';
import { ngImpact, ngExplosion, ngAirBlast, bulletHole, warmNg, updateNg, clearNg } from './ngfx';

// =====================================================================================
// Effekte im Kampf zu Fuß (seit 2026-11-19), gemeinsam für Planetenboden (fieldfight.ts) und Minen (dungeon.ts). Maßstab Meter, nicht All.
//  · Leuchtspuren: kurze helle Striche, die mit ~420 m/s vom Lauf zum Einschlag fliegen (statt einer Linie, die 50 ms stehen blieb)
//  · Einschläge: Funken (fx.sparks), kleiner Blitz, Staubwölkchen (Boden/Fels) bzw. mehr Funken (Metall)
//  · Hülsen in der Ich-Sicht: fliegen rechts aus der Waffe und fallen aus dem Bild (Szene der Waffe, nicht der Welt)
//  · Drohnen: Energiebolzen mit Kern, Leuchten und Schweif; Mündungsblitz; Einschlagblitz; Explosion mit Rauch und Trümmern
//  · Flipbooks aus dem Lyra-Paket (seit 2026-11-23): Staubwolke am Einschlag, Feuerball mit Rauch, wenn eine Drohne zerbricht
// Alles aus Pools ohne Lichtquellen (jedes neue Licht zwingt alle Materialien zu neuen Shadern, siehe fieldfight.ts).
// =====================================================================================

const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1), _c = new THREE.Color();

// Kreuz aus zwei Flächen entlang +z (Länge 1, Breite 1): von der Seite wie von oben sichtbar
function crossGeo() {
  const g = new THREE.BufferGeometry();
  const p = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 0, 1, -0.5, 0, 1, 0, -0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1];
  const uv = [0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1];
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return g;
}
// Streifen mit weichem Rand quer und hellem Kopf (Textur aus Verlauf)
function streakTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const x = c.getContext('2d')!;
  const gx = x.createLinearGradient(0, 0, 64, 0); gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gx; x.fillRect(0, 0, 64, 128);
  x.globalCompositeOperation = 'destination-in';
  const gy = x.createLinearGradient(0, 0, 0, 128); gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.75, 'rgba(0,0,0,0.85)'); gy.addColorStop(1, 'rgba(0,0,0,1)');
  x.fillStyle = gy; x.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let STREAK: THREE.Texture | null = null;
const streak = () => (STREAK ||= streakTex());

// ---------- Leuchtspuren ----------
const TMAX = 48;
interface Tr { on: boolean; a: THREE.Vector3; d: THREE.Vector3; dist: number; t: number; len: number; w: number }
let trMesh: THREE.InstancedMesh | null = null;
const trs: Tr[] = Array.from({ length: TMAX }, () => ({ on: false, a: new THREE.Vector3(), d: new THREE.Vector3(), dist: 0, t: 0, len: 2, w: 0.03 }));
function trInit() {
  if (trMesh) return trMesh;
  const m = new THREE.MeshBasicMaterial({ map: streak(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false });
  trMesh = new THREE.InstancedMesh(crossGeo(), m, TMAX);
  trMesh.frustumCulled = false; trMesh.count = TMAX;
  for (let i = 0; i < TMAX; i++) { trMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); trMesh.setColorAt(i, _c.set(0xffffff)); }
  scene.add(trMesh);
  return trMesh;
}
let trI = 0;
export function tracer(a: THREE.Vector3, b: THREE.Vector3, col: string, w = 0.06) {
  const m = trInit(), t = trs[trI = (trI + 1) % TMAX];
  t.on = true; t.a.copy(a); t.d.copy(b).sub(a); t.dist = t.d.length(); if (t.dist < 0.5) { t.on = false; return; }
  t.d.divideScalar(t.dist); t.t = 0; t.len = Math.min(2.4, t.dist * 0.5); t.w = w;
  m.setColorAt(trI, _c.set(col).lerp(_c.clone().set(0xffffff), 0.35)); if (m.instanceColor) m.instanceColor.needsUpdate = true;
}

// ---------- Staub und Rauch (weiche Flecken, normal gemischt) ----------
interface Dust { sp: THREE.Sprite; life: number; max: number; v: THREE.Vector3; g0: number; g1: number; op: number }
const dusts: Dust[] = [];
let dustI = 0;
function dustSprite(): Dust {
  if (dusts.length < 56) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, transparent: true, opacity: 0, depthWrite: false, fog: true }));
    sp.visible = false; scene.add(sp);
    const d = { sp, life: 0, max: 1, v: new THREE.Vector3(), g0: 0.3, g1: 1, op: 0.5 }; dusts.push(d); return d;
  }
  return dusts[dustI = (dustI + 1) % dusts.length];
}
export function dust(x: number, y: number, z: number, col: string, size: number, life: number, vy = 0.4, op = 0.55) {
  const d = dustSprite();
  d.sp.position.set(x, y, z); d.sp.visible = true; d.life = d.max = life; d.g0 = size * 0.35; d.g1 = size; d.op = op;
  d.v.set(rand(-0.3, 0.3), vy, rand(-0.3, 0.3)); (d.sp.material as THREE.SpriteMaterial).color.set(col); (d.sp.material as THREE.SpriteMaterial).rotation = rand(0, 6.28);
}

// ---------- Flipbooks aus dem Lyra-Paket ----------
// Zwei Bildfolgen (asset-src/tex-world, aus scripts/build-lyra.mjs): fx_ly_squib = Staubwolke eines Einschlags (14 × 14 Bilder, grau mit
// Deckung), fx_ly_explosion = Feuerball (8 × 8 Bilder: Rauch in Rot, Feuer in Grün, Deckung in Alpha). Je Effekt ein Viereck, das sich zur
// Kamera dreht und die Bilder der Reihe nach zeigt. Die Texturen kommen aus dem Hintergrund-Paket; bis sie da sind, bleibt der alte Effekt.
interface Flip { m: THREE.Mesh; cell: THREE.Vector2; op: { value: number }; tint: THREE.Color; t: number; life: number; s0: number; s1: number; vy: number }
const FLIPS = {
  puff: { key: 'fx_ly_squib', n: 14, frames: 196, blast: false, max: 14, tex: null as THREE.Texture | null, ok: false, pool: [] as Flip[], i: 0 },
  blast: { key: 'fx_ly_explosion', n: 8, frames: 64, blast: true, max: 6, tex: null as THREE.Texture | null, ok: false, pool: [] as Flip[], i: 0 },
};
let FLIP_GEO: THREE.PlaneGeometry | null = null;
const FLIP_VS = 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const FLIP_FS = `uniform sampler2D map; uniform vec2 cell; uniform float n; uniform float op; uniform vec3 tint; varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, (cell + clamp(vUv, 0.015, 0.985)) / n);
  #ifdef BLAST
    vec3 col = tint * (0.15 + t.r * 1.5) + vec3(1.0, 0.46, 0.12) * t.g * 3.2 + vec3(1.0, 0.85, 0.6) * t.g * t.g * 5.0;
  #else
    vec3 col = tint * (0.3 + t.r * 1.3);
  #endif
  gl_FragColor = vec4(col, t.a * op);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
/** kind: 'puff' | 'blast' · s0 → s1: Größe in m · false, solange die Bildfolge noch nicht geladen ist */
function flip(kind: 'puff' | 'blast', x: number, y: number, z: number, s0: number, s1: number, life: number, col: string, vy = 0) {
  const F = FLIPS[kind];
  if (!F.tex) {
    const url = window.TEXDATA?.[F.key]; if (!url) return false;
    F.tex = new THREE.TextureLoader().load(url, () => { F.ok = true; });
    F.tex.colorSpace = THREE.NoColorSpace; F.tex.generateMipmaps = false; F.tex.minFilter = THREE.LinearFilter;      // ohne Verkleinerungsstufen: Nachbarbilder liefen sonst ineinander
  }
  if (!F.ok) return false;
  let f = F.pool.length < F.max ? null : F.pool[F.i = (F.i + 1) % F.max];
  if (!f) {
    const cell = new THREE.Vector2(), op = { value: 1 }, tint = new THREE.Color();
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: F.tex }, cell: { value: cell }, n: { value: F.n }, op, tint: { value: tint } },
      vertexShader: FLIP_VS, fragmentShader: FLIP_FS, defines: F.blast ? { BLAST: 1 } : {}, transparent: true, depthWrite: false, fog: false });
    const m = new THREE.Mesh(FLIP_GEO ||= new THREE.PlaneGeometry(1, 1), mat);
    m.frustumCulled = false; m.renderOrder = 4; m.userData.sh = false; scene.add(m);
    f = { m, cell, op, tint, t: 0, life: 0, s0: 1, s1: 1, vy: 0 }; F.pool.push(f);
  }
  f.m.position.set(x, y, z); f.m.scale.setScalar(s0); f.m.quaternion.copy(camera.quaternion); f.m.visible = true;
  f.cell.set(0, F.n - 1); f.op.value = 1; f.tint.set(col); f.t = 0; f.life = life; f.s0 = s0; f.s1 = s1; f.vy = vy;
  return true;
}
/** Bildfolgen vorab laden (zu Fuß mit Waffe), damit der erste Einschlag sie schon zeigt */
export function warmFlips() { warmNg(); for (const k of ['puff', 'blast'] as const) { const F = FLIPS[k]; if (!F.tex && window.TEXDATA?.[F.key]) { F.tex = new THREE.TextureLoader().load(window.TEXDATA[F.key], () => { F.ok = true; }); F.tex.colorSpace = THREE.NoColorSpace; F.tex.generateMipmaps = false; F.tex.minFilter = THREE.LinearFilter; } } }

// ---------- Trümmer ----------
interface Chunk { on: boolean; p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3; s: number; life: number; ground: (x: number, z: number) => number }
const CMAX = 64;
let chMesh: THREE.InstancedMesh | null = null;
const chunks: Chunk[] = Array.from({ length: CMAX }, () => ({ on: false, p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), s: 0.1, life: 0, ground: () => -1e9 }));
let chI = 0;
function chInit() {
  if (chMesh) return chMesh;
  chMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.35, 0.7), new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.6, roughness: 0.55 }), CMAX);
  chMesh.frustumCulled = false; for (let i = 0; i < CMAX; i++) chMesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
  scene.add(chMesh); return chMesh;
}

// ---------- Einschläge ----------
let impAt = 0;
// kind: 'boden' (Erde, Fels: Staub und wenige Funken), 'metall' (Drohne: viele Funken, Blitz)
// Einschlagsklang je Material (seit 27.11.2026, Aufnahmen aus Epics ShooterGame, asset-src/sound-lazy/imp_*): Zahl der Aufnahmen
export type ImpStoff = 'default' | 'metall' | 'wasser' | 'fleisch';
const IMP_N: Record<ImpStoff, number> = { default: 10, metall: 10, wasser: 6, fleisch: 8 };
const IMP_VOL: Record<ImpStoff, number> = { default: 0.34, metall: 0.38, wasser: 0.36, fleisch: 0.42 };
/** kind: Funken und Staub (boden) oder viele Funken (metall); stoff: Klang und Bild (Wasser spritzt, Fleisch ohne Staub). Ohne stoff: metall bzw. default */
// n: Flächennormale an einer ruhenden Stelle (Boden, Wand): dann bleibt ein Einschussloch (ngfx.ts). Ohne n (Gegner, unbekannt) keins.
export function impact(p: THREE.Vector3, dir: THREE.Vector3, kind: 'boden' | 'metall', col = '#ffd9a0', stoff?: ImpStoff, n?: THREE.Vector3 | null) {
  const st: ImpStoff = stoff || (kind === 'metall' ? 'metall' : 'default');
  if (n && (st === 'default' || st === 'metall')) bulletHole(p, n, st === 'metall' ? 0.07 : 0.1);
  if (kind === 'metall') {
    sparks(p.x, p.y, p.z, -dir.x, -dir.y + 0.2, -dir.z, '#ffc070', 9, 9, 0.28, 0.9, 0.018);
    flash(p.x, p.y, p.z, '#ffb060', 0.45, 0.07);
    ngImpact(p, dir, 'metall', n);
  } else if (st === 'wasser') {
    sparks(p.x, p.y, p.z, 0, 1, 0, '#d8ecf4', 10, 4.5, 0.45, 0.9, 0.016);
    dust(p.x, p.y + 0.05, p.z, '#cfe2ea', 0.45, 0.5, 0.9, 0.4);
  } else if (st === 'fleisch') {
    sparks(p.x, p.y, p.z, -dir.x, -dir.y + 0.2, -dir.z, col, 5, 3.5, 0.25, 0.85, 0.014);
  } else {
    sparks(p.x, p.y, p.z, -dir.x, -dir.y + 0.4, -dir.z, col, 3, 6, 0.2, 0.8, 0.012);
    flash(p.x, p.y, p.z, '#ffe2b0', 0.18, 0.05);
    if (!ngImpact(p, dir, 'default', n) && !flip('puff', p.x - dir.x * 0.12, p.y - dir.y * 0.12 + 0.12, p.z - dir.z * 0.12, 0.35, 1.25, 0.75, '#a89c8c', 0.45)) dust(p.x, p.y + 0.05, p.z, '#8a7f70', 0.55, 0.7, 0.5, 0.5);
  }
  const d = camD(p.x, p.y, p.z), now = performance.now();      // höchstens ein Einschlagsgeräusch je 70 ms (Schrot trifft siebenfach)
  if (d < 45 && now - impAt > 70) {
    impAt = now;
    const v = 1 / (1 + (d / 14) ** 2), r = 0.95 + Math.random() * 0.1;
    sfxAny('imp_' + st, IMP_N[st], IMP_VOL[st] * v, r, () => { if (kind === 'boden') sfxAny('w_x_imp', 5, 0.3 * v, r); });   // fehlt die Aufnahme noch: der alte Klang (Metall still wie bisher)
  }
}

// ---------- Hülsen in der Ich-Sicht ----------
// Auswurf je Waffe in deren Raum (Nullpunkt am Griff; x rechts, y oben, −z vorn). Energiewaffen (Impuls, Splitter) werfen nichts aus.
export const SHELL_PORT: Record<string, [number, number, number]> = {
  smg: [0.045, 0.06, -0.1], ar39: [0.045, 0.1, 0.07], k12: [0.03, 0.05, -0.06], ef2: [0.03, 0.05, -0.08], p9: [0.018, 0.035, -0.04],
  lyg: [0.035, 0.082, -0.12], lyp: [0.019, 0.095, -0.09], lyf: [0.024, 0.096, -0.123],      // Lyra-Waffen: lyra.json, sockets.ShellEject
};
interface Shell { m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3; life: number }
const shells = new Map<THREE.Scene, Shell[]>();
let SHELL_GEO: THREE.BufferGeometry | null = null, SHELL_MAT: THREE.Material | null = null;
// gun: Waffengruppe der Ich-Sicht; port: Auswurf in der Waffe (Spielachsen: x rechts, y oben, −z vorn)
export function vmShell(sceneV: THREE.Scene, gun: THREE.Object3D, port: [number, number, number]) {
  SHELL_GEO ||= new THREE.CylinderGeometry(0.0045, 0.0045, 0.019, 8).rotateZ(Math.PI / 2);   // echte Größe (größer wirkten sie am Bildrand wie Patronen)
  SHELL_MAT ||= new THREE.MeshStandardMaterial({ color: 0xc8a050, metalness: 0.9, roughness: 0.32 });
  let L = shells.get(sceneV); if (!L) { L = []; shells.set(sceneV, L); }
  let s = L.find(q => q.life <= 0);
  if (!s) { if (L.length >= 14) s = L[0]; else { const m = new THREE.Mesh(SHELL_GEO, SHELL_MAT); m.frustumCulled = false; sceneV.add(m); s = { m, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 }; L.push(s); } }
  gun.updateMatrixWorld(true);
  s.m.position.copy(gun.localToWorld(_v.set(...port))); s.m.visible = true; s.life = 0.45;
  s.m.quaternion.copy(gun.getWorldQuaternion(_q));
  s.v.set(rand(1.6, 2.3), rand(1.1, 1.7), rand(0.1, 0.4)).applyQuaternion(_q);
  s.w.set(rand(-30, 30), rand(-30, 30), rand(-30, 30));
}
function updShells(dt: number) {
  for (const L of shells.values()) for (const s of L) {
    if (s.life <= 0) continue;
    s.life -= dt; s.v.y -= 9.8 * dt; s.m.position.addScaledVector(s.v, dt);
    s.m.rotation.x += s.w.x * dt; s.m.rotation.y += s.w.y * dt; s.m.rotation.z += s.w.z * dt;
    if (s.life <= 0) s.m.visible = false;
  }
}

// ---------- Drohnen ----------
const boltMats: Record<string, { core: THREE.MeshBasicMaterial; glow: THREE.SpriteMaterial; tail: THREE.MeshBasicMaterial }> = {};
let BOLT_CORE: THREE.BufferGeometry | null = null, BOLT_TAIL: THREE.BufferGeometry | null = null;
export function makeBolt(col: string, r = 0.07): THREE.Object3D {
  BOLT_CORE ||= new THREE.SphereGeometry(1, 10, 8);
  BOLT_TAIL ||= crossGeo();
  const M = boltMats[col] ||= {
    core: new THREE.MeshBasicMaterial({ color: new THREE.Color(col).lerp(new THREE.Color(0xffffff), 0.65), toneMapped: false }),
    glow: new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ map: streak(), color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
  };
  const g = new THREE.Group();
  const core = new THREE.Mesh(BOLT_CORE, M.core); core.scale.setScalar(r); g.add(core);
  const glow = new THREE.Sprite(M.glow); glow.scale.setScalar(r * 5.5); g.add(glow);
  const tail = new THREE.Mesh(BOLT_TAIL, M.tail); tail.scale.set(r * 2.6, r * 2.6, 1.1); tail.position.z = -1.1; g.add(tail);   // Schweif hinter dem Kopf (+z = Flugrichtung)
  g.traverse((o: any) => { o.userData.sh = false; o.frustumCulled = false; });
  return g;
}
export function orientBolt(g: THREE.Object3D, vx: number, vy: number, vz: number) { g.lookAt(_v.set(g.position.x + vx, g.position.y + vy, g.position.z + vz)); }
const camD = (x: number, y: number, z: number) => Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z);
// Schuss einer Drohne: Mündungsblitz und Ton (nach Entfernung zur Kamera)
export function droneFire(x: number, y: number, z: number, col: string, dx: number, dy: number, dz: number, big = false) {
  flash(x + dx * 0.4, y + dy * 0.4, z + dz * 0.4, col, big ? 1.4 : 0.9, 0.09);
  sparks(x + dx * 0.4, y + dy * 0.4, z + dz * 0.4, dx, dy, dz, col, 5, 6, 0.15, 0.35, 0.015);
  const d = camD(x, y, z), k = 1 / (1 + (d / 20) ** 2);
  // Die Aufnahme ist leise (Pegel etwa ein Viertel des SMG-Schusses): verstärkt, sonst geht sie neben dem eigenen Feuer unter
  if (k > 0.03) sfx('drone_shot', 1.9 * k, (big ? 0.82 : 1) * (0.95 + Math.random() * 0.1));
}
export function boltHit(x: number, y: number, z: number, col: string, big = false) {
  flash(x, y, z, col, big ? 1.2 : 0.7, 0.12);
  sparks(x, y, z, 0, 1, 0, col, big ? 14 : 8, 5, 0.3, 1, 0.014);
  dust(x, y, z, '#4a4250', 0.6, 0.6, 0.6, 0.35);
}
// Explosion einer Drohne: heller Blitz, Funkenregen, Rauch, Trümmer mit Schwerkraft (ground: Bodenhöhe an x, z)
export function droneDeath(x: number, y: number, z: number, ground: (x: number, z: number) => number, big = false) {
  const k = big ? 1.8 : 1;
  flash(x, y, z, '#fff0d0', 2.4 * k, 0.18); flash(x, y, z, '#ff8a40', 3.6 * k, 0.45);
  sparks(x, y, z, 0, 0.6, 0, '#ffc070', Math.round(28 * k), 11, 0.6, 1, 0.022);
  for (let i = 0; i < 6 * k; i++) dust(x + rand(-0.5, 0.5), y + rand(-0.2, 0.4), z + rand(-0.5, 0.5), i < 2 ? '#4a3e38' : '#2e2c2c', rand(2.2, 3.4) * k, rand(1.8, 3), rand(0.6, 1.3), 0.9);
  if (!ngAirBlast(x, y + 0.2 * k, z, k)) flip('blast', x, y + 0.25 * k, z, 1.3 * k, 4.4 * k, 1.25, '#6a625c', 0.5);      // Feuerball, der zu Rauch wird
  const m = chInit();
  for (let i = 0; i < 9 * k; i++) {
    const c = chunks[chI = (chI + 1) % CMAX];
    c.on = true; c.p.set(x, y, z); c.v.set(rand(-4, 4), rand(2, 6.5), rand(-4, 4)); c.r.set(rand(0, 6), rand(0, 6), rand(0, 6)); c.w.set(rand(-9, 9), rand(-9, 9), rand(-9, 9));
    c.s = rand(0.05, 0.16) * (big ? 1.4 : 1); c.life = rand(2.5, 4); c.ground = ground;
  }
  m.instanceMatrix.needsUpdate = true;
  const d = camD(x, y, z), kv = 1 / (1 + (d / 25) ** 2);
  sfx('explosion' + Math.floor(Math.random() * 3), (big ? 0.75 : 0.5) * Math.max(0.15, kv), big ? 0.85 : 1.35);
}

// Granate: Feuerball, Blitz, Funken, Rauch (ohne Trümmer und ohne Ton – den spielt granate.ts).
// gy: Bodenhöhe darunter (Weltkoordinaten): dann Erdwurf und Brandfleck (ngfx.ts). Mit den Niagara-Bildern nur zwei alte Rauchflecken.
export function grenadeFx(x: number, y: number, z: number, gy: number | null = null) {
  flash(x, y, z, '#fff0d0', 4.5, 0.16); flash(x, y, z, '#ff8a40', 7, 0.4);
  sparks(x, y, z, 0, 0.7, 0, '#ffc070', 46, 14, 0.7, 1, 0.024);
  const ng = ngExplosion(x, y, z, 1, gy);
  if (!ng) flip('blast', x, y + 0.5, z, 2, 7.5, 1.4, '#6a625c', 0.6);
  for (let i = 0; i < (ng ? 2 : 7); i++) dust(x + rand(-1, 1), y + rand(-0.2, 0.6), z + rand(-1, 1), i < 3 ? '#4a3e38' : '#2e2c2c', rand(3, 4.6), rand(2, 3.4), rand(0.5, 1.2), 0.85);
}
const clearHooks: (() => void)[] = [];
export function onClearFootFx(fn: () => void) { clearHooks.push(fn); }
// Alles ausblenden (Mine verlassen, Menü, Sektorwechsel)
export function clearFootFx() {
  for (const fn of clearHooks) fn();
  for (const t of trs) t.on = false;
  if (trMesh) { for (let i = 0; i < TMAX; i++) trMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); trMesh.instanceMatrix.needsUpdate = true; }
  for (const c of chunks) c.on = false;
  if (chMesh) { for (let i = 0; i < CMAX; i++) chMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); chMesh.instanceMatrix.needsUpdate = true; }
  for (const d of dusts) { d.life = 0; d.sp.visible = false; }
  for (const F of Object.values(FLIPS)) for (const f of F.pool) { f.life = 0; f.m.visible = false; }
  for (const L of shells.values()) for (const s of L) { s.life = 0; s.m.visible = false; }
  clearNg();
}
// ---------- je Bild ----------
let lastT = 0;
export function updateFootFx(dt?: number) {
  const now = performance.now() / 1000; if (dt === undefined) { dt = lastT ? Math.min(0.1, now - lastT) : 1 / 60; } lastT = now;
  // Flipbooks: zur Kamera drehen, wachsen, Bild weiterschalten
  for (const F of Object.values(FLIPS)) for (const f of F.pool) {
    if (f.life <= 0) continue;
    f.t += dt; const u = f.t / f.life;
    if (u >= 1) { f.life = 0; f.m.visible = false; continue; }
    const fr = Math.min(F.frames - 1, Math.floor(u * F.frames)), s = f.s0 + (f.s1 - f.s0) * (1 - (1 - u) * (1 - u));
    f.cell.set(fr % F.n, F.n - 1 - Math.floor(fr / F.n));
    f.m.position.y += f.vy * dt; f.m.scale.setScalar(s); f.m.quaternion.copy(camera.quaternion);
    f.op.value = u > 0.8 ? (1 - u) / 0.2 : 1;
  }
  // Leuchtspuren
  if (trMesh) {
    let any = false;
    for (let i = 0; i < TMAX; i++) {
      const t = trs[i];
      if (!t.on) { continue; }
      any = true;
      t.t += dt;
      // sichtbares Tempo (echt wären ~400 m/s: auf 15 m nur ein Bild). Der Kopf bleibt am Einschlag stehen, das Ende läuft weiter nach,
      // bis die Spur ganz im Ziel verschwunden ist (bis 2026-11-19 abends lief das Ende mit dem stehenden Kopf mit und die Spur verschwand nie)
      const run = t.t * 240, head = Math.min(t.dist, run), tail = Math.max(0, run - t.len);
      if (tail >= t.dist - 0.01 || t.t > 3) { t.on = false; trMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      _v.copy(t.a).addScaledVector(t.d, tail); _q.setFromUnitVectors(_z, t.d); _s.set(t.w, t.w, Math.max(0.05, head - tail));
      trMesh.setMatrixAt(i, _m.compose(_v, _q, _s));
    }
    if (any) trMesh.instanceMatrix.needsUpdate = true;
  }
  // Staub
  for (const d of dusts) {
    if (d.life <= 0) continue;
    d.life -= dt; const u = 1 - Math.max(0, d.life) / d.max;
    d.sp.position.addScaledVector(d.v, dt); d.v.multiplyScalar(Math.pow(0.4, dt));
    d.sp.scale.setScalar(d.g0 + (d.g1 - d.g0) * Math.sqrt(u)); (d.sp.material as THREE.SpriteMaterial).opacity = d.op * (1 - u) * Math.min(1, u * 8);
    if (d.life <= 0) d.sp.visible = false;
  }
  // Trümmer
  if (chMesh) {
    let any = false;
    for (let i = 0; i < CMAX; i++) {
      const c = chunks[i]; if (!c.on) continue; any = true;
      c.life -= dt; c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt);
      const gy = c.ground(c.p.x, c.p.z) + c.s * 0.2;
      if (c.p.y < gy) { c.p.y = gy; c.v.y = Math.abs(c.v.y) * 0.3; c.v.x *= 0.5; c.v.z *= 0.5; c.w.multiplyScalar(0.5); }
      c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
      const sc = c.life < 0.6 ? c.s * Math.max(0, c.life / 0.6) : c.s;
      if (c.life <= 0) { c.on = false; chMesh.setMatrixAt(i, _m.makeScale(0, 0, 0)); continue; }
      chMesh.setMatrixAt(i, _m.compose(c.p, _q.setFromEuler(c.r), _s.setScalar(sc)));
    }
    if (any) chMesh.instanceMatrix.needsUpdate = true;
  }
  updShells(dt);
  updateNg(dt);
}
