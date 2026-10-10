import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Crawlers may read the public pages; a student's dashboard and the API are nobody's business. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/api/'] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
