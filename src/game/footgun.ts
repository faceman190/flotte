import { snd, sfx, sfxAny, gunSounds, gunPart, type GunKind } from '../core/audio';
import { mouse } from '../core/input';
import { clamp } from '../core/util';
import { warmFlips } from './footfx';
import { P } from './state';

// Magazin der Handwaffe zu Fuß (seit Alpha 1.54, mit der neuen Ringanzeige): Planeten und Minen teilen sich denselben Stand.
// Der Vorrat ist unbegrenzt, nur das Magazin zählt. Leer lädt die Waffe von selbst nach, R lädt früher nach. Der Schneidbrenner (ohne Waffe)
// läuft mit Energie und braucht kein Magazin.
const MAG: Record<string, number> = { waffe_pistole: 12, waffe_smg: 40, waffe_karabiner: 30, waffe_flinte: 6, waffe_impuls: 24, waffe_splitter: 20 };
const RELOAD: Record<string, number> = { waffe_smg: 1.6, waffe_flinte: 2.2, waffe_karabiner: 1.8, waffe_splitter: 1.9 };
// Patronenwaffen laden hörbar nach (Aufnahmen des Lyra-Pakets, audio.ts): Magazin heraus, Magazin hinein, Verschluss – zu den Zeitpunkten,
// an denen die Figur in der Außensicht danach greift (Anteil der Nachladezeit). Energiewaffen behalten die alten Töne.
const KIND: Record<string, GunKind> = { waffe_pistole: 'pistol', waffe_karabiner: 'rifle', waffe_flinte: 'shotgun', waffe_smg: 'rifle' };
const PARTS: ['out' | 'in' | 'end', number][] = [['out', 0.12], ['in', 0.55], ['end', 0.86]];
export const GUN = { id: '?', mag: 0, max: 0, reload: 0, reloadT: 1.5, kind: undefined as GunKind | undefined, part: 0 };

export function gunSync() {
  const id = P.gear?.waffe || '';
  if (id === GUN.id) return;
  GUN.id = id; GUN.max = MAG[id] ?? 0; GUN.mag = GUN.max; GUN.reload = 0; GUN.reloadT = RELOAD[id] ?? 1.5;
  if (GUN.id !== '?' && GUN.kind !== KIND[id]) sfxAny('w_x_swap', 3, 0.4);      // andere Waffe in der Hand
  GUN.kind = KIND[id]; gunSounds(GUN.kind); warmFlips();
}
// darf jetzt geschossen werden? (leeres Magazin startet das Nachladen)
export function gunReady(): boolean {
  gunSync();
  if (GUN.reload > 0) return false;
  if (GUN.max && GUN.mag <= 0) { gunReload(); return false; }
  return true;
}
export function gunFired() { if (GUN.max) { GUN.mag = Math.max(0, GUN.mag - 1); if (GUN.mag === 0) gunReload(); } }
export function gunReload() {
  gunSync();
  if (!GUN.max || GUN.reload > 0 || GUN.mag >= GUN.max) return;
  GUN.reload = GUN.reloadT; GUN.part = 0;
  if (!GUN.kind) sfx('gear', 0.25, 1.6, () => snd(260, 0.08, 'triangle', 0.03, -60));
}
export function gunUpdate(dt: number) {
  gunSync();      // läuft zu Fuß in jedem Bild: Die Aufnahmen der Waffe sind so vor dem ersten Schuss geladen
  if (GUN.reload <= 0) return;
  GUN.reload -= dt;
  if (GUN.kind) { const p = 1 - GUN.reload / GUN.reloadT; while (GUN.part < PARTS.length && p >= PARTS[GUN.part][1]) gunPart(GUN.kind, PARTS[GUN.part++][0]); }
  if (GUN.reload <= 0) { GUN.reload = 0; GUN.mag = GUN.max; if (!GUN.kind) snd(520, 0.05, 'triangle', 0.025, 80); }
}
export const gunMode = (w: { n: number; auto: boolean }) => (w.n > 1 ? 'Schrot' : w.auto ? 'Dauerfeuer' : 'Einzelfeuer');

// =====================================================================================
// Zielen, Kamera und Rückmeldungen zu Fuß (seit 2026-11-23, Planet und Mine gemeinsam). Werte und Aufnahmen aus dem Lyra-Paket (docs/lyra.md).
//  · Zielen: rechte Maustaste halten. Die Kamera rückt in 0,22 s näher an die Schulter (avatar.ts tpCamPos), das Sichtfeld wird im
//    Verhältnis von Lyras Zielkamera enger (dort 80° → 70° waagerecht), die Figur nimmt die Waffe in den Anschlag, die Streuung sinkt
//    auf 65 % (lyra.json, spread.mult.Aiming).
//  · Kamerawackeln: kurzer Stoß bei eigenem Treffer und beim Schuss der Flinte.
//  · Abschüsse in Folge (innerhalb von 4 s) zählen hoch; die Anzeige (ui/footHud.ts) zeigt Doppel-, Dreifach- und Vierfachabschuss.
// =====================================================================================
export const AIM = { k: 0, on: false, shake: 0, at: 0 };
const ZOOM = Math.tan(35 * Math.PI / 180) / Math.tan(40 * Math.PI / 180);
/** je Bild, solange zu Fuß gekämpft werden kann; can: nicht gefallen */
export function aimUpdate(dt: number, can: boolean) {
  const on = can && mouse.right && GUN.reload <= 0;
  if (on !== AIM.on) { AIM.on = on; sfxAny(on ? 'w_x_zin' : 'w_x_zout', 3, 0.3); }
  AIM.k = clamp(AIM.k + (on ? 1 : -1) * dt / 0.22, 0, 1);
  AIM.shake = Math.max(0, AIM.shake - dt * 3.2);
  AIM.at = performance.now();
}
/** Anteil des Zielens 0..1, weich; 0, wenn gerade nicht zu Fuß gekämpft wird (Station, Schiff) */
export const aimK = () => (performance.now() - AIM.at < 250 ? AIM.k * AIM.k * (3 - 2 * AIM.k) : 0);
export const aimFov = (base: number) => 2 * Math.atan(Math.tan(base * Math.PI / 360) * (1 + (ZOOM - 1) * aimK())) * 180 / Math.PI;
export const aimSpread = () => 1 - 0.35 * aimK();
export function camShake(a: number) { AIM.shake = Math.min(1, Math.max(AIM.shake, a)); }
/** nach dem Setzen der Kameradrehung aufrufen */
export function aimShake(r: { x: number; y: number; z: number }) {
  const s = AIM.shake * AIM.shake; if (s < 1e-4) return;
  const t = performance.now() / 1000;
  r.x += Math.sin(t * 61) * s * 0.016; r.y += Math.sin(t * 47 + 1.3) * s * 0.014; r.z = Math.sin(t * 53 + 0.7) * s * 0.01;
}
/** eigener Treffer: Aufnahme und Kamerastoß (nur bei einem richtigen Treffer, nicht bei Schaden je Bild wie Gas) */
export function hurtSound(d: number) {
  const old = () => sfx('hull_hit' + Math.floor(Math.random() * 3), 0.5, 1.2, () => snd(120, 0.15, 'sawtooth', 0.06, -40));
  if (d < 1) { old(); return; }
  sfxAny('w_x_hurt', 4, 0.6, 1, old); camShake(0.5);
}
export const KILL = { n: 0, at: -1e9 };
/** eigener Abschuss */
export function noteKill() {
  const now = performance.now();
  KILL.n = now - KILL.at < 4000 ? KILL.n + 1 : 1; KILL.at = now;
  sfxAny('w_x_kill', 4, 0.32);
}
/** ein feindliches Geschoss fliegt dicht vorbei (d: Abstand zum Oberkörper in m): einmal je Geschoss */
export function whiz(b: object, d: number) {
  if (d > 2.4 || (b as any).wz) return;
  (b as any).wz = true; sfxAny('w_x_whiz', 6, 0.45);
}
