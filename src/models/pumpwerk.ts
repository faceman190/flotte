import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { bojeGruppe, decoLaden, decoBereit } from './bojen';
import { collisionSpheres } from './stationModels';
import type { StructureModel } from './structures';

// =====================================================================================
// Pumpwerk am Reifschleier (seit 24.11.2026, Heimstatt Phase 3): zweite Station der Bergbaugilde neben der Eisenkrone, schmilzt Eis aus dem
// Feld. Modell aus Blender (asset-src/neu/sektor3: s3_bau.py, s3_export.py → deco/Pumpwerk und deco/PumpwerkFern, Hintergrund-Paket).
// Lage im Modell (Spielachsen, Blender (x, y, z) → (x, z, −y)): Hangartor bei x = 69,5 nach +X, Ansaugarme nach −X zum Eisfeld.
// Andocken und Start vor dem Tor; innen das übliche Stationsdeck.
// =====================================================================================

export const pumpwerkBereit = () => decoBereit('Pumpwerk') && decoBereit('PumpwerkFern');
export function pumpwerkLaden() { return Promise.all([decoLaden('Pumpwerk'), decoLaden('PumpwerkFern')]).then(r => r[0]); }

const LICHT: [number, number, number, number, number, boolean][] = [      // x, y, z, Farbe, Größe, Lauflicht (sonst Positionslicht)
  [70.5, 7, 14, 0xffa040, 6, true], [70.5, 7, -14, 0xffa040, 6, true], [70.5, -9, 14, 0xffa040, 6, true], [70.5, -9, -14, 0xffa040, 6, true],
  [70, 10, 17.5, 0xff3030, 4, false], [70, 10, -17.5, 0x30ff70, 4, false], [-80, -6, 0, 0xff3030, 4, false],
];
export function buildPumpwerk(): StructureModel | null {
  const near = bojeGruppe('Pumpwerk'); if (!near) return null;
  const far = bojeGruppe('PumpwerkFern');
  const g = new THREE.Group(), lod = new THREE.LOD(), lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  lod.addLevel(near, 0); if (far) lod.addLevel(far, 700);
  g.add(lod);
  for (const [x, y, z, col, size, run] of LICHT) { const sp = new THREE.Sprite(glowMat(col, 1)); sp.position.set(x, y, z); sp.scale.setScalar(size); g.add(sp); (run ? lights : navs).push(sp); }
  // Kollision: Raster über das Nahmodell; vor dem Tor (x > 66) bleibt die Schneise frei
  const sph = collisionSpheres(near, 14).filter(([x, , , r]) => x - r < 66);
  return { g, lights, navs, sph, R: 110, dock: { x: 112, y: -2, z: 0 }, launch: { x: 96, y: -2, z: 0, yaw: -Math.PI / 2 } };
}
