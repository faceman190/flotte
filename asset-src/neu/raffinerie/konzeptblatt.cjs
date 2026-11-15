// Konzeptblatt der Raffinerie-Station: Seitenansicht aus Blender (roh-raff-seite.jpg, 2000 × 760, 2,5 Bildpunkte je Meter, Bildmitte x = 40, z = −40)
// mit Beschriftung, Maßstab und Kennzahlen. Aufruf: node konzeptblatt.cjs  →  raff-0-konzeptblatt.jpg
const path = require('path');
const sharp = require(path.join('C:/Users/faceman/Desktop/CLAUDE/letzte-flotte/node_modules/sharp'));
const W = 2000, VH = 760, TOP = 240, BOT = 330, H = TOP + VH + BOT, K = 2.5;
const px = x => 1000 + (x - 40) * K, py = z => TOP + VH / 2 - (z + 40) * K;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
// Nummer, Punkt am Modell (x, z in Metern), Lage der Beschriftung (Bildpunkte), Titel, Zeile
const L = [
  [1, -262, 18, 150, 190, 'Erzannahme', 'Bergbauschiffe kippen ihr Erz in den Trichter'],
  [2, -190, -6, 250, 615, 'Rückgrat mit Förderrohr', 'trägt alles, das Erz läuft innen zur Schmelze'],
  [3, 0, -46, 800, 800, 'Schmelztrommeln', 'drei Drehöfen, die Köpfe glühen'],
  [4, -20, 96, 620, 190, 'Radiatoren', 'strahlen die Abwärme ab, an der Wurzel rotglühend'],
  [5, -30, -150, 300, 800, 'Schlackewerfer', 'schießt die Schlacke ab: glühende Fahne, weithin zu sehen'],
  [6, 156, -40, 1240, 800, 'Tanklager', 'Wasser und Gase aus dem Eis'],
  [7, 152, 34, 1110, 190, 'Barrenlager', 'fertige Barren, Ladekran'],
  [8, 330, -2, 1600, 800, 'Hangar', 'Maße wie an allen Stationen'],
  [9, 283, 58, 1560, 190, 'Wohnturm und Leitstand', 'Quartiere der Hüttenleute, Verkehrsleitung'],
];
const o = [];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">`);
o.push(`<text x="40" y="62" fill="#f2f5f8" font-size="40" font-weight="bold">Gildehütte „Eisenkrone“  ·  Raffinerie-Station</text>`);
o.push(`<text x="40" y="104" fill="#9fb0bf" font-size="21">${esc('Entwurf. Eine Hütte im All: Erz kommt links an, läuft durch das Rückgrat in die Öfen, die Barren warten rechts am Hangar.')}</text>`);
for (const [n, x, z, lx, ly, t, s] of L) {
  const ax = px(x), ay = py(z), up = ly < TOP + VH / 2, ty = up ? ly : TOP + VH + (ly - 800) + 40;
  o.push(`<path d="M${ax} ${ay} L${lx + 20} ${up ? ty + 16 : ty - 30}" stroke="#ffb347" stroke-width="2" stroke-opacity="0.9" fill="none"/>`);
  o.push(`<circle cx="${ax}" cy="${ay}" r="6" fill="#ffb347"/><circle cx="${lx + 20}" cy="${up ? ty - 8 : ty - 8}" r="19" fill="#ffb347"/>`);
  o.push(`<text x="${lx + 20}" y="${ty - 1}" text-anchor="middle" fill="#0a0e13" font-size="22" font-weight="bold">${n}</text>`);
  o.push(`<text x="${lx + 50}" y="${ty - 3}" fill="#f2f5f8" font-size="22" font-weight="bold">${esc(t)}</text><text x="${lx + 50}" y="${ty + 22}" fill="#9fb0bf" font-size="16">${esc(s)}</text>`);
}
// Maßstab und Gesamtlänge
const by = TOP + VH - 30;
o.push(`<path d="M${px(-306)} ${by} H${px(385)} M${px(-306)} ${by - 9} V${by + 9} M${px(385)} ${by - 9} V${by + 9}" stroke="#c8d2db" stroke-width="2"/>`);
o.push(`<rect x="${px(40) - 110}" y="${by - 15}" width="220" height="30" fill="#000"/><text x="${px(40)}" y="${by + 7}" text-anchor="middle" fill="#e3e9ef" font-size="20">690 m über alles</text>`);
o.push(`<path d="M${px(-306)} ${by - 40} H${px(-206)} M${px(-306)} ${by - 47} V${by - 33} M${px(-206)} ${by - 47} V${by - 33}" stroke="#c8d2db" stroke-width="2"/><text x="${px(-306)}" y="${by - 56}" fill="#c8d2db" font-size="17">100 m</text>`);
// Kennzahlen
const fy = TOP + VH + 190, cols = [
  ['Wo', 'Sektor Heimstatt, am Metallfeld', 'rund 2 km von der Bastion'],
  ['Wer', 'Bergbaugilde (Gildemeisterin Krull)', 'eigene Besatzung, eigener Funk'],
  ['Was', 'Raffinerie, Markt für Erz und Barren,', 'Aufträge der Gilde, Lager'],
  ['Erkennbar an', 'glühenden Radiatoren und', 'der Schlackefahne unter der Station'],
];
cols.forEach(([h, a, b], i) => {
  const x = 40 + i * 490;
  o.push(`<rect x="${x}" y="${fy - 34}" width="460" height="118" rx="8" fill="#121920" stroke="#2a3642" stroke-width="2"/>`);
  o.push(`<text x="${x + 18}" y="${fy}" fill="#ffb347" font-size="18" font-weight="bold" letter-spacing="1">${esc(h.toUpperCase())}</text><text x="${x + 18}" y="${fy + 32}" fill="#e3e9ef" font-size="19">${esc(a)}</text><text x="${x + 18}" y="${fy + 58}" fill="#e3e9ef" font-size="19">${esc(b)}</text>`);
});
o.push('</svg>');
(async () => {
  const view = await sharp(path.join(__dirname, 'roh-raff-seite.jpg')).resize(W, VH).toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: '#06090d' } })
    .composite([{ input: view, left: 0, top: TOP }, { input: Buffer.from(o.join('')), left: 0, top: 0 }]).jpeg({ quality: 92 }).toFile(path.join(__dirname, 'raff-0-konzeptblatt.jpg'));
  console.log('raff-0-konzeptblatt.jpg', W, H);
})();
