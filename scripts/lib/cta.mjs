// Read-only click test for visible CTA links with an empty or "#" href: click once, observe, never submit anything.
import path from 'node:path';
import { ROOT, nowIso } from './util.mjs';
import { navigate, safeScreenshot } from './browser.mjs';

export const DEAD_EFFECTS = ['no visible effect', 'jumped to page top (no form shown)'];
const CTA_RX = /\b(appointment|book|schedule|quote|estimate|contact|request|call)/i; // word-start: 'Facebook' must not match

export async function runCtaClickTests(ctx, url, links, dir, max = 3) {
  const out = [];
  const cands = links.filter(l => l.visible && (!(l.href || '').trim() || /^#\s*$/.test(l.href.trim())) && CTA_RX.test(l.text)).slice(0, max);
  for (const cand of cands) {
    try {
      const p = await ctx.newPage();
      const n = await navigate(p, url, { retries: 0 });
      if (n.access !== 'ok') { await p.close(); continue; }
      const state = () => p.evaluate(() => ({ url: location.href, scrollY: Math.round(window.scrollY),
        dialogs: [...document.querySelectorAll('dialog[open], [role="dialog"], .modal.show, .modal.in, .mfp-wrap, .elementor-popup-modal, .fancybox-container')].filter(e => e.getBoundingClientRect().height > 0).length,
        visibleForms: [...document.querySelectorAll('form')].filter(f => { const r = f.getBoundingClientRect(); return r.height > 0 && r.top < window.innerHeight && r.bottom > 0; }).length }));
      // Target only the empty/'#'/missing-href variants, since the same label may also exist with a real href.
      const loc = p.locator('a[href="#"], a[href=""], a:not([href]), a[href="# "]', { hasText: cand.text }).filter({ visible: true }).first();
      if (!(await loc.count())) { await p.close(); continue; }
      const href = await loc.getAttribute('href');
      if ((href || '').trim() && !/^#\s*$/.test(href.trim())) { await p.close(); continue; }
      // Conservative: if script could be handling the click (listeners, onclick, action data-attributes, popup/widget
      // classes on the element or its ancestors), the outcome is "script-handled" and never reported as dead.
      let scripted = null;
      try {
        const cdp = await ctx.newCDPSession(p);
        const h = await loc.elementHandle();
        const info = await h.evaluate(e => {
          const sig = [];
          for (let n = e, i = 0; n && n.tagName !== 'BODY' && i < 6; n = n.parentElement, i++) {
            if (n.getAttribute('onclick')) sig.push(`onclick@${n.tagName}`);
            for (const k of Object.keys(n.dataset || {})) if (/toggle|target|options|action|popup|modal|open|href|link|elementor/i.test(k)) sig.push(`data-${k}@${n.tagName}`);
            if (/popmake|pum-|livesite|\bls-|modal|popup|lightbox|elementor-|fancybox|calendly|scheduler|book-?now-widget/i.test(String(n.className))) sig.push(`class:${String(n.className).slice(0, 40)}@${n.tagName}`);
          }
          window.__tlCta = e;
          return sig;
        });
        const obj = await cdp.send('Runtime.evaluate', { expression: 'window.__tlCta' });
        const ev = await cdp.send('DOMDebugger.getEventListeners', { objectId: obj.result.objectId, depth: 0 });
        const clickL = ev.listeners.filter(l => /click|mousedown|pointerdown|touchstart/.test(l.type)).map(l => `listener:${l.type}`);
        const sig = [...info, ...clickL];
        if (sig.length) scripted = sig.slice(0, 5);
        await cdp.detach().catch(() => {});
      } catch {}
      if (scripted) { out.push({ text: cand.text, href: href ?? '', effect: 'script-handled (not testable)', signals: scripted, at: nowIso() }); await p.close(); continue; }
      await loc.scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {}); // Playwright would scroll anyway; measure after it
      await p.waitForTimeout(300);
      const before = await state();
      await loc.click({ timeout: 5000, noWaitAfter: true }).catch(() => {});
      await p.waitForTimeout(2000);
      const after = await state();
      const effect = after.url.split('#')[0] !== before.url.split('#')[0] ? 'navigated' : after.dialogs > before.dialogs ? 'opened dialog'
        : after.visibleForms > before.visibleForms ? 'revealed form'
        : (after.scrollY < 5 && before.scrollY > 50) ? 'jumped to page top (no form shown)'
        : Math.abs(after.scrollY - before.scrollY) > 50 ? 'scrolled to section' : 'no visible effect';
      let screenshot = null;
      if (DEAD_EFFECTS.includes(effect)) {
        const f = path.join(dir, `cta-click-${out.length + 1}.png`);
        if (await safeScreenshot(p, f)) screenshot = path.relative(ROOT, f);
      }
      out.push({ text: cand.text, href: href ?? '', before, after, effect, screenshot, at: nowIso() });
      await p.close();
    } catch (e) { out.push({ text: cand.text, error: e.message.split('\n')[0] }); }
  }
  return out;
}
