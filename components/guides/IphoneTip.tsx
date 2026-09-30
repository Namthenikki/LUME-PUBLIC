'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useDevice } from '@/components/app/install';
import { IphoneSteps } from './AppGuides';

/** On an iPhone in Safari: add Lume to the Home Screen first, since that's where notifications work. */
export function IphoneTip() {
  const device = useDevice();
  const [open, setOpen] = useState(false);
  if (!device.ready || !device.ios || device.standalone) return null;

  return (
    <div className="rounded-[16px] border border-blue/25 bg-blue/[0.06] p-4 text-left">
      <p className="text-[15px] font-medium">On an iPhone? Add Lume to your Home Screen first</p>
      <p className="mt-0.5 text-[14px] text-ink-2">Reminders only work from the Home Screen app. Then connect from there.</p>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="mt-3 h-10 rounded-[11px] bg-blue px-4 text-[14px] font-medium text-white">
        {open ? 'Hide steps' : 'Show me how'}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-4">
              <IphoneSteps />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
