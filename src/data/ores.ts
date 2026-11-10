import type { ItemId, RockKind, Zone } from './items';
import type { SectorDef, FieldDef } from './galaxy';

// Welche Erze in welcher Region stecken (Gewichte). Felder können eigene Tabellen haben (FieldDef.ore).
type Table = Partial<Record<ItemId, number>>;
const METAL: Record<Zone, Table> = {
  core: { erz: 7, kupfer: 2, titan: 0.4 },
  border: { erz: 4, kupfer: 2, titan: 3, iridium: 0.2 },
  ferrox: { erz: 3, titan: 3, iridium: 1 },
};
const ICE: Record<Zone, Table> = {
  core: { eis: 10, erz: 0.6 },
  border: { eis: 10, titan: 0.6 },
  ferrox: { eis: 10, iridium: 0.3 },
};
const CRYSTAL: Table = { ferrit: 7, iridium: 1.4, titan: 0.6 };

export function oreTable(sec: SectorDef, f: FieldDef, kind: RockKind): Table {
  if (kind === 'ice') return ICE[sec.faction];
  if (kind === 'crystal') return CRYSTAL;
  return f.ore || METAL[sec.faction];
}

// Welche Gesteinsarten ein Feld hat
export function rockKinds(f: FieldDef): RockKind[] {
  return f.kind === 'metal' ? ['metal'] : f.kind === 'ice' ? ['ice'] : f.kind === 'mixed' ? ['metal', 'ice'] : ['crystal', 'metal'];
}

// Alle Rohstoffe eines Sektors mit Anteil (für Karte und Stationsinfo)
export function sectorOres(sec: SectorDef) {
  const sum: Partial<Record<ItemId, number>> = {};
  for (const f of sec.fields) for (const k of rockKinds(f)) {
    const t = oreTable(sec, f, k), tot = Object.values(t).reduce((a, b) => a + b, 0);
    for (const [id, w] of Object.entries(t)) sum[id as ItemId] = (sum[id as ItemId] || 0) + (w / tot) * f.n;
  }
  const all = Object.values(sum).reduce((a, b) => a + b, 0) || 1;
  return (Object.entries(sum) as [ItemId, number][]).map(([k, v]) => ({ k, p: v / all })).filter(o => o.p > 0.02).sort((a, b) => b.p - a.p);
}
