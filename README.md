# Nestlyzer

Find where you fit. <!-- counts -->Nestlyzer ranks 145,595 places in 63 countries for households and businesses: 30 household profiles, 20 business profiles and 210 official measures, each with its source (version 2.15.2, counts from docs/manifest.json).<!-- /counts -->

Live site: https://nestlyzer.com

## How the site is published

This repository holds the **sources**. GitHub builds the website from them and publishes it with GitHub Pages. The workflow is `.github/workflows/site.yml`:
## How the site is published

The website is one flat folder, `dist/site` (built by `NZ_SPLIT=1 node build/standalone.mjs` after `node build/build_site.mjs`): `index.html`, `business.html`, the `nzdata-…` data files, `404.html`, `CNAME`, `ads.txt`, `robots.txt` and `.nojekyll`. It has no subfolders, so it survives GitHub's browser upload, which drops folders. Release: unzip `nestlyzer-website-<version>.zip`, select all files, **Add file → Upload files**, commit. GitHub Pages serves the repository root (deploy from branch).

Before a release: `npm test`, `python3 tests/split_test.py dist/site`, `python3 tests/livesim.py <repo clone> dist/site` and the browser suites in `tests/` (see docs/CHANGELOG.md for what each release checked).

ropa.eu/distribution/v2/lau/). A new year updates:
- residents and density;
- five-year growth;
- residents within 30 km;
- which places count as cities of 100,000+;
- the access scores and all rankings built on them.

Safety rules (`build/lau_update.py`):
- a country is updated only if at least 85% of its places are found and its total moves less than 12%;
- a place whose population jumps by more than 50% keeps its old figures.

Geography (coast, airports, railways, terrain, climate) does not change from year to year. The Swiss FSO portraits and ESTV tax data need a manual update.

## Folder map

| Folder | What it holds |
|---|---|
| `.github/workflows/` | The single workflow that builds, tests and publishes |
| `src/` | The app: page template, styles, scripts, scoring engine |
| `data/` | Country data (`c/`), extra parameters (`x/`), search index, map outlines. Built by `build/build_data.py`, `build/build_extra.py` and `build/build_world.py`, kept in the repository. |
| `assets/` | Fonts, logo, icons, flags, social image |
| `vendor/` | MapLibre GL and topojson-client (self-hosted, BSD/ISC licences) |
| `build/` | Build scripts and the original source data |
| `tests/` | Unit tests, the smoke test the workflow runs, and the full browser regression suite |
| `docs/` | Release notes, feature list, deploy guide |

## Local build

```
npm ci
npm test                          # scoring parity, builder, data checks
node build/build_site.mjs         # app + 5,655 SEO pages + sitemap + service worker
node build/public.mjs _site       # the public folder, exactly as published
python3 tests/smoke.py _site      # the browser check the workflow runs
node build/standalone.mjs         # dist/nestlyzer.html, the whole app in one file
```

Data rebuild (run with `PYTHONHASHSEED=0` so the output is identical to GitHub's):
```
pip install -r build/requirements.txt
python3 build/refresh_data.py     # only downloads if Eurostat has a newer year
python3 build/build_data.py       # about 1 minute
python3 build/build_extra.py      # about 2 minutes; downloads Natural Earth (pinned commit) once into .cache/
python3 build/build_world.py      # about 9 minutes; the 10 countries outside Europe (GeoNames, Natural Earth, OurAirports)
python3 build/build_world_balance.py   # seconds; crowding counterweights outside Europe
python3 build/build_shore.py      # seconds; the sea or a large lake as the shore for Coastal living
python3 build/build_context.py     # seconds; country taxes, economy, institutions and US state context (data/context.json)
python3 build/build_business_profiles.py   # seconds; the business location profiles
```

## Privacy

Before a visitor presses "Accept all", the browser contacts no Google service. After "Accept all", light Google Analytics loads with Google signals and ad personalisation switched off, together with AdSense, which asks for non-personalised ads only. `NZ_ANALYTICS=off` removes Analytics. `NZ_PRIVACY=full` restores personalised ads after consent.

Operator: Torsten Sauter, Meilen, Switzerland. See `/legal/` on the site.
