import * as THREE from 'three';
import { Figur, neuesSkelett, type Platz } from './figur';
import { mannyAnim } from './mannyAvatar';
import type { DeckPuppe } from './deck';

// =====================================================================================
// Schaupuppen im Laden (seit 2026-11-26, Ausrüster auf Deck 3 der Bastion). Nutzer: „Baue für die Ausrüstungen Manny Skelette und packe die
// neuen Overalls und Rucksäcke Helme hin.“
// Jede Puppe ist eine Figur auf dem UE5-Skelett (figur.ts) mit den echten Ausrüstungsteilen aus dem Paket des Nutzers; der Körper darunter ist
// der von Figur 1 in mattem Puppengrau, ohne Haare. Sockel und Schild stehen im Deck (asset-src/neu/bastion/pd_kit.py n_pd_puppensockel),
// Plätze und Tracht kommen aus den Deckdaten (deck.puppen).
//  - Haltung: ein Standbild aus der Stehbewegung des Bewegungssatzes (je Puppe ein anderer Zeitpunkt); danach steht das Skelett still.
//  - Licht: Die Strahler des Decks gehen mit dem Piloten mit, von weitem stünden die Puppen im Dunkeln. Ihre Materialien bekommen deshalb ein
//    festes Ladenlicht von oben dazu (wie probeLit in models/kit.ts, hier mit der Richtung der Fläche gewichtet).
//  - Laden: erst, wenn der Pilot dem Laden nahe kommt (die Dateien der Teile zusammen rund 14 MB); beim Verlassen des Innenraums wird alles
//    wieder freigegeben. Gezeichnet nur in Sichtweite und im Blickfeld (eigene Hüllkugel je Netz).
// =====================================================================================

const NAH = 46, FERN = 62;      // laden ab dieser Entfernung zum nächsten Sockel (m); gezeichnet bis zu dieser
const LICHT = { value: new THREE.Color(0.42, 0.45, 0.5) };
const NO_ROOT = new Set(['root']);
const HUELLE = new THREE.Sphere(new THREE.Vector3(0, 0.95, 0), 1.3);

interface Puppe { d: DeckPuppe; holder: THREE.Group; fig: Figur | null; steht: boolean }
let puppen: Puppe[] = [], parent: THREE.Object3D | null = null, laedt = false, gen = 0;
const mats = new Map<THREE.Material, THREE.Material>();

function ladenlicht(src: any): THREE.Material {
  let m = mats.get(src);
  if (m) return m;
  const mm = src.clone() as any, prev = src.onBeforeCompile, pk = src.customProgramCacheKey;
  mm.onBeforeCompile = (s: any, r: any) => {
    prev.call(mm, s, r); s.uniforms.puppeLicht = LICHT;
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 puppeLicht;')
      .replace('#include <lights_fragment_maps>', 'irradiance += puppeLicht * (0.42 + 0.58 * max(0.0, inverseTransformDirection(normal, viewMatrix).y * 0.5 + 0.5));\n#include <lights_fragment_maps>');
  };
  mm.customProgramCacheKey = () => pk.call(src) + '|puppe';
  mm.userData.puppe = true; mm.envMapIntensity = 0.45;
  mats.set(src, mm);
  return mm;
}
function anziehen(p: Puppe) {
  for (const m of p.fig!.netze as any[]) {
    if (!m.material.userData?.puppe) m.material = Array.isArray(m.material) ? m.material.map(ladenlicht) : ladenlicht(m.material);
    m.frustumCulled = true; m.boundingSphere = HUELLE; m.castShadow = false;
  }
}
// Standbild aus der Stehbewegung; ohne Bewegungssatz bleibt die A-Haltung des Skeletts
function stellen(p: Puppe, root: THREE.Object3D, i: number) {
  const clips = mannyAnim()?.clips, name = clips?.names?.find((n: string) => /Stand_Idle_Loop$/.test(n));
  const c = name && clips.clip(name, { skip: NO_ROOT });
  const mx = c ? new THREE.AnimationMixer(root) : null;
  if (mx) { mx.clipAction(c).play(); mx.update(0.4 + i * 1.37); p.steht = true; }
  // erst die Knochen festhalten, dann den Mixer lösen: Beim Lösen setzt er ihre Werte zurück, die festen Matrizen bleiben
  root.traverse((o: any) => { if (o.isBone) { o.updateMatrix(); o.matrixAutoUpdate = false; } });
  if (mx) { mx.stopAllAction(); mx.uncacheRoot(root); }
  // Die Stehhaltung steht schräg (ein Fuß vor, Rumpf gedreht): die Puppe so drehen, dass die Brust zum Gang zeigt
  const h = p.holder, par = h.parent;
  if (!par) return;
  h.rotation.y = 0; h.updateWorldMatrix(true, true);
  const at = (n: string) => { const b = root.getObjectByName(n); return b ? par.worldToLocal(b.getWorldPosition(new THREE.Vector3())) : null; };
  const sl = at('clavicle_l'), sr = at('clavicle_r'), fl = at('foot_l'), fr = at('foot_r'), bl = at('ball_l'), br = at('ball_r');
  if (!sl || !sr || !fl || !fr || !bl || !br) { h.rotation.y = p.d.yaw; return; }
  let vx = -(sr.z - sl.z), vz = sr.x - sl.x;                                   // quer zur Schulterlinie
  if (vx * (bl.x + br.x - fl.x - fr.x) + vz * (bl.z + br.z - fl.z - fr.z) < 0) { vx = -vx; vz = -vz; }      // nach vorn ist, wohin die Fußspitzen zeigen
  h.rotation.y = Math.atan2(p.d.bx, p.d.bz) - Math.atan2(vx, vz);
}
async function laden() {
  if (laedt || !parent) return;
  laedt = true; const g = gen;
  for (let i = 0; i < puppen.length; i++) {
    const p = puppen[i], root = await neuesSkelett();
    if (g !== gen || !root) return;
    root.traverse(o => { o.userData.sh = false; o.userData.shared = true; });
    p.holder.add(root);
    p.fig = new Figur(root);
    p.fig.onChange = () => anziehen(p);
    p.fig.setzen({ figur: 1, teile: p.d.teile as Partial<Record<Platz, string>>, puppe: true });
    // Die Stehhaltung wird mit dem Mixer gesetzt und sofort wieder gelöst: Dafür braucht das Skelett bewegliche Knochen, danach stehen sie fest
    const mx = () => stellen(p, root, i);
    if (mannyAnim()?.clips) mx(); else setTimeout(() => { if (g === gen && !p.steht) mx(); }, 4000);
  }
}

/** Puppen des Decks aufstellen (noch ohne Figuren); g: Gruppe des Innenraums */
export function puppenAufbau(list: DeckPuppe[] | undefined, g: THREE.Object3D) {
  puppenAbbau();
  if (!list || !list.length) return;
  parent = g;
  puppen = list.map(d => {
    const holder = new THREE.Group(); holder.position.set(d.x, d.y, d.z); holder.rotation.y = d.yaw; holder.visible = false; g.add(holder);
    return { d, holder, fig: null, steht: false };
  });
}
/** je Bild: laden, sobald der Pilot nahe ist; zeigen, was in Sichtweite steht. seen: Sichtprüfung des Decks */
export function puppenUpdate(x: number, z: number, aufDeck: boolean, seen: (x: number, z: number) => boolean) {
  if (!puppen.length) return;
  for (const p of puppen) {
    const d = Math.hypot(p.d.x - x, p.d.z - z);
    if (aufDeck && d < NAH && !laedt) void laden();
    p.holder.visible = aufDeck && d < FERN && !!p.fig?.bereit && seen(p.d.x, p.d.z);
  }
}
/** beim Verlassen des Innenraums: Figuren und ihre Dateien freigeben */
export function puppenAbbau() {
  gen++; laedt = false;
  for (const p of puppen) { p.fig?.leeren(); p.holder.removeFromParent(); }
  for (const m of mats.values()) m.dispose();
  mats.clear(); puppen = []; parent = null;
}
export const puppenStand = () => puppen.map(p => ({ titel: p.d.titel, bereit: !!p.fig?.bereit, fertig: !!p.fig?.fertig, steht: p.steht, sichtbar: p.holder.visible, netze: p.fig?.netze.length || 0 }));
export const puppenLicht = LICHT;
