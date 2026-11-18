// =====================================================================================
// Legt neben jede packbare Spieldatei eine .br- und .gz-Fassung, die Caddy direkt ausliefert (precompressed br gzip).
// Nur neu, wenn die Quelle neuer ist als die vorhandene .br (unveränderte Dateien behalten ihre Fassung, deploy.sh
// kopiert ohne Zeitstempel). Verwaiste .br/.gz ohne Quelle werden entfernt.
// Aufruf: node deploy/precompress.mjs <ordner>
// =====================================================================================
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const root = path.resolve(process.argv[2] || 'dist');
// wie im Node-Server: Text, Code und Modelle (Meshopt-Daten packen sich gut weiter), nicht Bilder und Klänge
const PACK = new Set(['.html', '.js', '.css', '.json', '.glb', '.webmanifest', '.svg', '.txt']);
const MIN = 1024;

let made = 0, kept = 0, dropped = 0, bytesIn = 0, bytesOut = 0;
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) { walk(f); continue; }
    const ext = path.extname(e.name);
    if (ext === '.br' || ext === '.gz') {
      if (!fs.existsSync(f.slice(0, -ext.length))) { fs.unlinkSync(f); dropped++; }
      continue;
    }
    if (!PACK.has(ext)) continue;
    const st = fs.statSync(f);
    if (st.size < MIN) continue;
    const br = f + '.br', gz = f + '.gz';
    const fresh = p => { try { return fs.statSync(p).mtimeMs >= st.mtimeMs; } catch { return false; } };
    if (fresh(br) && fresh(gz)) { kept++; continue; }
    const data = fs.readFileSync(f);
    // große Modelle mit Stufe 9 (schnell genug), kleine Text-/Codedateien mit der höchsten Stufe
    const q = data.length > 2e6 ? 9 : 11;
    const b = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: q, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length } });
    const g = zlib.gzipSync(data, { level: 9 });
    // erst vollständig schreiben, dann umbenennen: Caddy sieht nie eine halbe Datei
    fs.writeFileSync(br + '.tmp', b); fs.renameSync(br + '.tmp', br);
    fs.writeFileSync(gz + '.tmp', g); fs.renameSync(gz + '.tmp', gz);
    made++; bytesIn += data.length; bytesOut += b.length;
  }
}
const t0 = Date.now();
walk(root);
const mb = n => (n / 1048576).toFixed(1) + ' MB';
console.log(`vorkomprimiert: ${made} neu (${mb(bytesIn)} → ${mb(bytesOut)} Brotli), ${kept} unverändert, ${dropped} verwaist entfernt, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
