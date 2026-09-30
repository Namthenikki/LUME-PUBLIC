import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, timingSafeEqual } from 'node:crypto';
import { requireEnv } from './env';

/*
 * There are no passwords or sign-ins. A student's LMS calendar link is their key: pasting it creates
 * their Lume (or finds it again), and this browser then gets a year-long signed session cookie.
 * Everything here is signed with AUTH_SECRET. Never change it once people use Lume: sessions, NPTEL
 * keys, notification buttons and the stored LMS links all depend on it.
 */

export const USER_COOKIE = 'lume_user';

function sign(value: string): string {
  return createHmac('sha256', requireEnv('AUTH_SECRET')).update(value).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const isUserId = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9_-]{16,40}$/.test(v);

/** Splits `<uid>.<signature>` and checks the signature against `expected(uid)`. */
function verified(value: string | undefined | null, expected: (uid: string) => string): string | null {
  if (!value) return null;
  const dot = value.indexOf('.');
  const uid = value.slice(0, dot);
  return dot > 0 && isUserId(uid) && safeEqual(value, expected(uid)) ? uid : null;
}

/** True if the request carries `Authorization: Bearer <CRON_SECRET>` (what the scheduler sends). */
export function isCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get('authorization') ?? '', `Bearer ${secret}`);
}

/* The session cookie: which Lume this browser opens. */

export function sessionToken(uid: string): string {
  return `${uid}.${sign(`session:v1:${uid}`)}`;
}

export function userFromSession(value: string | undefined): string | null {
  return verified(value, sessionToken);
}

/** Secure whenever the request came over https (always, once deployed); plain http only for local testing. */
export function sessionCookieOptions(https: boolean) {
  return {
    httpOnly: true,
    secure: https,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  };
}

/**
 * The key a student's NPTEL Chrome extension sends. It can only post NPTEL deadlines to that
 * student's Lume. Settings shows it as part of the connection code.
 */
export function nptelKey(uid: string): string {
  return `${uid}.${sign(`ingest:nptel:v1:${uid}`)}`;
}

export function nptelUser(request: Request): string | null {
  return verified((request.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, ''), nptelKey);
}

/** Per-task token carried in each notification and alarm, so their buttons work without a session. */
export function actionToken(uid: string, taskId: string): string {
  return `${uid}.${sign(`action:v1:${uid}:${taskId}`)}`;
}

export function actionUser(taskId: string, token: unknown): string | null {
  return typeof token === 'string' ? verified(token, (uid) => actionToken(uid, taskId)) : null;
}

/** The lookup id for an LMS link: the same link always finds the same Lume, and the id reveals nothing. */
export function linkId(feedToken: string): string {
  return sign(`link:v1:${feedToken}`);
}

/* LMS links are stored encrypted (AES-256-GCM, with a key derived from AUTH_SECRET). */

export type Sealed = { iv: string; tag: string; data: string };

function sealKey(): Buffer {
  return Buffer.from(hkdfSync('sha256', requireEnv('AUTH_SECRET'), 'lume', 'lms-link:v1', 32));
}

export function seal(plain: string): Sealed {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealKey(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') };
}

export function unseal(sealed: Sealed): string {
  const decipher = createDecipheriv('aes-256-gcm', sealKey(), Buffer.from(sealed.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(sealed.tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(sealed.data, 'base64')), decipher.final()]).toString('utf8');
}
