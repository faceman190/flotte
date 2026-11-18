# Wisent fürs Spiel exportieren: blender.exe -b Wisent.blend --python wis_export.py
# Volles Modell mit Brücke, Gang und Laderaum (begehbar wie der Kormoran). Zwei Dateien:
#   Wisent_roh.glb       Bild 1, Heckklappe zu. Bewegliche Teile behalten eigene Materialien mit der Endung „ |tor“, „ |rampe“,
#                        „ |rampe2“ … „ |rampe4“; das Spiel hängt sie an Gelenke (src/models/gltfShips.ts DOORS.Wisent).
#   Wisent_offen_roh.glb Bild RAMP_F, Heckklappe offen: nur für die Laufkarte (scripts/build-walkmap.mjs), damit die Rampe begehbar ist.
# Plattenmaterialien (Rumpf, Flügel, Gondeln, Innenhaut der Brücke und des Laderaums, Böden) werden zu ext_pan_*: Das Spiel rechnet Fugen,
# Nieten und Schmutz im Shader aus der UV „Platten“ (Meter). Das Spiel kennt ein Plattenmaß (1,6 × 0,9 m); die UV wird je Material so
# gestreckt, dass die Platten so groß werden wie in Blender. Ohne UV (einfache Quader) gibt es das schlichte Material.
# Fahrwerk: Material „gear“ (im Flug ausgeblendet). Ohne Bühnen, Lichter, Schraubeninstanzen und durchscheinende Spuren.
import bpy, json, os
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene
SKIP_COLL = {'Studio grau', 'Hangar', 'Kameras', 'Lichter', 'Rampe offen'}
SKIP_MAT = {'Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb'}
GLASS = {'Sichtbandglas', 'Schauglas', 'Kanzelglas'}
PAN = {  # Blender-Material → (Spielname, Plattenmaß in Blender in Metern)
    'Rumpf Graphit': ('ext_pan_graphit', 3.4), 'Rumpf Mittelgrau': ('ext_pan_grau', 3.0), 'Rumpf Signalrot': ('ext_pan_rot', 3.0),
    'Rumpf Schwarz': ('ext_pan_schwarz', 2.4), 'Rumpf Hellgrau': ('ext_pan_hell', 3.0), 'Innen Weiss': ('ext_pan_innen', 1.25),
    'Brueckenboden': ('ext_pan_boden', 0.9)}
TAGS = ['tor', 'rampe', 'rampe2', 'rampe3', 'rampe4']
JOINT = {'Tor Gelenk': 'tor', 'Rampe Gelenk': 'rampe', 'Auszug 1 Gelenk': 'rampe2', 'Auszug 2 Gelenk': 'rampe3', 'Auszug 3 Gelenk': 'rampe4'}
def tag_of(o):
    p = o.parent
    while p:
        if p.name in JOINT: return JOINT[p.name]
        p = p.parent
    return ''
CACHE = {}
def exp_mat(m, tag='', has_uv=True):
    if m is None: return None
    pan = PAN.get(m.name) if has_uv else None
    key = (m.name, tag, bool(pan))
    if key in CACHE: return CACHE[key]
    bk = json.loads(m['bk']) if 'bk' in m.keys() else {}
    if bk.get('stripes'): col = [(a + c) / 2 for a, c in zip(bk['a'], bk['c'])]
    else: col = bk.get('col') or [0.05, 0.06, 0.1]
    metal, rough = float(bk.get('metal', 0.3)), float(bk.get('rough', 0.5))
    emit, es = bk.get('emit'), float(bk.get('es', 0.0))
    if bk.get('stripes') and es: emit = col
    name = (pan[0] if pan else m.name + ' (Spiel)') + (' |' + tag if tag else '')
    e = bpy.data.materials.new(name); e.use_nodes = True
    if tag: rough = min(1.0, rough + 0.0013 * (1 + TAGS.index(tag)))      # nicht mit gleichen Materialien zusammenlegen
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit and es:
        b.inputs['Emission Color'].default_value = (*emit[:3], 1); b.inputs['Emission Strength'].default_value = min(3.0, es * 0.3)
    if m.name in GLASS:
        b.inputs['Base Color'].default_value = (0.2, 0.24, 0.27, 1); b.inputs['Alpha'].default_value = 0.2; b.inputs['Roughness'].default_value = 0.04; b.inputs['Metallic'].default_value = 0.0
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(e, k, v)
            except Exception: pass
    CACHE[key] = e; return e
GEAR = bpy.data.materials.new('gear'); GEAR.use_nodes = True
_b = next(n for n in GEAR.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); _b.inputs['Base Color'].default_value = (0.06, 0.062, 0.066, 1); _b.inputs['Metallic'].default_value = 0.85; _b.inputs['Roughness'].default_value = 0.43
def in_coll(o, names): return any(c.name in names for c in o.users_collection)
gear_objs = set(o.name for o in bpy.data.collections['Fahrwerk'].all_objects)
REP = {}
def export(frame, path, tagged):
    SC.frame_set(frame); bpy.context.view_layer.update()
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
        tag = tag_of(o) if tagged else ''
        if o.name in gear_objs:
            me.materials.clear(); me.materials.append(GEAR)
        else:
            has_uv = 'Platten' in me.uv_layers
            src = list(me.materials)
            for i, m in enumerate(src): me.materials[i] = exp_mat(m, tag, has_uv)
            if has_uv:      # UV je Material auf das Plattenmaß des Spiels strecken, nur die UV „Platten“ behalten
                uvl = me.uv_layers['Platten']
                for p in me.polygons:
                    m = src[p.material_index] if p.material_index < len(src) else None
                    if m is None or m.name not in PAN: continue
                    f = 1.6 / PAN[m.name][1]
                    for li in p.loop_indices: u, v = uvl.data[li].uv; uvl.data[li].uv = (u * f, v * f)
                for l in [l for l in me.uv_layers if l.name != 'Platten']: me.uv_layers.remove(l)
        ob = bpy.data.objects.new(o.name, me); out.objects.link(ob)
        n_obj += 1; n_tri += sum(len(p.vertices) - 2 for p in me.polygons)
    if not tagged:      # nur Laufkarte: glatte Lauffläche über der offenen Rampe (die Kanten zwischen den Auszügen unterbrechen sonst die Laufkarte) und Schwelle über dem Spalt am Scharnier
        import bmesh
        from mathutils import Vector
        rg = bpy.data.objects['Rampe Gelenk']; mw = rg.matrix_world; W = 3.7; L = 0.15 + 2.75 + 3 * 2.6
        bm = bmesh.new(); vs = [bm.verts.new(mw @ Vector(p)) for p in ((0.37, -W, -0.1), (0.37, W, -0.1), (0.37, W, L), (0.37, -W, L))]; bm.faces.new(vs)
        for p in ((-40.12, -W, 6.45), (-39.5, -W, 6.45), (-39.5, W, 6.45), (-40.12, W, 6.45)): pass
        q = [bm.verts.new(Vector(p)) for p in ((-40.12, -W, 6.56), (-39.45, -W, 6.56), (-39.45, W, 6.56), (-40.12, W, 6.56))]; bm.faces.new(q)
        me = bpy.data.meshes.new('Laufhilfe Rampe'); bm.to_mesh(me); bm.free(); me.materials.append(GEAR)
        ob = bpy.data.objects.new('Laufhilfe Rampe', me); out.objects.link(ob)
    for o in SC.objects: o.select_set(False)
    for o in out.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True,
                              export_materials='EXPORT', export_cameras=False, export_lights=False, export_animations=False, export_extras=False)
    for o in list(out.objects): bpy.data.objects.remove(o, do_unlink=True)
    bpy.data.collections.remove(out)
    REP[os.path.basename(path)] = dict(objekte=n_obj, dreiecke=n_tri, mb=round(os.path.getsize(path) / 1e6, 1), min=[round(v, 3) for v in lo], max=[round(v, 3) for v in hi])
RF = SC.frame_end
export(1, os.path.join(B, 'Wisent_roh.glb'), True)
export(RF, os.path.join(B, 'Wisent_offen_roh.glb'), False)
SC.frame_set(1)
open(os.path.join(B, 'wis-export.txt'), 'w', encoding='utf-8').write(json.dumps(REP, ensure_ascii=False, indent=1) + '\n')
