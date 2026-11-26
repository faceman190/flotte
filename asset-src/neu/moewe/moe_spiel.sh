#!/bin/sh
# Möwe fürs Spiel: Blender-Modell neu bauen, exportieren (zu und offen), Cockpit der Ich-Sicht backen, vereinfachen, Laufkarte.
# Aufruf aus beliebigem Ordner; danach im Projektordner: npm run assets
# Moewe.glb (nah, volles Modell mit Laderaum, Kabine und Cockpit), MoeweFern.glb (stark vereinfacht), MoeweCockpit.glb (Ich-Sicht),
# Laufkarte aus dem offenen Zustand (Heck- und Bugrampe begehbar).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python moe_lauf.py > moe-konsole.txt 2>&1; tail -1 moe.txt
"$BL" -b Moewe.blend --python moe_export.py > moe-konsole-export.txt 2>&1; tail -1 moe-export.txt
"$BL" -b Moewe.blend --python moe_export_cockpit.py > moe-konsole-cockpit.txt 2>&1
"$BL" -b CockpitMoewe.blend --python ../cockpit/cp_export.py -- Moewe 0.12 >> moe-konsole-cockpit.txt 2>&1; cat ../cockpit/cp-moewe-export.txt
cd "$R"
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/moewe/Moewe_roh.glb asset-src/glb/ship/Moewe.glb 0.55 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/moewe/Moewe_roh.glb asset-src/glb/ship/MoeweFern.glb 0.07 0.004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/simplify-hard.mjs asset-src/neu/moewe/Moewe_offen_roh.glb asset-src/neu/moewe/Moewe_offen.glb 1 0.0001 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=12000 scripts/build-walkmap.mjs asset-src/neu/moewe/Moewe_offen.glb asset-src/glb/ship/Moewe.glb asset-src/walk/Moewe.json \
  --start=0,-3.665,0 --spawn=0,-3.665,10.0 --minY=-6.2 --minYaussen=-3.8 --doors=0 --nurinnen=1 --offen="-3.0,3.0,11.4,21.5;-3.0,3.0,-26.0,-17.0,-6.3,-3.0" --spots=asset-src/glb/ship/Moewe.look.json \
  --img=asset-src/neu/moewe/moe-laufkarte.png 2>&1 | tail -14
