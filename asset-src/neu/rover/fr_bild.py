# Vorschaubild einer Normkiste:  blender.exe -b FrachtKiste.blend --python fr_bild.py   → fr-<Name>.jpg (Cycles, Studio grau)
import bpy, os, math
from mathutils import Vector
B = os.path.dirname(bpy.data.filepath); NAME = os.path.splitext(os.path.basename(bpy.data.filepath))[0]
SC = bpy.context.scene
size = {'FrachtKiste': (1.2, 0.8, 0.8), 'FrachtPalette': (1.2, 1.2, 1.2), 'FrachtContainer': (3.0, 2.4, 2.4)}[NAME]
d = max(size) * 1.9
st = bpy.data.collections.new('Studio'); SC.collection.children.link(st)
def add(ob): st.objects.link(ob); return ob
bpy.ops.mesh.primitive_plane_add(size=60); pl = bpy.context.active_object
for c in pl.users_collection: c.objects.unlink(pl)
st.objects.link(pl)
gm = bpy.data.materials.new('Studioboden'); gm.use_nodes = True
b = next(n for n in gm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value = (0.09, 0.09, 0.095, 1); b.inputs['Roughness'].default_value = 0.6
pl.data.materials.append(gm)
def light(name, loc, energy, size_, col=(1, 1, 1)):
    li = bpy.data.lights.new(name, 'AREA'); li.energy = energy; li.size = size_; li.color = col
    ob = add(bpy.data.objects.new(name, li)); ob.location = loc
    ob.rotation_euler = (Vector((0, 0, size[2] / 2)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return ob
s = max(size) / 1.2
light('Haupt', (d * 0.9, -d * 1.1, d * 1.1), 900 * s * s, 3 * s, (1.0, 0.96, 0.9))
light('Fuell', (-d * 1.2, -d * 0.5, d * 0.6), 260 * s * s, 4 * s, (0.8, 0.88, 1.0))
light('Kante', (-d * 0.3, d * 1.3, d * 0.9), 500 * s * s, 2 * s)
w = bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True
w.node_tree.nodes['Background'].inputs[0].default_value = (0.02, 0.022, 0.025, 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
cd = bpy.data.cameras.new('Kamera'); cd.lens = 50
cam = add(bpy.data.objects.new('Kamera', cd)); SC.camera = cam
tgt = Vector((0, 0, size[2] * 0.45))
for tag, loc in (('', (d * 0.95, -d * 1.05, d * 0.62)), ('-tuer', (d * 1.25, d * 0.55, d * 0.45))):
    if tag and NAME != 'FrachtContainer': continue
    cam.location = loc; cam.rotation_euler = (tgt - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    SC.render.engine = 'CYCLES'; SC.cycles.samples = 48; SC.cycles.use_denoising = True
    SC.render.resolution_x, SC.render.resolution_y = 1280, 860
    SC.render.image_settings.file_format = 'JPEG'; SC.render.image_settings.quality = 88
    SC.render.filepath = os.path.join(B, 'fr-' + NAME + tag + '.jpg')
    bpy.ops.render.render(write_still=True)
