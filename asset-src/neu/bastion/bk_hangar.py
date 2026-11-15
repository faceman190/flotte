# Bastion-Hangar im Look des Baukastens: Bausteine. Läuft nach bk_kit.py und bk_mehr.py im selben Namensraum, danach bk_halle.py.
# Eigene Datei BastionHangar.blend (bk_kit.py leert die Szene).
# Maße aus dem Spiel (src/game/interior.ts): 184 × 162 × 42 m, Tor 124 × 32 m, Stellplätze bei x = 0 und ±60.
# Blender-y = −Spiel-z: Rückwand mit Ausgang bei y = +50, Tor bei y = −112.
# Wandbausteine sind an einer Bezugswand gebaut: Wandebene x = 0, Blick der Wand nach +X, Länge entlang y, Mitte bei y = 0.
HW, YB, YG, HH, DW, DH, BAY = 92.0, 50.0, -112.0, 42.0, 62.0, 32.0, 18.0
GZ = 9.6      # Lauffläche der Galerie
SPIEL = globals().get('SPIEL', False)      # Fassung fürs Spiel: Öffnung für die Schleuse des Decks statt des eigenen Portals, keine Wandfüllungen auf der Galerie

M['hfloor'] = mk('Hangarboden', (0.04, 0.043, 0.049), 0.6, 0.36, var=0.12, rvar=0.16, scale=0.3, bump=0.04, bscale=12.0, wear=0.5)
M['hfloor2'] = mk('Hangarboden hell', (0.056, 0.06, 0.067), 0.55, 0.4, var=0.12, rvar=0.16, scale=0.3, bump=0.04, bscale=12.0, wear=0.5)
M['hfloor3'] = mk('Hangarboden dunkel', (0.028, 0.03, 0.035), 0.65, 0.34, var=0.12, rvar=0.16, scale=0.3, bump=0.04, bscale=12.0, wear=0.5)
M['hwalk'] = mk('Fussweg', (0.075, 0.08, 0.086), 0.35, 0.5, var=0.14, scale=0.5, bump=0.12, bscale=20.0, wear=0.6)
M['roof'] = mk('Dach', (0.018, 0.02, 0.024), 0.5, 0.6, var=0.2, scale=0.4, grime=False)
M['paint_y'] = mk('Bodenfarbe ocker', (0.62, 0.3, 0.03), 0.0, 0.6, var=0.5, scale=1.1, grime=False)
M['paint_w'] = mk('Bodenfarbe weiss', (0.5, 0.5, 0.47), 0.0, 0.6, var=0.5, scale=1.1, grime=False)
M['e_roof'] = mk('Hallenleuchte', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.86, 0.93, 1.0), es=20.0, grime=False)
M['e_slot'] = mk('Lichtschlitz', (0.6, 0.9, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.6, 0.86, 1.0), es=3.4, grime=False)
M['e_pad'] = mk('Platzlicht', (0.1, 1, 0.9), 0, 0.3, var=0, rvar=0, emit=(0.1, 0.95, 0.8), es=12.0, grime=False)
M['e_win'] = mk('Fenster Leitstand', (1, 0.8, 0.5), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.72, 0.42), es=2.4, grime=False)
M['e_tor'] = mk('Torlicht', (1, 0.5, 0.1), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.42, 0.06), es=9.0, grime=False)
M['warnh'] = stripes('Warnschraffur Hangar', (0.75, 0.33, 0.03), (0.02, 0.02, 0.022), 2.2)
M['warnf'] = stripes('Warnschraffur Hallenboden', (0.6, 0.27, 0.03), (0.03, 0.03, 0.034), 1.6)
BX_, BY_ = (0, 1, 0), (0, 0, 1)      # Schrift auf der Bezugswand

def bigfield(y0, y1, z0, z1, var, flip=False, mats=('wall2', 'wall3', 'wall2', 'wall4'), gap=0.07, x0=0.0, th=0.14, bolt=0.32):
    for k, poly in enumerate(VAR[var]):
        wpts = [(y0 + ((1 - s) if flip else s) * (y1 - y0), z0 + t * (z1 - z0)) for s, t in poly]; x1 = x0 + th - (k % 2) * 0.035
        prism('Grossplatte', inset(wpts, gap / 2), x0, x1, M[mats[k % len(mats)]], 'X', 0.02)
        if bolt:
            for (y, z) in inset(wpts, bolt): cyl('Plattenbolzen', 0.04, 0.03, x1, y, z, M['steel'], 'X', n=8, bev=0)
def floorfield(x0, x1, y0, y1, var, flip=False, mats=('hfloor', 'hfloor2', 'hfloor', 'hfloor3'), gap=0.05):
    for k, poly in enumerate(VAR[var]):
        pts = [(x0 + ((1 - s) if flip else s) * (x1 - x0), y0 + t * (y1 - y0)) for s, t in poly]
        prism('Bodenplatte', inset(pts, gap / 2), -0.08, 0.0, M[mats[k % len(mats)]], 'Z', 0.012)
def annulus(name, r0, r1, c, m, n=64, a0=0.0, a1=2 * PI):
    bm = bmesh.new(); full = abs(a1 - a0 - 2 * PI) < 1e-6; cnt = n if full else n + 1; V = []
    for k in range(cnt):
        a = a0 + (a1 - a0) * k / n; V.append((bm.verts.new((math.cos(a) * r0, math.sin(a) * r0, 0)), bm.verts.new((math.cos(a) * r1, math.sin(a) * r1, 0))))
    for k in range(n if full else n): p, q = V[k], V[(k + 1) % cnt]; bm.faces.new((p[0], p[1], q[1], q[0]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = link(bpy.data.objects.new(name, me)); ob.location = c; return ob
def thick(ob, d=0.08): ob.data.extrude = d; return ob

# =====================================================================================
# Wand
# =====================================================================================
def h_sockel(y0, y1):      # Band auf Augenhöhe: Sockel mit Licht, Pfosten alle 2 m (dazwischen sitzen die Wandfüllungen des Baukastens), Gesims, Kabelbahn
    ln = y1 - y0; yc = (y0 + y1) / 2; n = int(round(ln / 2))
    box('Sockel', 0.13, ln, 0.2, 0.065, yc, 0.1, M['frame'], 0.01); box('Sockelnase', 0.2, ln, 0.035, 0.1, yc, 0.2175, M['wall2'], 0.008)
    array(box('Sockellicht', 0.012, 1.5, 0.022, 0.136, y0 + 1, 0.165, M['e_amber'], 0), n, (0, 2, 0))
    array(box('Spant Pfosten', 0.13, 0.18, 2.1, 0.065, y0, 1.05, M['frame'], 0.012), n + 1, (0, 2, 0))
    array(box('Spant Marke', 0.134, 0.184, 0.1, 0.065, y0, 1.32, M['ochre'], 0.004), n + 1, (0, 2, 0))
    array(box('Spant Fuß', 0.2, 0.24, 0.07, 0.1, y0, 0.035, M['frame'], 0.01), n + 1, (0, 2, 0))
    box('Gesims', 0.34, ln + 0.3, 0.3, 0.17, yc, 2.27, M['frame'], 0.03); box('Gesims Blende', 0.05, ln, 0.16, 0.36, yc, 2.3, M['wall2'], 0.012)
    box('Lichtfuge', 0.06, ln - 0.4, 0.02, 0.22, yc, 2.108, M['e_cool'], 0)
    box('Kabelbahn', 0.5, ln + 0.3, 0.02, 0.27, yc, 2.46, M['steel'], 0.004); box('Kabelbahn Rand', 0.015, ln + 0.3, 0.09, 0.52, yc, 2.5, M['steel'], 0.004)
    for q in range(7):
        r = 0.02 + (q % 3) * 0.008
        cyl('Kabel', r, ln + 0.3, 0.06 + q * 0.066, yc, 2.47 + r, M[['rubber', 'rubber', 'teal', 'rubber', 'ochre', 'copper', 'rubber'][q]], 'Y', n=10, bev=0)
def h_fussweg(L, gap=None):      # markierter Fußweg an der Wand, bündig im Boden
    for (a, b) in ([(-L / 2, L / 2)] if gap is None else [(-L / 2, -gap), (gap, L / 2)]):
        box('Fussweg', 3.2, b - a, 0.03, 1.6, (a + b) / 2, 0.0, M['hwalk'], 0.004); box('Fussweg Linie', 0.14, b - a, 0.004, 3.27, (a + b) / 2, 0.016, M['paint_y'], 0)
        array(box('Fussweg Fuge', 3.2, 0.03, 0.006, 1.6, a + 3, 0.014, M['frame'], 0), max(1, int((b - a) / 3) - 1), (0, 3, 0))
def h_galerie(L):
    h = L / 2
    box('Galerie Rost', 2.6, L, 0.08, 1.3, 0, GZ - 0.04, M['grate'], 0.01); box('Galerie Randträger', 0.18, L, 0.4, 2.6, 0, GZ - 0.18, M['frame'], 0.03)
    box('Galerie Wandträger', 0.18, L, 0.3, 0.09, 0, GZ - 0.2, M['frame'], 0.02); box('Galerie Kante', 0.012, L, 0.1, 2.696, 0, GZ - 0.08, M['paint_y'], 0)
    for y in (-L / 3, 0, L / 3): prism('Galerie Konsole', [(0, GZ - 0.3), (2.6, GZ - 0.3), (2.6, GZ - 0.6), (0.25, GZ - 2.2), (0, GZ - 2.2)], y - 0.09, y + 0.09, M['frame'], 'Y', 0.02)
    array(box('Geländerpfosten', 0.06, 0.06, 1.1, 2.62, -h + 1.0, GZ + 0.55, M['frame'], 0.008), int(L / 2), (0, 2, 0))
    cyl('Handlauf', 0.032, L, 2.62, 0, GZ + 1.1, M['steel'], 'Y', n=10, bev=0); cyl('Knieleiste', 0.02, L, 2.62, 0, GZ + 0.58, M['steel'], 'Y', n=8, bev=0)
    box('Fußleiste', 0.02, L, 0.12, 2.66, 0, GZ + 0.06, M['frame'], 0.004); box('Galerielicht', 0.1, L - 2.4, 0.03, 2.45, 0, GZ - 0.4, M['e_cool'], 0)
    for (x, z, r, m) in ((0.38, GZ - 0.62, 0.16, 'steel'), (0.8, GZ - 0.55, 0.11, 'copper'), (1.14, GZ - 0.6, 0.14, 'wall2')):      # Rohrstrang unter der Galerie
        cyl('Hallenrohr', r, L, x, 0, z, M[m], 'Y', n=16, bev=0)
        array(cyl('Rohrflansch', r + 0.035, 0.07, x, -h + 1.5, z, M['frame'], 'Y', n=16, bev=0.008), int(L / 4.5), (0, 4.5, 0))
    array(box('Rohrbügel', 1.1, 0.06, 0.05, 0.75, -h + 3, GZ - 0.36, M['frame'], 0.006), int(L / 6), (0, 6, 0))
    cyl('Rohrmarke', 0.165, 0.5, 0.38, h * 0.4, GZ - 0.62, M['ochre'], 'Y', n=16, bev=0)
def h_oben(L):      # Kranbahn, Lamellenband, Dachanschluss
    box('Kranbahnträger', 0.7, L, 1.1, 0.75, 0, 32.3, M['frame'], 0.04); box('Kranschiene', 0.16, L, 0.14, 0.9, 0, 32.92, M['steel'], 0.02)
    box('Kranbahn Warnband', 0.012, L, 0.36, 1.106, 0, 32.1, M['warnh'], 0)
    for y in (-L / 3, 0, L / 3): prism('Kranbahn Konsole', [(0, 31.9), (1.1, 31.9), (0, 30.4)], y - 0.12, y + 0.12, M['frame'], 'Y', 0.02)
    box('Lamellenrahmen', 0.3, L - 1.6, 3.0, 0.15, 0, 35.3, M['frame'], 0.03); box('Lamellengrund', 0.05, L - 2.0, 2.6, 0.31, 0, 35.3, M['wall4'], 0)
    array(box('Lamelle', 0.22, L - 2.0, 0.04, 0.4, 0, 34.15, M['wall2'], 0.006, (0, 0.5, 0)), 12, (0, 0, 0.21))
    box('Dachanschluss', 0.8, L, 0.5, 0.4, 0, 41.75, M['frame'], 0.04)
    for q in range(4): cyl('Sammelkabel', 0.05 + (q % 2) * 0.02, L, 0.12 + q * 0.16, 0, 33.3 + (q % 2) * 0.02, M[['rubber', 'teal', 'rubber', 'copper'][q]], 'Y', n=10, bev=0)
def h_spant():      # Hauptspant zwischen zwei Jochen
    prof = [(0, 0), (1.9, 0), (1.9, 2.4), (1.3, 3.4), (1.3, 30.6), (2.7, 35.6), (2.7, 37.3), (0, 37.3)]
    prism('Hauptspant Steg', prof, -0.3, 0.3, M['frame'], 'Y', 0.03); box('Hauptspant Gurt', 0.14, 1.5, 27.4, 1.37, 0, 17.1, M['frame'], 0.03)
    fp = [(0, -0.85), (1.7, -0.85), (2.0, -0.55), (2.0, 0.55), (1.7, 0.85), (0, 0.85)]; gr = lambda d: [(x + (d if x > 0 else 0), y + (d if y > 0 else -d)) for x, y in fp]
    prism('Hauptspant Fuß', fp, 0.0, 2.3, M['frame'], 'Z', 0.04); prism('Fuß Sockelblech', gr(0.02), 0.0, 0.14, M['steel'], 'Z', 0.01)
    prism('Fuß Warnband', gr(0.012), 0.2, 0.56, M['warnh'], 'Z', 0); prism('Fuß Marke', gr(0.012), 2.06, 2.16, M['ochre'], 'Z', 0)
    prism('Fußfeld vorn', inset([(-0.42, 0.72), (0.42, 0.72), (0.42, 1.78), (0.3, 1.92), (-0.42, 1.92)], 0.0), 2.0, 2.03, M['wall2'], 'X', 0.008)
    for sy in (-1, 1):
        box('Fußfeld seitlich', 1.3, 0.03, 1.2, 0.86, sy * 0.86, 1.32, M['wall2'], 0.008); box('Fuß Lichtfuge', 0.02, 0.05, 1.0, 1.84, sy * 0.71, 1.3, M['e_amber'], 0, (0, 0, sy * PI / 4))
        for (x, z) in ((0.3, 0.8), (1.42, 0.8), (0.3, 1.84), (1.42, 1.84)): cyl('Feldschraube', 0.016, 0.014, x, sy * 0.876, z, M['steel'], 'Y', n=6, bev=0)
    box('Fuß Typenschild', 0.008, 0.36, 0.2, 2.034, -0.1, 1.2, M['plate'], 0); text('SP 3-H', 0.06, (2.04, -0.25, 1.22), BX_, BY_, M['txtd']); text('NICHT BELASTEN', 0.028, (2.04, -0.25, 1.15), BX_, BY_, M['txtd'])
    box('Fuß Steckdose', 0.05, 0.16, 0.22, 2.02, 0.26, 0.9, M['cab'], 0.01); cyl('Steckdosen-LED', 0.008, 0.01, 2.05, 0.26, 0.97, M['e_green'], 'X', n=8, bev=0)
    array(box('Spantrippe', 1.25, 1.44, 0.1, 0.68, 0, 5.0, M['frame'], 0.02), 9, (0, 0, 3.0))
    box('Gurtfeld', 0.02, 0.5, 17.6, 1.445, 0, 19.0, M['wall4'], 0.008)
    for sy in (-1, 1): box('Lichtschlitz', 0.03, 0.14, 18.0, 1.445, sy * 0.48, 19.0, M['e_slot'], 0)
    box('Auflager', 2.9, 1.9, 0.5, 1.45, 0, 37.5, M['frame'], 0.05); cyl('Hindernisfeuer', 0.12, 0.2, 2.78, 0, 36.5, M['e_red'], 'X', n=12, bev=0)
    bolts(2.03, [-0.36, 0.36], [0.8, 1.84], r=0.016, ln=0.014); text('SPANT', 0.11, (2.034, -0.3, 1.6), BX_, BY_, M['txtw'])
    box('Gurt Typenschild', 0.01, 0.4, 0.26, 1.445, 0, 4.4, M['plate'], 0); text('LAST 480 t', 0.07, (1.451, -0.17, 4.36), BX_, BY_, M['txtd'])
    streak((2.034, 0.2, 0.74), BX_, BY_, 0.4, 0.5, 'rost'); streak((1.446, -0.2, 9.0), BX_, BY_, 0.7, 3.5, 'spur')
GAL = {0: ['feld1', 'tuer2', 'schrank', 'feld2', 'gitter', 'feld3', 'feld1', 'feuer'], 1: ['gitter', 'feld2', 'feld3', 'schrank', 'schrank', 'feld1', 'tuer1', 'feld2'],
       2: ['feld3', 'feuer', 'feld1', 'tuer2', 'feld2', 'gitter', 'feld1', 'feld3']}
def h_joch(v, L=18.0):      # ein Wandjoch; v wählt Felderschnitt und Einbauten
    h = L / 2; a = h - 0.78; cols = 3 if L < 20 else 4; wd = 2 * a / cols; n = int(L / 2) - 1
    box('Hallenwand', 0.5, L, HH, -0.25, 0, HH / 2, M['wall'], 0)
    h_sockel(-(h - 1), h - 1); h_fussweg(L); h_galerie(L); h_oben(L)
    text('FUSSWEG', 0.3, (2.0, -1.0, 0.016), FL_X, FL_Y, M['paint_w']); arrow((2.5, 1.6 if v % 2 else -1.6, 0.016), (0, 1 if v % 2 else -1, 0), (-1, 0, 0) if v % 2 else (1, 0, 0), 1.2, M['paint_w'], 0.16)
    skip = {0: (1, 1), 1: None, 2: (1, 2)}[v % 3]
    rows = ((2.8, 5.6), (5.75, 8.85), (12.7, 18.4), (18.55, 24.3), (24.45, 30.3))
    for c in range(cols):
        y0 = -a + c * wd + 0.04; y1 = y0 + wd - 0.08
        for r, (z0, z1) in enumerate(rows):
            if r >= 2 and skip == (c, r - 2): continue
            bigfield(y0, y1, z0, z1, 1 + (c + v + r * 2) % 4, (c + v + r) % 2 == 0, bolt=0.32 if r < 2 else 0)
    for q in range(0 if SPIEL else n):      # Wandfüllungen des Baukastens auf der Galerie (im Spiel zu weit weg, um sie zu sehen)
        nm = GAL[v % 3][q % 8]; inst(dress(nm), (1.7, -(h - 2) + q * 2, GZ), 0.0)
    box('Galerie Sockel', 0.13, L - 1.6, 0.2, 0.065, 0, GZ + 0.1, M['frame'], 0.01); box('Galerie Gesims', 0.3, L - 1.6, 0.2, 0.15, 0, GZ + 2.25, M['frame'], 0.02)
    box('Galerie Lichtfuge', 0.06, L - 2.4, 0.02, 0.2, 0, GZ + 2.14, M['e_cool'], 0)
    box('Akzentband', 0.03, 2 * a, 0.22, 0.015, 0, 12.48, M['ochre'], 0)
    if v % 3 == 0:      # großes Lüftungsgitter
        yc = -a + 1.5 * wd; zc = (18.55 + 24.3) / 2
        box('Lüftungsrahmen', 0.4, wd - 0.3, 5.5, 0.2, yc, zc, M['frame'], 0.04); box('Lüftungsgrund', 0.05, wd - 0.9, 4.9, 0.3, yc, zc, M['wall4'], 0)
        array(box('Lüftungslamelle', 0.3, wd - 0.9, 0.05, 0.42, yc, zc - 2.3, M['wall2'], 0.008, (0, 0.6, 0)), 19, (0, 0, 0.255))
        for sy in (-1, 1): cyl('Gitter-LED', 0.05, 0.04, 0.41, yc + sy * (wd / 2 - 0.32), zc + 2.55, M['e_amber'], 'X', n=10, bev=0)
        streak((0.03, yc, zc - 2.8), BX_, BY_, wd - 1.2, 5.0, 'spur')
    elif v % 3 == 1:      # Steigschacht und Leiter
        y = a - 1.3
        box('Steigschacht', 1.0, 1.3, 20.6, 0.64, y, GZ + 2.6 + 10.3, M['wall2'], 0.03); array(box('Schachtflansch', 1.12, 1.42, 0.14, 0.64, y, GZ + 4.0, M['frame'], 0.02), 7, (0, 0, 3.0))
        box('Schachtkrümmer', 1.0, 1.3, 0.9, 0.64, y, GZ + 2.5, M['frame'], 0.06)
        y = -a + 1.1
        for sy in (-1, 1): box('Leiterholm', 0.06, 0.06, 20.6, 0.3, y + sy * 0.26, GZ + 10.3, M['steel'], 0.006)
        array(cyl('Leitersprosse', 0.016, 0.52, 0.3, y, GZ + 0.3, M['steel'], 'Y', n=8, bev=0), 68, (0, 0, 0.3))
        array(ring('Leiterkorb', 0.4, 0.018, (0.68, y, GZ + 2.6), (0, 0, 1), M['ochre'], 16), 15, (0, 0, 1.25))
        for q in range(3): cyl('Korbstab', 0.014, 18.2, 0.68 + 0.4 * math.cos(q * 1.0 - 1.0), y + 0.4 * math.sin(q * 1.0 - 1.0), GZ + 2.4 + 9.1, M['ochre'], 'Z', n=8, bev=0)
    else:      # Umluftgebläse
        yc = -a + 1.5 * wd; zc = (24.45 + 30.3) / 2
        box('Gebläserahmen', 0.5, 5.4, 5.4, 0.25, yc, zc, M['frame'], 0.05); cyl('Gebläseschacht', 2.45, 0.2, 0.46, yc, zc, M['wall4'], 'X', n=40, bev=0.02)
        cyl('Gebläsenabe', 0.5, 0.5, 0.62, yc, zc, M['ochre'], 'X', n=20, bev=0.04)
        for q in range(7): box('Gebläseflügel', 0.05, 0.7, 2.0, 0.6, yc + math.sin(q * 2 * PI / 7) * 1.35, zc + math.cos(q * 2 * PI / 7) * 1.35, M['steel'], 0.01, (-q * 2 * PI / 7, 0, 0))
        for r in (0.9, 1.6, 2.3): ring('Schutzring', r, 0.025, (0.9, yc, zc), (1, 0, 0), M['frame'], 40)
        for q in range(4): box('Schutzspeiche', 0.03, 4.8, 0.03, 0.9, yc, zc, M['frame'], 0, (q * PI / 4, 0, 0))
        text('UMLUFT 3', 0.5, (0.03, yc - 1.4, zc - 3.5), BX_, BY_, M['txtw'])
    label('NOTRUF 3-%d1' % (v + 1), 0.05, (0.136, -0.9, 1.5), BX_, BY_); streak((0.03, a * 0.5, 8.8), BX_, BY_, 1.6, 3.0, 'rost'); streak((0.146, -a * 0.6, 24.2), BX_, BY_, 2.4, 6.0, 'spur')
def h_turm():      # Eckturm mit Treppenhaus: deckt die Ecken ab, Türen unten und zur Galerie
    S = 3.8; box('Eckturm', S, S, HH, 0, 0, HH / 2, M['wall'], 0.05)
    for z in (2.6, GZ - 0.3, GZ + 2.6, 20.0, 30.5, 37.3): box('Turmband', S + 0.12, S + 0.12, 0.3, 0, 0, z, M['frame'], 0.03)
    for (ax, sg) in (('x', 1), ('y', 1)):      # die zwei Seiten zur Halle (gedreht gesetzt)
        d = S / 2
        P = (lambda u, w, z: (d + w, u, z)) if ax == 'x' else (lambda u, w, z: (u, d + w, z))
        Sz = (lambda t, w, hh: (t, w, hh)) if ax == 'x' else (lambda t, w, hh: (w, t, hh))
        for z0 in (0.0, GZ):
            box('Turmtür Rahmen', *Sz(0.14, 1.5, 2.4), *P(0, 0.04, z0 + 1.2), M['frame'], 0.03); box('Turmtür', *Sz(0.06, 1.1, 2.1), *P(0, 0.09, z0 + 1.07), M['wall2'], 0.015)
            box('Turmtür Warnband', *Sz(0.064, 1.1, 0.16), *P(0, 0.09, z0 + 0.2), M['warn'], 0); box('Turmtür Fenster', *Sz(0.07, 0.3, 0.5), *P(0, 0.09, z0 + 1.55), M['e_warmp'], 0.01)
            box('Turmtür Licht', *Sz(0.05, 1.0, 0.05), *P(0, 0.12, z0 + 2.45), M['e_teal'], 0)
        box('Turm Lichtschlitz', *Sz(0.04, 0.3, 16.0), *P(1.1, 0.0, 21.5), M['e_slot'], 0); box('Turm Schlitzrahmen', *Sz(0.1, 0.5, 16.4), *P(1.1, -0.03, 21.5), M['frame'], 0.02)
        box('Turmfeld', *Sz(0.1, 1.6, 6.5), *P(-0.7, 0.0, 16.4), M['wall2'], 0.02); box('Turmfeld', *Sz(0.1, 1.6, 6.5), *P(-0.7, 0.0, 26.0), M['wall3'], 0.02)
    text('TREPPE', 0.2, (S / 2 + 0.065, -0.42, 2.5), BX_, BY_, M['txtw']); text('TREPPE', 0.2, (0.42, S / 2 + 0.065, 2.5), (-1, 0, 0), (0, 0, 1), M['txtw'])

# ---------- Rückwand Mitte: Ausgang, Deckmeister, Leitstand, Schriftzug ----------
def h_mitte():
    L = 36.0; h = 18.0; LZ = 12.6      # Unterkante Leitstand
    if SPIEL:      # Öffnung 6,3 × 4,8 m: Dort sitzt die Schleuse des Decks (p_schleuse in bk_deck_d.py)
        for sy in (-1, 1): box('Hallenwand', 0.5, 14.85, HH, -0.25, sy * 10.575, HH / 2, M['wall'], 0)
        box('Hallenwand', 0.5, 6.3, HH - 4.8, -0.25, 0, 4.8 + (HH - 4.8) / 2, M['wall'], 0)
    else: box('Hallenwand', 0.5, L, HH, -0.25, 0, HH / 2, M['wall'], 0)
    h_sockel(-17, -3); h_sockel(3, 17); h_fussweg(L, 2.6); h_galerie(L); h_oben(L)
    for (y0, y1, v) in ((-17.2, -11.6, 1), (-11.45, -3.3, 2), (3.3, 11.45, 4), (11.6, 17.2, 2)):
        bigfield(y0, y1, 2.8, 5.6, v, y0 < 0); bigfield(y0, y1, 5.75, 8.85, 1 + (v + 1) % 4, y0 > 0)
    # Ausgang: Portal mit dem geschlossenen Tor des Baukastens (dasselbe Tor wie auf der Gangseite); im Spiel steht dort die Schleuse des Decks
    box('Portal Vorfeld', 2.4, 5.0, 0.004, 2.3, 0, 0.017, M['warnf'], 0); box('Portal Schwelle', 1.1, 3.9, 0.03, 0.55, 0, 0.012, M['steel'], 0.006)
    area('Portallicht', (1.5, 0, 3.6), (0, math.radians(-60), 0), 0.2, 3.0, 220, (0.5, 0.95, 0.9))
    if not SPIEL:
        prism('Portal', [(-2.6, 0), (-2.0, 0), (-2.0, 3.3), (-1.6, 3.7), (1.6, 3.7), (2.0, 3.3), (2.0, 0), (2.6, 0), (2.6, 3.9), (2.0, 4.6), (-2.0, 4.6), (-2.6, 3.9)], 0.0, 1.1, M['frame'], 'X', 0.05)
        inst(module('Tor zu', door_closed), (2.36, 0, 0), 0.0)
        box('Portal Leuchtband', 0.04, 3.0, 0.1, 1.11, 0, 3.86, M['e_teal'], 0); box('Portal Schild', 0.04, 3.4, 0.52, 1.11, 0, 4.28, M['wall4'], 0.01)
        text('DECK 3', 0.26, (1.135, -0.54, 4.22), BX_, BY_, M['txtw']); text('PROMENADE · QUARTIERE · LEITSTAND', 0.065, (1.135, -0.74, 4.08), BX_, BY_, M['txto'])
        for sy in (-1, 1):
            box('Portal Warnband', 0.012, 0.56, 1.0, 1.106, sy * 2.3, 0.6, M['warnh'], 0); cyl('Portal Leuchte', 0.06, 0.05, 1.11, sy * 2.3, 2.6, M['e_amber'], 'X', n=12, bev=0)
            box('Portal Licht', 0.05, 0.08, 2.2, 0.36, sy * 1.94, 1.5, M['e_cool'], 0)
    # Pult des Deckmeisters (Spiel: Block x 7,4 … 10,6, z −48,4 … −47,2) mit Vordach
    yc = 9.0
    box('Pult', 1.0, 3.2, 1.0, 2.2, yc, 0.5, M['cab'], 0.03); box('Pultplatte', 1.2, 3.4, 0.05, 2.2, yc, 1.03, M['frame'], 0.015); box('Pult Warnband', 0.012, 3.2, 0.16, 2.706, yc, 0.2, M['warn'], 0)
    for (dy, m) in ((-0.9, 'screen'), (0.0, 'screen2'), (0.9, 'screen')): box('Pultschirm', 0.04, 0.7, 0.42, 1.95, yc + dy, 1.36, M[m], 0.008, (0, -0.25, 0)); box('Schirmfuß', 0.06, 0.1, 0.2, 1.9, yc + dy, 1.12, M['frame'], 0.01)
    box('Pult Tastenfeld', 0.3, 1.6, 0.02, 2.35, yc, 1.065, M['rubber'], 0.004); text('DECKMEISTER', 0.16, (2.706, yc - 0.74, 0.55), BX_, BY_, M['txtw'])
    for dy in (-1.75, 1.75): box('Vordach Stütze', 0.1, 0.1, 2.9, 0.7, yc + dy, 1.45, M['frame'], 0.012); box('Vordach Strebe', 2.6, 0.08, 0.08, 1.5, yc + dy, 2.86, M['frame'], 0.012)
    box('Vordach', 3.0, 4.0, 0.1, 1.5, yc, 2.95, M['wall2'], 0.03); box('Vordach Licht', 1.6, 2.6, 0.03, 1.8, yc, 2.89, M['e_warmp'], 0)
    area('Pultlicht', (1.8, yc, 2.85), (0, 0, 0), 1.6, 2.6, 260, WARM)
    # Leitstand: Kanzel über dem Ausgang
    prof = [(0, LZ), (3.3, LZ), (4.7, LZ + 1.5), (4.0, LZ + 4.7), (0, LZ + 5.1)]
    prism('Leitstand Wanne', [(0, LZ), (3.3, LZ), (4.7, LZ + 1.5), (4.42, LZ + 1.5), (3.2, LZ + 0.5), (0, LZ + 0.5)], -13.0, 13.0, M['wall2'], 'Y', 0.05)
    prism('Leitstand Dach', [(0, LZ + 4.55), (3.9, LZ + 4.55), (4.0, LZ + 4.7), (0, LZ + 5.1)], -13.0, 13.0, M['wall2'], 'Y', 0.05)
    box('Leitstand Rückwand', 0.1, 25.6, 4.1, 0.06, 0, LZ + 2.55, M['wall4'], 0); box('Leitstand Boden', 3.1, 25.6, 0.02, 1.6, 0, LZ + 0.51, M['floor2'], 0)
    for q in range(6):
        y = -10.5 + q * 4.2; box('Wandschirm', 0.04, 2.6, 1.3, 0.13, y, LZ + 3.3, M['screen2' if q % 2 else 'screen'], 0.01); box('Schirmrahmen', 0.05, 2.8, 1.5, 0.12, y, LZ + 3.3, M['frame'], 0.02)
        box('Leitpult', 0.8, 2.4, 0.9, 3.0, y, LZ + 0.96, M['cab'], 0.03); box('Pultschirm', 0.03, 0.9, 0.4, 3.2, y, LZ + 1.56, M['screen'], 0.006, (0, 0.3, 0))
        box('Leitsitz', 0.5, 0.5, 1.1, 2.1, y + 0.3, LZ + 1.06, M['polster'], 0.05)
    for x in (1.0, 2.6): box('Leitstand Deckenlicht', 0.25, 24.0, 0.03, x, 0, LZ + 4.53, M['e_warmp'], 0)
    box('Leitstand Bodenlicht', 0.04, 24.0, 0.04, 0.14, 0, LZ + 0.56, M['e_amber'], 0)
    for y in (-13.0, 13.0): prism('Leitstand Wange', [(0, LZ - 0.2), (3.5, LZ - 0.2), (4.95, LZ + 1.45), (4.2, LZ + 4.9), (0, LZ + 5.3)], y - 0.2, y + 0.2, M['frame'], 'Y', 0.05)
    wa = math.atan2(0.7, 3.2); wl = math.hypot(0.7, 3.2)
    for q in range(8):
        y = -11.2 + q * 3.2
        box('Leitstand Fenster', 0.03, 2.94, wl - 0.2, 4.35, y, LZ + 3.1, M['lens'], 0, (0, -wa, 0))
        box('Fensterpfosten', 0.16, 0.28, wl - 0.1, 4.37, y + 1.6, LZ + 3.1, M['frame'], 0.02, (0, -wa, 0))
    box('Fensterpfosten', 0.16, 0.28, wl - 0.1, 4.37, -12.8, LZ + 3.1, M['frame'], 0.02, (0, -wa, 0))
    box('Fensterbrüstung', 0.2, 26.0, 0.3, 4.72, 0, LZ + 1.5, M['frame'], 0.04); box('Fenstersturz', 0.25, 26.0, 0.3, 4.02, 0, LZ + 4.72, M['frame'], 0.04)
    sl = math.hypot(1.4, 1.5); sa = math.atan2(1.4, 1.5)
    box('Leitstand Unterlicht', 0.04, 20.0, 0.4, 3.672, 0, LZ + 0.355, M['e_cool'], 0, (0, sa, 0))
    text('HANGARLEITSTAND', 0.5, (4.028, -2.5, LZ + 0.78), (0, 1, 0), (math.sin(sa), 0, math.cos(sa)), M['txtw'])
    for y in (-9.0, 0.0, 9.0): prism('Leitstand Konsole', [(0, LZ), (2.0, LZ), (0, LZ - 1.2)], y - 0.15, y + 0.15, M['frame'], 'Y', 0.03)
    for y in (-10.0, 10.0): cyl('Antenne', 0.03, 3.0, 2.0, y, LZ + 6.6, M['steel'], 'Z', n=8, bev=0); cyl('Antennenlicht', 0.06, 0.1, 2.0, y, LZ + 8.1, M['e_red'], 'Z', n=10, bev=0)
    for y in (-6.0, 6.0): area('Leitstand Unterlicht', (3.6, y, LZ - 0.1), (0, math.radians(-25), 0), 0.4, 9.0, 900, COOL)
    # Schriftzug
    box('Schrifttafel', 0.2, 31.0, 10.6, 0.1, 0, 24.6, M['wall4'], 0.04); box('Tafelrahmen', 0.3, 31.6, 0.3, 0.15, 0, 19.2, M['frame'], 0.03); box('Tafelrahmen', 0.3, 31.6, 0.3, 0.15, 0, 30.0, M['frame'], 0.03)
    for sy in (-1, 1): box('Tafelrahmen', 0.3, 0.3, 10.8, 0.15, sy * 15.65, 24.6, M['frame'], 0.03)
    emblem((0.24, -11.2, 25.2), BX_, BY_, 3.3, M['plate'])
    thick(text('BASTION', 4.6, (0.21, -6.2, 23.6), BX_, BY_, M['plate']), 0.07); thick(text('HANGARDECK 1', 1.45, (0.21, -6.0, 20.9), BX_, BY_, M['platey']), 0.04)
    box('Tafel Akzent', 0.03, 20.4, 0.14, 0.21, 4.1, 22.9, M['ochre'], 0)
    box('Tafel Leuchtenträger', 0.5, 28.0, 0.25, 1.3, 0, 18.7, M['frame'], 0.03)
    for q in range(7):
        y = -12 + q * 4.0; box('Tafelstrahler', 0.4, 0.8, 0.2, 1.3, y, 18.92, M['wall4'], 0.03); box('Strahlerglas', 0.3, 0.7, 0.02, 1.3, y, 19.03, M['e_white'], 0)
        area('Tafellicht', (1.35, y, 19.1), (0, math.radians(168), 0), 0.3, 0.7, 900, COOL)
    for sy in (-1, 1):
        y0, y1 = (13.5, 17.2) if sy > 0 else (-17.2, -13.5); bigfield(y0, y1, 12.7, 19.0, 2 if sy > 0 else 4, sy > 0, bolt=0)
    for q in range(0 if SPIEL else 17):      # Wandfüllungen auf der Galerie unter dem Leitstand
        inst(dress(GAL[1][q % 8] if q != 8 else 'tuer2'), (1.7, -16 + q * 2, GZ), 0.0)
    box('Galerie Sockel', 0.13, L - 1.6, 0.2, 0.065, 0, GZ + 0.1, M['frame'], 0.01); box('Galerie Gesims', 0.3, L - 1.6, 0.2, 0.15, 0, GZ + 2.25, M['frame'], 0.02)
    box('Galerie Lichtfuge', 0.06, L - 2.4, 0.02, 0.2, 0, GZ + 2.14, M['e_cool'], 0)

# ---------- Torwand ----------
def h_tor():      # Wandebene y = 0, Blick der Wand nach +Y (in die Halle); Öffnung x ±62, 32 m hoch
    for sx in (-1, 1):
        box('Torpfeiler', 6.0, 5.0, DH + 1.0, sx * (DW + 3.0), -0.5, (DH + 1.0) / 2, M['frame'], 0.12)
        box('Pfeiler Warnband', 6.02, 5.02, 5.0, sx * (DW + 3.0), -0.5, 3.4, M['warnh'], 0); box('Pfeilerfeld', 3.6, 0.1, 18.0, sx * (DW + 3.2), 2.0, 18.4, M['wall2'], 0.03)
        box('Torlichtband', 0.5, 0.06, 20.0, sx * (DW + 0.9), 2.02, 18.0, M['e_tor'], 0); box('Torlichtband innen', 0.06, 2.4, 20.0, sx * (DW + 0.0) , -0.5, 18.0, M['e_tor'], 0)
        box('Torblatt eingefahren', 14.0, 1.2, DH, sx * (DW + 13.0), -1.8, DH / 2, M['wall2'], 0.05)
        for q in range(4): cyl('Torfeuer', 0.18, 0.12, sx * (DW + 4.6), 2.02, 9.0 + q * 6.0, M['e_red' if sx < 0 else 'e_green'], 'Y', n=12, bev=0)
        thick(text('TOR 1', 1.6, (sx * (DW + 3.2) + 2.6, 2.03, 6.4), (-1, 0, 0), (0, 0, 1), M['plate']), 0.03)
    box('Torsturz', 2 * DW + 12.0, 5.0, 4.0, 0, -0.5, DH + 2.0, M['frame'], 0.12); box('Sturz Warnband', 2 * DW, 0.02, 1.0, 0, 2.01, DH + 0.8, M['warnh'], 0)
    box('Sturz Lichtband', 2 * DW - 6.0, 0.06, 0.3, 0, 2.02, DH + 2.6, M['e_tor'], 0); box('Torwand oben', 2 * HW, 1.0, HH - DH - 4.0, 0, -0.5, DH + 4.0 + (HH - DH - 4.0) / 2, M['wall'], 0)
    for q in range(8): bigfield(-58 + q * 14.6, -58 + q * 14.6 + 14.4, DH + 4.3, HH - 0.6, 1 + q % 4, q % 2 == 0, bolt=0)
    REC_ = [o for o in CUR[0].objects if o.name.startswith('Grossplatte')]; rotz(REC_, PI / 2, (0, 0.0, 0))      # Felder von der Bezugswand auf die Torwand drehen
    box('Torschwelle', 2 * DW, 3.0, 0.04, 0, -0.5, 0.0, M['steel'], 0.01); box('Schwelle Warnfeld', 2 * DW, 2.2, 0.004, 0, 3.0, 0.004, M['warnf'], 0)
    array(cyl('Schwellenlicht', 0.16, 0.03, -DW + 2.0, 1.4, 0.012, M['e_pad'], 'Z', n=12, bev=0), 31, (4.0, 0, 0))
# ---------- Dach ----------
def h_binder():      # Fachwerkbinder über die ganze Breite
    box('Obergurt', 2 * HW, 0.8, 0.6, 0, 0, 41.3, M['frame'], 0.04); box('Untergurt', 2 * HW, 0.8, 0.6, 0, 0, 37.9, M['frame'], 0.04)
    n = 16; d = 2 * HW / n; dl = math.hypot(d, 2.8); da = math.atan2(2.8, d)
    array(box('Binderpfosten', 0.5, 0.6, 2.8, -HW + d, 0, 39.6, M['frame'], 0.03), n - 1, (d, 0, 0))
    for q in range(n): box('Binderstrebe', dl, 0.4, 0.4, -HW + d * (q + 0.5), 0, 39.6, M['frame'], 0.03, (0, da if q % 2 else -da, 0))
    array(box('Knotenblech', 1.6, 0.86, 1.0, -HW + d, 0, 38.2, M['wall4'], 0.03), n - 1, (d, 0, 0))
    array(cyl('Binderfeuer', 0.1, 0.12, -HW + d, 0, 37.55, M['e_red'], 'Z', n=10, bev=0), 8, (d * 2, 0, 0))
    box('Binder Kabelbahn', 2 * HW, 0.5, 0.06, 0, 0.7, 37.7, M['steel'], 0.01)
def h_dachfeld():      # Dach zwischen zwei Bindern: Platte, Pfetten, Hallenleuchten, Kanäle, Kranschienen
    box('Dachplatte', 2 * HW, BAY, 0.4, 0, 0, HH + 0.2, M['roof'], 0); d = 2 * HW / 16
    array(box('Pfette', 0.4, BAY, 0.7, -HW + d / 2, 0, HH - 0.35, M['frame'], 0.03), 16, (d, 0, 0))
    for q in range(8):
        x = -80.5 + q * 23.0
        box('Leuchtengehäuse', 10.0, 3.0, 0.35, x, 0, 37.0, M['wall4'], 0.04); [box('Leuchtband', 9.4, 0.5, 0.04, x, sy * 0.85, 36.81, M['e_roof'], 0) for sy in (-1, 1)]; box('Leuchtenraster', 9.6, 0.5, 0.06, x, 0, 36.82, M['frame'], 0.01)
        for (sx, sy) in ((-1, -1), (1, -1), (-1, 1), (1, 1)): cyl('Leuchtenabhängung', 0.04, 4.5, x + sx * 4.6, sy * 1.2, 39.4, M['steel'], 'Z', n=8, bev=0)
    for sx in (-1, 1):
        cyl('Luftkanal', 1.1, BAY, sx * 34.5, 0, 39.9, M['wall2'], 'Y', n=32, bev=0); array(cyl('Kanalflansch', 1.2, 0.16, sx * 34.5, -6, 39.9, M['frame'], 'Y', n=32, bev=0.02), 3, (0, 6, 0))
        box('Kanalauslass', 1.6, 2.4, 0.5, sx * 34.5, 3.0, 38.75, M['frame'], 0.04)
        for q in range(3): cyl('Löschleitung', 0.07, BAY, sx * (12 + q * 0.3), 0, 38.6, M['red' if q == 1 else 'steel'], 'Y', n=10, bev=0)
    for x in (-60.0, 0.0, 60.0):
        box('Kranschiene Dach', 0.5, BAY, 0.9, x, 0, 36.95, M['frame'], 0.04); box('Schienenmarke', 0.52, BAY, 0.2, x, 0, 37.2, M['ochre'], 0)
        for y in (-6, 0, 6): box('Schienenhänger', 0.3, 0.3, 4.3, x, y, 39.5, M['frame'], 0.03)
# ---------- Boden ----------
def h_boden(v):      # 18 × 18 m: geschnittene Platten, Ablaufrinne, Zurrpunkte, Spuren
    box('Bodengrund', BAY, BAY, 0.2, 0, 0, -0.17, M['frame'], 0); R = random.Random(30 + v)
    ys = ((-9, -3.3), (-2.7, 3), (3, 9))
    for i in range(3):
        for j, (y0, y1) in enumerate(ys): floorfield(-9 + i * 6, -3 + i * 6, y0, y1, 1 + (i + j * 2 + v) % 4, (i + j + v) % 2 == 0)
    box('Rinnenrahmen', BAY, 0.6, 0.06, 0, -3.0, -0.045, M['steel'], 0.006); array(box('Rinnenstab', 0.04, 0.5, 0.03, -8.94, -3.0, -0.012, M['grate'], 0), 150, (0.12, 0, 0)) if not SPIEL else box('Rinnenrost', BAY, 0.5, 0.03, 0, -3.0, -0.012, M['grate'], 0)      # im Spiel eine Fläche statt 150 Stäben
    ob = cyl('Zurrpunkt', 0.14, 0.012, -6, -6, 0.004, M['steel'], 'Z', n=8 if SPIEL else 14, bev=0); array(ob, 3, (6, 0, 0)); array(ob, 3, (0, 6, 0))
    if not SPIEL: ob = cyl('Zurrpunkt Ring', 0.2, 0.004, -6, -6, 0.002, M['paint_y'], 'Z', n=14, bev=0); array(ob, 3, (6, 0, 0)); array(ob, 3, (0, 6, 0))
    for q in range(4): spot((R.uniform(-7, 7), R.uniform(-7, 7), 0.0), R.uniform(0.6, 2.2), 'fleck', R.uniform(0.6, 1.6))
    for q in range(3):
        x, y, a = R.uniform(-6, 6), R.uniform(-2, 8), R.uniform(-0.5, 0.5)
        streak((x, y, 0.0), (math.cos(a), math.sin(a), 0), (-math.sin(a), math.cos(a), 0), 0.45, R.uniform(5, 9), 'spur')
def h_platz(hw):      # Stellplatz: Rahmen 2·hw × 104 m um die Platzmitte, Leitlinie zum Tor
    for sx in (-1, 1): box('Platzlinie', 0.3, 104.0, 0.004, sx * hw, 0, 0.004, M['paint_y'], 0); array(cyl('Platzlicht', 0.14, 0.03, sx * (hw + 0.6), -50, 0.012, M['e_pad'], 'Z', n=12, bev=0), 26, (0, 4, 0))
    for sy in (-1, 1):
        box('Platzlinie', 2 * hw, 0.3, 0.004, 0, sy * 52, 0.004, M['paint_y'], 0)
        for sx in (-1, 1):
            box('Platzecke', 5.0, 0.9, 0.004, sx * (hw - 2.5), sy * 51.4, 0.005, M['paint_w'], 0); box('Platzecke', 0.9, 5.0, 0.004, sx * (hw - 0.45), sy * 49.5, 0.005, M['paint_w'], 0)
    box('Haltebalken', 2 * hw - 12, 1.2, 0.004, 0, 50.6, 0.005, M['warnf'], 0)
    for y in (-30, -10, 10, 30):
        box('Platzstrahler', 2.2, 2.2, 0.4, 0, y, 36.25, M['wall4'], 0.05); box('Strahlerglas', 1.8, 1.8, 0.03, 0, y, 36.04, M['e_white'], 0)
        li = area('Platzstrahler Licht', (0, y, 36.0), (0, 0, 0), 1.8, 1.8, 5000, COOL); li.data.spread = 1.5; li.visible_camera = False
    annulus('Aufsetzkreis', 8.6, 9.0, (0, 0, 0.005), M['paint_w'], 72); annulus('Aufsetzkreis innen', 2.6, 2.9, (0, 0, 0.005), M['paint_y'], 48)
    for a in range(4): box('Aufsetzkreuz', 5.4, 0.3, 0.004, math.cos(a * PI / 2) * 5.8, math.sin(a * PI / 2) * 5.8, 0.005, M['paint_w'], 0, (0, 0, a * PI / 2))
    array(box('Leitlinie', 0.3, 3.0, 0.004, 0, -82.5, 0.004, M['paint_w'], 0), 12, (0, 6, 0))
    for sx in (-1, 1):      # Versorgungsschächte
        x = sx * (hw - 5.0)
        box('Schachtdeckel', 2.4, 1.6, 0.03, x, 30, 0.012, M['steel'], 0.008); box('Schachtrahmen', 2.7, 1.9, 0.02, x, 30, 0.004, M['paint_y'], 0)
        for q in (-1, 1): cyl('Deckelgriff', 0.08, 0.012, x + q * 0.8, 30, 0.03, M['frame'], 'Z', n=10, bev=0)
        text('VERSORGUNG', 0.3, (x + 1.25, 28.7, 0.006), (-1, 0, 0), (0, -1, 0), M['paint_w'])
