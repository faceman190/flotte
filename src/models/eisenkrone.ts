import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { glowMat } from '../core/engine';
import { texMat, boxUV } from '../core/textures';
import { collisionSpheres } from './stationModels';
import type { StructureModel } from './structures';

// =====================================================================================
// Gildehütte Eisenkrone: die Raffinerie-Station im Sektor Heimstatt (seit Alpha 1.22).
// Modell aus Blender (asset-src/neu/raffinerie: ek_aussen.py baut, ek_export.py gibt aus) in echten Metern, 690 m lang:
//   base/Eisenkrone (Objekte koerper und schlacke) und data/eisenkrone (Leuchtpunkte, Start- und Andockpunkt).
// Das Modell trägt keine Bilder. Je Eckpunkt steht Farbe × Verdeckung (w = Wurzel), bei Leuchten die Strahldichte (w = Wurzel(x / (1 + x))).
// Die Art einer Fläche steht im Materialnamen: ext_ek_hull (Rumpf), _paint (Lack), _warn (Warnschraffur), _glow (Leuchten, Glut,
// Radiatoren), _feld (Kraftfeld im Hangartor). Beleuchtet wird die Station von der Sonne des Sektors wie jedes andere Modell.
// Das Tor zeigt im Modell nach +X; die Kollision besteht aus Rasterkugeln über den Körper, der Hangarblock und die Anflugschneise sind von Hand gesetzt.
// =====================================================================================

interface EkData { lichter: [string, number, number, number][]; start: number[]; andock: number[]; R: number }
let TPL: THREE.Group | null = null, DATA: EkData | null = null, loading: Promise<boolean> | null = null;
export const eisenkroneReady = () => !!(TPL && DATA);
export function loadEisenkrone(): Promise<boolean> {
  if (eisenkroneReady()) return Promise.resolve(true);
  if (loading) return loading;
  const W = window as any, dj = W.DATAFILES?.eisenkrone as string | undefined, mu = W.BASEDATA?.Eisenkrone as string | undefined;
  if (!dj || !mu) return Promise.resolve(false);
  return (loading = (async () => {
    try {
      const [data, gltf] = await Promise.all([fetch(dj).then(r => { if (!r.ok) throw new Error('Daten: ' + r.status); return r.json(); }), new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(mu)]);
      const M = materials();
      gltf.scene.traverse((o: any) => {
        if (!o.isMesh) return;
        const cls = String(o.material?.name || '').replace(/^ext_ek_/, '');
        o.material = M[cls] || M.hull;
        if (cls === 'feld' || cls === 'glow') o.renderOrder = cls === 'feld' ? 2 : 0;
      });
      boxUV(gltf.scene, 1 / 26);      // Rumpfplatten: eine Kachel je 26 m
      DATA = data; TPL = gltf.scene;
      return true;
    } catch (e) { console.warn('Eisenkrone nicht geladen:', e); loading = null; return false; }
  })());
}

export const ekTune = { hull: 3.0, glow: 1.0, cap: 1.7 };      // zum Einstellen im Testfenster
let MATS: Record<string, THREE.Material> | null = null;
function materials() {
  if (MATS) return MATS;
  const uGain = { value: ekTune.hull }, uGlow = { value: ekTune.glow }, uCap = { value: ekTune.cap };
  (ekTune as any).u = { uGain, uGlow, uCap };
  // beleuchtete Flächen: Bild des Rumpfs × Eckpunktfarbe (Farbe × Verdeckung)
  const lit = (tex: string, metal: number, rough: number, warn = false) => {
    const m = texMat(0xffffff, tex, { metalness: metal, roughness: rough, vertexColors: true, flatShading: false });
    m.envMapIntensity = 0.8;
    m.onBeforeCompile = sh => {
      sh.uniforms.ekGain = uGain;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEkP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvEkP = position;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float ekGain;\nvarying vec3 vEkP;')
        .replace('#include <color_fragment>', 'vec3 ekc = vColor.rgb * vColor.rgb * ekGain;\n'
          + (warn ? 'ekc = mix(ekc * vec3(1.5, 0.66, 0.06), ekc * 0.03, step(0.5, fract((vEkP.x + vEkP.y + vEkP.z) * 0.16)));\n' : '') + 'diffuseColor.rgb *= ekc;');
    };
    m.customProgramCacheKey = () => 'ek_' + tex + (warn ? 'w' : '');
    return m;
  };
  // Leuchten: Strahldichte aus der Eckpunktfarbe, im Farbton gedeckelt (sonst überstrahlt das Nachleuchten alles)
  const glow = () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true });
    m.onBeforeCompile = sh => {
      sh.uniforms.ekGlow = uGlow; sh.uniforms.ekCap = uCap;
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float ekGlow;\nuniform float ekCap;')
        .replace('#include <color_fragment>', 'vec3 ekc = vColor.rgb * vColor.rgb; ekc = ekc / max(vec3(0.02), 1.0 - ekc); ekc *= min(1.0, ekCap / max(0.001, max(ekc.r, max(ekc.g, ekc.b)))); diffuseColor.rgb = ekc * ekGlow;');
    };
    m.customProgramCacheKey = () => 'ek_glow';
    return m;
  };
  const feld = new THREE.MeshBasicMaterial({ color: 0x3f8cff, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  return (MATS = { hull: lit('hull_mil', 0.45, 0.62), paint: lit('hull_light', 0.2, 0.6), warn: lit('hull_light', 0.2, 0.6, true), glow: glow(), feld });
}

const LICHT: Record<string, [number, number, boolean]> = { lauf: [0xffa030, 7, true], rot: [0xff3030, 11, false], gruen: [0x30ff70, 11, false], weiss: [0xffffff, 10, false] };
export function buildEisenkrone(): (StructureModel & { schlacke: THREE.Object3D | null }) | null {
  if (!TPL || !DATA) return null;
  const g = new THREE.Group(), body = TPL.clone(true), lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  body.traverse((o: any) => { if (o.isMesh) o.userData.shared = true; });      // Geometrie und Materialien gehören der Vorlage
  g.add(body);
  const [sx, sy, sz, syaw] = DATA.start, [ax, ay, az] = DATA.andock;
  // Kollision: Rasterkugeln über den Körper (ohne Schlackefahne). Am Hangarblock und in der Anflugschneise davor liegen sie von Hand,
  // damit das Tor frei bleibt: Der Block reicht von x = 222 bis 384, das Tor liegt bei x = 384.
  const koerper = body.getObjectByName('koerper') || body, schlacke = body.getObjectByName('schlacke') || null;
  const sph = collisionSpheres(koerper, 44).filter(([x, y, z, r]) => !(x + r > 214 && Math.abs(y) < 36 && Math.abs(z) < 104) && !(x > 380 && Math.abs(z) < 62));
  for (const x of [252, 300, 349]) for (const z of [-60, 0, 60]) sph.push([x, 0, z, 34]);
  for (const [k, x, y, z] of DATA.lichter) {
    const [col, size, run] = LICHT[k] || LICHT.weiss, sp = new THREE.Sprite(glowMat(col, 1));
    sp.position.set(x, y, z); sp.scale.setScalar(size); g.add(sp); (run ? lights : navs).push(sp);
  }
  return { g, lights, navs, sph, R: DATA.R, schlacke, dock: { x: ax, y: ay, z: az }, launch: { x: sx, y: sy, z: sz, yaw: syaw } };
}
