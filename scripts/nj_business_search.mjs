// NJ Division of Revenue business name search (public, free). Read-only, rate-limited.
// Usage: node scripts/nj_business_search.mjs <queries.json>  [{ id, terms: [...] }] -> data/raw/nj_business/<id>.json
import path from 'node:path';
import { ROOT, nowIso, readJson, writeJson, sleep } from './lib/util.mjs';
import { newContext, closeBrowser } from './lib/browser.mjs';

const URL_ = 'https://www.njportal.com/DOR/BusinessNameSearch/Search/BusinessName';
const items = await readJson(path.resolve(process.argv[2]));
const ctx = await newContext('desktop');
for (const it of items) {
  const res = { id: it.id, retrievedAt: nowIso(), source: URL_, method: 'playwright_chromium_nj_business_name_search', searches: [] };
  for (const term of it.terms) {
    const p = await ctx.newPage();
    try {
      await p.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 40000 });
      await p.locator('input[type="text"]').first().fill(term);
      await p.locator('button[type="submit"], input[type="submit"]').first().click();
      await p.waitForTimeout(4000);
      const rows = await p.evaluate(() => [...document.querySelectorAll('table tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())).filter(c => c.length >= 5));
      res.searches.push({ term, rows: rows.slice(0, 25), total: rows.length });
    } catch (e) { res.searches.push({ term, error: e.message.split('\n')[0] }); }
    await p.close();
    await sleep(3000);
  }
  await writeJson(path.join(ROOT, 'data/raw/nj_business', `${it.id}.json`), res);
  console.log(`${it.id}: ${res.searches.map(s => `"${s.term}"=${s.total ?? 'err'}`).join(' ')}`);
}
await ctx.close(); await closeBrowser();
