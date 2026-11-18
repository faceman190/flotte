// Guides und Neuigkeiten als Markdown (src/content/guides, src/content/neuigkeiten)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: ({ image }) => z.object({
    titel: z.string(),
    kurz: z.string(),             // ein Satz für die Übersicht
    reihe: z.number(),            // Reihenfolge in der Übersicht
    stufe: z.string(),            // Einsteiger, Fortgeschritten …
    bild: image(),
    stand: z.string(),            // Spielversion, auf die sich der Guide bezieht
  }),
});

const neuigkeiten = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/neuigkeiten' }),
  schema: ({ image }) => z.object({
    titel: z.string(),
    datum: z.coerce.date(),
    version: z.string().optional(),
    kurz: z.string(),
    bild: image().optional(),
  }),
});

export const collections = { guides, neuigkeiten };
