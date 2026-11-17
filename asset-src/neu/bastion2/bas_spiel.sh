#!/bin/sh
# Bastion 2 fürs Spiel: Blender-Modell neu bauen, exportieren, vereinfachen → asset-src/glb/station/Carrier.glb (Aufruf aus beliebigem Ordner).
# Danach im Projektordner: npm run assets. Die Spielpunkte (Andocken, Start, Kollision, Lichter) stehen in src/models/stationModels.ts.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python bas_lauf.py > bas-konsole.txt 2>&1; tail -1 bas.txt
"$BL" -b Bastion2.blend --python bas_export.py > bas-konsole-export.txt 2>&1; cat bas-export.txt
cd "$R"
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/bastion2/Bastion2_roh.glb asset-src/glb/station/Carrier.glb 0.5 0.0002 35 2>&1 | tail -1
