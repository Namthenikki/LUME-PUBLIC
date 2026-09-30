'use client';

import { motion } from 'motion/react';
import { useTransition } from 'react';
import { undoDoneAction } from '@/app/dashboard/actions';

/** Moves a finished task back to pending. */
export function UndoButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.94 }}
      disabled={pending}
      onClick={() => start(() => undoDoneAction(id))}
      className="h-9 shrink-0 rounded-[12px] bg-chip px-3.5 text-[13px] font-medium disabled:opacity-50"
    >
      {pending ? 'Undoing…' : 'Undo'}
    </motion.button>
  );
}
