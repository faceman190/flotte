import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MANIFEST } from '../core/assets';

// =====================================================================================
// Altbau-Baukasten der Minen aus den Megascans „Old Mine“ (docs/minen-altbau.md).
// Sieben Dateien im Paket „lazy“ (asset-src/glb/lazy/MineAlt_*.glb, gebaut in asset-src/neu/mine/megascans, Texturen schon in 2K/4K eingebettet):
//  Gang     gang_a, gang_b               Türstock-Stollenstücke aus Holz (gang_a 3,2 × 3,2 m, 2,37 m hoch)
//  Boegen   bogen_a … bogen_d            Stahlbögen für Hallen (Spannweite ~5,9 m)
//  Ausbau   stempel_1…4, stempel_kurz, kappe, holz_1…3, stahlstempel_1…3, tuerstock
//  Loren    lore_kohle, lore_leer, wagen_holz, lore_saecke, wagen_leer, radsatz
//  Boden    gleisbett, bohlenboden, verladung, gleis_a/b, rampe, geroell_a/b, kohlegrus
//  Kram     faeustel, spaten, spitzhacke, schaufel, helm, lampe, nagel_a/b, keil_1/2, eisenkeil, brett, erz
//  Flaechen flaeche_<id> (kachelbare Felsflächen, 2 × 2 m) und decal_<id>
// Geladen wird erst, wenn man sich einem Stolleneingang nähert (preloadMineAlt). Solange etwas fehlt, baut dungeon.ts die Mine wie bisher.
// Abschalten zum Vergleichen: ?altbau=0
// Achsen wie Mine_Kit: Gänge entlang X, Ursprung Mitte am Boden.
// =====================================================================================

const FILES = ['Gang', 'Boegen', 'Ausbau', 'Loren', 'Boden', 'Kram', 'Flaechen'];
const PARTS = new Map<string, THREE.Object3D>();
let state: 'idle' | 'loading' | 'ready' | 'failed' = 'idle', done = 0;
const OFF = typeof location !== 'undefined' && new URLSearchParams(location.search).get('altbau') === '0';

export function preloadMineAlt() {
  if (state !== 'idle' || OFF) return;
  const urls = FILES.map(f => MANIFEST?.files['lazy/MineAlt_' + f]?.url);
  if (urls.some(u => !u)) { state = 'failed'; return; }
  state = 'loading';
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  urls.forEach(u => loader.loadAsync(u!).then(gl => {
    gl.scene.updateMatrixWorld(true);
    for (const c of [...gl.scene.children]) {
      c.traverse((o: any) => {
        if (!o.isMesh) return;
        const m = o.material as THREE.MeshStandardMaterial;
        m.envMapIntensity = 0.25;
        if (m.normalMap) m.normalScale.set(1, 1);
        if (m.transparent) { m.alphaTest = 0.35; m.transparent = false; m.depthWrite = true; }
      });
      PARTS.set(c.name, c);
    }
    if (++done === FILES.length) state = 'ready';
  }).catch(err => { console.warn('Altbau der Minen fehlt:', err); state = 'failed'; }));
}
export const mineAltReady = () => state === 'ready';
export const mineAltLoading = () => state === 'loading';
export const mineAltProgress = () => done / FILES.length;

// Ein Modul mit seiner Knoten-Transformation (die Pipeline packt Punkte quantisiert, Größe und Lage stecken im Knoten)
export function altPart(name: string): THREE.Object3D | null { return PARTS.get(name) || null; }
export function altBox(name: string) {
  const p = PARTS.get(name); if (!p) return null;
  return new THREE.Box3().setFromObject(p);
}
// Material einer Felsfläche (für Boden, Wände und Decke der gegrabenen Gänge)
export function altSurface(id: string): THREE.MeshStandardMaterial | null {
  let m: THREE.MeshStandardMaterial | null = null;
  PARTS.get('flaeche_' + id)?.traverse((o: any) => { if (!m && o.isMesh) m = o.material; });
  return m;
}
