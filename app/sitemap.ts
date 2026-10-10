import type { MetadataRoute } from 'next';
import { absoluteUrl, GUIDES } from '@/lib/site';

/** The public pages. lastModified is when a page last changed in substance, not the build time, so search engines can trust it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: absoluteUrl('/'), lastModified: '2026-10-10', priority: 1 },
    { url: absoluteUrl('/help'), lastModified: '2026-10-10', priority: 0.8 },
    { url: absoluteUrl('/start'), lastModified: '2026-10-10', priority: 0.7 },
    { url: absoluteUrl('/guides'), lastModified: '2026-10-10', priority: 0.6 },
    ...GUIDES.map((g) => ({ url: absoluteUrl(`/guides/${g.slug}`), lastModified: g.updated, priority: 0.6 })),
  ];
}
