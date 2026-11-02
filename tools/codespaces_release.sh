#!/usr/bin/env bash
# Nestlyzer release from GitHub Codespaces (2.13.1).
#
# 1. Open the repository on github.com, press "Code", "Codespaces", "Create codespace on main".
# 2. Drag nestlyzer-codespaces-<version>.zip from your computer into the file list on the left.
# 3. In the terminal at the bottom, paste:
#      unzip -oq "$(find /workspaces -name 'nestlyzer-codespaces-*.zip' | head -1)" -d /tmp/nz && bash /tmp/nz/tools/codespaces_release.sh
#
# What it does: checks the release against GitHub's limits, replaces every file of the repository with the release
# (old leftovers go), keeps .git and the workflow file exactly as they are, removes the uploaded zip, shows what changes,
# asks once, then commits and pushes. GitHub then builds all pages and publishes them (Actions tab, about 10 minutes).
# Nothing is pushed if a check fails or you answer no.
set -euo pipefail
REL=/tmp/nz
REPO=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Run this inside the codespace terminal (the repository folder)."; exit 1; }
cd "$REPO"
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "The codespace is not on the main branch. Run: git checkout main   then this script again."; exit 1; }
[ -f "$REL/package.json" ] && grep -q '"name": "nestlyzer"' "$REL/package.json" || { echo "No unpacked Nestlyzer release in $REL. Run the unzip command first."; exit 1; }
VER=$(python3 -c "import json;print(json.load(open('$REL/package.json'))['version'])")
echo "Nestlyzer $VER"
# the repository holds sources only; without the build workflow nothing would be built and the live site would break
[ -f .github/workflows/site.yml ] || { echo "Stopped: the repository has no build workflow (.github/workflows/site.yml). Create it on github.com first"; echo "(Add file, Create new file, paste site.yml from the release, Commit), set Settings > Pages > Source to GitHub Actions, then run this again."; exit 1; }
echo "1/4 GitHub limits"
python3 "$REL/build/check_github_limits.py" "$REL"
echo "2/4 Replacing the repository files with the release"
find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .github -exec rm -rf {} +
( cd "$REL" && find . -mindepth 1 -maxdepth 1 ! -name .github -exec cp -a {} "$REPO"/ \; )
if [ ! -f .github/workflows/site.yml ]; then
  echo "   Note: the repository has no build workflow yet. Create it once on github.com (Add file, Create new file,"
  echo "   name .github/workflows/site.yml, paste the file site.yml from the release, Commit); a codespace may not add it."
elif ! cmp -s "$REL/.github/workflows/site.yml" .github/workflows/site.yml; then
  echo "   Note: your workflow file differs from this release's. It is kept as it is (a codespace may not change it);"
  echo "   to update it, edit .github/workflows/site.yml on github.com and paste the release's site.yml."
fi
python3 build/check_github_limits.py .
echo "3/4 Changes"
git add -A
git status --short | awk '{print $1}' | sort | uniq -c | sed 's/^/   /'
echo "   (A = added, M = changed, D = removed)"
read -r -p "4/4 Commit and push Nestlyzer $VER now? [y/N] " ok
if [ "${ok,,}" != "y" ]; then git reset -q; echo "Nothing pushed. The files are still changed in the codespace; run 'git checkout -- . && git clean -fd' to undo."; exit 0; fi
git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo nestlyzer)}" commit -qm "Nestlyzer $VER"
git push -q origin main || { echo "Push refused (message above). Nothing was published; the commit stays in the codespace."; exit 1; }
rm -rf "$REL"
echo "Done. Watch the build under the repository's Actions tab; the site is live when it turns green."
echo "If Settings > Pages > Source is not yet 'GitHub Actions', set it once."
