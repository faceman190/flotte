import { $ } from '../core/util';
import { warm } from '../core/engine';

// =====================================================================================
// Übergänge vom Hauptmenü ins Spiel (seit 2026-11-23). Vorher: harter Schnitt, schwarzes Ladebild mit einem Wort, alles auf einmal da.
//   Weiterspielen:  Menü gleitet weg → Schwarz → Systemstart (Zeilen des Bordsystems, die letzte wartet wirklich auf das Laden)
//                   → Bild geht auf, die Anzeige schaltet sich Teil für Teil ein (hud.ts, hudBootStart)
//   Neues Spiel:    Personalakte blendet aus → Schwarz → Intro; am Ende bleibt die letzte Tafel stehen, bis der Hangar geladen ist,
//                   dann geht das Bild langsam auf (intro.ts, finish) – ein Schwarz statt zwei mit Ladewort dazwischen
// Die Abdeckung (#cover) liegt über allem, auch über der Blende des Vorwärmens (engine.ts: warm.cover schaltet deren Ladewort ab).
// START.on = false (Prüfskripte, scripts/probelauf.js): ohne Übergänge, das Spiel beginnt wie früher im selben Augenblick.
// =====================================================================================
export const START = { on: true };
export const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
// zwei Bilder abwarten (damit Gezeichnetes sicher im Bild steht); im Hintergrund, wo der Browser keine Bilder zeichnet, nach 120 ms weiter
export const frames = () => new Promise<void>(r => { let d = false; const go = () => { if (!d) { d = true; r(); } }; requestAnimationFrame(() => requestAnimationFrame(go)); setTimeout(go, 120); });

let busy = false;
export const startBusy = () => busy;

/** Menü oder Personalakte ausblenden und auf Schwarz gehen. Fertig, wenn das Bild schwarz ist; false, wenn schon ein Übergang läuft. */
export async function leaveToBlack(id: 'menu' | 'newGame'): Promise<boolean> {
  if (busy) return false;
  busy = true;
  const el = $(id), c = $('cover');
  $('coverLog').replaceChildren();
  if (!START.on) { el.classList.add('hidden'); return true; }
  el.classList.add('leaving');
  await wait(id === 'menu' ? 600 : 220);      // Menü: erst gleiten die Knöpfe weg, das Bild steht einen Augenblick frei
  c.classList.remove('open'); c.classList.add('on');
  await wait(560);
  el.classList.add('hidden'); el.classList.remove('leaving');
  return true;
}

// ---------- Systemstart: Zeilen des Bordsystems auf der Abdeckung ----------
const div = (cls: string, text: string, delay = 0) => { const d = document.createElement('div'); d.className = cls; d.textContent = text; if (delay) d.style.animationDelay = delay + 's'; return d; };
let lastState: HTMLElement | null = null, welcomeEl: HTMLElement | null = null;
/** rows: feste Zeilen (gleich „bereit“); last: die Zeile, die auf das Laden wartet (bootReady) */
export function bootLog(head: string, sub: string, rows: string[], last: string, welcome: string) {
  if (!START.on) return;
  const log = $('coverLog');
  log.replaceChildren(div('h', head), div('s', sub));
  rows.concat(last).forEach((t, i) => {
    const r = div('r', '', 0.15 + i * 0.17), a = document.createElement('span'), b = document.createElement('b');
    a.textContent = t;
    if (i < rows.length) { b.textContent = 'bereit'; b.style.animationDelay = 0.4 + i * 0.17 + 's'; }
    else { b.textContent = 'lädt'; b.className = 'busy'; lastState = b; }
    r.append(a, b); log.appendChild(r);
  });
  welcomeEl = div('w', welcome); welcomeEl.style.display = 'none';
  log.appendChild(welcomeEl);
}
export function bootReady() {
  if (lastState) { lastState.className = ''; lastState.style.animation = 'none'; lastState.style.opacity = '1'; lastState.textContent = 'bereit'; lastState = null; }
  if (welcomeEl) { welcomeEl.style.display = ''; welcomeEl = null; }
}

/** Abdeckung öffnen: Das Bild dahinter erscheint. */
export async function openCover() {
  const c = $('cover');
  busy = false;
  if (!c.classList.contains('on')) return;
  c.classList.add('open'); c.classList.remove('on');
  await wait(1150);
  if (!c.classList.contains('on')) { c.classList.remove('open'); $('coverLog').replaceChildren(); }
}

/** Warten, bis hinter der Abdeckung alles geladen und vorgewärmt ist. Danach laufen ein paar Bilder: Tauscht ein Innenraum dabei noch
 *  ein nachgeladenes Modell aus (Hangar, Deck), beginnt ein neues Vorwärmen, und das wird auch noch abgewartet. */
export async function settled(maxMs = 14000) {
  if (!START.on) return;
  const t0 = performance.now();
  for (;;) {
    const w = warm.last;
    if (warm.hold && w) await Promise.race([w, wait(maxMs)]);
    await wait(280);
    if ((!warm.hold && warm.last === w) || performance.now() - t0 > maxMs) break;
  }
}

// ---------- Anzeige erst nach dem Bild ----------
/** Aufgaben, Funk, Steuerungsleiste, Dialog ausblenden; ui: auch die gezeichnete Anzeige (zu Fuß) */
export function hudOff(ui = false) { if (START.on) { document.body.classList.add('hudoff'); document.body.classList.toggle('uioff', ui); } }
/** nach ms weich hereinholen */
export function hudIn(ms = 0) {
  setTimeout(() => {
    const b = document.body.classList;
    if (!b.contains('hudoff') && !b.contains('uioff')) return;
    b.remove('hudoff', 'uioff'); b.add('hudin');
    setTimeout(() => b.remove('hudin'), 800);
  }, ms);
}
