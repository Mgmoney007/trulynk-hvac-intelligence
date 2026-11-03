// Merge all Google Maps search result files into a deduplicated candidate list with screening flags.
// Usage: node scripts/build_candidates.mjs  -> data/interim/candidates_all.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, readJson, writeJson, slug } from './lib/util.mjs';
import { normalizePhone } from './lib/phone.mjs';

// National franchises / national brands / consolidators (name-level screen; reviewed manually afterwards).
const FRANCHISE_RX = /one hour heating|aire serv|service experts|benjamin franklin|mister sparky|mr\.? rooter|roto-?rooter|rescue rooter|\bars\b|petro home|len the plumber|comfort systems usa|mr\.? handyman|abc home|horizon services|ductz|dryer vent wizard|sears|home depot|lowe'?s|trane comfort specialist$/i;
// Lead-generation / template site patterns: generic hosting or "<Service> <Town>" names that front call networks.
const LEADGEN_HOST_RX = /lovable\.app|\.online\/?$|\.site\/?$|business\.site|wixsite\.com|godaddysites\.com|square\.site|carrd\.co|webflow\.io|netlify\.app|vercel\.app|framer\.(website|ai)|mystrikingly|yolasite/i;
const GENERIC_NAME_RX = /^(ac|a\/c|hvac|air conditioning|heating( and| &) (cooling|air)|furnace|express hvac|emergency)\b.*\b(repair|pros?|systems|services|company|experts?)\b.*$/i;
const HVAC_CAT_RX = /hvac|air condition|heating|furnace|boiler|mechanical|plumb|heat pump|cooling|ventilat/i;

function placeId(u) {
  const m = String(u || '').match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i) || String(u || '').match(/19s(ChIJ[\w-]+)/);
  return m ? m[1] : null;
}
function latLng(u) {
  const m = String(u || '').match(/!3d(-?[\d.]+)!4d(-?[\d.]+)/);
  return m ? { lat: Number(m[1]), lng: Number(m[2]) } : null;
}
function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return null; } }

const dir = path.join(ROOT, 'data/raw/maps_search');
const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
const byId = new Map();
for (const f of files) {
  const s = await readJson(path.join(dir, f));
  for (const r of s.results) {
    const pid = placeId(r.placeUrl);
    if (!pid) continue;
    if (!byId.has(pid)) byId.set(pid, { placeId: pid, name: r.name, placeUrl: r.placeUrl.split('?')[0], latLng: latLng(r.placeUrl), cardRating: r.rating, cardPhone: r.phone,
      website: r.website, categoryLine: r.categoryLine, bookOnline: r.bookOnline, sponsored: r.sponsored, queries: [], queryCounties: [] });
    const c = byId.get(pid);
    c.queries.push(s.query);
    if (!c.queryCounties.includes(s.county)) c.queryCounties.push(s.county);
    c.website = c.website || r.website;
    c.bookOnline = c.bookOnline || r.bookOnline;
  }
}
const all = [...byId.values()];
// Secondary dedupe: same website host or same phone across different place IDs (multi-listing businesses).
const hostCount = new Map(), phoneCount = new Map();
for (const c of all) {
  const h = host(c.website); if (h) hostCount.set(h, (hostCount.get(h) || 0) + 1);
  const p = normalizePhone(c.cardPhone)?.e164; if (p) phoneCount.set(p, (phoneCount.get(p) || 0) + 1);
}
for (const c of all) {
  c.id = slug(c.name);
  c.websiteHost = host(c.website);
  c.flags = [];
  if (!c.website) c.flags.push('no_website');
  if (!HVAC_CAT_RX.test(c.categoryLine || '') && !HVAC_CAT_RX.test(c.name)) c.flags.push('category_not_hvac');
  if (FRANCHISE_RX.test(c.name)) c.flags.push('franchise_or_national_brand');
  if (c.website && LEADGEN_HOST_RX.test(c.website)) c.flags.push('leadgen_or_template_host');
  if (GENERIC_NAME_RX.test(c.name)) c.flags.push('generic_name_review');
  if (c.sponsored) c.flags.push('sponsored_card');
  if (c.websiteHost && hostCount.get(c.websiteHost) > 1) c.flags.push('shared_website_host');
  const p = normalizePhone(c.cardPhone)?.e164; if (p && phoneCount.get(p) > 1) c.flags.push('shared_phone');
  c.hits = c.queries.length;
}
// Make ids unique
const seen = new Map();
for (const c of all) { const n = (seen.get(c.id) || 0) + 1; seen.set(c.id, n); if (n > 1) c.id = `${c.id}-${n}`; }
all.sort((a, b) => b.hits - a.hits);
await writeJson(path.join(ROOT, 'data/interim/candidates_all.json'), all);
const clean = all.filter(c => !c.flags.some(f => ['no_website', 'category_not_hvac', 'franchise_or_national_brand', 'leadgen_or_template_host'].includes(f)));
console.log(`search files ${files.length}, unique places ${all.length}, without hard-exclusion flags ${clean.length}`);
for (const k of ['no_website', 'category_not_hvac', 'franchise_or_national_brand', 'leadgen_or_template_host', 'generic_name_review', 'shared_website_host', 'shared_phone'])
  console.log(k, all.filter(c => c.flags.includes(k)).length);
