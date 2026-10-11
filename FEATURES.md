# Feature matrix: v86 (old) → 2.0 → 2.1 → 2.2

Every feature of the old site was inventoried (F01–F37) and carried over. Nothing was removed. "Broken" means it existed in the code but did not work for visitors.

| # | Feature | Old v86 | New 2.0 |
|---|---|---|---|
| F01 | Brand header | Dark banner, embedded logo | New logo and mark, sticky header that turns solid on scroll, mobile menu |
| F02 | Advertising disclosure | Box with sponsorship contact | Kept, in the footer and on `/legal/` |
| F03 | Profile chips (24) | Emoji chips | 25 profiles (new: Coastal living) with drawn icons, live map preview on hover |
| F04 | Profile intro line | Text | Profile banner with plain-language description |
| F05 | Run ranking, Map, Search | Run button required | Ranking updates instantly; no Run step |
| F06 | Guided profile builder | Broken (reset, hidden) | Restored: all legacy questions, all 35 target countries, fine-tune sliders, radar against the closest profile, shareable link |
| F07 | Country selector | Yes | Yes, plus search jumps across countries |
| F08 | Region selector, large-country split | Custom split for some countries | Official NUTS regions for all countries (France by NUTS1), Swiss regions kept |
| F09 | Local area selector | Cantons and areas | Cantons and NUTS3 areas |
| F10 | Map layer selector | Yes | Yes, plus every category as a layer |
| F11 | Minimum confidence filter | Yes | Yes, plus filters for residents, distance to a city, airport and the sea |
| F12 | KPI strip | Never updated (bug) | Replaced by a live results header and depth note |
| F13 | Audit / access note | Stale text | Depth note per country, method page, `?method=v1` for audit |
| F14 | Municipality map | Slow, Swiss outlines only on demand | MapLibre vector map, Swiss municipalities and European areas instantly, official GISCO boundaries on demand, dark mode |
| F15 | Language / regional reality panel | Yes | Regional reality tab (languages, student hubs, cross-border) |
| F16 | Cross-border catchments | Yes | Yes |
| F17 | Photo shortlist | Re-rendered on every click | Top picks with photos, or a drawn map postcard when no photo exists |
| F18 | Ranking list | Yes | Fast list with sub-rank chips, six sort orders |
| F19 | Definition tooltips | Yes | Yes, as small explainer pop-ups |
| F20 | Selection sync | Partly broken | Map, list, place panel and URL stay in sync; back button works |
| F21 | Place profile panel | Partly broken | Rebuilt: score ring, category bars, radar, trends, getting around, comparables, breakdown |
| F22 | Wikipedia context | Yes | Yes, matched by official municipal code first |
| F23 | Commons photos | Yes | Yes |
| F24 | Coats of arms and flags | Emoji flags | Real flag images for all 35 countries, coats of arms shown when found |
| F25 | Nearby sights | Yes | Yes |
| F26 | Contacts via Wikidata | Dormant (never shown) | Working: website, email, phone, socials |
| F27 | Commons gallery | Dormant | Working |
| F28 | Company / jobs cards | Dormant | Working |
| F29 | Booklet / PDF export | Broken (script error) | Working booklet page, print layout |
| F30 | Legal footer | Yes | Footer plus a full `/legal/` page (imprint, privacy, terms, advertising) |
| F31 | Scoring engine | 10 patch layers overriding each other | One engine; legacy method reproduced exactly (49/49 fixtures) and available as `?method=v1` |
| F32 | Access proxies | Random fallbacks | Deterministic distances to airports, cities and the sea |
| F33 | Language areas | Yes | Yes, wording corrected |
| F34 | Curated texts | Yes | Yes |
| F35 | Responsive layout | No mobile layout | Built for phones first: tab bar, bottom sheet, safe areas, 44 px touch targets |
| F36 | Misc runtime | Infinite loop in `refresh()` | Removed; zero JavaScript errors across all tested flows |
| F37 | Leaked JavaScript text below the footer | Visible to visitors | Gone |

## New in 2.2

| Area | What you get |
|---|---|
| Shortlist | One list for saving and comparing: labelled buttons, a count in the header and the phone tab bar, ticks that survive a reload, a choice when a fourth place is ticked, undo |
| Navigation | The back button works like in any app; the start screen honours country and household |
| Scope | 197 greater areas, a 10/25/50 km radius around any place, whole cities for district-split capitals |
| Factors | Daylight and sunset through the year, landscape, sea name, greater area; live everyday-life counts (OpenStreetMap) and regional statistics (Eurostat) |
| Data quality | Estuaries are not sea; finer coastline; big-city distance fixed where countries publish districts |
| Legal | Terms of use, report a problem, accessibility, EU/UK representative section, full storage list |
| App | Installable, shortcuts, service worker, offline page |
| Search engines | 185 greater-area pages, a profiles overview, place highlights, country-aware links |

## New in 2.1

| Area | What you get |
|---|---|
| Parameters | Terrain height and height range, climate type, nearest large lake, major river, railway line, motorway, seaport, capital, land border (with the country), neighbours and residents within 10 km, look-alikes in other countries |
| Place page | Why-card (three reasons, one watch-out), eight fact tiles, tabs (Overview, Photos, Facts, Around, Compare), the good / not-so-good / unusual / interesting / nice to know |
| Live content | Photos with author and licence, full-screen viewer, notable places nearby with UNESCO badge, monthly weather, Wikidata facts (altitude, postcode, founding, sister towns, mayor) |
| Save | Hearts on cards and rows, notes, tick to compare, share list as a link, CSV |
| Compare | Up to three places, photos, grouped rows, verdicts, remove a column, share the comparison |
| Home | Set where you live now; every place shows the differences |
| Discovery | Records of the current scope, surprise me, higher-or-lower game, tools drawer, five-step tour |
| Filters and map | Railway, motorway, lake, border, residents within 10 km, terrain, climate; ten new map layers; four new sort orders; "why not the others?" list |

## New in 2.0

- Cinematic home page: 99,578 places drawn as points of light, recoloured live by profile.
- Global search over every place, region and country, with exonyms (Genf, Vienna, Kobenhavn) and Greek and Cyrillic names.
- Shortlist and side-by-side compare.
- Shareable links for every view (country, region, profile, filters, selected place, custom weights).
- 5,474 static pages for search engines: every country, region, Swiss municipality and European town over 30,000 residents, plus "best places for" pages per profile, with structured data and a sitemap.
- Dark mode, keyboard shortcuts (`/` search, Esc close), reduced-motion support, accessible labels.
- Consent banner for Google Analytics (Consent Mode v2, nothing stored until the visitor agrees).
- Installable web app manifest and icons, ready for a later app launch.
