---
title: "Nestlyzer 2.1: first-time user audit and the expanded version"
subtitle: "What a newcomer ran into, what changed, and how it was checked"
date: "10 October 2026"
---

# In short

An independent reviewer used Nestlyzer like a first-time visitor, on a desktop and on a phone, and reported 24 problems: 1 critical, 10 major and 13 minor. 21 are fixed. 2 are improved as far as the current data allows. 1, rents and travel times, needs new data sources and is first on the list for the next stage.

On top of the fixes, 2.1 adds:

- 11 new parameters for every one of the 99,578 places;
- photos with credits, notable places nearby, the weather through the year and small local facts;
- place pages that open with the key facts and keep the details in tabs;
- saving with notes, comparing three places, setting a home;
- records, look-alikes in other countries, a game and a short guided tour.

All standard profile scores and rankings are unchanged. The new parameters are facts, filters and map layers. They only change a score if you use them in your own profile.

# 1. First-time user audit

## First ten seconds

On a desktop it was already clear what Nestlyzer is and what to do first. On a phone the start button was more than one screen down, and the consent banner arrived late and covered content.

## Findings and what was done

AUDIT_TABLE

# 2. What is new

## Eleven new parameters for every place

All of them are computed at build time from open data. Every place's Facts tab shows where it stands among all municipalities of its country.

| Parameter | Source |
|---|---|
| Terrain height around the place, height range within 15 km | Mapzen terrain grid (coarse: it describes the surroundings, not the village itself) |
| Climate type (Köppen-Geiger) | Rubel et al. 2017 |
| Nearest large lake and its name | Natural Earth 1:10m |
| Nearest major river and its name | Natural Earth 1:10m |
| Nearest main railway line | Natural Earth 1:10m |
| Nearest motorway | Natural Earth 1:10m |
| Nearest seaport and its name | Natural Earth 1:10m |
| Distance to the capital | Natural Earth 1:10m |
| Nearest land border and the country beyond it | Natural Earth 1:10m |
| Neighbouring municipalities and residents within 10 km | Nestlyzer's municipality centres |
| Look-alikes: the most similar place in three other countries | Computed from size, density, growth, terrain, water and surroundings |

Coverage is 99% or more in every country. The 1.7% of places without a published location have no geographic parameters.

## Live content on each place

These load in the browser from public services, cost nothing and never change a score:

- **Photos:** openly licensed pictures taken within a few kilometres, from Wikimedia Commons. Each photo shows its author and licence, and opens full screen. Maps, coats of arms and logos are filtered out.
- **Worth a look nearby:** well-known places within about 12 km, from Wikidata, most famous first. UNESCO World Heritage sites carry a badge.
- **Weather through the year:** monthly highs, lows and rain, from NASA POWER, with a plain summary.
- **Nice to know:** official altitude, postcode, founding date, sister towns, mayor and highest point, from Wikidata.

## The place page

- The first thing you see is "Why #N": three reasons and one watch-out, followed by eight fact tiles.
- Everything else sits in tabs: Overview, Photos, Facts, Around and Compare. Nothing from 2.0 was removed.
- The Overview tab tells the place's story in five parts: the good, the not-so-good, the unusual, the interesting and nice to know.
- The story is written from the data, and its phrasing rotates from place to place. A test checks 40 places: no opening sentence dominates, and stock travel words ("nestled", "vibrant", "hidden gem" and similar) never appear.

## Tools for planners and for the curious

- **Save:** hearts on every card and row. Saved places take notes, can be ticked for comparison, shared as a link or downloaded as CSV.
- **Compare:** up to three places side by side, with photos, grouped rows and a one-line verdict per place. You can remove a column or share the comparison as a link.
- **Home:** set the place you live now. Every other place then says how it differs, for example "15 km closer to a big city" or "2.8× as many people within 10 km".
- **Records:** the extremes of the current scope, such as highest terrain, fastest growing, furthest from a railway or closest to a lake.
- **Surprise me:** opens a random place from the top quarter of the ranking.
- **Higher or lower:** a small game with real data.
- **Tools drawer:** all of the above in one place.
- **Quick tour:** five steps on the first visit; it can be reopened with the "?" button.
- **Filters:** new filters for railway, motorway, lake and border distance, residents within 10 km, terrain and climate. Ten new map layers and four new sort orders cover the same parameters.

# 3. Verification

## Engine and data tests

Legacy parity 49 of 49, builder 60 of 60, data checks all pass. Standard rankings are unchanged.

## Browser regression suite

REGRESSION_TABLE

## The single file, opened from disk

STANDALONE

# 4. Screenshots

SCREENSHOTS

# 5. Not verified in the build sandbox

The sandbox blocks the live services: map tiles, Wikipedia, Wikidata, Wikimedia Commons, NASA POWER, Overpass, GISCO, Google Analytics and AdSense. The code that reads them was tested against simulated responses (check R49) and fails gracefully when a service is down. A five-minute check on the live site confirms the real responses.

# 6. Open items

I am not a lawyer; the legal texts have not been checked by one.

## For Claude

- Check the live site after the push: photos, nearby places, the weather chart, map tiles, the consent dialog and ads.

## For Anton

- Push the site with GitHub Desktop (one commit, one push), or give Claude push access.
- AdSense: add the site, publish the European consent message with consent mode on, switch on Auto ads with anchors at the top or off.
- Google Analytics: data retention 14 months or less.
- Decide on an EU representative under GDPR Art. 27.

# 7. Ideas for the next stage

1. Rents and house prices: the single most requested fact a first-time user missed. Open sources exist for some countries, such as Swiss rent statistics and French DVF sales.
2. Door-to-door travel times to a chosen workplace, instead of straight-line distances.
3. School, doctor and childcare locations from OpenStreetMap, counted per place.
4. City entries in search for cities that the official data splits into parishes (Lisbon, Skopje).
