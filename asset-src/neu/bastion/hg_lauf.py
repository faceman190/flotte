# Hangar der Bastion (zweite Runde, bk_hangar2.py) ohne Fenster bauen und rendern:
#   blender.exe -b --python hg_lauf.py -- [ansicht ... | alle] [--pct=60] [--samples=96] [--tris=1] [--dunst=1]
# Baut die Fassung fürs Spiel (SPIEL = True) in BastionHangar2.blend, speichert und rendert nach hg-<ansicht>.jpg. Fortschritt in hg.txt.
# Ohne Dunst (Vorgabe), weil das Spiel keinen hat: Die Bilder sollen zeigen, was das Backen sieht.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = dict(x[2:].split('=') for x in a if x.startswith('--')); a = [x for x in a if not x.startswith('--')]
mark = os.path.join(B, 'hg.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
KURZ = {'ankunft': 'A Ankunft', 'rueckwand': 'B Rueckwand', 'fussweg': 'C Fussweg', 'galerie': 'D Galerie', 'tor': 'E Tor', 'deckmeister': 'F Deckmeister', 'uebersicht': 'G Uebersicht',
        'stellplatz': 'H Stellplatz', 'lager': 'I Lager', 'geraet': 'J Platzgeraet', 'werkstatt': 'K Werkstatt', 'dach': 'L Dach', 'torpfeiler': 'M Torpfeiler', 'wand': 'N Wand', 'fracht': 'O Fracht', 'plan': 'Plan'}
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'BastionHangar2.blend'))
    ns = {'__name__': '__main__', 'SPIEL': True}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_hangar.py', 'bk_halle.py', 'bk_hangar2.py'):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    if 'tris' in opt: note('Dreiecke %s' % json.dumps(ns['tris']()))
    views = list(KURZ) if a == ['alle'] else a
    if views:
        SC = bpy.context.scene; ns['cycles'](int(opt.get('samples', '96')))
        for v in views:
            tv = time.time(); plan = v == 'plan'
            ns['C_ROOF'].hide_render = plan; ns['C_OUT'].hide_render = plan; ns['haze']('dunst' in opt and not plan, 0.06 if plan else 0.0)
            SC.view_settings.exposure = 0.5 if plan else ns['EXPO'][0]
            SC.camera = ns['CAMS'][KURZ[v]]; SC.render.resolution_x, SC.render.resolution_y = 1600, 900; SC.render.resolution_percentage = int(opt.get('pct', '60'))
            SC.render.filepath = os.path.join(B, 'hg-' + v + '.jpg'); bpy.ops.render.render(write_still=True)
            note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
