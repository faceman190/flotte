# Eisenkrone (Gildehütte, Raffinerie-Station), Hüttendeck: das Innere hinter dem Hangar, aus dem Baukasten der Bastion.
# Läuft nach bk_kit.py, bk_mehr.py und bk_med.py im selben Namensraum, in der eigenen Datei EisenkroneDeck.blend.
# Karte wie in bk_deck_d.py:  G Gang · g Gang mit Schott · H Tor zum Hangar · . Stationskörper · Großbuchstabe Raumzelle, Kleinbuchstabe mit Tür
#   A Annahme (Raffinerie, Markt, Lager) · E Leitstand mit Fenster in die Ofenhalle (Service) · O Gildenkontor (Aufträge, Missionen)
#   C Kantine (Auskunft, Galaxiekarte) · S Spinde · M Maschinenraum
# Neu gegenüber der Bastion: Fensterwand (Zustand F in raum_side), Fenster mit Leitpult, die Ofenhalle dahinter, Erzwaage, Erzkiste,
# Barrenstapel, Tafel der Gilde. bk_export.py macht daraus Modell und Daten (OPT: meta deck_ek_meta.json, glb EisenkroneDeck.glb, json deck_eisenkrone.json).
DECK_HELFER = True
exec(compile(open(os.path.join(HERE, 'bk_deck_d.py'), encoding='utf-8').read(), 'bk_deck_d.py', 'exec'))
plan_setzen([
    '..AAA..EEE..',
    '..AaA..EeE..',
    '.GGGGgGGGGG.',
    'HG.S.G.MM.G.',
    '.G.s.G.Mm.G.',
    '.GGGGGgGGGG.',
    '..OoO.CcC...',
    '..OOO.CCC...',
])
NAMES = {'A': 'ANNAHME · MARKT', 'E': 'LEITSTAND', 'O': 'GILDENKONTOR', 'C': 'KANTINE', 'S': 'SPINDE', 'M': 'MASCHINEN 1', 'H': 'HANGAR', '.': 'HANGAR'}
ORT = {'A': 'Annahme', 'E': 'Leitstand', 'O': 'Gildenkontor', 'C': 'Kantine', 'S': 'Spinde', 'M': 'Maschinenraum', 'G': 'Hüttendeck', 'H': 'Hüttendeck', 'P': 'Hüttendeck'}
MOOD = {'A': 'hell', 'E': 'dunkel', 'O': 'warm', 'C': 'warm', 'S': 'hell', 'M': 'dunkel'}
OFFEN = 'H'
choose_d, states_d = choose, states
def states(r, c):      # die Außenwand des Leitstands ist eine Fensterwand
    st = states_d(r, c)
    if at(r, c) == 'E' and st[0] == 'W': st[0] = 'F'
    return st
def choose(ch, r, c, k):
    if ch not in 'AEOC': return choose_d(ch, r, c, k)
    r0, r1, c0, c1 = ROOM[(r, c)]; i = (c - c0) if k in (0, 2) else (r - r0); hu = hull(r, c, k)
    if ch == 'A':      # Annahme: hinter den Tresen Regale und die Preistafel, an den Seiten Schränke
        if k == 0: return [pr('regal', 'schirm'), pr('regal', 'regal'), pr('schirm', 'regal')][i % 3]
        if k == 3: return pr('schrank', 'flaschen') if i == 0 else pr('gitter', 'feld3')
        if k == 1: return pr('regal', 'feuer') if i == 0 else pr('schrank', 'gitter')
        return pr('terminal', 'feld1') if i == 0 else pr('feld2', 'aushang')
    if ch == 'E':      # Leitstand: Bildwände an den Seiten, Schaltschränke an der Türwand
        if k in (1, 3): return pr('schirm', 'schirm') if i == 0 else pr('karte', 'schrank') if k == 1 else pr('schrank', 'terminal')
        return pr('schrank', 'feld3') if i == 0 else pr('feld1', 'feuer')
    if ch == 'O':      # Kontor: Fenster an der Außenwand, sonst Schränke, Karte und Aushang; die Westwand bleibt flach für die Tafel der Gilde
        if k == 2 and hu: return [pr('fenster', 'schrank'), pr('fenster', 'fenster'), pr('schrank', 'fenster')][i % 3]
        if k == 3: return pr('feld1', 'feld2') if i == 0 else pr('feld3', 'feld1')
        if k == 1: return pr('karte', 'schirm') if i == 0 else pr('schrank', 'aushang')
        return pr('aushang', 'feld2') if i == 0 else pr('feld3', 'schrank')
    # Kantine: Theke im Westen, Fenster und Bänke an der Außenwand, Grün im Osten
    if k == 3: return pr('theke', 'aushang') if i == 0 else pr('bank', 'feld2')
    if k == 2: return [pr('bank', 'fenster'), pr('fenster', 'fenster'), pr('fenster', 'bank')][i % 3] if hu else pr('bank', 'bank')
    if k == 1: return pr('pflanzwand', 'pflanzwand') if i == 0 else pr('bank', 'pflanzwand')
    return pr('schirm', 'feld1') if i == 0 else pr('feld2', 'karte')

# ---------- Stoffe der Hütte ----------
M['ofen'] = mk('Ofenmantel', (0.085, 0.06, 0.045), 0.6, 0.62, var=0.35, streak=0.5, bump=0.4, wear=0.8)
M['halle'] = mk('Hallenwand', (0.045, 0.047, 0.05), 0.5, 0.6, var=0.3, streak=0.4, bump=0.3)
M['erz'] = mk('Erz', (0.06, 0.045, 0.035), 0.55, 0.55, var=0.5, bump=0.6, grime=False)
M['eisen'] = mk('Barren Eisen', (0.3, 0.31, 0.33), 1.0, 0.38, var=0.2)
M['e_glut'] = mk('Glut', (1, 0.3, 0.05), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.26, 0.04), es=9, grime=False)
M['e_schmelze'] = mk('Schmelze', (1, 0.6, 0.2), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.52, 0.13), es=14, grime=False)
GLUT = (1.0, 0.42, 0.14)

# ---------- Fenster des Leitstands: gehört an eine Fensterwand (Zustand F), 4 m breit; davor das Pult der Schmelzer ----------
def d_ofenfenster():
    for z in (0.87, 2.13): box('Fensterriegel', 0.2, 3.76, 0.1, XL - 0.02, 0, z, M['frame'], 0.012)
    for y in (-1.83, 1.83): box('Fensterpfosten', 0.2, 0.1, 1.2, XL - 0.02, y, 1.5, M['frame'], 0.012)
    for y in (-0.61, 0.61): box('Fenstersprosse', 0.1, 0.05, 1.2, XL - 0.02, y, 1.5, M['frame'], 0.008)
    box('Hallenglas', 0.016, 3.6, 1.2, XL - 0.03, 0, 1.5, M['lens'], 0)
    for q in range(11): cyl('Rahmenschraube', 0.01, 0.012, XL + 0.083, -1.7 + q * 0.34, 0.87, M['steel'], 'X', n=6, bev=0)
    prism('Leitpult', [(XL, 0.12), (XL + 0.6, 0.12), (XL + 0.6, 0.74), (XL + 0.26, 0.84), (XL, 0.84)], -1.8, 1.8, M['cab'], 'Y', 0.015)
    box('Pultsockel', 0.5, 3.5, 0.12, XL + 0.25, 0, 0.06, M['frame'], 0.008); box('Pult Warnband', 0.012, 3.6, 0.08, XL + 0.606, 0, 0.2, M['warn'], 0)
    pipe('Fußstange', [(XL + 0.66, -1.7, 0.16), (XL + 0.66, 1.7, 0.16)], 0.018, M['steel'])
    for y in (-1.5, 0.0, 1.5): box('Fußstangenhalter', 0.1, 0.03, 0.03, XL + 0.62, y, 0.16, M['frame'], 0.004)
    sl = (0, 0.29, 0)      # Neigung der Pultfläche
    for (y, w) in ((-1.2, 0.62), (0.0, 0.5), (1.2, 0.62)):
        box('Pultschirm Rahmen', 0.28, w + 0.06, 0.016, XL + 0.43, y, 0.797, M['frame'], 0.005, sl); box('Pultschirm', 0.23, w, 0.006, XL + 0.43, y, 0.807, M['screen'], 0, sl)
    for sy in (-1, 1):
        for q in range(6): box('Pulttaste', 0.04, 0.045, 0.014, XL + 0.36 + (q % 2) * 0.1, sy * (0.46 + (q // 2) * 0.09), 0.815 - (q % 2) * 0.03, M['ochre' if q == 3 else 'wall2'], 0.004, sl)
        cyl('Hebelfuß', 0.035, 0.02, XL + 0.14, sy * 0.62, 0.85, M['frame'], 'Z', n=12, bev=0.004); pipe('Hebel', [(XL + 0.14, sy * 0.62, 0.85), (XL + 0.17, sy * 0.62, 0.99)], 0.008, M['steel'])
        cyl('Hebelknauf', 0.02, 0.03, XL + 0.172, sy * 0.62, 1.0, M['red' if sy < 0 else 'rubber'], 'Z', n=10, bev=0.006)
        for q in range(5): cyl('Pult-LED', 0.008, 0.008, XL + 0.1, sy * (1.0 + q * 0.07), 0.845, M[('e_green', 'e_green', 'e_amber', 'e_green', 'e_red')[q]], 'Z', n=8, bev=0)
    box('Typenschild', 0.004, 0.5, 0.07, XL + 0.603, 0, 0.56, M['platey'], 0); text('OFENLEITSTAND', 0.04, (XL + 0.606, -0.21, 0.545), LEFT_X, LEFT_Y, M['txtd'])
    area('Glutschein', (XL + 0.12, 0, 1.5), (0, -PI / 2, 0), 0.9, 3.2, 22, GLUT)      # was durch das Glas an Glut in den Raum fällt
    point('Pultschein', (XL + 0.5, 0, 1.15), 1.4, (0.1, 0.9, 0.8), 0.1)
DRESS['ofenfenster'] = (d_ofenfenster,)

# ---------- Ofenhalle hinter dem Fenster: ein Baustein, Ursprung in der mittleren Zelle des Leitstands; d = Abstand hinter der Wand ----------
def d_ofenhalle():
    X = lambda d: XL - 0.06 - d
    D, HW, Z0, Z1 = 23.0, 9.0, -4.6, 7.4
    box('Hallenboden', D, HW * 2, 0.3, X(D / 2), 0, Z0 - 0.15, M['floor2'], 0); box('Hallendach', D, HW * 2, 0.3, X(D / 2), 0, Z1 + 0.15, M['halle'], 0)
    box('Hallenwand hinten', 0.3, HW * 2, Z1 - Z0, X(D + 0.15), 0, (Z0 + Z1) / 2, M['halle'], 0)
    for sy in (-1, 1):
        box('Hallenwand Seite', D, 0.3, Z1 - Z0, X(D / 2), sy * (HW + 0.15), (Z0 + Z1) / 2, M['halle'], 0)
        for q in range(5): box('Hallenstütze', 0.5, 0.4, Z1 - Z0, X(2.5 + q * 4.8), sy * (HW - 0.2), (Z0 + Z1) / 2, M['frame'], 0.03)
        box('Kranbahn', D, 0.36, 0.5, X(D / 2), sy * (HW - 0.55), 5.2, M['frame'], 0.03); box('Kranschiene', D, 0.1, 0.08, X(D / 2), sy * (HW - 0.55), 5.49, M['steel'], 0.01)
        box('Wandriegel', D, 0.2, 0.3, X(D / 2), sy * (HW - 0.1), 0.6, M['frame'], 0.02)
    for q in range(5): box('Hallenstütze', 0.4, 0.5, Z1 - Z0, X(D - 0.2), -7.2 + q * 3.6, (Z0 + Z1) / 2, M['frame'], 0.03)
    for q in range(6): box('Dachbinder', 0.3, HW * 2, 0.6, X(1.4 + q * 4.2), 0, Z1 - 0.3, M['frame'], 0.03)
    for z in (-1.6, 2.6): box('Wandriegel', 0.2, HW * 2, 0.3, X(D - 0.1), 0, z, M['frame'], 0.02)
    box('Bodenstreifen', 0.16, HW * 2 - 1, 0.004, X(9.2), 0, Z0 + 0.003, M['ochre'], 0)
    # drei Drehöfen: Trommeln längs in die Tiefe, die Köpfe zum Fenster
    for n, y in enumerate((-5.7, 0.0, 5.7)):
        zc, r = -1.2, 1.9
        cyl('Trommel', r, 13.0, X(14.4), y, zc, M['ofen'], 'X', n=40, bev=0)
        for d in (9.6, 18.6): cyl('Laufring', r + 0.2, 0.5, X(d), y, zc, M['steel'], 'X', n=40, bev=0.03)
        cyl('Zahnkranz', r + 0.26, 0.34, X(13.9), y, zc, M['frame'], 'X', n=40, bev=0.03)
        for q in range(20):
            a = q * PI / 10; box('Zahn', 0.3, 0.16, 0.1, X(13.9), y + math.cos(a) * (r + 0.3), zc + math.sin(a) * (r + 0.3), M['frame'], 0.01, (a - PI / 2, 0, 0))
        for q in range(4): cyl('Mantelschuss', r + 0.035, 0.12, X(8.6 + q * 3.3), y, zc, M['ofen'], 'X', n=40, bev=0.01)
        for d in (9.6, 18.6):
            box('Rollenbock', 1.2, 4.2, Z0 * -1 + zc - r - 0.3, X(d), y, (Z0 + zc - r - 0.3) / 2, M['frame'], 0.04)
            for sy in (-1, 1): cyl('Tragrolle', 0.42, 0.6, X(d), y + sy * 1.55, zc - 1.99, M['steel'], 'X', n=24, bev=0.02)
        box('Antrieb', 1.4, 1.2, 1.4, X(13.9), y + 2.6, Z0 + 0.7, M['teal'], 0.05); cyl('Antriebswelle', 0.14, 1.6, X(13.9), y + 2.0, zc - r + 0.5, M['steel'], 'Y', n=16, bev=0)
        # Ofenkopf mit Schauloch, Glutfuge, Abstich und Abzug
        prism('Ofenkopf', [(y - 2.3, zc - 2.5), (y + 2.3, zc - 2.5), (y + 2.3, zc + 1.9), (y + 1.7, zc + 2.5), (y - 1.7, zc + 2.5), (y - 2.3, zc + 1.9)], X(7.9), X(6.3), M['halle'], 'X', 0.05)
        ring('Glutfuge', r + 0.03, 0.05, (X(7.93), y, zc), (1, 0, 0), M['e_glut'], 40)
        cyl('Schauloch Rahmen', 0.62, 0.16, X(6.26), y, zc + 0.3, M['frame'], 'X', n=32, bev=0.02); cyl('Schauloch', 0.48, 0.02, X(6.17), y, zc + 0.3, M['e_schmelze'], 'X', n=32, bev=0)
        for q in range(8):
            a = q * PI / 4; cyl('Kopfschraube', 0.05, 0.05, X(6.2), y + math.cos(a) * 0.56, zc + 0.3 + math.sin(a) * 0.56, M['steel'], 'X', n=6, bev=0)
        box('Brennerkasten', 0.8, 0.7, 0.7, X(5.95), y - 1.5, zc + 1.2, M['ochre'], 0.04); pipe('Brennerleitung', [(X(5.95), y - 1.5, zc + 1.55), (X(5.95), y - 1.5, zc + 3.4), (X(5.95), y - 2.6, zc + 3.4), (X(5.95), y - 2.6, Z1)], 0.09, M['copper'], rad=0.3)
        text(str(n + 1), 1.0, (X(6.28), y + 0.95, zc + 0.9), LEFT_X, LEFT_Y, M['txtw'])
        box('Abzug', 1.3, 1.5, Z1 - zc - 2.4, X(7.1), y, (Z1 + zc + 2.4) / 2, M['halle'], 0.04)
        for z in (2.6, 5.2): box('Abzugflansch', 1.42, 1.62, 0.14, X(7.1), y, z, M['frame'], 0.02)
        prism('Abstichrinne', [(X(6.4), zc - 2.5), (X(4.6), zc - 3.0), (X(4.6), zc - 2.75), (X(6.4), zc - 2.2)], y - 0.3, y + 0.3, M['frame'], 'Y', 0.02)
        box('Abstich', 1.86, 0.28, 0.03, X(5.5), y, zc - 2.45, M['e_schmelze'], 0, (0, 0.297, 0))
        area('Glut Ofenkopf', (X(5.2), y, zc + 0.3), (0, PI / 2, 0), 1.4, 1.4, 420, GLUT)
        area('Glut Abstich', (X(5.2), y, zc - 1.9), (0, 0, 0), 1.6, 0.6, 160, GLUT)
        point('Glut Fuge', (X(8.3), y + 2.5, zc + 0.6), 90, GLUT, 0.3)
    # Gießrinne quer vor den Köpfen, darin die Schmelze; Kokillenband zur Seite
    box('Gießrinne', 1.1, 16.4, 0.5, X(4.2), 0, -4.15, M['frame'], 0.04); box('Schmelze', 0.6, 16.0, 0.02, X(4.2), 0, -3.93, M['e_schmelze'], 0)
    for q in range(5): box('Rinnenbock', 0.9, 0.5, 0.2, X(4.2), -7.2 + q * 3.6, -4.5, M['frame'], 0.02)
    area('Glut Rinne', (X(4.2), 0, -3.6), (PI, 0, 0), 0.6, 15.0, 520, GLUT)
    # Laufsteg quer über die Trommeln, mit Geländer und Arbeitslicht
    box('Laufsteg', 1.3, HW * 2 - 0.8, 0.08, X(12.0), 0, 1.5, M['floor2'], 0.01)
    for sx in (-1, 1):
        pipe('Handlauf', [(X(12.0 + sx * 0.62), -HW + 0.5, 2.55), (X(12.0 + sx * 0.62), HW - 0.5, 2.55)], 0.03, M['ochre']); pipe('Knieleiste', [(X(12.0 + sx * 0.62), -HW + 0.5, 2.05), (X(12.0 + sx * 0.62), HW - 0.5, 2.05)], 0.02, M['ochre'])
        for q in range(10): box('Geländerpfosten', 0.05, 0.05, 1.05, X(12.0 + sx * 0.62), -8.1 + q * 1.8, 2.05, M['ochre'], 0.008)
    for y in (-8.3, -2.85, 2.85, 8.3): box('Stegstütze', 0.2, 0.2, 1.5 - Z0, X(12.0), y, (1.5 + Z0) / 2, M['frame'], 0.02)
    for y in (-2.85, 2.85):
        box('Stegleuchte', 0.2, 1.2, 0.08, X(12.0), y, 4.6, M['frame'], 0.01); box('Stegleuchte Glas', 0.14, 1.1, 0.02, X(12.0), y, 4.555, M['e_white'], 0)
        for sy in (-1, 1): pipe('Leuchtenhänger', [(X(12.0), y + sy * 0.5, 4.64), (X(12.0), y + sy * 0.5, Z1)], 0.012, M['steel'])
        area('Arbeitslicht', (X(12.0), y, 4.5), (0, 0, 0), 0.2, 1.2, 600, COOL)
    # Laufkran mit Gießpfanne nahe am Fenster
    box('Kranbrücke', 0.8, HW * 2 - 1.0, 0.7, X(3.0), 0, 5.9, M['ochre'], 0.04); box('Laufkatze', 1.2, 1.4, 0.5, X(3.0), 3.0, 5.35, M['frame'], 0.04)
    for (dx, dy) in ((-0.4, -0.45), (0.4, -0.45), (-0.4, 0.45), (0.4, 0.45)): pipe('Kranseil', [(X(3.0 + dx), 3.0 + dy, 5.1), (X(3.0 + dx * 0.5), 3.0 + dy * 1.9, 0.75)], 0.018, M['steel'])
    box('Pfannengehänge', 0.24, 2.3, 0.2, X(3.0), 3.0, 0.7, M['frame'], 0.03)
    for sy in (-1, 1): box('Gehängearm', 0.2, 0.12, 1.3, X(3.0), 3.0 + sy * 1.08, 0.05, M['frame'], 0.02); cyl('Pfannenzapfen', 0.11, 0.3, X(3.0), 3.0 + sy * 1.02, -0.5, M['steel'], 'Y', n=16, bev=0.01)
    cyl('Gießpfanne', 0.78, 1.5, X(3.0), 3.0, -0.75, M['ofen'], 'Z', n=36, bev=0.03, r2=0.95); cyl('Pfannenrand', 0.99, 0.1, X(3.0), 3.0, 0.02, M['frame'], 'Z', n=36, bev=0.02)
    cyl('Pfannenbad', 0.86, 0.02, X(3.0), 3.0, -0.06, M['e_schmelze'], 'Z', n=36, bev=0)
    area('Glut Pfanne', (X(3.0), 3.0, 0.5), (PI, 0, 0), 1.2, 1.2, 260, GLUT)
    # Rohre an der Rückwand, Warnleuchten
    for q, (z, rr, mat) in enumerate(((3.6, 0.22, 'white'), (4.3, 0.14, 'teal'), (0.0, 0.3, 'ofen'))): pipe('Wandrohr', [(X(D - 0.6), -HW + 0.4, z), (X(D - 0.6), HW - 0.4, z)], rr, M[mat])
    for y in (-8.2, 8.2): cyl('Warnleuchte', 0.12, 0.1, X(D - 0.42), y, 3.0, M['e_amber'], 'X', n=12, bev=0)
    for y in (-2.85, 2.85): cyl('Warnleuchte', 0.1, 0.1, X(7.95), y, 3.2, M['e_red'], 'X', n=12, bev=0)

# ---------- Objekte der Annahme und des Kontors ----------
def brocken(r, x, y, z, seed):
    R = random.Random(seed); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=r)
    for v in bm.verts: v.co *= R.uniform(0.74, 1.1)
    me = bpy.data.meshes.new('Erzbrocken'); bm.to_mesh(me); bm.free(); me.materials.append(M['erz'])
    ob = link(bpy.data.objects.new('Erzbrocken', me)); ob.location = (x, y, z); ob.rotation_euler = (R.uniform(0, 6), R.uniform(0, 6), R.uniform(0, 6)); ob.scale = (1, R.uniform(0.75, 1), R.uniform(0.6, 0.9)); return ob
def p_erzkiste():      # offene Kiste voll Erz
    box('Kistenboden', 1.0, 0.8, 0.06, 0, 0, 0.13, M['crate'], 0.008)
    for sx in (-1, 1): box('Kistenwand', 0.05, 0.8, 0.5, sx * 0.475, 0, 0.38, M['crate'], 0.008); box('Kistenkufe', 0.12, 0.8, 0.1, sx * 0.36, 0, 0.05, M['frame'], 0.008)
    for sy in (-1, 1): box('Kistenwand', 0.9, 0.05, 0.5, 0, sy * 0.375, 0.38, M['crate'], 0.008); box('Kistenband', 1.02, 0.012, 0.08, 0, sy * 0.403, 0.5, M['ochre'], 0)
    R = random.Random(41)
    for q in range(26): brocken(R.uniform(0.09, 0.17), R.uniform(-0.33, 0.33), R.uniform(-0.25, 0.25), 0.42 + R.uniform(0, 0.2), q)
    label('ERZ · UNGEPRÜFT', 0.03, (-0.2, -0.41, 0.3), (1, 0, 0), (0, 0, 1), 'platey')
def p_waage():      # Bodenwaage der Annahme mit Anzeige
    prism('Waage Rampe', [(-0.85, 0), (0.85, 0), (0.75, 0.08), (-0.75, 0.08)], -0.6, 0.6, M['frame'], 'Y', 0.006); box('Waage Platte', 1.4, 1.1, 0.03, 0, 0, 0.095, M['steel'], 0.006)
    for sy in (-1, 1): box('Waage Warnkante', 1.4, 0.06, 0.004, 0, sy * 0.5, 0.112, M['warn'], 0)
    box('Waage Säule', 0.1, 0.1, 1.3, 0.78, 0.5, 0.65, M['wall2'], 0.012); box('Waage Kopf', 0.12, 0.44, 0.3, 0.76, 0.5, 1.4, M['frame'], 0.014); box('Waage Anzeige', 0.006, 0.36, 0.2, 0.697, 0.5, 1.41, M['screen'], 0)
    cyl('Waage LED', 0.01, 0.01, 0.697, 0.34, 1.28, M['e_green'], 'X', n=8, bev=0); point('Anzeigenlicht', (0.5, 0.5, 1.4), 1.0, (0.1, 0.9, 0.8), 0.08)
def p_barren(mat='eisen', voll=4):      # Palette mit gestapelten Barren
    box('Palette', 1.2, 0.84, 0.03, 0, 0, 0.135, M['crate'], 0.006)
    for q in range(3): box('Palettenkufe', 0.12, 0.84, 0.12, -0.5 + q * 0.5, 0, 0.06, M['frame'], 0.006)
    R = random.Random(len(mat) * 7 + voll)
    for lay in range(voll):
        z = 0.15 + lay * 0.085
        for i in range(5):
            for j in range(2):
                if lay == voll - 1 and R.random() < 0.4: continue
                x = -0.46 + i * 0.23 + R.uniform(-0.008, 0.008); y0 = -0.4 + j * 0.41 + R.uniform(-0.006, 0.006)
                prism('Barren', [(x - 0.1, z), (x + 0.1, z), (x + 0.075, z + 0.08), (x - 0.075, z + 0.08)], y0, y0 + 0.38, M[mat], 'Y', 0.006)
    box('Spannband', 0.03, 0.86, 0.004, 0.0, 0, 0.15 + (voll - 1) * 0.085 + 0.001, M['rubber'], 0)
def p_gildentafel():      # Tafel der Bergbaugilde an der Wand (Rückseite bei x = 0, Blick von +x)
    box('Tafel', 0.04, 2.6, 0.9, 0.02, 0, 1.72, M['frame'], 0.014); box('Tafelfeld', 0.012, 2.48, 0.78, 0.046, 0, 1.72, M['wall4'], 0)
    ring('Gildenring', 0.26, 0.022, (0.06, -0.86, 1.72), (1, 0, 0), M['copper'], 32)
    box('Hammerstiel', 0.02, 0.03, 0.4, 0.06, -0.86, 1.72, M['copper'], 0.004, (0.6, 0, 0)); box('Hammerkopf', 0.03, 0.16, 0.07, 0.06, -0.86 + 0.105, 1.72 + 0.155, M['copper'], 0.006, (0.6, 0, 0))
    box('Hackenstiel', 0.02, 0.03, 0.4, 0.06, -0.86, 1.72, M['copper'], 0.004, (-0.6, 0, 0)); box('Hackenblatt', 0.03, 0.2, 0.035, 0.06, -0.86 - 0.105, 1.72 + 0.155, M['copper'], 0.006, (-0.6 + 0.25, 0, 0))
    text('BERGBAUGILDE', 0.17, (0.053, -0.46, 1.76), LEFT_X, LEFT_Y, M['txtw']); text('KONTOR EISENKRONE  ·  HÜTTE 1', 0.07, (0.053, -0.46, 1.56), LEFT_X, LEFT_Y, M['txto'])
    box('Tafellicht', 0.03, 2.4, 0.02, 0.07, 0, 2.2, M['e_warm'], 0); area('Tafellicht', (0.25, 0, 2.25), (0, 0.9, 0), 0.05, 2.2, 14, WARM)
PROP.update({'erzkiste': p_erzkiste, 'waage': p_waage, 'barren': p_barren, 'barren_cu': (lambda: p_barren('copper', 3)), 'gildentafel': p_gildentafel,
             'schleuse': (lambda: p_schleuse('HÜTTENDECK'))})

# ---------- Angaben für das Spiel ----------
SPOTS = []
def meister(tab, x, y, face, tx, ty, titel, satz): SPOTS.append({'tab': tab, 'x': x, 'y': y, 'face': face, 'tx': tx, 'ty': ty, 'titel': titel, 'satz': satz})
ROUTES = [
    # Annahme ↔ Kantine: durch das Schott und den Mittelgang
    hin_und_her([stop(12.0, -2.1, 90, [7, 14], 0.9, 'markt'), [12.0, -4.6], [12.0, -6.4], Z(2, 3, 0.6, -0.4), Z(2, 4, 0, -0.4), Z(2, 5, -0.4, -0.4), Z(3, 5, -0.4), Z(4, 5, -0.4), Z(5, 5, -0.4, 0.4),
                 Z(5, 6, 0, 0.4), Z(5, 7, -0.4, 0.4), [28.0, -21.6], [28.0, -23.6], stop(27.6, -27.2, -90, [8, 16], 0.9)]),
    # Runde über den äußeren Gang, mit Halt vor dem Leitstand
    [Z(2, 1, 0.4, 0.4), Z(3, 1, 0.4), Z(4, 1, 0.4), Z(5, 1, 0.4, -0.4), Z(5, 3, 0, -0.4), Z(5, 5, 0, -0.4), Z(5, 8, 0, -0.4), Z(5, 10, -0.4, -0.4), Z(4, 10, -0.4), Z(3, 10, -0.4), Z(2, 10, -0.4, 0.4),
     stop(34.6, -7.6, 90, [5, 10], 0.4), Z(2, 6, 0, 0.4), Z(2, 3, 0, 0.4)],
    # Leitstand ↔ Kontor
    hin_und_her([stop(33.9, -3.4, 0, [6, 12], 0.9, 'service'), [32.0, -4.6], [32.0, -6.4], Z(2, 8, -0.6, -0.5), Z(2, 6, 0, -0.5), Z(2, 5, 0.4, -0.4), Z(3, 5, 0.4), Z(4, 5, 0.4), Z(5, 5, 0.4, 0.2), Z(5, 4, 0, 0.2), Z(5, 3, 0.4, 0.2),
                 [12.0, -21.6], [12.0, -23.6], stop(10.2, -25.2, 180, [7, 14], 0.9, 'auftraege')]),
]
CHATS = [[24.6, -24.7, 3], [16.3, -4.4, 2]]
KARTE_XY = [31.0, -27.0]      # Galaxiekarte (Holo-Kugel in der Kantine)
def furnish():
    # Leitstand (Zeilen 0–1, Spalten 7–9): Fenster in die Ofenhalle über die ganze Nordwand, Service-Tresen im Osten, der Schmelzmeister am Pult
    for c in (7, 8, 9): inst(dress('ofenfenster'), cellpos(0, c), ANG[0], C_DECK)
    inst(module('Ofenhalle', d_ofenhalle), cellpos(0, 8), ANG[0], C_DECK)
    put('tresen_service', 35.6, -2.6, -PI / 2); staff('service', 36.55, -2.6, 180, 34.1, -2.6)
    meister('schmelzer', 29.9, 0.3, 65, 29.9, -1.1, 'Schmelzmeister', 'Trommel zwei läuft heiß. Fass nichts an, was glüht, und stell dich nicht unter die Pfanne.')
    put('sessel', 27.4, -3.6, 0.9); put('stehtisch', 28.6, -4.3, 0.4); put('tonne', 26.8, -5.2); put('stuhl', 32.6, 0.1, PI / 2); put('stuhl', 35.4, 0.15, PI / 2 + 0.3)
    # Annahme (Zeilen 0–1, Spalten 2–4): drei Tresen vor den Regalen, Tür im Süden; Erzwaage, Erz und Barren
    for (tab, x) in (('raffinerie', 8.4), ('markt', 12.0), ('lager', 15.6)): put('tresen_' + tab, x, -0.5, 0.0); staff(tab, x, 0.45, -90, x, -2.0)
    put('waage', 8.1, -4.5, 0.0); put('erzkiste', 8.1, -4.5, 0.0); put('erzkiste', 9.9, -5.0, 0.3); put('barren', 16.6, -3.3, 0.05); put('barren_cu', 16.7, -5.0, PI / 2); put('karre', 14.6, -5.0, 2.6)
    # Gildenkontor (Zeilen 6–7, Spalten 2–4): Pult der Aufträge vor der Tafel der Gilde, Tisch der Missionen, Tür im Norden
    put('gildentafel', 6.34, -26.0, 0.0); put('pult', 8.3, -26.0, 0.0); staff('auftraege', 7.45, -26.0, 0, 9.8, -26.0)
    put('tisch', 14.2, -27.0)
    for q in range(3): put('stuhl', 13.4 + q * 0.8, -25.78, -PI / 2); put('stuhl', 13.4 + q * 0.8, -28.22, PI / 2)
    staff('missionen', 16.5, -24.3, 215, 15.3, -24.5); put('pendel', 13.4, -27.0); put('pendel', 15.0, -27.0); put('pflanze', 7.0, -23.0); put('tonne', 17.0, -22.9); put('saeule', 9.6, -23.0, 0.0)
    # Kantine (Zeilen 6–7, Spalten 6–8): Tische, Galaxiekarte und Auskunft im Osten
    put('messtisch', 24.6, -28.0); put('messtisch', 27.9, -28.6); put('stehtisch', 26.6, -26.4, 0.7); put('holo', 31.0, -27.0); put('automat', 33.35, -23.4, PI)
    for (x, y) in ((24.6, -28.0), (27.9, -28.6), (26.6, -26.4)): put('pendel', x, y)
    staff('info', 32.2, -25.3, -135, 31.0, -25.2); put('pflanze', 23.0, -29.2); put('tonne', 29.8, -22.9)
    # Maschinenraum, Gänge
    put('wagen', 31.0, -16.9, 0.4); put('fass', 29.0, -11.2); put('absperrung', 33.2, -15.0)
    put('kisten', 9.0, -18.85, PI / 2); put('fass', 3.0, -19.0); put('karre', 21.1, -13.6, 1.4); put('trommel', 38.8, -21.2, 2.0); put('tonne', 16.0, -6.9); put('barren', 24.6, -9.1, 0.0)
    put('kisten', 41.15, -14.0, 0.0); put('erzkiste', 14.0, -21.1, 0.0); put('fass', 38.4, -6.8); put('fass', 39.0, -6.9)
    put('schleuse', 0.0, -12.0, 0.0)
    wegweiser(5.3, -12.0, PI, ['<<<  ANNAHME  ·  LEITSTAND', 'GILDENKONTOR  ·  KANTINE  >>>'])
    wegweiser(21.3, -16.0, PI, ['<<<  LEITSTAND  ·  OFENHALLE', 'KANTINE  ·  MASCHINEN 1  >>>'])
def cameras():
    w, h = len(PLAN[0]) * CELL, len(PLAN) * CELL
    ocam('Plan', (w / 2 - 2, -h / 2 + 2, 60), (w / 2 - 2, -h / 2 + 2.001, 0), w + 3)
    cam('A Leitstand', (35.6, -5.0, 1.7), (28.0, 3.0, 1.2), 15)
    cam('B Ofenblick', (32.0, -0.6, 1.7), (31.5, 14.0, -1.0), 14)
    cam('C Annahme', (17.0, -5.2, 1.6), (8.6, 0.8, 1.2), 16)
    cam('D Annahme Waage', (13.6, -1.9, 1.6), (8.4, -5.2, 0.6), 18)
    cam('E Kontor', (16.9, -22.9, 1.6), (7.0, -28.0, 1.3), 16)
    cam('F Kantine', (23.0, -23.0, 1.6), (32.4, -28.6, 1.1), 16)
    cam('G Gang', (4.6, -8.3, 1.5), (30.0, -8.0, 1.3), 20)
    cam('H Schleuse', (-7.0, -10.6, 1.6), (0.0, -12.0, 1.9), 22)
    cam('I Mittelgang', (20.4, -19.4, 1.5), (20.0, -6.0, 1.3), 18)
    cam('J Ofenhalle', (32.0, 2.4, 3.2), (32.0, 16.0, -1.2), 13)
N_CELLS = assemble(); furnish(); cameras(); meta_schreiben('deck_ek_meta.json')
result = {'zellen': N_CELLS, 'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'objekte': len(bpy.data.objects), 'tueren': len(DOORS), 'personal': len(SPOTS)}
