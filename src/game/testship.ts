import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { G } from './state';
import { world } from './world';
import { stationTemplate } from '../models/stationModels';
import { shipMaterials, kitMeta, KIT_GLOW } from '../models/kit';

// =====================================================================================
// Testschiff „Sperber“ (Alpha 1.14): eigener Entwurf, mit dem Baukasten gebaut (asset-src/neu/testschiff/testschiff_kit.py → station/Testschiff).
// Es zeigt die Bauweise für künftige Schiffe: mitteldichter Rumpf, das gemeinsame Texturblatt, Flächen nach Lackart getrennt, Kleinteile als
// Relief-Decals. Das Schiff liegt als Prototyp vor der Lichtwall-Werft; es ist ein Schaustück (nicht fliegbar, ohne Kollision).
// =====================================================================================

const AT = [300, 46, 210];             // Liegeplatz, von der Werft aus gesehen
let ship: THREE.Group | null = null, navs: THREE.Sprite[] = [], jets: THREE.Sprite[] = [];

function build(): THREE.Group | null {
  const t = stationTemplate('Testschiff');
  if (!t || !t.children[0]) return null;
  const M = shipMaterials(), inner = t.children[0].clone(true);
  inner.position.set(0, 0, 0);          // die Vorlage ist auf ihre Mitte gerückt; hier zählt der Ursprung der Datei
  inner.traverse((o: any) => {
    if (!o.isMesh) return;
    const m = M[o.material?.name]; if (!m) return;
    o.material = m; o.userData.shared = true;
    if (m === M.kit_relief) o.renderOrder = 1;
    if (m === M.kit_decal) o.renderOrder = 2;
  });
  const g = new THREE.Group(); g.add(inner);
  for (const l of kitMeta('Testschiff').lights || []) {
    const jet = l.k === 'cool', sp = new THREE.Sprite(glowMat(KIT_GLOW[l.k] ?? 0xffffff, jet ? 0.32 : 0.7));
    sp.position.set(l.p[0], l.p[1], l.p[2]); sp.scale.setScalar(l.s * (jet ? 0.3 : 0.7));     // Triebwerke im Leerlauf: nur ein schwacher Schein, sonst hellt er die dunklen Düsen auf sp.userData.s = sp.scale.x; g.add(sp);
    (jet ? jets : navs).push(sp);
  }
  return g;
}

export function updateTestShip(_dt: number) {
  const st = world.def?.id === 'lichtwall' && !world.surface ? world.stations.find(s => s.id === 'lichtwerft') : null;
  if (!st) { if (ship?.parent) ship.removeFromParent(); return; }
  if (!ship) { ship = build(); if (!ship) return; ship.rotation.set(0.05, 2.3, -0.04); }
  if (ship.parent !== scene) scene.add(ship);
  ship.position.set(st.x + AT[0], st.y + AT[1] + Math.sin(G.time * 0.21) * 0.6, st.z + AT[2]);
  // Positionslichter blinken, die Triebwerke glimmen im Leerlauf
  const on = (G.time % 1.6) < 0.22;
  navs.forEach((s, i) => { s.scale.setScalar(s.userData.s * (i < 2 ? 1 : on ? 1.25 : 0.35)); });
  for (const s of jets) s.scale.setScalar(s.userData.s * (0.92 + Math.sin(G.time * 9 + s.position.x) * 0.06));
}
