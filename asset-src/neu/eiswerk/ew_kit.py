# Eiswerk-Baukasten (24.11.2026): Innenräume für das Pumpwerk Reifschleier (Bergbaugilde, schmilzt Eis aus dem Feld), eigener Look neben dem
# Hütten-Baukasten der Eisenkrone (../huette/hk_kit.py), auf dem er aufbaut: dasselbe 6-m-Raster, dieselben Hüllen und Anschlüsse ans Spiel.
# Läuft nach hk_kit.py im selben Namensraum (ew_lauf.py). Wunsch des Nutzers: „Eigenes Deck fürs Pumpwerk, baue einen Baukasten, gib dir Mühe.
# Es soll lebendig, vielfältig, überschaubar und groß sein.“
#
# Was anders ist als in der Hütte:
#   Farben  kalt statt glühend: blaugraue, gedämmte Wandtafeln, Träger in dunklem Gildenpetrol, Tore und Schränke in hellem Emaillegrau,
#           Messing bleibt, kaltweißes Hallenlicht und eisblaue Anzeigen; warm nur, wo Menschen sitzen (Messe, Quartiere) und am Schmelzkessel.
#   Teile   Eis und Wasser: Förderband mit Eisblöcken durch die Wand, Ventilwand mit Farbcode, Pegelrohre, Kühlaggregat mit Reif, Pumpen,
#           Kälteanzüge, Probenlabor, Hydrokultur (das Wasser wird hier auch zu Gemüse), Kojen, Kombüse.
#   Halle   die Schmelzhalle: 24 × 18 m, 11,6 m hoch, in der Mitte der Schmelzkessel (8 m Durchmesser) mit Laufsteg; ein Förderband bringt das
#           Eis von der Annahme oben in den Kessel. Vom Leitstand aus durch ein Fenster zu sehen.
# Zeichen des Pumpwerks (eigener Entwurf): ein Tropfen über drei Wellen.
import bpy, math, random
from mathutils import Vector, Matrix

# ---------- Farben: die Hüllen der Hütte bekommen den Eiswerk-Look (die Bausteine werden erst beim ersten Einsatz gebaut) ----------
ICE = (0.82, 0.92, 1.0)          # kaltweißes Hallenlicht
WARM = (1.0, 0.68, 0.38)         # wo Menschen sitzen
SODIUM = ICE                     # die Hüllen der Hütte setzen ihre Lampen mit SODIUM
M.update(
    hwand=mk('Eiswerk Tafel', (0.07, 0.078, 0.085), 0.45, 0.5, streak=0.3, bump=0.25, wear=0.6),
    hwand2=mk('Eiswerk Tafel hell', (0.12, 0.132, 0.14), 0.4, 0.48, streak=0.25, bump=0.25, wear=0.6),
    hwand3=mk('Eiswerk Tafel dunkel', (0.038, 0.042, 0.047), 0.5, 0.52, streak=0.3, bump=0.25, wear=0.6),
    hwelle=mk('Eiswerk Welle', (0.09, 0.1, 0.106), 0.55, 0.46, streak=0.35, bump=0.2, wear=0.5),
    oxid=mk('Eiswerk Petrol Traeger', (0.012, 0.046, 0.052), 0.25, 0.52, var=0.2, streak=0.25, bump=0.25, wear=0.8),
    oxid2=mk('Eiswerk Petrol dunkel', (0.008, 0.028, 0.033), 0.3, 0.55, var=0.2, streak=0.25, bump=0.25, wear=0.8),
    petrol=mk('Emaille grau', (0.2, 0.215, 0.215), 0.15, 0.4, var=0.15, streak=0.2, bump=0.15, wear=0.7),
    petrol2=mk('Emaille hell', (0.28, 0.3, 0.3), 0.15, 0.4, var=0.15, bump=0.15, wear=0.7),
    hboden=mk('Eiswerk Boden', (0.05, 0.055, 0.058), 0.55, 0.55, var=0.25, scale=3.0, bump=0.3, wear=0.5),
    e_sod=mk('Kaltlicht', (0.85, 0.93, 1.0), 0, 0.3, var=0, rvar=0, emit=ICE, es=9, grime=False),
    e_sod2=mk('Kaltlicht schwach', (0.7, 0.88, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.62, 0.84, 1.0), es=3.0, grime=False),
)
M['schirm'] = stripes('Bildschirm eisblau', (0.35, 0.82, 1.0), (0.01, 0.04, 0.06), 30, emit=2.0, direction='Z', duty=0.4)
M.update(
    eis=mk('Eisblock', (0.42, 0.6, 0.7), 0.0, 0.1, var=0.25, rvar=0.15, scale=3.0, bump=0.3, bscale=40.0, grime=False),
    eis2=mk('Eis bereift', (0.58, 0.68, 0.74), 0.0, 0.62, var=0.25, rvar=0.15, scale=2.0, bump=0.4, bscale=80.0, grime=False),
    reif=mk('Reif', (0.6, 0.68, 0.72), 0.0, 0.8, var=0.3, rvar=0.15, scale=1.2, grime=False),
    daemm=mk('Daemmmatte', (0.32, 0.33, 0.32), 0.0, 0.9, var=0.2, scale=4.0, bump=0.5, bscale=120.0, wear=0.3),
    gummi2=mk('Foerdergurt', (0.025, 0.025, 0.025), 0.0, 0.8, var=0.15, scale=6.0, bump=0.4, bscale=60.0),
    gelb=mk('Signalgelb', (0.5, 0.33, 0.03), 0.15, 0.55, var=0.25, streak=0.3, wear=0.9),
    blau=mk('Leitungsblau', (0.02, 0.06, 0.16), 0.2, 0.5, var=0.2, wear=0.7),
    gruen=mk('Leitungsgruen', (0.02, 0.09, 0.03), 0.2, 0.5, var=0.2, wear=0.7),
    rotbr=mk('Leitungsrot', (0.12, 0.02, 0.015), 0.2, 0.5, var=0.2, wear=0.7),
    kunst=mk('Kunststoff weiss', (0.42, 0.43, 0.42), 0.0, 0.45, var=0.15, wear=0.4),
    blatt=mk('Blattgruen', (0.03, 0.1, 0.022), 0.0, 0.6, var=0.4, scale=8.0, bump=0.3, bscale=60.0, grime=False),
    blatt2=mk('Blattgruen hell', (0.07, 0.17, 0.035), 0.0, 0.55, var=0.4, scale=8.0, grime=False),
    erde=mk('Substrat', (0.035, 0.025, 0.018), 0.0, 0.95, var=0.35, scale=8.0, bump=0.6, bscale=200.0, grime=False),
    stoff=mk('Decke Stoff', (0.09, 0.07, 0.05), 0.0, 0.9, var=0.25, scale=5.0, bump=0.4, bscale=150.0),
    stoff2=mk('Decke Stoff blau', (0.02, 0.035, 0.06), 0.0, 0.9, var=0.25, scale=5.0, bump=0.4, bscale=150.0),
    anzug=mk('Kaelteanzug', (0.32, 0.17, 0.03), 0.0, 0.75, var=0.25, scale=4.0, bump=0.3, wear=0.4),
    e_wasser=mk('Pegelwasser', (0.2, 0.65, 1.0), 0, 0.2, var=0, rvar=0, emit=(0.18, 0.62, 1.0), es=3.0, grime=False),
    e_warm=mk('Warmlicht', (1.0, 0.75, 0.45), 0, 0.3, var=0, rvar=0, emit=WARM, es=7, grime=False),
    e_warmlampe=mk('Warmlicht Halle', (1.0, 0.75, 0.45), 0, 0.3, var=0, rvar=0, emit=WARM, es=8, grime=False),
    e_warm2=mk('Warmlicht schwach', (1.0, 0.75, 0.45), 0, 0.3, var=0, rvar=0, emit=WARM, es=3.0, grime=False),
    e_wachs=mk('Wachstumslicht', (1.0, 0.85, 0.95), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.78, 0.92), es=6, grime=False),
    e_kessel=mk('Kesselglut', (1.0, 0.55, 0.2), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.5, 0.16), es=10, grime=False),
    txtc=mk('Schrift eisblau', (0.35, 0.7, 0.85), 0.0, 0.5, var=0.15, grime=False),
)
KESSEL = (1.0, 0.52, 0.2)

def rcyl(name, r, ln, t, d, z, m, n=24, bev=0.004, r2=None):      # Zylinder radial um die Hochachse: Richtung t (rad), Abstand d, Höhe z
    ob = cyl(name, r, ln, d, 0, z, m, 'X', n=n, bev=bev, r2=r2)
    ob.location = (math.cos(t) * d, math.sin(t) * d, z); ob.rotation_euler = (0, PI / 2, t)
    return ob
def sbox(name, a, b, w, h, m, bev=0.01):      # Kasten von a nach b (Breite w, Höhe h), beliebig schräg
    a, b = Vector(a), Vector(b); d = b - a
    return box(name, d.length, w, h, *((a + b) / 2), m, bev, (0, -math.atan2(d.z, math.hypot(d.x, d.y)), math.atan2(d.y, d.x)))
def drop(c, xd, yd, R, m):      # Zeichen des Pumpwerks: Tropfen über drei Wellen (eigener Entwurf)
    mw, X, Y, Z = frame(c, xd, yd); c = Vector(c) + Z * 0.004
    pts = [c + Y * R * 0.95]
    for a in range(0, 181, 15):      # untere Rundung des Tropfens, von links nach rechts
        t = math.radians(a); pts.append(c + X * (R * 0.42 * math.cos(PI - t)) + Y * (R * 0.18 - R * 0.42 * math.sin(t)))
    pts.append(c + Y * R * 0.95)
    pipe('Tropfen', pts, R * 0.06, m)
    for q in range(3):
        y = -R * 0.45 - q * R * 0.2
        pipe('Welle', [c + X * R * (-0.7 + 0.35 * i) + Y * (y + (0.06 * R if i % 2 else -0.06 * R)) for i in range(5)], R * 0.045, m)

crown = drop      # alle Teile der Hütte, die das Zeichen der Eisenkrone tragen (Terminal, Tafel), zeigen hier den Tropfen des Pumpwerks
def d_platte():      # Tafelfeld mit Schablonennummer des Pumpwerks und Prüfplakette
    fender(-FW / 2, FW / 2)
    stencil('PW-%d' % 2140, 0.16, (X0 + 0.02, -0.6, 2.35), LEFT_X, LEFT_Y); plate(0.16, 0.1, (X0 + 0.017, 0.5, 1.6), LEFT_X, LEFT_Y, M['brass'])
DRESS['platte'] = d_platte
def p_schleuse():      # Rahmen zum Hangar (wie in der Hütte, mit dem Namen des Pumpwerks)
    xa, xb = -HALF - 0.12, -HALF + 0.02; hw, hh = DOOR_W / 2, DOOR_H
    prism('Schleusenrahmen', [(-3.2, 0.0), (-hw - 0.05, 0.0), (-hw - 0.05, hh + 0.05), (hw + 0.05, hh + 0.05), (hw + 0.05, 0.0), (3.2, 0.0), (3.2, 4.9), (-3.2, 4.9)], xa, xb, M['oxid2'], 'X', 0.02)
    box('Schleuse Schild', 0.04, 3.4, 0.5, xa - 0.02, 0, hh + 0.6, M['hwand3'], 0.01)
    text('PUMPWERK', 0.26, (xa - 0.042, 1.3, hh + 0.5), RIGHT_X, RIGHT_Y, M['txtb'])
    for sy in (-1, 1): box('Schleuse Schraffur', 0.012, 0.7, 2.2, xa - 0.006, sy * (hw + 0.5), 1.1, M['warnrw'], 0); cyl('Schleuse Leuchte', 0.07, 0.05, xa - 0.02, sy * (hw + 0.5), 2.9, M['e_signal'], 'X', n=12, bev=0)
PROP['schleuse'] = p_schleuse

# =====================================================================================
# Wandfüllungen (Bezugsseite wie in der Hütte: Wand bei x = −W, Mitte y = 0, 2,7 m breit)
# =====================================================================================
def d_isolier():      # gesteppte Dämmmatten zwischen Petrolleisten, unten Reif und Tropfwanne
    box('Daemmgrund', 0.03, FW, HW - 0.2, X0 + 0.015, 0, (HW - 0.2) / 2 + 0.1, M['hwand3'], 0)
    for i in range(3):
        for j in range(4):
            y = -0.9 + i * 0.9; z = 0.45 + j * 0.8
            box('Daemmkissen', 0.09, 0.86, 0.76, X0 + 0.06, y, z, M['daemm'], 0.03)
            cyl('Steppknopf', 0.02, 0.02, X0 + 0.11, y, z, M['steel'], 'X', n=8, bev=0)
    for y in (-1.35, -0.45, 0.45, 1.35): box('Daemmleiste', 0.06, 0.05, HW - 0.2, X0 + 0.09, y, (HW - 0.2) / 2 + 0.1, M['oxid'], 0.006)
    box('Reifkante', 0.05, FW - 0.1, 0.18, X0 + 0.11, 0, 0.09, M['reif'], 0.02)
    box('Tropfwanne', 0.32, FW - 0.2, 0.06, X0 + 0.2, 0, 0.03, M['steel'], 0.006)
    stencil('KALTSEITE · NICHT ANLEHNEN', 0.055, (X0 + 0.112, -0.62, 3.33), LEFT_X, LEFT_Y, M['txtc'])
def d_ventile():      # Ventilwand: Sammelrohr mit fünf Abgängen in Leitungsfarben (Wasser blau, Kühlsole grün, Gas gelb, Heizung rot), Schilder
    x = X0 + 0.32
    cyl('Sammelrohr', 0.14, FW - 0.1, x, 0, 2.55, M['isol'], 'Y', n=24, bev=0)
    for y in (-1.2, 1.2): cyl('Sammelflansch', 0.19, 0.05, x, y, 2.55, M['steel'], 'Y', n=24, bev=0.004)
    cols = (('blau', 'WASSER'), ('gruen', 'SOLE'), ('gelb', 'GAS'), ('rotbr', 'HEIZUNG'), ('blau', 'WASSER'))
    for i, (mat, s) in enumerate(cols):
        y = -1.05 + i * 0.525
        cyl('Abgang', 0.065, 2.3, x, y, 1.2, M[mat], 'Z', n=16, bev=0)
        cyl('Ventilkoerper', 0.11, 0.24, x, y, 1.45, M['guss'], 'Z', n=16, bev=0.006)
        cyl('Spindel', 0.016, 0.22, x + 0.2, y, 1.45, M['steel'], 'X', n=8, bev=0); ring('Handrad', 0.12, 0.014, (x + 0.31, y, 1.45), (1, 0, 0), M['red' if mat == 'rotbr' else 'brass'])
        for z in (0.35, 2.1): box('Schelle', 0.3, 0.17, 0.04, X0 + 0.16, y, z, M['oxid2'], 0.004)
        label(s, 0.04, (x + 0.075, y - 0.1, 0.85), LEFT_X, LEFT_Y)
        box('Fliessrichtung', 0.004, 0.05, 0.16, x + 0.068, y, 0.62, M['white'], 0)
    cyl('Manometer', 0.1, 0.05, X0 + 0.35, 0.0, 2.98, M['steel'], 'X', n=24, bev=0.004); cyl('Manometerblatt', 0.085, 0.005, X0 + 0.376, 0.0, 2.98, M['plate'], 'X', n=24, bev=0)
    box('Zeiger', 0.004, 0.006, 0.07, X0 + 0.382, 0.01, 3.0, M['red'], 0, (math.radians(-25), 0, 0))
    spot((X0 + 0.5, 0.3, 0.0125), 0.45, 'fleck', 1.2)
def d_pegel():      # Pegelanzeige der Tanks: vier Glasrohre mit leuchtendem Wasser in verschiedener Höhe, Skala, Tanknummern
    box('Pegeltafel', 0.05, FW - 0.1, 3.0, X0 + 0.025, 0, 1.75, M['hwand2'], 0.01)
    for i, f in enumerate((0.82, 0.55, 0.31, 0.67)):
        y = -0.95 + i * 0.63
        cyl('Pegelrohr', 0.06, 2.4, X0 + 0.16, y, 1.65, M['lens'], 'Z', n=16, bev=0)
        cyl('Pegelwasser', 0.045, 2.3 * f, X0 + 0.16, y, 0.5 + 2.3 * f / 2, M['e_wasser'], 'Z', n=12, bev=0)
        for z in (0.42, 2.88): cyl('Pegelkappe', 0.085, 0.08, X0 + 0.16, y, z, M['brass'], 'Z', n=16, bev=0.004)
        for q in range(11): box('Skalenstrich', 0.004, 0.06 if q % 5 else 0.11, 0.008, X0 + 0.052, y + 0.12, 0.5 + q * 0.23, M['txtw'], 0)
        text('T%d' % (i + 1), 0.11, (X0 + 0.054, y - 0.08, 3.05), LEFT_X, LEFT_Y, M['txtb'])
    text('TANKLAGER · FÜLLSTAND', 0.08, (X0 + 0.054, -0.85, 3.3), LEFT_X, LEFT_Y, M['txtw'])
    box('Pegellicht', 0.04, FW - 0.3, 0.03, X0 + 0.07, 0, 3.22, M['e_sod2'], 0)
def d_kuehl():      # Kühlaggregat: Gehäuse mit zwei Lüfterkränzen, Rohrschlangen, Reif an den Lamellen, Kondenswasser
    box('Kuehlgehaeuse', 0.7, 2.4, 2.4, X0 + 0.35, 0, 1.3, M['petrol'], 0.03); box('Kuehlsockel', 0.68, 2.36, 0.12, X0 + 0.34, 0, 0.06, M['oxid2'], 0.006)
    for y in (-0.6, 0.6):
        cyl('Luefterkranz', 0.5, 0.06, X0 + 0.72, y, 1.65, M['hwand3'], 'X', n=32, bev=0.006)
        ring('Luefterring', 0.48, 0.02, (X0 + 0.76, y, 1.65), (1, 0, 0), M['steel'], 32)
        for a in range(5): box('Fluegel', 0.02, 0.44, 0.12, X0 + 0.74, y, 1.65, M['steel'], 0, (a * PI / 5 + 0.3, 0, 0))
        cyl('Nabe', 0.08, 0.06, X0 + 0.76, y, 1.65, M['brass'], 'X', n=12, bev=0)
    for q in range(10): box('Lamelle', 0.04, 2.2, 0.025, X0 + 0.71, 0, 0.35 + q * 0.06, M['reif'], 0)
    box('Reifschicht', 0.06, 2.3, 0.6, X0 + 0.69, 0, 0.62, M['reif'], 0.02)
    for (z, mat) in ((2.65, 'gruen'), (2.85, 'blau')): pipe('Kaeltemittel', [(X0 + 0.5, -1.1, z), (X0 + 0.5, -1.1, HW + 0.3)], 0.05, M[mat])
    box('Kondenswanne', 0.4, 2.2, 0.05, X0 + 0.95, 0, 0.025, M['steel'], 0.006); spot((X0 + 1.2, -0.2, 0.0125), 0.6, 'fleck', 1.5)
    plate(0.4, 0.08, (X0 + 0.703, -0.2, 2.25), LEFT_X, LEFT_Y, M['brass']); text('KÄLTE 3', 0.05, (X0 + 0.707, -0.17, 2.265), LEFT_X, LEFT_Y, M['txtd'])
    cyl('Leuchtmelder', 0.025, 0.03, X0 + 0.71, 0.9, 2.3, M['e_green'], 'X', n=12, bev=0)
def d_pumpe():      # Kreiselpumpe an der Wand: Motor, Kupplung mit Schutzhaube, Spiralgehäuse, Zu- und Ablauf, Schalter
    box('Pumpensockel', 1.0, 2.4, 0.25, X0 + 0.6, 0, 0.125, M['oxid2'], 0.02)
    cyl('Motor', 0.32, 0.95, X0 + 0.65, -0.55, 0.62, M['petrol'], 'Y', n=28, bev=0.02)
    for q in range(8): box('Kuehlrippe', 0.66, 0.02, 0.05, X0 + 0.65, -0.55 - 0.4 + q * 0.11, 0.95, M['petrol2'], 0)
    cyl('Lueftergitter', 0.3, 0.06, X0 + 0.65, -1.05, 0.62, M['hwand3'], 'Y', n=24, bev=0)
    cyl('Kupplungshaube', 0.2, 0.36, X0 + 0.65, 0.1, 0.62, M['gelb'], 'Y', n=20, bev=0.01)
    cyl('Spiralgehaeuse', 0.42, 0.34, X0 + 0.65, 0.55, 0.62, M['guss'], 'Y', n=32, bev=0.02)
    cyl('Saugstutzen', 0.14, 0.5, X0 + 0.65, 0.95, 0.62, M['blau'], 'Y', n=16, bev=0)
    pipe('Druckleitung', [(X0 + 0.65, 0.55, 1.05), (X0 + 0.65, 0.55, 2.2), (X0 + 0.25, 0.55, 2.6), (X0 + 0.25, 0.55, HW + 0.3)], 0.11, M['blau'], rad=0.25)
    pipe('Saugleitung', [(X0 + 0.65, 1.2, 0.62), (X0 + 0.25, 1.25, 0.62), (X0 + 0.25, 1.25, -0.1)], 0.13, M['blau'], rad=0.2)
    box('Schalterkasten', 0.15, 0.4, 0.5, X0 + 0.075, -0.4, 1.8, M['petrol'], 0.01); cyl('Notaus', 0.04, 0.04, X0 + 0.17, -0.4, 1.85, M['red'], 'X', n=12, bev=0)
    text('PUMPE', 0.09, (X0 + 0.152, -0.6, 1.95), LEFT_X, LEFT_Y, M['txtw']); warnsign((X0 + 0.152, -0.4, 1.65), LEFT_X, LEFT_Y, 0.07)
    spot((X0 + 0.9, 0.4, 0.0125), 0.7, 'fleck', 1.6)
def d_anzuege():      # Kälteanzüge: orange gedämmte Overalls an Haken, Stiefel darunter, Helme auf dem Bord, Wärmehinweis
    box('Hakenleiste', 0.06, FW - 0.1, 0.1, X0 + 0.03, 0, 2.2, M['oxid'], 0.006)
    for i in range(4):
        y = -0.95 + i * 0.63
        cyl('Haken', 0.015, 0.14, X0 + 0.1, y, 2.2, M['steel'], 'X', n=6, bev=0)
        box('Anzug Rumpf', 0.28, 0.5, 0.75, X0 + 0.2, y, 1.75, M['anzug'], 0.08)
        for s in (-1, 1):
            box('Anzug Arm', 0.18, 0.14, 0.62, X0 + 0.2, y + s * 0.3, 1.72, M['anzug'], 0.06)
            box('Anzug Bein', 0.2, 0.18, 0.62, X0 + 0.2, y + s * 0.12, 1.08, M['anzug'], 0.06)
            box('Stiefel', 0.3, 0.13, 0.32, X0 + 0.22, y + s * 0.11, 0.16, M['rubber'], 0.04)
        box('Reflexstreifen', 0.282, 0.5, 0.05, X0 + 0.2, y, 1.6, M['white'], 0.01)
        cyl('Helm', 0.15, 0.24, X0 + 0.2, y, 2.62, M['kunst'], 'Z', n=16, bev=0.05)
    box('Helmbord', 0.32, FW - 0.1, 0.04, X0 + 0.16, 0, 2.48, M['steel'], 0.006)
    text('VOR DEM EISFELD: ANZUG, HELM, FUNK', 0.055, (X0 + 0.04, -1.25, 3.0), LEFT_X, LEFT_Y, M['txtc'])
def d_labor():      # Probenlabor: Arbeitsplatte mit Probenflaschen (Wasser in Stufen), Mikroskop, Analysegerät mit Schirm, Abzug
    box('Laborschrank', 0.62, FW - 0.1, 0.9, X0 + 0.31, 0, 0.45, M['petrol2'], 0.012); box('Laborplatte', 0.68, FW - 0.06, 0.04, X0 + 0.34, 0, 0.92, M['kunst'], 0.008)
    for q in range(4): box('Schublade', 0.004, 0.55, 0.18, X0 + 0.622, -1.0 + q * 0.66, 0.65, M['hwand3'], 0)
    for i in range(7):
        y = -1.1 + i * 0.13
        cyl('Probenflasche', 0.035, 0.18, X0 + 0.25, y, 1.03, M['lens'], 'Z', n=12, bev=0)
        cyl('Probe', 0.03, 0.12 - i * 0.01, X0 + 0.25, y, 0.94 + (0.12 - i * 0.01) / 2 + 0.01, M['e_wasser' if i % 3 == 0 else 'eis'], 'Z', n=10, bev=0)
        cyl('Deckel', 0.037, 0.02, X0 + 0.25, y, 1.13, M['blau'], 'Z', n=12, bev=0)
    box('Mikroskopfuss', 0.22, 0.16, 0.04, X0 + 0.38, -0.05, 0.96, M['kunst'], 0.006); box('Mikroskoparm', 0.05, 0.06, 0.32, X0 + 0.3, -0.05, 1.12, M['kunst'], 0.01)
    cyl('Okular', 0.025, 0.14, X0 + 0.36, -0.05, 1.3, M['rubber'], 'Z', n=10, bev=0, r2=0.02)
    box('Analysegeraet', 0.42, 0.6, 0.38, X0 + 0.3, 0.75, 1.13, M['kunst'], 0.02); box('Analyseschirm', 0.004, 0.36, 0.2, X0 + 0.512, 0.7, 1.18, M['schirm'], 0)
    box('Abzug', 0.6, 1.0, 0.5, X0 + 0.3, 0.75, 2.6, M['petrol2'], 0.02); pipe('Abzugsrohr', [(X0 + 0.3, 0.75, 2.85), (X0 + 0.3, 0.75, HW + 0.4)], 0.12, M['steel'])
    box('Laborlicht', 0.1, 1.2, 0.03, X0 + 0.25, -0.5, 2.1, M['e_sod2'], 0); area('Laborlicht', (X0 + 0.4, -0.5, 2.05), (0, 0, 0), 1.2, 0.3, 25, ICE)
    text('PROBEN · NICHT TRINKEN', 0.05, (X0 + 0.005, -1.2, 1.55), LEFT_X, LEFT_Y, M['txtr'])
def plant(x, y, z, h, R, m, n=5):      # Pflanze aus einzelnen Blättern, die schräg nach außen stehen (Salat, Kräuter)
    for k in range(n):
        a = k * 2 * PI / n + R.uniform(0, 1.2); t = R.uniform(0.35, 0.8); hh = h * R.uniform(0.7, 1.0)
        box('Blatt', 0.012, R.uniform(0.06, 0.1), hh, x + math.cos(a) * math.sin(t) * hh / 2, y + math.sin(a) * math.sin(t) * hh / 2, z + math.cos(t) * hh / 2, m, 0, (0, t, a))
def d_hydro():      # Hydrokultur: Regal mit drei Ebenen, Rinnen mit Salat und Kräutern, Wachstumslicht, Nährlösung
    for z in (0.5, 1.3, 2.1):
        box('Rinne', 0.55, FW - 0.1, 0.12, X0 + 0.32, 0, z, M['kunst'], 0.01)
        box('Substrat', 0.5, FW - 0.16, 0.02, X0 + 0.32, 0, z + 0.06, M['erde'], 0)
        R = random.Random(int(z * 10))
        for i in range(9):
            y = -1.15 + i * 0.29
            for k in range(2):
                plant(X0 + 0.22 + k * 0.18, y + R.uniform(-0.04, 0.04), z + 0.07, R.uniform(0.14, 0.26), R, M['blatt' if (i + k) % 2 else 'blatt2'], 4 + (i % 2))
        box('Wachslicht', 0.3, FW - 0.2, 0.03, X0 + 0.32, 0, z + 0.62, M['e_wachs'], 0)
        area('Wachslicht', (X0 + 0.32, 0, z + 0.6), (0, 0, 0), 0.4, FW - 0.3, 12, (1.0, 0.8, 0.92))
    for y in (-1.33, 1.33): box('Regalpfosten', 0.06, 0.06, 2.8, X0 + 0.32, y, 1.4, M['steel'], 0.004)
    cyl('Naehrtank', 0.22, 0.6, X0 + 0.32, 1.0, 0.3, M['kunst'], 'Z', n=16, bev=0.02); pipe('Naehrleitung', [(X0 + 0.32, 1.0, 0.6), (X0 + 0.1, 1.2, 0.6), (X0 + 0.1, 1.2, 2.2)], 0.02, M['blau'])
def d_kojen():      # zwei Kojen übereinander mit Decken und Kissen, Vorhang, Leselampe, Bild an der Wand
    for z in (0.45, 1.65):
        box('Kojenrahmen', 0.95, FW - 0.1, 0.1, X0 + 0.48, 0, z, M['oxid'], 0.01)
        box('Matratze', 0.88, FW - 0.2, 0.16, X0 + 0.48, 0, z + 0.13, M['stoff2' if z > 1 else 'stoff'], 0.04)
        box('Kissen', 0.5, 0.36, 0.12, X0 + 0.35, -1.0, z + 0.27, M['kunst'], 0.05)
        box('Decke', 0.92, 1.3, 0.05, X0 + 0.5, 0.45, z + 0.23, M['stoff' if z > 1 else 'stoff2'], 0.02)
        box('Leselampe', 0.08, 0.14, 0.06, X0 + 0.06, -0.8, z + 0.6, M['e_warm'], 0.01)
        area('Leselicht', (X0 + 0.25, -0.8, z + 0.55), (0, 0, 0), 0.3, 0.3, 6, WARM)
    for y in (-1.3, 1.3): box('Kojenpfosten', 0.08, 0.08, 2.5, X0 + 0.92, y, 1.25, M['oxid'], 0.006)
    box('Vorhang', 0.03, 0.9, 1.0, X0 + 0.95, 1.0, 2.25, M['stoff2'], 0.01)
    box('Bild', 0.02, 0.4, 0.3, X0 + 0.012, 0.6, 2.2, M['kunst'], 0.004); box('Bildmotiv', 0.004, 0.34, 0.24, X0 + 0.024, 0.6, 2.2, M['blatt2'], 0)
    box('Leiter', 0.05, 0.4, 1.5, X0 + 0.95, -1.15, 1.2, M['steel'], 0.004)
def d_kombuese():      # Kombüse der Messe: Herdblock, Dunstabzug, Töpfe, Regal mit Vorräten, warmes Licht
    box('Herdblock', 0.8, FW - 0.1, 0.92, X0 + 0.4, 0, 0.46, M['steel'], 0.012); box('Herdplatte', 0.82, FW - 0.08, 0.04, X0 + 0.41, 0, 0.94, M['hwand3'], 0.006)
    for (y, r, h) in ((-0.8, 0.2, 0.3), (-0.2, 0.16, 0.22), (0.5, 0.24, 0.36)):
        cyl('Topf', r, h, X0 + 0.42, y, 0.96 + h / 2, M['steel'], 'Z', n=20, bev=0.01); cyl('Topfdeckel', r + 0.01, 0.02, X0 + 0.42, y, 0.97 + h, M['steel'], 'Z', n=20, bev=0.004)
    box('Dunstabzug', 0.7, FW - 0.4, 0.4, X0 + 0.35, 0, 2.45, M['steel'], 0.02); pipe('Abluft', [(X0 + 0.3, 0, 2.65), (X0 + 0.3, 0, HW + 0.3)], 0.15, M['steel'])
    box('Vorratsbord', 0.3, FW - 0.3, 0.03, X0 + 0.15, 0, 1.75, M['holz'], 0.004)
    R = random.Random(5)
    for i in range(10): box('Vorrat', 0.16, 0.14, R.uniform(0.12, 0.26), X0 + 0.14, -1.1 + i * 0.24, 1.9, M[R.choice(('kunst', 'blau', 'gelb', 'gruen'))], 0.01)
    box('Kombuesenlicht', 0.12, FW - 0.4, 0.03, X0 + 0.35, 0, 2.23, M['e_warm'], 0); area('Kombuesenlicht', (X0 + 0.5, 0, 2.2), (0, 0, 0), 2.0, 0.4, 30, WARM)
def d_foerder():      # Förderband aus der Wand: Eisblöcke kommen durch eine Klappe mit Gummilamellen, Band auf Böcken, Waage am Ende
    box('Foerderklappe', 0.06, 1.6, 1.2, X0 + 0.03, 0, 1.4, M['hwand3'], 0.01)
    for q in range(8): box('Gummilamelle', 0.02, 0.19, 1.0, X0 + 0.07, -0.7 + q * 0.2, 1.4, M['rubber'], 0)
    box('Klapprahmen', 0.08, 1.8, 0.1, X0 + 0.05, 0, 2.05, M['gelb'], 0.006)
    box('Band', 1.6, 1.2, 0.08, X0 + 0.85, 0, 0.92, M['gummi2'], 0.006)
    for sy in (-1, 1): box('Bandwange', 1.62, 0.06, 0.2, X0 + 0.85, sy * 0.63, 0.92, M['oxid'], 0.006)
    for x in (0.25, 0.85, 1.45):
        for sy in (-1, 1): box('Bandbock', 0.06, 0.06, 0.85, X0 + x, sy * 0.6, 0.42, M['oxid2'], 0.004)
    for (x, y, s) in ((0.4, -0.2, 0.42), (1.0, 0.15, 0.48), (1.5, -0.1, 0.4)):
        box('Eisblock', s, s * 1.1, s * 0.75, X0 + x, y, 0.96 + s * 0.375, M['eis'], 0.04)
        box('Eisreif', s + 0.01, s * 1.1 + 0.01, 0.03, X0 + x, y, 0.96 + s * 0.75, M['eis2'], 0.01)
    box('Klappenlicht', 0.05, 1.4, 0.04, X0 + 0.07, 0, 2.15, M['e_signal'], 0)
    text('EIS · ANNAHME 1', 0.09, (X0 + 0.065, -0.5, 2.35), LEFT_X, LEFT_Y, M['txtw'])
def d_tafel_pw():      # Tafel des Pumpwerks: Tropfen über drei Wellen in Messing, Gildenname
    box('Tafel', 0.04, 2.5, 1.0, X0 + 0.02, 0, 1.9, M['oxid2'], 0.014); box('Tafelfeld', 0.012, 2.38, 0.88, X0 + 0.046, 0, 1.9, M['hwand3'], 0)
    drop((X0 + 0.05, -0.85, 1.92), LEFT_X, LEFT_Y, 0.36, M['brass'])
    text('BERGBAUGILDE', 0.15, (X0 + 0.054, -0.4, 1.96), LEFT_X, LEFT_Y, M['txtb']); text('PUMPWERK REIFSCHLEIER  ·  PW-2', 0.065, (X0 + 0.054, -0.4, 1.76), LEFT_X, LEFT_Y, M['txtw'])
    box('Tafellicht', 0.03, 2.3, 0.02, X0 + 0.07, 0, 2.45, M['e_sod2'], 0); area('Tafellicht', (X0 + 0.3, 0, 2.5), (0, 0.9, 0), 0.05, 2.2, 18, ICE)
def d_schichtplan():      # Schichttafel: drei Schichten, Namen auf Magnetstreifen, Uhr, Eisbericht
    box('Schichttafel', 0.03, 2.3, 1.3, X0 + 0.015, 0, 1.9, M['kunst'], 0.01)
    R = random.Random(9)
    for col in range(3):
        text(('FRÜH', 'SPÄT', 'NACHT')[col], 0.07, (X0 + 0.034, -1.0 + col * 0.75, 2.42), LEFT_X, LEFT_Y, M['txtd'])
        for q in range(6): box('Namensstreifen', 0.006, 0.55, 0.07, X0 + 0.034, -0.78 + col * 0.75, 2.25 - q * 0.13, M[R.choice(('blau', 'gelb', 'gruen', 'rotbr'))], 0)
    cyl('Uhr', 0.17, 0.04, X0 + 0.04, 0.0, 3.0, M['kunst'], 'X', n=24, bev=0.006); ring('Uhrrand', 0.17, 0.014, (X0 + 0.06, 0.0, 3.0), (1, 0, 0), M['steel'], 24)
    for a in (0.6, 2.1): box('Uhrzeiger', 0.004, 0.012, 0.12, X0 + 0.065, 0.0, 3.0, M['txtd'], 0, (a, 0, 0))
    plate(0.5, 0.25, (X0 + 0.034, 0.75, 1.2), LEFT_X, LEFT_Y, M['white']); text('EISBERICHT: FELD RUHIG', 0.035, (X0 + 0.038, 0.52, 1.22), LEFT_X, LEFT_Y, M['txtd'])
    fender(-FW / 2, FW / 2)
DRESS.update({k[2:]: v for k, v in list(globals().items()) if k.startswith('d_') and k[2:] in ('isolier', 'ventile', 'pegel', 'kuehl', 'pumpe', 'anzuege', 'labor', 'hydro', 'kojen', 'kombuese', 'foerder', 'tafel_pw', 'schichtplan')})

# =====================================================================================
# Objekte (Ursprung am Boden, Vorderseite nach −y)
# =====================================================================================
def p_eisblock():      # Palette mit gestapelten Eisblöcken, Reif obenauf, Schmelzwasser darunter
    box('Palette', 1.2, 1.0, 0.14, 0, 0, 0.07, M['holz'], 0.01)
    R = random.Random(3)
    for i in range(2):
        for j in range(2):
            for k in range(2 if (i + j) % 2 else 3):
                s = 0.46; box('Eisblock', s * 1.15, s, s * 0.8, -0.3 + i * 0.6, -0.25 + j * 0.5, 0.14 + s * 0.4 + k * s * 0.8, M['eis'], 0.04)
    box('Reifhaube', 1.2, 1.0, 0.03, 0, 0, 0.14 + 0.46 * 0.8 * 3, M['eis2'], 0.01)
    spot((0.4, -0.6, 0.0125), 0.6, 'fleck', 1.4)
def p_eiswagen():      # Muldenwagen mit Eisbruch, Deichsel, Räder
    box('Mulde', 1.4, 0.9, 0.5, 0, 0, 0.6, M['gelb'], 0.04); box('Muldenrand', 1.44, 0.94, 0.05, 0, 0, 0.86, M['oxid2'], 0.01)
    R = random.Random(4)
    for q in range(9): box('Eisbruch', R.uniform(0.2, 0.35), R.uniform(0.2, 0.3), R.uniform(0.15, 0.25), R.uniform(-0.5, 0.5), R.uniform(-0.3, 0.3), 0.85 + R.uniform(0, 0.1), M['eis'], 0.03, (R.random(), R.random(), R.random()))
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('Rad', 0.16, 0.08, sx * 0.5, sy * 0.48, 0.16, M['rubber'], 'Y', n=16, bev=0.01)
    pipe('Deichsel', [(-0.7, 0, 0.45), (-1.3, 0, 0.75)], 0.03, M['steel'])
def p_kanister():      # Regal mit Wasserkanistern (blau), Etiketten
    for z in (0.08, 0.68, 1.28): box('Regalboden', 1.6, 0.5, 0.04, 0, 0, z, M['steel'], 0.004)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Regalstiel', 0.04, 0.04, 1.8, sx * 0.78, sy * 0.23, 0.9, M['oxid'], 0.004)
    for z in (0.1, 0.7, 1.3):
        for i in range(4):
            if z > 1.2 and i == 3: continue
            box('Kanister', 0.32, 0.22, 0.42, -0.57 + i * 0.38, 0, z + 0.23, M['blau'], 0.04); box('Etikett', 0.18, 0.004, 0.1, -0.57 + i * 0.38, -0.112, z + 0.25, M['white'], 0)
def p_heizer():      # Heizlüfter auf Rollen mit glühenden Wendeln (warmer Fleck im kalten Raum)
    box('Heizer', 0.5, 0.35, 0.6, 0, 0, 0.42, M['gelb'], 0.03); box('Heizgitter', 0.42, 0.004, 0.4, 0, -0.177, 0.45, M['hwand3'], 0)
    for q in range(4): box('Heizwendel', 0.36, 0.006, 0.02, 0, -0.17, 0.32 + q * 0.08, M['e_kessel'], 0)
    for sx in (-1, 1): cyl('Rolle', 0.05, 0.04, sx * 0.2, 0, 0.05, M['rubber'], 'Y', n=10, bev=0)
    area('Heizschein', (0, -0.4, 0.45), (PI / 2, 0, 0), 0.4, 0.4, 8, KESSEL)
def p_pumpenblock():      # freistehende Doppelpumpe auf Fundament, Rohre in den Boden, Absperrkette
    box('Fundament', 2.4, 1.4, 0.3, 0, 0, 0.15, M['hwand3'], 0.02); box('Fundamentkante', 2.42, 1.42, 0.06, 0, 0, 0.3, M['gelb'], 0.006)
    for sx in (-1, 1):
        x = sx * 0.6
        cyl('Pumpenmotor', 0.28, 0.7, x, -0.3, 0.68, M['petrol'], 'Y', n=24, bev=0.02)
        cyl('Pumpenkopf', 0.36, 0.3, x, 0.25, 0.68, M['guss'], 'Y', n=28, bev=0.02)
        pipe('Pumpenrohr', [(x, 0.25, 1.05), (x, 0.25, 1.5), (x, 0.65, 1.8), (x, 0.65, 6.35)], 0.12, M['blau'], rad=0.2)
        cyl('Pumpenmanometer', 0.07, 0.04, x, 0.25, 1.62, M['steel'], 'Y', n=16, bev=0)
    text('P3', 0.25, (-0.2, -0.71, 0.5), (1, 0, 0), (0, 0, 1), M['txtw'])
    spot((0.0, -1.0, 0.0125), 0.8, 'fleck', 1.6)
def p_tank():      # stehender Wassertank (3 m) mit Leiter, Pegelrohr und Ventil
    cyl('Tank', 0.9, 3.0, 0, 0, 1.6, M['petrol2'], 'Z', n=32, bev=0.04); cyl('Tankfuss', 0.95, 0.12, 0, 0, 0.06, M['oxid2'], 'Z', n=32, bev=0.01)
    for z in (0.8, 1.8, 2.8): ring('Tankband', 0.92, 0.025, (0, 0, z), (0, 0, 1), M['steel'], 32)
    cyl('Pegel', 0.04, 2.4, 0.0, -0.95, 1.6, M['lens'], 'Z', n=10, bev=0); cyl('Pegelwasser', 0.03, 1.5, 0.0, -0.95, 1.15, M['e_wasser'], 'Z', n=8, bev=0)
    text('H2O', 0.22, (-0.3, -0.905, 2.3), (1, 0, 0), (0, 0, 1), M['txtc'])
def p_tresen_pw(tag):      # Tresen im Eiswerk: Emaillegrau mit Messingkante und eisblauem Schirm, Schild darüber
    box('Tresen', 2.6, 0.8, 1.02, 0, 0, 0.51, M['petrol'], 0.02); box('Tresenplatte', 2.72, 0.92, 0.05, 0, 0, 1.045, M['brass2'], 0.012); box('Tresensockel', 2.62, 0.82, 0.12, 0, 0, 0.06, M['oxid2'], 0.008)
    box('Tresenschraffur', 2.61, 0.012, 0.14, 0, -0.407, 0.2, M['warnrw'], 0)
    for x in (-0.95, 0.0, 0.95): box('Tresenfeld', 0.8, 0.02, 0.62, x, -0.405, 0.62, M['petrol2'], 0.006)
    text(tag, 0.13, (-len(tag) * 0.13 * 0.32, -0.418, 0.57), (1, 0, 0), (0, 0, 1), M['txtb'])
    for sx in (-1, 1): ibeam('Schildpfosten', 1.5, sx * 1.25, 0.3, 1.8, 'Z', h=0.12, b=0.12, up='X')
    box('Schildtafel', 2.6, 0.06, 0.4, 0, 0.3, 2.52, M['oxid2'], 0.012); box('Schildfeld', 2.5, 0.012, 0.3, 0, 0.265, 2.52, M['hwand3'], 0)
    text(tag, 0.17, (-len(tag) * 0.17 * 0.32, 0.257, 2.45), (1, 0, 0), (0, 0, 1), M['e_sod2']); box('Schildlicht', 2.4, 0.03, 0.02, 0, 0.26, 2.73, M['e_sod2'], 0)
    box('Tresenschirm', 0.55, 0.03, 0.36, -0.7, 0.12, 1.3, M['hwand3'], 0.008, (0.3, 0, 0)); box('Tresenbild', 0.48, 0.006, 0.3, -0.7, 0.137, 1.305, M['schirm'], 0, (0.3, 0, 0))
    box('Eisprobe', 0.3, 0.25, 0.2, 0.9, 0.08, 1.17, M['eis'], 0.03)
    area('Tresenlicht', (0, -0.3, 2.4), (0, 0, 0), 2.2, 0.3, 40, ICE)
def p_messe_tisch():      # Messetisch für sechs mit Hockern, Tablett, Becher, warme Pendelleuchte darüber
    box('Messeplatte', 2.2, 1.0, 0.05, 0, 0, 0.76, M['holz'], 0.008); cyl('Messefuss', 0.12, 0.72, 0, 0, 0.37, M['steel'], 'Z', n=12, bev=0)
    box('Messefussplatte', 0.8, 0.6, 0.03, 0, 0, 0.015, M['steel'], 0.004)
    for (x, y) in ((-0.7, -0.75), (0.0, -0.75), (0.7, -0.75), (-0.7, 0.75), (0.0, 0.75), (0.7, 0.75)):
        cyl('Hocker', 0.18, 0.04, x, y, 0.46, M['petrol'], 'Z', n=16, bev=0.01); cyl('Hockerfuss', 0.03, 0.44, x, y, 0.22, M['steel'], 'Z', n=8, bev=0)
    box('Tablett', 0.4, 0.3, 0.02, -0.4, 0.1, 0.795, M['kunst'], 0.006)
    for x in (-0.6, 0.3, 0.75): cyl('Becher', 0.04, 0.1, x, -0.2, 0.84, M['brass2'], 'Z', n=12, bev=0)
    pipe('Pendel', [(0, 0, 6.3), (0, 0, 2.6)], 0.01, M['steel'])
    cyl('Pendelschirm', 0.35, 0.22, 0, 0, 2.5, M['oxid2'], 'Z', n=24, bev=0.006, r2=0.08); cyl('Pendelglas', 0.3, 0.02, 0, 0, 2.39, M['e_warm'], 'Z', n=24, bev=0)
    area('Pendellicht', (0, 0, 2.36), (0, 0, 0), 0.5, 0.5, 70, WARM)
def p_sofa():      # Sitzecke der Messe: abgewetztes Sofa, kleiner Tisch, Spielbrett
    box('Sofasitz', 2.0, 0.8, 0.4, 0, 0, 0.3, M['stoff'], 0.06); box('Sofalehne', 2.0, 0.22, 0.6, 0, 0.32, 0.7, M['stoff'], 0.06)
    for sx in (-1, 1): box('Sofaarm', 0.2, 0.8, 0.55, sx * 0.95, 0, 0.45, M['stoff'], 0.05)
    box('Couchtisch', 1.0, 0.55, 0.04, 0, -0.95, 0.45, M['holz'], 0.006); box('Tischbein', 0.9, 0.45, 0.43, 0, -0.95, 0.215, M['oxid2'], 0.004)
    box('Spielbrett', 0.4, 0.4, 0.015, -0.15, -0.95, 0.48, M['kunst'], 0)
    for q in range(6): cyl('Spielstein', 0.02, 0.02, -0.3 + (q % 3) * 0.1, -1.05 + (q // 3) * 0.2, 0.495, M['red' if q % 2 else 'blau'], 'Z', n=8, bev=0)
def p_pflanztisch():      # Anzuchttisch: Schalen mit Setzlingen, Gießkanne, Wachstumslicht
    box('Anzuchttisch', 2.0, 0.9, 0.05, 0, 0, 0.88, M['steel'], 0.006)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Tischbein', 0.05, 0.05, 0.86, sx * 0.95, sy * 0.4, 0.43, M['steel'], 0.004)
    R = random.Random(12)
    for i in range(4):
        for j in range(2):
            x, y = -0.72 + i * 0.48, -0.2 + j * 0.4
            box('Anzuchtschale', 0.42, 0.34, 0.08, x, y, 0.95, M['kunst'], 0.01); box('Anzuchterde', 0.4, 0.32, 0.01, x, y, 0.99, M['erde'], 0)
            for k in range(6): cyl('Setzling', 0.025, R.uniform(0.04, 0.1), x - 0.15 + (k % 3) * 0.15, y - 0.08 + (k // 3) * 0.16, 1.03, M['blatt2'], 'Z', n=6, bev=0, r2=0.005)
    cyl('Giesskanne', 0.1, 0.22, 0.85, 0.3, 1.02, M['gruen'], 'Z', n=12, bev=0.01)
    pipe('Lichtpendel', [(0, 0, 6.3), (0, 0, 2.0)], 0.01, M['steel'])
    box('Wachslicht', 1.6, 0.4, 0.05, 0, 0, 1.95, M['e_wachs'], 0.01); area('Wachslicht', (0, 0, 1.92), (0, 0, 0), 1.5, 0.35, 30, (1.0, 0.8, 0.92))
def p_koje_schrank():      # schmaler Spind mit Namensschild und Foto
    box('Kojenspind', 0.6, 0.55, 2.0, 0, 0, 1.0, M['petrol2'], 0.012)
    for z in (1.75, 1.82): box('Spindschlitz', 0.3, 0.004, 0.018, 0, -0.277, z, M['hwand3'], 0)
    plate(0.14, 0.05, (-0.1, -0.278, 1.5), (1, 0, 0), (0, 0, 1), M['brass']); box('Foto', 0.12, 0.004, 0.09, 0.15, -0.279, 1.4, M['blatt2'], 0)
def p_steg_kiste():      # gestapelte Ersatzteilkisten mit Schablone
    for (x, y, z, s) in ((0, 0, 0.3, 0.6), (0.05, 0.02, 0.9, 0.6), (0.7, -0.1, 0.25, 0.5)):
        box('Teilekiste', s * 1.2, s, s, x, y, z, M['oxid'], 0.02); box('Kistenband', s * 1.21, s + 0.01, 0.05, x, y, z + s * 0.3, M['steel'], 0.004)
    stencil('ERSATZ · DICHTUNGEN', 0.05, (-0.3, -0.31, 0.32), (1, 0, 0), (0, 0, 1))
PROP.update({'eisblock': p_eisblock, 'eiswagen': p_eiswagen, 'kanister': p_kanister, 'heizer': p_heizer, 'pumpenblock': p_pumpenblock, 'tank': p_tank,
             'messe_tisch': p_messe_tisch, 'sofa': p_sofa, 'pflanztisch': p_pflanztisch, 'koje_schrank': p_koje_schrank, 'teilekisten': p_steg_kiste})
PROP.update({'tresen_pw_' + k: (lambda t=t: p_tresen_pw(t)) for k, t in (('markt', 'MARKT'), ('lager', 'LAGER'), ('service', 'SERVICE'), ('auftraege', 'AUFTRÄGE'))})

# =====================================================================================
# Schmelzhalle: obere Hallenwände und Dach (über den Raumhüllen, ab 5,9 m), Kessel, Eisförderer von oben. Drei Bausteine, Ursprung in der
# Mitte der Halle; die Standfläche zählt nur den Kessel (Bausteine oben haben unter 1,9 m nichts).
# Halle innen: x ±HX, y ±HY (Wandflächen der Raumhüllen), oben bis HZ.
# =====================================================================================
HX, HY, HZ = 11.3, 8.3, 11.6
def d_halle_oben():
    for sy in (-1, 1):      # Längswände (Nord, Süd) und Querwände (West, Ost) von 5,9 bis HZ
        box('Hallenwand', 2 * HX + 0.6, 0.12, HZ - RB + 0.2, 0, sy * (HY + 0.06), (RB + HZ) / 2, M['hwand'], 0)
        box('Hallenwand', 0.12, 2 * HY + 0.6, HZ - RB + 0.2, sy * (HX + 0.06), 0, (RB + HZ) / 2, M['hwand'], 0)
        for q in range(9):      # Wandstützen bis unters Dach
            x = -HX + 1.2 + q * (2 * HX - 2.4) / 8
            ibeam('Hallenstuetze', HZ - RB, x, sy * (HY - 0.14), (RB + HZ) / 2, 'Z', h=0.36, b=0.3, up='Y')
        for q in range(7):
            y = -HY + 1.0 + q * (2 * HY - 2.0) / 6
            ibeam('Hallenstuetze', HZ - RB, sy * (HX - 0.14), y, (RB + HZ) / 2, 'Z', h=0.36, b=0.3, up='X')
        ibeam('Kranbahn', 2 * HX, 0, sy * (HY - 0.5), 9.2, 'X', h=0.5, b=0.3)
        box('Wellband', 2 * HX, 0.06, 1.6, 0, sy * (HY - 0.05), 8.0, M['hwelle'], 0)
        box('Hallenlichtband', 2 * HX - 2, 0.1, 0.12, 0, sy * (HY - 0.12), 10.6, M['e_sod2'], 0)
    box('Hallendach', 2 * HX + 0.6, 2 * HY + 0.6, 0.2, 0, 0, HZ + 0.1, M['hwand3'], 0)
    for q in range(7):      # Dachbinder (Fachwerk aus Doppel-T) und Dachlicht
        x = -HX + 1.6 + q * (2 * HX - 3.2) / 6
        ibeam('Dachbinder', 2 * HY, x, 0, HZ - 0.4, 'Y', h=0.7, b=0.3)
        for sy in (-1, 1): box('Kopfband', 0.2, 1.4, 0.18, x, sy * (HY - 0.8), HZ - 1.0, M['oxid'], 0.008, (sy * math.radians(35), 0, 0))
    for (x, y) in ((-7.0, -4.2), (-7.0, 4.2), (7.0, -4.2), (7.0, 4.2), (0.0, -6.2), (0.0, 6.2)):
        pipe('Hallenpendel', [(x, y, HZ - 0.4), (x, y, HZ - 1.6)], 0.016, M['steel'])
        cyl('Hallenhaube', 0.7, 0.4, x, y, HZ - 1.8, M['oxid2'], 'Z', n=28, bev=0.006, r2=0.25); cyl('Hallenglas', 0.6, 0.02, x, y, HZ - 2.01, M['e_sod'], 'Z', n=28, bev=0)
        area('Hallenlicht', (x, y, HZ - 2.05), (0, 0, 0), 1.0, 1.0, 900, ICE)
    # Kranbrücke über dem Kessel mit Laufkatze
    box('Kranbruecke', 1.0, 2 * HY - 1.2, 0.8, 4.5, 0, 9.65, M['gelb'], 0.04); box('Laufkatze', 1.4, 1.6, 0.6, 4.5, -2.0, 9.0, M['oxid2'], 0.04)
    for (dx, dy) in ((-0.4, -0.5), (0.4, -0.5), (-0.4, 0.5), (0.4, 0.5)): pipe('Kranseil', [(4.5 + dx, -2.0 + dy, 8.7), (4.5 + dx * 0.4, -2.0 + dy * 0.4, 6.4)], 0.018, M['steel'])
    box('Kranhaken', 0.5, 0.5, 0.6, 4.5, -2.0, 6.1, M['gelb'], 0.04)
    # Rohrbrücke vom Kessel nach Süden (zu den Tanks) und nach Osten (Pumpen), hoch über dem Boden
    for (a, b, r, mat) in (((0, -1.0, 9.2), (0, -HY, 9.2), 0.35, 'isol'), ((1.2, -0.8, 8.8), (1.2, -HY, 8.8), 0.22, 'blau'), ((2.0, 0, 8.4), (HX, 0, 8.4), 0.28, 'blau'), ((-2.0, 0.5, 8.0), (-HX, 0.5, 8.0), 0.2, 'gruen')):
        pipe('Hallenleitung', [a, b], r, M[mat])
        for t in (0.35, 0.7):
            p = Vector(a).lerp(Vector(b), t); box('Rohrhaenger', 0.06, 0.06, HZ - 0.4 - p.z, p.x, p.y, (HZ - 0.4 + p.z) / 2, M['steel'], 0)
    # Eisförderer: schräges Band von der Nordwand (Annahme) bis über den Kessel, Eisblöcke darauf
    a, b = Vector((-3.0, HY - 0.2, 8.6)), Vector((-0.4, 2.2, 10.2)); d = (b - a); yaw = math.atan2(d.y, d.x)
    sbox('Foerderband', a, b, 1.3, 0.12, M['gummi2'])
    for sx in (-1, 1):
        o = Vector((math.cos(yaw + PI / 2) * sx * 0.7, math.sin(yaw + PI / 2) * sx * 0.7, 0.05)); sbox('Foerderwange', a + o, b + o, 0.08, 0.3, M['oxid'])
    for t in (0.15, 0.4, 0.65, 0.9):
        p = a.lerp(b, t); box('Eisblock', 0.5, 0.5, 0.4, p.x, p.y, p.z + 0.3, M['eis'], 0.04)
    for t in (0.3, 0.75):
        p = a.lerp(b, t); box('Foerderhaenger', 0.08, 0.08, HZ - 0.4 - p.z, p.x, p.y, (HZ - 0.4 + p.z) / 2, M['steel'], 0)
    box('Foerderdurchlass', 1.8, 0.4, 1.4, a.x, HY + 0.05, a.z + 0.4, M['hwand3'], 0.02); box('Durchlassleuchte', 1.6, 0.06, 0.06, a.x, HY - 0.16, a.z + 1.2, M['e_signal'], 0)
    text('EISFÖRDERER · NICHT BETRETEN', 0.22, (-HX + 1.0, HY - 0.07, 6.6), (1, 0, 0), (0, 0, 1), M['txtw'])
    text('SCHMELZHALLE', 0.6, (2.6, -HY + 0.07, 6.8), (-1, 0, 0), (0, 0, 1), M['txtc'])      # an der Südwand, von der Halle aus lesbar
def p_kessel():      # Schmelzkessel: 8 m Durchmesser, gedämmter Mantel aus Feldern mit Messingbändern, vier Schaugläser mit Glut, Laufsteg auf 4 m
    R0 = 4.0
    cyl('Kesselsockel', R0 + 0.5, 0.5, 0, 0, 0.25, M['hwand3'], 'Z', n=48, bev=0.02)
    for a in range(8):      # Füße
        t = a * PI / 4 + PI / 8; box('Kesselfuss', 0.8, 0.5, 1.4, math.cos(t) * (R0 + 0.15), math.sin(t) * (R0 + 0.15), 1.0, M['oxid'], 0.03, (0, 0, t))
    cyl('Kesselmantel', R0, 7.4, 0, 0, 0.5 + 3.7, M['isol'], 'Z', n=64, bev=0)
    for z in (1.3, 2.9, 4.6, 6.2, 7.6): ring('Kesselband', R0 + 0.04, 0.07, (0, 0, z), (0, 0, 1), M['brass'], 64)
    for a in range(16):      # senkrechte Fugen der Dämmfelder
        t = a * PI / 8; box('Kesselfuge', 0.04, 0.05, 7.2, math.cos(t) * (R0 + 0.01), math.sin(t) * (R0 + 0.01), 4.2, M['hwand3'], 0, (0, 0, t))
    cyl('Kesselhals', R0 - 0.2, 0.5, 0, 0, 8.15, M['petrol'], 'Z', n=64, bev=0.02)
    cyl('Kesselhaube', R0 - 0.2, 1.4, 0, 0, 9.1, M['petrol'], 'Z', n=64, bev=0.04, r2=1.4)
    cyl('Einwurf', 1.3, 0.8, -0.4, 1.2, 10.1, M['oxid2'], 'Z', n=24, bev=0.02)
    for a in range(4):      # Schaugläser auf Augenhöhe und am Laufsteg, Wärmeschein nach außen
        t = a * PI / 2 + PI / 4
        for z in (1.65, 5.0):
            rcyl('Schauglas Rahmen', 0.42 if z < 2 else 0.3, 0.14, t, R0 + 0.02, z, M['brass'], n=28, bev=0.02)
            rcyl('Schauglas', 0.32 if z < 2 else 0.22, 0.02, t, R0 + 0.1, z, M['e_kessel'], n=28, bev=0)
        area('Kesselschein', (math.cos(t) * (R0 + 0.6), math.sin(t) * (R0 + 0.6), 1.65), (0, -PI / 2, t), 0.6, 0.6, 60, KESSEL)
    for a in range(4):      # Anzeigen und Schalter am Fuß
        t = a * PI / 2; c = Vector((math.cos(t) * (R0 + 0.12), math.sin(t) * (R0 + 0.12), 1.3))
        box('Kesselkasten', 0.24, 0.7, 0.9, c.x, c.y, c.z, M['petrol'], 0.02, (0, 0, t))
        box('Kesselschirm', 0.01, 0.5, 0.3, c.x + math.cos(t) * 0.125, c.y + math.sin(t) * 0.125, c.z + 0.15, M['schirm'], 0, (0, 0, t))
    # Laufsteg auf 4 m rund um den Kessel, Geländer, zwei Leitern
    zs = 4.0; Ri, Ro = R0 + 0.1, R0 + 1.3
    for a in range(24):
        t0, t1 = a * PI / 12, (a + 1) * PI / 12; tm = (t0 + t1) / 2
        box('Stegfeld', Ro - Ri, 2 * Ro * math.sin(PI / 24) + 0.02, 0.06, math.cos(tm) * (Ri + Ro) / 2, math.sin(tm) * (Ri + Ro) / 2, zs, M['riffel'], 0.006, (0, 0, tm))
        pipe('Stegrohr', [(math.cos(t0) * Ro, math.sin(t0) * Ro, zs + 1.05), (math.cos(t1) * Ro, math.sin(t1) * Ro, zs + 1.05)], 0.03, M['gelb'])
        pipe('Stegrohr', [(math.cos(t0) * Ro, math.sin(t0) * Ro, zs + 0.55), (math.cos(t1) * Ro, math.sin(t1) * Ro, zs + 0.55)], 0.022, M['gelb'])
        cyl('Stegpfosten', 0.025, 1.05, math.cos(t0) * Ro, math.sin(t0) * Ro, zs + 0.52, M['gelb'], 'Z', n=6, bev=0)
        if a % 3 == 0: box('Stegkonsole', 1.3, 0.12, 0.5, math.cos(tm) * (Ri + 0.6), math.sin(tm) * (Ri + 0.6), zs - 0.3, M['oxid'], 0.01, (0, 0, tm))
    for t in (PI * 0.25, PI * 1.25):      # Leitern vom Boden zum Steg (außen am Steg)
        c = Vector((math.cos(t) * (Ro + 0.25), math.sin(t) * (Ro + 0.25), 0)); n = Vector((math.cos(t), math.sin(t), 0)); s = Vector((-n.y, n.x, 0))
        for sg in (-1, 1): pipe('Leiterholm', [c + s * sg * 0.25, c + s * sg * 0.25 + Vector((0, 0, zs + 1.1))], 0.03, M['steel'])
        for q in range(int(zs / 0.32)):
            z = 0.3 + q * 0.32; pipe('Sprosse', [c - s * 0.25 + Vector((0, 0, z)), c + s * 0.25 + Vector((0, 0, z))], 0.02, M['steel'])
    for t in (PI * 0.5, PI * 1.5): box('Stegstuetze', 0.2, 0.2, zs, math.cos(t) * (Ro - 0.2), math.sin(t) * (Ro - 0.2), zs / 2, M['oxid2'], 0.01)
    # Bodenablauf rund um den Kessel, Pfützen, Warnring
    for a in range(24):
        t = a * PI / 12 + PI / 24; box('Ablaufrost', 0.5, 2 * (R0 + 0.9) * math.sin(PI / 24), 0.02, math.cos(t) * (R0 + 0.9), math.sin(t) * (R0 + 0.9), 0.012, M['hrost'], 0, (0, 0, t))
    ring('Warnring', R0 + 1.25, 0.06, (0, 0, 0.004), (0, 0, 1), M['warnrw2'], 64)
    for (x, y, r) in ((5.2, -1.2, 0.9), (-4.6, 3.0, 0.7), (1.8, 5.0, 0.6)): spot((x, y, 0.0125), r, 'fleck', 1.8)
    text('KESSEL 1 · 280 m³', 0.5, (-2.0, -(R0 + 0.03), 6.9), (1, 0, 0), (0, 0, 1), M['txtw'])
PROP.update({'kessel': p_kessel})
DRESS.update({'halle_oben': d_halle_oben})
