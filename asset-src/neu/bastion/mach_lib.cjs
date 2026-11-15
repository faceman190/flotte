// Löst die Bauhelfer und Materialien aus den Skripten des Wartungsgangs (../gang) heraus und schreibt sie als bk_lib.py hierher.
// So bleibt es EINE Quelle: Wer einen Helfer im Gang verbessert, ruft danach  node mach_lib.cjs  auf.
const fs = require('fs'), path = require('path');
const G = path.join(__dirname, '..', 'gang');
const cut = (file, a, b) => { const s = fs.readFileSync(path.join(G, file), 'utf8'); const i = s.indexOf(a), j = s.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error(file + ': Anker fehlt: ' + (i < 0 ? a : b).slice(0, 50)); return s.slice(i, j); };
let lib = '# bk_lib.py: Materialien und Bauhelfer für den Bastion-Baukasten. ERZEUGT von mach_lib.cjs aus ../gang/*.py, nicht von Hand ändern.\n';
lib += cut('gang_bau.py', '# ---------- Materialien ----------', '# =====================================================================================\n# Rohbau');
lib += cut('gang_detail.py', 'def frame(origin, xd, yd):', '# =====================================================================================\n# Rechte Wand');
lib += cut('gang_detail2.py', 'def kill(*names', '# =====================================================================================\n# Wandfelder');
// Im Baukasten landet jedes Teil in der Sammlung des Bausteins, der gerade gebaut wird, und wird für das Drehen auf die Wandseite gemerkt
const rep = (a, b, all) => { const n = lib.split(a).length - 1; if (n < 1) throw new Error('fehlt: ' + a); lib = lib.split(a).join(b); };
rep(`def link(ob): CUR[0].objects.link(ob); return ob`, `def link(ob):
    CUR[0].objects.link(ob)
    if REC[0] is not None: REC[0].append(ob)
    return ob`);
rep(`COL['Schilder'].objects.link(ob)`, `link(ob)`);
rep(`COL['Licht'].objects.link(ob)`, `link(ob)`);
fs.writeFileSync(path.join(__dirname, 'bk_lib.py'), lib);
console.log('bk_lib.py', lib.length, 'Zeichen');
