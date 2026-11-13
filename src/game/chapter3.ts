import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { d3, rng, hashStr } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy } from './combat';
import { SHARED } from './shared';
import { IN, storyNpc, nearNpc, hangarSpot } from './interior';
import { addRep } from './reputation';
import { closeMenu } from '../ui/dock';
import { talk, playScene, registerChain, st, endChain, storyCtx, storyHooks, dialogBusy, startChain, type Step, type Obj, type Marker } from './story';
import { CITY, cityWorld } from './city';
import { footTargets } from './onfoot';
import { charInstance, animInit, animStep, animTalk, hasChar } from '../models/charModels';
import { probeLit, kitMeta } from '../models/kit';
import { buildCarrierModel } from '../models/stationModels';
import { buildShipModel } from '../models/playerShips';
import type { ShipId } from '../data/ships';
import { DUN, enterDungeon, dunHooks, type DungeonEntrance } from './dungeon';
import { planetBaseId } from '../data/planets';

// =====================================================================================
// Kapitel 3: „Die Wahrheit über die Narbe“ (siehe docs/story.md)
// Die Karte im Archivkristall zeigt in die Narbe. Der Rat verbietet den Flug. Roth (Wachtposten Ost) erzählt die Heldenfassung und nennt einen
// Zeugen: Ilvar Brandt, damals Funker der „Eidwacht“, heute an der Garküche in Neonhafen. Achterberg weicht aus und schickt den Piloten zum
// Schmelzwerk Zwölf (Signaldämpfer aus vier Kupferbarren). In der Narbe drei Wracks scannen, das Trägerschiff „Eidwacht“ zu Fuß betreten
// (Dungeon-Art „Wrack“), den Flugschreiber von der Brücke holen, aus der Narbe entkommen. Der Schreiber geht zur Grenzwacht oder zum Rat.
// Die Aufnahme: Maren Hollweg befahl, die Linie am Tor der Erbauer zu halten; Achterberg verweigerte und holte 400 Menschen heraus.
// Die Tore rufen die Ferrox. Und: Vor vier Monaten zog die „Weitsicht“ durch die Narbe, Richtung Kern.
// =====================================================================================
const SEC = 'narbe', CITYSEC = 'neuhafen', WERKSEC = 'kupferbucht', BARS = 4;
const T = 'Kapitel 3 · Die Wahrheit über die Narbe';
const FIELD = [-600, 200, -2400];                                    // Mitte des Wrackfelds (Lage der Eidwacht)
const WRECKS: { off: number[]; cls: ShipId; k: number; name: string }[] = [
  { off: [-760, 90, 380], cls: 'kaerrner', k: 2.2, name: 'WRACK · KENNUNG UNBEKANNT' },
  { off: [620, -110, 560], cls: 'habicht', k: 2.6, name: 'WRACK · KENNUNG UNBEKANNT' },
];
const BREACH = [150, 30, 40];                                        // Bresche an der Flanke, relativ zur Feldmitte (Näherung; buildField misst sie am Rumpf)
const WRECK_ID = 'narbe:eidwacht';
type C3 = { roth?: boolean; acht?: boolean; brandt?: boolean; damp?: boolean; pi?: number; foes?: boolean; rec?: boolean; out?: boolean; choice?: 'wacht' | 'rat' };
const c3 = () => ((st() as any).c3 = (st() as any).c3 || {}) as C3;
const step = () => (P.story ? (st() as any).ch3 as number | 'done' : undefined);      // im Hauptmenü gibt es noch keinen Spielstand
const inSpace = (id: string) => !!world.def && world.def.id === id && !world.surface;
const docked = (id: string) => !!G.dockedAt && G.dockedAt.id === id;
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
const route = (to: string) => { if (P.sector !== to) P.route = to; };
const lineSpace = (id: string, name: string): Obj => [`Springe nach <b>${name}</b>${P.route === id ? ' · Route gesetzt (Karte: M)' : ''}`, false, false];
const pts = () => [...WRECKS.map(w => [FIELD[0] + w.off[0], FIELD[1] + w.off[1], FIELD[2] + w.off[2]]), FIELD];
const breach = () => [FIELD[0] + BREACH[0], FIELD[1] + BREACH[1], FIELD[2] + BREACH[2]];
const inCity = () => !!world.surface && CITY.name === 'Neonhafen' && !!CITY.st;
const S = { foes: [] as any[], met: false, scene: false, away: true };
// Der Landeablauf im Hangar ist vorbei (zu Fuß oder im Stationsmenü). Beim Andocken selbst läuft noch die Landung; Figuren, die dann
// „vor den Piloten“ gestellt würden, stünden am Platz des Schiffs statt im Gang.
const settled = () => G.mode === 'walk' || G.mode === 'dock';

const ENTRANCE: DungeonEntrance = {
  id: WRECK_ID, x: 0, y: 0, z: 0, yaw: 0, size: 7, name: 'Wrack der Eidwacht', kind: 'wrack', danger: 2,      // eine Stufe unter dem Sektor: Die Geschichte soll auch mit einfacher Ausrüstung zu schaffen sein
  goal: {
    label: 'Flugschreiber bergen', got: () => !!c3().rec,
    take: () => {
      c3().rec = true; saveGame();
      talk(['MAREN', 'Eidwacht an alle Staffeln. Linie halten. Das Tor darf nicht fallen. Ich wiederhole: Linie halten.'],
        ['BRUMMER', 'Ich hab ihn. Der Schreiber sendet noch, nach sieben Jahren. Raus da, Pilot.']);
    },
  },
};

const STEPS: Step[] = [
  { // 0: Die Karte zeigt in die Narbe
    title: T,
    enter: () => {
      const lines = () => {
        talk(['BRUMMER', 'Bastion an Pilot. Der Kristall ist gelesen. Die Karte endet nicht auf Schlacke Prime. Sie zeigt nach Osten, mitten in die Narbe.'],
          ['HOLLWEG', 'Niemand fliegt in die Narbe. Das ist seit sieben Jahren Beschluss des Rats, und er gilt auch für dich.'],
          ['ROTH', 'Roth an Pilot. Komm zum Wachtposten Ost. Es wird Zeit, dass jemand die richtigen Fragen stellt.']);
        route('wacht');
      };
      if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'dock') playScene([{ text: 'KAPITEL 3', big: true, t: 2.4 }, { text: 'Die Wahrheit über die Narbe', big: true, t: 3 }], lines);
      else lines();
    },
    lines: () => [lineSpace('wacht', 'Wachtposten Ost')],
    done: () => inSpace('wacht'),
  },
  { // 1: Wachtposten Ost anfliegen
    title: T,
    enter: () => talk(['ROTH', 'Wachtposten Ost an Pilot. Dock an. Ich warte im Gang.']),
    lines: () => [inSpace('wacht') ? ['Am <b>Wachtposten Ost</b> andocken · E', false, false] : lineSpace('wacht', 'Wachtposten Ost')],
    done: () => docked('wachtposten'),
    markers: () => { const s = world.stations.find(x => x.id === 'wachtposten'); return s && inSpace('wacht') ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'WACHTPOSTEN OST · ANDOCKEN', col: '#f2d36b', big: true }] : []; },
  },
  { // 2: Roth erzählt die Fassung, die jeder kennt
    title: 'Kapitel 3 · Was jeder weiß',
    enter: () => { S.met = false; },
    // Roth wartet im Hangar. Sie erzählt erst, wenn der Pilot ausgestiegen, zu ihr gelaufen ist und sie anspricht.
    tick: () => {
      if (!IN.active) { S.met = false; return; }      // wieder abgelegt: beim nächsten Andocken steht sie neu da
      if (S.met || !settled() || IN.ship || !docked('wachtposten')) return;
      S.met = storyNpc('Roth', 'Grenzwacht', 'Mit Wachtmeisterin Roth sprechen', () => {
        if (c3().roth) { if (!dialogBusy()) talk(['ROTH', 'Neonhafen, die Garküche Schleusenbräu. Frag nach Ilvar Brandt.']); return; }
        c3().roth = true;
        talk(['ROTH', 'Jahr einunddreißig. Wir hatten die Ferrox zurückgedrängt bis in die Narbe. Kommandantin Hollweg führte selbst, von der Eidwacht aus. Dem einzigen Träger, den wir je selbst gebaut haben.'],
          ['ROTH', 'Dann kamen sie von allen Seiten. Die Linie brach, die Eidwacht blieb zurück. So steht es in jedem Schulbuch, und so hab ich es mit sechzehn geglaubt.'],
          ['ROTH', 'Aber die, die dabei waren, reden nicht. Einer steht in Neonhafen an der Garküche Schleusenbräu. Ilvar Brandt, damals Funker der Eidwacht. Frag ihn.']);
        route(CITYSEC); saveGame();
      }, '#f2d36b', hangarSpot(-7), { model: 'merchant', tint: [0.6, 0.85, 0.55] });
    },
    lines: () => {
      if (!c3().roth && !(IN.active && docked('wachtposten'))) return [inSpace('wacht') ? ['Am <b>Wachtposten Ost</b> andocken · E', false, false] : lineSpace('wacht', 'Wachtposten Ost')];
      return [['Aussteigen und zu <b>Wachtmeisterin Roth</b> gehen', !!c3().roth || nearNpc('Roth'), false], ['Mit Roth sprechen · <b>E</b>', !!c3().roth, false], ['Ablegen und nach <b>Neuhafen</b> fliegen', false, false]];
    },
    done: () => !!c3().roth && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
    markers: () => { const s = world.stations.find(x => x.id === 'wachtposten'); return s && inSpace('wacht') && !c3().roth ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'WACHTPOSTEN OST · ANDOCKEN', col: '#f2d36b', big: true }] : []; },
  },
  { // 3: Brandt in Neonhafen
    title: 'Kapitel 3 · Der Funker',
    enter: () => { route(CITYSEC); },
    lines: () => {
      if (inCity()) { const p = brandtWorld(); return [['In <b>Neonhafen</b> gelandet', true, false], [`Zu Fuß zur Garküche „Schleusenbräu“${p && CITY.walk ? '' : ' · aus dem Hangar auf den Platz'}`, false, false], ['Mit <b>Ilvar Brandt</b> sprechen · E', !!c3().brandt, false]]; }
      return [P.sector === CITYSEC ? ['Auf <b>Neuhafen IV</b> landen und in die Stadt Neonhafen fliegen', false, false] : lineSpace(CITYSEC, 'Neuhafen')];
    },
    tick: () => {
      if (!inCity()) return;
      const p = talkSpot(); if (!p) return;
      if (!footTargets.some(t => t.label === 'Mit Ilvar Brandt sprechen')) footTargets.push({ x: p.x, z: p.z, r: 3.8, label: 'Mit Ilvar Brandt sprechen', act: () => {
        if (c3().brandt) return;
        c3().brandt = true; footTargets.length = 0; if (brandt) animTalk(brandt.c.anim, 22);
        talk(['BRANDT', 'Roth schickt dich? Dann setz dich nicht, es dauert nicht lang.'],
          ['BRANDT', 'Ich saß am Funk der Eidwacht. Ich hab jeden Befehl dieses Tages gehört, und einen davon werd ich nicht mehr los.'],
          ['BRANDT', 'Was wirklich war, steht im Flugschreiber. Der sitzt noch auf der Brücke, im Wrack. Niemand hat ihn je geholt, weil niemand ihn hören wollte.'],
          ['BRANDT', 'Und wenn du wissen willst, wer damals Nein gesagt hat: Frag deine Ausbilderin.']);
        saveGame();
      } });
    },
    done: () => !!c3().brandt && !dialogBusy(),      // erst weiter, wenn Brandt ausgeredet hat (ein neuer Schritt verwirft offene Zeilen)
    markers: () => { const p = inCity() ? brandtWorld() : null; return p ? [{ x: p.x, y: p.y + 2.6, z: p.z, label: 'ILVAR BRANDT', col: '#e8a0c0', big: true }] : []; },
  },
  { // 4: zur Bastion
    title: 'Kapitel 3 · Die Ausbilderin',
    enter: () => { footTargets.length = 0; route('heimstatt'); },
    lines: () => [inSpace('heimstatt') ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace('heimstatt', 'Heimstatt'), ['Mit <b>Hauptfrau Achterberg</b> sprechen', false, true]],
    done: () => docked('bastion'),
    markers: () => { const b = world.stations.find(s => s.id === 'bastion'); return b && inSpace('heimstatt') ? [{ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
  { // 5: Achterberg weicht aus
    title: 'Kapitel 3 · Die Ausbilderin',
    enter: () => { S.met = false; },
    // Achterberg wartet im Hangar der Bastion. Sie redet erst, wenn der Pilot ausgestiegen, zu ihr gelaufen ist und sie anspricht.
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || !settled() || IN.ship || !docked('bastion')) return;
      S.met = storyNpc('Achterberg', 'Ausbildung', 'Mit Hauptfrau Achterberg sprechen', () => {
        if (c3().acht) { if (!dialogBusy()) talk(['ACHTERBERG', 'Vier Kupferbarren, Schmelzwerk Zwölf. Dann die Narbe.']); return; }
        c3().acht = true;
        talk(['ACHTERBERG', 'Brandt redet also wieder. Hätte ich mir denken können.'],
          ['ACHTERBERG', 'Ich erzähl dir nichts, Pilot. Nicht weil ich mich schäme. Du sollst nicht mir glauben, sondern dem Schreiber.'],
          ['ACHTERBERG', 'In der Narbe frisst der Schwarm alles, was sendet. Lass dir am Schmelzwerk Zwölf einen Signaldämpfer wickeln. Vier Kupferbarren, die Leute dort wissen Bescheid.'],
          ['ACHTERBERG', 'Hol den Schreiber. Dann reden wir.']);
        route(WERKSEC); saveGame();
      }, '#ffb347', hangarSpot(-7), { model: 'achterberg' });
    },
    lines: () => {
      if (!c3().acht && !(IN.active && docked('bastion'))) return [inSpace('heimstatt') ? ['An der <b>Bastion</b> andocken · E', false, false] : lineSpace('heimstatt', 'Heimstatt')];
      return [['Aussteigen und zu <b>Hauptfrau Achterberg</b> gehen', !!c3().acht || nearNpc('Achterberg'), false], ['Mit Achterberg sprechen · <b>E</b>', !!c3().acht, false], ['Ablegen', false, false]];
    },
    done: () => !!c3().acht && G.mode === 'play' && !G.dockedAt && !dialogBusy(),
    markers: () => { const b = world.stations.find(x => x.id === 'bastion'); return b && inSpace('heimstatt') && !c3().acht ? [{ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
  { // 6: Signaldämpfer am Schmelzwerk Zwölf
    title: 'Kapitel 3 · Der Signaldämpfer',
    enter: () => { route(WERKSEC); },
    lines: () => {
      const n = Math.min(BARS, P.cargo.kupferb || 0);
      return [[`<b>${BARS} Kupferbarren</b> im Frachtraum · ${n}/${BARS}`, n >= BARS, false], ['Kaufen oder aus Kupfererz raffinieren (am Schmelzwerk: 3 Erz → 2 Barren)', false, true],
        [world.surface && P.sector === WERKSEC ? 'Im <b>Schmelzwerk Zwölf</b> andocken (Landefeld, dann zur Tür)' : P.sector === WERKSEC ? 'Auf dem Mond <b>Brocken</b> landen' : `Nach <b>Kupferbucht</b> zum Schmelzwerk Zwölf${P.route === WERKSEC ? ' · Route gesetzt' : ''}`, false, false]];
    },
    tick: () => {
      if (c3().damp || !docked(planetBaseId(WERKSEC)) || (P.cargo.kupferb || 0) < BARS) return;
      P.cargo.kupferb -= BARS; c3().damp = true; saveGame();
      sfx('confirm', 0.6, 1, () => snd(700, 0.2, 'sine', 0.05, 200));
      talk(['WERK', 'Schmelzwerk Zwölf. Vier Barren, eine Spule, keine Fragen. Achterberg hat angerufen.'],
        ['WERK', 'Der Dämpfer sitzt. Solange du nicht scannst, bist du für den Schwarm ein Stück Schrott. Viel Glück da draußen.']);
      storyHooks.banner('SIGNALDÄMPFER EINGEBAUT', 'Vier Kupferbarren verbraucht · Kurs: Die Narbe', '#ffb347');
    },
    done: () => !!c3().damp && !dialogBusy(),
  },
  { // 7: in die Narbe
    title: 'Kapitel 3 · In die Narbe',
    enter: () => { route(SEC); },
    lines: () => [lineSpace(SEC, 'Die Narbe'), ['Der Weg führt über Wachtposten Ost und die Grauzone', false, true]],
    done: () => inSpace(SEC),
  },
  { // 8: drei Wracks scannen, das dritte ist die Eidwacht
    title: 'Kapitel 3 · Das Wrackfeld',
    enter: () => talk(['ROTH', 'Du bist drin. Vor dir liegt, was von der Linie übrig ist. Die Eidwacht ist das größte Wrack, aber von hier sieht jedes nach ihr aus. Scann die Kennungen.']),
    lines: () => {
      if (!inSpace(SEC)) return [lineSpace(SEC, 'Die Narbe')];
      const pi = c3().pi || 0, p = pts();
      const L: Obj[] = p.map((q, i) => [`Wrack ${i + 1}${i === pi ? ` · <b>${fmtDist(d3(q[0], q[1], q[2], P.x, P.y, P.z))}</b>` : ''}`, i < pi, false] as Obj);
      L.push(['Am Wrack die Kennung scannen · <b>R</b>', false, true]);
      return L;
    },
    tick: () => {
      if (!inSpace(SEC)) return;
      const d = c3(), pi = d.pi || 0, p = pts()[pi];
      if (!p || d3(p[0], p[1], p[2], P.x, P.y, P.z) > (pi === 2 ? 520 : 300) || storyCtx.scanAt < G.time - 2) return;
      d.pi = pi + 1; storyCtx.scanAt = -99;
      burst(p[0], p[1], p[2], '#ffb060', 40, 60, 1.0);
      snd(660, 0.15, 'sine', 0.05, 500); setTimeout(() => snd(990, 0.2, 'sine', 0.04, -200), 150);
      if (d.pi === 1) talk(['BRUMMER', 'Kennung gelesen: Frachter Morgenrot. Nicht die Eidwacht. Weiter.']);
      if (d.pi === 2) {
        talk(['BRUMMER', 'Jäger der vierten Staffel. Achterbergs Staffel. Und Pilot: Der Scan hat sie geweckt. Ferrox im Anflug.']);
        if (!SHARED.client && !d.foes) { d.foes = true; S.foes = [0, 1, 2].map(i => spawnEnemy('drone', p[0] + (i - 1) * 140, p[1] + 60, p[2] + 260)); }
      }
      if (d.pi === 3) talk(['BRUMMER', 'Das ist sie. Trägerschiff Eidwacht. An der Flanke klafft eine Bresche, da kommst du rein.']);
      saveGame();
    },
    done: () => (c3().pi || 0) >= 3 && !dialogBusy(),
    markers: () => { if (!inSpace(SEC)) return []; const pi = c3().pi || 0, p = pts()[pi]; return p ? [{ x: p[0], y: p[1], z: p[2], label: `WRACK ${pi + 1} · KENNUNG SCANNEN`, col: '#ffb060', big: true }] : []; },
  },
  { // 9: an der Bresche anlegen und das Wrack betreten
    title: 'Kapitel 3 · Die Eidwacht',
    enter: () => {},
    lines: () => {
      if (!inSpace(SEC)) return [lineSpace(SEC, 'Die Narbe')];
      const b = breach(), v = Math.hypot(P.vx, P.vy, P.vz);
      return [[`Zur Bresche der Eidwacht · <b>${fmtDist(d3(b[0], b[1], b[2], P.x, P.y, P.z))}</b>`, false, false], [`Langsam heran (unter 60 m/s)${v > 60 ? ` · jetzt <b>${Math.round(v)}</b>` : ''}`, false, true], ['Das Wrack betrittst du zu Fuß', false, true]];
    },
    tick: () => {
      if (!inSpace(SEC) || G.mode !== 'play' || DUN.active) return;
      const b = breach();
      if (d3(b[0], b[1], b[2], P.x, P.y, P.z) > 130 || Math.hypot(P.vx, P.vy, P.vz) > 60) return;
      P.vx = P.vy = P.vz = 0;
      enterDungeon(ENTRANCE);
    },
    done: () => DUN.active && DUN.e?.id === WRECK_ID,
    markers: () => { if (!inSpace(SEC)) return []; const b = breach(); return [{ x: b[0], y: b[1], z: b[2], label: 'BRESCHE · LANGSAM ANLEGEN', col: '#ffb060', big: true }]; },
  },
  { // 10: im Wrack: Schalter, Wächterkern, Flugschreiber
    title: 'Kapitel 3 · Die Brücke',
    enter: () => { if (DUN.active) talk(['ROTH', 'Du gehst allein rein. Leg die Notstromschalter um, dann fährt das Schott zur Brücke auf. Und rechne mit Wächtern.']); },
    lines: () => {
      if (!DUN.active) return [[S.away ? 'Zurück zur Bresche der <b>Eidwacht</b>' : 'Erst von der Bresche wegfliegen (260 m), dann wieder langsam heran', false, false], ['Der Flugschreiber liegt noch auf der Brücke', false, true]];
      const left = DUN.sws.filter(q => !q.on).length, boss = DUN.foes.some(f => f.boss);
      return [[`Notstromschalter umlegen${left ? ` · <b>${left}</b> übrig` : ''}`, left === 0, false], ['Den Wächterkern auf der Brücke zerstören', !boss, false], ['Flugschreiber bergen · <b>E</b>', !!c3().rec, false]];
    },
    tick: () => {
      // wer das Wrack ohne Schreiber verlässt (oder zusammenbricht), kann an der Bresche wieder hinein
      if (DUN.active || !inSpace(SEC) || G.mode !== 'play') return;
      const b = breach();
      const dist = d3(b[0], b[1], b[2], P.x, P.y, P.z);
      if (dist > 260) S.away = true;
      if (S.away && dist < 130 && Math.hypot(P.vx, P.vy, P.vz) < 60) { P.vx = P.vy = P.vz = 0; enterDungeon(ENTRANCE); }
    },
    done: () => !!c3().rec && !dialogBusy(),
    markers: () => { if (DUN.active || !inSpace(SEC)) return []; const b = breach(); return [{ x: b[0], y: b[1], z: b[2], label: 'BRESCHE · LANGSAM ANLEGEN', col: '#ffb060', big: true }]; },
  },
  { // 11: zurück zum Schiff und raus aus der Narbe
    title: 'Kapitel 3 · Raus hier',
    enter: () => {},
    lines: () => [DUN.active ? ['Zurück zur Schleuse und ins Schiff · <b>E</b>', false, false] : ['Zurück im Schiff', true, false], ['Aus der Narbe springen (J im Marschflug oder durchs Tor)', P.sector !== SEC, false]],
    tick: () => {
      if (DUN.active || c3().out || !inSpace(SEC)) return;
      c3().out = true; saveGame();
      talk(['ROTH', 'Sie kommen aus dem Kristallbruch, ein ganzer Zug. Spring, Pilot, spring!']);
      if (!SHARED.client) { const b = breach(); S.foes = [0, 1, 2, 3].map(i => spawnEnemy(i === 3 ? 'bomber' : 'drone', b[0] + 900 + i * 160, b[1] + 120 - i * 50, b[2] - 700)); }
    },
    done: () => !DUN.active && P.sector !== SEC,
  },
  { // 12: Grenzwacht oder Rat?
    title: 'Kapitel 3 · Wer darf es hören?',
    enter: () => {
      talk(['ROTH', 'Bring den Schreiber zum Wachtposten Ost. Die Wacht hat ein Recht darauf zu hören, wofür sie gestorben ist.'],
        ['HOLLWEG', 'Pilot. Bring ihn zur Bastion. Bitte. Manche Wahrheiten muss man erst selbst gehört haben, bevor man sie allen zumutet.']);
    },
    lines: () => [['Zum <b>Wachtposten Ost</b> (Grenzwacht) <i>oder</i> zur <b>Bastion</b> (Rat) bringen', false, false], ['Wo du andockst, dort wird die Aufnahme abgespielt', false, true]],
    done: () => { if (docked('wachtposten')) { c3().choice = 'wacht'; return true; } if (docked('bastion')) { c3().choice = 'rat'; return true; } return false; },
    markers: () => {
      const L: Marker[] = [], w = world.stations.find(s => s.id === 'wachtposten'), b = world.stations.find(s => s.id === 'bastion');
      if (w) L.push({ x: w.dock.x, y: w.dock.y, z: w.dock.z, label: 'WACHTPOSTEN OST · GRENZWACHT', col: '#f2d36b', big: true });
      if (b) L.push({ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · RAT', col: '#bcd8ff', big: true });
      return L;
    },
  },
  { // 13: die Aufnahme
    title: 'Kapitel 3 · Die Aufnahme',
    enter: () => { S.met = false; S.scene = false; },
    // Die Runde wartet im Hangar der gewählten Station. Die Aufnahme läuft erst, wenn der Pilot zu ihr läuft und den Schreiber übergibt.
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      const wacht = c3().choice === 'wacht';
      if (S.met || S.scene || !settled() || IN.ship || !docked(wacht ? 'wachtposten' : 'bastion')) return;
      const { x: hx, z: hz } = hangarSpot(-4), say = 'Den Flugschreiber übergeben';
      const go = () => { if (S.scene) return; S.scene = true; IN.yaw = Math.atan2(-(hx - IN.x), -(hz - IN.z)); IN.pitch = 0; aufnahme(wacht); };
      S.met = storyNpc('Achterberg', 'Ausbildung', say, go, '#ffb347', { x: hx, z: hz }, { model: 'achterberg' });
      if (wacht) storyNpc('Roth', 'Grenzwacht', say, go, '#f2d36b', { x: hx + 2.6, z: hz + 1.2 }, { model: 'merchant', tint: [0.6, 0.85, 0.55] });
      else storyNpc('Hollweg', 'Flottenrat', say, go, '#bcd8ff', { x: hx + 2.6, z: hz + 1.2 }, { model: 'worker', tint: [0.72, 0.8, 1.05] });
    },
    lines: () => {
      const wacht = c3().choice === 'wacht';
      if (!(IN.active && docked(wacht ? 'wachtposten' : 'bastion'))) return [[`${wacht ? 'Am <b>Wachtposten Ost</b>' : 'An der <b>Bastion</b>'} andocken · E`, false, false]];
      return [['Aussteigen und zu <b>Hauptfrau Achterberg</b> gehen', S.scene || nearNpc('Achterberg'), false], ['Den Flugschreiber übergeben · <b>E</b>', S.scene, false]];
    },
    done: () => false,
    markers: () => { const s = world.stations.find(x => x.id === (c3().choice === 'wacht' ? 'wachtposten' : 'bastion')); return s ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'ANDOCKEN', col: '#ffd27a', big: true }] : []; },
  },
];
function aufnahme(wacht: boolean) {
  if (G.mode === 'dock' && G.inside) closeMenu();
  playScene([
    { text: 'Flugschreiber der Eidwacht · Jahr 31', big: true, t: 3.2 },
    { who: 'MAREN', text: 'Eidwacht an alle Staffeln. Das Tor läuft an. Linie halten, bis es steht.' },
    { who: 'ACHTERBERG31', text: 'Staffel Vier an Eidwacht. Der Schwarm kommt von allen Seiten. Die Transporter liegen offen. Vierhundert Leute, Kommandantin.' },
    { who: 'MAREN', text: 'Die Linie hält, Hauptfrau. Das ist ein Befehl.' },
    { who: 'ACHTERBERG31', text: 'Dann ist es einer, den ich nicht befolge. Staffel Vier bricht aus. Wir holen die Transporter. Keiner wird zurückgelassen.' },
    { text: 'Die Linie fiel in elf Minuten. Das Tor wurde gefressen. Vierhundert Menschen kamen nach Hause.', t: 6 },
    { who: 'ACHTERBERG', text: 'Jetzt weißt du es. Ich habe den Eid gehalten und die Kommandantin verraten. Beides stimmt.' },
    { who: 'HOLLWEG', text: 'Zwei Jahre später hat meine Mutter zu mir gesagt: Sie hatte recht, Bendix. Sag es ihr nie. Ich habe mich daran gehalten. Bis heute.' },
    { who: 'ROTH', text: 'Wir wollten zurück in die Narbe, um ein Tor zu holen, das es nicht mehr gibt?' },
    wacht ? { who: 'ROTH', text: 'Die Wacht hört das heute Abend, Ratsherr. Alle.' } : { who: 'HOLLWEG', text: 'Das bleibt in diesem Raum, bis ich weiß, wie ich es der Crew sage.' },
    { who: 'KRULL', text: 'Seht auf die Zeitmarken. Das Tor läuft an, neunzig Sekunden später ist der Schwarm da. Wie im Sonnenfeld. Die Tore rufen sie.' },
    { who: 'BRUMMER', text: 'Da ist noch etwas. Der Schreiber hat nie aufgehört mitzuhören. Sieben Jahre lang.' },
    { who: 'BRUMMER', text: 'Vor vier Monaten zog eine Kennung durch die Narbe. Nach Osten. WS null sieben.', t: 5 },
    { text: 'Die Weitsicht ist nicht gestrandet. Sie fliegt. Richtung Kern.', big: true, t: 5 },
    { text: 'KAPITEL 3 ABGESCHLOSSEN', big: true, t: 3.5 },
  ], finish);
}
// Schritte 2 und 5 bleiben beim Laden stehen, solange das Gespräch noch aussteht (sie führen selbst zurück zur Station)
registerChain({ key: 'ch3', steps: STEPS, resume: n => (n === 2 ? (c3().roth ? 3 : 2) : n === 5 ? (c3().acht ? 6 : 5) : n === 10 ? 9 : n === 13 ? 12 : n) });

function finish() {
  endChain('ch3');
  const wacht = c3().choice === 'wacht';
  P.credits += 3500;
  if (wacht) { addRep('wacht', 60); addRep('rat', -15); } else { addRep('rat', 60); addRep('wacht', -15); }
  addRep('gilde', 10);
  storyHooks.banner('KAPITEL 3 ABGESCHLOSSEN', `+3.500 Credits · ${wacht ? 'Grenzwacht' : 'Flottenrat'} dankt dir`, '#ffd27a');
  snd(523, 0.3, 'triangle', 0.06, 0); setTimeout(() => snd(659, 0.3, 'triangle', 0.06, 0), 200); setTimeout(() => snd(784, 0.5, 'triangle', 0.06, 0), 400);
  saveGame();
  startChain('ch4', 30000);
}

// Nach dem Verlassen des Wracks führt die Bresche erst wieder hinein, wenn man sich entfernt hat. Wer im Wrack zusammenbricht, erfährt, wo er ist.
dunHooks.left = (died, id) => {
  if (id !== WRECK_ID) return;
  S.away = false;
  if (died) storyHooks.banner('ZURÜCK IM SCHIFF', 'Du bist im Wrack zusammengebrochen. Die Wächter stehen wieder; umgelegte Schalter bleiben.', '#ff6b5b');
};

// ---------- Ilvar Brandt an der Garküche in Neonhafen ----------
let brandt: { c: ReturnType<typeof charInstance>; lc: THREE.Color; at: THREE.Object3D } | null = null;
const BRANDT_OFF = [3.4, 2.6];                                       // neben dem Tresen (Stadtkoordinaten x, z relativ zur Garküche)
function brandtLocal(): [number, number] | null {
  const bar = (kitMeta('Neonhafen') as any).bar as [number, number] | undefined;      // Lage der Garküche aus den Angaben der Stadt
  return bar ? [bar[0] + BRANDT_OFF[0], bar[1] + BRANDT_OFF[1]] : null;
}
// Ansprechpunkt: der Tresen selbst, etwas weiter gefasst als das Ziel der Garküche. Brandt steht dahinter; vom Platz aus kommt man nur bis an den Tresen.
function talkSpot() { const l = CITY.st ? brandtLocal() : null; return l && CITY.st ? cityWorld(CITY.st, l[0] - BRANDT_OFF[0], 0.18, l[1] - BRANDT_OFF[1]) : null; }
function brandtWorld() { const l = CITY.st ? brandtLocal() : null; return l && CITY.st ? cityWorld(CITY.st, l[0], 0.18, l[1]) : null; }
function updateBrandt(dt: number) {
  const v = step(), want = inCity() && (typeof v === 'number' && v >= 3);
  if (!want || !CITY.st) { if (brandt) { brandt.c.g.removeFromParent(); brandt = null; } return; }
  if (brandt && brandt.at !== CITY.st.mesh) { brandt.c.g.removeFromParent(); brandt = null; }
  if (!brandt) {
    const l = brandtLocal(); if (!l) return;
    const kind = hasChar('lagerarbeiter') ? 'lagerarbeiter' : hasChar('worker') ? 'worker' : ''; if (!kind) return;
    const c = charInstance(kind, [0.85, 0.72, 0.78]); animInit(c.anim, false);
    c.g.position.set(l[0], 0.18, l[1]); c.g.rotation.y = l[0] > 0 ? -Math.PI / 2 : Math.PI / 2; CITY.st.mesh.add(c.g);      // hinter dem Tresen, Blick zum Platz
    const lc = probeLit(c.g); lc.setRGB(0.9, 0.75, 0.6);            // steht im Licht der Garküche
    brandt = { c, lc, at: CITY.st.mesh };
  }
  animStep(brandt.c.anim, dt, false);
}

// ---------- Wrackfeld in der Narbe ----------
let field: { g: THREE.Group; spin: THREE.Object3D[]; lamp: THREE.Sprite } | null = null;
// Ausgebrannt: Farben dunkel und entsättigt (auch Zierstreifen), kein Leuchten, rauer
const _grey = new THREE.Color();
function char(root: THREE.Object3D, R: () => number, k = 0.3) {
  root.traverse((o: any) => {
    if (o.isSprite || o.isLight) { o.visible = false; return; }
    if (!o.isMesh) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    const cl = ms.map((x: any) => {
      const c = x.clone();
      if (c.color) { const m = Math.max(1, c.color.r, c.color.g, c.color.b), l = (c.color.r + c.color.g + c.color.b) / 3 / m; c.color.multiplyScalar(1 / m).lerp(_grey.setScalar(l), 0.75).multiplyScalar(k + R() * 0.12); }
      if (c.emissive) c.emissive.setScalar(0); if ('emissiveIntensity' in c) c.emissiveIntensity = 0;
      if ('roughness' in c) c.roughness = Math.min(1, (c.roughness || 0.5) + 0.3); if ('metalness' in c) c.metalness *= 0.6;
      return c;
    });
    o.material = Array.isArray(o.material) ? cl : cl[0];
  });
}
function buildField() {
  const R0 = rng(hashStr('narbe-wrackfeld')), R = () => R0.next();
  const g = new THREE.Group(), spin: THREE.Object3D[] = [];
  g.position.set(FIELD[0], FIELD[1], FIELD[2]);
  scene.add(g);
  const dark = new THREE.MeshStandardMaterial({ color: 0x141518, metalness: 0.7, roughness: 0.65 }), steel = new THREE.MeshStandardMaterial({ color: 0x2c2e32, metalness: 0.8, roughness: 0.55 });
  const lamp = new THREE.Sprite(glowMat(0xff7a40, 0.8)); lamp.scale.setScalar(22);
  // Trägerschiff Eidwacht: das Modell der Bastion, kleiner, ausgebrannt, schief im Raum
  const car = buildCarrierModel();
  if (car) {
    char(car.g, R, 0.07); for (const sp of car.glows) sp.visible = false;
    car.g.scale.setScalar(0.42); car.g.rotation.set(0.22, 0.9, -0.3); g.add(car.g); g.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(car.g), size = box.getSize(new THREE.Vector3()), mid = box.getCenter(new THREE.Vector3());
    const rc = new THREE.Raycaster(); rc.far = 3000;
    const hull: THREE.Object3D[] = []; car.g.traverse((o: any) => { if (o.isMesh && o.visible) hull.push(o); });   // nur Netze (Leuchtpunkte bräuchten eine Kamera)
    const hit = (dir: THREE.Vector3, spread: number) => {
      const tgt = mid.clone().add(new THREE.Vector3((R() - 0.5) * size.x, (R() - 0.5) * size.y, (R() - 0.5) * size.z).multiplyScalar(spread));
      rc.set(tgt.clone().addScaledVector(dir, 1200), dir.clone().negate());
      const h = rc.intersectObjects(hull, false).find(x => !!x.face);
      if (!h) return null;
      const n = h.face!.normal.clone().transformDirection(h.object.matrixWorld); if (n.dot(dir) < 0) n.negate();
      return { p: h.point.clone().sub(g.position), n };
    };
    const up = new THREE.Vector3(0, 1, 0);
    // Bresche: an der Flanke, die dem Feld zugewandt ist; aufgerissene Platten um ein schwarzes Loch, innen flackert Notlicht
    const side = new THREE.Vector3(1, 0.2, 0.25).normalize(), br = hit(side, 0.15);
    if (br) {
      BREACH[0] = br.p.x + br.n.x * 4; BREACH[1] = br.p.y + br.n.y * 4; BREACH[2] = br.p.z + br.n.z * 4;
      const hole = new THREE.Group(); hole.position.copy(br.p).addScaledVector(br.n, 0.6); hole.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), br.n);
      hole.add(new THREE.Mesh(new THREE.CircleGeometry(13, 9), new THREE.MeshBasicMaterial({ color: 0x010102 })));
      for (let i = 0; i < 11; i++) {
        const a = i / 11 * 6.28 + R() * 0.4, len = 6 + R() * 9, p = new THREE.Mesh(new THREE.BoxGeometry(3 + R() * 4, len, 0.35), i % 2 ? dark : steel);
        p.position.set(Math.cos(a) * 12.5, Math.sin(a) * 12.5, 1.2 + R() * 2); p.rotation.set(0, 0, a - Math.PI / 2); p.rotateX(-0.5 - R() * 0.7); hole.add(p);
      }
      g.add(hole); lamp.position.set(BREACH[0] - br.n.x * 5, BREACH[1] - br.n.y * 5, BREACH[2] - br.n.z * 5);
    }
    // Ferrit wächst aus dem angefressenen Rumpf: dunkle Kristalle mit schwachem Schein, dicht an der Bresche, sonst verstreut
    const ferrit = new THREE.MeshStandardMaterial({ color: 0x1a1226, metalness: 0.55, roughness: 0.28, emissive: 0x6a30c0, emissiveIntensity: 0.45, flatShading: true }), geo = new THREE.OctahedronGeometry(1, 0);
    const dirs = [side, side, side, new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.6, 0.5, 0.6).normalize(), new THREE.Vector3(0.3, -1, 0.2).normalize(), new THREE.Vector3(0.5, 0.3, -0.8).normalize()];
    for (let i = 0; i < 44; i++) {
      const h = hit(dirs[i % dirs.length], i % dirs.length < 3 ? 0.5 : 0.9); if (!h) continue;
      const cl = new THREE.Group(); cl.position.copy(h.p); cl.quaternion.setFromUnitVectors(up, h.n);
      for (let k = 0; k < 3 + Math.floor(R() * 4); k++) {
        const c = new THREE.Mesh(geo, ferrit), hh = 2.5 + R() * 7; c.scale.set(0.7 + R() * 1.2, hh, 0.7 + R() * 1.2);
        c.position.set((R() - 0.5) * 5, hh * 0.55, (R() - 0.5) * 5); c.rotation.set((R() - 0.5) * 0.9, R() * 6.28, (R() - 0.5) * 0.9); cl.add(c);
      }
      g.add(cl);
    }
  }
  g.add(lamp);
  // kleinere Wracks der Linie
  for (const w of WRECKS) {
    const m = buildShipModel(w.cls); for (const o of [...m.glows, ...m.navs]) o.visible = false; m.shield.visible = false;
    char(m.g, R, 0.09); m.g.scale.multiplyScalar(w.k); m.g.position.set(w.off[0], w.off[1], w.off[2]); m.g.rotation.set(R() * 3, R() * 6, R() * 3); g.add(m.g); spin.push(m.g);
  }
  // Trümmerplatten und Spanten rund um das Feld
  for (let i = 0; i < 70; i++) {
    const big = i < 10, p = new THREE.Mesh(new THREE.BoxGeometry(big ? 30 + R() * 50 : 3 + R() * 12, big ? 1.5 + R() * 3 : 0.3 + R() * 1.0, big ? 14 + R() * 30 : 2 + R() * 9), i % 3 ? dark : steel);
    const a = R() * 6.28, r = 160 + R() * 900; p.position.set(Math.cos(a) * r, (R() - 0.5) * 420, Math.sin(a) * r); p.rotation.set(R() * 3, R() * 3, R() * 3); g.add(p); if (!big) spin.push(p);
  }
  field = { g, spin, lamp };
}
function dropField() { if (!field) return; scene.remove(field.g); field.g.traverse((c: any) => { if (c.isMesh && !c.userData.shared) c.geometry?.dispose?.(); }); field = null; }

// pro Bild: Wrackfeld zeigen, sobald das Kapitel die Narbe erreicht (und danach für immer); Brandt in Neonhafen
export function updateChapter3(dt: number) {
  if (!P.story) { if (field) dropField(); if (brandt) { brandt.c.g.removeFromParent(); brandt = null; } return; }   // Hauptmenü, Spielstand ohne Geschichte
  updateBrandt(dt);
  const s = P.story, v = s ? step() : undefined, show = !!s && inSpace(SEC) && (v === 'done' || (typeof v === 'number' && v >= 7));
  if (!show) { if (field && !(DUN.active && DUN.e?.id === WRECK_ID)) dropField(); return; }
  if (!field) buildField();
  for (let i = 0; i < field!.spin.length; i++) { const o = field!.spin[i]; o.rotation.x += dt * 0.004 * (1 + (i % 3)); o.rotation.y += dt * 0.006; }
  const lit = v !== 'done' && !c3().rec;
  field!.lamp.visible = lit; if (lit) field!.lamp.scale.setScalar(20 + Math.sin(G.time * 5) * 4 + (Math.random() < 0.05 ? 9 : 0));
}
