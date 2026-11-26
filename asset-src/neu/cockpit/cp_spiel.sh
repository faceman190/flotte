#!/bin/sh
# Cockpits (Stil 2) fürs Spiel: bauen, exportieren (Aufruf aus beliebigem Ordner). Danach im Projektordner: npm run assets
# Zweites Argument von cp_export.py: längste Kante nach dem Teilen (Kormoran gröber, die Brücke ist groß).
set -e
D="$(cd "$(dirname "$0")" && pwd)"; BL="C:/EXTRA/Blender/blender.exe"
cd "$D"
"$BL" -b --python cp_dohle.py > cp-konsole-dohle.txt 2>&1
"$BL" -b CockpitDohle.blend --python cp_export.py -- Dohle >> cp-konsole-dohle.txt 2>&1; cat cp-dohle-export.txt
"$BL" -b --python cp_kormoran.py > cp-konsole-kormoran.txt 2>&1
"$BL" -b CockpitKormoran.blend --python cp_export.py -- Kormoran 0.14 >> cp-konsole-kormoran.txt 2>&1; cat cp-kormoran-export.txt
