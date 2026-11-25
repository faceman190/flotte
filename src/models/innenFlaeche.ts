import * as THREE from 'three';
import { l2Noise } from '../core/rauschen';
// Oberflächen der Schiffsinnenräume (25.11.2026, Nutzer: Innenräume von Kormoran und Wisent „auf unser jetziges Niveau bringen,
// keine Details an Wänden und Boden“). Der Export macht aus jedem Blender-Material eine Einheitsfarbe; hier rechnet das Spiel
// die Oberfläche dazu, wie in der Bastion (deck.ts, Lichtraum 2): fleckige Helligkeit und Rauheit, feines Korn, Laufspuren an Wänden,
// Riffelblech auf Böden, Löcher im Gitterrost, Schleifspuren auf Metall. Ohne Abwicklung: das Muster liegt auf den zwei Achsen der
// Fläche (Lage im Modell in Metern), deshalb bleibt es am Schiff fest, auch wenn es sich dreht.
// Welche Materialien: Der Export hängt Innenraum-Materialien eine Kennung an („… ~iw“ Wand, „~ib“ Boden, „~ig“ Gitter, „~im“ Metall;
// asset-src/neu/kormoran/kor_export.py, asset-src/neu/wisent/wis_export.py). Ein Shader je Art (gemeinsam für alle Materialien).
export type InnenArt = 'w' | 'b' | 'g' | 'm';
export const INNEN = { k: { value: 1 }, amb: { value: 1 } };      // k: Stärke (0 = aus); zum Vergleichen in der Konsole: window.__innenK.value = 0
// amb (seit 2026-11-25): Anteil des Umgebungslichts (Grundlicht, Himmel, Spiegelung). Von draußen gesehen bekam der offene Laderaum das volle
// Tageslicht und leuchtete weiß aus der Rampe; drinnen steht 1 (main.ts setzt es jedes Bild: an Bord 1, sonst AMB_DRAUSSEN).
(window as any).__innenK = INNEN.k;
const VERT_PARS = 'varying vec3 vIfP; varying vec3 vIfN;';
const VERT = '#include <begin_vertex>\nvIfP = position * length(modelMatrix[0].xyz); vIfN = normal;';
const FRAG_PARS = `uniform sampler2D ifNA; uniform float ifK; uniform float ifAmb; varying vec3 vIfP; varying vec3 vIfN;
vec2 ifUvOf(vec3 p, vec3 n) { vec3 a = abs(n); return a.y > 0.6 ? p.xz : (a.x > a.z ? p.zy : p.xy); }
float ifN(vec2 q, int c) { vec4 t = texture2D(ifNA, q); return c == 0 ? t.r : (c == 1 ? t.g : t.b); }`;
function colour(art: InnenArt) {
  const common = `vec3 ifNn = normalize(vIfN); vec2 ifUv = ifUvOf(vIfP, ifNn); float ifAa = max(fwidth(ifUv.x), fwidth(ifUv.y));
float ifBl = ifN(ifUv * 0.09, 0), ifFi = ifN(ifUv * 0.7 + 0.31, 1);
float ifTone = mix(0.86, 1.08, ifBl) * mix(0.95, 1.03, ifFi);
float ifH = 0.0; float ifRo = (ifN(ifUv * 0.23 + 0.5, 1) - 0.5) * 0.28;`;
  const parts: Record<InnenArt, string> = {
    // Wand und Decke: Laufspuren an senkrechten Flächen (von oben nach unten gestreckt), Orangenhaut
    w: `if (abs(ifNn.y) < 0.5) { float ifSt = smoothstep(0.55, 0.8, ifN(vec2(ifUv.x * 1.9, ifUv.y * 0.07) + 0.13, 1)); ifTone *= 1.0 - 0.12 * ifSt; ifRo += 0.12 * ifSt; }
ifH = (ifN(ifUv * 2.6, 2) - 0.5) * 0.0005;`,
    // Boden: Riffelblech (Rauten im Wechsel, 4 cm Raster), abgelaufene Flecken heller und glatter
    b: `vec2 ifQ = ifUv * 25.0; vec2 ifId = floor(ifQ), ifF = fract(ifQ) - 0.5;
vec2 ifR = mod(ifId.x + ifId.y, 2.0) < 1.0 ? vec2(ifF.x + ifF.y, ifF.x - ifF.y) : vec2(ifF.x - ifF.y, ifF.x + ifF.y);
float ifLz = length(vec2(ifR.x * 0.5, ifR.y * 1.7)) * 0.7071;
float ifFade = clamp(1.6 - ifAa * 25.0 / 0.5, 0.0, 1.0);
float ifBump = (1.0 - smoothstep(0.1, 0.15, ifLz)) * ifFade;
float ifWorn = smoothstep(0.5, 0.75, ifN(ifUv * 0.35 + 0.7, 0));
ifTone *= 1.0 + 0.1 * ifBump - 0.06 * (1.0 - ifWorn) + 0.08 * ifWorn * ifBump;
ifRo += 0.1 * (1.0 - ifWorn) - 0.12 * ifWorn * ifBump;
ifH = ifBump * 0.0011 + (ifN(ifUv * 3.0, 2) - 0.5) * 0.0004;`,
    // Gitterrost (Material eines flachen Bodens): quadratische Löcher (3 cm Raster), dunkel und tief
    g: `vec2 ifG = fract(ifUv * 33.0); float ifFade = clamp(1.6 - ifAa * 33.0 / 0.5, 0.0, 1.0);
float ifHole = smoothstep(0.16, 0.22, ifG.x) * smoothstep(0.84, 0.78, ifG.x) * smoothstep(0.16, 0.22, ifG.y) * smoothstep(0.84, 0.78, ifG.y) * ifFade;
ifTone *= mix(1.0, 0.18, ifHole); ifRo += 0.3 * ifHole; ifH = -ifHole * 0.002;`,
    // Metall: feine Schleifspuren in einer Richtung, Rauheit streut stärker
    m: `float ifSc = ifN(vec2(ifUv.x * 0.5, ifUv.y * 28.0) + 0.21, 2);
ifTone *= mix(0.93, 1.05, ifSc); ifRo += (ifSc - 0.5) * 0.3; ifH = (ifSc - 0.5) * 0.0004;`,
  };
  return `#include <color_fragment>
${common}
${parts[art]}
diffuseColor.rgb *= mix(1.0, ifTone, ifK); ifH *= ifK; ifRo *= ifK;`;
}
const ROUGH = `#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + ifRo, 0.04, 1.0);`;
const NORMAL = `#include <normal_fragment_maps>
{ vec2 ifDh = vec2(dFdx(ifH), dFdy(ifH)); vec3 ifSx = dFdx(-vViewPosition), ifSy = dFdy(-vViewPosition);
  vec3 ifR1 = cross(ifSy, normal), ifR2 = cross(normal, ifSx); float ifDet = dot(ifSx, ifR1) * faceDirection;
  vec3 ifGr = sign(ifDet) * (ifDh.x * ifR1 + ifDh.y * ifR2); normal = normalize(abs(ifDet) * normal - ifGr); }`;

export function innenArt(name: string): InnenArt | null { const m = / ~i([wbgm])\b/.exec(name); return m ? m[1] as InnenArt : null; }
export function innenFlaeche(m: THREE.MeshStandardMaterial, art: InnenArt) {
  const [nA] = l2Noise();
  m.onBeforeCompile = (sh) => {
    sh.uniforms.ifNA = { value: nA }; sh.uniforms.ifK = INNEN.k; sh.uniforms.ifAmb = INNEN.amb;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + VERT_PARS).replace('#include <begin_vertex>', VERT);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + FRAG_PARS)
      .replace('#include <color_fragment>', colour(art)).replace('#include <roughnessmap_fragment>', ROUGH).replace('#include <normal_fragment_maps>', NORMAL)
      .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= ifAmb; reflectedLight.indirectSpecular *= ifAmb;');
  };
  m.customProgramCacheKey = () => 'innen-' + art;
}
