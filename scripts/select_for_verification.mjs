// Rule-based pre-screen of the candidate pool before Google listing verification.
// Usage: node scripts/select_for_verification.mjs [perCounty=32] -> data/interim/prescreen.json, config/places_to_verify.json
import path from 'node:path';
import { ROOT, readJson, writeJson } from './lib/util.mjs';

const perCounty = Number(process.argv[2] || 32);
const all = await readJson(path.join(ROOT, 'data/interim/candidates_all.json'));
const muni = await readJson(path.join(ROOT, 'config/nj_municipalities.json'));
const towns = Object.entries(muni).filter(([k]) => !k.startsWith('_')).flatMap(([, v]) => v);
const townSlugs = towns.map(t => t.toLowerCase().replace(/[^a-z]/g, '')).filter(t => t.length >= 5);

const HARD = ['no_website', 'category_not_hvac', 'franchise_or_national_brand', 'leadgen_or_template_host'];
const SUPPLIER_RX = /supplier|supply|store|wholesaler|distributor|manufacturer|duct cleaning|dryer vent|appliance repair|roofing|electrician$/i;
const BAD_HOST_RX = /\.shop$|\.online$|\.site$|\.store$|\.xyz$|\.top$|dot\.cards|instagram\.com|facebook\.com|linktr\.ee|yelp\.com|lc\.hvacmastersuite|angi\.com|homeadvisor|thumbtack|nextdoor/i;

const out = [];
const hostSeen = new Map();
for (const c of all) {
  const reasons = [];
  for (const f of c.flags) if (HARD.includes(f)) reasons.push(f);
  const cat = (c.categoryLine || '').split('·')[0].trim();
  if (SUPPLIER_RX.test(cat) || /supply|supplies|carrier enterprise|ferguson|johnstone/i.test(c.name)) reasons.push('supplier_or_non_contractor');
  if (c.websiteHost && BAD_HOST_RX.test(c.websiteHost)) reasons.push('non_business_or_throwaway_domain');
  // Keyword-stuffed listings: a town name in both the business name and the domain, e.g. "Reliable HVAC Paterson" + reliablehvacpaterson.com
  const nameSlug = c.name.toLowerCase().replace(/[^a-z]/g, '');
  const hostSlug = (c.websiteHost || '').toLowerCase().replace(/[^a-z]/g, '');
  const townHit = townSlugs.find(t => nameSlug.includes(t) && hostSlug.includes(t));
  const soft = [];
  if (townHit) soft.push(`town_keyword_listing(${townHit})`); // soft: resolved after listing verification
  if (c.flags.includes('generic_name_review')) reasons.push('generic_keyword_name');
  if (c.websiteHost && hostSeen.has(c.websiteHost)) reasons.push(`duplicate_of:${hostSeen.get(c.websiteHost)}`);
  else if (c.websiteHost) hostSeen.set(c.websiteHost, c.id);
  out.push({ ...c, prescreen: reasons.length ? 'excluded' : 'pass', prescreenReasons: reasons, softFlags: soft });
}
await writeJson(path.join(ROOT, 'data/interim/prescreen.json'), out);
const pass = out.filter(c => c.prescreen === 'pass');
// Pick per primary query county, favouring listings that appear in more municipality searches.
const pick = [];
for (const county of ['Hudson', 'Bergen', 'Passaic', 'Essex']) {
  const inC = pass.filter(c => c.queryCounties[0] === county).sort((a, b) => b.hits - a.hits || (b.cardRating || 0) - (a.cardRating || 0));
  pick.push(...inC.slice(0, perCounty));
}
await writeJson(path.join(ROOT, 'config/places_to_verify.json'), pick.map(c => ({ id: c.id, placeUrl: c.placeUrl })));
const r = {}; for (const c of out) for (const x of c.prescreenReasons) { const k = x.split(/[(:]/)[0]; r[k] = (r[k] || 0) + 1; }
console.log('pool', out.length, 'pass', pass.length, 'picked', pick.length, JSON.stringify(r));
for (const county of ['Hudson', 'Bergen', 'Passaic', 'Essex']) console.log(county, 'pass', pass.filter(c => c.queryCounties[0] === county).length);
