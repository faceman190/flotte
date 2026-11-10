// =====================================================================================
// Speicher für Pilotenkonten und Spielstände
//  - Mit Umgebungsvariable DATABASE_URL: Postgres (z. B. kostenlos bei Neon). Nötig auf Render, weil dort
//    im kostenlosen Plan alle Dateien bei jedem Neustart verschwinden.
//  - Sonst: Datei data/accounts.json neben dem Projekt (lokal und auf eigenen Servern).
// Ein Eintrag: { name, salt, hash, tokens: [sha256…], data: Spielstand, created, updated }
// =====================================================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');

function fileStore() {
  const file = path.join(DIR, 'accounts.json');
  let db = {};
  try { db = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { db = {}; }
  let timer = null;
  const flush = () => {
    timer = null;
    fs.mkdirSync(DIR, { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, file);   // erst vollständig schreiben, dann ersetzen
  };
  return {
    kind: 'Datei ' + file,
    async get(key) { return db[key] || null; },
    async put(key, rec) { db[key] = rec; if (!timer) timer = setTimeout(flush, 1500); },
    async close() { if (timer) { clearTimeout(timer); flush(); } },
  };
}

async function pgStore(url) {
  const { default: pg } = await import('pg');
  const pool = new pg.Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 4 });
  await pool.query('create table if not exists accounts (key text primary key, rec jsonb not null, updated timestamptz not null default now())');
  return {
    kind: 'Postgres',
    async get(key) { const r = await pool.query('select rec from accounts where key = $1', [key]); return r.rows[0]?.rec || null; },
    async put(key, rec) { await pool.query('insert into accounts (key, rec, updated) values ($1, $2, now()) on conflict (key) do update set rec = excluded.rec, updated = now()', [key, rec]); },
    async close() { await pool.end(); },
  };
}

// Für die Statusseite: warum keine Datenbank genutzt wird (ohne Zugangsdaten)
export const storeInfo = { dbUrlSet: false, dbError: '', dbHost: '' };
const scrub = s => String(s || '').replace(/postgres(ql)?:\/\/\S+/gi, '[Adresse]').replace(/password=\S+/gi, 'password=[…]').slice(0, 300);

// Häufige Kopierfehler abfangen: „psql '…'“, Anführungszeichen, „DATABASE_URL=…“ – es zählt nur die postgresql://-Adresse darin
function extractUrl(raw) {
  const m = String(raw || '').match(/postgres(?:ql)?:\/\/[^\s'"]+/i);
  return m ? m[0] : '';
}

export async function openStore() {
  const raw = (process.env.DATABASE_URL || '').trim();
  storeInfo.dbUrlSet = !!raw;
  const url = extractUrl(raw);
  if (raw && !url) storeInfo.dbError = 'DATABASE_URL enthält keine Adresse, die mit postgresql:// beginnt.';
  if (url) { try { storeInfo.dbHost = new URL(url).hostname; } catch { storeInfo.dbHost = '(nicht lesbar)'; } }
  if (url) {
    try { return await pgStore(url); }
    catch (e) { storeInfo.dbError = scrub((e.code ? e.code + ': ' : '') + e.message); console.error('Datenbank nicht erreichbar, nutze vorerst die Datei:', storeInfo.dbError); }
  }
  return fileStore();
}
