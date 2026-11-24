# Rover „Dachs“ fürs Spiel exportieren (abgewandelt aus ../sektor3/s3_export.py):  blender.exe -b Rover.blend --python rv_export.py
# Unterschied: je Sammlung ein eigenes Teil (Aufbau, Rad_VL … Rad_HR, Bohrer); Netze heißen <Teil>__<Gruppe>, das Spiel setzt Räder und Bohrer
# selbst auf ihren Mittelpunkt (models/rover.ts).
# Unterschiede: eigene Einstellungen je Bau, Warnstreifen erkennt es am Streifenmuster (nicht am Namen), Protokoll s3-export.txt
# Je Boje zwei Dateien nach asset-src/glb/station/:
#   <Name>.glb      Nahmodell, vereinfacht (Schrift und Leuchtteile bleiben unvereinfacht, damit sie lesbar und rund bleiben)
#   <Name>Fern.glb  Fernmodell ohne Kleinteile, Schrift und Schrauben, ein paar hundert bis wenige tausend Dreiecke
# Achsen fürs Spiel: oben +Y, Ursprung am Fuß der Boje (Blender z = 0); der glTF-Export macht Y nach oben.
# Materialien: wenige schlichte PBR-Materialien „bj_<gruppe>“; die Einzelfarben aus den Blender-Materialien (Angaben „bk“) wandern in
# Eckfarben (Farbattribut „Col“, im Spiel vertexColors), damit eine Boje mit wenigen Zeichenaufrufen auskommt. Leuchtteile behalten je Farbe
# ein eigenes Material mit Leuchten. Warnstreifen (im Blender-Bild ein Shader) rechnet das Spiel (src/game/bojen.ts).
# Ohne Bühnen, Kameras und Lichter. Protokoll in bojen-export.txt neben der .blend.
import bpy, bmesh, json, os, math
from mathutils import Matrix
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
NAME = os.path.splitext(os.path.basename(bpy.data.filepath))[0]          # Navigationsboje | Gedenkboje
OUT = os.path.join(B, '..', '..', 'glb', 'deco')      # Hintergrund-Paket (deco/Rover)      # Hintergrund-Paket (deco/<Name>), nicht vor dem Menü geladen
CFG = {
    'Navigationsboje': {'near': 0.25, 'far': 0.12, 'drop_near': {'Schraube'}, 'schrift': 1.0, 'res': 4, 'far_min': 0.35},
    'Gedenkboje': {'near': 0.22, 'far': 0.08, 'drop_near': set(), 'schrift': 1.0, 'res': 3, 'far_min': 0.4},
    'Rover': {'near': 0.55, 'far': 0.12, 'drop_near': set(), 'schrift': 1.0, 'res': 3, 'far_min': 0.25},
    'Torwache': {'near': 0.4, 'far': 0.05, 'drop_near': set(), 'schrift': 1.0, 'res': 3, 'far_min': 2.5},
    'Fernohr': {'near': 0.4, 'far': 0.05, 'drop_near': set(), 'schrift': 1.0, 'res': 3, 'far_min': 3.0},
    'Pumpwerk': {'near': 0.4, 'far': 0.05, 'drop_near': set(), 'schrift': 1.0, 'res': 3, 'far_min': 2.5},
}[NAME]
SKIP_COLL = {'Studio grau', 'Studio', 'Kameras', 'Lichter', 'Buehne', 'Bühne', 'Weltraum'}
BRIGHT = 1.5                                   # die Blender-Farben sind fürs Studiolicht sehr dunkel
# Gruppen: Metall/Lack (Farben aus den Ecken), Schrift (unvereinfacht), Warnstreifen (Shader im Spiel), Glas, Leuchten (eigene Materialien)
GROUP_P = {'lack': (0.45, 0.55), 'metall': (0.85, 0.4), 'matt': (0.1, 0.7), 'schrift': (0.2, 0.6), 'warn': (0.0, 0.6)}
FINE = {'schrift'}                             # nur planar vereinfachen
log = []

def bk(m):
    if m is None or 'bk' not in m.keys(): return {}
    try: return json.loads(m['bk'])
    except Exception: return {}
def group_of(m):
    if m is None: return 'lack'
    n = m.name.split('.')[0]; d = bk(m)
    if n.startswith('Schrift') or n.startswith('Schablone'): return 'schrift'
    if d.get('stripes'): return 'warn'
    if 'glas' in n.lower(): return 'glas'
    if d.get('emit') or d.get('stripes'): return 'glow:' + n
    metal = d.get('metal', 0.5)
    if metal >= 0.8: return 'metall'
    if metal <= 0.15: return 'matt'
    return 'lack'
def colour(m):
    d = bk(m)
    col = d.get('col') or d.get('a') or [0.1, 0.1, 0.1]
    return tuple(min(1.0, c * BRIGHT) for c in col[:3])
CACHE = {}
def gmat(g, src):
    if g in CACHE: return CACHE[g]
    e = bpy.data.materials.new('bj_' + g.replace('glow:', 'glow_').replace(' ', '_').lower()); e.use_nodes = True
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); n = len(CACHE)
    if g == 'glas':
        b.inputs['Base Color'].default_value = (0.6, 0.62, 0.6, 1); b.inputs['Alpha'].default_value = 0.25
        b.inputs['Roughness'].default_value = 0.08; b.inputs['Metallic'].default_value = 0.0
        e.blend_method = 'BLEND' if hasattr(e, 'blend_method') else e.blend_method
        try: e.surface_render_method = 'BLENDED'
        except Exception: pass
    elif g.startswith('glow:'):
        d = bk(src); em = d.get('emit') or d.get('a') or [1, 0.8, 0.5]; col = d.get('col') or em
        b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = 0.0
        b.inputs['Roughness'].default_value = d.get('rough', 0.3)
        b.inputs['Emission Color'].default_value = (*em[:3], 1)
        # Stärke fürs Spiel: helle Lampen 2, hinterleuchtete Tafeln und Anzeigen schwach
        es = d.get('es', 1.0); b.inputs['Emission Strength'].default_value = 2.0 if es >= 5 else max(0.35, es)
    else:
        metal, rough = GROUP_P.get(g, (0.4, 0.5))
        b.inputs['Base Color'].default_value = (1, 1, 1, 1); b.inputs['Metallic'].default_value = metal
        b.inputs['Roughness'].default_value = min(1.0, rough + n * 0.0013)      # winziger Unterschied: sonst legt das Packen gleiche Materialien zusammen
    CACHE[g] = e; return e
def in_coll(o, names): return any(c.name in names for c in o.users_collection)

dg = bpy.context.evaluated_depsgraph_get()
parts = {}                       # (gruppe) -> bmesh, Material je Gruppe
srcmat = {}
TEILE = ('Aufbau', 'Rad_VL', 'Rad_VR', 'Rad_ML', 'Rad_MR', 'Rad_HL', 'Rad_HR', 'Bohrer')
def teil_of(o): return next((c.name for c in o.users_collection if c.name in TEILE), 'Aufbau')
def add(me, drop, teil='Aufbau'):
    src = list(me.materials) or [None]
    tmp = bmesh.new(); tmp.from_mesh(me)
    lay = tmp.loops.layers.float_color.get('Col') or tmp.loops.layers.float_color.new('Col')
    per = {}
    for f in tmp.faces:
        m = src[min(f.material_index, len(src) - 1)]
        if m is not None and m.name.split('.')[0] in drop: continue
        g = group_of(m); srcmat.setdefault(g, m)
        per.setdefault(g, []).append(f)
        c = colour(m) if g in GROUP_P else (1.0, 1.0, 1.0)
        if g == 'warn':
            d = bk(m); a = d.get('a', [0.6, 0.45, 0.04]); c = tuple(min(1.0, x * BRIGHT) for x in a[:3])
        for l in f.loops: l[lay] = (*c, 1.0)
    for g, fs in per.items():
        keep = set(fs)
        cp = tmp.copy(); lay2 = cp.loops.layers.float_color.get('Col')
        cp.faces.ensure_lookup_table()
        idx = set(f.index for f in fs)
        bmesh.ops.delete(cp, geom=[f for f in cp.faces if f.index not in idx], context='FACES')
        me2 = bpy.data.meshes.new('t'); cp.to_mesh(me2); cp.free()
        parts.setdefault((teil, g), bmesh.new()).from_mesh(me2); bpy.data.meshes.remove(me2)
    tmp.free()

def collect(drop, far=False):
    global dg
    parts.clear(); n = 0
    # Schrift: grobere Kurvenauflösung statt Vereinfachen (sonst fallen Buchstaben weg)
    for o in bpy.data.objects:
        if o.type == 'FONT': o.data.resolution_u = 3 if far else CFG['res']
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    for o in list(bpy.data.objects):
        if o.type not in ('MESH', 'CURVE', 'FONT') or in_coll(o, SKIP_COLL) or o.hide_render or not o.users_collection: continue
        if far and max(o.dimensions) < CFG['far_min']: continue      # Kleinteile fehlen im Fernmodell
        try: me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
        except Exception: continue
        if not me.polygons: bpy.data.meshes.remove(me); continue
        me.transform(o.matrix_world); add(me, drop, teil_of(o)); bpy.data.meshes.remove(me); n += 1
    # Instanzen (Schrauben o. Ä. über Instanzflächen)
    for inst in dg.object_instances:
        if not inst.is_instance or inst.object.type != 'MESH': continue
        if any(d in (inst.object.active_material.name if inst.object.active_material else '') for d in drop): continue
        if in_coll(inst.parent or inst.object, SKIP_COLL): continue
        me = bpy.data.meshes.new_from_object(inst.object.original.evaluated_get(dg) if inst.object.original else inst.object, depsgraph=dg)
        me.transform(inst.matrix_world); add(me, drop); bpy.data.meshes.remove(me); n += 1
    return n

def tri(bm): return sum(len(f.verts) - 2 for f in bm.faces)
def to_obj(name, bm, mat):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); me.materials.append(mat)
    if 'Col' in me.color_attributes:
        me.color_attributes.active_color = me.color_attributes['Col']; me.color_attributes.render_color_index = me.color_attributes.find('Col')
    ob = bpy.data.objects.new(name, me); SC.collection.objects.link(ob); return ob
def simplify(ob, ratio, planar_only=False):
    bpy.context.view_layer.objects.active = ob
    m1 = ob.modifiers.new('Plan', 'DECIMATE'); m1.decimate_type = 'DISSOLVE'; m1.angle_limit = math.radians(0.8); m1.delimit = {'MATERIAL'}
    if not planar_only and ratio < 1:
        m2 = ob.modifiers.new('Weniger', 'DECIMATE'); m2.decimate_type = 'COLLAPSE'; m2.ratio = ratio; m2.use_collapse_triangulate = True
    m3 = ob.modifiers.new('Drei', 'TRIANGULATE')
    d = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(ob.evaluated_get(d), depsgraph=d)
    ob.modifiers.clear(); old = ob.data; ob.data = me; bpy.data.meshes.remove(old); me.validate()
    for p in me.polygons: p.use_smooth = True
    try: me.set_sharp_from_angle(angle=math.radians(35))
    except Exception: pass
    return sum(len(p.vertices) - 2 for p in me.polygons)
VC = {}
for _k, _v in (('export_vertex_color', 'ACTIVE'), ('export_colors', True)):
    if _k in bpy.ops.export_scene.gltf.get_rna_type().properties.keys(): VC[_k] = _v
def export(objs, fname):
    for o in SC.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    path = os.path.join(OUT, fname)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_materials='EXPORT',
                              export_cameras=False, export_lights=False, export_animations=False, export_extras=False, export_normals=True, export_texcoords=False, **VC)
    log.append('%s %.2f MB' % (fname, os.path.getsize(path) / 1e6))

def build(fname, drop, ratio, far):
    n = collect(drop, far); log.append('%s: Quellen %d, roh %s' % (fname, n, {'%s/%s' % k: tri(b) for k, b in parts.items()}))
    objs, total = [], 0
    for (teil, g), bm in parts.items():
        if far and g in ('schrift', 'glas'): continue
        if g in FINE:      # flache Schrift liegt fast auf der Wand; die vereinfachte Wand wölbt sich sonst darüber → um 6 mm nach außen
            bm.normal_update()
            for v in bm.verts:
                if v.link_faces: v.co += v.normal * 0.006
        ob = to_obj('%s__%s' % (teil, g.replace('glow:', 'glow_')), bm, gmat(g, srcmat.get(g)))
        if g.startswith('glow:') or g == 'glas': t = simplify(ob, 0.3 if far else (0.4 if tri(bm) > 1500 else 1.0))
        elif g in FINE: t = simplify(ob, CFG['schrift'], planar_only=CFG['schrift'] >= 1)
        else: t = simplify(ob, ratio)
        objs.append(ob); total += t
    for b in parts.values(): b.free()
    parts.clear()
    log.append('%s %d Dreiecke' % (fname, total)); export(objs, fname)
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)

os.makedirs(OUT, exist_ok=True)
build(NAME + '.glb', CFG['drop_near'], CFG['near'], False)
build(NAME + 'Fern.glb', CFG['drop_near'] | {'Schraube', 'Taste', 'Gummi'}, CFG['far'], True)
open(os.path.join(B, 'rv-export.txt'), 'w', encoding='utf-8').write('\n'.join(log))
print('\n'.join(log))
