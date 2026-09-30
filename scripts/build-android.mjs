/**
 * Builds the Lume Android app for the deployed site and publishes it with the site:
 *   - android/ → signed release APK for that address
 *   - public/downloads/lume.apk → the download offered in Settings
 *   - public/.well-known/assetlinks.json → lets Android open the site full screen (no browser bar)
 *   - lib/android-release.json → tells Settings the download is ready
 *
 *   npm run android:release -- https://your-app.vercel.app
 *
 * Then commit and push, so the site serves the new APK and asset links.
 */
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const origin = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https:\/\/[^/\s]+$/.test(origin)) {
  console.error('Usage: npm run android:release -- https://your-app.vercel.app');
  process.exit(1);
}
if (!existsSync('android/keystore.properties')) {
  console.error('android/keystore.properties is missing: the app has to be signed with the same key every time.');
  process.exit(1);
}

const JAVA_HOME = process.env.JAVA_HOME || 'C:/Program Files/Eclipse Adoptium/jdk-25.0.2.10-hotspot';
const GRADLE = process.env.GRADLE || 'E:/tools/gradle-9.8.0/bin/gradle';
const GRADLE_USER_HOME = process.env.GRADLE_USER_HOME || 'E:/tools/gradle-home';

// Minutes since 2026: always increasing, and far below Android's version code limit.
const versionCode = Math.floor((Date.now() - Date.UTC(2026, 0, 1)) / 60_000);
const versionName = new Date().toISOString().slice(0, 16).replace('T', ' ');

console.log(`Building Lume for ${origin} (version ${versionCode})…`);
execSync(`"${GRADLE}" assembleRelease --console=plain -Plume.origin=${origin} -Plume.versionCode=${versionCode} "-Plume.versionName=${versionName}"`, {
  cwd: 'android',
  stdio: 'inherit',
  env: { ...process.env, JAVA_HOME, GRADLE_USER_HOME },
});

mkdirSync('public/downloads', { recursive: true });
copyFileSync('android/app/build/outputs/apk/release/app-release.apk', 'public/downloads/lume.apk');

// The signing certificate's fingerprint, for Digital Asset Links.
const props = Object.fromEntries(
  readFileSync('android/keystore.properties', 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]),
);
const listing = execSync(
  `"${JAVA_HOME}/bin/keytool" -list -v -keystore android/${props.storeFile} -alias ${props.keyAlias} -storepass "${props.storePassword}"`,
  { encoding: 'utf8' },
);
const fingerprint = /SHA256:\s*([0-9A-F:]{95})/.exec(listing)?.[1];
if (!fingerprint) throw new Error('Could not read the signing certificate fingerprint');

mkdirSync('public/.well-known', { recursive: true });
writeFileSync(
  'public/.well-known/assetlinks.json',
  `${JSON.stringify(
    [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: { namespace: 'android_app', package_name: 'app.lume.muj', sha256_cert_fingerprints: [fingerprint] },
      },
    ],
    null,
    2,
  )}\n`,
);
writeFileSync('lib/android-release.json', `${JSON.stringify({ origin, versionCode, versionName }, null, 2)}\n`);

console.log(`\nDone: public/downloads/lume.apk and public/.well-known/assetlinks.json are ready.`);
console.log('Commit and push them so the site serves the new app.');
