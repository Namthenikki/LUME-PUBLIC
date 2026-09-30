import { DashboardMockup } from '@/components/landing/DashboardMockup';
import { Features } from '@/components/landing/Features';
import { DeletedNotice } from '@/components/landing/DeletedNotice';
import { Hero } from '@/components/landing/Hero';
import { LumeMark } from '@/components/LumeMark';

const POINTS = [
  { title: 'Finds every deadline', body: 'Checks your Manipal LMS every hour, and NPTEL through a Chrome extension on your laptop.' },
  { title: 'Reminds you in time', body: 'Reminders from two days before down to ten minutes before, closer together as it gets near.' },
  { title: 'Stops when you’re done', body: 'Tap Mark done on any reminder and the rest are cancelled.' },
];

export default function Landing() {
  return (
    <div className="overflow-x-clip pb-4">
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
      </main>

      <footer className="mx-auto mt-10 flex max-w-[1400px] flex-col gap-2 px-6 text-[14px] text-ink-2 sm:flex-row sm:items-center sm:justify-between sm:px-9">
        <span className="flex items-center gap-2 font-semibold text-ink">
          <LumeMark className="size-5" />
          Lume
        </span>
        <a href="/help" className="hover:text-ink">How to set up</a>
        <span>Made at MUJ, Jaipur</span>
      </footer>
    </div>
  );
}
