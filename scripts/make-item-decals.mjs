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

// ---------- weitere eigene Marken: Hammerwerk (Waffen), Schildwall (Abwehr), Vortrieb (Antrieb), Lotse (Instrumente), Grenzland (Ausrüstung) ----------
const W = '#f2f4f6';
const glyph = {
  hw: (c, r) => { let b = `<circle cx="${c}" cy="${c}" r="${r * 0.62}" fill="none" stroke="${W}" stroke-width="${r * 0.16}"/>`; for (let i = 0; i < 8; i++) { const a = Math.PI / 4 * i; b += `<rect x="${c - r * 0.12}" y="${c - r}" width="${r * 0.24}" height="${r * 0.3}" fill="${W}" transform="rotate(${i * 45} ${c} ${c})"/>`; } return b + `<rect x="${c - r * 0.3}" y="${c - r * 0.32}" width="${r * 0.14}" height="${r * 0.64}" fill="${W}"/><rect x="${c + r * 0.16}" y="${c - r * 0.32}" width="${r * 0.14}" height="${r * 0.64}" fill="${W}"/><rect x="${c - r * 0.3}" y="${c - r * 0.07}" width="${r * 0.6}" height="${r * 0.14}" fill="${W}"/>`; },
  sw: (c, r) => `<path d="M${c} ${c - r} L${c + r * 0.85} ${c - r * 0.62} V${c + r * 0.05} C${c + r * 0.85} ${c + r * 0.6} ${c + r * 0.4} ${c + r * 0.85} ${c} ${c + r} C${c - r * 0.4} ${c + r * 0.85} ${c - r * 0.85} ${c + r * 0.6} ${c - r * 0.85} ${c + r * 0.05} V${c - r * 0.62} Z" fill="none" stroke="${W}" stroke-width="${r * 0.15}" stroke-linejoin="round"/><rect x="${c - r * 0.5}" y="${c - r * 0.2}" width="${r}" height="${r * 0.22}" fill="${W}"/><rect x="${c - r * 0.11}" y="${c - r * 0.55}" width="${r * 0.22}" height="${r * 1.1}" fill="${W}"/>`,
  vt: (c, r) => `<circle cx="${c}" cy="${c}" r="${r * 0.9}" fill="none" stroke="${W}" stroke-width="${r * 0.13}"/>` + [-0.38, 0, 0.38].map(o => `<polyline points="${c + (o - 0.18) * r},${c - r * 0.42} ${c + (o + 0.18) * r},${c} ${c + (o - 0.18) * r},${c + r * 0.42}" fill="none" stroke="${W}" stroke-width="${r * 0.16}"/>`).join(''),
  lotse: (c, r) => `<polygon points="${c},${c - r} ${c + r * 0.2},${c - r * 0.2} ${c + r},${c} ${c + r * 0.2},${c + r * 0.2} ${c},${c + r} ${c - r * 0.2},${c + r * 0.2} ${c - r},${c} ${c - r * 0.2},${c - r * 0.2}" fill="${W}"/><circle cx="${c}" cy="${c}" r="${r * 0.62}" fill="none" stroke="${W}" stroke-width="${r * 0.08}"/>`,
  gl: (c, r) => `<polygon points="${c - r},${c + r * 0.7} ${c - r * 0.3},${c - r * 0.6} ${c + r * 0.05},${c + r * 0.05} ${c + r * 0.4},${c - r * 0.3} ${c + r},${c + r * 0.7}" fill="none" stroke="${W}" stroke-width="${r * 0.16}" stroke-linejoin="round"/><rect x="${c - r}" y="${c + r * 0.82}" width="${r * 2}" height="${r * 0.14}" fill="${W}"/>`,
};
Object.keys(glyph).forEach((k, i) => add('g_' + k, 1024 + 192 * i, 1280, 192, 192, glyph[k](96, 78)));
const word = (name, x, y, w, k, text, fs2) => add(name, x, y, w, 128, glyph[k](64, 50) + `<text x="136" y="94" ${F} font-size="${fs2}" font-weight="700" letter-spacing="6" fill="${W}">${text}</text>`);
word('hw', 0, 1664, 1024, 'hw', 'HAMMERWERK', 96); word('sw', 1024, 1664, 1024, 'sw', 'SCHILDWALL', 96);
word('vt', 0, 1792, 768, 'vt', 'VORTRIEB', 96); word('lotse', 768, 1792, 640, 'lotse', 'LOTSE', 96); word('gl', 1408, 1792, 640, 'gl', 'GRENZLAND', 66);
const tagbox = (name, x, y, w, h, text, fs2, bg, fg) => add(name, x, y, w, h, (bg ? `<rect width="${w}" height="${h}" rx="10" fill="${bg}"/>` : `<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="10" fill="none" stroke="${fg || W}" stroke-width="8"/>`) + `<text x="${w / 2}" y="${h / 2 + fs2 * 0.36}" ${F} font-size="${fs2}" font-weight="700" text-anchor="middle" fill="${fg || W}">${text}</text>`);
tagbox('munition', 0, 1920, 512, 128, 'MUNITION 20 MM', 50, '#e0a20a', '#15171a'); tagbox('spannung', 512, 1920, 512, 128, 'HOCHSPANNUNG', 54, '#b3261a');
tagbox('laser', 1024, 1920, 512, 128, 'LASER KLASSE 4', 52, '#e0a20a', '#15171a'); tagbox('schub', 1536, 1920, 256, 128, 'SCHUB', 60);
add('sn1', 1792, 1920, 256, 64, `<text x="4" y="46" ${F} font-size="38" font-weight="700" fill="${W}">SN 4471-08</text>`);
add('sn2', 1792, 1984, 256, 64, `<text x="4" y="46" ${F} font-size="38" font-weight="700" fill="${W}">SN 0932-K7</text>`);
tagbox('treibstoff', 1024, 1472, 512, 96, 'TREIBSTOFF HE-3', 46); tagbox('nichtoeffnen', 1536, 1472, 512, 96, 'NICHT ÖFFNEN', 50, '#b3261a');
tagbox('inhalt', 1024, 1568, 384, 96, 'INHALT 12 l', 48); add('werk', 1408, 1568, 640, 96, `<text x="6" y="64" ${F} font-size="46" font-weight="700" letter-spacing="3" fill="${W}">WERK BASTION · GEPRÜFT</text>`.replace('font-size="46"', 'font-size="40"'));

await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">${svg}</svg>`)).png().toFile(out + '/decals.png');
fs.writeFileSync(out + '/decals.json', JSON.stringify({ size: S, rects: R }));
console.log(Object.keys(R).length + ' Felder → ' + out + '/decals.png');
