import { $, d3, esc } from '../core/util';
import { voice, stopVoice, snd, sfx } from '../core/audio';
import { voiceIdFor, RADIO_VOICES } from '../data/voice';
import { releaseAll, centerMouse } from '../core/input';
import { P, G, saveGame, type Mode } from './state';
import { world } from './world';
import { spawnEnemy } from './combat';
import { IN, storyNpc, npcSpeak, hangarSpot, nearNpc } from './interior';
import { addRep } from './reputation';
import { closeMenu } from '../ui/dock';
import { radio } from '../ui/radio';

// =====================================================================================
// Story: Dialoge, Szenen und der Prolog „Vereidigung“ (siehe docs/story.md)
// Der Prolog führt neue Piloten in sieben Schritten ins Spiel: bei der Ausbilderin melden, Flottenband,
// Start, Übungsbojen, Bergbau, erster Ferrox-Kontakt, Andocken und Verkaufen, Vereidigung als Szene.
// Stand im Spielstand: P.story.prolog (Schritt oder 'done'); Schrittdaten (Bojen, Erz) ebenfalls dort.
// =====================================================================================
export interface StoryState {
  prolog: number | 'done'; wp?: number[][]; wi?: number; erz0?: number;          // Prolog
  ch1?: number | 'done'; c1?: { pts?: number[][]; pi?: number; frag?: number[]; tamm?: boolean };  // Kapitel 1 (siehe chapter1.ts)
  ch2?: number | 'done'; c2?: Record<string, any>;                                  // Kapitel 2 (siehe chapter2.ts)
  ch3?: number | 'done'; c3?: Record<string, any>;                                  // Kapitel 3 (siehe chapter3.ts)
  ch4?: number | 'done'; c4?: Record<string, any>;                                  // Kapitel 4 (siehe chapter4.ts)
}
const SPK: Record<string, string> = { VARGAL: '#ffb347', LESER: '#c070ff', ACHTERBERG: '#ffb347', BRUMMER: '#7cc4ff', HOLLWEG: '#bcd8ff', KOMPASS: '#d0c8f0', CREW: '#ffd27a', TAMM: '#e0b030', KRULL: '#ffb347', ROTH: '#f2d36b', KESSLER: '#d8b080', VARGA: '#9fd8ff', BRANDT: '#e8a0c0', MAREN: '#e0e6f0', ACHTERBERG31: '#ffcf8a', WERK: '#c8b090' };
const NAMES: Record<string, string> = { VARGAL: 'Kapitänin Varga · „Weitsicht“', LESER: 'Ferrit-Leser · Übersetzung', ACHTERBERG: 'Hauptfrau Achterberg', BRUMMER: 'Lotse Brummer · Bastion', HOLLWEG: 'Ratsherr Hollweg', KOMPASS: 'Frachter „Kompass“', CREW: 'Die Crew', TAMM: 'Rika Tamm · Sonnenwacht', KRULL: 'Gildemeisterin Krull', ROTH: 'Wachtmeisterin Roth', KESSLER: 'Vorarbeiter Kessler · Splitter-Mine', VARGA: 'Aufnahme · Kapitänin Varga, „Weitsicht“', BRANDT: 'Ilvar Brandt', MAREN: 'Aufnahme · Kommandantin Maren Hollweg, Jahr 31', ACHTERBERG31: 'Aufnahme · Staffelführerin Achterberg, Jahr 31', WERK: 'Schmelzwerk Zwölf · Schichtleitung' };
export const storyHooks = { banner: (_t: string, _s: string, _c?: string) => {} };

// ---------- Dialog (unten in der Mitte, läuft im Spiel weiter) ----------
type Line = [string, string];
const queue: Line[] = [];
let lineT = 0, lineTok = 0;
// passende Aufnahme zu einer Zeile (über das Textstück in data/voice.ts); über Funk klingt sie verfremdet
function speak(who: string | undefined, text: string) {
  if (text.includes('Willkommen in der Crew, Pilot')) sfx('oath', 0.5);   // feierlicher Ton zur Aufnahme in die Crew
  const id = voiceIdFor(text);
  // steht die Figur im Raum, gebärdet sie zur Zeile: geschätzte Dauer aus der Textlänge, mit Aufnahme deren echte Dauer
  if (who) npcSpeak(who, Math.min(12, 1.2 + text.length * 0.055));
  if (!id) { stopVoice(); return Promise.resolve(0); }
  return voice(id, !!who && (RADIO_VOICES.has(who) || G.mode === 'play')).then(d => { if (who && d) npcSpeak(who, d); return d; });
}
export function talk(...lines: Line[]) { queue.push(...lines); if (lineT <= 0) nextLine(); }
function nextLine() {
  const l = queue.shift();
  if (!l) { $('dlg').classList.add('hidden'); lineT = 0; lineTok++; return; }
  const [who, text] = l;
  $('dlgWho').textContent = NAMES[who] || who;
  ($('dlgWho') as HTMLElement).style.color = SPK[who] || '#5fd0ff';
  $('dlgTxt').innerHTML = esc(text);
  $('dlg').classList.remove('hidden');
  $('dlg').classList.remove('pop'); void ($('dlg') as HTMLElement).offsetWidth; $('dlg').classList.add('pop');
  lineT = 2.6 + text.length * 0.05;
  snd(1200, 0.03, 'sine', 0.02, -300);
  // Vertonung: Aufnahme abspielen, die Zeile bleibt mindestens so lange stehen
  const tok = ++lineTok;
  speak(who, text).then(d => { if (d && tok === lineTok && lineT > 0) lineT = Math.max(lineT, d + 0.6); });
}
$('dlg').addEventListener('click', () => { lineT = 0.01; });
// Läuft gerade ein Gespräch (Zeile sichtbar oder weitere in der Warteschlange)? Ein neuer Schritt verwirft offene Zeilen;
// Schritte, die mit einem Gespräch enden, warten deshalb darauf (siehe chapter3.ts).
export const dialogBusy = () => lineT > 0 || queue.length > 0;
function updateDialog(dt: number) { if (lineT > 0) { lineT -= dt; if (lineT <= 0) nextLine(); } }

// ---------- Szene (Kinobalken, Spiel steht, Zeilen nacheinander) ----------
interface SceneLine { who?: string; text: string; big?: boolean; t?: number }
let scene: { lines: SceneLine[]; i: number; t: number; prev: Mode; done: () => void } | null = null;
export const sceneActive = () => !!scene;
export function playScene(lines: SceneLine[], done: () => void) {
  scene = { lines, i: -1, t: 0, prev: G.mode, done };
  G.mode = 'scene';
  if (document.pointerLockElement) document.exitPointerLock();
  releaseAll();
  document.body.classList.remove('playing');
  $('scene').classList.remove('hidden');
  $('dlg').classList.add('hidden'); queue.length = 0; lineT = 0;
  sceneNext();
}
export function sceneNext() {
  if (!scene) return;
  scene.i++;
  const l = scene.lines[scene.i];
  if (!l) {
    const s = scene; scene = null;
    stopVoice();
    $('scene').classList.add('hidden');
    G.mode = s.prev;
    if (s.prev === 'walk' || s.prev === 'play') { document.body.classList.add('playing'); centerMouse(); }
    s.done();
    return;
  }
  scene.t = l.t || 3 + l.text.length * 0.055;
  { const sc = scene, i = scene.i; speak(l.who, l.text).then(d => { if (d && scene === sc && sc.i === i) sc.t = Math.max(sc.t, d + 0.7); }); }
  const who = $('sceneWho') as HTMLElement, txt = $('sceneTxt') as HTMLElement;
  who.textContent = l.who ? NAMES[l.who] || l.who : '';
  who.style.color = (l.who && SPK[l.who]) || '#5fd0ff';
  txt.textContent = l.text;
  txt.classList.toggle('big', !!l.big);
  const box = $('sceneBox'); box.classList.remove('pop'); void (box as HTMLElement).offsetWidth; box.classList.add('pop');
}
$('scene').addEventListener('click', () => sceneNext());
function updateScene(dt: number) { if (scene) { scene.t -= dt; if (scene.t <= 0) sceneNext(); } }

// ---------- Ketten: Prolog, Kapitel 1, … ----------
// Jede Kette ist eine Folge von Schritten; ihr Stand steht unter ihrem Schlüssel in P.story (Zahl oder 'done').
// Aktiv ist die erste Kette, die begonnen und nicht fertig ist.
export const st = () => P.story as StoryState;
export type Obj = [string, boolean, boolean];
export interface Marker { x: number; y: number; z: number; label: string; col: string; big?: boolean }
export interface Step { title: string; enter: () => void; lines: () => Obj[]; done: () => boolean; markers?: () => Marker[]; tick?: (dt: number) => void }
interface Chain { key: 'prolog' | 'ch1' | 'ch2' | 'ch3' | 'ch4'; steps: Step[]; resume?: (n: number) => number }
const CHAINS: Chain[] = [];
const ORDER = ['prolog', 'ch1', 'ch2', 'ch3', 'ch4'];
export function registerChain(c: Chain) { CHAINS.push(c); CHAINS.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key)); }   // feste Reihenfolge, egal wann ein Modul geladen wird
function cur(): { c: Chain; n: number } | null {
  if (!P.story) return null;
  for (const c of CHAINS) {
    const v = st()[c.key];
    if (v === 'done') continue;
    if (v === undefined || v === null) return null;
    return { c, n: v };
  }
  return null;
}
let entered = '';
export function goto(n: number) { const k = cur(); if (!k) return; st()[k.c.key] = n; entered = ''; saveGame(); }
export function endChain(key: Chain['key']) { st()[key] = 'done'; entered = ''; saveGame(); }
// Scanner-Taste (für Peilungen)
export const storyCtx = { scanAt: -99 };
export function noteScan() { storyCtx.scanAt = G.time; }
export const bastion = () => world.stations.find(s => s.id === 'bastion');

// ---------- Prolog ----------
const S = { talked: false, band: false, foes: [] as any[], docked: false, met: false, scene: false };
// Regel für Gespräche und Szenen in Stationen (seit Alpha 0.99g): Sie beginnen nie beim Andocken. Die Figuren warten am Treffpunkt im Hangar
// (hangarSpot), der Pilot steigt aus, läuft hin und spricht sie an. settled(): Der Landeablauf ist vorbei, der Pilot steht neben seinem Schiff.
export const settled = () => G.mode === 'walk' || G.mode === 'dock';
const inBastion = () => IN.active && !!G.dockedAt && G.dockedAt.id === 'bastion';
export const prologActive = () => !!P.story && st().prolog !== 'done';
const STEPS: Step[] = [
  { // 0: bei der Ausbilderin melden
    title: 'Prolog · Letzter Ausbildungstag',
    enter: () => {
      S.talked = false;
      storyNpc('Achterberg', 'Ausbilderin', 'Bei Hauptfrau Achterberg melden', () => { S.talked = true; }, '#ffb347', undefined, { model: 'achterberg' });
      talk(['BRUMMER', 'Guten Morgen, Bastion. Jahr 38 nach dem Riss, Tag 112. Schichtwechsel auf allen Decks.'],
        ['ACHTERBERG', `Kadett ${P.name}! Hier drüben, bei deiner ${P.shipName}. Beweg dich.`]);
    },
    lines: () => [['Melde dich bei Hauptfrau Achterberg · <b>E</b>', S.talked, false], ['Laufen mit W A S D, Maus zum Umsehen', false, true]],
    done: () => S.talked,
  },
  { // 1: Flottenband
    title: 'Prolog · Letzter Ausbildungstag',
    enter: () => {
      S.band = false;
      talk(['ACHTERBERG', 'Heute ist dein letzter Ausbildungstag. Fliegen, schürfen, heil zurückkommen. Klingt einfach. Ist es nicht.'],
        ['ACHTERBERG', 'Hier, dein Flottenband. Noch mit Kadettenstatus. Heute Abend, nach der Vereidigung, gehört es ganz dir.'],
        ['ACHTERBERG', 'Schau rein. Taste B.']);
    },
    lines: () => [['Öffne das Flottenband · <b>B</b>', S.band, false]],
    done: () => S.band,
  },
  { // 2: an Bord und starten
    title: 'Prolog · Erster Flug',
    enter: () => talk(['ACHTERBERG', `Gut. Und jetzt rein in die ${P.shipName}. Pilotensitz, dann holst du dir beim Lotsen die Startfreigabe.`]),
    lines: () => [[`Geh an Bord deiner ${P.shipName} · <b>E</b> am Schiff`, IN.ship != null, false], ['Vom Pilotensitz aus starten', false, false]],
    done: () => G.mode === 'play' && !G.dockedAt,
  },
  { // 3: Übungsbojen
    title: 'Prolog · Erster Flug',
    enter: () => {
      const b = bastion();
      if (!st().wp && b) {
        const Y = b.launch.yaw, fx = -Math.sin(Y), fz = -Math.cos(Y), rx = Math.cos(Y), rz = -Math.sin(Y), L = b.launch;
        st().wp = [[L.x + fx * 650, L.y, L.z + fz * 650], [L.x + fx * 1250 + rx * 450, L.y + 80, L.z + fz * 1250 + rz * 450], [L.x + fx * 1050 + rx * 1150, L.y + 160, L.z + fz * 1050 + rz * 1150]].map(p => p.map(Math.round));
        st().wi = 0;
      }
      talk(['BRUMMER', `${P.shipName} ${P.name} von Bastion: Startfreigabe erteilt. Drei Übungsbojen sind markiert.`],
        ['ACHTERBERG', 'Flieg sie der Reihe nach ab. W gibt Schub, mit der Maus lenkst du. Und ramm die Bojen nicht, die sind teurer als du.']);
    },
    lines: () => (st().wp || []).map((p, i) => [`Übungsboje ${i + 1}${i === (st().wi || 0) ? ` · <b>${fmtDist(d3(p[0], p[1], p[2], P.x, P.y, P.z))}</b>` : ''}`, i < (st().wi || 0), false] as Obj),
    done: () => (st().wi || 0) >= 3,
    markers: () => { const wp = st().wp, i = st().wi || 0; return wp && wp[i] ? [{ x: wp[i][0], y: wp[i][1], z: wp[i][2], label: `BOJE ${i + 1}`, col: '#ffb347', big: true }] : []; },
  },
  { // 4: Bergbau
    title: 'Prolog · Erz für die Crew',
    enter: () => {
      if (st().erz0 == null) st().erz0 = P.cargo.erz;
      talk(['ACHTERBERG', 'Die Crew lebt von Erz. Kein Erz, keine Schiffe. Keine Schiffe, keine Crew. So einfach ist das.'],
        ['ACHTERBERG', 'Das markierte Feld ist Eisenerz. Taste R ist der Scanner. Dann Taste 2 für den Bergbaulaser und draufhalten, bis der Brocken zerfällt.']);
    },
    lines: () => {
      const got = Math.max(0, P.cargo.erz - (st().erz0 || 0));
      return [['Asteroiden scannen · <b>R</b>', world.asteroids.some(a => a.scanT > 0) || got > 0, false], [`Eisenerz abbauen · <b>${Math.min(10, got)}/10</b>`, got >= 10, false], ['Werkzeug: 1 Kanonen, 2 Laser', false, true]];
    },
    done: () => P.cargo.erz - (st().erz0 || 0) >= 10,
    markers: () => { const f = world.fields.find(x => x.def.kind === 'metal'); return f && d3(f.x, f.y, f.z, P.x, P.y, P.z) > f.r ? [{ x: f.x, y: f.y, z: f.z, label: 'EISENERZFELD', col: '#ffb347', big: true }] : []; },
  },
  { // 5: erster Ferrox-Kontakt
    title: 'Prolog · Keine Übung',
    enter: () => {
      // zwei Späher bei einem Frachter (oder beim Spieler, wenn keiner da ist)
      const t = world.traffic.reduce((b: any, s: any) => (!b || d3(s.x, s.y, s.z, P.x, P.y, P.z) < d3(b.x, b.y, b.z, P.x, P.y, P.z) ? s : b), null);
      const c = t || { x: P.x - Math.sin(P.yaw) * 900, y: P.y, z: P.z - Math.cos(P.yaw) * 900 };
      S.foes = [0, 1].map(i => { const e = spawnEnemy('drone', c.x + 260 + i * 60, c.y + 30, c.z - 200 + i * 80); e.hp = e.maxhp = Math.ceil(e.maxhp * 0.6); return e; });
      talk([t ? 'KOMPASS' : 'BRUMMER', t ? `Frachter „${t.name}“ an alle: Ferrox-Späher! Sie fressen uns die Hülle weg!` : 'Bastion an alle: Ferrox-Späher im Sektor!'],
        ['ACHTERBERG', 'Das ist keine Übung mehr, Kadett. Taste 1 für die Kanonen. Hol sie dir!']);
      snd(440, 0.25, 'square', 0.04); setTimeout(() => snd(440, 0.25, 'square', 0.04), 350);
    },
    lines: () => { const left = S.foes.filter(e => world.enemies.includes(e)).length; return [[`Ferrox-Späher abschießen · <b>${2 - left}/2</b>`, left === 0, false], ['Klick: Kanonen feuern', false, true]]; },
    done: () => S.foes.length > 0 && !S.foes.some(e => world.enemies.includes(e)),
  },
  { // 6: zurück, andocken, verkaufen
    title: 'Prolog · Heimkehr',
    enter: () => { S.docked = false; talk(['ACHTERBERG', 'Sauber. Ich hab schon Schlechtere vereidigt. Bring das Erz nach Hause: an der Bastion andocken und im Markt verkaufen.']); },
    lines: () => [['An der Bastion andocken · <b>E</b>', S.docked, false], ['Eisenerz verkaufen · Stationsmenü (Tab) → Markt', P.cargo.erz === 0, false]],
    done: () => S.docked && P.cargo.erz === 0,
    markers: () => { const b = bastion(); return b && !S.docked ? [{ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
  { // 7: Vereidigung
    title: 'Prolog · Vereidigung',
    enter: () => { S.met = false; S.scene = false; },
    // Ratsherr und Ausbilderin warten im Hangar. Die Vereidigung beginnt erst, wenn der Kadett zu ihnen läuft und antritt.
    tick: () => {
      if (!IN.active) { S.met = false; return; }
      if (S.met || S.scene || !settled() || IN.ship || !inBastion()) return;
      const { x: hx, z: hz } = hangarSpot(-4), say = 'Zur Vereidigung antreten';
      const go = () => { if (S.scene) return; S.scene = true; IN.yaw = Math.atan2(-(hx + 1.2 - IN.x), -(hz - IN.z)); IN.pitch = 0; vereidigung(); };
      S.met = storyNpc('Hollweg', 'Flottenrat', say, go, '#bcd8ff', { x: hx, z: hz }, { model: 'hollweg' });
      storyNpc('Achterberg', 'Ausbilderin', say, go, '#ffb347', { x: hx + 2.4, z: hz + 0.8 }, { model: 'achterberg' });
    },
    lines: () => (inBastion()
      ? [['Im Hangar zu <b>Ratsherr Hollweg</b> und Hauptfrau Achterberg gehen', S.scene || nearNpc('Hollweg'), false], ['Zur Vereidigung antreten · <b>E</b>', S.scene, false]]
      : [['An der Bastion andocken · <b>E</b>', false, false]]),
    done: () => false,
    markers: () => { const b = bastion(); return b ? [{ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
];
function vereidigung() {
  if (G.mode === 'dock' && G.inside) closeMenu();
  playScene([
    { who: 'ACHTERBERG', text: 'Haltung, Kadett. Der Rat ist da.', t: 3 },
    { who: 'HOLLWEG', text: `${P.name}. Vor achtunddreißig Jahren hat meine Mutter in diesem Hangar die Crew versammelt. Hinter uns war das Tor gerade zerbrochen.` },
    { who: 'HOLLWEG', text: 'Niemand ist gekommen, um uns zu holen. Also haben wir uns selbst gehalten. Mit jedem Schiff. Mit jeder Tonne Erz. Mit jedem Piloten.' },
    { who: 'HOLLWEG', text: 'Sprich mit uns.', t: 2.5 },
    { who: 'CREW', text: '„Wir sind die letzte Crew. Niemand kommt uns holen.“', big: true, t: 4.5 },
    { who: 'CREW', text: '„Also bauen wir uns selbst eine Flotte, Schiff für Schiff, und keiner von uns wird zurückgelassen.“', big: true, t: 6 },
    { who: 'HOLLWEG', text: 'Willkommen in der Crew, Pilot. Das Flottenband gehört jetzt dir.' },
    { who: 'ACHTERBERG', text: 'Und jetzt raus mit dir. Da draußen wartet Arbeit.', t: 3.5 },
    { text: 'IN DIE CREW AUFGENOMMEN', big: true, t: 3.5 },
  ], finishPrologue);
}
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');

// Beim Laden mitten im Prolog: Schritte zu Fuß gehen nur in der Bastion; die Szene wird wiederholt
registerChain({ key: 'prolog', steps: STEPS, resume: n => (n <= 2 && !IN.active ? 3 : n === 7 ? 6 : n) });
export function startPrologue() {
  P.story = { prolog: IN.active && !IN.ship ? 0 : 3 };
  entered = '';
}
// Spielstand geladen: Kette dort fortsetzen, wo es sinnvoll ist. Wer den Prolog hinter sich hat, beginnt Kapitel 1.
export function resumeStory() {
  if (!P.story) return;
  if (st().prolog === 'done' && st().ch1 === undefined) st().ch1 = 0;
  if (st().ch1 === 'done' && st().ch2 === undefined) st().ch2 = 0;
  if (st().ch2 === 'done' && st().ch3 === undefined) st().ch3 = 0;
  if (st().ch3 === 'done' && st().ch4 === undefined) st().ch4 = 0;
  const k = cur();
  if (k && k.c.resume) st()[k.c.key] = k.c.resume(k.n);
  entered = '';
}
export const resumePrologue = resumeStory;
const startChapter1 = (ms: number) => setTimeout(() => { if (P.story && st().prolog === 'done' && st().ch1 === undefined) { st().ch1 = 0; entered = ''; saveGame(); } }, ms);
function finishPrologue() {
  st().prolog = 'done';
  P.credits += 300;
  addRep('rat', 25);
  storyHooks.banner('IN DIE CREW AUFGENOMMEN', 'Vereidigt · +300 Credits', '#ffd27a');
  snd(523, 0.3, 'triangle', 0.06, 0); setTimeout(() => snd(659, 0.3, 'triangle', 0.06, 0), 200); setTimeout(() => snd(784, 0.5, 'triangle', 0.06, 0), 400);
  saveGame();
  setTimeout(() => talk(['BRUMMER', 'Bastion an alle Piloten: Willkommen, Pilot. Aufträge gibt es an jeder Station, Missionen bei den Fraktionen.'],
    ['BRUMMER', 'Moment … die Sonnenwacht meldet ein Signal aus den Trümmern im Sonnenfeld. Aus dem alten Tor. Das gab es noch nie.']), 5000);
  startChapter1(22000);
}
export function skipPrologue() {
  if (!prologActive()) return;
  st().prolog = 'done';
  queue.length = 0; lineT = 0.01;
  P.credits += 300;
  radio('BASTION', 'Prolog übersprungen. Du bist vereidigt und in die Crew aufgenommen: +300 Credits.');
  saveGame();
  startChapter1(5000);
}

// Aufgabenfeld zu Fuß und im Stationsmenü (dort ist das Flug-HUD aus)
let objT = 0, objKey = '';
function updateWalkObjective(dt: number) {
  objT -= dt; if (objT > 0) return; objT = 0.2;
  const o = storyObjective(), show = !!o && $('hud').classList.contains('hidden') && (G.mode === 'walk' || G.mode === 'dock' || G.mode === 'map');
  const el = $('storyObj');
  if (!show) { el.classList.add('hidden'); objKey = ''; return; }
  const key = o!.title + o!.lines.map(l => l.join('|')).join('/');
  el.classList.remove('hidden');
  if (key === objKey) return;
  objKey = key;
  el.innerHTML = `<div class="ot">${esc(o!.title)}</div>` + o!.lines.map(([t, done, sub]) => `<div class="obj${done ? ' done' : ''}${sub ? ' sub' : ''}">${sub ? '' : '<i></i>'}<span>${t}</span></div>`).join('');
}
// pro Bild
export function updateStory(dt: number) {
  updateDialog(dt);
  updateScene(dt);
  updateWalkObjective(dt);
  const k = cur();
  if (!k || G.mode === 'menu' || G.mode === 'intro' || G.mode === 'scene') return;
  const { c, n } = k, s = c.steps[n];
  if (!s) return;
  // wer im Prolog schon losfliegt, überspringt die Schritte zu Fuß
  if (c.key === 'prolog' && n <= 1 && G.mode === 'play') { goto(3); return; }
  const id = c.key + ':' + n;
  if (entered !== id) {
    // Zeilen eines früheren Schritts, die noch nicht dran waren, verwerfen (wer schnell spielt, hört nichts Veraltetes)
    queue.length = 0; if (lineT > 1.2) lineT = 1.2;
    entered = id; s.enter();
  }
  if (c.key === 'prolog') {
    if (n === 1 && G.mode === 'map') S.band = true;
    if (n === 3) { const wp = st().wp, i = st().wi || 0; if (wp && wp[i] && d3(wp[i][0], wp[i][1], wp[i][2], P.x, P.y, P.z) < 90) { st().wi = i + 1; snd(880, 0.1, 'sine', 0.05, 300); } }
    if (n === 6 && G.dockedAt && G.dockedAt.id === 'bastion') S.docked = true;
  }
  s.tick?.(dt);
  if (s.done()) goto(n + 1);
}
// Anzeigen
export function storyObjective(): { title: string; lines: Obj[] } | null {
  const k = cur(), s = k && k.c.steps[k.n];
  return s ? { title: s.title, lines: s.lines() } : null;
}
export function storyMarkers(ground = false): Marker[] { const k = cur(), s = k && k.c.steps[k.n]; return s && s.markers && (ground ? G.mode === 'rover' : G.mode === 'play') ? s.markers() : []; }
// Kapitel nach dem vorigen beginnen (kurz nach dessen Abschluss)
export function startChain(key: 'ch1' | 'ch2' | 'ch3' | 'ch4', ms: number) { setTimeout(() => { if (P.story && st()[key] === undefined) { st()[key] = 0; entered = ''; saveGame(); } }, ms); }
// für das Flottenband: Kapitelname und Stand
export function storyChapter() { const k = cur(); return k ? { key: k.c.key, n: k.n, total: k.c.steps.length } : null; }
