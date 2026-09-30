'use client';

import { motion, useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { useDevice } from '@/components/app/install';
import androidRelease from '@/lib/android-release.json';
import { AlarmTile, AppTile, CheckTile, ReminderCard, SourcesCard, StickyNote, WeekCard } from './widgets';

const ease = [0.22, 1, 0.36, 1] as const;

/**
 * A floating widget. It drifts in from its side of the hero, settles at its tilt, bobs gently,
 * and shifts a little with the pointer (deeper widgets shift more).
 */
function Float({
  children,
  className,
  rotate,
  from,
  delay,
  depth,
}: {
  children: React.ReactNode;
  className: string;
  rotate: number;
  from: [number, number];
  delay: number;
  depth: number;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${className}`}
      style={{ transform: `translate(calc(var(--mx, 0) * ${depth}px), calc(var(--my, 0) * ${depth}px))`, transition: 'transform 600ms var(--ease-soft)' }}
    >
      <motion.div
        initial={{ opacity: 0, x: from[0], y: from[1], rotate: rotate * 2.2 }}
        animate={{ opacity: 1, x: 0, y: 0, rotate }}
        transition={{ duration: 1.3, delay, ease }}
      >
        <div className="bob" style={{ '--float-delay': `${-delay * 3}s` } as React.CSSProperties}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export function Hero() {
  const device = useDevice();
  const panel = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  function onPointerMove(e: React.PointerEvent) {
    if (reduced || e.pointerType !== 'mouse') return;
    const r = panel.current!.getBoundingClientRect();
    panel.current!.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * -2));
    panel.current!.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * -2));
  }

  return (
    <section
      ref={panel}
      onPointerMove={onPointerMove}
      className="dots relative mx-3 overflow-hidden rounded-[28px] border border-line bg-panel sm:mx-4"
    >
      {/* Widgets around the headline, from tablet width up */}
      <div className="hidden md:block" aria-hidden>
        <Float className="-left-6 top-10 lg:left-6" rotate={-9} from={[-160, -40]} delay={0.25} depth={14}>
          <div className="h-[230px] w-[220px] rounded-[18px] bg-white shadow-float" />
        </Float>
        <Float className="left-2 top-6 lg:left-16" rotate={7} from={[-180, -60]} delay={0.35} depth={18}>
          <StickyNote />
        </Float>
        <Float className="left-10 top-[210px] lg:left-24" rotate={-6} from={[-120, 40]} delay={0.5} depth={26}>
          <CheckTile />
        </Float>

        <Float className="-right-16 top-16 lg:right-2" rotate={9} from={[180, -40]} delay={0.4} depth={16}>
          <ReminderCard />
        </Float>
        <Float className="right-[236px] top-[96px] lg:right-[298px]" rotate={-8} from={[140, -80]} delay={0.55} depth={28}>
          <AlarmTile />
        </Float>

        <Float className="-bottom-16 -left-8 lg:left-12" rotate={-4} from={[-140, 120]} delay={0.6} depth={12}>
          <WeekCard />
        </Float>
        <Float className="-bottom-14 -right-10 lg:right-16" rotate={5} from={[160, 120]} delay={0.7} depth={12}>
          <SourcesCard />
        </Float>
      </div>

      <div className="relative flex flex-col items-center px-6 pb-16 pt-14 text-center sm:pb-24 md:pb-[190px] md:pt-24">
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 16, delay: 0.1 }}
          className="bob"
        >
          <AppTile />
        </motion.div>

        <h1 className="mt-9 text-[clamp(2.6rem,7.4vw,5rem)] font-medium leading-[1.02] tracking-[-0.035em]">
          <motion.span
            className="block"
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.2, ease }}
          >
            Every deadline,
          </motion.span>
          <motion.span
            className="block text-ink-3"
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, delay: 0.32, ease }}
          >
            all in one place
          </motion.span>
        </h1>

        <motion.p
          className="mt-6 max-w-[34ch] text-[17px] text-ink-2"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45, ease }}
        >
          Assignments and quizzes from your Manipal LMS and NPTEL, with reminders until they&apos;re done.
        </motion.p>

        <motion.div
          className="mt-9 flex w-full max-w-[340px] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.55, ease }}
        >
          <motion.a
            href="/dashboard"
            className="inline-flex h-12 items-center justify-center rounded-[12px] bg-blue px-7 text-[15px] font-medium text-white shadow-[0_10px_24px_-10px_rgb(29_110_245/0.8)]"
            whileHover={{ y: -2, boxShadow: '0 16px 30px -12px rgb(29 110 245 / 0.9)' }}
            whileTap={{ scale: 0.97 }}
          >
            Get started
          </motion.a>
          {device.ios ? (
            <motion.a
              href="/help#iphone"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-line bg-white px-6 text-[15px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
              whileTap={{ scale: 0.97 }}
            >
              Add to iPhone
            </motion.a>
          ) : androidRelease.origin && (
            <motion.a
              href="/downloads/lume.apk"
              download
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] border border-line bg-white px-6 text-[15px] font-medium shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <svg viewBox="0 0 20 20" className="size-[18px]" aria-hidden>
                <path d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 15.5h12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Get the Android app
            </motion.a>
          )}
        </motion.div>

        {/* The NPTEL extension runs in Chrome on a laptop, so phones don't get this line. */}
        <motion.p
          className="mt-5 hidden max-w-[46ch] text-[14px] text-ink-2 sm:block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.7, ease }}
        >
          Doing NPTEL?{' '}
          <a href="/downloads/lume-nptel-extension.zip" download className="font-medium text-blue underline-offset-2 hover:underline">
            Get the Chrome extension
          </a>{' '}
          for your laptop, then{' '}
          <a href="/help#nptel" className="font-medium text-blue underline-offset-2 hover:underline">
            follow the setup steps
          </a>
          .
        </motion.p>

        {/* On phones the widgets sit below the button instead of around the headline */}
        <div className="relative mt-14 h-[250px] w-full max-w-[340px] md:hidden" aria-hidden>
          <motion.div
            className="absolute left-0 top-0"
            initial={{ opacity: 0, y: 30, rotate: -12 }}
            animate={{ opacity: 1, y: 0, rotate: -5 }}
            transition={{ duration: 1.1, delay: 0.6, ease }}
          >
            <div className="bob origin-top-left scale-[0.8]">
              <StickyNote />
            </div>
          </motion.div>
          <motion.div
            className="absolute right-0 top-16"
            initial={{ opacity: 0, y: 30, rotate: 14 }}
            animate={{ opacity: 1, y: 0, rotate: 6 }}
            transition={{ duration: 1.1, delay: 0.75, ease }}
          >
            <div className="bob origin-top-right scale-[0.72]" style={{ '--float-delay': '-2s' } as React.CSSProperties}>
              <ReminderCard />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
