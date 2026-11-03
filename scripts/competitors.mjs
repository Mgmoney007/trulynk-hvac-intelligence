// Competitor comparison for the top-N prospects using the same audit method for every business.
// Competitors: nearest audited, verified HVAC businesses in the same county (by Google listing coordinates).
// Search visibility = presence/position in the recorded Google Maps queries (query text, date and method are logged in
// data/raw/maps_search/*.json). It is NOT a geo-grid ranking and no rank claims are made beyond those recorded queries.
// Usage: node scripts/competitors.mjs [topN=10] -> data/competitor_comparison.csv, data/interim/competitors.json
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson, writeJson } from './lib/util.mjs';
import { parseAddress, countyForCity } from './lib/geo.mjs';

const topN = Number(process.argv[2] || 10);
const scored = await readJson(path.join(ROOT, 'data/interim/scored.json'));
const pre = new Map((await readJson(path.join(ROOT, 'data/interim/prescreen.json'))).map(c => [c.id, c]));
const manual = await readJson(path.join(ROOT, 'config/manual_review.json'), {});

// Recorded Maps query positions
const qpos = new Map();
for (const f of (await fs.readdir(path.join(ROOT, 'data/raw/maps_search'))).filter(f => f.endsWith('.json'))) {
  const s = await readJson(path.join(ROOT, 'data/raw/maps_search', f));
  s.results.forEach((r, i) => {
    const m = String(r.placeUrl || '').match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i); if (!m) return;
    if (!qpos.has(m[1])) qpos.set(m[1], []);
    qpos.get(m[1]).push({ query: s.query, county: s.county, position: i + 1, date: s.retrievedAt.slice(0, 10) });
  });
}
const queriesByCounty = {};
for (const f of (await fs.readdir(path.join(ROOT, 'data/raw/maps_search'))).filter(f => f.endsWith('.json'))) { const s = await readJson(path.join(ROOT, 'data/raw/maps_search', f)); queriesByCounty[s.county] = (queriesByCounty[s.county] || 0) + 1; }

const SERVICE_PATH_RX = /(a-?c|air-?condition|cooling|furnace|boiler|heat-?pump|ductless|mini-?split|heating|maintenance|install|replace|repair|indoor-air|tune)/i;

async function features(id) {
  const a = await readJson(path.join(ROOT, 'data/raw/audits', `${id}.json`), null);
  const pl = await readJson(path.join(ROOT, 'data/raw/maps_place', `${id}.json`), null);
  const b = await readJson(path.join(ROOT, 'data/raw/bbb', `${id}.json`), null);
  const c = pre.get(id);
  if (!a || !c) return null;
  const d = a.desktop, m = a.mobile, s = a.signals || {};
  const pages = [d, ...Object.values(a.pages || {})].filter(Boolean);
  const forms = pages.flatMap(p => (p.forms || []).filter(f => !f.isSearch && f.fieldCount >= 2)).length;
  const vendors = [...(d?.vendors || []), ...Object.values(a.pages || {}).flatMap(p => p.vendors || [])];
  const servicePaths = new Set((d?.links || []).filter(l => l.abs && /^https?:/.test(l.abs)).map(l => { try { return new URL(l.abs).pathname.replace(/\/$/, ''); } catch { return ''; } }).filter(p => p.length > 1 && SERVICE_PATH_RX.test(p)));
  const pos = qpos.get(c.placeId) || [];
  const county = countyForCity(parseAddress(pl?.address).city) || manual[id]?.county || null;
  return {
    id, name: pl?.name || c.name, website: c.website, county, latLng: c.latLng, audited: !!d,
    tel_links: [...(d?.tel || []), ...(m?.tel || [])].length > 0, tel_malformed: [...(d?.tel || []), ...(m?.tel || [])].some(t => t.problem),
    mobile_call_above_fold: m ? !!m.telAboveFold : null, mobile_cta_above_fold: m ? (m.telAboveFold || (m.ctaAboveFold || []).length > 0) : null,
    email_published: (s.emails || []).length > 0, web_form: forms > 0, online_booking: vendors.some(v => ['field_service', 'scheduling'].includes(v.kind)),
    booking_cta_text: (s.bookingLinkTexts || []).length > 0, chat_or_text: vendors.some(v => ['chat', 'messaging', 'reviews_messaging'].includes(v.kind)),
    mobile_layout_ok: m ? (!!m.viewportMeta && !m.horizontalOverflow) : null, mobile_blocking_overlay: m ? m.maxBlockingCover > 0.3 : null,
    service_page_links: servicePaths.size, financing: !!s.financing, license_shown: (s.njLicenses || []).length > 0, testimonials: !!s.testimonials,
    tenure: s.sinceYear ? `since ${s.sinceYear}` : s.yearsClaim ? `${s.yearsClaim}+ yrs` : null, maintenance_plan: !!s.maintenancePlan,
    broken_links: (a.linkCheck?.broken || []).filter(x => x.reproduced).length,
    google_rating: pl?.rating ?? null, bbb_rating: b?.match?.rating || null,
    maps_query_hits: pos.length, maps_queries_in_county: queriesByCounty[county] || null, maps_best_position: pos.length ? Math.min(...pos.map(p => p.position)) : null,
  };
}
const dist = (a, b) => (!a || !b) ? Infinity : Math.hypot((a.lat - b.lat) * 69, (a.lng - b.lng) * 52.5);

const auditedIds = (await fs.readdir(path.join(ROOT, 'data/raw/audits'))).map(f => f.replace(/\.json$/, ''));
const pool = (await Promise.all(auditedIds.map(features))).filter(f => f && f.audited && f.county && !manual[f.id]?.exclude);
const top = scored.filter(r => ['A', 'B', 'C'].includes(r.pr.tier)).slice(0, topN);
const out = [];
const rows = [];
const DIMS = [
  ['tel_links', 'Tap-to-call links present', true], ['tel_malformed', 'Malformed tap-to-call link', false], ['mobile_call_above_fold', 'Call button on first mobile screen', true],
  ['mobile_cta_above_fold', 'Any call/book CTA on first mobile screen', true], ['web_form', 'Web request form', true], ['online_booking', 'Online booking tool', true],
  ['chat_or_text', 'Chat / text widget', true], ['mobile_layout_ok', 'Mobile layout fits screen', true], ['mobile_blocking_overlay', 'Blocking mobile overlay', false],
  ['financing', 'Financing mentioned', true], ['license_shown', 'NJ HVACR license shown', true], ['testimonials', 'Testimonials/reviews on site', true],
  ['email_published', 'Email published', true], ['broken_links', 'Reproduced broken links', false], ['service_page_links', 'Service-page links from homepage', true], ['maps_query_hits', 'Appearances in recorded Maps queries', true],
];
for (const r of top) {
  const me = await features(r.co.id);
  if (!me) continue;
  const comps = pool.filter(p => p.id !== me.id && p.county === me.county).sort((a, b) => dist(me.latLng, a.latLng) - dist(me.latLng, b.latLng)).slice(0, 3);
  const gaps = [];
  for (const [k, label, goodHigh] of DIMS) {
    const v = me[k];
    const better = comps.filter(c => {
      const cv = c[k];
      if (cv == null || v == null) return false;
      if (typeof cv === 'number') return goodHigh ? cv > v : cv < v;
      return goodHigh ? (cv === true && v === false) : (cv === false && v === true);
    });
    if (better.length >= 2) gaps.push({ dimension: label, prospect: v, competitorsBetter: better.map(c => `${c.name} (${c[k]})`) });
  }
  out.push({ prospect: me, competitors: comps.map(c => ({ ...c, distanceMi: Math.round(dist(me.latLng, c.latLng) * 10) / 10 })), gaps });
  for (const x of [me, ...comps]) rows.push({ prospect: me.name, role: x === me ? 'prospect' : 'competitor', distance_mi: x === me ? 0 : Math.round(dist(me.latLng, x.latLng) * 10) / 10, ...Object.fromEntries(Object.entries(x).filter(([k]) => !['latLng', 'audited'].includes(k))) });
}
await writeJson(path.join(ROOT, 'data/interim/competitors.json'), out);
const cols = Object.keys(rows[0] || {});
const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
await fs.writeFile(path.join(ROOT, 'data/competitor_comparison.csv'), [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n');
console.log(`compared ${out.length} prospects; pool ${pool.length}`);
