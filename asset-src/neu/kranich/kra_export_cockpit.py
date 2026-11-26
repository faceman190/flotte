# Kranich: Cockpit für die Ich-Sicht vorbereiten:  blender.exe -b Kranich.blend --python kra_export_cockpit.py
# Danach: blender.exe -b CockpitKranich.blend --python ../cockpit/cp_export.py -- Kranich 0.12  → asset-src/glb/deco/KranichCockpit.glb
# Nimmt die Teile aus der Sammlung „Cockpit Kranich“ (kra_cockpit.py, dieselben, die im Schiffsmodell stecken) und legt sie in eine Sammlung
# „Cockpit“ in den Koordinaten, die cp_export.py erwartet (Blender X rechts, Y zur Nase, Z oben, Ursprung = Mitte des Spielmodells aus
# kra-gelenke.json). Dazu kommen für Schatten und geschlossene Hülle: die Außenhaut vor dem Schott als „CP Rumpf innen“, Fensterrahmen und
# Streben als „CP Rahmen“, die Verglasung als „CP Glas“.
import bpy, bmesh, json, os
from mathutils import Matrix, Vector
B = os.path.dirname(bpy.data.filepath)
g = json.load(open(os.path.join(B, 'kra-gelenke.json'))); mx, my, mz = g['mitte']
T = Matrix(((0, -1, 0, my), (1, 0, 0, -mx), (0, 0, 1, -mz), (0, 0, 0, 1)))      # kit → Bau des Cockpit-Exports
for c in bpy.data.collections:
    if c.name == 'Cockpit': c.name = 'Innenraum'
neu = bpy.data.collections.new('Cockpit'); bpy.context.scene.collection.children.link(neu)
def cp_mat(name, col, metal, rough, alpha=1.0):
    m = bpy.data.materials.get('CP ' + name)
    if m: return m
    m = bpy.data.materials.new('CP ' + name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if alpha < 1: b.inputs['Alpha'].default_value = alpha
    m['cp'] = json.dumps({'col': list(col), 'metal': metal, 'rough': rough, 'emit': None, 'es': 0, 'alpha': alpha}); return m
RI, RA, GL = cp_mat('Rumpf innen', (0.012, 0.012, 0.014), 0.2, 0.7), cp_mat('Rahmen', (0.016, 0.017, 0.019), 0.3, 0.4), cp_mat('Glas', (0.5, 0.6, 0.65), 0.0, 0.04, 0.08)
dg = bpy.context.evaluated_depsgraph_get()
def kopie(o, mat=None, xmin=None):
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg), depsgraph=dg); me.transform(T @ o.matrix_world)
    if xmin is not None:      # nur vor dem Schott (Bau-Y = kit-x − mx)
        bm = bmesh.new(); bm.from_mesh(me)
        bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().y < xmin - mx], context='FACES'); bm.to_mesh(me); bm.free()
    if mat is not None: me.materials.clear(); me.materials.append(mat)
    if not me.polygons: bpy.data.meshes.remove(me); return None
    ob = bpy.data.objects.new(o.name + ' cp', me); neu.objects.link(ob); return ob
n = 0
for o in list(bpy.data.collections['Cockpit Kranich'].all_objects):
    if o.type == 'MESH': n += kopie(o) is not None
for o in list(bpy.data.objects):
    if o.type != 'MESH': continue
    if o.name == 'Rumpf': kopie(o, RI, 8.3)
    elif o.name.split('.')[0] in ('Fensterrahmen', 'Fensterdichtung', 'Mittelpfosten', 'Seitenpfosten', 'Querspant'): kopie(o, RA)
    elif o.name.split('.')[0] == 'Kanzelglas': kopie(o, GL)
for c in list(bpy.context.scene.collection.children):
    if c != neu:
        for o in list(c.all_objects):
            if o is not None: o.hide_render = True
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'CockpitKranich.blend'))
json.dump({'schiff': 'Kranich', 'laenge': g['laenge'], 'auge': g['auge'], 'griff_l': g['griffe'][0], 'griff_r': g['griffe'][1]}, open(os.path.join(B, 'cp-kranich.json'), 'w'), indent=1)
print('COCKPIT', n, 'Teile')
