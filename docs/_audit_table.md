The reviewer had never seen the project. They used the site as a first-time visitor on desktop, on a phone and in dark mode, and recorded every network request for the privacy part. After the fixes, the same reviewer checked everything again.

| # | Finding | Severity | Fixed how | Re-audit |
|---|---|---|---|---|
| 1 | Most dot-map pins outside Switzerland linked to "#" | Major | Every pin links to its place page or to the place on the map, the same address as the list (2,632 pins on 274 pages checked) | Fixed |
| 2 | France: pin numbers did not match the list (#3 lies in French Guiana) | Major | Pins carry the real rank; ranks outside the map are named in the caption | Fixed |
| 3 | The policy said outside services are asked "only when you open a place" | Major | The text now says what happens: lookups for the places shown, starting when the map or a place is shown | Fixed |
| 4 | No way to change the privacy choice from the desktop map | Major | "Privacy settings" and "Imprint and privacy" in Tools; focus goes into the choice | Fixed |
| 5 | No pins on Jura and Åland | Minor | By design: no place there passes the young-family profile; the caption now says so | Explained |
| 6 | Pins overlapping around Berlin and in Norway | Minor | Pins that would overlap move aside with a thin line to their place; no two pins overlap anywhere | Fixed |
| 7 | Switching live content off did not stop lookups already running | Minor | Every outside request goes through one gate that checks the switch | Fixed |
| 8 | The residents chart exaggerated growth (bars did not start at zero) | Minor | Bars start at zero, and the change is stated in words | Fixed |
| 9 | Meilen's intro leaves out Lottery winner | Polish | By design (niche profiles are left out of that sentence); your confirmation is an open item | Explained |
| 10 | Density did not equal residents ÷ area | Polish | Shown for the same year everywhere | Fixed |
| 11 | The cookie table listed Google consent-dialog cookies that never appear | Polish | Removed in the privacy-first build | Fixed |
| 12 | Postcode search not available | Polish | Unchanged, with a clear message; open item | Open |
| 13 | Re-audit: focus stayed on the Tools button after "Privacy settings" | Minor | Focus moves into the banner | Fixed |
| 14 | Re-audit: legal page date not updated | Polish | Updated to 11 October 2026 | Fixed |
| — | Found by me in the same round: country residents counted superseded duplicates (Norway 10.8 instead of 5.6 million) | Major | Totals count each place once; Europe now 545 million | Fixed |
| — | Found by me: "Imprint and privacy" and "How scores work" in the single file tried to leave the app | Minor | They open inside the single file | Fixed |
