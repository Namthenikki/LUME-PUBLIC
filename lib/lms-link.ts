/**
 * The MUJ LMS calendar Subscribe link: https://mujlms.manipal.edu/d2l/le/calendar/feed/user/feed.ics?token=…
 * The token is personal to each student (their feed lists only their own courses), so the link is
 * what identifies a student in Lume. Only this shape is accepted, which also keeps out anyone who
 * isn't an MUJ student.
 */

export const LMS_HOST = 'mujlms.manipal.edu';
const FEED_PATH = '/d2l/le/calendar/feed/user/feed.ics';

export type LmsLink = { url: string; token: string };

/** The link in its standard form, or a reason it isn't one. Extra query parameters are dropped. */
export function parseLmsLink(input: string): LmsLink | { error: string } {
  const text = input.trim().replace(/^webcal:\/\//i, 'https://');
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return { error: 'That isn’t a link. Copy the whole link from the LMS (it starts with https://mujlms.manipal.edu).' };
  }
  if (url.hostname.toLowerCase() !== LMS_HOST) {
    return { error: 'That link isn’t from the MUJ LMS. It should start with https://mujlms.manipal.edu.' };
  }
  if (url.pathname !== FEED_PATH) {
    return { error: 'That’s an LMS page, not your calendar link. In the LMS, open Calendar → Subscribe and copy the link shown there.' };
  }
  const token = url.searchParams.get('token') ?? '';
  if (!/^[A-Za-z0-9_-]{8,256}$/.test(token)) {
    return { error: 'That link is cut short. Copy it again from Calendar → Subscribe; it ends with “token=” and a long code.' };
  }
  return { url: `https://${LMS_HOST}${FEED_PATH}?token=${token}`, token };
}
