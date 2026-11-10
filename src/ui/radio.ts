import { snd } from '../core/audio';
import { $ } from '../core/util';
import { G } from '../game/state';

// Funkmeldungen rechts oben unter den Aufgaben; alle Meldungen landen außerdem im Verlauf (Flottenband → Funk)
const COLORS: Record<string, string> = { SYSTEM: '#8aa0b0', LEITSTELLE: '#5fd0ff', VERKEHR: '#d0b0ff' };
export const radioLog: { who: string; text: string; col: string; t: number }[] = [];
export const radioHooks = { added: () => {} };
export function radio(who: string, text: string, col?: string) {
  const c = col || COLORS[who] || '#5fd0ff';
  radioLog.push({ who, text, col: c, t: G.time || 0 });
  if (radioLog.length > 80) radioLog.shift();
  radioHooks.added();
  const el = document.createElement('div');
  el.className = 'rl';
  el.style.borderColor = c;
  const b = document.createElement('b');
  b.style.color = c;
  b.textContent = who;
  el.appendChild(b);
  el.appendChild(document.createTextNode(text));
  const box = $('radio');
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild!.remove();
  setTimeout(() => (el.style.opacity = '0'), 8000);
  setTimeout(() => el.remove(), 8700);
  snd(1400, 0.04, 'square', 0.015);
}
export function clearRadio() { $('radio').innerHTML = ''; }
