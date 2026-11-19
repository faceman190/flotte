import * as THREE from 'three';

// =====================================================================================
// Orte im Sektor (seit Heimstatt Phase 2): Plätze ohne Andocken, die Navigation, Sektorkarte, Fernansicht und HUD kennen sollen,
// z. B. das Akademie-Übungsgelände (akademie.ts) und die Alte Werft (altewerft.ts). Jeder Ort hat eine Wurzelgruppe in seiner Mitte,
// alles Weitere hängt darunter (so kann die Fernansicht den ganzen Ort verkleinert heranrücken, farview.ts).
// Dazu Übungsziele, die die eigenen Geschosse und Raketen treffen können (Zieldrohnen), getrennt von den Ferrox (world.enemies).
// =====================================================================================

export interface Ort { id: string; name: string; x: number; y: number; z: number; R: number; mesh: THREE.Object3D; dot: number }
export interface Ziel {
  type: 'ziel'; x: number; y: number; z: number; r: number; hp: number; maxhp: number; alive: boolean;
  hit: (dmg: number) => void;                 // Treffer durch den Spieler (Laser oder Rakete)
}
export const ORTE: Ort[] = [];
export const ZIELE: Ziel[] = [];

// Beim Leeren des Sektors entfernt jeder Ort seine Einträge selbst (über sectorHooks in world.ts; dieses Modul importiert world nicht,
// sonst entsteht ein Ladezyklus world → … → combat → orte → world)
export function dropOrt(id: string, ziele: Ziel[] = []) {
  for (let i = ORTE.length - 1; i >= 0; i--) if (ORTE[i].id === id) ORTE.splice(i, 1);
  for (let i = ZIELE.length - 1; i >= 0; i--) if (ziele.includes(ZIELE[i])) ZIELE.splice(i, 1);
}

// Hinweise an das HUD (hud.ts ruft sie auf; so muss das HUD die einzelnen Orte nicht kennen)
export interface HudKit {
  proj: (x: number, y: number, z: number) => { x: number; y: number; behind: boolean; cx: number; cy: number; d: number };
  onScreen: (p: any, m?: number) => boolean;
  edgeArrow: (p: any, col: string, label: string) => void;
  brackets: (p: any, r: number, col: string, lw?: number) => void;
}
export const orteHud: ((k: HudKit) => void)[] = [];
export const ortePrompt: (() => string | null)[] = [];      // Eingabehinweis unten (z. B. „[E] Bergen“), wenn keine Station in Reichweite ist
export const orteKey: (() => boolean)[] = [];               // Taste E im All, wenn keine Station in Reichweite ist: true = erledigt

export const ortById = (id: string) => ORTE.find(o => o.id === id) || null;
