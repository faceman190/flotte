# Flächen und Fläche je Material der Cockpit-Sammlung: blender -b Cockpit<Name>.blend --python cp_zaehl.py
import bpy
for o in sorted(bpy.data.collections['Cockpit'].objects, key=lambda o: -len(o.data.polygons)):
    print('ZAEHL %-28s %7d Flächen  %7.1f m²' % (o.data.materials[0].name, len(o.data.polygons), sum(p.area for p in o.data.polygons)))
