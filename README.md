# Nestlyzer

Find where you fit. <!-- counts -->Nestlyzer ranks 145,533 places in 63 countries for households and businesses: 26 household profiles, 16 business profiles and 212 official measures, each with its source (version 2.15.30, counts from docs/manifest.json).<!-- /counts -->

Live site: https://nestlyzer.com

## How the site is published

This repository holds the **sources**. One release zip per version (`nestlyzer-release-<version>.zip`) is attached to a GitHub Release; the workflows unpack it, commit it, build the site and publish it with GitHub Pages. The complete, current procedure (gate, version check, rollback) is in **docs/DEPLOY.md**. The old flat-folder browser upload is an archived incident procedure (`docs/archive/DEPLOY_2.4.1_incident.md`) and is not used.

Before a release: `bash tests/release_gate.sh` (every suite, with a receipt whose source fingerprint the packer checks against the archive).

## Yearly population update

Population figures come from the Eurostat GISCO LAU releases (https://gisco-services.ec.europa.eu/distribution/v2/lau/). A new year updates:
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
