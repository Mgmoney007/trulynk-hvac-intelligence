// Website + customer-journey audit for one or more companies. Read-only: never submits forms or books anything.
// Usage: node scripts/audit_site.mjs <companies.json> [--only id1,id2] [--concurrency 2] [--force]
// Writes data/raw/audits/<id>.json and evidence/screenshots/<id>/*.png.
// Sites that block the browser are written to data/raw/firecrawl_queue.jsonl for MCP-driven fallback retrieval.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, nowIso, readJson, writeJson, appendJsonl, probeUrl, pool, sleep } from './lib/util.mjs';
import { newContext, navigate, detectOverlays, hideOverlays, collectPage, safeScreenshot, detectVendors, closeBrowser } from './lib/browser.mjs';
import { normalizePhone, compareTelLink, telHrefProblem } from './lib/phone.mjs';
import { ownerCandidates as ownerCandidatesLib } from './lib/owners.mjs';
import { runCtaClickTests } from './lib/cta.mjs';

const AUDIT_DIR = path.join(ROOT, 'data/raw/audits');
const SHOT_DIR = path.join(ROOT, 'evidence/screenshots');
const QUEUE = path.join(ROOT, 'data/raw/firecrawl_queue.jsonl');

const RX = {
  contact: /contact|get in touch|reach us/i,
  about: /about|our story|who we are|our team|meet the|our company|history/i,
  booking: /book|schedule|appointment|request (service|an? (estimate|quote|appointment))|free (estimate|quote)|get (a|your) (free )?(quote|estimate)|request a call|service request/i,
  financing: /financ/i,
  emergency: /24\s*\/\s*7|24 hours|24-hour|emergency/i,
  license: /(lic(ense)?\.?\s*(#|no\.?|number)?:?\s*)?\b19HC\d{6,8}\b|hvacr? lic|master hvac|lic(ense)?\s*#\s*[A-Z0-9]{5,}/i,
  njLicense: /\b19HC\d{6,8}\b/gi,
  testimonials: /testimonial|what our (customers|clients) say|reviews?\b|★|5-star|five star/i,
  serviceArea: /service area|areas we serve|areas served|serving (the )?([A-Z][a-z]+ )+(county|area)|we serve/i,
  maintenancePlan: /maintenance (plan|agreement|club|program|membership)|comfort club|service (agreement|plan|club)|membership/i,
  hiring: /careers|now hiring|join our team|we('|’)re hiring|employment|job openings/i,
  placeholder: /lorem ipsum|your company name|sample text|insert (text|content) here|\(555\)\s*555|555-555-5555/i,
};
const SERVICE_RX = {
  ac_repair: /a\/?c repair|air condition(ing|er) repair|cooling repair/i,
  ac_install: /a\/?c (install|replacement)|air condition(ing|er) (install|replace)|central air install/i,
  furnace: /furnace/i,
  boiler: /boiler/i,
  heat_pump: /heat pump/i,
  ductless: /ductless|mini[- ]split/i,
  maintenance: /maintenance|tune[- ]up/i,
  indoor_air: /indoor air quality|air purif|humidif/i,
  commercial: /commercial/i,
  plumbing: /plumbing/i,
};

function yearsSignals(text) {
  const out = {};
  const since = [...text.matchAll(/\b(?:since|established|est\.?|founded(?: in)?|serving (?:[\w\s]+ )?since)\s*(19[2-9]\d|20[0-2]\d)\b/gi)].map(m => Number(m[1]));
  if (since.length) out.sinceYear = Math.min(...since);
  const yrs = [...text.matchAll(/\b(\d{2,3})\+?\s*(?:years|yrs)(?:\s+of)?\s+(?:experience|in business|serving|of service)/gi)].map(m => Number(m[1])).filter(n => n < 150);
  if (yrs.length) out.yearsClaim = Math.max(...yrs);
  const techs = [...text.matchAll(/\b(\d{1,3})\s+(?:certified\s+|licensed\s+|experienced\s+|trained\s+|nate[- ]certified\s+|full[- ]time\s+)?(?:technicians|techs|trucks|service vans|employees|team members)\b/gi)].map(m => Number(m[1]));
  if (techs.length) out.teamClaim = Math.max(...techs);
  const cr = [...text.matchAll(/(?:©|copyright|&copy;)\s*(?:copyright\s*)?(?:©\s*)?(?:\d{4}\s*[-–]\s*)?(\d{4})/gi)].map(m => Number(m[1])).filter(y => y > 1995 && y < 2100);
  if (cr.length) out.copyrightYear = Math.max(...cr);
  return out;
}

// Owner candidates come from scripts/lib/owners.mjs (stricter, tested). Strings: "Name | context".
const ownerCandidates = text => ownerCandidatesLib(text).map(o => `${o.name} | ${o.context}`);

function emailsFrom(text, links) {
  const s = new Set();
  for (const m of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) s.add(m[0].toLowerCase());
  for (const l of links) if (/^mailto:/i.test(l.href || '')) s.add(decodeURIComponent(l.href.slice(7).split('?')[0]).trim().toLowerCase());
  return [...s].filter(e => !/\.(png|jpe?g|gif|webp|svg)$/.test(e) && !/sentry|wixpress|example\.com|domain\.com|godaddy|@2x/.test(e));
}

function telInfo(links) {
  return links.filter(l => /^tel:/i.test(l.href || '')).map(l => ({ href: l.href, text: l.text, visible: l.visible, aboveFold: l.aboveFold, compare: compareTelLink(l.href, l.text), problem: telHrefProblem(l.href), e164: normalizePhone(l.href)?.e164 || null }));
}

function sameSite(u, base) {
  try { const a = new URL(u), b = new URL(base); return a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, ''); } catch { return false; }
}

function pickPage(links, rx, base) {
  // Ignore empty/self/anchor links: an empty-href "Contact Us" button resolves to the current page and must not
  // stand in for the real contact page.
  const self = String(base).split('#')[0].replace(/\/$/, '');
  const c = links.filter(l => l.abs && (l.href || '').trim() && !/^#/.test(l.href.trim()) && l.abs.split('#')[0].replace(/\/$/, '') !== self
    && sameSite(l.abs, base) && !/^(tel|mailto|javascript):/i.test(l.href || '') && (rx.test(l.text) || rx.test(new URL(l.abs).pathname.replace(/[-_/]/g, ' '))));
  c.sort((a, b) => new URL(a.abs).pathname.length - new URL(b.abs).pathname.length);
  return c[0]?.abs?.split('#')[0] || null;
}

async function shot(page, dir, name, opts) {
  const f = path.join(dir, name);
  if (opts?.fullPage) {
    // Very long pages can exhaust Chromium memory; cap full-page captures at 6000px.
    const dims = await page.evaluate(() => ({ w: document.documentElement.clientWidth, h: document.documentElement.scrollHeight })).catch(() => null);
    if (dims) opts = { fullPage: true, clip: { x: 0, y: 0, width: dims.w || 1366, height: Math.min(dims.h || 900, 6000) } };
  }
  return (await safeScreenshot(page, f, opts)) ? path.relative(ROOT, f) : null;
}

async function auditCompany(co, { force }) {
  const out = path.join(AUDIT_DIR, `${co.id}.json`);
  if (!force) { try { await fs.access(out); console.log(`skip (exists) ${co.id}`); return readJson(out); } catch {} }
  const dir = path.join(SHOT_DIR, co.id);
  await fs.mkdir(dir, { recursive: true });
  // Firecrawl fallback records are ingested separately and must survive a forced re-audit.
  const prior = await readJson(out, null);
  const A = { firecrawl: prior?.firecrawl || [], id: co.id, name: co.name, website: co.website, auditedAt: nowIso(), retrieval: [], accessFailures: [], desktop: null, mobile: null, pages: {}, linkCheck: null, https: null, screenshots: {}, notes: [] };

  // ---------- Desktop home ----------
  let ctx = await newContext('desktop');
  let page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  const nav = await navigate(page, co.website);
  A.retrieval.push({ step: 'desktop_home', method: 'playwright_chromium_desktop', url: co.website, at: nowIso(), ...nav });
  if (nav.access !== 'ok') {
    A.accessFailures.push({ step: 'desktop_home', access: nav.access, status: nav.status, error: nav.error, url: co.website });
    A.screenshots.desktop_failure = await shot(page, dir, 'desktop-home-access-failure.png');
    await appendJsonl(QUEUE, { id: co.id, url: co.website, reason: `desktop ${nav.access} ${nav.status ?? ''}`.trim(), mobile: false, queuedAt: nowIso() });
  } else {
    const d = await collectPage(page);
    d.consoleErrors = consoleErrors.slice(0, 15);
    d.overlays = await detectOverlays(page);
    A.screenshots.desktop_asis = await shot(page, dir, 'desktop-home.png');
    if (d.overlays.some(o => ['cookie', 'chat', 'popup'].includes(o.kind))) {
      await hideOverlays(page);
      A.screenshots.desktop_clean = await shot(page, dir, 'desktop-home-overlays-hidden.png');
    }
    A.screenshots.desktop_full = await shot(page, dir, 'desktop-home-full.png', { fullPage: true });
    A.desktop = { ...d, status: nav.status, finalUrl: nav.finalUrl, navMs: nav.ms, tel: telInfo(d.links), vendors: detectVendors([...d.scripts, ...d.iframes, ...d.links.map(l => l.abs || '')]) };

    // ---------- Empty-href CTA click test (read-only; see lib/cta.mjs) ----------
    A.ctaClickTests = await runCtaClickTests(ctx, nav.finalUrl, d.links, dir);

    // ---------- Contact / about / booking pages ----------
    const base = nav.finalUrl;
    const targets = {
      contact: pickPage(d.links, RX.contact, base),
      about: pickPage(d.links, RX.about, base),
      booking: pickPage(d.links, RX.booking, base),
    };
    for (const [k, u] of Object.entries(targets)) {
      if (!u || u.split('#')[0] === base.split('#')[0]) continue;
      if (k === 'booking' && (u === targets.contact)) continue;
      const p2 = await ctx.newPage();
      const n2 = await navigate(p2, u, { retries: 1 });
      A.retrieval.push({ step: `desktop_${k}`, method: 'playwright_chromium_desktop', url: u, at: nowIso(), ...n2 });
      if (n2.access === 'ok') {
        const pd = await collectPage(p2);
        A.pages[k] = { url: u, finalUrl: n2.finalUrl, status: n2.status, title: pd.title, forms: pd.forms, iframes: pd.iframes, captchaErrors: pd.captchaErrors,
          emails: emailsFrom(pd.bodyText, pd.links), tel: telInfo(pd.links), owners: ownerCandidates(pd.bodyText), bodyText: pd.bodyText.slice(0, 15000),
          vendors: detectVendors([...pd.scripts, ...pd.iframes, ...pd.links.map(l => l.abs || '')]), links: pd.links.filter(l => l.abs && sameSite(l.abs, base)).map(l => l.abs) };
        await detectOverlays(p2); await hideOverlays(p2);
        A.screenshots[`desktop_${k}`] = await shot(p2, dir, `desktop-${k}.png`, { fullPage: true });
      } else {
        A.pages[k] = { url: u, status: n2.status, access: n2.access, error: n2.error };
        if (n2.access === 'http_error') A.screenshots[`desktop_${k}_error`] = await shot(p2, dir, `desktop-${k}-error.png`);
        else A.accessFailures.push({ step: `desktop_${k}`, access: n2.access, status: n2.status, error: n2.error, url: u });
      }
      await p2.close();
    }

    // ---------- Internal link check (fetch, then reproduce failures in browser) ----------
    const all = new Set();
    const addLinks = arr => { for (const u of arr) { if (!u) continue; const clean = u.split('#')[0]; if (sameSite(clean, base) && /^https?:/.test(clean) && !/\.(jpe?g|png|gif|webp|svg|pdf|zip|mp4)(\?|$)/i.test(clean)) all.add(clean); } };
    addLinks(d.links.map(l => l.abs));
    for (const pg of Object.values(A.pages)) if (pg.links) addLinks(pg.links);
    // External CTA targets (booking/scheduling vendors) are checked too, since they are part of the customer journey.
    const ext = new Set(d.links.filter(l => l.abs && !sameSite(l.abs, base) && /^https?:/.test(l.abs) && (RX.booking.test(l.text) || /servicetitan|housecallpro|getjobber|workiz|calendly|scheduleengine|fieldedge/i.test(l.abs))).map(l => l.abs));
    const list = [...all].slice(0, 60).concat([...ext].slice(0, 10));
    const results = await pool(list, 3, u => probeUrl(u, { timeoutMs: 15000 }));
    const broken = [];
    for (const r of results) {
      if (r.status && (r.status === 404 || r.status === 410 || r.status >= 500)) {
        // Reproduce in a real browser before treating as a defect.
        const p3 = await ctx.newPage();
        await sleep(1500);
        const n3 = await navigate(p3, r.url, { retries: 0 });
        const reproduced = n3.access === 'http_error' && (n3.status === 404 || n3.status === 410 || n3.status >= 500);
        let shotPath = null;
        if (reproduced) shotPath = await shot(p3, dir, `broken-${broken.length + 1}.png`);
        const sources = d.links.filter(l => l.abs && l.abs.split('#')[0] === r.url).map(l => ({ text: l.text, inNav: l.inNav, inFooter: l.inFooter, onPage: 'home' }));
        for (const [k, pg] of Object.entries(A.pages)) if (pg.links?.some(x => x.split('#')[0] === r.url)) sources.push({ onPage: k });
        broken.push({ url: r.url, fetchStatus: r.status, browserStatus: n3.status, browserAccess: n3.access, reproduced, screenshot: shotPath, linkedFrom: sources.slice(0, 5), external: !sameSite(r.url, base) });
        await p3.close();
      }
    }
    A.linkCheck = { checked: list.length, at: nowIso(), statusCounts: results.reduce((m, r) => { const k = r.status ?? (r.error ? 'error' : 'none'); m[k] = (m[k] || 0) + 1; return m; }, {}),
      accessIssues: results.filter(r => !r.status || r.status === 403 || r.status === 429).map(r => ({ url: r.url, status: r.status, error: r.error })).slice(0, 10), broken };
  }
  await ctx.close();

  // ---------- Mobile home ----------
  ctx = await newContext('mobile');
  page = await ctx.newPage();
  const mnav = await navigate(page, co.website);
  A.retrieval.push({ step: 'mobile_home', method: 'playwright_chromium_iphone13', url: co.website, at: nowIso(), ...mnav });
  if (mnav.access !== 'ok') {
    A.accessFailures.push({ step: 'mobile_home', access: mnav.access, status: mnav.status, error: mnav.error, url: co.website });
    A.screenshots.mobile_failure = await shot(page, dir, 'mobile-home-access-failure.png');
    await appendJsonl(QUEUE, { id: co.id, url: co.website, reason: `mobile ${mnav.access} ${mnav.status ?? ''}`.trim(), mobile: true, queuedAt: nowIso() });
  } else {
    const m = await collectPage(page);
    m.overlays = await detectOverlays(page);
    A.screenshots.mobile_asis = await shot(page, dir, 'mobile-home.png');
    const blocking = m.overlays.filter(o => ['cookie', 'chat', 'popup'].includes(o.kind)); // 'other' fixed layers are often decorative; recorded but not scored
    if (blocking.length) { await hideOverlays(page); A.screenshots.mobile_clean = await shot(page, dir, 'mobile-home-overlays-hidden.png'); }
    const visLinks = m.links.filter(l => l.visible);
    const ctaRx = /call|book|schedule|request|estimate|quote|contact|appointment/i;
    const menuToggle = await page.evaluate(() => !![...document.querySelectorAll('button, a, div[role="button"], [class*="toggle"], [class*="hamburger"], [aria-label]')]
      .find(e => { const r = e.getBoundingClientRect(); const s = ((e.getAttribute('aria-label') || '') + ' ' + e.className + ' ' + (e.innerText || '')).toLowerCase(); return r.width > 0 && r.height > 0 && r.top < window.innerHeight && /menu|hamburger|nav-toggle|navbar-toggler|mobile-nav|toggle/.test(s); }));
    A.mobile = {
      status: mnav.status, finalUrl: mnav.finalUrl, navMs: mnav.ms, timing: m.timing, viewportMeta: m.viewportMeta,
      innerWidth: m.innerWidth, scrollWidth: m.scrollWidth, horizontalOverflow: m.scrollWidth > m.innerWidth + 2,
      tel: telInfo(m.links), telAboveFold: m.links.some(l => /^tel:/i.test(l.href || '') && l.aboveFold),
      ctaAboveFold: [...m.links.filter(l => l.aboveFold && ctaRx.test(l.text)).map(l => l.text), ...m.buttons.filter(b => b.aboveFold && ctaRx.test(b.text)).map(b => b.text)].slice(0, 8),
      menuToggle, overlays: m.overlays, maxBlockingCover: Math.max(0, ...blocking.map(o => o.cover)),
      smallTapTargets: visLinks.filter(l => l.h > 0 && l.h < 24 && l.inNav).length, visibleNavLinks: visLinks.filter(l => l.inNav).length,
      brokenImages: m.brokenImages, textChars: m.bodyText.length,
    };
  }
  await ctx.close();

  // ---------- HTTPS / redirect ----------
  try {
    const host = new URL(co.website).hostname;
    const httpRes = await probeUrl(`http://${host}/`, { timeoutMs: 15000 });
    const httpsRes = await probeUrl(`https://${host}/`, { timeoutMs: 15000 });
    A.https = { httpFinal: httpRes.finalUrl, httpStatus: httpRes.status, httpError: httpRes.error, httpsStatus: httpsRes.status, httpsError: httpsRes.error,
      redirectsToHttps: !!httpRes.finalUrl && httpRes.finalUrl.startsWith('https://') };
  } catch (e) { A.https = { error: e.message }; }

  // ---------- Derived text signals ----------
  const texts = [A.desktop?.bodyText || '', ...Object.values(A.pages).map(p => p.bodyText || '')].join('\n');
  A.signals = {
    financing: RX.financing.test(texts), emergency: RX.emergency.test(texts), licenseMention: RX.license.test(texts), njLicenses: [...new Set((texts.match(RX.njLicense) || []).map(s => s.toUpperCase()))],
    testimonials: RX.testimonials.test(texts), serviceArea: RX.serviceArea.test(texts), maintenancePlan: RX.maintenancePlan.test(texts), hiring: RX.hiring.test(texts) || (A.desktop?.links || []).some(l => RX.hiring.test(l.text)),
    placeholder: (texts.match(RX.placeholder) || [])[0] || null,
    services: Object.fromEntries(Object.entries(SERVICE_RX).map(([k, rx]) => [k, rx.test(texts)])),
    ...yearsSignals(texts),
    emails: [...new Set([...(A.desktop ? emailsFrom(A.desktop.bodyText, A.desktop.links) : []), ...Object.values(A.pages).flatMap(p => p.emails || [])])],
    owners: [...new Set([...(A.desktop ? ownerCandidates(A.desktop.bodyText) : []), ...Object.values(A.pages).flatMap(p => p.owners || [])])].slice(0, 8),
    bookingLinkTexts: (A.desktop?.links || []).filter(l => RX.booking.test(l.text)).map(l => `${l.text} -> ${l.abs}`).slice(0, 8),
  };
  if (A.desktop) A.desktop.bodyText = A.desktop.bodyText.slice(0, 20000);
  await writeJson(out, A);
  console.log(`audited ${co.id}: access_failures=${A.accessFailures.length} broken=${A.linkCheck?.broken.length ?? 'n/a'}`);
  return A;
}

async function main() {
  const args = process.argv.slice(2);
  const file = args[0];
  const only = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;
  const conc = args.includes('--concurrency') ? Number(args[args.indexOf('--concurrency') + 1]) : 2;
  const force = args.includes('--force');
  let cos = await readJson(path.resolve(file));
  if (only) cos = cos.filter(c => only.includes(c.id));
  cos = cos.filter(c => c.website);
  await pool(cos, conc, async c => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try { return await auditCompany(c, { force }); }
      catch (e) {
        console.error(`FAILED${attempt ? '' : ' (will retry)'} ${c.id}: ${e.message.split('\n')[0]}`);
        await appendJsonl(path.join(ROOT, 'logs/audit_errors.jsonl'), { id: c.id, at: nowIso(), attempt, error: e.message.split('\n')[0] });
        await sleep(3000);
      }
    }
  });
  await closeBrowser();
}
main().catch(e => { console.error(e); process.exit(1); });
