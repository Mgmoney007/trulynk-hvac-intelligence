// Phase 9 QA: re-retrieve the evidence behind the strongest claims at a later time and record the outcome.
// Usage: node scripts/qa_recheck.mjs -> data/qa_recheck.csv
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson, probeUrl, nowIso } from './lib/util.mjs';
import { execFileSync } from 'node:child_process';

// Second client: some servers answer Node's fetch differently (e.g. 202 bot-mitigation) than a browser-like client.
const curl = url => { try { const out = execFileSync('curl', ['-sS', '-L', '--max-time', '25', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', '-o', '/dev/null', '-w', '%{http_code}', url], { encoding: 'utf8' }); return Number(out.trim()); } catch { return null; } };
const curlBody = url => { try { return execFileSync('curl', ['-sS', '-L', '--max-time', '25', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130 Safari/537.36', url], { encoding: 'utf8', maxBuffer: 20e6 }); } catch { return ''; } };

const scored = await readJson(path.join(ROOT, 'data/interim/scored.json'));
const rows = [];
for (const r of scored.filter(r => ['A', 'B', 'C'].includes(r.pr.tier) || r.findings.some(f => f.code === 'A-PARKED-WEBSITE'))) {
  for (const f of r.findings.filter(f => f.kind === 'defect' && ['high', 'medium'].includes(f.severity))) {
    let outcome = 'not rechecked', detail = '';
    if (['A-BROKEN-LINK', 'A-LISTING-WEBSITE-ERROR', 'A-CTA-PAGE-ERROR'].includes(f.code)) {
      const p = await probeUrl(f.sourceUrl);
      const isErr = st => st && (st === 404 || st === 410 || st >= 500);
      let c = null;
      if (!isErr(p.status)) c = curl(f.sourceUrl);
      outcome = isErr(p.status) || isErr(c) ? 'reproduced' : (p.status && p.status < 400) || (c && c < 400) ? 'NOT reproduced' : 'access issue';
      detail = `node fetch HTTP ${p.status ?? 'none'}${p.error ? ' ' + p.error : ''}${c != null ? `; curl HTTP ${c}` : ''}`;
    } else if (['A-TEL-MISMATCH', 'A-TEL-MALFORMED'].includes(f.code)) {
      const p = await probeUrl(f.sourceUrl);
      const href = (f.description.match(/href "([^"]+)"/) || f.title.match(/(tel:[^\s)]+)/) || [])[1];
      const digits = href ? decodeURIComponent(href).replace(/\D/g, '').slice(-10) : '';
      const html = (await fetch(f.sourceUrl, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/130' } }).then(x => x.text()).catch(() => ''));
      const rawHrefs = [...html.matchAll(/href=["'](tel:[^"']+)["']/gi)].map(m => m[1]);
      const hit = rawHrefs.some(h => decodeURIComponent(h).replace(/\D/g, '').endsWith(digits));
      outcome = digits && hit ? 'reproduced' : rawHrefs.length ? 'NOT reproduced' : 'access issue';
      detail = `HTTP ${p.status}; tel hrefs in raw HTML: ${[...new Set(rawHrefs)].slice(0, 6).join(' ')}`;
    } else if (['A-PARKED-WEBSITE', 'A-EMPTY-WEBSITE'].includes(f.code)) {
      const html = await fetch(f.sourceUrl, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/130' } }).then(x => x.text()).catch(e => 'ERR ' + e.message);
      const links = (html.match(/<a\s[^>]*href=/gi) || []).length;
      const parked = /future home of something quite cool|coming soon/i.test(html);
      outcome = f.code === 'A-PARKED-WEBSITE' ? (parked ? 'reproduced' : 'NOT reproduced') : 'see detail';
      detail = `${html.length} bytes, ${links} <a> tags${parked ? ', parked text present' : ''}`;
    }
    if (f.code === 'A-WRONG-MARKET-COPY') {
      const html = curlBody(f.sourceUrl).replace(/<[^>]+>/g, ' ');
      const n = (html.match(/New York|Manhattan|Brooklyn|NYC/g) || []).length;
      outcome = n >= 5 ? 'reproduced' : 'NOT reproduced'; detail = `${n} mentions of New York/Manhattan/Brooklyn/NYC in homepage HTML text`;
    }
    if (f.code === 'A-DEAD-CTA') {
      const html = curlBody(f.sourceUrl);
      const empt = [...html.matchAll(/<a[^>]*href=["']\s*["'][^>]*>([\s\S]{0,60}?)<\/a>/gi)].map(m => m[1].replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      outcome = empt.length ? 'reproduced (markup)' : 'NOT reproduced'; detail = `empty-href links in raw HTML: ${[...new Set(empt)].join(' | ').slice(0, 120)}`;
    }
    rows.push({ company: r.co.name, tier: r.pr.tier, finding_id: f.findingId, code: f.code, url: f.sourceUrl, original_verified_at: f.verifiedAt, rechecked_at: nowIso(), outcome, detail });
  }
}
const cols = Object.keys(rows[0]);
const esc = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
await fs.writeFile(path.join(ROOT, 'data/qa_recheck.csv'), [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n');
for (const r of rows) console.log(`${r.outcome.padEnd(15)} ${r.company.slice(0, 30).padEnd(30)} ${r.code.padEnd(24)} ${r.detail.slice(0, 110)}`);
