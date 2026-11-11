import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { rng, hashStr, d3, rand } from '../core/util';
import { snd, sfx } from '../core/audio';
import { SECTOR, SECTORS, findRoute } from '../data/galaxy';
import { P, G } from './state';
import { world } from './world';
import { burst } from './fx';
import { spawnEnemy } from './combat';
import { SHARED } from './shared';
import { addRep, level, contractFactor, stationFaction, REP, RANKS, type RepId } from './reputation';
import { radio } from '../ui/radio';

// =====================================================================================
// Fraktionsmissionen
// Jede Fraktion vergibt an ihren Stationen drei Missionen (Platz 1 für alle, Platz 2 ab „Bekannt“, Platz 3 ab
// „Vertraut“). Missionen werden unterwegs erfüllt, nicht an der Station abgegeben:
//  - jagd:       N Ferrox in einem Sektor abschießen
//  - vermessung: drei Messpunkte in einem Sektor anfliegen
//  - bergung:    Wrackfeld anfliegen, Bergungskapseln einsammeln (oft mit Ferrox-Hinterhalt)
//  - stock:      einen Ferrox-Bienenstock zerstören
// Lohn: Credits und viel Ruf. Abbrechen kostet Ruf. Höchstens zwei Missionen gleichzeitig.
// =====================================================================================
export type MType = 'jagd' | 'vermessung' | 'bergung' | 'stock';
export interface Mission {
  id: string; type: MType; fac: RepId; station: string; stName: string; sector: string; tgt: string;
  title: string; n: number; got: number; reward: number; rep: number; tier: number;
  pts?: number[][]; hit?: boolean[]; spawned?: boolean;
}
export const MAX_MISSIONS = 2;
export const TIER_LV = [0, 1, 3];   // nötiger Rang je Platz
const TN: Record<MType, string> = { jagd: 'Säuberung', vermessung: 'Vermessung', bergung: 'Bergung', stock: 'Bienenstock' };
export const missionTypeName = (t: MType) => TN[t];

const jumps = (a: string, b: string) => (findRoute(a, b)?.length || 99) - 1;
function nearSectors(from: string, ok: (id: string) => boolean, maxJ: number) {
  return SECTORS.filter(s => ok(s.id) && jumps(from, s.id) <= maxJ).map(s => s.id);
}
// welche Missionsarten eine Fraktion auf welchem Platz vergibt
function typesFor(f: RepId, tier: number): MType[] {
  if (f === 'rat') return tier === 2 ? ['bergung', 'jagd'] : ['bergung', 'jagd', 'bergung'];
  if (f === 'wacht') return tier === 2 ? ['stock', 'jagd'] : ['jagd', 'bergung', 'jagd'];
  return tier === 2 ? ['vermessung', 'bergung'] : ['vermessung', 'vermessung', 'bergung'];
}

// Angebote einer Station (deterministisch; ein neues Angebot erscheint, wenn man eins annimmt)
export function missionOffers(stationId: string, stName: string, sectorId: string): (Mission & { slot: number; minLv: number })[] {
  const f = stationFaction(stationId, sectorId);
  if (!f) return [];
  const out: (Mission & { slot: number; minLv: number })[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const key = `${stationId}:m${slot}`, ctr = P.cctr[key] || 0, R = rng(hashStr(`${key}:${ctr}`)), tier = slot;
    let type = R.pick(typesFor(f, tier));
    const deep = tier === 2;
    // Zielsektor je nach Art
    let cands: string[] = [];
    if (type === 'stock') cands = SECTORS.filter(s => (s.hives || 0) > 0).map(s => s.id);
    else if (type === 'jagd') cands = nearSectors(sectorId, id => SECTOR[id].danger >= 1 && (deep || SECTOR[id].faction !== 'ferrox') && (f !== 'rat' || SECTOR[id].faction !== 'ferrox'), deep ? 4 : 3);
    else if (type === 'vermessung') cands = nearSectors(sectorId, id => SECTOR[id].fields.length > 0 && (deep || SECTOR[id].faction !== 'ferrox'), deep ? 4 : 2);
    else cands = nearSectors(sectorId, id => (deep ? SECTOR[id].danger >= 2 : SECTOR[id].faction !== 'ferrox'), deep ? 4 : 2);
    if (!cands.length) { type = 'vermessung'; cands = nearSectors(sectorId, id => SECTOR[id].fields.length > 0 && SECTOR[id].faction !== 'ferrox', 3); }
    if (!cands.length) cands = [sectorId];
    const tgt = R.pick(cands), def = SECTOR[tgt], j = jumps(sectorId, tgt), dz = def.danger;
    const tierMul = [1, 1.5, 2.4][tier];
    let n = 1, base = 0, title = '';
    if (type === 'jagd') { n = Math.round(R.range(4, 7) + dz * 1.5 + tier * 2); base = 80 * n; title = `${n} Ferrox in ${def.name} abschießen`; }
    else if (type === 'vermessung') { n = 3; base = 520; title = `Drei Messpunkte in ${def.name} vermessen`; }
    else if (type === 'bergung') { n = Math.round(R.range(4, 6) + tier); base = 360 + n * 70; title = `Wrack in ${def.name} bergen: ${n} Kapseln`; }
    else { n = 1; base = 2600; title = `Ferrox-Bienenstock in ${def.name} zerstören`; }
    const reward = Math.round(base * tierMul * (1 + 0.25 * dz) * contractFactor(stationId, sectorId) / 10 + j * 12) * 10;
    const rep = Math.round(([8, 15, 30][tier] + dz * 3) * (type === 'stock' ? 2 : 1));
    const m: Mission & { slot: number; minLv: number } = { id: `${key}:${ctr}`, type, fac: f, station: stationId, stName, sector: sectorId, tgt, title, n, got: 0, reward, rep, tier, slot, minLv: TIER_LV[tier] };
    // Orte im Zielsektor festlegen (gleich für alle, die dieselbe Mission sehen)
    if (type === 'vermessung') {
      const fl = def.fields.length ? def.fields : [{ pos: [0, 0, 0], r: 2500 } as any];
      m.pts = [0, 1, 2].map(i => { const fd = fl[i % fl.length], a = R.range(0, 6.28), r = fd.r * R.range(0.3, 0.75); return [Math.round(fd.pos[0] + Math.cos(a) * r), Math.round(fd.pos[1] + R.range(-120, 120)), Math.round(fd.pos[2] + Math.sin(a) * r)]; });
      m.hit = [false, false, false];
    } else if (type === 'bergung') {
      const a = R.range(0, 6.28), r = R.range(1800, 3600);
      m.pts = [[Math.round(Math.cos(a) * r), Math.round(R.range(-250, 250)), Math.round(Math.sin(a) * r)]];
    }
    out.push(m);
  }
  return out;
}
export function acceptMission(o: Mission & { slot: number; minLv: number }) {
  if (P.missions!.length >= MAX_MISSIONS || P.missions!.some(m => m.id === o.id) || level(o.fac) < o.minLv) return false;
  const { slot, minLv, ...m } = o;
  P.missions!.push(m);
  const key = `${o.station}:m${slot}`;
  P.cctr[key] = (P.cctr[key] || 0) + 1;
  if (!P.track || !P.contracts.some(c => c.id === P.track)) P.track = m.id;
  return true;
}
export function abandonMission(m: Mission) {
  clearSite(m.id);
  P.missions = P.missions!.filter(x => x !== m);
  addRep(m.fac, m.tier === 2 ? -20 : -8);
}
function complete(m: Mission) {
  clearSite(m.id);
  P.missions = P.missions!.filter(x => x !== m);
  P.credits += m.reward; P.earned += m.reward;
  radio(REP[m.fac].n.toUpperCase(), `Mission erfüllt: ${m.title}. Lohn überwiesen: ${m.reward.toLocaleString('de-DE')} Credits.`, REP[m.fac].c);
  addRep(m.fac, m.rep);
  sfx('success', 0.6, 1, () => { snd(523, 0.2, 'triangle', 0.06, 0); setTimeout(() => snd(784, 0.3, 'triangle', 0.06, 0), 160); setTimeout(() => snd(1046, 0.4, 'triangle', 0.05, 0), 340); });
  missionHooks.completed(m);
}
export const missionHooks = { completed: (_m: Mission) => {} };
const inTarget = (m: Mission) => !!world.def && m.tgt === world.def.id && !world.surface;
function progress(m: Mission, txt: string) {
  if (m.got >= m.n) { complete(m); return; }
  radio(REP[m.fac].n.toUpperCase(), txt, REP[m.fac].c);
  snd(880, 0.08, 'sine', 0.04, 200);
}

// Abschüsse zählen (eigene Treffer; im Mehrspieler auch die vom Gastgeber bestätigten)
SHARED.onKill = (type: string) => {
  for (const m of [...(P.missions || [])]) {
    if (!inTarget(m)) continue;
    if (m.type === 'jagd' && type !== 'mother') { m.got++; progress(m, `Säuberung ${m.got}/${m.n}.`); }
    else if (m.type === 'stock' && type === 'mother') { m.got = 1; progress(m, ''); }
  }
};

// ---------- Orte im Sektor: Messpunkte, Wrackfeld und Kapseln ----------
interface Site { id: string; sector: string; g: THREE.Group; caps: { m: THREE.Object3D; x: number; y: number; z: number; got: boolean }[] }
const sites = new Map<string, Site>();
const CAP_GEO = new THREE.BoxGeometry(3, 3, 5), CAP_M = new THREE.MeshStandardMaterial({ color: 0xd8b060, metalness: 0.6, roughness: 0.4, emissive: 0x3a2a08 });
const WRECK_M = new THREE.MeshStandardMaterial({ color: 0x4a4f58, metalness: 0.7, roughness: 0.6 });
function clearSite(id: string) { const s = sites.get(id); if (!s) return; scene.remove(s.g); s.g.traverse((c: any) => { if (c.isMesh && c.geometry !== CAP_GEO) c.geometry.dispose(); }); sites.delete(id); }
function buildWreck(m: Mission) {
  const [x, y, z] = m.pts![0], R = rng(hashStr(m.id)), g = new THREE.Group();
  g.position.set(x, y, z);
  // Rumpfteile eines zerbrochenen Frachters
  for (let i = 0; i < 7; i++) {
    const w = R.range(8, 26), h = R.range(5, 12), l = R.range(14, 46);
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, l), WRECK_M);
    part.position.set(R.range(-70, 70), R.range(-25, 25), R.range(-70, 70));
    part.rotation.set(R.range(0, 3), R.range(0, 3), R.range(0, 3));
    g.add(part);
  }
  const caps: Site['caps'] = [];
  for (let i = 0; i < m.n; i++) {
    const c = new THREE.Mesh(CAP_GEO, CAP_M), gl = new THREE.Sprite(glowMat(0xffc860, 0.8));
    gl.scale.setScalar(14); c.add(gl);
    const a = R.range(0, 6.28), r = R.range(60, 220);
    c.position.set(Math.cos(a) * r, R.range(-60, 60), Math.sin(a) * r);
    g.add(c);
    caps.push({ m: c, x: x + c.position.x, y: y + c.position.y, z: z + c.position.z, got: false });
  }
  scene.add(g);
  sites.set(m.id, { id: m.id, sector: m.tgt, g, caps });
}

// pro Bild im Flug
export function updateMissions(dt: number) {
  const list = P.missions || [];
  // Orte anderer Sektoren aufräumen
  for (const s of [...sites.values()]) if (!world.def || s.sector !== world.def.id || world.surface || !list.some(m => m.id === s.id)) clearSite(s.id);
  if (G.mode !== 'play' || G.dead) return;
  for (const m of [...list]) {
    if (!inTarget(m)) continue;
    if (m.type === 'vermessung' && m.pts && m.hit) {
      m.pts.forEach((p, i) => {
        if (m.hit![i] || d3(p[0], p[1], p[2], P.x, P.y, P.z) > 160) return;
        m.hit![i] = true; m.got = m.hit!.filter(Boolean).length;
        burst(p[0], p[1], p[2], '#ffb347', 30, 60, 0.8);
        progress(m, `Messpunkt ${i + 1} vermessen (${m.got}/${m.n}).`);
      });
    } else if (m.type === 'bergung' && m.pts) {
      const [x, y, z] = m.pts[0], d = d3(x, y, z, P.x, P.y, P.z);
      let s = sites.get(m.id);
      if (!s && d < 6000) { buildWreck(m); s = sites.get(m.id)!; s.caps.forEach((c, i) => { if (i < m.got) { c.got = true; c.m.visible = false; } }); }
      if (!s) continue;
      for (const c of s.caps) c.m.rotation.y += dt * 0.8;
      // Hinterhalt beim ersten Anflug (nur wer die Ferrox steuert, also nicht als Mitspieler)
      if (!m.spawned && d < 900) {
        m.spawned = true;
        const dz = SECTOR[m.tgt].danger;
        if (dz >= 1 && !SHARED.client) {
          const nn = Math.min(6, 1 + dz + m.tier);
          for (let i = 0; i < nn; i++) spawnEnemy(i === 0 && dz >= 3 ? 'bomber' : 'drone', x + rand(-600, 600), y + rand(-150, 150), z + rand(-600, 600));
          radio(REP[m.fac].n.toUpperCase(), 'Ferrox am Wrackfeld! Das war eine Falle. Kapseln sichern und durchhalten!', '#ff6b5b');
        }
      }
      for (const c of s.caps) {
        if (c.got || d3(c.x, c.y, c.z, P.x, P.y, P.z) > 26) continue;
        c.got = true; c.m.visible = false; m.got++;
        burst(c.x, c.y, c.z, '#ffc860', 24, 40, 0.6);
        progress(m, `Kapsel geborgen (${m.got}/${m.n}).`);
      }
    }
  }
}

// ---------- Anzeige ----------
export const trackedMission = () => (P.missions || []).find(m => m.id === P.track) || null;
// Markierungen für das HUD im aktuellen Sektor
export function missionMarkers() {
  const out: { x: number; y: number; z: number; label: string; col: string; big?: boolean }[] = [];
  for (const m of P.missions || []) {
    if (!inTarget(m)) continue;
    const col = REP[m.fac].c;
    if (m.type === 'vermessung' && m.pts) m.pts.forEach((p, i) => { if (!m.hit![i]) out.push({ x: p[0], y: p[1], z: p[2], label: `MESSPUNKT ${i + 1}`, col, big: true }); });
    if (m.type === 'bergung' && m.pts) {
      const s = sites.get(m.id);
      if (!s) out.push({ x: m.pts[0][0], y: m.pts[0][1], z: m.pts[0][2], label: 'WRACKFELD', col, big: true });
      else for (const c of s.caps) if (!c.got) out.push({ x: c.x, y: c.y, z: c.z, label: 'KAPSEL', col });
    }
  }
  return out;
}
// Zeilen für das Aufgabenfeld rechts oben
export function missionLines(m: Mission): { title: string; lines: [string, boolean, boolean][]; tgtHere: boolean } {
  const tgt = SECTOR[m.tgt], here = inTarget(m), L: [string, boolean, boolean][] = [];
  if (m.type === 'jagd') L.push([`Ferrox in ${tgt.name} abschießen · <b>${m.got}/${m.n}</b>`, false, false]);
  else if (m.type === 'stock') L.push([`Bienenstock in ${tgt.name} zerstören`, false, false]);
  else if (m.type === 'vermessung') m.pts!.forEach((p, i) => L.push([`Messpunkt ${i + 1}${here && !m.hit![i] ? ` · <b>${fmtDist(d3(p[0], p[1], p[2], P.x, P.y, P.z))}</b>` : ''}`, !!m.hit![i], false]));
  else if (m.type === 'bergung') {
    const [x, y, z] = m.pts![0];
    L.push([`Wrackfeld in ${tgt.name} anfliegen${here ? ` · <b>${fmtDist(d3(x, y, z, P.x, P.y, P.z))}</b>` : ''}`, m.got > 0 || !!sites.get(m.id), false]);
    L.push([`Kapseln bergen · <b>${m.got}/${m.n}</b>`, false, false]);
  }
  return { title: `${TN[m.type]} · ${REP[m.fac].n}`, lines: L, tgtHere: here };
}
const fmtDist = (d: number) => (d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m');
export const minRankName = (lv: number) => RANKS[lv].n;
