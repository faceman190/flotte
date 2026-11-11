import * as THREE from 'three';
import { $ } from '../core/util';
import { voice, stopVoice, snd } from '../core/audio';
import { G } from './state';
import { world } from './world';
import { burst } from './fx';

// =====================================================================================
// Intro: Kamerafahrten durch die Spielwelt mit Texttafeln (siehe docs/story.md, „Der Prolog“).
// Sonnenfeld (Trümmer des Halden-Tors, Riss) → Heimstatt (Bastion) → Kristallbruch (Bienenstock)
// → Anflug auf den Hangar der Bastion → Schwarzblende. Esc überspringt.
// =====================================================================================
export const INTRO = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
type Path = (k: number) => { p: THREE.Vector3; l: THREE.Vector3 };
interface Shot { sector: string | null; dur: number; text: string; path?: () => Path; at?: (t: number) => void }
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const ease = (k: number) => k * k * (3 - 2 * k);

const SHOTS: Shot[] = [
  { sector: 'sonnenfeld', dur: 10, text: 'Vor 38 Jahren flog die Bastion als Vorhut durch das Halden-Tor. Elf Schiffe sollten folgen.',
    path: () => { const f = world.fields[0] || { x: 0, y: 0, z: 0, r: 900 }; const c = V(f.x, f.y, f.z), r = f.r; return k => ({ p: V(c.x + r * (1.25 - 0.5 * k), c.y + 160 - 70 * k, c.z - r * 0.5 + r * 0.8 * k), l: c }); } },
  { sector: null, dur: 8, text: 'Dann brach das Tor zusammen. Niemand kam nach. Niemand kam uns holen.',
    path: () => { const f = world.fields[0] || { x: 0, y: 0, z: 0, r: 900 }; const c = V(f.x, f.y, f.z), r = f.r; return k => ({ p: V(c.x + r * 0.75 + r * 0.25 * k, c.y + 90 + 60 * k, c.z + r * 0.3 + r * 0.2 * k), l: c }); },
    at: t => { if (t > 1.2 && !flashed) { flashed = true; flash(); } } },
  { sector: 'heimstatt', dur: 10, text: 'Wir waren die letzte Crew. Also bauten wir uns eine Flotte. Schiff für Schiff.',
    path: () => { const b = world.stations.find(s => s.id === 'bastion') || world.stations[0]; const c = V(b.x, b.y, b.z), R = b.R; return k => { const a = 0.6 + k * 0.7, d = R * (4.2 - 1.4 * k); return { p: V(c.x + Math.cos(a) * d, c.y + R * (0.9 - 0.4 * k), c.z + Math.sin(a) * d), l: c }; }; } },
  { sector: 'kristallbruch', dur: 10, text: 'Doch im Osten wartet der Schwarm. Die Ferrox fressen Metall: Erz, Wracks, Schiffe, Stationen.',
    path: () => { const h = world.enemies.find((e: any) => e.type === 'mother') || { x: 0, y: 0, z: 0 }; const c = V(h.x, h.y, h.z); return k => { const a = 2 + k * 0.5, d = 1100 - 350 * k; return { p: V(c.x + Math.cos(a) * d, c.y + 220 - 120 * k, c.z + Math.sin(a) * d), l: c }; }; } },
  { sector: 'heimstatt', dur: 9, text: 'Jahr 38 nach dem Riss. Ein neuer Jahrgang Piloten wird vereidigt.',
    path: () => { const b = world.stations.find(s => s.id === 'bastion') || world.stations[0], L = b.launch, fx = -Math.sin(L.yaw), fz = -Math.cos(L.yaw); return k => { const d = 900 - 700 * ease(k); return { p: V(L.x + fx * d + 40, L.y + 30 + 20 * (1 - k), L.z + fz * d), l: V(L.x - fx * 200, L.y - 10, L.z - fz * 200) }; }; } },
  { sector: null, dur: 4.5, text: 'Du bist einer von ihnen.' },
];

let shot = -1, t = 0, flashed = false, path: Path | null = null, build: (id: string) => void = () => {}, onDone: () => void = () => {};
export const introActive = () => G.mode === 'intro';
export function playIntro(buildSector: (id: string) => void, done: () => void) {
  build = buildSector; onDone = done; shot = -1; flashed = false;
  G.mode = 'intro';
  $('intro').classList.remove('hidden');
  $('introBlack').style.opacity = '1';
  nextShot();
}
function nextShot() {
  shot++;
  const s = SHOTS[shot];
  if (!s) { finish(); return; }
  t = 0;
  if (s.sector) build(s.sector);
  path = s.path ? s.path() : null;
  $('introBlack').style.opacity = s.path ? '0' : '1';
  const c = $('introCard');
  c.classList.remove('show'); void (c as HTMLElement).offsetWidth;
  c.textContent = s.text; c.classList.toggle('last', !s.path);
  setTimeout(() => c.classList.add('show'), 600);
  // Erzähler (falls die Aufnahme vorhanden ist): setzt ein, wenn der Text eingeblendet ist
  { const n = shot; setTimeout(() => { if (shot === n && G.mode === 'intro') voice('intro_0' + (n + 1)); }, 700); }
}
function flash() {
  const f = $('introFlash') as HTMLElement;
  f.style.transition = 'none'; f.style.opacity = '1'; void f.offsetWidth;
  f.style.transition = 'opacity 2.6s ease-out'; f.style.opacity = '0';
  const fl = world.fields[0];
  if (fl) for (let i = 0; i < 8; i++) burst(fl.x + (Math.random() - 0.5) * 300, fl.y + (Math.random() - 0.5) * 100, fl.z + (Math.random() - 0.5) * 300, i % 2 ? '#ffffff' : '#ffd27a', 120, 220, 2.5);
  snd(60, 2.2, 'sawtooth', 0.09, -40); snd(1800, 0.6, 'sine', 0.04, -1600);
}
export function updateIntro(dt: number) {
  if (G.mode !== 'intro') return;
  const s = SHOTS[shot]; if (!s) return;
  t += dt;
  const k = Math.min(1, t / s.dur);
  if (path) { const q = path(k); INTRO.pos.copy(q.p); INTRO.look.copy(q.l); }
  s.at?.(t);
  if (t > s.dur - 1.1) $('introCard').classList.remove('show');
  if (t >= s.dur) nextShot();
}
export function skipIntro() { if (G.mode === 'intro') finish(); }
function finish() {
  shot = SHOTS.length;
  stopVoice();
  $('intro').classList.add('hidden');
  $('introCard').classList.remove('show');
  onDone();
}
