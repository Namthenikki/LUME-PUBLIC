'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

/** After "Delete my data", the landing page confirms it once. */
export function DeletedNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const url = new URL(location.href);
    if (url.searchParams.get('deleted') !== '1') return;
    setShow(true);
    url.searchParams.delete('deleted');
    history.replaceState(null, '', url.pathname + url.search + url.hash);
    const hide = setTimeout(() => setShow(false), 6000);
    return () => clearTimeout(hide);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.p
          role="status"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="fixed inset-x-4 top-4 z-50 mx-auto max-w-[420px] rounded-[14px] bg-ink px-4 py-3 text-center text-[14px] text-white shadow-card"
        >
          Your Lume was deleted. Nothing of yours is left on it.
        </motion.p>
      )}
    </AnimatePresence>
  );
}
