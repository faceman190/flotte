# Deck des Pumpwerks Reifschleier aus dem Eiswerk-Baukasten (24.11.2026). Läuft nach hk_kit.py und ew_kit.py im selben Namensraum (ew_lauf.py).
# 99 Zellen zu 6 m: zwei lange Gänge (Nord und Süd) mit zwei Querverbindungen, dazwischen die große Schmelzhalle. Wer vom Hangar kommt, steht im
# Nordgang und sieht die Schilder aller Räume der Reihe nach; jeder Raum hat eine eigene Aufgabe und eigene Leute.
# Karte: G Gang · g Gang mit Schott · H Tor zum Hangar · . Stationskörper · Großbuchstabe Raumzelle, Kleinbuchstabe mit Tür
#   A Eisannahme (Markt, Lager) · B Probenlabor · L Leitstand mit Fenster in die Halle (Service) · S Schmelzhalle (24 × 18 m, 11,6 m hoch)
#   T Kältekammer (Anzüge, Spinde) · M Messe mit Kombüse (Auskunft, Galaxiekarte) · Q Quartiere · K Gildenkontor (Aufträge, Missionen)
#   V Hydrokultur · U Pumpenraum (P und H sind im Hütten-Baukasten Tore)
# Ausgabe: asset-src/data/deck_pumpwerk.json und lm2_pumpwerk.json (Teile für ../bastion/lm2_raum.py).
import json
NUR_HELFER = True
exec(compile(open(os.path.join(HERE, '..', 'huette', 'hk_plan.py'), encoding='utf-8').read(), 'hk_plan.py', 'exec'))
KARTE = [
    '...AAAA..BBB....',
    '...AaAA..BbB....',
    'HGGGGGGgGGGGGGG.',
    '.G.LlSsSSGMMM...',
    '.G.LLSSSSGmMM...',
    '.G.TtSsSsGMMM...',
    '.GGGGGgGGGGGGGG.',
    '..QqQ.KkKVvV.UuU',
    '..QQQ.KKKVVV.UUU',
]
NAMES = {'A': 'EISANNAHME', 'B': 'PROBENLABOR', 'L': 'LEITSTAND', 'S': 'SCHMELZHALLE', 'T': 'KÄLTEKAMMER', 'M': 'MESSE', 'Q': 'QUARTIERE',
         'K': 'GILDENKONTOR', 'V': 'HYDROKULTUR', 'U': 'PUMPENRAUM', 'H': 'HANGAR', '.': 'HANGAR'}
ORT = {'A': 'Eisannahme', 'B': 'Probenlabor', 'L': 'Leitstand', 'S': 'Schmelzhalle', 'T': 'Kältekammer', 'M': 'Messe', 'Q': 'Quartiere', 'K': 'Gildenkontor',
       'V': 'Hydrokultur', 'U': 'Pumpenraum', 'G': 'Pumpwerk', 'H': 'Pumpwerk'}
TEIL = {'A': 'annahme', 'B': 'labor', 'L': 'leitstand', 'S': 'halle', 'T': 'kaelte', 'M': 'messe', 'Q': 'quartiere', 'K': 'kontor', 'V': 'hydro', 'U': 'pumpen'}
OFFEN = 'H'
HALLE = 'S'
def kat(r, c): return KARTE[r][c] if 0 <= r < len(KARTE) and 0 <= c < len(KARTE[0]) else '.'
def plan_setzen(karte):
    global KARTE, PLAN, DOORS, BULK, ROOM
    KARTE = karte; PLAN = [''.join('G' if ch == 'g' else ch.upper() for ch in row) for row in KARTE]; DOORS = set(); BULK = set(); ROOM = {}
    for r, row in enumerate(KARTE):
        for c, ch in enumerate(row):
            if ch == 'g': BULK.add((r, c, 3) if (kat(r, c - 1) in 'GgH' and kat(r, c + 1) in 'GgH') else (r, c, 2))
            elif ch.islower():
                for (dr, dc) in DIRS:
                    if kat(r + dr, c + dc) in 'GgH': DOORS.add(frozenset(((r + dr, c + dc), (r, c))))
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch in '.GH' or (r, c) in ROOM: continue
            cells = [(r, c)]; seen = {(r, c)}
            for (a, b) in cells:
                for (dr, dc) in DIRS:
                    p = (a + dr, b + dc)
                    if p not in seen and at(*p) == ch: seen.add(p); cells.append(p)
            box_ = (min(a for a, b in cells), max(a for a, b in cells), min(b for a, b in cells), max(b for a, b in cells))
            for p in cells: ROOM[p] = box_
plan_setzen(KARTE)
# Fenster zwischen Leitstand und Halle: an beiden Seiten der Grenze eine Fensterwand (Doppelscheibe in 1,4 m Wand)
FENSTER = set()
for r, row in enumerate(PLAN):
    for c, ch in enumerate(row):
        if ch == 'L' and at(r, c + 1) == 'S': FENSTER.add(((r, c), (r, c + 1)))
states_h = states
def states(r, c):
    st = states_h(r, c)
    if ((r, c), (r, c + 1)) in FENSTER and st[1] == 'W': st[1] = 'F'
    if ((r, c - 1), (r, c)) in FENSTER and st[3] == 'W': st[3] = 'F'
    return st
def pr(a, b): return [(a, -1.55), (b, 1.55)]
GANG_POOL = ['platte'] * 4 + ['isolier'] * 3 + ['welle'] * 2 + ['ventile'] * 2 + ['luke', 'schalt', 'loesch', 'gas', 'aushang', 'bank', 'pegel', 'kuehl']
def choose(ch, r, c, k):
    R = random.Random(r * 131 + c * 17 + k * 7 + 5)
    if ch in 'GH': return pr(R.choice(GANG_POOL), R.choice(GANG_POOL))
    r0, r1, c0, c1 = ROOM[(r, c)]; i = (c - c0) if k in (0, 2) else (r - r0)
    if ch == 'A':      # Eisannahme: Förderbänder durch die Nordwand (das Eis kommt von den Schleppern draußen), Kanister und Schränke
        if k == 0: return [pr('foerder', 'foerder'), pr('foerder', 'isolier'), pr('aushang', 'schalt'), pr('terminal', 'platte')][i]
        if k == 3: return pr('kuehl', 'gas') if i == 0 else pr('loesch', 'isolier')
        if k == 1: return pr('pegel', 'schalt') if i == 0 else pr('ventile', 'bank')
        return [pr('isolier', 'aushang'), pr('platte', 'platte'), pr('platte', 'platte'), pr('spinde', 'bank')][i]
    if ch == 'B':      # Probenlabor
        if k == 0: return [pr('labor', 'labor'), pr('pegel', 'labor'), pr('kuehl', 'schalt')][i]
        if k == 3: return pr('schalt', 'aushang') if i == 0 else pr('labor', 'loesch')
        if k == 1: return pr('isolier', 'terminal') if i == 0 else pr('gas', 'platte')
        return [pr('platte', 'schichtplan'), pr('platte', 'platte'), pr('spinde', 'bank')][i]
    if ch == 'L':      # Leitstand: Schaltwände, Terminals, Schichtplan
        if k == 0: return [pr('schalt', 'terminal'), pr('platte', 'platte')][i]
        if k == 3: return pr('terminal', 'schichtplan') if i == 0 else pr('schalt', 'loesch')
        return [pr('pegel', 'schalt'), pr('ventile', 'bank')][i]
    if ch == 'S':      # Schmelzhalle: Pumpen, Ventile, Kühler, Pegel an den Wänden
        if k == 0: return [pr('pumpe', 'ventile'), pr('platte', 'platte'), pr('kuehl', 'isolier'), pr('pegel', 'ventile')][i]
        if k == 2: return [pr('kuehl', 'pumpe'), pr('platte', 'platte'), pr('ventile', 'pegel'), pr('platte', 'platte')][i]
        if k == 1: return [pr('pumpe', 'kuehl'), pr('schalt', 'ventile'), pr('platte', 'platte')][i]
        return [pr('isolier', 'isolier'), pr('isolier', 'isolier'), pr('ventile', 'kuehl')][i]
    if ch == 'T': return pr('anzuege', 'anzuege') if k in (0, 2) and i != 1 else pr('spinde', 'bank')
    if ch == 'M':      # Messe: Kombüse im Osten, Schichtplan, Bänke
        if k == 1: return [pr('kombuese', 'kombuese'), pr('kombuese', 'theke'), pr('bank', 'loesch')][i]
        if k == 0: return [pr('schichtplan', 'aushang'), pr('bank', 'bank'), pr('isolier', 'platte')][i]
        if k == 2: return [pr('bank', 'aushang'), pr('hydro', 'bank'), pr('spinde', 'platte')][i]
        return [pr('aushang', 'bank'), pr('platte', 'platte'), pr('bank', 'terminal')][i]
    if ch == 'Q': return pr('kojen', 'kojen') if (k != 1 or i == 1) else pr('spinde', 'kojen')
    if ch == 'K':      # Gildenkontor: Tafel des Pumpwerks im Westen
        if k == 3: return pr('tafel_pw', 'aushang') if i == 0 else pr('spinde', 'platte')
        if k == 2: return [pr('schalt', 'platte'), pr('aushang', 'schichtplan'), pr('gas', 'loesch')][i]
        if k == 1: return pr('terminal', 'platte') if i == 0 else pr('pegel', 'bank')
        return [pr('platte', 'aushang'), pr('platte', 'platte'), pr('luke', 'terminal')][i]
    if ch == 'V':      # Hydrokultur: Regale an allen Wänden
        if k == 0: return [pr('hydro', 'hydro'), pr('platte', 'platte'), pr('hydro', 'hydro')][i]
        return pr('hydro', 'hydro') if not (k == 1 and i == 1) else pr('kuehl', 'ventile')
    if ch == 'U':      # Pumpenraum (nicht P: das ist im Hütten-Baukasten das Tor zur Ofenhalle)
        if k == 0: return [pr('pumpe', 'pumpe'), pr('platte', 'platte'), pr('ventile', 'pegel')][i]
        if k == 2: return [pr('kuehl', 'ventile'), pr('pumpe', 'schalt'), pr('kuehl', 'gas')][i]
        return pr('ventile', 'pumpe') if i == 0 else pr('schalt', 'loesch')
    return pr('platte', 'welle')

WARMRAUM = 'MQ'      # Messe und Quartiere: Hüllen mit warmem Licht (Lampen und Wandleuchten), sonst kaltes Hallenlicht
def shell_warm(kind, st):
    global SODIUM
    key = 'warm ' + kind + ' ' + ''.join(st)
    if key not in SHELLS:
        keep = (SODIUM, M['e_sod'], M['e_sod2'])
        SODIUM = WARM; M['e_sod'] = M['e_warmlampe']; M['e_sod2'] = M['e_warm2']
        cm = bpy.data.collections.new('Huelle ' + key); cd = bpy.data.collections.new('Decke ' + key); SHELLS[key] = (cm, cd); prev = CUR[0]
        try: build_raum(st, cm, cd)
        finally: CUR[0] = prev; SODIUM, M['e_sod'], M['e_sod2'] = keep
    return SHELLS[key]
def assemble_ew():      # wie hk_plan.assemble, aber ohne Raumdecke über der Halle (die Halle bringt ihre eigene, 11,6 m hoch) und mit warmen Räumen
    n = 0
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch == '.': continue
            st = states(r, c); cm, cd = shell_warm('raum', st) if ch in WARMRAUM else shell('gang' if ch in 'GH' else 'raum', st); loc = cellpos(r, c)
            inst(cm, loc, 0, C_DECK)
            if ch != HALLE: inst(cd, loc, 0, C_CEIL)
            n += 1
            for k in range(4):
                if st[k] == 'W':
                    for (name, b) in choose(ch, r, c, k): inst(dress(name), loc + Matrix.Rotation(ANG[k], 3, 'Z') @ Vector((0, b, 0)), ANG[k], C_DECK)
                elif st[k] == 'D': sign(NAMES.get(at(r + DIRS[k][0], c + DIRS[k][1]), ''), k, loc)
                elif st[k] == 'C': sign(NAMES.get(ch, ''), k, loc)
    return n

# ---------- Angaben für das Spiel (Plankoordinaten: x nach Osten, y nach Norden, Zellmitte = Spalte · 6, −Zeile · 6) ----------
SPOTS = []
def staff(tab, x, y, face, tx, ty): SPOTS.append({'tab': tab, 'x': x, 'y': y, 'face': face, 'tx': tx, 'ty': ty})
def meister(tab, x, y, face, tx, ty, titel, satz): SPOTS.append({'tab': tab, 'x': x, 'y': y, 'face': face, 'tx': tx, 'ty': ty, 'titel': titel, 'satz': satz})
def Z(r, c, dx=0.0, dy=0.0): return [c * CELL + dx, -r * CELL + dy]
def stop(x, y, face, t, p, who=None): return [x, y, {'face': face, 't': t, 'p': p, 'who': who}]
def hin_und_her(n): return n + n[-2:0:-1]
ROUTES = [
    # Eisannahme (Markt) ↔ Messe: Nordgang, Querverbindung Ost
    hin_und_her([stop(30.0, -1.6, 90, [7, 14], 0.9, 'markt'), [27.0, -5.0], [24.0, -8.6], Z(2, 4, 0, -0.6), Z(2, 6, 0, -0.6), Z(2, 8, 0, -0.6), Z(2, 9, -0.6, -0.6),
                 Z(3, 9, -0.6), Z(4, 9, -0.6), [58.6, -24.0], [62.0, -24.0], stop(64.0, -27.6, -90, [8, 16], 0.9)]),
    # Runde: Nordgang – Westgang – Südgang – Querverbindung Ost, mit Halt vor der Halle
    [Z(2, 1, 0.6, 0.6), Z(3, 1, 0.6), Z(4, 1, 0.6), Z(5, 1, 0.6), Z(6, 1, 0.6, -0.6), Z(6, 3, 0, -0.6), Z(6, 5, 0, -0.6), stop(36.0, -36.6, 90, [5, 10], 0.4), Z(6, 7, 0, -0.6),
     Z(6, 9, 0.6, -0.6), Z(5, 9, 0.6), Z(4, 9, 0.6), Z(3, 9, 0.6), Z(2, 9, 0.6, 0.6), Z(2, 7, 0, 0.6), stop(36.0, -11.4, -90, [4, 9], 0.4), Z(2, 4, 0, 0.6), Z(2, 2, 0, 0.6)],
    # Leitstand (Service) ↔ Gildenkontor (Aufträge): Westgang
    hin_und_her([stop(20.4, -24.0, 0, [6, 12], 0.9, 'service'), [22.0, -19.0], [24.0, -16.4], Z(2, 4, 0, -0.6), Z(2, 2, 0, -0.6), Z(2, 1, 0.6, -0.6), Z(3, 1, 0.6), Z(4, 1, 0.6),
                 Z(5, 1, 0.6), Z(6, 1, 0.6, 0.4), Z(6, 3, 0, 0.4), Z(6, 5, 0, 0.4), Z(6, 7, 0, 0.4), [42.0, -40.6], [40.0, -44.0], stop(38.0, -46.0, 180, [7, 14], 0.9, 'auftraege')]),
    # Hydrokultur ↔ Pumpenraum: Südgang Ost
    hin_und_her([stop(56.0, -46.0, 180, [10, 18], 0.9), [60.0, -42.0], [60.0, -39.4], Z(6, 10, 0, -0.4), Z(6, 12, 0, -0.4), Z(6, 14, 0, -0.4), [84.0, -39.4], [84.0, -43.0],
                 stop(88.0, -45.0, 0, [8, 14], 0.9)]),
    # Quartiere ↔ Halle (durch die Südtür) ↔ Messe
    hin_und_her([stop(14.0, -45.0, 180, [10, 20], 0.9), [18.0, -42.0], [18.0, -39.4], Z(6, 3, 0, 0.2), Z(6, 5, 0, 0.2), Z(6, 6, 0, 0.2), [36.0, -32.6], [36.0, -30.6], [44.0, -30.8],
                 [49.4, -30.0], [52.0, -30.0], Z(5, 9, 0, 0), Z(4, 9, 0.4, 0), [58.6, -24.0], [66.0, -20.0], stop(68.0, -18.5, 90, [8, 16], 0.9)]),
    # Labor ↔ Eisannahme (Proben holen)
    hin_und_her([stop(58.0, -3.4, 90, [8, 14], 0.9), [60.0, -6.0], [60.0, -8.6], Z(2, 10, 0, -0.2), Z(2, 8, 0, -0.2), Z(2, 6, 0, -0.2), Z(2, 4, 0, -0.2), [24.0, -8.6], [20.0, -5.0],
                 stop(18.0, -4.0, 90, [6, 12], 0.9)]),
]
CHATS = [[68.6, -28.6, 3], [20.0, -6.0, 2], [46.0, -31.0, 2], [63.0, -46.6, 2]]
KARTE_XY = [70.6, -30.0]      # Galaxiekarte (Kartentisch in der Messe, Südostecke)
MASSE = {'wand': W, 'tuer': 1.45, 'tuerSicht': 1.9, 'schott': [1.7, 0.25], 'eck': W - 0.05, 'decke': [HB - 0.4, RB - 1.4], 'spot': [HB - 0.6, 11.0], 'weg': 1.5}
def furnish():
    # Eisannahme (Zeilen 0–1, Spalten 3–6; Wände x 15,7 … 38,3, y 2,3 … −8,3): Förderbänder an der Nordwand, Tresen in der Osthälfte
    for (tab, x) in (('markt', 30.0), ('lager', 34.6)): put('tresen_pw_' + tab, x, 0.2, 0.0); staff(tab, x, 1.2, -90, x, -1.4)
    put('eisblock', 17.4, -6.4, 0.08); put('eisblock', 19.2, -6.6, -0.12); put('eiswagen', 22.2, -3.4, 0.3); put('eisblock', 36.6, -6.8, 0.2); put('kanister', 37.2, -3.6, PI / 2)
    put('absperrung', 26.4, -3.0, 0.1); put('heizer', 28.6, -7.4, 0.0)
    meister('eisrufer', 21.0, -1.6, -90, 21.0, -3.4, 'Annahmemeister', 'Zwei Schlepper sind noch draußen im Feld. Wenn du Eis bringst: aufs Band damit, ich wiege nach.')
    # Probenlabor (Zeilen 0–1, Spalten 9–11; x 51,7 … 68,3)
    put('kanister', 66.6, -6.6, PI / 2); put('heizer', 53.4, -7.2, 0.4); put('teilekisten', 64.0, -7.0, 0.0)
    meister('laborantin', 58.0, -2.0, 90, 58.0, -3.8, 'Laborantin', 'Probe 14 hat Spuren von Ferrit. Das Feld ist sauberer als sein Ruf, aber nicht ganz sauber.')
    # Leitstand (Zeilen 3–4, Spalten 3–4; x 15,7 … 26,3, y −15,7 … −26,3): Leitpulte vor dem Hallenfenster, Service-Tresen im Westen
    for r_ in (3, 4):
        for b in (-1.55, 1.55): inst(dress('leitpult'), cellpos(r_, 4) + Matrix.Rotation(ANG[1], 3, 'Z') @ Vector((0, b, 0)), ANG[1], C_DECK)
    put('tresen_pw_service', 19.0, -24.0, PI / 2); staff('service', 17.9, -24.0, 0, 20.4, -24.0)
    meister('schmelzmeisterin', 23.4, -18.6, 0, 22.0, -18.6, 'Schmelzmeisterin', 'Kessel eins läuft bei vier Grad. Wärmer wird es hier drin nicht, aber das Wasser ist das sauberste im Sektor.')
    put('pult', 18.4, -17.4, 0.4)
    # Schmelzhalle (Zeilen 3–5, Spalten 5–8; Mitte 39, −24): Kessel, Hallendach, Wagen und Paletten
    inst(dress('halle_oben'), (39.0, -24.0, 0), 0.0, C_DECK); put('kessel', 39.0, -24.0, 0.0)
    put('eiswagen', 30.2, -18.0, 0.6); put('eisblock', 48.2, -17.6, 0.1); put('kanister', 48.6, -30.8, 0.0); put('heizer', 29.6, -30.6, 0.3); put('teilekisten', 30.4, -26.0, PI / 2)
    meister('kesselwart', 47.4, -21.0, 180, 45.6, -21.0, 'Kesselwart', 'Nicht auf den Steg ohne Anzug. Oben steht der Dampf, und der friert dir an den Wimpern fest.')
    # Kältekammer (Zeile 5, Spalten 3–4)
    put('heizer', 18.0, -30.6, 0.0)
    # Messe (Zeilen 3–5, Spalten 10–12; x 57,7 … 74,3): Tische, Sofa, Kombüse im Osten, Galaxiekarte und Auskunft im Südosten
    for (x, y) in ((62.0, -19.0), (62.0, -24.0), (67.0, -21.4)): put('messe_tisch', x, y, 0.0)
    put('sofa', 62.6, -30.4, PI); put('kartentisch', KARTE_XY[0], KARTE_XY[1])
    staff('info', 73.0, -26.4, 180, 71.2, -26.4)
    meister('koch', 72.6, -18.4, 180, 70.8, -18.4, 'Koch', 'Suppe aus Eiswasser und Kräutern aus der Hydrokultur. Klingt nach wenig, wärmt aber bis in die Stiefel.')
    # Quartiere (Zeilen 7–8, Spalten 2–4; x 9,7 … 26,3, y −39,7 … −50,3)
    for x in (12.0, 16.0, 20.0): put('koje_schrank', x, -40.4, PI)
    put('heizer', 24.6, -48.4, 0.6); put('teilekisten', 11.2, -49.0, 0.0)
    # Gildenkontor (Zeilen 7–8, Spalten 6–8; x 33,7 … 50,3): Tresen der Aufträge vor der Tafel, Tisch der Missionen
    put('tresen_pw_auftraege', 36.0, -46.0, PI / 2); staff('auftraege', 34.9, -46.0, 0, 38.0, -46.0)
    put('tisch', 43.0, -46.6, 0.0); staff('missionen', 47.4, -44.6, 180, 45.8, -44.6); put('kanister', 49.0, -49.0, PI / 2)
    # Hydrokultur (Zeilen 7–8, Spalten 9–11; x 51,7 … 68,3)
    for (x, y) in ((56.0, -45.0), (60.0, -48.0), (64.0, -45.0)): put('pflanztisch', x, y, 0.0 if x != 60.0 else PI / 2)
    meister('gaertner', 60.0, -43.0, 90, 60.0, -41.6, 'Gärtner', 'Das Schmelzwasser aus Kessel eins geht zuerst hierher. Was hier wächst, isst die ganze Hütte.')
    # Pumpenraum (Zeilen 7–8, Spalten 13–15; x 75,7 … 92,3)
    put('pumpenblock', 80.0, -46.0, 0.0); put('pumpenblock', 88.0, -46.0, 0.0); put('tank', 78.0, -41.4, 0.0); put('tank', 90.0, -41.4, 0.0); put('teilekisten', 84.0, -49.4, 0.0)
    meister('pumpenmeister', 84.0, -44.0, -90, 84.0, -42.2, 'Pumpenmeister', 'Pumpe drei klemmt wieder. Wenn du irgendwo Dichtungen findest, bring sie mir, ich zahle gut.')
    # Gänge
    put('eiswagen', 7.4, -21.0, 0.0); put('kanister', 4.4, -31.6, 0.0); put('teilekisten', 55.6, -21.6, PI / 2); put('heizer', 52.4, -27.6, 0.0); put('absperrung', 31.2, -14.1, 0.0)
    put('eisblock', 81.6, -13.8, 0.2); put('teilekisten', 66.0, -38.4, 0.0)
    put('schleuse', 0.0, -12.0, 0.0)
def cameras():
    w, h = len(PLAN[0]) * CELL, len(PLAN) * CELL
    ocam('Plan', (w / 2 - 3, -h / 2 + 3, 90), (w / 2 - 3, -h / 2 + 3.001, 0), max(w, h * 16 / 9) + 3)
    cam('A Nordgang', (6.6, -12.4, 1.7), (60.0, -12.0, 2.4), 20)
    cam('B Halle', (30.0, -31.0, 1.75), (42.0, -20.0, 4.5), 14)
    cam('C Kessel', (48.6, -17.2, 1.7), (38.0, -26.0, 4.0), 14)
    cam('D Leitstand', (17.0, -17.0, 1.75), (36.0, -26.0, 2.2), 16)
    cam('E Annahme', (37.0, -7.4, 1.75), (17.0, 1.4, 1.4), 16)
    cam('F Messe', (59.0, -31.0, 1.75), (72.0, -17.0, 1.6), 16)
    cam('G Hydro', (53.0, -49.0, 1.75), (66.0, -41.0, 1.4), 16)
    cam('H Pumpen', (77.0, -49.0, 1.75), (90.0, -41.0, 1.6), 16)
    cam('I Quartiere', (25.0, -49.4, 1.75), (11.0, -41.0, 1.4), 16)
    cam('J Labor', (67.0, -7.4, 1.75), (53.0, 1.4, 1.6), 16)
    cam('K Suedgang', (7.0, -36.4, 1.7), (84.0, -36.0, 2.0), 20)
def mod_blocks():      # Standflächen je Baustein (wie hk_deck_ek.py): Umriss der Teile zwischen 0,2 und 1,9 m Höhe, aus dem ersten Einsatz
    dg = bpy.context.evaluated_depsgraph_get(); first = {}
    for e in C_DECK.objects:
        if e.type == 'EMPTY' and e.instance_collection and e.instance_collection.name.startswith(('Wand ', 'Objekt ')) and e.instance_collection.name not in first: first[e.instance_collection.name] = e
    box_ = {n: None for n in first}; skip = ('Schablone', 'Schrift', 'Niet', 'Nietreihe', 'Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb', 'Pfeil', 'Ablaufrost', 'Warnring')
    inv = {n: e.matrix_world.inverted() for n, e in first.items()}; byparent = {e.name: n for n, e in first.items()}
    for it in dg.object_instances:
        if not it.is_instance or it.parent is None: continue
        n = byparent.get(it.parent.original.name)
        if not n or n in ('Objekt schleuse', 'Wand halle_oben'): continue
        ob = it.object
        if ob.type != 'MESH' or ob.original.name.split('.')[0] in skip: continue
        T = inv[n] @ it.matrix_world
        pts = [T @ Vector(c) for c in ob.bound_box]
        z0, z1 = min(p.z for p in pts), max(p.z for p in pts)
        if z1 < 0.2 or z0 > 1.9: continue
        xs, ys = [p.x for p in pts], [p.y for p in pts]
        b = box_[n]; nb = [min(xs), max(xs), min(ys), max(ys)]
        box_[n] = nb if b is None else [min(b[0], nb[0]), max(b[1], nb[1]), min(b[2], nb[2]), max(b[3], nb[3])]
    for n, b in box_.items():
        if b and n.startswith('Wand '):
            if b[1] < -W + 0.16: box_[n] = None; continue
            b[0] = -W - 0.02
    return box_
def daten_schreiben():
    blocks = mod_blocks(); order = sorted(blocks); inst_ = []
    for e in C_DECK.objects:
        if e.type != 'EMPTY' or not e.instance_collection or e.instance_collection.name not in blocks: continue
        mw = e.matrix_world; inst_.append([order.index(e.instance_collection.name), round(mw.translation.x, 3), round(mw.translation.y, 3), round(mw.to_euler('XYZ').z, 4), 0, round(mw.translation.z, 3)])
    data = {'cell': CELL, 'karte': KARTE, 'ort': ORT, 'tueren': sorted([sorted(list(d)) for d in DOORS]), 'schotte': sorted(BULK), 'offen': OFFEN,
            'fenster': sorted([[list(a), list(b)] for (a, b) in FENSTER]), 'hoch': {HALLE: 11.6},
            'personal': SPOTS, 'wege': ROUTES, 'gruppen': CHATS, 'karte_xy': KARTE_XY, 'masse': MASSE,
            'mod': [{'n': n, 'o': '', 'block': [round(v, 3) for v in blocks[n]] if blocks[n] else None} for n in order], 'inst': inst_}
    root = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
    open(os.path.join(root, 'asset-src', 'data', 'deck_pumpwerk.json'), 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    # Teile für lm2_raum.py: wie die Bereiche im Spiel (deck.ts, zoneOf): Räume = zusammenhängende Zellen eines Buchstabens, Gänge = Blöcke von 6 × 5 Zellen
    parts = {}
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch == '.': continue
            nm = 'pumpwerk_' + (TEIL[ch] if ch in TEIL else 'gang_%d_%d' % (c // 6, r // 5)); parts.setdefault(nm, []).append([r, c])
    rooms = [{'name': n, 'cells': cs, 'lm': 2048 if len(cs) >= 12 else 1536 if len(cs) >= 6 else 1024} for n, cs in parts.items()]
    json.dump({'rooms': rooms, 'cell': CELL, 'glb': 'Lichtraum2Pumpwerk.glb', 'json': 'lichtraum2_pumpwerk.json', 'mark': 'lm2-pumpwerk.txt', 'vsamples': 96,
               'clamp_direct': 2.0, 'clamp_indirect': 0.5, 'deflicker': 2.5, 'vsmooth': 0.25, 'big': 0.05, 'samples': 192, 'hide_colls': ['Blatt', 'Kameras'], 'spuren': True},
              open(os.path.join(HERE, 'lm2_pumpwerk.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return {'bausteine_mit_flaeche': sum(1 for b in blocks.values() if b), 'einsaetze': len(inst_), 'teile': len(rooms)}
N_CELLS = assemble_ew(); furnish(); cameras(); INFO = daten_schreiben()
result = {'zellen': N_CELLS, 'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'tueren': len(DOORS), 'fenster': len(FENSTER), 'personal': len(SPOTS), **INFO}
