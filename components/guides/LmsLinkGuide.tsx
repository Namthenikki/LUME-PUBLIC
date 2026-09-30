import { Pill, Step, Steps } from './Steps';

/** Where to find the LMS calendar link: the one thing a student has to do to use Lume. */
export function LmsLinkGuide({ pasteHere = true }: { pasteHere?: boolean }) {
  return (
    <Steps>
      <Step
        n={1}
        title={
          <>
            Sign in to the LMS at{' '}
            <a href="https://mujlms.manipal.edu" target="_blank" rel="noreferrer" className="text-blue underline-offset-2 hover:underline">
              mujlms.manipal.edu
            </a>
          </>
        }
      >
        On your phone or laptop, in any browser.
      </Step>
      <Step n={2} title="Open Calendar" look={<Pill>Calendar</Pill>}>
        It’s in the menu at the top of the LMS home page. On a phone, open the menu first.
      </Step>
      <Step n={3} title="Tap Subscribe" look={<Pill>Subscribe</Pill>}>
        It’s below the list of calendars. On a phone, scroll down to find it.
      </Step>
      <Step
        n={4}
        title="Choose All Courses, then copy the link"
        look={
          <span className="flex min-w-0 max-w-full items-center gap-2 rounded-[10px] border border-line bg-white py-1.5 pl-3 pr-1.5 text-[12px] text-ink-2 shadow-[0_1px_2px_rgb(0_0_0/0.05)]">
            <span className="min-w-0 truncate">https://mujlms.manipal.edu/d2l/le/calendar/feed/user/feed.ics?token=…</span>
            <span className="shrink-0 rounded-[7px] bg-chip px-2 py-1 font-medium text-ink">Copy</span>
          </span>
        }
      >
        Select the whole link and copy it. It ends with “token=” and a long code.
      </Step>
      {pasteHere && (
        <Step n={5} title="Paste it above and tap Connect">
          Lume fills in your deadlines straight away.
        </Step>
      )}
    </Steps>
  );
}
