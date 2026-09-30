import { feedUrl, type UserDoc } from '../users';
import { ManipalIcsAdapter } from './manipal-ics';
import type { SourceAdapter } from './types';

/**
 * A student's LMS calendar, from the link they connected with. NPTEL isn't here: each student's
 * Chrome extension pushes it to /api/ingest/nptel instead.
 */
export function lmsAdapter(user: UserDoc): SourceAdapter {
  return new ManipalIcsAdapter(feedUrl(user));
}
