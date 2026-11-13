# Talstadt – die Stadt auf Heimstatt II, gebaut mit dem Baukasten (kit_lib.py + kit_interior.py). Läuft in Blender (Talstadt.blend, Textblock stadt_kit).
#
# Koordinaten = Koordinaten des Stations-Innenraums (src/game/interior.ts) mit Blender-y = -z: Die Hangarhalle umschließt genau den Hangar
# (184 × 162 × 42 m, Tor 124 × 32 m bei y = -112, Rückwand bei y = 50), dahinter das Promenadenhaus um Korridor und Promenade (y 50 … 110).
# Im Spiel liegt der Innenraum deckungsgleich in der Stadt: Man fliegt durch das echte Tor in den echten Hangar.
# Ursprung = Hallenboden in der Mitte, das Tor zeigt nach -Y (Anflug von vorn). Stadtmauer bei x = ±238, y = -240 … 246.
#
# Viertel: vorn das Vorfeld mit Leitlichtern und Landeplätzen, links der Turm der Flugleitung; hinter der Halle Promenadenhaus und Marktplatz
# (Gründerdenkmal, Stände, Kneipe „Zur Schleuse“, Herberge, Läden); im Osten Wohnblöcke A–F, im Westen das Hammerwerk (Schlote, Silos,
# Tanks, Rohrbrücken, Kühlturm, Lagerhallen). Straßen: Gassen an den Hallenseiten (x = ±114), Nordallee (y = 232), Gassen vom Markt.
# Frei bleiben müssen: das Hallentor und die Flugbahn davor, der Bereich innerhalb der Hallenwände (dort steht im Spiel der Hangar).
import math

HW, Y0, Y1, HH = 92.0, -112.0, 50.0, 42.0          # Hangar innen (wie interior.ts)
DW, DH = 62.0, 32.0                                # halbe Torbreite, Torhöhe
SX = 105.0                                         # Außenkante der Hallen-Seitenwände (Frachtnischen reichen innen bis x = ±101)
FY = -115.5                                        # Außenkante der Torfassade
BY = 56.0                                          # Außenkante der Hallen-Rückwand
RZ = 47.0                                          # Dachoberkante
WX, WY0, WY1 = 238.0, -240.0, 246.0                # Stadtmauer
DOOR = (0.0, 118.0)                                # Tür Promenadenhaus → Marktplatz (Außenseite)
PI = math.pi

# Ausrichtung einer Fassade: Normale → (Drehung um z für Teile, die nach -Y zeigen; Leserichtung u für Schilder)
def face(n):
    return {'-y': (0.0, (1, 0, 0)), '+y': (PI, (-1, 0, 0)), '+x': (PI / 2, (0, 1, 0)), '-x': (-PI / 2, (0, -1, 0))}[n]

def build(lib):
    K = lib.Kit('Talstadt', seed=77)
    X, Y, Z = lib.X, lib.Y, lib.Z
    R = K.R

    # ------------------------------------------------------------------ Fensterband: beleuchtet, dunkel oder gemischt
    def win_band(L, loc, rz, h=1.2, n=None, lit=0.5, kinds=('light', 'light', 'lamp', 'cool')):
        n = n or max(1, round(L / 1.8))
        with K.at(loc, rz):
            K.box((L, 0.24, h + 0.26), (0, 0, -0.13), side='beam', tint='hull_dark', bevel=0.03, bottom=True)
            cw = (L - 0.26) / n
            for i in range(n):
                x = -L / 2 + 0.13 + cw * (i + 0.5)
                if R.random() < lit: K.glow(R.choice(kinds), (x, -0.125, h / 2), X, Z, cw - 0.14, h - 0.12)
                else: K.glass((x, -0.125, h / 2), X, Z, cw - 0.14, h - 0.12)
    # Fassade eines Quaders mit Fensterbändern je Geschoss (alle vier Seiten oder ausgewählte)
    def floors_windows(cx, cy, sx, sy, n_floors, fh=3.2, z0=1.5, sides='nsew', lit=0.5, inset=0.2):
        for f in range(n_floors):
            z = z0 + f * fh
            if 's' in sides: win_band(sx - 2 * inset - 1.6, (cx, cy - sy / 2 - 0.12, z), 0.0, lit=lit)
            if 'n' in sides: win_band(sx - 2 * inset - 1.6, (cx, cy + sy / 2 + 0.12, z), PI, lit=lit)
            if 'e' in sides: win_band(sy - 2 * inset - 1.6, (cx + sx / 2 + 0.12, cy, z), PI / 2, lit=lit)
            if 'w' in sides: win_band(sy - 2 * inset - 1.6, (cx - sx / 2 - 0.12, cy, z), -PI / 2, lit=lit)

    # ================================================================== 1. Hangarhalle (Hülle um den Hangar)
    K.seg = 8.0                                               # große, glatte Flächen: breitere Spalten (weniger Dreiecke)
    L = BY - FY; yc = (BY + FY) / 2
    for s in (-1, 1):
        x = s * (SX - 1.5)
        # Wand in Zonen: Sockel, Trägerband, Lamellen, Farbband, obere Paneele (etwas vorspringend)
        K.box((3.0, L, 12.0), (x, yc, 0), side='wall', tint='hull_mid', bevel=0.08)
        K.box((3.5, L + 0.4, 1.2), (x, yc, 12.0), side='girder', tint='hull_dark', bevel=0.06, bottom=True)
        K.box((3.0, L, 21.0), (x, yc, 13.2), side='siding', tint='hull', bevel=0.06, bottom=True)
        K.box((3.4, L + 0.3, 1.1), (x, yc, 34.2), side='beam', tint='red', bevel=0.05, bottom=True)
        K.box((3.0, L, RZ - 35.3), (x, yc, 35.3), side='wall', tint='hull_light', bevel=0.06, bottom=True)
        # Wandpfeiler mit Fußstrebe, alle 14 m
        for k in range(12):
            y = FY + 7.0 + k * 14.0
            if y > BY - 4: break
            K.box((2.4, 1.8, RZ + 0.6), (s * (SX + 1.1), y, 0), side='girder', tint='hull_dark', bevel=0.06, along='z')
            K.beam((s * (SX + 0.2), y, 7.0), (s * (SX + 4.6), y, 0.05), 0.9, 0.9, 'beam', 'yellow')
            K.box((3.2, 2.4, 1.0), (s * (SX + 2.6), y, 0), side='girder', tint='black', bevel=0.05)
        # Oberlichtband und Wartungssteg
        u = (0, s, 0); rz = s * PI / 2
        for k in range(5):
            y = FY + 20 + k * 30
            win_band(22.0, (s * (SX + 0.13), y, 39.0), rz, 1.6, 10, lit=0.85, kinds=('cool', 'light'))
        K.walkway(L - 10, 1.6, 26.0, (s * (SX + 3.2), yc, 0), PI / 2, rails=(s > 0, s < 0), legs=1e9)
        # Rohre und Kabel, Leitern, Schaltkästen
        K.pipe([(s * (SX + 0.6), FY + 12, 2.0), (s * (SX + 0.6), BY - 8, 2.0)], 0.32, 'yellow', flange=False)
        K.pipe([(s * (SX + 0.7), FY + 12, 3.0), (s * (SX + 0.7), BY - 8, 3.0)], 0.2, 'steel', flange=False)
        for y in (FY + 30, FY + 88, FY + 146):
            K.ladder(26.0, (s * (SX + 0.05), y, 0), rz)
            K.panel('ctrl', (s * (SX + 0.02), y + 5, 1.0), rz, 1.2, 1.4, 0.3, 'hull_light', glow='screen')
            K.decal('leak' + str(R.randint(1, 4)), (s * (SX + 0.03), y + 9, 8.0), u, Z, 3.2, 7.0, off=0.05)
        # Leuchtschild HANGAR 1 an beiden Längsseiten
        K.neon('c_hangar', (s * (SX + 0.2), FY + 60, 24.0), u, Z, 24.0)
        K.decal('w_hangar', (s * (SX + 0.05), FY + 100, 6.0), u, Z, 9.0)
    # Rückwand über dem Promenadenhaus
    K.box((2 * SX, 3.0, RZ), (0, BY - 1.5, 0), side='siding', tint='hull', bevel=0.06)
    K.box((2 * SX + 0.4, 3.4, 1.1), (0, BY - 1.5, 34.2), side='beam', tint='red', bevel=0.05, bottom=True)
    for x in (-60, -30, 30, 60): win_band(18.0, (x, BY + 0.13, 39.0), PI, 1.6, 8, lit=0.8, kinds=('cool', 'light'))
    # Dach: Platte mit Brüstung, Lüfter, Kanäle, Oberlichter, Mast mit Radar, Flugbefeuerung
    K.box((2 * SX, L, 1.4), (0, yc, RZ - 1.4), side='beam', top='roofing', tint='hull_mid', tint_top='hull_dark', bevel=0.08, bottom=True)
    K.ring(2 * SX - 0.6, L - 0.6, RZ, 0.6, 1.1, 'girder', 'hull_dark')
    # Sheddach: sechs Oberlichtreihen quer über die Halle (senkrechte Verglasung zum Tor, Dachhaut fällt nach hinten ab)
    for j in range(6):
        y = FY + 16 + j * 26.0
        with K.at((0, y, RZ), PI / 2):
            K.prism([(0.0, 0.0), (10.0, 0.0), (0.0, 4.6)], -(SX - 3), SX - 3, side='girder', top='roofing', tint='hull_dark', tint_top='hull_mid', cap_strip='plain')
        K.glass((0, y - 0.02, RZ + 2.3), X, Z, 2 * SX - 8, 4.2)
        for k in range(14): K.box((0.35, 0.3, 4.6), (-(SX - 6) + k * (2 * SX - 12) / 13, y - 0.18, RZ), side='beam', tint='hull_dark', bevel=0.02, along='z')
        if j < 5:
            for i in range(4): K.vent_unit((-72 + i * 48, y + 17, RZ), sx=4.2, sy=4.2, sz=1.8, tint='hull_mid')
    for s in (-1, 1): K.walkway(L - 8, 1.4, 0.4, (s * (SX - 4), yc, RZ), PI / 2, rails=(True, True), legs=1e9)
    K.antenna(18.0, (-90, BY - 14, RZ)); K.antenna(12.0, (90, BY - 18, RZ)); K.dish(4.0, (60, BY - 22, RZ), 0.6, 0.8)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1):
            p = (sx_ * (SX - 1.5), FY + 1.5 if sy_ < 0 else BY - 1.5, RZ + 1.2)
            K.glowbox('redlamp', (0.6, 0.6, 0.6), p); K.light('redlamp', p, 7.0)

    # ================================================================== 2. Torfassade mit Schiebetoren, Torbrücke, Leitschild
    fd = -FY - 112.4                                         # Tiefe der Fassade (3,1 m)
    fyc = FY + fd / 2
    for s in (-1, 1):
        x0, x1 = DW + 1.0, SX                               # Pylon neben der Öffnung
        cx, w = s * (x0 + x1) / 2, x1 - x0
        K.box((w, fd, RZ), (cx, fyc, 0), side='wall', tint='hull', bevel=0.1)
        # senkrechte Rippen und Sockel
        for k in range(5):
            x = s * (x0 + 3 + k * (w - 6) / 4)
            K.box((1.4, 1.2, RZ - 1), (x, FY - 0.5, 0), side='girder', tint='hull_dark', bevel=0.05, along='z')
        K.box((w + 0.4, fd + 1.0, 3.0), (cx, fyc - 0.5, 0), side='girder', tint='black', bevel=0.06)
        K.box((w + 0.4, fd + 0.6, 1.0), (cx, fyc - 0.3, 34.2), side='beam', tint='red', bevel=0.05, bottom=True)
        # geparkte Torflügel (zwei je Seite, versetzt vor dem Pylon)
        for k, dy in enumerate((-1.6, -3.1)):
            K.box((30.5, 1.1, DH + 1.0), (s * (DW + 16.6 + k * 4.0), FY + dy, 0.6), side='siding', tint='hull_mid' if k else 'hull_light', bevel=0.08, along='x')
            K.box((30.5, 1.3, 0.6), (s * (DW + 16.6 + k * 4.0), FY + dy, 0), side='girder', tint='black', bevel=0.04)
            K.decal('w_achtung' if k else 'w_kein_zutritt', (s * (DW + 16.6 + k * 4.0), FY + dy - 0.56, 6.0), X, Z, 8.0, off=0.03)
            K.box((1.0, 1.3, DH + 1.0), (s * (DW + 2.0 + k * 4.0), FY + dy, 0.6), side='hazard', tint='none', bevel=0.03, along='z')
        # Bodenschiene der Tore
        K.box((40.0, 3.6, 0.15), (s * (DW + 20), FY - 2.3, 0), side='girder', top='floor', tint='hull_dark', bevel=0.02)
        # Laufsteg auf halber Höhe mit Treppe, Lampensäulen, Kamera, Schaltkasten
        K.walkway(w - 4, 1.6, 18.0, (cx, FY - 0.9 - 4.2, 0), 0.0, rails=(True, False), legs=1e9)
        K.box((w - 4, 1.6, 0.4), (cx, FY - 0.9 - 4.2, 17.6), side='beam', tint='hull_dark', bevel=0.03, bottom=True)
        for z in (6.0, 14.0, 22.0, 30.0):
            K.box((0.8, 0.9, 1.6), (s * (DW + 2.4), FY - 0.4, z), side='plain', tint='hull_dark', bevel=0.05, bottom=True)
            K.glow('light', (s * (DW + 2.4), FY - 0.86, z + 0.8), X, Z, 0.55, 1.2); K.light('light', (s * (DW + 2.4), FY - 1.4, z + 0.8), 5.0)
        K.panel('ctrl', (s * (DW + 9.0), FY, 1.2), 0.0, 1.4, 1.6, 0.3, 'hull_light', glow='screen')
        K.decal('soot', (s * (DW + 12), FY - 0.02, RZ - 8), X, Z, 10.0, 10.0, off=0.06)
        K.decal('rust' + str(1 + (s > 0)), (s * (DW + 26), FY - 0.02, 20.0), X, Z, 3.0, 9.0, off=0.06)
    # Eckpylone: vorspringende Türme an den Fassadenecken mit Warnstreifen, Leiter und Befeuerung
    for s in (-1, 1):
        cx = s * (SX - 2.5)
        K.box((5.0, 5.0, RZ + 5.0), (cx, FY - 2.5, 0), side='wall', top='roofing', tint='hull_mid', tint_top='hull_dark', bevel=0.12)
        K.box((5.4, 5.4, 2.2), (cx, FY - 2.5, 0), side='girder', tint='black', bevel=0.06)
        for z in (8.0, 20.0, 32.0): K.box((5.3, 5.3, 1.6), (cx, FY - 2.5, z), side='hazard', tint='none', bevel=0.04, bottom=True)
        K.ladder(RZ + 4, (cx - s * 2.52, FY - 2.5, 0), -s * PI / 2)
        p = (cx, FY - 2.5, RZ + 5.6); K.glowbox('redlamp', (0.6, 0.6, 0.6), p); K.light('redlamp', p, 7.0)
        # Galerie (Torleitstand) über den geparkten Torflügeln
        win_band(30.0, (s * (DW + 18), FY - 0.13, 38.6), 0.0, 1.8, 12, lit=0.9, kinds=('cool', 'screen', 'cool'))
        K.box((32.0, 1.6, 0.35), (s * (DW + 18), FY - 0.8, 37.9), side='beam', top='floor', tint='hull_dark', bevel=0.03, bottom=True)
        K.railing((s * (DW + 2), FY - 1.5, 38.25), (s * (DW + 34), FY - 1.5, 38.25), 1.05, 'yellow', 1.6)
        # Flutlichter auf der Dachkante, zum Vorfeld gerichtet
        for k in range(3):
            x = s * (DW + 8 + k * 12)
            K.box((3.2, 1.6, 1.4), (x, FY - 0.6, RZ - 0.4), side='plain', tint='hull_mid', bevel=0.06, bottom=True)
            K.glow('light', (x, FY - 1.42, RZ + 0.3), X, Z, 2.8, 1.0); K.light('light', (x, FY - 2.2, RZ + 0.1), 9.0)
    # Sturz über dem Tor, Warnrahmen, Torbrücke mit Strahlern
    K.box((2 * DW + 2.0, fd, RZ - DH - 1.0), (0, fyc, DH + 1.0), side='siding', tint='hull', bevel=0.1, bottom=True)
    K.box((2 * DW + 2.4, fd + 0.6, 1.4), (0, fyc - 0.3, DH + 1.0), side='hazard', tint='none', bevel=0.04, bottom=True)
    for s in (-1, 1): K.box((1.4, fd + 0.6, DH + 1.0), (s * (DW + 0.7), fyc - 0.3, 0), side='hazard', tint='none', bevel=0.04, along='z')
    K.box((2 * DW + 8, 2.2, 2.2), (0, FY - 1.8, DH + 4.2), side='girder', tint='hull_dark', bevel=0.06, bottom=True)
    for k in range(9):
        x = -DW + 6 + k * (2 * DW - 12) / 8
        K.box((2.2, 1.4, 1.2), (x, FY - 3.2, DH + 3.0), side='plain', tint='hull_mid', bevel=0.06, bottom=True)
        K.glow('light', (x, FY - 3.92, DH + 3.6), X, Z, 1.8, 0.9); K.light('light', (x, FY - 4.6, DH + 3.4), 7.0)
    K.neon('c_talstadt', (0, FY - 0.15, DH + 10.0), X, Z, 64.0)
    K.number('01', (DW + 24, FY - 0.6, DH + 2.0), X, Z, 9.0, 'yellow', 0.05)
    K.neon('c_hangar', (-(DW + 22), FY - 0.65, DH + 6.5), X, Z, 22.0)
    # Absperrgitter vor dem Tor (zu Fuß kein Zutritt zum Hangar; Schiffe fliegen darüber): Pfosten, Glasfelder, Handlauf, Warnstreifen
    GY = FY - 7.0
    for k in range(32):
        x = -DW + k * (2 * DW) / 31
        K.box((0.22, 0.22, 3.0), (x, GY, 0.2), side='plain', tint='hull_dark', bevel=0.02, along='z')
        if k < 31:
            K.glass((x + DW / 31, GY - 0.02, 1.7), X, Z, 2 * DW / 31 - 0.3, 2.6)
            if k % 6 == 3: K.decal('w_kein_zutritt', (x + DW / 31, GY - 0.05, 1.6), X, Z, 2.8, off=0.02)
    K.box((2 * DW, 0.16, 0.14), (0, GY, 3.2), side='plain', tint='yellow', bevel=0.01, bottom=True)
    K.box((2 * DW, 0.24, 0.3), (0, GY, 0.2), side='hazard', tint='none', bevel=0.01, bottom=True)
    # Leitlinie auf der Schwelle: Lichtpunkte in den Hangar
    for k in range(13):
        x = -DW + 4 + k * (2 * DW - 8) / 12
        K.glowbox('lamp', (1.0, 0.5, 0.12), (x, FY - 5.0, 0.14)); K.light('lamp', (x, FY - 5.0, 0.5), 3.0)

    # ================================================================== 3. Vorfeld: Platte, Leitlichter, Markierungen, Landeplätze, Gerät
    AY0, AY1, AX = FY - 0.3, -232.0, 92.0
    K.slab(2 * AX, AY0 - AY1, 0.2, (0, (AY0 + AY1) / 2, 0), tint='concrete', cell=8.0, uvm=6.0)
    with K.overlay():
        for s in (-1, 1):
            K.box((0.8, AY0 - AY1 - 30, 0.03), (s * 28, (AY0 + AY1) / 2 - 10, 0.2), side='plain', tint='yellow', bevel=0, bottom=True)
            K.box((0.5, AY0 - AY1 - 30, 0.03), (s * 63, (AY0 + AY1) / 2 - 10, 0.2), side='plain', tint='white', bevel=0, bottom=True)
        for k in range(10):
            y = AY0 - 12 - k * 10
            K.box((6.0, 1.2, 0.03), (0, y, 0.2), side='plain', tint='white', bevel=0, bottom=True)
        K.box((2 * AX - 2, 2.0, 0.035), (0, AY0 - 3.5, 0.2), side='hazard', tint='none', bevel=0, bottom=True)
    K.number('1', (0, AY0 - 38, 0.22), X, Y, 16.0, 'white', 0.02)
    K.decal('w_landezone', (0, AY0 - 62, 0.22), X, Y, 30.0, off=0.02)
    for k in range(4): K.decal(('tyre', 'stain1', 'soot', 'stain2')[k], (-30 + k * 22, AY0 - 70 - k * 14, 0.22), X, Y, 10, 14, off=0.03)
    for s in (-1, 1):
        for k in range(12):
            K.post((s * 40, AY0 - 14 - k * 9.5, 0.2), 1.6, 'lamp')
    for s, num in ((-1, '2'), (1, '3')):
        K.pad(30.0, (s * 64, -205.0, 0.0), 0.5, num)
    # Gerät an den Rändern
    K.tank(1.6, 7.0, (-78, -130, 0.2), PI / 2, 'white'); K.tank(1.6, 7.0, (-73, -130, 0.2), PI / 2, 'hull_light', 'p_o2')
    K.generator((-78, -150, 0.2), PI / 2); K.hauler((74, -140, 0.2), 0.2); K.cart((80, -160, 0.2), -0.3)
    K.container((78, -123, 0.2), PI / 2, 'orange', '41'); K.container((78.4, -123, 2.8), PI / 2 + 0.03, 'blue', '07')
    for i in range(5): K.crate(1.8, 1.8, 1.5, (-84 + (i % 3) * 2.1, -170 - (i // 3) * 2.2, 0.2), 0.1 * i, ('hull_light', 'yellow', 'green')[i % 3], 'warn' if i == 2 else None)
    # Vorfeldkontrolle (kleines Häuschen)
    K.block(6.0, 5.0, 3.6, (-84, -192, 0.2), tint='hull_light', plinth=0.4, cornice=0.3)
    win_band(4.2, (-84, -194.62, 1.5), 0.0, 1.2, 3, lit=1.0, kinds=('screen',)); K.door((-81.0, -194.5, 0.2), 0.0, w=1.2)
    K.antenna(6.0, (-85.5, -191, 3.8))

    # ================================================================== 4. Turm der Flugleitung (links vor der Halle)
    TX, TYY = -152.0, -150.0
    K.block(20, 20, 12, (TX, TYY, 0), tint='hull', plinth=0.8)
    floors_windows(TX, TYY, 20, 20, 3, 3.4, 1.6, 'nsew', lit=0.6)
    K.door((TX + 10.1, TYY, 0), PI / 2, w=1.6)
    K.neon('c_flug', (TX + 10.2, TYY, 10.6), (0, 1, 0), Z, 14.0)
    K.block(9, 9, 46, (TX, TYY, 12), tint='hull_light', plinth=0.5, cornice=0.4)
    for z in range(16, 56, 4): K.glow('cool', (TX + 4.51, TYY, z), Y, Z, 1.2, 2.4)
    K.ladder(44, (TX - 4.52, TYY + 2, 12), -PI / 2)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1): K.beam((TX + sx_ * 9, TYY + sy_ * 9, 12), (TX + sx_ * 4.6, TYY + sy_ * 4.6, 36), 0.7, 0.7, 'beam', 'yellow')
    # Kanzel: auskragender Ring, schräge Verglasung als Fensterband rundum, Dach
    CZ = 58.0
    K.box((17, 17, 1.2), (TX, TYY, CZ), side='beam', top='floor', tint='hull_dark', bevel=0.08)
    K.box((15.6, 15.6, 4.6), (TX, TYY, CZ + 1.2), side='plain', tint='hull_dark', bevel=0.05, bottom=True)
    for n in ('-y', '+y', '+x', '-x'):
        rz, u = face(n); d = {'-y': (0, -7.81), '+y': (0, 7.81), '+x': (7.81, 0), '-x': (-7.81, 0)}[n]
        K.glass((TX + d[0], TYY + d[1], CZ + 3.5), u, Z, 14.8, 3.6)
        K.glow('screen', (TX + d[0] * 0.98, TYY + d[1] * 0.98, CZ + 1.9), u, Z, 12.0, 0.25)
    K.box((18.4, 18.4, 1.0), (TX, TYY, CZ + 5.8), side='beam', top='roofing', tint='hull', bevel=0.08, bottom=True)
    K.antenna(14, (TX + 4, TYY + 4, CZ + 6.8)); K.antenna(9, (TX - 5, TYY - 4, CZ + 6.8)); K.dish(2.6, (TX - 3, TYY + 4, CZ + 6.8), 1.2, 0.5)
    K.box((3.0, 0.8, 0.8), (TX, TYY, CZ + 7.6), side='plain', tint='hull_mid', bevel=0.05)
    for sx_ in (-1, 1):
        for sy_ in (-1, 1): p = (TX + sx_ * 8.9, TYY + sy_ * 8.9, CZ + 7.0); K.glowbox('redlamp', (0.4, 0.4, 0.4), p); K.light('redlamp', p, 5.0)

    # ================================================================== 5. Promenadenhaus (umschließt Korridor und Promenade) und Marktplatz
    PY0, PY1, PXH, PH = BY, DOOR[1], 24.0, 16.0
    K.block(2 * PXH, PY1 - PY0, PH, (0, (PY0 + PY1) / 2, 0), tint='hull_light', tint_top='hull_mid', plinth=0.8, cornice=0.5)
    floors_windows(0, (PY0 + PY1) / 2, 2 * PXH, PY1 - PY0, 3, 4.2, 4.0, 'ew', lit=0.7)
    # Eingangsportal: Vordach, Glaswand, Tür, Leuchtschild
    K.box((16, 5.0, 0.6), (0, PY1 + 2.5, 5.2), side='beam', top='roofing', tint='hull_dark', bevel=0.06, bottom=True)
    for s in (-1, 1): K.box((0.5, 0.5, 5.2), (s * 7.6, PY1 + 4.6, 0), side='girder', tint='hull_dark', bevel=0.04, along='z')
    K.glow('light', (0, PY1 + 2.5, 5.18), X, -Y, 14.0, 0.5)
    K.light('light', (0, PY1 + 3.0, 4.8), 6.0)
    for s in (-1, 1): K.glass((s * 4.5, PY1 + 0.02, 2.4), (-1, 0, 0), Z, 4.6, 4.4)
    K.door((0, PY1 + 0.15, 0), PI, w=2.4, h=2.8)
    K.neon('c_prom', (0, PY1 + 0.25, 8.0), (-1, 0, 0), Z, 13.0)
    K.neon('v_markt', (PXH + 0.3, PY1 - 3.0, 4.0), (0, 1, 0), Z, 2.0)
    K.neon('p_wehr', (-PXH - 0.25, PY1 - 8.0, 3.0), (0, -1, 0), Z, 3.2)
    for x in (-18, -12, 12, 18): win_band(4.6, (x, PY1 + 0.13, 9.6), PI, 2.4, 2, lit=0.8)
    # Marktplatz
    MX, MY0, MY1 = 46.0, PY1, 198.0
    K.slab(2 * MX, MY1 - MY0, 0.18, (0, (MY0 + MY1) / 2, 0), tint=(0.3, 0.29, 0.27), cell=6.0, uvm=3.0)
    with K.overlay():
        K.ring(2 * MX - 1.0, MY1 - MY0 - 1.0, 0.16, 0.8, 0.06, 'plain', 'hull_mid', 0.0)
        for k in range(8): K.decal(('stain1', 'stain2', 'scuff', 'tyre')[k % 4], (-30 + (k % 4) * 20, MY0 + 18 + (k // 4) * 40, 0.19), X, Y, 6, 6, off=0.02)
    # Gründerdenkmal: Sockel mit Stufen, ein Landebein des ersten Siedlerschiffs, Tafel
    MC = (0.0, 158.0)
    K.box((10, 10, 0.5), (MC[0], MC[1], 0.18), side='plain', tint='concrete', bevel=0.05)
    K.box((7, 7, 1.6), (MC[0], MC[1], 0.68), side='wall', tint='hull_mid', bevel=0.08, bottom=True)
    base = (MC[0], MC[1], 2.28)
    K.box((3.6, 3.6, 0.5), base, side='girder', tint='hull_dark', bevel=0.06, bottom=True)
    K.tube((MC[0] - 1.0, MC[1] + 0.5, 2.7), (MC[0] + 1.5, MC[1] - 2.0, 11.5), 0.65, 'siding', 'hull_light', 14, mode='around')
    K.tube((MC[0] + 0.8, MC[1] + 0.8, 2.7), (MC[0] + 1.7, MC[1] - 1.6, 9.0), 0.28, 'pipe', 'steel', 10)
    K.box((2.4, 2.4, 1.4), (MC[0] + 1.6, MC[1] - 2.1, 11.2), side='girder', tint='hull_dark', bevel=0.1, bottom=True)
    K.tube((MC[0] - 1.6, MC[1] + 1.2, 2.75), (MC[0] - 1.6, MC[1] + 1.2, 2.95), 1.6, 'girder', 'rust', 16, mode='around')
    K.neon('p_gruend', (MC[0], MC[1] - 3.52, 1.5), X, Z, 1.6)
    K.decal('rust1', (MC[0] + 0.4, MC[1] - 1.0, 7.0), X, Z, 1.2, 3.0, off=0.7)
    for k in range(4):
        a = k * PI / 2 + PI / 4; p = (MC[0] + math.cos(a) * 7.8, MC[1] + math.sin(a) * 7.8, 0.18)
        K.bench(3.0, p, a + PI / 2)
        K.glowbox('lamp', (0.3, 0.3, 0.3), (MC[0] + math.cos(a) * 4.9, MC[1] + math.sin(a) * 4.9, 0.5))
    # Lichtmasten am Platzrand
    for p in [(-MX + 3, MY0 + 6), (MX - 3, MY0 + 6), (-MX + 3, MY1 - 4), (MX - 3, MY1 - 4), (-MX + 3, 158), (MX - 3, 158)]:
        K.mast_light(10.0, (p[0], p[1], 0.18), 0.0 if p[0] < 0 else PI, 2)
    # Lichterketten quer über den Platz
    for y in (MY0 + 6, 158.0, MY1 - 4):
        a = (-MX + 3.4, y, 9.4); b = (MX - 3.4, y, 9.4); K.cable(a, b, 1.6, 0.03, 12)
        for k in range(1, 16):
            t = k / 16; p = (a[0] + (b[0] - a[0]) * t, y, 9.4 - 1.6 * math.sin(math.pi * t) - 0.15)
            K.glowbox('lamp', (0.22, 0.22, 0.28), p)
            if k % 3 == 0: K.light('lamp', p, 1.4)
    # Marktstände (je Seite vier): Theke, Rahmen, Plane, Ware, Lampe
    AWN = ['red', 'blue', 'olive', 'orange', 'blue', 'red', 'orange', 'olive']
    stalls = []
    for i in range(8):
        s = -1 if i < 4 else 1; y = MY0 + 18 + (i % 4) * 16; x = s * (MX - 9)
        with K.at((x, y, 0.18), -s * PI / 2):              # Theke zeigt zur Platzmitte
            K.box((5.0, 1.6, 1.05), (0, 0.5, 0), side='siding', top='plain', tint='hull_mid', bevel=0.05)
            for sx_ in (-1, 1):
                for sy_ in (-0.4, 2.4): K.tube((sx_ * 2.6, sy_, 0), (sx_ * 2.6, sy_, 3.0 - (0.4 if sy_ < 0 else 0)), 0.07, 'plain', 'hull_dark', 6)
            K.prism([(-2.8, 2.6), (2.8, 2.6), (2.8, 3.0), (-2.8, 3.0)], -0.7, 2.6, side='plain', top='siding', tint=AWN[i], tint_top=AWN[i], caps=(True, True), cap_strip='plain')
            K.box((5.6, 0.12, 0.5), (0, -0.66, 2.1), side='plain', tint=AWN[i], bevel=0.01, bottom=True)
            for k in range(3): K.crate(0.8, 0.6, 0.45, (-1.6 + k * 1.6, 0.5, 1.05), 0.1 * k, ('yellow', 'hull_light', 'green')[k])
            K.crate(1.2, 1.2, 1.0, (1.9, 1.9, 0), 0.2, 'hull_light'); K.barrel((-2.0, 2.0, 0), ('blue', 'red', 'green')[i % 3], 0.38, 1.0)
            K.glowbox('lamp', (0.25, 0.25, 0.25), (0, 1.0, 2.55)); K.light('lamp', (0, 1.0, 2.4), 2.4)
            if i == 1: K.neon('c_imbiss', (0, -0.72, 2.35), X, Z, 2.2)
            if i == 6: K.neon('c_teile', (0, -0.72, 2.35), X, Z, 2.2)
        stalls.append((x - s * 2.4, y))                     # Kundenplatz vor der Theke
    # Pflanzkübel, Abfall, Poller
    for p in [(-14, MY0 + 6), (14, MY0 + 6), (-30, 186), (30, 186)]: K.planter(2.0, 2.0, (p[0], p[1], 0.18), 0.0, 0.8, 3)
    for p in [(-20, MY0 + 5), (20, MY0 + 5), (-36, 190), (36, 190)]: K.bin((p[0], p[1], 0.18))
    # Kneipe „Zur Schleuse“ (Ost) und Herberge (West)
    KX, KY = 62.0, 150.0
    K.block(22, 26, 9.0, (KX, KY, 0), tint='hull', tint_top='hull_dark', plinth=0.6)
    K.door((KX - 11.1, KY, 0), -PI / 2, w=1.8, h=2.5)
    K.neon('c_bar', (KX - 11.2, KY, 4.4), (0, -1, 0), Z, 12.0)
    K.neon('v_bar', (KX - 11.25, KY - 11.5, 3.2), (0, -1, 0), Z, 1.6)
    for dy in (-7.5, 7.5): win_band(5.0, (KX - 11.13, KY + dy, 1.4), -PI / 2, 1.6, 3, lit=1.0, kinds=('lamp',))
    floors_windows(KX, KY, 22, 26, 1, 3.2, 5.5, 'nse', lit=0.6)
    for k in range(3): K.barrel((KX - 12.5, KY + 9 + k * 1.0, 0.18), 'rust' if k % 2 else 'hull_mid', 0.4, 1.05)
    K.bench(2.4, (KX - 13.5, KY - 5, 0.18), -PI / 2, back=False)
    K.vent_unit((KX + 4, KY + 4, 9.0)); K.antenna(7, (KX - 6, KY + 8, 9.0))
    HX, HY = -62.0, 150.0
    K.block(24, 28, 15.0, (HX, HY, 0), tint='hull_light', tint_top='hull_mid', plinth=0.6)
    floors_windows(HX, HY, 24, 28, 4, 3.4, 1.6, 'nsw', lit=0.55)
    for f in range(4): win_band(9.0, (HX + 12.13, HY + 7, 1.6 + f * 3.4), PI / 2, 1.2, 4, lit=0.55)
    K.door((HX + 12.1, HY - 6, 0), PI / 2, w=2.0, h=2.6)
    K.neon('c_hotel', (HX + 12.2, HY - 6, 4.0), (0, 1, 0), Z, 13.0)
    K.neon('v_hotel', (HX + 12.25, HY + 13.4, 6.0), (0, 1, 0), Z, 2.4)
    K.box((6, 3, 0.4), (HX + 13.5, HY - 6, 3.2), side='beam', top='roofing', tint='hull_dark', bevel=0.04, bottom=True)
    K.vent_unit((HX - 4, HY + 6, 15.0)); K.vent_unit((HX + 4, HY - 6, 15.0), sx=1.8, sy=1.8); K.tank(1.2, 4.0, (HX - 5, HY - 8, 15.0), 0.0, 'white', None)
    # Ladenzeile am Nordrand des Platzes (zwei Blöcke beiderseits der Gasse)
    shop = []
    for s in (-1, 1):
        cx = s * 27.0; cy = MY1 + 12.0
        K.block(38, 22, 8.0, (cx, cy, 0), tint='hull', tint_top='hull_dark', plinth=0.6)
        for k in range(3):
            x = cx - 12.6 + k * 12.6
            K.box((10.6, 0.6, 3.6), (x, MY1 + 0.7, 0), side='beam', tint='hull_dark', bevel=0.04)
            K.glass((x, MY1 + 0.38, 1.8), X, Z, 9.8, 3.0)
            K.glow('light', (x, MY1 + 0.36, 3.75), X, Z, 9.8, 0.3)
            K.box((11.0, 2.4, 0.3), (x, MY1 - 0.5, 3.8), side='beam', top='roofing', tint=('red', 'blue', 'olive')[(k + (s > 0)) % 3], bevel=0.03, bottom=True)
            shop.append((x, MY1 - 2.0))
        win_band(34.0, (cx, MY1 + 0.88, 5.4), 0.0, 1.4, 14, lit=0.5)
        K.vent_unit((cx - 8, cy + 3, 8.0)); K.vent_unit((cx + 8, cy - 2, 8.0), sx=1.6, sy=2.4)
    K.neon('c_med', (-27.0 - 12.6, MY1 + 0.3, 4.6), X, Z, 6.0)
    K.neon('c_teile', (27.0, MY1 + 0.3, 4.6), X, Z, 6.0)
    K.neon('v_kino', (-7.7, MY1 + 6, 3.4), (0, 1, 0), Z, 1.6)

    # ================================================================== 6. Straßen
    LANE = 114.0
    for s in (-1, 1):
        K.slab(12.0, 466.0, 0.16, (s * LANE, 0.0, 0), tint=(0.27, 0.27, 0.26), cell=12.0, uvm=5.0)
    K.slab(2 * WX - 12, 12.0, 0.16, (0, 232.0, 0), tint=(0.27, 0.27, 0.26), cell=12.0, uvm=5.0)
    K.slab(12.0, 232.0 - 6 - (MY1 + 23), 0.16, (0, (232.0 - 6 + MY1 + 23) / 2, 0), tint=(0.27, 0.27, 0.26), cell=6.0, uvm=5.0)
    for s in (-1, 1):
        K.slab(LANE - 6 - MX, 10.0, 0.16, (s * (MX + (LANE - 6 - MX) / 2), MY0 + 8.0, 0), tint=(0.27, 0.27, 0.26), cell=10.0, uvm=5.0)
        K.slab(WX - LANE - 6, 12.0, 0.16, (s * (LANE + 6 + (WX - LANE - 6) / 2), -20.0, 0), tint=(0.27, 0.27, 0.26), cell=12.0, uvm=5.0)
        K.slab(LANE - 6 - AX, 40.0, 0.16, (s * (AX + (LANE - 6 - AX) / 2), -150.0, 0), tint=(0.27, 0.27, 0.26), cell=10.0, uvm=5.0)
    with K.overlay():
        for s in (-1, 1):
            for k in range(28): K.box((0.3, 6.0, 0.02), (s * LANE, -225 + k * 16.5, 0.16), side='plain', tint='white', bevel=0, bottom=True)
        for k in range(28): K.box((6.0, 0.3, 0.02), (-222 + k * 16.5, 232.0, 0.16), side='plain', tint='white', bevel=0, bottom=True)
    # Straßenlaternen (einarmig) und Wegweiser
    for s in (-1, 1):
        for k in range(15):
            y = -215 + k * 31
            if MY0 - 4 < y < MY0 + 20: continue
            K.mast_light(9.0, (s * (LANE + 6.8), y, 0), PI / 2 * -s, 1)
    for k in range(14): K.mast_light(9.0, (-205 + k * 31.5, 239.0, 0), PI, 1)
    K.signpost('w_hangar', (LANE + 7.5, -40, 0.16), -PI / 2, 2.6, 0.8); K.signpost('w_hangar', (-LANE - 7.5, -40, 0.16), PI / 2, 2.6, 0.8)
    K.signpost('w_lager', (-LANE - 7.5, 210, 0.16), PI / 2, 2.6, 0.8)

    # ================================================================== 7. Wohnviertel im Osten: Blöcke A–F und kleinere Häuser
    BLK = [(152, -186, 30, 22, 6, 'a'), (205, -186, 26, 26, 9, None), (152, -126, 26, 22, 5, None), (205, -116, 30, 30, 10, 'b'),
           (152, -60, 30, 24, 8, 'c'), (205, -40, 26, 22, 6, None), (152, 10, 28, 26, 7, None), (205, 40, 30, 26, 11, 'd'),
           (152, 80, 26, 22, 5, None), (152, 140, 30, 26, 8, 'e'), (205, 120, 26, 30, 7, None), (205, 186, 30, 26, 9, 'f'), (152, 196, 26, 22, 4, None)]
    K.seg = 4.5
    TNT = ['hull_light', 'hull', (0.36, 0.33, 0.28), (0.24, 0.27, 0.27), 'hull_light']
    for i, (cx, cy, sx, sy, fl, letter) in enumerate(BLK):
        h = fl * 3.2 + 1.6; tnt = TNT[i % len(TNT)]
        K.block(sx, sy, h, (cx, cy, 0), tint=tnt, tint_top='hull_mid', plinth=0.9, cornice=0.5)
        floors_windows(cx, cy, sx, sy, fl, 3.2, 1.5, 'nsew', lit=0.45)
        K.door((cx - sx / 2 - 0.1, cy, 0), -PI / 2, w=1.8, h=2.4)
        K.box((4.0, 3.0, 0.3), (cx - sx / 2 - 1.5, cy, 2.9), side='beam', top='roofing', tint='hull_dark', bevel=0.03, bottom=True)
        # Treppenhaus an der Seite, Dachaufbauten
        K.box((5.0, 5.0, h + 3.0), (cx + sx / 2 - 2.5, cy + sy / 2 - 2.5, 0), side='wall', top='roofing', tint='hull_mid', bevel=0.06)
        for f in range(1, fl): K.glow('light', (cx + sx / 2 + 0.01, cy + sy / 2 - 2.5, 1.0 + f * 3.2), Y, Z, 0.7, 1.6)
        K.vent_unit((cx - sx / 4, cy - sy / 4, h)); K.tank(1.3, 4.5, (cx + sx / 6, cy - sy / 5, h), PI / 2 if i % 2 else 0.0, 'white', None)
        if i % 3 == 0: K.antenna(8 + i % 4, (cx - sx / 3, cy + sy / 4, h))
        if i % 4 == 1: K.dish(1.6, (cx + sx / 4, cy + sy / 5, h), PI * 0.8, 0.7)
        # Balkone an den hohen Blöcken (Westseite)
        if fl >= 7:
            for f in range(2, fl, 2):
                z = f * 3.2 + 0.2
                K.box((1.4, sy * 0.6, 0.25), (cx - sx / 2 - 0.75, cy - sy * 0.1, z), side='beam', top='floor', tint='hull_dark', bevel=0.03, bottom=True)
                K.railing((cx - sx / 2 - 1.4, cy - sy * 0.4, z + 0.25), (cx - sx / 2 - 1.4, cy + sy * 0.2, z + 0.25), 1.0, 'hull_dark', 1.2)
        if letter: K.neon('c_block_' + letter, (cx - sx / 2 - 0.3, cy - sy / 2 + 3.0, h - 3.2), (0, -1, 0), Z, 3.0)
        # Klimakästen an der Südseite
        for k in range(min(fl, 5)):
            K.panel('vent', (cx - sx / 2 + 3 + R.random() * (sx - 8), cy - sy / 2 - 0.02, 1.0 + R.randint(0, fl - 1) * 3.2 + 2.2), 0.0, 1.0, 0.8, 0.5, 'hull_light')
        # Gewächshaus auf jedem dritten Dach
        if i % 3 == 2:
            K.box((sx * 0.5, sy * 0.4, 0.3), (cx - sx / 6, cy + sy / 6, h), side='beam', tint='hull_dark', bevel=0.03)
            gx, gy = cx - sx / 6, cy + sy / 6
            for n_, (dx, dy, u_) in (('s', (0, -sy * 0.2, X)), ('n', (0, sy * 0.2, -X))):
                K.glass((gx + dx, gy + dy, h + 1.6), u_, Z, sx * 0.5, 2.6)
            K.glow('green', (gx, gy, h + 0.32), X, Y, sx * 0.46, sy * 0.36)
            K.glass((gx, gy, h + 2.95), X, Y, sx * 0.5, sy * 0.4)
    # Werbetafeln auf den Dächern (zum Vorfeld und zur Gasse)
    for (cx, cy, h, ad) in ((205, 40, 11 * 3.2 + 1.6, 'ad_werft'), (205, -116, 10 * 3.2 + 1.6, 'ad_kristall')):
        for dy in (-5, 5): K.box((0.5, 0.5, 18.0), (cx - 4, cy + dy, h), side='girder', tint='hull_dark', bevel=0.03, along='z')
        K.box((0.6, 10.6, 17.2), (cx - 4.3, cy, h + 1.2), side='beam', tint='hull_dark', bevel=0.04, bottom=True)
        K.sign(ad, (cx - 4.62, cy, h + 9.8), (0, -1, 0), Z, 8.0, 16.0)
        for dy in (-3.5, 0, 3.5): K.box((0.9, 0.5, 0.4), (cx - 5.0, cy + dy, h + 18.4), side='plain', tint='hull_mid', bevel=0.03, bottom=True); K.light('light', (cx - 5.4, cy + dy, h + 18.2), 3.0)
    # Container und Schuppen zwischen den Blöcken, Gartenbeete
    for k in range(5):
        row, lvl = (k, 0) if k < 3 else (k - 3, 1)
        K.container((180, -160 + row * 2.9, lvl * 2.6), 0.0, ('blue', 'orange', 'olive', 'red', 'hull_light')[k], '%02d' % (60 + k))
    for k in range(3): K.planter(7.0, 2.2, (178.0, 160 + k * 5.0, 0), 0.0, 0.6, 7)
    K.block(8, 6, 3.4, (178, 176, 0), tint=(0.3, 0.26, 0.2), plinth=0.3, cornice=0.2); K.door((178, 172.9, 0), 0.0, w=1.2)
    # Fußgängerbrücken zwischen Blöcken
    K.walkway(53 - 30, 2.2, 13.0, ((152 + 15 + 205 - 13) / 2, -186, 0), 0.0, legs=1e9)
    K.walkway(205 - 15 - 152 - 15, 2.2, 16.0, ((152 + 15 + 205 - 15) / 2, 40, 0), 0.0, legs=1e9)
    # Parkende Fahrzeuge
    K.hauler((LANE + 9, -96, 0.16), 0.0, 'olive'); K.hauler((LANE + 9, 60, 0.16), PI, 'hull_light', 'orange'); K.cart((LANE + 10, 100, 0.16), 0.1)

    # ================================================================== 8. Hammerwerk im Westen: Schlote, Kolonnen, Rohrbrücke, Tanks, Silos, Kühlturm, Hallen
    K.seg = 6.0
    # Rohrtrasse quer durchs Werk (y = -108)
    for k in range(12):
        x = -216 + k * 8.0
        if -122 < x < -106: continue
        for dy in (-1.4, 1.4): K.box((0.45, 0.45, 6.0), (x, -108 + dy, 0), side='girder', tint='hull_dark', bevel=0.03, along='z')
        K.beam((x, -109.8, 6.0), (x, -106.2, 6.0), 0.45, 0.45, 'girder', 'hull_dark')
    for k, (r, t) in enumerate(((0.55, 'yellow'), (0.4, 'steel'), (0.5, 'green'), (0.3, 'red'))):
        K.tube((-218, -109.2 + k * 0.85, 6.6 + r), (-126, -109.2 + k * 0.85, 6.6 + r), r, 'pipe', t, 10, caps=False)
    for (x, y) in ((-170, -100), (-205, -116)):
        K.block(4.5, 4.0, 3.0, (x, y, 0), tint='hull_light', plinth=0.3, cornice=0.2); K.door((x, y - 2.05, 0), 0.0, w=1.1); K.antenna(4.0, (x + 1.2, y + 1.0, 3.0))
    # Raffinerie mit drei Schloten und zwei Kolonnen auf einer Betonfläche
    K.slab(70, 70, 0.3, (-182, -60, 0), tint='concrete', cell=10.0, uvm=4.0)
    for k, (x, y) in enumerate([(-200, -82), (-188, -82), (-176, -82)]):
        K.tube((x, y, 0.3), (x, y, 2.0), 3.4, 'girder', 'hull_dark', 16, mode='around')
        K.tube((x, y, 2.0), (x, y, 46.0 - k * 4), 2.2, 'wall', 'hull_light' if k != 1 else 'hull', 16, mode='around', r2=1.7)
        for z in (12.0, 24.0, 36.0 - k * 4): K.tube((x, y, z - 0.4), (x, y, z + 0.4), 2.45 - z * 0.012, 'hazard', 'none', 16, mode='around', caps=False)
        K.tube((x, y, 45.8 - k * 4), (x, y, 46.8 - k * 4), 1.9, 'girder', 'black', 16, mode='around', caps=False)
        p = (x, y, 47.4 - k * 4); K.glowbox('redlamp', (0.5, 0.5, 0.5), p); K.light('redlamp', p, 6.0)
        K.ladder(40.0 - k * 4, (x, y - 2.25, 2.0))
    for x, y, h, r in ((-196, -52, 30.0, 3.0), (-180, -52, 24.0, 2.6)):
        K.tube((x, y, 0.3), (x, y, h), r, 'wall', 'white', 18, mode='around')
        for z in range(6, int(h), 6):
            K.tube((x, y, z), (x, y, z + 0.35), r + 1.3, 'floor', 'hull_dark', 18, mode='around')
        K.ladder(h, (x, y - r - 0.02, 0.3)); K.pipe([(x + r, y, h - 3), (x + r + 3, y, h - 3), (x + r + 3, y, 6), (-166, y, 6)], 0.4, 'yellow')
    K.block(22, 14, 8, (-160, -40, 0.3), tint='hull', plinth=0.5); floors_windows(-160, -40, 22, 14, 1, 3.2, 3.0, 'se', lit=0.6)
    K.generator((-170, -30, 0.3), 0.0, 'green'); K.generator((-166, -30, 0.3), 0.0, 'olive')
    # Rohrbrücke von der Raffinerie zur Hallenwand (über die Westgasse)
    for k in range(9):
        x = -148 + k * 5.0
        if -122 < x < -106: continue
        for s in (-1, 1): K.box((0.5, 0.5, 8.0), (x, -40 + s * 1.6, 0), side='girder', tint='hull_dark', bevel=0.03, along='z')
        K.beam((x, -42, 8.0), (x, -38, 8.0), 0.5, 0.5, 'girder', 'hull_dark')
    for k, (r, t, dz) in enumerate(((0.5, 'yellow', 8.6), (0.35, 'steel', 8.6), (0.45, 'red', 9.5))):
        K.tube((-150, -41.2 + k * 1.2, dz), (-SX - 4, -41.2 + k * 1.2, dz), r, 'pipe', t, 10, caps=False)
    # Tanklager: stehende Rundtanks und Kugeltanks
    for k, (x, y) in enumerate([(-212, 10), (-190, 10), (-212, 34), (-190, 34)]):
        K.tube((x, y, 0), (x, y, 1.0), 9.4, 'girder', 'hull_dark', 24, mode='around')
        K.tube((x, y, 1.0), (x, y, 12.0), 9.0, 'siding', 'white' if k % 2 else 'hull_light', 24, mode='around', caps=False)
        K.tube((x, y, 12.0), (x, y, 13.6), 9.0, 'roofing', 'hull_mid', 24, mode='around', r2=7.0)
        K.tube((x, y, 5.6), (x, y, 6.2), 9.08, 'beam', 'yellow', 24, mode='around', caps=False)
        K.ladder(12.0, (x, y - 9.05, 0))
        if k == 0: K.neon('c_hammer', (x, y - 9.1, 8.5), X, Z, 10.0)
    for x in (-160, -146):
        y = 22.0
        for sx_ in (-1, 1):
            for sy_ in (-1, 1): K.tube((x + sx_ * 3.2, y + sy_ * 3.2, 0), (x + sx_ * 3.2, y + sy_ * 3.2, 6.0), 0.35, 'pipe', 'hull_dark', 8)
        K.sphere(6.0, (x, y, 11.0), 'white', 'wall_b', 20, 10)
    # Silos am Nordwestrand
    for k in range(5): K.silo(4.0, 18.0, (-148, 92 + k * 11.0, 0), ('hull_light', 'hull', 'hull_light', 'white', 'hull')[k])
    K.walkway(46.0, 1.6, 20.0, (-148, 114, 0), PI / 2, legs=1e9)
    K.box((10, 10, 34), (-148, 146, 0), side='siding', top='roofing', tint='hull_mid', bevel=0.08)
    K.beam((-148, 141, 33.0), (-148, 92, 21.0), 1.4, 1.6, 'girder', 'hull_dark')
    # Kühlturm
    CX, CY = -198.0, 150.0
    K.tube((CX, CY, 0), (CX, CY, 16.0), 17.0, 'wall', (0.32, 0.31, 0.3), 32, mode='around', caps=False, r2=12.5)
    K.tube((CX, CY, 16.0), (CX, CY, 30.0), 12.5, 'wall', (0.32, 0.31, 0.3), 32, mode='around', caps=False, r2=13.6)
    K.tube((CX, CY, 0.2), (CX, CY, 16.0), 16.6, 'wall', 'hull_dark', 32, mode='around', caps=False, r2=12.1, flip=True)
    K.tube((CX, CY, 16.0), (CX, CY, 29.8), 12.1, 'wall', 'hull_dark', 32, mode='around', caps=False, r2=13.2, flip=True)
    K.tube((CX, CY, 29.6), (CX, CY, 30.3), 13.75, 'beam', 'hull_mid', 32, mode='around', caps=False)
    K.decal('soot', (CX, CY - 13.4, 26.0), X, Z, 14.0, 6.0, off=0.2)
    # Lagerhallen mit Pultdach und Toren, Container, Wagen
    for k, (x, y) in enumerate([(-190, -170), (-190, -130)]):
        K.block(46, 24, 10, (x, y, 0), tint='hull', tint_top='hull_mid', plinth=0.6)
        K.wing(24, 8, 10.0, 6.0, (x + 23, y, 0), 1, tint='hull_mid', rafters=4)
        K.gate(11, 8, 1.6, (x + 6, y - 12.9, 0), number='1%d' % (k + 2), label='w_lager')
        K.gate(11, 8, 1.6, (x - 12, y - 12.9, 0), number='1%d' % (k + 4), label='w_lager')
        win_band(40.0, (x, y + 12.13, 7.0), PI, 1.2, 16, lit=0.5)
    K.neon('c_hammer', (-190 + 23 + 8.15, -170, 3.4), (0, 1, 0), Z, 14.0)
    for k in range(6): K.container((-150 + (k % 3) * 6.6, -186 + (k // 3) * 3.0, 0), 0.0, ('blue', 'orange', 'hull_light', 'red', 'olive', 'blue')[k], '%02d' % (20 + k))
    for k in range(3): K.container((-150 + k * 6.6, -186, 2.6), 0.04 * k, ('olive', 'blue', 'orange')[k], '%02d' % (40 + k))
    K.hauler((-LANE - 9, -150, 0.16), PI, 'olive'); K.hauler((-LANE - 9, 40, 0.16), 0.0, 'hull_light', 'blue')
    for k in range(6): K.cage((-136 + (k % 3) * 2.4, -110 - (k // 3) * 2.4, 0), 2.2, ('red', 'orange')[k % 2])

    # Tanklager vorn rechts: liegende Tanks, Pumpenhaus, Rohre, Zaun
    for k in range(4): K.tank(2.4, 14.0, (175, -229 + k * 7.0, 0), 0.0, ('white', 'hull_light')[k % 2], 'p_caution' if k == 3 else None)
    K.block(8, 6, 4.0, (203, -214, 0), tint='hull', plinth=0.4, cornice=0.3); K.door((199, -214, 0), -PI / 2, w=1.2)
    K.pipe([(183.5, -229, 2.0), (190, -229, 2.0), (190, -214, 2.0), (199, -214, 2.0)], 0.3, 'yellow')
    K.pipe([(183.5, -208, 2.6), (192, -208, 2.6), (192, -212, 2.6), (199, -212, 2.6)], 0.22, 'steel')
    for a, b in (((163, -234), (213, -234)), ((213, -234), (213, -202)), ((213, -202), (163, -202)), ((163, -202), (163, -234))): K.railing((a[0], a[1], 0), (b[0], b[1], 0), 1.8, 'hull_mid', 2.4)
    K.signpost('w_treibstoff', (162.5, -205, 0), PI / 2, 2.8, 0.8)
    # Fahrzeughalle vorn links: drei Tore zur Stadt, Rover davor
    K.block(34, 18, 8.0, (-200, -212, 0), tint='hull', tint_top='hull_mid', plinth=0.6)
    for k in range(3): K.gate(8.0, 5.6, 1.4, (-211 + k * 11, -202.3, 0), PI, number='2%d' % k, label=None)
    win_band(30.0, (-200, -221.13, 5.4), 0.0, 1.2, 12, lit=0.5)
    K.hauler((-211, -196, 0), PI, 'olive'); K.cart((-189, -194, 0), PI + 0.1)
    # ================================================================== 9. Stadtmauer mit Türmen und zwei Rovertoren
    K.seg = 10.0
    def wall_seg(a, b):
        ax, ay = a; bx, by = b; Lw = math.hypot(bx - ax, by - ay)
        if Lw < 1: return
        rz = math.atan2(by - ay, bx - ax); cx, cy = (ax + bx) / 2, (ay + by) / 2
        with K.at((cx, cy, 0), rz):
            K.box((Lw, 3.0, 10.0), (0, 0, 0), side='wall', top='roofing', tint='hull_mid', tint_top='hull_dark', bevel=0.08)
            K.box((Lw, 3.4, 1.0), (0, 0, 0), side='girder', tint='black', bevel=0.05)
            K.box((Lw, 0.6, 1.4), (0, 1.2, 10.0), side='beam', tint='hull_dark', bevel=0.04, bottom=True)
            n = max(1, int(Lw // 24))
            for i in range(n + 1):
                x = -Lw / 2 + Lw * i / n
                K.box((1.6, 4.4, 11.0), (x, 0, 0), side='girder', tint='hull_dark', bevel=0.06, along='z')
    def tower(x, y):
        K.block(10, 10, 17.0, (x, y, 0), tint='hull', tint_top='hull_mid', plinth=0.8, cornice=0.5)
        K.turret((x, y, 17.0), math.atan2(-x, -y) + PI)
        K.box((0.8, 0.8, 4), (x + 4, y + 4, 17.0), side='girder', tint='hull_dark', bevel=0.04, along='z')
        p = (x + 4, y + 4, 21.4); K.glowbox('redlamp', (0.4, 0.4, 0.4), p); K.light('redlamp', p, 5.0)
        for n in ('-y', '+y', '+x', '-x'):
            rz, u = face(n); d = {'-y': (0, -5.12), '+y': (0, 5.12), '+x': (5.12, 0), '-x': (-5.12, 0)}[n]
            win_band(6.0, (x + d[0], y + d[1], 12.0), rz, 1.0, 3, lit=0.7)
    GAP = AX + 4                                              # Vorfeld bleibt offen
    GY0, GY1 = -30.0, -10.0                                    # Rovertore Ost und West
    corners = [(-WX, WY0), (WX, WY0), (WX, WY1), (-WX, WY1)]
    wall_seg((-WX, WY0), (-GAP, WY0)); wall_seg((GAP, WY0), (WX, WY0))
    for s in (-1, 1):
        wall_seg((s * WX, WY0), (s * WX, GY0)); wall_seg((s * WX, GY1), (s * WX, WY1))
    wall_seg((WX, WY1), (-WX, WY1))
    for p in corners + [(-GAP - 5, WY0), (GAP + 5, WY0), (-WX, GY0 - 5), (-WX, GY1 + 5), (WX, GY0 - 5), (WX, GY1 + 5), (-WX, 120), (WX, 120), (0, WY1), (-WX, -130), (WX, -130)]:
        tower(*p)
    for s, name in ((1, 'c_tor_o'), (-1, 'c_tor_w')):
        x = s * WX
        K.box((4.0, GY1 - GY0 + 10, 2.5), (x, (GY0 + GY1) / 2, 11.0), side='siding', tint='hull_dark', bevel=0.06, bottom=True)
        K.box((4.4, GY1 - GY0 + 10.4, 0.8), (x, (GY0 + GY1) / 2, 10.6), side='hazard', tint='none', bevel=0.03, bottom=True)
        # Schild an der Innenseite des Torbalkens (Ost: Normale -X, Leserichtung -Y; West: Normale +X, Leserichtung +Y)
        K.neon(name, (x - s * 2.05, (GY0 + GY1) / 2, 12.25), (0, -s, 0), Z, 2.2)
        for dy in (GY0 + 1, GY1 - 1):
            K.glowbox('lamp', (0.4, 0.4, 0.4), (x - s * 2.3, dy, 10.6)); K.light('lamp', (x - s * 2.3, dy, 10.4), 3.0)
        K.barrier(4.0, (x - s * 8, GY0 - 4, 0), PI / 2)
    # Wehrgang-Lichter
    for k in range(12):
        p = (-WX + 20 + k * 40, WY1 - 2.2, 11.8); K.glowbox('lamp', (0.3, 0.3, 0.3), p); K.light('lamp', p, 2.6)
    return K.build('Stadt_Kit'), {'stalls': stalls, 'shops': shop}

def meta(extra):
    g = lambda x, y: [round(x, 2), round(-y, 2)]                # Blender (x, y) → Spiel (x, z)
    stalls = extra.get('stalls', []); shops = extra.get('shops', [])
    return {
        'R': 340, 'collide_above': 1.0, 'city': True,
        'door': {'x': DOOR[0], 'z': -(DOOR[1] + 0.3), 'out': g(DOOR[0], DOOR[1] + 3.2), 'yaw': 0.0},       # Tür Promenadenhaus (außen) und Platz davor
        'gate': {'x0': -DW + 2, 'x1': DW - 2, 'y0': 1.5, 'y1': DH - 1.5, 'z0': 40.0, 'z1': 112.0},           # im Hallentor: automatisch andocken
        'dock': {'x': 0, 'y': 16.0, 'z': 175.0}, 'launch': {'x': 0, 'y': 16.0, 'z': 112.0, 'yaw': PI},
        'stalls': [g(*p) for p in stalls], 'shops': [g(*p) for p in shops],
        'bar': g(62.0 - 13.0, 150.0), 'inn': g(-62.0 + 13.5, 144.0), 'monument': g(0.0, 158.0 - 5.0),
        # Wege der Passanten (Spielkoordinaten x, z): Rundgang um den Platz, Gasse Ost, Gasse West, Nordallee, Vorfeldrand
        'paths': [
            [g(-36, 124), g(36, 124), g(36, 192), g(-36, 192), g(-36, 124)],
            [g(-20, 140), g(20, 140), g(20, 176), g(-20, 176), g(-20, 140)],
            [g(40, 126), g(110, 126), g(112, 0), g(112, -160), g(112, 0), g(110, 126), g(40, 126)],
            [g(-40, 126), g(-110, 126), g(-112, 40), g(-112, -100), g(-112, 40), g(-110, 126), g(-40, 126)],
            [g(0, 222), g(0, 232), g(180, 232), g(0, 232), g(-180, 232), g(0, 232), g(0, 222)],
            [g(0, 200), g(0, 226), g(-110, 232), g(-112, 150), g(-60, 126), g(0, 124), g(0, 200)],
        ],
        'guards': [[*g(-8, 120), 0.0], [*g(8, 120), 0.0], [*g(WX - 8, -20), -PI / 2], [*g(-WX + 8, -20), PI / 2], [*g(-70, -118), PI], [*g(70, -118), PI]],
        'traffic': {'far': [0, 140, 1400], 'in': [0, 14, 60]},
    }
