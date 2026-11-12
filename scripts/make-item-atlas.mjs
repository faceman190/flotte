// Lage der Gegenstandsbilder im Bildbogen (asset-src/tex/items@2048.png) als TypeScript ablegen.
// Der Bogen entsteht in Blender (asset-src/neu/items/Items.blend, make_atlas); hier wird nur die Reihenfolge übernommen
// und geprüft, dass jeder Gegenstand aus src/data/gear.ts ein Bild hat.
import fs from 'fs';
const a = JSON.parse(fs.readFileSync('asset-src/neu/items/atlas.json', 'utf8'));
const gear = fs.readFileSync('src/data/gear.ts', 'utf8');
const ids = [...gear.matchAll(/^\s{2}([a-z]+_[a-z0-9]+): \{ n: '[^']*', kind: '/gm)].map(m => m[1]);
const missing = ids.filter(id => !a.ids.includes(id)), extra = a.ids.filter(id => !ids.includes(id));
if (missing.length) console.warn('Ohne Bild:', missing.join(', '));
if (extra.length) console.warn('Bild ohne Gegenstand:', extra.join(', '));
fs.writeFileSync('src/data/gearAtlas.ts', `// Erzeugt von scripts/make-item-atlas.mjs – nicht von Hand ändern.
// Bildbogen der Gegenstände: Zellgröße, Spalten, Kantenlänge und die Reihenfolge der Bilder.
export const GEAR_ATLAS = { cell: ${a.cell}, cols: ${a.cols}, dim: ${a.dim}, ids: ${JSON.stringify(a.ids)} };
`);
console.log(`${a.ids.length} Bilder, ${ids.length} Gegenstände${missing.length || extra.length ? '' : ', alles zugeordnet'}`);
