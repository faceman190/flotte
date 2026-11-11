import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { d3, rand } from '../core/util';
import { snd } from '../core/audio';
import { SECTOR } from '../data/galaxy';
import { P, G, saveGame } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy } from './combat';
import { SHARED } from './shared';
import { IN, storyNpc } from './interior';
import { addRep } from './reputation';
import { closeMenu } from '../ui/dock';
import { talk, playScene, registerChain, st, goto, endChain, storyCtx, storyHooks, type Step, type Obj } from './story';

// =====================================================================================
// Kapitel 1: „Echo im Sonnenfeld“ (siehe docs/story.md)
// Das zerbrochene Halden-Tor sendet. Sonnenwacht → drei Peilungen → Kernstück des Tors mit fressenden Ferrox
// → Datenkern bergen → Auswertung in der Bastion (Szene) mit der Kennung der „Weitsicht“.
// Das Kernstück bleibt danach als Ort im Sonnenfeld (mit erloschenem Licht).
// =====================================================================================
const SEC = 'sonnenfeld';
const T = 'Kapitel 1 · Echo im Sonnenfeld';
const S = { foes: [] as any[] };
const c1 = () => (st().c1 = st().c1 || {});
const here = () => !!world.def && world.def.id === SEC && !world.surface;
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
const docked = (id: string) => !!G.dockedAt && G.dockedAt.id === id;

// Orte im Sonnenfeld: Peilpunkte rund um das große Trümmerfeld, das Kernstück tief darin
function places() {
  const d = c1();
  if (!d.pts || !d.frag) {
    const f = SECTOR[SEC].fields[0], [cx, cy, cz] = f.pos, r = f.r;
    d.pts = [0, 1, 2].map(i => { const a = 0.4 + i * 2.1; return [Math.round(cx + Math.cos(a) * r * 1.15), Math.round(cy + (i - 1) * 90), Math.round(cz + Math.sin(a) * r * 1.15)]; });
    d.frag = [cx + Math.round(r * 0.18), cy - 40, cz - Math.round(r * 0.12)];
    d.pi = 0;
  }
  return d as { pts: number[][]; frag: number[]; pi: number };
}
const route = (to: string) => { if (P.sector !== to) P.route = to; };
const routeLine = (): Obj => [`Springe ins <b>Sonnenfeld</b>${P.route === SEC ? ' · Route gesetzt (Karte: M)' : ''}`, here(), false];

const STEPS: Step[] = [
  { // 0: Funkspruch des Rats
    title: T,
    enter: () => {
      const lines = () => {
        talk(['HOLLWEG', `Pilot ${P.name}, hier spricht Ratsherr Hollweg. Das Signal aus dem Sonnenfeld wird stärker. Die halbe Bastion hängt an den Funkgeräten und hofft.`],
          ['HOLLWEG', 'Ich will wissen, was da sendet, bevor die Gerüchte schneller sind als wir. Flieg zur Sonnenwacht. Die Route ist gesetzt.']);
        route(SEC);
      };
      if (G.mode === 'play' || G.mode === 'walk' || G.mode === 'dock') playScene([{ text: 'KAPITEL 1', big: true, t: 2.4 }, { text: 'Echo im Sonnenfeld', big: true, t: 3 }], lines);
      else lines();
    },
    lines: () => [routeLine()],
    done: () => here(),
  },
  { // 1: Sonnenwacht anfliegen
    title: T,
    enter: () => talk(['TAMM', 'Sonnenwacht an Pilot: Wir sehen dich. Komm rein, die Andockzone ist frei.']),
    lines: () => [here() ? ['An der <b>Sonnenwacht</b> andocken · E', false, false] : routeLine()],
    done: () => docked('sonnenwacht'),
    markers: () => { const s = world.stations.find(x => x.id === 'sonnenwacht'); return s && here() ? [{ x: s.dock.x, y: s.dock.y, z: s.dock.z, label: 'SONNENWACHT · ANDOCKEN', col: '#e0b030', big: true }] : []; },
  },
  { // 2: Rika Tamm erzählt
    title: T,
    enter: () => {
      places();
      if (IN.active && !IN.ship) storyNpc('Rika Tamm', 'Sonnenwacht', 'Rika Tamm', () => talk(['TAMM', 'Drei Peilpunkte, drei Scans. Den Rest rechne ich.']), '#e0b030', undefined, { model: 'merchant', tint: [1.1, 0.92, 0.68] });
      talk(['TAMM', 'Rika Tamm, ich leite diesen Außenposten. Ich war neun, als das Tor zerbrach. Ich stand am Fenster der Bastion und hab das Licht gesehen.'],
        ['TAMM', 'Seit drei Tagen pfeift es aus den Trümmern. Unsere Antennen hören es, aber das Feld streut das Signal. Wir finden die Quelle nicht.'],
        ['TAMM', 'Flieg drei Peilpunkte rund um das Feld an und scanne dort mit R. Aus drei Peilungen rechne ich dir die Quelle aus.']);
    },
    lines: () => [['Rika Tamm zuhören', false, false], ['Ablegen und zum ersten Peilpunkt fliegen', false, false]],
    done: () => G.mode === 'play' && !G.dockedAt,
  },
  { // 3: drei Peilungen
    title: 'Kapitel 1 · Peilung',
    enter: () => { places(); },
    lines: () => {
      if (!here()) return [routeLine()];
      const d = places();
      const L: Obj[] = d.pts.map((p, i) => [`Peilpunkt ${i + 1}${i === d.pi ? ` · <b>${fmtDist(d3(p[0], p[1], p[2], P.x, P.y, P.z))}</b>` : ''}`, i < d.pi, false] as Obj);
      L.push(['Am Peilpunkt scannen · <b>R</b>', false, true]);
      return L;
    },
    tick: () => {
      if (!here()) return;
      const d = places(), p = d.pts[d.pi];
      if (!p || d3(p[0], p[1], p[2], P.x, P.y, P.z) > 260 || storyCtx.scanAt < G.time - 2) return;
      d.pi++; storyCtx.scanAt = -99;   // ein Scan zählt nur einmal
      burst(p[0], p[1], p[2], '#e0b030', 30, 70, 0.9);
      snd(880, 0.12, 'sine', 0.05, 300);
      const say = ['Erste Peilung steht. Das Signal kommt aus der Tiefe des Feldes, nicht vom Rand.', 'Zweite Peilung. Es wird schärfer. Das ist kein Felsbrocken, das ist etwas Großes.', ''];
      if (d.pi < 3) talk(['TAMM', say[d.pi - 1]]);
      saveGame();
    },
    done: () => places().pi >= 3,
    markers: () => { if (!here()) return []; const d = places(), p = d.pts[d.pi]; return p ? [{ x: p[0], y: p[1], z: p[2], label: `PEILPUNKT ${d.pi + 1}`, col: '#e0b030', big: true }] : []; },
  },
  { // 4: zum Kernstück
    title: 'Kapitel 1 · Das Kernstück',
    enter: () => talk(['TAMM', 'Ich hab sie! Mitten im Feld treibt ein Bogenstück des Tors, so groß wie die Bastion. Und Pilot … da bewegt sich was.']),
    lines: () => { if (!here()) return [routeLine()]; const f = places().frag; return [[`Fliege zum Kernstück des Tors · <b>${fmtDist(d3(f[0], f[1], f[2], P.x, P.y, P.z))}</b>`, false, false]]; },
    tick: () => {
      if (!here() || S.foes.length) return;
      const f = places().frag;
      if (d3(f[0], f[1], f[2], P.x, P.y, P.z) > 900) return;
      // Ferrox fressen am Tor (Mitspieler bekommen die Ferrox vom Gastgeber, hier nicht doppelt erzeugen)
      if (!SHARED.client) S.foes = [0, 1, 2, 3, 4].map(i => spawnEnemy(i === 4 ? 'bomber' : 'drone', f[0] + rand(-220, 220), f[1] + rand(-80, 80), f[2] + rand(-220, 220)));
      else S.foes = [null];
      talk(['TAMM', 'Ferrox! Im Sonnenfeld! Sie fressen am Tor!'], ['HOLLWEG', 'Pilot, vertreib sie. Die Bastion schickt Verstärkung, aber du bist zuerst da.']);
      snd(440, 0.25, 'square', 0.04); setTimeout(() => snd(440, 0.25, 'square', 0.04), 350);
    },
    done: () => S.foes.length > 0,
    markers: () => { if (!here()) return []; const f = places().frag; return [{ x: f[0], y: f[1] + 160, z: f[2], label: 'KERNSTÜCK DES HALDEN-TORS', col: '#e0b030', big: true }]; },
  },
  { // 5: Ferrox vertreiben
    title: 'Kapitel 1 · Das Kernstück',
    enter: () => {},
    lines: () => { const all = S.foes.filter(Boolean), left = all.filter(e => world.enemies.includes(e)).length; return [[`Ferrox am Kernstück vertreiben · <b>${all.length - left}/${all.length}</b>`, left === 0, false]]; },
    done: () => !S.foes.some(e => e && world.enemies.includes(e)),
  },
  { // 6: Datenkern bergen
    title: 'Kapitel 1 · Der Datenkern',
    enter: () => talk(['TAMM', 'Sie sind weg. Das Licht im Kernstück … es pulsiert im Takt des Signals. Flieg hinein, deine Bergungsklammer kann den Kern lösen.']),
    lines: () => { if (!here()) return [routeLine()]; const f = places().frag; return [[`In den Lichtkern fliegen · <b>${fmtDist(d3(f[0], f[1], f[2], P.x, P.y, P.z))}</b>`, false, false]]; },
    done: () => { if (!here()) return false; const f = places().frag; if (d3(f[0], f[1], f[2], P.x, P.y, P.z) > 55) return false; burst(f[0], f[1], f[2], '#fff2c0', 80, 120, 1.6); snd(300, 0.8, 'sine', 0.06, 900); talk(['TAMM', 'Kern gelöst! Das Licht ist aus. Und das Signal … ist still. Bring ihn zur Bastion, schnell.']); return true; },
    markers: () => { if (!here()) return []; const f = places().frag; return [{ x: f[0], y: f[1], z: f[2], label: 'DATENKERN', col: '#fff2c0', big: true }]; },
  },
  { // 7: zurück zur Bastion
    title: 'Kapitel 1 · Heimkehr',
    enter: () => { talk(['HOLLWEG', 'Gute Arbeit. Bring den Kern zur Bastion. Krull und Roth sind schon unterwegs, und keine von beiden ist gut gelaunt.']); route('heimstatt'); },
    lines: () => [P.sector === 'heimstatt' && !world.surface ? ['An der <b>Bastion</b> andocken · E', false, false] : [`Springe nach <b>Heimstatt</b>${P.route === 'heimstatt' ? ' · Route gesetzt' : ''}`, false, false]],
    done: () => docked('bastion'),
    markers: () => { const b = world.stations.find(s => s.id === 'bastion'); return b ? [{ x: b.dock.x, y: b.dock.y, z: b.dock.z, label: 'BASTION · ANDOCKEN', col: '#ffb347', big: true }] : []; },
  },
  { // 8: Auswertung (Szene)
    title: 'Kapitel 1 · Auswertung',
    enter: () => {
      if (G.mode === 'dock' && G.inside) closeMenu();
      if (IN.active && !IN.ship) {
        const hx = IN.x - 1.2, hz = IN.z - 6;
        storyNpc('Hollweg', 'Flottenrat', 'Ratsherr Hollweg', () => {}, '#bcd8ff', { x: hx, z: hz }, { model: 'merchant', tint: [0.72, 0.8, 1.05] });
        storyNpc('Krull', 'Bergbaugilde', 'Gildemeisterin Krull', () => {}, '#ffb347', { x: hx - 2.6, z: hz + 1.2 }, { model: 'worker', tint: [1.05, 0.95, 0.8] });
        storyNpc('Roth', 'Grenzwacht', 'Wachtmeisterin Roth', () => {}, '#f2d36b', { x: hx + 2.6, z: hz + 1.2 }, { model: 'worker', tint: [0.48, 0.76, 0.4] });
        IN.yaw = Math.atan2(-(hx - IN.x), -(hz - IN.z)); IN.pitch = 0;
      }
      setTimeout(() => playScene([
        { who: 'HOLLWEG', text: 'Der Kern ist ausgewertet. Ich sage es gleich, damit niemand falsche Hoffnung hat: Das Signal kommt nicht aus den Altwelten.' },
        { who: 'HOLLWEG', text: 'Es ist das Tor selbst. Ein Ruf der Erbauer, Jahrtausende alt. Irgendetwas hat ihn wieder geweckt.' },
        { who: 'KRULL', text: 'Und jetzt das Merkwürdige. Das Muster im Signal gleicht dem Gitter in unseren Ferrit-Kristallen. Bis aufs Atom.' },
        { who: 'KRULL', text: 'Das Ferrit spricht dieselbe Sprache wie das Tor. Ich will wissen, was es sagt. Der Splittergürtel ist voll davon.' },
        { who: 'ROTH', text: 'Ihr redet über Kristalle? Da draußen haben Ferrox am Tor gefressen. Im Sonnenfeld. Zwei Sprünge von hier.' },
        { who: 'ROTH', text: 'Das Signal lockt sie an. Sie fressen das Tor, und danach uns. Die Grenzwacht gehört ins Sonnenfeld. Sofort.' },
        { who: 'HOLLWEG', text: 'Niemand verlegt hier irgendetwas, solange ich nicht weiß, womit wir es zu tun haben.' },
        { who: 'BRUMMER', text: 'Ratsherr … Verzeihung. Da ist noch etwas. Unter dem Rauschen, drei Sekunden lang. Ich hab es fünfmal abgespielt.' },
        { who: 'BRUMMER', text: 'Eine Transponderkennung. Menschlich. WS-07.', t: 4 },
        { text: 'WS-07: die „Weitsicht“. Eines der elf Schiffe, die nie ankamen.', big: true, t: 5.5 },
        { who: 'HOLLWEG', text: '… Kein Wort davon verlässt diesen Hangar. Noch nicht.', t: 4 },
        { text: 'KAPITEL 1 ABGESCHLOSSEN', big: true, t: 3.5 },
      ], finish), 1200);
    },
    lines: () => [['Auswertung mit Rat, Gilde und Grenzwacht', false, false]],
    done: () => false,
  },
];
registerChain({ key: 'ch1', steps: STEPS, resume: n => (n === 2 ? 3 : n === 5 ? 4 : n === 8 ? 7 : n) });

function finish() {
  endChain('ch1');
  P.credits += 1500;
  addRep('rat', 40); addRep('gilde', 20); addRep('wacht', 20);
  storyHooks.banner('KAPITEL 1 ABGESCHLOSSEN', '+1.500 Credits · Ruf bei allen Fraktionen', '#ffd27a');
  snd(523, 0.3, 'triangle', 0.06, 0); setTimeout(() => snd(659, 0.3, 'triangle', 0.06, 0), 200); setTimeout(() => snd(784, 0.5, 'triangle', 0.06, 0), 400);
  saveGame();
  setTimeout(() => talk(['KRULL', 'Pilot, auf ein Wort. Die Gilde zahlt gut für jeden, der im Splittergürtel die Augen offen hält. Wenn das Ferrit spricht, will ich es hören.'],
    ['BRUMMER', 'Bastion an Pilot: Die Geschichte geht weiter. Kapitel 2 ist in Arbeit.']), 4000);
}

// ---------- Das Kernstück des Halden-Tors im Sonnenfeld ----------
let frag: { g: THREE.Group; core: THREE.Sprite; light: THREE.Mesh } | null = null;
function buildFragment(at: number[]) {
  const g = new THREE.Group();
  g.position.set(at[0], at[1], at[2]);
  const metal = new THREE.MeshStandardMaterial({ color: 0x6a6258, metalness: 0.75, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2620, metalness: 0.6, roughness: 0.7 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffd890 });
  // Bogenstück des Torrings mit abgerissenen Enden
  const ring = new THREE.Mesh(new THREE.TorusGeometry(160, 16, 10, 48, 2.2), metal);
  ring.rotation.set(0.35, 0.6, -0.4); g.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(160, 6, 6, 48, 2.2), glow);
  inner.rotation.copy(ring.rotation); inner.scale.setScalar(0.93); g.add(inner);
  // Rippen und Trümmerplatten am Ring
  for (let i = 0; i < 9; i++) {
    const a = (i / 8) * 2.2, rib = new THREE.Mesh(new THREE.BoxGeometry(10, 46, 22), dark);
    rib.position.set(Math.cos(a) * 160, Math.sin(a) * 160, 0); rib.rotation.z = a;
    ring.add(rib);
  }
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(rand(12, 30), rand(3, 6), rand(18, 40)), metal);
    p.position.set(rand(-180, 180), rand(-90, 90), rand(-120, 120)); p.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    g.add(p);
  }
  // Lichtkern in der Mitte des Bogens
  const light = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), glow);
  g.add(light);
  const core = new THREE.Sprite(glowMat(0xffd890, 0.9)); core.scale.setScalar(120); g.add(core);
  scene.add(g);
  frag = { g, core, light };
}
function dropFragment() { if (!frag) return; scene.remove(frag.g); frag.g.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); }); frag = null; }
// pro Bild: Kernstück zeigen, sobald es entdeckt ist (ab der dritten Peilung), auch nach dem Kapitel
export function updateChapter1(dt: number) {
  const s = P.story, v = s?.ch1, show = !!s && here() && (v === 'done' || (typeof v === 'number' && v >= 4));
  if (!show) { if (frag) dropFragment(); return; }
  if (!frag) buildFragment(places().frag);
  const lit = v !== 'done' && (typeof v === 'number' && v <= 6);
  const pulse = 0.75 + Math.sin(G.time * 3.2) * 0.25;
  frag!.core.visible = lit; frag!.light.visible = lit;
  if (lit) { frag!.core.scale.setScalar(110 * pulse + 20); frag!.light.rotation.y += dt * 0.8; }
  frag!.g.rotation.y += dt * 0.004;
}
