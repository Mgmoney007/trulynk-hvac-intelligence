// Re-open Google Maps listings and record activity signals (owner posts and their dates, hours, review snippets
// with relative dates, "Book online"), as shown in the logged-out view. Read-only.
// Usage: node scripts/listing_activity.mjs <ids.json> -> data/raw/listing_activity/<id>.json
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, nowIso, readJson, writeJson, sleep } from './lib/util.mjs';
import { getBrowser, closeBrowser, safeScreenshot } from './lib/browser.mjs';

const pre = new Map((await readJson(path.join(ROOT, 'data/interim/prescreen.json'))).map(c => [c.id, c]));
const ids = (await readJson(path.resolve(process.argv[2]))).map(x => x.id || x);
const b = await getBrowser();
const ctx = await b.newContext({ locale: 'en-US', timezoneId: 'America/New_York', viewport: { width: 1366, height: 1100 } });
for (const id of ids) {
  const c = pre.get(id); const p = await ctx.newPage();
  const res = { id, placeUrl: c.placeUrl, retrievedAt: nowIso(), method: 'playwright_chromium_google_maps_place_text' };
  try {
    await p.goto(c.placeUrl + '?hl=en', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForSelector('h1', { timeout: 20000 }).catch(() => {});
    await sleep(3000);
    for (let i = 0; i < 3; i++) { await p.evaluate(() => { const m = document.querySelector('div[role="main"]'); const s = m && [...m.querySelectorAll('div')].find(d => d.scrollHeight > d.clientHeight + 50); if (s) s.scrollBy(0, 1500); }); await sleep(1200); }
    const text = await p.evaluate(() => (document.querySelector('div[role="main"]') || document.body).innerText);
    res.panelText = text.slice(0, 6000);
    res.ownerPostDates = [...text.matchAll(/\b((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, 20\d\d)\b/g)].map(m => m[1]);
    res.relativeDates = [...new Set([...text.matchAll(/\b(\d+|a|an) (day|week|month|year)s? ago\b/g)].map(m => m[0]))];
    res.fromTheOwner = /From the owner/i.test(text);
    res.bookOnline = /Book online|Book an appointment/i.test(text);
    res.hoursLine = (text.match(/(Open 24 hours|Open ⋅[^\n]*|Closed ⋅[^\n]*|Opens [^\n]*|Closes [^\n]*)/) || [])[0] || null;
    const dir = path.join(ROOT, 'evidence/screenshots', id); await fs.mkdir(dir, { recursive: true });
    const f = path.join(dir, 'google-maps-listing-pass15.png'); if (await safeScreenshot(p, f)) res.screenshot = path.relative(ROOT, f);
  } catch (e) { res.error = e.message.split('\n')[0]; }
  await p.close();
  await writeJson(path.join(ROOT, 'data/raw/listing_activity', `${id}.json`), res);
  console.log(`${id}: owner posts ${res.ownerPostDates?.join(', ') || '-'} | rel ${res.relativeDates?.join(', ') || '-'} | hours ${res.hoursLine || '-'} | book ${res.bookOnline}`);
  await sleep(7000);
}
await ctx.close(); await closeBrowser();
