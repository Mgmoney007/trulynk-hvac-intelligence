// Environment validation: render 3 public HVAC sites in desktop + mobile Chromium,
// capture screenshots, and extract public contact info. Writes JSON, CSV, Markdown.
// Usage: node env-validation/validate.mjs
import { createRequire } from 'node:module';
// require() resolves the environment's preinstalled global Playwright (ESM import does not).
const { chromium, devices } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs/promises';
import path from 'node:path';

const OUT = path.join(path.dirname(new URL(import.meta.url).pathname), 'output');
const SITES = [
  { name: 'CWA (Columbus, OH)', url: 'https://cwaohio.com/' },
  { name: 'Hetter Heating & Cooling (Columbus, OH)', url: 'https://hetterheating.com/' },
  { name: 'Chas Roberts (Phoenix, AZ)', url: 'https://www.chasroberts.com/' },
];

const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\b([2-9]\d{2})\)?[\s.-]?(\d{3})[\s.-]?(\d{4})\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

// Collected in-page. Values are recorded with their source; nothing is normalized beyond
// a digits-only key used for de-duplication.
async function extract(page) {
  return page.evaluate(() => {
    const out = { title: document.title, telLinks: [], mailtoLinks: [], jsonLd: [], bodyText: '' };
    for (const a of document.querySelectorAll('a[href^="tel:"]')) out.telLinks.push(a.getAttribute('href').slice(4).trim());
    for (const a of document.querySelectorAll('a[href^="mailto:"]')) out.mailtoLinks.push(a.getAttribute('href').slice(7).split('?')[0].trim());
    for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
      try { out.jsonLd.push(JSON.parse(s.textContent)); } catch { out.jsonLd.push({ _parseError: true }); }
    }
    out.bodyText = document.body ? document.body.innerText : '';
    return out;
  });
}

function walkLd(node, acc) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walkLd(n, acc)); return; }
  if (node['@graph']) walkLd(node['@graph'], acc);
  if (node.telephone) acc.phones.add(String(node.telephone));
  if (node.email) acc.emails.add(String(node.email).replace(/^mailto:/, ''));
  if (node.address && typeof node.address === 'object') {
    const a = Array.isArray(node.address) ? node.address : [node.address];
    for (const x of a) {
      const parts = [x.streetAddress, x.addressLocality, x.addressRegion, x.postalCode].filter(Boolean);
      if (parts.length) acc.addresses.add(parts.join(', '));
    }
  }
  for (const v of Object.values(node)) if (v && typeof v === 'object') walkLd(v, acc);
}

function contactSummary(raw) {
  const ld = { phones: new Set(), emails: new Set(), addresses: new Set() };
  walkLd(raw.jsonLd, ld);
  const textPhones = new Set();
  for (const m of raw.bodyText.matchAll(PHONE_RE)) textPhones.add(`(${m[1]}) ${m[2]}-${m[3]}`);
  const textEmails = new Set((raw.bodyText.match(EMAIL_RE) || []).map(e => e.toLowerCase()));
  return {
    telLinks: [...new Set(raw.telLinks)],
    mailtoLinks: [...new Set(raw.mailtoLinks)],
    jsonLdPhones: [...ld.phones],
    jsonLdEmails: [...ld.emails],
    jsonLdAddresses: [...ld.addresses],
    textPhones: [...textPhones],
    textEmails: [...textEmails],
    jsonLdBlocks: raw.jsonLd.length,
  };
}

async function run() {
  await fs.mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  for (const site of SITES) {
    const r = { ...site, desktop: {}, mobile: {}, errors: [] };
    const s = slug(site.name);
    // Desktop
    try {
      const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const t0 = Date.now();
      const resp = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      r.desktop.status = resp?.status() ?? null;
      r.desktop.finalUrl = page.url();
      r.desktop.loadMs = Date.now() - t0;
      const raw = await extract(page);
      r.desktop.title = raw.title;
      r.desktop.textChars = raw.bodyText.length;
      r.contact = contactSummary(raw);
      r.desktop.screenshot = `output/${s}-desktop.png`;
      await page.screenshot({ path: path.join(OUT, `${s}-desktop.png`) });
      await ctx.close();
    } catch (e) { r.errors.push(`desktop: ${e.message.split('\n')[0]}`); }
    // Mobile (iPhone 13 emulation: UA, viewport, touch, DPR)
    try {
      const ctx = await browser.newContext({ ...devices['iPhone 13'] });
      const page = await ctx.newPage();
      const t0 = Date.now();
      const resp = await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      r.mobile.status = resp?.status() ?? null;
      r.mobile.finalUrl = page.url();
      r.mobile.loadMs = Date.now() - t0;
      Object.assign(r.mobile, await page.evaluate(() => {
        const vp = document.querySelector('meta[name="viewport"]');
        const tels = [...document.querySelectorAll('a[href^="tel:"]')];
        const visibleTel = tels.some(a => { const b = a.getBoundingClientRect(); return b.width > 0 && b.height > 0 && b.top < window.innerHeight; });
        return {
          viewportMeta: vp ? vp.getAttribute('content') : null,
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
          telLinkCount: tels.length,
          telLinkAboveFold: visibleTel,
          textChars: document.body ? document.body.innerText.length : 0,
        };
      }));
      r.mobile.screenshot = `output/${s}-mobile.png`;
      await page.screenshot({ path: path.join(OUT, `${s}-mobile.png`) });
      await ctx.close();
    } catch (e) { r.errors.push(`mobile: ${e.message.split('\n')[0]}`); }
    results.push(r);
    console.log(`done: ${site.name} errors=${r.errors.length}`);
  }
  await browser.close();

  await fs.writeFile(path.join(OUT, 'results.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));

  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = ['company', 'url', 'desktop_status', 'desktop_text_chars', 'mobile_status', 'mobile_viewport_meta', 'mobile_horizontal_overflow', 'mobile_tel_above_fold', 'tel_links', 'jsonld_phones', 'text_phones', 'emails', 'jsonld_addresses', 'errors'];
  const rows = results.map(r => [
    r.name, r.url, r.desktop.status, r.desktop.textChars, r.mobile.status, r.mobile.viewportMeta,
    r.mobile.horizontalOverflow, r.mobile.telLinkAboveFold,
    (r.contact?.telLinks || []).join('; '), (r.contact?.jsonLdPhones || []).join('; '),
    (r.contact?.textPhones || []).join('; '),
    [...new Set([...(r.contact?.mailtoLinks || []), ...(r.contact?.jsonLdEmails || []), ...(r.contact?.textEmails || [])])].join('; '),
    (r.contact?.jsonLdAddresses || []).join(' | '), r.errors.join(' | '),
  ].map(esc).join(','));
  await fs.writeFile(path.join(OUT, 'results.csv'), [header.join(','), ...rows].join('\n') + '\n');

  const md = ['# Playwright test results', '', `Generated ${new Date().toISOString()}`, ''];
  for (const r of results) {
    md.push(`## ${r.name}`, '', `URL: ${r.url}`, '',
      `Desktop: HTTP ${r.desktop.status}, ${r.desktop.textChars} chars of text, title "${r.desktop.title}"`, '',
      `Mobile (iPhone 13): HTTP ${r.mobile.status}, viewport meta \`${r.mobile.viewportMeta}\`, horizontal overflow ${r.mobile.horizontalOverflow}, tel link above fold ${r.mobile.telLinkAboveFold}`, '',
      `Phones (tel links): ${(r.contact?.telLinks || []).join(', ') || 'none'}`, '',
      `Phones (JSON-LD): ${(r.contact?.jsonLdPhones || []).join(', ') || 'none'}`, '',
      `Emails: ${[...new Set([...(r.contact?.mailtoLinks || []), ...(r.contact?.jsonLdEmails || []), ...(r.contact?.textEmails || [])])].join(', ') || 'none found on homepage'}`, '',
      `Addresses (JSON-LD): ${(r.contact?.jsonLdAddresses || []).join(' / ') || 'none'}`, '',
      `Screenshots: ${r.desktop.screenshot}, ${r.mobile.screenshot}`, '',
      `Errors: ${r.errors.join('; ') || 'none'}`, '');
  }
  await fs.writeFile(path.join(OUT, 'results.md'), md.join('\n'));
}

run().catch(e => { console.error(e); process.exit(1); });
