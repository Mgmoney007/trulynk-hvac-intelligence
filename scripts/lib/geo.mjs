// Address parsing and municipality -> county lookup for the four target counties.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.mjs';

const MUNI = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/nj_municipalities.json'), 'utf8'));
const LOOKUP = new Map();
for (const [county, towns] of Object.entries(MUNI)) if (!county.startsWith('_')) for (const t of towns) LOOKUP.set(t.toLowerCase(), county);

export function countyForCity(city) {
  if (!city) return null;
  return LOOKUP.get(String(city).trim().toLowerCase()) || null;
}

// "241 Main St Ste 407, Hackensack, NJ 07601" -> { street, city, state, zip }
// Service-area listings often show only "Hackensack, NJ" or nothing.
export function parseAddress(a) {
  const out = { street: null, city: null, state: null, zip: null };
  if (!a) return out;
  const parts = String(a).split(',').map(s => s.trim()).filter(Boolean).filter(s => !/^(United States|USA|US)$/i.test(s));
  const last = parts[parts.length - 1] || '';
  const m = last.match(/^([A-Z]{2})\s*(\d{5})?(?:-\d{4})?$/);
  if (m) {
    out.state = m[1]; out.zip = m[2] || null;
    out.city = parts[parts.length - 2] || null;
    out.street = parts.slice(0, -2).join(', ') || null;
  } else if (parts.length >= 2) {
    out.city = parts[parts.length - 2];
    out.street = parts.slice(0, -2).join(', ') || null;
  }
  return out;
}
