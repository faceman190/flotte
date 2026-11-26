# Milan (25.11.2026): eigener leichter Jäger, das neue Startschiff der Bastion (ersetzt die gekaufte Venom).
# Wunsch des Nutzers: „Kleiner Jäger, 1 Sitz mit Cockpit. Plausibel, also mit Einstieg, Platz für ein bisschen Fracht, vielleicht eine Kiste
# 10 Einheiten hinten mit Öffnung, Fahrwerk, das ausfahrbar ist usw. … gib dir Mühe, besser als alles bisher.“
# Eigener Entwurf, kein Vorbild aus einem anderen Spiel.
#
# Aufbau (Achsen wie Würger und Elster: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0):
#  - Rumpf aus Superellipsen-Spanten: Ogivnase mit dunklem Radom, breiter Mittelrumpf mit Seitenkante, flaches Heck mit zwei Düsen
#  - Seiteneinläufe mit Grenzschichtspalt, Splitterplatte, Lippe, Kanal und Verdichterrad
#  - einteilige Blasenkanzel, hinten angeschlagen (klappt vorn hoch); darunter Cockpit mit Schleudersitz, Tafel, HUD, Knüppel, Konsolen
#  - Rückengrat hinter der Kanzel; im Heck des Grats das Frachtfach für eine Normkiste (1,2 × 0,8 × 0,8 m = 10 E) mit Heckklappe
#  - Flügel mit Wurzelleiste (LERX), echtem Profil, Ruderfugen, Startschienen mit Flugkörpern; zwei schräge Seitenleitwerke, zwei Bauchflossen
#  - einziehbares Fahrwerk (seit 25.11.2026 Landebeine mit Füßen statt Rädern, der Nutzer: Raumschiffe starten senkrecht): Bugbein
#    fährt nach hinten ein, die Hauptbeine nach vorn in die Rumpfseiten; Schächte mit Klappen. foot() und bein_fuss() nutzt auch die Dohle
#  - Bordleiter links unter der Kanzel hinter einer Klappe, Trittmulde und Haltegriff
# Bewegliche Teile hängen an Gelenken (GELENKE). Blender zeigt jeden Zustand (zustand()); die Gelenke gehen als Liste nach mil-anker.json,
# mil_export.py rechnet sie in die Koordinaten der GLB-Datei um (für src/models/gltfShips.ts).
#
# Aufruf ohne Fenster: blender.exe -b --python mil_lauf.py -- <ansichten> | alle | bauplan
# Werkzeuge, Grundmaterialien, Bühnen und Kameras kommen aus ../elster/els_kit.py (und darüber ../wuerger/wue_kit.py).
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER_ELSTER = True
_ek = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'elster', 'els_kit.py')
exec(compile(open(_ek, encoding='utf-8').read(), 'els_kit.py', 'exec'))
HIER = os.path.dirname(bpy.data.filepath)
ANCH = {}

# =====================================================================================
# Materialien: zweifarbig (oben Taubengrau, unten Graphit), dunkles Radom, sparsam Signalorange
# =====================================================================================
M['p_hell'] = panel_mat('Rumpf Taubengrau', (0.150, 0.155, 0.160), 0.32, 0.43, 0.85, brick=(1.25, 0.72), mortar=0.008)
M['p_graphit'] = panel_mat('Rumpf Graphit', (0.036, 0.039, 0.044), 0.5, 0.4, 0.6, brick=(1.25, 0.72), mortar=0.008)
M['p_radom'] = panel_mat('Rumpf Radom', (0.018, 0.019, 0.021), 0.15, 0.5, 0.35, rivets=False)
M['p_orange'] = panel_mat('Rumpf Signalorange', (0.33, 0.075, 0.01), 0.2, 0.42, 0.9, brick=(1.25, 0.72), rivets=False)
M['hell'] = hull_mat('Lack Taubengrau', (0.14, 0.145, 0.15), 0.3, 0.45, 0.8)
M['graphit'] = hull_mat('Lack Graphit', (0.036, 0.039, 0.044), 0.5, 0.4, 0.6)
M['orange'] = hull_mat('Lack Signalorange', (0.33, 0.075, 0.01), 0.2, 0.42, 0.9)
M['schacht'] = mk('Schachtgrund', (0.05, 0.052, 0.056), 0.4, 0.5, var=0.15, scale=3.0, bump=0.2, wear=0.4)
M['bucht'] = mk('Frachtfach', (0.07, 0.074, 0.08), 0.35, 0.5, var=0.12, scale=3.0, bump=0.25, wear=0.6)
M['reifen'] = mk('Reifen', (0.014, 0.014, 0.015), 0.0, 0.82, var=0.1, scale=6.0, bump=0.35, bscale=260)
M['felge'] = mk('Felge', (0.32, 0.33, 0.34), 0.9, 0.32, var=0.08, wear=0.5)
M['formlicht'] = mk('Formationsleuchte', (0.2, 1.0, 0.45), 0, 0.3, var=0, rvar=0, emit=(0.25, 1.0, 0.45), es=3.0, grime=False)
M['innen3'] = mk('Cockpit Grau', (0.09, 0.094, 0.1), 0.25, 0.5, var=0.1, scale=3.0, bump=0.2, wear=0.4)
M['rotlack'] = hull_mat('Lack Signalrot', (0.3, 0.015, 0.01), 0.25, 0.42, 0.75)
M['kiste'] = mk('Normkiste', (0.32, 0.18, 0.04), 0.2, 0.5, var=0.12, scale=3.0, bump=0.2, wear=0.8)
HULL_MATS = ['p_hell', 'p_graphit', 'p_radom', 'p_orange']
HELL, GRAPHIT, RADOM, ORANGE = 0, 1, 2, 3

# =====================================================================================
# 1. Rumpf: Spanten aus Superellipsen (Tabelle), Ogivnase, flaches Heck
# =====================================================================================
XN, XT, ZTIP = 5.4, 7.75, 2.33      # Beginn der Nasenrundung, Spitze, Höhe der Spitze
XR, XE = -6.1, -6.95                # Beginn des Hecks, Heckebene
TBL = [  # x, halbe Breite, Oberkante, Unterkante, Exponent (größer = kastiger, Seitenkante)
    (-6.1, 1.52, 2.88, 1.80, 3.0), (-5.0, 1.68, 2.93, 1.67, 3.2), (-3.4, 1.80, 2.98, 1.57, 3.4), (-1.6, 1.79, 3.02, 1.53, 3.4),
    (0.0, 1.56, 3.05, 1.53, 3.2), (1.4, 1.22, 3.07, 1.56, 3.0), (2.8, 0.99, 3.02, 1.61, 2.8), (4.2, 0.85, 2.92, 1.69, 2.6), (5.4, 0.70, 2.79, 1.79, 2.4)]
_F = [pchip([r[0] for r in TBL], [r[k] for r in TBL], 0.0, 0.0) for k in range(1, 5)]
def base(x): return tuple(f(x) for f in _F)
def params(x):
    if x > XN:      # Ogive: Breite und Höhe laufen spitz zu, Oberseite etwas flacher (Blick über die Nase)
        e = min(1.0, (x - XN) / (XT - XN)); W0, zt0, zb0, n0 = base(XN)
        fw = max(0.0, 1 - e ** 1.75) ** 0.62; ft = max(0.0, 1 - e ** 1.55) ** 0.62; fb = max(0.0, 1 - e ** 1.95) ** 0.62
        return W0 * fw, ZTIP + (zt0 - ZTIP) * ft, ZTIP - (ZTIP - zb0) * fb, n0 + (2.0 - n0) * e
    if x < XR:      # Heck: leicht eingezogen bis zur Heckebene
        e = min(1.0, (XR - x) / (XR - XE)); g = 1 - 0.14 * e * e
        W0, zt0, zb0, n0 = base(XR); zc0 = zb0 + 0.48 * (zt0 - zb0)
        return W0 * g, zc0 + (zt0 - zc0) * g, zc0 - (zc0 - zb0) * g, n0
    return base(x)
def zc_of(x): W, zt, zb, n = params(x); return zb + 0.48 * (zt - zb)
def top_z(x, y):      # Oberseite des Rumpfs über der Querlage y
    W, zt, zb, n = params(x); zc = zb + 0.48 * (zt - zb); u = min(1.0, abs(y) / max(W, 1e-6))
    return zc + (zt - zc) * max(0.0, 1 - u ** n) ** (1 / n)
def bot_z(x, y):
    W, zt, zb, n = params(x); zc = zb + 0.48 * (zt - zb); u = min(1.0, abs(y) / max(W, 1e-6))
    return zc - (zc - zb) * max(0.0, 1 - u ** n) ** (1 / n)
def t_of_y(x, y, top=True):      # Winkel auf dem Rumpf (wie hull_point) zur Querlage y, oben oder unten
    W, zt, zb, n = params(x); s = min(1.0, abs(y) / max(W, 1e-6)) ** (n / 2); a = math.asin(min(1.0, s))
    return math.copysign(a if top else PI - a, y if y != 0 else 1)

NRING = 96
def x_samples():
    xs = [XE + (XR - XE) * k / 8 for k in range(8)]
    x = XR
    while x < XN - 1e-6: xs.append(x); x += 0.1
    K = 40
    for k in range(K): xs.append(XN + (XT - XN) * math.sin(k / K * PI / 2))
    return sorted(set(round(v, 4) for v in xs))
SEAM_X = [4.95, 1.2, -1.0, -3.6, -5.5]      # Hauptfugen (Spanten); die Radomfuge liegt bei 6,35
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten')
    XS = x_samples(); rings = []
    for x in XS: rings.append([bm.verts.new(hull_point(x, 2 * PI * k / NRING)) for k in range(NRING)])
    tip = bm.verts.new((XT, 0, ZTIP))
    faces = []
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING
            f = bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])); faces.append((f, i, k))
    for k in range(NRING): bm.faces.new((rings[-1][k], tip, rings[-1][(k + 1) % NRING])).material_index = RADOM
    tail = bm.faces.new([rings[0][k] for k in range(NRING)][::-1]); tail.material_index = GRAPHIT      # Heckebene (dort sitzen die Düsen)
    for f, i, k in faces:      # unten Graphit (unterhalb der Seitenkante), Radom vorn, sonst Taubengrau
        xm = (XS[i] + XS[i + 1]) / 2
        if xm > 6.35: f.material_index = RADOM
        elif 29 <= k < 67: f.material_index = GRAPHIT
        else: f.material_index = HELL
    vk = {}
    for i, r in enumerate(rings):
        for k, v in enumerate(r): vk[v] = (XS[i], k)
    for f, i, k in faces:
        ks = [vk[lp.vert][1] for lp in f.loops]; wrap = max(ks) - min(ks) > NRING // 2
        for lp in f.loops:
            x, kv = vk[lp.vert]
            if wrap and kv < NRING // 2: kv += NRING
            lp[uvl].uv = (x, 2 * PI * kv / NRING * 1.3)
    bm.normal_update()
    return bm, rings, XS

# Öffnungen im Rumpf: Cockpit unter der Kanzel, Bugradschacht, zwei Hauptfahrwerksschächte, Leiterschacht, Frachtfach unter dem Grat
CX0, CX1, CXC, CHL, CW = 1.35, 4.85, 3.1, 1.75, 0.64      # Kanzel: hinten, vorn, Mitte, halbe Länge, halbe Breite
def canopy_yb(x):
    e = (x - CXC) / CHL
    return CW * max(0.0, 1 - e * e) ** 0.36 if abs(e) < 1 else 0.0
NB = (5.12, 3.02, 0.235)            # Bugradschacht: x vorn, x hinten, halbe Breite
MB = (-0.22, -2.42, 1.14, 1.57)     # Hauptschacht: x vorn, x hinten, |y| innen, |y| außen
LADDER = (2.62, 3.28, 1.68, 1.98)   # Leiterklappe links: x hinten, x vorn, z unten, z oben (an der Seite)
BAY = (XE - 0.03, -5.25, 0.47, 2.82, 3.64)      # Frachtfach innen: x hinten, x vorn, halbe Breite, Boden, Decke
def cut_openings(bm):
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        if CX0 + 0.05 < c.x < CX1 - 0.05 and c.z > 2.6 and abs(c.y) < canopy_yb(c.x) - 0.035: dead.append(f); continue
        if NB[1] < c.x < NB[0] and abs(c.y) < NB[2] and c.z < zc_of(c.x): dead.append(f); continue
        if MB[1] < c.x < MB[0] and MB[2] < abs(c.y) < MB[3] and c.z < zc_of(c.x) - 0.15: dead.append(f); continue
        if LADDER[0] < c.x < LADDER[1] and LADDER[2] < c.z < LADDER[3] and c.y > 0.3: dead.append(f); continue
        if BAY[0] - 0.2 < c.x < BAY[1] - 0.02 and abs(c.y) < BAY[2] - 0.01 and c.z > zc_of(c.x): dead.append(f); continue
    bmesh.ops.delete(bm, geom=dead, context='FACES')

# =====================================================================================
# Hilfen: Flicken auf dem Rumpf, offene Kästen (Schächte), Gelenke
# =====================================================================================
def hull_patch(name, x0, x1, y0, y1, top, m, lift=0.004, rows=10, cols=12, thick=0.0, col=None):
    bm = bmesh.new(); R = []
    for i in range(rows + 1):
        x = x0 + (x1 - x0) * i / rows; row = []
        for j in range(cols + 1):
            t = t_of_y(x, y0 + (y1 - y0) * j / cols, top); row.append(bm.verts.new(hull_point(x, t) + hull_normal(x, t) * lift))
        R.append(row)
    for i in range(rows):
        for j in range(cols): bm.faces.new((R[i][j], R[i + 1][j], R[i + 1][j + 1], R[i][j + 1]))
    bm.normal_update()
    xm, ym = (x0 + x1) / 2, (y0 + y1) / 2; nw = hull_normal(xm, t_of_y(xm, ym, top))
    if sum(f.normal.dot(nw) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    ob = mesh_obj(name, bm, [m], True, col)
    if thick:
        so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = thick; so.offset = -1.0
    return ob
def side_patch2(name, x0, x1, z0, z1, s, m, lift=0.004, rows=8, cols=10, thick=0.0, col=None):
    ob = side_patch(name, x0, x1, z0, z1, 0.0001, s, lift, m, rows, cols, col)
    if thick:
        so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = thick; so.offset = -1.0
    return ob
def open_box(name, x0, x1, y0, y1, z0, z1, m, open_side, col=None, floor=None):      # Kasten mit offener Seite ('-z', '+y' …), Innenseiten sichtbar
    # floor(x, y): Unterkante der Wände folgt dem Rumpf (Schächte im Boden), sonst gerade bei z0
    bmb = bmesh.new(); bmesh.ops.create_cube(bmb, size=1.0)
    bmesh.ops.subdivide_edges(bmb, edges=[e for e in bmb.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6], cuts=8, use_grid_fill=True)
    for v in bmb.verts:
        x = x0 + (x1 - x0) * (v.co.x + 0.5); y = y0 + (y1 - y0) * (v.co.y + 0.5); low = v.co.z < 0
        v.co.x, v.co.y = x, y; v.co.z = (floor(x, y) if (floor and low) else z0) if low else z1
    ax = {'x': 0, 'y': 1, 'z': 2}[open_side[1]]; sg = 1 if open_side[0] == '+' else -1
    bmesh.ops.delete(bmb, geom=[f for f in bmb.faces if f.normal[ax] * sg > 0.9], context='FACES'); bmesh.ops.reverse_faces(bmb, faces=bmb.faces[:])
    return mesh_obj(name, bmb, [m], False, col)
def wrap_text(o, target, off=0.003):      # Schrift zu Netz, auf die Fläche gelegt (Shrinkwrap): taucht auf Wölbungen nicht ein
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    ob = link(bpy.data.objects.new(o.name, me)); ob.matrix_world = o.matrix_world.copy(); bpy.data.objects.remove(o, do_unlink=True)
    sw = ob.modifiers.new('Auflegen', 'SHRINKWRAP'); sw.target = target; sw.offset = off; sw.wrap_mode = 'OUTSIDE_SURFACE'
    return ob
def surf_text(s_, size, p, n, up_hint=(0, 0, 1), m='txtd', target=None):      # Schrift auf einer Fläche (Punkt, Normale), lesbar von außen
    n = Vector(n).normalized(); up = Vector(up_hint) - n * n.dot(Vector(up_hint)); up = up.normalized() if up.length > 0.2 else Vector((1, 0, 0))
    xd = up.cross(n).normalized(); CUR[0] = C_DECAL
    o = text(s_, size, tuple(Vector(p) + n * 0.006 - up * size * 0.35), tuple(xd), tuple(up), M[m], align='CENTER', name='Beschriftung')
    return wrap_text(o, target) if target else o
class Gruppe:      # alles, was darin entsteht, hängt später an einem Gelenk (Objekte mit Eltern bleiben an ihren Eltern)
    def __init__(self, tag): self.tag = tag
    def __enter__(self): self.prev = REC[0]; REC[0] = []; return self
    def __exit__(self, *a):
        objs = REC[0]; REC[0] = self.prev
        if self.prev is not None: self.prev.extend(objs)
        GRUPPEN.setdefault(self.tag, []).extend(objs)
        return False
GRUPPEN = {}
# Gelenke: Kennung, Gelenkpunkt (Blender), Achse (Blender), Winkel (rad) vom gebauten Zustand zum anderen, Gruppe, Abschnitt t0–t1.
#  fw: gebaut ausgefahren, Winkel = Einfahren (Fortschritt 0 unten … 1 eingefahren)
#  fracht: gebaut zu, Winkel = Öffnen (0 zu … 1 offen)
#  leiter: gebaut offen; inv: Winkel = Schließen (wirkt bei Fortschritt 0); slide: Weg beim Einfahren (retract, wie die Kormoran-Leiter)
GELENKE = []
PIVOTS = {}
def gelenk(tag, hinge, axis=None, angle=0.0, grp='fw', t0=0.0, t1=1.0, slide=None, inv=False):
    GELENKE.append(dict(tag=tag, hinge=[round(v, 4) for v in hinge], axis=axis, angle=round(angle, 5), grp=grp, t0=t0, t1=t1, slide=[round(v, 4) for v in slide] if slide else None, inv=inv))
def gelenke_anlegen():
    def piv(tag, hinge):
        e = bpy.data.objects.new('Gelenk ' + tag, None); C_PART.objects.link(e); e.location = hinge; e.empty_display_size = 0.15; PIVOTS[tag] = e
        for o in GRUPPEN.get(tag, []):
            if o.parent is not None: continue
            o.parent = e; o.matrix_parent_inverse = Matrix.Translation(Vector(hinge)).inverted()      # Lage in der Welt bleibt, das Gelenk dreht um hinge
        return e
    for g in GELENKE:
        e = piv(g['tag'], g['hinge'] if not g['slide'] else (0, 0, 0))
        for o in [e] + list(e.children_recursive): o['tag'] = g['tag']
    piv('kanzel', ANCH['kanzel_gelenk'])      # Kanzel: im Spiel über das Glas-Material (gltfShips.ts KANZEL), hier nur fürs Bild
def ease(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def zustand(fw=0.0, fracht=0.0, leiter=1.0, kanzel=0.0):
    # Fortschritt wie im Spiel: fw 0 ausgefahren … 1 eingefahren; fracht und leiter 0 zu … 1 offen
    want = {'fw': fw, 'fracht': fracht, 'leiter': leiter}
    for g in GELENKE:
        e = PIVOTS[g['tag']]; p = want[g['grp']]; k = ease((p - g['t0']) / (g['t1'] - g['t0']))
        if g['slide']:
            f = 1 - k; e.location = Vector(g['slide']) * f; hid = p <= g['t0']
            for o in [e] + list(e.children_recursive): o.hide_render = hid
        else:
            kk = 1 - k if g['inv'] else k
            e.rotation_euler = (0, 0, 0); e.rotation_euler[{'X': 0, 'Y': 1, 'Z': 2}[g['axis']]] = g['angle'] * kk
    PIVOTS['kanzel'].rotation_euler = (0, -KANZEL_WINKEL * kanzel, 0)
    bpy.context.view_layer.update()

# =====================================================================================
# 2. Kanzel: einteilige Blase, Rahmen (Bügel vorn, Rahmen hinten, Schienen), hinten angeschlagen
# =====================================================================================
KANZEL_WINKEL = 0.62
CPX, CPZ = 2.45, 3.79      # Scheitel der Kanzel
def canopy_top(x):
    e = (x - CPX) / (CPX - CX0 if x < CPX else CX1 - CPX)
    return top_z(x, 0) + (CPZ - top_z(CPX, 0)) * max(0.0, 1 - e * e) ** 0.55 if abs(e) < 1 else top_z(x, 0)
def canopy_pt(x, a, lift=0.0):      # a: 0 (Schiene Backbord) … PI (Schiene Steuerbord)
    yb = canopy_yb(x); ca, sa = math.cos(a), math.sin(a); p = 2 / 2.4
    y = yb * math.copysign(abs(ca) ** p, ca); zb_ = top_z(x, y); h = max(0.0, canopy_top(x) - top_z(x, 0))
    return Vector((x, y, zb_ + h * abs(sa) ** p + lift))
def canopy_normal(x, a):
    dx, da = 0.01, 0.01
    n = (canopy_pt(x + dx, a) - canopy_pt(x - dx, a)).cross(canopy_pt(x, a + da) - canopy_pt(x, a - da))
    n = n.normalized() if n.length > 1e-9 else Vector((0, 0, 1))
    return n if n.z >= -0.2 or abs(canopy_pt(x, a).y) > 0 and n.dot(Vector((0, canopy_pt(x, a).y, 0.3))) > 0 else -n
def band3(name, P, Nn, w, h, m, closed=False):      # Band auf einer gekrümmten Fläche, Normalen nach außen
    ob = strip_mesh(name, P, Nn, w, h, m, closed, 0.004); me = ob.data
    if sum(p.normal.dot(Nn[min(range(len(P)), key=lambda i: (P[i] - p.center).length)]) for p in me.polygons[:12]) < 0: me.flip_normals()
    return ob
def canopy():
    CUR[0] = C_PART
    with Gruppe('kanzel'):
        bm = bmesh.new(); XS = [CX0 + 0.02 + (CX1 - CX0 - 0.04) * (1 - math.cos(PI * i / 44)) / 2 for i in range(45)]; NA = 52; R = []
        for x in XS: R.append([bm.verts.new(canopy_pt(x, PI * j / NA, 0.006)) for j in range(NA + 1)])
        for i in range(len(R) - 1):
            for j in range(NA): bm.faces.new((R[i][j], R[i + 1][j], R[i + 1][j + 1], R[i][j + 1]))
        bm.normal_update()
        if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
        mesh_obj('Kanzelglas', bm, ['glas2'])
        def nrm(x, a):
            n = (canopy_pt(x + 0.01, a) - canopy_pt(x - 0.01, a)).cross(canopy_pt(x, a + 0.01) - canopy_pt(x, a - 0.01)).normalized()
            c = canopy_pt(x, a); return n if n.dot(Vector((0, c.y, max(0.05, c.z - 2.6)))) > 0 else -n
        for xb, w in ((4.18, 0.06), (CX0 + 0.14, 0.085)):      # Bügel hinter der Frontscheibe, Rahmen hinten
            js = [PI * j / 60 for j in range(61)]
            band3('Kanzelbuegel', [canopy_pt(xb, a, 0.006) for a in js], [nrm(xb, a) for a in js], w, 0.035, M['frame'])
        for a in (0.02, PI - 0.02):      # Schienen längs der Unterkante
            xs = [CX0 + 0.08 + (CX1 - CX0 - 0.16) * i / 60 for i in range(61)]
            band3('Kanzelschiene', [canopy_pt(x, a, 0.006) for x in xs], [nrm(x, 0.35 if a < 1 else PI - 0.35) for x in xs], 0.04, 0.04, M['frame'])
        box('Kanzelspiegel', 0.03, 0.16, 0.05, 4.11, 0, canopy_top(4.11) - 0.09, M['dunkel'], 0.008)
        xg = CX0 + 0.3
        pipe('Kanzelgriff', [Vector((xg, -0.16, canopy_top(xg) - 0.07)), Vector((xg + 0.04, 0, canopy_top(xg + 0.04) - 0.1)), Vector((xg, 0.16, canopy_top(xg) - 0.07))], 0.012, M['warnrw'])
    xh = CX0 + 0.14; ANCH['kanzel_gelenk'] = Vector((xh, 0, canopy_top(xh) + 0.02)); ANCH['kanzel'] = canopy_pt(3.4, PI * 0.25, 0.1)
    # Dichtrand am Rumpf (fest): Rand der Öffnung
    P = []; Nn = []
    for i in range(121):
        u = i / 120; x = CX0 + 0.04 + (CX1 - CX0 - 0.08) * (0.5 - 0.5 * math.cos(2 * PI * u)); s = 1 if u < 0.5 else -1
        y = s * max(0.02, canopy_yb(x) - 0.012); t = t_of_y(x, y, True); P.append(hull_point(x, t)); Nn.append(hull_normal(x, t))
    strip_mesh('Kanzeldichtung', P, Nn, 0.035, 0.018, M['rubber'], True, 0.003)

# =====================================================================================
# 3. Cockpit: Wanne mit Fußrampe, Schleudersitz, Tafel mit drei Anzeigen und HUD, Knüppel, Schubhebel, Seitenkonsolen, Avionikkasten
# =====================================================================================
FL = 2.05
def floor_z(x): return FL + 0.14 * ease((x - 2.8) / 0.35)
def cockpit():
    CUR[0] = C_ROOM; bm = bmesh.new(); R = []
    XSC = [CX0 + 0.06 + (CX1 - 0.22 - CX0 - 0.06) * i / 30 for i in range(31)]
    for x in XSC:
        yi = max(0.3, min(params(x)[0] - 0.08, canopy_yb(x) + 0.05)); zt = top_z(x, yi) - 0.03; fz = floor_z(x)
        side = [Vector((x, yi, zt)), Vector((x, yi, fz + 0.3)), Vector((x, yi * 0.78, fz))]
        R.append(side + [Vector((p.x, -p.y, p.z)) for p in reversed(side)])
    V = [[bm.verts.new(p) for p in r] for r in R]
    for i in range(len(V) - 1):
        for k in range(len(V[0]) - 1): bm.faces.new((V[i][k], V[i][k + 1], V[i + 1][k + 1], V[i + 1][k]))
    bm.faces.new(V[0]); bm.faces.new(V[-1][::-1]); bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Cockpitwanne', bm, ['innen3'], True, C_ROOM)
    # Schleudersitz: Schienen, Wanne, Polster, Lehne, Kopfteil mit Fallschirmkasten, Gurtzeug, Zuggriff, Seitenkisten
    xs = 2.28
    with Part('Schleudersitz', T(xs, 0, FL) @ RY(math.radians(-13)), C_ROOM):
        for s in (1, -1):
            box('Sitzschiene', 0.07, 0.05, 1.2, -0.22, s * 0.24, 0.62, M['mittel'], 0.01); box('Seitenkiste', 0.4, 0.08, 0.26, 0.12, s * 0.27, 0.22, M['dunkel'], 0.015)
            box('Gurt', 0.012, 0.055, 0.6, -0.06, s * 0.12, 0.68, M['gurt'], 0.002); box('Beckengurt', 0.34, 0.05, 0.012, 0.14, s * 0.13, 0.41, M['gurt'], 0.002)
            cyl('Schulterrolle', 0.025, 0.05, -0.12, s * 0.12, 1.06, M['mittel'], 'Y', n=12)
            box('Kopfwange', 0.16, 0.04, 0.2, -0.1, s * 0.16, 1.2, M['dunkel'], 0.012)
        box('Sitzwanne', 0.48, 0.46, 0.18, 0.12, 0, 0.24, M['dunkel'], 0.02); box('Sitzpolster', 0.44, 0.42, 0.09, 0.13, 0, 0.37, M['sitz'], 0.03)
        box('Lehne', 0.11, 0.44, 0.72, -0.13, 0, 0.76, M['sitz'], 0.035); box('Kopfteil', 0.18, 0.34, 0.22, -0.12, 0, 1.2, M['dunkel'], 0.04)
        box('Kopfpolster', 0.05, 0.24, 0.15, -0.02, 0, 1.19, M['sitz'], 0.02); box('Fallschirmkasten', 0.14, 0.4, 0.28, -0.2, 0, 0.98, M['mittel'], 0.02)
        cyl('Zuggriff', 0.012, 0.18, 0.38, 0, 0.39, M['warnrw'], 'Y', n=10); box('Gurtschloss', 0.07, 0.07, 0.025, 0.1, 0, 0.48, M['chrom'], 0.006)
    surf_text('RETTUNG', 0.028, (xs - 0.3, 0, FL + 1.27), (-1, 0, 0.2), (0, 0, 1), 'txto')
    # Instrumententafel: schräg zum Piloten, drei Anzeigen mit Randtasten, Blendschutz, HUD
    xp = 3.9; fz = floor_z(xp)
    prism('Tafel', [(xp + 0.28, fz + 0.2), (xp + 0.34, fz + 0.2), (xp + 0.34, fz + 0.68), (xp + 0.08, fz + 0.7), (xp, fz + 0.62)], -0.5, 0.5, M['verkleidung'], 'Y', 0.015)
    prism('Blendschutz', [(xp - 0.02, fz + 0.7), (xp + 0.44, fz + 0.72), (xp + 0.44, fz + 0.76), (xp - 0.06, fz + 0.75)], -0.44, 0.44, M['dunkel'], 'Y', 0.012)
    for y, mm in ((0.3, 'mfd2'), (0.0, 'mfd'), (-0.3, 'mfd')):
        with Part('Anzeige', T(xp + 0.03, y, fz + 0.52) @ RY(math.radians(-62)), C_ROOM):
            box('Rahmen', 0.24, 0.26, 0.025, 0, 0, 0, M['dunkel'], 0.006); box('Bild', 0.19, 0.21, 0.004, 0, 0, 0.014, M[mm], 0)
            for k in range(5):
                for sg in (1, -1): box('Randtaste', 0.025, 0.02, 0.01, -0.09 + k * 0.045, sg * 0.118, 0.014, M['taste'], 0.003)
    with Part('HUD', T(xp + 0.14, 0, fz + 0.76), C_ROOM):
        box('HUD-Sockel', 0.16, 0.18, 0.06, 0, 0, 0.03, M['dunkel'], 0.008)
        for s in (1, -1): box('HUD-Stuetze', 0.02, 0.012, 0.2, -0.02, s * 0.08, 0.14, M['dunkel'], 0.003)
        box('HUD-Scheibe', 0.004, 0.17, 0.14, -0.03, 0, 0.17, M['glas2'], 0.002, rot=(0, math.radians(-20), 0))
    with Part('Steuerknueppel', T(2.82, 0.0, floor_z(2.82) + 0.12), C_ROOM):
        cyl('Manschette', 0.06, 0.06, 0, 0, 0.0, M['rubber'], 'Z', n=16); cyl('Knueppel', 0.018, 0.4, 0, 0, 0.2, M['dunkel'], 'Z', n=12)
        box('Griff', 0.06, 0.05, 0.12, 0.01, 0, 0.44, M['dunkel'], 0.015); box('Abzug', 0.015, 0.03, 0.03, 0.045, 0, 0.42, M['rotlack'], 0.004); box('Daumentaste', 0.02, 0.02, 0.01, -0.01, 0, 0.51, M['taste'], 0.004)
    for s in (1, -1):      # Seitenkonsolen: links Schubhebel, rechts Schalter
        y = s * 0.44
        box('Seitenkonsole', 1.25, 0.2, 0.34, 2.7, y, FL + 0.17, M['verkleidung'], 0.02)
        for k in range(6): box('Schalter', 0.08, 0.05, 0.018, 2.2 + k * 0.17, y, FL + 0.35, M['taste'], 0.004)
        box('Konsolenlicht', 1.05, 0.012, 0.012, 2.7, y - s * 0.1, FL + 0.335, M['e_teal'], 0)
    with Part('Schubhebel', T(2.45, 0.44, FL + 0.35) @ RY(math.radians(18)), C_ROOM):
        box('Hebelfuss', 0.12, 0.06, 0.03, 0, 0, 0.0, M['dunkel'], 0.006); cyl('Hebel', 0.015, 0.16, 0, 0, 0.08, M['mittel'], 'Z', n=10); box('Hebelgriff', 0.09, 0.06, 0.07, 0.01, 0, 0.18, M['dunkel'], 0.015)
    for s in (1, -1): box('Pedal', 0.04, 0.12, 0.2, 4.1, s * 0.16, floor_z(4.1) + 0.14, M['dunkel'], 0.01, rot=(0, math.radians(20), 0))
    box('Avionikkasten', 0.24, 0.56, 0.36, CX0 + 0.2, 0, FL + 0.5, M['dunkel'], 0.02)
    for k in range(4): box('Kuehlschlitz', 0.012, 0.42, 0.02, CX0 + 0.33, 0, FL + 0.38 + k * 0.06, M['mittel'], 0.002)
    area('Cockpitlicht', (2.9, 0, 3.5), (0, 0, 0), 0.7, 0.5, 60, (0.85, 0.9, 1.0))
    ANCH['sitz'] = Vector((xs, 0, FL + 0.9))

# Cockpit in Feinausführung (26.11.2026): ersetzt cockpit() oben (bleibt als Vergleich stehen)
exec(compile(open(os.path.join(HIER, 'mil_cockpit.py'), encoding='utf-8').read(), 'mil_cockpit.py', 'exec'))

# =====================================================================================
# 4. Rückengrat mit Frachtfach und Heckklappe
# =====================================================================================
SPX = [(1.45, 0.42, 3.12), (0.8, 0.55, 3.34), (-0.4, 0.61, 3.55), (-1.8, 0.63, 3.66), (-3.6, 0.64, 3.72), (-5.4, 0.63, 3.73), (-6.6, 0.62, 3.72), (XE - 0.05, 0.62, 3.71)]
_SW = pchip([p[0] for p in reversed(SPX)], [p[1] for p in reversed(SPX)], 0.0, 0.0); _ST = pchip([p[0] for p in reversed(SPX)], [p[2] for p in reversed(SPX)], 0.0, 0.0)
def spine_pt(x, a):      # a: 0 (Backbord unten) … PI (Steuerbord unten), Scheitel bei PI/2
    W = _SW(x); zt = _ST(x); zb = top_z(x, W) - 0.06; ca, sa = math.cos(a), math.sin(a); p = 2 / 2.7
    y = W * math.copysign(abs(ca) ** p, ca); return Vector((x, y, zb + (zt - zb) * abs(sa) ** p))
def spine_normal(x, a):
    n = (spine_pt(x + 0.01, a) - spine_pt(x - 0.01, a)).cross(spine_pt(x, a + 0.01) - spine_pt(x, a - 0.01)).normalized()
    p = spine_pt(x, a); return n if n.dot(Vector((0, p.y, p.z - 2.8))) > 0 else -n
HATCH = (0.5, 2.84, 3.66, 0.12)                 # Heckklappe: halbe Breite, unten, oben, Eckradius
def spine():
    CUR[0] = C_HULL; bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten')
    XS = [SPX[0][0] - (SPX[0][0] - SPX[-1][0]) * i / 80 for i in range(81)]; NA = 32; R = []
    for x in XS: R.append([bm.verts.new(spine_pt(x, PI * j / NA)) for j in range(NA + 1)])
    for i in range(len(R) - 1):
        for j in range(NA):
            f = bm.faces.new((R[i][j], R[i][j + 1], R[i + 1][j + 1], R[i + 1][j]))
            for lp, (ii, jj) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))): lp[uvl].uv = (XS[ii], jj * 0.06)
    tipv = bm.verts.new(spine_pt(XS[0], PI / 2) + Vector((0.32, 0, -0.16)))      # vorn spitz in den Rumpf
    for j in range(NA): bm.faces.new((R[0][j + 1], R[0][j], tipv))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Rueckengrat', bm, ['p_hell'], True, C_HULL)
    # Heckfläche des Grats: Rahmen zwischen Außenkante und Klappenöffnung (zwei Schleifen gleicher Länge, verbunden)
    xr = XE - 0.05; bm = bmesh.new(); N2 = 72; outer = []; inner = []
    yc, zc = 0.0, (HATCH[1] + HATCH[2]) / 2; zbot = spine_pt(xr, 0).z
    arch = [spine_pt(xr, PI * j / 400) for j in range(401)]
    def ray_outer(ang):
        ca, sa = math.cos(ang), math.sin(ang)
        if sa < 0:      # unten: gerade Kante auf Höhe des Gratfußes (bis zu den Ecken)
            d = (zbot - zc) / sa; y = d * ca
            if abs(y) <= _SW(xr): return Vector((xr, y, zbot))
        return min(arch, key=lambda p: abs(((math.atan2(p.z - zc, p.y - yc) - ang + PI) % (2 * PI)) - PI))
    def rr_pt(ang):      # Punkt der abgerundeten Klappenöffnung in Richtung ang
        hw, z0, z1, rad = HATCH; hh = (z1 - z0) / 2; ca, sa = math.cos(ang), math.sin(ang)
        tmax = min(hw / abs(ca) if abs(ca) > 1e-6 else 1e9, hh / abs(sa) if abs(sa) > 1e-6 else 1e9)
        y, z = ca * tmax, sa * tmax; cy, cz = math.copysign(hw - rad, y), math.copysign(hh - rad, z)
        if abs(y) > hw - rad and abs(z) > hh - rad:
            d = Vector((y - cy, z - cz)).normalized() * rad; y, z = cy + d.x, cz + d.y
        return Vector((xr, yc + y, zc + z))
    for k in range(N2):
        ang = 2 * PI * k / N2; outer.append(bm.verts.new(ray_outer(ang))); inner.append(bm.verts.new(rr_pt(ang)))
    for k in range(N2):
        k2 = (k + 1) % N2; bm.faces.new((outer[k], outer[k2], inner[k2], inner[k]))
    bm.normal_update()
    if sum(f.normal.x for f in bm.faces) > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Gratheck', bm, ['graphit'], True, C_HULL)
    # Frachtfach innen: Wanne, Zurrschienen mit Augen, Rippen, Leuchte, Beschriftung
    x0, x1, hw, z0, z1 = BAY
    CUR[0] = C_PART
    open_box('Frachtfach', x0, x1, -hw, hw, z0, z1, M['bucht'], '-x', C_PART)
    for s in (1, -1):
        box('Zurrschiene', x1 - x0 - 0.1, 0.04, 0.02, (x0 + x1) / 2, s * (hw - 0.12), z0 + 0.012, M['mittel'], 0.004)
        for k in range(5): ring('Zurrauge', 0.025, 0.006, ((x0 + 0.15) + k * (x1 - x0 - 0.3) / 4, s * (hw - 0.12), z0 + 0.035), (1, 0, 0), M['chrom'], 12)
        for xx in (x0 + 0.4, x0 + 1.0): box('Seitenrippe', 0.04, 0.02, z1 - z0 - 0.1, xx, s * (hw - 0.012), (z0 + z1) / 2, M['mittel'], 0.004)
    box('Fachleuchte', 0.3, 0.06, 0.012, x1 + 0.2, 0, z1 - 0.008, M['e_white'], 0)
    CUR[0] = C_PART; text('MAX 1 NORMKISTE · 10 E · 400 KG', 0.038, (x1 + 0.006, 0.38, z0 + 0.3), (0, -1, 0), (0, 0, 1), M['txtw'], name='Fachschrift')
    # die Kiste selbst (nur in Blender gezeigt: Ansicht „fracht“)
    with Part('Normkiste', T(x0 + 0.72, 0, z0 + 0.01), C_STU):
        box('Kistenkorpus', 1.2, 0.8, 0.74, 0, 0, 0.37, M['kiste'], 0.02); box('Kistendeckel', 1.22, 0.82, 0.06, 0, 0, 0.77, M['graphit'], 0.015)
        for sx in (1, -1):
            for sy in (1, -1): box('Eckkappe', 0.08, 0.08, 0.8, sx * 0.57, sy * 0.37, 0.4, M['mittel'], 0.01)
        text('10 E', 0.12, (-0.611, 0.0, 0.32), (0, -1, 0), (0, 0, 1), M['txtw'], align='CENTER', name='Kistenschrift')
    STAGE['kiste'] = bpy.data.objects['Normkiste']
    # Heckklappe (beweglich: Gelenk oben, klappt nach oben auf): Platte, Innenrippen, Griffmulde, Verriegelung, Beschriftung
    hw2, za, zb2, rad = HATCH; xh = xr - 0.004
    with Gruppe('fracht'):
        CUR[0] = C_PART
        out = rrect(-hw2 - 0.025, hw2 + 0.025, za - 0.025, zb2 + 0.025, rad + 0.02, 6)
        prism('Klappe', [(y, z) for y, z in out], xh - 0.035, xh, M['hell'], 'X', 0.01)
        for z in (za + 0.22, zb2 - 0.22): box('Klappenrippe', 0.025, 2 * hw2 - 0.12, 0.05, xh + 0.012, 0, z, M['mittel'], 0.004)
        box('Griffmulde', 0.02, 0.24, 0.07, xh - 0.036, 0, za + 0.15, M['dunkel'], 0.008); cyl('Griffstange', 0.01, 0.2, xh - 0.05, 0, za + 0.15, M['chrom'], 'Y', n=10)
        for s in (1, -1): box('Verriegelung', 0.02, 0.06, 0.1, xh - 0.04, s * (hw2 - 0.08), za + 0.15, M['mittel'], 0.004)
        CUR[0] = C_PART
        text('FRACHT', 0.07, (xh - 0.0375, 0.0, zb2 - 0.24), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Klappenschrift')
        text('10 E · NUR NORMKISTE', 0.034, (xh - 0.0375, 0.0, zb2 - 0.31), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Klappenschrift')
    for s in (1, -1):      # Scharniere (fest am Grat)
        cyl('Klappenscharnier', 0.022, 0.16, xh - 0.01, s * 0.3, zb2 + 0.035, M['chrom'], 'Y', n=12); box('Scharnierbock', 0.06, 0.16, 0.04, xh + 0.02, s * 0.3, zb2 + 0.05, M['mittel'], 0.006)
    gelenk('fracht', (xh - 0.01, 0, zb2 + 0.035), 'Y', math.radians(100), 'fracht', 0.0, 1.0)
    ANCH['fracht'] = Vector((xr - 1.0, 0, (za + zb2) / 2)); ANCH['klappe'] = Vector((xr, 0.3, zb2 - 0.1))

# =====================================================================================
# 5. Lufteinläufe: Schaufel mit schräger Mündung, Grenzschichtspalt mit Splitterplatte, Lippe, Kanal, Verdichterrad
# =====================================================================================
INL = [(1.32, 0.28, 0.39), (0.9, 0.31, 0.42), (0.2, 0.33, 0.44), (-0.6, 0.3, 0.41), (-1.5, 0.2, 0.32), (-2.3, 0.07, 0.18)]      # x, halbe Breite, halbe Höhe
INL_Z = 2.0
_IA = pchip([p[0] for p in reversed(INL)], [p[1] for p in reversed(INL)], 0.0, 0.0); _IB = pchip([p[0] for p in reversed(INL)], [p[2] for p in reversed(INL)], 0.0, 0.0)
def inl_gap(x): return 0.065 if x > 0.3 else 0.065 - 0.11 * min(1.0, (0.3 - x) / 1.8)      # Grenzschichtspalt, hinten in den Rumpf geschmiegt
def inl_center(x, s): return Vector((x, s * (params(x)[0] + inl_gap(x) + _IA(x)), INL_Z))
def inl_pt(x, s, a, shrink=0.0):      # Querschnitt: Superellipse (n = 4), a Winkel um die Mitte
    c = inl_center(x, s); A = _IA(x) - shrink; B = _IB(x) - shrink; ca, sa = math.cos(a), math.sin(a); p = 2 / 4.0
    return Vector((x, c.y + s * A * math.copysign(abs(ca) ** p, ca), c.z + B * math.copysign(abs(sa) ** p, sa)))
def rake(p):      # Mündung schräg: Oberlippe weiter vorn (nur an der Mündung, nach hinten auslaufend)
    return Vector((p.x + 0.16 * (p.z - INL_Z) / 0.4 * ease((p.x - 0.95) / 0.37), p.y, p.z))
def intake(s):
    CUR[0] = C_HULL; bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NA = 40
    XS = [1.32 - (1.32 + 2.3) * (1 - math.cos(PI / 2 * i / 32)) for i in range(33)]
    R = [[bm.verts.new(rake(inl_pt(x, s, 2 * PI * k / NA))) for k in range(NA)] for x in XS]
    for i in range(len(R) - 1):
        for k in range(NA):
            q = (R[i][k], R[i][(k + 1) % NA], R[i + 1][(k + 1) % NA], R[i + 1][k]); f = bm.faces.new(q if s > 0 else q[::-1])
            f.material_index = 1 if math.sin(2 * PI * (k + 0.5) / NA) < -0.25 else 0
            idx = ((i, k), (i, k + 1), (i + 1, k + 1), (i + 1, k)) if s > 0 else ((i + 1, k), (i + 1, k + 1), (i, k + 1), (i, k))
            for lp, (ii, kk) in zip(f.loops, idx): lp[uvl].uv = (XS[ii], kk * 0.06)
    bm.normal_update()
    c = inl_center(0.5, s); outward = sum(f.normal.dot((f.calc_center_median() - Vector((f.calc_center_median().x, c.y, c.z))).normalized()) for f in bm.faces)
    if outward < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Einlaufschaufel ' + ('links' if s > 0 else 'rechts'), bm, ['p_hell', 'p_graphit'], True, C_HULL)
    CUR[0] = C_PART
    pipe('Einlauflippe', [rake(inl_pt(1.32, s, 2 * PI * k / 80)) for k in range(80)], 0.028, M['kante'], cyclic=True)
    # Kanal: folgt der Schaufel nach innen bis zum Verdichter (dunkel, Innenseiten sichtbar)
    bm = bmesh.new(); XD = [1.31 - 0.98 * i / 12 for i in range(13)]
    R = [[bm.verts.new(rake(inl_pt(x, s, 2 * PI * k / NA, 0.035 + 0.02 * i / 12))) for k in range(NA)] for i, x in enumerate(XD)]
    for i in range(len(R) - 1):
        for k in range(NA):
            q = (R[i][k], R[i + 1][k], R[i + 1][(k + 1) % NA], R[i][(k + 1) % NA]); bm.faces.new(q if s > 0 else q[::-1])
    bm.normal_update()
    cc = inl_center(0.8, s)
    if sum(f.normal.dot((Vector((f.calc_center_median().x, cc.y, cc.z)) - f.calc_center_median()).normalized()) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Einlaufkanal', bm, ['dunkel'], True, C_PART)
    cv = inl_center(0.34, s)
    with Part('Verdichter', T(0.34, cv.y, cv.z), C_PART):
        cyl('Verdichterscheibe', 0.33, 0.02, 0, 0, 0, M['dunkel'], 'X', n=40); cyl('Nabe', 0.1, 0.16, 0.06, 0, 0, M['mittel'], 'X', n=24, r2=0.03)
        for k in range(18):
            a = 2 * PI * k / 18; ob = box('Schaufel', 0.07, 0.012, 0.21, 0, 0, 0, M['mittel'], 0.002)
            ob.matrix_basis = RX(a) @ Matrix.Translation((0.02, 0, 0.2)) @ RZ(0.55)
    # Splitterplatte im Grenzschichtspalt (vor der Mündung), Abstandshalter zum Rumpf, Lochfeld zum Absaugen
    W = params(1.3)[0]; yp = s * (W + 0.035)
    with Part('Splitterplatte', T(1.3, yp, INL_Z), C_PART):
        prism('Platte', [(0.36, -0.36), (0.36, 0.36), (-0.5, 0.33), (-0.5, -0.33)], -0.01, 0.01, M['hell'], 'Y', 0.004)
        for z in (-0.22, 0.0, 0.22): box('Abstandshalter', 0.42, 0.036, 0.03, -0.18, -s * 0.024, z, M['graphit'], 0.004)
        for i in range(4):
            for j in range(5): cyl('Absaugloch', 0.01, 0.024, 0.22 - i * 0.11, 0, -0.22 + j * 0.11, M['dunkel'], 'Y', n=8, bev=0)
    c0 = inl_center(1.32, s); ANCH['einlauf%d' % s] = Vector((1.4, c0.y + s * 0.2, c0.z + 0.3))

# =====================================================================================
# 6. Flügel mit Wurzelleiste, Profil, Ruderfugen, Startschiene mit Flugkörper; Leitwerke; Bauchflossen
# =====================================================================================
WY0, WY1 = 0.85, 5.55
def le_x(y):      # Vorderkante: Wurzelleiste (LERX) innen, gepfeilte Vorderkante außen
    w = 0.2 - (y - 1.5) * 3.1 / 4.05
    if y >= 1.62: return w
    lx = pchip([0.85, 1.18, 1.45, 1.62], [3.6, 2.4, 1.2, 0.2 - 0.12 * 3.1 / 4.05])(y)
    return max(w, lx)
def te_x(y): return -5.05 + (max(y, 1.5) - 1.5) * 0.35 / 4.05
def wz_mid(y): return 2.55 - (max(y, 1.5) - 1.5) * math.tan(math.radians(2.5))      # Schulterflügel: Wurzelleiste über den Einläufen
def tc_of(y): return 0.052 - 0.01 * max(0.0, (y - 1.5) / 4.05)
def naca(c, tc): return 5 * tc * (0.2969 * math.sqrt(max(c, 0.0)) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4)
NCH = 32
CH = [0.5 - 0.5 * math.cos(PI * i / NCH) for i in range(NCH + 1)]
def wing_pt(y, c, top, s=1):
    x0, x1 = le_x(y), te_x(y); L = x0 - x1; th = tc_of(y) * min(L, 5.4)      # Wurzelleiste: höchstens so dick wie bei 5,4 m Tiefe
    h = naca(c, th / max(L, 1e-6)) * L
    return Vector((x0 - c * L, s * y, wz_mid(y) + (h if top else -h)))
def build_wing(s):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); YS = [WY0 + (WY1 - WY0) * i / 48 for i in range(49)]; R = []
    for y in YS:
        ring_ = [wing_pt(y, c, True, s) for c in CH] + [wing_pt(y, c, False, s) for c in reversed(CH[1:-1])]
        R.append([bm.verts.new(p) for p in ring_])
    n = len(R[0])
    for i in range(len(R) - 1):
        for k in range(n):
            q = (R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]); f = bm.faces.new(q)
            f.material_index = HELL if k < NCH else GRAPHIT
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, abs(lp.vert.co.y))
    cap = bm.faces.new(R[-1]); cap.material_index = HELL
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm
def wing_details(s):
    CUR[0] = C_PART
    def groove(name, pts_yc, top=True, w=0.012):      # Fuge: dunkles Band auf der Fläche entlang (y, Profilstelle)
        P = [wing_pt(y, c, top, s) for y, c in pts_yc]; nz = Vector((0, 0, 1 if top else -1))
        ob = strip_mesh(name, P, [nz] * len(P), w, 0.002, M['fuge'], False, 0.003)
        if sum(p.normal.z for p in ob.data.polygons) * (1 if top else -1) < 0: ob.data.flip_normals()
    for top in (True, False):
        for y0, y1, c in ((1.95, 3.45, 0.74), (3.6, 5.3, 0.76)):      # Klappe innen, Querruder außen: Scharnierlinie und Seitenkanten
            groove('Ruderfuge', [(y0 + (y1 - y0) * i / 12, c) for i in range(13)], top)
            for yy in (y0, y1): groove('Ruderfuge', [(yy, c + (1 - c) * i / 6) for i in range(7)], top)
        groove('Holmfuge', [(1.75 + 3.65 * i / 16, 0.18) for i in range(17)], top, 0.007)
        for yy in (2.4, 3.3, 4.2): groove('Rippenfuge', [(yy, 0.18 + 0.55 * i / 8) for i in range(9)], top, 0.006)
    for y in (2.7, 4.45):      # Ruderantriebe unter dem Flügel
        p = wing_pt(y, 0.72, False, s)
        with Part('Ruderantrieb', T(p.x, p.y, p.z - 0.04), C_PART):
            ob = sphere('Antriebsverkleidung', 0.055, 0, 0, 0, M['graphit'], 16); ob.scale = (4.5, 0.9, 0.9)
    pipe('Kantenleiste', [wing_pt(y, 0.003, True, s) for y in [1.65 + 3.85 * i / 30 for i in range(31)]], 0.011, M['kante'])
    for yy in (1.72, 2.25):      # Laufweg an der Wurzel
        P = [wing_pt(yy, 0.12 + 0.45 * i / 10, True, s) for i in range(11)]
        strip_mesh('Laufweglinie', P, [Vector((0, 0, 1))] * len(P), 0.018, 0.002, M['dunkel'], False, 0.003)
    yt = WY1 + 0.08; xa, xb = le_x(WY1) + 0.1, te_x(WY1) + 0.05; zt = wz_mid(WY1)
    with Part('Startschiene', T(0, 0, 0), C_PART):
        cyl('Schienenkoerper', 0.075, xa - xb, (xa + xb) / 2, s * yt, zt, M['graphit'], 'X', n=16)
        cyl('Schienenspitze', 0.075, 0.35, xa + 0.17, s * yt, zt, M['graphit'], 'X', n=16, r2=0.02)
        box('Schienenfuss', xa - xb - 0.4, 0.05, 0.06, (xa + xb) / 2, s * yt, zt - 0.09, M['mittel'], 0.006)
        box('Spitzenband', 0.5, 0.152, 0.152, xb + 0.3, s * yt, zt, M['orange'], 0.02)
    CUR[0] = C_LITE; sphere('Positionslicht', 0.045, xa + 0.05, s * (yt + 0.06), zt + 0.04, M['nav_r' if s > 0 else 'nav_g'], 12)
    sphere('Hecklicht Fluegel', 0.03, xb + 0.02, s * (yt + 0.06), zt + 0.03, M['blitz'], 10)
    xm = (xa + xb) / 2 + 0.2
    with Part('Flugkoerper', T(xm, s * yt, zt - 0.2), C_WPN):
        cyl('Rohr', 0.065, 2.3, 0, 0, 0, M['rakete'], 'X', n=20); cyl('Suchkopf', 0.065, 0.28, 1.29, 0, 0, M['rauchglas'], 'X', n=20, r2=0.012)
        ring('Kopfring', 0.066, 0.008, (1.15, 0, 0), (1, 0, 0), M['orange'], 20); rod('Warnband', (0.35, 0, 0), (0.45, 0, 0), 0.067, M['warnrw'], 20)
        for k in range(4):
            with Part('Leitwerk', RX(PI / 4 + k * PI / 2), C_WPN):
                prism('Flosse', [(-1.15, 0.06), (-0.8, 0.06), (-0.95, 0.2), (-1.15, 0.2)], -0.006, 0.006, M['rakete'], 'Y', 0.002)
                prism('Canard', [(0.85, 0.06), (1.0, 0.06), (0.9, 0.14), (0.85, 0.14)], -0.005, 0.005, M['rakete'], 'Y', 0.002)
        box('Halteschuh', 1.0, 0.05, 0.08, 0, 0, 0.1, M['mittel'], 0.006)
    # Unterseite: Kennung
    CUR[0] = C_DECAL
    o = text('MILAN', 0.34, tuple(wing_pt(3.4, 0.6, False, s) + Vector((0, 0, -0.012))), (0, s, 0), (1, 0, 0) if s > 0 else (-1, 0, 0), M['txtw'], align='CENTER', name='Unterseite')
    wrap_text(o, bpy.data.objects['Fluegel ' + ('links' if s > 0 else 'rechts')])

FIN = dict(cant=math.radians(21), y0=0.84, root=(-3.7, -6.45), tip=(-5.45, -6.8), h=1.55, tc=0.045)
def fin_geo(s, hh, cant, y0, root, tip, H, bottom):      # Vorderkante, Hinterkante und Grundpunkt in Höhe hh
    f = hh / H; xa = root[0] + (tip[0] - root[0]) * f; xb = root[1] + (tip[1] - root[1]) * f
    zb_ = (bot_z((xa + xb) / 2, y0) + 0.02 - hh * math.cos(cant)) if bottom else (top_z((xa + xb) / 2, y0) - 0.02 + hh * math.cos(cant))
    return xa, xb, Vector((0, s * (y0 + hh * math.sin(cant)), zb_))
def build_fin(s, name='Seitenleitwerk', y0=None, cant=None, h=None, root=None, tip=None, bottom=False, tc=None):
    c = FIN['cant'] if cant is None else cant; yy = FIN['y0'] if y0 is None else y0; H = FIN['h'] if h is None else h
    r0 = FIN['root'] if root is None else root; t0 = FIN['tip'] if tip is None else tip; tcr = FIN['tc'] if tc is None else tc
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); R = []; HS = [H * i / 20 for i in range(21)]
    nrm = Vector((0, s * math.cos(c), -math.sin(c) if not bottom else math.sin(c)))
    for hh in HS:
        xa, xb, b0 = fin_geo(s, hh, c, yy, r0, t0, H, bottom); L = xa - xb; f = hh / H; ring_ = []
        for top in (True, False):
            for cc in (CH if top else list(reversed(CH[1:-1]))):
                t = naca(cc, tcr * (1 - 0.35 * f)) * L; ring_.append(Vector((xa - cc * L, b0.y, b0.z)) + nrm * (t if top else -t))
        R.append([bm.verts.new(p) for p in ring_])
    n = len(R[0])
    for i in range(len(R) - 1):
        for k in range(n):
            fc = bm.faces.new((R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]))
            fc.material_index = GRAPHIT if bottom else (ORANGE if HS[i] > H - 0.24 else HELL)
            for lp in fc.loops: lp[uvl].uv = (lp.vert.co.x, HS[i] if lp.vert in R[i] else HS[i + 1])
    cap = bm.faces.new(R[-1]); cap.material_index = GRAPHIT if bottom else ORANGE
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return mesh_obj(name + (' links' if s > 0 else ' rechts'), bm, HULL_MATS, True, C_HULL)
def fins(s):
    build_fin(s)
    CUR[0] = C_PART
    c = FIN['cant']; H = FIN['h']
    for side in (1, -1):      # Ruderfuge auf beiden Seiten (Ruder: hinterste 30 % zwischen 0,18 und 1,3 m)
        nrm = Vector((0, s * math.cos(c), -math.sin(c))) * side; pts = []
        for i in range(13):
            hh = 0.18 + (1.3 - 0.18) * i / 12; xa, xb, b0 = fin_geo(s, hh, c, FIN['y0'], FIN['root'], FIN['tip'], H, False); L = xa - xb
            pts.append(Vector((xa - 0.7 * L, b0.y, b0.z)) + nrm * naca(0.7, FIN['tc'] * (1 - 0.35 * hh / H)) * L)
        ob = strip_mesh('Ruderfuge', pts, [nrm] * len(pts), 0.012, 0.002, M['fuge'], False, 0.003)
        if sum(p.normal.dot(nrm) for p in ob.data.polygons) < 0: ob.data.flip_normals()
    xa, xb, b0 = fin_geo(s, H - 0.04, c, FIN['y0'], FIN['root'], FIN['tip'], H, False)
    CUR[0] = C_LITE; sphere('Leitwerkslicht', 0.035, xb + 0.05, b0.y, b0.z, M['blitz'], 10)
    hh = 0.72; xa, xb, b0 = fin_geo(s, hh, c, FIN['y0'], FIN['root'], FIN['tip'], H, False); L = xa - xb
    nrm = Vector((0, s * math.cos(c), -math.sin(c))); up = Vector((0, s * math.sin(c), math.cos(c))); xd = up.cross(nrm).normalized()
    pc = Vector((xa - 0.48 * L, b0.y, b0.z)) + nrm * (naca(0.48, FIN['tc'] * (1 - 0.35 * hh / H)) * L + 0.008)
    CUR[0] = C_DECAL; emblem(tuple(pc), tuple(xd), tuple(up), 0.26, M['txtd'])
    hh = 0.32; xa, xb, b0 = fin_geo(s, hh, c, FIN['y0'], FIN['root'], FIN['tip'], H, False); L = xa - xb
    pc = Vector((xa - 0.45 * L, b0.y, b0.z)) + nrm * (naca(0.45, FIN['tc'] * (1 - 0.35 * hh / H)) * L + 0.008)
    text('ML 01', 0.11, tuple(pc - up * 0.04), tuple(xd), tuple(up), M['txtd'], align='CENTER', name='Leitwerksschrift')
    ANCH['leitwerk%d' % s] = Vector((xa - 0.3 * L, b0.y, b0.z + 0.6))
    build_fin(s, 'Bauchflosse', y0=0.92, cant=math.radians(28), h=0.42, root=(-4.65, -6.4), tip=(-5.6, -6.55), bottom=True, tc=0.05)

# =====================================================================================
# 7. Triebwerke: zwei Schubdüsen im Heck (Mantel, Klappenkranz, Brennkammer mit Flammhaltern, Glut, Stellzylinder)
# =====================================================================================
NOZ = (0.8, 2.3, 0.46)      # |y|, z, Radius
def nozzle(s):
    yc = s * NOZ[0]; zc = NOZ[1]; r = NOZ[2]
    with Part('Schubduese', T(XE, yc, zc), C_PART):
        bell('Duesenmantel', r + 0.05, r + 0.015, 1.1, 0.85, M['graphit'], 48)
        ring('Mantelring', r + 0.052, 0.018, (-0.25, 0, 0), (1, 0, 0), M['mittel'], 48)
        bell('Brennkammer', r - 0.05, r - 0.07, 1.05, 0.8, M['duese'], 40)
        for k in range(3): ring('Flammhalter', r * (0.58 - k * 0.16), 0.013, (0.3 - k * 0.04, 0, 0), (1, 0, 0), M['duese'], 32)
        cyl('Glut', r - 0.08, 0.03, 0.5, 0, 0, M['glut'], 'X', n=40)
        for k in range(20):      # Klappenkranz: überlappende Klappen, zusammenlaufend
            a = 2 * PI * k / 20; ob = box('Duesenklappe', 0.46, 0.18, 0.018, 0, 0, 0, M['duese'], 0.003)
            ob.matrix_basis = RX(a) @ Matrix.Translation((-0.45, 0, r - 0.01)) @ RY(math.radians(-7))
            ob2 = box('Dichtklappe', 0.42, 0.07, 0.012, 0, 0, 0, M['dunkel'], 0.002); ob2.matrix_basis = RX(a + PI / 20) @ Matrix.Translation((-0.45, 0, r - 0.025)) @ RY(math.radians(-7))
        for k in range(4):
            d = Vector((0, math.cos(PI / 4 + k * PI / 2), math.sin(PI / 4 + k * PI / 2)))
            rod('Duesenstellzylinder', d * (r + 0.08) + Vector((0.3, 0, 0)), d * (r + 0.065) + Vector((-0.24, 0, 0)), 0.022, M['gun'], 12)
        for k in range(3): ring('Hitzering', r + 0.052, 0.007, (0.0 + k * 0.12, 0, 0), (1, 0, 0), M['duese'], 48)
    ANCH['duese%d' % s] = Vector((XE - 0.6, yc, zc))

# =====================================================================================
# 8. Fahrwerk: Bugrad (fährt nach hinten ein), Haupträder (fahren nach vorn in die Rumpfseiten), Schächte, Klappen
# =====================================================================================
def wheel(name, c, axis, r, w, m_hub='felge', spokes=6):
    ax = Vector(axis).normalized(); q = ax.orthogonal().normalized(); qq = ax.cross(q)
    rod(name + ' Reifen', c - ax * w / 2, c + ax * w / 2, r, M['reifen'], 40)
    for sg in (1, -1): ring(name + ' Reifenflanke', r - 0.025, 0.02, tuple(c + ax * sg * (w / 2 - 0.005)), tuple(ax), M['reifen'], 40)
    for k in range(28):      # Profilrillen
        a = 2 * PI * k / 28; d = q * math.cos(a) + qq * math.sin(a)
        rod(name + ' Profil', c + d * (r - 0.003) - ax * w * 0.4, c + d * (r - 0.003) + ax * w * 0.4, 0.005, M['dunkel'], 6)
    rod(name + ' Felge', c - ax * (w / 2 + 0.005), c + ax * (w / 2 + 0.005), r * 0.6, M[m_hub], 32)
    rod(name + ' Nabe', c - ax * (w / 2 + 0.04), c + ax * (w / 2 + 0.04), r * 0.22, M['mittel'], 20)
    for sg in (1, -1): bolts(tuple(c + ax * sg * (w / 2 + 0.008)), tuple(ax), r * 0.38, 0.012, spokes, M['chrom'])
def strut(prefix, P0, A, r, col=C_GEAR):      # Federbein: Zylinder, Stopfbuchse, Kolben, Warnband
    rod(prefix + 'bein', P0, P0.lerp(A, 0.55), r, M['hell'], 28); rod(prefix + 'kolben', P0.lerp(A, 0.5), P0.lerp(A, 0.82), r * 0.68, M['chrom'], 24)
    rod('Stopfbuchse', P0.lerp(A, 0.53), P0.lerp(A, 0.57), r * 1.13, M['gun'], 28); rod('Abstreifer', P0.lerp(A, 0.575), P0.lerp(A, 0.59), r * 0.78, M['rubber'], 24)
    rod('Warnband', P0.lerp(A, 0.4), P0.lerp(A, 0.45), r * 1.03, M['warnrw'], 28)
def fork_wheel(name, P0, A, rw, ww, fw=Vector((1, 0, 0))):      # Gabel mit Brücke, Drehmomentlenker vorn, Rad
    top = P0.lerp(A, 0.82); hw = ww / 2 + 0.06
    slab('Gabelbruecke', top + Vector((0, 0, -0.02)), (1, 0, 0), (0, 1, 0), (0.13, 2 * hw + 0.06, 0.07), M['gun'], 0.012)
    for sg in (1, -1): rod('Gabelarm', top + Vector((0, sg * hw, 0)), A + Vector((0, sg * hw, 0)), 0.028, M['gun'], 16)
    wheel(name, A, (0, 1, 0), rw, ww)
    t0 = P0.lerp(A, 0.55) + fw * 0.1; t1 = P0.lerp(A, 0.82) + fw * 0.1; kn = (t0 + t1) / 2 + fw * 0.17
    link_bar('Drehmomentlenker', t0, kn, 0.05, 0.026, (0, 1, 0), M['mittel']); link_bar('Drehmomentlenker', kn, t1, 0.05, 0.026, (0, 1, 0), M['mittel'])
    for p in (t0, kn, t1): rod('Lenkerbolzen', p - Vector((0, 0.05, 0)), p + Vector((0, 0.05, 0)), 0.018, M['chrom'], 12)
def foot(name, Ap, E, hx, hy):
    # Landefuß unter dem Querbolzen Ap (der Fuß kippt um y und legt sich an schrägen Boden an): Gummisohle, Rand, Warnkante,
    # zweistufiger Teller, vier Rippen, Nabe mit Lageraugen, Querbolzen, zwei Federdämpfer vorn und hinten (halten ihn waagrecht),
    # Bodenkontaktfühler mit grüner Lampe, Zurraugen. E: Gabelbrücke am Kolbenende (oberes Auge der Dämpfer)
    F = Vector((Ap.x, Ap.y, 0.0)); rad = min(hx, hy) * 0.62
    def RR(ex, z0, z1, m, bev, nm):
        prism(name + nm, [(F.x + x, F.y + y) for x, y in rrect(-hx - ex, hx + ex, -hy - ex, hy + ex, max(0.03, rad + ex), 6)], z0, z1, m, 'Z', bev)
    RR(0.0, 0.0, 0.035, M['rubber'], 0.008, ' Sohle'); RR(0.012, 0.035, 0.048, M['gun'], 0.004, ' Sohlenrand')
    RR(0.0, 0.048, 0.075, M['warnrw'], 0.003, ' Warnkante'); RR(-0.03, 0.075, 0.1, M['graphit'], 0.008, ' Teller')
    RR(-0.09, 0.1, 0.125, M['graphit'], 0.012, ' Oberteller'); hz = 0.125
    for sx in (1, -1): prism(name + ' Rippe', [(F.x + sx * 0.09, hz), (F.x + sx * (hx - 0.07), hz), (F.x + sx * 0.09, hz + 0.1)], F.y - 0.012, F.y + 0.012, M['gun'], 'Y', 0.003)
    for sy in (1, -1): prism(name + ' Rippe', [(F.y + sy * 0.09, hz), (F.y + sy * (hy - 0.07), hz), (F.y + sy * 0.09, hz + 0.08)], F.x - 0.012, F.x + 0.012, M['gun'], 'X', 0.003)
    rod(name + ' Nabe', F + Vector((0, 0, hz)), F + Vector((0, 0, hz + 0.08)), 0.1, M['gun'], 28, r2=0.075)
    zp = Ap.z; lh = zp + 0.045 - hz - 0.08
    for sy in (1, -1): slab(name + ' Lagerauge', (F.x, F.y + sy * 0.05, hz + 0.08 + lh / 2), (1, 0, 0), (0, 0, 1), (0.11, lh, 0.022), M['gun'], 0.006)
    rod(name + ' Querbolzen', Ap - Vector((0, 0.135, 0)), Ap + Vector((0, 0.135, 0)), 0.022, M['chrom'], 14)
    for sy in (1, -1): rod(name + ' Bolzenkappe', Ap + Vector((0, sy * 0.125, 0)), Ap + Vector((0, sy * 0.145, 0)), 0.032, M['gun'], 14)
    for sx in (1, -1):      # Federdämpfer: oben an der Gabelbrücke, unten auf dem Teller
        a = E + Vector((sx * 0.13, 0, -0.03)); b = F + Vector((sx * (hx - 0.11), 0, 0.105))
        sphere(name + ' Daempferauge', 0.024, *a, M['gun'], 10); sphere(name + ' Daempferauge', 0.022, *b, M['gun'], 10)
        rod(name + ' Daempfer', a, a.lerp(b, 0.6), 0.019, M['gun'], 12); rod(name + ' Daempferkolben', a.lerp(b, 0.55), b, 0.011, M['chrom'], 10)
        for f in (0.12, 0.24, 0.36, 0.48): ring(name + ' Feder', 0.029, 0.005, tuple(a.lerp(b, f)), tuple((b - a).normalized()), M['ocker'] if 'ocker' in M else M['orange'], 12)
    rod(name + ' Fuehler', F + Vector((hx - 0.05, 0, 0.14)), F + Vector((hx - 0.05, 0, 0.012)), 0.013, M['mittel'], 10)
    sphere(name + ' Fuehlerlampe', 0.018, *(F + Vector((hx - 0.05, 0, 0.15))), M['e_green'], 8)
    for sy in (1, -1): ring(name + ' Zurrauge', 0.03, 0.009, tuple(F + Vector((-(hx - 0.07), sy * (hy - 0.08), 0.13))), (1, 0, 0), M['mittel'], 12)
def bein_fuss(name, P0, Ap, r, hx, hy, lenker=1):
    # Landebein (25.11.2026, statt Rad): Federbein bis zum Kolbenende E, Gabelkopf, Gabelbrücke, Gabel zum Querbolzen Ap, Landefuß.
    # Drehmomentlenker vorn (lenker 1) oder hinten (−1), Hydraulikleitung mit Schellen dicht am Bein. Gibt (E, A2) zurück.
    u = (Ap - P0).normalized(); E = Ap - u * 0.2; A2 = P0 + (E - P0) / 0.82      # strut() rechnet in Anteilen bis 0,82 (Kolbenende)
    strut(name, P0, A2, r)
    rod(name + ' Gabelkopf', E - u * 0.04, E + u * 0.03, r * 0.9, M['gun'], 24)
    slab(name + ' Gabelbruecke', E + u * 0.03, (1, 0, 0), (0, 1, 0), (0.3, 0.26, 0.05), M['gun'], 0.01)
    for sg in (1, -1): link_bar(name + ' Gabel', E + u * 0.03 + Vector((0, sg * 0.1, 0)), Ap + Vector((0, sg * 0.1, 0)), 0.07, 0.024, (0, 1, 0), M['gun'])
    foot(name + 'fuss', Ap, E + u * 0.03, hx, hy)
    fw = Vector((lenker, 0, 0)); t0 = P0.lerp(A2, 0.55) + fw * 0.1; t1 = E + fw * 0.1; kn = (t0 + t1) / 2 + fw * 0.17
    link_bar('Drehmomentlenker', t0, kn, 0.05, 0.026, (0, 1, 0), M['mittel']); link_bar('Drehmomentlenker', kn, t1, 0.05, 0.026, (0, 1, 0), M['mittel'])
    for p in (t0, kn, t1): rod('Lenkerbolzen', p - Vector((0, 0.04, 0)), p + Vector((0, 0.04, 0)), 0.016, M['chrom'], 12)
    for f in (0.22, 0.42): ring('Leitungsschelle', r + 0.012, 0.008, tuple(P0.lerp(A2, f)), tuple(u), M['mittel'], 24)
    return E, A2
def nose_gear():
    xp, zp = 5.0, 1.92; xa, za, rw = 5.12, 0.25, 0.25
    P0 = Vector((xp, 0, zp)); A = Vector((xa, 0, za))
    with Gruppe('fwn'):
        with Part('Bugfahrwerk', T(0, 0, 0), C_GEAR):
            bein_fuss('Bug', P0, A, 0.072, 0.27, 0.19, 1)      # Fußgelenk auf 0,25 m, wo früher die Radachse lag
            rod('Lagerachse', P0 - Vector((0, 0.2, 0)), P0 + Vector((0, 0.2, 0)), 0.05, M['chrom'], 20)
            for sg in (1, -1): rod('Achskappe', P0 + Vector((0, sg * 0.18, 0)), P0 + Vector((0, sg * 0.22, 0)), 0.07, M['gun'], 20)
            rod('Lenkzylinder', P0.lerp(A, 0.2) + Vector((-0.06, 0.08, 0)), P0.lerp(A, 0.36) + Vector((0.04, 0.09, 0)), 0.022, M['gun'], 12)
            with Part('Landescheinwerfer', T(*(P0.lerp(A, 0.32) + Vector((0.08, 0, 0)))), C_GEAR):
                box('Lampenhalter', 0.05, 0.12, 0.04, 0, 0, 0, M['gun'], 0.006)
                for sg in (1, -1): rod('Scheinwerfer', (0, sg * 0.04, 0.0), (0.06, sg * 0.04, 0.0), 0.028, M['gun'], 16); cyl('Lampe', 0.022, 0.006, 0.062, sg * 0.04, 0, M['blitz'], 'X', n=14)
            pipe('Hydraulikleitung', [P0 + Vector((-0.08, -0.07, 0.02)), P0.lerp(A, 0.25) + Vector((-0.08, -0.08, 0)), P0.lerp(A, 0.52) + Vector((-0.07, -0.08, 0))], 0.01, M['rubber'], rad=0.05)
            text('FW 1', 0.045, tuple(P0.lerp(A, 0.25) + Vector((0.074, 0, 0))), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Beinschrift')
            rod('Einziehzylinder', P0.lerp(A, 0.12) + Vector((-0.06, 0, 0)), P0.lerp(A, 0.12) + Vector((-0.42, 0, 0.1)), 0.03, M['gun'], 14)
    gelenk('fwn', tuple(P0), 'Y', math.radians(93), 'fw', 0.05, 0.72)
    x0, x1, hw = NB[1], NB[0], NB[2]
    CUR[0] = C_PART
    open_box('Bugradschacht', x0, x1, -hw, hw, 0, 2.2, M['schacht'], '-z', C_PART, floor=lambda x, y: bot_z(x, y) + 0.004)
    for k in range(5): box('Schachtrippe', 0.03, 2 * hw - 0.02, 0.05, x0 + 0.2 + k * (x1 - x0 - 0.4) / 4, 0, 2.17, M['mittel'], 0.004)
    for sg in (1, -1): pipe('Schachtleitung', [Vector((x0 + 0.1, sg * (hw - 0.04), 2.12)), Vector((x1 - 0.1, sg * (hw - 0.04), 2.12))], 0.01, M['rubber'])
    for sg in (1, -1):      # zwei lange Klappen, außen angeschlagen; gebaut offen (hängen), schließen am Ende des Einfahrens
        tag = 'fwnk_' + ('l' if sg > 0 else 'r'); hy = sg * hw; xm = (x0 + x1) / 2; hz = bot_z(xm, hw)
        with Gruppe(tag):
            ob = hull_patch('Bugradklappe', x0 + 0.02, x1 - 0.02, 0.006 * sg, hw * sg, False, M['graphit'], 0.002, 10, 6, 0.022, C_GEAR)
            ob.matrix_world = T(xm, hy, hz) @ RX(sg * math.radians(88)) @ T(-xm, -hy, -hz)
        gelenk(tag, (xm, hy, hz), 'X', -sg * math.radians(88), 'fw', 0.72, 1.0)
    ANCH['bugrad'] = Vector((A.x, 0, 0.15))
def main_gear(s):
    xp, yp, zp = -2.25, s * 1.355, 1.98; rw, ww = 0.31, 0.22
    P0 = Vector((xp, yp, zp)); A = Vector((xp, yp, rw)); Ap = Vector((xp, yp, 0.27))
    tag = 'fwh_' + ('l' if s > 0 else 'r')
    with Gruppe(tag):
        with Part('Hauptfahrwerk', T(0, 0, 0), C_GEAR):
            E, A2 = bein_fuss('Haupt', P0, Ap, 0.082, 0.32, 0.19, 1)
            rod('Lagerachse', P0 - Vector((0, 0.24, 0)), P0 + Vector((0, 0.24, 0)), 0.055, M['chrom'], 20)
            for sg in (1, -1): rod('Lagerbock', P0 + Vector((0, sg * 0.2, 0)), P0 + Vector((0, sg * 0.26, 0)), 0.09, M['gun'], 20)
            pipe('Hydraulikleitung', [P0 + Vector((-0.1, s * 0.09, 0)), P0.lerp(A2, 0.12) + Vector((-0.02, s * 0.108, 0)), P0.lerp(A2, 0.5) + Vector((-0.02, s * 0.108, 0)), E + Vector((-0.02, s * 0.11, 0))], 0.01, M['rubber'], rad=0.05)
            # Knickstrebe nach vorn in den Schacht (mit Verriegelung), Einziehzylinder
            B0 = P0 + Vector((0.62, 0, 0.08)); B1 = P0.lerp(A, 0.36); Bk = B0.lerp(B1, 0.5) + Vector((0.12, 0, -0.1))
            rod('Knickstrebe', B0, Bk, 0.04, M['gun'], 16); rod('Knickstrebe', Bk, B1, 0.04, M['gun'], 16)
            rod('Strebengelenk', Bk - Vector((0, 0.07, 0)), Bk + Vector((0, 0.07, 0)), 0.055, M['mittel'], 16); sphere('Riegel', 0.035, *(Bk + Vector((0, 0, -0.05))), M['rotlack'], 10)
            rod('Einziehzylinder', P0 + Vector((0.3, 0.1 * s, 0.12)), P0.lerp(A, 0.15) + Vector((0.05, 0.1 * s, 0)), 0.03, M['gun'], 14)
            text('FW %d' % (2 if s > 0 else 3), 0.045, tuple(P0.lerp(A, 0.28) + Vector((0.084, 0, 0))), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Beinschrift')
            sphere('Fahrwerkslicht', 0.03, xp + 0.12, yp + s * 0.06, zp - 0.24, M['blitz'], 10)
            # Beinklappe hinter dem Bein: hängt im ausgefahrenen Zustand senkrecht, liegt eingefahren als Deckel im Rumpfboden
            xd = xp - 0.38
            ob = prism('Beinklappe', [(y, z) for y, z in rrect(-0.225, 0.225, -1.42, -0.04, 0.05, 4)], xd - 0.012, xd + 0.012, M['graphit'], 'X', 0.006)
            ob.location = (0, yp, zp)
            for zz in (0.35, 0.95): box('Klappenstrebe', 0.36, 0.05, 0.03, xp - 0.19, yp, zp - zz, M['gun'], 0.004)
    gelenk(tag, tuple(P0), 'Y', -math.radians(88), 'fw', 0.0, 0.7)
    x0, x1, yi, yo = MB[1], MB[0], MB[2], MB[3]
    CUR[0] = C_PART
    lo, hi = sorted((s * yi, s * yo))
    open_box('Hauptschacht', x0, x1, lo, hi, 0, 2.3, M['schacht'], '-z', C_PART, floor=lambda x, y: bot_z(x, y) + 0.004)
    for k in range(5): box('Schachtrippe', 0.03, yo - yi - 0.03, 0.05, x0 + 0.15 + k * (x1 - x0 - 0.3) / 4, s * (yi + yo) / 2, 2.27, M['mittel'], 0.004)
    pipe('Schachtleitung', [Vector((x0 + 0.1, s * (yo - 0.05), 2.22)), Vector((x1 - 0.1, s * (yo - 0.05), 2.22))], 0.012, M['rubber'])
    # vordere Klappe: außen angeschlagen, gebaut offen (hängt), schließt am Ende
    tagk = 'fwhk_' + ('l' if s > 0 else 'r'); xa_, xb_ = -0.82, x1 - 0.02; xm = (xa_ + xb_) / 2; hy = s * yo; hz = bot_z(xm, yo)
    with Gruppe(tagk):
        ob = hull_patch('Fahrwerksklappe', xa_, xb_, s * (yi + 0.01), s * (yo - 0.005), False, M['graphit'], 0.002, 6, 6, 0.022, C_GEAR)
        ob.matrix_world = T(xm, hy, hz) @ RX(s * math.radians(88)) @ T(-xm, -hy, -hz)
    gelenk(tagk, (xm, hy, hz), 'X', -s * math.radians(88), 'fw', 0.72, 1.0)
    if s > 0: ANCH['hauptrad'] = Ap + Vector((0, 0, 0.25))

# =====================================================================================
# 9. Bordleiter links unter der Kanzel: Klappe (oben angeschlagen, schwenkt nach außen) und Leiter, die aus dem Schacht gleitet
# =====================================================================================
def ladder():
    x0, x1, z0, z1 = LADDER; xm = (x0 + x1) / 2; W = params(xm)[0]
    CUR[0] = C_PART
    open_box('Leiterschacht', x0 + 0.02, x1 - 0.02, W - 0.45, W + 0.05, z0 + 0.01, z1 - 0.01, M['schacht'], '+y', C_PART)
    t = t_for_z(xm, z1, 1); hp = hull_point(xm, t)
    with Gruppe('luke'):
        ob = side_patch2('Leiterklappe', x0 + 0.012, x1 - 0.012, z0 + 0.012, z1 - 0.012, 1, M['graphit'], 0.002, 6, 8, 0.02, C_PART)
        ob.matrix_world = T(hp.x, hp.y, hp.z) @ RX(math.radians(100)) @ T(-hp.x, -hp.y, -hp.z)
    gelenk('luke', tuple(hp), 'X', -math.radians(100), 'leiter', 0.0, 0.3, inv=True)
    top = Vector((xm, W + 0.02, z0 + 0.05)); foot = Vector((xm, W + 0.48, 0.02)); ax = top - foot
    with Gruppe('leiter'):
        CUR[0] = C_GEAR
        for sx in (1, -1):
            rod('Leiterholm', foot + Vector((sx * 0.19, 0, 0)), top + Vector((sx * 0.19, 0, 0)), 0.018, M['chrom'], 12)
            rod('Leiterfuss', foot + Vector((sx * 0.19, 0, -0.01)), foot + Vector((sx * 0.19, 0, 0.05)), 0.03, M['rubber'], 12)
        for k in range(1, 7):
            p = foot + ax * (k / 7.2); slab('Sprosse', p, (1, 0, 0), (0, 1, 0), (0.38, 0.06, 0.022), M['mittel'], 0.004)
            for j in range(4): box('Trittrille', 0.36, 0.006, 0.004, p.x, p.y - 0.022 + j * 0.015, p.z + 0.012, M['dunkel'], 0)
        box('Leiterhaken', 0.44, 0.06, 0.05, xm, top.y - 0.02, top.z + 0.02, M['gun'], 0.008)
    gelenk('leiter', (0, 0, 0), None, 0.0, 'leiter', 0.25, 0.95, slide=tuple(ax.normalized() * (ax.length - 0.08)))
    t = t_for_z(3.55, 2.62, 1)
    with Part('Trittmulde', place(3.55, t, 0.002), C_PART):
        box('Mulde', 0.16, 0.1, 0.02, 0, 0, -0.008, M['dunkel'], 0.006); box('Muldenkante', 0.17, 0.11, 0.006, 0, 0, 0.004, M['warnrw'], 0.002)
    t2 = t_for_z(2.05, 2.74, 1)
    with Part('Haltegriff', place(2.05, t2, 0.0), C_PART):
        pipe('Griff', [Vector((-0.14, 0, 0)), Vector((-0.11, 0, 0.06)), Vector((0.11, 0, 0.06)), Vector((0.14, 0, 0))], 0.014, M['warnrw'])
    label_on(xm, t_for_z(xm, z1 + 0.1, 1), 'EINSTIEG', 0.05, 'txtd')
    ANCH['leiter'] = foot + Vector((0, 0.05, 0.9))

# =====================================================================================
# 10. Rumpfdetails: Radomfuge, Staurohr, Anstellwinkelgeber, IR-Sensor, Kanonen, Steuerdüsen, Klappen, Antennen, Lichter
# =====================================================================================
def details():
    CUR[0] = C_PART
    hull_band('Radomfuge', [(6.35, 2 * PI * i / 120) for i in range(120)], 0.014, 0.004, M['frame'], True, 0.002)
    for x in SEAM_X: hull_band('Hauptfuge', [(x, 2 * PI * i / 160) for i in range(160)], 0.009, 0.003, M['frame'], True, 0.002)
    cyl('Staurohr', 0.028, 0.45, XT + 0.22, 0, ZTIP, M['mittel'], 'X', n=10, r2=0.012); ring('Staurohrring', 0.032, 0.008, (XT + 0.05, 0, ZTIP), (1, 0, 0), M['chrom'], 12)
    for s in (1, -1):
        with Part('Anstellwinkelgeber', place(6.05, s * 1.35, 0.0), C_PART):
            cyl('Geberfuss', 0.035, 0.015, 0, 0, 0.004, M['mittel'], 'Z', n=12); prism('Fahne', [(0.0, 0.0), (-0.08, 0.0), (-0.11, 0.07), (-0.05, 0.07)], -0.004, 0.004, M['dunkel'], 'Y', 0.002)
        # Kanone: Verkleidung an der Rumpfseite über der Wurzelleiste, Lauf mit Mündung, Gasschlitze
        xk, zk = 2.2, 2.74; Wk = params(xk)[0] * 0.97
        with Part('Kanone', T(xk, s * (Wk + 0.0), zk), C_WPN):
            ob = sphere('Kanonenverkleidung', 0.1, -0.35, 0, 0, M['graphit'], 24); ob.scale = (6.0, 0.85, 0.9)
            cyl('Lauf', 0.028, 0.5, 0.42, 0, 0, M['duese'], 'X', n=14); ring('Muendung', 0.03, 0.008, (0.67, 0, 0), (1, 0, 0), M['dunkel'], 14)
            for k in range(5): box('Gasschlitz', 0.05, 0.03, 0.012, 0.05 - k * 0.1, s * 0.075, 0.04, M['dunkel'], 0.003)
        ANCH['kanone%d' % s] = Vector((xk + 0.68, s * Wk, zk))
        for x, tt in ((5.75, s * PI / 2), (5.75, s * 0.55), (5.75, s * (PI - 0.55))):      # Steuerdüsen vorn
            with Part('Steuerduese', place(x, tt, 0.0), C_PART):
                box('Duesenfeld', 0.14, 0.1, 0.01, 0, 0, 0.0, M['dunkel'], 0.003)
                for j in range(3): box('Duesenschlitz', 0.025, 0.07, 0.006, -0.04 + j * 0.04, 0, 0.005, M['duese'], 0.001)
        for zz in (3.3, 3.5):      # Steuerdüsen hinten am Grat
            box('Steuerduese hinten', 0.12, 0.012, 0.08, -6.3, s * (_SW(-6.3) + 0.003), zz, M['dunkel'], 0.003)
        p = spine_pt(-2.4, PI / 2 + s * 0.95); n = spine_normal(-2.4, PI / 2 + s * 0.95)      # NACA-Einlass am Grat
        with Part('NACA-Einlass', Matrix.Translation(p) @ Vector((0, 0, 1)).rotation_difference(n).to_matrix().to_4x4(), C_PART):
            prism('Mulde', [(0.3, 0.0), (-0.3, 0.07), (-0.3, -0.07)], -0.012, 0.004, M['dunkel'], 'Z', 0.003)
        for x, tt in ((-1.2, s * 1.2), (-3.0, s * 1.25), (0.6, s * 1.3), (5.0, s * 1.45), (-4.6, s * 2.3), (0.9, s * 2.5)):
            with Part('Wartungsklappe', place(x, tt, 0.0015), C_PART):
                box('Klappenfuge', 0.42, 0.28, 0.003, 0, 0, 0, M['fuge'], 0.0); box('Klappe', 0.4, 0.26, 0.004, 0, 0, 0.002, M['hell' if math.cos(tt) > -0.05 else 'graphit'], 0.0)
                for sx in (1, -1):
                    for sy in (1, -1): cyl('Klappenschraube', 0.01, 0.006, sx * 0.18, sy * 0.11, 0.005, M['schraube'], 'Z', n=6, bev=0)
        with Part('Tankstutzen', place(-0.2, s * 0.75, 0.002), C_PART):
            cyl('Stutzendeckel', 0.07, 0.01, 0, 0, 0, M['dunkel'], 'Z', n=20); ring('Stutzenring', 0.075, 0.008, (0, 0, 0.004), (0, 0, 1), M['orange'], 20)
        CUR[0] = C_LITE      # Formationsleuchten: Band an der Rumpfseite vorn und am Grat hinten
        P = [hull_point(x, s * 1.5) for x in [3.9 - 0.05 * i for i in range(13)]]; nn = [hull_normal(x, s * 1.5) for x in [3.9 - 0.05 * i for i in range(13)]]
        band3('Formationsleuchte', P, nn, 0.018, 0.003, M['formlicht'])
        P = [spine_pt(x, PI / 2 + s * 1.15) for x in [-4.0 - 0.05 * i for i in range(13)]]; nn = [spine_normal(x, PI / 2 + s * 1.15) for x in [-4.0 - 0.05 * i for i in range(13)]]
        band3('Formationsleuchte', P, nn, 0.018, 0.003, M['formlicht'])
        CUR[0] = C_PART
        pipe('Seitenkante', [hull_point(x, s * PI / 2 * 1.02) + hull_normal(x, s * PI / 2 * 1.02) * 0.004 for x in [6.2 - 0.1 * i for i in range(25)]], 0.008, M['kante'])
    zl = bot_z(5.75, 0)
    with Part('Werkzeuglaser', T(5.75, 0, zl + 0.01), C_PART):      # kleiner Bergbau- und Werkzeuglaser unter dem Kinn (Kugelkopf)
        cyl('Lasersockel', 0.15, 0.06, 0, 0, -0.02, M['graphit'], 'Z', n=24); ring('Sockelring', 0.152, 0.01, (0, 0, -0.05), (0, 0, 1), M['mittel'], 24)
        sphere('Laserkugel', 0.115, 0, 0, -0.11, M['graphit'], 24)
        cyl('Laserrohr', 0.036, 0.24, 0.13, 0, -0.13, M['duese'], 'X', n=16); ring('Fokusring', 0.042, 0.008, (0.2, 0, -0.13), (1, 0, 0), M['orange'], 16)
        cyl('Laserlinse', 0.03, 0.01, 0.255, 0, -0.13, M['laser'], 'X', n=16)
        for s in (1, -1): cyl('Achskappe', 0.04, 0.03, 0, s * 0.115, -0.11, M['mittel'], 'Y', n=16)
    ANCH['laser'] = Vector((6.02, 0, zl + 0.01 - 0.13))
    with Part('Sensorkugel', T(5.15, -0.24, top_z(5.15, -0.24) - 0.02), C_PART):
        cyl('Sensorsockel', 0.12, 0.06, 0, 0, 0.03, M['graphit'], 'Z', n=24); sphere('Sensorglas', 0.1, 0, 0, 0.09, M['rauchglas'], 24)
        ring('Sensorring', 0.105, 0.012, (0, 0, 0.08), (0, 0, 1), M['mittel'], 24)
    for x in (-1.0, -3.8):
        with Part('Klingenantenne', T(x, 0, spine_pt(x, PI / 2).z - 0.004), C_PART):
            prism('Antenne', [(0.16, 0.0), (-0.12, 0.0), (-0.2, 0.2), (-0.08, 0.2)], -0.012, 0.012, M['dunkel'], 'Y', 0.003)
    for x in (0.6, -4.2):
        with Part('Klingenantenne', place(x, PI, 0.0), C_PART):
            prism('Antenne', [(0.14, 0.0), (-0.1, 0.0), (-0.16, 0.16), (-0.06, 0.16)], -0.01, 0.01, M['dunkel'], 'Y', 0.003)
    CUR[0] = C_LITE
    sphere('Blitzlicht oben', 0.045, -2.6, 0, spine_pt(-2.6, PI / 2).z + 0.03, M['nav_r'], 12)
    sphere('Blitzlicht unten', 0.045, -1.2, 0, bot_z(-1.2, 0) - 0.03, M['nav_r'], 12)
    sphere('Hecklicht', 0.04, XE - 0.1, 0, _ST(XE) - 0.03, M['blitz'], 10)

# =====================================================================================
# 11. Beschriftung, Akzente, Gebrauchsspuren
# =====================================================================================
def markings():
    for s in (1, -1):
        label_on(4.45, s * 1.25, 'ML 01', 0.24, 'txtd')
        label_on(2.95, s * 0.95, 'RETTUNG', 0.05, 'txto')
        label_on(-0.2, s * 0.98, 'TREIBSTOFF', 0.04, 'txtd')
        p = spine_pt(-4.4, PI / 2 + s * 0.9); n = spine_normal(-4.4, PI / 2 + s * 0.9)
        surf_text('MILAN', 0.15, p, n, (0, 0, 1), 'txtd', bpy.data.objects['Rueckengrat'])
        p = spine_pt(-5.8, PI / 2 + s * 0.9); n = spine_normal(-5.8, PI / 2 + s * 0.9)
        surf_text('FRACHTFACH', 0.05, p, n, (0, 0, 1), 'txtd', bpy.data.objects['Rueckengrat'])
        c0 = inl_center(0.75, s); A = _IA(0.75); p = Vector((0.75, c0.y + s * (A + 0.003), c0.z + 0.14))
        surf_text('GEFAHR ANSAUGUNG', 0.042, p, (0, s, 0), (0, 0, 1), 'txto', bpy.data.objects['Einlaufschaufel ' + ('links' if s > 0 else 'rechts')])
        CUR[0] = C_DECAL
        for k in range(3): box('Warnwinkel', 0.11, 0.004, 0.022, 1.0 - k * 0.15, c0.y + s * (_IA(1.0 - k * 0.15) + 0.004), c0.z - 0.1, M['orange'], 0)
        p = wing_pt(4.4, 0.45, True, s); surf_text('NICHT BETRETEN', 0.07, p + Vector((0, 0, 0.004)), (0, 0, 1), (1, 0, 0), 'txtd', bpy.data.objects['Fluegel ' + ('links' if s > 0 else 'rechts')])
    # Gebrauchsspuren: Ruß an den Kanonen, Laufspuren an den Flanken, Abrieb an Leiter und Flügelwurzel, Ruß über den Düsen
    CUR[0] = C_DECAL
    def spot_n(c, n, r, m, sq=1.0):      # runder Fleck auf einer beliebig geneigten Fläche (Normale n)
        n = Vector(n).normalized(); xd = Vector((1, 0, 0)) - n * n.x; xd = xd.normalized() if xd.length > 0.1 else n.orthogonal().normalized()
        mw, X, Y, Z = frame(c, xd, n.cross(xd)); mw.translation = Vector(c) + n * 0.002
        return quad('Fleck', ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)), M[m], mw @ Matrix.Diagonal((2 * r * sq, 2 * r, 1, 1)))
    for s in (1, -1):
        p = hull_point(2.0, s * 1.3); n = hull_normal(2.0, s * 1.3); spot_n(p + n * 0.004, n, 0.22, 'fleck', 2.5)
        for x in (3.4, 0.3, -3.6):
            p = hull_point(x, s * 1.75); n = hull_normal(x, s * 1.75); up = (Vector((0, 0, 1)) - n * n.z).normalized()
            streak(tuple(p + n * 0.006), tuple(up.cross(n).normalized()), tuple(up), 0.32, 0.7)
        p = wing_pt(1.9, 0.32, True, s); spot(tuple(p + Vector((0, 0, 0.006))), 0.32, 'abrieb', 2.0)
        spot((XE + 0.12, s * NOZ[0], NOZ[1] + NOZ[2] + 0.13), 0.3, 'fleck', 2.0)
    p = hull_point(2.95, 1.75); n = hull_normal(2.95, 1.75); spot_n(p + n * 0.004, n, 0.28, 'abrieb', 1.6)

# =====================================================================================
# Bühnen, Ansichten, Bau
# =====================================================================================
# Bauplan-Blatt: die Funktion aus der Elster, mit Titel, Texten und Kameras des Milan (Quelltext ersetzt, dann ausgeführt)
PLAN_FEAT = [  # Beschriftung, Ankerpunkt, Versatz des Textes in Pixeln
    ('BLASENKANZEL, HINTEN ANGESCHLAGEN', 'kanzel', (-60, -170)), ('SEITENEINLAUF MIT SPLITTERPLATTE', 'einlauf1', (-120, -205)), ('BUGBEIN MIT LANDEFUSS', 'bugrad', (-300, 40)),
    ('LANDEBEINE, FAHREN NACH VORN EIN', 'hauptrad', (90, 175)), ('BORDLEITER', 'leiter', (-120, 170)), ('FRACHTFACH: 1 NORMKISTE (10 E)', 'fracht', (160, 70)),
    ('SCHRÄGE LEITWERKE', 'leitwerk1', (140, -130)), ('ZWEI SCHUBDÜSEN', 'duese1', (150, 130)), ('KANONE', 'kanone1', (-260, -40)), ('WERKZEUGLASER', 'laser', (-220, 90)),
]
def plan_txt(ext):
    return ['HERSTELLER: BASTION-WERFT, DECK 3', 'MODELL: MILAN', 'KLASSE: LEICHTER JÄGER (STARTSCHIFF)', 'BESATZUNG: 1',
            'LÄNGE: %.1f M' % ext['laenge'], 'SPANNWEITE: %.1f M' % ext['breite'], 'HÖHE: %.1f M (AUSGEFAHREN)' % ext['hoehe'],
            'FRACHT: 1 NORMKISTE (10 E)', 'WAFFEN: 2 KANONEN, 2 FLUGKÖRPER', 'WERKZEUG: KUGELLASER UNTER DEM KINN', 'FAHRWERK: EINZIEHBARE LANDEBEINE', 'KENNUNG: ML 01']
def mark_plan_edges(): pass
_src = open(_ek, encoding='utf-8').read(); _a = _src.index('def bauplan(path):'); _b = _src.index('\nHULL_GRID = {}')
_bp = _src[_a:_b]
for _o, _n in (("txt('ELSTER', 64, 40, 98); txt('PROSPEKTOR · EIGENER ENTWURF DER BASTION · FASSUNG 2', 24, 330, 92)", "txt('MILAN', 64, 40, 98); txt('LEICHTER JÄGER · EIGENER ENTWURF DER BASTION · STARTSCHIFF', 24, 290, 92)"),
               ("'BAUPLAN BL-0307-B'", "'BAUPLAN ML-0101-A'"), ("'Einsitziges Bergbauschiff für Felsfelder und Monde.'", "'Einsitziger leichter Jäger, das Schiff der neuen Piloten.'"),
               ("'Glatter Rumpf mit großer Glaskuppel, Kugellaser unter dem Kinn,'", "'Blasenkanzel, Seiteneinläufe, einziehbares Fahrwerk, Bordleiter,'"),
               ("'Erzkanister in Rundklammern, runde Manteltriebwerke.'", "'Frachtfach für eine Normkiste im Rückengrat mit Heckklappe.'"),
               ("c.location = (cxm + 22, 18, 9.0); c.rotation_euler = (Vector((cxm, 0, 2.8))", "c.location = (cxm + 15, 12.5, 6.4); c.rotation_euler = (Vector((cxm, 0, 1.9))"),
               ("c = CAMS['Seite']; c.location = (cxm, 60, 3.1)", "c = CAMS['Seite']; c.location = (cxm, 60, 2.15)"), ("c = CAMS['Front']; c.location = (60, 0, 3.1)", "c = CAMS['Front']; c.location = (60, 0, 2.15)"), ("'els_plan_", "'mil_plan_")):
    if _o not in _bp: raise RuntimeError('Bauplan: ' + _o[:40])
    _bp = _bp.replace(_o, _n)
exec(compile(_bp, 'els_bauplan(milan)', 'exec'))
_bauplan_els = bauplan
def bauplan(path):
    for k in ('rock', 'beam', 'hot', 'hotlight'): STAGE.setdefault(k, bpy.data.objects.new('leer_' + k, None))
    for o in [STAGE['kiste']] + list(STAGE['kiste'].children_recursive): o.hide_render = True
    zustand(0, 0, 1, 0); _bauplan_els(path)
_view_w = _view0
ZUST = {}
def view(name, path, res=(1600, 900)):
    st = ZUST.get(name, {})
    zustand(st.get('fw', 0.0), st.get('fracht', 0.0), st.get('leiter', 1.0), st.get('kanzel', 0.0))
    for o in bpy.data.objects:
        if o.name.startswith('Kanzelglas'): o.hide_render = name == 'cockpit' or name.startswith('cp_')
    for o in [STAGE['kiste']] + list(STAGE['kiste'].children_recursive): o.hide_render = not st.get('kiste', False)
    boden = bpy.data.objects.get('Boden grau'); bz = boden.location.z if boden else 0
    if boden and name == 'unten': boden.location.z = -60      # Blick von unten: Studioboden weg
    try: _view_w(name, path, res)
    finally:
        if boden: boden.location.z = bz
def build():
    global BVH
    hull, rings, XS = build_hull(); wl, wr = build_wing(1), build_wing(-1)
    BVH = make_bvh([hull, wl, wr])
    cut_openings(hull)
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL)
    for s, bm in ((1, wl), (-1, wr)): mesh_obj('Fluegel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
    canopy(); cockpit(); spine()
    for s in (1, -1): intake(s); wing_details(s); fins(s); nozzle(s); main_gear(s)
    nose_gear(); ladder(); details(); markings()
    gelenke_anlegen()
    stages(); world('grau')
    for nm, loc, yaw in (('Figur Studio', (4.3, 3.0, 0), -2.4), ('Figur Pilot', (3.3, 2.4, 0), -1.9), ('Figur Techniker', (-8.2, -1.4, 0), 1.1)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (15.5, 12.5, 6.8), (-0.4, 0, 2.3), 45), ('Hangar', (13.0, 9.5, 3.6), (-0.4, 0.6, 2.0), 30), ('Heck', (-15.5, -10.5, 5.2), (-4.5, 0, 2.4), 40),
                               ('Cockpit', (3.7, 1.0, 4.5), (2.75, -0.05, 2.7), 24), ('Detail', (3.6, 5.0, 3.2), (0.3, 1.4, 2.2), 32), ('Weltraum', (15.0, -11.0, 6.5), (-0.4, 0, 2.3), 45)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (-0.3, 60, 2.2); CAMS['Front'].location = (60, 0, 2.2); CAMS['Front'].data.ortho_scale = 13; CAMS['Seite'].data.ortho_scale = 17.5
    CAMS['Draufsicht'].data.ortho_scale = 18; CAMS['Draufsicht'].location = (0.2, 0, 60)
    cam('Fahrwerk', (6.8, 2.9, 0.8), (4.9, 0.0, 0.95), 30); cam('Fahrwerk hinten', (-0.2, 4.6, 0.7), (-2.0, 1.4, 1.0), 30)
    cam('Fracht', (-10.6, -3.4, 4.6), (-6.8, 0, 3.15), 32); cam('Leiter', (5.6, 5.6, 1.6), (2.9, 1.2, 1.4), 30)
    cam('Unten', (6.5, 7.0, -4.0), (-0.6, 0, 1.8), 38); cam('Einstieg', (6.4, 6.8, 4.8), (2.6, 0.4, 2.6), 32)
    # Cockpit in Feinausführung: Blick des Piloten (Sichtfeld wie im Spiel), nach links und rechts unten, Tafel aus der Nähe, von oben
    A = AUGE; cam('Pilot', tuple(A), (A.x + 3.0, 0, A.z - 0.42), 14); cam('Pilot links', tuple(A), (A.x + 0.55, 0.75, A.z - 0.75), 16); cam('Pilot rechts', tuple(A), (A.x + 0.55, -0.75, A.z - 0.75), 16)
    cam('Tafel', (A.x + 0.1, 0.0, A.z - 0.2), (XP, 0, ZP - 0.06), 22); cam('Konsole', (2.3, 0.05, 3.25), (2.62, 0.52, 2.6), 24); cam('Oben', (2.9, 0.0, 4.75), (2.92, 0.0, 2.6), 22)
    global VIEWS
    V6 = {      # Kamera, Bühne, Fahrwerk sichtbar, Belichtung, Glut, Zustand
        'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0, {}), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0, {}), 'seite': ('Seite', 'grau', True, 0.9, 0.0, {}),
        'front': ('Front', 'grau', True, 0.7, 0.0, {}), 'heck': ('Heck', 'grau', True, 0.1, 0.0, {}), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0, {'kanzel': 1.0}),
        'cockpit': ('Cockpit', 'grau', True, 0.3, 0.0, {}), 'detail': ('Detail', 'grau', True, 0.1, 0.0, {}),
        'weltraum': ('Weltraum', 'weltraum', True, 0.0, 6.0, {'fw': 1.0, 'leiter': 0.0}), 'unten': ('Unten', 'grau', True, 0.6, 0.0, {'fw': 1.0, 'leiter': 0.0}),
        'fahrwerk': ('Fahrwerk', 'grau', True, 0.3, 0.0, {}), 'fahrwerk2': ('Fahrwerk hinten', 'grau', True, 0.3, 0.0, {}),
        'fracht': ('Fracht', 'hangar', True, 0.6, 0.0, {'fracht': 1.0, 'kiste': True}), 'leiter': ('Leiter', 'grau', True, 0.3, 0.0, {'kanzel': 1.0}),
        'einstieg': ('Einstieg', 'grau', True, 0.1, 0.0, {'kanzel': 1.0}),
        'cp_pilot': ('Pilot', 'grau', True, 0.9, 0.0, {'fw': 1.0, 'leiter': 0.0}), 'cp_links': ('Pilot links', 'grau', True, 0.9, 0.0, {}), 'cp_rechts': ('Pilot rechts', 'grau', True, 0.9, 0.0, {}),
        'cp_tafel': ('Tafel', 'grau', True, 0.9, 0.0, {}), 'cp_konsole': ('Konsole', 'grau', True, 0.9, 0.0, {}), 'cp_oben': ('Oben', 'grau', True, 0.6, 0.0, {}), 'halb': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 0.55, 'leiter': 0.0}),
    }
    VIEWS = {k: v[:5] for k, v in V6.items()}; ZUST.update({k: v[5] for k, v in V6.items()})
    anchors = {'duese': list(ANCH['duese1']), 'kanone': list(ANCH['kanone1']), 'fracht': list(ANCH['fracht']), 'laser': list(ANCH['laser']),
               'umriss': [[round(x, 2), round(max(params(x)[0], 0.0), 3)] for x in [XT, 7.3, 6.6, 5.4, 4.2, 2.8, 1.4, 0.0, -1.6, -3.4, -5.0, -6.1, XE]],
               'fluegel': [[round(le_x(y), 2), round(te_x(y), 2), round(y, 2)] for y in (0.85, 1.18, 1.62, 3.0, 5.55)],
               'gelenke': GELENKE, 'kanzel_gelenk': list(ANCH['kanzel_gelenk']), 'auge': list(ANCH['auge'])}
    open(os.path.join(HIER, 'mil-anker.json'), 'w').write(json.dumps(anchors, indent=1))
    zustand(0, 0, 1, 0)
    return {'ringe': len(XS), 'gelenke': len(GELENKE)}
if not globals().get('NUR_HELFER_MILAN'):
    result = build()
