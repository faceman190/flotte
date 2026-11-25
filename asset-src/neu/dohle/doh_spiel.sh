#!/bin/sh
# Dohle fürs Spiel: Blender-Modell neu bauen, exportieren, vereinfachen (Aufruf aus beliebigem Ordner). Danach im Projektordner: npm run assets
# Zwei Stufen: Dohle.glb (nah, alle Teile) und DohleFern.glb (stark vereinfacht; src/models/gltfShips.ts modelInstance schaltet ab sechs Längen um).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python doh_lauf.py > doh-konsole.txt 2>&1; tail -1 doh.txt
"$BL" -b Dohle.blend --python doh_export.py > doh-konsole-export.txt 2>&1; cat doh-export.txt
cd "$R"
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/dohle/Dohle_roh.glb asset-src/glb/ship/Dohle.glb 0.5 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/dohle/Dohle_roh.glb asset-src/glb/ship/DohleFern.glb 0.1 0.003 35 --rotY=-90 2>&1 | tail -1
