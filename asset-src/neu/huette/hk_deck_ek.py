# Hüttendeck der Eisenkrone aus dem Hütten-Baukasten (seit Alpha 1.34). Läuft nach hk_kit.py im selben Namensraum (hk_deck_lauf.py).
# Ersetzt das Hüttendeck aus dem Bastion-Baukasten (../bastion/bk_deck_ek.py, Alpha 1.22): dieselben Räume und Dienste, im 6-m-Raster.
# Karte: G Gang · g Gang mit Schott · H Tor zum Hangar · . Stationskörper · Großbuchstabe Raumzelle, Kleinbuchstabe mit Tür
#   A Annahme (Raffinerie, Markt, Lager) · E Leitstand mit Fenster in die Ofenhalle (Service) · O Gildenkontor (Aufträge, Missionen)
#   C Kantine (Auskunft, Galaxiekarte) · S Spinde · M Maschinenraum
# Ausgabe: asset-src/data/deck_huette_ek.json (Karte, Türen, Personal, Wege, Maße, Standflächen) und lm2_huette_ek.json (Teile für lm2_raum.py).
import json
NUR_HELFER = True
exec(compile(open(os.path.join(HERE, 'hk_plan.py'), encoding='utf-8').read(), 'hk_plan.py', 'exec'))
KARTE = [
    '..AAA.EEE..',
    '..AaA.EeE..',
    'HGGGGgGGGG.',
    '.G.sSG.mMG.',
    '.G.SSG.MMG.',
    '.GGGGGgGGG.',
    '..OoO..CcC.',
    '..OOO..CCC.',
]
NAMES = {'A': 'ANNAHME · MARKT', 'E': 'LEITSTAND', 'O': 'GILDENKONTOR', 'C': 'KANTINE', 'S': 'SPINDE', 'M': 'MASCHINEN 1', 'H': 'HANGAR', '.': 'HANGAR'}
ORT = {'A': 'Annahme', 'E': 'Leitstand', 'O': 'Gildenkontor', 'C': 'Kantine', 'S': 'Spinde', 'M': 'Maschinenraum', 'G': 'Hüttendeck', 'H': 'Hüttendeck', 'P': 'Hüttendeck'}
TEIL = {'A': 'annahme', 'E': 'leitstand', 'O': 'kontor', 'C': 'kantine', 'S': 'spinde', 'M': 'maschinenraum'}
OFFEN = 'H'
def kat(r, c): return KARTE[r][c] if 0 <= r < len(KARTE) and 0 <= c < len(KARTE[0]) else '.'
def plan_setzen(karte):
    global KARTE, PLAN, DOORS, BULK, ROOM
    KARTE = karte; PLAN = [''.join('G' if ch == 'g' else ch.upper() for ch in row) for row in KARTE]; DOORS = set(); BULK = set(); ROOM = {}
    for r, row in enumerate(KARTE):
        for c, ch in enumerate(row):
            if ch == 'g': BULK.add((r, c, 3) if (kat(r, c - 1) in 'GgHP' and kat(r, c + 1) in 'GgHP') else (r, c, 2))
            elif ch.islower():
                for (dr, dc) in DIRS:
                    if kat(r + dr, c + dc) in 'GgHP': DOORS.add(frozenset(((r + dr, c + dc), (r, c))))
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch in '.GHP' or (r, c) in ROOM: continue
            cells = [(r, c)]; seen = {(r, c)}
            for (a, b) in cells:
                for (dr, dc) in DIRS:
                    p = (a + dr, b + dc)
                    if p not in seen and at(*p) == ch: seen.add(p); cells.append(p)
            box_ = (min(a for a, b in cells), max(a for a, b in cells), min(b for a, b in cells), max(b for a, b in cells))
            for p in cells: ROOM[p] = box_
plan_setzen(KARTE)
states_h = states
def states(r, c):      # die Nordwand des Leitstands ist eine Fensterwand in die Ofenhalle
    st = states_h(r, c)
    if at(r, c) == 'E' and st[0] == 'W': st[0] = 'F'
    return st
def pr(a, b): return [(a, -1.55), (b, 1.55)]
def choose(ch, r, c, k):
    R = random.Random(r * 131 + c * 17 + k * 7)
    if ch in 'GHP':
        pool = ['platte'] * 5 + ['luke'] * 2 + ['welle'] * 3 + ['rohre'] * 2 + ['schalt', 'loesch', 'gas', 'aushang', 'bank', 'kran']
        return pr(R.choice(pool), R.choice(pool))
    r0, r1, c0, c1 = ROOM[(r, c)]; i = (c - c0) if k in (0, 2) else (r - r0)
    if ch == 'A':      # Annahme: hinter den Tresen flache Wände, im Westen die Erzrutschen
        if k == 0: return [pr('schalt', 'aushang'), pr('platte', 'terminal'), pr('gas', 'platte')][i]
        if k == 3: return pr('rutsche', 'rutsche') if i == 0 else pr('luke', 'welle')
        if k == 1: return pr('rohre', 'schalt') if i == 0 else pr('loesch', 'bank')
        return [pr('platte', 'aushang'), pr('platte', 'platte'), pr('spinde', 'bank')][i]
    if ch == 'E':      # Leitstand: Schaltwände an den Seiten, Rohre an der Türwand
        if k == 1: return pr('schalt', 'terminal') if i == 0 else pr('schalt', 'gas')
        if k == 3: return pr('terminal', 'aushang') if i == 0 else pr('platte', 'loesch')
        return [pr('rohre', 'platte'), pr('platte', 'platte'), pr('spinde', 'bank')][i]
    if ch == 'O':      # Gildenkontor: Tafel der Gilde im Westen, davor das Pult der Aufträge
        if k == 3: return pr('tafel', 'aushang') if i == 0 else pr('spinde', 'platte')
        if k == 2: return [pr('schalt', 'platte'), pr('aushang', 'welle'), pr('gas', 'loesch')][i]
        if k == 1: return pr('terminal', 'platte') if i == 0 else pr('rohre', 'bank')
        return [pr('platte', 'aushang'), pr('platte', 'platte'), pr('luke', 'terminal')][i]
    if ch == 'C':      # Kantine: Ausgabe im Westen, Bänke an den Wänden
        if k == 3: return pr('theke', 'theke') if i == 0 else pr('bank', 'aushang')
        if k == 1: return pr('loesch', 'platte') if i == 0 else pr('bank', 'bank')
        if k == 2: return [pr('bank', 'aushang'), pr('welle', 'bank'), pr('spinde', 'platte')][i]
        return [pr('aushang', 'platte'), pr('platte', 'platte'), pr('platte', 'terminal')][i]
    if ch == 'S': return pr('spinde', 'bank' if (k == 1 and i == 0) else 'spinde')
    if ch == 'M':
        if k == 0: return pr('rohre', 'rohre') if i == 1 else pr('platte', 'platte')
        if k == 1: return pr('schalt', 'schalt')
        if k == 2: return pr('gas', 'rohre')
        return pr('luke', 'welle')
    return pr('platte', 'welle')

# ---------- Angaben für das Spiel (Plankoordinaten: x nach Osten, y nach Norden, Zellmitte = Spalte · 6, −Zeile · 6) ----------
SPOTS = []
def staff(tab, x, y, face, tx, ty): SPOTS.append({'tab': tab, 'x': x, 'y': y, 'face': face, 'tx': tx, 'ty': ty})
def meister(tab, x, y, face, tx, ty, titel, satz): SPOTS.append({'tab': tab, 'x': x, 'y': y, 'face': face, 'tx': tx, 'ty': ty, 'titel': titel, 'satz': satz})
def Z(r, c, dx=0.0, dy=0.0): return [c * CELL + dx, -r * CELL + dy]
def stop(x, y, face, t, p, who=None): return [x, y, {'face': face, 't': t, 'p': p, 'who': who}]
def hin_und_her(n): return n + n[-2:0:-1]
ROUTES = [
    # Annahme (Markt) ↔ Kantine: durch beide Schotte
    hin_und_her([stop(18.0, -1.5, 90, [7, 14], 0.9, 'markt'), [18.0, -6.0], [18.0, -9.6], Z(2, 3, 0, -0.6), Z(2, 4, 0, -0.6), Z(2, 5, -0.6, -0.6), Z(3, 5, -0.6), Z(4, 5, -0.6), Z(5, 5, -0.6, 0.6),
                 Z(5, 6, 0, 0.6), Z(5, 7, 0, 0.6), Z(5, 8, 0, 0.6), [48.0, -33.0], [48.0, -36.0], stop(46.0, -38.6, -90, [8, 16], 0.9)]),
    # Runde über die Außengänge, mit Halt vor dem Leitstand
    [Z(2, 1, 0.6, 0.6), Z(3, 1, 0.6), Z(4, 1, 0.6), Z(5, 1, 0.6, -0.6), Z(5, 3, 0, -0.6), Z(5, 5, 0, -0.6), Z(5, 7, 0, -0.6), Z(5, 9, -0.6, -0.6), Z(4, 9, -0.6), Z(3, 9, -0.6),
     Z(2, 9, -0.6, 0.6), stop(42.0, -10.3, 90, [5, 10], 0.4), Z(2, 6, 0, 0.6), Z(2, 3, 0, 0.6)],
    # Leitstand (Service) ↔ Gildenkontor (Aufträge)
    hin_und_her([stop(45.6, -3.0, 0, [6, 12], 0.9, 'service'), [42.0, -6.0], [42.0, -9.6], Z(2, 7, 0, -0.6), Z(2, 6, 0, -0.6), Z(2, 5, 0.6, -0.6), Z(3, 5, 0.6), Z(4, 5, 0.6), Z(5, 5, 0.6, 0.4),
                 Z(5, 4, 0, 0.4), Z(5, 3, 0, 0.4), [18.0, -33.0], [18.0, -35.6], stop(13.8, -37.0, 180, [7, 14], 0.9, 'auftraege')]),
]
CHATS = [[51.0, -39.6, 3], [22.6, -4.8, 2]]
KARTE_XY = [52.6, -40.6]      # Galaxiekarte (Kartentisch in der Kantine)
MASSE = {'wand': W, 'tuer': 1.45, 'tuerSicht': 1.9, 'schott': [1.7, 0.25], 'eck': W - 0.05, 'decke': [HB - 0.4, RB - 1.4], 'spot': [HB - 0.6, 11.0], 'weg': 1.5}
def furnish():
    # Annahme (Zeilen 0–1, Spalten 2–4; Wände x 9,7 … 26,3, y 2,3 … −8,3): drei Tresen vor der Nordwand, Loren unter den Erzrutschen
    for (tab, x) in (('raffinerie', 14.0), ('markt', 18.0), ('lager', 22.0)): put('tresen_' + tab, x, 0.3, 0.0); staff(tab, x, 1.3, -90, x, -1.3)
    put('lore', 11.2, 1.5, PI / 2); put('lore', 11.2, -1.6, PI / 2 + 0.04); put('barren', 24.6, -4.6, 0.1); put('barren', 24.4, -6.6, -0.08); put('saecke', 11.4, -6.6, 0.05)
    put('tiegel', 13.6, -4.4); put('kiste', 24.8, -2.6, PI / 2); put('absperrung', 21.4, -5.6, 0.2)
    # Leitstand (Zeilen 0–1, Spalten 6–8; Wände x 33,7 … 50,3): Leitpulte vor dem Hallenfenster, Service-Tresen im Osten, der Schmelzmeister am Fenster
    for (x, b) in ((36.0, -1.55), (36.0, 1.55), (48.0, -1.55), (48.0, 1.55)): inst(dress('leitpult'), Vector((x, 0.0, 0)) + Matrix.Rotation(ANG[0], 3, 'Z') @ Vector((0, b, 0)), ANG[0], C_DECK)
    inst(module('Halle Ofen', d_ofenhalle), cellpos(0, 7), ANG[0], C_DECK)
    put('tresen_service', 47.6, -3.0, -PI / 2); staff('service', 48.7, -3.0, 180, 45.9, -3.0)
    meister('schmelzer', 42.0, 0.9, 90, 42.0, -0.7, 'Schmelzmeister', 'Trommel zwei läuft heiß. Fass nichts an, was glüht, und stell dich nicht unter die Pfanne.')
    put('pult', 40.2, -5.8, 0.6); put('fass', 34.6, -7.4); put('kiste', 49.2, -7.4, 0.0)
    # Spinde (Zeilen 3–4, Spalten 3–4)
    put('fass', 25.4, -25.2)
    # Maschinenraum (Zeilen 3–4, Spalten 7–8)
    put('gaswagen', 46.8, -25.4, 0.6); put('fass', 49.3, -16.9); put('fass', 49.6, -17.7); put('absperrung', 44.0, -22.0, 0.0)
    # Gildenkontor (Zeilen 6–7, Spalten 2–4; Wände x 9,7 … 26,3, y −33,7 … −44,3): Pult der Aufträge vor der Tafel, Tisch der Missionen
    put('pult', 12.3, -37.4, 0.0); staff('auftraege', 11.0, -37.4, 0, 13.8, -37.4)
    put('tisch', 19.0, -40.6, 0.0); staff('missionen', 23.4, -38.6, 180, 21.8, -38.6); put('kiste', 25.0, -43.0, 0.0); put('fass', 10.6, -43.2)
    # Kantine (Zeilen 6–7, Spalten 7–9; Wände x 39,7 … 56,3): Tische, Galaxiekarte und Auskunft im Osten
    put('tisch', 44.6, -38.6, 0.0); put('tisch', 44.6, -42.2, 0.0); put('tisch', 48.6, -42.2, 0.0); put('kartentisch', KARTE_XY[0], KARTE_XY[1])
    staff('info', 55.0, -38.2, -124, 53.6, -38.6)
    # Gänge
    put('lore', 7.4, -21.0, 0.0); put('fass', 4.3, -31.6); put('kiste', 31.6, -21.8, PI / 2); put('fass', 55.6, -16.2); put('gaswagen', 52.6, -26.0, 2.2)
    put('kiste', 30.4, -13.9, 0.0); put('absperrung', 25.2, -14.1, 0.0)
    put('schleuse', 0.0, -12.0, 0.0)
def cameras():
    w, h = len(PLAN[0]) * CELL, len(PLAN) * CELL
    ocam('Plan', (w / 2 - 3, -h / 2 + 3, 90), (w / 2 - 3, -h / 2 + 3.001, 0), max(w, h * 16 / 9) + 3)
    cam('A Hangartor', (6.6, -12.4, 1.7), (40.0, -12.0, 2.2), 20)
    cam('B Annahme', (25.4, -7.4, 1.75), (12.0, 1.6, 2.0), 16)
    cam('C Leitstand', (48.6, -7.4, 1.75), (38.0, 2.0, 1.8), 16)
    cam('D Ofenblick', (42.2, -2.4, 1.7), (42.0, 20.0, -1.0), 16)
    cam('E Kontor', (24.8, -34.8, 1.75), (10.4, -41.6, 1.6), 16)
    cam('F Kantine', (41.0, -35.4, 1.75), (55.0, -42.0, 1.4), 16)
    cam('G Schleuse', (-10.0, -10.6, 1.7), (0.0, -12.0, 2.1), 22)
    cam('H Suedgang', (6.6, -30.4, 1.7), (55.0, -30.0, 2.0), 20)
def mod_blocks():      # Standflächen je Baustein (Lage im Baustein): Umriss der Teile zwischen 0,2 und 1,9 m Höhe, aus dem ersten Einsatz
    dg = bpy.context.evaluated_depsgraph_get(); first = {}
    for e in C_DECK.objects:
        if e.type == 'EMPTY' and e.instance_collection and e.instance_collection.name.startswith(('Wand ', 'Objekt ')) and e.instance_collection.name not in first: first[e.instance_collection.name] = e
    box_ = {n: None for n in first}; skip = ('Schablone', 'Schrift', 'Niet', 'Nietreihe', 'Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb', 'Pfeil')
    inv = {n: e.matrix_world.inverted() for n, e in first.items()}; byparent = {e.name: n for n, e in first.items()}
    for it in dg.object_instances:
        if not it.is_instance or it.parent is None: continue
        n = byparent.get(it.parent.original.name)
        if not n or n == 'Objekt schleuse': continue
        ob = it.object
        if ob.type != 'MESH' or ob.original.name.split('.')[0] in skip: continue      # Kurven und Schrift erscheinen zusätzlich mit einem Standardkasten von 2 m: nur die ausgewerteten Netze zählen
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
            'personal': SPOTS, 'wege': ROUTES, 'gruppen': CHATS, 'karte_xy': KARTE_XY, 'masse': MASSE,
            'mod': [{'n': n, 'o': '', 'block': [round(v, 3) for v in blocks[n]] if blocks[n] else None} for n in order], 'inst': inst_}
    root = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
    open(os.path.join(root, 'asset-src', 'data', 'deck_huette_ek.json'), 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    # Teile für lm2_raum.py: wie die Bereiche im Spiel (deck.ts, zoneOf): Räume = zusammenhängende Zellen eines Buchstabens, Gänge = Blöcke von 6 × 5 Zellen
    parts = {}
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch == '.': continue
            nm = 'huette_' + (TEIL[ch] if ch in TEIL else 'gang_%d_%d' % (c // 6, r // 5)); parts.setdefault(nm, []).append([r, c])
    rooms = [{'name': n, 'cells': cs, 'lm': 1536 if len(cs) >= 6 else 1024} for n, cs in parts.items()]
    json.dump({'rooms': rooms, 'cell': CELL, 'glb': 'Lichtraum2HuetteEk.glb', 'json': 'lichtraum2_huette_ek.json', 'mark': 'lm2-huette.txt', 'vsamples': 96,
               'clamp_direct': 2.0, 'clamp_indirect': 0.5, 'deflicker': 2.5, 'vsmooth': 0.25, 'big': 0.05, 'samples': 192, 'hide_colls': ['Blatt', 'Kameras']},
              open(os.path.join(HERE, 'lm2_huette_ek.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    return {'bausteine_mit_flaeche': sum(1 for b in blocks.values() if b), 'einsaetze': len(inst_), 'teile': len(rooms)}
N_CELLS = assemble(); furnish(); cameras(); INFO = daten_schreiben()
result = {'zellen': N_CELLS, 'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'tueren': len(DOORS), 'personal': len(SPOTS), **INFO}
