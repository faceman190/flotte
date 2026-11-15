# Bastion-Baukasten, weitere Bausteine (läuft nach bk_kit.py und vor bk_plan.py im selben Namensraum).
# Wandfüllungen: Kammertür, Decksplan, Ausgabe der Kombüse, Kojen, Regal, Werkbank, Brandposten, Gasflaschen, Hydrokultur, Aushang, Steigleiter
# Objekte: Messtisch, Sessel, Rednerpult, Holo-Kugel, Sackkarre, Palette, Tonne, Absperrung, Kabeltrommel, Pendelleuchte, Stütze

RN = random.Random(11)
def lower(var=3, flip=False, z1=1.02): field(-1, -0.87, 0.87, 0.3, z1, var, flip)
def upper(var=3, flip=False, z0=1.25): field(-1, -0.87, 0.87, z0, 1.87, var, flip)

# =====================================================================================
# Wandfüllungen
# =====================================================================================
def d_tuer(name, nr):      # geschlossene Kammertür: deutet Räume an, die es (noch) nicht gibt
    for sy in (-1, 1):
        prism('Wandplatte', inset([(sy * 0.56, 0.3), (sy * 0.87, 0.3), (sy * 0.87, 1.87), (sy * 0.56, 1.87)], 0.004), XL + 0.004, XL + 0.03, M['wall2'], 'X', 0.005)
        box('Türpfosten', 0.12, 0.1, 2.02, XL + 0.06, sy * 0.5, 1.01, M['frame'], 0.012)
    box('Türsturz', 0.12, 1.1, 0.12, XL + 0.06, 0, 2.04, M['frame'], 0.012)
    leaf = [(-0.44, 0.03), (0.44, 0.03), (0.44, 1.86), (0.34, 1.96), (-0.44, 1.96)]
    prism('Türblatt', leaf, XL + 0.01, XL + 0.05, M['door'], 'X', 0.008)
    prism('Türfeld', inset([(-0.34, 0.2), (0.34, 0.2), (0.34, 0.95), (-0.34, 0.95)], 0.0), XL + 0.05, XL + 0.062, M['cab'], 'X', 0.006)
    prism('Türfeld', inset([(-0.34, 1.05), (0.1, 1.05), (0.1, 1.8), (-0.34, 1.8)], 0.0), XL + 0.05, XL + 0.062, M['cab'], 'X', 0.006)
    box('Türfenster', 0.016, 0.14, 0.5, XL + 0.056, 0.25, 1.5, M['glass'], 0.006)
    ring('Türrad', 0.1, 0.012, (XL + 0.1, -0.08, 1.0), (1, 0, 0), M['steel'], 24); cyl('Türradnabe', 0.03, 0.06, XL + 0.08, -0.08, 1.0, M['frame'], 'X', n=12, bev=0.004)
    for q in range(3): box('Türradspeiche', 0.012, 0.19, 0.012, XL + 0.1, -0.08, 1.0, M['steel'], 0, (q * PI / 3, 0, 0))
    box('Tastenfeld', 0.03, 0.1, 0.16, XL + 0.045, 0.66, 1.25, M['frame'], 0.008)
    for q in range(3): cyl('Tasten-LED', 0.007, 0.008, XL + 0.062, 0.66, 1.2 + q * 0.04, M[['e_red', 'e_amber', 'e_green'][q]], 'X', n=8, bev=0)
    box('Türschwelle', 0.14, 1.0, 0.02, XL + 0.07, 0, 0.01, M['steel'], 0.004); box('Schwellenmarke', 0.1, 1.0, 0.003, XL + 0.22, 0, 0.0135, M['warn2'], 0)
    label(name, 0.03, (XL + 0.123, -0.42, 2.02), LEFT_X, LEFT_Y); text(nr, 0.12, (XL + 0.064, -0.3, 0.5), LEFT_X, LEFT_Y, M['txtw'])
    streak((XL + 0.064, 0.25, 1.24), LEFT_X, LEFT_Y, 0.16, 0.5); cyl('Türlicht', 0.02, 0.012, XL + 0.125, 0.4, 2.04, M['e_red'], 'X', n=10, bev=0)
def d_karte():      # Decksplan an der Wand: zeichnet den echten Plan (PLAN) als leuchtende Felder
    lower(3); box('Kartenrahmen', 0.06, 1.72, 1.08, XL + 0.05, 0, 1.5, M['frame'], 0.014); box('Kartengrund', 0.006, 1.6, 0.96, XL + 0.082, 0, 1.5, M['glass'], 0)
    rows, cols = len(PLAN), len(PLAN[0]); s = min(1.45 / cols, 0.7 / rows)
    for r in range(rows):
        for c in range(cols):
            ch = PLAN[r][c]
            if ch == '.': continue
            m = M['e_teal'] if ch == 'G' else M['e_amber'] if ch in 'HP' else M['e_cool']
            box('Kartenfeld', 0.004, s * 0.86, s * 0.86, XL + 0.087, (c - (cols - 1) / 2) * s, 1.44 + ((rows - 1) / 2 - r) * s, m, 0)
    text('DECK 3  ·  ÜBERSICHT', 0.05, (XL + 0.086, -0.72, 1.92), LEFT_X, LEFT_Y, M['txtw']); cyl('Standort', 0.02, 0.006, XL + 0.09, -0.6, 1.44, M['e_red'], 'X', n=12, bev=0)
    text('STANDORT', 0.022, (XL + 0.086, -0.56, 1.43), LEFT_X, LEFT_Y, M['txtw']); area('Kartenlicht', (XL + 0.14, 0, 1.5), (0, PI / 2, 0), 0.8, 1.5, 6, (0.2, 0.75, 0.85))
    box('Kartenleiste', 0.1, 1.2, 0.03, XL + 0.1, 0, 0.93, M['steel'], 0.006)
def d_theke():      # Ausgabe der Kombüse: Nische mit warmem Licht, Tresen, halb offener Rollladen
    lower(3, True, 0.92)
    box('Nische', 0.01, 1.56, 0.86, XL + 0.006, 0, 1.47, M['frame'], 0); box('Nischenlicht', 0.02, 1.4, 0.03, XL + 0.02, 0, 1.86, M['e_warm'], 0)
    area('Thekenlicht', (XL + 0.25, 0, 1.84), (0, 0, 0), 0.2, 1.3, 16, WARM)
    for sy in (-1, 1): box('Nischenpfosten', 0.16, 0.08, 0.98, XL + 0.08, sy * 0.82, 1.5, M['frame'], 0.012)
    box('Nischensturz', 0.18, 1.72, 0.1, XL + 0.09, 0, 2.02, M['frame'], 0.012)
    box('Tresen', 0.46, 1.72, 0.06, XL + 0.23, 0, 1.0, M['steel'], 0.012); box('Tresenblende', 0.04, 1.72, 0.1, XL + 0.44, 0, 0.94, M['ochre'], 0.01)
    for y in (-0.7, 0, 0.7): box('Tresenkonsole', 0.4, 0.04, 0.3, XL + 0.22, y, 0.82, M['frame'], 0.008, (0, 0.5, 0))
    for q in range(5): box('Rollladen', 0.02, 1.56, 0.07, XL + 0.05 + (q % 2) * 0.006, 0, 1.95 - q * 0.072, M['wall2'], 0.006)
    box('Wandbord', 0.14, 1.5, 0.02, XL + 0.08, 0, 1.42, M['steel'], 0.004)
    for q in range(7): cyl('Becher', 0.032, 0.085, XL + 0.08, -0.62 + q * 0.2, 1.475, M[['white', 'ochre', 'white', 'teal', 'white', 'white', 'ochre'][q]], 'Z', n=12, bev=0.004)
    for q in range(2):
        y = 0.25 + q * 0.3
        cyl('Kanne', 0.06, 0.22, XL + 0.2, y, 1.14, M['steel'], 'Z', n=16, bev=0.01); cyl('Kannendeckel', 0.05, 0.03, XL + 0.2, y, 1.265, M['frame'], 'Z', n=16, bev=0.006)
        box('Zapfhahn', 0.07, 0.02, 0.02, XL + 0.28, y, 1.08, M['steel'], 0.004); box('Zapfgriff', 0.015, 0.015, 0.05, XL + 0.31, y, 1.11, M['red' if q else 'ochre'], 0.003)
    box('Tablett', 0.3, 0.42, 0.012, XL + 0.25, -0.45, 1.036, M['wall2'], 0.004); cyl('Schale', 0.07, 0.04, XL + 0.25, -0.5, 1.062, M['white'], 'Z', n=16, bev=0.006, r2=0.09)
    label('KOMBÜSE  ·  AUSGABE', 0.035, (XL + 0.181, -0.45, 2.0), LEFT_X, LEFT_Y); label('HEUTE:  EINTOPF  ·  BROT  ·  TEE', 0.016, (XL + 0.007, -0.7, 1.72), LEFT_X, LEFT_Y, 'platey')
def d_kojen():      # zwei Kojen übereinander mit Vorhang, Leselicht und Ablage
    for sy in (-1, 1): box('Kojenpfosten', 0.06, 0.06, 2.02, XL + 0.82, sy * 0.86, 1.01, M['frame'], 0.01); box('Kojenwange', 0.8, 0.04, 2.02, XL + 0.4, sy * 0.87, 1.01, M['cab'], 0.008)
    box('Kojendach', 0.84, 1.78, 0.05, XL + 0.42, 0, 2.03, M['cab'], 0.01)
    for q, z in enumerate((0.42, 1.24)):
        box('Kojenboden', 0.8, 1.72, 0.05, XL + 0.4, 0, z, M['frame'], 0.008); box('Matratze', 0.74, 1.66, 0.1, XL + 0.4, 0, z + 0.075, M['kissen'], 0.03)
        box('Decke', 0.76, 0.9, 0.05, XL + 0.4, 0.36, z + 0.14, M['teal' if q else 'ochre'], 0.02); box('Kopfkissen', 0.4, 0.3, 0.09, XL + 0.36, -0.62, z + 0.16, M['white'], 0.035)
        box('Kojenkante', 0.04, 1.72, 0.14, XL + 0.82, 0, z + 0.06, M['wall2'], 0.01)
        box('Leselicht', 0.03, 0.16, 0.04, XL + 0.04, -0.6, z + 0.55, M['e_warm'], 0.006); point('Leselicht', (XL + 0.3, -0.5, z + 0.5), 2.5, WARM, 0.05)
        box('Ablage', 0.12, 0.4, 0.02, XL + 0.07, 0.3, z + 0.5, M['steel'], 0.004); box('Buch', 0.1, 0.14, 0.03, XL + 0.07, 0.24, z + 0.525, M['red' if q else 'green'], 0.004, (0, 0, 0.2))
        for p in range(5): box('Vorhang', 0.02, 0.09, 0.72, XL + 0.84 + (p % 2) * 0.014, 0.42 + p * 0.09, z + 0.42, M['polster'], 0.008)
        pipe('Vorhangstange', [(XL + 0.85, -0.86, z + 0.78), (XL + 0.85, 0.86, z + 0.78)], 0.008, M['steel']); label('KOJE %d' % (31 + q), 0.018, (XL + 0.842, -0.8, z - 0.02), LEFT_X, LEFT_Y)
    for q in range(4): cyl('Kojensprosse', 0.012, 0.3, XL + 0.84, -0.3, 0.3 + q * 0.3, M['steel'], 'Y', n=8, bev=0)
def d_regal():      # Lagerregal mit Kisten und Behältern
    for sy in (-1, 1):
        for x in (0.06, 0.5): box('Regalständer', 0.04, 0.04, 2.02, XL + x, sy * 0.85, 1.01, M['frame'], 0.006)
        box('Regalstrebe', 0.5, 0.02, 0.03, XL + 0.28, sy * 0.85, 1.9, M['frame'], 0.004)
    R = random.Random(3)
    for z in (0.28, 0.82, 1.36):
        box('Regalboden', 0.52, 1.74, 0.03, XL + 0.28, 0, z, M['steel'], 0.004); box('Regalkante', 0.02, 1.74, 0.06, XL + 0.54, 0, z + 0.015, M['ochre'], 0.004)
        y = -0.8
        while y < 0.62:
            w, h, d = R.uniform(0.2, 0.45), R.uniform(0.16, 0.42), R.uniform(0.3, 0.46)
            m = R.choice(['crate', 'crate', 'ochre', 'teal', 'wall2', 'white', 'green'])
            if R.random() < 0.25: cyl('Behälter', w * 0.42, h, XL + 0.28, y + w / 2, z + 0.015 + h / 2, M[m], 'Z', n=16, bev=0.01)
            else:
                box('Lagerkiste', d, w, h, XL + 0.28, y + w / 2, z + 0.015 + h / 2, M[m], 0.012, (0, 0, R.uniform(-0.06, 0.06)))
                if R.random() < 0.6: box('Kistenetikett', 0.004, min(0.14, w * 0.6), 0.06, XL + 0.28 + d / 2 + 0.002, y + w / 2, z + 0.05 + h / 2, M['plate'], 0)
            y += w + R.uniform(0.03, 0.1)
    label('LAGER 4  ·  FACH %d' % 7, 0.02, (XL + 0.552, -0.8, 1.93), LEFT_X, LEFT_Y, 'platey')
def d_werkbank():      # Werkbank mit Schubladen, Schraubstock, Werkzeugwand und Arbeitslicht
    box('Werkbankplatte', 0.62, 1.74, 0.06, XL + 0.31, 0, 0.92, M['crate'], 0.012); box('Werkbankkante', 0.03, 1.74, 0.08, XL + 0.62, 0, 0.91, M['steel'], 0.006)
    for sy in (-1, 1): box('Werkbankschrank', 0.56, 0.5, 0.82, XL + 0.3, sy * 0.6, 0.45, M['cab'], 0.012)
    for sy in (-1, 1):
        for q in range(4):
            box('Schublade', 0.02, 0.44, 0.17, XL + 0.586, sy * 0.6, 0.14 + q * 0.2, M['door'], 0.008); box('Schubladengriff', 0.02, 0.2, 0.02, XL + 0.604, sy * 0.6, 0.17 + q * 0.2, M['steel'], 0.004)
    box('Schraubstock Fuß', 0.14, 0.12, 0.08, XL + 0.5, 0.55, 0.99, M['teal'], 0.01); box('Schraubstock Backe', 0.05, 0.14, 0.1, XL + 0.46, 0.55, 1.08, M['teal'], 0.008); box('Schraubstock Backe', 0.05, 0.14, 0.1, XL + 0.56, 0.55, 1.08, M['teal'], 0.008)
    pipe('Schraubstock Spindel', [(XL + 0.58, 0.55, 1.05), (XL + 0.7, 0.55, 1.05)], 0.012, M['steel']); pipe('Spindelgriff', [(XL + 0.69, 0.47, 1.05), (XL + 0.69, 0.63, 1.05)], 0.008, M['steel'])
    box('Werkzeugwand', 0.02, 1.7, 0.8, XL + 0.012, 0, 1.5, M['wall4'], 0.006)
    for q in range(6):
        y = -0.7 + q * 0.2
        box('Schlüssel', 0.008, 0.03, 0.16 + q * 0.025, XL + 0.028, y, 1.62, M['steel'], 0.003); cyl('Schlüsselkopf', 0.022, 0.008, XL + 0.028, y, 1.72 + q * 0.012, M['steel'], 'X', n=6, bev=0)
    box('Hammerstiel', 0.012, 0.03, 0.3, XL + 0.03, 0.6, 1.5, M['crate'], 0.004); box('Hammerkopf', 0.03, 0.12, 0.04, XL + 0.03, 0.6, 1.66, M['steel'], 0.006)
    box('Säge', 0.006, 0.4, 0.08, XL + 0.028, 0.2, 1.26, M['steel'], 0.002, (0.15, 0, 0)); box('Sägegriff', 0.02, 0.1, 0.1, XL + 0.03, 0.42, 1.3, M['ochre'], 0.01)
    for q in range(6): box('Kleinteilekasten', 0.1, 0.12, 0.08, XL + 0.08, -0.72 + q * 0.14, 1.0, M[['red', 'ochre', 'teal', 'green', 'ochre', 'red'][q]], 0.008)
    pipe('Lampenarm', [(XL + 0.06, -0.2, 0.96), (XL + 0.06, -0.2, 1.5), (XL + 0.4, -0.1, 1.62)], 0.012, M['steel'], rad=0.08); box('Arbeitslampe', 0.22, 0.1, 0.04, XL + 0.42, -0.08, 1.6, M['frame'], 0.008)
    box('Arbeitslampe Glas', 0.18, 0.07, 0.006, XL + 0.42, -0.08, 1.578, M['e_white'], 0); area('Arbeitslicht', (XL + 0.42, -0.08, 1.56), (0, 0, 0), 0.18, 0.07, 14, COOL)
    box('Werkstück', 0.2, 0.3, 0.05, XL + 0.36, -0.1, 0.975, M['steel'], 0.006, (0, 0, 0.3)); cyl('Rohrstück', 0.035, 0.3, XL + 0.3, -0.5, 0.985, M['copper'], 'Y', n=14, bev=0.004)
    spot((XL + 0.95, 0.2, 0.0125), 0.3)
def d_feuer():      # Brandposten: Löscher, Schlauchhaspel, Melder, Verbandkasten
    lower(3); box('Brandtafel', 0.02, 1.7, 0.86, XL + 0.012, 0, 1.5, M['red'], 0.008)
    for q, y in enumerate((-0.62, -0.38)):
        cyl('Löscher', 0.075, 0.46, XL + 0.12, y, 0.7, M['red'], 'Z', n=20, bev=0.012); cyl('Löscher Kopf', 0.03, 0.08, XL + 0.12, y, 0.97, M['steel'], 'Z', n=12, bev=0.004)
        box('Löscher Bügel', 0.06, 0.17, 0.03, XL + 0.06, y, 0.8, M['steel'], 0.004); pipe('Löscher Schlauch', [(XL + 0.12, y, 0.99), (XL + 0.14, y + 0.08, 0.98), (XL + 0.15, y + 0.09, 0.62)], 0.01, M['rubber'], rad=0.03)
    cyl('Haspel', 0.3, 0.1, XL + 0.09, 0.28, 1.5, M['red'], 'X', n=28, bev=0.01); cyl('Haspelnabe', 0.08, 0.14, XL + 0.1, 0.28, 1.5, M['steel'], 'X', n=16, bev=0.006)
    for q in range(4): ring('Schlauch', 0.26 - q * 0.035, 0.016, (XL + 0.16, 0.28, 1.5), (1, 0, 0), M['crate'], 28)
    cyl('Strahlrohr', 0.02, 0.2, XL + 0.18, 0.28, 1.14, M['copper'], 'Z', n=10, bev=0.004)
    box('Melder', 0.08, 0.16, 0.16, XL + 0.05, -0.5, 1.6, M['red'], 0.012); box('Melderglas', 0.006, 0.1, 0.1, XL + 0.092, -0.5, 1.6, M['lens'], 0); cyl('Melder-LED', 0.008, 0.008, XL + 0.092, -0.5, 1.72, M['e_red'], 'X', n=8, bev=0)
    box('Verbandkasten', 0.09, 0.3, 0.3, XL + 0.075, 0.72, 0.72, M['white'], 0.014); box('Kreuz', 0.004, 0.16, 0.05, XL + 0.122, 0.72, 0.72, M['green'], 0); box('Kreuz', 0.004, 0.05, 0.16, XL + 0.122, 0.72, 0.72, M['green'], 0)
    label('BRANDPOSTEN 3-2', 0.035, (XL + 0.024, -0.8, 1.84), LEFT_X, LEFT_Y); warnsign((XL + 0.024, 0.74, 1.82), LEFT_X, LEFT_Y, 0.07)
def d_flaschen():      # Gasflaschen im Gestell
    lower(2); upper(3)
    for q, (mat, y) in enumerate((('teal', -0.42), ('white', -0.14), ('ochre', 0.14), ('teal', 0.42))):
        cyl('Gasflasche', 0.105, 1.2, XL + 0.2, y, 0.62, M[mat], 'Z', n=24, bev=0.02); cyl('Flaschenschulter', 0.105, 0.14, XL + 0.2, y, 1.29, M[mat], 'Z', n=24, bev=0, r2=0.04)
        cyl('Flaschenventil', 0.03, 0.1, XL + 0.2, y, 1.4, M['steel'], 'Z', n=12, bev=0.004); cyl('Ventilrad', 0.04, 0.015, XL + 0.2, y, 1.46, M['red' if q % 2 else 'ochre'], 'Z', n=10, bev=0.003)
        cyl('Flaschenfuß', 0.11, 0.03, XL + 0.2, y, 0.016, M['frame'], 'Z', n=24, bev=0.004)
    box('Flaschenhalter', 0.06, 1.2, 0.05, XL + 0.06, 0, 1.02, M['frame'], 0.008); box('Flaschenschiene', 0.3, 1.24, 0.04, XL + 0.18, 0, 0.3, M['frame'], 0.008)
    pipe('Flaschenkette', [(XL + 0.06, -0.6, 1.04), (XL + 0.325, -0.56, 1.02), (XL + 0.33, 0.56, 1.02), (XL + 0.06, 0.6, 1.04)], 0.008, M['steel'], rad=0.06)
    warnsign((XL + 0.032, 0.72, 1.62), LEFT_X, LEFT_Y, 0.075); label('DRUCKGAS  ·  KEIN FEUER', 0.016, (XL + 0.032, 0.5, 1.47), LEFT_X, LEFT_Y, 'platey')
def d_pflanzwand():      # Hydrokultur: drei Rinnen mit Pflanzen, Pflanzlicht, Vorratstank
    box('Rückwand', 0.02, 1.72, 1.74, XL + 0.012, 0, 1.17, M['wall4'], 0.006)
    R = random.Random(8)
    for q, z in enumerate((0.62, 1.12, 1.62)):
        box('Rinne', 0.26, 1.66, 0.12, XL + 0.16, 0, z, M['white'], 0.014); box('Rinnenerde', 0.2, 1.6, 0.02, XL + 0.16, 0, z + 0.06, M['erde'], 0)
        box('Pflanzlicht', 0.06, 1.5, 0.03, XL + 0.2, 0, z + 0.42, M['frame'], 0.006); box('Pflanzlicht Glas', 0.04, 1.44, 0.006, XL + 0.2, 0, z + 0.402, M['e_warm'], 0)
        area('Pflanzlicht', (XL + 0.2, 0, z + 0.39), (0, 0, 0), 0.04, 1.44, 7, (1.0, 0.85, 0.75))
        for p in range(13):
            h = R.uniform(0.1, 0.3); y = -0.76 + p * 0.127 + R.uniform(-0.02, 0.02)
            c = cyl('Blatt', 0.035 + h * 0.12, h, XL + 0.16 + R.uniform(-0.04, 0.05), y, z + 0.07 + h / 2, M['blatt'], 'Z', n=6, bev=0, r2=0.0); c.rotation_euler = (R.uniform(-0.35, 0.35), R.uniform(-0.35, 0.35), 0)
        for sy in (-1, 1): box('Rinnenhalter', 0.2, 0.03, 0.2, XL + 0.11, sy * 0.8, z - 0.04, M['frame'], 0.006)
    pipe('Zulauf', [(XL + 0.06, 0.84, 0.3), (XL + 0.06, 0.84, 1.75), (XL + 0.12, 0.8, 1.72)], 0.014, M['teal'], rad=0.04); cyl('Vorratstank', 0.16, 0.34, XL + 0.2, 0.55, 0.2, M['lens'], 'Z', n=20, bev=0.01)
    cyl('Tankfüllung', 0.15, 0.2, XL + 0.2, 0.55, 0.14, M['teal'], 'Z', n=20, bev=0); box('Pumpenkasten', 0.2, 0.3, 0.26, XL + 0.14, -0.5, 0.16, M['cab'], 0.014); cyl('Pumpen-LED', 0.008, 0.008, XL + 0.242, -0.5, 0.24, M['e_green'], 'X', n=8, bev=0)
    label('HYDROKULTUR 3  ·  KRÄUTER', 0.022, (XL + 0.024, -0.8, 2.0), LEFT_X, LEFT_Y)
def d_aushang():      # Schwarzes Brett: Zettel, Dienstplan, Fotos
    lower(2, True); box('Brettrahmen', 0.04, 1.6, 0.9, XL + 0.04, 0, 1.52, M['frame'], 0.012); box('Brett', 0.006, 1.5, 0.8, XL + 0.062, 0, 1.52, M['polster'], 0)
    R = random.Random(21)
    for q in range(9):
        w, h = R.uniform(0.12, 0.22), R.uniform(0.14, 0.26); y, z = -0.62 + (q % 5) * 0.3 + R.uniform(-0.04, 0.04), 1.36 + (q // 5) * 0.34 + R.uniform(-0.03, 0.03)
        p = box('Zettel', 0.002, w, h, XL + 0.067 + q * 0.0004, y, z, M['plate' if q % 3 else 'platey'], 0, (R.uniform(-0.12, 0.12), 0, 0))
        for l in range(int(h / 0.04)): box('Zeile', 0.001, w * R.uniform(0.5, 0.8), 0.006, XL + 0.069 + q * 0.0004, y, z + h / 2 - 0.03 - l * 0.036, M['txtd'], 0, p.rotation_euler)
        cyl('Nadel', 0.007, 0.01, XL + 0.072, y, z + h / 2 - 0.012, M[['red', 'ochre', 'teal'][q % 3]], 'X', n=8, bev=0)
    for (y, z, a) in ((0.6, 1.22, 0.1), (0.44, 1.2, -0.07)): box('Foto', 0.003, 0.11, 0.08, XL + 0.0705, y, z, M['wall2'], 0, (a, 0, 0)); box('Fotorand', 0.002, 0.13, 0.1, XL + 0.0695, y, z, M['plate'], 0, (a, 0, 0))
    label('DIENSTPLAN  ·  WOCHE 46', 0.024, (XL + 0.062, -0.74, 1.99), LEFT_X, LEFT_Y); box('Brettleuchte', 0.08, 1.2, 0.03, XL + 0.1, 0, 2.03, M['frame'], 0.006)
    box('Brettleuchte Glas', 0.05, 1.1, 0.006, XL + 0.1, 0, 2.012, M['e_warm'], 0); area('Brettlicht', (XL + 0.12, 0, 2.0), (0, math.radians(25), 0), 0.05, 1.1, 6, WARM)
def d_luke():      # Steigleiter zur Deckenluke
    lower(2); upper(3, True)
    for dy in (-0.2, 0.2): pipe('Leiterholm', [(XL + 0.14, dy, 0.26), (XL + 0.14, dy, 2.08)], 0.018, M['ochre'])
    for q in range(7): cyl('Sprosse', 0.014, 0.4, XL + 0.14, 0, 0.42 + q * 0.26, M['steel'], 'Y', n=10, bev=0)
    for z in (0.5, 1.2, 1.95):
        for dy in (-0.2, 0.2): box('Leiterhalter', 0.12, 0.03, 0.03, XL + 0.07, dy, z, M['frame'], 0.004)
    label('LUKE  ·  NUR MIT SICHERUNG', 0.016, (XL + 0.032, 0.32, 1.6), LEFT_X, LEFT_Y, 'platey'); streak((XL + 0.031, 0.2, 1.3), LEFT_X, LEFT_Y, 0.08, 0.5, 'rost')
    box('Hakenleiste', 0.03, 0.4, 0.03, XL + 0.045, -0.6, 1.6, M['steel'], 0.004); pipe('Sicherungsgurt', [(XL + 0.07, -0.6, 1.58), (XL + 0.09, -0.62, 1.2), (XL + 0.08, -0.56, 0.95), (XL + 0.07, -0.5, 1.2), (XL + 0.07, -0.52, 1.58)], 0.01, M['ochre'], rad=0.05)
DRESS.update({
    'tuer1': (d_tuer, 'KAMMER 3-14', '14'), 'tuer2': (d_tuer, 'TECHNIK 3-07', '07'), 'karte': (d_karte,), 'theke': (d_theke,), 'kojen': (d_kojen,), 'regal': (d_regal,),
    'werkbank': (d_werkbank,), 'feuer': (d_feuer,), 'flaschen': (d_flaschen,), 'pflanzwand': (d_pflanzwand,), 'aushang': (d_aushang,), 'luke': (d_luke,),
})

# =====================================================================================
# Objekte
# =====================================================================================
def p_messtisch():      # langer Tisch mit zwei Bänken
    top = [(-1.0, -0.4), (1.0, -0.4), (1.0, 0.4), (-1.0, 0.4)]
    prism('Tischplatte', top, 0.74, 0.78, M['crate'], 'Z', 0.012); prism('Tischkante', inset(top, -0.015), 0.735, 0.765, M['ochre'], 'Z', 0.006); box('Tischzarge', 1.8, 0.6, 0.06, 0, 0, 0.71, M['frame'], 0.008)
    for sx in (-1, 1): box('Tischbein', 0.08, 0.5, 0.7, sx * 0.75, 0, 0.35, M['frame'], 0.012); box('Tischfuß', 0.12, 0.7, 0.04, sx * 0.75, 0, 0.02, M['frame'], 0.008)
    for sy in (-1, 1):
        box('Bank', 1.9, 0.32, 0.05, 0, sy * 0.68, 0.44, M['crate'], 0.012); box('Bankpolster', 1.84, 0.28, 0.05, 0, sy * 0.68, 0.49, M['polster'], 0.02)
        for sx in (-1, 1): box('Bankbein', 0.06, 0.28, 0.42, sx * 0.75, sy * 0.68, 0.21, M['frame'], 0.01)
    for (x, y, m) in ((-0.6, 0.12, 'white'), (0.1, -0.15, 'ochre'), (0.62, 0.1, 'white')): cyl('Becher', 0.035, 0.09, x, y, 0.825, M[m], 'Z', n=14, bev=0.004)
    box('Tablett', 0.42, 0.3, 0.012, -0.25, -0.05, 0.786, M['wall2'], 0.004); cyl('Schale', 0.07, 0.04, -0.3, -0.05, 0.812, M['white'], 'Z', n=16, bev=0.006, r2=0.09); cyl('Schale', 0.07, 0.04, 0.4, 0.2, 0.8, M['white'], 'Z', n=16, bev=0.006, r2=0.09)
def p_sessel():
    box('Sesselkorpus', 0.8, 0.8, 0.26, 0, 0, 0.19, M['frame'], 0.03); box('Sesselsitz', 0.62, 0.6, 0.14, 0.04, 0, 0.38, M['polster'], 0.05)
    box('Sessellehne', 0.16, 0.62, 0.5, -0.3, 0, 0.62, M['polster'], 0.05, (0, -0.22, 0)); box('Lehnenschale', 0.05, 0.78, 0.62, -0.4, 0, 0.6, M['frame'], 0.02, (0, -0.22, 0))
    for sy in (-1, 1): box('Sesselarm', 0.7, 0.1, 0.3, 0, sy * 0.36, 0.45, M['frame'], 0.03); box('Armpolster', 0.5, 0.08, 0.03, 0.04, sy * 0.36, 0.615, M['polster'], 0.012)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('Sesselfuß', 0.03, 0.06, sx * 0.32, sy * 0.32, 0.03, M['steel'], 'Z', n=10, bev=0.004)
def p_pult():
    cyl('Pultfuß', 0.26, 0.03, 0, 0, 0.015, M['frame'], 'Z', n=24, bev=0.006); box('Pultsäule', 0.12, 0.3, 1.0, 0, 0, 0.53, M['wall2'], 0.02)
    box('Pultkopf', 0.36, 0.6, 0.06, 0.02, 0, 1.08, M['frame'], 0.014, (0, -0.35, 0)); box('Pultbild', 0.26, 0.5, 0.006, 0.03, 0, 1.115, M['screen'], 0, (0, -0.35, 0))
    box('Pultkante', 0.03, 0.6, 0.03, 0.2, 0, 1.03, M['ochre'], 0.008); cyl('Pult-LED', 0.008, 0.008, -0.062, 0.1, 0.9, M['e_green'], 'X', n=8, bev=0); point('Pultlicht', (0.1, 0, 1.25), 1.0, (0.1, 0.9, 0.8), 0.06)
def p_holo():      # Sockel mit schwebender Kugel aus Leuchtringen
    cyl('Holofuß', 0.5, 0.06, 0, 0, 0.03, M['frame'], 'Z', n=32, bev=0.012); cyl('Holosockel', 0.36, 0.7, 0, 0, 0.41, M['wall2'], 'Z', n=32, bev=0.02)
    cyl('Holokragen', 0.42, 0.06, 0, 0, 0.78, M['frame'], 'Z', n=32, bev=0.012); cyl('Hololinse', 0.28, 0.012, 0, 0, 0.815, M['e_teal'], 'Z', n=32, bev=0)
    for q in range(8): cyl('Holoschraube', 0.012, 0.012, math.cos(q * PI / 4) * 0.39, math.sin(q * PI / 4) * 0.39, 0.815, M['steel'], 'Z', n=6, bev=0)
    c = (0, 0, 1.5)
    for q in range(6): a = q * PI / 6; ring('Holoring', 0.42, 0.004, c, (math.cos(a), math.sin(a), 0), M['e_teal'], 48)
    for z, r in ((0.0, 0.42), (0.22, 0.36), (-0.22, 0.36), (0.36, 0.21), (-0.36, 0.21)): ring('Holobreite', r, 0.004, (0, 0, 1.5 + z), (0, 0, 1), M['e_teal'], 48)
    ring('Holobahn', 0.62, 0.005, c, (0.3, 0.1, 1), M['e_amber'], 56); cyl('Holopunkt', 0.02, 0.02, 0.62, 0, 1.5, M['e_amber'], 'Z', n=10, bev=0)
    point('Hololicht', (0, 0, 1.5), 12, (0.15, 0.9, 0.85), 0.3); box('Holopult', 0.3, 0.2, 0.04, 0.5, 0, 0.82, M['frame'], 0.01, (0, 0.5, 0)); box('Holopult Bild', 0.22, 0.14, 0.006, 0.51, 0, 0.845, M['screen'], 0, (0, 0.5, 0))
def p_karre():
    for sy in (-1, 1):
        pipe('Karrenholm', [(0.02, sy * 0.2, 0.06), (0.02, sy * 0.2, 1.1), (-0.12, sy * 0.2, 1.25)], 0.014, M['red'], rad=0.08); cyl('Karrenrad', 0.1, 0.04, -0.04, sy * 0.26, 0.1, M['rubber'], 'Y', n=20, bev=0.01)
        cyl('Radnabe', 0.035, 0.045, -0.04, sy * 0.26, 0.1, M['steel'], 'Y', n=12, bev=0)
    for z in (0.35, 0.7, 1.0): box('Karrenstrebe', 0.02, 0.4, 0.03, 0.02, 0, z, M['red'], 0.004)
    box('Karrenschaufel', 0.3, 0.44, 0.012, 0.16, 0, 0.03, M['steel'], 0.004); box('Lagerkiste', 0.3, 0.42, 0.34, 0.19, 0, 0.21, M['crate'], 0.014); box('Lagerkiste', 0.28, 0.36, 0.26, 0.18, 0, 0.51, M['ochre'], 0.014)
    pipe('Spanngurt', [(0.035, -0.2, 0.7), (0.34, -0.2, 0.66), (0.34, 0.2, 0.66), (0.035, 0.2, 0.7)], 0.008, M['teal'], rad=0.03)
def p_palette():
    for y in (-0.5, 0, 0.5): box('Palettenkufe', 1.2, 0.1, 0.1, 0, y, 0.05, M['crate'], 0.006)
    for q in range(7): box('Palettenbrett', 0.14, 1.2, 0.025, -0.52 + q * 0.173, 0, 0.1125, M['crate'], 0.004)
    R = random.Random(4)
    for (x, y, sx, sy, h, m) in ((-0.3, -0.3, 0.56, 0.56, 0.4, 'crate'), (0.3, -0.3, 0.56, 0.56, 0.5, 'wall2'), (-0.3, 0.3, 0.56, 0.56, 0.5, 'ochre'), (0.3, 0.3, 0.56, 0.56, 0.36, 'crate')):
        box('Lagerkiste', sx, sy, h, x, y, 0.125 + h / 2, M[m], 0.014, (0, 0, R.uniform(-0.04, 0.04))); box('Kistenetikett', 0.14, 0.004, 0.08, x, y - sy / 2 - 0.002, 0.2 + h / 2, M['plate'], 0)
    box('Lagerkiste', 0.5, 0.7, 0.3, 0.0, 0.25, 0.78, M['teal'], 0.014, (0, 0, 0.1))
    for y in (-0.3, 0.3): pipe('Spanngurt', [(-0.6, y, 0.13), (-0.6, y, 0.66), (0.6, y, 0.66), (0.6, y, 0.13)], 0.009, M['ochre'], rad=0.03)
def p_tonne():
    cyl('Tonne', 0.2, 0.62, 0, 0, 0.31, M['wall2'], 'Z', n=24, bev=0.015); cyl('Tonnendeckel', 0.21, 0.05, 0, 0, 0.645, M['frame'], 'Z', n=24, bev=0.012)
    box('Einwurf', 0.16, 0.06, 0.02, 0.06, 0, 0.672, M['rubber'], 0.004); cyl('Tonnenband', 0.203, 0.06, 0, 0, 0.42, M['green'], 'Z', n=24, bev=0)
def p_absperrung():
    for sx in (-1, 1):
        cyl('Pfostenfuß', 0.16, 0.03, sx * 0.9, 0, 0.015, M['frame'], 'Z', n=20, bev=0.006); cyl('Pfosten', 0.03, 0.9, sx * 0.9, 0, 0.48, M['warn'], 'Z', n=14, bev=0); cyl('Pfostenkopf', 0.04, 0.04, sx * 0.9, 0, 0.94, M['frame'], 'Z', n=14, bev=0.006)
    cable((-0.9, 0, 0.88), (0.9, 0, 0.88), 0.012, M['ochre'], sag=0.16, name='Absperrkette'); box('Absperrschild', 0.4, 0.012, 0.2, 0, 0, 0.62, M['platey'], 0.004)
    text('WARTUNG', 0.06, (-0.17, -0.007, 0.59), (1, 0, 0), (0, 0, 1), M['txtd'])
def p_trommel():
    for sy in (-1, 1): cyl('Trommelscheibe', 0.4, 0.03, 0, sy * 0.2, 0.4, M['crate'], 'Y', n=28, bev=0.008)
    cyl('Trommelkern', 0.16, 0.4, 0, 0, 0.4, M['crate'], 'Y', n=20, bev=0)
    for q in range(11): ring('Kabelwicklung', 0.3, 0.018, (0, -0.17 + q * 0.034, 0.4), (0, 1, 0), M['rubber'], 28)
    pipe('Kabelende', [(0.3, 0.1, 0.4), (0.42, 0.14, 0.2), (0.7, 0.3, 0.02), (1.1, 0.2, 0.02)], 0.018, M['rubber'], rad=0.1)
    for sx in (-1, 1): box('Trommelkeil', 0.12, 0.3, 0.06, sx * 0.34, 0, 0.03, M['ochre'], 0.008, (0, sx * 0.4, 0))
def p_pendel():      # Pendelleuchte, hängt von der Raumdecke (3,4 m)
    pipe('Pendelkabel', [(0, 0, RH - 0.05), (0, 0, 2.42)], 0.008, M['rubber']); cyl('Baldachin', 0.06, 0.04, 0, 0, RH - 0.07, M['frame'], 'Z', n=14, bev=0.006)
    cyl('Pendelschirm', 0.08, 0.2, 0, 0, 2.32, M['ochre'], 'Z', n=24, bev=0.006, r2=0.26); cyl('Pendelglas', 0.2, 0.01, 0, 0, 2.225, M['e_warm'], 'Z', n=24, bev=0)
    area('Pendellicht', (0, 0, 2.2), (0, 0, 0), 0.3, 0.3, 26, WARM)
def p_stuetze():      # Stütze für große Räume
    oc = lambda r: [(math.cos(q * PI / 4 + PI / 8) * r, math.sin(q * PI / 4 + PI / 8) * r) for q in range(8)]
    prism('Stützenfuß', oc(0.34), 0.0, 0.3, M['frame'], 'Z', 0.012); prism('Stütze', oc(0.22), 0.3, RH - 0.3, M['wall2'], 'Z', 0.01); prism('Stützenkopf', oc(0.36), RH - 0.3, RH, M['frame'], 'Z', 0.012)
    for z in (1.1, 1.3): prism('Stützenband', oc(0.225), z, z + 0.05, M['ochre'], 'Z', 0.003)
    for q in range(4):
        a = q * PI / 2; box('Stützenlicht', 0.02, 0.05, 1.2, math.cos(a) * 0.21, math.sin(a) * 0.21, 2.2, M['e_cool'], 0, (0, 0, a))
    for q in range(8): cyl('Fußschraube', 0.014, 0.014, math.cos(q * PI / 4) * 0.3, math.sin(q * PI / 4) * 0.3, 0.305, M['steel'], 'Z', n=6, bev=0)
PROP.update({'messtisch': p_messtisch, 'sessel': p_sessel, 'pult': p_pult, 'holo': p_holo, 'karre': p_karre, 'palette': p_palette, 'tonne': p_tonne,
             'absperrung': p_absperrung, 'trommel': p_trommel, 'pendel': p_pendel, 'stuetze': p_stuetze})
