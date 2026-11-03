# trulynk-hvac-intelligence

Prospect research for TruLynk ("Fix the broken links in your business"): independent HVAC companies in Hudson, Bergen, Passaic and Essex counties, NJ, screened for verified, fixable customer-facing problems.

## Pass 1 deliverables

| File | Contents |
|---|---|
| `pass_1_summary.md` | Executive summary, counts, limitations, next steps |
| `pass_1_top_10.md` | Ten strongest entries with evidence, competitor comparison, recommended fix |
| `pass_1_research_queue.md` | Promising but under-evidenced companies and exactly what to research next |
| `data/hvac_master_prospects.csv` | 50 businesses: identity, contacts, phones (classified), findings, scores |
| `data/hvac_opportunity_scores.csv` | Opportunity (confirmed / unassessed / max / coverage / provisional), Evidence Confidence, tier, per-criterion basis |
| `data/research_evidence.csv` | Every source retrieval and finding: URL, screenshot, date, method, reproduction steps, status, confidence |
| `data/competitor_comparison.csv` | Top 10 vs three nearest audited competitors each |
| `data/screening_log.csv` | All 754 discovered places with inclusion/exclusion reason |
| `data/qa_recheck.csv` | Later re-retrieval of every material claim |
| `evidence/screenshots/<company>/` | Desktop, mobile, listing, broken-page, click-test and Firecrawl screenshots |
| `logs/firecrawl_usage.jsonl` | Every Firecrawl call with credits |
| `docs/METHODOLOGY.md` | Pipeline, rules, scoring definitions, gate changes |

## Rerun

```
npm test                                   # unit tests (no dependencies; uses the environment's global Playwright)
node scripts/build_master.mjs              # rebuild scores/CSVs from raw evidence + config/manual_review.json
node scripts/competitors.mjs 10 && node scripts/write_reports.mjs
```

The full pipeline order is in `docs/METHODOLOGY.md`. The environment validation from before Pass 1 is in `env-validation/`.
