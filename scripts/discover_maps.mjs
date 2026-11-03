// Google Maps discovery. Read-only page rendering of public search results, rate-limited.
// Usage:
//   node scripts/discover_maps.mjs search <queries.json>     -> data/raw/maps_search/<slug>.json
//   node scripts/discover_maps.mjs place <places.json>       -> data/raw/maps_place/<id>.json (+ screenshot)
// queries.json: [{ query, town, county }]; places.json: [{ id, placeUrl }]
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, nowIso, slug, readJson, writeJson, sleep } from './lib/util.mjs';
import { getBrowser, closeBrowser, safeScreenshot } from './lib/browser.mjs';

const GAP_MS = 7000; // spacing between Google requests

async function ctxFor() {
  const b = await getBrowser();
  return b.newContext({ locale: 'en-US', timezoneId: 'America/New_York', viewport: { width: 1366, height: 900 }, geolocation: { latitude: 40.88, longitude: -74.05 }, permissions: [] });
}

async function searchOne(ctx, q) {
  const url = `https://www.google.com/maps/search/${encodeURIComponent(q.query)}?hl=en`;
  const p = await ctx.newPage();
  const res = { ...q, url, retrievedAt: nowIso(), method: 'playwright_chromium_google_maps_search', results: [], error: null };
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (/consent\.google/.test(p.url())) { res.error = 'consent_interstitial'; return res; }
    await p.waitForSelector('div[role="feed"], h1', { timeout: 20000 }).catch(() => {});
    // Scroll the results feed a few times to load more cards.
    for (let i = 0; i < 4; i++) {
      await p.evaluate(() => { const f = document.querySelector('div[role="feed"]'); if (f) f.scrollBy(0, 3000); });
      await sleep(1800);
    }
    res.results = await p.evaluate(() => [...document.querySelectorAll('div[role="feed"] div[role="article"]')].map(a => {
      const link = a.querySelector('a.hfpxzc');
      const star = [...a.querySelectorAll('span[role="img"]')].map(s => s.getAttribute('aria-label') || '').find(s => /star/i.test(s)) || '';
      const text = a.innerText;
      const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
      const web = [...a.querySelectorAll('a')].find(x => /website/i.test(x.getAttribute('aria-label') || x.innerText || '') || x.getAttribute('data-value') === 'Website');
      const phone = (text.match(/(\+1\s?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/) || [])[0] || null;
      const catLine = lines.find(l => / · /.test(l) && !/Open|Closed|Opens|Closes/.test(l)) || '';
      return {
        name: a.getAttribute('aria-label') || link?.getAttribute('aria-label') || lines[0],
        placeUrl: link?.href || null,
        starsLabel: star,
        rating: (star.match(/([\d.]+)\s*star/i) || [])[1] ? Number(star.match(/([\d.]+)\s*star/i)[1]) : null,
        reviews: (star.match(/([\d,]+)\s*review/i) || [])[1] ? Number(star.match(/([\d,]+)\s*review/i)[1].replace(/,/g, '')) : null,
        categoryLine: catLine,
        phone,
        website: web?.href || null,
        sponsored: /Sponsored/i.test(text),
        bookOnline: /Book online/i.test(text),
        cardText: text.slice(0, 400),
      };
    }));
  } catch (e) { res.error = e.message.split('\n')[0]; }
  finally { await p.close(); }
  return res;
}

async function placeOne(ctx, item) {
  const p = await ctx.newPage();
  const res = { id: item.id, placeUrl: item.placeUrl, retrievedAt: nowIso(), method: 'playwright_chromium_google_maps_place', error: null };
  try {
    await p.goto(item.placeUrl + (item.placeUrl.includes('?') ? '&' : '?') + 'hl=en', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await p.waitForSelector('h1', { timeout: 20000 }).catch(() => {});
    await sleep(2500);
    Object.assign(res, await p.evaluate(() => {
      const q = s => document.querySelector(s);
      const label = sel => q(sel)?.getAttribute('aria-label') || null;
      const rateBox = q('div.F7nice')?.innerText || '';
      const starLbl = [...document.querySelectorAll('span[role="img"]')].map(s => s.getAttribute('aria-label') || '').find(s => /star/i.test(s)) || '';
      const revLbl = [...document.querySelectorAll('span[aria-label], button[aria-label]')].map(s => s.getAttribute('aria-label')).find(s => /^[\d,]+ reviews?$/i.test(s || '')) || '';
      const hoursRows = [...document.querySelectorAll('table tr')].map(r => r.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 7);
      return {
        name: q('h1')?.innerText?.trim() || null,
        category: q('button.DkEaL')?.innerText || null,
        address: (label('button[data-item-id="address"]') || '').replace(/^Address:\s*/, '') || null,
        phone: (label('button[data-item-id^="phone"]') || '').replace(/^Phone:\s*/, '') || null,
        website: q('a[data-item-id="authority"]')?.href || null,
        rating: (rateBox.match(/^([\d.]+)/) || starLbl.match(/([\d.]+)\s*star/i) || [])[1] ? Number((rateBox.match(/^([\d.]+)/) || starLbl.match(/([\d.]+)\s*star/i))[1]) : null,
        reviews: (revLbl.match(/([\d,]+)/) || rateBox.match(/\(([\d,]+)\)/) || [])[1] ? Number((revLbl.match(/([\d,]+)/) || rateBox.match(/\(([\d,]+)\)/))[1].replace(/,/g, '')) : null,
        rateBoxText: rateBox.slice(0, 60),
        limitedView: /limited view of Google Maps/i.test(document.body.innerText),
        hoursSummary: label('div[aria-label*="hours" i]') || null,
        hoursRows,
        permanentlyClosed: /permanently closed/i.test(document.body.innerText.slice(0, 5000)),
        temporarilyClosed: /temporarily closed/i.test(document.body.innerText.slice(0, 5000)),
        claimPrompt: /claim this business/i.test(document.body.innerText),
        canonicalUrl: location.href,
      };
    }));
    const dir = path.join(ROOT, 'evidence/screenshots', item.id);
    await fs.mkdir(dir, { recursive: true });
    const f = path.join(dir, 'google-maps-listing.png');
    if (await safeScreenshot(p, f)) res.screenshot = path.relative(ROOT, f);
  } catch (e) { res.error = e.message.split('\n')[0]; }
  finally { await p.close(); }
  return res;
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  const items = await readJson(path.resolve(file));
  const ctx = await ctxFor();
  for (const it of items) {
    if (mode === 'search') {
      const out = path.join(ROOT, 'data/raw/maps_search', slug(it.query) + '.json');
      try { await fs.access(out); console.log('skip', it.query); continue; } catch {}
      const r = await searchOne(ctx, it);
      await writeJson(out, r);
      console.log(`${it.query}: ${r.results.length} results ${r.error || ''}`);
    } else if (mode === 'place') {
      const out = path.join(ROOT, 'data/raw/maps_place', it.id + '.json');
      try { await fs.access(out); console.log('skip', it.id); continue; } catch {}
      const r = await placeOne(ctx, it);
      await writeJson(out, r);
      console.log(`${it.id}: ${r.name} | ${r.address} | ${r.rating} (${r.reviews}) ${r.error || ''}`);
    }
    await sleep(GAP_MS);
  }
  await ctx.close();
  await closeBrowser();
}
main().catch(e => { console.error(e); process.exit(1); });
