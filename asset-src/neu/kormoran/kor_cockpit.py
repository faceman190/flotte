# Cockpit des Kormoran (von kor_innen.py geladen): Instrumentenbrett mit Bildschirmen und HUD, zwei Pilotensitze mit Steuerknüppel,
# Schubhebel und Pedalen, Mittel-, Seiten- und Deckenkonsole, verkleidete Wanne mit Lichtband, Bodenluke zum Leiterschacht, Klappsitze.
# Boden 4,5 m, Augenhöhe der Piloten etwa 5,75 m. Die Wanne ist halb so breit wie die Kanzel unten (tw), vorn schmal.
FL = 4.5
M.update(
    mfd=stripes('Anzeige Petrol', (0.05, 0.42, 0.4), (0.0, 0.03, 0.035), 160, emit=1.4, direction='Z', duty=0.9),
    mfd2=stripes('Anzeige Bernstein', (0.42, 0.24, 0.05), (0.04, 0.02, 0.0), 160, emit=1.3, direction='Z', duty=0.9),
    taste=mk('Taste', (0.03, 0.03, 0.034), 0.2, 0.5, var=0.05, grime=False),
    hud=mk('HUD-Glas', (0.88, 0.96, 0.92), 0.0, 0.02, var=0, rvar=0, emit=(0.12, 0.8, 0.35), es=0.03, grime=False, trans=1.0),
    gurt=mk('Gurt', (0.07, 0.062, 0.035), 0.0, 0.8, var=0.1, scale=8.0, bump=0.3, bscale=300),
    sitzrahmen=mk('Sitzrahmen', (0.05, 0.052, 0.056), 0.7, 0.4, var=0.08, wear=0.6),
    verkleidung=mk('Cockpitverkleidung', (0.075, 0.078, 0.084), 0.2, 0.55, var=0.06, scale=3.0, bump=0.25, bscale=220),
    ambient=mk('Ambientlicht', (1, 0.8, 0.5), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.62, 0.28), es=3, grime=False),
)
def tw(x): return max(0.3, canopy_half(x) - 0.12)      # halbe Breite der Wanne
def panel_screen(name, x, y, z, w, h, tilt, m='mfd', keys=True):
    # Bildschirm mit Rahmen und Tastenreihen; zeigt nach −X (zum Piloten), um tilt nach hinten geneigt
    with Part(name, T(x, y, z) @ RY(math.radians(tilt)), C_ROOM):
        box('Rahmen', 0.03, w + 0.08, h + 0.08, 0, 0, 0, M['dunkel'], 0.006)
        box('Anzeige', 0.004, w, h, -0.017, 0, 0, M[m], 0)
        if m == 'mfd':      # Radarbild: zwei Ringe, Fadenkreuz, ein Ziel
            for r in (h * 0.36, h * 0.2): ring('Radarring', r, 0.0022, (-0.0205, 0, -0.01), (1, 0, 0), M['e_teal'], 32)
            box('Radarachse', 0.002, h * 0.8, 0.003, -0.0205, 0, -0.01, M['e_teal'], 0); box('Radarachse', 0.002, 0.003, h * 0.8, -0.0205, 0, -0.01, M['e_teal'], 0)
            box('Radarziel', 0.002, 0.014, 0.014, -0.021, w * 0.18, h * 0.12, M['e_amber'], 0)
        else:      # Zustandsanzeige: Balken unterschiedlicher Länge
            for k, f in enumerate((0.8, 0.55, 0.9, 0.35, 0.65)):
                box('Anzeigebalken', 0.002, w * 0.8 * f, 0.014, -0.0205, -w * 0.4 + w * 0.4 * f, h * 0.32 - k * h * 0.15, M['e_amber'], 0)
        if keys:
            for k in range(5):
                for sg in (-1, 1): box('Taste', 0.008, 0.022, 0.018, -0.018, sg * (w / 2 + 0.024), -h / 2 + (k + 0.5) * h / 5, M['taste'], 0.002)
            for k in range(6): box('Taste', 0.008, 0.03, 0.016, -0.018, -w / 2 + (k + 0.5) * w / 6, -h / 2 - 0.026, M['taste'], 0.002)
def switch_grid(name, x0, y0, z, nx, ny, dx, dy, m='taste', led=True):      # Schalterfeld auf einer waagrechten Fläche
    for i in range(nx):
        for j in range(ny):
            box(name, 0.022, 0.022, 0.012, x0 + i * dx, y0 + j * dy, z + 0.006, M[m], 0.002)
            if led and (i + j) % 3 == 0: cyl('LED', 0.005, 0.004, x0 + i * dx + 0.016, y0 + j * dy, z + 0.003, M['e_green' if (i * 7 + j) % 4 else 'e_amber'], 'Z', n=6, bev=0)
def dashboard():
    w = tw(15.75) - 0.02
    prism('Instrumentenbrett', [(15.0, FL), (15.75, FL), (15.75, 5.1), (14.85, 5.3), (14.55, 4.85), (14.62, 4.72), (15.0, 4.72)], -w, w, M['verkleidung'], 'Y', 0.02)
    box('Blendschutz', 0.08, 2 * w, 0.04, 14.87, 0, 5.31, M['dunkel'], 0.01)
    # Bildschirme auf der schrägen Fläche (33° gegen die Senkrechte): je Pilot zwei, in der Mitte die Navigationsanzeige
    cx, cz = 14.683, 5.086
    for s in (1, -1):
        for k, dy in enumerate((-0.21, 0.21)):
            panel_screen('Mehrzweckanzeige', cx, s * 0.85 + dy, cz, 0.34, 0.3, 33.7, 'mfd' if k == (0 if s > 0 else 1) else 'mfd2')
        # HUD: Projektor auf dem Blendschutz, zwei Streben, geneigte Glasscheibe mit Zielring
        y = s * 0.85
        box('HUD-Projektor', 0.16, 0.24, 0.07, 14.98, y, 5.27, M['dunkel'], 0.01)
        for sg in (-1, 1): cyl('HUD-Strebe', 0.008, 0.26, 15.02, y + sg * 0.15, 5.42, M['sitzrahmen'], 'Z', n=6)
        with Part('HUD', T(15.02, y, 5.56) @ RY(math.radians(22)), C_ROOM):
            box('HUD-Scheibe', 0.008, 0.32, 0.25, 0, 0, 0, M['hud'], 0)
            ring('HUD-Zielring', 0.05, 0.0025, (-0.006, 0, 0.0), (1, 0, 0), M['e_green'], 24)
            for a in (0, 1): box('HUD-Strich', 0.002, 0.07 if a else 0.004, 0.004 if a else 0.07, -0.006, 0, 0, M['e_green'], 0)
    panel_screen('Navigationsanzeige', cx, 0.0, cz, 0.46, 0.32, 33.7, 'mfd2')
    for s in (1, -1):      # Pedale im Fußraum unter dem Brett
        for d in (-0.14, 0.14):
            box('Pedal', 0.2, 0.09, 0.02, 14.66, s * 0.85 + d, FL + 0.16, M['sitzrahmen'], 0.004, rot=(0, math.radians(-55), 0))
        box('Fussstuetze', 0.06, 0.5, 0.06, 14.86, s * 0.85, FL + 0.08, M['dunkel'], 0.008)
        point('Fussraumlicht', (14.8, s * 0.85, FL + 0.3), 3, (1.0, 0.62, 0.3), 0.05)
def pilot_seat(x, y):
    for sg in (-1, 1): box('Sitzschiene', 0.9, 0.05, 0.04, x, y + sg * 0.15, FL + 0.02, M['sitzrahmen'], 0.004)
    box('Sitzsockel', 0.36, 0.34, 0.32, x, y, FL + 0.18, M['sitzrahmen'], 0.01)
    box('Sitzwanne', 0.6, 0.6, 0.08, x, y, FL + 0.38, M['sitzrahmen'], 0.01)
    box('Sitzkissen', 0.54, 0.48, 0.1, x + 0.02, y, FL + 0.47, M['sitz'], 0.04)
    for sg in (-1, 1): box('Seitenwange', 0.5, 0.08, 0.14, x + 0.02, y + sg * 0.27, FL + 0.5, M['sitz'], 0.03)
    box('Beckengurt', 0.06, 0.46, 0.012, x + 0.04, y, FL + 0.528, M['gurt'], 0.002)
    box('Gurtschloss', 0.08, 0.08, 0.02, x + 0.06, y, FL + 0.535, M['steel'], 0.004)
    with Part('Rueckenlehne', T(x - 0.3, y, FL + 0.44) @ RY(math.radians(-14)), C_ROOM):
        box('Lehnenrahmen', 0.08, 0.6, 0.98, -0.04, 0, 0.49, M['sitzrahmen'], 0.01)
        box('Lehnenpolster', 0.08, 0.46, 0.82, 0.03, 0, 0.47, M['sitz'], 0.03)
        for sg in (-1, 1):
            box('Lehnenwange', 0.11, 0.08, 0.7, 0.04, sg * 0.26, 0.45, M['sitz'], 0.03)
            box('Schultergurt', 0.012, 0.06, 0.76, 0.076, sg * 0.11, 0.5, M['gurt'], 0.002)
            box('Kopfwange', 0.12, 0.05, 0.22, 0.03, sg * 0.2, 1.06, M['sitz'], 0.02)
        box('Kopfstuetze', 0.1, 0.34, 0.24, 0.02, 0, 1.06, M['sitz'], 0.03)
    for sg in (-1, 1):
        box('Armlehne', 0.42, 0.08, 0.06, x + 0.04, y + sg * 0.35, FL + 0.7, M['sitzrahmen'], 0.01)
        box('Armlehnenpolster', 0.3, 0.07, 0.025, x + 0.0, y + sg * 0.35, FL + 0.74, M['sitz'], 0.01)
        box('Armstuetze', 0.05, 0.05, 0.3, x - 0.12, y + sg * 0.35, FL + 0.54, M['sitzrahmen'], 0.004)
    # rechts der Steuerknüppel, links der Schubhebel (in Blickrichtung +X liegt rechts bei −Y)
    yr, yl = y - 0.35, y + 0.35
    cyl('Knueppelmanschette', 0.045, 0.04, x + 0.22, yr, FL + 0.75, M['rubber'], 'Z', n=14)
    cyl('Knueppel', 0.022, 0.16, x + 0.22, yr, FL + 0.84, M['dunkel'], 'Z', n=12)
    box('Knueppelkopf', 0.07, 0.05, 0.06, x + 0.23, yr, FL + 0.94, M['dunkel'], 0.012)
    box('Abzug', 0.015, 0.02, 0.03, x + 0.27, yr, FL + 0.9, M['red'], 0.003)
    cyl('Knueppeltaste', 0.008, 0.01, x + 0.23, yr + 0.01, FL + 0.975, M['ochre'], 'Z', n=8, bev=0)
    box('Schubschlitz', 0.2, 0.02, 0.004, x + 0.2, yl, FL + 0.732, M['fuge'], 0)
    box('Schubhebel', 0.04, 0.035, 0.12, x + 0.24, yl, FL + 0.79, M['dunkel'], 0.006, rot=(0, math.radians(15), 0))
    box('Schubgriff', 0.07, 0.06, 0.05, x + 0.26, yl, FL + 0.86, M['dunkel'], 0.012)
def consoles():
    # Mittelkonsole zwischen den Sitzen: Schalterfelder, zwei Hebel, kleine Anzeige
    box('Mittelkonsole', 1.7, 0.5, 0.68, 13.55, 0, FL + 0.34, M['verkleidung'], 0.015)
    box('Konsolendeckel', 1.66, 0.46, 0.02, 13.55, 0, FL + 0.69, M['dunkel'], 0.004)
    switch_grid('Schalter', 12.82, -0.17, FL + 0.70, 6, 6, 0.065, 0.068)
    for sg in (-1, 1):
        box('Konsolenhebel', 0.04, 0.05, 0.16, 13.42, sg * 0.08, FL + 0.78, M['dunkel'], 0.006, rot=(0, math.radians(10), 0))
        box('Hebelknauf', 0.06, 0.07, 0.04, 13.43, sg * 0.08, FL + 0.87, M['ochre'], 0.01)
    box('Konsolenanzeige', 0.28, 0.36, 0.01, 14.1, 0, FL + 0.71, M['mfd'], 0)
    # Seitenkonsolen an der Wannenwand: zwei Stücke je Seite, folgen der Verjüngung
    for s in (1, -1):
        for xa, xb in ((11.0, 12.3), (12.3, 13.6)):
            yc = tw(xb) - 0.22; xm = (xa + xb) / 2
            box('Seitenkonsole', xb - xa - 0.02, 0.36, 0.72, xm, s * yc, FL + 0.36, M['verkleidung'], 0.015)
            box('Seitendeckel', xb - xa - 0.06, 0.32, 0.02, xm, s * yc, FL + 0.73, M['dunkel'], 0.004)
            switch_grid('Schalter', xa + 0.12, s * yc - 0.1, FL + 0.74, int((xb - xa) / 0.09) - 4, 3, 0.07, 0.1)
            box('Seitenanzeige', 0.3, 0.22, 0.01, xb - 0.24, s * yc, FL + 0.745, M['mfd' if xa > 12 else 'mfd2'], 0)
    # Deckenkonsole unter dem Mittelholm der Kanzel
    box('Deckenkonsole', 1.7, 0.6, 0.08, 12.45, 0, 6.2, M['verkleidung'], 0.01)
    for sg in (-1, 1): box('Deckenhalter', 0.06, 0.04, 0.16, 12.45 + sg * 0.7, 0, 6.3, M['sitzrahmen'], 0.004)
    for i in range(12):
        for j in range(3):
            cyl('Kippschalter', 0.006, 0.04, 11.75 + i * 0.12, -0.15 + j * 0.15, 6.14, M['steel'], 'Z', n=6, bev=0)
            if i % 3 == 0: box('Schalterlicht', 0.03, 0.01, 0.004, 11.75 + i * 0.12, -0.15 + j * 0.15 + 0.05, 6.158, M['e_amber'], 0)
def tub_lining():
    # Verkleidung der Wannenwände (dunkle Platten, eingerückt) und ein warmes Lichtband an der Oberkante
    xs = (17.0, 15.0, 13.0, 11.0, 9.95)
    for s in (1, -1):
        bm = bmesh.new(); rows = []
        for x in xs:
            w = tw(x) - 0.025; zt = surf(x, tw(x), 1)[0].z - 0.08
            rows.append((bm.verts.new((x, s * w, FL + 0.1)), bm.verts.new((x, s * w, zt))))
        for (a0, a1), (b0, b1) in zip(rows, rows[1:]): bm.faces.new((a0, b0, b1, a1))
        me = bpy.data.meshes.new('Wannenverkleidung'); bm.to_mesh(me); bm.free(); me.materials.append(M['verkleidung'])
        link(bpy.data.objects.new('Wannenverkleidung', me))
        pipe('Lichtband', [Vector((x, s * (tw(x) - 0.04), surf(x, tw(x), 1)[0].z - 0.12)) for x in xs], 0.012, M['ambient'])
        for x in (11.6, 13.4): box('Verkleidungsfuge', 0.012, 0.02, 0.9, x, s * (tw(x) - 0.03), FL + 0.55, M['fuge'], 0)
    # Bodenplatten
    for xa, xb in ((9.95, 11.0), (11.0, 12.0), (12.0, 13.0), (13.0, 14.0), (14.0, 15.0)):
        w = min(tw(xa), tw(xb)) - 0.04
        box('Cockpitboden', xb - xa - 0.01, 2 * w, 0.02, (xa + xb) / 2, 0, FL + 0.01, M['iboden'], 0.003)
def rear_items():
    # Bodenluke zum Leiterschacht, Klappsitze an der Rückwand
    x0, x1, hw = HATCH
    box('Bodenluke', x1 - x0, 2 * hw, 0.012, (x0 + x1) / 2, 0, FL + 0.026, M['iwand2'], 0.003)
    for sg in (-1, 1):
        box('Lukenrand', x1 - x0 + 0.1, 0.05, 0.006, (x0 + x1) / 2, sg * (hw + 0.025), FL + 0.024, M['warn2'], 0)
        box('Lukenrand', 0.05, 2 * hw, 0.006, (x0 + x1) / 2 + sg * ((x1 - x0) / 2 + 0.025), 0, FL + 0.024, M['warn2'], 0)
    box('Lukengriff', 0.05, 0.24, 0.015, x1 - 0.12, 0, FL + 0.04, M['mittel'], 0.004)
    for s in (1, -1):
        y = s * 1.45
        box('Klappsitz', 0.4, 0.46, 0.05, 10.12, y, FL + 0.48, M['sitz'], 0.02)
        box('Klappsitzlehne', 0.05, 0.46, 0.6, 9.98, y, FL + 0.85, M['sitz'], 0.02)
        for sg in (-1, 1): box('Klappsitzgurt', 0.012, 0.05, 0.55, 10.015, y + sg * 0.12, FL + 0.85, M['gurt'], 0.002)
        box('Klappsitzhalter', 0.4, 0.04, 0.04, 10.12, y + 0.21, FL + 0.44, M['sitzrahmen'], 0.004)
def cockpit():
    CUR[0] = C_ROOM
    tub_lining(); dashboard(); consoles(); rear_items()
    for s in (1, -1): pilot_seat(13.0, s * 0.85)
    area('Cockpitflaeche', (12.4, 0, 6.12), (0, 0, 0), 1.4, 0.7, 45, (0.85, 0.92, 1.0))
    point('Anzeigenglanz', (14.3, 0, 5.15), 6, (0.4, 0.85, 0.8), 0.2)
