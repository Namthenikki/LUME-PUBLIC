'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useActionState, useState, useTransition } from 'react';
import { changeLinkAction, deleteDataAction, signOutAction } from '@/app/dashboard/actions';
import { LmsLinkGuide } from '../guides/LmsLinkGuide';
import { Tile } from '../landing/widgets';
import { disablePush } from './push-client';
import { Panel } from './ui';

/** The LMS row in Settings → Sources: status, and a way to paste a new link if the old one stops working. */
export function LmsSource({ ok, detail }: { ok: boolean | null; detail: string }) {
  const [open, setOpen] = useState(ok === false);
  const [state, action, pending] = useActionState(changeLinkAction, null);

  return (
    <li className="py-2">
      <div className="flex items-start gap-3">
        <Tile size={46} className="shrink-0">
          <span className="text-[20px] font-bold tracking-[-0.04em] text-blue">M</span>
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
            Manipal LMS
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ok === false ? 'bg-red/10 text-red' : 'bg-green/12 text-green'}`}>
              {ok === false ? 'Needs a new link' : 'Connected'}
            </span>
          </p>
          <p className="text-[13px] text-ink-2">{detail}</p>
          <p className="text-[13px] text-ink-3">Checked every hour, across all your courses.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="mt-3 h-10 w-full rounded-[12px] bg-chip px-4 text-[13px] font-medium sm:ml-[58px] sm:w-auto"
      >
        {open ? 'Close' : 'Paste a new link'}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-[14px] bg-sunken p-4 sm:ml-[58px]">
              <p className="text-[13px] text-ink-2">
                {ok === false
                  ? 'Your LMS link stopped working, usually because it was reset in the LMS. Copy it again and paste it here.'
                  : 'Only needed if you reset your calendar link in the LMS. Your deadlines and settings stay.'}
              </p>
              <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  name="link"
                  type="url"
                  inputMode="url"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="https://mujlms.manipal.edu/d2l/le/calendar/feed/…"
                  className="h-11 min-w-0 flex-1 rounded-[12px] border border-line bg-white px-3 text-[16px] outline-none placeholder:text-ink-3 focus:border-blue sm:text-[14px]"
                />
                <button type="submit" disabled={pending} className="h-11 rounded-[12px] bg-blue px-4 text-[14px] font-semibold text-white disabled:opacity-70">
                  {pending ? 'Checking…' : 'Save link'}
                </button>
              </form>
              {state && <p className={`mt-2 text-[13px] ${state.error ? 'text-red' : 'text-green'}`} role="status">{state.error ?? state.ok}</p>}
              <details className="group mt-3">
                <summary className="cursor-pointer text-[13px] font-medium text-blue">Where do I find it?</summary>
                <div className="pt-3">
                  <LmsLinkGuide pasteHere={false} />
                </div>
              </details>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/** Privacy in two sentences, signing this browser out, and deleting everything. */
export function YourDataCard() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();

  const signOut = () =>
    start(async () => {
      await disablePush().catch(() => {}); // this browser stops getting this Lume's reminders
      await signOutAction();
    });

  const remove = () => {
    if (!confirming) return setConfirming(true);
    start(async () => {
      await disablePush().catch(() => {});
      await deleteDataAction();
    });
  };

  return (
    <Panel title="Your data">
      <p className="text-[13px] text-ink-2">
        Lume keeps your deadlines, your LMS link (encrypted) and the devices you turned reminders on for. Nobody else can see them.
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="min-w-0 flex-1 basis-48 text-[13px] text-ink-2">Sign this device out. Paste your LMS link to come back.</p>
        <button type="button" onClick={signOut} disabled={pending} className="h-10 rounded-[12px] border border-line px-4 text-[13px] font-medium disabled:opacity-60">
          Sign out
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="min-w-0 flex-1 basis-48 text-[13px] text-ink-2">
          {confirming ? 'This deletes your deadlines, reminders and phones from Lume, on every device. Tap again to delete.' : 'Delete everything Lume has for you.'}
        </p>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className={`h-10 rounded-[12px] px-4 text-[13px] font-medium disabled:opacity-60 ${confirming ? 'bg-red text-white' : 'border border-line text-red'}`}
        >
          {pending && confirming ? 'Deleting…' : confirming ? 'Delete for good' : 'Delete my data'}
        </button>
      </div>
    </Panel>
  );
}
