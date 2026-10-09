'use client';

import { Analytics } from '@vercel/analytics/next';

/**
 * Vercel Web Analytics, with query strings and hashes stripped first: the Android app opens Lume with
 * its secret `?lume_device=` pairing token, and other links carry task ids. Only the path is counted.
 */
export function SiteAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: event.url.split(/[?#]/)[0] })} />;
}
