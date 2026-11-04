// Mobile (iPhone 13) variant of the read-only CTA click test. Usage: node scripts/cta_click_test_mobile.mjs <id> <url>
import path from 'node:path';
import { ROOT, readJson, writeJson } from './lib/util.mjs';
import { newContext, navigate, collectPage, closeBrowser } from './lib/browser.mjs';
import { runCtaClickTests } from './lib/cta.mjs';
const [id, url] = process.argv.slice(2);
const ctx = await newContext('mobile');
const p = await ctx.newPage(); await navigate(p, url, { retries: 0 });
const d = await collectPage(p); await p.close();
const dir = path.join(ROOT, 'evidence/screenshots', id);
const tests = await runCtaClickTests(ctx, url, d.links, dir, 4, 'mobile-cta-click');
const f = path.join(ROOT, 'data/raw/audits', `${id}.json`); const a = await readJson(f);
a.ctaClickTestsMobile = tests; await writeJson(f, a);
console.log(JSON.stringify(tests.map(t => [t.text, t.href, t.effect, (t.signals || []).join('|')])));
await ctx.close(); await closeBrowser();
