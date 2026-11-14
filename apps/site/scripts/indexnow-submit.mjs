import { readdirSync } from 'node:fs';

/**
 * IndexNow submission (Bing / Seznam / Naver / Yandex shared endpoint).
 * Submits the site's main URLs for crawl prioritization. Requires the
 * key file to be live at https://wyattau.com/{KEY}.txt first.
 * Usage: bun scripts/indexnow-submit.mjs
 */
const host = 'wyattau.com';
const keyFiles = readdirSync('public').filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (keyFiles.length === 0) {
  console.error('no IndexNow key file found in public/');
  process.exit(1);
}
const key = keyFiles[0].replace('.txt', '');
const keyLocation = `https://${host}/${key}`;

const urlList = [
  'https://wyattau.com/',
  'https://wyattau.com/world',
  'https://wyattau.com/etf',
  'https://wyattau.com/ml',
  'https://wyattau.com/dossier',
  'https://wyattau.com/projects',
  'https://wyattau.com/docs',
  'https://wyattau.com/guestbook',
  'https://wyattau.com/uses',
];

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation, urlList }),
});
console.log(
  'IndexNow:',
  res.status,
  res.status === 200 || res.status === 202 ? 'accepted' : 'check key/urls',
);
