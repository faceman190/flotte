import { esc } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame } from '../game/state';
import { IN } from '../game/interior';
import { figGear } from '../game/avatar';
import { LOOK_KOEPFE, LOOK_FARBEN, normLook, type Look } from '../game/mineArt';
import { showFig, hideFig } from './figPreview';

// =====================================================================================
// Auswahl des Aussehens (seit 2026-11-20): Gesicht und Uniformfarbe. Für „Neuer Pilot“ (menus.ts) und die Garderobe.
// =====================================================================================
const $ = (id: string) => document.getElementById(id)!;

export function lookPicker(containerId: string, look: Look, changed: () => void) {
  const el = $(containerId);
  const row = (lb: string, items: string) => `<div class="lookRow"><div class="lb">${lb}</div><div class="lookOpts">${items}</div></div>`;
  el.innerHTML = row('Gesicht', LOOK_KOEPFE.map(k => `<button data-k="${k.k}" class="${look.kopf === k.k ? 'on' : ''}">${esc(k.n)}</button>`).join(''))
    + row('Uniform', LOOK_FARBEN.map((f, i) => `<button data-f="${i}" class="${look.farbe === i ? 'on' : ''}"><span class="sw" style="background:${f.c}"></span>${esc(f.n)}</button>`).join(''));
  el.querySelectorAll('button').forEach(b => (b as HTMLButtonElement).onclick = () => {
    const k = (b as HTMLElement).dataset.k, f = (b as HTMLElement).dataset.f;
    if (k) look.kopf = +k; if (f) look.farbe = +f;
    snd(760, 0.05, 'sine', 0.03, 200);
    lookPicker(containerId, look, changed); changed();
  });
}

// ---------- Garderobe: im Flottenband (Ausrüstung) in Stationen ----------
let tmp: Look = normLook(null);
export const garderobeHere = () => !!G.dockedAt || IN.active;   // angedockt oder zu Fuß in einer Station oder im Schiff
export function openGarderobe() {
  tmp = normLook(P.look);
  lookPicker('grLook', tmp, () => {});
  $('garderobe').classList.remove('hidden');
  showFig('grFig', () => ({ ...(P.gear || {}), look: tmp }));
  sfx('ui_open', 0.4);
}
function closeGarderobe() {
  $('garderobe').classList.add('hidden'); hideFig();
  if (document.getElementById('invFig')) showFig('invFig', figGear);   // zurück zur Ausrüstung im Flottenband: deren Vorschau weiter
}
$('grBack').onclick = () => { closeGarderobe(); sfx('ui_close', 0.4); };
$('grOk').onclick = () => { P.look = { ...tmp }; saveGame(); closeGarderobe(); sfx('ui_confirm', 0.5, 1, () => snd(700, 0.12, 'sine', 0.05, 200)); };
