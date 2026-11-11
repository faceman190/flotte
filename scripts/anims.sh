#!/bin/sh
# Alle Bewegungen der Figuren aus den FBX-Dateien in asset-src/neu/ neu erzeugen (danach: npm run assets).
# Die FBX-Dateien stammen von Mixamo, hochgeladen wurde der Händler-Körper; auf den Arbeiter passen sie über die gleiche Grundhaltung.
set -e
cd "$(dirname "$0")/.."
N=asset-src/neu
for F in merchant worker; do
  node scripts/fbx-anim.mjs "$N/standing_idle_merchant.fbx" ${F}_idle --figure=$F
  node scripts/fbx-anim.mjs "$N/Walking.fbx" ${F}_walk --figure=$F --inplace --fps=30
  # Anlaufen: Ausschnitt vom ersten Gewichtverlagern bis zum vollen Schritt (linker Fuß hebt ab wie am Anfang der Gehschleife)
  node scripts/fbx-anim.mjs "$N/Start Walking.fbx" ${F}_start --figure=$F --inplace --fps=30 --in=0.35 --out=1.4
  # Abbremsen: Einstieg bei 0 s (linker Fuß in der Luft) oder 0,45 s (rechter Fuß in der Luft), bis die Figur ruhig steht
  node scripts/fbx-anim.mjs "$N/Stop Walking.fbx" ${F}_stop --figure=$F --inplace --fps=30 --out=2.6 --alt=0.45
  node scripts/fbx-anim.mjs "$N/Talking.fbx" ${F}_talk1 --figure=$F
  node scripts/fbx-anim.mjs "$N/Talking (1).fbx" ${F}_talk2 --figure=$F
done
