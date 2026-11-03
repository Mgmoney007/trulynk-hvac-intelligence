// Playwright navigation with access-failure classification, overlay handling and page data collection.
import { loadPlaywright, withRetry, hostThrottle, sleep } from './util.mjs';

const CHALLENGE_TITLE = /just a moment|one moment, please|checking your browser|attention required|access denied|security check|are you a robot|verify you are human|ddos protection|request blocked|captcha|please wait/i;
const CHALLENGE_BODY = /request is being verified|sgcaptcha|checking your browser|cf-browser-verification|cf-chl|enable javascript and cookies to continue|verify you are human|request unsuccessful\. incapsula|sucuri website firewall|access denied|perimeterx|px-captcha/i;

// Known call-tracking / booking / CRM / chat vendors detected from script, iframe and link URLs.
export const VENDORS = [
  ['CallRail', /callrail|calltrk/i, 'call_tracking'],
  ['CallTrackingMetrics', /calltrackingmetrics|tctm\.co/i, 'call_tracking'],
  ['WhatConverts', /whatconverts/i, 'call_tracking'],
  ['Invoca', /invoca/i, 'call_tracking'],
  ['Marchex', /marchex/i, 'call_tracking'],
  ['ServiceTitan', /servicetitan|scheduler\.servicetitan|st-scheduler|scheduleengine/i, 'field_service'],
  ['Housecall Pro', /housecallpro/i, 'field_service'],
  ['Jobber', /getjobber|jobber\.com/i, 'field_service'],
  ['Workiz', /workiz/i, 'field_service'],
  ['FieldEdge', /fieldedge/i, 'field_service'],
  ['Successware', /successware/i, 'field_service'],
  ['ServiceFusion', /servicefusion/i, 'field_service'],
  ['Podium', /podium/i, 'messaging'],
  ['Birdeye', /birdeye/i, 'reviews_messaging'],
  ['NiceJob', /nicejob/i, 'reviews'],
  ['Broadly', /broadly/i, 'reviews_messaging'],
  ['Calendly', /calendly/i, 'scheduling'],
  ['Hatch', /usehatchapp|hatchapp/i, 'messaging'],
  ['Thryv', /thryv/i, 'crm'],
  ['HubSpot', /hs-scripts|hubspot|hsforms/i, 'crm'],
  ['Zyratalk', /zyratalk/i, 'chat'],
  ['Tawk', /tawk\.to/i, 'chat'],
  ['Intercom', /intercom/i, 'chat'],
  ['Drift', /drift\.com|driftt/i, 'chat'],
  ['LiveChat', /livechatinc/i, 'chat'],
  ['Tidio', /tidio/i, 'chat'],
  ['Smith.ai', /smith\.ai/i, 'chat'],
  ['Google reCAPTCHA', /recaptcha/i, 'captcha'],
  ['hCaptcha', /hcaptcha/i, 'captcha'],
  ['Synchrony', /synchrony/i, 'financing'],
  ['GreenSky', /greensky/i, 'financing'],
  ['Wells Fargo financing', /wellsfargo(retail)?|retailservices\.wellsfargo/i, 'financing'],
  ['Wix', /wix\.com|wixstatic|parastorage/i, 'cms'],
  ['Squarespace', /squarespace/i, 'cms'],
  ['WordPress', /wp-content|wp-includes/i, 'cms'],
  ['GoDaddy Builder', /img1\.wsimg|godaddy/i, 'cms'],
  ['Duda', /dudamobile|multiscreensite|duda/i, 'cms'],
  ['Weebly', /weebly/i, 'cms'],
];

export function detectVendors(urls) {
  const found = new Map();
  for (const u of urls) for (const [name, re, kind] of VENDORS) if (re.test(u) && !found.has(name)) found.set(name, kind);
  return [...found].map(([name, kind]) => ({ name, kind }));
}

let browserPromise = null;
export function getBrowser() {
  if (!browserPromise) browserPromise = loadPlaywright().chromium.launch();
  return browserPromise;
}
export async function closeBrowser() { if (browserPromise) { (await browserPromise).close(); browserPromise = null; } }

export async function newContext(kind) {
  const { devices } = loadPlaywright();
  const b = await getBrowser();
  const opts = kind === 'mobile'
    ? { ...devices['iPhone 13'], locale: 'en-US', timezoneId: 'America/New_York' }
    : { viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'America/New_York' };
  const ctx = await b.newContext(opts);
  ctx.setDefaultTimeout(20000);
  return ctx;
}

/**
 * Navigate and classify. Never throws.
 * access: 'ok' | 'http_error' | 'challenge' | 'timeout' | 'dns' | 'tls' | 'network'
 * 'http_error' with 404/410/5xx on our own repeated attempt is a candidate defect; everything else is an access failure.
 */
export async function navigate(page, url, { timeoutMs = 35000, retries = 1 } = {}) {
  const attempt = async () => {
    await hostThrottle(url);
    const t0 = Date.now();
    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
      await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
      await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      const status = resp ? resp.status() : null;
      let title = await page.title().catch(() => '');
      let bodySnippet = await page.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 1500)).catch(() => '');
      let html = await page.content().catch(() => '');
      let linkCount = await page.evaluate(() => document.querySelectorAll('a[href]').length).catch(() => 0);
      // JS challenges (Cloudflare, SiteGround) often clear themselves after a few seconds, as they would for a person.
      if (CHALLENGE_TITLE.test(title) || CHALLENGE_BODY.test(bodySnippet)) {
        await page.waitForTimeout(8000);
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        title = await page.title().catch(() => '');
        bodySnippet = await page.evaluate(() => (document.body ? document.body.innerText : '').slice(0, 1500)).catch(() => '');
        html = await page.content().catch(() => '');
        linkCount = await page.evaluate(() => document.querySelectorAll('a[href]').length).catch(() => 0);
      }
      const challenged = CHALLENGE_TITLE.test(title) || (CHALLENGE_BODY.test(html.slice(0, 20000)) && bodySnippet.length < 800) || CHALLENGE_BODY.test(bodySnippet);
      // A 200 page with almost no text and no links is treated as a probable interstitial, not as the site's real content.
      const thin = !challenged && status && status < 400 && bodySnippet.trim().length < 120 && linkCount < 3;
      let access = 'ok';
      if (challenged) access = 'challenge';
      else if (thin) access = 'suspect_interstitial';
      else if (status && status >= 400) access = 'http_error';
      return { access, status, finalUrl: page.url(), title, ms: Date.now() - t0, error: null, linkCount };
    } catch (e) {
      const m = String(e.message);
      let access = 'network';
      if (/Timeout/i.test(m)) access = 'timeout';
      else if (/ERR_NAME_NOT_RESOLVED|ENOTFOUND/i.test(m)) access = 'dns';
      else if (/CERT|SSL|TLS/i.test(m)) access = 'tls';
      return { access, status: null, finalUrl: page.url(), title: '', ms: Date.now() - t0, error: m.split('\n')[0].slice(0, 300) };
    }
  };
  return withRetry(attempt, { retries, backoffMs: 3000, shouldRetry: (e, r) => !!e || (r && r.access !== 'ok' && !(r.access === 'http_error' && [404, 410].includes(r.status))) });
}

// Find fixed/sticky elements that look like cookie banners or chat widgets and report how much of the viewport they cover.
export async function detectOverlays(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight, area = vw * vh;
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 40 || r.height < 30) continue;
      const w = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0));
      const h = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const cover = (w * h) / area;
      if (cover <= 0) continue;
      const sig = (el.id + ' ' + el.className + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
      const text = (el.innerText || '').slice(0, 300).toLowerCase();
      let kind = null;
      if (/cookie|consent|gdpr|ccpa|privacy/.test(sig) || /we use cookies|cookie|consent/.test(text)) kind = 'cookie';
      else if (/chat|messenger|podium|birdeye|zyra|tawk|intercom|drift|livechat|tidio|widget/.test(sig) || /chat with|text us|how can we help/.test(text)) kind = 'chat';
      else if (/modal|popup|pop-up|newsletter|lightbox|elementor-popup/.test(sig)) kind = 'popup';
      else if (/header|nav|menu|topbar|top-bar|sticky/.test(sig) || (r.top <= 1 && r.height < vh * 0.25)) kind = 'header';
      else if (r.bottom >= vh - 1 && r.height < vh * 0.2) kind = 'bottom_bar';
      else kind = 'other';
      // Skip nested children of an already-captured overlay
      if (out.some(o => o.el.contains(el))) continue;
      out.push({ el, kind, cover: Math.round(cover * 1000) / 1000, sig: sig.slice(0, 120), text: text.slice(0, 120) });
    }
    window.__tlOverlays = out.map(o => o.el);
    return out.map(({ el, ...rest }) => rest);
  });
}

// Hide (not dismiss) cookie/chat/popup overlays so a clean screenshot can be taken. No consent choice is made:
// nothing is clicked, so no cookies are accepted or rejected. The as-is screenshot is always taken first.
export async function hideOverlays(page) {
  return page.evaluate(() => {
    let n = 0;
    const els = window.__tlOverlays || [];
    for (const el of els) {
      const sig = (el.id + ' ' + el.className + ' ' + (el.innerText || '').slice(0, 300)).toLowerCase();
      if (/cookie|consent|gdpr|ccpa|chat|messenger|podium|birdeye|zyra|tawk|intercom|drift|livechat|tidio|widget|modal|popup|pop-up|newsletter|lightbox|we use cookies|text us/.test(sig)) {
        el.setAttribute('data-tl-hidden', '1'); el.style.setProperty('visibility', 'hidden', 'important'); n++;
      }
    }
    // Common third-party chat iframes not caught above
    for (const f of document.querySelectorAll('iframe[src*="podium"], iframe[src*="birdeye"], iframe[id*="chat"], iframe[title*="chat" i]')) {
      f.style.setProperty('visibility', 'hidden', 'important'); n++;
    }
    return n;
  });
}

// Collect everything the audit needs from the current page.
export async function collectPage(page) {
  const data = await page.evaluate(() => {
    const abs = h => { try { return new URL(h, location.href).href; } catch { return null; } };
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const vh = window.innerHeight;
    const links = [...document.querySelectorAll('a[href]')].map(a => {
      const r = a.getBoundingClientRect();
      return { href: a.getAttribute('href'), abs: abs(a.getAttribute('href')), text: (a.innerText || a.getAttribute('aria-label') || a.title || '').trim().replace(/\s+/g, ' ').slice(0, 80), visible: vis(a), aboveFold: vis(a) && r.top < vh && r.bottom > 0, h: Math.round(r.height), w: Math.round(r.width), inNav: !!a.closest('nav, header, [role="navigation"]'), inFooter: !!a.closest('footer') };
    });
    const buttons = [...document.querySelectorAll('button, [role="button"], input[type="submit"]')].map(b => {
      const r = b.getBoundingClientRect();
      return { text: (b.innerText || b.value || b.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 60), visible: vis(b), aboveFold: vis(b) && r.top < vh && r.bottom > 0 };
    });
    const forms = [...document.querySelectorAll('form')].map(f => {
      const fields = [...f.querySelectorAll('input, textarea, select')].filter(i => !['hidden', 'submit', 'button'].includes((i.type || '').toLowerCase()));
      const submit = f.querySelector('button[type="submit"], input[type="submit"], button:not([type])');
      return { action: f.getAttribute('action'), method: (f.getAttribute('method') || 'get').toLowerCase(), id: f.id, cls: String(f.className).slice(0, 80), fieldCount: fields.length,
        fieldNames: fields.map(i => i.name || i.id || i.placeholder || i.type).slice(0, 20), visible: vis(f), hasSubmit: !!submit, submitDisabled: submit ? !!submit.disabled : null,
        isSearch: /search/i.test(f.getAttribute('role') || '') || /search/i.test(f.className) || fields.some(i => i.type === 'search' || i.name === 's') };
    });
    const iframes = [...document.querySelectorAll('iframe')].map(f => f.src || f.getAttribute('data-src') || '').filter(Boolean);
    const scripts = [...document.querySelectorAll('script[src]')].map(s => s.src);
    const jsonLd = [];
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) { try { jsonLd.push(JSON.parse(s.textContent)); } catch { jsonLd.push({ _parseError: true }); } }
    const imgs = [...document.querySelectorAll('img')];
    const brokenImages = imgs.filter(i => i.complete && i.naturalWidth === 0 && (i.currentSrc || i.src) && !/^data:/.test(i.src) && vis(i)).map(i => i.currentSrc || i.src).slice(0, 20);
    const vp = document.querySelector('meta[name="viewport"]');
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      url: location.href, title: document.title, lang: document.documentElement.lang,
      metaDescription: document.querySelector('meta[name="description"]')?.content || null,
      h1: [...document.querySelectorAll('h1')].map(h => h.innerText.trim()).slice(0, 5),
      viewportMeta: vp ? vp.content : null,
      innerWidth: window.innerWidth, innerHeight: vh, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight,
      bodyText: document.body ? document.body.innerText.slice(0, 60000) : '',
      links, buttons, forms, iframes, scripts, jsonLd, brokenImages, imageCount: imgs.length,
      timing: nav ? { dcl: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), ttfb: Math.round(nav.responseStart) } : null,
    };
  });
  // reCAPTCHA misconfiguration shows a visible error inside its iframe ("ERROR for site owner: Invalid domain for site key").
  data.captchaErrors = [];
  for (const f of page.frames()) {
    if (!/recaptcha|hcaptcha/.test(f.url())) continue;
    try {
      const t = await f.evaluate(() => document.body ? document.body.innerText : '');
      if (/error for site owner|invalid (domain|site key|key type)|localhost is not in the list/i.test(t)) data.captchaErrors.push({ frame: f.url().slice(0, 200), text: t.slice(0, 200) });
    } catch {}
  }
  return data;
}

export async function safeScreenshot(page, file, opts = {}) {
  try { await page.screenshot({ path: file, ...opts, timeout: 20000 }); return true; } catch { return false; }
}

export { sleep };
