# Texturblatt der Ferrox (kit_fx_col/_nrm/_orm/_emi). Läuft in Blender (Trimsheet_Ferrox.blend, Textblock trim_ferrox).
# Die Platten der Erbauer: dunkles, sehr genau gearbeitetes Metall mit feinen Liniengruppen, darüber Rostfahnen und ein Netz violetter Adern
# (eigenes Leuchtbild). Schrottbleche und Mechanik der Ferrox kommen aus dem Texturblatt der Menschenschiffe (kit_trim), siehe docs/ferrox-entwurf.md.
# Nutzt die Werkzeuge aus baukasten/trim_build.py und ersetzt nur Streifen, Kacheln und Namen (wie trim_int.py).
# Aufruf: build(), render() (rund zwei Minuten), compose(), veins().
import os, math
import numpy as np
import bpy
from mathutils import Matrix

_KIT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte\asset-src\neu\baukasten'
tb = {'__name__': 'trim_build'}
exec(compile(open(os.path.join(_KIT, 'trim_build.py'), encoding='utf-8').read(), 'trim_build', 'exec'), tb)
plate, bar, bolt, cylz, ring, louvres, box_m, S, N = (tb[k] for k in ('plate', 'bar', 'bolt', 'cylz', 'ring', 'louvres', 'box_m', 'S', 'N'))
RND = lambda: tb['R']
tb['NAME'] = 'kit_fx'; tb['ATLAS'] = 'kit_fx_atlas.json'
tb['TMP'] = os.path.join(os.path.dirname(_KIT), 'ferrox', '_tmp')
# wenig abgeplatzter Lack (es ist blankes Metall), viele Kratzer, viel Schmutz und lange Rostfahnen
tb['CFG'].update({'chip': 0.5, 'flat': 0.45, 'scratch': 340, 'dirt': 1.3, 'streak': 1.8, 'walls': (), 'long': ('fx_plate', 'fx_fine', 'fx_plain')})
tb['PAINT'].update({'E': (0.05, 0.05, 0.06), 'E2': (0.085, 0.085, 0.098), 'EK': (0.012, 0.012, 0.016)})
tb['PRM'].update({'E': (1, 0.44, 0.35), 'E2': (1, 0.38, 0.5), 'EK': (0.4, 0.8, 0)})
ST = tb['STRIPS']; ST.clear()
ST.update({'fx_plate': (0.0, 4.0), 'fx_fine': (4.0, 6.5), 'fx_rib': (6.5, 8.0), 'fx_seam': (8.0, 8.6), 'fx_plain': (8.6, 10.0)})
TL = tb['TILES']; TL.clear()
TL.update({'fx_ring': (0, 10, 2, 12), 'fx_lens': (2, 10, 4, 12), 'fx_vent': (4, 10, 6, 12), 'fx_cut': (6, 10, 8, 12), 'fx_noz': (8, 10, 10, 12), 'fx_hatch': (10, 10, 12, 12)})

def fx_plate():
    """Große, genau gefügte Platten in ungleichen Spalten; auf jeder eine Gruppe feiner Linien und manchmal ein erhabenes Feld."""
    y0, y1 = ST['fx_plate']; R = RND()
    plate('EK', -1, y0, S + 1, y1, 0.004, bev=0)
    x = 0.0
    for i, w in enumerate([2.6, 1.4, 3.0, 2.0, 3.0]):
        a, b = x + 0.012, x + w - 0.012
        cuts = sorted(R.sample([0.9, 1.4, 1.9, 2.5, 3.1], 2 if w > 1.5 else 1))
        ys = [y0] + [y0 + c for c in cuts] + [y1]
        for j in range(len(ys) - 1):
            ya, yb = ys[j] + 0.01, ys[j + 1] - 0.01
            h = 0.03 + 0.012 * ((i + j) % 3)
            plate('E', a, ya, b, yb, h, bev=0.006, seg=1, jit=R.uniform(-0.14, 0.14))
            n = R.randint(3, 5)
            if R.random() < 0.5:
                for k in range(n): plate('EK', a + 0.15, ya + 0.12 + k * 0.05, b - 0.15 - R.uniform(0, (b - a) * 0.45), ya + 0.134 + k * 0.05, 0.004, z=h, bev=0)
            else:
                for k in range(n): plate('EK', a + 0.12 + k * 0.05, ya + 0.15, a + 0.134 + k * 0.05, yb - 0.15 - R.uniform(0, (yb - ya) * 0.45), 0.004, z=h, bev=0)
            if R.random() < 0.6 and b - a > 1.2 and yb - ya > 0.8:
                cx, cy = R.uniform(a + 0.4, b - 0.75), R.uniform(ya + 0.3, yb - 0.45)
                plate('E2', cx, cy, cx + R.uniform(0.25, 0.6), cy + R.uniform(0.12, 0.3), 0.012, z=h, bev=0.004, seg=1)
        x += w

def fx_fine():
    """Schmale Lamellen in Reihen ungleicher Höhe (Flanken, Arme)."""
    y0, y1 = ST['fx_fine']; R = RND()
    plate('EK', -1, y0, S + 1, y1, 0.004, bev=0)
    y = y0 + 0.01
    while y < y1 - 0.08:
        hg = min(R.choice([0.14, 0.2, 0.3, 0.45]), y1 - 0.01 - y)
        x = 0.0
        while x < S - 0.01:
            w = min(R.choice([0.8, 1.2, 1.6, 2.4, 3.2]), S - x)
            if S - (x + w) < 0.6: w = S - x
            plate('E' if R.random() < 0.8 else 'E2', x + 0.008, y, x + w - 0.008, y + hg - 0.016, 0.02 + R.uniform(0, 0.025), bev=0.005, seg=1, jit=R.uniform(-0.16, 0.16))
            x += w
        y += hg

def fx_rib():
    """Rippen quer zum Streifen (Gelenke, Kühlkörper), oben und unten eine Schiene."""
    y0, y1 = ST['fx_rib']
    plate('EK', -1, y0, S + 1, y1, 0.004, bev=0)
    plate('E', -1, y0 + 0.01, S + 1, y0 + 0.16, 0.05, bev=0.008, seg=1); plate('E', -1, y1 - 0.16, S + 1, y1 - 0.01, 0.05, bev=0.008, seg=1)
    for k in range(48): bar('E' if k % 6 else 'E2', k * 0.25 + 0.035, y0 + 0.2, k * 0.25 + 0.215, y1 - 0.2, 0.07, jit=(k % 5) * 0.03 - 0.06)

def fx_small():
    """Naht mit Vierkantbolzen und die glatte Fläche."""
    y0, y1 = ST['fx_seam']
    plate('EK', -1, y0, S + 1, y1, 0.004, bev=0)
    plate('E', -1, y0 + 0.01, S + 1, y1 - 0.01, 0.035, bev=0.01, seg=1)
    for k in range(24): plate('E2', k * 0.5 + 0.19, y0 + 0.22, k * 0.5 + 0.31, y0 + 0.34, 0.016, z=0.035, bev=0.004, seg=1)
    y0, y1 = ST['fx_plain']
    plate('E', -1, y0, S + 1, y1, 0.02, bev=0)

def fx_tiles():
    R = RND()
    def back(n, k='E', h=0.03):
        x0, ya, x1, yb = TL[n]; plate('EK', x0, ya, x1, yb, 0.004, bev=0); plate(k, x0 + 0.02, ya + 0.02, x1 - 0.02, yb - 0.02, h, bev=0.008, seg=1)
        return (x0 + x1) / 2, (ya + yb) / 2
    cx, cy = back('fx_ring')                                    # Ringmotiv der Erbauer
    for i, r in enumerate([0.86, 0.66, 0.44, 0.22]): ring('E2' if i % 2 else 'E', cx, cy, r - 0.09, r, 0.014 + 0.006 * i, z=0.03, seg=48)
    cylz('E2', cx, cy, 0.08, 0.05, z=0.03, seg=20)
    cx, cy = back('fx_lens')                                    # Linse: Fassung, dunkles Glas (leuchtet im Leuchtbild)
    ring('E2', cx, cy, 0.62, 0.9, 0.09, z=0.03, seg=40); ring('E', cx, cy, 0.5, 0.62, 0.05, z=0.03, seg=40)
    cylz('G', cx, cy, 0.5, 0.03, z=0.03, seg=40, r2=0.36)
    for k in range(8): a = k / 8 * math.tau; cylz('E2', cx + math.cos(a) * 0.76, cy + math.sin(a) * 0.76, 0.045, 0.02, z=0.12, seg=6)
    x0, ya, x1, yb = TL['fx_vent']; back('fx_vent')              # Lamellen
    louvres('E', x0 + 0.2, ya + 0.2, x1 - 0.2, yb - 0.2, 11, z=0.03)
    cx, cy = back('fx_cut')                                     # Schneidkopf: Zahnkranz
    ring('E2', cx, cy, 0.3, 0.92, 0.04, z=0.03, seg=40)
    for k in range(14):
        a = k / 14 * math.tau; px, py = cx + math.cos(a) * 0.68, cy + math.sin(a) * 0.68
        plate('E', px - 0.13, py - 0.07, px + 0.13, py + 0.07, 0.1, z=0.07, bev=0.02, seg=1, rot=Matrix.Rotation(-a + 0.5, 4, 'Z'), jit=(k % 3) * 0.08)
    cylz('E2', cx, cy, 0.3, 0.14, z=0.03, seg=24, r2=0.2)
    cx, cy = back('fx_noz')                                     # Düse
    ring('E2', cx, cy, 0.7, 0.92, 0.1, z=0.03, seg=40); ring('E', cx, cy, 0.52, 0.7, 0.05, z=0.03, seg=40)
    for k in range(12): a = k / 12 * math.tau; plate('E2', cx + math.cos(a) * 0.6 - 0.03, cy + math.sin(a) * 0.6 - 0.1, cx + math.cos(a) * 0.6 + 0.03, cy + math.sin(a) * 0.6 + 0.1, 0.03, z=0.08, bev=0.004, seg=1, rot=Matrix.Rotation(-a + math.pi / 2, 4, 'Z'))
    cylz('EK', cx, cy, 0.52, 0.01, z=0.03, seg=40)
    x0, ya, x1, yb = TL['fx_hatch']; back('fx_hatch')            # Klappe aus vier Feldern
    for i in range(2):
        for j in range(2):
            plate('E2' if (i + j) % 2 else 'E', x0 + 0.2 + i * 0.82, ya + 0.2 + j * 0.82, x0 + 0.98 + i * 0.82, ya + 0.98 + j * 0.82, 0.03, z=0.03, bev=0.012, seg=2, jit=R.uniform(-0.1, 0.1))
    for sx in (0.12, 1.88):
        for sy in (0.12, 1.88): cylz('E2', x0 + sx, ya + sy, 0.035, 0.016, z=0.03, seg=6)

tb['BUILDERS'] = [fx_plate, fx_fine, fx_rib, fx_small, fx_tiles]
build, render, compose = tb['build'], tb['render'], tb['compose']

def veins(preview=False):
    """Leuchtbild: ein Netz violetter Adern auf den Platten (Höhenlinien zweier Rauschfelder, nur stellenweise), dazu Linse und Düse.
    Die Adern liegen auch im Farbbild ganz schwach, damit sie bei Tageslicht nicht verschwinden."""
    noise, blur, sstep, rows, srgb, OUT = (tb[k] for k in ('noise', 'blur', 'sstep', 'rows', 'srgb', 'OUT'))
    a, b, m = noise(2.4, 21), noise(1.9, 22), noise(2.6, 23)
    def line(n, w):      # Abstand zur Höhenlinie in Pixeln (Wert durch Steigung), damit die Adern überall gleich dünn sind
        g = np.hypot((np.roll(n, -1, 1) - np.roll(n, 1, 1)) * 0.5, (np.roll(n, -1, 0) - np.roll(n, 1, 0)) * 0.5)
        return 1 - sstep(w * 0.4, w, np.abs(n - 0.5) / np.maximum(g, 1e-5))
    v = np.maximum(line(a, 1.7), line(b, 1.2) * 0.8) * sstep(0.44, 0.6, m)
    mask = np.zeros((N, N), np.float32)
    for nm in ('fx_plate', 'fx_fine', 'fx_plain', 'fx_seam'): r0, r1 = rows(*ST[nm]); mask[r0:r1] = 1
    v = v * mask
    glow = np.clip(v + blur(v, 2.2) * 0.8, 0, 1)
    emi = glow[..., None] * np.array((0.36, 0.16, 1.0), np.float32)
    X = (np.arange(N, dtype=np.float32)[None, :] + 0.5) * (S / N); Yt = S - (np.arange(N, dtype=np.float32)[:, None] + 0.5) * (S / N)
    def disc(name, r, col, k):
        x0, ya, x1, yb = TL[name]; d = np.hypot(X - (x0 + x1) / 2, Yt - (ya + yb) / 2)
        return (np.clip(1 - d / r, 0, 1) ** k)[..., None] * np.array(col, np.float32)
    emi = np.maximum(emi, disc('fx_lens', 0.5, (0.5, 0.25, 1.0), 0.8))
    emi = np.maximum(emi, disc('fx_noz', 0.52, (0.75, 0.6, 1.0), 1.4))
    buf = np.ones((N, N, 4), np.float32); buf[..., :3] = srgb(emi)
    img = bpy.data.images.get('kit_fx_emi') or bpy.data.images.new('kit_fx_emi', N, N, alpha=False)
    img.pixels.foreach_set(buf.ravel()); img.update()
    p = os.path.join(OUT, 'kit_fx_emi@2048.png'); img.filepath_raw = p; img.file_format = 'PNG'; img.save()
    return {'file': p, 'cover': float((glow > 0.3).mean())}
