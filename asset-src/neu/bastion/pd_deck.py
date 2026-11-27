# Deck 3 der Bastion, dritte Fassung (26.11.2026): Zusammenbau, Einrichtung, Licht, Kameras. Plan und Bauweisen stehen in pd_kit.py.
# Läuft nach bk_kit, bk_mehr, bk_med, rh_kit, rh_deck (NUR_HELFER_RH), rh_leben, pd_kit im selben Namensraum (pd_lauf.py erledigt das).
class Seite:      # gerade Wand von p0 nach p1; der Raum liegt in Richtung n (Einheitsvektor)
    def __init__(s, p0, p1, n):
        s.p0 = Vector((p0[0], p0[1], 0)); d = Vector((p1[0] - p0[0], p1[1] - p0[1], 0)); s.L = d.length; s.t = d.normalized(); s.n = Vector((n[0], n[1], 0))
        s.aw = math.atan2(s.n.y, s.n.x); s.af = math.atan2(-s.n.y, -s.n.x)
    def at(s, u, d=0.0, z=0.0): p = s.p0 + s.t * u + s.n * d; return (p.x, p.y, z)
    def dress(s, name, u): return inst(dress(name), s.at(u, 1.7), s.aw, C_DECK)                      # Wandfüllung des alten Baukastens (2 m)
    def flat(s, c, u, into=None, z=0.0): return inst(prop(c) if isinstance(c, str) else c, s.at(u, 0.0, z), s.af, into or C_DECK)      # flacher Baustein
    def feld(s, u, name=None, hoch=None):      # 2 m Wand: Buchtwand bis 4,6 m, Füllung davor, Hochwand darüber
        obs = [s.dress('buchtwand', u)]
        if name: obs.append(s.dress(name, u))
        if hoch: obs.append(s.flat(module('Hochwand %.1f %.1f' % hoch, b_pd_hochwand, hoch[0], hoch[1]), u))
        return obs
    def hoch(s, u0, u1, z0, z1):      # Hochwand über einer Öffnung oder einem Portal
        n = max(1, int(round((u1 - u0) / 2)))
        for i in range(n): s.flat(module('Hochwand %.1f %.1f' % (z0, z1), b_pd_hochwand, z0, z1), u0 + (i + 0.5) * (u1 - u0) / n)
    def rueck(s, h, u0=0.0, u1=None, z0=0.0):      # schlichte Wand dahinter (schließt die Reste zwischen Portalen und Füllungen)
        u1 = s.L if u1 is None else u1
        c = module('Rückwand %.2f %.1f %.1f' % (u1 - u0, h, z0), lambda: box('Rückwand', 0.3, u1 - u0, h - z0, 0.2, 0, (z0 + h) / 2, M['wall4'], 0))
        return s.flat(c, (u0 + u1) / 2)
class Rahmen:      # Rahmen eines Ladens: Mündung bei x = 0, Tiefe nach +x, quer y
    def __init__(s, ox, oy, ang, bw, bd): s.o = Vector((ox, oy, 0)); s.a = ang; s.c, s.s = math.cos(ang), math.sin(ang); s.bw, s.bd = bw, bd
    def p(s, x, y, z=0.0): return (s.o.x + x * s.c - y * s.s, s.o.y + x * s.s + y * s.c, z)
    def put(s, name, x, y, ang=0.0, z=0.0): return inst(prop(name) if isinstance(name, str) else name, s.p(x, y, z), s.a + ang, C_DECK)
    def _w(s, side, u): return ((u, s.bw / 2), -PI / 2) if side == 'l' else ((u, -s.bw / 2), PI / 2) if side == 'r' else ((s.bd, u), PI)
    def dress(s, name, side, u):
        wp, na = s._w(side, u); return inst(dress(name), s.p(wp[0] + 1.7 * math.cos(na), wp[1] + 1.7 * math.sin(na)), s.a + na, C_DECK)
    def flat(s, name, side, u):
        wp, na = s._w(side, u); return inst(prop(name) if isinstance(name, str) else name, s.p(*wp), s.a + na + PI, C_DECK)
    def area(s, x, y, z, sx, sy, w, col_):
        prev = CUR[0]; CUR[0] = C_LIGHT; ob = area('Ladenlicht', s.p(x, y, z), (0, 0, s.a), sx, sy, w, col_); CUR[0] = prev; return ob
# Zwei Ebenen (seit dem 27.11.2026). Nutzer: „Bei dem Hangar für die Spieler. Dort soll kein Deck sein, nur Hangarzugang und die beiden Aufzüge.
# Nicht nochmal Treffpunkt und Läden“. Hangar, Korridor und Vorhalle sind die Hangarebene, Vorhalle und Forum sind Deck 3; dazwischen fährt nur
# der Aufzug. Die Vorhalle steht einmal und gilt für beide Ebenen. Was nur auf einer Ebene zu sehen ist, trägt die Eigenschaft „teil“
# (pd_spiel.py part_of): pd_ebene_h (Abschlusswand zum Forum, Schrift DECK 3 am Südaufzug) und pd_ebene_d (Abschlusswand zum Korridor, Schrift
# HANGARBUCHTEN). Der Korridor gehört ganz zur Hangarebene, alles ab dem Forum zu Deck 3 (deck_bastion3.json „ebenen“).
E_H, E_D = 'pd_ebene_h', 'pd_ebene_d'
def eb(obs, teil):
    for o in (obs if isinstance(obs, (list, tuple)) else [obs]): o['teil'] = teil
    return obs
def zeichen(fn, ang=0.0, loc=(0, 0, 0), teil=None):
    vor = set(C_SIGN.objects); build_signs(fn, ang, loc)
    if teil:
        for o in C_SIGN.objects:
            if o not in vor: o['teil'] = teil
def bodenschrift(s_, x, y, ang, size=0.36, teil=None):
    zeichen(lambda: text(s_, size, (0, 0, 0.006), (0, -1, 0), (1, 0, 0), M['txto'], align='CENTER'), ang, (x, y, 0), teil)
def wegweiser(x, y, ang, lines, z=3.9, h=5.0, breit=3.4):
    def f():
        box('Wegweiser', 0.06, breit, 0.5, 0, 0, z, M['frame'], 0.014); box('Wegweiser Feld', 0.012, breit - 0.1, 0.42, -0.035, 0, z, M['glass'], 0)
        for i, t in enumerate(lines): text(t, 0.13, (-0.042, 0, z + 0.07 - i * 0.2), RIGHT_X, RIGHT_Y, M['e_cool' if i == 0 else 'e_amber'], align='CENTER')
        for sy in (-breit / 2 + 0.2, breit / 2 - 0.2): pipe('Hänger', [(0, sy, z + 0.25), (0, sy, h)], 0.012, M['steel'])
    zeichen(f, ang, (x, y, 0))

HO1, HO2, HO3 = (4.6, VH), (4.6, FHW), (4.6, ZH)      # Hochwand über den Füllungen je Halle (H1 heißt schon eine Höhe im alten Baukasten)
def assemble():
    prop('automat')
    # ---------- Korridor vom Hangar (wie bisher, Tor bei x = 0) ----------
    jo, ku = split('rh_joch', 'Joch oben', JOCH_OBEN), split('rh_hangartor', 'Kulisse', KULISSE)
    for k in range(4): inst(prop('rh_joch'), (4 * k, 0, 0), 0.0, C_DECK); inst(jo, (4 * k, 0, 0), 0.0, C_CEIL)
    inst(prop('rh_hangartor'), (0, 0, 0), 0.0, C_DECK); inst(ku, (0, 0, 0), 0.0, C_CEIL)
    gang = {('l', 0): 'pflanzwand', ('l', 1): 'feldh1', ('l', 2): 'schirm', ('l', 3): 'bank', ('l', 4): 'feld2', ('l', 5): 'terminal', ('l', 6): 'feuer', ('l', 7): 'feldh2',
            ('r', 0): 'feld1', ('r', 1): 'aushang', ('r', 2): 'bank', ('r', 3): 'schirm', ('r', 4): 'gitter', ('r', 5): 'feldh1', ('r', 6): 'luke', ('r', 7): 'flaschen'}
    for (side, i), name in gang.items():
        x = (i // 2) * 4 + (1.25 if i % 2 == 0 else 3.07)
        if side == 'l': inst(dress(name), (x, KW / 2 - 1.7, 0), -PI / 2, C_DECK)
        else: inst(dress(name), (x, -KW / 2 + 1.7, 0), PI / 2, C_DECK)
    wegweiser(4.4, 0, 0.0, ['AUFZÜGE  ·  GERADEAUS', 'DECK 3  ·  QUARTIERE']); wegweiser(12.4, 0, 0.0, ['AUFZUG DECK 3', 'FORUM  ·  LÄDEN  ·  TREFFPUNKT'])
    pk = module('Portal Korridor', b_portal, OW_K, OH_K, 0.62, YP_K + 0.5, 'gang')
    inst(pk, (VX0, 0, 0), PI, C_DECK)['teil'] = 'pd_korridor'; zeichen(lambda: portal_sign('HANGAR', 'SCHIFFE  ·  DECKMEISTER  ·  START', 'w', OW_K, OH_K), PI, (VX0, 0, 0), 'pd_korridor')

    # ---------- Vorhalle mit den beiden Aufzügen ----------
    # Boden, Decke und Westwand der Vorhalle liegen mit ihrem Ursprung an der Grenze zum Korridor: fest der Vorhalle zuweisen (sie gilt für beide Ebenen)
    inst(module('Boden Vorhalle', b_pd_boden, VX1 - VX0, VW, 11, 0.3, (-1.7, 1.7)), (VX0, 0, 0), 0.0, C_DECK)['teil'] = 'pd_vorhalle'
    inst(module('Decke Vorhalle', b_pd_decke, VX1 - VX0, VW, VH), (VX0, 0, 0), 0.0, C_CEIL)['teil'] = 'pd_vorhalle'
    W_ = Seite((VX0, -VW / 2), (VX0, VW / 2), (1, 0))
    for (u0, u1, z0) in ((0.0, VW / 2 - KW / 2, 0.0), (VW / 2 + KW / 2, VW, 0.0), (VW / 2 - KW / 2, VW / 2 + KW / 2, KH)): W_.rueck(VH, u0, u1, z0)['teil'] = 'pd_vorhalle'      # die Mündung des Korridors bleibt frei
    for (u, nm) in ((0.8, 'terminal'), (2.8, 'aushang'), (VW - 2.8, 'feuer'), (VW - 0.8, 'feld1')): eb(W_.feld(u, nm, HO1), 'pd_vorhalle')
    for (S_, lab, sub, sig) in ((Seite((VX0, VW / 2), (VX1, VW / 2), (0, -1)), 'QUARTIERE', 'DECK Q  ·  KOJEN  ·  SPINDE', 'q'),
                                (Seite((VX1, -VW / 2), (VX0, -VW / 2), (0, 1)), 'HANGARBUCHTEN', 'DEINE BUCHT  ·  BUCHTEN DER CREW', 'b')):
        S_.rueck(VH); S_.flat(module('Aufzug ' + lab + ' Bau', b_pd_aufzug, lab, sub, sig, 'bau'), 7.0)
        if sig == 'q': S_.flat(module('Aufzug ' + lab + ' Name', b_pd_aufzug, lab, sub, sig, 'name'), 7.0)
        else:      # der Südaufzug verbindet die Ebenen: auf Deck 3 heißt er HANGARBUCHTEN, auf der Hangarebene DECK 3
            eb(S_.flat(module('Aufzug ' + lab + ' Name', b_pd_aufzug, lab, sub, sig, 'name'), 7.0), E_D)
            eb(S_.flat(module('Aufzug DECK 3 Name', b_pd_aufzug, 'DECK 3', 'FORUM  ·  LÄDEN  ·  TREFFPUNKT', sig, 'name'), 7.0), E_H)
        eb(S_.flat(module('Aufzug Etage DECK 3 ' + sig, b_pd_aufzug, lab, sub, sig, 'etage', 'DECK 3'), 7.0), E_D)
        eb(S_.flat(module('Aufzug Etage HANGAR ' + sig, b_pd_aufzug, lab, sub, sig, 'etage', 'HANGAR'), 7.0), E_H)
        for (u, nm) in ((1.0, 'bank'), (3.0, 'schirm'), (11.0, 'feldh1'), (13.0, 'bank')): S_.feld(u, nm, HO1)
    for sy in (-1, 1): inst(prop('saeule'), (VX0 + 3.2, sy * 6.2, 0), 0.0, C_DECK); inst(prop('rh_kuebel'), (VX1 - 1.4, sy * 7.6, 0), 0.0, C_DECK)
    inst(prop('automat'), (VX0 + 0.5, 7.9, 0), 0.0, C_DECK)
    bodenschrift('QUARTIERE', 23.0, 5.2, PI / 2, 0.3); bodenschrift('HANGARBUCHTEN', 23.0, -5.2, -PI / 2, 0.3, E_D); bodenschrift('DECK 3', 23.0, -5.2, -PI / 2, 0.3, E_H)
    # Abschlusswände je Ebene. Hangarebene: Wand vor dem Forum (18 m). Deck 3: Wand in der Mündung des Korridors, dessen Portal fehlt dort.
    O_ = Seite((VX1, VW / 2), (VX1, -VW / 2), (-1, 0)); eb(O_.rueck(VH), E_H)
    for k, nm in enumerate(('feldh1', 'schirm', 'feld2', 'pflanzwand', 'feld1', 'pflanzwand', 'feld2', 'aushang', 'feldh2')): eb(O_.feld(1.0 + 2 * k, nm, HO1), E_H)
    eb(O_.flat(module('Ebenentafel Hangar', b_pd_ebenentafel, 'HANGAREBENE', 'DECK 3 UND QUARTIERE ÜBER DIE AUFZÜGE', 'w'), VW / 2), E_H)
    eb(W_.rueck(KH, VW / 2 - KW / 2, VW / 2 + KW / 2), E_D)
    for k, nm in enumerate(('feldh2', 'schirm', 'feld1', 'aushang', 'feldh1')): eb(W_.feld(5.0 + 2 * k, nm, HO1), E_D)
    eb(W_.flat(module('Ebenentafel Deck', b_pd_ebenentafel, 'DECK 3', 'FORUM  ·  LÄDEN  ·  TREFFPUNKT  ·  EINSATZZENTRALE', 'w'), VW / 2), E_D)

    # ---------- Forum ----------
    inst(module('Boden Forum', b_pd_boden, FX1 - FX0, FW, 5, 0.3, (-1.7, 1.7)), (FX0, 0, 0), 0.0, C_DECK)
    for sy in (-1, 1): inst(module('Decke Seitenschiff', b_pd_decke, FX1 - FX0, (FW - NW) / 2, FHW), (FX0, sy * (NW / 2 + (FW - NW) / 4), 0), 0.0, C_CEIL)
    for x in (FX0, TPX + TR): inst(module('Decke Mittelschiff', b_pd_decke, TPX - TR - FX0, NW, FH), (x, 0, 0), 0.0, C_CEIL)
    inst(prop('pd_trommelrahmen'), (TPX, 0, 0), 0.0, C_CEIL); inst(prop('pd_trommel'), (TPX, 0, 0), 0.0, C_CEIL)
    for (S_) in (Seite((FX0, NW / 2), (FX1, NW / 2), (0, -1)), Seite((FX1, -NW / 2), (FX0, -NW / 2), (0, 1))):
        for k in range(11): S_.flat('pd_obergaden', 2 + 4 * k, C_CEIL)
    for (x, y) in STUETZEN: inst(prop('pd_stuetze'), (x, y, 0), 0.0, C_DECK)
    inst(prop('rh_treffpunkt'), (TPX, 0, 0), 0.0, C_DECK); inst(prop('rh_ringschirm'), (TPX, 0, 0), 0.0, C_CEIL); inst(prop('rh_lichtkrone'), (TPX, 0, TZ - RH_HD), 0.0, C_CEIL)
    # Westwand des Forums beiderseits der Vorhalle, Sturz darüber, Giebel des Mittelschiffs
    for sy in (-1, 1):
        S_ = Seite((FX0, sy * VW / 2), (FX0, sy * FW / 2), (1, 0)); S_.rueck(FHW)
        for (u, nm) in ((1.5, 'aushang' if sy > 0 else 'schirm'), (3.5, 'bank'), (5.5, 'feldh2')): S_.feld(u, nm, HO2)
        S_.flat('rh_pfeiler', 0.45)
    inst(module('Sturz Vorhalle', b_pd_sturzwand, VW, VH, FHW, 'AUFZÜGE', 'HANGARBUCHTEN  ·  QUARTIERE', 'w'), (FX0, 0, 0), PI, C_DECK)
    giebel = module('Giebel', lambda: (box('Giebelwand', 0.4, NW, FH - FHW, 0.2, 0, (FH + FHW) / 2, M['wall4'], 0), emblem((-0.01, 0, (FH + FHW) / 2), RIGHT_X, RIGHT_Y, 0.9, M['e_panel_h']),
                                       box('Giebellicht', 0.04, NW - 1.0, 0.04, -0.02, 0, FHW + 0.2, M['e_cool'], 0)))
    inst(giebel, (FX0, 0, 0), PI, C_CEIL); inst(giebel, (FX1, 0, 0), 0.0, C_CEIL)
    # Längswände mit den Portalen der Läden
    pl = module('Portal Laden', b_portal, LOW, LOH, 0.75, LOW / 2 + 1.36, 'laden')
    NAMEN = {'w': ('WERFT', 'SCHIFFE  ·  WERKSTATT  ·  SERVICE'), 'h': ('HANDELSKONTOR', 'MARKT  ·  LAGER  ·  ERZPROBEN'), 'r': ('AUSRÜSTER', 'ANZÜGE  ·  WAFFEN  ·  MODULE'), 'k': ('KANTINE', 'ESSEN  ·  TRINKEN  ·  AUSBLICK')}
    for sy in (-1, 1):
        S_ = Seite((FX0, sy * FW / 2), (FX1, sy * FW / 2), (0, -sy)); us = sorted(cx - FX0 for (cx, s_) in LADEN.values() if s_ == sy); u_ = 0.0
        for u in us: S_.rueck(FHW, u_, u - LOW / 2 - 0.3); S_.rueck(FHW, u - LOW / 2 - 0.3, u + LOW / 2 + 0.3, LOH); u_ = u + LOW / 2 + 0.3      # die Portale der Läden bleiben frei
        S_.rueck(FHW, u_, S_.L)
        for sig, (cx, s_) in LADEN.items():
            if s_ != sy: continue
            a = sy * PI / 2; u = cx - FX0
            inst(pl, (cx, sy * FW / 2, 0), a, C_DECK); zeichen(lambda t=NAMEN[sig][0], s2=NAMEN[sig][1], g=sig: portal_sign(t, s2, g, LOW, LOH), a, (cx, sy * FW / 2, 0))
            for d in (-1, 1): S_.flat('rh_pfeiler', u + d * (LOW / 2 + 0.86))
            S_.hoch(u - 7.0, u + 7.0, RH_HW, FHW)
            bodenschrift(NAMEN[sig][0], cx, sy * 12.6, 0.0 if sy > 0 else PI, 0.34)
        fill = ('feldh1', 'pflanzwand', 'bank', 'schirm') if sy > 0 else ('feuer', 'bank', 'aushang', 'feld2')
        for (u, nm) in ((1.8, fill[0]), (20.0, fill[1]), (22.0, fill[2]), (24.0, fill[3]), (42.2, fill[0])): S_.feld(u, nm, HO2)
    # Ostwand mit dem Portal zur Einsatzzentrale
    E_ = Seite((FX1, FW / 2), (FX1, -FW / 2), (-1, 0))
    for (u0, u1, z0) in ((0.0, FW / 2 - ZOW / 2 - 0.3, 0.0), (FW / 2 + ZOW / 2 + 0.3, FW, 0.0), (FW / 2 - ZOW / 2 - 0.3, FW / 2 + ZOW / 2 + 0.3, ZOH)): E_.rueck(FHW, u0, u1, z0)      # das Portal zur Einsatzzentrale bleibt frei
    pz = module('Portal Einsatz', b_portal, ZOW, ZOH, 0.62, ZOW / 2 + 1.36, 'gang')
    inst(pz, (FX1, 0, 0), 0.0, C_DECK); zeichen(lambda: portal_sign('EINSATZZENTRALE', 'AUFTRÄGE  ·  MISSIONEN  ·  BESPRECHUNG  ·  KRANKENSTATION', 'e', ZOW, ZOH), 0.0, (FX1, 0, 0))
    for d in (-1, 1): E_.flat('rh_pfeiler', FW / 2 + d * (ZOW / 2 + 0.86))
    E_.hoch(FW / 2 - 7.0, FW / 2 + 7.0, RH_HW, FHW)
    for (u, nm) in ((1.4, 'feldh2'), (3.4, 'terminal'), (5.4, 'bank'), (7.4, 'feld1'), (FW - 7.4, 'schirm'), (FW - 5.4, 'bank'), (FW - 3.4, 'aushang'), (FW - 1.4, 'feldh1')): E_.feld(u, nm, HO2)
    # Leben im Forum: Marktstände, Banner, Bänke, Kübel, Leuchten, Infosäulen
    inst(prop('rh_stand_gemuese'), (TPX, FW / 2 - 2.6, 0), PI / 2, C_DECK); inst(prop('rh_stand_imbiss'), (TPX, -FW / 2 + 2.6, 0), -PI / 2, C_DECK); inst(prop('rh_stand_teile'), (FX0 + 2.4, 12.6, 0), PI, C_DECK)
    for i, ((deg, stoff, lines), (x, y)) in enumerate(zip(BANNER, ((34, 6.9), (60, 6.9), (70, 6.9), (34, -6.9), (44, -6.9), (70, -6.9)))):
        inst(prop('rh_banner_%d' % deg), (x + 1.0, y, FHW - 0.75), 0.0, C_DECK)
    for x in (38.5, 65.5):
        for sy in (-1, 1): inst(prop('pd_bank'), (x, sy * 4.6, 0), 0.0, C_DECK); inst(prop('pd_laterne'), (x + 2.2, sy * 5.6, 0), 0.0, C_DECK); inst(prop('rh_kuebel'), (x - 2.2, sy * 5.4, 0), 0.0, C_DECK)
    for sy in (-1, 1):
        inst(prop('saeule'), (FX0 + 2.0, sy * 3.6, 0), 0.0, C_DECK); inst(prop('rh_kuebel'), (FX1 - 1.6, sy * 9.5, 0), 0.0, C_DECK)
        for x in (49.0, 55.0): inst(prop('rh_kuebel'), (x, sy * 10.6, 0), 0.0, C_DECK)
    for (x, y, nm, ang) in ((33.0, -13.0, 'kisten', 0.4), (72.0, 13.4, 'wagen', 1.2), (56.6, 14.2, 'tonne', 0), (47.4, -14.4, 'karre', 2.0), (31.6, -10.6, 'palette', 0.2)): inst(prop(nm), (x, y, 0), ang, C_DECK)
    bodenschrift('TREFFPUNKT', TPX - 9.0, 0, 0.0, 0.42); bodenschrift('EINSATZZENTRALE', FX1 - 4.0, 0, 0.0, 0.36); bodenschrift('AUFZÜGE', FX0 + 4.0, 0, PI, 0.36)
    wegweiser(FX0 + 6.0, 0, 0.0, ['TREFFPUNKT  ·  GERADEAUS', 'WERFT  ◄    ►  AUSRÜSTER'], 5.2, FH - 0.3, 4.2); wegweiser(TPX + 12.0, 0, 0.0, ['EINSATZZENTRALE  ·  GERADEAUS', 'HANDELSKONTOR  ◄    ►  KANTINE'], 5.2, FH - 0.3, 4.6)

    # ---------- Läden ----------
    for sig, (cx, sy) in LADEN.items():
        F = Rahmen(cx, sy * FW / 2, sy * PI / 2, LBW, LBD)
        inst(module('Ladenschale ' + sig, b_pd_ladenschale, LBW, LBD, 20 + ord(sig), sig != 'k'), F.p(0, 0), F.a, C_DECK); inst(module('Ladendecke', b_pd_ladendecke, LBW, LBD), F.p(0, 0), F.a, C_CEIL)
        for side in ('l', 'r'):
            for k in range(6): F.dress('buchtwand', side, 1.75 + 2 * k)
        if sig != 'k':
            for k in range(8): F.dress('buchtwand', 'b', -7.0 + 2 * k)
        laden(F, sig)

    # ---------- Einsatzzentrale ----------
    inst(module('Boden Einsatz', b_pd_boden, ZX1 - ZX0, ZW, 31, 0.25, (-1.7, 1.7)), (ZX0, 0, 0), 0.0, C_DECK)
    inst(module('Decke Einsatz', b_pd_decke, ZX1 - ZX0, ZW, ZH, 'e_panel_h', 4.4), (ZX0, 0, 0), 0.0, C_CEIL)
    for (S_, name, ch, mood, fill) in ((Seite((ZX0, ZW / 2), (ZX1, ZW / 2), (0, -1)), 'BESPRECHUNG', 'B', 'dunkel', ('aushang', 'bank', 'schirm', 'feldh1', 'schrank', 'terminal', 'bank', 'feld2')),
                                         (Seite((ZX1, -ZW / 2), (ZX0, -ZW / 2), (0, 1)), 'KRANKENSTATION', 'K', 'hell', ('feld1', 'bank', 'feuer', 'schrank', 'aushang', 'bank', 'schirm', 'feldh2'))):
        S_.rueck(ZH, 0.0, 9.0); S_.rueck(ZH, 13.0, S_.L)
        S_.flat(module('Durchgang ' + name, b_pd_durchgang, name, ZH), 11.0)
        for (u, nm) in zip((1.0, 3.0, 5.0, 7.0, 15.0, 17.0, 19.0, 21.0), fill): S_.feld(u, nm, HO3)
        p = S_.at(11.0, -0.3); fluegel(p[0], p[1], S_.af, ch, name, mood)
    O_ = Seite((ZX1, ZW / 2), (ZX1, -ZW / 2), (-1, 0))
    for (u0, u1, z0) in ((0.0, 1.0, 0.0), (5.0, 17.0, 0.0), (21.0, 22.0, 0.0), (1.0, 5.0, 4.0), (17.0, 21.0, 4.0)): O_.rueck(ZH, u0, u1, z0)      # die Fenster bleiben frei
    O_.flat('rh_auftragswand', ZW / 2)
    for u in (3.0, ZW - 3.0): O_.flat(module('Fenster 4', b_pd_fenster, 4.0, 1.0, 3.8), u)
    for (u, nm) in ((6.1, 'aushang'), (ZW - 6.1, 'terminal')): O_.dress(nm, u)
    O_.hoch(0.0, ZW, 4.6, ZH)
    for sy in (-1, 1):
        S_ = Seite((ZX0, sy * ZW / 2), (ZX0, sy * 7.4), (1, 0)); S_.rueck(ZH); S_.feld(1.8, 'feldh1' if sy > 0 else 'schrank', HO3)
    for (y, tag) in ((3.8, 'AUFTRÄGE'), (-3.8, 'MISSIONEN')): inst(module('Tresen ' + tag, n_tresen, tag, 'a', 3.2), (ZX1 - 4.4, y, 0), -PI / 2, C_DECK)
    inst(prop('pd_lagetisch'), (ZX0 + 9.0, 0, 0), PI / 2, C_DECK); inst(prop('holo'), (ZX0 + 3.6, 0, 0), 0.0, C_DECK)
    for (x, y, nm, ang) in ((ZX0 + 5.0, 7.6, 'sessel', -PI / 2), (ZX0 + 6.4, 7.6, 'sessel', -PI / 2), (ZX0 + 5.0, -7.6, 'sessel', PI / 2), (ZX0 + 6.4, -7.6, 'sessel', PI / 2), (ZX0 + 13.5, 4.6, 'stehtisch', 0.4),
                            (ZX0 + 13.2, -4.8, 'stehtisch', 1.9), (ZX1 - 1.3, 9.9, 'rh_kuebel', 0), (ZX1 - 1.3, -9.9, 'rh_kuebel', 0), (ZX0 + 1.6, 9.6, 'saeule', 0), (ZX0 + 3.2, -9.4, 'messtisch', 0.3)):
        inst(prop(nm), (x, y, 0), ang, C_DECK)
    bodenschrift('AUFTRÄGE', ZX1 - 7.4, 3.8, 0.0, 0.3); bodenschrift('MISSIONEN', ZX1 - 7.4, -3.8, 0.0, 0.3)

# Schaupuppen des Ausrüsters: Schild, Preis und was die Puppe trägt (Kennungen der Ausrüstungsteile, src/data/figurTeile.ts). Die Figuren stellt das Spiel auf.
PUPPEN = []
TRACHTEN = [('FELDOVERALL', '350', {'overall': 'overall_01', 'stiefel': 'stiefel_01'}),
            ('GEFECHTSSATZ', '2790', {'overall': 'overall_01', 'weste': 'weste_01', 'helm': 'helm_01', 'handschuh': 'handschuh_01', 'stiefel': 'stiefel_01'}),
            ('RAUMANZUG', '4200', {'overall': 'overall_02', 'handschuh': 'handschuh_01', 'stiefel': 'stiefel_02'}),
            ('EVA-SATZ', '7360', {'overall': 'overall_02', 'helm': 'helm_02', 'handschuh': 'handschuh_01', 'stiefel': 'stiefel_02'}),
            ('GEFECHTSHELM GH-2', '900', {'helm': 'helm_01', 'stiefel': 'stiefel_01'}),
            ('PLATTENTRÄGER PT-3', '1100', {'weste': 'weste_01', 'handschuh': 'handschuh_01', 'stiefel': 'stiefel_01'}),
            ('EVA-HELM', '2200', {'helm': 'helm_02', 'stiefel': 'stiefel_02'}),
            ('RAUMSTIEFEL', '780', {'handschuh': 'handschuh_01', 'stiefel': 'stiefel_02'})]
def laden(F, sig):
    if sig == 'w':      # Werft: Schauraum mit fünf Schiffsmodellen, Bauplanwand, Lackmuster, drei Tresen, Triebwerk, Holo
        F.flat('rh_bauplanwand', 'b', 0.0); F.flat('pd_lackmuster', 'b', 5.7); F.dress('regal', 'b', -5.0); F.dress('werkbank', 'b', -7.0)
        for (y, tag) in ((4.6, 'WERFT'), (0.0, 'WERKSTATT'), (-4.6, 'SERVICE')): inst(module('Tresen ' + tag, n_tresen, tag, 'w', 2.6), F.p(10.5, y), F.a - PI / 2, C_DECK)
        for (x, y, t) in ((3.2, -4.9, 'DOHLE'), (3.2, 0.0, 'WISENT'), (3.2, 4.9, 'ELSTER'), (6.7, -3.1, 'MILAN'), (6.7, 3.1, 'HARPYIE')): F.put('pd_modell_' + t, x, y, -PI / 2)
        for (side, nms) in (('l', ('feldh1', 'werkbank', 'regal', 'werkbank', 'schrank', 'gitter')), ('r', ('feldh2', 'gitter', 'werkbank', 'flaschen', 'regal', 'feuer'))):
            for k, nm in enumerate(nms): F.dress(nm, side, 1.75 + 2 * k)
        F.put('rh_triebwerk', 8.2, -6.4, 0.0); F.put('rh_schiffsholo', 8.4, 6.4); F.put('trommel', 1.5, 7.0, 0.5); F.put('wagen', 1.6, -6.9, 0.3)
        F.area(6.5, 0, BH - 0.15, 9.0, 12.0, 520, COOL)
    elif sig == 'h':      # Handelskontor: sechs Erzproben auf Sockeln, Barren, Kurstafeln, Warenregale, zwei Tresen
        for y in (-2.2, 2.2): F.flat('rh_preistafel', 'b', y)
        for y in (-7.0, -5.0, 5.0, 7.0): F.dress('regal', 'b', y)
        for (y, tag) in ((3.2, 'MARKT'), (-3.2, 'LAGER')): inst(module('Tresen ' + tag, n_tresen, tag, 'h', 3.0), F.p(10.5, y), F.a - PI / 2, C_DECK)
        for (x, y, n) in ((3.0, -5.0, 'EISEN'), (3.0, 0.0, 'KUPFER'), (3.0, 5.0, 'TITAN'), (6.2, -2.5, 'IRIDIUM'), (6.2, 2.5, 'EIS'), (6.2, 6.6, 'FERRIT')): F.put('pd_erz_' + n, x, y, -PI / 2)
        F.put('pd_barren', 6.4, -6.4, -PI / 2 + 0.2); F.put('pd_barren', 8.4, -6.9, -PI / 2 - 0.1); F.put('pd_warenregal', 9.0, 6.9, 0.0); F.put('rh_waage', 1.9, 6.6, 0.0); F.put('rh_warenstapel', 1.8, -6.6, 0.2)
        F.put('palette', 4.6, -7.0, 0.3); F.put('karre', 4.4, 7.1, 1.4)
        for (side, nms) in (('l', ('feldh1', 'regal', 'regal', 'schrank', 'regal', 'terminal')), ('r', ('feldh2', 'regal', 'aushang', 'regal', 'regal', 'feuer'))):
            for k, nm in enumerate(nms): F.dress(nm, side, 1.75 + 2 * k)
        F.area(6.5, 0, BH - 0.15, 9.0, 12.0, 460, (1.0, 0.92, 0.8))
    elif sig == 'r':      # Ausrüster: sechs Anzüge auf dem Podest, Waffenwände, Helmregale, Vitrinen, Stiefelbänke
        for y in (-4.2, 4.2): F.flat('rh_helmregal', 'b', y)
        for y in (-6.4, 6.4): F.flat(module('Rucksackwand', n_pd_rucksackwand, 2.4), 'b', y)
        for y in (-1.6, 1.6): F.flat('pd_waffenwand', 'b', y)
        inst(module('Tresen AUSRÜSTER', n_tresen, 'AUSRÜSTER', 'r', 3.6), F.p(10.5, 0.0), F.a - PI / 2, C_DECK)
        for sy in (-1, 1): F.put(module('Podest Anzüge', lambda: (box('Podest', 1.7, 5.0, 0.2, 0, 0, 0.1, M['cab'], 0.02), box('Podestlicht', 1.74, 5.04, 0.03, 0, 0, 0.05, M['e_sig_r'], 0))), 3.4, sy * 4.4)      # Mittelgang 3,8 m
        for k, (x, y, z) in enumerate([(3.4, y, 0.2) for y in (-5.9, -4.4, -2.9, 2.9, 4.4, 5.9)] + [(-1.3, -6.75, 0.0), (-1.3, 6.75, 0.0)]):      # die letzten zwei stehen im Forum neben dem Portal
            (titel, preis, teile) = TRACHTEN[k]
            F.put(module('Puppensockel ' + titel, n_pd_puppensockel, titel, preis + ' CR'), x, y, -PI / 2, z)
            p = F.p(x, y); PUPPEN.append({'x': p[0], 'y': p[1], 'z': round(z + 0.12, 3), 'face': round(math.degrees(F.a) + 180, 1) % 360, 'teile': teile, 'titel': titel})
        for (x, y, nm) in ((6.6, 3.0, 'rh_vitrine'), (6.6, 5.6, 'rh_vitrine2'), (6.6, -3.0, 'rh_vitrine2'), (6.6, -5.6, 'rh_vitrine'), (8.6, 6.6, 'pd_stiefelbank'), (8.6, -6.6, 'pd_stiefelbank')): F.put(nm, x, y, PI / 2)
        for (side, nms) in (('l', ('feldh1', 'spind', 'schrank', 'regal', 'spind', 'terminal')), ('r', ('feldh2', 'schrank', 'spind', 'regal', 'spind', 'feuer'))):
            for k, nm in enumerate(nms): F.dress(nm, side, 1.75 + 2 * k)
        F.area(6.5, 0, BH - 0.15, 9.0, 12.0, 480, COOL)
    else:      # Kantine: Fensterfront mit vier Sitznischen, Theke mit Flaschenwand an der Seite, Bistrotische
        F.flat(module('Fenster 14', b_pd_fenster, 14.0, 1.0, 3.7), 'b', 0.0)
        F.put(module('Fensterdecke', lambda: box('Fensterrand', 0.3, LBW, BH - 3.9, 0.15, 0, 3.9 + (BH - 3.9) / 2, M['wall4'], 0)), LBD, 0.0)
        for y in (-5.4, -1.8, 1.8, 5.4): F.put('pd_sitznische', LBD - 1.25, y)
        F.flat('rh_flaschenwand', 'l', 7.9); F.put('rh_bar', 7.9, 6.5, 0.0)
        for q in range(5): F.put('rh_hocker', 5.9 + q * 1.0, 5.55)
        for (x, y) in ((3.0, 0.6), (5.6, -2.0), (3.2, -5.0), (7.6, 1.6), (7.8, -5.2)):
            F.put('rh_bistro', x, y)
            for k in range(3): F.put('rh_hocker', x + 0.65 * math.cos(k * 2.1 + 0.4), y + 0.65 * math.sin(k * 2.1 + 0.4))
        for k, nm in enumerate(('feldh1', 'feld1', None, None, None, None)):
            if nm: F.dress(nm, 'l', 1.75 + 2 * k)
        for k, nm in enumerate(('bank', 'theke', 'pflanzwand', 'aushang', 'flaschen', 'bank')): F.dress(nm, 'r', 1.75 + 2 * k)
        F.put('rh_kuebel', 1.3, 7.0); F.put('rh_kuebel', 1.3, -7.0)
        F.area(5.5, 0, BH - 0.15, 8.0, 12.0, 300, WARM); F.area(7.9, 5.6, 2.7, 5.0, 0.6, 130, WARM)

# ---------- Flügel hinter den Durchgängen der Einsatzzentrale (Gang und Raum aus dem alten Baukasten, wie build_wing in rh_deck.py) ----------
def fluegel(ox, oy, a, ch, name, mood):      # Ursprung an der Wandfläche, x nach außen
    Rm = Matrix.Rotation(a, 3, 'Z'); O = Vector((ox, oy, 0))
    def Wp(x, y, z=0.0): return O + Rm @ Vector((x, y, z))
    for ((i, j), kind, st) in wing_cells():
        cm, cd = shell(kind, st, mood); loc = Vector((2.0 + 4 * i, 4 * j, 0))
        inst(cm, Wp(*loc), a, C_DECK); inst(cd, Wp(*loc), a, C_CEIL)
        for k in range(4):
            if st[k] != 'W': continue
            for (nm, b) in zip(wing_dress(ch, kind, i, j, k), (-1, 1)):
                inst(dress(nm), Wp(*(loc + Matrix.Rotation(ANG[k], 3, 'Z') @ Vector((0, b, 0)))), a + ANG[k], C_DECK)
        if kind == 'gang' and st[1] == 'D':
            prev = CUR[0]; CUR[0] = C_SIGN; REC[0] = []; w = len(name) * 0.11 * 0.64
            text(name, 0.11, (-1.945, -w / 2, 2.58), LEFT_X, LEFT_Y, M['txtw']); text(name, 0.16, (-1.2, -len(name) * 0.16 * 0.32, 0.0125), FL_X, FL_Y, M['txto'])
            objs = REC[0]; REC[0] = None; CUR[0] = prev; rotz(objs, ANG[1], loc); rotz(objs, a, (ox, oy, 0))
    def put(nm, x, y, ang=0.0): inst(prop(nm), Wp(x - 17.0, y), a + ang, C_DECK)      # Maße wie im alten Flügel (dort begann er bei x = 17)
    if ch == 'K':
        put('utisch', 28.0, 0.0, PI / 2); put('stellwand', 30.6, 2.0, 0.0); put('stellwand', 30.6, -2.0, 0.0); put('hocker', 28.9, -0.9, 0.4)
        put('tropf', 31.8, 2.7); put('tropf', 31.8, -2.7); put('tonne', 25.7, -5.3); put('rh_kuebel', 25.8, 5.2)
    else:
        put('tisch', 29.2, 0.0)
        for q in range(4): put('stuhl', 28.0 + q * 0.8, 1.22, -PI / 2); put('stuhl', 28.0 + q * 0.8, -1.22, PI / 2)
        put('stuhl', 27.0, 0.0, 0.0); put('pult', 32.3, 0.0, PI); put('pendel', 28.4, 0.0); put('pendel', 30.0, 0.0)
        for y in (-4.4, 4.4): put('sessel', 26.3, y, 0.0)
        put('rh_kuebel', 32.3, 5.2); put('rh_kuebel', 32.3, -5.2); put('saeule', 25.9, -5.3)

def lights():
    prev = CUR[0]; CUR[0] = C_LIGHT
    for k in range(4): area('Ganglicht', (2 + 4 * k, 0, KH - 0.2), (0, 0, 0), 3.0, 1.0, 200, COOL)
    area('Hangarseite', (-7, 0, 7), (0, RAD(-50), 0), 6.0, 6.0, 800, COOL)
    for x in (19.5, 26.5):
        for y in (-4.5, 4.5): area('Vorhallenlicht', (x, y, VH - 0.3), (0, 0, 0), 2.4, 2.4, 170, COOL)
    for x in range(34, 74, 8):      # Seitenschiffe: kühles Grundlicht, schwächer als im Mittelschiff
        for sy in (-1, 1): area('Seitenschifflicht', (x, sy * 12.0, FHW - 0.3), (0, 0, 0), 2.6, 2.6, 240, COOL)
    for x in (34.0, 41.0, 63.0, 70.0): area('Mittelschifflicht', (x, 0, FH - 0.4), (0, 0, 0), 3.0, 3.0, 420, COOL)
    area('Trommellicht', (TPX, 0, TZ - 0.8), (0, 0, 0), 6.0, 6.0, 900, WARMW)      # warmes Licht fällt aus der Trommel auf den Treffpunkt
    for sig, (cx, sy) in LADEN.items(): area('Ladenschein', (cx, sy * 13.4, 4.0), (RAD(-55) * sy, 0, 0), 9.0, 1.2, 150, SIGC[sig])      # Farbschein vor jedem Portal
    for (x, y) in STUETZEN: point('Stützenfluter', (x - 0.9, y, 0.5), 18, WARMW, 0.1)
    for x in (79.0, 86.0, 92.0):
        for y in (-5.0, 5.0): area('Einsatzlicht', (x, y, ZH - 0.3), (0, 0, 0), 2.4, 2.4, 190, COOL)
    area('Auftragswandlicht', (ZX1 - 2.6, 0, 3.4), (0, RAD(60), 0), 7.0, 1.0, 140, SIGC['a'])
    CUR[0] = prev

def cameras():
    ob = cam('plan', (48.0, 0, 120), (48.0, 0.001, 0), 50); ob.data.type = 'ORTHO'; ob.data.ortho_scale = 112
    cam('vogel', (4, -52, 52), (50.0, 2.0, 0), 22)
    cam('gang', (1.6, -1.4, 1.65), (30.0, 0.8, 2.6), 20)
    cam('vorhalle', (17.5, -4.0, 1.7), (25.0, 9.0, 2.6), 16); cam('buchtenaufzug', (26.5, 3.0, 1.7), (22.5, -9.0, 2.4), 18)
    cam('hangarebene', (12.0, -1.2, 1.7), (30.0, 0.8, 2.8), 15); cam('deckaufzug', (26.5, 3.0, 1.7), (22.5, -9.0, 2.4), 18)      # Hangarebene: Blick aus dem Korridor auf die Abschlusswand; der Südaufzug mit DECK 3
    cam('vorhalle_west', (29.0, 2.5, 1.7), (16.0, -0.5, 2.8), 15)      # Deck 3: Blick vom Forum her auf die geschlossene Westwand
    cam('forum', (31.5, -3.0, 1.7), (60.0, 2.0, 5.0), 14); cam('forum2', (72.0, 5.0, 1.7), (44.0, -3.0, 5.0), 14)
    cam('treffpunkt', (42.0, -5.5, 1.7), (TPX + 2, 2.0, 5.0), 15); cam('kuppel', (46.0, 3.5, 1.6), (TPX + 1, -1.0, 13.0), 13)
    cam('werft', (41.0, 3.0, 1.7), (41.0, 24.0, 2.0), 15); cam('werft_innen', (36.0, 17.6, 1.65), (45.0, 27.0, 1.5), 16)
    cam('handel', (63.0, 3.0, 1.7), (63.0, 24.0, 2.0), 15); cam('handel_innen', (68.5, 17.6, 1.65), (60.0, 26.0, 1.3), 16)
    cam('ausruester', (41.0, -3.0, 1.7), (41.0, -24.0, 2.0), 15); cam('ausruester_innen', (46.5, -17.6, 1.65), (37.0, -25.0, 1.4), 16)
    cam('kantine', (63.0, -3.0, 1.7), (63.0, -24.0, 2.0), 15); cam('kantine_innen', (57.0, -17.8, 1.65), (66.0, -29.0, 1.5), 16)
    cam('einsatz', (75.5, -3.5, 1.7), (95.0, 1.5, 2.4), 15); cam('einsatz2', (93.0, 8.0, 1.7), (78.0, -6.0, 2.0), 15)
    cam('besprechung', (83.2, 21.0, 1.6), (88.0, 28.0, 1.3), 16); cam('krankenstation', (86.8, -21.0, 1.6), (82.0, -28.0, 1.0), 16)
VIEWS = ['plan', 'vogel', 'gang', 'hangarebene', 'deckaufzug', 'vorhalle', 'vorhalle_west', 'buchtenaufzug', 'forum', 'forum2', 'treffpunkt', 'kuppel', 'werft', 'werft_innen', 'handel', 'handel_innen', 'ausruester', 'ausruester_innen',
         'kantine', 'kantine_innen', 'einsatz', 'einsatz2', 'besprechung', 'krankenstation']
assemble(); lights(); cameras()
EBENE_H = ('gang', 'hangarebene', 'deckaufzug')      # Ansichten der Hangarebene; alle anderen zeigen Deck 3
def ebene_zeigen(e):      # fürs Rendern: nur die Teile einer Ebene ('h' Hangarebene, 'd' Deck 3)
    aus = E_D if e == 'h' else E_H
    for c_ in (C_DECK, C_CEIL, C_SIGN):
        for o in c_.objects:
            if o.get('teil') in (E_H, E_D): o.hide_render = o.get('teil') == aus; o.hide_viewport = o.hide_render
            elif o.get('teil') == 'pd_korridor': o.hide_render = e == 'd'; o.hide_viewport = o.hide_render      # Portal des Korridors samt Schild: auf Deck 3 nicht da
ebene_zeigen('d')
result = {'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'objekte': len(bpy.data.objects)}
