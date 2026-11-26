# Blick vom Pilotensitz durch den vorhandenen Rumpf (zum Einpassen): blender -b --python cp_blick.py -- <schiff> <Länge> x,y,z(Spiel)
import bpy, sys, os
B = os.path.dirname(os.path.abspath(__file__)); exec(open(os.path.join(B, 'cp_lib.py'), encoding='utf-8').read())
arg = sys.argv[sys.argv.index('--') + 1:]; name = arg[0]; L = float(arg[1]); e = [float(x) for x in arg[2].split(',')]
neu_szene(); coll, netze = rumpf_laden(os.path.join(B, '..', '..', 'glb', 'ship', name + '.glb'), L)
auge = (e[0], -e[2], e[1])
for nm, az, el in (('vorn', 0, -8), ('links', -70, -10), ('rechts', 70, -10), ('oben', 0, 50)):
    cam = kamera(nm, auge, az, el); bild(os.path.join(B, 'blick-%s-%s.jpg' % (name.lower(), nm)), cam, 960, 540, 24, welt=3.0, sonne=((0.3, -0.4, 0.8), 3.0))
