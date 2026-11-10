import { gl, view } from './engine';

export const keys: Record<string, boolean> = {};
export const mouse = { x: innerWidth / 2, y: innerHeight / 2, down: false };
export const actions = { rocket: false };
const handlers: ((code: string) => void)[] = [];

export function onKey(h: (code: string) => void) { handlers.push(h); }
export function centerMouse() { mouse.x = view.W / 2; mouse.y = view.H / 2; }
export function releaseAll() { for (const k in keys) keys[k] = false; mouse.down = false; actions.rocket = false; }

addEventListener('keydown', e => {
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'SELECT') return;
  keys[e.code] = true;
  if (e.code === 'Space' || e.code === 'Tab' || e.code === 'F1') e.preventDefault();
  if (e.repeat) return;
  for (const h of handlers) h(e.code);
});
addEventListener('keyup', e => { keys[e.code] = false; });
gl.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
gl.addEventListener('mousedown', e => {
  if (e.button === 0) mouse.down = true;
  if (e.button === 2) actions.rocket = true;
});
gl.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
document.addEventListener('mouseleave', centerMouse);
addEventListener('blur', () => { releaseAll(); centerMouse(); });
