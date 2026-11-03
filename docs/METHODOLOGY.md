# Pass 1 Methodology

How the Pass 1 data was produced, so it can be rerun and audited. All scripts are in `scripts/`. Raw evidence is in `data/raw/` and `evidence/screenshots/`.

## Pipeline

| Step | Script | Output |
|---|---|---|
| 1. Discovery | `discover_maps.mjs search config/maps_queries*.json` | `data/raw/maps_search/*.json` (query, date, method, top ~20 listing cards) |
| 2. Pool + flags | `build_candidates.mjs` | `data/interim/candidates_all.json` (deduped by Google place ID) |
| 3. Pre-screen | `select_for_verification.mjs` | `data/interim/prescreen.json`, `config/places_to_verify.json` |
| 4. Listing verification | `discover_maps.mjs place config/places_to_verify.json` | `data/raw/maps_place/<id>.json` + listing screenshot |
| 5. Site audit | `audit_site.mjs <set.json>` | `data/raw/audits/<id>.json` + `evidence/screenshots/<id>/` |
| 6. Fallback | Firecrawl MCP for each entry in `data/raw/firecrawl_queue.jsonl`, then `firecrawl_ingest.mjs` | merged into audit, logged in `logs/firecrawl_usage.jsonl` |
| 7. BBB corroboration | `bbb_lookup.mjs` | `data/raw/bbb/<id>.json` |
| 8. Final selection | `select_final.mjs final` | `config/selected_companies.json`, `data/screening_log.csv` |
| 9. Score | `build_master.mjs` | the three CSVs in `data/`, `data/interim/scored.json` |
| 10. Competitors | `competitors.mjs 10` | `data/competitor_comparison.csv` |
| 11. Reports | `write_reports.mjs` | `pass_1_*.md` |
| 12. QA recheck | `qa_recheck.mjs` | `data/qa_recheck.csv` (later re-retrieval of every material claim; curl used when Node fetch disagrees) |
| (supporting) | `cta_click_test.mjs`, `review_owners.mjs`, `bbb_items.mjs`, `firecrawl_log.mjs` | click test merge, owner-candidate review, BBB inputs, usage log |

Unit tests: `npm test` (phone normalization, malformed tel detection, scoring arithmetic, tier gates, unassessed-is-not-zero, address parsing).

## Phase 0 tooling validation

Tested on five Clifton/Passaic County HVAC sites (EZ Flow Mechanical, Pacific Air HVAC, R Traupmann HVAC, Slick Temp, Blueray Heating and Cooling) before the full run. Problems found and fixed during validation:

- A SiteGround "Please wait while your request is being verified" interstitial returned HTTP 200 and was initially treated as the real page. Detection now covers this pattern, waits 8s for JS challenges to clear (as they would for a person), and treats near-empty 200 pages with no links as `suspect_interstitial`.
- A decorative full-screen fixed layer was counted as a 100% "blocking overlay". Only cookie/chat/popup overlays now count.
- Firecrawl revealed a `tel:tel:+1...` link on Blueray that the phone normalizer silently accepted. A structural `telHrefProblem` check was added with tests. The defect was then reproduced by Playwright too.
- Forced re-audits overwrote ingested Firecrawl records, and re-ingesting double-counted credits. Both fixed (records preserved; usage log deduplicated by scrape ID).

## Rules that protect data integrity

- **Access failures are not defects.** Challenges, timeouts, DNS/tunnel failures and 403/429 responses are recorded as `X-ACCESS-FAILURE` and queued for Firecrawl. A broken link counts only when Node fetch returns 404/410/5xx and a fresh browser navigation reproduces it.
- **Overlays are hidden, never dismissed.** No consent button is clicked. The as-is screenshot is always kept, and a second screenshot with cookie/chat/popup layers hidden by CSS is taken for readability.
- **No form submission, booking, or call.** Forms are inspected structurally (fields, submit button, CAPTCHA error text) only.
- **CTA click test.** Visible call-to-action links with an empty or `#` href are clicked once on desktop (nothing is submitted). If the element or its ancestors carry click listeners, `onclick`, action data-attributes or known popup/widget classes, the result is "script-handled (not testable)" and never reported as dead. Only "no visible effect" or "jumped to page top with no form" counts as a dead CTA. This rule was added after LiveSite and Popup Maker buttons produced false positives during QA.
- **Site down vs blocked.** A homepage 404/410/5xx is a defect only if a second network (Firecrawl) does not contradict it. A gateway-class 502/503/504 that Firecrawl retrieves fine is an access failure. Cloudflare challenge pages cannot complete from this environment (the proxy rejects `challenges.cloudflare.com`), so they are always access failures.
- **Phones.** Every observed number is normalized to E.164 and classified: `published_primary` (on the Google listing, schema markup or BBB), `likely_call_tracking` (appears in one browser session but not the other), `possible_call_tracking` (not anchored, call-tracking script present), `published_secondary`.
- **Unavailable is not zero.** Each scoring sub-criterion is either assessed (points from evidence) or unassessed (weight reported separately). The provisional score is confirmed points divided by assessed weight, and is withheld below 60% coverage.

## Discovery and screening rules

Queries: 53 "HVAC contractor <town> NJ" queries across the four counties, plus 18 service-category queries (AC repair, heating repair, boiler repair, furnace replacement, installation, emergency heating, county-wide). Rate: one Google request every ~7s.

Excluded at pre-screen (logged per place in `data/screening_log.csv`): no website; non-HVAC category; national franchise/brand; supplier/store/duct-cleaning/appliance categories; throwaway or non-business domains (`.shop`, `.online`, `.site`, lovable.app, dot.cards, Instagram/Facebook as website); duplicate listings of the same website (one kept).

Excluded after listing verification: permanently/temporarily closed; listing address outside the four counties; no public street address (county cannot be verified); no Google rating; town-keyword listings (e.g. "<Service> <Town>") without a street address, a common pattern of lead-generation listings.

County is assigned from the municipality in the verified Google listing address using `config/nj_municipalities.json`.

## Scoring

### Opportunity Score (0-100)

| Criterion | Weight | Sub-criteria (points) |
|---|---|---|
| Fixable problems | 30 | First high-severity defect 24, further high 6, medium 10 each, low 3 each (at most 6 in total), cap 30. Suggestive defects earn half. |
| Economic value | 25 | Google review volume 10 (unassessed: Google hides counts in this environment), tenure 5, install/replacement services 5, scale signals 5 (hiring, team size claim, maintenance plan, multi-trade) |
| Conversion friction | 20 | Desktop 12: verified conversion-path defect 10, no tap-to-call 6, no form/booking 6, trust content gaps up to 3. Mobile 8: no call above fold 4, no CTA above fold 3, blocking overlay 4, slow load 2. A verified site-down/empty website scores the maximum (the site cannot be used). |
| Automation potential | 10 | No online scheduling 3, no chat/text 2, form leads 2, maintenance plan 2, no review tool 1. All Requires Client Verification. |
| Buyer accessibility | 10 | Named owner on official site 4 (unassessed if not found), independent operator 3, phone 1 + published email 2 |
| Reputation/search | 5 | Rating below 4.5 (2) or below 4.7 (1), under 50 reviews 1, "Claim this business" shown 2 (unassessed in Google's limited view). Organic ranking is not measured and not scored. |

**Defect severity.**
- Broken links: booking/contact/estimate/quote/request CTAs and external booking links are high; primary navigation and core service pages (judged on URL path or link text, never the domain) are medium; anything else is low.
- Tap-to-call: a link that dials a number appearing nowhere on the site or listing is high; one that dials the listing/schema number while showing another is medium; one hidden from users is low.
- Site state: a parked, empty or server-error website on the Google listing is high.

### Evidence Confidence (0-100)

| Component | Weight | Rule |
|---|---|---|
| Reproduced and documented | 35 | Severity-weighted share of material findings that are Verified + reproduced + screenshotted (1.0), Verified + screenshot (0.8), Verified only (0.6), Suggestive (0.35). With no material findings, it reflects audit completeness. |
| Source quality | 20 | Official site desktop 10, mobile 4, Google listing 4, Firecrawl second retrieval 2, BBB match 2 (cap 20) |
| Recency | 15 | Oldest evidence within 7 days 15, 30 days 12, 90 days 8 |
| Corroboration | 15 | Site phone equals Google listing phone 5, listing city appears on site 5, top defect reproduced by a second method 5, BBB match 5 (cap 15) |
| Completeness/consistency | 15 | Coverage (desktop 3, mobile 3, contact page 1.5, link check 1.5) + 6 minus 3 per unresolved conflict |

### Priority tiers

- **A:** all of the following:
  - provisional Opportunity >= 75
  - coverage >= 80%
  - Evidence Confidence >= 75
  - at least one Verified medium/high fixable defect
  - economic points >= 50% of the assessable economic points
  - phone plus (named owner or published email)
  - no unresolved identity/market conflict
- **B:** Opportunity >= 55 and Confidence >= 60.
- **C:** Opportunity >= 55 with Confidence < 60, or coverage below 60% (no provisional score).
- **D:** Opportunity < 55, excluded, or no observable operating-capacity signal (tenure >= 5 yrs, scale signal, review volume or BBB record).

The research queue holds all C companies, B companies with open evidence gaps or conflicts, and D companies deferred only for capacity that nonetheless have a verified high-severity defect.

**Gate changes made after the first scoring run** (documented in `pass_1_summary.md`):
- The coverage gate moved from 85% to 80%, and the economic gate from an absolute 12/25 to 50% of assessable points. The reason was that Google review counts (10 economic points) and claim status (2 points) cannot be retrieved for anyone in this environment.
- The identity-conflict gate was added after QA found Cool Air New Jersey's site targets New York City.

Ranking: tier, then provisional Opportunity, then Confidence. Scores are never adjusted by hand.
