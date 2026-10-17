import { feedUrl, type UserDoc } from '../users';
import { withLmsQuizzes } from './lms-posts';
import { ManipalIcsAdapter } from './manipal-ics';
import type { SourceAdapter } from './types';

/**
 * A student's LMS: the calendar from the link they connected with, plus what their Chrome extension
 * reads from course posts and the Quizzes tool. NPTEL isn't here: the extension pushes it to
 * /api/ingest/nptel instead.
 */
export function lmsAdapter(uid: string, user: UserDoc): SourceAdapter {
  return withLmsQuizzes(uid, new ManipalIcsAdapter(feedUrl(user)));
}
