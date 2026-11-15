# Wartungsgang, zweite Lage: Einzelheiten. Läuft im Namensraum von gang_bau.py (wird von dort am Ende ausgeführt).
# Schilder, Pfeile, Warnzeichen, Kleinteile an Pumpe, Schränken und Tauscher, Kabel, Sprinkler, Requisiten, weitere Kameras, Cycles.

# ---------- Helfer ----------
def frame(origin, xd, yd):
    X, Y = Vector(xd).normalized(), Vector(yd).normalized(); Z = X.cross(Y)
    mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = Vector(origin); return mw, X, Y, Z
def plate(w, h, origin, xd, yd, m, th=0.003, bev=0, name='Schild'):      # flache Platte, origin = linke untere Ecke
    ob = box(name, w, h, th, 0, 0, 0, m, bev); mw, X, Y, Z = frame(origin, xd, yd)
    mw.translation = Vector(origin) + X * w / 2 + Y * h / 2 + Z * th / 2; ob.matrix_world = mw; return ob
def label(s, size, origin, xd, yd, pm='plate', tm='txtd'):              # Schild mit Schrift, Breite nach Textlänge
    w = max(0.04, len(s) * size * 0.6 + 0.024); h = size * 1.7
    plate(w, h, origin, xd, yd, M[pm]); mw, X, Y, Z = frame(origin, xd, yd)
    text(s, size, Vector(origin) + X * 0.012 + Y * h * 0.3 + Z * 0.003, xd, yd, M[tm]); return w
def arrow(origin, xd, yd, ln, m, wd=0.03):                               # Pfeil in Richtung xd, origin = Ende des Schafts
    bm = bmesh.new(); a = wd / 2
    v = [bm.verts.new(p) for p in ((0, -a, 0), (ln * 0.62, -a, 0), (ln * 0.62, a, 0), (0, a, 0), (ln * 0.62, -a * 2.6, 0), (ln, 0, 0), (ln * 0.62, a * 2.6, 0))]
    bm.faces.new(v[:4]); bm.faces.new(v[4:])
    me = bpy.data.meshes.new('Pfeil'); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = bpy.data.objects.new('Pfeil', me); COL['Schilder'].objects.link(ob)
    mw, X, Y, Z = frame(origin, xd, yd); mw.translation = Vector(origin) + Z * 0.002; ob.matrix_world = mw; return ob
def warnsign(c, xd, yd, r=0.08):                                         # gelbes Warndreieck mit Ausrufezeichen
    bm = bmesh.new(); pts = [(math.sin(k * 2 * PI / 3) * r, math.cos(k * 2 * PI / 3) * r, 0) for k in range(3)]
    bm.faces.new([bm.verts.new(p) for p in pts])
    me = bpy.data.meshes.new('Warnzeichen'); bm.to_mesh(me); bm.free(); me.materials.append(M['platey'])
    ob = bpy.data.objects.new('Warnzeichen', me); COL['Schilder'].objects.link(ob)
    mw, X, Y, Z = frame(c, xd, yd); mw.translation = Vector(c) + Z * 0.002; ob.matrix_world = mw
    text('!', r * 0.9, Vector(c) - X * r * 0.11 - Y * r * 0.38 + Z * 0.001, xd, yd, M['txtd'])
def emblem(c, xd, yd, R, m):                                             # Zeichen der Bastion: Sechseck mit Winkel
    mw, X, Y, Z = frame(c, xd, yd); c = Vector(c) + Z * 0.004
    pipe('Zeichen Ring', [c + X * math.cos(k * PI / 3 + PI / 6) * R + Y * math.sin(k * PI / 3 + PI / 6) * R for k in range(6)], R * 0.07, m, cyclic=True)
    for sg in (-1, 1):
        pipe('Zeichen Winkel', [c + X * sg * R * 0.52 - Y * R * 0.3, c + Y * R * 0.3], R * 0.08, m)
    pipe('Zeichen Fuß', [c - X * R * 0.3 - Y * R * 0.48, c + X * R * 0.3 - Y * R * 0.48], R * 0.06, m)
def cable(a, b, r, m, sag=0.08, n=12, name='Kabel'):
    a, b = Vector(a), Vector(b)
    return pipe(name, [a.lerp(b, k / n) - Vector((0, 0, sag * 4 * (k / n) * (1 - k / n))) for k in range(n + 1)], r, m)
M['green'] = mk('Lack gruen', (0.03, 0.3, 0.1), 0.0, 0.45, var=0.2, bump=0.3, wear=0.8)
FL_X, FL_Y = (0, 1, 0), (-1, 0, 0)      # Schrift und Pfeile auf dem Boden, Leserichtung den Gang entlang

# =====================================================================================
# Rechte Wand
# =====================================================================================
use('WandRechts')
FX = XR - 0.03      # Oberfläche der Wandfelder
for i in range(5):
    y = i * BAY + 1
    if i in (1, 4):
        for z in (0.46, 0.66, 0.86): box('Feldrippe', 0.014, BAY - 0.56, 0.03, FX - 0.006, y, z, M['wall2'], 0.006)
    if i == 2:      # Lüftungsgitter unter dem Terminal
        box('Gitterrahmen', 0.024, 0.96, 0.5, FX - 0.01, y, 0.66, M['frame'], 0.01)
        for k in range(9): box('Gitterlamelle', 0.035, 0.86, 0.01, FX - 0.02, y, 0.47 + k * 0.047, M['wall2'], 0.003, (0, 0.6, 0))
    label('C-3 / 04%d' % (i + 1), 0.022, (FX - 0.001, y + 0.8, 1.29), RIGHT_X, RIGHT_Y)
    cyl('Prüfanschluss', 0.034, 0.024, FX - 0.012, y - 0.72, 1.76, M['steel'], 'X', n=16, bev=0.004)
    cyl('Prüfkappe', 0.022, 0.03, FX - 0.02, y - 0.72, 1.76, M['ochre'], 'X', n=12, bev=0.004)
    if i in (0, 2, 4):
        box('Abzweigdose', 0.07, 0.2, 0.16, FX - 0.035, y - 0.5, 1.62, M['cab'], 0.012)
        bolts(FX - 0.072, [y - 0.58, y - 0.42], [1.56, 1.68], r=0.007, ln=0.006)
        pipe('Dosenrohr', [(FX - 0.035, y - 0.5, 1.7), (FX - 0.035, y - 0.5, 1.9)], 0.012, M['steel'])
        cyl('Dosen-LED', 0.006, 0.008, FX - 0.072, y - 0.5, 1.62, M['e_green'], 'X', n=8, bev=0)
    box('Lichtleiste', 0.02, BAY - 0.26, 0.05, XR - 0.012, y, 1.135, M['frame'], 0.006)
    for k in range(4): cyl('Leisten-LED', 0.006, 0.008, XR - 0.024, y - 0.75 + k * 0.5, 1.135, M['e_amber'], 'X', n=8, bev=0)
for i in range(6):
    text('SP %d' % (12 + i), 0.035, (XR - 0.1305, i * BAY + 0.055, 1.52), RIGHT_X, RIGHT_Y, M['txtw'])
    text('SP %d' % (12 + i), 0.035, (XL + 0.1305, i * BAY - 0.055, 1.52), LEFT_X, LEFT_Y, M['txtw'])
warnsign((FX - 0.001, 9.6, 1.62), RIGHT_X, RIGHT_Y, 0.075)
label('DRUCKLEITUNG HINTER DER WAND', 0.016, (FX - 0.001, 9.5, 1.47), RIGHT_X, RIGHT_Y, 'platey')
# Gasflaschen im ersten Feld
for k, (mat, y) in enumerate((('teal', 0.42), ('white', 0.7))):
    cyl('Gasflasche', 0.105, 1.2, XR - 0.2, y, 0.62, M[mat], 'Z', n=24, bev=0.02)
    cyl('Flaschenschulter', 0.105, 0.14, XR - 0.2, y, 1.29, M[mat], 'Z', n=24, bev=0, r2=0.04)
    cyl('Flaschenventil', 0.03, 0.1, XR - 0.2, y, 1.4, M['steel'], 'Z', n=12, bev=0.004)
    cyl('Ventilrad', 0.04, 0.015, XR - 0.2, y, 1.46, M['ochre' if k else 'red'], 'Z', n=10, bev=0.003)
    cyl('Flaschenband', 0.107, 0.1, XR - 0.2, y, 0.95, M['ochre'], 'Z', n=24, bev=0)
    cyl('Flaschenfuß', 0.11, 0.03, XR - 0.2, y, 0.016, M['frame'], 'Z', n=24, bev=0.004)
box('Flaschenhalter', 0.06, 0.66, 0.05, XR - 0.06, 0.56, 1.02, M['frame'], 0.008)
pipe('Flaschenkette', [(XR - 0.06, 0.24, 1.04), (XR - 0.31, 0.3, 1.02), (XR - 0.325, 0.56, 1.0), (XR - 0.31, 0.82, 1.02), (XR - 0.06, 0.88, 1.04)], 0.008, M['steel'], rad=0.06)
# Werkzeugwagen im vierten Feld
CYW, CXW = 6.25, XR - 0.46
for sx in (-0.2, 0.2):
    for sy in (-0.3, 0.3):
        box('Wagenbein', 0.03, 0.03, 0.78, CXW + sx, CYW + sy, 0.47, M['frame'], 0.005)
        cyl('Wagenrad', 0.045, 0.03, CXW + sx, CYW + sy, 0.045, M['rubber'], 'X', n=16, bev=0.006)
        cyl('Radnabe', 0.018, 0.034, CXW + sx, CYW + sy, 0.045, M['steel'], 'X', n=10, bev=0)
for z in (0.2, 0.52, 0.86): box('Wagenboden', 0.46, 0.66, 0.02, CXW, CYW, z, M['red'], 0.006)
for sy in (-0.33, 0.33): box('Wagenrand', 0.46, 0.012, 0.05, CXW, CYW + sy, 0.895, M['red'], 0.004)
for sx in (-0.23, 0.23): box('Wagenrand', 0.012, 0.66, 0.05, CXW + sx, CYW, 0.895, M['red'], 0.004)
pipe('Wagengriff', [(CXW - 0.2, CYW - 0.3, 0.86), (CXW - 0.2, CYW - 0.42, 0.98), (CXW + 0.2, CYW - 0.42, 0.98), (CXW + 0.2, CYW - 0.3, 0.86)], 0.012, M['steel'], rad=0.04)
box('Werkzeugkasten', 0.2, 0.36, 0.13, CXW + 0.08, CYW + 0.1, 0.935, M['ochre'], 0.012)
box('Kastendeckel', 0.2, 0.36, 0.03, CXW + 0.08, CYW + 0.1, 1.015, M['crate'], 0.01)
pipe('Kastengriff', [(CXW + 0.08, CYW - 0.02, 1.03), (CXW + 0.08, CYW - 0.02, 1.07), (CXW + 0.08, CYW + 0.22, 1.07), (CXW + 0.08, CYW + 0.22, 1.03)], 0.007, M['steel'], rad=0.02)
box('Schraubenschlüssel', 0.026, 0.24, 0.008, CXW - 0.12, CYW + 0.05, 0.876, M['steel'], 0.003, (0, 0, 0.3))
cyl('Schlüsselkopf', 0.024, 0.009, CXW - 0.155, CYW + 0.165, 0.876, M['steel'], 'Z', n=6, bev=0)
box('Handlampe', 0.05, 0.16, 0.04, CXW - 0.1, CYW - 0.2, 0.892, M['frame'], 0.008, (0, 0, -0.5))
box('Handlampe Glas', 0.04, 0.1, 0.006, CXW - 0.1, CYW - 0.2, 0.914, M['e_white'], 0, (0, 0, -0.5))
point('Handlampenlicht', (CXW - 0.1, CYW - 0.2, 1.0), 1.5, (0.85, 0.92, 1.0), 0.04)
for k in range(3): ring('Kabelrolle', 0.13 - k * 0.006, 0.014, (CXW, CYW - 0.08, 0.548 + k * 0.027), (0, 0, 1), M['rubber'])
box('Kanister', 0.14, 0.2, 0.24, CXW + 0.06, CYW + 0.18, 0.65, M['green'], 0.02)
cyl('Kanisterdeckel', 0.025, 0.03, CXW + 0.06, CYW + 0.23, 0.785, M['frame'], 'Z', n=12, bev=0.003)
box('Karton', 0.26, 0.3, 0.14, CXW - 0.04, CYW + 0.1, 0.28, M['crate'], 0.006, (0, 0, 0.1))

# =====================================================================================
# Linke Wand: Schränke, Hauptleitung, Pumpe, Tauscher
# =====================================================================================
use('WandLinks')
for k in range(3):
    y = 0.42 + k * 0.58
    cyl('Türschloss', 0.012, 0.012, XL + 0.38, y + 0.19, 0.78, M['steel'], 'X', n=10, bev=0)
    text(('NV-%d   400 V' % (k + 1)), 0.014, (XL + 0.383, y - 0.122, 1.21), LEFT_X, LEFT_Y, M['txtd'])
    for dy in (-0.2, 0.16): cyl('Kabelverschraubung', 0.03, 0.04, XL + 0.14, y + dy * 0.6, 1.76, M['steel'], 'Z', n=6, bev=0.004)
    box('Türrahmen', 0.008, 0.53, 1.56, XL + 0.362, y, 0.9, M['cab'], 0.004)
warnsign((XL + 0.38, 1.0, 0.74), LEFT_X, LEFT_Y, 0.07)
label('HOCHSPANNUNG', 0.016, (XL + 0.38, 0.91, 0.6), LEFT_X, LEFT_Y, 'platey')
plate(0.15, 0.21, (XL + 0.38, 0.33, 0.48), LEFT_X, LEFT_Y, M['plate'], name='Klemmbrett')
for q in range(6): plate(0.11, 0.004, (XL + 0.3835, 0.35, 0.51 + q * 0.026), LEFT_X, LEFT_Y, M['txtd'], th=0.001, name='Zeile')
box('Brettklammer', 0.012, 0.07, 0.025, XL + 0.386, 0.405, 0.69, M['steel'], 0.004)
# Hauptleitung: Nähte der Dämmung, Schild, Flusspfeile
for y in (2.05, 2.85, 3.7, 4.4, 5.2, 5.9): cyl('Dämmnaht', 0.1512, 0.014, XP, y, ZP, M['steel'], 'Y', n=28, bev=0)
label('KÜHLMITTEL  B', 0.028, (XP + 0.151, 3.42, ZP - 0.024), LEFT_X, LEFT_Y)
for y in (2.62, 4.1, 5.25): arrow((XP + 0.151, y, ZP), LEFT_X, LEFT_Y, 0.2, M['txtd'], 0.028)
cyl('Drucksensor', 0.02, 0.09, XP + 0.08, PY - 0.3, 1.34, M['steel'], 'X', n=12, bev=0.004)
box('Sensorkopf', 0.05, 0.05, 0.05, XP + 0.14, PY - 0.3, 1.34, M['ochre'], 0.008)
cable((XP + 0.14, PY - 0.3, 1.365), (XL + 0.06, PY - 0.6, 1.98), 0.006, M['rubber'], sag=0.12, name='Sensorkabel')
# Pumpe: Stirnseite mit Zeichen, Schauglas, Ablass; Schrauben, Schilder, Bedienpult
SY = PY - 0.5765
emblem((XL + 0.3, SY, 0.76), END_X, END_Y, 0.075, M['txtd'])
text('BASTION  WERK 2', 0.02, (XL + 0.2, SY, 0.64), END_X, END_Y, M['txtd'])
label('BW-2 · 1,4 MW · JAHR 31', 0.012, (XL + 0.2, SY - 0.001, 0.59), END_X, END_Y, 'plate')
cyl('Schauglas Ring', 0.05, 0.03, XL + 0.42, SY - 0.01, 0.48, M['steel'], 'Y', n=20, bev=0.005)
cyl('Schauglas', 0.036, 0.034, XL + 0.42, SY - 0.012, 0.48, M['glass'], 'Y', n=20, bev=0)
for a in range(6): cyl('Schauglas Schraube', 0.006, 0.036, XL + 0.42 + math.cos(a * PI / 3) * 0.042, SY - 0.01, 0.48 + math.sin(a * PI / 3) * 0.042, M['frame'], 'Y', n=6, bev=0)
pipe('Ablass', [(XL + 0.16, SY + 0.02, 0.42), (XL + 0.16, SY - 0.07, 0.42), (XL + 0.16, SY - 0.07, 0.36)], 0.016, M['steel'], rad=0.02)
box('Ablasshebel', 0.012, 0.03, 0.1, XL + 0.16, SY - 0.07, 0.47, M['red'], 0.004, (0.4, 0, 0))
for z in (0.38, 0.9):
    for x in (XL + 0.07, XL + 0.28, XL + 0.49): cyl('Stirnschraube', 0.01, 0.012, x, SY - 0.002, z, M['steel'], 'Y', n=6, bev=0)
bolts(XL + 0.534, [PY - 0.55, PY - 0.05, PY + 0.55], [0.37, 0.91], r=0.01)
label('ROTIERENDE TEILE', 0.013, (XL + 0.441, MY - 0.565, 0.7), LEFT_X, LEFT_Y, 'platey')
label('ÖLSTAND TÄGLICH PRÜFEN', 0.011, (XL + 0.533, PY + 0.3, 0.86), LEFT_X, LEFT_Y)
for k in range(2):
    px, py, pz = pult(-0.44 + k * 0.0, 0.1 - k * 0.14, 0.022)
    g = cyl('Drehknopf', 0.02, 0.022, px - math.sin(0.6) * (0.1 - k * 0.14) * 0 , py, pz, M['frame'], 'X', n=14, bev=0.003); g.rotation_euler = (0, PI / 2 - 0.6, 0)
for k in range(4):
    px, py, pz = pult(0.16 + k * 0.05, 0.11, 0.022)
    g = cyl('Pult-LED', 0.007, 0.01, px, py, pz, M[['e_green', 'e_green', 'e_amber', 'e_red'][k]], 'X', n=8, bev=0); g.rotation_euler = (0, PI / 2 - 0.6, 0)
box('Tropfwanne', 0.42, 0.66, 0.025, XL + 0.32, MY, 0.353, M['steel'], 0.006)
use('Boden')
for dx, dy, r in ((0.95, -0.3, 0.2), (1.1, -0.12, 0.11), (0.86, 0.05, 0.07)): cyl('Ölfleck', r, 0.001, XL + dx, MY + dy, 0.0127, M['oil'], 'Z', n=20, bev=0)
use('WandLinks')
# Tauscher: Schild, Fühler mit Kabeln, Ankerschrauben, Ablauf
label('WT-2 · 180 °C', 0.02, (EX + 0.291, EY - 0.09, ZP - 0.04), LEFT_X, LEFT_Y)
for k, (dy, z) in enumerate(((-0.12, 1.12), (0.12, 0.74))):
    cyl('Fühler', 0.014, 0.07, EX + 0.345, EY + dy, z, M['steel'], 'X', n=10, bev=0.003)
    cable((EX + 0.38, EY + dy, z), (XL + 0.15, EY - 0.66, 1.06), 0.005, M['rubber' if k else 'ochre'], sag=0.035, name='Fühlerkabel')
for a in range(8): cyl('Ankerschraube', 0.014, 0.03, EX + math.cos(a * PI / 4 + 0.3) * 0.32, EY + math.sin(a * PI / 4 + 0.3) * 0.32, 0.21, M['steel'], 'Z', n=6, bev=0)
for z in (ZP - 0.1, ZP + 0.1): cyl('Kopfnaht', 0.2915, 0.012, EX, EY, z, M['steel'], 'Z', n=32, bev=0)
box('Ablaufrost', 0.24, 0.24, 0.006, EX + 0.5, EY + 0.55, 0.014, M['steel'], 0.003)
for k in range(5): box('Ablaufschlitz', 0.2, 0.016, 0.004, EX + 0.5, EY + 0.47 + k * 0.04, 0.0185, M['frame'], 0)
pipe('Ablaufrohr', [(EX + 0.2, EY + 0.26, 0.3), (EX + 0.42, EY + 0.5, 0.3), (EX + 0.5, EY + 0.55, 0.02)], 0.018, M['copper'], rad=0.06)
# Feld 5: Verbandkasten, Lukenschild
box('Verbandkasten', 0.09, 0.3, 0.3, XL + 0.075, 8.5, 0.72, M['white'], 0.014)
box('Kreuz', 0.004, 0.16, 0.05, XL + 0.122, 8.5, 0.72, M['green'], 0)
box('Kreuz', 0.004, 0.05, 0.16, XL + 0.122, 8.5, 0.72, M['green'], 0)
box('Kastenriegel', 0.02, 0.03, 0.06, XL + 0.125, 8.63, 0.72, M['steel'], 0.004)
label('LUKE D2  ·  NUR MIT SICHERUNG', 0.014, (XL + 0.032, 9.52, 1.98), LEFT_X, LEFT_Y, 'platey')

# =====================================================================================
# Boden
# =====================================================================================
use('Boden')
box('Kabelbrücke', 1.36, 0.2, 0.03, 0, 5.72, 0.02, M['warn'], 0.008)
for s in (-1, 1): box('Kabelbrücke Rampe', 0.14, 0.2, 0.03, s * 0.74, 5.72, 0.012, M['rubber'], 0.006, (0, s * 0.2, 0))
pipe('Bodenkabel', [(XL + 0.62, 4.9, 0.022), (XL + 0.8, 5.3, 0.022), (-0.82, 5.72, 0.022)], 0.011, M['rubber'], rad=0.15)
pipe('Bodenkabel', [(XL + 0.62, 4.82, 0.022), (XL + 0.86, 5.26, 0.022), (-0.82, 5.68, 0.022)], 0.008, M['ochre'], rad=0.15)
pipe('Bodenkabel', [(0.82, 5.72, 0.022), (1.0, 5.95, 0.022), (CXW - 0.25, CYW - 0.1, 0.022), (CXW - 0.05, CYW - 0.08, 0.5)], 0.011, M['rubber'], rad=0.12)
pipe('Bodenkabel', [(0.82, 5.68, 0.022), (1.12, 5.7, 0.022), (XR - 0.16, 5.4, 0.022), (XR - 0.16, 5.4, 0.24)], 0.008, M['ochre'], rad=0.1)
for y in (1.7, 4.7, 7.9): arrow((0.92, y, 0.0125), FL_X, FL_Y, 0.42, M['txto'], 0.07)
text('FLUCHTWEG', 0.07, (1.12, 1.2, 0.0125), FL_X, FL_Y, M['txto'])
text('PUMPE 2', 0.06, (XL + 0.78, 2.5, 0.0125), FL_X, FL_Y, M['txtw'])
box('Standmarke', 0.012, 2.3, 0.002, XL + 0.72, 3.55, 0.0128, M['txtw'], 0)

# =====================================================================================
# Decke
# =====================================================================================
use('Decke')
pipe('Sprinklerleitung', [(0.56, 0.15, HC - 0.06), (0.56, L - 0.3, HC - 0.06)], 0.016, M['red'])
for i in range(5):
    y = i * BAY + 1
    cyl('Sprinkler', 0.014, 0.06, 0.56, y, HC - 0.1, M['steel'], 'Z', n=10, bev=0)
    cyl('Sprinklerteller', 0.032, 0.005, 0.56, y, HC - 0.132, M['steel'], 'Z', n=16, bev=0)
    box('Sprinklerschelle', 0.05, 0.03, 0.04, 0.56, y - 0.7, HC - 0.05, M['frame'], 0.004)
    for k in range(6): box('Leuchtenraster', 0.22, 0.01, 0.022, 0, y - 0.5 + k * 0.2, HC - 0.088, M['frame'], 0)
    cable((-0.5, i * BAY + 0.1, HC - 0.13), (-0.5, i * BAY + 1.9, HC - 0.13), 0.012, M['rubber'], sag=0.07)
    cable((-0.56, i * BAY + 0.1, HC - 0.13), (-0.56, i * BAY + 1.9, HC - 0.13), 0.008, M['ochre'], sag=0.1)
    cable((-0.44, i * BAY + 0.1, HC - 0.13), (-0.44, i * BAY + 1.9, HC - 0.13), 0.007, M['teal'], sag=0.05)
for i in range(6): box('Kabelschelle Decke', 0.2, 0.05, 0.03, -0.5, i * BAY + (0.1 if i == 0 else -0.1 if i == 5 else 0), HC - 0.145, M['frame'], 0.004)
cyl('Sensorfuß', 0.07, 0.03, -0.3, 5.0, HC - 0.015, M['frame'], 'Z', n=20, bev=0.005)
cyl('Sensorkuppel', 0.055, 0.05, -0.3, 5.0, HC - 0.055, M['glass'], 'Z', n=20, bev=0.01, r2=0.03)
cyl('Sensor-LED', 0.006, 0.006, -0.3, 4.94, HC - 0.035, M['e_red'], 'Y', n=8, bev=0)

# =====================================================================================
# Tor am Gangende: Rippen, Griffe, Kennung, Ausgangsschild
# =====================================================================================
use('Tor')
for s in (-1, 1):
    for z in (0.46, 0.62, 0.78): box('Torrippe', 0.56, 0.016, 0.03, s * 0.385, L - 0.062, z, M['wall'], 0.006)
    box('Torgriff', 0.03, 0.04, 0.26, s * 0.1, L - 0.08, 1.05, M['steel'], 0.01)
    for z in (0.35, 1.9): box('Torscharnier', 0.06, 0.05, 0.14, s * 0.71, L - 0.07, z, M['frame'], 0.01)
text('C', 0.2, (-0.6, L - 0.071, 1.36), END_X, END_Y, M['txto'])
text('3', 0.2, (0.48, L - 0.071, 1.36), END_X, END_Y, M['txto'])
box('Ausgangsschild', 0.34, 0.03, 0.12, -1.22, L - 0.02, 2.3, M['e_green'], 0.004)
text('AUSGANG', 0.05, (-1.36, L - 0.036, 2.275), END_X, END_Y, M['txtd'])
label('TOR SCHLIESST SELBSTTÄTIG', 0.014, (1.06, L - 0.001, 1.52), END_X, END_Y, 'platey')
for k in range(5): cyl('Tor-LED', 0.006, 0.008, -0.2 + k * 0.1, L - 0.176, 2.33, M['e_amber'], 'Y', n=8, bev=0)

# =====================================================================================
# Kameras und Renderer
# =====================================================================================
cam('K6 Wagen', (-0.7, 4.6, 1.25), (1.45, 6.3, 0.75), 30)
cam('K7 Schränke', (0.3, 2.45, 1.3), (-1.5, 0.9, 1.0), 30)
cam('K8 Stirn', (-0.55, 1.35, 0.85), (-1.42, 2.6, 0.62), 40)
dof('K6 Wagen', 2.6, 2.8); dof('K7 Schränke', 2.3, 2.8); dof('K8 Stirn', 1.4, 2.8)
def cycles_setup(samples=160):
    cp = bpy.context.preferences.addons['cycles'].preferences
    globals()['_OLD_DEV'] = cp.compute_device_type
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 7), ('volume_bounces', 1), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('adaptive_threshold', 0.02)):
        try: setattr(cy, k, v)
        except Exception as e: NOTE.append(str(e))
def cycles_done():      # Voreinstellung des Rechengeräts wieder so, wie sie vorher war
    bpy.context.preferences.addons['cycles'].preferences.compute_device_type = globals().get('_OLD_DEV', 'NONE')
