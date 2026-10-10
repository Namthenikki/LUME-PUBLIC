import type { Metadata, Viewport } from 'next';
import { Figtree, Kalam } from 'next/font/google';
import { SiteAnalytics } from '@/components/SiteAnalytics';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from '@/lib/site';
import './globals.css';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });
const kalam = Kalam({ weight: '400', subsets: ['latin'], variable: '--font-kalam' });

// Google Search Console's HTML-tag verification code (just the content="…" part), set in Vercel.
const googleVerification = process.env.GOOGLE_SITE_VERIFICATION?.trim();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: '%s · Lume' },
  description: SITE_DESCRIPTION,
  applicationName: 'Lume',
  // Pages inherit this whole object (Next merges metadata shallowly), so they never set their own:
  // og:title and og:description follow each page's title and description, and og:image is app/opengraph-image.
  openGraph: { type: 'website', siteName: SITE_NAME, locale: 'en_IN' },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  ...(googleVerification && { verification: { google: googleVerification } }),
  // On iPhone, Lume is added to the Home Screen from Safari and opens full screen from there.
  appleWebApp: { capable: true, title: 'Lume', statusBarStyle: 'default' },
  icons: { apple: '/icons/apple-180.png' },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${figtree.variable} ${kalam.variable}`}>
      <body>
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
