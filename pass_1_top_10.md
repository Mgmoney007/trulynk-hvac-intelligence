# TruLynk Pass 1: Top 10 Opportunities

Generated 2026-11-03 from `data/interim/scored.json`. Ranking: Priority tier first, then provisional Opportunity Score, then Evidence Confidence.
Every finding below links to a finding ID in `data/research_evidence.csv` and a screenshot under `evidence/screenshots/`.

Tier mix in this list: 0 Priority A, 3 Priority B, 7 Priority C. Priority C entries are included only to fill the list and belong in the research queue, not the sales queue.

| # | Company | County | Tier | Opportunity (provisional) | Coverage | Evidence Confidence | Strongest verified finding |
|---|---|---|---|---|---|---|---|
| 1 | Cool Air New Jersey | Hudson | B | 88 | 81% | 89 (High) | Call-to-action button(s) do nothing when clicked: "Contact Us", "Appointment", "Get A Quote" |
| 2 | Air Plus hvac | Essex | B | 83 | 76% | 78 (High) | Click-to-call button dials (973) 652-2424, a number not shown on the site or Google listing (button reads (973) 521-5028) |
| 3 | ALL WEEK MECHANICAL GROUP AIR CONDITIONING | Passaic | B | 71 | 76% | 97 (Very High) | Broken service-page link: allweekairconditioning.com/heating-clifton-nj (HTTP 404) |
| 4 | DeAire Heating & Cooling | Hudson | C | n/a | 56% | 67 (Moderate) | Website linked from the Google listing is an empty Google Sites page (title banner only) |
| 5 | ArcticFlow HVAC Repair Union City | Hudson | C | n/a | 56% | 65 (Moderate) | Website link on the Google listing returns HTTP 503 |
| 6 | Master AC & Heating | Hudson | C | n/a | 56% | 65 (Moderate) | Website link on the Google listing returns HTTP 500 |
| 7 | Precision HVAC Repair Caldwell | Essex | C | n/a | 56% | 65 (Moderate) | Website link on the Google listing returns HTTP 503 |
| 8 | Total Comfort Services LLC | Bergen | C | n/a | 21% | 39 (Very Low) | None |
| 9 | Master Group Heating, Cooling & Plumbing | Passaic | C | n/a | 21% | 27 (Very Low) | None |
| 10 | Premier HVAC Services | Essex | C | n/a | 21% | 27 (Very Low) | None |

---

## 1. Cool Air New Jersey

**1. Location:** 2327 John F. Kennedy Blvd 3rd floor, Jersey City, NJ 07304 (Hudson County)

**2. Website:** http://coolairnewjersey.com/

**3. Opportunity Score:** 88 provisional (confirmed 71 pts of 81 assessed; 19 pts unassessed; max possible 90; coverage 81%)

**4. Evidence Confidence:** 89 (High). Reproduced 32.1/35, sources 18/20, recency 15/15, corroboration 15/15, completeness 9/15

**5. Priority tier:** B. Not A because: unresolved identity/market conflict

**6. Verified, fixable findings:**

- **Call-to-action button(s) do nothing when clicked: "Contact Us", "Appointment", "Get A Quote"** (cool-air-new-jersey--A-DEAD-CTA; Verified, reproduced; confidence 90). Visible button link(s) with an empty or "#" href. Click results: "Contact Us" -> no visible effect; "Appointment" -> no visible effect; "Get A Quote" -> jumped to page top (no form shown). No navigation, dialog or form appeared. Evidence: `evidence/screenshots/cool-air-new-jersey/cta-click-1.png`. Reproduce: Open http://coolairnewjersey.com/ on desktop and click "Contact Us" / "Appointment" / "Get A Quote". Open question: Behaviour on mobile and with other browsers not tested.
- **Broken navigation link: coolairnewjersey.com/Service.html (HTTP 404)** (cool-air-new-jersey--A-BROKEN-LINK; Verified, reproduced; confidence 90). Link "SERVICE" on home, contact, about, booking leads to HTTP 404. Evidence: `evidence/screenshots/cool-air-new-jersey/broken-1.png`. Reproduce: Open http://coolairnewjersey.com/, follow the link to http://coolairnewjersey.com/Service.html; page returns 404.
- **Broken service-page link: coolairnewjersey.com/AC-repair-service-and-Installation.html (HTTP 404)** (cool-air-new-jersey--A-BROKEN-LINK-2; Verified, reproduced; confidence 90). Link "AC Repair & Professional Installation" on home, about leads to HTTP 404. Evidence: `evidence/screenshots/cool-air-new-jersey/broken-2.png`. Reproduce: Open http://coolairnewjersey.com/, follow the link to http://coolairnewjersey.com/AC-repair-service-and-Installation.html; page returns 404.
- **Broken service-page link: coolairnewjersey.com/website/index.html (HTTP 404)** (cool-air-new-jersey--A-BROKEN-LINK-3; Verified, reproduced; confidence 90). Link "Heating & Cooling" on home, contact, about, booking leads to HTTP 404. Evidence: `evidence/screenshots/cool-air-new-jersey/broken-3.png`. Reproduce: Open http://coolairnewjersey.com/, follow the link to http://coolairnewjersey.com/website/index.html; page returns 404.
- **Website copy targets New York City/Manhattan/Brooklyn instead of the New Jersey service area** (cool-air-new-jersey--A-WRONG-MARKET-COPY; Verified, reproduced; confidence 90). Homepage: "We Are New York's Leading PTAC Repair Providers... serving the residents of New York City", "Professional AC Installation in New York", "AC Emergency Services NYC and Surrounding Areas Manhattan Brooklyn". About page claims 'Diamond Certified' and 'over 30 years' while the homepage says '10+ years' and 'over 15 years'. Evidence: `evidence/screenshots/cool-air-new-jersey/desktop-home-full.png`. Reproduce: Open http://coolairnewjersey.com/ and read the 'Reliable HVAC Services' block and service sections. Open question: Whether the business serves NYC as well as Hudson County.
- **HTTP version of site does not redirect to HTTPS** (cool-air-new-jersey--A-NO-HTTPS-REDIRECT; Verified, single observation; confidence 60). http://coolairnewjersey.com/ served content without redirecting (final URL http://coolairnewjersey.com/). Evidence: n/a.
- **No web form or online booking found on homepage, contact, or booking pages** (cool-air-new-jersey--F-NO-FORM-OR-BOOKING; Verified, single observation; confidence 75). Pages checked: http://coolairnewjersey.com/, http://coolairnewjersey.com/contact.html, http://coolairnewjersey.com/about.html, http://coolairnewjersey.com/appointment.html Evidence: `evidence/screenshots/cool-air-new-jersey/desktop-contact.png`. Open question: Forms on other pages were not checked.
- **No tap-to-call button visible on first mobile screen** (cool-air-new-jersey--F-NO-MOBILE-CALL-ABOVE-FOLD; Verified, single observation; confidence 75). On a 390x664 iPhone 13 viewport, no tel: link is visible before scrolling. Evidence: `evidence/screenshots/cool-air-new-jersey/mobile-home.png`.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Hudson County: Bargotti Co. Plumbing & Hvac (1.2 mi), Royal Heating Corporation (1.3 mi), Aeromark Mechanical Inc (2.1 mi).

- Call button on first mobile screen: prospect = false; better at Bargotti Co. Plumbing & Hvac (true), Royal Heating Corporation (true)
- Web request form: prospect = false; better at Bargotti Co. Plumbing & Hvac (true), Royal Heating Corporation (true), Aeromark Mechanical Inc (true)
- NJ HVACR license shown: prospect = false; better at Bargotti Co. Plumbing & Hvac (true), Royal Heating Corporation (true), Aeromark Mechanical Inc (true)
- Reproduced broken links: prospect = 3; better at Bargotti Co. Plumbing & Hvac (0), Royal Heating Corporation (0), Aeromark Mechanical Inc (0)
- Appearances in recorded Maps queries: prospect = 3; better at Bargotti Co. Plumbing & Hvac (4), Royal Heating Corporation (6)

**8. Commercial value hypothesis (unverified):** Every website route to a written inquiry is broken. The hero 'Contact Us', 'Appointment' and 'Get A Quote' buttons have empty links and do nothing when clicked, and the contact and appointment pages contain no form. Visitors who will not phone have no way to reach the business online. The 'Service', 'AC Repair & Installation' and 'Heating & Cooling' pages return 404. If Cool Air serves Hudson County homeowners, NYC-focused copy may also misdirect local visitors. Traffic, lead volume and revenue impact are unknown.

**9. Recommended TruLynk solution:** Connect the hero buttons to a short service-request form that routes to email/SMS with an automatic acknowledgement. Restore or redirect the three 404 service pages. Add a sticky mobile call bar (no call button on the first mobile screen today). Rewrite location copy for the towns actually served. Force HTTPS.

**10. Requires client verification:**

- No online scheduling or field-service booking tool detected on site (Which dispatch/scheduling system (if any) the business uses.)
- No web chat or text-messaging widget detected (How missed calls and after-hours inquiries are handled today.)
- Maintenance plan/membership offered: renewal and reminder automation candidate (How renewals and tune-up reminders are managed today.)
- No review-request tool detected on site (Review requests may be sent from back-office software not visible on the website.)

**11. Suggested outreach angle:** Open with the dead 'Appointment' button and the 404 'Service' page (screenshots, reproducible in seconds). Ask which area they serve before raising the New York copy. Make no revenue claims.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Cool+Air+New+Jersey/data=!4m7!3m6!1s0x89c251c93e12af17:0x7b9199aac9c5eed6!8m2!3d40.7179131!4d-74.0797011!16s%2Fg%2F11kp9d0z49!19sChIJF68SPslRwokR1u7FyaqZkXs (retrieved 2026-11-03)
- Official website: http://coolairnewjersey.com/
- Site page: http://coolairnewjersey.com/contact.html
- Site page: http://coolairnewjersey.com/about.html
- Site page: http://coolairnewjersey.com/appointment.html

---

## 2. Air Plus hvac

**1. Location:** 18 Beech Rd, West Orange, NJ 07052 (Essex County)

**2. Website:** https://airplusnj.com/

**3. Opportunity Score:** 83 provisional (confirmed 63 pts of 76 assessed; 24 pts unassessed; max possible 87; coverage 76%)

**4. Evidence Confidence:** 78 (High). Reproduced 29/35, sources 18/20, recency 15/15, corroboration 5/15, completeness 10.5/15

**5. Priority tier:** B. Not A because: coverage 76% < 80%

**6. Verified, fixable findings:**

- **Click-to-call button dials (973) 652-2424, a number not shown on the site or Google listing (button reads (973) 521-5028)** (air-plus-hvac--A-TEL-MISMATCH; Verified, reproduced; confidence 90). Link text "CALL (973) 521-5028" but href "tel:9736522424". Seen on: desktop, mobile. Visible to users on: desktop, mobile. Evidence: `evidence/screenshots/air-plus-hvac/desktop-home.png`. Reproduce: On https://airplusnj.com/, inspect the link labelled "CALL (973) 521-5028". Open question: Whether the dialed number is a tracking/forwarding line that reaches the business; not tested by calling.
- **Click-to-call button dials (973) 652-2424, a number not shown on the site or Google listing (button reads (973) 521-5028)** (air-plus-hvac--A-TEL-MISMATCH-2; Verified, reproduced; confidence 90). Link text "CALL NOW (973) 521-5028" but href "tel:9736522424". Seen on: desktop, mobile. Visible to users on: desktop, mobile. Evidence: `evidence/screenshots/air-plus-hvac/desktop-home.png`. Reproduce: On https://airplusnj.com/, inspect the link labelled "CALL NOW (973) 521-5028". Open question: Whether the dialed number is a tracking/forwarding line that reaches the business; not tested by calling.
- **No web form or online booking found on homepage, contact, or booking pages** (air-plus-hvac--F-NO-FORM-OR-BOOKING; Verified, single observation; confidence 75). Pages checked: https://airplusnj.com/ Evidence: `evidence/screenshots/air-plus-hvac/desktop-home-full.png`. Open question: Forms on other pages were not checked.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Essex County: AC & Heat by Kyle (3.4 mi), Newmans Heating & Air Conditioning (5.2 mi), Lincoln Mechanical Corporation (5.3 mi).

- Web request form: prospect = false; better at AC & Heat by Kyle (true), Newmans Heating & Air Conditioning (true)
- Financing mentioned: prospect = false; better at Newmans Heating & Air Conditioning (true), Lincoln Mechanical Corporation (true)
- Testimonials/reviews on site: prospect = false; better at AC & Heat by Kyle (true), Lincoln Mechanical Corporation (true)
- Service-page links from homepage: prospect = 0; better at AC & Heat by Kyle (11), Newmans Heating & Air Conditioning (17), Lincoln Mechanical Corporation (16)
- Appearances in recorded Maps queries: prospect = 4; better at AC & Heat by Kyle (10), Newmans Heating & Air Conditioning (7), Lincoln Mechanical Corporation (5)

**8. Commercial value hypothesis (unverified):** Three phone numbers are in circulation: the Google listing (973) 521-2708, the number printed on the site (973) 521-5028, and the number the 'CALL' buttons actually dial, (973) 652-2424, which appears nowhere else. If 652-2424 is not answered by the business, callers from the website are lost. The only other inquiry path is a mailto: link to a Gmail address. Impact is unverified until the business confirms which line is monitored.

**9. Recommended TruLynk solution:** Use one tracked business number consistently across the Google listing, site text and every tel: link. Replace the mailto 'Get a Quote' with a request form routed to CRM/SMS. Build real service pages (the SERVICES/HEATING/COOLING/PLUMBING navigation items are '#' anchors).

**10. Requires client verification:**

- Website phone links do not include the Google listing phone (May be deliberate (call tracking, separate lines). Confirm which number customers should use.)
- No online scheduling or field-service booking tool detected on site (Which dispatch/scheduling system (if any) the business uses.)
- No web chat or text-messaging widget detected (How missed calls and after-hours inquiries are handled today.)
- Maintenance plan/membership offered: renewal and reminder automation candidate (How renewals and tune-up reminders are managed today.)
- No review-request tool detected on site (Review requests may be sent from back-office software not visible on the website.)

**11. Suggested outreach angle:** Ask one factual question: which number should customers call? Show the button markup dialing 652-2424. Do not place test calls without the business's agreement.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Air+Plus+hvac/data=!4m7!3m6!1s0x89c3ab7a37ea35a3:0xa9868378d005151f!8m2!3d40.7639944!4d-74.2946321!16s%2Fg%2F11z6zz9plr!19sChIJozXqN3qrw4kRHxUF0HiDhqk (retrieved 2026-11-03)
- Official website: https://airplusnj.com/

---

## 3. ALL WEEK MECHANICAL GROUP AIR CONDITIONING

**1. Location:** 184 Clinton Ave, Clifton, NJ 07011 (Passaic County)

**2. Website:** https://allweekairconditioning.com/ac-repairs-clifton-nj

**3. Opportunity Score:** 71 provisional (confirmed 54 pts of 76 assessed; 24 pts unassessed; max possible 78; coverage 76%)

**4. Evidence Confidence:** 97 (Very High). Reproduced 34.3/35, sources 18/20, recency 15/15, corroboration 15/15, completeness 15/15

**5. Priority tier:** B. Not A because: opportunity 71 < 75; no clear route to decision-maker; coverage 76% < 80%

**6. Verified, fixable findings:**

- **Broken service-page link: allweekairconditioning.com/heating-clifton-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-3; Verified, reproduced; confidence 90). Link "Local heating repair services" on home leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-3.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/heating-clifton-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/boiler-repairs-clifton-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-4; Verified, reproduced; confidence 90). Link "Local boiler repair services" on home leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-4.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/boiler-repairs-clifton-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/furnace-repairs-clifton-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-5; Verified, reproduced; confidence 90). Link "Local furnace repair services" on home leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-5.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/furnace-repairs-clifton-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/oil-to-gas-conversion-heating-clifton-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-6; Verified, reproduced; confidence 90). Link "Local Oil to Gas Conversion services" on home leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-6.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/oil-to-gas-conversion-heating-clifton-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/air-conditioning-service-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-7; Verified, reproduced; confidence 90). Link "Services" on home, contact, about, booking leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-7.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/air-conditioning-service-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/residential-air-conditioning-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-8; Verified, reproduced; confidence 90). Link "Residential" on home, contact, about, booking leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-8.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/residential-air-conditioning-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/commercial-air-conditioning-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-9; Verified, reproduced; confidence 90). Link "Commercial" on home, contact, about, booking leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-9.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/commercial-air-conditioning-nj; page returns 404.
- **Broken service-page link: allweekairconditioning.com/air-conditioning-north-nj.html (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-10; Verified, reproduced; confidence 90). Link on contact leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-10.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/air-conditioning-north-nj.html; page returns 404.
- **Broken internal link: allweekairconditioning.com/testimonials-hvac-company-reviews-nj (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK; Verified, reproduced; confidence 90). Link "Reviews" on home, contact, about, booking leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-1.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/testimonials-hvac-company-reviews-nj; page returns 404.
- **Broken internal link: allweekairconditioning.com/Clifton%20NJ (HTTP 404)** (all-week-mechanical-group-air-conditioning-2--A-BROKEN-LINK-2; Verified, reproduced; confidence 90). Link "City official site" on home, home leads to HTTP 404. Evidence: `evidence/screenshots/all-week-mechanical-group-air-conditioning-2/broken-2.png`. Reproduce: Open https://allweekairconditioning.com/ac-repairs-clifton-nj, follow the link to https://allweekairconditioning.com/Clifton%20NJ; page returns 404.
- **HTTP version of site does not redirect to HTTPS** (all-week-mechanical-group-air-conditioning-2--A-NO-HTTPS-REDIRECT; Verified, single observation; confidence 60). http://allweekairconditioning.com/ served content without redirecting (final URL http://allweekairconditioning.com/). Evidence: n/a.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Passaic County: EZ Flow Mechanical Heating & Cooling (0.3 mi), A&C Quality Air (0.4 mi), Pacific Air HVAC (0.5 mi).

- Reproduced broken links: prospect = 10; better at EZ Flow Mechanical Heating & Cooling (0), A&C Quality Air (0), Pacific Air HVAC (0)

**8. Commercial value hypothesis (unverified):** The top-navigation 'Services', 'Residential' and 'Commercial' links, plus the local heating, boiler, furnace and oil-to-gas pages, all return 404. Visitors researching a specific service hit dead ends, while the request forms themselves load. Eight Google listings across Hudson, Bergen, Passaic and Essex link to this website, each with a different local phone number, so the dead pages are reached from many entry points. Traffic and lead impact are unknown.

**9. Recommended TruLynk solution:** Restore or 301-redirect the 10 dead URLs. Add automated weekly link monitoring with alerts. Force HTTPS. Then confirm where the existing web-form leads go and add instant acknowledgement and CRM routing (current handling unknown).

**10. Requires client verification:**

- No online scheduling or field-service booking tool detected on site (Which dispatch/scheduling system (if any) the business uses.)
- No web chat or text-messaging widget detected (How missed calls and after-hours inquiries are handled today.)
- Web form leads present: routing, acknowledgement and follow-up automation candidate (Where form submissions go and how fast they are answered.)
- Maintenance plan/membership offered: renewal and reminder automation candidate (How renewals and tune-up reminders are managed today.)
- No review-request tool detected on site (Review requests may be sent from back-office software not visible on the website.)

**11. Suggested outreach angle:** Send the dead-URL list with screenshots. First identify a decision-maker: the site names nobody and publishes no email. Use the main office line.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/ALL+WEEK+MECHANICAL+GROUP+AIR+CONDITIONING/data=!4m7!3m6!1s0x89c2fec21ffc2af3:0xc0bdf448b6a9343f!8m2!3d40.8718979!4d-74.1460265!16s%2Fg%2F1s04wq1xk!19sChIJ8yr8H8L-wokRPzSptkj0vcA (retrieved 2026-11-03)
- Official website: https://allweekairconditioning.com/ac-repairs-clifton-nj
- Site page: https://allweekairconditioning.com/contact-us
- Site page: https://allweekairconditioning.com/about-us
- Site page: https://allweekairconditioning.com/get-free-quote

---

## 4. DeAire Heating & Cooling

**1. Location:** 1214 67th St, North Bergen, NJ 07047 (Hudson County)

**2. Website:** http://deaireheatingandcooling.com/

**3. Opportunity Score:** n/a provisional (confirmed 48 pts of 56 assessed; 44 pts unassessed; max possible 92; coverage 56%)

**4. Evidence Confidence:** 67 (Moderate). Reproduced 35/35, sources 6/20, recency 15/15, corroboration 5/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 56% is too low for a provisional score

**6. Verified, fixable findings:**

- **Website linked from the Google listing is an empty Google Sites page (title banner only)** (deaire-heating-cooling--A-EMPTY-WEBSITE; Verified, reproduced; confidence 90). Homepage shows only the heading 'De Aire Heating & Cooling'. No phone number, services, contact form or links (Firecrawl found 0 links; headless Chromium saw near-empty text on desktop and mobile). Evidence: `evidence/screenshots/deaire-heating-cooling/firecrawl-desktop.png`. Reproduce: Open http://deaireheatingandcooling.com/ (the website on the Google Business Profile). Open question: Whether the business has another website.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Hudson County: Fred's Climate Control (0.1 mi), Jimmy's Arctic Heating & Air Conditioning Repair (3.3 mi), Bargotti Co. Plumbing & Hvac (5.2 mi).

- Tap-to-call links present: prospect = false; better at Fred's Climate Control (true), Jimmy's Arctic Heating & Air Conditioning Repair (true), Bargotti Co. Plumbing & Hvac (true)
- Web request form: prospect = false; better at Fred's Climate Control (true), Jimmy's Arctic Heating & Air Conditioning Repair (true), Bargotti Co. Plumbing & Hvac (true)
- NJ HVACR license shown: prospect = false; better at Fred's Climate Control (true), Bargotti Co. Plumbing & Hvac (true)
- Testimonials/reviews on site: prospect = false; better at Fred's Climate Control (true), Jimmy's Arctic Heating & Air Conditioning Repair (true), Bargotti Co. Plumbing & Hvac (true)
- Email published: prospect = false; better at Fred's Climate Control (true), Bargotti Co. Plumbing & Hvac (true)
- Service-page links from homepage: prospect = 0; better at Fred's Climate Control (7), Jimmy's Arctic Heating & Air Conditioning Repair (11), Bargotti Co. Plumbing & Hvac (9)
- Appearances in recorded Maps queries: prospect = 4; better at Fred's Climate Control (6), Jimmy's Arctic Heating & Air Conditioning Repair (8)

**8. Commercial value hypothesis (unverified):** The website on the Google listing is an empty Google Sites page showing only the business name. Anyone clicking 'Website' from Google finds no phone number, services or contact path. Whether the business is active and has capacity is not established.

**9. Recommended TruLynk solution:** A small site on the existing domain (tap-to-call, service list, request form, service area), linked from the listing.

**10. Requires client verification:**

- Nothing listed

**11. Suggested outreach angle:** Not ready for outreach. Confirm the business is operating first.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/DeAire+Heating+%26+Cooling/data=!4m7!3m6!1s0xad5f9f7ecc49bc6d:0x12751450786cffd8!8m2!3d40.7970363!4d-74.0182381!16s%2Fg%2F11src97v93!19sChIJbbxJzH6fX60R2P9seFAUdRI (retrieved 2026-11-03)
- Official website: http://deaireheatingandcooling.com/

---

## 5. ArcticFlow HVAC Repair Union City

**1. Location:** 508 39th St, Union City, NJ 07087 (Hudson County)

**2. Website:** https://arcticflowhvacunioncity.com/

**3. Opportunity Score:** n/a provisional (confirmed 48 pts of 56 assessed; 44 pts unassessed; max possible 92; coverage 56%)

**4. Evidence Confidence:** 65 (Moderate). Reproduced 35/35, sources 4/20, recency 15/15, corroboration 5/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 56% is too low for a provisional score

**6. Verified, fixable findings:**

- **Website link on the Google listing returns HTTP 503** (arcticflow-hvac-repair-union-city--A-LISTING-WEBSITE-ERROR; Verified, reproduced; confidence 90). The website URL published on the Google Business Profile (https://arcticflowhvacunioncity.com/) returned HTTP 503 in a desktop browser. Evidence: `evidence/screenshots/arcticflow-hvac-repair-union-city/desktop-home-access-failure.png`. Reproduce: Open https://arcticflowhvacunioncity.com/ in a browser.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Hudson County: Fred's Climate Control (1.6 mi), Jimmy's Arctic Heating & Air Conditioning Repair (1.9 mi), Bargotti Co. Plumbing & Hvac (3.7 mi).

- Tap-to-call links present: prospect = false; better at Fred's Climate Control (true), Jimmy's Arctic Heating & Air Conditioning Repair (true), Bargotti Co. Plumbing & Hvac (true)
- Web request form: prospect = false; better at Fred's Climate Control (true), Jimmy's Arctic Heating & Air Conditioning Repair (true), Bargotti Co. Plumbing & Hvac (true)
- NJ HVACR license shown: prospect = false; better at Fred's Climate Control (true), Bargotti Co. Plumbing & Hvac (true)
- Testimonials/reviews on site: prospect = false; better at Fred's Climate Control (true), Jimmy's Arctic Heating & Air Conditioning Repair (true), Bargotti Co. Plumbing & Hvac (true)
- Email published: prospect = false; better at Fred's Climate Control (true), Bargotti Co. Plumbing & Hvac (true)
- Service-page links from homepage: prospect = 0; better at Fred's Climate Control (7), Jimmy's Arctic Heating & Air Conditioning Repair (11), Bargotti Co. Plumbing & Hvac (9)

**8. Commercial value hypothesis (unverified):** The website returns 'Site not available' (hosting project paused), confirmed from two networks. If the business is real and active, every website visit from Google currently fails.

**9. Recommended TruLynk solution:** Restore hosting on a stable plan, add uptime monitoring.

**10. Requires client verification:**

- Nothing listed

**11. Suggested outreach angle:** Not ready for outreach. Entity not verified.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/ArcticFlow+HVAC+Repair+Union+City/data=!4m7!3m6!1s0x89c2592b8f241acb:0x21fcd39a8658623b!8m2!3d40.7760577!4d-74.0267401!16s%2Fg%2F11ytp1wqlb!19sChIJyxokjytZwokRO2JYhprT_CE (retrieved 2026-11-03)
- Official website: https://arcticflowhvacunioncity.com/

---

## 6. Master AC & Heating

**1. Location:** 206 Bergen Ave #214, Kearny, NJ 07032 (Hudson County)

**2. Website:** https://masterhvacsolutions.com/kearny-nj/

**3. Opportunity Score:** n/a provisional (confirmed 48 pts of 56 assessed; 44 pts unassessed; max possible 92; coverage 56%)

**4. Evidence Confidence:** 65 (Moderate). Reproduced 35/35, sources 4/20, recency 15/15, corroboration 5/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 56% is too low for a provisional score

**6. Verified, fixable findings:**

- **Website link on the Google listing returns HTTP 500** (master-ac-heating--A-LISTING-WEBSITE-ERROR; Verified, reproduced; confidence 90). The website URL published on the Google Business Profile (https://masterhvacsolutions.com/kearny-nj/) returned HTTP 500 in a desktop browser. Evidence: `evidence/screenshots/master-ac-heating/desktop-home-access-failure.png`. Reproduce: Open https://masterhvacsolutions.com/kearny-nj/ in a browser.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Hudson County: Andes HVAC Aire Acondicionado (1 mi), Cool Air New Jersey (4.6 mi), Bargotti Co. Plumbing & Hvac (4.6 mi).

- Tap-to-call links present: prospect = false; better at Andes HVAC Aire Acondicionado (true), Cool Air New Jersey (true), Bargotti Co. Plumbing & Hvac (true)
- Email published: prospect = false; better at Andes HVAC Aire Acondicionado (true), Cool Air New Jersey (true), Bargotti Co. Plumbing & Hvac (true)
- Service-page links from homepage: prospect = 0; better at Andes HVAC Aire Acondicionado (4), Cool Air New Jersey (39), Bargotti Co. Plumbing & Hvac (9)

**8. Commercial value hypothesis (unverified):** The entire website shows a WordPress 'There has been a critical error' page (HTTP 500), confirmed by Playwright, curl and Firecrawl from two networks at different times. Every visitor from the Google listing sees an error page.

**9. Recommended TruLynk solution:** Emergency WordPress repair (identify the failing plugin/theme, restore from backup), then uptime monitoring and managed updates.

**10. Requires client verification:**

- Nothing listed

**11. Suggested outreach angle:** Potentially time-sensitive. First confirm the business is active and who owns the site. The listing links a /kearny-nj/ location page, which suggests a multi-location site.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Master+AC+%26+Heating/data=!4m7!3m6!1s0x89c255c360c8a6ff:0xc1dfd05b594c2b30!8m2!3d40.7579133!4d-74.1490845!16s%2Fg%2F11t__k_qfz!19sChIJ_6bIYMNVwokRMCtMWVvQ38E (retrieved 2026-11-03)
- Official website: https://masterhvacsolutions.com/kearny-nj/

---

## 7. Precision HVAC Repair Caldwell

**1. Location:** 252 Bloomfield Ave, Caldwell, NJ 07006 (Essex County)

**2. Website:** https://precisionclimatecontrolcaldwell.com/

**3. Opportunity Score:** n/a provisional (confirmed 48 pts of 56 assessed; 44 pts unassessed; max possible 92; coverage 56%)

**4. Evidence Confidence:** 65 (Moderate). Reproduced 35/35, sources 4/20, recency 15/15, corroboration 5/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 56% is too low for a provisional score

**6. Verified, fixable findings:**

- **Website link on the Google listing returns HTTP 503** (precision-hvac-repair-caldwell--A-LISTING-WEBSITE-ERROR; Verified, reproduced; confidence 90). The website URL published on the Google Business Profile (https://precisionclimatecontrolcaldwell.com/) returned HTTP 503 in a desktop browser. Evidence: `evidence/screenshots/precision-hvac-repair-caldwell/desktop-home-access-failure.png`. Reproduce: Open https://precisionclimatecontrolcaldwell.com/ in a browser.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Essex County: Multitemp HVAC (0.4 mi), J&M Cooling and Heating (2.6 mi), MarGo Plumbing Heating Cooling Inc. (2.9 mi).

- Tap-to-call links present: prospect = false; better at J&M Cooling and Heating (true), MarGo Plumbing Heating Cooling Inc. (true)
- Web request form: prospect = false; better at J&M Cooling and Heating (true), MarGo Plumbing Heating Cooling Inc. (true)
- Financing mentioned: prospect = false; better at J&M Cooling and Heating (true), MarGo Plumbing Heating Cooling Inc. (true)
- NJ HVACR license shown: prospect = false; better at J&M Cooling and Heating (true), MarGo Plumbing Heating Cooling Inc. (true)
- Testimonials/reviews on site: prospect = false; better at J&M Cooling and Heating (true), MarGo Plumbing Heating Cooling Inc. (true)
- Service-page links from homepage: prospect = 0; better at Multitemp HVAC (1), J&M Cooling and Heating (19), MarGo Plumbing Heating Cooling Inc. (45)

**8. Commercial value hypothesis (unverified):** The website returns 'Site not available' (hosting project paused), confirmed from two networks. If the business is real, every website visit from Google fails.

**9. Recommended TruLynk solution:** Restore hosting, add uptime monitoring.

**10. Requires client verification:**

- Nothing listed

**11. Suggested outreach angle:** Not ready for outreach. Entity not verified.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Precision+HVAC+Repair+Caldwell/data=!4m7!3m6!1s0x89c301cd7a03fd19:0xf9f927cac7c3ad1a!8m2!3d40.8376375!4d-74.2740479!16s%2Fg%2F11msh_j443!19sChIJGf0Des0Bw4kRGq3Dx8on-fk (retrieved 2026-11-03)
- Official website: https://precisionclimatecontrolcaldwell.com/

---

## 8. Total Comfort Services LLC

**1. Location:** 20 Booker St, Westwood, NJ 07675 (Bergen County)

**2. Website:** https://www.totalcomfort.biz/?utm_source=gbp

**3. Opportunity Score:** n/a provisional (confirmed 9 pts of 21 assessed; 79 pts unassessed; max possible 88; coverage 21%)

**4. Evidence Confidence:** 39 (Very Low). Reproduced 12.3/35, sources 6/20, recency 15/15, corroboration 0/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 21% is too low for a provisional score

**6. Verified, fixable findings:**

- None verified.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Bergen County: Price Beat HVAC (3.5 mi), Yuhan Heating & Air Conditioning (4.2 mi), Muccia Plumbing, Heating & AC (5.7 mi).

- No dimension where at least two of the three competitors were measurably ahead.

**8. Commercial value hypothesis (unverified):** An established Bergen County HVAC/plumbing company on a marketing-agency site platform (Scorpion) with careers, financing, an online estimator and booking. The one notable signal, a 'noindex,nofollow' robots tag returned to Firecrawl, would keep the homepage out of search results if real, but could not be confirmed from a normal browser.

**9. Recommended TruLynk solution:** If confirmed: remove noindex and verify indexing in Search Console. Otherwise the website opportunity looks limited, since booking, financing and estimator tools are already present.

**10. Requires client verification:**

- Homepage returned meta robots 'noindex,nofollow' to Firecrawl's crawler (May be served only to non-browser crawlers; the research browser could not pass the site's Cloudflare challenge to confirm. Check Google Search Console / site: search.)

**11. Suggested outreach angle:** Not ready for outreach.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Total+Comfort+Services+LLC/data=!4m7!3m6!1s0x89c2e28093d9e54f:0xb4cc79ef44207a38!8m2!3d40.9841917!4d-74.0107484!16s%2Fg%2F1v5k3z1_!19sChIJT-XZk4DiwokROHogRO95zLQ (retrieved 2026-11-03)
- Official website: https://www.totalcomfort.biz/?utm_source=gbp

---

## 9. Master Group Heating, Cooling & Plumbing

**1. Location:** 730 Broad St, Clifton, NJ 07013 (Passaic County)

**2. Website:** https://www.mastergroupnj.com/

**3. Opportunity Score:** n/a provisional (confirmed 4 pts of 21 assessed; 79 pts unassessed; max possible 83; coverage 21%)

**4. Evidence Confidence:** 27 (Very Low). Reproduced 0/35, sources 6/20, recency 15/15, corroboration 0/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 21% is too low for a provisional score

**6. Verified, fixable findings:**

- None verified.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Passaic County: Acacos LLC HVAC & Air Conditioning Repair (0.4 mi), Pacific Air HVAC (1 mi), EZ Flow Mechanical Heating & Cooling (1 mi).

- No dimension where at least two of the three competitors were measurably ahead.

**8. Commercial value hypothesis (unverified):** A large, agency-built site (Scorpion) with service pages, maintenance plan, careers and county pages. No defects observable in the partial retrieval. Likely limited fixable website opportunity, and possibly above the 3-20 technician target.

**9. Recommended TruLynk solution:** None identified yet.

**10. Requires client verification:**

- Nothing listed

**11. Suggested outreach angle:** Not ready for outreach.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Master+Group+Heating,+Cooling+%26+Plumbing/data=!4m7!3m6!1s0x65d792b62e82c8a7:0xf3408e51f392255d!8m2!3d40.8706484!4d-74.1690894!16s%2Fg%2F11q95g4bq0!19sChIJp8iCLraS12URXSWS81GOQPM (retrieved 2026-11-03)
- Official website: https://www.mastergroupnj.com/

---

## 10. Premier HVAC Services

**1. Location:** 27 Union Ave, Nutley, NJ 07110 (Essex County)

**2. Website:** https://premier-hvac-services.com/

**3. Opportunity Score:** n/a provisional (confirmed 4 pts of 21 assessed; 79 pts unassessed; max possible 83; coverage 21%)

**4. Evidence Confidence:** 27 (Very Low). Reproduced 0/35, sources 6/20, recency 15/15, corroboration 0/15, completeness 6/15

**5. Priority tier:** C. Evidence coverage 21% is too low for a provisional score

**6. Verified, fixable findings:**

- None verified.

**7. Competitor comparison highlights:**

Compared with the nearest audited competitors in Essex County: Integrate Comfort Systems (1.2 mi), Go Green Heating & Air Conditioning (1.3 mi), HVAC ZONE INC (2.7 mi).

- Appearances in recorded Maps queries: prospect = 4; better at Go Green Heating & Air Conditioning (5), HVAC ZONE INC (6)

**8. Commercial value hypothesis (unverified):** A small operator on GoDaddy Website Builder with built-in booking (/m/bookings). Nothing defective in the Firecrawl retrieval. The research browser could not connect (TLS reset), so the site was not audited.

**9. Recommended TruLynk solution:** Unknown until audited.

**10. Requires client verification:**

- Nothing listed

**11. Suggested outreach angle:** Not ready for outreach.

**12. Research sources:**

- Google Maps listing: https://www.google.com/maps/place/Premier+HVAC+Services/data=!4m7!3m6!1s0x89c255766e37fa1d:0xb2e97777bcfa148e!8m2!3d40.8078907!4d-74.1525903!16s%2Fg%2F11v9_0bwxr!19sChIJHfo3bnZVwokRjhT6vHd36bI (retrieved 2026-11-03)
- Official website: https://premier-hvac-services.com/

