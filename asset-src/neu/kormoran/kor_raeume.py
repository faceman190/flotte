# Kabinen und Laderaum des Kormoran (von kor_innen.py geladen):
#   Kabine 1 (Backbord hinten)  Kapitänskabine: Koje, Schreibtisch, Sternenfenster (Bildschirm), Teppich, Regal mit Büchern
#   Kabine 2 (Backbord vorn)    Mannschaft: Etagenkoje mit Leiter, zwei Spinde, Klapptisch, Seesack
#   Kabine 3 (Steuerbord hinten) Sanität: Behandlungsliege, OP-Leuchte, Monitor am Arm, Medizinschrank, Waschbecken, Rotes Kreuz
#   Laderaum: Wandplatten, Frachtnetze, Zurrösen, Bodenmarkierungen, Laufkran, Kistenstapel mit Gurten, Container, Fässer,
#             Spinde, Rampen-Bedienpult, Warnleuchte über der Rampe
def star_window_mat():
    m = bpy.data.materials.new('Sternenfenster'); m.use_nodes = True; N = m.node_tree.nodes; K = m.node_tree.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); K.new(em.outputs[0], out.inputs[0])
    em.inputs['Color'].default_value = (0.75, 0.82, 1.0, 1)
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 70; K.new(tc.outputs['Object'], vo.inputs['Vector'])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.05
    mr.inputs['To Min'].default_value = 5.0; mr.inputs['To Max'].default_value = 0.0; K.new(vo.outputs['Distance'], mr.inputs['Value'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; K.new(tc.outputs['Object'], nz.inputs['Vector'])
    nm = N.new('ShaderNodeMath'); nm.operation = 'MULTIPLY'; nm.inputs[1].default_value = 0.08; K.new(nz.outputs[0], nm.inputs[0])
    ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; K.new(mr.outputs[0], ad.inputs[0]); K.new(nm.outputs[0], ad.inputs[1])
    K.new(ad.outputs[0], em.inputs['Strength'])
    return m
M.update(
    sterne=star_window_mat(),
    teppich=mk('Teppich', (0.06, 0.03, 0.025), 0.0, 0.9, var=0.12, scale=5.0, bump=0.5, bscale=400),
    weiss=mk('Liegenbezug', (0.55, 0.56, 0.56), 0.0, 0.6, var=0.06, scale=4.0, bump=0.3, bscale=250),
    netz=mk('Frachtnetz', (0.08, 0.075, 0.05), 0.0, 0.8, var=0.1),
    container=mk('Container', (0.16, 0.06, 0.02), 0.3, 0.5, var=0.12, scale=2.0, streak=0.3, bump=0.2, wear=0.9),
)
for _n, _c in (('buch1', (0.25, 0.05, 0.04)), ('buch2', (0.04, 0.12, 0.2)), ('buch3', (0.2, 0.17, 0.1)), ('buch4', (0.05, 0.14, 0.07))):
    M[_n] = mk('Buchruecken ' + _n[-1], _c, 0.0, 0.6, var=0.15, scale=8.0)

# ---------- Kabinen ----------
def bunk(bx0, bx1, by, z, s, name='Koje'):      # Liegefläche mit Matratze, Decke, Kissen; z = Unterkante
    bxc = (bx0 + bx1) / 2
    box(name + ' Rahmen', bx1 - bx0, 0.92, 0.06, bxc, by, z + 0.03, M['sitzrahmen'], 0.01)
    box('Matratze', bx1 - bx0 - 0.06, 0.86, 0.15, bxc, by, z + 0.135, M['stoff'], 0.04)
    box('Bettdecke', 1.3, 0.88, 0.05, bxc + 0.3, by, z + 0.235, M['polster'], 0.03)
    box('Kissen', 0.36, 0.6, 0.12, bx0 + 0.28, by, z + 0.27, M['stoff'], 0.05)
def captain_extras(x0, x1, s):
    yo, yi = s * 5.2, s * 1.0; yc = (yo + yi) / 2
    # Sternenfenster an der hinteren Querwand (Bildschirm mit Rahmen und Blende)
    box('Fensterrahmen', 0.06, 1.16, 0.74, x0 + 0.08, yc - s * 0.2, DECK + 1.5, M['irahmen'], 0.01)
    box('Sternenfenster', 0.01, 1.0, 0.6, x0 + 0.115, yc - s * 0.2, DECK + 1.5, M['sterne'], 0)
    box('Fensterblende', 0.12, 1.16, 0.05, x0 + 0.12, yc - s * 0.2, DECK + 1.86, M['irahmen'], 0.006)
    box('Teppich', 1.7, 1.2, 0.008, (x0 + x1) / 2 + 0.1, yc - s * 0.1, DECK + 0.021, M['teppich'], 0.002)
    # Regal über dem Schreibtisch mit Büchern, Kiste und Bilderrahmen
    dy = yo - s * 1.95
    box('Wandregal', 0.25, 1.1, 0.03, x1 - 0.16, dy, DECK + 1.82, M['irahmen'], 0.004)
    for k in range(9):
        h = 0.18 + 0.03 * ((k * 5) % 3)
        box('Buch', 0.16, 0.035, h, x1 - 0.16, dy - 0.45 + k * 0.045, DECK + 1.835 + h / 2, M['buch%d' % (1 + k % 4)], 0.002)
    box('Kiste', 0.2, 0.25, 0.14, x1 - 0.16, dy + 0.33, DECK + 1.905, M['iwand2'], 0.01)
    box('Bilderrahmen', 0.02, 0.18, 0.24, x1 - 0.42, dy + 0.4, DECK + 0.89, M['irahmen'], 0.004, rot=(0, math.radians(-12), 0))
    box('Tasse', 0.07, 0.07, 0.09, x1 - 0.5, dy - 0.3, DECK + 0.815, M['white'], 0.02)
    point('Fensterschein', (x0 + 0.5, yc - s * 0.2, DECK + 1.5), 4, (0.6, 0.7, 1.0), 0.3)
def crew_cabin(x0, x1, s):
    yo, yi = s * 5.2, s * 1.0; yc = (yo + yi) / 2
    ceiling('Kabinendecke', x0, x1, min(yo, yi), max(yo, yi), CEIL, [((x0 + x1) / 2, yc, 1.0, 0.4)], 45, (1.0, 0.88, 0.74))
    bx0, bx1 = x0 + 0.08, x0 + 2.18; by = yo - s * 0.5; bxc = (bx0 + bx1) / 2
    box('Kojensockel', bx1 - bx0, 0.92, 0.36, bxc, by, DECK + 0.18, M['iwand2'], 0.01)
    bunk(bx0, bx1, by, DECK + 0.36, s, 'Untere Koje'); bunk(bx0, bx1, by, DECK + 1.36, s, 'Obere Koje')
    for xx in (bx0 + 0.03, bx1 - 0.03):      # Pfosten an der offenen Seite und Absturzsicherung oben
        box('Kojenpfosten', 0.05, 0.05, 1.9, xx, by - s * 0.44, DECK + 0.95, M['sitzrahmen'], 0.006)
    box('Absturzsicherung', 1.4, 0.04, 0.14, bxc - 0.25, by - s * 0.44, DECK + 1.75, M['sitzrahmen'], 0.006)
    for k in range(4): cyl('Leitersprosse', 0.016, 0.36, bx1 + 0.04, by - s * 0.25, DECK + 0.55 + k * 0.28, M['steel'], 'Y', n=8)
    for sg in (0.07, 0.43): box('Leiterholm', 0.04, 0.03, 1.5, bx1 + 0.04, by - s * sg, DECK + 0.95, M['sitzrahmen'], 0.004)
    for k in range(2):
        yy = yo - s * (0.35 + k * 0.62)
        box('Spind', 0.6, 0.58, 2.1, x1 - 0.36, yy, DECK + 1.05, M['iwand'], 0.01)
        box('Spindgriff', 0.02, 0.16, 0.03, x1 - 0.665, yy, DECK + 1.1, M['mittel'], 0.004)
        for z in (1.75, 1.82, 1.89): box('Lueftungsschlitz', 0.005, 0.3, 0.012, x1 - 0.662, yy, DECK + z, M['fuge'], 0)
    tx, ty = x1 - 0.45, yi + s * 0.7
    box('Klapptisch', 0.7, 0.55, 0.035, tx, ty, DECK + 0.74, M['platte'], 0.006)
    box('Klapptischstuetze', 0.04, 0.4, 0.04, tx + 0.3, ty, DECK + 0.62, M['sitzrahmen'], 0.004, rot=(math.radians(35 * s), 0, 0))
    cyl('Hocker', 0.17, 0.06, tx - 0.55, ty, DECK + 0.46, M['polster'], 'Z', n=16)
    cyl('Hockersaeule', 0.03, 0.43, tx - 0.55, ty, DECK + 0.22, M['mittel'], 'Z', n=10)
    cyl('Seesack', 0.2, 0.75, x0 + 2.6, yo - s * 0.35, DECK + 0.2, M['gurt'], 'X', n=16)
    box('Wandbildschirm', 0.03, 0.7, 0.42, x0 + 0.08, yc - s * 0.6, DECK + 1.5, M['screen'], 0)
def medbay(x0, x1, s):
    yo, yi = s * 5.2, s * 1.0; yc = (yo + yi) / 2
    ceiling('Sanitaetsdecke', x0, x1, min(yo, yi), max(yo, yi), CEIL, [((x0 + x1) / 2 + 0.9, yc, 1.0, 0.4), ((x0 + x1) / 2 - 0.9, yc, 1.0, 0.4)], 60, (0.92, 0.97, 1.0))
    slab('Sanitaetsboden', x0 + 0.05, x1 - 0.05, min(yo, yi) + 0.05, max(yo, yi) - 0.05, DECK + 0.006, 'fliese', 0.012)
    # Behandlungsliege: Säule, Rahmen, Polster mit aufgestelltem Kopfteil
    lx, ly = (x0 + x1) / 2, yc - s * 0.25
    box('Liegensaeule', 0.5, 0.36, 0.55, lx, ly, DECK + 0.3, M['mittel'], 0.02)
    box('Liegenrahmen', 2.0, 0.78, 0.08, lx, ly, DECK + 0.62, M['sitzrahmen'], 0.01)
    box('Liegenpolster', 1.4, 0.72, 0.1, lx + 0.3, ly, DECK + 0.71, M['weiss'], 0.035)
    box('Kopfteil', 0.62, 0.72, 0.1, lx - 0.66, ly, DECK + 0.86, M['weiss'], 0.035, rot=(0, math.radians(-28), 0))
    for sg in (1, -1): pipe('Liegengitter', [Vector((lx - 0.2, ly + sg * 0.4, DECK + 0.66)), Vector((lx - 0.2, ly + sg * 0.4, DECK + 0.86)), Vector((lx + 0.6, ly + sg * 0.4, DECK + 0.86)), Vector((lx + 0.6, ly + sg * 0.4, DECK + 0.66))], 0.012, M['steel'], rad=0.05)
    # OP-Leuchte an der Decke mit Gelenkarm, Monitor am Arm
    pipe('Leuchtenarm', [Vector((lx, yc, CEIL - 0.02)), Vector((lx, yc, CEIL - 0.45)), Vector((lx + 0.1, ly, CEIL - 0.75))], 0.025, M['white'], rad=0.12)
    cyl('OP-Leuchte', 0.32, 0.1, lx + 0.1, ly, CEIL - 0.82, M['white'], 'Z', n=32)
    cyl('OP-Leuchte Glas', 0.27, 0.01, lx + 0.1, ly, CEIL - 0.875, M['lichtband'], 'Z', n=32)
    area('OP-Licht', (lx + 0.1, ly, CEIL - 0.9), (0, 0, 0), 0.5, 0.5, 40, (1.0, 0.98, 0.95))
    pipe('Monitorarm', [Vector((x0 + 0.06, ly + s * 0.9, DECK + 1.6)), Vector((x0 + 0.4, ly + s * 0.9, DECK + 1.6)), Vector((x0 + 0.55, ly + s * 0.6, DECK + 1.5))], 0.02, M['mittel'], rad=0.08)
    box('Monitorrahmen', 0.04, 0.5, 0.34, x0 + 0.58, ly + s * 0.55, DECK + 1.5, M['dunkel'], 0.01, rot=(0, 0, math.radians(-30 * s)))
    box('Monitorbild', 0.005, 0.44, 0.28, x0 + 0.605, ly + s * 0.54, DECK + 1.5, M['mfd'], 0, rot=(0, 0, math.radians(-30 * s)))
    # Medizinschrank mit Glastüren an der hinteren Querwand, Waschbecken und Spender an der vorderen, Rotes Kreuz an der Außenwand
    my = yi + s * 0.9
    box('Medizinschrank', 0.45, 1.2, 1.9, x0 + 0.28, my, DECK + 0.95, M['white'], 0.01)
    box('Schrankglas', 0.01, 1.1, 1.0, x0 + 0.51, my, DECK + 1.35, M['lens'], 0)
    for z in (1.0, 1.35, 1.7):
        box('Schrankboden', 0.36, 1.1, 0.015, x0 + 0.28, my, DECK + z, M['white'], 0.002)
        for k in range(4): box('Medikament', 0.12, 0.08, 0.14, x0 + 0.3, my - 0.4 + k * 0.26, DECK + z + 0.08, M['buch%d' % (1 + (k + int(z * 10)) % 4)], 0.01)
    box('Waschbecken', 0.5, 0.45, 0.14, x1 - 0.32, yo - s * 0.6, DECK + 0.85, M['fliese'], 0.02)
    cyl('Beckenmulde', 0.15, 0.02, x1 - 0.32, yo - s * 0.6, DECK + 0.915, M['dunkel'], 'Z', n=20)
    box('Spender', 0.08, 0.16, 0.24, x1 - 0.08, yo - s * 1.1, DECK + 1.25, M['white'], 0.01)
    box('Kreuzschild', 0.5, 0.02, 0.5, (x0 + x1) / 2, yo - s * 0.06, DECK + 1.6, M['white'], 0.004)
    for a in ((0.36, 0.11), (0.11, 0.36)): box('Rotes Kreuz', a[0], 0.006, a[1], (x0 + x1) / 2, yo - s * 0.072, DECK + 1.6, M['red'], 0)
    cyl('Rollhocker', 0.2, 0.06, lx + 0.7, ly - s * 0.8, DECK + 0.5, M['polster'], 'Z', n=16)
    cyl('Hockersaeule', 0.03, 0.4, lx + 0.7, ly - s * 0.8, DECK + 0.25, M['mittel'], 'Z', n=10)

# ---------- Laderaum ----------
def crate(x, y, sx, sy, sz, z=DECK, m='crate', tag=None):      # Kiste mit Kantenschutz und Etikett
    box('Kiste', sx, sy, sz, x, y, z + sz / 2, M[m], 0.015)
    for cx in (-1, 1):
        for cy in (-1, 1): box('Kantenschutz', 0.07, 0.07, sz + 0.01, x + cx * (sx / 2 - 0.02), y + cy * (sy / 2 - 0.02), z + sz / 2, M['sitzrahmen'], 0.004)
    if tag: box('Etikett', sx * 0.4, 0.004, sz * 0.22, x, y - sy / 2 - 0.002, z + sz * 0.62, M['plate'], 0)
def cargo_detail():
    x0, x1, w, f0, c0 = X_STERN + 0.05, -11.0, 3.6, DECK, 5.85
    # Wandplatten zwischen den Spanten, Frachtnetze in einigen Feldern, Zurrösen an den Bodenschienen
    for k in range(8):
        xa = x0 + 0.6 + k * 1.2 + 0.1; xb = xa + 1.0; xm = (xa + xb) / 2
        for s in (1, -1):
            box('Laderaumplatte', 1.0, 0.03, 1.6, xm, s * (w - 0.035), f0 + 0.95, M['iwand'], 0.006)
            box('Laderaumplatte', 1.0, 0.03, 1.4, xm, s * (w - 0.035), f0 + 2.55, M['iwand2'], 0.006)
            if k in (1, 2, 5, 6):
                for i in range(5): pipe('Netzschnur', [Vector((xa + 0.1 + i * 0.2, s * (w - 0.09), f0 + 0.3)), Vector((xa + 0.1 + i * 0.2, s * (w - 0.09), f0 + 1.9))], 0.008, M['netz'])
                for j in range(7): pipe('Netzschnur', [Vector((xa + 0.05, s * (w - 0.09), f0 + 0.35 + j * 0.25)), Vector((xb - 0.05, s * (w - 0.09), f0 + 0.35 + j * 0.25))], 0.008, M['netz'])
    SL, SB, SW = Sammel('Laderaumdetail Boden', C_ROOM, 0.003), Sammel('Laderaumdetail Wand', C_ROOM), Sammel('Laderaumdetail Decke', C_ROOM)
    zp = f0 + 0.02      # Oberkante Bodenblech: darauf schwere Bodenplatten (1,2 m) mit Fugen und Schrauben, Ankerschienen längs
    platten(SL, x1 - 0.3 if False else x0 + 0.05, x1, -3.2, 3.2, zp, M['floor'], M['ischacht'], M['mittel'], M['iboden2'], p=1.2, q=1.6, h=0.01)
    for s in (1, -1):
        zurrschiene(SL, x0 + 0.2, x1 - 0.2, (s * 1.6, zp + 0.01), (0, 0, 1), M['mittel'], M['ischacht'], breite=0.09)
        zurrschiene(SL, x0 + 0.2, x1 - 0.2, (s * 3.05, zp + 0.01), (0, 0, 1), M['mittel'], M['ischacht'], breite=0.07)
    for k in range(9):
        for s in (1, -1): ring('Zurroese', 0.05, 0.012, (x0 + 0.6 + k * 1.2, s * 1.6, f0 + 0.05), (0, 0, 1), M['steel'], 14)
    # Bodenmarkierungen: Ladegasse, Gefahrenband vor der Rampe
    for s in (1, -1): box('Ladegasse', x0 - x1 - 0.6, 0.06, 0.004, (x0 + x1) / 2, s * 1.3, f0 + 0.033, M['platey'], 0)
    box('Rampenband', 0.4, 2 * DOOR_Y, 0.004, x0 + 0.5, 0, f0 + 0.033, M['warn2'], 0)
    # Wände: Ankerschienen in zwei Höhen, Leitungsbündel oben mit Schellen an jedem Spant, Anschlusskästen, Käfigleuchten, Feldschrift
    for s in (1, -1):
        yw = s * (w - 0.05)
        for zz in (f0 + 0.55, f0 + 1.45): zurrschiene(SW, x0 + 0.3, x1 - 0.3, (yw, zz), (0, -s, 0), M['mittel'], M['ischacht'], breite=0.06, dicke=0.016)
        for r, dy, zz, mm in ((0.045, 0.16, c0 - 0.42, 'irohr1'), (0.03, 0.16, c0 - 0.6, 'irohr2'), (0.025, 0.14, c0 - 0.74, 'steel')):
            pipe('Laderaumleitung', [Vector((x0 + 0.15, s * (w - 0.05 - dy - r), zz)), Vector((x1 - 0.1, s * (w - 0.05 - dy - r), zz))], r, M[mm])
            for k in range(9): schelle(SW, (x0 + 0.6 + k * 1.2 + 0.12, s * (w - 0.05 - dy - r), zz), (0, -s, 0), r, M['irahmen'])
        for k in range(9):
            x = x0 + 0.6 + k * 1.2
            if k % 2 == 1:      # Käfigleuchte am Spant
                SW.box(0.1, 0.12, 0.3, x, s * (w - 0.27), f0 + 2.35, M['irahmen'])
                SW.box(0.06, 0.04, 0.24, x, s * (w - 0.34), f0 + 2.35, M['lichtband'])
                for dz in (-0.1, 0.0, 0.1): SW.box(0.09, 0.012, 0.012, x, s * (w - 0.365), f0 + 2.35 + dz, M['irahmen'])
            if k in (0, 3, 7):      # Anschlusskasten mit Kabel nach oben
                SW.box(0.36, 0.1, 0.42, x + 0.6, s * (w - 0.1), f0 + 2.0, M['cab'])
                SW.box(0.24, 0.004, 0.08, x + 0.6, s * (w - 0.152), f0 + 2.1, M['ischild'])
                SW.box(0.06, 0.05, c0 - 0.8 - f0 - 2.21, x + 0.72, s * (w - 0.08), (f0 + 2.21 + c0 - 0.8) / 2, M['irahmen'])
        for i, xx in enumerate((-19.6, -16.0, -12.6)):
            text('A%d' % (i + 1) if s > 0 else 'B%d' % (i + 1), 0.26, (xx, s * (w - 0.052), f0 + 2.95), (1, 0, 0) if s > 0 else (-1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Feldschrift')
    # Decke: zwei Kabelpritschen längs zwischen den Deckenspanten, Kabel darin
    for s in (1, -1):
        y = s * 1.25; zt = c0 - 0.24
        SB.box(x0 - x1 - 0.4, 0.36, 0.008, (x0 + x1) / 2, y, zt - 0.06, M['irahmen'])
        for sy in (-1, 1): SB.box(x0 - x1 - 0.4, 0.008, 0.07, (x0 + x1) / 2, y + sy * 0.176, zt - 0.03, M['irahmen'])
        for j, mm in enumerate(('dunkel', 'irohr2', 'dunkel', 'irohr1')):
            pipe('Pritschenkabel', [Vector((x0 + 0.1, y - 0.12 + j * 0.08, zt - 0.038)), Vector((x1 - 0.2, y - 0.12 + j * 0.08, zt - 0.038))], 0.016, M[mm])
    for o in (SL, SB, SW): o.fertig()
    # Laufkran: Doppel-T-Träger unter den Deckenspanten, Katze, Seil, Hakenflasche
    kx0, kx1 = -20.0, -11.5; km = (kx0 + kx1) / 2; zt = c0 - 0.22
    box('Kranbahn Steg', kx1 - kx0, 0.025, 0.2, km, 0, zt - 0.1, M['oxid'] if 'oxid' in M else M['ochre'], 0.004)
    for zz in (zt, zt - 0.2): box('Kranbahn Gurt', kx1 - kx0, 0.16, 0.025, km, 0, zz, M['ochre'], 0.004)
    tx = -15.4
    box('Laufkatze', 0.45, 0.3, 0.2, tx, 0, zt - 0.33, M['dunkel'], 0.02)
    cyl('Kranseil', 0.008, 0.95, tx, 0, zt - 0.9, M['steel'], 'Z', n=6)
    box('Hakenflasche', 0.18, 0.12, 0.22, tx, 0, zt - 1.45, M['ochre'], 0.02)
    pipe('Kranhaken', [Vector((tx, 0, zt - 1.56)), Vector((tx, 0, zt - 1.72)), Vector((tx + 0.1, 0, zt - 1.78)), Vector((tx + 0.14, 0, zt - 1.68))], 0.02, M['steel'], rad=0.04)
    # Ladegut: keine festen Kisten mehr (seit dem 25.11.2026 stellt das Spiel die Fracht als echte Normkisten, src/game/laderaum.ts)
    # Spinde an der Stirnwand, Bedienpult und Warnleuchte an der Rampe, Arbeitsleuchten
    for s in (1, -1):
        for k in range(2):
            yy = s * (2.95 - k * 0.62)
            box('Laderaumspind', 0.55, 0.58, 2.0, x1 - 0.32, yy, f0 + 1.0, M['cab'], 0.01)
            box('Spindgriff', 0.02, 0.16, 0.03, x1 - 0.605, yy, f0 + 1.05, M['mittel'], 0.004)
    box('Rampenpult', 0.18, 0.5, 0.6, x0 + 0.16, 3.0, f0 + 1.35, M['cab'], 0.01)
    box('Rampenpult Schirm', 0.01, 0.36, 0.2, x0 + 0.255, 3.0, f0 + 1.5, M['mfd2'], 0)
    for k, m in enumerate(('e_green', 'e_red', 'e_amber')): cyl('Rampentaster', 0.035, 0.02, x0 + 0.26, 2.86 + k * 0.14, f0 + 1.22, M[m], 'X', n=12, bev=0)
    box('Warnstreifen Pult', 0.005, 0.5, 0.06, x0 + 0.255, 3.0, f0 + 1.08, M['warnrw'], 0)
    cyl('Rampenwarnleuchte', 0.08, 0.12, x0 + 0.12, 0, DOOR_Z + 0.06, M['e_amber'], 'Z', n=16)
    cyl('Feuerloescher', 0.08, 0.5, x1 - 0.12, 1.1, f0 + 0.5, M['red'], 'Z', n=16)
    for s in (1, -1): area('Arbeitslicht', (-13.5, s * 2.4, c0 - 0.25), (0, 0, 0), 1.6, 0.5, 90, (1.0, 0.92, 0.8))

def raeume():
    captain_extras(-10.0, -6.0, 1)
    crew_cabin(-6.0, -2.0, 1)
    medbay(-10.0, -6.0, -1)
    cargo_detail()
