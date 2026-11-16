# Lichträume ohne Fenster backen (Blender im Hintergrund): baut das Deck frisch und führt lm_raum.py darin aus.
#   blender.exe -b --python lm_lauf.py -- <deck.py> <datei.blend> <opt.json>
# Beispiel Bastion: … -- bk_deck_d.py BastionDeckD.blend lm_bastion.json
# opt.json: die Einstellungen für lm_raum.py (OPT), z. B. rooms, glb, json, mark. Die .blend wird nach dem Bauen gespeichert, nach dem
# Backen nicht mehr (lm_raum.py löst die Bausteine der Räume auf).
import bpy, os, sys, json, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:]
deck, blend, opt = a[0], a[1], json.load(open(os.path.join(B, a[2]), encoding='utf-8'))
bpy.ops.wm.read_homefile(use_empty=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, blend))
mark = os.path.join(B, 'bau-' + os.path.splitext(blend)[0] + '.txt')
try:
    ns = {'__name__': '__main__'}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_med.py', deck):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    open(mark, 'w', encoding='utf-8').write('ok ' + str(ns.get('result')))
    bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
    p = os.path.join(B, 'lm_raum.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__', 'OPT': opt})
except Exception:
    open(mark, 'w', encoding='utf-8').write('FEHLER ' + traceback.format_exc()[-2500:])
