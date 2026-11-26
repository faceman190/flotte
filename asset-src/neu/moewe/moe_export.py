# Möwe fürs Spiel exportieren: blender.exe -b Moewe.blend --python moe_export.py (Vorlage: kra_export.py)
# Volles Modell mit Laderaum, Technik, Wohnteil und dem ganzen Cockpit (begehbar wie Wisent und Kormoran). Zwei Dateien:
#   Moewe_roh.glb        geschlossen (Fahrwerk aus, Rampe zu). Bewegliche Teile (Gelenke aus moe_kit.py: Beine, Schachtklappen, Rampe,
#                          Verlängerung) behalten eigene Materialien mit der Endung „ |<kennung>“; das Spiel hängt sie an Gelenke
#                          (src/models/gltfShips.ts DOORS.Moewe).
#   Moewe_offen_roh.glb  Rampe offen: nur für die Laufkarte (scripts/build-walkmap.mjs), mit glatter Lauffläche über der Rampe.
# Rumpfmaterialien mit Plattenfugen werden zu ext_pan_* (Fugen und Nieten im Shader aus der UV „Platten“, auf das Plattenmaß des Spiels gestreckt).
# Innenraum (Sammlung „Cockpit“ = C_ROOM des Würger-Baukastens): Kennung „ ~iw/~ib/~ig/~im“ für den Oberflächen-Shader (innenFlaeche.ts).
# Cockpit (Sammlung „Cockpit Moewe“, moe_cockpit.py): Materialien „CP …“ aus ihren Angaben (m['cp']) mit der Kennung „ ~cp“. In der Ich-Sicht
# blendet das Spiel diese Teile aus und zeigt MoeweCockpit.glb (moe_export_cockpit.py, gleiche Teile mit gebackenem Licht).
# Ausgabe: moe-export.txt (Maße, Mitte) und moe-gelenke.json (Gelenke in den Koordinaten der GLB-Datei; Düsen, Kanone, Augpunkt, Griffe,
# Auslöser in Schiffskoordinaten des Spiels: Mitte im Ursprung, Nase −Z, x = −y aus Blender).
import bpy, bmesh, json, os, math
from mathutils import Vector, Matrix
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
# Den Baukasten hier nicht laden (wue_kit.py leert die Szene); Gelenke, Maße und Anker stehen in moe-anker.json
SKIP_COLL = {'Studio grau', 'Hangar', 'Kameras', 'Lichter'}
SKIP_MAT = {'Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb', 'CP Schirm Holo', 'CP Glas'}
GLASS = {'Kanzelglas', 'Schauglas'}
PAN = {'Rumpf Moewenweiss': 'ext_pan_mweiss', 'Rumpf Schiefergrau': 'ext_pan_mschiefer', 'Rumpf Moewengrau': 'ext_pan_mgrau', 'Rumpf Signalgelb': 'ext_pan_mgelb'}
PAN_F = 1.6 / 1.4      # Plattenmaß in Blender 1,4 × 0,8 m, im Spiel 1,6 × 0,9
anker = json.load(open(os.path.join(B, 'moe-anker.json')))
MS = anker['masse']; FL, ZK, ZC, TOR, HR_L1, HR_L2, HR_X, XE = MS['FL'], MS['ZK'], MS['ZC'], MS['TOR'], MS['HR_L1'], MS['HR_L2'], MS['HR_X'], MS['XE']
PIVOTS = {g['tag']: bpy.data.objects['Gelenk ' + g['tag']] for g in anker['gelenke']}
def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def zustand(fw=0.0, rampe=0.0):      # wie moe_kit.zustand
    want = {'fw': fw, 'rampe': rampe}
    for g in anker['gelenke']:
        e = PIVOTS[g['tag']]; k = ease((want[g['grp']] - g['t0']) / (g['t1'] - g['t0']))
        if g['slide']: e.location = Vector(g['slide']) * k
        else: e.rotation_euler = (0, 0, 0); e.rotation_euler[{'X': 0, 'Y': 1, 'Z': 2}[g['axis']]] = g['angle'] * k
    bpy.context.view_layer.update()
TAGS = [g['tag'] for g in anker['gelenke']]
INNEN_COLL = {'Cockpit'}
CACHE = {}
def innen_art(o, m):
    if m is None or not any(c.name in INNEN_COLL for c in o.users_collection): return ''
    bk = json.loads(m['bk']) if 'bk' in m.keys() else {}
    n = m.name.lower()
    if not bk or bk.get('emit') or bk.get('stripes') or m.name in GLASS or n.startswith('schrift') or 'glas' in n or 'licht' in n or 'anzeige' in n: return ''
    if n.startswith('gitter') or n == 'rost': return 'g'
    if any(k in n for k in ('boden', 'floor', 'stufe', 'podest', 'fliese')): return 'b'
    return 'm' if float(bk.get('metal', 0.3)) >= 0.7 else 'w'
def exp_mat(m, tag=None, has_uv=True, art=''):
    if m is None: return None
    pan = PAN.get(m.name) if has_uv else None
    cp = 'cp' in m.keys()
    key = (m.name, tag, bool(pan), art)
    if key in CACHE: return CACHE[key]
    d = json.loads(m['cp'] if cp else m['bk']) if (cp or 'bk' in m.keys()) else {}
    if d.get('stripes'): col = [(a + c) / 2 for a, c in zip(d['a'], d['c'])]
    else: col = d.get('col') or [0.05, 0.06, 0.1]
    metal, rough = float(d.get('metal', 0.3)), float(d.get('rough', 0.5))
    emit, es = d.get('emit'), float(d.get('es', 0.0) or 0.0)
    if d.get('stripes') and es: emit = col
    if tag: rough = min(1.0, rough + 0.0013 * (1 + TAGS.index(tag)))      # nicht mit gleichen Materialien zusammenlegen
    name = (pan if pan else m.name + ' (Spiel)') + (' ~i' + art if art else '') + (' ~cp' if cp else '') + (' |' + tag if tag else '')
    e = bpy.data.materials.new(name); e.use_nodes = True
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit and es:
        b.inputs['Emission Color'].default_value = (*emit[:3], 1); b.inputs['Emission Strength'].default_value = min(3.0, es * ((0.16 if m.name.startswith('CP Schirm') else 0.5) if cp else 0.3))      # Schirme im Schiffsmodell nur matt (die Ich-Sicht zeichnet eigene)
    if m.name in GLASS:
        b.inputs['Base Color'].default_value = (0.2, 0.24, 0.27, 1); b.inputs['Alpha'].default_value = 0.2; b.inputs['Roughness'].default_value = 0.04; b.inputs['Metallic'].default_value = 0.0
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(e, k, v)
            except Exception: pass
    CACHE[key] = e; return e
def in_coll(o, names): return any(c.name in names for c in o.users_collection)
def tag_of(o):
    while o is not None:
        if 'tag' in o.keys(): return o['tag']
        o = o.parent
    return None
REP = {}; LO = [1e9] * 3; HI = [-1e9] * 3
def export(fw, rampe, path, tagged):
    zustand(fw, rampe)
    out = bpy.data.collections.new('Export'); SC.collection.children.link(out)
    dg = bpy.context.evaluated_depsgraph_get(); n_obj = n_tri = 0; lo = [1e9] * 3; hi = [-1e9] * 3
    for o in list(bpy.data.objects):
        if o.type not in ('MESH', 'CURVE', 'FONT') or in_coll(o, SKIP_COLL) or o.hide_render: continue
        if o.instance_type == 'FACES' or (o.parent and o.parent.instance_type == 'FACES') or o.name.startswith('Schraubenkopf'): continue
        if o.type == 'MESH' and any(m and m.name in SKIP_MAT for m in o.data.materials): continue
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
        if not me.polygons: bpy.data.meshes.remove(me); continue
        me.transform(o.matrix_world)
        for v in me.vertices:
            for k in range(3): lo[k] = min(lo[k], v.co[k]); hi[k] = max(hi[k], v.co[k])
        tag = tag_of(o) if tagged else None
        has_uv = 'Platten' in me.uv_layers; src = list(me.materials)
        for i, m in enumerate(src): me.materials[i] = exp_mat(m, tag, has_uv, innen_art(o, m))
        if has_uv:
            uvl = me.uv_layers['Platten']
            for p in me.polygons:
                m = src[p.material_index] if p.material_index < len(src) else None
                if m is None or m.name not in PAN: continue
                for li in p.loop_indices: u, v = uvl.data[li].uv; uvl.data[li].uv = (u * PAN_F, v * PAN_F)
            for l in [l for l in me.uv_layers if l.name != 'Platten']: me.uv_layers.remove(l)
        ob = bpy.data.objects.new(o.name, me); out.objects.link(ob)
        n_obj += 1; n_tri += sum(len(p.vertices) - 2 for p in me.polygons)
    if not tagged:      # nur Laufkarte: glatte Lauffläche über der offenen Heckrampe (Rampe + Verlängerung) und Schwelle am Scharnier
        e1 = PIVOTS['rampe']; mw = e1.matrix_world; hw = TOR[0] - 0.12; L = HR_L1 + HR_L2 - 0.15
        H = Vector(anker['rampe_scharnier']); top = Vector((XE + 0.05, 0, 6.9)); kipp = math.atan2(top.x - H.x, top.z - H.z); Rk = Matrix.Rotation(kipp, 4, 'Y')
        bm = bmesh.new()
        # Rampe im Rahmen des Gelenks: gebaut senkrecht, Lauffläche zum Laderaum (+X), dann um kipp in die Heckschräge gedreht
        vs = [bm.verts.new(mw @ (Rk @ Vector(p))) for p in ((0.215, -hw, 0.0), (0.215, hw, 0.0), (0.215, hw, L), (0.215, -hw, L))]; bm.faces.new(vs)
        q = [bm.verts.new(Vector(p)) for p in ((H.x - 0.1, -hw, FL + 0.005), (H.x + 0.7, -hw, FL + 0.005), (H.x + 0.7, hw, FL + 0.005), (H.x - 0.1, hw, FL + 0.005))]; bm.faces.new(q)
        me = bpy.data.meshes.new('Laufhilfe Rampe'); bm.to_mesh(me); bm.free(); me.materials.append(bpy.data.materials.new('Laufhilfe'))
        out.objects.link(bpy.data.objects.new('Laufhilfe Rampe', me))
    for o in SC.objects: o.select_set(False)
    for o in out.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                              export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False, export_extras=False)
    for o in list(out.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(out)
    REP[os.path.basename(path)] = dict(objekte=n_obj, dreiecke=n_tri, mb=round(os.path.getsize(path) / 1e6, 1), min=[round(v, 3) for v in lo], max=[round(v, 3) for v in hi])
    if tagged:
        for k in range(3): LO[k] = lo[k]; HI[k] = hi[k]
export(0.0, 0.0, os.path.join(B, 'Moewe_roh.glb'), True)
export(0.0, 1.0, os.path.join(B, 'Moewe_offen_roh.glb'), False)
zustand(0, 0)
mitte = [round((a + b) / 2, 3) for a, b in zip(LO, HI)]
AX = {'X': 'z', 'Y': 'x', 'Z': 'y'}
F = lambda v: [round(v[1], 4), round(v[2], 4), round(v[0], 4)]
gel = []
for g in anker['gelenke']:
    d = dict(tag=g['tag'], grp=g['grp'], t0=g['t0'], t1=g['t1'])
    if g['slide']: d['slide'] = F(g['slide'])
    else: d['hinge'] = F(g['hinge']); d['axis'] = AX[g['axis']]; d['angle'] = g['angle']
    if g.get('inv'): d['inv'] = True
    gel.append(d)
schiff = lambda v: [round(-(v[1] - mitte[1]), 3), round(v[2] - mitte[2], 3), round(-(v[0] - mitte[0]), 3)]
richt = lambda d: [round(-d[1], 3), round(d[2], 3), round(-d[0], 3)]
du = {k: [dict(p=schiff(e['p']), d=richt(e['d']), **({'r': e['r']} if 'r' in e else {})) for e in v] for k, v in anker['duesen'].items()}
res = {'gelenke': gel, 'mitte': mitte, 'laenge': round(HI[0] - LO[0], 2), 'breite': round(HI[1] - LO[1], 2), 'hoehe': round(HI[2] - LO[2], 2),
       'duesen': du, 'kanone': schiff(anker['kanone1']), 'rampe_scharnier': schiff(anker['rampe_scharnier']),
       'fuesse': [schiff(p) for p in anker['fuesse']], 'boden_innen': round(FL - mitte[2], 3), 'boden_kabine': round(ZK - mitte[2], 3), 'boden_cockpit': round(ZC - mitte[2], 3)}
if 'auge' in anker: res['auge'] = schiff(anker['auge'])
if 'griffe' in anker: res['griffe'] = [schiff(p) for p in anker['griffe']]
if 'raum' in anker: res['raum'] = {k: schiff(v) for k, v in anker['raum'].items()}
json.dump(res, open(os.path.join(B, 'moe-gelenke.json'), 'w'), indent=1)
open(os.path.join(B, 'moe-export.txt'), 'w', encoding='utf-8').write(json.dumps(REP, ensure_ascii=False, indent=1) + '\nMitte %s · Länge %.2f\n' % (mitte, HI[0] - LO[0]))
