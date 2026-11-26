# Testgang: 4× gang_a hintereinander (3,2 m), Kohleboden, Gleisbett, Lore, Grubenlampe; Stirnlampe an der Kamera (Augenhöhe 1,6 m).
# Aufruf: blender -b -P testgang.py -- [ansicht]   (öffnet MinenBaukasten.blend; ansicht = 'auge' (Standard), 'aussen', 'oben')
import bpy, sys, os, math
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from defs import *

view = (sys.argv[sys.argv.index('--') + 1:] or ['auge'])[0]
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, 'MinenBaukasten.blend'))
src = bpy.context.scene
sc = bpy.data.scenes.new('testgang')
if bpy.context.window: bpy.context.window.scene = sc
col = sc.collection

def put(name, loc, rz=0.0, s=None):
    o = bpy.data.objects[name].copy(); col.objects.link(o)
    o.location = loc; o.rotation_euler = (0, 0, math.radians(rz))
    if s: o.scale = s
    return o

for i in range(4): put('gang_a', (i * 3.2, 0, 0))
for ix in range(8):
    for iy in range(2): put('flaeche_shnnehua', (-1.6 + 1.0 + ix * 2.0 - 0.4, -0.8 + iy * 1.6, 0.0), s=(1, 0.8, 1))
gb = bpy.data.objects['gleisbett']; gbz = gb.bound_box
for k in range(6): put('gleisbett', (-1.0 + k * 2.5, 0, -0.06))
lore = put('lore_kohle', (6.2, 0, 0.12))
put('decal_sinqgag', (2.0, 0.9, 0.012), s=(0.6, 0.35, 1))
lp = put('lampe', (4.0, 1.12, 1.85), rz=float(os.environ.get('LAMPE_RZ', '0')))
put('stempel_kurz', (9.6, -1.0, 0), rz=10)
put('spitzhacke', (2.6, -1.05, 0.0), rz=80)

for o in list(col.objects): pass
r = sc.render; r.engine = 'BLENDER_EEVEE'; r.resolution_x, r.resolution_y = 1600, 900
sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'
w = bpy.data.worlds.new('dunkel'); sc.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.0045, 0.005, 1)
cam = bpy.data.objects.new('kamera', bpy.data.cameras.new('kamera')); col.objects.link(cam); sc.camera = cam
cam.data.lens = 22 if view == 'auge' else 30; cam.data.clip_start = 0.05
if view == 'auge':
    cam.location = (-1.2, -0.35, 1.6); tgt = Vector((8.0, 0.25, 1.15))
elif view == 'aussen':
    cam.location = (14.5, -6.0, 4.5); tgt = Vector((5.0, 0, 1.0)); cam.data.lens = 26
else:
    cam.location = (4.8, -0.01, 16); tgt = Vector((4.8, 0, 0)); cam.data.lens = 30
cam.rotation_euler = (tgt - cam.location).to_track_quat('-Z', 'Y').to_euler()
def light(name, kind, loc, energy, color, rot_to=None, size=None, parent=None):
    l = bpy.data.objects.new(name, bpy.data.lights.new(name, kind)); col.objects.link(l)
    l.location = loc; l.data.energy = energy; l.data.color = color
    if rot_to is not None: l.rotation_euler = (Vector(rot_to) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    if size and kind == 'SPOT': l.data.spot_size = math.radians(size); l.data.spot_blend = 0.6
    l.data.shadow_soft_size = 0.03 if kind == 'SPOT' else 0.08
    return l
if view == 'auge':
    light('stirnlampe', 'SPOT', (-1.05, -0.5, 1.5), 260, (1.0, 0.95, 0.88), rot_to=(8.0, 0.0, 0.9), size=55)
else:
    light('fuell', 'SUN', (0, 0, 10), 0.6, (0.8, 0.85, 1.0), rot_to=(2, 1, 0))
lpos = lp.matrix_world @ Vector((0, 0, 0))
light('grubenlampe', 'POINT', (4.0, 0.95, 1.85), 70, (1.0, 0.62, 0.3))
light('fern', 'POINT', (11.0, 0.0, 2.1), 40, (1.0, 0.6, 0.28))
out = os.path.join(OUT, 'vorschau', 'testgang.png' if view == 'auge' else f'testgang_{view}.png')
r.filepath = out; bpy.ops.render.render(write_still=True, scene=sc.name)
print('TESTGANG', out)
