import androidRelease from './android-release.json';

/**
 * Lume's public address, for canonical links, the sitemap, structured data and link previews. On
 * Vercel it's the production domain, on previews too, so search engines are always pointed at
 * production. Elsewhere it's the address the Android app and extension were built for.
 */
export const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : androidRelease.origin || 'http://localhost:3000';

/** The name search results and link previews show. "Lume" alone is taken by bigger sites; this is ours. */
export const SITE_NAME = 'Lume for MUJ';

export const SITE_TITLE = 'Lume for MUJ: LMS and NPTEL deadline reminders';

export const SITE_DESCRIPTION =
  'Every Manipal University Jaipur LMS and NPTEL deadline in one place, with reminders before each assignment and quiz until it’s done. Android alarms too. Free.';

export const NOT_AFFILIATED = 'Lume is an independent project. It isn’t affiliated with or endorsed by Manipal University Jaipur or NPTEL.';

/** A page's absolute address, e.g. for structured data. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();

/** The guides, in the order they're listed. `updated` is when the page last changed in substance (the sitemap's lastmod). */
export const GUIDES = [
  {
    slug: 'muj-lms-calendar-link',
    /** Short link text, for the footer. */
    label: 'MUJ LMS calendar link',
    title: 'How to find your MUJ LMS calendar link',
    description:
      'Find your Manipal University Jaipur LMS calendar link (Calendar → Subscribe on mujlms.manipal.edu) in a minute, and what to do if it stops working.',
    short: 'Where it is on mujlms.manipal.edu, in four taps.',
    updated: '2026-10-10',
  },
  {
    slug: 'muj-lms-quiz-not-in-calendar',
    label: 'Quizzes missing from the calendar',
    title: 'MUJ LMS quiz not showing in your calendar? Here’s why',
    description:
      'Some MUJ teachers announce quizzes only in course posts, so they never reach the LMS calendar. Here’s why, and how to get a reminder before each one.',
    short: 'Quizzes announced only in course posts, and how to catch them.',
    updated: '2026-10-10',
  },
  {
    slug: 'nptel-deadline-reminders',
    label: 'NPTEL deadline reminders',
    title: 'NPTEL deadline reminders for MUJ students',
    description:
      'Get your NPTEL assignment deadlines next to your MUJ LMS ones, with reminders before each, using the free Lume Chrome extension.',
    short: 'NPTEL assignments next to your LMS deadlines, with reminders.',
    updated: '2026-10-10',
  },
] as const;

export type Guide = (typeof GUIDES)[number];

export const guide = (slug: Guide['slug']) => GUIDES.find((g) => g.slug === slug)!;
