import { snd, sfx, gunSounds, gunPart, type GunKind } from '../core/audio';
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
  GUN.kind = KIND[id]; if (GUN.kind) gunSounds(GUN.kind);
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
