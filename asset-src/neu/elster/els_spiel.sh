#!/bin/sh
# Elster fürs Spiel: Blender-Modell neu bauen, exportieren, vereinfachen (Aufruf aus beliebigem Ordner).
# Danach im Projektordner: npm run assets
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python els_lauf.py > els-konsole.txt 2>&1; tail -1 els.txt
"$BL" -b Elster.blend --python els_export.py > els-konsole-export.txt 2>&1; cat els-export.txt
cd "$R"
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/elster/Elster_roh.glb asset-src/glb/ship/Elster.glb 0.6 0.0003 35 --rotY=-90 2>&1 | tail -1
