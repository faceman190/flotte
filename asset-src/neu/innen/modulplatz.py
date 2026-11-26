# Modulplätze für Schiffsinnenräume (26.11.2026). Nutzer: „wir haben ja Module für Schiffe. Wenn man diese zum Beispiel im Technikraum
# einsetzen könnte, dazu bräuchte man im Technikraum Plätze, die Sinn ergeben, wo man diese Items dann auch sieht, wenn die eingebaut sind.“
# Vier Platzarten für die fünf Modulplätze des Spiels (src/data/gear.ts SHIP_SLOTS):
#   mp_gestell(…)            Einschubgestell an einer Wand: Bordsystem (Kassette) oder, mit offen=True, das hohe Gestell fürs Waffensystem
#   mp_schildbock(…)         frei stehender Bock mit Sockel, vier Pfosten und Kappe: Abwehrsystem
#   mp_regler(…)             Reglerkäfig mit Sockel und Dach: Antrieb
#   mp_verteiler(…)          fester Schrank „Energieverteilung“ (kein Modulplatz)
# Die Plätze sind leer gebaut. Das eingebaute Modul kommt im Spiel als eigenes Modell aus Schiffsmodule.glb (asset-src/neu/module) an den
# Ankerpunkt, den jede Funktion zurückgibt: p = Ursprung des Moduls, n = Richtung aus dem Platz heraus (zum Betrachter), schild = Mitte des
# Namensfelds (das Spiel zeichnet dort Name, Seltenheit und Statuslicht), sw/sh = Maße des Namensfelds.
# Hüllmaße der Module (u nach rechts, v zum Betrachter, w nach oben, Ursprung im Anker): system ±0,47 × 0,04…0,6 × 0,02…0,63;
# waffe ±0,5 × 0,04…0,5 × 0,02…0,9; abwehr Radius 0,42, Höhe 1,2; antrieb ±0,33 × ±0,33 × 1,26.
# Wird mit exec in den Namensraum eines Schiffs-Innenskripts geladen (braucht box, cyl, rod, ring, text, M mit den i_-Materialien, Vector, PI).
MP_Z = Vector((0, 0, 1))

class Wand:      # Bezugsrahmen an einer Wand: u nach rechts (vom Betrachter aus), v aus der Wand heraus, w nach oben
    def __init__(s, o, n): s.o = Vector(o); s.n = Vector(n); s.r = (-s.n).cross(MP_Z)
    def P(s, u, v, w): return s.o + s.r * u + s.n * v + MP_Z * w
    def box(s, name, su, sv, sw, u, v, w, m, bev=0.006):
        p = s.P(u, v, w); lx = abs(s.r.x) > 0.5
        return box(name, su if lx else sv, sv if lx else su, sw, p.x, p.y, p.z, m, bev)
    def cyl(s, name, r, ln, u, v, w, m, ax='U', n=24, bev=0.004, r2=None):      # r2: Radius am Ende in Richtung der Achse (Kegel)
        p = s.P(u, v, w); d = {'U': s.r, 'V': s.n, 'W': MP_Z}[ax]; a = 'X' if abs(d.x) > 0.5 else 'Y' if abs(d.y) > 0.5 else 'Z'
        if r2 is not None and ((d.x + d.y + d.z < 0) != (a == 'Y')): r, r2 = r2, r      # bk_lib.cyl: r2 liegt bei X und Z am positiven Ende, bei Y am negativen
        return cyl(name, r, ln, p.x, p.y, p.z, m, a, n=n, bev=bev, r2=r2)
    def rod(s, name, a, b, r, m, n=10): return rod(name, s.P(*a), s.P(*b), r, m, n)
    def text(s, t, size, u, v, w, m=None, align='CENTER'):
        return text(t, size, tuple(s.P(u, v, w)), tuple(s.r), (0, 0, 1), m or M['mp_schrift'], align=align, name='Modulschrift')

if 'mp_schrift' not in M: M['mp_schrift'] = mk('Modulschrift', (0.75, 0.78, 0.8), 0, 0.5, var=0, rvar=0, emit=(0.8, 0.86, 0.9), es=1.1, grime=False)

def mp_gestell(W, u0, titel, offen=False):
    """Einschubgestell mit echtem Schacht, Führungen, Stecker, Titel, Sichtfeld und Namensfeld; offen = hohes Gestell fürs Waffensystem"""
    bw, H, D, z0, z1 = (1.3, 1.9, 0.5, 0.5, 1.42) if offen else (1.24, 1.9, 0.47, 0.72, 1.38)
    zm = (z0 + z1) / 2
    W.box('Gestell unten', bw, D, z0, u0, D / 2, z0 / 2, M['i_schrank'], 0.012); W.box('Gestell oben', bw, D, H - z1, u0, D / 2, (H + z1) / 2, M['i_schrank'], 0.012)
    for sg in (1, -1): W.box('Gestellpfosten', 0.1, D, z1 - z0, u0 + sg * (bw / 2 - 0.05), D / 2, zm, M['i_schrank'], 0.006)
    W.box('Schachtgrund', bw - 0.2, 0.03, z1 - z0, u0, 0.015, zm, M['i_schacht'], 0.0)
    for sg in (1, -1):
        W.box('Fuehrung', 0.03, D - 0.08, 0.03, u0 + sg * (bw / 2 - 0.13), D / 2, z0 + 0.015, M['i_stahl'], 0.003)
        W.box('Rahmengelb', 0.02, 0.012, z1 - z0 + 0.04, u0 + sg * (bw / 2 - 0.09), D + 0.004, zm, M['gelb'], 0.002)
        W.box('Schachtleuchte', 0.012, D - 0.14, 0.03, u0 + sg * (bw / 2 - 0.105), D / 2, z1 - 0.03, M['i_licht'], 0.002)
    for w in (z0 - 0.01, z1 + 0.01): W.box('Rahmengelb', bw - 0.16, 0.012, 0.02, u0, D + 0.004, w, M['gelb'], 0.002)
    for k in range(int((z0 - 0.22) / 0.085)): W.box('Lueftungsschlitz', bw - 0.34, 0.012, 0.028, u0, D + 0.003, 0.16 + k * 0.085, M['i_schacht'], 0.002)
    W.box('Sockelleiste', bw, 0.02, 0.06, u0, D + 0.006, 0.04, M['warnrw'], 0.002)
    W.box('Titelschild', bw - 0.24, 0.014, 0.15, u0, D + 0.005, H - 0.16, M['i_dunkel'], 0.004); W.text(titel, 0.078, u0, D + 0.014, H - 0.19)
    W.box('Sichtfeld', 0.2, 0.014, 0.13, u0 - (bw / 2 - 0.22), D + 0.005, z1 + 0.15, M['i_bild'], 0.003)
    W.box('Namensfeld', bw - 0.5, 0.014, 0.17, u0 + 0.12, D + 0.004, z1 + 0.17, M['i_dunkel'], 0.003)
    W.box('Stecker', 0.34, 0.05, 0.14, u0, 0.055, z1 - 0.1, M['i_rahmen'], 0.006)
    for k in range(6): W.cyl('Steckerstift', 0.012, 0.03, u0 - 0.125 + k * 0.05, 0.09, z1 - 0.1, M['i_kupfer'], 'V', n=8, bev=0)
    for sg in (1, -1):      # Schraubenköpfe an den Ecken
        for w in (0.1, z0 - 0.08, z1 + 0.06, H - 0.05): W.cyl('Gestellschraube', 0.014, 0.012, u0 + sg * (bw / 2 - 0.035), D + 0.004, w, M['i_stahl'], 'V', n=8, bev=0)
    return dict(p=W.P(u0, 0.03, z0), n=W.n.copy(), schild=W.P(u0 + 0.12, D + 0.013, z1 + 0.17), sw=bw - 0.54, sh=0.15, art='waffe' if offen else 'system')

def mp_verteiler(W, u0=0.0):      # fester Schrank zwischen den Bordsystemen
    W.box('Verteilerschrank', 0.84, 0.3, 1.74, u0, 0.15, 0.89, M['i_schrank'], 0.012); W.box('Verteilertuer', 0.74, 0.012, 1.54, u0, 0.306, 0.93, M['i_feld'], 0.004)
    for j in range(5): W.box('Verteilerlicht', 0.05, 0.01, 0.02, u0 + 0.25, 0.314, 1.5 - j * 0.08, (M['i_petrol'], M['i_licht'], M['i_warm'], M['i_petrol'], M['i_rotlicht'])[j], 0.001)
    W.box('Verteilergriff', 0.03, 0.02, 0.25, u0 - 0.25, 0.32, 0.9, M['i_stahl'], 0.004)
    for k in range(4): W.box('Verteilerschlitz', 0.5, 0.01, 0.022, u0, 0.313, 0.3 + k * 0.07, M['i_schacht'], 0.001)
    W.text('ENERGIEVERTEILUNG', 0.05, u0, 0.012, 1.8)

def mp_schildbock(cx, cy, z, zdecke, quelle=None, n=(-1, 0, 0)):
    """Abwehrsystem: Bock neben dem Energiekern (quelle = Punkt am Kern, von dort laufen zwei Stromschienen am Boden herüber)"""
    cyl('Schildsockel', 0.52, 0.3, cx, cy, z + 0.15, M['i_rahmen'], 'Z', n=48, bev=0.02); ring('Sockelring', 0.5, 0.018, (cx, cy, z + 0.3), (0, 0, 1), M['gelb'], 48)
    cyl('Sockelteller', 0.44, 0.02, cx, cy, z + 0.305, M['i_schacht'], 'Z', n=40, bev=0)
    for a in range(4):
        aa = PI / 4 + a * PI / 2; p = Vector((cx + 0.46 * math.cos(aa), cy + 0.46 * math.sin(aa), 0))
        rod('Schildpfosten', p + MP_Z * (z + 0.3), p + MP_Z * (z + 1.5), 0.022, M['i_stahl'], 10)
        cyl('Pfostenfuss', 0.04, 0.05, p.x, p.y, z + 0.325, M['i_rahmen'], 'Z', n=12, bev=0.004)
    cyl('Schildkappe', 0.52, 0.16, cx, cy, z + 1.58, M['i_rahmen'], 'Z', n=48, bev=0.02); ring('Kappenring', 0.5, 0.014, (cx, cy, z + 1.5), (0, 0, 1), M['gelb'], 48)
    cyl('Kappenstecker', 0.16, 0.05, cx, cy, z + 1.475, M['i_dunkel'], 'Z', n=24, bev=0.006)
    rod('Schildleitung', Vector((cx, cy, z + 1.66)), Vector((cx, cy, zdecke)), 0.07, M['i_kupfer'], 16)
    if quelle is not None:
        q = Vector((quelle[0], quelle[1], 0)); d = (Vector((cx, cy, 0)) - q).normalized(); s_ = Vector((-d.y, d.x, 0))
        for k in (-0.07, 0.07): rod('Stromschiene', q + s_ * k + MP_Z * (z + 0.07), Vector((cx, cy, 0)) - d * 0.5 + s_ * k + MP_Z * (z + 0.07), 0.035, M['i_kupfer'], 10)
        m_ = q + (Vector((cx, cy, 0)) - d * 0.5 - q) * 0.5
        box('Schienenschelle', 0.12, 0.3, 0.1, m_.x, m_.y, z + 0.06, M['i_rahmen'], 0.01, rot=(0, 0, math.atan2(d.y, d.x)))
    W = Wand((cx, cy, z), n); r = 0.525
    W.box('Titelschild', 0.74, 0.02, 0.13, 0, r + 0.008, 1.58, M['i_dunkel'], 0.004); W.text('ABWEHRSYSTEM', 0.07, 0, r + 0.02, 1.553)
    W.box('Namensfeld', 0.6, 0.02, 0.17, 0, r + 0.006, 0.15, M['i_dunkel'], 0.003)
    return dict(p=Vector((cx, cy, z + 0.3)), n=W.n.copy(), schild=W.P(0, r + 0.018, 0.15), sw=0.56, sh=0.15, art='abwehr')

def mp_regler(cx, cy, z, zdecke, leitungen=(), n=(-1, 0, 0)):
    """Antrieb: Reglerkäfig; leitungen = ((dx, material, y der Deckenleitung), …) führen vom Dach an die Deckenleitungen"""
    box('Reglersockel', 0.84, 0.84, 0.16, cx, cy, z + 0.08, M['i_rahmen'], 0.015); box('Reglerdach', 0.84, 0.84, 0.16, cx, cy, z + 1.5, M['i_rahmen'], 0.015)
    box('Sockelteller', 0.7, 0.7, 0.01, cx, cy, z + 0.164, M['i_schacht'], 0.0)
    for sx in (1, -1):
        for sy in (1, -1):
            rod('Reglerpfosten', Vector((cx + sx * 0.37, cy + sy * 0.37, z + 0.16)), Vector((cx + sx * 0.37, cy + sy * 0.37, z + 1.42)), 0.024, M['i_stahl'], 10)
            box('Pfostenwinkel', 0.09, 0.09, 0.05, cx + sx * 0.36, cy + sy * 0.36, z + 0.185, M['i_rahmen'], 0.006)
    cyl('Dachstecker', 0.14, 0.05, cx, cy, z + 1.395, M['i_dunkel'], 'Z', n=24, bev=0.006)
    for dx, m_, ye in leitungen:
        rod('Reglerleitung', Vector((cx + dx, cy + 0.25, z + 1.58)), Vector((cx + dx, cy + 0.25, zdecke)), 0.035, M[m_], 10)
        rod('Reglerleitung', Vector((cx + dx, cy + 0.25, zdecke)), Vector((cx + dx, ye, zdecke)), 0.035, M[m_], 10)
        cyl('Leitungsflansch', 0.055, 0.04, cx + dx, cy + 0.25, z + 1.6, M['i_stahl'], 'Z', n=12, bev=0.004)
    W = Wand((cx, cy, z), n); r = 0.425
    W.box('Titelschild', 0.74, 0.02, 0.13, 0, r + 0.008, 1.5, M['i_dunkel'], 0.004); W.text('ANTRIEB', 0.07, 0, r + 0.02, 1.473)
    W.box('Namensfeld', 0.66, 0.02, 0.14, 0, r + 0.006, 0.08, M['i_dunkel'], 0.003)
    return dict(p=Vector((cx, cy, z + 0.16)), n=W.n.copy(), schild=W.P(0, r + 0.018, 0.08), sw=0.62, sh=0.12, art='antrieb')
