import type { Metadata } from 'next';
import { A, GuidePage, GuideSection } from '@/components/guides/GuidePage';
import { guide } from '@/lib/site';

const GUIDE = guide('nptel-deadline-reminders');

export const metadata: Metadata = { title: GUIDE.title, description: GUIDE.description, alternates: { canonical: `/guides/${GUIDE.slug}` } };

export default function NptelGuide() {
  return (
    <GuidePage
      guide={GUIDE}
      lead={
        <p>
          NPTEL assignments live on a different site from the LMS, each course with its own deadlines, so they’re the easiest ones to forget. Lume puts them next
          to your MUJ LMS deadlines and reminds you before each one.
        </p>
      }
    >
      <GuideSection id="how" title="How it works">
        <p>
          The <b>Lume Chrome extension</b> runs in Chrome on your laptop, where you’re logged in to NPTEL (onlinecourses.nptel.ac.in). Every hour while Chrome
          is open, and whenever you open NPTEL, it reads the assignments in each of your courses and sends their deadlines to your Lume. There’s no NPTEL
          password to give anyone.
        </p>
        <p>
          Your NPTEL assignments then show up with your LMS ones, soonest first, and get the same reminders: 2 days, 1 day, 6, 3 and 1 hours, 30 and 10
          minutes before. On Android, Lume rings like an alarm 12 hours, 6 hours, 30 minutes and 10 minutes before. Assignments you’ve already submitted go
          straight to Done.
        </p>
      </GuideSection>

      <GuideSection id="setup" title="Setting it up">
        <p>
          <b>1. Connect your MUJ LMS to Lume.</b> Lume is for MUJ students, so it starts from your LMS calendar link.{' '}
          <A href="/guides/muj-lms-calendar-link">Find your calendar link</A>
        </p>
        <p>
          <b>2. Add the Lume extension to Chrome on your laptop.</b> About 3 minutes, once. <A href="/help#extension">Step-by-step instructions</A>
        </p>
        <p>
          <b>3. Open each NPTEL course once.</b> Log in to onlinecourses.nptel.ac.in in the same Chrome and open each of your courses, so the extension knows
          them. A course you join later is added the first time you open it.
        </p>
      </GuideSection>

      <GuideSection id="phone" title="What about my phone?">
        <p>
          Phones can’t run Chrome extensions, but they don’t need to: the laptop sends your NPTEL deadlines to Lume, and your phone gets every reminder. If the
          Lume icon in Chrome shows a red !, click it to see what it needs, usually logging in to NPTEL again.
        </p>
      </GuideSection>
    </GuidePage>
  );
}
