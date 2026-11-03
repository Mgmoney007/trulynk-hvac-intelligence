// Build company records, findings, both scores, priority tiers and the CSV deliverables.
// Inputs:  config/selected_companies.json (ids chosen by select_final.mjs), data/interim/prescreen.json,
//          data/raw/maps_place/*.json, data/raw/audits/*.json, config/manual_review.json
// Outputs: data/hvac_master_prospects.csv, data/hvac_opportunity_scores.csv, data/research_evidence.csv, data/interim/scored.json
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson, writeJson, today } from './lib/util.mjs';
import { normalizePhone } from './lib/phone.mjs';
import { buildFindings, phoneRecords } from './lib/findings.mjs';
import { opportunityScore, evidenceConfidence, assignPriority } from './lib/scoring.mjs';
import { countyForCity, parseAddress } from './lib/geo.mjs';

const csvEsc = v => { const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (rows, cols) => [cols.join(','), ...rows.map(r => cols.map(c => csvEsc(r[c])).join(','))].join('\n') + '\n';

const selected = await readJson(path.join(ROOT, 'config/selected_companies.json'));
const pre = new Map((await readJson(path.join(ROOT, 'data/interim/prescreen.json'))).map(c => [c.id, c]));
const manual = await readJson(path.join(ROOT, 'config/manual_review.json'), {});

const records = [];
for (const sel of selected) {
  const c = pre.get(sel.id);
  const place = await readJson(path.join(ROOT, 'data/raw/maps_place', `${sel.id}.json`), null);
  const audit = await readJson(path.join(ROOT, 'data/raw/audits', `${sel.id}.json`), null);
  const mr = manual[sel.id] || {};
  const bbbRaw = await readJson(path.join(ROOT, 'data/raw/bbb', `${sel.id}.json`), null);
  const bbb = bbbRaw?.match ? { matched: true, basis: bbbRaw.match.basis, rating: bbbRaw.match.rating, name: bbbRaw.match.name, address: bbbRaw.match.address, phone: bbbRaw.match.phone, url: bbbRaw.match.href || bbbRaw.searchUrl, retrievedAt: bbbRaw.retrievedAt }
    : bbbRaw ? { matched: false, url: bbbRaw.searchUrl, retrievedAt: bbbRaw.retrievedAt } : null;
  const addr = parseAddress(place?.address);
  const county = mr.county || countyForCity(addr.city) || null;
  const gbpE164 = normalizePhone(place?.phone || c.cardPhone)?.e164 || null;
  const co = {
    id: sel.id, name: mr.officialName || place?.name || c.name, website: audit?.website || c.website, placeUrl: c.placeUrl, placeId: c.placeId,
    address: place?.address || null, street: addr.street, city: addr.city, zip: addr.zip, county, countyBasis: mr.county ? 'manual (see notes)' : county ? 'listing address municipality' : 'unresolved',
    gbpPhone: place?.phone || c.cardPhone, gbpE164, gbpRating: place?.rating ?? null, gbpReviews: place?.reviews ?? null, gbpCategory: place?.category || null,
    gbpHours: place?.hoursSummary || null, gbpClaimPrompt: !!place?.claimPrompt, gbpPlaceRetrieved: !!place && !place.error, gbpRetrievedAt: place?.retrievedAt || null, gbpScreenshot: place?.screenshot || null,
    permanentlyClosed: !!place?.permanentlyClosed, independent: mr.independent !== false, independenceNote: mr.independenceNote || 'No franchise/national-brand indicators in name, listing or site',
    decisionMaker: mr.decisionMaker || null, conflicts: mr.conflicts || [], notes: mr.notes || '', excluded: !!mr.exclude, excludeReason: mr.exclude || '',
    queriesMatched: c.queries, softFlags: c.softFlags || [], bbb,
  };
  const findings = buildFindings(co, audit);
  for (const f of mr.extraFindings || []) findings.push({ companyId: co.id, company: co.name, verifiedAt: f.verifiedAt || audit?.auditedAt, methods: [], reproduced: false, unresolved: '', reproductionSteps: '', confidence: f.confidence ?? 60, ...f });
  const opp = opportunityScore(co, audit, findings);
  const conf = evidenceConfidence(co, audit, findings);
  const pr = assignPriority(co, opp, conf, findings);
  const phones = phoneRecords(co, audit);
  records.push({ co, audit, findings, opp, conf, pr, phones });
}

// Rank: tier, then provisional opportunity, then confidence.
const tierRank = { A: 0, B: 1, C: 2, D: 3 };
records.sort((a, b) => tierRank[a.pr.tier] - tierRank[b.pr.tier] || (b.opp.provisional ?? -1) - (a.opp.provisional ?? -1) || b.conf.total - a.conf.total);
records.forEach((r, i) => { r.rank = i + 1; });

const SERVICE_FOR = {
  'A-TEL-MALFORMED': 'Fix click-to-call markup across site; add call-tap tracking',
  'A-TEL-MISMATCH': 'Correct phone links; audit call-tracking number display',
  'A-BROKEN-LINK': 'Repair broken links/CTAs; add automated link monitoring',
  'A-CTA-PAGE-ERROR': 'Restore booking/contact page and route form leads to CRM',
  'A-LISTING-WEBSITE-ERROR': 'Fix Google listing website link and landing page',
  'A-CAPTCHA-ERROR': 'Fix form CAPTCHA configuration; test lead delivery end-to-end',
  'A-NO-VIEWPORT': 'Mobile-responsive rebuild of key landing pages',
  'A-MOBILE-OVERFLOW': 'Fix mobile layout overflow on homepage',
  'A-HTTPS-FAILS': 'Install/repair SSL and force HTTPS',
  'A-NO-HTTPS-REDIRECT': 'Force HTTPS redirect',
  'A-PLACEHOLDER-TEXT': 'Remove template placeholder content',
  'B-PHONE-INCONSISTENT': 'Reconcile listing/site phone numbers (NAP consistency)',
  'F-NO-TEL-LINKS': 'Make every phone number tap-to-call',
  'F-NO-FORM-OR-BOOKING': 'Add service-request form or online booking with CRM routing',
  'F-NO-MOBILE-CALL-ABOVE-FOLD': 'Add sticky mobile call/book bar',
  'F-NO-MOBILE-CTA': 'Add above-the-fold mobile call/book actions',
  'F-BLOCKING-OVERLAY': 'Reduce intrusive mobile pop-ups/banners',
};
function strongest(findings) {
  const order = f => (f.kind === 'defect' ? 0 : f.kind === 'friction' ? 1 : 2) * 10 + (f.status === 'Verified' ? 0 : 5) + ({ high: 0, medium: 1, low: 2, none: 3 }[f.severity] ?? 3);
  return [...findings].filter(f => ['defect', 'friction'].includes(f.kind)).sort((a, b) => order(a) - order(b))[0] || null;
}
function nextAction(r) {
  const t = r.pr.tier;
  if (t === 'A') return 'Prepare outreach with reproduced defect evidence (Pass 2)';
  if (t === 'B') return 'Confirm open questions (owner, lead handling) before outreach';
  if (t === 'C') return 'Further research: resolve access/evidence gaps listed in research queue';
  return r.co.excluded ? 'Excluded' : 'Defer: no material fixable problem found';
}

const master = [], scores = [], evidence = [];
for (const r of records) {
  const { co, audit, findings, opp, conf, pr, phones } = r;
  const top = strongest(findings);
  const s = audit?.signals || {};
  const services = Object.entries(s.services || {}).filter(([, v]) => v).map(([k]) => k);
  const primary = phones.find(p => p.classification === 'published_primary');
  master.push({
    rank: r.rank, priority_tier: pr.tier, company_id: co.id, business_name: co.name, street: co.street, city: co.city, zip: co.zip, county: co.county, county_basis: co.countyBasis,
    website: co.website, google_maps_url: co.placeUrl, google_place_id: co.placeId, google_category: co.gbpCategory,
    google_rating: co.gbpRating, google_review_count: co.gbpReviews ?? 'not retrievable (Google limited view)', bbb_match: co.bbb?.matched ? `${co.bbb.rating || 'n/a'} (${co.bbb.basis})` : co.bbb ? 'no match found' : 'not checked', google_listing_verified_at: co.gbpRetrievedAt, google_claim_prompt_shown: co.gbpClaimPrompt,
    public_phone_primary: primary?.display || normalizePhone(co.gbpPhone)?.display || '', phone_numbers_classified: phones.map(p => `${p.display} [${p.classification}; ${p.sources.join('+')}]`),
    public_email: (s.emails || []).join('; '), email_source: (s.emails || []).length ? 'official site (home/contact/about)' : 'not published on crawled pages',
    decision_maker: co.decisionMaker ? `${co.decisionMaker.name} (${co.decisionMaker.title})` : '', decision_maker_source: co.decisionMaker?.sourceUrl || '', decision_maker_status: co.decisionMaker ? co.decisionMaker.status || 'Stated on official site' : 'Not found on official site',
    core_services: services, operating_history: s.sinceYear ? `Since ${s.sinceYear} (site claim)` : s.yearsClaim ? `${s.yearsClaim}+ years (site claim)` : '',
    nj_hvacr_license_on_site: (s.njLicenses || []).join('; '), commercial_activity_evidence: [co.gbpReviews != null ? `${co.gbpReviews} Google reviews` : null, s.hiring ? 'careers/hiring page' : null, s.maintenancePlan ? 'maintenance plan offered' : null, s.financing ? 'financing offered' : null, s.teamClaim ? `team claim: ${s.teamClaim}` : null].filter(Boolean),
    independence: co.independent ? 'Independent (no franchise indicators)' : 'Not independent', independence_note: co.independenceNote,
    site_vendors_detected: (audit?.desktop?.vendors || []).map(v => `${v.name}(${v.kind})`),
    audit_desktop: audit?.desktop ? 'ok' : 'failed/blocked', audit_mobile: audit?.mobile ? 'ok' : 'failed/blocked', access_failures: (audit?.accessFailures || []).map(a => `${a.step}:${a.access}${a.status ? ' ' + a.status : ''}`),
    firecrawl_fallback_used: (audit?.firecrawl || []).length > 0,
    verified_defects: findings.filter(f => f.kind === 'defect' && f.status === 'Verified').map(f => f.title),
    friction_findings: findings.filter(f => f.kind === 'friction').map(f => f.title),
    requires_client_verification: findings.filter(f => f.status === 'Requires Client Verification').map(f => f.title),
    opportunity_score_provisional: opp.provisional ?? '', evidence_confidence: conf.total, evidence_band: conf.band, priority_reason: pr.reason,
    sources: [co.placeUrl, co.website, ...Object.values(audit?.pages || {}).map(p => p.url)].filter(Boolean), screened_at: audit?.auditedAt || '', notes: co.notes,
  });
  scores.push({
    rank: r.rank, company_name: co.name, county: co.county, priority_tier: pr.tier,
    confirmed_opportunity_points: opp.confirmed, unassessed_potential_points: opp.unassessed, maximum_possible_score: opp.maxPossible,
    evidence_coverage_pct: Math.round(opp.coverage * 100), opportunity_score_provisional: opp.provisional ?? 'insufficient coverage',
    fixable_pts: `${opp.byCriterion.fixable.points}/${opp.byCriterion.fixable.assessedMax}${opp.byCriterion.fixable.unassessed ? ` (+${opp.byCriterion.fixable.unassessed} unassessed)` : ''}`,
    economic_pts: `${opp.byCriterion.economic.points}/${opp.byCriterion.economic.assessedMax}${opp.byCriterion.economic.unassessed ? ` (+${opp.byCriterion.economic.unassessed} unassessed)` : ''}`,
    conversion_pts: `${opp.byCriterion.conversion.points}/${opp.byCriterion.conversion.assessedMax}${opp.byCriterion.conversion.unassessed ? ` (+${opp.byCriterion.conversion.unassessed} unassessed)` : ''}`,
    automation_pts: `${opp.byCriterion.automation.points}/${opp.byCriterion.automation.assessedMax}${opp.byCriterion.automation.unassessed ? ` (+${opp.byCriterion.automation.unassessed} unassessed)` : ''}`,
    accessibility_pts: `${opp.byCriterion.accessibility.points}/${opp.byCriterion.accessibility.assessedMax}${opp.byCriterion.accessibility.unassessed ? ` (+${opp.byCriterion.accessibility.unassessed} unassessed)` : ''}`,
    reputation_pts: `${opp.byCriterion.reputation.points}/${opp.byCriterion.reputation.assessedMax}${opp.byCriterion.reputation.unassessed ? ` (+${opp.byCriterion.reputation.unassessed} unassessed)` : ''}`,
    evidence_confidence_score: conf.total, evidence_band: conf.band,
    conf_reproduced: `${conf.components.reproduced.points}/35`, conf_source_quality: `${conf.components.sourceQuality.points}/20`, conf_recency: `${conf.components.recency.points}/15`,
    conf_corroboration: `${conf.components.corroboration.points}/15`, conf_completeness: `${conf.components.completeness.points}/15`,
    strongest_verified_problem: top ? `${top.title} [${top.status}]` : 'None found', strongest_finding_id: top?.findingId || '',
    recommended_service: top ? (SERVICE_FOR[top.code] || 'Website conversion fixes') : 'None at this time', next_action: nextAction(r), priority_reason: pr.reason,
    scoring_basis: Object.entries(opp.subcriteria).map(([k, v]) => `${k}: ${v.assessed ? v.points + '/' + v.max : 'unassessed(' + v.max + ')'} - ${v.basis}`).join(' | '),
  });
  // Evidence register: source rows + finding rows
  if (co.bbb?.matched) evidence.push({ evidence_id: `${co.id}--SRC-BBB`, company_id: co.id, business_name: co.name, record_type: 'source', finding_code: '', title: 'BBB record matched',
    description: `${co.bbb.name} | BBB rating ${co.bbb.rating || 'n/a'} | ${co.bbb.phone || ''} | ${co.bbb.address || ''} | match basis: ${co.bbb.basis}`, source_url: co.bbb.url, evidence_path: '',
    verification_date: (co.bbb.retrievedAt || '').slice(0, 10), retrieval_method: 'playwright_chromium_bbb_search', reproduction_steps: '', status: 'Verified', trulynk_category: '', severity: '', confidence: 80, unresolved_questions: '' });
  if (co.gbpPlaceRetrieved) evidence.push({ evidence_id: `${co.id}--SRC-GBP`, company_id: co.id, business_name: co.name, record_type: 'source', finding_code: '', title: 'Google Maps listing retrieved',
    description: `${co.address || ''} | ${co.gbpPhone || ''} | ${co.gbpRating ?? ''} stars, ${co.gbpReviews ?? ''} reviews | category ${co.gbpCategory || ''}`, source_url: co.placeUrl, evidence_path: co.gbpScreenshot,
    verification_date: (co.gbpRetrievedAt || '').slice(0, 10), retrieval_method: 'playwright_chromium_google_maps_place', reproduction_steps: '', status: 'Verified', trulynk_category: '', severity: '', confidence: 85, unresolved_questions: '' });
  for (const rt of audit?.retrieval || []) evidence.push({ evidence_id: `${co.id}--SRC-${rt.step}`, company_id: co.id, business_name: co.name, record_type: 'source', finding_code: '', title: `Retrieval: ${rt.step}`,
    description: `access=${rt.access} status=${rt.status ?? ''}${rt.error ? ' error=' + rt.error : ''}`, source_url: rt.url, evidence_path: (audit.screenshots || {})[rt.step.replace('_home', '_asis')] || '',
    verification_date: (rt.at || '').slice(0, 10), retrieval_method: rt.method, reproduction_steps: '', status: rt.access === 'ok' ? 'Retrieved' : 'Access failure', trulynk_category: '', severity: '', confidence: '', unresolved_questions: '' });
  for (const f of findings) evidence.push({ evidence_id: f.findingId, company_id: co.id, business_name: co.name, record_type: f.kind, finding_code: f.code, title: f.title, description: f.description,
    source_url: f.sourceUrl, evidence_path: f.evidencePath || '', verification_date: (f.verifiedAt || '').slice(0, 10), retrieval_method: (f.methods || []).join('+'), reproduction_steps: f.reproductionSteps,
    status: f.status, trulynk_category: f.trulynkCategory || '', severity: f.severity, confidence: f.confidence, unresolved_questions: f.unresolved });
}

await writeJson(path.join(ROOT, 'data/interim/scored.json'), records.map(({ audit, ...r }) => ({ ...r, auditSummary: audit ? { screenshots: audit.screenshots, signals: { ...audit.signals }, mobile: audit.mobile && { ...audit.mobile, overlays: undefined }, vendors: audit.desktop?.vendors, pages: Object.fromEntries(Object.entries(audit.pages || {}).map(([k, p]) => [k, { url: p.url, status: p.status, access: p.access }])) } : null })));
await fs.writeFile(path.join(ROOT, 'data/hvac_master_prospects.csv'), toCsv(master, Object.keys(master[0])));
await fs.writeFile(path.join(ROOT, 'data/hvac_opportunity_scores.csv'), toCsv(scores, Object.keys(scores[0])));
await fs.writeFile(path.join(ROOT, 'data/research_evidence.csv'), toCsv(evidence, Object.keys(evidence[0])));
const tiers = records.reduce((m, r) => { m[r.pr.tier] = (m[r.pr.tier] || 0) + 1; return m; }, {});
console.log(`companies ${records.length}, tiers ${JSON.stringify(tiers)}, evidence rows ${evidence.length}, built ${today()}`);
