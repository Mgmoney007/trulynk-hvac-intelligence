// Address parsing and municipality -> county lookup for the four target counties.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.mjs';

const MUNI = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/nj_municipalities.json'), 'utf8'));
const LOOKUP = new Map();
for (const [county, towns] of Object.entries(MUNI)) if (!county.startsWith('_')) for (const t of towns) LOOKUP.set(t.toLowerCase(), county);

export function countyForCity(city) {
  if (!city) return null;
  const raw = String(city).trim().toLowerCase();
  if (LOOKUP.has(raw)) return LOOKUP.get(raw);
  // Listing addresses sometimes carry the municipal form ("Weehawken Township", "Township of Wayne").
  const stripped = raw.replace(/\s+(township|twp\.?|borough|boro|village)$/, '').replace(/^(township|borough|town|village) of\s+/, '');
  return LOOKUP.get(stripped) || null;
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

// Business address published on the official website (schema.org markup first, then visible text).
// Returns { street, city, zip, source } or null. Only NJ addresses are accepted.
export function siteAddress(audit) {
  const walk = (n, acc) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(x => walk(x, acc));
    const a = n.address;
    for (const x of (Array.isArray(a) ? a : a ? [a] : [])) if (x && typeof x === 'object' && x.addressLocality && /^(NJ|New Jersey)$/i.test(String(x.addressRegion || '').trim()))
      acc.push({ street: x.streetAddress || null, city: String(x.addressLocality).trim(), zip: x.postalCode || null, source: 'schema.org markup on official site' });
    for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v, acc);
  };
  const acc = [];
  walk(audit?.desktop?.jsonLd || [], acc);
  if (acc.length) return acc[0];
  const text = [audit?.desktop?.bodyText || '', ...Object.values(audit?.pages || {}).map(p => p.bodyText || '')].join('\n');
  const m = text.match(/(\d{1,5}\s[A-Za-z0-9 .'#-]{3,40}?),?\s*\n?\s*([A-Z][A-Za-z .'-]{2,25}),\s*(?:NJ|New Jersey)\.?\s*(0\d{4})/);
  if (m) return { street: m[1].trim(), city: m[2].trim(), zip: m[3], source: 'visible text on official site' };
  return null;
}
