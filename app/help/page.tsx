import type { Metadata } from 'next';
import { AndroidSteps, IphoneSteps } from '@/components/guides/AppGuides';
import { ExtensionSteps } from '@/components/guides/ExtensionGuide';
import { LmsLinkGuide } from '@/components/guides/LmsLinkGuide';
import { Pill, Step, Steps } from '@/components/guides/Steps';
import { LumeMark } from '@/components/LumeMark';
import { SiteFooter } from '@/components/SiteFooter';
import androidRelease from '@/lib/android-release.json';

export const metadata: Metadata = {
  title: { absolute: 'How to set up Lume: MUJ LMS and NPTEL deadline reminders' },
  description:
    'Set up Lume in about three minutes: connect your MUJ LMS calendar link, get the Android or iPhone app, turn on reminders, and add the Chrome extension.',
  alternates: { canonical: '/help' },
};

const CONTENTS = [
  { href: '#lms', title: 'Connect your LMS', note: 'The only must-do' },
  { href: '#app', title: 'Get the app', note: 'Android or iPhone' },
  { href: '#reminders', title: 'Turn on reminders', note: 'One tap' },
  { href: '#extension', title: 'Add the extension', note: 'LMS quiz posts + NPTEL' },
];

function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6 rounded-[22px] bg-card p-5 shadow-card sm:p-7">
      <h2 className="text-[21px] font-semibold tracking-[-0.02em]">{title}</h2>
      {sub && <p className="mt-1 text-[15px] text-ink-2">{sub}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Fix({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[15px] font-medium">{q}</p>
      <p className="mt-1 text-[14px] text-ink-2">{children}</p>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="dots min-h-dvh bg-panel pb-16">
      <header className="mx-auto flex max-w-[760px] items-center justify-between px-5 py-4">
        <a href="/" className="flex min-h-11 items-center gap-2 text-[19px] font-semibold tracking-[-0.02em]">
          <LumeMark className="size-6 text-ink" />
          Lume
        </a>
        <a href="/dashboard" className="flex h-11 items-center rounded-[12px] border border-line bg-white px-4 text-[14px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)]">
          Open Lume
        </a>
      </header>

      <main className="mx-auto max-w-[760px] space-y-4 px-4 sm:px-5">
        <div className="px-1 pb-2 pt-6 sm:pt-10">
          <h1 className="text-[clamp(2.1rem,7vw,3rem)] font-medium leading-[1.05] tracking-[-0.035em]">
            Set up Lume
            <span className="block text-ink-3">in about three minutes</span>
          </h1>
          <p className="mt-4 max-w-[46ch] text-[16px] text-ink-2">Do these in order. Only the first one is required; the rest make sure Lume can reach you.</p>
        </div>

        <nav className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {CONTENTS.map((c, i) => (
            <a key={c.href} href={c.href} className="rounded-[16px] bg-card p-3.5 shadow-card transition-transform active:scale-[0.98]">
              <span className="text-[12px] font-semibold text-blue tabular-nums">{i + 1}</span>
              <p className="mt-0.5 text-[14px] font-medium leading-snug">{c.title}</p>
              <p className="text-[12px] text-ink-3">{c.note}</p>
            </a>
          ))}
        </nav>

        <Section id="lms" title="1. Connect your LMS" sub="Lume reads your deadlines from your LMS calendar link. There’s no account or password: the link is your key.">
          <LmsLinkGuide pasteHere={false} />
          <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
            <a href="/start" className="flex h-11 items-center justify-center rounded-[12px] bg-blue px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(29_110_245/0.8)]">
              Paste it in Lume
            </a>
            <p className="text-[13px] text-ink-3">Keep the link to yourself. New phone later? Paste the same link and everything comes back.</p>
          </div>
        </Section>

        <Section id="app" title="2. Get the app" sub="Lume works in any browser, but the app is what reaches you in time.">
          <div id="android" className="scroll-mt-6">
            <h3 className="text-[16px] font-semibold">Android</h3>
            <p className="mt-0.5 text-[14px] text-ink-2">Rings like an alarm 12 hours, 6 hours, 30 minutes and 10 minutes before each deadline.</p>
            {androidRelease.origin ? (
              <a
                href="/downloads/lume.apk"
                download
                className="mt-4 flex h-11 w-full items-center justify-center rounded-[12px] bg-blue px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(29_110_245/0.8)] sm:w-auto sm:inline-flex"
              >
                Download for Android
              </a>
            ) : (
              <p className="mt-3 rounded-[12px] bg-sunken px-4 py-3 text-[13px] text-ink-2">The Android app isn’t available yet. Check back soon.</p>
            )}
            <div className="mt-5">
              <AndroidSteps />
            </div>
          </div>

          <div id="iphone" className="mt-7 scroll-mt-6 border-t border-line pt-6">
            <h3 className="text-[16px] font-semibold">iPhone</h3>
            <p className="mt-0.5 text-[14px] text-ink-2">
              There’s no App Store app: Lume goes on your Home Screen from Safari, and sends notifications from there. It needs iOS 16.4 or newer. iPhones don’t let
              web apps ring alarms, so you get notifications only.
            </p>
            <div className="mt-5">
              <IphoneSteps />
            </div>
          </div>
        </Section>

        <Section id="reminders" title="3. Turn on reminders" sub="Do this on each phone or laptop you want reminders on.">
          <Steps>
            <Step n={1} title="Open Lume" />
            <Step n={2} title="Tap Turn on on the blue card, then Allow" look={<Pill strong>Turn on</Pill>}>
              No blue card? Go to Settings → Notifications and switch it on there.
            </Step>
            <Step n={3} title="Send yourself a test" look={<Pill>Send a test</Pill>}>
              In Settings → Notifications. It should arrive within a few seconds.
            </Step>
          </Steps>
          <p className="mt-5 rounded-[12px] bg-sunken px-4 py-3 text-[13px] text-ink-2">
            Reminders come 2 days, 1 day, 6, 3 and 1 hours, 30 and 10 minutes before each deadline. From 12 AM to 8 AM they arrive silently and no alarms ring.
          </p>
        </Section>

        <Section
          id="extension"
          title="4. Add the Lume extension"
          sub="Some teachers post quizzes only on the LMS (in a course’s Activity Feed or Announcements), not in the LMS calendar. This small Chrome extension reads those posts so Lume can remind you. It also brings in NPTEL."
        >
          <span id="nptel" className="block scroll-mt-6" aria-hidden />
          <ExtensionSteps />
        </Section>

        <Section id="fix" title="If something’s off">
          <Fix q="No reminders arrive">Settings → Notifications → Send a test. If nothing comes, allow notifications for Lume (or your browser) in your phone’s settings.</Fix>
          <Fix q="The Android alarm doesn’t ring">
            Long-press the Lume icon → App info: allow Notifications, and set Battery to Unrestricted. On silent, the alarm only vibrates.
          </Fix>
          <Fix q="Settings says “Needs a new link”">Your LMS link was reset. Copy it again from the LMS and paste it under Settings → Sources.</Fix>
          <Fix q="New phone, or cleared your browser">Open Lume and paste your LMS link again. Everything comes back, including what you marked done.</Fix>
          <Fix q="Done with Lume">Settings → Your data → Delete my data removes everything, on every device.</Fix>
        </Section>
      </main>

      <SiteFooter className="mt-12 max-w-[760px] px-5" />
    </div>
  );
}
