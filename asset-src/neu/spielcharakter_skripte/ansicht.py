# Ansichten der Figuren des Pakets: je Figur „nur Körper“ und „mit eigener Ausrüstung“, von vorn und schräg hinten.
# Aufruf: blender -b -P ansicht.py -- <Paketordner> <Zielordner>
import bpy, sys, json, os, math
from mathutils import Vector

src, out = sys.argv[sys.argv.index('--') + 1:][:2]
spiel = json.load(open(os.path.join(src, 'spiel.json'), encoding='utf-8'))
os.makedirs(out, exist_ok=True)


def leer():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x, sc.render.resolution_y = 700, 1100
    sc.render.film_transparent = False
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.22, 0.24, 0.27, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    for n, (loc, e) in {'key': ((-2.5, -4, 4), 4.0), 'fill': ((3, -3, 2), 1.5), 'rim': ((1, 4, 3), 3.0)}.items():
        l = bpy.data.lights.new(n, 'SUN'); l.energy = e
        o = bpy.data.objects.new(n, l); sc.collection.objects.link(o)
        o.location = loc; o.rotation_euler = (Vector((0, 0, 1)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 85
    return sc, cam


def blick(cam, winkel, mitte=0.92, d=7.2):
    a = math.radians(winkel)
    cam.location = (math.sin(a) * d, -math.cos(a) * d, mitte + 0.1)
    cam.rotation_euler = (Vector((0, 0, mitte)) - cam.location).to_track_quat('-Z', 'Y').to_euler()


for c in spiel['charaktere']:
    sc, cam = leer()
    bpy.ops.import_scene.gltf(filepath=os.path.join(src, c['file']))
    eigen = {n for l in c['eigene_ausruestung'].values() for n in l}
    meshes = [o for o in sc.objects if o.type == 'MESH']
    for nur in (True, False):
        for o in meshes:
            o.hide_render = nur and o.name in eigen
        for w in (0, 150):
            blick(cam, w)
            sc.render.filepath = os.path.join(out, f"{c['id']}_{'koerper' if nur else 'voll'}_{w}.png")
            bpy.ops.render.render(write_still=True)
    # Kopf nah
    for o in meshes:
        o.hide_render = o.name in eigen
    sc.render.resolution_y = 700
    blick(cam, 20, 1.68, 1.9)
    sc.render.filepath = os.path.join(out, f"{c['id']}_kopf.png")
    bpy.ops.render.render(write_still=True)
