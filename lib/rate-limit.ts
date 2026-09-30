import { createHash } from 'node:crypto';
import { headers } from 'next/headers';
import { db } from './firebase-admin';

/**
 * A few tries per 10 minutes per network, for the connect form: enough for typos, too few to guess
 * links. Keyed by a hash of the IP address; nothing else is stored.
 */
export async function allowAttempt(limit = 10, windowMs = 10 * 60_000): Promise<boolean> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const ref = db().collection('limits').doc(createHash('sha256').update(`connect:${ip}`).digest('hex').slice(0, 32));
  const now = Date.now();
  return db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const fresh = !doc.exists || now - (doc.get('since') as number) > windowMs;
    const count = fresh ? 1 : (doc.get('count') as number) + 1;
    tx.set(ref, { since: fresh ? now : doc.get('since'), count });
    return count <= limit;
  });
}
