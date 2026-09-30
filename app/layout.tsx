import type { Metadata, Viewport } from 'next';
import { Figtree, Kalam } from 'next/font/google';
import './globals.css';

const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree' });
const kalam = Kalam({ weight: '400', subsets: ['latin'], variable: '--font-kalam' });

export const metadata: Metadata = {
  title: 'Lume',
  description: 'Every Manipal LMS and NPTEL deadline in one place, with reminders until it is done.',
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
      <body>{children}</body>
    </html>
  );
}
