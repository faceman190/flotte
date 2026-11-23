import { ux, view } from '../core/engine';
import { clamp } from '../core/util';
import { settings, G } from '../game/state';
import { weapon } from '../game/dungeon';
import { GUN, gunSync, gunMode, aimK, aimSpread, KILL } from '../game/footgun';

// Anzeige zu Fuß (seit Alpha 1.54, Gegenstück zur Ringanzeige im Schiff): unten rechts ein Ring mit dem Leben, die Zahl in der Mitte,
// links daneben Waffe mit Magazin und Schussmodus. Planet und Mine benutzen dieselbe Anzeige. Dazu die schlichte Aufforderung [E] und die
// Ortszeile oben, damit alle Ansichten zu Fuß gleich aussehen.
const GREEN = '#9fd8a8', DIM = '#7d8d99', TXT = '#dfe7ec', TRACK = 'rgba(40,56,68,.85)', AMBER = '#ffb347', RED = '#ff6b5b';
const FONT = (w: number, s: number) => `${w} ${s}px Rajdhani, "IBM Plex Sans", sans-serif`;
const lifeCol = (f: number) => (f < 0.3 ? RED : f < 0.6 ? AMBER : GREEN);
const TAU = Math.PI * 2;

// Symbole aus dem Lyra-Paket (asset-src/tex-world/hud_ly_…, scripts/build-lyra.mjs): weiß mit Transparenz, hier eingefärbt gezeichnet.
// Geladen beim ersten Gebrauch; bis dahin (und wenn eines fehlt) bleibt die Anzeige ohne Symbol.
const IMG: Record<string, HTMLImageElement | null> = {};
function icon(name: string): HTMLImageElement | null {
  if (!(name in IMG)) { const url = window.TEXDATA?.[name]; if (url) { const im = new Image(); im.src = url; IMG[name] = im; } else IMG[name] = null; }
  const im = IMG[name];
  return im && im.complete && im.naturalWidth ? im : null;
}
// Symbol rechtsbündig an x zeichnen, Höhe h; gibt die Breite zurück
function drawIcon(name: string, x: number, y: number, h: number, alpha = 1) {
  const im = icon(name); if (!im) return 0;
  const w = h * im.naturalWidth / im.naturalHeight;
  ux.globalAlpha = alpha; ux.drawImage(im, x - w, y, w, h); ux.globalAlpha = 1;
  return w;
}

// Fadenkreuz zu Fuß (seit 2026-11-23, Planet und Mine gleich): Punkt in der Mitte (Lyras Fadenkreuzpunkt), vier Striche im Abstand der
// Streuung der Waffe – beim Zielen (rechte Maustaste) rücken sie zusammen. Treffer: vier schräge Marken. Abschüsse in Folge innerhalb
// von 4 s: Symbol und Wort darunter (Doppel-, Dreifach-, Vierfachabschuss). fov: Sichtfeld der Ansicht ohne Zielen (Grad, senkrecht).
const STREAK = ['', '', 'Doppelabschuss', 'Dreifachabschuss', 'Vierfachabschuss'];
export function drawFootCross(fov: number) {
  const W = view.W, H = view.H, cx = W / 2, cy = H / 2, w = weapon(), ak = aimK();
  ux.save();
  const hit = G.hitMark > 0;
  const gap = clamp(Math.tan(w.spread * aimSpread()) / Math.tan(fov * Math.PI / 360) * (H / 2) * (1 + 0.2 * ak), 4, 60) + 3;
  ux.strokeStyle = hit ? AMBER : 'rgba(255,255,255,.82)'; ux.lineWidth = 1.5; ux.shadowColor = 'rgba(0,0,0,.6)'; ux.shadowBlur = 2;
  const len = 7 - 2 * ak;
  for (const [ax, ay] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ux.beginPath(); ux.moveTo(cx + ax * gap, cy + ay * gap); ux.lineTo(cx + ax * (gap + len), cy + ay * (gap + len)); ux.stroke(); }
  const dot = icon('hud_ly_dot');
  if (dot) { ux.globalAlpha = 0.9; ux.drawImage(dot, cx - 3.5, cy - 3.5, 7, 7); ux.globalAlpha = 1; }
  else { ux.fillStyle = 'rgba(255,255,255,.8)'; ux.beginPath(); ux.arc(cx, cy, 1.8, 0, TAU); ux.fill(); }
  // Treffermarke; nach einem Abschuss kurz rot und größer
  const since = (performance.now() - KILL.at) / 1000, kill = since < 0.35;
  if (hit || kill) {
    ux.strokeStyle = kill ? RED : AMBER; ux.lineWidth = 2;
    const a = kill ? 9 : 7, b = kill ? 17 : 13;
    for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ux.beginPath(); ux.moveTo(cx + dx * a, cy + dy * a); ux.lineTo(cx + dx * b, cy + dy * b); ux.stroke(); }
  }
  // Abschüsse in Folge
  if (KILL.n >= 2 && since < 2.4) {
    const n = Math.min(4, KILL.n), a = since < 0.15 ? since / 0.15 : since > 1.9 ? (2.4 - since) / 0.5 : 1, y = H * 0.3, s = 46 * (1 + 0.25 * Math.max(0, 1 - since / 0.2));
    ux.shadowBlur = 8;
    const im = icon('hud_ly_kill' + n);
    if (im) { ux.globalAlpha = a; ux.drawImage(im, cx - s / 2, y - s / 2, s, s * im.naturalHeight / im.naturalWidth); }
    ux.globalAlpha = a; ux.textAlign = 'center'; ux.font = FONT(600, 15); (ux as any).letterSpacing = '2px'; ux.fillStyle = TXT;
    ux.fillText(STREAK[n].toUpperCase(), cx, y + 44);
  }
  ux.restore();
}

export function drawFootRing(hp: number, max: number, hurt = 0) {
  const W = view.W, H = view.H, k = clamp(Math.min(W / 1250, H / 780), 0.7, 1.15) * settings.hud;
  const R = 46, cx = W - (14 + R + 6) * k, cy = H - (14 + R + 6) * k, f = clamp(hp / Math.max(1, max), 0, 1);
  ux.save(); ux.translate(Math.round(cx), Math.round(cy)); ux.scale(k, k);
  const bg = ux.createRadialGradient(-80, 0, 10, -80, 0, 190); bg.addColorStop(0, 'rgba(5,8,11,.68)'); bg.addColorStop(1, 'rgba(5,8,11,0)');   // kräftiger als im Schiff: zu Fuß liegt oft die helle Waffe dahinter
  ux.fillStyle = bg; ux.fillRect(-270, -R - 60, 330, R * 2 + 80);
  // Ring: Leben
  ux.lineCap = 'round'; ux.lineWidth = 4;
  ux.strokeStyle = TRACK; ux.beginPath(); ux.arc(0, 0, R, 0, TAU); ux.stroke();
  const col = hurt > 0.3 ? '#ffffff' : lifeCol(f);
  if (f > 0.002) { ux.strokeStyle = col; ux.beginPath(); ux.arc(0, 0, R, -Math.PI / 2, -Math.PI / 2 + TAU * f); ux.stroke(); }
  ux.lineCap = 'butt';
  // Zahl in der Mitte
  ux.textAlign = 'center';
  ux.font = FONT(600, 26); ux.fillStyle = f < 0.3 ? RED : TXT; ux.fillText(String(Math.ceil(Math.max(0, hp))), 0, 6);
  ux.font = FONT(500, 11); ux.fillStyle = DIM; ux.fillText('Leben', 0, 22);
  // Waffe, Magazin, Schussmodus
  gunSync();
  const w = weapon(), x = -R - 16;
  ux.textAlign = 'right';
  ux.font = FONT(500, 12); ux.fillStyle = DIM; ux.fillText(w.name, x, -26);
  // Umriss der Waffe links daneben (Pistole, Karabiner, Flinte: die drei Waffen aus dem Lyra-Paket)
  if (w.kind) drawIcon('hud_ly_' + w.kind, x - 92, -40, 30, 0.8);
  if (GUN.reload > 0) {
    ux.font = FONT(600, 17); ux.fillStyle = AMBER; ux.fillText('Nachladen', x, -9);
    const p = 1 - GUN.reload / GUN.reloadT; ux.fillStyle = TRACK; ux.fillRect(x - 60, -4, 60, 2); ux.fillStyle = AMBER; ux.fillRect(x - 60, -4, 60 * clamp(p, 0, 1), 2);
  } else if (GUN.max) {
    const low = GUN.mag <= Math.ceil(GUN.max * 0.25);
    ux.font = FONT(500, 14); ux.fillStyle = DIM; const tail = ' / ' + GUN.max, sw = ux.measureText(tail).width; ux.fillText(tail, x, -7);
    ux.font = FONT(600, 22); ux.fillStyle = low ? RED : TXT; ux.fillText(String(GUN.mag), x - sw, -7);
    if (w.kind) drawIcon('hud_ly_ammo_' + w.kind, x - sw - ux.measureText(String(GUN.mag)).width - 7, -22, 15, low ? 0.95 : 0.6);
  } else { ux.font = FONT(600, 17); ux.fillStyle = TXT; ux.fillText('Energie', x, -9); }
  ux.font = FONT(500, 12); ux.fillStyle = DIM; ux.fillText('Modus', x, 16);
  ux.font = FONT(600, 15); ux.fillStyle = TXT; ux.fillText(gunMode(w), x, 32);
  ux.restore();
}

// Aufforderung „[E] …“ in der Bildmitte unten, für Station, Planet und Mine gleich
export function drawPrompt(text: string, accent = AMBER, y = view.H * 0.68) {
  const W = view.W;
  ux.save();
  ux.font = FONT(600, 15); ux.textAlign = 'left';
  const kw = 22, tw = ux.measureText(text).width, w = kw + 10 + tw + 24, x = W / 2 - w / 2;
  ux.fillStyle = 'rgba(5,9,13,.78)'; ux.beginPath(); (ux as any).roundRect ? (ux as any).roundRect(x, y - 17, w, 30, 6) : ux.rect(x, y - 17, w, 30); ux.fill();
  ux.strokeStyle = accent; ux.lineWidth = 1.2; ux.beginPath(); (ux as any).roundRect ? (ux as any).roundRect(x + 8, y - 11, kw, 18, 3) : ux.rect(x + 8, y - 11, kw, 18); ux.stroke();
  ux.fillStyle = accent; ux.textAlign = 'center'; ux.font = FONT(700, 12); ux.fillText('E', x + 8 + kw / 2, y + 3);
  ux.fillStyle = TXT; ux.textAlign = 'left'; ux.font = FONT(600, 15); ux.fillText(text, x + 8 + kw + 10, y + 4);
  ux.restore();
}

// Ortszeile oben in der Mitte (wie der Sektorname über dem Kompass im Flug)
export function drawPlaceLine(text: string) {
  if (!text) return;
  ux.save(); ux.textAlign = 'center'; ux.font = FONT(600, 13); (ux as any).letterSpacing = '2px';
  ux.fillStyle = 'rgba(205,218,228,.62)'; ux.shadowColor = 'rgba(0,0,0,.8)'; ux.shadowBlur = 6; ux.fillText(text.toUpperCase(), view.W / 2, 22);
  ux.restore();
}

// Sprechblase über einem Kopf (Stimmen der Crew, seit 2026-11-20): Stationen (interior.ts) und Städte (city.ts) sehen gleich aus.
// x, y: Bildpunkt über dem Kopf; alpha: Ein- und Ausblenden.
export function drawSpeechBubble(x: number, y: number, text: string, alpha: number) {
  const W = view.W;
  ux.save();
  ux.font = FONT(500, 14); ux.textAlign = 'left';
  const maxW = Math.min(300, W * 0.4), lines: string[] = [];
  let cur = '';
  for (const w of text.split(' ')) { const n = cur ? cur + ' ' + w : w; if (ux.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
  if (cur) lines.push(cur);
  const lh = 17, bw = Math.max(...lines.map(l => ux.measureText(l).width)) + 22, bh = lines.length * lh + 12;
  const bx = clamp(x - bw / 2, 8, W - bw - 8), by = Math.max(8, y - bh - 12), px = clamp(x, bx + 10, bx + bw - 10);
  ux.globalAlpha = clamp(alpha, 0, 1);
  ux.fillStyle = 'rgba(8,18,28,.86)'; ux.strokeStyle = 'rgba(160,200,225,.35)'; ux.lineWidth = 1;
  ux.beginPath(); ux.rect(bx, by, bw, bh); ux.fill(); ux.stroke();
  ux.beginPath(); ux.moveTo(px - 6, by + bh); ux.lineTo(px, by + bh + 8); ux.lineTo(px + 6, by + bh); ux.closePath(); ux.fill();
  ux.fillStyle = TXT;
  lines.forEach((l, i) => ux.fillText(l, bx + 11, by + 2 + lh * (i + 1)));
  ux.restore();
}
