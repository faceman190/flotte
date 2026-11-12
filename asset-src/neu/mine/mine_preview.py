# Vorschaubilder für die Minen-Modelle (Mine.blend): Studio mit Licht von links oben, Kamera auf ein Objekt oder eine Sammlung gerichtet.
# shot(objs, path, dir=(1,-1,0.5), lens=60, size=(1200,800), samples=32, engine='CYCLES') rendert und speichert ein Bild.
import bpy, math, os
from mathutils import Vector

def _studio():
    sc = bpy.context.scene
    col = bpy.data.collections.get('vorschau') or bpy.data.collections.new('vorschau')
    if col.name not in sc.collection.children: sc.collection.children.link(col)
    def light(name, kind, loc, energy, size, color=(1, 1, 1)):
        ob = bpy.data.objects.get(name)
        if not ob:
            ld = bpy.data.lights.new(name, kind); ob = bpy.data.objects.new(name, ld); col.objects.link(ob)
        ob.data.energy = energy; ob.data.color = color
        if kind == 'AREA': ob.data.size = size
        ob.location = loc; ob.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        return ob
    light('v_key', 'AREA', (-3, -4, 5), 900, 3.0, (1.0, 0.96, 0.9))
    light('v_fill', 'AREA', (5, -2, 1.5), 220, 4.0, (0.8, 0.88, 1.0))
    light('v_rim', 'AREA', (1, 6, 4), 500, 2.0)
    cam = bpy.data.objects.get('v_cam')
    if not cam:
        cam = bpy.data.objects.new('v_cam', bpy.data.cameras.new('v_cam')); col.objects.link(cam)
    sc.camera = cam
    w = sc.world or bpy.data.worlds.new('Welt'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes.get('Background')
    if bg: bg.inputs[0].default_value = (0.035, 0.038, 0.045, 1); bg.inputs[1].default_value = 1.0
    sc.view_settings.view_transform = 'AgX'; sc.view_settings.exposure = -0.2
    return cam, col

def bounds(objs):
    lo = Vector((1e9, 1e9, 1e9)); hi = -lo
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != 'MESH': continue
        oe = o.evaluated_get(dg)
        for c in oe.bound_box:
            p = o.matrix_world @ Vector(c)
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    return lo, hi

def shot(objs, path, dir=(1, -1, 0.5), lens=60, size=(1200, 800), samples=32, engine='CYCLES', margin=1.15, hide_others=True):
    sc = bpy.context.scene; cam, vc = _studio()
    objs = [o for o in objs]
    hidden = []
    if hide_others:
        keep = set(objs) | set(vc.objects)
        for o in objs:
            p = o.parent
            while p: keep.add(p); p = p.parent
            for ch in o.children_recursive: keep.add(ch)
        for o in sc.objects:
            if o not in keep and not o.hide_render: o.hide_render = True; hidden.append(o)
    lo, hi = bounds(objs); c = (lo + hi) / 2; r = (hi - lo).length / 2
    cam.data.lens = lens; cam.data.clip_start = 0.01; cam.data.clip_end = 500
    fov = 2 * math.atan(18 / lens)
    d = Vector(dir).normalized(); dist = r * margin / math.sin(fov / 2) * (size[1] / size[0] if size[0] > size[1] else 1) ** 0
    cam.location = c + d * dist; cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.render.engine = engine; sc.render.resolution_x, sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    if engine == 'CYCLES': sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    sc.render.film_transparent = False; sc.render.image_settings.file_format = 'JPEG'; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    for o in hidden: o.hide_render = False
    return path
