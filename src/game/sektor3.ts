import * as THREE from 'three';
import { glowMat, scene } from '../core/engine';
import { d3 } from '../core/util';
import { snd } from '../core/audio';
import { world, sectorHooks } from './world';
import { ORTE, ortePrompt, orteKey, dropOrt } from './orte';
import { P, G, saveGame } from './state';
import { radio } from '../ui/radio';
import { bojeGruppe, decoLaden } from '../models/bojen';
import { collisionSpheres } from '../models/stationModels';

// =====================================================================================
// Heimstatt, Phase 3 (seit 24.11.2026, docs/heimstatt.md): Torwachen an den drei Toren und der Horchposten „Fernohr“ am Ostrand.
// Beides Orte ohne Andocken (orte.ts: Navigation, Sektorkarte, Fernansicht, HUD). Das Pumpwerk am Reifschleier ist eine Station
// (galaxy.ts, models/pumpwerk.ts). Modelle aus Blender (asset-src/neu/sektor3, s3_bau.py → s3_export.py → deco/<Name>), Nah- und
// Fernmodell als THREE.LOD; sie kommen aus dem Hintergrund-Paket und erscheinen, sobald sie geladen sind.
// =====================================================================================

const SEC = 'heimstatt', Y = new THREE.Vector3(0, 1, 0);
const FERNOHR = { x: 55000, y: 400, z: 2500 };                  // 55 km östlich der Bastion, zwischen den Toren nach Lichtwall (NO) und Neuhafen (SO)
// Funkspruch der Torwache beim ersten Anflug (je Tor ein fester Satz, damit er vertont werden kann)
const TW_FUNK: Record<string, string> = {
  lichtwall: 'Torwache Lichtwall an anfliegendes Schiff. Das Tor ist frei, vor Ihnen kein Verkehr. Gute Reise, Pilot.',
  neuhafen: 'Torwache Neuhafen an anfliegendes Schiff. Drüben ist mehr los als hier, halten Sie Abstand zu den Frachtern. Gute Reise.',
  sonnenfeld: 'Torwache Sonnenfeld an anfliegendes Schiff. Das Tor ist frei. Grüßen Sie die Sonnenwacht von uns.',
};
// Abhörprotokoll des Horchpostens (Taste E): Spruch für Spruch, Sekunden ab Start; der letzte nur nach Kapitel 5 (Aufhänger für später)
const PROTOKOLL: [string, string, number, boolean?][] = [
  ['FERNOHR', 'Abhörprotokoll Fernohr, Kanal Ost. Alles, was aus dem Ferrox-Gebiet kommt, landet hier.', 0],
  ['FERNOHR', 'Grundrauschen des Schwarms. Sieben Rufe in der Stunde, seit Jahren dieselbe Zahl.', 7],
  ['FERNOHR', 'Seit dem Kristall kommen die Rufe in Wellen, einundvierzig Minuten Abstand. Wir wissen nicht, was sie zählen.', 15],
  ['FERNOHR', 'Seit dem Ruf aus Halden liegt ein zweiter Träger im Rauschen. Schwach, regelmäßig, und er kommt nicht von den Ferrox.', 25, true],
];

interface Bau { id: string; name: string; root: THREE.Group; x: number; y: number; z: number; told: boolean; lamps: THREE.Sprite[]; to?: string }
const S = { baue: [] as Bau[], play: -1, next: 0, gen: 0 };
export const SEKTOR3 = S;

function lodOf(name: string, far: number) {
  const near = bojeGruppe(name), farM = bojeGruppe(name + 'Fern');
  if (!near) return null;
  const lod = new THREE.LOD(); lod.addLevel(near, 0); if (farM) lod.addLevel(farM, far);
  return { lod, near };
}
// Ort aufstellen: Modell an (x, y, z), Vorderseite (Modell +X) in Richtung yaw, Kollision aus dem Nahmodell
function place(id: string, name: string, model: string, x: number, y: number, z: number, yaw: number, R: number, lamps: [number, number, number, number, number][], dot: number, to?: string) {
  const m = lodOf(model, R * 4); if (!m) return;
  const root = new THREE.Group(); root.position.set(x, y, z); root.rotation.y = yaw;
  root.add(m.lod);
  const ls: THREE.Sprite[] = [];
  for (const [lx, ly, lz, col, size] of lamps) { const sp = new THREE.Sprite(glowMat(col, 0.9)); sp.position.set(lx, ly, lz); sp.scale.setScalar(size); root.add(sp); ls.push(sp); }
  scene.add(root); world.extras.push(root);
  const sph = collisionSpheres(m.near, R > 150 ? 22 : 16).map(([sx, sy, sz, r]) => { const v = new THREE.Vector3(sx, sy, sz).applyAxisAngle(Y, yaw); return [v.x, v.y, v.z, r]; });
  world.solids.push({ x, y, z, R: R + 20, sph });
  ORTE.push({ id, name, x, y, z, R, mesh: root, dot });
  S.baue.push({ id, name, root, x, y, z, told: false, lamps: ls, to });
}

function build(id: string) {
  S.baue = []; S.play = -1;
  if (id !== SEC || world.surface || G.mode === 'intro') return;
  const gen = ++S.gen;
  Promise.all(['Torwache', 'TorwacheFern', 'Fernohr', 'FernohrFern'].map(decoLaden)).then(ok => {
    if (gen !== S.gen || world.def?.id !== SEC || world.surface || !ok[0] || !ok[2]) return;
    // Torwachen: 300 m neben jedem Tor, 120 m weiter innen, Vorderseite (Leitturm, Scheinwerfer) zum Tor
    for (const g of world.gates) {
      const sx = -g.nz, sz = g.nx, x = g.x + sx * 300 + g.nx * 120, z = g.z + sz * 300 + g.nz * 120;
      const yaw = Math.atan2(-(g.z - z), g.x - x);
      place('torwache_' + g.to, 'Torwache ' + g.name, 'Torwache', x, g.y + 20, z, yaw, 60,
        [[36, 30, 0, 0xffc070, 6], [32, 51, 0, 0xff3020, 3.5], [47, 13.4, 6.5, 0xfff4e0, 5], [47, 13.4, -6.5, 0xfff4e0, 5]], 0x9fc8ff, g.to);
    }
    // Horchposten: Schüsseln nach Osten (+X), ins Ferrox-Gebiet
    place('fernohr', 'Horchposten Fernohr', 'Fernohr', FERNOHR.x, FERNOHR.y, FERNOHR.z, 0, 110,
      [[-10, -7.5, 4.2, 0xffd8a0, 3], [95, 0, 4.6, 0xff3020, 3], [-95, 0, 4.6, 0xff3020, 3]], 0xcfe4ff);
  });
}

const near = (b: Bau, r: number) => d3(P.x, P.y, P.z, b.x, b.y, b.z) < r;
const fernohr = () => S.baue.find(b => b.id === 'fernohr') || null;
orteKey.push(() => {
  const f = fernohr(); if (!f || world.def?.id !== SEC || !near(f, 260)) return false;
  if (S.play >= 0) { S.play = -1; radio('FERNOHR', 'Protokoll angehalten.'); return true; }
  S.play = 0; S.next = G.time; snd(300, 0.4, 'sine', 0.03, 0);
  return true;
});
ortePrompt.push(() => {
  const f = fernohr(); if (!f || world.def?.id !== SEC || !near(f, 260)) return null;
  return S.play >= 0 ? '[E] Protokoll anhalten' : '[E] Abhörprotokoll hören';
});

export function updateSektor3(dt: number) {
  if (!S.baue.length || world.def?.id !== SEC || world.surface) return;
  const t = G.time, live = G.mode === 'play' && !G.dead;
  for (const b of S.baue) {
    b.lamps.forEach((l, i) => { if (i === 1) l.visible = Math.sin(t * 2.2 + b.x) > 0.55; });
    if (!live || b.told || !near(b, b.id === 'fernohr' ? 900 : 700)) continue;
    b.told = true;
    if (b.to && TW_FUNK[b.to]) radio('TORWACHE', TW_FUNK[b.to], '#9fc8ff');
    else if (b.id === 'fernohr' && !P.fernohr) { P.fernohr = 1; saveGame(); radio('FERNOHR', 'Horchposten Fernohr an Pilot. Von hier hören wir nach Osten, ins Ferrox-Gebiet. Wenn du mithören willst: Mit E spiele ich dir das Protokoll vor.', '#cfe4ff'); }
  }
  // Abhörprotokoll
  if (S.play >= 0) {
    const f = fernohr();
    if (!f || !near(f, 1500)) { S.play = -1; return; }
    const late = P.story?.ch5 === 'done';
    while (S.play < PROTOKOLL.length && PROTOKOLL[S.play][3] && !late) S.play++;
    if (S.play >= PROTOKOLL.length) { S.play = -1; return; }
    const [who, text, at] = PROTOKOLL[S.play];
    if (t >= S.next + at) { radio(who, text, '#cfe4ff'); S.play++; if (S.play >= PROTOKOLL.length) S.play = -1; }
  }
  void dt;
}

sectorHooks.push({ build, clear: () => { for (const b of S.baue) dropOrt(b.id); S.baue = []; S.play = -1; S.gen++; } });
