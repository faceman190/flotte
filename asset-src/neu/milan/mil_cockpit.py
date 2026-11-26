# Milan: Cockpit in Feinausführung (26.11.2026). Wunsch des Nutzers: „Unsere Cockpits sind noch leer, ohne Details. Ich möchte auch im Schiff
# auf Firstperson-Cockpit-Sicht schalten. Dazu brauchen wir ein gutes Cockpit. Fang mit Milan an.“ (Vorlagen: vier Cockpitbilder aus Star Citizen,
# nur für Dichte und Anmutung; Aufteilung, Formen und Beschriftung sind eigener Entwurf im Stil der Bastion: Taubengrau, Graphit, Signalorange.)
#
# Wird von mil_kit.py eingelesen und ersetzt dort cockpit(). Achsen wie überall: +X vorn, +Y Backbord (links vom Piloten), +Z oben.
# Aufbau:
#  - Wanne mit Spanten, Längsgurt, Wandfeldern, Bodenplatten, Kabelsträngen; gepolsterte Brüstung mit Kanzelhaken
#  - Schleudersitz als Schale mit Polsterfeldern, Kopfteil, Gurtzeug, Auslösegriffen, Schienen
#  - Instrumententafel 0,8 m vor dem Auge: drei Anzeigen mit Randtasten (Schirme mit UV für lebende Bilder im Spiel), Fahrwerkshebel, Notinstrumente,
#    Leuchtfelder, Schalterleisten; Mittelkonsole mit Eingabefeld und Waffenschaltern
#  - Blendschutz mit langem Deck bis zur Kanzelspitze, darauf HUD-Projektor mit Sichtscheibe
#  - Seitenkonsolen: links Schubhebel, Triebwerk, Treibstoff, Funk; rechts Seitenknüppel mit Armauflage, Licht, Lebenserhaltung, Sicherungen
#  - Seitenwände: Kanzelhebel, Notabwurf, Sauerstoffanschluss, Datenschacht, Leselampe
# Schirme tragen feste Materialnamen („CP Schirm …“): Das Spiel legt dort seine Zeichenflächen auf (src/game/cockpit.ts).
# AUGE: Augpunkt des Piloten (geht nach mil-anker.json, das Spiel setzt dort die Kamera hin).

def cmk(key, name, col, metal=0.2, rough=0.5, **kw):
    M[key] = mk('CP ' + name, col, metal, rough, **kw); return M[key]
cmk('c_wand', 'Wandlack', (0.105, 0.112, 0.12), 0.25, 0.52, var=0.08, scale=3.0, bump=0.15, wear=0.5)
cmk('c_feld', 'Wandfeld', (0.06, 0.064, 0.07), 0.2, 0.6, var=0.1, scale=4.0, bump=0.2, wear=0.3)
cmk('c_spant', 'Spant', (0.14, 0.146, 0.152), 0.55, 0.42, var=0.08, wear=0.7)
cmk('c_boden', 'Bodenplatte', (0.035, 0.037, 0.04), 0.5, 0.55, var=0.12, scale=5.0, bump=0.3, wear=0.8)
cmk('c_pult', 'Tafel Graphit', (0.024, 0.026, 0.03), 0.3, 0.5, var=0.06, scale=4.0, wear=0.4)
cmk('c_platte', 'Bedienfeld', (0.05, 0.053, 0.058), 0.3, 0.48, var=0.06, scale=4.0, wear=0.5)
cmk('c_rahmen', 'Anzeigerahmen', (0.012, 0.012, 0.014), 0.4, 0.42, var=0.05, wear=0.5)
cmk('c_polster', 'Blendschutz', (0.026, 0.026, 0.029), 0.0, 0.9, var=0.1, scale=8.0, bump=0.4, bscale=260)
cmk('c_metall', 'Blankmetall', (0.42, 0.43, 0.45), 1.0, 0.32, var=0.05, grime=False)
cmk('c_stahl', 'Dunkelstahl', (0.07, 0.072, 0.078), 0.9, 0.38, var=0.08, wear=0.4)
cmk('c_knopf', 'Drehknopf', (0.016, 0.016, 0.018), 0.1, 0.45, var=0.04, grime=False)
cmk('c_taste', 'Tastenkappe', (0.085, 0.09, 0.096), 0.1, 0.55, var=0.04, grime=False)
cmk('c_orange', 'Griff Signalorange', (0.5, 0.12, 0.015), 0.1, 0.45, var=0.06, wear=0.6)
cmk('c_gelb', 'Griff Gelb', (0.6, 0.42, 0.03), 0.1, 0.5, var=0.06, wear=0.5)
cmk('c_rot', 'Schutzkappe Rot', (0.42, 0.025, 0.018), 0.1, 0.4, var=0.05, grime=False)
cmk('c_bezug', 'Sitzbezug', (0.03, 0.032, 0.036), 0.0, 0.78, var=0.15, scale=6.0, bump=0.4, bscale=300)
cmk('c_bezug2', 'Sitzbezug Orange', (0.36, 0.09, 0.015), 0.0, 0.75, var=0.12, scale=6.0, bump=0.4, bscale=300)
cmk('c_schale', 'Sitzschale', (0.045, 0.047, 0.052), 0.35, 0.45, var=0.08, wear=0.6)
cmk('c_ziffer', 'Zifferblatt', (0.008, 0.008, 0.009), 0.0, 0.6, var=0, grime=False)
for _k, _n, _c, _e in (('l_gruen', 'Licht Gruen', (0.2, 1.0, 0.4), 2.2), ('l_bern', 'Licht Bernstein', (1.0, 0.55, 0.1), 2.2), ('l_rot', 'Licht Rot', (1.0, 0.1, 0.06), 2.4),
                       ('l_weiss', 'Licht Weiss', (0.9, 0.95, 1.0), 1.6), ('l_teal', 'Licht Petrol', (0.2, 0.9, 0.85), 1.8), ('l_aus', 'Licht aus', (0.1, 0.06, 0.02), 0.0)):
    M[_k] = mk('CP ' + _n, _c if _e else (0.05, 0.035, 0.02), 0, 0.3, var=0, rvar=0, emit=_c if _e else None, es=_e, grime=False)
for _k, _n, _a, _c in (('s_l', 'Schirm L', (0.05, 0.42, 0.4), (0.0, 0.03, 0.035)), ('s_m', 'Schirm M', (0.08, 0.5, 0.2), (0.0, 0.03, 0.01)), ('s_r', 'Schirm R', (0.05, 0.42, 0.4), (0.0, 0.03, 0.035)),
                       ('s_ufc', 'Schirm UFC', (0.5, 0.3, 0.05), (0.03, 0.015, 0.0))):
    M[_k] = stripes('CP ' + _n, _a, _c, 220, emit=1.2, direction='Z', duty=0.9)
M['s_hud'] = mk('CP Schirm HUD', (0.75, 0.95, 0.85), 0.0, 0.03, var=0, rvar=0.005, grime=False, trans=1.0)
cmk('c_plak', 'Plakette', (0.62, 0.6, 0.52), 0.0, 0.5, var=0.04, grime=False)
cmk('c_plakg', 'Plakette Gelb', (0.62, 0.45, 0.04), 0.0, 0.5, var=0.04, grime=False)

AUGE = Vector((2.36, 0.0, 3.22))
def yi_of(x): return max(0.3, min(params(x)[0] - 0.08, canopy_yb(x) + 0.05))
def sill_z(x): return top_z(x, yi_of(x)) - 0.03
def PF(origin, xd, yd): return frame(origin, xd, yd)[0]

# ---------- Kleinteile in der Ebene eines Bedienfelds (u nach rechts, v nach oben, w aus der Fläche) ----------
def schr(u, v, w=0.0, r=0.0042): cyl('Schraube', r, 0.0026, u, v, w + 0.0013, M['c_metall'], 'Z', n=8, bev=0)
def platte(u0, v0, u1, v1, m='c_platte', th=0.004, w=0.0, screws=True, bev=0.0015):
    box('Bedienfeld', u1 - u0, v1 - v0, th, (u0 + u1) / 2, (v0 + v1) / 2, w + th / 2, M[m], bev)
    if screws:
        for a in (u0 + 0.009, u1 - 0.009):
            for b in (v0 + 0.009, v1 - 0.009): schr(a, b, w + th)
    return w + th
def schild(s, u, v, w, size=0.0075, m='txtw', align='CENTER'):
    o = text(s, size, (u, v - size * 0.36, w - 0.0017), (1, 0, 0), (0, 1, 0), M[m], align, name='Schild'); o.data.resolution_u = 2; return o
def kipp(u, v, w, pos=1, guard=False, lang=0.02):
    cyl('Kippmutter', 0.0072, 0.0035, u, v, w + 0.0018, M['c_metall'], 'Z', n=6, bev=0)
    cyl('Kipphals', 0.0042, 0.006, u, v, w + 0.0055, M['c_stahl'], 'Z', n=10, bev=0)
    a = 0.42 * pos; tip = Vector((u, v + math.sin(a) * lang, w + 0.007 + math.cos(a) * lang))
    rod('Kipphebel', (u, v, w + 0.007), tip, 0.0019, M['c_metall'], 10, r2=0.0028)
    if guard:      # rote Schutzkappe, halb aufgeklappt
        slab('Schutzkappe', (u, v + 0.012, w + 0.02), (1, 0, 0), (0, 0.8, 0.6), (0.02, 0.034, 0.012), M['c_rot'], 0.003)
        cyl('Kappenachse', 0.0025, 0.024, u, v + 0.026, w + 0.006, M['c_stahl'], 'X', n=8, bev=0)
def knopf(u, v, w, r=0.013, h=0.015, m='c_knopf', ang=0.0, skala=True):
    cyl('Knopfkragen', r * 1.28, 0.003, u, v, w + 0.0015, M['c_stahl'], 'Z', n=20, bev=0)
    cyl('Knopf', r, h, u, v, w + 0.003 + h / 2, M[m], 'Z', n=20, bev=0.0015, r2=r * 0.84)
    box('Knopfzeiger', 0.002, r * 0.75, 0.0012, u + math.sin(ang) * r * 0.4, v + math.cos(ang) * r * 0.4, w + 0.0034 + h, M['txtw'], 0, rot=(0, 0, -ang))
    if skala:
        for k in range(7):
            a = -1.9 + k * 3.8 / 6; box('Skalenstrich', 0.0012, 0.0045, 0.0006, u + math.sin(a) * r * 1.62, v + math.cos(a) * r * 1.62, w + 0.0003, M['txtw'], 0, rot=(0, 0, -a))
def taste(u, v, w, sx=0.016, sy=0.012, m='c_taste', led=None, h=0.005):
    box('Taste', sx, sy, h, u, v, w + h / 2, M[m], 0.0012)
    if led: box('Tastenlicht', sx * 0.55, 0.0022, 0.0008, u, v + sy * 0.24, w + h + 0.0002, M[led], 0)
def leuchte(u, v, w, m, r=0.0042):
    cyl('Leuchtenring', r * 1.5, 0.003, u, v, w + 0.0015, M['c_stahl'], 'Z', n=14, bev=0)
    cyl('Leuchte', r, 0.004, u, v, w + 0.003, M[m], 'Z', n=12, bev=0.001)
def schirm(name, sw, sh, u, v, w, m):      # flache Bildfläche mit UV (0…1), Normale = +w
    bm = bmesh.new(); vs = [bm.verts.new((u + a * sw / 2, v + b * sh / 2, w)) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    f = bm.faces.new(vs); uv = bm.loops.layers.uv.new('UVMap')
    for l, t in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))): l[uv].uv = t
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(M[m])
    return link(bpy.data.objects.new(name, me))
def anzeige(name, u, v, w, bw, bh, sw, sh, m, tasten=5):      # Anzeige: erhabener Rahmen aus vier Leisten, vertiefter Schirm, Randtasten ringsum
    t = 0.024; rx, ry = (bw - sw) / 2, (bh - sh) / 2
    box('Anzeigewanne', bw - 0.006, bh - 0.006, 0.012, u, v, w + 0.006, M['c_rahmen'], 0.002)
    for s in (1, -1):
        box('Rahmenleiste', bw, ry, t, u, v + s * (sh / 2 + ry / 2), w + t / 2, M['c_rahmen'], 0.004)
        box('Rahmenleiste', rx, sh + 0.002, t, u + s * (sw / 2 + rx / 2), v, w + t / 2, M['c_rahmen'], 0.004)
    schirm(name, sw, sh, u, v, w + 0.0125, m)
    for k in range(tasten):
        q = (k - (tasten - 1) / 2) * (sw * 0.86 / (tasten - 1))
        for s in (1, -1):
            taste(u + q, v + s * (sh / 2 + ry / 2), w + t, 0.017, 0.011, led='l_weiss' if (k + (s > 0)) % 4 == 0 else None, h=0.003)
            taste(u + s * (sw / 2 + rx / 2), v + q * sh / sw, w + t, 0.011, 0.017, h=0.003)
    for a in (1, -1):
        for b in (1, -1): schr(u + a * (bw / 2 - 0.007), v + b * (bh / 2 - 0.007), w + t)
def rund(u, v, w, r, zeiger=0.6, m_z='l_bern'):      # Rundinstrument: Ring, Zifferblatt, Striche, Zeiger
    cyl('Instrumentenring', r + 0.007, 0.016, u, v, w + 0.008, M['c_rahmen'], 'Z', n=28, bev=0.002)
    cyl('Zifferblatt', r, 0.002, u, v, w + 0.0145, M['c_ziffer'], 'Z', n=28, bev=0)
    for k in range(12):
        a = k * PI / 6; L = 0.008 if k % 3 == 0 else 0.004
        box('Teilstrich', 0.0014, L, 0.0006, u + math.sin(a) * (r - 0.003 - L / 2), v + math.cos(a) * (r - 0.003 - L / 2), w + 0.0158, M['l_weiss'], 0, rot=(0, 0, -a))
    box('Zeiger', 0.002, r * 0.8, 0.001, u + math.sin(zeiger) * r * 0.36, v + math.cos(zeiger) * r * 0.36, w + 0.0166, M[m_z], 0, rot=(0, 0, -zeiger))
    cyl('Zeigernabe', 0.004, 0.003, u, v, w + 0.0165, M['c_stahl'], 'Z', n=10, bev=0)
    for a in (0.785, 2.356, 3.927, 5.498): schr(u + math.sin(a) * (r + 0.012), v + math.cos(a) * (r + 0.012), w)
def leuchtfeld(u, v, w, cols, rows, texte, an):      # Leuchtfeld: Kacheln mit Text, an = {Index: Material}
    cw, ch = 0.03, 0.014
    box('Leuchtfeldrahmen', cols * cw + 0.008, rows * ch + 0.008, 0.008, u, v, w + 0.004, M['c_rahmen'], 0.002)
    for i in range(cols * rows):
        cu, cv = u + (i % cols - (cols - 1) / 2) * cw, v - (i // cols - (rows - 1) / 2) * ch
        box('Leuchtkachel', cw - 0.003, ch - 0.003, 0.002, cu, cv, w + 0.009, M[an.get(i, 'l_aus')], 0.0006)
        if i < len(texte): schild(texte[i], cu, cv, w + 0.0122, 0.0052, 'txtd' if i in an else 'txtw')
def plakette(s, u, v, w, size=0.0055, gelb=False):      # kleines Schild mit dunkler Schrift, zwei Nieten
    bw = max(0.03, len(s) * size * 0.62 + 0.014)
    box('Plakette', bw, size * 2.0, 0.0012, u, v, w + 0.0006, M['c_plakg' if gelb else 'c_plak'], 0.0004)
    schild(s, u, v, w + 0.0013, size, 'txtd')
def duese(u, v, w, r=0.022):      # runde Lüfterdüse mit Lamellen
    cyl('Duesenring', r, 0.012, u, v, w + 0.006, M['c_stahl'], 'Z', n=22, bev=0.003)
    cyl('Duesengrund', r * 0.8, 0.002, u, v, w + 0.011, M['c_ziffer'], 'Z', n=18, bev=0)
    for k in range(4): box('Lamelle', r * 1.4 - abs(k - 1.5) * 0.008, 0.0025, 0.004, u, v + (k - 1.5) * r * 0.36, w + 0.012, M['c_metall'], 0.0006, rot=(0.5, 0, 0))
def sicherung(u, v, w): cyl('Sicherungskragen', 0.0055, 0.003, u, v, w + 0.0015, M['txtw'], 'Z', n=10, bev=0); cyl('Sicherung', 0.0045, 0.012, u, v, w + 0.008, M['c_knopf'], 'Z', n=10, bev=0.001)

# ---------- Wanne, Spanten, Boden ----------
def cp_wanne():
    CUR[0] = C_ROOM; bm = bmesh.new(); R = []
    XSC = [CX0 + 0.06 + (CX1 - 0.22 - CX0 - 0.06) * i / 30 for i in range(31)]
    for x in XSC:
        yi = yi_of(x); zt = top_z(x, yi) - 0.03; fz = floor_z(x)
        side = [Vector((x, yi, zt)), Vector((x, yi, fz + 0.3)), Vector((x, yi * 0.78, fz))]
        R.append(side + [Vector((p.x, -p.y, p.z)) for p in reversed(side)])
    V = [[bm.verts.new(p) for p in r] for r in R]
    for i in range(len(V) - 1):
        for k in range(len(V[0]) - 1): bm.faces.new((V[i][k], V[i][k + 1], V[i + 1][k + 1], V[i + 1][k]))
    bm.faces.new(V[0]); bm.faces.new(V[-1][::-1]); bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Cockpitwanne', bm, ['c_wand'], True, C_ROOM)
    for s in (1, -1):
        # Spanten an der senkrechten Wand, Längsgurt, eingelassene Wandfelder dazwischen
        xs = [1.62, 1.95, 2.28, 2.61, 2.94, 3.27, 3.6, 3.93, 4.26]
        for x in xs:
            yi = yi_of(x); z0 = floor_z(x) + 0.3; z1 = sill_z(x) - 0.01
            box('Spant', 0.03, 0.032, z1 - z0, x, s * (yi - 0.016), (z0 + z1) / 2, M['c_spant'], 0.005)
            box('Spantfuss', 0.05, 0.04, 0.03, x, s * (yi * 0.89 - 0.01), floor_z(x) + 0.16, M['c_spant'], 0.005, rot=(s * -0.44, 0, 0))
            for z in (z0 + 0.05, z1 - 0.05): cyl('Spantniet', 0.004, 0.004, x, s * (yi - 0.033), z, M['c_metall'], 'Y', n=8, bev=0)
        for a, b in zip(xs[:-1], xs[1:]):
            xm = (a + b) / 2; yi = min(yi_of(a), yi_of(b)); zs = min(sill_z(a), sill_z(b))
            slab('Laengsgurt', (xm, s * (yi - 0.012), zs - 0.14), (1, 0, 0), (0, 0, 1), (b - a - 0.03, 0.022, 0.02), M['c_spant'], 0.004)
            slab('Wandfeld', (xm, s * (yi - 0.005), zs - 0.075), (1, 0, 0), (0, 0, 1), (b - a - 0.05, 0.1, 0.006), M['c_feld'], 0.003)
            for dx in (-1, 1): cyl('Feldschraube', 0.0035, 0.003, xm + dx * (b - a - 0.08) / 2, s * (yi - 0.009), zs - 0.035, M['c_metall'], 'Y', n=8, bev=0)
        # Brüstung: gepolsterte Kante, Kanzelhaken
        P = [Vector((x, s * (yi_of(x) - 0.012), sill_z(x) + 0.004)) for x in [CX0 + 0.25 + k * (CX1 - 0.5 - CX0 - 0.25) / 40 for k in range(41)]]
        strip_mesh('Bruestungspolster', P, [Vector((0, -s * 0.5, 0.86)) for _ in P], 0.045, 0.02, M['c_polster'], False, 0.0, C_ROOM)
        for x in (1.8, 2.45, 3.1, 3.75, 4.3):
            box('Kanzelhaken', 0.05, 0.018, 0.026, x, s * (yi_of(x) - 0.035), sill_z(x) - 0.012, M['c_metall'], 0.003)
            cyl('Hakenbolzen', 0.005, 0.03, x, s * (yi_of(x) - 0.035), sill_z(x) - 0.004, M['c_stahl'], 'Y', n=10, bev=0)
        # Kabelstrang und Luftleitung unter der Brüstung, mit Schellen
        pts = [Vector((x, s * (yi_of(x) - 0.03), sill_z(x) - 0.2)) for x in (1.7, 2.1, 2.6, 3.1, 3.6, 4.1, 4.4)]
        pipe('Kabelstrang', pts, 0.009, M['rubber'], 0.05); pipe('Kabel duenn', [p + Vector((0, -s * 0.004, 0.018)) for p in pts], 0.004, M['c_orange' if s > 0 else 'c_stahl'], 0.05)
        for p in pts[1:-1]: box('Kabelschelle', 0.014, 0.012, 0.036, p.x + 0.16, p.y, p.z + 0.006, M['c_metall'], 0.002)
    # Bodenplatten mit Rippen, Fußmulde, Fersenbleche
    for x0, x1 in ((1.9, 2.75), (2.78, 3.12)):
        box('Bodenplatte', x1 - x0, 0.86, 0.008, (x0 + x1) / 2, 0, FL + 0.004, M['c_boden'], 0.002)
    for k in range(9):
        x = 3.2 + k * 0.1
        if x < 4.15: box('Trittrippe', 0.012, 0.6, 0.004, x, 0, floor_z(x) + 0.006, M['c_stahl'], 0.001)
    box('Fussboden vorn', 1.0, 0.72, 0.008, 3.68, 0, floor_z(3.7) + 0.004, M['c_boden'], 0.002)
    for s in (1, -1): box('Fersenblech', 0.22, 0.14, 0.004, 3.72, s * 0.19, floor_z(3.72) + 0.012, M['c_metall'], 0.002)

# ---------- Schleudersitz ----------
def cp_sitz():
    xs = 2.28
    with Part('Schleudersitz', T(xs, 0, FL) @ RY(math.radians(-13)), C_ROOM):
        for s in (1, -1):
            box('Sitzschiene', 0.06, 0.04, 1.3, -0.25, s * 0.2, 0.68, M['c_stahl'], 0.006)
            for k in range(6): cyl('Schienenrolle', 0.014, 0.012, -0.215, s * 0.2, 0.16 + k * 0.22, M['c_metall'], 'Y', n=12, bev=0)
            slab('Schalenwange', (0.1, s * 0.255, 0.33), (1, 0, 0.12), (0, 0, 1), (0.52, 0.03, 0.2), M['c_schale'], 0.012)
            slab('Lehnenwange', (-0.14, s * 0.25, 0.8), (0, 0, 1), (1, 0, 0), (0.62, 0.16, 0.03), M['c_schale'], 0.012)
            box('Kopfwange', 0.15, 0.035, 0.24, -0.09, s * 0.17, 1.24, M['c_schale'], 0.012)
            box('Schultergurt', 0.012, 0.05, 0.66, -0.05, s * 0.105, 0.72, M['gurt'], 0.002)
            box('Beckengurt', 0.3, 0.045, 0.012, 0.13, s * 0.14, 0.425, M['gurt'], 0.002)
            box('Gurtstraffer', 0.05, 0.07, 0.04, -0.13, s * 0.105, 1.07, M['c_stahl'], 0.006); cyl('Gurtrolle', 0.022, 0.06, -0.13, s * 0.105, 1.07, M['c_metall'], 'Y', n=14, bev=0.002)
            box('Seitenhebel', 0.16, 0.02, 0.03, 0.2, s * 0.285, 0.36, M['c_gelb' if s > 0 else 'c_stahl'], 0.006)
            pipe('Notgriff Kopf', [Vector((-0.02, s * 0.2, 1.34)), Vector((0.03, s * 0.2, 1.36)), Vector((0.03, s * 0.2, 1.26)), Vector((-0.02, s * 0.2, 1.24))], 0.007, M['warnrw'], 0.02)
        box('Sitzwanne', 0.5, 0.48, 0.16, 0.11, 0, 0.25, M['c_schale'], 0.02)
        box('Ueberlebenspack', 0.4, 0.4, 0.1, 0.1, 0, 0.12, M['c_stahl'], 0.012)
        for k in range(3): box('Sitzpolster', 0.14, 0.4, 0.07, -0.03 + k * 0.145, 0, 0.365, M['c_bezug'], 0.022)
        box('Sitzbahn', 0.43, 0.07, 0.006, 0.115, 0, 0.403, M['c_bezug2'], 0.002)
        box('Lehnenplatte', 0.07, 0.46, 0.74, -0.17, 0, 0.78, M['c_schale'], 0.02)
        for k in range(4): box('Lehnenpolster', 0.06, 0.38, 0.165, -0.115, 0, 0.5 + k * 0.175, M['c_bezug'], 0.022)
        box('Lehnenbahn', 0.006, 0.07, 0.68, -0.083, 0, 0.76, M['c_bezug2'], 0.002)
        box('Kopfteil', 0.16, 0.36, 0.24, -0.13, 0, 1.24, M['c_schale'], 0.03); box('Kopfpolster', 0.05, 0.22, 0.15, -0.04, 0, 1.24, M['c_bezug'], 0.02)
        box('Schirmkasten', 0.16, 0.42, 0.26, -0.26, 0, 1.03, M['c_stahl'], 0.02)
        for k in range(3): box('Kastenrippe', 0.006, 0.36, 0.012, -0.342, 0, 0.96 + k * 0.07, M['c_spant'], 0.002)
        cyl('Gurtschloss', 0.034, 0.02, 0.1, 0, 0.44, M['c_metall'], 'Z', n=20, bev=0.003); cyl('Schlossknopf', 0.016, 0.008, 0.1, 0, 0.454, M['c_rot'], 'Z', n=14, bev=0.002)
        pipe('Notgriff', [Vector((0.31, -0.07, 0.36)), Vector((0.36, -0.07, 0.43)), Vector((0.36, 0.07, 0.43)), Vector((0.31, 0.07, 0.36))], 0.009, M['warnrw'], 0.03)
        box('Notgriffsockel', 0.05, 0.18, 0.04, 0.31, 0, 0.345, M['c_stahl'], 0.008)
        cyl('Hoehenstellmotor', 0.03, 0.12, -0.3, 0, 0.26, M['c_stahl'], 'Y', n=16, bev=0.004)
    surf_text('RETTUNG', 0.026, (xs - 0.36, 0, FL + 1.3), (-1, 0, 0.2), (0, 0, 1), 'txto'); CUR[0] = C_ROOM
    # Rückwand: Geräteträger, Kästen mit Steckern, Kabel, Lüftergitter, Feuerlöscher
    xr = CX0 + 0.2
    box('Geraetetraeger', 0.05, 0.9, 0.5, xr + 0.02, 0, FL + 0.55, M['c_spant'], 0.008)
    for y, h, m in ((0.26, 0.3, 'c_stahl'), (-0.02, 0.36, 'c_platte'), (-0.3, 0.26, 'c_stahl')):
        box('Avionikkasten', 0.2, 0.24, h, xr + 0.13, y, FL + 0.32 + h / 2, M[m], 0.012)
        for k in range(3): cyl('Stecker', 0.012, 0.02, xr + 0.24, y - 0.07 + k * 0.07, FL + 0.36 + h * 0.6, M['c_metall'], 'X', n=10, bev=0.002)
        for k in range(4): box('Kuehlrippe', 0.012, 0.2, 0.006, xr + 0.235, y, FL + 0.36 + k * 0.03, M['c_spant'], 0.001)
    cyl('Feuerloescher', 0.045, 0.3, xr + 0.12, 0.42, FL + 0.48, M['c_rot'], 'Z', n=20, bev=0.01); cyl('Loescherkopf', 0.02, 0.05, xr + 0.12, 0.42, FL + 0.655, M['c_stahl'], 'Z', n=12, bev=0.003)
    for s in (1, -1): cable((xr + 0.24, s * 0.2, FL + 0.6), (2.0, s * 0.56, FL + 0.56), 0.008, M['rubber'], 0.05)

# ---------- Instrumententafel, Mittelkonsole ----------
XP, ZP = 3.30, 2.775
def cp_tafel():
    tilt = (0.26, 0, 0.966)
    # Träger hinter der Tafel und Kniekasten
    slab('Tafeltraeger', (XP + 0.04, 0, ZP), (0, -1, 0), tilt, (1.3, 0.5, 0.05), M['c_pult'], 0.012)
    with Part('Tafel', PF((XP, 0, ZP), (0, -1, 0), tilt), C_ROOM):
        w0 = 0.028
        platte(-0.61, -0.245, 0.61, 0.245, 'c_pult', 0.006, w0 - 0.006, False, 0.004)
        # drei Anzeigen
        anzeige('Schirm L', -0.3, 0.02, w0, 0.27, 0.27, 0.205, 0.205, 's_l'); anzeige('Schirm M', 0.0, 0.02, w0, 0.27, 0.27, 0.205, 0.205, 's_m'); anzeige('Schirm R', 0.3, 0.02, w0, 0.27, 0.27, 0.205, 0.205, 's_r')
        for u, t in ((-0.3, 'SYSTEME'), (0.0, 'LAGE'), (0.3, 'ZIEL · NAV')): schild(t, u, -0.127, w0 + 0.0245, 0.0062, 'txtw')
        # links außen: Fahrwerk
        wl = platte(-0.6, -0.21, -0.45, 0.2, 'c_platte', 0.004, w0)
        schild('FAHRWERK', -0.525, 0.177, wl, 0.0075)
        for (du, dv), t in (((0, 0.03), 'B'), ((-0.03, -0.012), 'L'), ((0.03, -0.012), 'R')):
            box('Fahrwerksleuchte', 0.022, 0.018, 0.004, -0.525 + du, 0.118 + dv, wl + 0.002, M['l_gruen'], 0.001); schild(t, -0.525 + du, 0.118 + dv, wl + 0.0058, 0.0065, 'txtd')
        box('Hebelschlitz', 0.014, 0.1, 0.002, -0.525, 0.02, wl + 0.001, M['c_ziffer'], 0)
        rod('Fahrwerkshebel', (-0.525, 0.0, wl), (-0.525, -0.022, wl + 0.06), 0.005, M['c_metall'], 12)
        cyl('Hebelknauf', 0.017, 0.03, -0.525, -0.022, wl + 0.062, M['c_rot'], 'X', n=18, bev=0.004)
        schild('EIN', -0.565, 0.062, wl, 0.0058); schild('AUS', -0.565, -0.022, wl, 0.0058)
        box('Notabwurfrahmen', 0.07, 0.05, 0.006, -0.525, -0.13, wl + 0.003, M['warnrw'], 0.001); taste(-0.525, -0.13, wl + 0.006, 0.04, 0.026, 'c_rot', None, 0.008)
        schild('NOTABWURF', -0.525, -0.175, wl, 0.0055, 'txto')
        # rechts außen: Notinstrumente, Uhr
        wr = platte(0.45, -0.21, 0.6, 0.2, 'c_platte', 0.004, w0)
        rund(0.525, 0.115, wr, 0.043, 0.9); rund(0.525, -0.005, wr, 0.043, -1.2, 'l_weiss')
        schild('FAHRT', 0.525, 0.172, wr, 0.0055); schild('HÖHE', 0.525, -0.062, wr, 0.0055)
        box('Uhrrahmen', 0.1, 0.045, 0.01, 0.525, -0.12, wr + 0.005, M['c_rahmen'], 0.002); schirm('Schirm Uhr', 0.084, 0.03, 0.525, -0.12, wr + 0.0104, 's_ufc')
        for k in range(3): taste(0.495 + k * 0.03, -0.165, wr, 0.018, 0.011, led='l_bern' if k == 0 else None)
        # Leuchtfelder und Hauptwarnung oben
        wt = w0
        leuchtfeld(-0.3, 0.2, wt, 5, 2, ['ÖL', 'HYDR', 'TRBW', 'KRAFT', 'KÜHL', 'SCHILD', 'RUMPF', 'TANK', 'LUFT', 'FUNK'], {2: 'l_bern', 5: 'l_gruen'})
        leuchtfeld(0.3, 0.2, wt, 5, 2, ['WAFFE', 'RAKETE', 'LASER', 'ZIEL', 'RADAR', 'FRACHT', 'SPRUNG', 'ANDOCK', 'AUTO', 'NAV'], {0: 'l_rot', 8: 'l_gruen'})
        taste(-0.085, 0.2, wt, 0.05, 0.026, 'c_rahmen', None, 0.006); box('Hauptwarnung', 0.042, 0.02, 0.002, -0.085, 0.2, wt + 0.0065, M['l_bern'], 0.0006); schild('WARNUNG', -0.085, 0.2, wt + 0.0102, 0.0056, 'txtd')
        taste(0.085, 0.2, wt, 0.05, 0.026, 'c_rahmen', None, 0.006); box('Feuerwarnung', 0.042, 0.02, 0.002, 0.085, 0.2, wt + 0.0065, M['l_rot'], 0.0006); schild('FEUER', 0.085, 0.2, wt + 0.0102, 0.0056, 'txtd')
        for k in range(3): leuchte(-0.018 + k * 0.018, 0.2, wt, ('l_gruen', 'l_bern', 'l_aus')[k], 0.0036)
        # Schalterleisten unter den Anzeigen
        wb = platte(-0.43, -0.238, -0.17, -0.15, 'c_platte', 0.004, w0)
        for k, t in enumerate(('POS', 'LANDE', 'KABINE', 'TAFEL')):
            kipp(-0.395 + k * 0.064, -0.2, wb, 1 if k % 2 == 0 else -1, lang=0.016); schild(t, -0.395 + k * 0.064, -0.228, wb, 0.0048)
        schild('LICHT', -0.3, -0.163, wb, 0.006)
        wb = platte(0.17, -0.238, 0.43, -0.15, 'c_platte', 0.004, w0)
        for k, t in enumerate(('SCHILD', 'SCAN', 'TRAKTOR', 'DROHNE')):
            taste(0.205 + k * 0.064, -0.198, wb, 0.034, 0.022, 'c_rahmen', ('l_teal', 'l_gruen', None, 'l_bern')[k], 0.006); schild(t, 0.205 + k * 0.064, -0.228, wb, 0.0048)
        schild('SYSTEME', 0.3, -0.163, wb, 0.006)
        plakette('BASTION · MILAN', -0.525, 0.228, w0, 0.0048); plakette('ZELLE 0412', 0.525, 0.228, w0, 0.0048)
        wb = platte(-0.13, -0.238, 0.13, -0.15, 'c_platte', 0.004, w0)
        knopf(-0.085, -0.2, wb, 0.014, 0.014); knopf(0.0, -0.2, wb, 0.014, 0.014, ang=0.8); knopf(0.085, -0.2, wb, 0.014, 0.014, ang=-0.6)
        for u, t in ((-0.085, 'HELL'), (0.0, 'KONTRAST'), (0.085, 'HUD')): schild(t, u, -0.166, wb, 0.0048)
    # Mittelkonsole: schräg zum Piloten, von der Tafel bis zum Boden
    ky = Vector((0.604, 0, 0.797))
    slab('Mittelkonsole', (3.19, 0, 2.3), (0, -1, 0), ky, (0.28, 0.42, 0.16), M['c_pult'], 0.012)
    box('Konsolenfuss', 0.2, 0.26, 0.2, 3.22, 0, floor_z(3.22) + 0.08, M['c_pult'], 0.012)
    with Part('Mittelkonsole Feld', PF((3.125, 0, 2.39), (0, -1, 0), ky), C_ROOM):
        w0 = 0.0
        wk = platte(-0.13, 0.055, 0.13, 0.2, 'c_platte', 0.004, w0)
        box('Eingaberahmen', 0.2, 0.05, 0.01, 0, 0.165, wk + 0.005, M['c_rahmen'], 0.002); schirm('Schirm UFC', 0.18, 0.034, 0, 0.165, wk + 0.0104, 's_ufc')
        for r in range(3):
            for c in range(6): taste(-0.09 + c * 0.036, 0.122 - r * 0.022, wk, 0.026, 0.016, led='l_gruen' if (r, c) == (0, 5) else None)
        wk = platte(-0.13, -0.075, 0.13, 0.05, 'c_platte', 0.004, w0)
        schild('WAFFEN', 0, 0.036, wk, 0.007, 'txto')
        kipp(-0.085, -0.02, wk, -1, guard=True); schild('SCHARF', -0.085, -0.062, wk, 0.005)
        knopf(0.0, -0.02, wk, 0.018, 0.016, ang=0.5); schild('WAHL', 0.0, -0.062, wk, 0.005)
        for k in range(2): kipp(0.07 + k * 0.035, -0.02, wk, 1 - 2 * k, lang=0.016)
        schild('KANONE  RAKETE', 0.088, -0.062, wk, 0.0045)
        wk = platte(-0.13, -0.2, 0.13, -0.08, 'c_platte', 0.004, w0)
        schild('ANTRIEB', 0, -0.094, wk, 0.007)
        for k, t in enumerate(('REISE', 'SPRUNG', 'AUTO')):
            taste(-0.08 + k * 0.08, -0.135, wk, 0.05, 0.03, 'c_rahmen', ('l_teal', 'l_bern', None)[k], 0.007); schild(t, -0.08 + k * 0.08, -0.172, wk, 0.005)
    # Pedale: hängende Arme, geriffelte Trittplatten
    for s in (1, -1):
        y = s * 0.19; fz = floor_z(3.9)
        rod('Pedalarm', (3.98, y, fz + 0.42), (3.9, y, fz + 0.16), 0.012, M['c_stahl'], 12)
        slab('Pedal', (3.88, y, fz + 0.14), (0, 1, 0), (0.42, 0, 0.9), (0.12, 0.18, 0.014), M['c_stahl'], 0.004)
        for k in range(5): slab('Pedalrippe', (3.868 + k * 0.0005, y, fz + 0.08 + k * 0.03), (0, 1, 0), (0.42, 0, 0.9), (0.105, 0.008, 0.006), M['c_metall'], 0.001)
        box('Pedallager', 0.06, 0.05, 0.05, 3.99, y, fz + 0.43, M['c_spant'], 0.008)
    box('Pedaltraeger', 0.05, 0.56, 0.05, 4.0, 0, floor_z(4.0) + 0.45, M['c_spant'], 0.008)

# ---------- Blendschutz, Deck, HUD ----------
def cp_blendschutz():
    # Deck von der Tafel bis zur Kanzelspitze: folgt der Rumpflinie, an den Seiten zur Brüstung abfallend
    bm = bmesh.new(); XD = [3.27 + (4.74 - 3.27) * i / 34 for i in range(35)]; NY = 12; rows = []
    def zc(x): return top_z(x, 0) + 0.012 + 0.095 * max(0.0, 1 - (x - 3.27) / 0.6)
    def ze_(x): k = ease((x - 3.32) / 0.55); return (zc(x) - 0.045) * (1 - k) + (sill_z(x) + 0.03) * k
    for x in XD:
        hw = max(0.05, min(canopy_yb(x) - 0.035, 0.63)); ze = ze_(x)
        rows.append([bm.verts.new((x, hw * (2 * j / NY - 1), zc(x) - (zc(x) - ze) * abs(2 * j / NY - 1) ** 2.6)) for j in range(NY + 1)])
    for i in range(len(rows) - 1):
        for j in range(NY): bm.faces.new((rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    ob = mesh_obj('Blendschutzdeck', bm, ['c_polster'], True, C_ROOM); so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = 0.02; so.offset = -1
    # Lippe über der Tafel, Naht, Griffmulde
    hw0 = min(canopy_yb(3.27) - 0.035, 0.63)
    P = [Vector((3.275, hw0 * (2 * j / 24 - 1), zc(3.27) - (zc(3.27) - ze_(3.27)) * abs(2 * j / 24 - 1) ** 2.6 - 0.004)) for j in range(25)]
    strip_mesh('Blendschutzlippe', P, [Vector((-0.7, 0, 0.7)) for _ in P], 0.04, 0.026, M['c_polster'], False, 0.0, C_ROOM)
    pipe('Blendschutznaht', [p + Vector((0.05, 0, 0.012)) for p in P], 0.0025, M['c_orange'])
    # HUD: Projektor im Deck, Sichtscheibe an zwei Armen, Bedienleiste
    hx = 3.62; hz = zc(hx)
    box('HUD-Projektor', 0.24, 0.2, 0.07, hx + 0.05, 0, hz + 0.02, M['c_rahmen'], 0.01)
    box('HUD-Linse', 0.12, 0.13, 0.004, hx + 0.08, 0, hz + 0.056, M['l_gruen'], 0.002, rot=(0, math.radians(-8), 0))
    for k in range(4): box('HUD-Taste', 0.012, 0.018, 0.006, hx - 0.065, -0.06 + k * 0.04, hz + 0.045, M['c_taste'], 0.0015)
    knopf_w = PF((hx - 0.074, 0.086, hz + 0.03), (0, -1, 0), (0, 0, 1))
    with Part('HUD-Knopf', knopf_w, C_ROOM): knopf(0, 0, 0, 0.009, 0.01, skala=False)
    for s in (1, -1):
        slab('HUD-Arm', (hx + 0.0, s * 0.142, hz + 0.14), (-0.42, 0, 0.9), (0, 1, 0), (0.25, 0.012, 0.022), M['c_stahl'], 0.004)
        box('HUD-Armfuss', 0.05, 0.02, 0.03, hx + 0.05, s * 0.142, hz + 0.045, M['c_stahl'], 0.005)
    with Part('HUD-Scheibe', PF((hx - 0.03, 0, hz + 0.165), (0, -1, 0), (0.42, 0, 0.9)), C_ROOM):
        schirm('Schirm HUD', 0.27, 0.2, 0, 0, 0, 's_hud')
        for s in (1, -1): box('Scheibenrahmen', 0.006, 0.2, 0.008, s * 0.138, 0, 0, M['c_stahl'], 0.002)
        box('Scheibenrahmen unten', 0.28, 0.008, 0.008, 0, -0.103, 0, M['c_stahl'], 0.002)
    # Lüftungsschlitze vorn, Lichtsensor, Notkompass
    for k in range(7): box('Lueftungsschlitz', 0.008, 0.2, 0.004, 4.12 + k * 0.03, 0, zc(4.12 + k * 0.03) + 0.004, M['c_stahl'], 0.001)
    cyl('Lichtsensor', 0.018, 0.012, 3.95, -0.22, zc(3.95) - 0.016, M['c_stahl'], 'Z', n=16, bev=0.003); sphere('Sensorkuppel', 0.012, 3.95, -0.22, zc(3.95) - 0.008, M['rauchglas'], 12)
    box('Aufzeichnungsgeraet', 0.09, 0.07, 0.035, 3.92, 0.22, zc(3.92) - 0.016, M['c_rahmen'], 0.006); cyl('Aufzeichnungslinse', 0.012, 0.012, 3.872, 0.22, zc(3.92) - 0.012, M['rauchglas'], 'X', n=14, bev=0.002)
    leu = PF((3.876, 0.245, zc(3.92) - 0.002), (0, -1, 0), (0, 0, 1))
    with Part('Aufzeichnungslicht', leu, C_ROOM): leuchte(0, 0, 0, 'l_rot', 0.003)

# ---------- Seitenkonsolen ----------
def cp_konsolen():
    zt = 2.60
    for s in (1, -1):
        y0, y1 = s * 0.345, s * 0.665
        # Körper: Kasten vom Boden bis zur Arbeitsfläche, Sockelleiste, Leuchtband
        prism('Seitenkonsole', [(s * 0.345, FL + 0.02), (s * 0.67, FL + 0.02), (s * 0.67, zt + 0.045), (s * 0.345, zt - 0.006)] if s > 0 else [(s * 0.67, FL + 0.02), (s * 0.345, FL + 0.02), (s * 0.345, zt - 0.006), (s * 0.67, zt + 0.045)], 1.93, 3.24, M['c_pult'], 'X', 0.012)
        box('Konsolensockel', 1.28, 0.02, 0.05, 2.59, s * 0.34, FL + 0.05, M['c_stahl'], 0.004)
        box('Konsolenlicht', 1.1, 0.006, 0.006, 2.59, s * 0.343, zt - 0.03, M['l_teal'], 0)
        for x in (2.0, 2.33, 2.66, 2.99): box('Konsolenfuge', 0.004, 0.006, 0.5, x, s * 0.343, FL + 0.3, M['c_ziffer'], 0)
        for k in range(3): box('Wartungsklappe', 0.26, 0.006, 0.3, 2.165 + k * 0.33, s * 0.3435, FL + 0.3, M['c_platte'], 0.003)
    # ---- links: Schub, Triebwerk, Treibstoff, Funk (u = nach vorn, v = nach außen) ----
    with Part('Konsole links', PF((2.49, 0.505, zt + 0.021), (1, 0, 0), (0, 0.9877, 0.1564)), C_ROOM):
        w = platte(0.2, -0.145, 0.545, 0.145, 'c_platte', 0.004, 0)
        schild('SCHUB', 0.37, 0.126, w, 0.0075)
        box('Schubkulisse', 0.26, 0.05, 0.004, 0.37, 0.0, w + 0.002, M['c_stahl'], 0.0015); box('Kulissenschlitz', 0.23, 0.014, 0.002, 0.37, 0.0, w + 0.0042, M['c_ziffer'], 0)
        for k, t in enumerate(('AUS', 'LEER', 'REISE', 'VOLL', 'NACHBR')):
            box('Rastmarke', 0.002, 0.012, 0.0008, 0.27 + k * 0.05, 0.034, w + 0.0004, M['txtw'], 0); schild(t, 0.27 + k * 0.05, 0.052, w, 0.0045)
        slab('Schubhebel', (0.4, 0.0, w + 0.045), (0.3, 0, 1), (0, 1, 0), (0.09, 0.012, 0.022), M['c_metall'], 0.004)
        cyl('Schubgriff', 0.021, 0.1, 0.415, -0.01, w + 0.098, M['c_knopf'], 'Y', n=20, bev=0.004)
        cyl('Griffkappe', 0.023, 0.012, 0.415, 0.044, w + 0.098, M['c_stahl'], 'Y', n=20, bev=0.003)
        for k in range(3): cyl('Daumentaste', 0.0055, 0.006, 0.39 + k * 0.016, -0.064, w + 0.106 - k * 0.004, M[('c_rot', 'c_taste', 'c_taste')[k]], 'Y', n=10, bev=0.001)
        box('Schubhut', 0.014, 0.014, 0.008, 0.432, -0.02, w + 0.118, M['c_taste'], 0.002); cyl('Hutstift', 0.004, 0.008, 0.432, -0.02, w + 0.124, M['c_stahl'], 'Z', n=8, bev=0)
        slab('Bremshebel', (0.3, -0.095, w + 0.03), (0.2, 0, 1), (0, 1, 0), (0.06, 0.008, 0.014), M['c_metall'], 0.003); cyl('Bremsknauf', 0.012, 0.03, 0.306, -0.095, w + 0.062, M['c_gelb'], 'Y', n=14, bev=0.003)
        schild('BREMSE', 0.3, -0.128, w, 0.005); knopf(0.5, -0.1, w, 0.011, 0.012); schild('REIBUNG', 0.5, -0.128, w, 0.0045)
        w = platte(0.55, -0.145, 0.745, 0.145, 'c_platte', 0.004, 0)
        schild('TRIMMUNG', 0.648, 0.126, w, 0.0068)
        for k, t in enumerate(('NICK', 'ROLL', 'GIER')): knopf(0.59 + k * 0.058, 0.06, w, 0.012, 0.012, ang=0.4 * k - 0.4); schild(t, 0.59 + k * 0.058, 0.03, w, 0.0046)
        for k, t in enumerate(('KLAPPE', 'HAKEN')): kipp(0.61 + k * 0.075, -0.05, w, 1 - 2 * k, lang=0.016); schild(t, 0.61 + k * 0.075, -0.085, w, 0.0046)
        leuchte(0.72, 0.1, w, 'l_gruen', 0.0034)
        w = platte(-0.03, -0.145, 0.195, 0.145, 'c_platte', 0.004, 0)
        schild('TRIEBWERK', 0.082, 0.126, w, 0.0075)
        for k in range(2): kipp(0.02 + k * 0.05, 0.06, w, -1, guard=True); schild('ZÜND %d' % (k + 1), 0.02 + k * 0.05, 0.022, w, 0.0048)
        for k, t in enumerate(('PUMPE', 'GEN', 'KÜHL')):
            kipp(0.012 + k * 0.045, -0.06, w, 1 if k != 1 else -1, lang=0.016); schild(t, 0.012 + k * 0.045, -0.093, w, 0.0046); leuchte(0.012 + k * 0.045, -0.025, w, ('l_gruen', 'l_gruen', 'l_bern')[k], 0.0032)
        rund(0.15, 0.03, w, 0.028, 0.5); schild('DREHZAHL', 0.15, -0.02, w, 0.0046)
        taste(0.15, -0.075, w, 0.04, 0.024, 'c_rahmen', 'l_gruen', 0.006); schild('START', 0.15, -0.105, w, 0.005)
        w = platte(-0.3, -0.145, -0.035, 0.145, 'c_platte', 0.004, 0)
        schild('TREIBSTOFF', -0.168, 0.126, w, 0.0075)
        knopf(-0.22, 0.04, w, 0.024, 0.02, ang=0.7); schild('TANKWAHL', -0.22, -0.012, w, 0.0048)
        for k, t in enumerate(('L', 'BEIDE', 'R')): schild(t, -0.262 + k * 0.042, 0.092, w, 0.0046)
        rund(-0.095, 0.045, w, 0.03, -0.7, 'l_weiss'); schild('MENGE', -0.095, -0.008, w, 0.0046)
        for k, t in enumerate(('ABLASS', 'QUER', 'RESERVE')):
            kipp(-0.25 + k * 0.075, -0.075, w, -1 if k == 0 else 1, guard=(k == 0), lang=0.016); schild(t, -0.25 + k * 0.075, -0.112, w, 0.0046)
        w = platte(-0.545, -0.145, -0.305, 0.145, 'c_platte', 0.004, 0)
        schild('FUNK', -0.425, 0.126, w, 0.0075)
        box('Funkrahmen', 0.13, 0.04, 0.008, -0.425, 0.082, w + 0.004, M['c_rahmen'], 0.002); schirm('Schirm Funk', 0.116, 0.028, -0.425, 0.082, w + 0.0084, 's_ufc')
        knopf(-0.5, 0.02, w, 0.013, 0.014, ang=-0.4); knopf(-0.35, 0.02, w, 0.013, 0.014, ang=1.0); schild('KANAL', -0.5, -0.012, w, 0.0046); schild('LAUT', -0.35, -0.012, w, 0.0046)
        for r in range(3):
            for c in range(4): taste(-0.47 + c * 0.03, -0.045 - r * 0.026, w, 0.022, 0.017, led='l_gruen' if (r, c) == (0, 0) else None)
        kipp(-0.425, 0.02, w, 1, lang=0.014)
    # ---- rechts: Seitenknüppel, Armauflage, Licht, Lebenserhaltung, Sicherungen (u = nach hinten, v = nach außen) ----
    with Part('Konsole rechts', PF((2.49, -0.505, zt + 0.021), (-1, 0, 0), (0, -0.9877, 0.1564)), C_ROOM):
        ux = lambda x: -(x - 2.49)
        w = platte(ux(3.235), -0.145, ux(3.04), 0.145, 'c_platte', 0.004, 0)
        schild('SENSOREN', ux(3.137), 0.126, w, 0.0068)
        rund(ux(3.17), 0.045, w, 0.03, 0.3, 'l_weiss'); knopf(ux(3.09), 0.05, w, 0.014, 0.014, ang=0.6); schild('BEREICH', ux(3.09), 0.014, w, 0.0046)
        for k, t in enumerate(('RADAR', 'IR', 'STÖR')): taste(ux(3.2) + k * 0.062, -0.07, w, 0.04, 0.022, 'c_rahmen', ('l_gruen', None, 'l_bern')[k], 0.005); schild(t, ux(3.2) + k * 0.062, -0.1, w, 0.0046)
        w = platte(ux(3.035), -0.145, ux(2.64), 0.145, 'c_platte', 0.004, 0)
        sx_ = ux(2.8)
        cyl('Knueppelsockel', 0.05, 0.016, sx_, -0.03, w + 0.008, M['c_stahl'], 'Z', n=24, bev=0.003)
        cyl('Knueppelbalg', 0.043, 0.04, sx_, -0.03, w + 0.036, M['rubber'], 'Z', n=24, bev=0.004, r2=0.02)
        for k in range(3): cyl('Balgfalte', 0.04 - k * 0.007, 0.004, sx_, -0.03, w + 0.022 + k * 0.011, M['rubber'], 'Z', n=24, bev=0.0015)
        rod('Knueppelschaft', (sx_, -0.03, w + 0.05), (sx_ - 0.012, -0.03, w + 0.1), 0.011, M['c_stahl'], 14)
        g0 = Vector((sx_ - 0.012, -0.03, w + 0.09)); gd = Vector((-0.16, 0.0, 1.0)).normalized()
        rod('Knueppelgriff', g0, g0 + gd * 0.115, 0.02, M['c_knopf'], 18, r2=0.017)
        cyl('Handauflage', 0.03, 0.01, g0.x, g0.y, g0.z + 0.004, M['c_knopf'], 'Z', n=20, bev=0.003)
        hd = g0 + gd * 0.13
        slab('Griffkopf', hd, (1, 0, 0.16), (0, 1, 0), (0.05, 0.042, 0.04), M['c_knopf'], 0.008)
        slab('Abzug', hd + Vector((-0.03, 0, -0.03)), (1, 0, 0.16), (0, 1, 0), (0.012, 0.014, 0.034), M['c_rot'], 0.003)
        cyl('Kopfhut', 0.008, 0.008, hd.x + 0.004, hd.y - 0.008, hd.z + 0.024, M['c_taste'], 'Z', n=10, bev=0.001); cyl('Hutknopf', 0.0045, 0.006, hd.x + 0.004, hd.y - 0.008, hd.z + 0.031, M['c_stahl'], 'Z', n=8, bev=0)
        cyl('Kopftaste', 0.006, 0.006, hd.x - 0.012, hd.y + 0.01, hd.z + 0.023, M['c_rot'], 'Z', n=10, bev=0.001); cyl('Kopftaste', 0.006, 0.006, hd.x + 0.016, hd.y + 0.012, hd.z + 0.022, M['c_gelb'], 'Z', n=10, bev=0.001)
        slab('Kleinfingerhebel', g0 + gd * 0.03 + Vector((-0.024, 0, 0)), (0.2, 0, 1), (0, 1, 0), (0.05, 0.012, 0.008), M['c_metall'], 0.002)
        schild('STEUER', sx_, 0.122, w, 0.0075)
        for k, t in enumerate(('TRIMM', 'AUTO')): taste(sx_ - 0.03 + k * 0.06, 0.085, w, 0.036, 0.02, 'c_rahmen', 'l_gruen' if k else None, 0.005); schild(t, sx_ - 0.03 + k * 0.06, 0.06, w, 0.0046)
        for k in range(3): knopf(ux(3.0) + k * 0.038, -0.11, w, 0.011, 0.012, ang=0.3 * k, skala=False)
        schild('TAFEL  KABINE  FLUT', ux(3.0) + 0.038, -0.134, w, 0.0044)
        # Armauflage
        w = platte(ux(2.635), -0.145, ux(2.3), 0.145, 'c_platte', 0.004, 0)
        box('Armauflagetraeger', 0.28, 0.1, 0.03, ux(2.46), -0.05, w + 0.015, M['c_stahl'], 0.006)
        box('Armauflage', 0.3, 0.115, 0.03, ux(2.46), -0.05, w + 0.043, M['c_bezug'], 0.012)
        schild('SICHERUNGEN', ux(2.46), 0.128, w, 0.0062)
        for r in range(2):
            for c in range(9): sicherung(ux(2.6) + c * 0.033, 0.098 - r * 0.036, w)
        w = platte(ux(2.295), -0.145, ux(1.945), 0.145, 'c_platte', 0.004, 0)
        schild('LEBENSERHALTUNG', ux(2.12), 0.126, w, 0.0068)
        rund(ux(2.2), 0.045, w, 0.032, 1.1); schild('SAUERSTOFF', ux(2.2), -0.012, w, 0.0046)
        rund(ux(2.07), 0.045, w, 0.026, -0.4, 'l_weiss'); schild('DRUCK', ux(2.07), -0.008, w, 0.0046)
        slab('Sauerstoffhebel', (ux(2.24), -0.075, w + 0.018), (0.5, 0, 1), (0, 1, 0), (0.05, 0.014, 0.01), M['c_gelb'], 0.003); schild('100 %', ux(2.24), -0.112, w, 0.0046)
        for k, t in enumerate(('HEIZ', 'DRUCK', 'NOT')):
            kipp(ux(2.14) + k * 0.05, -0.072, w, 1 if k < 2 else -1, guard=(k == 2), lang=0.016); schild(t, ux(2.14) + k * 0.05, -0.112, w, 0.0046)
    # ---- Seitenwände über den Konsolen ----
    # links: Kanzelhebel, Notabwurfgriff, Leselampe am Schwanenhals, Kartentasche
    yl = lambda x: yi_of(x) - 0.03
    with Part('Kanzelhebel', PF((2.86, yl(2.86), 2.755), (1, 0, 0), (0, 0, 1)), C_ROOM):
        box('Hebelplatte', 0.16, 0.1, 0.006, 0, 0, 0.003, M['c_platte'], 0.002)
        for a in (-0.07, 0.07):
            for b in (-0.04, 0.04): schr(a, b, 0.006)
        slab('Kanzelhebel', (0.0, 0.0, 0.03), (1, 0.35, 0), (0, 0, 1), (0.13, 0.024, 0.014), M['c_metall'], 0.004)
        cyl('Hebelgriff', 0.014, 0.07, 0.07, 0.025, 0.045, M['warnrw'], 'Z', n=16, bev=0.003); cyl('Hebelachse', 0.012, 0.03, -0.055, -0.02, 0.02, M['c_stahl'], 'Z', n=14, bev=0.002)
        schild('KANZEL', 0, -0.038, 0.006, 0.007); schild('AUF', 0.06, 0.036, 0.006, 0.005); schild('ZU', -0.06, 0.036, 0.006, 0.005)
    with Part('Kanzelabwurf', PF((2.3, yl(2.3), 2.79), (1, 0, 0), (0, 0, 1)), C_ROOM):
        box('Abwurfplatte', 0.14, 0.09, 0.005, 0, 0, 0.0025, M['warnrw'], 0.002)
        pipe('Abwurfgriff', [Vector((-0.04, 0, 0.005)), Vector((-0.04, 0, 0.04)), Vector((0.04, 0, 0.04)), Vector((0.04, 0, 0.005))], 0.007, M['c_gelb'], 0.012)
        schild('KANZELABWURF', 0, -0.03, 0.005, 0.0058, 'txtd')
    pipe('Leselampe', [Vector((2.62, yl(2.62), 2.84)), Vector((2.62, yl(2.62) - 0.05, 2.9)), Vector((2.68, yl(2.62) - 0.1, 2.9)), Vector((2.74, yl(2.62) - 0.12, 2.86))], 0.006, M['c_stahl'], 0.03)
    cyl('Lampenkopf', 0.018, 0.04, 2.755, yl(2.62) - 0.123, 2.85, M['c_knopf'], 'X', n=14, bev=0.004, r2=0.012)
    box('Kartentasche', 0.3, 0.02, 0.13, 2.02, yi_of(2.02) - 0.03, 2.7, M['c_bezug'], 0.008); box('Taschenlasche', 0.3, 0.006, 0.03, 2.02, yi_of(2.02) - 0.043, 2.77, M['gurt'], 0.002)
    for x, s_ in ((3.18, 1), (3.18, -1), (2.45, 1), (2.42, -1)):      # Lüfterdüsen an beiden Wänden
        with Part('Luefterduese', PF((x, s_ * (yi_of(x) - 0.03), sill_z(x) - 0.075), (s_, 0, 0), (0, 0, 1)), C_ROOM): duese(0, 0, 0)
    with Part('Aussenlicht', PF((3.45, yl(3.45), sill_z(3.45) - 0.08), (1, 0, 0), (0, 0, 1)), C_ROOM):
        box('Lichtplatte', 0.18, 0.1, 0.006, 0, 0, 0.003, M['c_platte'], 0.002)
        for k, t in enumerate(('NAV', 'BLITZ', 'FORM')): kipp(-0.055 + k * 0.055, 0.004, 0.006, 1 if k != 1 else -1, lang=0.014); schild(t, -0.055 + k * 0.055, -0.034, 0.006, 0.0048)
        schild('AUSSENLICHT', 0, 0.036, 0.006, 0.0055)
    with Part('Plaketten links', PF((2.05, yl(2.05), 2.86), (1, 0, 0), (0, 0, 1)), C_ROOM):
        plakette('SITZ SCHARF – GRIFF NICHT BERÜHREN', 0.0, 0.0, 0, 0.005, True); plakette('MIL-07 · BASTION WERFT 3', 0.52, -0.005, 0, 0.0045)
    box('Funkgeraet', 0.2, 0.05, 0.09, 1.82, yi_of(1.82) - 0.045, 2.8, M['c_rahmen'], 0.008)
    for k in range(3): cyl('Funkstecker', 0.008, 0.02, 1.76 + k * 0.05, yi_of(1.82) - 0.075, 2.8, M['c_metall'], 'Y', n=10, bev=0.002)
    # rechts: Sauerstoffanschluss mit Schlauch, Datenschacht, Notlichtschalter
    with Part('Plaketten rechts', PF((3.35, -(yi_of(3.35) - 0.03), sill_z(3.35) - 0.07), (-1, 0, 0), (0, 0, 1)), C_ROOM):
        plakette('HÖCHSTFAHRT 190 M/S', 0.0, 0.02, 0, 0.005); plakette('KANZEL IM FLUG VERRIEGELT HALTEN', 0.0, -0.012, 0, 0.0045, True)
    box('Notpumpe', 0.12, 0.05, 0.07, 1.85, -(yi_of(1.85) - 0.045), 2.79, M['c_stahl'], 0.008); rod('Pumpenhebel', (1.88, -(yi_of(1.85) - 0.08), 2.8), (2.02, -(yi_of(1.85) - 0.1), 2.84), 0.007, M['c_gelb'], 12)
    yr = lambda x: -(yi_of(x) - 0.03)
    with Part('Sauerstoffanschluss', PF((2.1, yr(2.1), 2.78), (-1, 0, 0), (0, 0, 1)), C_ROOM):
        box('Anschlussplatte', 0.12, 0.1, 0.006, 0, 0, 0.003, M['c_platte'], 0.002)
        cyl('Anschluss', 0.022, 0.03, 0.0, 0.0, 0.02, M['c_metall'], 'Z', n=18, bev=0.003); cyl('Ueberwurf', 0.027, 0.012, 0, 0, 0.034, M['c_stahl'], 'Z', n=6, bev=0.002)
        schild('SAUERSTOFF', 0, -0.04, 0.006, 0.0055)
    pipe('Sauerstoffschlauch', [Vector((2.1, yr(2.1) + 0.04, 2.78)), Vector((2.1, yr(2.1) + 0.12, 2.7)), Vector((2.18, -0.34, 2.56)), Vector((2.3, -0.3, 2.5))], 0.012, M['rubber'], 0.05)
    with Part('Datenschacht', PF((2.62, yr(2.62), 2.77), (-1, 0, 0), (0, 0, 1)), C_ROOM):
        box('Schachtrahmen', 0.2, 0.11, 0.02, 0, 0, 0.01, M['c_rahmen'], 0.004)
        box('Schachtschlitz', 0.12, 0.012, 0.002, -0.02, 0.022, 0.021, M['c_ziffer'], 0); box('Datentraeger', 0.1, 0.008, 0.02, -0.02, 0.022, 0.03, M['c_orange'], 0.002)
        schirm('Schirm Daten', 0.1, 0.026, -0.02, -0.022, 0.0204, 's_ufc'); taste(0.07, 0.022, 0.02, 0.022, 0.016, led='l_gruen'); taste(0.07, -0.022, 0.02, 0.022, 0.016)
        schild('DATEN', 0, -0.048, 0.02, 0.0055)
    with Part('Notlicht', PF((3.0, yr(3.0), 2.74), (-1, 0, 0), (0, 0, 1)), C_ROOM):
        box('Notlichtplatte', 0.12, 0.09, 0.006, 0, 0, 0.003, M['c_platte'], 0.002); kipp(-0.03, 0.0, 0.006, -1, guard=True); knopf(0.03, 0.0, 0.006, 0.012, 0.012, skala=False)
        schild('NOTSTROM', -0.03, -0.034, 0.006, 0.005); schild('LÜFTER', 0.03, -0.034, 0.006, 0.005)

# ---------- Kanzel innen (hängt an der Kanzel): Spiegel, Griffe, Notkompass ----------
def cp_kanzel_innen():
    with Gruppe('kanzel'):
        CUR[0] = C_ROOM
        xb = 4.18
        for a, w_ in ((PI * 0.5, 0.16), (PI * 0.3, 0.1), (PI * 0.7, 0.1)):
            p = canopy_pt(xb - 0.05, a, -0.05)
            slab('Rueckspiegel', p, (0, 1, 0) if abs(a - PI / 2) < 0.1 else (0.15 * (1 if a < PI / 2 else -1), 1, 0), (0, 0, 1), (w_, 0.04, 0.012), M['c_rahmen'], 0.004)
            slab('Spiegelglas', p + Vector((-0.007, 0, 0)), (0, 1, 0) if abs(a - PI / 2) < 0.1 else (0.15 * (1 if a < PI / 2 else -1), 1, 0), (0, 0, 1), (w_ - 0.012, 0.03, 0.002), M['chrom'], 0.0)
        p = canopy_pt(xb - 0.02, PI * 0.5, -0.11)
        cyl('Notkompass', 0.026, 0.04, p.x, p.y, p.z, M['c_rahmen'], 'X', n=18, bev=0.004); cyl('Kompassglas', 0.021, 0.004, p.x - 0.021, p.y, p.z, M['l_bern'], 'X', n=16, bev=0)
        for s in (1, -1):      # Haltegriffe am vorderen Bügel
            aa = [PI * 0.5 - s * a for a in (0.62, 0.7, 0.98, 1.06)]
            pts = [canopy_pt(xb, a, -0.02) for a in aa]
            for k in (1, 2): pts[k] = pts[k] + Vector((-0.045, 0, 0)) + (Vector((xb, 0, 3.0)) - pts[k]).normalized() * 0.02
            pipe('Kanzelgriff innen', pts, 0.007, M['c_gelb'], 0.015)

def cockpit():
    cp_wanne(); cp_sitz(); cp_tafel(); cp_blendschutz(); cp_konsolen(); cp_kanzel_innen()
    CUR[0] = C_ROOM
    area('Cockpitlicht', (2.9, 0, 3.5), (0, 0, 0), 0.7, 0.5, 60, (0.85, 0.9, 1.0))
    ANCH['sitz'] = Vector((2.28, 0, FL + 0.9)); ANCH['auge'] = AUGE.copy()
