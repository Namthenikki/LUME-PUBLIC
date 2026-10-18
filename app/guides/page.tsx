import type { Metadata } from 'next';
import { GuideHeader } from '@/components/guides/GuidePage';
import { JsonLd } from '@/components/JsonLd';
import { SiteFooter } from '@/components/SiteFooter';
import { absoluteUrl, GUIDES, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Guides for MUJ LMS and NPTEL deadlines',
  description: 'Short guides for Manipal University Jaipur students: your MUJ LMS calendar link, quizzes missing from the calendar, and NPTEL deadline reminders.',
  alternates: { canonical: '/guides' },
};

const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: SITE_NAME, item: absoluteUrl('/') },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: absoluteUrl('/guides') },
  ],
};

export default function GuidesPage() {
  return (
    <div className="dots min-h-dvh bg-panel pb-16">
      <JsonLd data={STRUCTURED_DATA} />
      <GuideHeader />

      <main className="mx-auto max-w-[760px] space-y-4 px-4 sm:px-5">
        <div className="px-1 pb-2 pt-6 sm:pt-10">
          <h1 className="text-[clamp(2.1rem,7vw,3rem)] font-medium leading-[1.05] tracking-[-0.035em]">
            Guides
            <span className="block text-ink-3">for MUJ LMS and NPTEL</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[16px] text-ink-2">Short answers to the deadline questions MUJ students run into, each in a couple of minutes.</p>
        </div>

        <div className="grid gap-2.5">
          {GUIDES.map((g) => (
            <a key={g.slug} href={`/guides/${g.slug}`} className="rounded-[22px] bg-card p-5 shadow-card transition-transform active:scale-[0.99] sm:p-6">
              <h2 className="text-[18px] font-semibold leading-snug tracking-[-0.01em]">{g.title}</h2>
              <p className="mt-1 text-[14px] text-ink-2">{g.description}</p>
            </a>
          ))}
          <a href="/help" className="rounded-[22px] border-2 border-dashed border-[#d9d9df] p-5 sm:p-6">
            <h2 className="text-[18px] font-semibold leading-snug tracking-[-0.01em]">How to set up Lume</h2>
            <p className="mt-1 text-[14px] text-ink-2">Connect your LMS, get the app, turn on reminders and add the extension, in about three minutes.</p>
          </a>
        </div>
      </main>

      <SiteFooter className="mt-12 max-w-[760px] px-5" />
    </div>
  );
}
