# Rundhalle fürs Spiel: Laufflächen, Standflächen, Orte, Deckenhöhen, Personal, Wege, Gruppen und die Teile für den Lichtraum 2.
# Läuft nach rh_deck.py im selben Namensraum. Schreibt asset-src/data/deck_rund.json (Spiel, src/game/deck.ts: buildRund) und markiert jede
# Instanz mit ihrem Lichtraum-Teil (Eigenschaft l2part) für lm2_raum.py (OPT split = 'rund'); lm2_rund.json enthält die Teile mit ihren Punkten.
# Alle Angaben in Plankoordinaten = Blender x, y (Hallenmitte im Ursprung, Korridor nach Westen, Hangartor bei x = KX0).
import json
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
def rot(deg, x, y):
    a = RAD(deg); return [round(x * math.cos(a) - y * math.sin(a), 3), round(x * math.sin(a) + y * math.cos(a), 3)]
def bay(deg): return lambda x, y: rot(deg, D0 + x, y)
def wing(deg): return lambda x, y: rot(deg, x, y)
def ident(x, y): return [round(x, 3), round(y, 3)]
def prect(f, x0, x1, y0, y1): return [f(x0, y0), f(x1, y0), f(x1, y1), f(x0, y1)]
def arcpoly(r0, r1, a0, a1, n=8): return [ident(r1 * math.cos(a0 + (a1 - a0) * i / n), r1 * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)] + [ident(r0 * math.cos(a1 - (a1 - a0) * i / n), r0 * math.sin(a1 - (a1 - a0) * i / n)) for i in range(n + 1)]
def circle(r, n=72): return [ident(r * math.cos(2 * PI * i / n), r * math.sin(2 * PI * i / n)) for i in range(n)]
BAYDEG = {sig: deg for (deg, sig, t, s) in BAYS}

# ---------- Laufflächen (Vielecke; das Spiel zerlegt sie in schmale Streifen) ----------
WALK = [circle(RH_R - 0.2)]
WALK.append(prect(ident, KX0, -DK + 0.5, -KW / 2, KW / 2))                 # Korridor bis in die Halle
WALK.append(prect(ident, KX0 - 1.6, KX0 + 0.6, -2.75, 2.75))               # Tor zum Hangar
for (deg, sig, t, s) in BAYS:
    f = bay(deg); WALK.append(prect(f, -0.6, 0.9, -OW_B / 2, OW_B / 2)); WALK.append(prect(f, 0.75, BD, -BW / 2, BW / 2))
for (deg, ch, name, mood) in WINGS:
    f = wing(deg)
    WALK += [prect(f, RH_R - 0.6, 17.3, -1.3, 1.3), prect(f, 17.0, 24.7, -1.7, 1.7), prect(f, 23.9, 26.1, -0.86, 0.86), prect(f, 25.3, 32.7, -5.7, 5.7)]

# ---------- Standflächen ----------
BLOCKS = []
# Treffpunkt: Kartentisch, Bankring, Pflanzkübel
BLOCKS.append(circle(1.5, 20))
for k in range(6):
    t = RAD(60 * k + 30); w = RAD(18)
    BLOCKS.append(arcpoly(2.5, 3.32, t - w - 0.01, t + w + 0.01, 6)); BLOCKS.append(arcpoly(3.33, 4.32, t - w * 0.82, t + w * 0.82, 6))
# Korridor: Spantpfosten und -füße an jedem Joch
for k in range(4):
    x = KX0 + 4 * k
    for sy in (-1, 1): BLOCKS.append(prect(ident, x - 0.07, x + 0.43, sy * 3.55, sy * 4.05))
# Torpfosten am Hangar
for sy in (-1, 1): BLOCKS.append(prect(ident, KX0 - 0.3, KX0 + 0.5, sy * 2.8, sy * 3.4))
# alle übrigen Instanzen: Umriss der Teile zwischen 0,15 und 1,9 m Höhe, in der Lage der Instanz (gedrehtes Rechteck)
NOBLOCK = ('Objekt rh_bodenkeil', 'Objekt rh_treffpunkt', 'Objekt rh_joch', 'Objekt rh_hangartor', 'Objekt rh_buchtschale', 'Kulisse', 'Joch oben')
def wants_block(c):
    n = c.name
    if n.startswith(('Wandstück', 'Portal', 'Gang ', 'Raum ')) or n in NOBLOCK: return False
    return True
dg = bpy.context.evaluated_depsgraph_get(); LOCAL = {}; deck_names = set(o.name for o in C_DECK.objects)
for it in dg.object_instances:
    if not it.is_instance or it.parent is None: continue
    par = it.parent.original
    if par.name not in deck_names or not par.instance_collection or not wants_block(par.instance_collection): continue
    ob = it.object
    if ob.type != 'MESH': continue
    try: me = ob.to_mesh()
    except Exception: continue
    inv = par.matrix_world.inverted() @ it.matrix_world
    pts = LOCAL.setdefault(par.name, [])
    for v in me.vertices:
        p = inv @ v.co
        if 0.15 < p.z < 1.9: pts.append((p.x, p.y))
    ob.to_mesh_clear()
for o in C_DECK.objects:
    pts = LOCAL.get(o.name)
    if not pts: continue
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    if (x1 - x0) * (y1 - y0) < 0.01: continue
    M_ = o.matrix_world
    BLOCKS.append([ident(*(M_ @ Vector((x, y, 0)))[:2]) for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))])

# ---------- Orte und Deckenhöhen ----------
NAMEN = {'a': 'Auftragsbüro', 'h': 'Handelskontor', 'w': 'Werft', 'k': 'Kantine', 'r': 'Ausrüster'}
ORTE = []
for (deg, ch, name, mood) in WINGS:
    ORTE.append({'name': name.capitalize() if name != 'BESPRECHUNG' else 'Besprechung', 'poly': prect(wing(deg), 25.0, 33.0, -6.0, 6.0), 'decke': 3.25})
    ORTE.append({'name': 'Deck 3', 'poly': prect(wing(deg), 16.6, 25.0, -2.0, 2.0), 'decke': 2.75})
for (deg, sig, t, s) in BAYS: ORTE.append({'name': NAMEN[sig], 'poly': prect(bay(deg), 0.3, BD, -BW / 2, BW / 2), 'decke': BH - 0.25})
ORTE.append({'name': 'Treffpunkt', 'poly': circle(4.9, 24), 'decke': 6.8})
ORTE.append({'name': 'Deck 3', 'poly': prect(ident, KX0 - 0.5, -DK, -KW / 2, KW / 2), 'decke': KH - 0.25})
ORTE.append({'name': 'Deck 3', 'poly': circle(RH_R + 0.8, 36), 'decke': 6.8})

# ---------- Personal (Dienst, Standort, Blick in Grad: 0 = Osten, 90 = Norden; Ansprechpunkt) ----------
SPOTS = []
def staff(tab, p, face, t, titel=None, satz=None):
    d = {'tab': tab, 'x': p[0], 'y': p[1], 'face': round(face % 360, 1), 'tx': t[0], 'ty': t[1]}
    if titel: d['titel'] = titel; d['satz'] = satz
    SPOTS.append(d)
for (sig, tabs) in (('a', ((2.0, 'auftraege', 6.1), (-2.0, 'missionen', 6.1))), ('h', ((2.0, 'markt', 6.3), (-2.0, 'lager', 6.3))),
                    ('w', ((2.7, 'werft', 6.4), (0.0, 'werkstatt', 6.4), (-2.7, 'service', 6.4))), ('r', ((0.0, 'ausruester', 6.1),))):
    deg = BAYDEG[sig]; f = bay(deg)
    for (y, tab, x) in tabs: staff(tab, f(x + 0.8, y), deg + 180, f(x - 1.4, y))
f = bay(BAYDEG['k']); staff('kantine', f(7.45, 0.4), BAYDEG['k'] + 180, f(5.1, 0.5), 'Kantine', 'Eintopf ist heiß, Kaffee ist schwarz. Mehr Auswahl hat hier draußen keiner.')
staff('info', ident(-1.95, 0.35), 180, ident(-3.0, 0.0))
for (deg, ch, name, mood) in WINGS:
    f = wing(deg)
    if ch == 'K': staff('kranken', f(28.9, 1.0), deg - 90, f(28.6, 2.2))
    else: staff('besprechung', f(31.7, 0.0), deg + 180, f(30.4, 0.0), 'Einsatzleitung', 'Die Lagebesprechung ist erst später. Aufträge und Missionen gibt es vorn im Auftragsbüro.')

# ---------- Wege der Läufer und Gesprächsgruppen ----------
def stop(p, face, t, pr, who=None): return [p[0], p[1], {'face': round(face % 360, 1), 't': t, 'p': pr, 'who': who}]
def back(n): return n + n[-2:0:-1]
fw, fh, fa, fk, fr = bay(120), bay(60), bay(0), bay(-120), bay(-60)
ROUTES = [
    back([ident(KX0 + 3, -1.5), ident(-18, -1.5), ident(-11, -3.5), ident(-6.5, -4.0), rot(120, 9.5, -2.5), fw(2.2, 0.0), stop(fw(4.6, 0.0), 300, [6, 12], 0.9, 'werkstatt')]),
    [rot(t_, 7.2, 0) for t_ in range(10, 360, 25)],
    back([rot(0, 8.0, 0.5), fa(1.6, 0.5), stop(fa(4.6, 2.0), 0, [6, 12], 0.9, 'auftraege'), fa(1.6, -0.5), rot(-15, 10.0, 0), rot(-30, 15.5, 0), rot(-30, 21.0, 0), rot(-30, 26.0, 0),
          rot(-30, 26.3, -2.6), stop(rot(-30, 27.2, -3.4), -30, [5, 10], 0.6, 'kranken')]),
    back([rot(60, 8.0, 0), fh(1.8, 0.0), stop(fh(4.8, -2.0), 60, [6, 12], 0.9, 'lager'), fh(2.0, 2.4), rot(40, 11.5, 0), rot(30, 16.0, 0), rot(30, 22.0, 0), rot(30, 26.0, 0),
          rot(30, 26.3, 2.7), stop(rot(30, 29.0, 2.7), 30, [6, 12], 0.5)]),
    back([rot(-120, 8.0, 0), fk(1.8, -0.5), stop(fk(4.9, -1.5), -120, [8, 16], 0.9, 'kantine'), fk(1.5, 1.5), rot(-90, 9.0, 0), rot(-60, 9.0, 0), fr(1.8, 0), stop(fr(4.6, 0.8), -60, [6, 12], 0.9, 'ausruester')]),
]
CHATS = [ident(-7.0, 7.5) + [3], ident(6.5, -8.2) + [2], fk(3.4, 0.9) + [2], ident(-24.0, 2.6) + [2]]

# ---------- Lichtraum 2: Teile und ihre Punkte (erster Punkt = Aufnahmeort der Raumspiegelung; alle = Plätze der Schlüssellampen) ----------
TEILE = [{'name': 'rh_halle', 'cells': [ident(-8.0, 2.0)] + [ident(*polar(8.6, RAD(30 * k + 15))) for k in range(12)] + [ident(*polar(13.0, RAD(30 * k + 15))) for k in range(12)], 'lm': 2048},
         {'name': 'rh_korridor', 'cells': [ident(KX0 + 8, 0)] + [ident(KX0 + 2 + 4 * k, 0) for k in range(4)], 'lm': 1024}]
for (deg, sig, t, s) in BAYS:
    f = bay(deg); TEILE.append({'name': 'rh_bucht_' + sig, 'cells': [f(3.6, 0)] + [f(x, y) for x in (2.3, 5.0, 7.4) for y in (-2.2, 2.2)], 'lm': 1024})
for (deg, ch, name, mood) in WINGS:
    f = wing(deg); TEILE.append({'name': 'rh_fluegel_' + ch.lower(), 'cells': [f(27.6, 0)] + [f(19, 0), f(23, 0)] + [f(x, y) for x in (27, 31) for y in (-4, 0, 4)], 'lm': 1024})
def part_of(o):
    c = o.instance_collection.name if (o.type == 'EMPTY' and o.instance_collection) else ''
    x, y = o.matrix_world.translation.x, o.matrix_world.translation.y; r = math.hypot(x, y); d = math.degrees(math.atan2(y, x))
    if c == 'Kulisse' or o.users_collection[0].name == 'Baukastenblatt': return ''
    if x < -DK - 0.3 and abs(y) < 6.5: return 'rh_korridor'
    near = lambda a: abs((d - a + 180) % 360 - 180)
    if c in ('Objekt rh_buchtschale', 'Objekt rh_buchtdecke') or r > RH_R + 0.6:
        for (deg, ch, name, mood) in WINGS:
            if r > RH_R + 0.6 and near(deg) < 14: return 'rh_fluegel_' + ch.lower()
        return 'rh_bucht_' + min(BAYS, key=lambda b: near(b[0]))[1]
    return 'rh_halle'
NPART = {}
for cname in ('Deck', 'Decke', 'Schilder'):
    for o in bpy.data.collections[cname].objects:
        p = part_of(o); o['l2part'] = p; NPART[p] = NPART.get(p, 0) + 1
        if not p: o.hide_render = True
for o in bpy.data.collections['Decke'].objects:
    if o.instance_collection and o.instance_collection.name == 'Kulisse': o.hide_render = True
for o in C_BLATT.all_objects: o.hide_render = True

meta = {'typ': 'rund', 'name': 'Deck 3', 'kx0': KX0, 'walk': WALK, 'blocks': BLOCKS, 'orte': ORTE, 'personal': SPOTS, 'wege': ROUTES, 'gruppen': CHATS, 'karte_xy': [0.0, 0.0],
        'licht2': ['lichtraum2_rund', 'Lichtraum2Rund'], 'mund': [-DK, 0.0, OW_K / 2 - 0.2], 'tor': [KX0, OW_K / 2]}
open(os.path.join(ROOT, 'asset-src', 'data', 'deck_rund.json'), 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False))
open(os.path.join(HERE, 'lm2_rund.json'), 'w', encoding='utf-8').write(json.dumps({'rooms': TEILE, 'split': 'rund', 'glb': 'Lichtraum2Rund.glb', 'json': 'lichtraum2_rund.json',
     'mark': 'lm2-rund.txt', 'skipmats': ['Holoschleier'], 'clamp_direct': 8, 'clamp_indirect': 4, 'deflicker': 2.5, 'vsmooth': 0.25}, ensure_ascii=False))
spiel = {'walk': len(WALK), 'blocks': len(BLOCKS), 'personal': len(SPOTS), 'wege': len(ROUTES), 'teile': NPART}
