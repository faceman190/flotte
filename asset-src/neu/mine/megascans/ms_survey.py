# Bestandsaufnahme des Megascans-Pakets "Old Mine" (Rohdaten: je Ordner eine FBX + 8K-JPGs).
# Aufruf (ohne Oberfläche):
#   blender -b --factory-startup -P ms_survey.py -- "<...>\Old Mine-dc4dc139\mine_raw" "<Ausgabeordner>"
# Schreibt <Ausgabe>\survey.json (Dreiecke, Punkte, Maße in m, Objekte, UV-Ebenen, Texturen) und je Asset ein Vorschaubild
# <Ausgabe>\thumbs\<id>.png (512 px, Workbench mit Farbtextur, Schrägansicht von vorn oben, 1 m-Maßstab als graues Kreuz).
# Reine Oberflächen (ohne FBX) bekommen ein Vorschaubild auf einer 2x2-m-Platte. Lässt bereits fertige Assets aus (Neustart nach Abbruch).
import bpy, sys, os, json, math, time
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
SRC = argv[0]; OUT = argv[1]
os.makedirs(os.path.join(OUT, 'thumbs'), exist_ok=True)
JS = os.path.join(OUT, 'survey.json')
data = json.load(open(JS)) if os.path.exists(JS) else {}

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for b in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.objects):
        for x in list(b): b.remove(x)

def find(folder, *keys):
    for f in sorted(os.listdir(folder)):
        lf = f.lower()
        if any(('_' + k.lower() + '.') in lf for k in keys) and lf.endswith(('.jpg', '.png')): return os.path.join(folder, f)
    return None

def tex_mat(folder):
    col = find(folder, 'BaseColor', 'Basecolor', 'Albedo')
    m = bpy.data.materials.new('m'); m.use_nodes = True
    nt = m.node_tree; bsdf = nt.nodes.get('Principled BSDF')
    if col:
        im = bpy.data.images.load(col); im.scale(1024, 1024)         # klein halten, nur Vorschau
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im
        nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color'])
    return m

def render(objs, path):
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_WORKBENCH'
    sh = sc.display.shading; sh.light = 'STUDIO'; sh.color_type = 'TEXTURE'; sh.show_cavity = True
    sc.render.resolution_x = sc.render.resolution_y = 512; sc.render.film_transparent = False
    sc.world = sc.world or bpy.data.worlds.new('w')
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
    ctr = (lo + hi) / 2; size = max((hi - lo).length, 0.1)
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam)
    cam.data.type = 'ORTHO'; cam.data.ortho_scale = size * 1.05; cam.data.clip_end = size * 20
    d = Vector((0.9, -1.4, 0.8)).normalized()
    cam.location = ctr + d * size * 3
    cam.rotation_euler = (ctr - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sc.camera = cam
    sc.render.filepath = path; bpy.ops.render.render(write_still=True)

ids = sorted(d for d in os.listdir(SRC) if os.path.isdir(os.path.join(SRC, d)))
for i, aid in enumerate(ids):
    if aid in data and os.path.exists(os.path.join(OUT, 'thumbs', aid + '.png')): continue
    folder = os.path.join(SRC, aid); t0 = time.time()
    files = os.listdir(folder)
    fbx = sorted(f for f in files if f.lower().endswith('.fbx'))
    texs = sorted(f for f in files if f.lower().endswith(('.jpg', '.png')))
    clear()
    rec = {'fbx': fbx, 'textures': texs, 'mb': round(sum(os.path.getsize(os.path.join(folder, f)) for f in files) / 1e6, 1)}
    try:
        mat = tex_mat(folder)
        if fbx:
            objs = []
            for k, f in enumerate(fbx):
                before = set(bpy.data.objects)
                bpy.ops.import_scene.fbx(filepath=os.path.join(folder, f))
                new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
                for o in new: o.location.x += k * 0.0       # Varianten liegen meist schon nebeneinander
                objs += new
            tris = verts = 0; uvs = 0
            for o in objs:
                me = o.data; me.calc_loop_triangles(); tris += len(me.loop_triangles); verts += len(me.vertices); uvs = max(uvs, len(me.uv_layers))
                o.data.materials.clear(); o.data.materials.append(mat)
            bpy.context.view_layer.update()
            lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
            for o in objs:
                for c in o.bound_box:
                    w = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, w)); hi = Vector(map(max, hi, w))
            rec.update(kind='mesh', objects=[o.name for o in objs], tris=tris, verts=verts, uv_layers=uvs,
                       size_m=[round(v, 3) for v in (hi - lo)], min_m=[round(v, 3) for v in lo])
        else:
            bpy.ops.mesh.primitive_plane_add(size=2); o = bpy.context.object; o.data.materials.append(mat); objs = [o]
            rec.update(kind='surface')
        render(objs, os.path.join(OUT, 'thumbs', aid + '.png'))
    except Exception as e:
        rec['error'] = repr(e)
    rec['sec'] = round(time.time() - t0, 1)
    data[aid] = rec
    json.dump(data, open(JS, 'w'), indent=1)
    print(f'[{i + 1}/{len(ids)}] {aid} {rec.get("kind")} tris={rec.get("tris")} size={rec.get("size_m")} {rec["sec"]}s', flush=True)
print('FERTIG', len(data))
