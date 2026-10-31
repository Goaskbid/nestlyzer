---
title: "Nestlyzer 2.3: the newcomer audit, a new logo and a safer release"
subtitle: "Four independent first-time-user audits, fixes for the robustness gaps, a calmer phone layout, privacy that matches the text, and a one-paste GitHub update"
date: "11 October 2026"
---

# In short

**Four independent audits, each from a first-time visitor's point of view.**

- Before the work started, three reviewers used Nestlyzer like newcomers: one on desktop, one on phone, one on the search-engine pages, legal texts and the single file.
- After the fixes, a fourth reviewer, who had seen none of the work, went through every journey again.
- Everything they found is fixed. There is one exception: French overseas places are still in France's ranking. They are now labelled "(overseas)" instead of removed, because removing them would narrow a working feature. That needs your OK first (see open items).

**Robustness.**

- Switching country quickly no longer breaks the app.
- Places from another country can be removed from the shortlist, with Undo.
- The Back button closes whatever is open (search, menu, filters, tools, a picture, a window) before it leaves a page.
- Bad links get a clear message instead of an empty page.

**Phone.**

- The profile is now one pill that opens a grouped picker.
- The header and tab bars slide away while you scroll.
- Inputs no longer make the phone zoom in, and every tap target is at least 44 px.
- The filter sheet sits on top, has a handle, and closes with a tap outside or with Back.
- Holding the phone sideways leaves room for the list again.

**A new logo:** a navy map pin holding a white egg in a yellow nest. It replaces the plain mark in the header, the app icons, the favicon and the share image.

**Privacy now does what the text says.**

- Google Analytics is not even downloaded until a visitor presses "Accept all". A test checks this (R69).
- A new "Live content" switch turns off every outside service the app uses (Wikimedia, Wikidata, NASA, OpenStreetMap, Eurostat).
- There is a build switch for a "privacy-first" site with no Analytics and never personalised ads. You may want it while you have no EU or UK representative (section 5).

**Cleaner data.**

- 455 duplicate places from older data years are gone (Norway 391, Latvia 40, Belgium 13, Estonia 8, Iceland 3). Europe now has 99,538 places instead of 99,993.
- Portuguese parishes, Irish local electoral areas and Greek communities are called by their real names, not "municipalities".
- Greek place names are in the nominative ("Αθήνα", not "Αθηναίων").
- Records leave out overseas territories and values that cannot be right.

**GitHub.**

- The release is checked for anything GitHub or a Mac would trip over before it is packed.
- The zips carry the version in their name.
- One line pasted into Terminal empties the old repository (except `.git`) and unpacks the new site, with safety checks.
- Then one commit and one push.

# 1. Your question: what is the risk without an EU and UK representative?

The short answer: it is a real but modest legal risk, and you can make it much smaller.

**The rule.** GDPR Art. 27, and the same article in UK GDPR, apply to an operator outside the EU (or UK) that tracks the behaviour of people in the EU (or UK). That operator must name a representative there. Nestlyzer is run from Switzerland and, once a visitor accepts, uses Google Analytics and personalised ads. That is tracking in the sense of Art. 3(2)(b). The "occasional processing" exemption is hard to argue for a site that measures every visit.

**What can happen if you have none.**

- The fine for this breach falls in the lower tier: up to €10 million or 2% of worldwide turnover. That is the cap, not the usual amount.
- Real cases are rare, and they have hit companies that also ignored complaints. The best-known one is the Dutch authority fining Locatefamily.com €525,000 in 2021. That site published people's addresses and ignored the requests of the people concerned.
- No case is known against a small, compliant site whose only gap is the missing representative.
- In practice the risk works like this:
  - an unhappy visitor complains;
  - the authority finds no one in the EU to write to;
  - the missing representative becomes one more point against you.

  So the risk grows with complaints, not with traffic.
- An authority would have trouble enforcing a fine in Switzerland. It can still order the processing to stop and publish the decision.
- **Google:** the AdSense terms make you responsible for following the law. A breach is rarely enforced, but it can put the account at risk.

**Your three options.**

1. **Privacy-first mode (costs nothing, ready in the build).**
   - Set `NZ_PRIVACY=strict` when building.
   - Analytics is never loaded, and ads are never personalised for anyone.
   - With no behavioural tracking, Art. 3(2)(b) and Art. 27 very likely no longer apply.
   - Cost: no visitor statistics, and lower ad income.
2. **A person you trust in the EU and one in the UK**, each with a one-page written mandate. Their name and address go into the privacy policy. Send them to me and I fill in `NZ_EU_REP` and `NZ_UK_REP`.

3. **A paid service.** Prighter starts at about €35 a month per region, and GDPR Local at about £99 a month. Prices were checked in an earlier round and should be confirmed before you sign.

Until you choose, the privacy policy states the truth: there is no representative yet, and EU and UK visitors can write to Torsten Sauter directly and get an answer within a month.

This is not legal advice. Have a data-protection lawyer look at it once revenue matters.

# 2. What the newcomers ran into, and what changed

## Before the work: three audits

AUDIT_TABLE

## After the work: the fourth audit

The fourth reviewer had not seen any of the work. They found no blockers, 4 major and 6 minor issues, and a list of polish items. All were fixed and then checked again by the same reviewer: 13 of 14 fixed, plus the 14th labelled as described above.

| Finding | Fixed how |
|---|---|
| French overseas places (Kourou in French Guiana) shown as "best in Europe" on the /best/ pages | Left out of the "Across Europe" tables. In the France ranking they are labelled "(overseas)". |
| Phone: the shortlist bounced up and down without stopping | The bars only hide on long lists, and the bounce caused by their own movement is ignored |
| A fourth Compare tick stayed ticked after "Keep the three I have" | Every box now shows the real state |
| Desktop: Back with Filters open left the map | Back closes Filters first, on every screen size |
| Phone: Back from a place went to the Map, not the list you came from | Back returns to the list; a country change still goes to the map |
| Phone: Back with the menu open left the site | Back closes the menu |
| /method/ scrolled sideways on phones (a long web address) | Long links now wrap |
| Map layers without data in a country showed a grey map with no word of explanation | They are greyed out in the menu with "(no data in France)". If one is still chosen, the legend says why the map is grey. |
| Search did not return the keyboard focus | Focus goes back to the button you came from |
| "Share list" said "the same place" | It now says the other person can add these places to their shortlist |
| Long names on the top-pick cards ran out of the card; a heart sat under an arrow | Names end with "…", and the arrows have moved |
| Failed photos left a big empty grey box | Only the message and Try again |
| Undo put a removed place at the top | It goes back where it was |
| The empty-results note gave "1,000 residents" as an example while your filter was 40,000 | The example is only shown when it is the real reason |
| A population fall was listed as a plus ("the population shrank… main reason basics scores 97") | A fall is only ever a watch-out |
| Country pages said "Data depth foundation" | "Early indication", the same words as in the app |
| "Tap" on a computer | "Click" on a computer, "Tap" on a phone |
| Map pin numbers were not explained | The legend says "numbered pin: rank" |

# 3. What is new

## Phone and layout

- **Profile pill and picker.** One pill in the scope bar opens a sheet with the 25 profiles grouped as Families, Work and study, Later life, Budget and Lifestyle. On a computer, the chip row stays, and the arrow keys move between chips.
- **More room for the list.**
  - Header and tab bars slide away while you scroll and come back when you scroll up.
  - The bars hide while you type.
  - The scope panel closes after a choice.
- **Touch.**
  - Every tap target is at least 44 px.
  - Inputs are 16 px, so iPhones no longer zoom in.
  - Notch and home-bar areas are respected.
- **Sideways.** In landscape, the header and chip row step aside so the list has room. The place view is still tight there.
- **Lists.**
  - Each row shows three factor chips.
  - The selected row gets a navy accent and its factor detail. Other rows stay short.
  - Top picks show two whole cards with arrows.
- **Empty states always offer a way out.**
  - With every place filtered out, you get "Clear all filters" and "Whole country".
  - Coastal living in a landlocked country offers coastal countries.
- **Keyboard.** The focus ring shows only for keyboard users. Escape closes things in a fixed order.

## Logo

A navy map pin. Inside it sits a white egg in a yellow, woven nest. The dark-mode variant uses a lighter blue. Icons, favicon, app icons and the share image (with the new place count) were regenerated.

## Privacy and live content

- Google Analytics loads only after consent, through the site's own banner or Google's consent dialog.
- The "Live content" switch is in Tools and on the legal page.
- The legal texts now cover:
  - UK GDPR and the ICO;
  - Google's roles;
  - limited versus non-personalised ads;
  - the UK extension of the EU–US Data Privacy Framework;
  - the new switch;
  - the full list of stored settings.

## Search engines

- No two pages share a title (5,655 checked). Titles stay under 80 characters.
- Each profile page opens with its own plain-language description.
- Cross-border greater areas link to their home country's page.
- Search engines can offer a site search box (`/?q=`).
- Country pages carry a ranked list for search engines.

## Data

- 455 superseded duplicates removed (section "In short").
- City groups and alias names in search: "Athens" finds Αθήνα, "Saint-Gall" finds St. Gallen.
- Short searches rank big places first.
- A postcode search explains that postcodes are not searchable.

# 4. How it was checked

## Automatic tests

REGRESSION_TABLE

The unit tests also pass:

- 49 of 49 legacy score fixtures;
- 60 of 60 builder fixtures;
- all data checks, including the 455 superseded places.

New in 2.3:

| Test | What it checks |
|---|---|
| R65 | Phone sheets and the Back button: the profile picker, the filter sheet on top and usable, Back closes it, a tap outside closes it |
| R66 | A Swiss place is removed from the shortlist while exploring Germany; two quick country changes end in the last country |
| R67 | Records are real places in the country, with no broken numbers |
| R68 | With live content off, opening a place contacts no outside service |
| R69 | Google Analytics is not downloaded before Accept, and is downloaded once after it |
| R70 | All 5,655 pages have their own title; the profiles page is styled |

## Single file

STANDALONE

## The GitHub package

- **Three site zips** (12, 21 and 18 MB) and the source zip.
- **5,804 files** (5,803 files plus the new README.md), 183 MB in total. The largest is 7 MB.
- **Checked before packing:**
  - 0 paths that differ only in upper and lower case;
  - 0 awkward names;
  - 0 files over 50 MB;
  - 0 workflow folders;
  - the longest path is 122 bytes.
- **The one-paste Terminal line** was run in zsh (the Mac's shell) on a copy of an old repository:
  - it kept `.git`;
  - it removed the old files and the `.github` folder;
  - it unpacked the three zips and printed "Nestlyzer 2.3.0".
- **Its safety checks** were tested too. With no `.git`, or with only two zips, it stopped and deleted nothing.

# 5. Screenshots

SCREENSHOTS

# 6. Open items

**For you (Anton or Torsten)**

1. Push 2.3. The deploy guide covers it: one paste in Terminal, then one commit and one push in GitHub Desktop.

2. Choose for the EU and UK: privacy-first mode, a trusted person, or a paid representative (section 1).
3. French overseas places (Guadeloupe, Martinique, French Guiana, Réunion, Mayotte): keep them in France's ranking with the "(overseas)" label, or leave them out of the app's ranking like the /best/ pages do?

4. In AdSense: add the site, turn on the Google consent message for the EEA, UK and Switzerland, and turn on Auto ads (deploy guide).
5. In Google Analytics: set data retention to 14 months.

6. In Search Console: add nestlyzer.com and submit the sitemap.

**For me, next round**

1. The Swiss data is from 2021 (municipalities and portraits) and 2018 (tax burden). Refreshing it needs the current FSO and ESTV downloads, which cannot be reached from here.

2. Dark mode on the live basemap: check it once the site is live. The map tiles cannot be reached from here.
