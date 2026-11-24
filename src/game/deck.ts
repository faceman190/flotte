import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { interiorEnv } from './meshRoom';
import { renderer, compileFor, warm } from '../core/engine';

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
  // Maße des Decks (seit Alpha 1.34; ohne Angabe die des Bastion-Baukastens): Wandfläche ab Zellmitte, halbe Laufbreite der Türen, halbe Türöffnung
  // für die Sichtprüfung, Schott (halbe Öffnung, halbe Dicke), Ecksäule ab Zellmitte, Decke (Gang, Raum), Strahler (Höhe, Reichweite)
  masse?: { wand?: number; tuer?: number; tuerSicht?: number; schott?: number[]; eck?: number; decke?: number[]; spot?: number[] };
  typ?: string; licht2?: [string, string];      // typ 'rund': Rundhalle (seit 2026-11-19), eigene Daten (RundJson), kein Zellraster
  fenster?: number[][][];      // Fensterwände zwischen zwei Räumen (Zellpaare, seit 2026-11-24 im Pumpwerk): Die Sichtprüfung sieht hindurch
  hoch?: Record<string, number>;      // Räume mit eigener Deckenhöhe (Buchstabe → m, Schmelzhalle des Pumpwerks): Kamera und Sprung reichen höher
}
// Rundhalle (asset-src/neu/bastion/rh_spiel.py, docs/rundhalle.md): Laufflächen und Standflächen als Vielecke, Orte mit Deckenhöhe; alles in
// Plankoordinaten (Hallenmitte im Ursprung, x nach Osten, y nach Norden, Hangartor bei x = kx0)
interface RundJson {
  typ: 'rund'; name: string; kx0: number; walk: number[][][]; blocks: number[][][]; orte: { name: string; poly: number[][]; decke: number }[];
  personal: DeckJson['personal']; wege: DeckJson['wege']; gruppen: number[][]; karte_xy: number[]; licht2: [string, string];
  mund: number[]; tor: number[];      // mund: Mündung des Korridors in die Halle (x, y, halbe Breite); tor: Hangartor (x, halbe Breite)
}
export interface DeckSpot { tab: string; x: number; z: number; face: number; tx: number; tz: number; titel?: string; satz?: string }      // titel und satz: Figur ohne Dienst, sagt nur ihren Satz
export interface DeckNode { x: number; z: number; stop: null | { face: number; t: [number, number]; p: number; who: string | null } }
export interface Deck {
  group: THREE.Group; rects: Rect[]; blocks: Rect[]; spots: DeckSpot[]; routes: DeckNode[][]; chats: [number, number, number][];
  map: { x: number; z: number }; name: string; inside: (z: number) => boolean; area: (x: number, z: number) => string; ceil: (x: number, z: number) => number;
  update: (x: number, z: number) => void; view: (x: number, z: number) => void; way: (off: number) => number[][]; tris: number;
  seen: (x: number, z: number) => boolean; hangarSeen: () => boolean;
  release: () => void;      // beim Verlassen des Innenraums: Grafikspeicher der Lichtraum-Bilder freigeben
  prime: () => void;        // beim Betreten, hinter der Blende: alle Raumspiegelungen aufnehmen
  primeStep: () => boolean; // beim Anflug: eine Raumspiegelung aufnehmen (false = alle fertig)
  stale: () => boolean;     // ohne Lichträume gebaut, die inzwischen geladen sind: Der Innenraum baut das Deck dann neu      // ist dieser Ort bzw. der Hangar vom Standort aus zu sehen?
}

const RANGE = 70;                 // Bereiche weiter weg werden nicht gezeichnet (m); 46 m schnitten das Ende langer Gänge ab
const LIGHT = { value: 1.0 };     // Stärke des vorberechneten Lichts
const GLOW = { value: 0.7 };      // Stärke der Leuchten
const GLOW_MAX = 1.25;            // Obergrenze der Strahldichte von Leuchten
const LIT_MAX = 1.0;              // Obergrenze der Strahldichte beleuchteter Flächen
const FAR_SMALL = 85;             // Hangar: Wandfüllungen und Kleinteile weiter weg werden nicht gezeichnet (m)
const LM_MAX = 1.6;               // Lichtraum: Obergrenze der Strahldichte beleuchteter Flächen (Lichtkarten sind sauber, die Grenze darf höher liegen)
// Mischform im Lichtraum (seit Alpha 1.26): hybrid = echte Strahler und Raumspiegelung an; key = Lichtstärke je Strahler (cd);
// shade = wie stark der Schatten einer Figur das gebackene Licht abdunkelt (0 bis 1); envK = Stärke der Raumspiegelung;
// spec = Verstärkung des Glanzes der Flächen auf die Strahler; side = Lichtstärke der Nebenstrahler (Glutschein an den Fenstern)
// Fehlersuche im Material des Lichtraums 2: 0 normal, 1 nur Licht, 2 nur Farbe, 3 nur Spiegelung (deckTune.dbg.value)
const L2DBG = { value: 0 };
export const deckTune = { LIGHT, GLOW, mats: () => materials(), lichtraum: true, hybrid: true, key: 2.6, shade: 0.5, envK: 1, spec: 2.2, side: 3, scharf: true, licht: () => LM, dbg: L2DBG };      // scharf: Lichtraum 2 (Material im Spiel) dort nehmen, wo es ihn gibt
const LMCAP = { value: 1 }, LMSHADE = { value: 0 }, LMSPEC = { value: 1 };      // Obergrenzen-Faktor (nur beim Aufnehmen der Raumspiegelung > 1), Schattenstärke, Kehrwert der Beleuchtung unter einem Strahler      // zum Einstellen im Testfenster; lichtraum = false zeigt den Raum aus Bausteinen
// Decks je Station: Daten (data/…) und Modell (base/…). Die Bastion lädt beim Start, die Eisenkrone beim Betreten ihres Sektors.
// Je Station eine Liste in der Reihenfolge der Wahl: Das erste Deck, dessen Dateien da sind, gilt. Seit Alpha 1.34 hat die Eisenkrone ein Deck aus
// dem Hütten-Baukasten (6-m-Raster, asset-src/neu/huette): nur Daten, ohne Bausteinmodell (es steht ganz im Lichtraum 2). Die Artifact-Fassung,
// in die dessen Modell nicht passt, nimmt das alte Hüttendeck aus dem Bastion-Baukasten.
// Bastion seit 2026-11-19: Rundhalle (nur Daten, ganz im Lichtraum 2); ohne deren Dateien (Artifact-Fassung) das alte Deck 3 nach Plan D
// Pumpwerk Reifschleier seit 2026-11-24: Deck aus dem Eiswerk-Baukasten (asset-src/neu/eiswerk, docs/eiswerk-baukasten.md), ganz im Lichtraum 2
const DECKS: Record<string, [string, string][]> = { bastion: [['deck_rund', ''], ['deck_bastion', 'BastionDeck']], eisenkrone: [['deck_huette_ek', ''], ['deck_eisenkrone', 'EisenkroneDeck']], pumpwerk: [['deck_pumpwerk', '']] };
const LOADED: Record<string, { data: DeckJson; parts: Record<string, Part[]>; neu: boolean }> = {}, LOADING: Record<string, Promise<boolean>> = {};
function pickDeck(id: string): [string, string, boolean] | null {
  const W = window as any;
  for (const [d, m] of DECKS[id] || []) { const dj = W.DATAFILES?.[d] as string | undefined, mu = m ? W.BASEDATA?.[m] as string | undefined : ''; if (dj && (mu || !m)) return [dj, mu || '', !m]; }
  return null;
}
export const hasDeck = (id: string) => id in DECKS;
export const deckReady = (id = 'bastion') => !!LOADED[id];
export const deckData = (id = 'bastion') => LOADED[id]?.data;      // Daten des geladenen Decks (Prüfwerkzeuge: decktest.js, lueckensuche.js)
export const lichtReady = (id = 'bastion') => !!LM[id] && !LM_BUSY;      // Lichträume geladen und für die Raumspiegelung vorbereitet (Tests)
export function loadDeck(id = 'bastion'): Promise<boolean> {
  if (LOADED[id]) return Promise.resolve(true);
  if (id in LOADING) return LOADING[id];
  const pk = pickDeck(id);
  if (!pk) return Promise.resolve(false);
  const [dj, mu, neu] = pk;
  return (LOADING[id] = (async () => {
    try {
      const [data, gltf] = await Promise.all([fetch(dj).then(r => { if (!r.ok) throw new Error('Deckdaten: ' + r.status); return r.json(); }), mu ? new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu) : Promise.resolve(null)]);
      LOADED[id] = { data, parts: gltf ? partsOf(gltf.scene) : {}, neu };
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
// je Deck ein oder mehrere Sätze (Daten, Modell): Die Räume der Bastion sind in zwei Läufen gebacken
// Die Bastion ist seit Alpha 1.30 ganz auf Lichtraum 2 umgestellt (LICHT2 weiter unten). Ihr alter Satz (Treffpunkt und Lager) bleibt nur
// als Rückfall für die Artifact-Fassung, in die das neue Deckmodell nicht passt; wo ein Satz der neuen Art da ist, wird er nicht geladen.
const LICHT: Record<string, [string, string][]> = { eisenkrone: [['lichtraum_eisenkrone', 'LichtraumEisenkrone']], bastion: [['lichtraum_bastion', 'LichtraumBastion']] };
// Nebenstrahler der Mischform je Deck und Raum, in Modelllage (x Ost, y oben, z Süd): Ort, Richtung, Farbe. Eisenkrone: der Glutschein
// der Öfen, der durch die drei Fenster des Leitstands fällt (im Baukasten die Flächenleuchten „Glutschein“ innen vor den Scheiben).
const LM_SIDE: Record<string, Record<string, number[][]>> = { eisenkrone: { leitstand: [28, 32, 36].map(x => [x, 1.5, -1.58, 0, -0.25, 1, 1.0, 0.42, 0.14]), huette_leitstand: [36, 42, 48].map(x => [x, 2.0, -1.9, 0, -0.25, 1, 1.0, 0.42, 0.14]) } };      // huette_: Hüttendeck seit Alpha 1.34 (Fenster an der Nordwand bei y = 2,3)
const SPOTS_MAX = 9;     // so viele Schlüssellampen höchstens (jeder Strahler wird in jedem beleuchteten Material der Szene mitgerechnet)
const KEYS_MAX = 6;      // so viele Strahler werfen Schatten (je Strahler eine Schattenkarte in jedem beleuchteten Material der Szene)
interface LmMesh { geo: THREE.BufferGeometry; mat: THREE.Material; mw: THREE.Matrix4; tris: number }
interface LmRoom { name: string; cells: number[][]; meshes: LmMesh[]; mats: THREE.MeshStandardMaterial[]; tex: THREE.Texture[]; env: THREE.Texture | null; keep?: boolean }      // keep: nie freigeben (Lichtraum 2: Lichtkarte und Spiegelung sind klein)
const LM: Record<string, { rooms: LmRoom[]; rooms2: LmRoom[] }> = {}, LMLOADING: Record<string, Promise<boolean>> = {};
async function loadLichtSet(dj: string, mu: string): Promise<LmRoom[]> {
  const [data, gltf] = await Promise.all([fetch(dj).then(r => r.json()) as Promise<LmJson>, new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
  const sets: Record<string, Record<string, THREE.Material>> = {}, texOf: Record<string, THREE.Texture[]> = {}, roomOf: Record<string, number> = {};
  for (const [i, R] of data.raeume.entries()) for (const [part, prefix] of Object.entries(R.teile)) { [sets[part], texOf[part]] = await lmMaterials(prefix); roomOf[part] = i; }
  const rooms: LmRoom[] = data.raeume.map(R => ({ name: R.name, cells: R.zellen, meshes: [], env: null, tex: Object.keys(R.teile).flatMap(p => texOf[p]), mats: [...new Set(Object.keys(R.teile).flatMap(p => Object.values(sets[p])))].filter(m => m.userData.env) as THREE.MeshStandardMaterial[] }));      // nur Materialien mit Raumspiegelung (nicht das Sternfeld)
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o: any) => {
    if (!o.isMesh) return;
    let a: THREE.Object3D | null = o; while (a && !sets[a.name]) a = a.parent;      // Teil (raum, halle oder der Name des Raums) nach dem Namen des Objekts in Blender
    const part = a ? a.name : Object.keys(sets)[0], set = sets[part], cls = String(o.material?.name || '').replace(/^ext_lm_/, '');
    const g = o.geometry as THREE.BufferGeometry; g.computeBoundingSphere();
    rooms[roomOf[part]].meshes.push({ geo: g, mat: set[cls] || set.paint, mw: o.matrixWorld.clone(), tris: (g.index ? g.index.count : g.attributes.position.count) / 3 });
  });
  lmPrecompile(rooms);
  return rooms;
}
function loadLicht(id: string): Promise<boolean> {
  if (LM[id]) return Promise.resolve(true);
  if (id in LMLOADING) return LMLOADING[id];
  const W = window as any, pick = (L: [string, string][] | undefined) => (L || []).map(([j, m]) => [W.DATAFILES?.[j], W.BASEDATA?.[m]]).filter(q => q[0] && q[1]) as [string, string][];
  const own = LOADED[id]?.data?.licht2;      // das Deck nennt seinen Lichtraum selbst (Rundhalle); sonst die Liste je Station
  const sets2 = pick(own ? [own] : LICHT2[id]), sets = sets2.length || LOADED[id]?.neu ? [] : pick(LICHT[id]);      // die neue Art ersetzt die alte ganz; ein Deck ohne Bausteinmodell hat nur die neue
  if (!sets.length && !sets2.length) return Promise.resolve(false);
  return (LMLOADING[id] = (async () => {
    // jeder Satz für sich: Fehlt einer (Datei nicht geladen), bleiben seine Räume Bausteine
    const got = await Promise.all(sets.map(([dj, mu]) => loadLichtSet(dj, mu).catch(e => { console.warn('Lichtraum nicht geladen:', id, e); return [] as LmRoom[]; })));
    // Lichtraum 2: Räume und Gänge in der neuen Art; gibt es einen Raum in beiden Arten, nimmt buildDeck die neue, solange deckTune.scharf an ist
    const got2 = await Promise.all(sets2.map(([dj, mu]) => loadLicht2Set(dj, mu).catch(e => { console.warn('Lichtraum 2 nicht geladen:', id, e); return [] as LmRoom[]; })));
    const rooms = got.flat(), rooms2 = got2.flat();
    if (!rooms.length && !rooms2.length) { delete LMLOADING[id]; return false; }
    LM[id] = { rooms, rooms2 };
    return true;
  })());
}
// Lichtschleife der Lichtraum-Flächen: Es zählen nur Strahler, also die Schlüssellampen des Raums. Punkt-, Richtungs-, Flächen- und
// Himmelslicht der Station entfallen (das Licht des Raums ist gebacken). Der Schatten eines Strahlers nimmt ihm seinen Glanz und dunkelt
// zusätzlich das gebackene Licht ab (lmShade): So werfen Figuren Schatten, obwohl das Streulicht der Lampe im Bild steckt.
// Gewichtet wird nach dem Winkel im Lichtkegel, nicht nach der wahren Beleuchtungsstärke: Rechnerisch nimmt eine von sechs Deckenlampen
// am Ort ihres Schattens nur etwa 6 % des Lichts weg, das sieht niemand. So bleibt je Lampe ein weicher, lesbarer Schatten.
const LM_LIGHTS = 'float lmShade = 1.0; float lmS = 1.0;\n' + THREE.ShaderChunk.lights_fragment_begin
  .replace(/\bNUM_(POINT|DIR|RECT_AREA|HEMI)_LIGHTS\b/g, '0')
  .replace('directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ]', 'lmS = ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ]')
  .replace('vSpotLightCoord[ i ] ) : 1.0;', 'vSpotLightCoord[ i ] ) : 1.0;\n\t\tlmShade *= 1.0 - lmShadeK * ( 1.0 - lmS ) * clamp( dot( geometryNormal, directLight.direction ) * 2.0, 0.0, 1.0 ) * smoothstep( 0.56, 0.8, dot( directLight.direction, spotLight.direction ) );\n\t\tdirectLight.color *= lmS;');
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
  // envH: Stärke der Raumspiegelung in der Mischform (userData.env merkt beide Fassungen: [Umgebung der Station, Stärke, Stärke mit Raumspiegelung])
  const mk = (key: string, f0: number, envK: number, envH: number, eg = 1, cap = GLOW_MAX, diff = true) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(f0, f0, f0), metalness: 1, roughness: 1, roughnessMap: orm, normalMap: nrm, normalScale: new THREE.Vector2(0.7, 0.7), envMap: env, envMapIntensity: envK, emissive: 0xffffff, emissiveMap: lit });      // Relief etwas zurück: feines Korn glitzerte sonst im Glanz
    m.userData.env = [env, envK, envH];
    m.onBeforeCompile = (sh) => {
      sh.uniforms.bkLight = LIGHT; sh.uniforms.bkGlow = GLOW; sh.uniforms.lmCol = { value: col }; sh.uniforms.lmEmi = { value: emi };
      sh.uniforms.lmCap = LMCAP; sh.uniforms.lmShadeK = LMSHADE; sh.uniforms.lmSpec = LMSPEC;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float bkLight; uniform float bkGlow; uniform sampler2D lmCol; uniform sampler2D lmEmi; uniform float lmCap; uniform float lmShadeK; uniform float lmSpec;')
        .replace('#include <lights_fragment_begin>', LM_LIGHTS)
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.directDiffuse = vec3(0.0); reflectedLight.directSpecular *= lmSpec;\ntotalEmissiveRadiance = ' + (diff ? 'lmR * lmShade + lmE;' : 'lmE;'))
        .replace('#include <emissivemap_fragment>', [
          'vec3 lmI = texture2D(emissiveMap, vEmissiveMapUv).rgb; ' + dec('lmI'),
          'vec3 lmR = texture2D(lmCol, vEmissiveMapUv).rgb * lmI * bkLight;',
          'lmR *= min(1.0, ' + LM_MAX.toFixed(2) + ' * lmCap / max(0.001, max(lmR.r, max(lmR.g, lmR.b))));',
          'vec3 lmE = texture2D(lmEmi, vEmissiveMapUv).rgb; ' + dec('lmE') + ' lmE *= bkGlow * ' + eg.toFixed(2) + ';',
          'lmE *= min(1.0, ' + cap.toFixed(2) + ' * lmCap / max(0.001, max(lmE.r, max(lmE.g, lmE.b))));',
          'totalEmissiveRadiance = vec3(0.0);'].join('\n'));
    };
    m.customProgramCacheKey = () => 'lm2-' + key;
    return m;
  };
  const glass = (M.glass as THREE.MeshStandardMaterial).clone();      // eigenes Glas je Lichtraum: spiegelt den Raum statt der Umgebung der Station
  glass.userData.env = [env, glass.envMapIntensity, 2.2];
  const set = { metal: mk('metal', 0.09, 0.3, 0.9), paint: mk('paint', 0.04, 0.22, 0.8), soft: mk('soft', 0.02, 0.1, 0.4), gloss: mk('gloss', 0.3, 0.6, 1.2), glow: mk('glow', 0.02, 0.05, 0.2, 1, GLOW_MAX, false), screen: mk('screen', 0.04, 0.15, 0.6, 0.4, 0.7, false), glass, stars: M.stars } as Record<string, THREE.Material>;      // stars: Fenster ins All, das Sternfeld des Baukastens (ohne Lichtkarte)
  return [set, [col, lit, emi, orm, nrm]] as [Record<string, THREE.Material>, THREE.Texture[]];
}
// ---------- Lichtraum 2 (Probe seit Alpha 1.29, asset-src/neu/bastion/lm2_raum.py): Material im Spiel, gebacken wird nur das Licht ----------
// Die gebackenen Farbbilder des Lichtraums haben nur 51 bis 78 Bildpunkte je Meter, aus der Nähe wirkt alles verwaschen. Die Materialien des
// Baukastens sind aber Rechenmuster (bk_lib.mk: fleckige Helligkeit und Rauheit, Laufspuren, Korn, Kantenabrieb). Hier rechnet sie das Spiel
// selbst, nach der Lage der Fläche und beliebig scharf. Aus Blender kommen nur noch: das Modell mit dem Materialnamen je Fläche, eine grobe
// Lichtkarte für die großen Flächen, Licht je Eckpunkt für die kleinen (ihre Abwicklung liegt bei x = −1) und im Alphakanal der Eckfarben
// die Marke „schmaler Streifen“ (Fase an einer Kante: dort sitzt der Kantenabrieb).
interface L2Mat { kind: string; col?: number[]; metal?: number; rough?: number; var?: number; rvar?: number; scale?: number; emit?: number[] | null; es?: number; grime?: boolean; wear?: number; bump?: number; bscale?: number; streak?: number; studs?: boolean; stripes?: boolean; a?: number[]; c?: number[]; duty?: number; dir?: string; k?: number; spot?: boolean }
interface L2Json { raeume: { name: string; zellen: number[][]; lit: string }[]; mats: Record<string, L2Mat> }
const LICHT2: Record<string, [string, string][]> = { bastion: [['lichtraum2_bastion', 'Lichtraum2Bastion']], eisenkrone: [['lichtraum2_huette_ek', 'Lichtraum2HuetteEk']], pumpwerk: [['lichtraum2_pumpwerk', 'Lichtraum2Pumpwerk']] };
let L2NOISE: [THREE.DataTexture, THREE.DataTexture] | null = null;
// Rauschbilder (kachelbar, 256 Punkte): A = zwei unabhängige Fleckenmuster (r, g) und das Korn (b); N = Gefälle des Korns für das Relief
function l2Noise() {
  if (L2NOISE) return L2NOISE;
  const S = 256, A = new Uint8Array(S * S * 4), N = new Uint8Array(S * S * 4), H = new Float32Array(S * S);
  const hash = (x: number, y: number, k: number) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(k, 2147483629)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const vn = (x: number, y: number, P: number, k: number) => {      // Wertrauschen mit Periode P
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), w = (q: number) => ((q % P) + P) % P;
    const a = hash(w(x0), w(y0), k), b = hash(w(x0 + 1), w(y0), k), c = hash(w(x0), w(y0 + 1), k), d = hash(w(x0 + 1), w(y0 + 1), k);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  };
  const fbm = (u: number, v: number, P: number, oct: number, k: number) => { let t = 0, amp = 0.5, n = 0; for (let o = 0; o < oct; o++) { t += amp * vn(u * P, v * P, P, k + o * 17); n += amp; amp *= 0.5; P *= 2; } return t / n; };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, u = x / S, v = y / S;
    A[i] = fbm(u, v, 16, 4, 1) * 255; A[i + 1] = fbm(u, v, 16, 4, 91) * 255; A[i + 2] = (H[y * S + x] = fbm(u, v, 32, 3, 173)) * 255; A[i + 3] = 255;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const i = (y * S + x) * 4, h = (a: number, b: number) => H[((b + S) % S) * S + ((a + S) % S)];
    N[i] = Math.max(0, Math.min(255, 127.5 + (h(x - 1, y) - h(x + 1, y)) * 900)); N[i + 1] = Math.max(0, Math.min(255, 127.5 + (h(x, y - 1) - h(x, y + 1)) * 900)); N[i + 2] = 255; N[i + 3] = 255;
  }
  const mk = (d: Uint8Array) => { const t = new THREE.DataTexture(d, S, S, THREE.RGBAFormat); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.colorSpace = THREE.NoColorSpace; t.needsUpdate = true; return t; };
  return (L2NOISE = [mk(A), mk(N)]);
}
// Seit Alpha 1.31 teilen sich die Materialien wenige Shader: Ihre Angaben sind Uniformen, keine festen Zahlen im Quelltext. Vorher hatte
// jedes der 49 Materialien einen eigenen Shader, und jeder kostete beim ersten Anblick bis zu einer halben Sekunde Übersetzen (mal zwei:
// einmal für das Bild, einmal für die Aufnahme der Raumspiegelung). Jetzt sind es drei für beleuchtete Flächen (einfach, mit Schraffur,
// mit Laufspuren/Abrieb/Korn/Noppen), einer für Leuchten und einer für Bildschirme.
function l2Materials(mats: Record<string, L2Mat>, lit: THREE.Texture) {
  const env = interiorEnv(), M = materials(), [nA, nN] = l2Noise(), out: Record<string, THREE.Material> = {};
  const V3 = (c: number[]) => ({ value: new THREE.Vector3(c[0], c[1], c[2]) }), V4 = (a: number, b: number, c: number, d: number) => ({ value: new THREE.Vector4(a, b, c, d) });
  for (const [name, p] of Object.entries(mats)) {
    if (p.kind === 'stars') { out[name] = M.stars; continue; }
    if (p.kind === 'glass') { const g = (M.glass as THREE.MeshStandardMaterial).clone(); g.userData.env = [env, g.envMapIntensity, 2.2]; out[name] = g; continue; }
    if (p.kind === 'screen' && p.stripes) {
      // Bildschirm: waagerechte Zeilen in zwei Farben (bk_lib.stripes, Wellenbänder entlang der Höhe); in der Ferne fließen sie zur Mischfarbe
      const A = p.a || [0.1, 0.7, 0.7], Cc = p.c || [0, 0.05, 0.06], gain = (p.es || 1) * 0.4, mx = Math.max(A[0], A[1], A[2], 0.001);
      const U = { l2E: V3(A), l2ColB: V3(Cc), l2G: V4((p.scale || 30) * 20, p.duty ?? 0.5, gain, 0.7 / mx) };      // l2G: Zeilen je Meter, Anteil, Helligkeit, Deckel
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U); sh.uniforms.bkGlow = GLOW; sh.uniforms.lmCap = LMCAP;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vL2P;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvL2P = position;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float bkGlow; uniform float lmCap; uniform vec3 l2E; uniform vec3 l2ColB; uniform vec4 l2G; varying vec3 vL2P;')
          .replace('#include <color_fragment>', 'float l2ph = vL2P.y * l2G.x; float l2se = clamp(fwidth(l2ph) * 0.35, 0.02, 0.5); diffuseColor.rgb = mix(l2ColB, l2E, smoothstep(l2G.y - l2se, l2G.y + l2se, 0.5 + 0.5 * sin(l2ph - 1.5708))) * min(bkGlow * l2G.z, l2G.w * lmCap);');
      };
      m.customProgramCacheKey = () => 'l2screen';
      out[name] = m; continue;
    }
    if (p.kind === 'stain') {
      // Spuren (seit 23.11.2026, lm2_raum.py OPT spuren): Laufspuren, Flecken, Abrieb, Rost als dünne Netze knapp über der Fläche. Sie färben das
      // schon gezeichnete Bild um (Mischen mit doppelter Multiplikation: Ausgabe 0,5 = unverändert, darunter dunkler, darüber heller), so passen
      // sie zu jedem Licht. Form wie in Blender (bk_lib.stain_mat): Fleck rund mit weichem Rand, Laufspur oben satt und nach unten auslaufend,
      // beides vom Rauschen ausgefranst. Die Abwicklung uv ist die Lage im Quad (Fleck: Mitte 0, Rand ±0,5; Laufspur: x ±0,5, y 0 oben bis −1 unten).
      const c = p.col || [0.01, 0.01, 0.01], tint = c.map(v => Math.min(1.8, Math.max(0.15, v / 0.12)));      // Farbe gegen einen mittleren Boden
      const U = { l2Tint: V3(tint), l2K: { value: Math.min(1, p.k ?? 0.8) }, l2NoiseA: { value: nA } };
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false, toneMapped: false, fog: false });
      m.blending = THREE.CustomBlending; m.blendEquation = THREE.AddEquation; m.blendSrc = THREE.DstColorFactor; m.blendDst = THREE.SrcColorFactor;
      m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -4;
      const spot = !!p.spot;
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U);
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vSp;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvSp = vec2(uv.x, 1.0 - uv.y);');      // glTF dreht v um (v = 1 − v in Blender)
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 l2Tint; uniform float l2K; uniform sampler2D l2NoiseA; varying vec2 vSp;')
          .replace('#include <dithering_fragment>', [
            spot ? 'float sa = clamp(1.0 - length(vSp) * 2.0, 0.0, 1.0); sa *= sa;'
              : 'float sa = clamp(1.0 - abs(vSp.x) * 2.0, 0.0, 1.0) * pow(clamp(1.0 + vSp.y, 0.0, 1.0), 2.0);',
            `float sn = smoothstep(0.38, 0.62, texture2D(l2NoiseA, vSp * ${spot ? 'vec2(0.3, 0.3)' : 'vec2(0.7, 0.1)'} + vec2(0.37, 0.71)).r);`,
            'gl_FragColor = vec4(0.5 * mix(vec3(1.0), l2Tint, clamp(sa * sn * l2K, 0.0, 1.0)), 1.0);'].join('\n'));
      };
      m.customProgramCacheKey = () => 'l2stain' + (spot ? 's' : 'l');
      out[name] = m; continue;
    }
    if (p.kind === 'glow' || p.kind === 'screen') {
      // Leuchten: feste Farbe aus dem Material, gedeckelt wie bisher (Bildschirme bleiben unter der Schwelle des Bloom)
      const e = p.emit || p.col || [1, 1, 1], gain = (p.es || 1) * (p.kind === 'screen' ? 0.4 : 1), cap = p.kind === 'screen' ? 0.7 : GLOW_MAX, mx = Math.max(e[0], e[1], e[2], 0.001);
      const U = { l2E: V3(e), l2G: V4(gain, cap / mx, 0, 0) };
      const m = new THREE.MeshBasicMaterial({ color: 0xffffff });
      m.onBeforeCompile = (sh) => {
        Object.assign(sh.uniforms, U); sh.uniforms.bkGlow = GLOW; sh.uniforms.lmCap = LMCAP;
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float bkGlow; uniform float lmCap; uniform vec3 l2E; uniform vec4 l2G;')
          .replace('#include <color_fragment>', 'diffuseColor.rgb = l2E * min(bkGlow * l2G.x, l2G.y * lmCap);');
      };
      m.customProgramCacheKey = () => 'l2glow';
      out[name] = m; continue;
    }
    const col = p.col || [0.2, 0.2, 0.2], metal = p.metal ?? 0, rough = p.rough ?? 0.5, vr = p.var ?? 0, rv = p.rvar ?? 0, sc = p.scale ?? 7, bump = p.bump ?? 0, bs = p.bscale ?? 170, wear = p.wear ?? 0, streak = p.streak ?? 0, grime = p.grime !== false && p.var !== undefined;
    const S = !!p.stripes, F = !!(streak || wear || bump || p.studs);      // Fassung: mit Schraffur, mit den teuren Zusätzen (je ein Griff ins Rauschbild)
    const U = {
      l2Col: V3(S ? p.a || [0.8, 0.6, 0.05] : col), l2ColB: V3(p.c || [0.02, 0.02, 0.02]),      // Farbe; bei Schraffur die beiden Bandfarben
      l2V: V4(1 - vr * 1.6, 1 + vr * 0.5, sc / 16, grime ? 0.6 : 1),                            // Helligkeit: unten, oben, Maßstab der Flecken, Schmutz in Bodennähe
      l2Rg: V4(Math.max(0.04, rough - rv), Math.min(1, rough + rv * 1.4), sc * 2.7 / 16, metal), // Rauheit: unten, oben, Maßstab; Metall
      l2F: V4(streak, wear * 0.85, bump * 1.5, bs / 32),                                        // Laufspuren, Kantenabrieb, Korn (Stärke, Maßstab)
      l2S: V4(p.studs ? 1 : 0, (p.scale || 9) * 10, p.duty ?? 0.5, 0),                          // Noppen; Schraffur: Bänder je Meter, Anteil
    };
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 1, vertexColors: true, envMap: env, envMapIntensity: 0.3 });
    m.userData.env = [env, 0.3, 0.9];
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.uniforms.bkLight = LIGHT; sh.uniforms.lmCap = LMCAP; sh.uniforms.lmShadeK = LMSHADE; sh.uniforms.lmSpec = LMSPEC; sh.uniforms.l2Dbg = L2DBG;
      sh.uniforms.l2Lit = { value: lit }; sh.uniforms.l2NoiseA = { value: nA }; sh.uniforms.l2NoiseN = { value: nN };
      const VAR = 'varying vec3 vL2P; varying vec3 vL2N; varying vec2 vL2Uv; varying vec3 vL2X; varying vec3 vL2Y; varying vec3 vL2Z;';
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VAR)
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvL2P = position; vL2N = normal; vL2Uv = uv; vL2X = normalMatrix * vec3(1.0, 0.0, 0.0); vL2Y = normalMatrix * vec3(0.0, 1.0, 0.0); vL2Z = normalMatrix * vec3(0.0, 0.0, 1.0);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float l2Dbg; uniform float bkLight; uniform float lmCap; uniform float lmShadeK; uniform float lmSpec; uniform sampler2D l2Lit; uniform sampler2D l2NoiseA; uniform sampler2D l2NoiseN; uniform vec3 l2Col; uniform vec3 l2ColB; uniform vec4 l2V; uniform vec4 l2Rg; uniform vec4 l2F; uniform vec4 l2S; ' + VAR)
        // Lage der Fläche: Muster entlang der beiden Achsen, die in der Fläche liegen (l2T, l2B: dieselben Achsen im Blickraum, für das Relief)
        .replace('#include <color_fragment>', [
          'vec3 l2an = abs(vL2N); vec2 l2q; vec3 l2T; vec3 l2B;',
          'if (l2an.y >= l2an.x && l2an.y >= l2an.z) { l2q = vL2P.xz; l2T = vL2X; l2B = vL2Z; } else if (l2an.x >= l2an.z) { l2q = vL2P.zy; l2T = vL2Z; l2B = vL2Y; } else { l2q = vL2P.xy; l2T = vL2X; l2B = vL2Y; }',
          '#ifdef USE_COLOR_ALPHA\nfloat l2edge = vColor.a;\n#else\nfloat l2edge = 0.0;\n#endif',
          'float l2val = mix(l2V.x, l2V.y, clamp(((texture2D(l2NoiseA, l2q * l2V.z).r - 0.5) * 0.55 + 0.2) / 0.4, 0.0, 1.0));',      // 0.55: unser Rauschen streut breiter als das von Blender, sonst wirken die Flecken wolkig
          'l2val *= mix(l2V.w, 1.0, clamp(vL2P.y / 0.5, 0.0, 1.0));',      // Schmutz in Bodennähe
          F ? 'l2val *= 1.0 - l2F.x * (l2an.y < 0.5 ? 1.0 : 0.0) * clamp((texture2D(l2NoiseA, vec2((l2an.x >= l2an.z ? vL2P.z : vL2P.x) * 26.0, vL2P.y * 1.3) / 16.0).g - 0.5) / 0.25, 0.0, 1.0);' : '',      // Laufspuren an Wänden
          S      // Warnschraffur: schräge Bänder in zwei Farben
            ? 'float l2ph = (vL2P.x + vL2P.y + vL2P.z) * l2S.y; float l2se = clamp(fwidth(l2ph) * 0.35, 0.02, 0.5); vec3 l2alb = mix(l2ColB, l2Col, smoothstep(l2S.z - l2se, l2S.z + l2se, 0.5 + 0.5 * sin(l2ph - 1.5708))) * l2val;'
            : 'vec3 l2alb = l2Col * l2val;',
          'float l2rough = mix(l2Rg.x, l2Rg.y, clamp(((texture2D(l2NoiseA, l2q * l2Rg.z).g - 0.5) * 0.55 + 0.2) / 0.4, 0.0, 1.0));',
          'float l2metal = l2Rg.w;',
          // Kantenabrieb mit der Entfernung ausblenden (12 bis 40 m): Aus der Ferne wurden die hellen Kanten der vielen kleinen Schraubenköpfe zu Glitzerpunkten (Hangar, Alpha 1.33)
          F ? 'float l2w = l2edge * clamp(((texture2D(l2NoiseA, l2q * 2.875).r - 0.5) * 0.55 + 0.08) / 0.18, 0.0, 1.0) * l2F.y * (1.0 - clamp((length(vViewPosition) - 12.0) / 28.0, 0.0, 1.0)); l2alb = mix(l2alb, vec3(0.36, 0.34, 0.31), l2w); l2metal = mix(l2metal, 1.0, l2w); l2rough = mix(l2rough, 0.34, l2w);' : '',
        ].join('\n'))
        .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(l2rough, 0.06, 1.0);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (F
          ? '{ vec2 l2g = (texture2D(l2NoiseN, l2q * l2F.w).rg - 0.5) * l2F.z; normal = normalize(normal + l2T * l2g.x + l2B * l2g.y); }\n'
          // Noppenblech: ein Raster von 42 Noppen je Meter, jede ein kleiner Ring aus Gefälle; in der Ferne ausgeblendet
          + '{ vec2 l2c = fract(l2q * 42.0) - 0.5; float l2d = length(l2c); float l2k = smoothstep(0.34, 0.22, l2d) * smoothstep(0.06, 0.2, l2d) * clamp(1.0 - fwidth(l2q.x) * 63.0, 0.0, 1.0) * l2S.x; normal = normalize(normal + (l2T * l2c.x + l2B * l2c.y) / max(l2d, 0.001) * l2k * 0.6); }'
          : ''))
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.diffuseColor = vec3(0.0); material.specularColor = mix(vec3(0.04), l2alb, l2metal * 0.7); material.specularF90 = 1.0;')
        .replace('#include <lights_fragment_begin>', LM_LIGHTS)
        .replace('#include <lights_fragment_end>', [
          '#include <lights_fragment_end>',
          'reflectedLight.directDiffuse = vec3(0.0); reflectedLight.directSpecular *= lmSpec;',
          'vec3 l2I = vL2Uv.x < -0.5 ? vColor.rgb : texture2D(l2Lit, vL2Uv).rgb; l2I *= l2I; l2I = l2I / max(vec3(0.02), 1.0 - l2I);',
          'vec3 l2R = l2alb * (1.0 - 0.15 * l2metal) * l2I * bkLight;',
          'l2R *= min(1.0, ' + LM_MAX.toFixed(2) + ' * lmCap / max(0.001, max(l2R.r, max(l2R.g, l2R.b))));',
          'totalEmissiveRadiance = l2R * lmShade;',
          'if (l2Dbg > 0.5) { reflectedLight.indirectSpecular *= step(2.5, l2Dbg); reflectedLight.directSpecular *= step(2.5, l2Dbg); totalEmissiveRadiance = l2Dbg < 1.5 ? l2I * 0.15 : l2Dbg < 2.5 ? l2alb : vec3(0.0); }'].join('\n'));
    };
    m.customProgramCacheKey = () => 'l2lit' + (S ? '-s' : '') + (F ? '-f' : '');
    m.name = name;      // Name des Materials aus Blender (Fehlersuche, Strahl durch einen Bildpunkt)
    out[name] = m;
  }
  return out;
}
// Kein MeshoptDecoder.useWorkers: Sein Hilfsfaden wird aus dem Quelltext zweier Funktionen gebaut und sucht sie unter ihrem
// ursprünglichen Namen. Der Verkleinerer der gebauten Fassung benennt sie um, der Faden antwortet dann nie, und danach hängt jedes
// weitere Laden eines Modells (Alpha 1.31: online ließ sich kein Spiel mehr starten; im Entwicklungsmodus fällt es nicht auf).
async function loadLicht2Set(dj: string, mu: string): Promise<LmRoom[]> {
  const [data, gltf] = await Promise.all([fetch(dj).then(r => r.json()) as Promise<L2Json>, new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
  const TD = (window as any).TEXDATA || {}, ld = new THREE.TextureLoader(), rooms: LmRoom[] = [], by: Record<string, { set: Record<string, THREE.Material>; i: number }> = {};
  for (const R of data.raeume) {
    const u = TD[R.lit] as string | undefined; if (!u) throw new Error('Bild fehlt: ' + R.lit);
    const lit = await ld.loadAsync(u); lit.flipY = false; lit.colorSpace = THREE.NoColorSpace; lit.anisotropy = 4; lit.needsUpdate = true;
    const set = l2Materials(data.mats, lit);
    by[R.name] = { set, i: rooms.length };
    rooms.push({ name: R.name, cells: R.zellen, meshes: [], env: null, keep: true, tex: [lit], mats: [...new Set(Object.values(set))].filter(m => m.userData.env) as THREE.MeshStandardMaterial[] });
  }
  gltf.scene.updateMatrixWorld(true);
  gltf.scene.traverse((o: any) => {
    if (!o.isMesh) return;
    const own = (n: string) => by[n] || by[n.replace(/__spuren$/, '')];      // Spuren eines Teils: eigenes Netz „<Teil>__spuren“
    let a: THREE.Object3D | null = o; while (a && !own(a.name)) a = a.parent;      // Raum nach dem Namen des Objekts in Blender
    const q = (a && own(a.name)) || by[data.raeume[0].name], key = String(o.material?.name || '').replace(/^ext_l2_/, '');
    const g = o.geometry as THREE.BufferGeometry; g.computeBoundingSphere();
    rooms[q.i].meshes.push({ geo: g, mat: q.set[key] || Object.values(q.set)[0], mw: o.matrixWorld.clone(), tris: (g.index ? g.index.count : g.attributes.position.count) / 3 });
  });
  lmPrecompile(rooms);
  // Arbeitsspeicher: Liegen die Netze auf der Grafikkarte, braucht das Spiel ihre Daten nicht mehr (Deck der Bastion rund 190 MB, Hangar 250 MB).
  // Sie gehören dem geladenen Modell, werden nie entsorgt und also nie ein zweites Mal hochgeladen. Hochgeladen wird spätestens beim
  // Vorwärmen hinter der Blende (engine.ts, primeFrame). Danach lässt sich nicht mehr mit einem Strahl auf diese Netze zielen.
  const drop = function (this: any) { this.array = null; };
  for (const R of rooms) for (const q of R.meshes) {
    for (const a of Object.values(q.geo.attributes) as any[]) (a.isInterleavedBufferAttribute ? a.data : a).onUpload(drop);
    if (q.geo.index) q.geo.index.onUpload(drop);
  }
  return rooms;
}

// Raumspiegelung: einmal von der Raummitte aus aufnehmen (nur die Flächen des Lichtraums, mit ihrem gebackenen Licht) und für den Glanz
// vorfiltern. Leuchten dürfen dabei heller sein als im Bild (lmCap): Erst so spiegeln sich Lampen als helle Flecken in Glas und Metall.
// ---------- Vorwärmen (seit Alpha 1.31): keine Standbilder beim ersten Anblick eines Bereichs ----------
// Die Raumspiegelung wird ohne Lampen aufgenommen, das sind eigene Shader-Fassungen: nach dem Laden je Shader einmal nebenläufig übersetzen
// (engine.ts, compileFor). Aufgenommen wird erst, wenn das fertig ist. Die Fassungen für das Bild übersetzt warmScene beim Betreten.
function lmPrecompile(rooms: LmRoom[]) {
  const uniq = new Map<string, LmMesh>();
  for (const R of rooms) for (const q of R.meshes) {
    if (q.mat.transparent) continue;
    const k = ((q.mat as any).customProgramCacheKey?.() || q.mat.uuid) + (q.geo.attributes.color ? q.geo.attributes.color.itemSize : 0);      // Eckfarben mit und ohne Alpha sind eigene Fassungen
    if (!uniq.has(k)) uniq.set(k, q);
  }
  const tmp = new THREE.Scene(); for (const q of uniq.values()) tmp.add(new THREE.Mesh(q.geo, q.mat));
  LM_BUSY++; compileFor(tmp, null, true).then(() => { LM_BUSY--; });
}
let LM_BUSY = 0;             // so viele Sätze übersetzen noch die Shader für die Aufnahme der Raumspiegelung
let LM_PM: THREE.PMREMGenerator | null = null;      // ein Filter für alle Raumspiegelungen (jeder neue müsste seine Shader neu übersetzen)
const lmFree = (R: LmRoom) => { for (const t of R.tex) t.dispose(); if (R.env) { R.env.userData.rt?.dispose(); R.env = null; } };      // Grafikspeicher eines Raums freigeben: Bilder und Raumspiegelung
function lmProbe(ms: LmMesh[], T: THREE.Matrix4, at: THREE.Vector3, far = 90) {      // T: Lage der Netze in der Welt, at: Raummitte in der Welt
  const sc = new THREE.Scene();
  for (const q of ms) {
    if (q.mat.transparent) continue;
    const m = new THREE.Mesh(q.geo, q.mat); m.matrixAutoUpdate = false; m.matrix.multiplyMatrices(T, q.mw); m.frustumCulled = false; sc.add(m);
  }
  // 256 je Seite: vorgefiltert 6 MB je Raum (512 wären 25 MB). Das Format der Spiegelung steht im Shader: Ein Material, das von der
  // Umgebung der Station (interiorEnv, kleiner) auf die Raumspiegelung wechselt, braucht eine neue Fassung. Deshalb bekommen die
  // Materialien ihre Spiegelung beim Betreten, bevor die Shader übersetzt werden (prime).
  const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
  const cc = new THREE.CubeCamera(0.15, far, rt); cc.position.copy(at);
  const g0 = GLOW.value; GLOW.value = g0 * 4; LMCAP.value = 4;
  try { cc.update(renderer, sc); } finally { GLOW.value = g0; LMCAP.value = 1; }
  const pm = (LM_PM = LM_PM || new THREE.PMREMGenerator(renderer)), out = pm.fromCubemap(rt.texture), env = out.texture;
  env.userData.rt = out;      // zum Freigeben (lmFree)
  rt.dispose();
  return env;
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

// ---------- Standflächen der Bausteine (dieselbe Rechnung wie in assemble, ohne Netze) ----------
function instBlocks(D: Pick<DeckJson, 'mod' | 'inst'>, PARTS: Record<string, Part[]>, rect: (x0: number, x1: number, y0: number, y1: number) => Rect, blocks: Rect[]) {
  for (const [mi, x, y, a] of D.inst) {
    const md = D.mod[mi]; if (!PARTS[md.o] || !md.block) continue;
    const [bx0, bx1, by0, by1] = md.block, cs = Math.cos(a), sn = Math.sin(a); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [px, py] of [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]) { const wx = x + px * cs - py * sn, wy = y + px * sn + py * cs; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
    blocks.push(rect(x0, x1, y0, y1));
  }
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
    const md = D.mod[mi], parts = PARTS[md.o] || []; if (!PARTS[md.o] && !md.block) continue;      // ohne Teile (Deck ganz im Lichtraum 2): nur die Standfläche
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
      // Laufkatzen mit Seil und Haken an der Decke weglassen (seit 2026-11-18, Wunsch des Spielers: stören über großen Schiffen;
      // im Lichtraum-2-Hangar sind sie in bk_halle.py ausgebaut)
      data.inst = data.inst.filter(([mi]: [number]) => !/^H Laufkatze/.test(data.mod[mi]?.n || ''));
      HPARTS = partsOf(gltf.scene); HDATA = data;
      // Hangar in der neuen Art (Lichtraum 2) im Hintergrund dazu, bis dahin steht der alte. Erst nach dem Deck: Beide großen Modelle
      // zugleich entpackt trieben den Arbeitsspeicher beim Laden auf über 3 GB (Grenze des Browsers gut 4 GB).
      const deckLicht = LMLOADING.bastion ?? (LM.bastion ? Promise.resolve(true) : loadDeck('bastion').then(() => LMLOADING.bastion ?? false));
      Promise.resolve(deckLicht).catch(() => false).then(() => loadHangar2());
      return true;
    } catch (e) { console.warn('Hangar der Bastion nicht geladen:', e); hloading = null; return false; }
  })());
}
// ---------- Hangar der Bastion als Lichtraum 2 (seit Alpha 1.33; asset-src/neu/bastion/lm2_hangar_lauf.py, docs/lichtraum2.md) ----------
// Material im Spiel gerechnet, gebacken nur das Licht, wie im Deck. Teile: hangar_h<i><j> (Halle in 3 × 3 Feldern), hangar_k<i><j>
// (Wandfüllungen und Kleinteile, in der Ferne ausgeblendet), hangar_dach. Die Standflächen kommen weiter aus den Daten des alten Hangars.
const H2SET: [string, string] = ['lichtraum2_hangar', 'Lichtraum2Hangar'];
let H2: LmRoom[] | null = null, h2loading: Promise<boolean> | null = null, H2ENV: THREE.Texture | null = null;
export function loadHangar2(): Promise<boolean> {
  if (H2) return Promise.resolve(true);
  if (h2loading) return h2loading;
  const W = window as any, dj = W.DATAFILES?.[H2SET[0]] as string | undefined, mu = W.BASEDATA?.[H2SET[1]] as string | undefined;
  if (!dj || !mu) return Promise.resolve(false);      // Artifact-Fassung: Der Satz passt nicht hinein, es bleibt beim alten Hangar
  return (h2loading = loadLicht2Set(dj, mu).then(r => { H2 = r; return true; }, e => { console.warn('Hangar (Lichtraum 2) nicht geladen:', e); h2loading = null; return false; }));
}
export const hangar2Ready = () => !!H2;
// Für den Start (main.ts): wartet, bis die Lichträume des Decks und danach der Hangar der neuen Art ausgepackt sind (dieselbe Reihenfolge wie
// in loadHangar, damit nie beide großen Modelle zugleich entpackt werden)
export function hangarBgLoad(): Promise<boolean> {
  const deckLicht = LMLOADING.bastion ?? (LM.bastion ? Promise.resolve(true) : loadDeck('bastion').then(() => LMLOADING.bastion ?? false));
  return Promise.resolve(deckLicht).catch(() => false).then(() => loadHangar2());
}      // Hangar der neuen Art geladen (Tests)
export interface HangarBuild { group: THREE.Group; blocks: Rect[]; tris: number; update: (x: number, z: number) => void; stale: () => boolean; prime: () => void }
export function buildHangar(): HangarBuild | null {
  if (!HDATA || !HPARTS) return null;
  const blocks: Rect[] = [];
  const hrect = (x0: number, x1: number, y0: number, y1: number): Rect => [Math.min(x0, x1), Math.max(x0, x1), -Math.max(y0, y1), -Math.min(y0, y1)];
  if (H2 && deckTune.lichtraum && deckTune.scharf) {
    instBlocks(HDATA, HPARTS, hrect, blocks);
    // glTF (x, oben, −y aus Blender) ist schon die Lage im Innenraum (x = x, z = −y): keine weitere Drehung
    const group = new THREE.Group(), small: { m: THREE.Mesh; c: THREE.Vector3; r: number }[] = [], all: LmMesh[] = []; let tris = 0;
    for (const R of H2) {
      const sm = /_k\d\d$/.test(R.name);
      for (const q of R.meshes) {
        const m = new THREE.Mesh(q.geo, q.mat); m.matrixAutoUpdate = false; m.matrix.copy(q.mw); m.userData.shared = true; m.userData.sh = false;
        m.castShadow = false; m.receiveShadow = false; if (q.mat.transparent) m.renderOrder = 3;
        group.add(m); all.push(q); tris += q.tris;
        if (sm) small.push({ m, c: q.geo.boundingSphere!.center.clone().applyMatrix4(q.mw), r: q.geo.boundingSphere!.radius });
      }
    }
    // Raumspiegelung: einmal aus der Hallenmitte in 6 m Höhe (über dem mittleren Stellplatz), Sichtweite über die ganze Halle.
    // Aufgenommen beim Betreten hinter der Blende (engine.ts, warmScene); sie bleibt für alle weiteren Besuche.
    const prime = () => {
      if (!deckTune.hybrid || !H2) return;
      if (!H2ENV) { try { group.updateWorldMatrix(true, false); H2ENV = lmProbe(all, group.matrixWorld, new THREE.Vector3(0, 6, 31).applyMatrix4(group.matrixWorld), 260); } catch (e) { console.warn('Raumspiegelung des Hangars nicht aufgenommen:', e); return; } }
      // Spiegelung halb so stark wie im Deck: Der Hallenboden glänzt, und die orangen Leuchtstreifen am Tor färbten ihn sonst bräunlich
      for (const R of H2) for (const m of R.mats) {
        if (m.envMap !== H2ENV) { m.envMap = H2ENV; m.needsUpdate = true; }
        m.envMapIntensity = (m.userData.env as [THREE.Texture, number, number])[2] * deckTune.envK * 0.5;
      }
    };
    return { group, blocks, tris, update: (x, z) => { for (const q of small) q.m.visible = Math.hypot(q.c.x - x, q.c.z - z) - q.r < FAR_SMALL; }, stale: () => false, prime };
  }
  // Bereiche: Dach, alles Ganze (Boden, Stellplätze) und ein Raster aus 3 × 3 Feldern; three zeichnet nur, was im Bild liegt
  // Wandfüllungen und Kleinteile des Gang-Baukastens liegen in feineren Feldern (36 m) und fallen in der Ferne weg: Von ihnen stehen über 200 an den Wänden
  const zone = (x: number, y: number, over: number, name: string) => (over ? 'dach' : name.startsWith('Ganz ') ? 'ganz' : /^(Wand|Objekt) /.test(name) ? 'w' + Math.floor(x / 36) + '_' + Math.floor(y / 36)
    : 'h' + Math.min(2, Math.max(0, Math.floor((x + 92) / 61.4))) + Math.min(2, Math.max(0, Math.floor((y + 112) / 54.1))));
  const { group, meshes, tris } = assemble(HDATA, HPARTS, (x, y, a) => [x, -y, a], zone, hrect, blocks);
  const small = meshes.filter(q => q.zn[0] === 'w');
  // stale: Der Hangar der neuen Art ist inzwischen geladen; der Innenraum tauscht ihn dann aus (interior.ts)
  return { group, blocks, tris, update: (x, z) => { for (const q of small) q.m.visible = Math.hypot(q.c.x - x, q.c.z - z) - q.r < FAR_SMALL; }, stale: () => !!H2 && deckTune.lichtraum && deckTune.scharf, prime: () => {} };
}

// ---------- Deck für den aktuellen Innenraum bauen (hz0 = Hangarrückwand, z des Tors) ----------
export function buildDeck(id: string, hz0: number): Deck | null {
  const L = LOADED[id];
  if (!L) return null;
  if (L.data.typ === 'rund') return buildRund(id, L.data as unknown as RundJson, hz0);
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
  // Maße je Deck (Vorgabe: Bastion-Baukasten, 4-m-Zellen); das Hüttendeck der Eisenkrone bringt eigene mit (Zelle 6 m, Gang 4,6 m, Tore 3,2 m)
  const MS = { wand: 1.7, tuer: 0.86, tuerSicht: 1.05, schott: [1.12, 0.12], eck: 1.7, decke: [2.75, 3.25], spot: [3.15, 8], ...(D.masse || {}) };
  const rects: Rect[] = [], blocks: Rect[] = [], open = (a: string, b: string) => b !== '.' && up(a) === up(b), W = MS.wand, H = C / 2, DL = H - W + 0.8, TW = MS.tuer;
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
    const ch = at(r, c); if (ch === '.') continue;
    const x = c * C, y = -r * C;
    rects.push(rect(x - (open(ch, at(r, c - 1)) ? H : W), x + (open(ch, at(r, c + 1)) ? H : W), y - (open(ch, at(r + 1, c)) ? H : W), y + (open(ch, at(r - 1, c)) ? H : W)));
  }
  for (const [[r1, c1], [r2, c2]] of D.tueren) {
    const x = (c1 + c2) / 2 * C, y = -(r1 + r2) / 2 * C;
    rects.push(r1 === r2 ? rect(x - DL, x + DL, y - TW, y + TW) : rect(x - TW, x + TW, y - DL, y + DL));
  }
  rects.push(rect(OX - H - 1.4, OX - H + DL, OY - TW, OY + TW));   // offenes Tor zum Hangar
  // Eckpfosten an den Innenecken der Gänge (bk_kit.py, gang_corner): beide Seiten Gang, schräg gegenüber keiner
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) {
    if (!isG(at(r, c))) continue;
    const x = c * C, y = -r * C;
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) if (isG(at(r, c + sx)) && isG(at(r - sy, c)) && !isG(at(r - sy, c + sx))) blocks.push(rect(x + sx * MS.eck, x + sx * H, y + sy * MS.eck, y + sy * H));
  }
  for (const [r, c, k] of D.schotte) {      // Schott: die Pfosten verengen den Gang auf 2,2 m
    const x = c * C, y = -r * C;
    const [so, st] = MS.schott; for (const s of [-1, 1]) blocks.push(k === 3 ? rect(x - H - st, x - H + st, y + s * so, y + s * (W + 0.1)) : rect(x + s * so, x + s * (W + 0.1), y - H - st, y - H + st));
  }

  // Bausteine setzen: je Bereich und Art ein Netz
  // Lichtraum: Seine Zellen bekommen keine Bausteine, an ihre Stelle tritt das gebackene Modell (im selben Bereich, also mit derselben Sichtprüfung)
  const lm = deckTune.lichtraum ? LM[id] : undefined, lmZone = new Set<string>();
  const lmUse = lm ? [...lm.rooms.map(R => (deckTune.scharf && lm.rooms2.find(q => q.name === R.name)) || R), ...(deckTune.scharf ? lm.rooms2.filter(q => !lm.rooms.some(R => R.name === q.name)) : [])] : [];      // je Raum die neue Art, wenn vorhanden
  for (const R of lmUse) for (const [r, c] of R.cells) lmZone.add(zoneOf(r, c));
  const placed = assemble(D, PARTS, (x, y, a) => [gx(y), gz(x), a + Math.PI / 2], (x, y) => { const z = zoneOf(Math.round(-y / C), Math.round(x / C)); return lmZone.has(z) ? '' : z; }, rect, blocks);
  const { group, meshes } = placed; let tris = placed.tris;
  for (const q of meshes) { q.m.userData.sh = false; q.m.castShadow = q.m.receiveShadow = false; }
  // Lichträume dieses Decks: Netze, Zellmitten (Innenraum), Mitte für die Raumspiegelung, Nebenstrahler
  const lmRooms: { R: LmRoom; meshes: THREE.Mesh[]; cells: [number, number][]; x: number; z: number; side: number[][]; seen: number; gpu: boolean }[] = [];
  const keys: THREE.SpotLight[] = [], more: THREE.SpotLight[] = [], sides: THREE.SpotLight[] = [];      // Strahler mit Schatten, ohne Schatten, Nebenstrahler
  let lmT: THREE.Matrix4 | null = null, lmState = '', lmLive = false, lmTick = 0, lmQueue = 0;
  if (lm) {
    // Modell in Planlage (glTF: x, oben, −y) → Innenraum, wie ein Baustein bei (0, 0) ohne Drehung
    const T = lmT = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(gx(0), 0, gz(0));
    const inBlock = (x: number, z: number) => blocks.some(b => x > b[0] - 0.3 && x < b[1] + 0.3 && z > b[2] - 0.3 && z < b[3] + 0.3);
    for (const R of lmUse) {
      const zn = zoneOf(R.cells[0][0], R.cells[0][1]), ms: THREE.Mesh[] = [];
      for (const q of R.meshes) {
        const m = new THREE.Mesh(q.geo, q.mat); m.matrixAutoUpdate = false; m.matrix.multiplyMatrices(T, q.mw); m.userData.shared = true;      // Netz und Bilder gehören dem geladenen Modell
        if (q.mat.transparent) m.renderOrder = 3;
        m.userData.sh = false; m.castShadow = false; m.receiveShadow = !q.mat.transparent; ms.push(m);
        group.add(m); meshes.push({ m, c: q.geo.boundingSphere!.center.clone().applyMatrix4(m.matrix), r: q.geo.boundingSphere!.radius, zn }); tris += q.tris;
      }
      const cells = R.cells.map(([r, c]) => [gx(-r * C), gz(c * C)] as [number, number]);
      let x = cells.reduce((a, q) => a + q[0], 0) / cells.length, z = cells.reduce((a, q) => a + q[1], 0) / cells.length;
      // Gänge knicken ab: Ihr Mittelpunkt kann in einem Raum oder einer Wand liegen. Also die Zellmitte nehmen, die ihm am nächsten ist.
      { const near = cells.reduce((a, q) => (Math.hypot(q[0] - x, q[1] - z) < Math.hypot(a[0] - x, a[1] - z) ? q : a)); x = near[0]; z = near[1]; }
      // Die Raumspiegelung wird an einem freien Punkt aufgenommen: Steht in der Raummitte ein Tisch, sähe die Kamera nur dessen Inneres
      const spot = [[0, 0], [1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3], [1.6, 1.6], [-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6]].find(([dx, dz]) => !inBlock(x + dx, z + dz));
      if (spot) { x += spot[0]; z += spot[1]; }
      lmRooms.push({ R, meshes: ms, cells, x, z, side: (LM_SIDE[id] || {})[R.name] || [], seen: 0, gpu: false });
    }
    // Strahler-Vorrat. Schlüssellampen: unter jeder Deckenleuchte des Raums einer (im Baukasten sitzt dort das Raumlicht), höchstens KEYS_MAX
    // mit Schatten; hat ein Raum mehr Zellen, bekommen die übrigen Strahler ohne Schatten. Sie geben den Flächen Glanzlichter, beleuchten
    // die Figuren und werfen deren Schatten. Schatten werfen nur Figuren: Die des Raums selbst sind gebacken.
    const most = Math.min(SPOTS_MAX, Math.max(...lmRooms.map(q => q.cells.length))), nSide = Math.max(...lmRooms.map(q => q.side.length));
    for (let i = 0; i < most; i++) {
      const sp = new THREE.SpotLight(new THREE.Color().setRGB(0.82, 0.9, 1.0), 0, MS.spot[1], 1.0, 1, 2);
      sp.userData.room = -1;
      if (i < KEYS_MAX) { sp.castShadow = true; sp.shadow.mapSize.set(512, 512); sp.shadow.camera.near = 0.4; sp.shadow.bias = -0.0015; sp.shadow.normalBias = 0.02; sp.shadow.radius = 4; sp.shadow.autoUpdate = false; }
      group.add(sp, sp.target); (i < KEYS_MAX ? keys : more).push(sp);
    }
    for (let i = 0; i < nSide; i++) { const sp = new THREE.SpotLight(0xffffff, 0, 10, 1.2, 1, 2); group.add(sp, sp.target); sides.push(sp); }      // Nebenstrahler (ohne Schatten)
  }
  // Mischform an- und abschalten, Raumspiegelungen aufnehmen, Strahler verteilen. Die Strahler bekommt der sichtbare Lichtraum, der dem
  // Standort am nächsten ist; die mit Schatten stehen auf den Zellen nächst dem Piloten.
  const lmCapture = (w: (typeof lmRooms)[number]) => {
    // in Weltlage aufnehmen: Der Innenraum liegt und dreht sich mit der Station, gespiegelt wird in Weltrichtungen
    try { group.updateWorldMatrix(true, false); w.R.env = lmProbe(w.R.meshes, new THREE.Matrix4().multiplyMatrices(group.matrixWorld, lmT!), new THREE.Vector3(w.x, 1.7, w.z).applyMatrix4(group.matrixWorld)); w.gpu = true; }
    catch (e) { console.warn('Raumspiegelung nicht aufgenommen:', w.R.name, e); w.R.env = (w.R.mats[0]?.userData.env?.[0] as THREE.Texture) || null; }
  };
  const lmApply = (px: number, pz: number) => {
    if (!lm) return;
    const hy = deckTune.hybrid;
    let act = -1, bd = 1e9, nEnv = 0;
    const now = performance.now();
    lmRooms.forEach((q, i) => {
      if (q.R.env) nEnv++;
      const d = Math.min(...q.cells.map(([cx, cz]) => Math.hypot(cx - px, cz - pz)));
      if (!q.meshes.some(m => m.visible)) {
        // Grafikspeicher: Die Bilder eines Raums (bis 170 MB) freigeben, wenn er 20 s nicht zu sehen war und über 24 m entfernt ist.
        // Beim nächsten Blick lädt three sie aus dem Arbeitsspeicher wieder hoch.
        if (!q.R.keep && q.gpu && d > 24 && now - q.seen > 20000) { lmFree(q.R); q.gpu = false; }
        return;
      }
      q.seen = now; q.gpu = true;
      if (d < bd) { bd = d; act = i; }
    });
    // Raumspiegelungen vorwärmen: je viertem Bild eine, der nächste Bereich zuerst, auch wenn er noch nicht zu sehen ist. Die Aufnahme lädt
    // dabei auch die Netze des Bereichs in den Grafikspeicher. Beim Andocken geschieht das während der Landung, nicht erst beim Hineinlaufen.
    // Was davon schon beim Betreten hinter der Blende aufgenommen wurde (prime), fehlt hier nicht mehr. Räume der alten Art geben ihre
    // Bilder in der Ferne frei: Sie kommen erst wieder dran, wenn sie zu sehen sind.
    // Nicht während des Vorwärmens (warm.hold): Dann folgt prime ohnehin, und Tests rechnen in dieser Zeit Bilder, ohne zu zeichnen.
    if (hy && !LM_BUSY && !warm.hold && (lmQueue++ & 3) === 0) {
      let w: (typeof lmRooms)[number] | null = null, wd = 1e9;
      for (const q of lmRooms) { if (q.R.env || (!q.R.keep && !q.meshes.some(m => m.visible))) continue; const d = Math.hypot(q.x - px, q.z - pz); if (d < wd) { wd = d; w = q; } }
      if (w) { lmCapture(w); nEnv++; }
    }
    const q = hy && act >= 0 ? lmRooms[act] : null;
    const order = q ? q.cells.map((_, i) => i).sort((a, b) => Math.hypot(q.cells[a][0] - px, q.cells[a][1] - pz) - Math.hypot(q.cells[b][0] - px, q.cells[b][1] - pz)) : [];
    const near = order.slice(0, keys.length).sort((a, b) => a - b), far = order.slice(keys.length, keys.length + more.length);
    const st = `${hy}|${q ? act : -1}|${near.join(',')}|${nEnv}|${deckTune.key}|${deckTune.shade}|${deckTune.envK}|${deckTune.spec}|${deckTune.side}`;
    if (st === lmState) return;
    lmState = st;
    for (const o of lmRooms) for (const m of o.R.mats) {
      const [e0, k0, kh] = m.userData.env as [THREE.Texture, number, number], use = hy && o.R.env ? o.R.env : e0;
      if (m.envMap !== use) { m.envMap = use; m.needsUpdate = true; }
      m.envMapIntensity = hy && o.R.env ? kh * deckTune.envK : k0;
    }
    // Wer schon auf einer der gewünschten Zellen steht, bleibt dort: Sonst spränge sein Schatten, sobald der Pilot eine Zelle weitergeht
    const place = (L: THREE.SpotLight[], want: number[]) => {
      const free = new Set(want), todo: THREE.SpotLight[] = [];
      for (const sp of L) { if (q && sp.userData.room === act && free.has(sp.userData.cell)) free.delete(sp.userData.cell); else todo.push(sp); }
      const rest = [...free];
      for (const sp of todo) {
        const k = rest.pop();
        if (!q || k === undefined) { sp.intensity = 0; sp.userData.room = -1; continue; }
        sp.position.set(q.cells[k][0], MS.spot[0], q.cells[k][1]); sp.target.position.set(q.cells[k][0], 0, q.cells[k][1]); sp.userData.room = act; sp.userData.cell = k;
      }
      for (const sp of L) if (sp.userData.room === act && q) { sp.intensity = deckTune.key; if (sp.castShadow) sp.shadow.needsUpdate = true; }
    };
    place(keys, near); place(more, far);
    sides.forEach((sp, i) => {
      const d = q && q.side[i];
      if (!d) { sp.intensity = 0; return; }
      const [x, y, z, dx, dy, dz, r, g, b] = d;      // Modelllage → Innenraum wie bei den Netzen (x → z, z → x)
      sp.color.setRGB(r, g, b); sp.position.set(gx(-z), y, gz(x)); sp.target.position.set(gx(-z) + dz * 3, y + dy * 3, gz(x) - dx * 3); sp.intensity = deckTune.side;
    });
    lmLive = !!q;
    LMSHADE.value = hy ? deckTune.shade : 0; LMSPEC.value = deckTune.spec;
  };
  // Personal, Wege, Gruppen
  const yaw = (deg: number) => { const f = deg * Math.PI / 180; return Math.atan2(-Math.sin(f), -Math.cos(f)); };
  const spots: DeckSpot[] = D.personal.map(s => ({ tab: s.tab, x: gx(s.y), z: gz(s.x), face: yaw(s.face), tx: gx(s.ty), tz: gz(s.tx), titel: s.titel, satz: s.satz }));
  const routes: DeckNode[][] = D.wege.map(w => w.map(n => { const s = n[2] as any; return { x: gx(n[1] as number), z: gz(n[0] as number), stop: s ? { face: yaw(s.face), t: s.t, p: s.p, who: s.who } : null }; }));
  const chats = D.gruppen.map(q => [gx(q[1]), gz(q[0]), q[2]] as [number, number, number]);
  const zMin = gz(CO * C);
  let north = 0; while (isG(at(hr - north - 1, hc + 1))) north++;      // Gangzellen nördlich der Kreuzung hinter dem Tor
  let south = 0; while (isG(at(hr + south + 1, hc + 1))) south++;      // … und südlich (Hüttendeck: Der Weg hinter dem Tor führt nach Süden)
  // Sichtprüfung: Gezeichnet werden nur Bereiche, in die man vom Standort aus durch offene Seiten und Türen hineinsehen kann.
  // Ein Strahl läuft durch das Zellraster; an jeder Zellgrenze muss die Seite offen sein (derselbe Raum, Gang an Gang) oder eine Tür haben,
  // durch deren Öffnung er geht. Geprüft werden je Zelle die Mitte und vier Punkte nahe den Ecken.
  const doors = new Set<string>(); for (const [[r1, c1], [r2, c2]] of D.tueren) { doors.add(`${r1},${c1},${r2},${c2}`); doors.add(`${r2},${c2},${r1},${c1}`); }
  const wins = new Set<string>(); for (const [[r1, c1], [r2, c2]] of D.fenster || []) { wins.add(`${r1},${c1},${r2},${c2}`); wins.add(`${r2},${c2},${r1},${c1}`); }      // Fenster: über die ganze Zellbreite durchsichtig
  const sees = (x: number, y: number, tx: number, ty: number) => {
    let c = Math.round(x / C), r = Math.round(-y / C); const tc = Math.round(tx / C), tr = Math.round(-ty / C), dx = tx - x, dy = ty - y;
    for (let n = 0; n < 64; n++) {
      if (r === tr && c === tc) return true;
      const t1 = dx > 0 ? ((c + 0.5) * C - x) / dx : dx < 0 ? ((c - 0.5) * C - x) / dx : 1e9, t2 = dy > 0 ? ((-r + 0.5) * C - y) / dy : dy < 0 ? ((-r - 0.5) * C - y) / dy : 1e9;
      const ew = t1 < t2, t = Math.min(t1, t2), nr = ew ? r : r + (dy > 0 ? -1 : 1), nc2 = ew ? c + (dx > 0 ? 1 : -1) : c, a = at(r, c), b = at(nr, nc2);
      if (b === '.') return false;
      if (up(a) !== up(b) && wins.has(`${r},${c},${nr},${nc2}`)) { r = nr; c = nc2; continue; }
      if (up(a) !== up(b)) {
        if (!doors.has(`${r},${c},${nr},${nc2}`)) return false;
        const off = ew ? y + dy * t - (-r * C) : x + dx * t - c * C;      // Abstand von der Türmitte
        if (Math.abs(off) > MS.tuerSicht) return false;      // Türöffnung 1,5 m, mit etwas Spiel: lieber einen Bereich zu viel zeichnen als ein Loch zeigen
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
  const PTS = [[0, 0], [-1.5, -1.5], [1.5, -1.5], [1.5, 1.5], [-1.5, 1.5], [0, -1.8], [0, 1.8], [-1.8, 0], [1.8, 0]].map(([a, b]) => [a * C / 4, b * C / 4]);
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
    for (const [px, py, out] of eyes) gate = gate || out || sees(px, py, OX - (H - 0.4), OY) || sees(px, py, OX - (H - 0.4), OY + 0.6) || sees(px, py, OX - (H - 0.4), OY - 0.6);      // sieht man durchs Tor in den Hangar?
    for (const [zn, cells] of cellsOf) {
      search: for (const [px, py] of eyes) for (const [r, c] of cells) for (const [ox, oy] of PTS) if (sees(px, py, c * C + ox, -r * C + oy)) { vis.add(zn); break search; }
    }
    // Türen: Wer eine Türöffnung sieht, sieht auch ein Stück des Raums dahinter (bei flachem Blick nur Laibung und Schwelle, die keiner der
    // Prüfpunkte im Raum trifft). Also beide Seiten zeichnen, sobald ein Punkt in der Öffnung zu sehen ist.
    for (const [[r1, c1], [r2, c2]] of D.tueren) {
      const mx = (c1 + c2) / 2 * C, my = -(r1 + r2) / 2 * C, ax = r1 === r2 ? 0 : 1, ay = r1 === r2 ? 1 : 0;      // ax, ay: Richtung längs der Öffnung
      let hit = false;
      for (const [px, py] of eyes) for (const t0 of [-0.6, 0, 0.6]) for (const n of [-0.15, 0.15]) { const t = t0 * TW / 0.86; if (sees(px, py, mx + ax * t + ay * n, my + ay * t + ax * n)) hit = true; }
      if (hit) { vis.add(zoneOf(r1, c1)); vis.add(zoneOf(r2, c2)); }
    }
  };
  const cellCh = (x: number, z: number) => { const [r, c] = cellOf(x, z); return at(r, c); };
  return {
    group, rects, blocks, spots, routes, chats, tris, map: { x: gx(D.karte_xy[1]), z: gz(D.karte_xy[0]) }, name: D.ort.G,
    inside: (z: number) => z < hz0 - 0.2 && z > zMin,
    area: (x, z) => D.ort[up(cellCh(x, z))] || D.ort.G,
    ceil: (x, z) => { const ch = cellCh(x, z); return isG(ch) ? MS.decke[0] : D.hoch?.[up(ch)] ? D.hoch[up(ch)] - 1.4 : MS.decke[1]; },
    view: (x, z) => { camX = x; camZ = z; },      // Kamera der Außensicht (Innenraum); fern = keine
    update: (x, z) => {
      if (Math.hypot(x - lastX, z - lastZ) > 0.6 || Math.hypot(camX - lookCX, camZ - lookCZ) > 0.6) look(x, z);
      for (const q of meshes) { const d = Math.hypot(q.c.x - x, q.c.z - z) - q.r; q.m.visible = d < RANGE && (d < 5 || q.zn === 'x' || vis.has(q.zn)); }
      if (lm) {
        lmApply(x, z);
        // Schattenkarten reihum: je Bild eine (jede Figur steckt sonst in allen sechs Karten; im Treffpunkt mit seinen vielen Figuren
        // waren schon zwei Karten je Bild 0,8 Mio. Dreiecke). Die Schatten sind weich und schwach, sechs Bilder Verzug sieht man nicht.
        if (lmLive) { lmTick++; const sp = keys[lmTick % keys.length]; if (sp.intensity > 0) sp.shadow.needsUpdate = true; }
      }
    },
    seen: (x, z) => (z > hz0 - 0.2 ? gate : Math.hypot(x - lastX, z - lastZ) < 6 || vis.has(zoneOf(...cellOf(x, z)))),
    hangarSeen: () => gate,
    // Lichtraum 2 (keep) behält Lichtkarten und Raumspiegelungen auch nach dem Verlassen (zusammen rund 200 MB Grafikspeicher für das Deck
    // der Bastion): Beim nächsten Andocken sind sie sofort da, sonst kostete jedes Andocken knapp eine Sekunde Aufnehmen und Hochladen.
    release: () => { for (const q of lmRooms) { if (q.gpu && !q.R.keep) lmFree(q.R); q.gpu = false; } },
    // beim Betreten, hinter der Blende (engine.ts, warmScene): alle Raumspiegelungen auf einmal aufnehmen. So ändert sich im Bild später nichts mehr.
    // Die Materialien bekommen ihre Spiegelung gleich mit: Die Shader werden danach für sie übersetzt (ihr Format steht im Shader).
    prime: () => {
      if (!lm || !deckTune.hybrid) return;
      for (const q of lmRooms) { if (!q.R.env) lmCapture(q); if (q.R.env) for (const m of q.R.mats) if (m.envMap !== q.R.env) { m.envMap = q.R.env; m.needsUpdate = true; } }
    },
    primeStep: () => { if (!lm || !deckTune.hybrid) return false; const q = lmRooms.find(r => !r.R.env); if (!q) return false; lmCapture(q); return true; },
    stale: () => !lm && deckTune.lichtraum && !!LM[id],
    // Weg der Story-Figuren vom Hangar hinaus (und umgekehrt herein): durch das Tor, an der Kreuzung dahinter nach links außer Sicht
    // (so weit der Gang dort nach Norden reicht: auf der Bastion zwei Zellen, auf der Eisenkrone eine)
    way: (off: number) => [[off, hz0 + 4], [off * 0.5, hz0 - 1.2], [off * 0.5, hz0 - C * 1.5 + 0.4 - off * 0.4], [north || !south ? -(north * C - 0.6) : south * C - 0.6, hz0 - C * 1.5 + 0.2 - off * 0.4]],
  };
}

// ---------- Rundhalle (seit 2026-11-19, docs/rundhalle.md): offene Halle statt Zellraster ----------
// Laufflächen und Standflächen kommen als Vielecke; hier werden sie in Streifen von STRIP Metern Tiefe zerlegt (Rechtecke wie bei allen
// Innenräumen: frei, wo Mittelpunkt und Körperrand in Laufflächen liegen und keine Standfläche getroffen wird). Gezeichnet wird alles in
// Reichweite, die Halle ist offen. Die Lichtraum-Teile (Halle, Korridor, fünf Buchten, zwei Flügel) bringen statt Zellen ihre Punkte mit:
// der erste ist der Aufnahmeort der Raumspiegelung, alle zusammen die Plätze der Schlüssellampen.
const STRIP = 0.25;
function strips(poly: number[][], out: Rect[]) {
  let z0 = 1e9, z1 = -1e9; for (const p of poly) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
  for (let z = Math.floor(z0 / STRIP) * STRIP; z < z1; z += STRIP) {
    const zc = z + STRIP / 2, xs: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length];
      if ((az <= zc && bz > zc) || (bz <= zc && az > zc)) xs.push(ax + (zc - az) / (bz - az) * (bx - ax));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) if (xs[i + 1] - xs[i] > 0.01) out.push([xs[i], xs[i + 1], z, z + STRIP]);
  }
}
const inPoly = (poly: number[][], x: number, y: number) => {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
};
function buildRund(id: string, D: RundJson, hz0: number): Deck {
  const K0 = D.kx0, gx = (y: number) => -y, gz = (x: number) => hz0 - (x - K0);
  const toPlan = (x: number, z: number): [number, number] => [K0 + (hz0 - z), -x];
  const I = (poly: number[][]) => poly.map(([x, y]) => [gx(y), gz(x)]);
  const rects: Rect[] = [], blocks: Rect[] = [];
  for (const p of D.walk) strips(I(p), rects);
  for (const p of D.blocks) strips(I(p), blocks);
  const group = new THREE.Group(), meshes: { m: THREE.Mesh; c: THREE.Vector3; r: number }[] = []; let tris = 0;
  // Lichtraum 2: Teile mit ihren Punkten (Plan → Innenraum)
  const lm = deckTune.lichtraum ? LM[id] : undefined;
  const lmT = new THREE.Matrix4().makeRotationY(Math.PI / 2).setPosition(gx(0), 0, gz(0));
  const SPOT: Record<string, [number, number]> = { halle: [6.8, 14], korridor: [4.6, 9], bucht: [4.3, 8], fluegel: [3.15, 8] };      // Höhe und Reichweite der Schlüssellampen je Teil
  const parts: { R: LmRoom; pts: [number, number][]; x: number; z: number; spot: [number, number]; gpu: boolean }[] = [];
  if (lm) for (const R of lm.rooms2) {
    for (const q of R.meshes) {
      const m = new THREE.Mesh(q.geo, q.mat); m.matrixAutoUpdate = false; m.matrix.multiplyMatrices(lmT, q.mw); m.userData.shared = true;
      if (q.mat.transparent) m.renderOrder = 3;
      m.userData.sh = false; m.castShadow = false; m.receiveShadow = !q.mat.transparent;
      group.add(m); meshes.push({ m, c: q.geo.boundingSphere!.center.clone().applyMatrix4(m.matrix), r: q.geo.boundingSphere!.radius }); tris += q.tris;
    }
    const pts = R.cells.map(([x, y]) => [gx(y), gz(x)] as [number, number]);
    const kind = Object.keys(SPOT).find(k => R.name.includes(k)) || 'bucht';
    parts.push({ R, pts: pts.slice(1), x: pts[0][0], z: pts[0][1], spot: SPOT[kind], gpu: false });
  }
  const keys: THREE.SpotLight[] = [], more: THREE.SpotLight[] = [];
  if (lm) for (let i = 0; i < SPOTS_MAX; i++) {
    const sp = new THREE.SpotLight(new THREE.Color().setRGB(0.82, 0.9, 1.0), 0, 10, 1.0, 1, 2);
    sp.userData.key = '';
    if (i < KEYS_MAX) { sp.castShadow = true; sp.shadow.mapSize.set(512, 512); sp.shadow.camera.near = 0.4; sp.shadow.bias = -0.0015; sp.shadow.normalBias = 0.02; sp.shadow.radius = 4; sp.shadow.autoUpdate = false; }
    group.add(sp, sp.target); (i < KEYS_MAX ? keys : more).push(sp);
  }
  const capture = (w: (typeof parts)[number]) => {
    try { group.updateWorldMatrix(true, false); w.R.env = lmProbe(w.R.meshes, new THREE.Matrix4().multiplyMatrices(group.matrixWorld, lmT), new THREE.Vector3(w.x, 1.7, w.z).applyMatrix4(group.matrixWorld), 120); w.gpu = true; }
    catch (e) { console.warn('Raumspiegelung nicht aufgenommen:', w.R.name, e); w.R.env = (w.R.mats[0]?.userData.env?.[0] as THREE.Texture) || null; }
  };
  let state = '', live = false, tick = 0, queue = 0;
  const apply = (px: number, pz: number) => {
    if (!lm) return;
    const hy = deckTune.hybrid;
    let nEnv = parts.filter(q => q.R.env).length;
    if (hy && !LM_BUSY && !warm.hold && (queue++ & 3) === 0) {      // Raumspiegelungen vorwärmen, der nächste Teil zuerst (wie im Zelldeck)
      let w: (typeof parts)[number] | null = null, wd = 1e9;
      for (const q of parts) { if (q.R.env) continue; const d = Math.hypot(q.x - px, q.z - pz); if (d < wd) { wd = d; w = q; } }
      if (w) { capture(w); nEnv++; }
    }
    // aktiver Teil: der mit dem nächsten Lampenplatz; die Lampen mit Schatten auf dessen nächsten Plätzen, die übrigen dahinter
    let act = -1, bd = 1e9;
    parts.forEach((q, i) => { for (const [x, z] of q.pts) { const d = Math.hypot(x - px, z - pz); if (d < bd) { bd = d; act = i; } } });
    const q = hy && act >= 0 ? parts[act] : null;
    const order = q ? q.pts.map((_, i) => i).sort((a, b) => Math.hypot(q.pts[a][0] - px, q.pts[a][1] - pz) - Math.hypot(q.pts[b][0] - px, q.pts[b][1] - pz)) : [];
    const near = order.slice(0, keys.length).sort((a, b) => a - b), far = order.slice(keys.length, keys.length + more.length);
    const st = `${hy}|${act}|${near.join(',')}|${nEnv}|${deckTune.key}|${deckTune.shade}|${deckTune.envK}|${deckTune.spec}`;
    if (st === state) return;
    state = st;
    for (const o of parts) for (const m of o.R.mats) {
      const [e0, k0, kh] = m.userData.env as [THREE.Texture, number, number], use = hy && o.R.env ? o.R.env : e0;
      if (m.envMap !== use) { m.envMap = use; m.needsUpdate = true; }
      m.envMapIntensity = hy && o.R.env ? kh * deckTune.envK : k0;
    }
    const place = (L: THREE.SpotLight[], want: number[]) => {
      const free = new Set(want.map(k => act + ':' + k)), todo: THREE.SpotLight[] = [];
      for (const sp of L) { if (free.has(sp.userData.key)) free.delete(sp.userData.key); else todo.push(sp); }
      const rest = [...free];
      for (const sp of todo) {
        const k = rest.pop();
        if (!q || k === undefined) { sp.intensity = 0; sp.userData.key = ''; continue; }
        const [x, z] = q.pts[+k.split(':')[1]];
        sp.position.set(x, q.spot[0], z); sp.target.position.set(x, 0, z); sp.distance = q.spot[1]; sp.userData.key = k;
      }
      for (const sp of L) if (sp.userData.key && q) { sp.intensity = deckTune.key * (q.spot[0] > 5 ? 2.2 : 1); if (sp.castShadow) sp.shadow.needsUpdate = true; }
    };
    place(keys, near); place(more, far);
    live = !!q;
    LMSHADE.value = hy ? deckTune.shade : 0; LMSPEC.value = deckTune.spec;
  };
  // Personal, Wege, Gruppen (wie im Zelldeck)
  const yaw = (deg: number) => { const f = deg * Math.PI / 180; return Math.atan2(-Math.sin(f), -Math.cos(f)); };
  const spots: DeckSpot[] = D.personal.map(s => ({ tab: s.tab, x: gx(s.y), z: gz(s.x), face: yaw(s.face), tx: gx(s.ty), tz: gz(s.tx), titel: s.titel, satz: s.satz }));
  const routes: DeckNode[][] = D.wege.map(w => w.map(n => { const s = n[2] as any; return { x: gx(n[1] as number), z: gz(n[0] as number), stop: s ? { face: yaw(s.face), t: s.t, p: s.p, who: s.who } : null }; }));
  const chats = D.gruppen.map(q => [gx(q[1]), gz(q[0]), q[2]] as [number, number, number]);
  const ort = (x: number, z: number) => { const [px, py] = toPlan(x, z); return D.orte.find(o => inPoly(o.poly, px, py)); };
  // Hangar sichtbar? Im Korridor immer, in der Halle nur auf der Sichtlinie durch die Mündung des Korridors zum Tor
  const [MX, , MH] = D.mund, TX = D.tor[0];
  let camX = 1e9, camZ = 1e9;
  const sight = (x: number, z: number) => {
    const [px, py] = toPlan(x, z);
    if (px < MX) return true;
    const ym = py + (MX - px) * (0 - py) / (TX - px);
    return Math.abs(ym) < MH;
  };
  const gate = () => sight(lastX, lastZ) || (camX < 1e8 && sight(camX, camZ));
  let lastX = 0, lastZ = hz0 - 2;
  // Figuren und ihre Namen nur zeigen, wo man sie sehen kann: Korridor, Halle samt Buchten, je Flügel (Gang und Raum) ein Bereich.
  // Vom Korridor in Halle und Buchten nur durch die Mündung; in die Flügel nur aus dem Flügel selbst.
  const RR = Math.hypot(D.mund[0], D.mund[2]) + 0.4;      // Hallenradius (aus der Mündung des Korridors)
  const zoneOf = (px: number, py: number) => (px < MX ? 'k' : Math.hypot(px, py) < RR ? 'h' : (() => {
    const d = Math.atan2(py, px) * 180 / Math.PI; return Math.abs(Math.abs(d) - 30) < 14 ? 'w' + Math.sign(d) : 'h';
  })());
  const seenFrom = (ex: number, ez: number, x: number, z: number) => {
    const [ax, ay] = toPlan(ex, ez), [bx, by] = toPlan(x, z), za = zoneOf(ax, ay), zb = zoneOf(bx, by);
    if (za === zb) return true;
    if ((za === 'k' && zb === 'h') || (za === 'h' && zb === 'k')) { const t = (MX - ax) / (bx - ax || 1e-6), ym = ay + (by - ay) * t; return t >= 0 && t <= 1 && Math.abs(ym) < MH; }
    return false;
  };
  return {
    group, rects, blocks, spots, routes, chats, tris, map: { x: gx(D.karte_xy[1]), z: gz(D.karte_xy[0]) }, name: D.name,
    inside: (z: number) => z < hz0 - 0.2 && z > hz0 - 90,
    area: (x, z) => ort(x, z)?.name || D.name,
    ceil: (x, z) => (ort(x, z)?.decke ?? 4),
    view: (x, z) => { camX = x; camZ = z; },
    update: (x, z) => {
      lastX = x; lastZ = z;
      for (const q of meshes) q.m.visible = Math.hypot(q.c.x - x, q.c.z - z) - q.r < RANGE;
      if (lm) { apply(x, z); if (live) { tick++; const sp = keys[tick % keys.length]; if (sp.intensity > 0) sp.shadow.needsUpdate = true; } }
    },
    seen: (x, z) => (z > hz0 - 0.2 ? gate() : lastZ > hz0 - 0.2 ? sight(x, z) : seenFrom(lastX, lastZ, x, z) || (camX < 1e8 && camZ <= hz0 - 0.2 && seenFrom(camX, camZ, x, z))),
    hangarSeen: gate,
    release: () => { for (const q of parts) q.gpu = false; },
    prime: () => {
      if (!lm || !deckTune.hybrid) return;
      for (const q of parts) { if (!q.R.env) capture(q); if (q.R.env) for (const m of q.R.mats) if (m.envMap !== q.R.env) { m.envMap = q.R.env; m.needsUpdate = true; } }
    },
    primeStep: () => { if (!lm || !deckTune.hybrid) return false; const q = parts.find(r => !r.R.env); if (!q) return false; capture(q); return true; },
    stale: () => !lm && deckTune.lichtraum && !!LM[id],
    // Weg der Story-Figuren: durch das Tor, den Korridor hinunter und in der Halle links außer Sicht der Sichtlinie zum Hangar
    way: (off: number) => [[off, hz0 + 4], [off * 0.5, hz0 - 1.5], [off * 0.4, hz0 - 14], [-3.5, hz0 - 19], [-7.5, hz0 - 21.5]],
  };
}

// ---------- Erstes Andocken vorziehen (seit 2026-11-18) ----------
// Beim ersten Andocken an der Bastion stand die Blende 2,5 bis 2,7 s: Raumspiegelungen aller 17 Deckräume und des Hangars aufnehmen
// (rund 1,5 s) und alle Netze und Bilder hochladen (0,3 bis 0,9 s). Beides bleibt danach für die ganze Sitzung (keep), darum ging das
// zweite Andocken in 0,25 s. Jetzt geschieht es schon hinter dem Ladebildschirm beim Start (main.ts): Deck und Hangar werden einmal ohne
// Szene aufgebaut, ihre Spiegelungen aufgenommen und Netze und Bilder in ein winziges Bild gezeichnet (Ersatzmaterial, nur zum Hochladen).
let UPLOAD_RT: THREE.WebGLRenderTarget | null = null;
export function primeStationEarly(id = 'bastion', hz0 = -50) {
  if (!deckTune.hybrid) return;
  const d = hasDeck(id) ? buildDeck(id, hz0) : null, h = id === 'bastion' ? buildHangar() : null;
  if (!d && !h) return;
  try { d?.prime(); h?.prime(); } catch (e) { console.warn('Spiegelungen vorab:', e); }
  const sc = new THREE.Scene(), texs = new Set<THREE.Texture>();
  if (d) sc.add(d.group); if (h) sc.add(h.group);
  sc.traverse((o: any) => {
    if (o.isLight) { o.visible = false; return; }      // keine Schattenbilder beim Hochladen (die Lichter gehören nur zu diesem Aufbau)
    if (!o.isMesh) return; o.frustumCulled = false;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material]) as any[]) {
      if (!m) continue;
      for (const v of Object.values(m)) if ((v as any)?.isTexture) texs.add(v as THREE.Texture);
      if (m.uniforms) for (const u of Object.values(m.uniforms) as any[]) if (u?.value?.isTexture) texs.add(u.value);
    }
  });
  try {
    for (const t of texs) if (!(t as any).isRenderTargetTexture) renderer.initTexture(t);
    UPLOAD_RT = UPLOAD_RT || new THREE.WebGLRenderTarget(4, 4);
    sc.overrideMaterial = new THREE.MeshBasicMaterial();
    const cam = new THREE.PerspectiveCamera(), rt0 = renderer.getRenderTarget();
    renderer.setRenderTarget(UPLOAD_RT); renderer.render(sc, cam); renderer.setRenderTarget(rt0);
    sc.overrideMaterial.dispose();
  } catch (e) { console.warn('Hochladen vorab:', e); }
  // Die Gruppen nur aus der Hilfsszene nehmen; Netze und Bilder gehören den Vorlagen und bleiben (beim Andocken werden sie wiederverwendet)
  sc.clear();
}
