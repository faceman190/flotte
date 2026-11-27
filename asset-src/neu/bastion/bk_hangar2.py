# Bastion-Hangar, zweite Runde (2026-11-27). Nutzer: „Hangar auch nochmal überarbeiten mit mehr Details und dann mit möglichst guter
# Qualität ins Spiel, MB spielen keine Rolle“. Läuft nach bk_halle.py im selben Namensraum (lm2_hangar_lauf.py, hg_lauf.py).
# Die erste Runde (bk_hangar.py, bk_halle.py) bleibt; hier kommen Bausteine und Belegung dazu:
#   Wand:   Fassade der Galerie (Türen, Felder, Schränke), Wandfluter, Lageanzeigen, Steigtrassen, Rohrstrang unter der Kranbahn, Spuren
#   Spant:  Strahler in 34 m Höhe, Leitungsrohr
#   Dach:   Laufstege zwischen den Stellplätzen, Oberlicht auf den Hallenleuchten (macht Pfetten und Kanäle sichtbar), Sprinkler, Kabelbahnen
#   Tor:    Feldprojektoren am Rahmen, Antriebe auf dem Sturz, Anzeigen, Leitfeuer im Boden
#   Boden:  Fahrweg hinter den Stellplätzen, Fußweg vom Ausgang, Winkel und Entfernungsmarken auf den Plätzen, Brandspuren, Reifenspuren
#   Gerät:  Lichtmast, Bodenstromaggregat, Arbeitsbühne, Werkzeugschrank, Stapler, Ersatztriebwerk, Schwenkkran, Frachtstapel, Platzpylon …
# Frei bleiben müssen (Spiel, interior.ts): die Stellplätze bis y = 15 (der Wisent ist 83 × 66 m), der Streifen x −30 … 30 vor dem Ausgang,
# die Wege der Läufer (y 26,6 … 35,4 hinter den Plätzen; x ±85,6 an den Längswänden) und die Gesprächsgruppen bei (−22, 41) und (58, 41,5).
R2 = random.Random(77)
M['e_flut'] = mk('Flutlicht', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.88, 0.94, 1.0), es=26.0, grime=False)
M['e_up'] = mk('Oberlicht', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.8, 0.9, 1.0), es=5.0, grime=False)
M['e_wash'] = mk('Wandfluter', (1, 0.8, 0.5), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.72, 0.42), es=14.0, grime=False)
M['e_feld'] = mk('Feldprojektor', (0.4, 0.7, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.3, 0.62, 1.0), es=7.0, grime=False)
M['alu'] = mk('Alu', (0.3, 0.31, 0.33), 0.9, 0.4, var=0.14, bump=0.2, wear=0.4)
M['gelb'] = mk('Lack gelb', (0.7, 0.47, 0.03), 0.0, 0.45, var=0.22, bump=0.3, wear=1.0)

# =====================================================================================
# Wand
# =====================================================================================
def tafel(c, xd, yd, w, hgt, seed, titel):      # Lageanzeige (c = Mitte der Rückseite): dunkle Scheibe, Kopfzeile, Zeilen aus Meldelampe und Leuchtbalken
    R = random.Random(seed); mw, X, Y, Z = frame(c, xd, yd); c = Vector(c); z1 = 0.232
    P = lambda u, v, k=0.0: c + X * u + Y * v + Z * k
    plate(w + 0.4, hgt + 0.4, P(-w / 2 - 0.2, -hgt / 2 - 0.2), xd, yd, M['frame'], 0.2, 0.04, 'Anzeige Rahmen')
    plate(w, hgt, P(-w / 2, -hgt / 2, 0.2), xd, yd, M['glass'], 0.03, 0, 'Anzeige Scheibe')
    plate(w - 0.3, 0.05, P(-w / 2 + 0.15, hgt / 2 - 0.62, z1), xd, yd, M['e_amber'], 0.004, 0, 'Anzeige Linie')
    text(titel, 0.26, P(-w / 2 + 0.2, hgt / 2 - 0.46, z1), xd, yd, M['txto'])
    for r in range(int((hgt - 1.0) / 0.34)):
        v = hgt / 2 - 0.98 - r * 0.34; u = -w / 2 + 0.2; q = R.random()
        plate(0.2, 0.2, P(u, v, z1), xd, yd, M['e_green' if q < 0.65 else 'e_amber' if q < 0.9 else 'e_red'], 0.004, 0, 'Anzeige Lampe'); u += 0.42
        for k in range(3):
            plate(R.uniform(0.4, (w - 1.0) / 3 - 0.2), 0.15, P(u, v + 0.025, z1), xd, yd, M['e_teal' if k != 1 else 'e_cool'], 0.004, 0, 'Anzeige Balken'); u += (w - 1.0) / 3
GFRONT = (['T', 'F', 'P', 'L', 'P', 'S', 'P', 'F'], ['P', 'L', 'T', 'P', 'F', 'P', 'S', 'P'], ['F', 'P', 'S', 'T', 'P', 'L', 'P', 'T'])
def galeriefront(v, L):      # Wand hinter der Galerie (9,6 … 11,8 m): Türen mit Leuchtfenster, Felder, Lüftung, Schaltschränke
    h = L / 2; n = int(L / 2) - 1; seq = GFRONT[v % 3]; zc = GZ + 1.18
    array(box('Galerie Pfosten', 0.1, 0.16, 1.95, 0.05, -(h - 1), zc, M['frame'], 0.01), n + 1, (0, 2, 0))
    for q in range(n):
        y = -(h - 2) + q * 2; k = seq[q % 8]
        if k == 'T':
            box('Galerietür Rahmen', 0.1, 1.36, 2.0, 0.04, y, zc, M['frame'], 0.02); box('Galerietür', 0.06, 1.1, 1.86, 0.075, y, zc - 0.04, M['door'], 0.015)
            box('Galerietür Fenster', 0.07, 0.3, 0.5, 0.078, y, GZ + 1.55, M['e_warmp'], 0.008); box('Galerietür Warnband', 0.064, 1.1, 0.14, 0.076, y, GZ + 0.36, M['warn'], 0)
            box('Galerietür Griff', 0.05, 0.04, 0.26, 0.12, y + 0.4, GZ + 1.05, M['steel'], 0.008); box('Galerietür Licht', 0.05, 1.0, 0.04, 0.1, y, GZ + 2.1, M['e_teal'], 0)
            label('G %d%02d' % (v + 1, q + 1), 0.06, (0.11, y - 0.5, GZ + 1.72), BX_, BY_)
        elif k in 'FP':
            box('Galeriefeld', 0.05, 1.74, 1.82, 0.03, y, zc, M['wall2' if k == 'F' else 'wall3'], 0.012)
            if k == 'P': box('Galeriefeld Band', 0.054, 1.74, 0.1, 0.03, y, GZ + 1.52, M['ochre'], 0)
            else: bolts(0.056, [y - 0.78, y + 0.78], [GZ + 0.4, GZ + 1.96], r=0.014, ln=0.01)
        elif k == 'L':
            box('Galerie Lüftung Rahmen', 0.08, 1.7, 1.5, 0.04, y, zc + 0.1, M['frame'], 0.02); box('Galerie Lüftung Grund', 0.03, 1.5, 1.3, 0.05, y, zc + 0.1, M['wall4'], 0)
            array(box('Galerie Lamelle', 0.1, 1.5, 0.025, 0.1, y, GZ + 0.72, M['wall2'], 0.004, (0, 0.5, 0)), 10, (0, 0, 0.13))
        else:
            box('Galerie Schaltschrank', 0.42, 1.6, 1.84, 0.21, y, zc - 0.04, M['cab'], 0.02)
            for sy in (-1, 1): box('Schaltschrank Tür', 0.02, 0.74, 1.6, 0.43, y + sy * 0.39, zc - 0.04, M['door'], 0.01); box('Schaltschrank Griff', 0.03, 0.03, 0.2, 0.45, y + sy * 0.08, zc, M['steel'], 0.006)
            for i in range(4): cyl('Schaltschrank LED', 0.012, 0.012, 0.442, y - 0.6 + i * 0.08, GZ + 1.78, M['e_green' if i != 2 else 'e_amber'], 'X', n=8, bev=0)
            warnsign((0.442, y + 0.39, GZ + 1.5), BX_, BY_, 0.1)
def h2_joch(v, L=18.0):      # Technik eines Wandjochs (auf dieselbe Stelle wie h_joch gesetzt)
    h = L / 2; a = h - 0.78; cols = 3 if L < 20 else 4; wd = 2 * a / cols; R = random.Random(410 + v + int(L))
    galeriefront(v, L)
    nf = 3 if L < 20 else 4      # Wandfluter auf dem Gesims der Galerie: strahlen die großen Wandfelder von unten an
    for q in range(nf):
        y = -h + 3.0 + q * (L - 6.0) / (nf - 1)
        box('Fluter Bügel', 0.06, 0.5, 0.26, 0.4, y, GZ + 2.46, M['frame'], 0.008); box('Fluter Gehäuse', 0.34, 0.9, 0.2, 0.56, y, GZ + 2.6, M['wall4'], 0.03, (0, -0.35, 0))
        box('Fluter Glas', 0.26, 0.8, 0.02, 0.525, y, GZ + 2.7, M['e_wash'], 0, (0, -0.35, 0))
        li = area('Wandfluter Licht', (0.56, y, GZ + 2.78), (0, math.radians(168), 0), 0.26, 0.8, 520, WARM); li.data.spread = math.radians(140)
    if v % 3 != 0:      # große Lageanzeige im freien Feld der untersten Reihe über der Galerie
        yc = -a + 2.5 * wd; zc = 15.7; t = v % 3 == 1
        tafel((0.14, yc, zc), BX_, BY_, 4.6, 3.1, 50 + v + int(L), 'STELLPLÄTZE · BELEGUNG' if t else 'DECKBETRIEB · LAGE')
        for sy in (-1, 1): box('Anzeige Konsole', 0.3, 0.16, 0.16, 0.15, yc + sy * 2.0, zc - 1.83, M['frame'], 0.02)
    yr = -h + 1.45      # Steigtrasse von der Galerie zur Kranbahn
    box('Steigtrasse', 0.04, 0.62, 19.2, 0.165, yr, 22.1, M['steel'], 0.006)
    for q in range(5):
        r = 0.028 + (q % 3) * 0.012; cyl('Steigkabel', r, 19.2, 0.19 + r, yr - 0.22 + q * 0.11, 22.1, M[['rubber', 'ochre', 'rubber', 'teal', 'rubber'][q]], 'Z', n=8, bev=0)
    array(box('Kabelschelle', 0.1, 0.7, 0.07, 0.215, yr, 13.6, M['frame'], 0.008), 9, (0, 0, 2.25))
    box('Verteilerkasten', 0.3, 0.86, 1.1, 0.3, yr, 14.9, M['cab'], 0.03); box('Verteiler Tür', 0.02, 0.74, 0.96, 0.46, yr, 14.9, M['door'], 0.01)
    cyl('Verteiler LED', 0.02, 0.02, 0.47, yr - 0.25, 15.3, M['e_green'], 'X', n=8, bev=0); warnsign((0.472, yr + 0.12, 14.9), BX_, BY_, 0.16)
    for (x, z, r, m) in ((0.66, 31.05, 0.2, 'wall2'), (1.0, 31.22, 0.13, 'copper'), (0.98, 30.78, 0.16, 'steel')):      # Rohrstrang unter der Kranbahn
        cyl('Wandrohr', r, L, x, 0, z, M[m], 'Y', n=14, bev=0)
        array(cyl('Wandrohr Flansch', r + 0.04, 0.08, x, -h + 2.0, z, M['frame'], 'Y', n=14, bev=0.008), int(L / 4.5), (0, 4.5, 0))
    array(box('Rohrhänger', 0.74, 0.06, 0.92, 0.84, -h + 3.0, 31.3, M['frame'], 0.008), int(L / 6), (0, 6, 0))
    cyl('Wandrohr Marke', 0.205, 0.6, 0.66, R.uniform(-a * 0.6, a * 0.6), 31.05, M['ochre'], 'Y', n=14, bev=0)
    for q in range(7):      # Spuren auf den Feldern über der Galerie (unten liegen die Platten verschieden tief)
        y = R.uniform(-a + 0.6, a - 0.6); z = R.choice((18.3, 24.2, 30.2, 30.2, 24.2)); k = R.choice(('rost', 'spur', 'staub', 'spur'))
        streak((0.148, y, z), BX_, BY_, R.uniform(0.5, 1.8), R.uniform(2.5, 6.0), k)
def h2_mitte():      # über dem Ausgang: Leuchtschild mit Blende (der Rahmen des Durchgangs gehört zum Deck, pd_deck.py). Seit den zwei Ebenen führt er zu den Aufzügen.
    box('Ausgang Schildkasten', 0.3, 7.0, 1.5, 0.15, 0, 6.0, M['frame'], 0.04); box('Ausgang Schild', 0.03, 6.6, 1.1, 0.31, 0, 6.0, M['wall4'], 0)
    text('AUFZÜGE', 0.52, (0.33, -1.5, 6.04), BX_, BY_, M['txtw']); text('DECK 3  ·  QUARTIERE', 0.2, (0.33, -1.38, 5.66), BX_, BY_, M['txto'])
    box('Ausgang Leuchtband', 0.05, 6.6, 0.07, 0.31, 0, 5.33, M['e_teal'], 0); box('Ausgang Blende', 0.6, 7.0, 0.08, 0.3, 0, 6.86, M['frame'], 0.02)
    box('Ausgang Blendlicht', 0.34, 6.4, 0.02, 0.36, 0, 6.81, M['e_panel'], 0)
    for sy in (-1, 1): cyl('Ausgang Feuer', 0.07, 0.06, 0.33, sy * 3.1, 6.0, M['e_amber'], 'X', n=12, bev=0)
def h2_spant():      # am Hauptspant: zwei Strahler in 34 m Höhe (Lichtinseln entlang der Wände), Leitungsrohr
    box('Strahlerträger', 0.7, 2.6, 0.16, 2.9, 0, 34.95, M['frame'], 0.02)
    for sy in (-1, 1):
        box('Strahler', 0.5, 0.9, 0.6, 3.05, sy * 0.75, 34.45, M['wall4'], 0.04, (0, 0.6, 0)); box('Strahlerglas', 0.03, 0.78, 0.48, 3.265, sy * 0.75, 34.3, M['e_flut'], 0, (0, 0.6, 0))
        array(box('Strahler Kühlrippe', 0.3, 0.04, 0.5, 2.86, sy * 0.75 - 0.36, 34.58, M['alu'], 0.004, (0, 0.6, 0)), 7, (0, 0.12, 0))
    li = area('Spantstrahler', (3.45, 0, 34.15), (0, math.radians(-40), 0), 0.6, 1.8, 3000, COOL); li.data.spread = math.radians(115)
    cyl('Spantrohr', 0.06, 27.0, 1.5, 0.64, 17.2, M['steel'], 'Z', n=10, bev=0); array(box('Rohrschelle', 0.1, 0.18, 0.05, 1.46, 0.64, 5.5, M['frame'], 0.006), 9, (0, 0, 3.0))
    box('Spant Klemmkasten', 0.16, 0.3, 0.4, 1.42, 0.64, 3.6, M['cab'], 0.02)

# =====================================================================================
# Dach (ein Feld von 18 m, gesetzt wie h_dachfeld)
# =====================================================================================
def h2_dach():
    for q in range(8):
        x = -80.5 + q * 23.0
        for sy in (-1, 1): box('Leuchte Oberlicht', 9.0, 0.2, 0.03, x, sy * 1.36, 37.19, M['e_up'], 0)
        array(box('Leuchte Kühlrippe', 0.06, 2.3, 0.14, x - 4.4, 0, 37.24, M['alu'], 0.006), 23, (0.4, 0, 0))
        for sx in (-1, 1): box('Leuchte Stirnblech', 0.08, 3.06, 0.5, x + sx * 5.02, 0, 37.0, M['frame'], 0.02)
    for sx in (-1, 1):      # Laufsteg zwischen den Stellplätzen
        x = sx * 31.0
        box('Laufsteg Dach', 1.5, BAY, 0.06, x, 0, 34.6, M['grate'], 0.008); box('Laufsteg Licht', 0.12, BAY - 2.0, 0.03, x, 0, 34.55, M['e_cool'], 0)
        for sg in (-1, 1):
            xs = x + sg * 0.78
            box('Laufsteg Holm', 0.1, BAY, 0.22, xs, 0, 34.5, M['frame'], 0.015); box('Laufsteg Fußleiste', 0.02, BAY, 0.12, xs, 0, 34.7, M['gelb'], 0.004)
            cyl('Laufsteg Handlauf', 0.03, BAY, xs, 0, 35.72, M['gelb'], 'Y', n=8, bev=0); cyl('Laufsteg Knieleiste', 0.02, BAY, xs, 0, 35.2, M['steel'], 'Y', n=8, bev=0)
            array(box('Laufsteg Pfosten', 0.06, 0.06, 1.15, xs, -8.0, 35.15, M['gelb'], 0.008), 9, (0, 2.0, 0))
            array(cyl('Laufsteg Hänger', 0.035, 6.5, xs, -7.0, 37.85, M['steel'], 'Z', n=8, bev=0), 4, (0, 4.8, 0))      # nicht bei y = 0: Dort hängt die Hallenleuchte
        cyl('Löschleitung Steg', 0.05, BAY, x + 1.1, 0, 34.9, M['red'], 'Y', n=8, bev=0)
    for sy in (-1, 1):      # Sprinkler quer durch die Halle
        cyl('Sprinklerrohr', 0.05, 2 * HW, 0, sy * 4.5, 38.1, M['red'], 'X', n=8, bev=0)
        array(cyl('Sprinklerkopf', 0.03, 0.4, -86.25, sy * 4.5, 37.88, M['steel'], 'Z', n=6, bev=0), 16, (11.5, 0, 0))
    for x in (-74.0, -46.0, 46.0, 74.0):      # Kabelbahnen längs
        box('Dach Kabelbahn', 0.7, BAY, 0.06, x, 0, 38.5, M['steel'], 0.008)
        for q in range(3): cyl('Dachkabel', 0.05 + (q % 2) * 0.02, BAY, x - 0.2 + q * 0.2, 0, 38.6, M[['rubber', 'ochre', 'rubber'][q]], 'Y', n=8, bev=0)
        array(box('Kabelbahn Hänger', 0.9, 0.05, 0.05, x, -6.0, 38.45, M['frame'], 0.006), 3, (0, 6.0, 0))
        for sg in (-1, 1): array(cyl('Kabelbahn Stab', 0.02, 3.4, x + sg * 0.42, -6.0, 40.15, M['steel'], 'Z', n=6, bev=0), 3, (0, 6.0, 0))

# =====================================================================================
# Tor (Wandebene y = 0, Blick nach +Y in die Halle; Öffnung x ±62, 32 m hoch)
# =====================================================================================
def h2_tor():
    for sx in (-1, 1):
        array(box('Feldprojektor', 0.5, 0.7, 1.0, sx * (DW - 0.22), 1.45, 3.0, M['wall4'], 0.05), 8, (0, 0, 4.0))
        array(box('Projektorlinse', 0.05, 0.36, 0.6, sx * (DW - 0.49), 1.45, 3.0, M['e_feld'], 0), 8, (0, 0, 4.0))
        box('Projektor Kabelkanal', 0.1, 0.14, 30.0, sx * (DW - 0.06), 1.92, 16.0, M['frame'], 0.01)
        tafel((sx * (DW + 3.2), 2.02, 29.6), (-1, 0, 0), (0, 0, 1), 3.2, 2.4, 90 + sx, 'TOR 1 · FELD AKTIV')
    array(box('Feldprojektor oben', 1.0, 0.7, 0.5, -56.0, 1.45, DH - 0.24, M['wall4'], 0.05), 15, (8.0, 0, 0))
    array(box('Projektorlinse oben', 0.6, 0.36, 0.05, -56.0, 1.45, DH - 0.51, M['e_feld'], 0), 15, (8.0, 0, 0))
    array(box('Torantrieb', 2.6, 1.3, 1.5, -54.0, 1.2, DH + 4.75, M['cab'], 0.06), 10, (12.0, 0, 0))      # Antriebe auf dem Sturz
    array(cyl('Antriebsmotor', 0.5, 1.6, -51.7, 1.2, DH + 4.6, M['wall2'], 'X', n=20, bev=0.03), 10, (12.0, 0, 0))
    array(box('Antrieb Warnband', 2.62, 1.32, 0.2, -54.0, 1.2, DH + 4.2, M['warn'], 0), 10, (12.0, 0, 0))
    array(cyl('Antrieb Leuchte', 0.08, 0.12, -54.9, 1.6, DH + 5.56, M['e_amber'], 'Z', n=10, bev=0), 10, (12.0, 0, 0))
    box('Sturz Kabelbahn', 2 * DW, 0.4, 0.06, 0, 0.28, DH + 4.06, M['steel'], 0.008)
    for q in range(4): cyl('Sturzkabel', 0.05 + (q % 2) * 0.02, 2 * DW, 0, 0.14 + q * 0.1, DH + 4.14, M[['rubber', 'teal', 'rubber', 'ochre'][q]], 'X', n=8, bev=0)
    for px in (-60.0, 0.0, 60.0):      # Leitfeuer und Haltelinie vor dem Tor
        array(cyl('Leitfeuer', 0.13, 0.03, px, 7.0, 0.012, M['e_pad'], 'Z', n=10, bev=0), 7, (0, 4.0, 0))
        box('Haltelinie', 30.0, 0.5, 0.004, px, 28.0, 0.004, M['paint_y'], 0)
        text('HALTELINIE  ·  FREIGABE TOR ABWARTEN', 0.5, (px + 8.4, 27.2, 0.006), (-1, 0, 0), (0, -1, 0), M['paint_w'])
        for q in range(3):      # Winkel in Rollrichtung zum Tor
            for sg in (-1, 1): box('Rollwinkel', 4.6, 0.5, 0.004, px + sg * 1.9, 20.0 - q * 4.0, 0.0052, M['paint_w'], 0, (0, 0, sg * 0.75))

# =====================================================================================
# Gerät (Ursprung am Boden; Fahrzeuge und Strahler schauen nach +X)
# =====================================================================================
def p_torriegel():      # Verriegelung am Fuß des Torpfeilers (eigener Baustein, damit er eine Standfläche bekommt)
    box('Torriegel', 1.1, 0.9, 1.6, 0, 0, 1.0, M['cab'], 0.06); cyl('Riegelzylinder', 0.16, 1.0, 0, 0, 2.2, M['steel'], 'Z', n=14, bev=0.01)
    box('Riegel Warnband', 1.12, 0.92, 0.2, 0, 0, 0.34, M['warn'], 0); box('Riegel Klappe', 0.7, 0.02, 0.8, 0, 0.455, 1.1, M['door'], 0.01)
    cyl('Riegel LED', 0.02, 0.02, 0.3, 0.46, 1.6, M['e_green'], 'Y', n=8, bev=0)
def h2_platz():      # Feuer im Boden um den Aufsetzkreis und auf der Mittellinie (Ursprung = Platzmitte)
    for k in range(24): cyl('Kreisfeuer', 0.12, 0.03, math.cos(k * PI / 12) * 9.7, math.sin(k * PI / 12) * 9.7, 0.012, M['e_pad'], 'Z', n=10, bev=0)
    array(cyl('Mittelfeuer', 0.1, 0.03, 0, -46.0, 0.012, M['e_pad'], 'Z', n=10, bev=0), 9, (0, 4.0, 0))
def p_lichtmast():      # fahrbarer Lichtmast, 9,4 m: Fahrgestell mit Aggregat und Stützen, Teleskopmast, vier Strahler
    box('Mast Fahrgestell', 2.2, 1.3, 0.5, 0, 0, 0.62, M['gelb'], 0.04); box('Mast Aggregat', 1.2, 1.1, 0.8, -0.38, 0, 1.25, M['cab'], 0.04)
    box('Aggregat Gitter', 0.02, 0.8, 0.5, -0.99, 0, 1.25, M['grate'], 0.004); box('Mast Warnband', 2.22, 1.32, 0.14, 0, 0, 0.47, M['warn'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            cyl('Mastrad', 0.3, 0.2, sx * 0.72, sy * 0.74, 0.3, M['rubber'], 'Y', n=20, bev=0.02); cyl('Mastrad Nabe', 0.14, 0.22, sx * 0.72, sy * 0.74, 0.3, M['steel'], 'Y', n=12, bev=0.008)
            box('Stützausleger', 0.9, 0.08, 0.08, sx * 1.35, sy * 0.95, 0.5, M['steel'], 0.01, (0, 0, sx * sy * 0.6)); cyl('Stützfuß', 0.1, 0.5, sx * 1.72, sy * 1.2, 0.25, M['steel'], 'Z', n=10, bev=0.01)
            cyl('Stützteller', 0.2, 0.03, sx * 1.72, sy * 1.2, 0.015, M['frame'], 'Z', n=12, bev=0)
    for (r, z0, z1) in ((0.1, 0.9, 4.2), (0.075, 4.0, 7.0), (0.05, 6.8, 9.4)):
        cyl('Mastrohr', r, z1 - z0, 0.55, 0, (z0 + z1) / 2, M['alu'], 'Z', n=12, bev=0.006); cyl('Mastmuffe', r + 0.02, 0.14, 0.55, 0, z1 - 0.1, M['frame'], 'Z', n=12, bev=0.006)
    box('Mastkopf', 0.14, 2.3, 0.1, 0.55, 0, 9.4, M['frame'], 0.012)
    for q in range(4):
        y = -0.9 + q * 0.6; box('Maststrahler', 0.22, 0.5, 0.4, 0.68, y, 9.1, M['wall4'], 0.03, (0, 0.7, 0)); box('Maststrahler Glas', 0.02, 0.42, 0.32, 0.772, y, 9.023, M['e_flut'], 0, (0, 0.7, 0))
    li = area('Lichtmast Licht', (0.95, 0, 8.95), (0, math.radians(-50), 0), 0.4, 2.0, 2600, COOL); li.data.spread = math.radians(120)
    pipe('Mastkabel', [(0.6, 0.1, 9.3), (0.62, 0.12, 5.0), (0.3, 0.3, 1.7)], 0.015, M['rubber'], rad=0.2)
    box('Mast Bedienfeld', 0.03, 0.5, 0.36, 0.235, 0.2, 1.3, M['cab'], 0.01); cyl('Mast LED', 0.014, 0.012, 0.255, 0.35, 1.4, M['e_green'], 'X', n=8, bev=0)
    box('Mast Deichsel', 1.0, 0.07, 0.07, -1.55, 0, 0.5, M['steel'], 0.01)
    for sy in (-1, 1): text('LM-3', 0.16, (sy * 0.3, sy * 0.653, 0.6), (-sy, 0, 0), (0, 0, 1), M['txtd'])
def p_aggregat():      # Bodenstromaggregat auf Fahrgestell
    box('Aggregat Rahmen', 2.7, 1.4, 0.16, 0, 0, 0.5, M['frame'], 0.02); box('Aggregat Haube', 2.3, 1.36, 1.1, -0.1, 0, 1.13, M['gelb'], 0.06); box('Aggregat Dach', 2.36, 1.42, 0.06, -0.1, 0, 1.7, M['wall4'], 0.02)
    for sy in (-1, 1):
        box('Aggregat Lamellengrund', 1.0, 0.02, 0.62, -0.6, sy * 0.685, 1.15, M['wall4'], 0)
        array(box('Aggregat Lamelle', 0.98, 0.03, 0.035, -0.6, sy * 0.695, 0.9, M['grate'], 0.004, (sy * 0.5, 0, 0)), 7, (0, 0, 0.085))
        box('Wartungsklappe', 0.8, 0.02, 0.74, 0.5, sy * 0.685, 1.15, M['gelb'], 0.01); box('Klappengriff', 0.14, 0.03, 0.03, 0.5, sy * 0.7, 0.88, M['steel'], 0.006)
        for sx in (-1, 1): cyl('Aggregatrad', 0.26, 0.18, sx * 0.95, sy * 0.66, 0.26, M['rubber'], 'Y', n=20, bev=0.02); cyl('Aggregat Nabe', 0.12, 0.2, sx * 0.95, sy * 0.66, 0.26, M['steel'], 'Y', n=12, bev=0.008)
        text('BODENSTROM', 0.12, (0.5 + sy * 0.36, sy * 0.698, 1.36), (-sy, 0, 0), (0, 0, 1), M['txtd'])
    box('Aggregat Warnband', 2.32, 1.38, 0.14, -0.1, 0, 0.66, M['warn'], 0)
    box('Bedienfeld', 0.03, 0.9, 0.5, 1.065, 0, 1.25, M['cab'], 0.01); box('Bedienschirm', 0.012, 0.36, 0.22, 1.082, -0.2, 1.33, M['screen'], 0)
    for q in range(4): cyl('Bedien-LED', 0.014, 0.012, 1.085, 0.1 + q * 0.09, 1.4, M['e_green' if q < 3 else 'e_amber'], 'X', n=8, bev=0)
    for q in range(2): cyl('Steckdose', 0.05, 0.04, 1.085, 0.14 + q * 0.2, 1.12, M['steel'], 'X', n=10, bev=0.006)
    cyl('Auspuff', 0.05, 0.5, -0.9, 0.4, 1.95, M['steel'], 'Z', n=10, bev=0); cyl('Rundumleuchte', 0.06, 0.1, 0.6, 0.45, 1.78, M['e_amber'], 'Z', n=12, bev=0)
    box('Deichsel', 1.0, 0.07, 0.07, -1.8, 0, 0.45, M['steel'], 0.01); ring('Zugöse', 0.07, 0.018, (-2.34, 0, 0.45), (0, 0, 1), M['steel'], 12)
    pipe('Stromkabel', [(1.1, 0.24, 1.1), (1.4, 0.3, 0.3), (1.9, 0.5, 0.05), (3.0, 1.0, 0.05), (4.2, 0.5, 0.05)], 0.035, M['rubber'], rad=0.3)
def p_buehne(hz=2.6):      # Scherenbühne
    box('Bühne Fahrwerk', 2.3, 1.1, 0.4, 0, 0, 0.42, M['teal'], 0.04); box('Bühne Warnband', 2.32, 1.12, 0.12, 0, 0, 0.3, M['warn'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('Bühnenrad', 0.2, 0.16, sx * 0.85, sy * 0.52, 0.2, M['rubber'], 'Y', n=18, bev=0.02)
    n = 3; seg = (hz - 0.75) / n; ln = math.hypot(2.0, seg); a = math.atan2(seg, 2.0)
    for k in range(n):
        z = 0.67 + seg * (k + 0.5)
        for sy in (-1, 1):
            for sg in (-1, 1): box('Scherenarm', ln, 0.05, 0.09, 0, sy * (0.42 + sg * 0.03), z, M['steel'], 0.008, (0, sg * a, 0))
        cyl('Scherenbolzen', 0.03, 0.96, 0, 0, z, M['frame'], 'Y', n=8, bev=0)
        for sx in (-1, 1): cyl('Scherenachse', 0.025, 0.96, sx * 1.0, 0, z + seg / 2, M['frame'], 'Y', n=8, bev=0)
    box('Plattform', 2.4, 1.2, 0.08, 0, 0, hz, M['grate'], 0.01); box('Plattform Rand', 2.44, 1.24, 0.1, 0, 0, hz - 0.06, M['teal'], 0.01)
    for sx in (-1, 0, 1):
        for sy in (-1, 1): box('Bühne Pfosten', 0.05, 0.05, 1.1, sx * 1.17, sy * 0.57, hz + 0.59, M['gelb'], 0.008)
    for sy in (-1, 1):
        for z in (0.56, 1.12): box('Bühne Holm', 2.38, 0.045, 0.045, 0, sy * 0.57, hz + z, M['gelb'], 0.008)
        box('Bühne Fußleiste', 2.38, 0.02, 0.14, 0, sy * 0.59, hz + 0.11, M['gelb'], 0.004)
    for z in (0.56, 1.12): box('Bühne Holm quer', 0.045, 1.14, 0.045, -1.17, 0, hz + z, M['gelb'], 0.008)
    box('Bühne Kette', 0.02, 1.1, 0.02, 1.17, 0, hz + 1.0, M['steel'], 0); box('Bühne Bedienkasten', 0.22, 0.2, 0.3, 0.95, 0.42, hz + 1.0, M['cab'], 0.02)
    cyl('Bühne LED', 0.014, 0.012, 0.95, 0.3, hz + 1.1, M['e_amber'], 'Y', n=8, bev=0)
    for sy in (-1, 1): text('AB-2', 0.13, (sy * 0.24, sy * 0.553, 0.44), (-sy, 0, 0), (0, 0, 1), M['txtw'])
def p_werkzeug():      # Werkzeugschrank auf Rollen, Schubladen nach −Y
    box('Werkzeugschrank', 1.1, 0.55, 0.95, 0, 0, 0.62, M['red'], 0.02); box('Werkzeug Aufsatz', 1.1, 0.5, 0.42, 0, 0.02, 1.33, M['red'], 0.02)
    for q in range(5): box('Schublade', 1.0, 0.02, 0.15, 0, -0.28, 0.24 + q * 0.175, M['red'], 0.008); box('Schubgriff', 0.8, 0.02, 0.025, 0, -0.295, 0.29 + q * 0.175, M['steel'], 0.004)
    for q in range(3): box('Schublade oben', 1.0, 0.02, 0.11, 0, -0.235, 1.2 + q * 0.125, M['red'], 0.008); box('Schubgriff', 0.8, 0.02, 0.02, 0, -0.25, 1.235 + q * 0.125, M['steel'], 0.004)
    box('Arbeitsplatte', 1.14, 0.58, 0.03, 0, 0, 1.108, M['rubber'], 0.006); box('Schiebegriff', 0.04, 0.5, 0.04, 0.6, 0, 0.95, M['steel'], 0.01)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('Lenkrolle', 0.06, 0.04, sx * 0.45, sy * 0.2, 0.07, M['rubber'], 'Y', n=12, bev=0.006)
def p_kegel():
    box('Kegelfuß', 0.36, 0.36, 0.03, 0, 0, 0.015, M['rubber'], 0.008); cyl('Kegel', 0.14, 0.5, 0, 0, 0.28, M['ochre'], 'Z', n=14, bev=0, r2=0.03)
    cyl('Kegelband', 0.092, 0.08, 0, 0, 0.3, M['plate'], 'Z', n=14, bev=0, r2=0.074)
def p_loeschwagen():      # Löschkarre mit zwei Flaschen
    box('Löschkarre', 0.9, 0.7, 0.06, 0, 0, 0.2, M['red'], 0.01)
    for sy in (-1, 1): cyl('Karrenrad', 0.2, 0.06, -0.2, sy * 0.4, 0.2, M['rubber'], 'Y', n=16, bev=0.01); cyl('Löschflasche', 0.15, 1.2, 0.05, sy * 0.17, 0.83, M['red'], 'Z', n=18, bev=0.03)
    for sy in (-1, 1): cyl('Flaschenventil', 0.04, 0.12, 0.05, sy * 0.17, 1.49, M['steel'], 'Z', n=10, bev=0)
    pipe('Karrenbügel', [(-0.42, -0.3, 0.2), (-0.5, -0.3, 1.3), (-0.5, 0.3, 1.3), (-0.42, 0.3, 0.2)], 0.018, M['red'], rad=0.08)
    for q in range(3): ring('Löschschlauch', 0.2 - q * 0.02, 0.022, (-0.56 - q * 0.004, 0, 0.9), (1, 0, 0), M['rubber'], 20)
    box('Löschschild', 0.3, 0.004, 0.2, 0.05, -0.326, 0.9, M['plate'], 0); cyl('Karrenfuß', 0.03, 0.2, 0.36, 0, 0.1, M['steel'], 'Z', n=8, bev=0)
def p_stapler():      # Gabelstapler
    box('Stapler Rumpf', 1.7, 1.1, 0.75, -0.2, 0, 0.72, M['gelb'], 0.06); box('Stapler Gegengewicht', 0.5, 1.12, 0.9, -1.1, 0, 0.75, M['wall4'], 0.08)
    for sy in (-1, 1):
        cyl('Stapler Rad vorn', 0.34, 0.26, 0.55, sy * 0.5, 0.34, M['rubber'], 'Y', n=22, bev=0.03); cyl('Stapler Rad hinten', 0.28, 0.22, -0.9, sy * 0.48, 0.28, M['rubber'], 'Y', n=22, bev=0.03)
        for x in (0.3, -0.75): box('Dachstütze', 0.06, 0.06, 1.3, x, sy * 0.5, 1.7, M['frame'], 0.01)
        box('Hubmast', 0.1, 0.12, 2.6, 0.95, sy * 0.36, 1.45, M['frame'], 0.012); box('Gabel', 1.15, 0.12, 0.05, 1.6, sy * 0.3, 0.12, M['steel'], 0.008); box('Gabelrücken', 0.05, 0.12, 0.6, 1.05, sy * 0.3, 0.4, M['steel'], 0.008)
        cyl('Stapler Scheinwerfer', 0.06, 0.04, 0.68, sy * 0.4, 1.2, M['e_white'], 'X', n=10, bev=0)
    box('Schutzdach', 1.2, 1.12, 0.06, -0.22, 0, 2.36, M['frame'], 0.015); array(box('Dachstab', 0.03, 1.0, 0.03, -0.7, 0, 2.4, M['steel'], 0), 6, (0.19, 0, 0))
    box('Gabelträger', 0.08, 1.0, 0.5, 1.02, 0, 0.6, M['frame'], 0.015); box('Mastquerhaupt', 0.12, 0.84, 0.1, 0.95, 0, 2.7, M['frame'], 0.012); cyl('Hubzylinder', 0.05, 2.2, 0.9, 0, 1.3, M['steel'], 'Z', n=10, bev=0)
    box('Staplersitz', 0.5, 0.5, 0.12, -0.45, 0, 1.15, M['polster'], 0.03); box('Sitzlehne', 0.1, 0.5, 0.5, -0.7, 0, 1.45, M['polster'], 0.03)
    ring('Lenkrad', 0.16, 0.014, (0.05, 0, 1.42), (1, 0, 0.7), M['rubber'], 18); cyl('Lenksäule', 0.02, 0.4, 0.14, 0, 1.25, M['frame'], 'Z', n=8, bev=0)
    cyl('Rundumleuchte', 0.06, 0.1, -0.6, 0.4, 2.44, M['e_amber'], 'Z', n=12, bev=0); box('Stapler Warnband', 0.012, 1.12, 0.3, -1.356, 0, 0.6, M['warn'], 0)
    for sy in (-1, 1): text('ST-07', 0.16, (-0.2 + sy * 0.3, sy * 0.553, 0.6), (-sy, 0, 0), (0, 0, 1), M['txtd'])
def p_triebwerk():      # Ersatztriebwerk auf Transportgestell (Düse nach +X)
    for sy in (-1, 1):
        box('Gestell Holm', 4.6, 0.12, 0.14, 0, sy * 0.9, 0.36, M['gelb'], 0.015)
        for x in (-1.7, 1.7): box('Gestell Stütze', 0.12, 0.12, 0.8, x, sy * 0.9, 0.78, M['gelb'], 0.015); cyl('Gestellrolle', 0.14, 0.1, x, sy * 0.9, 0.14, M['rubber'], 'Y', n=14, bev=0.01)
    for x in (-1.7, 1.7):
        box('Gestell Sattel', 0.14, 1.92, 0.14, x, 0, 1.12, M['gelb'], 0.015); ring('Spannband', 0.99, 0.03, (x, 0, 2.05), (1, 0, 0), M['steel'], 32)
        for sy in (-1, 1): box('Sattelbacke', 0.14, 0.3, 0.5, x, sy * 0.72, 1.3, M['gelb'], 0.015, (sy * 0.6, 0, 0))
    cyl('Triebwerk Kern', 0.95, 2.6, -0.2, 0, 2.05, M['wall2'], 'X', n=36, bev=0.03); cyl('Triebwerk Einlauf', 0.8, 0.5, -1.75, 0, 2.05, M['alu'], 'X', n=36, bev=0.03, r2=0.95)
    cyl('Triebwerk Düse', 0.9, 1.2, 1.7, 0, 2.05, M['frame'], 'X', n=36, bev=0.02, r2=0.62); cyl('Düsenring', 0.64, 0.12, 2.34, 0, 2.05, M['copper'], 'X', n=36, bev=0.01)
    cyl('Düse innen', 0.56, 0.02, 2.39, 0, 2.05, M['rubber'], 'X', n=36, bev=0)
    for k in range(3): cyl('Triebwerk Band', 0.965, 0.1, -1.1 + k * 0.9, 0, 2.05, M['frame'], 'X', n=36, bev=0.008)
    for (an, r, m) in ((0.5, 0.045, 'copper'), (1.3, 0.03, 'steel'), (2.2, 0.04, 'steel'), (2.7, 0.03, 'ochre')):
        c, s = math.cos(an) * 1.0, math.sin(an) * 1.0; pipe('Triebwerk Leitung', [(-1.35, c, 2.05 + s), (-0.4, c * 1.03, 2.05 + s * 1.03), (0.9, c * 1.02, 2.05 + s * 1.02), (1.25, c * 0.95, 2.05 + s * 0.95)], r, M[m], rad=0.15)
    box('Triebwerk Getriebe', 0.9, 0.56, 0.34, -0.3, 0, 3.08, M['wall4'], 0.05); box('Getriebe Stecker', 0.2, 0.3, 0.16, 0.3, 0, 3.06, M['cab'], 0.02)
    cyl('Einlaufdeckel', 0.78, 0.04, -2.02, 0, 2.05, M['red'], 'X', n=36, bev=0.01); text('ABDECKUNG', 0.16, (-2.045, 0.52, 2.0), (0, -1, 0), (0, 0, 1), M['txtw'])
    box('Gestell Schild', 0.6, 0.006, 0.3, 0.0, -0.965, 0.7, M['platey'], 0); text('TW-2 · ÜBERHOLT', 0.07, (-0.27, -0.97, 0.68), (1, 0, 0), (0, 0, 1), M['txtd'])
    box('Gestell Deichsel', 1.2, 0.07, 0.07, -2.9, 0, 0.36, M['steel'], 0.01)
def p_kran():      # Schwenkkran: Säule 5 m, Ausleger 5,4 m nach +X
    cyl('Kran Fuß', 0.5, 0.08, 0, 0, 0.04, M['steel'], 'Z', n=20, bev=0.01); cyl('Kran Säule', 0.2, 5.0, 0, 0, 2.5, M['gelb'], 'Z', n=20, bev=0.01)
    for k in range(8): cyl('Fußschraube', 0.03, 0.04, math.cos(k * PI / 4) * 0.4, math.sin(k * PI / 4) * 0.4, 0.1, M['steel'], 'Z', n=6, bev=0)
    box('Kran Warnband', 0.42, 0.42, 0.5, 0, 0, 0.5, M['warn'], 0); cyl('Kran Drehkranz', 0.26, 0.2, 0, 0, 4.86, M['frame'], 'Z', n=20, bev=0.02)
    box('Kran Ausleger', 5.4, 0.22, 0.4, 2.5, 0, 5.16, M['gelb'], 0.02); box('Kran Strebe', 2.4, 0.1, 0.1, 1.2, 0, 4.42, M['gelb'], 0.01, (0, -0.42, 0))
    box('Kran Katze', 0.5, 0.36, 0.3, 3.9, 0, 4.82, M['frame'], 0.02); cyl('Kran Kette', 0.02, 1.9, 3.9, 0, 3.72, M['steel'], 'Z', n=6, bev=0)
    box('Kran Flasche', 0.2, 0.14, 0.24, 3.9, 0, 2.72, M['gelb'], 0.02); pipe('Kranhaken', [(3.9, 0, 2.6), (3.9, 0, 2.42), (4.05, 0, 2.3), (4.16, 0, 2.44)], 0.03, M['steel'], rad=0.08)
    box('Kran Endanschlag', 0.08, 0.3, 0.5, 5.16, 0, 5.16, M['frame'], 0.01); text('LAST 2 t', 0.16, (1.6, -0.113, 5.08), (1, 0, 0), (0, 0, 1), M['txtd'])
    box('Kran Steuerbirne', 0.07, 0.07, 0.24, 3.6, 0.2, 1.4, M['gelb'], 0.02); cyl('Steuerkabel', 0.012, 3.3, 3.6, 0.2, 3.1, M['rubber'], 'Z', n=6, bev=0)
def p_stapel(seed):      # Frachtstapel auf Palette, verzurrt
    R = random.Random(seed)
    box('Stapel Palette', 1.3, 1.1, 0.14, 0, 0, 0.07, M['crate'], 0.01); z = 0.14
    for k in range(R.choice((2, 3, 3))):
        hgt = R.uniform(0.5, 0.8); w = 1.2 - k * R.uniform(0, 0.1); m = R.choice(('crate', 'wall2', 'cab', 'white', 'crate', 'door'))
        box('Frachtkiste', w, 1.0, hgt, R.uniform(-0.03, 0.03), R.uniform(-0.03, 0.03), z + hgt / 2, M[m], 0.025, (0, 0, R.uniform(-0.05, 0.05)))
        box('Kistenband', w + 0.012, 1.012, 0.06, 0, 0, z + hgt * 0.5, M['frame'], 0.004); box('Kistenetikett', 0.28, 0.006, 0.18, -0.2, -0.508, z + hgt * 0.62, M['plate'], 0)
        z += hgt + 0.005
    for sx in (-0.42, 0.42):
        box('Spanngurt', 0.05, 1.05, 0.012, sx, 0, z + 0.004, M['ochre'], 0)
        for sy in (-1, 1): box('Spanngurt', 0.05, 0.012, z - 0.12, sx, sy * 0.522, (z + 0.14) / 2, M['ochre'], 0)
def p_pylon(n):      # Platzzeichen: Leuchtkasten mit der Nummer des Stellplatzes, Schauseiten nach ±X
    box('Pylon Fuß', 0.9, 0.9, 0.16, 0, 0, 0.08, M['frame'], 0.03); box('Pylon Warnband', 0.6, 0.6, 0.5, 0, 0, 0.41, M['warn'], 0); box('Pylon Schaft', 0.36, 0.36, 3.2, 0, 0, 1.76, M['wall4'], 0.03)
    box('Pylon Kasten', 0.3, 1.9, 1.5, 0, 0, 4.1, M['frame'], 0.05); cyl('Pylon Feuer', 0.07, 0.12, 0, 0, 4.92, M['e_amber'], 'Z', n=12, bev=0)
    for sx in (-1, 1):
        box('Pylon Leuchtfeld', 0.02, 1.7, 1.3, sx * 0.155, 0, 4.1, M['e_dim'], 0); text(str(n), 1.0, (sx * 0.17, -sx * 0.3, 3.72), (0, sx, 0), (0, 0, 1), M['txtd'])
        box('Pylon Status', 0.02, 1.7, 0.1, sx * 0.157, 0, 3.28, M['e_green'], 0); box('Pylon Schild', 0.02, 0.3, 0.2, sx * 0.185, 0, 1.6, M['plate'], 0)
PROP.update({'werkzeug': p_werkzeug, 'kegel': p_kegel, 'loeschwagen': p_loeschwagen})
for _k in range(4): PROP['stapel%d' % _k] = (lambda s: (lambda: p_stapel(s)))(31 + _k * 7)

# =====================================================================================
# Boden: Markierungen und Spuren (freie Objekte in der Sammlung „Hangar“)
# =====================================================================================
def h2_boden():
    P = lambda nm, sx, sy, x, y, m='paint_w', rot=None: box(nm, sx, sy, 0.004, x, y, 0.004, M[m], 0, rot)
    # Fahrweg hinter den Stellplätzen (y 25,4 … 29,6): Randstriche, Pfeile, Schrift
    for y in (25.4, 29.6): array(P('Fahrweg Strich', 2.4, 0.16, -84.0, y), 34, (5.0, 0, 0))
    for (x, d) in ((-70.0, 1), (-40.0, 1), (40.0, -1), (70.0, -1)):
        arrow((x - d * 1.6, 27.5, 0.006), (d, 0, 0), (0, d, 0), 3.2, M['paint_w'], 0.34)
        text('FAHRWEG  ·  SCHRITT FAHREN', 0.42, (x - 14.0, 27.3, 0.006), (1, 0, 0), (0, 1, 0), M['paint_w'])
    # Fußweg vom Ausgang über den Fahrweg zum mittleren Stellplatz: Zebrastreifen
    array(P('Fußweg Streifen', 3.2, 0.5, 0.0, 24.9), 20, (0, 1.05, 0))
    for sx in (-1, 1): P('Fußweg Rand', 0.12, 21.0, sx * 1.85, 34.9, 'paint_y')
    for (px, hw) in ((-60.0, 26.0), (0.0, 30.0), (60.0, 26.0)):
        for sx in (-1, 1):      # Entfernungsmarken an den Platzlinien, alle 10 m ab der Haltelinie
            for q in range(1, 10):
                y = 24.0 - q * 10.0; P('Platzmarke', 1.4, 0.2, px + sx * (hw - 1.0), y)
                if q % 2 == 0: text('%d' % (q * 10), 0.5, (px + sx * (hw - 2.3) + 0.5, y + 0.25, 0.006), (-1, 0, 0), (0, -1, 0), M['paint_w'])
            P('Sperrfeld', 3.0, 3.0, px + sx * (hw - 4.4), 21.0, 'warnf')      # Abstellfeld des Lichtmasts
        # Brandspuren der Triebwerke: grauer Abrieb unter dem Schiff, dunkler Kern, Schlieren zur Rückwand
        spot((px, -28.0, 0.0), 13.0, 'abrieb', 1.5); spot((px, -20.0, 0.0), 5.5, 'fleck', 1.4)
        for dx in (-4.2, -1.5, 1.8, 4.6): streak((px + dx, -16.0 + abs(dx), 0.0), (-1, 0, 0), (0, -1, 0), R2.uniform(1.6, 2.8), R2.uniform(14.0, 22.0), 'spur')
        for q in range(6): spot((px + R2.uniform(-hw + 4, hw - 4), R2.uniform(-76, 20), 0.0), R2.uniform(0.8, 2.4), R2.choice(('fleck', 'fleck', 'abrieb')), R2.uniform(0.7, 1.6))
    # Reifenspuren auf dem Fahrweg und an den Toren der Lagerflächen
    for (x0, y, ln) in ((84.0, 26.6, 70.0), (84.0, 28.3, 70.0), (20.0, 26.9, 62.0), (20.0, 28.5, 62.0), (-26.0, 26.5, 56.0), (-26.0, 28.2, 56.0)):
        streak((x0, y, 0.0), (0, -1, 0), (1, 0, 0), 0.42, ln, 'spur')
    for (x, y0, ln) in ((-32.6, 22.0, 60.0), (-31.2, 22.0, 60.0), (31.4, 22.0, 80.0), (32.8, 22.0, 80.0)):
        streak((x, y0, 0.0), (1, 0, 0), (0, 1, 0), 0.42, ln, 'spur')
    for q in range(26): spot((R2.uniform(-84, 84), R2.uniform(24.5, 46.0), 0.0), R2.uniform(0.5, 1.8), R2.choice(('fleck', 'abrieb', 'fleck')), R2.uniform(0.6, 1.7))

# =====================================================================================
# Belegung
# =====================================================================================
def detail():
    CUR[0] = C_HALL
    J2 = [module('H2 Joch %d' % v, h2_joch, v) for v in range(3)]; s2 = module('H2 Spant', h2_spant)
    for k in range(9):      # dieselbe Variante wie das Joch der ersten Runde (bk_halle.py, assemble)
        yc = YG + 9 + 18 * k
        for (x, ang, tag) in ((-HW, 0.0, 'A'), (HW, PI, 'B')): inst(J2[(k + (tag == 'B')) % 3], (x, yc, 0), ang)
    for k in range(1, 9):
        for (x, ang) in ((-HW, 0.0), (HW, PI)): inst(s2, (x, YG + 18 * k, 0), ang)
    for sx in (-1, 1):
        for k in range(4): inst(J2[(k + (sx > 0) + 1) % 3], (sx * (27 + 18 * k), YB, 0), -PI / 2)
        for k in range(5): inst(s2, (sx * (18 + 18 * k), YB, 0), -PI / 2)
    inst(module('H2 Galerie 36', galeriefront, 1, 36.0), (0, YB, 0), -PI / 2); inst(module('H2 Mitte', h2_mitte), (0, YB, 0), -PI / 2)
    J24 = module('H2 Joch 24', h2_joch, 1, 24.0)
    for sx in (-1, 1): inst(J24, (sx * 80, YG, 0), PI / 2)
    inst(module('H2 Tor', h2_tor), (0, YG, 0), 0.0)
    for sx in (-1, 1):
        for q in range(2): put('Torriegel', sx * (DW + 1.0 + q * 2.4), YG + 2.45, 0.0, p_torriegel)
    pz = module('H2 Platz', h2_platz)
    for px in (-60.0, 0.0, 60.0): inst(pz, (px, -28.0, 0), 0.0)
    CUR[0] = C_ROOF; d2 = module('H2 Dach', h2_dach)
    for k in range(9): inst(d2, (0, YG + 9 + 18 * k, 0), (k % 2) * PI, C_ROOF)
    CUR[0] = C_HALL
    h2_boden()
    aim = lambda x, y, tx, ty: math.atan2(ty - y, tx - x)
    for n, (px, hw) in enumerate(((-60.0, 26.0), (0.0, 30.0), (60.0, 26.0))):      # Gerät an den hinteren Ecken der Stellplätze (y ab 15)
        put('Pylon %d' % (n + 1), px - hw + 0.9, 24.85, 0.0, p_pylon, n + 1)
        for s in (-1, 1):
            x0 = px + s * (hw - 4.4); put('Lichtmast', x0, 21.0,      # 4,4 m von der Platzlinie: Die Stützen ragen sonst in den Laufweg an der Längswand (x ±85,6)
            aim(x0, 21.0, px + s * 3.0, -16.0), p_lichtmast)
            for (dx, dy) in ((2.6, -2.2), (-2.5, 1.2), (-2.6, -2.3)): put('kegel', x0 + s * dx, 21.0 + dy, R2.uniform(0, 3))
        s = 1 if n != 2 else -1      # Stromseite: Aggregat, Werkzeug; Gegenseite: Bühne, Fracht, Löschkarre
        put('Aggregat', px + s * (hw - 8.2), 17.6, PI / 2 + s * 0.25, p_aggregat)
        put('werkzeug', px + s * (hw - 11.6), 19.9, -0.3 * s); put('werkzeug', px + s * (hw - 13.1), 20.2, 0.15 * s)
        put('loeschwagen', px + s * (hw - 4.6), 16.2, 1.2)
        put('Bühne', px - s * (hw - 8.4), 17.8, PI / 2 - s * 0.2, p_buehne); put('stapel%d' % n, px - s * (hw - 11.8), 19.6, 0.2); put('stapel%d' % ((n + 1) % 4), px - s * (hw - 13.3), 19.9, -0.15)
        put('loeschwagen', px - s * (hw - 4.4), 16.4, 2.0)
    # Werkstatt hinter Stellplatz 1
    put('Triebwerk', -44.5, 41.0, 0.15, p_triebwerk); put('Kran', -41.0, 45.4, -2.2, p_kran); put('werkzeug', -41.6, 38.3, 0.3); put('werkzeug', -40.2, 38.6, 0.1)
    put('Bühne', -57.0, 41.0, 1.4, p_buehne); put('stapel0', -36.6, 45.0, 0.1); put('stapel2', -35.1, 45.3, -0.2); put('stapel3', -36.2, 46.5, 1.5); put('loeschwagen', -47.2, 45.9, -1.2)
    for (x, y) in ((-47.4, 39.0), (-47.2, 43.2), (-41.4, 39.9)): put('kegel', x, y, R2.uniform(0, 3))
    # Frachtumschlag hinter Stellplatz 3
    put('Stapler', 47.0, 43.6, 2.3, p_stapler); put('Aggregat', 36.2, 43.0, -1.2, p_aggregat)
    for (k, x, y, a) in ((1, 62.6, 45.6, 0.1), (3, 64.1, 45.4, -0.1), (0, 63.3, 44.1, 1.6), (2, 53.6, 46.0, 0.3), (1, 52.2, 46.2, -0.2), (3, 79.5, 40.2, 0.4), (0, 80.9, 40.5, 0.1)): put('stapel%d' % k, x, y, a)
    # am Tor: Lichtmasten in den Ecken des Vorfelds, Stapler, Fracht
    for sx in (-1, 1):
        x0 = sx * 68.5; put('Lichtmast', x0, -104.0, aim(x0, -104.0, sx * 30.0, -92.0), p_lichtmast)
        for (dx, dy) in ((2.2, 2.4), (-2.4, 2.2)): put('kegel', x0 + dx, -104.0 + dy, R2.uniform(0, 3))
    put('Stapler', 77.0, -101.0, 0.6, p_stapler); put('stapel2', 80.4, -103.6, 0.2); put('stapel1', 81.8, -103.2, -0.3); put('stapel0', -78.5, -104.2, 0.4)
    put('loeschwagen', -88.3, 40.2, 0.3); put('loeschwagen', 88.3, -76.0, 2.8); put('werkzeug', 88.4, 33.0, PI / 2); put('werkzeug', -88.4, -33.0, -PI / 2)
    cam('J Platzgeraet', (-12.0, 30.5, 1.7), (-27.0, 18.0, 3.2), 18); cam('K Werkstatt', (-52.5, 33.5, 1.7), (-42.0, 43.5, 2.4), 18)
    cam('L Dach', (-20.0, 20.0, 1.7), (-40.0, -30.0, 40.0), 14); cam('M Torpfeiler', (40.0, -86.0, 1.7), (66.0, -112.0, 12.0), 16)
    cam('N Wand', (-70.0, -10.0, 1.7), (-92.0, -32.0, 16.0), 16); cam('O Fracht', (44.0, 36.0, 1.7), (60.0, 46.0, 1.6), 18)
detail()
result = {'bausteine': len(MOD), 'instanzen': len(C_HALL.objects) + len(C_ROOF.objects), 'objekte': len(bpy.data.objects)}
