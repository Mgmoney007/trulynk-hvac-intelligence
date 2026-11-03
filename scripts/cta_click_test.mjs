// Run the CTA click test on already-audited companies and merge results into their audit records.
// Usage: node scripts/cta_click_test.mjs <ids.json>   ([{ id }])
import path from 'node:path';
import { ROOT, readJson, writeJson } from './lib/util.mjs';
import { newContext, closeBrowser } from './lib/browser.mjs';
import { runCtaClickTests } from './lib/cta.mjs';

const items = await readJson(path.resolve(process.argv[2]));
for (const { id } of items) {
  const f = path.join(ROOT, 'data/raw/audits', `${id}.json`);
  const a = await readJson(f, null);
  if (!a?.desktop || a.ctaClickTests) continue;
  const ctx = await newContext('desktop');
  a.ctaClickTests = await runCtaClickTests(ctx, a.desktop.finalUrl, a.desktop.links, path.join(ROOT, 'evidence/screenshots', id));
  await ctx.close();
  await writeJson(f, a);
  console.log(`${id}: ${a.ctaClickTests.length} tested, dead ${a.ctaClickTests.filter(t => t.effect === 'no visible effect').length}`);
}
await closeBrowser();
