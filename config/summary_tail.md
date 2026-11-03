
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
