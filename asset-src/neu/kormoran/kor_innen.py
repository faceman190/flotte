# Innenausbau des Kormoran (wird von kor_kit.py geladen; nutzt dessen Helfer und Materialien).
# Hauptdeck auf z = 2,55, Decke 5,0 (Laderaum 5,85). Raumplan (Draufsicht, Bug rechts, Backbord oben):
#
#   y +5,2  ┌ Kabine 1 ┬ Kabine 2 ┐
#           │          │          ├─ Messe ────┐
#   y +1,0  ├──── Tür ─┴── Tür ───┴── Tür ─────┤           ┌──────────┐
#   Laderaum│              Hauptgang           │  Treppe → │ Cockpit  │
#   y −1,0  ├──── Tür ─┬── Tür ───┬── Tür ─────┤           └──────────┘
#           │ Kabine 3 │ Waschraum├─ Technik ──┘
#   y −5,2  └──────────┴──────────┘
#          x −11      −6         −2           5   6        9,9
DECK, CEIL = 2.55, 5.0
M.update(
    iwand=mk('Innenwand', (0.17, 0.175, 0.18), 0.15, 0.48, var=0.06, rvar=0.05, scale=2.0, bump=0.15, wear=0.3),
    iwand2=mk('Innenwand dunkel', (0.045, 0.047, 0.051), 0.3, 0.5, var=0.08, scale=2.0, bump=0.15, wear=0.4),
    irahmen=mk('Innenrahmen', (0.028, 0.03, 0.033), 0.6, 0.4, var=0.08, wear=0.6),
    iboden=mk('Innenboden', (0.04, 0.042, 0.046), 0.6, 0.5, scale=11, studs=True, wear=0.5),
    idecke=mk('Innendecke', (0.12, 0.124, 0.13), 0.2, 0.55, var=0.06, scale=2.0),
    polster=mk('Polster', (0.03, 0.045, 0.075), 0.0, 0.75, var=0.1, scale=6.0, bump=0.4, bscale=300),
    stoff=mk('Bettzeug', (0.3, 0.31, 0.32), 0.0, 0.85, var=0.1, scale=5.0, bump=0.5, bscale=200),
    platte=mk('Tischplatte', (0.2, 0.185, 0.16), 0.1, 0.38, var=0.08, scale=3.0, bump=0.1),
    fliese=mk('Fliesen', (0.4, 0.41, 0.42), 0.0, 0.25, var=0.05, scale=4.0, bump=0.1),
    spiegel=mk('Spiegel', (0.8, 0.8, 0.82), 1.0, 0.03, var=0, rvar=0, grime=False),
    kern=mk('Energiekern', (0.3, 0.6, 1.0), 0, 0.2, var=0, rvar=0, emit=(0.3, 0.62, 1.0), es=14, grime=False),
    lichtband=mk('Lichtband', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.92, 0.96, 1.0), es=10, grime=False),
    leitlicht=mk('Leitlicht', (0.2, 0.5, 1), 0, 0.3, var=0, rvar=0, emit=(0.22, 0.55, 1.0), es=6, grime=False),
    # Details (25.11.2026): Wandfelder, Bodenplatten, Gitterrost, Schacht, Typenschilder (innen_detail.py)
    ifeld=mk('Innenwand Feld', (0.21, 0.215, 0.222), 0.15, 0.44, var=0.06, rvar=0.05, scale=2.0, bump=0.12, wear=0.3),
    iboden2=mk('Innenboden hell', (0.06, 0.062, 0.067), 0.6, 0.48, scale=11, studs=True, wear=0.5),
    igitter=mk('Gitterrost', (0.08, 0.082, 0.086), 0.85, 0.42, var=0.1, wear=0.7),
    ischacht=mk('Schacht', (0.008, 0.008, 0.01), 0.3, 0.85, var=0.05, grime=False),
    ischild=mk('Typenschild', (0.42, 0.42, 0.4), 0.7, 0.38, var=0.05),
    irohr1=mk('Leitung Petrol', (0.03, 0.12, 0.13), 0.4, 0.42, var=0.08, wear=0.5),
    irohr2=mk('Leitung Ocker', (0.42, 0.26, 0.04), 0.3, 0.5, var=0.08, wear=0.5),
)
exec(compile(open(os.path.join(HERE, '..', 'innen', 'innen_detail.py'), encoding='utf-8').read(), 'innen_detail.py', 'exec'))
SD = {'wand': None, 'boden': None, 'decke': None, 'k': 0}      # Sammler, in innen() angelegt

# ---------- Bauhelfer ----------
def iwall(name, a, b, z0, z1, doors=(), th=0.1, m='iwand', band=True):
    # Wand von a nach b (Draufsicht), Türen als (Abstand von a bis zur Türmitte, Breite, Höhe). Felder 1,2 m mit Fugen, dunkler Sockel,
    # dunkles Oberband, dahinter ein durchgehender Kern (damit die Fugen nicht durchscheinen), Türrahmen und Sturz.
    a, b = Vector(a), Vector(b); d = b - a; L = d.length; u = d / L; ang = math.atan2(u.y, u.x)
    def piece(s0, s1, za, zb, mat, thick):
        if s1 - s0 < 0.01 or zb - za < 0.01: return
        c = a + u * ((s0 + s1) / 2); box(name, s1 - s0, thick, zb - za, c.x, c.y, (za + zb) / 2, M[mat], 0.003, rot=(0, 0, ang))
    segs, t0 = [], 0.0
    for t, w, h in sorted(doors): segs.append((t0, t - w / 2)); t0 = t + w / 2
    segs.append((t0, L))
    for s0, s1 in segs:
        piece(s0, s1, z0, z1, 'irahmen', th * 0.6)
        piece(s0, s1, z0, z0 + 0.14, 'irahmen', th + 0.02)
        top = z1 - 0.32 if band else z1
        n = max(1, round((s1 - s0) / 1.2))
        for k in range(n):
            pa, pb = s0 + (s1 - s0) * k / n + 0.006, s0 + (s1 - s0) * (k + 1) / n - 0.006
            piece(pa, pb, z0 + 0.14, top, m, th)
            if SD['wand'] is not None:      # Rahmenfeld, Schrauben, je nach Nummer Lüftungsgitter, Wartungsklappe, Anschlusskasten (beide Seiten)
                nv = Vector((-u.y, u.x, 0)); a3 = Vector((a.x, a.y, 0)); u3 = Vector((u.x, u.y, 0))
                for sg in (1, -1):
                    SD['k'] += 1
                    wandfeld(SD['wand'], a3, u3, nv * sg, pa, pb, z0 + 0.14, top, SD['k'], M['ifeld'] if m == 'iwand' else M['iwand'], M['irahmen'], M['ischacht'], M['mittel'], M['ischild'], d=th / 2)
        if band: piece(s0, s1, top, z1, 'iwand2', th)
    for t, w, h in doors:
        hf = min(h, z1 - z0)      # Tür höher als die Wand (Cockpitrückwand): oben offen, kein Sturz, Rahmen nur bis zur Oberkante
        piece(t - w / 2, t + w / 2, z0 + h, z1, 'iwand2', th)
        for sg in (-1, 1):
            c = a + u * (t + sg * (w / 2 + 0.04)); box(name + ' Rahmen', 0.08, th + 0.06, hf, c.x, c.y, z0 + hf / 2, M['irahmen'], 0.006, rot=(0, 0, ang))
        if h < z1 - z0 - 0.01:
            c = a + u * t; box(name + ' Rahmen', w + 0.16, th + 0.06, 0.08, c.x, c.y, z0 + h + 0.04, M['irahmen'], 0.006, rot=(0, 0, ang))
def door(name, a, b, t, w, h, opened=1.0, z0=DECK):      # Schiebetür in der Wandebene, öffnet zur Seite b hin
    a, b = Vector(a), Vector(b); u = (b - a).normalized(); ang = math.atan2(u.y, u.x)
    c = a + u * (t + opened * (w - 0.08))
    box(name, w, 0.05, h, c.x, c.y, z0 + h / 2, M['iwand2'], 0.008, rot=(0, 0, ang))
    for sg in (1, -1):      # Kobaltstreifen und Griffleiste auf beiden Seiten
        n = Vector((-u.y, u.x)) * sg * 0.028
        box(name + ' Streifen', w - 0.1, 0.004, 0.06, c.x + n.x, c.y + n.y, z0 + 1.45, M['akzent'], 0, rot=(0, 0, ang))
    # Bedienfeld neben der Tür (auf beiden Wandseiten)
    p = a + u * (t - w / 2 - 0.22)
    for sg in (1, -1):
        n = Vector((-u.y, u.x)) * sg * 0.06
        box(name + ' Bedienfeld', 0.08, 0.02, 0.12, p.x + n.x, p.y + n.y, z0 + 1.3, M['iwand2'], 0, rot=(0, 0, ang))
        box(name + ' Anzeige', 0.06, 0.024, 0.04, p.x + n.x, p.y + n.y, z0 + 1.33, M['screen'], 0, rot=(0, 0, ang))
def slab(name, x0, x1, y0, y1, z, m, th=0.05):
    return box(name, x1 - x0, y1 - y0, th, (x0 + x1) / 2, (y0 + y1) / 2, z, M[m], 0.004)
def ceiling(name, x0, x1, y0, y1, z=CEIL, lights=(), watt=80, col=(1.0, 0.97, 0.92)):
    slab(name, x0, x1, y0, y1, z + 0.025, 'idecke')
    if SD['decke'] is not None and name != 'Gangdecke': deckenraster(SD['decke'], x0, x1, y0, y1, z, M['irahmen'], p=1.0, b=0.04, t=0.02)
    for (x, y, lx, ly) in lights:
        box(name + ' Leuchte', lx, ly, 0.03, x, y, z - 0.015, M['lichtband'], 0.004)
        area(name + ' Licht', (x, y, z - 0.06), (0, 0, 0), lx, ly, watt, col)

# ---------- Räume ----------
def corridor():
    for s in (1, -1):
        y = s * 1.0; a, b = (-11.0, y), (6.0, y)
        iwall('Gangwand', a, b, DECK, CEIL, [(3.0, 0.9, 2.05), (7.0, 0.9, 2.05), (12.5, 1.0, 2.05)])
        door('Kabinentuer', a, b, 3.0, 0.9, 2.05, 0.92); door('Tuer', a, b, 7.0, 0.9, 2.05, 0.92)
        door('Tuer', a, b, 12.5, 1.0, 2.05, 0.92)
        yy = s * 0.94
        for x, t in ((-8.0, 'KABINE 1' if s > 0 else 'SANITÄT'), (-4.0, 'KABINE 2' if s > 0 else 'WASCHRAUM'), (1.5, 'MESSE' if s > 0 else 'TECHNIK')):
            fx = 1 if s > 0 else -1
            label(t, 0.055, (x + 0.62 if s > 0 else x - 0.62, yy - s * 0.012, DECK + 1.75), (fx, 0, 0), (0, 0, 1))
        for xa, xb in ((-10.8, -8.65), (-7.35, -4.65), (-3.35, 0.85), (2.15, 5.8)):      # Handlauf mit Lücken an den Türen
            pipe('Handlauf', [Vector((xa, s * 0.9, DECK + 0.95)), Vector((xa, s * 0.97, DECK + 0.95))], 0.018, M['mittel'])
            pipe('Handlauf', [Vector((xa, s * 0.88, DECK + 0.95)), Vector((xb, s * 0.88, DECK + 0.95))], 0.022, M['mittel'])
            pipe('Handlauf', [Vector((xb, s * 0.9, DECK + 0.95)), Vector((xb, s * 0.97, DECK + 0.95))], 0.018, M['mittel'])
        box('Leitlicht', 16.6, 0.03, 0.01, -2.5, s * 0.82, DECK + 0.03, M['leitlicht'], 0)
        box('Kabelkanal', 16.6, 0.22, 0.08, -2.5, s * 0.75, CEIL - 0.04, M['iwand2'], 0.004)
    slab('Gangboden', -11.0, 9.9, -1.0, 1.0, DECK - 0.02, 'iboden')
    zf = DECK + 0.005
    for s in (1, -1): platten(SD['boden'], -11.0, 6.0, s * 0.3 if s > 0 else -1.0, 1.0 if s > 0 else -0.3, zf, M['iboden'], M['ischacht'], M['mittel'], M['iboden2'], p=1.0, q=0.7)
    for k in range(17): gitter(SD['boden'], -11.0 + k + 0.01, -10.0 + k - 0.01, -0.3, 0.3, zf, M['igitter'], M['ischacht'])
    for s, mm, yy in ((1, 'irohr1', 0.42), (-1, 'irohr2', 0.42)):      # Leitungen längs unter der Decke, Halter an den Spanten
        pipe('Gangleitung', [Vector((-10.9, s * yy, CEIL - 0.13)), Vector((5.9, s * yy, CEIL - 0.13))], 0.032, M[mm])
        pipe('Gangleitung', [Vector((-10.9, s * (yy - 0.09), CEIL - 0.12)), Vector((5.9, s * (yy - 0.09), CEIL - 0.12))], 0.02, M['mittel'])
        for k in range(15):
            x = -10.4 + k * 1.15
            SD['decke'].box(0.04, 0.2, 0.1, x, s * (yy - 0.045), CEIL - 0.07, M['irahmen'])
            SD['decke'].box(0.05, 0.22, 0.012, x, s * (yy - 0.045), CEIL - 0.172, M['irahmen'])
    ceiling('Gangdecke', -11.0, 6.0, -1.0, 1.0, CEIL, [(x, 0, 1.4, 0.36) for x in (-8.5, -3.5, 1.5)], 70)
    for x in (-6.0, -1.0, 4.0): box('Deckenspant', 0.16, 2.0, 0.14, x, 0, CEIL - 0.07, M['irahmen'], 0.006)
    # Feuerlöscher und Notfallkasten
    cyl('Feuerloescher', 0.08, 0.5, -0.2, -0.86, DECK + 0.5, M['red'], 'Z', n=16)
    box('Notfallkasten', 0.4, 0.12, 0.5, 4.8, 0.88, DECK + 1.5, M['ochre'], 0.01)
def deck_floor():
    slab('Deckboden Backbord', -11.0, 5.0, 1.0, 5.2, DECK - 0.02, 'iboden')
    slab('Deckboden Steuerbord', -11.0, 5.0, -5.2, -1.0, DECK - 0.02, 'iboden')
    for x0, x1, y1 in ((-10.0, -6.0, 5.2), (-6.0, -2.0, 5.2), (-2.0, 5.0, 4.6)):      # Kabinen und Messe (Backbord)
        platten(SD['boden'], x0 + 0.06, x1 - 0.06, 1.06, y1 - 0.06, DECK + 0.005, M['iboden'], M['ischacht'], M['mittel'], M['iboden2'], p=1.2)
def side_walls(s):
    iwall('Querwand', (-10.0, s * 1.0), (-10.0, s * 5.2), DECK, CEIL)
    iwall('Querwand', (-6.0, s * 1.0), (-6.0, s * 5.2), DECK, CEIL)
    iwall('Querwand', (-2.0, s * 1.0), (-2.0, s * 5.2), DECK, CEIL)
    iwall('Querwand', (5.0, s * 1.0), (5.0, s * 4.6), DECK, CEIL)
    iwall('Aussenwand', (-10.0, s * 5.2), (-2.0, s * 5.2), DECK, CEIL, m='iwand2')
    iwall('Aussenwand', (-2.0, s * 4.6), (5.0, s * 4.6), DECK, CEIL, m='iwand2')
def cabin(x0, x1, s, nr):
    yo, yi = s * 5.2, s * 1.0; yc = (yo + yi) / 2
    ceiling('Kabinendecke', x0, x1, min(yo, yi), max(yo, yi), CEIL, [((x0 + x1) / 2, yc, 1.0, 0.4)], 45, (1.0, 0.88, 0.74))
    # Koje an der Außenwand: Sockel mit Schubladen, Matratze, Decke, Kissen, Ablage und Leselicht darüber
    bx0, bx1 = x0 + 0.08, x0 + 2.18; by = yo - s * 0.5; bxc = (bx0 + bx1) / 2
    box('Kojensockel', bx1 - bx0, 0.92, 0.42, bxc, by, DECK + 0.21, M['iwand2'], 0.01)
    for k in range(2): box('Schublade', 0.9, 0.01, 0.26, bx0 + 0.55 + k * 1.0, by - s * 0.461, DECK + 0.21, M['irahmen'], 0.003)
    box('Matratze', bx1 - bx0 - 0.06, 0.86, 0.16, bxc, by, DECK + 0.5, M['stoff'], 0.04)
    box('Bettdecke', 1.3, 0.88, 0.05, bxc + 0.3, by, DECK + 0.6, M['polster'], 0.03)
    box('Kissen', 0.36, 0.6, 0.12, bx0 + 0.28, by, DECK + 0.64, M['stoff'], 0.05)
    box('Kojenablage', bx1 - bx0, 0.3, 0.04, bxc, yo - s * 0.2, DECK + 1.55, M['irahmen'], 0.006)
    box('Leselicht', 0.3, 0.04, 0.04, bx0 + 0.4, yo - s * 0.08, DECK + 1.45, M['lichtband'], 0)
    point('Leselicht', (bx0 + 0.4, yo - s * 0.3, DECK + 1.35), 6, (1.0, 0.85, 0.65), 0.05)
    box('Kojenwand', 0.04, 0.95, 1.2, bx1 + 0.02, by, DECK + 0.6, M['iwand2'], 0.006)
    # Spind in der Ecke, Schreibtisch mit Stuhl und Bildschirm an der Querwand
    box('Spind', 0.6, 0.55, 2.1, x1 - 0.36, yo - s * 0.35, DECK + 1.05, M['iwand'], 0.01)
    box('Spindgriff', 0.02, 0.18, 0.03, x1 - 0.66, yo - s * 0.5, DECK + 1.1, M['mittel'], 0.004)
    dy = yo - s * 1.95
    box('Schreibtisch', 0.6, 1.2, 0.04, x1 - 0.36, dy, DECK + 0.75, M['platte'], 0.006)
    box('Tischfuss', 0.5, 0.04, 0.73, x1 - 0.36, dy + 0.55, DECK + 0.37, M['irahmen'], 0.004)
    box('Wandbildschirm', 0.03, 0.8, 0.48, x1 - 0.06, dy, DECK + 1.35, M['screen'], 0)
    box('Stuhlsitz', 0.45, 0.45, 0.06, x1 - 0.95, dy, DECK + 0.47, M['polster'], 0.02)
    box('Stuhllehne', 0.05, 0.42, 0.5, x1 - 1.17, dy, DECK + 0.75, M['polster'], 0.02)
    cyl('Stuhlsaeule', 0.03, 0.42, x1 - 0.95, dy, DECK + 0.23, M['mittel'], 'Z', n=10)
def washroom(x0, x1, s):
    yo, yi = s * 5.2, s * 1.0; yc = (yo + yi) / 2
    ceiling('Waschraumdecke', x0, x1, min(yo, yi), max(yo, yi), CEIL, [((x0 + x1) / 2, yc, 1.0, 0.4)], 55)
    slab('Fliesenboden', x0 + 0.05, x1 - 0.05, min(yo, yi) + 0.05, max(yo, yi) - 0.05, DECK + 0.006, 'fliese', 0.012)
    # Dusche in der Ecke an der Außenwand: Wanne, zwei Glaswände, Brausekopf; Fliesen an der Wand
    sx, sy = x1 - 0.55, yo - s * 0.55
    box('Duschwanne', 1.0, 1.0, 0.08, sx, sy, DECK + 0.04, M['fliese'], 0.01)
    box('Duschglas', 0.02, 1.0, 2.0, x1 - 1.06, sy, DECK + 1.1, M['lens'], 0)
    box('Duschglas', 1.0, 0.02, 2.0, sx, yo - s * 1.06, DECK + 1.1, M['lens'], 0)
    box('Duschfliesen', 1.0, 0.01, 2.2, sx, yo - s * 0.06, DECK + 1.15, M['fliese'], 0)
    pipe('Brause', [Vector((x1 - 0.08, sy, DECK + 1.2)), Vector((x1 - 0.08, sy, DECK + 2.05)), Vector((x1 - 0.3, sy, DECK + 2.1))], 0.016, M['steel'], rad=0.08)
    cyl('Brausekopf', 0.09, 0.03, x1 - 0.32, sy, DECK + 2.08, M['steel'], 'Z', n=16)
    # Toilette, Waschbecken mit Spiegel an der hinteren Querwand
    box('Toilettensockel', 0.42, 0.36, 0.38, x0 + 0.32, yo - s * 0.5, DECK + 0.19, M['fliese'], 0.03)
    cyl('Toilettensitz', 0.2, 0.04, x0 + 0.38, yo - s * 0.5, DECK + 0.4, M['white'], 'Z', n=20)
    box('Spuelkasten', 0.16, 0.4, 0.4, x0 + 0.1, yo - s * 0.5, DECK + 0.62, M['white'], 0.02)
    box('Waschtisch', 0.5, 0.7, 0.12, x0 + 0.3, yc + s * 0.2, DECK + 0.85, M['fliese'], 0.02)
    cyl('Becken', 0.18, 0.02, x0 + 0.3, yc + s * 0.2, DECK + 0.915, M['dunkel'], 'Z', n=20)
    box('Spiegel', 0.01, 0.7, 0.8, x0 + 0.06, yc + s * 0.2, DECK + 1.5, M['spiegel'], 0)
    box('Spiegellicht', 0.03, 0.7, 0.04, x0 + 0.08, yc + s * 0.2, DECK + 1.95, M['lichtband'], 0)
    pipe('Handtuchhalter', [Vector((x0 + 1.4, yo - s * 0.08, DECK + 1.2)), Vector((x0 + 2.2, yo - s * 0.08, DECK + 1.2))], 0.012, M['steel'])
    box('Handtuch', 0.5, 0.03, 0.6, x0 + 1.8, yo - s * 0.1, DECK + 0.95, M['polster'], 0.01)
def mess(s):
    x0, x1, yo, yi = -2.0, 5.0, s * 4.6, s * 1.0; yc = (yo + yi) / 2
    ceiling('Messedecke', x0, x1, min(yo, yi), max(yo, yi), CEIL, [(0.5, yc, 1.2, 0.4), (3.4, yc, 1.2, 0.4)], 70, (1.0, 0.9, 0.78))
    # Kochzeile an der Außenwand: Unterschränke, Arbeitsplatte, Spüle, Kochfeld, Oberschränke, Abzug
    kx0, kx1 = -1.8, 2.4; kc = (kx0 + kx1) / 2; ky = yo - s * 0.33
    box('Unterschrank', kx1 - kx0, 0.62, 0.86, kc, ky, DECK + 0.43, M['iwand2'], 0.01)
    for k in range(6): box('Schrankfuge', 0.008, 0.01, 0.8, kx0 + (k + 1) * 0.6, ky - s * 0.311, DECK + 0.44, M['fuge'], 0)
    box('Arbeitsplatte', kx1 - kx0 + 0.04, 0.66, 0.04, kc, ky, DECK + 0.88, M['steel'], 0.006)
    box('Spuele', 0.5, 0.4, 0.02, -0.9, ky, DECK + 0.895, M['dunkel'], 0)
    pipe('Wasserhahn', [Vector((-0.9, yo - s * 0.08, DECK + 0.9)), Vector((-0.9, yo - s * 0.08, DECK + 1.15)), Vector((-0.9, yo - s * 0.3, DECK + 1.15))], 0.014, M['steel'], rad=0.05)
    box('Kochfeld', 0.6, 0.5, 0.01, 1.4, ky, DECK + 0.905, M['dunkel'], 0)
    for dx, dy in ((-0.14, -0.11), (0.14, -0.11), (-0.14, 0.11), (0.14, 0.11)): ring('Kochzone', 0.09, 0.006, (1.4 + dx, ky + dy, DECK + 0.912), (0, 0, 1), M['e_amber'], 20)
    box('Oberschrank', kx1 - kx0, 0.38, 0.7, kc, yo - s * 0.23, DECK + 1.85, M['iwand'], 0.01)
    for k in range(6): box('Schrankfuge', 0.008, 0.01, 0.66, kx0 + (k + 1) * 0.6, yo - s * 0.421, DECK + 1.85, M['fuge'], 0)
    box('Lichtleiste', kx1 - kx0, 0.04, 0.02, kc, yo - s * 0.38, DECK + 1.49, M['lichtband'], 0)
    box('Kaffeeautomat', 0.3, 0.32, 0.42, 2.1, ky + s * 0.08, DECK + 1.11, M['dunkel'], 0.02)
    # Essplatz: Tisch auf Säule, Eckbank an Querwand und Außenwand, zwei Hocker
    tx, ty = 3.5, yc - s * 0.15
    box('Esstisch', 1.5, 0.95, 0.05, tx, ty, DECK + 0.75, M['platte'], 0.02)
    cyl('Tischsaeule', 0.07, 0.72, tx, ty, DECK + 0.36, M['mittel'], 'Z', n=14)
    box('Bank', 0.5, 2.6, 0.44, x1 - 0.3, yc + s * 0.15, DECK + 0.22, M['iwand2'], 0.01)
    box('Bankpolster', 0.46, 2.56, 0.1, x1 - 0.3, yc + s * 0.15, DECK + 0.49, M['polster'], 0.03)
    box('Rueckenpolster', 0.1, 2.56, 0.5, x1 - 0.1, yc + s * 0.15, DECK + 0.85, M['polster'], 0.03)
    for dx in (-0.45, 0.45):
        cyl('Hocker', 0.18, 0.06, tx + dx, ty - s * 0.85, DECK + 0.48, M['polster'], 'Z', n=16)
        cyl('Hockersaeule', 0.03, 0.45, tx + dx, ty - s * 0.85, DECK + 0.23, M['mittel'], 'Z', n=10)
    box('Messebildschirm', 1.2, 0.03, 0.68, 3.4, yo - s * 0.06, DECK + 1.6, M['screen'], 0)
    for k, (dx, h) in enumerate(((3.2, 0.12), (3.5, 0.1))): cyl('Becher', 0.04, h, dx, ty + s * 0.1, DECK + 0.78 + h / 2, M['white'], 'Z', n=12)
def engineering(s):
    x0, x1, yo, yi = -2.0, 5.0, s * 4.6, s * 1.0; yc = (yo + yi) / 2
    ceiling('Technikdecke', x0, x1, min(yo, yi), max(yo, yi), CEIL, [(-0.6, yc, 1.0, 0.36), (4.0, yc, 1.0, 0.36)], 55, (0.85, 0.92, 1.0))
    slab('Gitterboden', x0 + 0.05, x1 - 0.05, min(yo, yi) + 0.05, max(yo, yi) - 0.05, DECK + 0.006, 'grate', 0.012)
    # Energiekern: Sockel, Säule mit leuchtenden Schlitzen, Ringe, Kopf mit Leitungen zur Decke, Geländer und Warnring am Boden
    cx, cy = 1.4, yc
    cyl('Kernsockel', 0.95, 0.22, cx, cy, DECK + 0.11, M['mittel'], 'Z', n=40)
    cyl('Kern', 0.55, CEIL - DECK - 0.62, cx, cy, (DECK + 0.22 + CEIL - 0.4) / 2, M['dunkel'], 'Z', n=40)
    for k in range(8):
        a = k * PI / 4; box('Kernfenster', 0.06, 0.03, 1.5, cx + math.cos(a) * 0.55, cy + math.sin(a) * 0.55, DECK + 1.25, M['kern'], 0, rot=(0, 0, a))
    for z in (DECK + 0.35, DECK + 2.15, CEIL - 0.45): cyl('Kernring', 0.62, 0.1, cx, cy, z, M['mittel'], 'Z', n=40)
    cyl('Kernkopf', 0.72, 0.2, cx, cy, CEIL - 0.3, M['mittel'], 'Z', n=40)
    for a in (0.4, 2.0, 3.6, 5.2):
        pipe('Kernleitung', [Vector((cx + math.cos(a) * 0.5, cy + math.sin(a) * 0.5, CEIL - 0.2)), Vector((cx + math.cos(a) * 0.5, cy + math.sin(a) * 0.5, CEIL - 0.05))], 0.07, M['copper'])
    ring('Gelaender', 1.25, 0.025, (cx, cy, DECK + 1.0), (0, 0, 1), M['ochre'], 40)
    ring('Gelaender', 1.25, 0.02, (cx, cy, DECK + 0.55), (0, 0, 1), M['ochre'], 40)
    for k in range(6):
        a = k * PI / 3 + 0.3; cyl('Gelaenderpfosten', 0.025, 1.0, cx + math.cos(a) * 1.25, cy + math.sin(a) * 1.25, DECK + 0.5, M['ochre'], 'Z', n=10)
    ring('Warnring', 1.4, 0.04, (cx, cy, DECK + 0.02), (0, 0, 1), M['warnrw'], 48)
    point('Kernlicht', (cx, cy, DECK + 1.3), 60, (0.3, 0.62, 1.0), 0.4)
    # Schaltschränke an der hinteren Querwand, Werkbank an der vorderen, Rohre unter der Decke, Konsole am Gang
    for k in range(5):
        y = yi + s * (0.55 + k * 0.66)
        box('Schaltschrank', 0.5, 0.62, 2.0, x0 + 0.3, y, DECK + 1.0, M['cab'], 0.01)
        box('Schrankanzeige', 0.01, 0.3, 0.2, x0 + 0.555, y, DECK + 1.55, M['screen'], 0)
        for j in range(3): cyl('LED', 0.012, 0.01, x0 + 0.556, y - 0.12 + j * 0.12, DECK + 1.25, M['e_green' if j else 'e_amber'], 'X', n=8, bev=0)
    box('Werkbank', 0.7, 1.6, 0.06, x1 - 0.4, yo - s * 1.0, DECK + 0.9, M['platte'], 0.006)
    box('Werkbankunterbau', 0.66, 1.56, 0.86, x1 - 0.4, yo - s * 1.0, DECK + 0.43, M['cab'], 0.01)
    box('Werkzeugwand', 0.03, 1.6, 0.9, x1 - 0.07, yo - s * 1.0, DECK + 1.6, M['iwand2'], 0)
    for j in range(6): box('Werkzeug', 0.03, 0.04, 0.3 + 0.05 * (j % 3), x1 - 0.1, yo - s * (0.4 + j * 0.24), DECK + 1.6, M['steel'], 0.003)
    for k, (z, r, m) in enumerate(((CEIL - 0.2, 0.08, 'oxid' if 'oxid' in M else 'red'), (CEIL - 0.38, 0.06, 'copper'), (CEIL - 0.2, 0.05, 'teal'))):
        y = yo - s * (0.3 + k * 0.25); pipe('Leitung', [Vector((x0 + 0.1, y, z)), Vector((x1 - 0.1, y, z))], r, M[m])
    box('Technikkonsole', 0.5, 0.9, 1.0, x1 - 0.35, yi + s * 0.6, DECK + 0.5, M['cab'], 0.01)
    box('Konsolenschirm', 0.4, 0.8, 0.02, x1 - 0.42, yi + s * 0.6, DECK + 1.05, M['screen'], 0, rot=(0, math.radians(-25), 0))
def stairs():
    n, x0, x1 = 11, 6.05, 9.45; run = (x1 - x0) / n; rise = (4.5 - DECK) / n
    for k in range(n):
        top = DECK + rise * (k + 1); xa = x0 + k * run
        box('Stufe', run + 0.02, 1.9, top - DECK + 0.02, xa + run / 2, 0, (DECK + top) / 2 - 0.01, M['iboden'], 0.006)
        box('Stufenkante', 0.04, 1.86, 0.012, xa + 0.03, 0, top + 0.002, M['leitlicht'], 0)
    box('Treppenpodest', 9.9 - x1 + 0.1, 1.9, 0.06, (9.9 + x1) / 2, 0, 4.47, M['iboden'], 0.006)
    for s in (1, -1):
        iwall('Treppenwand', (6.0, s * 1.0), (9.9, s * 1.0), DECK, 6.6, band=False)
        pipe('Treppengelaender', [Vector((6.2, s * 0.88, DECK + 0.95)), Vector((x0, s * 0.88, DECK + 0.95)), Vector((x1, s * 0.88, 4.5 + 0.95)), Vector((9.85, s * 0.88, 4.5 + 0.95))], 0.022, M['mittel'])
    # schräge Decke von 5,0 m (Gangdecke) auf 6,55 m über dem Podest: überall mindestens 2 m Kopfhöhe (Laufkarte braucht 1,95 m)
    ln = math.hypot(3.5, 1.55); ang = math.atan2(1.55, 3.5)
    box('Treppendecke', ln, 2.0, 0.05, 7.75, 0, 5.8, M['idecke'], 0.004, rot=(0, -ang, 0))
    box('Treppendecke', 0.45, 2.0, 0.05, 9.72, 0, 6.575, M['idecke'], 0.004)
    box('Treppenlicht', ln - 0.4, 0.14, 0.02, 7.75, 0, 5.765, M['lichtband'], 0, rot=(0, -ang, 0))
    area('Treppenlicht', (7.8, 0, 5.65), (0, -ang, 0), 2.6, 0.5, 60, (1.0, 0.97, 0.92))
def cockpit_rear():
    # Rückwand folgt der Kanzel: Mitte bis 6,15 m (unter dem Glasdach), außen niedriger bis zur Wannenwand
    w = canopy_half(9.9) - 0.12
    iwall('Cockpitrueckwand', (9.9, -2.2), (9.9, 2.2), 4.5, 6.15, [(2.2, 1.1, 1.95)], band=False)
    for s in (1, -1):
        iwall('Cockpitrueckwand', (9.9, s * 2.2), (9.9, s * w), 4.5, 5.6, band=False)
def cargo_front():
    iwall('Laderaumwand', (-11.0, -3.6), (-11.0, 3.6), DECK, 5.85, [(3.6, 1.4, 2.3)])
    door('Laderaumtuer', (-11.0, -3.6), (-11.0, 3.6), 3.6, 1.4, 2.3, 0.95)
    label('LADERAUM', 0.06, (-10.94, -0.33, DECK + 2.42), (0, 1, 0), (0, 0, 1))
def innen():
    CUR[0] = C_ROOM
    SD['wand'], SD['boden'], SD['decke'] = Sammel('Innendetail Wand', C_ROOM), Sammel('Innendetail Boden', C_ROOM, 0.003), Sammel('Innendetail Decke', C_ROOM)
    deck_floor(); corridor()
    for s in (1, -1):
        side_walls(s)
        if s > 0: cabin(-10.0, -6.0, s, 1); mess(s)      # Kabine 2 und Sanität: kor_raeume.py
        else: washroom(-6.0, -2.0, s); engineering(s)
    stairs(); cockpit_rear(); cargo_front(); cockpit(); raeume()
    for k in ('wand', 'boden', 'decke'): SD[k].fertig(); SD[k] = None

# ---------- Kameras und Ansichten innen ----------
def innen_cams():
    cam('Innen Gang', (-10.4, -0.35, 4.15), (6.0, 0.25, 3.7), 18)
    cam('Innen Kabine', (-6.35, 1.5, 4.3), (-9.6, 4.6, 2.9), 16)
    cam('Innen Messe', (4.7, 1.35, 4.2), (-1.6, 4.2, 3.1), 16)
    cam('Innen Technik', (4.6, -1.3, 4.3), (-1.6, -3.6, 3.2), 16)
    cam('Innen Waschraum', (-2.35, -1.4, 4.3), (-5.6, -4.6, 2.9), 16)
    cam('Innen Kabine 2', (-2.4, 1.4, 4.3), (-5.6, 4.6, 2.9), 16)
    cam('Innen Sanitaet', (-6.35, -1.45, 4.3), (-9.6, -4.4, 2.9), 16)
    cam('Innen Laderaum vorn', (-11.7, 2.6, 4.5), (-21.0, -0.9, 3.1), 18)
    cam('Innen Laderaum', (-21.0, -0.7, 4.3), (-11.0, 0.5, 3.4), 18)
    cam('Innen Treppe', (2.6, 0.0, 4.05), (9.6, 0.0, 4.9), 20)
    cam('Innen Cockpit', (11.2, 0.0, 5.75), (19.0, 0.0, 5.4), 20)
    cam('Innen Pilot', (12.78, 0.9, 5.8), (15.5, 0.55, 5.25), 20)
    cam('Innen Konsole', (12.45, 0.0, 5.98), (13.8, 0.0, 5.08), 22)
    cam('Schnitt', (-2.6, 0.0, 4.92), (-2.6, 0.0, 0.0), 50, ortho=43)
    CAMS['Schnitt'].data.clip_start = 0.02
VIEWS.update({
    'gang': ('Innen Gang', False, True, False, 0.6), 'kabine': ('Innen Kabine', False, True, False, 0.6),
    'messe': ('Innen Messe', False, True, False, 0.6), 'technik': ('Innen Technik', False, True, False, 0.4),
    'waschraum': ('Innen Waschraum', False, True, False, 0.6), 'kabine2': ('Innen Kabine 2', False, True, False, 0.6),
    'sanitaet': ('Innen Sanitaet', False, True, False, 0.4), 'laderaum2': ('Innen Laderaum vorn', True, True, False, 0.5), 'laderaum': ('Innen Laderaum', True, True, False, 0.5),
    'treppe': ('Innen Treppe', False, True, False, 0.6), 'cockpit': ('Innen Cockpit', False, True, False, 0.2),
    'pilot': ('Innen Pilot', False, True, False, 0.4), 'konsole': ('Innen Konsole', False, True, False, 0.4),
    'schnitt': ('Schnitt', False, True, False, 0.0),
})
INNEN = ['gang', 'kabine', 'kabine2', 'sanitaet', 'messe', 'technik', 'waschraum', 'laderaum', 'laderaum2', 'treppe', 'cockpit', 'pilot', 'konsole', 'schnitt']
exec(compile(open(os.path.join(HERE, 'kor_cockpit.py'), encoding='utf-8').read(), 'kor_cockpit.py', 'exec'))
exec(compile(open(os.path.join(HERE, 'kor_raeume.py'), encoding='utf-8').read(), 'kor_raeume.py', 'exec'))
_view_aussen = view
def view(name, path, res=(1600, 900)):
    cut = name == 'schnitt'
    hide = [o for c in (C_HULL, C_PART, C_WPN, C_DECAL, C_LITE) for o in c.all_objects]
    old = [(o, o.hide_render) for o in hide]
    if cut:
        for o in hide: o.hide_render = True
    try: _view_aussen(name, path, res)
    finally:
        for o, h in old: o.hide_render = h
