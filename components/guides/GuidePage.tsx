import { JsonLd } from '@/components/JsonLd';
import { LumeMark } from '@/components/LumeMark';
import { SiteFooter } from '@/components/SiteFooter';
import { absoluteUrl, GUIDES, SITE_NAME, type Guide } from '@/lib/site';

/** The public pages' header, as on the help page. */
export function GuideHeader() {
  return (
    <header className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-4">
      <a href="/" className="flex min-h-11 items-center gap-2 text-[19px] font-semibold tracking-[-0.02em]">
        <LumeMark className="size-6 text-ink" />
        Lume
      </a>
      <a href="/dashboard" className="flex h-11 items-center rounded-[12px] border border-line bg-white px-4 text-[14px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
        Open Lume
      </a>
    </header>
  );
}

/** A card with a heading, like the help page's sections. */
export function GuideSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[22px] bg-card p-5 shadow-card sm:p-7">
      <h2 className="text-[21px] font-semibold tracking-[-0.02em]">{title}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-2 [&_b]:font-medium [&_b]:text-ink">{children}</div>
    </section>
  );
}

/** An in-text link. */
export function A({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith('http');
  return (
    <a href={href} className="font-medium text-blue underline-offset-2 hover:underline" {...(external && { target: '_blank', rel: 'noreferrer' })}>
      {children}
    </a>
  );
}

/** A small grey box for a link, path or code the student should recognise. */
export function Code({ children }: { children: React.ReactNode }) {
  return <code className="break-all rounded-[6px] bg-sunken px-1.5 py-0.5 text-[13px] text-ink">{children}</code>;
}

/** A guide: breadcrumbs, the title and lead, its sections, a way into Lume, and the other guides. */
export function GuidePage({ guide, lead, children }: { guide: Guide; lead: React.ReactNode; children: React.ReactNode }) {
  const url = absoluteUrl(`/guides/${guide.slug}`);
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: guide.title,
        description: guide.description,
        url,
        mainEntityOfPage: url,
        image: absoluteUrl('/opengraph-image'),
        inLanguage: 'en-IN',
        datePublished: guide.updated,
        dateModified: guide.updated,
        author: { '@type': 'Organization', '@id': absoluteUrl('/#organization'), name: SITE_NAME, url: absoluteUrl('/') },
        publisher: {
          '@type': 'Organization',
          '@id': absoluteUrl('/#organization'),
          name: SITE_NAME,
          url: absoluteUrl('/'),
          logo: { '@type': 'ImageObject', url: absoluteUrl('/icons/512.png') },
        },
        isPartOf: { '@id': absoluteUrl('/#website') },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Lume', item: absoluteUrl('/') },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: absoluteUrl('/guides') },
          { '@type': 'ListItem', position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };
  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="dots min-h-dvh bg-panel pb-16">
      <JsonLd data={structuredData} />
      <GuideHeader />

      <main className="mx-auto max-w-[760px] space-y-4 px-4 sm:px-5">
        <div className="px-1 pb-2 pt-6 sm:pt-10">
          <nav aria-label="Breadcrumb" className="text-[13px] text-ink-3">
            <a href="/" className="hover:text-ink">
              Lume
            </a>
            <span className="px-1.5" aria-hidden>
              /
            </span>
            <a href="/guides" className="hover:text-ink">
              Guides
            </a>
          </nav>
          <h1 className="mt-3 text-[clamp(2rem,6.4vw,2.75rem)] font-medium leading-[1.08] tracking-[-0.035em]">{guide.title}</h1>
          <div className="mt-4 max-w-[58ch] text-[16px] leading-relaxed text-ink-2">{lead}</div>
        </div>

        {children}

        {/* data-nosnippet: search results quote the guide (or its description), not this pitch or the links below */}
        <section data-nosnippet className="rounded-[22px] bg-ink p-6 text-white shadow-card sm:p-8">
          <h2 className="text-[21px] font-semibold tracking-[-0.02em]">A reminder before every deadline</h2>
          <p className="mt-1.5 max-w-[50ch] text-[15px] leading-relaxed text-white/70">
            Lume finds every assignment and quiz on your MUJ LMS, and NPTEL too, and reminds you until each one is done. Free, with no account.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
            <a href="/start" className="flex h-11 items-center justify-center rounded-[12px] bg-blue px-5 text-[14px] font-semibold text-white">
              Connect your LMS
            </a>{' '}
            <a href="/help" className="flex h-11 items-center justify-center rounded-[12px] bg-white/10 px-5 text-[14px] font-medium text-white">
              How to set up
            </a>
          </div>
        </section>

        <nav data-nosnippet aria-label="More guides" className="grid gap-2.5 pt-4 sm:grid-cols-2">
          {others.map((g) => (
            <a key={g.slug} href={`/guides/${g.slug}`} className="rounded-[18px] bg-card p-4 shadow-card transition-transform active:scale-[0.98]">
              <p className="text-[12px] font-semibold text-blue">Guide</p>
              <p className="mt-0.5 text-[15px] font-medium leading-snug">{g.title}</p>
              <p className="mt-1 text-[13px] text-ink-3">{g.short}</p>
            </a>
          ))}
        </nav>
      </main>

      <SiteFooter className="mt-12 max-w-[760px] px-5" />
    </div>
  );
}
