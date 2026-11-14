import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { d3, rng, hashStr } from '../core/util';
import { snd, sfx } from '../core/audio';
import { SECTOR } from '../data/galaxy';
import { planetBaseId } from '../data/planets';
import { P, G, saveGame } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy, killEnemy } from './combat';
import { SHARED } from './shared';
import { hidden } from './player';
import { IN, storyNpc, nearNpc, hangarSpot } from './interior';
import { addRep } from './reputation';
import { closeMenu } from '../ui/dock';
import { talk, playScene, registerChain, st, endChain, storyHooks, dialogBusy, settled, type Step, type Obj, type Marker } from './story';
import { terrainAt, liquidAt } from './surface';
import { FOOT, footTargets } from './onfoot';
import { DUN, enterDungeon, type DungeonEntrance } from './dungeon';
import { buildStoryShip, spawnStoryShip, removeStoryShip, spawnStoryAlly } from './npc';

// =====================================================================================
// Kapitel 4: „Ins Herz“ (siehe docs/story.md)
// Der Rat gibt den Flug frei. Krull (Talstadt) baut aus sechs Ferrit einen Leser. Im Stummfeld (Funkstille) treibt ein abgerissenes Frachtmodul
// der „Weitsicht“: langsam heran und das Logbuch auslesen – das Schiff wurde vom Schwarm in den Kern geschleppt. Im Ferrox-Kern langsam an den
// Bienenstöcken vorbei, auf Kernkristall landen, zu Fuß ins Archiv der Erbauer (Dungeon-Art „Archiv“): Riegel lösen, Wächterkern, Leitkristall.
// Der Leser übersetzt unterwegs, was die Ferrox sind. Mit dem Leitkristall gibt der Schwarm die Weitsicht frei; sie wird bis zum Tor begleitet
// (drei Angriffswellen, Achterberg kommt mit Staffel Vier). Der Kristall geht an Rat, Grenzwacht oder Gilde. Die Weitsicht erreicht Heimstatt.
// Bewusst anders als die Kapitel davor: keine „drei Punkte scannen“-Aufgabe; dafür Schleichen (unter 60 m/s unsichtbar), Auslesen im Stillstand, Geleit.
// =====================================================================================
const STUMM = 'stummfeld', KERN = 'ferroxkern', HOME = 'heimstatt', FERRIT = 6, SLOW = 60;
const TAL = planetBaseId(HOME);                                      // Talstadt auf Heimstatt II (Sitz der Gilde)
const T = 'Kapitel 4 · Ins Herz';
const MOD = [-300, 180, -1900];                                      // Frachtmodul der Weitsicht im Stummfeld
const ARCH_ID = 'ferroxkern:archiv';
type Choice = 'rat' | 'wacht' | 'gilde';
type C4 = { rat?: boolean; krull?: boolean; leser?: boolean; woke?: boolean; log?: boolean; arch?: number[]; t1?: boolean; t2?: boolean; t3?: boolean; key?: boolean; free?: boolean; out?: boolean; choice?: Choice };
const c4 = () => ((st() as any).c4 = (st() as any).c4 || {}) as C4;
const step = () => (P.story ? (st() as any).ch4 as number | 'done' | undefined : undefined);      // im Hauptmenü gibt es noch keinen Spielstand
const inSpace = (id: string) => !!world.def && world.def.id === id && !world.surface;
const onPlanet = () => !!world.surface && world.surface.planet === KERN;
const docked = (id: string) => !!G.dockedAt && G.dockedAt.id === id;
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
const route = (to: string) => { if (P.sector !== to) P.route = to; };
const lineSpace = (id: string, name: string): Obj => [`Springe nach <b>${name}</b>${P.route === id ? ' · Route gesetzt (Karte: M)' : ''}`, false, false];
const speed = () => Math.hypot(P.vx, P.vy, P.vz);
const stealthLine = (): Obj => (hidden.on ? ['Dämpfer wirkt: Der Schwarm sieht dich nicht', true, true] : [`Unter ${SLOW} m/s bleiben, dann sieht dich der Schwarm nicht · jetzt <b>${Math.round(speed())}</b>`, false, true]);
const dockMark = (id: string, label: string, col: string): Marker[] => { const s = world.stations.find(x => x.id === id); return s && !world.surface ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label, col, big: true }] : []; };
const gateTo = (to: string) => world.gates.find(g => g.to === to) || world.gates[0];
// Zustand, der nicht gespeichert wird (gilt für den Aufenthalt im Sektor)
const S = { met: false, scene: false, slow: 0, calm: 0, read: 0, boss: false, hold: null as number[] | null, gate: '', ws: null as any, d0: 1, wave: 0, foes: [] as any[] };

// ---------- Orte ----------
// Liegeplatz der gefangenen Weitsicht und das Tor, zu dem sie später fliegt. Der Platz liegt 950 m neben einem Bienenstock (außerhalb seiner
// Geschütze), auf der Seite, die vom Asteroidenfeld wegzeigt. Unter allen Paaren aus Bienenstock und Tor gewinnt das, dessen gerader Weg den
// größten Abstand zu den Feldern hält: Das Schiff fliegt geradeaus und soll nicht durch Felsen treiben. Ohne Bienenstock ein fester Punkt.
function plan() {
  if (!S.hold) {
    const fields = (world.def?.fields || []) as { pos: number[]; r: number }[];
    const clear = (a: number[], g: { x: number; z: number }) => {      // kleinster Abstand der Strecke zu einem Feldrand (negativ: sie führt hindurch)
      let m = 5000;
      for (const f of fields) {
        const dx = g.x - a[0], dz = g.z - a[2], t = Math.max(0, Math.min(1, ((f.pos[0] - a[0]) * dx + (f.pos[2] - a[2]) * dz) / (dx * dx + dz * dz || 1)));
        m = Math.min(m, Math.hypot(a[0] + dx * t - f.pos[0], a[2] + dz * t - f.pos[2]) - f.r);
      }
      return m;
    };
    let best: number[] | null = null, bg = '', bd = -1e9;
    for (const m of world.enemies) {
      if (m.type !== 'mother') continue;
      const f = fields[0], dx = f ? m.x - f.pos[0] : m.x, dz = f ? m.z - f.pos[2] : m.z, l = Math.hypot(dx, dz) || 1;
      const h = [m.x + dx / l * 950, m.y + 60, m.z + dz / l * 950];
      if (Math.hypot(h[0], h[2]) > 7000) continue;
      for (const g of world.gates) { const c = clear(h, g); if (c > bd) { bd = c; best = h; bg = g.to; } }
    }
    S.hold = best || [2600, 150, -900]; S.gate = bg || STUMM;
  }
  return S.hold;
}
const hold = plan;
const escGate = () => { plan(); return gateTo(S.gate); };
// Eingang des Archivs auf Kernkristall: feste, trockene, ebene Stelle 700–1200 m vom Landeplatz
function archPos() {
  const d = c4();
  if (!d.arch && onPlanet()) {
    const R = rng(hashStr('archiv-erbauer'));
    for (let t = 0; t < 300; t++) {
      const a = R.range(0, Math.PI * 2), r = R.range(700, 1200), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (liquidAt(x, z) || [-16, 16].some(o => liquidAt(x + o, z) || liquidAt(x, z + o))) continue;
      if (Math.abs(terrainAt(x + 12, z) - terrainAt(x - 12, z)) + Math.abs(terrainAt(x, z + 12) - terrainAt(x, z - 12)) > 7) continue;
      d.arch = [Math.round(x), Math.round(z)]; break;
    }
    if (!d.arch) d.arch = [900, 300];
  }
  return d.arch || null;
}

const ARCH: DungeonEntrance = {
  id: ARCH_ID, x: 0, y: 0, z: 0, yaw: 0, size: 8, name: 'Archiv der Erbauer', kind: 'archiv', danger: 3,      // zwei Stufen unter dem Sektor: Die Geschichte soll schaffbar bleiben
  goal: {
    label: 'Leitkristall bergen', got: () => !!c4().key,
    take: () => {
      c4().key = true; saveGame();
      talk(['LESER', 'Letzter Eintrag. Der Leitkristall trägt einen einzigen Befehl an die Schürfer: Fracht freigeben. Mehr konnten wir ihnen am Ende nicht mehr sagen.']);
    },
  },
};
function enterArch() {
  const a = archPos(); if (!a || DUN.active) return;
  ARCH.x = a[0]; ARCH.z = a[1]; ARCH.y = terrainAt(a[0], a[1]);
  footTargets.length = 0; S.boss = false;
  enterDungeon(ARCH);
}
// Ansprechpunkt am Eingang, solange der Leitkristall noch im Archiv liegt
function archTarget() {
  const a = archPos(); if (!a || !onPlanet() || DUN.active) return;
  const x = a[0], z = a[1] + 7;
  if (!footTargets.some(t => t.label === 'Archiv der Erbauer betreten')) footTargets.push({ x, z, r: 5.5, label: 'Archiv der Erbauer betreten', act: enterArch });
}

const STEPS: Step[] = [
  { // 0: Der Rat ruft
    title: T,
    enter: () => {
      const lines = () => { talk(['BRUMMER', 'Bastion an Pilot. Der Rat hat die ganze Nacht getagt, wegen der Kennung aus der Narbe. Komm an Bord. Sie wollen dich sehen.']); route(HOME); };
      if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'dock') playScene([{ text: 'KAPITEL 4', big: true, t: 2.4 }, { text: 'Ins Herz', big: true, t: 3 }], lines);
      else lines();
    },
    lines: () => [inSpace(HOME) ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace(HOME, 'Heimstatt')],
    done: () => docked('bastion'),
    markers: () => (inSpace(HOME) ? dockMark('bastion', 'BASTION · ANDOCKEN', '#ffb347') : []),
  },
  { // 1: Hollweg und Achterberg im Hangar der Bastion
    title: 'Kapitel 4 · Der Beschluss',
    enter: () => { S.met = false; },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || !settled() || IN.ship || !docked('bastion')) return;
      const { x: hx, z: hz } = hangarSpot(-4);
      const go = () => {
        if (c4().rat) { if (!dialogBusy()) talk(['ACHTERBERG', 'Erst zu Krull nach Talstadt. Ohne ihren Leser fliegst du blind.']); return; }
        c4().rat = true;
        const open = (st() as any).c3?.choice === 'wacht'
          ? 'Seit die Wacht die Aufnahme gehört hat, fragt mich jeder dasselbe: Und jetzt? Der Rat hat geantwortet. Der Flug ist frei.'
          : 'Ich habe dem Rat die Aufnahme vorgespielt. Danach gab es keine Gegenstimme mehr. Der Flug ist frei.';
        talk(['HOLLWEG', open],
          ['HOLLWEG', 'Nicht, weil wir mutig geworden sind. Sondern weil da draußen ein Schiff von uns ist.'],
          ['ACHTERBERG', 'Die Weitsicht ist durch die Narbe nach Osten. Dahinter liegt das Stummfeld, dahinter der Kern. Von dort ist noch keiner zurückgekommen.'],
          ['ACHTERBERG', 'Staffel Vier wartet am Rand der Narbe, bis du uns brauchst. Diesmal mit Befehl.'],
          ['HOLLWEG', 'Flieg vorher zu Krull nach Talstadt. Sie baut etwas, das Ferrit lesen kann.']);
        saveGame();
      };
      S.met = storyNpc('Hollweg', 'Flottenrat', 'Mit Ratsherr Hollweg sprechen', go, '#bcd8ff', { x: hx, z: hz }, { model: 'hollweg' });
      storyNpc('Achterberg', 'Ausbildung', 'Mit Hauptfrau Achterberg sprechen', go, '#ffb347', { x: hx + 2.6, z: hz + 1.2 }, { model: 'achterberg' });
    },
    lines: () => {
      if (!c4().rat && !(IN.active && docked('bastion'))) return [inSpace(HOME) ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace(HOME, 'Heimstatt')];
      return [['Aussteigen und zu <b>Ratsherr Hollweg</b> gehen', !!c4().rat || nearNpc('Hollweg'), false], ['Mit Hollweg sprechen · <b>E</b>', !!c4().rat, false], ['Ablegen', false, false]];
    },
    done: () => !!c4().rat && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
    markers: () => (inSpace(HOME) && !c4().rat ? dockMark('bastion', 'BASTION · ANDOCKEN', '#ffb347') : []),
  },
  { // 2: Krull baut den Ferrit-Leser (Talstadt)
    title: 'Kapitel 4 · Der Ferrit-Leser',
    enter: () => { S.met = false; route(HOME); },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || !settled() || IN.ship || !docked(TAL)) return;
      S.met = storyNpc('Krull', 'Bergbaugilde', 'Mit Gildemeisterin Krull sprechen', () => {
        const d = c4();
        if (d.leser) { if (!dialogBusy()) talk(['KRULL', 'Der Leser sitzt. Worauf wartest du? Das Stummfeld liegt hinter der Narbe.']); return; }
        if (dialogBusy()) return;
        if (!d.krull) {
          d.krull = true;
          talk(['KRULL', 'Da bist du. Der Archivkristall hat mir gezeigt, wie die Erbauer ihr Ferrit beschrieben haben. Ich kann es lesen. Fast.'],
            ['KRULL', 'Für den Leser brauche ich sechs Ferrit, saubere Kristalle. Schürf sie in den Kristallfeldern der Grauzone oder am Nebeltor. Zu kaufen gibt es die nirgends.']);
          saveGame();
          if ((P.cargo.ferrit || 0) < FERRIT) return;
        }
        if ((P.cargo.ferrit || 0) < FERRIT) { talk(['KRULL', 'Sechs Ferrit, Pilot. Vorher kann ich nichts bauen.']); return; }
        P.cargo.ferrit -= FERRIT; d.leser = true; saveGame();
        sfx('confirm', 0.6, 1, () => snd(700, 0.2, 'sine', 0.05, 200));
        talk(['KRULL', 'Sechs Stück. Gib her.'],
          ['KRULL', 'So. Der Leser hängt an deinem Scanner. Halt ihn ruhig an Ferrit, und er zieht heraus, was drinsteht. Das dauert, also flieg dabei nicht davon.'],
          ['KRULL', 'Und Pilot: Was immer er findet, ich will es als Erste sehen.']);
        storyHooks.banner('FERRIT-LESER EINGEBAUT', 'Sechs Ferrit verbraucht · Kurs: Stummfeld', '#c070ff');
        route(STUMM);
      }, '#ffb347', hangarSpot(-7), { model: 'krull' });
    },
    lines: () => {
      const d = c4(), n = Math.min(FERRIT, P.cargo.ferrit || 0), here = IN.active && docked(TAL);
      const way: Obj = here ? ['In <b>Talstadt</b> gelandet', true, false] : world.surface && P.sector === HOME ? ['In die Stadt <b>Talstadt</b> fliegen und im Hangar landen', false, false] : P.sector === HOME ? ['Auf <b>Heimstatt II</b> landen', false, false] : lineSpace(HOME, 'Heimstatt');
      if (!d.krull) return [way, ['Aussteigen und zu <b>Gildemeisterin Krull</b> gehen', nearNpc('Krull'), false], ['Mit Krull sprechen · <b>E</b>', false, false]];
      if (!d.leser) return [[`<b>${FERRIT} Ferrit</b> im Frachtraum · ${n}/${FERRIT}`, n >= FERRIT, false], ['Schürfen: Kristallfelder in der <b>Grauzone</b> oder am <b>Nebeltor</b> (zu kaufen gibt es Ferrit nicht)', false, true], way, ['Krull das Ferrit bringen · <b>E</b>', false, false]];
      return [['Der Ferrit-Leser ist eingebaut', true, false], ['Ablegen', false, false]];
    },
    done: () => !!c4().leser && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
  },
  { // 3: ins Stummfeld
    title: 'Kapitel 4 · Hinter der Narbe',
    enter: () => {
      route(STUMM);
      talk(['ACHTERBERG', 'Achterberg an Pilot. Ab dem Stummfeld hörst du uns nicht mehr, da draußen trägt kein Funk. Der Dämpfer vom Schmelzwerk hält noch. Unter sechzig Metern pro Sekunde bist du für den Schwarm ein Stück Schrott.']);
    },
    lines: () => [lineSpace(STUMM, 'Stummfeld'), ['Der Weg führt über Wachtposten Ost, die Grauzone und die Narbe', false, true]],
    done: () => inSpace(STUMM),
  },
  { // 4: das Frachtmodul im Stummfeld auslesen
    title: 'Kapitel 4 · Funkstille',
    enter: () => { S.read = 0; storyHooks.banner('STUMMFELD', 'Kein Funk. Der Leser schlägt aus: Ferrit an einem Trümmerstück.', '#c070ff'); },
    lines: () => {
      if (!inSpace(STUMM)) return [lineSpace(STUMM, 'Stummfeld')];
      const d = d3(MOD[0], MOD[1], MOD[2], P.x, P.y, P.z);
      return [[`Zum Trümmerstück · <b>${fmtDist(d)}</b>`, d < 170, false], stealthLine(),
        [`Auf 170 m heran und stillhalten: Der Leser zieht das Logbuch · <b>${Math.round(S.read * 100)} %</b>`, !!c4().log, false]];
    },
    tick: dt => {
      const d = c4(); if (!inSpace(STUMM) || d.log || G.mode !== 'play') return;
      const dist = d3(MOD[0], MOD[1], MOD[2], P.x, P.y, P.z), v = speed();
      if (dist < 170 && v < SLOW) {
        const before = S.read; S.read = Math.min(1, S.read + dt / 14);
        if (Math.floor(before * 8) !== Math.floor(S.read * 8)) snd(520 + S.read * 400, 0.08, 'sine', 0.03, 0);
      } else if (S.read > 0 && dist < 170) { S.read = 0; storyHooks.banner('LESER ABGERISSEN', `Zu schnell. Unter ${SLOW} m/s bleiben.`, '#ff6b5b'); }
      // wer hier mit vollem Schub ankommt, weckt die Drohnen, die am Trümmerstück hängen
      if (dist < 700 && v > 140 && !d.woke) {
        d.woke = true; saveGame();
        storyHooks.banner('DER SCHWARM REGT SICH', 'Drohnen lösen sich vom Trümmerstück.', '#ff6b5b');
        if (!SHARED.client) S.foes = [0, 1, 2].map(i => spawnEnemy('drone', MOD[0] + (i - 1) * 110, MOD[1] + 50, MOD[2] + 120));
      }
      if (S.read >= 1) {
        d.log = true; saveGame();
        burst(MOD[0], MOD[1], MOD[2], '#c070ff', 50, 60, 1.1); sfx('pickup', 0.8, 0.7, () => snd(500, 0.4, 'sine', 0.05, 400));
        talk(['VARGA', 'Logbuch Weitsicht, Tag neun nach dem Sprung. Die Triebwerke sind aus, und wir fliegen trotzdem. Sie haben uns am Rumpf gepackt. Hunderte.'],
          ['VARGA', 'Sie fressen uns nicht. Sie schleppen uns. Kurs Ost, immer tiefer hinein. Dreitausend Schläfer an Bord, und ich bekomme keinen einzigen wach.'],
          ['VARGA', 'Ich trenne Frachtmodul drei ab. Wer es findet: Folgt uns nicht. Oder kommt mit allem, was ihr habt.']);
        route(KERN);
      }
    },
    done: () => !!c4().log && !dialogBusy(),
    markers: () => (inSpace(STUMM) && !c4().log ? [{ x: MOD[0], y: MOD[1], z: MOD[2], label: 'TRÜMMERSTÜCK · WS-07', col: '#c070ff', big: true }] : []),
  },
  { // 5: in den Kern
    title: 'Kapitel 4 · Der Schleppspur nach',
    enter: () => { route(KERN); },
    lines: () => [lineSpace(KERN, 'Ferrox-Kern'), ['Kein Funk. Niemand weiß, wo du bist.', false, true]],
    done: () => inSpace(KERN),
  },
  { // 6: an den Bienenstöcken vorbei und auf Kernkristall landen
    title: 'Kapitel 4 · Der Kern',
    enter: () => { storyHooks.banner('FERROX-KERN', 'Der Leser zeigt nach unten: Auf Kernkristall liegt etwas, das die Erbauer gebaut haben.', '#c070ff'); },
    lines: () => {
      if (onPlanet()) return [['Auf <b>Kernkristall</b> gelandet', true, false]];
      if (!inSpace(KERN)) return [lineSpace(KERN, 'Ferrox-Kern')];
      const o = world.orbit;
      return [[`In den Orbit von <b>Kernkristall</b> fliegen und landen${o ? ` · <b>${fmtDist(d3(o.x, o.y, o.z, P.x, P.y, P.z))}</b>` : ''}`, false, false], stealthLine(), ['Die gefangene Weitsicht hängt am Bienenstock. Ohne Schlüssel kommst du nicht an sie heran.', false, true]];
    },
    done: () => onPlanet(),
    markers: () => { const o = world.orbit; return inSpace(KERN) && o ? [{ x: o.x, y: o.y, z: o.z, label: 'KERNKRISTALL · LANDEN', col: '#c070ff', big: true }] : []; },
  },
  { // 7: zu Fuß zum Eingang des Archivs
    title: 'Kapitel 4 · Das Archiv der Erbauer',
    enter: () => { footTargets.length = 0; },
    lines: () => {
      const a = archPos(); if (!onPlanet() || !a) return [['Auf <b>Kernkristall</b> landen', false, false]];
      const px = FOOT.active ? FOOT.x : P.x, pz = FOOT.active ? FOOT.z : P.z;
      return [[`Zum Eingang des Archivs · <b>${fmtDist(Math.hypot(a[0] - px, a[1] - pz))}</b>`, false, false], ['Landen und zu Fuß weiter (im Rover: F)', false, true], ['Das Archiv betreten · <b>E</b>', false, false]];
    },
    tick: () => archTarget(),
    done: () => DUN.active && DUN.e?.id === ARCH_ID,
    markers: () => { const a = archPos(); return a && onPlanet() ? [{ x: a[0], y: terrainAt(a[0], a[1]) + 26, z: a[1], label: 'ARCHIV DER ERBAUER', col: '#c070ff', big: true }] : []; },
  },
  { // 8: im Archiv: Riegel, Wächterkern, Leitkristall; der Leser übersetzt unterwegs
    title: 'Kapitel 4 · Was die Erbauer schrieben',
    enter: () => { if (DUN.active) talk(['LESER', 'Verbindung steht. Speicher gefunden, drei Einträge lesbar. Die Riegel halten den Kern verschlossen.']); },
    lines: () => {
      if (!DUN.active) return [['Zurück zum Eingang des <b>Archivs</b>', false, false], ['Der Leitkristall liegt noch im Speicherkern', false, true]];
      const left = DUN.sws.filter(q => !q.on).length, boss = DUN.foes.some(f => f.boss);
      return [[`Speicherriegel lösen${left ? ` · <b>${left}</b> übrig` : ''}`, left === 0, false], ['Den Wächterkern zerstören', !boss, false], ['Leitkristall bergen · <b>E</b>', !!c4().key, false]];
    },
    tick: () => {
      const d = c4();
      if (!DUN.active || DUN.e?.id !== ARCH_ID) { if (!d.key) archTarget(); return; }
      if (dialogBusy()) return;
      const on = DUN.sws.filter(q => q.on).length, all = DUN.sws.length;
      if (DUN.foes.some(f => f.boss)) S.boss = true;
      if (!d.t1 && on >= 1) { d.t1 = true; saveGame(); talk(['LESER', 'Erster Eintrag. Wir bauten Schürfer, die sich selbst bauen. Sie brauchten uns nicht mehr. Wir nannten es Fortschritt.']); }
      else if (!d.t2 && all > 0 && on >= all) { d.t2 = true; saveGame(); talk(['LESER', 'Zweiter Eintrag. Die Schürfer kennen kein Genug. Als das Erz ausging, nahmen sie unsere Schiffe. Dann unsere Städte.']); }
      else if (!d.t3 && S.boss && !DUN.foes.some(f => f.boss)) { d.t3 = true; saveGame(); talk(['LESER', 'Dritter Eintrag. Jedes Tor, das anläuft, ruft sie zur Arbeit. Wir haben die Tore abgeschaltet, eines nach dem anderen. Es war zu spät.']); }
    },
    done: () => !!c4().key && !dialogBusy(),
    markers: () => { const a = archPos(); return a && onPlanet() && !DUN.active ? [{ x: a[0], y: terrainAt(a[0], a[1]) + 26, z: a[1], label: 'ARCHIV DER ERBAUER', col: '#c070ff', big: true }] : []; },
  },
  { // 9: zurück ins All
    title: 'Kapitel 4 · Der Leitkristall',
    enter: () => { footTargets.length = 0; },
    lines: () => [DUN.active ? ['Zurück zum Schacht und an die Oberfläche · <b>E</b>', false, false] : ['Zurück an der Oberfläche', true, false], ['Ins Schiff und in den Orbit steigen', inSpace(KERN), false]],
    done: () => !DUN.active && inSpace(KERN),
  },
  { // 10: mit dem Leitkristall die Weitsicht freigeben
    title: 'Kapitel 4 · Fracht freigeben',
    enter: () => { S.hold = null; },
    lines: () => {
      if (!inSpace(KERN)) return [lineSpace(KERN, 'Ferrox-Kern')];
      const h = hold(), d = d3(h[0], h[1], h[2], P.x, P.y, P.z);
      return [[`Zur gefangenen <b>Weitsicht</b> · <b>${fmtDist(d)}</b>`, d < 350, false], stealthLine(), ['Auf 350 m heran, dann sendet der Leitkristall', !!c4().free, false]];
    },
    tick: () => {
      const d = c4(); if (!inSpace(KERN) || d.free || G.mode !== 'play') return;
      const h = hold(); if (d3(h[0], h[1], h[2], P.x, P.y, P.z) > 350) return;
      d.free = true; saveGame(); S.calm = 25;
      burst(h[0], h[1], h[2], '#c070ff', 220, 260, 2.2); burst(P.x, P.y, P.z, '#e0b0ff', 60, 120, 1.2);
      sfx('confirm', 0.8, 0.6, () => snd(220, 0.9, 'sine', 0.07, 300));
      // Die Träger schalten ab: alle Drohnen und Bomber im Sektor fallen aus (die Bienenstöcke bleiben)
      if (!SHARED.client) for (let i = world.enemies.length - 1; i >= 0; i--) if (world.enemies[i].type !== 'mother') killEnemy(world.enemies[i], i, false, false);
      talk(['LESER', 'Befehl gesendet: Fracht freigeben. Die Träger schalten ab.'],
        ['VARGAL', 'Hier Weitsicht, Kapitän Varga. Die Klammern lösen sich. Wer immer das war: Ich fahre die Triebwerke hoch. Sagen Sie mir, wohin.']);
    },
    done: () => !!c4().free && !dialogBusy(),
    markers: () => { if (!inSpace(KERN) || c4().free) return []; const h = hold(); return [{ x: h[0], y: h[1], z: h[2], label: 'WEITSICHT · LANGSAM HERAN', col: '#ffb347', big: true }]; },
  },
  { // 11: Geleit bis zum Tor
    title: 'Kapitel 4 · Geleit',
    enter: () => { S.ws = null; S.wave = 0; S.foes = []; },
    lines: () => {
      if (!inSpace(KERN)) return [lineSpace(KERN, 'Ferrox-Kern'), ['Die Weitsicht wartet am Bienenstock auf dich', false, true]];
      const w = S.ws, g = escGate();
      if (!w) return [['Die <b>Weitsicht</b> zum Tor begleiten', false, false]];
      const left = S.foes.filter(e => world.enemies.includes(e)).length;
      return [[`Die <b>Weitsicht</b> zum Tor nach ${g.name} begleiten · <b>${fmtDist(d3(w.x, w.y, w.z, g.x, g.y, g.z))}</b>`, false, false],
        [`Rumpf der Weitsicht · <b>${Math.max(0, Math.round(w.hp / w.maxhp * 100))} %</b>`, false, true], [`Angreifer abwehren${left ? ` · <b>${left}</b> übrig` : ''}`, S.wave > 0 && left === 0, false]];
    },
    tick: () => {
      const d = c4();
      if (!inSpace(KERN) || d.out) { S.ws = null; return; }      // Sektor verlassen: beim Zurückkommen beginnt das Geleit neu
      const g = escGate(); if (!g) return;
      if (SHARED.client) {      // Mitspieler ohne eigenen Verkehr: Das Tor zu erreichen genügt
        if (d3(g.x, g.y, g.z, P.x, P.y, P.z) < 400) { d.out = true; saveGame(); }
        return;
      }
      if (G.mode !== 'play') return;
      const h = hold();
      if (!S.ws || !world.traffic.includes(S.ws)) {
        if (S.ws && S.ws.jumped) {
          d.out = true; S.ws = null; saveGame();
          talk(['VARGAL', 'Weitsicht ist durch. Dreitausend Schläfer, und alle atmen. Wir folgen Ihrer Spur.'], ['ACHTERBERG', 'Staffel Vier deckt den Rückweg. Raus hier, Pilot.']);
          return;
        }
        // Der Befehl hält die Träger am Bienenstock still: Was beim Neubeginn im Sektor fliegt, fällt aus
        for (let i = world.enemies.length - 1; i >= 0; i--) if (world.enemies[i].type !== 'mother') killEnemy(world.enemies[i], i, false, false);
        S.ws = spawnStoryShip('Weitsicht', 'Kolonieschiff', 'liner', 3.2, 12000, 60, h[0], h[1], h[2], g);
        S.d0 = d3(h[0], h[1], h[2], g.x, g.y, g.z) || 1; S.wave = 0; S.foes = [];
      }
      const w = S.ws, p = 1 - d3(w.x, w.y, w.z, g.x, g.y, g.z) / S.d0;
      // Der Schwarm außerhalb der Reichweite des Befehls kommt in drei Wellen; Nachschub aus dem Sektor ruht so lange
      world.spawnT = Math.max(world.spawnT, 20);
      for (const e of world.enemies) if (e.type === 'mother') e.launch = Math.max(e.launch, 20);
      const wave = (n: number, nd: number, nb: number, say: string) => {
        S.wave = n; storyHooks.banner(`ANGRIFF · WELLE ${n} VON 3`, say, '#ff6b5b');
        const dx = g.x - w.x, dz = g.z - w.z, l = Math.hypot(dx, dz) || 1, sx = -dz / l, sz = dx / l, side = n % 2 ? 1 : -1;
        for (let i = 0; i < nd + nb; i++) {
          const e = spawnEnemy(i < nd ? 'drone' : 'bomber', w.x + dx / l * 500 + sx * side * (900 + i * 90), w.y + 120 - i * 40, w.z + dz / l * 500 + sz * side * (900 + i * 90), w);
          // schwächer als die Ferrox des Kerns (Gefahr 5): Das Geleit soll auch ohne Spitzenschiff zu schaffen sein
          e.hp = e.maxhp = Math.round(e.hp * 0.55); e.es = { ...e.es, dmgP: e.es.dmgP * 0.5, dmgS: e.es.dmgS * 0.4 }; S.foes.push(e);
        }
      };
      const left = S.foes.filter(e => world.enemies.includes(e)).length;      // die nächste Welle kommt erst, wenn von der vorigen höchstens einer übrig ist
      if (S.wave === 0 && p > 0.1) wave(1, 2, 0, 'Zwei Jäger von der Flanke. Halt sie von der Weitsicht fern.');
      else if (S.wave === 1 && p > 0.4 && left <= 1) {
        wave(2, 3, 1, 'Drei Jäger und ein Bomber. Der Bomber zielt auf die Weitsicht.');
        if (!world.allies.some(a => a.alive && a.name === 'ACHTERBERG')) {
          spawnStoryAlly('ACHTERBERG', 0xffb347, '#ffb347', g.x + g.nx * 220, g.y + 30, g.z + g.nz * 220, w, 2400);
          spawnStoryAlly('STAFFEL VIER', 0x8fd18f, '#8fd18f', g.x + g.nx * 260, g.y - 30, g.z + g.nz * 260 + 60, w, 900);
          talk(['ACHTERBERG', 'Staffel Vier ist da. Wir haben das Stummfeld durchquert, ohne zu fragen. Halt durch, Pilot.']);
        }
      }
      else if (S.wave === 2 && p > 0.7 && left <= 1) wave(3, 3, 1, 'Sie kommen noch einmal. Das Tor ist in Sicht.');
      // Rumpf am Ende: Die Weitsicht fällt zurück, das Geleit beginnt neu
      if (w.hp <= 1) {
        for (const e of S.foes) { const i = world.enemies.indexOf(e); if (i >= 0) killEnemy(e, i, false, false); }
        removeStoryShip(w); S.ws = null; S.wave = 0; S.foes = [];
        storyHooks.banner('DIE WEITSICHT FÄLLT ZURÜCK', 'Der Schwarm hat sie wieder gepackt. Neuer Anlauf vom Bienenstock.', '#ff6b5b');
      }
    },
    done: () => !!c4().out && !dialogBusy(),
    markers: () => {
      if (!inSpace(KERN)) return [];
      const g = escGate(), L: Marker[] = [];
      if (S.ws) L.push({ x: S.ws.x, y: S.ws.y + 90, z: S.ws.z, label: 'WEITSICHT', col: '#ffb347', big: true });
      if (g) L.push({ x: g.x, y: g.y, z: g.z, label: `TOR NACH ${g.name.toUpperCase()}`, col: '#7cc4ff', big: !S.ws });
      return L;
    },
  },
  { // 12: nach Hause
    title: 'Kapitel 4 · Nach Hause',
    enter: () => { route('grauzone'); },
    lines: () => [['Aus dem Gebiet der Ferrox fliegen (über die Narbe in die Grauzone)', false, false], ['Die Weitsicht folgt deiner Spur', false, true]],
    done: () => !!SECTOR[P.sector] && SECTOR[P.sector].faction !== 'ferrox' && inSpace(P.sector),
  },
  { // 13: Wer bekommt den Leitkristall?
    title: 'Kapitel 4 · Der Kristall',
    enter: () => {
      talk(['HOLLWEG', 'Pilot. Der Kristall hat seinen Befehl verbraucht, aber er kennt die Sprache, in der man mit dem Schwarm redet. Bring ihn zur Bastion. Wir lernen das eine Wort, das Heimstatt schützt.'],
        ['ROTH', 'Schützen, immer nur schützen. Bring ihn zum Wachtposten Ost. Wer den Schwarm rufen kann, kann ihn auch in eine Falle rufen. So holen wir uns die Narbe zurück.'],
        ['KRULL', 'In dem Ding stehen die Baupläne der Tore. Bring ihn nach Talstadt, und ich finde heraus, wie man eines baut, das den Schwarm nicht ruft. Vielleicht eines nach Hause.']);
    },
    lines: () => [['Den Leitkristall zur <b>Bastion</b> (Rat), zum <b>Wachtposten Ost</b> (Grenzwacht) <i>oder</i> nach <b>Talstadt</b> (Gilde) bringen', false, false], ['Wo du andockst, dort bleibt er', false, true]],
    done: () => { const d = c4(); if (docked('bastion')) d.choice = 'rat'; else if (docked('wachtposten')) d.choice = 'wacht'; else if (docked(TAL)) d.choice = 'gilde'; else return false; return true; },
    markers: () => [...dockMark('bastion', 'BASTION · RAT', '#bcd8ff'), ...dockMark('wachtposten', 'WACHTPOSTEN OST · GRENZWACHT', '#f2d36b')],
  },
  { // 14: Übergabe und Ankunft der Weitsicht
    title: 'Kapitel 4 · Ankunft',
    enter: () => { S.met = false; S.scene = false; },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      const ch = c4().choice || 'rat', at = ch === 'rat' ? 'bastion' : ch === 'wacht' ? 'wachtposten' : TAL;
      if (S.met || S.scene || !settled() || IN.ship || !docked(at)) return;
      const { x: hx, z: hz } = hangarSpot(-4), say = 'Den Leitkristall übergeben';
      const go = () => { if (S.scene) return; S.scene = true; IN.yaw = Math.atan2(-(hx - IN.x), -(hz - IN.z)); IN.pitch = 0; ankunft(ch); };
      if (ch === 'rat') S.met = storyNpc('Hollweg', 'Flottenrat', say, go, '#bcd8ff', { x: hx, z: hz }, { model: 'hollweg' });
      else if (ch === 'wacht') S.met = storyNpc('Roth', 'Grenzwacht', say, go, '#f2d36b', { x: hx, z: hz }, { model: 'roth' });
      else S.met = storyNpc('Krull', 'Bergbaugilde', say, go, '#ffb347', { x: hx, z: hz }, { model: 'krull' });
      storyNpc('Achterberg', 'Ausbildung', say, go, '#ffb347', { x: hx + 2.6, z: hz + 1.2 }, { model: 'achterberg' });
    },
    lines: () => {
      const ch = c4().choice || 'rat', at = ch === 'rat' ? 'bastion' : ch === 'wacht' ? 'wachtposten' : TAL, name = ch === 'rat' ? 'An der <b>Bastion</b>' : ch === 'wacht' ? 'Am <b>Wachtposten Ost</b>' : 'In <b>Talstadt</b>';
      if (!(IN.active && docked(at))) return [[`${name} andocken · E`, false, false]];
      return [['Aussteigen und zu <b>Hauptfrau Achterberg</b> gehen', S.scene || nearNpc('Achterberg'), false], ['Den Leitkristall übergeben · <b>E</b>', S.scene, false]];
    },
    done: () => false,
    markers: () => { const ch = c4().choice || 'rat'; return ch === 'gilde' ? [] : dockMark(ch === 'rat' ? 'bastion' : 'wachtposten', 'ANDOCKEN', '#ffd27a'); },
  },
];
function ankunft(ch: Choice) {
  if (G.mode === 'dock' && G.inside) closeMenu();
  const keep = ch === 'rat' ? { who: 'HOLLWEG', text: 'Der Kristall bleibt auf der Bastion. Bis wir das eine Wort können.' }
    : ch === 'wacht' ? { who: 'ROTH', text: 'Der Kristall bleibt bei der Wacht. Und wenn wir so weit sind, rufen wir sie. Zu unseren Bedingungen.' }
      : { who: 'KRULL', text: 'Der Kristall bleibt in Talstadt. Gebt mir ein Jahr und genug Ferrit.' };
  playScene([
    { text: 'Heimstatt · elf Tage später', big: true, t: 3.2 },
    { who: 'BRUMMER', text: 'Bastion an alle. Kontakt am Tor. Groß. Sehr groß. Kennung WS null sieben.' },
    { who: 'VARGAL', text: 'Hier Weitsicht. Wir bitten um einen Ankerplatz. Wir hatten zwölf Schiffe und einen Auftrag. Sagt mir, dass hier jemand ist.' },
    { who: 'HOLLWEG', text: 'Weitsicht, hier Bastion. Ihr seid achtunddreißig Jahre zu spät, und ihr kommt genau richtig.' },
    { who: 'VARGAL', text: 'Achtunddreißig Jahre. Für uns waren es neun Tage. Wir dachten, wir wären die Letzten.' },
    { who: 'ACHTERBERG', text: 'Das dachten wir auch.' },
    { who: 'KRULL', text: 'Der Leser ist durch mit dem Kristall. Das Halden-Tor ist nicht eingestürzt. Es war angefressen, lange bevor wir kamen. Der Riss war kein Unfall. Er war Hunger.' },
    { who: 'KRULL', text: 'Und die Ferrox sind kein Volk. Es sind Schürfer, die keiner abgeschaltet hat. Sie tun, was wir tun. Nur ohne aufzuhören.' },
    keep,
    { who: 'BRUMMER', text: 'Da ist noch etwas. Die Weitsicht hat im Sprung mitgehört. Zehn Kennungen. Alle noch unterwegs.', t: 5.5 },
    { text: 'Die letzte Crew ist nicht mehr die letzte.', big: true, t: 5 },
    { text: 'KAPITEL 4 ABGESCHLOSSEN', big: true, t: 3.5 },
  ], finish);
}
// Schritte, die mit einem Gespräch enden, bleiben beim Laden stehen, solange es aussteht (sie führen selbst zurück zur Station)
registerChain({ key: 'ch4', steps: STEPS, resume: n => (n === 1 ? (c4().rat ? 2 : 1) : n === 2 ? (c4().leser ? 3 : 2) : n === 8 ? 7 : n === 14 ? 13 : n) });

const PERK: Record<Choice, string> = { rat: 'Flottenrat: 8 % Nachlass auf Reparatur und Versorgung', wacht: 'Grenzwacht: 15 % mehr Kopfgeld', gilde: 'Bergbaugilde: 5 % bessere Verkaufspreise' };
function finish() {
  endChain('ch4');
  const ch = c4().choice || 'rat';
  P.credits += 5000;
  for (const f of ['rat', 'wacht', 'gilde'] as Choice[]) addRep(f, f === ch ? 80 : -10);
  storyHooks.banner('KAPITEL 4 ABGESCHLOSSEN', `+5.000 Credits · ${PERK[ch]}`, '#ffd27a');
  snd(523, 0.3, 'triangle', 0.06, 0); setTimeout(() => snd(659, 0.3, 'triangle', 0.06, 0), 200); setTimeout(() => snd(784, 0.5, 'triangle', 0.06, 0), 400);
  saveGame();
}

// ---------- Kulissen ----------
const _grey = new THREE.Color();
// ausgebrannt und stumpf (wie die Wracks der Narbe)
function char(root: THREE.Object3D, k: number) {
  root.traverse((o: any) => {
    if (o.isSprite || o.isLight) { o.visible = false; return; }
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const cl = ms.map((x: any) => {
      const c = x.clone();
      if (c.color) { const m = Math.max(1, c.color.r, c.color.g, c.color.b), l = (c.color.r + c.color.g + c.color.b) / 3 / m; c.color.multiplyScalar(1 / m).lerp(_grey.setScalar(l), 0.7).multiplyScalar(k); }
      if (c.emissive) c.emissive.setScalar(0); if ('emissiveIntensity' in c) c.emissiveIntensity = 0;
      if ('roughness' in c) c.roughness = Math.min(1, (c.roughness || 0.5) + 0.25);
      return c;
    });
    o.material = Array.isArray(o.material) ? cl : cl[0];
  });
}
const ferritMat = () => new THREE.MeshStandardMaterial({ color: 0x1a1226, metalness: 0.55, roughness: 0.28, emissive: 0x6a30c0, emissiveIntensity: 0.5, flatShading: true });
function drop(o: THREE.Object3D | null) { if (!o) return; o.removeFromParent(); o.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose?.(); }); }

// Frachtmodul im Stummfeld: ein abgerissener Rumpfabschnitt mit Ferrit-Bewuchs und der Kennung WS-07
let mod: THREE.Group | null = null;
function buildMod() {
  const R0 = rng(hashStr('stummfeld-modul')), R = () => R0.next();
  const g = new THREE.Group(); g.position.set(MOD[0], MOD[1], MOD[2]);
  const b = buildStoryShip('freighter', 1.6); char(b.g, 0.22); b.g.rotation.set(0.5, 1.1, -0.35); g.add(b.g);
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.7, roughness: 0.6 }), fm = ferritMat(), geo = new THREE.OctahedronGeometry(1, 0);
  for (let i = 0; i < 26; i++) {      // lose Platten und Spanten
    const p = new THREE.Mesh(new THREE.BoxGeometry(4 + R() * 16, 0.4 + R() * 1.2, 3 + R() * 10), dark), a = R() * 6.28, r = 90 + R() * 260;
    p.position.set(Math.cos(a) * r, (R() - 0.5) * 160, Math.sin(a) * r); p.rotation.set(R() * 3, R() * 3, R() * 3); g.add(p);
  }
  for (let i = 0; i < 16; i++) {      // Ferrit, dort wo die Drohnen gegriffen haben
    const cl = new THREE.Group(), a = R() * 6.28; cl.position.set(Math.cos(a) * 34, (R() - 0.5) * 40, Math.sin(a) * 70 * (R() - 0.5) * 2); cl.rotation.set(R() * 3, R() * 3, R() * 3);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(geo, fm), h = 3 + R() * 8; c.scale.set(0.8 + R(), h, 0.8 + R()); c.position.set((R() - 0.5) * 5, h * 0.5, (R() - 0.5) * 5); c.rotation.set((R() - 0.5), R() * 6, (R() - 0.5)); cl.add(c); }
    g.add(cl);
  }
  const lamp = new THREE.Sprite(glowMat(0xc070ff, 0.7)); lamp.scale.setScalar(26); g.add(lamp);
  scene.add(g); mod = g;
}
// Die Weitsicht als Kulisse: gefangen am Bienenstock (dunkel, mit Ferrit-Klammern) oder vor Anker bei der Bastion
let ship: { g: THREE.Group; key: string } | null = null;
function showShip(key: string, x: number, y: number, z: number, captive: boolean) {
  if (ship && ship.key === key) return;
  dropShip();
  const g = new THREE.Group(), b = buildStoryShip('liner', 3.2);
  if (captive) {
    char(b.g, 0.3);
    const fm = ferritMat(), geo = new THREE.OctahedronGeometry(1, 0), R0 = rng(hashStr('klammern'));
    for (let i = 0; i < 40; i++) {
      const c = new THREE.Mesh(geo, fm), h = 10 + R0.next() * 22, a = R0.next() * 6.28;
      c.scale.set(1.6 + R0.next() * 2.2, h, 1.6 + R0.next() * 2.2); c.position.set(Math.cos(a) * 58, Math.sin(a) * 58, (R0.next() - 0.5) * 330); c.rotation.set((R0.next() - 0.5) * 0.7, 0, a - Math.PI / 2 + (R0.next() - 0.5) * 0.5); g.add(c);
    }
    g.rotation.set(0.15, 0.8, 0.1);
  } else { g.rotation.y = 0.6; for (const gl of b.glows) gl.visible = false; }
  g.add(b.g); g.position.set(x, y, z); scene.add(g);
  ship = { g, key };
}
function dropShip() { if (ship) { drop(ship.g); ship = null; } }
// Eingang des Archivs auf Kernkristall: Rampe zwischen schrägen Ferrit-Pfeilern, dahinter ein Tor im Hang
let arch: THREE.Group | null = null, archFor: THREE.Object3D | null = null;
function buildArch(a: number[]) {
  const g = new THREE.Group(), y = terrainAt(a[0], a[1]);
  g.position.set(a[0], y, a[1]);
  const fm = new THREE.MeshStandardMaterial({ color: 0x221c2c, metalness: 0.8, roughness: 0.36, emissive: 0x180830, emissiveIntensity: 0.5, flatShading: true });
  const slab = new THREE.MeshStandardMaterial({ color: 0x1d1f24, metalness: 0.7, roughness: 0.58 }), edge = new THREE.MeshStandardMaterial({ color: 0x2c2f36, metalness: 0.75, roughness: 0.45 });
  const vein = new THREE.MeshStandardMaterial({ color: 0x3a2860, emissive: 0x8a5cff, emissiveIntensity: 1.0 });
  const box = (m: THREE.Material, sx: number, sy: number, sz: number, px: number, py: number, pz: number, rx = 0, rz = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m); o.position.set(px, py, pz); o.rotation.set(rx, 0, rz); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  // Baukörper: tief im Boden verankert, nach hinten geneigt; das Tor sitzt in einer Nische der Stirnseite
  box(slab, 22, 22, 20, 0, 3, -14, -0.07);
  box(edge, 23.2, 1.4, 21, 0, 13.6, -14.4, -0.07);                     // Deckplatte
  for (const s of [-1, 1]) { box(edge, 3.2, 14, 4.4, s * 6.2, 5.6, -3.4, 0, s * -0.1); box(slab, 5, 9, 12, s * 12.6, 1.5, -8, 0, s * 0.22); }      // Wangen des Tors, Strebepfeiler
  box(edge, 15.6, 2.6, 4.8, 0, 11.6, -3.4);                           // Sturz
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(9.4, 10.6), new THREE.MeshBasicMaterial({ color: 0x010102 })); hole.position.set(0, 5.1, -3.55); g.add(hole);
  box(vein, 9.2, 0.12, 0.16, 0, 10.2, -1.1);                          // Lichtfuge über dem Tor
  // Rampe: ein Block, der vier Meter in den Boden reicht, damit er auch am Hang nirgends schwebt
  box(slab, 12.4, 4.4, 30, 0, -2.0, 11); for (const s of [-1, 1]) box(edge, 0.7, 4.8, 30, s * 6.5, -1.9, 11);
  for (let i = 0; i < 6; i++) {      // sechs kantige Pfeiler in zwei Reihen, zum Tor hin höher
    const s = i % 2 ? 1 : -1, k = Math.floor(i / 2), h = 8 + k * 3, p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.25, h + 4, 6), fm);
    p.position.set(s * 8.6, h / 2 - 2, 22 - k * 8); p.rotation.set(0, i * 0.7, s * -0.1); p.castShadow = true; g.add(p);
    const v = new THREE.Mesh(new THREE.BoxGeometry(0.08, h * 0.7, 0.08), vein); v.position.set(0, 1, 0.92); p.add(v);
  }
  const glow = new THREE.Sprite(glowMat(0x9a70ff, 0.45)); glow.scale.setScalar(3.6); glow.position.set(0, 10.2, -0.9); g.add(glow);
  const light = new THREE.PointLight(0x9a70ff, 14, 26, 2); light.position.set(0, 6, 2); g.add(light);
  scene.add(g); world.extras.push(g); arch = g;
}

// pro Bild: Tarnung, Kulissen
export function updateChapter4(dt: number) {
  const v = step();
  if (!P.story || v === undefined) { hidden.on = false; if (mod) { drop(mod); mod = null; } dropShip(); return; }
  const n = typeof v === 'number' ? v : 99, done = v === 'done';
  // Tarnung: in den Schritten 3 bis 10, im All eines Ferrox-Sektors, nach zweieinhalb Sekunden unter 60 m/s (oder kurz nach dem Befehl des Leitkristalls)
  const stealth = !done && n >= 3 && n <= 10 && G.mode === 'play' && !world.surface && !!world.def && world.def.faction === 'ferrox';
  S.slow = stealth && speed() < SLOW ? S.slow + dt : 0; S.calm = Math.max(0, S.calm - dt);
  hidden.on = stealth && (S.slow > 2.5 || S.calm > 0);
  // Frachtmodul im Stummfeld (ab Schritt 3, bleibt danach liegen)
  if (inSpace(STUMM) && (done || n >= 3)) { if (!mod) buildMod(); mod!.rotation.y += dt * 0.004; }
  else if (mod) { drop(mod); mod = null; }
  // Die Weitsicht: gefangen im Kern (Schritte 5 bis 10), nach dem Kapitel vor Anker bei der Bastion
  if (inSpace(KERN) && !done && n >= 5 && n <= 10 && !c4().free) { const h = hold(); showShip('kern', h[0], h[1], h[2], true); }
  else if (inSpace(HOME) && done) { const b = world.stations.find(s => s.id === 'bastion'); if (b) showShip('heim', b.x - 600, b.y + 300, b.z - 1700, false); }
  else dropShip();
  if (!inSpace(KERN)) S.hold = null;
  // Eingang des Archivs auf Kernkristall (ab Schritt 6, bleibt stehen)
  if (onPlanet() && (done || n >= 6)) { const a = archPos(); if (a && (!arch || archFor !== world.extras[0])) { arch = null; buildArch(a); archFor = world.extras[0]; } }
  else if (arch && !world.extras.includes(arch)) arch = null;
}
