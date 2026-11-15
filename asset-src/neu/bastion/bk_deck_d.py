# Bastion, Deck 3 nach Plan D („Verwinkelt“), ohne Promenade: Die Dienste der Station stehen in den Räumen.
# Läuft nach bk_kit.py, bk_mehr.py und bk_med.py im selben Namensraum, in der eigenen Datei BastionDeckD.blend.
# Karte: G Gang · g Gang mit Schott · H Tor zum Hangar (offen) · P Schott zum nächsten Deck (geschlossen) · . Schiffskörper
#   Großbuchstabe = Raumzelle, Kleinbuchstabe = Raumzelle mit Tür zum angrenzenden Gang
# Helfer (states, assemble, wegweiser, Welt, Kameras, Rendern) kommen aus bk_plan.py; hier stehen Karte, Regeln, Einrichtung und die Angaben
# für das Spiel (Personalplätze, Laufwege, Gesprächsgruppen). bk_export.py macht daraus Modell und Daten.
import json
NUR_HELFER = True
exec(compile(open(os.path.join(HERE, 'bk_plan.py'), encoding='utf-8').read(), 'bk_plan.py', 'exec'))
KARTE = [
    '..WWW....BBBB........',
    '..WwW.MM.BBBB..KKK...',
    '.GGGG.Mm.BbBB..KkK.QQ',
    '.G..GgGGGGG..GGGGG.Qq',
    'HG.S..G......g.Q.GGGG',
    '.G.s..G.TTT..G.q.G...',
    '.GGGG.GGtTtGGGGG.GGGP',
    '..LlL.G.TTT..G.......',
    '..LLL.GGGGgGGG.......',
]
NAMES = {'T': 'TREFFPUNKT', 'B': 'BESPRECHUNG', 'M': 'MASCHINEN 2', 'S': 'SPINDE', 'L': 'LAGER · MARKT', 'Q': 'QUARTIER', 'W': 'WERKSTATT · WERFT', 'K': 'KRANKENSTATION', 'H': 'HANGAR', 'P': 'DECK 2', '.': 'HANGAR'}
ORT = {'T': 'Treffpunkt', 'B': 'Besprechung', 'M': 'Maschinenraum', 'S': 'Spinde', 'L': 'Lager', 'Q': 'Quartier', 'W': 'Werkstatt', 'K': 'Krankenstation', 'G': 'Deck 3', 'H': 'Deck 3', 'P': 'Deck 3'}
MOOD = {'T': 'warm', 'B': 'dunkel', 'M': 'dunkel', 'S': 'hell', 'L': 'hell', 'Q': 'warm', 'W': 'hell', 'K': 'hell'}
OFFEN = 'H'      # dieses Tor steht offen (Übergang zum Hangar)
def kat(r, c): return KARTE[r][c] if 0 <= r < len(KARTE) and 0 <= c < len(KARTE[0]) else '.'
PLAN = [''.join('G' if ch == 'g' else ch.upper() for ch in row) for row in KARTE]
DOORS = set(); BULK = set()
for r, row in enumerate(KARTE):
    for c, ch in enumerate(row):
        if ch == 'g': BULK.add((r, c, 3) if (kat(r, c - 1) in 'GgHP' and kat(r, c + 1) in 'GgHP') else (r, c, 2))
        elif ch.islower():
            for (dr, dc) in DIRS:
                if kat(r + dr, c + dc) in 'GgHP': DOORS.add(frozenset(((r + dr, c + dc), (r, c))))
ROOM = {}      # Raumzelle → Grenzen ihres Raums (Zeile von/bis, Spalte von/bis)
for r, row in enumerate(PLAN):
    for c, ch in enumerate(row):
        if ch in '.GHP' or (r, c) in ROOM: continue
        cells = [(r, c)]; seen = {(r, c)}
        for (a, b) in cells:
            for (dr, dc) in DIRS:
                p = (a + dr, b + dc)
                if p not in seen and at(*p) == ch: seen.add(p); cells.append(p)
        box_ = (min(a for a, b in cells), max(a for a, b in cells), min(b for a, b in cells), max(b for a, b in cells))
        for p in cells: ROOM[p] = box_
def hull(r, c, k):      # liegt hinter dieser Wand nur noch Schiffskörper bis zum Rand (Außenwand)?
    dr, dc = DIRS[k]; a, b = r + dr, c + dc
    while 0 <= a < len(PLAN) and 0 <= b < len(PLAN[0]):
        if PLAN[a][b] != '.': return False
        a += dr; b += dc
    return True
def pr(a, b): return [(a, -1), (b, 1)]
def choose(ch, r, c, k):      # Wandfüllungen einer Wandseite, nach Raumart und Lage im Raum (gilt für jede Karte, nicht nur für diese)
    R = random.Random(r * 131 + c * 17 + k * 7)
    if ch in 'GHP':
        if R.random() < 0.2: return pr('rohr_a', 'rohr_b')
        pool = ['feld1'] * 3 + ['feld2'] * 3 + ['feld3'] * 2 + ['feldh1'] * 3 + ['feldh2'] * 3 + ['gitter'] * 2 + ['tuer1', 'tuer2'] * 2 + ['terminal', 'schrank', 'feuer', 'aushang', 'karte', 'luke', 'flaschen']
        return pr(R.choice(pool), R.choice(pool))
    r0, r1, c0, c1 = ROOM[(r, c)]; i = (c - c0) if k in (0, 2) else (r - r0); hu = hull(r, c, k)
    if ch == 'T':
        if k == 0: return [pr('theke', 'aushang'), pr('schirm', 'schirm'), pr('pflanzwand', 'pflanzwand')][i % 3]
        if k == 2: return [pr('bank', 'bank'), pr('karte', 'bank'), pr('pflanzwand', 'bank')][i % 3]
        return pr('bank', 'feld1') if i == 0 else pr('feld2', 'bank')
    if ch == 'B':
        if hu and k in (0, 2): return pr('fenster', 'fenster')
        if k == 1: return pr('schirm', 'schirm')
        if k == 3: return [pr('feld3', 'aushang'), pr('karte', 'feld1'), pr('feld2', 'feld3')][i % 3]
        return pr(R.choice(['feld3', 'feld1']), R.choice(['feld2', 'feld3']))
    if ch == 'M':
        if k == 0: return [('pumpe', 0)] if i == 0 else pr('tauscher', 'schrank')
        if k == 2: return pr('rohr_a', 'rohr_b')
        return pr('schrank', 'flaschen') if k == 3 else pr('gitter', 'schrank')
    if ch == 'S': return pr('spind', 'bank' if (k == 1 and i == 0) else 'spind')
    if ch == 'L': return pr('feld3', 'gitter') if k == 0 else pr('regal', 'regal')      # Regale an drei Seiten, die Tresen stehen davor
    if ch == 'Q':
        if k in (0, 2): return (pr('fenster', 'bank') if i == 0 else pr('spind', 'spind')) if hu else pr('spind', 'aushang')
        return pr('kojen', 'kojen') if i == 0 else pr('kojen', 'spind')
    if ch == 'W':
        if k == 0: return pr('werkbank', 'werkbank')
        if k == 3: return pr('regal', 'flaschen') if i == 0 else pr('schrank', 'regal')
        if k == 1: return pr('werkbank', 'feuer') if i == 0 else pr('regal', 'gitter')
        return pr('schrank', 'regal')
    if ch == 'K':      # Betten an der Außenwand, dazwischen ein Fenster; Schränke und Waschplatz an den Seiten
        if k == 0: return [pr('liege1', 'liege2'), pr('fenster', 'fenster'), pr('liege3', 'liege4')][i % 3] if hu else pr('feld1', 'feld2')
        if k == 3: return pr('medschrank', 'feld1') if i == 0 else pr('waschplatz', 'medschrank')
        if k == 1: return pr('feld2', 'diagnose') if i == 0 else pr('medschrank', 'aushang')
        return pr('feld1', 'schrank') if i == 0 else pr('feuer', 'feld2')
    return pr('feld1', 'feld2')

# ---------- Tresen der Dienste (ersetzen die Stände der Promenade); Vorderseite zeigt nach −y, das Personal steht dahinter ----------
def p_tresen(tag, lamp='e_cool'):
    box('Tresen', 2.2, 0.7, 1.0, 0, 0, 0.5, M['cab'], 0.02); box('Tresenplatte', 2.32, 0.82, 0.05, 0, 0, 1.025, M['frame'], 0.012); box('Tresensockel', 2.22, 0.72, 0.1, 0, 0, 0.05, M['frame'], 0.008)
    prism('Tresenfeld', inset([(-1.0, 0.28), (1.0, 0.28), (1.0, 0.82), (0.9, 0.92), (-1.0, 0.92)], 0.0), -0.38, -0.35, M['wall2'], 'Y', 0.006)
    box('Tresen Warnband', 2.21, 0.012, 0.12, 0, -0.357, 0.18, M['warn'], 0); box('Tresenlicht', 2.0, 0.02, 0.02, 0, -0.39, 0.985, M[lamp], 0)
    text(tag, 0.13, (-len(tag) * 0.13 * 0.32, -0.383, 0.54), (1, 0, 0), (0, 0, 1), M['txtw'])
    for sx in (-1, 1): box('Schildpfosten', 0.06, 0.06, 1.3, sx * 1.06, 0.3, 1.7, M['frame'], 0.008)
    box('Schildtafel', 2.2, 0.05, 0.34, 0, 0.3, 2.32, M['frame'], 0.012); box('Schildfeld', 2.1, 0.012, 0.26, 0, 0.27, 2.32, M['glass'], 0)
    text(tag, 0.15, (-len(tag) * 0.15 * 0.32, 0.263, 2.26), (1, 0, 0), (0, 0, 1), M[lamp]); box('Schildlicht', 2.0, 0.03, 0.02, 0, 0.26, 2.5, M[lamp], 0)
    box('Tresenschirm', 0.5, 0.03, 0.34, -0.55, 0.12, 1.26, M['frame'], 0.008, (0.3, 0, 0)); box('Tresenbild', 0.44, 0.006, 0.28, -0.55, 0.137, 1.265, M['screen'], 0, (0.3, 0, 0))
    box('Schirmfuß', 0.08, 0.08, 0.1, -0.55, 0.1, 1.09, M['frame'], 0.008); box('Lesefeld', 0.3, 0.2, 0.012, 0.3, -0.12, 1.056, M['e_teal'], 0); box('Lesegerät', 0.36, 0.26, 0.02, 0.3, -0.12, 1.06, M['frame'], 0.006)
    box('Ablagekiste', 0.34, 0.28, 0.2, 0.82, 0.08, 1.15, M['crate'], 0.012); box('Tresenkabel', 0.02, 0.5, 0.012, 0.0, 0.2, 1.056, M['rubber'], 0.004)
    area('Tresenlicht', (0, -0.2, 2.2), (0, 0, 0), 1.8, 0.3, 30, COOL if lamp == 'e_cool' else WARM)
TRESEN = {'markt': 'MARKT', 'ausruester': 'AUSRÜSTER', 'raffinerie': 'RAFFINERIE', 'lager': 'LAGER', 'werft': 'WERFT', 'werkstatt': 'WERKSTATT', 'service': 'SERVICE'}
for k_, t_ in TRESEN.items(): PROP['tresen_' + k_] = (lambda t=t_: p_tresen(t))
def p_schleuse():      # Übergang zum Hangar: füllt die Öffnung der Hangarrückwand (6 × 4,6 m) um das offene Tor der Gangzelle; Hangar liegt bei −x
    xa, xb = -2.55, -2.0
    prism('Schleusenrahmen', [(-3.15, 0), (-2.0, 0), (-2.0, 3.3), (-1.6, 3.7), (1.6, 3.7), (2.0, 3.3), (2.0, 0), (3.15, 0), (3.15, 4.8), (-3.15, 4.8)], xa, xb, M['frame'], 'X', 0.04)
    box('Schleuse Leuchtband', 0.04, 3.0, 0.1, xa - 0.01, 0, 3.9, M['e_teal'], 0); box('Schleuse Schild', 0.04, 3.4, 0.5, xa - 0.01, 0, 4.3, M['wall4'], 0.01)
    text('DECK 3', 0.28, (xa - 0.035, 0.58, 4.2), RIGHT_X, RIGHT_Y, M['txtw'])
    for sy in (-1, 1):
        box('Schleuse Warnband', 0.012, 0.9, 1.0, xa - 0.006, sy * 2.6, 0.6, M['warn'], 0); cyl('Schleuse Leuchte', 0.06, 0.05, xa - 0.02, sy * 2.6, 2.6, M['e_amber'], 'X', n=12, bev=0)
        box('Schleuse Lichtfuge', 0.3, 0.06, 2.2, -2.28, sy * 1.97, 1.5, M['e_cool'], 0)
PROP['schleuse'] = p_schleuse

# ---------- Angaben für das Spiel (Plankoordinaten: x nach Osten, y nach Norden, Zellmitte = Spalte · 4, −Zeile · 4) ----------
SPOTS = []      # Personal: Dienst, Standort, Blickrichtung (Grad, 0 = Osten, 90 = Norden), Ansprechpunkt
def staff(tab, x, y, face, tx, ty): SPOTS.append({'tab': tab, 'x': x, 'y': y, 'face': face, 'tx': tx, 'ty': ty})
def Z(r, c, dx=0.0, dy=0.0): return [c * CELL + dx, -r * CELL + dy]
def stop(x, y, face, t, p, who=None): return [x, y, {'face': face, 't': t, 'p': p, 'who': who}]
def hin_und_her(n): return n + n[-2:0:-1]
ROUTES = [
    # Werkstatt ↔ Lager, am Hangartor vorbei
    hin_und_her([stop(12.0, -2.1, 90, [7, 14], 0.9, 'werkstatt'), [12.0, -4.6], [12.0, -6.4], Z(2, 3, 0, -0.4), Z(2, 2, 0, -0.4), Z(2, 1, 0.4, -0.4), Z(3, 1, 0.4), Z(4, 1, 0.4), Z(5, 1, 0.4), Z(6, 1, 0.4, 0.4),
                 Z(6, 2, 0, 0.4), Z(6, 3, 0, 0.4), [12.0, -25.8], [12.0, -27.6], stop(7.8, -28.7, -90, [7, 14], 0.9, 'markt')]),
    # Runde durch die Mitte: am Maschinenraum hinunter, durch den Treffpunkt, über den Südgang zurück
    [Z(3, 6, 0.4), Z(4, 6, 0.4), Z(5, 6, 0.4), Z(6, 6, 0.4), Z(6, 7), [30.2, -24.0], [33.0, -24.0], stop(36.0, -23.0, 90, [6, 12], 0.4), [39.0, -24.0], [41.8, -24.0], Z(6, 11), Z(6, 12), Z(6, 13, -0.4),
     Z(7, 13, -0.4), Z(8, 13, -0.4, 0.4), Z(8, 10, 0, 0.4), Z(8, 7, 0, 0.4), Z(8, 6, 0.4, 0.4), Z(7, 6, 0.4)],
    # Osten: vom Treffpunkt zur Krankenstation und zum Schott von Deck 2
    hin_und_her([Z(6, 13, 0.4), Z(5, 13, 0.4), Z(4, 13, 0.4), Z(3, 13, 0.4, -0.4), Z(3, 15, 0, -0.4), stop(64.0, -11.4, 90, [5, 10], 0.3), Z(3, 17, -0.4, -0.4), Z(4, 17, -0.4), Z(5, 17, -0.4), Z(6, 17, -0.4, 0.4), Z(6, 18, 0, 0.4),
                 stop(75.6, -23.6, 0, [5, 10], 0.6)]),
    # Besprechung: vom Mittelgang zum Auftragspult und zurück
    hin_und_her([Z(3, 7, 0, -0.4), Z(3, 9, 0, -0.4), Z(3, 10, 0, -0.2), [40.0, -9.8], [40.0, -7.4], [44.6, -6.6], stop(46.8, -4.4, 20, [8, 15], 0.9, 'auftraege')]),
]
CHATS = [[36.0, -26.5, 3], [77.0, -11.6, 2]]
def furnish():
    # Treffpunkt (Zeilen 5–7, Spalten 8–10): der Weg von Tür zu Tür (y = −24) bleibt frei; Auskunft neben der Galaxiekarte
    put('holo', 36.0, -21.3); put('stehtisch', 33.4, -20.7, 0.5); put('stehtisch', 39.9, -21.6, 2.1); put('messtisch', 33.2, -27.6); put('messtisch', 38.8, -27.6)
    put('pflanze', 30.8, -29.2); put('tonne', 30.6, -22.3); put('saeule', 40.9, -22.2)
    for (x, y) in ((33.4, -20.7), (39.9, -21.6), (33.2, -27.6), (38.8, -27.6)): put('pendel', x, y)
    staff('info', 37.6, -20.6, -120, 36.9, -22.4)
    # Besprechung (Zeilen 0–2, Spalten 9–12): Tisch mit Stühlen, Rednerpult vor der Bildwand im Osten, Zuhörerreihen; Aufträge und Missionen
    put('tisch', 42.5, -3.6)
    for q in range(4): put('stuhl', 41.3 + q * 0.8, -2.38, -PI / 2); put('stuhl', 41.3 + q * 0.8, -4.82, PI / 2)
    put('stuhl', 40.3, -3.6, 0.0); put('pult', 48.2, -3.6, PI); put('pendel', 41.6, -3.6); put('pendel', 43.4, -3.6)
    for y in (-1.6, -3.6, -5.6): put('sessel', 35.7, y, 0.0)
    for x in (37.4, 38.6):
        for q in range(5): put('stuhl', x, -1.6 - q * 1.0, 0.0)
    put('pflanze', 48.9, -9.0); put('tonne', 36.4, -9.2); put('saeule', 45.6, -8.6, PI / 2)
    staff('auftraege', 49.0, -3.6, 180, 47.0, -3.9); staff('missionen', 44.4, -8.4, 150, 43.4, -7.4)
    # Krankenstation (Zeilen 1–2, Spalten 15–17)
    put('utisch', 61.2, -7.5, 0.0); put('stellwand', 60.9, -5.0, 0.0); put('stellwand', 67.0, -5.0, PI); put('hocker', 62.3, -7.9, 0.4); put('hocker', 69.0, -5.0, 1.0); put('tonne', 69.2, -9.3)
    staff('kranken', 62.9, -6.6, -60, 63.6, -7.8)
    # Werkstatt (Zeilen 0–1, Spalten 2–4): drei Tresen vor den Werkbänken, Tür im Süden
    for (tab, x) in (('werft', 8.4), ('werkstatt', 12.0), ('service', 15.6)): put('tresen_' + tab, x, -0.5, 0.0); staff(tab, x, 0.45, -90, x, -2.0)
    put('palette', 7.4, -4.7, 0.1); put('trommel', 16.7, -4.7, 0.6); put('tonne', 14.4, -5.2)
    # Lager (Zeilen 7–8, Spalten 2–4): vier Tresen vor den Regalen, Tür im Norden
    for (tab, x) in (('markt', 7.8), ('ausruester', 10.6), ('raffinerie', 13.4), ('lager', 16.2)): put('tresen_' + tab, x, -30.3, PI); staff(tab, x, -31.25, 90, x, -28.8)
    put('palette', 7.2, -32.6, 0.05); put('karre', 17.0, -27.2, 1.2); put('fass', 16.9, -32.7); put('fass', 16.3, -32.9)
    # Maschinenraum, Quartiere
    put('wagen', 25.0, -6.4, 0.4); put('absperrung', 24.6, -4.4); put('fass', 29.0, -3.3)
    put('sessel', 77.0, -8.2, -0.6); put('stehtisch', 78.4, -9.6, 1.2); put('pendel', 78.4, -9.6); put('tonne', 76.0, -13.0)
    # Gänge
    put('kisten', 9.0, -22.85, PI / 2); put('wagen', 25.1, -17.6, PI / 2 + 0.2); put('trommel', 30.0, -33.1, 2.0); put('fass', 34.4, -30.9); put('tonne', 44.0, -33.1)
    put('karre', 53.1, -19.0, 0.3); put('kisten', 58.0, -13.1, -PI / 2); put('fass', 69.1, -17.0); put('fass', 69.0, -17.7); put('tonne', 74.0, -17.1); put('wagen', 34.0, -13.1, 0.1)
    put('schleuse', 0.0, -16.0, 0.0)
    wegweiser(5.3, -16.0, PI, ['<<<  WERKSTATT  ·  TREFFPUNKT', 'LAGER  ·  MARKT  >>>'])
    wegweiser(25.3, -12.0, PI, ['BESPRECHUNG  ·  GERADEAUS', 'TREFFPUNKT  ·  KRANKENSTATION  >>>'])
    wegweiser(53.3, -24.0, PI, ['<<<  KRANKENSTATION  ·  DECK 2', 'QUARTIER  ·  GERADEAUS'])
def cameras():
    w, h = len(PLAN[0]) * CELL, len(PLAN) * CELL
    ocam('Plan', (w / 2 - 2, -h / 2 + 2, 60), (w / 2 - 2, -h / 2 + 2.001, 0), w + 3)
    cam('A Hangartor', (4.4, -19.6, 1.5), (4.0, -8.5, 1.3), 18)
    cam('B Sackgasse', (16.6, -12.0, 1.5), (40.0, -12.3, 1.3), 20)
    cam('C Treffpunkt', (30.8, -25.4, 1.6), (40.5, -19.6, 1.3), 16)
    cam('D Treffpunkt Sued', (41.2, -22.6, 1.6), (32.0, -28.6, 1.1), 16)
    cam('E Besprechung', (35.0, -8.8, 1.6), (48.8, -1.2, 1.4), 16)
    cam('F Krankenstation', (68.9, -9.0, 1.6), (59.6, -3.2, 1.1), 16)
    cam('G Betten', (65.6, -6.2, 1.55), (59.4, -2.6, 1.0), 18)
    cam('H Quartier', (79.4, -12.6, 1.6), (76.4, -7.0, 1.1), 16)
    cam('I Werkstatt', (16.9, -5.2, 1.6), (8.5, 0.8, 1.2), 16)
    cam('J Suedgang', (25.4, -32.0, 1.5), (50.0, -32.3, 1.3), 20)
    cam('K Ostgang', (67.8, -22.6, 1.5), (68.2, -12.5, 1.3), 18)
    cam('L Lager', (7.2, -26.9, 1.6), (15.0, -32.5, 1.2), 16)
    cam('M Schleuse', (-7.0, -14.6, 1.6), (0.0, -16.0, 1.9), 22)
N_CELLS = assemble(); furnish(); cameras()
META = {'cell': CELL, 'karte': KARTE, 'ort': ORT, 'tueren': sorted([sorted(list(d)) for d in DOORS]), 'schotte': sorted(BULK), 'offen': OFFEN,
        'personal': SPOTS, 'wege': ROUTES, 'gruppen': CHATS, 'karte_xy': [36.0, -21.3]}
open(os.path.join(HERE, 'deck_d_meta.json'), 'w', encoding='utf-8').write(json.dumps(META, ensure_ascii=False))
result = {'zellen': N_CELLS, 'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'objekte': len(bpy.data.objects), 'tueren': len(DOORS), 'personal': len(SPOTS)}
