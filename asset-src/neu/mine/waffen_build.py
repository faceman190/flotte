# Weitere Waffen für die Ich-Sicht, eigene Entwürfe von Hammerwerk (Bauweise wie waffe_build.py, dessen Hilfsfunktionen hier mitbenutzt werden).
#   IG-3 "Weitblick"  Impulsgewehr: zweifarbige Lackschalen, integriertes Zielfernrohr, Skelettschaft, Leuchtstreifen, Energiezellen-Magazin
#   EF-2 "Brecher"    Enterflinte, kompakt: Energiekern mit Leuchtring, Leuchtstreifen, Patronenfenster, Gitterschaft, Reflexvisier
# Laden in Mine.blend: ns = {}; exec(waffe_build.py, ns); exec(waffen_build.py, ns); ns['build_ig3']() bzw. ns['build_ef2']()
# Danach je Waffe: prepare_w(key) → bake_w(key) (wartet auf tex_tmp/<key>_fertig.txt) → show_w(key) → export_w(key)
# Ausgabe: asset-src/glb/station/Mine_W_<key>.glb (Knoten <key>, <key>_glas, <key>_absehen, <key>_licht), asset-src/tex/waffe_<key>_col/nrm/orm@2048.png
# Achsen wie beim K-12: +Y vorn, +Z oben, +X rechts, Ursprung am Abzug. Maße in Metern.
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix

RX, LX, FWD, BACK, UP = (1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1)

def materials2():
    M = materials()           # aus waffe_build.py: cer, opt, steel, bolt, poly, grip, rub, paint, red, ext_glas, ext_leucht, ext_lampe
    M['white'] = _mat('w_weiss', (0.60, 0.61, 0.62), 0.0, 0.38, wear=0.55, wear_col=(0.36, 0.37, 0.38), wear_metal=1.0, wear_rough=0.32, dirt=0.55, bump=0.012)
    M['graphit'] = _mat('w_graphit', (0.040, 0.042, 0.046), 0.0, 0.5, wear=0.5, wear_col=(0.11, 0.115, 0.12), wear_metal=0.0, wear_rough=0.45, dirt=0.6, bump=0.05)
    M['satin'] = _mat('w_satin', (0.10, 0.104, 0.11), 0.75, 0.4, wear=0.6, wear_col=(0.5, 0.51, 0.53), dirt=0.6, bump=0.02)
    M['orange'] = _mat('w_orange', (0.78, 0.2, 0.025), 0.0, 0.45, wear=0.55, wear_col=(0.06, 0.06, 0.065), wear_metal=0.0, wear_rough=0.5, dirt=0.4, bump=0.0)
    M['messing'] = _mat('w_messing', (0.55, 0.38, 0.12), 1.0, 0.32, wear=0.2, wear_col=(0.8, 0.65, 0.35), dirt=0.6, bump=0.0)
    m = bpy.data.materials.get('ext_licht') or bpy.data.materials.new('ext_licht'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (0.5, 0.75, 1.0, 1); b.inputs['Emission Color'].default_value = (0.5, 0.75, 1.0, 1); b.inputs['Emission Strength'].default_value = 8
    M['licht'] = m
    return M

def poly_x(pts, x0, x1):
    """Schneidkörper: Seitenriss (y, z) quer von x0 bis x1."""
    bm = bmesh.new(); f = bm.faces.new([bm.verts.new((x0, y, z)) for y, z in pts]); _extrude(bm, f, (x1 - x0, 0, 0))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
def boxcut(c, size, rot=(0, 0, 0)):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    M = Matrix.Translation(c) @ Matrix.Rotation(rot[2], 4, 'Z') @ Matrix.Rotation(rot[1], 4, 'Y') @ Matrix.Rotation(rot[0], 4, 'X') @ Matrix.Diagonal((*size, 1))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); return bm
def mirror_x(fn):
    for s in (-1, 1): fn(s)
def screw(name, c, n, M, r=0.0026, hexa=True):
    c, n = Vector(c), Vector(n).normalized()
    cyl(name, c - n * 0.0004, c + n * 0.0011, r, M['steel'], seg=20, bevel=0.0003)
    cyl(name + '_kopf', c + n * 0.0009, c + n * 0.0013, r * 0.45, M['rub'], seg=6 if hexa else 12, bevel=0)
def strip(name, a, b, z0, z1, x0, x1, M):
    """Leuchtstreifen (eigenes Material, wird nicht gebacken)."""
    return rbox(name, (x0, a, z0), (x1, b, z1), M['licht'], bevel=0)

def _new_coll(key):
    global COL
    c = bpy.data.collections.get(key)
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    else:
        c = bpy.data.collections.new(key); bpy.context.scene.collection.children.link(c)
    COL = c
    return c

def _count():
    dg = bpy.context.evaluated_depsgraph_get(); dg.update(); tris = 0
    for o in COL.objects:
        if o.type == 'MESH':
            me = o.evaluated_get(dg).to_mesh(); me.calc_loop_triangles(); tris += len(me.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    return {'parts': len(COL.objects), 'tris': tris}

# ====================================================================================================== IG-3 Weitblick
def build_ig3():
    _new_coll('ig3'); M = materials2(); BZ = 0.050
    # ---------- Kern des Gehäuses (Graphit) und weiße Lackschale
    core = prism_y('ig_kern', [(-0.020, 0.012), (0.020, 0.012), (0.022, 0.030), (0.022, 0.072), (0.016, 0.084), (-0.016, 0.084), (-0.022, 0.072), (-0.022, 0.030)],
                   -0.150, 0.332, M['graphit'], bevel=0.0012)
    cut(core, [capsule((s * 0.022, 0.020, 0.040), FWD, (s, 0, 0), 0.10, 0.006, 0.0012, seg=4) for s in (-1, 1)])
    shell = prism_y('ig_schale', [(-0.0232, 0.050), (0.0232, 0.050), (0.0232, 0.072), (0.0172, 0.0855), (-0.0172, 0.0855), (-0.0232, 0.072)],
                    -0.140, 0.304, M['white'], bevel=0.0009)
    cs = [boxcut((0, 0.318, 0.095), (0.08, 0.06, 0.03), (math.radians(-28), 0, 0)),               # vorn abgeschrägt
          boxcut((0, -0.152, 0.088), (0.08, 0.04, 0.03), (math.radians(30), 0, 0))]              # hinten abgeschrägt
    for s in (-1, 1):
        cs.append(capsule((s * 0.0232, 0.035, 0.0655), FWD, (s, 0, 0), 0.072, 0.0115, 0.006, seg=4))                    # Ladeöffnung
        cs.append(capsule((s * 0.0232, 0.08, 0.0575), FWD, (s, 0, 0), 0.40, 0.0018, 0.0010, seg=2))                     # Fuge
        cs.append(capsule((s * 0.0232, 0.105, 0.0768), FWD, (s, 0, 0), 0.30, 0.0016, 0.0009, seg=2))
        cs.append(capsule((s * 0.0232, -0.102, 0.0662), UP, (s, 0, 0), 0.020, 0.0016, 0.0009, seg=2))
        for i in range(7): cs.append(capsule((s * 0.0232, 0.135 + i * 0.0145, 0.0655), UP, (s, 0, 0), 0.0105, 0.0042, 0.0018, seg=3))   # Lüftung
        for i in range(4): cs.append(capsule((s * 0.0232, -0.118 + i * 0.011, 0.064), UP, (s, 0, 0), 0.006, 0.0026, 0.0012, seg=3))
    for i in range(5): cs.append(capsule((0, 0.08 + i * 0.03, 0.0855), (1, 0, 0), UP, 0.016, 0.0034, 0.0015, seg=3))   # oben quer
    cut(shell, cs)
    # Kammerstück in der Ladeöffnung, Spannhebel
    cyl('ig_kammer', (0, -0.005, 0.064), (0, 0.075, 0.064), 0.0135, M['satin'], seg=32, bevel=0.0004)
    rbox('ig_spann', (0.018, 0.046, 0.061), (0.030, 0.058, 0.069), M['satin'], bevel=0.0008)
    rbox('ig_spann_griff', (0.028, 0.044, 0.059), (0.034, 0.060, 0.071), M['rub'], bevel=0.0012)
    # Akzent und Markierungen
    for s in (-1, 1):
        rbox('ig_orange', (s * 0.0233 - 0.0005, 0.262, 0.0515), (s * 0.0233 + 0.0005, 0.296, 0.0545), M['orange'], bevel=0.0002)
        strip('ig_licht_a', -0.112, 0.118, 0.0503, 0.0516, s * 0.0233 - 0.0004, s * 0.0233 + 0.0004, M)
    text('ig_t_marke', 'HAMMERWERK', 0.0052, (0.02322, -0.048, 0.0615), RX, FWD, M['graphit'])
    text('ig_t_typ', 'IG-3', 0.0098, (0.02322, 0.252, 0.0616), RX, FWD, M['graphit'])
    text('ig_t_sub', 'IMPULS  ·  4,2 MJ', 0.0024, (0.02322, 0.252, 0.0548), RX, FWD, M['graphit'])
    text('ig_t_name', 'WEITBLICK', 0.0058, (-0.02322, 0.130, 0.0615), LX, BACK, M['graphit'])
    text('ig_t_nr', 'Nr. 07-3301', 0.0024, (-0.02322, -0.050, 0.0600), LX, BACK, M['graphit'])
    for y in (-0.128, 0.290):
        for s in (-1, 1): screw('ig_schraube', (s * 0.0232, y, 0.078 if y > 0 else 0.077), (s, 0, 0), M)
    for y in (-0.135, -0.02, 0.10, 0.22, 0.322):
        for s in (-1, 1): screw('ig_schr_k', (s * 0.022, y, 0.020), (s, 0, 0), M, r=0.0022)
    # ---------- Vorderer Schaft mit Kühlschlitzen, weiße Abdeckung, Lauf, Mündung, Führungsstab
    fr = prism_y('ig_vorn', [(-0.016, 0.022), (0.016, 0.022), (0.018, 0.034), (0.018, 0.064), (-0.018, 0.064), (-0.018, 0.034)], 0.320, 0.600, M['graphit'], bevel=0.0010)
    cs = []
    for s in (-1, 1):
        for i in range(6): cs.append(capsule((s * 0.018, 0.360 + i * 0.036, 0.046), FWD, (s, 0, 0), 0.024, 0.0055, 0.0045, seg=4))
    for i in range(4): cs.append(capsule((0, 0.37 + i * 0.05, 0.022), FWD, (0, 0, -1), 0.03, 0.006, 0.003, seg=4))
    cs.append(boxcut((0, 0.615, 0.018), (0.06, 0.04, 0.03), (math.radians(35), 0, 0)))
    cut(fr, cs)
    cov = prism_y('ig_haube', [(-0.0186, 0.060), (0.0186, 0.060), (0.0186, 0.068), (0.012, 0.0745), (-0.012, 0.0745), (-0.0186, 0.068)], 0.326, 0.588, M['white'], bevel=0.0008)
    cs = [boxcut((0, 0.60, 0.082), (0.06, 0.05, 0.03), (math.radians(-32), 0, 0))]
    for i in range(4): cs.append(capsule((0, 0.38 + i * 0.045, 0.0745), FWD, UP, 0.022, 0.0042, 0.002, seg=4))
    for s in (-1, 1): cs.append(capsule((s * 0.0186, 0.455, 0.064), FWD, (s, 0, 0), 0.25, 0.0010, 0.0006, seg=2))
    cut(cov, cs)
    for s in (-1, 1):
        rbox('ig_orange2', (s * 0.0181 - 0.0006, 0.500, 0.039), (s * 0.0181 + 0.0006, 0.540, 0.043), M['orange'], bevel=0.0002)
        strip('ig_licht_b', 0.338, 0.43, 0.0598, 0.0608, s * 0.0186 - 0.0004, s * 0.0186 + 0.0004, M)
    cyl('ig_lauf', (0, 0.59, BZ - 0.004), (0, 0.672, BZ - 0.004), 0.0088, M['steel'], seg=32, bevel=0.0003)
    mz = lathe('ig_muendung', [(0.664, 0.0), (0.664, 0.0118), (0.668, 0.0132), (0.716, 0.0132), (0.721, 0.0120), (0.724, 0.0095), (0.724, 0.0)], M['satin'], c=(0, 0, BZ - 0.004), seg=8, bevel=0.0005)
    cs = []
    for y in (0.676, 0.689, 0.702):
        for s in (-1, 1): cs.append(capsule((s * 0.0135, y, BZ - 0.004), UP, (s, 0, 0), 0.015, 0.0048, 0.01, seg=4))
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.0048, radius2=0.0048, depth=0.04)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0.73, BZ - 0.004)) @ Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=bm.verts); cs.append(bm)
    cut(mz, cs)
    cyl('ig_stab', (0, 0.335, 0.028), (0, 0.652, 0.028), 0.0052, M['steel'], seg=20, bevel=0.0003)
    for y in (0.405, 0.585, 0.645): rbox('ig_stab_klemme', (-0.0085, y - 0.006, 0.020), (0.0085, y + 0.006, 0.036), M['satin'], bevel=0.0008)
    # ---------- Zielfernrohr auf Montage
    for y in (-0.030, 0.105):
        rbox('ig_montage', (-0.0145, y - 0.012, 0.0850), (0.0145, y + 0.012, 0.1015), M['satin'], bevel=0.0010)
        cyl('ig_mont_knopf', (-0.0145, y, 0.0925), (-0.0215, y, 0.0925), 0.0052, M['graphit'], seg=24, bevel=0.0005)
        for i in range(10):
            a = 2 * math.pi * i / 10
            rbox('ig_knopf_riffel', (-0.0212, y + 0.0054 * math.cos(a) - 0.0006, 0.0925 + 0.0054 * math.sin(a) - 0.0006), (-0.0152, y + 0.0054 * math.cos(a) + 0.0006, 0.0925 + 0.0054 * math.sin(a) + 0.0006), M['graphit'], bevel=0)
    sc = prism_y('ig_zf', [(-0.018, 0.100), (0.018, 0.100), (0.020, 0.108), (0.020, 0.127), (0.014, 0.135), (-0.014, 0.135), (-0.020, 0.127), (-0.020, 0.108)], -0.085, 0.165, M['graphit'], bevel=0.0012)
    cut(sc, [capsule((s * 0.020, 0.04, 0.1145), FWD, (s, 0, 0), 0.17, 0.0012, 0.0007, seg=2) for s in (-1, 1)])
    cap = prism_y('ig_zf_deckel', [(-0.0206, 0.119), (0.0206, 0.119), (0.0206, 0.1275), (0.0145, 0.1362), (-0.0145, 0.1362), (-0.0206, 0.1275)], -0.074, 0.150, M['white'], bevel=0.0009)
    cs = [boxcut((0, 0.165, 0.146), (0.06, 0.04, 0.03), (math.radians(-30), 0, 0)), boxcut((0, -0.088, 0.142), (0.06, 0.03, 0.03), (math.radians(30), 0, 0))]
    for i in range(6): cs.append(capsule((0.0206, -0.035 + i * 0.010, 0.1235), UP, RX, 0.006, 0.0026, 0.0012, seg=3))
    cut(cap, cs)
    obj = prism_y('ig_objektiv', [(-0.0235, 0.097), (0.0235, 0.097), (0.0235, 0.133), (0.018, 0.141), (-0.018, 0.141), (-0.0235, 0.133)], 0.150, 0.192, M['graphit'], bevel=0.0012)
    cut(obj, [boxcut((0, 0.193, 0.119), (0.034, 0.016, 0.031))])
    rbox('ig_glas_vorn', (-0.017, 0.1855, 0.1035), (0.017, 0.1865, 0.1345), M['ext_glas'], bevel=0)
    lathe('ig_okular', [(-0.112, 0.0), (-0.112, 0.0158), (-0.108, 0.0168), (-0.092, 0.0168), (-0.086, 0.0150), (-0.085, 0.0)], M['rub'], c=(0, 0, 0.1175), seg=36, bevel=0.0006)
    for y in (-0.106, -0.101, -0.096): lathe('ig_okular_rippe', [(y, 0.0), (y, 0.0174), (y + 0.0022, 0.0174), (y + 0.0022, 0.0)], M['rub'], c=(0, 0, 0.1175), seg=36, bevel=0.0003)
    lathe('ig_glas_hinten', [(-0.1123, 0.0), (-0.1123, 0.0125), (-0.1118, 0.0125), (-0.1118, 0.0)], M['ext_glas'], c=(0, 0, 0.1175), seg=32, bevel=0)
    lathe('ig_turm', [(0.020, 0.0), (0.020, 0.0092), (0.0285, 0.0092), (0.0292, 0.0080), (0.0292, 0.0)], M['satin'], axis='X', c=(0, 0.045, 0.1175), seg=28, bevel=0.0003)
    for i in range(16):
        a = 2 * math.pi * i / 16
        rbox('ig_turm_riffel', (0.0215, 0.045 + 0.0093 * math.cos(a) - 0.0006, 0.1175 + 0.0093 * math.sin(a) - 0.0006), (0.0288, 0.045 + 0.0093 * math.cos(a) + 0.0006, 0.1175 + 0.0093 * math.sin(a) + 0.0006), M['satin'], bevel=0)
    rbox('ig_zf_anzeige_r', (-0.0212, -0.068, 0.106), (-0.0200, -0.040, 0.116), M['rub'], bevel=0.0004)
    strip('ig_zf_anzeige', -0.066, -0.042, 0.1075, 0.1145, -0.0216, -0.0211, M)
    text('ig_t_zf', 'LOTSE  WEIT-8', 0.0030, (0.02065, -0.010, 0.1235), RX, FWD, M['graphit'])
    # ---------- Unterteil, Griff, Bügel, Abzug, Magazin (Energiezelle)
    lr = prism_x('ig_unten', [(-0.112, 0.014), (0.205, 0.014), (0.205, 0.004), (0.165, -0.010), (0.160, -0.024), (0.078, -0.024), (0.072, -0.010), (0.040, -0.004),
                              (-0.060, -0.004), (-0.112, 0.004)], -0.0178, 0.0178, M['graphit'], bevel=0.0012)
    cut(lr, [capsule((s * 0.0178, 0.120, -0.014), FWD, (s, 0, 0), 0.07, 0.012, 0.0008, seg=6) for s in (-1, 1)])
    prism_x('ig_buegel', [(0.074, -0.018), (0.071, -0.046), (0.060, -0.057), (-0.034, -0.057), (-0.045, -0.049), (-0.049, -0.030), (-0.054, -0.030), (-0.050, -0.053),
                          (-0.038, -0.062), (0.063, -0.062), (0.077, -0.050), (0.079, -0.018)], -0.0058, 0.0058, M['graphit'], bevel=0.0014, seg=3)
    prism_x('ig_abzug', [(0.005, -0.004), (0.010, -0.004), (0.009, -0.016), (0.006, -0.026), (0.001, -0.033), (-0.003, -0.032), (0.001, -0.025), (0.003, -0.016), (0.003, -0.006)],
            -0.0032, 0.0032, M['satin'], bevel=0.0009, seg=3)
    prism_x('ig_griff', [(-0.040, -0.004), (-0.080, -0.004), (-0.088, -0.016), (-0.098, -0.060), (-0.108, -0.110), (-0.104, -0.122), (-0.064, -0.124), (-0.060, -0.112),
                         (-0.058, -0.092), (-0.054, -0.084), (-0.056, -0.072), (-0.050, -0.060), (-0.052, -0.046), (-0.046, -0.030)], -0.0148, 0.0148, M['grip'], bevel=0.0062, seg=4, angle=40)
    prism_x('ig_griff_kappe', [(-0.104, -0.120), (-0.064, -0.122), (-0.0645, -0.129), (-0.105, -0.127)], -0.0125, 0.0125, M['graphit'], bevel=0.0014)
    cyl('ig_sicherung', (0.0172, -0.062, 0.004), (0.0205, -0.062, 0.004), 0.0058, M['satin'], seg=24, bevel=0.0005)
    prism_x('ig_sich_hebel', [(-0.064, 0.007), (-0.044, 0.010), (-0.042, 0.004), (-0.062, 0.000)], 0.0198, 0.0218, M['satin'], bevel=0.0007)
    text('ig_t_s', 'S', 0.0028, (0.01785, -0.074, 0.000), RX, FWD, M['paint']); text('ig_t_f', 'F', 0.0028, (0.01785, -0.048, -0.001), RX, FWD, M['red'])
    for y in (0.188, -0.098):
        cyl('ig_bolzen', (-0.0185, y, 0.006), (0.0185, y, 0.006), 0.0034, M['steel'], seg=24, bevel=0.0003)
    def mag_edge(y0, d): return (y0 + 0.13 * d, -0.024 - d)
    ds = [0.0, 0.135]
    prism_x('ig_magazin', [mag_edge(0.153, 0), mag_edge(0.153, 0.135), mag_edge(0.086, 0.135), mag_edge(0.086, 0)], -0.0145, 0.0145, M['graphit'], bevel=0.0016, seg=3)
    for i in range(4):
        d = 0.085 + i * 0.011; a, b = mag_edge(0.086, d), mag_edge(0.153, d)
        prism_x('ig_mag_rippe', [(a[0] + 0.004, a[1]), (b[0] - 0.004, b[1]), (b[0] - 0.004, b[1] - 0.004), (a[0] + 0.004, a[1] - 0.004)], -0.0153, 0.0153, M['graphit'], bevel=0.0008)
    a, b = mag_edge(0.084, 0.133), mag_edge(0.157, 0.133)
    prism_x('ig_mag_boden', [(a[0], a[1]), (b[0], b[1]), (b[0] + 0.001, b[1] - 0.010), (a[0] + 0.001, a[1] - 0.010)], -0.0158, 0.0158, M['satin'], bevel=0.0018, seg=3)
    for i in range(5):                                                                                        # Ladeanzeige der Zelle
        y, z = mag_edge(0.118, 0.018 + i * 0.011)
        strip('ig_mag_led', y - 0.006, y + 0.006, z - 0.0016, z + 0.0004, 0.0145, 0.0150, M)
    text('ig_t_zelle', 'ZELLE 40', 0.0026, (0.01452, mag_edge(0.12, 0.078)[0], mag_edge(0.12, 0.078)[1]), RX, FWD, M['paint'])
    # ---------- Skelettschaft
    st = prism_x('ig_schaft', [(-0.148, 0.082), (-0.148, 0.014), (-0.205, -0.004), (-0.398, -0.044), (-0.418, -0.052), (-0.424, 0.077), (-0.404, 0.090), (-0.300, 0.088)],
                 -0.016, 0.016, M['graphit'], bevel=0.0028, seg=3, angle=40)
    cut(st, [poly_x([(-0.200, 0.068), (-0.288, 0.072), (-0.288, 0.020), (-0.212, 0.032)], -0.03, 0.03),
             poly_x([(-0.306, 0.072), (-0.392, 0.074), (-0.392, -0.018), (-0.306, 0.004)], -0.03, 0.03)])
    prism_x('ig_wange', [(-0.205, 0.084), (-0.362, 0.088), (-0.360, 0.103), (-0.222, 0.098)], -0.0128, 0.0128, M['white'], bevel=0.0030, seg=3, angle=40)
    for y in (-0.240, -0.330): cyl('ig_wange_stift', (-0.013, y, 0.092), (0.013, y, 0.092), 0.0028, M['steel'], seg=16, bevel=0.0002)
    prism_x('ig_kappe', [(-0.416, 0.093), (-0.432, 0.094), (-0.434, -0.056), (-0.420, -0.060)], -0.0182, 0.0182, M['rub'], bevel=0.0040, seg=3, angle=40)
    for s in (-1, 1):
        prism_x('ig_dreieck', [(-0.168, 0.058), (-0.160, 0.064), (-0.160, 0.052)], s * 0.0161 - 0.0004, s * 0.0161 + 0.0004, M['red'], bevel=0)
    cyl('ig_riemen', (0.016, -0.410, 0.020), (0.021, -0.410, 0.020), 0.0058, M['steel'], seg=24, bevel=0.0004)
    detail_ig3(M, BZ)
    for n, p in (('ig3_muendung', (0, 0.724, BZ - 0.004)),):
        e = bpy.data.objects.new(n, None); e.location = p; COL.objects.link(e)
    return _count()

def detail_ig3(M, BZ):
    """Zweite Detailebene: Wartungsklappen, Rippen, Schienen, Griffeinlagen, Ringe am Zielfernrohr, Entfernungsmesser."""
    for s in (-1, 1):
        # Wartungsklappe hinten am Kern
        x0, x1 = (0.0219, 0.0234) if s > 0 else (-0.0234, -0.0219)
        kl = rbox('ig_klappe', (x0, -0.118, 0.019), (x1, -0.052, 0.044), M['satin'], bevel=0.0007)
        cut(kl, [capsule((s * 0.0234, -0.100 + i * 0.008, 0.0315), UP, (s, 0, 0), 0.014, 0.0030, 0.0010, seg=3) for i in range(5)])
        for y in (-0.114, -0.056):
            for z in (0.0225, 0.0405): screw('ig_klappe_schr', (s * 0.0234, y, z), (s, 0, 0), M, r=0.0016)
        # Rippenfeld in der Mitte des Kerns
        x0, x1 = (0.0219, 0.0228) if s > 0 else (-0.0228, -0.0219)
        for i in range(9): rbox('ig_rippe', (x0, 0.110 + i * 0.010, 0.022), (x1, 0.114 + i * 0.010, 0.040), M['graphit'], bevel=0.0003)
        rbox('ig_rippe_rahmen_o', (x0, 0.104, 0.0405), (x1, 0.198, 0.0425), M['graphit'], bevel=0.0003)
        rbox('ig_rippe_rahmen_u', (x0, 0.104, 0.0195), (x1, 0.198, 0.0215), M['graphit'], bevel=0.0003)
        # Griffeinlagen aus Gummi
        x0, x1 = (0.0140, 0.0162) if s > 0 else (-0.0162, -0.0140)
        gi = prism_x('ig_griff_einlage', [(-0.086, -0.030), (-0.060, -0.030), (-0.056, -0.050), (-0.060, -0.074), (-0.064, -0.098), (-0.092, -0.104), (-0.096, -0.076), (-0.092, -0.050)], x0, x1, M['rub'], bevel=0.0012, seg=2)
        cut(gi, [capsule((s * 0.0162, -0.077, -0.038 - i * 0.0085), FWD, (s, 0, 0), 0.034, 0.0018, 0.0010, seg=2) for i in range(7)])
    for y in (-0.004, 0.128):
        prism_y('ig_zf_band', [(-0.0212, 0.0985), (0.0212, 0.0985), (0.0222, 0.108), (0.0222, 0.128), (0.0155, 0.1385), (-0.0155, 0.1385), (-0.0222, 0.128), (-0.0222, 0.108)], y, y + 0.006, M['satin'], bevel=0.0006)
    # Entfernungsmesser rechts am Objektiv
    rbox('ig_em', (0.0235, 0.150, 0.104), (0.0315, 0.188, 0.121), M['graphit'], bevel=0.0010)
    cyl('ig_em_linse', (0.0275, 0.188, 0.1125), (0.0275, 0.1895, 0.1125), 0.0042, M['ext_glas'], seg=20, bevel=0)
    strip('ig_em_led', 0.160, 0.168, 0.1165, 0.1185, 0.0315, 0.0319, M)
    # Schiene unter dem vorderen Schaft
    prism_y('ig_unterschiene', [(-0.0080, 0.0185), (0.0080, 0.0185), (0.0080, 0.0222), (-0.0080, 0.0222)], 0.405, 0.560, M['satin'], bevel=0.0004)
    y = 0.406
    while y < 0.556:
        prism_y('ig_unterzahn', [(-0.0080, 0.0200), (0.0080, 0.0200), (0.0102, 0.0177), (0.0102, 0.0165), (0.0092, 0.0157), (-0.0092, 0.0157), (-0.0102, 0.0165), (-0.0102, 0.0177)], y, y + 0.0052, M['satin'], bevel=0.0003, seg=1)
        y += 0.010
    # Abschlussring vorn, Sensorblock oben links
    prism_y('ig_vorn_ring', [(-0.0190, 0.0215), (0.0190, 0.0215), (0.0192, 0.0345), (0.0192, 0.0660), (-0.0192, 0.0660), (-0.0192, 0.0345)], 0.5965, 0.6035, M['satin'], bevel=0.0005)
    rbox('ig_sensor', (-0.0215, 0.250, 0.0855), (-0.0090, 0.290, 0.0925), M['graphit'], bevel=0.0010)
    strip('ig_sensor_led', 0.256, 0.262, 0.0890, 0.0905, -0.0219, -0.0215, M)

# ====================================================================================================== EF-2 Brecher
def build_ef2():
    _new_coll('ef2'); M = materials2(); BZ = 0.046
    body = prism_x('ef_koerper', [(-0.118, 0.084), (0.150, 0.084), (0.190, 0.076), (0.216, 0.058), (0.218, 0.030), (0.196, 0.012), (0.105, 0.010), (0.095, -0.004),
                                  (-0.060, -0.004), (-0.118, 0.012)], -0.0235, 0.0235, M['graphit'], bevel=0.0030, seg=3, angle=35)
    cs = []
    for s in (-1, 1):
        cs.append(capsule((s * 0.0235, 0.125, 0.040), FWD, (s, 0, 0), 0.040, 0.012, 0.007, seg=4))                       # Auswurf
        for i in range(5): cs.append(capsule((s * 0.0235, 0.160 + i * 0.010, 0.026), UP, (s, 0, 0), 0.010, 0.0042, 0.002, seg=3))
        cs.append(capsule((s * 0.0235, 0.02, 0.0205), FWD, (s, 0, 0), 0.20, 0.0011, 0.0007, seg=2))
    cut(body, cs)
    for s in (-1, 1):
        pl = prism_x('ef_platte', [(-0.100, 0.060), (0.120, 0.060), (0.158, 0.069), (0.150, 0.0805), (-0.085, 0.0805)], s * 0.0234, s * 0.0234 + s * 0.0016, M['satin'], bevel=0.0007)
        cut(pl, [capsule((s * (0.0250), y, 0.072), UP, (s, 0, 0), 0.009, 0.0032, 0.0012, seg=3) for y in (-0.06, -0.05, -0.04, -0.03)])
        bm = poly_x([(-0.06, 0.0558), (0.098, 0.0558), (0.146, 0.0438), (0.149, 0.0462), (0.101, 0.0582), (-0.06, 0.0582)], s * 0.0235, s * 0.0243)
        me = bpy.data.meshes.new('ef_licht'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('ef_licht', me); COL.objects.link(ob); me.materials.append(M['licht'])
        strip('ef_licht_vorn', 0.150, 0.196, 0.0165, 0.0180, s * 0.0222 - 0.0004, s * 0.0222 + 0.0004, M)
        for y in (-0.090, 0.135):
            screw('ef_schraube', (s * 0.0250, y, 0.074 if y < 0 else 0.066), (s, 0, 0), M)
    # Hülse im Auswurf
    cyl('ef_huelse', (0.010, 0.108, 0.040), (0.010, 0.140, 0.040), 0.0095, M['red'], seg=24, bevel=0.0003)
    cyl('ef_huelse_boden', (0.010, 0.104, 0.040), (0.010, 0.109, 0.040), 0.0099, M['messing'], seg=24, bevel=0.0003)
    # ---------- Energiekern mit Leuchtring rechts
    KC = (0, 0.030, 0.048)
    lathe('ef_kern_gehaeuse', [(0.0230, 0.0), (0.0230, 0.0270), (0.0300, 0.0270), (0.0318, 0.0250), (0.0318, 0.0)], M['satin'], axis='X', c=KC, seg=48, bevel=0.0005)
    lathe('ef_kern_mitte', [(0.0316, 0.0), (0.0316, 0.0128), (0.0336, 0.0120), (0.0340, 0.0090), (0.0340, 0.0)], M['graphit'], axis='X', c=KC, seg=6, bevel=0.0006)
    bm = bmesh.new(); outer = []; inner = []
    for i in range(48):
        a = 2 * math.pi * i / 48
        outer.append(bm.verts.new((0.0320, KC[1] + 0.0205 * math.cos(a), KC[2] + 0.0205 * math.sin(a))))
        inner.append(bm.verts.new((0.0320, KC[1] + 0.0158 * math.cos(a), KC[2] + 0.0158 * math.sin(a))))
    for i in range(48):
        j = (i + 1) % 48; bm.faces.new((outer[i], outer[j], inner[j], inner[i]))
    me = bpy.data.meshes.new('ef_ring'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('ef_ring', me); COL.objects.link(ob); me.materials.append(M['licht'])
    for i in range(8):
        a = 2 * math.pi * i / 8 + 0.2
        screw('ef_kern_bolzen', (0.0318, KC[1] + 0.0238 * math.cos(a), KC[2] + 0.0238 * math.sin(a)), RX, M, r=0.0017)
    for i in range(6):
        a = 2 * math.pi * i / 6
        rbox('ef_kern_kerbe', (0.0336, KC[1] + 0.006 * math.cos(a) - 0.0012, KC[2] + 0.006 * math.sin(a) - 0.0012), (0.0342, KC[1] + 0.006 * math.cos(a) + 0.0012, KC[2] + 0.006 * math.sin(a) + 0.0012), M['satin'], bevel=0)
    text('ef_t_typ', 'EF-2', 0.0078, (0.02352, -0.062, 0.0455), RX, FWD, M['paint'])
    text('ef_t_name', 'BRECHER', 0.0036, (0.02352, -0.062, 0.0375), RX, FWD, M['paint'])
    text('ef_t_marke', 'HAMMERWERK', 0.0050, (-0.02352, 0.020, 0.035), LX, BACK, M['paint'])
    text('ef_t_kal', 'KAL. 12/76 · NUR ENTERUNG', 0.0022, (-0.02352, 0.020, 0.026), LX, BACK, M['paint'])
    # Warnschild links
    rbox('ef_schild', (-0.0243, 0.085, 0.022), (-0.0235, 0.112, 0.034), M['orange'], bevel=0.0003)
    text('ef_t_warn', 'ACHTUNG', 0.0022, (-0.02432, 0.0985, 0.028), LX, BACK, M['graphit'])
    # ---------- Lauf, Mantel, Mündung
    cyl('ef_lauf', (0, 0.20, BZ), (0, 0.300, BZ), 0.0112, M['steel'], seg=32, bevel=0.0003)
    mt = prism_y('ef_mantel', [(-0.016, 0.024), (0.016, 0.024), (0.018, 0.034), (0.018, 0.048), (-0.018, 0.048), (-0.018, 0.034)], 0.205, 0.288, M['graphit'], bevel=0.0012)
    cut(mt, [capsule((s * 0.018, 0.225 + i * 0.019, 0.036), FWD, (s, 0, 0), 0.013, 0.0048, 0.004, seg=4) for s in (-1, 1) for i in range(4)])
    mz = lathe('ef_muendung', [(0.292, 0.0), (0.292, 0.0145), (0.296, 0.0160), (0.326, 0.0160), (0.330, 0.0140), (0.330, 0.0)], M['satin'], c=(0, 0, BZ), seg=10, bevel=0.0006)
    cs = [capsule((s * 0.016, y, BZ), UP, (s, 0, 0), 0.016, 0.0055, 0.012, seg=4) for s in (-1, 1) for y in (0.302, 0.316)]
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.0095, radius2=0.0095, depth=0.04)
    bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0.335, BZ)) @ Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=bm.verts); cs.append(bm)
    cut(mz, cs)
    # ---------- Schiene mit Reflexvisier
    prism_y('ef_schiene', [(-0.0080, 0.0835), (0.0080, 0.0835), (0.0080, 0.0872), (-0.0080, 0.0872)], -0.060, 0.120, M['satin'], bevel=0.0004)
    y = -0.060
    while y < 0.116:
        prism_y('ef_zahn', [(-0.0080, 0.0855), (0.0080, 0.0855), (0.0102, 0.0878), (0.0102, 0.0890), (0.0092, 0.0898), (-0.0092, 0.0898), (-0.0102, 0.0890), (-0.0102, 0.0878)],
                y, y + 0.0052, M['satin'], bevel=0.0003, seg=1)
        y += 0.010
    rbox('ef_visier_fuss', (-0.0135, 0.010, 0.0898), (0.0135, 0.060, 0.0975), M['graphit'], bevel=0.0012)
    hood = prism_x('ef_visier_haube', [(0.016, 0.0975), (0.058, 0.0975), (0.058, 0.103), (0.050, 0.129), (0.040, 0.131), (0.024, 0.126)], -0.0135, 0.0135, M['graphit'], bevel=0.0012)
    cut(hood, [poly_x([(0.030, 0.1005), (0.052, 0.1005), (0.046, 0.1255), (0.034, 0.1235)], -0.0105, 0.0105)])
    bm = poly_x([(0.0395, 0.1005), (0.0415, 0.1005), (0.0405, 0.1245), (0.0385, 0.1245)], -0.0105, 0.0105)
    me = bpy.data.meshes.new('ef_glas'); bm.to_mesh(me); bm.free(); ob = bpy.data.objects.new('ef_glas', me); COL.objects.link(ob); me.materials.append(M['ext_glas'])
    cyl('ef_punkt', (0, 0.0378, 0.1125), (0, 0.0380, 0.1125), 0.0008, M['ext_leucht'], seg=12, bevel=0)
    cyl('ef_visier_knopf', (0.0135, 0.022, 0.1035), (0.0170, 0.022, 0.1035), 0.0040, M['rub'], seg=20, bevel=0.0005)
    # ---------- Griff mit großem Bügel, Abzug, Patronenmagazin mit Fenster
    prism_x('ef_rahmen', [(0.098, -0.004), (0.094, -0.050), (0.080, -0.064), (-0.026, -0.064), (-0.038, -0.054), (-0.045, -0.030), (-0.040, -0.004), (-0.050, -0.004), (-0.056, -0.034),
                          (-0.042, -0.072), (0.086, -0.072), (0.104, -0.054), (0.108, -0.004)], -0.0068, 0.0068, M['graphit'], bevel=0.0018, seg=3)
    prism_x('ef_abzug', [(0.010, -0.004), (0.015, -0.004), (0.014, -0.018), (0.010, -0.030), (0.004, -0.037), (0.000, -0.035), (0.005, -0.028), (0.008, -0.018), (0.008, -0.006)],
            -0.0034, 0.0034, M['satin'], bevel=0.0009, seg=3)
    prism_x('ef_griff', [(-0.040, -0.004), (-0.084, -0.004), (-0.092, -0.018), (-0.104, -0.074), (-0.112, -0.118), (-0.106, -0.128), (-0.068, -0.128), (-0.064, -0.116),
                         (-0.060, -0.090), (-0.055, -0.078), (-0.058, -0.064), (-0.052, -0.050), (-0.054, -0.036), (-0.046, -0.022)], -0.0152, 0.0152, M['grip'], bevel=0.0064, seg=4, angle=40)
    for i in range(3):
        z = -0.06 - i * 0.02
        prism_x('ef_griff_rille', [(-0.101 - i * 0.003, z), (-0.096 - i * 0.003, z), (-0.096 - i * 0.003, z - 0.004), (-0.102 - i * 0.003, z - 0.004)], -0.0156, 0.0156, M['rub'], bevel=0.0010)
    mag = prism_x('ef_magazin', [(0.110, -0.004), (0.172, -0.004), (0.176, -0.096), (0.168, -0.106), (0.118, -0.106), (0.112, -0.096)], -0.0158, 0.0158, M['graphit'], bevel=0.0022, seg=3)
    cut(mag, [capsule((0.0158, 0.143, -0.050), UP, RX, 0.074, 0.016, 0.0045, seg=6)])
    for i in range(5):
        z = -0.022 - i * 0.014
        cyl('ef_patrone', (0.0062, 0.130, z), (0.0062, 0.160, z), 0.0068, M['red'], seg=20, bevel=0.0003)
        cyl('ef_patrone_boden', (0.0062, 0.126, z), (0.0062, 0.131, z), 0.0072, M['messing'], seg=20, bevel=0.0003)
    prism_x('ef_mag_boden', [(0.114, -0.100), (0.174, -0.100), (0.176, -0.112), (0.112, -0.112)], -0.0168, 0.0168, M['satin'], bevel=0.0018)
    text('ef_t_mag', '6', 0.0060, (0.01582, 0.125, -0.090), RX, FWD, M['paint'])
    # ---------- Gitterschaft
    rbox('ef_gelenk', (-0.0150, -0.132, 0.012), (0.0150, -0.116, 0.082), M['satin'], bevel=0.0018)
    for (a, b) in (((-0.124, 0.074), (-0.300, 0.082)), ((-0.124, 0.022), (-0.292, -0.012))):
        for s in (-1, 1):
            p0, p1 = Vector((s * 0.0105, a[0], a[1])), Vector((s * 0.0105, b[0], b[1]))
            d = p1 - p0; q = d.to_track_quat('Y', 'Z').to_matrix().to_4x4()
            bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.transform(bm, matrix=Matrix.Translation((p0 + p1) / 2) @ q @ Matrix.Diagonal((0.0065, d.length, 0.0085, 1)), verts=bm.verts)
            _obj('ef_strebe', bm, M['satin'], bevel=0.0012)
    for y, z in ((-0.20, 0.078), (-0.25, 0.080)):
        cyl('ef_quer', (-0.0115, y, z), (0.0115, y, z), 0.0032, M['steel'], seg=12, bevel=0.0002)
    prism_x('ef_kappe', [(-0.292, 0.094), (-0.308, 0.094), (-0.310, -0.024), (-0.294, -0.028)], -0.0175, 0.0175, M['rub'], bevel=0.0040, seg=3, angle=40)
    detail_ef2(M, BZ)
    for n, p in (('ef2_muendung', (0, 0.330, BZ)),):
        e = bpy.data.objects.new(n, None); e.location = p; COL.objects.link(e)
    return _count()

def detail_ef2(M, BZ):
    """Zweite Detailebene der EF-2: untere Seitenplatten, Kühlgitter, Ladehebel, Magazinrippen, Schiene unten, Kabel zum Kern."""
    for s in (-1, 1):
        x0, x1 = (0.0232, 0.0246) if s > 0 else (-0.0246, -0.0232)
        lp = prism_x('ef_unterplatte', [(-0.100, 0.014), (0.070, 0.014), (0.090, 0.022), (0.090, 0.0305), (-0.090, 0.0305), (-0.100, 0.024)], x0, x1, M['satin'], bevel=0.0007)
        cut(lp, [capsule((s * 0.0246, -0.040 + i * 0.007, 0.022), UP, (s, 0, 0), 0.010, 0.0030, 0.0010, seg=3) for i in range(6)] +
                [capsule((s * 0.0246, 0.030, 0.0225), FWD, (s, 0, 0), 0.050, 0.0016, 0.0008, seg=2)])
        for y in (-0.094, 0.082): screw('ef_unter_schr', (s * 0.0246, y, 0.019), (s, 0, 0), M, r=0.0016)
        # Kühlgitter vor dem Kern
        x0, x1 = (0.0233, 0.0241) if s > 0 else (-0.0241, -0.0233)
        for i in range(6): rbox('ef_gitter', (x0, 0.066 + i * 0.0055, 0.034), (x1, 0.068 + i * 0.0055, 0.052), M['satin'], bevel=0.0002)
    # Ladehebel links, Kabel vom Kern nach hinten
    rbox('ef_ladehebel_bahn', (-0.0250, 0.020, 0.0625), (-0.0236, 0.085, 0.0675), M['rub'], bevel=0.0004)
    rbox('ef_ladehebel', (-0.0320, 0.070, 0.0610), (-0.0238, 0.080, 0.0690), M['satin'], bevel=0.0010)
    pts = [Vector((0.0300, 0.010, 0.034)), Vector((0.0300, -0.010, 0.030)), Vector((0.0270, -0.040, 0.028)), Vector((0.0255, -0.070, 0.030))]
    for a, b in zip(pts, pts[1:]): cyl('ef_kabel', a, b, 0.0022, M['rub'], seg=10, bevel=0)
    rbox('ef_kabel_stecker', (0.0236, -0.078, 0.026), (0.0275, -0.066, 0.034), M['satin'], bevel=0.0006)
    # Magazin: Griffrippen, Fensterrahmen
    for i in range(4):
        z = -0.070 - i * 0.007
        prism_x('ef_mag_rippe', [(0.112, z), (0.120, z), (0.120, z - 0.0035), (0.112, z - 0.0035)], -0.0166, 0.0166, M['graphit'], bevel=0.0006)
    rbox('ef_fenster_rahmen_o', (0.0155, 0.133, -0.0125), (0.0168, 0.153, -0.0105), M['satin'], bevel=0.0003)
    strip('ef_mag_led', 0.1625, 0.1665, -0.024, -0.016, 0.0158, 0.0163, M)
    # Schiene unten vor dem Bügel
    prism_y('ef_unterschiene', [(-0.0075, 0.0085), (0.0075, 0.0085), (0.0075, 0.0118), (-0.0075, 0.0118)], 0.118, 0.192, M['satin'], bevel=0.0004)
    y = 0.120
    while y < 0.188:
        prism_y('ef_unterzahn', [(-0.0075, 0.0100), (0.0075, 0.0100), (0.0096, 0.0078), (0.0096, 0.0067), (0.0086, 0.0059), (-0.0086, 0.0059), (-0.0096, 0.0067), (-0.0096, 0.0078)], y, y + 0.0052, M['satin'], bevel=0.0003, seg=1)
        y += 0.010

# ====================================================================================================== Zusammenfügen, Backen, Export
SEP2 = {'ext_glas': '_glas', 'ext_leucht': '_absehen', 'ext_licht': '_licht', 'ext_lampe': '_licht'}
def prepare_w(key, margin=0.003):
    global COL
    COL = bpy.data.collections[key]
    obs = [o for o in COL.objects if o.type == 'MESH']
    for o in obs: _apply(o)
    groups = {key: [o for o in obs if o.data.materials[0].name not in SEP2]}
    for mname, suf in SEP2.items():
        groups.setdefault(key + suf, []); groups[key + suf] += [o for o in obs if o.data.materials[0].name == mname]
    out = {}
    for name, g in groups.items():
        if not g: continue
        for q in bpy.context.scene.objects: q.select_set(False)
        for o in g: o.select_set(True)
        if len(g) > 1:
            with bpy.context.temp_override(**_ctx(), active_object=g[0], object=g[0], selected_objects=g, selected_editable_objects=g):
                bpy.ops.object.join()
        g[0].name = name; g[0].data.name = name
        with bpy.context.temp_override(**_ctx(), active_object=g[0], object=g[0], selected_objects=[g[0]], selected_editable_objects=[g[0]]):
            bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        out[name] = len(g[0].data.polygons)
    w = bpy.data.objects[key]
    me = w.data                                                     # leere Materialplätze entfernen
    import numpy as np
    idx = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', idx)
    keep = [i for i, m in enumerate(me.materials) if m is not None and (idx == i).any()]
    remap = {o: n for n, o in enumerate(keep)}; mats = [me.materials[i] for i in keep]
    idx = np.array([remap.get(int(i), 0) for i in idx], np.int32); me.materials.clear()
    for m in mats: me.materials.append(m)
    me.polygons.foreach_set('material_index', idx); me.update()
    for q in bpy.context.scene.objects: q.select_set(False)
    w.select_set(True); bpy.context.view_layer.objects.active = w
    with bpy.context.temp_override(**_ctx(), active_object=w, object=w, selected_objects=[w], selected_editable_objects=[w]):
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=margin, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.uv.pack_islands(rotate=True, margin=margin, shape_method='CONCAVE')
        bpy.ops.object.mode_set(mode='OBJECT')
    return out

def bake_w(key, size=2048, samples=16):
    w = bpy.data.objects[key]; sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.render.bake.margin = 10; sc.render.bake.target = 'IMAGE_TEXTURES'; sc.render.bake.use_clear = True
    imgs = {k: _img('wb_' + key + '_' + k, k == 'col', size) for k in ('col', 'nrm', 'rough', 'metal', 'ao')}
    tmp = os.path.join(ROOT, 'asset-src', 'neu', 'mine', 'tex_tmp'); os.makedirs(tmp, exist_ok=True)
    flag = os.path.join(tmp, key + '_fertig.txt')
    if os.path.exists(flag): os.remove(flag)
    mats = list(w.data.materials); nodes = {}
    for m in mats:
        nt = m.node_tree; n = nt.nodes.get('bake_tgt') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'bake_tgt'; nt.nodes.active = n; nodes[m.name] = n
    steps = [('ao', 'AO', {}), ('rough', 'ROUGHNESS', {}), ('nrm', 'NORMAL', {}), ('col', 'EMIT', {'emit': 'base'}), ('metal', 'EMIT', {'emit': 'metal'})]
    state = {'i': 0, 'log': []}
    def hook(kind):
        saved = []
        for m in mats:
            nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL')
            em = nt.nodes.new('ShaderNodeEmission'); em.name = 'bake_emit'
            nt.links.new(SM[m.name][kind], em.inputs['Color']); saved.append((m, out.inputs['Surface'].links[0].from_socket)); nt.links.new(em.outputs[0], out.inputs['Surface'])
        return saved
    def unhook(saved):
        for m, sock in saved:
            nt = m.node_tree; out = next(n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'); nt.links.new(sock, out.inputs['Surface']); nt.nodes.remove(nt.nodes['bake_emit'])
    def job():
        import time
        if state['i'] >= len(steps): finish(); return None
        k, typ, opt = steps[state['i']]; t = time.time()
        for m in mats: nodes[m.name].image = imgs[k]; m.node_tree.nodes.active = nodes[m.name]
        saved = hook(opt['emit']) if 'emit' in opt else None
        for q in sc.objects: q.select_set(False)
        w.select_set(True); bpy.context.view_layer.objects.active = w
        try:
            with bpy.context.temp_override(**_ctx(), object=w, active_object=w, selected_objects=[w], selected_editable_objects=[w]):
                if typ == 'NORMAL': bpy.ops.object.bake(type='NORMAL', normal_space='TANGENT')
                else: bpy.ops.object.bake(type=typ)
        except Exception as e: state['log'].append(repr(e))
        if saved: unhook(saved)
        state['log'].append((k, round(time.time() - t, 1))); state['i'] += 1
        return 0.2
    def finish():
        import numpy as np
        n = size * size
        def px(im): a = np.empty(n * 4, np.float32); im.pixels.foreach_get(a); return a.reshape(n, 4)
        ao, ro, me = px(imgs['ao']), px(imgs['rough']), px(imgs['metal'])
        orm = np.ones((n, 4), np.float32); orm[:, 0] = ao[:, 0]; orm[:, 1] = ro[:, 0]; orm[:, 2] = me[:, 0]
        o = bpy.data.images.get('wb_' + key + '_orm') or bpy.data.images.new('wb_' + key + '_orm', size, size, alpha=False)
        o.colorspace_settings.name = 'Non-Color'; o.pixels.foreach_set(orm.ravel())
        for im, f in ((imgs['col'], 'col'), (imgs['nrm'], 'nrm'), (o, 'orm')):
            im.filepath_raw = os.path.join(TEX, 'waffe_%s_%s@2048.png' % (key, f)); im.file_format = 'PNG'; im.save()
        with open(flag, 'w') as fh: fh.write(json.dumps(state['log']))
    bpy.app.timers.register(job, first_interval=0.5)
    return {'flag': flag}

def show_w(key):
    w = bpy.data.objects[key]
    m = bpy.data.materials.get('ext_' + key) or bpy.data.materials.new('ext_' + key); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); L(b.outputs[0], out.inputs[0])
    def tx(f, data):
        im = bpy.data.images.load(os.path.join(TEX, 'waffe_%s_%s@2048.png' % (key, f)), check_existing=True); im.reload()
        if data: im.colorspace_settings.name = 'Non-Color'
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; return t
    L(tx('col', False).outputs[0], b.inputs['Base Color'])
    sp = nt.nodes.new('ShaderNodeSeparateColor'); L(tx('orm', True).outputs[0], sp.inputs[0]); L(sp.outputs[1], b.inputs['Roughness']); L(sp.outputs[2], b.inputs['Metallic'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); L(tx('nrm', True).outputs[0], nm.inputs['Color']); L(nm.outputs[0], b.inputs['Normal'])
    w.data.materials.clear(); w.data.materials.append(m)
    return {'faces': len(w.data.polygons)}

def export_w(key):
    sc = bpy.context.scene; obs = [bpy.data.objects[n] for n in (key, key + '_glas', key + '_absehen', key + '_licht') if n in bpy.data.objects]
    c = bpy.data.collections[key]; c.hide_viewport = False
    for q in sc.objects: q.select_set(False)
    for o in obs: o.select_set(True)
    path = os.path.join(ROOT, 'asset-src', 'glb', 'station', 'Mine_W_%s.glb' % key)
    with bpy.context.temp_override(**_ctx(), active_object=obs[0], selected_objects=obs):
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_normals=True,
                                  export_image_format='NONE', export_materials='EXPORT', export_extras=False)
    return {'kb': round(os.path.getsize(path) / 1024), 'nodes': [o.name for o in obs]}
