import type { Metadata } from 'next';
import { JsonLd } from '@/components/JsonLd';
import { DashboardMockup } from '@/components/landing/DashboardMockup';
import { Features } from '@/components/landing/Features';
import { DeletedNotice } from '@/components/landing/DeletedNotice';
import { Hero } from '@/components/landing/Hero';
import { Questions, QUESTIONS } from '@/components/landing/Questions';
import { LumeMark } from '@/components/LumeMark';
import { SiteFooter } from '@/components/SiteFooter';
import androidRelease from '@/lib/android-release.json';
import { absoluteUrl, SITE_ALTERNATE_NAMES, SITE_DESCRIPTION, SITE_NAME, SITE_PROFILES, SITE_URL } from '@/lib/site';

export const metadata: Metadata = { alternates: { canonical: '/' } };

/**
 * What Lume is, for search engines: the site's name (WebSite is where Google takes the name it shows
 * in results; the alternates are fallbacks, since plain "Lume" belongs to bigger sites), Lume itself
 * with its other names and profiles (so searches for any of them point here), the app, and the
 * questions below.
 */
const STRUCTURED_DATA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': absoluteUrl('/#website'),
      url: absoluteUrl('/'),
      name: SITE_NAME,
      alternateName: [...SITE_ALTERNATE_NAMES, new URL(SITE_URL).host],
      inLanguage: 'en-IN',
      publisher: { '@id': absoluteUrl('/#organization') },
    },
    {
      '@type': 'Organization',
      '@id': absoluteUrl('/#organization'),
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAMES,
      url: absoluteUrl('/'),
      logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/512.png'), width: 512, height: 512 },
      description: SITE_DESCRIPTION,
      sameAs: SITE_PROFILES,
    },
    {
      '@type': 'SoftwareApplication',
      '@id': absoluteUrl('/#app'),
      name: 'Lume',
      alternateName: [SITE_NAME, ...SITE_ALTERNATE_NAMES.filter((n) => n !== 'Lume')],
      url: absoluteUrl('/'),
      description: SITE_DESCRIPTION,
      publisher: { '@id': absoluteUrl('/#organization') },
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Android, iOS, Web',
      image: absoluteUrl('/icons/512.png'),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      audience: { '@type': 'EducationalAudience', educationalRole: 'student' },
      featureList: [
        'Finds every assignment and quiz on the MUJ LMS',
        'NPTEL assignment deadlines through a Chrome extension',
        'Reminders from 2 days before down to 10 minutes before',
        'Rings like an alarm on Android',
        'Mark done from the notification',
      ],
      ...(androidRelease.origin && { downloadUrl: absoluteUrl('/downloads/lume.apk') }),
      isPartOf: { '@id': absoluteUrl('/#website') },
    },
    {
      '@type': 'FAQPage',
      '@id': absoluteUrl('/#questions'),
      mainEntity: QUESTIONS.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
    },
  ],
};

const POINTS = [
  { title: 'Finds every deadline', body: 'Checks your Manipal LMS every hour, and NPTEL through a Chrome extension on your laptop.' },
  { title: 'Reminds you in time', body: 'Reminders from two days before down to ten minutes before, closer together as it gets near.' },
  { title: 'Stops when you’re done', body: 'Tap Mark done on any reminder and the rest are cancelled.' },
];

export default function Landing() {
  return (
    <div className="overflow-x-clip pb-10">
      <JsonLd data={STRUCTURED_DATA} />
      <DeletedNotice />
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4 sm:px-9">
        <a href="/" className="flex min-h-11 items-center gap-2 text-[19px] font-semibold tracking-[-0.02em]">
          <LumeMark className="size-6 text-ink" />
          Lume
        </a>
        <nav className="hidden gap-9 text-[14px] text-ink-2 md:flex">
          <a href="#dashboard" className="transition-colors hover:text-ink">
            Dashboard
          </a>
          <a href="#features" className="transition-colors hover:text-ink">
            Features
          </a>
          <a href="/guides" className="transition-colors hover:text-ink">
            Guides
          </a>
          <a href="/help" className="transition-colors hover:text-ink">
            How to set up
          </a>
        </nav>
        <a
          href="/dashboard"
          className="flex h-11 items-center rounded-[12px] border border-line px-4 text-[14px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:bg-panel"
        >
          Open app
        </a>
      </header>

      <main>
        <Hero />

        <section id="dashboard" className="mx-auto mt-24 max-w-[1400px] scroll-mt-8 sm:mt-32">
          <div className="px-6 text-center sm:px-9">
            <h2 className="text-[clamp(2rem,4.6vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              See what’s due, <span className="text-ink-3">and when</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-[17px] text-ink-2">
              Everything pending, soonest first, with a live countdown on each.
            </p>
          </div>
          <div className="mx-auto mt-12 grid max-w-[1100px] gap-8 px-6 sm:grid-cols-3 sm:gap-0 sm:px-9">
            {POINTS.map((p) => (
              <div key={p.title} className="sm:border-l sm:border-line sm:px-8 sm:first:border-l-0 sm:first:pl-0">
                <p className="font-medium">{p.title}</p>
                <p className="mt-1.5 text-[15px] text-ink-2">{p.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-14">
            <DashboardMockup />
          </div>
        </section>

        <section id="features" className="mx-3 mt-24 scroll-mt-8 rounded-[28px] bg-panel px-4 py-16 sm:mx-4 sm:mt-32 sm:px-10 sm:py-24">
          <div className="mx-auto max-w-[1100px]">
            <div className="text-center">
              <h2 className="text-[clamp(2rem,4.6vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.03em]">Nothing to type in</h2>
              <p className="mx-auto mt-4 max-w-[46ch] text-[17px] text-ink-2">
                Lume fills itself in from your LMS and keeps reminding you until the work is done.
              </p>
            </div>
            <div className="mt-12">
              <Features />
            </div>
          </div>
        </section>

        <section id="questions" className="mx-auto mt-24 max-w-[1100px] scroll-mt-8 px-6 sm:mt-32 sm:px-9">
          <div className="text-center">
            <h2 className="text-[clamp(2rem,4.6vw,3.25rem)] font-medium leading-[1.08] tracking-[-0.03em]">
              Questions, <span className="text-ink-3">answered</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] text-[17px] text-ink-2">What MUJ students ask before connecting their LMS.</p>
          </div>
          <div className="mt-12">
            <Questions />
          </div>
        </section>
      </main>

      <SiteFooter className="mt-20 max-w-[1100px] px-6 sm:px-9" />
    </div>
  );
}
