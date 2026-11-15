// Lichtschein um helle Stellen (Leuchten, Lichtbänder, LEDs) für die Gang-Bilder: node schein.cjs <roh.jpg> <fertig.jpg>
// Helle Bildteile herauslösen, zweimal weichzeichnen (eng und weit) und aufhellend über das Bild legen; dazu eine leichte Randabdunklung.
const path = require('path');
const sharp = require(path.join('C:/Users/faceman/Desktop/CLAUDE/letzte-flotte/node_modules/sharp'));
(async () => {
  const [inp, out] = process.argv.slice(2);
  const img = sharp(inp), { width: w, height: h } = await img.metadata();
  const hot = await sharp(inp).linear(2.2, -330).toBuffer();                       // nur was sehr hell ist, bleibt übrig
  const near = await sharp(hot).blur(7).linear(0.55, 0).toBuffer();
  const far = await sharp(hot).blur(34).linear(0.6, 0).toBuffer();
  const vig = Buffer.from(`<svg width="${w}" height="${h}"><defs><radialGradient id="g" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.42"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  await sharp(inp).composite([{ input: near, blend: 'screen' }, { input: far, blend: 'screen' }, { input: vig, blend: 'over' }]).jpeg({ quality: 93 }).toFile(out);
  console.log(out, w, h);
})();
