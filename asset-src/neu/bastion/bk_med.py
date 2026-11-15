# Bastion-Baukasten, Krankenstation (läuft nach bk_mehr.py im selben Namensraum).
# Wandfüllungen: Krankenbett (steht quer zur Wand), Medikamentenschrank, Waschplatz mit Erste-Hilfe-Wand, Diagnoseplatz
# Objekte: Untersuchungsliege mit Scannerbogen und Leuchte, Infusionsständer, Stellwand, Rollhocker
M['schildgruen'] = mk('Schild gruen', (0.02, 0.32, 0.12), 0.0, 0.5, var=0.15, grime=False)
M['e_med'] = mk('Licht Krankenstation', (0.8, 1, 0.95), 0, 0.3, var=0, rvar=0, emit=(0.78, 1.0, 0.94), es=4.0, grime=False)
M['laken'] = mk('Laken', (0.6, 0.62, 0.6), 0.0, 0.85, var=0.12, bump=0.35, bscale=300.0, grime=False)
def kreuz(c, xd, yd, s=0.2):      # Sanitätszeichen: weißes Kreuz auf grünem Feld
    c = Vector(c); X = Vector(xd); Y = Vector(yd)
    plate(s, s, c - X * s / 2 - Y * s / 2, xd, yd, M['schildgruen'], 0.004, 0, 'Sanitätszeichen')
    plate(s * 0.62, s * 0.2, c - X * s * 0.31 - Y * s * 0.1, xd, yd, M['plate'], 0.008, 0, 'Sanitätskreuz')
    plate(s * 0.2, s * 0.62, c - X * s * 0.1 - Y * s * 0.31, xd, yd, M['plate'], 0.008, 0, 'Sanitätskreuz')
def tropf(x, y):      # Infusionsständer
    for q in range(5): a = q * 2 * PI / 5; box('Tropffuß', 0.26, 0.03, 0.02, x + math.cos(a) * 0.13, y + math.sin(a) * 0.13, 0.05, M['steel'], 0.004, (0, 0, a)); cyl('Tropfrolle', 0.025, 0.02, x + math.cos(a) * 0.25, y + math.sin(a) * 0.25, 0.025, M['rubber'], 'Y', n=10, bev=0)
    cyl('Tropfstange', 0.012, 1.85, x, y, 0.97, M['steel'], 'Z', n=10, bev=0); box('Tropfhaken', 0.3, 0.012, 0.012, x, y, 1.89, M['steel'], 0.003)
    box('Infusionsbeutel', 0.03, 0.11, 0.17, x + 0.12, y, 1.76, M['lens'], 0.01); box('Beuteletikett', 0.032, 0.07, 0.05, x + 0.12, y, 1.78, M['plate'], 0)
    pipe('Infusionsschlauch', [(x + 0.12, y, 1.67), (x + 0.12, y, 1.2), (x + 0.2, y + 0.12, 0.95)], 0.004, M['lens'], rad=0.08)
    box('Infusionspumpe', 0.08, 0.12, 0.16, x + 0.05, y, 1.2, M['white'], 0.01); box('Pumpenanzeige', 0.004, 0.08, 0.05, x + 0.092, y, 1.23, M['screen'], 0)

# =====================================================================================
# Wandfüllungen
# =====================================================================================
def d_liege(nr):      # Krankenbett, Kopf an der Wand; Versorgungsleiste, Monitor, Vorhang
    lower(3, nr % 2 == 0, 1.0); upper(2 if nr % 2 else 4, nr % 2 == 1, 1.3)
    box('Versorgungsleiste', 0.07, 1.7, 0.22, XL + 0.05, 0, 1.15, M['white'], 0.012); box('Leistenlicht', 0.02, 1.2, 0.03, XL + 0.06, 0, 1.025, M['e_warm'], 0)
    for q, m in enumerate(('ochre', 'teal', 'steel', 'steel')): cyl('Gasanschluss', 0.024, 0.03, XL + 0.09, -0.7 + q * 0.14, 1.15, M[m], 'X', n=14, bev=0.004)
    for q in range(3): box('Steckfeld', 0.012, 0.07, 0.07, XL + 0.088, 0.3 + q * 0.12, 1.15, M['cab'], 0.004)
    cyl('Ruftaste', 0.02, 0.014, XL + 0.09, 0.72, 1.15, M['e_red'], 'X', n=12, bev=0); label('BETT %d' % nr, 0.03, (XL + 0.087, -0.16, 1.2), LEFT_X, LEFT_Y)
    pipe('Monitorarm', [(XL + 0.06, 0.6, 1.55), (XL + 0.3, 0.6, 1.55), (XL + 0.42, 0.52, 1.66)], 0.016, M['steel'], rad=0.06)
    box('Bettmonitor', 0.04, 0.42, 0.3, XL + 0.44, 0.5, 1.7, M['frame'], 0.012, (0, 0, 0.3)); box('Monitorbild', 0.006, 0.36, 0.24, XL + 0.462, 0.494, 1.7, M['screen'], 0, (0, 0, 0.3))
    by = -0.1; bx = XL + 1.14      # das Bett
    box('Bettfuß', 1.5, 0.66, 0.06, bx, by, 0.09, M['frame'], 0.012); box('Bettsäule', 0.9, 0.46, 0.34, bx, by, 0.29, M['wall2'], 0.03)
    box('Bettrahmen', 2.0, 0.86, 0.08, bx, by, 0.5, M['white'], 0.02); box('Matratze', 1.26, 0.8, 0.12, bx + 0.34, by, 0.6, M['laken'], 0.035)
    box('Kopfteil', 0.7, 0.8, 0.12, XL + 0.52, by, 0.73, M['laken'], 0.035, (0, 0.38, 0)); box('Kopfkissen', 0.34, 0.5, 0.1, XL + 0.4, by, 0.9, M['white'], 0.04, (0, 0.38, 0))
    box('Bettdecke', 0.95, 0.83, 0.05, bx + 0.48, by, 0.685, M['teal'], 0.02); box('Deckenumschlag', 0.18, 0.84, 0.056, bx - 0.05, by, 0.69, M['laken'], 0.02)
    box('Fußbrett', 0.04, 0.84, 0.42, XL + 2.13, by, 0.66, M['white'], 0.015); box('Kopfbrett', 0.04, 0.84, 0.5, XL + 0.14, by, 0.76, M['white'], 0.015)
    plate(0.2, 0.28, (XL + 2.155, by - 0.1, 0.52), LEFT_X, LEFT_Y, M['plate'], 0.004, 0, 'Krankenblatt'); box('Blattklemme', 0.012, 0.1, 0.03, XL + 2.16, by, 0.8, M['steel'], 0.004)
    for sy in (-1, 1):
        pipe('Seitengitter', [(XL + 0.95, by + sy * 0.45, 0.56), (XL + 0.95, by + sy * 0.45, 0.86), (XL + 1.75, by + sy * 0.45, 0.86), (XL + 1.75, by + sy * 0.45, 0.56)], 0.014, M['steel'], rad=0.08)
        pipe('Seitengitter Mitte', [(XL + 0.95, by + sy * 0.45, 0.72), (XL + 1.75, by + sy * 0.45, 0.72)], 0.009, M['steel'])
        for x in (XL + 0.5, XL + 1.8): cyl('Bettrolle', 0.05, 0.04, x, by + sy * 0.36, 0.05, M['rubber'], 'Y', n=14, bev=0.008)
    pipe('Vorhangschiene', [(XL + 0.02, 0.84, 2.24), (XL + 2.3, 0.84, 2.24)], 0.012, M['steel']); pipe('Schienenhänger', [(XL + 2.3, 0.84, 2.24), (XL + 2.3, 0.84, RH - 0.02)], 0.008, M['steel'])
    for p in range(7): box('Vorhang', 0.08, 0.02, 1.86, XL + 0.12 + p * 0.075, 0.84 + (p % 2) * 0.016, 1.3, M['laken'], 0.008)
    tropf(XL + 0.46, -0.72); point('Leselicht', (XL + 0.4, by, 1.2), 3.0, WARM, 0.06)
def d_medschrank():      # Medikamentenschrank: unten Schubladen, oben Glastüren mit Kühlfach
    box('Medizinschrank', 0.42, 1.72, 0.94, XL + 0.21, 0, 0.47, M['white'], 0.014); box('Schrankdeckel', 0.42, 1.72, 0.07, XL + 0.21, 0, 1.985, M['white'], 0.012)
    for sy in (-1, 1): box('Schrankwange', 0.42, 0.04, 1.02, XL + 0.21, sy * 0.84, 1.45, M['white'], 0.01)
    box('Schranksockel', 0.4, 1.72, 0.1, XL + 0.2, 0, 0.05, M['frame'], 0.008)
    for q in range(3):
        for sy in (-1, 1): box('Schublade', 0.02, 0.82, 0.24, XL + 0.425, sy * 0.425, 0.26 + q * 0.27, M['door'], 0.01); box('Schubladengriff', 0.02, 0.3, 0.02, XL + 0.445, sy * 0.425, 0.33 + q * 0.27, M['steel'], 0.005)
    box('Arbeitsplatte', 0.46, 1.74, 0.03, XL + 0.23, 0, 0.94, M['steel'], 0.008)
    box('Fachgrund', 0.02, 1.62, 0.96, XL + 0.1, 0, 1.47, M['wall4'], 0); box('Fachlicht', 0.03, 1.5, 0.02, XL + 0.2, 0, 1.935, M['e_med'], 0)
    R = random.Random(7)
    for q, z in enumerate((1.02, 1.32, 1.62)):
        box('Fachboden', 0.3, 1.62, 0.012, XL + 0.25, 0, z, M['steel'], 0.003); y = -0.74
        while y < 0.7:
            if R.random() < 0.6: r = R.uniform(0.022, 0.035); h = R.uniform(0.08, 0.17); cyl('Fläschchen', r, h, XL + R.uniform(0.2, 0.3), y + r, z + 0.006 + h / 2, M[R.choice(('ochre', 'teal', 'white', 'green', 'lens'))], 'Z', n=12, bev=0.004); y += r * 2 + 0.02
            else: w = R.uniform(0.08, 0.16); h = R.uniform(0.06, 0.12); box('Schachtel', 0.12, w, h, XL + 0.26, y + w / 2, z + 0.006 + h / 2, M[R.choice(('plate', 'white', 'cab'))], 0.004); box('Schachtelstreifen', 0.122, w * 0.9, 0.015, XL + 0.26, y + w / 2, z + 0.03, M[R.choice(('schildgruen', 'teal', 'ochre'))], 0); y += w + 0.02
    for sy in (-1, 1): box('Glastür', 0.008, 0.8, 0.94, XL + 0.415, sy * 0.41, 1.47, M['lens'], 0); box('Glastürgriff', 0.02, 0.02, 0.3, XL + 0.43, sy * 0.06, 1.45, M['steel'], 0.005)
    box('Türmittelsteg', 0.03, 0.03, 0.98, XL + 0.41, 0, 1.47, M['white'], 0.006); kreuz((XL + 0.422, 0, 1.98), LEFT_X, LEFT_Y, 0.07)
    label('MEDIKAMENTE', 0.03, (XL + 0.437, -0.8, 0.86), LEFT_X, LEFT_Y); cyl('Schloss-LED', 0.008, 0.01, XL + 0.43, 0.08, 1.02, M['e_red'], 'X', n=8, bev=0)
    for q, m in enumerate(('white', 'teal')): box('Schale', 0.2, 0.28, 0.04, XL + 0.24, -0.5 + q * 0.9, 0.975, M[m], 0.01)
def d_waschplatz():      # Waschbecken mit Spiegel und Spendern, daneben Erste-Hilfe-Wand
    box('Spritzschutz', 0.02, 1.72, 1.1, XL + 0.012, 0, 1.4, M['white'], 0.006); lower(3, True, 0.78)
    box('Waschtisch', 0.5, 0.76, 0.84, XL + 0.25, -0.46, 0.44, M['cab'], 0.014); box('Becken', 0.52, 0.78, 0.05, XL + 0.26, -0.46, 0.885, M['steel'], 0.012); box('Beckenmulde', 0.34, 0.5, 0.012, XL + 0.28, -0.46, 0.907, M['wall4'], 0.006)
    pipe('Armatur', [(XL + 0.08, -0.46, 0.9), (XL + 0.08, -0.46, 1.12), (XL + 0.26, -0.46, 1.12), (XL + 0.26, -0.46, 1.06)], 0.014, M['steel'], rad=0.05); box('Sensor', 0.03, 0.05, 0.03, XL + 0.05, -0.46, 1.0, M['glass'], 0.004)
    for sy in (-1, 1): box('Waschtischtür', 0.02, 0.36, 0.7, XL + 0.505, -0.46 + sy * 0.19, 0.42, M['door'], 0.01)
    box('Spiegelrahmen', 0.03, 0.66, 0.76, XL + 0.03, -0.46, 1.62, M['frame'], 0.01); box('Spiegel', 0.008, 0.6, 0.7, XL + 0.05, -0.46, 1.62, M['steel'], 0); box('Spiegellicht', 0.03, 0.6, 0.03, XL + 0.05, -0.46, 2.03, M['e_med'], 0)
    for q, m in enumerate(('teal', 'white')): box('Spender', 0.1, 0.1, 0.22, XL + 0.07, -0.02 + q * 0.14, 1.26, M['white'], 0.014); box('Spendertaste', 0.02, 0.06, 0.05, XL + 0.125, -0.02 + q * 0.14, 1.2, M[m], 0.006)
    box('Handschuhbox', 0.1, 0.24, 0.13, XL + 0.07, -0.84 + 0.02, 1.26, M['plate'], 0.008); cyl('Abwurf', 0.15, 0.5, XL + 0.22, 0.1, 0.25, M['wall2'], 'Z', n=20, bev=0.012); cyl('Abwurfdeckel', 0.155, 0.03, XL + 0.22, 0.1, 0.515, M['ochre'], 'Z', n=20, bev=0.008)
    label('HÄNDE DESINFIZIEREN', 0.022, (XL + 0.024, -0.8, 2.08), LEFT_X, LEFT_Y)
    box('Erste-Hilfe-Schrank', 0.16, 0.56, 0.7, XL + 0.08, 0.52, 1.5, M['white'], 0.014); kreuz((XL + 0.165, 0.52, 1.6), LEFT_X, LEFT_Y, 0.24); text('ERSTE HILFE', 0.04, (XL + 0.165, 0.34, 1.26), LEFT_X, LEFT_Y, M['txtd'])
    box('Defibrillator', 0.12, 0.3, 0.26, XL + 0.06, 0.52, 0.98, M['ochre'], 0.02); box('Defi-Anzeige', 0.006, 0.12, 0.07, XL + 0.122, 0.48, 1.02, M['screen'], 0); cyl('Defi-LED', 0.008, 0.008, XL + 0.124, 0.62, 1.05, M['e_green'], 'X', n=8, bev=0)
    for sz in (0.36, 0.56): pipe('Trage', [(XL + 0.07, 0.2, sz), (XL + 0.07, 0.84, sz)], 0.016, M['steel'])
    box('Tragentuch', 0.03, 0.6, 0.2, XL + 0.07, 0.52, 0.46, M['teal'], 0.01); box('Tragenhalter', 0.06, 0.03, 0.3, XL + 0.04, 0.24, 0.46, M['frame'], 0.006); box('Tragenhalter', 0.06, 0.03, 0.3, XL + 0.04, 0.8, 0.46, M['frame'], 0.006)
def d_diagnose():      # Diagnoseplatz: großes Bildfeld, Pult, Lesegerät
    lower(1, False, 0.82)
    box('Diagnoserahmen', 0.06, 1.64, 1.0, XL + 0.04, 0, 1.52, M['frame'], 0.014); box('Diagnosebild', 0.012, 1.52, 0.88, XL + 0.075, 0, 1.52, M['screen2'], 0)
    box('Diagnosepult', 0.5, 1.6, 0.04, XL + 0.27, 0, 0.92, M['steel'], 0.01)
    for y in (-0.6, 0.6): prism('Pultkonsole', [(XL + 0.02, 0.9), (XL + 0.5, 0.9), (XL + 0.02, 0.55)], y - 0.02, y + 0.02, M['frame'], 'Y', 0.006)
    box('Tastenfeld', 0.16, 0.44, 0.015, XL + 0.36, -0.2, 0.948, M['rubber'], 0.004); box('Lesegerät', 0.22, 0.3, 0.1, XL + 0.2, 0.46, 0.99, M['white'], 0.014); box('Lesefeld', 0.14, 0.2, 0.006, XL + 0.2, 0.46, 1.043, M['e_med'], 0)
    box('Kleinbild', 0.03, 0.3, 0.22, XL + 0.3, -0.58, 1.08, M['frame'], 0.008, (0, -0.3, 0.4)); box('Kleinbild Anzeige', 0.006, 0.26, 0.18, XL + 0.316, -0.573, 1.085, M['screen'], 0, (0, -0.3, 0.4))
    label('DIAGNOSE 2', 0.03, (XL + 0.071, -0.8, 2.06), LEFT_X, LEFT_Y); box('Probenständer', 0.1, 0.2, 0.05, XL + 0.14, 0.08, 0.965, M['white'], 0.008)
    for q in range(4): cyl('Probenröhrchen', 0.009, 0.09, XL + 0.14, 0.02 + q * 0.04, 1.03, M[('lens', 'ochre', 'lens', 'red')[q]], 'Z', n=8, bev=0)
DRESS.update({'liege1': (d_liege, 1), 'liege2': (d_liege, 2), 'liege3': (d_liege, 3), 'liege4': (d_liege, 4), 'medschrank': (d_medschrank,), 'waschplatz': (d_waschplatz,), 'diagnose': (d_diagnose,)})

# =====================================================================================
# Objekte
# =====================================================================================
def p_utisch():      # Untersuchungsliege (Länge entlang y) mit Scannerbogen und Leuchte
    box('Liegenfuß', 0.8, 1.3, 0.06, 0, 0, 0.03, M['frame'], 0.012); box('Liegensäule', 0.46, 0.8, 0.56, 0, 0, 0.34, M['wall2'], 0.03); box('Liegenrahmen', 0.66, 1.96, 0.06, 0, 0, 0.66, M['white'], 0.014)
    for (y, ln, tilt) in ((-0.68, 0.56, -0.3), (0.0, 0.76, 0.0), (0.7, 0.58, 0.0)): box('Liegenpolster', 0.62, ln, 0.09, 0, y, 0.74 + (0.07 if tilt else 0), M['polster'], 0.03, (tilt, 0, 0))
    box('Papierrolle', 0.5, 0.1, 0.1, 0, -1.02, 0.7, M['plate'], 0.04); box('Liegenbedienung', 0.04, 0.2, 0.1, 0.25, 0.4, 0.5, M['cab'], 0.008); cyl('Liegen-LED', 0.008, 0.008, 0.272, 0.46, 0.52, M['e_green'], 'X', n=8, bev=0)
    for sx in (-1, 1): box('Bogenschiene', 0.06, 1.7, 0.05, sx * 0.48, 0, 0.1, M['steel'], 0.008)
    pipe('Scannerbogen', [(-0.48, 0.25, 0.12), (-0.48, 0.25, 1.4), (0.48, 0.25, 1.4), (0.48, 0.25, 0.12)], 0.06, M['white'], rad=0.32)
    pipe('Scannerlicht', [(-0.41, 0.25, 0.5), (-0.41, 0.25, 1.33), (0.41, 0.25, 1.33), (0.41, 0.25, 0.5)], 0.012, M['e_teal'], rad=0.26)
    for sx in (-1, 1): box('Bogenschlitten', 0.16, 0.3, 0.12, sx * 0.48, 0.25, 0.14, M['frame'], 0.014)
    pipe('Leuchtenarm', [(-0.2, -0.36, 0.6), (-0.6, -0.5, 0.6), (-0.6, -0.5, 2.0), (-0.1, -0.3, 2.12)], 0.022, M['steel'], rad=0.14)
    cyl('Leuchtenkopf', 0.24, 0.07, -0.02, -0.26, 2.08, M['white'], 'Z', n=28, bev=0.02); cyl('Leuchtenglas', 0.19, 0.01, -0.02, -0.26, 2.04, M['e_white'], 'Z', n=28, bev=0)
    area('Untersuchungslicht', (-0.02, -0.26, 2.02), (0, 0, 0), 0.3, 0.3, 30, COOL)
    box('Instrumententisch', 0.4, 0.3, 0.02, 0.62, -0.5, 0.86, M['steel'], 0.006); cyl('Tischsäule', 0.02, 0.84, 0.62, -0.5, 0.43, M['steel'], 'Z', n=10, bev=0); cyl('Tischfuß', 0.18, 0.02, 0.62, -0.5, 0.01, M['frame'], 'Z', n=20, bev=0.006)
    box('Instrumentenschale', 0.26, 0.16, 0.025, 0.62, -0.5, 0.883, M['white'], 0.008)
    for q in range(4): cyl('Instrument', 0.006, 0.13, 0.56 + q * 0.04, -0.5, 0.9, M['steel'], 'Y', n=6, bev=0)
def p_tropf(): tropf(0, 0)
def p_stellwand():      # Stellwand aus drei Feldern, im Zickzack
    for q, (x, y, a) in enumerate(((-0.56, 0.1, 0.35), (0.0, 0.0, -0.35), (0.56, 0.1, 0.35))):
        c, s = math.cos(a), math.sin(a)
        box('Stellwandtuch', 0.56, 0.012, 1.4, x, y, 1.05, M['laken'], 0.004, (0, 0, a))
        for e in (-1, 1): cyl('Stellwandholm', 0.014, 1.74, x + e * c * 0.29, y + e * s * 0.29, 0.9, M['steel'], 'Z', n=8, bev=0); cyl('Stellwandrolle', 0.03, 0.03, x + e * c * 0.29, y + e * s * 0.29, 0.03, M['rubber'], 'X', n=10, bev=0)
        for z in (0.33, 1.77): box('Stellwandriegel', 0.58, 0.02, 0.02, x, y, z, M['steel'], 0.004, (0, 0, a))
def p_hocker():      # Rollhocker
    cyl('Hockersitz', 0.19, 0.07, 0, 0, 0.5, M['polster'], 'Z', n=24, bev=0.02); cyl('Hockersäule', 0.025, 0.38, 0, 0, 0.28, M['steel'], 'Z', n=10, bev=0); cyl('Hockerring', 0.16, 0.014, 0, 0, 0.2, M['steel'], 'Z', n=20, bev=0)
    for q in range(5): a = q * 2 * PI / 5; box('Hockerfuß', 0.28, 0.035, 0.025, math.cos(a) * 0.14, math.sin(a) * 0.14, 0.085, M['frame'], 0.006, (0, 0, a)); cyl('Hockerrolle', 0.03, 0.025, math.cos(a) * 0.27, math.sin(a) * 0.27, 0.03, M['rubber'], 'Y', n=10, bev=0)
PROP.update({'utisch': p_utisch, 'tropf': p_tropf, 'stellwand': p_stellwand, 'hocker': p_hocker})
