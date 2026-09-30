'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { BellIcon } from './icons';
import { enablePush, type PushState, pushState, refreshPushToken } from './push-client';

const COPY: Partial<Record<PushState, { title: string; body: string }>> = {
  off: { title: 'Turn on reminders', body: 'Lume can only remind you before deadlines if notifications are on for this device.' },
  blocked: { title: 'Notifications are blocked', body: 'Allow notifications for this site in your browser’s settings, then come back.' },
  unconfigured: { title: 'Reminders aren’t set up yet', body: 'Add the Firebase web keys to the app’s settings to turn on push notifications.' },
};

/** The first-open "Enable notifications" flow. Once on, it quietly keeps this device's token fresh. */
export function NotificationPrompt() {
  const [state, setState] = useState<PushState>('loading');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pushState().then((s) => {
      setState(s);
      if (s === 'on') refreshPushToken().catch(() => {});
    });
  }, []);

  const turnOn = async () => {
    setBusy(true);
    setError(null);
    try {
      setState(await enablePush());
    } catch {
      setError('Couldn’t turn on notifications. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const copy = COPY[state];
  return (
    <AnimatePresence>
      {copy && (
        <motion.div
          initial={{ opacity: 0, y: -10, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -10, height: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="-mx-3 -mb-1 overflow-hidden px-3 pb-6"
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3.5 rounded-[20px] bg-linear-to-br from-blue to-[#4f8ff8] p-4 text-white sm:flex-nowrap sm:p-5">
            <span className="grid size-11 shrink-0 place-items-center self-start rounded-[13px] bg-white/15 sm:size-12 sm:self-center">
              <motion.span animate={{ rotate: [0, -14, 12, -8, 0] }} transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 2.6 }} className="grid">
                <BellIcon className="size-6" />
              </motion.span>
            </span>
            <div className="min-w-0 flex-1 basis-[calc(100%-60px)] sm:basis-auto">
              <p className="font-semibold">{copy.title}</p>
              <p className="text-[14px] leading-snug text-white/80">{error ?? copy.body}</p>
            </div>
            {state === 'off' && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={turnOn}
                disabled={busy}
                className="h-11 w-full shrink-0 rounded-[12px] bg-white px-5 text-[14px] font-semibold text-blue disabled:opacity-70 sm:w-auto"
              >
                {busy ? 'Turning on…' : 'Turn on'}
              </motion.button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
