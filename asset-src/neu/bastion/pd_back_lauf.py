# Deck 3 (dritte Fassung) fürs Spiel ausgeben (Blender im Hintergrund): baut das Deck frisch, schreibt die Spieldaten (pd_spiel.py) und backt den Lichtraum 2.
#   blender.exe -b --python pd_back_lauf.py -- [nur_daten]
# Ergebnis: asset-src/data/deck_bastion3.json, asset-src/glb/base/Lichtraum2Deck3.glb, asset-src/data/lichtraum2_deck3.json, asset-src/tex-world/l2_pd_*_lit@*.png
# Fortschritt: pd-spiel.txt (Aufbau) und lm2-deck3.txt (Backen). Die .blend wird nach dem Aufbau gespeichert, nach dem Backen nicht mehr.
import bpy, os, sys, json, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'pd-spiel.txt')
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'BastionDeck3Spiel.blend'))
    ns = {'__name__': '__main__', 'NUR_HELFER_RH': True}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_med.py', 'rh_kit.py', 'rh_deck.py', 'rh_leben.py', 'pd_kit.py', 'pd_deck.py', 'pd_spiel.py'):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    open(mark, 'w', encoding='utf-8').write('ok ' + json.dumps(ns['spiel'], ensure_ascii=False))
    if 'nur_daten' not in a:
        bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
        opt = json.load(open(os.path.join(B, 'lm2_deck3.json'), encoding='utf-8'))
        p = os.path.join(B, 'lm2_raum.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__', 'OPT': opt})
except Exception:
    open(mark, 'w', encoding='utf-8').write('FEHLER ' + traceback.format_exc()[-3000:])
