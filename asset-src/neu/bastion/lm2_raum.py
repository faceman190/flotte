# Lichtraum 2 (Probe, Alpha 1.29): Material im Spiel, gebacken wird nur das Licht.
# Läuft in der Datei des gebauten Decks (wie lm_raum.py). ACHTUNG: verändert die Szene, danach NICHT speichern.
#
# Warum: lm_raum.py backt Farbe, Rauheit und Relief je Raum in ein eigenes Bild. Nachgemessen sind das nur 51 bis 78 Bildpunkte je Meter
# (üblich: etwa 500), die Flächen wirken aus der Nähe verwaschen, und das Backen dauert Minuten je Raum. Die Materialien des Baukastens sind
# aber reine Rechenmuster (bk_lib.mk: Flecken, Rauheit, Korn, Noppen, Kantenabrieb). Das Spiel rechnet sie deshalb selbst, beliebig scharf.
#
# Ablauf:
#   1. Bausteine der Zellen auflösen (wie lm_raum.py), die Materialien bleiben je Fläche erhalten.
#   2. Materialtabelle: je Material die Angaben aus bk_lib.mk (dort als Eigenschaft „bk“ abgelegt) und die Art
#      (lit beleuchtet, glow Leuchte, screen, stars, glass).
#   3. Licht in zwei Formen, beide ohne Farbe (Bestrahlung direkt und indirekt, w = Wurzel(x / (1 + x))):
#        große Flächen (ab OPT['big'] m²): grobe Lichtkarte, eigene Abwicklung nur dieser Flächen
#        alle Flächen: Licht je Eckpunkt (Farbattribut); das Spiel nimmt es für die kleinen Flächen (deren Abwicklung liegt bei −1, −1)
#      Im Alphakanal der Eckfarben steht, ob die Fläche ein schmaler Streifen ist (Fase an einer Kante): Dort sitzt der Kantenabrieb.
#   4. Ausgabe: asset-src/tex-world/l2_<raum>_lit@<größe>.png, asset-src/glb/base/<glb> (Materialnamen ext_l2_<Material>),
#      asset-src/data/<json> (Räume und Materialtabelle).
import bpy, bmesh, math, os, json, time, traceback
import numpy as np
from mathutils import Matrix
HERE = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
OPT = dict({'rooms': [], 'lm': 1024, 'samples': 256, 'vsamples': 48, 'big': 0.03, 'margin': 3, 'gap': 2.0, 'mark': 'lm2.txt',
            'glb': 'Lichtraum2.glb', 'json': 'lichtraum2.json'}, **globals().get('OPT', {}))
CELL = float(OPT.get('cell', 4.0))      # Zellmaß des Decks (Bastion 4 m, Hüttendeck der Eisenkrone 6 m)
STAIN = ('Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb') + tuple(OPT.get('skipmats', []))      # skipmats: Materialien, die im Spiel fehlen sollen (Rundhalle: Holoschleier)
LOG = []
SPUREN = {}      # Teil → [(Objekt, Lage)]: Laufspuren, Flecken, Abrieb (OPT spuren: als eigene Netze „<Teil>__spuren“ ins Spiel, deck.ts zeichnet sie)
def note(s):
    LOG.append(s); open(os.path.join(HERE, OPT['mark']), 'w', encoding='utf-8').write('\n'.join(LOG))
def principled(m): return [n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'] if (m and m.node_tree) else []
def sock(n, *names): return next((n.inputs[k] for k in names if k in n.inputs), None)

# ---------- Materialtabelle ----------
def kind(m):
    P = principled(m); b = P[0] if P else None; nm = m.name.split('.')[0]
    if b is None: return 'lit'
    es = sock(b, 'Emission Strength'); tr = sock(b, 'Transmission Weight', 'Transmission')
    if nm in ('Bildschirm', 'Wandbild'): return 'screen'
    if 'bk' in m.keys() and json.loads(m['bk']).get('stripes') and json.loads(m['bk']).get('es', 0) > 0: return 'screen'      # leuchtende Streifen (Rundhalle: Ringschirm, Kurstafel, Auftragstafel, Sternkarte)
    if nm in ('Sternfeld', 'Ausblick'): return 'stars'      # Ausblick (Quartier): im Spiel ein eigener Himmel nach der Blickrichtung
    if es is not None and (es.is_linked or es.default_value > 0): return 'glow'
    if tr is not None and tr.default_value > 0.5: return 'glass'
    return 'lit'
def params(m):
    if m is None: return 'ohne', dict(kind='lit', col=[0.2, 0.2, 0.2], metal=0.0, rough=0.6)
    nm = m.name.split('.')[0]; P = principled(m); b = P[0] if P else None
    d = json.loads(m['bk']) if 'bk' in m.keys() else {}
    if not d and b is not None:      # Materialien ohne bk_lib.mk (Schrift, Schilder): die festen Werte des Knotens
        bc = sock(b, 'Base Color').default_value; d = dict(col=[bc[0], bc[1], bc[2]], metal=sock(b, 'Metallic').default_value, rough=sock(b, 'Roughness').default_value)
        e = sock(b, 'Emission Color', 'Emission'); es = sock(b, 'Emission Strength')
        if e is not None and es is not None and es.default_value > 0: d['emit'] = list(e.default_value)[:3]; d['es'] = es.default_value
    d['kind'] = kind(m)
    return nm, {k: (round(v, 4) if isinstance(v, float) else v) for k, v in d.items()}

# ---------- Auflösen (wie lm_raum.py) ----------
def cell_of(ob): return [round(-ob.location.y / CELL), round(ob.location.x / CELL)]
def flat(objs, T):
    for ob in objs:
        if ob.type == 'EMPTY' and ob.instance_type == 'COLLECTION' and ob.instance_collection: yield from flat(ob.instance_collection.objects, T @ ob.matrix_world)
        else: yield ob, T @ ob.matrix_world
def realize(empties, name):      # empties: Instanzen von Bausteinen, im Hangar auch freie Objekte (Schriften an Wand und Boden)
    dg = bpy.context.evaluated_depsgraph_get(); tmp = []; nl = 0
    for e in empties:
        src = flat(e.instance_collection.objects, e.matrix_world) if (e.type == 'EMPTY' and e.instance_collection) else [(e, e.matrix_world.copy())]
        for ob, MW in src:
            if ob.type == 'LIGHT':
                l = ob.copy(); l.matrix_world = MW; SC.collection.objects.link(l); nl += 1; continue
            if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
            if ob.type == 'FONT' and not ob.data.body.strip(): continue
            mats = [s.material for s in ob.material_slots if s.material]
            if mats and mats[0].name.split('.')[0] in STAIN:
                if OPT.get('spuren') and 'stain' in mats[0].keys() and ob.type == 'MESH': SPUREN.setdefault(name, []).append((ob, MW.copy()))      # Spuren fürs Spiel
                continue
            me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg)
            if not me.polygons: bpy.data.meshes.remove(me); continue
            o = bpy.data.objects.new('tmp', me); o.matrix_world = MW; SC.collection.objects.link(o); tmp.append(o)
    for e in empties:
        if e.type == 'EMPTY': e.instance_type = 'NONE'
        else: e.hide_render = True; e.hide_viewport = True      # freies Objekt: das Original nicht doppelt backen
    datas = [o.data for o in tmp[1:]]
    with bpy.context.temp_override(active_object=tmp[0], object=tmp[0], selected_editable_objects=tmp, selected_objects=tmp): bpy.ops.object.join()
    for d in datas:
        if d.users == 0: bpy.data.meshes.remove(d)
    J = tmp[0]; J.name = name; me = J.data; me.transform(J.matrix_world); J.matrix_world = Matrix.Identity(4)
    for uv in list(me.uv_layers): me.uv_layers.remove(uv)
    for ca in list(me.color_attributes): me.color_attributes.remove(ca)
    return J, nl

# ---------- Abwickeln: nur die großen beleuchteten Flächen ----------
def area_ctx():
    for w in bpy.context.window_manager.windows:
        for a in w.screen.areas:
            if a.type == 'VIEW_3D': return dict(window=w, area=a, region=next(r for r in a.regions if r.type == 'WINDOW'))
    return {}
def poly_arrays(me):
    npol = len(me.polygons); nl = len(me.loops)
    ar = np.empty(npol, dtype=np.float32); me.polygons.foreach_get('area', ar)
    mi = np.empty(npol, dtype=np.int32); me.polygons.foreach_get('material_index', mi)
    lt = np.empty(npol, dtype=np.int32); me.polygons.foreach_get('loop_total', lt); ls = np.empty(npol, dtype=np.int32); me.polygons.foreach_get('loop_start', ls)
    return npol, nl, ar, mi, lt, ls
def unwrap_big(J, size, kinds, bmin=None):      # bmin: Mindestfläche (m²) für die Lichtkarte; Vorgabe OPT['big']
    me = J.data; npol, nl, ar, mi, lt, ls = poly_arrays(me)
    lit = np.array([k == 'lit' for k in kinds], dtype=bool)[mi]
    big = (ar >= (bmin or OPT['big'])) & lit
    me.uv_layers.new(name='LM'); me.uv_layers.active = me.uv_layers['LM']
    for o in bpy.context.view_layer.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
    ctx = area_ctx()
    with bpy.context.temp_override(**ctx, active_object=J, object=J, selected_objects=[J], selected_editable_objects=[J]):
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.reveal()
        # Die kleinen Flächen ausblenden: Abwickeln und Packen gelten dann nur den großen. Bloßes Auswählen reicht nicht, „uv.select_all“
        # wählt (ohne Fenster) alle Flächen des Netzes mit aus, und das Packen quetscht die großen zwischen die kleinen.
        bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
        for f, sel in zip(bm.faces, big.tolist()): f.hide_set(not sel)
        bmesh.update_edit_mesh(me)
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(60), island_margin=0.001, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.select_all(action='SELECT')
        bpy.ops.uv.pack_islands(rotate=True, margin_method='ADD', margin=OPT['gap'] / size, shape_method='CONVEX')
        bpy.ops.mesh.reveal()
        bpy.ops.object.mode_set(mode='OBJECT')
    me = J.data; a = np.empty(nl * 2, dtype=np.float32); me.uv_layers['LM'].data.foreach_get('uv', a); a = a.reshape(-1, 2)
    lbig = np.repeat(big, lt)
    a[~lbig] = -1.0      # kleine Flächen: außerhalb des Bildes, das Spiel nimmt für sie das Licht der Eckpunkte
    me.uv_layers['LM'].data.foreach_set('uv', a.ravel())
    cover = sum(0.5 * abs(float(np.dot(a[s:s + t, 0], np.roll(a[s:s + t, 1], 1)) - np.dot(a[s:s + t, 1], np.roll(a[s:s + t, 0], 1)))) for s, t, g in zip(ls, lt, big) if g)
    return cover, float(ar[big].sum()), float(ar.sum()), int(big.sum())

# ---------- Backen ----------
def prep_materials():      # Metall zählt beim Backen als Lack (das Spiel rechnet den Glanz selbst), kein Dunst
    for m in bpy.data.materials:
        for b in principled(m):
            s = sock(b, 'Metallic')
            for l in list(s.links): m.node_tree.links.remove(l)
            s.default_value = 0.0
    wd = SC.world
    if wd and wd.node_tree:
        wo = next((n for n in wd.node_tree.nodes if n.type == 'OUTPUT_WORLD'), None)
        if wo:
            for l in list(wo.inputs['Volume'].links): wd.node_tree.links.remove(l)
def target(J, img):
    for m in J.data.materials:
        if not m or not m.node_tree: continue
        N = m.node_tree.nodes; n = N.get('LM_Ziel') or N.new('ShaderNodeTexImage'); n.name = 'LM_Ziel'; n.image = img; N.active = n
def pick(J):
    for o in bpy.context.view_layer.objects: o.select_set(False)
    J.select_set(True); bpy.context.view_layer.objects.active = J
def pixels(img):
    w, h = img.size; p = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(p); return p.reshape(h, w, 4)
def save_png(arr, name, path):
    h, w = arr.shape[:2]; out = bpy.data.images.new(name, w, h, alpha=False)
    out.colorspace_settings.name = 'Non-Color'
    rgba = np.ones((h, w, 4), dtype=np.float32); rgba[..., :3] = arr[..., :3]
    out.pixels.foreach_set(rgba.ravel()); out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    bpy.data.images.remove(out)
def soften(x):
    k = np.array([1, 2, 1], dtype=np.float32) / 4
    for ax in (0, 1): x = sum(np.roll(x, d, axis=ax) * k[d + 1] for d in range(-1, 2))
    return x
enc = lambda x: np.sqrt(np.clip(x, 0, 40) / (1 + np.clip(x, 0, 40)))
def deflicker(x, k=2.5):      # einzelne viel zu helle Bildpunkte der Lichtkarte (Zufallstreffer starker Leuchten) auf das k-fache des Medians der 8 Nachbarn begrenzen
    lum = x.max(axis=2)
    st = np.stack([np.roll(np.roll(lum, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1) if dy or dx])
    cap = k * np.median(st, axis=0) + 0.03
    fk = np.where(lum > cap, cap / np.maximum(lum, 1e-6), 1.0)
    return x * fk[..., None], int((fk < 1).sum())
def vsmooth(me, c, h):      # Licht je Eckpunkt räumlich mitteln: je Würfel von h Metern und Richtung der Fläche (6 Klassen) der Mittelwert
    npol, nl, ar, mi, lt, ls = poly_arrays(me)
    co = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lv = np.empty(nl, dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
    pn = np.empty(npol * 3, dtype=np.float32); me.polygons.foreach_get('normal', pn); pn = np.repeat(pn.reshape(-1, 3), lt, axis=0)
    ax = np.abs(pn).argmax(axis=1); cls = ax * 2 + (pn[np.arange(nl), ax] > 0)
    key = np.concatenate([np.floor(co[lv] / h).astype(np.int32), cls[:, None].astype(np.int32)], axis=1)
    _, inv = np.unique(key, axis=0, return_inverse=True); inv = inv.ravel(); n = inv.max() + 1; cnt = np.bincount(inv, minlength=n).astype(np.float32)
    for ch in range(3): c[:, ch] = (np.bincount(inv, weights=c[:, ch], minlength=n) / cnt)[inv]
    return c

def edge_mask(me):      # je Fläche: schmaler Streifen (Breite etwa 2 · Fläche / Umfang unter 13 mm)? Das sind die Fasen an den Kanten.
    npol, nl, ar, mi, lt, ls = poly_arrays(me)
    co = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lv = np.empty(nl, dtype=np.int32); me.loops.foreach_get('vertex_index', lv)
    nxt = np.arange(nl) + 1; nxt[ls + lt - 1] = ls
    el = np.linalg.norm(co[lv] - co[lv[nxt]], axis=1); per = np.add.reduceat(el, ls)
    thin = (2.0 * ar / np.maximum(per, 1e-6)) < 0.013
    return np.repeat(thin, lt), lt

def run():
    t0 = time.time(); note('Start')
    # Schlanker (OPT['slim'], Vorgabe aus): Fasen mit einer Stufe statt zwei, Rohre mit weniger Segmenten. Die schmalen Streifen an den Kanten
    # bleiben (dort sitzt der Kantenabrieb), das Deck hat dann etwa 60 % der Dreiecke (voll: 2,4 Mio., 62 MB gepackt). Der Nutzer hat sich
    # am 16.11.2026 für die volle Fassung entschieden („Warum sind 62 MB zu groß, nimm diese“).
    if OPT.get('slim', False):
        for ob in bpy.data.objects:
            for md in ob.modifiers:
                if md.type == 'BEVEL': md.segments = 1
            if ob.type == 'CURVE': ob.data.bevel_resolution = min(ob.data.bevel_resolution, 2)
    for nm in OPT.get('hide', []):      # z. B. der Dunstkasten des Hangars: nicht mitbacken
        ob = bpy.data.objects.get(nm)
        if ob: ob.hide_render = True
    # Sammlungen ausblenden (Hangar: „Draussen“ mit Planet und Sternen; ihr Licht färbte den Boden am Tor bräunlich, im Spiel liegt dort der Weltraum)
    for cn in OPT.get('hide_colls', []):
        if cn in bpy.data.collections:
            for ob in bpy.data.collections[cn].all_objects: ob.hide_render = True
    parts = [dict(name=r['name'], cells=[list(c) for c in r.get('cells', [])], lm=r.get('lm', OPT['lm']), spp=r.get('samples', OPT['samples']), big=r.get('big', OPT['big']), emp=[]) for r in OPT['rooms']]
    if OPT.get('split') == 'hangar':
        # Hangar: Teile nach Lage wie die Bereiche im Spiel (deck.ts, buildHangar): Dach; Halle in 3 × 3 Feldern (h<i><j>); Wandfüllungen und
        # Kleinteile des Gang-Baukastens in denselben Feldern, aber eigene Teile (k<i><j>), damit das Spiel sie in der Ferne ausblenden kann
        byname = {p['name']: p for p in parts}; pre = OPT.get('prefix', 'hangar_')
        def field(x, y): return '%d%d' % (min(2, max(0, int((x + 92) // 61.4))), min(2, max(0, int((y + 112) // 54.1))))
        for cn, roof in (('Hangar', False), ('Hangar Dach', True)):
            for e in bpy.data.collections[cn].objects:
                if e.type == 'EMPTY' and not (e.instance_type == 'COLLECTION' and e.instance_collection): continue
                if e.type not in ('EMPTY', 'MESH', 'CURVE', 'FONT'): continue
                if e.name.startswith('Dunst'): continue
                x, y = e.location.x, e.location.y; mod = e.instance_collection.name if e.type == 'EMPTY' else ''
                key = 'dach' if roof else ('k' if mod.startswith(('Wand ', 'Objekt ')) else 'h') + field(x, y)
                p = byname.get(pre + key)
                if p: p['emp'].append(e)
                else: note('kein Teil für ' + e.name + ' (' + key + ')')
    elif OPT.get('split') == 'rund':
        # Rundhalle (rh_spiel.py): jede Instanz trägt ihren Teil in der Eigenschaft l2part
        byname = {p['name']: p for p in parts}
        for cn in ('Deck', 'Decke', 'Schilder'):
            for e in bpy.data.collections[cn].objects:
                if e.type == 'EMPTY' and not (e.instance_type == 'COLLECTION' and e.instance_collection): continue
                if e.type not in ('EMPTY', 'MESH', 'CURVE', 'FONT') or e.hide_render: continue
                p = byname.get(e.get('l2part', ''))
                if p: p['emp'].append(e)
    else:
        for cn in ('Deck', 'Deck Decken', 'Deck Schilder'):      # dazu freie Objekte (Schilder und Schrift an Toren und auf dem Boden)
            if cn not in bpy.data.collections: continue
            for e in bpy.data.collections[cn].objects:
                if e.type == 'EMPTY' and not (e.instance_type == 'COLLECTION' and e.instance_collection): continue
                if e.type not in ('EMPTY', 'MESH', 'CURVE', 'FONT'): continue
                c = cell_of(e)
                for p in parts:
                    if c in p['cells']: p['emp'].append(e); break
    table = {}
    tri = lambda J: sum(len(q.vertices) - 2 for q in J.data.polygons)
    leer = [p['name'] for p in parts if not p['emp']]
    if leer: note('ohne Bausteine, übersprungen: ' + ', '.join(leer))
    parts = [p for p in parts if p['emp']]
    for p in parts:
        p['J'], nl = realize(p['emp'], p['name'])
        p['mats'] = [params(m) for m in p['J'].data.materials]      # vor dem Umbau fürs Backen
        for nm, d in p['mats']: table[nm] = d
        note('aufgelöst: %s %d Instanzen, %d Dreiecke, %d Lampen, %d Materialien (%.0f s)' % (p['name'], len(p['emp']), tri(p['J']), nl, len(set(n for n, _ in p['mats'])), time.time() - t0))
    for p in parts:
        cov, abig, aall, nbig = unwrap_big(p['J'], p['lm'], [d['kind'] for _, d in p['mats']], p['big'])
        p['dichte'] = math.sqrt(cov * p['lm'] ** 2 / max(abig, 1e-6))
        note('abgewickelt: %s %d große Flächen, %.0f von %.0f m², Bild belegt %.0f %%, %.0f Bildpunkte je Meter (%.0f s)' % (p['name'], nbig, abig, aall, cov * 100, p['dichte'], time.time() - t0))
    cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; SC.cycles.device = 'GPU'
    # Abtastwerte begrenzen (Hangar): Kleine, starke Leuchten (Hallenleuchten, Stärke 20) erzeugen sonst „Glühwürmchen“, einzelne viel zu helle Punkte
    if OPT.get('clamp_direct') is not None: SC.cycles.sample_clamp_direct = OPT['clamp_direct']
    if OPT.get('clamp_indirect') is not None: SC.cycles.sample_clamp_indirect = OPT['clamp_indirect']
    prep_materials()
    tex = os.path.join(ROOT, 'asset-src', 'tex-world'); info = {}
    for p in parts:
        J, name, s = p['J'], p['name'], p['lm']; me = J.data; tb = time.time()
        # 1. Lichtkarte der großen Flächen
        im = bpy.data.images.new('L2_lit', s, s, alpha=False, float_buffer=True); target(J, im); pick(J)
        SC.cycles.samples = p['spp']; bk = SC.render.bake
        bk.margin = OPT['margin']; bk.margin_type = 'EXTEND'; bk.target = 'IMAGE_TEXTURES'; bk.use_clear = True
        bk.use_pass_direct = True; bk.use_pass_indirect = True; bk.use_pass_color = False
        bpy.ops.object.bake(type='DIFFUSE')
        x = pixels(im)[..., :3]; nflick = 0
        if OPT.get('deflicker'): x, nflick = deflicker(x, OPT['deflicker'])
        x = soften(x); save_png(enc(x), 'lit', os.path.join(tex, 'l2_%s_lit@%d.png' % (name, s))); bpy.data.images.remove(im)
        t1 = time.time() - tb
        # 2. Licht je Eckpunkt (für die kleinen Flächen)
        col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); me.color_attributes.active_color = col; me.color_attributes.render_color_index = me.color_attributes.find('Col')
        pick(J); SC.cycles.samples = OPT['vsamples']
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, target='VERTEX_COLORS', use_clear=True)
        nl = len(me.loops); c = np.empty(nl * 4, dtype=np.float32); me.color_attributes['Col'].data.foreach_get('color', c); c = c.reshape(nl, 4)
        c[~np.isfinite(c)] = 0.0
        # Ausreißer: Eine Ecke, die viel heller ist als die übrigen Ecken derselben Fläche, ist ein Zufallstreffer einer Leuchte (beim Backen je
        # Ecke nur wenige Abtastungen). Auf das Dreifache des Mittels der übrigen Ecken begrenzen (plus 0,1). Aus der Ferne waren das Glitzerpunkte.
        if OPT.get('ausreisser', True):
            npol_, nl_, ar_, mi_, lt_, ls_ = poly_arrays(me)
            lum = c[:, :3].max(axis=1); fsum = np.add.reduceat(lum, ls_); cnt = np.repeat(lt_, lt_).astype(np.float32)
            others = (np.repeat(fsum, lt_) - lum) / np.maximum(cnt - 1, 1); cap = 3.0 * others + 0.1
            k = np.where(lum > cap, cap / np.maximum(lum, 1e-6), 1.0); c[:, :3] *= k[:, None]
            info_aus = int((k < 1).sum())
        else: info_aus = 0
        if OPT.get('vsmooth'): c = vsmooth(me, c, OPT['vsmooth'])
        thin, _ = edge_mask(me)
        c[:, :3] = enc(c[:, :3]); c[:, 3] = thin.astype(np.float32)
        me.color_attributes['Col'].data.foreach_set('color', c.ravel()); me.update()
        info[name] = {'tris': tri(J), 'lit': s, 'dichte': round(p['dichte']), 'sek_karte': round(t1), 'sek_ecken': round(time.time() - tb - t1), 'kanten': round(float(thin.mean()), 3), 'ausreisser': info_aus, 'flicker': nflick}
        note('%s: Lichtkarte %d² in %.0f s, Eckpunkte in %.0f s, Licht Mittel %.3f (%.0f s)' % (name, s, t1, time.time() - tb - t1, float(x.mean()), time.time() - t0))
    # Spuren (OPT spuren): je Teil ein Netz, Abwicklung = Lage im Quad (Fleck: Mitte 0, Rand ±0,5; Laufspur: x ±0,5, y von 0 oben bis −1 unten)
    spur_objs = []
    for p in parts:
        items = SPUREN.get(p['name'], [])
        if not items: continue
        bm_all = bmesh.new(); names = []
        for ob, MW in items:
            m0 = ob.data.materials[0]; nm = m0.name.split('.')[0]
            if nm not in names: names.append(nm); table[nm] = dict(json.loads(m0['stain']), kind='stain')
            t = bmesh.new(); t.from_mesh(ob.data); uvl = t.loops.layers.uv.new('UVMap')
            for f in t.faces:
                f.material_index = names.index(nm)
                for l in f.loops: l[uvl].uv = (l.vert.co.x, l.vert.co.y)
            bmesh.ops.transform(t, matrix=MW, verts=t.verts[:]); me2 = bpy.data.meshes.new('t'); t.to_mesh(me2); t.free(); bm_all.from_mesh(me2); bpy.data.meshes.remove(me2)
        me = bpy.data.meshes.new(p['name'] + '__spuren'); bm_all.to_mesh(me); bm_all.free()
        for nm in names: mm = bpy.data.materials.get('ext_l2_' + nm) or bpy.data.materials.new('ext_l2_' + nm); me.materials.append(mm)
        o = bpy.data.objects.new(p['name'] + '__spuren', me); SC.collection.objects.link(o); spur_objs.append(o)
        info.setdefault(p['name'], {})['spuren'] = len(items)
    if SPUREN: note('Spuren: %s' % {k: len(v) for k, v in SPUREN.items()})
    # Materialien je Fläche: Platzhalter mit dem Namen des Materials (das Spiel baut daraus sein eigenes)
    for p in parts:
        me = p['J'].data; names = [n for n, _ in p['mats']]; uniq = sorted(set(names)); idx = {n: i for i, n in enumerate(uniq)}
        mi = np.empty(len(me.polygons), dtype=np.int32); me.polygons.foreach_get('material_index', mi)
        new = np.array([idx[n] for n in names], dtype=np.int32)[mi]
        me.materials.clear()
        for n in uniq:
            m = bpy.data.materials.get('ext_l2_' + n) or bpy.data.materials.new('ext_l2_' + n); m.use_nodes = True; me.materials.append(m)
        me.polygons.foreach_set('material_index', new); me.update()
    for o in bpy.context.view_layer.objects: o.select_set(False)
    for p in parts: p['J'].select_set(True)
    for o in spur_objs: o.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]['J']
    bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT, 'asset-src', 'glb', 'base', OPT['glb']), export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                              export_normals=True, export_texcoords=True, export_materials='EXPORT', export_vertex_color='ACTIVE', export_all_vertex_colors=False,
                              export_active_vertex_color_when_no_material=True, export_attributes=False, export_extras=False, export_cameras=False, export_lights=False,
                              export_animations=False, export_skins=False, export_morph=False, export_image_format='NONE')
    data = {'raeume': [{'name': p['name'], 'zellen': p['cells'], 'lit': 'l2_' + p['name'] + '_lit'} for p in parts], 'mats': table, 'info': info}
    open(os.path.join(ROOT, 'asset-src', 'data', OPT['json']), 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False))
    cp.compute_device_type = 'NONE'
    note('FERTIG %s (%.0f s)' % (json.dumps(info, ensure_ascii=False), time.time() - t0))
def start():
    def go():
        try: run()
        except Exception: note('FEHLER ' + traceback.format_exc()[-2500:])
        return None
    bpy.app.timers.register(go, first_interval=0.3)
if not globals().get("NO_START"): start()
