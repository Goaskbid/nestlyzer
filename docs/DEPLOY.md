# Publishing Nestlyzer (current path, 2.15.30-r19 and later)

The old 2.4.1 two-zip guide is archived in `docs/archive/DEPLOY_2.4.1_incident.md` and no longer applies.

## What is released
- Repository `Goaskbid/nestlyzer`, branch `main`, production host GitHub Pages at https://nestlyzer.com (CNAME in the repository).
- One file per release: `nestlyzer-release-2.15.30.zip` (the source tree plus `RELEASE.json`, which lists every file).
  The public website is NOT in the zip: GitHub builds it from the source into `_site/` (about 849 MB of the 850 MB
  budget; GitHub's own Pages limit is 1 GB, and no file may be 20 MB or larger).

## Before release (done by the developer, not the owner)
1. `bash tests/release_gate.sh` (about 90 minutes). It builds `_site/`, runs every suite, the audit regressions and the
   fault probes. A step passes only if its process exits 0 and its log reports no failed assertion; the gate checks
   that rule on itself first. It writes `docs/audit/release_gate_receipt.json` with the source hash, the artifact hash
   of `_site/`, the assertion counts and the steps, and `docs/audit/publication_size.json` with bytes per directory.
2. The zip is packed from the same source and replayed in a clean checkout of the live repository (fresh `npm ci`,
   `npm test`, full build, smoke test).
3. `build/release_tag.txt` holds the release tag (for example `v2.15.30-r19`); the build writes it into `VERSION.txt`.

## Release (the owner's one action)
Open `https://github.com/Goaskbid/nestlyzer/releases/new?tag=<release tag>`, attach `nestlyzer-release-2.15.30.zip`,
press **Publish release**.

GitHub then runs, without further input:
1. **nz-release-v2.yml**: downloads the zip, checks that every file in `RELEASE.json` is present and that the version
   matches, checks the GitHub limits, replaces the repository contents (except `.git` and `.github`) and commits
   "Nestlyzer 2.15.30: from release <tag>"; then starts the site build for exactly that commit.
2. **site.yml**: builds `_site/`, tests it and publishes it to GitHub Pages (about 15 minutes after the release).
3. **nz-collect-once.yml**: only if the release carries a new `build/collect/acquisition_plan.json`, downloads the listed
   official files once to a separate `data-intake-<hash>` branch (not part of the website).

## Check that it is live
`https://nestlyzer.com/VERSION.txt` shows `Nestlyzer 2.15.30`, `release <tag>` and the build time. The service worker
cache name (`nz-2.15.30-<hash>` in `/sw.js`) changes with every build, so returning visitors get the new version.

## Rollback
The cleanup workflow keeps the zips of the newest three releases. To roll back, publish a new release with the tag
`<previous tag>-rollback` and attach the previous release's zip (download it from that release's page). The same
workflows rebuild and publish it; `VERSION.txt` then names the previous tag.

## Cloudflare (prepared, not live)
`cloudflare/` holds the prepared Worker and its tests; the current host stays GitHub Pages until the owner approves a
switch. Nothing in this guide changes DNS.
