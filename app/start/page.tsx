import { redirect } from 'next/navigation';
import { IphoneTip } from '@/components/guides/IphoneTip';
import { LmsLinkGuide } from '@/components/guides/LmsLinkGuide';
import { AlarmTile, AppTile, CheckTile } from '@/components/landing/widgets';
import { currentUserId } from '@/lib/session';
import { StartForm } from './StartForm';

export const metadata = { title: 'Connect your LMS · Lume' };

export default async function StartPage({ searchParams }: PageProps<'/start'>) {
  const { next } = await searchParams;
  const target = typeof next === 'string' && next.startsWith('/dashboard') ? next : '/dashboard';
  const uid = await currentUserId();
  if (uid) redirect(target);

  return (
    <div className="flex min-h-dvh flex-col p-3 sm:p-4">
      <section className="dots relative flex flex-1 justify-center overflow-hidden rounded-[28px] border border-line bg-panel px-5 py-12 sm:px-6 sm:py-16">
        <div className="pointer-events-none absolute left-[8%] top-[14%] hidden rotate-[-8deg] lg:block" aria-hidden>
          <div className="bob">
            <CheckTile />
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-[16%] right-[9%] hidden rotate-[9deg] lg:block" aria-hidden>
          <div className="bob" style={{ '--float-delay': '-2.5s' } as React.CSSProperties}>
            <AlarmTile />
          </div>
        </div>

        <div className="flex w-full max-w-[440px] flex-col items-center text-center">
          <div className="bob">
            <AppTile />
          </div>
          <h1 className="mt-7 text-[clamp(2rem,8vw,2.9rem)] font-medium leading-[1.05] tracking-[-0.035em]">
            Connect your LMS,
            <span className="block text-ink-3">that’s all it takes</span>
          </h1>
          <p className="mt-4 text-[16px] text-ink-2">Paste your MUJ LMS calendar link once. Lume finds every deadline and reminds you before each one.</p>

          <div className="mt-7 w-full space-y-4">
            <IphoneTip />
            <StartForm next={target} />
          </div>

          <div className="mt-6 w-full rounded-[20px] bg-card p-5 text-left shadow-card">
            <h2 className="text-[16px] font-semibold">Where’s my calendar link?</h2>
            <p className="mt-0.5 text-[14px] text-ink-2">Takes about a minute.</p>
            <div className="mt-4">
              <LmsLinkGuide />
            </div>
          </div>

          <p className="mt-5 max-w-[40ch] text-[13px] text-ink-3">
            Keep the link to yourself: it’s your key to Lume. Lume only reads your LMS calendar (no grades, no messages), and you can delete everything
            from Settings at any time.
          </p>
        </div>
      </section>
    </div>
  );
}
