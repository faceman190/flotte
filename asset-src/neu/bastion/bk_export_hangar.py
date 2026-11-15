# Hangar der Bastion für das Spiel ausgeben. Läuft in BastionHangar.blend, nachdem der Hangar in der Fassung fürs Spiel aufgebaut wurde
# (SPIEL = True vor bk_hangar.py setzen: Öffnung für die Schleuse des Decks, keine Wandfüllungen auf der Galerie).
# ACHTUNG: verändert die Szene. Danach die Datei NICHT speichern.
# Unterschiede zum Deck: gröberes Abspecken (die Halle ist 184 × 162 m), kein Raster in den großen Flächen (das Licht ändert sich nur weich),
# und Boden und Stellplätze werden als Ganzes gebacken (ihr Licht hängt vom Ort ab: Lichtinseln der Strahler, Schein der Wandleuchten).
import bpy, os
OPT = dict({'samples': 96, 'only': None, 'mark': 'export-hangar.txt', 'grid': 0, 'bevel_min': 0.03, 'drop': 0.12, 'font_min': 0.045,
            'colls': [('Hangar', 0), ('Hangar Dach', 1)], 'loose': None, 'loose_cell': 36.0, 'unique': ['H Boden', 'H Platz'], 'hide': ['Dunst'],
            'meta': None, 'glb': 'BastionHangar.glb', 'json': 'hangar_bastion.json'}, **globals().get('OPT', {}))
_p = os.path.join(os.path.dirname(bpy.data.filepath), 'bk_export.py')
exec(compile(open(_p, encoding='utf-8').read(), _p, 'exec'))
