import * as THREE from 'three';
import { scene, view } from '../core/engine';
import { world } from './world';
import { FLORA } from './flora';
import type { TerrainMaps } from './terrain';

// =====================================================================================
// Dichtes Gras auf der Grafikkarte (nur neues Gelände, ?gelaende=neu).
// Statt einzelner Grasbüschel-Karten (bis 6000, 50 m um die Kamera) stehen hier Zehntausende echter Halme. Die CPU tut fast nichts:
// Zwei feste Gitter aus Büscheln ziehen mit der Kamera mit (nah: 0,6-m-Zellen mit 14 Halmen bis 36 m, fern: 1,5-m-Zellen mit 6 breiteren Halmen bis 90 m).
// Der Vertex-Shader rechnet für jedes Büschel aus der Zellnummer Platz, Größe und Drehung aus, liest Boden, Neigung und Erosionsmasken aus den
// Geländekarten (terrain.ts) und lässt Halme weg, wo nichts wachsen soll (Schutt, Steilhang, Wasser, Schnee, Landeplatz).
// Wind: Halmspitzen schwingen in langen Wellen. Licht: Bergschatten aus dem Gelände-Bake, unten am Halm dunkler (Selbstverdeckung).
// =====================================================================================

interface Ring { mesh: THREE.Mesh; u: Record<string, THREE.IUniform> }
let rings: Ring[] = [];
let hData: Float32Array | null = null, hN = 0, hHalf = 0;

// Boden unter der Kamera (gleiche Dreiecke wie das Geländenetz), um das Gras aus großer Höhe abzuschalten
function groundY(x: number, z: number) {
  if (!hData) return 0;
  const cell = 2 * hHalf / (hN - 1);
  const gx = Math.min(hN - 1.001, Math.max(0, (x + hHalf) / cell)), gz = Math.min(hN - 1.001, Math.max(0, (z + hHalf) / cell));
  const ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, H = hData;
  const a = H[iz * hN + ix], b = H[iz * hN + ix + 1], c = H[(iz + 1) * hN + ix], d = H[(iz + 1) * hN + ix + 1];
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}

// Ein Büschel: B Halme mit S Abschnitten, Halmfuß zufällig in der Zelle. position = (Seite -1..1, Höhe 0..1), aBld = (Fuß x, Fuß z, Drehung, Zufall)
function clumpGeo(B: number, S: number, G: number, seed: number) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pos: number[] = [], bld: number[] = [], idx: number[] = [];
  for (let b = 0; b < B; b++) {
    const o = pos.length / 3, ox = rnd() - 0.5, oz = rnd() - 0.5, yaw = rnd() * Math.PI * 2, r = rnd();
    for (let k = 0; k < S; k++) { const t = k / S; pos.push(-1, t, 0, 1, t, 0); for (let i = 0; i < 2; i++) bld.push(ox, oz, yaw, r); }
    pos.push(0, 1, 0); bld.push(ox, oz, yaw, r);
    for (let k = 0; k < S - 1; k++) { const a = o + k * 2; idx.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    const a = o + (S - 1) * 2; idx.push(a, a + 1, a + 2);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  g.setAttribute('aBld', new THREE.Float32BufferAttribute(bld, 4));
  g.setIndex(idx);
  const cells = new Float32Array(G * G * 2);
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { cells[(j * G + i) * 2] = i - G / 2; cells[(j * G + i) * 2 + 1] = j - G / 2; }
  g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2));
  g.instanceCount = G * G;
  return g;
}

const VERT_HEAD = /* glsl */`
  attribute vec4 aBld; attribute vec2 aCell;
  uniform vec3 uCam; uniform float uTime, uSp, uR, uRin, uW, uHgt, uDens, uLiquid, uSnow, uKeep;
  uniform sampler2D tH, tMask, tNrm; uniform vec2 tGeo;
  uniform vec3 uColA, uColB, uColL;
  uniform sampler2D uGM; uniform vec3 uSn;
  varying vec3 vGc; varying vec2 vWP; varying float vT;
  uint hu(uvec2 v) { v = v * 1664525u + 1013904223u; v.x += v.y * 1664525u; v.y += v.x * 1664525u; v ^= v >> 16u; v.x += v.y * 1664525u; v.y += v.x * 1664525u; v ^= v >> 16u; return v.x ^ v.y; }
  float hf(ivec2 c, uint k) { return float(hu(uvec2(c) + uvec2(k * 7919u, k * 104729u)) & 0xffffffu) / 16777216.0; }
  float vn(vec2 p, uint k) { vec2 i = floor(p), f = p - i; f = f * f * (3.0 - 2.0 * f); ivec2 c = ivec2(i);
    return mix(mix(hf(c, k), hf(c + ivec2(1, 0), k), f.x), mix(hf(c + ivec2(0, 1), k), hf(c + ivec2(1, 1), k), f.x), f.y); }
  float terrH(vec2 p) {
    float cell = 2.0 * tGeo.x / (tGeo.y - 1.0);
    vec2 g = clamp((p + tGeo.x) / cell, vec2(0.0), vec2(tGeo.y - 1.001));
    ivec2 i = ivec2(floor(g)); vec2 f = g - vec2(i);
    float a = texelFetch(tH, i, 0).r, b = texelFetch(tH, i + ivec2(1, 0), 0).r, c = texelFetch(tH, i + ivec2(0, 1), 0).r, d = texelFetch(tH, i + ivec2(1, 1), 0).r;
    return f.x + f.y <= 1.0 ? a + (b - a) * f.x + (c - a) * f.y : d + (c - d) * (1.0 - f.x) + (b - d) * (1.0 - f.y);
  }
  vec2 tUVof(vec2 p) { return ((p + tGeo.x) / (2.0 * tGeo.x) * (tGeo.y - 1.0) + 0.5) / tGeo.y; }
`;

const VERT_BODY = /* glsl */`
  ivec2 ci = ivec2(floor(uCam.xz / uSp)) + ivec2(aCell);
  vec2 c = (vec2(ci) + 0.5 + (vec2(hf(ci, 1u), hf(ci, 2u)) - 0.5) * 0.7) * uSp;
  float yc = hf(ci, 3u) * 6.2832;
  mat2 Rc = mat2(cos(yc), sin(yc), -sin(yc), cos(yc));
  vec2 base = c + Rc * aBld.xy * uSp * 1.3;
  vec2 tuv = tUVof(c);
  vec4 M = texture2D(tMask, tuv); vec3 tn = normalize(texture2D(tNrm, tuv).xyz);
  float gy = terrH(base), d = length(c - uCam.xz);
  // wie dicht: Sediment und Rinnen voll, Schutt kaum, Steilhang nichts; dazu große Flecken (Wiese oder kahl)
  float pn = 0.6 * vn(c / 70.0, 4u) + 0.4 * vn(c / 23.0, 5u);
  float dens = uDens * (0.6 + 0.9 * M.g + 0.4 * M.r) * (1.0 - 0.7 * M.b) * smoothstep(0.26, 0.12, 1.0 - tn.y) * (0.35 + 1.2 * pn);
  // Schneeflecken wie im Bodenshader (surface.ts: gPat aus der Bodentextur in zwei Größen)
  if (uSn.x > 0.0) {
    vec3 lw = vec3(0.3, 0.59, 0.11); vec2 gp = c * uSn.z; float gLum = max(dot(textureLod(uGM, vec2(0.5), 12.0).rgb, lw), 0.02);
    float gPat = dot(textureLod(uGM, gp / 523.0 + 0.61, 0.0).rgb, lw) / gLum * 0.3 + dot(textureLod(uGM, gp / 97.0 + 0.13, 0.0).rgb, lw) / gLum * 0.22;
    float sn = uSn.x * smoothstep(0.5, 0.64, gPat + clamp((gy - uSn.y) * 0.0009, -0.4, 0.2)) * (1.0 - smoothstep(0.14, 0.32, 1.0 - tn.y));
    dens *= 1.0 - smoothstep(0.08, 0.35, sn);
  }
  dens *= step(uLiquid + 0.5, gy) * smoothstep(uSnow, uSnow - 30.0, gy);
  dens *= step(uKeep, length(c)) * step(max(abs(c.x), abs(c.y)), tGeo.x - 30.0);
  float fade = smoothstep(uR, uR * 0.72, d) * smoothstep(uRin, uRin + 12.0, d);
  float keep = step(fract(aBld.w + hf(ci, 6u)), dens);
  float hgt = uHgt * (0.55 + 0.75 * hf(ci, 7u)) * (0.75 + 0.5 * aBld.w) * mix(0.55, 1.0, clamp(dens, 0.0, 1.0)) * fade * keep;
  float t = position.y;
  float yaw = aBld.z + yc; vec2 dir = vec2(cos(yaw), sin(yaw)), side = vec2(-dir.y, dir.x);
  // Wind in langen Wellen, dazu jeder Halm etwas eigen; Neigung wächst zur Spitze (t²)
  float wv = sin(uTime * 1.3 + dot(c, vec2(0.045, 0.03))) * 0.6 + sin(uTime * 2.9 + c.x * 0.21 + aBld.w * 6.0) * 0.25 + 0.35;
  vec2 bend = dir * (0.25 + 0.3 * aBld.w) + vec2(0.8, 0.5) * wv * 0.55;
  vec3 gPos = vec3(base.x, gy - 0.03, base.y);
  gPos.xz += side * position.x * uW * (1.0 - 0.8 * t * t) * step(0.001, hgt) + bend * hgt * t * t;
  gPos.y += hgt * t * (1.0 - 0.18 * t * t * length(bend));
  // Farbe: unten dunkel, oben hell; an Rinnen und auf Sediment satter, auf Schutt trockener; Flecken in der Tönung
  float lush = clamp(0.6 * M.r + 0.6 * M.g - 0.4 * M.b + 0.4 * (vn(c / 37.0, 8u) - 0.5), 0.0, 1.0);
  vec3 tip = mix(uColB, uColL, lush) * (0.85 + 0.3 * hf(ci, 9u));
  vGc = mix(uColA * mix(0.8, 1.0, lush), tip, t); vWP = gPos.xz; vT = t;
  vec3 objectNormal = normalize(mix(tn, vec3(0.0, 1.0, 0.0), 0.45) + vec3(side.x, 0.0, side.y) * position.x * 0.25);
`;

function grassMat(u: Record<string, THREE.IUniform>) {
  const m = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace('#include <beginnormal_vertex>', VERT_BODY)
      .replace('#include <begin_vertex>', 'vec3 transformed = gPos;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGc; varying vec2 vWP; varying float vT; uniform sampler2D tLight; uniform vec2 tGeo;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vGc, opacity );')
      .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize( vNormal ); vec3 nonPerturbedNormal = normal;')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        { vec2 tL = texture2D(tLight, (vWP + tGeo.x) / (2.0 * tGeo.x)).rg;
          reflectedLight.directDiffuse *= tL.r * mix(0.55, 1.0, vT);
          reflectedLight.indirectDiffuse *= mix(0.45, 1.0, tL.g) * mix(0.5, 1.0, vT); }`);
  };
  m.customProgramCacheKey = () => 'grass1';
  return m;
}

// Gras für den aktuellen Planeten anlegen (surface.ts nach buildFlora). snowY: Schneegrenze (nur Pflanzenplaneten), keepR: freier Landeplatz
export function buildGrass(maps: TerrainMaps, type: string, liquid: number, snowY: number, veg: boolean, keepR: number, snow: { map: THREE.Texture; scale: number; k: number; y: number } | null) {
  rings = [];
  const F = FLORA[type]; if (!F || F.grass <= 0 || !maps.light.value) return;
  hData = maps.height.image.data as unknown as Float32Array; hN = maps.N; hHalf = maps.size / 2;
  // Farbe nah an der Bodentextur (sonst wirkt die Wiese aus der Ferne fleckig): auf Pflanzenplaneten das Grün des Bodens, sonst die Grasfarbe
  const col = veg ? new THREE.Color(0x6a7034).lerp(new THREE.Color(F.grassCol), 0.15) : new THREE.Color(F.grassCol);
  const lushC = veg ? new THREE.Color(0x587a2a) : col.clone().multiplyScalar(1.1);
  const hi = view.hiQ;
  const defs = hi
    ? [{ G: 124, sp: 0.6, B: 14, S: 2, w: 0.034, rin: 0 }, { G: 120, sp: 1.5, B: 6, S: 1, w: 0.07, rin: 28 }]
    : [{ G: 96, sp: 0.75, B: 6, S: 2, w: 0.06, rin: 0 }];
  for (const df of defs) {
    const u: Record<string, THREE.IUniform> = {
      uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uSp: { value: df.sp }, uR: { value: df.G / 2 * df.sp * 0.98 }, uRin: { value: df.rin },
      uW: { value: df.w }, uHgt: { value: veg ? 0.62 : 0.42 }, uDens: { value: Math.min(1.2, F.grass * 1.15) },
      uLiquid: { value: liquid }, uSnow: { value: veg ? snowY : 1e5 }, uKeep: { value: keepR },
      tH: { value: maps.height }, tMask: { value: maps.mask }, tNrm: { value: maps.nrm }, tLight: maps.light, tGeo: { value: new THREE.Vector2(maps.size / 2, maps.N) },
      uGM: { value: snow?.map ?? null }, uSn: { value: new THREE.Vector3(snow ? snow.k : 0, snow?.y ?? 0, snow?.scale ?? 1) },
      uColA: { value: col.clone().multiplyScalar(0.4) }, uColB: { value: col.clone().multiplyScalar(1.15) }, uColL: { value: lushC },
    };
    const mesh = new THREE.Mesh(clumpGeo(df.B, df.S, df.G, 1234 + df.G), grassMat(u));
    mesh.frustumCulled = false; mesh.receiveShadow = true; mesh.castShadow = false;
    scene.add(mesh); world.extras.push(mesh);
    rings.push({ mesh, u });
  }
}

// jedes Bild: Kamera und Zeit an die Shader; aus großer Höhe ist kein Gras zu sehen
export function updateGrass(cam: THREE.Vector3) {
  if (!rings.length) return;
  if (!rings[0].mesh.parent) { rings = []; hData = null; return; }
  const vis = cam.y - groundY(cam.x, cam.z) < 140, t = performance.now() / 1000;
  for (const r of rings) { r.mesh.visible = vis; (r.u.uCam.value as THREE.Vector3).copy(cam); r.u.uTime.value = t; }
}
