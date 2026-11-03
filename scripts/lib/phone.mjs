// US phone normalization and classification. Pure functions, unit tested.

// Returns { e164, display, digits } or null if not a valid NANP number.
export function normalizePhone(raw) {
  if (raw == null) return null;
  let s = String(raw);
  try { s = decodeURIComponent(s); } catch {}
  s = s.replace(/^tel:/i, '').split(/[;,]|ext|x(?=\d)/i)[0];
  let d = s.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') d = d.slice(1);
  if (d.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(d)) return null;
  return { digits: d, e164: '+1' + d, display: `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` };
}

// Digits-only of whatever is in a tel: href, for detecting malformed links.
export function telHrefDigits(href) {
  let s = String(href || '');
  try { s = decodeURIComponent(s); } catch {}
  return s.replace(/^tel:/i, '').replace(/\D/g, '');
}

// Structural problems in a tel: href that a dialer may not handle (e.g. "tel:tel:+1...", letters, empty).
// Returns null when the href is well-formed.
export function telHrefProblem(href) {
  let s = String(href || '');
  try { s = decodeURIComponent(s); } catch {}
  if (!/^tel:/i.test(s)) return 'not_tel_scheme';
  const rest = s.slice(4).trim();
  if (!rest) return 'empty';
  if (/tel:/i.test(rest)) return 'duplicated_scheme';
  // Drop dial pauses / extensions (",12", ";ext=12", " ext 12", "x12") before validating the main number.
  const main = rest.split(/[;,]/)[0].replace(/\s*(ext\.?|x)\s*\d+$/i, '');
  if (/[a-z]/i.test(main)) return 'contains_letters';
  const d = main.replace(/\D/g, '');
  if (!(d.length === 10 || (d.length === 11 && d[0] === '1'))) return 'wrong_digit_count';
  return null;
}

// Compare a tel: link with its visible text. Only meaningful when the text itself looks like a phone.
// Returns 'match' | 'mismatch' | 'href_invalid' | 'text_not_phone'
export function compareTelLink(href, text) {
  const h = normalizePhone(href);
  const textDigits = String(text || '').replace(/\D/g, '');
  const looksLikePhone = textDigits.length >= 10 && textDigits.length <= 11;
  if (!h) return 'href_invalid';
  if (!looksLikePhone) return 'text_not_phone';
  const t = normalizePhone(text);
  if (!t) return 'text_not_phone';
  return t.digits === h.digits ? 'match' : 'mismatch';
}

/**
 * Classify every observed number for a business.
 * observations: [{ raw, source }] where source in
 *   'gbp' (Google listing), 'jsonld', 'tel_desktop', 'tel_mobile', 'text', 'bbb', 'contact_page'
 * trackingVendors: array of detected call-tracking script vendors (may be empty)
 * Returns array of { e164, display, sources[], classification, reason }
 */
export function classifyPhones(observations, trackingVendors = []) {
  const map = new Map();
  for (const o of observations) {
    const n = normalizePhone(o.raw);
    if (!n) continue;
    if (!map.has(n.e164)) map.set(n.e164, { ...n, sources: new Set() });
    map.get(n.e164).sources.add(o.source);
  }
  const entries = [...map.values()];
  const anchor = new Set(entries.filter(e => e.sources.has('gbp') || e.sources.has('jsonld') || e.sources.has('bbb')).map(e => e.e164));
  const inDesktop = new Set(entries.filter(e => e.sources.has('tel_desktop')).map(e => e.e164));
  const inMobile = new Set(entries.filter(e => e.sources.has('tel_mobile')).map(e => e.e164));
  const sessionVariant = e =>
    inDesktop.size > 0 && inMobile.size > 0 && (inDesktop.has(e.e164) !== inMobile.has(e.e164));
  return entries.map(e => {
    const sources = [...e.sources].sort();
    let classification, reason;
    if (anchor.has(e.e164)) {
      classification = 'published_primary';
      reason = 'Appears in Google listing, schema markup, or BBB';
    } else if (sessionVariant(e)) {
      classification = 'likely_call_tracking';
      reason = 'Number shown in one browser session but not the other (dynamic number insertion pattern)';
    } else if (trackingVendors.length) {
      classification = 'possible_call_tracking';
      reason = `Not in listing/schema; call-tracking script detected (${trackingVendors.join(', ')})`;
    } else {
      classification = 'published_secondary';
      reason = 'Published on site; not corroborated by listing or schema';
    }
    return { e164: e.e164, display: e.display, sources, classification, reason };
  });
}
