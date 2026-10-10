import type { Metadata } from 'next';
import { A, Code, GuidePage, GuideSection } from '@/components/guides/GuidePage';
import { LmsLinkGuide } from '@/components/guides/LmsLinkGuide';
import { guide } from '@/lib/site';

const GUIDE = guide('muj-lms-calendar-link');

export const metadata: Metadata = { title: GUIDE.title, description: GUIDE.description, alternates: { canonical: `/guides/${GUIDE.slug}` } };

export default function CalendarLinkGuide() {
  return (
    <GuidePage
      guide={GUIDE}
      lead={
        <p>
          Your MUJ LMS calendar link is a private web address for your own LMS calendar: every assignment and quiz deadline from all your courses. Calendar apps,
          and Lume, read your deadlines from it without your password. Finding it takes about a minute.
        </p>
      }
    >
      <GuideSection id="steps" title="Where to find it">
        <div className="pt-2 text-ink">
          <LmsLinkGuide pasteHere={false} />
        </div>
        <p>
          The link looks like <Code>https://mujlms.manipal.edu/d2l/le/calendar/feed/user/feed.ics?token=…</Code>. The long code after <Code>token=</Code> is
          personal: it’s what makes the calendar yours.
        </p>
      </GuideSection>

      <GuideSection id="use" title="What to do with it">
        <p>
          <b>Get reminders before every deadline.</b> <A href="/start">Paste it in Lume</A> and it finds every assignment and quiz straight away, checks for new
          ones every hour, and reminds you from two days before down to ten minutes before. On Android it rings like an alarm.
        </p>
        <p>
          <b>Or add it to a calendar app.</b> Google Calendar (Other calendars → From URL), Apple Calendar and Outlook can all subscribe to it. They refresh
          subscribed calendars slowly, sometimes only every several hours, and won’t keep reminding you until the work is done.
        </p>
      </GuideSection>

      <GuideSection id="mistakes" title="If the link doesn’t work">
        <p>
          <b>It should start with</b> <Code>https://mujlms.manipal.edu</Code>. A link starting with <Code>webcal://</Code> is the same link and works too.
        </p>
        <p>
          <b>A page address isn’t the calendar link.</b> Copying the address bar while you’re on the Calendar page gives you the page, not the feed. Use the link
          shown after you tap Subscribe.
        </p>
        <p>
          <b>Copy all of it.</b> It ends with <Code>token=</Code> and a long code; a link that’s cut short won’t work. Choose All Courses before copying, so
          every course is included.
        </p>
        <p>
          <b>Stopped working?</b> If your link was reset, the old one no longer works. Copy the new one from Calendar → Subscribe; in Lume, paste it under
          Settings → Sources.
        </p>
      </GuideSection>

      <GuideSection id="private" title="Keep it to yourself">
        <p>
          Anyone with your link can see your LMS calendar, so don’t post it in a group. In Lume, the link is your key: paste the same link on a new phone and
          everything comes back, including what you marked done. Lume stores it encrypted and only reads your calendar: no grades, no messages.
        </p>
      </GuideSection>
    </GuidePage>
  );
}
