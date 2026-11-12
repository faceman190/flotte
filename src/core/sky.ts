import * as THREE from 'three';
import { scene, sun, rim, renderer, GLOW, DEFAULT_ENV } from './engine';
import { TEXT, envFor, nebulaTexture } from './textures';
import { buildPlanet, updatePlanet, disposePlanet } from './planetVis';

// Himmel: Nebel-Panorama mit Detail-Shader, funkelnde Sterne, Sonne und ein Planet je Sektor
export const sky = new THREE.Group();
scene.add(sky);

// ---------- Sterne (eigener Shader: runde, weiche Punkte, leichtes Funkeln) ----------
const STAR_VS = `
attribute float size; attribute float phase; attribute vec3 color;
uniform float time; uniform float pr;
varying vec3 vCol; varying float vTw;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.78 + 0.22 * sin(time * (1.2 + phase * 2.5) + phase * 40.0);
  gl_PointSize = size * pr * (0.9 + 0.2 * tw);
  vCol = color; vTw = tw;
}`;
const STAR_FS = `
uniform float spikes; uniform float fade;
varying vec3 vCol; varying float vTw;
void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p) * 2.0;
  float core = pow(max(0.0, 1.0 - d), 2.2);
  float sp = spikes * (max(0.0, 1.0 - abs(p.x) * 26.0) * max(0.0, 1.0 - abs(p.y) * 2.0) + max(0.0, 1.0 - abs(p.y) * 26.0) * max(0.0, 1.0 - abs(p.x) * 2.0));
  float a = core + sp * 0.55;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vCol * a * vTw * fade, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const starUniforms: THREE.ShaderMaterial[] = [];
function starLayer(n: number, minS: number, maxS: number, spikes: number, r: number) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), phase = new Float32Array(n), v = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    v.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(r);
    pos.set([v.x, v.y, v.z], i * 3);
    // Sternfarben: meist weiß, teils bläulich oder orange
    const t = Math.random();
    c.setHSL(t < 0.55 ? 0.6 : t < 0.8 ? 0.1 : 0.0, t < 0.55 ? 0.25 : 0.55, 0.75 + Math.random() * 0.2);
    const b = Math.pow(Math.random(), 2.2) * 0.8 + 0.25;
    col.set([c.r * b, c.g * b, c.b * b], i * 3);
    size[i] = minS + Math.pow(Math.random(), 3) * (maxS - minS);
    phase[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('size', new THREE.BufferAttribute(size, 1));
  g.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  const m = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, pr: { value: 1 }, spikes: { value: spikes }, fade: { value: 1 } },
    vertexShader: STAR_VS, fragmentShader: STAR_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
  });
  starUniforms.push(m);
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  sky.add(pts);
}
starLayer(8000, 1.6, 4.2, 0, 16000);   // feines Sternenfeld
starLayer(70, 7, 16, 1, 15500);        // helle Sterne mit Strahlenkranz

// ---------- Nebel-Panorama mit prozeduralem Detail ----------
// Das Bild hat nur 2048 px Breite für 360°. Feines Rauschen, das der Nebelhelligkeit folgt, ersetzt die Unschärfe durch Struktur.
const SKY_VS = `
varying vec2 vUv; varying vec3 vDir;
void main() { vUv = uv; vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FS = `
uniform sampler2D map; uniform vec3 tint;
varying vec2 vUv; varying vec3 vDir;
float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
void main() {
  vec3 base = texture2D(map, vUv).rgb * tint;
  float lum = dot(base, vec3(0.3, 0.59, 0.11));
  float n = fbm(vDir * 26.0), f = fbm(vDir * 90.0 + 7.0);
  float detail = (n - 0.5) * 1.0 + (f - 0.5) * 0.7;
  float w = smoothstep(0.015, 0.22, lum) * (1.0 - 0.5 * smoothstep(0.55, 1.0, lum));
  vec3 col = base * (1.0 + detail * w * 0.45);
  col *= 0.86 + 0.28 * fbm(vDir * 5.0 + 3.0);          // großräumige Staubschleier
  col = pow(max(col, vec3(0.0)), vec3(1.12)) * 1.06;  // etwas mehr Kontrast
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const skyMat = new THREE.ShaderMaterial({
  uniforms: { map: { value: null }, tint: { value: new THREE.Color(0xc8c8c8) } },
  vertexShader: SKY_VS, fragmentShader: SKY_FS, side: THREE.BackSide, depthWrite: false, fog: false,
});
const skySphere = new THREE.Mesh(new THREE.SphereGeometry(18000, 96, 48), skyMat);
skySphere.renderOrder = -1;
skySphere.visible = false;
sky.add(skySphere);

// ---------- Sonne ----------
export const sunDir = new THREE.Vector3(1, 0.7, 0.35).normalize();
const sunGroup = new THREE.Group();
const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xfff4e0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
sunCore.scale.setScalar(700);
const sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffb070, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
sunHalo.scale.setScalar(3600);
sunGroup.add(sunHalo, sunCore);
sky.add(sunGroup);

let planet: THREE.Object3D | null = null;
let curNeb: string | null = null, curTex: THREE.Texture | null = null;
let pending: { t: THREE.Texture; tint: number; rot: [number, number, number]; gain?: number } | null = null;
const ready = (t: THREE.Texture) => { const im = t.image as HTMLImageElement | undefined; return !!im && (im.width || 0) > 0; };
function applySky(t: THREE.Texture, tint: number, rot: [number, number, number], gain = 1) {
  skyMat.uniforms.map.value = t;
  skyMat.uniforms.tint.value.set(tint).multiplyScalar(gain);   // gain > 1 hellt dunkle Nebel auf
  skySphere.visible = true;
  skySphere.rotation.set(...rot);
}
export const planetInfo = { dir: new THREE.Vector3(), angR: 0, on: false };

export interface SkyDef {
  neb: string;
  tint: number;
  gain?: number;
  rot: [number, number, number];
  sunDir: [number, number, number];
  planet?: { size: number; tint: number; dir: [number, number, number]; atm?: number; type?: string; cities?: number; ring?: number };
}

export function setSky(d: SkyDef) {
  setSurfaceSky(null);
  curNeb = d.neb;
  const t = nebulaTexture(d.neb);
  curTex = t;
  if (t) {
    // Bis das neue Bild dekodiert ist, bleibt der alte Himmel stehen (kein schwarzes Aufblitzen)
    if (ready(t) || !skyMat.uniforms.map.value) { applySky(t, d.tint, d.rot, d.gain); pending = null; }
    else pending = { t, tint: d.tint, rot: d.rot, gain: d.gain };
    scene.environment = envFor(curNeb, t) || DEFAULT_ENV;
  }
  if (planet) {
    sky.remove(planet);
    disposePlanet(planet as THREE.Group);
    planet = null;
  }
  planetInfo.on = false;
  const pg = d.planet ? buildPlanet(d.planet, sunDir) : null;
  if (d.planet && pg) {
    const p = d.planet;
    planet = pg;
    planet.position.set(...p.dir).normalize().multiplyScalar(11000);
    planet.rotation.set(0.3, p.size % 6, -0.2);
    sky.add(planet);
    planetInfo.dir.copy(planet.position).normalize();
    planetInfo.angR = Math.asin(Math.min(1, p.size / 11000));
    planetInfo.on = true;
  } else if (d.planet && TEXT.planet) {
    const p = d.planet;
    const pm = new THREE.Mesh(
      new THREE.SphereGeometry(p.size, 64, 40),
      new THREE.MeshStandardMaterial({ map: TEXT.planet, roughness: 1, metalness: 0, fog: false, color: p.tint }),
    );
    const atm = new THREE.Sprite(new THREE.SpriteMaterial({
      map: GLOW, color: p.atm ?? 0x80b0ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    atm.scale.setScalar(p.size * 2.7);
    pm.add(atm);
    planet = pm;
    planet.position.set(...p.dir).normalize().multiplyScalar(11000);
    planet.rotation.set(0.3, p.size % 6, -0.2);
    sky.add(planet);
    planetInfo.dir.copy(planet.position).normalize();
    planetInfo.angR = Math.asin(Math.min(1, p.size / 11000));
    planetInfo.on = true;
  }
  sun.position.set(...d.sunDir);
  sunDir.set(...d.sunDir).normalize();
  sunGroup.position.copy(sunDir).multiplyScalar(15000);
}

// ---------- Atmosphäre einer Planetenoberfläche ----------
const ATM_FS = `
uniform vec3 horizon; uniform vec3 zenith; uniform vec3 fogc; uniform vec3 sdir; uniform vec3 scol; uniform vec3 cloudCol; uniform vec3 bdir; uniform vec3 bcol;
uniform float time; uniform float cloud; uniform float stars; uniform float brad; uniform float ring;
varying vec3 vDir;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * vn(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }
void main() {
  vec3 d = normalize(vDir), sd = normalize(sdir);
  float h = max(d.y, 0.0), sun = max(dot(d, sd), 0.0);
  // Grundverlauf, Dunst am Horizont, warmer Schein um die Sonne
  vec3 col = mix(horizon, zenith, pow(h, 0.5));
  col = mix(col, fogc, pow(1.0 - h, 7.0));
  col += scol * (pow(sun, 8.0) * 0.2 + pow(sun, 48.0) * 0.32) * (0.4 + 0.6 * pow(1.0 - h, 2.0));
  // Sterne: bei dünner Luft schon am Tag im Zenit zu sehen
  if (stars > 0.0) {
    vec3 q = d * 190.0, c = floor(q), f = fract(q) - 0.5;
    float r = h21(c.xy + c.z * 17.3);
    col += vec3(step(0.9962, r) * smoothstep(0.24, 0.0, length(f))) * stars * smoothstep(0.08, 0.6, h) * (0.5 + 0.5 * h21(c.yz + 3.1));
  }
  // Nachbarplanet am Himmel: beleuchtete Sichel, bei manchen mit Ring
  if (brad > 0.0 && dot(d, bdir) > 0.0) {
    vec3 bd = normalize(bdir), bx = normalize(cross(vec3(0.0, 1.0, 0.0), bd)), by = cross(bd, bx);
    vec2 p = vec2(dot(d, bx), dot(d, by)) / brad; float rr = length(p);
    vec2 pr = vec2(p.x * 0.94 + p.y * 0.34, (-p.x * 0.34 + p.y * 0.94) / 0.3); float rl = length(pr);
    float ringA = ring * smoothstep(1.38, 1.46, rl) * (1.0 - smoothstep(2.3, 2.38, rl)) * (0.5 + 0.5 * sin(rl * 30.0) * sin(rl * 11.0 + 1.0));
    float haze = 0.35 + 0.65 * smoothstep(0.0, 0.5, h);                       // tief am Horizont blasser
    if (rr < 1.0) {
      vec3 n = bx * p.x + by * p.y - bd * sqrt(1.0 - rr * rr);
      float lit = smoothstep(-0.08, 0.3, dot(n, sd));
      float bands = 0.82 + 0.18 * sin(p.y * 10.0 + sin(p.x * 3.0) * 1.3);
      col += bcol * lit * bands * 0.62 * smoothstep(1.0, 0.95, rr) * haze;
      if (pr.y < 0.0) col += bcol * ringA * 0.5 * haze;                       // vordere Ringhälfte liegt vor dem Planeten
    } else col += bcol * ringA * 0.5 * haze;
  }
  // Wolken: Rauschen auf einer gedachten Ebene, zur Sonne hin hell, Unterseiten dunkler, zum Horizont im Dunst
  if (cloud > 0.0 && d.y > 0.015) {
    vec2 uv = d.xz / (d.y + 0.12) * 1.5 + vec2(time * 0.0035, time * 0.0012);
    float n = fbm(uv), n2 = fbm(uv * 2.9 + 5.0);
    float cov = smoothstep(0.93 - cloud, 1.2 - cloud, n * 0.75 + n2 * 0.25 + 0.12);
    float shade = clamp(0.66 + (n - fbm(uv + sd.xz * 0.14)) * 1.3 + 0.28 * pow(sun, 3.0), 0.4, 1.25);
    vec3 cc = cloudCol * shade + scol * pow(sun, 6.0) * 0.22;
    cc = mix(cc, fogc, pow(1.0 - h, 3.0) * 0.85);
    col = mix(col, cc, cov * smoothstep(0.015, 0.13, d.y) * 0.93);
  }
  col += scol * (pow(sun, 1400.0) * 5.0 + pow(sun, 240.0) * 0.7);
  if (d.y < 0.0) col = mix(fogc, fogc * 0.72, clamp(-d.y * 3.0, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const atmMat = new THREE.ShaderMaterial({
  uniforms: {
    horizon: { value: new THREE.Color() }, zenith: { value: new THREE.Color() }, fogc: { value: new THREE.Color() }, sdir: { value: new THREE.Vector3(0, 1, 0) }, scol: { value: new THREE.Color(0xfff0d0) },
    cloudCol: { value: new THREE.Color(0xffffff) }, bdir: { value: new THREE.Vector3(0, 1, 0) }, bcol: { value: new THREE.Color(0xffffff) },
    time: { value: 0 }, cloud: { value: 0 }, stars: { value: 0 }, brad: { value: 0 }, ring: { value: 0 },
  },
  vertexShader: SKY_VS, fragmentShader: ATM_FS, side: THREE.BackSide, depthWrite: false, fog: false,
});
const atmDome = new THREE.Mesh(new THREE.SphereGeometry(17500, 48, 24), atmMat);
atmDome.renderOrder = -1;
atmDome.visible = false;
sky.add(atmDome);
const SPACE_FOG = { color: 0x05060a, density: 0.00005 };
const RIM_SPACE = rim.color.getHex(), GREY = new THREE.Color(0x808080);
export interface SurfaceSky {
  horizon: number; zenith: number; fog: number; fogDensity: number;
  clouds?: number; cloudCol?: number; stars?: number;                                   // Wolkenmenge (0–1), Wolkenfarbe, Sterne am Tag (0–1)
  body?: { dir: [number, number, number]; rad: number; col: number; ring: number };       // Nachbarplanet am Himmel (Richtung, Winkelradius, Farbe, Ring 0/1)
}
export function setSurfaceSky(cfg: null | SurfaceSky) {
  const fog = scene.fog as THREE.FogExp2;
  if (!cfg) {
    atmDome.visible = false;
    if (skyMat.uniforms.map.value) skySphere.visible = true;
    if (planet) planet.visible = true;
    for (const m of starUniforms) m.uniforms.fade.value = 1;
    fog.color.set(SPACE_FOG.color); fog.density = SPACE_FOG.density;
    sunCore.visible = sunHalo.visible = true;
    rim.color.set(RIM_SPACE);
    return;
  }
  // Gegenlicht auf dem Planeten: Farbe des Himmels am Horizont statt des blauen Raumlichts, etwas schwächer
  rim.color.set(cfg.horizon).lerp(GREY, 0.35).multiplyScalar(0.6);
  atmMat.uniforms.horizon.value.set(cfg.horizon);
  atmMat.uniforms.zenith.value.set(cfg.zenith);
  atmMat.uniforms.sdir.value.copy(sunDir);
  atmMat.uniforms.fogc.value.set(cfg.fog);
  atmMat.uniforms.cloud.value = cfg.clouds ?? 0; atmMat.uniforms.cloudCol.value.set(cfg.cloudCol ?? 0xffffff); atmMat.uniforms.stars.value = cfg.stars ?? 0;
  atmMat.uniforms.brad.value = cfg.body ? cfg.body.rad : 0;
  if (cfg.body) { atmMat.uniforms.bdir.value.set(...cfg.body.dir).normalize(); atmMat.uniforms.bcol.value.set(cfg.body.col); atmMat.uniforms.ring.value = cfg.body.ring; }
  atmDome.visible = true;
  skySphere.visible = false;
  if (planet) planet.visible = false;
  for (const m of starUniforms) m.uniforms.fade.value = 0.18;
  fog.color.set(cfg.fog); fog.density = cfg.fogDensity;
  sunCore.visible = true; sunHalo.visible = false;
}
export const onSurfaceSky = () => atmDome.visible;

// Himmel wandert mit der Kamera; Reflexionen erst setzen, wenn das Nebelbild geladen ist
let t0 = performance.now();
export function updateSky(camPos: THREE.Vector3) {
  sky.position.copy(camPos);
  atmMat.uniforms.time.value = performance.now() / 1000;
  const t = (performance.now() - t0) / 1000, pr = renderer.getPixelRatio();
  for (const m of starUniforms) { m.uniforms.time.value = t; m.uniforms.pr.value = pr; }
  if (planet && planet.visible) updatePlanet(planet as THREE.Group, t);
  if (pending && ready(pending.t)) { applySky(pending.t, pending.tint, pending.rot, pending.gain); pending = null; if (atmDome.visible) skySphere.visible = false; }
  if (curNeb && scene.environment === DEFAULT_ENV) {
    const e = envFor(curNeb, curTex);
    if (e) scene.environment = e;
  }
}
