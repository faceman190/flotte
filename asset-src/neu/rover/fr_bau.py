# Normkisten für den Laderaum (25.11.2026, Konzept docs/konzept-schiffe-fracht.md, Schritt 3). Ein Modell je Lauf, Name aus FR_NAME:
#   FrachtKiste      1,2 × 0,8 × 0,8 m  (10 Einheiten): Transportkiste aus Verbundstoff: Unterschale und Deckel mit Fuge, Rippen,
#                    Stahl-Eckkappen mit Nieten, Spannverschlüsse, Klappgriffe an den Stirnseiten, Stapelrand, Druckventil, Etikett
#   FrachtPalette    1,2 × 1,2 × 1,2 m  (25 Einheiten): Stahlpalette mit drei Kufen und Deckblechen, Frachtbox mit Sickenfeldern,
#                    Eckwinkel mit Stapelkegeln, zwei Spanngurte mit Kantenschutz, Haken und Ratsche, Kartenhalter
#   FrachtContainer  3,0 × 2,4 × 2,4 m (100 Einheiten): Halbcontainer nach ISO-Art: Trapezsicken an Seiten und Stirnwand, Eckpfosten und
#                    Eckbeschläge mit Langlöchern, Ober- und Untergurte, Querträger, Gabelstaplertaschen, Flügeltür mit vier
#                    Verriegelungsstangen, Nockenhaltern, Scharnieren, Dichtung, Kennzeichnung und Zulassungsschild
# Überarbeitet am 25.11.2026 (Nutzer: „Modelle der Kisten und Container aufarbeiten, mehr Detail“).
# Der helle Lack (Gruppe lack) nimmt im Spiel die Farbe der Ware an (Instanzfarbe), Stahl, Gummi und Schrift bleiben.
# Achsen: X Länge, Y Breite, Z oben; Ursprung am Boden in der Mitte. Eine Sammlung „Aufbau“ (rv_export.py → deco/<Name>).
import bpy, os, math
from mathutils import Vector
_pf = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'plattform', 'pf_lib.py')
exec(compile(open(_pf, encoding='utf-8').read(), 'pf_lib.py', 'exec'))
PI = math.pi
NAME = os.environ.get('FR_NAME', 'FrachtKiste')
M.update(
    fr_lack=mk('Frachtlack', (0.6, 0.6, 0.58), 0.3, 0.55, var=0.12, rvar=0.1, scale=1.6, bump=0.1, bscale=60, wear=0.7, streak=0.25),
    fr_lack2=mk('Frachtlack dunkel', (0.42, 0.42, 0.405), 0.3, 0.6, var=0.12, rvar=0.1, scale=1.6, bump=0.1, bscale=60, wear=0.5, streak=0.2),
    fr_stahl=mk('Frachtstahl', (0.32, 0.33, 0.34), 0.9, 0.38, var=0.15, wear=0.9, streak=0.2),
    fr_stahl2=mk('Frachtstahl dunkel', (0.16, 0.165, 0.17), 0.85, 0.5, var=0.15, wear=0.8, streak=0.2),
    fr_dunkel=mk('Frachtgummi', (0.03, 0.03, 0.032), 0.05, 0.75, var=0.1),
    fr_loch=mk('Frachtöffnung', (0.008, 0.008, 0.009), 0.05, 0.9, var=0.05, grime=False),
    fr_gurt=mk('Spanngurt', (0.55, 0.32, 0.05), 0.05, 0.8, var=0.15, grime=True),
    fr_karte=mk('Frachtkarte', (0.78, 0.78, 0.74), 0.0, 0.7, var=0.08, grime=True),
)
L, L2, S, S2, D, H, G, K = (M[k] for k in ('fr_lack', 'fr_lack2', 'fr_stahl', 'fr_stahl2', 'fr_dunkel', 'fr_loch', 'fr_gurt', 'fr_karte'))
TXT = M['txtd']
CUR[0] = coll('Aufbau')

def schrift(s, size, origin, xd, yd, align='CENTER'):
    return text(s, size, origin, xd, yd, TXT, align=align)
def rect(lx, ly, c=0.0):      # Rechteck ±lx, ±ly mit abgeschrägten Ecken (gegen den Uhrzeigersinn)
    if c <= 0: return [(-lx, -ly), (lx, -ly), (lx, ly), (-lx, ly)]
    return [(-lx + c, -ly), (lx - c, -ly), (lx, -ly + c), (lx, ly - c), (lx - c, ly), (-lx + c, ly), (-lx, ly - c), (-lx, -ly + c)]
def niet(x, y, z, axis, r=0.008, m=None):
    cyl('Niet', r, 0.006, x, y, z, m or S, axis, n=8, bev=0)
def strichcode(x0, y, z0, w, h, n=26, face=-1):      # Strichcode auf einer Karte in der Ebene y (Blick von face)
    x = x0
    for k in range(n):
        bw = w / n * (0.35 + 0.5 * ((k * 7) % 3) / 2)
        box('Strich', bw, 0.0015, h, x + bw / 2, y + face * 0.0008, z0 + h / 2, H, 0); x += w / n
def karte(x, y, z, w, h, face=-1, zeilen=(), code=True):      # Kartenhalter (Stahlrahmen) mit beschrifteter Karte auf einer Fläche y = const
    box('Kartenrahmen', w + 0.03, 0.008, h + 0.03, x, y + face * 0.004, z, S2, 0.002)
    box('Karte', w, 0.004, h, x, y + face * 0.009, z, K, 0)
    xd = (-face, 0, 0)
    yy = y + face * 0.0115
    for i, (s, size) in enumerate(zeilen):
        schrift(s, size, (x - face * (-w / 2 + 0.012), yy, z + h / 2 - 0.012 - size - i * size * 1.45), xd, (0, 0, 1), align='LEFT')
    if code: strichcode(x - w / 2 + 0.012 if face < 0 else x - w / 2 + 0.012, yy, z - h / 2 + 0.01, w * 0.6, h * 0.22, face=face)

# =====================================================================================
if NAME == 'FrachtKiste':
    lx, ly, h = 0.6, 0.4, 0.8
    zf, zs, zd = 0.045, 0.50, 0.765          # Fußhöhe, Fuge, Deckeloberkante
    prism('Kistenschale', rect(lx - 0.012, ly - 0.012, 0.06), zf, zs - 0.006, L, 'Z', 0.012)
    prism('Kistenfuge', rect(lx - 0.024, ly - 0.024, 0.055), zs - 0.008, zs + 0.012, D, 'Z', 0.002)
    prism('Kistendeckel', rect(lx - 0.006, ly - 0.006, 0.062), zs + 0.01, zd, L, 'Z', 0.014)
    # Stapelrand oben, vertieftes Deckelfeld und vier Stapelmulden für die Füße der Kiste darüber
    for sx in (-1, 1): box('Stapelrand', 0.05, 2 * ly - 0.14, 0.022, sx * (lx - 0.06), 0, zd + 0.011, L, 0.008)
    for sy in (-1, 1): box('Stapelrand', 2 * lx - 0.14, 0.05, 0.022, 0, sy * (ly - 0.06), zd + 0.011, L, 0.008)
    box('Deckelfeld', 2 * lx - 0.24, 2 * ly - 0.24, 0.006, 0, 0, zd + 0.002, L2, 0.004)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Stapelmulde', 0.11, 0.11, 0.004, sx * (lx - 0.1), sy * (ly - 0.1), zd + 0.002, D, 0.002)
    # umlaufende Rippen an der Schale, senkrechte Rippen an den Längsseiten (Schale und Deckel)
    for z in (0.11, 0.42): prism('Rippe', rect(lx + 0.002, ly + 0.002, 0.07), z - 0.016, z + 0.016, L, 'Z', 0.008)
    prism('Deckelrippe', rect(lx + 0.004, ly + 0.004, 0.07), zs + 0.02, zs + 0.05, L, 'Z', 0.008)
    for sy in (-1, 1):
        for x in (-0.36, -0.12, 0.12, 0.36):
            box('Längsrippe', 0.034, 0.024, zs - zf - 0.08, x, sy * (ly - 0.004), (zf + zs) / 2, L, 0.006)
            box('Deckelrippe', 0.034, 0.02, zd - zs - 0.09, x, sy * (ly + 0.002), zs + 0.1 + (zd - zs - 0.09) / 2 - 0.02, L, 0.006)
    for sx in (-1, 1):
        for y in (-0.22, 0.22): box('Stirnrippe', 0.024, 0.034, zs - zf - 0.08, sx * (lx - 0.004), y, (zf + zs) / 2, L, 0.006)
    # Stahl-Eckkappen (acht) mit je drei Nieten
    for sx in (-1, 1):
        for sy in (-1, 1):
            for z, zz in ((zf + 0.055, 'u'), (zd - 0.045, 'o')):
                box('Eckkappe', 0.15, 0.15, 0.12, sx * (lx - 0.05), sy * (ly - 0.05), z, S, 0.022)
                niet(sx * (lx - 0.07), sy * (ly + 0.025), z, 'Y'); niet(sx * (lx + 0.025), sy * (ly - 0.07), z, 'X')
                niet(sx * (lx - 0.06), sy * (ly - 0.06), z + (0.062 if zz == 'o' else -0.062), 'Z')
    # Füße (Gummi) unter den Ecken
    for sx in (-1, 1):
        for sy in (-1, 1): box('Kistenfuß', 0.1, 0.1, zf, sx * (lx - 0.1), sy * (ly - 0.1), zf / 2, D, 0.008)
    # Spannverschlüsse: zwei je Längsseite (Grundplatte an der Schale, Hebel, Bügel, Schließblech am Deckel)
    for sy in (-1, 1):
        for x in (-0.25, 0.25):
            yf = sy * (ly + 0.008)
            box('Verschlussplatte', 0.075, 0.01, 0.085, x, yf, zs - 0.06, S, 0.004)
            box('Verschlusshebel', 0.055, 0.016, 0.1, x, sy * (ly + 0.02), zs - 0.035, S, 0.006, rot=(sy * 0.12, 0, 0))
            for dx in (-0.022, 0.022): box('Verschlussbügel', 0.008, 0.01, 0.07, x + dx, sy * (ly + 0.026), zs + 0.02, S, 0.002)
            box('Schließblech', 0.065, 0.012, 0.03, x, sy * (ly + 0.01), zs + 0.06, S, 0.004)
            for dx in (-0.026, 0.026): niet(x + dx, sy * (ly + 0.014), zs - 0.09, 'Y', 0.006)
    # Klappgriffe an den Stirnseiten: Griffmulde, zwei Lagerböcke, Bügel
    for sx in (-1, 1):
        xf = sx * (lx + 0.004)
        box('Griffmulde', 0.012, 0.3, 0.1, sx * (lx - 0.002), 0, 0.33, D, 0.01)
        for y in (-0.13, 0.13):
            box('Grifflager', 0.035, 0.04, 0.05, sx * (lx + 0.014), y, 0.37, S, 0.006)
        pipe('Griffbügel', [Vector((sx * (lx + 0.03), -0.13, 0.37)), Vector((sx * (lx + 0.034), -0.13, 0.31)),
                            Vector((sx * (lx + 0.034), 0.13, 0.31)), Vector((sx * (lx + 0.03), 0.13, 0.37))], 0.011, S, rad=0.025)
        box('Griffhülle', 0.03, 0.18, 0.03, sx * (lx + 0.036), 0, 0.31, D, 0.01)
        arrow((sx * (lx + 0.003), sx * 0.2, zs + 0.06), (0, 0, 1), (0, -sx, 0), 0.12, TXT, 0.025)
        schrift('OBEN', 0.03, (sx * (lx + 0.003), -sx * 0.2, zs + 0.12), (0, sx, 0), (0, 0, 1))
    # Druckausgleichsventil am Deckel, Etikett mit Strichcode, Schablonenschrift
    cyl('Ventilsockel', 0.03, 0.012, 0.44, -ly - 0.004, zs + 0.13, S2, 'Y', n=20, bev=0.002)
    cyl('Ventilkappe', 0.02, 0.018, 0.44, -ly - 0.014, zs + 0.13, D, 'Y', n=16, bev=0.002)
    karte(-0.24, -ly - 0.01, 0.27, 0.2, 0.11, -1, (('FLOTTE · FRACHT', 0.016), ('LC-K 0347  ·  10 E', 0.014)))
    schrift('10 E', 0.07, (0.24, -ly - 0.012, 0.22), (1, 0, 0), (0, 0, 1))
    schrift('NETTO 186 KG', 0.022, (0.24, -ly - 0.012, 0.17), (1, 0, 0), (0, 0, 1))
    schrift('LC-K 0347', 0.03, (0, ly + 0.012, 0.22), (-1, 0, 0), (0, 0, 1))
    schrift('FLOTTE', 0.06, (0, 0, zd + 0.006), (1, 0, 0), (0, 1, 0))

# =====================================================================================
elif NAME == 'FrachtPalette':
    lx = ly = 0.6; h = 1.2
    zb = 0.15                                  # Oberkante der Stahlpalette
    # Stahlpalette: drei Kufen (Hohlprofil mit Erleichterungslöchern), Deckbleche mit Fugen, Stirnbleche
    for y in (-0.5, 0, 0.5):
        box('Kufe', 2 * lx, 0.11, zb - 0.03, 0, y, (zb - 0.03) / 2, S, 0.008)
        for x in (-0.38, 0, 0.38):
            for sy in (-1, 1): cyl('Erleichterung', 0.026, 0.006, x, y + sy * 0.0555, 0.06, H, 'Y', n=14, bev=0)
        for sx in (-1, 1): box('Kufenkappe', 0.006, 0.09, zb - 0.05, sx * (lx + 0.002), y, (zb - 0.03) / 2, S2, 0.002)
    for k, x in enumerate((-0.45, -0.15, 0.15, 0.45)):
        box('Deckblech', 0.29, 2 * ly, 0.03, x, 0, zb - 0.015, S, 0.004)
    for sx in (-1, 1): box('Stirnblech', 0.03, 2 * ly, 0.05, sx * (lx - 0.015), 0, zb - 0.03, S2, 0.004)
    for sx in (-1, 1):
        for sy in (-1, 1): ring('Zurrring', 0.025, 0.006, (sx * (lx + 0.004), sy * 0.3, zb - 0.06), (1, 0, 0), S, 12)
    # Frachtbox: Rumpf, Sickenfelder an allen vier Seiten, Deckel mit Rand
    zt = h - 0.06
    prism('Frachtbox', rect(lx - 0.035, ly - 0.035, 0.03), zb, zt, L, 'Z', 0.01)
    for sy in (-1, 1):
        for k in range(7):
            x = -0.42 + k * 0.14
            box('Sicke', 0.07, 0.02, zt - zb - 0.16, x, sy * (ly - 0.028), (zb + zt) / 2, L, 0.008)
    for sx in (-1, 1):
        for k in range(7):
            y = -0.42 + k * 0.14
            box('Sicke', 0.02, 0.07, zt - zb - 0.16, sx * (lx - 0.028), y, (zb + zt) / 2, L, 0.008)
    for z in (zb + 0.04, zt - 0.04):
        prism('Boxgurt', rect(lx - 0.022, ly - 0.022, 0.03), z - 0.02, z + 0.02, L2, 'Z', 0.006)
    prism('Palettendeckel', rect(lx, ly, 0.03), zt, h, L, 'Z', 0.012)
    box('Deckelfeld', 2 * lx - 0.16, 2 * ly - 0.16, 0.006, 0, 0, h + 0.002, L2, 0.003)
    # Eckwinkel (L-Profil) mit Stapelkegeln
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * (lx - 0.012), sy * (ly - 0.012)
            box('Eckwinkel', 0.09, 0.02, h - zb + 0.02, sx * (lx - 0.045), y, (zb + h) / 2, S, 0.004)
            box('Eckwinkel', 0.02, 0.09, h - zb + 0.02, x, sy * (ly - 0.045), (zb + h) / 2, S, 0.004)
            cyl('Stapelkegel', 0.028, 0.04, sx * (lx - 0.06), sy * (ly - 0.06), h + 0.02, S2, 'Z', n=12, bev=0.003, r2=0.012)
            for z in (zb + 0.12, (zb + h) / 2, h - 0.1):
                niet(sx * (lx - 0.06), sy * (ly + 0.0), z, 'Y'); niet(sx * (lx + 0.0), sy * (ly - 0.06), z, 'X')
    # zwei Spanngurte quer über den Deckel bis unter die Deckbleche, Kantenschutz an den Kanten, Haken unten, Ratsche an einer Seite
    for x in (-0.28, 0.28):
        box('Gurt oben', 0.05, 2 * ly + 0.02, 0.008, x, 0, h + 0.008, G, 0.002)
        for sy in (-1, 1):
            box('Gurt Seite', 0.05, 0.008, h - zb + 0.02, x, sy * (ly + 0.008), (zb + h) / 2 - 0.01, G, 0.002)
            box('Kantenschutz', 0.09, 0.06, 0.012, x, sy * (ly - 0.02), h + 0.012, D, 0.003)
            box('Kantenschutz', 0.09, 0.012, 0.06, x, sy * (ly + 0.012), h - 0.02, D, 0.003)
            box('Gurthaken', 0.06, 0.02, 0.05, x, sy * (ly + 0.012), zb - 0.04, S, 0.004)
        box('Ratsche', 0.08, 0.035, 0.12, x, -ly - 0.03, 0.72, S, 0.006)
        box('Ratschengriff', 0.03, 0.03, 0.14, x, -ly - 0.05, 0.78, S2, 0.006, rot=(0.3, 0, 0))
        cyl('Ratschenwelle', 0.018, 0.1, x, -ly - 0.03, 0.68, S2, 'X', n=12, bev=0.002)
    karte(0.0, -ly + 0.012, 0.55, 0.26, 0.14, -1, (('FLOTTE · PALETTE', 0.018), ('LC-P 1182  ·  25 E', 0.016), ('BRUTTO 512 KG', 0.014)))
    schrift('25 E', 0.09, (0.0, ly - 0.012, 0.85), (-1, 0, 0), (0, 0, 1))
    for sx in (-1, 1):
        arrow((sx * (lx - 0.012), sx * 0.15, 0.7), (0, 0, 1), (0, -sx, 0), 0.16, TXT, 0.03)
        schrift('LC-P 1182', 0.04, (sx * (lx - 0.012), -sx * 0.18, 0.45), (0, sx, 0), (0, 0, 1))
    schrift('FLOTTE', 0.08, (0, 0, h + 0.006), (1, 0, 0), (0, 1, 0))

# =====================================================================================
else:      # FrachtContainer
    lx, ly, h = 1.5, 1.2, 2.4
    pc = 0.16                                  # Eckpfosten (Breite)
    zb, zt = 0.16, h - 0.11                    # Oberkante Untergurt, Unterkante Obergurt
    # Boden: Untergurte, Querträger (von unten sichtbar), Bodenplatte, Gabelstaplertaschen
    for sy in (-1, 1):
        box('Untergurt', 2 * lx - 2 * pc + 0.02, 0.14, zb, 0, sy * (ly - 0.07), zb / 2, L2, 0.008)
        box('Untergurtsteg', 2 * lx - 2 * pc, 0.02, zb - 0.04, 0, sy * (ly - 0.005), zb / 2, L2, 0.004)
        for x in (-0.55, 0.55):
            box('Staplertasche', 0.36, 0.03, 0.1, x, sy * (ly - 0.0), 0.075, S2, 0.006)
            box('Staplertasche innen', 0.3, 0.032, 0.07, x, sy * (ly + 0.001), 0.075, H, 0)
    for sx in (-1, 1):
        box('Stirnuntergurt', 0.14, 2 * ly - 2 * pc, zb, sx * (lx - 0.07), 0, zb / 2, L2, 0.008)
    for k in range(7):
        box('Querträger', 0.08, 2 * ly - 0.2, 0.1, -lx + 0.42 + k * 0.36, 0, 0.06, S2, 0.004)
    box('Bodenplatte', 2 * lx - 0.2, 2 * ly - 0.2, 0.03, 0, 0, zb - 0.015, S2, 0)
    # Eckpfosten (gekantet) und Eckbeschläge mit Langlöchern an drei Seiten
    for sx in (-1, 1):
        for sy in (-1, 1):
            px, py = sx * (lx - pc / 2), sy * (ly - pc / 2)
            prism('Eckpfosten', [(px - sx * pc / 2, py + sy * pc / 2), (px + sx * pc / 2, py + sy * pc / 2), (px + sx * pc / 2, py - sy * pc / 2),
                                 (px + sx * pc * 0.15, py - sy * pc / 2), (px - sx * pc * 0.2, py)][::(1 if sx * sy > 0 else -1)], 0.12, h - 0.12, L2, 'Z', 0.006)
            for z in (0.06, h - 0.06):
                cx, cy = sx * (lx - 0.089), sy * (ly - 0.081)
                box('Eckbeschlag', 0.178, 0.162, 0.118, cx, cy, z, S, 0.01)
                box('Langloch', 0.07, 0.006, 0.036, cx, sy * (ly + 0.0005), z, H, 0)
                box('Langloch', 0.006, 0.05, 0.036, sx * (lx + 0.0005), cy, z, H, 0)
                box('Langloch', 0.11, 0.05, 0.006, cx, cy, z + (0.0595 if z > 1 else -0.0595), H, 0)
    # Obergurte, Stirnobergurte
    for sy in (-1, 1): box('Obergurt', 2 * lx - 2 * 0.178, 0.1, 0.11, 0, sy * (ly - 0.05), h - 0.055, L2, 0.006)
    for sx in (-1, 1): box('Stirnobergurt', 0.1, 2 * ly - 2 * 0.162, 0.11, sx * (lx - 0.05), 0, h - 0.055, L2, 0.006)
    # Trapezsicken: Profil entlang der Wand, als Prisma zwischen Unter- und Obergurt
    def sicken(u0, u1, w0, sg, tief=0.036, dicke=0.018, n=None):
        span = u1 - u0; n = n or max(3, round(span / 0.278)); p = span / n
        crest, slope = p * 0.36, p * 0.12; valley = p - crest - 2 * slope
        outer = [(u0, w0)]
        for k in range(n):
            u = u0 + k * p
            outer += [(u + valley / 2, w0), (u + valley / 2 + slope, w0 + sg * tief), (u + valley / 2 + slope + crest, w0 + sg * tief), (u + valley / 2 + 2 * slope + crest, w0)]
        outer.append((u1, w0))
        inner = [(u, w - sg * dicke) for u, w in reversed(outer)]
        return outer + inner
    for sy in (-1, 1):
        pts = sicken(-lx + pc, lx - pc, sy * (ly - 0.05), sy)
        prism('Seitenwand', pts if sy < 0 else pts[::-1], zb, zt, L, 'Z', 0)
    pts = [(w, u) for u, w in sicken(-ly + pc, ly - pc, -(lx - 0.05), -1)]
    prism('Stirnwand', pts[::-1], zb, zt, L, 'Z', 0)
    # Dach mit flachen Sicken
    box('Dach', 2 * lx - 0.2, 2 * ly - 0.2, 0.02, 0, 0, h - 0.035, L, 0.004)
    for k in range(10): box('Dachsicke', 0.12, 2 * ly - 0.26, 0.016, -lx + 0.24 + k * 0.28, 0, h - 0.018, L, 0.006)
    # Lüfter oben an den Längsseiten
    for sy in (-1, 1):
        for x in (-1.1, 1.1):
            box('Lüfter', 0.16, 0.03, 0.08, x, sy * (ly - 0.005), zt - 0.1, L2, 0.006)
            for j in range(4): box('Lüfterschlitz', 0.12, 0.004, 0.008, x, sy * (ly + 0.011), zt - 0.13 + j * 0.02, H, 0)
    # Tür am Heck (x = +lx): Rahmen, zwei Flügel mit waagrechten Sicken, Dichtung, Scharniere, vier Verriegelungsstangen
    xd = lx - 0.03
    box('Türschwelle', 0.06, 2 * ly - 2 * pc, 0.08, xd, 0, zb - 0.02, S2, 0.004)
    for sy in (-1, 1):
        yc = sy * (ly - pc) / 2
        box('Türflügel', 0.03, ly - pc - 0.012, zt - zb - 0.02, xd, yc, (zb + zt) / 2, L, 0.006)
        for z in (zb + 0.28, (zb + zt) / 2, zt - 0.28):
            box('Türsicke', 0.022, ly - pc - 0.12, 0.12, xd + 0.022, yc, z, L, 0.01)
        box('Türdichtung', 0.036, 0.016, zt - zb - 0.04, xd + 0.004, sy * 0.008, (zb + zt) / 2, D, 0.003)
        for z in (zb + 0.3, zb + 0.85, zt - 0.85, zt - 0.3):
            cyl('Scharnier', 0.026, 0.12, lx + 0.008, sy * (ly - pc - 0.01), z, S, 'Z', n=12, bev=0.002)
            box('Scharnierlasche', 0.012, 0.12, 0.08, xd + 0.022, sy * (ly - pc - 0.07), z, S, 0.003)
        for y in (sy * 0.22, sy * 0.72):
            cyl('Riegelstange', 0.018, zt - zb - 0.06, xd + 0.05, y, (zb + zt) / 2, S, 'Z', n=12, bev=0.002)
            for z in (zb + 0.02, zt - 0.02):
                box('Nockenhalter', 0.06, 0.08, 0.07, xd + 0.04, y, z, S2, 0.006)
                box('Nocke', 0.03, 0.05, 0.04, xd + 0.055, y + sy * 0.025, z - (0.05 if z > 1 else -0.05), S, 0.004)
            for z in (zb + 0.55, zt - 0.55):
                box('Führung', 0.035, 0.06, 0.05, xd + 0.035, y, z, S2, 0.004)
            box('Hebelnabe', 0.04, 0.06, 0.08, xd + 0.055, y, 1.05, S2, 0.006)
            pipe('Riegelhebel', [Vector((xd + 0.07, y, 1.05)), Vector((xd + 0.075, y + sy * 0.08, 1.05)), Vector((xd + 0.075, y + sy * 0.18, 0.98))], 0.012, S, rad=0.03)
            box('Hebelhalter', 0.03, 0.04, 0.05, xd + 0.05, y + sy * 0.18, 0.96, S2, 0.004)
    # Kennzeichnung: Eignerkennung, Inhalt, Gewichtsblock an der Tür, Zulassungsschild
    schrift('LCFU 204417 3', 0.075, (xd + 0.038, -0.6, zt - 0.17), (0, 1, 0), (0, 0, 1))
    schrift('LCFU 204417 3', 0.12, (0.0, -ly + 0.012, zt - 0.32), (1, 0, 0), (0, 0, 1))
    schrift('LCFU 204417 3', 0.12, (0.0, ly - 0.012, zt - 0.32), (-1, 0, 0), (0, 0, 1))
    schrift('HALBCONTAINER · 100 E', 0.07, (0.0, -ly + 0.012, zb + 0.2), (1, 0, 0), (0, 0, 1))
    schrift('HALBCONTAINER · 100 E', 0.07, (0.0, ly - 0.012, zb + 0.2), (-1, 0, 0), (0, 0, 1))
    for i, s in enumerate(('MAX. GROSS  14 200 KG', 'TARA          1 860 KG', 'NUTZLAST  12 340 KG')):
        schrift(s, 0.032, (xd + 0.038, 0.27, 1.55 - i * 0.052), (0, 1, 0), (0, 0, 1), align='LEFT')
    plate(0.2, 0.12, (xd + 0.038, 0.28, 1.24), (0, 1, 0), (0, 0, 1), S, name='Zulassungsschild')
    schrift('CSC SICHER', 0.022, (xd + 0.043, 0.295, 1.32), (0, 1, 0), (0, 0, 1), align='LEFT')
    schrift('FLOTTE 11/26', 0.018, (xd + 0.043, 0.295, 1.28), (0, 1, 0), (0, 0, 1), align='LEFT')
    schrift('LCFU', 0.2, (0, 0, h - 0.008), (1, 0, 0), (0, 1, 0))
result = {'name': NAME, 'objekte': len(CUR[0].objects)}
VIEWS = []
def cycles(n): pass
def view(v, p): pass
