import { esc } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame } from '../game/state';
import { IN } from '../game/interior';
import { figGear } from '../game/avatar';
import { LOOK_KOEPFE, LOOK_FARBEN, normLook, type Look } from '../game/mineArt';
import { showFig, hideFig, figView, figRotate, figPortrait } from './figPreview';

// =====================================================================================
// Auswahl des Aussehens (seit 2026-11-20): Gesicht und Uniformfarbe. Für „Neuer Pilot“ (menus.ts) und die Garderobe.
// Kacheln mit Standbildern der echten Figur (figPortrait), Auswahl ohne Neuaufbau der Liste.
// =====================================================================================
const $ = (id: string) => document.getElementById(id)!;

// Standbilder: Gesicht je Kopf, Brust je Uniformfarbe (einmal gezeichnet, danach aus dem Speicher)
const PIC: Record<string, string> = {};
function pic(el: HTMLElement, key: string, look: Look, part: 'kopf' | 'brust') {
  const set = (u: string) => el.querySelectorAll<HTMLElement>(`[data-pic="${key}"]`).forEach(p => { p.style.backgroundImage = `url(${u})`; p.classList.add('ok'); });
  if (PIC[key]) return set(PIC[key]);
  PIC[key] = '';
  figPortrait({ anzug: 'anzug_overall', look: { ...look } }, part, u => { PIC[key] = u; set(u); });
}

export function lookPicker(containerId: string, look: Look, changed: () => void, n0 = 1) {
  const el = $(containerId);
  const nr = (i: number) => String(n0 + i).padStart(2, '0');
  const kName = () => LOOK_KOEPFE.find(k => k.k === look.kopf)?.n || '';
  el.innerHTML = `
    <section class="ccSec"><div class="ccSecH"><i>${nr(0)}</i>Gesicht<span class="ccSel" data-sel="k">${esc(kName())}</span></div>
      <div class="ccTiles">${LOOK_KOEPFE.map(k => `<button class="ccTile${look.kopf === k.k ? ' on' : ''}" data-k="${k.k}">
        <span class="pt" data-pic="k${k.k}"></span><span class="nm">${esc(k.n)}</span></button>`).join('')}</div></section>
    <section class="ccSec"><div class="ccSecH"><i>${nr(1)}</i>Uniform<span class="ccSel" data-sel="f">${esc(LOOK_FARBEN[look.farbe].n)}</span></div>
      <div class="ccTiles four">${LOOK_FARBEN.map((f, i) => `<button class="ccTile${look.farbe === i ? ' on' : ''}" data-f="${i}">
        <span class="pt" data-pic="f${i}" style="--c:${f.c}"></span><span class="nm"><span class="sw" style="background:${f.c}"></span>${esc(f.n)}</span></button>`).join('')}</div></section>`;
  LOOK_KOEPFE.forEach(k => pic(el, 'k' + k.k, { kopf: k.k, farbe: look.farbe }, 'kopf'));
  LOOK_FARBEN.forEach((_, i) => pic(el, 'f' + i, { kopf: look.kopf, farbe: i }, 'brust'));
  const mark = () => {
    el.querySelectorAll<HTMLElement>('[data-k]').forEach(b => b.classList.toggle('on', +b.dataset.k! === look.kopf));
    el.querySelectorAll<HTMLElement>('[data-f]').forEach(b => b.classList.toggle('on', +b.dataset.f! === look.farbe));
    el.querySelector('[data-sel="k"]')!.textContent = kName();
    el.querySelector('[data-sel="f"]')!.textContent = LOOK_FARBEN[look.farbe].n;
  };
  el.querySelectorAll<HTMLButtonElement>('.ccTile').forEach(b => {
    b.onclick = () => {
      const k = b.dataset.k, f = b.dataset.f;
      if (k) { look.kopf = +k; figView(1); }                  // Gesicht gewählt: Kamera geht nah heran
      if (f) { look.farbe = +f; figView(0); }                 // Uniform: ganze Figur
      snd(760, 0.05, 'sine', 0.03, 200);
      mark(); changed();
    };
  });
}

// Bühne der Vorschau: Umschalter Ganzkörper/Gesicht und Drehknöpfe (gedrückt halten). Einmal je Fenster verdrahten.
export function stageTools(rootId: string) {
  const root = $(rootId);
  const seg = root.querySelectorAll<HTMLButtonElement>('.ccSeg button');
  const setSeg = (v: number) => seg.forEach(b => b.classList.toggle('on', +b.dataset.v! === v));
  seg.forEach(b => b.onclick = () => { figView(+b.dataset.v!); setSeg(+b.dataset.v!); snd(700, 0.04, 'sine', 0.025, 200); });
  root.querySelectorAll<HTMLButtonElement>('.ccRot button').forEach(b => {
    const d = +b.dataset.r!;
    b.onpointerdown = e => { b.setPointerCapture(e.pointerId); figRotate(d); };
    b.onpointerup = b.onpointercancel = b.onlostpointercapture = () => figRotate(0);
  });
  // Umschalter folgt der Kamera, wenn eine Kachel sie verstellt
  root.addEventListener('click', e => {
    const t = (e.target as HTMLElement).closest<HTMLElement>('.ccTile'); if (!t) return;
    setSeg(t.dataset.k ? 1 : 0);
  });
  return () => setSeg(0);
}

// ---------- Garderobe: im Flottenband (Ausrüstung) in Stationen ----------
let tmp: Look = normLook(null);
const grReset = stageTools('garderobe');
export const garderobeHere = () => !!G.dockedAt || IN.active;   // angedockt oder zu Fuß in einer Station oder im Schiff
export function openGarderobe() {
  tmp = normLook(P.look);
  lookPicker('grLook', tmp, () => {});
  $('garderobe').classList.remove('hidden');
  $('grTag').textContent = P.name || 'Pilot';
  grReset();
  showFig('grFig', () => ({ ...(P.gear || {}), look: tmp }));
  sfx('ui_open', 0.4);
}
function closeGarderobe() {
  $('garderobe').classList.add('hidden'); hideFig();
  if (document.getElementById('invFig')) showFig('invFig', figGear);   // zurück zur Ausrüstung im Flottenband: deren Vorschau weiter
}
$('grBack').onclick = () => { closeGarderobe(); sfx('ui_close', 0.4); };
$('grOk').onclick = () => { P.look = { ...tmp }; saveGame(); closeGarderobe(); sfx('ui_confirm', 0.5, 1, () => snd(700, 0.12, 'sine', 0.05, 200)); };
