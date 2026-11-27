# Bastion-Hangar: Objekte, Zusammenbau, Licht, Kameras, Rendern. Läuft nach bk_kit.py, bk_mehr.py und bk_hangar.py im selben Namensraum.
RH_ = random.Random(23)

# =====================================================================================
# Objekte des Hangars (Ursprung am Boden; Fahrzeuge schauen nach +X)
# =====================================================================================
def p_container(paint, code):
    tm = M['txtd' if paint == 'white' else 'txtw']
    Lc, Wc, Hc = 6.06, 2.44, 2.59
    box('Container', Lc - 0.1, Wc - 0.1, Hc - 0.2, 0, 0, Hc / 2, M[paint], 0.01)
    array(box('Dachsicke', 0.13, Wc - 0.3, 0.03, -Lc / 2 + 0.3, 0, Hc - 0.09, M[paint], 0.01), 22, (0.26, 0, 0))
    for sy in (-1, 1):
        array(box('Sicke', 0.13, 0.04, Hc - 0.5, -Lc / 2 + 0.3, sy * (Wc / 2 - 0.045), Hc / 2, M[paint], 0.012), 22, (0.26, 0, 0))
        for z in (0.08, Hc - 0.08): box('Containerholm', Lc, 0.12, 0.16, 0, sy * (Wc / 2 - 0.06), z, M['frame'], 0.012)
        for sx in (-1, 1):
            box('Eckpfosten', 0.14, 0.14, Hc, sx * (Lc / 2 - 0.07), sy * (Wc / 2 - 0.07), Hc / 2, M['frame'], 0.012)
            for z in (0.06, Hc - 0.06): box('Eckbeschlag', 0.18, 0.17, 0.12, sx * (Lc / 2 - 0.08), sy * (Wc / 2 - 0.075), z, M['steel'], 0.01)
        box('Schriftfeld', 1.9, 0.02, 0.62, -1.6, sy * (Wc / 2 + 0.005), 1.85, M[paint], 0.006)
        text(code, 0.24, (-1.6 + sy * 0.82, sy * (Wc / 2 + 0.017), 1.9), (-sy, 0, 0), (0, 0, 1), tm)
        text('BASTION FRACHT', 0.1, (-1.6 + sy * 0.82, sy * (Wc / 2 + 0.017), 1.64), (-sy, 0, 0), (0, 0, 1), tm)
        streak((1.3 + sy * 0.6, sy * (Wc / 2 + 0.004), Hc - 0.25), (-sy, 0, 0), (0, 0, 1), 0.45, 1.5, 'spur')
    for sx in (-1, 1):
        for z in (0.08, Hc - 0.08): box('Containerholm quer', 0.12, Wc, 0.16, sx * (Lc / 2 - 0.06), 0, z, M['frame'], 0.012)
    x = Lc / 2      # Türseite
    for sy in (-1, 1):
        box('Containertür', 0.05, Wc / 2 - 0.14, Hc - 0.36, x - 0.01, sy * (Wc / 4 - 0.03), Hc / 2, M[paint], 0.012)
        for q in (0.3, 0.85):
            cyl('Riegelstange', 0.018, Hc - 0.3, x + 0.035, sy * q, Hc / 2, M['steel'], 'Z', n=8, bev=0); box('Riegelgriff', 0.03, 0.26, 0.04, x + 0.05, sy * q, 1.15, M['steel'], 0.006)
            for z in (0.2, Hc - 0.2): box('Riegelnocken', 0.05, 0.08, 0.06, x + 0.03, sy * q, z, M['frame'], 0.006)
    box('Typenschild', 0.006, 0.4, 0.3, x + 0.02, 0.62, 1.7, M['plate'], 0); text(code, 0.045, (x + 0.024, 0.45, 1.74), (0, 1, 0), (0, 0, 1), M['txtd'])
def p_schlepper():      # Flugzeugschlepper
    prism('Schlepper Rumpf', [(-1.75, 0.32), (1.75, 0.32), (1.75, 0.76), (1.25, 1.0), (-0.05, 1.0), (-0.05, 0.86), (-1.75, 0.86)], -0.64, 0.64, M['ochre'], 'Y', 0.03)
    for sx in (-1, 1):
        box('Stoßfänger', 0.16, 1.9, 0.3, sx * 1.82, 0, 0.5, M['frame'], 0.03); box('Stoßfänger Warnband', 0.012, 1.9, 0.16, sx * 1.906, 0, 0.5, M['warn'], 0)
        for sy in (-1, 1):
            cyl('Rad', 0.4, 0.32, sx * 1.12, sy * 0.82, 0.4, M['rubber'], 'Y', n=28, bev=0.03); cyl('Felge', 0.2, 0.34, sx * 1.12, sy * 0.82, 0.4, M['steel'], 'Y', n=16, bev=0.01)
            box('Kotflügel', 1.0, 0.36, 0.05, sx * 1.12, sy * 0.82, 0.86, M['ochre'], 0.015)
    for sy in (-1, 1):
        for x in (-0.12, -1.55): box('Kabinenholm', 0.07, 0.07, 1.0, x, sy * 0.6, 1.38, M['frame'], 0.012)
        box('Kabinenscheibe', 1.36, 0.016, 0.82, -0.835, sy * 0.6, 1.42, M['glass'], 0); cyl('Scheinwerfer', 0.08, 0.04, 1.76, sy * 0.42, 0.62, M['e_white'], 'X', n=12, bev=0)
        box('Rücklicht', 0.03, 0.16, 0.07, -1.76, sy * 0.48, 0.74, M['e_red'], 0)
    box('Kabinendach', 1.6, 1.34, 0.07, -0.835, 0, 1.91, M['ochre'], 0.02); box('Frontscheibe', 0.016, 1.13, 0.82, -0.12, 0, 1.42, M['glass'], 0); box('Heckscheibe', 0.016, 1.13, 0.82, -1.55, 0, 1.42, M['glass'], 0)
    box('Sitz', 0.5, 0.5, 0.12, -0.95, 0, 1.0, M['polster'], 0.03); box('Sitzlehne', 0.1, 0.5, 0.55, -1.22, 0, 1.3, M['polster'], 0.03)
    ring('Lenkrad', 0.17, 0.014, (-0.42, 0, 1.2), (1, 0, 0.6), M['rubber'], 20); cyl('Lenksäule', 0.02, 0.3, -0.33, 0, 1.1, M['frame'], 'X', n=8, bev=0)
    cyl('Rundumleuchte', 0.07, 0.12, -1.3, 0.4, 2.0, M['e_amber'], 'Z', n=14, bev=0); box('Motorhaube Gitter', 0.5, 0.9, 0.012, 0.6, 0, 1.006, M['grate'], 0.004)
    box('Kupplung', 0.36, 0.12, 0.08, -2.0, 0, 0.45, M['steel'], 0.01); cyl('Kupplungsbolzen', 0.03, 0.2, -2.12, 0, 0.5, M['steel'], 'Z', n=10, bev=0)
    for sy in (-1, 1): text('S-04', 0.2, (sy * 0.38, sy * 0.643, 0.5), (-sy, 0, 0), (0, 0, 1), M['txtd'])
def p_tankwagen():      # Tankwagen
    box('Fahrgestell', 7.0, 1.1, 0.24, 0, 0, 0.74, M['frame'], 0.03)
    cyl('Tank', 1.05, 4.4, -0.9, 0, 1.97, M['white'], 'X', n=40, bev=0.03)
    for sx in (-1, 1): cyl('Tankboden', 0.92, 0.2, -0.9 + sx * 2.3, 0, 1.97, M['white'], 'X', n=40, bev=0.05); cyl('Tankreifen', 1.07, 0.08, -0.9 + sx * 1.5, 0, 1.97, M['frame'], 'X', n=40, bev=0.01)
    cyl('Tankband', 1.062, 0.5, -0.9, 0, 1.97, M['ochre'], 'X', n=40, bev=0)
    for x in (-2.5, 0.7): box('Tanksattel', 0.3, 1.9, 0.5, x, 0, 1.08, M['frame'], 0.03)
    box('Laufsteg', 4.2, 0.6, 0.04, -0.9, 0, 3.05, M['grate'], 0.006)
    for sy in (-1, 1):
        pipe('Laufsteg Geländer', [(-3.0, sy * 0.3, 3.05), (-3.0, sy * 0.3, 3.75), (1.2, sy * 0.3, 3.75), (1.2, sy * 0.3, 3.05)], 0.018, M['ochre'], rad=0.08)
        box('Seitenscheibe', 0.8, 0.02, 0.6, 2.7, sy * 1.06, 1.95, M['glass'], 0)
        for x in (2.55, -1.9, -3.0): cyl('Rad', 0.5, 0.36, x, sy * 0.9, 0.5, M['rubber'], 'Y', n=28, bev=0.03); cyl('Felge', 0.26, 0.38, x, sy * 0.9, 0.5, M['steel'], 'Y', n=16, bev=0.01)
        cyl('Scheinwerfer', 0.09, 0.04, 3.42, sy * 0.72, 0.95, M['e_white'], 'X', n=12, bev=0); box('Rücklicht', 0.03, 0.2, 0.08, -3.9, sy * 0.8, 0.95, M['e_red'], 0)
        text('TREIBSTOFF', 0.34, (-0.9 - sy * 1.25 * -1, sy * 1.066, 1.8), (-sy, 0, 0), (0, 0, 1), M['txtd']); warnsign((-2.6, sy * 1.062, 1.97), (-sy, 0, 0), (0, 0, 1), 0.22)
    box('Kabine', 1.5, 2.1, 1.55, 2.65, 0, 1.62, M['white'], 0.08); box('Frontscheibe', 0.03, 1.8, 0.66, 3.4, 0, 1.95, M['glass'], 0)
    box('Kabine Sockel', 1.7, 2.15, 0.4, 2.65, 0, 0.72, M['frame'], 0.04); box('Stoßfänger Warnband', 0.012, 2.15, 0.16, 3.506, 0, 0.66, M['warn'], 0)
    cyl('Rundumleuchte', 0.08, 0.14, 2.4, 0.6, 2.47, M['e_amber'], 'Z', n=14, bev=0)
    box('Pumpenschrank', 0.9, 2.0, 1.25, -3.45, 0, 1.48, M['cab'], 0.04); box('Schranktür', 0.02, 0.9, 1.0, -3.905, -0.48, 1.5, M['door'], 0.01)
    cyl('Schlauchhaspel', 0.36, 0.5, -3.92, 0.48, 1.5, M['frame'], 'X', n=24, bev=0.02)
    for q in range(5): ring('Schlauchwicklung', 0.3 - q * 0.02, 0.035, (-3.98 - q * 0.005, 0.48, 1.5), (1, 0, 0), M['rubber'], 24)
    pipe('Schlauch', [(-4.0, 0.48, 1.2), (-4.3, 0.5, 0.3), (-4.6, 0.2, 0.04), (-5.6, -0.6, 0.04), (-6.3, 0.1, 0.04)], 0.035, M['rubber'], rad=0.25)
    cyl('Zapfkupplung', 0.06, 0.24, -6.38, 0.18, 0.06, M['steel'], 'X', n=12, bev=0.01)
def p_treppe():      # fahrbare Treppe, Podest auf 3,6 m
    n, run, rise = 12, 0.34, 0.3; ang = math.atan2(rise, run); ln = math.hypot(n * run, n * rise); x0 = -2.0; xt = x0 + n * run; zt = n * rise
    array(box('Stufe', 0.3, 0.95, 0.035, x0 + run / 2, 0, rise, M['grate'], 0.006), n, (run, 0, rise))
    box('Podest', 1.4, 1.1, 0.06, xt + 0.6, 0, zt, M['grate'], 0.008); box('Podest Warnkante', 0.06, 1.1, 0.064, xt + 1.3, 0, zt, M['warn'], 0)
    for sy in (-1, 1):
        box('Treppenwange', ln + 0.2, 0.05, 0.26, x0 + n * run / 2, sy * 0.5, zt / 2 - 0.02, M['ochre'], 0.01, (0, -ang, 0))
        pipe('Treppengeländer', [(x0, sy * 0.5, 0.2), (x0, sy * 0.5, 1.2), (xt, sy * 0.5, zt + 1.1), (xt + 1.28, sy * 0.5, zt + 1.1), (xt + 1.28, sy * 0.5, zt)], 0.022, M['ochre'], rad=0.1)
        pipe('Knieleiste', [(x0, sy * 0.5, 0.7), (xt, sy * 0.5, zt + 0.55), (xt + 1.28, sy * 0.5, zt + 0.55)], 0.015, M['steel'], rad=0.1)
        for q in (3, 6, 9): cyl('Geländerstütze', 0.018, 1.05, x0 + q * run, sy * 0.5, q * rise + 0.55, M['ochre'], 'Z', n=8, bev=0)
        for x in (xt + 0.1, xt + 1.2): box('Podeststütze', 0.08, 0.08, zt - 0.3, x, sy * 0.5, (zt - 0.3) / 2 + 0.26, M['ochre'], 0.012)
        box('Grundrahmen', 5.8, 0.1, 0.12, 0.75, sy * 0.5, 0.26, M['ochre'], 0.012)
        box('Diagonale', math.hypot(2.2, zt - 0.5), 0.05, 0.05, xt - 0.95, sy * 0.5, zt / 2 + 0.05, M['steel'], 0.006, (0, -math.atan2(zt - 0.5, 2.2), 0))
        for x in (-1.8, 3.3): cyl('Rolle', 0.13, 0.08, x, sy * 0.5, 0.13, M['rubber'], 'Y', n=18, bev=0.01)
    pipe('Podestgeländer', [(xt + 1.28, -0.5, zt + 1.1), (xt + 1.28, 0.5, zt + 1.1)], 0.022, M['ochre'])
    for x in (-1.8, 3.3): box('Quertraverse', 0.1, 1.0, 0.1, x, 0, 0.26, M['ochre'], 0.012)
    box('Deichsel', 1.2, 0.06, 0.06, -2.9, 0, 0.3, M['steel'], 0.01); box('Treppenschild', 0.01, 0.5, 0.2, xt + 1.31, 0, zt + 0.8, M['platey'], 0); text('T-2', 0.12, (xt + 1.317, -0.13, zt + 0.74), (0, 1, 0), (0, 0, 1), M['txtd'])
def p_regal(seed):      # Hochregal 6,2 × 1,7 × 7,7 m, Rückseite bei y = +0,85
    R = random.Random(seed)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Regalständer', 0.12, 0.1, 7.7, sx * 3.04, sy * 0.78, 3.85, M['teal'], 0.01); box('Ständerfuß', 0.24, 0.2, 0.02, sx * 3.04, sy * 0.78, 0.01, M['steel'], 0.004)
        for q in range(5): box('Ständerstrebe', 0.04, math.hypot(1.46, 1.4), 0.04, sx * 3.04, 0, 0.9 + q * 1.5, M['teal'], 0.004, ((0.765 if q % 2 else -0.765), 0, 0))
        box('Anfahrschutz', 0.3, 0.3, 0.4, sx * 3.04, -0.95, 0.2, M['warn'], 0.02)
    for lv, z in enumerate((2.0, 3.9, 5.8, 7.6)):
        for sy in (-1, 1): box('Regalträger', 5.96, 0.06, 0.14, 0, sy * 0.78, z, M['ochre'], 0.008)
        box('Regalboden', 5.9, 1.5, 0.03, 0, 0, z + 0.07, M['grate'], 0.004)
    for z in (0.0, 2.1, 4.0, 5.9):
        x = -2.9
        while x < 2.2:
            k = R.random(); w = 1.3
            if k < 0.35: inst(prop('palette'), (x + 0.65, 0, z), R.choice((0, PI / 2)))
            elif k < 0.75:
                w = R.uniform(1.2, 1.9); hgt = R.uniform(0.8, 1.5); m = R.choice(('crate', 'crate', 'wall2', 'teal', 'ochre', 'white'))
                box('Frachtkiste', w - 0.1, 1.3, hgt, x + w / 2, 0, z + hgt / 2 + 0.005, M[m], 0.03); box('Kistenband', w - 0.08, 1.32, 0.08, x + w / 2, 0, z + hgt * 0.72, M['frame'], 0.006)
                box('Kistenetikett', 0.3, 0.006, 0.2, x + w / 2 - 0.2, -0.655, z + hgt * 0.4, M['plate'], 0)
            elif k < 0.9:
                for q in range(2): inst(prop('fass'), (x + 0.35 + q * 0.62, -0.1, z), R.uniform(0, 6))
            else: w = 0.9
            x += w + 0.12
    label('REGAL %02d' % (seed % 7 + 1), 0.07, (-3.04, -0.84, 1.6), (1, 0, 0), (0, 0, 1))
def p_versorgung():      # Versorgungssäule am Stellplatz: Strom, Luft, Daten
    box('Säulensockel', 1.7, 1.1, 0.12, 0, 0, 0.06, M['frame'], 0.02); box('Versorgungsschrank', 1.5, 0.9, 1.9, 0, 0, 1.07, M['cab'], 0.04)
    for sx in (-1, 1):
        box('Schranktür', 0.68, 0.02, 1.5, sx * 0.36, -0.46, 1.1, M['door'], 0.012); box('Türgriff', 0.03, 0.03, 0.22, sx * 0.08, -0.48, 1.1, M['steel'], 0.008)
        cyl('Poller', 0.11, 1.0, sx * 1.3, -1.0, 0.5, M['ochre'], 'Z', n=16, bev=0.02); cyl('Pollerband', 0.113, 0.2, sx * 1.3, -1.0, 0.75, M['frame'], 'Z', n=16, bev=0)
    box('Säulenschirm', 0.44, 0.02, 0.3, -0.36, -0.475, 1.56, M['screen'], 0.006); box('Säule Warnband', 1.52, 0.92, 0.16, 0, 0, 0.26, M['warn'], 0)
    for q in range(5): cyl('Säulen-LED', 0.012, 0.012, 0.16 + q * 0.07, -0.474, 1.66, M['e_green' if q < 3 else 'e_amber'], 'Y', n=8, bev=0)
    text('VERSORGUNG', 0.09, (-0.42, -0.474, 1.86), (1, 0, 0), (0, 0, 1), M['txtw'])
    cyl('Haspel', 0.42, 0.3, 0.92, 0, 1.2, M['frame'], 'X', n=24, bev=0.02)
    for q in range(4): ring('Haspelwicklung', 0.36 - q * 0.03, 0.04, (1.02 + q * 0.01, 0, 1.2), (1, 0, 0), M['ochre' if q % 2 else 'rubber'], 24)
    pipe('Versorgungsschlauch', [(1.05, 0, 0.84), (1.3, -0.2, 0.2), (1.2, -1.6, 0.05), (0.2, -2.6, 0.05), (-0.6, -3.8, 0.05)], 0.04, M['rubber'], rad=0.3)
    cyl('Mast', 0.04, 1.3, -0.6, 0.3, 2.65, M['steel'], 'Z', n=10, bev=0); cyl('Mastleuchte', 0.09, 0.14, -0.6, 0.3, 3.36, M['e_amber'], 'Z', n=14, bev=0)
    box('Kabelkanal', 0.4, 3.2, 0.05, -0.3, -2.0, 0.025, M['rubber'], 0.01); box('Kanal Warnband', 0.1, 3.2, 0.004, -0.3, -2.0, 0.052, M['platey'], 0)
def p_laufkatze(drop):      # Laufkatze an der Kranschiene unter dem Dach (Ursprung: Unterkante Schiene)
    box('Laufkatze', 2.4, 1.8, 0.9, 0, 0, -0.5, M['ochre'], 0.05); box('Katzmotor', 0.9, 0.7, 0.6, 0, 1.2, -0.45, M['frame'], 0.04); box('Katze Warnband', 2.42, 1.82, 0.2, 0, 0, -0.85, M['warn'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('Kranseil', 0.025, drop, sx * 0.35, sy * 0.25, -0.95 - drop / 2, M['steel'], 'Z', n=8, bev=0)
    z = -0.95 - drop
    box('Hakenflasche', 1.0, 0.7, 0.9, 0, 0, z - 0.45, M['ochre'], 0.06); box('Flasche Warnband', 1.02, 0.72, 0.24, 0, 0, z - 0.6, M['warn'], 0)
    pipe('Kranhaken', [(0, 0, z - 0.9), (0, 0, z - 1.5), (0.34, 0, z - 1.8), (0.6, 0, z - 1.45)], 0.07, M['steel'], rad=0.25)
    cyl('Katzleuchte', 0.08, 0.12, 0.9, 0.6, -1.0, M['e_amber'], 'Z', n=12, bev=0)

# =====================================================================================
# Zusammenbau
# =====================================================================================
def col(name, parent=None):
    c = bpy.data.collections.new(name); (parent or SC.collection).children.link(c); return c
C_HALL, C_ROOF, C_OUT, C_CAM = col('Hangar'), col('Hangar Dach'), col('Draussen'), col('Kameras')
ROWS = [      # Belegung der acht Wandfelder eines Jochs
    ['feldh1', 'feldh2', 'feldh1', 'gitter', 'tuer1', 'schrank', 'schrank', 'feld3'], ['rohr_a', 'rohr', 'rohr', 'rohr_b', 'terminal', 'feld1', 'feuer', 'feld2'],
    ['regal', 'regal', 'werkbank', 'werkbank', 'flaschen', 'feld2', 'spind', 'spind'], ['feld1', 'aushang', 'bank', 'bank', 'schirm', 'feld3', 'tauscher', 'feld2'],
    ['feld2', 'gitter', 'pumpe', None, 'feld1', 'tuer2', 'terminal', 'feld3'], ['spind', 'spind', 'spind', 'bank', 'feuer', 'feldh2', 'feldh1', 'gitter'],
    ['feld3', 'flaschen', 'flaschen', 'feld1', 'rohr_a', 'rohr', 'rohr_b', 'schrank'],
]
def wand(P, ang, s, d=0.0):      # Punkt an einer Wand: s längs, d vor der Wand
    c, sn = math.cos(ang), math.sin(ang); return (P[0] - sn * s + c * d, P[1] + c * s + sn * d, 0.0)
def fill(P, ang, n=8, lo=0, hi=99, row=None):      # Wandfüllungen des Baukastens in die Felder eines Jochs
    if row is None:
        row = RH_.choice(ROWS)
        if RH_.random() < 0.5 and 'pumpe' not in row and 'rohr' not in row: row = row[::-1]
    for q in range(n):
        nm = row[q % 8]; s = -(n - 1) + q * 2
        if nm is None or q < lo or q > hi: continue
        inst(dress(nm), wand(P, ang, s + (1.0 if nm == 'pumpe' else 0.0), 1.7), ang)
def sign_text(s, size, P, ang, sl, z, m='plate', d=0.2):
    c, sn = math.cos(ang), math.sin(ang); o = wand(P, ang, sl, d); return thick(text(s, size, (o[0], o[1], z), (-sn, c, 0), (0, 0, 1), M[m]), 0.03)
def put(name, x, y, ang=0.0, fn=None, *a):
    c = module('Halle ' + name, fn, *a) if fn else prop(name); return inst(c, (x, y, 0), ang, C_HALL)
def assemble():
    CUR[0] = C_HALL
    sp = module('H Spant', h_spant); J = [module('H Joch %d' % v, h_joch, v) for v in range(3)]; tw = module('H Eckturm', h_turm)
    for k in range(9):      # Seitenwände
        yc = YG + 9 + 18 * k
        for (x, ang, tag) in ((-HW, 0.0, 'A'), (HW, PI, 'B')):
            inst(J[(k + (tag == 'B')) % 3], (x, yc, 0), ang); fill((x, yc), ang, lo=1 if k in (0, 8) else 0, hi=6 if k in (0, 8) else 9)
            sign_text('%s%d' % (tag, 9 - k), 2.6, (x, yc), ang, -5.6, 13.3)
    for k in range(1, 9):
        for (x, ang) in ((-HW, 0.0), (HW, PI)): inst(sp, (x, YG + 18 * k, 0), ang)
    inst(module('H Mitte', h_mitte), (0, YB, 0), -PI / 2)      # Rückwand
    fill((-10, YB), -PI / 2, 7, row=['feld1', 'terminal', 'feld2', 'feuer', 'schrank', 'schrank', 'feld3', 'feld1'])
    fill((10, YB), -PI / 2, 7, row=['feld2', 'feld1', 'schirm', 'terminal', 'feld3', 'aushang', 'feldh1', 'feld1'])
    for sx in (-1, 1):
        for k in range(4):
            xc = sx * (27 + 18 * k); inst(J[(k + (sx > 0) + 1) % 3], (xc, YB, 0), -PI / 2); fill((xc, YB), -PI / 2, lo=1 if (k == 3 and sx < 0) else 0, hi=6 if (k == 3 and sx > 0) else 9)
            sign_text('C%d' % (5 + sx * (k + 1) - (sx > 0)), 2.6, (xc, YB), -PI / 2, -5.6, 13.3)
        for k in range(5): inst(sp, (sx * (18 + 18 * k), YB, 0), -PI / 2)
    inst(module('H Tor', h_tor), (0, YG, 0), 0.0)      # Torwand
    J24 = module('H Joch 24', h_joch, 1, 24.0)
    for sx in (-1, 1): inst(J24, (sx * 80, YG, 0), PI / 2); fill((sx * 80, YG), PI / 2, 11, lo=2 if sx > 0 else 0, hi=8 if sx < 0 else 99)
    for (x, y, a) in ((-HW + 1.6, YG + 1.6, 0.0), (-HW + 1.6, YB - 1.6, -PI / 2), (HW - 1.6, YB - 1.6, PI), (HW - 1.6, YG + 1.6, PI / 2)): inst(tw, (x, y, 0), a)
    F = [module('H Boden %d' % v, h_boden, v) for v in range(3)]      # Boden
    for i in range(10):
        for j in range(9): inst(F[(i * 2 + j * 3 + (i * j) % 2) % 3], (-81 + 18 * i, YG + 9 + 18 * j, 0), (i + j) % 2 * PI)
    CUR[0] = C_ROOF      # Dach
    bd = module('H Binder', h_binder); df = module('H Dachfeld', h_dachfeld)
    for k in range(10): inst(bd, (0, YG + 18 * k, 0), 0.0, C_ROOF)
    for k in range(9): inst(df, (0, YG + 9 + 18 * k, 0), (k % 2) * PI, C_ROOF)
    CUR[0] = C_HALL
    for n, (px, hw) in enumerate(((-60, 26.0), (0, 30.0), (60, 26.0))):      # Stellplätze
        inst(module('H Platz %d' % hw, h_platz, hw), (px, -28, 0), 0.0)
        text('STELLPLATZ %d' % (n + 1), 1.1, (px + 5.6, 27.3, 0.006), (-1, 0, 0), (0, -1, 0), M['paint_w']); text('TRIEBWERKE AUS  ·  FREIGABE DECKMEISTER', 0.36, (px + 5.6, 27.9, 0.006), (-1, 0, 0), (0, -1, 0), M['paint_y'])
        thick(text(str(n + 1), 9.0, (px + 2.6, 16.0, 0.006), (-1, 0, 0), (0, -1, 0), M['paint_w']), 0.0); thick(text(str(n + 1), 9.0, (px - 2.6, -72.0, 0.006), (1, 0, 0), (0, 1, 0), M['paint_w']), 0.0)
    for (x, a) in ((-88.0, PI / 2), (-32.0, -PI / 2), (32.0, PI / 2), (88.0, -PI / 2)): put('Versorgung', x, 21.0, a, p_versorgung)
    # Laufkatzen mit Seil und Haken an der Decke: seit 2026-11-18 entfernt (Wunsch des Spielers, sie stören über großen Schiffen)
    # kz = [module('H Laufkatze %d' % d, p_laufkatze, d) for d in (9, 16, 5)]
    # for (x, y, k) in ((-60, -48, 0), (0, -28, 1), (60, -8, 2)): inst(kz[k], (x, y, 36.5), 0.0, C_ROOF)
    furnish()
def furnish():
    CT = {k: (lambda p, c: (lambda: p_container(p, c)))(p, c) for k, (p, c) in {'t': ('teal', 'LCU 204 771'), 'o': ('ochre', 'LCU 118 302'), 'w': ('white', 'LCU 377 045'), 'r': ('red', 'LCU 090 216'), 'g': ('wall2', 'LCU 552 190')}.items()}
    def cont(k, x, y, ang, z=0.0): e = inst(module('Halle Container ' + k, CT[k]), (x, y, z), ang, C_HALL); return e
    # Containerlager hinten links und rechts (hinter den äußeren Stellplätzen, vor den Hochregalen)
    for (k, x, y, a, z) in (('t', -72, 33, 0.02, 0), ('o', -72, 30.3, -0.01, 0), ('w', -72, 33, 0.0, 2.6), ('g', -65.4, 33, 0.0, 0), ('r', -65.4, 30.3, 0.03, 0), ('t', -65.4, 31.6, 0.0, 2.6),
                            ('o', -79.2, 36, PI / 2, 0), ('g', 70, 34, 0.0, 0), ('w', 70, 31.3, 0.02, 0), ('t', 76.6, 34, 0.0, 0), ('r', 70, 32.6, -0.04, 2.6), ('o', 50.5, 38.8, 0.3, 0),
                            ('w', -84, -96, PI / 2, 0), ('t', -84, -89.5, PI / 2, 0), ('g', -84, -92.8, PI / 2, 2.6), ('o', 84, -94, PI / 2, 0), ('r', 84, -87.4, PI / 2 + 0.05, 0)):
        cont(k, x, y, a, z)
    for q in range(6):      # Hochregale an der Rückwand (Spiel: Blöcke x ±45,5 … 83,5)
        for sx in (-1, 1): put('Regal %d' % (q % 3), sx * (48.8 + q * 6.4), 48.6, 0.0, p_regal, 3 + q % 3)
    put('Schlepper', -38.5, 37.4, 0.5, p_schlepper); put('Schlepper', 33.0, -86.0, -1.9, p_schlepper); put('Tankwagen', 41.0, 31.5, 2.9, p_tankwagen); put('Treppe', -35.5, 38.5, -0.3, p_treppe)
    put('Treppe', 87.5, 2.0, PI / 2, p_treppe); put('Tankwagen', -87.0, -40.0, PI / 2, p_tankwagen); put('Schlepper', -32.0, 4.0, -PI / 2, p_schlepper); put('Treppe', 32.0, -2.0, -PI / 2, p_treppe)
    cont('g', 32.0, -34.0, PI / 2); cont('o', -32.0, -40.0, PI / 2); cont('t', -32.0, -46.8, PI / 2 + 0.03)
    # Kleinteile aus dem Baukasten: an den Fußwegen, am Ausgang, bei den Fahrzeugen (der Streifen x −30 … 30, y 24,5 … 41 bleibt frei)
    for (nm, x, y, a) in (('palette', -16.5, 45.6, 0.1), ('palette', -18.2, 45.4, 1.6), ('karre', -14.6, 46.2, 2.2), ('tonne', -5.2, 46.4, 0), ('tonne', 5.6, 46.5, 0), ('absperrung', -22.5, 43.8, 0.2),
                          ('kisten', 15.5, 46.3, 3.3), ('trommel', 18.5, 45.4, 0.4), ('saeule', 4.6, 46.2, -PI / 2), ('wagen', 21.5, 44.6, 1.2), ('fass', 24.0, 46.5, 0),
                          ('fass', 24.7, 46.1, 1), ('palette', -43.5, 36.9, 0.4), ('trommel', -33.0, 37.0, 2.0), ('absperrung', 37.5, 27.0, 1.5), ('absperrung', 36.8, 35.5, 1.7), ('tonne', 44.5, 36.0, 0),
                          ('kisten', -88.6, 22.0, 0.0), ('palette', -88.2, 12.5, 0.1), ('karre', -88.8, 5.5, 0.3), ('fass', -88.9, -4.0, 0), ('fass', -88.3, -4.4, 2), ('trommel', -88.4, -22.0, 1.0),
                          ('wagen', -88.5, -58.0, 1.5), ('palette', 88.3, 26.0, 0.0), ('kisten', 88.6, 14.0, PI), ('absperrung', 87.6, -9.0, PI / 2), ('tonne', 88.9, -30.0, 0), ('palette', 88.2, -52.0, 0.2),
                          ('karre', 88.7, -70.0, 2.9), ('palette', -31.8, -60.0, 0.0), ('palette', 32.0, -20.0, 1.5), ('absperrung', -31.8, -20.0, PI / 2), ('trommel', 31.6, 8.0, 0.5)):
        put(nm, x, y, a)

# =====================================================================================
# Draußen, Welt, Kameras, Rendern
# =====================================================================================
def mat_emit(name, build):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; K = nt.links
    for n in list(N):
        if n.type != 'OUTPUT_MATERIAL': N.remove(n)
    build(N, K, next(n for n in N if n.type == 'OUTPUT_MATERIAL')); return m
def _feld(N, K, out):      # Kraftfeld im Tor: fast durchsichtig, feine waagerechte Linien
    tc = N.new('ShaderNodeTexCoord'); wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; I(wv, 'Scale').default_value = 2.2; I(wv, 'Distortion').default_value = 0.0
    K.new(tc.outputs['Object'], wv.inputs['Vector'])
    mr = N.new('ShaderNodeMapRange'); I(mr, 'From Min').default_value = 0.9; I(mr, 'From Max').default_value = 1.0; I(mr, 'To Min').default_value = 0.0015; I(mr, 'To Max').default_value = 0.035; K.new(wv.outputs[0], I(mr, 'Value'))
    em = N.new('ShaderNodeEmission'); I(em, 'Color').default_value = (0.2, 0.62, 1.0, 1); I(em, 'Strength').default_value = 0.8
    tr = N.new('ShaderNodeBsdfTransparent'); mx = N.new('ShaderNodeMixShader'); K.new(mr.outputs[0], mx.inputs[0]); K.new(tr.outputs[0], mx.inputs[1]); K.new(em.outputs[0], mx.inputs[2]); K.new(mx.outputs[0], out.inputs['Surface'])
def _sterne(N, K, out):
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); I(vo, 'Scale').default_value = 110.0; K.new(tc.outputs['Object'], vo.inputs['Vector'])
    dot = N.new('ShaderNodeMapRange'); I(dot, 'From Min').default_value = 0.0; I(dot, 'From Max').default_value = 0.07; I(dot, 'To Min').default_value = 1.0; I(dot, 'To Max').default_value = 0.0; K.new(vo.outputs[0], I(dot, 'Value'))
    nz = N.new('ShaderNodeTexNoise'); I(nz, 'Scale').default_value = 40.0; I(nz, 'Detail').default_value = 2.0; K.new(tc.outputs['Object'], nz.inputs['Vector'])
    thin = N.new('ShaderNodeMapRange'); I(thin, 'From Min').default_value = 0.5; I(thin, 'From Max').default_value = 0.62; I(thin, 'To Max').default_value = 5.0; K.new(nz.outputs[0], I(thin, 'Value'))
    mu = N.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; K.new(dot.outputs[0], mu.inputs[0]); K.new(thin.outputs[0], mu.inputs[1])
    nb = N.new('ShaderNodeTexNoise'); I(nb, 'Scale').default_value = 2.2; I(nb, 'Detail').default_value = 6.0; K.new(tc.outputs['Object'], nb.inputs['Vector'])
    mb = N.new('ShaderNodeMapRange'); I(mb, 'From Min').default_value = 0.5; I(mb, 'From Max').default_value = 0.85; I(mb, 'To Max').default_value = 0.0025; K.new(nb.outputs[0], I(mb, 'Value'))
    ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; K.new(mu.outputs[0], ad.inputs[0]); K.new(mb.outputs[0], ad.inputs[1])
    em = N.new('ShaderNodeEmission'); I(em, 'Color').default_value = (0.62, 0.76, 1.0, 1); K.new(ad.outputs[0], I(em, 'Strength')); K.new(em.outputs[0], out.inputs['Surface'])
def _planet(N, K, out):      # Wolken aus Rauschen, Helligkeit aus der Flächennormale (Tag-Nacht-Verlauf), blauer Dunstsaum am Rand
    geo = N.new('ShaderNodeNewGeometry'); dt = N.new('ShaderNodeVectorMath'); dt.operation = 'DOT_PRODUCT'; K.new(geo.outputs['Normal'], dt.inputs[0]); dt.inputs[1].default_value = Vector((-0.85, 0.15, 0.5)).normalized()
    lit = N.new('ShaderNodeMapRange'); I(lit, 'From Min').default_value = -0.05; I(lit, 'From Max').default_value = 0.75; I(lit, 'To Max').default_value = 1.0; K.new(dt.outputs['Value'], I(lit, 'Value'))
    tc = N.new('ShaderNodeTexCoord'); mp = N.new('ShaderNodeMapping'); I(mp, 'Scale').default_value = (1.0, 1.0, 2.6); K.new(tc.outputs['Object'], mp.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); I(nz, 'Scale').default_value = 22.0; I(nz, 'Detail').default_value = 12.0; I(nz, 'Roughness').default_value = 0.62; K.new(mp.outputs[0], nz.inputs['Vector'])
    cr = N.new('ShaderNodeValToRGB'); e = cr.color_ramp.elements; e[0].position = 0.43; e[0].color = (0.012, 0.04, 0.09, 1); e[1].position = 0.66; e[1].color = (0.7, 0.74, 0.78, 1); K.new(nz.outputs[0], cr.inputs[0])
    em = N.new('ShaderNodeEmission'); K.new(cr.outputs[0], I(em, 'Color'))
    mu = N.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; K.new(lit.outputs[0], mu.inputs[0]); mu.inputs[1].default_value = 0.36; K.new(mu.outputs[0], I(em, 'Strength'))
    lw = N.new('ShaderNodeLayerWeight'); I(lw, 'Blend').default_value = 0.5
    rim = N.new('ShaderNodeMapRange'); I(rim, 'From Min').default_value = 0.62; I(rim, 'From Max').default_value = 1.0; I(rim, 'To Max').default_value = 0.5; K.new(lw.outputs['Facing'], I(rim, 'Value'))
    m2 = N.new('ShaderNodeMath'); m2.operation = 'MULTIPLY'; K.new(rim.outputs[0], m2.inputs[0]); K.new(lit.outputs[0], m2.inputs[1])
    e2 = N.new('ShaderNodeEmission'); I(e2, 'Color').default_value = (0.2, 0.45, 1.0, 1); K.new(m2.outputs[0], I(e2, 'Strength'))
    ad = N.new('ShaderNodeAddShader'); K.new(em.outputs[0], ad.inputs[0]); K.new(e2.outputs[0], ad.inputs[1]); K.new(ad.outputs[0], out.inputs['Surface'])
def outside():
    CUR[0] = C_OUT
    f = box('Kraftfeld', 2 * DW, 0.02, DH, 0, YG - 0.4, DH / 2, mat_emit('Kraftfeld', _feld), 0); f.visible_shadow = False
    bm = bmesh.new(); bm.faces.new([bm.verts.new(p) for p in ((-0.93, 0, -0.5), (0.93, 0, -0.5), (0.93, 0, 0.5), (-0.93, 0, 0.5))]); me = bpy.data.meshes.new('Sterne'); bm.to_mesh(me); bm.free(); me.materials.append(mat_emit('Sternhimmel', _sterne))
    st = link(bpy.data.objects.new('Sterne', me)); st.location = (0, -24000, 2000); st.scale = (36000, 1, 36000)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=1.0); me = bpy.data.meshes.new('Planet'); bm.to_mesh(me); bm.free(); me.materials.append(mat_emit('Planet', _planet))
    for p in me.polygons: p.use_smooth = True
    pl = link(bpy.data.objects.new('Planet', me)); pl.location = (1500, -9000, -12700); pl.scale = (13300, 13300, 13300); pl.rotation_euler = (0.5, 0.2, 0)
    for o in (st, pl): o.visible_shadow = False
    CUR[0] = C_HALL
wd = SC.world or bpy.data.worlds.new('Welt'); SC.world = wd; wd.use_nodes = True
WN = wd.node_tree.nodes; WL = wd.node_tree.links
bg = next((n for n in WN if n.type == 'BACKGROUND'), None); wo = next(n for n in WN if n.type == 'OUTPUT_WORLD')
for l in list(wo.inputs['Volume'].links): WL.remove(l)      # geerbter Welt-Dunst aus BastionKit.blend: würde alles hinter dem Tor schlucken
def _dunst(N, K, out):
    v = N.new('ShaderNodeVolumePrincipled'); I(v, 'Density').default_value = 0.0006; I(v, 'Color').default_value = (0.75, 0.82, 0.9, 1); I(v, 'Anisotropy').default_value = 0.35; K.new(v.outputs[0], out.inputs['Volume'])
M['dunst'] = mat_emit('Hallendunst', _dunst)
CUR[0] = SC.collection
DUNST = box('Dunst', 2 * HW - 0.2, YB - YG - 0.6, HH - 0.2, 0, (YB + YG) / 2, HH / 2, M['dunst'], 0); DUNST.display_type = 'WIRE'; DUNST.visible_shadow = False
def haze(on, ambient=0.0, dens=None):
    if dens is not None: I(next(n for n in M['dunst'].node_tree.nodes if n.type == 'PRINCIPLED_VOLUME'), 'Density').default_value = dens
    DUNST.hide_render = not on
    bg.inputs[0].default_value = (0.003 + ambient, 0.004 + ambient, 0.006 + ambient, 1)
CAMS = {}
def cam(name, loc, tgt, lens, fstop=None):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.1; cd.clip_end = 60000
    ob = bpy.data.objects.new(name, cd); C_CAM.objects.link(ob); ob.location = loc
    d = Vector(tgt) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if fstop: cd.dof.use_dof = True; cd.dof.focus_distance = d.length; cd.dof.aperture_fstop = fstop
    CAMS[name] = ob; return ob
def cameras():
    cam('A Ankunft', (1.5, 46.0, 1.7), (-4.0, -112.0, 13.0), 17)
    cam('B Rueckwand', (-9.0, 8.0, 1.7), (1.0, 50.0, 14.0), 15)
    cam('C Fussweg', (-88.9, 29.6, 1.65), (-90.8, -40.0, 2.8), 20)
    cam('D Galerie', (-90.4, 26.0, GZ + 1.65), (30.0, -90.0, 4.0), 15)
    cam('E Tor', (-34.0, -84.0, 1.7), (64.0, -113.0, 14.0), 16)
    cam('F Deckmeister', (15.5, 41.5, 1.6), (6.0, 49.5, 2.3), 20)
    cam('G Uebersicht', (-84.0, 40.0, 30.0), (22.0, -52.0, 2.0), 15)
    cam('H Stellplatz', (-42.0, 34.5, 1.7), (-58.0, -40.0, 9.0), 18)
    cam('I Lager', (62.0, 24.5, 1.7), (72.0, 46.0, 4.0), 18)
    ob = cam('Plan', (0, -31, 300), (0, -30.999, 0), 50); ob.data.type = 'ORTHO'; ob.data.ortho_scale = 190
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def cycles(samples=150):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 7), ('volume_bounces', 0), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('transparent_max_bounces', 12), ('adaptive_threshold', 0.02), ('volume_step_rate', 4.0)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
EXPO = [0.6]
def view(name, path, res=(1600, 900), pct=100):
    plan = name == 'Plan'
    C_ROOF.hide_render = plan; C_OUT.hide_render = plan; haze(not plan, 0.06 if plan else 0.0)
    SC.view_settings.exposure = 0.5 if plan else EXPO[0]
    SC.camera = CAMS[name]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = pct
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
def job(views, samples=150, pct=100, mark='fertig-hangar.txt'):      # im Hintergrund rendern (überlebt die Anfrage); am Ende entsteht die Marke
    mp = os.path.join(HERE, mark)
    if os.path.exists(mp): os.remove(mp)
    def run():
        try:
            cycles(samples)
            for (nm, fn, res) in views: view(nm, os.path.join(HERE, fn), res, pct)
            bpy.context.preferences.addons['cycles'].preferences.compute_device_type = 'NONE'
            open(mp, 'w').write('ok')
        except Exception as e:
            import traceback; open(mp, 'w').write('FEHLER ' + traceback.format_exc()[-1200:])
        return None
    bpy.app.timers.register(run, first_interval=0.5)
def tris(colls=None):      # Dreiecke: gesetzt (alle Instanzen) und einmalig (jeder Baustein nur einmal gezählt)
    dg = bpy.context.evaluated_depsgraph_get(); cache = {}; total = 0
    for it in dg.object_instances:
        ob = it.object
        if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
        key = ob.original.name
        if key not in cache:
            try: me = ob.to_mesh(); cache[key] = sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
            except Exception: cache[key] = 0
        total += cache[key]
    return {'gesetzt': total, 'einmalig': sum(cache.values())}
assemble(); outside(); cameras()
result = {'bausteine': len(MOD), 'instanzen': len(C_HALL.objects) + len(C_ROOF.objects), 'objekte': len(bpy.data.objects)}
