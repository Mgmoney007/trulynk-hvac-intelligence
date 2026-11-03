// Deterministic findings from audit + Google listing data. No inference beyond the stated rules.
// kind: defect | friction | opportunity | info
// trulynkCategory: A (verified, directly fixable) | B (potentially fixable, needs verification) | C (outside TruLynk control)
// status: Verified | Suggestive | Requires Client Verification
import { normalizePhone, classifyPhones } from './phone.mjs';

const FORM_IFRAME_RX = /jotform|typeform|docs\.google\.com\/forms|forms\.gle|servicetitan|scheduleengine|housecallpro|workiz|getjobber|formstack|hsforms|hubspot|cognitoforms|wufoo|123formbuilder|podium|calendly|fieldedge|successware|wix(?:site)?\.com\/.*form/i;
const BOOKING_LINK_RX = /book|schedule|appointment|request|estimate|quote/i;

export function findingConfidence(f) {
  if (f.status === 'Verified') return f.reproduced && f.evidencePath ? 90 : f.evidencePath ? 75 : 60;
  if (f.status === 'Suggestive') return 45;
  return 25;
}

export function buildFindings(co, audit) {
  const F = [];
  const at = audit?.auditedAt || null;
  const add = f => {
    const full = { companyId: co.id, company: co.name, verifiedAt: at, unresolved: '', reproductionSteps: '', methods: [], reproduced: false, evidencePath: null, ...f };
    full.confidence = findingConfidence(full);
    full.findingId = `${co.id}--${full.code}${F.filter(x => x.code === full.code).length ? '-' + (F.filter(x => x.code === full.code).length + 1) : ''}`;
    F.push(full);
  };
  if (!audit) return F;
  const d = audit.desktop, m = audit.mobile;
  const shots = audit.screenshots || {};
  const home = co.website;

  // ---------- Access (never a defect by itself) ----------
  for (const a of audit.accessFailures || []) {
    add({ code: 'X-ACCESS-FAILURE', kind: 'info', trulynkCategory: null, criterion: null, severity: 'none', status: 'Verified',
      title: `Retrieval blocked or failed (${a.step}: ${a.access}${a.status ? ' ' + a.status : ''})`,
      description: 'Automated browser access failed. Recorded as an access limitation of this research, not as a website defect.',
      sourceUrl: a.url, evidencePath: shots[a.step.startsWith('mobile') ? 'mobile_failure' : 'desktop_failure'] || null, methods: ['playwright'], unresolved: 'Whether real visitors see the same block is unknown.' });
  }
  const homeErr = (audit.retrieval || []).find(r => r.step === 'desktop_home' && r.access === 'http_error' && (r.status === 404 || r.status === 410 || r.status >= 500));
  if (homeErr) {
    const fcOk = (audit.firecrawl || []).some(x => x.statusCode && x.statusCode < 400);
    add({ code: 'A-LISTING-WEBSITE-ERROR', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'high', conversionPath: true,
      status: fcOk ? 'Suggestive' : 'Verified', reproduced: !fcOk && (audit.firecrawl || []).length > 0,
      title: `Website link on the Google listing returns HTTP ${homeErr.status}`,
      description: `The website URL published on the Google Business Profile (${home}) returned HTTP ${homeErr.status} in a desktop browser.`,
      sourceUrl: home, evidencePath: shots.desktop_failure || null, methods: ['playwright', ...((audit.firecrawl || []).length ? ['firecrawl'] : [])],
      reproductionSteps: `Open ${home} in a browser.`, unresolved: fcOk ? 'Firecrawl retrieved the page successfully; the error may be intermittent.' : '' });
  }
  if (!d) return F;

  // ---------- Broken links (reproduced in browser) ----------
  for (const b of audit.linkCheck?.broken || []) {
    if (!b.reproduced) continue;
    const inNav = b.linkedFrom.some(s => s.inNav);
    const ctaish = b.linkedFrom.some(s => BOOKING_LINK_RX.test(s.text || '')) || /contact|book|schedule|estimate|quote|request|service/i.test(b.url);
    const sev = ctaish || b.external ? 'high' : inNav ? 'medium' : 'low';
    add({ code: 'A-BROKEN-LINK', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: sev, conversionPath: ctaish,
      status: 'Verified', reproduced: true, methods: ['node_fetch', 'playwright'],
      title: `Broken ${b.external ? 'external booking' : inNav ? 'navigation' : 'internal'} link: ${b.url.replace(/^https?:\/\/(www\.)?/, '')} (HTTP ${b.browserStatus})`,
      description: `Link${b.linkedFrom[0]?.text ? ` "${b.linkedFrom[0].text}"` : ''} on ${b.linkedFrom.map(s => s.onPage).filter(Boolean).join(', ') || 'site'} leads to HTTP ${b.browserStatus}.`,
      sourceUrl: b.url, evidencePath: b.screenshot, reproductionSteps: `Open ${home}, follow the link to ${b.url}; page returns ${b.browserStatus}.` });
  }
  for (const k of ['booking', 'contact']) {
    const p = audit.pages?.[k];
    if (p && p.access === 'http_error' && (p.status === 404 || p.status === 410 || p.status >= 500) && !(audit.linkCheck?.broken || []).some(b => b.url === p.url && b.reproduced)) {
      add({ code: 'A-CTA-PAGE-ERROR', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'high', conversionPath: true, status: 'Verified', reproduced: false,
        title: `${k === 'booking' ? 'Booking/estimate' : 'Contact'} page returns HTTP ${p.status}`, description: `The ${k} link target ${p.url} returned HTTP ${p.status}.`,
        sourceUrl: p.url, evidencePath: shots[`desktop_${k}_error`] || null, methods: ['playwright'], reproductionSteps: `Open ${p.url}.` });
    }
  }

  // ---------- Phone links ----------
  const telAll = [...(d.tel || []).map(t => ({ ...t, where: 'desktop' })), ...((m?.tel) || []).map(t => ({ ...t, where: 'mobile' }))];
  const fcTel = (audit.firecrawl || []).flatMap(x => x.tel || []);
  const malformed = [...new Map(telAll.filter(t => t.problem).map(t => [t.href, t])).values()];
  for (const t of malformed) {
    const where = new Set(telAll.filter(x => x.href === t.href).map(x => x.where));
    const inFc = fcTel.some(x => x.href === t.href);
    add({ code: 'A-TEL-MALFORMED', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'high', conversionPath: true, status: 'Verified',
      reproduced: where.size > 1 || inFc, methods: ['playwright', ...(inFc ? ['firecrawl'] : [])],
      title: `Malformed click-to-call link (${t.problem.replace(/_/g, ' ')}): ${t.href}`,
      description: `Tap-to-call link markup is "${t.href}" (shown as "${t.text}"). Seen on: ${[...where].join(', ')}${inFc ? ', Firecrawl' : ''}.`,
      sourceUrl: home, evidencePath: shots.mobile_asis || shots.desktop_asis, reproductionSteps: `View source of ${home} and search for "${t.href}".`,
      unresolved: 'Whether a given phone dialer tolerates this markup has not been tested on physical devices.' });
  }
  const mism = [...new Map(telAll.filter(t => t.compare === 'mismatch').map(t => [t.href + '|' + t.text, t])).values()];
  for (const t of mism) {
    const where = new Set(telAll.filter(x => x.href === t.href && x.text === t.text).map(x => x.where));
    add({ code: 'A-TEL-MISMATCH', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'high', conversionPath: true, status: 'Verified', reproduced: where.size > 1,
      methods: ['playwright'], title: `Click-to-call link dials a different number than displayed`,
      description: `Link text "${t.text}" but href "${t.href}".`, sourceUrl: home, evidencePath: shots.desktop_asis,
      reproductionSteps: `On ${home}, inspect the link labelled "${t.text}".`, unresolved: 'Could be intentional call tracking with stale display text; confirm with business.' });
  }

  // ---------- Form / CAPTCHA ----------
  const capErr = [d, ...Object.values(audit.pages || {})].flatMap(p => (p?.captchaErrors || []).map(c => ({ ...c, url: p.url || p.finalUrl })));
  if (capErr.length) {
    add({ code: 'A-CAPTCHA-ERROR', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'high', conversionPath: true, status: 'Verified', reproduced: false,
      title: 'CAPTCHA on lead form shows a site-owner configuration error', description: capErr[0].text, sourceUrl: capErr[0].url, evidencePath: shots.desktop_contact || shots.desktop_booking || null,
      methods: ['playwright'], reproductionSteps: `Open ${capErr[0].url} and look at the CAPTCHA widget.`, unresolved: 'Whether submissions still go through has not been tested (no forms were submitted).' });
  }

  // ---------- HTTPS ----------
  const h = audit.https || {};
  if (h.httpsError && h.httpStatus && h.httpStatus < 400) {
    add({ code: 'A-HTTPS-FAILS', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'medium', conversionPath: false, status: 'Verified', reproduced: false, methods: ['node_fetch'],
      title: 'Site does not load over HTTPS', description: `HTTPS request failed (${h.httpsError}); HTTP returned ${h.httpStatus}. Browsers mark HTTP pages "Not secure".`, sourceUrl: home, reproductionSteps: `Open https://${new URL(home).hostname}/` });
  } else if (h.httpStatus && h.httpStatus < 400 && h.redirectsToHttps === false && !h.httpsError) {
    add({ code: 'A-NO-HTTPS-REDIRECT', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'low', conversionPath: false, status: 'Verified', reproduced: false, methods: ['node_fetch'],
      title: 'HTTP version of site does not redirect to HTTPS', description: `http://${new URL(home).hostname}/ served content without redirecting (final URL ${h.httpFinal}).`, sourceUrl: `http://${new URL(home).hostname}/` });
  }

  // ---------- Mobile layout ----------
  if (m) {
    if (!m.viewportMeta) add({ code: 'A-NO-VIEWPORT', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'high', conversionPath: true, status: 'Verified', reproduced: false, methods: ['playwright_iphone13'],
      title: 'No mobile viewport configured (page renders as shrunken desktop layout on phones)', description: 'No <meta name="viewport"> tag found on the homepage.', sourceUrl: home, evidencePath: shots.mobile_asis });
    if (m.horizontalOverflow) add({ code: 'A-MOBILE-OVERFLOW', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'medium', conversionPath: false, status: 'Verified', reproduced: false, methods: ['playwright_iphone13'],
      title: `Mobile page wider than screen (${m.scrollWidth}px content in ${m.innerWidth}px viewport)`, description: 'Horizontal scrolling on phone homepage.', sourceUrl: home, evidencePath: shots.mobile_asis,
      reproductionSteps: `Open ${home} on an iPhone-sized viewport (390px) and scroll sideways.` });
  }
  if (audit.signals?.placeholder) add({ code: 'A-PLACEHOLDER-TEXT', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'medium', conversionPath: false, status: 'Verified', reproduced: false, methods: ['playwright'],
    title: `Template placeholder text published ("${audit.signals.placeholder}")`, description: 'Placeholder text visible on a public page.', sourceUrl: home, evidencePath: shots.desktop_full });
  const brokenImgs = [...new Set([...(d.brokenImages || []), ...((m?.brokenImages) || [])])];
  if (brokenImgs.length) add({ code: 'A-BROKEN-IMAGES', kind: 'defect', trulynkCategory: 'A', criterion: 'fixable', severity: 'low', conversionPath: false, status: 'Verified', reproduced: (d.brokenImages || []).length > 0 && (m?.brokenImages || []).length > 0,
    methods: ['playwright'], title: `${brokenImgs.length} visible image(s) failed to load on homepage`, description: brokenImgs.slice(0, 3).join(' '), sourceUrl: home, evidencePath: shots.desktop_full });

  // ---------- Customer-facing info consistency ----------
  const gbp = normalizePhone(co.gbpPhone);
  const sitePhones = [...new Set(telAll.map(t => t.e164).filter(Boolean))];
  if (gbp && sitePhones.length && !sitePhones.includes(gbp.e164)) {
    const vendors = (d.vendors || []).filter(v => v.kind === 'call_tracking').map(v => v.name);
    add({ code: 'B-PHONE-INCONSISTENT', kind: 'defect', trulynkCategory: vendors.length ? 'B' : 'A', criterion: 'fixable', severity: 'medium', conversionPath: false, status: 'Suggestive', reproduced: false, methods: ['google_maps', 'playwright'],
      title: 'Website phone links do not include the Google listing phone', description: `Google listing: ${gbp.display}. Website tel links: ${sitePhones.join(', ')}.${vendors.length ? ' Call-tracking script detected: ' + vendors.join(', ') : ''}`,
      sourceUrl: home, evidencePath: shots.desktop_asis, unresolved: 'May be deliberate (call tracking, separate lines). Confirm which number customers should use.' });
  }

  // ---------- Conversion friction (verified observations, directly fixable) ----------
  const pagesArr = [d, ...Object.values(audit.pages || {})];
  const realForms = pagesArr.flatMap(p => (p?.forms || []).filter(f => !f.isSearch && f.fieldCount >= 2));
  const formIframes = pagesArr.flatMap(p => (p?.iframes || []).filter(s => FORM_IFRAME_RX.test(s)));
  const bookingVendors = (d.vendors || []).concat(...Object.values(audit.pages || {}).map(p => p.vendors || [])).filter(v => ['field_service', 'scheduling'].includes(v.kind));
  const fridx = { home };
  if (!telAll.length && !fcTel.length) add({ code: 'F-NO-TEL-LINKS', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'high', conversionPath: true, status: 'Verified', reproduced: !!m, methods: ['playwright'],
    title: 'Phone number is not tap-to-call anywhere on the homepage', description: 'No tel: links found on desktop or mobile homepage.', sourceUrl: home, evidencePath: shots.mobile_asis || shots.desktop_asis });
  if (!realForms.length && !formIframes.length && !bookingVendors.length) add({ code: 'F-NO-FORM-OR-BOOKING', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'high', conversionPath: true, status: 'Verified', reproduced: false, methods: ['playwright'],
    title: 'No web form or online booking found on homepage, contact, or booking pages', description: `Pages checked: ${[home, ...Object.values(audit.pages || {}).map(p => p.url)].join(', ')}`, sourceUrl: audit.pages?.contact?.url || home,
    evidencePath: shots.desktop_contact || shots.desktop_full, unresolved: 'Forms on other pages were not checked.' });
  if (m) {
    if (!m.telAboveFold && (telAll.length || fcTel.length)) add({ code: 'F-NO-MOBILE-CALL-ABOVE-FOLD', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'medium', conversionPath: true, status: 'Verified', reproduced: false, methods: ['playwright_iphone13'],
      title: 'No tap-to-call button visible on first mobile screen', description: 'On a 390x664 iPhone 13 viewport, no tel: link is visible before scrolling.', sourceUrl: home, evidencePath: shots.mobile_clean || shots.mobile_asis });
    if (!m.telAboveFold && !(m.ctaAboveFold || []).length) add({ code: 'F-NO-MOBILE-CTA', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'medium', conversionPath: true, status: 'Verified', reproduced: false, methods: ['playwright_iphone13'],
      title: 'No call, booking, or contact action visible on first mobile screen', description: 'No call/book/schedule/estimate/contact link or button detected above the fold on iPhone 13 viewport.', sourceUrl: home, evidencePath: shots.mobile_clean || shots.mobile_asis });
    if (m.maxBlockingCover > 0.3) add({ code: 'F-BLOCKING-OVERLAY', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'medium', conversionPath: true, status: 'Verified', reproduced: false, methods: ['playwright_iphone13'],
      title: `Pop-up/banner covers ${Math.round(m.maxBlockingCover * 100)}% of the first mobile screen`, description: (m.overlays || []).filter(o => ['cookie', 'chat', 'popup'].includes(o.kind)).map(o => `${o.kind} ${Math.round(o.cover * 100)}%`).join(', '),
      sourceUrl: home, evidencePath: shots.mobile_asis });
    if (m.timing?.load > 8000) add({ code: 'F-SLOW-MOBILE-LOAD', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'low', conversionPath: false, status: 'Verified', reproduced: false, methods: ['playwright_iphone13'],
      title: `Mobile homepage load event at ${(m.timing.load / 1000).toFixed(1)}s (single lab measurement)`, description: 'Measured from a datacenter connection without network throttling; real phones on cellular are typically slower.', sourceUrl: home,
      unresolved: 'Single sample; confirm with field data (e.g., PageSpeed/CrUX).' });
  }
  const s = audit.signals || {};
  const gaps = [['financing', 'financing'], ['testimonials', 'reviews/testimonials'], ['serviceArea', 'service-area information']].filter(([k]) => !s[k]).map(([, l]) => l);
  if (gaps.length) add({ code: 'F-TRUST-CONTENT-GAPS', kind: 'friction', trulynkCategory: 'A', criterion: 'conversion', severity: 'low', conversionPath: false, status: 'Verified', reproduced: false, methods: ['playwright'],
    title: `Not found on homepage/contact/about: ${gaps.join(', ')}`, description: 'Text search of crawled pages only; other pages may contain this content.', sourceUrl: home, gapCount: gaps.length,
    unresolved: 'Only homepage, contact, about and booking pages were searched.' });

  // ---------- Operational opportunities (require client verification) ----------
  const allVendors = [...(d.vendors || []), ...Object.values(audit.pages || {}).flatMap(p => p.vendors || [])];
  const vk = k => allVendors.some(v => v.kind === k || (Array.isArray(k) && k.includes(v.kind)));
  if (!bookingVendors.length) add({ code: 'O-NO-ONLINE-SCHEDULING', kind: 'opportunity', trulynkCategory: 'B', criterion: 'automation', severity: 'medium', status: 'Requires Client Verification', methods: ['playwright'],
    title: 'No online scheduling or field-service booking tool detected on site', description: 'Booking appears to be by phone or web form. Internal scheduling process unknown.', sourceUrl: home, unresolved: 'Which dispatch/scheduling system (if any) the business uses.' });
  if (!vk('messaging') && !vk('reviews_messaging') && !vk('chat')) add({ code: 'O-NO-TEXT-OR-CHAT', kind: 'opportunity', trulynkCategory: 'B', criterion: 'automation', severity: 'low', status: 'Requires Client Verification', methods: ['playwright'],
    title: 'No web chat or text-messaging widget detected', description: 'Possible missed-call text-back / SMS follow-up opportunity.', sourceUrl: home, unresolved: 'How missed calls and after-hours inquiries are handled today.' });
  if (realForms.length || formIframes.length) add({ code: 'O-FORM-LEAD-ROUTING', kind: 'opportunity', trulynkCategory: 'B', criterion: 'automation', severity: 'low', status: 'Requires Client Verification', methods: ['playwright'],
    title: 'Web form leads present: routing, acknowledgement and follow-up automation candidate', description: `${realForms.length} form(s)${formIframes.length ? ' + embedded form/booking iframe' : ''} found.`, sourceUrl: audit.pages?.contact?.url || home,
    unresolved: 'Where form submissions go and how fast they are answered.' });
  if (s.maintenancePlan) add({ code: 'O-MAINTENANCE-PLAN-AUTOMATION', kind: 'opportunity', trulynkCategory: 'B', criterion: 'automation', severity: 'low', status: 'Requires Client Verification', methods: ['playwright'],
    title: 'Maintenance plan/membership offered: renewal and reminder automation candidate', description: 'Maintenance agreement language found on site.', sourceUrl: home, unresolved: 'How renewals and tune-up reminders are managed today.' });
  if (!vk('reviews') && !vk('reviews_messaging')) add({ code: 'O-NO-REVIEW-REQUEST-TOOL', kind: 'opportunity', trulynkCategory: 'B', criterion: 'automation', severity: 'low', status: 'Requires Client Verification', methods: ['playwright'],
    title: 'No review-request tool detected on site', description: 'Post-job review request automation candidate.', sourceUrl: home, unresolved: 'Review requests may be sent from back-office software not visible on the website.' });
  const ct = (d.vendors || []).filter(v => v.kind === 'call_tracking');
  if (ct.length) add({ code: 'I-CALL-TRACKING', kind: 'info', trulynkCategory: null, criterion: null, severity: 'none', status: 'Verified', methods: ['playwright'],
    title: `Call-tracking script present (${ct.map(v => v.name).join(', ')})`, description: 'Indicates active marketing measurement; displayed numbers may vary by session.', sourceUrl: home });
  return F;
}

// Phone classification for the master record.
export function phoneRecords(co, audit) {
  const obs = [];
  if (co.gbpPhone) obs.push({ raw: co.gbpPhone, source: 'gbp' });
  for (const j of audit?.desktop?.jsonLd || []) {
    const walk = n => { if (!n || typeof n !== 'object') return; if (Array.isArray(n)) return n.forEach(walk); if (n.telephone) obs.push({ raw: n.telephone, source: 'jsonld' }); for (const v of Object.values(n)) if (v && typeof v === 'object') walk(v); };
    walk(j);
  }
  for (const t of audit?.desktop?.tel || []) obs.push({ raw: t.href, source: 'tel_desktop' });
  for (const t of audit?.mobile?.tel || []) obs.push({ raw: t.href, source: 'tel_mobile' });
  for (const x of audit?.firecrawl || []) for (const t of x.tel || []) obs.push({ raw: t.href, source: 'firecrawl' });
  const vendors = (audit?.desktop?.vendors || []).filter(v => v.kind === 'call_tracking').map(v => v.name);
  return classifyPhones(obs, vendors);
}
