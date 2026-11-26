# Milan-Cockpit fürs Spiel (Ich-Sicht im Flug): blender.exe -b Milan.blend --python mil_export_cockpit.py
# Eigene Datei MilanCockpit.glb in voller Auflösung (das Schiffsmodell Milan.glb trägt nur die groben Teile des Cockpits, siehe mil_export.py).
# Inhalt: Sammlung „Cockpit“ (mil_cockpit.py), dazu die Kanzel (Glas, Bügel, Schienen, Spiegel) und die Dichtung am Rumpf.
# Koordinaten: gleich in Schiffskoordinaten in Metern (Nase −Z, oben +Y, Mitte = Mitte des Schiffsmodells aus mil-gelenke.json), das Spiel
# hängt die Datei ohne Umrechnung an das Schiff (src/game/cockpit.ts).
# Materialien: schlichte PBR-Werte aus m['bk'], Name „ext_cp_<Name>“ (ext_: build-assets.mjs behält dann Eckfarben und Texturkoordinaten).
#   Schirme („ext_cp_Schirm …“) tragen UV 0…1; das Spiel legt dort seine Zeichenflächen auf.
# Eckfarben (COLOR_0), für den Cockpit-Shader im Spiel:
#   R = Umgebungsverdeckung (Cycles, 0,5 m; dunkle Ecken und Fugen), G = Kantenabrieb (1 auf Fasen an scharfen konvexen Kanten, sonst 0), B = 1
# Ausgabe: ../../glb/deco/MilanCockpit.glb, mil-cockpit-export.txt (Dreiecke, Augpunkt in Schiffskoordinaten)
import bpy, bmesh, json, os, math
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
gel = json.load(open(os.path.join(B, 'mil-gelenke.json'))); anker = json.load(open(os.path.join(B, 'mil-anker.json')))
MX, MY, MZ = gel['mitte']
SKIP_MAT = {'Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb'}
GLASS = {'Kuppelglas': 0.1, 'Kanzelglas': 0.1, 'CP Schirm HUD': 0.12}
CACHE = {}
def exp_mat(m):
    if m is None: return None
    if m.name in CACHE: return CACHE[m.name]
    bk = json.loads(m['bk']) if 'bk' in m.keys() else {}
    col = [(a + c) / 2 for a, c in zip(bk['a'], bk['c'])] if bk.get('stripes') else (bk.get('col') or [0.05, 0.06, 0.1])
    metal, rough = float(bk.get('metal', 0.3)), float(bk.get('rough', 0.5)); emit, es = bk.get('emit'), float(bk.get('es', 0.0))
    if bk.get('stripes') and bk.get('es'): emit = col
    e = bpy.data.materials.new('ext_cp_' + m.name.replace('CP ', '')); e.use_nodes = True
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit and es: b.inputs['Emission Color'].default_value = (*emit[:3], 1); b.inputs['Emission Strength'].default_value = min(3.0, es * 0.5)
    if m.name in GLASS:
        b.inputs['Base Color'].default_value = (0.5, 0.6, 0.62, 1); b.inputs['Alpha'].default_value = GLASS[m.name]; b.inputs['Roughness'].default_value = 0.04; b.inputs['Metallic'].default_value = 0.0
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(e, k, v)
            except Exception: pass
    CACHE[m.name] = e; return e
def tag_of(o):
    while o is not None:
        if 'tag' in o.keys(): return o['tag']
        o = o.parent
    return None
def wanted(o):
    if o.type not in ('MESH', 'CURVE', 'FONT') or o.hide_render: return False
    if any(c.name == 'Cockpit' for c in o.users_collection): return True
    p = o.parent
    while p is not None:      # Kanzel: hängt am Leerobjekt „Gelenk kanzel“ (mil_kit.py gelenke_anlegen)
        if p.name.startswith('Gelenk kanzel'): return True
        p = p.parent
    if o.name.startswith('Kanzeldichtung'): return True
    return o.type == 'FONT' and o.data.body == 'RETTUNG' and abs(o.matrix_world.translation.y) < 0.4      # Schrift am Sitz
# Blender → Schiff (in Blender-Achsen vorbereitet, der Export dreht Y-up): (x, y, z) → (−y, x − MX, z − MZ)
from mathutils import Matrix
TO = Matrix(((0, -1, 0, MY), (1, 0, 0, -MX), (0, 0, 1, -MZ), (0, 0, 0, 1)))
out = bpy.data.collections.new('ExportCockpit'); SC.collection.children.link(out)
dg = bpy.context.evaluated_depsgraph_get(); src = []; fest = []; glas = []
for o in list(bpy.data.objects):
    if not wanted(o): continue
    if any(m and m.name in SKIP_MAT for m in o.data.materials): continue
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    if not me.polygons: bpy.data.meshes.remove(me); continue
    me.transform(TO @ o.matrix_world)
    isglas = any(m and m.name in GLASS for m in me.materials)
    for i, m in enumerate(me.materials): me.materials[i] = exp_mat(m)
    ob = bpy.data.objects.new('cp_' + o.name, me); out.objects.link(ob); (glas if isglas else fest).append(ob); src.append(o)
def join(objs, name):
    for o in SC.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.join(); objs[0].name = name; return objs[0]
J = join(fest, 'MilanCockpit'); Gl = join(glas, 'MilanCockpitGlas') if glas else None
# ---- Eckfarben: R Verdeckung (Cycles), G Kantenabrieb, B 1 ----
me = J.data
for a in list(me.color_attributes): me.color_attributes.remove(a)
ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = ca
try: me.color_attributes.render_color_index = 0
except Exception: pass
ao_ok = False
try:
    # Das Schiff steht in Blender-Koordinaten, die Kopie in Schiffskoordinaten: für die Verdeckung zählt nur die Kopie selbst (alles andere aus)
    hidden = [(o, o.hide_render) for o in bpy.data.objects]
    for o in bpy.data.objects: o.hide_render = o is not J
    SC.render.engine = 'CYCLES'; SC.cycles.samples = 96; SC.cycles.device = 'GPU'
    try:
        cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
        for d in cp.devices: d.use = d.type == 'OPTIX'
    except Exception: pass
    if SC.world is None: SC.world = bpy.data.worlds.new('W')
    try: SC.world.light_settings.distance = 0.5
    except Exception: pass
    SC.render.bake.target = 'VERTEX_COLORS'
    for o in SC.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
    bpy.ops.object.bake(type='AO'); ao_ok = True
    for o, h in hidden: o.hide_render = h
except Exception as ex:
    print('AO-Backen fehlgeschlagen:', ex)
# Kantenabrieb nur auf Kantenstreifen: schmale, lange Flächen an einer scharfen konvexen Kante (Fasen). Vorher galt jede schmale Fläche, damit waren
# die Mantelflächen von Griffen und Stangen (viele schmale Segmente zwischen zwei scharfen Rändern) ganz abgerieben und im Spiel schwarz-weiß gefleckt.
bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
streif = [False] * len(bm.faces)
for f in bm.faces:
    ar = f.calc_area()
    for e in f.edges:
        if len(e.link_faces) != 2: continue
        try: a = e.calc_face_angle_signed()
        except Exception: a = 0.0
        if a < 0.7: continue      # erst ab etwa 40°: Segmentkanten runder Teile zählen nicht
        L = e.calc_length()
        if L < 1e-5: continue
        w = ar / L      # Breite der Fläche quer zur Kante
        if w < 0.0075 and L >= 2.0 * w: streif[f.index] = True; break
bm.free()
n = len(me.loops); cols = [0.0] * (n * 4); ca.data.foreach_get('color', cols)
for p in me.polygons:
    g = 1.0 if streif[p.index] else 0.0
    for li in p.loop_indices:
        r = cols[li * 4] if ao_ok else 1.0
        cols[li * 4] = r; cols[li * 4 + 1] = g; cols[li * 4 + 2] = 1.0; cols[li * 4 + 3] = 1.0
ca.data.foreach_set('color', cols); me.update()
for o in SC.objects: o.select_set(False)
J.select_set(True)
if Gl: Gl.select_set(True)
ziel = os.path.normpath(os.path.join(B, '..', '..', 'glb', 'deco', 'MilanCockpit.glb'))
kw = dict(filepath=ziel, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_materials='EXPORT', export_cameras=False,
          export_lights=False, export_animations=False, export_extras=False, export_texcoords=True, export_normals=True)
try: bpy.ops.export_scene.gltf(**kw, export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True)
except TypeError: bpy.ops.export_scene.gltf(**kw)
A = anker.get('auge') or [2.36, 0.0, 3.22]
auge = [round(-(A[1] - MY), 4), round(A[2] - MZ, 4), round(-(A[0] - MX), 4)]
tris = sum(len(p.vertices) - 2 for p in me.polygons)
json.dump({'auge': auge, 'laenge': gel.get('laenge'), 'dreiecke': tris, 'materialien': sorted(m.name for m in CACHE.values())}, open(os.path.join(B, 'mil-cockpit.json'), 'w'), indent=1, ensure_ascii=False)
open(os.path.join(B, 'mil-cockpit-export.txt'), 'w', encoding='utf-8').write('Objekte %d · Dreiecke %d · Materialien %d · Verdeckung %s · %s (%.1f MB) · Auge %s\n' % (
    len(src), tris, len(CACHE), 'ja' if ao_ok else 'NEIN', ziel, os.path.getsize(ziel) / 1e6, auge))
