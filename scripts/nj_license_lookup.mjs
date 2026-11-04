// NJ Division of Consumer Affairs license verification (newjersey.mylicense.com), HVACR board, business register.
// Read-only: fills the public search form, reads result rows and their detail pages. Rate-limited.
// Usage: node scripts/nj_license_lookup.mjs <queries.json>  queries: [{ id, terms: ["name fragment", ...], city? }]
//   -> data/raw/nj_license/<id>.json
import path from 'node:path';
import { ROOT, nowIso, readJson, writeJson, sleep } from './lib/util.mjs';
import { newContext, closeBrowser } from './lib/browser.mjs';

const FORM = 'https://newjersey.mylicense.com/verification/Search.aspx?facility=Y';

async function search(ctx, term, city) {
  const p = await ctx.newPage();
  try {
    await p.goto(FORM, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await p.selectOption('select[name="t_web_lookup__profession_name"]', { label: 'HVACR' });
    await p.waitForTimeout(1500);
    await p.fill('input[name="t_web_lookup__full_name"]', term);
    if (city) await p.fill('input[name="t_web_lookup__addr_city"]', city);
    await Promise.all([p.waitForLoadState('domcontentloaded'), p.click('input[name="sch_button"]')]);
    await p.waitForTimeout(2500);
    const rows = await p.evaluate(() => [...document.querySelectorAll('table tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim()))
      .filter(c => c.length >= 4 && c.some(x => /HVACR/i.test(x))));
    const out = [];
    const links = await p.locator('table a[href*="Details"]').all();
    for (let i = 0; i < Math.min(links.length, 6); i++) {
      const name = (await links[i].innerText()).trim();
      const [det] = await Promise.all([ctx.waitForEvent('page', { timeout: 8000 }).catch(() => null), links[i].click()]);
      const dp = det || p;
      await dp.waitForLoadState('domcontentloaded').catch(() => {});
      await dp.waitForTimeout(1500);
      const text = await dp.evaluate(() => document.body.innerText);
      out.push({ name, detailText: text.replace(/\s+\n/g, '\n').slice(0, 2500) });
      if (det) await det.close(); else { await p.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {}); await p.waitForTimeout(1500); }
    }
    return { term, city: city || null, rows, details: out };
  } catch (e) { return { term, city: city || null, error: e.message.split('\n')[0] }; }
  finally { await p.close(); }
}

const items = await readJson(path.resolve(process.argv[2]));
const ctx = await newContext('desktop');
for (const it of items) {
  const res = { id: it.id, retrievedAt: nowIso(), source: FORM, method: 'playwright_chromium_nj_license_search', searches: [] };
  for (const t of it.terms) { res.searches.push(await search(ctx, t, it.city)); await sleep(4000); }
  await writeJson(path.join(ROOT, 'data/raw/nj_license', `${it.id}.json`), res);
  console.log(`${it.id}: ${res.searches.map(s => `"${s.term}" rows=${s.rows?.length ?? 'err'} ${s.error || ''}`).join('; ')}`);
}
await ctx.close(); await closeBrowser();
