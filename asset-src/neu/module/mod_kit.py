# Schiffsmodule als Modelle (26.11.2026). Nutzer: „alle 32 Modelle bauen mit viel Details“. Jedes Schiffsmodul aus src/data/gear.ts
# (sw_*, sa_*, st_*, sy_*) bekommt ein eigenes Modell, das im Spiel an seinem Modulplatz im Technikraum steht (../innen/modulplatz.py).
# Bezugsrahmen eines Moduls: Ursprung = Anker des Platzes, +X nach rechts, −Y zum Betrachter, +Z nach oben (im Spiel nach dem Export:
# +x rechts, +y oben, +z zum Betrachter). Hüllmaße:
#   system  Kassette im Einschubgestell: x ±0,47 · Tiefe 0,04…0,60 · Höhe 0,02…0,63
#   waffe   offenes Gestell:             x ±0,50 · Tiefe 0,04…0,50 · Höhe 0,02…0,90
#   abwehr  auf dem Schildbock:          Radius 0,42 · Höhe 0…1,20 (oben greift der Kappenstecker)
#   antrieb im Reglerkäfig:              ±0,33 × ±0,33 · Höhe 0…1,26
# Bauen und Bilder:  blender.exe -b --python mod_lauf.py -- [system waffe abwehr antrieb | alle]      Export:  mod_export.py
import bpy, bmesh, math, os, json
from mathutils import Vector, Matrix
NUR_HELFER_MILAN = True
_mk = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'milan', 'mil_kit.py')
exec(compile(open(_mk, encoding='utf-8').read(), 'mil_kit.py', 'exec'))
HIER = os.path.dirname(bpy.data.filepath)
exec(compile(open(os.path.join(HIER, '..', 'innen', 'modulplatz.py'), encoding='utf-8').read(), 'modulplatz.py', 'exec'))
C_MOD = bpy.data.collections.new('Module'); bpy.context.scene.collection.children.link(C_MOD)

def _m(key, name, col, metal, rough, emit=None, es=0.0, **k): M[key] = mk(name, col, metal, rough, emit=emit, es=es, grime=emit is None, **k)
_m('geh', 'Modulgehäuse', (0.085, 0.09, 0.097), 0.4, 0.45, var=0.06, wear=0.3); _m('rahmen', 'Modulrahmen', (0.045, 0.048, 0.053), 0.6, 0.4, var=0.08, wear=0.4)
_m('dunkel', 'Modul dunkel', (0.022, 0.023, 0.026), 0.4, 0.5, var=0.05); _m('stahl', 'Modulstahl', (0.52, 0.53, 0.55), 1.0, 0.24, var=0.05)
_m('blau', 'Stahl brüniert', (0.07, 0.085, 0.12), 1.0, 0.3, var=0.06); _m('kupfer', 'Modulkupfer', (0.5, 0.21, 0.09), 1.0, 0.3, var=0.08, wear=0.4)
_m('messing', 'Messing', (0.62, 0.43, 0.14), 1.0, 0.28, var=0.06); _m('gelb', 'Modul Warngelb', (0.55, 0.36, 0.02), 0.2, 0.45, var=0.08, wear=0.6)
_m('rot', 'Modul Rot', (0.32, 0.025, 0.02), 0.25, 0.42, var=0.1, wear=0.5); _m('petrol', 'Modul Petrol', (0.02, 0.16, 0.17), 0.3, 0.4, var=0.08)
_m('keramik', 'Keramik', (0.62, 0.6, 0.55), 0.0, 0.35, var=0.05); _m('gummi', 'Gummi', (0.015, 0.015, 0.017), 0.0, 0.85, var=0.04)
_m('gurt', 'Zurrgurt', (0.5, 0.33, 0.03), 0.0, 0.8, var=0.1, bump=0.3, bscale=160); _m('weiss', 'Lack weiß', (0.55, 0.57, 0.6), 0.1, 0.4, var=0.06, wear=0.4)
_m('ferrox', 'Ferrox-Eisen', (0.16, 0.075, 0.04), 0.85, 0.7, var=0.25, bump=0.5, bscale=60); _m('ferrox2', 'Ferrox-Zunder', (0.05, 0.035, 0.03), 0.7, 0.8, var=0.2, bump=0.4, bscale=90)
_m('linse', 'Linsenglas', (0.03, 0.06, 0.1), 0.0, 0.05, var=0.0, emit=(0.15, 0.4, 0.8), es=0.6); _m('schirm', 'Modulschirm', (0.02, 0.2, 0.2), 0.0, 0.3, emit=(0.1, 0.75, 0.7), es=1.6)
_m('l_petrol', 'Leuchte petrol', (0.2, 0.9, 0.85), 0, 0.3, emit=(0.25, 0.95, 0.9), es=4.0); _m('l_warm', 'Leuchte warm', (1.0, 0.6, 0.3), 0, 0.3, emit=(1.0, 0.55, 0.22), es=4.0)
_m('l_rot', 'Leuchte rot', (1.0, 0.1, 0.05), 0, 0.3, emit=(1.0, 0.12, 0.05), es=4.0); _m('l_weiss', 'Leuchte weiß', (0.9, 0.95, 1.0), 0, 0.3, emit=(0.85, 0.93, 1.0), es=6.0)
_m('l_blau', 'Leuchte blau', (0.3, 0.55, 1.0), 0, 0.3, emit=(0.3, 0.55, 1.0), es=6.0); _m('l_violett', 'Leuchte violett', (0.7, 0.35, 1.0), 0, 0.3, emit=(0.7, 0.35, 1.0), es=6.0)
_m('l_glut', 'Ferrox-Glut', (1.0, 0.3, 0.05), 0, 0.4, emit=(1.0, 0.28, 0.04), es=8.0); _m('schrift', 'Modulaufschrift', (0.75, 0.78, 0.8), 0, 0.5, emit=(0.8, 0.86, 0.9), es=0.9)
_m('schrift_d', 'Aufschrift dunkel', (0.02, 0.02, 0.022), 0, 0.6)
m = M; W = Wand((0, 0, 0), (0, -1, 0)); B, C, R = W.box, W.cyl, W.rod
def Tx(t, size, u, v, w, mat='schrift'): return W.text(t, size, u, v, w, M[mat])
def schild(u, v, w, name, sub='', b=0.26, h=0.12):      # Typenschild: dunkle Platte, Name und kleine zweite Zeile
    B('Typenschild', b, 0.012, h, u, v, w, m['dunkel'], 0.003); Tx(name, min(0.045, b / max(4, len(name)) * 1.35), u, v + 0.008, w + (0.012 if sub else -0.015))
    if sub: Tx(sub, 0.02, u, v + 0.008, w - 0.04)
def schrauben(pts, v, r=0.012, mat='stahl'):
    for u, w in pts: C('Schraube', r, 0.01, u, v, w, m[mat], 'V', n=6, bev=0)
def schlauch(name, pts, r, mat, n=10):      # Leitung durch Punkte (u, v, w) mit Kugeln in den Knicken
    for a, b in zip(pts, pts[1:]): R(name, a, b, r, m[mat], n)
    for p in pts[1:-1]: q = W.P(*p); sphere(name + ' Knie', r * 1.05, q.x, q.y, q.z, m[mat], 10)
def rippen(u0, u1, v, w0, w1, n, tief=0.03, mat='dunkel'):      # Kühlrippen: senkrechte Lamellen
    for k in range(n): B('Kuehlrippe', (u1 - u0) / n * 0.45, tief, w1 - w0, u0 + (u1 - u0) * (k + 0.5) / n, v, (w0 + w1) / 2, m[mat], 0.002)
def uhr(u, v, w, r=0.045, zeiger=0.3):      # Druckuhr mit Zeiger
    C('Uhrgehaeuse', r, 0.03, u, v, w, m['stahl'], 'V', n=20, bev=0.004); C('Zifferblatt', r * 0.82, 0.005, u, v + 0.016, w, m['keramik'], 'V', n=20, bev=0)
    R('Zeiger', (u, v + 0.02, w), (u + r * 0.7 * math.cos(zeiger * PI), v + 0.02, w + r * 0.7 * math.sin(zeiger * PI)), 0.004, m['rot'], 4)
def kassette(tief=0.42, hoch=0.58, breit=0.94, griffe=True, mat='geh'):
    """Kassette fürs Einschubgestell; gibt die Tiefe der Frontfläche und die mittlere Höhe zurück"""
    zm = 0.03 + hoch / 2; vf = 0.05 + tief + 0.02
    B('Kassette', breit, tief, hoch, 0, 0.05 + tief / 2, zm, m[mat], 0.012); B('Frontplatte', breit - 0.04, 0.02, hoch - 0.04, 0, vf - 0.01, zm, m['rahmen'], 0.006)
    for sg in (1, -1):
        ug = sg * (breit / 2 - 0.05)
        if griffe:
            R('Griff', (ug, vf + 0.06, zm - 0.17), (ug, vf + 0.06, zm + 0.17), 0.013, m['stahl'], 10)
            for dz in (-0.17, 0.17): R('Griffstutzen', (ug, vf, zm + dz), (ug, vf + 0.06, zm + dz), 0.011, m['stahl'], 8)
        B('Riegel', 0.045, 0.03, 0.09, sg * (breit / 2 + 0.004), vf - 0.05, zm, m['gelb'], 0.004)
    schrauben([(sg * (breit / 2 - 0.035), zm + dz) for sg in (1, -1) for dz in (-hoch / 2 + 0.04, hoch / 2 - 0.04)], vf + 0.004)
    return vf, zm
def feder(c, achse, R_, r, laenge, n, mat='stahl'):      # Druckfeder aus Ringen
    c = Vector(c); a = Vector(achse).normalized()
    for k in range(n): ring('Federwindung', R_, r, tuple(c + a * (laenge * (k / (n - 1) - 0.5))), tuple(a), m[mat], 16)

# ============================== BORDSYSTEME (Kassetten) ==============================
def sy_netz():      # Frachtnetze: zwei Gurtwinden mit Ratschen, Netzfeld, Haken
    vf, zm = kassette()
    B('Netzfeld', 0.5, 0.012, 0.42, -0.14, vf + 0.006, zm, m['dunkel'], 0.003)
    for k in range(7): R('Netzfaden', (-0.38 + k * 0.08, vf + 0.014, zm - 0.2), (-0.38 + k * 0.08, vf + 0.014, zm + 0.2), 0.006, m['gurt'], 5)
    for k in range(6): R('Netzfaden', (-0.38, vf + 0.016, zm - 0.2 + k * 0.08), (0.1, vf + 0.016, zm - 0.2 + k * 0.08), 0.006, m['gurt'], 5)
    for dz in (-0.14, 0.14):
        C('Windentrommel', 0.075, 0.2, 0.27, vf + 0.05, zm + dz, m['gurt'], 'U', n=20, bev=0.004)
        for sg in (1, -1): C('Trommelflansch', 0.09, 0.012, 0.27 + sg * 0.105, vf + 0.05, zm + dz, m['stahl'], 'U', n=20, bev=0.002)
        for k in range(8): a = 2 * PI * k / 8; B('Ratschenzahn', 0.012, 0.02, 0.02, 0.385, vf + 0.05 + 0.085 * math.cos(a), zm + dz + 0.085 * math.sin(a), m['stahl'], 0.002)
        R('Ratschenhebel', (0.4, vf + 0.05, zm + dz), (0.4, vf + 0.09, zm + dz + 0.11), 0.01, m['gelb'], 8); B('Windenlager', 0.26, 0.05, 0.03, 0.27, vf + 0.02, zm + dz - 0.1, m['rahmen'], 0.004)
    for k in range(3):
        u = -0.3 + k * 0.16; R('Hakenschaft', (u, vf + 0.03, 0.14), (u, vf + 0.03, 0.08), 0.008, m['stahl'], 6); ring('Haken', 0.022, 0.007, tuple(W.P(u, vf + 0.03, 0.06)), (0, 1, 0), m['stahl'], 12)
    schild(-0.14, vf + 0.02, zm + 0.245, 'FRACHTNETZE', '', 0.3, 0.05)
def sy_linse():      # Fokuslinse: Optikrohr mit Messingringen, Stellschrauben, Linsenglas
    vf, zm = kassette()
    C('Optikflansch', 0.2, 0.03, -0.18, vf + 0.015, zm, m['stahl'], 'V', n=36, bev=0.004); C('Optikrohr', 0.15, 0.09, -0.18, vf + 0.045, zm, m['blau'], 'V', n=36, bev=0.004)
    for k in range(3): C('Messingring', 0.158 - k * 0.012, 0.014, -0.18, vf + 0.03 + k * 0.03, zm, m['messing'], 'V', n=36, bev=0.002)
    C('Linse', 0.12, 0.012, -0.18, vf + 0.088, zm, m['linse'], 'V', n=36, bev=0); ring('Linsenfassung', 0.124, 0.01, tuple(W.P(-0.18, vf + 0.09, zm)), (0, 1, 0), m['messing'], 36)
    for k in range(24): a = 2 * PI * k / 24; B('Raendel', 0.012, 0.03, 0.012, -0.18 + 0.166 * math.cos(a), vf + 0.045, zm + 0.166 * math.sin(a), m['stahl'], 0.001)
    for k in range(3):
        a = PI / 2 + k * 2 * PI / 3; u, w = -0.18 + 0.2 * math.cos(a), zm + 0.2 * math.sin(a)
        C('Stellschraube', 0.018, 0.07, u, vf + 0.05, w, m['messing'], 'V', n=12, bev=0.002); C('Stellknopf', 0.028, 0.02, u, vf + 0.09, w, m['dunkel'], 'V', n=12, bev=0.003)
    B('Justierblock', 0.3, 0.05, 0.2, 0.25, vf + 0.025, zm + 0.12, m['geh'], 0.008); B('Justierschirm', 0.22, 0.008, 0.1, 0.25, vf + 0.052, zm + 0.14, m['schirm'], 0.002)
    for k in range(4): C('Mikrometer', 0.016, 0.05, 0.16 + k * 0.06, vf + 0.04, zm - 0.02, m['stahl'], 'V', n=10, bev=0.002)
    schild(0.25, vf + 0.006, zm - 0.18, 'FOKUSLINSE', 'BRENNWEITE 12 M', 0.3, 0.1)
def sy_antenne():      # Weitbereichsantenne: Empfänger mit Hohlleitern, Koaxbuchsen, Spektrumschirm
    vf, zm = kassette()
    B('Spektrumschirm', 0.36, 0.01, 0.2, -0.22, vf + 0.006, zm + 0.13, m['schirm'], 0.003); B('Schirmrahmen', 0.4, 0.016, 0.24, -0.22, vf + 0.002, zm + 0.13, m['dunkel'], 0.004)
    for k in range(9): B('Spektrumlinie', 0.012, 0.004, 0.03 + 0.11 * abs(math.sin(k * 1.3)), -0.36 + k * 0.035, vf + 0.013, zm + 0.06 + (0.03 + 0.11 * abs(math.sin(k * 1.3))) / 2, m['l_petrol'], 0)
    for k in range(2):
        u = 0.16 + k * 0.2; B('Hohlleiter', 0.1, 0.12, 0.06, u, vf + 0.06, zm + 0.16, m['messing'], 0.004); B('Hohlleiterflansch', 0.14, 0.012, 0.1, u, vf + 0.12, zm + 0.16, m['stahl'], 0.003)
        schrauben([(u + sx * 0.055, zm + 0.16 + sz * 0.035) for sx in (1, -1) for sz in (1, -1)], vf + 0.128, 0.007)
    for k in range(6): C('Koaxbuchse', 0.02, 0.04, -0.38 + k * 0.075, vf + 0.02, zm - 0.1, m['messing'], 'V', n=12, bev=0.002); C('Koaxstift', 0.006, 0.05, -0.38 + k * 0.075, vf + 0.03, zm - 0.1, m['stahl'], 'V', n=6, bev=0)
    schlauch('Koaxkabel', [(-0.38, vf + 0.045, zm - 0.1), (-0.38, vf + 0.07, zm - 0.2), (-0.1, vf + 0.07, zm - 0.22), (0.14, vf + 0.05, zm - 0.2)], 0.012, 'gummi')
    for k in range(3): C('Abstimmknopf', 0.035, 0.03, 0.14 + k * 0.11, vf + 0.015, zm - 0.03, m['dunkel'], 'V', n=16, bev=0.004); B('Knopfmarke', 0.006, 0.004, 0.03, 0.14 + k * 0.11, vf + 0.032, zm - 0.015, m['l_warm'], 0)
    rippen(0.08, 0.44, vf + 0.015, zm - 0.26, zm - 0.12, 9)
    schild(-0.2, vf + 0.006, zm - 0.22, 'WEITBEREICH', 'EMPFÄNGER 40 KM', 0.3, 0.1)
def sy_kuehler():      # Kryo-Kühler FK-220: sechs Kühlkreise, Verdichter, Druckuhr, Frostlicht
    vf, zm = kassette()
    B('Rippenfeld', 0.56, 0.02, 0.36, -0.14, vf + 0.01, zm + 0.02, m['dunkel'], 0.002); rippen(-0.42, 0.14, vf + 0.03, zm - 0.15, zm + 0.19, 22, 0.02, 'rahmen')
    for k in range(6):
        u = -0.37 + k * 0.092
        schlauch('Kuehlkreis', [(u, vf, zm - 0.2), (u, vf + 0.075, zm - 0.2), (u, vf + 0.075, zm + 0.22), (u, vf, zm + 0.22)], 0.015, 'stahl')
        C('Kreisventil', 0.022, 0.03, u, vf + 0.075, zm - 0.24, m['messing'], 'W', n=10, bev=0.003)
    C('Verdichter', 0.1, 0.16, 0.3, vf + 0.08, zm - 0.14, m['weiss'], 'V', n=28, bev=0.01); C('Verdichterdeckel', 0.085, 0.02, 0.3, vf + 0.17, zm - 0.14, m['stahl'], 'V', n=28, bev=0.003)
    for k in range(6): a = 2 * PI * k / 6; C('Deckelschraube', 0.009, 0.012, 0.3 + 0.07 * math.cos(a), vf + 0.182, zm - 0.14 + 0.07 * math.sin(a), m['stahl'], 'V', n=6, bev=0)
    B('Frostlicht', 0.2, 0.01, 0.03, 0.3, vf + 0.006, zm + 0.03, m['l_petrol'], 0.002); uhr(0.3, vf + 0.015, zm + 0.1)
    schild(0.3, vf + 0.006, zm + 0.22, 'FK-220', 'FROSTWERK', 0.2, 0.1)
def sy_ausbau():      # Frachtraum-Ausbau: Lade mit Regalwinkeln, Bolzenkästen, Ladeplan
    vf, zm = kassette(griffe=False)
    B('Lade', 0.6, 0.1, 0.16, -0.14, vf + 0.05, zm - 0.17, m['geh'], 0.008); B('Ladengriff', 0.3, 0.02, 0.02, -0.14, vf + 0.11, zm - 0.12, m['stahl'], 0.004)
    for k in range(6): B('Regalwinkel', 0.52, 0.07, 0.008, -0.14, vf + 0.05, zm - 0.085 + k * 0.012, m['stahl'], 0.001); B('Winkelschenkel', 0.008, 0.07, 0.03, -0.4 + k * 0.006, vf + 0.05, zm - 0.07 + k * 0.012, m['stahl'], 0.001)
    B('Ladeplan', 0.42, 0.01, 0.22, -0.2, vf + 0.006, zm + 0.14, m['schirm'], 0.003)
    for i in range(5):
        for j in range(3): B('Planfeld', 0.06, 0.004, 0.05, -0.36 + i * 0.08, vf + 0.013, zm + 0.07 + j * 0.07, m['l_petrol' if (i + j) % 3 else 'l_warm'], 0)
    for k in range(3):
        B('Bolzenkasten', 0.13, 0.08, 0.1, 0.2 + (k % 2) * 0.15, vf + 0.04, zm + 0.19 - (k // 2) * 0.13, m['gelb'], 0.006)
        for i in range(3): C('Bolzen', 0.012, 0.03, 0.17 + (k % 2) * 0.15 + i * 0.03, vf + 0.07, zm + 0.245 - (k // 2) * 0.13, m['stahl'], 'W', n=6, bev=0)
    B('Schiene', 0.32, 0.03, 0.05, 0.28, vf + 0.015, zm - 0.17, m['stahl'], 0.004)
    for k in range(6): C('Schienenloch', 0.012, 0.008, 0.15 + k * 0.052, vf + 0.032, zm - 0.17, m['dunkel'], 'V', n=8, bev=0)
    schild(0.28, vf + 0.006, zm - 0.05, 'AUSBAUSATZ', 'REGALE · SCHIENEN', 0.3, 0.09)
def sy_prisma():      # Prismenlaser: Glasprisma in der Wiege, zwei Strahlrohre, Strahlteiler
    vf, zm = kassette()
    B('Optikbank', 0.8, 0.12, 0.03, 0, vf + 0.06, zm - 0.18, m['stahl'], 0.004)
    prism('Prisma', [(-0.09, zm - 0.15), (0.09, zm - 0.15), (0.0, zm + 0.02)], -(vf + 0.11), -(vf + 0.02), m['linse'], 'Y', 0.003)
    B('Prismenwiege', 0.24, 0.1, 0.02, 0, vf + 0.065, zm - 0.158, m['messing'], 0.003)
    for sg in (1, -1):
        C('Strahlrohr', 0.045, 0.22, sg * 0.3, vf + 0.065, zm - 0.07, m['blau'], 'U', n=20, bev=0.004); C('Rohrblende', 0.05, 0.02, sg * 0.19, vf + 0.065, zm - 0.07, m['messing'], 'U', n=20, bev=0.002)
        B('Rohrbock', 0.05, 0.08, 0.09, sg * 0.32, vf + 0.065, zm - 0.125, m['rahmen'], 0.004); C('Strahl', 0.008, 0.12, sg * 0.13, vf + 0.065, zm - 0.07, m['l_violett'], 'U', n=8, bev=0)
        B('Strahlteiler', 0.06, 0.06, 0.06, sg * 0.3, vf + 0.05, zm + 0.12, m['linse'], 0.003); B('Teilerfassung', 0.08, 0.07, 0.015, sg * 0.3, vf + 0.05, zm + 0.085, m['messing'], 0.002)
    R('Strahl oben', (-0.3, vf + 0.05, zm + 0.12), (0.3, vf + 0.05, zm + 0.12), 0.006, m['l_violett'], 8)
    B('Warnschild', 0.2, 0.008, 0.07, 0, vf + 0.006, zm + 0.22, m['gelb'], 0.002); Tx('LASER KLASSE 4', 0.022, 0, vf + 0.012, zm + 0.212, 'schrift_d')
    schild(0, vf + 0.006, zm - 0.245, 'PRISMENLASER', '', 0.34, 0.05)
def sy_sonde():      # Tiefensonde: Senderring mit Geberkegel, Spiralkabel, zwei Schirme
    vf, zm = kassette()
    ring('Senderring', 0.19, 0.035, tuple(W.P(-0.2, vf + 0.06, zm)), (0, 1, 0), m['kupfer'], 40); C('Ringtraeger', 0.215, 0.03, -0.2, vf + 0.015, zm, m['rahmen'], 'V', n=40, bev=0.004)
    C('Geberkegel', 0.1, 0.11, -0.2, vf + 0.07, zm, m['keramik'], 'V', n=28, bev=0, r2=0.02); ring('Geberglut', 0.105, 0.01, tuple(W.P(-0.2, vf + 0.032, zm)), (0, 1, 0), m['l_petrol'], 28)
    for k in range(8): a = 2 * PI * k / 8; R('Ringstrebe', (-0.2 + 0.1 * math.cos(a), vf + 0.03, zm + 0.1 * math.sin(a)), (-0.2 + 0.19 * math.cos(a), vf + 0.06, zm + 0.19 * math.sin(a)), 0.008, m['stahl'], 6)
    for k in range(2):
        B('Echoschirm', 0.26, 0.01, 0.16, 0.24, vf + 0.006, zm + 0.16 - k * 0.2, m['schirm'], 0.003)
        for i in range(4): ring('Echokreis', 0.015 + i * 0.016, 0.003, tuple(W.P(0.24, vf + 0.013, zm + 0.16 - k * 0.2)), (0, 1, 0), m['l_petrol'], 16)
    for k in range(9): ring('Spiralkabel', 0.022, 0.007, tuple(W.P(0.02 + k * 0.012, vf + 0.035, zm - 0.22)), (1, 0, 0), m['gummi'], 10)
    C('Kabelbuchse', 0.03, 0.04, 0.14, vf + 0.035, zm - 0.22, m['stahl'], 'U', n=12, bev=0.003)
    schild(0.26, vf + 0.006, zm - 0.22, 'TIEFENSONDE', '', 0.3, 0.05)
def sy_kompressor():      # Frachtkompressor: zwei Hydraulikzylinder, Pressplatte, Schläuche, drei Druckuhren
    vf, zm = kassette()
    B('Pressrahmen', 0.86, 0.1, 0.05, 0, vf + 0.05, zm - 0.22, m['gelb'], 0.006); B('Pressplatte', 0.08, 0.11, 0.3, 0.2, vf + 0.055, zm - 0.03, m['stahl'], 0.006)
    B('Gegenplatte', 0.06, 0.11, 0.32, 0.4, vf + 0.055, zm - 0.03, m['rahmen'], 0.006); B('Erzblock', 0.1, 0.09, 0.2, 0.3, vf + 0.055, zm - 0.07, m['ferrox2'], 0.01)
    for dz in (-0.12, 0.08):
        C('Zylinderrohr', 0.055, 0.34, -0.2, vf + 0.06, zm + dz, m['dunkel'], 'U', n=22, bev=0.006); C('Kolbenstange', 0.024, 0.2, 0.07, vf + 0.06, zm + dz, m['stahl'], 'U', n=14, bev=0)
        for u in (-0.36, -0.04): C('Zylinderkopf', 0.065, 0.04, u, vf + 0.06, zm + dz, m['rahmen'], 'U', n=22, bev=0.004)
        schlauch('Druckschlauch', [(-0.36, vf + 0.11, zm + dz), (-0.36, vf + 0.14, zm + dz + 0.05), (-0.42, vf + 0.1, zm + 0.2)], 0.014, 'gummi')
    B('Ventilblock', 0.16, 0.08, 0.1, -0.36, vf + 0.04, zm + 0.22, m['rahmen'], 0.006)
    for k in range(3): uhr(-0.2 + k * 0.13, vf + 0.015, zm + 0.22, 0.045, 0.25 + k * 0.2)
    B('Schutzleiste', 0.5, 0.012, 0.04, 0.2, vf + 0.115, zm + 0.16, m['gelb'], 0.003)
    schild(0.28, vf + 0.006, zm + 0.235, 'KOMPRESSOR', '', 0.26, 0.05)
def sy_resonator():      # Erzresonator: fünf Schwingstäbe auf dem Treiber, Spule, Gummilager
    vf, zm = kassette()
    B('Treiberblock', 0.62, 0.1, 0.1, -0.1, vf + 0.05, zm - 0.2, m['rahmen'], 0.008)
    for k in range(5):
        u = -0.34 + k * 0.12; h = 0.2 + k * 0.045
        B('Schwingstab', 0.035, 0.035, h, u, vf + 0.06, zm - 0.14 + h / 2, m['stahl'], 0.004); C('Stablager', 0.03, 0.02, u, vf + 0.06, zm - 0.14, m['gummi'], 'W', n=12, bev=0.003)
        C('Stabspule', 0.032, 0.05, u, vf + 0.06, zm - 0.09, m['kupfer'], 'W', n=14, bev=0.003); B('Stabmarke', 0.036, 0.004, 0.012, u, vf + 0.08, zm - 0.14 + h - 0.03, m['l_warm'], 0)
    B('Glutleiste', 0.6, 0.008, 0.02, -0.1, vf + 0.102, zm - 0.2, m['l_warm'], 0.002)
    C('Stimmrad', 0.07, 0.03, 0.32, vf + 0.02, zm + 0.1, m['dunkel'], 'V', n=24, bev=0.005); B('Radmarke', 0.008, 0.004, 0.06, 0.32, vf + 0.037, zm + 0.125, m['l_petrol'], 0)
    B('Frequenzschirm', 0.2, 0.01, 0.1, 0.32, vf + 0.006, zm - 0.06, m['schirm'], 0.003)
    for k in range(5): B('Frequenzbalken', 0.02, 0.004, 0.02 + k * 0.014, 0.25 + k * 0.035, vf + 0.013, zm - 0.1 + (0.02 + k * 0.014) / 2, m['l_petrol'], 0)
    schild(0.32, vf + 0.006, zm - 0.2, 'ERZRESONATOR', '', 0.24, 0.05)
def sy_orakel():      # Orakel-Kern (legendär, Ferrox): Rechnerkern aus Rosteisen in Klauen, glühende Fugen, roh angeflanschte Kabel
    vf, zm = kassette(mat='rahmen')
    B('Aussparung', 0.5, 0.02, 0.5, -0.14, vf + 0.004, zm, m['dunkel'], 0.004)
    c = W.P(-0.14, vf + 0.13, zm); sphere('Orakelkern', 0.15, c.x, c.y, c.z, m['ferrox'], 10)
    for nrm in ((0, 0, 1), (1, 0, 0.4), (-0.6, 0, 1), (0.3, 1, 0.2)): ring('Kernfuge', 0.152, 0.008, tuple(c), nrm, m['l_glut'], 24)
    for k in range(4):
        a = PI / 4 + k * PI / 2; R('Klaue', (-0.14 + 0.25 * math.cos(a), vf + 0.01, zm + 0.25 * math.sin(a)), (-0.14 + 0.12 * math.cos(a), vf + 0.16, zm + 0.12 * math.sin(a)), 0.02, m['ferrox2'], 8)
        B('Klauenfuss', 0.07, 0.03, 0.07, -0.14 + 0.25 * math.cos(a), vf + 0.015, zm + 0.25 * math.sin(a), m['stahl'], 0.006)
    for k in range(5): schlauch('Spleisskabel', [(-0.03, vf + 0.14, zm - 0.06 + k * 0.03), (0.12, vf + 0.1, zm - 0.14 + k * 0.07), (0.22, vf + 0.03, zm - 0.16 + k * 0.08)], 0.008, ('gummi', 'rot', 'gummi', 'kupfer', 'gummi')[k], 6)
    B('Adapterplatte', 0.2, 0.03, 0.42, 0.32, vf + 0.015, zm, m['geh'], 0.006)
    for k in range(5): C('Adapterbuchse', 0.016, 0.02, 0.26, vf + 0.035, zm - 0.16 + k * 0.08, m['messing'], 'V', n=8, bev=0); B('Adapterlicht', 0.03, 0.006, 0.012, 0.36, vf + 0.032, zm - 0.16 + k * 0.08, m['l_glut' if k % 2 else 'l_petrol'], 0)
    B('Warnschild', 0.18, 0.008, 0.05, 0.32, vf + 0.034, zm + 0.235, m['gelb'], 0.002); Tx('FERROX-TEIL', 0.02, 0.32, vf + 0.04, zm + 0.228, 'schrift_d')
    schild(-0.14, vf + 0.006, zm - 0.265, 'ORAKEL-KERN', '', 0.3, 0.04)
def sy_herz():      # Herz der Flotte (legendär): kleiner Reaktor mit leuchtender Säule im Käfig, Messingbeschläge, Wappenplatte
    vf, zm = kassette(mat='rahmen')
    C('Reaktorfuss', 0.17, 0.05, -0.12, vf + 0.09, zm - 0.22, m['messing'], 'W', n=32, bev=0.008); C('Reaktorkopf', 0.17, 0.05, -0.12, vf + 0.09, zm + 0.22, m['messing'], 'W', n=32, bev=0.008)
    C('Reaktorsaeule', 0.085, 0.4, -0.12, vf + 0.09, zm, m['l_weiss'], 'W', n=24, bev=0)
    for k in range(4): ring('Saeulenring', 0.1, 0.012, tuple(W.P(-0.12, vf + 0.09, zm - 0.15 + k * 0.1)), (0, 0, 1), m['messing'], 28)
    for k in range(8): a = 2 * PI * k / 8; R('Kaefigstab', (-0.12 + 0.145 * math.cos(a), vf + 0.09 - 0.145 * math.sin(a), zm - 0.2), (-0.12 + 0.145 * math.cos(a), vf + 0.09 - 0.145 * math.sin(a), zm + 0.2), 0.009, m['stahl'], 6)
    for sg in (1, -1): schlauch('Kuehlleitung', [(-0.12 + sg * 0.15, vf + 0.05, zm + 0.24), (-0.12 + sg * 0.26, vf + 0.04, zm + 0.24), (-0.12 + sg * 0.26, vf + 0.04, zm - 0.24), (-0.12 + sg * 0.15, vf + 0.05, zm - 0.24)], 0.014, 'kupfer')
    rippen(0.22, 0.44, vf + 0.02, zm - 0.24, zm + 0.02, 8, 0.04, 'stahl')
    B('Wappenplatte', 0.24, 0.012, 0.16, 0.33, vf + 0.008, zm + 0.16, m['messing'], 0.004); Tx('FLAGGSCHIFF', 0.024, 0.33, vf + 0.016, zm + 0.185, 'schrift_d'); Tx('REAKTOR I', 0.03, 0.33, vf + 0.016, zm + 0.135, 'schrift_d')
    schrauben([(0.33 + sx * 0.1, zm + 0.16 + sz * 0.06) for sx in (1, -1) for sz in (1, -1)], vf + 0.016, 0.008, 'messing')
    schild(-0.12, vf + 0.006, zm - 0.268, 'HERZ DER FLOTTE', '', 0.36, 0.035)

# ============================== WAFFENSYSTEME (offenes Gestell) ==============================
def wbasis(name, sub=''):      # Grundplatte, Rückwand und Typenschild aller Waffenmodule
    B('Grundplatte', 1.0, 0.44, 0.04, 0, 0.27, 0.04, m['rahmen'], 0.008); B('Rueckwand', 1.0, 0.03, 0.84, 0, 0.065, 0.47, m['geh'], 0.006)
    for sg in (1, -1): B('Seitenholm', 0.03, 0.4, 0.06, sg * 0.485, 0.27, 0.09, m['gelb'], 0.004)
    schild(0, 0.49, 0.045, name, sub, 0.5, 0.05 if not sub else 0.07)
def sw_lauf():      # Gehärtete Läufe: zwei Ersatzläufe in Klemmen, Härteprüfer, Prüfmarken
    wbasis('GEHÄRTETE LÄUFE')
    for k, w in enumerate((0.62, 0.36)):
        C('Lauf', 0.04, 0.9, 0, 0.28, w, m['blau'], 'U', n=20, bev=0.003); C('Laufseele', 0.022, 0.91, 0, 0.28, w, m['dunkel'], 'U', n=12, bev=0)
        C('Laufverstaerkung', 0.055, 0.22, -0.3, 0.28, w, m['blau'], 'U', n=20, bev=0.004); C('Muendungsring', 0.048, 0.03, 0.44, 0.28, w, m['stahl'], 'U', n=20, bev=0.002)
        for u in (-0.2, 0.22):
            B('Laufklemme', 0.06, 0.16, 0.13, u, 0.28, w - 0.01, m['rahmen'], 0.006); B('Klemmbuegel', 0.065, 0.12, 0.02, u, 0.28, w + 0.06, m['gelb'], 0.003)
            for dv in (-0.05, 0.05): C('Klemmschraube', 0.01, 0.03, u, 0.28 + dv, w + 0.075, m['stahl'], 'W', n=6, bev=0)
            R('Klemmstuetze', (u, 0.1, w - 0.01), (u, 0.2, w - 0.01), 0.02, m['rahmen'], 8)
        B('Pruefmarke', 0.07, 0.004, 0.05, 0.05 + k * 0.1, 0.322, w, m['weiss'], 0.001)
    B('Haertepruefer', 0.2, 0.14, 0.14, -0.33, 0.3, 0.14, m['geh'], 0.008); B('Prueferschirm', 0.12, 0.006, 0.06, -0.33, 0.372, 0.16, m['schirm'], 0.002); C('Pruefspitze', 0.012, 0.08, -0.33, 0.3, 0.24, m['stahl'], 'W', n=8, bev=0, r2=0.002)
    B('Kuehlbad', 0.36, 0.16, 0.1, 0.2, 0.3, 0.11, m['dunkel'], 0.008); B('Badspiegel', 0.32, 0.12, 0.006, 0.2, 0.3, 0.158, m['linse'], 0)
def sw_lader():      # Schnelllader: Gurttrommel mit Zahnkranz, Zuführschiene mit Patronen, Motor, Kettenschutz
    wbasis('SCHNELLLADER')
    C('Gurttrommel', 0.28, 0.2, -0.16, 0.26, 0.5, m['geh'], 'V', n=44, bev=0.01); C('Trommeldeckel', 0.24, 0.02, -0.16, 0.37, 0.5, m['rahmen'], 'V', n=44, bev=0.004)
    C('Trommelnabe', 0.06, 0.05, -0.16, 0.39, 0.5, m['stahl'], 'V', n=20, bev=0.004)
    for k in range(6): a = 2 * PI * k / 6; R('Deckelspeiche', (-0.16 + 0.06 * math.cos(a), 0.385, 0.5 + 0.06 * math.sin(a)), (-0.16 + 0.23 * math.cos(a), 0.385, 0.5 + 0.23 * math.sin(a)), 0.012, m['stahl'], 6)
    for k in range(28): a = 2 * PI * k / 28; B('Zahn', 0.02, 0.03, 0.03, -0.16 + 0.29 * math.cos(a), 0.18, 0.5 + 0.29 * math.sin(a), m['stahl'], 0.002)
    B('Zufuehrschiene', 0.46, 0.09, 0.05, 0.24, 0.26, 0.76, m['rahmen'], 0.005)
    for k in range(9): C('Patrone', 0.016, 0.075, 0.05 + k * 0.047, 0.26, 0.795, m['messing'], 'V', n=10, bev=0.002); C('Geschoss', 0.014, 0.03, 0.05 + k * 0.047, 0.31, 0.795, m['kupfer'], 'V', n=10, bev=0, r2=0.004)
    C('Lademotor', 0.09, 0.2, 0.3, 0.26, 0.3, m['dunkel'], 'U', n=24, bev=0.008); C('Motorwelle', 0.02, 0.1, 0.14, 0.26, 0.3, m['stahl'], 'U', n=10, bev=0)
    C('Ritzel', 0.045, 0.03, 0.1, 0.26, 0.3, m['stahl'], 'U', n=14, bev=0.003); B('Kettenschutz', 0.05, 0.12, 0.36, 0.1, 0.26, 0.46, m['gelb'], 0.01)
    rippen(0.24, 0.42, 0.26, 0.4, 0.44, 6, 0.16, 'rahmen'); B('Taktlicht', 0.1, 0.008, 0.02, 0.3, 0.36, 0.2, m['l_petrol'], 0.002)
    schlauch('Motorkabel', [(0.4, 0.26, 0.3), (0.45, 0.26, 0.3), (0.45, 0.14, 0.14)], 0.012, 'gummi')
def sw_zielrechner():      # Zielrechner Mk II: drei Steckkarten, Schirm mit Zielkreuz, Tastenfeld, Kreiselgeber
    wbasis('ZIELRECHNER MK II')
    B('Rechnergehaeuse', 0.9, 0.3, 0.7, 0, 0.24, 0.46, m['geh'], 0.012)
    for k in range(3):
        u = -0.3 + k * 0.13; B('Steckkarte', 0.1, 0.03, 0.5, u, 0.4, 0.46, m['rahmen'], 0.004); B('Kartengriff', 0.06, 0.03, 0.02, u, 0.43, 0.68, m['stahl'], 0.004)
        for j in range(6): B('Kartenlicht', 0.012, 0.004, 0.012, u - 0.025, 0.417, 0.28 + j * 0.06, m[('l_petrol', 'l_warm', 'l_petrol', 'l_weiss', 'l_petrol', 'l_rot')[(j + k) % 6]], 0)
        schrauben([(u, 0.23), (u, 0.69)], 0.418, 0.008)
    B('Zielschirm', 0.34, 0.01, 0.3, 0.24, 0.396, 0.56, m['schirm'], 0.003); B('Schirmrahmen', 0.38, 0.02, 0.34, 0.24, 0.39, 0.56, m['dunkel'], 0.006)
    ring('Zielkreis', 0.07, 0.004, tuple(W.P(0.24, 0.404, 0.56)), (0, 1, 0), m['l_petrol'], 24); ring('Zielkreis', 0.03, 0.003, tuple(W.P(0.24, 0.404, 0.56)), (0, 1, 0), m['l_petrol'], 16)
    B('Zielstrich', 0.2, 0.003, 0.004, 0.24, 0.404, 0.56, m['l_petrol'], 0); B('Zielstrich', 0.004, 0.003, 0.2, 0.24, 0.404, 0.56, m['l_petrol'], 0); B('Zielmarke', 0.02, 0.003, 0.02, 0.29, 0.405, 0.6, m['l_warm'], 0)
    for i in range(4):
        for j in range(3): B('Taste', 0.045, 0.012, 0.035, 0.12 + i * 0.07, 0.396, 0.23 + j * 0.05, m['dunkel' if (i + j) % 4 else 'gelb'], 0.004)
    C('Kreiselgeber', 0.07, 0.06, -0.36, 0.25, 0.86, m['stahl'], 'W', n=24, bev=0.006); ring('Geberring', 0.075, 0.008, tuple(W.P(-0.36, 0.25, 0.86)), (0, 0, 1), m['l_petrol'], 24)
    for k in range(4): schlauch('Kabelbaum', [(-0.25 + k * 0.03, 0.2, 0.81), (-0.25 + k * 0.03, 0.2, 0.86), (0.1 + k * 0.03, 0.2, 0.86), (0.1 + k * 0.03, 0.2, 0.81)], 0.008, ('gummi', 'rot', 'gummi', 'kupfer')[k], 6)
def sw_rotation():      # Rotationsverschluss: Trommel mit sechs Kammern, Zahnkranz, Antrieb, Schaltklinke
    wbasis('ROTATIONSVERSCHLUSS', 'SECHS KAMMERN · EIN LAUF')
    C('Kammertrommel', 0.2, 0.36, -0.08, 0.28, 0.52, m['blau'], 'U', n=40, bev=0.008)
    for k in range(6):
        a = 2 * PI * k / 6; v_, w_ = 0.28 + 0.12 * math.cos(a), 0.52 + 0.12 * math.sin(a)
        C('Kammer', 0.042, 0.37, -0.08, v_, w_, m['dunkel'], 'U', n=16, bev=0); C('Kammerring', 0.05, 0.012, 0.102, v_, w_, m['messing'], 'U', n=16, bev=0.002)
        R('Trommelnut', (-0.24, 0.28 + 0.2 * math.cos(a + PI / 6), 0.52 + 0.2 * math.sin(a + PI / 6)), (0.08, 0.28 + 0.2 * math.cos(a + PI / 6), 0.52 + 0.2 * math.sin(a + PI / 6)), 0.012, m['dunkel'], 6)
    C('Zahnkranz', 0.225, 0.04, -0.29, 0.28, 0.52, m['stahl'], 'U', n=40, bev=0.003)
    for k in range(30): a = 2 * PI * k / 30; B('Kranzzahn', 0.04, 0.02, 0.02, -0.29, 0.28 + 0.235 * math.cos(a), 0.52 + 0.235 * math.sin(a), m['stahl'], 0.002)
    for u in (-0.34, 0.14): B('Trommellager', 0.05, 0.3, 0.42, u, 0.27, 0.3, m['rahmen'], 0.01)
    C('Trommelachse', 0.035, 0.6, -0.1, 0.28, 0.52, m['stahl'], 'U', n=14, bev=0.003)
    C('Lauf', 0.05, 0.28, 0.3, 0.28 + 0.12, 0.52, m['blau'], 'U', n=18, bev=0.004); B('Laufbock', 0.08, 0.14, 0.44, 0.32, 0.4, 0.3, m['rahmen'], 0.008)
    C('Antrieb', 0.07, 0.16, -0.3, 0.3, 0.2, m['dunkel'], 'U', n=20, bev=0.006); C('Antriebsritzel', 0.05, 0.03, -0.29, 0.3, 0.28, m['stahl'], 'U', n=14, bev=0.003)
    R('Schaltklinke', (-0.08, 0.44, 0.74), (-0.08, 0.34, 0.7), 0.014, m['gelb'], 8); feder(W.P(-0.08, 0.46, 0.78), (0, 0.4, -1), 0.016, 0.004, 0.08, 7)
def sw_gauss():      # Gauss-Beschleuniger: Rohr mit fünf Spulenringen, Flansche, Glut, Kondensatorbank, Stromschienen
    wbasis('GAUSS-BESCHLEUNIGER')
    zm = 0.6
    C('Beschleunigerrohr', 0.08, 0.98, 0, 0.27, zm, m['stahl'], 'U', n=28)
    for k in range(5):
        u = -0.38 + k * 0.19; C('Spulenring', 0.16, 0.055, u, 0.27, zm, m['kupfer'], 'U', n=32, bev=0.01); C('Spulenflansch', 0.12, 0.09, u, 0.27, zm, m['dunkel'], 'U', n=28, bev=0.005)
        for j in range(8): a = 2 * PI * j / 8; C('Flanschbolzen', 0.008, 0.1, u, 0.27 + 0.105 * math.cos(a), zm + 0.105 * math.sin(a), m['stahl'], 'U', n=6, bev=0)
        R('Spulenzuleitung', (u, 0.27, zm - 0.16), (u, 0.27, 0.34), 0.012, m['kupfer'], 8)
    for k in range(4): C('Spulenglut', 0.095, 0.015, -0.285 + k * 0.19, 0.27, zm, m['l_petrol'], 'U', n=24, bev=0)
    for sg in (1, -1): B('Rohrlager', 0.05, 0.3, 0.5, sg * 0.47, 0.25, zm - 0.2, m['rahmen'], 0.008)
    B('Kondensatorbank', 0.9, 0.34, 0.1, 0, 0.26, 0.11, m['dunkel'], 0.01); B('Stromschiene', 0.86, 0.03, 0.02, 0, 0.27, 0.34, m['kupfer'], 0.003)
    for k in range(8):
        u = -0.385 + k * 0.11; B('Kondensator', 0.075, 0.3, 0.2, u, 0.27, 0.24, m['geh'], 0.012); C('Pol', 0.012, 0.03, u, 0.2, 0.345, m['messing'], 'W', n=8, bev=0); B('Ladelicht', 0.03, 0.004, 0.012, u, 0.422, 0.3, m['l_petrol' if k % 3 else 'l_warm'], 0)
    R('Ladeleitung', (0.44, 0.38, 0.3), (0.44, 0.38, zm), 0.02, m['rot'], 8); B('Warnschild', 0.2, 0.006, 0.05, -0.3, 0.44, 0.83, m['gelb'], 0.002); Tx('HOCHSPANNUNG', 0.02, -0.3, 0.446, 0.822, 'schrift_d')
def sw_zwilling():      # Zwillingslafette: zwei Verschlüsse mit Rücklauffedern, Koppelstange, Laufstummel, Wechselschieber
    wbasis('ZWILLINGSLAFETTE')
    B('Lafettenwiege', 0.86, 0.34, 0.08, 0, 0.26, 0.2, m['rahmen'], 0.01)
    for sg in (1, -1):
        u = sg * 0.2
        B('Verschlussblock', 0.2, 0.3, 0.22, u, 0.25, 0.36, m['blau'], 0.012); B('Verschlussdeckel', 0.16, 0.2, 0.03, u, 0.25, 0.485, m['geh'], 0.006)
        C('Laufstummel', 0.045, 0.14, u, 0.44, 0.38, m['blau'], 'V', n=18, bev=0.004); C('Laufbuchse', 0.06, 0.04, u, 0.4, 0.38, m['stahl'], 'V', n=18, bev=0.003)
        feder(W.P(u, 0.25, 0.62), (0, 0, 1), 0.04, 0.008, 0.2, 9); R('Federstange', (u, 0.25, 0.5), (u, 0.25, 0.74), 0.014, m['stahl'], 8); B('Federteller', 0.11, 0.11, 0.02, u, 0.25, 0.74, m['rahmen'], 0.004)
        B('Auswurf', 0.05, 0.06, 0.09, u + sg * 0.11, 0.25, 0.38, m['dunkel'], 0.004); B('Schusslicht', 0.05, 0.006, 0.02, u, 0.402, 0.47, m['l_warm' if sg > 0 else 'l_petrol'], 0)
        schrauben([(u + sx * 0.07, 0.3 + sz * 0.06) for sx in (1, -1) for sz in (1, -1)], 0.402, 0.009)
    B('Koppelstange', 0.44, 0.03, 0.03, 0, 0.25, 0.8, m['gelb'], 0.004); C('Koppelgelenk', 0.03, 0.05, 0, 0.25, 0.8, m['stahl'], 'V', n=14, bev=0.004)
    B('Wechselschieber', 0.12, 0.1, 0.05, 0, 0.3, 0.52, m['messing'], 0.006); R('Schieberbahn', (-0.2, 0.3, 0.52), (0.2, 0.3, 0.52), 0.012, m['stahl'], 8)
    for sg in (1, -1): B('Zufuhrschacht', 0.08, 0.12, 0.3, sg * 0.4, 0.2, 0.55, m['geh'], 0.006)
def sw_lanze():      # Ferrox-Lanze (legendär, Ferrox): Lanzenstück aus Rosteisen in schweren Klammern, glühender Schlitz, Ketten, Warnung
    wbasis('FERROX-LANZE', 'NICHT BERÜHREN')
    C('Lanzenschaft', 0.11, 0.5, -0.2, 0.28, 0.56, m['ferrox'], 'U', n=9, bev=0); C('Lanzenspitze', 0.11, 0.42, 0.26, 0.28, 0.56, m['ferrox'], 'U', n=9, bev=0, r2=0.012)
    for k in range(4): C('Lanzenwulst', 0.13, 0.03, -0.4 + k * 0.13, 0.28, 0.56, m['ferrox2'], 'U', n=9, bev=0)
    B('Glutschlitz', 0.7, 0.006, 0.025, 0.0, 0.176, 0.56, m['l_glut'], 0); B('Glutschlitz', 0.6, 0.025, 0.006, -0.1, 0.28, 0.672, m['l_glut'], 0)
    for k in range(5): C('Glutpore', 0.014, 0.01, -0.36 + k * 0.14, 0.172, 0.6 - (k % 2) * 0.08, m['l_glut'], 'V', n=8, bev=0)
    for u in (-0.3, 0.02):
        B('Klammer unten', 0.08, 0.34, 0.3, u, 0.27, 0.27, m['rahmen'], 0.01); B('Klammer oben', 0.08, 0.34, 0.06, u, 0.27, 0.71, m['gelb'], 0.008)
        for dv in (-0.14, 0.14): R('Klammerbolzen', (u, 0.27 + dv, 0.4), (u, 0.27 + dv, 0.76), 0.016, m['stahl'], 8); C('Bolzenmutter', 0.026, 0.02, u, 0.27 + dv, 0.75, m['stahl'], 'W', n=6, bev=0)
    for k in range(7): ring('Kettenglied', 0.028, 0.008, tuple(W.P(0.3 + (k % 2) * 0.004, 0.3, 0.44 - k * 0.045)), (1, 0, 0) if k % 2 else (0, 1, 0), m['stahl'], 10)
    B('Kettenanker', 0.08, 0.08, 0.05, 0.3, 0.3, 0.11, m['rahmen'], 0.006)
    B('Daempferkasten', 0.24, 0.2, 0.2, -0.33, 0.3, 0.83 - 0.66, m['geh'], 0.01); B('Daempferschirm', 0.14, 0.006, 0.07, -0.33, 0.402, 0.19, m['schirm'], 0.002); B('Alarmlicht', 0.05, 0.006, 0.03, -0.25, 0.402, 0.1, m['l_rot'], 0)
    for k in range(3): schlauch('Fesselkabel', [(-0.3 + k * 0.03, 0.3, 0.28), (-0.36 + k * 0.03, 0.34, 0.4), (-0.42 + k * 0.03, 0.3, 0.52)], 0.009, 'gummi', 6)

# ============================== ABWEHRSYSTEME (Schildbock, um die Hochachse) ==============================
def afuss(name, r=0.36):      # Standring mit Typenschild vorn
    cyl('Standring', r, 0.06, 0, 0, 0.03, m['rahmen'], 'Z', n=40, bev=0.008)
    for k in range(8): a = 2 * PI * k / 8; cyl('Standschraube', 0.014, 0.012, (r - 0.04) * math.cos(a), (r - 0.04) * math.sin(a), 0.064, m['stahl'], 'Z', n=6, bev=0)
    B('Typenschild', 0.34, 0.012, 0.045, 0, r + 0.004, 0.03, m['dunkel'], 0.002); Tx(name, min(0.03, 0.44 / len(name)), 0, r + 0.012, 0.02)
def sa_platten():      # Schottplatten: fünf Panzerplatten im Gestell, Abstandshalter, Spannschrauben, Gurt
    afuss('SCHOTTPLATTEN')
    box('Plattenbett', 0.56, 0.5, 0.05, 0, 0, 0.085, m['rahmen'], 0.008)
    for k in range(5):
        y = -0.16 + k * 0.08; box('Panzerplatte', 0.5, 0.045, 0.86, 0, y, 0.54, m['blau' if k % 2 else 'stahl'], 0.008)
        for sx in (1, -1):
            for z in (0.25, 0.83): cyl('Plattenniet', 0.014, 0.05, sx * 0.2, y, z, m['dunkel'], 'Y', n=8, bev=0)
        if k < 4:
            for sx in (1, -1): box('Abstandshalter', 0.05, 0.035, 0.05, sx * 0.21, y + 0.04, 0.95, m['gelb'], 0.003)
    for sx in (1, -1):
        rod('Spannstange', Vector((sx * 0.27, -0.2, 0.7)), Vector((sx * 0.27, 0.2, 0.7)), 0.012, m['stahl'], 8)
        for sy in (1, -1): cyl('Spannmutter', 0.024, 0.02, sx * 0.27, sy * 0.2, 0.7, m['messing'], 'Y', n=6, bev=0)
        box('Gestellholm', 0.03, 0.46, 0.9, sx * 0.265, 0, 0.55, m['rahmen'], 0.006)
    for z in (0.35, 0.8): box('Gurtband', 0.56, 0.47, 0.03, 0, 0, z, m['gurt'], 0.002); box('Gurtschloss', 0.07, 0.02, 0.05, 0.1, -0.245, z, m['stahl'], 0.004)
    box('Lastschild', 0.2, 0.006, 0.08, -0.12, -0.19, 0.6, m['weiss'], 0.001); text('40 MM', 0.035, (-0.12, -0.194, 0.585), (1, 0, 0), (0, 0, 1), m['schrift_d'], align='CENTER', name='Modulschrift')
def sa_kondensator():      # Schildkondensator: großer Becher mit Keramikisolatoren, zwei Polen, Kühlrippen, Ladebändern
    afuss('SCHILDKONDENSATOR')
    cyl('Becher', 0.27, 0.72, 0, 0, 0.44, m['petrol'], 'Z', n=44, bev=0.02); cyl('Becherdeckel', 0.25, 0.04, 0, 0, 0.82, m['rahmen'], 'Z', n=44, bev=0.006)
    for k in range(20): a = 2 * PI * k / 20; box('Becherrippe', 0.05, 0.012, 0.36, 0.29 * math.cos(a), 0.29 * math.sin(a), 0.3, m['rahmen'], 0.002, rot=(0, 0, a))
    for k in range(3): ring('Ladeband', 0.275, 0.012, (0, 0, 0.56 + k * 0.08), (0, 0, 1), m['l_petrol' if k < 2 else 'l_warm'], 44)
    for sx in (1, -1):
        for j in range(4): cyl('Isolator', 0.07 - j * 0.008, 0.03, sx * 0.12, 0, 0.86 + j * 0.035, m['keramik'], 'Z', n=20, bev=0.006)
        cyl('Pol', 0.022, 0.1, sx * 0.12, 0, 1.03, m['messing'], 'Z', n=12, bev=0.003); cyl('Polmutter', 0.035, 0.02, sx * 0.12, 0, 1.0, m['messing'], 'Z', n=6, bev=0)
    rod('Polbruecke', Vector((-0.12, 0, 1.07)), Vector((0.12, 0, 1.07)), 0.016, m['kupfer'], 8); rod('Steigleitung', Vector((0, 0, 1.07)), Vector((0, 0, 1.2)), 0.04, m['kupfer'], 12)
    cyl('Ueberdruckventil', 0.03, 0.06, 0, 0.16, 0.86, m['stahl'], 'Z', n=12, bev=0.004); box('Warnfeld', 0.14, 0.006, 0.1, 0, -0.272, 0.72, m['gelb'], 0.001)
    text('60 KV', 0.035, (0, -0.276, 0.705), (1, 0, 0), (0, 0, 1), m['schrift_d'], align='CENTER', name='Modulschrift')
def sa_waben():      # Wabenpanzerung: Wabenplatte aus Sechskantzellen im Rahmen, Prüfgerät
    afuss('WABENPANZERUNG')
    box('Wabenrahmen', 0.66, 0.1, 0.05, 0, 0, 0.1, m['rahmen'], 0.008); box('Wabenrahmen', 0.66, 0.1, 0.05, 0, 0, 1.05, m['rahmen'], 0.008)
    for sx in (1, -1): box('Wabenholm', 0.05, 0.1, 0.95, sx * 0.31, 0, 0.575, m['rahmen'], 0.008)
    r = 0.062
    for i in range(-3, 4):
        for j in range(8):
            x = i * r * 1.5; z = 0.2 + j * r * 1.732 + (r * 0.866 if i % 2 else 0)
            if abs(x) > 0.27 or z > 0.98: continue
            pts = [(x + (r - 0.008) * math.cos(a * PI / 3), z + (r - 0.008) * math.sin(a * PI / 3)) for a in range(6)]
            prism('Wabe', pts, -0.035, 0.035, m['stahl' if (i + j) % 5 else 'blau'], 'Y', 0.004)
    box('Wabenruecken', 0.58, 0.012, 0.9, 0, 0.045, 0.575, m['dunkel'], 0.002)
    box('Pruefgeraet', 0.2, 0.12, 0.14, 0.14, -0.14, 0.16, m['geh'], 0.008); box('Pruefschirm', 0.12, 0.006, 0.07, 0.14, -0.202, 0.17, m['schirm'], 0.002)
    rod('Pruefkabel', Vector((0.2, -0.1, 0.23)), Vector((0.24, -0.04, 0.5)), 0.008, m['gummi'], 6); cyl('Pruefkopf', 0.03, 0.03, 0.24, -0.045, 0.5, m['messing'], 'Y', n=12, bev=0.003)
def sa_projektor():      # Schildprojektor Typ B: Säule mit Emitterschale, drei Streben, Glutring, Hohlleiter
    afuss('SCHILDPROJEKTOR B')
    cyl('Projektorfuss', 0.2, 0.2, 0, 0, 0.16, m['geh'], 'Z', n=32, bev=0.02); cyl('Projektorsaeule', 0.09, 0.5, 0, 0, 0.5, m['dunkel'], 'Z', n=24, bev=0.006)
    cyl('Emitterschale', 0.1, 0.2, 0, 0, 0.85, m['weiss'], 'Z', n=44, bev=0, r2=0.34); cyl('Schalenrand', 0.345, 0.025, 0, 0, 0.955, m['stahl'], 'Z', n=44, bev=0.004)
    cyl('Emitterkern', 0.05, 0.16, 0, 0, 1.0, m['keramik'], 'Z', n=16, bev=0.004); sphere('Emitterspitze', 0.055, 0, 0, 1.1, m['l_blau'], 16)
    ring('Emitterglut', 0.3, 0.012, (0, 0, 0.972), (0, 0, 1), m['l_blau'], 44)
    for k in range(3):
        a = PI / 2 + k * 2 * PI / 3; rod('Schalenstrebe', Vector((0.19 * math.cos(a), 0.19 * math.sin(a), 0.24)), Vector((0.3 * math.cos(a), 0.3 * math.sin(a), 0.86)), 0.014, m['stahl'], 8)
        box('Phasenschieber', 0.1, 0.07, 0.12, 0.15 * math.cos(a + 1.05), 0.15 * math.sin(a + 1.05), 0.52, m['geh'], 0.008, rot=(0, 0, a + 1.05)); box('Schieberlicht', 0.03, 0.03, 0.012, 0.15 * math.cos(a + 1.05), 0.15 * math.sin(a + 1.05), 0.585, m['l_petrol'], 0)
    box('Hohlleiter', 0.07, 0.05, 0.5, 0.0, 0.13, 0.5, m['messing'], 0.004); box('Hohlleiterknie', 0.07, 0.1, 0.05, 0, 0.1, 0.76, m['messing'], 0.004)
    for z in (0.3, 0.5, 0.7): ring('Saeulenring', 0.095, 0.01, (0, 0, z), (0, 0, 1), m['gelb'], 24)
def sa_reaktiv():      # Reaktivpanzer: Kachelkarussell (vier Seiten, je drei Sprengkacheln), Zündkabel, Zündgerät
    afuss('REAKTIVPANZER')
    box('Karussellpfosten', 0.2, 0.2, 1.0, 0, 0, 0.58, m['rahmen'], 0.012); cyl('Karussellteller', 0.3, 0.03, 0, 0, 0.09, m['stahl'], 'Z', n=32, bev=0.004)
    for s_ in range(4):
        a = s_ * PI / 2; nx, ny = math.cos(a), math.sin(a)
        for j in range(3):
            z = 0.28 + j * 0.3
            box('Sprengkachel', 0.05, 0.19, 0.25, 0.135 * nx, 0.135 * ny, z, m['geh'], 0.012, rot=(0, 0, a)); box('Kachelstreifen', 0.006, 0.19, 0.03, 0.162 * nx, 0.162 * ny, z + 0.09, m['gelb'], 0, rot=(0, 0, a))
            box('Kachelmarke', 0.006, 0.07, 0.045, 0.162 * nx, 0.162 * ny, z - 0.04, m['rot'], 0, rot=(0, 0, a))
            for dz in (-0.1, 0.1): cyl('Kachelbolzen', 0.011, 0.012, 0.165 * nx - 0.07 * ny, 0.165 * ny + 0.07 * nx, z + dz, m['stahl'], 'X' if s_ % 2 == 0 else 'Y', n=6, bev=0)
            rod('Zuendkabel', Vector((0.11 * nx + 0.11 * -ny, 0.11 * ny + 0.11 * nx, z)), Vector((0.11 * nx + 0.11 * -ny, 0.11 * ny + 0.11 * nx, z + 0.3 if j < 2 else 1.1)), 0.006, m['rot'], 5)
    cyl('Zuendverteiler', 0.14, 0.06, 0, 0, 1.11, m['dunkel'], 'Z', n=24, bev=0.006); cyl('Zuendstecker', 0.05, 0.06, 0, 0, 1.17, m['messing'], 'Z', n=12, bev=0.004)
    for k in range(4): a = PI / 4 + k * PI / 2; box('Scharflicht', 0.03, 0.03, 0.012, 0.1 * math.cos(a), 0.1 * math.sin(a), 1.143, m['l_rot'], 0)
def sa_phasen():      # Phasenschild: Säule mit drei Kupferspulen, Glutringen, Spulenarmen, Phasengebern
    afuss('PHASENSCHILD')
    cyl('Phasenfuss', 0.2, 0.12, 0, 0, 0.12, m['geh'], 'Z', n=32, bev=0.015); cyl('Phasensaeule', 0.12, 1.02, 0, 0, 0.63, m['dunkel'], 'Z', n=32, bev=0.01)
    for k in range(3):
        z = 0.34 + k * 0.3
        ring('Phasenspule', 0.32, 0.05, (0, 0, z), (0, 0, 1), m['kupfer'], 48); ring('Spulenglut', 0.21, 0.014, (0, 0, z), (0, 0, 1), m['l_petrol'], 40)
        for j in range(12): a = 2 * PI * j / 12; ring('Wickelband', 0.052, 0.006, (0.32 * math.cos(a), 0.32 * math.sin(a), z), (-math.sin(a), math.cos(a), 0), m['dunkel'], 10)
        for j in range(4):
            a = PI / 4 + j * PI / 2; rod('Spulenarm', Vector((0.12 * math.cos(a), 0.12 * math.sin(a), z)), Vector((0.29 * math.cos(a), 0.29 * math.sin(a), z)), 0.014, m['stahl'], 8)
        box('Phasengeber', 0.07, 0.05, 0.1, 0, -0.14, z + 0.14, m['geh'], 0.006); box('Geberlicht', 0.03, 0.004, 0.02, 0, -0.166, z + 0.16, m['l_petrol'], 0)
    cyl('Phasenkopf', 0.16, 0.06, 0, 0, 1.15, m['rahmen'], 'Z', n=28, bev=0.008)
def sa_bollwerk():      # Bollwerk-Kern (legendär): Schildkern eines Schlachtschiffs: leuchtende Kugel in drei schweren Pratzen, Panzerkragen
    afuss('BOLLWERK-KERN')
    cyl('Kragen unten', 0.36, 0.14, 0, 0, 0.14, m['blau'], 'Z', n=44, bev=0.02); cyl('Kragen oben', 0.3, 0.12, 0, 0, 1.08, m['blau'], 'Z', n=44, bev=0.02)
    for z in (0.215, 1.015): ring('Kragenring', 0.33 if z < 0.5 else 0.28, 0.014, (0, 0, z), (0, 0, 1), m['messing'], 44)
    sphere('Schildkern', 0.27, 0, 0, 0.62, m['dunkel'], 32); cyl('Kernband', 0.274, 0.07, 0, 0, 0.62, m['l_weiss'], 'Z', n=44, bev=0)
    for z in (0.5, 0.74): ring('Kernreif', 0.262 if z < 0.6 else 0.262, 0.012, (0, 0, z), (0, 0, 1), m['messing'], 44)
    for nrm in ((1, 0, 0), (0, 1, 0)): ring('Kernmeridian', 0.275, 0.01, (0, 0, 0.62), nrm, m['stahl'], 44)
    for k in range(3):
        a = PI / 2 + k * 2 * PI / 3; ca, sa = math.cos(a), math.sin(a)
        box('Pratze', 0.1, 0.12, 0.74, 0.33 * ca, 0.33 * sa, 0.62, m['rahmen'], 0.02, rot=(0, 0, a)); box('Pratzenschuh', 0.14, 0.16, 0.08, 0.29 * ca, 0.29 * sa, 0.62, m['gelb'], 0.01, rot=(0, 0, a))
        for z in (0.34, 0.9): cyl('Pratzenbolzen', 0.022, 0.03, 0.385 * ca, 0.385 * sa, z, m['stahl'], 'Z', n=6, bev=0)
        rod('Kernleitung', Vector((0.2 * ca + 0.1 * -sa, 0.2 * sa + 0.1 * ca, 1.1)), Vector((0.24 * ca + 0.12 * -sa, 0.24 * sa + 0.12 * ca, 0.8)), 0.02, m['kupfer'], 8)
    box('Schlachtschiffplatte', 0.26, 0.008, 0.07, 0, -0.362, 0.14, m['messing'], 0.002); text('LINIENSCHIFF', 0.022, (0, -0.368, 0.13), (1, 0, 0), (0, 0, 1), m['schrift_d'], align='CENTER', name='Modulschrift')
    cyl('Kopfstecker', 0.1, 0.06, 0, 0, 1.17, m['messing'], 'Z', n=20, bev=0.006)

# ============================== ANTRIEB (Reglerkäfig, um die Hochachse) ==============================
def tfuss(name):      # Bodenplatte mit Typenschild vorn
    box('Bodenplatte', 0.62, 0.62, 0.04, 0, 0, 0.02, m['rahmen'], 0.008)
    for sx in (1, -1):
        for sy in (1, -1): cyl('Plattenschraube', 0.014, 0.012, sx * 0.27, sy * 0.27, 0.044, m['stahl'], 'Z', n=6, bev=0)
    B('Typenschild', 0.42, 0.012, 0.04, 0, 0.314, 0.02, m['dunkel'], 0.002); Tx(name, min(0.028, 0.52 / len(name)), 0, 0.322, 0.011)
def st_duesen():      # Feindüsen: Düsenstock mit sechs Feindüsen, Kraftstoffschiene, Filter, Druckregler
    tfuss('FEINDÜSEN')
    cyl('Duesenstock', 0.1, 0.7, 0, 0, 0.42, m['stahl'], 'Z', n=28, bev=0.008); cyl('Stockkopf', 0.2, 0.08, 0, 0, 0.8, m['rahmen'], 'Z', n=32, bev=0.01)
    for k in range(6):
        a = 2 * PI * k / 6; ca, sa = math.cos(a), math.sin(a)
        rod('Feinduese', Vector((0.15 * ca, 0.15 * sa, 0.84)), Vector((0.2 * ca, 0.2 * sa, 1.02)), 0.03, m['blau'], 14, r2=0.012); sphere('Duesenmund', 0.014, 0.2 * ca, 0.2 * sa, 1.022, m['l_blau'], 8)
        rod('Duesenleitung', Vector((0.1 * ca, 0.1 * sa, 0.5)), Vector((0.15 * ca, 0.15 * sa, 0.8)), 0.01, m['kupfer'], 6); cyl('Duesenmutter', 0.036, 0.025, 0.155 * ca, 0.155 * sa, 0.855, m['messing'], 'Z', n=6, bev=0)
    ring('Kraftstoffschiene', 0.16, 0.02, (0, 0, 0.5), (0, 0, 1), m['rot'], 32)
    for k in range(2):
        x = -0.2 + k * 0.4; cyl('Filter', 0.06, 0.24, x, 0.18, 0.2, m['weiss'], 'Z', n=20, bev=0.008); cyl('Filterkappe', 0.065, 0.03, x, 0.18, 0.33, m['stahl'], 'Z', n=20, bev=0.004)
        for j in range(4): ring('Filterband', 0.062, 0.004, (x, 0.18, 0.12 + j * 0.05), (0, 0, 1), m['dunkel'], 16)
    box('Druckregler', 0.16, 0.12, 0.14, 0, -0.2, 0.14, m['geh'], 0.008)
    cyl('Uhrgehaeuse', 0.05, 0.03, 0, -0.27, 0.16, m['stahl'], 'Y', n=20, bev=0.004); cyl('Zifferblatt', 0.041, 0.005, 0, -0.287, 0.16, m['keramik'], 'Y', n=20, bev=0)
    rod('Zeiger', Vector((0, -0.29, 0.16)), Vector((0.025, -0.29, 0.185)), 0.004, m['rot'], 4)
    cyl('Messkopf', 0.05, 0.08, 0, 0, 1.2, m['dunkel'], 'Z', n=16, bev=0.004); rod('Messstange', Vector((0, 0, 0.84)), Vector((0, 0, 1.16)), 0.012, m['stahl'], 8)
def st_wirbel():      # Steuerwirbler: Verteilerkugel mit vier Ventilen nach außen, Magnetspulen, Zuleitungen, Wirbelkammer oben
    tfuss('STEUERWIRBLER')
    cyl('Verteilerfuss', 0.12, 0.3, 0, 0, 0.19, m['rahmen'], 'Z', n=24, bev=0.008); sphere('Verteilerkugel', 0.15, 0, 0, 0.5, m['stahl'], 24)
    for k in range(4):
        a = PI / 4 + k * PI / 2; ca, sa = math.cos(a), math.sin(a); p = Vector((ca, sa, 0))
        rod('Ventilrohr', Vector((0.12 * ca, 0.12 * sa, 0.5)), Vector((0.3 * ca, 0.3 * sa, 0.5)), 0.04, m['blau'], 14); rod('Ventilduese', Vector((0.3 * ca, 0.3 * sa, 0.5)), Vector((0.38 * ca, 0.38 * sa, 0.5)), 0.05, m['dunkel'], 14, r2=0.03)
        cyl('Magnetspule', 0.045, 0.1, 0.22 * ca, 0.22 * sa, 0.6, m['kupfer'], 'Z', n=16, bev=0.004); cyl('Spulenkappe', 0.05, 0.02, 0.22 * ca, 0.22 * sa, 0.66, m['gelb'], 'Z', n=16, bev=0.003)
        rod('Spulenkabel', Vector((0.22 * ca, 0.22 * sa, 0.67)), Vector((0.08 * ca, 0.08 * sa, 0.86)), 0.007, m['gummi'], 5); sphere('Duesenlicht', 0.016, 0.385 * ca, 0.385 * sa, 0.5, m['l_blau'], 8)
    cyl('Wirbelkammer', 0.16, 0.2, 0, 0, 0.92, m['geh'], 'Z', n=28, bev=0.012)
    for k in range(10): a = 2 * PI * k / 10; box('Wirbelschaufel', 0.07, 0.008, 0.16, 0.19 * math.cos(a), 0.19 * math.sin(a), 0.92, m['stahl'], 0.001, rot=(0, 0, a + 0.6))
    ring('Wirbelring', 0.235, 0.012, (0, 0, 0.84), (0, 0, 1), m['rahmen'], 28); ring('Wirbelring', 0.235, 0.012, (0, 0, 1.0), (0, 0, 1), m['rahmen'], 28)
    cyl('Kammerdeckel', 0.1, 0.05, 0, 0, 1.045, m['dunkel'], 'Z', n=20, bev=0.006); rod('Steigrohr', Vector((0, 0, 1.07)), Vector((0, 0, 1.24)), 0.035, m['rot'], 12)
def st_nachbrenner():      # Nachbrenner: Turbopumpe mit Schneckengehäuse, Einspritzring mit roten Leitungen, Zünder mit Glut
    tfuss('NACHBRENNER')
    cyl('Pumpenfuss', 0.16, 0.16, 0, 0, 0.12, m['rahmen'], 'Z', n=28, bev=0.01); cyl('Pumpengehaeuse', 0.14, 0.3, 0, 0, 0.35, m['stahl'], 'Z', n=28, bev=0.01)
    ring('Schnecke', 0.17, 0.07, (0, 0, 0.36), (0, 0, 1), m['blau'], 32); rod('Schneckenauslass', Vector((0.17, 0, 0.36)), Vector((0.17, -0.26, 0.36)), 0.06, m['blau'], 16); cyl('Auslassflansch', 0.08, 0.02, 0.17, -0.27, 0.36, m['stahl'], 'Y', n=16, bev=0.003)
    cyl('Brennrohr', 0.12, 0.4, 0, 0, 0.74, m['dunkel'], 'Z', n=28, bev=0.008)
    for k in range(5): ring('Brennrohrrippe', 0.125, 0.012, (0, 0, 0.6 + k * 0.07), (0, 0, 1), m['rahmen'], 28)
    ring('Einspritzring', 0.2, 0.022, (0, 0, 0.72), (0, 0, 1), m['rot'], 32)
    for k in range(8):
        a = 2 * PI * k / 8; ca, sa = math.cos(a), math.sin(a)
        rod('Einspritzleitung', Vector((0.2 * ca, 0.2 * sa, 0.72)), Vector((0.125 * ca, 0.125 * sa, 0.82)), 0.01, m['rot'], 6); cyl('Einspritzventil', 0.02, 0.03, 0.13 * ca, 0.13 * sa, 0.83, m['messing'], 'Z', n=8, bev=0)
    cyl('Brennermund', 0.14, 0.06, 0, 0, 0.97, m['stahl'], 'Z', n=28, bev=0.006, r2=0.1); cyl('Brennerglut', 0.085, 0.02, 0, 0, 1.0, m['l_warm'], 'Z', n=24, bev=0)
    box('Zuender', 0.1, 0.1, 0.16, -0.22, 0.12, 0.6, m['geh'], 0.008); rod('Zuendkerze', Vector((-0.17, 0.09, 0.66)), Vector((-0.1, 0.05, 0.9)), 0.012, m['keramik'], 8); sphere('Zuendfunke', 0.018, -0.1, 0.05, 0.9, m['l_warm'], 8)
    rod('Zulauf', Vector((0, 0.2, 0.06)), Vector((0, 0.2, 0.36)), 0.035, m['kupfer'], 12); rod('Zulaufbogen', Vector((0, 0.2, 0.36)), Vector((0, 0.13, 0.36)), 0.035, m['kupfer'], 12)
    rod('Abgasfuehler', Vector((0, 0, 1.01)), Vector((0, 0, 1.22)), 0.01, m['stahl'], 6)
def st_vektor():      # Vektorschub: Düsenmodell im Kardanring mit zwei Hydraulikstellern
    tfuss('VEKTORSCHUB')
    for sx in (1, -1): box('Kardanstaender', 0.05, 0.1, 0.7, sx * 0.28, 0, 0.39, m['rahmen'], 0.008); cyl('Kardanlager', 0.04, 0.06, sx * 0.27, 0, 0.7, m['stahl'], 'X', n=14, bev=0.004)
    ring('Kardanring aussen', 0.24, 0.02, (0, 0, 0.7), (0, 0.26, 1), m['stahl'], 40); ring('Kardanring innen', 0.19, 0.018, (0, 0, 0.7), (0.2, 0.26, 1), m['messing'], 36)
    q = Matrix.Rotation(math.radians(-14), 4, 'X') @ Matrix.Rotation(math.radians(10), 4, 'Y'); o = Vector((0, 0, 0.7))
    def P_(x, y, z): return o + q @ Vector((x, y, z))
    rod('Duesenhals', P_(0, 0, 0.1), P_(0, 0, -0.06), 0.09, m['blau'], 24); rod('Duesenglocke', P_(0, 0, -0.06), P_(0, 0, -0.36), 0.1, m['dunkel'], 28, r2=0.2)
    for k in range(4): d = -0.1 - k * 0.07; ring('Glockenrippe', 0.115 + (-0.06 - d) / 0.3 * 0.1, 0.008, tuple(P_(0, 0, d)), tuple(q @ Vector((0, 0, 1))), m['kupfer'], 28)
    rod('Brennkammer', P_(0, 0, 0.1), P_(0, 0, 0.32), 0.11, m['stahl'], 24); ring('Kammerflansch', 0.12, 0.014, tuple(P_(0, 0, 0.1)), tuple(q @ Vector((0, 0, 1))), m['messing'], 24)
    ring('Duesenglut', 0.17, 0.01, tuple(P_(0, 0, -0.35)), tuple(q @ Vector((0, 0, 1))), m['l_blau'], 28)
    for sx, sy in ((1, -1), (-1, -1)):
        a0 = Vector((sx * 0.22, sy * 0.22, 0.1)); a1 = P_(sx * 0.13, sy * 0.13, -0.2); mid = a0 + (a1 - a0) * 0.55
        rod('Stellzylinder', a0, mid, 0.03, m['dunkel'], 12); rod('Stellstange', mid, a1, 0.014, m['stahl'], 8); sphere('Stellgelenk', 0.024, a1.x, a1.y, a1.z, m['gelb'], 10); sphere('Stellfuss', 0.03, a0.x, a0.y, a0.z, m['gelb'], 10)
    rod('Kraftstoffzulauf', P_(0, 0, 0.32), Vector((0, 0, 1.22)), 0.03, m['rot'], 10); box('Winkelgeber', 0.08, 0.06, 0.08, 0.27, 0.08, 0.78, m['geh'], 0.006); box('Geberlicht', 0.03, 0.004, 0.02, 0.27, 0.048, 0.79, m['l_petrol'], 0)
def st_fusion():      # Fusionsbrenner: Plasmasäule im Rohr, vier Magnetspulen, Kryoleitungen, Einschlussanzeige
    tfuss('FUSIONSBRENNER')
    cyl('Brennerfuss', 0.2, 0.14, 0, 0, 0.11, m['rahmen'], 'Z', n=32, bev=0.012); cyl('Brennerkopf', 0.2, 0.12, 0, 0, 1.08, m['rahmen'], 'Z', n=32, bev=0.012)
    cyl('Plasmasaeule', 0.06, 0.86, 0, 0, 0.6, m['l_violett'], 'Z', n=20, bev=0)
    for k in range(4):
        z = 0.3 + k * 0.2; ring('Magnetspule', 0.17, 0.055, (0, 0, z), (0, 0, 1), m['kupfer'], 40); ring('Spulenmantel', 0.17, 0.02, (0, 0, z + 0.062), (0, 0, 1), m['weiss'], 40)
        for j in range(4): a = PI / 4 + j * PI / 2; box('Spulenklemme', 0.06, 0.05, 0.13, 0.215 * math.cos(a), 0.215 * math.sin(a), z, m['rahmen'], 0.006, rot=(0, 0, a))
    for k in range(6): a = 2 * PI * k / 6; rod('Rohrstab', Vector((0.085 * math.cos(a), 0.085 * math.sin(a), 0.18)), Vector((0.085 * math.cos(a), 0.085 * math.sin(a), 1.02)), 0.006, m['stahl'], 5)
    for sx in (1, -1):
        rod('Kryoleitung', Vector((sx * 0.27, 0.2, 0.08)), Vector((sx * 0.27, 0.2, 1.1)), 0.022, m['weiss'], 10)
        for k in range(4): rod('Kryoabzweig', Vector((sx * 0.27, 0.2, 0.3 + k * 0.2)), Vector((sx * 0.16, 0.12, 0.3 + k * 0.2)), 0.012, m['weiss'], 6)
    box('Einschlussanzeige', 0.16, 0.05, 0.2, 0, -0.26, 0.3, m['geh'], 0.008); box('Anzeigeschirm', 0.11, 0.006, 0.1, 0, -0.287, 0.33, m['schirm'], 0.002)
    for k in range(3): box('Anzeigelicht', 0.025, 0.006, 0.016, -0.04 + k * 0.04, -0.287, 0.235, m[('l_petrol', 'l_petrol', 'l_violett')[k]], 0)
    rod('Kopfleitung', Vector((0, 0, 1.14)), Vector((0, 0, 1.24)), 0.045, m['rot'], 12)
def st_gyro():      # Gyrostabilisator: drei Kreiselringe, Kern, Achse, Lagerböcke, Drehgeber
    tfuss('GYROSTABILISATOR')
    c = Vector((0, 0, 0.66))
    ring('Kreisel aussen', 0.3, 0.022, tuple(c), (0, 0, 1), m['stahl'], 48); ring('Kreisel mitte', 0.24, 0.02, tuple(c), (0.94, 0, 0.34), m['stahl'], 44); ring('Kreisel innen', 0.18, 0.018, tuple(c), (0.29, 0.96, 0), m['kupfer'], 40)
    sphere('Kreiselkern', 0.1, c.x, c.y, c.z, m['dunkel'], 24); ring('Kernglut', 0.103, 0.012, tuple(c), (0, 0, 1), m['l_warm'], 28); ring('Kreiselglut', 0.3, 0.008, tuple(c + Vector((0, 0, 0.03))), (0, 0, 1), m['l_petrol'], 48)
    rod('Kreiselachse', Vector((0, 0, 0.04)), Vector((0, 0, 1.2)), 0.018, m['stahl'], 10)
    for sy in (1, -1):
        rod('Lagerarm', c + Vector((0, sy * 0.3, 0)), Vector((0, sy * 0.3, 0.04)), 0.016, m['rahmen'], 8); sphere('Ringlager', 0.03, 0, sy * 0.3, c.z, m['messing'], 12)
        box('Lagerbock', 0.12, 0.06, 0.08, 0, sy * 0.3, 0.08, m['rahmen'], 0.008)
    for a in (0.0, PI):
        p = c + Vector((0.24 * 0.34 * math.cos(a) * -1, 0.24 * math.sin(a), 0.24 * 0.94 * math.cos(a))); sphere('Mittellager', 0.022, p.x, p.y, p.z, m['messing'], 10)
    cyl('Drehgeber', 0.06, 0.05, 0, 0, 1.12, m['geh'], 'Z', n=20, bev=0.006); ring('Geberring', 0.063, 0.006, (0, 0, 1.12), (0, 0, 1), m['l_petrol'], 20)
    cyl('Antriebsmotor', 0.08, 0.14, 0, 0, 0.14, m['dunkel'], 'Z', n=24, bev=0.008)
    for k in range(10): a = 2 * PI * k / 10; box('Motorrippe', 0.03, 0.006, 0.12, 0.09 * math.cos(a), 0.09 * math.sin(a), 0.14, m['rahmen'], 0.001, rot=(0, 0, a))
def st_sturm():      # Sturmtriebwerk (legendär, Prototyp): Turbinenstapel mit sichtbaren Schaufeln, Prototypstreifen, heißer Abschnitt, Fühlerkabel
    tfuss('STURMTRIEBWERK')
    cyl('Triebwerksfuss', 0.22, 0.1, 0, 0, 0.09, m['rahmen'], 'Z', n=36, bev=0.012)
    for k, (z, r, mat) in enumerate(((0.24, 0.2, 'stahl'), (0.42, 0.2, 'stahl'), (0.6, 0.17, 'blau'), (0.78, 0.15, 'blau'))):
        cyl('Stufennabe', 0.07, 0.14, 0, 0, z, m['dunkel'], 'Z', n=20, bev=0.004); ring('Stufenring', r + 0.02, 0.014, (0, 0, z - 0.075), (0, 0, 1), m['gelb' if k % 2 == 0 else 'dunkel'], 36)
        n_ = 18 - k * 2
        for j in range(n_): a = 2 * PI * j / n_ + k * 0.2; box('Schaufel', r - 0.06, 0.008, 0.11, (0.07 + (r - 0.06) / 2) * math.cos(a), (0.07 + (r - 0.06) / 2) * math.sin(a), z, m[mat], 0.001, rot=(0.5, 0, a))
    for k in range(4): a = PI / 4 + k * PI / 2; rod('Zuganker', Vector((0.24 * math.cos(a), 0.24 * math.sin(a), 0.14)), Vector((0.2 * math.cos(a), 0.2 * math.sin(a), 0.9)), 0.012, m['stahl'], 6)
    cyl('Heisser Mantel', 0.16, 0.16, 0, 0, 0.96, m['ferrox2'], 'Z', n=32, bev=0.008); cyl('Heissglut', 0.164, 0.03, 0, 0, 0.96, m['l_warm'], 'Z', n=32, bev=0)
    cyl('Schubduese', 0.16, 0.14, 0, 0, 1.11, m['dunkel'], 'Z', n=32, bev=0, r2=0.1); cyl('Duesenglut', 0.09, 0.012, 0, 0, 1.18, m['l_blau'], 'Z', n=24, bev=0)
    for k in range(5):
        a = 0.4 + k * 0.5; rod('Fuehlerkabel', Vector((0.165 * math.cos(a), 0.165 * math.sin(a), 0.96)), Vector((0.26 * math.cos(a), 0.26 * math.sin(a), 0.5)), 0.006, m[('rot', 'gummi', 'kupfer', 'gummi', 'rot')[k]], 5)
        sphere('Fuehler', 0.014, 0.165 * math.cos(a), 0.165 * math.sin(a), 0.96, m['messing'], 8)
    box('Messkasten', 0.16, 0.1, 0.14, 0.2, 0.2, 0.42, m['geh'], 0.008); box('Messschirm', 0.006, 0.07, 0.07, 0.117, 0.2, 0.43, m['schirm'], 0.002)
    box('Prototypplatte', 0.26, 0.008, 0.08, 0, -0.226, 0.09, m['gelb'], 0.002); text('PROTOTYP 03', 0.028, (0, -0.232, 0.078), (1, 0, 0), (0, 0, 1), m['schrift_d'], align='CENTER', name='Modulschrift')

MODULE = {      # Kennung (src/data/gear.ts) → Platzart
    'system': ['sy_netz', 'sy_linse', 'sy_antenne', 'sy_kuehler', 'sy_ausbau', 'sy_prisma', 'sy_sonde', 'sy_kompressor', 'sy_resonator', 'sy_orakel', 'sy_herz'],
    'waffe': ['sw_lauf', 'sw_lader', 'sw_zielrechner', 'sw_rotation', 'sw_gauss', 'sw_zwilling', 'sw_lanze'],
    'abwehr': ['sa_platten', 'sa_kondensator', 'sa_waben', 'sa_projektor', 'sa_reaktiv', 'sa_phasen', 'sa_bollwerk'],
    'antrieb': ['st_duesen', 'st_wirbel', 'st_nachbrenner', 'st_vektor', 'st_fusion', 'st_gyro', 'st_sturm'],
}
REIHE = {'system': 0.0, 'waffe': 8.0, 'abwehr': 16.0, 'antrieb': 24.0}      # Aufstellung fürs Bild: je Art eine Reihe (y), nebeneinander im Abstand 1,4 m
def build():
    for art, ids in MODULE.items():
        for i, k in enumerate(ids):
            with Part(k, T((i - (len(ids) - 1) / 2) * 1.4, REIHE[art], 0.0), C_MOD) as e:
                globals()[k]()
            e['modul'] = k; e['art'] = art
    return {a: len(v) for a, v in MODULE.items()}
if not globals().get('NUR_HELFER_MODULE'):
    result = build()
