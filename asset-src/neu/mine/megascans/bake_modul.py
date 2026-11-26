# Ein Modul des Minen-Baukastens bauen: FBX importieren, ausrichten, Ursprung unten Mitte, Decimate auf das Dreiecksziel (UVs bleiben),
# Normalen vom Hochpoly (mit dessen Original-Normalmap) auf das Low-Poly backen (Cycles GPU), Farbe/AO/Rauheit verkleinert übernehmen,
# orm packen (R=AO, G=Rauheit, B=Metall). Ergebnis: work\<modul>.blend (Objekt <modul>, Material ms_<modul>) und out\tex\<modul>_col/_nrm/_orm.png.
# Aufruf: blender -b --factory-startup -P bake_modul.py -- <modul> [<modul> ...]
import bpy, bmesh, sys, os, math, time, glob, json
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from defs import *

os.makedirs(WORK, exist_ok=True); os.makedirs(TEX, exist_ok=True)

def gpu():
    p = bpy.context.preferences.addons['cycles'].preferences
    p.compute_device_type = 'OPTIX'; p.get_devices()
    for d in p.devices: d.use = d.type == 'OPTIX'
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'GPU'; sc.cycles.samples = 1

def tex_file(folder, *keys):
    for k in keys:
        g = [f for f in glob.glob(os.path.join(folder, '*.jpg')) if os.path.basename(f).lower().endswith('_' + k.lower() + '.jpg')]
        if g: return sorted(g)[0]
    return None

def load_scaled(path, size, noncolor):
    im = bpy.data.images.load(path, check_existing=False)
    im.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
    if im.size[0] != size: im.scale(size, size)
    a = np.empty(size * size * 4, np.float32); im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(size, size, 4)

def save_px(arr, path, noncolor):
    s = arr.shape[0]
    im = bpy.data.images.new(os.path.basename(path), s, s, alpha=arr.shape[2] == 4 and noncolor is None)
    im.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
    im.pixels.foreach_set(arr.ravel()); im.filepath_raw = path; im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)

def select_only(objs, active):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = active

def tri_count(o):
    o.data.calc_loop_triangles(); return len(o.data.loop_triangles)

def build(m):
    t0 = time.time()
    bpy.ops.wm.read_factory_settings(use_empty=True); gpu()
    folder = os.path.join(RAW, m['src'])
    for f in sorted(glob.glob(os.path.join(folder, '*.fbx'))): bpy.ops.import_scene.fbx(filepath=f)
    objs = sorted([o for o in bpy.data.objects if o.type == 'MESH'], key=lambda o: o.name)
    for o in objs:                      # Eltern-Leerobjekte (manche FBX tragen dort die Skalierung 0,01) vorher auflösen
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for o in [o for o in bpy.data.objects if o.type != 'MESH']: bpy.data.objects.remove(o)
    if m['var'] is not None:
        keep = objs[m['var']]
        for o in objs:
            if o is not keep: bpy.data.objects.remove(o)
        objs = [keep]
    select_only(objs, objs[0])
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(objs) > 1: bpy.ops.object.join()
    hi = bpy.context.view_layer.objects.active; hi.name = m['name'] + '_hi'
    me = hi.data
    # Ausrichtung und Maße
    if m['rotz']: me.transform(Matrix.Rotation(math.radians(m['rotz']), 4, 'Z'))
    if m['scale']: me.transform(Matrix.Scale(m['scale'], 4))
    co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co); co = co.reshape(-1, 3)
    lo, hi_ = co.min(0), co.max(0)
    if m['size']:
        s = [m['size'][k] / (hi_[k] - lo[k]) if m['size'][k] else 1.0 for k in range(3)]
        me.transform(Matrix.Diagonal((s[0], s[1], s[2], 1)))
        co = co * np.array(s, np.float32); lo, hi_ = co.min(0), co.max(0)
    me.transform(Matrix.Translation(Vector((-(lo[0] + hi_[0]) / 2, -(lo[1] + hi_[1]) / 2, -lo[2]))))
    me.update()
    tris_hi = tri_count(hi)
    # Hochpoly-Material: Original-Normalmap
    mat_hi = bpy.data.materials.new('hi'); mat_hi.use_nodes = True; nt = mat_hi.node_tree
    bsdf = nt.nodes['Principled BSDF']
    pn = tex_file(folder, 'Normal')
    if pn:
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = bpy.data.images.load(pn); tn.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    me.materials.clear(); me.materials.append(mat_hi)
    # Low-Poly: Kopie + Decimate (Collapse), UVs bleiben erhalten
    low = hi.copy(); low.data = hi.data.copy(); low.name = m['name']; bpy.context.scene.collection.objects.link(low)
    ratio = min(1.0, m['tris'] / max(1, tris_hi))
    if ratio < 0.999:
        md = low.modifiers.new('dec', 'DECIMATE'); md.decimate_type = 'COLLAPSE'; md.ratio = ratio; md.use_collapse_triangulate = True
        select_only([low], low); bpy.ops.object.modifier_apply(modifier='dec')
    low.data.name = m['name']
    # glatte Schattierung wie im Scan (Megascans: weich), Normalen neu
    for p in low.data.polygons: p.use_smooth = True
    tris_lo = tri_count(low)
    # Low-Material mit Bildern
    mat = bpy.data.materials.new('ms_' + m['name']); mat.use_nodes = True; nt = mat.node_tree; b = nt.nodes['Principled BSDF']
    low.data.materials.clear(); low.data.materials.append(mat)
    nrm_path = os.path.join(TEX, m['name'] + '_nrm.png')
    img_n = bpy.data.images.new(m['name'] + '_nrm', m['nrm'], m['nrm'], alpha=False); img_n.colorspace_settings.name = 'Non-Color'
    tnb = nt.nodes.new('ShaderNodeTexImage'); tnb.image = img_n; nt.nodes.active = tnb
    # Backen
    dims = Vector(low.dimensions); ext = min(0.05, max(0.004, max(dims) * 0.006))
    select_only([hi, low], low)
    sc = bpy.context.scene; sc.render.bake.margin = 16; sc.render.bake.margin_type = 'EXTEND'
    bpy.ops.object.bake(type='NORMAL', use_selected_to_active=True, cage_extrusion=ext, max_ray_distance=ext * 2.5,
                        normal_space='TANGENT', margin=16)
    img_n.filepath_raw = nrm_path; img_n.file_format = 'PNG'; img_n.save()
    t_bake = time.time() - t0
    # Farbe
    pc = tex_file(folder, 'BaseColor', 'Basecolor', 'Albedo')
    col = load_scaled(pc, m['col'], False); col[:, :, 3] = 1.0
    save_px(col, os.path.join(TEX, m['name'] + '_col.png'), False)
    # orm
    s = m['orm']; orm = np.ones((s, s, 4), np.float32)
    pa = tex_file(folder, 'AO'); pr = tex_file(folder, 'Roughness'); pg = tex_file(folder, 'Gloss')
    orm[:, :, 0] = load_scaled(pa, s, True)[:, :, 0] if pa else 1.0
    if pr: orm[:, :, 1] = load_scaled(pr, s, True)[:, :, 0]
    elif pg: orm[:, :, 1] = 1.0 - load_scaled(pg, s, True)[:, :, 0]
    else: orm[:, :, 1] = 0.8
    orm[:, :, 2] = m['metal']
    save_px(orm, os.path.join(TEX, m['name'] + '_orm.png'), True)
    # Material verdrahten (glTF-tauglich: col → Base Color, orm → Separate RGB → Rauheit/Metall, AO über glTF-Settings-Gruppe nicht nötig:
    # der Exporter erkennt ORM, wenn Rauheit und Metall aus demselben Bild kommen; AO aus R schreibt er als occlusion, wenn das Bild gleich ist)
    nt.nodes.remove(tnb)
    build_material(mat, m['name'])
    bpy.data.objects.remove(hi); bpy.data.meshes.remove(bpy.data.meshes[me.name]) if me.name in bpy.data.meshes else None
    low['src'] = m['src']; low['tris_hi'] = tris_hi; low['note'] = m['note']
    for im in list(bpy.data.images):
        if im.users == 0: bpy.data.images.remove(im)
    out = os.path.join(WORK, m['name'] + '.blend')
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    print(f'FERTIG {m["name"]}: hi={tris_hi} lo={tris_lo} ext={ext:.4f} bake={t_bake:.0f}s gesamt={time.time() - t0:.0f}s', flush=True)

def build_material(mat, name):
    """Material wie es der glTF-Exporter versteht: Basisfarbe, Normalmap, ORM (AO über die glTF-Material-Output-Gruppe)."""
    nt = mat.node_tree
    for n in list(nt.nodes):
        if n.type not in ('BSDF_PRINCIPLED', 'OUTPUT_MATERIAL'): nt.nodes.remove(n)
    b = nt.nodes['Principled BSDF']
    def img(kind, noncolor):
        p = os.path.join(TEX, f'{name}_{kind}.png')
        im = bpy.data.images.load(p, check_existing=True); im.colorspace_settings.name = 'Non-Color' if noncolor else 'sRGB'
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; return t
    tc = img('col', False); nt.links.new(tc.outputs['Color'], b.inputs['Base Color'])
    tn = img('nrm', True); nm = nt.nodes.new('ShaderNodeNormalMap'); nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    to = img('orm', True); sp = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(to.outputs['Color'], sp.inputs['Color'])
    nt.links.new(sp.outputs['Green'], b.inputs['Roughness']); nt.links.new(sp.outputs['Blue'], b.inputs['Metallic'])
    # Umgebungsverdeckung für glTF: Knotengruppe "glTF Material Output" mit Eingang Occlusion
    g = bpy.data.node_groups.get('glTF Material Output')
    if not g:
        g = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        g.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    gn = nt.nodes.new('ShaderNodeGroup'); gn.node_tree = g
    nt.links.new(sp.outputs['Red'], gn.inputs['Occlusion'])

if __name__ == '__main__':
    names = sys.argv[sys.argv.index('--') + 1:]
    for n in names:
        try:
            build(BYNAME[n])
        except Exception as e:
            import traceback; traceback.print_exc(); print('FEHLER', n, repr(e), flush=True)
