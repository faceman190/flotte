import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { MANIFEST } from '../core/assets';
import { SHIP_SLOTS, SHIP_SLOT_N, RARITY, gearDef, type ShipSlot } from '../data/gear';
import { P } from './state';
import { coopSend, onCoop, coopNet } from './coop';

// =====================================================================================
// Modulplätze im Technikraum (seit 2026-11-26, Harpyie). Nutzer: „wir haben ja Module für Schiffe. Wenn man diese zum Beispiel im Technikraum
// einsetzen könnte, dazu bräuchte man im Technikraum Plätze, die Sinn ergeben, wo man diese Items dann auch sieht, wenn die eingebaut sind.“
//  - Jeder der fünf Modulplätze des Schiffs (gear.ts SHIP_SLOTS) hat im Schiffsmodell einen festen Ort (asset-src/neu/innen/modulplatz.py).
//  - Das eingebaute Modul steht dort als eigenes Modell: alle 32 Schiffsmodule in lazy/Schiffsmodule (asset-src/neu/module/mod_kit.py), ein Netz
//    je Kennung, Ursprung im Anker des Platzes, Vorderseite nach +z.
//  - Das Namensfeld am Platz zeigt Name und Seltenheit als Schrift und ein Statuslicht (Petrol = eingebaut, Bernstein = frei). Die Seltenheit
//    steht nur in der Schrift, das Modul leuchtet nicht in ihrer Farbe.
//  - Umbauen: am Platz [E] (interior.ts shipInter mod_*) öffnet die Ausrüstung mit den passenden Modulen; nur gelandet oder angedockt.
// Anker in Schiffskoordinaten (Nase −z) aus har-gelenke.json (module): p Ursprung, gier Drehung um die Hochachse, schild Mitte des Namensfelds.
// =====================================================================================
interface Platz { p: number[]; gier: number; schild: number[]; sw: number; sh: number }
export const PLATZ: Partial<Record<string, Record<ShipSlot, Platz>>> = {
  Harpyie: {
    system1: { p: [-1.1, -2.361, -11.149], gier: 0, schild: [-0.98, -1.531, -10.696], sw: 0.7, sh: 0.15 },
    system2: { p: [1.1, -2.361, -11.149], gier: 0, schild: [1.22, -1.531, -10.696], sw: 0.7, sh: 0.15 },
    abwehr: { p: [-2.2, -2.781, -10.309], gier: 0, schild: [-2.2, -2.931, -9.766], sw: 0.56, sh: 0.15 },
    antrieb: { p: [2.15, -2.921, -10.629], gier: 0, schild: [2.15, -3.001, -10.186], sw: 0.62, sh: 0.12 },
    waffe: { p: [1.6, -2.581, -7.209], gier: -3.1416, schild: [1.48, -1.491, -7.692], sw: 0.76, sh: 0.15 },
  },
};
export const hatModulPlatz = (model: string) => !!PLATZ[model];
type Gear = Partial<Record<ShipSlot, string>>;
let TPL: Record<string, THREE.Object3D> | null = null, loading = false;
let akt: { g: THREE.Group; model: string; k: number; stand: string; eigen: boolean; gast: number; gear: Gear; tex: THREE.Texture[] } | null = null;
function laden() {
  if (TPL || loading) return;
  const url = MANIFEST?.files['lazy/Schiffsmodule']?.url; if (!url) return;
  loading = true;
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then(g => {
    const t: Record<string, THREE.Object3D> = {};
    g.scene.traverse((o: any) => { o.userData.shared = true; if (o.isMesh) { o.userData.sh = false; if (o.material) o.material.envMapIntensity = 0.6; } });
    // je Modul ein Knoten mit dem Namen der Kennung; mehrere Materialien = eine Gruppe aus Teilnetzen (alle gehören dazu)
    // Der Knoten behält Lage und Maßstab (damit entpackt die Kompression die Punkte); er kommt in eine eigene Gruppe, die an den Platz gestellt wird
    for (const o of [...g.scene.children]) { const w = new THREE.Group(); w.userData.shared = true; w.add(o); t[o.name.replace(/[._]?d{3}$/, '')] = w; }
    TPL = t; if (akt) akt.stand = '';
  }).catch(e => { console.warn('Schiffsmodule nicht geladen', e); }).finally(() => { loading = false; });
}
// Namensfeld: dunkles Feld, Statuslicht oben, Name, Seltenheit klein darunter
function schildTextur(slot: ShipSlot, id: string | undefined, pl: Platz) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.max(64, Math.round(512 * pl.sh / pl.sw));
  const x = c.getContext('2d')!, d = gearDef(id || ''), H = c.height;
  x.fillStyle = '#0b0d10'; x.fillRect(0, 0, 512, H);
  x.fillStyle = d ? '#59e0d6' : '#f0a45a'; x.fillRect(10, 8, 492, Math.round(H * 0.1));
  x.textAlign = 'center'; x.textBaseline = 'middle';
  const name = (d ? d.n : 'FREI').toUpperCase(); let px = Math.round(H * 0.42);
  x.font = `600 ${px}px Rajdhani, "IBM Plex Sans", sans-serif`;
  while (px > 14 && x.measureText(name).width > 480) { px -= 2; x.font = `600 ${px}px Rajdhani, "IBM Plex Sans", sans-serif`; }
  x.fillStyle = d ? '#dfe6ea' : '#f0a45a'; x.fillText(name, 256, H * (d ? 0.5 : 0.58));
  if (d) { x.font = `500 ${Math.round(H * 0.2)}px Rajdhani, "IBM Plex Sans", sans-serif`; x.fillStyle = '#93a0a8'; x.fillText(`${SHIP_SLOT_N[slot].toUpperCase()}  ·  ${RARITY[d.rar].n.toUpperCase()}`, 256, H * 0.84); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function bauen() {
  if (!akt) return;
  const pm = PLATZ[akt.model]; if (!pm) return;
  for (const t of akt.tex) t.dispose(); akt.tex = [];
  for (const c of [...akt.g.children]) { akt.g.remove(c); if ((c as any).isMesh && !c.userData.shared) (c as THREE.Mesh).geometry.dispose(); }
  const k = akt.k;
  for (const slot of SHIP_SLOTS) {
    const pl = pm[slot], id = akt.gear[slot]; if (!pl) continue;
    const src = id && TPL ? TPL[id] : null;
    if (src) { const m = src.clone(); m.position.set(pl.p[0] * k, pl.p[1] * k, pl.p[2] * k); m.rotation.y = pl.gier; m.scale.setScalar(k); akt.g.add(m); }
    const tex = schildTextur(slot, id, pl); akt.tex.push(tex);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(pl.sw * k, pl.sh * k), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    s.position.set(pl.schild[0] * k, pl.schild[1] * k, pl.schild[2] * k); s.rotation.y = pl.gier; s.userData.sh = false; akt.g.add(s);
  }
  akt.stand = JSON.stringify(akt.gear) + (TPL ? '1' : '0');
}
/** beim Betreten eines Schiffs (interior.ts): Module und Namensfelder an die Plätze. gear: Module des Schiffs; gast: Kennung des Besitzers,
 *  dessen Module erst erfragt werden; eigen: aktives Schiff (folgt P.shipGear) */
export function modulRaum(parent: THREE.Object3D, model: string, k: number, gear: Gear | null, eigen: boolean, gast = 0) {
  modulWeg();
  if (!PLATZ[model]) return;
  laden();
  akt = { g: new THREE.Group(), model, k, stand: '', eigen, gast, gear: { ...(gear || {}) }, tex: [] };
  akt.g.name = 'Modulplätze'; parent.add(akt.g);
  bauen();
  if (gast) coopSend('mq', { s: gast });
}
export function modulWeg() {
  if (!akt) return;
  for (const t of akt.tex) t.dispose();
  for (const c of akt.g.children) if ((c as any).isMesh && !c.userData.shared) { (c as THREE.Mesh).geometry.dispose(); ((c as THREE.Mesh).material as THREE.Material).dispose(); }
  akt.g.removeFromParent(); akt = null;
}
/** jedes Bild (main.ts): nach einem Umbau oder wenn die Modelle fertig geladen sind, neu aufbauen */
export function modulBild() {
  if (!akt) return;
  if (akt.eigen) akt.gear = { ...P.shipGear };
  if (JSON.stringify(akt.gear) + (TPL ? '1' : '0') !== akt.stand) bauen();
}
// Mehrspieler: Der Gast fragt die Module des Besitzers ab (mq), der Besitzer antwortet (mg)
onCoop('mq', (m: any) => { if (+m.s === coopNet.id) coopSend('mg', { an: m.from, gear: P.shipGear || {} }); });
onCoop('mg', (m: any) => {
  if (!akt || !akt.gast || m.from !== akt.gast || +m.an !== coopNet.id || !m.gear || typeof m.gear !== 'object') return;
  const g: Gear = {}; for (const s of SHIP_SLOTS) if (typeof m.gear[s] === 'string' && gearDef(m.gear[s])) g[s] = m.gear[s];
  akt.gear = g;
});
