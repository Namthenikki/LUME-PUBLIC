'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState, useTransition } from 'react';
import { syncNowAction } from '@/app/dashboard/actions';
import { SyncIcon } from './icons';

/** Checks the LMS right now instead of waiting for the hourly sync. */
export function SyncButton({ variant }: { variant: 'wide' | 'icon' }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);

  const sync = () =>
    start(async () => {
      const result = await syncNowAction().catch(() => ({ ok: false, message: 'Sync failed. Try again.' }));
      setNote(result);
      setTimeout(() => setNote(null), 3200);
    });

  const icon = (
    <motion.span animate={pending ? { rotate: 360 } : { rotate: 0 }} transition={pending ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : { duration: 0 }} className="grid">
      <SyncIcon className="size-[18px]" />
    </motion.span>
  );

  return (
    <div className="relative">
      {variant === 'wide' ? (
        <button
          type="button"
          onClick={sync}
          disabled={pending}
          className="flex w-full items-center gap-2.5 rounded-[11px] border border-line bg-card px-3 py-2.5 text-[14px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-colors hover:bg-sunken"
        >
          {icon}
          {pending ? 'Syncing…' : 'Sync now'}
        </button>
      ) : (
        <button type="button" onClick={sync} disabled={pending} aria-label="Sync now" className="grid size-11 place-items-center rounded-full text-ink-2 active:bg-chip">
          {icon}
        </button>
      )}
      <AnimatePresence>
        {note && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`absolute z-40 mt-2 whitespace-nowrap rounded-[10px] bg-ink px-3 py-1.5 text-[12px] text-page shadow-float ${variant === 'icon' ? 'right-0' : 'left-0'} ${note.ok ? '' : 'bg-red text-white'}`}
            role="status"
          >
            {note.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
