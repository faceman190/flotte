import { esc } from '../core/util';
import { snd } from '../core/audio';
import { FORM, HAUT, IRIS, HAARFARBEN, HAAR, HAAR_PLAETZE, neuesGesicht, zufallsGesicht, gesichtCode, type Gesicht } from '../data/gesicht';

// =====================================================================================
// Gesichts-Editor in der Personalakte „Neuer Pilot“ (seit 2026-11-27; docs/gesicht-editor.md). Ersetzt dort die Wahl von Figur 1–3.
// Nur hier wählbar: Danach bleibt das Gesicht (Wunsch des Spielers), die Garderobe zeigt es nur noch.
// sel.code folgt jeder Änderung; die Vorschau (figPreview.ts) liest ihn als Tracht.gesicht.
// =====================================================================================
export interface GesichtWahl { g: Gesicht; code: string }
export const neueGesichtWahl = (): GesichtWahl => { const g = neuesGesicht(); return { g, code: gesichtCode(g) }; };

const rgb = (c: [number, number, number]) => `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
const tick = () => snd(760, 0.05, 'sine', 0.03, 200);

export function gesichtEditor(containerId: string, sel: GesichtWahl, n0 = 2) {
  const el = document.getElementById(containerId)!;
  const nr = (k: number) => String(n0 + k).padStart(2, '0');
  const slider = (id: string, label: string, min: number, max: number) =>
    `<label class="gxR"><span>${esc(label)}</span><input type="range" min="${min}" max="${max}" step="1" data-r="${id}"><em data-v="${id}"></em></label>`;
  el.innerHTML = `
    <section class="ccSec"><div class="ccSecH"><i>${nr(0)}</i>Gesicht<span class="ccSel"><button class="gxB" data-a="zuf">Zufall</button><button class="gxB" data-a="rst">Zurücksetzen</button></span></div>
      <div class="gxH">Hautton</div>
      <div class="gxSw" data-g="haut">${HAUT.map((c, i) => `<span class="sw" data-i="${i}" style="background:${rgb(c)}"></span>`).join('')}</div>
      ${slider('haut', 'Feinton', 0, 100)}
      <div class="gxH">Augenfarbe</div>
      <div class="gxSw" data-g="iris">${IRIS.map(([c, n]) => `<span class="sw" data-c="${c}" title="${esc(n)}" style="background:${c}"></span>`).join('')}</div>
      <p class="ccHint">Dein Gesicht legst du nur hier fest. Später lässt es sich nicht mehr ändern, auch nicht an der Garderobe.</p></section>
    <section class="ccSec"><div class="ccSecH"><i>${nr(1)}</i>Kopfform</div>
      ${FORM.map(([grp, list]) => `<details class="gxD"><summary>${esc(grp)}</summary>${list.map(([k, l]) => slider('f_' + k, l, -100, 100)).join('')}</details>`).join('')}</section>
    <section class="ccSec"><div class="ccSecH"><i>${nr(2)}</i>Haare</div>
      ${HAAR_PLAETZE.map(p => `<label class="gxR"><span>${esc(HAAR[p].n)}</span><select data-p="${p}">${[HAAR[p].ohne, ...HAAR[p].opts.map(o => o[1])].map((l, i) => `<option value="${i}">${esc(l)}</option>`).join('')}</select></label>`).join('')}
      <div class="gxH">Haarfarbe</div>
      <div class="gxSw" data-g="haar">${HAARFARBEN.map(([c, n], i) => `<span class="sw" data-i="${i}" title="${esc(n)}" style="background:${c}"></span>`).join('')}</div></section>`;

  const q = <T extends Element>(s: string) => [...el.querySelectorAll<T>(s)];
  const changed = () => { sel.code = gesichtCode(sel.g); };
  // Anzeige aus sel.g
  const zeigen = () => {
    const g = sel.g;
    for (const inp of q<HTMLInputElement>('input[data-r]')) {
      const id = inp.dataset.r!, v = id === 'haut' ? g.haut : Math.round((g.form[id.slice(2)] || 0) * 100);
      inp.value = String(v); el.querySelector(`[data-v="${id}"]`)!.textContent = String(v);
    }
    for (const s of q<HTMLSelectElement>('select[data-p]')) s.value = String(g.wahl[s.dataset.p as keyof Gesicht['wahl']]);
    q<HTMLElement>('[data-g="iris"] .sw').forEach(s => s.classList.toggle('on', s.dataset.c === g.iris));
    q<HTMLElement>('[data-g="haar"] .sw').forEach(s => s.classList.toggle('on', +s.dataset.i! === g.haar));
    const hs = Math.round(g.haut / 100 * (HAUT.length - 1));
    q<HTMLElement>('[data-g="haut"] .sw').forEach(s => s.classList.toggle('on', +s.dataset.i! === hs));
  };
  for (const inp of q<HTMLInputElement>('input[data-r]')) inp.oninput = () => {
    const id = inp.dataset.r!, v = +inp.value;
    if (id === 'haut') sel.g.haut = v; else sel.g.form[id.slice(2)] = v / 100;
    el.querySelector(`[data-v="${id}"]`)!.textContent = String(v);
    if (id === 'haut') zeigen();
    changed();
  };
  for (const s of q<HTMLSelectElement>('select[data-p]')) s.onchange = () => { sel.g.wahl[s.dataset.p as keyof Gesicht['wahl']] = +s.value; tick(); changed(); };
  q<HTMLElement>('[data-g="haut"] .sw').forEach(s => s.onclick = () => { sel.g.haut = Math.round(+s.dataset.i! / (HAUT.length - 1) * 100); tick(); zeigen(); changed(); });
  q<HTMLElement>('[data-g="iris"] .sw').forEach(s => s.onclick = () => { sel.g.iris = s.dataset.c!; tick(); zeigen(); changed(); });
  q<HTMLElement>('[data-g="haar"] .sw').forEach(s => s.onclick = () => { sel.g.haar = +s.dataset.i!; tick(); zeigen(); changed(); });
  el.querySelector<HTMLButtonElement>('[data-a="zuf"]')!.onclick = () => { sel.g = zufallsGesicht(); tick(); zeigen(); changed(); };
  el.querySelector<HTMLButtonElement>('[data-a="rst"]')!.onclick = () => { sel.g = neuesGesicht(); tick(); zeigen(); changed(); };
  zeigen(); changed();
}
