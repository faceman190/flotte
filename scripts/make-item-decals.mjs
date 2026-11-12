// Beschriftungen und Zeichen für die Gegenstandsmodelle (Blender): ein Bild mit durchsichtigem Grund und die Lage der Felder als JSON.
// Alles eigene Zeichen und Namen: Hersteller „Frostwerk“ (Kühltechnik), Flottenzeichen „LC“ (Letzte Crew).
//   node scripts/make-item-decals.mjs   →  asset-src/neu/items/tex/decals.png, decals.json
import fs from 'fs';
import sharp from 'sharp';
const S = 2048, out = 'asset-src/neu/items/tex';
fs.mkdirSync(out, { recursive: true });
const R = {};   // name → [x, y, w, h] in Pixeln
let svg = '';
const add = (name, x, y, w, h, body) => { R[name] = [x, y, w, h]; svg += `<g transform="translate(${x},${y})">${body}</g>`; };
const F = 'font-family="Arial, Helvetica, sans-serif"';
// Schneekristall im Sechseck (Zeichen des Herstellers)
const flake = (cx, cy, r, col, sw) => {
  let s = `<polygon points="${[0, 1, 2, 3, 4, 5].map(i => `${cx + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)},${cy + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 3 * i, x = Math.cos(a), y = Math.sin(a), q = r * 0.68, b = r * 0.42, n = r * 0.2;
    s += `<line x1="${cx}" y1="${cy}" x2="${cx + x * q}" y2="${cy + y * q}" stroke="${col}" stroke-width="${sw}" stroke-linecap="round"/>`;
    for (const sg of [-1, 1]) { const a2 = a + sg * Math.PI / 3; s += `<line x1="${cx + x * b}" y1="${cy + y * b}" x2="${cx + x * b + Math.cos(a2) * n}" y2="${cy + y * b + Math.sin(a2) * n}" stroke="${col}" stroke-width="${sw * 0.8}" stroke-linecap="round"/>`; }
  }
  return s;
};
add('logo', 0, 0, 512, 512, flake(256, 256, 216, '#f2f4f6', 26));
add('logo_dunkel', 512, 0, 512, 512, flake(256, 256, 216, '#0c0e11', 26));
add('marke', 0, 512, 1024, 192, `${flake(96, 96, 78, '#f2f4f6', 11)}<text x="196" y="132" ${F} font-size="118" font-weight="700" letter-spacing="10" fill="#f2f4f6">FROSTWERK</text>`);
add('marke_dunkel', 0, 704, 1024, 192, `${flake(96, 96, 78, '#0c0e11', 11)}<text x="196" y="132" ${F} font-size="118" font-weight="700" letter-spacing="10" fill="#0c0e11">FROSTWERK</text>`);
add('typ', 1024, 0, 640, 128, `<text x="8" y="92" ${F} font-size="80" font-weight="700" letter-spacing="6" fill="#f2f4f6">FK-220 KRYO</text>`);
add('typ_dunkel', 1024, 128, 640, 128, `<text x="8" y="92" ${F} font-size="80" font-weight="700" letter-spacing="6" fill="#0c0e11">FK-220 KRYO</text>`);
// Typenschild mit Kleingedrucktem
{
  let b = `<rect width="640" height="384" rx="14" fill="#c9ccd0"/><rect x="10" y="10" width="620" height="364" rx="8" fill="none" stroke="#15171a" stroke-width="5"/>
    <text x="30" y="70" ${F} font-size="50" font-weight="700" fill="#15171a">FROSTWERK KÄLTETECHNIK</text><rect x="30" y="88" width="580" height="5" fill="#15171a"/>`;
  const rows = [['TYP', 'FK-220 KRYO'], ['KÜHLLEISTUNG', '2,2 MW'], ['KÜHLMITTEL', 'HE-3 / 14 l'], ['BETRIEBSDRUCK', '40 bar'], ['BAUJAHR', '2 9 4 1'], ['SERIE', 'FW-0731-22-8841']];
  rows.forEach(([k, v], i) => { b += `<text x="30" y="${140 + i * 42}" ${F} font-size="30" fill="#15171a">${k}</text><text x="330" y="${140 + i * 42}" ${F} font-size="30" font-weight="700" fill="#15171a">${v}</text>`; });
  add('schild', 1024, 256, 640, 384, b);
}
// Warnzeichen, Streifen, Pfeile
add('warn', 1664, 0, 256, 256, `<polygon points="128,18 244,232 12,232" fill="#e8a80c" stroke="#15171a" stroke-width="14" stroke-linejoin="round"/><rect x="116" y="88" width="24" height="80" rx="6" fill="#15171a"/><circle cx="128" cy="198" r="15" fill="#15171a"/>`);
{
  let b = `<rect width="1024" height="128" fill="#e0a20a"/>`;
  for (let i = -2; i < 18; i++) b += `<polygon points="${i * 64},128 ${i * 64 + 32},128 ${i * 64 + 96},0 ${i * 64 + 64},0" fill="#15171a"/>`;
  add('streifen', 0, 896, 1024, 128, `<clipPath id="c1"><rect width="1024" height="128"/></clipPath><g clip-path="url(#c1)">${b}</g>`);
}
add('pfeile', 1664, 256, 384, 128, [0, 1, 2].map(i => `<polygon points="${20 + i * 120},20 ${80 + i * 120},64 ${20 + i * 120},108 ${50 + i * 120},64" fill="#f2f4f6"/>`).join(''));
add('kreis_a', 1024, 640, 512, 128, `<rect width="512" height="128" rx="10" fill="#15171a"/><text x="256" y="88" ${F} font-size="72" font-weight="700" text-anchor="middle" letter-spacing="6" fill="#f2f4f6">KREIS A</text>`);
add('kreis_b', 1536, 640, 512, 128, `<rect width="512" height="128" rx="10" fill="#15171a"/><text x="256" y="88" ${F} font-size="72" font-weight="700" text-anchor="middle" letter-spacing="6" fill="#f2f4f6">KREIS B</text>`);
add('heiss', 1024, 768, 512, 128, `<rect width="512" height="128" rx="10" fill="#b3261a"/><text x="256" y="90" ${F} font-size="76" font-weight="700" text-anchor="middle" letter-spacing="4" fill="#f2f4f6">VORSICHT KALT</text>`.replace('font-size="76"', 'font-size="58"'));
add('druck', 1536, 768, 512, 128, `<rect x="4" y="4" width="504" height="120" rx="10" fill="none" stroke="#f2f4f6" stroke-width="8"/><text x="256" y="86" ${F} font-size="60" font-weight="700" text-anchor="middle" fill="#f2f4f6">DRUCK 40 BAR</text>`);
// Kleintext (Wartungshinweise)
{
  const lines = ['WARTUNG NUR IM STILLSTAND', 'KÜHLMITTEL VOR ÖFFNEN ABLASSEN', 'ANZUGSMOMENT 85 Nm', 'PRÜFUNG ALLE 400 FLUGSTUNDEN'];
  add('klein', 1024, 896, 640, 192, lines.map((t, i) => `<text x="6" y="${40 + i * 44}" ${F} font-size="34" font-weight="700" fill="#f2f4f6">${t}</text>`).join(''));
  add('klein_dunkel', 1024, 1088, 640, 192, lines.map((t, i) => `<text x="6" y="${40 + i * 44}" ${F} font-size="34" font-weight="700" fill="#0c0e11">${t}</text>`).join(''));
}
// Strichcode und Ziffern
{
  let b = `<rect width="512" height="128" fill="#d8dadd"/>`; let x = 16, k = 7;
  while (x < 496) { k = (k * 73 + 11) % 97; const w = 3 + (k % 4) * 3; b += `<rect x="${x}" y="14" width="${w}" height="100" fill="#15171a"/>`; x += w + 4 + (k % 3) * 3; }
  add('strich', 1664, 896, 512 - 128, 128, `<clipPath id="c2"><rect width="384" height="128"/></clipPath><g clip-path="url(#c2)">${b}</g>`);
}
// Flottenzeichen: Winkel und Stern in einem Schild, dazu Kennziffern
{
  const b = `<path d="M128 14 L236 56 V132 C236 190 190 226 128 246 C66 226 20 190 20 132 V56 Z" fill="none" stroke="#f2f4f6" stroke-width="14" stroke-linejoin="round"/>
    <polyline points="62,150 128,102 194,150" fill="none" stroke="#f2f4f6" stroke-width="18" stroke-linejoin="miter"/><polyline points="62,196 128,148 194,196" fill="none" stroke="#f2f4f6" stroke-width="18"/>
    <polygon points="128,36 137,62 164,62 142,78 150,104 128,88 106,104 114,78 92,62 119,62" fill="#f2f4f6"/>`;
  add('flotte', 0, 1024, 256, 256, b);
  add('flotte_dunkel', 256, 1024, 256, 256, b.replaceAll('#f2f4f6', '#0c0e11'));
}
add('ziffer', 512, 1024, 384, 256, `<text x="192" y="206" ${F} font-size="230" font-weight="700" text-anchor="middle" fill="#f2f4f6">07</text>`);
add('ziffer_dunkel', 512, 1280, 384, 256, `<text x="192" y="206" ${F} font-size="230" font-weight="700" text-anchor="middle" fill="#0c0e11">07</text>`);
add('crew', 0, 1280, 512, 128, `<text x="6" y="92" ${F} font-size="84" font-weight="700" letter-spacing="8" fill="#f2f4f6">LETZTE CREW</text>`.replace('font-size="84"', 'font-size="66"'));
add('sauerstoff', 0, 1408, 512, 128, `<rect x="4" y="4" width="504" height="120" rx="10" fill="none" stroke="#f2f4f6" stroke-width="8"/><text x="256" y="86" ${F} font-size="62" font-weight="700" text-anchor="middle" fill="#f2f4f6">O2 · EIN / AUS</text>`);
add('notgriff', 0, 1536, 512, 128, `<rect width="512" height="128" rx="10" fill="#b3261a"/><text x="256" y="88" ${F} font-size="60" font-weight="700" text-anchor="middle" fill="#f2f4f6">NOTENTRIEGELUNG</text>`.replace('font-size="60"', 'font-size="48"'));
add('groesse', 512, 1536, 384, 128, `<text x="6" y="84" ${F} font-size="64" font-weight="700" fill="#f2f4f6">GR. L · 58</text>`);

await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${svg}</svg>`)).png().toFile(out + '/decals.png');
fs.writeFileSync(out + '/decals.json', JSON.stringify({ size: S, rects: R }));
console.log(Object.keys(R).length + ' Felder → ' + out + '/decals.png');
