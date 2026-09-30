'use client';

import { motion } from 'motion/react';
import { useTransition } from 'react';
import { unpairAlarmDevicesAction } from '@/app/dashboard/actions';
import { Tile } from '../landing/widgets';
import { APK_URL, appLink, PHONE_KEY, updateLink, useDevice } from './install';
import { ago, useNow } from './time';
import { AndroidSteps } from '../guides/AppGuides';
import { Panel } from './ui';

export function AndroidCard({ phones, apkReady }: { phones: { label: string; lastSeenAt: number }[]; apkReady: boolean }) {
  const device = useDevice();
  const inApp = device.inAndroidApp;
  const now = useNow(60_000);
  const [pending, start] = useTransition();

  return (
    <Panel title="Android app">
      <div className="flex items-start gap-4">
        <Tile size={46} className="shrink-0">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
            <circle cx="12" cy="13.2" r="8" fill="none" stroke="#0e0e11" strokeWidth="2.6" />
            <path d="M12 13.2V9.6" stroke="#0e0e11" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="12" cy="3.4" r="2.7" fill="#22c1f1" />
          </svg>
        </Tile>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-medium">
            {inApp ? 'You’re in the Lume app' : 'Get the Lume app'}
            {inApp && device.appVersion !== null && !device.update && <span className="rounded-full bg-chip px-2 py-0.5 text-[11px] font-medium text-ink-2">Up to date</span>}
          </p>
          <p className="text-[13px] text-ink-2">
            Your phone rings like an alarm 12 hours, 6 hours, 30 minutes and 10 minutes before a deadline, until you mark it done or snooze it. On silent it vibrates instead. Never between 12 AM and 8 AM.
          </p>
        </div>
      </div>

      {device.ios && (
        <p className="mt-4 rounded-[12px] bg-sunken px-4 py-3 text-[13px] text-ink-2">
          Alarms need an Android phone. On iPhone, Lume sends you notifications instead, once it’s on your Home Screen.
        </p>
      )}

      {!device.ios && !inApp && !apkReady && (
        <p className="mt-4 rounded-[12px] bg-sunken px-4 py-3 text-[13px] text-ink-2">The Android app isn’t available yet. Check back soon.</p>
      )}

      {!device.ios && !inApp && apkReady && (
        <div className="mt-4 space-y-3">
          <motion.a
            href={APK_URL}
            download
            whileTap={{ scale: 0.97 }}
            className="flex h-11 w-full items-center justify-center rounded-[12px] bg-blue text-[14px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(29_110_245/0.8)] sm:w-auto sm:px-5"
          >
            Download for Android
          </motion.a>
          <details className="group">
            <summary className="cursor-pointer text-[13px] font-medium text-blue">How to install it</summary>
            <div className="pt-3">
              <AndroidSteps />
            </div>
          </details>
        </div>
      )}

      {inApp && device.update && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-sunken p-3 pl-4">
          <div className="min-w-0 flex-1 basis-48">
            <p className="text-[14px] font-medium">A new version is ready</p>
            <p className="text-[13px] text-ink-2">
              {device.update === 'in-app'
                ? 'It installs over this one. Your alarms stay set.'
                : 'This version can’t update itself. Download the new one and open the file to install it over this one.'}
            </p>
          </div>
          <motion.a
            {...updateLink(device.update)}
            whileTap={{ scale: 0.96 }}
            className="flex h-10 w-full items-center justify-center rounded-[12px] bg-blue px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)] sm:w-auto"
          >
            {device.update === 'in-app' ? 'Install update' : 'Download update'}
          </motion.a>
        </div>
      )}

      {device.android && (inApp || apkReady) && (
        <div className="mt-4 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <a
              href={appLink('test-alarm', '/dashboard/settings')}
              className="flex h-11 items-center justify-center rounded-[12px] bg-blue px-3 text-center text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)]"
            >
              Ring a test alarm
            </a>
            <a href={appLink('sync', '/dashboard/settings')} className="flex h-11 items-center justify-center rounded-[12px] bg-chip px-3 text-center text-[13px] font-medium">
              Sync alarms now
            </a>
          </div>
          <p className="text-[13px] text-ink-3">
            The test rings 10 seconds later, or just vibrates if your phone is on silent. Nothing at all? Long-press the Lume icon → App info → Notifications → Allow, and Battery → No restrictions.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="text-[13px] text-ink-2">
          {phones.length === 0
            ? 'No phone has alarms yet.'
            : `${phones.length} ${phones.length === 1 ? 'phone rings' : 'phones ring'} alarms${now ? `, last checked in ${ago(Math.max(...phones.map((p) => p.lastSeenAt)), now)}` : ''}.`}
        </p>
        {phones.length > 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await unpairAlarmDevicesAction();
                // Otherwise the next visit would pair this phone again straight away.
                try {
                  localStorage.removeItem(PHONE_KEY);
                } catch {
                  // nothing stored
                }
              })
            }
            className="h-10 rounded-[12px] border border-line px-4 text-[13px] font-medium text-red disabled:opacity-60"
          >
            Stop alarms
          </button>
        )}
      </div>
    </Panel>
  );
}
