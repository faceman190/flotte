# Deck 3 (dritte Fassung) fürs Spiel: Laufflächen, Standflächen, Orte, Personal, Wege, Gruppen, Sichtzonen, Tore zwischen den Zonen, Aufzüge und die
# Teile für den Lichtraum 2. Läuft nach pd_deck.py im selben Namensraum. Schreibt asset-src/data/deck_bastion3.json (Spiel: src/game/deck.ts buildRund)
# und lm2_deck3.json; markiert jede Instanz mit ihrem Lichtraum-Teil (l2part).
# Plankoordinaten des Spiels: wie bisher liegt das Hangartor bei x = −32 (kx0), damit das Quartier (Anbau bei x 0, y 150) seinen Platz behält.
# Gebaut ist das Deck mit dem Tor bei x = 0; dieses Skript verschiebt deshalb erst alles um VERSATZ und rechnet dann mit verschobenen Punkten.
import json
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
VERSATZ = -32.0
for c_ in (C_DECK, C_CEIL, C_SIGN, C_LIGHT, C_CAM):
    for o in c_.objects:
        if o.parent is None and not o.get('pd_versetzt'): o.location.x += VERSATZ; o['pd_versetzt'] = 1      # über location: matrix_world frischer Objekte ist noch nicht berechnet
for c_ in (C_DECK, C_CEIL, C_SIGN):      # pd_deck.py blendet fürs Rendern eine Ebene aus (ebene_zeigen): Fürs Spiel und fürs Backen sind alle Teile da
    for o in c_.objects:
        if o.get('teil'): o.hide_render = False; o.hide_viewport = False
bpy.context.view_layer.update()
def P_(x, y): return [round(x + VERSATZ, 3), round(y, 3)]
def rect(x0, x1, y0, y1): return [P_(x0, y0), P_(x1, y0), P_(x1, y1), P_(x0, y1)]
def kreis(cx, cy, r, n=48): return [P_(cx + r * math.cos(2 * PI * i / n), cy + r * math.sin(2 * PI * i / n)) for i in range(n)]
def bogen(cx, cy, r0, r1, a0, a1, n=6):
    return [P_(cx + r1 * math.cos(a0 + (a1 - a0) * i / n), cy + r1 * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)] + [P_(cx + r0 * math.cos(a1 - (a1 - a0) * i / n), cy + r0 * math.sin(a1 - (a1 - a0) * i / n)) for i in range(n + 1)]
def laden_f(sig):      # Rahmen eines Ladens: (x, y) im Laden → Plan
    cx, sy = LADEN[sig]
    return lambda x, y: P_(cx - sy * y, sy * (FW / 2 + x))
def fluegel_f(sy):      # Rahmen eines Flügels (Nord sy = 1, Süd sy = −1): x nach außen
    return lambda x, y: P_(85.0 - sy * y, sy * (ZW / 2 + 0.3 + x))
def frect(f, x0, x1, y0, y1): return [f(x0, y0), f(x1, y0), f(x1, y1), f(x0, y1)]
LDEG = {s: (90 if LADEN[s][1] > 0 else -90) for s in LADEN}

# ---------- Laufflächen ----------
WALK = [rect(0.0, VX0 + 0.8, -KW / 2, KW / 2), rect(-1.6, 0.6, -2.75, 2.75), rect(VX0 + 0.1, VX1 + 0.3, -VW / 2 + 0.2, VW / 2 - 0.2),
        rect(FX0 + 0.1, FX1 - 0.2, -FW / 2 + 0.2, FW / 2 - 0.2), rect(FX1 - 0.5, ZX0 + 1.0, -ZOW / 2 + 0.2, ZOW / 2 - 0.2), rect(ZX0 + 0.7, ZX1 - 0.2, -ZW / 2 + 0.2, ZW / 2 - 0.2)]
for sig in LADEN:
    f = laden_f(sig); WALK += [frect(f, -0.6, 0.9, -LOW / 2 + 0.2, LOW / 2 - 0.2), frect(f, 0.75, LBD - 0.1, -LBW / 2 + 0.1, LBW / 2 - 0.1)]
for sy in (1, -1):
    f = fluegel_f(sy); WALK += [frect(f, -0.9, 0.3, -1.3, 1.3), frect(f, 0.0, 7.7, -1.7, 1.7), frect(f, 6.9, 9.1, -0.86, 0.86), frect(f, 8.3, 15.7, -5.7, 5.7)]

# ---------- Standflächen ----------
BLOCKS = [kreis(TPX, 0, 1.5, 20)]
for k in range(6):
    t = RAD(60 * k + 30); w = RAD(18)
    BLOCKS.append(bogen(TPX, 0, 2.5, 3.32, t - w - 0.01, t + w + 0.01)); BLOCKS.append(bogen(TPX, 0, 3.33, 4.32, t - w * 0.82, t + w * 0.82))
for k in range(4):
    for sy in (-1, 1): BLOCKS.append(rect(4 * k - 0.07, 4 * k + 0.43, min(sy * 3.55, sy * 4.05), max(sy * 3.55, sy * 4.05)))
for sy in (-1, 1): BLOCKS.append(rect(-0.3, 0.5, min(sy * 2.8, sy * 3.4), max(sy * 2.8, sy * 3.4))); BLOCKS.append(rect(VX0 - 0.1, VX0 + 0.8, min(sy * 3.8, sy * 4.4), max(sy * 3.8, sy * 4.4)))
NOBLOCK = ('Objekt rh_treffpunkt', 'Objekt rh_joch', 'Objekt rh_hangartor', 'Kulisse', 'Joch oben', 'Objekt pd_obergaden', 'Objekt pd_trommel', 'Objekt pd_trommelrahmen', 'Ladendecke', 'Giebel')
def wants_block(c):
    n = c.name
    return not (n.startswith(('Portal', 'Gang ', 'Raum ', 'Boden ', 'Decke ', 'Ladenschale', 'Rückwand', 'Hochwand', 'Sturz', 'Fenster', 'Durchgang', 'Objekt rh_banner')) or n in NOBLOCK)
dg = bpy.context.evaluated_depsgraph_get(); LOCAL = {}; deck_names = set(o.name for o in C_DECK.objects)
for it in dg.object_instances:
    if not it.is_instance or it.parent is None: continue
    par = it.parent.original
    if par.name not in deck_names or not par.instance_collection or not wants_block(par.instance_collection): continue
    if par.get('teil') in (E_H, E_D): continue      # Abschlusswände je Ebene: ihre Standfläche steht in „ebenen“ (sperre), sie gilt nur auf ihrer Ebene
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
    BLOCKS.append([[round(v, 3) for v in (M_ @ Vector((x, y, 0)))[:2]] for (x, y) in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))])

# ---------- Orte und Deckenhöhen (der erste Treffer gilt) ----------
LNAME = {'w': 'Werft', 'h': 'Handelskontor', 'r': 'Ausrüster', 'k': 'Kantine'}
ORTE = []
for sy, nm in ((1, 'Besprechung'), (-1, 'Krankenstation')):
    f = fluegel_f(sy); ORTE.append({'name': nm, 'poly': frect(f, 8.0, 16.0, -6.0, 6.0), 'decke': 3.25}); ORTE.append({'name': 'Deck 3', 'poly': frect(f, -0.4, 8.0, -2.0, 2.0), 'decke': 2.75})
for sig in LADEN: ORTE.append({'name': LNAME[sig], 'poly': frect(laden_f(sig), 0.3, LBD, -LBW / 2, LBW / 2), 'decke': BH - 0.25})
ORTE += [{'name': 'Treffpunkt', 'poly': kreis(TPX, 0, 4.9, 24), 'decke': 9.0}, {'name': 'Hangarzugang', 'poly': rect(-0.5, VX0, -KW / 2, KW / 2), 'decke': KH - 0.25},
         {'name': 'Vorhalle', 'poly': rect(VX0, VX1, -VW / 2, VW / 2), 'decke': VH - 0.4}, {'name': 'Einsatzzentrale', 'poly': rect(ZX0, ZX1, -ZW / 2, ZW / 2), 'decke': ZH - 0.4},
         {'name': 'Forum', 'poly': rect(FX0, FX1, -FW / 2, FW / 2), 'decke': 8.0}]

# ---------- Personal (Dienst, Standort, Blick in Grad: 0 = Osten, 90 = Norden; Ansprechpunkt) ----------
SPOTS = []
def staff(tab, p, face, t, titel=None, satz=None):
    d = {'tab': tab, 'x': p[0], 'y': p[1], 'face': round(face % 360, 1), 'tx': t[0], 'ty': t[1]}
    if titel: d['titel'] = titel; d['satz'] = satz
    SPOTS.append(d)
for (sig, tabs) in (('w', ((4.6, 'werft'), (0.0, 'werkstatt'), (-4.6, 'service'))), ('h', ((3.2, 'markt'), (-3.2, 'lager'))), ('r', ((0.0, 'ausruester'),))):
    f = laden_f(sig)
    for (y, tab) in tabs: staff(tab, f(11.3, y), LDEG[sig] + 180, f(9.1, y))
f = laden_f('k'); staff('kantine', f(7.9, 7.3), LDEG['k'] - 90, f(7.9, 4.9), 'Kantine', 'Eintopf ist heiß, Kaffee ist schwarz. Der Fensterplatz kostet nichts extra.')
for (y, tab) in ((3.8, 'auftraege'), (-3.8, 'missionen')): staff(tab, P_(ZX1 - 3.6, y), 180, P_(ZX1 - 5.8, y))
staff('info', P_(TPX - 1.95, 0.35), 180, P_(TPX - 3.0, 0.0))
f = fluegel_f(-1); staff('kranken', f(11.9, 1.0), -90 - 90, f(11.6, 2.2))
f = fluegel_f(1); staff('besprechung', f(14.7, 0.0), 90 + 180, f(13.4, 0.0), 'Einsatzleitung', 'Die Lagebesprechung ist erst später. Aufträge und Missionen gibt es vorn in der Einsatzzentrale.')

# ---------- Wege der Läufer und Gesprächsgruppen ----------
def stop(p, face, t, pr, who=None): return [p[0], p[1], {'face': round(face % 360, 1), 't': t, 'p': pr, 'who': who}]
def back(n): return n + n[-2:0:-1]
fw, fh, fr, fk, fb, fq = laden_f('w'), laden_f('h'), laden_f('r'), laden_f('k'), fluegel_f(1), fluegel_f(-1)
ROUTES = [
    back([stop(P_(23.0, 6.6), 90, [4, 9], 0.7), P_(26.0, 3.0), P_(31, 1.0), P_(38, 2.5), P_(41, 13.0), fw(1.4, 0.5), stop(fw(8.6, 1.5), 90, [6, 12], 0.9, 'werkstatt')]),
    [P_(TPX + 7.6 * math.cos(RAD(t_)), 7.6 * math.sin(RAD(t_))) for t_ in range(10, 360, 25)],
    back([P_(60, 2.0), P_(72, 3.0), P_(78, 4.2), P_(86, 4.6), stop(P_(ZX1 - 6.6, 4.4), 0, [6, 12], 0.9, 'auftraege'), P_(85.6, -6.0), fq(0.5, 0.6), fq(7.2, 0.5), fq(9.2, 0.0), fq(10.4, -2.6), stop(fq(11.4, -3.4), -90, [5, 10], 0.6, 'kranken')]),
    back([fh(1.6, 0.0), stop(fh(8.8, -1.4), 90, [6, 12], 0.9, 'lager'), fh(1.4, 1.0), P_(62, 11.0), P_(61, 4.0), P_(61, -4.0), P_(62.5, -11.0), fk(1.4, 0.8), stop(fk(6.4, 4.4), 0, [8, 16], 0.9, 'kantine')]),
    back([fr(1.4, 0.0), stop(fr(8.8, 1.2), -90, [6, 12], 0.9, 'ausruester'), fr(1.4, -1.0), P_(40, -11.0), P_(34, -5.0), P_(28, -3.0), P_(24, -4.0), stop(P_(23.0, -6.6), -90, [4, 9], 0.7)]),
    back([P_(33, 11.0), P_(48, 11.5), P_(56, 11.5), P_(71, 11.0), P_(71.5, -11.0), P_(56, -11.5), P_(48, -11.5), P_(33, -11.0)]),
    back([P_(79.5, -4.0), P_(79.5, 4.5), P_(85.4, 6.0), fb(0.5, -0.6), fb(7.2, -0.5), fb(9.2, 0.0), fb(10.6, 2.7), stop(fb(12.0, 2.7), 90, [6, 12], 0.5)]),
    back([P_(3, -1.5), P_(14, -1.5), P_(20.5, -3.0), stop(P_(23.0, -6.6), -90, [4, 9], 0.8), P_(21.0, 1.0), stop(P_(23.0, 6.6), 90, [4, 9], 0.6)]),      # Hangarebene: vom Tor zu den Aufzügen
]
WEGE_EBENE = ['d'] * (len(ROUTES) - 1) + ['h']
CHATS = [P_(36.5, 9.0) + [3], P_(58.5, -9.0) + [2], fk(4.4, -3.4) + [2], P_(80.0, 6.4) + [2], P_(46.0, -2.6) + [2]]      # keine Gruppe in der Vorhalle: Sie stünde auf beiden Ebenen

# ---------- Sichtzonen (der erste Treffer gilt), was man von wo sieht, Tore zwischen den Zonen ----------
ZONEN = [{'id': 'wb', 'poly': frect(fluegel_f(1), -0.2, 16.5, -6.5, 6.5)}, {'id': 'wk', 'poly': frect(fluegel_f(-1), -0.2, 16.5, -6.5, 6.5)}]
for sig in LADEN: ZONEN.append({'id': 's' + sig, 'poly': frect(laden_f(sig), 1.6, LBD + 0.5, -LBW / 2 - 0.5, LBW / 2 + 0.5)})
ZONEN += [{'id': 'k', 'poly': rect(-3.0, VX0, -6.0, 6.0)}, {'id': 'v', 'poly': rect(VX0, VX1, -VW / 2 - 0.5, VW / 2 + 0.5)}, {'id': 'z', 'poly': rect(ZX0 + 0.6, ZX1 + 0.5, -ZW / 2 - 0.3, ZW / 2 + 0.3)},
          {'id': 'f', 'poly': rect(FX0, ZX0 + 0.6, -FW / 2 - 2.0, FW / 2 + 2.0)}]
ALLE = ['k', 'v', 'f', 'sw', 'sh', 'sr', 'sk', 'z']
SICHT = {'k': ALLE, 'v': ALLE, 'f': ALLE, 'sw': ALLE, 'sr': ALLE, 'sh': ALLE, 'sk': ALLE,
         'z': ['z', 'f', 'v', 'sw', 'sh', 'sr', 'sk', 'wb', 'wk'], 'wb': ['wb', 'z', 'wk', 'f'], 'wk': ['wk', 'z', 'wb', 'f']}
TORE = [['k', 'v', P_(VX0, 0)], ['v', 'f', P_(FX0, 0)], ['f', 'z', P_(FX1 + 0.3, 0)], ['z', 'wb', P_(85.0, ZW / 2)], ['z', 'wk', P_(85.0, -ZW / 2)]]
for sig, (cx, sy) in LADEN.items(): TORE.append(['f', 's' + sig, P_(cx, sy * FW / 2)])

# ---------- Lichtraum 2: Teile mit ihren Punkten (erster Punkt = Aufnahmeort der Raumspiegelung; alle weiteren = Plätze der Schlüssellampen) ----------
TEILE = [{'name': 'pd_korridor', 'cells': [P_(8, 0)] + [P_(2 + 4 * k, 0) for k in range(4)], 'lm': 1024, 'zone': 'k', 'spot': [4.6, 9]},
         {'name': 'pd_vorhalle', 'cells': [P_(23, 0)] + [P_(x, y) for x in (19.5, 26.5) for y in (-4.5, 4.5)], 'lm': 2048, 'zone': 'v', 'spot': [5.8, 11]}]
for half, xs in (('w', (34.0, 41.0, 48.0)), ('o', (56.0, 63.0, 70.0))):
    TEILE.append({'name': 'pd_forum_%s_boden' % half, 'cells': [P_(xs[1], 2.0)] + [P_(x, y) for x in xs for y in (-11.0, 0.0, 11.0)], 'lm': 2048, 'zone': 'f', 'spot': [7.8, 15]})
    TEILE.append({'name': 'pd_forum_%s_wand' % half, 'cells': [P_(xs[1], 2.0)], 'lm': 2048, 'zone': 'f', 'spot': [7.8, 15]}); TEILE.append({'name': 'pd_forum_%s_decke' % half, 'cells': [P_(xs[1], 2.0)], 'lm': 2048, 'zone': 'f', 'spot': [7.8, 15]})
for sig in LADEN:
    f = laden_f(sig); TEILE.append({'name': 'pd_laden_' + sig, 'cells': [f(6.0, 0)] + [f(x, y) for x in (3.2, 7.0, 10.6) for y in (-4.5, 4.5)], 'lm': 2048, 'zone': 's' + sig, 'spot': [4.3, 9]})
TEILE.append({'name': 'pd_einsatz', 'cells': [P_(84, 0)] + [P_(x, y) for x in (79.0, 86.0, 92.0) for y in (-5.0, 5.0)], 'lm': 2048, 'zone': 'z', 'spot': [5.8, 11]})
for sy, ch in ((1, 'b'), (-1, 'k')):
    f = fluegel_f(sy); TEILE.append({'name': 'pd_fluegel_' + ch, 'cells': [f(12.6, 0)] + [f(2, 0), f(6, 0)] + [f(x, y) for x in (10, 14) for y in (-4, 0, 4)], 'lm': 1024, 'zone': 'w' + ch, 'spot': [3.15, 8]})
TEILE += [{'name': E_H, 'cells': [P_(27.0, 0)], 'lm': 1024, 'zone': 'v', 'spot': [5.8, 11]}, {'name': E_D, 'cells': [P_(19.0, 0)], 'lm': 1024, 'zone': 'v', 'spot': [5.8, 11]}]
# Zwei Ebenen (pd_deck.py): welcher Teil auf welcher Ebene zu sehen ist ('h' Hangarebene, 'd' Deck 3; die Vorhalle fehlt hier, sie gilt für beide),
# die Sperre in der Mündung, die auf der Ebene zu ist, und die Ebene je Weg.
EB_TEIL = {'pd_korridor': 'h', E_H: 'h', E_D: 'd'}
for t_ in TEILE:
    if t_['zone'] not in ('k', 'v'): EB_TEIL[t_['name']] = 'd'
EBENEN = {'teile': EB_TEIL, 'wege': WEGE_EBENE,
          'sperre': {'h': [rect(VX1 - 0.8, VX1 + 0.6, -VW / 2, VW / 2)], 'd': [rect(VX0 - 0.6, VX0 + 0.8, -KW / 2 - 0.3, KW / 2 + 0.3)]}}
WANDTEILE = ('Wand ', 'Hochwand', 'Rückwand', 'Portal', 'Objekt rh_pfeiler', 'Sturz', 'Giebel', 'Objekt rh_banner')
def part_of(o):
    c = o.instance_collection.name if (o.type == 'EMPTY' and o.instance_collection) else ''
    if c == 'Kulisse': return ''
    if o.get('teil'): return o['teil']      # fest zugewiesen (Teile der Ebenen, Schild über dem Portal des Korridors)
    x, y = o.matrix_world.translation.x - VERSATZ, o.matrix_world.translation.y; ost = math.cos(o.matrix_world.to_euler().z)      # ost > 0: flacher Baustein schaut nach Westen
    if c.startswith(('Ladenschale', 'Ladendecke')) or abs(y) > FW / 2 + 0.4:
        if x > ZX0 - 2.5 and abs(y) > ZW / 2 + 0.2 and not c.startswith('Laden') and abs(x - 85.0) < 9.0 and (abs(y) > FW / 2 + LBD + 0.6 or x > 71.5): return 'pd_fluegel_' + ('b' if y > 0 else 'k')
        return 'pd_laden_' + min(LADEN, key=lambda s: abs(LADEN[s][0] - x) + (0 if LADEN[s][1] * y > 0 else 1000))
    if x > ZX0 - 0.01 and abs(y) > ZW / 2 + 0.2: return 'pd_fluegel_' + ('b' if y > 0 else 'k')
    if x < VX0 + 0.1 and abs(y) < 6.5: return 'pd_korridor'
    if x < FX0 - 0.01 and abs(y) <= VW / 2 + 0.3: return 'pd_vorhalle'
    if x > ZX0 + 0.3 or (abs(x - ZX0) < 0.02 and ost < -0.5): return 'pd_einsatz'
    half = 'w' if x < TPX else 'o'; cn = o.users_collection[0].name
    if cn == 'Decke': return 'pd_forum_%s_decke' % half
    if cn == 'Schilder' or c.startswith(WANDTEILE): return 'pd_forum_%s_wand' % half
    return 'pd_forum_%s_boden' % half
NPART = {}
for cname in ('Deck', 'Decke', 'Schilder'):
    for o in bpy.data.collections[cname].objects:
        p = part_of(o); o['l2part'] = p; NPART[p] = NPART.get(p, 0) + 1
        if not p: o.hide_render = True
for o in C_BLATT.all_objects: o.hide_render = True

meta = {'typ': 'rund', 'name': 'Deck 3', 'kx0': VERSATZ, 'tiefe': 112, 'walk': WALK, 'blocks': BLOCKS, 'orte': ORTE, 'personal': SPOTS, 'wege': ROUTES, 'gruppen': CHATS, 'karte_xy': P_(TPX, 0.0),
        'licht2': ['lichtraum2_deck3', 'Lichtraum2Deck3'], 'mund': [VX0 + VERSATZ, 0.0, OW_K / 2 - 0.2], 'tor': [VERSATZ, OW_K / 2],
        'zonen': ZONEN, 'sicht': SICHT, 'tore': TORE, 'teilzone': {t['name']: t['zone'] for t in TEILE}, 'lampen': {t['name']: t['spot'] for t in TEILE},
        'puppen': [dict(q, x=round(q['x'] + VERSATZ, 3), y=round(q['y'], 3)) for q in PUPPEN],
        'weit': 150, 'abgang': [[-4.5, 19.0], [-7.4, 23.0]],      # Sichtweite (m); Abgang der Figuren der Geschichte (quer, Tiefe ab dem Tor): in die Vorhalle, aus der Sichtlinie zum Hangar
        'aufzug': {'quartier': P_(23.0, VW / 2 - 0.8) + [270], 'bucht': P_(23.0, -VW / 2 + 0.8) + [90]}, 'ebenen': EBENEN}
open(os.path.join(ROOT, 'asset-src', 'data', 'deck_bastion3.json'), 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False))
open(os.path.join(HERE, 'lm2_deck3.json'), 'w', encoding='utf-8').write(json.dumps({'rooms': [{'name': t['name'], 'cells': t['cells'], 'lm': t['lm']} for t in TEILE], 'split': 'rund',
     'glb': 'Lichtraum2Deck3.glb', 'json': 'lichtraum2_deck3.json', 'mark': 'lm2-deck3.txt', 'solo': [E_H, E_D], 'solo_ohne': {E_D: ['pd_korridor']}, 'skipmats': ['Holoschleier'], 'clamp_direct': 8, 'clamp_indirect': 4, 'spuren': True, 'deflicker': 2.5, 'vsmooth': 0.25}, ensure_ascii=False))
GRENZE = sorted(set((o.instance_collection.name if (o.type == 'EMPTY' and o.instance_collection) else o.name.split('.')[0]) + ' → ' + o['l2part'] for cn_ in ('Deck', 'Decke', 'Schilder') for o in bpy.data.collections[cn_].objects if abs(o.matrix_world.translation.x - VERSATZ - VX0) < 0.6 or abs(o.matrix_world.translation.x - VERSATZ - VX1) < 0.6))      # was an den Grenzen der Vorhalle liegt und zu welchem Teil es zählt
spiel = {'grenze': GRENZE, 'walk': len(WALK), 'blocks': len(BLOCKS), 'personal': len(SPOTS), 'wege': len(ROUTES), 'teile': NPART}
