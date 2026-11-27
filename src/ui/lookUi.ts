import { esc } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame } from '../game/state';
import { IN } from '../game/interior';
import { figTracht, trachtOf } from '../game/avatar';
import { FIGUREN, figurDef, normFigur } from '../game/figur';
import { showFig, hideFig, figView, figRotate, figPortrait } from './figPreview';

// =====================================================================================
// Auswahl der Spielerfigur (seit 2026-11-24: drei Figuren aus dem Paket „Spielcharakter“, game/figur.ts; vorher Gesicht und
// Uniformfarbe der Soldatenfigur). Für „Neuer Pilot“ (menus.ts) und die Garderobe.
// Kacheln mit Standbildern der echten Figur (figPortrait), Auswahl ohne Neuaufbau der Liste.
// =====================================================================================
const $ = (id: string) => document.getElementById(id)!;

// Standbilder der Köpfe (einmal gezeichnet, danach aus dem Speicher)
const PIC: Record<string, string> = {};
function pic(el: HTMLElement, key: string, figur: number) {
  const set = (u: string) => el.querySelectorAll<HTMLElement>(`[data-pic="${key}"]`).forEach(p => { p.style.backgroundImage = `url(${u})`; p.classList.add('ok'); });
  if (PIC[key]) return set(PIC[key]);
  if (PIC[key] === '') return;      // schon bestellt
  PIC[key] = '';
  figPortrait({ figur, teile: {} }, 'kopf', u => { PIC[key] = u; document.querySelectorAll<HTMLElement>(`[data-pic="${key}"]`).forEach(p => { p.style.backgroundImage = `url(${u})`; p.classList.add('ok'); }); });
}

/** Kacheln der Figuren in den Behälter schreiben; sel.figur folgt der Auswahl */
export function figurPicker(containerId: string, sel: { figur: number }, changed: () => void, n0 = 1) {
  const el = $(containerId);
  el.innerHTML = `
    <section class="ccSec"><div class="ccSecH"><i>${String(n0).padStart(2, '0')}</i>Figur<span class="ccSel" data-sel="n">${esc(figurDef(sel.figur).n)}</span></div>
      <div class="ccTiles">${FIGUREN.map(f => `<button class="ccTile${sel.figur === f.id ? ' on' : ''}" data-k="${f.id}">
        <span class="pt" data-pic="fig${f.id}"></span><span class="nm">${esc(f.n)}</span></button>`).join('')}</div>
      <p class="ccHint" data-sel="d">${esc(figurDef(sel.figur).d)}</p></section>`;
  FIGUREN.forEach(f => pic(el, 'fig' + f.id, f.id));
  el.querySelectorAll<HTMLButtonElement>('.ccTile').forEach(b => {
    b.onclick = () => {
      sel.figur = normFigur(+b.dataset.k!);
      el.querySelectorAll<HTMLElement>('[data-k]').forEach(x => x.classList.toggle('on', +x.dataset.k! === sel.figur));
      el.querySelector('[data-sel="n"]')!.textContent = figurDef(sel.figur).n;
      el.querySelector('[data-sel="d"]')!.textContent = figurDef(sel.figur).d;
      snd(760, 0.05, 'sine', 0.03, 200);
      changed();
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
  return () => { setSeg(0); figView(0); };
}

// ---------- Garderobe: im Flottenband (Ausrüstung) in Stationen ----------
const tmp = { figur: 1 };
const grReset = stageTools('garderobe');
export const garderobeOpen = () => !$('garderobe').classList.contains('hidden');
export const garderobeHere = () => !!G.dockedAt || IN.active;   // angedockt oder zu Fuß in einer Station oder im Schiff
export function openGarderobe() {
  tmp.figur = normFigur(P.figur);
  // Mit eigenem Gesicht gibt es hier nichts zu wählen (Gesicht nur bei „Neuer Pilot“, seit 2026-11-27); ältere Spielstände behalten Figur 1–3
  if (P.gesicht) $('grLook').innerHTML = '<section class="ccSec"><div class="ccSecH"><i>01</i>Gesicht</div><p class="ccHint">Dein Gesicht hast du beim Dienstantritt festgelegt. Es lässt sich nicht mehr ändern.</p></section>';
  else figurPicker('grLook', tmp, () => {});
  $('garderobe').classList.remove('hidden');
  $('grTag').textContent = P.name || 'Pilot';
  grReset();
  showFig('grFig', () => trachtOf(tmp.figur, P.gear, P.gesicht));
  sfx('ui_open', 0.4);
}
function closeGarderobe() {
  $('garderobe').classList.add('hidden'); hideFig();
  if (document.getElementById('invFig')) showFig('invFig', figTracht);   // zurück zur Ausrüstung im Flottenband: deren Vorschau weiter
}
$('grBack').onclick = () => { closeGarderobe(); sfx('ui_close', 0.4); };
$('grOk').onclick = () => { if (!P.gesicht) P.figur = tmp.figur; saveGame(); closeGarderobe(); sfx('ui_confirm', 0.5, 1, () => snd(700, 0.12, 'sine', 0.05, 200)); };
