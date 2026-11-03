// Generate pass_1_top_10.md, pass_1_research_queue.md and pass_1_summary.md from scored data.
// Narrative judgement (value hypothesis, outreach angle) comes only from config/manual_review.json, written after review.
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, readJson, readJsonl, today } from './lib/util.mjs';

const scored = await readJson(path.join(ROOT, 'data/interim/scored.json'));
const comps = await readJson(path.join(ROOT, 'data/interim/competitors.json'), []);
const manual = await readJson(path.join(ROOT, 'config/manual_review.json'), {});
const usage = await readJsonl(path.join(ROOT, 'logs/firecrawl_usage.jsonl'));
const screening = (await fs.readFile(path.join(ROOT, 'data/screening_log.csv'), 'utf8')).trim().split('\n').slice(1);

const pct = x => `${Math.round(x * 100)}%`;
const link = p => p ? `[${p}](${p})` : '';
const verifiedFixable = r => r.findings.filter(f => f.kind === 'defect' && f.status === 'Verified');
const friction = r => r.findings.filter(f => f.kind === 'friction');
const rcv = r => r.findings.filter(f => f.status === 'Requires Client Verification' || (f.status === 'Suggestive'));
const loc = co => `${co.street ? co.street + ', ' : ''}${co.city || '?'}, NJ ${co.zip || ''} (${co.county} County)`;

function sources(r) {
  const s = [`Google Maps listing: ${r.co.placeUrl} (retrieved ${String(r.co.gbpRetrievedAt).slice(0, 10)})`, `Official website: ${r.co.website}`];
  if (r.co.bbb?.matched) s.push(`BBB: ${r.co.bbb.url}`);
  for (const p of Object.values(r.auditSummary?.pages || {})) if (p.url) s.push(`Site page: ${p.url}`);
  return s;
}

// ---------------- Top 10 ----------------
const top = scored.filter(r => ['A', 'B', 'C'].includes(r.pr.tier)).slice(0, 10);
let md = `# TruLynk Pass 1: Top 10 Opportunities\n\nGenerated ${today()} from \`data/interim/scored.json\`. Ranking: Priority tier first, then provisional Opportunity Score, then Evidence Confidence.\nEvery finding below links to a finding ID in \`data/research_evidence.csv\` and a screenshot under \`evidence/screenshots/\`.\n\n`;
const nA = top.filter(r => r.pr.tier === 'A').length, nB = top.filter(r => r.pr.tier === 'B').length, nC = top.filter(r => r.pr.tier === 'C').length;
md += `Tier mix in this list: ${nA} Priority A, ${nB} Priority B, ${nC} Priority C. Priority C entries are included only to fill the list and belong in the research queue, not the sales queue.\n\n`;
md += `| # | Company | County | Tier | Opportunity (provisional) | Coverage | Evidence Confidence | Strongest verified finding |\n|---|---|---|---|---|---|---|---|\n`;
top.forEach((r, i) => {
  const vf = verifiedFixable(r)[0] || friction(r).find(f => f.severity !== 'low');
  md += `| ${i + 1} | ${r.co.name} | ${r.co.county} | ${r.pr.tier} | ${r.opp.provisional ?? 'n/a'} | ${pct(r.opp.coverage)} | ${r.conf.total} (${r.conf.band}) | ${vf ? vf.title : 'None'} |\n`;
});
md += '\n';
top.forEach((r, i) => {
  const m = manual[r.co.id] || {};
  const comp = comps.find(c => c.prospect.id === r.co.id);
  md += `---\n\n## ${i + 1}. ${r.co.name}\n\n`;
  md += `**1. Location:** ${loc(r.co)}\n\n**2. Website:** ${r.co.website}\n\n`;
  md += `**3. Opportunity Score:** ${r.opp.provisional ?? 'n/a'} provisional (confirmed ${r.opp.confirmed} pts of ${r.opp.assessedWeight} assessed; ${r.opp.unassessed} pts unassessed; max possible ${r.opp.maxPossible}; coverage ${pct(r.opp.coverage)})\n\n`;
  md += `**4. Evidence Confidence:** ${r.conf.total} (${r.conf.band}). Reproduced ${r.conf.components.reproduced.points}/35, sources ${r.conf.components.sourceQuality.points}/20, recency ${r.conf.components.recency.points}/15, corroboration ${r.conf.components.corroboration.points}/15, completeness ${r.conf.components.completeness.points}/15\n\n`;
  md += `**5. Priority tier:** ${r.pr.tier}. ${r.pr.reason}\n\n`;
  md += `**6. Verified, fixable findings:**\n\n`;
  const vf = [...verifiedFixable(r), ...friction(r).filter(f => f.severity !== 'low')];
  if (!vf.length) md += `- None verified.\n`;
  for (const f of vf) md += `- **${f.title}** (${f.findingId}; ${f.status}${f.reproduced ? ', reproduced' : ', single observation'}; confidence ${f.confidence}). ${f.description} Evidence: ${f.evidencePath ? '`' + f.evidencePath + '`' : 'n/a'}.${f.reproductionSteps ? ' Reproduce: ' + f.reproductionSteps : ''}${f.unresolved ? ' Open question: ' + f.unresolved : ''}\n`;
  md += `\n**7. Competitor comparison highlights:**\n\n`;
  if (comp) {
    md += `Compared with the nearest audited competitors in ${r.co.county} County: ${comp.competitors.map(c => `${c.name} (${c.distanceMi} mi)`).join(', ')}.\n\n`;
    if (comp.gaps.length) for (const g of comp.gaps) md += `- ${g.dimension}: prospect = ${g.prospect}; better at ${g.competitorsBetter.join(', ')}\n`;
    else md += `- No dimension where at least two of the three competitors were measurably ahead.\n`;
  } else md += `- Not compared.\n`;
  md += `\n**8. Commercial value hypothesis (unverified):** ${m.valueHypothesis || 'Not written. Requires review.'}\n\n`;
  md += `**9. Recommended TruLynk solution:** ${m.recommendedSolution || 'See data/hvac_opportunity_scores.csv'}\n\n`;
  md += `**10. Requires client verification:**\n\n${rcv(r).map(f => `- ${f.title}${f.unresolved ? ' (' + f.unresolved + ')' : ''}`).join('\n') || '- Nothing listed'}\n\n`;
  md += `**11. Suggested outreach angle:** ${m.outreachAngle || 'Not written. Requires review.'}\n\n`;
  md += `**12. Research sources:**\n\n${sources(r).map(s => '- ' + s).join('\n')}\n\n`;
});
await fs.writeFile(path.join(ROOT, 'pass_1_top_10.md'), md);

// ---------------- Research queue ----------------
const queue = scored.filter(r => r.pr.tier === 'C' || (r.pr.tier === 'B' && (r.conf.total < 75 || r.opp.coverage < 0.85)));
let q = `# TruLynk Pass 1: Research Queue\n\nGenerated ${today()}. These businesses show possible opportunity but the evidence is not strong enough for outreach. Each entry lists exactly what is missing.\n\n`;
q += `| Company | County | Tier | Opportunity (provisional) | Max possible | Coverage | Evidence Confidence |\n|---|---|---|---|---|---|---|\n`;
for (const r of queue) q += `| ${r.co.name} | ${r.co.county} | ${r.pr.tier} | ${r.opp.provisional ?? 'n/a'} | ${r.opp.maxPossible} | ${pct(r.opp.coverage)} | ${r.conf.total} |\n`;
q += '\n';
for (const r of queue) {
  const m = manual[r.co.id] || {};
  q += `## ${r.co.name} (${r.co.city}, ${r.co.county})\n\n${r.co.website}\n\nWhy queued: ${r.pr.reason}\n\nAdditional research needed:\n\n`;
  const needs = [];
  for (const [k, v] of Object.entries(r.opp.subcriteria)) if (!v.assessed) needs.push(`Assess ${k} (${v.max} pts): ${v.basis}`);
  for (const f of r.findings.filter(f => f.code === 'X-ACCESS-FAILURE')) needs.push(`Re-retrieve ${f.sourceUrl}: ${f.title}`);
  for (const f of r.findings.filter(f => f.status === 'Suggestive')) needs.push(`Resolve: ${f.title}. ${f.unresolved}`);
  for (const f of r.findings.filter(f => f.kind === 'defect' && f.status === 'Verified' && !f.reproduced)) needs.push(`Reproduce on a second method/date: ${f.title}`);
  if (!r.co.decisionMaker) needs.push('Identify owner/decision-maker (official site did not name one; check LinkedIn/NJ business records)');
  for (const n of m.researchNeeds || []) needs.push(n);
  q += needs.map(n => `- ${n}`).join('\n') + '\n\n';
}
await fs.writeFile(path.join(ROOT, 'pass_1_research_queue.md'), q);

// ---------------- Summary ----------------
const county = k => scored.filter(r => r.co.county === k).length;
const tiers = ['A', 'B', 'C', 'D'].map(t => [t, scored.filter(r => r.pr.tier === t).length]);
const withVerifiedDefect = scored.filter(r => verifiedFixable(r).some(f => ['high', 'medium'].includes(f.severity)));
const highConf = scored.filter(r => r.conf.total >= 75);
const codeCounts = {};
for (const r of scored) for (const c of new Set(r.findings.filter(f => ['defect', 'friction', 'opportunity'].includes(f.kind)).map(f => f.code))) codeCounts[c] = (codeCounts[c] || 0) + 1;
const titleFor = c => (scored.flatMap(r => r.findings).find(f => f.code === c) || {}).title?.replace(/\(.*$/, '').replace(/:.*$/, '') || c;
const credits = usage.reduce((a, u) => a + (Number(u.creditsUsed) || 0), 0);
const excludedCount = screening.filter(l => l.includes(',excluded,')).length;
let s = `# TruLynk Pass 1: Executive Summary\n\nGenerated ${today()}. Scope: independent HVAC businesses in Hudson, Bergen, Passaic and Essex counties, NJ.\n\n`;
s += `## Results\n\n| Metric | Value |\n|---|---|\n`;
s += `| Verified businesses screened in final set | ${scored.length} |\n| County distribution | Hudson ${county('Hudson')}, Bergen ${county('Bergen')}, Passaic ${county('Passaic')}, Essex ${county('Essex')} |\n`;
s += `| With a directly verified fixable defect (medium/high) | ${withVerifiedDefect.length} |\n| With high-confidence evidence (Evidence Confidence >= 75) | ${highConf.length} |\n`;
s += `| Priority A (contact-ready) | ${tiers[0][1]} |\n| Priority B (research-ready) | ${tiers[1][1]} |\n| Priority C (unverified hypothesis, research queue) | ${tiers[2][1]} |\n| Priority D (defer) | ${tiers[3][1]} |\n`;
s += `| Requiring further research (research queue) | ${queue.length} |\n| Google Maps places reviewed in discovery | ${(await fs.readdir(path.join(ROOT, 'data/raw/maps_search'))).length} queries, ${screening.length} unique places |\n| Places excluded at screening (with reasons) | ${excludedCount} (see data/screening_log.csv) |\n| Firecrawl credits used (logged) | ${credits} across ${usage.length} calls |\n\n`;
s += `## Most common findings across the ${scored.length} businesses\n\n| Finding | Businesses |\n|---|---|\n`;
for (const [c, n] of Object.entries(codeCounts).sort((a, b) => b[1] - a[1]).slice(0, 14)) s += `| ${titleFor(c)} (\`${c}\`) | ${n} |\n`;
s += `\nCodes starting with \`O-\` are operational opportunities that require client verification. They are inferred from what is not visible on the website, not from knowledge of internal systems.\n\n`;
s += `## Strongest five prospects\n\n`;
scored.filter(r => ['A', 'B'].includes(r.pr.tier)).slice(0, 5).forEach((r, i) => {
  const vf = verifiedFixable(r)[0] || friction(r)[0];
  s += `${i + 1}. **${r.co.name}** (${r.co.city}, ${r.co.county}): Tier ${r.pr.tier}, Opportunity ${r.opp.provisional}, Confidence ${r.conf.total}. ${vf ? vf.title : ''}\n`;
});
s += `\n## Tier distribution by county\n\n| County | A | B | C | D |\n|---|---|---|---|---|\n`;
for (const k of ['Hudson', 'Bergen', 'Passaic', 'Essex']) s += `| ${k} | ${['A', 'B', 'C', 'D'].map(t => scored.filter(r => r.co.county === k && r.pr.tier === t).length).join(' | ')} |\n`;
await fs.writeFile(path.join(ROOT, 'pass_1_summary.md'), s + (await fs.readFile(path.join(ROOT, 'config/summary_tail.md'), 'utf8').catch(() => '')));
console.log(`top10 ${top.length}, queue ${queue.length}, credits ${credits}`);
