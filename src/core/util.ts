// Kleine Helfer, die überall gebraucht werden
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const d3 = (a: number, b: number, c: number, x: number, y: number, z: number) => Math.hypot(a - x, b - y, c - z);
export const fmtN = (n: number) => Math.round(n).toLocaleString('de-DE');
export const fmtD = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
export const $ = (id: string) => document.getElementById(id) as HTMLElement;
export const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Deterministischer Zufall: jeder Sektor sieht für alle Spieler gleich aus (wichtig für späteren Mehrspieler)
export function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  const next = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };
  return {
    next,
    range: (a: number, b: number) => a + next() * (b - a),
    pick: <T>(a: T[]): T => a[Math.floor(next() * a.length)],
  };
}
