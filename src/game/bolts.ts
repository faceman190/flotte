import * as THREE from 'three';
import { scene, camera, view } from '../core/engine';

// Laserbolzen der Bordkanonen (seit Alpha 1.41)
// Vorher war jeder Schuss ein eigenes gelbes Kästchen (7 m lang, ein Zeichenaufruf je Schuss). Jetzt zeichnet ein einziges InstancedMesh alle
// Schüsse als längliche, zur Kamera gedrehte Fläche: weißheißer Kern, farbiger Saum, abgerundete Spitze, der Schweif läuft dünn aus.
// Wie ein Schuss aussieht, steht in BOLTS (Stufen). Welche Stufe ein Spieler feuert, entscheidet playerBolt() aus Schaden je Schuss und
// Schiffsklasse; spätere Waffen (Ausrüstung, Klassen) setzen einfach eine eigene Stufe.

export interface BoltStyle {
  n: string;          // Name (für Werkstatt/Anzeigen später)
  core: number;       // Farbe des Kerns (wird überhellt, damit er im Bloom glüht)
  halo: number;       // Farbe des Saums
  w: number;          // Halbbreite des Kerns in m
  len: number;        // Länge in m
  glow: number;       // Helligkeit des Saums
  muzzle: number;     // Größe des Mündungsblitzes in m (0 = keiner)
  impact: number;     // Faktor für Blitz und Funken beim Einschlag
  pitch: number;      // Tonhöhe des Schusses (1 = Aufnahme)
}
export type BoltId = 'p1' | 'p2' | 'p3' | 'p4' | 'w' | 'e';
export const BOLTS: Record<BoltId, BoltStyle> = {
  // eigene Kanonen, nach Stärke
  p1: { n: 'Leichter Laser', core: 0xfff1d0, halo: 0xff9a2e, w: 0.2, len: 26, glow: 1.1, muzzle: 2.2, impact: 1, pitch: 1.08 },
  p2: { n: 'Laser', core: 0xfff4dc, halo: 0xff7a1e, w: 0.27, len: 32, glow: 1.2, muzzle: 3, impact: 1.3, pitch: 1 },
  p3: { n: 'Schwerer Laser', core: 0xfff8ec, halo: 0xff4a24, w: 0.36, len: 38, glow: 1.15, muzzle: 4, impact: 1.7, pitch: 0.9 },
  p4: { n: 'Plasmalaser', core: 0xf2f8ff, halo: 0x4aa8ff, w: 0.48, len: 46, glow: 1.3, muzzle: 5.2, impact: 2.2, pitch: 0.8 },
  // Patrouillen und Mitspieler
  w: { n: 'Patrouille', core: 0xfffbe8, halo: 0xffd27a, w: 0.18, len: 22, glow: 0.7, muzzle: 1.6, impact: 0.8, pitch: 1.1 },
  // Ferrox: violettes Geschoss, etwas dicker und kürzer (langsamer)
  e: { n: 'Ferrox', core: 0xf6e8ff, halo: 0xa040ff, w: 0.3, len: 18, glow: 1.1, muzzle: 0, impact: 1, pitch: 1 },
};
const IDS = Object.keys(BOLTS) as BoltId[];

// Stufe der eigenen Kanonen: nach Schaden je Schuss (Kanonen-Ausbau, Klasse, Waffenmodule). Eine Klasse kann eine Stufe fest vorgeben (bolt).
export function playerBolt(dmg: number, cls?: { bolt?: BoltId }): BoltId {
  if (cls && cls.bolt) return cls.bolt;
  return dmg >= 26 ? 'p4' : dmg >= 15 ? 'p3' : dmg >= 9 ? 'p2' : 'p1';
}
export const boltStyle = (id: string | undefined) => BOLTS[(id as BoltId) in BOLTS ? (id as BoltId) : 'p1'];

// ---------- Darstellung ----------
const MAX = 1500;
const geo = new THREE.InstancedBufferGeometry();
// Fläche: x quer (−1 … 1), y längs (0 = vor der Spitze, 1 = Ende des Schweifs)
geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0]), 3));
geo.setIndex([0, 2, 1, 1, 2, 3]);
const aHead = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
const aDir = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
const aPar = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4);     // Länge, Halbbreite, Helligkeit, Saum
const aCore = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
const aHalo = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 3), 3);
for (const a of [aHead, aDir, aPar, aCore, aHalo]) a.setUsage(THREE.DynamicDrawUsage);
geo.setAttribute('aHead', aHead); geo.setAttribute('aDir', aDir); geo.setAttribute('aPar', aPar); geo.setAttribute('aCore', aCore); geo.setAttribute('aHalo', aHalo);
geo.instanceCount = 0;

const mat = new THREE.ShaderMaterial({
  uniforms: { uPx: { value: 0.001 } },
  vertexShader: `
    attribute vec3 aHead; attribute vec3 aDir; attribute vec4 aPar; attribute vec3 aCore; attribute vec3 aHalo;
    uniform float uPx;   // Weltgröße eines Bildpunkts je Meter Abstand
    varying vec2 vQ; varying vec4 vPar; varying vec3 vCore; varying vec3 vHalo; varying float vS;
    void main() {
      // Mindestbreite knapp 3 Bildpunkte: In der Ferne würde der Kern sonst zwischen den Pixeln verschwinden. Breiter heißt dafür etwas dunkler.
      float dist = length(cameraPosition - aHead), w0 = aPar.y, w = max(w0, 1.4 * uPx * dist), len = aPar.x;
      float span = max(w * 2.6, 9.0 * uPx * dist);                  // Fläche breiter als der Kern: Platz für Saum und Kopfleuchten (mind. 9 Bildpunkte)
      vec3 view = normalize(cameraPosition - aHead);
      vec3 side = cross(aDir, view);
      float sl = length(side);
      side = sl > 0.02 ? side / sl : normalize(cross(aDir, abs(aDir.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
      float s = position.y * (len + span) - span;                   // m hinter der Spitze (negativ = davor, für die runde Kappe)
      vec3 p = aHead - aDir * s + side * position.x * span;
      vQ = vec2(position.x * span, s); vS = span;
      vPar = vec4(len, w, aPar.z * mix(1.0, w0 / w, 0.35), aPar.w); vCore = aCore; vHalo = aHalo;
      gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
    }`,
  fragmentShader: `
    varying vec2 vQ; varying vec4 vPar; varying vec3 vCore; varying vec3 vHalo; varying float vS;
    void main() {
      float len = vPar.x, w = vPar.y;
      float s = vQ.y, t = clamp(s / len, 0.0, 1.0);
      float thin = mix(1.0, 0.4, smoothstep(0.1, 1.0, t));         // Schweif läuft dünn aus
      float dx = abs(vQ.x) / (w * thin);
      float dz = s < 0.0 ? -s / w : 0.0;                             // runde Spitze
      float r = sqrt(dx * dx + dz * dz);
      float fade = 1.0 - pow(t, 2.2);
      float core = smoothstep(1.0, 0.25, r) * fade;
      float halo = exp(-r * r * 0.32) * fade * vPar.w * 0.55 * (1.0 - smoothstep(0.55 * vS, vS, abs(vQ.x)));   // Saum läuft vor dem Flächenrand aus
      if (s > len) { core = 0.0; halo *= max(0.0, 1.0 - (s - len) / vS); }
      // rundes Leuchten um die Spitze: So bleibt der Schuss auch sichtbar, wenn man ihn von hinten oder vorn sieht (Verfolgerkamera)
      float dh = length(vec2(vQ.x, s)) / (vS * 0.42);
      float head = exp(-dh * dh);
      core = max(core, head * 0.55);
      halo += head * vPar.w * 0.6;
      vec3 col = (vCore * core * 1.6 + vHalo * halo) * vPar.z;
      gl_FragColor = vec4(col, max(core, halo));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
});
const mesh = new THREE.Mesh(geo, mat);
mesh.frustumCulled = false;
mesh.renderOrder = 2;
scene.add(mesh);

// Platzhalter für bullet.mesh: Die Geschosse haben kein eigenes Netz mehr (Code, der mesh.position setzt oder es entfernt, bleibt harmlos)
export const NO_MESH = new THREE.Object3D();

const _c = new THREE.Color();
const colCache = new Map<number, [number, number, number]>();
function rgb(hex: number): [number, number, number] {
  let c = colCache.get(hex);
  if (!c) { _c.setHex(hex).convertSRGBToLinear(); c = [_c.r, _c.g, _c.b]; colCache.set(hex, c); }
  return c;
}
let n = 0;
function put(b: any) {
  if (n >= MAX) return;
  const st = BOLTS[b.bolt as BoltId] || BOLTS[b.kind === 'e' ? 'e' : b.kind === 'w' ? 'w' : 'p1'];
  const vl = Math.hypot(b.vx, b.vy, b.vz) || 1, i3 = n * 3, i4 = n * 4;
  aHead.array[i3] = b.x; aHead.array[i3 + 1] = b.y; aHead.array[i3 + 2] = b.z;
  aDir.array[i3] = b.vx / vl; aDir.array[i3 + 1] = b.vy / vl; aDir.array[i3 + 2] = b.vz / vl;
  // gerade abgefeuert: Länge wächst aus der Mündung heraus, statt hinter der Kanone zu beginnen
  const age = (b.age || 0), grow = Math.min(1, (age * vl) / st.len + 0.15);
  const fadeOut = Math.min(1, b.life / 0.08);
  aPar.array[i4] = st.len * grow; aPar.array[i4 + 1] = st.w; aPar.array[i4 + 2] = fadeOut; aPar.array[i4 + 3] = st.glow;
  const c = rgb(st.core), h = rgb(st.halo);
  aCore.array[i3] = c[0]; aCore.array[i3 + 1] = c[1]; aCore.array[i3 + 2] = c[2];
  aHalo.array[i3] = h[0]; aHalo.array[i3 + 1] = h[1]; aHalo.array[i3 + 2] = h[2];
  n++;
}
// Je Bild: alle fliegenden Schüsse (eigene, Patrouillen, Ferrox) eintragen. Torpedos haben ihr eigenes Netz.
export function syncBolts(lists: any[][]) {
  n = 0;
  mat.uniforms.uPx.value = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) / Math.max(1, view.H);
  for (const l of lists) for (const b of l) if (!b.torp && b.life > 0) put(b);
  geo.instanceCount = n;
  mesh.visible = n > 0;
  if (n) for (const a of [aHead, aDir, aPar, aCore, aHalo]) { a.clearUpdateRanges(); a.addUpdateRange(0, n * a.itemSize); a.needsUpdate = true; }
}
export const boltIds = IDS;
