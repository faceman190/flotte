# Rundhalle (neues Deck 3 der Bastion): Zusammenbau, Einrichtung, Licht, Kameras, Rendern.
# Läuft nach bk_kit.py, bk_mehr.py, bk_med.py und rh_kit.py im selben Namensraum (rh_lauf.py erledigt das ohne Fenster).
import json
def col(name, parent=None):
    c = bpy.data.collections.new(name); (parent or SC.collection).children.link(c); return c
C_DECK, C_CEIL, C_SIGN, C_LIGHT, C_CAM, C_BLATT = col('Deck'), col('Decke'), col('Schilder'), col('Licht'), col('Kameras'), col('Baukastenblatt')
R_ = RH_R

# Öffnungen der Halle: Winkel, Kennbuchstabe, Titel, Unterzeile (Korridor bei 180°)
BAYS = [(0, 'a', 'AUFTRÄGE', 'AUFTRÄGE  ·  MISSIONEN  ·  KOPFGELD'), (60, 'h', 'HANDELSKONTOR', 'MARKT  ·  LAGER'),
        (120, 'w', 'WERFT', 'WERFT  ·  WERKSTATT  ·  SERVICE'), (-120, 'k', 'KANTINE', 'ESSEN  ·  TRINKEN  ·  NEUIGKEITEN'),
        (-60, 'r', 'AUSRÜSTER', 'AUSRÜSTUNG  ·  MODULE  ·  ANZÜGE')]
# Wandstücke zwischen den Öffnungen: (von Öffnung, bis Öffnung, Art, Schrift)
SECTORS = [(120, 180, 'info', 'STATIONSPLAN'), (-180, -120, 'automat', ''), (-120, -60, 'schott', 'DECK 2'),
           (-60, 0, 'gang', 'KRANKENSTATION'), (0, 60, 'gang', 'BESPRECHUNG'), (60, 120, 'aufzug', 'QUARTIERE')]
def th(a): return TH_K if a in (180, -180) else TH_B

def place_flat(objs, ang, loc):      # flach gebaute Teile (Schilder) an ihren Platz drehen
    rotz(objs, ang, loc)
def build_signs(fn, ang, loc):
    prev = CUR[0]; CUR[0] = C_SIGN; REC[0] = []
    fn(); objs = REC[0]; REC[0] = None; CUR[0] = prev; rotz(objs, ang, loc)

class Frame:      # Rahmen einer Bucht: Mündung (Sehne) bei x = 0, Tiefe nach +x, quer y (links = +y vom Halleninneren gesehen)
    def __init__(self, deg, d):
        self.a = RAD(deg); self.c, self.s = math.cos(self.a), math.sin(self.a); self.d = d
    def p(self, x, y, z=0.0): xx = self.d + x; return (xx * self.c - y * self.s, xx * self.s + y * self.c, z)
    def put(self, name, x, y, ang=0.0, into=None): return inst(prop(name), self.p(x, y), self.a + ang, into or C_DECK)
    def dress(self, name, side, u):      # Wandfüllung an der Buchtwand: side 'l' (+y), 'r' (−y), 'b' (Rückwand); u = Lage längs der Wand
        if side == 'l': wp, na = (u, BW / 2), -PI / 2
        elif side == 'r': wp, na = (u, -BW / 2), PI / 2
        else: wp, na = (BD, u), PI
        x, y = wp[0] + 1.7 * math.cos(na), wp[1] + 1.7 * math.sin(na)
        return inst(dress(name), self.p(x, y), self.a + na, C_DECK)
    def flat(self, name, side, u):      # flach gebautes Objekt (Wandebene x = 0, Raum bei x < 0) an eine Buchtwand
        if side == 'l': x, y, na = u, BW / 2, PI / 2
        elif side == 'r': x, y, na = u, -BW / 2, -PI / 2
        else: x, y, na = BD, u, 0.0
        return inst(prop(name), self.p(x, y), self.a + na, C_DECK)
    def area(self, x, y, z, sx, sy, w, col_, rot=(0, 0, 0)):
        prev = CUR[0]; CUR[0] = C_LIGHT; ob = area('Buchtlicht', self.p(x, y, z), (rot[0], rot[1], self.a + rot[2]), sx, sy, w, col_); CUR[0] = prev; return ob

def split(src, dst, names):      # Teile eines Bausteins (über Kopf, Kulisse) in einen eigenen Baustein verschieben
    if dst in MOD: return MOD[dst]
    s_ = prop(src); c = bpy.data.collections.new(dst); MOD[dst] = c
    for o in list(s_.objects):
        if o.name.split('.')[0] in names: s_.objects.unlink(o); c.objects.link(o)
    return c
JOCH_OBEN = {'Schräge', 'Schrägplatte', 'Schrägleiste', 'Deckenkante', 'Decke', 'Lichtbandrahmen', 'Lichtband', 'Gangleitung', 'Leitungsträger', 'Spantschräge', 'Spantriegel'}
KULISSE = {'Hangarboden', 'Hangarwand', 'Hangarlicht', 'Hangarbalken'}
def assemble():
    prop('automat')      # vorab bauen: Bausteine dürfen nicht entstehen, während ein Wandstück zum Biegen aufgezeichnet wird
    # Boden, Treffpunkt, Decke
    for k in range(6): inst(prop('rh_bodenkeil'), (0, 0, 0), RAD(60 * k), C_DECK)
    inst(prop('rh_treffpunkt'), (0, 0, 0), 0.0, C_DECK)
    for k in range(12): inst(prop('rh_deckenkeil'), (0, 0, 0), RAD(30 * k), C_CEIL)
    inst(prop('rh_lichtkrone'), (0, 0, 0), 0.0, C_CEIL); inst(prop('rh_ringschirm'), (0, 0, 0), 0.0, C_CEIL)
    # Pfeiler an allen Öffnungskanten
    for (deg, *_r) in BAYS + [(180,)]:
        t = th(deg)
        for sg in (-1, 1):
            a = RAD(deg) + sg * t; x, y = polar(R_, a); inst(prop('rh_pfeiler'), (x, y, 0), a, C_DECK)
    # gekrümmte Wandstücke
    dl = (PW / 2) / R_
    for (d0, d1, kind, label) in SECTORS:
        a0 = RAD(d0) + th(d0) + dl; a1 = RAD(d1) - th(d1) - dl; L = R_ * (a1 - a0)
        c = bent_module('Wandstück ' + kind + ' ' + label + str(d0), sector_fill, R_, L, kind, label)
        inst(c, (0, 0, 0), (a0 + a1) / 2, C_DECK)
    for w_ in WINGS: build_wing(*w_)
    # Portale und Buchten
    hwb = YP_B + 0.5
    pb = module('Portal Bucht', b_portal, OW_B, OH_B, 0.75, hwb, 'laden')
    pk = module('Portal Korridor', b_portal, OW_K, OH_K, 0.62, YP_K + 0.5, 'gang')
    shell_ = prop('rh_buchtschale')
    for (deg, sig, title, sub) in BAYS:
        a = RAD(deg); x, y = polar(D0, a)
        inst(pb, (x, y, 0), a, C_DECK); inst(shell_, (x, y, 0), a, C_DECK); inst(prop('rh_buchtdecke'), (x, y, 0), a, C_CEIL)
        build_signs(lambda t=title, s=sub, g=sig: portal_sign(t, s, g, OW_B, OH_B), a, (x, y, 0))
        F = Frame(deg, D0)
        for side in ('l', 'r'):
            for u in (1.75, 3.75, 5.75, 7.75): F.dress('buchtwand', side, u)
        for u in (-3.0, -1.0, 1.0, 3.0): F.dress('buchtwand', 'b', u)
        furnish_bay(F, sig)
    x, y = polar(DK, PI); inst(pk, (x, y, 0), PI, C_DECK)
    build_signs(lambda: portal_sign('HANGAR', 'SCHIFFE  ·  DECKMEISTER  ·  START', 'w', OW_K, OH_K), PI, (x, y, 0))
    # Korridor
    jo, ku = split('rh_joch', 'Joch oben', JOCH_OBEN), split('rh_hangartor', 'Kulisse', KULISSE)
    for k in range(4): inst(prop('rh_joch'), (KX0 + 4 * k, 0, 0), 0.0, C_DECK); inst(jo, (KX0 + 4 * k, 0, 0), 0.0, C_CEIL)
    inst(prop('rh_hangartor'), (KX0, 0, 0), 0.0, C_DECK); inst(ku, (KX0, 0, 0), 0.0, C_CEIL)
    gang = {('l', 0): 'pflanzwand', ('l', 1): 'feldh1', ('l', 2): 'schirm', ('l', 3): 'bank', ('l', 4): 'feld2', ('l', 5): 'terminal', ('l', 6): 'feuer', ('l', 7): 'feldh2',
            ('r', 0): 'feld1', ('r', 1): 'aushang', ('r', 2): 'bank', ('r', 3): 'schirm', ('r', 4): 'gitter', ('r', 5): 'feldh1', ('r', 6): 'luke', ('r', 7): 'flaschen'}
    for (side, i), name in gang.items():
        x = KX0 + (i // 2) * 4 + (1.25 if i % 2 == 0 else 3.07)
        if side == 'l': inst(dress(name), (x, KW / 2 - 1.7, 0), -PI / 2, C_DECK)
        else: inst(dress(name), (x, -KW / 2 + 1.7, 0), PI / 2, C_DECK)
    # Korridorschilder: hängende Wegweiser
    prev = CUR[0]; CUR[0] = C_SIGN
    for (xx, lines) in ((KX0 + 4.4, ['TREFFPUNKT  ·  GERADEAUS', 'AUFTRÄGE  ·  HANDEL  ·  WERFT']), (KX0 + 12.4, ['DECK 3  ·  TREFFPUNKT', 'KANTINE  ·  AUSRÜSTER'])):
        REC[0] = []
        box('Wegweiser', 0.06, 3.4, 0.5, 0, 0, 3.9, M['frame'], 0.014); box('Wegweiser Feld', 0.012, 3.3, 0.42, -0.035, 0, 3.9, M['glass'], 0)
        for i, s in enumerate(lines): text(s, 0.13, (-0.042, 0, 3.97 - i * 0.2), RIGHT_X, RIGHT_Y, M['e_cool' if i == 0 else 'e_amber'], align='CENTER')
        for sy in (-1.5, 1.5): pipe('Hänger', [(0, sy, 4.15), (0, sy, KH)], 0.012, M['steel'])
        objs = REC[0]; REC[0] = None; rotz(objs, 0.0, (xx, 0, 0))
    CUR[0] = prev
    # Halle: wenige Objekte
    for (r, d, nm, ang) in ((13.2, 150, 'saeule', 0), (13.2, -150, 'saeule', 0), (14.6, 38, 'rh_kuebel', 0), (14.6, -38, 'rh_kuebel', 0), (14.4, 100, 'kisten', 1.2), (14.0, -78, 'wagen', 0.6),
                           (14.5, -100, 'tonne', 0), (14.6, 140, 'rh_kuebel', 0), (14.6, -142, 'rh_kuebel', 0), (13.6, 82, 'karre', 2.0)):
        x, y = polar(r, RAD(d)); inst(prop(nm), (x, y, 0), RAD(d) + ang, C_DECK)
    # Bodenschrift an den Leitspuren
    prev = CUR[0]; CUR[0] = C_SIGN
    for (deg, sig, title, sub) in BAYS + [(180, 'w', 'HANGAR', '')]:
        REC[0] = []; text(title, 0.36, (8.6, 0, 0.004), (0, -1, 0), (1, 0, 0), M['txto'], align='CENTER'); objs = REC[0]; REC[0] = None; rotz(objs, RAD(deg))
    CUR[0] = prev

# ---------- Flügel hinter den Durchgängen: Gang und Raum aus dem alten Baukasten (Zellen 4 × 4 m) ----------
# Rahmen des Flügels: x vom Hallenmittelpunkt nach außen (Richtung des Wandstücks), y quer (+y = links vom Halleninneren gesehen)
WX0 = RH_R + 0.5 + 2.0      # Mitte der ersten Gangzelle: die Nische des Durchgangs reicht 0,5 m hinter die Wandfläche
WINGS = [(-30, 'K', 'KRANKENSTATION', 'hell'), (30, 'B', 'BESPRECHUNG', 'dunkel')]
def wing_cells():
    cells = [((0, 0), 'gang', ['W', 'O', 'W', 'S', '-', '-', '-', '-']), ((1, 0), 'gang', ['W', 'D', 'W', 'S', '-', '-', '-', '-'])]
    for i in (2, 3):
        for j in (-1, 0, 1):
            cells.append(((i, j), 'raum', ['O' if j < 1 else 'W', 'O' if i < 3 else 'W', 'O' if j > -1 else 'W', 'O' if i > 2 else ('X' if j == 0 else 'W')]))
    return cells
def wing_dress(ch, kind, i, j, k):
    if kind == 'gang': return {(0, 0): ('feldh1', 'feldh2'), (0, 2): ('terminal', 'feld1'), (1, 0): ('feuer', 'aushang'), (1, 2): ('bank', 'schrank')}[(i, k)]
    if ch == 'K':
        if k == 1: return {1: ('liege1', 'liege2'), 0: ('fenster', 'fenster'), -1: ('liege3', 'liege4')}[j]
        if k == 0: return ('medschrank', 'feld1') if i == 2 else ('waschplatz', 'medschrank')
        if k == 2: return ('feld2', 'diagnose') if i == 2 else ('medschrank', 'aushang')
        return ('feld1', 'schrank') if j == 1 else ('feuer', 'feld2')
    if k == 1: return ('schirm', 'schirm')
    if k in (0, 2): return ('fenster', 'fenster')
    return ('feld3', 'aushang') if j == 1 else ('feld2', 'feld3')
def build_wing(deg, ch, name, mood):
    a = RAD(deg); Rm = Matrix.Rotation(a, 3, 'Z')
    def Wp(x, y, z=0.0): return Rm @ Vector((x, y, z))
    for ((i, j), kind, st) in wing_cells():
        cm, cd = shell(kind, st, mood); loc = Vector((WX0 + 4 * i, 4 * j, 0))
        inst(cm, Wp(*loc), a, C_DECK); inst(cd, Wp(*loc), a, C_CEIL)
        for k in range(4):
            if st[k] != 'W': continue
            for (nm, b) in zip(wing_dress(ch, kind, i, j, k), (-1, 1)):
                inst(dress(nm), Wp(*(loc + Matrix.Rotation(ANG[k], 3, 'Z') @ Vector((0, b, 0)))), a + ANG[k], C_DECK)
        if kind == 'gang' and st[1] == 'D':      # Türschild über dem Schott zum Raum und auf dem Boden davor
            prev = CUR[0]; CUR[0] = C_SIGN; REC[0] = []; w = len(name) * 0.11 * 0.64
            text(name, 0.11, (-1.945, -w / 2, 2.58), LEFT_X, LEFT_Y, M['txtw']); text(name, 0.16, (-1.2, -len(name) * 0.16 * 0.32, 0.0125), FL_X, FL_Y, M['txto'])
            objs = REC[0]; REC[0] = None; CUR[0] = prev; rotz(objs, ANG[1], loc); rotz(objs, a)
    def put(nm, x, y, ang=0.0): inst(prop(nm), Wp(x, y), a + ang, C_DECK)
    if ch == 'K':
        put('utisch', 28.0, 0.0, PI / 2); put('stellwand', 30.6, 2.0, 0.0); put('stellwand', 30.6, -2.0, 0.0); put('hocker', 28.9, -0.9, 0.4)
        put('tropf', 31.8, 2.7); put('tropf', 31.8, -2.7); put('tonne', 25.7, -5.3); put('rh_kuebel', 25.8, 5.2)
    else:
        put('tisch', 29.2, 0.0)
        for q in range(4): put('stuhl', 28.0 + q * 0.8, 1.22, -PI / 2); put('stuhl', 28.0 + q * 0.8, -1.22, PI / 2)
        put('stuhl', 27.0, 0.0, 0.0); put('pult', 32.3, 0.0, PI); put('pendel', 28.4, 0.0); put('pendel', 30.0, 0.0)
        for y in (-4.4, 4.4): put('sessel', 26.3, y, 0.0)
        put('rh_kuebel', 32.3, 5.2); put('rh_kuebel', 32.3, -5.2); put('saeule', 25.9, -5.3)

def furnish_bay(F, sig):
    na = None
    if sig == 'a':      # Auftragsbüro: große Wand mit Karte und Listen, zwei Tresen, Stehtische
        F.flat('rh_auftragswand', 'b', 0.0)
        for (y, tag) in ((2.0, 'AUFTRÄGE'), (-2.0, 'MISSIONEN')): inst(module('Tresen ' + tag, n_tresen, tag, 'a', 2.8), F.p(6.1, y), F.a - PI / 2, C_DECK)
        for (side, u, nm) in (('l', 1.75, 'bank'), ('l', 3.75, 'aushang'), ('l', 5.75, 'terminal'), ('l', 7.75, 'schrank'), ('r', 1.75, 'bank'), ('r', 3.75, 'schirm'), ('r', 5.75, 'aushang'), ('r', 7.75, 'feld1')):
            F.dress(nm, side, u)
        F.put('stehtisch', 3.0, 2.7, 0.4); F.put('stehtisch', 3.2, -2.8, 1.9); F.put('saeule', 1.4, 3.7); F.put('rh_kuebel', 7.9, 3.9); F.put('tonne', 7.9, -3.9)
        F.area(4.0, 0, BH - 0.15, 6.0, 5.0, 300, COOL)
    elif sig == 'h':      # Handelskontor: Kurstafel, Tresen Markt und Lager, Regale, Warenproben
        F.flat('rh_preistafel', 'b', 0.0)
        for (y, tag) in ((2.0, 'MARKT'), (-2.0, 'LAGER')): inst(module('Tresen ' + tag, n_tresen, tag, 'h', 2.8), F.p(6.3, y), F.a - PI / 2, C_DECK)
        for side in ('l', 'r'):
            for u in (3.75, 5.75, 7.75): F.dress('regal', side, u)
            F.dress('feldh1', side, 1.75)
        for u in (-3.0, 3.0): F.dress('regal', 'b', u)
        F.put('rh_warenstapel', 3.3, 2.9, 0.2); F.put('rh_waage', 3.0, -3.1, 0.0); F.put('palette', 1.6, -3.6, 0.3); F.put('karre', 4.6, -3.7, 1.4)
        F.area(4.0, 0, BH - 0.15, 6.0, 5.0, 280, (1.0, 0.92, 0.8))
    elif sig == 'w':      # Werft: Bauplanwand, drei Tresen, Triebwerk auf dem Bock, Schiffsholo
        F.flat('rh_bauplanwand', 'b', 0.0)
        for (y, tag) in ((2.7, 'WERFT'), (0.0, 'WERKSTATT'), (-2.7, 'SERVICE')): inst(module('Tresen ' + tag, n_tresen, tag, 'w', 2.4), F.p(6.4, y), F.a - PI / 2, C_DECK)
        for (side, u, nm) in (('l', 1.75, 'werkbank'), ('l', 3.75, 'regal'), ('l', 5.75, 'werkbank'), ('l', 7.75, 'schrank'), ('r', 1.75, 'gitter'), ('r', 3.75, 'werkbank'), ('r', 5.75, 'flaschen'), ('r', 7.75, 'feuer')):
            F.dress(nm, side, u)
        F.put('rh_triebwerk', 3.1, 2.6, 0.0); F.put('rh_schiffsholo', 3.1, -2.4); F.put('trommel', 1.4, 3.6, 0.5); F.put('wagen', 1.5, -3.5, 0.3)
        F.area(4.0, 0, BH - 0.15, 6.0, 5.0, 320, COOL)
    elif sig == 'r':      # Ausrüster: Helmregale, Tresen, Vitrinen
        F.flat('rh_helmregal', 'b', 2.6); F.flat('rh_helmregal', 'b', -2.6)
        inst(module('Tresen AUSRÜSTER', n_tresen, 'AUSRÜSTER', 'r', 3.2), F.p(6.1, 0.0), F.a - PI / 2, C_DECK)
        for (side, u, nm) in (('l', 1.75, 'spind'), ('l', 3.75, 'schrank'), ('l', 5.75, 'regal'), ('l', 7.75, 'spind'), ('r', 1.75, 'schrank'), ('r', 3.75, 'spind'), ('r', 5.75, 'regal'), ('r', 7.75, 'terminal')):
            F.dress(nm, side, u)
        for (x, y, nm) in ((2.4, 2.8, 'rh_vitrine'), (4.4, 2.8, 'rh_vitrine2'), (2.4, -2.8, 'rh_vitrine2'), (4.4, -2.8, 'rh_vitrine')): F.put(nm, x, y, PI / 2)
        F.area(4.0, 0, BH - 0.15, 6.0, 5.0, 300, COOL)
    elif sig == 'k':      # Kantine: Theke mit Hockern, Flaschenwand, Bistrotische
        F.flat('rh_flaschenwand', 'b', 0.0)
        F.put('rh_bar', 6.7, 0.0, -PI / 2)
        for q in range(5): F.put('rh_hocker', 5.75, -2.0 + q * 1.0)
        for (x, y) in ((2.6, 2.5), (2.6, -2.5), (4.3, 3.2)):
            F.put('rh_bistro', x, y)
            for k in range(3): F.put('rh_hocker', x + 0.65 * math.cos(k * 2.1 + 0.4), y + 0.65 * math.sin(k * 2.1 + 0.4))
        for (side, u, nm) in (('l', 1.75, 'bank'), ('l', 3.75, 'pflanzwand'), ('l', 5.75, 'aushang'), ('l', 7.75, 'schrank'), ('r', 1.75, 'bank'), ('r', 3.75, 'theke'), ('r', 5.75, 'pflanzwand'), ('r', 7.75, 'flaschen')):
            F.dress(nm, side, u)
        F.put('rh_kuebel', 1.2, 3.9); F.put('rh_kuebel', 1.2, -3.9)
        F.area(4.0, 0, BH - 0.15, 6.0, 5.0, 220, WARM)
        F.area(6.7, 0, 2.6, 4.5, 0.6, 120, WARM)

def lights():
    prev = CUR[0]; CUR[0] = C_LIGHT
    for k in range(12):
        t = RAD(30 * k + 15)
        x, y = polar(13.0, t); area('Hallenlicht', (x, y, RH_HW + 0.5), (0, 0, t), 2.6, 2.6, 380, COOL)
        x, y = polar(8.6, t); area('Hallenlicht', (x, y, RH_HW + 0.5), (0, 0, t), 2.0, 2.0, 200, COOL)
    for k in range(4): area('Ganglicht', (KX0 + 2 + 4 * k, 0, KH - 0.2), (0, 0, 0), 3.0, 1.0, 220, COOL)
    area('Hangarseite', (KX0 - 7, 0, 7), (0, RAD(-50), 0), 6.0, 6.0, 800, COOL)      # Licht des Hangars auf die Torwand (im Spiel steht dort der Hangar)
    CUR[0] = prev

# ---------- Übersichtsblätter des Baukastens (weit abseits, bei x = 300) ----------
BX0 = 300.0
def sheet():
    prev = CUR[0]; CUR[0] = C_BLATT
    def lab(s_, x, y, size=0.5): text(s_, size, (x, y, 0.005), (0, -1, 0), (1, 0, 0), M['txtw'], align='CENTER')
    box('Blattboden', 80, 160, 0.1, BX0 - 10, 50, -0.05, M['floor2'], 0); box('Blattwand', 0.4, 160, 30, BX0 + 14, 50, 15, M['wall4'], 0)
    # Blatt 1: Bauteile der Halle und des Korridors (Blick nach +x)
    y = 2.0
    def put1(c, w, label, ang=0.0, dx=0.0, sub=None):
        nonlocal y
        yc = y + w / 2; inst(c, (BX0 + dx, yc, 0), ang, C_BLATT); lab(label, BX0 - 2.2, yc)
        if sub: lab(sub, BX0 - 2.9, yc, 0.22)
        y += w + 1.6
    hwb = YP_B + 0.5
    put1(MOD['Portal Bucht'], 2 * hwb, 'PORTAL BUCHT', sub='Rollgitter · Schildkasten')
    put1(prop('rh_pfeiler'), 1.2, 'PFEILER')
    sec = [c for n_, c in MOD.items() if n_.startswith('Wandstück aufzug')][0]
    yc = y + 3.2; inst(sec, (BX0 - R_, yc, 0), 0.0, C_BLATT); lab('WANDSTÜCK', BX0 - 2.2, yc); lab('gebogen · Aufzug', BX0 - 2.9, yc, 0.22); y += 6.4 + 1.6
    yc = y + KW / 2 + 0.6; inst(prop('rh_joch'), (BX0 - 2.0, yc, 0), 0.0, C_BLATT); inst(MOD['Joch oben'], (BX0 - 2.0, yc, 0), 0.0, C_BLATT); lab('KORRIDORJOCH', BX0 - 3.0, yc); y += KW + 2.8
    for nm in ('buchtwand',): yc = y + 1.0; inst(dress(nm), (BX0 - 1.7, yc, 0), PI, C_BLATT); lab('BUCHTWAND', BX0 - 2.2, yc); y += 3.6
    SHEET1 = (2.0, y)
    # Blatt 2: Ladenmöbel in drei Reihen (Blick nach +x), Wandteile vor einer Wand
    def row(items, x, gap):
        tot = sum(w for (_, w, _, _) in items) + gap * (len(items) - 1); y = 88.0 - tot / 2
        for (c, w, ang, label) in items:
            yc = y + w / 2; inst(c, (x, yc, 0), ang, C_BLATT); lab(label, x - (1.3 if x < BX0 - 1 else 1.0), yc, 0.2); y += w + gap
        return tot
    back = [(prop('rh_helmregal'), 2.0, 0.0, 'HELMREGAL'), (prop('rh_preistafel'), 3.8, 0.0, 'KURSTAFEL'), (prop('rh_bauplanwand'), 6.2, 0.0, 'BAUPLANWAND'), (prop('rh_flaschenwand'), 6.0, 0.0, 'FLASCHENWAND')]
    t0 = row(back, BX0, 1.2); box('Blattrückwand', 0.2, t0 + 2.0, 4.2, BX0 + 0.1, 88.0, 2.1, M['wall4'], 0)
    mid = [(module('Tresen WERFT', n_tresen, 'WERFT', 'w', 2.4), 2.4, -PI / 2, 'TRESEN'), (prop('rh_bar'), 5.0, -PI / 2, 'THEKE'), (prop('rh_triebwerk'), 2.3, PI / 2, 'TRIEBWERK'),
           (prop('rh_schiffsholo'), 1.8, 0.0, 'SCHIFFSHOLO'), (prop('rh_vitrine'), 0.8, PI / 2, 'VITRINE'), (prop('rh_vitrine2'), 0.8, PI / 2, 'VITRINE')]
    row(mid, BX0 - 3.6, 1.0)
    fr = [(prop('rh_waage'), 1.0, 0.0, 'PRÜFWAAGE'), (prop('rh_warenstapel'), 1.2, PI / 2, 'WARENPROBEN'), (prop('rh_bistro'), 0.9, 0.0, 'BISTROTISCH'), (prop('rh_hocker'), 0.5, 0.0, 'HOCKER'),
          (prop('rh_kuebel'), 1.0, 0.0, 'KÜBEL'), (prop('automat'), 0.9, PI, 'AUTOMAT')]
    row(fr, BX0 - 6.8, 1.0)
    SHEET2 = (88.0 - t0 / 2, 88.0 + t0 / 2)
    li = bpy.data.lights.new('Blattlicht', 'AREA'); li.shape = 'RECTANGLE'; li.size = 30; li.size_y = 130; li.energy = 160000; li.color = (1.0, 0.97, 0.94)
    ob = bpy.data.objects.new('Blattlicht', li); C_BLATT.objects.link(ob); ob.location = (BX0 - 8, 50, 18); ob.rotation_euler = (0, RAD(-25), 0)
    CUR[0] = prev
    return SHEET1, SHEET2

# ---------- Welt, Kameras, Rendern ----------
wd = SC.world or bpy.data.worlds.new('Welt'); SC.world = wd; wd.use_nodes = True
WN = wd.node_tree.nodes; WL = wd.node_tree.links
bg = next((n for n in WN if n.type == 'BACKGROUND'), None) or WN.new('ShaderNodeBackground')
wo = next((n for n in WN if n.type == 'OUTPUT_WORLD'), None) or WN.new('ShaderNodeOutputWorld')
if not bg.outputs[0].links: WL.new(bg.outputs[0], wo.inputs['Surface'])
vn = WN.new('ShaderNodeVolumePrincipled'); vn.inputs['Density'].default_value = 0.0015; vn.inputs['Color'].default_value = (0.75, 0.82, 0.9, 1); vn.inputs['Anisotropy'].default_value = 0.35
def haze(on, ambient=0.0):
    for l in list(wo.inputs['Volume'].links): WL.remove(l)
    if on: WL.new(vn.outputs[0], wo.inputs['Volume'])
    bg.inputs[0].default_value = (0.004 + ambient, 0.005 + ambient, 0.007 + ambient, 1)
CAMS = {}
def cam(name, loc, tgt, lens):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.05; cd.clip_end = 400
    ob = bpy.data.objects.new(name, cd); C_CAM.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); CAMS[name] = ob; return ob
def bay_cam(name, deg, r=6.0, off=0.14, lens=19, tz=2.0, z=1.7, depth=4.6):
    x, y = polar(r, RAD(deg) + off); tx, ty = polar(D0 + depth, RAD(deg)); cam(name, (x, y, z), (tx, ty, tz), lens)
def cameras():
    ob = cam('plan', (-1.0, 0, 90), (-1.0, 0.001, 0), 50); ob.data.type = 'ORTHO'; ob.data.ortho_scale = 67
    cam('vogel', (-30, -34, 34), (-1.0, 1.0, 0), 22)
    cam('gang', (KX0 + 1.6, -1.4, 1.65), (2.0, 0.8, 2.4), 20)
    cam('eingang', (-15.6, 2.2, 1.7), (14.0, -2.5, 3.0), 15)
    cam('treffpunkt', (-7.0, -5.6, 1.7), (3.0, 4.0, 2.6), 17)
    cam('kuppel', (-10.5, 5.5, 1.6), (1.5, -1.5, 7.0), 13)
    cam('aufzug', (1.6, 9.5, 1.65), (0.0, 17.2, 1.7), 20)
    bay_cam('auftraege', 0); bay_cam('handel', 60); bay_cam('werft', 120); bay_cam('kantine', -120); bay_cam('ausruester', -60)
    F = Frame(120, D0); cam('werft_innen', F.p(1.0, -3.7, 1.65), F.p(6.6, 1.2, 1.5), 17)
    F = Frame(-120, D0); cam('kantine_innen', F.p(1.0, 3.8, 1.65), F.p(7.2, -1.4, 1.6), 17)
    F = Frame(0, D0); cam('auftraege_innen', F.p(1.4, -3.6, 1.65), F.p(8.0, 1.0, 2.3), 17)
    def wc(deg, x, y, z):
        v = Matrix.Rotation(RAD(deg), 3, 'Z') @ Vector((x, y, z)); return tuple(v)
    cam('besprechung', wc(30, 25.7, 4.8, 1.6), wc(30, 32.6, -1.6, 1.3), 16)
    cam('krankenstation', wc(-30, 25.7, -4.8, 1.6), wc(-30, 32.4, 1.8, 1.0), 16)
    cam('flur', wc(30, 14.2, 1.2, 1.6), wc(30, 27.0, -0.3, 1.3), 18)
    (a1, b1), (a2, b2) = SHEETS
    cam('baukasten1', (BX0 - 28, (a1 + b1) / 2, 7.5), (BX0, (a1 + b1) / 2, 3.0), 24)
    cam('baukasten2', (BX0 - 19, 88.0, 5.6), (BX0 - 3.0, 88.0, 1.4), 26)
VIEWS = ['aufzug', 'baukasten1', 'baukasten2', 'plan', 'vogel', 'gang', 'eingang', 'treffpunkt', 'kuppel', 'auftraege', 'handel', 'werft', 'kantine', 'ausruester', 'werft_innen', 'kantine_innen', 'auftraege_innen', 'flur', 'besprechung', 'krankenstation']
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def cycles(samples=128):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 7), ('volume_bounces', 1), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
def view(name, path, pct=100):
    top = name in ('plan', 'vogel'); blatt = name.startswith('baukasten')
    C_CEIL.hide_render = top; C_BLATT.hide_render = not blatt
    for c in (C_DECK, C_CEIL, C_SIGN, C_LIGHT): c.hide_render = c.hide_render or blatt
    if not blatt:
        for c in (C_DECK, C_SIGN, C_LIGHT): c.hide_render = False
    haze(not (top or blatt), 0.04 if name == 'plan' else 0.012 if top else 0.03 if blatt else 0.0)
    SC.view_settings.exposure = 0.3 if name == 'plan' else 0.4 if top else 0.0 if blatt else 0.45
    SC.camera = CAMS[name]; res = (1400, 1400) if name == 'plan' else (1600, 900)
    SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = pct
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
def tris():
    dg = bpy.context.evaluated_depsgraph_get(); cache = {}; total = 0
    for it in dg.object_instances:
        ob = it.object
        if ob.type not in ('MESH',): continue
        key = ob.original.name
        if key not in cache:
            try: me = ob.to_mesh(); cache[key] = sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
            except Exception: cache[key] = 0
        total += cache[key]
    return {'gesetzt': total, 'einmalig': sum(cache.values())}

assemble(); lights(); SHEETS = sheet(); cameras()
result = {'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'objekte': len(bpy.data.objects)}
