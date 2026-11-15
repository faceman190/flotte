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
// Zum Zeichnen werden die Bausteine je Bereich (Raum oder Gangstück) und Art zu einem Netz zusammengefasst; ferne Bereiche bleiben aus.
// Koordinaten: Plan (x nach Osten, y nach Norden) → Innenraum der Station: das Hangartor der Karte liegt bei x = 0 an der Hangarrückwand,
// Osten zeigt vom Hangar weg (−z), Norden nach −x.
// =====================================================================================

type Rect = [number, number, number, number];   // x0, x1, z0, z1
interface Part { cls: string; pos: Float32Array; nrm: Float32Array; col: Uint8Array; idx: Uint32Array }
interface DeckJson {
  cell: number; karte: string[]; ort: Record<string, string>; tueren: number[][][]; schotte: number[][]; offen: string;
  personal: { tab: string; x: number; y: number; face: number; tx: number; ty: number }[];
  wege: (number | { face: number; t: [number, number]; p: number; who: string | null })[][][]; gruppen: number[][]; karte_xy: number[];
  mod: { n: string; o: string; block: number[] | null }[]; inst: number[][];
}
export interface DeckSpot { tab: string; x: number; z: number; face: number; tx: number; tz: number }
export interface DeckNode { x: number; z: number; stop: null | { face: number; t: [number, number]; p: number; who: string | null } }
export interface Deck {
  group: THREE.Group; rects: Rect[]; blocks: Rect[]; spots: DeckSpot[]; routes: DeckNode[][]; chats: [number, number, number][];
  map: { x: number; z: number }; inside: (z: number) => boolean; area: (x: number, z: number) => string; ceil: (x: number, z: number) => number;
  update: (x: number, z: number) => void; way: (off: number) => number[][]; tris: number;
  seen: (x: number, z: number) => boolean; hangarSeen: () => boolean;      // ist dieser Ort bzw. der Hangar vom Standort aus zu sehen?
}

const RANGE = 46;                 // Bereiche weiter weg werden nicht gezeichnet (m)
const LIGHT = { value: 1.0 };     // Stärke des vorberechneten Lichts
const GLOW = { value: 0.7 };      // Stärke der Leuchten
export const deckTune = { LIGHT, GLOW, mats: () => materials() };      // zum Einstellen im Testfenster
let DATA: DeckJson | null = null, PARTS: Record<string, Part[]> | null = null, loading: Promise<boolean> | null = null;
export const deckReady = () => !!(DATA && PARTS);
export function loadDeck(): Promise<boolean> {
  if (deckReady()) return Promise.resolve(true);
  if (loading) return loading;
  const W = window as any, dj = W.DATAFILES?.deck_bastion as string | undefined, mu = W.BASEDATA?.BastionDeck as string | undefined;
  if (!dj || !mu) return Promise.resolve(false);
  return (loading = (async () => {
    try {
      const [data, gltf] = await Promise.all([fetch(dj).then(r => { if (!r.ok) throw new Error('Deckdaten: ' + r.status); return r.json(); }), new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
      const parts: Record<string, Part[]> = {};
      gltf.scene.updateMatrixWorld(true);
      const v = new THREE.Vector3(), nm = new THREE.Matrix3();
      gltf.scene.traverse((o: any) => {
        if (!o.isMesh) return;
        // der Name des Bausteins steht am Objekt selbst oder (bei mehreren Arten) am Elternknoten
        let name = o.name as string; for (let p = o; p && p !== gltf.scene; p = p.parent) if (/^m\d+$/.test(p.name)) { name = p.name; break; }
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
      DATA = data; PARTS = parts;
      return true;
    } catch (e) { console.warn('Deck der Bastion nicht geladen:', e); loading = null; return false; }
  })());
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
  const lit = (key: string, f0: number, rough: number, envK: number, warn = false) => {
    const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(f0, f0, f0), metalness: 1, roughness: rough, vertexColors: true, envMap: env, envMapIntensity: envK });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.bkLight = LIGHT; sh.uniforms.bkTex = { value: dt };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBkP; varying vec3 vBkN;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBkP = position; vBkN = normal;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float bkLight; uniform sampler2D bkTex; varying vec3 vBkP; varying vec3 vBkN;')
        .replace('#include <color_fragment>', '')
        .replace('#include <roughnessmap_fragment>', [
          'vec3 bkA = abs(vBkN); vec2 bkUv = bkA.y > 0.6 ? vBkP.xz : (bkA.x > bkA.z ? vBkP.zy : vBkP.xy);',
          dt ? 'float bkD = texture2D(bkTex, bkUv * 0.55).g * 0.6 + texture2D(bkTex, bkUv * 0.083).g * 0.4;' : 'float bkD = 0.5;',
          '#include <roughnessmap_fragment>', 'roughnessFactor = clamp(roughnessFactor + (bkD - 0.5) * 0.5, 0.05, 1.0);'].join('\n'))
        .replace('#include <emissivemap_fragment>', ['#include <emissivemap_fragment>', DECODE,
          warn ? 'bkc *= mix(vec3(0.02, 0.02, 0.022), vec3(0.75, 0.33, 0.03), step(0.5, fract((vBkP.x + vBkP.y + vBkP.z) * 7.0)));' : '',
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
    metal: lit('metal', 0.09, 0.44, 0.3), paint: lit('paint', 0.04, 0.5, 0.22), soft: lit('soft', 0.02, 0.9, 0.1), gloss: lit('gloss', 0.3, 0.1, 0.6), warn: lit('warn', 0.04, 0.55, 0.2, true),
    glow: glow('glow', 'diffuseColor.rgb = bkc * bkGlow;'),
    screen: glow('screen', 'diffuseColor.rgb = bkc * bkGlow * mix(0.12, 1.0, step(0.42, fract(vBkP.y * 42.0)));'),
    stars: glow('stars', 'vec3 bkq = floor(vBkP * 26.0); float bkh = fract(sin(dot(bkq, vec3(12.9898, 78.233, 37.719))) * 43758.5453); diffuseColor.rgb = vec3(0.004, 0.006, 0.012) + vec3(0.7, 0.8, 1.0) * step(0.985, bkh) * (0.3 + bkh);'),
    stain: glow('stain', 'diffuseColor.rgb = bkc * bkLight; diffuseColor.a *= vColor.a;', { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0c1418, metalness: 0.9, roughness: 0.06, transparent: true, opacity: 0.22, depthWrite: false, envMap: env, envMapIntensity: 1.4 }),
  });
}

// ---------- Deck für den aktuellen Innenraum bauen (hz0 = Hangarrückwand, z des Tors) ----------
export function buildDeck(hz0: number): Deck | null {
  if (!DATA || !PARTS) return null;
  const D = DATA, K = D.karte, RO = K.length, CO = K[0].length, C = D.cell, M = materials();
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
  for (const [r, c, k] of D.schotte) {      // Schott: die Pfosten verengen den Gang auf 2,2 m
    const x = c * C, y = -r * C;
    for (const s of [-1, 1]) blocks.push(k === 3 ? rect(x - H - 0.12, x - H + 0.12, y + s * 1.12, y + s * 1.8) : rect(x + s * 1.12, x + s * 1.8, y - H - 0.12, y - H + 0.12));
  }

  // Bausteine setzen: je Bereich und Art ein Netz
  const zones = new Map<string, { n: number; ni: number; list: [Part, number, number, number][] }>();
  for (const [mi, x, y, a] of D.inst) {
    const md = D.mod[mi], parts = PARTS[md.o]; if (!parts) continue;
    const zn = zoneOf(Math.round(-y / C), Math.round(x / C));
    for (const p of parts) {
      const k = zn + '|' + p.cls; let z = zones.get(k); if (!z) zones.set(k, (z = { n: 0, ni: 0, list: [] }));
      z.n += p.pos.length / 3; z.ni += p.idx.length; z.list.push([p, x, y, a]);
    }
    if (md.block) {      // Standfläche: Rechteck des Bausteins um seine Drehung, davon das achsparallele Rechteck
      const [bx0, bx1, by0, by1] = md.block, cs = Math.cos(a), sn = Math.sin(a); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const [px, py] of [[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]]) { const wx = x + px * cs - py * sn, wy = y + px * sn + py * cs; x0 = Math.min(x0, wx); x1 = Math.max(x1, wx); y0 = Math.min(y0, wy); y1 = Math.max(y1, wy); }
      blocks.push(rect(x0, x1, y0, y1));
    }
  }
  const group = new THREE.Group(), meshes: { m: THREE.Mesh; c: THREE.Vector3; r: number; zn: string }[] = []; let tris = 0;
  for (const [k, z] of zones) {
    const [zn, cls] = k.split('|'), mat = M[cls] || M.paint;
    const pos = new Float32Array(z.n * 3), nrm = new Int8Array(z.n * 3), col = new Uint8Array(z.n * 4), idx = new Uint32Array(z.ni); let vo = 0, io = 0;
    for (const [p, x, y, a] of z.list) {
      // Baustein (glTF-Lage: x, oben, −y) um a drehen, an seinen Platz im Plan, dann in den Innenraum (Vierteldrehung, siehe Kopf der Datei)
      const th = a + Math.PI / 2, cs = Math.cos(th), sn = Math.sin(th), tx = gx(y), tz = gz(x), n = p.pos.length / 3;
      for (let i = 0; i < n; i++) {
        const px = p.pos[i * 3], py = p.pos[i * 3 + 1], pz = p.pos[i * 3 + 2], o = (vo + i) * 3;
        pos[o] = px * cs + pz * sn + tx; pos[o + 1] = py; pos[o + 2] = -px * sn + pz * cs + tz;
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
    if (cls === 'stain') m.renderOrder = 1; if (cls === 'glass') m.renderOrder = 2;
    group.add(m); meshes.push({ m, c: g.boundingSphere!.center.clone(), r: g.boundingSphere!.radius, zn }); tris += z.ni / 3;
  }
  // Personal, Wege, Gruppen
  const yaw = (deg: number) => { const f = deg * Math.PI / 180; return Math.atan2(-Math.sin(f), -Math.cos(f)); };
  const spots: DeckSpot[] = D.personal.map(s => ({ tab: s.tab, x: gx(s.y), z: gz(s.x), face: yaw(s.face), tx: gx(s.ty), tz: gz(s.tx) }));
  const routes: DeckNode[][] = D.wege.map(w => w.map(n => { const s = n[2] as any; return { x: gx(n[1] as number), z: gz(n[0] as number), stop: s ? { face: yaw(s.face), t: s.t, p: s.p, who: s.who } : null }; }));
  const chats = D.gruppen.map(q => [gx(q[1]), gz(q[0]), q[2]] as [number, number, number]);
  const zMin = gz(CO * C);
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
        if (Math.abs(off) > 0.95) return false;
      }
      r = nr; c = nc2;
    }
    return false;
  };
  const cellsOf = new Map<string, [number, number][]>();
  for (let r = 0; r < RO; r++) for (let c = 0; c < CO; c++) if (at(r, c) !== '.') { const zn = zoneOf(r, c); cellsOf.set(zn, [...(cellsOf.get(zn) || []), [r, c]]); }
  let lastX = 1e9, lastZ = 1e9, gate = true; const vis = new Set<string>();
  const look = (x: number, z: number) => {
    lastX = x; lastZ = z; vis.clear();
    let px = OX + (Z0 - z), py = OY - x;                                  // Innenraum → Plan
    const out = at(Math.round(-py / C), Math.round(px / C)) === '.';
    if (out) { px = OX; py = OY; }                                        // im Hangar (oder in einer Wand): Blick vom Tor aus
    gate = out || z > hz0 - 0.2 || sees(px, py, OX - 1.6, OY) || sees(px, py, OX - 1.6, OY + 0.6) || sees(px, py, OX - 1.6, OY - 0.6);      // sieht man durchs Tor in den Hangar?
    for (const [zn, cells] of cellsOf) {
      search: for (const [r, c] of cells) for (const [ox, oy] of [[0, 0], [-1.4, -1.4], [1.4, -1.4], [1.4, 1.4], [-1.4, 1.4]]) if (sees(px, py, c * C + ox, -r * C + oy)) { vis.add(zn); break search; }
    }
  };
  const cellCh = (x: number, z: number) => { const [r, c] = cellOf(x, z); return at(r, c); };
  return {
    group, rects, blocks, spots, routes, chats, tris, map: { x: gx(D.karte_xy[1]), z: gz(D.karte_xy[0]) },
    inside: (z: number) => z < hz0 - 0.2 && z > zMin,
    area: (x, z) => D.ort[up(cellCh(x, z))] || D.ort.G,
    ceil: (x, z) => (isG(cellCh(x, z)) ? 2.75 : 3.25),
    update: (x, z) => {
      if (Math.hypot(x - lastX, z - lastZ) > 0.6) look(x, z);
      for (const q of meshes) { const d = Math.hypot(q.c.x - x, q.c.z - z) - q.r; q.m.visible = d < RANGE && (d < 5 || q.zn === 'x' || vis.has(q.zn)); }
    },
    seen: (x, z) => (z > hz0 - 0.2 ? gate : Math.hypot(x - lastX, z - lastZ) < 6 || vis.has(zoneOf(...cellOf(x, z)))),
    hangarSeen: () => gate,
    // Weg der Story-Figuren vom Hangar hinaus (und umgekehrt herein): durch das Tor, an der Kreuzung dahinter nach links außer Sicht
    way: (off: number) => [[off, hz0 + 4], [off * 0.5, hz0 - 1.2], [off * 0.5, hz0 - 5.6 - off * 0.4], [-7.4, hz0 - 5.8 - off * 0.4]],
  };
}
