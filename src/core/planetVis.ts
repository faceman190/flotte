import * as THREE from 'three';
import { renderer } from './engine';

// =====================================================================================
// Planeten im Orbit: KI-Oberflächenkarte je Planetentyp, Tag/Nacht-Grenze, Wolkenschicht,
// Stadtlichter auf der Nachtseite bewohnter Welten, leuchtende Lava/Kristalle, Atmosphärensaum, Ringe.
// Karten kommen aus public/planets.js (window.PLANETDATA) und werden erst bei Bedarf dekodiert.
// =====================================================================================
declare global { interface Window { PLANETDATA?: { map: Record<string, string>; ground: Record<string, string> } } }

const loader = new THREE.TextureLoader();
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
const MAPS: Record<string, THREE.Texture> = {}, GROUNDS: Record<string, THREE.Texture> = {};
function lru(cache: Record<string, THREE.Texture>, max: number) {
  const k = Object.keys(cache);
  if (k.length >= max) { cache[k[0]].dispose(); delete cache[k[0]]; }
}
export function planetMap(type: string) {
  if (MAPS[type]) return MAPS[type];
  const uri = window.PLANETDATA?.map[type];
  if (!uri) return null;
  lru(MAPS, 2);
  const t = loader.load(uri);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.wrapS = THREE.RepeatWrapping;
  return (MAPS[type] = t);
}
export function groundTexture(type: string) {
  if (GROUNDS[type]) return GROUNDS[type];
  const uri = window.PLANETDATA?.ground[type];
  if (!uri) return null;
  lru(GROUNDS, 2);
  const t = loader.load(uri);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (GROUNDS[type] = t);
}

// Aussehen pro Typ: Wolken (Menge, Farbe), Leuchten (Farbgewichte zur Erkennung, Farbe), Atmosphäre
interface Look { clouds: number; cloudCol: number; glowW: [number, number, number]; glowT: number; glowCol: number; glow: number; atm: number; atmK: number }
const LOOK: Record<string, Look> = {
  fels: { clouds: 0.55, cloudCol: 0xffffff, glowW: [0, 0, 0], glowT: 9, glowCol: 0, glow: 0, atm: 0x6aa8ff, atmK: 1.0 },
  wueste: { clouds: 0.12, cloudCol: 0xf0d8b0, glowW: [0, 0, 0], glowT: 9, glowCol: 0, glow: 0, atm: 0xffb070, atmK: 0.7 },
  eis: { clouds: 0.3, cloudCol: 0xf4f8ff, glowW: [0, 0, 0], glowT: 9, glowCol: 0, glow: 0, atm: 0xa8d8ff, atmK: 0.8 },
  vulkan: { clouds: 0.35, cloudCol: 0x4a3c36, glowW: [1, -0.55, -0.9], glowT: 0.3, glowCol: 0xff6a18, glow: 1.3, atm: 0xff7040, atmK: 0.8 },
  asche: { clouds: 0.08, cloudCol: 0x8a7a88, glowW: [0, 0, 0], glowT: 9, glowCol: 0, glow: 0, atm: 0xb070ff, atmK: 0.55 },
  kristall: { clouds: 0, cloudCol: 0xffffff, glowW: [0.45, -1, 0.75], glowT: 0.2, glowCol: 0xd070ff, glow: 1.1, atm: 0xb050ff, atmK: 0.9 },
};

const NOISE = `
float h3(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float n3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * n3(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
`;

const SURF_VS = `
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vObj;
void main(){ vUv = uv; vObj = normalize(position); vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const SURF_FS = `
uniform sampler2D map; uniform vec3 sdir; uniform vec3 tint; uniform vec3 atm; uniform float atmK;
uniform float clouds; uniform vec3 cloudCol; uniform float cities; uniform float time;
uniform vec3 glowW; uniform float glowT; uniform vec3 glowCol; uniform float glow;
varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vObj;
${NOISE}
void main(){
  vec3 N = normalize(vN), L = normalize(sdir), V = normalize(cameraPosition - vP);
  float ndl = dot(N, L), day = smoothstep(-0.12, 0.22, ndl);
  vec3 alb = texture2D(map, vUv).rgb * tint;
  vec3 col = alb * (max(ndl, 0.0) * 2.4 + 0.015);
  // Lava / Kristalle leuchten auch auf der Nachtseite
  float gm = smoothstep(glowT, glowT + 0.45, dot(texture2D(map, vUv).rgb, glowW));
  gm *= gm;
  col += glowCol * gm * glow * (0.35 + 0.65 * (1.0 - day));
  // Stadtlichter: Punkte in Haufen, nur nachts und nicht auf Wasser (dunkle, blaue Flächen)
  if (cities > 0.0) {
    float land = smoothstep(0.02, 0.08, alb.r + alb.g - alb.b * 1.2);
    float cl = smoothstep(0.55, 0.75, fbm(vObj * 9.0)) * smoothstep(0.78, 0.9, n3(vObj * 210.0));
    col += vec3(1.0, 0.72, 0.38) * cl * land * cities * (1.0 - day) * 1.6;
  }
  // Wolken (langsam drehend), mit Licht der Sonne
  if (clouds > 0.0) {
    float a = time * 0.004; mat2 r = mat2(cos(a), -sin(a), sin(a), cos(a));
    vec3 q = vObj; q.xz = r * q.xz;
    float c = smoothstep(0.66 - clouds * 0.32, 0.8 - clouds * 0.2, fbm(q * 3.2 + fbm(q * 6.0) * 0.8));
    vec3 cc = cloudCol * (max(ndl, 0.0) * 2.2 + 0.01);
    col = mix(col, cc, c * 0.92);
  }
  // Atmosphäre: Streulicht am Rand der Tagseite, rötlicher Saum an der Dämmerungslinie
  float fr = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  col += atm * fr * atmK * smoothstep(-0.3, 0.6, ndl) * 1.4;
  col += vec3(1.0, 0.45, 0.2) * atmK * 0.25 * exp(-pow(ndl * 7.0, 2.0)) * fr;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const HALO_VS = `varying vec3 vN; varying vec3 vP;
void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const HALO_FS = `uniform vec3 atm; uniform vec3 sdir; uniform float k; uniform float inner;
varying vec3 vN; varying vec3 vP;
void main(){
  vec3 N = normalize(vN), V = normalize(cameraPosition - vP);
  float d = -dot(N, V);                       // 0 am äußeren Rand, ~inner an der Planetenkante
  float i = pow(smoothstep(0.0, inner, d), 2.2);
  float lit = smoothstep(-0.45, 0.5, dot(N, normalize(sdir)));
  gl_FragColor = vec4(atm * i * lit * k, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const RING_VS = `varying vec3 vP; varying float vR;
void main(){ vR = length(position.xy); vec4 w = modelMatrix * vec4(position, 1.0); vP = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RING_FS = `uniform vec3 col; uniform vec3 sdir; uniform vec3 center; uniform float R; uniform float r0; uniform float r1;
varying vec3 vP; varying float vR;
${NOISE}
void main(){
  float t = (vR - r0) / (r1 - r0);
  float bands = 0.55 + 0.45 * sin(t * 90.0 + n3(vec3(t * 40.0)) * 6.0) * n3(vec3(t * 13.0, 1.0, 2.0));
  float a = bands * smoothstep(0.0, 0.06, t) * smoothstep(1.0, 0.85, t) * (1.0 - 0.75 * smoothstep(0.42, 0.46, t) * smoothstep(0.52, 0.48, t));
  // Schatten des Planeten: Strahl zur Sonne schneidet die Kugel?
  vec3 L = normalize(sdir), o = vP - center; float b = dot(o, L), c = dot(o, o) - R * R;
  float sh = (b < 0.0 && b * b - c > 0.0) ? 0.08 : 1.0;
  gl_FragColor = vec4(col * (0.1 + 0.85 * sh), a * 0.55);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface PlanetLookDef { size: number; tint: number; type?: string; cities?: number; ring?: number; atm?: number }
// Baut die Planetengruppe (ohne Position); gibt null, wenn keine Karte vorhanden ist
export function buildPlanet(p: PlanetLookDef, sunDir: THREE.Vector3): THREE.Group | null {
  const type = p.type || 'fels', map = planetMap(type);
  if (!map) return null;
  const lk = LOOK[type] || LOOK.fels, g = new THREE.Group();
  const atmC = new THREE.Color(lk.atm);
  const surf = new THREE.Mesh(new THREE.SphereGeometry(p.size, 96, 64), new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map }, sdir: { value: sunDir }, tint: { value: new THREE.Color(0xffffff).lerp(new THREE.Color(p.tint), 0.25) },
      atm: { value: atmC }, atmK: { value: lk.atmK }, clouds: { value: lk.clouds }, cloudCol: { value: new THREE.Color(lk.cloudCol) },
      cities: { value: p.cities || 0 }, time: { value: 0 },
      glowW: { value: new THREE.Vector3(...lk.glowW) }, glowT: { value: lk.glowT }, glowCol: { value: new THREE.Color(lk.glowCol) }, glow: { value: lk.glow },
    },
    vertexShader: SURF_VS, fragmentShader: SURF_FS, fog: false,
  }));
  surf.name = 'surf';
  g.add(surf);
  const hs = 1.07, halo = new THREE.Mesh(new THREE.SphereGeometry(p.size * hs, 64, 40), new THREE.ShaderMaterial({
    uniforms: { atm: { value: atmC }, sdir: { value: sunDir }, k: { value: 2.0 * lk.atmK }, inner: { value: Math.sqrt(1 - 1 / (hs * hs)) } },
    vertexShader: HALO_VS, fragmentShader: HALO_FS, side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
  }));
  g.add(halo);
  if (p.ring) {
    const r0 = p.size * 1.3, r1 = p.size * 2.0;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 160, 1), new THREE.ShaderMaterial({
      uniforms: { col: { value: new THREE.Color(p.ring) }, sdir: { value: sunDir }, center: { value: new THREE.Vector3() }, R: { value: p.size }, r0: { value: r0 }, r1: { value: r1 } },
      vertexShader: RING_VS, fragmentShader: RING_FS, side: THREE.DoubleSide, transparent: true, depthWrite: false, fog: false,
    }));
    ring.rotation.x = -Math.PI / 2 + 0.32;
    ring.name = 'ring';
    g.add(ring);
  }
  return g;
}
// pro Bild: Wolken drehen, Ringschatten-Zentrum nachführen
const _c = new THREE.Vector3();
export function updatePlanet(g: THREE.Group, t: number) {
  const s = g.getObjectByName('surf') as THREE.Mesh | undefined;
  if (s) (s.material as THREE.ShaderMaterial).uniforms.time.value = t;
  const r = g.getObjectByName('ring') as THREE.Mesh | undefined;
  if (r) (r.material as THREE.ShaderMaterial).uniforms.center.value.copy(g.getWorldPosition(_c));
}
export function disposePlanet(g: THREE.Group) {
  g.traverse((o: any) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
}
