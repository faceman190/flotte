import * as THREE from 'three';
import { scene, camera } from '../core/engine';
import { rand } from '../core/util';

// =====================================================================================
// Effekte mit den Flipbooks aus Epics "Niagara Examples Pack" (seit 27.11.2026, docs/niagara-effekte.md).
// Die Niagara-Systeme selbst laufen nur in Unreal; übernommen sind ihre Bildfolgen (scripts/build-niagara.mjs → tex/fx_ng_*)
// und ihr Aufbau als Vorlage: Explosion = Feuerball, der zu Rauch wird, + Erdwurf am Boden + Rauchsäule + Brandfleck;
// Einschlag = Staubwolke + Einschussloch; Mündungsfeuer = Stern von vorn + Flamme entlang des Laufs + etwas Schmauch.
//
// Technik: je Bildfolge ein einziges Objekt (InstancedBufferGeometry), jedes Teilchen ein Viereck, das sich im Shader zur Kamera
// dreht. Zwischen zwei Bildern wird überblendet, damit auch lange Wolken mit 64 Bildern weich laufen. Die Texturen kommen mit dem
// Hintergrund-Paket; bis sie geladen sind, geben die Funktionen false zurück und der Aufrufer zeigt den alten Effekt.
//
// Flipbook-Aufbau (Niagara "EOO"): R = Leuchten, G = Verschattung, A = Deckung. Mündungsfeuer und Schmauch: Graustufen.
// =====================================================================================

type Mode = 'eoo' | 'add' | 'gray';
type Facing = 'cam' | 'up' | 'axis';
interface Spec { key: string; cx: number; cy: number; loop: boolean; mode: Mode; face: Facing; max: number; order: number }
const SPECS = {
  expl: { key: 'fx_ng_expl', cx: 8, cy: 8, loop: false, mode: 'eoo', face: 'cam', max: 10, order: 5 },
  wide: { key: 'fx_ng_wide', cx: 8, cy: 16, loop: false, mode: 'eoo', face: 'up', max: 6, order: 4 },
  fire: { key: 'fx_ng_fire', cx: 8, cy: 8, loop: true, mode: 'eoo', face: 'cam', max: 32, order: 5 },
  smoke: { key: 'fx_ng_smoke', cx: 8, cy: 8, loop: true, mode: 'eoo', face: 'cam', max: 48, order: 4 },
  dust: { key: 'fx_ng_dust', cx: 8, cy: 8, loop: true, mode: 'eoo', face: 'cam', max: 96, order: 4 },
  msmoke: { key: 'fx_ng_msmoke', cx: 8, cy: 8, loop: false, mode: 'gray', face: 'cam', max: 24, order: 4 },
  mflame: { key: 'fx_ng_mflame', cx: 4, cy: 1, loop: false, mode: 'add', face: 'axis', max: 16, order: 6 },
  mfront: { key: 'fx_ng_mfront', cx: 2, cy: 2, loop: false, mode: 'add', face: 'cam', max: 16, order: 6 },
} satisfies Record<string, Spec>;
export type NgKind = keyof typeof SPECS;

interface P {
  x: number; y: number; z: number; vx: number; vy: number; vz: number; drag: number; grav: number;
  s0: number; s1: number; asp: number; rot: number; vrot: number; t: number; delay: number; life: number;
  f0: number; fps: number; cell: number; r: number; g: number; b: number; a: number; heat: number; fin: number; fout: number;
  ax: number; ay: number; az: number; d: number;
}
interface Sys { S: Spec; tex: THREE.Texture | null; ok: boolean; mesh: THREE.Mesh | null; geo: THREE.InstancedBufferGeometry | null; ps: P[]; buf: Record<string, THREE.InstancedBufferAttribute> }
const SYS = {} as Record<NgKind, Sys>;
for (const k of Object.keys(SPECS) as NgKind[]) SYS[k] = { S: SPECS[k], tex: null, ok: false, mesh: null, geo: null, ps: [], buf: {} };

const VS = `
attribute vec3 iPos; attribute vec2 iSize; attribute float iRot; attribute float iFrame; attribute vec4 iCol; attribute float iHeat;
#ifdef AXIS
attribute vec3 iAxis;
#endif
uniform vec2 grid; uniform float loopN;
varying vec2 vUv0; varying vec2 vUv1; varying float vMix; varying vec4 vCol; varying float vHeat;
vec2 cellOf(float f) { return vec2(mod(f, grid.x), grid.y - 1.0 - floor(f / grid.x)); }
void main() {
  vec2 q = position.xy;
  vec3 wp;
#if defined(AXIS)
  vec3 ax = normalize(iAxis), toCam = normalize(cameraPosition - iPos);
  vec3 side = cross(ax, toCam); float sl = length(side); side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
  wp = iPos + ax * (q.y + 0.5) * iSize.y + side * q.x * iSize.x;            // Fuß an iPos, Länge entlang der Achse
#elif defined(UPRIGHT)
  vec3 r = vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]); float rl = length(r); r = rl > 1e-4 ? r / rl : vec3(1.0, 0.0, 0.0);
  wp = iPos + r * q.x * iSize.x + vec3(0.0, 1.0, 0.0) * (q.y + 0.5) * iSize.y;   // steht auf dem Boden, dreht sich nur um die Hochachse
#else
  float c = cos(iRot), s = sin(iRot); vec2 rq = vec2(c * q.x - s * q.y, s * q.x + c * q.y) * iSize;
  vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]), up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
  wp = iPos + right * rq.x + up * rq.y;
#endif
  gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  float f0 = floor(iFrame), f1 = loopN > 0.0 ? mod(f0 + 1.0, loopN) : min(f0 + 1.0, grid.x * grid.y - 1.0);
  vMix = iFrame - f0;
  vec2 u = clamp(uv, 0.01, 0.99);
  vUv0 = (cellOf(f0) + u) / grid; vUv1 = (cellOf(f1) + u) / grid;
  vCol = iCol; vHeat = iHeat;
}`;
const FS = `
uniform sampler2D map;
varying vec2 vUv0; varying vec2 vUv1; varying float vMix; varying vec4 vCol; varying float vHeat;
void main() {
  vec4 t = mix(texture2D(map, vUv0), texture2D(map, vUv1), vMix);
#if defined(EOO)
  float e = t.r * vHeat;
  vec3 col = vCol.rgb * (0.3 + 0.8 * t.g) + vec3(1.0, 0.36, 0.07) * e * 2.8 + vec3(1.0, 0.78, 0.48) * e * e * 3.2;   // Rauch nach Verschattung, Feuer als Glutfarbe
  float a = clamp(t.a * (1.0 + e * 0.5), 0.0, 1.0) * vCol.a;      // Leuchten macht dichter (Niagara: Emissive To Opacity), nur wo Deckung ist (WebP mischt unter A = 0 die Farben)
#elif defined(ADD)
  float l = max(t.r, max(t.g, t.b)) * t.a;
  vec3 col = vCol.rgb * l * (1.0 + l * 1.5); float a = l * vCol.a;
#else
  vec3 col = vCol.rgb * (0.55 + 0.45 * t.r); float a = t.a * vCol.a;
#endif
  if (a < 0.003) discard;
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function load(k: NgKind): boolean {
  const s = SYS[k];
  if (s.ok) return true;
  if (!s.tex) {
    const url = window.TEXDATA?.[s.S.key]; if (!url) return false;
    s.tex = new THREE.TextureLoader().load(url, () => { s.ok = true; });
    s.tex.colorSpace = THREE.NoColorSpace; s.tex.generateMipmaps = false; s.tex.minFilter = THREE.LinearFilter;   // ohne Verkleinerungsstufen: Nachbarbilder liefen sonst ineinander
  }
  return false;
}
/** Bildfolgen vorab laden (zu Fuß mit Waffe), damit der erste Schuss sie schon zeigt */
export function warmNg() { for (const k of Object.keys(SYS) as NgKind[]) load(k); vmFlashTex(); }

function build(k: NgKind) {
  const s = SYS[k], S = s.S, n = S.max;
  const geo = new THREE.InstancedBufferGeometry();
  const pl = new THREE.PlaneGeometry(1, 1);
  geo.index = pl.index; geo.setAttribute('position', pl.getAttribute('position')); geo.setAttribute('uv', pl.getAttribute('uv'));
  const mk = (name: string, size: number) => { const a = new THREE.InstancedBufferAttribute(new Float32Array(n * size), size); a.setUsage(THREE.DynamicDrawUsage); geo.setAttribute(name, a); s.buf[name] = a; };
  mk('iPos', 3); mk('iSize', 2); mk('iRot', 1); mk('iFrame', 1); mk('iCol', 4); mk('iHeat', 1); if (S.face === 'axis') mk('iAxis', 3);
  geo.instanceCount = 0;
  const defines: Record<string, number> = {};
  if (S.mode === 'eoo') defines.EOO = 1; else if (S.mode === 'add') defines.ADD = 1;
  if (S.face === 'axis') defines.AXIS = 1; else if (S.face === 'up') defines.UPRIGHT = 1;
  const mat = new THREE.ShaderMaterial({
    uniforms: { map: { value: s.tex }, grid: { value: new THREE.Vector2(S.cx, S.cy) }, loopN: { value: S.loop ? S.cx * S.cy : 0 } },
    vertexShader: VS, fragmentShader: FS, defines, transparent: true, depthWrite: false, fog: false,
    blending: S.mode === 'add' ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = S.order; mesh.userData.sh = false;
  scene.add(mesh); s.mesh = mesh; s.geo = geo;
}

export interface NgOpt {
  vx?: number; vy?: number; vz?: number; drag?: number; grav?: number; s0: number; s1?: number; asp?: number; rot?: number; vrot?: number;
  life: number; delay?: number; fps?: number; frame?: number; cell?: number; col?: string; a?: number; heat?: number; fin?: number; fout?: number;
  axis?: THREE.Vector3;
}
const _c = new THREE.Color();
/** Ein Teilchen der Bildfolge k an (x, y, z). false, solange die Bildfolge noch nicht geladen ist */
export function ngSpawn(k: NgKind, x: number, y: number, z: number, o: NgOpt): boolean {
  if (!load(k)) return false;
  const s = SYS[k]; if (!s.mesh) build(k);
  let p: P;
  if (s.ps.length < s.S.max) { p = {} as P; s.ps.push(p); }
  else { p = s.ps[0]; for (const q of s.ps) if (q.t / q.life > p.t / p.life) p = q; }      // voll: das älteste ersetzen
  _c.set(o.col || '#ffffff');
  const N = s.S.cx * s.S.cy;
  Object.assign(p, {
    x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, drag: o.drag ?? 0.6, grav: o.grav || 0, s0: o.s0, s1: o.s1 ?? o.s0, asp: o.asp || 1,
    rot: o.rot ?? rand(0, 6.28), vrot: o.vrot ?? rand(-0.4, 0.4), t: 0, delay: o.delay || 0, life: o.life,
    f0: o.frame ?? (s.S.loop ? Math.floor(rand(0, N)) : 0), fps: o.fps ?? 20, cell: o.cell ?? Math.floor(rand(0, N)),
    r: _c.r, g: _c.g, b: _c.b, a: o.a ?? 1, heat: o.heat ?? 1, fin: o.fin ?? 0.08, fout: o.fout ?? 0.35,
    ax: o.axis ? o.axis.x : 0, ay: o.axis ? o.axis.y : 1, az: o.axis ? o.axis.z : 0, d: 0,
  });
  return true;
}

// ---------- fertige Effekte ----------
const _n = new THREE.Vector3(), _u = new THREE.Vector3();
/**
 * Mündungsfeuer in der Welt (Außensicht, Gegner): Stern von vorn, Flamme entlang des Laufs, ab und zu Schmauch.
 * dir: Schussrichtung (Einheitsvektor) · k: Größe (1 = Gewehr) · leise: Schalldämpfer (nur kleiner Stern, kein Schmauch)
 */
export function ngMuzzle(p: THREE.Vector3, dir: THREE.Vector3, k = 1, leise = false): boolean {
  if (!ngSpawn('mfront', p.x + dir.x * 0.03, p.y + dir.y * 0.03, p.z + dir.z * 0.03, { s0: (leise ? 0.12 : 0.34) * k, s1: (leise ? 0.14 : 0.42) * k, life: 0.055, col: '#ffcf96', fin: 0, fout: 0.5, vrot: 0 })) return false;
  if (leise) return true;
  ngSpawn('mflame', p.x, p.y, p.z, { s0: 0.13 * k, s1: 0.17 * k, asp: 3.2, life: 0.05, col: '#ffbe78', fin: 0, fout: 0.5, axis: dir });
  if (Math.random() < 0.45) ngSpawn('msmoke', p.x + dir.x * 0.15, p.y + dir.y * 0.15, p.z + dir.z * 0.15,
    { vx: dir.x * 0.8, vy: dir.y * 0.8 + 0.25, vz: dir.z * 0.8, drag: 2, s0: 0.12 * k, s1: 0.75 * k, life: rand(0.9, 1.4), col: '#c4beb6', a: 0.32, fin: 0.05, fout: 0.6 });
  return true;
}

export type NgStoff = 'default' | 'metall' | 'wasser' | 'fleisch';
/** Einschlag: Staubwolke je Untergrund (Fels/Erde braun-grau, Metall dunkler Rauch). n: Flächennormale, sonst gegen die Schussrichtung */
export function ngImpact(p: THREE.Vector3, dir: THREE.Vector3, stoff: NgStoff, n?: THREE.Vector3 | null, col = '#a2968a'): boolean {
  if (stoff === 'wasser' || stoff === 'fleisch') return false;
  const nn = n ? _n.copy(n) : _n.copy(dir).multiplyScalar(-1);
  if (stoff === 'metall') {
    return ngSpawn('dust', p.x + nn.x * 0.05, p.y + nn.y * 0.05, p.z + nn.z * 0.05,
      { vx: nn.x * 0.6, vy: nn.y * 0.6 + 0.2, vz: nn.z * 0.6, drag: 3, s0: 0.12, s1: 0.55, life: 0.55, col: '#54555a', a: 0.6, heat: 0.4, fps: 30 });
  }
  if (!ngSpawn('dust', p.x + nn.x * 0.1, p.y + nn.y * 0.1 + 0.05, p.z + nn.z * 0.1,
    { vx: nn.x * 1.2, vy: nn.y * 1.2 + 0.35, vz: nn.z * 1.2, drag: 2.6, s0: 0.22, s1: 1.15, life: rand(0.8, 1.05), col, a: 0.85, heat: 0, fps: 26 })) return false;
  ngSpawn('dust', p.x, p.y + 0.04, p.z, { vx: nn.x * 0.3, vy: 0.15, vz: nn.z * 0.3, drag: 1.5, s0: 0.35, s1: 1.6, life: rand(1.4, 1.9), col, a: 0.35, heat: 0, fps: 14, delay: 0.05 });
  return true;
}

/**
 * Explosion nach Niagaras NS_Explosion / NS_Dirt_Explosion: Feuerball, der zu Rauch wird, Erdwurf (nur am Boden), Rauchsäule,
 * Brandfleck (nur am Boden). k: Größe (1 = Handgranate) · gy: Bodenhöhe unter der Explosion oder null in der Luft
 */
export function ngExplosion(x: number, y: number, z: number, k = 1, gy: number | null = null): boolean {
  if (!ngSpawn('expl', x, y + 0.3 * k, z, { vy: 0.7, drag: 0.5, s0: 2.2 * k, s1: 6.2 * k, life: 1.7, col: '#4e4844', heat: 1.1, fin: 0, fout: 0.25, vrot: rand(-0.25, 0.25) })) return false;
  ngSpawn('fire', x, y + 0.2 * k, z, { s0: 1.4 * k, s1: 2.8 * k, life: 0.45, col: '#3a2c24', heat: 1.3, fin: 0, fout: 0.6, fps: 40 });
  const ground = gy !== null && y - gy < 2.2 * k;
  if (ground) {
    ngSpawn('wide', x, gy!, z, { s0: 7.5 * k, s1: 9.5 * k, asp: 0.5, life: 1.5, col: '#6a5a4a', heat: 0.9, fin: 0, fout: 0.35 });
    scorch(x, gy! + 0.02, z, _u.set(0, 1, 0), 3.4 * k);
  }
  for (let i = 0; i < 4; i++) {      // Rauchsäule: dunkle Wolken, die langsam steigen und sich ausbreiten
    const a = rand(0, 6.28), r = rand(0.3, 1.1) * k;
    ngSpawn('smoke', x + Math.cos(a) * r, y + rand(0.4, 1.4) * k, z + Math.sin(a) * r,
      { vx: Math.cos(a) * 0.3, vy: rand(0.7, 1.3), vz: Math.sin(a) * 0.3, drag: 0.35, s0: 1.6 * k, s1: rand(5, 7) * k, life: rand(4, 6), delay: 0.25 + i * 0.12, col: '#36322f', a: 0.75, heat: 0, fps: 12, fin: 0.15, fout: 0.5 });
  }
  return true;
}
/** kleine Explosion in der Luft (Drohne): Feuerball und etwas Rauch, ohne Erdwurf */
export function ngAirBlast(x: number, y: number, z: number, k = 1): boolean {
  if (!ngSpawn('expl', x, y, z, { vy: 0.4, s0: 1.3 * k, s1: 4.2 * k, life: 1.4, col: '#4a4440', heat: 1.1, fin: 0, fout: 0.3 })) return false;
  for (let i = 0; i < 2; i++) ngSpawn('smoke', x + rand(-0.4, 0.4) * k, y + rand(0, 0.5) * k, z + rand(-0.4, 0.4) * k,
    { vy: rand(0.5, 0.9), drag: 0.4, s0: 1 * k, s1: 3.6 * k, life: rand(3, 4.2), delay: 0.2 + i * 0.15, col: '#2f2c2b', a: 0.7, heat: 0, fps: 12, fin: 0.15 });
  return true;
}
/** Rauchfahne eines Geschosses (Granatwerfer): je Aufruf eine kleine helle Wolke */
export function ngTrail(x: number, y: number, z: number): boolean {
  return ngSpawn('dust', x, y, z, { vy: 0.12, drag: 1, s0: 0.12, s1: 0.75, life: rand(0.8, 1.2), col: '#a49e96', a: 0.5, heat: 0.15, fps: 24, fin: 0.02, fout: 0.6 });
}
/** brennende Stelle (Wrack): Flammen und Rauch für dauer Sekunden, im Abstand von 0,2 s nachgelegt */
const fires: { x: number; y: number; z: number; s: number; left: number; next: number }[] = [];
export function ngBurn(x: number, y: number, z: number, s: number, dauer: number) { if (fires.length < 6) fires.push({ x, y, z, s, left: dauer, next: 0 }); }

// ---------- Abziehbilder: Einschusslöcher und Brandflecken ----------
let holeMesh: THREE.InstancedMesh | null = null, holeI = 0, holeTex: THREE.Texture | null = null;
const HMAX = 64, _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s3 = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
/** Einschussloch auf einer ruhenden Fläche (p: Treffpunkt, n: Flächennormale) */
export function bulletHole(p: THREE.Vector3, n: THREE.Vector3, size = 0.1) {
  if (!holeTex) { const url = window.TEXDATA?.fx_ng_hole; if (!url) return; holeTex = new THREE.TextureLoader().load(url); holeTex.colorSpace = THREE.SRGBColorSpace; }
  if (!holeMesh) {
    holeMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: holeTex, color: 0x9a9a9a, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), HMAX);
    holeMesh.frustumCulled = false; holeMesh.renderOrder = 2; holeMesh.userData.sh = false;
    for (let i = 0; i < HMAX; i++) holeMesh.setMatrixAt(i, _m4.makeScale(0, 0, 0));
    scene.add(holeMesh);
  }
  _q.setFromUnitVectors(_z, _n.copy(n).normalize()); _q.multiply(new THREE.Quaternion().setFromAxisAngle(_z, rand(0, 6.28)));
  _u.copy(p).addScaledVector(_n, 0.01);
  holeMesh.setMatrixAt(holeI = (holeI + 1) % HMAX, _m4.compose(_u, _q, _s3.setScalar(size * rand(0.85, 1.2))));
  holeMesh.instanceMatrix.needsUpdate = true;
}
interface Scorch { m: THREE.Mesh; t: number }
const scorches: Scorch[] = [];
let scorchTex: THREE.Texture[] | null = null, scI = 0;
const SC_LIFE = 40;
/** Brandfleck (p: Mitte, n: Flächennormale, size: Durchmesser in m); verblasst nach SC_LIFE Sekunden */
export function scorch(x: number, y: number, z: number, n: THREE.Vector3, size: number) {
  if (!scorchTex) {
    const url = window.TEXDATA?.fx_ng_scorch; if (!url) return;
    const base = new THREE.TextureLoader().load(url);
    scorchTex = [0, 1, 2, 3].map(i => { const t = base.clone(); t.repeat.set(0.5, 0.5); t.offset.set((i % 2) * 0.5, Math.floor(i / 2) * 0.5); return t; });
  }
  let s = scorches.find(q => q.t <= 0);
  if (!s) {
    if (scorches.length < 10) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x0c0a09, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
      m.renderOrder = 1; m.userData.sh = false; scene.add(m); s = { m, t: 0 }; scorches.push(s);
    } else s = scorches[scI = (scI + 1) % scorches.length];
  }
  const mat = s.m.material as THREE.MeshBasicMaterial;
  mat.alphaMap = scorchTex[Math.floor(rand(0, 4))]; mat.needsUpdate = true; mat.opacity = 0.85;
  s.m.position.set(x, y, z); s.m.quaternion.setFromUnitVectors(_z, _n.copy(n).normalize()); s.m.rotateZ(rand(0, 6.28));
  s.m.scale.setScalar(size); s.m.visible = true; s.t = SC_LIFE;
}

// ---------- Mündungsfeuer in der Ich-Sicht ----------
// Die Waffe der Ich-Sicht hat schon ein Leuchtbild (mineArt.ts, vm.flash). Hier bekommt es eins der vier Sternbilder von vorn.
let vmTex: THREE.Texture[] | null = null;
function vmFlashTex() {
  if (vmTex) return vmTex;
  const url = window.TEXDATA?.fx_ng_mfront; if (!url) return null;
  const base = new THREE.TextureLoader().load(url); base.colorSpace = THREE.SRGBColorSpace;
  vmTex = [0, 1, 2, 3].map(i => { const t = base.clone(); t.repeat.set(0.5, 0.5); t.offset.set((i % 2) * 0.5, Math.floor(i / 2) * 0.5); return t; });
  return vmTex;
}
/** je Bild, solange das Mündungsfeuer der Ich-Sicht sichtbar ist: zufälliges Sternbild */
export function ngVmFlash(sp: THREE.Sprite) {
  const T = vmFlashTex(); if (!T) return;
  const m = sp.material as THREE.SpriteMaterial;
  if (!m.userData.ng) { m.userData.ng = 1; m.color.set(0xffd7a0); }
  m.map = T[Math.floor(Math.random() * 4)]; m.needsUpdate = true;
}

// ---------- je Bild ----------
const order: P[] = [];
export function updateNg(dt: number) {
  for (const f of fires) {
    f.left -= dt; f.next -= dt;
    if (f.next <= 0 && f.left > 0) {
      f.next = 0.2;
      ngSpawn('fire', f.x + rand(-0.2, 0.2) * f.s, f.y + 0.2 * f.s, f.z + rand(-0.2, 0.2) * f.s, { vy: 0.8, drag: 0.3, s0: 0.9 * f.s, s1: 1.4 * f.s, life: 0.9, col: '#2a2420', heat: 1, fin: 0.15, fout: 0.5, fps: 28, vrot: 0 });
      if (Math.random() < 0.4) ngSpawn('smoke', f.x, f.y + 0.9 * f.s, f.z, { vy: 1.1, drag: 0.2, s0: 0.8 * f.s, s1: 3 * f.s, life: 3, col: '#2c2a29', a: 0.55, heat: 0, fps: 12, fin: 0.2 });
    }
  }
  for (let i = fires.length - 1; i >= 0; i--) if (fires[i].left <= 0) fires.splice(i, 1);
  for (const s of scorches) {
    if (s.t <= 0) continue;
    s.t -= dt; (s.m.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.min(1, s.t / 8);
    if (s.t <= 0) s.m.visible = false;
  }
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  for (const k of Object.keys(SYS) as NgKind[]) {
    const s = SYS[k]; if (!s.geo || !s.ps.length) { if (s.geo) s.geo.instanceCount = 0; continue; }
    const S = s.S, N = S.cx * S.cy;
    order.length = 0;
    for (let i = s.ps.length - 1; i >= 0; i--) {
      const p = s.ps[i];
      p.t += dt;
      if (p.t >= p.delay + p.life) { s.ps.splice(i, 1); continue; }
      if (p.t < p.delay) continue;
      const kd = Math.exp(-p.drag * dt);
      p.vx *= kd; p.vy = p.vy * kd - p.grav * dt; p.vz *= kd;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.rot += p.vrot * dt;
      p.d = (p.x - cx) ** 2 + (p.y - cy) ** 2 + (p.z - cz) ** 2;
      order.push(p);
    }
    order.sort((a, b) => b.d - a.d);      // von hinten nach vorn (durchscheinende Wolken)
    const B = s.buf;
    let n = 0;
    for (const p of order) {
      const u = (p.t - p.delay) / p.life, e = 1 - (1 - u) * (1 - u);
      const sz = p.s0 + (p.s1 - p.s0) * e;
      const fade = (p.fin > 0 ? Math.min(1, u / p.fin) : 1) * (u > 1 - p.fout ? (1 - u) / p.fout : 1);
      let fr: number;
      if (S.face === 'axis' || k === 'mfront') fr = p.cell;                        // Einzelbild (Mündungsfeuer)
      else if (S.loop) fr = (p.f0 + (p.t - p.delay) * p.fps) % N;
      else fr = Math.min(N - 1.001, u * (N - 1));
      B.iPos.setXYZ(n, p.x, p.y, p.z); B.iSize.setXY(n, sz, sz * p.asp);
      B.iRot.setX(n, p.rot); B.iFrame.setX(n, fr); B.iCol.setXYZW(n, p.r, p.g, p.b, p.a * fade); B.iHeat.setX(n, p.heat);
      if (B.iAxis) B.iAxis.setXYZ(n, p.ax, p.ay, p.az);
      n++;
    }
    for (const a of Object.values(B)) { a.needsUpdate = true; a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); }
    s.geo.instanceCount = n;
  }
}
export function clearNg() {
  for (const s of Object.values(SYS)) { s.ps.length = 0; if (s.geo) s.geo.instanceCount = 0; }
  fires.length = 0;
  for (const s of scorches) { s.t = 0; s.m.visible = false; }
  if (holeMesh) { for (let i = 0; i < HMAX; i++) holeMesh.setMatrixAt(i, _m4.makeScale(0, 0, 0)); holeMesh.instanceMatrix.needsUpdate = true; }
}
