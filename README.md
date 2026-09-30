# Lume for MUJ

Every Manipal LMS deadline in one place, with reminders until it's done. Any MUJ student can use it:
they paste their LMS calendar link once, and Lume finds their assignments and quizzes, reminds them more
often as each deadline gets close, and on Android **rings like an alarm** 12 hours, 6 hours, 30 minutes
and 10 minutes before. NPTEL deadlines come in through a small Chrome extension.

There are no accounts or passwords. A student's LMS calendar link is their key.

## How it works

```
Student pastes LMS link ─▶ /start ─▶ users/{uid} (link stored encrypted) ─▶ first sync
Scheduler ──(hourly)──▶ /api/sync ──▶ every student's LMS feed ──▶ users/{uid}/tasks
Scheduler ──(every 5 min)──▶ /api/remind ──▶ students whose next reminder is due ──▶ FCM push
Android app ──(every 15 min)──▶ /api/alarms ──▶ that student's alarms and reminders, set on the phone
Chrome extension ──(3-hourly)──▶ /api/ingest/nptel ──▶ that student's NPTEL deadlines
```

- **Identity.** The link looks like `https://mujlms.manipal.edu/d2l/le/calendar/feed/user/feed.ics?token=…`.
  The token is personal: each student's feed lists only their own courses. `links/{HMAC of token}`
  maps a link to a student, so pasting it again (new phone, cleared browser) opens the same Lume. The
  browser then keeps a signed, year-long session cookie. Only this link shape is accepted, and Lume
  checks that the LMS answers it before creating anything, so only MUJ students get in.
- **Data.** Everything a student has lives under `users/{uid}`: tasks and sync statuses. Browsers with
  notifications on (`devices`) and paired phones (`alarmDevices`) carry the student's `uid`. The LMS link
  is encrypted with AES-256-GCM using a key derived from `AUTH_SECRET`. Firestore rules deny all browser
  access; only the server reads and writes.
- **Cost control.** Each student has a `nextAt` (when their next reminder is due). The reminder job only
  reads students whose time has come, and the phone's alarm sync only reads recent tasks.
- **Leaving.** Settings → Your data → Delete my data removes the student's tasks, statuses, devices,
  phones and link.

Students' guides are in the app: the Connect page (`/start`) walks them through finding the link, and
`/help` covers everything (share that link with them).

## Go live

You need a Firebase project, a Vercel project and this GitHub repo. About 20 minutes.

### 1. Firebase

1. At [console.firebase.google.com](https://console.firebase.google.com), **Add project**. Google
   Analytics isn't needed.
2. **Build → Firestore Database → Create database**, in production mode, location `asia-south1` (Mumbai).
   Then open the **Rules** tab, paste the contents of `firestore.rules` and publish.
3. **Project settings (gear) → Service accounts → Generate new private key.** The downloaded file's
   `project_id`, `client_email` and `private_key` become the three `FIREBASE_*` variables. Keep it secret.
4. **Project settings → General → Your apps → Add app → Web (</>)**, any nickname. The config it shows
   gives `apiKey`, `projectId`, `appId` and `messagingSenderId` (the `NEXT_PUBLIC_FIREBASE_*` variables).

### 2. Environment variables

| Variable | What it is |
| --- | --- |
| `AUTH_SECRET` | Long random string (`openssl rand -base64 48`). **Never change it** once students use Lume: every stored link and session depends on it. |
| `CRON_SECRET` | Another long random string. The scheduler sends it. |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | From the service account file. Keep the key's `\n`s, in double quotes. |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `…_PROJECT_ID`, `…_APP_ID`, `…_MESSAGING_SENDER_ID` | From the web app config. Public by design. |
| `NEXT_PUBLIC_FIREBASE_VAPID_KEY` | Optional (Cloud Messaging → Web Push certificates). |

### 3. Deploy

1. Push this repo to GitHub, then at [vercel.com/new](https://vercel.com/new) import it.
2. Before deploying, add the variables above under **Environment Variables**.
3. Deploy. Functions run in Mumbai (`bom1`, set in `vercel.json`), next to Firestore.

### 4. Scheduler

Vercel's free plan only runs `/api/sync` once a day, so something else triggers the jobs. Lume also
catches up whenever a student opens it or their phone syncs, so a late run is covered.

- **GitHub Actions** (free on a public repo): add the repository secrets `APP_URL` (your Vercel address)
  and `CRON_SECRET` under Settings → Secrets and variables → Actions. `.github/workflows/cron.yml` does
  the rest. GitHub often starts scheduled runs late.
- **cron-job.org** (more punctual, free): `APP_URL/api/remind` every 5 minutes and `APP_URL/api/sync`
  every hour, each with the header `Authorization: Bearer <CRON_SECRET>`.

### 5. Android app and NPTEL extension

Both are built for your Vercel address and served from it:

```bash
npm run android:release -- https://your-lume.vercel.app
npm run extension:zip -- https://your-lume.vercel.app
git add public/downloads public/.well-known/assetlinks.json lib/android-release.json
git commit -m "App and extension for https://your-lume.vercel.app" && git push
```

The Android app (`app.lume.muj`) is signed with `android/lume-release.jks` and
`android/keystore.properties`. They're git-ignored: **back them up**. Android only installs updates
signed with the same key; lose it and every student has to uninstall and reinstall. After this first
install, students update from inside the app (Home and Settings show **Install update** when a newer
APK is deployed).

The Android build needs JDK 17+, the Android SDK and Gradle 9. The script defaults to the paths on the
build PC; set `JAVA_HOME`, `GRADLE` and `GRADLE_USER_HOME` to use others.

### 6. Invite people

Send them `https://your-lume.vercel.app/help`. It walks them through connecting, getting the app,
turning on reminders and NPTEL.

## iPhone

There's no App Store app (that needs a Mac and a paid Apple developer account). On iPhone, Lume is added
to the Home Screen from Safari and sends web push notifications from there (iOS 16.4+). iPhones don't
let web apps ring alarms or show notification buttons, so iPhone users get notifications, and tapping one
opens the task. The Home Screen app has its own storage, so students connect once more inside it; the
guides say so.

## Limits and cost

On Firebase's free plan (50,000 reads and 20,000 writes a day), a few dozen active students fit
comfortably. Past that, switch the project to the pay-as-you-go Blaze plan; at this scale it costs
cents a month. Vercel's free Hobby plan covers non-commercial use.

## Run it locally

With the Firestore emulator, nothing touches a real database:

```bash
npx firebase-tools emulators:start --only firestore --project demo-lume   # needs Java 11+
```

and in `.env.local`:

```
AUTH_SECRET=<any long random string>
CRON_SECRET=<another>
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_PROJECT_ID=demo-lume
```

Then `npm run dev`. Push notifications need a real Firebase project; everything else works.

## Adding a source

Write an adapter in `lib/sources/` that implements `SourceAdapter`. `fetchTasks()` returns `RawTask[]`,
and `externalId` must stay the same for the same assignment across runs (that prevents duplicates). Set
`authoritative` to true only if it returns every current item (then items missing from it are cancelled).
Sync it per student with `runSync(uid, [adapter])`.
