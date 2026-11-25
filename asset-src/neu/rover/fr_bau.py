# Normkisten für den Laderaum (25.11.2026, Konzept docs/konzept-schiffe-fracht.md, Schritt 3). Ein Modell je Lauf, Name aus FR_NAME:
#   FrachtKiste      1,2 × 0,8 × 0,8 m  (10 Einheiten): Verbundkiste mit Rippen, Kantenschutz, Deckelverschlüssen, Griffmulden
#   FrachtPalette    1,2 × 1,2 × 1,2 m  (25 Einheiten): Kiste auf Stahlkufen, zwei Spanngurte, Eckpfosten
#   FrachtContainer  3,0 × 2,4 × 2,4 m (100 Einheiten): Halbcontainer mit Sicken, Eckbeschlägen, Flügeltür mit Verriegelungsstangen
# Der helle Lack (Gruppe lack) nimmt im Spiel die Farbe der Ware an (Instanzfarbe), Stahl, Gurte und Schrift bleiben.
# Achsen: X Länge, Y Breite, Z oben; Ursprung am Boden in der Mitte. Eine Sammlung „Aufbau“ (rv_export.py → deco/<Name>).
import bpy, os, math
from mathutils import Vector
_pf = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'plattform', 'pf_lib.py')
exec(compile(open(_pf, encoding='utf-8').read(), 'pf_lib.py', 'exec'))
PI = math.pi
NAME = os.environ.get('FR_NAME', 'FrachtKiste')
M.update(
    fr_lack=mk('Frachtlack', (0.6, 0.6, 0.58), 0.3, 0.55, var=0.12, rvar=0.1, scale=1.6, bump=0.1, bscale=60, wear=0.7, streak=0.25),
    fr_stahl=mk('Frachtstahl', (0.32, 0.33, 0.34), 0.9, 0.38, var=0.15, wear=0.9, streak=0.2),
    fr_dunkel=mk('Frachtgummi', (0.03, 0.03, 0.032), 0.05, 0.75, var=0.1),
    fr_gurt=mk('Spanngurt', (0.55, 0.32, 0.05), 0.05, 0.8, var=0.15, grime=True),
)
L, S, D, G = M['fr_lack'], M['fr_stahl'], M['fr_dunkel'], M['fr_gurt']
CUR[0] = coll('Aufbau')
def schrift(s, size, origin, xd, yd):
    o = text(s, size, origin, xd, yd, M['txtd'] if 'txtd' in M else D, align='CENTER'); return o

def kantenschutz(lx, ly, z0, z1, t=0.05, l=0.14):      # Stahlwinkel an den acht Ecken
    for sx in (-1, 1):
        for sy in (-1, 1):
            for z in (z0, z1):
                zz = z + (l / 2 if z == z0 else -l / 2)
                box('Eckwinkel', l, t, l, sx * (lx - l / 2 + 0.005), sy * (ly + t / 2 - 0.01), zz, S, 0.006)
                box('Eckwinkel', t, l, l, sx * (lx + t / 2 - 0.01), sy * (ly - l / 2 + 0.005), zz, S, 0.006)

if NAME == 'FrachtKiste':
    lx, ly, h = 0.6, 0.4, 0.8
    box('Kistenrumpf', 2 * lx, 2 * ly, h - 0.08, 0, 0, (h - 0.08) / 2 + 0.04, L, 0.025)
    box('Kistendeckel', 2 * lx + 0.02, 2 * ly + 0.02, 0.07, 0, 0, h - 0.035, L, 0.02)
    box('Kistenfuß', 2 * lx - 0.08, 2 * ly - 0.08, 0.04, 0, 0, 0.02, D, 0.01)
    for z in (0.22, 0.46):      # umlaufende Rippen
        box('Rippe', 2 * lx + 0.025, 2 * ly + 0.025, 0.035, 0, 0, z, L, 0.01)
    for sx in (-1, 1):          # Griffmulden an den Stirnseiten
        box('Griffmulde', 0.02, 0.26, 0.07, sx * (lx + 0.002), 0, 0.6, D, 0.01)
        box('Griffleiste', 0.03, 0.22, 0.02, sx * (lx + 0.012), 0, 0.63, S, 0.005)
    for sy in (-1, 1):          # Verschlüsse am Deckel
        for sx in (-0.32, 0.32):
            box('Verschluss', 0.07, 0.025, 0.09, sx, sy * (ly + 0.014), h - 0.07, S, 0.005)
            box('Verschlusszunge', 0.05, 0.012, 0.05, sx, sy * (ly + 0.028), h - 0.1, S, 0.003)
    kantenschutz(lx, ly, 0.04, h)
    plate(0.24, 0.1, (0.18, -ly - 0.016, 0.3), (1, 0, 0), (0, 0, 1), M['plate'] if 'plate' in M else S, name='Etikett')
    schrift('FLOTTE · FRACHT', 0.045, (-0.18, -ly - 0.017, 0.34), (1, 0, 0), (0, 0, 1))
elif NAME == 'FrachtPalette':
    lx = ly = 0.6; h = 1.2
    for y in (-0.48, 0, 0.48): box('Kufe', 2 * lx, 0.12, 0.12, 0, y, 0.06, S, 0.008)      # Stahlkufen
    for x in (-0.5, -0.17, 0.17, 0.5): box('Deckblech', 0.22, 2 * ly, 0.025, x, 0, 0.13, S, 0.004)
    box('Palettenkiste', 2 * lx - 0.04, 2 * ly - 0.04, h - 0.2, 0, 0, 0.145 + (h - 0.2) / 2, L, 0.03)
    box('Palettendeckel', 2 * lx, 2 * ly, 0.06, 0, 0, h - 0.03, L, 0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Eckpfosten', 0.07, 0.07, h - 0.14, sx * (lx - 0.03), sy * (ly - 0.03), 0.14 + (h - 0.14) / 2, S, 0.006)
    for x in (-0.3, 0.3):       # zwei Spanngurte über Deckel und Seiten
        box('Gurt oben', 0.05, 2 * ly + 0.03, 0.012, x, 0, h + 0.004, G, 0.003)
        for sy in (-1, 1): box('Gurt Seite', 0.05, 0.012, h - 0.16, x, sy * (ly + 0.008), 0.145 + (h - 0.16) / 2, G, 0.003)
        box('Ratsche', 0.07, 0.03, 0.1, x, -ly - 0.022, 0.75, S, 0.006)
    for z in (0.45, 0.8): box('Rippe', 2 * lx - 0.02, 2 * ly - 0.02, 0.035, 0, 0, z, L, 0.01)
    plate(0.3, 0.12, (0.0, -ly + 0.003, 0.55), (1, 0, 0), (0, 0, 1), M['plate'] if 'plate' in M else S, name='Etikett')
    schrift('FLOTTE · 25 E', 0.05, (0.15, -ly + 0.002, 0.6), (1, 0, 0), (0, 0, 1))
else:      # FrachtContainer
    lx, ly, h = 1.5, 1.2, 2.4
    box('Containerboden', 2 * lx, 2 * ly, 0.16, 0, 0, 0.08, S, 0.01)
    box('Containerdach', 2 * lx, 2 * ly, 0.08, 0, 0, h - 0.04, L, 0.012)
    box('Containerwand', 2 * lx - 0.1, 2 * ly - 0.1, h - 0.24, 0, 0, 0.16 + (h - 0.24) / 2, L, 0.01)
    for sy in (-1, 1):          # Sicken an den Längsseiten
        for k in range(13):
            x = -lx + 0.2 + k * 0.215
            box('Sicke', 0.1, 0.05, h - 0.34, x, sy * (ly - 0.03), 0.16 + (h - 0.24) / 2, L, 0.006)
    for k in range(9):          # Sicken an der Rückwand
        box('Sicke', 0.05, 0.1, h - 0.34, -lx + 0.03, -ly + 0.25 + k * 0.24, 0.16 + (h - 0.24) / 2, L, 0.006)
    for sx in (-1, 1):          # Eckpfosten und Eckbeschläge
        for sy in (-1, 1):
            box('Eckpfosten', 0.12, 0.12, h, sx * (lx - 0.06), sy * (ly - 0.06), h / 2, S, 0.008)
            for z in (0.09, h - 0.09): box('Eckbeschlag', 0.18, 0.18, 0.18, sx * (lx - 0.09), sy * (ly - 0.09), z, S, 0.01)
    box('Türrahmen', 0.06, 2 * ly - 0.1, h - 0.2, lx - 0.01, 0, h / 2, S, 0.008)
    box('Türfuge', 0.065, 0.02, h - 0.3, lx - 0.008, 0, h / 2, D, 0)
    for y in (-0.75, -0.35, 0.35, 0.75):      # Verriegelungsstangen
        cyl('Riegelstange', 0.022, h - 0.4, lx + 0.04, y, h / 2, S, 'Z', 12, 0.003)
        box('Riegelhebel', 0.04, 0.05, 0.25, lx + 0.06, y + 0.05, 1.1, S, 0.005)
        for z in (0.32, h - 0.32): box('Riegelhalter', 0.05, 0.08, 0.06, lx + 0.035, y, z, S, 0.005)
    plate(0.5, 0.2, (lx + 0.002, -0.95, 1.7), (0, 1, 0), (0, 0, 1), M['plate'] if 'plate' in M else S, name='Etikett')
    schrift('FLOTTE  ·  HALBCONTAINER  100 E', 0.11, (0.0, -ly - 0.004, 1.85), (1, 0, 0), (0, 0, 1))
result = {'name': NAME, 'objekte': len(CUR[0].objects)}
VIEWS = []
def cycles(n): pass
def view(v, p): pass
