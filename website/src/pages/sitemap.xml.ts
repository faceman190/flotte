// Sitemap für Suchmaschinen (in der Google Search Console als https://letztecrew.de/sitemap.xml einreichen).
// Feste Seiten plus alle Guides und Neuigkeiten; neue Markdown-Dateien kommen von selbst dazu.
import type { APIRoute } from 'astro';
import { guides, neuigkeiten } from '../lib/inhalt';

export const GET: APIRoute = async ({ site }) => {
  const url = (p: string) => new URL(p, site).href;
  const tag = (d: Date) => d.toISOString().slice(0, 10);
  const news = await neuigkeiten();
  const neu = news[0]?.data.datum;
  const eintraege: { loc: string; lastmod?: string }[] = [
    { loc: url('/'), lastmod: neu && tag(neu) },
    { loc: url('/schiffe/') },
    { loc: url('/guides/') },
    ...(await guides()).map((g) => ({ loc: url(`/guides/${g.id}/`) })),
    { loc: url('/neuigkeiten/'), lastmod: neu && tag(neu) },
    ...news.map((n) => ({ loc: url(`/neuigkeiten/${n.id}/`), lastmod: tag(n.data.datum) })),
    { loc: url('/community/') },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${eintraege.map((e) => `  <url><loc>${e.loc}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
