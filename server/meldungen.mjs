// =====================================================================================
// Meldungen von der Website (letztecrew.de/melden/): Fehler, Verbesserungsvorschläge, Sonstiges
//  POST /api/meldung                  neue Meldung (öffentlich; Begrenzung je Adresse, Lockfeld gegen Bots)
//  GET  /api/meldungen                Liste für den Eingang (letztecrew.de/melden/eingang/), nur mit Schlüssel
//  POST /api/meldungen/<nr>/status    Status setzen (neu, gesehen, in Arbeit, erledigt, abgelehnt), nur mit Schlüssel
//  GET  /api/meldungen/<nr>/bild      angehängtes Bildschirmfoto, nur mit Schlüssel
// Schlüssel: Umgebungsvariable MELDUNGEN_SCHLUESSEL (auf dem VPS in /etc/letzte-crew.env), Kopfzeile X-Schluessel.
// Ohne Schlüssel bleibt der Eingang zu, Meldungen werden trotzdem angenommen.
// Ablage: data/meldungen.json und Bilder in data/meldungen/<nr>.jpg (der Datenordner ist auf dem VPS beschreibbar).
// IP-Adressen werden nicht gespeichert, nur kurz im Speicher für die Begrenzung gehalten.
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const FILE = path.join(DIR, 'meldungen.json');
const BILDER = path.join(DIR, 'meldungen');

export const ARTEN = ['fehler', 'vorschlag', 'sonstiges'];
export const BEREICHE = ['flug', 'bergbau', 'handel', 'kampf', 'stationen', 'geschichte', 'mehrspieler', 'grafik', 'steuerung', 'website', 'sonstiges'];
export const STATUS = ['neu', 'gesehen', 'in-arbeit', 'erledigt', 'abgelehnt'];
const MAX_BODY = 3 * 1024 * 1024;     // Bild kommt verkleinert als JPEG (höchstens 1600 px), das reicht reichlich
const MAX_BILD = 2 * 1024 * 1024;
const PRO_STUNDE = 6;                 // Meldungen je Adresse und Stunde

let db = { next: 1, list: [] };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* noch keine Meldungen */ }
let timer = null;
function save() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE + '.tmp', JSON.stringify(db, null, 1));
    fs.renameSync(FILE + '.tmp', FILE);
  }, 300);
}

const hits = new Map();   // Adresse → Zeitpunkte der letzten Meldungen
function limited(ip) {
  const t = Date.now(), list = (hits.get(ip) || []).filter((x) => t - x < 3600e3);
  if (list.length >= PRO_STUNDE) { hits.set(ip, list); return true; }
  list.push(t); hits.set(ip, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((x) => t - x < 3600e3)) hits.delete(k);
  return false;
}

const txt = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
function send(res, code, obj, extra = {}) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra });
  res.end(JSON.stringify(obj));
}
function body(req) {
  return new Promise((ok, no) => {
    let size = 0; const parts = [];
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { no(new Error('zu groß')); req.destroy(); } else parts.push(c); });
    req.on('end', () => { try { ok(JSON.parse(Buffer.concat(parts).toString('utf8') || '{}')); } catch { no(new Error('kein JSON')); } });
    req.on('error', no);
  });
}
function keyOk(req) {
  const want = process.env.MELDUNGEN_SCHLUESSEL || '';
  const got = String(req.headers['x-schluessel'] || '');
  if (want.length < 12 || !got) return false;
  const a = crypto.createHash('sha256').update(want).digest(), b = crypto.createHash('sha256').update(got).digest();
  return crypto.timingSafeEqual(a, b);
}
const ipOf = (req) => String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '?';

// Gibt true zurück, wenn die Anfrage hierher gehörte
export function meldungen(req, res, p) {
  if (!p.startsWith('/api/meldung')) return false;
  handle(req, res, p).catch((e) => send(res, 400, { fehler: e.message || 'Fehler' }));
  return true;
}

async function handle(req, res, p) {
  if (p === '/api/meldung' && req.method === 'POST') {
    const b = await body(req);
    if (b.website) return send(res, 200, { ok: true, nr: 0 });   // Lockfeld: echte Menschen sehen es nicht und lassen es leer
    const art = ARTEN.includes(b.art) ? b.art : null;
    const bereich = BEREICHE.includes(b.bereich) ? b.bereich : 'sonstiges';
    const titel = txt(b.titel, 120), text = txt(b.text, 6000);
    if (!art) return send(res, 400, { fehler: 'Bitte die Art der Meldung wählen.' });
    if (titel.length < 4) return send(res, 400, { fehler: 'Bitte einen kurzen Titel angeben (mindestens 4 Zeichen).' });
    if (text.length < 10) return send(res, 400, { fehler: 'Bitte beschreiben, was passiert ist (mindestens 10 Zeichen).' });
    if (limited(ipOf(req))) return send(res, 429, { fehler: 'Zu viele Meldungen in kurzer Zeit. Bitte in einer Stunde noch einmal versuchen.' });
    const nr = db.next++;
    const m = {
      nr, zeit: new Date().toISOString(), art, bereich, titel, text,
      schritte: txt(b.schritte, 3000), erwartet: txt(b.erwartet, 2000),
      pilot: txt(b.pilot, 32), kontakt: txt(b.kontakt, 120),
      version: txt(b.version, 40), geraet: txt(b.geraet, 300), bildschirm: txt(b.bildschirm, 80),
      bild: false, status: 'neu', notiz: '',
    };
    const bild = typeof b.bild === 'string' ? b.bild.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/) : null;
    if (bild) {
      const buf = Buffer.from(bild[1], 'base64');
      if (buf.length <= MAX_BILD && buf[0] === 0xff && buf[1] === 0xd8) {
        fs.mkdirSync(BILDER, { recursive: true });
        fs.writeFileSync(path.join(BILDER, nr + '.jpg'), buf);
        m.bild = true;
      }
    }
    db.list.push(m);
    save();
    console.log(`Meldung #${nr} (${art}, ${bereich}): ${titel}`);
    return send(res, 200, { ok: true, nr });
  }
  // ---- Eingang (nur mit Schlüssel) ----
  if (!keyOk(req)) return send(res, 401, { fehler: 'Schlüssel fehlt oder stimmt nicht.' });
  if (p === '/api/meldungen' && req.method === 'GET') return send(res, 200, { meldungen: db.list.slice().reverse() });
  const mm = p.match(/^\/api\/meldungen\/(\d+)\/(status|bild)$/);
  const m = mm && db.list.find((x) => x.nr === +mm[1]);
  if (!m) return send(res, 404, { fehler: 'Meldung nicht gefunden.' });
  if (mm[2] === 'bild' && req.method === 'GET') {
    const f = path.join(BILDER, m.nr + '.jpg');
    if (!m.bild || !fs.existsSync(f)) return send(res, 404, { fehler: 'Kein Bild.' });
    res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600' });
    return res.end(fs.readFileSync(f));
  }
  if (mm[2] === 'status' && req.method === 'POST') {
    const b = await body(req);
    if (b.status !== undefined) { if (!STATUS.includes(b.status)) return send(res, 400, { fehler: 'Unbekannter Status.' }); m.status = b.status; }
    if (b.notiz !== undefined) m.notiz = txt(b.notiz, 2000);
    m.geaendert = new Date().toISOString();
    save();
    return send(res, 200, { ok: true, meldung: m });
  }
  return send(res, 405, { fehler: 'Nicht erlaubt.' });
}
