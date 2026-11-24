import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { d3, rng, hashStr } from '../core/util';
import { snd, sfx } from '../core/audio';
import { planetBaseId } from '../data/planets';
import { P, G, saveGame } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy, killEnemy } from './combat';
import { SHARED } from './shared';
import { IN, storyNpc, nearNpc, hangarSpot, storyNpcsLeave } from './interior';
import { addRep, level, type RepId } from './reputation';
import { closeMenu } from '../ui/dock';
import { radio } from '../ui/radio';
import { talk, playScene, registerChain, jumpTo, st, endChain, storyHooks, dialogBusy, settled, type Step, type Obj, type Marker } from './story';
import { DUN, enterDungeon, dungeonAlarm, dungeonSay, dungeonHurt, type DungeonEntrance } from './dungeon';
import { buildStoryShip, spawnStoryShip, spawnStoryAlly } from './npc';
import type { CivType } from '../models/ships';

// =====================================================================================
// Kapitel 5: „Die Zehn“ (siehe docs/story.md)
// Die zehn übrigen Schiffe der Flotte fallen aus dem zerbrochenen Sprung, und jede Ankunft ruft den Schwarm (wie ein anlaufendes Tor: neunzig
// Sekunden). Navigator Emil Sander (von Varga als Erster geweckt) rechnet aus, wo und wann. Die „Anna“ kommt im Lichtwall an: an Bord gehen und
// den Sprungkern von Hand abschalten, bevor die Frist um ist. Krull weckt in Talstadt die ersten Schläfer (Eis und Helium-3). Der „Kranich“ fällt
// in die Narbe und ist verloren; der Pilot zieht den Schlafkern, die Schlafmodule sprengen sich ab, Staffel Vier schleppt sie heraus. Die übrigen
// acht kommen zusammen am alten Ankerplatz der Flotte, fünf Kilometer von der Bastion (dort warf sie nach dem Tor in Sonnenfeld ihren ersten Anker): Zum ersten Mal kommt der Schwarm nach Heimstatt. Wer den Leitkristall
// hat (Kapitel 4), hilft: Der Rat legt einen Schirm um die Bastion, die Wacht eine Falle an den Ankunftspunkt, die Gilde stört den Ruf.
// Mindestens sechs der acht müssen ihren Ankerplatz erreichen. Am Ende meldet sich eine elfte Kennung: „Halden hört euch.“
// Keine Aufgabe „drei Punkte scannen“: Botenflug, zu Fuß auf Zeit, Liefern, Wrack mit Rückweg unter Druck, großes Gefecht mit Verbündeten.
// =====================================================================================
const HOME = 'heimstatt', SUN = 'sonnenfeld', LICHT = 'lichtwall', NARBE = 'narbe';
const TAL = planetBaseId(HOME);
const T = 'Kapitel 5 · Die Zehn';
const EIS = 12, HE = 6;                                               // Kühlmittel und Brennstoff für Krulls Weckanlage
const AN = [-1100, 260, 2400];                                        // Ankunftspunkt der Anna im Lichtwall
const KR = [-2600, -260, 2700];                                        // Wrack des Kranich in der Narbe
const AP = [-4300, 320, -2500];                                       // alter Ankerplatz der Flotte (Ankunftspunkt der acht), relativ zur Bastion
const MEET = [-1900, 200, -1150];                                     // Sammelpunkt der Piloten, relativ zur Bastion
const SHIELD = 2200;                                                  // Schirm des Rats um die Bastion (Meter)
// Ankerplätze relativ zur Bastion: acht für die Schiffe der Schlacht, der neunte für die Anna (nach dem Kapitel)
const SLOTS = [[-1477, 120, -260], [-1359, 120, -634], [-1149, 120, -964], [-860, 120, -1229], [-2028, 260, -543], [-1819, 260, -1050], [-1485, 260, -1485], [-650, 420, -2350], [-2212, 380, -1549]];
const EIGHT: { name: string; type: CivType; k: number }[] = [
  { name: 'Sirius', type: 'liner', k: 2.4 }, { name: 'Ida', type: 'freighter', k: 2.2 }, { name: 'Bussard', type: 'tanker', k: 2.3 }, { name: 'Wega', type: 'liner', k: 2.2 },
  { name: 'Emma', type: 'freighter', k: 2.4 }, { name: 'Reiher', type: 'tanker', k: 2.1 }, { name: 'Atair', type: 'liner', k: 2.5 }, { name: 'Klara', type: 'freighter', k: 2.2 },
];
const ANNA_ID = 'lichtwall:anna', KRAN_ID = 'narbe:kranich';
type Choice = 'rat' | 'wacht' | 'gilde';
type C5 = { met?: boolean; tamm?: boolean; anna?: boolean; core?: boolean; late?: boolean; krull?: boolean; wach?: boolean; kern?: boolean; plan?: boolean; call?: number[]; won?: boolean; down?: number };
const c5 = () => ((st() as any).c5 = (st() as any).c5 || {}) as C5;
const step = () => (P.story ? (st() as any).ch5 as number | 'done' | undefined : undefined);      // im Hauptmenü gibt es noch keinen Spielstand
const choice = (): Choice => ((st() as any).c4?.choice as Choice) || 'rat';
const inSpace = (id: string) => !!world.def && world.def.id === id && !world.surface;
const docked = (id: string) => !!G.dockedAt && G.dockedAt.id === id;
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
const route = (to: string) => { if (P.sector !== to) P.route = to; };
const lineSpace = (id: string, name: string): Obj => [`Springe ${jumpTo(name)}${P.route === id ? ' · Route gesetzt (Karte: M)' : ''}`, false, false];
const speed = () => Math.hypot(P.vx, P.vy, P.vz);
const dist = (p: number[]) => d3(p[0], p[1], p[2], P.x, P.y, P.z);
const dockMark = (id: string, label: string, col: string): Marker[] => { const s = world.stations.find(x => x.id === id); return s && !world.surface ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label, col, big: true }] : []; };
const bastion = () => world.stations.find(s => s.id === 'bastion');
const rel = (p: number[]) => { const b = bastion(); return b ? [b.x + p[0], b.y + p[1], b.z + p[2]] : p; };
const alive = (L: any[]) => L.filter(e => world.enemies.includes(e)).length;
const lockAnna = () => [AN[0] + 95, AN[1] + 10, AN[2]];               // Schleuse der Anna
const breach = () => [KR[0] + 85, KR[1] + 12, KR[2] + 20];            // Bresche im Rumpf des Kranich
// Schiff oder Wrack verlassen: Die Schleuse führt erst wieder hinein, wenn man sich entfernt hat. Läuft am Anfang jedes Schritts, der anlegen lässt,
// und einmal je Bild: Wer zuerst nach dem Verlassen dran ist, merkt es (sonst säße der Pilot im selben Bild wieder im Schiff).
function trackDun() { const inD = DUN.active && (DUN.e?.id === ANNA_ID || DUN.e?.id === KRAN_ID); if (S.inD && !inD) S.away = false; S.inD = inD; }
// Zustand, der nicht gespeichert wird
const S = {
  met: false, scene: false, wait: -1, clock: 90, swarmT: 0, foes: [] as any[], inD: false, away: true,
  kranich: false, rush: 0, rushOn: false, hurtT: 0, out: false,
};
// Die Schlacht um Heimstatt (Schritt 10)
type Ship = { i: number; t: any; state: 'wait' | 'fly' | 'home' | 'down'; hp: number };
const B = { on: false, t: 0, ships: [] as Ship[], wave: 0, foes: [] as any[], keep: false, said: 0, meshes: [] as THREE.Object3D[], failT: 0 };
const SHIP_HP = 2400, SHIP_SPD = 46;

// ---------- Die Anna (Lichtwall): bewohntes Schiff, keine Wächter; die Frist läuft oben im Bild mit ----------
const ANNA: DungeonEntrance = {
  id: ANNA_ID, x: 0, y: 0, z: 0, yaw: 0, size: 4, name: 'Kolonieschiff Anna', kind: 'schiff', danger: 0,
  note: () => (c5().core ? '' : S.clock > 0 ? `DER RUF LÄUFT · SCHWARM IN ${Math.ceil(S.clock)} s` : 'DER SCHWARM IST DA · SPRUNGKERN ABSCHALTEN'),
  goal: {
    label: 'Sprungkern abschalten', got: () => !!c5().core,
    take: () => {
      const d = c5(); d.core = true; d.late = S.clock <= 0; saveGame();
      talk(['BRANDES', 'Hier Brandes, Kapitänin der Anna. Wer ist an meinem Sprungkern? Und warum zeigt meine Borduhr achtunddreißig Jahre?'],
        d.late ? ['SANDER', 'Der Ruf ist aus, aber sie haben ihn gehört. Raus mit Ihnen, Pilot. Die Anna braucht Deckung.']
          : ['SANDER', 'Der Ruf ist verstummt. Kein einziger Kontakt am Rand. Das war sauber, Pilot.']);
    },
  },
};
// ---------- Der Kranich (Narbe): Wrack mit Wächtern; nach dem Ziehen des Schlafkerns bricht der Rumpf ----------
const KRANICH: DungeonEntrance = {
  id: KRAN_ID, x: 0, y: 0, z: 0, yaw: 0, size: 6, name: 'Wrack des Kranich', kind: 'wrack', danger: 2,      // zwei Stufen unter dem Sektor: Die Geschichte soll schaffbar bleiben
  note: () => (!S.rushOn ? '' : S.rush > 0 ? `DER RUMPF BRICHT · ${Math.ceil(S.rush)} s BIS ZUR SCHLEUSE` : 'DIE LUFT ENTWEICHT · RAUS HIER'),
  goal: {
    label: 'Schlafkern ziehen', got: () => !!c5().kern,
    take: () => {
      c5().kern = true; saveGame();
      S.rushOn = true; S.rush = 150; S.hurtT = 0;
      const n = dungeonAlarm(3);
      if (n) dungeonSay(`${n} Wächter zwischen dir und der Schleuse.`, '#ff6b5b');
      talk(['ACHTERBERG', 'Die Module sind ab, wir haben sie am Haken. Und jetzt lauf, Pilot. Der Rumpf bricht!']);
    },
  },
};

// Figuren im Hangar der Bastion: Varga und Sander, dazu (in den Szenen) Hollweg und Achterberg
function crew(label: string, go: () => void, all: boolean) {
  const { x: hx, z: hz } = hangarSpot(-4);
  const ok = storyNpc('Emil Sander', 'Navigator der Weitsicht', label, go, '#a8e0d0', { x: hx, z: hz }, { model: 'sander' });
  storyNpc('Kapitän Varga', 'Weitsicht', label, go, '#9fd8ff', { x: hx + 2.4, z: hz + 0.6 }, { model: 'varga' });
  if (all) {
    storyNpc('Hollweg', 'Flottenrat', label, go, '#bcd8ff', { x: hx - 2.4, z: hz + 0.6 }, { model: 'hollweg' });
    storyNpc('Achterberg', 'Ausbildung', label, go, '#ffb347', { x: hx + 4.6, z: hz + 1.8 }, { model: 'achterberg' });
  }
  return ok;
}
const face = () => { const { x: hx, z: hz } = hangarSpot(-4); IN.yaw = Math.atan2(-(hx - IN.x), -(hz + 1 - IN.z)); IN.pitch = 0; };

const STEPS: Step[] = [
  { // 0: Varga hat jemanden geweckt
    title: T,
    enter: () => {
      const lines = () => { talk(['BRUMMER', 'Bastion an Pilot. Kapitän Varga hat einen seiner Leute geweckt, einen Navigator. Die beiden stehen im Hangar und fragen nach dir.']); route(HOME); };
      if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'dock') playScene([{ text: 'KAPITEL 5', big: true, t: 2.4 }, { text: 'Die Zehn', big: true, t: 3 }], lines);
      else lines();
    },
    lines: () => [inSpace(HOME) ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace(HOME, 'Heimstatt')],
    done: () => docked('bastion') && !dialogBusy(),
    markers: () => (inSpace(HOME) ? dockMark('bastion', 'BASTION · ANDOCKEN', '#ffb347') : []),
  },
  { // 1: Varga und Sander im Hangar der Bastion
    title: 'Kapitel 5 · Der Navigator',
    enter: () => { S.met = false; },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || !settled() || IN.ship || !docked('bastion')) return;
      S.met = crew('Mit Navigator Sander sprechen', () => {
        if (c5().met) { if (!dialogBusy()) talk(['SANDER', 'Die Sonnenwacht, Pilot. Rika Tamm hört das Tor seit achtunddreißig Jahren ab. Bringen Sie ihr den Schreiber.']); return; }
        c5().met = true;
        talk(['KAPITÄN VARGA', 'Pilot. Ich wollte Ihnen danken, bevor ich Sie schon wieder um etwas bitte. Das ist Emil Sander, mein Navigator. Ich habe ihn als Ersten geweckt.'],
          ['SANDER', 'Für mich war der Abflug vor zehn Tagen. Ich rechne mit Sternkarten, die hier keiner mehr kennt. Aber rechnen kann ich noch.'],
          ['SANDER', 'Die zehn Schiffe hängen im selben Sprung fest wie wir. Der Sprung zerfällt, und sie fallen heraus. Eines nach dem anderen. Das erste in wenigen Tagen.'],
          ['KAPITÄN VARGA', 'Und jedes, das herausfällt, läutet wie ein Tor. Neunzig Sekunden, dann ist der Schwarm da. Sie kennen das besser als ich.'],
          ['SANDER', 'Ich brauche Messwerte vom zerbrochenen Tor. Bringen Sie meinen Sprungschreiber zur Sonnenwacht, zu Rika Tamm. Dann sage ich Ihnen, wo das erste Schiff ankommt.']);
        route(SUN); saveGame();
      }, false);
    },
    lines: () => {
      if (!c5().met && !(IN.active && docked('bastion'))) return [inSpace(HOME) ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace(HOME, 'Heimstatt')];
      return [['Aussteigen und zu <b>Navigator Sander</b> gehen', !!c5().met || nearNpc('Emil Sander'), false], ['Mit Sander sprechen · <b>E</b>', !!c5().met, false], ['Ablegen', false, false]];
    },
    done: () => !!c5().met && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
    markers: () => (inSpace(HOME) && !c5().met ? dockMark('bastion', 'BASTION · ANDOCKEN', '#ffb347') : []),
  },
  { // 2: den Sprungschreiber zur Sonnenwacht bringen
    title: 'Kapitel 5 · Der Takt im Rauschen',
    enter: () => { S.met = false; route(SUN); },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || !settled() || IN.ship || !docked('sonnenwacht')) return;
      S.met = storyNpc('Rika Tamm', 'Sonnenwacht', 'Rika Tamm den Sprungschreiber geben', () => {
        if (c5().tamm) { if (!dialogBusy()) talk(['TAMM', 'Flieg, Pilot. Dein Navigator hat seine Zahlen schon.']); return; }
        c5().tamm = true;
        sfx('confirm', 0.6, 1, () => snd(700, 0.2, 'sine', 0.05, 200));
        talk(['TAMM', 'Ein Sprungschreiber von der Weitsicht. Gib her. Ich höre dieses Tor ab, seit ich neun bin, und zum ersten Mal fragt mich jemand danach.'],
          ['TAMM', 'Da. Dein Navigator hat recht. Das Rauschen hat einen Takt, und der Takt wird schneller. Da kommt etwas heraus.'],
          ['TAMM', 'Ich schicke ihm alles, was meine Antennen in achtunddreißig Jahren aufgezeichnet haben. Und Pilot: Sag ihnen, die Sonnenwacht hört mit.']);
        saveGame();
      }, '#e0b030', hangarSpot(-7), { model: 'tamm' });
    },
    lines: () => {
      if (!c5().tamm && !(IN.active && docked('sonnenwacht'))) return [inSpace(SUN) ? ['An der <b>Sonnenwacht</b> andocken · E', false, false] : lineSpace(SUN, 'Sonnenfeld')];
      return [['Aussteigen und zu <b>Rika Tamm</b> gehen', !!c5().tamm || nearNpc('Rika Tamm'), false], ['Den Sprungschreiber übergeben · <b>E</b>', !!c5().tamm, false], ['Ablegen', false, false]];
    },
    done: () => !!c5().tamm && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
    markers: () => (inSpace(SUN) && !c5().tamm ? dockMark('sonnenwacht', 'SONNENWACHT · ANDOCKEN', '#e0b030') : []),
  },
  { // 3: Die Anna kommt im Lichtwall an: an Bord gehen und den Sprungkern abschalten
    title: 'Kapitel 5 · Die Anna',
    enter: () => {
      S.wait = -1; S.clock = 90; S.swarmT = 0; S.foes = []; S.away = true;
      route(LICHT);
      if (!c5().anna) talk(['SANDER', 'Sander an Pilot. Tamms Takt passt auf meine Rechnung. Das erste Schiff ist die Anna. Sie fällt im Lichtwall heraus, und zwar bald. Seien Sie vor ihr da.']);
    },
    lines: () => {
      const d = c5();
      if (!inSpace(LICHT) && !DUN.active) return [lineSpace(LICHT, 'Lichtwall')];
      if (!d.anna) return [[`Zum berechneten Ankunftspunkt · <b>${fmtDist(dist(AN))}</b>`, dist(AN) < 900, false], [S.wait >= 0 ? `Der Sprung reißt auf · <b>${Math.ceil(S.wait)} s</b>` : 'Auf 900 m heran und warten', false, true]];
      if (!d.core) {
        const l = lockAnna(), v = speed();
        return [[S.clock > 0 ? `Der Ruf läuft · Schwarm in <b>${Math.ceil(S.clock)} s</b>` : 'Der Schwarm ist da', false, false],
          !S.away && !DUN.active ? ['Erst von der Schleuse wegfliegen (260 m), dann wieder langsam heran', false, false]
            : [`Zur Schleuse der <b>Anna</b> · <b>${fmtDist(dist(l))}</b>${v > 60 ? ` · langsam (unter 60 m/s), jetzt <b>${Math.round(v)}</b>` : ''}`, DUN.active, false],
          ['An Bord: Sicherungen ziehen, dann den Sprungkern abschalten', false, false]];
      }
      const left = alive(S.foes);
      return [['Der Sprungkern der Anna ist aus', true, false], DUN.active ? ['Zurück zur Schleuse und ins Schiff · <b>E</b>', false, false] : [left ? `Ferrox von der Anna vertreiben · <b>${left}</b> übrig` : 'Kein Ferrox am Rand', left === 0, false]];
    },
    tick: dt => {
      const d = c5(); trackDun();
      if (!inSpace(LICHT)) { S.wait = -1; return; }
      const run = G.mode === 'play' || G.mode === 'dungeon';
      // Ankunft: Der Pilot wartet am berechneten Punkt, dann reißt der Sprung auf
      if (!d.anna) {
        if (G.mode !== 'play') return;
        if (S.wait < 0) { if (dist(AN) < 900) { S.wait = 8; storyHooks.banner('DER SPRUNG REISST AUF', 'Etwas Großes kommt heraus. Abstand halten.', '#9fd8ff'); snd(90, 1.6, 'sine', 0.05, 240); } return; }
        S.wait -= dt;
        if (S.wait > 0) return;
        d.anna = true; saveGame(); S.clock = 90; S.swarmT = 0; S.away = true;
        burst(AN[0], AN[1], AN[2], '#ffffff', 260, 320, 2.0); burst(AN[0], AN[1], AN[2], '#9fd8ff', 160, 180, 2.6);
        sfx('explosion0', 0.5, 0.5, () => snd(60, 1.2, 'sawtooth', 0.06, 200));
        storyHooks.banner('KOLONIESCHIFF „ANNA“', 'Antrieb tot. Der Sprungkern läuft und ruft: neunzig Sekunden.', '#ff6b5b');
        talk(['SANDER', 'Da ist sie. Die Anna. Ihr Sprungkern läuft noch, und er ruft. Neunzig Sekunden, Pilot. Docken Sie an der Schleuse an und schalten Sie ihn von Hand ab.']);
        return;
      }
      // Frist und Schwarm, solange der Kern läuft
      if (!d.core && run) {
        const before = S.clock; S.clock -= dt;
        if (before > 0 && S.clock <= 0) {
          storyHooks.banner('DER SCHWARM IST DA', 'Die Ferrox haben den Ruf gehört. Schalte den Sprungkern ab, sonst kommen immer mehr.', '#ff6b5b');
          if (DUN.active) dungeonSay('Der Schwarm ist da. Der Kern ruft weiter.', '#ff6b5b');
          S.swarmT = 0;
        }
      }
      // Ferrox erscheinen nur, wenn der Pilot im All ist: sofort nach Ablauf der Frist, dann alle 45 s Nachschub, bis der Kern aus ist (höchstens sechs zugleich)
      if (S.clock <= 0 && G.mode === 'play' && !SHARED.client) {
        S.swarmT -= dt;
        const n = alive(S.foes);
        if (S.swarmT <= 0 && (!d.core ? n < 6 : S.foes.length === 0)) {
          S.swarmT = 45;
          const add = d.core ? 3 : Math.min(3, 6 - n);
          for (let i = 0; i < add; i++) S.foes.push(spawnEnemy('drone', AN[0] - 700 + i * 130, AN[1] + 160 - i * 50, AN[2] + 900, { x: AN[0], y: AN[1], z: AN[2] }));
        }
      }
      // Andocken an der Schleuse (nach einem Besuch erst wieder, wenn man sich entfernt hat)
      if (G.mode === 'play' && !DUN.active && !d.core) {
        const l = lockAnna(), dl = dist(l);
        if (dl > 260) S.away = true;
        if (S.away && dl < 130 && speed() < 60) { P.vx = P.vy = P.vz = 0; enterDungeon(ANNA); }
      }
    },
    done: () => { const d = c5(); return !!d.core && G.mode === 'play' && !DUN.active && (S.clock > 0 || (S.foes.length > 0 && alive(S.foes) === 0) || SHARED.client) && !dialogBusy(); },
    markers: () => {
      if (!inSpace(LICHT)) return [];
      const d = c5();
      if (!d.anna) return [{ x: AN[0], y: AN[1], z: AN[2], label: 'ANKUNFTSPUNKT · WARTEN', col: '#9fd8ff', big: true }];
      if (!d.core) { const l = lockAnna(); return [{ x: l[0], y: l[1], z: l[2], label: 'SCHLEUSE DER ANNA · LANGSAM ANLEGEN', col: '#ffb347', big: true }]; }
      return [{ x: AN[0], y: AN[1] + 90, z: AN[2], label: 'ANNA', col: '#9fd8ff', big: false }];
    },
  },
  { // 4: Krull weckt die ersten Schläfer (Talstadt): Eis und Helium-3
    title: 'Kapitel 5 · Dreitausend wecken',
    enter: () => {
      S.met = false; route(HOME);
      talk(['KRULL', 'Krull an Pilot. Die Anna liegt sicher im Lichtwall, aber ihre Schläfer wachen nicht von selbst auf. Meine Weckanlage in Talstadt schafft das. Aber nicht trocken. Komm vorbei.']);
    },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || !settled() || IN.ship || !docked(TAL)) return;
      S.met = storyNpc('Krull', 'Bergbaugilde', 'Mit Gildemeisterin Krull sprechen', () => {
        const d = c5();
        if (d.wach) { if (!dialogBusy()) talk(['KRULL', 'Die Anlage läuft. Geh, bevor einer der Schläfer dich für den Arzt hält.']); return; }
        if (dialogBusy()) return;
        const have = () => (P.cargo.eis || 0) >= EIS && (P.cargo.helium || 0) >= HE;
        if (!d.krull) {
          d.krull = true;
          talk(['KRULL', 'Dreitausend Menschen in Kältekammern, und meine Anlage ist für dreißig gebaut. Ich brauche Kühlmittel und Brennstoff: zwölf Wassereis und sechs Helium-3.'],
            ['KRULL', 'Eis schürfst du in jedem Eisfeld. Helium-3 gibt es hier im Markt oder im Eis kalter Planeten. Bring mir beides, dann wecke ich die Ersten.']);
          saveGame();
          if (!have()) return;
        }
        if (!have()) { talk(['KRULL', 'Zwölf Wassereis, sechs Helium-3. Vorher bleibt die Anlage kalt.']); return; }
        P.cargo.eis -= EIS; P.cargo.helium -= HE; d.wach = true; saveGame();
        sfx('confirm', 0.6, 1, () => snd(700, 0.2, 'sine', 0.05, 200));
        talk(['KRULL', 'Das reicht für die Ersten. In drei Tagen laufen sie durch Talstadt und fragen, welches Jahr wir haben.'],
          ['KRULL', 'Und ich muss es ihnen sagen. Achtunddreißig Jahre, und keiner hat auf sie gewartet. Wir wussten ja nicht, dass sie noch kommen.']);
        storyHooks.banner('WECKANLAGE LÄUFT', `${EIS} Wassereis und ${HE} Helium-3 verbraucht`, '#ffb347');
      }, '#ffb347', hangarSpot(-7), { model: 'krull' });
    },
    lines: () => {
      const d = c5(), ne = Math.min(EIS, P.cargo.eis || 0), nh = Math.min(HE, P.cargo.helium || 0), here = IN.active && docked(TAL);
      const way: Obj = here ? ['In <b>Talstadt</b> gelandet', true, false] : world.surface && P.sector === HOME ? ['In die Stadt <b>Talstadt</b> fliegen und im Hangar landen', false, false] : P.sector === HOME ? ['Auf <b>Heimstatt II</b> landen (Ziel: Talstadt)', false, false] : [`Springe nach <b>Heimstatt</b>, dort nach <b>Talstadt</b> auf Heimstatt II${P.route === HOME ? ' · Route gesetzt (Karte: M)' : ''}`, false, false];
      if (!d.krull) return [way, ['Aussteigen und zu <b>Gildemeisterin Krull</b> gehen', nearNpc('Krull'), false], ['Mit Krull sprechen · <b>E</b>', false, false]];
      if (!d.wach) return [[`<b>${EIS} Wassereis</b> im Frachtraum · ${ne}/${EIS}`, ne >= EIS, false], [`<b>${HE} Helium-3</b> im Frachtraum · ${nh}/${HE}`, nh >= HE, false], ['Eis: jedes Eisfeld. Helium-3: Markt in Talstadt oder Eisplaneten', false, true], way, ['Krull beides bringen · <b>E</b>', false, false]];
      return [['Die Weckanlage läuft', true, false], ['Ablegen', false, false]];
    },
    done: () => !!c5().wach && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
  },
  { // 5: Der Kranich fällt in die Narbe: hinfliegen und an der Bresche anlegen
    title: 'Kapitel 5 · Der Kranich',
    enter: () => {
      route(NARBE); S.kranich = false; S.away = true;
      talk(['SANDER', 'Sander an Pilot. Das zweite Schiff ist der Kranich. Er fällt früher heraus als gerechnet. Und am falschen Ort: mitten in der Narbe.'],
        ['ACHTERBERG', 'Staffel Vier ist schon unterwegs. Wir halten dir den Schwarm vom Leib. Du gehst rein und holst die Schläfer raus.']);
    },
    lines: () => {
      if (!inSpace(NARBE)) return [lineSpace(NARBE, 'Die Narbe'), ['Der Weg führt über Wachtposten Ost und die Grauzone', false, true]];
      const b = breach(), v = speed();
      return [[`Zur Bresche im <b>Kranich</b> · <b>${fmtDist(dist(b))}</b>`, false, false], [`Langsam heran (unter 60 m/s)${v > 60 ? ` · jetzt <b>${Math.round(v)}</b>` : ''}`, false, true], ['Staffel Vier deckt dich. Das Wrack betrittst du zu Fuß', false, true]];
    },
    tick: () => {
      trackDun();
      if (!inSpace(NARBE)) { S.kranich = false; return; }
      kranichOutside(); calm();
      if (G.mode !== 'play' || DUN.active) return;
      const b = breach();
      const db = dist(b);
      if (db > 260) S.away = true;
      if (!S.away || db > 130 || speed() > 60) return;
      P.vx = P.vy = P.vz = 0; S.rushOn = false;
      enterDungeon(KRANICH);
    },
    done: () => DUN.active && DUN.e?.id === KRAN_ID,
    markers: () => { if (!inSpace(NARBE)) return []; const b = breach(); return [{ x: b[0], y: b[1], z: b[2], label: 'KRANICH · LANGSAM ANLEGEN', col: '#ffb060', big: true }]; },
  },
  { // 6: im Wrack: Notstrom, Wächterkern, Schlafkern ziehen
    title: 'Kapitel 5 · Der Schlafkern',
    enter: () => { if (DUN.active) talk(['ACHTERBERG', 'Wir halten draußen. Leg den Notstrom um, dann kommst du an den Schlafkern. Zieh ihn, und die Schlafmodule sprengen sich ab. Beeil dich.']); },
    lines: () => {
      if (!DUN.active) return [[S.away ? 'Zurück zur Bresche im <b>Kranich</b>' : 'Erst von der Bresche wegfliegen (260 m), dann wieder langsam heran', false, false], ['Der Schlafkern sitzt noch im Wrack', false, true]];
      const left = DUN.sws.filter(q => !q.on).length, boss = DUN.foes.some(f => f.boss);
      return [[`Notstromschalter umlegen${left ? ` · <b>${left}</b> übrig` : ''}`, left === 0, false], ['Den Wächterkern zerstören', !boss, false], ['Schlafkern ziehen · <b>E</b>', !!c5().kern, false]];
    },
    tick: () => {
      trackDun();
      if (!inSpace(NARBE)) return;
      kranichOutside(); calm();
      // wer das Wrack ohne Schlafkern verlässt (oder zusammenbricht), kann an der Bresche wieder hinein
      if (DUN.active || G.mode !== 'play') return;
      const dl = dist(breach());
      if (dl > 260) S.away = true;
      if (S.away && dl < 130 && speed() < 60) { P.vx = P.vy = P.vz = 0; S.rushOn = false; enterDungeon(KRANICH); }
    },
    done: () => !!c5().kern && !dialogBusy(),
    markers: () => { if (DUN.active || !inSpace(NARBE)) return []; const b = breach(); return [{ x: b[0], y: b[1], z: b[2], label: 'KRANICH · LANGSAM ANLEGEN', col: '#ffb060', big: true }]; },
  },
  { // 7: zurück zur Schleuse, während der Rumpf bricht, dann raus aus der Narbe
    title: 'Kapitel 5 · Raus hier',
    enter: () => { S.out = false; },
    lines: () => [DUN.active ? [S.rush > 0 ? `Zurück zur Schleuse · der Rumpf bricht in <b>${Math.ceil(S.rush)} s</b>` : 'Zurück zur Schleuse · die Luft entweicht', false, false] : ['Zurück im Schiff', true, false], ['Aus der Narbe springen (J im Marschflug oder durchs Tor)', P.sector !== NARBE, false]],
    tick: dt => {
      if (DUN.active && DUN.e?.id === KRAN_ID) {
        calm();
        // Rückweg unter Druck: Nach Ablauf der Frist entweicht die Luft (Schaden in Schüben), bis der Pilot an der Schleuse ist
        if (!S.rushOn) { S.rushOn = true; S.rush = 150; }      // Spielstand im Wrack geladen: Die Frist beginnt neu
        S.rush -= dt;
        if (S.rush <= 0) { S.hurtT -= dt; if (S.hurtT <= 0) { S.hurtT = 1.6; dungeonHurt(9); } }
        return;
      }
      S.rushOn = false;
      if (S.out || !inSpace(NARBE) || G.mode !== 'play') return;
      S.out = true;
      talk(['ACHTERBERG', 'Dreitausend Schläfer im Schlepp, und kein einziger fehlt. Der Kranich bleibt hier. Spring, Pilot. Wir sind direkt hinter dir.']);
      if (!SHARED.client) { const b = breach(); for (let i = 0; i < 4; i++) weaken(spawnEnemy(i === 3 ? 'bomber' : 'drone', b[0] + 900 + i * 150, b[1] + 130 - i * 50, b[2] - 650)); }
    },
    done: () => !DUN.active && P.sector !== NARBE,
  },
  { // 8: Sanders Rechnung (Szene im Hangar der Bastion)
    title: 'Kapitel 5 · Sanders Rechnung',
    enter: () => {
      S.met = false; S.scene = false; route(HOME);
      if (!c5().plan) talk(['SANDER', 'Sander an Pilot. Kommen Sie zur Bastion. Ich habe den Schreiber des Kranich ausgewertet, und das Ergebnis gefällt mir nicht.']);
    },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || S.scene || c5().plan || !settled() || IN.ship || !docked('bastion')) return;
      S.met = crew('Sanders Rechnung anhören', () => { if (S.scene || c5().plan) return; S.scene = true; face(); rechnung(); }, true);
    },
    lines: () => {
      if (c5().plan) return [['Der Rat kennt Sanders Rechnung', true, false], ['Ablegen', false, false]];
      if (!(IN.active && docked('bastion'))) return [inSpace(HOME) ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace(HOME, 'Heimstatt')];
      return [['Aussteigen und zu <b>Navigator Sander</b> gehen', S.scene || nearNpc('Emil Sander'), false], ['Sanders Rechnung anhören · <b>E</b>', S.scene, false]];
    },
    done: () => !!c5().plan && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
    markers: () => (inSpace(HOME) && !c5().plan ? dockMark('bastion', 'BASTION · ANDOCKEN', '#ffb347') : []),
  },
  { // 9: Heimstatt rüstet: Wer dem Piloten vertraut, kommt zum Sammelpunkt
    title: 'Kapitel 5 · Heimstatt rüstet',
    enter: () => {
      route(HOME);
      if (!c5().call) talk(['BRUMMER', 'Bastion an alle Piloten. Der Schwarm kommt nach Heimstatt. Wer fliegen kann, sammelt sich am alten Ankerplatz. Der Pilot führt.']);
    },
    lines: () => {
      if (!inSpace(HOME)) return [lineSpace(HOME, 'Heimstatt')];
      const m = rel(MEET);
      return [[`Zum Sammelpunkt · <b>${fmtDist(dist(m))}</b>`, !!c5().call, false], ['Je besser dein Ruf bei Rat, Grenzwacht und Gilde, desto mehr Piloten kommen', false, true]];
    },
    tick: () => {
      const d = c5();
      if (d.call || !inSpace(HOME) || G.mode !== 'play' || dist(rel(MEET)) > 450) return;
      const n = (['rat', 'wacht', 'gilde'] as RepId[]).map(f => (level(f) >= 3 ? 2 : level(f) >= 1 ? 1 : 0));
      d.call = n; saveGame();
      sfx('confirm', 0.6, 1, () => snd(700, 0.2, 'sine', 0.05, 200));
      const say = (k: number, who: string, col: string, one: string, two: string) => { if (n[k]) radio(who, n[k] > 1 ? two : one, col); };
      say(0, 'RATSWACHE', '#bcd8ff', 'Ein Jäger des Rats meldet sich bei dir.', 'Zwei Jäger des Rats melden sich bei dir.');
      say(1, 'GRENZWACHT', '#f2d36b', 'Wachtposten Ost schickt einen Jäger. Mehr können wir nicht entbehren.', 'Wachtposten Ost schickt zwei Jäger. Für dich, Pilot.');
      say(2, 'GILDE', '#ffb347', 'Ein Schürfer der Gilde hat Kanonen montiert und fliegt mit.', 'Zwei Schürfer der Gilde haben Kanonen montiert und fliegen mit.');
      const extra = n[0] + n[1] + n[2];
      talk(extra ? ['ACHTERBERG', 'Staffel Vier steht. Und sieh dich um, Pilot. Die anderen sind deinetwegen hier.'] : ['ACHTERBERG', 'Staffel Vier steht. Mehr sind wir nicht. Es muss reichen.']);
    },
    done: () => !!c5().call && !dialogBusy(),
    markers: () => { if (!inSpace(HOME) || c5().call) return []; const m = rel(MEET); return [{ x: m[0], y: m[1], z: m[2], label: 'SAMMELPUNKT', col: '#ffd27a', big: true }]; },
  },
  { // 10: Die Schlacht um Heimstatt
    title: 'Kapitel 5 · Die Schlacht um Heimstatt',
    enter: () => { resetBattle(); },
    lines: () => {
      if (!inSpace(HOME)) return [lineSpace(HOME, 'Heimstatt'), ['Die Schlacht beginnt, sobald du im Sektor bist', false, true]];
      if (G.dockedAt) return [['Ablegen: Die Schlacht beginnt neu, sobald du draußen bist', false, false]];
      if (!B.on) return [['Der Sprung reißt gleich auf', false, false]];
      const home = B.ships.filter(s => s.state === 'home').length, down = B.ships.filter(s => s.state === 'down').length, fly = B.ships.filter(s => s.state === 'fly').length, left = alive(B.foes);
      const L: Obj[] = [[`Schiffe am Ankerplatz · <b>${home}</b> von 8 (mindestens 6)`, home >= 6, false], [`Unterwegs: <b>${fly}</b> · Lahmgelegt: <b>${down}</b> (höchstens 2)`, false, true]];
      if (left) L.push([`Ferrox abwehren · <b>${left}</b> im Anflug`, false, false]);
      const ch = choice();
      L.push([ch === 'rat' ? `Schirm des Rats: ${fmtDist(SHIELD)} um die Bastion ist jedes Schiff sicher` : ch === 'wacht' ? 'Falle der Wacht: Aus jeder Welle fliegen zwei in die Minen' : 'Störsender der Gilde: Die Wellen kommen später', false, true]);
      return L;
    },
    tick: dt => battle(dt),
    done: () => !!c5().won && !dialogBusy(),
    markers: () => {
      if (!inSpace(HOME) || !B.on) return [];
      const L: Marker[] = [], a = rel(AP);
      L.push({ x: a[0], y: a[1], z: a[2], label: 'ANKUNFTSPUNKT', col: '#9fd8ff', big: false });
      for (const s of B.ships) if (s.state === 'fly' && s.t) L.push({ x: s.t.x, y: s.t.y + 80, z: s.t.z, label: `${EIGHT[s.i].name.toUpperCase()} · ${Math.max(0, Math.round(s.t.hp / s.t.maxhp * 100))} %`, col: s.t.hp / s.t.maxhp < 0.4 ? '#ff6b5b' : '#ffb347', big: s.t.hp / s.t.maxhp < 0.4 });
      return L;
    },
  },
  { // 11: Vollzählig (Szene im Hangar der Bastion)
    title: 'Kapitel 5 · Vollzählig',
    enter: () => { S.met = false; S.scene = false; },
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || S.scene || !settled() || IN.ship || !docked('bastion')) return;
      S.met = crew('Zur Runde treten', () => { if (S.scene) return; S.scene = true; face(); vollzaehlig(); }, true);
    },
    lines: () => {
      if (!(IN.active && docked('bastion'))) return [inSpace(HOME) ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace(HOME, 'Heimstatt')];
      return [['Aussteigen und zu <b>Ratsherr Hollweg</b> gehen', S.scene || nearNpc('Hollweg'), false], ['Zur Runde treten · <b>E</b>', S.scene, false]];
    },
    done: () => false,
    markers: () => (inSpace(HOME) ? dockMark('bastion', 'BASTION · ANDOCKEN', '#ffd27a') : []),
  },
];

function rechnung() {
  if (G.mode === 'dock' && G.inside) closeMenu();
  const ch = choice();
  const keep = ch === 'rat' ? { who: 'HOLLWEG', text: 'Der Kristall hat uns ein Wort gelehrt. Die Bastion legt daraus einen Schirm. Wer darin ist, den rührt der Schwarm nicht an.' }
    : ch === 'wacht' ? { who: 'ROTH', text: 'Roth an Bastion. Die Wacht hat mit dem Kristall rufen gelernt. Wir legen einen falschen Ruf an den Ankunftspunkt. Wer ihm folgt, fliegt in unsere Minen.' }
      : { who: 'KRULL', text: 'Krull an Bastion. Im Kristall steht, wie ein Ruf gebaut ist. Abstellen kann ich ihn nicht, aber stören. Das kauft euch Zeit.' };
  playScene([
    { who: 'SANDER', text: 'Ich habe Tamms Aufzeichnungen neben den Schreiber des Kranich gelegt. Die übrigen acht fallen nicht einzeln heraus. Sie kommen zusammen.' },
    { who: 'HOLLWEG', text: 'Wo?', t: 2.2 },
    { who: 'SANDER', text: 'Am alten Ankerplatz, fünf Kilometer von diesem Hangar. Dort hat die Bastion vor achtunddreißig Jahren ihren ersten Anker geworfen. Der Sprung zieht sie zu ihr, nicht zum Tor.' },
    { who: 'KAPITÄN VARGA', text: 'Acht Schiffe. Acht Rufe auf einmal. Vierundzwanzigtausend Schläfer.' },
    { who: 'ACHTERBERG', text: 'Dann kommt der Schwarm zum ersten Mal nach Heimstatt.' },
    { who: 'HOLLWEG', text: 'Meine Mutter hat geschworen, dass das nie geschieht. Ich schwöre etwas anderes: Wenn er kommt, findet er uns wach.' },
    keep,
    { who: 'ACHTERBERG', text: 'Pilot. Ruf zusammen, wer dir vertraut. Wir brauchen jedes Schiff, das fliegen kann.' },
  ], () => { c5().plan = true; S.scene = false; storyNpcsLeave(); saveGame(); });      // die Runde löst sich auf (sonst blieb sie mit einem toten Ansprechpunkt stehen)
}
function vollzaehlig() {
  if (G.mode === 'dock' && G.inside) closeMenu();
  const down = c5().down || 0;
  playScene([
    { text: 'Heimstatt · am selben Abend', big: true, t: 3.2 },
    { who: 'BRUMMER', text: down === 1 ? 'Bastion an alle Decks. Sieben Schiffe am Anker, eines im Schlepp. Dazu die Anna und die Weitsicht. Ich habe dreimal gezählt.' : down ? 'Bastion an alle Decks. Sechs Schiffe am Anker, zwei im Schlepp. Dazu die Anna und die Weitsicht. Ich habe dreimal gezählt.' : 'Bastion an alle Decks. Acht Schiffe am Anker. Dazu die Anna und die Weitsicht. Ich habe dreimal gezählt.' },
    { who: 'KAPITÄN VARGA', text: 'Zwölf Schiffe sind aufgebrochen. Eines liegt als Wrack in der Narbe, und kein einziger Mensch ist darin geblieben. Vor einem Monat hätte ich das niemandem geglaubt.' },
    { who: 'HOLLWEG', text: 'Gestern waren wir neuntausend. Heute sind wir über dreißigtausend, und die meisten schlafen noch.' },
    { who: 'ACHTERBERG', text: 'Keiner wird zurückgelassen. Ich habe nie gedacht, dass der Satz einmal so viele meint.' },
    { who: 'SANDER', text: 'Da ist noch etwas. Ich habe die Rufe gezählt, die durchkamen, als der Sprung zerfiel. Es waren nicht zehn. Es waren elf.' },
    { who: 'KAPITÄN VARGA', text: 'Wir hatten keine elf Schiffe mehr dort drin.', t: 3.6 },
    { who: 'SANDER', text: 'Die elfte Kennung gehört nicht zur Flotte. Sie kam von der anderen Seite. Aus Richtung Halden.' },
    { who: 'HALDEN', text: 'Halden hört euch.', big: true, t: 5 },
    { text: 'Jemand hat die ganze Zeit zugehört.', big: true, t: 5 },
    { text: 'KAPITEL 5 ABGESCHLOSSEN', big: true, t: 3.5 },
  ], finish);
}
// Schritte, die mit einem Gespräch enden, bleiben beim Laden stehen, solange es aussteht; wer im Wrack gespeichert hat, legt neu an
registerChain({
  key: 'ch5', steps: STEPS,
  resume: n => (n === 1 ? (c5().met ? 2 : 1) : n === 2 ? (c5().tamm ? 3 : 2) : n === 4 ? (c5().wach ? 5 : 4) : n === 6 ? 5 : n === 7 ? (c5().kern ? 7 : 5) : n === 8 ? (c5().plan ? 9 : 8) : n),
});

function finish() {
  endChain('ch5');
  P.credits += 6000;
  for (const f of ['rat', 'wacht', 'gilde'] as RepId[]) addRep(f, 40);
  storyHooks.banner('KAPITEL 5 ABGESCHLOSSEN', '+6.000 Credits · Ein Jäger der Sirius fliegt ab jetzt in Heimstatt Patrouille', '#ffd27a');
  snd(523, 0.3, 'triangle', 0.06, 0); setTimeout(() => snd(659, 0.3, 'triangle', 0.06, 0), 200); setTimeout(() => snd(784, 0.5, 'triangle', 0.06, 0), 400);
  saveGame();
}

// ---------- Der Kranich von außen: Staffel Vier und der Schwarm am Wrack (einmal je Aufenthalt in der Narbe) ----------
// Solange der Pilot am oder im Kranich ist, ruht der Nachschub des Sektors (im Wrack vergehen Minuten; draußen stünde sonst ein ganzer Schwarm)
const calm = () => { world.spawnT = Math.max(world.spawnT, 20); for (const e of world.enemies) if (e.type === 'mother') e.launch = Math.max(e.launch, 20); };
const weaken = (e: any) => { e.hp = e.maxhp = Math.round(e.hp * 0.55); e.es = { ...e.es, dmgP: e.es.dmgP * 0.5 }; return e; };
function kranichOutside() {
  if (S.kranich || SHARED.client || G.mode !== 'play' || dist(KR) > 3200) return;
  S.kranich = true;
  const home = { x: KR[0], y: KR[1], z: KR[2], R: 160 };
  if (!world.allies.some(a => a.alive && a.name === 'ACHTERBERG')) {
    spawnStoryAlly('ACHTERBERG', 0xffb347, '#ffb347', KR[0] + 260, KR[1] + 60, KR[2] + 200, home, 2400);
    spawnStoryAlly('STAFFEL VIER', 0x8fd18f, '#8fd18f', KR[0] - 240, KR[1] - 40, KR[2] + 260, home, 900);
  }
  for (let i = 0; i < 4; i++) weaken(spawnEnemy('drone', KR[0] - 500 + i * 180, KR[1] + 200 - i * 70, KR[2] - 600, home));
  talk(['ACHTERBERG', 'Da liegt er. Der Kranich ist in ein Trümmerfeld gefallen, der Rumpf ist gebrochen. Das Schiff kommt nie wieder hoch. Aber die Schlafmodule halten noch.'],
    ['ACHTERBERG', 'Leg an der Bresche an. Wir kümmern uns um das, was hier herumschwirrt.']);
}

// ---------- Die Schlacht um Heimstatt ----------
// Ablauf (abgestimmt im Test, siehe docs/story.md): Acht Schiffe fallen im Abstand von 34 s am Ankunftspunkt aus dem Sprung und fliegen zu ihrem Ankerplatz. Der Schwarm kommt in sechs Wellen
// (die erste nach 60 s; mit dem Störsender der Gilde nach 85 s und in größerem Abstand). Ein Schiff, dessen Rumpf am Ende ist, treibt antriebslos
// (lahmgelegt); mehr als zwei davon, und die Schlacht beginnt neu. Gewonnen ist, wenn alle acht angekommen oder lahmgelegt sind, mindestens sechs am
// Ankerplatz liegen und kein Angreifer mehr fliegt.
function dropMesh(o: THREE.Object3D) { o.removeFromParent(); o.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose?.(); }); }
function resetBattle() {
  for (const s of B.ships) if (s.t && s.state === 'fly') { const i = world.traffic.indexOf(s.t); if (i >= 0) { world.traffic.splice(i, 1); s.t.alive = false; dropMesh(s.t.mesh); } }
  for (const m of B.meshes) dropMesh(m);
  if (!SHARED.client) for (const e of B.foes) { const i = world.enemies.indexOf(e); if (i >= 0) killEnemy(e, i, false, false); }
  B.on = false; B.t = -10; B.ships = []; B.wave = 0; B.foes = []; B.keep = false; B.said = 0; B.meshes = []; B.failT = 0;
}
function startBattle() {
  B.on = true; B.t = -10; B.wave = 0; B.said = 0;
  B.ships = EIGHT.map((_, i) => ({ i, t: null, state: 'wait' as const, hp: SHIP_HP }));
  const b = bastion()!, a = rel(AP), n = c5().call || [0, 0, 0], home = { x: (a[0] + b.x) / 2, y: (a[1] + b.y) / 2, z: (a[2] + b.z) / 2, R: 500 };
  if (!SHARED.client) {
    // Verbündete: Staffel Vier immer, dazu wer dem Ruf des Piloten gefolgt ist (Schritt 9)
    const has = (nm: string) => world.allies.some(q => q.alive && q.name === nm);
    const add = (nm: string, col: number, css: string, k: number, hp: number) => { if (!has(nm)) spawnStoryAlly(nm, col, css, home.x + (k % 3 - 1) * 180, home.y + (k % 2) * 90, home.z + (k % 4 - 1.5) * 160, home, hp); };
    add('ACHTERBERG', 0xffb347, '#ffb347', 0, 2400); add('STAFFEL VIER', 0x8fd18f, '#8fd18f', 1, 900);
    for (let k = 0; k < n[0]; k++) add(`RATSWACHE ${k + 1}`, 0xbcd8ff, '#bcd8ff', 2 + k, 520);
    for (let k = 0; k < n[1]; k++) add(`GRENZWACHT ${k + 1}`, 0xf2d36b, '#f2d36b', 4 + k, 620);
    for (let k = 0; k < n[2]; k++) add(`GILDE ${k + 1}`, 0xd09050, '#ffb347', 6 + k, 460);
  }
  talk(['SANDER', 'Sander an alle. Der Sprung reißt. Das erste Schiff kommt in zehn Sekunden heraus.']);
}
function battle(dt: number) {
  const d = c5();
  if (d.won) return;
  if (!inSpace(HOME) || G.dockedAt) { if (B.on || B.meshes.length) resetBattle(); return; }
  if (G.mode !== 'play') return;
  if (B.failT > 0) { B.failT -= dt; return; }
  // Der Sektor wurde neu aufgebaut (z. B. nach einem Abschuss des Piloten): Die Schiffe im Flug gibt es nicht mehr, also von vorn
  if (B.on && B.ships.some(s => s.state === 'fly' && !world.traffic.includes(s.t))) resetBattle();
  if (!B.on) startBattle();
  B.t += dt;
  if (SHARED.client) { if (B.t > 260) { d.won = true; d.down = 0; saveGame(); } return; }      // Mitspieler ohne eigenen Verkehr: durchhalten genügt
  const b = bastion()!, a = rel(AP), ch = choice();
  // Nachschub des Sektors ruht, solange die Schlacht läuft
  world.spawnT = Math.max(world.spawnT, 20);
  // Ansagen
  if (B.said === 0 && B.t > -4) {
    B.said = 1;
    talk(ch === 'rat' ? ['HOLLWEG', 'Der Schirm steht. Was die Bastion erreicht, ist sicher. Bringt sie bis hierher.']
      : ch === 'wacht' ? ['ROTH', 'Der falsche Ruf läuft. Die Ersten jeder Welle fliegen uns direkt in die Minen.']
        : ['KRULL', 'Der Störsender läuft. Sie hören den Ruf nur noch in Fetzen. Nutzt die Zeit.']);
  }
  if (B.said === 1 && B.t > 150) { B.said = 2; talk(['VARGAL', 'Weitsicht an die Zehn. Folgt den Lichtern der Bastion. Ihr seid nicht mehr allein.']); }
  // Ankünfte
  for (const s of B.ships) {
    if (s.state !== 'wait' || B.t < 34 * s.i) continue;
    const e = EIGHT[s.i], slot = rel(SLOTS[s.i]);
    const x = a[0] + (s.i % 3 - 1) * 320, y = a[1] + (s.i % 2 ? 150 : -90), z = a[2] + (s.i % 4 - 1.5) * 210;
    const t = spawnStoryShip(e.name, 'Kolonieschiff', e.type, e.k, SHIP_HP, SHIP_SPD, x, y, z, world.gates[0]);
    (t as any).goal = { x: slot[0], y: slot[1], z: slot[2] };      // kein Tor und keine Station: fliegt geradeaus zum Ankerplatz
    const l = d3(x, y, z, slot[0], slot[1], slot[2]) || 1; t.vx = (slot[0] - x) / l * 14; t.vy = (slot[1] - y) / l * 14; t.vz = (slot[2] - z) / l * 14;
    s.t = t; s.state = 'fly';
    burst(x, y, z, '#ffffff', 220, 300, 1.8); burst(x, y, z, '#9fd8ff', 120, 160, 2.4);
    sfx('explosion0', 0.4, 0.5, () => snd(60, 1.0, 'sawtooth', 0.05, 200));
    radio('LEITSTELLE', `Kolonieschiff „${e.name}“ ist aus dem Sprung gefallen. Antrieb läuft an.`, '#9fd8ff');
  }
  // Wellen: Sie zielen auf das Schiff, das zuletzt angekommen und noch unterwegs ist
  const w0 = ch === 'gilde' ? 85 : 60, gap = ch === 'gilde' ? 50 : 42;
  if (B.wave < 6 && B.t > w0 + B.wave * gap) {
    const k = B.wave++, fly = B.ships.filter(s => s.state === 'fly' && s.t), tg = fly.length ? fly[fly.length - 1].t : { x: a[0], y: a[1], z: a[2] };
    let nd = 2 + (k >= 2 ? 1 : 0) + (k >= 4 ? 1 : 0), nb = k >= 3 ? 2 : k >= 1 ? 1 : 0;
    if (ch === 'wacht') {      // zwei fliegen in die Minen
      const cut = Math.min(2, nd - 1); nd -= cut;
      for (let i = 0; i < cut; i++) burst(a[0] + 500 + i * 160, a[1] + 200, a[2] - 700 + i * 120, '#ffb060', 90, 80, 1.2);
      sfx('explosion0', 0.5, 0.9, () => snd(90, 0.5, 'sawtooth', 0.06, -40));
    }
    storyHooks.banner(`DER SCHWARM · WELLE ${k + 1} VON 6`, ch === 'wacht' ? 'Zwei sind in die Minen der Wacht geflogen.' : nb ? 'Der Bomber zielt auf die Schiffe. Halt ihn auf.' : 'Jäger am Ankunftspunkt.', '#ff6b5b');
    const side = k % 2 ? 1 : -1;
    for (let i = 0; i < nd + nb; i++) {
      const e = spawnEnemy(i < nd ? 'drone' : 'bomber', a[0] + side * (500 + i * 110), a[1] + 220 - i * 60, a[2] - 760 + i * 70, tg);
      // Heimstatt hat Gefahr 0; diese hier sind so stark wie an der Grenze (Gefahr 3)
      if (e.type === 'drone') { e.hp = e.maxhp = 85; e.es = { ...e.es, spd: 139, dmgP: 7.9, dmgS: 19 }; } else { e.hp = e.maxhp = 345; e.es = { ...e.es, spd: 82, dmgP: 9, dmgS: 150 }; }
      // Bomber und die ersten beiden Jäger gehen zuerst auf das Schiff, erst danach wählen sie frei (sonst jagen fast alle den Piloten)
      if (fly.length && (i >= nd || i < 2)) { e.target = { ship: tg }; e.rt = i >= nd ? 40 : 18; }
      B.foes.push(e);
    }
  }
  // Schiffe: Schirm des Rats, Ankunft am Ankerplatz, Ausfall
  for (const s of B.ships) {
    if (s.state !== 'fly' || !s.t) continue;
    const t = s.t, slot = rel(SLOTS[s.i]);
    if (ch === 'rat' && d3(t.x, t.y, t.z, b.x, b.y, b.z) < SHIELD) t.hp = Math.max(t.hp, s.hp);
    s.hp = t.hp;
    const arrived = d3(t.x, t.y, t.z, slot[0], slot[1], slot[2]) < 150, dead = t.hp <= 1;
    if (!arrived && !dead) continue;
    const i = world.traffic.indexOf(t); if (i >= 0) world.traffic.splice(i, 1);
    t.alive = false; B.meshes.push(t.mesh);
    for (const gl of t.parts.glows) { gl.visible = !dead; gl.scale.setScalar(2.5 * (gl.userData.base || 1)); }
    s.state = dead ? 'down' : 'home';
    const home = B.ships.filter(q => q.state === 'home').length, down = B.ships.filter(q => q.state === 'down').length;
    if (dead) { burst(t.x, t.y, t.z, '#ffb060', 120, 120, 1.6); radio('LEITSTELLE', `Die „${EIGHT[s.i].name}“ treibt antriebslos. Schlepper kommen erst nach dem Gefecht. ${down} von höchstens 2.`, '#ff6b5b'); snd(120, 0.6, 'sawtooth', 0.06, -60); }
    else { radio('BASTION', `Die „${EIGHT[s.i].name}“ liegt am Ankerplatz. ${home} von 8.`, '#7cc4ff'); snd(660, 0.2, 'sine', 0.05, 200); }
    if (down > 2) {
      resetBattle(); B.failT = 9;
      storyHooks.banner('ZU VIELE SCHIFFE LAHMGELEGT', 'Der Schwarm schleppt sie zurück in den Riss. Neuer Anlauf in wenigen Sekunden.', '#ff6b5b');
      return;
    }
  }
  // gewonnen?
  if (B.ships.every(s => s.state === 'home' || s.state === 'down') && B.wave >= 1 && alive(B.foes) === 0 && (B.wave >= 6 || B.t > 34 * 7 + 80)) {
    d.won = true; d.down = B.ships.filter(s => s.state === 'down').length; B.keep = true; B.on = false; saveGame();
    sfx('confirm', 0.8, 0.6, () => snd(220, 0.9, 'sine', 0.07, 300));
    storyHooks.banner('HEIMSTATT HÄLT', `${8 - d.down} Schiffe am Ankerplatz${d.down ? ` · ${d.down} im Schlepp` : ''}`, '#ffd27a');
    talk(['BRUMMER', 'Bastion an alle. Der Rand ist still. Ich zähle Schiffe am Anker und höre keinen einzigen Ruf mehr.'], ['HOLLWEG', 'Kommt nach Hause. Alle.']);
  }
}

// ---------- Kulissen ----------
const _grey = new THREE.Color();
function char(root: THREE.Object3D, k: number) {      // ausgebrannt und stumpf (wie die Wracks der Narbe)
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
const props = new Map<string, THREE.Object3D>();
function prop(key: string, build: () => THREE.Object3D) { let o = props.get(key); if (!o) { o = build(); scene.add(o); props.set(key, o); } return o; }
function keepOnly(want: Set<string>) { for (const [k, o] of props) if (!want.has(k)) { dropMesh(o); props.delete(k); } }
// Schiff vor Anker: Bug in Flugrichtung (vom Ankunftspunkt her), Triebwerke auf kleiner Flamme
function anchored(type: CivType, k: number, at: number[], from: number[]) {
  const b = buildStoryShip(type, k);
  b.g.position.set(at[0], at[1], at[2]);
  b.g.lookAt(from[0], at[1], from[2]);      // das Heck zeigt dorthin, woher das Schiff kam
  for (const gl of b.glows) gl.scale.setScalar(2.5 * (gl.userData.base || 1));
  return b.g;
}
function buildAnna(dark: boolean) {
  const g = new THREE.Group(), b = buildStoryShip('liner', 2.6);
  if (dark) for (const gl of b.glows) gl.visible = false; else for (const gl of b.glows) gl.scale.setScalar(2.5 * (gl.userData.base || 1));
  g.add(b.g); g.position.set(AN[0], AN[1], AN[2]); g.rotation.set(dark ? 0.12 : 0, 0.5, dark ? -0.08 : 0);
  if (dark) { const s = new THREE.Sprite(glowMat(0x9fd8ff, 0.8)); s.name = 'ruf'; s.scale.setScalar(120); g.add(s); }
  return g;
}
function buildKranich() {
  const R0 = rng(hashStr('narbe-kranich')), R = () => R0.next();
  const g = new THREE.Group(); g.position.set(KR[0], KR[1], KR[2]);
  // zwei Rumpfhälften, gegeneinander verdreht
  for (const s of [-1, 1]) { const b = buildStoryShip('freighter', 2.6); char(b.g, 0.2); b.g.position.set(0, s * 14, s * 46); b.g.rotation.set(0.3 * s, 0.9 + 0.25 * s, -0.2 + 0.3 * s); g.add(b.g); }
  const dark = new THREE.MeshStandardMaterial({ color: 0x1c1e22, metalness: 0.7, roughness: 0.6 }), fm = new THREE.MeshStandardMaterial({ color: 0x1a1226, metalness: 0.55, roughness: 0.28, emissive: 0x6a30c0, emissiveIntensity: 0.5, flatShading: true }), geo = new THREE.OctahedronGeometry(1, 0);
  for (let i = 0; i < 34; i++) {      // lose Platten und Spanten
    const p = new THREE.Mesh(new THREE.BoxGeometry(4 + R() * 18, 0.4 + R() * 1.4, 3 + R() * 12), dark), a = R() * 6.28, r = 120 + R() * 320;
    p.position.set(Math.cos(a) * r, (R() - 0.5) * 200, Math.sin(a) * r); p.rotation.set(R() * 3, R() * 3, R() * 3); g.add(p);
  }
  for (let i = 0; i < 12; i++) {      // erstes Ferrit, dort wo der Schwarm schon gegriffen hat
    const cl = new THREE.Group(), a = R() * 6.28; cl.position.set(Math.cos(a) * 52, Math.sin(a) * 52, (R() - 0.5) * 180); cl.rotation.set(R() * 3, R() * 3, R() * 3);
    for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(geo, fm), h = 3 + R() * 7; c.scale.set(0.8 + R(), h, 0.8 + R()); c.position.set((R() - 0.5) * 5, h * 0.5, (R() - 0.5) * 5); c.rotation.set(R() - 0.5, R() * 6, R() - 0.5); cl.add(c); }
    g.add(cl);
  }
  const lamp = new THREE.Sprite(glowMat(0xff7a40, 0.8)); lamp.name = 'lampe'; lamp.scale.setScalar(22); lamp.position.set(70, 12, 20); g.add(lamp);
  return g;
}
function buildShield() {
  const b = bastion()!;
  const m = new THREE.Mesh(new THREE.SphereGeometry(SHIELD, 48, 24), new THREE.MeshBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false, fog: false }));
  m.position.set(b.x, b.y, b.z); m.frustumCulled = false; return m;
}
function buildRift() {
  const a = rel(AP), g = new THREE.Group(); g.position.set(a[0], a[1], a[2]);
  const s = new THREE.Sprite(glowMat(0x9fd8ff, 0.7)); s.name = 'riss'; s.scale.setScalar(260); g.add(s);
  return g;
}

// pro Bild: Fristen, Kulissen, der Jäger der Sirius nach dem Kapitel
let patrolT = 0;
export function updateChapter5(dt: number) {
  const v = step();
  if (!P.story || v === undefined) { if (props.size) keepOnly(new Set()); if (B.on || B.meshes.length) resetBattle(); return; }
  const n = typeof v === 'number' ? v : 99, done = v === 'done', d = c5();
  // Wrack oder Schiff verlassen: Die Schleuse führt erst wieder hinein, wenn man sich entfernt hat
  trackDun();
  const want = new Set<string>();
  // Die Anna im Lichtwall: von der Ankunft bis zum Ende des Kapitels (danach liegt sie bei der Bastion)
  if (inSpace(LICHT) && !done && d.anna) {
    const key = d.core ? 'anna-hell' : 'anna-dunkel'; want.add(key);
    const o = prop(key, () => buildAnna(!d.core)), ruf = o.getObjectByName('ruf');
    if (ruf) ruf.scale.setScalar(110 + Math.sin(G.time * 7) * 26 + (Math.random() < 0.06 ? 40 : 0));
  }
  // Der Kranich in der Narbe: ab Schritt 5, bleibt für immer liegen
  if (inSpace(NARBE) && (done || n >= 5)) {
    want.add('kranich');
    const o = prop('kranich', buildKranich), lamp = o.getObjectByName('lampe');
    o.rotation.y += dt * 0.003;
    if (lamp) { lamp.visible = !done && !d.kern; lamp.scale.setScalar(20 + Math.sin(G.time * 5) * 4 + (Math.random() < 0.05 ? 9 : 0)); }
  }
  if (inSpace(HOME) && bastion()) {
    const a = rel(AP);
    // Schirm des Rats und der Riss am Ankunftspunkt (Schritte 9 und 10)
    if (!done && (n === 9 || n === 10) && !d.won) {
      want.add('riss');
      const r = prop('riss', buildRift).getObjectByName('riss');
      if (r) r.scale.setScalar((B.on ? 300 : 180) + Math.sin(G.time * 3) * 40);
      if (choice() === 'rat') { want.add('schirm'); prop('schirm', buildShield); }
    }
    // Die Flotte vor Anker: nach der Schlacht die acht, nach dem Kapitel auch die Anna. Direkt nach der Schlacht liegen noch die Schiffe selbst dort.
    if ((d.won || done) && !B.keep) EIGHT.forEach((e, i) => { want.add('f' + i); prop('f' + i, () => anchored(e.type, e.k, rel(SLOTS[i]), a)); });
    if (done) { want.add('f8'); prop('f8', () => anchored('liner', 2.6, rel(SLOTS[8]), a)); }
    // Nach dem Kapitel: ein Jäger der Sirius fliegt in Heimstatt Patrouille (kommt nach einem Verlust nach einer Minute wieder)
    if (done && !SHARED.client && G.mode === 'play') {
      patrolT -= dt;
      if (patrolT <= 0 && !world.allies.some(q => q.alive && q.name === 'SIRIUS EINS')) {
        patrolT = 60;
        const b = bastion()!; spawnStoryAlly('SIRIUS EINS', 0x9fd8ff, '#9fd8ff', b.launch.x + 60, b.launch.y + 40, b.launch.z + 60, b, 200);
      }
    }
  } else if (B.keep || B.meshes.length) { if (!B.on) { for (const m of B.meshes) dropMesh(m); B.meshes = []; B.keep = false; } }
  keepOnly(want);
}
