// Schiffs-Explorer: 3D-Ansicht (three.js, dieselben Meshopt-GLB-Dateien wie im Spiel), Werte, Vergleich, sortierbare Tabelle.
// Materialbehandlung wie im Spiel (src/models/gltfShips.ts): Lackierungstexturen in sRGB, ext_pan_*-Materialien mit Plattenfugen im Shader,
// Fahrwerk = Meshes mit dem Material „gear“. Ändert sich dort etwas, hier nachziehen.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { WERTE, fmtWert, credits } from '../lib/werte';

interface Schiff { id: string; n: string; role: string; price: number; desc: string; len: number; col: string; innen: boolean; modell: string | null; werte: Record<string, number> }
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const lang = (v: number) => String(v).replace('.', ',');

export function starteExplorer() {
  const daten = JSON.parse($('schiff-daten').textContent || '{}') as { schiffe: Schiff[]; env: string | null };
  const schiffe = daten.schiffe;
  const byId = Object.fromEntries(schiffe.map((s) => [s.id, s]));
  let akt = schiffe[0];
  let vgl: Schiff | null = null;

  // ---------- Werte und Vergleich ----------
  function zeigeWerte() {
    $('i-name').textContent = akt.n;
    $('i-rolle').textContent = akt.role;
    $('i-preis').textContent = credits(akt);
    $('i-desc').textContent = akt.desc;
    $('i-merk').innerHTML = `<span>${lang(akt.len)} m</span><span>${akt.innen ? 'Innen begehbar' : 'Einsitzig, kein Innenraum'}</span>`;
    $('b-name').textContent = akt.n;
    $('b-len').textContent = `Länge ${lang(akt.len)} m`;
    $('info').classList.toggle('vgl-an', !!vgl);
    for (const row of document.querySelectorAll<HTMLElement>('.w-zeile')) {
      const k = row.dataset.k!, max = Number(row.dataset.max) || 1, w = WERTE.find((x) => x.k === k)!;
      const v = akt.werte[k];
      row.querySelector('b')!.textContent = fmtWert(w, v);
      row.querySelector<HTMLElement>('.w-bar i')!.style.width = `${(v / max) * 100}%`;
      const em = row.querySelector('em')!, u = row.querySelector<HTMLElement>('.w-bar u')!;
      if (vgl) {
        const o = vgl.werte[k], d = v - o;
        u.style.left = `calc(${(o / max) * 100}% - 1px)`;
        em.className = d > 0 ? 'plus' : d < 0 ? 'minus' : 'gleich';
        if (v === 0 && o === 0) { em.textContent = ''; em.title = ''; continue; }
        em.textContent = d === 0 ? '=' : (d > 0 ? '+' : '−') + Math.abs(d).toLocaleString('de-DE', { maximumFractionDigits: 2 });
        em.title = `${vgl.n}: ${fmtWert(w, o)}`;
      } else { em.textContent = ''; em.title = ''; }
    }
    for (const b of document.querySelectorAll<HTMLButtonElement>('.w-btn')) {
      const an = b.dataset.id === akt.id;
      b.classList.toggle('an', an);
      b.setAttribute('aria-pressed', String(an));
    }
  }

  function waehle(id: string, scroll = false) {
    const s = byId[id];
    if (!s) return;
    akt = s;
    if (vgl && vgl.id === s.id) { vgl = null; ($('vgl') as HTMLSelectElement).value = ''; }
    zeigeWerte();
    zeigeModell(s);
    history.replaceState(null, '', `#${s.id}`);
    if (scroll) $('explorer').scrollIntoView({ behavior: 'smooth', block: 'start' });
    // gewählte Schaltfläche in der Leiste sichtbar halten (Handy: waagrechte Liste)
    document.querySelector<HTMLElement>(`.w-btn[data-id="${s.id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  for (const b of document.querySelectorAll<HTMLButtonElement>('.w-btn')) b.addEventListener('click', () => waehle(b.dataset.id!));
  $('vgl').addEventListener('change', (e) => {
    const v = (e.target as HTMLSelectElement).value;
    vgl = v && v !== akt.id ? byId[v] : null;
    if (v === akt.id) (e.target as HTMLSelectElement).value = '';
    zeigeWerte();
  });
  window.addEventListener('hashchange', () => { const id = location.hash.slice(1); if (byId[id] && id !== akt.id) waehle(id, true); });

  // ---------- Tabelle sortieren ----------
  const tab = $('tabelle') as HTMLTableElement;
  let sortK = '', sortAuf = false;
  for (const th of tab.querySelectorAll<HTMLElement>('thead th')) {
    th.addEventListener('click', () => {
      const k = th.dataset.s!;
      sortAuf = sortK === k ? !sortAuf : k === 'n';
      sortK = k;
      const body = tab.tBodies[0];
      const rows = [...body.rows].sort((a, b) => {
        const va = a.dataset[k] ?? '', vb = b.dataset[k] ?? '';
        const c = k === 'n' ? va.localeCompare(vb, 'de') : Number(va) - Number(vb);
        return sortAuf ? c : -c;
      });
      for (const r of rows) body.appendChild(r);
      for (const h of tab.querySelectorAll('thead th')) h.classList.remove('sort-auf', 'sort-ab');
      th.classList.add(sortAuf ? 'sort-auf' : 'sort-ab');
    });
  }
  for (const a of tab.querySelectorAll<HTMLAnchorElement>('tbody a')) a.addEventListener('click', (e) => { e.preventDefault(); waehle(a.hash.slice(1), true); });

  // ---------- 3D ----------
  const canvas = $('ansicht') as HTMLCanvasElement;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    $('kein-3d').hidden = false; $('lade').classList.add('weg');
    zeigeWerte();
    const id0 = location.hash.slice(1); if (byId[id0]) { akt = byId[id0]; zeigeWerte(); }
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 5000);
  const ctl = new OrbitControls(cam, canvas);
  ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.enablePan = false; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.6;
  ctl.minPolarAngle = 0.15; ctl.maxPolarAngle = Math.PI - 0.15;

  // Licht: Reflexionen aus einem Raum-Umgebungsbild (gleichmäßig, neutral), dazu Sonne von schräg oben und kühles Gegenlicht.
  // Der Nebelhimmel der Heimstatt (wie im Spiel) ersetzt die Umgebung, sobald er geladen ist.
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  if (daten.env) new THREE.TextureLoader().load(daten.env, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
    const env = pm.fromEquirectangular(t).texture; t.dispose();
    scene.environment = env; scene.environmentIntensity = 1.1;
  });
  const sonne = new THREE.DirectionalLight(0xfff1dc, 3.2); sonne.position.set(-0.6, 0.9, 0.5);
  const gegen = new THREE.DirectionalLight(0x8fc4ff, 1.1); gegen.position.set(0.7, 0.2, -0.8);
  scene.add(sonne, gegen, new THREE.HemisphereLight(0x3a4d63, 0x0b0f14, 0.6));

  // Landefeld-Ring unter dem Schiff als Maßstab (Durchmesser = 1,25 × Schiffslänge)
  const ring = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.22, depthWrite: false });
  ring.add(new THREE.Mesh(new THREE.RingGeometry(0.615, 0.625, 128), ringMat));
  const strich = new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0.14, depthWrite: false });
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.004, i % 6 ? 0.025 : 0.05), strich);
    const a = (i / 24) * Math.PI * 2; m.position.set(Math.sin(a) * 0.59, Math.cos(a) * 0.59, 0); m.rotation.z = -a; ring.add(m);
  }
  ring.rotation.x = -Math.PI / 2;
  scene.add(ring);

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map<string, Promise<THREE.Object3D>>();
  let aktuell: THREE.Object3D | null = null;
  let anfrage = 0;
  const gear = $('opt-gear') as HTMLInputElement, dreh = $('opt-dreh') as HTMLInputElement;

  function lade(s: Schiff) {
    if (!s.modell) return Promise.reject(new Error('kein Modell'));
    let p = cache.get(s.id);
    if (!p) {
      p = loader.loadAsync(s.modell, (ev) => {
        if (s.id !== akt.id) return;
        const total = ev.total || 0;
        const pct = total ? Math.round((ev.loaded / total) * 100) : 0;
        $('lade-b').style.width = `${pct}%`;
        $('lade-t').textContent = total ? `Lade ${s.n} · ${(total / 1048576).toFixed(1).replace('.', ',')} MB · ${pct} %` : `Lade ${s.n} …`;
      }).then((g) => bereite(g.scene, s));
      p.catch(() => cache.delete(s.id));
      cache.set(s.id, p);
    }
    return p;
  }

  // wie loadShipModels im Spiel: Nase nach −Z, Mitte in den Ursprung, auf die Länge in Metern bringen
  function bereite(inner: THREE.Object3D, s: Schiff) {
    inner.traverse((o: any) => {
      if (!o.isMesh) return;
      const m = o.material as THREE.MeshStandardMaterial;
      if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 8; m.map.needsUpdate = true; m.metalness = 0.35; m.roughness = 0.55; }
      m.envMapIntensity = 0.8;
      if (m.name.startsWith('ext_pan')) panelShader(m);
      if (m.name === 'gear') o.userData.gear = true;
    });
    inner.rotation.y = Math.PI;
    const wrap = new THREE.Group(); wrap.add(inner); wrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wrap), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    inner.position.sub(c);
    const holder = new THREE.Group();
    holder.add(wrap);
    holder.scale.setScalar(s.len / size.z);
    holder.userData.halbeHoehe = (size.y * s.len / size.z) / 2;
    return holder;
  }

  function setzeGear(obj: THREE.Object3D) {
    obj.traverse((o) => { if (o.userData.gear) o.visible = gear.checked; });
    // Höhe neu messen (mit oder ohne Fahrwerk), damit das Schiff auf dem Ring steht
    obj.position.y = 0; obj.updateMatrixWorld(true);
    const box = new THREE.Box3();
    obj.traverse((o: any) => { if (o.isMesh && o.visible && (!o.userData.gear || gear.checked)) box.expandByObject(o); });
    ring.position.y = box.isEmpty() ? -obj.userData.halbeHoehe : box.min.y - akt.len * 0.01;
  }

  function rahmen(s: Schiff, sofort: boolean) {
    const d = (s.len * 1.6 + 4) * Math.max(1, 1.35 / cam.aspect);   // schmale Bühne (Handy): weiter zurück, damit das Schiff ganz zu sehen ist
    const ziel = new THREE.Vector3(-0.8, 0.26, 0.62).normalize().multiplyScalar(d);
    cam.near = Math.max(0.05, s.len / 200); cam.far = s.len * 40; cam.updateProjectionMatrix();
    ctl.minDistance = s.len * 0.7; ctl.maxDistance = s.len * 5;
    ring.scale.setScalar(s.len * 1.25);
    if (sofort) { cam.position.copy(ziel); ctl.target.set(0, 0, 0); }
    else { flugVon.copy(cam.position); flugNach.copy(ziel); flugT = 0; }
  }
  const flugVon = new THREE.Vector3(), flugNach = new THREE.Vector3();
  let flugT = 1;
  let ersterAufruf = true;

  async function zeigeModell(s: Schiff) {
    const nr = ++anfrage;
    const lade_ = $('lade');
    let fertig = false;
    // kurze Verzögerung: Modelle aus dem Zwischenspeicher sollen nicht aufblitzen
    setTimeout(() => { if (!fertig && nr === anfrage) { lade_.classList.remove('weg'); $('lade-b').style.width = '0'; $('lade-t').textContent = `Lade ${s.n} …`; } }, 120);
    try {
      const obj = await lade(s);
      fertig = true;
      if (nr !== anfrage) return;
      if (aktuell) scene.remove(aktuell);
      aktuell = obj; scene.add(obj);
      setzeGear(obj);
      rahmen(s, ersterAufruf); ersterAufruf = false;
      lade_.classList.add('weg');
    } catch {
      fertig = true;
      if (nr !== anfrage) return;
      $('lade-t').textContent = `${s.n}: Modell konnte nicht geladen werden.`;
      lade_.classList.remove('weg');
    }
  }

  gear.addEventListener('change', () => { if (aktuell) setzeGear(aktuell); });
  dreh.addEventListener('change', () => { ctl.autoRotate = dreh.checked; });
  ctl.addEventListener('start', () => { flugT = 1; });
  $('opt-reset').addEventListener('click', () => rahmen(akt, false));

  function groesse() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);
    cam.aspect = r.width / r.height; cam.updateProjectionMatrix();
  }
  new ResizeObserver(groesse).observe(canvas);
  groesse();

  // Nur zeichnen, wenn die Ansicht zu sehen ist
  let sichtbar = true;
  new IntersectionObserver(([e]) => { sichtbar = e.isIntersecting; }).observe(canvas);
  const uhr = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(uhr.getDelta(), 0.1);
    if (!sichtbar || document.hidden) return;
    if (flugT < 1) {
      flugT = Math.min(1, flugT + dt / 0.9);
      const k = flugT * flugT * (3 - 2 * flugT);
      cam.position.lerpVectors(flugVon, flugNach, k);
      ctl.target.lerp(new THREE.Vector3(), k);
    }
    ctl.update(dt);
    renderer.render(scene, cam);
  });

  const start = byId[location.hash.slice(1)] ? location.hash.slice(1) : schiffe[0].id;
  akt = byId[start];
  zeigeWerte();
  zeigeModell(akt);
  if (start !== schiffe[0].id) document.querySelector<HTMLElement>(`.w-btn[data-id="${start}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// ---------- Plattenfugen, Nieten und Schmutz im Shader (wie panelShader in src/models/gltfShips.ts) ----------
const PANEL_PARS = /* glsl */ `
varying vec2 vPan;
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y); }
float pBrick(vec2 p, float w, float h, float off, out vec2 id) {
  float row = floor(p.y / h); float x = p.x + (mod(row, 2.0) > 0.5 ? off * w : 0.0); float col = floor(x / w); id = vec2(col, row);
  float fx = x - col * w, fy = p.y - row * h; return min(min(fx, w - fx), min(fy, h - fy)); }
`;
const PANEL_COLOR = /* glsl */ `
#include <color_fragment>
float pAa = max(max(fwidth(vPan.x), fwidth(vPan.y)), 1e-5);
vec2 pId1, pId2; float pD1 = pBrick(vPan, 1.6, 0.9, 0.5, pId1), pD2 = pBrick(vPan, 0.8, 0.45, 0.25, pId2);
float pM1 = (1.0 - smoothstep(0.009 - pAa, 0.009 + pAa, pD1)) * clamp(1.6 - pAa / 0.03, 0.0, 1.0);
float pM2 = (1.0 - smoothstep(0.005 - pAa, 0.005 + pAa, pD2)) * 0.45 * clamp(1.6 - pAa / 0.018, 0.0, 1.0);
float pMask = max(pM1, pM2);
float pBand = (1.0 - step(0.075, pD1)) * (1.0 - pM1);
float pRd = length(fract(vPan * 13.0) - 0.5) / 13.0;
float pRiv = pBand * (1.0 - smoothstep(0.0045, 0.007 + pAa, pRd)) * clamp(1.6 - pAa / 0.006, 0.0, 1.0);
float pVar = mix(0.9, 1.0, pHash(pId1));
float pGrime = mix(0.88, 1.06, pNoise(vPan * 0.7)) * mix(0.95, 1.03, pNoise(vPan * 5.0 + 17.0));
float pStreak = mix(1.0, 0.88, smoothstep(0.52, 0.78, pNoise(vec2(vPan.x * 4.0, vPan.y * 0.35) + 3.0)));
diffuseColor.rgb *= pVar * pGrime * pStreak * (1.0 - 0.48 * pMask) * (1.0 - 0.25 * pRiv);
float pHeight = (-pMask + 0.6 * pRiv) * 0.0035;
`;
const PANEL_ROUGH = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + pMask * 0.3 + (pNoise(vPan * 3.0) - 0.5) * 0.12, 0.04, 1.0);
`;
const PANEL_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
{ vec2 pdH = vec2(dFdx(pHeight), dFdy(pHeight)); vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection;
  vec3 grad = sign(det) * (pdH.x * r1 + pdH.y * r2); normal = normalize(abs(det) * normal - grad); }
`;
function panelShader(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec2 vPan;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvPan = uv;');
    sh.fragmentShader = PANEL_PARS + sh.fragmentShader.replace('#include <color_fragment>', PANEL_COLOR)
      .replace('#include <roughnessmap_fragment>', PANEL_ROUGH).replace('#include <normal_fragment_maps>', PANEL_NORMAL);
  };
  m.customProgramCacheKey = () => 'platten';
}
