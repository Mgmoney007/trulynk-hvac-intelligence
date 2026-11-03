// Print decision-maker candidates (recomputed from stored page text) for manual verification.
// Usage: node scripts/review_owners.mjs [ids...]
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson } from './lib/util.mjs';
import { ownerCandidates } from './lib/owners.mjs';
let ids = process.argv.slice(2);
if (!ids.length) ids = (await readJson(path.join(ROOT, 'config/selected_companies.json'))).map(x => x.id);
for (const id of ids) {
  const a = await readJson(path.join(ROOT, 'data/raw/audits', `${id}.json`), null);
  if (!a) continue;
  const srcs = [['home', a.desktop?.finalUrl, a.desktop?.bodyText], ...Object.entries(a.pages || {}).map(([k, p]) => [k, p.url, p.bodyText])];
  const found = [];
  for (const [k, url, text] of srcs) for (const c of ownerCandidates(text)) found.push(`  ${c.name}  [${k}: ${url}]  "${c.context}"`);
  if (found.length) console.log(`## ${id}\n${found.join('\n')}`);
}
