# Katalog des Baukastens: stellt alle Bauteile nebeneinander auf (Baukasten.blend, Sammlung „Katalog“). Dient als Sichtprüfung und Nachschlagewerk.
import bpy, math, os
from mathutils import Vector

def catalog(lib):
    K = lib.Kit('Katalog', seed=3)
    # Reihe 1: Baukörper, Tor, Flügel
    K.block(8, 6, 5, (0, 0, 0))
    K.block(16, 7, 11, (20, 4, 0)); K.gate(loc=(20, -0.3, 0), number='01')
    K.block(6, 10, 9.5, (44, 0, 0)); K.wing(10, 13, 8.6, 2.4, (47, 0, 0), 1); K.windows(9, (53.5, -5.0, 2.6), 0, 0.6)
    # Reihe 2: Laufsteg, Plattform, Rampe, Treppe, Tür, Wandkästen
    K.walkway(10, loc=(0, -24, 0)); K.platform(8, 8, 1.6, (15, -24, 0)); K.crate(1.6, 1.6, 1.4, (14, -23, 1.6)); K.cage((17, -25, 1.6), 2.0)
    K.slab(9, 4, 1.6, (30, -20, 0)); K.ramp(8, 10, 1.6, (30, -22, 0))
    K.block(7, 4, 3.4, (44, -22, 0), plinth=0.4, cornice=0.3); K.door((42.5, -24.0, 0)); K.panel('ctrl', (45.3, -24.0, 1.0), glow='screen'); K.panel('vent', (46.6, -24.0, 1.9), w=1.0, h=1.0, depth=0.15, tint='hull_mid')
    K.windows(3, (45.5, -24.0, 2.4), 0, 0.5); K.vent_unit((44, -22, 3.4)); K.pipe([(40.4, -24.2, 0.5), (40.4, -24.2, 3.0), (40.4, -20.5, 3.0), (40.4, -20.5, 0.4)], 0.2)
    K.stairs(1.6, 2.4, (54, -20, 0)); K.slab(3, 3, 2.4, (54, -18.5, 0))
    # Reihe 3: Technik
    K.mast_light(12, (0, -44, 0)); K.antenna(10, (5, -44, 0)); K.dish(2.0, (11, -44, 0), 0.4); K.turret((18, -44, 0)); K.silo(2.5, 9, (27, -44, 0))
    K.tank(1.4, 5, (37, -44, 0)); K.generator((45, -44, 0)); K.vent_unit((51, -44, 0)); K.sphere(1.8, (57, -44, 2.4), 'white'); K.box((3.2, 3.2, 0.8), (57, -44, 0), side='girder', tint='hull_dark')
    # Reihe 4: Fracht, Fahrzeuge, Kleinteile
    K.crate(1.6, 1.6, 1.4, (0, -60, 0), 0.2, 'yellow'); K.crate(2.0, 1.4, 1.2, (2.2, -60.3, 0), -0.1); K.crate(1.2, 1.2, 1.0, (0.3, -60.1, 1.4), 0.5, 'hull_light', 'warn')
    K.container((8, -60, 0), 0.0, 'blue'); K.container((8, -60, 2.6), 0.06, 'orange', '14')
    for i, t in enumerate(('red', 'blue', 'yellow', 'hull_light')): K.barrel((14 + (i % 2) * 1.0, -60 + (i // 2) * 1.0, 0), t)
    K.cage((18.5, -60, 0)); K.hauler((25, -60, 0)); K.cart((31, -60, 0)); K.post((35, -60, 0)); K.beacon((40, -60, 0)); K.barrier(4, (46, -60, 0), math.pi / 2)
    K.signpost('p_caution', (51, -60, 0)); K.signpost('w_kein_zutritt', (55, -60, 0), 0, 3.0, 0.9); K.ladder(4, (58, -60, 0))
    K.cable((33.5, -58, 2.6), (36.5, -58, 2.6), 0.5)
    # Landefeld
    K.pad(30, (28, -92, 0), number='3')
    return K.build('Katalog')

def stage():
    """Licht, Boden und Kamera für Vorschaubilder."""
    sc = bpy.context.scene
    if 'Sonne' not in bpy.data.objects:
        ld = bpy.data.lights.new('Sonne', 'SUN'); ld.energy = 4.5; ld.angle = 0.03
        o = bpy.data.objects.new('Sonne', ld); sc.collection.objects.link(o); o.rotation_euler = (0.9, 0.1, 0.7)
    w = sc.world or bpy.data.worlds.new('Welt'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.5, 0.62, 0.8, 1); bg.inputs['Strength'].default_value = 1.0
    if 'Boden' not in bpy.data.objects:
        import bmesh
        gm = bpy.data.meshes.new('Boden'); gb = bmesh.new(); bmesh.ops.create_grid(gb, x_segments=1, y_segments=1, size=300); gb.to_mesh(gm); gb.free()
        g = bpy.data.objects.new('Boden', gm); g.location = (0, 0, -0.02); sc.collection.objects.link(g)
        m = bpy.data.materials.new('Vorschau_Boden'); m.use_nodes = True; p = m.node_tree.nodes['Principled BSDF']
        p.inputs['Base Color'].default_value = (0.32, 0.3, 0.27, 1); p.inputs['Roughness'].default_value = 0.95; g.data.materials.append(m)
    if 'Kamera' not in bpy.data.objects:
        cd = bpy.data.cameras.new('Kamera'); cam = bpy.data.objects.new('Kamera', cd); sc.collection.objects.link(cam)
    sc.camera = bpy.data.objects['Kamera']; sc.render.engine = 'BLENDER_EEVEE'
    try: sc.view_settings.view_transform = 'AgX'
    except Exception: pass

def shot(name, loc, target, lens=35, res=(1400, 800)):
    sc = bpy.context.scene; cam = bpy.data.objects['Kamera']; cam.location = loc; cam.data.lens = lens; cam.data.clip_end = 2000
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    sc.render.resolution_x, sc.render.resolution_y = res; sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
    p = os.path.join(r'C:\Users\faceman\AppData\Local\Temp\claude\9a52c165993aa257\09829c39-fe8e-4d44-a1e4-3f882dd39d43\scratchpad', name + '.jpg')
    sc.render.filepath = p; bpy.ops.render.render(write_still=True)
    return p
