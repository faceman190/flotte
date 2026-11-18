# Übersichtsblätter aus den Einzelbildern wis-*.jpg (3 × 3 außen, 3 × 2 innen, je 800 × 450): blender.exe -b --python wis_blatt.py [-- innen]
import bpy, os, sys
import numpy as np
B = os.path.dirname(os.path.abspath(__file__))
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
INNEN = ARGS == ['innen']
ORDER = ['bruecke', 'bruecke2', 'bruecke3', 'gang', 'koje', 'laderaum'] if INNEN else ['schraeg', 'wueste', 'weltraum', 'heck', 'nase', 'detail', 'front', 'seite', 'draufsicht']
NAME = 'wis-blatt-innen.jpg' if INNEN else 'wis-blatt.jpg'
W, H, C = 800, 450, 3; ROWS = (len(ORDER) + C - 1) // C
sheet = np.full((H * ROWS, W * C, 4), 0.06, dtype=np.float32); sheet[..., 3] = 1
for i, n in enumerate(ORDER):
    p = os.path.join(B, 'wis-' + n + '.jpg')
    if not os.path.exists(p): continue
    im = bpy.data.images.load(p); im.scale(W, H)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)
    r, c = divmod(i, C); y0 = (ROWS - 1 - r) * H
    sheet[y0:y0 + H, c * W:(c + 1) * W] = px
out = bpy.data.images.new('Blatt', W * C, H * ROWS); out.pixels = sheet.ravel()
out.filepath_raw = os.path.join(B, NAME); out.file_format = 'JPEG'; out.save()
