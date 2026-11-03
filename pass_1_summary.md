# TruLynk Pass 1: Executive Summary

Generated 2026-11-03. Scope: independent HVAC businesses in Hudson, Bergen, Passaic and Essex counties, NJ.

## Results

| Metric | Value |
|---|---|
| Verified businesses screened in final set | 50 |
| County distribution | Hudson 12, Bergen 13, Passaic 12, Essex 13 |
| With a directly verified fixable defect (medium/high) | 14 |
| Evidence Confidence >= 75 (all) | 35 |
| ...of which also have a verified medium/high defect | 10 (the rest are well-documented results with no material defect) |
| Priority A (contact-ready) | 0 |
| Priority B (research-ready) | 3 |
| Priority C (unverified hypothesis, research queue) | 8 |
| Priority D (defer) | 39 |
| Requiring further research (research queue) | 12 |
| Discovery | 71 Google Maps queries, 754 unique places |
| Excluded by rule before listing check (no website, franchise, supplier, throwaway domain, duplicate...) | 374 |
| Passed pre-screen but listing not checked (enough candidates already) | 236 |
| Excluded after listing check / manual review (closed, out of area, no address, not residential HVAC...) | 37 |
| Eligible after verification | 107 (top 12-13 per county by search prominence selected) |
| Firecrawl credits used (logged) | 17 across 13 calls |

Per-place reasons: `data/screening_log.csv`.

## Most common findings across the 50 businesses

| Finding | Businesses |
|---|---|
| No review-request tool visible (`O-NO-REVIEW-REQUEST-TOOL`) | 42 |
| No chat/text widget visible (`O-NO-TEXT-OR-CHAT`) | 40 |
| No online scheduling tool visible (`O-NO-ONLINE-SCHEDULING`) | 33 |
| Financing/testimonials/service-area not found on crawled pages (`F-TRUST-CONTENT-GAPS`) | 32 |
| Web-form leads: routing/follow-up candidate (`O-FORM-LEAD-ROUTING`) | 32 |
| Maintenance plan: renewal automation candidate (`O-MAINTENANCE-PLAN-AUTOMATION`) | 18 |
| Site phone links omit the Google listing number (`B-PHONE-INCONSISTENT`) | 10 |
| No web form or online booking on crawled pages (`F-NO-FORM-OR-BOOKING`) | 9 |
| Broken internal/navigation link (reproduced 404/5xx) (`A-BROKEN-LINK`) | 6 |
| No call button on first mobile screen (`F-NO-MOBILE-CALL-ABOVE-FOLD`) | 6 |
| HTTP does not redirect to HTTPS (`A-NO-HTTPS-REDIRECT`) | 5 |
| No call/book action on first mobile screen (`F-NO-MOBILE-CTA`) | 5 |
| Website on Google listing returns a server error (`A-LISTING-WEBSITE-ERROR`) | 3 |
| Mobile page wider than screen (`A-MOBILE-OVERFLOW`) | 3 |

Codes starting with `O-` are operational opportunities that require client verification. They are inferred from what is not visible on the website, not from knowledge of internal systems.

## Strongest five prospects

1. **Cool Air New Jersey** (Jersey City, Hudson): Priority B, Opportunity 88, Confidence 89. Strongest verified finding: Call-to-action button(s) do nothing when clicked: "Contact Us", "Appointment", "Get A Quote"
2. **Air Plus hvac** (West Orange, Essex): Priority B, Opportunity 83, Confidence 78. Strongest verified finding: Click-to-call button dials (973) 652-2424, a number not shown on the site or Google listing (button reads (973) 521-5028)
3. **ALL WEEK MECHANICAL GROUP AIR CONDITIONING** (Clifton, Passaic): Priority B, Opportunity 71, Confidence 97. Strongest verified finding: Broken service-page link: allweekairconditioning.com/heating-clifton-nj (HTTP 404)
4. **DeAire Heating & Cooling** (North Bergen, Hudson): Priority C (research queue, not sales-ready), Opportunity n/a (coverage 56%), Confidence 67. Strongest verified finding: Website linked from the Google listing is an empty Google Sites page (title banner only)
5. **ArcticFlow HVAC Repair Union City** (Union City, Hudson): Priority C (research queue, not sales-ready), Opportunity n/a (coverage 56%), Confidence 65. Strongest verified finding: Website link on the Google listing returns HTTP 503

## Tier distribution by county

| County | A | B | C | D |
|---|---|---|---|---|
| Hudson | 0 | 1 | 3 | 8 |
| Bergen | 0 | 0 | 1 | 12 |
| Passaic | 0 | 1 | 1 | 10 |
| Essex | 0 | 1 | 3 | 9 |

## How to read the scores

Every company has two independent numbers. **Opportunity** is how much fixable, commercially relevant friction was found. **Evidence Confidence** is how well the documentation supports the central finding. A company with no defects can have very high confidence (the clean result is well documented) and still be Priority D. A company whose site is down has a strong verified defect but low coverage, so it sits in the research queue until its operating status and capacity are confirmed.

Provisional Opportunity = confirmed points / assessed weight. It is withheld when less than 60% of the weight could be assessed. All sub-criterion scores, and which were unassessed and why, are in `data/hvac_opportunity_scores.csv` (`scoring_basis` column).

## Research limitations

- **Google review counts were not retrievable.** Logged-out Google Maps served a "limited view" that hides review counts and the "Claim this business" prompt. Google Search returned its "unusual traffic" CAPTCHA, which was not bypassed. A Firecrawl test on one listing returned nothing and cost 5 credits. Review volume (10 of 25 economic points) and listing-claim status (2 points) are therefore **unassessed for every company**, not scored as zero. Ratings were retrieved.
- **Scoring changes made after the first scoring run** (each applied to all 50 companies, each tested, all documented in `docs/METHODOLOGY.md`):
  - The Priority A economic gate changed from an absolute 12/25 to 50% of assessable economic points, because of the review-count gap above.
  - The Priority A coverage gate changed from 85% to 80% for the same reason.
  - Low-severity defects are capped at 6 points so that piles of trivial broken links (e.g. ten testimonial pages) cannot max out the fixable criterion.
  - Broken-link severity was narrowed: only booking/contact-type CTAs are high, nav and service pages are medium.
  - A tel-link mismatch that still dials the business's listing number is medium, not high.
  - Gateway-class errors (502/503/504) contradicted by a successful Firecrawl retrieval are access failures, not findings.
  - An unresolved identity/market conflict blocks Priority A.
  - Effect on tiers, stated plainly: the first scoring run gave 0 A / 7 B / 8 C / 35 D. Normalizing the economic gate by itself raised Cool Air New Jersey to Priority A. Reading its site during QA then surfaced the New York market conflict, and the identity-conflict rule returned it to B. The severity recalibrations lowered several B companies to D. Final: 0 A / 3 B / 8 C / 39 D. Scores are never hand-edited. Tier logic is in `scripts/lib/scoring.mjs`.
- **Cloudflare challenges cannot be completed from this environment.** The egress proxy rejects `challenges.cloudflare.com`, so Cloudflare-protected sites were retrieved via Firecrawl only (partial audit, research queue).
- **Crawl depth.** Each site was checked on homepage, contact, about and booking pages, plus up to 60 internal links. Content gaps ("financing not found") mean not found on those pages only.
- **Forms were never submitted, and no calls were made.** Whether form leads arrive, how fast calls are answered, and whether tracking numbers forward correctly are all unverified and labelled Requires Client Verification.
- **No organic or geo-grid rank tracking.** "Search visibility" is presence in 71 recorded Google Maps queries (query text, date and top-20 results stored in `data/raw/maps_search/`). It is not a ranking claim.
- **Customer review text was not analysed,** so workmanship and service-delivery problems (TruLynk Category C) were not assessed for any company.
- **Decision-makers** come only from statements on official websites (5 found). LinkedIn (requires login), NJ business registry and ad libraries were not checked.
- **Independence** was judged from names, listings and site statements ("not a franchise", family-owned). Ownership records were not checked.
- **Load times** are single lab measurements from a datacenter connection without throttling.
- **BBB** corroboration used search-result cards only (25 matches by phone or name+city). Profile pages did not render reliably.
- An early full-concurrency run crashed Chromium. The affected companies were re-audited. A crawler bug that skipped contact/booking pages when an empty-href "Contact" button existed was found during QA, fixed, and the 21 affected companies were re-audited.

## Recommended next steps (Pass 2, not started)

1. For Priority B prospects, confirm the open questions listed in `pass_1_top_10.md` (market served, owner, which phone number is live) before any outreach.
2. For research-queue companies with sites down, confirm the business is operating (listing activity, BBB, phone check by a person) and gather capacity evidence.
3. Obtain Google review counts from a logged-in or API source (e.g. Google Places API with an authorised key) and rerun `build_master.mjs`. Review-volume points are currently unassessed for everyone.
4. Re-verify every cited defect within 7 days of any outreach. Websites change, and the recency component of Evidence Confidence decays.
5. Extend the crawl to service pages and run a mobile click test for CTAs.
