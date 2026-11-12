# Gegenstände für Pilot und Schiff: kleine Modelle aus Grundformen, je Gegenstand eine Sammlung, daraus die Bilder fürs Inventar.
# Aufruf in Blender (Items.blend):  exec(open(r".../items_lib.py").read());  exec(open(r".../items_build.py").read())
# Achsen: X rechts, Y Tiefe (vorn = -Y), Z oben. Die Kamera schaut von vorn rechts oben.
import bpy, bmesh, math, os, json
from mathutils import Vector, Euler

RAR_SRGB = [(0.67, 0.71, 0.75), (0.37, 0.82, 1.0), (0.75, 0.44, 1.0), (1.0, 0.70, 0.28)]   # gewöhnlich, selten, episch, legendär
lin = lambda c: tuple(pow(x, 2.2) for x in c)
RAR = [lin(c) for c in RAR_SRGB]

# ---------- Materialien ----------
_M = {}
def mat(name, col, metal=0.0, rough=0.5, emit=None, estr=0.0, trans=0.0, coat=0.0):
    key = (name, tuple(round(x, 3) for x in col), metal, rough, emit and tuple(round(x, 3) for x in emit), estr, trans, coat)
    if key in _M: return _M[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    def put(n, v):
        if n in b.inputs: b.inputs[n].default_value = v
    put('Base Color', (*col, 1)); put('Metallic', metal); put('Roughness', rough)
    if emit: put('Emission Color', (*emit, 1)); put('Emission Strength', estr)
    if trans: put('Transmission Weight', trans); put('IOR', 1.45)
    if coat: put('Coat Weight', coat)
    _M[key] = m
    return m
STEEL = lambda: mat('stahl', (0.36, 0.39, 0.44), 1.0, 0.32)
LIGHT = lambda: mat('hellmetall', (0.62, 0.65, 0.70), 1.0, 0.28)
DARK = lambda: mat('dunkelmetall', (0.045, 0.05, 0.06), 0.9, 0.42)
RUBBER = lambda: mat('gummi', (0.02, 0.02, 0.024), 0.0, 0.85)
GOLD = lambda: mat('gold', (1.0, 0.62, 0.18), 1.0, 0.22)
COPPER = lambda: mat('kupfer', (0.85, 0.36, 0.16), 1.0, 0.3)
def paint(c, rough=0.42): return mat('lack', c, 0.25, rough, coat=0.4)
def fabric(c): return mat('stoff', c, 0.0, 0.92)
def glow(c, s=7.0): return mat('leuchten', (0.02, 0.02, 0.02), 0.0, 0.4, c, s * 0.75)
def glass(c, s=0.9): return mat('glas', tuple(x * 0.08 for x in c), 0.6, 0.06, c, s, coat=1.0)
def crystal(c, s=2.2): return mat('kristall', tuple(min(1, x * 0.9 + 0.05) for x in c), 0.0, 0.08, c, s * 0.45, trans=0.6)

# ---------- Grundformen ----------
COL = None      # Sammlung des Gegenstands, der gerade gebaut wird
def _obj(bm, name, m, smooth, bevel):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); COL.objects.link(ob)
    me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
        md = ob.modifiers.new('kanten', 'EDGE_SPLIT'); md.split_angle = math.radians(38)
    if bevel:
        md = ob.modifiers.new('fase', 'BEVEL'); md.width = bevel; md.segments = 2; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(40)
    return ob
def _place(ob, loc, rot, scale=(1, 1, 1)):
    ob.location = loc; ob.rotation_euler = Euler([math.radians(a) for a in rot]); ob.scale = scale
    return ob
def box(sx, sy, sz, loc, m, rot=(0, 0, 0), bevel=0.02, taper=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        k = (taper if (taper and v.co.z > 0) else 1.0)
        v.co.x *= sx * k; v.co.y *= sy * k; v.co.z *= sz
    return _place(_obj(bm, 'kasten', m, False, bevel), loc, rot)
def cyl(r, h, loc, m, rot=(0, 0, 0), r2=None, seg=28, bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    return _place(_obj(bm, 'zylinder', m, True, bevel), loc, rot)
def sph(r, loc, m, scale=(1, 1, 1), rot=(0, 0, 0), seg=32):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    return _place(_obj(bm, 'kugel', m, True, 0), loc, rot, scale)
def ico(r, loc, m, scale=(1, 1, 1), rot=(0, 0, 0), sub=1):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return _place(_obj(bm, 'kristall', m, False, 0), loc, rot, scale)
def torus(R, r, loc, m, rot=(0, 0, 0), seg=40, sseg=12, arc=360):
    bm = bmesh.new(); n = seg if arc == 360 else seg + 1; rings = []
    for i in range(n):
        a = math.radians(arc) * i / seg
        rings.append([bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))) for b in (2 * math.pi * j / sseg for j in range(sseg))])
    for i in range(seg if arc == 360 else seg):
        a, b = rings[i], rings[(i + 1) % n]
        for j in range(sseg): bm.faces.new((a[j], b[j], b[(j + 1) % sseg], a[(j + 1) % sseg]))
    return _place(_obj(bm, 'ring', m, True, 0), loc, rot)
def lathe(prof, loc, m, rot=(0, 0, 0), seg=32, flat=False):
    # prof: Liste (Radius, Höhe) von unten nach oben; Drehkörper um Z
    bm = bmesh.new(); rings = []
    for r, z in prof:
        r = max(r, 0.0015)
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for a in (2 * math.pi * i / seg for i in range(seg))])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    return _place(_obj(bm, 'drehteil', m, not flat, 0), loc, rot)
def prism(pts, depth, loc, m, rot=(0, 0, 0), bevel=0.012):
    # Umriss in der XZ-Ebene, Tiefe entlang Y
    bm = bmesh.new()
    f = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]; b = [bm.verts.new((x, depth / 2, z)) for x, z in pts]
    bm.faces.new(f); bm.faces.new(b[::-1])
    n = len(pts)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    return _place(_obj(bm, 'profil', m, False, bevel), loc, rot)
def tube(pts, r, m, cyclic=False):
    cu = bpy.data.curves.new('rohr', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 4; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1); sp.use_cyclic_u = cyclic
    for p, co in zip(sp.bezier_points, pts): p.co = co; p.handle_left_type = p.handle_right_type = 'AUTO'
    cu.materials.append(m)
    ob = bpy.data.objects.new('rohr', cu); COL.objects.link(ob)
    return ob
def ring_of(n, R, fn, z=0.0, phase=0.0):
    # fn(x, y, winkel_in_grad) für n Stellen auf einem Kreis
    for i in range(n):
        a = 2 * math.pi * i / n + math.radians(phase)
        fn(R * math.cos(a), R * math.sin(a), math.degrees(a))

# ---------- Szene, Kamera, Licht ----------
CAM_DIR = Vector((1.25, -2.1, 1.35)).normalized()
def setup_scene(size=204, samples=72):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    try: sc.cycles.device = 'CPU'
    except Exception: pass
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    sc.view_settings.view_transform = 'Standard'
    try: sc.view_settings.look = 'Medium High Contrast'
    except Exception: pass
    cam = bpy.data.objects.get('Kamera')
    if not cam:
        cd = bpy.data.cameras.new('Kamera'); cd.type = 'ORTHO'; cam = bpy.data.objects.new('Kamera', cd); sc.collection.objects.link(cam)
    sc.camera = cam
    cam.rotation_euler = CAM_DIR.to_track_quat('Z', 'Y').to_euler()
    rig = bpy.data.objects.get('Licht')
    if not rig:
        rig = bpy.data.objects.new('Licht', None); sc.collection.objects.link(rig)
        for name, loc, power, sz, col in [('Haupt', (-2.6, -3.2, 4.2), 620, 3.0, (1, 0.97, 0.92)), ('Aufhellung', (3.4, -2.4, 1.2), 150, 3.0, (0.8, 0.88, 1)), ('Kante', (1.2, 4.0, 3.2), 520, 2.0, (0.75, 0.86, 1))]:
            ld = bpy.data.lights.new(name, 'AREA'); ld.energy = power; ld.size = sz; ld.color = col
            lo = bpy.data.objects.new(name, ld); sc.collection.objects.link(lo); lo.parent = rig; lo.location = loc
            lo.rotation_euler = (-Vector(loc)).normalized().to_track_quat('-Z', 'Y').to_euler()
    w = sc.world or bpy.data.worlds.new('Welt'); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputWorld'); bg = nt.nodes.new('ShaderNodeBackground'); ramp = nt.nodes.new('ShaderNodeValToRGB')
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); mp = nt.nodes.new('ShaderNodeMapRange')
    nt.links.new(tc.outputs['Generated'], sep.inputs[0]); nt.links.new(sep.outputs['Z'], mp.inputs['Value'])
    mp.inputs['From Min'].default_value = -1; mp.inputs['From Max'].default_value = 1
    nt.links.new(mp.outputs['Result'], ramp.inputs['Fac'])
    ramp.color_ramp.elements[0].position = 0.35; ramp.color_ramp.elements[0].color = (0.015, 0.018, 0.024, 1)
    ramp.color_ramp.elements[1].position = 0.85; ramp.color_ramp.elements[1].color = (0.75, 0.82, 0.95, 1)
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.9
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    return cam, rig

def frame(col, cam, rig, margin=1.1):
    # Kamera und Licht auf die Sammlung ausrichten: Mitte und Ausdehnung in Kamerarichtung messen
    bpy.context.view_layer.update()
    q = cam.rotation_euler.to_quaternion(); right = q @ Vector((1, 0, 0)); up = q @ Vector((0, 1, 0))
    xs, ys, pts = [], [], []
    for ob in col.all_objects:
        if ob.type not in ('MESH', 'CURVE'): continue
        for c in ob.bound_box:
            p = ob.matrix_world @ Vector(c); pts.append(p); xs.append(p.dot(right)); ys.append(p.dot(up))
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    mid = sum(pts, Vector()) / len(pts)
    center = mid + right * (cx - mid.dot(right)) + up * (cy - mid.dot(up))
    cam.location = center + CAM_DIR * 12
    cam.data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) * margin
    rig.location = center

# ---------- Verwaltung ----------
ITEMS = {}      # id → (Seltenheit, Bauvorschrift)
ORDER = []
def item(id, rar):
    def deco(fn): ITEMS[id] = (rar, fn); ORDER.append(id); return fn
    return deco
def build_item(id, index=0):
    global COL
    rar, fn = ITEMS[id]
    name = 'it_' + id
    old = bpy.data.collections.get(name)
    if old:
        for ob in list(old.objects): bpy.data.objects.remove(ob, do_unlink=True)
        bpy.data.collections.remove(old)
    COL = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(COL)
    fn(RAR[rar])
    # alle Teile an einen Ankerpunkt hängen und auf dem Raster ablegen (10 je Reihe)
    anchor = bpy.data.objects.new('anker_' + id, None); COL.objects.link(anchor)
    for ob in COL.objects:
        if ob is not anchor and ob.parent is None: ob.parent = anchor
    anchor.location = ((index % 10) * 2.4, (index // 10) * 2.6, 0)
    return COL
def build_all(ids=None):
    for i, id in enumerate(ORDER):
        if ids is None or id in ids: build_item(id, i)
def render_items(out_dir, ids=None, size=204, samples=72):
    cam, rig = setup_scene(size, samples)
    os.makedirs(out_dir, exist_ok=True)
    cols = {id: bpy.data.collections.get('it_' + id) for id in ORDER}
    for c in cols.values():
        if c: c.hide_render = True
    done = []
    for id in ORDER:
        c = cols[id]
        if not c or (ids is not None and id not in ids): continue
        c.hide_render = False
        frame(c, cam, rig)
        bpy.context.scene.render.filepath = os.path.join(out_dir, id + '.png')
        bpy.ops.render.render(write_still=True)
        c.hide_render = True
        done.append(id)
        with open(os.path.join(out_dir, '_stand.txt'), 'w') as f: f.write(str(len(done)))
    for c in cols.values():
        if c: c.hide_render = False
    with open(os.path.join(out_dir, '_fertig.txt'), 'w') as f: f.write(','.join(done))
    return done
def make_atlas(out_dir, atlas_png, json_path, size=204, cols=10, dim=2048):
    # Einzelbilder zu einem Bild zusammensetzen (Reihenfolge = ORDER) und die Lage als JSON ablegen
    import numpy as np
    A = np.zeros((dim, dim, 4), dtype=np.float32); ids = []
    for id in ORDER:
        p = os.path.join(out_dir, id + '.png')
        if not os.path.exists(p): continue
        im = bpy.data.images.load(p, check_existing=False); im.colorspace_settings.name = 'sRGB'
        px = np.array(im.pixels[:], dtype=np.float32).reshape(im.size[1], im.size[0], 4)[::-1]     # oben zuerst
        bpy.data.images.remove(im)
        i = len(ids); r, c = i // cols, i % cols
        A[r * size:(r + 1) * size, c * size:(c + 1) * size] = px
        ids.append(id)
    out = bpy.data.images.new('atlas', dim, dim, alpha=True); out.colorspace_settings.name = 'sRGB'
    out.pixels.foreach_set(A[::-1].ravel()); out.filepath_raw = atlas_png; out.file_format = 'PNG'; out.save()
    bpy.data.images.remove(out)
    with open(json_path, 'w') as f: json.dump({'cell': size, 'cols': cols, 'dim': dim, 'ids': ids}, f)
    return len(ids)
