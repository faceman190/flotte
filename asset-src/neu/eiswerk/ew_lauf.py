# Deck des Pumpwerks ohne Fenster bauen, Daten schreiben, rendern oder backen:
#   blender.exe -b --python ew_lauf.py -- [Ansicht ... | alle | backen]
# Baut EiswerkDeck.blend neu (../huette/hk_kit.py, ew_kit.py, ew_deck.py), schreibt asset-src/data/deck_pumpwerk.json und lm2_pumpwerk.json.
# Mit Ansichten: Vorschaubilder deck-<ansicht>.jpg. Mit „backen“: danach ../bastion/lm2_raum.py (Lichtraum 2) mit lm2_pumpwerk.json; die Datei
# wird dann nicht mehr gespeichert (lm2_raum.py löst die Bausteine auf). Fortschritt in ew-deck.txt, beim Backen zusätzlich lm2-pumpwerk.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'ew-deck.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'EiswerkDeck.blend'))
    ns = {'__name__': '__main__'}
    for p in (os.path.join(B, '..', 'huette', 'hk_kit.py'), os.path.join(B, 'ew_kit.py'), os.path.join(B, 'ew_deck.py')):
        exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    note('Dreiecke %s' % json.dumps(ns['tris']()))
    views = [v for v in a if v != 'backen']
    if views:
        ns['cycles'](int(os.environ.get('HK_SAMPLES', '48')))
        for v in (list(ns['CAMS']) if views == ['alle'] else views):
            tv = time.time(); ns['view'](v, os.path.join(B, 'deck-' + v.split(' ')[0].lower() + '.jpg'))
            note('%s in %.0f s' % (v, time.time() - tv))
    if 'backen' in a:
        bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
        opt = json.load(open(os.path.join(B, 'lm2_pumpwerk.json'), encoding='utf-8'))
        p = os.path.join(B, '..', 'bastion', 'lm2_raum.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__', 'OPT': opt})
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
