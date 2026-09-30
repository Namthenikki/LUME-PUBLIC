'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore } from 'react';
import { pairAlarmDeviceAction } from '@/app/dashboard/actions';
import { isPhoneToken, PHONE_KEY, rememberAppVersion } from './install';

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let installPrompt: InstallPrompt | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The browser's install prompt, captured when it fires so Settings can offer it later. */
export function useInstallPrompt() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => installPrompt,
    () => null,
  );
}

export async function promptInstall(): Promise<boolean> {
  if (!installPrompt) return false;
  await installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  installPrompt = null;
  notify();
  return outcome === 'accepted';
}

/**
 * Registers the service worker, keeps the install prompt, and reloads the page's data when
 * a notification button changes a task in the background.
 */
export function AppBoot() {
  const router = useRouter();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {});
    const onMessage = (e: MessageEvent) => e.data?.type === 'lume:refresh' && router.refresh();
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [router]);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      installPrompt = e as InstallPrompt;
      notify();
    };
    const onFocus = () => document.visibilityState === 'visible' && router.refresh();
    window.addEventListener('beforeinstallprompt', onPrompt);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [router]);

  // The Android app opens Lume with ?lume_app=<version>, plus ?lume_device=<token> until it's paired:
  // remember both, and tidy the URL. The phone is then paired with whoever is signed in, every time the
  // app opens: if a friend signs in on this phone, its alarms become theirs.
  useEffect(() => {
    const url = new URL(location.href);
    const token = url.searchParams.get('lume_device');
    if (token || url.searchParams.has('lume_app')) {
      rememberAppVersion();
      url.searchParams.delete('lume_device');
      url.searchParams.delete('lume_app');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    }
    let phone = isPhoneToken(token) ? token : null;
    try {
      if (phone) localStorage.setItem(PHONE_KEY, phone);
      else phone = localStorage.getItem(PHONE_KEY);
    } catch {
      // storage blocked: pair from the URL only
    }
    if (isPhoneToken(phone)) pairAlarmDeviceAction(phone).catch(() => {});
  }, []);

  return null;
}
