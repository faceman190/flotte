import * as THREE from 'three';
import { renderer, gl, prePass, DEFAULT_ENV } from '../core/engine';
import { Figur, neuesSkelett, teilBox, TEIL_PLATZ, type Tracht } from '../game/figur';
import { mannyAnim } from '../game/mannyAvatar';
import { gearDef } from '../data/gear';
import { buildHandWeapon, viewModelId } from '../game/mineArt';
import { LYRA_ITEM, makeLyraGun } from '../game/lyraGuns';

// =====================================================================================
// Ansicht eines Gegenstands im Ausrüster-Terminal (seit 2026-11-24): Das Modell dreht sich langsam vor dunklem Grund.
//  - Ausrüstungsteile (Helm, Weste, Anzug, Handschuhe, Stiefel): das Teil allein, oder – „Anprobe“ – an der eigenen Figur
//  - Waffen: das Modell der Waffe
// Alles andere hat kein Modell: itemHasModel() sagt dem Terminal, ob es eine Zeichenfläche anlegen soll.
// Gezeichnet wie die Schiffsansicht der Werft (shipPreview.ts): mit dem Renderer des Spiels vor dem eigentlichen Bild (prePass).
// =====================================================================================
const sc = new THREE.Scene();
sc.background = new THREE.Color(0x0d1215);
sc.environment = DEFAULT_ENV as any;
const cam = new THREE.PerspectiveCamera(24, 1, 0.05, 60);
const key = new THREE.DirectionalLight(0xfff1dc, 3.4); key.position.set(-3, 5, 4); sc.add(key);
const fill = new THREE.DirectionalLight(0x8fb4d0, 1.4); fill.position.set(5, 1.5, 2); sc.add(fill);
const back = new THREE.DirectionalLight(0x4fd6c4, 1.6); back.position.set(0, 3, -6); sc.add(back);
sc.add(new THREE.AmbientLight(0x5a6470, 1.0));
const pivot = new THREE.Group(); sc.add(pivot);

export const itemHasModel = (id: string) => { const d = gearDef(id); return !!d && (d.kind === 'waffe' || !!(d.teil && TEIL_PLATZ[d.teil])); };

// Zwei Puppen: eine in Ruhehaltung für das Teil allein (dessen Maße gelten in dieser Haltung), eine stehend für die Anprobe
interface Puppe { root: THREE.Object3D; fig: Figur; mixer: THREE.AnimationMixer | null }
const pp: { teil: Puppe | null; probe: Puppe | null } = { teil: null, probe: null };
const asked = { teil: false, probe: false };
function puppe(k: 'teil' | 'probe') {
  if (asked[k]) return; asked[k] = true;
  neuesSkelett().then(root => { if (!root) return; root.visible = false; pivot.add(root); pp[k] = { root, fig: new Figur(root), mixer: null }; });
}
const NO_ROOT = new Set(['root']);
function pose(p: Puppe, dt: number) {
  if (!p.mixer) {
    const clips = mannyAnim()?.clips, name = clips?.names?.find((n: string) => /Stand_Idle_Loop$/.test(n));
    const c = name && clips.clip(name, { skip: NO_ROOT });
    if (c) { p.mixer = new THREE.AnimationMixer(p.root); p.mixer.clipAction(c).play(); }
  }
  p.mixer?.update(dt);
}

let cv: HTMLCanvasElement | null = null, cur = '', probe: Tracht | null = null, last = 0, t0 = 0;
let box: THREE.Box3 | null = null, boxFor = '', gun: THREE.Object3D | null = null, gunFor = '';
const _c = new THREE.Vector3(), _s = new THREE.Sphere();

/** Gegenstand zeigen. tracht: stattdessen die Figur mit dieser Ausrüstung (Anprobe) */
export function showItem(canvas: HTMLCanvasElement | null, id: string, tracht: Tracht | null = null) {
  if (!canvas || !itemHasModel(id)) { hideItem(); return; }
  cv = canvas; cur = id; probe = tracht;
  if (!t0) t0 = performance.now();
  last = 0;
  prePass.fn = draw;
}
export function hideItem() {
  if (prePass.fn === draw) prePass.fn = null;
  cv = null; cur = '';
  pp.teil?.fig.leeren(); pp.probe?.fig.leeren();
  if (gun) { gun.removeFromParent(); gun = null; gunFor = ''; }
}
function draw() {
  if (!cv || !cv.isConnected) { hideItem(); return; }
  const now = performance.now();
  if (last && now - last < 33) return;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
  last = now;
  const d = gearDef(cur); if (!d) return;
  let ready = false, r = 1;
  _c.set(0, 0, 0);
  for (const k of ['teil', 'probe'] as const) if (pp[k]) pp[k]!.root.visible = false;
  if (gun) gun.visible = false;
  if (d.kind === 'waffe') {
    if (gunFor !== cur) {
      const ly = LYRA_ITEM[cur], g = ly ? makeLyraGun(ly)?.g : buildHandWeapon(viewModelId(cur))?.g;
      if (g) { if (gun) gun.removeFromParent(); gun = g; gunFor = cur; pivot.add(g); g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.updateMatrixWorld(true); new THREE.Box3().setFromObject(g).getBoundingSphere(_s); g.userData.c = _s.center.clone(); g.userData.r = _s.radius; g.userData.ly = !!ly; }
    }
    if (gun && gunFor === cur) { gun.visible = true; ready = true; _c.copy(gun.userData.c); r = gun.userData.r * 0.86; }
  } else if (probe) {
    puppe('probe');
    const p = pp.probe;
    if (p) { p.fig.setzen(probe); pose(p, dt); if (p.fig.bereit) { p.root.visible = true; ready = true; _c.set(0, 0.93, 0); r = 1.02; } }
  } else {
    puppe('teil');
    const p = pp.teil, teil = d.teil!;
    if (p) {
      p.fig.setzen({ figur: 0, teile: { [TEIL_PLATZ[teil]]: teil } });
      if (boxFor !== teil) { boxFor = teil; box = null; teilBox(teil).then(b => { if (boxFor === teil) box = b; }); }
      if (p.fig.fertig && box) { p.root.visible = true; ready = true; box.getBoundingSphere(_s); _c.copy(_s.center); r = _s.radius * 0.9; }
    }
  }
  // Zeichenfläche in der angezeigten Größe
  const k = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(40, Math.round(cv.clientWidth * k)), h = Math.max(40, Math.round(cv.clientHeight * k));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d'); if (!ctx) return;
  if (!ready) {
    ctx.fillStyle = '#0d1215'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(147,164,177,' + (0.5 + 0.3 * Math.sin(now / 300)) + ')';
    ctx.font = '600 ' + Math.round(14 * k) + 'px "Saira Condensed", sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('MODELL WIRD GELADEN …', w / 2, h / 2);
    return;
  }
  // Drehpunkt in die Mitte des Modells; Ausschnitt in der Bildmitte mit dem Seitenverhältnis der Fläche
  pivot.position.set(0, 0, 0); pivot.rotation.y = (gun?.visible ? 1.2 : 0.5) + (now - t0) * 0.00035;
  for (const o of pivot.children) o.position.copy(_c).multiplyScalar(-1);
  const a = w / h, W = gl.width, H = gl.height;
  let cw = W, ch = W / a;
  if (ch > H) { ch = H; cw = H * a; }
  cam.aspect = W / H;
  const half = Math.atan(Math.tan(cam.fov * Math.PI / 360) * (ch / H)), halfW = Math.atan(Math.tan(half) * a);
  const dist = r / Math.sin(Math.min(half, halfW));
  cam.position.set(0, dist * 0.12, dist); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  const rt = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  renderer.render(sc, cam);
  renderer.setRenderTarget(rt);
  ctx.drawImage(gl, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, w, h);
}
