# Baukasten zusammensetzen: alle gebackenen Module aus work\*.blend holen, Türstock bauen, Flächen- und Decal-Platten anlegen,
# MinenBaukasten.blend speichern, je Datei ein GLB exportieren (WEBP 90) und out\kit.json schreiben.
# Aufruf: blender -b --factory-startup -P assemble.py [-- noexport]
import bpy, sys, os, json, math, glob
import numpy as np
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from defs import *
from bake_modul import load_scaled, save_px, tex_file, build_material

FILES = ['MineAlt_Gang', 'MineAlt_Boegen', 'MineAlt_Ausbau', 'MineAlt_Loren', 'MineAlt_Boden', 'MineAlt_Kram', 'MineAlt_Flaechen']
argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
COLL = {}
for f in FILES:
    c = bpy.data.collections.new(f); sc.collection.children.link(c); COLL[f] = c

def append(name):
    with bpy.data.libraries.load(os.path.join(WORK, name + '.blend'), link=False) as (src, dst):
        dst.objects = [name]
    o = dst.objects[0]
    return o

INFO = {}
for m in MODULES:
    p = os.path.join(WORK, m['name'] + '.blend')
    if not os.path.exists(p): print('FEHLT', m['name']); continue
    o = append(m['name']); COLL[m['file']].objects.link(o)
    INFO[m['name']] = dict(file=m['file'], src=m['src'], tex=dict(col=m['col'], nrm=m['nrm'], orm=m['orm']), note=m['note'])

# Bilder sauber benennen (für den Export) und Pfade absolut machen
for im in bpy.data.images:
    if im.filepath: im.filepath = bpy.path.abspath(im.filepath)

# ---------- Türstock: zwei Stempel (2,45 m), Kappe quer darüber, Keile dazwischen; lichte Weite 2,6 m ----------
def dup(name, newname):
    s = bpy.data.objects[name]; o = s.copy(); o.data = s.data.copy(); o.name = newname
    COLL['MineAlt_Ausbau'].objects.link(o); return o

if all(n in bpy.data.objects for n in ('stempel_1', 'stempel_2', 'kappe', 'keil_1', 'keil_2')):
    parts = []
    H = 2.45; LW = 2.6
    for k, (n, s) in enumerate((('stempel_1', -1), ('stempel_2', 1))):
        o = dup(n, f'_ts_{n}'); d = o.dimensions
        o.data.transform(Matrix.Diagonal((1, 1, H / d.z, 1)))
        o.location = (0, s * (LW / 2 + d.y / 2), 0); parts.append(o)
    kw = 0.05                                     # Keil-Dicke
    for k, (n, s) in enumerate((('keil_1', -1), ('keil_2', 1))):
        o = dup(n, f'_ts_{n}'); d = o.dimensions   # Keil liegt entlang Y (0,8 m) → auf 0,32 m kürzen, quer zur Kappe (entlang X) legen
        o.data.transform(Matrix.Diagonal((1, 0.32 / d.y, kw / d.z, 1)))
        o.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
        o.location = (0, s * (LW / 2 + 0.1), H); parts.append(o)
    o = dup('kappe', '_ts_kappe'); d = o.dimensions   # Kappe entlang X (1,99 m) → quer (Y), auf 3,2 m strecken
    o.data.transform(Matrix.Diagonal((3.2 / d.x, 1, 1, 1)))
    o.data.transform(Matrix.Rotation(math.radians(90), 4, 'Z'))
    o.location = (0, 0, H + kw); parts.append(o)
    bpy.ops.object.select_all(action='DESELECT')
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join(); ts = bpy.context.view_layer.objects.active; ts.name = 'tuerstock'; ts.data.name = 'tuerstock'
    INFO['tuerstock'] = dict(file='MineAlt_Ausbau', src='tgmrafyfa+tgmsdc0fa+udrffjjqx+ricaS', tex=dict(col=2048, nrm=2048, orm=1024),
                             note='Stempel 2,45 m, lichte Weite 2,6 m, Kappe (auf 3,2 m gestreckt) quer entlang Y, Keile 5 cm; Gesamthöhe ~2,68 m; Materialien der Einzelteile')

# ---------- Flächen und Decals (2 × 2 m, liegen in XY, Ursprung Mitte) ----------
def plane(name, coll):
    me = bpy.data.meshes.new(name)
    me.from_pydata([(-1, -1, 0), (1, -1, 0), (1, 1, 0), (-1, 1, 0)], [], [(0, 1, 2, 3)])
    uv = me.uv_layers.new(name='UVMap')
    for i, l in enumerate(me.loops): uv.data[i].uv = [(0, 0), (1, 0), (1, 1), (0, 1)][l.vertex_index]
    o = bpy.data.objects.new(name, me); coll.objects.link(o); return o

S = 2048
for sid in SURFACES + DECALS:
    folder = os.path.join(RAW, sid); dec = sid in DECALS
    name = ('decal_' if dec else 'flaeche_') + sid
    if not os.path.exists(os.path.join(TEX, name + '_col.png')):
        col = load_scaled(tex_file(folder, 'Albedo', 'BaseColor'), S, False)
        if dec: col[:, :, 3] = load_scaled(tex_file(folder, 'Opacity'), S, True)[:, :, 0]
        else: col[:, :, 3] = 1.0
        save_px(col, os.path.join(TEX, name + '_col.png'), None if dec else False)
        nrm = load_scaled(tex_file(folder, 'Normal'), S, True); nrm[:, :, 3] = 1
        save_px(nrm, os.path.join(TEX, name + '_nrm.png'), True)
        orm = np.ones((S, S, 4), np.float32)
        pa, pr, pg = tex_file(folder, 'AO'), tex_file(folder, 'Roughness'), tex_file(folder, 'Gloss')
        orm[:, :, 0] = load_scaled(pa, S, True)[:, :, 0] if pa else 1
        orm[:, :, 1] = load_scaled(pr, S, True)[:, :, 0] if pr else (1 - load_scaled(pg, S, True)[:, :, 0] if pg else 0.8)
        orm[:, :, 2] = 0
        save_px(orm, os.path.join(TEX, name + '_orm.png'), True)
    o = plane(name, COLL['MineAlt_Flaechen'])
    mat = bpy.data.materials.new('ms_' + sid); o.data.materials.append(mat)
    build_material(mat, name)
    if dec:
        nt = mat.node_tree; t = [n for n in nt.nodes if n.type == 'TEX_IMAGE' and n.image.name.endswith('_col.png')][0]
        nt.links.new(t.outputs['Alpha'], nt.nodes['Principled BSDF'].inputs['Alpha'])
        mat.surface_render_method = 'BLENDED'
    INFO[name] = dict(file='MineAlt_Flaechen', src=sid, tex=dict(col=S, nrm=S, orm=S),
                      note='Decal: Alpha in col, Alpha-Blend' if dec else 'kachelbar, 2 × 2 m je UV-Kachel (Megascans-üblich, nicht bestätigt)')

# ---------- Kennzahlen ----------
def world_co(o):
    me = o.data; co = np.empty(len(me.vertices) * 3, np.float32); me.vertices.foreach_get('co', co)
    co = co.reshape(-1, 3); M_ = np.array(o.matrix_world)
    return co @ M_[:3, :3].T + M_[:3, 3]

def clusters(vals, gap):
    vals = np.sort(vals); out = []; start = 0
    for i in range(1, len(vals) + 1):
        if i == len(vals) or vals[i] - vals[i - 1] > gap:
            if i - start > 20: out.append(float(vals[start:i].mean()))
            start = i
    return out

for n, info in INFO.items():
    o = bpy.data.objects[n]; co = world_co(o)
    lo, hi = co.min(0), co.max(0)
    o.data.calc_loop_triangles()
    info.update(name=n, bbox_min=[round(float(v), 3) for v in lo], bbox_max=[round(float(v), 3) for v in hi], dreiecke=len(o.data.loop_triangles))
    if n in ('lore_kohle', 'lore_leer', 'wagen_holz', 'lore_saecke', 'wagen_leer', 'radsatz'):
        bot = co[(co[:, 2] < lo[2] + 0.012) & (np.abs(co[:, 0]) < 0.6 * max(abs(lo[0]), hi[0]))]   # Kupplungshaken an den Enden ausklammern
        c = clusters(bot[:, 1], 0.06)
        if len(c) >= 2: info['spurweite_m'] = round(c[-1] - c[0], 3); info['spur_hinweis'] = 'Abstand der Radaufstandslinien (Laufflächenmitte) quer (Y)'
    if n in ('gleis_a', 'gleis_b', 'gleisbett', 'bohlenboden', 'verladung'):
        top = co[co[:, 2] > hi[2] - 0.02]
        c = clusters(top[:, 1], 0.04)
        if len(c) == 2: info['spurweite_m'] = round(c[1] - c[0], 3); info['spur_hinweis'] = 'Abstand der Schienenkopfmitten quer (Y)'
    if n == 'lampe':      # Glas/Gitter zeigt nach -Y, Rückseite (Wandseite) +Y; Glas nicht als eigenes Teil trennbar → Mitte geschätzt
        info['glas_mitte'] = [round(float((lo[0] + hi[0]) / 2), 3), round(float(lo[1] + 0.3 * (hi[1] - lo[1])), 3), round(float((lo[2] + hi[2]) / 2), 3)]
        info['note'] = 'Wandleuchte: Rückseite +Y an die Wand, Glas zeigt nach -Y; Ursprung unten Mitte (nicht Aufhängepunkt); glas_mitte geschätzt (Glas nicht trennbar)'

kit = dict(stand='2026-11-26', achsen='Blender: Gang entlang X, Y quer, Z oben. Im Spiel (glTF): (x, z, -y). Ursprung je Modul Mitte am Boden.',
           texturen='col sRGB, nrm OpenGL/glTF (tangent space), orm R=AO G=Rauheit B=Metall; eingebettet als WEBP 90', module=list(INFO.values()))
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'MinenBaukasten.blend'), compress=True)

if 'noexport' not in argv:
    for f in FILES:
        objs = [o for o in COLL[f].objects if not o.name.startswith('_')]
        if not objs: continue
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        path = os.path.join(OUT, f + '.glb')
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_image_format='WEBP', export_image_quality=int(os.environ.get('WEBPQ', '80')),
                                  export_tangents=False, export_normals=True, export_cameras=False, export_lights=False, export_apply=True,
                                  export_yup=True, export_texcoords=True, export_materials='EXPORT')
        print('GLB', f, round(os.path.getsize(path) / 1e6, 1), 'MB', flush=True)
    for m in kit['module']:
        p = os.path.join(OUT, m['file'] + '.glb'); m['datei'] = m['file'] + '.glb'
    json.dump(kit, open(os.path.join(OUT, 'kit.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('ASSEMBLE FERTIG', len(INFO))
