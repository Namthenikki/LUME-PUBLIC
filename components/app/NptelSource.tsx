'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { Health } from '@/lib/source-health';
import { formatIST } from '@/lib/time';
import { Tile } from '../landing/widgets';

export const EXTENSION_URL = '/downloads/lume-nptel-extension.zip';

const BADGE: Record<Health, { label: string; className: string }> = {
  ok: { label: 'Connected', className: 'bg-green/12 text-green' },
  stale: { label: 'Not synced lately', className: 'bg-orange/15 text-[#b45309] dark:text-orange' },
  error: { label: 'Needs attention', className: 'bg-red/10 text-red' },
  off: { label: 'Not set up', className: 'bg-chip text-ink-2' },
};

/** The NPTEL row in Settings → Sources: its status, and how to set up the Chrome extension. */
export function NptelSource({ health, at, message, code }: { health: Health; at: number | null; message: string | null; code: string }) {
  const [open, setOpen] = useState(health === 'off');
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt('Copy your connection code:', code);
    }
  };

  return (
    <li className="border-t border-line py-3">
      <div className="flex items-start gap-3">
        <Tile size={46} className="shrink-0">
          <span className="text-[20px] font-bold tracking-[-0.04em] text-orange">N</span>
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            NPTEL
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${BADGE[health].className}`}>{BADGE[health].label}</span>
          </p>
          <p className="text-[13px] text-ink-2">{at ? `Last synced ${formatIST(at)}. ${message?.replace(/\.$/, '')}.` : 'Not synced yet.'}</p>
          <p className="text-[13px] text-ink-3">Synced by the Lume extension in Chrome on your laptop, every 3 hours while Chrome is open.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] bg-chip px-4 text-[13px] font-medium sm:ml-[58px] sm:w-auto"
      >
        {health === 'off' ? 'How to set up' : 'Setup and connection code'}
        <motion.svg viewBox="0 0 24 24" className="size-4" animate={{ rotate: open ? 180 : 0 }} aria-hidden>
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="mt-3 rounded-[14px] bg-sunken p-4 sm:ml-[58px]">
              <p className="text-[13px] text-ink-2">
                Do this once on your laptop. Chrome on a phone can’t run extensions, but your phone still gets every NPTEL reminder and alarm.
              </p>
              <ol className="mt-3 space-y-3 text-[13px]">
                <Step n={1}>
                  <a href={EXTENSION_URL} download className="font-medium text-blue underline-offset-2 hover:underline">
                    Download the extension
                  </a>{' '}
                  and unzip it.
                </Step>
                <Step n={2}>
                  In Chrome, open <Code>chrome://extensions</Code>, turn on <b className="font-medium">Developer mode</b>, click <b className="font-medium">Load unpacked</b> and pick the unzipped folder.
                </Step>
                <Step n={3}>
                  Click the Lume icon in Chrome’s toolbar (pin it from the puzzle-piece menu) and paste your connection code.
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={copy}
                    className="mt-2 flex h-10 w-full items-center justify-center rounded-[12px] bg-blue px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)] sm:w-auto"
                  >
                    {copied ? 'Copied' : 'Copy connection code'}
                  </motion.button>
                </Step>
                <Step n={4}>Log in to NPTEL in that Chrome and open each of your courses once. Lume finds them and syncs right away.</Step>
              </ol>
              <p className="mt-3 text-[12px] text-ink-3">Keep the code private: it lets whoever has it add NPTEL deadlines to your Lume.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-[12px] font-semibold text-ink-2 shadow-card">{n}</span>
      <div className="min-w-0 flex-1 pt-0.5 text-ink">{children}</div>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded-[6px] bg-card px-1.5 py-0.5 text-[12px] [overflow-wrap:anywhere]">{children}</code>;
}
