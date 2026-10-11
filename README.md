# Nestlyzer

Find where you fit in Europe. Nestlyzer ranks 99,538 municipalities in 35 countries for the household that is moving: young families, retirees, students, commuters, remote workers, coastal living and more. Every score comes from public data with visible weights.

Live site: https://nestlyzer.com

## How the site is published

This repository holds the **sources**. GitHub builds the website from them and publishes it with GitHub Pages. The workflow is `.github/workflows/site.yml`:

| When | What happens |
|---|---|
| Every push to `main` | Install, run the tests, build the 5,800-file site, test it in a real browser, publish. About 5 minutes. |
| The 3rd of every month | Ask Eurostat whether a newer population year exists. If yes: rebuild the data, test, save the new data here, publish. If no: stop after about a minute. |
| By hand | **Actions → Build and publish nestlyzer.com → Run workflow** |

If any test fails, nothing is published and the live site stays as it was. GitHub emails the repository owner.

One-time setting: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Custom domain: `nestlyzer.com`.

Releases through the browser: upload the release zips (`nestlyzer-upload-<version>-1-of-2.zip`, …) with **Add file → Upload files**. The workflow checks that all parts are there and that Pages uses GitHub Actions, replaces every file except `.git` and `.github` with the release, saves that as one commit, then builds and publishes. See `docs/DEPLOY.md`.

GitHub pauses scheduled workflows in public repositories after 60 days without any commit. Any push, or **Run workflow**, also checks for new data. If the Actions page shows "This scheduled workflow is disabled", click **Enable workflow**.

## What the yearly refresh updates

Eurostat GISCO publishes residents and area for every local administrative unit once a year (`build/refresh_data.py` reads https://gisco-services.ec.europa.eu/distribution/v2/lau/). A new year updates:
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
| `data/` | Country data (`c/`), extra parameters (`x/`), search index, map outlines. Built by `build/build_data.py` and `build/build_extra.py`, kept in the repository. |
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
```

## Privacy

Before a visitor presses "Accept all", the browser contacts no Google service. After "Accept all", light Google Analytics loads with Google signals and ad personalisation switched off, together with AdSense, which asks for non-personalised ads only. `NZ_ANALYTICS=off` removes Analytics. `NZ_PRIVACY=full` restores personalised ads after consent.

Operator: Torsten Sauter, Meilen, Switzerland. See `/legal/` on the site.
