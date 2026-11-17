#!/bin/sh
# Würger fürs Spiel: Blender-Modell neu bauen, exportieren, vereinfachen (Aufruf aus beliebigem Ordner).
# Danach im Projektordner: npm run assets
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python wue_lauf.py > wue-konsole.txt 2>&1; tail -1 wue.txt
"$BL" -b Wuerger.blend --python wue_export.py > wue-konsole-export.txt 2>&1; cat wue-export.txt
cd "$R"
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/wuerger/Wuerger_roh.glb asset-src/glb/ship/Wuerger.glb 0.6 0.0003 35 --rotY=-90 2>&1 | tail -1
