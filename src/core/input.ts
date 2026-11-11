import { gl, view } from './engine';

export const keys: Record<string, boolean> = {};
export const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
export const actions = { rocket: false };
// Freie Kamera im Flug: free = Maus dreht die Kamera statt das Schiff (dx/dy sammeln die Bewegung), mid = mittlere Maustaste, wheel = Mausrad-Schritte
export const look = { free: false, dx: 0, dy: 0, mid: false, wheel: 0 };
const handlers: ((code: string) => void)[] = [];

export function onKey(h: (code: string) => void) { handlers.push(h); }
export function centerMouse() { mouse.x = view.W / 2; mouse.y = view.H / 2; }
export function releaseAll() { for (const k in keys) keys[k] = false; mouse.down = false; actions.rocket = false; look.mid = false; }

addEventListener('keydown', e => {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT') return;
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'Tab' || e.code === 'F1') e.preventDefault();
  // Strg ist im Flug „runter“: Browser-Kürzel wie Strg+S oder Strg+D abfangen (Strg+W lässt sich nicht abfangen)
  if (e.ctrlKey && !e.altKey && document.body.classList.contains('playing') && e.code.startsWith('Key')) e.preventDefault();
  if (e.repeat) return;
  for (const h of handlers) h(e.code);
});
addEventListener('keyup', e => { keys[e.code] = false; });
gl.addEventListener('mousemove', e => {
  // freie Kamera: der Zeiger fürs Lenken bleibt stehen, die Bewegung dreht nur die Kamera
  if (look.free) { look.dx += e.movementX || 0; look.dy += e.movementY || 0; return; }
  mouse.x = e.clientX; mouse.y = e.clientY;
});
gl.addEventListener('wheel', e => { look.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
gl.addEventListener('mousedown', e => {
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) actions.rocket = true;
  if (e.button === 1) { look.mid = true; e.preventDefault(); }   // kein automatisches Scrollen
});
gl.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; if (e.button === 1) look.mid = false; });
document.addEventListener('mouseleave', centerMouse);
addEventListener('blur', () => { releaseAll(); centerMouse(); });
