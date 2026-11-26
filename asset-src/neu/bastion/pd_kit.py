# Deck 3 der Bastion, dritte Fassung (26.11.2026): Bausteine. Nutzer: „Bau die Rundhalle neu, größer, noch schöner als jetzt, muss auch nicht
# ein Kreis sein, können mehrere große Bereiche miteinander verbunden sein, die Läden können auch größer sein mit mehr Details, Ausstellungen
# der Waren usw“ und „Dass da Quartier steht ist blöd“ (am Aufzug zu den Hangarbuchten).
# Läuft nach bk_kit, bk_mehr, bk_med, rh_kit, rh_deck (nur Helfer, NUR_HELFER_RH) und rh_leben im selben Namensraum: Materialien, Wandfüllungen,
# Portale, Korridorjoch, Treffpunkt, Ladenmöbel, Marktstände und Banner der Rundhalle werden weiterbenutzt.
#
# Plan (x nach Osten, vom Hangartor weg; y nach Norden; Hangartor bei x = 0, Mittelachse y = 0):
#   Korridor         x 0 … 16, 8 m breit, 5 m hoch (vier Joche wie bisher)
#   Vorhalle         x 16 … 30, 18 m breit, 6,2 m hoch: zwei Aufzüge mit eigenen Schildern (QUARTIERE Nord, HANGARBUCHTEN Süd)
#   Forum            x 30 … 74, 32 m breit: Mittelschiff 16 m breit und 11 m hoch mit Lichtgaden und Trommel über dem Treffpunkt (x 52),
#                    Seitenschiffe 8,4 m hoch; an beiden Längswänden je zwei Läden hinter 12 m breiten Portalen
#   Läden            16 × 13 m, 4,6 m hoch: WERFT (Nordwest), HANDELSKONTOR (Nordost), AUSRÜSTER (Südwest), KANTINE (Südost, mit Fensterfront)
#   Einsatzzentrale  x 74 … 96, 22 m breit, 6,2 m hoch: Aufträge und Missionen, Fenster nach Osten; Türen zu BESPRECHUNG (Nord) und
#                    KRANKENSTATION (Süd), beide wie bisher aus Zellen des alten Baukastens
# Bauweisen wie in rh_kit.py: flach = Wandebene x = 0, Raum bei x < 0, längs der Wand y.
import math
VX0, VX1, VW, VH = 16.0, 30.0, 18.0, 6.2
FX0, FX1, FW, FHW, FH = 30.0, 74.0, 32.0, 8.4, 11.0
NW = 16.0                      # Breite des Mittelschiffs
TPX = 52.0; TR, TZ = 7.0, 14.6 # Treffpunkt: Mitte, Trommelradius, Trommeldecke
LBW, LBD = 16.0, 13.0          # Laden: lichte Breite und Tiefe (Höhe BH = 4,6 wie die alten Buchten)
LOW, LOH = 12.0, 4.2           # Portal eines Ladens: lichte Öffnung
ZX0, ZX1, ZW, ZH = 74.0, 96.0, 22.0, 6.2
ZOW, ZOH = 12.0, 4.6           # Portal zur Einsatzzentrale
LADEN = {'w': (41.0, 1), 'h': (63.0, 1), 'r': (41.0, -1), 'k': (63.0, -1)}      # Mitte der Öffnung (x), Seite (+1 Nord, −1 Süd)
STUETZEN = [(x, sy * NW / 2) for x in (34.0, 44.0, 60.0, 70.0) for sy in (-1, 1)]

M['e_sig_b'] = mk('Schild Buchten', (0.55, 0.85, 1), 0, 0.3, var=0, rvar=0, emit=(0.5, 0.8, 1.0), es=5, grime=False)
M['e_sig_e'] = mk('Schild Einsatz', (0.1, 1, 0.9), 0, 0.3, var=0, rvar=0, emit=(0.15, 0.95, 0.85), es=4.5, grime=False)
SIG.update({'q': 'e_sig_q', 'b': 'e_sig_b', 'e': 'e_sig_e'}); SIGC.update({'q': (1.0, 0.82, 0.55), 'b': (0.5, 0.8, 1.0), 'e': (0.15, 0.95, 0.85)})
_au = M['sterne'].copy(); _au.name = 'Ausblick'; M['ausblick'] = _au      # Blick ins All: im Spiel ein eigener Himmel (deck.ts ausblickMat)
ERZ = {'EISEN': ((0.42, 0.16, 0.09), 0.6, None), 'KUPFER': ((0.62, 0.3, 0.1), 0.9, None), 'TITAN': ((0.5, 0.55, 0.6), 1.0, None),
       'IRIDIUM': ((0.2, 0.3, 0.75), 0.9, (0.2, 0.35, 1.0)), 'EIS': ((0.6, 0.8, 0.92), 0.0, (0.5, 0.8, 1.0)), 'FERRIT': ((0.6, 0.1, 0.05), 0.3, (1.0, 0.25, 0.1))}
for _n, (_c, _m, _e) in ERZ.items():
    M['erz_' + _n] = mk('Erz ' + _n.capitalize(), _c, _m, 0.45 if _e is None else 0.25, var=0.35, bump=0.5, bscale=40.0, emit=_e, es=0.0 if _e is None else 0.8, grime=False)
M['barren'] = mk('Barren', (0.45, 0.47, 0.5), 1.0, 0.28, var=0.1, grime=False)
M['barren2'] = mk('Barren Kupfer', (0.6, 0.3, 0.12), 1.0, 0.3, var=0.1, grime=False)
M['anzug'] = mk('Anzugstoff', (0.045, 0.05, 0.058), 0.0, 0.8, var=0.2, bump=0.3, bscale=300.0, grime=False)
M['anzug2'] = mk('Anzugstoff hell', (0.3, 0.3, 0.28), 0.0, 0.8, var=0.2, bump=0.3, bscale=300.0, grime=False)
M['anzug3'] = mk('Anzugstoff orange', (0.5, 0.2, 0.03), 0.0, 0.8, var=0.2, bump=0.3, bscale=300.0, grime=False)
LACK = {'BERNSTEIN': (0.72, 0.33, 0.04), 'KOBALT': (0.06, 0.24, 0.68), 'GRÜN': (0.11, 0.42, 0.1), 'VIOLETT': (0.32, 0.11, 0.62), 'ROT': (0.62, 0.08, 0.06)}
for _n, _c in LACK.items(): M['lack_' + _n] = mk('Lack ' + _n.capitalize(), _c, 0.3, 0.3, var=0.05, grime=False)

# =====================================================================================
# Hallen: Boden, Decke, Hochwand, Stütze, Lichtgaden, Trommel
# =====================================================================================
def b_pd_boden(L, W, seed, hell=0.3, spuren=None):      # Plattenboden, Ursprung an der Westkante auf der Mittelachse; spuren: y-Lagen der Messingbänder
    R = random.Random(seed); nx, ny = int(round(L / 2)), int(round(W / 2))
    for i in range(nx):
        for j in range(ny):
            box('Bodenplatte', L / nx - 0.02, W / ny - 0.02, 0.06, (i + 0.5) * L / nx, -W / 2 + (j + 0.5) * W / ny, -0.03, M['hall2' if R.random() < hell else 'hall'], 0.004)
    for y in (spuren or ()): box('Messingband', L, 0.07, 0.008, L / 2, y, 0.002, M['messing'], 0)
    for k in range(int(L * W / 30)):
        spot((R.uniform(1, L - 1), R.uniform(-W / 2 + 1, W / 2 - 1), 0.0), R.uniform(0.3, 0.9), 'abrieb' if k % 2 else 'fleck', R.uniform(0.7, 1.6))
def b_pd_decke(L, W, H, licht='e_panel_h', feld=4.0):      # flache Decke mit Trägern, Kassetten und Lichtleisten (Ursprung wie der Boden)
    box('Deckenplatte', L, W, 0.2, L / 2, 0, H + 0.1, M['wall4'], 0)
    n = max(1, int(round(L / feld))); m_ = max(2, int(round(W / 5.5)))
    for i in range(n + 1): box('Deckenträger', 0.4, W, 0.5, i * L / n, 0, H - 0.25, M['frame'], 0.015)
    for j in range(m_ + 1): box('Längsträger', L, 0.3, 0.32, L / 2, -W / 2 + j * W / m_, H - 0.16, M['frame'], 0.012)
    for i in range(n):
        for j in range(m_):
            xc, yc = (i + 0.5) * L / n, -W / 2 + (j + 0.5) * W / m_; sx, sy = L / n - 0.7, W / m_ - 0.6
            box('Kassette', sx, sy, 0.03, xc, yc, H - 0.02, M['wall3'], 0.006)
            for d in (-1, 1): box('Lichtleiste', 0.22, sy - 0.6, 0.025, xc + d * sx * 0.28, yc, H - 0.045, M[licht], 0)
            cyl('Sprinkler', 0.03, 0.08, xc, yc, H - 0.08, M['copper'], 'Z', n=8, bev=0)
    for j in (1, m_ - 1):
        y = -W / 2 + j * W / m_ + 0.55
        pipe('Deckenleitung', [(0.2, y, H - 0.5), (L - 0.2, y, H - 0.5)], 0.14, M['wall'], res=8); pipe('Deckenleitung', [(0.2, y + 0.35, H - 0.42), (L - 0.2, y + 0.35, H - 0.42)], 0.05, M['red'], res=6)
        for i in range(n): box('Leitungsschelle', 0.08, 0.7, 0.06, (i + 0.5) * L / n, y + 0.15, H - 0.33, M['frame'], 0.004)
def b_pd_hochwand(z0, z1, var=3):      # flach, 2 m breit: Wand über den Wandfüllungen (z0 bis z1) mit Gesims, Plattenfeldern, Rippe und Lichtkranz
    box('Hochwand', 0.12, 2.0, z1 - z0, 0.06, 0, (z0 + z1) / 2, M['wall4'], 0)
    box('Gesims', 0.16, 2.0, 0.1, -0.08, 0, z0 + 0.05, M['frame'], 0.01); box('Gesimslicht', 0.03, 1.96, 0.03, -0.17, 0, z0 + 0.12, M['e_cool'], 0)
    zm = z0 + 0.25
    while zm < z1 - 0.55:
        zt = min(z1 - 0.3, zm + 1.5); fplate(-0.9, 0.9, zm, zt, var, x=0.0); zm = zt + 0.12
    box('Rippe', 0.14, 0.16, z1 - z0, -0.07, -1.0, (z0 + z1) / 2, M['frame'], 0.012)
    box('Kranz', 0.3, 2.0, 0.14, -0.15, 0, z1 - 0.07, M['frame'], 0.012); box('Kranzlicht', 0.04, 1.96, 0.03, -0.29, 0, z1 - 0.16, M['e_panel_h'], 0)
def b_pd_stuetze(h):      # frei stehende Stütze des Mittelschiffs mit Sitzring
    box('Stützenfuß', 1.3, 1.3, 0.5, 0, 0, 0.25, M['frame'], 0.04); box('Fußband', 1.33, 1.33, 0.07, 0, 0, 0.54, M['warn'], 0)
    box('Stützenschaft', 0.9, 0.9, h - 1.4, 0, 0, 0.5 + (h - 1.4) / 2, M['wall3'], 0.03)
    for (sx, sy) in ((1, 1), (1, -1), (-1, 1), (-1, -1)): box('Schaftlicht', 0.05, 0.05, h - 2.6, sx * 0.455, sy * 0.455, 1.0 + (h - 2.6) / 2, M['e_cool'], 0)
    for k in range(4):
        a = k * PI / 2; ca, sa = math.cos(a), math.sin(a)
        for (z0, z1) in ((0.75, 2.5), (2.65, 4.4), (4.55, 6.3)):
            box('Schaftfeld', 0.03, 0.62, z1 - z0, ca * 0.455, sa * 0.455, (z0 + z1) / 2, M['wall2'], 0.006, (0, 0, a))
        box('Sitzbank', 0.5, 1.5, 0.08, ca * 0.9, sa * 0.9, 0.46, M['crate'], 0.012, (0, 0, a)); box('Banklicht', 0.03, 1.4, 0.03, ca * 1.14, sa * 1.14, 0.4, M['e_amber'], 0, (0, 0, a))
        box('Konsole', 1.1, 0.3, 0.5, ca * 0.9, sa * 0.9, h - 1.05, M['frame'], 0.03, (0, 0, a))
    box('Löschposten', 0.1, 0.3, 0.5, -0.5, 0, 1.5, M['red'], 0.02)
    box('Stützenkopf', 1.5, 1.5, 0.5, 0, 0, h - 0.55, M['frame'], 0.04); box('Kopflicht', 1.54, 1.54, 0.05, 0, 0, h - 0.84, M['e_panel_h'], 0)
def b_pd_obergaden():      # flach, 4 m: Lichtgaden des Mittelschiffs zwischen Seitenschiffdecke (FHW) und Mittelschiffdecke (FH)
    z0, z1 = FHW - 0.5, FH
    box('Unterzug', 0.6, 4.0, 0.6, 0.3, 0, z0 + 0.3, M['frame'], 0.03); box('Unterzuglicht', 0.04, 3.9, 0.04, -0.01, 0, z0 + 0.12, M['e_cool'], 0)
    box('Gadenwand', 0.2, 4.0, z1 - z0 - 0.6, 0.3, 0, (z0 + 0.6 + z1) / 2, M['wall4'], 0)
    box('Lichtband', 0.04, 3.3, 1.3, 0.18, 0, z0 + 1.45, M['e_panel_h'], 0)
    for y in (-1.1, 0.0, 1.1): box('Sprosse', 0.08, 0.06, 1.34, 0.15, y, z0 + 1.45, M['frame'], 0.006)
    box('Gadenrahmen', 0.1, 3.5, 0.08, 0.15, 0, z0 + 0.76, M['frame'], 0.008); box('Gadenrahmen', 0.1, 3.5, 0.08, 0.15, 0, z0 + 2.14, M['frame'], 0.008)
    box('Gadenpfosten', 0.3, 0.3, z1 - z0 - 0.6, 0.2, -2.0, (z0 + 0.6 + z1) / 2, M['frame'], 0.02)
    pipe('Gadenleitung', [(0.05, -2.0, z1 - 0.3), (0.05, 2.0, z1 - 0.3)], 0.06, M['wall'], res=6)
def b_pd_trommel():      # Trommel über dem Treffpunkt (polar um den Ursprung): Kranz, Wand mit Lichtschlitzen, Rippen, Decke
    arc_mesh('Trommelkranz', TR - 0.3, TR + 0.5, 0, 2 * PI, FH - 0.45, FH, M['frame'], 0.02)
    arc_mesh('Trommelwand', TR, TR + 0.3, 0, 2 * PI, FH, TZ, M['wall4'], 0)
    arc_mesh('Kranzlicht', TR - 0.32, TR - 0.26, 0, 2 * PI, FH - 0.3, FH - 0.24, M['e_panel_h'], 0)
    for k in range(24):
        a = k * 2 * PI / 24; x, y = polar(TR - 0.03, a); box('Lichtschlitz', 0.05, 0.55, TZ - FH - 1.2, x, y, (FH + TZ) / 2, M['e_panel_h'], 0, (0, 0, a))
        x, y = polar(TR - 0.08, a + PI / 24); box('Trommelrippe', 0.16, 0.2, TZ - FH, x, y, (FH + TZ) / 2, M['frame'], 0.012, (0, 0, a + PI / 24))
    disc('Trommeldecke', TR + 0.3, TZ, TZ + 0.2, M['wall4'], 64, 0)
    for k in range(12):
        a = k * PI / 6; x, y = polar(TR / 2, a); box('Radialbalken', TR - 0.6, 0.25, 0.35, x, y, TZ - 0.18, M['frame'], 0.012, (0, 0, a))
    arc_mesh('Trommelring', TR * 0.45, TR * 0.45 + 0.3, 0, 2 * PI, TZ - 0.4, TZ - 0.1, M['frame'], 0.012)
def b_pd_trommelrahmen():      # Decke des Mittelschiffs rund um die Trommel (Quadrat 2·TR, Öffnung rund), Ursprung in der Mitte
    n = 10
    for q in range(4):
        cx, cy = ((1, 1), (-1, 1), (-1, -1), (1, -1))[q]; a0 = q * PI / 2
        for i in range(n):
            a, b = a0 + i * PI / 2 / n, a0 + (i + 1) * PI / 2 / n
            prism('Deckenecke', [(cx * TR, cy * TR), polar(TR + 0.3, a), polar(TR + 0.3, b)], FH, FH + 0.2, M['wall4'], 'Z', 0)
    for sy in (-1, 1): box('Deckenrand', 2 * TR, NW / 2 - TR, 0.2, 0, sy * (TR + (NW / 2 - TR) / 2), FH + 0.1, M['wall4'], 0)
    for sx in (-1, 1): box('Deckenträger', 0.4, NW, 0.5, sx * TR, 0, FH - 0.25, M['frame'], 0.015)
    for sy in (-1, 1): box('Längsträger', 2 * TR, 0.3, 0.32, 0, sy * (TR + 0.5), FH - 0.16, M['frame'], 0.012)

# =====================================================================================
# Läden: Hülle und Decke (eigener Rahmen: Mündung bei x = 0, Tiefe nach +x, quer y)
# =====================================================================================
def b_pd_ladenschale(bw, bd, seed, rueck=True):      # rueck=False: die Rückwand kommt als Fensterfront dazu (Kantine)
    R = random.Random(seed); nx, ny = int(round(bd / 2)), int(round(bw / 2))
    for i in range(nx):
        for j in range(ny):
            x0, x1 = 0.75 + i * (bd - 0.75) / nx, 0.75 + (i + 1) * (bd - 0.75) / nx; y0, y1 = -bw / 2 + j * bw / ny, -bw / 2 + (j + 1) * bw / ny
            box('Ladenboden', x1 - x0 - 0.02, y1 - y0 - 0.02, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, -0.03, M['floor2' if R.random() < 0.75 else 'floor'], 0.004)
    box('Ladenboden Rand', 0.75, bw, 0.06, 0.375, 0, -0.03, M['floor'], 0.004)
    for sy in (-1, 1): box('Ladenwand', bd, 0.15, BH, bd / 2, sy * (bw / 2 + 0.075), BH / 2, M['wall4'], 0)
    if rueck: box('Ladenwand', 0.15, bw + 0.3, BH, bd + 0.075, 0, BH / 2, M['wall4'], 0)
    for sy in (-1, 1): box('Eckleiste', 0.2, 0.2, BH, bd - 0.1, sy * (bw / 2 - 0.1), BH / 2, M['frame'], 0.012)
    for k in range(9): spot((R.uniform(1.5, bd - 1), R.uniform(-bw / 2 + 1, bw / 2 - 1), 0.0), R.uniform(0.25, 0.7), 'abrieb' if k % 2 else 'fleck', R.uniform(0.7, 1.5))
def b_pd_ladendecke(bw, bd):
    box('Ladendecke', bd, bw, 0.15, bd / 2, 0, BH + 0.075, M['wall4'], 0)
    nx = int(round(bd / 3.2)); ny = int(round(bw / 4))
    for i in range(1, nx): box('Deckenträger', 0.3, bw, 0.35, i * bd / nx, 0, BH - 0.175, M['frame'], 0.012)
    for i in range(nx):
        for j in range(ny):
            xc, yc = (i + 0.5) * bd / nx, -bw / 2 + (j + 0.5) * bw / ny
            box('Lichtrahmen', bd / nx - 1.2, bw / ny - 1.2, 0.06, xc, yc, BH - 0.03, M['frame'], 0.01); box('Kassette', bd / nx - 1.4, bw / ny - 1.4, 0.02, xc, yc, BH - 0.062, M['wall4'], 0)
            for sx in (-1, 1): box('Lichtleiste', 0.22, bw / ny - 1.6, 0.02, xc + sx * 0.5, yc, BH - 0.07, M['e_panel'], 0)
            cyl('Sprinkler', 0.03, 0.08, xc, yc + 1.2, BH - 0.07, M['copper'], 'Z', n=8, bev=0)
    for y in (-bw / 4, bw / 4):
        pipe('Ladenleitung', [(0.5, y, BH - 0.45), (bd - 0.3, y, BH - 0.45)], 0.16, M['wall'], res=8); pipe('Ladenleitung', [(0.5, y + 0.45, BH - 0.32), (bd - 0.3, y + 0.45, BH - 0.32)], 0.06, M['red'], res=6)

# =====================================================================================
# Aufzug, Durchgang, Fensterfront (flach: Wandebene x = 0, Raum bei x < 0)
# =====================================================================================
def b_pd_aufzug(label, sub, sig):      # 6 m breite Aufzugfront mit eigenem Leuchtschild
    s = M[SIG[sig]]; h = VH
    box('Aufzugwand', 0.3, 6.0, h, 0.15, 0, h / 2, M['wall4'], 0)
    for sy in (-1, 1):
        box('Aufzugrahmen', 0.34, 0.34, 3.1, -0.05, sy * 1.37, 1.55, M['frame'], 0.03); box('Rahmenlicht', 0.03, 0.05, 2.9, -0.23, sy * 1.37, 1.5, s, 0)
        box('Aufzugtür', 0.06, 1.18, 2.84, -0.03, sy * 0.6, 1.45, M['steel'], 0.01); box('Türfenster', 0.07, 0.16, 1.3, -0.035, sy * 0.6, 1.75, M['glass'], 0)
        box('Türgriffleiste', 0.075, 0.04, 2.4, -0.04, sy * 0.1, 1.4, M['frame'], 0.004)
        fplate(sy * 1.65 if sy > 0 else -2.9, sy * 2.9 if sy > 0 else -1.65, 0.25, 2.9, 3, x=0.0); fplate(sy * 1.65 if sy > 0 else -2.9, sy * 2.9 if sy > 0 else -1.65, 4.75, h - 0.3, 4, x=0.0)
        box('Warnband', 0.012, 0.3, 0.9, -0.225, sy * 1.6, 0.55, M['warn'], 0)
    box('Aufzugsturz', 0.34, 3.08, 0.34, -0.05, 0, 3.07, M['frame'], 0.03); box('Sturzlicht', 0.03, 2.7, 0.05, -0.23, 0, 3.07, s, 0)
    box('Türspalt', 0.07, 0.02, 2.84, -0.03, 0, 1.45, M['rubber'], 0); box('Sockel', 0.1, 6.0, 0.2, -0.05, 0, 0.1, M['frame'], 0.01)
    box('Schildkasten', 0.24, 5.4, 1.0, -0.1, 0, 4.0, M['frame'], 0.02); box('Schildfeld', 0.02, 5.2, 0.84, -0.225, 0, 4.0, M['wall4'], 0)
    text(label, 0.46 if len(label) < 11 else 0.36, (-0.24, 0, 3.92), RIGHT_X, RIGHT_Y, s, align='CENTER'); text(sub, 0.11, (-0.24, 0, 3.7), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    box('Schildlinie', 0.012, 5.0, 0.025, -0.238, 0, 4.36, s, 0); box('Schildlinie', 0.012, 5.0, 0.025, -0.238, 0, 3.62, s, 0)
    box('Etagenanzeige', 0.06, 0.9, 0.2, -0.2, 0, 3.36, M['frame'], 0.008); text('DECK 3', 0.09, (-0.235, 0, 3.325), RIGHT_X, RIGHT_Y, s, align='CENTER')
    box('Ruftafel', 0.07, 0.36, 0.62, -0.035, -1.95, 1.35, M['frame'], 0.012); box('Rufschirm', 0.012, 0.28, 0.3, -0.073, -1.95, 1.47, M['screen'], 0)
    for k in range(2): cyl('Ruftaste', 0.035, 0.02, -0.075, -1.95, 1.2 - k * 0.1, s if k == 0 else M['steel'], 'X', n=12, bev=0.004)
    box('Bodenmarke', 1.8, 3.2, 0.006, -1.2, 0, 0.003, M['warn'], 0); text(label, 0.22, (-1.2, 0, 0.008), (0, -1, 0), (1, 0, 0), M['txto'], align='CENTER')
    box('Kranz', 0.3, 6.0, 0.14, -0.15, 0, h - 0.07, M['frame'], 0.012); box('Kranzlicht', 0.04, 5.9, 0.03, -0.29, 0, h - 0.16, M['e_panel_h'], 0)
    area('Aufzuglicht', (-1.6, 0, 3.3), (0, -PI / 2 + 0.5, 0), 4.0, 0.8, 90, SIGC[sig])
def b_pd_durchgang(label, h):      # 4 m breit: offener Durchgang im Querschnitt der alten Gänge (3,4 × 2,75) mit Schild
    for sy in (-1, 1):
        box('Durchgangwand', 0.3, 0.3, 2.75, 0.15, sy * 1.85, 1.375, M['wall4'], 0); box('Durchgangpfosten', 0.3, 0.26, 2.9, -0.04, sy * 1.83, 1.45, M['frame'], 0.03)
        box('Pfostenlicht', 0.03, 0.04, 2.5, -0.2, sy * 1.72, 1.4, M['e_cool'], 0); box('Warnband', 0.012, 0.24, 0.8, -0.196, sy * 1.86, 0.5, M['warn'], 0)
    box('Durchgangwand', 0.3, 4.0, h - 2.75, 0.15, 0, 2.75 + (h - 2.75) / 2, M['wall4'], 0); box('Durchgangsturz', 0.34, 3.96, 0.3, -0.04, 0, 2.9, M['frame'], 0.03)
    box('Schildkasten', 0.2, 3.4, 0.6, -0.08, 0, 3.5, M['frame'], 0.02); box('Schildfeld', 0.02, 3.2, 0.46, -0.185, 0, 3.5, M['wall4'], 0)
    text(label, 0.24 if len(label) < 12 else 0.19, (-0.2, 0, 3.42), RIGHT_X, RIGHT_Y, M['e_cool'], align='CENTER')
    fplate(-1.9, 1.9, 3.95, h - 0.3, 3, x=0.0); box('Kranz', 0.3, 4.0, 0.14, -0.15, 0, h - 0.07, M['frame'], 0.012)
    box('Schwelle', 0.5, 3.4, 0.03, 0.1, 0, 0.015, M['steel'], 0.01)
def b_pd_fenster(w, z0, z1):      # Fensterfront mit Blick ins All: Rahmen, Sprossen alle 2 m, Brüstung mit Licht
    box('Fensterwand', 0.3, w, z0, 0.15, 0, z0 / 2, M['wall4'], 0); box('Brüstung', 0.36, w, 0.12, -0.02, 0, z0 - 0.06, M['frame'], 0.02)
    box('Brüstungslicht', 0.03, w - 0.2, 0.03, -0.19, 0, z0 - 0.16, M['e_amber'], 0)
    fplate(-w / 2 + 0.1, w / 2 - 0.1, 0.25, z0 - 0.25, 3, x=0.0)
    box('Ausblick', 0.02, w, z1 - z0, 0.5, 0, (z0 + z1) / 2, M['ausblick'], 0)
    box('Fenstersturz', 0.5, w, 0.2, 0.25, 0, z1 + 0.1, M['frame'], 0.02); box('Fensterbank', 0.5, w, 0.08, 0.25, 0, z0 + 0.04, M['frame'], 0.012)
    n = int(round(w / 2))
    for i in range(n + 1): box('Fenstersprosse', 0.5, 0.12, z1 - z0, 0.25, -w / 2 + i * w / n, (z0 + z1) / 2, M['frame'], 0.02)
    box('Fensterkämpfer', 0.08, w, 0.06, 0.04, 0, z1 - 0.5, M['frame'], 0.01)
def b_pd_sturzwand(w, z0, z1, titel, sub, sig):      # Wand über einer breiten Öffnung (Vorhalle → Forum) mit Schriftband zum Forum hin
    box('Sturzwand', 0.5, w, z1 - z0, 0.25, 0, (z0 + z1) / 2, M['wall4'], 0); box('Sturzbalken', 0.7, w, 0.4, 0.25, 0, z0 + 0.2, M['frame'], 0.03)
    box('Schildfeld', 0.02, w - 4.0, 1.0, -0.012, 0, z0 + 1.2, M['wall4'], 0)
    text(titel, 0.5, (-0.03, 0, z0 + 1.1), RIGHT_X, RIGHT_Y, M[SIG[sig]], align='CENTER'); text(sub, 0.14, (-0.03, 0, z0 + 0.8), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    box('Schildlinie', 0.012, w - 4.4, 0.03, -0.02, 0, z0 + 1.62, M[SIG[sig]], 0); box('Sturzlicht', 0.04, w - 0.4, 0.04, -0.03, 0, z0 + 0.06, M['e_cool'], 0)

# =====================================================================================
# Warenauslagen und Möbel der Läden
# =====================================================================================
def n_pd_erzvitrine(name):      # Handelskontor: Erzprobe auf beleuchtetem Sockel unter einem Rahmen
    R = random.Random(sum(ord(c) for c in name)); m = M['erz_' + name]
    box('Vitrinensockel', 0.8, 0.8, 0.9, 0, 0, 0.45, M['cab'], 0.02); box('Sockelband', 0.83, 0.83, 0.05, 0, 0, 0.86, M['messing'], 0.004)
    box('Sockellicht', 0.6, 0.6, 0.02, 0, 0, 0.91, M['e_panel'], 0); box('Fußlicht', 0.84, 0.84, 0.02, 0, 0, 0.06, M['e_amber'], 0)
    for k in range(5):
        a = k * 1.3; r = 0.1 + 0.09 * R.random()
        ob = kugel('Erzbrocken', r, 0.12 * math.cos(a) * (k > 0), 0.12 * math.sin(a) * (k > 0), 0.93 + r * 0.7 + (0.12 if k == 0 else 0), m, 1, (1.0 + 0.5 * R.random(), 0.8 + 0.4 * R.random(), 0.7 + 0.5 * R.random()))
        ob.rotation_euler = (R.random() * 3, R.random() * 3, R.random() * 3)
    for (sx, sy) in ((1, 1), (1, -1), (-1, 1), (-1, -1)): box('Vitrinenpfosten', 0.03, 0.03, 0.7, sx * 0.37, sy * 0.37, 1.26, M['steel'], 0.004)
    box('Vitrinendach', 0.8, 0.8, 0.05, 0, 0, 1.635, M['frame'], 0.01); box('Dachlicht', 0.5, 0.5, 0.015, 0, 0, 1.605, M['e_panel'], 0)
    box('Erzschild', 0.5, 0.02, 0.16, 0, -0.41, 0.55, M['wall4'], 0.004); text(name, 0.09, (0, -0.422, 0.52), (1, 0, 0), (0, 0, 1), M['e_amber'], align='CENTER')
def n_pd_barren():      # Handelskontor: Barrenstapel auf einer Palette
    box('Palette', 1.2, 0.8, 0.12, 0, 0, 0.06, M['crate'], 0.01)
    for lage in range(4):
        n = 4 - lage
        for i in range(n):
            for j in range(2):
                box('Barren', 0.26, 0.34, 0.085, (i - (n - 1) / 2) * 0.28, (j - 0.5) * 0.36, 0.165 + lage * 0.09, M['barren2' if (lage + j) % 3 == 0 else 'barren'], 0.012)
    box('Barrenschild', 0.4, 0.02, 0.12, 0, -0.41, 0.2, M['wall4'], 0.004); text('BARREN', 0.06, (0, -0.422, 0.18), (1, 0, 0), (0, 0, 1), M['e_amber'], align='CENTER')
def n_pd_ruestpuppe(stoff='anzug', helm=True):      # Ausrüster: Raumanzug auf einem Ständer
    m = M[stoff]
    cyl('Puppensockel', 0.36, 0.06, 0, 0, 0.03, M['frame'], 'Z', n=24, bev=0.01); cyl('Sockellicht', 0.3, 0.012, 0, 0, 0.066, M['e_sig_r'], 'Z', n=24, bev=0)
    cyl('Ständer', 0.025, 0.95, 0, 0, 0.53, M['steel'], 'Z', n=8, bev=0)
    for sx in (-1, 1):
        cyl('Bein', 0.085, 0.8, sx * 0.11, 0, 0.5, m, 'Z', n=12, bev=0.01); box('Stiefel', 0.15, 0.28, 0.14, sx * 0.11, -0.04, 0.13, M['rubber'], 0.03); cyl('Knieschale', 0.095, 0.1, sx * 0.11, 0, 0.55, M['frame'], 'Z', n=12, bev=0.01)
        cyl('Arm', 0.065, 0.62, sx * 0.3, 0, 1.18, m, 'Z', n=10, bev=0.01); box('Handschuh', 0.1, 0.12, 0.16, sx * 0.3, 0, 0.82, M['rubber'], 0.03); cyl('Schulter', 0.1, 0.12, sx * 0.27, 0, 1.47, M['frame'], 'X', n=12, bev=0.02)
    box('Hüfte', 0.4, 0.26, 0.2, 0, 0, 0.96, m, 0.04); box('Gurt', 0.42, 0.28, 0.06, 0, 0, 1.03, M['frame'], 0.01)
    box('Rumpf', 0.44, 0.28, 0.5, 0, 0, 1.28, m, 0.06); box('Brustplatte', 0.3, 0.06, 0.26, 0, -0.14, 1.36, M['frame'], 0.02); box('Brustlicht', 0.1, 0.02, 0.03, 0.06, -0.172, 1.42, M['e_sig_r'], 0)
    box('Tornister', 0.36, 0.16, 0.46, 0, 0.2, 1.3, M['cab'], 0.03); cyl('Kragen', 0.13, 0.06, 0, 0, 1.56, M['frame'], 'Z', n=16, bev=0.01)
    if helm:
        kugel('Helm', 0.17, 0, 0, 1.74, M['wall3'], 2); kugel('Visier', 0.14, 0, -0.06, 1.75, M['visier'], 2, (1.0, 0.8, 0.85))
def n_pd_waffenwand(w=3.0):      # flach: Lochwand mit Waffen, Licht darüber
    box('Lochwand', 0.05, w, 1.7, -0.025, 0, 1.55, M['cab'], 0.01); box('Wandlicht', 0.08, w - 0.2, 0.05, -0.1, 0, 2.46, M['e_sig_r'], 0); box('Lichtblende', 0.16, w, 0.06, -0.08, 0, 2.5, M['frame'], 0.01)
    for i in range(int(w / 0.12)):
        for j in range(3): cyl('Wandloch', 0.012, 0.004, -0.052, -w / 2 + 0.1 + i * 0.12, 0.9 + j * 0.6, M['schacht'], 'X', n=6, bev=0)
    for k in range(3):      # Gewehre
        z = 2.05 - k * 0.42; y0 = -w / 2 + 0.35
        box('Gewehrgehäuse', 0.06, 0.7, 0.13, -0.09, y0 + 0.55, z, M['frame'], 0.015); cyl('Gewehrlauf', 0.02, 0.7, -0.09, y0 + 1.2, z + 0.02, M['steel'], 'Y', n=8, bev=0)
        box('Schaft', 0.05, 0.4, 0.12, -0.09, y0 + 0.05, z - 0.03, M['crate'], 0.02); box('Magazin', 0.04, 0.1, 0.22, -0.09, y0 + 0.6, z - 0.16, M['cab'], 0.01)
        box('Zieloptik', 0.04, 0.26, 0.05, -0.09, y0 + 0.55, z + 0.1, M['cab'], 0.01)
        for dy in (0.25, 0.95): box('Haken', 0.08, 0.03, 0.03, -0.05, y0 + dy, z - 0.08, M['steel'], 0.004)
    for k in range(4):      # Pistolen
        y = w / 2 - 0.35 - (k % 2) * 0.5; z = 1.95 - (k // 2) * 0.55
        box('Pistole', 0.04, 0.3, 0.09, -0.08, y, z, M['frame'], 0.012); box('Pistolengriff', 0.04, 0.09, 0.16, -0.08, y - 0.09, z - 0.1, M['crate'], 0.012)
    text('WAFFEN  ·  NUR MIT LIZENZ', 0.07, (-0.056, 0, 0.82), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
def n_pd_stiefelbank():      # Ausrüster: Bank mit Stiefeln und Handschuhen
    box('Bankgestell', 1.8, 0.5, 0.06, 0, 0, 0.5, M['crate'], 0.012)
    for sx in (-1, 1): box('Bankfuß', 0.06, 0.46, 0.5, sx * 0.8, 0, 0.25, M['frame'], 0.01)
    box('Bankboden', 1.7, 0.46, 0.04, 0, 0, 0.14, M['cab'], 0.008)
    for k in range(4):
        for d in (-0.07, 0.07):
            box('Stiefelschaft', 0.11, 0.13, 0.3, -0.6 + k * 0.4 + d, 0.05, 0.68, M['rubber'], 0.03); box('Stiefelfuß', 0.11, 0.28, 0.1, -0.6 + k * 0.4 + d, -0.03, 0.58, M['rubber'], 0.03)
    for k in range(3): box('Handschuhkarton', 0.3, 0.3, 0.14, -0.5 + k * 0.5, 0, 0.23, M['crate'], 0.01)
def n_pd_lackmuster():      # flach: fünf Lackmuster der Werft
    box('Musterwand', 0.05, 3.4, 1.2, -0.025, 0, 1.6, M['cab'], 0.01); text('LACKIERUNGEN', 0.1, (-0.056, 0, 2.06), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    for k, n in enumerate(LACK):
        y = 1.3 - k * 0.65
        box('Lackmuster', 0.03, 0.5, 0.7, -0.065, y, 1.58, M['lack_' + n], 0.03); text(n, 0.05, (-0.056, y, 1.13), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    box('Musterlicht', 0.08, 3.2, 0.04, -0.1, 0, 2.24, M['e_panel'], 0)
def n_pd_schiffsmodell(datei, titel, laenge=2.6):      # Werft: Schiffsmodell aus Metall auf einem Sockel (die echten Fernmodelle der Schiffe, verkleinert)
    box('Modellsockel', laenge + 0.5, 1.3, 0.9, 0, 0, 0.45, M['cab'], 0.03); box('Sockelband', laenge + 0.54, 1.34, 0.05, 0, 0, 0.86, M['e_sig_w'], 0)
    box('Sockelplatte', laenge + 0.3, 1.1, 0.03, 0, 0, 0.915, M['wall4'], 0.006); box('Fußlicht', laenge + 0.54, 1.34, 0.02, 0, 0, 0.06, M['e_cool'], 0)
    box('Modellschild', 0.9, 0.02, 0.2, 0, -0.66, 0.52, M['wall4'], 0.004); text(titel, 0.1, (0, -0.672, 0.49), (1, 0, 0), (0, 0, 1), M['e_sig_w'], align='CENTER')
    for sx in (-1, 1): cyl('Modellstütze', 0.025, 0.45, sx * laenge * 0.22, 0, 1.15, M['steel'], 'Z', n=8, bev=0)
    try:
        vor = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=os.path.join(HERE, '..', '..', 'glb', 'ship', datei))
        neu = [o for o in bpy.data.objects if o not in vor]; bpy.context.view_layer.update()
        bm = bmesh.new()
        for o in neu:
            if o.type != 'MESH': continue
            t = bmesh.new(); t.from_mesh(o.data); t.transform(o.matrix_world); me_ = bpy.data.meshes.new('t'); t.to_mesh(me_); t.free(); bm.from_mesh(me_); bpy.data.meshes.remove(me_)
        for o in neu: bpy.data.objects.remove(o, do_unlink=True)
        xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zs = [v.co.z for v in bm.verts]
        dx, dy = max(xs) - min(xs), max(ys) - min(ys); cx, cy = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        k = laenge / max(dx, dy)
        Mx = Matrix.Scale(k, 4) @ Matrix.Translation((-cx, -cy, -min(zs)))
        if dy > dx: Mx = Matrix.Rotation(PI / 2, 4, 'Z') @ Mx      # Längsachse entlang x
        bm.transform(Matrix.Translation((0, 0, 1.38)) @ Mx)
        me = bpy.data.meshes.new('Schiffsmodell'); bm.to_mesh(me); bm.free(); me.materials.clear(); me.materials.append(M['steel'])
        for p in me.polygons: p.material_index = 0; p.use_smooth = False
        link(bpy.data.objects.new('Schiffsmodell', me))
    except Exception as e:      # Datei fehlt: ein schlichter Keil
        prism('Schiffsmodell', [(-laenge / 2, 0), (laenge / 2, -0.2), (laenge / 2, 0.2)], 1.38, 1.7, M['steel'], 'Z', 0.02)
    area('Modelllicht', (0, 0, 3.6), (0, 0, 0), laenge, 1.0, 70, COOL)
def n_pd_sitznische():      # Kantine: Sitznische mit zwei Bänken und Tisch (Fensterseite bei +x)
    for sy in (-1, 1):
        box('Nischenbank', 1.5, 0.5, 0.45, 0, sy * 0.85, 0.225, M['cab'], 0.02); box('Nischenpolster', 1.44, 0.46, 0.08, 0, sy * 0.85, 0.49, M['polster'], 0.03)
        box('Nischenlehne', 1.5, 0.1, 0.9, 0, sy * 1.12, 0.75, M['cab'], 0.02); box('Lehnenpolster', 1.4, 0.06, 0.5, 0, sy * 1.06, 0.82, M['polster'], 0.03)
    box('Nischentisch', 1.3, 0.8, 0.05, 0.05, 0, 0.76, M['crate'], 0.015); cyl('Tischfuß', 0.05, 0.74, 0.05, 0, 0.37, M['steel'], 'Z', n=10, bev=0)
    cyl('Tischlampe', 0.06, 0.1, 0.5, 0, 0.84, M['birne'], 'Z', n=10, bev=0.01); box('Tablett', 0.3, 0.22, 0.02, -0.2, 0.1, 0.795, M['steel'], 0.004)
    for k in range(2): cyl('Becher', 0.035, 0.09, -0.25 + k * 0.12, 0.08 - k * 0.2, 0.83, M['wall3'], 'Z', n=10, bev=0.004)
def n_pd_bank():      # frei stehende Bank im Forum (zwei Sitzseiten, Lehne in der Mitte, Licht darunter)
    box('Banksockel', 2.4, 0.5, 0.36, 0, 0, 0.18, M['frame'], 0.03); box('Banklicht', 2.3, 0.54, 0.03, 0, 0, 0.06, M['e_amber'], 0)
    box('Banksitz', 2.5, 1.2, 0.08, 0, 0, 0.42, M['crate'], 0.02); box('Banklehne', 2.3, 0.12, 0.5, 0, 0, 0.7, M['cab'], 0.03)
    for sy in (-1, 1): box('Bankpolster', 2.3, 0.44, 0.06, 0, sy * 0.33, 0.49, M['polster'], 0.02)
def n_pd_laterne():      # Standleuchte im Forum
    cyl('Laternenfuß', 0.22, 0.12, 0, 0, 0.06, M['frame'], 'Z', n=16, bev=0.02); cyl('Laternenmast', 0.045, 3.2, 0, 0, 1.7, M['steel'], 'Z', n=10, bev=0)
    box('Laternenkopf', 0.5, 0.5, 0.1, 0, 0, 3.33, M['frame'], 0.02); box('Laternenlicht', 0.42, 0.42, 0.03, 0, 0, 3.27, M['birne'], 0)
    point('Laterne', (0, 0, 3.1), 26, WARMW, 0.15)
def n_pd_warenregal():      # Handelskontor: frei stehendes Regal mit Kisten und Säcken (beidseitig)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Regalpfosten', 0.06, 0.06, 2.2, sx * 1.2, sy * 0.4, 1.1, M['steel'], 0.006)
    R = random.Random(5)
    for k in range(4):
        z = 0.2 + k * 0.62; box('Regalboden', 2.5, 0.9, 0.04, 0, 0, z, M['crate'], 0.006)
        x = -1.05
        while x < 1.0 and k < 3:
            w = R.choice((0.4, 0.5, 0.6)); h = R.uniform(0.3, 0.5)
            box('Regalkiste', w - 0.04, 0.7, h, x + w / 2, 0, z + 0.02 + h / 2, M[R.choice(('crate', 'kiste_gruen', 'kiste_blau', 'cab', 'sack'))], 0.015); x += w
for k_, f_ in (('barren', n_pd_barren), ('ruestpuppe', n_pd_ruestpuppe), ('ruestpuppe2', lambda: n_pd_ruestpuppe('anzug2')), ('ruestpuppe3', lambda: n_pd_ruestpuppe('anzug3', False)),
               ('waffenwand', n_pd_waffenwand), ('stiefelbank', n_pd_stiefelbank), ('lackmuster', n_pd_lackmuster), ('sitznische', n_pd_sitznische), ('bank', n_pd_bank),
               ('laterne', n_pd_laterne), ('warenregal', n_pd_warenregal), ('stuetze', lambda: b_pd_stuetze(FH)), ('obergaden', b_pd_obergaden), ('trommel', b_pd_trommel),
               ('trommelrahmen', b_pd_trommelrahmen)):
    PROP['pd_' + k_] = f_
for n_ in ERZ: PROP['pd_erz_' + n_] = (lambda n=n_: n_pd_erzvitrine(n))
MODELLE = [('MilanFern.glb', 'MILAN', 2.0), ('DohleFern.glb', 'DOHLE', 2.4), ('ElsterFern.glb', 'ELSTER', 2.4), ('HarpyieFern.glb', 'HARPYIE', 2.8), ('WisentFern.glb', 'WISENT', 3.2)]
for (d_, t_, l_) in MODELLE: PROP['pd_modell_' + t_] = (lambda d=d_, t=t_, l=l_: n_pd_schiffsmodell(d, t, l))

# ---------- Nachtrag 26.11.2026: Schaupuppen, Rucksackwand, Lagetisch ----------
# Nutzer: „Baue für die Ausrüstungen Manny Skelette und packe die neuen Overalls und Rucksäcke Helme hin.“ Die Puppen selbst stehen erst im Spiel
# (src/game/schaupuppe.ts: Figur auf dem UE5-Skelett mit den echten Ausrüstungsteilen); hier nur ihr Sockel mit Schild. PUPPEN (pd_deck.py) nennt
# die Plätze und was jede trägt. Für Rucksäcke gibt es im Paket des Nutzers kein Modell: drei Auslagestücke an der Wand (n_pd_rucksackwand).
def n_pd_puppensockel(titel='', preis=''):      # Schauseite −y: runder Sockel mit Lichtring, Rückenstange mit Halter, schräges Schild vorn
    cyl('Puppensockel', 0.46, 0.1, 0, 0, 0.05, M['frame'], 'Z', n=32, bev=0.012); cyl('Sockelplatte', 0.4, 0.02, 0, 0, 0.11, M['cab'], 'Z', n=32, bev=0.004)
    ring('Sockellicht', 0.43, 0.012, (0, 0, 0.105), (0, 0, 1), M['e_sig_r'], 40)
    cyl('Rückenstange', 0.018, 1.25, 0, 0.3, 0.72, M['steel'], 'Z', n=8, bev=0); box('Stangenfuß', 0.1, 0.1, 0.03, 0, 0.3, 0.115, M['frame'], 0.006)
    box('Rückenhalter', 0.03, 0.22, 0.03, 0, 0.2, 1.33, M['steel'], 0.004); box('Halterplatte', 0.14, 0.02, 0.1, 0, 0.1, 1.33, M['frame'], 0.006)
    if titel:
        box('Schildfuß', 0.03, 0.03, 0.2, 0.0, -0.52, 0.1, M['steel'], 0.004); box('Puppenschild', 0.62, 0.02, 0.2, 0, -0.55, 0.26, M['wall4'], 0.006, (0.5, 0, 0))
        text(titel, 0.062, (0, -0.585, 0.283), (1, 0, 0), (0, 0.48, 0.88), M['txtw'], align='CENTER')
        if preis: text(preis, 0.05, (0, -0.545, 0.208), (1, 0, 0), (0, 0.48, 0.88), M['e_amber'], align='CENTER')
def _rucksack(y, z, art):
    if art == 0:      # Umhängetasche: flach, breiter Gurt schräg
        box('Tasche', 0.14, 0.36, 0.28, -0.12, y, z, M['stoff_sand'], 0.04); box('Taschenklappe', 0.15, 0.37, 0.15, -0.125, y, z + 0.075, M['stoff_dunkel'], 0.03)
        box('Schnalle', 0.02, 0.05, 0.04, -0.205, y, z + 0.02, M['messing'], 0.004); pipe('Gurt', [(-0.06, y - 0.18, z + 0.1), (-0.05, y - 0.3, z + 0.45), (-0.05, y + 0.3, z + 0.45), (-0.06, y + 0.18, z + 0.1)], 0.014, M['stoff_dunkel'], rad=0.1)
    elif art == 1:      # Feldrucksack: Hauptfach, Deckel, zwei Seitentaschen, Fronttasche, Tragegurte
        box('Rucksack', 0.24, 0.4, 0.56, -0.17, y, z, M['anzug'], 0.07); box('Deckel', 0.26, 0.42, 0.16, -0.175, y, z + 0.26, M['stoff_dunkel'], 0.06)
        box('Fronttasche', 0.08, 0.28, 0.26, -0.3, y, z - 0.08, M['anzug'], 0.03)
        for sy in (-1, 1):
            box('Seitentasche', 0.16, 0.08, 0.26, -0.17, y + sy * 0.23, z - 0.1, M['anzug'], 0.03); box('Riemen', 0.012, 0.03, 0.3, -0.31, y + sy * 0.1, z + 0.16, M['stoff_sand'], 0.003); box('Riemenschnalle', 0.02, 0.04, 0.03, -0.318, y + sy * 0.1, z + 0.1, M['messing'], 0.003)
        box('Rolle', 0.14, 0.44, 0.14, -0.17, y, z + 0.4, M['stoff_petrol'], 0.06); box('Griffschlaufe', 0.03, 0.12, 0.03, -0.08, y, z + 0.36, M['stoff_sand'], 0.01)
    else:      # Lastengestell: Rohrrahmen mit zwei Kisten und Spanngurten
        for sy in (-1, 1): pipe('Gestellholm', [(-0.06, y + sy * 0.22, z - 0.42), (-0.06, y + sy * 0.22, z + 0.42), (-0.2, y + sy * 0.22, z + 0.5)], 0.016, M['steel'], rad=0.06)
        for dz in (-0.4, 0.0, 0.4): cyl('Gestellquer', 0.012, 0.44, -0.06, y, z + dz, M['steel'], 'Y', n=8, bev=0)
        box('Lastkiste', 0.26, 0.4, 0.34, -0.22, y, z - 0.2, M['kiste_gruen'], 0.02); box('Lastsack', 0.24, 0.38, 0.3, -0.21, y, z + 0.16, M['sack'], 0.07)
        box('Bodenblech', 0.3, 0.42, 0.02, -0.2, y, z - 0.4, M['frame'], 0.004)
        for dz in (-0.2, 0.16): box('Spanngurt', 0.28, 0.03, 0.012, -0.22, y, z + dz + 0.17, M['e_sig_r'] if False else M['stoff_rot'], 0.002); box('Gurtschloss', 0.02, 0.05, 0.03, -0.36, y, z + dz + 0.1, M['messing'], 0.003)
def n_pd_rucksackwand(w=3.0):      # flach: Lochwand mit den drei Rucksäcken der Ausrüster, Licht darüber, Schild je Stück
    box('Lochwand', 0.05, w, 1.9, -0.025, 0, 1.55, M['cab'], 0.01); box('Wandlicht', 0.08, w - 0.2, 0.05, -0.1, 0, 2.56, M['e_sig_r'], 0); box('Lichtblende', 0.16, w, 0.06, -0.08, 0, 2.6, M['frame'], 0.01)
    text('RUCKSÄCKE', 0.11, (-0.056, 0, 2.36), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    for k, (nm, pr) in enumerate((('UMHÄNGETASCHE', '80'), ('FELDRUCKSACK', '420'), ('LASTENGESTELL', '1500'))):
        y = (k - 1) * (w / 3 - 0.02); z = (1.5, 1.6, 1.62)[k]
        for sy in (-1, 1): box('Haken', 0.1, 0.02, 0.02, -0.07, y + sy * 0.12, z + (0.3 if k else 0.42), M['steel'], 0.003)
        _rucksack(y, z, k)
        box('Preisschild', 0.012, 0.56, 0.13, -0.056, y, 0.82, M['wall4'], 0.004); text(nm, 0.05, (-0.064, y, 0.83), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER'); text(pr + ' CR', 0.042, (-0.064, y, 0.775), RIGHT_X, RIGHT_Y, M['e_amber'], align='CENTER')
def n_pd_lagetisch():      # Einsatzzentrale: großer Kartentisch mit leuchtender Sektorkarte, vier Pulten und Reling
    box('Tischsockel', 3.4, 1.9, 0.7, 0, 0, 0.35, M['wall2'], 0.04); box('Sockelfuge', 3.5, 2.0, 0.06, 0, 0, 0.05, M['frame'], 0.01); box('Fußlicht', 3.44, 1.94, 0.02, 0, 0, 0.1, M['e_sig_e'], 0)
    box('Tischrahmen', 4.2, 2.6, 0.12, 0, 0, 0.78, M['frame'], 0.03); box('Kartenglas', 3.8, 2.2, 0.02, 0, 0, 0.85, M['glass'], 0); box('Kartenbild', 3.7, 2.1, 0.006, 0, 0, 0.838, M['karte2'], 0)
    for k in range(7): box('Kartenlinie', 0.006, 2.1, 0.004, -1.65 + k * 0.55, 0, 0.862, M['e_teal'], 0)
    for k in range(4): box('Kartenlinie', 3.7, 0.006, 0.004, 0, -0.825 + k * 0.55, 0.862, M['e_teal'], 0)
    R = random.Random(7)
    for k in range(9):
        x, y = R.uniform(-1.6, 1.6), R.uniform(-0.9, 0.9); cyl('Kartenmarke', 0.035, 0.05 + 0.2 * R.random(), x, y, 0.9, M['e_amber' if k % 3 else 'e_sig_e'], 'Z', n=8, bev=0)
    ring('Kartenkreis', 0.5, 0.006, (0.4, -0.1, 0.87), (0, 0, 1), M['e_amber'], 40); ring('Kartenkreis', 0.9, 0.005, (0.4, -0.1, 0.87), (0, 0, 1), M['e_teal'], 48)
    for sx in (-1, 1):
        for sy in (-1, 1):
            box('Tischpult', 0.5, 0.3, 0.05, sx * 1.2, sy * 1.42, 0.86, M['frame'], 0.012, (sy * 0.5, 0, 0)); box('Pultbild', 0.42, 0.22, 0.006, sx * 1.2, sy * 1.43, 0.888, M['screen'], 0, (sy * 0.5, 0, 0))
    for sy in (-1, 1): pipe('Tischreling', [(-1.9, sy * 1.36, 0.8), (-1.9, sy * 1.36, 1.0), (1.9, sy * 1.36, 1.0), (1.9, sy * 1.36, 0.8)], 0.016, M['steel'], rad=0.06)
    point('Kartenlicht', (0, 0, 1.3), 30, (0.15, 0.95, 0.85), 0.3)
PROP.update({'pd_rucksackwand': n_pd_rucksackwand, 'pd_lagetisch': n_pd_lagetisch})
