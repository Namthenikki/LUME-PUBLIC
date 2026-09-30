'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Health } from '@/lib/source-health';
import { LumeMark } from '../LumeMark';
import { BellIcon, DoneIcon, HomeIcon, SettingsIcon } from './icons';
import { SyncButton } from './SyncButton';
import { ago, useNow } from './time';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: HomeIcon, count: 'pending' },
  { href: '/dashboard/reminders', label: 'Reminders', icon: BellIcon, count: 'reminders' },
  { href: '/dashboard/done', label: 'Done', icon: DoneIcon, count: 'done' },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon, count: null },
] as const;

export type ShellCounts = { pending: number; reminders: number; done: number };

function useActive() {
  const path = usePathname();
  return (href: string) => (href === '/dashboard' ? path === href : path.startsWith(href));
}

/** Desktop: a sidebar like the dashboard mockup. */
const DOT: Record<Exclude<Health, 'off'>, string> = {
  ok: 'bg-green shadow-[0_0_0_3px_rgb(18_183_106/0.15)]',
  stale: 'bg-orange shadow-[0_0_0_3px_rgb(245_158_11/0.18)]',
  error: 'bg-red shadow-[0_0_0_3px_rgb(240_68_56/0.15)]',
};

export function Sidebar({ counts, lastSync, nptel }: { counts: ShellCounts; lastSync: number | null; nptel: Health }) {
  const isActive = useActive();
  const now = useNow(30_000);
  return (
    <aside className="sticky top-0 hidden h-dvh w-[240px] shrink-0 flex-col border-r border-line bg-card px-4 py-5 lg:flex">
      <Link href="/" className="flex min-h-11 items-center gap-2 px-2 text-[18px] font-semibold tracking-[-0.02em]">
        <LumeMark className="size-6" />
        Lume
      </Link>
      <div className="mt-6">
        <SyncButton variant="wide" />
      </div>
      <p className="mt-7 px-3 text-[12px] text-ink-3">Menu</p>
      <nav className="mt-1.5 space-y-0.5">
        {NAV.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 rounded-[11px] px-3 py-2.5 text-[14px] transition-colors ${active ? 'font-medium text-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink'}`}
            >
              {active && <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-[11px] bg-chip" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <item.icon className="relative size-[18px]" />
              <span className="relative flex-1">{item.label}</span>
              {item.count && counts[item.count] > 0 && <span className="relative text-[12px] text-ink-3">{counts[item.count]}</span>}
            </Link>
          );
        })}
      </nav>
      <p className="mt-7 px-3 text-[12px] text-ink-3">Sources</p>
      <div className="mt-1.5 space-y-0.5 text-[14px]">
        <div className="flex items-center justify-between px-3 py-2">
          Manipal LMS
          <span className="size-1.5 rounded-full bg-green shadow-[0_0_0_3px_rgb(18_183_106/0.15)]" />
        </div>
        <Link href="/dashboard/settings" className={`flex items-center justify-between rounded-[11px] px-3 py-2 hover:bg-sunken ${nptel === 'off' ? 'text-ink-3' : ''}`}>
          NPTEL
          {nptel === 'off' ? <span className="text-[11px]">Set up</span> : <span className={`size-1.5 rounded-full ${DOT[nptel]}`} />}
        </Link>
      </div>
      <p className="mt-auto px-3 text-[12px] text-ink-3">{lastSync && now ? `Synced ${ago(lastSync, now)}` : lastSync ? '' : 'Not synced yet'}</p>
    </aside>
  );
}

/** Phones: a slim sticky header. */
export function MobileHeader({ lastSync }: { lastSync: number | null }) {
  const now = useNow(30_000);
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-page/80 px-4 pb-2.5 pt-[max(10px,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
      <Link href="/dashboard" className="flex min-h-11 items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
        <LumeMark className="size-[22px]" />
        Lume
      </Link>
      <div className="flex items-center gap-1">
        <span className="text-[12px] text-ink-3">{lastSync && now ? `Synced ${ago(lastSync, now)}` : ''}</span>
        <SyncButton variant="icon" />
      </div>
    </header>
  );
}

/** Phones: bottom tabs, clear of the gesture bar. */
export function TabBar({ counts }: { counts: ShellCounts }) {
  const isActive = useActive();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line/70 bg-card/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {NAV.map((item) => {
          const active = isActive(item.href);
          const count = item.count ? counts[item.count] : 0;
          return (
            <Link key={item.href} href={item.href} className={`relative flex h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? 'text-blue' : 'text-ink-3'}`}>
              {active && <motion.span layoutId="tab-active" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-blue" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <span className="relative">
                <item.icon className="size-[22px]" />
                {item.count === 'pending' && count > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red px-1 text-[10px] font-semibold text-white">{count}</span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Desktop: the date above each page. */
export function TopBar() {
  const now = useNow(60_000);
  return (
    <div className="hidden items-center justify-between text-[13px] text-ink-2 lg:flex">
      <span>{now ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', weekday: 'long', day: 'numeric', month: 'long' }).format(now) : ''}</span>
    </div>
  );
}
