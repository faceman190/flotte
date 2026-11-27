import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MANIFEST } from '../core/assets';
import { renderer } from '../core/engine';
import { FIGUR_TEILE } from '../data/figurTeile';
import { gesichtAus, neuesGesicht, haarDatei, hautFaktor, HAAR_PLAETZE, HAARFARBEN, KOPF_DATEI, FORM_KEYS, type Gesicht } from '../data/gesicht';

// =====================================================================================
// Spielerfiguren mit Ausrüstung (seit 2026-11-24, Paket „Spielcharakter“ des Spielers; docs/spielcharakter.md).
// Alles sitzt auf EINEM Skelett (UE5 Manny, 161 Knochen): Der Körper der gewählten Figur und jedes Ausrüstungsteil sind eigene
// Dateien (Paket „lazy“: Skelett, Koerper1–3, Teil_<id>; scripts/build-figuren.mjs). Sie werden bei Bedarf geladen und über die
// Knochennamen an das Skelett gehängt – so passt jedes Teil auf jede Figur, und Bewegungen laufen ohne Umrechnung.
// Körperflächen unter einem Teil (Hand unter dem Handschuh, Rumpf unter dem Overall) werden ausgeblendet, damit nichts durchstößt.
// Eine Klasse für die eigene Figur im Spiel (mannyAvatar.ts: Skelett des Animators) und für die Vorschauen (figPreview.ts,
// teilPreview.ts: eigenes Skelett aus neuesSkelett()). Netze und Bilder teilen sich alle Figuren (kein zweites Mal im Grafikspeicher).
// =====================================================================================

export type Platz = 'helm' | 'weste' | 'overall' | 'handschuh' | 'stiefel' | 'rucksack';      // rucksack seit 2026-11-27
export const PLAETZE: Platz[] = ['helm', 'weste', 'overall', 'handschuh', 'stiefel', 'rucksack'];
/** Was eine Figur trägt: Nummer der Figur und je Platz die Kennung eines Teils (helm_01, overall_02 …) */
// gesicht: Code aus dem Gesichts-Editor (data/gesicht.ts). Ist er gesetzt, gilt er statt der Figur: Unteranzug-Körper, MetaHuman-Kopf mit den
// Reglern, gewählte Haare; Haut (auch der Hände), Iris und Haarfarbe bekommt jede Figur in eigenen Materialien.
export interface Tracht { figur: number; teile: Partial<Record<Platz, string>>; puppe?: boolean; gesicht?: string | null }      // puppe: Schaupuppe im Laden (Körper in Puppengrau, ohne Haare; schaupuppe.ts)
let PUPPE_MAT: THREE.MeshStandardMaterial | null = null;
const puppeMat = () => (PUPPE_MAT ||= Object.assign(new THREE.MeshStandardMaterial({ color: 0x777a7c, roughness: 0.52, metalness: 0 }), { name: 'Schaupuppe', envMapIntensity: 0.3 }));
export const TEIL_PLATZ = FIGUR_TEILE.teile as Record<string, Platz>;
// Waffe in der Halterung am Körper (manny/WeaponLayer.js HOLSTER): um so viel steht sie weiter vom Körper ab, je nachdem, was getragen
// wird – [am Rücken, am Oberschenkel] in Metern, es gilt das dickste Teil. Am Bild abgeglichen (27.11.2026): Der Plattenträger hat eine
// Rückenplatte über die ganze Breite, die Rüstung einen Rückenschild.
const HALTER_TIEFE: Record<string, [number, number]> = { weste_01: [0.1, 0], overall_02: [0.06, 0.04], overall_01: [0.015, 0.01] };
const _ht: [number, number] = [0, 0];
export function halterTiefe(t?: Tracht | null): [number, number] {
  _ht[0] = _ht[1] = 0;
  if (t) for (const p in t.teile) { const h = HALTER_TIEFE[t.teile[p as Platz] || '']; if (h) { _ht[0] = Math.max(_ht[0], h[0]); _ht[1] = Math.max(_ht[1], h[1]); } }
  return _ht;
}
const VERDECKT = FIGUR_TEILE.verdeckt as Partial<Record<Platz, string>>;
const HAND = '^(hand|thumb|index|middle|ring|pinky|wrist)_';

// Die wählbaren Figuren. teile: Dateien des Körpers; weg: je Netz (Name klein) Knochen, deren Flächen immer fehlen.
// Figur 2 ist ein MetaHuman-Kopf: Das Paket liefert dazu keinen Rumpf und keinen Unteranzug (nur Arme und Beine in Haut). Deshalb
// trägt sie den Unteranzug-Körper von Figur 1 ohne dessen Kopf und Hände; vom MetaHuman kommen Kopf, Haare, Bart und die Hände.
interface KoerperTeil { f: string; weg?: Record<string, string>; nur?: string[] }      // nur: nur diese Netze der Datei
export const FIGUREN: { id: number; n: string; d: string; teile: KoerperTeil[] }[] = [
  { id: 1, n: 'Figur 1', d: 'Kurzes dunkles Haar, Dreitagebart', teile: [{ f: 'lazy/Koerper1' }] },
  { id: 2, n: 'Figur 2', d: 'Graues Haar, Schnurrbart', teile: [
    { f: 'lazy/Koerper1', weg: { koerper: '^(head$|neck_02$|' + HAND.slice(1) + ')' } },
    { f: 'lazy/Koerper2', weg: { koerper: '^(?!(hand|thumb|index|middle|ring|pinky|wrist)_)', kopf: '^(?!(head|neck))' } },
  ] },
  { id: 3, n: 'Figur 3', d: 'Kräftig, kurzes Haar, glatt rasiert', teile: [{ f: 'lazy/Koerper3' }] },
];
// Körper zum eigenen Gesicht: der hautenge Anzug (koerper_01 von Figur 3) ohne den alten Hals (in Blender entfernt, gesicht_09), ohne
// Hände; die Hände vom MetaHuman (Figur 2), damit sie den Hautton des Kopfes annehmen; dazu der Kopf aus dem Gesichts-Editor.
// Die Haare kommen je nach Wahl dazu.
const GESICHT_KOERPER: KoerperTeil[] = [
  { f: 'lazy/Gesicht_koerper', weg: { koerper: HAND } },
  { f: 'lazy/Koerper2', nur: ['koerper'], weg: { koerper: '^(?!(hand|thumb|index|middle|ring|pinky|wrist)_)' } },
  { f: KOPF_DATEI },
];
const istGesichtDatei = (f: string) => f.startsWith('lazy/Gesicht_');
export const figurDef = (id: number) => FIGUREN.find(f => f.id === id) || FIGUREN[0];
export const normFigur = (id: unknown) => (FIGUREN.some(f => f.id === id) ? id as number : 1);
const teilDatei = (id: string) => 'lazy/Teil_' + id;

// ---------- geladene Dateien: Netze, Material, Knochennamen. Geteilt von allen Figuren, gezählt nach Benutzern ----------
interface Netz { name: string; koerper: boolean; geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; bones: string[]; inv: THREE.Matrix4[]; masken: Map<string, Uint8Array>; morph: Record<string, number> | null }
interface Daten { netze: Netz[]; box: THREE.Box3 }
const CACHE = new Map<string, { p: Promise<Daten | null>; d: Daten | null; refs: number; timer: number }>();
const KEEP_MS = 30000;      // so lange bleibt eine Datei ohne Benutzer noch im Speicher (Wechsel hin und zurück lädt nicht neu)
const newLoader = () => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const nodeOf = (o: THREE.Object3D) => (o.parent && o.parent.type === 'Group' && o.parent.children.length > 1 && o.parent.children.every((c: any) => c.isMesh) ? o.parent : o);
const baseName = (n: string) => n.replace(/(_\d+)+$/, '').toLowerCase();

function prepMat(m: any) {
  m.envMapIntensity = 0.3;                                   // wie die Figuren bisher: wenig Spiegelung der Umgebung
  for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (m[k]) m[k].anisotropy = 8;
  if (m.transparent) { m.transparent = false; m.alphaTest = 0.35; m.depthWrite = true; }   // Haarkarten: ausgestanzt statt durchscheinend (keine Sortierfehler)
  if (/^Haar_/.test(m.name)) { m.color.set(0x9a9c9f); m.roughness = 0.62; }                  // MetaHuman-Haar kommt ohne Farbe (reines Weiß): graues Haar
}
async function laden(file: string): Promise<Daten | null> {
  const url = MANIFEST?.files[file]?.url;
  if (!url) { console.warn('Figur: ' + file + ' fehlt in der Paketliste'); return null; }
  const g = await newLoader().loadAsync(url);
  const netze: Netz[] = [], box = new THREE.Box3(), texs = new Set<THREE.Texture>();
  g.scene.updateMatrixWorld(true);
  g.scene.traverse((o: any) => {
    if (!o.isSkinnedMesh) return;
    const name = baseName(nodeOf(o).name);
    for (const m of ([] as any[]).concat(o.material)) {
      prepMat(m);
      // Haare des Gesichts-Editors: Karten beidseitig und feiner ausgestanzt (wie auf der Testseite); Farbe setzt jede Figur selbst
      if (file.startsWith('lazy/Gesicht_haar')) { m.transparent = false; m.alphaTest = 0.22; m.depthWrite = true; m.side = THREE.DoubleSide; }
      for (const v of Object.values(m)) if ((v as any)?.isTexture) texs.add(v as THREE.Texture);
    }
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    // Maße in Ruhehaltung: Die Eckpunkte sind beim Packen verdichtet, ihre Umrechnung steckt in den Bindematrizen (Knochen × Bindematrix)
    box.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(o.skeleton.bones[0].matrixWorld, o.skeleton.boneInverses[0])));
    netze.push({ name, koerper: name === 'koerper' || name === 'kopf', geo: o.geometry, mat: o.material, bones: o.skeleton.bones.map((b: THREE.Bone) => b.name), inv: o.skeleton.boneInverses, masken: new Map(), morph: o.morphTargetDictionary || null });
  });
  // Bilder nach und nach in den Grafikspeicher legen, damit das erste Bild mit dem neuen Teil nicht hakt
  const list = [...texs];
  const step = () => { const t = list.pop(); if (!t) return; try { renderer.initTexture(t); } catch (e) { /* egal: kommt dann beim Zeichnen */ } setTimeout(step, 24); };
  setTimeout(step, 0);
  return { netze, box };
}
function holen(file: string) {
  let c = CACHE.get(file);
  if (!c) { c = { p: null as any, d: null, refs: 0, timer: 0 }; CACHE.set(file, c); const cc = c; c.p = laden(file).then(d => (cc.d = d), e => { console.warn('Figur: ' + file + ' nicht geladen', e); CACHE.delete(file); return null; }); }
  if (c.timer) { clearTimeout(c.timer); c.timer = 0; }
  c.refs++;
  return c;
}
function lassen(file: string) {
  const c = CACHE.get(file); if (!c) return;
  if (--c.refs > 0 || c.timer) return;
  c.timer = window.setTimeout(() => {
    if (c.refs > 0) return;
    CACHE.delete(file);
    for (const n of c.d?.netze || []) {
      n.geo.dispose();
      for (const m of ([] as any[]).concat(n.mat)) { for (const v of Object.values(m)) if ((v as any)?.isTexture) (v as THREE.Texture).dispose(); m.dispose(); }
    }
  }, KEEP_MS);
}
/** Maße eines Ausrüstungsteils in Ruhehaltung (für die Vorschau im Laden); lädt die Datei, falls nötig */
export async function teilBox(id: string): Promise<THREE.Box3 | null> { const c = holen(teilDatei(id)); const d = await c.p; lassen(teilDatei(id)); return d ? d.box.clone() : null; }

// Flächen eines Netzes, deren drei Ecken überwiegend an Knochen des Ausdrucks hängen
function maske(n: Netz, src: string): Uint8Array {
  let t = n.masken.get(src); if (t) return t;
  const re = new RegExp(src), hit = n.bones.map(b => re.test(b)), si = n.geo.attributes.skinIndex, sw = n.geo.attributes.skinWeight, vin = new Uint8Array(si.count);
  for (let v = 0; v < si.count; v++) {
    let w = 0;
    for (let k = 0; k < 4; k++) if (hit[si.getComponent(v, k)]) w += sw.getComponent(v, k);
    vin[v] = w > 0.5 ? 1 : 0;
  }
  const idx = n.geo.index!.array; t = new Uint8Array(idx.length / 3);
  for (let i = 0; i < t.length; i++) t[i] = vin[idx[3 * i]] & vin[idx[3 * i + 1]] & vin[idx[3 * i + 2]];
  n.masken.set(src, t);
  return t;
}

// ---------- Skelett für Vorschauen ----------
let skelP: Promise<THREE.Object3D | null> | null = null;
/** eigenes Skelett in Ruhehaltung (A-Haltung) für eine Vorschau; null, wenn die Datei fehlt */
export async function neuesSkelett(): Promise<THREE.Object3D | null> {
  if (!skelP) {
    const url = MANIFEST?.files['lazy/Skelett']?.url;
    skelP = url ? newLoader().loadAsync(url).then(g => g.scene, () => null) : Promise.resolve(null);
  }
  const s = await skelP; if (!s) return null;
  const c = cloneSkinned(s);
  c.traverse((o: any) => { if (o.isMesh) o.visible = false; });
  return c;
}

// ---------- eine Figur: Körper und Teile an einem Skelett ----------
interface Inst { file: string; wk: string; netz: Netz; mesh: THREE.SkinnedMesh; base: Uint32Array | Uint16Array | null; weg: string | null; eigen: THREE.Material[] }

// ---------- Gesicht: Hautton und Irisfarbe als Zusatz im Shader (wie public/gesicht.html), Werte je Figur ----------
type U<T> = { value: T };
function hautShader(m: THREE.Material, u: U<THREE.Vector3>) {
  m.onBeforeCompile = sh => { sh.uniforms.uHaut = u;
    sh.fragmentShader = 'uniform vec3 uHaut;\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= uHaut;'); };
}
// Die Iris liegt in der Augentextur als grauer Ring um die Mitte; er wird nach seiner Helligkeit neu eingefärbt
function augenShader(m: THREE.Material, u: U<THREE.Color>) {
  m.onBeforeCompile = sh => { sh.uniforms.uIris = u;
    sh.fragmentShader = 'uniform vec3 uIris;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      float dI = distance(vMapUv, vec2(0.5));
      float mI = smoothstep(0.166, 0.152, dI) * smoothstep(0.044, 0.056, dI);
      float lI = dot(diffuseColor.rgb, vec3(0.333));
      vec3 cI = uIris * clamp(lI * 5.0, 0.0, 1.6) * mix(1.25, 0.8, smoothstep(0.06, 0.16, dI));
      diffuseColor.rgb = mix(diffuseColor.rgb, cI, mI);`); };
}
const linear = (c: [number, number, number]): [number, number, number] => { const k = new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace); return [k.r, k.g, k.b]; };
export class Figur {
  readonly bones: Record<string, THREE.Bone> = {};
  /** der Körper der gewünschten Figur hängt am Skelett */
  bereit = false;
  /** alles Gewünschte hängt am Skelett (nichts lädt mehr) */
  fertig = false;
  /** nach jedem Wechsel von Netzen (z. B. um die Zeichenebene neu zu setzen) */
  onChange: (() => void) | null = null;
  private inst: Inst[] = [];
  private files: string[] = [];
  private key = '';
  private gen = 0;
  // Gesicht dieser Figur (leer: Figur ohne eigenes Gesicht)
  private gcode = '';
  private ges: Gesicht | null = null;
  private readonly uHaut = { value: new THREE.Vector3(1, 1, 1) };
  private readonly uIris = { value: new THREE.Color() };
  private readonly haarMats: THREE.MeshStandardMaterial[] = [];
  constructor(readonly root: THREE.Object3D) {
    root.traverse((o: any) => { if (o.isBone) this.bones[o.name] = o; else if (o.isMesh) o.visible = false; });
  }
  /** Figur und Teile wählen. Fehlendes wird geladen; bis alles da ist, bleibt der alte Stand sichtbar. */
  setzen(t: Tracht) {
    const pu = !!t.puppe;
    // eigenes Gesicht (nicht für die Schaupuppe): Code lesen; ungültig ergibt das Standardgesicht
    const g = t.gesicht && !pu ? gesichtAus(t.gesicht) || neuesGesicht() : null;
    if (g) { const code = t.gesicht!; if (code !== this.gcode) { this.gcode = code; this.ges = g; this.gesichtAnwenden(); } } else { this.gcode = ''; this.ges = null; }
    const haare = g ? HAAR_PLAETZE.map(p => haarDatei(p, g.wahl[p])).filter((f): f is string => !!f).map(f => ({ f })) : [];
    const def = g ? { id: 'g', teile: [...GESICHT_KOERPER, ...haare] as KoerperTeil[] }
      : t.figur ? figurDef(t.figur) : { id: 0, teile: [] as KoerperTeil[] };      // 0: kein Körper, nur die Teile (Ansicht im Laden)
    const teile = PLAETZE.map(p => [p, t.teile[p]] as const).filter(x => x[1] && TEIL_PLATZ[x[1]!] === x[0]) as [Platz, string][];
    const key = def.id + '|' + haare.map(h => h.f).join(',') + '|' + teile.map(x => x[1]).join(',') + (pu ? '|p' : '');
    if (key === this.key) return;
    this.key = key; this.fertig = false;
    const gen = ++this.gen;
    const want = [...def.teile.map(k => ({ f: k.f, weg: k.weg || null, nur: k.nur || null })), ...teile.map(x => ({ f: teilDatei(x[1]), weg: null as Record<string, string> | null, nur: null as string[] | null }))]
      .map(w => ({ ...w, wk: JSON.stringify(w.weg) + (pu ? 'P' : '') + (g ? 'G' : '') }));
    const got = want.map(w => holen(w.f));
    Promise.all(got.map(c => c.p)).then(ds => {
      if (gen !== this.gen) { for (const w of want) lassen(w.f); return; }      // inzwischen etwas anderes gewünscht
      // alte Netze ab, neue an (Dateien, die bleiben, behalten ihre Netze)
      const keep = new Set(want.map(w => w.f + w.wk));
      this.inst = this.inst.filter(i => { if (keep.has(i.file + i.wk)) return true; this.drop(i); return false; });
      const have = new Set(this.inst.map(i => i.file));
      want.forEach((w, k) => { const d = ds[k]; if (d && !have.has(w.f)) for (const n of d.netze) if (!w.nur || w.nur.includes(n.name)) this.add(w.f, w.wk, n, w.weg?.[n.name] || null, pu, !!g); });
      for (const f of this.files) lassen(f);
      this.files = want.map(w => w.f);
      this.maskieren(new Set(teile.map(x => x[0])));
      if (g) this.gesichtAnwenden();
      this.bereit = def.teile.every(k => this.inst.some(i => i.file === k.f));
      this.fertig = true;
      this.onChange?.();
    });
  }
  private add(file: string, wk: string, n: Netz, weg: string | null, puppe = false, gesicht = false) {
    if (puppe && n.name === 'haare') return;
    let geo = n.geo, base: Inst['base'] = null;
    if (n.koerper || n.name === 'haare') {
      // eigene Flächenliste über denselben Eckpunkten: so lassen sich Flächen je Figur ausblenden
      base = n.geo.index!.array as Uint32Array;
      geo = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(n.geo.attributes)) geo.setAttribute(k, a as THREE.BufferAttribute);
      geo.setIndex(new THREE.BufferAttribute(base.slice(), 1));
      geo.boundingBox = n.geo.boundingBox; geo.boundingSphere = n.geo.boundingSphere;
    }
    // Gesicht: eigene Materialien dieser Figur (Bilder bleiben geteilt) für Hautton, Iris und Haarfarbe
    let mat = puppe && n.koerper ? puppeMat() : n.mat;
    const eigen: THREE.Material[] = [];
    const haende = file === 'lazy/Koerper2';      // MetaHuman-Hände: nehmen den Hautton an
    if (gesicht && ((istGesichtDatei(file) && file !== 'lazy/Gesicht_koerper') || haende)) {
      const ein = (m0: THREE.Material) => {
        const m1 = m0.clone(); eigen.push(m1);
        if (m1.name === 'kopf_haut' || haende) hautShader(m1, this.uHaut);
        else if (m1.name === 'auge_L' || m1.name === 'auge_R') augenShader(m1, this.uIris);
        else if (file.startsWith('lazy/Gesicht_haar')) this.haarMats.push(m1 as THREE.MeshStandardMaterial);
        return m1;
      };
      mat = Array.isArray(mat) ? mat.map(ein) : ein(mat);
    }
    const m = new THREE.SkinnedMesh(geo, mat);
    m.name = 'fig_' + n.name; m.frustumCulled = false; m.castShadow = true; m.userData.sh = false; m.userData.shared = true;
    if (n.morph) m.morphTargetDictionary = n.morph;
    // Jedes Netz bringt seine eigenen Bindematrizen mit (beim Packen steckt darin auch die Umrechnung seiner verdichteten Eckpunkte)
    const bones = n.bones.map(b => this.bones[b]);
    if (bones.some(b => !b)) { console.warn('Figur: ' + file + ' passt nicht zum Skelett'); return; }
    this.root.add(m);
    m.bind(new THREE.Skeleton(bones, n.inv.map(x => x.clone())), new THREE.Matrix4());
    this.inst.push({ file, wk, netz: n, mesh: m, base, weg, eigen });
  }
  private drop(i: Inst) {
    i.mesh.removeFromParent();
    if (i.base) i.mesh.geometry.dispose();      // nur die eigene Flächenliste; die geteilten Eckpunkte lädt three.js bei Bedarf neu hoch
    for (const m of i.eigen) { m.dispose(); const k = this.haarMats.indexOf(m as THREE.MeshStandardMaterial); if (k >= 0) this.haarMats.splice(k, 1); }
  }
  /** Regler, Hautton, Iris und Haarfarbe des Gesichts auf die angehängten Netze legen (billig: nur Zahlen, nichts wird geladen) */
  private gesichtAnwenden() {
    const g = this.ges; if (!g) return;
    const f = hautFaktor(g.haut, linear); this.uHaut.value.set(f[0], f[1], f[2]);
    this.uIris.value.set(g.iris);
    const hc = new THREE.Color(HAARFARBEN[g.haar]?.[0] || HAARFARBEN[0][0]);
    for (const m of this.haarMats) m.color.copy(hc);
    for (const i of this.inst) {
      const d = i.mesh.morphTargetDictionary, inf = i.mesh.morphTargetInfluences; if (!d || !inf) continue;
      for (const k of FORM_KEYS) { const x = d['form_' + k]; if (x !== undefined) inf[x] = g.form[k] || 0; }
    }
  }
  /** Lidschlag (0 offen … 1 zu) für Figuren mit eigenem Gesicht */
  blinzeln(v: number) {
    if (!this.ges) return;
    for (const i of this.inst) {
      const d = i.mesh.morphTargetDictionary, inf = i.mesh.morphTargetInfluences; if (!d || !inf) continue;
      for (const k of ['mimik_blinzeln_L', 'mimik_blinzeln_R']) { const x = d[k]; if (x !== undefined) inf[x] = v; }
    }
  }
  // Körperflächen unter getragenen Teilen ausblenden; Haare verschwinden unter einem Helm
  private maskieren(an: Set<Platz>) {
    const zonen = PLAETZE.filter(p => an.has(p) && VERDECKT[p]).map(p => VERDECKT[p]!);
    for (const i of this.inst) {
      if (i.file.startsWith('lazy/Gesicht_haar_frisur') || i.file === 'lazy/Gesicht_haar_haare') { i.mesh.visible = !an.has('helm'); continue; }
      if (!i.base) continue;
      if (i.netz.name === 'haare') { i.mesh.visible = !an.has('helm'); continue; }
      const ms = [...(i.netz.name === 'koerper' ? zonen : []), ...(i.weg ? [i.weg] : [])].map(z => maske(i.netz, z));
      const idx = i.mesh.geometry.index!, out = idx.array as Uint32Array, src = i.base;
      let o = 0;
      for (let t = 0, n = src.length / 3; t < n; t++) {
        let hide = false;
        for (const m of ms) if (m[t]) { hide = true; break; }
        if (!hide) { out[o++] = src[3 * t]; out[o++] = src[3 * t + 1]; out[o++] = src[3 * t + 2]; }
      }
      i.mesh.geometry.setDrawRange(0, o); idx.needsUpdate = true;
      i.mesh.visible = o > 0;
    }
  }
  /** alles abnehmen und die Dateien freigeben (Vorschau geschlossen) */
  leeren() {
    this.gen++; this.key = ''; this.bereit = this.fertig = false;
    for (const i of this.inst) this.drop(i);
    for (const f of this.files) lassen(f);
    this.inst = []; this.files = [];
  }
  /** sichtbare Netze (für Tests und Vorschauen) */
  get netze() { return this.inst.map(i => i.mesh); }
}
