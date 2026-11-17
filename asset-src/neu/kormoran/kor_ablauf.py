# Ablaufblatt der Animationen: einzelne Bilder aus Kormoran.blend (nach kor_lauf.py) als Reihe, oben Rampe, unten Leiter.
#   blender.exe -b Kormoran.blend --python kor_ablauf.py      → kor-ablauf.jpg
import bpy, os
import numpy as np
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
for d in cp.devices: d.use = d.type == 'OPTIX'
SC.render.engine = 'CYCLES'; SC.cycles.device = 'GPU'; SC.cycles.samples = 32; SC.cycles.use_denoising = True
SC.render.image_settings.file_format = 'JPEG'; SC.render.resolution_x, SC.render.resolution_y = 640, 360; SC.render.resolution_percentage = 100
ROWS = [('Heck', 0.2, (1, 24, 42, 60, 80, 100)), ('Leiter', 1.0, (1, 12, 22, 34, 46, 60))]
W, H, C = 640, 360, 6
sheet = np.full((H * 2, W * C, 4), 0.05, dtype=np.float32); sheet[..., 3] = 1
for r, (cam, ex, frames) in enumerate(ROWS):
    SC.camera = next(o for o in bpy.data.objects if o.type == 'CAMERA' and o.name.split('.')[0] == cam); SC.view_settings.exposure = ex
    bpy.data.materials['Triebwerksglut'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.0
    for c, f in enumerate(frames):
        SC.frame_set(f); p = os.path.join(B, '_ablauf.jpg'); SC.render.filepath = p; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(p); px = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4); bpy.data.images.remove(im)
        y0 = (1 - r) * H; sheet[y0:y0 + H, c * W:(c + 1) * W] = px
out = bpy.data.images.new('Ablauf', W * C, H * 2); out.pixels = sheet.ravel()
out.filepath_raw = os.path.join(B, 'kor-ablauf.jpg'); out.file_format = 'JPEG'; out.save()
os.remove(os.path.join(B, '_ablauf.jpg'))
