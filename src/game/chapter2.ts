import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { d3, rng, hashStr } from '../core/util';
import { snd, sfx } from '../core/audio';
import { SECTOR } from '../data/galaxy';
import { P, G, saveGame } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy } from './combat';
import { SHARED } from './shared';
import { IN, storyNpc, nearNpc, hangarSpot } from './interior';
import { addRep } from './reputation';
import { closeMenu } from '../ui/dock';
import { talk, playScene, registerChain, st, endChain, storyCtx, storyHooks, startChain, dialogBusy, settled, type Step, type Obj } from './story';
import { terrainAt, liquidAt } from './surface';
import { FOOT, footTargets } from './onfoot';
import { addGuardDrones, guardsLeft } from './fieldfight';

// =====================================================================================
// Kapitel 2: „Splitter der Erbauer“ (siehe docs/story.md)
// Krull: Das Ferrit im Splittergürtel singt. Splitter-Mine (Vorarbeiter Kessler) → drei singende Brocken scannen
// → die Muster zeigen auf Schlacke Prime → zu Fuß zur Ruine der Erbauer, Wachdrohnen, Archivkristall bergen
// → daneben eine Rettungskapsel der „Weitsicht“ mit einer Aufnahme → Kristall der Gilde (Splitter-Mine) oder dem Rat (Bastion)
// → Szene je nach Wahl; Brummer: Die Aufnahme ist erst vier Monate alt.
// =====================================================================================
const SEC = 'splitter', PLANET = 'schlacke';
const T = 'Kapitel 2 · Splitter der Erbauer';
const c2 = () => (st().c2 = st().c2 || {}) as { pts?: number[][]; pi?: number; ruin?: number[]; got?: boolean; pod?: boolean; guards?: boolean; foes?: boolean; choice?: 'gilde' | 'rat'; kessler?: boolean };
const inSpace = (id: string) => !!world.def && world.def.id === id && !world.surface;
const onPlanet = () => !!world.surface && world.surface.planet === PLANET;
const docked = (id: string) => !!G.dockedAt && G.dockedAt.id === id;
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
const route = (to: string) => { if (P.sector !== to) P.route = to; };
const S = { foes: [] as any[], met: false, scene: false };

// drei singende Ferrit-Brocken rund um das erste Feld im Splittergürtel
function places() {
  const d = c2();
  if (!d.pts) {
    const f = SECTOR[SEC].fields[0], [cx, cy, cz] = f.pos, r = f.r;
    d.pts = [0, 1, 2].map(i => { const a = 1.1 + i * 2.05; return [Math.round(cx + Math.cos(a) * r * 0.75), Math.round(cy + (i - 1) * 60), Math.round(cz + Math.sin(a) * r * 0.75)]; });
    d.pi = 0;
  }
  return d as { pts: number[][]; pi: number };
}
// Ruine auf Schlacke Prime: feste, trockene Stelle 1,2–2 km von der Basis
function ruinPos() {
  const d = c2();
  if (!d.ruin && onPlanet()) {
    const R = rng(hashStr('ruine-erbauer'));
    for (let t = 0; t < 200; t++) {
      const a = R.range(0, Math.PI * 2), r = R.range(1200, 2000), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (liquidAt(x, z) || [-14, 14].some(o => liquidAt(x + o, z) || liquidAt(x, z + o))) continue;
      if (Math.abs(terrainAt(x + 10, z) - terrainAt(x - 10, z)) + Math.abs(terrainAt(x, z + 10) - terrainAt(x, z - 10)) > 6) continue;
      d.ruin = [Math.round(x), Math.round(z)]; break;
    }
  }
  return d.ruin || null;
}
const lineSpace = (id: string, name: string): Obj => [`Springe nach <b>${name}</b>${P.route === id ? ' · Route gesetzt (Karte: M)' : ''}`, false, false];

const STEPS: Step[] = [
  { // 0: Krull funkt
    title: T,
    enter: () => {
      const lines = () => {
        talk(['KRULL', 'Pilot, Krull hier. Seit dem Signal singt das Ferrit im Splittergürtel. Meine Leute an der Splitter-Mine hören es in den Scannern.'],
          ['KRULL', 'Flieg hin und sprich mit Vorarbeiter Kessler. Der Rat muss davon nichts wissen. Noch nicht.']);
        route(SEC);
      };
      if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'dock') playScene([{ text: 'KAPITEL 2', big: true, t: 2.4 }, { text: 'Splitter der Erbauer', big: true, t: 3 }], lines);
      else lines();
    },
    lines: () => [lineSpace(SEC, 'Splittergürtel')],
    done: () => inSpace(SEC),
  },
  { // 1: Splitter-Mine anfliegen
    title: T,
    enter: () => talk(['KESSLER', 'Splitter-Mine an Pilot. Krull hat dich angekündigt. Dock an, ich warte unten im Gang.']),
    lines: () => [inSpace(SEC) ? ['An der <b>Splitter-Mine</b> andocken · E', false, false] : lineSpace(SEC, 'Splittergürtel')],
    done: () => docked('splittermine'),
    markers: () => { const s = world.stations.find(x => x.id === 'splittermine'); return s && inSpace(SEC) ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'SPLITTER-MINE · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
  { // 2: Kessler erzählt
    title: T,
    enter: () => { places(); S.met = false; },
    // Kessler wartet im Hangar. Er redet erst, wenn der Pilot ausgestiegen, zu ihm gelaufen ist und ihn anspricht.
    tick: () => {
      if (!IN.active) { S.met = false; return; }      // wieder abgelegt: beim nächsten Andocken steht er neu da
      if (S.met || !settled() || IN.ship || !docked('splittermine')) return;
      S.met = storyNpc('Kessler', 'Splitter-Mine', 'Mit Vorarbeiter Kessler sprechen', () => {
        if (c2().kessler) { if (!dialogBusy()) talk(['KESSLER', 'Drei Brocken, drei Scans. Und bleib wachsam.']); return; }
        c2().kessler = true;
        talk(['KESSLER', 'Kessler. Ich grabe seit zwanzig Jahren in diesem Gürtel, und so was hab ich noch nie gehört.'],
          ['KESSLER', 'Drei Brocken draußen im Feld leuchten im Scanner wie Kirchenfenster. Das Muster ändert sich, wenn man hinsieht.'],
          ['KESSLER', 'Scann alle drei mit R. Ich schick die Daten an die Gilde. Und Pilot: Die Brocken ziehen Ferrox an.']);
        saveGame();
      }, '#ffb347', hangarSpot(-7), { model: 'mechaniker', tint: [0.95, 0.85, 0.7] });
    },
    lines: () => {
      if (!c2().kessler && !(IN.active && docked('splittermine'))) return [inSpace(SEC) ? ['An der <b>Splitter-Mine</b> andocken · E', false, false] : lineSpace(SEC, 'Splittergürtel')];
      return [['Aussteigen und zu <b>Vorarbeiter Kessler</b> gehen', !!c2().kessler || nearNpc('Kessler'), false], ['Mit Kessler sprechen · <b>E</b>', !!c2().kessler, false], ['Ablegen und zu den singenden Brocken fliegen', false, false]];
    },
    done: () => !!c2().kessler && G.mode === 'play' && !G.dockedAt && !dialogBusy(),      // erst weiter, wenn er ausgeredet hat
    markers: () => { const s = world.stations.find(x => x.id === 'splittermine'); return s && inSpace(SEC) && !c2().kessler ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'SPLITTER-MINE · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
  { // 3: drei Brocken scannen (beim zweiten tauchen Ferrox auf)
    title: 'Kapitel 2 · Singendes Ferrit',
    enter: () => { places(); },
    lines: () => {
      if (!inSpace(SEC)) return [lineSpace(SEC, 'Splittergürtel')];
      const d = places();
      const L: Obj[] = d.pts.map((p, i) => [`Singender Brocken ${i + 1}${i === d.pi ? ` · <b>${fmtDist(d3(p[0], p[1], p[2], P.x, P.y, P.z))}</b>` : ''}`, i < d.pi, false] as Obj);
      L.push(['Beim Brocken scannen · <b>R</b>', false, true]);
      return L;
    },
    tick: () => {
      if (!inSpace(SEC)) return;
      const d = places(), p = d.pts[d.pi];
      if (!p || d3(p[0], p[1], p[2], P.x, P.y, P.z) > 240 || storyCtx.scanAt < G.time - 2) return;
      d.pi++; storyCtx.scanAt = -99;
      burst(p[0], p[1], p[2], '#c070ff', 40, 60, 1.0);
      snd(660, 0.15, 'sine', 0.05, 500); setTimeout(() => snd(990, 0.2, 'sine', 0.04, -200), 150);
      if (d.pi === 1) talk(['KESSLER', 'Erstes Muster ist drin. Es wiederholt sich, wie ein Satz.']);
      if (d.pi === 2) {
        talk(['KESSLER', 'Zweites Muster. Krull flucht gerade sehr leise.']);
        if (!SHARED.client && !c2().foes) { c2().foes = true; const q = d.pts[2]; S.foes = [0, 1, 2].map(i => spawnEnemy('drone', q[0] + (i - 1) * 120, q[1] + 40, q[2] + 150)); }
      }
      saveGame();
    },
    done: () => places().pi >= 3,
    markers: () => { if (!inSpace(SEC)) return []; const d = places(), p = d.pts[d.pi]; return p ? [{ x: p[0], y: p[1], z: p[2], label: `SINGENDER BROCKEN ${d.pi + 1}`, col: '#c070ff', big: true }] : []; },
  },
  { // 4: die Karte zeigt nach Schlacke Prime
    title: 'Kapitel 2 · Die Karte',
    enter: () => {
      talk(['KRULL', 'Das ist keine Störung. Das ist eine Karte. Alle drei Muster zeigen auf denselben Ort: Schlacke Prime, im Schlackenfeld. Auf der Oberfläche.'],
        ['KRULL', 'Flieg runter und sieh nach, was da liegt. Die Gilde zahlt das Doppelte für alles, was du findest.']);
      route('schlacke');
    },
    lines: () => [onPlanet() ? ['Auf <b>Schlacke Prime</b> gelandet', true, false] : P.sector === 'schlacke' ? ['In den Orbit von <b>Schlacke Prime</b> fliegen und landen', false, false] : lineSpace('schlacke', 'Schlackenfeld')],
    done: () => onPlanet(),
  },
  { // 5: zur Ruine, Wachdrohnen
    title: 'Kapitel 2 · Die Ruine',
    enter: () => talk(['ROTH', 'Pilot, hier Roth. Ich hab gehört, wo du bist. Das Schlackenfeld ist Grenzgebiet, da unten wimmeln Drohnen. Lande nicht zu nah.']),
    lines: () => {
      const r = ruinPos(); if (!onPlanet() || !r) return [['Auf Schlacke Prime landen', false, false]];
      const px = FOOT.active ? FOOT.x : P.x, pz = FOOT.active ? FOOT.z : P.z;
      return [[`Zur Ruine der Erbauer · <b>${fmtDist(Math.hypot(r[0] - px, r[1] - pz))}</b>`, false, false], ['Landen und zu Fuß weiter (im Rover: F)', false, true], [`Wachdrohnen ausschalten${c2().guards ? ` · <b>${guardsLeft()}</b> übrig` : ''}`, !!c2().guards && guardsLeft() === 0, false]];
    },
    tick: () => {
      const r = ruinPos(); if (!onPlanet() || !r) return;
      const px = FOOT.active ? FOOT.x : P.x, pz = FOOT.active ? FOOT.z : P.z, d = Math.hypot(r[0] - px, r[1] - pz);
      if (!c2().guards && d < 260) {
        c2().guards = true; addGuardDrones(r[0], r[1], 4);
        talk(['KRULL', 'Siehst du das? Säulen aus reinem Ferrit. Das haben keine Menschen gebaut.'], ['ROTH', 'Wachdrohnen! Die bewachen das Ding. Räum sie weg!']);
      }
    },
    done: () => !!c2().guards && guardsLeft() === 0,
    markers: () => { const r = ruinPos(); return r && onPlanet() ? [{ x: r[0], y: terrainAt(r[0], r[1]) + 30, z: r[1], label: 'RUINE DER ERBAUER', col: '#c070ff', big: true }] : []; },
  },
  { // 6: Kristall bergen, Kapsel finden
    title: 'Kapitel 2 · Der Archivkristall',
    enter: () => talk(['KRULL', 'In der Mitte schwebt ein Kristall. Nimm ihn mit, vorsichtig.']),
    lines: () => [['Archivkristall bergen · <b>E</b> an der Ruine', !!c2().got, false], ['Die Rettungskapsel untersuchen · <b>E</b>', !!c2().pod, false]],
    tick: () => {
      const r = ruinPos(); if (!r || !onPlanet()) return;
      footTargets.length = 0;
      if (!c2().got) footTargets.push({ x: r[0], z: r[1], r: 4, label: 'Archivkristall bergen', act: () => {
        c2().got = true; burst(r[0], terrainAt(r[0], r[1]) + 2.5, r[1], '#c070ff', 60, 8, 1.2); sfx('pickup', 0.8, 0.7, () => snd(500, 0.4, 'sine', 0.05, 400));
        talk(['KRULL', 'Du hast ihn! Moment … neben der Ruine liegt noch etwas. Eine Rettungskapsel. Menschlich.']); saveGame();
      } });
      else if (!c2().pod) { const p = podPos(r); footTargets.push({ x: p[0], z: p[1], r: 3.5, label: 'Rettungskapsel untersuchen', act: () => {
        c2().pod = true; sfx('door_open', 0.5, 0.8);
        talk(['VARGA', 'Hier spricht Kapitänin Varga, Weitsicht. Wir sind durch. Das Tor hat uns nicht zerrissen, es hat uns verschoben. Wer das hört: Wir leben.'],
          ['ROTH', 'Eine Kapsel der Weitsicht. Hier draußen. Bring alles zurück. Sofort.']); saveGame();
      } }); }
    },
    done: () => !!c2().got && !!c2().pod,
    markers: () => { const r = ruinPos(); if (!r || !onPlanet()) return []; const p = c2().got ? podPos(r) : r; return [{ x: p[0], y: terrainAt(p[0], p[1]) + 6, z: p[1], label: c2().got ? 'RETTUNGSKAPSEL' : 'ARCHIVKRISTALL', col: c2().got ? '#ffb347' : '#c070ff', big: true }]; },
  },
  { // 7: Gilde oder Rat?
    title: 'Kapitel 2 · Wem gehört das Archiv?',
    enter: () => {
      footTargets.length = 0;
      talk(['KRULL', 'Bring den Kristall zur Splitter-Mine. Die Gilde hat ihn gefunden, die Gilde behält ihn.'],
        ['HOLLWEG', 'Pilot, das Archiv gehört der Crew, nicht der Gilde. Bring es zur Bastion.']);
    },
    lines: () => [['Zur <b>Splitter-Mine</b> (Gilde) <i>oder</i> zur <b>Bastion</b> (Rat) bringen', false, false], ['Wo du andockst, dort bleibt der Kristall', false, true]],
    done: () => { if (docked('splittermine')) { c2().choice = 'gilde'; return true; } if (docked('bastion')) { c2().choice = 'rat'; return true; } return false; },
    markers: () => {
      const L = [] as { x: number; y: number; z: number; label: string; col: string; big?: boolean }[];
      const sm = world.stations.find(s => s.id === 'splittermine'), b = world.stations.find(s => s.id === 'bastion');
      if (sm) L.push({ x: sm.dock.x, y: sm.dock.y, z: sm.dock.z, label: 'SPLITTER-MINE · GILDE', col: '#ffb347', big: true });
      if (b) L.push({ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · RAT', col: '#bcd8ff', big: true });
      return L;
    },
  },
  { // 8: Szene je nach Wahl
    title: 'Kapitel 2 · Das Archiv',
    enter: () => { S.met = false; S.scene = false; },
    // Die Runde wartet im Hangar der gewählten Station. Die Szene beginnt erst, wenn der Pilot zu ihr läuft und dazutritt.
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      const gilde = c2().choice === 'gilde';
      if (S.met || S.scene || !settled() || IN.ship || !docked(gilde ? 'splittermine' : 'bastion')) return;
      const { x: hx, z: hz } = hangarSpot(-4), say = 'Den Archivkristall übergeben';
      const go = () => { if (S.scene) return; S.scene = true; IN.yaw = Math.atan2(-(hx - IN.x), -(hz - IN.z)); IN.pitch = 0; archiv(gilde); };
      if (gilde) { S.met = storyNpc('Krull', 'Bergbaugilde', say, go, '#ffb347', { x: hx, z: hz }, { model: 'merchant', tint: [1.05, 0.95, 0.8] }); storyNpc('Kessler', 'Splitter-Mine', say, go, '#ffb347', { x: hx + 2.4, z: hz + 1 }, { model: 'mechaniker', tint: [0.95, 0.85, 0.7] }); }
      else { S.met = storyNpc('Hollweg', 'Flottenrat', say, go, '#bcd8ff', { x: hx, z: hz }, { model: 'hollweg' }); storyNpc('Roth', 'Grenzwacht', say, go, '#f2d36b', { x: hx + 2.6, z: hz + 1.2 }, { model: 'roth' }); }
    },
    lines: () => {
      const gilde = c2().choice === 'gilde', who = gilde ? 'Gildemeisterin Krull' : 'Ratsherr Hollweg';
      if (!(IN.active && docked(gilde ? 'splittermine' : 'bastion'))) return [[`An der <b>${gilde ? 'Splitter-Mine' : 'Bastion'}</b> andocken · E`, false, false]];
      return [[`Aussteigen und zu <b>${who}</b> gehen`, S.scene || nearNpc(gilde ? 'Krull' : 'Hollweg'), false], ['Den Archivkristall übergeben · <b>E</b>', S.scene, false]];
    },
    done: () => false,
    markers: () => { const s = world.stations.find(x => x.id === (c2().choice === 'gilde' ? 'splittermine' : 'bastion')); return s ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'ANDOCKEN', col: '#ffd27a', big: true }] : []; },
  },
];
function archiv(gilde: boolean) {
  if (G.mode === 'dock' && G.inside) closeMenu();
  const lines = gilde ? [
    { who: 'KRULL', text: 'Gute Entscheidung. Der Kristall ist ein Speicher, Pilot. Ein Archiv der Erbauer. Und es ist nicht leer.' },
    { who: 'KESSLER', text: 'Er antwortet auf das Tor-Signal. Als würde er auf etwas warten.' },
    { who: 'HOLLWEG', text: 'Krull, das war kein Gildefund, das war Eigentum der Crew. Darüber reden wir noch.' },
    { who: 'KRULL', text: 'Reden wir, Ratsherr. Sobald Sie verstehen, was wir in der Hand haben.' },
  ] : [
    { who: 'HOLLWEG', text: 'Danke, Pilot. Der Kristall bleibt in der Bastion, unter Verschluss.' },
    { who: 'KRULL', text: 'Unter Verschluss? Hollweg, Sie sperren die wichtigste Entdeckung seit dem Riss in einen Schrank!' },
    { who: 'ROTH', text: 'Lieber im Schrank als bei den Ferrox. Die Drohnen da unten haben ihn bewacht. Die Frage ist: wofür?' },
  ];
  playScene([...lines,
    { who: 'BRUMMER', text: 'Ich hab die Kapsel ausgewertet. Die Aufnahme ist echt. Und sie ist nicht achtunddreißig Jahre alt.' },
    { who: 'BRUMMER', text: 'Sie ist vier Monate alt.', t: 3.5 },
    { text: 'Die Weitsicht lebt.', big: true, t: 4.5 },
    { text: 'KAPITEL 2 ABGESCHLOSSEN', big: true, t: 3.5 },
  ], finish);
}
// Schritt 2 bleibt beim Laden stehen, solange Kessler noch nicht gesprochen hat (der Schritt führt selbst zurück zur Mine)
registerChain({ key: 'ch2', steps: STEPS, resume: n => (n === 2 ? (c2().kessler ? 3 : 2) : n === 8 ? 7 : n) });

function finish() {
  endChain('ch2');
  const gilde = c2().choice === 'gilde';
  P.credits += 2500;
  if (gilde) { addRep('gilde', 60); addRep('rat', -15); } else { addRep('rat', 60); addRep('gilde', -15); }
  addRep('wacht', 20);
  storyHooks.banner('KAPITEL 2 ABGESCHLOSSEN', `+2.500 Credits · ${gilde ? 'Bergbaugilde' : 'Flottenrat'} dankt dir`, '#ffd27a');
  snd(523, 0.3, 'triangle', 0.06, 0); setTimeout(() => snd(659, 0.3, 'triangle', 0.06, 0), 200); setTimeout(() => snd(784, 0.5, 'triangle', 0.06, 0), 400);
  saveGame();
  startChain('ch3', 30000);
}

// ---------- Ruine der Erbauer und Rettungskapsel auf Schlacke Prime ----------
const podPos = (r: number[]) => [r[0] + 22, r[1] - 9];
let ruin: { g: THREE.Group; crystal: THREE.Mesh; glow: THREE.Sprite } | null = null, ruinFor: THREE.Object3D | null = null;
function buildRuin(r: number[]) {
  const g = new THREE.Group(), y = terrainAt(r[0], r[1]);
  g.position.set(r[0], y, r[1]);
  const ferrit = new THREE.MeshStandardMaterial({ color: 0x2a2236, metalness: 0.85, roughness: 0.28, emissive: 0x200a38, emissiveIntensity: 0.6 });
  const vein = new THREE.MeshStandardMaterial({ color: 0x4a2a70, emissive: 0xa050ff, emissiveIntensity: 1.6 });
  // sechs schräge Säulen aus Ferrit im Kreis, zwei umgestürzt
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2, h = 9 + (i % 3) * 3, p = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.3, h, 5), ferrit);
    const down = i === 2 || i === 5;
    p.position.set(Math.cos(a) * 9, down ? 1 : h / 2 - 0.5, Math.sin(a) * 9);
    p.rotation.set(down ? Math.PI / 2 - 0.15 : 0.12 * Math.sin(i * 3), a, down ? 0 : 0.1 * Math.cos(i * 2)); p.castShadow = true; g.add(p);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.12, h * 0.8, 0.12), vein); v.position.set(0, 0, 0.9); p.add(v);
  }
  // Sockel und schwebender Kristall
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.8, 1.2, 6), ferrit); base.position.y = 0.4; base.castShadow = true; g.add(base);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), vein); crystal.position.y = 3; crystal.scale.set(0.7, 1.4, 0.7); g.add(crystal);
  const glow = new THREE.Sprite(glowMat(0xb070ff, 0.8)); glow.scale.setScalar(9); glow.position.y = 3; g.add(glow);
  const light = new THREE.PointLight(0xb070ff, 30, 30, 2); light.position.y = 3.5; g.add(light);
  // Rettungskapsel der Weitsicht, halb im Boden
  const pp = podPos(r), pod = new THREE.Group(), py = terrainAt(pp[0], pp[1]);
  pod.position.set(pp[0] - r[0], py - y + 0.4, pp[1] - r[1]); pod.rotation.set(0.3, 0.7, 0.45);
  const hull = new THREE.MeshStandardMaterial({ color: 0x8a8e94, metalness: 0.6, roughness: 0.6 }), dark = new THREE.MeshStandardMaterial({ color: 0x2c2e32, metalness: 0.5, roughness: 0.7 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 16), hull); body.rotation.z = Math.PI / 2; pod.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.4, 16), hull); nose.rotation.z = -Math.PI / 2; nose.position.x = 2.4; pod.add(nose);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.12, 8, 20), dark); ring.rotation.y = Math.PI / 2; ring.position.x = -1.2; pod.add(ring);
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = '#8a8e94'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#1a1c20'; x.font = '700 40px "Share Tech Mono",Consolas,monospace'; x.textAlign = 'center'; x.fillText('WS-07', 128, 46);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: t })); label.position.set(0, 0.7, 1.11); pod.add(label);
  const beacon = new THREE.Sprite(glowMat(0xffb347, 0.9)); beacon.scale.setScalar(1.2); beacon.position.set(0, 1.25, 0); pod.add(beacon);
  g.add(pod);
  scene.add(g); world.extras.push(g);
  ruin = { g, crystal, glow };
}
// pro Bild: Ruine zeigen, sobald Kapitel 2 so weit ist (und danach für immer), Kristall drehen bis er geborgen ist
export function updateChapter2(dt: number) {
  const s = P.story, v = s?.ch2, show = !!s && onPlanet() && (v === 'done' || (typeof v === 'number' && v >= 4));
  if (!show) { if (ruin && !world.extras.includes(ruin.g)) ruin = null; return; }
  const r = ruinPos(); if (!r) return;
  if (!ruin || ruinFor !== world.extras[0]) { ruin = null; buildRuin(r); ruinFor = world.extras[0]; }
  const got = v === 'done' || !!c2().got;
  ruin!.crystal.visible = !got; ruin!.glow.visible = !got;
  if (!got) { ruin!.crystal.rotation.y += dt * 0.9; ruin!.crystal.position.y = 3 + Math.sin(G.time * 1.6) * 0.25; }
}
