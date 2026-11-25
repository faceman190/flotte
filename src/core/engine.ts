import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ---------- Fester Lichtsatz (seit 2026-11-25) ----------
// three baut die Zahl der Lampen fest in jeden Shader ein: Ein Material bei 4 Punktlichtern ist ein anderes Programm als bei 12. Jede
// Lage brachte eigene Lampen mit (All 3, Planet 4, Schiffsinnenraum 12 und ein Himmelslicht, Deck 9 Strahler), also musste beim Wechsel
// jedes beleuchtete Material neu übersetzt werden – das waren die Hänger beim Einsteigen und Landen. Jetzt wird jede Szene vor dem Zeichnen
// mit Platzhaltern (Stärke 0) auf dieselbe Zahl aufgefüllt; die Shader bleiben gleich, egal wo man ist. Braucht eine Lage einmal mehr
// Lampen, wächst die Grenze für den Rest der Sitzung mit (einmal neu übersetzen, danach wieder fest).
// Alle Lampen merken: Object3D.add wird einmal umgelegt (auch ganze Gruppen, die Lampen enthalten, und geladene Modelle).
const LIT = new Set<THREE.Light>();
const _add = THREE.Object3D.prototype.add;
THREE.Object3D.prototype.add = function (this: THREE.Object3D, ...objs: THREE.Object3D[]) {
  for (const o of objs) {
    if (!o || o.userData?.lichtsatz) continue;
    if ((o as any).isLight) LIT.add(o as THREE.Light);
    else if (o.children?.length) o.traverse(c => { if ((c as any).isLight && !c.userData.lichtsatz) LIT.add(c as THREE.Light); });
  }
  return _add.apply(this, objs as any);
} as any;
// Damit die Platzhalter (und Lampen außer Reichweite) nichts kosten: three rechnet die Lichtformel für jede Lampe, auch wenn ihr Licht hier
// null ist. directLight.visible ist genau dann falsch (Farbe null, außerhalb von Reichweite oder Kegel) – dann wird sie übersprungen.
// Das Ergebnis bleibt Bildpunkt für Bildpunkt gleich, weil eine Lampe mit Farbe null nichts beiträgt.
THREE.ShaderChunk.lights_fragment_begin = THREE.ShaderChunk.lights_fragment_begin.replace(
  /(\n\s*)RE_Direct\( directLight, /g, '$1if ( directLight.visible ) RE_Direct( directLight, ');
/** Grenzen des Lichtsatzes (wachsen bei Bedarf); spot/spotSh gelten in Szenen mit Strahlern (Decks), sonst 1 Strahler ohne Schatten */
export const LICHTSATZ = { point: 16, spot: 9, spotSh: 6, hemi: 1, zuViel: 0 };      // 16 Punktlichter: die Mine braucht bis zu 15

// Farbverwaltung: Farben und Texturen in sRGB, Licht wird linear gerechnet, am Ende Filmkurve (ACES)
THREE.ColorManagement.enabled = true;

export const gl = document.getElementById('gl') as HTMLCanvasElement;
export const ui = document.getElementById('ui') as HTMLCanvasElement;
export const ux = ui.getContext('2d')!;
export const renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, powerPreference: 'high-performance' });   // Geräte mit zwei Grafikkarten: die starke nehmen (Wunsch an den Browser)
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060a, 0.00005);
export const camera = new THREE.PerspectiveCamera(66, 1, 0.5, 30000);
export const view = { W: innerWidth, H: innerHeight, hiQ: true };

// Seit three r155 gelten physikalische Lichteinheiten: Faktor PI entspricht dem alten Aussehen
const L = Math.PI;
const AMB = 2.6, SUN = 1.7, RIM = 1.1;
export const ambient = new THREE.AmbientLight(0x4a4f5e, AMB * L);
scene.add(ambient);
export const sun = new THREE.DirectionalLight(0xfff0dc, SUN * L);
sun.position.set(1, 0.7, 0.35);
scene.add(sun, sun.target);
// Schatten nur im Umkreis der Kamera (der Schattenbereich wandert mit)
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 10; sun.shadow.camera.far = 2400;
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
export const rim = new THREE.DirectionalLight(0x5070c0, RIM * L);
rim.position.set(-1, -0.3, -0.6);
scene.add(rim);

let composer: EffectComposer | null = null;

export function resize() {
  view.W = Math.max(1, innerWidth);
  view.H = Math.max(1, innerHeight);
  renderer.setSize(view.W, view.H, false);
  camera.aspect = view.W / view.H;
  camera.updateProjectionMatrix();
  const d = Math.min(2, devicePixelRatio || 1);
  ui.width = Math.round(view.W * d);        // ganze Bildpunkte; die Größe am Schirm legt das Stylesheet fest (#gl, #ui: 100 %)
  ui.height = Math.round(view.H * d);
  ux.setTransform(d, 0, 0, d, 0, 0);
  if (composer) composer.setSize(view.W, view.H);
}
addEventListener('resize', resize);
resize();

// Vignette und feines Filmkorn
const Vignette = {
  uniforms: { tDiffuse: { value: null }, amount: { value: 0.32 }, grain: { value: 0.025 }, time: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float amount; uniform float grain; uniform float time; varying vec2 vUv;
    float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = 1.0 - amount * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      c.rgb *= v; c.rgb += (rnd(vUv * 731.0) - 0.5) * grain * c.rgb; gl_FragColor = c; }`,
};
// Schutz vor dem Bloom: Ein einzelner ungültiger Bildpunkt (NaN/Inf aus irgendeinem Shader) würde vom Weichzeichner des Blooms
// zu einem schwarzen Rechteck aufgeblasen, das für ein Bild aufblitzt. Solche Punkte werden hier schwarz, sehr helle gedeckelt.
const Guard = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c.rgb)) || any(isinf(c.rgb))) c.rgb = vec3(0.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), 1.0); }`,
};
export let vignettePass: ShaderPass | null = null, bloomPass: UnrealBloomPass | null = null;
try {
  // Mehrfach-Abtastung (MSAA) auch mit Bloom: eigenes Renderziel mit 4 Samples
  const rt = new THREE.WebGLRenderTarget(view.W, view.H, { type: THREE.HalfFloatType, samples: 4 });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new ShaderPass(Guard));
  // Seit 2026-11-25 schwächer und erst ab Helligkeit 1,0 (vorher 0,5 / 0,45 / 0,82): Leuchtflächen der Schiffe und Decks liegen bei 2 bis 4,5
  // und bekamen große Höfe, das blendete (Nutzer). Bildschirme bleiben weiter unter der Schwelle (deck.ts GLOW_MAX).
  bloomPass = new UnrealBloomPass(new THREE.Vector2(view.W, view.H), 0.36, 0.4, 1.0);
  composer.addPass(bloomPass);
  vignettePass = new ShaderPass(Vignette);
  composer.addPass(vignettePass);
  composer.addPass(new OutputPass());
  composer.setSize(view.W, view.H);
} catch (e) {
  composer = null;
}
// Schatten der Sonne um einen Punkt legen (Spieler, Rover); size = halbe Kantenlänge des Schattenbereichs
// Der Sonnenschatten bleibt immer eingeschaltet (Lichtsatz: Ein- und Ausschalten bräuchte neue Shader). „Aus“ heißt seit 2026-11-25: Der
// Schattenbereich liegt 500 km tiefer, wird einmal leer gezeichnet und ruht dann; alles im Bild liegt außerhalb und wird nicht abgetastet.
let sunPark = false;
export function aimShadows(x: number, y: number, z: number, dir: THREE.Vector3, size: number, on: boolean) {
  sun.castShadow = view.hiQ;
  const live = on && view.hiQ, py = live ? y : y - 5e5;
  sun.target.position.set(x, py, z);
  sun.position.set(x + dir.x * 1200, py + dir.y * 1200, z + dir.z * 1200);
  if (!view.hiQ) return;
  sun.shadow.intensity = live ? 1 : 0;
  if (live) { sun.shadow.autoUpdate = true; sunPark = false; }
  else if (!sunPark) { sunPark = true; sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true; }
  const c = sun.shadow.camera as THREE.OrthographicCamera;
  if (c.right !== size) { c.left = -size; c.right = size; c.top = size; c.bottom = -size; c.updateProjectionMatrix(); }
}
// Neue Meshes bekommen Schatten (wird regelmäßig über die Szene aufgerufen)
export function markShadows(root: THREE.Object3D, skip: THREE.Object3D) {
  root.traverse((o: any) => {
    if (!o.isMesh || o.userData.sh !== undefined) return;
    if (o === skip) return;
    let p = o.parent; while (p) { if (p === skip) { o.userData.sh = false; return; } p = p.parent; }
    const m = o.material;
    const lit = m && (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) && !m.transparent;
    o.castShadow = o.receiveShadow = !!lit;
    o.userData.sh = !!lit;
  });
}

// Belichtung: im Stationsinneren werden Sonne und Grundlicht gedimmt (1 = Weltraum)
export function setExposure(k: number) { ambient.intensity = AMB * L * (0.35 + 0.65 * k); sun.intensity = SUN * L * k; rim.intensity = RIM * L * k; }
export function setQuality(hi: boolean) {
  view.hiQ = hi;
  const pr = hi ? Math.min(2, devicePixelRatio || 1) : 1;
  renderer.setPixelRatio(pr);
  if (composer) composer.setPixelRatio(pr);
  resize();
}

// Zweite Ebene über dem Bild (eigene Szene, eigene Kamera, eigenes Licht): die Waffe in der Ich-Sicht. Sie wird nach dem Bild mit leerem
// Tiefenpuffer gezeichnet und kann deshalb nie in Wände ragen; ihr Licht hängt nicht an den Lampen der Welt.
export const overlay: { scene: THREE.Scene | null; camera: THREE.Camera | null } = { scene: null, camera: null };
// Eigener Körper in der Ich-Sicht (seit 2026-11-24, game/mannyAvatar.ts): Die Spielerfigur liegt dann auf der Ebene BODY_LAYER. Das Hauptbild
// zeichnet sie nicht; danach wird dieselbe Szene noch einmal nur mit dieser Ebene gezeichnet – mit gelöschter Tiefe und eigener Nahgrenze.
// So ragen Arme und Waffe nie in Wände (wie Unreals „First Person Rendering“), die Figur steht trotzdem im Licht der Szene, und die
// Nahgrenze des Hauptbilds (0,5 m auf Planeten) schneidet die Hände nicht ab. on setzt die Figur in jedem Bild neu.
export const BODY_LAYER = 7;
export const bodyPass = { on: false, was: false, near: 0.03, far: 30 };
/** Licht nur für den Körper der Ich-Sicht (beleuchtet die Welt nicht) */
export function bodyOnly<T extends THREE.Light>(l: T): T { l.layers.set(BODY_LAYER); return l; }      // was: im letzten gezeichneten Bild an (für renderStill)
let bodyLightT = 0;
function renderBody() {
  // Lichter gelten nur für Ebenen, auf denen sie selbst liegen: alle auch auf die Körper-Ebene legen (neue Lichter spätestens nach 0,4 s)
  const now = performance.now();
  // Ausnahme userData.noBody: Lichter, die an der Kamera sitzen (Waffenlampe der Mine) – aus wenigen Zentimetern beleuchten sie Hand und
  // Waffe ungleichmäßig und flackernd; der Körper bekommt dort ein eigenes Licht (dungeon.ts).
  if (now - bodyLightT > 400) { bodyLightT = now; scene.traverse(o => { if ((o as any).isLight) { if (o.userData.noBody) o.layers.disable(BODY_LAYER); else o.layers.enable(BODY_LAYER); } }); }
  const n = camera.near, f = camera.far, mask = camera.layers.mask, bg = scene.background, au = renderer.shadowMap.autoUpdate, mw = scene.matrixWorldAutoUpdate;
  camera.near = bodyPass.near; camera.far = bodyPass.far; camera.layers.set(BODY_LAYER); camera.updateProjectionMatrix(); padLights(camera);
  scene.background = null; renderer.shadowMap.autoUpdate = false; scene.matrixWorldAutoUpdate = false;      // Himmel nicht noch einmal, Schatten und Lagen vom Hauptbild
  renderer.autoClear = false; renderer.setRenderTarget(null); renderer.clearDepth();
  try { renderer.render(scene, camera); }
  finally {
    renderer.autoClear = true; scene.background = bg; renderer.shadowMap.autoUpdate = au; scene.matrixWorldAutoUpdate = mw;
    camera.near = n; camera.far = f; camera.layers.mask = mask; camera.updateProjectionMatrix();
  }
}
// Vor dem Bild: Wer hier eine Funktion einträgt, darf erst selbst etwas zeichnen (Schiffsansicht im Werft-Terminal, src/ui/shipPreview.ts).
// Das Spielbild übermalt es danach wieder.
export const prePass: { fn: null | (() => void) } = { fn: null };

// ---------- Vorwärmen (seit Alpha 1.31): keine Standbilder beim Betreten eines Innenraums ----------
// three übersetzt einen Shader erst, wenn sein Material zum ersten Mal ins Bild kommt, und wartet dabei auf den Grafiktreiber (je Shader
// bis zu einer halben Sekunde). Beim Andocken wechselt die Lichtlage (Strahler des Decks), also braucht jedes beleuchtete Material eine
// neue Fassung: Das waren die langen Standbilder. compileFor lässt den Treiber nebenläufig übersetzen und meldet, wenn alles fertig ist.
// Übersetzt wird in der Fassung, die das Bild wirklich braucht: Das Spiel zeichnet in ein Zwischenbild (Bloom), und three wählt danach
// Filmkurve und Farbraum des Shaders. Ohne gebundenes Zwischenbild entstünde eine Fassung, die nie benutzt wird.
const WARM_RT = new THREE.WebGLRenderTarget(4, 4);
// Alle Bilder und Formen unter root auf die Grafikkarte laden, auch von gerade unsichtbaren Teilen (seit 2026-11-18). primeFrame lädt nur, was
// sichtbar geschaltet ist; Kleinteile, die erst aus der Nähe eingeblendet werden, kamen sonst später mitten im Spiel dazu (gemessen beim
// Andocken: 44 Bilder in einem Bild direkt nach der Blende). Die Formen laufen über Stellvertreter mit einem schlichten Material in ein
// winziges Bild; die echten Objekte bleiben unberührt.
let UP_RT: THREE.WebGLRenderTarget | null = null, UP_MAT: THREE.MeshBasicMaterial | null = null;
export function uploadAll(root: THREE.Object3D) {
  const texs = new Set<THREE.Texture>(), geos = new Set<THREE.BufferGeometry>();
  root.traverse((o: any) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    if (o.geometry && !o.geometry.userData?.freed) geos.add(o.geometry);
    for (const m of (Array.isArray(o.material) ? o.material : [o.material]) as any[]) {
      if (!m) continue;
      for (const v of Object.values(m)) if ((v as any)?.isTexture && !(v as any).isRenderTargetTexture) texs.add(v as THREE.Texture);
      if (m.uniforms) for (const u of Object.values(m.uniforms) as any[]) if (u?.value?.isTexture && !u.value.isRenderTargetTexture) texs.add(u.value);
    }
  });
  try { for (const t of texs) renderer.initTexture(t); } catch (e) { console.warn('Bilder vorab hochladen:', e); }
  if (!geos.size) return;
  UP_RT = UP_RT || new THREE.WebGLRenderTarget(4, 4); UP_MAT = UP_MAT || new THREE.MeshBasicMaterial();
  const sc = new THREE.Scene();
  for (const g of geos) { const m = new THREE.Mesh(g, UP_MAT); m.frustumCulled = false; m.matrixAutoUpdate = false; sc.add(m); }
  const rt0 = renderer.getRenderTarget();
  try { renderer.setRenderTarget(UP_RT); renderer.render(sc, camera); } catch (e) { console.warn('Formen vorab hochladen:', e); } finally { renderer.setRenderTarget(rt0); }
}
export function compileFor(root: THREE.Object3D, target: THREE.Scene | null = null, toTarget = view.hiQ && !!composer): Promise<void> {
  padLights();
  const rt0 = renderer.getRenderTarget();
  let mats = new Set<THREE.Material>();
  try { if (toTarget) renderer.setRenderTarget(WARM_RT); mats = renderer.compile(root, camera, target as any) as any || mats; } catch (e) { console.warn('Shader vorab übersetzen:', e); }
  renderer.setRenderTarget(rt0);
  // Selbst nachfragen, ob alles fertig ist (nicht renderer.compileAsync): Dessen Abfrage wirft, sobald ein Material in der Zwischenzeit
  // entsorgt wurde (Figur verschwindet, Innenraum wieder verlassen), und meldet dann nie mehr, dass es fertig ist.
  return new Promise<void>(res => {
    const t0 = performance.now();
    const check = () => {
      for (const m of [...mats]) {
        let ready = true;
        try { const p = (renderer.properties.get(m) as any).currentProgram; ready = !p || p.isReady(); } catch (e) { /* gilt als fertig */ }
        if (ready) mats.delete(m);
      }
      if (!mats.size || performance.now() - t0 > 20000) res(); else setTimeout(check, 10);
    };
    check();
  });
}
// warmScene: die ganze Szene vorwärmen und so lange nichts rechnen und nichts zeichnen (warm.hold; die Hauptschleife fragt es ab). Darüber
// liegt eine schwarze Blende, die nach dem ersten fertigen Bild wieder aufgeht; dauert es länger als eine halbe Sekunde, zeigt sie ein Wort.
// Sind die Shader fertig, lädt ein Bild ohne Sichtkegelprüfung noch alle Netze und Bilder hoch (primeFrame), ebenfalls hinter der Blende.
// Von Hand gerechnete Bilder (Tests, lf.tick) laufen weiter, außer warm.strict ist gesetzt.
// cover: Das Bild ist schon abgedeckt (Übergang aus dem Hauptmenü, ui/startfx.ts) – dann ohne eigene Blende und ohne Ladewort.
// wait: Das Spiel steht weiter (wie hold), bis die Abdeckung aufgeht. last: das zuletzt begonnene Vorwärmen.
export const warm = { hold: false, strict: false, ms: 0, count: 0, parts: [0, 0, 0], cover: false, wait: false, last: null as Promise<void> | null };      // parts: Vorarbeit, Übersetzen, erstes Bild (ms, zuletzt)
let warmEl: HTMLElement | null = null, warmN = 0;
// Ein Bild ohne Sichtkegelprüfung zeichnen: lädt die Netze und Bilder von allem, was sichtbar geschaltet ist, in den Grafikspeicher.
// Sonst geschähe das in dem Bild, in dem ein Teil zum ersten Mal vor die Kamera kommt (am Ende der Landung: das ganze Deck, 0,6 s).
function primeFrame() {
  const off: THREE.Object3D[] = [];
  scene.traverseVisible((o: any) => { if (o.frustumCulled && (o.isMesh || o.isPoints || o.isLine || o.isSprite)) { o.frustumCulled = false; off.push(o); } });
  try { render(); } finally { for (const o of off) o.frustumCulled = true; }
}
// quiet: ohne eigene schwarze Blende, wenn schon etwas anderes das Bild deckt (Sprung- oder Eintrittsblitz, seit 2026-11-18)
export function warmScene(label: string, prime: null | (() => void) = null, maxMs = 9000, quiet = false): Promise<void> {
  const n = ++warmN, t0 = performance.now();
  if (!warmEl) { warmEl = document.createElement('div'); warmEl.id = 'warm'; warmEl.appendChild(document.createElement('span')); document.body.appendChild(warmEl); }
  warmEl.firstElementChild!.textContent = label; if (!quiet && !warm.cover) warmEl.classList.add('on');
  warm.hold = true;
  return (warm.last = new Promise<void>(res => {
    let begun = false, fin = false, tb = t0, t1 = t0;
    const done = () => {
      if (fin) return; fin = true;
      if (n !== warmN) { res(); return; }      // inzwischen läuft ein neueres Vorwärmen, das gibt frei
      const t2 = performance.now();
      try { primeFrame(); } catch (e) { console.warn('Vorwärmen:', e); }
      warm.parts = [t1 - tb, t2 - t1, performance.now() - t2];
      warm.hold = false; warm.ms = performance.now() - t0; warm.count++;
      // die Blende erst nach zwei fertigen Bildern öffnen
      let open = false; const show = () => { if (!open && n === warmN) { open = true; warmEl!.classList.remove('on'); } };
      requestAnimationFrame(() => requestAnimationFrame(show)); setTimeout(show, 400);
      res();
    };
    // Erst muss die Blende im Bild sein (zwei Bilder abwarten), sonst stünde während der Vorarbeit das letzte Bild des Flugs.
    // Dann die Vorarbeit des Aufrufers (prime: die Raumspiegelungen des Decks, das blockiert kurz), danach die Shader: So werden sie
    // gleich für die endgültigen Spiegelungen übersetzt.
    const begin = () => {
      if (begun) return; begun = true;
      if (n !== warmN) { res(); return; }
      tb = performance.now();
      try { if (prime) prime(); } catch (e) { console.warn('Vorwärmen:', e); }
      t1 = performance.now();
      compileFor(scene).then(done); setTimeout(done, maxMs);
    };
    requestAnimationFrame(() => requestAnimationFrame(begin)); setTimeout(begin, 150);
  }));
}
/**
 * Standbild: das letzte Spielbild noch einmal zeichnen, ohne dass sich etwas bewegt. Für das Flottenband: Dort steht das Spiel und es wird
 * nichts gezeichnet – eine Vorschau (prePass: Figur im Inventar und in der Garderobe) braucht aber den Renderer und malt dabei über das
 * Spielbild, das deshalb danach wieder hergestellt werden muss. Der Körper der Ich-Sicht bleibt, wie er im letzten Bild war.
 */
export function renderStill() { bodyPass.on = bodyPass.was; render(); }
// Lichtsatz auffüllen: vor jedem Zeichnen der Hauptszene, vor dem Körperbild der Ich-Sicht (andere Ebene) und vor dem Vorwärmen.
// Gezählt wird, was three auch zählt: Lampen in der Szene, sichtbar entlang aller Eltern, auf einer Ebene der Kamera.
const PADG = new THREE.Group(); PADG.name = 'Lichtsatz'; PADG.userData.lichtsatz = true;
const pads = { d: [] as THREE.Light[], p: [] as THREE.Light[], s: [] as THREE.Light[], ss: [] as THREE.Light[], h: [] as THREE.Light[] };
function fuellen(arr: THREE.Light[], n: number, mk: () => THREE.Light) {
  while (arr.length < n) {
    const l = mk(); l.userData.lichtsatz = true; l.intensity = 0; l.layers.enableAll(); l.position.set(0, -9e5, 0);
    _add.call(PADG, l); arr.push(l);
  }
  for (let i = 0; i < arr.length; i++) arr[i].visible = i < n;
}
export function padLights(cam: THREE.Camera = camera) {
  if (PADG.parent !== scene) _add.call(scene, PADG);
  let d = 0, p = 0, s = 0, ss = 0, h = 0;
  for (const l of LIT) {
    let o: THREE.Object3D = l, vis = true;
    for (;;) { if (!o.visible) vis = false; if (!o.parent) break; o = o.parent; }
    if (o !== scene) { LIT.delete(l); continue; }      // nicht (mehr) in der Szene; beim nächsten add ist sie wieder dabei
    if (!vis || !l.layers.test(cam.layers)) continue;
    const a = l as any;
    if (a.isPointLight) p++; else if (a.isSpotLight) { s++; if (l.castShadow) ss++; } else if (a.isHemisphereLight) h++; else if (a.isDirectionalLight) d++;
  }
  const L = LICHTSATZ, mehr = (was: string, n: number) => { L.zuViel++; console.info(`Lichtsatz: ${n} ${was}, Grenze wächst (einmal neue Shader)`); };
  if (p > L.point) { mehr('Punktlichter', p); L.point = p; }
  if (h > L.hemi) { mehr('Himmelslichter', h); L.hemi = h; }
  let ts = 1, tss = 0;      // Szenen ohne Strahler (oder nur die Stirnlampe der Mine): ein Strahler ohne Schatten
  if (s > 1 || ss > 0) {
    if (ss > L.spotSh) { mehr('Strahler mit Schatten', ss); L.spotSh = ss; }
    tss = L.spotSh;
    if (s + tss - ss > L.spot) { mehr('Strahler', s + tss - ss); L.spot = s + tss - ss; }
    ts = L.spot;
  }
  if (s > ts) ts = s;
  fuellen(pads.d, Math.max(0, 2 - d), () => new THREE.DirectionalLight(0, 0));
  fuellen(pads.p, L.point - p, () => new THREE.PointLight(0, 0, 1, 2));
  fuellen(pads.ss, tss - ss, () => { const l = new THREE.SpotLight(0, 0, 1, 0.5); l.castShadow = true; l.shadow.mapSize.set(16, 16); l.shadow.autoUpdate = false; l.shadow.needsUpdate = true; return l; });
  fuellen(pads.s, ts - s - (tss - ss), () => new THREE.SpotLight(0, 0, 1, 0.5));
  fuellen(pads.h, L.hemi - h, () => new THREE.HemisphereLight(0, 0, 0));
}
export function render() {
  padLights();
  if (prePass.fn) prePass.fn();
  if (vignettePass) vignettePass.uniforms.time.value = (performance.now() % 10000) / 1000;
  if (view.hiQ && composer) composer.render();
  else renderer.render(scene, camera);
  bodyPass.was = bodyPass.on;
  if (bodyPass.on) { bodyPass.on = false; renderBody(); }
  if (overlay.scene && overlay.camera) {
    renderer.autoClear = false; renderer.setRenderTarget(null); renderer.clearDepth();
    renderer.render(overlay.scene, overlay.camera);
    renderer.autoClear = true;
  }
}

// Weiches Leuchten für Triebwerke, Lichter, Explosionen
function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.25, 'rgba(255,255,255,.6)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const GLOW = glowTexture();
export const glowMat = (col: THREE.ColorRepresentation, op = 1) =>
  new THREE.SpriteMaterial({ map: GLOW, color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false });
export const basicAdd = (col: THREE.ColorRepresentation) =>
  new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

// Standard-Umgebungsreflexion, bis das Nebelbild des Sektors geladen ist
export const DEFAULT_ENV = (() => {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#2c3242');
  gr.addColorStop(0.5, '#0e1016');
  gr.addColorStop(1, '#040506');
  g.fillStyle = gr;
  g.fillRect(0, 0, 512, 256);
  for (const [x, y, r, col] of [[380, 70, 46, '255,240,215'], [110, 105, 95, '90,100,130'], [250, 150, 80, '120,80,60'], [470, 160, 70, '60,70,110']] as const) {
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, `rgba(${col},.95)`);
    rg.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = rg;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(t).texture;
  pm.dispose();
  return env;
})();
scene.environment = DEFAULT_ENV;
