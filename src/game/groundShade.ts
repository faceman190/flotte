import * as THREE from 'three';
import { renderer, scene } from '../core/engine';
import { sunDir } from '../core/sky';
import { world } from './world';

// =====================================================================================
// Gebäudeschatten auf dem Gelände (ab Alpha 1.09)
// Der Echtzeit-Schatten der Sonne reicht nur rund 320 m um den Piloten (110 m um den Rover). Aus der Ferne standen
// Städte und Basen deshalb ohne Schatten auf dem Boden. Hier wird das Modell der Bodenstation einmal aus Richtung der
// Sonne als Tiefenkarte gezeichnet (es bewegt sich nicht); der Geländeshader liest sie und nimmt im Schatten das
// direkte Sonnenlicht weg (siehe groundShader in surface.ts). Das kostet im Spiel fünf Texturzugriffe je Bildpunkt
// des Geländes, die Karte selbst wird nur neu gezeichnet, wenn sich das Modell ändert (es lädt in Stücken nach).
// Grenzen: Nur das Gelände empfängt diesen Schatten, nur das Stationsmodell wirft ihn (kein Schiff, keine Felsen).
// =====================================================================================
const SIZE = 2048, LAYER = 7;
// gemeinsame Uniform-Objekte: Jedes Geländematerial hängt sie beim Übersetzen ein und sieht jede Änderung
// px: x = Breite eines Bildpunkts der Karte, y = Abstand in Tiefeneinheiten, ab dem etwas als verdeckt gilt (0,6 m)
export const groundShade = { map: { value: null as THREE.Texture | null }, mat: { value: new THREE.Matrix4() }, on: { value: 0 }, px: { value: new THREE.Vector2(1 / SIZE, 0.0003) } };
let rt: THREE.WebGLRenderTarget | null = null, key = '', checkT = 0;
const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 10);
cam.layers.set(LAYER);
const depthMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const _box = new THREE.Box3(), _b = new THREE.Box3(), _c = new THREE.Vector3(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();
const BIAS = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
// wirft Schatten: feste, undurchsichtige Flächen (keine Schilder aus Licht, keine Glasflächen, keine Leuchtpunkte)
const casts = (o: any) => o.isMesh && o.visible && o.material && !Array.isArray(o.material) && o.material.isMeshStandardMaterial && !o.material.transparent;

function bake(st: { mesh: THREE.Object3D }, list: THREE.Mesh[]) {
  st.mesh.updateMatrixWorld(true);
  _box.makeEmpty();
  for (const o of list) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); _box.union(_b.copy(o.geometry.boundingBox!).applyMatrix4(o.matrixWorld)); }
  if (_box.isEmpty()) { groundShade.on.value = 0; return; }
  // Kamera schaut aus Richtung der Sonne auf die Mitte des Modells; der Ausschnitt umfasst alle acht Ecken seines Kastens
  _box.getCenter(_c);
  const dist = _box.getSize(_v).length() + 50;
  cam.position.copy(_c).addScaledVector(sunDir, dist);
  cam.up.set(0, 1, 0); cam.lookAt(_c); cam.updateMatrixWorld(true);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, zn = 1e9, zf = -1e9;
  for (let i = 0; i < 8; i++) {
    _v.set(i & 1 ? _box.max.x : _box.min.x, i & 2 ? _box.max.y : _box.min.y, i & 4 ? _box.max.z : _box.min.z).applyMatrix4(cam.matrixWorldInverse);
    x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); zn = Math.min(zn, -_v.z); zf = Math.max(zf, -_v.z);
  }
  cam.left = x0 - 4; cam.right = x1 + 4; cam.bottom = y0 - 4; cam.top = y1 + 4;
  cam.near = Math.max(1, zn - 10); cam.far = zf + 1200;          // weit hinter das Modell: Der Schatten fällt bei tiefer Sonne lang über das Gelände
  cam.updateProjectionMatrix();
  if (!rt) {
    rt = new THREE.WebGLRenderTarget(SIZE, SIZE, { depthBuffer: true, depthTexture: new THREE.DepthTexture(SIZE, SIZE), format: THREE.RGBAFormat, generateMipmaps: false });
  }
  for (const o of list) o.layers.enable(LAYER);
  const prevT = renderer.getRenderTarget(), prevO = scene.overrideMaterial, prevA = renderer.shadowMap.autoUpdate, prevB = scene.background, prevF = scene.fog;
  renderer.shadowMap.autoUpdate = false; scene.overrideMaterial = depthMat; scene.background = null; scene.fog = null;
  try {
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, cam);
  } finally {
    renderer.setRenderTarget(prevT); scene.overrideMaterial = prevO; renderer.shadowMap.autoUpdate = prevA; scene.background = prevB; scene.fog = prevF;
  }
  groundShade.map.value = rt.depthTexture!;
  groundShade.mat.value.copy(BIAS).multiply(_m.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  groundShade.px.value.y = 0.6 / (cam.far - cam.near);
  groundShade.on.value = 1;
}

// pro Bild: prüft etwa zweimal je Sekunde, ob die Karte noch zum Modell passt
export function updateGroundShade(dt: number) {
  const st = world.surface ? world.stations[0] : null;
  if (!st || !st.mesh) { if (key) { key = ''; groundShade.on.value = 0; } return; }
  checkT -= dt; if (checkT > 0) return; checkT = 0.5;
  const list: THREE.Mesh[] = []; let verts = 0;
  st.mesh.traverse((o: any) => { if (casts(o)) { list.push(o); verts += o.geometry?.attributes?.position?.count || 0; } });
  const k = `${world.def?.id}|${list.length}|${verts}|${sunDir.x.toFixed(3)},${sunDir.y.toFixed(3)},${sunDir.z.toFixed(3)}|${st.mesh.position.x.toFixed(1)},${st.mesh.position.y.toFixed(1)},${st.mesh.position.z.toFixed(1)}`;
  if (k === key) return;
  key = k;
  if (!list.length) { groundShade.on.value = 0; return; }
  bake(st, list);
}
// GLSL für das Geländematerial
export const GROUND_SHADE_PARS = `
  uniform sampler2D bShMap; uniform mat4 bShMat; uniform float bShOn; uniform vec2 bShPx;
  float bShade(vec3 wp){
    if (bShOn < 0.5) return 1.0;
    vec4 p = bShMat * vec4(wp, 1.0);
    if (p.x < 0.002 || p.x > 0.998 || p.y < 0.002 || p.y > 0.998 || p.z > 0.9995 || p.z < 0.0) return 1.0;
    float z = p.z - bShPx.y, s = 0.0, r = bShPx.x * 1.4;
    s += step(z, texture2D(bShMap, p.xy).r);
    s += step(z, texture2D(bShMap, p.xy + vec2(r, r * 0.4)).r);
    s += step(z, texture2D(bShMap, p.xy + vec2(-r * 0.4, r)).r);
    s += step(z, texture2D(bShMap, p.xy + vec2(-r, -r * 0.4)).r);
    s += step(z, texture2D(bShMap, p.xy + vec2(r * 0.4, -r)).r);
    return s * 0.2;
  }`;
