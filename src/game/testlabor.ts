import * as THREE from 'three';
import { P, G, stats, saveGame } from './state';
import { SECTOR } from '../data/galaxy';
import { PLANETS, planetBaseId } from '../data/planets';
import { SHIPS, SHIP_IDS, type ShipId } from '../data/ships';
import { GEAR_IDS, gearDef, KIND_N, RARITY, type GearKind } from '../data/gear';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { FIGUREN, Figur, neuesSkelett } from './figur';
import { figTracht } from './avatar';
import { addItem, equip } from './inventory';
import { buyShip, board, shipPrice } from './fleet';
import { setShipModel } from './player';
import { begegnungJetzt } from './begegnungen';
import { mannyAnim } from './mannyAvatar';
import { devMode } from './cheats';
import { TESTF } from './testflags';
import { WETTER, naechsterSturm } from './wetter';
import { FZ, FZ_IDS } from '../models/rover';
import { scene } from '../core/engine';
import { world } from './world';
import { releaseAll } from '../core/input';
import { radio } from '../ui/radio';
import { quartierHooks, eigeneDeko, quartierNr } from './quartier';
import { esc, fmtN } from '../core/util';
import type { Paint } from '../models/gltfShips';

// =====================================================================================
// Testlabor (seit 2026-11-24): Menü auf F8, nur auf dem Testserver (test.letztecrew.de), im Entwicklungsserver und mit ?dev=1.
// Wunsch des Nutzers: „Ich brauche eine Art Testumgebung auf unserem Testserver … damit ich Fahrzeuge, Waffen, Animationen, alles besser
// testen kann“ – ohne zwischen den Planeten hin und her zu fliegen und alles zu kaufen.
//  - Reisen: sofort zu jeder Station (zu Fuß im Hangar oder im All davor) und auf jeden Planeten (gelandet mit Dachs oder Wiesel, oder zu Fuß
//    an der Basis). Läuft über denselben Weg wie „Weiterspielen“ (main.ts resumeAt), also wie nach einem Neustart an diesem Ort.
//  - Ausrüstung: Credits, Auffüllen, jedes Schiff, beide Bodenfahrzeuge, jeder Gegenstand (Waffen, Helme, Westen …) in den Rucksack oder gleich
//    angelegt, Fracht.
//  - Figur & Animation: Figur wählen, Zeitlupe, Animator-Anzeige (Zustand und Clip-Gewichte der eigenen Figur), Clip-Vorführung: eine zweite
//    Figur vor dem Piloten spielt jeden Clip des Bewegungssatzes in Schleife.
//  - Welt: unverwundbar, Begegnung jetzt, Geschichte abschließen, Pause der Stationsaufgaben zurücksetzen.
// Spielstände auf dem Testserver ändern sich dadurch wirklich (dasselbe Gerät, eigener Speicher je Adresse).
// =====================================================================================

export const testAktiv = () => location.hostname.startsWith('test.') || !!(import.meta as any).env?.DEV || devMode();
/** von main.ts gesetzt: reise(ziel) – Ziel wie in den Optionen (st:<sektor>:<station>:in|out, pl:<sektor>:dachs|wiesel|basis);
 *  fuss(): Standpunkt der Figur zu Fuß (für die Vorführfigur), null wenn nicht zu Fuß */
export const testHooks = {
  reise: (_ziel: string) => {},
  fuss: (): { x: number; y: number; z: number; yaw: number } | null => null,
  schiffGewechselt: () => {},
};

let el: HTMLDivElement | null = null, dbg: HTMLDivElement | null = null, tab = 'reisen', offen = false;
const say = (s: string) => radio('TESTLABOR', s, '#c070ff');

const CSS = `
#tl{position:fixed;right:12px;top:12px;bottom:12px;width:400px;z-index:9998;background:rgba(8,12,16,.95);border:1px solid #2a4a5a;color:#dfe8f0;
 font:13px "Share Tech Mono",Consolas,monospace;display:flex;flex-direction:column;box-shadow:0 8px 30px rgba(0,0,0,.6)}
#tl header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #1e3a4a}
#tl header b{color:#c070ff;letter-spacing:2px}#tl header span{color:#8aa0b0;font-size:11px}
#tl nav{display:flex;border-bottom:1px solid #1e3a4a}#tl nav button{flex:1;background:none;border:0;color:#8aa0b0;padding:8px 2px;font:inherit;font-size:12px;cursor:pointer}
#tl nav button.on{color:#ffb347;box-shadow:inset 0 -2px #ffb347}
#tl .bd{overflow:auto;padding:10px 12px;flex:1}#tl h3{margin:14px 0 6px;color:#e09030;font-size:11px;letter-spacing:1.5px;text-transform:uppercase}
#tl h3:first-child{margin-top:2px}#tl select,#tl input[type=text],#tl input[type=number]{width:100%;box-sizing:border-box;background:#0e1820;color:#dfe8f0;border:1px solid #2a4a5a;padding:5px;font:inherit}
#tl .row{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap}#tl button.b{background:#14303e;color:#dfe8f0;border:1px solid #2f5a6e;padding:6px 10px;font:inherit;cursor:pointer}
#tl button.b:hover{background:#1c4256}#tl button.p{background:#8a5a12;border-color:#c08020}#tl button.p:hover{background:#a06a18}
#tl label{display:flex;gap:8px;align-items:center;margin:6px 0;cursor:pointer}#tl .h{color:#8aa0b0;font-size:11px;margin:4px 0}
#tl select[size]{height:auto}
#tldbg{position:fixed;left:12px;top:40px;z-index:9997;background:rgba(8,12,16,.82);color:#bfe8d8;font:11px Consolas,monospace;padding:6px 8px;white-space:pre;pointer-events:none;border-left:2px solid #4fd6c4}`;

function ziele(): [string, string][] {
  const o: [string, string][] = [['qu', 'Bastion · im eigenen Quartier (wird gratis gemietet)']];
  for (const [sid, s] of Object.entries(SECTOR)) {
    for (const st of s.stations) {
      o.push([`st:${sid}:${st.id}:in`, `${s.name} · ${st.name} – zu Fuß in der Station`]);
      o.push([`st:${sid}:${st.id}:out`, `${s.name} · ${st.name} – im All davor`]);
    }
    const pl = PLANETS[sid];
    if (pl) {
      o.push([`pl:${sid}:dachs`, `${pl.name} (Planet) – gelandet, im Dachs`]);
      o.push([`pl:${sid}:wiesel`, `${pl.name} (Planet) – gelandet, im Wiesel`]);
      if (pl.base) o.push([`pl:${sid}:basis`, `${pl.name} (Planet) – zu Fuß an der Basis ${pl.base}`]);
    }
  }
  return o;
}
const opt = (v: string, t: string, sel = false) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(t)}</option>`;

function html(): string {
  const tabs = [['reisen', 'Reisen'], ['aus', 'Ausrüstung'], ['fig', 'Figur & Animation'], ['welt', 'Welt']];
  let h = `<header><b>TESTLABOR</b><span>F8 schließen</span></header><nav>${tabs.map(([k, n]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${n}</button>`).join('')}</nav><div class="bd">`;
  if (G.mode === 'menu' || G.mode === 'intro' || !P.name) return h + `<p class="h">Erst ein Spiel starten oder weiterspielen.</p></div>`;
  if (tab === 'reisen') {
    h += `<h3>Sofort hin</h3><select id="tlZiel" size="16">${ziele().map(([v, t]) => opt(v, t)).join('')}</select>
      <div class="row"><button class="b p" data-a="reise">Hinreisen</button></div>
      <p class="h">Wie „Weiterspielen“ an diesem Ort: Stationen zu Fuß im Hangar, Planeten mit gelandetem Schiff daneben. Der Wiesel wird dafür freigeschaltet.</p>`;
  } else if (tab === 'aus') {
    const kinds = Object.keys(KIND_N) as GearKind[], k = (el?.querySelector('#tlKind') as HTMLSelectElement | null)?.value || 'waffe';
    const items = GEAR_IDS.filter(id => gearDef(id)!.kind === k);
    h += `<h3>Konto und Schiff</h3><div class="row"><button class="b" data-a="geld">+100.000 Cr</button><button class="b" data-a="voll">Alles auffüllen</button></div>
      <p class="h">Kontostand ${fmtN(P.credits)} Cr</p>
      <h3>Schiff wechseln</h3><select id="tlSchiff">${SHIP_IDS.map(id => opt(id, `${SHIPS[id].n} · ${SHIPS[id].role}`, id === P.cls)).join('')}</select>
      <div class="row"><button class="b" data-a="schiff">Einsteigen</button></div><p class="h">Das bisherige Schiff bleibt im Hangar der Station (bzw. der Heimatstation).</p>
      <h3>Bodenfahrzeug</h3><div class="row">${FZ_IDS.map(f => `<button class="b${(P.fahrzeug || 'dachs') === f ? ' p' : ''}" data-a="fz" data-k="${f}">${FZ[f].kurz}</button>`).join('')}</div>
      <p class="h">Wird beim nächsten Landen ausgesetzt (gelandet: [X] am Schiff tauscht). Beide sind danach freigeschaltet.</p>
      <h3>Gegenstand</h3><select id="tlKind">${kinds.map(x => opt(x, KIND_N[x], x === k)).join('')}</select>
      <div style="height:6px"></div><select id="tlItem" size="8">${items.map((id, i) => opt(id, `${gearDef(id)!.n} · ${RARITY[gearDef(id)!.rar].n}`, i === 0)).join('')}</select>
      <div class="row"><button class="b p" data-a="anlegen">Anlegen</button><button class="b" data-a="rucksack">In den Rucksack</button></div>
      <h3>Fracht</h3><select id="tlWare">${ITEM_IDS.map(id => opt(id, ITEMS[id].n)).join('')}</select>
      <div class="row"><button class="b" data-a="fracht">+20 in den Frachtraum</button><button class="b" data-a="leer">Frachtraum leeren</button></div>`;
  } else if (tab === 'fig') {
    const an = mannyAnim(), names: string[] = an?.clips?.byName ? [...an.clips.byName.keys()].sort() : [];
    const q = ((el?.querySelector('#tlQ') as HTMLInputElement | null)?.value || '').toLowerCase();
    const list = names.filter(n => !q || n.toLowerCase().includes(q)).slice(0, 400);
    h += `<h3>Figur</h3><div class="row">${FIGUREN.map(f => `<button class="b${P.figur === f.id ? ' p' : ''}" data-a="figur" data-k="${f.id}">${esc(f.n)}</button>`).join('')}</div>
      <h3>Zeit</h3><div class="row">${[1, 0.5, 0.25, 0.1].map(z => `<button class="b${TESTF.zeit === z ? ' p' : ''}" data-a="zeit" data-k="${z}">${z === 1 ? 'normal' : z.toString().replace('.', ',') + '×'}</button>`).join('')}</div>
      <p class="h">Zeitlupe gilt fürs ganze Spiel. Mit [V] auf Schulterblick, um die eigene Figur zu sehen.</p>
      <label><input type="checkbox" id="tlDbg"${dbg ? ' checked' : ''}> Animator-Anzeige (Zustand, Gangart, Clips der eigenen Figur)</label>
      <h3>Clip-Vorführung</h3>${names.length ? `<input type="text" id="tlQ" placeholder="Suche, z. B. Jump, Pivot, Crouch, Death" value="${esc(q)}">
      <div style="height:6px"></div><select id="tlClip" size="12">${list.map((n, i) => opt(n, n.replace(/^M_/, ''), i === 0)).join('')}</select>
      <p class="h">${list.length} von ${names.length} Clips${list.length >= 400 ? ' (Suche eingrenzen)' : ''}</p>
      <div class="row"><button class="b p" data-a="clip">Vor mir abspielen</button><button class="b" data-a="clipweg">Figur entfernen</button></div>
      <div class="row">${[0.25, 0.5, 1].map(r => `<button class="b${VOR.rate === r ? ' p' : ''}" data-a="rate" data-k="${r}">${r === 1 ? 'Tempo 1' : r.toString().replace('.', ',') + '×'}</button>`).join('')}</div>
      <p class="h">Nur zu Fuß: Eine zweite Figur in deiner Tracht steht 3 m vor dir und spielt den Clip in Schleife (ohne Wurzelbewegung).${VOR.name ? ` Läuft: ${esc(VOR.name)}` : ''}</p>`
      : '<p class="h">Der Bewegungssatz ist noch nicht geladen (erst einmal zu Fuß gehen).</p>'}`;
  } else {
    h += `<h3>Schalter</h3><label><input type="checkbox" id="tlGott"${TESTF.gott ? ' checked' : ''}> Unverwundbar (Schiff, zu Fuß, Mine)</label>
      <h3>Tageszeit und Wetter (Planeten)</h3>
      <div class="row">${[['uhr', 'Uhr'], ['0.3', 'Tag'], ['0.625', 'Dämmerung'], ['0.8', 'Nacht']].map(([k, n]) => `<button class="b${String(WETTER.force.zeit ?? 'uhr') === k ? ' p' : ''}" data-a="zeitT" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="row">${[['uhr', 'Uhr'], ['1', 'Sturm'], ['0', 'Klar']].map(([k, n]) => `<button class="b${String(WETTER.force.sturm ?? 'uhr') === k ? ' p' : ''}" data-a="sturmT" data-k="${k}">${n}</button>`).join('')}</div>
      <p class="h">${WETTER.planet ? `Gerade: ${WETTER.tag > 0.99 ? 'Tag' : WETTER.tag < 0.01 ? 'Nacht' : 'Dämmerung'}${WETTER.sturm > 0 ? `, ${WETTER.art?.n} ${Math.round(WETTER.sturm * 100)} %` : ''}. ${WETTER.art ? (() => { const s = naechsterSturm(WETTER.planet, WETTER.typ); return s === null ? 'Kein Sturm in den nächsten Stunden.' : s === 0 ? 'Sturm läuft.' : `Nächster Sturm in ${Math.round(s / 60)} min.`; })() : 'Hier gibt es kein Wetter.'}` : 'Wirkt auf Planeten.'}</p>
      <h3>Fahndung</h3><div class="row">${[0, 1, 2, 3].map(n => `<button class="b${(P.fahndung?.s || 0) === n ? ' p' : ''}" data-a="fahnd" data-k="${n}">${n ? '★'.repeat(n) : 'keine'}</button>`).join('')}</div>
      <p class="h">Ab zwei Sternen greifen Patrouillen an (nicht in Heimstatt), Andocken im Menschenraum nur gegen Bußgeld.</p>
      <h3>Begegnung unterwegs (im Flug)</h3><div class="row">${[['kapsel', 'Rettungskapsel'], ['treibgut', 'Treibgut'], ['panne', 'Panne'], ['angriff', 'Angriff']].map(([k, n]) => `<button class="b" data-a="beg" data-k="${k}">${n}</button>`).join('')}</div>
      <h3>Geschichte</h3><div class="row"><button class="b" data-a="story">Kapitel 1–5 abschließen</button></div>
      <p class="h">Danach stören keine Geschichtsszenen mehr beim Testen. Nicht rückgängig zu machen (Spielstand auf dem Testserver).</p>
      <h3>Stationsaufgaben</h3><div class="row"><button class="b" data-a="aufg">Pause zurücksetzen</button></div>`;
  }
  return h + '</div>';
}
function render() { if (el) el.innerHTML = html(); }

// ---------- Clip-Vorführung: eigene Figur mit eigenem Mischer ----------
const VOR = { sk: null as THREE.Object3D | null, fig: null as Figur | null, mixer: null as THREE.AnimationMixer | null, act: null as THREE.AnimationAction | null, name: '', rate: 1, laden: false };
async function vorfuehren(name: string) {
  const an = mannyAnim(), at = testHooks.fuss();
  if (!an?.clips || !at) { say('Clip-Vorführung geht nur zu Fuß, mit geladenem Bewegungssatz.'); return; }
  if (!VOR.sk) {
    if (VOR.laden) return;
    VOR.laden = true; const s = await neuesSkelett(); VOR.laden = false;
    if (!s) { say('Skelett nicht geladen.'); return; }
    VOR.sk = s; VOR.fig = new Figur(s); VOR.mixer = new THREE.AnimationMixer(s);
  }
  VOR.fig!.setzen(figTracht());
  const sk = VOR.sk!, fx = -Math.sin(at.yaw), fz = -Math.cos(at.yaw);
  const vx = at.x + fx * 3, vz = at.z + fz * 3, gy = world.ground ? world.ground(vx, vz) : null;
  sk.position.set(vx, gy ?? at.y, vz); sk.rotation.set(0, at.yaw, 0);      // schaut zum Piloten (das Skelett schaut nach +z)
  if (!sk.parent) scene.add(sk);
  VOR.mixer!.stopAllAction();
  const clip = an.clips.clip(name, { skip: new Set(['root']) });
  const a = VOR.mixer!.clipAction(clip); a.reset(); a.setLoop(THREE.LoopRepeat, Infinity); a.timeScale = VOR.rate; a.play(); VOR.act = a;
  VOR.name = name; render();
}
function vorWeg() { VOR.mixer?.stopAllAction(); VOR.sk?.removeFromParent(); VOR.name = ''; }

function act(a: string, k: string) {
  const v = (id: string) => (el?.querySelector('#' + id) as HTMLSelectElement | null)?.value || '';
  if (a === 'reise' && v('tlZiel') === 'qu') {      // Quartier: mieten (gratis), zu Fuß auf die Bastion, dann mit dem Aufzug hinauf
    P.quartier ||= { nr: quartierNr(P.name), seit: Date.now() };
    vorWeg(); zu(); testHooks.reise('st:heimstatt:bastion:in'); setTimeout(() => quartierHooks.fahren(P.name, eigeneDeko()), 1500); say('Reise: Quartier'); return;
  }
  if (a === 'reise') { const z = v('tlZiel'); if (!z) return; if (z.endsWith(':wiesel')) (P.fahrzeuge ||= []).includes('wiesel') || P.fahrzeuge!.push('wiesel'); vorWeg(); zu(); testHooks.reise(z); say('Reise: ' + (ziele().find(x => x[0] === z)?.[1] || z)); return; }
  if (a === 'geld') { P.credits += 100000; say(`+100.000 Credits · Kontostand ${fmtN(P.credits)}`); }
  if (a === 'voll') { const s = stats(); P.hull = s.maxHull; P.shield = s.maxShield; P.ammo = s.maxAmmo; P.rockets = s.maxRockets; P.charges = s.maxCharges; say('Hülle, Schild, Munition, Raketen und Ladungen aufgefüllt.'); }
  if (a === 'schiff') {
    const cls = v('tlSchiff') as ShipId; if (!SHIPS[cls] || cls === P.cls) return;
    const st = G.dockedAt?.id || P.home.station, loc = { sector: G.dockedAt ? P.sector : P.home.sector, station: st };
    P.credits += shipPrice(cls); const r = buyShip(cls, loc);
    if (r && board(r, loc)) { setShipModel(P.cls, (P.paint || 'Orange') as Paint); testHooks.schiffGewechselt(); say(`Du fliegst jetzt die ${P.shipName}.`); }
  }
  if (a === 'fz') { (P.fahrzeuge ||= []).includes('wiesel') || P.fahrzeuge!.push('wiesel'); P.fahrzeug = k; say(`Beim Landen wird der ${FZ[k as 'dachs'].kurz} ausgesetzt. Gelandet: [X] am Schiff tauscht.`); }
  if (a === 'anlegen' || a === 'rucksack') {
    const id = v('tlItem'), d = gearDef(id); if (!d) return;
    if (!addItem(id, 1)) { say('Rucksack voll.'); return; }
    if (a === 'anlegen') { const i = P.inv.map(x => x.id).lastIndexOf(id); const e = equip(i); say(e || `${d.n} angelegt.`); } else say(`${d.n} im Rucksack.`);
  }
  if (a === 'fracht') { const id = v('tlWare') as ItemId; P.cargo[id] = (P.cargo[id] || 0) + 20; say(`+20 ${ITEMS[id].n} (ohne Rücksicht auf den Frachtraum).`); }
  if (a === 'leer') { for (const id of ITEM_IDS) P.cargo[id] = 0; say('Frachtraum geleert.'); }
  if (a === 'figur') { P.figur = +k; say(`Figur: ${FIGUREN.find(f => f.id === +k)?.n}`); }
  if (a === 'zeit') { TESTF.zeit = +k; say(TESTF.zeit === 1 ? 'Zeit normal.' : `Zeitlupe ${String(TESTF.zeit).replace('.', ',')}×.`); }
  if (a === 'clip') { const n = v('tlClip'); if (n) void vorfuehren(n); return; }
  if (a === 'clipweg') vorWeg();
  if (a === 'rate') { VOR.rate = +k; if (VOR.act) VOR.act.timeScale = VOR.rate; }
  if (a === 'fahnd') { P.fahndung = { s: +k, t: Date.now() }; say(+k ? `Fahndungsstufe ${k} gesetzt.` : 'Fahndung aufgehoben.'); }
  if (a === 'zeitT') WETTER.force.zeit = k === 'uhr' ? null : +k;
  if (a === 'sturmT') WETTER.force.sturm = k === 'uhr' ? null : +k;
  if (a === 'beg') { const r = begegnungJetzt(k as any); say(r ? `Begegnung gestartet: ${r}. Marke im HUD.` : 'Begegnungen gibt es nur im Flug (Angriff nicht in Heimstatt).'); }
  if (a === 'story') { Object.assign(P.story, { prolog: 'done', ch1: 'done', ch2: 'done', ch3: 'done', ch4: 'done', ch5: 'done' }); say('Kapitel 1–5 als abgeschlossen markiert.'); }
  if (a === 'aufg') { P.aufgabenZuletzt = {}; say('Pause der Stationsaufgaben zurückgesetzt.'); }
  saveGame(); render();
}

// ---------- öffnen / schließen ----------
function blockKeys(e: KeyboardEvent) {
  if (!offen || e.code === 'F8') return;
  if (el && el.contains(e.target as Node) && e.code !== 'Escape') return;      // Eingaben im Menü (Suche): dort fängt das Menü selbst ab
  if (e.code === 'Escape' && e.type === 'keydown') { zu(); e.preventDefault(); e.stopPropagation(); return; }
  e.stopPropagation();      // das Spiel bekommt keine Tasten, solange das Testlabor offen ist (Eingaben im Menü gehen trotzdem)
}
function auf() {
  if (!el) {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'tl'; document.body.appendChild(el);
    for (const ev of ['mousedown', 'mouseup', 'click', 'wheel', 'pointerdown', 'keydown', 'keyup']) el.addEventListener(ev, e => e.stopPropagation());
    el.addEventListener('click', e => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null; if (!b) return;
      if (b.dataset.t) { tab = b.dataset.t; render(); return; }
      if (b.dataset.a) act(b.dataset.a, b.dataset.k || '');
    });
    el.addEventListener('change', e => {
      const t = e.target as HTMLElement;
      if (t.id === 'tlKind') render();
      if (t.id === 'tlGott') { TESTF.gott = (t as HTMLInputElement).checked; say(TESTF.gott ? 'Unverwundbar.' : 'Wieder verwundbar.'); }
      if (t.id === 'tlDbg') { if ((t as HTMLInputElement).checked) { dbg = document.createElement('div'); dbg.id = 'tldbg'; document.body.appendChild(dbg); } else { dbg?.remove(); dbg = null; } }
    });
    el.addEventListener('input', e => { const t = e.target as HTMLInputElement; if (t.id === 'tlQ') { const pos = t.selectionStart; render(); const q = el!.querySelector('#tlQ') as HTMLInputElement; q.focus(); q.setSelectionRange(pos, pos); } });
    el.addEventListener('dblclick', e => { const t = e.target as HTMLElement; if (t.tagName === 'OPTION') act((t.parentElement as HTMLElement).id === 'tlZiel' ? 'reise' : (t.parentElement as HTMLElement).id === 'tlClip' ? 'clip' : '', ''); });
  }
  offen = true; el.style.display = ''; render(); releaseAll();
  if (document.pointerLockElement) document.exitPointerLock();
}
function zu() { offen = false; if (el) el.style.display = 'none'; }

/** einmal beim Start (main.ts): F8 öffnet und schließt, sofern hier erlaubt */
export function initTestlabor() {
  if (!testAktiv()) return;
  window.addEventListener('keydown', e => { if (e.code === 'F8') { e.preventDefault(); if (offen) zu(); else auf(); } }, true);
  window.addEventListener('keydown', blockKeys, true); window.addEventListener('keyup', blockKeys, true);
}
/** jedes Bild (main.ts): Vorführfigur bewegen, Animator-Anzeige auffrischen */
let dbgT = 0;
export function updateTestlabor(dt: number) {
  if (VOR.mixer && VOR.sk?.parent) VOR.mixer.update(dt);
  if (dbg && (dbgT -= dt) <= 0) {
    dbgT = 0.1;
    const d = mannyAnim()?.getDebug?.();
    dbg.textContent = d ? `Zustand  ${d.state}\nGangart  ${d.gait}  Tempo ${d.locoSpeed}\nBlick    ${d.facingDeg}°  θ ${d.theta}°\nFüße     ${d.locks || '-'}\n` + (d.clips || []).slice(0, 8).map(([n, w]: [string, number]) => `${w.toFixed(2)}  ${n}`).join('\n') : 'Animator nicht aktiv (zu Fuß gehen)';
  }
}
