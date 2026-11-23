# Rundhalle: Leben in der Halle (23.11.2026, Wunsch des Spielers: „noch ein wenig langweilig, sehr steril“).
# Läuft nach rh_deck.py im selben Namensraum (rh_lauf.py und rh_back_lauf.py erledigen das). Die Halle soll aussehen wie ein Ort, an dem seit
# 38 Jahren Menschen leben, nicht wie ein neues Kaufhaus:
#   Markt am Eingang:  drei Stände (Hydroponik, Teile und Tausch, Garküche) mit Stoffdach, Lichterkette, Ware, Kisten, Stromkabel zur Wand
#   Banner:            sechs Stoffbahnen unter den Radialbalken mit Sätzen aus dem Eid
#   Arbeitsstelle:     offene Bodenluke mit Absperrung, Baustrahler, Werkzeug, Kabeltrommel
#   Spuren:            abgetretene Laufwege, Flecken an Ständen und Luke, Rost an den Pfeilerfüßen
#   Licht:             weniger, wärmeres Grundlicht; warmes Licht über dem Treffpunkt; Farbschein der Läden vor jeder Bucht;
#                      Fluter am Fuß der Pfeiler; die Stände leuchten warm aus sich heraus
# Koordinaten wie in rh_kit.py (Hallenmitte im Ursprung, Winkel in Grad gegen den Uhrzeiger, 0 = Osten, Korridor bei 180°).

M['stoff_rot'] = mk('Stoff rot', (0.2, 0.035, 0.025), 0.0, 0.92, var=0.22, bump=0.35, bscale=420.0, grime=False)
M['stoff_petrol'] = mk('Stoff petrol', (0.015, 0.1, 0.11), 0.0, 0.92, var=0.22, bump=0.35, bscale=420.0, grime=False)
M['stoff_sand'] = mk('Stoff sand', (0.3, 0.24, 0.15), 0.0, 0.92, var=0.2, bump=0.35, bscale=420.0, grime=False)
M['stoff_dunkel'] = mk('Stoff dunkel', (0.03, 0.033, 0.04), 0.0, 0.92, var=0.2, bump=0.35, bscale=420.0, grime=False)
M['plane'] = mk('Plane oliv', (0.07, 0.085, 0.05), 0.0, 0.8, var=0.25, bump=0.3, bscale=300.0, wear=0.4)
M['druck'] = mk('Druckfarbe hell', (0.6, 0.56, 0.46), 0.0, 0.85, var=0.1, grime=False)
M['kiste_gruen'] = mk('Kiste gruen', (0.03, 0.1, 0.05), 0.0, 0.6, var=0.2, wear=0.6)
M['kiste_blau'] = mk('Kiste blau', (0.02, 0.05, 0.12), 0.0, 0.6, var=0.2, wear=0.6)
M['holz'] = mk('Brett', (0.14, 0.085, 0.045), 0.0, 0.75, var=0.3, bump=0.3, wear=0.5)
M['gemuese'] = mk('Gemuese gruen', (0.04, 0.2, 0.03), 0.0, 0.5, var=0.4, grime=False)
M['tomate'] = mk('Tomate', (0.32, 0.035, 0.02), 0.0, 0.3, var=0.3, grime=False)
M['knolle'] = mk('Knolle', (0.22, 0.15, 0.07), 0.0, 0.8, var=0.35, grime=False)
M['sack'] = mk('Sackleinen', (0.2, 0.16, 0.1), 0.0, 0.95, var=0.25, bump=0.5, bscale=380.0)
M['kabel'] = mk('Kabel', (0.012, 0.012, 0.013), 0.0, 0.55, var=0.05, grime=False)
M['birne'] = mk('Gluehbirne', (1.0, 0.8, 0.55), 0.0, 0.2, var=0, rvar=0, emit=(1.0, 0.68, 0.38), es=7.0, grime=False)
M['herd'] = mk('Herdplatte', (0.3, 0.06, 0.01), 0.3, 0.4, var=0, rvar=0, emit=(1.0, 0.25, 0.04), es=1.2, grime=False)
M['schacht'] = mk('Schachtdunkel', (0.002, 0.002, 0.0025), 0.0, 0.95, var=0.05, grime=False)
M['tafel'] = mk('Kreidetafel', (0.02, 0.025, 0.022), 0.0, 0.9, var=0.15)
M['kreide'] = mk('Kreide', (0.7, 0.7, 0.66), 0.0, 0.9, var=0.1, grime=False)
WARMW = (1.0, 0.78, 0.52)

def kugel(name, r, x, y, z, m, sub=1, sq=(1, 1, 1)):      # kleine Kugel (Ware, Glühbirnen)
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z); ob.scale = sq; return ob
def tuch(name, pts, m, nu=1, nv=8, sag=0.0, solid=0.006):      # Stoffbahn zwischen vier Eckpunkten (a b oben, c d unten), v-Richtung durchhängend
    a, b, c, d = (Vector(p) for p in pts); bm = bmesh.new(); V = []
    for i in range(nu + 1):
        u = i / nu; row = []
        for j in range(nv + 1):
            v = j / nv; p = (a.lerp(b, u)).lerp(d.lerp(c, u), v); p.z -= sag * 4 * v * (1 - v); row.append(bm.verts.new(p))
        V.append(row)
    for i in range(nu):
        for j in range(nv): bm.faces.new((V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me))
    if solid: so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = solid; so.offset = 0
    return ob
def lichterkette(a, b, n, sag=0.12, r=0.03):      # Kabel mit Glühbirnen, durchhängend
    a, b = Vector(a), Vector(b); cable(a, b, 0.006, M['kabel'], sag=sag, n=16, name='Lichterkette')
    for k in range(n):
        t = (k + 0.5) / n; p = a.lerp(b, t); p.z -= sag * 4 * t * (1 - t)
        cyl('Fassung', 0.012, 0.03, p.x, p.y, p.z - 0.02, M['frame'], 'Z', n=8, bev=0)
        kugel('Glühbirne', r, p.x, p.y, p.z - 0.055, M['birne'], 1, (1, 1, 1.25))

# =====================================================================================
# Marktstand (Ursprung am Boden; Kundenseite nach −x, also zur Hallenmitte, wenn polar gesetzt; Breite längs y)
# =====================================================================================
STAND_W, STAND_D = 3.0, 1.9
def n_stand(kind):
    hw, x0, x1 = STAND_W / 2, -STAND_D / 2, STAND_D / 2; R = random.Random({'gemuese': 3, 'teile': 7, 'imbiss': 11}[kind])
    stoffe = {'gemuese': ('stoff_petrol', 'stoff_sand'), 'teile': ('stoff_dunkel', 'stoff_sand'), 'imbiss': ('stoff_rot', 'stoff_sand')}[kind]
    zf, zb = 2.3, 2.65      # Dachkante vorn und hinten
    # Gestell aus Vierkantrohr
    for (x, z) in ((x0, zf), (x1, zb)):
        for sy in (-1, 1):
            box('Standpfosten', 0.06, 0.06, z, x, sy * hw, z / 2, M['steel'], 0.006); box('Pfostenfuß', 0.22, 0.22, 0.02, x, sy * hw, 0.01, M['frame'], 0.004)
    for sy in (-1, 1): pipe('Dachträger', [(x1, sy * hw, zb), (x0 - 0.25, sy * hw, zf - 0.12)], 0.02, M['steel'])
    pipe('Firstrohr', [(x1, -hw, zb), (x1, hw, zb)], 0.02, M['steel']); pipe('Frontrohr', [(x0 - 0.25, -hw, zf - 0.12), (x0 - 0.25, hw, zf - 0.12)], 0.02, M['steel'])
    # Stoffdach in Bahnen zwei Farben, vorn eine Blende mit Bogenkante
    n = 6
    for k in range(n):
        y0, y1 = -hw + STAND_W * k / n, -hw + STAND_W * (k + 1) / n; m = M[stoffe[k % 2]]
        tuch('Standdach', [(x1 + 0.05, y0, zb + 0.03), (x1 + 0.05, y1, zb + 0.03), (x0 - 0.3, y1, zf - 0.1), (x0 - 0.3, y0, zf - 0.1)], m, 1, 8, sag=0.07)
        tuch('Dachblende', [(x0 - 0.3, y0, zf - 0.1), (x0 - 0.3, y1, zf - 0.1), (x0 - 0.3, y1, zf - 0.38), (x0 - 0.3, y0, zf - 0.38)], m, 1, 2, 0.0)
        kugel('Blendenbogen', (y1 - y0) / 2, x0 - 0.3, (y0 + y1) / 2, zf - 0.38, m, 2, (0.02, 1, 0.5))
    # Rückwand und Seiten aus Plane
    tuch('Rückplane', [(x1 + 0.03, -hw, zb - 0.05), (x1 + 0.03, hw, zb - 0.05), (x1 + 0.03, hw, 0.05), (x1 + 0.03, -hw, 0.05)], M['plane'], 6, 6, 0.0)
    for sy in (-1, 1): tuch('Seitenplane', [(x1, sy * hw, zb - 0.05), (x0 + 0.5, sy * hw, zf - 0.1), (x0 + 0.5, sy * hw, 1.1), (x1, sy * hw, 1.1)], M['plane'], 4, 4, 0.0)
    # Lichterkette an der Dachkante, Arbeitslicht unter dem Dach
    lichterkette((x0 - 0.33, -hw - 0.05, zf - 0.42), (x0 - 0.33, hw + 0.05, zf - 0.42), 9, 0.14)
    for sy in (-1, 1): cable((x0 - 0.33, sy * (hw + 0.05), zf - 0.42), (x0 - 0.25, sy * hw, zf - 0.12), 0.006, M['kabel'], 0.02)
    box('Standleuchte', 0.12, 2.0, 0.05, x1 - 0.3, 0, zb - 0.22, M['frame'], 0.006); box('Leuchtfeld', 0.08, 1.9, 0.01, x1 - 0.3, 0, zb - 0.25, M['e_warmp'], 0)
    area('Standlicht', (x0 + 0.3, 0, zf - 0.25), (0, 0, 0), 1.2, STAND_W - 0.4, 55, WARMW)
    # Stromkabel nach hinten (in der Halle läuft es über den Boden zur Wand, siehe stromleitung)
    pipe('Standkabel', [(x1 - 0.1, hw - 0.1, zb - 0.3), (x1 + 0.08, hw - 0.1, zb - 0.3), (x1 + 0.08, hw - 0.1, 0.02), (x1 + 0.6, hw - 0.3, 0.012)], 0.012, M['kabel'], 0.05)
    box('Verteilerdose', 0.12, 0.2, 0.26, x1 - 0.06, hw - 0.18, 1.6, M['platey'], 0.008)
    if kind in ('gemuese', 'teile'):
        # Auslage: Tisch aus Böcken und Brettern, schräge Kisten darauf
        for sy in (-1, 1): box('Bock', 0.5, 0.06, 0.78, x0 + 0.35, sy * (hw - 0.3), 0.39, M['frame'], 0.006)
        box('Auslagebrett', 0.75, STAND_W - 0.2, 0.04, x0 + 0.35, 0, 0.8, M['holz'], 0.004)
        box('Preisleiste', 0.012, STAND_W - 0.3, 0.09, x0 - 0.03, 0, 0.74, M['tafel'], 0.002)
        for k in range(4):
            y = -hw + 0.55 + k * (STAND_W - 1.1) / 3
            text(('1,20', '0,80', '2,50', '0,60')[k] if kind == 'gemuese' else ('3,00', '12', 'TAUSCH', '5,00')[k], 0.045, (x0 - 0.037, y, 0.722), RIGHT_X, RIGHT_Y, M['kreide'], align='CENTER')
        for k in range(5):
            y = -hw + 0.4 + k * (STAND_W - 0.8) / 4
            box('Auslagekiste', 0.55, 0.45, 0.16, x0 + 0.35, y, 0.9, M['kiste_gruen' if kind == 'gemuese' else 'kiste_blau'], 0.012, (0, RAD(-12), 0))
            if kind == 'gemuese':
                mm, rr = [(M['tomate'], 0.04), (M['gemuese'], 0.06), (M['knolle'], 0.045), (M['gemuese'], 0.05), (M['tomate'], 0.035)][k]
                for q in range(9):
                    px, py = x0 + 0.35 + (q % 3 - 1) * 0.15, y + (q // 3 - 1) * 0.13
                    kugel('Ware', rr * R.uniform(0.85, 1.15), px, py, 0.99 + (px - x0 - 0.35) * -0.2 + R.uniform(0, 0.02), mm, 1, (1, 1, 0.9 if mm is M['gemuese'] else 1))
            else:
                for q in range(6):
                    px, py = x0 + 0.35 + (q % 3 - 1) * 0.15, y + (q // 3 - 0.5) * 0.18
                    if q % 2: cyl('Zahnrad', 0.05, 0.02, px, py, 1.0, M['steel'], 'Z', n=12, bev=0)
                    else: box('Teil', 0.1, 0.06, 0.05, px, py, 1.0, M['frame' if q % 3 else 'copper'], 0.006, (0, 0, R.uniform(0, 3)))
        # hinten: Kistenstapel, Säcke oder Werkzeugwand
        for k in range(3):
            box('Kiste hinten', 0.5, 0.6, 0.38, x1 - 0.35, -hw + 0.5 + k * 0.7, 0.19, M['crate'], 0.012, (0, 0, R.uniform(-0.1, 0.1)))
            if k != 1: box('Kiste oben', 0.45, 0.55, 0.3, x1 - 0.35, -hw + 0.5 + k * 0.7, 0.53, M['kiste_gruen' if kind == 'gemuese' else 'kiste_blau'], 0.012, (0, 0, R.uniform(-0.15, 0.15)))
        if kind == 'gemuese':
            for (sx_, sy_, rr) in ((x1 - 0.3, hw - 0.35, 0.2), (x1 - 0.65, hw - 0.3, 0.18), (x0 + 0.95, -hw + 0.3, 0.17)): cyl('Sack', rr, 0.55, sx_, sy_, 0.28, M['sack'], 'Z', n=14, bev=0.06)
            box('Schild', 0.03, 1.6, 0.34, x0 - 0.31, 0, zf, M['druck'], 0.006)
            text('FRISCH AUS DER HYDROPONIK', 0.075, (x0 - 0.33, 0, zf - 0.04), RIGHT_X, RIGHT_Y, M['txtd'], align='CENTER')
            for q in range(3): kugel('Salatkopf', 0.11, x1 - 0.7, -0.5 + q * 0.3, 1.18, M['gemuese'], 2, (1, 1, 0.75))
        else:
            box('Werkzeugwand', 0.03, 1.8, 0.9, x1 - 0.03, 0, 1.55, M['grate'], 0.004)
            for k in range(7):
                y = -0.75 + k * 0.25
                if k % 2: pipe('Werkzeug', [(x1 - 0.06, y, 1.85), (x1 - 0.06, y, 1.45)], 0.012, M['steel'])
                else: box('Zange', 0.02, 0.06, 0.25, x1 - 0.06, y, 1.6, M['red' if k % 4 else 'frame'], 0.004)
            ring('Kabelrolle', 0.2, 0.03, (x1 - 0.25, 0.4, 1.15), (1, 0, 0), M['ochre'], 20)
            box('Schild', 0.03, 1.5, 0.34, x0 - 0.31, 0, zf, M['druck'], 0.006)
            text('TEILE · TAUSCH · REPARATUR', 0.072, (x0 - 0.33, 0, zf - 0.04), RIGHT_X, RIGHT_Y, M['txtd'], align='CENTER')
    else:
        # Garküche: Theke mit Kochfeld, Töpfen, Schalen; Kreidetafel; zwei Hocker davor
        box('Kochtheke', 0.7, STAND_W - 0.2, 0.9, x0 + 0.35, 0, 0.45, M['cab'], 0.01); box('Thekenplatte', 0.8, STAND_W - 0.1, 0.04, x0 + 0.33, 0, 0.92, M['steel'], 0.006)
        box('Kochfeld', 0.45, 0.9, 0.03, x0 + 0.42, -0.6, 0.95, M['herd'], 0.004)
        for (py, rr, hh) in ((-0.82, 0.16, 0.24), (-0.38, 0.13, 0.18)):
            cyl('Topf', rr, hh, x0 + 0.42, py, 0.96 + hh / 2, M['steel'], 'Z', n=20, bev=0.006); ring('Topfrand', rr, 0.008, (x0 + 0.42, py, 0.96 + hh), (0, 0, 1), M['steel'], 20)
            cyl('Suppe', rr - 0.01, 0.005, x0 + 0.42, py, 0.94 + hh, M['knolle'], 'Z', n=20, bev=0)
        for q in range(5): cyl('Schale', 0.07, 0.05, x0 + 0.2, 0.3 + (q % 3) * 0.16, 0.97 + (q // 3) * 0.05, M['white'], 'Z', n=14, bev=0.004)
        for q in range(3): cyl('Becher', 0.035, 0.1, x0 + 0.15, 0.85 + q * 0.09, 0.99, M['ochre' if q % 2 else 'white'], 'Z', n=10, bev=0.003)
        box('Tafel', 0.04, 0.8, 0.6, x1 - 0.05, -0.6, 1.6, M['tafel'], 0.006); box('Tafelrahmen', 0.05, 0.84, 0.64, x1 - 0.03, -0.6, 1.6, M['holz'], 0.006)
        for i, s in enumerate(('EINTOPF   4', 'NUDELN    5', 'TEE       1', 'BROT      2')): text(s, 0.055, (x1 - 0.075, -0.6, 1.78 - i * 0.11), RIGHT_X, RIGHT_Y, M['kreide'], align='CENTER')
        box('Regal', 0.3, 1.2, 0.04, x1 - 0.2, 0.6, 1.5, M['holz'], 0.004)
        for q in range(5): cyl('Dose', 0.04, 0.12, x1 - 0.2, 0.15 + q * 0.2, 1.58, M['copper' if q % 2 else 'red'], 'Z', n=10, bev=0.003)
        for py in (-0.7, 0.4): inst(prop('rh_hocker'), (x0 - 0.45, py, 0), 0.0)
        box('Schild', 0.03, 1.2, 0.34, x0 - 0.31, 0, zf, M['druck'], 0.006)
        text('GARKÜCHE', 0.1, (x0 - 0.33, 0, zf - 0.05), RIGHT_X, RIGHT_Y, M['txtd'], align='CENTER')
        point('Herdschein', (x0 + 0.45, -0.6, 1.25), 15, (1.0, 0.45, 0.15), 0.1)

# =====================================================================================
# Banner: Stoffbahn am Radialbalken (Ursprung an der Aufhängung; Bahn quer zum Balken, also zur Hallenmitte und zur Wand gewandt)
# =====================================================================================
BAN_W, BAN_H = 1.5, 3.9
def n_banner(stoff, lines, emb=True):
    hw = BAN_W / 2; m = M[stoff]
    pipe('Bannerstange', [(0, -hw - 0.1, -0.25), (0, hw + 0.1, -0.25)], 0.022, M['steel'])
    for sy in (-1, 1): pipe('Bannerseil', [(0, sy * (hw - 0.1), -0.25), (0, sy * 0.1, 0.0)], 0.006, M['steel'])
    box('Bannerklemme', 0.12, 0.3, 0.06, 0, 0, 0.0, M['frame'], 0.006)
    tuch('Banner', [(0, -hw, -0.28), (0, hw, -0.28), (0, hw, -0.28 - BAN_H), (0, -hw, -0.28 - BAN_H)], m, 4, 10, 0.0, 0.004)
    pipe('Bannergewicht', [(0, -hw - 0.04, -0.3 - BAN_H), (0, hw + 0.04, -0.3 - BAN_H)], 0.018, M['frame'])
    for side in (-1, 1):      # Vorder- und Rückseite gleich bedruckt
        x = side * 0.0045; xd = (0, side, 0)      # Schrift schaut nach außen (Seite +x bzw. −x)
        for sy in (-1, 1): box('Bannersaum', 0.002, 0.06, BAN_H - 0.1, x + side * 0.0005, sy * (hw - 0.09), -0.28 - BAN_H / 2, M['druck'], 0)
        box('Bannersaum', 0.002, BAN_W - 0.12, 0.05, x + side * 0.0005, 0, -0.42, M['druck'], 0); box('Bannersaum', 0.002, BAN_W - 0.12, 0.05, x + side * 0.0005, 0, -0.15 - BAN_H, M['druck'], 0)
        if emb: emblem((x + side * 0.001, 0, -1.05), xd, (0, 0, 1), 0.42, M['druck'])
        n_ = len(lines); size = 0.25 if max(len(s) for s in lines) < 8 else 0.21 if max(len(s) for s in lines) < 10 else 0.18
        for i, s in enumerate(lines):
            text(s, size, (x + side * 0.0012, 0, -2.45 - (i - (n_ - 1) / 2) * size * 1.45 - (0 if emb else -0.6) - size * 0.35), xd, (0, 0, 1), M['druck'], align='CENTER')
BANNER = [(30, 'stoff_petrol', ['WIR SIND', 'DIE LETZTE', 'CREW']), (90, 'stoff_rot', ['NIEMAND', 'KOMMT', 'UNS HOLEN']), (150, 'stoff_sand', ['BASTION', 'JAHR 38']),
          (-150, 'stoff_petrol', ['SCHIFF', 'FÜR', 'SCHIFF']), (-90, 'stoff_rot', ['KEINER', 'WIRD', 'ZURÜCK-', 'GELASSEN']), (-30, 'stoff_sand', ['HEIMSTATT', 'DECK 3'])]

# =====================================================================================
# Arbeitsstelle: offene Bodenluke mit Absperrung, Baustrahler, Werkzeug (polar gesetzt, Ursprung Mitte der Luke)
# =====================================================================================
def n_arbeit():
    # Der Hallenboden ist ein Stück: Die Öffnung ist eine fast schwarze Fläche im Lukenrahmen (aus Augenhöhe liest sie sich als Schacht)
    for (x, y, sx, sy) in ((0.6, 0, 0.1, 1.3), (-0.6, 0, 0.1, 1.3), (0, 0.6, 1.1, 0.1), (0, -0.6, 1.1, 0.1)): box('Lukenrahmen', sx, sy, 0.03, x, y, 0.015, M['frame'], 0.006)
    box('Schacht', 1.1, 1.1, 0.004, 0, 0, 0.004, M['schacht'], 0)
    for k in range(3): pipe('Leitung im Schacht', [(-0.5, -0.3 + k * 0.3, 0.008), (0.5, -0.3 + k * 0.3, 0.008)], 0.018, M['copper' if k % 2 else 'steel'])
    ob = box('Lukendeckel', 1.08, 1.08, 0.04, 0.68, 0, 0.56, M['frame'], 0.008, (0, RAD(78), 0))      # aufgeklappt zur Wand hin
    for k in range(4):      # Absperrung ringsum
        a = k * PI / 2; c, s = math.cos(a), math.sin(a); inst(prop('absperrung'), (c * 1.35, s * 1.35, 0), a + PI / 2)
    # Baustrahler auf Dreibein, auf die Luke gerichtet
    sx, sy = 1.6, 1.4
    for k in range(3):
        a = k * 2 * PI / 3; pipe('Stativbein', [(sx + 0.5 * math.cos(a), sy + 0.5 * math.sin(a), 0.0), (sx, sy, 1.6)], 0.016, M['ochre'])
    pipe('Stativrohr', [(sx, sy, 1.6), (sx, sy, 2.0)], 0.02, M['frame'])
    d = Vector((-sx, -sy, -1.8)).normalized(); c = Vector((sx, sy, 2.08))
    ob = box('Strahlerkopf', 0.36, 0.26, 0.14, c.x, c.y, c.z, M['ochre'], 0.012); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    ob = box('Strahlerglas', 0.3, 0.2, 0.01, *(c + d * 0.075), M['e_white'], 0); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    li = area('Baustrahler', tuple(c + d * 0.1), d.to_track_quat('-Z', 'Y').to_euler(), 0.3, 0.2, 110, (1.0, 0.97, 0.92))
    pipe('Strahlerkabel', [(sx, sy, 1.9), (sx + 0.1, sy, 0.02), (sx + 0.7, sy - 0.6, 0.012), (1.9, -1.2, 0.012)], 0.01, M['kabel'], 0.08)
    # Werkzeugkiste, Kabeltrommel, Leitkegel
    box('Werkzeugkiste', 0.55, 0.28, 0.3, 1.0, -1.1, 0.15, M['red'], 0.012); box('Kistengriff', 0.3, 0.03, 0.04, 1.0, -1.1, 0.33, M['frame'], 0.004)
    box('Werkzeugschale', 0.5, 0.24, 0.05, 1.0, -1.1, 0.4, M['red'], 0.006)
    for q in range(3): box('Schlüssel', 0.2, 0.03, 0.01, 0.9 + q * 0.06, -0.85, 0.06 + q * 0.012, M['steel'], 0.002, (0, 0, 0.3 * q))
    cyl('Trommel', 0.25, 0.3, 1.9, -1.2, 0.27, M['ochre'], 'X', n=24, bev=0.006); cyl('Trommelkern', 0.14, 0.31, 1.9, -1.2, 0.27, M['kabel'], 'X', n=20, bev=0)
    for sy_ in (-1, 1): box('Trommelfuß', 0.04, 0.5, 0.06, 1.9 + sy_ * 0.16, -1.2, 0.03, M['frame'], 0.004)
    for (x, y) in ((-1.9, 0.9), (-1.9, -0.9)):
        cyl('Leitkegel', 0.15, 0.55, x, y, 0.3, M['red'], 'Z', n=16, bev=0.004, r2=0.03); box('Kegelfuß', 0.34, 0.34, 0.03, x, y, 0.015, M['frame'], 0.004)
        ring('Kegelband', 0.1, 0.012, (x, y, 0.33), (0, 0, 1), M['white'], 16)
    spot((0.4, 0.9, 0.0), 0.5, 'fleck', 1.4); spot((-0.2, -1.4, 0.0), 0.35, 'fleck', 1.0)

# =====================================================================================
# Fluter am Pfeilerfuß (flach wie der Pfeiler: Wand bei x = 0, Halle bei −x)
# =====================================================================================
def n_fluter():
    box('Flutergehäuse', 0.22, 0.4, 0.1, -1.18, 0, 0.05, M['frame'], 0.01); box('Fluterglas', 0.16, 0.34, 0.01, -1.18, 0, 0.102, M['e_warmp'], 0)
    li = bpy.data.lights.new('Pfeilerfluter', 'SPOT'); li.energy = 70; li.color = (1.0, 0.8, 0.55); li.spot_size = RAD(42); li.spot_blend = 0.7; li.shadow_soft_size = 0.1
    ob = bpy.data.objects.new('Pfeilerfluter', li); link(ob); ob.location = (-1.18, 0, 0.15); ob.rotation_euler = (0, RAD(12), 0)      # leicht zur Wand gekippt

for k_, f_ in (('stand_gemuese', lambda: n_stand('gemuese')), ('stand_teile', lambda: n_stand('teile')), ('stand_imbiss', lambda: n_stand('imbiss')),
               ('arbeit', n_arbeit), ('fluter', n_fluter)):
    PROP['rh_' + k_] = f_
for (deg, stoff, lines) in BANNER: PROP['rh_banner_%d' % deg] = (lambda s=stoff, l=lines: n_banner(s, l))

# =====================================================================================
# Einsetzen
# =====================================================================================
def stromleitung(r0, deg, r1=RH_R - 0.15):      # Kabel vom Stand über den Boden zur Wand, mit Kabelbrücke und Wanddose
    a = RAD(deg); p0 = Vector((*polar(r0, a), 0.012)); p1 = Vector((*polar(r1 - 0.25, a), 0.012)); up = Vector((*polar(r1 - 0.12, a), 1.1))
    pipe('Stromkabel', [p0, p1, Vector((p1.x, p1.y, 0.02)) + (up - p1) * 0.02, up], 0.014, M['kabel'], 0.1)
    m = (p0 + p1) / 2; box('Kabelbrücke', 0.5, 0.25, 0.035, m.x, m.y, 0.017, M['warn'], 0.01, (0, 0, a + PI / 2))
    box('Wanddose', 0.18, 0.26, 0.3, up.x, up.y, up.z + 0.12, M['platey'], 0.008, (0, 0, a))
def leben():
    prev = CUR[0]; CUR[0] = C_DECK
    # Infosäulen am Eingang weichen den Ständen
    for o in list(C_DECK.objects):
        if o.instance_collection and o.instance_collection.name in ('Objekt saeule', 'Objekt kisten', 'Objekt karre'):
            r = math.hypot(o.location.x, o.location.y); d = math.degrees(math.atan2(o.location.y, o.location.x))
            if r > 12.5 and (abs(abs(d) - 150) < 4 or abs(d - 100) < 4 or abs(d - 82) < 4): bpy.data.objects.remove(o, do_unlink=True)
    for (deg, kind) in ((150, 'gemuese'), (-150, 'teile'), (100, 'imbiss')):
        r = 13.3 if kind != 'imbiss' else 13.6; x, y = polar(r, RAD(deg)); inst(prop('rh_stand_' + kind), (x, y, 0), RAD(deg))
        stromleitung(r + STAND_D / 2 + 0.6, deg + (4 if deg > 0 else -4))
    # Kisten und Säcke zwischen den Ständen und am Eingang
    for (r, d, nm, ang) in ((14.6, 160, 'kisten', 0.4), (14.5, -160, 'fass', 0.0), (14.4, 108, 'kisten', 2.1), (12.0, 141, 'rh_kuebel', 0)):
        x, y = polar(r, RAD(d)); inst(prop(nm), (x, y, 0), RAD(d) + ang, C_DECK)
    x, y = polar(12.3, RAD(78)); inst(prop('rh_arbeit'), (x, y, 0), RAD(78), C_DECK)
    # Fluter an allen Pfeilern
    for (deg, *_r) in BAYS + [(180,)]:
        t = th(deg)
        for sg in (-1, 1):
            a = RAD(deg) + sg * t; x, y = polar(R_, a); inst(prop('rh_fluter'), (x, y, 0), a, C_DECK)
    # Banner unter den Radialbalken (Balkenunterkante 7,375 m)
    for (deg, stoff, lines) in BANNER:
        x, y = polar(10.2, RAD(deg)); inst(prop('rh_banner_%d' % deg), (x, y, RH_HW + 0.17), RAD(deg), C_CEIL)
    # Spuren: abgetretene Laufwege zu den Läden und zum Hangar, Flecken vor den Ständen, Rost an den Pfeilerfüßen
    R = random.Random(23)
    for (deg, *_r) in BAYS + [(180,)]:
        for k in range(9):
            r = 5.2 + k * 1.25 + R.uniform(-0.3, 0.3); a = RAD(deg) + R.uniform(-0.05, 0.05); x, y = polar(r, a)
            spot((x, y, 0.0), R.uniform(0.5, 0.85), 'abrieb', R.uniform(1.4, 2.2))
            if k % 3 == 1: x, y = polar(r + 0.4, a + R.uniform(-0.04, 0.04)); spot((x, y, 0.0), R.uniform(0.2, 0.4), 'fleck', R.uniform(0.8, 1.5))
    # Reifenspuren der Karren: aus Handelskontor, Werft und Korridor zur Mitte, je zwei Spuren
    for (deg, r0, ln) in ((60, D0 - 0.3, 6.0), (120, D0 - 0.3, 5.0), (180, RH_R + 2.0, 9.0), (-120, D0 - 0.3, 3.5)):
        for q in range(2 if deg != 180 else 3):
            off = R.uniform(-1.6, 1.6); d = Vector((math.cos(RAD(deg)), math.sin(RAD(deg)), 0)); xd = Vector((d.y, -d.x, 0)); top = d * r0 + xd * off
            for sw in (-0.32, 0.32): streak(tuple(top + xd * sw), tuple(xd), tuple(d), 0.09, ln * R.uniform(0.7, 1.0), 'spur')
    for (deg, kind) in ((150, 'gemuese'), (-150, 'teile'), (100, 'imbiss')):
        for k in range(5):
            x, y = polar(R.uniform(11.4, 12.4), RAD(deg) + R.uniform(-0.1, 0.1)); spot((x, y, 0.0), R.uniform(0.25, 0.6), 'fleck' if k % 2 else 'abrieb', R.uniform(0.8, 1.6))
    for (deg, *_r) in BAYS + [(180,)]:
        t = th(deg)
        for sg in (-1, 1):
            x, y = polar(R_ - 1.05, RAD(deg) + sg * t); spot((x, y, 0.0), 0.45, 'rost', 1.2)
    REC[0] = None; CUR[0] = prev

def licht_neu():
    # Grundlicht: weniger und wärmer. Hallenleuchten in rh_deck.lights(), Kronenlicht im Baustein der Lichtkrone
    for o in C_LIGHT.objects:
        if o.name.startswith('Hallenlicht'):
            r = math.hypot(o.location.x, o.location.y)
            o.data.energy = 150 if r > 11 else 60; o.data.color = (1.0, 0.93, 0.84)
    for li in bpy.data.lights:
        if li.name.startswith('Kronenlicht'): li.energy = 1000; li.color = (1.0, 0.8, 0.58)
    prev = CUR[0]; CUR[0] = C_LIGHT
    # Farbschein der Läden vor jeder Bucht
    SPILL = {'a': (0.45, 0.95, 0.9), 'h': (1.0, 0.68, 0.32), 'w': (0.78, 0.88, 1.0), 'r': (1.0, 0.42, 0.3), 'k': (1.0, 0.72, 0.45)}
    for (deg, sig, title, sub) in BAYS:
        F = Frame(deg, D0); F.area(-0.7, 0, OH_B + 0.25, 1.4, 6.8, 170, SPILL[sig], (0, RAD(38), 0))
    CUR[0] = prev

def cams_neu():
    cam('markt', (-7.4, 3.0, 1.7), (-11.8, 7.2, 1.35), 18)
    cam('markt2', (-7.4, -3.0, 1.65), (-11.8, -7.2, 1.3), 18)
    cam('garkueche', (-0.3, 9.0, 1.7), (-2.4, 13.4, 1.3), 18)
    cam('banner', (-6.0, -6.0, 1.6), (4.0, 5.0, 6.0), 14)
    cam('arbeit', (4.8, 8.0, 1.7), (2.56, 12.0, 0.3), 18)
    VIEWS.extend(['markt', 'markt2', 'garkueche', 'banner', 'arbeit'])

leben(); licht_neu(); cams_neu()
result['leben'] = {'banner': len(BANNER), 'staende': 3}
