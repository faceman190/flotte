# Misst an einem Spiel-Schiffsmodell (GLB) die Teile, die fürs Cockpit zählen:
#   blender -b --python cp_mess.py -- <Datei.glb> <Länge> [Muster] [strahl x,y,z]
# Alle Werte in Schiffskoordinaten wie im Spiel (src/models/gltfShips.ts): x rechts, y oben, z nach hinten (Nase −z), Mitte des Modells im Ursprung.
import bpy, sys, re, math
from mathutils import Vector
from mathutils.bvhtree import BVHTree
arg = sys.argv[sys.argv.index('--') + 1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=arg[0]); L = float(arg[1])
pat = re.compile(arg[2] if len(arg) > 2 else '.', re.I)
objs = [o for o in bpy.data.objects if o.type == 'MESH']
lo = [1e9] * 3; hi = [-1e9] * 3
def glb(o, co): w = o.matrix_world @ co; return (-w.x, w.z, w.y)      # Blender → GLB (y oben) → um 180° gedreht (Nase −z)
for o in objs:
    for v in o.data.vertices:
        g = glb(o, v.co)
        for k in range(3): lo[k] = min(lo[k], g[k]); hi[k] = max(hi[k], g[k])
c = [(a + b) / 2 for a, b in zip(lo, hi)]; K = L / (hi[2] - lo[2])
print('MITTE', [round(x, 4) for x in c], 'MASS', round(K, 5), 'GROESSE', [round((b - a) * K, 2) for a, b in zip(lo, hi)])
def ship(o, co): g = glb(o, co); return tuple((g[k] - c[k]) * K for k in range(3))
res = {}; V = []; F = []; FM = []
for o in objs:
    me = o.data; base = len(V); V += [Vector(ship(o, v.co)) for v in me.vertices]
    for p in me.polygons:
        m = me.materials[p.material_index] if me.materials else None; n = m.name if m else '-'
        vs = [base + i for i in p.vertices]
        for i in range(1, len(vs) - 1): F.append((vs[0], vs[i], vs[i + 1])); FM.append(n)
        if not pat.search(n): continue
        r = res.setdefault(n, [[1e9] * 3, [-1e9] * 3, 0])
        for vi in vs:
            for k in range(3): r[0][k] = min(r[0][k], V[vi][k]); r[1][k] = max(r[1][k], V[vi][k])
        r[2] += len(vs) - 2
for n in sorted(res):
    a, b, t = res[n]
    print('MAT %-34s x %6.2f %6.2f  y %6.2f %6.2f  z %7.2f %7.2f  tri %d' % (n[:34], a[0], b[0], a[1], b[1], a[2], b[2], t))
if len(arg) > 3:
    bvh = BVHTree.FromPolygons(V, F); e = Vector([float(x) for x in arg[3].split(',')])
    def ray(d, skip=''):
        d = Vector(d).normalized(); o = e.copy()
        for _ in range(8):
            h = bvh.ray_cast(o, d)
            if h[0] is None: return 'frei'
            n = FM[h[2]]
            if skip and re.search(skip, n, re.I): o = h[0] + d * 0.002; continue
            return '%.2f %s' % ((h[0] - e).length, n.replace(' (Spiel)', ''))
        return '?'
    print('AUGE', tuple(e))
    for nm, d in (('unten', (0, -1, 0)), ('oben', (0, 1, 0)), ('links', (-1, 0, 0)), ('rechts', (1, 0, 0)), ('vorn', (0, 0, -1)), ('hinten', (0, 0, 1))):
        print('STRAHL %-8s %s  | ohne Glas: %s' % (nm, ray(d), ray(d, 'glas')))
    for el in (-60, -45, -30, -15, 0, 15, 30, 45, 60, 80):
        row = []
        for az in (-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150):
            a, b = math.radians(az), math.radians(el); d = (math.sin(a) * math.cos(b), math.sin(b), -math.cos(a) * math.cos(b))
            h = ray(d); row.append(h.split(' ')[0][:4] + (h.split(' ', 1)[1][:3] if ' ' in h else ''))
        print('FELD el %4d: %s' % (el, ' '.join('%-8s' % x for x in row)))
