// Wegweiser zu Fuß (seit 2026-11-26): Ziel des aktuellen Schritts der Geschichte. story.ts setzt die Quelle, interior.ts zeichnet die Marke.
// Eigenes kleines Modul, weil story.ts und interior.ts sich gegenseitig brauchen (beim Laden war walkGoal sonst noch nicht angelegt).
export interface WalkGoal { x?: number; z?: number; tab?: string; label: string; col?: string }
export const walkGoal = { src: null as null | (() => WalkGoal | null) };
