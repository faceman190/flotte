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

// ---------- Symbole für persönliche Gegenstände: Form nach Art, Farbe nach Seltenheit ----------
import { RARITY, gearDef, type GearKind } from '../data/gear';
function gearBody(kind: GearKind, c: string) {
  const dark = 'rgba(0,0,0,.4)', hi = 'rgba(255,255,255,.45)';
  switch (kind) {
    case 'helm': return `<path d="M4 15a8 8 0 0 1 16 0v4H4z" fill="${c}"/><path d="M9 12h10v5H9z" fill="#14181e"/><path d="M10.5 13.5h7" stroke="${hi}" stroke-width="1.2"/><path d="M6 11a7 7 0 0 1 6-4" fill="none" stroke="${hi}" stroke-width="1.2"/>`;
    case 'anzug': return `<path d="M8 3l4 2 4-2 5 4-3 4-1-1v11H7V10l-1 1-3-4z" fill="${c}"/><path d="M12 5v16M7 14h10" stroke="${dark}" stroke-width="1"/><path d="M8 3l4 2-2 4z" fill="${hi}"/>`;
    case 'rucksack': return `<path d="M9 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="${c}" stroke-width="2"/><rect x="5.5" y="7" width="13" height="14" rx="3" fill="${c}"/><rect x="8.5" y="13" width="7" height="5" rx="1" fill="${dark}"/><path d="M7 10h10" stroke="${hi}" stroke-width="1.2"/>`;
    case 'waffe': return `<path d="M2 8h18v4h-8l-1 3H8l1 6H5L4 12H2z" fill="${c}"/><path d="M13 9.6h6" stroke="${hi}" stroke-width="1.2"/><path d="M20 9h2v2h-2z" fill="${c}"/>`;
    case 'werkzeug': return `<path d="M15 3a5 5 0 0 0-4.8 6.4L3 16.6 6.4 20l7.2-7.2A5 5 0 0 0 20.6 7l-3 3-2.6-.9L14 6.4l3-3A5 5 0 0 0 15 3z" fill="${c}"/><path d="M5 17.5l5-5" stroke="${hi}" stroke-width="1.2"/>`;
    case 'modul': return `<path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="${c}" stroke-width="1.8"/><rect x="6" y="6" width="12" height="12" rx="2" fill="${c}"/><rect x="9" y="9" width="6" height="6" fill="${dark}"/><path d="M10.5 12h3" stroke="${hi}" stroke-width="1.2"/>`;
    case 'verbrauch': return `<rect x="10" y="2.5" width="4" height="4" fill="#9a9284"/><rect x="7.5" y="6.5" width="9" height="15" rx="2.5" fill="${c}"/><path d="M12 10.5v7M8.8 14h6.4" stroke="#fff" stroke-width="1.8"/>`;
    case 'fund': return `<path d="M6 4h12l4 6-10 11L2 10z" fill="${c}"/><path d="M2 10h20M9 4l-2 6 5 11 5-11-2-6" fill="none" stroke="${dark}" stroke-width="1"/><path d="M6 4h3l-2 6H2z" fill="${hi}"/>`;
  }
}
// id = Gegenstand; ghost = stattdessen die blasse Form eines leeren Platzes (id ist dann der Platz, z. B. 'modul1')
export function gearIcon(id: string, size = 24, ghost = false) {
  const d = gearDef(id), kind = (ghost ? id.replace(/\d$/, '') : d?.kind || 'fund') as GearKind;
  return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"${ghost ? ' style="opacity:.22"' : ''}>${gearBody(kind, ghost ? '#8fa0b0' : RARITY[d?.rar || 0].c)}</svg>`;
}
