# Kormoran fürs Spiel exportieren: blender.exe -b Kormoran.blend --python kor_export.py
# Volles Modell (außen und innen in einer Datei, wie die Pfeil), geschlossener Zustand (Bild 1: Rampe zu, Leiter eingefahren).
# Ohne Studio, Platzhalter, Lichter und die Schraubeninstanzen. Jedes Material wird zu einem schlichten PBR-Material aus seinen
# Angaben (m['bk'] von mk/stripes): Grundfarbe, Metall, Rauheit, Leuchten; Glas halbdurchsichtig. Das ganze Fahrwerk bekommt das
# Material „gear“ (das Spiel blendet es im Flug aus, src/models/gltfShips.ts setGear).
# Ausgabe: Kormoran_roh.glb hier im Ordner, danach scripts/simplify-hard.mjs → asset-src/glb/ship/Kormoran.glb (docs/kormoran.md).
import bpy, json, os
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
SC.frame_set(1)
SKIP_COLL = {'Studio', 'Innenraum Platzhalter'}
GLASS = {'Kanzelglas', 'Glas', 'Schauglas', 'HUD-Glas'}
CACHE = {}
def exp_mat(m):
    if m is None: return None
    if m.name in CACHE: return CACHE[m.name]
    bk = json.loads(m['bk']) if 'bk' in m.keys() else {}
    if bk.get('stripes'): col = [(a + c) / 2 for a, c in zip(bk['a'], bk['c'])]
    else: col = bk.get('col') or [0.05, 0.06, 0.1]
    metal, rough = float(bk.get('metal', 0.3)), float(bk.get('rough', 0.5))
    emit, es = bk.get('emit'), float(bk.get('es', 0.0))
    if bk.get('stripes') and es: emit = col
    if not bk and m.name.startswith('Sternenfenster'): emit, es = [0.5, 0.6, 1.0], 0.6
    e = bpy.data.materials.new(m.name + ' (Spiel)'); e.use_nodes = True
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit and es:
        b.inputs['Emission Color'].default_value = (*emit[:3], 1); b.inputs['Emission Strength'].default_value = min(3.0, es * 0.3)
    if m.name in GLASS:
        b.inputs['Base Color'].default_value = (0.02, 0.03, 0.04, 1); b.inputs['Alpha'].default_value = 0.3; b.inputs['Roughness'].default_value = 0.05
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(e, k, v)
            except Exception: pass
    CACHE[m.name] = e; return e
GEAR = bpy.data.materials.new('gear'); GEAR.use_nodes = True
_b = next(n for n in GEAR.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); _b.inputs['Base Color'].default_value = (0.06, 0.062, 0.066, 1); _b.inputs['Metallic'].default_value = 0.85; _b.inputs['Roughness'].default_value = 0.4
def in_coll(o, names): return any(c.name in names for c in o.users_collection)
gear_objs = set(o.name for o in bpy.data.collections['Fahrwerk'].all_objects)
dg = bpy.context.evaluated_depsgraph_get()
out = bpy.data.collections.new('Export'); SC.collection.children.link(out)
n_obj = n_tri = 0
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'CURVE', 'FONT') or o.hide_render or in_coll(o, SKIP_COLL): continue
    if o.instance_type == 'FACES' or (o.parent and o.parent.instance_type == 'FACES') or o.name.startswith('Schraubenkopf'): continue
    if not o.visible_get() and o.hide_viewport: continue
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    if not me.polygons: bpy.data.meshes.remove(me); continue
    me.transform(o.matrix_world)
    if o.name in gear_objs:
        me.materials.clear(); me.materials.append(GEAR)
    else:
        for i, m in enumerate(me.materials): me.materials[i] = exp_mat(m)
    ob = bpy.data.objects.new(o.name, me); out.objects.link(ob)
    n_obj += 1; n_tri += sum(len(p.vertices) - 2 for p in me.polygons)
for o in SC.objects: o.select_set(False)
for o in out.objects: o.select_set(True)
path = os.path.join(B, 'Kormoran_roh.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                          export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False, export_extras=False)
open(os.path.join(B, 'kor-export.txt'), 'w', encoding='utf-8').write('Objekte %d · Dreiecke %d · Materialien %d · %s (%.1f MB)\n' % (n_obj, n_tri, len(CACHE) + 1, path, os.path.getsize(path) / 1e6))
