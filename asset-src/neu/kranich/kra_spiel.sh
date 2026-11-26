#!/bin/sh
# Kranich fürs Spiel: Blender-Modell neu bauen, exportieren (zu und offen), Cockpit der Ich-Sicht backen, vereinfachen, Laufkarte.
# Aufruf aus beliebigem Ordner; danach im Projektordner: npm run assets
# Kranich.glb (nah, volles Modell mit Innenraum und Cockpit), KranichFern.glb (stark vereinfacht, ab sechs Schiffslängen),
# KranichCockpit.glb (Ich-Sicht, gebackenes Licht), Laufkarte aus dem offenen Zustand (Heckrampe begehbar).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python kra_lauf.py > kra-konsole.txt 2>&1; tail -1 kra.txt
"$BL" -b Kranich.blend --python kra_export.py > kra-konsole-export.txt 2>&1; tail -1 kra-export.txt
"$BL" -b Kranich.blend --python kra_export_cockpit.py > kra-konsole-cockpit.txt 2>&1
"$BL" -b CockpitKranich.blend --python ../cockpit/cp_export.py -- Kranich 0.12 >> kra-konsole-cockpit.txt 2>&1; cat ../cockpit/cp-kranich-export.txt
cd "$R"
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/kranich/Kranich_roh.glb asset-src/glb/ship/Kranich.glb 0.55 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/kranich/Kranich_roh.glb asset-src/glb/ship/KranichFern.glb 0.07 0.004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/kranich/Kranich_offen_roh.glb asset-src/neu/kranich/Kranich_offen.glb 1 0.0001 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/build-walkmap.mjs asset-src/neu/kranich/Kranich_offen.glb asset-src/glb/ship/Kranich.glb asset-src/walk/Kranich.json \
  --start=0,-1.635,7.9 --spawn=0,-1.635,14.3 --minY=-4.1 --minYaussen=-1.75 --doors=0 --nurinnen=1 --offen=-1.7,1.7,15.3,20.3 --spots=asset-src/glb/ship/Kranich.look.json \
  --img=asset-src/neu/kranich/kra-laufkarte.png 2>&1 | tail -14
