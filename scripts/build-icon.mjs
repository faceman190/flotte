// App-Symbol für „App installieren“: zerbrochener Torbogen (das Halden-Tor) in Bernstein, in der Mitte ein Stern.
// Aufruf: node scripts/build-icon.mjs  → public/icon-192.png, public/icon-512.png
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#13263a"/><stop offset="1" stop-color="#04070b"/></radialGradient>
    <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd27a"/><stop offset="1" stop-color="#c8701c"/></linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9"/></filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 268)">
    <!-- Torbogen mit Bruchstelle oben rechts -->
    <path d="M -150 40 A 160 160 0 0 1 60 -148" fill="none" stroke="#ffb347" stroke-width="34" stroke-linecap="butt" opacity=".35" filter="url(#glow)"/>
    <path d="M -150 40 A 160 160 0 0 1 60 -148" fill="none" stroke="url(#arc)" stroke-width="30"/>
    <path d="M 118 -104 A 160 160 0 0 1 152 52" fill="none" stroke="url(#arc)" stroke-width="30"/>
    <path d="M 132 108 A 160 160 0 0 1 -60 150" fill="none" stroke="url(#arc)" stroke-width="22" opacity=".8"/>
    <!-- Splitter an der Bruchstelle -->
    <rect x="80" y="-142" width="18" height="12" fill="#ffd27a" transform="rotate(30 89 -136)"/>
    <rect x="98" y="-122" width="10" height="8" fill="#ffb347" transform="rotate(-20 103 -118)"/>
    <!-- Stern: die letzte Crew -->
    <circle r="40" fill="#5fd0ff" opacity=".35" filter="url(#glow)"/>
    <path d="M 0 -42 L 10 -10 L 42 0 L 10 10 L 0 42 L -10 10 L -42 0 L -10 -10 Z" fill="#dff6ff"/>
  </g>
</svg>`;
for (const n of [192, 512]) await sharp(Buffer.from(svg)).resize(n, n).png().toFile(path.join(ROOT, 'public', `icon-${n}.png`));
console.log('Symbole geschrieben');
