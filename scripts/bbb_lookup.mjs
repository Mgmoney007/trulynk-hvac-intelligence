// BBB search-card lookup for identity corroboration (name / phone / address) and BBB rating.
// Accepts a match only on identical phone, or strong name similarity in the same city. Ads are ignored.
// Usage: node scripts/bbb_lookup.mjs <items.json>   items: [{ id, name, city, phone }]  -> data/raw/bbb/<id>.json
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, nowIso, readJson, writeJson, sleep } from './lib/util.mjs';
import { getBrowser, closeBrowser } from './lib/browser.mjs';
import { normalizePhone } from './lib/phone.mjs';

const STOP = new Set(['inc', 'llc', 'co', 'corp', 'corporation', 'company', 'the', 'and', 'of', 'nj', 'services', 'service', 'heating', 'cooling', 'air', 'conditioning', 'hvac', 'plumbing', 'mechanical', '&']);
const toks = s => String(s || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(t => t && !STOP.has(t));
export function nameSim(a, b) {
  const A = new Set(toks(a)), B = new Set(toks(b));
  if (!A.size || !B.size) return 0;
  let i = 0; for (const t of A) if (B.has(t)) i++;
  return i / Math.min(A.size, B.size);
}

async function lookup(ctx, it) {
  const url = `https://www.bbb.org/search?find_country=USA&find_text=${encodeURIComponent(it.name)}&find_loc=${encodeURIComponent((it.city || '') + ', NJ')}`;
  const p = await ctx.newPage();
  const res = { id: it.id, query: it.name, searchUrl: url, retrievedAt: nowIso(), method: 'playwright_chromium_bbb_search', match: null, candidates: [], error: null };
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await p.waitForTimeout(3000);
    res.candidates = await p.evaluate(() => [...document.querySelectorAll('.result-card, [class*="result-card"]')].map(c => {
      const t = c.innerText; const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
      return { ad: /^Ad\b/.test(t), name: lines.find(l => !/^(Ad|Why are there ads|advertisement:)/i.test(l)) || '', rating: (t.match(/BBB Rating:\s*([A-F][+-]?|NR)/) || [])[1] || null,
        phone: (t.match(/\(\d{3}\)\s*\d{3}-\d{4}/) || [])[0] || null, address: lines.find(l => /, [A-Z]{2} \d{5}/.test(l)) || null, accredited: /accredited/i.test(c.querySelector('img')?.alt || ''),
        href: [...c.querySelectorAll('a')].map(a => a.href).find(h => /bbb\.org\/us\/.+\/profile\//.test(h)) || null };
    }).filter(c => !c.ad));
    const ph = normalizePhone(it.phone)?.e164;
    for (const c of res.candidates) {
      const sameTel = ph && normalizePhone(c.phone)?.e164 === ph;
      const sim = nameSim(it.name, c.name);
      const sameCity = it.city && c.address && c.address.toLowerCase().includes(it.city.toLowerCase());
      if (sameTel || (sim >= 0.8 && sameCity)) { res.match = { ...c, basis: sameTel ? 'phone' : 'name+city', nameSimilarity: sim }; break; }
    }
  } catch (e) { res.error = e.message.split('\n')[0]; }
  finally { await p.close(); }
  return res;
}

const items = await readJson(path.resolve(process.argv[2]));
const b = await getBrowser();
const ctx = await b.newContext({ locale: 'en-US', viewport: { width: 1366, height: 900 } });
for (const it of items) {
  const out = path.join(ROOT, 'data/raw/bbb', `${it.id}.json`);
  try { await fs.access(out); continue; } catch {}
  const r = await lookup(ctx, it);
  await writeJson(out, r);
  console.log(`${it.id}: ${r.match ? `${r.match.name} ${r.match.rating} (${r.match.basis})` : 'no match'} ${r.error || ''}`);
  await sleep(4000);
}
await ctx.close(); await closeBrowser();
