# Bilder für Laden und Rucksack aus den echten Spielmodellen: Ausrüstungsteile der Spielerfigur, Waffen, Granate.
# Gleiches Studio wie der Bildbogen der übrigen Gegenstände (asset-src/neu/items/items_lib.py: Cycles, vier Flächenlichter,
# Kamera von vorn rechts oben, durchsichtiger Grund), damit alle Bilder im Laden zusammenpassen.
# Aufruf über scripts/build-itembilder.mjs:  blender -b -P bilder.py -- jobs.json
# jobs.json: [{ "name": "aus_helm_01", "file": "…glb", "out": "…png", "art": "teil" | "lyra" | "granate" | "waffe",
#               bei "waffe": "tex": "…/asset-src/tex/waffe_ar39" (ohne _col@2048.png) oder "plain": [r, g, b], "glas": [Knotennamen], "licht": […], "weg": […] }]
import bpy, sys, json, math
import numpy as np
from mathutils import Vector, Matrix

jobs = json.load(open(sys.argv[sys.argv.index('--') + 1], encoding='utf-8'))
SIZE, SAMPLES = 384, 160
CAM_DIR = Vector((1.2, -2.1, 1.25)).normalized()
LENS = 95.0


def studio():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = SAMPLES; sc.cycles.use_denoising = True
    try: sc.cycles.device = 'CPU'
    except Exception: pass
    sc.render.resolution_x = sc.render.resolution_y = SIZE; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    for vt, look in (('AgX', 'AgX - Medium High Contrast'), ('Filmic', 'Medium High Contrast'), ('Standard', 'None')):
        try:
            sc.view_settings.view_transform = vt
            try: sc.view_settings.look = look
            except Exception: pass
            break
        except Exception: continue
    sc.view_settings.exposure = -0.35
    cam = bpy.data.objects.new('Kamera', bpy.data.cameras.new('Kamera')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'PERSP'; cam.data.lens = LENS; cam.data.sensor_width = 36; cam.data.clip_end = 200
    cam.rotation_euler = CAM_DIR.to_track_quat('Z', 'Y').to_euler()
    # Studio: großes weiches Hauptlicht von links oben, schwache Aufhellung, kühles Kantenlicht von hinten, Licht von oben
    for name, loc, power, sz, col in [('Haupt', (-3.0, -3.6, 4.6), 950, 5.0, (1, 0.97, 0.93)), ('Aufhellung', (4.4, -2.6, 0.8), 160, 6.0, (0.85, 0.9, 1)),
                                      ('Kante', (2.2, 4.6, 3.4), 1100, 3.0, (0.72, 0.84, 1)), ('Oben', (0.4, 0.2, 6.0), 260, 4.0, (1, 1, 1))]:
        ld = bpy.data.lights.new(name, 'AREA'); ld.energy = power; ld.size = sz; ld.color = col
        lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.location = loc
        lo.rotation_euler = (-Vector(loc)).normalized().to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('Welt'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); mp = nt.nodes.new('ShaderNodeMapRange')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], mp.inputs['Value'])
    mp.inputs['From Min'].default_value = -1; mp.inputs['From Max'].default_value = 1
    nt.links.new(mp.outputs['Result'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = 0.4; ramp.color_ramp.elements[0].color = (0.01, 0.012, 0.016, 1)
    ramp.color_ramp.elements[1].position = 0.9; ramp.color_ramp.elements[1].color = (0.42, 0.47, 0.56, 1)
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.6
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    return sc, cam


def punkte(o):
    # Eckpunkte eines Netzes in Weltkoordinaten
    a = np.empty(len(o.data.vertices) * 3, dtype=np.float64); o.data.vertices.foreach_get('co', a)
    m = np.array(o.matrix_world, dtype=np.float64)
    return a.reshape(-1, 3) @ m[:3, :3].T + m[:3, 3]


def masse(objs, p=0.2):
    # Maße ohne Ausreißer (einzelne lose Punkte am Ursprung blähen sonst den Ausschnitt auf)
    pts = np.concatenate([punkte(o) for o in objs])
    return pts, np.percentile(pts, p, axis=0), np.percentile(pts, 100 - p, axis=0)


def lose(o):
    # vom Skelett lösen: Das Netz bleibt in Ruhehaltung stehen und lässt sich frei drehen
    mw = o.matrix_world.copy()
    for m in list(o.modifiers):
        if m.type == 'ARMATURE': o.modifiers.remove(m)
    o.parent = None; o.matrix_world = mw


def aufstellen(o, pos, dreh):
    # Handschuh: Finger nach oben, Handrücken zur Kamera (Hauptachsen der Eckpunkte)
    pts = punkte(o); c = pts.mean(axis=0)
    w, v = np.linalg.eigh(np.cov((pts - c).T))
    lang, dick = v[:, 2].copy(), v[:, 0].copy()
    if lang[2] > 0: lang = -lang                       # in der A-Haltung zeigen die Finger nach unten (lang = Richtung Handgelenk → Fingerspitzen)
    if dick[0] * c[0] < 0: dick = -dick                # der Handrücken zeigt vom Körper weg
    sz, sy = lang, -dick                               # Finger → +Z, Handrücken → −Y
    sy = sy - sz * sy.dot(sz); sy /= np.linalg.norm(sy)
    sx = np.cross(sy, sz)
    R = Matrix(np.array([sx, sy, sz]).tolist()).to_4x4()
    o.matrix_world = Matrix.Translation(pos) @ Matrix.Rotation(math.radians(dreh), 4, 'Z') @ R @ Matrix.Translation(Vector((-c).tolist())) @ o.matrix_world


def waffenmat(j):
    m = bpy.data.materials.new('waffe'); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes['Principled BSDF']
    if j.get('tex'):
        def tex(ext, farbe):
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = bpy.data.images.load(j['tex'] + ext)
            if not farbe: n.image.colorspace_settings.name = 'Non-Color'
            return n
        col, nrm, orm = tex('_col@2048.png', True), tex('_nrm@2048.png', False), tex('_orm@2048.png', False)
        ton = nt.nodes.new('ShaderNodeMixRGB'); ton.blend_type = 'MULTIPLY'; ton.inputs[0].default_value = 1.0
        t = j.get('ton', 1.0); ton.inputs[2].default_value = (t, t, t, 1)
        nt.links.new(col.outputs['Color'], ton.inputs[1]); nt.links.new(ton.outputs['Color'], b.inputs['Base Color'])
        sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(orm.outputs['Color'], sep.inputs[0])
        nt.links.new(sep.outputs['Green'], b.inputs['Roughness']); nt.links.new(sep.outputs['Blue'], b.inputs['Metallic'])
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(nrm.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    else:
        r, g, bl = j.get('plain', [0.03, 0.032, 0.036])
        b.inputs['Base Color'].default_value = (r, g, bl, 1); b.inputs['Metallic'].default_value = 0.75; b.inputs['Roughness'].default_value = 0.42
    return m


def einfach(name, farbe, metall, rau, leuchten=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*farbe, 1); b.inputs['Metallic'].default_value = metall; b.inputs['Roughness'].default_value = rau
    if leuchten:
        b.inputs['Emission Color'].default_value = (*farbe, 1); b.inputs['Emission Strength'].default_value = leuchten
    return m


for j in jobs:
    sc, cam = studio()
    bpy.ops.import_scene.gltf(filepath=j['file'])
    bpy.context.view_layer.update()
    art = j.get('art', 'teil')
    alle = [o for o in sc.objects if o.type == 'MESH']
    meshes = [o for o in alle if not o.name.startswith('Icosphere')]      # ohne die Hilfskugel des glTF-Imports für Knochen
    for o in alle:
        if o not in meshes: o.hide_render = True
    for o in meshes: lose(o)
    bpy.context.view_layer.update()
    for o in list(meshes):
        if o.name in j.get('weg', []):
            o.hide_render = True; meshes.remove(o)

    if art == 'waffe':
        haupt, glas, licht = waffenmat(j), einfach('glas', (0.01, 0.014, 0.02), 0.0, 0.06), einfach('licht', (1.0, 0.92, 0.78), 0.0, 0.3, 1.5)
        for o in meshes:
            mat = glas if o.name in j.get('glas', []) else licht if o.name in j.get('licht', []) else haupt
            o.data.materials.clear(); o.data.materials.append(mat)
        dreh = Matrix.Rotation(math.radians(-90), 4, 'Z')            # Lauf (Blender +Y) nach +X, die rechte Seite zur Kamera
    elif art in ('lyra', 'granate'):
        dreh = Matrix.Rotation(math.radians(-90), 4, 'X')            # Rahmen des Waffenknochens (x = Lauf, z = oben) aufrichten
    else:
        dreh = Matrix.Identity(4)
    if art in ('waffe', 'lyra'): dreh = Matrix.Rotation(math.radians(-22), 4, 'Y') @ dreh     # schräg ins Bild, Mündung oben (füllt das Quadrat besser)
    if art == 'granate': dreh = Matrix.Rotation(math.radians(-24), 4, 'Y') @ dreh
    for o in meshes: o.matrix_world = dreh @ o.matrix_world
    bpy.context.view_layer.update()

    # Paare, deren Seiten weit auseinander stehen (Handschuhe in der A-Haltung): nebeneinander aufstellen
    links = [o for o in meshes if o.name.lower().endswith('_l')]
    rechts = [o for o in meshes if o.name.lower().endswith('_r')]
    if len(links) == 1 and len(rechts) == 1:
        a, b = punkte(links[0]).mean(axis=0), punkte(rechts[0]).mean(axis=0)
        if np.linalg.norm(a - b) > 0.6:
            aufstellen(rechts[0], Vector((-0.075, 0, 0)), 14)
            aufstellen(links[0], Vector((0.075, 0.035, 0.012)), -14)
            bpy.context.view_layer.update()
        else:
            # Stiefel: stehen schulterbreit – zusammenrücken, bis nur ein schmaler Spalt bleibt, einer leicht nach hinten versetzt
            paar = sorted([links[0], rechts[0]], key=lambda o: punkte(o).mean(axis=0)[0])
            p0, p1 = punkte(paar[0]), punkte(paar[1])
            paar[0].matrix_world = Matrix.Translation(Vector((-0.012 - np.percentile(p0[:, 0], 99.5), 0, 0))) @ paar[0].matrix_world
            paar[1].matrix_world = Matrix.Translation(Vector((0.012 - np.percentile(p1[:, 0], 0.5), 0.06, 0))) @ paar[1].matrix_world
            bpy.context.view_layer.update()

    # auf Einheitsgröße bringen (das Licht steht fest: so wird jedes Teil gleich ausgeleuchtet) und in den Ursprung setzen
    pts, lo, hi = masse(meshes)
    s = 1.0 / max(hi - lo)
    norm = Matrix.Scale(s, 4) @ Matrix.Translation(Vector((-(lo + hi) / 2).tolist()))
    for o in meshes: o.matrix_world = norm @ o.matrix_world
    bpy.context.view_layer.update()
    pts, lo, hi = masse(meshes)
    pts = pts[np.all((pts >= lo - 1e-6) & (pts <= hi + 1e-6), axis=1)]

    # Kamera so weit zurück, dass das Teil das Bild füllt
    q = cam.rotation_euler.to_quaternion()
    right, up, back = np.array(q @ Vector((1, 0, 0))), np.array(q @ Vector((0, 1, 0))), np.array(q @ Vector((0, 0, 1)))
    xs, ys, zs = pts @ right, pts @ up, pts @ back
    x0, x1, y0, y1 = np.percentile(xs, 0.1), np.percentile(xs, 99.9), np.percentile(ys, 0.1), np.percentile(ys, 99.9)
    cx, cy, cz = (x0 + x1) / 2, (y0 + y1) / 2, (zs.min() + zs.max()) / 2
    t = 18.0 / LENS
    d = max(np.max((zs - cz) + np.abs(xs - cx) / t), np.max((zs - cz) + np.abs(ys - cy) / t))
    cam.location = Vector((right * cx + up * cy + back * (cz + d * 1.07)).tolist())
    sc.render.filepath = j['out']
    bpy.ops.render.render(write_still=True)
