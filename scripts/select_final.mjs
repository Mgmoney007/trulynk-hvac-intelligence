// Apply verified-listing rules to choose companies for audit and for the final prospect set.
// Usage:
//   node scripts/select_final.mjs audit-set [perCounty=16]   -> config/audit_set.json (+ data/screening_log.csv)
//   node scripts/select_final.mjs final                      -> config/selected_companies.json
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson, writeJson } from './lib/util.mjs';
import { parseAddress, countyForCity, siteAddress } from './lib/geo.mjs';

const TARGET = { Hudson: 12, Bergen: 13, Passaic: 12, Essex: 13 };
const [mode, nArg] = process.argv.slice(2);
const manual = await readJson(path.join(ROOT, 'config/manual_review.json'), {});
const pre = (await readJson(path.join(ROOT, 'data/interim/prescreen.json')));

const rows = [];
for (const c of pre) {
  const place = await readJson(path.join(ROOT, 'data/raw/maps_place', `${c.id}.json`), null);
  const mr = manual[c.id] || {};
  const reasons = [...c.prescreenReasons];
  let county = null, addr = {};
  if (c.prescreen === 'pass') {
    if (!place) reasons.push('listing_not_verified');
    else if (place.error) reasons.push(`listing_retrieval_error:${place.error.slice(0, 60)}`);
    else {
      addr = parseAddress(place.address);
      county = mr.county || countyForCity(addr.city);
      // Service-area listings hide their address; fall back to the address the business publishes on its own site.
      if (!addr.street) {
        const audit = await readJson(path.join(ROOT, 'data/raw/audits', `${c.id}.json`), null);
        const sa = siteAddress(audit);
        if (sa && countyForCity(sa.city)) { addr = { ...sa, viaSite: true }; county = mr.county || countyForCity(sa.city); }
      }
      if (place.permanentlyClosed) reasons.push('permanently_closed');
      if (place.temporarilyClosed) reasons.push('temporarily_closed');
      if (!place.address && !addr.viaSite) reasons.push('no_public_address_county_unverified');
      else if (!county) reasons.push(`outside_target_counties(${addr.city || place.address || 'unknown'})`);
      // Google hides review counts in the logged-out view used here, so demand is screened on rating presence + street address.
      if (place.rating == null) reasons.push('no_google_rating_no_review_evidence');
      if (!addr.street && place.address && !addr.viaSite) reasons.push('no_street_address_on_listing');
      if ((c.softFlags || []).some(f => f.startsWith('town_keyword')) && !addr.street && !mr.verifiedEntity) reasons.push('possible_keyword_listing_unverified_entity');
      if (place.category && /supplier|supply|store|duct cleaning|appliance/i.test(place.category)) reasons.push(`non_contractor_category(${place.category})`);
    }
  }
  if (mr.exclude) reasons.push(`manual:${mr.exclude}`);
  rows.push({ id: c.id, name: place?.name || c.name, website: c.website, county, city: addr.city || '', reviews: place?.reviews ?? '', rating: place?.rating ?? '', category: place?.category || c.categoryLine,
    status: reasons.length ? 'excluded' : 'eligible', reasons: reasons.join('; '), placeUrl: c.placeUrl, queries: c.queries.length });
}
const csv = ['id,name,website,county,city,google_reviews,google_rating,category,status,reasons,matched_queries,place_url',
  ...rows.map(r => [r.id, r.name, r.website, r.county, r.city, r.reviews, r.rating, r.category, r.status, r.reasons, r.queries, r.placeUrl].map(v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(','))].join('\n') + '\n';
await fs.writeFile(path.join(ROOT, 'data/screening_log.csv'), csv);

const eligible = rows.filter(r => r.status === 'eligible');
// Rank by prominence across municipality/category searches, then rating.
const rankKey = r => r.queries * 10 + Number(r.rating || 0);
if (mode === 'audit-set') {
  const per = Number(nArg || 16);
  const set = [];
  for (const county of Object.keys(TARGET)) set.push(...eligible.filter(r => r.county === county).sort((a, b) => rankKey(b) - rankKey(a)).slice(0, per));
  await writeJson(path.join(ROOT, 'config/audit_set.json'), set.map(r => ({ id: r.id, name: r.name, website: r.website, county: r.county })));
  console.log('eligible by county', JSON.stringify(Object.fromEntries(Object.keys(TARGET).map(k => [k, eligible.filter(r => r.county === k).length]))), 'audit set', set.length);
} else if (mode === 'final') {
  const audited = new Set((await fs.readdir(path.join(ROOT, 'data/raw/audits'))).map(f => f.replace(/\.json$/, '')));
  const set = [];
  for (const [county, n] of Object.entries(TARGET)) set.push(...eligible.filter(r => r.county === county && audited.has(r.id)).sort((a, b) => rankKey(b) - rankKey(a)).slice(0, n));
  await writeJson(path.join(ROOT, 'config/selected_companies.json'), set.map(r => ({ id: r.id, county: r.county })));
  console.log('final', set.length, JSON.stringify(Object.fromEntries(Object.keys(TARGET).map(k => [k, set.filter(r => r.county === k).length]))));
}
