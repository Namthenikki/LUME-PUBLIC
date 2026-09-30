'use client';

import { useEffect, useState } from 'react';
import androidRelease from '@/lib/android-release.json';

const IN_APP_KEY = 'lume:in-android-app';
const APP_VERSION_KEY = 'lume:app-version';

export type Device = {
  /** Running inside the Lume Android app (a Trusted Web Activity opens with an android-app:// referrer). */
  inAndroidApp: boolean;
  /** An Android phone, in a browser. */
  android: boolean;
  /** An iPhone or iPad. Lume installs there from Safari (Add to Home Screen); there's no iPhone app. */
  ios: boolean;
  /** Already installed as a web app (opened from the home screen). */
  standalone: boolean;
  /** The Lume app's version code. Only apps that can update themselves report it. */
  appVersion: number | null;
  /**
   * A newer Lume app is out: 'in-app' installs it from inside the app, 'download' needs the APK
   * downloaded (older apps can't update themselves).
   */
  update: 'in-app' | 'download' | null;
  /** Known after the first client render; before that, render nothing install-related. */
  ready: boolean;
};

/** The Lume app opens the site with ?lume_app=<version code>. Remembered, since later visits (from a notification) don't carry it. */
export function rememberAppVersion(): number | null {
  const reported = Number(new URLSearchParams(location.search).get('lume_app'));
  const valid = Number.isSafeInteger(reported) && reported > 0;
  try {
    if (valid) localStorage.setItem(APP_VERSION_KEY, String(reported));
    const stored = Number(localStorage.getItem(APP_VERSION_KEY));
    return stored > 0 ? stored : null;
  } catch {
    return valid ? reported : null;
  }
}

export function useDevice(): Device {
  const [device, setDevice] = useState<Device>({ inAndroidApp: false, android: false, ios: false, standalone: false, appVersion: null, update: null, ready: false });
  useEffect(() => {
    const appVersion = rememberAppVersion();
    let inAndroidApp = document.referrer.startsWith('android-app://');
    try {
      if (inAndroidApp) sessionStorage.setItem(IN_APP_KEY, '1');
      inAndroidApp = sessionStorage.getItem(IN_APP_KEY) === '1';
    } catch {
      // storage blocked: the referrer check alone
    }
    const latest = androidRelease.origin ? androidRelease.versionCode : 0;
    setDevice({
      inAndroidApp,
      android: /Android/i.test(navigator.userAgent),
      // iPads report themselves as Macs; the touch screen gives them away.
      ios: /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1),
      standalone: matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
      appVersion,
      update: !inAndroidApp || !latest ? null : appVersion === null ? 'download' : appVersion < latest ? 'in-app' : null,
      ready: true,
    });
  }, []);
  return device;
}

export const APK_URL = '/downloads/lume.apk';
/** This phone's Lume app token (localStorage), so its alarms follow whoever is signed in here. */
export const PHONE_KEY = 'lume:phone';
/** The Android app's package (android/app/build.gradle applicationId). */
export const ANDROID_PACKAGE = 'app.lume.muj';

/** A link into the Lume app (lume://<action>), as an Android intent URL. Without the app, Chrome opens the fallback. */
export function appLink(action: 'test-alarm' | 'sync' | 'update', fallbackPath: string): string {
  const fallback = encodeURIComponent(`${androidRelease.origin ?? ''}${fallbackPath}`);
  return `intent://${action}#Intent;scheme=lume;package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

/** Where "Install update" goes: into the app's own updater, or (for apps too old to have one) the APK download. */
export function updateLink(update: 'in-app' | 'download'): { href: string; download?: boolean } {
  return update === 'in-app' ? { href: appLink('update', APK_URL) } : { href: APK_URL, download: true };
}

export const isPhoneToken = (t: unknown): t is string => typeof t === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(t);

export function storedPhone(): string | null {
  try {
    const t = localStorage.getItem(PHONE_KEY);
    return isPhoneToken(t) ? t : null;
  } catch {
    return null;
  }
}
