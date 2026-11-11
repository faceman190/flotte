import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Farbverwaltung: Farben und Texturen in sRGB, Licht wird linear gerechnet, am Ende Filmkurve (ACES)
THREE.ColorManagement.enabled = true;

export const gl = document.getElementById('gl') as HTMLCanvasElement;
export const ui = document.getElementById('ui') as HTMLCanvasElement;
export const ux = ui.getContext('2d')!;
export const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.00005);
export const camera = new THREE.PerspectiveCamera(66, 1, 0.5, 30000);
export const view = { W: innerWidth, H: innerHeight, hiQ: true };

// Seit three r155 gelten physikalische Lichteinheiten: Faktor PI entspricht dem alten Aussehen
const L = Math.PI;
const AMB = 2.6, SUN = 1.7, RIM = 1.1;
export const ambient = new THREE.AmbientLight(0x4a4f5e, AMB * L);
scene.add(ambient);
export const sun = new THREE.DirectionalLight(0xfff0dc, SUN * L);
sun.position.set(1, 0.7, 0.35);
scene.add(sun, sun.target);
// Schatten nur im Umkreis der Kamera (der Schattenbereich wandert mit)
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10; sun.shadow.camera.far = 2400;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
export const rim = new THREE.DirectionalLight(0x5070c0, RIM * L);
rim.position.set(-1, -0.3, -0.6);
scene.add(rim);

let composer: EffectComposer | null = null;

export function resize() {
  view.W = Math.max(1, innerWidth);
  view.H = Math.max(1, innerHeight);
  renderer.setSize(view.W, view.H, false);
  camera.aspect = view.W / view.H;
  camera.updateProjectionMatrix();
  const d = Math.min(2, devicePixelRatio || 1);
  ui.width = view.W * d;
  ui.height = view.H * d;
  ux.setTransform(d, 0, 0, d, 0, 0);
  if (composer) composer.setSize(view.W, view.H);
}
addEventListener('resize', resize);
resize();

// Vignette und feines Filmkorn
const Vignette = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.32 }, grain: { value: 0.025 }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float grain; uniform float time; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = 1.0 - amount * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      c.rgb *= v; c.rgb += (rnd(vUv * 731.0) - 0.5) * grain * c.rgb; gl_FragColor = c; }`,
};
// Schutz vor dem Bloom: Ein einzelner ungültiger Bildpunkt (NaN/Inf aus irgendeinem Shader) würde vom Weichzeichner des Blooms
// zu einem schwarzen Rechteck aufgeblasen, das für ein Bild aufblitzt. Solche Punkte werden hier schwarz, sehr helle gedeckelt.
const Guard = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), 1.0); }`,
};
export let vignettePass: ShaderPass | null = null, bloomPass: UnrealBloomPass | null = null;
try {
  // Mehrfach-Abtastung (MSAA) auch mit Bloom: eigenes Renderziel mit 4 Samples
  const rt = new THREE.WebGLRenderTarget(view.W, view.H, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(Guard));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(view.W, view.H), 0.5, 0.45, 0.82);
  composer.addPass(bloomPass);
  vignettePass = new ShaderPass(Vignette);
  composer.addPass(vignettePass);
  composer.addPass(new OutputPass());
  composer.setSize(view.W, view.H);
} catch (e) {
  composer = null;
}
// Schatten der Sonne um einen Punkt legen (Spieler, Rover); size = halbe Kantenlänge des Schattenbereichs
export function aimShadows(x: number, y: number, z: number, dir: THREE.Vector3, size: number, on: boolean) {
  sun.castShadow = on && view.hiQ;
  sun.target.position.set(x, y, z);
  sun.position.set(x + dir.x * 1200, y + dir.y * 1200, z + dir.z * 1200);
  if (!sun.castShadow) return;
  const c = sun.shadow.camera as THREE.OrthographicCamera;
  if (c.right !== size) { c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.updateProjectionMatrix(); }
}
// Neue Meshes bekommen Schatten (wird regelmäßig über die Szene aufgerufen)
export function markShadows(root: THREE.Object3D, skip: THREE.Object3D) {
  root.traverse((o: any) => {
    if (!o.isMesh || o.userData.sh !== undefined) return;
    if (o === skip) return;
    let p = o.parent; while (p) { if (p === skip) { o.userData.sh = false; return; } p = p.parent; }
    const m = o.material;
    const lit = m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && !m.transparent;
    o.castShadow = o.receiveShadow = !!lit;
    o.userData.sh = !!lit;
  });
}

// Belichtung: im Stationsinneren werden Sonne und Grundlicht gedimmt (1 = Weltraum)
export function setExposure(k: number) { ambient.intensity = AMB * L * (0.35 + 0.65 * k); sun.intensity = SUN * L * k; rim.intensity = RIM * L * k; }
export function setQuality(hi: boolean) {
  view.hiQ = hi;
  const pr = hi ? Math.min(2, devicePixelRatio || 1) : 1;
  renderer.setPixelRatio(pr);
  if (composer) composer.setPixelRatio(pr);
  resize();
}

export function render() {
  if (vignettePass) vignettePass.uniforms.time.value = (performance.now() % 10000) / 1000;
  if (view.hiQ && composer) composer.render();
  else renderer.render(scene, camera);
}

// Weiches Leuchten für Triebwerke, Lichter, Explosionen
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const GLOW = glowTexture();
export const glowMat = (col: THREE.ColorRepresentation, op = 1) =>
  new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
export const basicAdd = (col: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

// Standard-Umgebungsreflexion, bis das Nebelbild des Sektors geladen ist
export const DEFAULT_ENV = (() => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2c3242');
  gr.addColorStop(0.5, '#0e1016');
  gr.addColorStop(1, '#040506');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 256);
  for (const [x, y, r, col] of [[380, 70, 46, '255,240,215'], [110, 105, 95, '90,100,130'], [250, 150, 80, '120,80,60'], [470, 160, 70, '60,70,110']] as const) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${col},.95)`);
    rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose();
  return env;
})();
scene.environment = DEFAULT_ENV;
