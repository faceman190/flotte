import * as THREE from 'three';
import { scene, camera, renderer, warm } from '../core/engine';
import { world } from './world';
import { G, P } from './state';
import { hasDeck, loadDeck, buildDeck, type Deck } from './deck';
import { navTarget } from './schnellflug';

// =====================================================================================
// Vorbereiten beim Anflug (seit 2026-11-18): Das erste Andocken an einer Station mit Deck (Eisenkrone) dauerte 7 s hinter der Blende,
// vor allem wegen der Shader der Deck-Materialien und der Strahler, die beim Andocken dazukommen. Fliegt man auf so eine Station zu
// (unter 7 km), erledigt das Spiel die Arbeit vorher in kleinen Schritten, höchstens ein paar Millisekunden je Bild:
//   1. Deck laden und einmal aufbauen (ohne es in die Szene zu setzen)
//   2. Raumspiegelungen aufnehmen, eine je Schritt
//   3. Bilder und Formen hochladen, in kleinen Portionen
//   4. Shader übersetzen, Teil für Teil, gegen eine Licht-Kopie der Szene mit den Strahlern des Decks: So entstehen genau die Fassungen,
//      die nach dem Andocken gebraucht werden (Shader hängen an Zahl und Art der Lichter, nicht an den Lichtern selbst).
// Die Bastion erledigt der Start (deck.ts, primeStationEarly). Shader, Spiegelungen und Hochgeladenes bleiben für die Sitzung.
// =====================================================================================
const BUDGET = 4;      // ms je Bild
const RANGE = 7000;    // m
const done = new Set<string>();
export const markPrimed = (id: string) => { done.add(id); };
let job: { id: string; steps: (() => boolean)[]; i: number } | null = null;
let UP_RT: THREE.WebGLRenderTarget | null = null, UP_MAT: THREE.MeshBasicMaterial | null = null;

// Licht-Kopie: gleiche Zahl und Art der Lichter wie die Szene plus die Lichter des Decks, gleiche Schatten, Nebel und Umgebung
function lightProxy(extra: THREE.Object3D) {
  const sc = new THREE.Scene(); sc.fog = scene.fog; sc.environment = scene.environment;
  const copy = (l: any) => {
    const c: any = l.isSpotLight ? new THREE.SpotLight() : l.isPointLight ? new THREE.PointLight() : l.isDirectionalLight ? new THREE.DirectionalLight()
      : l.isHemisphereLight ? new THREE.HemisphereLight() : l.isAmbientLight ? new THREE.AmbientLight() : null;
    if (!c) return;
    c.castShadow = !!l.castShadow; if (l.map) c.map = l.map;
    sc.add(c);
  };
  scene.traverseVisible((o: any) => { if (o.isLight) copy(o); });
  extra.traverse((o: any) => { if (o.isLight) copy(o); });
  return sc;
}

function makeJob(id: string) {
  let d: Deck | null = null, ready = false, proxy: THREE.Scene | null = null;
  const texs: THREE.Texture[] = [], geos: THREE.BufferGeometry[] = [], parts: THREE.Object3D[] = [];
  loadDeck(id).then(ok => { ready = !!ok; if (!ok) done.add(id); }, () => done.add(id));
  const steps: (() => boolean)[] = [
    () => !ready,                                                         // warten, bis das Deck geladen ist (true = noch nicht fertig)
    () => {
      d = buildDeck(id, -50); if (!d) { done.add(id); return false; }
      const T = new Set<THREE.Texture>(), Gs = new Set<THREE.BufferGeometry>();
      d.group.traverse((o: any) => {
        if (!o.isMesh) return;
        if (o.geometry) Gs.add(o.geometry);
        for (const m of (Array.isArray(o.material) ? o.material : [o.material]) as any[]) {
          if (!m) continue;
          for (const v of Object.values(m)) if ((v as any)?.isTexture && !(v as any).isRenderTargetTexture) T.add(v as THREE.Texture);
          if (m.uniforms) for (const u of Object.values(m.uniforms) as any[]) if (u?.value?.isTexture && !u.value.isRenderTargetTexture) T.add(u.value);
        }
      });
      texs.push(...T); geos.push(...Gs);
      for (const c of d.group.children) if (!(c as any).isLight) parts.push(c);
      return false;
    },
    () => !!d && d.primeStep(),                                            // Raumspiegelungen: true, solange noch eine fehlt
    () => { const t = texs.pop(); if (t) renderer.initTexture(t); return texs.length > 0; },
    () => {
      if (!geos.length) return false;
      UP_RT = UP_RT || new THREE.WebGLRenderTarget(4, 4); UP_MAT = UP_MAT || new THREE.MeshBasicMaterial();
      const sc = new THREE.Scene();
      for (const g of geos.splice(0, 24)) { const m = new THREE.Mesh(g, UP_MAT); m.frustumCulled = false; sc.add(m); }
      const rt0 = renderer.getRenderTarget(); renderer.setRenderTarget(UP_RT); renderer.render(sc, camera); renderer.setRenderTarget(rt0);
      return geos.length > 0;
    },
    () => {
      if (!d) return false;
      proxy = proxy || lightProxy(d.group);
      const p = parts.pop(); if (p && !(p as any).isLight) renderer.compile(p, camera, proxy);
      return parts.length > 0;
    },
  ];
  return { id, steps, i: 0 };
}

// je Bild im Flug (main.ts): nächste Station mit Deck in Reichweite vorbereiten
export function updateApproachPrime() {
  if (G.mode !== 'play' || warm.hold || world.surface) { if (G.mode !== 'play') job = null; return; }
  if (!job) {
    // Navigationsziel (Kurzsprung, seit Alpha 1.50) gleich vorbereiten, egal wie weit: Der Kurzsprung ist in wenigen Sekunden da
    const nt = navTarget(), ns = nt && nt.kind === 'st' ? world.stations.find(s => s.id === nt.id && hasDeck(s.id) && !done.has(s.id)) : undefined;
    const st = ns || world.stations.find(s => hasDeck(s.id) && !done.has(s.id) && Math.hypot(s.x - P.x, s.y - P.y, s.z - P.z) < RANGE);
    if (!st) return;
    job = makeJob(st.id);
  }
  const t0 = performance.now();
  while (job && performance.now() - t0 < BUDGET) {
    const step = job.steps[job.i];
    if (!step) { done.add(job.id); job = null; break; }
    const more = step();
    if (!more) job.i++;
    if (job && job.i === 0 && more) break;                                  // noch am Laden: nicht im Kreis drehen
  }
}
