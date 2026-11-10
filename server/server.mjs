// =====================================================================================
// Letzte Flotte – Mehrspieler-Server
// Liefert das gebaute Spiel (dist/) aus und verbindet die Piloten über WebSocket (/ws).
// Jeder Sektor ist ein Raum (Planetenoberflächen eigene Räume); Positionen gehen nur an Piloten im selben Raum,
// Chat und die Online-Liste an alle. Pilotenkonten mit Kennwort speichern den Spielstand auf dem Server (store.mjs).
// Gemeinsame Welt: Der erste Pilot in einem Raum ist Gastgeber und rechnet die Asteroiden; er schickt den Stand ('w')
// an die anderen, deren Abbau-Meldungen ('a') gehen an ihn. Den Markt (Preissättigung je Station) führt der Server.
// Start: node server/server.mjs   (Port über PORT, Standard 2567)
// =====================================================================================
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { openStore } from './store.mjs';

const PORT = +(process.env.PORT || 2567);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.ico': 'image/x-icon' };

// ---------- Spiel ausliefern ----------
const server = http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
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
      c.st = { p: (m.p || []).slice(0, 3).map(n), q: (m.q || []).slice(0, 4).map(n), s: n(m.s), cls: clean(m.cls, 12), paint: clean(m.paint, 10), m: clean(m.m, 8) };
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
    } else if (m.t === 'chat') {
      const now = Date.now(), text = clean(m.text, 200);
      if (!text || now - c.chatT < 700) return;   // einfache Bremse gegen Spam
      c.chatT = now;
      toAll({ t: 'chat', id: c.id, name: c.name, text });
    }
  });
  ws.on('close', () => {
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
