import { feedUrl, type UserDoc } from '../users';
import { withPostQuizzes } from './lms-posts';
import { ManipalIcsAdapter } from './manipal-ics';
import type { SourceAdapter } from './types';

/**
 * A student's LMS: the calendar from the link they connected with, plus quizzes announced in their
 * course posts (sent by their Chrome extension). NPTEL isn't here: the extension pushes it to
 * /api/ingest/nptel instead.
 */
export function lmsAdapter(uid: string, user: UserDoc): SourceAdapter {
  return withPostQuizzes(uid, new ManipalIcsAdapter(feedUrl(user)));
}
