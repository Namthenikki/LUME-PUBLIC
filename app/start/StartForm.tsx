'use client';

import { AnimatePresence, motion, useAnimate } from 'motion/react';
import { useActionState, useEffect, useState } from 'react';
import { CheckIcon } from '@/components/app/icons';
import { connectAction } from './actions';

/** Looks like the Subscribe link (the server checks it properly). */
const LOOKS_RIGHT = /^(https|webcal):\/\/mujlms\.manipal\.edu\/d2l\/le\/calendar\/feed\/user\/feed\.ics\?.*token=[A-Za-z0-9_-]{8,}/i;

export function StartForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(connectAction, null);
  const [field, animate] = useAnimate();
  const [value, setValue] = useState('');
  const [canPaste, setCanPaste] = useState(false);

  useEffect(() => setCanPaste(typeof navigator.clipboard?.readText === 'function'), []);

  // Each failed attempt returns a new state object, so the field shakes every time.
  useEffect(() => {
    if (state?.error) animate(field.current, { x: [0, -8, 8, -5, 5, 0] }, { duration: 0.4 });
  }, [state, animate, field]);

  const paste = async () => {
    try {
      setValue((await navigator.clipboard.readText()).trim());
    } catch {
      // permission refused: long-press the field and paste instead
    }
  };

  const looksRight = LOOKS_RIGHT.test(value.trim());

  return (
    <form action={action} className="w-full text-left">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="link" className="text-[14px] font-medium">
        Your LMS calendar link
      </label>
      <div ref={field} className="relative mt-2">
        <input
          id="link"
          name="link"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://mujlms.manipal.edu/d2l/le/calendar/feed/…"
          className={`h-12 w-full rounded-[12px] border border-line bg-white pl-4 text-[16px] shadow-[0_1px_2px_rgb(0_0_0/0.04)] outline-none transition-shadow placeholder:text-ink-3 focus:border-blue focus:shadow-[0_0_0_4px_rgb(29_110_245/0.15)] ${canPaste || looksRight ? 'pr-[84px]' : 'pr-4'}`}
        />
        <div className="absolute inset-y-0 right-1.5 flex items-center">
          {looksRight ? (
            <span className="flex h-9 items-center gap-1 px-2 text-[13px] font-medium text-green">
              <CheckIcon className="size-4" /> Looks right
            </span>
          ) : (
            canPaste && (
              <button type="button" onClick={paste} className="h-9 rounded-[9px] bg-chip px-3 text-[13px] font-medium text-ink">
                Paste
              </button>
            )
          )}
        </div>
      </div>
      <AnimatePresence>
        {state?.error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden pt-2 text-[14px] text-red"
            role="alert"
          >
            {state.error}
          </motion.p>
        )}
      </AnimatePresence>
      <motion.button
        type="submit"
        disabled={pending}
        whileTap={{ scale: 0.98 }}
        className="mt-4 h-12 w-full rounded-[12px] bg-blue text-[15px] font-medium text-white shadow-[0_10px_24px_-10px_rgb(29_110_245/0.8)] transition-opacity disabled:opacity-70"
      >
        {pending ? 'Reading your LMS…' : 'Connect'}
      </motion.button>
    </form>
  );
}
