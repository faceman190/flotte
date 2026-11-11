// =====================================================================================
// Letzte Flotte – Mehrspieler-Server
// Liefert das gebaute Spiel (dist/) aus und verbindet die Piloten über WebSocket (/ws).
// Jeder Sektor ist ein Raum (Planetenoberflächen eigene Räume); Positionen gehen nur an Piloten im selben Raum,
// Chat und die Online-Liste an alle. Pilotenkonten mit Kennwort speichern den Spielstand auf dem Server (store.mjs).
// Gemeinsame Welt: Der erste Pilot in einem Raum ist Gastgeber und rechnet die Asteroiden; er schickt den Stand ('w')
// an die anderen, deren Abbau-Meldungen ('a') gehen an ihn. Den Markt (Preissättigung je Station) führt der Server.
// Handel zwischen Piloten in derselben Station ('tr'): der Server führt Anfrage, Angebote und beidseitige Bestätigung.
// Start: node server/server.mjs   (Port über PORT, Standard 2567)
// =====================================================================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { openStore, storeInfo } from './store.mjs';

const PORT = +(process.env.PORT || 2567);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };

// ---------- Spiel ausliefern ----------
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  // Statusseite: Speicherart und ggf. Datenbankfehler (ohne Zugangsdaten), Anzahl Piloten online
  if (p === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(JSON.stringify({ store: store.kind.startsWith('Datei') ? 'Datei' : store.kind, databaseUrlGesetzt: storeInfo.dbUrlSet, datenbankFehler: storeInfo.dbError || null, datenbankRechner: storeInfo.dbHost || null, online: clients.size, laeuftSeitSekunden: Math.round(now()) }));
    return;
  }
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Nicht gefunden'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ---------- Konten ----------
const store = await openStore();
console.log('Spielstände: ' + store.kind);
const NAME_RE = /^[A-Za-zÄÖÜäöüß0-9 _-]{3,16}$/;
const keyOf = name => name.trim().toLowerCase();
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const hashPass = (pass, salt) => new Promise((ok, no) => crypto.scrypt(pass, salt, 32, (e, k) => (e ? no(e) : ok(k.toString('hex')))));
const sameHex = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
const MAX_SAVE = 400 * 1024;
async function newToken(rec, key) {
  const raw = crypto.randomBytes(24).toString('hex');
  rec.tokens = [sha(raw), ...(rec.tokens || [])].slice(0, 5);   // höchstens fünf angemeldete Geräte
  return key + ':' + raw;
}
// Spielstand prüfen: ein Objekt, nicht zu groß, Name gleich dem Kontonamen
function cleanSave(data, name) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (JSON.stringify(data).length > MAX_SAVE) return null;
  return { ...data, name };
}

// ---------- Piloten und Räume ----------
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 });
const clients = new Map();   // ws → { id, name, room, st, chatT, joinN }
let nextId = 1, joinCounter = 0;
const T0 = Date.now(), now = () => (Date.now() - T0) / 1000;
// Markt: Station → Ware → { s: Sättigung, t: Serverzeit }; erholt sich wie im Spiel (Zeitkonstante 600 s)
const market = {};
const satNow = (m) => (m ? m.s * Math.exp(-(now() - m.t) / 600) : 0);
// Gastgeber eines Raums: wer am längsten drin ist
const hostOf = room => { let h = null; for (const c of clients.values()) if (c.room === room && (!h || c.joinN < h.joinN)) h = c; return h; };
const wsOf = c => { for (const [ws, o] of clients) if (o === c) return ws; return null; };
const announceHost = room => { if (!room) return; const h = hostOf(room); toRoom(room, { t: 'host', id: h ? h.id : 0 }); };
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const toRoom = (room, m, except) => { const s = JSON.stringify(m); for (const [ws, c] of clients) if (c.room === room && ws !== except && ws.readyState === 1) ws.send(s); };
const toAll = m => { const s = JSON.stringify(m); for (const ws of clients.keys()) if (ws.readyState === 1) ws.send(s); };
const roster = () => toAll({ t: 'roster', list: [...clients.values()].filter(c => c.name).map(c => ({ id: c.id, name: c.name, room: c.room })) });

wss.on('connection', ws => {
  const c = { id: nextId++, name: '', room: '', st: null, chatT: 0, account: null, tries: [], saveT: 0 };
  clients.set(ws, c);
  // temp: auf Render ohne Datenbank verschwinden Spielstände beim Neustart (kostenloser Plan ohne dauerhaften Speicher)
  send(ws, { t: 'welcome', id: c.id, online: clients.size, now: now(), market, temp: !!process.env.RENDER && store.kind.startsWith('Datei') });
  ws.on('message', async raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'register' || m.t === 'login' || m.t === 'save' || m.t === 'logout') {
      try { await account(ws, c, m); } catch (e) { console.error('Konto-Fehler:', e.message); send(ws, { t: 'auth', ok: false, err: 'Serverfehler beim Speichern. Bitte später erneut versuchen.' }); }
      return;
    }
    if (m.t === 'hello') {
      if (c.account) return;   // angemeldete Piloten behalten ihren Kontonamen
      c.name = clean(m.name, 16) || `Pilot ${c.id}`;
      console.log(`+ ${c.name} (#${c.id})`);
      roster();
    } else if (m.t === 'room') {
      const room = clean(m.room, 40);
      if (room === c.room) return;
      const old = c.room;
      if (c.trade) endTrade(c.trade, `${c.name} hat die Station verlassen.`);
      if (old) toRoom(old, { t: 'leave', id: c.id }, ws);
      c.room = room; c.st = null; c.joinN = ++joinCounter;
      if (old) announceHost(old);
      announceHost(room);
      // Wer schon da ist, schickt seinen Stand mit
      for (const [, o] of clients) if (o !== c && o.room === room && o.st) send(ws, { t: 'st', id: o.id, name: o.name, ...o.st });
      roster();
    } else if (m.t === 'st') {
      if (!c.room) return;
      const n = v => (typeof v === 'number' && isFinite(v) ? Math.round(v * 100) / 100 : 0);
      c.st = { p: (m.p || []).slice(0, 3).map(n), q: (m.q || []).slice(0, 4).map(n), s: n(m.s), cls: clean(m.cls, 12), paint: clean(m.paint, 10), m: clean(m.m, 8), w: Array.isArray(m.w) && m.w.length === 4 ? [clean(m.w[0], 40), n(m.w[1]), n(m.w[2]), n(m.w[3])] : null, d: clean(m.d, 40) };
      // wer beim Handeln die Station verlässt, bricht den Handel ab
      if (c.trade && c.st.d !== c.trade.station) endTrade(c.trade, `${c.name} hat die Station verlassen.`);
      toRoom(c.room, { t: 'st', id: c.id, name: c.name, ...c.st }, ws);
    } else if (m.t === 'w' || m.t === 'f' || m.t === 'fk') {
      // Weltstand (Asteroiden 'w', Ferrox 'f', Abschuss 'fk') vom Gastgeber an die anderen im Raum
      if (c.room && hostOf(c.room) === c) toRoom(c.room, m, ws);
    } else if (m.t === 'a') {
      // Abbau-Meldung eines Mitspielers an den Gastgeber
      const h = c.room ? hostOf(c.room) : null, hw = h && h !== c ? wsOf(h) : null;
      if (hw) send(hw, { t: 'a', op: clean(m.op, 8), id: +m.id || 0, v: +m.v || 0, from: c.id });
    } else if (m.t === 'mkt') {
      const st = clean(m.st, 40), k = clean(m.k, 12), n = Math.max(-200, Math.min(200, +m.n || 0));
      if (!st || !k || !n) return;
      const cur = satNow(market[st]?.[k]);
      (market[st] = market[st] || {})[k] = { s: Math.max(-80, cur + n), t: now() };
      toAll({ t: 'mkt', st, k, s: market[st][k].s, at: market[st][k].t });
    } else if (m.t === 'tr') {
      trade(ws, c, m);
    } else if (m.t === 'chat') {
      const now = Date.now(), text = clean(m.text, 200);
      if (!text || now - c.chatT < 700) return;   // einfache Bremse gegen Spam
      c.chatT = now;
      toAll({ t: 'chat', id: c.id, name: c.name, text });
    }
  });
  ws.on('close', () => {
    if (c.trade) endTrade(c.trade, `${c.name} ist nicht mehr verbunden.`);
    dropInvites(c, 'ist nicht mehr verbunden');
    if (c.room) toRoom(c.room, { t: 'leave', id: c.id }, ws);
    clients.delete(ws);
    if (c.room) announceHost(c.room);
    if (c.name) console.log(`- ${c.name} (#${c.id})`);
    roster();
  });
});

// Regelmäßig anpingen: hält die Verbindung über Proxys (z. B. bei Render) offen und räumt tote Verbindungen ab
setInterval(() => {
  for (const ws of clients.keys()) {
    if (ws.alive === false) { ws.terminate(); continue; }
    ws.alive = false;
    try { ws.ping(); } catch { /* egal */ }
  }
}, 25000);
wss.on('connection', ws => { ws.alive = true; ws.on('pong', () => { ws.alive = true; }); });

// ---------- Handel zwischen Piloten ----------
// Zwei Piloten in derselben Station (angedockt oder zu Fuß) tauschen Waren aus dem Frachtraum und Credits.
// Ablauf: Anfrage ('ask') → Annahme ('yes') → beide stellen ihr Angebot zusammen ('offer') → beide bestätigen
// denselben Stand ('ready' mit rev; jede Änderung hebt beide Bestätigungen auf) → der Server schickt beiden 'done'
// mit dem, was sie abgeben und bekommen. Jede Seite bucht das in ihrem Spielstand.
const byId = id => { for (const o of clients.values()) if (o.id === id) return o; return null; };
const stationOf = o => (o && o.st && o.st.d) || '';
const tsend = (o, m) => { const w = wsOf(o); if (w) send(w, { t: 'tr', ...m }); };
const ITEM_KEY = /^[a-z0-9]{1,12}$/;
function cleanOffer(m) {
  const items = {};
  if (m.items && typeof m.items === 'object') for (const [k, v] of Object.entries(m.items).slice(0, 24)) {
    const n = Math.floor(+v);
    if (ITEM_KEY.test(k) && n > 0 && n <= 100000) items[k] = n;
  }
  return { items, cr: Math.max(0, Math.min(1e9, Math.floor(+m.cr) || 0)) };
}
function tradeState(T) {
  for (const o of [T.a, T.b]) {
    const other = o === T.a ? T.b : T.a;
    tsend(o, { op: 'st', mine: T.off.get(o.id), theirs: T.off.get(other.id), rm: T.ready.has(o.id), rt: T.ready.has(other.id), rev: T.rev });
  }
}
function endTrade(T, why) {
  if (T.over) return;
  T.over = true;
  for (const o of [T.a, T.b]) { if (o.trade === T) o.trade = null; tsend(o, { op: 'end', why }); }
}
// offene Anfragen von und an diesen Piloten zurückziehen
function dropInvites(c, why) {
  if (c.invite) { const to = byId(c.invite.to); if (to) tsend(to, { op: 'gone', from: c.id }); c.invite = null; }
  for (const o of clients.values()) if (o.invite && o.invite.to === c.id) { o.invite = null; tsend(o, { op: 'no', name: c.name, why: `${c.name} ${why}.` }); }
}
function trade(ws, c, m) {
  const err = why => tsend(c, { op: 'err', why });
  if (m.op === 'ask') {
    const o = byId(+m.to), nowMs = Date.now();
    if (nowMs - (c.askT || 0) < 2000) return err('Bitte einen Moment warten.');
    c.askT = nowMs;
    if (!o || o === c || !o.name) return err('Dieser Pilot ist nicht mehr da.');
    if (!stationOf(c)) return err('Handeln geht nur in einer Station (angedockt oder zu Fuß).');
    if (o.room !== c.room || stationOf(o) !== stationOf(c)) return err(`${o.name} ist nicht in deiner Station.`);
    if (c.trade) return err('Du handelst schon mit jemandem.');
    if (o.trade) return err(`${o.name} handelt gerade mit jemand anderem.`);
    if (c.invite && c.invite.to !== o.id) { const old = byId(c.invite.to); if (old) tsend(old, { op: 'gone', from: c.id }); }
    c.invite = { to: o.id, at: nowMs };
    tsend(o, { op: 'ask', from: c.id, name: c.name });
    tsend(c, { op: 'sent', to: o.id, name: o.name });
  } else if (m.op === 'yes') {
    const o = byId(+m.from);
    if (!o || !o.invite || o.invite.to !== c.id || Date.now() - o.invite.at > 90000) { if (o) o.invite = null; return err('Die Anfrage ist nicht mehr gültig.'); }
    o.invite = null;
    if (!stationOf(c) || stationOf(o) !== stationOf(c) || o.room !== c.room) return err(`${o.name} ist nicht mehr in deiner Station.`);
    if (c.trade || o.trade) return err('Einer von euch handelt schon mit jemand anderem.');
    if (c.invite) { const old = byId(c.invite.to); if (old) tsend(old, { op: 'gone', from: c.id }); c.invite = null; }
    const T = { a: o, b: c, station: stationOf(c), off: new Map([[o.id, { items: {}, cr: 0 }], [c.id, { items: {}, cr: 0 }]]), ready: new Set(), rev: 1, over: false };
    o.trade = c.trade = T;
    tsend(o, { op: 'open', id: c.id, name: c.name });
    tsend(c, { op: 'open', id: o.id, name: o.name });
    tradeState(T);
    console.log(`Handel: ${o.name} ↔ ${c.name}`);
  } else if (m.op === 'no') {
    const o = byId(+m.from);
    if (o && o.invite && o.invite.to === c.id) { o.invite = null; tsend(o, { op: 'no', name: c.name, why: `${c.name} hat abgelehnt.` }); }
  } else if (m.op === 'back') {
    if (c.invite) { const o = byId(c.invite.to); if (o) tsend(o, { op: 'gone', from: c.id }); c.invite = null; }
  } else if (m.op === 'offer') {
    const T = c.trade; if (!T) return;
    T.off.set(c.id, cleanOffer(m));
    T.ready.clear(); T.rev++;
    tradeState(T);
  } else if (m.op === 'ready') {
    const T = c.trade; if (!T) return;
    if (+m.rev !== T.rev) { tradeState(T); return; }   // Angebot hat sich inzwischen geändert
    if (m.v) T.ready.add(c.id); else T.ready.delete(c.id);
    if (T.ready.size < 2) { tradeState(T); return; }
    // beide haben denselben Stand bestätigt: abschließen
    T.over = true; T.a.trade = T.b.trade = null;
    const oa = T.off.get(T.a.id), ob = T.off.get(T.b.id);
    tsend(T.a, { op: 'done', give: oa, get: ob, name: T.b.name });
    tsend(T.b, { op: 'done', give: ob, get: oa, name: T.a.name });
    console.log(`Handel abgeschlossen: ${T.a.name} ↔ ${T.b.name}`);
  } else if (m.op === 'cancel') {
    if (c.trade) endTrade(c.trade, `${c.name} hat den Handel abgebrochen.`);
  }
}

// ---------- Anmelden, Registrieren, Speichern ----------
async function account(ws, c, m) {
  const fail = err => send(ws, { t: 'auth', ok: false, err });
  if (m.t === 'save') {
    if (!c.account) return;
    const nowMs = Date.now();
    if (nowMs - c.saveT < 2000) return;   // höchstens alle zwei Sekunden
    c.saveT = nowMs;
    const rec = await store.get(c.account), data = rec && cleanSave(m.data, rec.name);
    if (!rec || !data) return;
    rec.data = data; rec.updated = nowMs;
    await store.put(c.account, rec);
    send(ws, { t: 'saved', at: nowMs });
    return;
  }
  if (m.t === 'logout') {
    if (c.account && typeof m.token === 'string') { const rec = await store.get(c.account); if (rec) { rec.tokens = (rec.tokens || []).filter(h => h !== sha(m.token.split(':')[1] || '')); await store.put(c.account, rec); } }
    c.account = null;
    send(ws, { t: 'auth', ok: false, out: true });
    return;
  }
  // Bremse gegen Durchprobieren: höchstens 8 Versuche pro Minute und Verbindung
  const nowMs = Date.now();
  c.tries = c.tries.filter(t => nowMs - t < 60000);
  if (c.tries.length >= 8) return fail('Zu viele Versuche. Bitte eine Minute warten.');
  c.tries.push(nowMs);
  let key, rec, token;
  if (m.t === 'register') {
    const name = clean(m.name, 16), pass = String(m.pass || '');
    if (!NAME_RE.test(name)) return fail('Name: 3–16 Zeichen, Buchstaben, Ziffern, Leerzeichen, - und _.');
    if (pass.length < 6 || pass.length > 128) return fail('Kennwort: mindestens 6 Zeichen.');
    key = keyOf(name);
    if (await store.get(key)) return fail('Dieser Pilotenname ist schon vergeben.');
    const salt = crypto.randomBytes(16).toString('hex');
    rec = { name, salt, hash: await hashPass(pass, salt), tokens: [], data: cleanSave(m.data, name), created: nowMs, updated: nowMs };
    token = await newToken(rec, key);
    await store.put(key, rec);
    console.log('Neues Konto: ' + name);
  } else if (typeof m.token === 'string' && m.token.includes(':')) {
    const [k, raw] = m.token.split(':');
    key = k; rec = await store.get(key);
    if (!rec || !(rec.tokens || []).includes(sha(raw || ''))) return fail('Anmeldung abgelaufen. Bitte mit Kennwort anmelden.');
    token = m.token;
  } else {
    key = keyOf(clean(m.name, 16)); rec = key && await store.get(key);
    if (!rec || !sameHex(await hashPass(String(m.pass || ''), rec.salt), rec.hash)) return fail('Name oder Kennwort stimmt nicht.');
    token = await newToken(rec, key);
    await store.put(key, rec);
  }
  // Ein Konto darf nur einmal gleichzeitig spielen: alte Verbindung abmelden
  for (const [ows, o] of clients) if (o !== c && o.account === key) { o.account = null; send(ows, { t: 'auth', ok: false, out: true, err: 'Dein Konto wurde an einem anderen Gerät angemeldet.' }); }
  c.account = key; c.name = rec.name;
  send(ws, { t: 'auth', ok: true, name: rec.name, data: rec.data || null, token });
  roster();
}

server.listen(PORT, () => console.log(`Letzte Flotte läuft auf http://localhost:${PORT}  (WebSocket /ws, Spiel aus ${ROOT})`));
