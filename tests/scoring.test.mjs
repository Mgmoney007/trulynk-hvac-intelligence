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
  const bad = { href: 'tel:tel:+12012854793', text: '(201) 285-4793', compare: 'match', problem: 'duplicated_scheme', e164: '+12012854793' };
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
  const o = { provisional: 90, coverage: 0.9, byCriterion: { economic: { points: 20 } }, subcriteria: { access_channels: { points: 3 }, econ_tenure: { assessed: true, points: 5 } } };
  const c = { total: 50 };
  const f = [{ criterion: 'fixable', kind: 'defect', status: 'Verified', severity: 'high', code: 'A-X' }];
  assert.equal(assignPriority(baseCo, o, c, f).tier, 'C');
});

test('priority A requires all gates', () => {
  const o = { provisional: 80, coverage: 0.9, byCriterion: { economic: { points: 20 } }, subcriteria: { access_channels: { points: 3 }, econ_tenure: { assessed: true, points: 5 } } };
  const c = { total: 80 };
  const f = [{ criterion: 'fixable', kind: 'defect', status: 'Verified', severity: 'high', code: 'A-X' }];
  assert.equal(assignPriority(baseCo, o, c, f).tier, 'A');
  assert.equal(assignPriority(baseCo, o, c, []).tier, 'B', 'no verified defect -> B');
  assert.equal(assignPriority({ ...baseCo, gbpPhone: null }, o, c, f).tier, 'B', 'no route -> B');
  assert.equal(assignPriority(baseCo, { ...o, coverage: 0.7 }, c, f).tier, 'B', 'coverage gate');
  assert.equal(assignPriority({ ...baseCo, excluded: true, excludeReason: 'franchise' }, o, c, f).tier, 'D');
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
});
