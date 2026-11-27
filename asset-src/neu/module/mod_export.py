# Schiffsmodule fürs Spiel exportieren: blender.exe -b Module.blend --python mod_export.py
# Je Modul ein Netz mit dem Namen seiner Kennung (sw_gauss, sy_kuehler, …), Ursprung im Anker des Modulplatzes. Materialien aus den Angaben des
# Baukastens (m['bk']): Farbe, Metall, Rauheit, Leuchten. Ausgabe Module_roh.glb; scripts/pack-module.mjs macht daraus
# asset-src/glb/lazy/Schiffsmodule.glb (verschweißt, komprimiert). Im Spiel: src/game/modulplatz.ts.
import bpy, json, os
from mathutils import Matrix
B = os.path.dirname(bpy.data.filepath); SC = bpy.context.scene; CACHE = {}
def exp_mat(m):
    if m is None: return None
    if m.name in CACHE: return CACHE[m.name]
    d = json.loads(m['bk']) if 'bk' in m.keys() else {}
    col = d.get('col') or [0.05, 0.06, 0.1]; emit, es = d.get('emit'), float(d.get('es', 0.0) or 0.0)
    e = bpy.data.materials.new('MOD ' + m.name); e.use_nodes = True
    b = next(n for n in e.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col[:3], 1); b.inputs['Metallic'].default_value = float(d.get('metal', 0.3)); b.inputs['Roughness'].default_value = float(d.get('rough', 0.5))
    if emit and es: b.inputs['Emission Color'].default_value = (*emit[:3], 1); b.inputs['Emission Strength'].default_value = min(3.0, es * 0.35)
    CACHE[m.name] = e; return e
out = bpy.data.collections.new('Export'); SC.collection.children.link(out)
dg = bpy.context.evaluated_depsgraph_get(); rep = {}
for e in [o for o in bpy.data.objects if 'modul' in o.keys()]:
    inv = e.matrix_world.inverted(); teile = []
    for o in e.children_recursive:
        if o.type not in ('MESH', 'CURVE', 'FONT'): continue
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg)
        if not me.polygons: bpy.data.meshes.remove(me); continue
        me.transform(inv @ o.matrix_world)
        for i, m in enumerate(list(me.materials)): me.materials[i] = exp_mat(m)
        for l in list(me.uv_layers): me.uv_layers.remove(l)
        ob = bpy.data.objects.new('t', me); out.objects.link(ob); teile.append(ob)
    for o in SC.objects: o.select_set(False)
    for o in teile: o.select_set(True)
    bpy.context.view_layer.objects.active = teile[0]; bpy.ops.object.join()
    k = e['modul']; e.name = 'Teilegruppe ' + k      # der Name der Kennung gehört dem exportierten Netz (sonst hieße es „….001“)
    j = bpy.context.view_layer.objects.active; j.name = k; j.data.name = k
    rep[e['modul']] = sum(len(p.vertices) - 2 for p in j.data.polygons)
for o in SC.objects: o.select_set(False)
for o in out.objects: o.select_set(True)
path = os.path.join(B, 'Module_roh.glb')
bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=False, export_yup=True, export_materials='EXPORT',
                          export_cameras=False, export_lights=False, export_animations=False, export_extras=False, export_texcoords=False)
open(os.path.join(B, 'mod-export.txt'), 'w', encoding='utf-8').write(json.dumps(rep, indent=1) + '\n%d Module, %d Dreiecke, %.1f MB\n' % (len(rep), sum(rep.values()), os.path.getsize(path) / 1e6))
