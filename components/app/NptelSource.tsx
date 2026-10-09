'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { Health } from '@/lib/source-health';
import { formatIST } from '@/lib/time';
import { ExtensionSteps } from '../guides/ExtensionGuide';
import { Tile } from '../landing/widgets';

export { EXTENSION_URL } from '../guides/ExtensionGuide';

const BADGE: Record<Health, { label: string; className: string }> = {
  ok: { label: 'Connected', className: 'bg-green/12 text-green' },
  stale: { label: 'Not synced lately', className: 'bg-orange/15 text-[#b45309] dark:text-orange' },
  error: { label: 'Needs attention', className: 'bg-red/10 text-red' },
  off: { label: 'Not set up', className: 'bg-chip text-ink-2' },
};

/** The NPTEL row in Settings → Sources: its status. It comes in through the Lume extension (the row below). */
export function NptelSource({ health, at, message }: { health: Health; at: number | null; message: string | null }) {
  return (
    <li className="border-t border-line py-3">
      <div className="flex items-start gap-3">
        <Tile size={46} className="shrink-0">
          <span className="text-[20px] font-bold tracking-[-0.04em] text-[#7a8c00]">N</span>
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            NPTEL
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[health].className}`}>{BADGE[health].label}</span>
          </p>
          <p className="text-[13px] text-ink-2">{at ? `Last synced ${formatIST(at)}. ${message?.replace(/\.$/, '')}.` : 'Not synced yet.'}</p>
          <p className="text-[13px] text-ink-3">Comes in through the Lume extension (below), every 3 hours while Chrome is open on your laptop.</p>
        </div>
      </div>
    </li>
  );
}

/**
 * The Lume Chrome extension row in Settings → Sources: whether it's reading the student's LMS course
 * posts, and the step-by-step setup with their connection code.
 */
export function ExtensionSource({ health, at, message, code }: { health: Health; at: number | null; message: string | null; code: string }) {
  const [open, setOpen] = useState(health === 'off');

  return (
    <li id="extension" className="scroll-mt-24 border-t border-line py-3">
      <div className="flex items-start gap-3">
        <Tile size={46} className="shrink-0">
          <svg viewBox="0 0 24 24" className="size-[22px] text-blue" aria-hidden>
            <path
              d="M10 3.5a2 2 0 0 1 4 0V5h3a2 2 0 0 1 2 2v3h-1.5a2 2 0 0 0 0 4H19v3a2 2 0 0 1-2 2h-3v-1.5a2 2 0 0 0-4 0V19H7a2 2 0 0 1-2-2v-3h1.5a2 2 0 0 0 0-4H5V7a2 2 0 0 1 2-2h3V3.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            Lume extension
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[health].className}`}>{BADGE[health].label}</span>
          </p>
          <p className="text-[13px] text-ink-2">
            {at ? `Checked your course posts ${formatIST(at)}. ${message?.replace(/\.$/, '')}.` : 'Catches quizzes your teachers only post on the LMS, and brings in NPTEL.'}
          </p>
          <p className="text-[13px] text-ink-3">For Google Chrome on a laptop or computer. Set it up once.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] px-4 text-[13px] sm:ml-[58px] sm:w-auto ${
          health === 'off' ? 'bg-blue font-semibold text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)]' : 'bg-chip font-medium'
        }`}
      >
        {health === 'off' ? 'How to set it up' : 'Setup steps and connection code'}
        <motion.svg viewBox="0 0 24 24" className="size-4" animate={{ rotate: open ? 180 : 0 }} aria-hidden>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="mt-3 rounded-[16px] border border-line p-4 sm:ml-[58px]">
              <ExtensionSteps code={code} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
