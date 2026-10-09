'use client';

import { useState } from 'react';
import { Pill, Step, Steps } from './Steps';

export const EXTENSION_URL = '/downloads/lume-nptel-extension.zip';
const EXTENSIONS_PAGE = 'chrome://extensions';

/** A small "Copy" button; falls back to a prompt where the clipboard is blocked. */
function CopyButton({ text, label, strong = false }: { text: string; label: string; strong?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    } catch {
      window.prompt('Copy this:', text);
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={`inline-flex h-10 items-center justify-center rounded-[12px] px-4 text-[13px] font-semibold ${
        strong ? 'bg-blue text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)]' : 'border border-line bg-white text-ink shadow-[0_1px_2px_rgb(0_0_0/0.05)]'
      }`}
    >
      {copied ? 'Copied' : label}
    </button>
  );
}

/**
 * Setting up the Lume Chrome extension, one small step at a time. In Settings it gets the student's
 * connection code, so step 7 is one tap; on the help page it says where to find it.
 */
export function ExtensionSteps({ code }: { code?: string }) {
  return (
    <div>
      <div className="rounded-[14px] bg-blue/8 px-4 py-3 text-[14px] leading-snug">
        <p className="font-medium">You need a laptop or computer with Google Chrome.</p>
        <p className="mt-0.5 text-ink-2">It takes about 3 minutes, once. Phones can’t run extensions, but your phone still gets every reminder.</p>
      </div>

      <p className="mt-3 rounded-[14px] bg-sunken px-4 py-3 text-[13px] leading-snug text-ink-2">
        <b className="font-medium text-ink">Already have the old “Lume for NPTEL” extension?</b> Open {EXTENSIONS_PAGE}, click <b className="font-medium text-ink">Remove</b> on it,
        then follow these steps.
      </p>

      <Steps className="mt-5">
        <Step
          n={1}
          title="Download the extension"
          look={
            <a
              href={EXTENSION_URL}
              download="lume-extension.zip"
              className="inline-flex h-10 items-center justify-center rounded-[12px] bg-blue px-4 text-[13px] font-semibold text-white shadow-[0_8px_18px_-10px_rgb(29_110_245/0.8)]"
            >
              Download the extension
            </a>
          }
        >
          A small file called lume-extension.zip lands in your Downloads folder.
        </Step>

        <Step n={2} title="Unzip it">
          Windows: right-click the file → Extract All → Extract. Mac: double-click it. You now have a folder called lume-extension.
        </Step>

        <Step n={3} title="Open Chrome’s extensions page" look={<CopyButton text={EXTENSIONS_PAGE} label={`Copy ${EXTENSIONS_PAGE}`} />}>
          Click the address bar at the very top of Chrome, paste (or type) {EXTENSIONS_PAGE} and press Enter. Chrome doesn’t let websites open this page, so it has to be typed.
        </Step>

        <Step n={4} title="Turn on Developer mode" look={<Pill>Developer mode</Pill>}>
          It’s a switch at the top right of that page. Turn it on (it goes blue).
        </Step>

        <Step n={5} title="Click Load unpacked and pick the folder" look={<Pill>Load unpacked</Pill>}>
          The button appears at the top left. In the window that opens, find the lume-extension folder from step 2, click it once, then click Select Folder. Pick the
          folder, not the .zip file.
        </Step>

        <Step n={6} title="Pin it next to the address bar">
          Click the puzzle piece icon at the top right of Chrome, then the pin next to Lume. The Lume icon now sits in your toolbar.
        </Step>

        <Step n={7} title="Connect it to your Lume" look={code ? <CopyButton text={code} label="Copy your connection code" strong /> : undefined}>
          {code
            ? 'Copy your code with the button, click the Lume icon in Chrome, paste it in the box and click Connect.'
            : 'Open Lume → Settings → Sources → Lume extension and tap Copy your connection code. Then click the Lume icon in Chrome, paste it and click Connect.'}
        </Step>

        <Step n={8} title="Log in to the MUJ LMS in that Chrome">
          Open mujlms.manipal.edu and log in like you always do. That’s how the extension reads your course posts: every 3 hours while Chrome is open, and whenever
          you open the LMS.
        </Step>

        <Step n={9} title="Doing NPTEL? Open each NPTEL course once">
          Log in to onlinecourses.nptel.ac.in in the same Chrome and open each of your courses. No NPTEL? Skip this step.
        </Step>
      </Steps>

      <div className="mt-5 space-y-1.5 rounded-[14px] bg-sunken px-4 py-3 text-[13px] leading-snug text-ink-2">
        <p>
          <b className="font-medium text-ink">That’s it.</b> Quizzes your teachers post on the LMS now show up in Lume, with reminders, like your other deadlines.
        </p>
        <p>A red ! on the Lume icon means it needs you: click the icon to see what. Logged out of the LMS? Just log in again and it catches up.</p>
        {code && <p>Keep your code to yourself: anyone with it can add deadlines to your Lume.</p>}
      </div>
    </div>
  );
}
