# Übersichtsblatt aus den Einzelbildern wue-*.jpg (3 × 3, je 800 × 450): blender.exe -b --python wue_blatt.py
import bpy, os
import numpy as np
B = os.path.dirname(os.path.abspath(__file__))
import sys
ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
ORDER = ['schraeg', 'hangar', 'weltraum', 'draufsicht', 'seite', 'front', 'heck', 'cockpit', 'detail']
NAME = 'wue-blatt.jpg'
W, H, C = 800, 450, 3
sheet = np.full((H * 3, W * C, 4), 0.06, dtype=np.float32); sheet[..., 3] = 1
for i, n in enumerate(ORDER):
    p = os.path.join(B, 'wue-' + n + '.jpg')
    if not os.path.exists(p): continue
    im = bpy.data.images.load(p); im.scale(W, H)
    px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)
    r, c = divmod(i, C); y0 = (2 - r) * H      # Blender-Bilder beginnen unten
    sheet[y0:y0 + H, c * W:(c + 1) * W] = px
out = bpy.data.images.new('Blatt', W * C, H * 3); out.pixels = sheet.ravel()
out.filepath_raw = os.path.join(B, NAME); out.file_format = 'JPEG'; out.save()
