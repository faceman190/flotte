# Bastion-Deck (und mit anderen Angaben in OPT den Hangar, siehe bk_export_hangar.py) für das Spiel ausgeben.
# Läuft in BastionDeckD.blend (nach dem Aufbau durch bk_deck_d.py), braucht dessen Namensraum nicht.
# ACHTUNG: verändert die Szene (Fasen, Materialien für das Backen). Danach die Datei NICHT speichern.
# Je Baustein (Sammlung, die im Deck gesetzt ist):
#   1. abspecken: Fasen unter 8 mm weg, sonst eine Stufe; Schrauben und Niete (unter 5 cm) weg; winzige Schrift weg; Rohre mit weniger Seiten
#   2. an der Stelle seines ersten Einsatzes als ein Netz in die Szene stellen (mit seinen Lampen), große Flächen im 0,5-m-Raster teilen
#   3. Licht backen: Cycles rechnet je Eckpunkt die beleuchtete Farbe (direkt + indirekt + Eigenfarbe) im fertig zusammengebauten Deck
#   4. Flächen nach Art ordnen (ext_bk_metal, _paint, _soft, _glow, _warn, _screen, _glass, _gloss, _stain, _stars) und zurück in Bausteinlage
# Ausgabe: asset-src/glb/base/BastionDeck.glb (jeder Baustein einmal, Objekt m<Nr>) und asset-src/data/deck_bastion.json (Karte, Türen, wo welcher
# Baustein steht, Standflächen, Personal, Laufwege). Farbe je Eckpunkt: w = sqrt(x / (1 + x)) der Strahldichte x; das Spiel rechnet zurück.
import bpy, bmesh, math, os, json, time, traceback
import numpy as np
from mathutils import Matrix, Vector
HERE = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OPT = dict({'samples': 96, 'only': None, 'mark': 'export.txt',
            'grid': 0.5, 'long': 1.0,                    # große Flächen in diesem Raster teilen (m); als groß gilt eine Kante über „long“
            'bevel_min': 0.008, 'drop': 0.05, 'font_min': 0.03,      # Fasen darunter entfallen; Teile und Schrift darunter entfallen
            'colls': [('Deck', 0), ('Deck Decken', 1)],  # Sammlungen mit den gesetzten Bausteinen (Name, Kennzahl im Spiel: 1 = über Kopf)
            'loose': 'Deck Schilder', 'loose_cell': 4.0, # lose Teile (Schilder), je Feld dieser Größe zu einem Baustein gefasst
            'unique': [],                                # Bausteine mit diesem Namensanfang: alle Einsätze zusammen als ein Netz backen (Licht je Ort)
            'hide': [],                                  # Objekte, die beim Backen nicht mitrechnen (Dunst)
            'meta': 'deck_d_meta.json', 'glb': 'BastionDeck.glb', 'json': 'deck_bastion.json'}, **globals().get('OPT', {}))
META = json.load(open(os.path.join(HERE, OPT['meta']), encoding='utf-8')) if OPT['meta'] else {}
OUT_GLB = os.path.join(ROOT, 'asset-src', 'glb', 'base', OPT['glb']); OUT_JSON = os.path.join(ROOT, 'asset-src', 'data', OPT['json'])
CELL = 4.0
STAIN = {'Laufspur': 0.9, 'Rostspur': 0.75, 'Staubspur': 0.35, 'Fleck': 0.85, 'Abrieb': 0.3}
CLASSES = ['metal', 'paint', 'soft', 'glow', 'warn', 'warnbig', 'mark', 'screen', 'glass', 'gloss', 'stain', 'stars']

# ---------- Materialien einordnen (vor dem Umbau fürs Backen) ----------
def principled(m): return [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'] if (m and m.use_nodes) else []
def sock(n, *names): return next((n.inputs[k] for k in names if k in n.inputs), None)
INFO = {}
def classify(m):
    if m is None: return ('paint', None)
    if m.name in INFO: return INFO[m.name]
    P = principled(m); b = P[0] if P else None; nm = m.name.split('.')[0]; r = ('paint', None)
    if b is not None:
        met = sock(b, 'Metallic').default_value; rough = sock(b, 'Roughness').default_value
        es = sock(b, 'Emission Strength'); ec = sock(b, 'Emission Color', 'Emission'); tr = sock(b, 'Transmission Weight', 'Transmission')
        if nm in STAIN: r = ('stain', STAIN[nm])
        elif nm in ('Warnschraffur Hangar', 'Warnschraffur Hallenboden'): r = ('warnbig', None)      # breite Streifen (Hangar)
        elif nm.startswith('Warnschraffur'): r = ('warn', None)
        elif nm.startswith('Bodenfarbe'): r = ('mark', None)      # Markierungen auf dem Hallenboden
        elif nm == 'Bildschirm': r = ('screen', (0.08 * 2.2, 0.75 * 2.2, 0.65 * 2.2))
        elif nm == 'Wandbild': r = ('screen', (0.1 * 2.6, 0.62 * 2.6, 0.7 * 2.6))
        elif nm == 'Sternfeld': r = ('stars', None)
        elif es is not None and not es.is_linked and es.default_value > 0 and not ec.is_linked:
            c = ec.default_value; r = ('glow', (c[0] * es.default_value, c[1] * es.default_value, c[2] * es.default_value))
        elif tr is not None and tr.default_value > 0.5: r = ('glass', None)
        elif nm == 'Glas': r = ('gloss', None)
        elif met >= 0.4: r = ('metal', None)
        elif rough >= 0.7 and met < 0.15: r = ('soft', None)
    INFO[m.name] = r; return r
for m_ in bpy.data.materials: classify(m_)
def prep_scene():
    for m in bpy.data.materials:      # fürs Backen: kein Metall (sonst bleibt die Streufarbe schwarz), Warnschraffur einfarbig grau (das Muster zeichnet das Spiel)
        for b in principled(m):
            s = sock(b, 'Metallic')
            for l in list(s.links): m.node_tree.links.remove(l)
            s.default_value = 0.0
        if m.name.split('.')[0].startswith('Warnschraffur'):
            for b in principled(m):
                s = sock(b, 'Base Color')
                for l in list(s.links): m.node_tree.links.remove(l)
                s.default_value = (0.5, 0.5, 0.5, 1)
    for ob in bpy.data.objects:
        for md in ob.modifiers:
            if md.type == 'BEVEL':
                if md.width < OPT['bevel_min']: md.show_viewport = False
                else: md.segments = 1
            elif md.type in ('WEIGHTED_NORMAL', 'EDGE_SPLIT'): md.show_viewport = False
        if ob.type == 'CURVE': ob.data.bevel_resolution = min(ob.data.bevel_resolution, 2)
        elif ob.type == 'FONT': ob.data.resolution_u = 2
def keep(ob):
    if ob.type not in ('MESH', 'CURVE', 'FONT'): return False
    mats = [s.material for s in ob.material_slots if s.material]; cls = classify(mats[0])[0] if mats else 'paint'
    if ob.type == 'FONT':
        if not ob.data.body.strip(): return False
        return ob.data.size >= OPT['font_min'] or cls == 'glow'
    return max(ob.dimensions) >= OPT['drop'] or cls == 'glow'

# ---------- Baustein als ein Netz in die Szene stellen ----------
def flat(objs, T):      # Objekte eines Bausteins mit ihrer Lage; Instanzen anderer Bausteine darin werden aufgelöst
    for ob in objs:
        if ob.type == 'EMPTY' and ob.instance_type == 'COLLECTION' and ob.instance_collection: yield from flat(ob.instance_collection.objects, T @ ob.matrix_world)
        else: yield ob, T @ ob.matrix_world
def realize(pairs, name):
    dg = bpy.context.evaluated_depsgraph_get(); tmp = []; lights = []
    for ob, MW in pairs:
        if ob.type == 'LIGHT':
            l = ob.copy(); l.matrix_world = MW; SC.collection.objects.link(l); lights.append(l); continue
        if not keep(ob): continue
        me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
        if not me.polygons: bpy.data.meshes.remove(me); continue
        base = ob.name.split('.')[0]; st = classify(me.materials[0])[0] == 'stain' if me.materials else False; n0 = len(me.vertices)
        if st:      # Spuren und Flecken: Deckkraft je Eckpunkt (oben satt, unten aus; Fleck: Mitte satt, Rand aus)
            k = classify(me.materials[0])[1]; bm = bmesh.new(); bm.from_mesh(me); lay = bm.verts.layers.float.new('bk_a')
            if base == 'Fleck': bmesh.ops.poke(bm, faces=bm.faces[:])
            for v in bm.verts: v[lay] = (k if v.co.length < 0.05 else 0.0) if base == 'Fleck' else (k if v.co.y > -0.5 else 0.0)
            bm.to_mesh(me); bm.free()
        else:
            a = me.attributes.new('bk_a', 'FLOAT', 'POINT'); a.data.foreach_set('value', np.ones(n0, dtype=np.float32))
        o = bpy.data.objects.new('tmp', me); o.matrix_world = MW; SC.collection.objects.link(o); tmp.append(o)
    if not tmp: return None, lights
    if len(tmp) > 1:
        datas = [o.data for o in tmp[1:]]
        with bpy.context.temp_override(active_object=tmp[0], object=tmp[0], selected_editable_objects=tmp, selected_objects=tmp):
            bpy.ops.object.join()
        for d in datas:
            if d.users == 0: bpy.data.meshes.remove(d)
    J = tmp[0]; J.name = name; me = J.data; me.transform(J.matrix_world); J.matrix_world = Matrix.Identity(4)
    return J, lights
def grid_cut(me, step, long):      # große Flächen entlang eines Rasters teilen: Das Licht steht nur in den Eckpunkten
    bm = bmesh.new(); bm.from_mesh(me)
    def big(f): L = max(e.calc_length() for e in f.edges); return L > long and f.calc_area() / L > 0.3      # lang und breit; schmale Streifen (Rohre, Leisten, Roststäbe) bleiben ganz
    cand = set(f for f in bm.faces if big(f))
    for ax in range(3):
        if not cand: break
        lo = min(v.co[ax] for f in cand if f.is_valid for v in f.verts); hi = max(v.co[ax] for f in cand if f.is_valid for v in f.verts)
        k = math.floor(lo / step) + 1
        while k * step < hi - 1e-4:
            p = k * step; k += 1
            fs = [f for f in cand if f.is_valid and min(v.co[ax] for v in f.verts) < p - 0.03 and max(v.co[ax] for v in f.verts) > p + 0.03]
            if not fs: continue
            geom = set(fs)
            for f in fs: geom.update(f.edges); geom.update(f.verts)
            co = Vector((0, 0, 0)); co[ax] = p; no = Vector((0, 0, 0)); no[ax] = 1.0
            ret = bmesh.ops.bisect_plane(bm, geom=list(geom), dist=0.0005, plane_co=co, plane_no=no)
            for g in ret['geom']:      # neue Teilflächen gehören weiter zum Raster
                if isinstance(g, bmesh.types.BMFace): cand.add(g)
    bm.to_mesh(me); bm.free()
def shade(me):
    if 'custom_normal' in me.attributes: me.attributes.remove(me.attributes['custom_normal'])
    me.polygons.foreach_set('use_smooth', np.ones(len(me.polygons), dtype=bool)); me.set_sharp_from_angle(angle=math.radians(35)); me.update()
def bake(J):
    me = J.data
    col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = col; me.color_attributes.render_color_index = me.color_attributes.find('Col')
    for o in bpy.context.view_layer.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT', 'COLOR'}, target='VERTEX_COLORS', use_clear=True)
def class_mat(c):
    n = 'ext_bk_' + c; m = bpy.data.materials.get(n)
    if not m: m = bpy.data.materials.new(n); m.use_nodes = True
    return m
def finish(J):      # Farben je Art setzen und kodieren, Flächen nach Art ordnen
    me = J.data; nl = len(me.loops); npol = len(me.polygons)
    col = me.color_attributes['Col']; c = np.empty(nl * 4, dtype=np.float32); col.data.foreach_get('color', c); c = c.reshape(nl, 4)
    c[~np.isfinite(c)] = 0.0
    mi = np.empty(npol, dtype=np.int32); me.polygons.foreach_get('material_index', mi); lt = np.empty(npol, dtype=np.int32); me.polygons.foreach_get('loop_total', lt)
    lmat = np.repeat(mi, lt); lv = np.empty(nl, dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
    va = np.ones(len(me.vertices), dtype=np.float32)
    if 'bk_a' in me.attributes: me.attributes['bk_a'].data.foreach_get('value', va)
    infos = [classify(m) for m in me.materials]; c[:, 3] = 1.0
    for j, (cl, v) in enumerate(infos):
        mk_ = lmat == j
        if not mk_.any(): continue
        if cl in ('glow', 'screen'): c[mk_, :3] = v
        elif cl == 'stars': c[mk_, :3] = 0.0
        elif cl == 'glass': c[mk_, :3] = (0.02, 0.025, 0.03)
        elif cl == 'warn': c[mk_, :3] *= 2.0
        elif cl == 'stain': c[mk_, 3] = va[lv[mk_]]
    x = np.clip(c[:, :3], 0.0, 40.0); c[:, :3] = np.sqrt(x / (1.0 + x))
    col.data.foreach_set('color', c.ravel())
    used = [cl for cl in CLASSES if any(i[0] == cl for i in infos)]; remap = np.array([used.index(i[0]) for i in infos], dtype=np.int32)
    me.materials.clear()
    for cl in used: me.materials.append(class_mat(cl))
    me.polygons.foreach_set('material_index', remap[mi])      # erst nach dem Leeren setzen (clear() stellt alle Flächen auf 0)
    if 'bk_a' in me.attributes: me.attributes.remove(me.attributes['bk_a'])
    me.update()
    return used, remap[mi]
def block_of(J, name, pm):      # Standfläche (Bausteinlage): Umriss der Teile zwischen 0,2 und 1,9 m Höhe, ohne Spuren
    if not name.startswith(('Wand ', 'Objekt ', 'Halle ', 'H Spant', 'H Eckturm')) or name in ('Objekt schleuse', 'Objekt pendel'): return None
    me = J.data; nv = len(me.vertices); co = np.empty(nv * 3, dtype=np.float32); me.vertices.foreach_get('co', co); co = co.reshape(nv, 3)
    stain = [i for i, m in enumerate(me.materials) if m.name == 'ext_bk_stain']; ok = np.zeros(nv, dtype=bool)
    lt = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('loop_total', lt); lv = np.empty(len(me.loops), dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
    ok[lv[~np.isin(np.repeat(pm, lt), stain)]] = True
    ok &= (co[:, 2] > 0.2) & (co[:, 2] < 1.9)
    if name.startswith('Wand '): ok &= co[:, 0] > -1.69
    if not ok.any(): return None
    p = co[ok]; x0, x1, y0, y1 = float(p[:, 0].min()), float(p[:, 0].max()), float(p[:, 1].min()), float(p[:, 1].max())
    if name.startswith('Wand '):
        if x1 < -1.7 + 0.16: return None
        x0 = -1.72
    return [round(v, 3) for v in (x0, x1, y0, y1)]

# ---------- Ablauf ----------
def run():
    t00 = time.time(); mark = os.path.join(HERE, OPT['mark']); log = []
    def note(s): log.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(log[-400:]))
    note('Start')
    prep_scene()
    cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; SC.cycles.device = 'GPU'; SC.cycles.samples = OPT['samples']; SC.cycles.use_adaptive_sampling = False
    for k, v in (('max_bounces', 5), ('diffuse_bounces', 3), ('glossy_bounces', 2), ('volume_bounces', 0), ('use_denoising', False)):
        try: setattr(SC.cycles, k, v)
        except Exception: pass
    wd = SC.world      # ohne Dunst und ohne Grundlicht backen
    if wd and wd.use_nodes:
        wo = next(n for n in wd.node_tree.nodes if n.type == 'OUTPUT_WORLD')
        for l in list(wo.inputs['Volume'].links): wd.node_tree.links.remove(l)
        bg = next((n for n in wd.node_tree.nodes if n.type == 'BACKGROUND'), None)
        if bg: bg.inputs[0].default_value = (0.004, 0.005, 0.007, 1)
    for cn in ('Blatt', 'Kameras', 'Draussen'):
        c = bpy.data.collections.get(cn)
        if c: c.hide_render = True
    for n in OPT['hide']:
        o = bpy.data.objects.get(n)
        if o: o.hide_render = True
    # wo steht was
    inst = []; first = {}; every = {}
    for cn, ceil in OPT['colls']:
        bpy.data.collections[cn].hide_render = False
        for e in bpy.data.collections[cn].objects:
            if e.instance_type != 'COLLECTION' or not e.instance_collection: continue
            nm = e.instance_collection.name; mw = e.matrix_world.copy(); u = next((p for p in OPT['unique'] if nm.startswith(p)), None)
            if u: every.setdefault(u, []).append((e, mw)); continue
            inst.append((nm, mw.translation.x, mw.translation.y, mw.to_euler('XYZ').z, ceil, mw.translation.z))
            if nm not in first: first[nm] = (e, mw)
    # lose Teile (Schilder, Wegweiser, Schrift auf Wand und Boden): je Feld zu einem Baustein gefasst
    signs = {}; LC = OPT['loose_cell']; loose = [OPT['loose']] if OPT['loose'] else [cn for cn, c in OPT['colls']]
    for cn in loose:
        bpy.data.collections[cn].hide_render = False
        for ob in bpy.data.collections[cn].objects:
            if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
            ctr = sum((ob.matrix_world @ Vector(b) for b in ob.bound_box), Vector()) / 8.0
            signs.setdefault((round(-ctr.y / LC), round(ctr.x / LC)), []).append(ob)
    names = sorted(first) + ['Schild %d %d' % k for k in sorted(signs)] + ['Ganz ' + u for u in sorted(every)]
    if OPT['only']: names = [n for n in names if any(n.startswith(o) for o in OPT['only'])]
    out = []; mods = {}; total = 0
    for i, nm in enumerate(names):
        t0 = time.time()
        if nm.startswith('Schild '):
            r, c = (int(v) for v in nm.split()[1:]); pairs = [(o, o.matrix_world.copy()) for o in signs[(r, c)]]; back = Matrix.Translation((-c * LC, r * LC, 0)); hide = signs[(r, c)]
            inst.append((nm, c * LC, -r * LC, 0.0, 0, 0.0))
        elif nm.startswith('Ganz '):      # alle Einsätze zusammen: ein Netz, Licht je Ort
            es = every[nm[5:]]; pairs = [q for (e, mw) in es for q in flat(e.instance_collection.objects, mw)]; back = Matrix.Identity(4); hide = [e for (e, mw) in es]
            inst.append((nm, 0.0, 0.0, 0.0, 0, 0.0))
        else:
            e, T = first[nm]; pairs = list(flat(bpy.data.collections[nm].objects, T)); back = T.inverted(); hide = [e]
        J, lights = realize(pairs, 'm%d' % i)
        if J is None:
            for l in lights: bpy.data.objects.remove(l)
            note('%s: leer' % nm); continue
        if OPT['grid']: grid_cut(J.data, OPT['grid'], OPT['long'])
        shade(J.data)
        for h in hide: h.hide_render = True
        try: bake(J)
        finally:
            for h in hide: h.hide_render = False
            for l in lights: bpy.data.objects.remove(l)
        used, pm = finish(J)
        J.data.transform(back); J.data.update()
        tris = sum(len(p.vertices) - 2 for p in J.data.polygons); total += tris
        mods[nm] = {'o': J.name, 'tris': tris, 'block': block_of(J, nm, pm)}
        SC.collection.objects.unlink(J); out.append(J)      # aus der Szene nehmen, damit er die nächsten Bausteine nicht verdeckt
        note('%d/%d %s: %d Dreiecke, %s, %.1f s' % (i + 1, len(names), nm, tris, '+'.join(used), time.time() - t0))
    # schreiben
    exp = bpy.data.collections.new('Export'); SC.collection.children.link(exp)
    for J in out: exp.objects.link(J)
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for J in out: J.select_set(True)
    bpy.context.view_layer.objects.active = out[0]
    os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
    glb = OUT_GLB if not OPT['only'] else os.path.join(HERE, 'export-test.glb')
    bpy.ops.export_scene.gltf(filepath=glb, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_normals=True, export_texcoords=False, export_materials='EXPORT',
                              export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True, export_attributes=False, export_extras=False,
                              export_cameras=False, export_lights=False, export_animations=False, export_skins=False, export_morph=False, export_shared_accessors=False)
    order = [n for n in names if n in mods]
    data = dict(META, mod=[{'n': n, 'o': mods[n]['o'], 'block': mods[n]['block']} for n in order],
                inst=[[order.index(n), round(x, 3), round(y, 3), round(a, 4), cl, round(z, 3)] for (n, x, y, a, cl, z) in inst if n in mods])
    js = OUT_JSON if not OPT['only'] else os.path.join(HERE, 'export-test.json')
    open(js, 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    placed = sum(mods[n]['tris'] for (n, x, y, a, cl, z) in inst if n in mods)
    cp.compute_device_type = 'NONE'
    note('FERTIG %d Bausteine, %d Dreiecke einmalig, %d gesetzt, %d Instanzen, %.0f s, %s' % (len(order), total, placed, len(data['inst']), time.time() - t00, glb))
def start():
    def go():
        try: run()
        except Exception: open(os.path.join(HERE, OPT['mark']), 'a', encoding='utf-8').write('\nFEHLER ' + traceback.format_exc()[-1800:])
        return None
    bpy.app.timers.register(go, first_interval=0.3)
start()
