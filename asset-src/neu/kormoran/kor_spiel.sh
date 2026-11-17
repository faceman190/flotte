#!/bin/sh
# Kormoran fürs Spiel: Blender-Modell neu bauen, exportieren, vereinfachen, Laufkarte (Aufruf aus beliebigem Ordner).
# Danach im Projektordner: npm run assets
set -e
D="$(cd "$(dirname "$0")" && pwd)"; R="$D/../../.."; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python kor_lauf.py > kor-konsole.txt 2>&1; tail -1 kor.txt
"$BL" -b Kormoran.blend --python kor_export.py > kor-konsole-export.txt 2>&1; cat kor-export.txt
cd "$R"
node --max-old-space-size=8000 scripts/simplify-hard.mjs asset-src/neu/kormoran/Kormoran_roh.glb asset-src/glb/ship/Kormoran.glb 0.6 0.0004 35 --rotY=-90 2>&1 | tail -1
node --max-old-space-size=8000 scripts/build-walkmap.mjs asset-src/glb/ship/Kormoran.glb asset-src/glb/ship/Kormoran.glb asset-src/walk/Kormoran.json \
  --start=0,-1.38,5.02 --minY=-1.6 --doors=0 --spots=asset-src/glb/ship/Kormoran.look.json 2>&1 | tail -9
