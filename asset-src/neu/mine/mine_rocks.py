# Felsen für die Minen: zehn Felsen aus CliffRocks01.blend (asset-src/neu/CliffRocks01.blend) in eine GLB-Datei.
# Je Fels die passende Detailstufe, Ursprung in der Mitte, Material ext_fels (Bilder liegen in asset-src/tex/fels_*, scripts/make-rock-textures.mjs).
# Im Spiel baut src/game/dungeon.ts daraus Wände, Decke und Geröll (InstancedMesh). Aufruf in Mine.blend: exec(...); build(); export().
import bpy, os, json
from mathutils import Vector

ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
SRC = os.path.join(ROOT, 'asset-src', 'neu', 'CliffRocks01.blend')
# Name im Spiel: Quelle. Die gröbste Stufe reicht fast überall (die Felsen stecken halb im Gestein, das Relief kommt aus der Normalenkarte); nur der kleine F02 (Geröll) behält die mittlere.
PICK = {'F01': 'R001_LOD2', 'F02': 'R002_LOD1', 'F03': 'R003_LOD2', 'F04': 'R004_LOD2', 'F05': 'R005_LOD2',
        'F06': 'R006_LOD2', 'F07': 'R007_LOD2', 'F08': 'R008_LOD2', 'F09': 'R009_LOD2', 'F10': 'R010_LOD2'}

def material():
    m = bpy.data.materials.get('ext_fels') or bpy.data.materials.new('ext_fels')
    m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bs.outputs[0], out.inputs[0])
    img = os.path.join(ROOT, 'asset-src', 'tex', 'fels_col@2048.png')
    if os.path.exists(img):
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(img, check_existing=True); nt.links.new(t.outputs[0], bs.inputs['Base Color'])
    bs.inputs['Roughness'].default_value = 0.9
    return m

def build():
    names = list(PICK.values())
    have = {o.name for o in bpy.data.objects}
    need = [n for n in names if n not in have]
    if need:
        with bpy.data.libraries.load(SRC, link=False) as (src, dst):
            dst.objects = [n for n in src.objects if n in need]
    col = bpy.data.collections.get('mine_felsen') or bpy.data.collections.new('mine_felsen')
    if col.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(col)
    for o in list(col.objects): bpy.data.objects.remove(o, do_unlink=True)
    m = material(); info = {}
    for i, (name, srcn) in enumerate(PICK.items()):
        s = bpy.data.objects[srcn]
        me = s.data.copy(); me.name = name
        # Mitte des Umrisses in den Ursprung
        lo = Vector((min(v.co[k] for v in me.vertices) for k in range(3))); hi = Vector((max(v.co[k] for v in me.vertices) for k in range(3)))
        c = (lo + hi) / 2
        for v in me.vertices: v.co -= c
        me.materials.clear(); me.materials.append(m)
        for p in me.polygons: p.use_smooth = True
        ob = bpy.data.objects.new(name, me); col.objects.link(ob)
        ob.location = ((i % 5) * 9.0, (i // 5) * 10.0, 0)          # nur zum Ansehen in Blender; der Export setzt sie zurück
        d = hi - lo
        info[name] = {'w': round(d.x, 3), 'd': round(d.y, 3), 'h': round(d.z, 3), 'tris': sum(len(p.vertices) - 2 for p in me.polygons)}
    return info

def export():
    col = bpy.data.collections['mine_felsen']; col.hide_viewport = False; obs = list(col.objects)      # ausgeblendete Sammlungen exportiert Blender nicht
    keep = {o.name: o.location.copy() for o in obs}
    for o in obs: o.location = (0, 0, 0)
    sc = bpy.context.scene
    for q in sc.objects: q.select_set(False)
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    path = os.path.join(ROOT, 'asset-src', 'glb', 'station', 'Mine_Felsen.glb')
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_apply=True, export_yup=True, export_texcoords=True,
                              export_normals=True, export_tangents=False, export_image_format='NONE', export_materials='EXPORT')
    for o in obs: o.location = keep[o.name]
    return {'kb': round(os.path.getsize(path) / 1024)}
