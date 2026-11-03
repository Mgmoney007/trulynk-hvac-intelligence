// Build BBB lookup items (name, city, phone) for eligible companies from listing data.
// Usage: node scripts/bbb_items.mjs > /path/items.json
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson } from './lib/util.mjs';
import { parseAddress } from './lib/geo.mjs';
const csv = (await fs.readFile(path.join(ROOT, 'data/screening_log.csv'), 'utf8')).trim().split('\n').slice(1);
const ids = csv.filter(l => /,eligible,/.test(l)).map(l => l.split(',')[0]);
const out = [];
for (const id of ids) {
  const p = await readJson(path.join(ROOT, 'data/raw/maps_place', `${id}.json`), null);
  if (p) out.push({ id, name: p.name, city: parseAddress(p.address).city, phone: p.phone });
}
console.log(JSON.stringify(out, null, 1));
