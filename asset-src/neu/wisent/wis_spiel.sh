#!/bin/sh
# Wisent fürs Spiel: Blender-Modell neu bauen, exportieren (zu und offen), vereinfachen, Laufkarte (Aufruf aus beliebigem Ordner).
# Danach im Projektordner: npm run assets
# Wisent.glb (nah, volles Modell mit Innenräumen), WisentFern.glb (stark vereinfacht, ab sechs Schiffslängen), Laufkarte aus dem
# offenen Zustand (Heckrampe begehbar; das Spiel sperrt die Rampenzellen, solange die Rampe nicht ganz offen ist).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python wis_lauf.py > wis-konsole.txt 2>&1; tail -1 wis.txt
"$BL" -b Wisent.blend --python wis_export.py > wis-konsole-export.txt 2>&1; head -4 wis-export.txt
cd "$R"
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/wisent/Wisent_roh.glb asset-src/glb/ship/Wisent.glb 0.55 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/wisent/Wisent_roh.glb asset-src/glb/ship/WisentFern.glb 0.07 0.004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/wisent/Wisent_offen_roh.glb asset-src/neu/wisent/Wisent_offen.glb 1 0.0001 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/build-walkmap.mjs asset-src/neu/wisent/Wisent_offen.glb asset-src/glb/ship/Wisent.glb asset-src/walk/Wisent.json \
  --start=0,-3.77,37.8 --spawn=0,-3.77,37.8 --minY=-10.6 --minYaussen=-3.9 --doors=0 --nurinnen=1 --offen=-4.7,4.7,40.8,50.6 --spots=asset-src/glb/ship/Wisent.look.json \
  --img=asset-src/neu/wisent/wis-laufkarte.png 2>&1 | tail -14
