import type { Metadata } from 'next';
import { A, GuidePage, GuideSection } from '@/components/guides/GuidePage';
import { guide } from '@/lib/site';

const GUIDE = guide('muj-lms-quiz-not-in-calendar');

export const metadata: Metadata = { title: GUIDE.title, description: GUIDE.description, alternates: { canonical: `/guides/${GUIDE.slug}` } };

export default function QuizNotInCalendarGuide() {
  return (
    <GuidePage
      guide={GUIDE}
      lead={
        <p>
          You check the LMS calendar, it’s empty, and then the class has a quiz. It isn’t you: some quizzes never reach the calendar. Here’s why, and how to
          get a reminder for them anyway.
        </p>
      }
    >
      <GuideSection id="why" title="Why the quiz isn’t in your calendar">
        <p>
          The MUJ LMS calendar lists what teachers set up with a date in the LMS’s own tools, like an assignment with a due date or a quiz in the Quizzes
          tool. Many teachers announce quizzes another way: in a <b>course post</b>, in the Activity Feed or Announcements on the course’s home page.
          Something like “Quiz 2: Statistics, Date: 13/10/2026, Time: 8 PM to 8:30 PM”.
        </p>
        <p>
          A post is just text, so the LMS doesn’t know it holds a date. The quiz never reaches the calendar, and everything that reads the calendar misses it
          too: your calendar link, Google Calendar, or a reminder app.
        </p>
      </GuideSection>

      <GuideSection id="by-hand" title="Catching them by hand">
        <p>
          Open each course on the LMS and read its Activity Feed and Announcements, every few days, for every course. It works, but it’s easy to miss one,
          especially in a week with five courses posting.
        </p>
      </GuideSection>

      <GuideSection id="lume" title="Letting Lume catch them">
        <p>
          The <b>Lume Chrome extension</b> reads your course posts for you. It runs in Chrome on your laptop, where you’re already logged in to the LMS, every hour
          while Chrome is open and whenever you open the LMS. When a post announces a quiz with a date, the quiz joins your other deadlines in Lume, with the
          same reminders and, on Android, the same alarms.
        </p>
        <p>
          <b>What counts as a quiz:</b> a quiz, re-quiz, class test, viva, or a numbered test like “Test 2”, with a date such as 13/10/2026, 16 September,
          tomorrow or “on Tuesday”. Posts about marks, results or solutions are ignored, and so are notes and other material.
        </p>
        <p>
          <b>What’s kept:</b> only the quizzes it finds. The posts themselves are never stored.
        </p>
        <p>
          Setting it up takes about 3 minutes, once, on a laptop or computer with Google Chrome. Your phone still gets every reminder.{' '}
          <A href="/help#extension">Add the Lume extension</A>
        </p>
      </GuideSection>
    </GuidePage>
  );
}
