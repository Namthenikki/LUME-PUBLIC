import { LumeMark } from '@/components/LumeMark';
import { GUIDES, NOT_AFFILIATED } from '@/lib/site';

const COLUMNS = [
  {
    title: 'Lume',
    links: [
      { href: '/start', label: 'Connect your LMS' },
      { href: '/help', label: 'How to set up' },
      { href: '/guides', label: 'All guides' },
    ],
  },
  { title: 'Guides', links: GUIDES.map((g) => ({ href: `/guides/${g.slug}`, label: g.label })) },
];

/** The public pages' footer: every guide one tap away, and what Lume is (and isn't). */
export function SiteFooter({ className = '' }: { className?: string }) {
  return (
    <footer className={`mx-auto text-[14px] text-ink-2 ${className}`}>
      <div className="flex flex-col gap-7 border-t border-line pt-8 sm:flex-row sm:justify-between sm:gap-10">
        <div className="max-w-[40ch]">
          <span className="flex items-center gap-2 font-semibold text-ink">
            <LumeMark className="size-5" />
            Lume for MUJ
          </span>
          <p className="mt-2 text-[13px] text-ink-3">Made at MUJ, Jaipur. {NOT_AFFILIATED}</p>
        </div>
        <div className="flex gap-10 sm:gap-16">
          {COLUMNS.map((c, i) => (
            <nav key={c.title} aria-label={c.title} className={i === 0 ? 'shrink-0' : 'min-w-0'}>
              <p className="text-[13px] font-medium text-ink">{c.title}</p>
              <ul className="mt-1.5">
                {c.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="flex min-h-9 items-center transition-colors hover:text-ink">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
    </footer>
  );
}
