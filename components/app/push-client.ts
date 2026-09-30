'use client';

import { getApps, initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { registerDeviceAction, removeDeviceAction } from '@/app/dashboard/actions';

// The Firebase web app's public config, from the NEXT_PUBLIC_FIREBASE_* variables. Without a VAPID
// key, FCM uses its default one.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
};
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || undefined;
const TOKEN_KEY = 'lume:push-token';

export type PushState = 'loading' | 'unconfigured' | 'unsupported' | 'blocked' | 'off' | 'on';

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // private mode: the device just re-registers next time
  }
}

export async function pushState(): Promise<PushState> {
  if (!config.apiKey || !config.appId || !config.messagingSenderId) return 'unconfigured';
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !(await isSupported())) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  return Notification.permission === 'granted' && storedToken() ? 'on' : 'off';
}

function deviceLabel(): string {
  const ua = navigator.userAgent;
  const kind = /Android/i.test(ua) ? 'Android phone' : /iPhone|iPad/i.test(ua) ? 'iPhone' : /Windows/i.test(ua) ? 'Windows PC' : /Mac/i.test(ua) ? 'Mac' : 'Browser';
  return `${kind}${matchMedia('(display-mode: standalone)').matches ? ' (app)' : ''}`;
}

async function currentToken(): Promise<string> {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const app = getApps()[0] ?? initializeApp(config);
  return getToken(getMessaging(app), { ...(vapidKey ? { vapidKey } : {}), serviceWorkerRegistration: registration });
}

/** Asks for permission if needed, gets this device's FCM token and saves it on the server. */
export async function enablePush(): Promise<PushState> {
  if ((await Notification.requestPermission()) !== 'granted') return Notification.permission === 'denied' ? 'blocked' : 'off';
  const token = await currentToken();
  await registerDeviceAction(token, deviceLabel());
  storeToken(token);
  return 'on';
}

/** FCM tokens rotate now and then; re-register quietly whenever the app opens. */
export async function refreshPushToken(): Promise<void> {
  const token = await currentToken();
  if (token !== storedToken()) {
    await registerDeviceAction(token, deviceLabel());
    storeToken(token);
  }
}

export async function disablePush(): Promise<PushState> {
  const token = storedToken();
  if (token) await removeDeviceAction(token);
  try {
    await deleteToken(getMessaging(getApps()[0] ?? initializeApp(config)));
  } catch {
    // already gone
  }
  storeToken(null);
  return 'off';
}
