/** What students ask before connecting. The same words go into the page's FAQ structured data, so keep answers plain text. */
export const QUESTIONS: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: 'What is Lume?',
    a: 'Lume is a free deadline reminder for Manipal University Jaipur (MUJ) students. It reads your MUJ LMS calendar, finds every assignment and quiz, and reminds you before each one until you mark it done.',
  },
  {
    q: 'How does Lume get my deadlines?',
    a: 'You paste your LMS calendar link once (Calendar → Subscribe on mujlms.manipal.edu) and Lume checks it every hour. There’s no account and no password: the link is your key.',
    link: { href: '/guides/muj-lms-calendar-link', label: 'Find your calendar link' },
  },
  {
    q: 'When do the reminders come?',
    a: '2 days, 1 day, 6, 3 and 1 hours, 30 and 10 minutes before each deadline, plus 9 AM on the day. The Android app also rings like an alarm 12 hours, 6 hours, 30 minutes and 10 minutes before. From 12 AM to 8 AM reminders arrive silently.',
  },
  {
    q: 'Can Lume see my grades or messages?',
    a: 'No. Lume only reads your LMS calendar. If you add the Lume Chrome extension, it also reads your course posts to find quizzes announced there; only the quizzes are kept, never the posts.',
    link: { href: '/guides/muj-lms-quiz-not-in-calendar', label: 'Why some quizzes aren’t in the calendar' },
  },
  {
    q: 'Does it remind me about NPTEL?',
    a: 'Yes. The Lume Chrome extension on your laptop brings in your NPTEL assignment deadlines, and they get the same reminders as your LMS ones.',
    link: { href: '/guides/nptel-deadline-reminders', label: 'NPTEL reminders' },
  },
  {
    q: 'Does it work on iPhone?',
    a: 'Yes, as a Home Screen app from Safari (iOS 16.4 or newer). iPhones don’t let web apps ring alarms, so you get notifications instead.',
    link: { href: '/help#iphone', label: 'Add Lume to your iPhone' },
  },
  {
    q: 'Is Lume free? Is it official?',
    a: 'It’s free, with no ads and no account. It isn’t official: Lume is an independent project made at MUJ, not affiliated with or endorsed by Manipal University Jaipur or NPTEL.',
  },
  {
    q: 'Can students from other colleges use it?',
    a: 'Not yet. Lume works with the MUJ LMS (mujlms.manipal.edu) only, so you connect that first; NPTEL deadlines are added on top.',
  },
];

export function Questions() {
  return (
    <dl className="grid gap-x-12 sm:grid-cols-2">
      {QUESTIONS.map((item) => (
        <div key={item.q} className="border-t border-line py-5">
          <dt className="text-[16px] font-medium">{item.q}</dt>
          <dd className="mt-1.5 text-[15px] text-ink-2">
            {item.a}
            {item.link && (
              <>
                {' '}
                <a href={item.link.href} className="font-medium text-blue underline-offset-2 hover:underline">
                  {item.link.label}
                </a>
              </>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
