# Bilder der Ausrüstungsteile und Waffen für Laden und Rucksack: je Datei ein freigestelltes Bild (durchsichtiger Grund).
# Aufruf über scripts/build-figuren.mjs --bilder:  blender -b -P bilder.py -- jobs.json
# jobs.json: [{ "name": "aus_helm_01", "file": "…/Teil_helm_01.glb", "out": "…/aus_helm_01.png" }, …]
import bpy, sys, json, math
import numpy as np
from mathutils import Vector

jobs = json.load(open(sys.argv[sys.argv.index('--') + 1], encoding='utf-8'))


def szene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = sc.render.resolution_y = 512
    sc.render.film_transparent = True
    sc.view_settings.view_transform = 'Standard'
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs[0].default_value = (0.55, 0.6, 0.66, 1)
    w.node_tree.nodes['Background'].inputs[1].default_value = 0.9
    return sc


def sonne(sc, name, von, staerke, ziel):
    l = bpy.data.lights.new(name, 'SUN'); l.energy = staerke; l.angle = 0.3
    o = bpy.data.objects.new(name, l); sc.collection.objects.link(o)
    o.location = ziel + von; o.rotation_euler = (-von).to_track_quat('-Z', 'Y').to_euler()


for j in jobs:
    sc = szene()
    bpy.ops.import_scene.gltf(filepath=j['file'])
    meshes = [o for o in sc.objects if o.type == 'MESH' and len(o.data.materials)]      # ohne die Hilfskugel, die der glTF-Import für die Knochen anlegt
    bpy.context.view_layer.update()

    def box(objs):
        # Maße aus den Eckpunkten, ohne Ausreißer (einzelne lose Punkte am Ursprung blähen sonst den Ausschnitt auf)
        dg = bpy.context.evaluated_depsgraph_get()
        pts = []
        for o in objs:
            e = o.evaluated_get(dg); me = e.to_mesh()
            a = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get('co', a)
            a = a.reshape(-1, 3); m = np.array(e.matrix_world, dtype=np.float32)
            pts.append(a @ m[:3, :3].T + m[:3, 3]); e.to_mesh_clear()
        pts = np.concatenate(pts)
        return Vector(np.percentile(pts, 0.3, axis=0).tolist()), Vector(np.percentile(pts, 99.7, axis=0).tolist())

    # Paare (Handschuhe): stehen die beiden Seiten weit auseinander, nur die rechte zeigen
    links = [o for o in meshes if o.name.lower().endswith('_l')]
    rechts = [o for o in meshes if o.name.lower().endswith('_r')]
    if links and rechts:
        (a0, a1), (b0, b1) = box(links), box(rechts)
        if ((a0 + a1) / 2 - (b0 + b1) / 2).length > 0.6:
            for o in links:
                o.hide_render = True
            meshes = [o for o in meshes if o not in links]
    lo, hi = box(meshes)
    mitte, mass = (lo + hi) / 2, hi - lo
    waffe = not any(o.name.lower().startswith(('helm', 'weste', 'overall', 'handschuh', 'stiefel')) for o in meshes)
    if waffe:
        # von der Seite: quer zur längsten waagerechten Achse, leicht von oben
        lang = Vector((1, 0, 0)) if mass.x >= mass.y else Vector((0, 1, 0))
        quer = Vector((-lang.y, lang.x, 0))
        richtung = (quer * -1 + Vector((0, 0, 0.18)) + lang * 0.25).normalized()
    else:
        # Figur schaut nach −Y: von vorn, etwas von links und von oben
        richtung = Vector((0.42, -1, 0.22)).normalized()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = 'ORTHO'
    cam.location = mitte + richtung * 6
    cam.rotation_euler = (-richtung).to_track_quat('-Z', 'Y').to_euler()
    bpy.context.view_layer.update()
    # Ausschnitt: größte Ausdehnung der Ecken quer zur Blickrichtung
    inv = cam.matrix_world.inverted()
    r = 0.0
    for x in (lo.x, hi.x):
        for y in (lo.y, hi.y):
            for z in (lo.z, hi.z):
                p = inv @ Vector((x, y, z)); r = max(r, abs(p.x), abs(p.y))
    cam.data.ortho_scale = 2 * r * 1.06
    cam.data.clip_start, cam.data.clip_end = 0.1, 30
    seite = Vector((-richtung.y, richtung.x, 0)).normalized()
    sonne(sc, 'haupt', (richtung + seite * 0.8 + Vector((0, 0, 0.9))).normalized() * 5, 3.6, mitte)
    sonne(sc, 'fuell', (richtung - seite * 1.2 + Vector((0, 0, 0.1))).normalized() * 5, 1.3, mitte)
    sonne(sc, 'kante', (-richtung + Vector((0, 0, 0.8))).normalized() * 5, 2.6, mitte)
    sc.render.filepath = j['out']
    bpy.ops.render.render(write_still=True)
