# Gegenstände für Pilot und Schiff: Modelle aus Grundformen und Baugruppen, je Gegenstand eine Sammlung, daraus die Bilder fürs Inventar.
# Aufruf in Blender (Items.blend): beide Dateien mit exec in EIN Verzeichnis laden (ns = {}; exec(lib, ns); exec(build, ns)).
# Achsen: X rechts, Y Tiefe (vorn = -Y), Z oben. Die Kamera schaut von vorn rechts oben.
# Stil: realistische Technik. Dunkle, abgenutzte Metalle, gedeckte Lackfarben, kaum Leuchten. Die Seltenheit zeigt sich nur in
# kleinen eloxierten Teilen (Ringe, Schrauben, Zierleisten) – die Kachel im Spiel trägt die Farbe.
import bpy, bmesh, math, os, json
from mathutils import Vector, Euler

RAR_SRGB = [(0.52, 0.55, 0.58), (0.20, 0.50, 0.78), (0.52, 0.30, 0.74), (0.80, 0.56, 0.20)]   # gewöhnlich, selten, episch, legendär
lin = lambda c: tuple(pow(x, 2.2) for x in c)
RAR = [lin(c) for c in RAR_SRGB]

# ---------- Materialien ----------
_M = {}
def pbr(name, col, metal=0.0, rough=0.5, wear=0.6, wear_col=(0.42, 0.43, 0.45), dirt=0.6, coat=0.0, emit=None, estr=0.0, trans=0.0, bevel=0.012):
    # Oberfläche mit ungleichmäßiger Rauheit, abgeriebenen Kanten (blankes Metall) und Schmutz in den Fugen.
    # Die Kanten werden im Material gerundet (Bevel-Knoten), das gibt Glanzlichter wie an gefrästen Teilen.
    key = (name, tuple(round(x, 3) for x in col), metal, rough, wear, dirt, coat, emit and tuple(round(x, 3) for x in emit), estr, trans)
    if key in _M: return _M[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes.new; L = nt.links.new
    b = nt.nodes.get('Principled BSDF')
    def put(n, v):
        if n in b.inputs: b.inputs[n].default_value = v
    put('Metallic', metal); put('Roughness', rough)
    if coat: put('Coat Weight', coat)
    if trans: put('Transmission Weight', trans); put('IOR', 1.5)
    if emit: put('Emission Color', (*emit, 1)); put('Emission Strength', estr)
    def mathn(op, a, bb=None, clamp=False):
        n = N('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for i, v in enumerate((a, bb)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(v, n.inputs[i])
        return n.outputs[0]
    def mixc(f, a, bb):
        n = N('ShaderNodeMix'); n.data_type = 'RGBA'
        if isinstance(f, (int, float)): n.inputs[0].default_value = f
        else: L(f, n.inputs[0])
        for i, v in ((6, a), (7, bb)):
            if isinstance(v, tuple): n.inputs[i].default_value = (*v, 1)
            else: L(v, n.inputs[i])
        return n.outputs[2]
    tc = N('ShaderNodeTexCoord')
    n1 = N('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 9.0; n1.inputs['Detail'].default_value = 8.0; L(tc.outputs['Object'], n1.inputs['Vector'])
    n2 = N('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 70.0; n2.inputs['Detail'].default_value = 4.0; L(tc.outputs['Object'], n2.inputs['Vector'])
    f1, f2 = n1.outputs[0], n2.outputs[0]
    if trans or bevel <= 0:
        put('Base Color', (*col, 1))
        _M[key] = m
        return m
    bv = N('ShaderNodeBevel'); bv.samples = 6; bv.inputs['Radius'].default_value = bevel
    geo = N('ShaderNodeNewGeometry')
    dot = N('ShaderNodeVectorMath'); dot.operation = 'DOT_PRODUCT'; L(bv.outputs['Normal'], dot.inputs[0]); L(geo.outputs['Normal'], dot.inputs[1])
    edge = mathn('MULTIPLY', mathn('SUBTRACT', 1.0, dot.outputs['Value']), 9.0, clamp=True)
    brk = N('ShaderNodeMapRange'); L(f2, brk.inputs['Value']); brk.inputs['From Min'].default_value = 0.38; brk.inputs['From Max'].default_value = 0.62
    wearm = mathn('MULTIPLY', mathn('MULTIPLY', edge, brk.outputs['Result']), wear, clamp=True)
    ao = N('ShaderNodeAmbientOcclusion'); ao.samples = 8; ao.inputs['Distance'].default_value = 0.14
    dirtm = mathn('MULTIPLY', mathn('SUBTRACT', 1.0, ao.outputs['AO']), dirt * 1.6, clamp=True)
    var = N('ShaderNodeMapRange'); L(f1, var.inputs['Value']); var.inputs['To Min'].default_value = 0.72; var.inputs['To Max'].default_value = 1.22
    vcol = N('ShaderNodeVectorMath'); vcol.operation = 'SCALE'; vcol.inputs[0].default_value = col; L(var.outputs['Result'], vcol.inputs['Scale'])
    c1 = mixc(dirtm, vcol.outputs['Vector'], tuple(x * 0.22 for x in col))
    c2 = mixc(wearm, c1, wear_col)
    L(c2, b.inputs['Base Color'])
    L(mathn('MAXIMUM', wearm, metal), b.inputs['Metallic'])
    r1 = mathn('ADD', rough, mathn('MULTIPLY', mathn('SUBTRACT', f1, 0.5), 0.3))
    r2 = mathn('ADD', r1, mathn('MULTIPLY', dirtm, 0.3))
    L(mathn('SUBTRACT', r2, mathn('MULTIPLY', wearm, 0.2), clamp=True), b.inputs['Roughness'])
    L(bv.outputs['Normal'], b.inputs['Normal'])
    _M[key] = m
    return m
GUN = lambda: pbr('brueniert', (0.055, 0.058, 0.066), 1.0, 0.44, wear=0.8)
BLACK = lambda: pbr('kunststoff', (0.014, 0.014, 0.016), 0.0, 0.58, wear=0.25, wear_col=(0.09, 0.09, 0.1))
STEEL = lambda: pbr('stahl', (0.27, 0.28, 0.30), 1.0, 0.36, wear=0.3, wear_col=(0.6, 0.61, 0.63))
ALU = lambda: pbr('alu', (0.50, 0.51, 0.53), 1.0, 0.32, wear=0.2, wear_col=(0.75, 0.76, 0.78))
DARK = GUN
LIGHT = ALU
RUBBER = lambda: pbr('gummi', (0.012, 0.012, 0.013), 0.0, 0.78, wear=0.0, dirt=0.3)
COPPER = lambda: pbr('kupfer', (0.45, 0.2, 0.09), 1.0, 0.42, wear=0.2, wear_col=(0.8, 0.45, 0.25))
BRASS = lambda: pbr('messing', (0.55, 0.38, 0.12), 1.0, 0.38, wear=0.2, wear_col=(0.85, 0.7, 0.35))
CERAMIC = lambda: pbr('keramik', (0.3, 0.31, 0.32), 0.0, 0.42, wear=0.7, wear_col=(0.3, 0.31, 0.33), coat=0.2)
def paint(c, rough=0.5, wear=0.75): return pbr('lack', tuple(x * 0.55 for x in c), 0.0, rough, wear=wear)
def fabric(c): return pbr('stoff', tuple(x * 0.5 for x in c), 0.0, 0.95, wear=0.0, dirt=0.8, bevel=0.02)
def anod(c): return pbr('eloxal', tuple(x * 0.75 for x in c), 1.0, 0.34, wear=0.35, wear_col=(0.7, 0.7, 0.72))    # eloxiertes Metall in der Farbe der Seltenheit
def led(c, s=6.0): return pbr('led', (0.01, 0.01, 0.01), 0.0, 0.3, emit=c, estr=s, bevel=0)
def glass(tint=(0.012, 0.014, 0.018)): return pbr('visier', tint, 0.0, 0.05, wear=0.0, dirt=0.0, coat=1.0, bevel=0.004)
def lens(c=(0.3, 0.5, 0.7)): return pbr('linse', c, 0.0, 0.02, trans=0.95, coat=1.0)
def screen(c=(0.1, 0.5, 0.45), s=1.2): return pbr('anzeige', (0.01, 0.012, 0.014), 0.0, 0.12, emit=c, estr=s * 0.45, coat=1.0, bevel=0)
def alien(): return pbr('ferrox', (0.02, 0.016, 0.03), 0.9, 0.22, wear=0.5, wear_col=(0.25, 0.18, 0.4), dirt=0.4)
def mineral(c): return pbr('mineral', c, 0.0, 0.12, wear=0.0, dirt=0.3, trans=0.0, coat=0.6)
# alte Namen (einzelne Bauvorschriften nutzen sie noch)
def glow(c, s=7.0): return led(c, s * 0.6)
GOLD = BRASS

# ---------- Grundformen ----------
COL = None      # Sammlung des Gegenstands, der gerade gebaut wird
GROUP = []      # offene Baugruppen (Leerobjekte); neue Teile hängen an der innersten
class grp:
    # Baugruppe: alles darin wird relativ zu loc/rot gebaut
    def __init__(self, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)): self.a = (loc, rot, scale)
    def __enter__(self):
        e = bpy.data.objects.new('gruppe', None); COL.objects.link(e)
        e.location = self.a[0]; e.rotation_euler = Euler([math.radians(v) for v in self.a[1]]); e.scale = self.a[2]
        if GROUP: e.parent = GROUP[-1]
        GROUP.append(e); return e
    def __exit__(self, *a): GROUP.pop()
def _obj(bm, name, m, smooth, bevel, seg=1):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); COL.objects.link(ob)
    me.materials.append(m)
    if smooth:
        for p in me.polygons: p.use_smooth = True
        md = ob.modifiers.new('kanten', 'EDGE_SPLIT'); md.split_angle = math.radians(38)
    if bevel:
        md = ob.modifiers.new('fase', 'BEVEL'); md.width = bevel; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(40)
    if GROUP: ob.parent = GROUP[-1]
    return ob
def _place(ob, loc, rot, scale=(1, 1, 1)):
    ob.location = loc; ob.rotation_euler = Euler([math.radians(a) for a in rot]); ob.scale = scale
    return ob
def box(sx, sy, sz, loc, m, rot=(0, 0, 0), bevel=0.015, taper=None, seg=1):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    for v in bm.verts:
        k = (taper if (taper and v.co.z > 0) else 1.0)
        v.co.x *= sx * k; v.co.y *= sy * k; v.co.z *= sz
    return _place(_obj(bm, 'kasten', m, False, bevel, seg), loc, rot)
def cyl(r, h, loc, m, rot=(0, 0, 0), r2=None, seg=32, bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    return _place(_obj(bm, 'zylinder', m, seg > 8, bevel), loc, rot)
def sph(r, loc, m, scale=(1, 1, 1), rot=(0, 0, 0), seg=40):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    return _place(_obj(bm, 'kugel', m, True, 0), loc, rot, scale)
def ico(r, loc, m, scale=(1, 1, 1), rot=(0, 0, 0), sub=1):
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    return _place(_obj(bm, 'facetten', m, False, 0), loc, rot, scale)
def torus(R, r, loc, m, rot=(0, 0, 0), seg=48, sseg=12, arc=360):
    bm = bmesh.new(); n = seg if arc == 360 else seg + 1; rings = []
    for i in range(n):
        a = math.radians(arc) * i / seg
        rings.append([bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))) for b in (2 * math.pi * j / sseg for j in range(sseg))])
    for i in range(seg):
        a, b = rings[i], rings[(i + 1) % n]
        for j in range(sseg): bm.faces.new((a[j], b[j], b[(j + 1) % sseg], a[(j + 1) % sseg]))
    return _place(_obj(bm, 'ring', m, True, 0), loc, rot)
def lathe(prof, loc, m, rot=(0, 0, 0), seg=40, flat=False):
    # prof: Liste (Radius, Höhe) von unten nach oben; Drehkörper um Z
    bm = bmesh.new(); rings = []
    for r, z in prof:
        r = max(r, 0.0015)
        rings.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for a in (2 * math.pi * i / seg for i in range(seg))])
    for a, b in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a[i], a[(i + 1) % seg], b[(i + 1) % seg], b[i]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    return _place(_obj(bm, 'drehteil', m, not flat, 0), loc, rot)
def prism(pts, depth, loc, m, rot=(0, 0, 0), bevel=0.01):
    # Umriss in der XZ-Ebene, Tiefe entlang Y
    bm = bmesh.new()
    f = [bm.verts.new((x, -depth / 2, z)) for x, z in pts]; b = [bm.verts.new((x, depth / 2, z)) for x, z in pts]
    bm.faces.new(f); bm.faces.new(b[::-1])
    n = len(pts)
    for i in range(n): bm.faces.new((f[i], b[i], b[(i + 1) % n], f[(i + 1) % n]))
    return _place(_obj(bm, 'profil', m, False, bevel), loc, rot)
def tube(pts, r, m, cyclic=False):
    cu = bpy.data.curves.new('rohr', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 5; cu.use_fill_caps = True
    sp = cu.splines.new('BEZIER'); sp.bezier_points.add(len(pts) - 1); sp.use_cyclic_u = cyclic
    for p, co in zip(sp.bezier_points, pts): p.co = co; p.handle_left_type = p.handle_right_type = 'AUTO'
    cu.materials.append(m)
    ob = bpy.data.objects.new('rohr', cu); COL.objects.link(ob)
    if GROUP: ob.parent = GROUP[-1]
    return ob
def ring_of(n, R, fn, phase=0.0):
    for i in range(n):
        a = 2 * math.pi * i / n + math.radians(phase)
        fn(R * math.cos(a), R * math.sin(a), math.degrees(a))
def cut(ob, cutter):
    # cutter aus ob herausschneiden; der Schneidkörper bleibt unsichtbar in der Sammlung
    md = ob.modifiers.new('schnitt', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = cutter
    try: md.solver = 'EXACT'
    except Exception: pass
    cutter.hide_render = True; cutter.display_type = 'WIRE'
    return ob
def shell(ob, t=0.03):
    md = ob.modifiers.new('wand', 'SOLIDIFY'); md.thickness = t; md.offset = -1
    return ob

# ---------- Szene, Kamera, Licht ----------
CAM_DIR = Vector((1.2, -2.1, 1.25)).normalized()
LENS = 95.0
def setup_scene(size=204, samples=96):
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    try: sc.cycles.device = 'CPU'
    except Exception: pass
    sc.render.resolution_x = sc.render.resolution_y = size; sc.render.resolution_percentage = 100
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = 'PNG'; sc.render.image_settings.color_mode = 'RGBA'
    for vt, look in (('AgX', 'AgX - Medium High Contrast'), ('Filmic', 'Medium High Contrast'), ('Standard', 'None')):
        try:
            sc.view_settings.view_transform = vt
            try: sc.view_settings.look = look
            except Exception: pass
            break
        except Exception: continue
    sc.view_settings.exposure = -0.35
    cam = bpy.data.objects.get('Kamera')
    if not cam:
        cd = bpy.data.cameras.new('Kamera'); cam = bpy.data.objects.new('Kamera', cd); sc.collection.objects.link(cam)
    cam.data.type = 'PERSP'; cam.data.lens = LENS; cam.data.sensor_width = 36; cam.data.clip_end = 200
    sc.camera = cam
    cam.rotation_euler = CAM_DIR.to_track_quat('Z', 'Y').to_euler()
    rig = bpy.data.objects.get('Licht')
    if rig:
        for ch in list(rig.children): bpy.data.objects.remove(ch, do_unlink=True)
    else:
        rig = bpy.data.objects.new('Licht', None); sc.collection.objects.link(rig)
    # Studio: großes weiches Hauptlicht von links oben, schwache Aufhellung, kühles Kantenlicht von hinten, Licht von oben
    for name, loc, power, sz, col in [('Haupt', (-3.0, -3.6, 4.6), 950, 5.0, (1, 0.97, 0.93)), ('Aufhellung', (4.4, -2.6, 0.8), 160, 6.0, (0.85, 0.9, 1)),
                                      ('Kante', (2.2, 4.6, 3.4), 1100, 3.0, (0.72, 0.84, 1)), ('Oben', (0.4, 0.2, 6.0), 260, 4.0, (1, 1, 1))]:
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
    ramp.color_ramp.elements[0].position = 0.4; ramp.color_ramp.elements[0].color = (0.01, 0.012, 0.016, 1)
    ramp.color_ramp.elements[1].position = 0.9; ramp.color_ramp.elements[1].color = (0.42, 0.47, 0.56, 1)
    nt.links.new(ramp.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = 0.6
    nt.links.new(bg.outputs['Background'], out.inputs['Surface'])
    return cam, rig

def frame(col, cam, rig, margin=1.08):
    # Kamera so weit zurücksetzen, dass der Gegenstand das Bild füllt, und das Licht mitnehmen
    bpy.context.view_layer.update()
    q = cam.rotation_euler.to_quaternion(); right = q @ Vector((1, 0, 0)); up = q @ Vector((0, 1, 0)); back = q @ Vector((0, 0, 1))
    pts = []
    for ob in col.all_objects:
        if ob.type not in ('MESH', 'CURVE') or ob.hide_render: continue
        for c in ob.bound_box: pts.append(ob.matrix_world @ Vector(c))
    xs = [p.dot(right) for p in pts]; ys = [p.dot(up) for p in pts]; zs = [p.dot(back) for p in pts]
    center = right * ((min(xs) + max(xs)) / 2) + up * ((min(ys) + max(ys)) / 2) + back * ((min(zs) + max(zs)) / 2)
    t = 18.0 / LENS      # tan des halben Öffnungswinkels (36-mm-Sensor, quadratisches Bild)
    d = max(max((p - center).dot(back) + abs((p - center).dot(right)) / t, (p - center).dot(back) + abs((p - center).dot(up)) / t) for p in pts)
    cam.location = center + back * d * margin
    rig.location = center

# ---------- Verwaltung ----------
ITEMS = {}      # id → (Seltenheit, Bauvorschrift)
ORDER = []
ROT = [0, 0, 0]
def tilt(x, y, z): ROT[0], ROT[1], ROT[2] = x, y, z
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
    del GROUP[:]; tilt(0, 0, 0)
    fn(RAR[rar])
    # alle Teile an einen Ankerpunkt hängen und auf dem Raster ablegen (10 je Reihe)
    anchor = bpy.data.objects.new('anker_' + id, None); COL.objects.link(anchor)
    for ob in COL.objects:
        if ob is not anchor and ob.parent is None: ob.parent = anchor
    anchor.location = ((index % 10) * 3.0, (index // 10) * 3.0, 0)
    anchor.rotation_euler = Euler([math.radians(v) for v in ROT])
    return COL
def render_items(out_dir, ids=None, size=204, samples=96):
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

# ---------- Zusätze für hoch aufgelöste Modelle: Beschriftungen, Formschnitt, Körper als Vorlage ----------
ITEM_DIR = globals().get('ITEM_DIR', '')
_DEC = {}
def _decals():
    if 'm' not in _DEC:
        j = json.load(open(os.path.join(ITEM_DIR, 'tex', 'decals.json'), encoding='utf-8')); _DEC['r'] = j['rects']; _DEC['s'] = j['size']
        img = bpy.data.images.load(os.path.join(ITEM_DIR, 'tex', 'decals.png'), check_existing=True)
        m = bpy.data.materials.new('beschriftung'); m.use_nodes = True
        nt = m.node_tree; b = nt.nodes.get('Principled BSDF'); t = nt.nodes.new('ShaderNodeTexImage'); t.image = img
        nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
        b.inputs['Roughness'].default_value = 0.55
        try: m.blend_method = 'BLEND'
        except Exception: pass
        _DEC['m'] = m
    return _DEC
def decal(name, w, loc, rot=(0, 0, 0), normal=None, lift=0.003):
    # Beschriftung als flaches Rechteck (Vorderseite -Y), Breite w; normal = Richtung, in die sie zeigen soll (statt rot)
    D = _decals(); x, y, pw, ph = D['r'][name]; S = D['s']; h = w * ph / pw
    bm = bmesh.new(); vs = [bm.verts.new(p) for p in ((-w / 2, -lift, -h / 2), (w / 2, -lift, -h / 2), (w / 2, -lift, h / 2), (-w / 2, -lift, h / 2))]
    f = bm.faces.new(vs); uv = bm.loops.layers.uv.new('UVMap')
    for lp, (u, v) in zip(f.loops, ((x / S, 1 - (y + ph) / S), ((x + pw) / S, 1 - (y + ph) / S), ((x + pw) / S, 1 - y / S), (x / S, 1 - y / S))): lp[uv].uv = (u, v)
    me = bpy.data.meshes.new('schrift'); bm.to_mesh(me); bm.free(); me.materials.append(D['m'])
    ob = bpy.data.objects.new('schrift_' + name, me); COL.objects.link(ob)
    if GROUP: ob.parent = GROUP[-1]
    ob.location = loc
    if normal is not None:
        # Rechteck so drehen, dass seine Vorderseite (-Y) entlang normal zeigt und die Schrift aufrecht steht
        from mathutils import Matrix
        n = Vector(normal).normalized(); up = Vector((0, 0, 1))
        if abs(n.dot(up)) > 0.97: up = Vector((0, 1, 0))
        za = (up - n * up.dot(n)).normalized(); ya = -n; xa = ya.cross(za)
        ob.rotation_euler = Matrix((xa, ya, za)).transposed().to_euler()
    else: ob.rotation_euler = Euler([math.radians(a) for a in rot])
    return ob
def keep(ob, cutter, solver='FLOAT'):
    # nur den Teil von ob behalten, der im Schneidkörper liegt
    md = ob.modifiers.new('ausschnitt', 'BOOLEAN'); md.operation = 'INTERSECT'; md.object = cutter
    try: md.solver = solver
    except Exception: pass
    cutter.hide_render = True; cutter.display_type = 'WIRE'
    return ob
def bake(ob):
    # Modifikatoren einrechnen (danach ist das Netz fest; Schneidkörper werden nicht mehr gebraucht)
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg)); old = ob.data
    ob.modifiers.clear(); ob.data = me
    for p in me.polygons: p.use_smooth = True
    md = ob.modifiers.new('kanten', 'EDGE_SPLIT'); md.split_angle = math.radians(35)
    return ob
def mesh_from(name, weld=1e-5):
    # Netz eines vorhandenen Objekts (mit Skelett-Haltung), in Weltkoordinaten, Nähte verschweißt
    src = bpy.data.objects[name]; dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(src.evaluated_get(dg)); me.transform(src.matrix_world)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=weld); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    while me.materials: me.materials.pop()
    return me
def mesh_obj(me, m, smooth=True):
    ob = bpy.data.objects.new('netz', me); COL.objects.link(ob); me.materials.append(m) if not me.materials else None
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if GROUP: ob.parent = GROUP[-1]
    return ob
def along(p, q, f0, f1, r, m=None, seg=24):
    # Zylinder entlang der Strecke p→q, von Anteil f0 bis f1 (als Schneidkörper oder Bauteil)
    p, q = Vector(p), Vector(q); a = p.lerp(q, f0); b = p.lerp(q, f1); d = (b - a); e = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    return cyl(r, d.length, tuple((a + b) / 2), m or BLACK(), rot=tuple(math.degrees(v) for v in e), seg=seg)
def stick(name, w, target, origin, direction, lift=0.004):
    # Beschriftung dorthin setzen, wo ein Strahl (origin, direction) das Objekt target trifft, und an dessen Fläche ausrichten
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    hit, loc, nor, idx = target.evaluated_get(dg).ray_cast(Vector(origin), Vector(direction).normalized())
    if not hit: return None
    return decal(name, w, tuple(loc + nor * lift), normal=tuple(nor), lift=0.0)
