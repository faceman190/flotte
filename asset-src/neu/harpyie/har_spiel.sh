#!/bin/sh
# Harpyie fürs Spiel: Blender-Modell neu bauen, exportieren (zu und offen), Cockpit der Ich-Sicht backen, vereinfachen, Laufkarte.
# Aufruf aus beliebigem Ordner; danach im Projektordner: npm run assets
# Harpyie.glb (nah, volles Modell mit Truppenraum und Cockpit), HarpyieFern.glb (stark vereinfacht), HarpyieCockpit.glb (Ich-Sicht),
# Laufkarte aus dem offenen Zustand (Heckrampe begehbar).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python har_lauf.py > har-konsole.txt 2>&1; tail -1 har.txt
"$BL" -b Harpyie.blend --python har_export.py > har-konsole-export.txt 2>&1; tail -1 har-export.txt
"$BL" -b Harpyie.blend --python har_export_cockpit.py > har-konsole-cockpit.txt 2>&1
"$BL" -b CockpitHarpyie.blend --python ../cockpit/cp_export.py -- Harpyie 0.12 >> har-konsole-cockpit.txt 2>&1; cat ../cockpit/cp-harpyie-export.txt
cd "$R"
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/harpyie/Harpyie_roh.glb asset-src/glb/ship/Harpyie.glb 0.55 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/harpyie/Harpyie_roh.glb asset-src/glb/ship/HarpyieFern.glb 0.07 0.004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/harpyie/Harpyie_offen_roh.glb asset-src/neu/harpyie/Harpyie_offen.glb 1 0.0001 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/build-walkmap.mjs asset-src/neu/harpyie/Harpyie_offen.glb asset-src/glb/ship/Harpyie.glb asset-src/walk/Harpyie.json \
  --start=0,-3.081,0 --spawn=0,-3.081,11.0 --minY=-5.35 --minYaussen=-3.2 --doors=0 --nurinnen=1 --offen=-2.4,2.4,13.0,22.0 --spots=asset-src/glb/ship/Harpyie.look.json \
  --img=asset-src/neu/harpyie/har-laufkarte.png 2>&1 | tail -14
