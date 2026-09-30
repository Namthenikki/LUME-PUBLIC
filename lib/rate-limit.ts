import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { db } from './firebase-admin';

/*
 * Slows down guessing LMS links on the connect page: after 20 links the LMS rejected from one network
 * in 10 minutes, that network waits. Only failures count, because a whole class on campus Wi-Fi shares
 * one address and may connect at once. Keyed by a hash of the IP address; nothing else is stored.
 */

const LIMIT = 20;
const WINDOW_MS = 10 * 60_000;

async function ref() {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  return db().collection('limits').doc(createHash('sha256').update(`connect:${ip}`).digest('hex').slice(0, 32));
}

export async function tooManyFailures(): Promise<boolean> {
  const doc = await (await ref()).get();
  return doc.exists && Date.now() - (doc.get('since') as number) < WINDOW_MS && (doc.get('count') as number) >= LIMIT;
}

export async function recordFailure(): Promise<void> {
  const r = await ref();
  const now = Date.now();
  await db().runTransaction(async (tx) => {
    const doc = await tx.get(r);
    const fresh = !doc.exists || now - (doc.get('since') as number) > WINDOW_MS;
    tx.set(r, { since: fresh ? now : doc.get('since'), count: fresh ? 1 : (doc.get('count') as number) + 1 });
  });
}
