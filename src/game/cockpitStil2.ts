import * as THREE from 'three';
import { renderer } from '../core/engine';

// =====================================================================================
// Cockpit Stil 2 (Dohle, Kormoran; asset-src/neu/cockpit): Shader und Sonnenschatten.
//  - Die Eckfarben der Cockpit-Datei sind Daten (cp_export.py): R Verdeckung, G Kantenstreifen, B kaltes Licht der Anzeigen und Lichtleisten,
//    A warmes Licht der Bodenleuchten. Das gebackene Licht macht die dunklen Formteile sichtbar, auch im tiefen All.
//  - Sonne: eigene Schattenkarte nur fürs Cockpit (Tiefenbild aus Sonnenrichtung, 2048², etwa 3 mm je Bildpunkt). Fensterrahmen, Pult und Sitz
//    werfen damit scharfe Schatten, die beim Wenden durch die Kabine wandern. Die Karte wird nur neu gezeichnet, wenn sich die Sonne gegenüber
//    dem Schiff bewegt hat. Sie hängt nicht an den Lampen von three: keine neuen Shader-Fassungen für den Rest des Spiels.
//  - Muster nach Materialname: Waben im Sitzstoff, Lochung im Trittrost, Körnung auf Gummi und Formteilen (dreiachsig aus der Lage im Cockpit).
// =====================================================================================
const N = 2048;
export const U2 = {
  schM: { value: new THREE.Matrix4() }, schT: { value: null as THREE.Texture | null }, schAn: { value: 0 },
  knP: { value: [new THREE.Vector3(), new THREE.Vector3()] }, knQ: { value: [new THREE.Vector4(0, 0, 0, 1), new THREE.Vector4(0, 0, 0, 1)] },      // Steuerknüppel links, rechts: Drehpunkt und Drehung
  kalt: { value: new THREE.Vector3(0.42, 0.72, 1.0) }, warm: { value: new THREE.Vector3(1.0, 0.52, 0.16) }, kaltK: { value: 1 }, warmK: { value: 1 },
};
let rt: THREE.WebGLRenderTarget | null = null, proxy: THREE.Object3D | null = null, radius = 3;
const cam = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 10), szene = new THREE.Scene(), mitte = new THREE.Vector3(), letzte = new THREE.Vector3(9, 9, 9);
const tiefMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
const _b = new THREE.Box3(), _s = new THREE.Sphere(), _m = new THREE.Matrix4();

/** Schattenwerfer aus dem Cockpit-Modell bauen (inner: Modell in Cockpit-Koordinaten, ohne die Skalierung des Schiffs) */
export function schattenModell(inner: THREE.Object3D | null) {
  if (proxy) { szene.remove(proxy); proxy = null; }
  U2.schAn.value = 0; letzte.set(9, 9, 9);
  if (!inner) return;
  proxy = inner.clone(true);
  proxy.traverse((o: any) => {
    o.layers.set(0);
    if (o.isMesh) { if (/Glas$|Holo|HUD/.test(String(o.material?.name || ''))) o.visible = false; o.material = tiefMat; o.frustumCulled = false; }
  });
  szene.add(proxy); proxy.updateMatrixWorld(true);
  _b.setFromObject(proxy).getBoundingSphere(_s); mitte.copy(_s.center); radius = _s.radius + 0.05;
}
/** vor dem Zeichnen: Schattenkarte neu, wenn sich die Sonnenrichtung (in Cockpit-Koordinaten) um mehr als etwa 0,2° geändert hat */
export function schattenUpdate(L: THREE.Vector3) {
  if (!proxy) return;
  if (rt && L.dot(letzte) > 0.999994) return;
  if (!rt) {
    const dt = new THREE.DepthTexture(N, N); dt.type = THREE.UnsignedIntType; dt.minFilter = dt.magFilter = THREE.NearestFilter;
    rt = new THREE.WebGLRenderTarget(N, N, { depthTexture: dt, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, generateMipmaps: false });
    U2.schT.value = dt;
  }
  letzte.copy(L);
  cam.left = cam.bottom = -radius; cam.right = cam.top = radius; cam.near = 0.1; cam.far = 2 * radius + 0.2;
  cam.position.copy(mitte).addScaledVector(L, radius + 0.1); cam.up.set(0, Math.abs(L.y) > 0.98 ? 0 : 1, Math.abs(L.y) > 0.98 ? 1 : 0); cam.lookAt(mitte);
  cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
  U2.schM.value.multiplyMatrices(cam.projectionMatrix, _m.copy(cam.matrixWorld).invert());
  const vor = renderer.getRenderTarget(), ac = renderer.autoClear, sm = renderer.shadowMap.autoUpdate;
  renderer.shadowMap.autoUpdate = false; renderer.autoClear = true;
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(szene, cam);
  renderer.setRenderTarget(vor); renderer.autoClear = ac; renderer.shadowMap.autoUpdate = sm;
  U2.schAn.value = 1;
}

/** Muster je Material: 0 glatt, 1 Wabenstoff, 2 Lochrost, 3 Gummi, 4 Formteil (feine Körnung) */
export function musterVon(name: string): number {
  return /^Stoff/.test(name) ? 1 : /^Bodenrost/.test(name) ? 2 : /^Gummi/.test(name) ? 3 : /^Formteil|^Verkleidung|^Rahmen/.test(name) ? 4 : 0;
}
export interface Gemeinsam { fill: { value: number }; ldir: { value: THREE.Vector3 }; inv: { value: THREE.Matrix4 }; abrieb: { value: number }; ao: { value: number } }

export function shaderHaken2(m: THREE.MeshStandardMaterial, muster: number, abrieb: number, U: Gemeinsam) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { cpFill: U.fill, cpL: U.ldir, cpInv: U.inv, cpWearK: U.abrieb, cpAoK: U.ao, cpWear: { value: abrieb }, cpMuster: { value: muster },
      cpSchM: U2.schM, cpSchT: U2.schT, cpSchAn: U2.schAn, cpKalt: U2.kalt, cpWarm: U2.warm, cpKaltK: U2.kaltK, cpWarmK: U2.warmK, cpKnP: U2.knP, cpKnQ: U2.knQ });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 color;\nuniform mat4 cpInv;\nuniform vec3 cpKnP[2];\nuniform vec4 cpKnQ[2];\nvarying vec4 vCp;\nvarying vec3 vCpPos;\nvarying vec3 vCpN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vCp = color; { mat4 cpM = cpInv * modelMatrix; vec3 pl = (cpM * vec4(transformed, 1.0)).xyz; vec3 nl = normalize(mat3(cpM) * objectNormal);
  // Steuerknüppel: Flächen mit G um 0,3/0,4 (links) oder 0,6/0,7 (rechts) drehen sich um ihren Fußpunkt (cp_export.py)
  float kg = color.g; int ki = (kg > 0.25 && kg < 0.45) ? 0 : ((kg > 0.55 && kg < 0.75) ? 1 : -1);
  if (ki >= 0) { vec4 q = cpKnQ[ki]; vec3 d = pl - cpKnP[ki]; d += 2.0 * cross(q.xyz, cross(q.xyz, d) + q.w * d); pl = cpKnP[ki] + d; nl += 2.0 * cross(q.xyz, cross(q.xyz, nl) + q.w * nl); transformed = (inverse(cpM) * vec4(pl, 1.0)).xyz; }
  vCpPos = pl; vCpN = nl; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec4 vCp; varying vec3 vCpPos; varying vec3 vCpN;
uniform float cpFill, cpWear, cpWearK, cpAoK, cpMuster, cpSchAn, cpKaltK, cpWarmK; uniform vec3 cpL, cpKalt, cpWarm; uniform mat4 cpSchM; uniform sampler2D cpSchT;
float cpH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float cpN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cpH(i), cpH(i + vec3(1, 0, 0)), f.x), mix(cpH(i + vec3(0, 1, 0)), cpH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(cpH(i + vec3(0, 0, 1)), cpH(i + vec3(1, 0, 1)), f.x), mix(cpH(i + vec3(0, 1, 1)), cpH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
vec2 cpTri(vec3 p, vec3 n) { vec3 a = abs(n); return a.x > a.y && a.x > a.z ? p.zy : (a.y > a.z ? p.xz : p.xy); }
float cpHex(vec2 p) { const vec2 s = vec2(1.0, 1.7320508); vec2 a = mod(p, s) - s * 0.5, b = mod(p - s * 0.5, s) - s * 0.5; vec2 g = abs(dot(a, a) < dot(b, b) ? a : b); return max(dot(g, s * 0.5), g.x); }
float cpSchatten(vec3 p, vec3 n) {
  if (cpSchAn < 0.5) return 1.0;
  vec4 sc = cpSchM * vec4(p + n * 0.007, 1.0); vec3 q = sc.xyz * 0.5 + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += step(q.z - 0.0016, texture2D(cpSchT, q.xy + vec2(float(i), float(j)) * (1.3 / ${N}.0)).r);
  return s / 9.0;
}
float cpAO, cpEdge, cpWk, cpRau, cpLoch;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  { float n1 = cpN(vCpPos * 160.0), n2 = cpN(vCpPos * 18.0), n3 = cpN(vCpPos * 520.0);
    cpAO = mix(1.0, clamp(vCp.r * 1.35, 0.0, 1.0), cpAoK); cpRau = 0.0; cpLoch = 0.0;
    cpEdge = (vCp.g > 0.9 || abs(vCp.g - 0.4) < 0.04 || abs(vCp.g - 0.7) < 0.04) ? 1.0 : 0.0;      // 0,3 bis 0,7 kennzeichnet die Steuerknüppel
    vec2 uv = cpTri(vCpPos, vCpN);
    if (cpMuster > 0.5 && cpMuster < 1.5) {        // Wabenstoff
      float h = cpHex(uv * 62.0), rand = smoothstep(0.38, 0.5, h);
      diffuseColor.rgb *= mix(1.25, 0.4, rand) * (0.85 + 0.3 * n3); cpRau = 0.1 * rand;
    } else if (cpMuster < 2.5 && cpMuster > 1.5) { // Lochrost
      vec2 f = fract(uv * 46.0) - 0.5; cpLoch = 1.0 - smoothstep(0.24, 0.31, length(f));
      diffuseColor.rgb *= mix(1.0, 0.08, cpLoch) * (0.9 + 0.2 * n1);
    } else if (cpMuster < 3.5 && cpMuster > 2.5) { // Gummi: Narbung
      diffuseColor.rgb *= 0.8 + 0.5 * n3; cpRau = 0.08 * n3;
    } else if (cpMuster > 3.5) {                   // Formteil: feine Körnung, weiche Wolken
      diffuseColor.rgb *= (0.86 + 0.22 * n3) * (0.9 + 0.2 * n2); cpRau = (n3 - 0.5) * 0.12 + (n2 - 0.5) * 0.1;
    }
    cpWk = smoothstep(0.78, 1.0, cpEdge * 0.9 + (n3 - 0.5) * 0.45 + (n1 - 0.5) * 0.3) * cpWear * cpWearK * 0.1;      // nur wenig Abrieb: die Kanten leben vom Licht
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 2.6 + 0.03, cpWk * 0.5);
    diffuseColor.rgb *= 1.0 + 0.3 * cpEdge * cpWear;
    diffuseColor.rgb *= 1.0 - 0.35 * (1.0 - cpAO) * (0.5 + 0.5 * n2); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor + cpRau - cpWk * 0.2 - cpEdge * 0.06 + (1.0 - cpAO) * 0.15, 0.08, 1.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, 0.9, cpWk * 0.6);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float kl = vCp.b * vCp.b * cpKaltK * 5.0, wl = vCp.a * vCp.a * cpWarmK * 4.0;      // gebackenes Licht (Wurzel gespeichert)
    kl = kl / (1.0 + 0.7 * kl); wl = wl / (1.0 + 0.7 * wl);      // nah an den Leuchten nicht ausbrennen
    vec3 bak = cpKalt * kl + cpWarm * wl;
    float kante = 1.0 + 1.2 * cpEdge;      // Fasen fangen das Licht: helle Kanten wie an echten Formteilen
    totalEmissiveRadiance += (diffuseColor.rgb * 7.0 + vec3(0.03) * (1.0 - roughnessFactor)) * bak * kante * (1.0 - cpLoch);
    totalEmissiveRadiance += diffuseColor.rgb * cpFill * (0.15 + 0.85 * cpAO) * (0.3 + 0.9 * max(0.0, dot(normal, cpL))); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
  { float a = mix(1.0, cpAO, 0.9), lit = cpSchatten(vCpPos, vCpN) * mix(1.0, cpAO, 0.4);
    reflectedLight.indirectDiffuse *= a; reflectedLight.indirectSpecular *= a * a;
    reflectedLight.directDiffuse *= lit; reflectedLight.directSpecular *= lit; }`);
  };
  m.customProgramCacheKey = () => 'cockpitS2d';
}
// Pilot in der Kabine: eigene Fassung der Figurmaterialien. Die Sonne erreicht die Figur nur, wo die Schattenkarte es erlaubt, das Umgebungslicht
// ist gedämpft (die Kabine ist dunkel), dazu etwas vom kalten Licht der Anzeigen. Sonst leuchteten die Hände hell aus dem dunklen Cockpit.
const PILOT_MAT = new WeakMap<THREE.Material, THREE.Material>();
export function pilotMaterial(m: THREE.Material, inv: { value: THREE.Matrix4 }): THREE.Material {
  if (m.userData?.cpPilot) return m;
  const da = PILOT_MAT.get(m); if (da) return da;
  const k = m.clone(), alt = m.onBeforeCompile, altKey = m.customProgramCacheKey; k.userData = { ...m.userData, cpPilot: true };
  k.onBeforeCompile = (sh, r) => {
    alt.call(k, sh, r);
    Object.assign(sh.uniforms, { cpInv: inv, cpSchM: U2.schM, cpSchT: U2.schT, cpSchAn: U2.schAn, cpKalt: U2.kalt, cpKaltK: U2.kaltK });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 cpInv;\nvarying vec3 vCpPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCpPos = (cpInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vCpPos; uniform float cpSchAn, cpKaltK; uniform vec3 cpKalt; uniform mat4 cpSchM; uniform sampler2D cpSchT;
float cpSchattenP(vec3 p) {
  if (cpSchAn < 0.5) return 1.0;
  vec4 sc = cpSchM * vec4(p, 1.0); vec3 q = sc.xyz * 0.5 + 0.5;
  if (q.x < 0.0 || q.x > 1.0 || q.y < 0.0 || q.y > 1.0 || q.z > 1.0) return 1.0;
  float s = 0.0;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) s += step(q.z - 0.004, texture2D(cpSchT, q.xy + vec2(float(i), float(j)) * (1.6 / ${N}.0)).r);
  return s / 9.0;
}`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * cpKalt * (0.22 * cpKaltK);')
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n  { float lit = cpSchattenP(vCpPos); reflectedLight.directDiffuse *= lit; reflectedLight.directSpecular *= lit; reflectedLight.indirectDiffuse *= 0.28; reflectedLight.indirectSpecular *= 0.28; }');
  };
  k.customProgramCacheKey = () => altKey.call(m) + '|cpPilot1';
  PILOT_MAT.set(m, k); return k;
}
/** für Prüfungen: Schattenkarte, ihre Szene und Kamera */
export const SCHATTEN_PRUEF = { get rt() { return rt; }, szene, cam, get proxy() { return proxy; } };
