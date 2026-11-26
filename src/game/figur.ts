import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MANIFEST } from '../core/assets';
import { renderer } from '../core/engine';
import { FIGUR_TEILE } from '../data/figurTeile';

// =====================================================================================
// Spielerfiguren mit Ausrüstung (seit 2026-11-24, Paket „Spielcharakter“ des Spielers; docs/spielcharakter.md).
// Alles sitzt auf EINEM Skelett (UE5 Manny, 161 Knochen): Der Körper der gewählten Figur und jedes Ausrüstungsteil sind eigene
// Dateien (Paket „lazy“: Skelett, Koerper1–3, Teil_<id>; scripts/build-figuren.mjs). Sie werden bei Bedarf geladen und über die
// Knochennamen an das Skelett gehängt – so passt jedes Teil auf jede Figur, und Bewegungen laufen ohne Umrechnung.
// Körperflächen unter einem Teil (Hand unter dem Handschuh, Rumpf unter dem Overall) werden ausgeblendet, damit nichts durchstößt.
// Eine Klasse für die eigene Figur im Spiel (mannyAvatar.ts: Skelett des Animators) und für die Vorschauen (figPreview.ts,
// teilPreview.ts: eigenes Skelett aus neuesSkelett()). Netze und Bilder teilen sich alle Figuren (kein zweites Mal im Grafikspeicher).
// =====================================================================================

export type Platz = 'helm' | 'weste' | 'overall' | 'handschuh' | 'stiefel';
export const PLAETZE: Platz[] = ['helm', 'weste', 'overall', 'handschuh', 'stiefel'];
/** Was eine Figur trägt: Nummer der Figur und je Platz die Kennung eines Teils (helm_01, overall_02 …) */
export interface Tracht { figur: number; teile: Partial<Record<Platz, string>>; puppe?: boolean }      // puppe: Schaupuppe im Laden (Körper in Puppengrau, ohne Haare; schaupuppe.ts)
let PUPPE_MAT: THREE.MeshStandardMaterial | null = null;
const puppeMat = () => (PUPPE_MAT ||= Object.assign(new THREE.MeshStandardMaterial({ color: 0x777a7c, roughness: 0.52, metalness: 0 }), { name: 'Schaupuppe', envMapIntensity: 0.3 }));
export const TEIL_PLATZ = FIGUR_TEILE.teile as Record<string, Platz>;
const VERDECKT = FIGUR_TEILE.verdeckt as Partial<Record<Platz, string>>;
const HAND = '^(hand|thumb|index|middle|ring|pinky|wrist)_';

// Die wählbaren Figuren. teile: Dateien des Körpers; weg: je Netz (Name klein) Knochen, deren Flächen immer fehlen.
// Figur 2 ist ein MetaHuman-Kopf: Das Paket liefert dazu keinen Rumpf und keinen Unteranzug (nur Arme und Beine in Haut). Deshalb
// trägt sie den Unteranzug-Körper von Figur 1 ohne dessen Kopf und Hände; vom MetaHuman kommen Kopf, Haare, Bart und die Hände.
interface KoerperTeil { f: string; weg?: Record<string, string> }
export const FIGUREN: { id: number; n: string; d: string; teile: KoerperTeil[] }[] = [
  { id: 1, n: 'Figur 1', d: 'Kurzes dunkles Haar, Dreitagebart', teile: [{ f: 'lazy/Koerper1' }] },
  { id: 2, n: 'Figur 2', d: 'Graues Haar, Schnurrbart', teile: [
    { f: 'lazy/Koerper1', weg: { koerper: '^(head$|neck_02$|' + HAND.slice(1) + ')' } },
    { f: 'lazy/Koerper2', weg: { koerper: '^(?!(hand|thumb|index|middle|ring|pinky|wrist)_)', kopf: '^(?!(head|neck))' } },
  ] },
  { id: 3, n: 'Figur 3', d: 'Kräftig, kurzes Haar, glatt rasiert', teile: [{ f: 'lazy/Koerper3' }] },
];
export const figurDef = (id: number) => FIGUREN.find(f => f.id === id) || FIGUREN[0];
export const normFigur = (id: unknown) => (FIGUREN.some(f => f.id === id) ? id as number : 1);
const teilDatei = (id: string) => 'lazy/Teil_' + id;

// ---------- geladene Dateien: Netze, Material, Knochennamen. Geteilt von allen Figuren, gezählt nach Benutzern ----------
interface Netz { name: string; koerper: boolean; geo: THREE.BufferGeometry; mat: THREE.Material | THREE.Material[]; bones: string[]; inv: THREE.Matrix4[]; masken: Map<string, Uint8Array> }
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
    for (const m of ([] as any[]).concat(o.material)) { prepMat(m); for (const v of Object.values(m)) if ((v as any)?.isTexture) texs.add(v as THREE.Texture); }
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    // Maße in Ruhehaltung: Die Eckpunkte sind beim Packen verdichtet, ihre Umrechnung steckt in den Bindematrizen (Knochen × Bindematrix)
    box.union(o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(o.skeleton.bones[0].matrixWorld, o.skeleton.boneInverses[0])));
    netze.push({ name, koerper: name === 'koerper' || name === 'kopf', geo: o.geometry, mat: o.material, bones: o.skeleton.bones.map((b: THREE.Bone) => b.name), inv: o.skeleton.boneInverses, masken: new Map() });
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
interface Inst { file: string; wk: string; netz: Netz; mesh: THREE.SkinnedMesh; base: Uint32Array | Uint16Array | null; weg: string | null }
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
  constructor(readonly root: THREE.Object3D) {
    root.traverse((o: any) => { if (o.isBone) this.bones[o.name] = o; else if (o.isMesh) o.visible = false; });
  }
  /** Figur und Teile wählen. Fehlendes wird geladen; bis alles da ist, bleibt der alte Stand sichtbar. */
  setzen(t: Tracht) {
    const def = t.figur ? figurDef(t.figur) : { id: 0, teile: [] as KoerperTeil[] };      // 0: kein Körper, nur die Teile (Ansicht im Laden)
    const teile = PLAETZE.map(p => [p, t.teile[p]] as const).filter(x => x[1] && TEIL_PLATZ[x[1]!] === x[0]) as [Platz, string][];
    const pu = !!t.puppe, key = def.id + '|' + teile.map(x => x[1]).join(',') + (pu ? '|p' : '');
    if (key === this.key) return;
    this.key = key; this.fertig = false;
    const gen = ++this.gen;
    const want = [...def.teile.map(k => ({ f: k.f, weg: k.weg || null })), ...teile.map(x => ({ f: teilDatei(x[1]), weg: null as Record<string, string> | null }))].map(w => ({ ...w, wk: JSON.stringify(w.weg) + (pu ? 'P' : '') }));
    const got = want.map(w => holen(w.f));
    Promise.all(got.map(c => c.p)).then(ds => {
      if (gen !== this.gen) { for (const w of want) lassen(w.f); return; }      // inzwischen etwas anderes gewünscht
      // alte Netze ab, neue an (Dateien, die bleiben, behalten ihre Netze)
      const keep = new Set(want.map(w => w.f + w.wk));
      this.inst = this.inst.filter(i => { if (keep.has(i.file + i.wk)) return true; this.drop(i); return false; });
      const have = new Set(this.inst.map(i => i.file));
      want.forEach((w, k) => { const d = ds[k]; if (d && !have.has(w.f)) for (const n of d.netze) this.add(w.f, w.wk, n, w.weg?.[n.name] || null, pu); });
      for (const f of this.files) lassen(f);
      this.files = want.map(w => w.f);
      this.maskieren(new Set(teile.map(x => x[0])));
      this.bereit = def.teile.every(k => this.inst.some(i => i.file === k.f));
      this.fertig = true;
      this.onChange?.();
    });
  }
  private add(file: string, wk: string, n: Netz, weg: string | null, puppe = false) {
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
    const m = new THREE.SkinnedMesh(geo, puppe && n.koerper ? puppeMat() : n.mat);
    m.name = 'fig_' + n.name; m.frustumCulled = false; m.castShadow = true; m.userData.sh = false; m.userData.shared = true;
    // Jedes Netz bringt seine eigenen Bindematrizen mit (beim Packen steckt darin auch die Umrechnung seiner verdichteten Eckpunkte)
    const bones = n.bones.map(b => this.bones[b]);
    if (bones.some(b => !b)) { console.warn('Figur: ' + file + ' passt nicht zum Skelett'); return; }
    this.root.add(m);
    m.bind(new THREE.Skeleton(bones, n.inv.map(x => x.clone())), new THREE.Matrix4());
    this.inst.push({ file, wk, netz: n, mesh: m, base, weg });
  }
  private drop(i: Inst) {
    i.mesh.removeFromParent();
    if (i.base) i.mesh.geometry.dispose();      // nur die eigene Flächenliste; die geteilten Eckpunkte lädt three.js bei Bedarf neu hoch
  }
  // Körperflächen unter getragenen Teilen ausblenden; Haare verschwinden unter einem Helm
  private maskieren(an: Set<Platz>) {
    const zonen = PLAETZE.filter(p => an.has(p) && VERDECKT[p]).map(p => VERDECKT[p]!);
    for (const i of this.inst) {
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
