// Logiktest der Gegner-KI (src/game/ki/) ohne Bild: node scripts/kitest.mjs
// Baut die KI mit Ersatzmodulen für Node (scripts/kitest/), prüft die Bausteine einzeln und lässt dann einen Trupp Plünderer gegen einen
// stehenden Spieler kämpfen (60 s Spielzeit). Gibt aus, was der Trupp tut, und bricht bei verletzten Erwartungen mit Fehler ab.
import { execFileSync } from 'child_process';
import path from 'path';
import { pathToFileURL } from 'url';

execFileSync(process.execPath, ['scripts/kitest/build.mjs'], { stdio: 'inherit' });
const K = await import(pathToFileURL(path.resolve('scripts/kitest/.out.mjs')).href);
const { T, G, FELD_EXTRA, typen, deckung, sinne, gehirn, navi } = K;

let fehler = 0;
const ok = (c, t) => { console.log((c ? '  ok    ' : '  FEHLER ') + t); if (!c) fehler++; };

// ---------- 1. Strahl gegen Quader ----------
console.log('1. Strahl gegen Quader');
{
  const q = { x: 0, z: 0, y0: 0, hx: 1, hz: 0.3, h: 1.1, yaw: 0 };
  ok(Math.abs(typen.strahlQuader(q, 0, 0.5, -5, 0, 0, 1, 10) - 4.7) < 1e-6, 'trifft die Vorderseite in 4,7 m');
  ok(typen.strahlQuader(q, 0, 1.5, -5, 0, 0, 1, 10) < 0, 'über der Kante vorbei (1,5 m hoch)');
  const r = { ...q, yaw: Math.PI / 2 };          // gedreht: jetzt lang in z
  ok(Math.abs(typen.strahlQuader(r, 0, 0.5, -5, 0, 0, 1, 10) - 4) < 1e-6, 'gedrehter Quader: trifft in 4 m');
  ok(typen.imQuader(r, 0, 0.9) && !typen.imQuader(r, 0.9, 0), 'Punkt im gedrehten Quader');
}

// ---------- 2. Deckung ----------
console.log('2. Deckungspunkte');
{
  const wall = { x: 0, z: 0, y0: 0, hx: 1.7, hz: 0.35, h: 1.1, yaw: 0 };       // halbhoch, lang in x
  const turm = { x: 8, z: 0, y0: 0, hx: 0.65, hz: 0.65, h: 2.0, yaw: 0 };       // hoch
  const qs = [wall, turm];
  const sicht = (ax, ay, az, bx, by, bz) => { const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz); return !qs.some(q => typen.strahlQuader(q, ax, ay, az, dx / d, dy / d, dz / d, d) >= 0); };
  const liste = deckung.erzeugeDeckung(qs, () => 0, () => true);
  ok(liste.filter(d => d.q === 0).length >= 6, `Wall: ${liste.filter(d => d.q === 0).length} Punkte`);
  ok(liste.filter(d => d.q === 1 && d.seite !== 0).length >= 4, 'hoher Stapel: Punkte an den Kanten zum Herauslehnen');
  const feind = { x: 0, y: 1.6, z: 20 };
  const best = deckung.besteDeckung(liste, { ich: { x: 0, z: -6, id: 1 }, ziel: feind, ideal: [10, 32], kameraden: [] }, sicht);
  ok(!!best && best.d.z < 0, `beste Deckung liegt auf der abgewandten Seite (z = ${best?.d.z.toFixed(2)})`);
  ok(!!best && deckung.schuetzt(best.d, feind.x, feind.y, feind.z, sicht), 'schützt vor dem Ziel');
  const sp = best && deckung.schussPunkt(best.d);
  ok(!!sp && sicht(sp.x, sp.y, sp.z, feind.x, feind.y - 0.2, feind.z), 'Schusslinie aus der Schussposition frei');
  const flanke = deckung.besteDeckung(liste, { ich: { x: 4, z: -6, id: 1 }, ziel: feind, ideal: [10, 32], kameraden: [], flanke: { x: 1, z: 0 } }, sicht);
  ok(!!flanke && flanke.d.q === 1, 'Flanke nach rechts wählt den Stapel rechts');
}

// ---------- 3. Wahrnehmung ----------
console.log('3. Wahrnehmung');
{
  const frei = () => true, zu = () => false;
  const zeit = (d, geduckt = false, s = frei) => {
    const w = sinne.neueSinne(); let t = 0;
    while (t < 10) { if (sinne.sinneUpdate(w, { x: 0, y: 1.6, z: 0, yaw: 0, alarm: false }, [{ id: 1, x: 0, y: 1.6, z: d, geduckt, bewegt: false }], s, 0.15, t)) return t + 0.15; t += 0.15; }
    return Infinity;
  };
  const t5 = zeit(5), t30 = zeit(30), t45 = zeit(45), tg = zeit(30, true);
  ok(t5 < 0.8, `5 m: entdeckt nach ${t5.toFixed(2)} s`);
  ok(t30 > t5 && t30 < 3, `30 m: entdeckt nach ${t30.toFixed(2)} s`);
  ok(t45 > t30, `45 m: entdeckt nach ${t45.toFixed(2)} s (später)`);
  ok(tg > t30, `30 m geduckt: ${tg.toFixed(2)} s (später als stehend)`);
  ok(zeit(10, false, zu) === Infinity, 'hinter einer Wand: nie entdeckt');
  const hinten = sinne.neueSinne();
  for (let t = 0; t < 3; t += 0.15) sinne.sinneUpdate(hinten, { x: 0, y: 1.6, z: 0, yaw: Math.PI, alarm: false }, [{ id: 1, x: 0, y: 1.6, z: 20, geduckt: false, bewegt: false }], frei, 0.15, t);
  ok(hinten.wach === 0, 'im Rücken (20 m): nicht gesehen');
  const h = sinne.neueSinne(); sinne.hoeren(h, { x: 0, z: 0 }, { x: 10, y: 0, z: 10, r: 60 }, 0);
  ok(h.wach >= 0.35 && !!h.zuletzt, 'Schuss gehört: verdächtig, Stelle gemerkt');
}

// ---------- 4. Entscheiden ----------
console.log('4. Entscheiden');
{
  const basis = { hp: 1, mag: 1, wach: 1, sieht: true, zielDist: 20, zuletztAlter: 0, inDeckung: false, deckungFrei: true, unterFeuer: 0, feuerFrei: true, granate: false, rolle: 'feuer', truppAnteil: 1, ideal: [10, 32], flankeFrei: true, aktion: 'streife', zeit: 0 };
  const w = l => gehirn.waehle({ ...basis, ...l }).aktion;
  ok(w({ wach: 0, sieht: false, zielDist: Infinity, zuletztAlter: Infinity }) === 'streife', 'ruhig: Streife');
  ok(w({ wach: 0.5, sieht: false, zuletztAlter: 2 }) === 'untersuchen', 'verdächtig: nachsehen');
  ok(w({ unterFeuer: 0.6 }) === 'deckung', 'unter Feuer im Freien: Deckung');
  ok(w({ inDeckung: true, aktion: 'deckung' }) === 'schiessen', 'in Deckung mit Sicht: schießen');
  ok(w({ inDeckung: true, mag: 0, aktion: 'schiessen' }) === 'nachladen', 'Magazin leer: nachladen');
  ok(w({ granate: true }) === 'ausweichen', 'Granate: ausweichen');
  ok(w({ hp: 0.15, unterFeuer: 0.9, truppAnteil: 0.25, inDeckung: true, aktion: 'schiessen' }) === 'rueckzug', 'schwer verletzt, Trupp fast weg: Rückzug');
  ok(w({ rolle: 'vor', sieht: false, zuletztAlter: 3, inDeckung: true, aktion: 'sichern', zeit: 6 }) === 'flankieren', 'Rolle vor, Ziel verloren: flankieren');
  const f = new gehirn.Freigabe(2, 1);
  ok(f.frei(1, 0, true) && f.frei(2, 0, true) && !f.frei(3, 0, true), 'höchstens zwei Feuerfreigaben');
  ok(f.frei(3, 2, true), 'Freigabe wandert nach Ablauf weiter');
}

// ---------- 5. Navmesh ----------
console.log('5. Navmesh (recast)');
const rc = await import(K.MANIFEST_URL || pathToFileURL(path.resolve('public', JSON.parse((await import('fs')).readFileSync('public/assets/manifest.json', 'utf8')).files['lazy/Recast'].url)).href);
await navi.setzeRecast(rc);
{
  // welliges Gelände mit einer Mulde
  T.boden = (x, z) => 1.5 * Math.sin(x * 0.05) + 1.2 * Math.cos(z * 0.07);
  const t0 = performance.now();
  const lagerMod = await import(pathToFileURL(path.resolve('scripts/kitest/.out.mjs')).href);
  const L = lagerMod.lagerAufstellen(0, 0, 4711, 4, false);
  await new Promise(r => setTimeout(r, 50));
  for (let i = 0; i < 40 && !lagerMod.lagerInfo().navmesh; i++) await new Promise(r => setTimeout(r, 50));
  const info = lagerMod.lagerInfo();
  ok(info.navmesh, `Navmesh gebaut (${(performance.now() - t0).toFixed(0)} ms inkl. Laden), ${info.deckung} Deckungspunkte, ${L.plan.quader.length} Hindernisse`);
  if (L.navi) {
    let durch = 0, n = 0;
    for (let k = 0; k < 30; k++) {
      const a = k * 2.4, b = a + Math.PI;
      const w = L.navi.weg({ x: Math.cos(a) * 25, y: T.boden(Math.cos(a) * 25, Math.sin(a) * 25), z: Math.sin(a) * 25 }, { x: Math.cos(b) * 25, y: 0, z: Math.sin(b) * 25 });
      if (!w.length) continue; n++;
      for (let i = 1; i < w.length; i++) for (let s = 0; s <= 10; s++) { const x = w[i - 1].x + (w[i].x - w[i - 1].x) * s / 10, z = w[i - 1].z + (w[i].z - w[i - 1].z) * s / 10; if (L.plan.quader.some(q => typen.imQuader(q, x, z, 0.1))) { durch++; break; } }
    }
    ok(n >= 25 && durch === 0, `${n} Wege quer durchs Lager, keiner durch ein Hindernis`);
  }
  lagerMod.lagerWeg();
}

// ---------- 6. Gefecht: Trupp gegen stehenden Spieler ----------
console.log('6. Gefecht (60 s): Trupp von 4 gegen einen Spieler 40 m vor dem Lager, der alle 1,5 s schießt');
{
  T.boden = (x, z) => 0.8 * Math.sin(x * 0.04) + 0.6 * Math.cos(z * 0.05);
  const L = K.lagerAufstellen(0, 0, 1234, 4, false);
  for (let i = 0; i < 40 && !K.lagerInfo().navmesh; i++) await new Promise(r => setTimeout(r, 50));
  const me = { x: 0, y: T.boden(0, 40), z: 40, active: true, down: false, geduckt: false, vx: 0, vz: 0 };
  const dt = 1 / 30, stats = {}, deckZeit = {}, erste = { entdeckt: -1, schuss: -1, deckung: -1 };
  let schussT = 1.5, eigeneTreffer = 0, eigeneSchuesse = 0, imFreienBeschossen = 0, ausDeckungGeschossen = 0, letzteSchuesse = 0;
  for (let t = 0; t < 60; t += dt) {
    G.time = t;
    FELD_EXTRA.update(dt, me);
    for (const p of L.pl) {
      if (p.tot) continue;
      stats[p.aktion] = (stats[p.aktion] || 0) + dt;
      if (erste.entdeckt < 0 && p.sinne.wach >= 1) erste.entdeckt = t;
      const anD = p.deck && Math.hypot(p.deck.x - p.x, p.deck.z - p.z) < 0.8;
      if (anD) deckZeit[p.id] = (deckZeit[p.id] || 0) + dt;
      if (erste.deckung < 0 && anD) erste.deckung = t;
    }
    if (process.env.KITRACE && Math.abs(t * 2 - Math.round(t * 2)) < dt) console.log(`     t=${t.toFixed(1)} ` + L.pl.map(p => p.tot ? 'tot' : `${p.aktion}/${p.phase} w${p.sinne.wach.toFixed(1)}${p.sinne.sieht ? 'S' : '-'} d${p.deck ? Math.hypot(p.deck.x - p.x, p.deck.z - p.z).toFixed(1) : '-'} hp${p.hp.toFixed(0)} [${p.werte ? Object.entries(p.werte).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([k, v]) => k.slice(0, 4) + v.toFixed(2)).join(' ') : ''}]`).join(' | '));
    if (T.schuesse > letzteSchuesse) {
      if (erste.schuss < 0) erste.schuss = t;
      // wer hat gerade geschossen: aus Deckung oder im Freien?
      for (const p of L.pl) if (!p.tot && p.aktion === 'schiessen') { if (p.deck && Math.hypot(p.deck.x - p.x, p.deck.z - p.z) < 1.2) ausDeckungGeschossen++; else imFreienBeschossen++; break; }
      letzteSchuesse = T.schuesse;
    }
    // der Spieler schießt alle 1,5 s auf den nächsten sichtbaren Plünderer (Brust), Schaden 15
    if ((schussT -= dt) <= 0) {
      schussT = 1.5;
      const ey = me.y + 1.55;
      const ziel = L.pl.filter(p => !p.tot).sort((a, b) => Math.hypot(a.x - me.x, a.z - me.z) - Math.hypot(b.x - me.x, b.z - me.z))[0];
      if (ziel) {
        eigeneSchuesse++;
        const tx = ziel.x, ty = ziel.y + (ziel.geduckt ? 0.8 : 1.3), tz = ziel.z, d = Math.hypot(tx - me.x, ty - ey, tz - me.z);
        const dx = (tx - me.x) / d, dy = (ty - ey) / d, dz = (tz - me.z) / d;
        const wand = FELD_EXTRA.wand(me.x, ey, me.z, dx, dy, dz, 120);
        const h = FELD_EXTRA.ziel(me.x, ey, me.z, dx, dy, dz, wand);
        if (h) { h.treffer(15); eigeneTreffer++; }
        FELD_EXTRA.laerm(me.x, ey, me.z, 70);
      }
    }
  }
  const sum = Object.values(stats).reduce((a, b) => a + b, 0);
  console.log('     Aktionen (Anteil der Zeit):', Object.entries(stats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / sum * 100).toFixed(0)} %`).join(', '));
  console.log(`     entdeckt nach ${erste.entdeckt.toFixed(1)} s, erste Deckung nach ${erste.deckung.toFixed(1)} s, erster Schuss nach ${erste.schuss.toFixed(1)} s`);
  console.log(`     Plünderer: ${T.schuesse} Schüsse, ${T.treffer} Treffer (${(T.treffer / Math.max(1, T.schuesse) * 100).toFixed(0)} %), Schaden am Spieler ${T.hurt.toFixed(0)}; Salven aus Deckung ${ausDeckungGeschossen}, im Freien ${imFreienBeschossen}`);
  console.log(`     Spieler: ${eigeneSchuesse} Schüsse, ${eigeneTreffer} Treffer; Plünderer am Ende ${L.pl.filter(p => !p.tot).length}/4 am Leben`);
  console.log('     Zeit an einer Deckung je Plünderer:', L.pl.map(p => `${p.id % 16}: ${(deckZeit[p.id] || 0).toFixed(0)} s${p.tot ? ' (tot)' : ''}`).join(', '));
  ok(erste.entdeckt >= 0 && erste.entdeckt < 6, 'Spieler entdeckt');
  ok(erste.deckung >= 0, 'der Trupp geht in Deckung');
  ok(T.schuesse > 20, 'der Trupp schießt');
  ok(T.treffer / Math.max(1, T.schuesse) < 0.5, 'Trefferquote unter 50 % (fair)');
  ok(ausDeckungGeschossen >= imFreienBeschossen, 'meist aus der Deckung geschossen');
  ok(eigeneTreffer < eigeneSchuesse, 'Deckung hält einen Teil der Spielerschüsse ab');
  ok((stats.flankieren || 0) > 0 || (stats.stuermen || 0) > 0, 'jemand rückt vor oder flankiert');
  K.lagerWeg();
}

// ---------- 7. Gehört, nicht gesehen ----------
console.log('7. Schuss hinter einem Hügel: der Trupp sieht nach');
{
  T.boden = (x, z) => (Math.abs(z - 30) < 6 ? 6 * Math.cos((z - 30) / 6 * Math.PI / 2) : 0);   // Wall aus Erde bei z = 30
  const L = K.lagerAufstellen(0, 0, 99, 4, false);
  for (let i = 0; i < 40 && !K.lagerInfo().navmesh; i++) await new Promise(r => setTimeout(r, 50));
  const me = { x: 0, y: 0, z: 44, active: true, down: false, geduckt: true, vx: 0, vz: 0 };
  G.time = 100;
  FELD_EXTRA.laerm(me.x, 1, me.z, 70);
  const start = L.pl.map(p => Math.hypot(p.x - me.x, p.z - me.z));
  let unters = 0;
  for (let t = 0; t < 12; t += 1 / 30) { G.time = 100 + t; FELD_EXTRA.update(1 / 30, me); unters += L.pl.filter(p => p.aktion === 'untersuchen').length / 30; }
  const naeher = L.pl.filter((p, i) => Math.hypot(p.x - me.x, p.z - me.z) < start[i] - 3).length;
  ok(unters > 3, `untersucht (${unters.toFixed(0)} Plünderer-Sekunden)`);
  ok(naeher >= 1, `${naeher} von 4 sind näher gekommen`);
  K.lagerWeg();
}

console.log(fehler ? `\n${fehler} Prüfung(en) fehlgeschlagen.` : '\nAlle Prüfungen bestanden.');
process.exit(fehler ? 1 : 0);
