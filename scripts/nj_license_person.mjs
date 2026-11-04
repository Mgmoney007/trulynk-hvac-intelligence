// NJ license verification, person register, HVACR profession, by last (+ optional first) name. Read-only.
// Usage: node scripts/nj_license_person.mjs <id> <last> [first]  -> appends to data/raw/nj_license/<id>.json
import path from 'node:path';
import { ROOT, nowIso, readJson, writeJson } from './lib/util.mjs';
import { newContext, closeBrowser } from './lib/browser.mjs';
const [id, last, first] = process.argv.slice(2);
const ctx = await newContext('desktop'); const p = await ctx.newPage();
await p.goto('https://newjersey.mylicense.com/verification/Search.aspx', { waitUntil: 'domcontentloaded', timeout: 40000 });
const names = await p.evaluate(() => [...document.querySelectorAll('input[type=text]')].map(e => e.name));
await p.selectOption('select[name="t_web_lookup__profession_name"]', { label: 'HVACR' }).catch(() => {});
await p.waitForTimeout(1500);
await p.fill('input[name="t_web_lookup__last_name"]', last);
if (first) await p.fill('input[name="t_web_lookup__first_name"]', first);
await p.click('input[name="sch_button"]'); await p.waitForTimeout(4000);
const rows = await p.evaluate(() => [...document.querySelectorAll('table tr')].map(tr => [...tr.querySelectorAll('td')].map(td => td.innerText.trim())).filter(c => c.length >= 6 && /HVACR/i.test(c.join(' '))));
const f = path.join(ROOT, 'data/raw/nj_license', `${id}.json`);
const rec = await readJson(f, { id, searches: [] });
rec.personSearches = [...(rec.personSearches || []), { last, first: first || null, at: nowIso(), source: 'https://newjersey.mylicense.com/verification/Search.aspx', method: 'playwright_chromium_nj_license_person_search', rows }];
await writeJson(f, rec);
console.log(`${id} ${first || ''} ${last}:`, rows.length ? rows.map(r => r.join(' | ')).join('\n  ') : 'no HVACR licensee', '| fields:', names.join(','));
await ctx.close(); await closeBrowser();
