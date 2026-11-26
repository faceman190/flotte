# Vorschaubilder je Modul (Eevee, 1024 px): öffnet work\<modul>.blend, Kamera schräg von vorn oben, Studiolicht, grauer Boden.
# Aufruf: blender -b --factory-startup -P vorschau.py -- <modul> [...]   (ohne Namen: alle Module aus defs)
import bpy, sys, os, math
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from defs import *

VD = os.path.join(OUT, 'vorschau'); os.makedirs(VD, exist_ok=True)

def setup_scene(objs, path, size=1024, view=(1.0, -1.5, 0.75)):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.view_settings.view_transform = 'AgX'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.05, 0.055, 0.06, 1); w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    ctr = (lo + hi) / 2; rad = max((hi - lo).length / 2, 0.05)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.data.lens = 50; d = Vector(view).normalized()
    cam.location = ctr + d * rad * 3.2; cam.data.clip_start = rad * 0.02; cam.data.clip_end = rad * 50
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler(); sc.camera = cam
    for nm, loc, e in (('key', (2, -2, 3), 4.0), ('fill', (-3, -1, 1.5), 1.2), ('rim', (0, 3, 2), 2.5)):
        l = bpy.data.objects.new(nm, bpy.data.lights.new(nm, 'SUN')); sc.collection.objects.link(l)
        l.data.energy = e; l.rotation_euler = (-Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=rad * 20, location=(ctr.x, ctr.y, lo.z - 0.001))
    fl = bpy.context.object; m = bpy.data.materials.new('boden'); m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.08, 0.08, 0.08, 1); fl.data.materials.append(m)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--') + 1:] or [m['name'] for m in MODULES]
    for n in names:
        wb = os.path.join(WORK, n + '.blend')
        if os.path.exists(wb):
            bpy.ops.wm.open_mainfile(filepath=wb)
        else:                                   # zusammengesetzte Module (tuerstock, flaeche_*, decal_*) aus der Baukasten-Datei
            bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, 'MinenBaukasten.blend'))
            for o in list(bpy.data.objects):
                if o.name != n: bpy.data.objects.remove(o)
        objs = [o for o in bpy.data.objects if o.type == 'MESH']
        setup_scene(objs, os.path.join(VD, n + '.png'))
        print('VORSCHAU', n, flush=True)
