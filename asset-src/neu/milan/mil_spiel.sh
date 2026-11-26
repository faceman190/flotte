#!/bin/sh
# Milan fürs Spiel: Blender-Modell neu bauen, exportieren, vereinfachen (Aufruf aus beliebigem Ordner). Danach im Projektordner: npm run assets
# Zwei Stufen: Milan.glb (nah, alle Teile) und MilanFern.glb (stark vereinfacht; src/models/gltfShips.ts modelInstance schaltet ab sechs Längen um).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python mil_lauf.py > mil-konsole.txt 2>&1; tail -1 mil.txt
"$BL" -b Milan.blend --python mil_export.py > mil-konsole-export.txt 2>&1; cat mil-export.txt
# Cockpit für die Ich-Sicht im Flug (eigene Datei in voller Auflösung, mit gebackener Verdeckung; src/game/cockpit.ts)
"$BL" -b Milan.blend --python mil_export_cockpit.py > mil-konsole-cockpit.txt 2>&1; cat mil-cockpit-export.txt
cd "$R"
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/milan/Milan_roh.glb asset-src/glb/ship/Milan.glb 0.5 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/milan/Milan_roh.glb asset-src/glb/ship/MilanFern.glb 0.1 0.003 35 --rotY=-90 2>&1 | tail -1
