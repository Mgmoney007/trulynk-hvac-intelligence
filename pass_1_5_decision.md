# Pass 1.5: Commercial Validation

Date: 2026-11-04. Scope: the three Pass 1 Priority B prospects plus five companies whose websites were down, empty or parked. Goal: pick the three best candidates for sales-ready audits. Pass 1 scores are unchanged. This pass adds a separate **sales readiness** judgement.

Sales readiness levels:
- **Proposal-ready:** business verified active, defect verified with real customer consequence, repairable without a rebuild, reachable contact.
- **Exploratory:** defect verified, but business, market or buyer unverified. One short qualifying call, no proposal.
- **Verify first:** do not contact yet.
- **Exclude:** not a target.

## Decision table

| Company | Operating status | Strongest customer-facing defect | Consequence | Repair feasibility | Buyer contact | Evidence conf. (Pass 1) | Readiness | Recommended first offer |
|---|---|---|---|---|---|---|---|---|
| **A&C Quality Air** (Clifton) | **Verified active.** NJ LLC since 2010; Angi 4.9 (134 reviews, "20 years"); Birdeye claimed, 35 reviews, latest Oct 19, 2026 | Google listing's Website link opens a GoDaddy "Coming Soon" page (desktop + mobile) | High | High: domain already owned (registered Aug 2026); small new site, nothing to tear down | Business phone (201) 988-8313 verified on 3 sources. **Owner not named** | 82 | Proposal-ready | Fixed-price launch of the site the listing already points to: 5 pages, tap-to-call, request form to SMS/email, pull in their 4.9 rating |
| **All Week Mechanical / All Week Plumbing & Heating** (Garfield HQ, Clifton listing) | **Verified active.** BBB A+ accredited since 2013, started 1978; Google owner post Sep 5, 2026; 8 listings | 10 reproduced 404 pages ("Services", "Residential", "Commercial", local service pages) | Low-Medium: not in header nav or above the fold; phone and forms work | High: redirect map / restore pages | **Named:** James Murray and Mike Aburoumi (Owners), Ozzie Aburoumi (Manager), per BBB. Probable active NJ Master HVACR licensees Mahmoud A. and Ismat A. Aburoumi | 97 | Proposal-ready (modest defect) | Free broken-page report + paid redirect fix, then monthly link/uptime monitoring across their 2 sites and 8 listings |
| **Cool Air New Jersey** (Jersey City) | **Unverified.** No NJ entity under the name; directory shows 1 Google review; listing ticks every owner-identity attribute | Hero "Appointment", "Contact Us", "Get A Quote" do nothing on desktop **and mobile**; no request form on any page; no tap-to-call on the mobile first screen | High | High: fix 3 links, add a hosted form (static site) | info@coolairnewjersey.com, (201) 744-2020. Owner not named | 89 | Exploratory | One call: confirm they serve Hudson County and who owns the site; if yes, a quick-fix package (working buttons + form + 404s) |
| **Air Plus HVAC** (West Orange) | **Unverified.** Domain 7 months old; no third-party footprint; entity match unconfirmed | Secondary "CALL" buttons dial (973) 652-2424, a number published nowhere | Medium: the header number above the fold dials correctly | Trivial (GoDaddy builder) | Gmail address, phones. Owner not named | 78 | Exploratory | Ask which number is monitored; offer a same-day phone-link and form fix |
| Master AC & Heating (Kearny) | Unverified. Site down, no footprint | WordPress "critical error" on entire site | High if operating | Medium: needs host access | Phone only | 65 | Verify first | None until activity is confirmed |
| DeAire Heating & Cooling (North Bergen) | Unverified (DE AIRE LLC, 2022, plausible) | Website is an empty Google Sites page | High if operating | High | 786 phone only | 67 | Verify first | None. Another vendor has already built a demo site for them |
| ArcticFlow HVAC Repair Union City | Likely a lead-generation listing | Netlify site paused | n/a | n/a | n/a | 65 | Exclude | None |
| Precision HVAC Repair Caldwell | Likely a lead-generation listing | Netlify site paused | n/a | n/a | n/a | 65 | Exclude | None |

ArcticFlow and Precision have keyword names. Their domains were registered a week apart (Dec 2025) on the same registrar and DNS, and both sites are paused on Netlify. No matching NJ entity was found.

## Selection for sales-ready audits

1. **A&C Quality Air.** The clearest case: an established, active business with real demand, whose Google listing sends visitors to an empty page. It is the simplest fix of the eight. **Missing: owner name.**
2. **All Week Mechanical.** Verified active and the only prospect with named decision-makers. The defect is real but modest, so lead with a low-cost fix. **Watch:** at 48 years with 8 listings it may be larger than the 3-20 technician target, and another vendor has already built a demo site for them.
3. **Cool Air New Jersey, conditional.** It has the most serious customer-facing defect found in Pass 1, but the business is unverified. Do a qualifying call before the audit. If it fails, substitute Air Plus HVAC (same condition).

Only two companies met every proposal-ready condition. The third slot is conditional, not proven.

## What is still unverified

- No test calls were made, so no phone number is confirmed answered. Air Plus's 652-2424 line is untested.
- Owner names for A&C Quality Air, Cool Air and Air Plus were not found on official sites, the state register, domain records or web search.
- The All Week owner-to-license links are surname matches; "Mike" = Mahmoud is an inference.
- The state name search does not show entity status (active/revoked). Dates are formation dates only.
- Google review counts remain unavailable from Google itself. A&C's review counts come from Angi and Birdeye.

## Sources and files

- `data/pass_1_5_validation.csv`: per-company evidence and source URLs.
- `data/pass_1_5_defect_consequences.csv`: prominence, viewport, alternative contact, reproducibility and repair scope for each defect.
- Raw records:
  - `data/raw/nj_business/` (NJ Division of Revenue name search)
  - `data/raw/nj_license/` (NJ HVACR license register)
  - `data/raw/rdap/` (domain registration)
  - `data/raw/listing_activity/` (Google listing panels)
  - `data/raw/pass15_profiles/` (Birdeye)
- BBB and Angi were retrieved via Firecrawl (10 credits, logged in `logs/firecrawl_usage.jsonl`).
