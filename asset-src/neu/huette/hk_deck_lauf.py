# Hüttendeck der Eisenkrone ohne Fenster bauen, Daten schreiben, rendern oder backen:
#   blender.exe -b --python hk_deck_lauf.py -- [Ansicht ... | backen]
# Baut HuetteDeck.blend neu (hk_kit.py, hk_deck_ek.py), schreibt asset-src/data/deck_huette_ek.json und lm2_huette_ek.json.
# Mit Ansichten: Vorschaubilder deck-<ansicht>.jpg. Mit „backen“: danach lm2_raum.py (Lichtraum 2) mit lm2_huette_ek.json; die Datei wird
# dann nicht mehr gespeichert (lm2_raum.py löst die Bausteine auf). Fortschritt in hk-deck.txt, beim Backen zusätzlich lm2-huette.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'hk-deck.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'HuetteDeck.blend'))
    ns = {'__name__': '__main__'}
    for f in ('hk_kit.py', 'hk_deck_ek.py'):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    note('Dreiecke %s' % json.dumps(ns['tris']()))
    views = [v for v in a if v != 'backen']
    if views:
        ns['cycles'](int(os.environ.get('HK_SAMPLES', '64')))
        for v in (list(ns['CAMS']) if views == ['alle'] else views):
            tv = time.time(); ns['view'](v, os.path.join(B, 'deck-' + v.split(' ')[0].lower() + '.jpg'))
            note('%s in %.0f s' % (v, time.time() - tv))
    if 'backen' in a:
        bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
        opt = json.load(open(os.path.join(B, 'lm2_huette_ek.json'), encoding='utf-8'))
        p = os.path.join(B, '..', 'bastion', 'lm2_raum.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__', 'OPT': opt})
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
