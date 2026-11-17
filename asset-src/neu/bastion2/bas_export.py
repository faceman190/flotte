# Bastion 2 fürs Spiel exportieren: blender.exe -b Bastion2.blend --python bas_export.py
# Ohne Bühne (Kameras, Planet, Lichter), ohne Vergleichsschiffe und ohne die versteckten Schnittkörper. Die Fasen (Bevel) bleiben aus,
# die Boolean-Schnitte der Hangars bleiben drin. Jedes Material wird ein schlichtes PBR-Material aus seinen Angaben (m['bk']);
# Leuchtendes bekommt die Namen, die src/models/stationModels.ts (buildCarrierModel) kennt: bastion_windows, bastion_lamps,
# bastion_engine_glow, bastion_hangar_field. Ausgabe: Bastion2_roh.glb hier (glTF mit Y oben: Spiel = (x, z, −y) aus Blender),
# danach scripts/simplify-hard.mjs → asset-src/glb/station/Carrier.glb.
import bpy, json, os
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
SKIP_COLL = {'Kameras', 'Vergleichsschiffe'}
GLOW = {  # Quellmaterial → (Spielname, Farbe, Leuchtstärke)
    'Fenster hell': ('bastion_windows', (1.0, 0.78, 0.5), 1.0), 'Fenster kalt': ('bastion_windows', (0.75, 0.9, 1.0), 1.0),
    'Brueckenglas': ('bastion_windows', (0.45, 0.75, 0.85), 1.0),
    'Lampe Ocker': ('bastion_lamps', (1.0, 0.62, 0.2), 1.0), 'Lampe Weiss': ('bastion_lamps', (1.0, 0.97, 0.92), 1.0),
    'Positionslicht rot': ('bastion_lamps', (1.0, 0.08, 0.04), 1.0), 'Positionslicht gruen': ('bastion_lamps', (0.1, 1.0, 0.35), 1.0),
    'Hangarlicht': ('bastion_lamps', (0.9, 0.95, 1.0), 1.0),
    'Triebwerksglut': ('bastion_engine_glow', (1.0, 0.55, 0.25), 1.0), 'Triebwerkskern': ('bastion_engine_glow', (0.85, 0.9, 1.0), 1.0),
}
CACHE = {}
def exp_mat(m):
    if m is None: return None
    if m.name in CACHE: return CACHE[m.name]
    e = bpy.data.materials.new('x'); e.use_nodes = True; b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    if m.name in GLOW:
        nm, col, es = GLOW[m.name]; e.name = nm
        b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = es
        b.inputs['Roughness'].default_value = 0.4; b.inputs['Metallic'].default_value = 0.0
    elif m.name == 'Hangarfeld':
        e.name = 'bastion_hangar_field'; b.inputs['Base Color'].default_value = (0.2, 0.7, 0.8, 1); b.inputs['Emission Color'].default_value = (0.15, 0.6, 0.75, 1)
        b.inputs['Emission Strength'].default_value = 1.0; b.inputs['Alpha'].default_value = 0.15
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(e, k, v)
            except Exception: pass
    else:
        bk = json.loads(m['bk']) if 'bk' in m.keys() else {}
        if bk.get('stripes'): col = [(a + c) / 2 for a, c in zip(bk['a'], bk['c'])]
        else: col = bk.get('col') or [0.07, 0.072, 0.077]
        e.name = 'bastion ' + m.name
        # im Spiel heller als im Cycles-Bild (ohne Umgebungslicht wirkte der Rumpf fast schwarz)
        k = 1.9 if m.name.startswith(('Rumpf', 'Flugdeck')) else 1.5 if m.name.startswith(('Panzer', 'Gussmetall', 'Duesen')) else 1.0
        col = [min(1.0, c * k) for c in col[:3]]
        b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = float(bk.get('metal', 0.4)); b.inputs['Roughness'].default_value = float(bk.get('rough', 0.5))
    CACHE[m.name] = e; return e
def in_coll(o, names): return any(c.name in names for c in o.users_collection)
# Fasen aus (spart viele Dreiecke; die Fugen bleiben als Geometrie)
for o in bpy.data.objects:
    for md in getattr(o, 'modifiers', []):
        if md.type == 'BEVEL': md.show_viewport = False; md.show_render = False
bpy.context.view_layer.update()
out = bpy.data.collections.new('Export'); SC.collection.children.link(out)
dg = bpy.context.evaluated_depsgraph_get(); n_obj = n_tri = 0
for o in list(bpy.data.objects):
    if o.type not in ('MESH', 'CURVE', 'FONT') or in_coll(o, SKIP_COLL) or o.hide_render or o.name.startswith('Planet'): continue
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
    if not me.polygons: bpy.data.meshes.remove(me); continue
    me.transform(o.matrix_world)
    for i, m in enumerate(me.materials): me.materials[i] = exp_mat(m)
    ob = bpy.data.objects.new(o.name, me); out.objects.link(ob)
    n_obj += 1; n_tri += sum(len(p.vertices) - 2 for p in me.polygons)
for o in SC.objects: o.select_set(False)
for o in out.objects: o.select_set(True)
path = os.path.join(B, 'Bastion2_roh.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                          export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False, export_extras=False)
open(os.path.join(B, 'bas-export.txt'), 'w', encoding='utf-8').write('Objekte %d · Dreiecke %d · Materialien %d · %s (%.1f MB)\n' % (n_obj, n_tri, len(CACHE), path, os.path.getsize(path) / 1e6))
