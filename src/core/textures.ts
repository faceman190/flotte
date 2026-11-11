import './boot';   // wartet, bis die Spieldaten-Liste da ist
import * as THREE from 'three';
import { renderer } from './engine';

// Texturen und Nebel-Panoramen kommen als Dateien aus public/assets (window.TEXDATA/NEBDATA, siehe assets.ts)
const TD = window.TEXDATA || {};
export const TEXT: Record<string, THREE.Texture | null> = {};
const NORM: Record<string, THREE.Texture> = {};
const NORM_WAIT: Record<string, THREE.MeshStandardMaterial[]> = {};
const ENV: Record<string, THREE.Texture> = {};
const loader = new THREE.TextureLoader();
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function loadTex(name: string, repeat = true) {
  if (!TD[name]) return null;
  const t = loader.load(TD[name]);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  return t;
}
function imgCanvas(img: HTMLImageElement, N: number) {
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, N, N);
  return { c, g, d: g.getImageData(0, 0, N, N) };
}

// Normal-Map aus der Helligkeit: Fugen und Nieten bekommen echte Lichtkanten
function buildNormal(name: string, str: number) {
  const img = new Image();
  img.onload = () => {
    const N = 512, { c, g, d } = imgCanvas(img, N), L = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) L[i] = (d.data[i * 4] * 0.3 + d.data[i * 4 + 1] * 0.59 + d.data[i * 4 + 2] * 0.11) / 255;
    const o = g.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const xl = (x + N - 1) % N, xr = (x + 1) % N, yu = (y + N - 1) % N, yd = (y + 1) % N;
      const dx = (L[y * N + xr] - L[y * N + xl]) * str, dy = (L[yd * N + x] - L[yu * N + x]) * str;
      const l = Math.hypot(dx, dy, 1), i = (y * N + x) * 4;
      o.data[i] = (-dx / l * 0.5 + 0.5) * 255;
      o.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
      o.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
      o.data[i + 3] = 255;
    }
    g.putImageData(o, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = ANISO;
    NORM[name] = t;
    for (const m of NORM_WAIT[name] || []) { m.normalMap = t; m.needsUpdate = true; }
    NORM_WAIT[name] = [];
  };
  img.src = TD[name];
}

// Leuchtende Adern (violett) aus einer Textur filtern und als Emissive-Map nutzen
export function buildEmissive(name: string, mats: THREE.MeshStandardMaterial[], intensity = 1.5) {
  if (!TD[name]) return;
  const img = new Image();
  img.onload = () => {
    const N = 512, { c, g, d } = imgCanvas(img, N);
    for (let i = 0; i < N * N; i++) {
      const r = d.data[i * 4], gg = d.data[i * 4 + 1], b = d.data[i * 4 + 2], v = b - Math.max(r * 0.6, gg) > 40 ? 1 : 0;
      d.data[i * 4] = r * v; d.data[i * 4 + 1] = gg * v; d.data[i * 4 + 2] = b * v;
    }
    g.putImageData(d, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    for (const m of mats) { m.emissiveMap = t; m.emissive.set(0xffffff); m.emissiveIntensity = intensity; m.needsUpdate = true; }
  };
  img.src = TD[name];
}

for (const n of ['hull_mil', 'hull_civ', 'hull_light', 'ferrox', 'rock']) TEXT[n] = loadTex(n);
TEXT.planet = loadTex('planet', false);
if (TEXT.planet) TEXT.planet.wrapS = THREE.RepeatWrapping;
for (const [n, s] of [['hull_mil', 3], ['hull_civ', 3], ['hull_light', 2.5], ['ferrox', 2.5], ['rock', 4]] as const) if (TD[n]) buildNormal(n, s);

export const std = (color: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.55, roughness: 0.55, flatShading: true }, o));

export function texMat(color: THREE.ColorRepresentation, name: string, o: THREE.MeshStandardMaterialParameters = {}, ns = 1) {
  const m = std(color, o), t = TEXT[name];
  if (t) {
    m.map = t;
    m.normalScale = new THREE.Vector2(ns, ns);
    if (NORM[name]) m.normalMap = NORM[name];
    else (NORM_WAIT[name] = NORM_WAIT[name] || []).push(m);
  }
  return m;
}

// Würfel-Projektion: Texturdichte in Weltgröße, damit große Flächen nicht verzerrt werden
export function boxUV(root: THREE.Object3D, scale: number) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), v = new THREE.Vector3(), n = new THREE.Vector3();
  root.traverse((o: any) => {
    if (!o.isMesh || !o.material || !o.material.map || o.geometry.userData.boxuv) return;
    const g = o.geometry as THREE.BufferGeometry;
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld), nm = new THREE.Matrix3().getNormalMatrix(m);
    if (!g.attributes.normal) g.computeVertexNormals();
    const p = g.attributes.position, na = g.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p as THREE.BufferAttribute, i).applyMatrix4(m);
      n.fromBufferAttribute(na as THREE.BufferAttribute, i).applyMatrix3(nm);
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      let a: number, b: number;
      if (ax >= ay && ax >= az) { a = v.z; b = v.y; } else if (ay >= az) { a = v.x; b = v.z; } else { a = v.x; b = v.y; }
      uv[i * 2] = a * scale;
      uv[i * 2 + 1] = b * scale;
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.userData.boxuv = true;
  });
}

// Nebel-Panoramen werden erst geladen, wenn ein Sektor sie braucht; höchstens zwei bleiben im Speicher
const NEBTEX: Record<string, THREE.Texture> = {};
export function nebulaTexture(key: string): THREE.Texture | null {
  if (NEBTEX[key]) return NEBTEX[key];
  const uri = window.NEBDATA?.[key] || TD['nebula_' + key];
  if (!uri) return null;
  const keys = Object.keys(NEBTEX);
  if (keys.length >= 2) { NEBTEX[keys[0]].dispose(); delete NEBTEX[keys[0]]; }
  const t = loader.load(uri);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  NEBTEX[key] = t;
  return t;
}

// Reflexionen aus dem Nebelbild (PMREM), einmal pro Nebel berechnet
export function envFor(name: string, tex?: THREE.Texture | null) {
  if (ENV[name]) return ENV[name];
  const t = tex || TEXT[name];
  if (!t || !t.image) return null;
  const e = new THREE.Texture(t.image);
  e.colorSpace = THREE.SRGBColorSpace;
  e.mapping = THREE.EquirectangularReflectionMapping;
  e.needsUpdate = true;
  const pm = new THREE.PMREMGenerator(renderer);
  ENV[name] = pm.fromEquirectangular(e).texture;
  pm.dispose();
  return ENV[name];
}
