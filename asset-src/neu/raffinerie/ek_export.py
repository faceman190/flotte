# Außenmodell der Eisenkrone für das Spiel ausgeben. Läuft in Eisenkrone.blend nach ek_aussen.py.
# ACHTUNG: verändert die Szene. Danach die Datei NICHT speichern.
# Das Modell steht im Weltraum und wird im Spiel von der Sonne des Sektors beleuchtet: Hier wird deshalb kein Licht gebacken, nur
#   Farbe × Verdeckung je Eckpunkt (w = sqrt(Farbe)), bei Leuchten die Strahldichte (w = sqrt(x / (1 + x))).
# Arten der Flächen (Materialnamen ext_ek_…): hull (Rumpf), paint (Lack), warn (Warnschraffur), glow (Leuchten, Glut, Radiatoren), feld (Kraftfeld).
# Ausgabe: asset-src/glb/base/Eisenkrone.glb (Objekte koerper und schlacke) und asset-src/data/eisenkrone.json (Leuchtpunkte, Andock- und Startpunkt).
import bpy, bmesh, math, os, json, time, traceback
import numpy as np
from mathutils import Matrix, Vector
HERE = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OUT_GLB = os.path.join(ROOT, 'asset-src', 'glb', 'base', 'Eisenkrone.glb'); OUT_JSON = os.path.join(ROOT, 'asset-src', 'data', 'eisenkrone.json')
HX = 303.0      # Mitte des Hangarblocks (wie in ek_aussen.py)
def class_mat(c):
    n = 'ext_ek_' + c; m = bpy.data.materials.get(n)
    if not m: m = bpy.data.materials.new(n); m.use_nodes = True
    return m
def prep():
    for ob in bpy.data.objects:
        for md in ob.modifiers:
            if md.type == 'BEVEL':
                if md.width < 0.15: md.show_viewport = False
                else: md.segments = 1
            elif md.type in ('WEIGHTED_NORMAL', 'EDGE_SPLIT'): md.show_viewport = False
        if ob.type == 'CURVE': ob.data.bevel_resolution = min(ob.data.bevel_resolution, 2)
        elif ob.type == 'FONT': ob.data.resolution_u = 2
def radiator_col(t):      # Glutverlauf wie im Blender-Material: t = 1 an der Wurzel, 0 an der Spitze
    p = t ** 2.4; f = min(1.0, p / 0.8); c = np.array([0.35 + 0.65 * f, 0.02 + 0.40 * f, 0.08 * f]); return c * (p * 4.5 + 0.03)
def gather(coll, name):
    dg = bpy.context.evaluated_depsgraph_get(); tmp = []
    for ob in bpy.data.collections[coll].objects:
        if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
        if ob.type == 'FONT' and not ob.data.body.strip(): continue
        mat = next((s.material for s in ob.material_slots if s.material), None)
        if mat is None or 'ek_art' not in mat: continue
        art = mat['ek_art']; farbe = tuple(mat['ek_farbe'])
        if max(ob.dimensions) < 0.5 and art != 'glow': continue      # Kleinteile unter 50 cm sind aus Flugentfernung nicht zu sehen
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
        if not me.polygons: bpy.data.meshes.remove(me); continue
        nl = len(me.loops); c = np.ones((nl, 4), dtype=np.float32)
        if art == 'radiator':
            nv = len(me.vertices); co = np.empty(nv * 3, dtype=np.float32); me.vertices.foreach_get('co', co); x = co.reshape(nv, 3)[:, 0]
            t = 1.0 - (x - x.min()) / max(1e-6, x.max() - x.min()); lv = np.empty(nl, dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
            c[:, :3] = np.array([radiator_col(float(v)) for v in t])[lv]; art = 'glow'
        else: c[:, :3] = farbe
        a = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); a.data.foreach_set('color', c.ravel())
        me.materials.clear(); me.materials.append(class_mat(art)); me.polygons.foreach_set('material_index', np.zeros(len(me.polygons), dtype=np.int32))
        o = bpy.data.objects.new('tmp', me); o.matrix_world = ob.matrix_world.copy(); SC.collection.objects.link(o); tmp.append(o)
    datas = [o.data for o in tmp[1:]]
    with bpy.context.temp_override(active_object=tmp[0], object=tmp[0], selected_editable_objects=tmp, selected_objects=tmp): bpy.ops.object.join()
    for d in datas:
        if d.users == 0: bpy.data.meshes.remove(d)
    J = tmp[0]; J.name = name; me = J.data; me.transform(J.matrix_world); J.matrix_world = Matrix.Identity(4)
    if 'custom_normal' in me.attributes: me.attributes.remove(me.attributes['custom_normal'])
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool)); me.set_sharp_from_angle(angle=math.radians(35)); me.update()
    return J
def ao_bake(J):      # Verdeckung je Eckpunkt, in die Farbe der beleuchteten Flächen gerechnet
    me = J.data; a = me.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = a
    for o in bpy.context.view_layer.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS', use_clear=True)
    nl = len(me.loops); ao = np.empty(nl * 4, dtype=np.float32); a.data.foreach_get('color', ao); ao = ao.reshape(nl, 4)[:, 0]
    me.color_attributes.remove(a); return ao
def finish(J, ao):
    me = J.data; nl = len(me.loops); col = me.color_attributes['Col']; c = np.empty(nl * 4, dtype=np.float32); col.data.foreach_get('color', c); c = c.reshape(nl, 4)
    mi = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('material_index', mi); lt = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('loop_total', lt); lm = np.repeat(mi, lt)
    glow = np.isin(lm, [i for i, m in enumerate(me.materials) if m.name in ('ext_ek_glow', 'ext_ek_feld')])
    if ao is not None: c[~glow, :3] *= (0.3 + 0.7 * np.clip(ao[~glow], 0, 1))[:, None]
    c[~glow, :3] = np.sqrt(np.clip(c[~glow, :3], 0, 1)); x = np.clip(c[glow, :3], 0, 40); c[glow, :3] = np.sqrt(x / (1 + x))
    col.data.foreach_set('color', c.ravel()); me.color_attributes.active_color = col; me.color_attributes.render_color_index = me.color_attributes.find('Col'); me.update()
    return sum(len(p.vertices) - 2 for p in me.polygons)
def run():
    mark = os.path.join(HERE, 'export-ek.txt'); log = []
    def note(s): log.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(log))
    t0 = time.time(); note('Start'); prep()
    K = gather('Raffinerie', 'koerper'); S = gather('Schlacke', 'schlacke'); note('gesammelt %.0f s' % (time.time() - t0))
    for cn in ('Raffinerie', 'Schlacke', 'Umgebung', 'Kameras'): bpy.data.collections[cn].hide_render = True
    S.hide_render = True
    cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; SC.cycles.device = 'GPU'; SC.cycles.samples = 64; SC.cycles.use_adaptive_sampling = False
    try: SC.world.light_settings.distance = 14.0
    except Exception: pass
    ao = ao_bake(K); note('Verdeckung %.0f s' % (time.time() - t0))
    tk = finish(K, ao); ts = finish(S, None); S.hide_render = False
    for o in bpy.context.view_layer.objects: o.select_set(False)
    K.select_set(True); S.select_set(True); bpy.context.view_layer.objects.active = K
    os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_normals=True, export_texcoords=False, export_materials='EXPORT',
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True, export_attributes=False, export_extras=False,
                              export_cameras=False, export_lights=False, export_animations=False, export_skins=False, export_morph=False, export_shared_accessors=False)
    # Angaben fürs Spiel in dessen Achsen (x, oben, −y): Leuchtpunkte, Startpunkt 46 m vor dem Tor (Blick nach +x; frei von den Kollisionskugeln des Hangarblocks), Andockpunkt 65 m weiter
    L = json.load(open(os.path.join(HERE, 'ek_lichter.json'))); g = lambda x, y, z: [round(x, 1), round(z, 1), round(-y, 1)]
    data = {'lichter': [[k] + g(x, y, z) for (k, x, y, z) in L], 'start': g(HX + 130, 0, 0) + [-math.pi / 2], 'andock': g(HX + 195, 0, 0), 'R': 460}
    open(OUT_JSON, 'w', encoding='utf-8').write(json.dumps(data, separators=(',', ':')))
    cp.compute_device_type = 'NONE'
    note('FERTIG koerper %d Dreiecke, schlacke %d, %.0f s' % (tk, ts, time.time() - t0))
def start():
    def go():
        try: run()
        except Exception: open(os.path.join(HERE, 'export-ek.txt'), 'a', encoding='utf-8').write('\nFEHLER ' + traceback.format_exc()[-1800:])
        return None
    bpy.app.timers.register(go, first_interval=0.3)
start()
