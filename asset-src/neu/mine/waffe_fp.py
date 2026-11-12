# Vorschau der Waffe aus Sicht des Spielers (wie im Spiel: senkrechter Bildwinkel 74°, Waffe rechts unten), dunkler Stollen mit Stirnlampe.
import bpy, math, os
from mathutils import Vector

def fp_shot(path, eye=(-0.115, -0.20, 0.155), look=(0.02, 0.9, 0.0), size=(1280, 720), samples=32, lamp=True):
    sc = bpy.context.scene
    col = bpy.data.collections.get('vorschau_fp') or bpy.data.collections.new('vorschau_fp')
    if col.name not in sc.collection.children: sc.collection.children.link(col)
    cam = bpy.data.objects.get('fp_cam')
    if not cam:
        cam = bpy.data.objects.new('fp_cam', bpy.data.cameras.new('fp_cam')); col.objects.link(cam)
    cam.data.sensor_fit = 'VERTICAL'; cam.data.sensor_height = 24; cam.data.lens = 12 / math.tan(math.radians(37)); cam.data.clip_start = 0.01
    cam.location = eye; cam.rotation_euler = Vector(look).to_track_quat('-Z', 'Y').to_euler()
    def light(name, kind, loc, energy, size=0.1, color=(1, 1, 1), target=None, spot=None):
        ob = bpy.data.objects.get(name)
        if not ob:
            ob = bpy.data.objects.new(name, bpy.data.lights.new(name, kind)); col.objects.link(ob)
        ob.data.energy = energy; ob.data.color = color; ob.location = loc
        if kind in ('AREA',): ob.data.size = size
        if kind == 'SPOT': ob.data.spot_size = spot or math.radians(60); ob.data.spot_blend = 0.6; ob.data.shadow_soft_size = 0.02
        if target is not None: ob.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
        return ob
    # Stirnlampe knapp über dem Auge, warme Grubenlampe vorn oben links, schwaches kaltes Umgebungslicht
    light('fp_kopf', 'SPOT', (eye[0] + 0.02, eye[1], eye[2] + 0.05), 6 if lamp else 0, target=(0.0, 2.0, -0.1), spot=math.radians(70))
    light('fp_lampe', 'AREA', (-0.6, 1.2, 1.3), 25, 0.4, (1.0, 0.75, 0.45), target=(0, 0.2, 0))
    light('fp_kalt', 'AREA', (1.2, -0.6, 0.6), 4, 1.0, (0.6, 0.75, 1.0), target=(0, 0.2, 0))
    for n in ('v_key', 'v_fill', 'v_rim'):
        o = bpy.data.objects.get(n)
        if o: o.hide_render = True
    sc.camera = cam
    w = sc.world; bg = w.node_tree.nodes.get('Background')
    old = tuple(bg.inputs[0].default_value)
    bg.inputs[0].default_value = (0.006, 0.006, 0.007, 1)
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.render.resolution_x, sc.render.resolution_y = size
    sc.render.image_settings.file_format = 'JPEG'; sc.render.filepath = path
    bpy.ops.render.render(write_still=True)
    bg.inputs[0].default_value = old
    for n in ('v_key', 'v_fill', 'v_rim'):
        o = bpy.data.objects.get(n)
        if o: o.hide_render = False
    for o in col.objects:
        if o.type == 'LIGHT': o.data.energy = 0
    return path
