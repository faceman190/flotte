import { getCollection } from 'astro:content';

// Neuigkeiten neueste zuerst; am selben Tag entscheidet der Dateiname (höhere Version, Website-Beitrag zuerst)
export async function neuigkeiten() {
  return (await getCollection('neuigkeiten')).sort((a, b) => +b.data.datum - +a.data.datum || b.id.localeCompare(a.id));
}
export async function guides() {
  return (await getCollection('guides')).sort((a, b) => a.data.reihe - b.data.reihe);
}
export const datum = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
