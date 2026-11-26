# Cockpit-Baukasten (Stil 2: dunkle Formteile mit Fasen, Anzeigen in Hauben, Lichtleisten), für die Ich-Sicht im Flug (src/game/cockpit.ts).
# Wird von cp_dohle.py / cp_kormoran.py per exec geladen. Eigenständig: braucht keinen Schiffs-Baukasten.
#
# Koordinaten beim Bauen (Blender): X rechts, Y nach vorn (zur Nase), Z oben, in Metern, Ursprung = Mitte des Schiffsmodells wie im Spiel.
#   Spiel (x, y, z) = Blender (X, Z, −Y). Der glTF-Export (Y oben) liefert damit genau die Schiffskoordinaten des Spiels.
# Bauteile entstehen als bmesh in einem lokalen Rahmen (Platz(...)) und landen gesammelt je Material in wenigen Objekten (Sammler).
# Materialnamen sind die Schnittstelle zum Spiel: „CP <Name>“. Der Shader im Spiel wählt daraus Muster und Leuchten.
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix
PI = math.pi

# ---------- Materialien ----------
MAT = {}
def mat(name, col, metal=0.0, rough=0.5, emit=None, es=0.0, alpha=1.0):
    m = bpy.data.materials.new('CP ' + name); m.use_nodes = True
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    b.inputs['Base Color'].default_value = (*col, 1); b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
    if emit: b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = es
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
            try: setattr(m, k, v)
            except Exception: pass
    m['cp'] = json.dumps({'col': list(col), 'metal': metal, 'rough': rough, 'emit': list(emit) if emit else None, 'es': es, 'alpha': alpha})
    MAT[name] = m; return m

def stil_materialien(akzent=(0.55, 0.3, 0.03), kalt=(0.45, 0.75, 1.0), warm=(1.0, 0.55, 0.18)):
    mat('Formteil', (0.014, 0.015, 0.017), 0.25, 0.42)            # Hauptfarbe: fast schwarz, seidenmatt
    mat('Formteil hell', (0.024, 0.025, 0.028), 0.3, 0.46)         # abgesetzte Felder
    mat('Verkleidung', (0.016, 0.017, 0.019), 0.1, 0.66)          # Wand- und Deckenfelder, matter
    mat('Metall', (0.09, 0.092, 0.1), 0.9, 0.34)                  # dunkel eloxiert
    mat('Metall blank', (0.42, 0.43, 0.45), 1.0, 0.28)
    mat('Gummi', (0.008, 0.008, 0.009), 0.0, 0.85)                # Griffe, Dichtungen, Bälge
    mat('Stoff', (0.02, 0.021, 0.024), 0.0, 0.9)                  # Sitzbezug (Wabenmuster im Shader)
    mat('Bodenrost', (0.02, 0.021, 0.023), 0.55, 0.5)             # Trittfläche (Lochmuster im Shader)
    mat('Rahmen', (0.016, 0.017, 0.019), 0.3, 0.4)                # Fensterrahmen, Streben
    mat('Taste', (0.045, 0.047, 0.052), 0.1, 0.5)
    mat('Akzent', akzent, 0.15, 0.45)
    mat('Warngelb', (0.62, 0.42, 0.02), 0.1, 0.5)
    mat('Warnrot', (0.42, 0.03, 0.02), 0.1, 0.45)
    mat('Schrift', (0.5, 0.52, 0.55), 0.0, 0.6)
    mat('Schrift dunkel', (0.004, 0.004, 0.004), 0.0, 0.6)
    mat('Kabel', (0.35, 0.1, 0.02), 0.0, 0.6)
    mat('Licht Kalt', (0.02, 0.03, 0.04), 0.0, 0.3, kalt, 4.0)    # kalte Lichtleisten und Tastenlicht
    mat('Licht Warm', (0.04, 0.02, 0.01), 0.0, 0.3, warm, 4.0)    # warme Bodenleuchten
    mat('Licht Rot', (0.04, 0.0, 0.0), 0.0, 0.3, (1.0, 0.08, 0.04), 3.0)
    mat('Licht Gruen', (0.0, 0.04, 0.01), 0.0, 0.3, (0.2, 1.0, 0.4), 3.0)
    mat('Glas', (0.5, 0.6, 0.65), 0.0, 0.04, alpha=0.08)
    mat('Schirmglas', (0.0, 0.0, 0.0), 0.0, 0.08)
    mat('Rumpf innen', (0.012, 0.012, 0.014), 0.2, 0.7)             # Innenseite der Außenhaut um die Kabine: schließt Lücken, wirft den Sonnenschatten

# ---------- Sammler: alles in ein bmesh je Material ----------
class Sammler:
    def __init__(self): self.bm = {}; self.name = {}
    def get(self, m):
        k = m.name
        if k not in self.bm: self.bm[k] = bmesh.new(); self.bm[k].faces.layers.int.new('teil'); self.name[k] = m
        return self.bm[k]
    def fertig(self, coll, prefix='cp'):
        out = []
        for k, bm in self.bm.items():
            me = bpy.data.meshes.new(prefix + ' ' + k); bm.to_mesh(me); bm.free(); me.materials.append(self.name[k])
            o = bpy.data.objects.new(prefix + ' ' + k, me); coll.objects.link(o); out.append(o)
        self.bm = {}; return out
SAM = Sammler()
# Marke für bewegliche Teile: Flächen, die innerhalb von „with Marke(n)“ entstehen, tragen n in der Flächenebene „teil“.
# cp_export.py schreibt sie in die Eckfarben, der Shader im Spiel bewegt sie (1 = Steuerknüppel links, 2 = rechts).
MARKE = [0]
class Marke:
    def __init__(self, n): self.n = n
    def __enter__(self): self.alt = MARKE[0]; MARKE[0] = self.n; return self
    def __exit__(self, *a): MARKE[0] = self.alt

# ---------- Rahmen (Lage der Bauteile) ----------
STAPEL = [Matrix.Identity(4)]
class Platz:
    """with Platz(ort, rx, ry, rz): … Bauteile darin liegen im verschobenen und gedrehten Rahmen (Winkel in Grad, Reihenfolge Z·X·Y)"""
    def __init__(self, ort=(0, 0, 0), rx=0.0, ry=0.0, rz=0.0, m=None):
        self.m = m if m is not None else (Matrix.Translation(Vector(ort)) @ Matrix.Rotation(math.radians(rz), 4, 'Z') @ Matrix.Rotation(math.radians(rx), 4, 'X') @ Matrix.Rotation(math.radians(ry), 4, 'Y'))
    def __enter__(self): STAPEL.append(STAPEL[-1] @ self.m); return self
    def __exit__(self, *a): STAPEL.pop()
def spiegel_x(): return Platz(m=Matrix.Scale(-1, 4, Vector((1, 0, 0))))
def welt(p): return STAPEL[-1] @ Vector(p)

def _ab(bm_teil, m):
    """fertiges Teil-bmesh in den Sammler; bei gespiegeltem Rahmen die Flächen wenden"""
    M = STAPEL[-1]; bmesh.ops.transform(bm_teil, matrix=M, verts=bm_teil.verts)
    if M.determinant() < 0: bmesh.ops.reverse_faces(bm_teil, faces=bm_teil.faces)
    me = bpy.data.meshes.new('t'); bm_teil.to_mesh(me); bm_teil.free()
    ziel = SAM.get(MAT[m] if isinstance(m, str) else m); n0 = len(ziel.faces); ziel.from_mesh(me); bpy.data.meshes.remove(me)
    if MARKE[0]:
        L = ziel.faces.layers.int['teil']; ziel.faces.ensure_lookup_table()
        for i in range(n0, len(ziel.faces)): ziel.faces[i][L] = MARKE[0]

def _fase(bm, f, seg=1):
    if f <= 0: return
    try: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=f, offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES', clamp_overlap=True)
    except Exception: pass

# ---------- Grundkörper ----------
def quader(m, g, ort=(0, 0, 0), fase=0.004, seg=1, rx=0.0, ry=0.0, rz=0.0):
    """Quader mit Fase; g = (Breite X, Tiefe Y, Höhe Z), ort = Mitte"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=Vector(g), verts=bm.verts); _fase(bm, min(fase, min(g) * 0.45), seg)
    with Platz(ort, rx, ry, rz): _ab(bm, m)

def prisma(m, umriss, tiefe, ort=(0, 0, 0), fase=0.004, seg=1, rx=0.0, ry=0.0, rz=0.0, achse='Y'):
    """Vieleck (Liste (a, b), gegen den Uhrzeigersinn) um „tiefe“ ausgezogen. achse Y: Umriss in X/Z, Tiefe entlang Y (mittig). X: Umriss in Y/Z. Z: Umriss in X/Y."""
    bm = bmesh.new(); h = tiefe / 2
    def P(a, b, t): return {'Y': (a, t, b), 'X': (t, a, b), 'Z': (a, b, t)}[achse]
    v0 = [bm.verts.new(P(a, b, -h)) for a, b in umriss]; v1 = [bm.verts.new(P(a, b, h)) for a, b in umriss]; n = len(umriss)
    bm.faces.new(v0); bm.faces.new(list(reversed(v1)))
    for i in range(n): bm.faces.new((v0[i], v1[i], v1[(i + 1) % n], v0[(i + 1) % n]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); _fase(bm, fase, seg)
    with Platz(ort, rx, ry, rz): _ab(bm, m)

def keil(m, g0, g1, tiefe, ort=(0, 0, 0), versatz=(0, 0), fase=0.004, seg=1, rx=0.0, ry=0.0, rz=0.0):
    """Pyramidenstumpf entlang Y: hinten (y = −tiefe/2) Rechteck g0 = (Breite, Höhe), vorn g1, vorn um versatz (x, z) verschoben. Für Hauben und Sockel."""
    bm = bmesh.new(); h = tiefe / 2; vs = []
    for (w, z), y, (dx, dz) in ((g0, -h, (0, 0)), (g1, h, versatz)):
        vs.append([bm.verts.new((dx + sx * w / 2, y, dz + sz * z / 2)) for sx, sz in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    a, b = vs; bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(4): bm.faces.new((a[i], b[i], b[(i + 1) % 4], a[(i + 1) % 4]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); _fase(bm, fase, seg)
    with Platz(ort, rx, ry, rz): _ab(bm, m)

def zyl(m, r, laenge, ort=(0, 0, 0), achse='Z', n=20, fase=0.0, r2=None, rx=0.0, ry=0.0, rz=0.0):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=laenge)
    if fase > 0:
        kanten = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
        try: bmesh.ops.bevel(bm, geom=kanten, offset=fase, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES')
        except Exception: pass
    if achse == 'X': bmesh.ops.rotate(bm, verts=bm.verts, matrix=Matrix.Rotation(PI / 2, 3, 'Y'))
    elif achse == 'Y': bmesh.ops.rotate(bm, verts=bm.verts, matrix=Matrix.Rotation(-PI / 2, 3, 'X'))
    with Platz(ort, rx, ry, rz): _ab(bm, m)

def kugel(m, r, ort=(0, 0, 0), n=14, skal=(1, 1, 1)):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=n, v_segments=max(6, n // 2), radius=r); bmesh.ops.scale(bm, vec=Vector(skal), verts=bm.verts)
    with Platz(ort): _ab(bm, m)

def rohr(m, pts, r, n=8, rund=0.0, kappen=True):
    """Rohr entlang einer Punktfolge; rund > 0 rundet die Ecken (Radius)"""
    P = [Vector(p) for p in pts]
    if rund > 0 and len(P) > 2:
        Q = [P[0]]
        for i in range(1, len(P) - 1):
            a, b, c = P[i - 1], P[i], P[i + 1]; d0 = (a - b); d1 = (c - b); k = min(rund, d0.length * 0.45, d1.length * 0.45)
            p0 = b + d0.normalized() * k; p1 = b + d1.normalized() * k
            for t in (0, 0.25, 0.5, 0.75, 1): Q.append((1 - t) ** 2 * p0 + 2 * t * (1 - t) * b + t * t * p1)
        Q.append(P[-1]); P = Q
    bm = bmesh.new(); ringe = []; vor = None
    for i, p in enumerate(P):
        t = (P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized()
        if vor is None:
            u = t.orthogonal().normalized()
        else:
            u = (vor - t * vor.dot(t))
            u = u.normalized() if u.length > 1e-6 else t.orthogonal().normalized()
        vor = u; w = t.cross(u)
        ringe.append([bm.verts.new(p + (u * math.cos(2 * PI * k / n) + w * math.sin(2 * PI * k / n)) * r) for k in range(n)])
    for a, b in zip(ringe, ringe[1:]):
        for k in range(n): bm.faces.new((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]))
    if kappen: bm.faces.new(list(reversed(ringe[0]))); bm.faces.new(ringe[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces); _ab(bm, m)

def flaeche(m, ecken, uv=False):
    """ebenes Vieleck (Punkte gegen den Uhrzeigersinn von vorn gesehen); uv: Texturkoordinaten 0…1 für Schirme (Ecken links unten, rechts unten, rechts oben, links oben)"""
    bm = bmesh.new(); vs = [bm.verts.new(p) for p in ecken]; f = bm.faces.new(vs)
    if uv:
        L = bm.loops.layers.uv.new('UVMap')
        for lp, t in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): lp[L].uv = t
    _ab(bm, m)

_FONT = {}
def schrift(s, hoehe, ort=(0, 0, 0), m='Schrift', rx=90.0, ry=0.0, rz=0.0, mitte=True):
    """Beschriftung als flaches Netz. Standardlage: stehend in X/Z, lesbar von −Y aus (also vom Piloten, der nach +Y schaut)."""
    cu = bpy.data.curves.new('txt', 'FONT'); cu.body = s; cu.size = hoehe; cu.align_x = 'CENTER' if mitte else 'LEFT'; cu.align_y = 'CENTER'; cu.resolution_u = 2
    o = bpy.data.objects.new('txt', cu); bpy.context.scene.collection.objects.link(o)
    me = bpy.data.meshes.new_from_object(o.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(o); bpy.data.curves.remove(cu)
    bm = bmesh.new(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    with Platz(ort, rx, ry, rz): _ab(bm, m)

# ---------- Rumpf des Schiffs als Bezug (Spiel-GLB, liegt danach in Bau-Koordinaten) ----------
def rumpf_laden(glb, laenge, coll_name='Rumpf'):
    vor = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=glb); neu = [o for o in bpy.data.objects if o not in vor]
    coll = bpy.data.collections.new(coll_name); bpy.context.scene.collection.children.link(coll)
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3); bpy.context.view_layer.update()
    netze = [o for o in neu if o.type == 'MESH']
    for o in netze:
        for v in o.data.vertices:
            w = o.matrix_world @ v.co
            for k in range(3): lo[k] = min(lo[k], w[k]); hi[k] = max(hi[k], w[k])
    c = (lo + hi) / 2; K = laenge / (hi.y - lo.y)
    # Spiel: um 180° um die Hochachse gedreht (Nase −z), Mitte in den Ursprung, auf die Länge skaliert → Bau: (X, Y, Z) = (−(x − cx), −(y − cy), z − cz) · K
    T = Matrix.Scale(K, 4) @ Matrix.Diagonal((-1, -1, 1, 1)) @ Matrix.Translation(-c)
    for o in netze:
        o.data.transform(T @ o.matrix_world); o.matrix_world = Matrix.Identity(4); o.parent = None
        for cc in list(o.users_collection): cc.objects.unlink(o)
        coll.objects.link(o)
    for o in neu:
        if o.type != 'MESH': bpy.data.objects.remove(o)
    return coll, netze

def rumpf_teile(netze, muster, zone, ziel_mat, sam=None, innen=None):
    """kopiert Flächen des Rumpfs (Materialname passt auf muster, Flächenmitte in der Zone ((x0, y0, z0), (x1, y1, z1))) als ziel_mat ins Cockpit"""
    import re
    pat = re.compile(muster, re.I); (x0, y0, z0), (x1, y1, z1) = zone; n = 0
    bm = bmesh.new()
    for o in netze:
        me = o.data; idx = [i for i, m in enumerate(me.materials) if m and pat.search(m.name)]
        if not idx: continue
        vmap = {}
        for p in me.polygons:
            if p.material_index not in idx: continue
            c = p.center
            if not (x0 <= c.x <= x1 and y0 <= c.y <= y1 and z0 <= c.z <= z1): continue
            if innen and not innen(c): continue
            vs = []
            for vi in p.vertices:
                if vi not in vmap: vmap[vi] = bm.verts.new(me.vertices[vi].co)
                vs.append(vmap[vi])
            try: bm.faces.new(vs); n += 1
            except Exception: pass
    if n: _ab(bm, ziel_mat)
    else: bm.free()
    return n

# ---------- Szene, Licht, Kamera, Bild ----------
def neu_szene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.unit_settings.system = 'METRIC'
    return sc

def kamera(name, auge, blick_az=0.0, blick_el=0.0, fov=76.0):
    """Kamera am Augpunkt; az: Grad nach rechts, el: Grad nach oben; brenn 14 mm ≈ 76° senkrecht bei 16:9 auf 36-mm-Sensor? (Sensor senkrecht eingestellt)"""
    cam = bpy.data.cameras.new(name); cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 24; cam.lens = 12 / math.tan(math.radians(fov / 2)); cam.clip_start = 0.02; cam.clip_end = 5000
    o = bpy.data.objects.new(name, cam); bpy.context.scene.collection.objects.link(o); o.location = Vector(auge)
    a, e = math.radians(blick_az), math.radians(blick_el); d = Vector((math.sin(a) * math.cos(e), math.cos(a) * math.cos(e), math.sin(e)))
    o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); return o

def bild(pfad, cam, breite=1600, hoehe=900, samples=48, welt=0.6, sonne=None):
    sc = bpy.context.scene; sc.camera = cam; sc.render.engine = 'CYCLES'; sc.cycles.samples = samples; sc.cycles.use_denoising = True
    try:
        cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
        for d in cp.devices: d.use = d.type == 'OPTIX'
        sc.cycles.device = 'GPU'
    except Exception: pass
    if sc.world is None: sc.world = bpy.data.worlds.new('W')
    sc.world.use_nodes = True; bg = sc.world.node_tree.nodes.get('Background')
    if bg: bg.inputs[0].default_value = (0.02, 0.035, 0.07, 1); bg.inputs[1].default_value = welt
    if sonne is not None and 'CP Sonne' not in bpy.data.objects:
        L = bpy.data.lights.new('CP Sonne', 'SUN'); L.energy = sonne[1]; L.angle = 0.02; so = bpy.data.objects.new('CP Sonne', L); sc.collection.objects.link(so)
        so.rotation_euler = Vector(sonne[0]).normalized().to_track_quat('Z', 'Y').to_euler()
    sc.render.resolution_x = breite; sc.render.resolution_y = hoehe; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 90
    sc.view_settings.view_transform = 'AgX'; sc.render.filepath = pfad; bpy.ops.render.render(write_still=True)
