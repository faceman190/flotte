import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { interiorEnv } from './meshRoom';

// =====================================================================================
// Deck 3 der Bastion (Plan D): ersetzt dort Korridor und Promenade. Das Deck kommt aus dem Bastion-Baukasten in Blender
// (asset-src/neu/bastion, bk_export.py): jeder Baustein einmal im Modell (base/BastionDeck), dazu data/deck_bastion mit der Karte,
// den gesetzten Bausteinen, Standflächen, Personalplätzen und Laufwegen. Beschreibung: docs/bastion-deck.md.
//
// Licht: In Blender vorberechnet und in den Eckpunkten gespeichert (beleuchtete Farbe, w = sqrt(x / (1 + x))). Die Flächen streuen
// im Spiel kein Licht mehr, sie leuchten mit dieser Farbe und spiegeln dazu die Raumumgebung (interiorEnv). Arten der Flächen:
//   metal, paint, soft   beleuchtete Flächen mit viel, wenig, fast keinem Glanz
//   glow                 Leuchten, Lichtfugen, LEDs (Strahldichte wie in Blender, überstrahlt im Bloom)
//   warn                 Warnschraffur: Muster aus der Lage, Helligkeit aus dem vorberechneten Licht
//   screen               Bildschirme mit Zeilenmuster; glass durchsichtig; gloss dunkles Glas; stain Laufspuren und Flecken; stars Fenster
//   warnbig, mark        Hangar: breite Warnschraffur und Bodenmarkierungen (liegen wenige Millimeter über dem Boden)
// Zum Zeichnen werden die Bausteine je Bereich (Raum oder Gangstück) und Art zu einem Netz zusammengefasst; ferne Bereiche bleiben aus.
// Koordinaten: Plan (x nach Osten, y nach Norden) → Innenraum der Station: das Hangartor der Karte liegt bei x = 0 an der Hangarrückwand,
// Osten zeigt vom Hangar weg (−z), Norden nach −x.
// =====================================================================================

type Rect = [number, number, number, number];   // x0, x1, z0, z1
interface Part { cls: string; pos: Float32Array; nrm: Float32Array; col: Uint8Array; idx: Uint32Array }
interface DeckJson {
  cell: number; karte: string[]; ort: Record<string, string>; tueren: number[][][]; schotte: number[][]; offen: string;
  personal: { tab: string; x: number; y: number; face: number; tx: number; ty: number; titel?: string; satz?: string }[];
  wege: (number | { face: number; t: [number, number]; p: number; who: string | null })[][][]; gruppen: number[][]; karte_xy: number[];
  mod: { n: string; o: string; block: number[] | null }[]; inst: number[][];      // inst: Baustein, x, y, Drehung, über Kopf (0/1), Höhe
}
export interface DeckSpot { tab: string; x: number; z: number; face: number; tx: number; tz: number; titel?: string; satz?: string }      // titel und satz: Figur ohne Dienst, sagt nur ihren Satz
export interface DeckNode { x: number; z: number; stop: null | { face: number; t: [number, number]; p: number; who: string | null } }
export interface Deck {
  group: THREE.Group; rects: Rect[]; blocks: Rect[]; spots: DeckSpot[]; routes: DeckNode[][]; chats: [number, number, number][];
  map: { x: number; z: number }; name: string; inside: (z: number) => boolean; area: (x: number, z: number) => string; ceil: (x: number, z: number) => number;
  update: (x: number, z: number) => void; view: (x: number, z: number) => void; way: (off: number) => number[][]; tris: number;
  seen: (x: number, z: number) => boolean; hangarSeen: () => boolean;      // ist dieser Ort bzw. der Hangar vom Standort aus zu sehen?
}

const RANGE = 70;                 // Bereiche weiter weg werden nicht gezeichnet (m); 46 m schnitten das Ende langer Gänge ab
const LIGHT = { value: 1.0 };     // Stärke des vorberechneten Lichts
const GLOW = { value: 0.7 };      // Stärke der Leuchten
const GLOW_MAX = 1.25;            // Obergrenze der Strahldichte von Leuchten
const LIT_MAX = 1.0;              // Obergrenze der Strahldichte beleuchteter Flächen
const FAR_SMALL = 85;             // Hangar: Wandfüllungen und Kleinteile weiter weg werden nicht gezeichnet (m)
const LM_MAX = 1.6;               // Lichtraum: Obergrenze der Strahldichte beleuchteter Flächen (Lichtkarten sind sauber, die Grenze darf höher liegen)
export const deckTune = { LIGHT, GLOW, mats: () => materials(), lichtraum: true };      // zum Einstellen im Testfenster; lichtraum = false zeigt den Raum aus Bausteinen
// Decks je Station: Daten (data/…) und Modell (base/…). Die Bastion lädt beim Start, die Eisenkrone beim Betreten ihres Sektors.
const DECKS: Record<string, [string, string]> = { bastion: ['deck_bastion', 'BastionDeck'], eisenkrone: ['deck_eisenkrone', 'EisenkroneDeck'] };
const LOADED: Record<string, { data: DeckJson; parts: Record<string, Part[]> }> = {}, LOADING: Record<string, Promise<boolean>> = {};
export const hasDeck = (id: string) => id in DECKS;
export const deckReady = (id = 'bastion') => !!LOADED[id];
export function loadDeck(id = 'bastion'): Promise<boolean> {
  if (LOADED[id]) return Promise.resolve(true);
  if (id in LOADING) return LOADING[id];
  const W = window as any, names = DECKS[id], dj = names && W.DATAFILES?.[names[0]] as string | undefined, mu = names && W.BASEDATA?.[names[1]] as string | undefined;
  if (!dj || !mu) return Promise.resolve(false);
  return (LOADING[id] = (async () => {
    try {
      const [data, gltf] = await Promise.all([fetch(dj).then(r => { if (!r.ok) throw new Error('Deckdaten: ' + r.status); return r.json(); }), new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
      LOADED[id] = { data, parts: partsOf(gltf.scene) };
      loadLicht(id).catch(() => false);      // Lichtraum (falls vorhanden) im Hintergrund dazu
      return true;
    } catch (e) { console.warn('Deck nicht geladen:', id, e); delete LOADING[id]; return false; }
  })());
}

// ---------- Lichtraum: ein Raum mit Lichtkarten statt Licht je Eckpunkt (Probe seit Alpha 1.23, asset-src/neu/bastion/lm_raum.py) ----------
// Die Teile des Raums sind in Blender aufgelöst und eindeutig abgewickelt; Cycles hat fünf Bilder je Teil gebacken (tex/lm_<Teil>_…):
//   col Farbe (sRGB) · lit Licht ohne Farbe (w = sqrt(x / (1 + x))) · emi Leuchten (ebenso) · orm Rauheit im Grünkanal · nrm Relief (Tangentenraum).
// Im Spiel: Strahldichte = Farbe × Licht + Leuchten, dazu der Glanz aus der Raumumgebung mit Rauheit und Relief aus den Bildern.
// Die Bausteine in den Zellen des Raums entfallen dann (ihre Standflächen bleiben). Daten: data/lichtraum_<Deck>, Modell: base/Lichtraum<Deck>.
interface LmJson { raeume: { name: string; zellen: number[][]; teile: Record<string, string> }[] }
const LICHT: Record<string, [string, string]> = { eisenkrone: ['lichtraum_eisenkrone', 'LichtraumEisenkrone'] };
const LM: Record<string, { data: LmJson; meshes: { geo: THREE.BufferGeometry; mat: THREE.Material; mw: THREE.Matrix4; tris: number }[] }> = {}, LMLOADING: Record<string, Promise<boolean>> = {};
function loadLicht(id: string): Promise<boolean> {
  if (LM[id]) return Promise.resolve(true);
  if (id in LMLOADING) return LMLOADING[id];
  const W = window as any, names = LICHT[id], dj = names && W.DATAFILES?.[names[0]] as string | undefined, mu = names && W.BASEDATA?.[names[1]] as string | undefined;
  if (!dj || !mu) return Promise.resolve(false);
  return (LMLOADING[id] = (async () => {
    try {
      const [data, gltf] = await Promise.all([fetch(dj).then(r => r.json()) as Promise<LmJson>, new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
      const sets: Record<string, Record<string, THREE.Material>> = {};
      for (const R of data.raeume) for (const [part, prefix] of Object.entries(R.teile)) sets[part] = await lmMaterials(prefix);
      const meshes: (typeof LM)[string]['meshes'] = [];
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((o: any) => {
        if (!o.isMesh) return;
        let a: THREE.Object3D | null = o; while (a && !sets[a.name]) a = a.parent;      // Teil (raum, halle) nach dem Namen des Objekts in Blender
        const set = sets[a ? a.name : Object.keys(sets)[0]], cls = String(o.material?.name || '').replace(/^ext_lm_/, '');
        const g = o.geometry as THREE.BufferGeometry; g.computeBoundingSphere();
        meshes.push({ geo: g, mat: set[cls] || set.paint, mw: o.matrixWorld.clone(), tris: (g.index ? g.index.count : g.attributes.position.count) / 3 });
      });
      LM[id] = { data, meshes };
      return true;
    } catch (e) { console.warn('Lichtraum nicht geladen:', id, e); delete LMLOADING[id]; return false; }
  })());
}
async function lmMaterials(prefix: string) {
  const TD = (window as any).TEXDATA || {}, ld = new THREE.TextureLoader();
  const T = async (k: string, srgb = false) => {
    const u = TD[prefix + '_' + k] as string | undefined; if (!u) throw new Error('Bild fehlt: ' + prefix + '_' + k);
    const t = await ld.loadAsync(u); t.flipY = false; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; t.needsUpdate = true; return t;
  };
  const [col, lit, emi, orm, nrm] = await Promise.all([T('col', true), T('lit'), T('emi'), T('orm'), T('nrm')]);
  const env = interiorEnv(), M = materials(), dec = (v: string) => `${v} *= ${v}; ${v} = ${v} / max(vec3(0.02), 1.0 - ${v});`;
  // eg, cap: Stärke und Obergrenze der Leuchten. Bildschirme bleiben unter der Schwelle des Bloom (0,82): Große helle Flächen überstrahlen sonst den halben Raum
  // diff = false: Leuchten und Bildschirme zeigen nur ihr Leuchten. Ihr Streulicht stammt oft von einer Lampe direkt davor (Bildschirmlicht) und wäre riesig
  const mk = (key: string, f0: number, envK: number, eg = 1, cap = GLOW_MAX, diff = true) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(f0, f0, f0), metalness: 1, roughness: 1, roughnessMap: orm, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7), envMap: env, envMapIntensity: envK, emissive: 0xffffff, emissiveMap: lit });      // Relief etwas zurück: feines Korn glitzerte sonst im Glanz
    m.onBeforeCompile = (sh) => {
      sh.uniforms.bkLight = LIGHT; sh.uniforms.bkGlow = GLOW; sh.uniforms.lmCol = { value: col }; sh.uniforms.lmEmi = { value: emi };
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float bkLight; uniform float bkGlow; uniform sampler2D lmCol; uniform sampler2D lmEmi;')
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular = vec3(0.0); reflectedLight.directDiffuse = vec3(0.0);')
        .replace('#include <emissivemap_fragment>', [
          'vec3 lmI = texture2D(emissiveMap, vEmissiveMapUv).rgb; ' + dec('lmI'),
          'vec3 lmR = texture2D(lmCol, vEmissiveMapUv).rgb * lmI * bkLight;',
          'lmR *= min(1.0, ' + LM_MAX.toFixed(2) + ' / max(0.001, max(lmR.r, max(lmR.g, lmR.b))));',
          'vec3 lmE = texture2D(lmEmi, vEmissiveMapUv).rgb; ' + dec('lmE') + ' lmE *= bkGlow * ' + eg.toFixed(2) + ';',
          'lmE *= min(1.0, ' + cap.toFixed(2) + ' / max(0.001, max(lmE.r, max(lmE.g, lmE.b))));',
          diff ? 'totalEmissiveRadiance = lmR + lmE;' : 'totalEmissiveRadiance = lmE;'].join('\n'));
    };
    m.customProgramCacheKey = () => 'lm-' + key;
    return m;
  };
  return { metal: mk('metal', 0.09, 0.3), paint: mk('paint', 0.04, 0.22), soft: mk('soft', 0.02, 0.1), gloss: mk('gloss', 0.3, 0.6), glow: mk('glow', 0.02, 0.05, 1, GLOW_MAX, false), screen: mk('screen', 0.04, 0.15, 0.4, 0.7, false), glass: M.glass } as Record<string, THREE.Material>;
}

// Netze eines geladenen Modells je Baustein (Objekt m<Nr>) und Art (Materialname ext_bk_<Art>), in Bausteinlage
function partsOf(scene: THREE.Object3D) {
  const parts: Record<string, Part[]> = {};
  scene.updateMatrixWorld(true);
  const v = new THREE.Vector3(), nm = new THREE.Matrix3();
  scene.traverse((o: any) => {
    if (!o.isMesh) return;
    // der Name des Bausteins steht am Objekt selbst oder (bei mehreren Arten) am Elternknoten
    let name = o.name as string; for (let p = o; p && p !== scene; p = p.parent) if (/^m\d+$/.test(p.name)) { name = p.name; break; }
    const g = o.geometry as THREE.BufferGeometry, P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, n = P.count;
    const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), col = new Uint8Array(n * 4);
    nm.getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(P, i).applyMatrix4(o.matrixWorld); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z;
      v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nrm[i * 3] = v.x; nrm[i * 3 + 1] = v.y; nrm[i * 3 + 2] = v.z;
      if (C) { col[i * 4] = Math.round(C.getX(i) * 255); col[i * 4 + 1] = Math.round(C.getY(i) * 255); col[i * 4 + 2] = Math.round(C.getZ(i) * 255); col[i * 4 + 3] = C.itemSize > 3 ? Math.round(C.getW(i) * 255) : 255; }
      else col[i * 4 + 3] = 255;
    }
    const ia = g.index, idx = new Uint32Array(ia ? ia.count : n);
    if (ia) for (let i = 0; i < ia.count; i++) idx[i] = ia.getX(i); else for (let i = 0; i < n; i++) idx[i] = i;
    (parts[name] = parts[name] || []).push({ cls: String(o.material?.name || 'ext_bk_paint').replace(/^ext_bk_/, ''), pos, nrm, col, idx });
    g.dispose();
  });
  return parts;
}

// ---------- Materialien (einmal für alle) ----------
let MATS: Record<string, THREE.Material> | null = null;
const DECODE = 'vec3 bkc = vColor.rgb * vColor.rgb; bkc = bkc / max(vec3(0.02), 1.0 - bkc);';
function materials() {
  if (MATS) return MATS;
  const url = (window as any).TEXDATA?.hangar_metal as string | undefined;
  const dt = url ? new THREE.TextureLoader().load(url) : null;
  if (dt) { dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.anisotropy = 4; dt.colorSpace = THREE.NoColorSpace; }
  const env = interiorEnv();
  // beleuchtete Fläche: streut nicht (Metall mit der Grundspiegelung f0), leuchtet mit dem vorberechneten Licht; feines Korn aus einem Kachelbild
  const lit = (key: string, f0: number, rough: number, envK: number, warn = 0, lift = false) => {      // warn: Streifen je Meter (0 = keine); lift: liegt auf einer Fläche auf

    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(f0, f0, f0), metalness: 1, roughness: rough, vertexColors: true, envMap: env, envMapIntensity: envK });
    if (lift) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4; }      // Markierungen liegen nur 4 mm über dem Boden; auf 60 m Entfernung löst der Tiefenpuffer das nicht mehr auf
    m.onBeforeCompile = (sh) => {
      sh.uniforms.bkLight = LIGHT; sh.uniforms.bkTex = { value: dt };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBkP; varying vec3 vBkN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBkP = position; vBkN = normal;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float bkLight; uniform sampler2D bkTex; varying vec3 vBkP; varying vec3 vBkN;')
        .replace('#include <color_fragment>', '')
        // Lampen und Sonne des Spiels wirken auf diese Flächen nicht (sie schienen durch Wände und setzten Glanzflecken auf den Hallenboden)
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directSpecular = vec3(0.0); reflectedLight.directDiffuse = vec3(0.0);')
        .replace('#include <roughnessmap_fragment>', [
          'vec3 bkA = abs(vBkN); vec2 bkUv = bkA.y > 0.6 ? vBkP.xz : (bkA.x > bkA.z ? vBkP.zy : vBkP.xy);',
          dt ? 'float bkD = texture2D(bkTex, bkUv * 0.55).g * 0.6 + texture2D(bkTex, bkUv * 0.083).g * 0.4;' : 'float bkD = 0.5;',
          '#include <roughnessmap_fragment>', 'roughnessFactor = clamp(roughnessFactor + (bkD - 0.5) * 0.5, 0.05, 1.0);'].join('\n'))
        // Eckpunkte direkt an einer Leuchte tragen eine riesige Strahldichte; ungedeckelt werden daraus im Bloom helle Vierecke
        .replace('#include <emissivemap_fragment>', ['#include <emissivemap_fragment>', DECODE, 'bkc *= min(1.0, ' + LIT_MAX.toFixed(2) + ' / max(0.001, max(bkc.r, max(bkc.g, bkc.b))));',
          warn ? 'bkc *= mix(vec3(0.02, 0.02, 0.022), vec3(0.75, 0.33, 0.03), step(0.5, fract((vBkP.x + vBkP.y + vBkP.z) * ' + warn.toFixed(2) + ')));' : '',
          'totalEmissiveRadiance += bkc * bkLight * mix(0.72, 1.28, bkD);'].join('\n'));
    };
    m.customProgramCacheKey = () => 'bk-' + key;
    return m;
  };
  // selbstleuchtend: Strahldichte aus den Eckfarben
  const glow = (key: string, body: string, o: THREE.MeshBasicMaterialParameters = {}) => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, ...o });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.bkLight = LIGHT; sh.uniforms.bkGlow = GLOW;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBkP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBkP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float bkLight; uniform float bkGlow; varying vec3 vBkP;')
        .replace('#include <color_fragment>', DECODE + '\n' + body);
    };
    m.customProgramCacheKey = () => 'bk-' + key;
    return m;
  };
  return (MATS = {
    // Grundspiegelung und Anteil der Raumumgebung bewusst klein: Mit mehr wirkten die dunklen Flächen hellgrau und die Decken bräunlich
    metal: lit('metal', 0.09, 0.44, 0.3), paint: lit('paint', 0.04, 0.5, 0.22), soft: lit('soft', 0.02, 0.9, 0.1), gloss: lit('gloss', 0.3, 0.1, 0.6), warn: lit('warn', 0.04, 0.55, 0.2, 7),
    // Hangar: breite Warnschraffur (Torpfeiler, Spantfüße, Bodenfelder) und Bodenmarkierungen, beide leicht vor die Fläche gezogen
    warnbig: lit('warnbig', 0.04, 0.55, 0.2, 0.9, true), mark: lit('mark', 0.04, 0.6, 0.15, 0, true),
    // Leuchten: Strahldichte gedeckelt. Ungedeckelt (bis 26) überstrahlten die vielen Hallenleuchten des Hangars im Bloom das ganze Bild
    glow: glow('glow', 'bkc *= bkGlow; diffuseColor.rgb = bkc * min(1.0, GLOW_MAX / max(0.001, max(bkc.r, max(bkc.g, bkc.b))));'.replace('GLOW_MAX', GLOW_MAX.toFixed(2))),      // Farbton bleibt erhalten
    screen: glow('screen', 'diffuseColor.rgb = bkc * bkGlow * mix(0.12, 1.0, step(0.42, fract(vBkP.y * 42.0)));'),
    stars: glow('stars', 'vec3 bkq = floor(vBkP * 26.0); float bkh = fract(sin(dot(bkq, vec3(12.9898, 78.233, 37.719))) * 43758.5453); diffuseColor.rgb = vec3(0.004, 0.006, 0.012) + vec3(0.7, 0.8, 1.0) * step(0.985, bkh) * (0.3 + bkh);'),
    stain: glow('stain', 'diffuseColor.rgb = bkc * bkLight; diffuseColor.a *= vColor.a;', { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0c1418, metalness: 0.9, roughness: 0.06, transparent: true, opacity: 0.22, depthWrite: false, envMap: env, envMapIntensity: 1.4 }),
  });
}

// ---------- Bausteine setzen: je Bereich und Art ein Netz ----------
// place: Lage eines Bausteins im Innenraum aus seiner Lage im Plan (x, y, Drehung) → [x, z, Drehung um die Hochachse]
// zone: Bereich, zu dem ein Baustein gehört; rect: Rechteck im Plan → Rechteck im Innenraum; blocks: nimmt die Standflächen auf
interface Placed { group: THREE.Group; meshes: { m: THREE.Mesh; c: THREE.Vector3; r: number; zn: string }[]; tris: number }
function assemble(D: Pick<DeckJson, 'mod' | 'inst'>, PARTS: Record<string, Part[]>, place: (x: number, y: number, a: number) => [number, number, number],
  zone: (x: number, y: number, over: number, name: string) => string, rect: (x0: number, x1: number, y0: number, y1: number) => Rect, blocks: Rect[]): Placed {
  const M = materials();
  const zones = new Map<string, { n: number; ni: number; list: [Part, number, number, number, number][] }>();
  for (const [mi, x, y, a, over, h] of D.inst) {
    const md = D.mod[mi], parts = PARTS[md.o]; if (!parts) continue;
    const zn = zone(x, y, over, md.n);
    if (zn) for (const p of parts) {
      const k = zn + '|' + p.cls; let z = zones.get(k); if (!z) zones.set(k, (z = { n: 0, ni: 0, list: [] }));
      z.n += p.pos.length / 3; z.ni += p.idx.length; z.list.push([p, x, y, a, h || 0]);
    }
    if (md.block) {      // Standfläche: Rechteck des Bausteins um seine Drehung, davon das achsparallele Rechteck
      const [bx0, bx1, by0, by1] = md.block, cs = Math.cos(a), sn = Math.sin(a); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [px, py] of [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]) { const wx = x + px * cs - py * sn, wy = y + px * sn + py * cs; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
      blocks.push(rect(x0, x1, y0, y1));
    }
  }
  const group = new THREE.Group(), meshes: Placed['meshes'] = []; let tris = 0;
  for (const [k, z] of zones) {
    const [zn, cls] = k.split('|'), mat = M[cls] || M.paint;
    const pos = new Float32Array(z.n * 3), nrm = new Int8Array(z.n * 3), col = new Uint8Array(z.n * 4), idx = new Uint32Array(z.ni); let vo = 0, io = 0;
    for (const [p, x, y, a, h] of z.list) {
      // Baustein (glTF-Lage: x, oben, −y) drehen und an seinen Platz im Innenraum setzen
      const [tx, tz, th] = place(x, y, a), cs = Math.cos(th), sn = Math.sin(th), n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const px = p.pos[i * 3], py = p.pos[i * 3 + 1], pz = p.pos[i * 3 + 2], o = (vo + i) * 3;
        pos[o] = px * cs + pz * sn + tx; pos[o + 1] = py + h; pos[o + 2] = -px * sn + pz * cs + tz;
        const nx = p.nrm[i * 3], nz = p.nrm[i * 3 + 2];
        nrm[o] = Math.round((nx * cs + nz * sn) * 127); nrm[o + 1] = Math.round(p.nrm[i * 3 + 1] * 127); nrm[o + 2] = Math.round((-nx * sn + nz * cs) * 127);
      }
      col.set(p.col, vo * 4);
      for (let i = 0; i < p.idx.length; i++) idx[io + i] = p.idx[i] + vo;
      vo += n; io += p.idx.length;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3, true)); g.setAttribute('color', new THREE.BufferAttribute(col, 4, true));
    g.setIndex(new THREE.BufferAttribute(idx, 1)); g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat); m.matrixAutoUpdate = false;
    if (cls === 'mark') m.renderOrder = 1; if (cls === 'stain') m.renderOrder = 2; if (cls === 'glass') m.renderOrder = 3;
    group.add(m); meshes.push({ m, c: g.boundingSphere!.center.clone(), r: g.boundingSphere!.radius, zn }); tris += z.ni / 3;
  }
  return { group, meshes, tris };
}

// ---------- Hangar der Bastion im Look des Baukastens (base/BastionHangar, data/hangar_bastion; bk_export_hangar.py) ----------
// Gebaut in den Maßen des Spiels: Plan-x = x im Innenraum, Plan-y = −z. Ersetzt in der Bastion das Hangar-Modell der anderen Stationen.
let HDATA: Pick<DeckJson, 'mod' | 'inst'> | null = null, HPARTS: Record<string, Part[]> | null = null, hloading: Promise<boolean> | null = null;
export const hangarReady = () => !!(HDATA && HPARTS);
export function loadHangar(): Promise<boolean> {
  if (hangarReady()) return Promise.resolve(true);
  if (hloading) return hloading;
  const W = window as any, dj = W.DATAFILES?.hangar_bastion as string | undefined, mu = W.BASEDATA?.BastionHangar as string | undefined;
  if (!dj || !mu) return Promise.resolve(false);
  return (hloading = (async () => {
    try {
      const [data, gltf] = await Promise.all([fetch(dj).then(r => { if (!r.ok) throw new Error('Hangardaten: ' + r.status); return r.json(); }), new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
      HPARTS = partsOf(gltf.scene); HDATA = data;
      return true;
    } catch (e) { console.warn('Hangar der Bastion nicht geladen:', e); hloading = null; return false; }
  })());
}
export function buildHangar(): { group: THREE.Group; blocks: Rect[]; tris: number; update: (x: number, z: number) => void } | null {
  if (!HDATA || !HPARTS) return null;
  const blocks: Rect[] = [];
  // Bereiche: Dach, alles Ganze (Boden, Stellplätze) und ein Raster aus 3 × 3 Feldern; three zeichnet nur, was im Bild liegt
  // Wandfüllungen und Kleinteile des Gang-Baukastens liegen in feineren Feldern (36 m) und fallen in der Ferne weg: Von ihnen stehen über 200 an den Wänden
  const zone = (x: number, y: number, over: number, name: string) => (over ? 'dach' : name.startsWith('Ganz ') ? 'ganz' : /^(Wand|Objekt) /.test(name) ? 'w' + Math.floor(x / 36) + '_' + Math.floor(y / 36)
    : 'h' + Math.min(2, Math.max(0, Math.floor((x + 92) / 61.4))) + Math.min(2, Math.max(0, Math.floor((y + 112) / 54.1))));
  const { group, meshes, tris } = assemble(HDATA, HPARTS, (x, y, a) => [x, -y, a], zone, (x0, x1, y0, y1) => [Math.min(x0, x1), Math.max(x0, x1), -Math.max(y0, y1), -Math.min(y0, y1)], blocks);
  const small = meshes.filter(q => q.zn[0] === 'w');
  return { group, blocks, tris, update: (x, z) => { for (const q of small) q.m.visible = Math.hypot(q.c.x - x, q.c.z - z) - q.r < FAR_SMALL; } };
}

// ---------- Deck für den aktuellen Innenraum bauen (hz0 = Hangarrückwand, z des Tors) ----------
export function buildDeck(id: string, hz0: number): Deck | null {
  const L = LOADED[id];
  if (!L) return null;
  const D = L.data, PARTS = L.parts, K = D.karte, RO = K.length, CO = K[0].length, C = D.cell;
  const at = (r: number, c: number) => (r >= 0 && r < RO && c >= 0 && c < CO ? K[r][c] : '.');
  const isG = (ch: string) => 'GgHP'.includes(ch), up = (ch: string) => (isG(ch) ? 'G' : ch.toUpperCase());
  let hr = 0, hc = 0; for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) if (K[r][c] === 'H') { hr = r; hc = c; }
  // Plan → Innenraum
  const OX = hc * C, OY = -hr * C, Z0 = hz0 - C / 2;
  const gx = (y: number) => -(y - OY), gz = (x: number) => Z0 - (x - OX);
  const rect = (x0: number, x1: number, y0: number, y1: number): Rect => [gx(Math.max(y0, y1)), gx(Math.min(y0, y1)), gz(Math.max(x0, x1)), gz(Math.min(x0, x1))];
  const cellOf = (x: number, z: number): [number, number] => [Math.round(-(-x + OY) / C), Math.round((Z0 - z + OX) / C)];   // Innenraum → Zeile, Spalte
  // Räume als zusammenhängende Flächen (für Bereiche und Ortsnamen)
  const comp = new Map<number, number>(); let nc = 0;
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
    const ch = at(r, c); if (ch === '.' || isG(ch) || comp.has(r * 100 + c)) continue;
    const st = [[r, c]]; comp.set(r * 100 + c, nc);
    while (st.length) { const [a, b] = st.pop()!; for (const [dr, dc] of [[-1, 0], [0, 1], [1, 0], [0, -1]]) if (up(at(a + dr, b + dc)) === up(ch) && !comp.has((a + dr) * 100 + b + dc)) { comp.set((a + dr) * 100 + b + dc, nc); st.push([a + dr, b + dc]); } }
    nc++;
  }
  const zoneOf = (r: number, c: number) => { const ch = at(r, c); return ch === '.' ? 'x' : isG(ch) ? `g${Math.floor(c / 6)}_${Math.floor(r / 5)}` : 'r' + comp.get(r * 100 + c); };

  // Laufflächen: je Zelle ein Rechteck (an Wänden 1,7 m von der Mitte, an offenen Seiten bis zur Zellgrenze), dazu die Türen
  const rects: Rect[] = [], blocks: Rect[] = [], open = (a: string, b: string) => b !== '.' && up(a) === up(b), W = 1.7, H = C / 2;
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
    const ch = at(r, c); if (ch === '.') continue;
    const x = c * C, y = -r * C;
    rects.push(rect(x - (open(ch, at(r, c - 1)) ? H : W), x + (open(ch, at(r, c + 1)) ? H : W), y - (open(ch, at(r + 1, c)) ? H : W), y + (open(ch, at(r - 1, c)) ? H : W)));
  }
  for (const [[r1, c1], [r2, c2]] of D.tueren) {
    const x = (c1 + c2) / 2 * C, y = -(r1 + r2) / 2 * C;
    rects.push(r1 === r2 ? rect(x - 1.1, x + 1.1, y - 0.86, y + 0.86) : rect(x - 0.86, x + 0.86, y - 1.1, y + 1.1));
  }
  rects.push(rect(OX - H - 1.4, OX - H + 1.1, OY - 0.86, OY + 0.86));   // offenes Tor zum Hangar
  // Eckpfosten an den Innenecken der Gänge (bk_kit.py, gang_corner): beide Seiten Gang, schräg gegenüber keiner
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
    if (!isG(at(r, c))) continue;
    const x = c * C, y = -r * C;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) if (isG(at(r, c + sx)) && isG(at(r - sy, c)) && !isG(at(r - sy, c + sx))) blocks.push(rect(x + sx * 1.7, x + sx * 2.0, y + sy * 1.7, y + sy * 2.0));
  }
  for (const [r, c, k] of D.schotte) {      // Schott: die Pfosten verengen den Gang auf 2,2 m
    const x = c * C, y = -r * C;
    for (const s of [-1, 1]) blocks.push(k === 3 ? rect(x - H - 0.12, x - H + 0.12, y + s * 1.12, y + s * 1.8) : rect(x + s * 1.12, x + s * 1.8, y - H - 0.12, y - H + 0.12));
  }

  // Bausteine setzen: je Bereich und Art ein Netz
  // Lichtraum: Seine Zellen bekommen keine Bausteine, an ihre Stelle tritt das gebackene Modell (im selben Bereich, also mit derselben Sichtprüfung)
  const lm = deckTune.lichtraum ? LM[id] : undefined, lmZone = new Set<string>();
  if (lm) for (const R of lm.data.raeume) for (const [r, c] of R.zellen) lmZone.add(zoneOf(r, c));
  const placed = assemble(D, PARTS, (x, y, a) => [gx(y), gz(x), a + Math.PI / 2], (x, y) => { const z = zoneOf(Math.round(-y / C), Math.round(x / C)); return lmZone.has(z) ? '' : z; }, rect, blocks);
  const { group, meshes } = placed; let tris = placed.tris;
  if (lm) {
    // Modell in Planlage (glTF: x, oben, −y) → Innenraum, wie ein Baustein bei (0, 0) ohne Drehung
    const T = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(gx(0), 0, gz(0)), zn = [...lmZone][0];
    for (const q of lm.meshes) {
      const m = new THREE.Mesh(q.geo, q.mat); m.matrixAutoUpdate = false; m.matrix.multiplyMatrices(T, q.mw); m.userData.shared = true;      // Netz und Bilder gehören dem geladenen Modell
      if (q.mat === materials().glass) m.renderOrder = 3;
      group.add(m); meshes.push({ m, c: q.geo.boundingSphere!.center.clone().applyMatrix4(m.matrix), r: q.geo.boundingSphere!.radius, zn }); tris += q.tris;
    }
  }
  // Personal, Wege, Gruppen
  const yaw = (deg: number) => { const f = deg * Math.PI / 180; return Math.atan2(-Math.sin(f), -Math.cos(f)); };
  const spots: DeckSpot[] = D.personal.map(s => ({ tab: s.tab, x: gx(s.y), z: gz(s.x), face: yaw(s.face), tx: gx(s.ty), tz: gz(s.tx), titel: s.titel, satz: s.satz }));
  const routes: DeckNode[][] = D.wege.map(w => w.map(n => { const s = n[2] as any; return { x: gx(n[1] as number), z: gz(n[0] as number), stop: s ? { face: yaw(s.face), t: s.t, p: s.p, who: s.who } : null }; }));
  const chats = D.gruppen.map(q => [gx(q[1]), gz(q[0]), q[2]] as [number, number, number]);
  const zMin = gz(CO * C);
  let north = 0; while (isG(at(hr - north - 1, hc + 1))) north++;      // Gangzellen nördlich der Kreuzung hinter dem Tor
  // Sichtprüfung: Gezeichnet werden nur Bereiche, in die man vom Standort aus durch offene Seiten und Türen hineinsehen kann.
  // Ein Strahl läuft durch das Zellraster; an jeder Zellgrenze muss die Seite offen sein (derselbe Raum, Gang an Gang) oder eine Tür haben,
  // durch deren Öffnung er geht. Geprüft werden je Zelle die Mitte und vier Punkte nahe den Ecken.
  const doors = new Set<string>(); for (const [[r1, c1], [r2, c2]] of D.tueren) { doors.add(`${r1},${c1},${r2},${c2}`); doors.add(`${r2},${c2},${r1},${c1}`); }
  const sees = (x: number, y: number, tx: number, ty: number) => {
    let c = Math.round(x / C), r = Math.round(-y / C); const tc = Math.round(tx / C), tr = Math.round(-ty / C), dx = tx - x, dy = ty - y;
    for (let n = 0; n < 64; n++) {
      if (r === tr && c === tc) return true;
      const t1 = dx > 0 ? ((c + 0.5) * C - x) / dx : dx < 0 ? ((c - 0.5) * C - x) / dx : 1e9, t2 = dy > 0 ? ((-r + 0.5) * C - y) / dy : dy < 0 ? ((-r - 0.5) * C - y) / dy : 1e9;
      const ew = t1 < t2, t = Math.min(t1, t2), nr = ew ? r : r + (dy > 0 ? -1 : 1), nc2 = ew ? c + (dx > 0 ? 1 : -1) : c, a = at(r, c), b = at(nr, nc2);
      if (b === '.') return false;
      if (up(a) !== up(b)) {
        if (!doors.has(`${r},${c},${nr},${nc2}`)) return false;
        const off = ew ? y + dy * t - (-r * C) : x + dx * t - c * C;      // Abstand von der Türmitte
        if (Math.abs(off) > 1.05) return false;      // Türöffnung 1,5 m, mit etwas Spiel: lieber einen Bereich zu viel zeichnen als ein Loch zeigen
      }
      r = nr; c = nc2;
    }
    return false;
  };
  const cellsOf = new Map<string, [number, number][]>();
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) if (at(r, c) !== '.') { const zn = zoneOf(r, c); cellsOf.set(zn, [...(cellsOf.get(zn) || []), [r, c]]); }
  // Geprüft wird vom Standort der Figur und von der Kamera aus (Außensicht: bis 2,3 m hinter der Figur; sie sah sonst in Bereiche, die
  // ausgeblendet waren, und durch die Lücke ins Freie). Je Zelle die Mitte, die vier Ecken und die vier Seitenmitten.
  let lastX = 1e9, lastZ = 1e9, camX = 1e9, camZ = 1e9, lookCX = 1e9, lookCZ = 1e9, gate = true; const vis = new Set<string>();
  const PTS = [[0, 0], [-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [0, -1.8], [0, 1.8], [-1.8, 0], [1.8, 0]];
  const toPlan = (x: number, z: number): [number, number, boolean] => {
    let px = OX + (Z0 - z), py = OY - x;                                  // Innenraum → Plan
    const out = at(Math.round(-py / C), Math.round(px / C)) === '.';
    if (out) { px = OX; py = OY; }                                        // im Hangar (oder in einer Wand): Blick vom Tor aus
    return [px, py, out];
  };
  const look = (x: number, z: number) => {
    lastX = x; lastZ = z; lookCX = camX; lookCZ = camZ; vis.clear();
    const eyes = [toPlan(x, z)]; if (camX < 1e8) eyes.push(toPlan(camX, camZ));
    gate = z > hz0 - 0.2 || camZ > hz0 - 0.2;
    for (const [px, py, out] of eyes) gate = gate || out || sees(px, py, OX - 1.6, OY) || sees(px, py, OX - 1.6, OY + 0.6) || sees(px, py, OX - 1.6, OY - 0.6);      // sieht man durchs Tor in den Hangar?
    for (const [zn, cells] of cellsOf) {
      search: for (const [px, py] of eyes) for (const [r, c] of cells) for (const [ox, oy] of PTS) if (sees(px, py, c * C + ox, -r * C + oy)) { vis.add(zn); break search; }
    }
    // Türen: Wer eine Türöffnung sieht, sieht auch ein Stück des Raums dahinter (bei flachem Blick nur Laibung und Schwelle, die keiner der
    // Prüfpunkte im Raum trifft). Also beide Seiten zeichnen, sobald ein Punkt in der Öffnung zu sehen ist.
    for (const [[r1, c1], [r2, c2]] of D.tueren) {
      const mx = (c1 + c2) / 2 * C, my = -(r1 + r2) / 2 * C, ax = r1 === r2 ? 0 : 1, ay = r1 === r2 ? 1 : 0;      // ax, ay: Richtung längs der Öffnung
      let hit = false;
      for (const [px, py] of eyes) for (const t of [-0.6, 0, 0.6]) for (const n of [-0.15, 0.15]) if (sees(px, py, mx + ax * t + ay * n, my + ay * t + ax * n)) hit = true;
      if (hit) { vis.add(zoneOf(r1, c1)); vis.add(zoneOf(r2, c2)); }
    }
  };
  const cellCh = (x: number, z: number) => { const [r, c] = cellOf(x, z); return at(r, c); };
  return {
    group, rects, blocks, spots, routes, chats, tris, map: { x: gx(D.karte_xy[1]), z: gz(D.karte_xy[0]) }, name: D.ort.G,
    inside: (z: number) => z < hz0 - 0.2 && z > zMin,
    area: (x, z) => D.ort[up(cellCh(x, z))] || D.ort.G,
    ceil: (x, z) => (isG(cellCh(x, z)) ? 2.75 : 3.25),
    view: (x, z) => { camX = x; camZ = z; },      // Kamera der Außensicht (Innenraum); fern = keine
    update: (x, z) => {
      if (Math.hypot(x - lastX, z - lastZ) > 0.6 || Math.hypot(camX - lookCX, camZ - lookCZ) > 0.6) look(x, z);
      for (const q of meshes) { const d = Math.hypot(q.c.x - x, q.c.z - z) - q.r; q.m.visible = d < RANGE && (d < 5 || q.zn === 'x' || vis.has(q.zn)); }
    },
    seen: (x, z) => (z > hz0 - 0.2 ? gate : Math.hypot(x - lastX, z - lastZ) < 6 || vis.has(zoneOf(...cellOf(x, z)))),
    hangarSeen: () => gate,
    // Weg der Story-Figuren vom Hangar hinaus (und umgekehrt herein): durch das Tor, an der Kreuzung dahinter nach links außer Sicht
    // (so weit der Gang dort nach Norden reicht: auf der Bastion zwei Zellen, auf der Eisenkrone eine)
    way: (off: number) => [[off, hz0 + 4], [off * 0.5, hz0 - 1.2], [off * 0.5, hz0 - 5.6 - off * 0.4], [-(north * C - 0.6), hz0 - 5.8 - off * 0.4]],
  };
}
