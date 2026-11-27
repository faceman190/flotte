# Niagara-Export (scripts/ue/niagara_export.py) → 8-Bit-PNG.
# Unreal schreibt die Flipbooks dieses Pakets nur als EXR (16-Bit-Gleitkomma, ZIP). Dieses Skript wandelt sie in PNG um,
# damit scripts/build-niagara.mjs sie mit sharp verarbeiten kann. Werte werden auf 0…1 begrenzt (die Daten sind schon
# Masken bzw. Farben, keine HDR-Bilder); 8K-Bilder werden auf die Hälfte verkleinert.
#   pip install OpenEXR numpy opencv-python-headless
#   python3 scripts/niagara-exr.py            (liest asset-src/neu/niagara/textures/*.exr, schreibt asset-src/neu/niagara/png/)
import glob
import os
import sys

import cv2
import numpy as np
import OpenEXR

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'asset-src', 'neu', 'niagara')
SRC, OUT = os.path.join(ROOT, 'textures'), os.path.join(ROOT, 'png')
os.makedirs(OUT, exist_ok=True)
files = sorted(glob.glob(os.path.join(SRC, '*.exr')))
if not files:
    sys.exit('keine EXR in ' + SRC)
for f in files:
    with OpenEXR.File(f) as x:
        a = np.clip(x.channels()['RGBA'].pixels.astype(np.float32), 0, 1)
    if a.shape[0] >= 8192:
        a = cv2.resize(a, (a.shape[1] // 2, a.shape[0] // 2), interpolation=cv2.INTER_AREA)
    b = (a * 255 + 0.5).astype(np.uint8)
    cv2.imwrite(os.path.join(OUT, os.path.basename(f)[:-4] + '.png'), cv2.cvtColor(b, cv2.COLOR_RGBA2BGRA))
    print('PNG', os.path.basename(f), a.shape)
