// Tells Bing, and the other search engines that share IndexNow, about every page in the sitemap so
// they crawl them now rather than whenever (DuckDuckGo and Yahoo results come from Bing). Run after
// adding or changing public pages, once they're deployed:
//   npm run indexnow -- https://lume-public.vercel.app
// The key proves the site is ours: it's served at /<key>.txt (public/), and it isn't a secret.
const KEY = 'bf2a44d8cc624e9a35a34e8e9d7fd00b';

const origin = (process.argv[2] ?? '').replace(/\/+$/, '');
if (!/^https:\/\/[^/\s]+$/.test(origin)) {
  console.error('Usage: npm run indexnow -- https://your-lume.vercel.app');
  process.exit(1);
}

const keyFile = await fetch(`${origin}/${KEY}.txt`);
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  console.error(`${origin}/${KEY}.txt doesn't serve the key yet. Deploy first.`);
  process.exit(1);
}

const sitemap = await (await fetch(`${origin}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(origin).host, key: KEY, keyLocation: `${origin}/${KEY}.txt`, urlList }),
});
// 200: received. 202: received, the key is checked later. Anything else is a problem.
console.log(`IndexNow: ${res.status} ${res.statusText} for ${urlList.length} pages`);
for (const url of urlList) console.log(`  ${url}`);
if (res.status !== 200 && res.status !== 202) process.exit(1);
