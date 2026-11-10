import { ITEMS, ItemId } from '../data/items';

// Kleine SVG-Symbole für Waren: Brocken (Erz), Kristall, Kanister (Gas), Barren, Zelle, Schrott
type Shape = 'rock' | 'crystal' | 'ice' | 'gas' | 'bar' | 'cell' | 'scrap';
const SHAPE: Record<ItemId, Shape> = {
  erz: 'rock', kupfer: 'rock', titan: 'rock', iridium: 'rock', eis: 'ice', erden: 'crystal', helium: 'gas', ferrit: 'crystal',
  stahl: 'bar', kupferb: 'bar', titanb: 'bar', zellen: 'cell', schrott: 'scrap',
};

function body(s: Shape, c: string) {
  const dark = 'rgba(0,0,0,.35)', hi = 'rgba(255,255,255,.45)';
  switch (s) {
    case 'rock': return `<path d="M5 9 9 4h6l5 4 1 6-4 6H9l-5-4z" fill="${c}"/><path d="M9 4l2 6-7 6M11 10h6l4 4M11 10l-2 10" fill="none" stroke="${dark}" stroke-width="1"/><path d="M9 4h6l-4 6z" fill="${hi}"/>`;
    case 'crystal': return `<path d="M12 2 17 8 15 21H9L7 8z" fill="${c}"/><path d="M12 2v19M7 8h10" stroke="${dark}" stroke-width="1"/><path d="M12 2 7 8h5z" fill="${hi}"/><path d="M4 12l3-2 2 9H6zM20 12l-3-2-2 9h3z" fill="${c}" opacity=".7"/>`;
    case 'ice': return `<path d="M4 15 8 6l8-2 4 8-4 8-9 0z" fill="${c}" opacity=".9"/><path d="M8 6l4 7 8-1M12 13l-5 7" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="1"/>`;
    case 'gas': return `<rect x="7" y="5" width="10" height="16" rx="3" fill="${c}"/><rect x="10" y="2" width="4" height="4" fill="#9a9284"/><path d="M7 11h10M7 15h10" stroke="${dark}" stroke-width="1.2"/><rect x="9" y="7" width="2" height="12" rx="1" fill="${hi}"/>`;
    case 'bar': return `<path d="M3 15 7 9h14l-4 6z" fill="${hi}"/><path d="M3 15h14v5H3z" fill="${c}"/><path d="M17 15l4-6v5l-4 6z" fill="${c}" opacity=".7"/><path d="M7 9h14l-4 6H3z" fill="${c}" opacity=".85"/><path d="M8 10.5h10" stroke="rgba(255,255,255,.5)" stroke-width="1"/>`;
    case 'cell': return `<rect x="6" y="4" width="12" height="17" rx="2" fill="#2a2c32" stroke="${c}" stroke-width="1.5"/><rect x="9" y="2" width="6" height="3" fill="${c}"/><rect x="8.5" y="12" width="7" height="7" fill="${c}"/><rect x="8.5" y="8" width="7" height="3" fill="${c}" opacity=".5"/>`;
    case 'scrap': return `<path d="M12 3l2 3 3-1 1 3 3 1-1 3 2 2-3 2 1 3-3 0-1 3-3-1-2 2-2-3-3 1 0-3-3-1 2-3-2-2 3-2-1-3h3z" fill="${c}"/><circle cx="12" cy="12" r="3.5" fill="#1a1c20"/><path d="M5 19 10 14" stroke="#ff9a40" stroke-width="1.4"/>`;
  }
}

const CACHE: Partial<Record<ItemId, string>> = {};
export function itemIcon(k: ItemId, size = 20) {
  const key = k;
  let svg = CACHE[key];
  if (!svg) svg = CACHE[key] = `<svg class="ico" viewBox="0 0 24 24" width="SZ" height="SZ" aria-hidden="true">${body(SHAPE[k], ITEMS[k].c)}</svg>`;
  return svg.replace(/SZ/g, String(size));
}
