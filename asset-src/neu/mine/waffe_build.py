# Waffe im Bild (Ich-Sicht): Karabiner K-12 von Hammerwerk, eigener Entwurf. Aufbau in Mine.blend, Sammlung 'waffe'.
#   build()  baut alle Teile (echte Geometrie mit Fasen, Schlitze per Boolean, Gravur als Geometrie)
#   prepare() wendet Modifikatoren an, fügt alles mit Back-Materialien zu einem Objekt, Texturkoordinaten (Smart UV)
#   bake_start() rechnet im Hintergrund Farbe, Rauheit, Metall, Verdeckung, Relief (2048) → asset-src/tex/waffe_col/nrm/orm@2048.png
#   export() schreibt asset-src/glb/station/Mine_Waffe.glb: Knoten 'waffe' (ext_waffe), 'glas' (ext_glas), 'absehen' (ext_leucht), 'lampenglas' (ext_lampe),
#            Leerobjekte 'muendung' (Mündung) und 'licht' (Lampenkopf).
# Maße in Metern. +Y ist vorn (Lauf), +Z oben, +X rechts. Ursprung am Abzug. Seelenachse z = 0,040.
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix

ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
TEX = os.path.join(ROOT, 'asset-src', 'tex')
COLL = 'waffe'
BZ = 0.040          # Seelenachse
SM = {}             # Material → Sockel für das Backen: Grundfarbe, Metall
COL = None

# ------------------------------------------------------------------ Materialien
def _mat(name, col, metal=0.0, rough=0.5, wear=0.5, wear_col=(0.52, 0.53, 0.55), wear_metal=1.0, wear_rough=0.28, dirt=0.55,
         bump=0.04, bump_scale=900.0, stipple=0.0, var=0.18):
    m = bpy.data.materials.get(name)
    if m: bpy.data.materials.remove(m)
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes.new; L = nt.links.new
    b = nt.nodes.get('Principled BSDF')
    def math_(op, a, c=None, clamp=False):
        n = N('ShaderNodeMath'); n.operation = op; n.use_clamp = clamp
        for i, v in enumerate((a, c)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(v, n.inputs[i])
        return n.outputs[0]
    def mix(f, a, c):
        n = N('ShaderNodeMix'); n.data_type = 'RGBA'; n.clamp_factor = True
        if isinstance(f, (int, float)): n.inputs[0].default_value = f
        else: L(f, n.inputs[0])
        for i, v in ((6, a), (7, c)):
            if isinstance(v, tuple): n.inputs[i].default_value = (*v, 1)
            else: L(v, n.inputs[i])
        return n.outputs[2]
    def mixf(f, a, c):
        n = N('ShaderNodeMix'); n.data_type = 'FLOAT'; n.clamp_factor = True
        L(f, n.inputs[0])
        for i, v in ((2, a), (3, c)):
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L(v, n.inputs[i])
        return n.outputs[0]
    def rng(v, a, c, lo=0.0, hi=1.0):
        n = N('ShaderNodeMapRange'); L(v, n.inputs['Value']); n.inputs['From Min'].default_value = a; n.inputs['From Max'].default_value = c
        n.inputs['To Min'].default_value = lo; n.inputs['To Max'].default_value = hi; return n.outputs['Result']
    tc = N('ShaderNodeTexCoord')
    n1 = N('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 26.0; n1.inputs['Detail'].default_value = 6.0; L(tc.outputs['Object'], n1.inputs['Vector'])
    n2 = N('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 160.0; n2.inputs['Detail'].default_value = 8.0; n2.inputs['Roughness'].default_value = 0.7; L(tc.outputs['Object'], n2.inputs['Vector'])
    # Kanten: Verdeckung von innen (nur das eigene Teil) findet nach außen gewölbte Kanten
    ai = N('ShaderNodeAmbientOcclusion'); ai.inside = True; ai.only_local = True; ai.samples = 16; ai.inputs['Distance'].default_value = 0.0008
    edge = rng(math_('SUBTRACT', 1.0, ai.outputs['AO']), 0.12, 0.5)
    brk = rng(n2.outputs[0], 0.42, 0.62)
    wearm = math_('MULTIPLY', math_('MULTIPLY', edge, brk), wear, clamp=True)
    ao = N('ShaderNodeAmbientOcclusion'); ao.samples = 16; ao.inputs['Distance'].default_value = 0.010
    dirtm = math_('MULTIPLY', math_('SUBTRACT', 1.0, ao.outputs['AO']), dirt * 1.5, clamp=True)
    vr = rng(n1.outputs[0], 0.3, 0.7, 1 - var, 1 + var)
    vc = N('ShaderNodeVectorMath'); vc.operation = 'SCALE'; vc.inputs[0].default_value = col; L(vr, vc.inputs['Scale'])
    c1 = mix(dirtm, vc.outputs['Vector'], tuple(x * 0.4 for x in col))
    c2 = mix(wearm, c1, wear_col)
    L(c2, b.inputs['Base Color'])
    met = mixf(wearm, metal, wear_metal); L(met, b.inputs['Metallic'])
    r1 = math_('ADD', rough, math_('MULTIPLY', math_('SUBTRACT', n1.outputs[0], 0.5), 0.22))
    r2 = math_('ADD', r1, math_('MULTIPLY', dirtm, 0.18))
    L(mixf(wearm, r2, wear_rough), b.inputs['Roughness'])
    # Oberfläche: feine Körnung (Beschichtung) bzw. Griffstruktur
    if stipple > 0:
        vo = N('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 1400.0; L(tc.outputs['Object'], vo.inputs['Vector'])
        h = vo.outputs['Distance']; bs = stipple
    else:
        n3 = N('ShaderNodeTexNoise'); n3.inputs['Scale'].default_value = bump_scale; n3.inputs['Detail'].default_value = 4.0; L(tc.outputs['Object'], n3.inputs['Vector'])
        h = n3.outputs[0]; bs = bump
    bp = N('ShaderNodeBump'); bp.inputs['Strength'].default_value = bs; bp.inputs['Distance'].default_value = 0.0004; L(h, bp.inputs['Height'])
    bv = N('ShaderNodeBevel'); bv.samples = 8; bv.inputs['Radius'].default_value = 0.0006; L(bv.outputs['Normal'], bp.inputs['Normal'])
    L(bp.outputs['Normal'], b.inputs['Normal'])
    SM[name] = {'base': c2, 'metal': met, 'bsdf': b}
    return m

def materials():
    M = {}
    M['cer'] = _mat('w_cerakote', (0.026, 0.027, 0.029), 0.0, 0.62, wear=0.85, wear_col=(0.42, 0.43, 0.45), dirt=0.6, bump=0.05)
    M['opt'] = _mat('w_eloxal', (0.034, 0.036, 0.04), 0.6, 0.42, wear=0.6, wear_col=(0.55, 0.56, 0.58), dirt=0.5, bump=0.02)
    M['steel'] = _mat('w_stahl', (0.05, 0.051, 0.053), 0.85, 0.5, wear=0.7, wear_col=(0.45, 0.46, 0.47), dirt=0.8, bump=0.06)
    M['bolt'] = _mat('w_verschluss', (0.52, 0.52, 0.53), 1.0, 0.22, wear=0.2, wear_col=(0.7, 0.7, 0.72), wear_rough=0.15, dirt=1.0, bump=0.01)
    M['poly'] = _mat('w_polymer', (0.040, 0.043, 0.032), 0.0, 0.72, wear=0.35, wear_col=(0.085, 0.09, 0.07), wear_metal=0.0, wear_rough=0.6, dirt=0.7, bump=0.08)
    M['grip'] = _mat('w_griff', (0.038, 0.041, 0.030), 0.0, 0.8, wear=0.3, wear_col=(0.08, 0.085, 0.065), wear_metal=0.0, wear_rough=0.65, dirt=0.7, stipple=0.35)
    M['rub'] = _mat('w_gummi', (0.014, 0.014, 0.015), 0.0, 0.88, wear=0.1, wear_col=(0.04, 0.04, 0.04), wear_metal=0.0, wear_rough=0.8, dirt=0.4, stipple=0.2)
    M['paint'] = _mat('w_farbe', (0.62, 0.62, 0.6), 0.0, 0.6, wear=0.5, wear_col=(0.2, 0.2, 0.2), wear_metal=0.0, wear_rough=0.6, dirt=0.3, bump=0.0)
    M['red'] = _mat('w_rot', (0.4, 0.025, 0.012), 0.0, 0.5, wear=0.3, wear_col=(0.2, 0.05, 0.04), wear_metal=0.0, dirt=0.3, bump=0.0)
    for n, (c, e) in {'ext_glas': ((0.02, 0.03, 0.035), 0), 'ext_leucht': ((1.0, 0.08, 0.03), 6), 'ext_lampe': ((1.0, 0.95, 0.85), 3)}.items():
        m = bpy.data.materials.get(n) or bpy.data.materials.new(n); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = 0.05
        if e: b.inputs['Emission Color'].default_value = (*c, 1); b.inputs['Emission Strength'].default_value = e
        else: b.inputs['Metallic'].default_value = 0.0; b.inputs['Coat Weight'].default_value = 1.0
        M[n] = m
    return M

# ------------------------------------------------------------------ Grundformen
def _link(ob):
    COL.objects.link(ob); return ob
def _obj(name, bm, mat, bevel=0.0008, seg=2, angle=32, smooth=True):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = _link(bpy.data.objects.new(name, me)); me.materials.append(mat)
    for p in me.polygons: p.use_smooth = smooth
    if bevel > 0:
        md = ob.modifiers.new('fase', 'BEVEL'); md.width = bevel; md.segments = seg; md.limit_method = 'ANGLE'; md.angle_limit = math.radians(angle)
        md.harden_normals = True; md.use_clamp_overlap = True; md.miter_outer = 'MITER_ARC'
    return ob

def _extrude(bm, f, vec):
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, verts=[e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)], vec=vec)

def prism_y(name, pts, y0, y1, mat, **k):
    """Querschnitt (x, z) längs Y gezogen."""
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new((x, y0, z)) for x, z in pts]); _extrude(bm, f, (0, y1 - y0, 0)); return _obj(name, bm, mat, **k)
def prism_x(name, pts, x0, x1, mat, **k):
    """Seitenriss (y, z) quer gezogen (von x0 bis x1)."""
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new((x0, y, z)) for y, z in pts]); _extrude(bm, f, (x1 - x0, 0, 0)); return _obj(name, bm, mat, **k)
def prism_z(name, pts, z0, z1, mat, **k):
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new((x, y, z0)) for x, y in pts]); _extrude(bm, f, (0, 0, z1 - z0)); return _obj(name, bm, mat, **k)
def rbox(name, lo, hi, mat, **k):
    x0, y0, z0 = lo; x1, y1, z1 = hi
    return prism_y(name, [(x0, z0), (x1, z0), (x1, z1), (x0, z1)], y0, y1, mat, **k)
def cyl(name, a, b, r, mat, seg=32, r2=None, **k):
    a, b = Vector(a), Vector(b); d = b - a
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=d.length)
    M = Matrix.Translation((a + b) / 2) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return _obj(name, bm, mat, **k)
def lathe(name, prof, mat, axis='Y', c=(0, 0, 0), seg=40, **k):
    """Drehkörper: prof = [(entlang, radius)], Achse durch c."""
    bm = bmesh.new(); rings = []
    for t, r in prof:
        if r < 1e-7: rings.append([bm.verts.new((0, 0, t))])
        else: rings.append([bm.verts.new((r * math.cos(2 * math.pi * i / seg), r * math.sin(2 * math.pi * i / seg), t)) for i in range(seg)])
    for A, B in zip(rings, rings[1:]):
        if len(A) == 1 and len(B) == 1: continue
        for i in range(seg):
            j = (i + 1) % seg
            if len(A) == 1: bm.faces.new((A[0], B[j], B[i]))
            elif len(B) == 1: bm.faces.new((A[i], A[j], B[0]))
            else: bm.faces.new((A[i], A[j], B[j], B[i]))
    R = {'Y': Matrix.Rotation(-math.pi / 2, 4, 'X'), 'X': Matrix.Rotation(math.pi / 2, 4, 'Y'), 'Z': Matrix.Identity(4)}[axis]
    bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ R, verts=bm.verts)
    return _obj(name, bm, mat, **k)
def capsule(c, u, n, L, W, D, seg=8):
    """Schlitz-Schneidkörper: Mitte c, Längsrichtung u, Flächennormale n (zeigt aus dem Teil), Länge L, Breite W, Tiefe D (in das Teil)."""
    c, u, n = Vector(c), Vector(u).normalized(), Vector(n).normalized(); v = n.cross(u)
    r = W / 2; pts = []
    for s, a0 in ((1, -90), (-1, 90)):
        for i in range(seg + 1):
            a = math.radians(a0 + 180 * i / seg); pts.append(u * (s * (L / 2 - r) + r * math.cos(a)) + v * (r * math.sin(a)))
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new(c + p + n * 0.004) for p in pts]); _extrude(bm, f, -n * (D + 0.004))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def cut(ob, bms):
    """Zieht Schneidkörper (Liste von bmesh) vom Objekt ab (exakter Boolean, sofort angewendet; Fasen danach)."""
    bm = bmesh.new()
    for b in bms:
        me = bpy.data.meshes.new('tmp'); b.to_mesh(me); b.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    me = bpy.data.meshes.new('schnitt'); bm.to_mesh(me); bm.free()
    cutter = bpy.data.objects.new('schnitt', me); COL.objects.link(cutter); cutter.hide_render = True
    md = ob.modifiers.new('schnitt', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.solver = 'EXACT'; md.object = cutter
    # Boolean vor die Fase stellen
    while ob.modifiers.find('schnitt') > 0: ob.modifiers.move(ob.modifiers.find('schnitt'), ob.modifiers.find('schnitt') - 1)
    dg = bpy.context.evaluated_depsgraph_get()
    fase = ob.modifiers.get('fase'); show = fase.show_viewport if fase else None
    if fase: fase.show_viewport = False
    dg.update(); new = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    old = ob.data; ob.data = new; ob.modifiers.remove(ob.modifiers['schnitt'])
    if fase: fase.show_viewport = show
    for p in new.polygons: p.use_smooth = True
    bpy.data.meshes.remove(old); bpy.data.objects.remove(cutter, do_unlink=True); bpy.data.meshes.remove(me)
    return ob

def text(name, s, size, loc, normal, right, mat, depth=0.00012, align='CENTER'):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.size = size; cu.extrude = depth; cu.align_x = align; cu.align_y = 'CENTER'; cu.resolution_u = 3
    tmp = bpy.data.objects.new(name, cu); COL.objects.link(tmp)
    n, r = Vector(normal).normalized(), Vector(right).normalized(); up = n.cross(r)
    tmp.matrix_world = Matrix.Translation(Vector(loc) + n * depth) @ Matrix((r, up, n)).transposed().to_4x4()
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg)); mw = tmp.matrix_world.copy()
    bpy.data.objects.remove(tmp, do_unlink=True); bpy.data.curves.remove(cu)
    ob = _link(bpy.data.objects.new(name, me)); ob.matrix_world = mw; me.materials.clear(); me.materials.append(mat)
    return ob

# ------------------------------------------------------------------ Teile
RX, LX = (1, 0, 0), (-1, 0, 0)
FWD, BACK = (0, 1, 0), (0, -1, 0)

def upper(M):
    UR = [(-0.0165, 0.013), (0.0165, 0.013), (0.0165, 0.056), (0.0125, 0.0655), (0.008, 0.068), (-0.008, 0.068), (-0.0125, 0.0655), (-0.0165, 0.056)]
    ob = prism_y('oberteil', UR, -0.104, 0.153, M['cer'], bevel=0.0009)
    cs = [capsule((0.0165, 0.043, 0.041), FWD, RX, 0.064, 0.024, 0.0085, seg=4)]                     # Auswurföffnung
    cs.append(capsule((0.0165, -0.060, 0.060), FWD, RX, 0.05, 0.0028, 0.0008))                         # Zierfuge
    cs.append(capsule((-0.0165, -0.040, 0.060), FWD, LX, 0.11, 0.0028, 0.0008))
    cut(ob, cs)
    # Verschluss (vernickelt) in der Öffnung, Kammerstück und Ausziehkralle
    cyl('verschluss', (0, 0.006, BZ + 0.001), (0, 0.082, BZ + 0.001), 0.0104, M['bolt'], seg=40)
    rbox('kammer', (0.0085, 0.040, BZ + 0.006), (0.0118, 0.050, BZ + 0.010), M['bolt'], bevel=0.0006)
    rbox('kralle', (0.0080, 0.066, BZ - 0.007), (0.0112, 0.076, BZ - 0.003), M['steel'], bevel=0.0004)
    # Staubschutzdeckel, geöffnet unter der Öffnung hängend, mit Rippen und Scharnier
    cyl('scharnier', (0.0172, 0.008, 0.0275), (0.0172, 0.078, 0.0275), 0.0017, M['steel'], seg=16)
    d = prism_y('deckel', [(0.0, 0.0), (0.0016, 0.0), (0.0016, -0.017), (0.0, -0.017)], 0.010, 0.076, M['cer'], bevel=0.0004)
    d.location = (0.0172, 0, 0.0275); d.rotation_euler = (0, math.radians(-24), 0)
    for y in (0.022, 0.034, 0.046, 0.058):
        rr = rbox('deckelrippe', (0.0016, y, -0.015), (0.0026, y + 0.004, -0.003), M['cer'], bevel=0.0003); rr.parent = d
    # Hülsenabweiser hinter der Öffnung
    prism_z('abweiser', [(0.0160, -0.010), (0.0160, 0.009), (0.0225, 0.004), (0.0225, -0.004)], 0.033, 0.056, M['cer'], bevel=0.0008)
    # Verstärkungsleisten an den Seiten
    for s in (-1, 1):
        prism_y('leiste', [(s * 0.0160, 0.0225), (s * 0.0176, 0.0235), (s * 0.0176, 0.0285), (s * 0.0160, 0.0295)][::s], -0.098, 0.004 if s > 0 else 0.146, M['cer'], bevel=0.0005)
    # Spannhebel hinten
    prism_y('spannhebel', [(-0.026, 0.060), (0.026, 0.060), (0.026, 0.0685), (0.007, 0.0715), (-0.007, 0.0715), (-0.026, 0.0685)], -0.123, -0.108, M['cer'], bevel=0.0012)
    rbox('spannhebel_steg', (-0.006, -0.110, 0.058), (0.006, -0.100, 0.068), M['cer'], bevel=0.0005)
    for s in (-1, 1):
        for i in range(4): rbox('riffel', (s * 0.0262 - 0.0006, -0.1215 + i * 0.0034, 0.0605), (s * 0.0262 + 0.0006, -0.1197 + i * 0.0034, 0.0680), M['cer'], bevel=0.0002)
    rbox('spannhebel_klinke', (-0.031, -0.121, 0.0605), (-0.026, -0.111, 0.0665), M['cer'], bevel=0.0006)

def rail(M):
    prism_y('schiene_grund', [(-0.0080, 0.0675), (0.0080, 0.0675), (0.0080, 0.0712), (-0.0080, 0.0712)], -0.100, 0.392, M['cer'], bevel=0.0004)
    T = [(-0.0080, 0.0690), (0.0080, 0.0690), (0.0106, 0.0716), (0.0106, 0.0728), (0.0096, 0.0738), (-0.0096, 0.0738), (-0.0106, 0.0728), (-0.0106, 0.0716)]
    y = -0.100; k = 0
    while y < 0.388:
        prism_y('schiene_zahn', T, y, y + 0.0052, M['cer'], bevel=0.00035, seg=1)
        y += 0.010; k += 1
    return k

def handguard(M):
    HG = [(-0.0105, 0.012), (0.0105, 0.012), (0.0215, 0.023), (0.0215, 0.057), (0.0105, 0.068), (-0.0105, 0.068), (-0.0215, 0.057), (-0.0215, 0.023)]
    ob = prism_y('handschutz', HG, 0.153, 0.392, M['cer'], bevel=0.0010)
    cs = []
    for y in (0.192, 0.236, 0.280, 0.324, 0.366):
        for s in (-1, 1):
            if not (s == 1 and y == 0.324): cs.append(capsule((s * 0.0215, y, 0.040), FWD, (s, 0, 0), 0.030, 0.0072, 0.0035))
            cs.append(capsule((s * 0.0160, y, 0.0175), FWD, (s * 0.7071, 0, -0.7071), 0.030, 0.0060, 0.0030))
        cs.append(capsule((0.0, y, 0.012), FWD, (0, 0, -1), 0.030, 0.0072, 0.0030))
    for y in (0.200, 0.250, 0.300, 0.350):                         # Kühlbohrungen oben schräg
        for s in (-1, 1): cs.append(capsule((s * 0.0160, y, 0.0625), FWD, (s * 0.7071, 0, 0.7071), 0.016, 0.0045, 0.0025))
    cut(ob, cs)
    # Schrauben hinten am Handschutz, Halteringe vorn, Stirnring
    for s in (-1, 1):
        for z in (0.030, 0.050):
            cyl('schraube', (s * 0.0213, 0.164, z), (s * 0.0228, 0.164, z), 0.0029, M['steel'], seg=20, bevel=0.0003)
            cyl('schraube_inbus', (s * 0.0226, 0.164, z), (s * 0.0232, 0.164, z), 0.0013, M['rub'], seg=6, bevel=0)
    lathe('stirnring', [(0.389, 0.0), (0.389, 0.0128), (0.396, 0.0128), (0.398, 0.0108), (0.398, 0.0)], M['cer'], c=(0, 0, BZ), seg=36, bevel=0.0004)
    # Handstopp unten vorn
    prism_x('handstopp', [(0.335, 0.0125), (0.374, 0.0125), (0.370, 0.000), (0.352, -0.008), (0.340, -0.006)], -0.0075, 0.0075, M['poly'], bevel=0.0022, seg=3)
    # Riemenöse links vorn
    cyl('riemen', (-0.0215, 0.372, 0.040), (-0.0275, 0.372, 0.040), 0.0060, M['steel'], seg=24, bevel=0.0004)
    cyl('riemen_loch', (-0.0274, 0.372, 0.040), (-0.0280, 0.372, 0.040), 0.0032, M['rub'], seg=16, bevel=0)

def barrel(M):
    cyl('lauf', (0, 0.390, BZ), (0, 0.500, BZ), 0.0086, M['steel'], seg=36, bevel=0.0003)
    lathe('laufmutter', [(0.492, 0.0), (0.492, 0.0108), (0.500, 0.0108), (0.500, 0.0)], M['steel'], c=(0, 0, BZ), seg=6, bevel=0.0005)
    ob = lathe('bremse', [(0.499, 0.0), (0.499, 0.0112), (0.503, 0.0127), (0.552, 0.0127), (0.556, 0.0118), (0.5585, 0.0092), (0.5585, 0.0)], M['steel'], c=(0, 0, BZ), seg=40, bevel=0.0004)
    cs = []
    for y in (0.512, 0.524, 0.536):
        for s in (-1, 1): cs.append(capsule((s * 0.0127, y, BZ), (0, 0, 1), (s, 0, 0), 0.016, 0.0048, 0.0095, seg=4))
    for y in (0.545, 0.551):
        for x in (-0.004, 0.004): cs.append(capsule((x, y, BZ + 0.0127), FWD, (0, 0, 1), 0.0001 + 0.0036, 0.0036, 0.006, seg=6))
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0046, radius2=0.0046, depth=0.05)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0.56, BZ)) @ Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=bm.verts); cs.append(bm)
    cut(ob, cs)

def lower(M):
    LR = [(-0.104, 0.013), (0.153, 0.013), (0.153, 0.003), (0.126, 0.0), (0.104, -0.024), (0.101, -0.048), (0.034, -0.048), (0.031, -0.024),
          (0.026, -0.016), (-0.088, -0.016), (-0.104, -0.004)]
    ob = prism_x('unterteil', LR, -0.0155, 0.0155, M['cer'], bevel=0.0010)
    cs = [capsule((0.0155, 0.067, -0.032), FWD, RX, 0.052, 0.020, 0.0006, seg=6), capsule((-0.0155, 0.067, -0.032), FWD, LX, 0.052, 0.020, 0.0006, seg=6)]
    cut(ob, cs)
    prism_x('schacht_lippe', [(0.031, -0.040), (0.104, -0.040), (0.103, -0.049), (0.032, -0.049)], -0.0178, 0.0178, M['cer'], bevel=0.0012)
    # Abzugsbügel, Abzug
    TG = [(0.031, -0.024), (0.029, -0.043), (0.022, -0.0475), (-0.032, -0.0475), (-0.042, -0.040), (-0.047, -0.020), (-0.051, -0.020), (-0.046, -0.042), (-0.034, -0.0515),
          (0.024, -0.0515), (0.033, -0.046), (0.035, -0.024)]
    prism_x('buegel', TG, -0.0045, 0.0045, M['cer'], bevel=0.0012, seg=3)
    prism_x('abzug', [(0.006, -0.016), (0.009, -0.016), (0.008, -0.027), (0.005, -0.035), (0.000, -0.041), (-0.003, -0.040), (0.001, -0.034), (0.003, -0.026), (0.003, -0.018)],
            -0.0032, 0.0032, M['steel'], bevel=0.0009, seg=3)
    # Bolzen, Sicherung, Magazinhalter, Verschlussfang
    for y, z in ((0.140, 0.004), (-0.094, 0.004), (-0.004, -0.008), (0.012, -0.010)):
        cyl('bolzen', (-0.0168, y, z), (0.0168, y, z), 0.0034 if y in (0.140, -0.094) else 0.0024, M['steel'], seg=24, bevel=0.0003)
    cyl('sicherung_nabe', (0.0150, -0.064, 0.001), (0.0188, -0.064, 0.001), 0.0062, M['cer'], seg=28, bevel=0.0005)
    prism_x('sicherung_hebel', [(-0.066, 0.004), (-0.044, 0.0075), (-0.042, 0.0015), (-0.064, -0.002)], 0.0180, 0.0200, M['cer'], bevel=0.0007)
    cyl('magazinhalter', (0.0150, 0.113, -0.010), (0.0192, 0.113, -0.010), 0.0050, M['cer'], seg=28, bevel=0.0006)
    prism_x('halter_zaun', [(0.104, -0.019), (0.124, -0.002), (0.127, -0.006), (0.108, -0.022)], 0.0150, 0.0185, M['cer'], bevel=0.0006)
    prism_x('verschlussfang', [(0.120, 0.002), (0.145, 0.004), (0.146, -0.006), (0.124, -0.010)], -0.0185, -0.0150, M['cer'], bevel=0.0007)
    for i in range(4): rbox('fang_riffel', (-0.0192, 0.126 + i * 0.004, -0.007), (-0.0184, 0.128 + i * 0.004, 0.002), M['cer'], bevel=0.0002)
    # Gravur und Markierungen
    text('t_typ', 'K-12', 0.0075, (0.01562, 0.066, -0.0275), RX, FWD, M['paint'])
    text('t_marke', 'HAMMERWERK', 0.0030, (0.01562, 0.066, -0.0360), RX, FWD, M['paint'])
    text('t_kal', 'KAL. 6,8 x 43  ·  GRENZLAND', 0.0021, (0.01562, 0.066, -0.0415), RX, FWD, M['paint'])
    text('t_s', 'SICHER', 0.0021, (0.0186, -0.075, 0.0095), RX, FWD, M['paint'])
    text('t_e', 'EINZEL', 0.0021, (0.0186, -0.051, 0.0100), RX, FWD, M['paint'])
    text('t_f', 'FEUER', 0.0021, (0.0186, -0.064, -0.0090), RX, FWD, M['red'])
    text('t_nr', 'Nr. 04-1217', 0.0024, (-0.01562, 0.066, -0.0300), LX, BACK, M['paint'])
    text('t_marke_l', 'HAMMERWERK', 0.0042, (-0.01562, 0.066, -0.0380), LX, BACK, M['paint'])
    text('t_ober', 'K-12  ·  6,8 x 43', 0.0023, (0.01652, -0.040, 0.020), RX, FWD, M['paint'])
    # Sechseck-Zeichen von Hammerwerk links
    bm = bmesh.new(); vs = [bm.verts.new((-0.0156, 0.092 + 0.0055 * math.cos(math.radians(30 + 60 * i)), -0.033 + 0.0055 * math.sin(math.radians(30 + 60 * i)))) for i in range(6)]
    f = bm.faces.new(vs); _extrude(bm, f, (-0.00025, 0, 0)); _obj('zeichen', bm, M['paint'], bevel=0)
    text('t_zeichen', 'H', 0.0062, (-0.01586, 0.092, -0.033), LX, BACK, M['cer'], depth=0.0001)

def grip_mag_stock(M):
    PG = [(-0.044, -0.014), (-0.088, -0.014), (-0.096, -0.022), (-0.098, -0.040), (-0.104, -0.080), (-0.108, -0.116), (-0.104, -0.124), (-0.066, -0.126), (-0.062, -0.118),
          (-0.058, -0.096), (-0.056, -0.082), (-0.052, -0.072), (-0.054, -0.060), (-0.050, -0.040), (-0.046, -0.026)]
    prism_x('griff', PG, -0.0145, 0.0145, M['grip'], bevel=0.0060, seg=4, angle=40)
    prism_x('griff_boden', [(-0.104, -0.1225), (-0.066, -0.1245), (-0.0662, -0.1285), (-0.105, -0.1265)], -0.0120, 0.0120, M['poly'], bevel=0.0012)
    # Magazin, gebogen
    def edge(y0, d): return (y0 + 1.35 * d * d, -0.030 - d)
    ds = [i * 0.17 / 12 for i in range(13)]
    prof = [edge(0.0985, d) for d in ds] + [edge(0.0355, d) for d in reversed(ds)]
    prism_x('magazin', prof, -0.0115, 0.0115, M['poly'], bevel=0.0018, seg=3)
    for d in (0.100, 0.116, 0.132, 0.148):
        r0, f0, f1, r1 = edge(0.0355, d), edge(0.0985, d), edge(0.0985, d + 0.005), edge(0.0355, d + 0.005)
        prism_x('magazin_rippe', [(r0[0] + 0.004, r0[1]), (f0[0] - 0.004, f0[1]), (f1[0] - 0.004, f1[1]), (r1[0] + 0.004, r1[1])], -0.0124, 0.0124, M['poly'], bevel=0.0008)
    a, b = edge(0.0355, 0.168), edge(0.0985, 0.168); c, e = edge(0.0985, 0.182), edge(0.0355, 0.182)
    prism_x('magazin_boden', [(a[0] - 0.002, a[1]), (b[0] + 0.004, b[1]), (c[0] + 0.004, c[1]), (e[0] - 0.002, e[1])], -0.0136, 0.0136, M['poly'], bevel=0.0018, seg=3)
    p = edge(0.067, 0.06)
    text('t_mag', '30', 0.0048, (0.01152, p[0], p[1]), RX, FWD, M['paint'])
    # Schaft: Puffferrohr, Endplatte, Mutter, Schaftkörper, Kappe
    cyl('pufferrohr', (0, -0.104, 0.033), (0, -0.300, 0.033), 0.0155, M['cer'], seg=40, bevel=0.0004)
    lathe('endplatte', [(-0.104, 0.0), (-0.104, 0.0195), (-0.109, 0.0195), (-0.109, 0.0)], M['steel'], c=(0, 0, 0.033), seg=40, bevel=0.0004)
    ob = lathe('mutter', [(-0.109, 0.0), (-0.109, 0.0190), (-0.118, 0.0190), (-0.118, 0.0)], M['steel'], c=(0, 0, 0.033), seg=40, bevel=0.0004)
    cut(ob, [capsule((0.019 * math.cos(math.radians(a)), -0.1135, 0.033 + 0.019 * math.sin(math.radians(a))), (math.cos(math.radians(a + 90)), 0, math.sin(math.radians(a + 90))),
                     (math.cos(math.radians(a)), 0, math.sin(math.radians(a))), 0.0045, 0.0040, 0.0025, seg=3) for a in range(0, 360, 60)])
    ST = [(-0.196, 0.054), (-0.336, 0.058), (-0.341, -0.050), (-0.320, -0.063), (-0.292, -0.032), (-0.244, 0.010), (-0.200, 0.014)]
    prism_x('schaft', ST, -0.0185, 0.0185, M['poly'], bevel=0.0042, seg=3, angle=40)
    prism_x('schaft_wange', [(-0.215, 0.054), (-0.320, 0.057), (-0.318, 0.068), (-0.228, 0.064)], -0.0165, 0.0165, M['poly'], bevel=0.0040, seg=3, angle=40)
    prism_x('schaftkappe', [(-0.3395, 0.060), (-0.352, 0.061), (-0.354, -0.052), (-0.341, -0.066), (-0.3395, -0.050)], -0.0192, 0.0192, M['rub'], bevel=0.0040, seg=3, angle=40)
    prism_x('schaft_hebel', [(-0.215, 0.014), (-0.262, 0.012), (-0.262, 0.004), (-0.222, 0.006)], -0.0060, 0.0060, M['poly'], bevel=0.0015)
    cyl('schaft_riemen', (0.0185, -0.300, 0.030), (0.0225, -0.300, 0.030), 0.0058, M['steel'], seg=24, bevel=0.0004)

def optic(M):
    # Montage mit Klemmbacken und Schnellspannhebel
    rbox('optik_basis', (-0.0145, 0.002, 0.0738), (0.0145, 0.086, 0.0815), M['opt'], bevel=0.0010)
    for s in (-1, 1):
        prism_y('optik_backe', [(s * 0.0104, 0.0690), (s * 0.0150, 0.0690), (s * 0.0150, 0.0745), (s * 0.0104, 0.0745)][::s], 0.010, 0.078, M['opt'], bevel=0.0006)
    prism_x('optik_hebel', [(0.016, 0.0675), (0.064, 0.0700), (0.066, 0.0765), (0.018, 0.0770)], 0.0150, 0.0178, M['opt'], bevel=0.0009)
    cyl('optik_hebel_achse', (0.0148, 0.022, 0.0722), (0.0185, 0.022, 0.0722), 0.0032, M['steel'], seg=20, bevel=0.0003)
    # Gehäuse hinten (Batterie, Tasten)
    H = [(-0.0170, 0.0812), (0.0170, 0.0812), (0.0170, 0.1100), (0.0122, 0.1180), (-0.0122, 0.1180), (-0.0170, 0.1100)]
    prism_y('optik_gehaeuse', H, 0.002, 0.042, M['opt'], bevel=0.0016, seg=3)
    hood = prism_y('optik_haube', [(-0.0172, 0.0812), (0.0172, 0.0812), (0.0172, 0.1110), (0.0124, 0.1192), (-0.0124, 0.1192), (-0.0172, 0.1110)], 0.040, 0.091, M['opt'], bevel=0.0014, seg=3)
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new((x, 0.030, z)) for x, z in ((-0.0128, 0.0852), (0.0128, 0.0852), (0.0128, 0.1130), (-0.0128, 0.1130))]); _extrude(bm, f, (0, 0.08, 0))
    cut(hood, [bm])
    for x, lab in ((-0.0075, 'up'), (0.0, 'nv'), (0.0075, 'dn')):
        rbox('optik_taste', (x - 0.0028, 0.0002, 0.0935), (x + 0.0028, 0.0024, 0.1015), M['rub'], bevel=0.0010, seg=2)
    text('t_auf', '+', 0.0040, (-0.0075, 0.00005, 0.0870), BACK, LX, M['paint'])
    text('t_ab', '-', 0.0040, (0.0075, 0.00005, 0.0870), BACK, LX, M['paint'])
    text('t_nv', 'NV', 0.0026, (0.0, 0.00005, 0.0870), BACK, LX, M['paint'])
    lathe('optik_batterie', [(0.0170, 0.0), (0.0170, 0.0078), (0.0215, 0.0078), (0.0222, 0.0068), (0.0222, 0.0)], M['opt'], axis='X', c=(0, 0.022, 0.0985), seg=24, bevel=0.0003)
    for i in range(12):
        a = 2 * math.pi * i / 12
        rbox('optik_batt_riffel', (0.0200, 0.022 + 0.0079 * math.cos(a) - 0.0007, 0.0985 + 0.0079 * math.sin(a) - 0.0007), (0.0218, 0.022 + 0.0079 * math.cos(a) + 0.0007, 0.0985 + 0.0079 * math.sin(a) + 0.0007), M['opt'], bevel=0)
    lathe('optik_turm', [(-0.0172, 0.0), (-0.0172, 0.0055), (-0.0205, 0.0055), (-0.0210, 0.0048), (-0.0210, 0.0)], M['opt'], axis='X', c=(0, 0.066, 0.0965), seg=20, bevel=0.0003)
    text('t_lotse', 'LOTSE', 0.0042, (0.01722, 0.066, 0.0965), RX, FWD, M['paint'])
    text('t_lotse2', 'HOLO-4', 0.0022, (0.01722, 0.066, 0.0905), RX, FWD, M['paint'])
    # Glas und Absehen (eigene Materialien, werden nicht gebacken)
    rbox('glas_hinten', (-0.0128, 0.0425, 0.0852), (0.0128, 0.0438, 0.1130), M['ext_glas'], bevel=0)
    rbox('glas_vorn', (-0.0128, 0.0880, 0.0852), (0.0128, 0.0893, 0.1130), M['ext_glas'], bevel=0)
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, cap_ends=True, segments=20, radius=0.0007)
    r = bmesh.ops.create_circle(bm, cap_ends=False, segments=36, radius=0.0042)
    inner = bmesh.ops.create_circle(bm, cap_ends=False, segments=36, radius=0.0036)
    ring = r['verts'] + inner['verts']
    for i in range(36):
        a0, a1 = r['verts'][i], r['verts'][(i + 1) % 36]; b0, b1 = inner['verts'][i], inner['verts'][(i + 1) % 36]; bm.faces.new((a0, a1, b1, b0))
    bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0.0442, 0.0990)) @ Matrix.Rotation(math.pi / 2, 4, 'X'), verts=bm.verts)
    ab = _obj('absehen', bm, M['ext_leucht'], bevel=0, smooth=False)

def rails_sights_light(M):
    # Klappvisiere, umgelegt
    for y0, y1, name in ((-0.098, -0.068, 'kimme'), (0.352, 0.384, 'korn')):
        rbox(name + '_basis', (-0.0112, y0, 0.0738), (0.0112, y1, 0.0805), M['cer'], bevel=0.0010)
        rbox(name + '_blatt', (-0.0085, y0 + 0.003, 0.0805), (0.0085, y1 - 0.003, 0.0840), M['cer'], bevel=0.0010)
        cyl(name + '_achse', (-0.0118, y1 - 0.004, 0.0790), (0.0118, y1 - 0.004, 0.0790), 0.0024, M['steel'], seg=16, bevel=0.0002)
    cyl('kimme_loch', (0, -0.085, 0.0839), (0, -0.085, 0.0842), 0.0018, M['rub'], seg=16, bevel=0)
    # Waffenlampe rechts am Handschutz
    rbox('lampe_halter', (0.0213, 0.306, 0.031), (0.0262, 0.346, 0.049), M['cer'], bevel=0.0010)
    cyl('lampe_schraube', (0.0258, 0.326, 0.040), (0.0275, 0.326, 0.040), 0.0030, M['steel'], seg=6, bevel=0.0003)
    LC = (0.0355, 0, BZ)
    lathe('lampe_koerper', [(0.288, 0.0), (0.288, 0.0080), (0.291, 0.0106), (0.346, 0.0106), (0.353, 0.0136), (0.380, 0.0136), (0.3825, 0.0124), (0.3825, 0.0)],
          M['cer'], c=LC, seg=40, bevel=0.0005)
    for i in range(14):
        a = 2 * math.pi * i / 14
        p = Vector(LC) + Vector((math.cos(a) * 0.0136, 0, math.sin(a) * 0.0136))
        rbox('lampe_rippe', (p.x - 0.0011, 0.356, p.z - 0.0011), (p.x + 0.0011, 0.377, p.z + 0.0011), M['cer'], bevel=0.0002)
    lathe('lampe_taster', [(0.2835, 0.0), (0.2835, 0.0060), (0.2885, 0.0072), (0.2885, 0.0)], M['rub'], c=LC, seg=28, bevel=0.0005)
    for y in (0.300, 0.312, 0.324, 0.336):
        lathe('lampe_rille', [(y, 0.0), (y, 0.0109), (y + 0.0035, 0.0109), (y + 0.0035, 0.0)], M['cer'], c=LC, seg=40, bevel=0.0002)
    text('t_lampe', 'LOTSE  L2', 0.0022, (LC[0], 0.320, LC[2] + 0.01095), (0, 0, 1), FWD, M['paint'])
    lathe('lampe_glas', [(0.3824, 0.0), (0.3824, 0.0112), (0.3832, 0.0112), (0.3832, 0.0)], M['ext_lampe'], c=LC, seg=32, bevel=0)

def build():
    global COL
    c = bpy.data.collections.get(COLL)
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        c = bpy.data.collections.new(COLL); bpy.context.scene.collection.children.link(c)
    COL = c
    M = materials()
    upper(M); teeth = rail(M); handguard(M); barrel(M); lower(M); grip_mag_stock(M); optic(M); rails_sights_light(M)
    for n, p in (('muendung', (0, 0.5585, BZ)), ('licht', (0.0355, 0.3835, BZ))):
        e = bpy.data.objects.new(n, None); e.empty_display_size = 0.01; e.location = p; COL.objects.link(e)
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    tris = 0
    for o in COL.objects:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); tris += len(me.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return {'parts': len(COL.objects), 'tris': tris, 'teeth': teeth}

# ------------------------------------------------------------------ Zusammenfügen, Texturkoordinaten, Backen
SEP = ('ext_glas', 'ext_leucht', 'ext_lampe')
def _ctx():
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    return dict(window=win, area=area, region=region)

def _apply(o):
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); mw = o.matrix_world.copy()
    old = o.data; o.modifiers.clear(); o.data = me; o.parent = None; o.matrix_world = mw
    if old and old.users == 0: bpy.data.meshes.remove(old)

def prepare(margin=0.0035):
    global COL
    COL = bpy.data.collections[COLL]
    obs = [o for o in COL.objects if o.type == 'MESH']
    for o in obs: _apply(o)
    groups = {'waffe': [o for o in obs if o.data.materials[0].name not in SEP]}
    for n, mname in (('glas', 'ext_glas'), ('absehen', 'ext_leucht'), ('lampenglas', 'ext_lampe')):
        groups[n] = [o for o in obs if o.data.materials[0].name == mname]
    out = {}
    for name, g in groups.items():
        if not g: continue
        for q in bpy.context.scene.objects: q.select_set(False)
        for o in g: o.select_set(True)
        with bpy.context.temp_override(**_ctx(), active_object=g[0], object=g[0], selected_objects=g, selected_editable_objects=g):
            bpy.ops.object.join()
        g[0].name = name; g[0].data.name = name
        bpy.context.view_layer.objects.active = g[0]
        with bpy.context.temp_override(**_ctx(), active_object=g[0], object=g[0], selected_objects=[g[0]], selected_editable_objects=[g[0]]):
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        out[name] = len(g[0].data.polygons)
    w = bpy.data.objects['waffe']
    for q in bpy.context.scene.objects: q.select_set(False)
    w.select_set(True); bpy.context.view_layer.objects.active = w
    with bpy.context.temp_override(**_ctx(), active_object=w, object=w, selected_objects=[w], selected_editable_objects=[w]):
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.pack_islands(rotate=True, margin=margin, shape_method='CONCAVE')
        bpy.ops.object.mode_set(mode='OBJECT')
    return out

BAKE = {}
def _img(name, srgb, size):
    im = bpy.data.images.get(name)
    if im and tuple(im.size) != (size, size): bpy.data.images.remove(im); im = None
    if not im: im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=not srgb)
    im.colorspace_settings.name = 'sRGB' if srgb else 'Non-Color'
    return im

def bake_start(size=2048, samples=16, done=None):
    """Backt nacheinander (über Zeitgeber, damit Blender zwischendurch antwortet). Fertig: Datei waffe_fertig.txt im Ordner tex_tmp."""
    w = bpy.data.objects['waffe']; sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.render.bake.margin = 10; sc.render.bake.target = 'IMAGE_TEXTURES'
    sc.render.bake.use_clear = True
    if not sc.world: sc.world = bpy.data.worlds.new('Welt')
    imgs = {k: _img('wb_' + k, k == 'col', size) for k in ('col', 'nrm', 'rough', 'metal', 'ao')}
    tmp = os.path.join(ROOT, 'asset-src', 'neu', 'mine', 'tex_tmp'); os.makedirs(tmp, exist_ok=True)
    flag = os.path.join(tmp, 'waffe_fertig.txt')
    if os.path.exists(flag): os.remove(flag)
    mats = [m for m in w.data.materials]
    nodes = {}
    for m in mats:
        nt = m.node_tree; n = nt.nodes.get('bake_tgt') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'bake_tgt'; nt.nodes.active = n; nodes[m.name] = n
    steps = [('ao', 'AO', {}), ('rough', 'ROUGHNESS', {}), ('nrm', 'NORMAL', {'normal_space': 'TANGENT'}), ('col', 'EMIT', {'emit': 'base'}), ('metal', 'EMIT', {'emit': 'metal'})]
    state = {'i': 0, 'log': []}
    def emit_hook(kind):
        saved = []
        for m in mats:
            nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            em = nt.nodes.new('ShaderNodeEmission'); em.name = 'bake_emit'
            nt.links.new(SM[m.name][kind], em.inputs['Color']); saved.append((m, out.inputs['Surface'].links[0].from_socket))
            nt.links.new(em.outputs[0], out.inputs['Surface'])
        return saved
    def emit_unhook(saved):
        for m, sock in saved:
            nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            nt.links.new(sock, out.inputs['Surface']); nt.nodes.remove(nt.nodes['bake_emit'])
    def job():
        import time
        if state['i'] >= len(steps):
            finish(); return None
        key, typ, opt = steps[state['i']]; t = time.time()
        for m in mats: nodes[m.name].image = imgs[key]; m.node_tree.nodes.active = nodes[m.name]
        saved = emit_hook(opt['emit']) if 'emit' in opt else None
        for q in sc.objects: q.select_set(False)
        w.select_set(True); bpy.context.view_layer.objects.active = w
        try:
            with bpy.context.temp_override(**_ctx(), object=w, active_object=w, selected_objects=[w], selected_editable_objects=[w]):
                if typ == 'NORMAL': bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
                else: bpy.ops.object.bake(type=typ)
        except Exception as e:
            state['log'].append(repr(e))
        if saved: emit_unhook(saved)
        state['log'].append((key, round(time.time() - t, 1)))
        state['i'] += 1
        return 0.2
    def finish():
        import numpy as np
        n = size * size
        def px(im):
            a = np.empty(n * 4, np.float32); im.pixels.foreach_get(a); return a.reshape(n, 4)
        ao, ro, me = px(imgs['ao']), px(imgs['rough']), px(imgs['metal'])
        orm = np.ones((n, 4), np.float32); orm[:, 0] = ao[:, 0]; orm[:, 1] = ro[:, 0]; orm[:, 2] = me[:, 0]
        o = bpy.data.images.get('wb_orm') or bpy.data.images.new('wb_orm', size, size, alpha=False)
        o.colorspace_settings.name = 'Non-Color'; o.pixels.foreach_set(orm.ravel())
        for im, f in ((imgs['col'], 'waffe_col@2048.png'), (imgs['nrm'], 'waffe_nrm@2048.png'), (o, 'waffe_orm@2048.png')):
            im.filepath_raw = os.path.join(TEX, f); im.file_format = 'PNG'; im.save()
        with open(flag, 'w') as fh: fh.write(json.dumps(state['log']))
    bpy.app.timers.register(job, first_interval=0.5)
    return {'steps': len(steps), 'flag': flag}

def show_baked():
    """Ersetzt die Back-Materialien durch ein Material mit den gebackenen Bildern (zur Kontrolle in Blender und für den Export)."""
    w = bpy.data.objects['waffe']
    m = bpy.data.materials.get('ext_waffe') or bpy.data.materials.new('ext_waffe'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); L(b.outputs[0], out.inputs[0])
    def tex(f, data):
        im = bpy.data.images.load(os.path.join(TEX, f), check_existing=True); im.reload()
        if data: im.colorspace_settings.name = 'Non-Color'
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; return t
    c = tex('waffe_col@2048.png', False); L(c.outputs[0], b.inputs['Base Color'])
    o = tex('waffe_orm@2048.png', True); sp = nt.nodes.new('ShaderNodeSeparateColor'); L(o.outputs[0], sp.inputs[0])
    L(sp.outputs[1], b.inputs['Roughness']); L(sp.outputs[2], b.inputs['Metallic'])
    n = tex('waffe_nrm@2048.png', True); nm = nt.nodes.new('ShaderNodeNormalMap'); L(n.outputs[0], nm.inputs['Color']); L(nm.outputs[0], b.inputs['Normal'])
    w.data.materials.clear(); w.data.materials.append(m)
    return {'faces': len(w.data.polygons)}

def export():
    sc = bpy.context.scene; obs = [bpy.data.objects[n] for n in ('waffe', 'glas', 'absehen', 'lampenglas', 'muendung', 'licht') if n in bpy.data.objects]
    for q in sc.objects: q.select_set(False)
    for o in obs: o.select_set(True)
    bpy.context.view_layer.objects.active = obs[0]
    path = os.path.join(ROOT, 'asset-src', 'glb', 'station', 'Mine_Waffe.glb')
    with bpy.context.temp_override(**_ctx(), active_object=obs[0], selected_objects=obs):
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_normals=True,
                                  export_image_format='NONE', export_materials='EXPORT', export_extras=False)
    return {'kb': round(os.path.getsize(path) / 1024)}
