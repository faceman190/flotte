# Bauteile des Cockpit-Baukastens (nach cp_lib.py laden). Alle Teile liegen im aktuellen Rahmen (Platz):
#   X rechts, Y nach vorn (Blickrichtung des Piloten), Z oben. Der Pilot schaut nach +Y, Flächen zum Piloten zeigen nach −Y.
import random
RND = random.Random(7)

def stab(m, p0, p1, b, h, fase=0.004, seg=1, dreh=0.0):
    """Balken mit Rechteckquerschnitt (b × h) von p0 nach p1; dreh: Drehung um die Längsachse in Grad"""
    p0, p1 = Vector(p0), Vector(p1); d = p1 - p0; L = d.length
    if L < 1e-6: return
    q = d.to_track_quat('Y', 'Z').to_matrix().to_4x4()
    with Platz(m=Matrix.Translation((p0 + p1) / 2) @ q @ Matrix.Rotation(math.radians(dreh), 4, 'Y')): quader(m, (b, L, h), fase=fase, seg=seg)

def schraube(ort, r=0.004, m='Metall'):
    """kleiner Schraubenkopf, Achse −Y (zum Piloten)"""
    zyl(m, r, 0.003, (ort[0], ort[1] - 0.0015, ort[2]), 'Y', 6)

def tastenfeld(nx, nz, b, h, ort=(0, 0, 0), licht=0.35, m='Taste', tief=0.006, luecke=0.0035, schrift_auf=None):
    """Tastenblock in der X/Z-Ebene, Tasten ragen nach −Y. licht: Anteil der Tasten mit kalter Lichtkante"""
    tb = (b - luecke * (nx - 1)) / nx; th = (h - luecke * (nz - 1)) / nz
    for i in range(nx):
        for k in range(nz):
            x = ort[0] - b / 2 + tb / 2 + i * (tb + luecke); z = ort[2] - h / 2 + th / 2 + k * (th + luecke)
            quader(m, (tb, tief, th), (x, ort[1] - tief / 2, z), 0.0012)
            r = RND.random()
            if r < licht: quader('Licht Kalt', (tb * 0.7, 0.0008, th * 0.16), (x, ort[1] - tief - 0.0003, z + th * 0.28), 0)
            elif r < licht + 0.05: quader('Licht Warm', (tb * 0.7, 0.0008, th * 0.16), (x, ort[1] - tief - 0.0003, z + th * 0.28), 0)

def anzeige(art, b, h, ort=(0, 0, 0), rx=-25.0, rz=0.0, tief=0.07, haube=0.03, tasten=5, schrauben=True, fuss=0.0):
    """Anzeige im Formteil-Gehäuse: Glasfläche „Schirm <art>“ (b × h, UV 0…1), dicker Rahmen mit Fase, Haube oben, Tastenreihe unten.
    ort = Mitte der Glasfläche. Das Gehäuse reicht um „tief“ nach hinten und wird dort breiter (Sockel)."""
    r = 0.022; gb, gh = b + 2 * r, h + 2 * r + (0.03 if tasten else 0.0); dz = -0.015 if tasten else 0.0
    with Platz(ort, rx, 0, rz):
        # Gehäuse: vorn schmaler als hinten
        keil('Formteil', (gb, gh), (gb + 0.05, gh + 0.05), tief, (0, tief / 2 + 0.006, dz), fase=0.008)
        # Rahmen: vier Leisten um die Glasfläche, innen angeschrägt
        for s in (-1, 1):
            quader('Formteil hell', (gb, 0.012, r), (0, 0.0, s * (h / 2 + r / 2)), 0.004)
            quader('Formteil hell', (r, 0.012, h), (s * (b / 2 + r / 2), 0.0, 0), 0.004)
        quader('Schirmglas', (b + 0.004, 0.004, h + 0.004), (0, 0.0045, 0), 0)
        flaeche('Schirm ' + art, [(-b / 2, 0.002, -h / 2), (b / 2, 0.002, -h / 2), (b / 2, 0.002, h / 2), (-b / 2, 0.002, h / 2)], uv=True)
        if haube > 0:      # Lichtschutz über der Anzeige
            prisma('Formteil', [(-gb / 2 - 0.004, 0.006), (-gb / 2 + 0.012, -haube), (gb / 2 - 0.012, -haube), (gb / 2 + 0.004, 0.006)], 0.012, (0, 0, h / 2 + r + 0.006), fase=0.003, achse='Z')
        if tasten:
            tb = b * 0.82; tastenfeld(tasten, 1, tb, 0.015, (0, -0.006, -h / 2 - r - 0.012), licht=0.5)
            zyl('Metall', 0.007, 0.01, (b / 2 - 0.004, -0.009, -h / 2 - r - 0.012), 'Y', 12, 0.0015)
        if schrauben:
            for sx in (-1, 1):
                for sz in (-1, 1): schraube((sx * (gb / 2 - 0.008), -0.006, sz * (h / 2 + r - 0.008) ))
        if fuss > 0: keil('Formteil', (gb * 0.5, 0.05), (gb * 0.7, 0.07), fuss, (0, tief + fuss / 2, dz - gh * 0.2), fase=0.006)

def knueppel(ort=(0, 0, 0), s=1, neig=8.0, marke=0):
    """Steuerknüppel (Griff mit Kopf, Abzug, Daumenschalter, Faltenbalg, Sockel). ort = Mitte des Sockels auf der Konsole. s: +1 rechte Hand, −1 linke.
    Liefert den Griffpunkt (Mitte der Hand) in Koordinaten des umgebenden Rahmens."""
    with Platz(ort):
        zyl('Formteil hell', 0.062, 0.012, (0, 0, 0.006), 'Z', 24, 0.004)
        zyl('Metall', 0.05, 0.006, (0, 0, 0.014), 'Z', 24, 0.002)
        for k in range(4): zyl('Gummi', 0.044 - k * 0.006, 0.011, (0, 0, 0.022 + k * 0.01), 'Z', 20, 0.003)      # Faltenbalg
        for a in range(6): zyl('Metall', 0.0035, 0.003, (0.054 * math.cos(a * PI / 3), 0.054 * math.sin(a * PI / 3), 0.0135), 'Z', 6)
        with Platz((0, 0, 0.055), -neig, -s * 4.0, 0), Marke(marke):      # ab hier beweglich (Drehpunkt knapp über dem Faltenbalg)
            zyl('Metall', 0.011, 0.05, (0, 0, 0.02), 'Z', 12)
            # Griff: unten Handauflage, Mitte gerippt, oben Kopf
            prisma('Gummi', [(-0.024, 0.04), (0.026, 0.04), (0.03, 0.058), (-0.03, 0.058)], 0.062, (0, 0.004, 0), fase=0.006, achse='Y')      # Handballenauflage
            zyl('Gummi', 0.019, 0.105, (0, 0, 0.11), 'Z', 14, 0.004, r2=0.021)
            for k in range(5): zyl('Formteil', 0.0215, 0.006, (0, 0, 0.075 + k * 0.017), 'Z', 14, 0.0015)
            with Platz((0, 0.006, 0.175), 18, 0, 0):      # Kopf, zum Piloten geneigt
                prisma('Formteil', [(-0.03, -0.02), (0.03, -0.02), (0.034, 0.012), (0.022, 0.04), (-0.022, 0.04), (-0.034, 0.012)], 0.048, (0, 0, 0), fase=0.006, achse='Y')
                zyl('Metall', 0.008, 0.012, (-s * 0.012, -0.026, 0.02), 'Y', 10, 0.002); zyl('Gummi', 0.0055, 0.008, (-s * 0.012, -0.034, 0.02), 'Y', 8)      # Daumenstick
                zyl('Warnrot', 0.006, 0.006, (s * 0.014, -0.026, 0.024), 'Y', 10, 0.0015)      # Auslöser Flugkörper
                quader('Taste', (0.012, 0.006, 0.008), (s * 0.012, -0.026, 0.004), 0.0015); quader('Taste', (0.012, 0.006, 0.008), (-s * 0.012, -0.026, -0.002), 0.0015)
                quader('Licht Kalt', (0.016, 0.001, 0.0025), (0, -0.0245, -0.012), 0)
                prisma('Warnrot', [(0, 0), (0.02, 0.004), (0.022, 0.03), (0.004, 0.034)], 0.012, (0, 0.03, -0.022), fase=0.002, achse='X')      # Abzug vorn
        g = welt((0, -0.004 - math.sin(math.radians(neig)) * 0.12, 0.055 + 0.115))
    return g

def schubhebel(ort=(0, 0, 0), s=-1):
    """Schubhebel in Kulisse (für Schiffe mit einem Knüppel und einem Schubhebel)"""
    with Platz(ort):
        quader('Formteil hell', (0.09, 0.2, 0.012), (0, 0, 0.006), 0.004)
        quader('Schirmglas', (0.014, 0.16, 0.004), (0, 0, 0.0125), 0.001)
        for k in range(9): quader('Schrift', (0.01, 0.0015, 0.0008), (0.022, -0.07 + k * 0.0175, 0.0125), 0)
        with Platz((0, 0.02, 0.012), -12, 0, 0):
            quader('Metall', (0.012, 0.016, 0.07), (0, 0, 0.035), 0.003)
            prisma('Gummi', [(-0.034, -0.02), (0.034, -0.02), (0.036, 0.012), (0.022, 0.026), (-0.022, 0.026), (-0.036, 0.012)], 0.05, (0, 0, 0.085), fase=0.008, achse='Y')
            quader('Licht Kalt', (0.03, 0.0012, 0.003), (0, -0.0255, 0.092), 0)
            zyl('Taste', 0.006, 0.006, (-s * 0.034, 0, 0.09), 'X', 10, 0.0015)

def sitz(ort=(0, 0, 0), sockel=0.3, akzent=True):
    """Pilotensitz. ort = Mitte der Sitzfläche oben (unter dem Gesäß). Lehne 12° geneigt, Kopfstütze, Wangen, Gurte, Sockel mit Schienen."""
    with Platz(ort):
        # Sitzschale und Polster (Polster in Feldern mit Fugen)
        prisma('Formteil', [(-0.27, -0.09), (0.27, -0.09), (0.3, -0.02), (0.3, 0.02), (-0.3, 0.02), (-0.3, -0.02)], 0.52, (0, 0.03, 0), fase=0.012, achse='Y')
        for i, (y, t) in enumerate(((-0.13, 0.17), (0.05, 0.17), (0.2, 0.11))): quader('Stoff', (0.4, t, 0.05), (0, y, 0.03), 0.014, 2)
        for s in (-1, 1): quader('Stoff', (0.07, 0.42, 0.075), (s * 0.245, 0.03, 0.04), 0.02, 2)      # Seitenwangen
        quader('Akzent' if akzent else 'Formteil hell', (0.4, 0.012, 0.012), (0, 0.262, 0.012), 0.003)
        with Platz((0, -0.24, 0.02), 12, 0, 0):      # Lehne, nach hinten geneigt
            prisma('Formteil', [(-0.25, 0.0), (0.25, 0.0), (0.28, 0.2), (0.26, 0.6), (0.17, 0.74), (-0.17, 0.74), (-0.26, 0.6), (-0.28, 0.2)], 0.07, (0, -0.045, 0), fase=0.014, achse='Y')
            for k in range(4): quader('Stoff', (0.36, 0.045, 0.125), (0, 0.006, 0.09 + k * 0.137), 0.014, 2)
            for s in (-1, 1):
                quader('Stoff', (0.06, 0.09, 0.5), (s * 0.225, 0.02, 0.33), 0.02, 2)      # Rückenwangen
                stab('Gummi', (s * 0.11, 0.035, 0.62), (s * 0.08, 0.04, 0.16), 0.045, 0.004, 0.001)      # Schultergurt
                zyl('Metall', 0.012, 0.03, (s * 0.11, 0.03, 0.635), 'X', 10, 0.002)
            quader('Metall', (0.05, 0.012, 0.035), (0, 0.045, 0.14), 0.004); zyl('Warnrot', 0.012, 0.008, (0, 0.036, 0.14), 'Y', 12, 0.002)      # Gurtschloss
            # Kopfstütze
            prisma('Formteil', [(-0.15, 0.0), (0.15, 0.0), (0.17, 0.1), (0.12, 0.22), (-0.12, 0.22), (-0.17, 0.1)], 0.08, (0, -0.05, 0.74), fase=0.016, achse='Y')
            quader('Stoff', (0.22, 0.04, 0.14), (0, 0.0, 0.85), 0.016, 2)
            for s in (-1, 1): stab('Metall', (s * 0.2, -0.08, 0.02), (s * 0.2, -0.085, 0.7), 0.02, 0.03, 0.004)      # Holme
            quader('Formteil hell', (0.34, 0.03, 0.32), (0, -0.095, 0.3), 0.01)      # Rückenkasten
            quader('Warngelb', (0.1, 0.003, 0.03), (0, -0.111, 0.36), 0.0008); schrift('RETTUNGSSITZ', 0.011, (0, -0.113, 0.36), 'Schrift dunkel', rx=90, rz=180)
        # Sockel: Säule, Schienen, Verstellhebel
        if sockel > 0:
            quader('Metall', (0.16, 0.2, sockel - 0.1), (0, 0.0, -0.09 - (sockel - 0.1) / 2), 0.012)
            keil('Formteil', (0.34, 0.06), (0.34, 0.06), 0.5, (0, 0.02, -sockel + 0.0), fase=0.01)
            for s in (-1, 1):
                quader('Metall', (0.03, 0.62, 0.025), (s * 0.19, 0.02, -sockel - 0.02), 0.004)
                for k in range(7): zyl('Metall blank', 0.004, 0.004, (s * 0.19, -0.24 + k * 0.085, -sockel - 0.006), 'Z', 6)
            stab('Warngelb', (0.2, 0.12, -0.07), (0.24, 0.3, -0.05), 0.014, 0.014, 0.004); stab('Metall', (0.16, 0.1, -0.08), (0.2, 0.12, -0.07), 0.012, 0.012, 0.003)

def platten(m, a, b, c, d, nu, nv, dicke=0.012, fuge=0.004, fase=0.003, hub=0.0, abwechselnd=None, niete=False):
    """Fläche a→b (unten, entlang u) und d←c (oben) in nu × nv Platten mit Fugen. Platten ragen um „dicke“ zur Normalen (rechte Hand: (b−a) × (d−a))."""
    a, b, c, d = Vector(a), Vector(b), Vector(c), Vector(d)
    def P(u, v): return (a * (1 - u) + b * u) * (1 - v) + (d * (1 - u) + c * u) * v
    for i in range(nu):
        for k in range(nv):
            p00, p10, p11, p01 = P(i / nu, k / nv), P((i + 1) / nu, k / nv), P((i + 1) / nu, (k + 1) / nv), P(i / nu, (k + 1) / nv)
            mid = (p00 + p10 + p11 + p01) / 4; ex = ((p10 - p00) + (p11 - p01)) / 2; ez = ((p01 - p00) + (p11 - p10)) / 2
            bx, bz = ex.length - fuge, ez.length - fuge
            if bx < 0.01 or bz < 0.01: continue
            xh = ex.normalized(); n = xh.cross(ez).normalized(); zh = n.cross(xh)
            M = Matrix((( xh.x, -n.x, zh.x, mid.x), (xh.y, -n.y, zh.y, mid.y), (xh.z, -n.z, zh.z, mid.z), (0, 0, 0, 1)))      # lokale −Y = Normale
            mm = m if not abwechselnd or (i + k) % 2 == 0 else abwechselnd
            with Platz(m=M):
                quader(mm, (bx, dicke, bz), (0, dicke / 2 - (hub if (i * 3 + k) % 4 == 0 else 0), 0), fase)
                if niete:
                    for sx in (-1, 1):
                        for sz in (-1, 1): schraube((sx * (bx / 2 - 0.018), -hub * 0, sz * (bz / 2 - 0.018)), 0.0035)

def warnkreis(ort, r=0.022, rx=0.0, rz=0.0):
    """runde Warnmarke gelb/schwarz (vier Sektoren), Fläche zum Piloten"""
    with Platz(ort, rx, 0, rz):
        zyl('Warngelb', r, 0.0012, (0, 0, 0), 'Y', 20)
        for k in range(2):
            bm = bmesh.new(); pts = [(0, -0.0009, 0)] + [(r * 0.86 * math.cos(k * PI + j * PI / 12), -0.0009, r * 0.86 * math.sin(k * PI + j * PI / 12)) for j in range(7)]
            vs = [bm.verts.new(p) for p in pts]; f = bm.faces.new(vs); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            if f.normal.y > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
            _ab(bm, 'Schrift dunkel')

def warndreieck(ort, g=0.03, rx=0.0, rz=0.0, m='Warnrot'):
    with Platz(ort, rx, 0, rz):
        prisma(m, [(-g / 2, -g * 0.29), (g / 2, -g * 0.29), (0, g * 0.58)], 0.0012, fase=0, achse='Y')
        prisma('Schrift dunkel', [(-g * 0.3, -g * 0.17), (g * 0.3, -g * 0.17), (0, g * 0.34)], 0.0016, fase=0, achse='Y')

def schild(text, ort, hoehe=0.008, rx=0.0, rz=0.0, m='Schrift', platte=None, breite=None):
    """Beschriftung, Fläche zum Piloten; platte: Material einer Unterlage (z. B. „Warngelb“ mit dunkler Schrift)"""
    with Platz(ort, rx, 0, rz):
        if platte:
            bw = breite or (len(text) * hoehe * 0.66 + 0.012); quader(platte, (bw, 0.0012, hoehe * 1.9), (0, 0, 0), 0.0003); schrift(text, hoehe, (0, -0.0009, 0), 'Schrift dunkel' if platte in ('Warngelb', 'Schrift') else m)
        else: schrift(text, hoehe, (0, -0.0006, 0), m)

def lichtleiste(m, p0, p1, b=0.008, tief=0.006):
    """Lichtleiste mit dunkler Fassung zwischen zwei Punkten"""
    stab('Formteil', p0, p1, b + 0.008, tief + 0.004, 0.002); p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized()
    stab(m, p0 + d * 0.006, p1 - d * 0.006, b, tief + 0.0065, 0)

def kabel(m, pts, r=0.006, schellen=True):
    rohr(m, pts, r, 8, rund=0.05)
    if schellen:
        for p in pts[1:-1]: kugel('Metall', r * 1.5, p, 8)

def lueftung(ort, r=0.03, rx=0.0, rz=0.0):
    """runde Lüftungsdüse, Öffnung zum Piloten"""
    with Platz(ort, rx, 0, rz):
        zyl('Formteil hell', r, 0.014, (0, 0.0, 0), 'Y', 24, 0.004); zyl('Schirmglas', r * 0.78, 0.004, (0, -0.006, 0), 'Y', 20)
        for k in range(5): quader('Metall', (r * 1.4 - abs(k - 2) * 0.01, 0.006, 0.0025), (0, -0.009, (k - 2) * r * 0.3), 0.0006, rx=25)
        zyl('Metall', 0.006, 0.006, (0, -0.012, 0), 'Y', 8)

def griffleiste(p0, p1, r=0.014, n=(0, -1, 0)):
    """Haltegriff: Rohr mit zwei Füßen"""
    p0, p1 = Vector(p0), Vector(p1); d = (p1 - p0).normalized(); n = Vector(n)
    rohr('Metall', [p0, p0 + n * 0.045, p1 + n * 0.045, p1], r * 0.8, 10, rund=0.03)
    rohr('Gummi', [p0 + n * 0.045 + d * 0.05, p1 + n * 0.045 - d * 0.05], r, 12)

def armkonsole(s=1, y0=-0.42, y1=0.6, innen=0.25, aussen=0.56, oben=-0.5, boden=-1.08, schirm='Antrieb', hebel=False, ks=0.34, beweglich=False):
    """Seitenkonsole neben dem Sitz (s: +1 rechts, −1 links): Formteil-Körper mit Armauflage, Steuerknüppel (bei y = ks), Tastenblöcken, kleiner Anzeige und Lichtkante.
    Liefert den Griffpunkt des Knüppels (Koordinaten des umgebenden Rahmens)."""
    laenge = y1 - y0; xi, xa = s * innen, s * aussen; xm = (xi + xa) / 2; b = aussen - innen; xk = xm - s * 0.03
    # Körper: Querschnitt mit schräger Innenflanke
    q = [(-b / 2, boden - oben), (b / 2, boden - oben), (b / 2, -0.03), (b / 2 - 0.035, 0.0), (-b / 2 + 0.03, 0.0), (-b / 2, -0.05)]
    if s < 0: q = [(-x, z) for x, z in reversed(q)]
    prisma('Formteil', q, laenge, (xm, (y0 + y1) / 2, oben), fase=0.012, achse='Y')
    # Deckplatten in drei Feldern
    for ya, yb in ((y0 + 0.02, ks - 0.13), (ks - 0.12, ks + 0.11), (ks + 0.12, y1 - 0.02)):
        quader('Formteil hell', (b - 0.085, yb - ya, 0.008), (xm - s * 0.002, (ya + yb) / 2, oben + 0.004), 0.003)
    # Armauflage
    quader('Gummi', (0.105, ks - 0.2 - y0, 0.034), (xk, (y0 + 0.05 + ks - 0.15) / 2, oben + 0.025), 0.014, 2)
    quader('Metall', (0.125, 0.04, 0.012), (xk, y0 + 0.045, oben + 0.012), 0.004)
    # Knüppel oder Schubhebel
    if hebel: schubhebel((xk, ks, oben + 0.008), s); g = welt((xk, ks + 0.01, oben + 0.1))
    else: g = knueppel((xk, ks, oben + 0.008), s, marke=(1 if s < 0 else 2) if beweglich else 0)
    # Tastenblock außen neben dem Knüppel, liegend
    with Platz((xk + s * 0.115, ks - 0.01, oben + 0.008), 90, 0, 0): tastenfeld(2, 4, 0.05, 0.11, (0, 0, 0), licht=0.4)
    # vorn: flaches Pult mit kleiner Anzeige, zum Piloten geneigt
    with Platz((xm, y1 - 0.075, oben + 0.008)):
        prisma('Formteil', [(-0.07, 0.0), (0.065, 0.0), (0.065, 0.062), (-0.07, 0.012)], b - 0.07, (0, 0.0, 0), fase=0.008, achse='X')
        anzeige(schirm, 0.15, 0.085, (0, -0.006, 0.041), rx=-69.7, tief=0.012, haube=0.0, tasten=0, schrauben=False)
    # Schalterreihe mit Schutzbügeln zwischen Knüppel und Pult
    ysch = ks + 0.155
    for k in range(4):
        x = xk - s * 0.05 + s * k * 0.035
        zyl('Metall', 0.006, 0.006, (x, ysch, oben + 0.011), 'Z', 8); stab('Metall blank', (x, ysch, oben + 0.012), (x, ysch + (0.012 if k % 2 else -0.012), oben + 0.032), 0.004, 0.004, 0.001)
    for xx in (xk - s * 0.072, xk + s * 0.077): stab('Metall', (xx, ysch, oben + 0.008), (xx, ysch, oben + 0.03), 0.003, 0.03, 0.001)
    # Lichtkante innen oben und Akzentstreifen außen
    lichtleiste('Licht Kalt', (xi + s * 0.012, y0 + 0.06, oben - 0.045), (xi + s * 0.012, y1 - 0.08, oben - 0.045), 0.005, 0.004)
    stab('Akzent', (xa - s * 0.004, y0 + 0.08, oben - 0.06), (xa - s * 0.004, y1 - 0.3, oben - 0.06), 0.004, 0.014, 0.001)
    # Flanke innen: Wartungsklappe, Griffmulde, Warnmarke
    with Platz((xi - s * 0.001, (y0 + y1) / 2, (oben + boden) / 2 - 0.02), 0, 0, -s * 90):
        quader('Formteil hell', (laenge * 0.5, 0.006, 0.26), (0, 0, 0), 0.004)
        for sx in (-1, 1):
            for sz in (-1, 1): schraube((sx * (laenge * 0.25 - 0.014), -0.003, sz * 0.115))
        quader('Schirmglas', (0.1, 0.004, 0.02), (0, -0.003, 0.085), 0.003)
        warnkreis((laenge * 0.19, -0.0035, -0.08), 0.016)
    return g

def pedale(ort=(0, 0, 0), abstand=0.13):
    for s in (-1, 1):
        with Platz((ort[0] + s * abstand, ort[1], ort[2]), -28, 0, 0):
            quader('Metall', (0.1, 0.012, 0.16), (0, 0, 0.08), 0.006)
            for k in range(5): quader('Gummi', (0.086, 0.006, 0.012), (0, -0.008, 0.025 + k * 0.03), 0.002)
            stab('Metall', (0, 0.01, 0.02), (0, 0.16, -0.04), 0.02, 0.02, 0.004)

def pultmodul(boden, sockel=True, fluegel=(True, True), aussen=('Antrieb', 'Fracht'), knie=('KLIMA', 'ENERGIE')):
    """Pult eines Pilotenplatzes (Rahmen: Auge des Piloten im Ursprung): Formteil-Körper mit Fasen, drei Anzeigen in Gehäusen (Systeme, Lage, Ziel),
    Kursband, Leiste mit Reglern, Kniefelder. fluegel: (links, rechts) zum Piloten gedrehte Seitenteile mit je einer Anzeige (aussen).
    sockel: Mittelkonsole zwischen den Knien bis zum Boden."""
    Q = [(0.0, -0.62), (0.3, -0.62), (0.3, -0.02), (0.14, 0.0), (0.03, -0.1), (0.0, -0.34)]
    prisma('Formteil', Q, 0.98, (0, 0.775, -0.19), fase=0.014, achse='X')      # hinter den Anzeigen: ragte sonst an deren Außenecken hervor
    prisma('Gummi', [(-0.5, 0.0), (0.5, 0.0), (0.47, 0.04), (-0.47, 0.04)], 0.2, (0, 0.8, -0.185), fase=0.012, seg=2, achse='Y')      # Blendschutzlippe
    for i, s in enumerate((-1, 1)):
        if not fluegel[i]: continue
        with Platz((s * 0.52, 0.78, -0.19), 0, 0, -s * 26):
            prisma('Formteil', Q, 0.56, (s * 0.27, -0.02, 0), fase=0.014, achse='X')
            prisma('Gummi', [(-0.27, 0.0), (0.27, 0.0), (0.25, 0.04), (-0.25, 0.04)], 0.2, (s * 0.27, 0.06, 0.005), fase=0.012, seg=2, achse='Y')
        if aussen[i]: anzeige(aussen[i], 0.24, 0.19, (s * 0.8, 0.47, -0.36), rx=-16, rz=s * 44, tief=0.05, haube=0.0, tasten=4)
    anzeige('Lage', 0.34, 0.2, (0, 0.735, -0.35), rx=-16, tief=0.06, haube=0.028, tasten=6)
    anzeige('Systeme', 0.27, 0.19, (-0.37, 0.715, -0.355), rx=-16, rz=-13, tief=0.06, tasten=5)
    anzeige('Ziel', 0.27, 0.19, (0.37, 0.715, -0.355), rx=-16, rz=13, tief=0.06, tasten=5)
    anzeige('Band', 0.3, 0.075, (0, 0.77, -0.205), rx=-10, tief=0.03, haube=0.0, tasten=0, schrauben=False)
    # Leiste unter den Anzeigen: Drehregler, Tasten, Schalter mit Schutzkappe
    with Platz((0, 0.69, -0.53), -32, 0, 0):
        quader('Formteil hell', (0.9, 0.012, 0.07), (0, 0, 0), 0.004)
        for k in range(3):
            for s in (-1, 1):
                x = s * (0.2 + k * 0.075); zyl('Metall', 0.016, 0.012, (x, -0.012, 0.0), 'Y', 16, 0.003); zyl('Gummi', 0.0125, 0.012, (x, -0.022, 0.0), 'Y', 14, 0.002); quader('Schrift', (0.002, 0.002, 0.01), (x, -0.0285, 0.006), 0)
        tastenfeld(6, 2, 0.16, 0.045, (0, -0.006, 0), 0.5)
        for s in (-1, 1):
            quader('Warnrot', (0.022, 0.016, 0.03), (s * 0.41, -0.014, 0.0), 0.004); zyl('Metall', 0.004, 0.026, (s * 0.41, -0.008, 0.018), 'X', 8)
            schild(('NOTAUS', 'ABWURF')[s > 0], (s * 0.41, -0.0065, -0.026), 0.006)
        for i, t in enumerate(('FUNK', 'NAV', 'SENSOR')): schild(t, (-0.2 - i * 0.075, -0.0065, -0.027), 0.0055)
        for i, t in enumerate(('LICHT', 'HEIZ', 'LUFT')): schild(t, (0.2 + i * 0.075, -0.0065, -0.027), 0.0055)
    # Kniefelder
    for i, s in enumerate((-1, 1)):
        with Platz((s * 0.33, 0.7, -0.66), -18, 0, -s * 8):
            quader('Formteil hell', (0.32, 0.012, 0.16), (0, 0, 0), 0.004)
            lueftung((s * 0.09, -0.006, 0.02), 0.034); tastenfeld(3, 3, 0.1, 0.085, (-s * 0.08, -0.006, 0.015), 0.35)
            for sx in (-1, 1):
                for sz in (-1, 1): schraube((sx * 0.15, -0.006, sz * 0.07))
            schild(knie[i], (-s * 0.08, -0.0065, -0.045), 0.006)
    if sockel:      # Mittelkonsole zwischen den Knien, bis zum Boden
        prisma('Formteil', [(-0.11, 0.0), (0.11, 0.0), (0.09, 0.42), (-0.09, 0.42)], 0.2, (0, 0.74, boden), fase=0.012, achse='Y')
        with Platz((0, 0.635, -0.76), -20, 0, 0):
            quader('Formteil hell', (0.16, 0.012, 0.24), (0, 0, 0), 0.004)
            anzeige('Funk', 0.12, 0.05, (0, -0.01, 0.07), rx=0, tief=0.012, haube=0.0, tasten=0, schrauben=False)
            tastenfeld(4, 3, 0.12, 0.08, (0, -0.006, -0.01), 0.4)
            zyl('Metall', 0.018, 0.014, (0, -0.012, -0.09), 'Y', 18, 0.003); zyl('Gummi', 0.014, 0.014, (0, -0.024, -0.09), 'Y', 14, 0.002)
