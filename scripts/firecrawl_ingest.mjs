// Ingest a Firecrawl fallback retrieval (performed via the Firecrawl MCP tool) into a company's audit record,
// download its screenshot as evidence, and append to the Firecrawl usage log.
// Usage: node scripts/firecrawl_ingest.mjs <compact.json>
// compact.json: { id, url, mobile, purpose, statusCode, title, links[], screenshotUrl, creditsUsed, scrapeId, proxyUsed }
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, nowIso, readJson, writeJson, appendJsonl } from './lib/util.mjs';
import { normalizePhone } from './lib/phone.mjs';
import { detectVendors } from './lib/browser.mjs';

const rec = await readJson(path.resolve(process.argv[2]));
const at = nowIso();
let shot = null;
if (rec.screenshotUrl) {
  const dir = path.join(ROOT, 'evidence/screenshots', rec.id);
  await fs.mkdir(dir, { recursive: true });
  const f = path.join(dir, `firecrawl-${rec.mobile ? 'mobile' : 'desktop'}${rec.suffix ? '-' + rec.suffix : ''}.png`);
  const r = await fetch(rec.screenshotUrl);
  if (r.ok) { await fs.writeFile(f, Buffer.from(await r.arrayBuffer())); shot = path.relative(ROOT, f); }
}
const links = rec.links || [];
const tel = links.filter(l => /^tel:/i.test(l)).map(l => ({ href: l, e164: normalizePhone(l)?.e164 || null }));
const mailto = [...new Set(links.filter(l => /^mailto:/i.test(l)).map(l => decodeURIComponent(l.slice(7).split('?')[0]).toLowerCase()))];
const entry = { at, method: rec.mobile ? 'firecrawl_scrape_mobile' : 'firecrawl_scrape_desktop', url: rec.url, purpose: rec.purpose || 'fallback', statusCode: rec.statusCode, title: rec.title,
  tel, mailto, linkCount: links.length, vendors: detectVendors(links), screenshot: shot, scrapeId: rec.scrapeId, creditsUsed: rec.creditsUsed, proxyUsed: rec.proxyUsed };
const auditFile = path.join(ROOT, 'data/raw/audits', `${rec.id}.json`);
const audit = await readJson(auditFile, null);
if (audit) {
  audit.firecrawl = [...(audit.firecrawl || []), entry];
  audit.retrieval.push({ step: `firecrawl_${rec.mobile ? 'mobile' : 'desktop'}`, method: entry.method, url: rec.url, at, access: rec.statusCode && rec.statusCode < 400 ? 'ok' : 'http_error', status: rec.statusCode });
  if (shot) audit.screenshots[`firecrawl_${rec.mobile ? 'mobile' : 'desktop'}`] = shot;
  await writeJson(auditFile, audit);
}
const usageFile = path.join(ROOT, 'logs/firecrawl_usage.jsonl');
const already = rec.scrapeId && (await fs.readFile(usageFile, 'utf8').catch(() => '')).includes(rec.scrapeId);
if (audit) audit.firecrawl = audit.firecrawl.filter((e, i, arr) => !e.scrapeId || arr.findIndex(x => x.scrapeId === e.scrapeId) === i);
if (audit) await writeJson(auditFile, audit);
if (!already) await appendJsonl(usageFile, { at, tool: 'firecrawl_scrape', id: rec.id, url: rec.url, mobile: !!rec.mobile, purpose: rec.purpose || 'fallback', creditsUsed: rec.creditsUsed ?? null, scrapeId: rec.scrapeId ?? null, statusCode: rec.statusCode ?? null });
console.log(`ingested ${rec.id}: status ${rec.statusCode}, tel ${tel.length}, mailto ${mailto.length}, screenshot ${shot}`);
