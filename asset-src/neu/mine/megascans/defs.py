# Moduldefinitionen für den Minen-Baukasten (Quelle: Megascans-Paket "Old Mine", Ordner Old Mine-dc4dc139\mine_raw).
# Je Modul: Quelle (Ordner-id), Variante (Index des Objekts in der FBX, None = alle), Dreiecksziel, Texturgrößen col/nrm/orm,
# Metallwert für den B-Kanal der orm, Drehung um Z (Grad, damit Gänge/Loren entlang X laufen), Zielmaße oder Skalierung, GLB-Datei.
import os

RAW = r'C:\Users\seeli\Downloads\Old Mine-dc4dc139\mine_raw'
ROOT = r'C:\Users\seeli\Downloads\MinenBaukasten'
WORK = os.path.join(ROOT, 'work')          # je Modul eine .blend mit dem fertigen Low-Poly-Objekt
TEX = os.path.join(ROOT, 'out', 'tex')     # gebackene / verkleinerte Texturen (PNG, Zwischenstand)
OUT = os.path.join(ROOT, 'out')

def M(name, src, tris, col, nrm, orm, file, var=None, metal=0.0, rotz=0, size=None, scale=None, note=''):
    return dict(name=name, src=src, tris=tris, col=col, nrm=nrm, orm=orm, file=file, var=var, metal=metal, rotz=rotz,
                size=size, scale=scale, note=note)

G, A, L, B, K, BO = 'MineAlt_Gang', 'MineAlt_Ausbau', 'MineAlt_Loren', 'MineAlt_Boden', 'MineAlt_Kram', 'MineAlt_Boegen'
MODULES = [
    M('gang_a', 'wcbpdfsdw', 200000, 4096, 4096, 2048, G, size=(3.2, 3.2, None)),
    M('gang_b', 'wcbpdgcdw', 200000, 4096, 4096, 2048, G),
    M('bogen_a', 'wdpncgrdw', 150000, 4096, 4096, 2048, BO, metal=0.3),
    M('bogen_b', 'wdpncihdw', 150000, 2048, 2048, 2048, BO, metal=0.3),
    M('bogen_c', 'wdpnchedw', 120000, 2048, 2048, 2048, BO, metal=0.3),
    M('bogen_d', 'wdpnchtdw', 120000, 2048, 2048, 2048, BO, metal=0.3),

    M('stempel_1', 'tgmrafyfa', 15000, 2048, 2048, 1024, A),
    M('stempel_2', 'tgmsdc0fa', 15000, 2048, 2048, 1024, A),
    M('stempel_3', 'tgnhcaafa', 15000, 2048, 2048, 1024, A),
    M('stempel_4', 'tgnhde0fa', 15000, 2048, 2048, 1024, A),
    M('stempel_kurz', 'tgnidj2fa', 15000, 2048, 2048, 1024, A),
    M('kappe', 'udrffjjqx', 15000, 2048, 2048, 1024, A),
    M('holz_1', 'uebpbd3fa', 15000, 2048, 2048, 1024, A),
    M('holz_2', 'uebpbetfa', 15000, 2048, 2048, 1024, A),
    M('holz_3', 'uebpbhcfa', 15000, 2048, 2048, 1024, A),
    M('stahlstempel_1', 'ugfmehgfa', 15000, 2048, 2048, 1024, A, metal=0.5),
    M('stahlstempel_2', 'ugfndjqfa', 15000, 2048, 2048, 1024, A, metal=0.5),
    M('stahlstempel_3', 'uhcgdblfa', 15000, 2048, 2048, 1024, A, metal=0.5),

    M('lore_kohle', 'ueujednfa', 80000, 2048, 2048, 1024, L, metal=0.4),
    M('lore_leer', 'ufmodhpfa', 60000, 2048, 2048, 1024, L, metal=0.45, rotz=90),
    M('wagen_holz', 'ujzhahdfa', 80000, 2048, 2048, 1024, L, metal=0.3, rotz=90),
    M('lore_saecke', 'ujzlbgzfa', 60000, 2048, 2048, 1024, L, metal=0.25, rotz=90),
    M('wagen_leer', 'vcyjedsfa', 50000, 2048, 2048, 1024, L, metal=0.45, rotz=90),
    M('radsatz', 'ueihabqfa', 20000, 1024, 1024, 1024, L, metal=0.45, rotz=90),

    M('gleisbett', 'wcskfaidw', 60000, 2048, 2048, 2048, B, var=0, metal=0.15),
    M('bohlenboden', 'ufekadxdw', 80000, 2048, 2048, 2048, B, metal=0.1),
    M('verladung', 'ufekaffdw', 120000, 4096, 4096, 2048, B, metal=0.1),
    M('gleis_a', 'ufekaeedw', 40000, 2048, 2048, 2048, B, metal=0.3),
    M('gleis_b', 'ufekaevdw', 40000, 2048, 2048, 2048, B, metal=0.3),
    M('rampe', 'ufekab3dw', 40000, 2048, 2048, 2048, B, metal=0.2),
    M('geroell_a', 'ul4lehiga', 40000, 2048, 2048, 2048, B),
    M('geroell_b', 'vmhdagb', 30000, 2048, 2048, 2048, B),
    M('kohlegrus', 'wjfidjgdb', 20000, 2048, 2048, 2048, B),

    M('faeustel', 'uc1mfe1fa', 8000, 1024, 1024, 1024, K, metal=0.3),
    M('spaten', 'uckmaibfa', 8000, 1024, 1024, 1024, K, metal=0.3),
    M('spitzhacke', 'ucylebxfa', 8000, 1024, 1024, 1024, K, metal=0.3),
    M('schaufel', 'uddjeelqx', 8000, 1024, 1024, 1024, K, metal=0.3),
    M('helm', 'udklcbuiw', 8000, 1024, 1024, 1024, K, scale=1.6, note='Scan zu klein, ×1,6 skaliert'),
    M('lampe', 'vgyidfpaw', 10000, 1024, 1024, 1024, K, metal=0.4),
    M('nagel_a', 'tkpmbcnjw', 1000, 512, 512, 512, K, metal=0.5),
    M('nagel_b', 'tkqmdbnhw', 1000, 512, 512, 512, K, metal=0.5),
    M('keil_1', 'ricaS', 2000, 512, 512, 512, K, var=0),
    M('keil_2', 'ricaS', 2000, 512, 512, 512, K, var=1),
    M('eisenkeil', 'tl2effiva', 2000, 512, 512, 512, K, var=0, metal=0.5),
    M('brett', 'tezvbcuda', 3000, 512, 512, 512, K),
    M('erz', 'wd3efb0', 2000, 512, 512, 512, K),
]
BYNAME = {m['name']: m for m in MODULES}

SURFACES = ['uebmddyn', 'ueijag3ew', 'uh1nbhzlw', 'ueknfaclw', 'shnnehua', 'venoehv', 'ud0nfezew', 'ud4ofc0fw']
DECALS = ['sinqgag', 'smtinfh']
