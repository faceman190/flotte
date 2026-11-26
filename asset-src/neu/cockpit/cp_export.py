# Cockpit (Stil 2) fürs Spiel exportieren:  blender -b Cockpit<Name>.blend --python cp_export.py -- <Name>
# Eingang: Sammlung „Cockpit“ der Datei (cp_dohle.py, cp_kormoran.py). Ausgang: ../../glb/deco/<Name>Cockpit.glb, cp-<name>-export.txt
# Koordinaten: Die Datei liegt schon in Schiffskoordinaten (Blender X, Y, Z → Spiel x, z nach hinten = −Y, y = Z); der glTF-Export dreht passend.
# Netz: alles zu einem Objekt (Glas und Sichtgerät getrennt), Dreiecke, lange Kanten geteilt (bis 9 cm), damit die Eckfarben Licht tragen können.
# Eckfarben (COLOR_0) sind Daten für den Cockpit-Shader (src/game/cockpit.ts):
#   R = Umgebungsverdeckung (Cycles, 0,4 m)
#   G = Kantenstreifen (1 auf Fasen an scharfen konvexen Kanten): Abrieb und Kantenlicht.
#       Bewegliche Steuerknüppel (Flächenebene „teil“ aus cp_lib.Marke): links 0,3 (Fläche) / 0,4 (Kantenstreifen), rechts 0,6 / 0,7
#   B = kaltes Licht der Anzeigen und Lichtleisten (gebacken, Wurzel aus der Beleuchtungsstärke)
#   A = warmes Licht der Bodenleuchten (ebenso)
# Materialien heißen „ext_cp_<Name>“ (ext_: build-assets.mjs behält Eckfarben und Texturkoordinaten). Schirme tragen UV 0…1.
import bpy, bmesh, json, os, sys, math, time
B = os.path.dirname(os.path.abspath(__file__)); SC = bpy.context.scene
NAME = sys.argv[sys.argv.index('--') + 1]; T0 = time.time()
_a = sys.argv[sys.argv.index('--') + 1:]
KANTE = float(_a[1]) if len(_a) > 1 else 0.09      # längste Kante nach dem Teilen (zweites Argument)
cp = bpy.data.collections['Cockpit']
for o in bpy.data.objects: o.select_set(False)
GLASIG = ('CP Glas', 'CP Schirm Holo')
fest = [o for o in cp.objects if o.type == 'MESH' and o.data.materials and o.data.materials[0].name not in GLASIG]
glas = [o for o in cp.objects if o.type == 'MESH' and o.data.materials and o.data.materials[0].name in GLASIG]
def join(objs, name):
    for o in SC.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    objs[0].name = name; return objs[0]
for o in list(SC.collection.all_objects):
    if o.name not in cp.objects: o.hide_render = True
J = join(fest, NAME + 'Cockpit'); Gl = join(glas, NAME + 'CockpitGlas') if glas else None
me = J.data
# ---- Netz: Kantenstreifen merken, Dreiecke, lange Kanten teilen, Glättung ----
grob = {i for i, m in enumerate(me.materials) if m and m.name in ('CP Rumpf innen', 'CP Rahmen')}      # Außenhaut und Streben: nur dunkel und Schattenwerfer, nicht teilen
bm = bmesh.new(); bm.from_mesh(me); L = bm.faces.layers.int.new('streif')
for f in bm.faces:
    ar = f.calc_area()
    for e in f.edges:
        if len(e.link_faces) != 2: continue
        try: a = e.calc_face_angle_signed()
        except Exception: a = 0.0
        if a < 0.6: continue
        ln = e.calc_length()
        if ln < 1e-5: continue
        w = ar / ln
        if w < 0.011 and ln >= 2.0 * w: f[L] = 1; break
bmesh.ops.triangulate(bm, faces=bm.faces)
for _ in range(5):
    lang = [e for e in bm.edges if e.calc_length() > KANTE and not any(f.material_index in grob for f in e.link_faces)]
    if not lang: break
    bmesh.ops.subdivide_edges(bm, edges=lang, cuts=1, use_grid_fill=False)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 3])
for f in bm.faces: f.smooth = True
for e in bm.edges:
    if len(e.link_faces) == 2:
        try: e.smooth = abs(e.calc_face_angle_signed()) < 0.55
        except Exception: e.smooth = True
bm.to_mesh(me); bm.free(); me.update()
streif = [0] * len(me.polygons); me.attributes['streif'].data.foreach_get('value', streif)
teil = [0] * len(me.polygons)
if 'teil' in me.attributes: me.attributes['teil'].data.foreach_get('value', teil)
# ---- Backen ----
SC.render.engine = 'CYCLES'; SC.cycles.device = 'GPU'
try:
    pr = bpy.context.preferences.addons['cycles'].preferences; pr.compute_device_type = 'OPTIX'; pr.get_devices()
    for d in pr.devices: d.use = d.type == 'OPTIX'
except Exception: pass
if SC.world is None: SC.world = bpy.data.worlds.new('W')
SC.world.use_nodes = True; bg = SC.world.node_tree.nodes.get('Background')
SC.render.bake.target = 'VERTEX_COLORS'
if Gl: Gl.hide_render = True
for o in SC.objects: o.select_set(False)
J.select_set(True); bpy.context.view_layer.objects.active = J
def attr(n):
    a = me.color_attributes.get(n) or me.color_attributes.new(n, 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = a
    try: me.color_attributes.render_color_index = list(me.color_attributes).index(a)
    except Exception: pass
    return a
def principled(m): return next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
KALT = lambda n: n.startswith('CP Schirm') or n == 'CP Licht Kalt'
WARM = lambda n: n == 'CP Licht Warm'
alt = {}
for m in me.materials:
    b = principled(m); alt[m.name] = (tuple(b.inputs['Base Color'].default_value), b.inputs['Emission Strength'].default_value, tuple(b.inputs['Emission Color'].default_value), b.inputs['Metallic'].default_value)
def licht(gruppe, staerke):
    for m in me.materials:
        b = principled(m); an = gruppe is not None and gruppe(m.name)
        b.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1) if an else (0.22, 0.22, 0.22, 1); b.inputs['Metallic'].default_value = 0.0
        b.inputs['Emission Color'].default_value = (1, 1, 1, 1); b.inputs['Emission Strength'].default_value = (staerke * (0.5 if m.name == 'CP Schirm Band' else 1.0)) if an else 0.0
ok = {}
try:
    if bg: bg.inputs[1].default_value = 1.0
    try: SC.world.light_settings.distance = 0.4
    except Exception: pass
    licht(None, 0); attr('ao'); SC.cycles.samples = 96; bpy.ops.object.bake(type='AO'); ok['ao'] = True
except Exception as ex: print('AO fehlgeschlagen:', ex)
for nm, gr, st in (('kalt', KALT, 1.0), ('warm', WARM, 4.0)):
    try:
        if bg: bg.inputs[1].default_value = 0.0
        licht(gr, st); attr(nm); SC.cycles.samples = 384
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}); ok[nm] = True
    except Exception as ex: print(nm, 'fehlgeschlagen:', ex)
for m in me.materials:
    b = principled(m); c, es, ec, mt = alt[m.name]; b.inputs['Base Color'].default_value = c; b.inputs['Emission Strength'].default_value = es; b.inputs['Emission Color'].default_value = ec; b.inputs['Metallic'].default_value = mt
n = len(me.loops)
def lesen(nm):
    v = [0.0] * (n * 4)
    if ok.get(nm): me.color_attributes[nm].data.foreach_get('color', v)
    return v
ao, ka, wa = lesen('ao'), lesen('kalt'), lesen('warm')
def quant(v, q):
    w = sorted((v[i] + v[i + 1] + v[i + 2]) / 3 for i in range(0, len(v), 4 * 37)); return w[min(len(w) - 1, int(len(w) * q))]
STAT = 'kalt 50/90/99 %%: %.3f %.3f %.3f · warm: %.3f %.3f %.3f' % (quant(ka, 0.5), quant(ka, 0.9), quant(ka, 0.99), quant(wa, 0.5), quant(wa, 0.9), quant(wa, 0.99))
cols = [0.0] * (n * 4)
for p in me.polygons:
    g = 1.0 if streif[p.index] else 0.0
    if teil[p.index] in (1, 2): g = (0.3 if teil[p.index] == 1 else 0.6) + (0.1 if streif[p.index] else 0.0)
    for li in p.loop_indices:
        i = li * 4
        cols[i] = ao[i] if ok.get('ao') else 1.0; cols[i + 1] = g
        cols[i + 2] = min(1.0, math.sqrt(max(0.0, (ka[i] + ka[i + 1] + ka[i + 2]) / 3))); cols[i + 3] = min(1.0, math.sqrt(max(0.0, (wa[i] + wa[i + 1] + wa[i + 2]) / 3)))
for a in list(me.color_attributes): me.color_attributes.remove(a)
ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); ca.data.foreach_set('color', cols); me.color_attributes.active_color = ca
try: me.color_attributes.render_color_index = 0
except Exception: pass
for nm in ('streif', 'teil'):
    try: me.attributes.remove(me.attributes[nm])
    except Exception: pass
me.update()
# ---- Materialien fürs Spiel ----
def exp_mat(m):
    d = json.loads(m['cp']) if 'cp' in m.keys() else {'col': [0.05, 0.05, 0.05], 'metal': 0.2, 'rough': 0.5, 'emit': None, 'es': 0, 'alpha': 1}
    e = bpy.data.materials.new('ext_cp_' + m.name.replace('CP ', '')); e.use_nodes = True; b = principled(e)
    b.inputs['Base Color'].default_value = (*d['col'], 1); b.inputs['Metallic'].default_value = d['metal']; b.inputs['Roughness'].default_value = d['rough']
    if d.get('emit') and d.get('es'): b.inputs['Emission Color'].default_value = (*d['emit'], 1); b.inputs['Emission Strength'].default_value = min(3.0, d['es'] * 0.5)
    if d.get('alpha', 1) < 1:
        b.inputs['Alpha'].default_value = max(0.02, d['alpha'])
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(e, k, v)
            except Exception: pass
    return e
namen = []
for o in (J, Gl):
    if o is None: continue
    for i, m in enumerate(o.data.materials): o.data.materials[i] = exp_mat(m); namen.append(o.data.materials[i].name)
if Gl: Gl.hide_render = False
for o in SC.objects: o.select_set(False)
J.select_set(True)
if Gl: Gl.select_set(True)
ziel = os.path.normpath(os.path.join(B, '..', '..', 'glb', 'deco', NAME + 'Cockpit.glb'))
kw = dict(filepath=ziel, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_materials='EXPORT', export_cameras=False,
          export_lights=False, export_animations=False, export_extras=False, export_texcoords=True, export_normals=True)
try: bpy.ops.export_scene.gltf(**kw, export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True)
except TypeError: bpy.ops.export_scene.gltf(**kw)
tris = len(me.polygons)
zeile = '%s · Dreiecke %d · Materialien %d · gebacken %s · %s (%.1f MB) · %.0f s' % (NAME, tris, len(namen), ' '.join(sorted(ok)) or 'NICHTS', ziel, os.path.getsize(ziel) / 1e6, time.time() - T0)
open(os.path.join(B, 'cp-%s-export.txt' % NAME.lower()), 'w', encoding='utf-8').write(zeile + ' · ' + STAT + '\n')
