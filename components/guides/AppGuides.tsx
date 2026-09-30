import { Pill, ShareGlyph, Step, Steps } from './Steps';

/** Adding Lume to an iPhone's Home Screen, where notifications work. */
export function IphoneSteps() {
  return (
    <Steps>
      <Step n={1} title="Open Lume in Safari">
        This page, in Safari (not inside Instagram or WhatsApp).
      </Step>
      <Step n={2} title="Tap the Share button" look={<Pill><ShareGlyph /> Share</Pill>}>
        At the bottom of the screen (top right on an iPad).
      </Step>
      <Step n={3} title="Tap Add to Home Screen, then Add" look={<Pill>Add to Home Screen</Pill>}>
        Scroll down the list if you don’t see it.
      </Step>
      <Step n={4} title="Open Lume from your Home Screen and connect">
        Your iPhone keeps the Home Screen app separate from Safari, so paste your LMS link once more there.
      </Step>
      <Step n={5} title="Tap Turn on, then Allow" look={<Pill strong>Turn on</Pill>}>
        That’s what lets Lume send you reminders.
      </Step>
    </Steps>
  );
}

/** Installing the Android app from the downloaded file. */
export function AndroidSteps() {
  return (
    <Steps>
      <Step n={1} title="Download the app">
        Use the Download button. It’s a small file (about 4 MB).
      </Step>
      <Step n={2} title="Open the downloaded file and tap Install">
        If Android asks, tap Settings, turn on Allow from this source, then go back and tap Install. If Play Protect warns you, tap More details → Install anyway.
      </Step>
      <Step n={3} title="Open Lume and allow notifications" look={<Pill strong>Allow</Pill>}>
        If it shows the Connect page, paste your LMS link again. The app sets up alarms by itself within a minute.
      </Step>
      <Step n={4} title="Let alarms ring on time">
        Long-press the Lume icon → App info → Battery → Unrestricted (some phones say No restrictions).
      </Step>
    </Steps>
  );
}
