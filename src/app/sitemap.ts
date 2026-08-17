import type { MetadataRoute } from 'next';
import { getRegistry } from '@/lib/zo';

export const dynamic = 'force-dynamic';

const BASE = 'https://zeroorigine.com';
const STATIC = ['', '/products', '/genome', '/logbook', '/join', '/privacy', '/terms', '/refund', '/contact'];

// Fail-soft, like every other reader on this site: if the registry cannot be
// read we publish the static routes rather than an empty sitemap. An empty
// sitemap tells Google the site is gone; a partial one tells it the truth.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = STATIC.map((p) => ({
    url: BASE + p, lastModified: now, changeFrequency: 'daily', priority: p === '' ? 1 : 0.7,
  }));
  try {
    // RegistryRow carries project_id ("zo-rigfile"), NOT slug. The story route
    // is /story/<slug>, so the prefix comes off. My first version read .slug,
    // got undefined on every row, and shipped a sitemap with zero story pages
    // while looking perfectly healthy: the fail-soft path fired silently.
    const registry = await getRegistry();
    for (const row of registry || []) {
      const slug = String(row.project_id || '').replace(/^zo-/, '');
      if (slug) pages.push({ url: `${BASE}/story/${slug}`, lastModified: now, priority: 0.6 });
    }
  } catch { /* the static half still ships */ }
  return pages;
}
