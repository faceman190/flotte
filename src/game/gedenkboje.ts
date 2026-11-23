import * as THREE from 'three';
import { glowMat, scene } from '../core/engine';
import { d3 } from '../core/util';
import { snd } from '../core/audio';
import { world, sectorHooks, clearRocks, gateTo } from './world';
import { ORTE, ortePrompt, orteKey, dropOrt } from './orte';      // Name und Entfernung zeigt das HUD für alle Orte selbst
import { P, G, saveGame } from './state';
import { radio } from '../ui/radio';
import { bojeGruppe } from '../models/bojen';

// =====================================================================================
// Gedenkboje MB-11 im Sonnenfeld (seit 23.11.2026, Wunsch des Spielers, docs/heimstatt.md und docs/gedenkboje.md):
// an den Trümmern des Halden-Tors, dort, wo die Bastion im Jahr 0 durchkam und das Tor hinter ihr zerbrach. Sie trägt die Namen der elf
// Schiffe, die nie ankamen. Ein Ort ohne Kampf und ohne Auftrag: anfliegen, ansehen, mit [E] das Archiv hören (Funksprüche aus Jahr 0
// und der Eid). Modell aus Blender (asset-src/neu/gedenkboje, bojen_export.py), Nahmodell und Fernmodell als THREE.LOD.
// Platz: am Rand des großen Trümmerfelds (das erste Feld des Sektors), auf der Seite zum Tor nach Heimstatt, 220 m vor den Felsen.
// =====================================================================================

const SEC = 'sonnenfeld', REACH = 70, LAMP_Y = 8.64, RED_Y = 7.9;
const SHIPS = ['Weitsicht', 'Anna', 'Kranich', 'Sirius', 'Ida', 'Bussard', 'Wega', 'Emma', 'Reiher', 'Atair', 'Klara'];
const ARCHIV: [string, string, number][] = [
  ['MB-11', 'Gedenkboje MB-11. Archiv der Bastion, Aufzeichnungen aus dem Jahr 0 nach dem Riss.', 0],
  ['BASTION · JAHR 0', 'Halden-Tor hinter uns, Durchgang bestätigt. Kolonieflotte, ihr seid die Nächsten. Wir halten euch den Weg frei.', 5],
  ['BASTION · JAHR 0', 'Lichtblitz am Tor! Das Tor bricht zusammen. An alle elf Schiffe: Bitte melden. Bitte melden.', 11],
  ['BASTION · JAHR 0', 'Keine Antwort. Wir rufen weiter, jede Stunde, auf allen Kanälen.', 18],
  ['MAREN HOLLWEG', 'Wir sind die letzte Crew. Niemand kommt uns holen. Also bauen wir uns selbst eine Flotte, Schiff für Schiff, und keiner von uns wird zurückgelassen.', 24],
  ['MB-11', `${SHIPS.join(', ')}. Je 3.000 an Bord. Wir warten noch.`, 33],
];
const S = {
  root: null as THREE.Group | null, lamp: null as THREE.Sprite | null, red: null as THREE.Sprite | null,
  x: 0, y: 0, z: 0, told: false, play: -1, next: 0,
};
export const GEDENKBOJE = S;

function build(id: string) {
  S.root = null; S.lamp = null; S.red = null; S.play = -1; S.told = false;
  if (id !== SEC || G.mode === 'intro') return;                        // im Vorspann (Jahr 0) gibt es sie noch nicht
  const near = bojeGruppe('Gedenkboje'), far = bojeGruppe('GedenkbojeFern');
  const f = world.fields[0]; if (!near || !f) return;
  const g = gateTo('heimstatt'), tx = g ? g.x : 0, tz = g ? g.z : 0;
  let dx = tx - f.x, dz = tz - f.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  S.x = f.x + dx * (f.r + 220); S.y = f.y + 25; S.z = f.z + dz * (f.r + 220);
  clearRocks((x, y, z, r) => d3(x, y, z, S.x, S.y, S.z) < 160 + r);
  const root = new THREE.Group(); root.position.set(S.x, S.y, S.z);
  root.rotation.y = Math.atan2(dx, dz);                                // Vorderseite (Modell +Z: Tür, „Wir warten noch“) zum Tor nach Heimstatt
  const lod = new THREE.LOD(); lod.position.y = -4.8;                  // Mitte der Boje im Ursprung des Orts
  lod.addLevel(near, 0); if (far) lod.addLevel(far, 260);
  root.add(lod);
  S.lamp = new THREE.Sprite(glowMat(0xffe2b0, 0.85)); S.lamp.position.set(0, LAMP_Y - 4.8, 0); S.lamp.scale.setScalar(3.2); root.add(S.lamp);
  S.red = new THREE.Sprite(glowMat(0xff3020, 0.9)); S.red.position.set(0.9, RED_Y - 4.8, 0.9); S.red.scale.setScalar(1.1); root.add(S.red);
  scene.add(root); world.extras.push(root);
  // Kollision: Kugeln entlang der Boje (Schwimmkörper unten breit, Turm schmaler)
  world.solids.push({ x: S.x, y: S.y, z: S.z, R: 8, sph: [[0, -2.6, 0, 2.5], [0, -0.4, 0, 2.3], [0, 1.8, 0, 1.9], [0, 3.6, 0, 1.4]] });
  S.root = root;
  ORTE.push({ id: 'gedenkboje', name: 'Gedenkboje MB-11', x: S.x, y: S.y, z: S.z, R: 10, mesh: root, dot: 0xffd27a });
}

const dist = () => d3(P.x, P.y, P.z, S.x, S.y, S.z);
orteKey.push(() => {
  if (!S.root || world.def?.id !== SEC || dist() > REACH) return false;
  if (S.play >= 0) { S.play = -1; radio('MB-11', 'Archiv angehalten.'); return true; }
  S.play = 0; S.next = G.time; snd(330, 0.5, 'sine', 0.03, 0);
  return true;
});
ortePrompt.push(() => {
  if (!S.root || world.def?.id !== SEC || dist() > REACH) return null;
  return S.play >= 0 ? '[E] Archiv anhalten' : '[E] Archiv hören';
});

export function updateGedenkboje(dt: number) {
  if (!S.root || world.def?.id !== SEC || world.surface) return;
  const t = G.time, d = dist(), live = G.mode === 'play' && !G.dead;
  S.root.visible = G.mode !== 'intro';
  S.root.children[0].rotation.y += dt * 0.012;                         // dreht sich langsam um die Hochachse
  S.lamp!.material.opacity = 0.7 + 0.15 * Math.sin(t * 0.9);
  S.red!.visible = Math.sin(t * 2.1) > 0.6;
  if (live && !S.told && d < 600) {
    S.told = true;
    if (!P.gedenk) { P.gedenk = 1; saveGame(); radio('SONNENWACHT', 'Du bist an der Gedenkboje. Hier kam die Bastion durch, und hier brach das Tor hinter ihr zusammen. Die Namen der elf Schiffe stehen auf den Tafeln. Mit E hörst du das Archiv.'); }
  }
  // Archiv: Spruch für Spruch zu den Zeiten in ARCHIV (Sekunden ab Start, S.next = Startzeit)
  if (S.play >= 0) {
    if (d > 1500) { S.play = -1; return; }
    const [who, text, at] = ARCHIV[S.play];
    if (t >= S.next + at) {
      radio(who, text, who === 'MAREN HOLLWEG' ? '#ffd27a' : who === 'MB-11' ? '#e8c48a' : '#9fb8c8');
      S.play++;
      if (S.play >= ARCHIV.length) S.play = -1;
    }
  }
}

sectorHooks.push({ build, clear: () => { dropOrt('gedenkboje'); S.root = null; S.lamp = null; S.red = null; S.play = -1; } });
