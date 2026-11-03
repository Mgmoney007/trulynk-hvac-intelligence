// Opportunity Score and Evidence Confidence. Deterministic, independent, and transparent:
// every sub-criterion reports { max, points, assessed, basis }. Unassessed criteria are never scored as zero.

export const OPP_WEIGHTS = { fixable: 30, economic: 25, conversion: 20, automation: 10, accessibility: 10, reputation: 5 };
const SEV_RANK = { high: 3, medium: 2, low: 1, none: 0 };

function sub(max, points, assessed, basis) {
  return { max, points: assessed ? Math.min(max, Math.round(points * 10) / 10) : 0, assessed, basis };
}

export function opportunityScore(co, audit, findings) {
  const desktopOk = !!audit?.desktop;
  const mobileOk = !!audit?.mobile;
  const fcOk = (audit?.firecrawl || []).some(x => x.statusCode && x.statusCode < 400);
  const S = {};

  // A. Fixable customer-facing problems (30)
  {
    const defects = findings.filter(f => f.criterion === 'fixable' && f.kind === 'defect')
      .sort((a, b) => (SEV_RANK[b.severity] - SEV_RANK[a.severity]) || (Number(b.conversionPath) - Number(a.conversionPath)));
    let pts = 0, firstHighUsed = false;
    const basis = [];
    for (const f of defects) {
      const mult = f.status === 'Verified' ? 1 : 0.5;
      let p;
      if (f.severity === 'high') { p = !firstHighUsed ? 24 : 6; firstHighUsed = true; }
      else if (f.severity === 'medium') p = 10;
      else p = 3;
      pts += p * mult;
      basis.push(`${f.code}(${f.severity}${mult < 1 ? ',half:' + f.status : ''})=${p * mult}`);
    }
    if (desktopOk) S.fixable = sub(30, pts, true, basis.join('; ') || 'No fixable defects found on audited pages');
    else if (fcOk) { S.fixable = sub(15, pts, true, (basis.join('; ') || 'none found') + ' [Firecrawl-only partial audit]'); S.fixable_unassessed = sub(15, 0, false, 'Browser audit blocked'); }
    else S.fixable = sub(30, 0, false, 'Site could not be audited');
  }

  // B. Economic value / existing demand (25)
  {
    const r = co.gbpReviews;
    const rv = r == null ? null : r >= 300 ? 10 : r >= 150 ? 8 : r >= 75 ? 6 : r >= 30 ? 4 : r >= 10 ? 2 : 0;
    S.econ_reviews = sub(10, rv ?? 0, rv != null, r == null ? 'Google review count not retrieved' : `${r} Google reviews`);
    const s = audit?.signals || {};
    const yrs = s.sinceYear ? new Date().getFullYear() - s.sinceYear : s.yearsClaim || null;
    const yv = yrs == null ? null : yrs >= 20 ? 5 : yrs >= 10 ? 4 : yrs >= 5 ? 2 : 1;
    S.econ_tenure = sub(5, yv ?? 0, yv != null, yrs == null ? 'No founding year or tenure claim found' : `${s.sinceYear ? 'Since ' + s.sinceYear : yrs + '+ years claimed'} (site claim)`);
    const sv = s.services || {};
    const install = sv.ac_install || sv.furnace || sv.boiler || sv.heat_pump || sv.ductless;
    S.econ_services = sub(5, install ? 5 : sv.ac_repair ? 2 : 0, desktopOk, desktopOk ? (install ? 'Installation/replacement services listed' : 'Repair only / not stated') : 'Site not audited');
    let sc = 0; const sb = [];
    if (s.hiring) { sc += 2; sb.push('hiring/careers'); }
    if (s.teamClaim >= 3) { sc += 2; sb.push(`team claim ${s.teamClaim}`); }
    if (s.maintenancePlan) { sc += 1; sb.push('maintenance plan'); }
    if (sv.plumbing && (sv.furnace || sv.ac_repair)) { sc += 1; sb.push('multi-trade'); }
    S.econ_scale = sub(5, sc, desktopOk, desktopOk ? (sb.join(', ') || 'No scale signals on crawled pages') : 'Site not audited');
  }

  // C. Conversion and lead-capture friction (20). Split desktop/mobile so a blocked mobile view is unassessed, not zero.
  {
    const conv = findings.filter(f => f.criterion === 'conversion' || (f.criterion === 'fixable' && f.conversionPath && f.severity === 'high' && f.status === 'Verified'));
    const pts = { 'F-NO-TEL-LINKS': 6, 'F-NO-FORM-OR-BOOKING': 6, 'F-NO-MOBILE-CALL-ABOVE-FOLD': 4, 'F-NO-MOBILE-CTA': 3, 'F-BLOCKING-OVERLAY': 4, 'F-SLOW-MOBILE-LOAD': 2 };
    const mobileCodes = new Set(['F-NO-MOBILE-CALL-ABOVE-FOLD', 'F-NO-MOBILE-CTA', 'F-BLOCKING-OVERLAY', 'F-SLOW-MOBILE-LOAD']);
    let dp = 0, mp = 0; const basis = []; let defectBonusUsed = false;
    for (const f of conv) {
      let p = 0;
      if (f.criterion === 'fixable') { if (defectBonusUsed) continue; p = 10; defectBonusUsed = true; }
      else if (f.code === 'F-TRUST-CONTENT-GAPS') p = Math.min(3, f.gapCount || 1);
      else p = pts[f.code] || 0;
      if (mobileCodes.has(f.code)) mp += p; else dp += p;
      basis.push(`${f.code}=${p}`);
    }
    S.conv_desktop = sub(12, dp, desktopOk, desktopOk ? basis.filter(b => !/MOBILE|OVERLAY/.test(b)).join('; ') || 'No desktop friction found' : 'Desktop not audited');
    S.conv_mobile = sub(8, mp, mobileOk, mobileOk ? basis.filter(b => /MOBILE|OVERLAY/.test(b)).join('; ') || 'No mobile friction found' : 'Mobile view blocked/not audited');
  }

  // D. Operational automation potential (10) — signals only; all Requires Client Verification.
  {
    const pts = { 'O-NO-ONLINE-SCHEDULING': 3, 'O-NO-TEXT-OR-CHAT': 2, 'O-FORM-LEAD-ROUTING': 2, 'O-MAINTENANCE-PLAN-AUTOMATION': 2, 'O-NO-REVIEW-REQUEST-TOOL': 1 };
    const o = findings.filter(f => f.criterion === 'automation');
    S.automation = sub(10, o.reduce((a, f) => a + (pts[f.code] || 0), 0), desktopOk, desktopOk ? o.map(f => `${f.code}=${pts[f.code]}`).join('; ') || 'Tools already present' : 'Site not audited');
  }

  // E. Buyer accessibility / implementation feasibility (10)
  {
    const owner = co.decisionMaker?.name;
    S.access_owner = sub(4, owner ? 4 : 0, !!owner, owner ? `${owner} (${co.decisionMaker.title}), source: ${co.decisionMaker.sourceUrl}` : 'No named owner found on official site; LinkedIn not checked');
    S.access_independent = sub(3, co.independent ? 3 : 0, true, co.independent ? 'Independent local operator, no franchise indicators' : 'Not confirmed independent');
    const email = (audit?.signals?.emails || []).length > 0;
    S.access_channels = sub(3, (co.gbpPhone ? 1 : 0) + (email ? 2 : 0), desktopOk || !!co.gbpPhone, `${co.gbpPhone ? 'phone' : 'no phone'}${email ? ' + published email' : ', no email published on contact/home/about'}`);
  }

  // F. Reputation / search visibility weaknesses (5). Organic ranking was NOT measured and is excluded rather than guessed.
  {
    const r = co.gbpRating, n = co.gbpReviews;
    S.rep_rating = sub(2, r != null && n >= 10 && r < 4.5 ? 2 : r != null && n >= 10 && r < 4.7 ? 1 : 0, r != null && n != null, r != null ? `${r} stars / ${n} reviews` : 'Rating not retrieved');
    S.rep_volume = sub(1, n != null && n < 50 ? 1 : 0, n != null, n != null ? `${n} reviews` : 'Review count not retrieved');
    S.rep_gbp_claim = sub(2, co.gbpClaimPrompt ? 2 : 0, co.gbpPlaceRetrieved === true, co.gbpPlaceRetrieved ? (co.gbpClaimPrompt ? '"Claim this business" prompt shown on public listing' : 'Listing appears claimed') : 'Listing page not retrieved');
  }

  const parts = Object.values(S);
  const confirmed = Math.round(parts.reduce((a, p) => a + p.points, 0) * 10) / 10;
  const assessedWeight = parts.filter(p => p.assessed).reduce((a, p) => a + p.max, 0);
  const unassessed = parts.filter(p => !p.assessed).reduce((a, p) => a + p.max, 0);
  const coverage = Math.round((assessedWeight / 100) * 100) / 100;
  const provisional = coverage >= 0.6 ? Math.round((confirmed / assessedWeight) * 100) : null;
  const byCriterion = {
    fixable: sumKeys(S, ['fixable', 'fixable_unassessed']), economic: sumKeys(S, ['econ_reviews', 'econ_tenure', 'econ_services', 'econ_scale']),
    conversion: sumKeys(S, ['conv_desktop', 'conv_mobile']), automation: sumKeys(S, ['automation']),
    accessibility: sumKeys(S, ['access_owner', 'access_independent', 'access_channels']), reputation: sumKeys(S, ['rep_rating', 'rep_volume', 'rep_gbp_claim']),
  };
  return { subcriteria: S, byCriterion, confirmed, unassessed, maxPossible: Math.round((confirmed + unassessed) * 10) / 10, assessedWeight, coverage, provisional };
}

function sumKeys(S, keys) {
  const p = keys.map(k => S[k]).filter(Boolean);
  return { points: Math.round(p.reduce((a, x) => a + x.points, 0) * 10) / 10, assessedMax: p.filter(x => x.assessed).reduce((a, x) => a + x.max, 0), unassessed: p.filter(x => !x.assessed).reduce((a, x) => a + x.max, 0) };
}

// ---------------- Evidence Confidence ----------------
const FIND_W = { high: 3, medium: 2, low: 1 };

export function evidenceConfidence(co, audit, findings, { asOf = new Date() } = {}) {
  const material = findings.filter(f => (f.kind === 'defect' || (f.kind === 'friction' && f.severity !== 'low')));
  const C = {};
  const completeness = (audit?.desktop ? 3 : 0) + (audit?.mobile ? 3 : 0) + (audit?.pages?.contact?.status && audit.pages.contact.status < 400 ? 1.5 : 0) + (audit?.linkCheck ? 1.5 : 0);

  // 1. Directly reproduced and documented (35)
  if (material.length) {
    let num = 0, den = 0;
    for (const f of material) {
      const w = FIND_W[f.severity] || 1;
      const q = f.status === 'Verified' ? (f.reproduced && f.evidencePath ? 1 : f.evidencePath ? 0.8 : 0.6) : f.status === 'Suggestive' ? 0.35 : 0.1;
      num += w * q; den += w;
    }
    C.reproduced = { max: 35, points: round1(35 * num / den), basis: `${material.length} material findings; weighted documentation ratio ${(num / den).toFixed(2)}` };
  } else {
    C.reproduced = { max: 35, points: round1(35 * completeness / 9), basis: 'No material findings; confidence reflects completeness of the screening that found none' };
  }
  // 2. Source quality (20)
  let sq = 0; const sqb = [];
  if (audit?.desktop) { sq += 10; sqb.push('official site, desktop browser'); }
  if (audit?.mobile) { sq += 4; sqb.push('official site, mobile browser'); }
  if (co.gbpPlaceRetrieved) { sq += 4; sqb.push('Google listing page'); }
  if ((audit?.firecrawl || []).some(x => x.statusCode < 400)) { sq += 2; sqb.push('Firecrawl second retrieval'); }
  if (co.bbb?.matched) { sq += 2; sqb.push(`BBB record (${co.bbb.basis} match)`); }
  C.sourceQuality = { max: 20, points: Math.min(20, sq), basis: sqb.join('; ') || 'No primary sources retrieved' };
  // 3. Recency (15)
  const dates = [audit?.auditedAt, co.gbpRetrievedAt].filter(Boolean).map(d => new Date(d));
  const oldest = dates.length ? Math.min(...dates.map(d => d.getTime())) : null;
  const ageDays = oldest == null ? null : (asOf.getTime() - oldest) / 86400000;
  C.recency = { max: 15, points: ageDays == null ? 0 : ageDays <= 7 ? 15 : ageDays <= 30 ? 12 : ageDays <= 90 ? 8 : 4, basis: ageDays == null ? 'No dated evidence' : `Oldest evidence ${ageDays.toFixed(1)} days old` };
  // 4. Independent corroboration (15)
  let cr = 0; const crb = [];
  const sitePhones = new Set([...(audit?.desktop?.tel || []), ...(audit?.mobile?.tel || [])].map(t => t.e164).filter(Boolean));
  if (co.gbpE164 && sitePhones.has(co.gbpE164)) { cr += 5; crb.push('site phone matches Google listing'); }
  const siteText = (audit?.desktop?.bodyText || '') + Object.values(audit?.pages || {}).map(p => p.bodyText || '').join(' ');
  if (co.city && new RegExp(`\\b${co.city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(siteText)) { cr += 5; crb.push(`listing city (${co.city}) appears on site`); }
  const top = material.filter(f => f.kind === 'defect').sort((a, b) => FIND_W[b.severity] - FIND_W[a.severity])[0];
  if (top) { if (top.reproduced) { cr += 5; crb.push(`top defect reproduced (${top.methods.join('+')})`); } }
  else if (audit?.desktop && audit?.mobile) { cr += 5; crb.push('desktop and mobile screening agree (no defects)'); }
  if (co.bbb?.matched) { cr += 5; crb.push(`BBB record matches by ${co.bbb.basis}`); }
  C.corroboration = { max: 15, points: Math.min(15, cr), basis: crb.join('; ') || 'No corroboration' };
  // 5. Completeness and consistency (15)
  const conflicts = findings.filter(f => f.code === 'B-PHONE-INCONSISTENT').length + (co.conflicts || []).length;
  C.completeness = { max: 15, points: round1(completeness + Math.max(0, 6 - 3 * conflicts)), basis: `coverage ${completeness}/9; unresolved conflicts ${conflicts}` };

  const total = Math.round(Object.values(C).reduce((a, c) => a + c.points, 0));
  const band = total >= 90 ? 'Very High' : total >= 75 ? 'High' : total >= 60 ? 'Moderate' : total >= 40 ? 'Low' : 'Very Low';
  return { components: C, total, band };
}
const round1 = x => Math.round(x * 10) / 10;

// ---------------- Priority ----------------
export function assignPriority(co, opp, conf, findings) {
  if (co.excluded) return { tier: 'D', reason: `Excluded: ${co.excludeReason}` };
  const verifiedFixable = findings.filter(f => f.criterion === 'fixable' && f.kind === 'defect' && f.status === 'Verified' && SEV_RANK[f.severity] >= 2);
  const econ = opp.byCriterion.economic.points;
  const route = !!co.gbpPhone && (!!co.decisionMaker?.name || opp.subcriteria.access_channels.points >= 3);
  const score = opp.provisional;
  const capacityConcern = co.gbpReviews != null && co.gbpReviews < 10 && !(opp.subcriteria.econ_tenure.assessed && opp.subcriteria.econ_tenure.points >= 4);
  if (score == null) return { tier: 'C', reason: `Evidence coverage ${Math.round(opp.coverage * 100)}% is too low for a provisional score` };
  if (capacityConcern) return { tier: 'D', reason: `Insufficient evidence of operating capacity (${co.gbpReviews} reviews, no tenure evidence)` };
  if (score >= 75 && opp.coverage >= 0.85 && conf.total >= 75 && verifiedFixable.length && econ >= 12 && route)
    return { tier: 'A', reason: `Opp ${score}, confidence ${conf.total}, verified fixable: ${verifiedFixable[0].code}` };
  if (score >= 55 && conf.total >= 60) {
    const missing = [];
    if (score < 75) missing.push(`opportunity ${score} < 75`);
    if (conf.total < 75) missing.push(`confidence ${conf.total} < 75`);
    if (!verifiedFixable.length) missing.push('no verified medium/high fixable defect');
    if (econ < 12) missing.push(`economic evidence ${econ} < 12`);
    if (!route) missing.push('no clear route to decision-maker');
    if (opp.coverage < 0.85) missing.push(`coverage ${Math.round(opp.coverage * 100)}% < 85%`);
    return { tier: 'B', reason: `Not A because: ${missing.join('; ')}` };
  }
  if (score >= 55) return { tier: 'C', reason: `Opportunity ${score} but confidence ${conf.total} < 60` };
  return { tier: 'D', reason: `Opportunity ${score} < 55: limited fixable opportunity found` };
}
