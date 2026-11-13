import * as THREE from 'three';
import { texMat } from '../core/textures';
import { renderer } from '../core/engine';

// =====================================================================================
// Baukasten: gemeinsame Materialien für alle Modelle, die in Blender mit asset-src/neu/baukasten/kit_lib.py gebaut wurden.
// Solche Modelle tragen keine eigenen Bilder, nur Materialnamen (kit_*), Texturkoordinaten ins Texturblatt und eine Tönung je Ecke
// (Lackfarbe × vorberechnete Verdeckung). Ein Material reicht deshalb für alle Gebäude; neue Modelle brauchen hier keinen Code.
//   kit_trim     Texturblatt (tex/kit_trim_col, _nrm, _orm: Farbe, Relief, Verdeckung/Rauheit/Metall)
//   kit_decal    Aufkleber mit Transparenz (tex/kit_decals): Schrift, Ziffern, Schilder, Schmutz
//   kit_concrete Beton (kachelt in Metern), kit_glass dunkle Scheiben, kit_light/lamp/redlamp/screen/green selbstleuchtend
//   kit_neon     Leuchtschriften der Städte (tex/kit_city, eigene Farben; scripts/make-kit-city.mjs), kit_neon2 zweiter Atlas (kit_city2)
//   kit_holo     Hologramme (kit_city2, additiv, flackert: kitHoloFlicker), kit_tower Turmfassade (kachelnd, leuchtende Fenster), kit_wet nasser Boden
//   kit_hha/b/c  Hochhausfassaden (Glasraster, Paneele, Fensterbänder), kit_sta/b/c Straßenbeläge (Gehweg, Fahrbahn, Metalldeck): kachelnde Bilder mit Relief,
//                Rauheit/Metall und Leuchtkarte; die Bilder liegen im Hintergrund-Paket und werden erst geladen, wenn eine Stadt sie braucht (cityMat)
// Zusatzangaben je Modell (Leuchtpunkte, Landefeld) stehen in data/kit_<Name>.json (aus Blender, export() in kit_lib.py).
// =====================================================================================

const loader = new THREE.TextureLoader();
function tex(name: string, srgb: boolean) {
  const url = window.TEXDATA?.[name];
  if (!url) return null;
  const t = loader.load(url);
  t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

// Staub bzw. Schnee auf waagrechten Flächen, in der Bodenfarbe des Planeten (setKitDust beim Aufbau der Oberfläche)
const DUST = { col: { value: new THREE.Color(0xffffff) }, k: { value: 0 } };
export function setKitDust(c: THREE.ColorRepresentation, k: number) { DUST.col.value.set(c); DUST.k.value = k; }
function dusty<T extends THREE.Material>(m: T, key: string) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.dustCol = DUST.col; sh.uniforms.dustK = DUST.k;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDustN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDustN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 dustCol; uniform float dustK; varying vec3 vDustN;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, dustCol, dustK * smoothstep(0.55, 0.95, normalize(vDustN).y));');
  };
  m.customProgramCacheKey = () => 'kitdust-' + key;
  return m;
}

export const KIT_GLOW: Record<string, number> = { light: 0xfff0d8, lamp: 0xffa030, redlamp: 0xff3a24, screen: 0x3f9fd0, green: 0x40ff80, cool: 0xc8e0ff, accent: 0x40d8c0, shopw: 0xa88c68, shopc: 0x6f8cab };   // shopw/shopc: gedämpftes Ladenlicht hinter Schaufenstern
// Innenräume: vorberechnetes Licht (Bild über den zweiten Satz Texturkoordinaten, sonst in den Eckfarben) und Akzentfarbe der Station
//   city: Lichtkarte einer Stadt im Freien (Licht der Schaufenster, Schilder und Laternen auf Boden und Wänden, aus bake_city_light in kit_lib.py).
//         Sie kommt zum Tageslicht hinzu; Flächen ohne eigenen Platz in der Karte zeigen auf einen schwarzen Bildpunkt.
export interface KitLook { lightmap?: string; intensity?: number; accent?: number; city?: string }
const SETS: Record<string, Record<string, THREE.Material>> = {};
const TEXS: Record<string, THREE.Texture | null> = {};
const shared = (name: string, srgb: boolean) => (name in TEXS ? TEXS[name] : (TEXS[name] = tex(name, srgb)));
function sheet(name: string) {
  const orm = shared(name + '_orm', false);
  const m = new THREE.MeshStandardMaterial({
    map: shared(name + '_col', true), normalMap: shared(name + '_nrm', false), aoMap: orm, roughnessMap: orm, metalnessMap: orm,
    roughness: 1, metalness: 1, vertexColors: true,
  });
  m.normalScale.set(1, -1);          // Bilder liegen wie in glTF (nicht gespiegelt), Tangenten kommen aus den Texturkoordinaten
  m.envMapIntensity = 0.35;
  return m;
}
// Die Lichtkarte speichert v = x / (1 + x); hier wird zurückgerechnet, damit helle Lichtinseln und dunkle Ecken ihren echten Abstand behalten
function decodeLight(m: THREE.Material) {
  const prev = m.onBeforeCompile, pk = m.customProgramCacheKey;   // Staub (dusty) bleibt erhalten
  m.onBeforeCompile = (sh, r) => {
    prev.call(m, sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace(
      'vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;',
      'vec3 lmV = min(lightMapTexel.rgb, vec3(0.965)); vec3 lightMapIrradiance = lmV / (1.0 - lmV) * lightMapIntensity;'));
  };
  m.customProgramCacheKey = () => pk.call(m) + '|kitlm';
}
// Lichtkarten der Städte: ein Bild je Stadt; die Stärke folgt der Abendstimmung (setCityLight aus city.ts)
const CITYLM: Record<string, THREE.Texture | null> = {};
const CITYLIT: THREE.MeshStandardMaterial[] = [];
let cityLightK = 1;
const CITY_LIGHT = 4.0;
function cityLit(m: THREE.MeshStandardMaterial, name: string) {
  const lm = name in CITYLM ? CITYLM[name] : (CITYLM[name] = tex(name, true));
  if (!lm) return m;
  lm.channel = 1; lm.wrapS = lm.wrapT = THREE.ClampToEdgeWrapping; lm.anisotropy = 4;
  m.lightMap = lm; m.lightMapIntensity = CITY_LIGHT * cityLightK; decodeLight(m); CITYLIT.push(m);
  return m;
}
export function setCityLight(k: number) { cityLightK = k; for (const m of CITYLIT) m.lightMapIntensity = CITY_LIGHT * k; }
export function kitMaterials(look: KitLook = {}) {
  const key = (look.lightmap || '') + '|' + (look.accent ?? '') + '|' + (look.city || '');
  if (SETS[key]) return SETS[key];
  const inside = !!look.lightmap;
  const trim = sheet('kit_trim'), int = sheet('kit_int');
  const decal = new THREE.MeshStandardMaterial({
    map: shared('kit_decals', true), transparent: true, depthWrite: false, vertexColors: true, roughness: 0.75, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const concrete = texMat(0xffffff, 'hangar_floor', { vertexColors: true, roughness: 0.92, metalness: 0.04 });
  concrete.envMapIntensity = 0.3;
  const glass = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.6 });
  if (inside) {
    const lm = tex(look.lightmap!, true);
    if (lm) { lm.channel = 1; lm.wrapS = lm.wrapT = THREE.ClampToEdgeWrapping; lm.anisotropy = 2; }
    for (const m of [trim, int, concrete, decal]) { m.lightMap = lm; m.lightMapIntensity = look.intensity ?? 1; decodeLight(m); }
  }
  const M: Record<string, THREE.Material> = inside
    ? { kit_trim: trim, kit_int: int, kit_decal: decal, kit_concrete: concrete, kit_glass: glass }
    : { kit_trim: dusty(trim, 'trim'), kit_int: dusty(int, 'int'), kit_decal: decal, kit_concrete: dusty(concrete, 'concrete'), kit_glass: glass };
  for (const [k, c] of Object.entries(KIT_GLOW)) M['kit_' + k] = new THREE.MeshBasicMaterial({ color: k === 'accent' && look.accent !== undefined ? look.accent : c });
  const signs = shared('kit_signs', true);
  M.kit_sign = new THREE.MeshBasicMaterial({ map: signs, color: look.accent ?? KIT_GLOW.accent });     // Wegweiser in der Akzentfarbe der Station
  M.kit_poster = new THREE.MeshBasicMaterial({ map: signs, color: 0xd8d8d8 });
  M.kit_neon = new THREE.MeshBasicMaterial({ map: shared('kit_city', true) });
  M.kit_neon2 = new THREE.MeshBasicMaterial({ map: shared('kit_city2', true) });
  M.kit_holo = HOLO; HOLO.map = shared('kit_city2', true);
  if (look.city) { for (const m of [trim, int, concrete]) { cityLit(m, look.city); m.envMap = cityEnv(); } glass.envMap = cityEnv(); }   // Spiegelungen aus der Stadt, nicht aus dem Weltraum
  const tw = new THREE.MeshStandardMaterial({ map: shared('kit_tower_col', true), emissiveMap: shared('kit_tower_emi', true), emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.55, metalness: 0.25, vertexColors: true });
  tw.envMapIntensity = 0.5; M.kit_tower = tw; if (look.city) cityLit(tw, look.city);
  const wet = texMat(0x8e96a4, 'hangar_floor', { vertexColors: true, roughness: 0.36, metalness: 0.1 }); wet.envMap = cityEnv(); wet.envMapIntensity = 0.3; M.kit_wet = wet; if (look.city) cityLit(wet, look.city);   // spiegelt die Stadt-Umgebung statt des Weltraums (der wäre rosa)
  return (SETS[key] = M);
}
// Umgebung für Spiegelungen in Städten: dunstiger Himmel, dunkler Grund, am Horizont die Lichter der Stadt. Die Umgebung der Szene (der Nebel des
// Sektors, oft rötlich) taugt dafür nicht, und ihre Stärke lässt sich je Material nicht regeln (three: envMapIntensity wirkt nur mit eigener envMap).
let CITYENV: THREE.Texture | null = null;
function cityEnv() {
  if (CITYENV) return CITYENV;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2a3442'); gr.addColorStop(0.42, '#6f8492'); gr.addColorStop(0.5, '#8ea0a8'); gr.addColorStop(0.54, '#1a1e24'); gr.addColorStop(1, '#07080a');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  for (const [x, y, r, col] of [[40, 118, 34, '255,90,200'], [130, 112, 30, '90,230,255'], [215, 120, 26, '255,190,110'], [300, 110, 36, '230,240,255'], [390, 118, 30, '90,230,255'], [470, 114, 32, '255,120,90'], [256, 40, 70, '200,215,225']] as const) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, `rgba(${col},.9)`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); CITYENV = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
  return CITYENV;
}
// Stadtmaterialien: erst anlegen, wenn ein Modell sie nennt (ihre Bilder liegen im Hintergrund-Paket und sollen den Start nicht bremsen)
// Leuchtstärke, Spiegelung der Umgebung, Aufhellung der Farbe, Anteil des Metalls aus dem Bild. Ohne Aufhellung wären die dunklen Fassaden im Tageslicht
// fast schwarz (das Spiel hat keine Umgebung, in der sich Metall spiegeln könnte); deshalb auch nur wenig Metall.
const CITYMAT: Record<string, [number, number, number, number]> = {
  kit_hha: [1.5, 0.9, 2.4, 0.2], kit_hhb: [1.5, 0.7, 2.4, 0.2], kit_hhc: [1.5, 0.7, 2.4, 0.2], kit_sta: [0, 0.75, 1.6, 0.5], kit_stb: [2.2, 0.75, 1.6, 0.5], kit_stc: [0, 0.6, 1.6, 0.5],
};
const CITYSET: Record<string, THREE.Material> = {};
function cityMat(name: string, lm = '') {
  const key = name + '|' + lm;
  if (CITYSET[key]) return CITYSET[key];
  const c = CITYMAT[name]; if (!c) return null;
  const m = sheet(name); m.envMap = cityEnv(); m.envMapIntensity = c[1]; m.color.setScalar(c[2]); m.metalness = c[3];
  if (c[0]) { m.emissiveMap = shared(name + '_emi', true); m.emissive.set(0xffffff); m.emissiveIntensity = c[0]; }
  if (lm) cityLit(m, lm);
  return (CITYSET[key] = m);
}
// Hologramme (gemeinsam für alle Städte): additiv, Schwarz bleibt durchsichtig; kitHoloFlicker lässt sie leicht flimmern
const HOLO = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
export function kitHoloFlicker(t: number) { HOLO.opacity = 0.62 + 0.18 * Math.sin(t * 7.3) * Math.sin(t * 2.1) + (Math.random() < 0.02 ? -0.35 : 0); }
// Ersetzt in einem geladenen Modell alle kit_*-Materialien durch die gemeinsamen
export function applyKit(root: THREE.Object3D, look: KitLook = {}) {
  const M = kitMaterials(look);
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const m = M[o.material?.name] || cityMat(o.material?.name, look.city);
    if (!m) return;
    o.material = m;
    if (m === M.kit_decal) o.renderOrder = 1;
    if (m === M.kit_holo) o.renderOrder = 3;
  });
}

// Zusatzangaben der Modelle aus Blender
export interface KitMeta {
  lights?: { k: string; p: [number, number, number]; s: number }[]; pad?: { x: number; y: number; z: number; r: number }; R?: number; collide_above?: number;
  blocks?: number[][];                                                                             // Standflächen [x0, x1, z0, z1]
  slots?: { x: number; z: number; tx: number; tz: number; sx: number; sy: number; sz: number; yaw: number }[];   // Ladenplätze: Händler, Ansprechpunkt, Schild
  dims?: { w: number; d: number; h: number };
}
const META: Record<string, KitMeta> = {};
export const kitMeta = (name: string): KitMeta => META[name] || {};
export async function loadKitMeta(names: string[]) {
  const files = (window as any).DATAFILES as Record<string, string> | undefined;
  if (!files) return;
  await Promise.all(names.map(async (n) => {
    const url = files['kit_' + n];
    if (!url) return;
    try { META[n] = await (await fetch(url)).json(); } catch (e) { console.warn('Baukasten-Angaben nicht geladen:', n, e); }
  }));
}
