# Lichtraum: einen Raum eines Decks mit Lichtkarten statt Licht je Eckpunkt ausgeben (Probe: Leitstand der Eisenkrone, Alpha 1.23).
# Läuft in der Datei des gebauten Decks (EisenkroneDeck.blend nach bk_deck_ek.py). ACHTUNG: verändert die Szene, danach NICHT speichern.
#
# Ablauf:
#   1. Die Bausteine in den Zellen des Raums (und die Ofenhalle) werden aufgelöst: jedes Teil ein eigenes Netz in voller Güte (alle Fasen,
#      keine Schwellen wie in bk_export.py). Ihre Leuchten bleiben als echte Lampen in der Szene, die Instanzen selbst werden abgeschaltet.
#   2. Zwei Netze: „raum“ (Zellen des Raums) und „halle“ (Ofenhalle hinter dem Fenster), jedes mit eigener, eindeutiger Abwicklung.
#   3. Cycles backt in Bilder: Licht (Streulicht direkt und indirekt mal Farbe, dazu Leuchten; ohne Glanz, den rechnet das Spiel),
#      Rauheit und Oberflächenrelief (Tangentenraum, aus den Bump-Knoten der Materialien). Metall zählt beim Backen als Lack.
#   4. Ausgabe: asset-src/tex-world/lm_<name>_lit|orm|nrm@<Größe>.png, asset-src/glb/base/<glb> (Materialnamen ext_lm_<Art>),
#      asset-src/data/<json>. Licht ist kodiert wie in bk_export.py: w = Wurzel(x / (1 + x)) je Kanal.
import bpy, bmesh, math, os, json, time, traceback
import numpy as np
from mathutils import Matrix
HERE = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OPT = dict({'cells': [[0, 7], [0, 8], [0, 9], [1, 7], [1, 8], [1, 9]], 'hall': 'Ofenhalle', 'names': ['leitstand', 'ofenhalle'],
            'size': [4096, 2048], 'lm': [2048, 1024], 'samples': [1536, 1024], 'col_samples': 128, 'margin': 4, 'gap': 2.0, 'mark': 'lm.txt', 'deck': 'eisenkrone',
            'glb': 'LichtraumEisenkrone.glb', 'json': 'lichtraum_eisenkrone.json', 'test': False}, **globals().get('OPT', {}))
CELL = 4.0
STAIN = ('Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb')
LOG = []
def note(s):
    LOG.append(s); open(os.path.join(HERE, OPT['mark']), 'w', encoding='utf-8').write('\n'.join(LOG))

# ---------- Arten der Flächen (wie classify in bk_export.py, vereinfacht: Muster stehen jetzt im Bild) ----------
def principled(m): return [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'] if (m and m.node_tree) else []
def sock(n, *names): return next((n.inputs[k] for k in names if k in n.inputs), None)
CLS = {}
def classify(m):
    if m is None: return 'paint'
    if m.name in CLS: return CLS[m.name]
    P = principled(m); b = P[0] if P else None; nm = m.name.split('.')[0]; r = 'paint'
    if b is not None:
        met = sock(b, 'Metallic').default_value; rough = sock(b, 'Roughness').default_value
        es = sock(b, 'Emission Strength'); tr = sock(b, 'Transmission Weight', 'Transmission')
        if nm in ('Bildschirm', 'Wandbild'): r = 'screen'      # Bildschirme: leuchten im Spiel schwächer als Lampen (große Flächen überstrahlen sonst im Bloom)
        elif nm == 'Sternfeld': r = 'stars'      # Fenster ins All: im Spiel das Sternfeld des Baukastens (gebacken gingen die winzigen Sterne im Bild verloren)
        elif es is not None and (es.is_linked or es.default_value > 0): r = 'glow'
        elif tr is not None and tr.default_value > 0.5: r = 'glass'
        elif nm == 'Glas': r = 'gloss'
        elif met >= 0.4: r = 'metal'
        elif rough >= 0.7 and met < 0.15: r = 'soft'
    CLS[m.name] = r; return r

# ---------- 1. Auflösen ----------
def cell_of(ob): return [round(-ob.location.y / CELL), round(ob.location.x / CELL)]
def flat(objs, T):
    for ob in objs:
        if ob.type == 'EMPTY' and ob.instance_type == 'COLLECTION' and ob.instance_collection: yield from flat(ob.instance_collection.objects, T @ ob.matrix_world)
        else: yield ob, T @ ob.matrix_world
def realize(empties, name):
    dg = bpy.context.evaluated_depsgraph_get(); tmp = []; nl = 0
    for e in empties:
        for ob, MW in flat(e.instance_collection.objects, e.matrix_world):
            if ob.type == 'LIGHT':
                l = ob.copy(); l.matrix_world = MW; SC.collection.objects.link(l); nl += 1; continue
            if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
            if ob.type == 'FONT' and not ob.data.body.strip(): continue
            mats = [s.material for s in ob.material_slots if s.material]
            if mats and mats[0].name.split('.')[0] in STAIN: continue      # Spuren und Flecken: als undurchsichtige Flächen gebacken stünden sie wie Pappen vor der Wand
            me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
            if not me.polygons: bpy.data.meshes.remove(me); continue
            o = bpy.data.objects.new('tmp', me); o.matrix_world = MW; SC.collection.objects.link(o); tmp.append(o)
    for e in empties: e.instance_type = 'NONE'      # das Original nicht doppelt in der Szene lassen
    datas = [o.data for o in tmp[1:]]
    with bpy.context.temp_override(active_object=tmp[0], object=tmp[0], selected_editable_objects=tmp, selected_objects=tmp): bpy.ops.object.join()
    for d in datas:
        if d.users == 0: bpy.data.meshes.remove(d)
    J = tmp[0]; J.name = name; me = J.data; me.transform(J.matrix_world); J.matrix_world = Matrix.Identity(4)
    for uv in list(me.uv_layers): me.uv_layers.remove(uv)
    return J, nl

# ---------- 2. Abwickeln ----------
def area_ctx():
    for w in bpy.context.window_manager.windows:
        for a in w.screen.areas:
            if a.type == 'VIEW_3D': return dict(window=w, area=a, region=next(r for r in a.regions if r.type == 'WINDOW'))
    return {}
def unwrap(J, size):
    J.data.uv_layers.new(name='LM'); J.data.uv_layers.active = J.data.uv_layers['LM']
    for o in bpy.context.view_layer.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
    ctx = area_ctx()
    # Packen: Der Abstand ist ein fester Rand je Insel (ADD, in Bildpunkten). Mit einem Anteil der Bildgröße (FRACTION) fraßen die Ränder der
    # vielen Tausend Kleinteile (Schrauben, Leuchtdioden, Kabel) fast den ganzen Platz, die Inseln schrumpften auf Punkte. CONVEX füllt gut 75 %.
    with bpy.context.temp_override(**ctx, active_object=J, object=J, selected_objects=[J], selected_editable_objects=[J]):
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.reveal(); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.001, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(rotate=True, margin_method='ADD', margin=OPT['gap'] / size, shape_method='CONVEX')
        bpy.ops.object.mode_set(mode='OBJECT')
    me = J.data; a = np.empty(len(me.loops) * 2, dtype=np.float32); me.uv_layers['LM'].data.foreach_get('uv', a); a = a.reshape(-1, 2)
    lt = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('loop_total', lt); ls = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('loop_start', ls)
    cover = sum(0.5 * abs(float(np.dot(a[s:s + t, 0], np.roll(a[s:s + t, 1], 1)) - np.dot(a[s:s + t, 1], np.roll(a[s:s + t, 0], 1)))) for s, t in zip(ls, lt))
    if cover < 0.1: raise RuntimeError('Abwicklung missglückt: nur %.1f %% des Bildes belegt' % (cover * 100))
    return cover

# ---------- 3. Backen ----------
SAVED = []
def prep_materials():
    for m in bpy.data.materials:
        for b in principled(m):
            s = sock(b, 'Metallic')
            SAVED.append((m, s.default_value, [(l.from_socket, l.to_socket) for l in s.links]))
            for l in list(s.links): m.node_tree.links.remove(l)
            s.default_value = 0.0
    wd = SC.world
    if wd and wd.node_tree:
        wo = next((n for n in wd.node_tree.nodes if n.type == 'OUTPUT_WORLD'), None)
        if wo:
            for l in list(wo.inputs['Volume'].links): wd.node_tree.links.remove(l)      # kein Dunst beim Backen
def target(J, img):
    for m in J.data.materials:
        if not m or not m.node_tree: continue
        N = m.node_tree.nodes; n = N.get('LM_Ziel') or N.new('ShaderNodeTexImage'); n.name = 'LM_Ziel'; n.image = img; N.active = n
def bake(J, kind, img, samples, color=True):
    target(J, img)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
    SC.cycles.samples = samples; bk = SC.render.bake
    bk.margin = OPT['margin']; bk.margin_type = 'EXTEND'; bk.target = 'IMAGE_TEXTURES'; bk.use_clear = True
    if kind == 'DIFFUSE':      # color = True: nur die Farbe; False: nur das Licht (direkt und indirekt)
        bk.use_pass_direct = not color; bk.use_pass_indirect = not color; bk.use_pass_color = color
        bpy.ops.object.bake(type='DIFFUSE')
    elif kind == 'COMBINED':
        bk.use_pass_direct = True; bk.use_pass_indirect = True; bk.use_pass_diffuse = True; bk.use_pass_glossy = False; bk.use_pass_transmission = False; bk.use_pass_emit = True
        bpy.ops.object.bake(type='COMBINED')
    elif kind == 'NORMAL':
        bk.normal_space = 'TANGENT'; bk.normal_r = 'POS_X'; bk.normal_g = 'POS_Y'; bk.normal_b = 'POS_Z'
        bpy.ops.object.bake(type='NORMAL')
    else: bpy.ops.object.bake(type=kind)
def soften(x):      # Licht leicht glätten (5 × 5, Gauß): nimmt das Restrauschen, Schatten bleiben scharf genug. Die Ränder der Inseln sind
    k = np.array([1, 4, 6, 4, 1], dtype=np.float32) / 16      # beim Backen um 4 Bildpunkte fortgesetzt, das Glätten greift nur 2 weit
    for ax in (0, 1):
        x = sum(np.roll(x, d, axis=ax) * k[d + 2] for d in range(-2, 3))
    return x
def pixels(img):
    w, h = img.size; p = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(p); return p.reshape(h, w, 4)
def save_png(arr, name, path):
    h, w = arr.shape[:2]; out = bpy.data.images.new(name, w, h, alpha=False)
    out.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), dtype=np.float32); rgba[..., :3] = arr[..., :3]
    out.pixels.foreach_set(rgba.ravel()); out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    bpy.data.images.remove(out)

# ---------- 4. Arten zuweisen und ausgeben ----------
def class_mat(c):
    n = 'ext_lm_' + c; m = bpy.data.materials.get(n)
    if not m: m = bpy.data.materials.new(n)
    return m
def set_classes(J):
    me = J.data; cls = [classify(m) for m in me.materials]; names = sorted(set(cls)); idx = {c: i for i, c in enumerate(names)}
    mi = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('material_index', mi)
    remap = np.array([idx[c] for c in cls], dtype=np.int32); new = remap[mi]
    me.materials.clear()
    for c in names: me.materials.append(class_mat(c))
    me.polygons.foreach_set('material_index', new); me.update()
    return {c: int((new == idx[c]).sum()) for c in names}

def run():
    t0 = time.time(); note('Start')
    # Teile: je Teil ein Netz mit eigenem Bildsatz. Alte Form (Eisenkrone): ein Raum („raum“) und der große Baustein dahinter („halle“).
    # Neue Form (OPT['rooms'], seit Alpha 1.27): mehrere Räume eines Decks in einem Lauf, das Objekt heißt wie der Raum.
    if OPT.get('rooms'):
        parts = [dict(obj=r['name'], name=r['name'], cells=[list(c) for c in r['cells']], only=None, skip=None, size=r.get('size', OPT['size'][0]),
                      lm=r.get('lm', OPT['lm'][0]), spp=r.get('samples', OPT['samples'][0]), emi=r.get('emi', r.get('size', OPT['size'][0]))) for r in OPT['rooms']]
        rooms = [dict(name=r['name'], zellen=[list(c) for c in r['cells']], teile={r['name']: 'lm_' + r['name']}) for r in OPT['rooms']]
    else:
        cells = [list(c) for c in OPT['cells']]
        parts = [dict(obj='raum', name=OPT['names'][0], cells=cells, only=None, skip=OPT['hall'], size=OPT['size'][0], lm=OPT['lm'][0], spp=OPT['samples'][0], emi=OPT['size'][0]),
                 dict(obj='halle', name=OPT['names'][1], cells=cells, only=OPT['hall'], skip=None, size=OPT['size'][1], lm=OPT['lm'][1], spp=OPT['samples'][1], emi=OPT['size'][1])]
        rooms = [dict(name=OPT['names'][0], zellen=cells, teile={'raum': 'lm_' + OPT['names'][0], 'halle': 'lm_' + OPT['names'][1]})]
    for p in parts: p['emp'] = []
    for cn in ('Deck', 'Deck Decken'):
        for e in bpy.data.collections[cn].objects:
            if e.type != 'EMPTY' or e.instance_type != 'COLLECTION' or not e.instance_collection: continue
            c = cell_of(e); n = e.instance_collection.name
            for p in parts:
                if c in p['cells'] and (p['only'] is None or n == p['only']) and (p['skip'] is None or n != p['skip']): p['emp'].append(e); break
    for m in bpy.data.materials: classify(m)      # vor dem Umbau fürs Backen
    tri = lambda J: sum(len(q.vertices) - 2 for q in J.data.polygons)
    for p in parts:
        p['J'], nl = realize(p['emp'], p['obj'])
        note('aufgelöst: %s %d Instanzen, %d Dreiecke, %d Lampen (%.0f s)' % (p['name'], len(p['emp']), tri(p['J']), nl, time.time() - t0))
    # Der Rand zwischen den Inseln richtet sich nach dem gröbsten Bild (Licht): OPT['gap'] Bildpunkte dort
    for p in parts:
        cov = unwrap(p['J'], p['lm']); note('abgewickelt: %s belegt %.0f %% (%.0f s)' % (p['name'], cov * 100, time.time() - t0))
    if OPT.get('export_only'):
        # Nur das Modell neu ausgeben (z. B. nach einer geänderten Flächenart): Auflösen und Abwickeln laufen wie beim Backen und liefern
        # dieselbe Abwicklung, die Bilder bleiben, wie sie sind. Die Daten (json) werden nicht neu geschrieben.
        for p in parts: note('%s: Arten %s' % (p['name'], json.dumps(set_classes(p['J']))))
        for o in bpy.context.view_layer.objects: o.select_set(False)
        for p in parts: p['J'].select_set(True)
        bpy.context.view_layer.objects.active = parts[0]['J']
        bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, 'asset-src', 'glb', 'base', OPT['glb']), export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_normals=True, export_texcoords=True,
                                  export_materials='EXPORT', export_vertex_color='NONE', export_attributes=False, export_extras=False, export_cameras=False, export_lights=False,
                                  export_animations=False, export_skins=False, export_morph=False, export_image_format='NONE')
        note('FERTIG nur Modell (%.0f s)' % (time.time() - t0)); return
    cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; SC.cycles.device = 'GPU'
    prep_materials()
    out = {}
    tex = os.path.join(ROOT, 'asset-src', 'tex-world' if not OPT['test'] else os.path.join('neu', 'bastion', 'lm_test')); os.makedirs(tex, exist_ok=True)
    # Getrennt gebacken, weil Licht mit den aufwendigen Materialien langsam rauscharm wird (gut 3 Mio. Abtastungen je Sekunde):
    #   col  Farbe (Streufarbe der Materialien mit Schmutz, Kantenabrieb, Schrift), fein, wenige Abtastungen
    #   lit  Licht (Bestrahlung direkt und indirekt, ohne Farbe), halb so fein, viele Abtastungen; im Spiel: Farbe × Licht
    #   emi  Leuchten (Strahldichte), orm Rauheit im Grünkanal, nrm Relief im Tangentenraum
    def img(n, s): return bpy.data.images.new(n, s, s, alpha=False, float_buffer=True)
    enc = lambda x: np.sqrt(np.clip(x, 0, 40) / (1 + np.clip(x, 0, 40)))
    for p in parts:
        J, name, sc, sl, spp, se = p['J'], p['name'], p['size'], p['lm'], p['spp'], p['emi']
        sfx = (lambda s: '@%d' % s) if not OPT['test'] else (lambda s: '')
        path = lambda kind, s: os.path.join(tex, 'lm_%s_%s%s.png' % (name, kind, sfx(s)))
        im = img('LM_col', sc); bake(J, 'DIFFUSE', im, OPT['col_samples'], color=True); col = pixels(im)[..., :3]
        save_png(np.power(np.clip(col, 0, 1), 1 / 2.2), 'col', path('col', sc)); bpy.data.images.remove(im)
        im = img('LM_lit', sl); bake(J, 'DIFFUSE', im, spp, color=False); x = soften(pixels(im)[..., :3])
        save_png(enc(x), 'lit', path('lit', sl)); bpy.data.images.remove(im)
        note('%s: Farbe und Licht gebacken (%.0f s), Licht Mittel %.3f, Spitze %.1f' % (name, time.time() - t0, float(x.mean()), float(x.max())))
        im = img('LM_emi', se); bake(J, 'EMIT', im, 32); save_png(enc(pixels(im)[..., :3]), 'emi', path('emi', se)); bpy.data.images.remove(im)      # Leuchten fein und geglättet: Bildschirme haben ein Zeilenmuster
        im = img('LM_dat', sl)
        bake(J, 'ROUGHNESS', im, 1); r = pixels(im)[..., 0]; save_png(np.stack([np.ones_like(r), r, np.zeros_like(r)], -1), 'orm', path('orm', sl))
        bake(J, 'NORMAL', im, 16); save_png(pixels(im)[..., :3].copy(), 'nrm', path('nrm', sl)); bpy.data.images.remove(im)
        out[name] = {'tris': tri(J), 'col': sc, 'lit': sl}
        note('%s: Leuchten, Rauheit und Relief gebacken, Bilder geschrieben (%.0f s)' % (name, time.time() - t0))
    for p in parts: out[p['name']]['arten'] = set_classes(p['J'])
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for p in parts: p['J'].select_set(True)
    bpy.context.view_layer.objects.active = parts[0]['J']
    glb = os.path.join(ROOT, 'asset-src', 'glb', 'base', OPT['glb']) if not OPT['test'] else os.path.join(tex, OPT['glb'])
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_normals=True, export_texcoords=True,
                              export_materials='EXPORT', export_vertex_color='NONE', export_attributes=False, export_extras=False, export_cameras=False, export_lights=False,
                              export_animations=False, export_skins=False, export_morph=False, export_image_format='NONE')
    for R in rooms: R['info'] = {n[3:]: out[n[3:]] for n in R['teile'].values()}
    data = {'raeume': rooms}
    jp = os.path.join(ROOT, 'asset-src', 'data', OPT['json']) if not OPT['test'] else os.path.join(tex, OPT['json'])
    open(jp, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False))
    cp.compute_device_type = 'NONE'
    note('FERTIG %s (%.0f s)' % (json.dumps(out, ensure_ascii=False), time.time() - t0))
def start():
    def go():
        try: run()
        except Exception: note('FEHLER ' + traceback.format_exc()[-2000:])
        return None
    bpy.app.timers.register(go, first_interval=0.3)
start()
