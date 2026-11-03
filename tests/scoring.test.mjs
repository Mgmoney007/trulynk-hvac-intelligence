import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opportunityScore, evidenceConfidence, assignPriority } from '../scripts/lib/scoring.mjs';
import { buildFindings } from '../scripts/lib/findings.mjs';

const baseCo = { id: 'x', name: 'X HVAC', website: 'https://x.example/', gbpPhone: '+1 201-285-4793', gbpE164: '+12012854793', gbpRating: 4.9, gbpReviews: 250,
  gbpPlaceRetrieved: true, gbpClaimPrompt: false, gbpRetrievedAt: new Date().toISOString(), independent: true, city: 'Hackensack' };

function audit(over = {}) {
  return {
    auditedAt: new Date().toISOString(), accessFailures: [], retrieval: [], screenshots: { desktop_asis: 'a.png', mobile_asis: 'm.png' },
    desktop: { tel: [{ href: 'tel:2012854793', text: '(201) 285-4793', compare: 'match', problem: null, e164: '+12012854793' }], forms: [{ isSearch: false, fieldCount: 4 }], iframes: [], vendors: [], brokenImages: [], bodyText: 'Hackensack since 1990', captchaErrors: [] },
    mobile: { tel: [{ href: 'tel:2012854793', text: '(201) 285-4793', compare: 'match', problem: null, e164: '+12012854793' }], telAboveFold: true, ctaAboveFold: ['Call'], viewportMeta: 'width=device-width', horizontalOverflow: false, maxBlockingCover: 0, overlays: [], brokenImages: [], timing: { load: 2000 } },
    pages: { contact: { url: 'https://x.example/contact', status: 200, forms: [], iframes: [], vendors: [] } },
    linkCheck: { checked: 10, broken: [] }, https: { httpStatus: 200, redirectsToHttps: true },
    signals: { financing: true, testimonials: true, serviceArea: true, sinceYear: 1990, services: { ac_install: true, furnace: true }, emails: ['a@x.example'], hiring: true, maintenancePlan: false },
    ...over,
  };
}

test('blocked site: criteria are unassessed, not zero, and no provisional score', () => {
  const a = { auditedAt: new Date().toISOString(), accessFailures: [{ step: 'desktop_home', access: 'challenge', status: 403, url: 'https://x.example/' }], retrieval: [], screenshots: {}, desktop: null, mobile: null, pages: {}, signals: {} };
  const f = buildFindings(baseCo, a);
  assert.ok(f.every(x => x.kind !== 'defect'), 'access failure must not produce defects');
  const o = opportunityScore(baseCo, a, f);
  assert.equal(o.subcriteria.fixable.assessed, false);
  assert.equal(o.subcriteria.conv_mobile.assessed, false);
  assert.ok(o.unassessed >= 60);
  assert.equal(o.provisional, null);
  const c = evidenceConfidence(baseCo, a, f);
  const p = assignPriority(baseCo, o, c, f);
  assert.equal(p.tier, 'C');
});

test('verified malformed tel link reproduced on desktop+mobile drives fixable points and high confidence', () => {
  const bad = { href: 'tel:tel:+12012854793', text: '(201) 285-4793', compare: 'match', problem: 'duplicated_scheme', e164: '+12012854793', visible: true };
  const a = audit();
  a.desktop.tel = [bad]; a.mobile.tel = [bad];
  const f = buildFindings(baseCo, a);
  const t = f.find(x => x.code === 'A-TEL-MALFORMED');
  assert.ok(t && t.reproduced && t.status === 'Verified');
  const o = opportunityScore(baseCo, a, f);
  assert.equal(o.subcriteria.fixable.points, 24);
  const c = evidenceConfidence(baseCo, a, f);
  assert.ok(c.total >= 75, `confidence ${c.total}`);
});

test('clean site with no defects stays low opportunity regardless of reputation', () => {
  const a = audit();
  const f = buildFindings(baseCo, a);
  const o = opportunityScore(baseCo, a, f);
  const c = evidenceConfidence(baseCo, a, f);
  const p = assignPriority(baseCo, o, c, f);
  assert.equal(o.subcriteria.fixable.points, 0);
  assert.notEqual(p.tier, 'A');
});

test('high opportunity with low confidence is never promoted above C', () => {
  const o = { provisional: 90, coverage: 0.9, byCriterion: { economic: { points: 20, assessedMax: 25 } }, subcriteria: { access_channels: { points: 3 }, econ_tenure: { assessed: true, points: 5 }, econ_scale: { points: 2 } } };
  const c = { total: 50 };
  const f = [{ criterion: 'fixable', kind: 'defect', status: 'Verified', severity: 'high', code: 'A-X' }];
  assert.equal(assignPriority(baseCo, o, c, f).tier, 'C');
});

test('priority A requires all gates', () => {
  const o = { provisional: 80, coverage: 0.9, byCriterion: { economic: { points: 20, assessedMax: 25 } }, subcriteria: { access_channels: { points: 3 }, econ_tenure: { assessed: true, points: 5 }, econ_scale: { points: 2 } } };
  const c = { total: 80 };
  const f = [{ criterion: 'fixable', kind: 'defect', status: 'Verified', severity: 'high', code: 'A-X' }];
  assert.equal(assignPriority(baseCo, o, c, f).tier, 'A');
  assert.equal(assignPriority(baseCo, o, c, []).tier, 'B', 'no verified defect -> B');
  assert.equal(assignPriority({ ...baseCo, gbpPhone: null }, o, c, f).tier, 'B', 'no route -> B');
  assert.equal(assignPriority(baseCo, { ...o, coverage: 0.75 }, c, f).tier, 'B', 'coverage gate');
  assert.equal(assignPriority({ ...baseCo, excluded: true, excludeReason: 'franchise' }, o, c, f).tier, 'D');
  assert.equal(assignPriority({ ...baseCo, conflicts: ['IDENTITY: listing NJ, site NYC'] }, o, c, f).tier, 'B', 'identity conflict blocks A');
});

test('suggestive findings earn half fixable points and lower confidence', () => {
  const a = audit();
  const co = { ...baseCo, gbpPhone: '+1 201-999-0000', gbpE164: '+12019990000' };
  const f = buildFindings(co, a);
  assert.ok(f.some(x => x.code === 'B-PHONE-INCONSISTENT' && x.status === 'Suggestive'));
  const o = opportunityScore(co, a, f);
  assert.equal(o.subcriteria.fixable.points, 5);
  const c1 = evidenceConfidence(baseCo, a, buildFindings(baseCo, a));
  const c2 = evidenceConfidence(co, a, f);
  assert.ok(c2.total < c1.total);
});

test('opportunity arithmetic: confirmed + unassessed = maxPossible; coverage matches assessed weight', () => {
  const a = audit();
  const co = { ...baseCo, gbpReviews: null, gbpRating: null };
  const f = buildFindings(co, a);
  const o = opportunityScore(co, a, f);
  assert.equal(Math.round((o.confirmed + o.unassessed) * 10) / 10, o.maxPossible);
  assert.equal(o.assessedWeight + o.unassessed, 100);
  assert.equal(o.subcriteria.econ_reviews.assessed, false);
});

import { parseAddress, countyForCity } from '../scripts/lib/geo.mjs';
test('parseAddress and county lookup', () => {
  assert.deepEqual(parseAddress('241 Main St Ste 407, Hackensack, NJ 07601'), { street: '241 Main St Ste 407', city: 'Hackensack', state: 'NJ', zip: '07601' });
  assert.equal(parseAddress('Hackensack, NJ').city, 'Hackensack');
  assert.equal(parseAddress(null).city, null);
  assert.equal(countyForCity('Jersey City'), 'Hudson');
  assert.equal(countyForCity('fair lawn'), 'Bergen');
  assert.equal(countyForCity('Morristown'), null);
  assert.equal(countyForCity('Weehawken Township'), 'Hudson');
  assert.equal(countyForCity('Township of Wayne'), 'Passaic');
  assert.equal(countyForCity('Union City'), 'Hudson');
});

test('limited Google view: claim prompt unassessed; no capacity signals -> D', () => {
  const a = audit();
  a.signals = { ...a.signals, sinceYear: undefined, hiring: false, maintenancePlan: false, teamClaim: undefined, services: { ac_install: true } };
  const co = { ...baseCo, gbpReviews: null, gbpLimitedView: true };
  const f = buildFindings(co, a);
  const o = opportunityScore(co, a, f);
  assert.equal(o.subcriteria.rep_gbp_claim.assessed, false);
  const p = assignPriority(co, o, evidenceConfidence(co, a, f), f);
  assert.equal(p.tier, 'D');
  assert.match(p.reason, /operating capacity/);
});

import { siteAddress } from '../scripts/lib/geo.mjs';
test('siteAddress: schema first, then visible text, NJ only', () => {
  assert.equal(siteAddress({ desktop: { jsonLd: [{ '@graph': [{ address: { streetAddress: '1 Main St', addressLocality: 'Kearny', addressRegion: 'NJ', postalCode: '07032' } }] }], bodyText: '' } }).city, 'Kearny');
  assert.equal(siteAddress({ desktop: { jsonLd: [{ address: { addressLocality: 'Yonkers', addressRegion: 'NY' } }], bodyText: '' } }), null);
  assert.equal(siteAddress({ desktop: { jsonLd: [], bodyText: 'Visit us at 55 Broadway, Bayonne, NJ 07002 today' } }).city, 'Bayonne');
  assert.equal(siteAddress({ desktop: { jsonLd: [], bodyText: 'Serving all of Hudson County' } }), null);
});

test('hidden malformed/mismatched tel links are low severity', () => {
  const a = audit();
  const hidden = { href: 'tel:5513688228', text: '(551) 288-6494', compare: 'mismatch', problem: null, e164: '+15513688228', visible: false };
  a.desktop.tel = [...a.desktop.tel, hidden]; a.mobile.tel = [...a.mobile.tel, hidden];
  const f = buildFindings(baseCo, a).find(x => x.code === 'A-TEL-MISMATCH');
  assert.equal(f.severity, 'low');
  assert.equal(f.conversionPath, false);
});

import { ownerCandidates } from '../scripts/lib/owners.mjs';
test('ownerCandidates ignores form options and finds stated owners', () => {
  assert.deepEqual(ownerCandidates('I am a… Homeowner Business owner Renter Landlord Other'), []);
  assert.equal(ownerCandidates('Founded by Mike Rossi in 1998, we serve Bergen County.')[0].name, 'Mike Rossi');
  assert.equal(ownerCandidates('Meet Dana Kowalski, Owner of the company.')[0].name, 'Dana Kowalski');
  assert.equal(ownerCandidates('Owner: Sam Patel').length, 1);
});

test('verified site-down: fixable and conversion assessed; unverified stays unassessed', () => {
  const a = { auditedAt: new Date().toISOString(), accessFailures: [{ step: 'desktop_home', access: 'http_error', status: 500, url: 'https://x.example/' }, { step: 'mobile_home', access: 'http_error', status: 500, url: 'https://x.example/' }],
    retrieval: [{ step: 'desktop_home', access: 'http_error', status: 500 }], screenshots: {}, desktop: null, mobile: null, pages: {}, signals: {}, firecrawl: [{ statusCode: 500 }] };
  const f = buildFindings(baseCo, a);
  const down = f.find(x => x.code === 'A-LISTING-WEBSITE-ERROR');
  assert.equal(down.status, 'Verified'); assert.equal(down.reproduced, true);
  const o = opportunityScore(baseCo, a, f);
  assert.equal(o.subcriteria.fixable.assessed, true); assert.equal(o.subcriteria.fixable.points, 24);
  assert.equal(o.subcriteria.conv_desktop.points, 12); assert.equal(o.subcriteria.conv_mobile.points, 8);
  assert.equal(o.subcriteria.automation.assessed, false);
  // Firecrawl got a 200: the error is not reproduced -> Suggestive, not site-down
  const a2 = { ...a, firecrawl: [{ statusCode: 200 }] };
  const f2 = buildFindings(baseCo, a2);
  assert.equal(f2.find(x => x.code === 'A-LISTING-WEBSITE-ERROR').status, 'Suggestive');
  assert.equal(opportunityScore(baseCo, a2, f2).subcriteria.conv_desktop.assessed, false);
});

test('tel mismatch that dials the listing number is medium; unknown number is high', () => {
  const a = audit();
  const t = { href: 'tel:2012854793', text: '(201) 999-0000', compare: 'mismatch', problem: null, e164: '+12012854793', visible: true };
  a.desktop.tel = [t]; a.mobile.tel = [t];
  assert.equal(buildFindings(baseCo, a).find(x => x.code === 'A-TEL-MISMATCH').severity, 'medium');
  const u = { ...t, href: 'tel:2016522424', e164: '+12016522424' };
  a.desktop.tel = [u]; a.mobile.tel = [u];
  assert.equal(buildFindings(baseCo, a).find(x => x.code === 'A-TEL-MISMATCH').severity, 'high');
});

test('broken link severity: CTA high, service/nav medium, other low', () => {
  const a = audit();
  a.linkCheck.broken = [
    { url: 'https://x.example/request-service', reproduced: true, browserStatus: 404, linkedFrom: [{ text: 'Request Service', onPage: 'home' }] },
    { url: 'https://x.example/ac-repair', reproduced: true, browserStatus: 404, linkedFrom: [{ text: 'AC Repair', onPage: 'home' }] },
    { url: 'https://x.example/testimonials/jane', reproduced: true, browserStatus: 404, linkedFrom: [{ text: 'Jane D.', onPage: 'home' }] },
    { url: 'https://x.example/blog/x', reproduced: false, browserStatus: 200, linkedFrom: [] },
    { url: 'https://bloomfieldcooling.example/testimonials/tara/', reproduced: true, browserStatus: 404, linkedFrom: [{ text: '- Tara D.', onPage: 'home' }] },
  ];
  const sev = buildFindings(baseCo, a).filter(x => x.code === 'A-BROKEN-LINK').map(x => x.severity);
  assert.deepEqual(sev, ['high', 'medium', 'low', 'low']);
});

test('many low-severity defects are capped; gateway 502 contradicted by Firecrawl is not a finding', () => {
  const a = audit();
  a.linkCheck.broken = Array.from({ length: 10 }, (_, i) => ({ url: `https://x.example/testimonials/p${i}`, reproduced: true, browserStatus: 404, linkedFrom: [{ text: `Person ${i}`, onPage: 'home' }] }));
  const f = buildFindings(baseCo, a);
  assert.equal(f.filter(x => x.code === 'A-BROKEN-LINK').length, 10);
  assert.equal(opportunityScore(baseCo, a, f).subcriteria.fixable.points, 6);
  const b = { auditedAt: new Date().toISOString(), accessFailures: [{ step: 'desktop_home', access: 'http_error', status: 502, url: 'https://x.example/' }],
    retrieval: [{ step: 'desktop_home', access: 'http_error', status: 502 }], screenshots: {}, desktop: null, mobile: null, pages: {}, signals: {}, firecrawl: [{ statusCode: 200 }] };
  assert.equal(buildFindings(baseCo, b).filter(x => x.code === 'A-LISTING-WEBSITE-ERROR').length, 0);
});
