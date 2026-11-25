# Milan fürs Spiel exportieren: blender.exe -b Milan.blend --python mil_export.py (nach els_export.py)
# Ganzes Modell in einer Datei (unter 30 m: kein begehbarer Innenraum; das Cockpit bleibt durch die Kanzel sichtbar).
# Ohne Bühnen (Studio, Hangar, Kameras, Planet), Lampen, Schraubeninstanzen und die durchscheinenden Lauf- und Abriebspuren.
# Jedes Material wird zu einem schlichten PBR-Material aus seinen Angaben (m['bk']): Grundfarbe, Metall, Rauheit, Leuchten; Glas halbdurchsichtig.
# Rumpfmaterialien mit Plattenfugen heißen ext_pan_* (das Spiel rechnet Fugen und Nieten im Shader aus den Koordinaten „Platten“).
# Bewegliche Teile (Gelenke in mil_kit.py): Ihre Materialien bekommen die Endung „ |<kennung>“ und eine winzig andere Rauheit, damit
# simplify-hard sie nicht mit gleichen Materialien zusammenlegt. Das Spiel dreht und schiebt sie (src/models/gltfShips.ts, Milan).
# Ausgabe: Milan_roh.glb, mil-export.txt (Maße, Mitte) und mil-gelenke.json (Gelenke in den Koordinaten der GLB-Datei: (y, z, x) aus Blender).
import bpy, json, os
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
SKIP_COLL = {'Studio grau', 'Hangar', 'Kameras'}
SKIP_MAT = {'Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb'}
GLASS = {'Kanzelglas', 'Schauglas', 'Kuppelglas'}
PAN = {'Rumpf Taubengrau': 'ext_pan_hell', 'Rumpf Graphit': 'ext_pan_graphit', 'Rumpf Radom': 'ext_pan_radom', 'Rumpf Signalorange': 'ext_pan_orange'}
anker = json.load(open(os.path.join(B, 'mil-anker.json')))
TAGS = [g['tag'] for g in anker['gelenke']]
CACHE = {}
def exp_mat(m, tag=None):
    if m is None: return None
    key = (m.name, tag)
    if key in CACHE: return CACHE[key]
    bk = json.loads(m['bk']) if 'bk' in m.keys() else {}
    if bk.get('stripes'): col = [(a + c) / 2 for a, c in zip(bk['a'], bk['c'])]
    else: col = bk.get('col') or [0.05, 0.06, 0.1]
    metal, rough = float(bk.get('metal', 0.3)), float(bk.get('rough', 0.5))
    emit, es = bk.get('emit'), float(bk.get('es', 0.0))
    if bk.get('stripes') and es: emit = col
    if tag: rough = min(1.0, rough + 0.0013 * (1 + TAGS.index(tag)))
    name = PAN.get(m.name, m.name + ' (Spiel)') + (' |' + tag if tag else '')
    e = bpy.data.materials.new(name); e.use_nodes = True
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit and es:
        b.inputs['Emission Color'].default_value = (*emit[:3], 1); b.inputs['Emission Strength'].default_value = min(3.0, es * 0.3)
    if m.name in GLASS:
        b.inputs['Base Color'].default_value = (0.22, 0.27, 0.3, 1); b.inputs['Alpha'].default_value = 0.22; b.inputs['Roughness'].default_value = 0.04; b.inputs['Metallic'].default_value = 0.0
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
out = bpy.data.collections.new('Export'); SC.collection.children.link(out)
dg = bpy.context.evaluated_depsgraph_get(); n_obj = n_tri = 0
lo = [1e9] * 3; hi = [-1e9] * 3
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'CURVE', 'FONT') or in_coll(o, SKIP_COLL) or o.hide_render: continue
    if o.instance_type == 'FACES' or (o.parent and o.parent.instance_type == 'FACES') or o.name.startswith('Schraubenkopf'): continue
    if any(m and m.name in SKIP_MAT for m in o.data.materials): continue
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    if not me.polygons: bpy.data.meshes.remove(me); continue
    me.transform(o.matrix_world)
    for v in me.vertices:
        for k in range(3): lo[k] = min(lo[k], v.co[k]); hi[k] = max(hi[k], v.co[k])
    tag = tag_of(o)
    for i, m in enumerate(me.materials): me.materials[i] = exp_mat(m, tag)
    ob = bpy.data.objects.new(o.name, me); out.objects.link(ob)
    n_obj += 1; n_tri += sum(len(p.vertices) - 2 for p in me.polygons)
for o in SC.objects: o.select_set(False)
for o in out.objects: o.select_set(True)
path = os.path.join(B, 'Milan_roh.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                          export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False, export_extras=False)
mitte = [round((a + b) / 2, 3) for a, b in zip(lo, hi)]
# Gelenke in den Koordinaten der GLB-Datei (simplify-hard dreht mit --rotY=-90: Datei = (y, z, x) aus Blender), Achsen ebenso
AX = {'X': 'z', 'Y': 'x', 'Z': 'y'}
F = lambda v: [round(v[1], 4), round(v[2], 4), round(v[0], 4)]
gel = []
for g in anker['gelenke']:
    d = dict(tag=g['tag'], grp=g['grp'], t0=g['t0'], t1=g['t1'])
    if g['slide']: d['slide'] = F(g['slide']); d['retract'] = True
    else: d['hinge'] = F(g['hinge']); d['axis'] = AX[g['axis']]; d['angle'] = g['angle']
    if g.get('inv'): d['inv'] = True
    gel.append(d)
schiff = lambda v: [round(-(v[1] - mitte[1]), 3), round(v[2] - mitte[2], 3), round(-(v[0] - mitte[0]), 3)]      # Schiffskoordinaten (Nase −Z)
json.dump({'gelenke': gel, 'kanzel_gelenk': F(anker['kanzel_gelenk']), 'mitte': mitte, 'laenge': round(hi[0] - lo[0], 2),
           'duese': schiff(anker['duese']), 'kanone': schiff(anker['kanone']), 'fracht': schiff(anker['fracht']), 'laser': schiff(anker['laser'])}, open(os.path.join(B, 'mil-gelenke.json'), 'w'), indent=1)
open(os.path.join(B, 'mil-export.txt'), 'w', encoding='utf-8').write('Objekte %d · Dreiecke %d · Materialien %d · %s (%.1f MB)\nGrenzen %s bis %s · Mitte %s · Länge %.2f\n' % (
    n_obj, n_tri, len(CACHE), path, os.path.getsize(path) / 1e6, [round(v, 3) for v in lo], [round(v, 3) for v in hi], mitte, hi[0] - lo[0]))
