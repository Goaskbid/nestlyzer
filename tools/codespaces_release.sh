#!/usr/bin/env bash
# Nestlyzer release from GitHub Codespaces (2.15.1).
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
# 2.13.2: refuse clearly in any other repository's codespace (e.g. curvescout-com)
case "$(git remote get-url origin 2>/dev/null)" in
  *[Nn]estlyzer*) ;;
  *) echo "Stopped: this is the codespace of $(basename "$REPO"), not Nestlyzer. Nothing was changed."
     echo "Open github.com/Goaskbid/nestlyzer, press Code > Codespaces, open its codespace and run the command there."
     echo "To remove the zip from this codespace: rm -f \"$REPO\"/nestlyzer-codespaces-*.zip; rm -rf /tmp/nz"
     exit 1;;
esac
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "The codespace is not on the main branch. Run: git checkout main   then this script again."; exit 1; }
[ -f "$REL/package.json" ] && grep -q '"name": "nestlyzer"' "$REL/package.json" || { echo "No unpacked Nestlyzer release in $REL. Run the unzip command first."; exit 1; }
VER=$(python3 -c "import json;print(json.load(open('$REL/package.json'))['version'])")
echo "Nestlyzer $VER"
# the repository holds sources only; without the build workflow nothing would be built and the live site would break
[ -f .github/workflows/site.yml ] || { echo "Stopped: the repository has no build workflow (.github/workflows/site.yml). Create it on github.com first"; echo "(Add file, Create new file, paste site.yml from the release, Commit), set Settings > Pages > Source to GitHub Actions, then run this again."; exit 1; }
# 2.14 (owner audit A0): never let an older release overwrite newer work, and keep a way back
CUR=$(python3 -c "import json;print(json.load(open('package.json'))['version'])" 2>/dev/null || echo 0)
if [ "$CUR" != "0" ] && python3 -c "import sys;a=[int(x) for x in sys.argv[1].split('.')];b=[int(x) for x in sys.argv[2].split('.')];sys.exit(0 if a<b else 1)" "$VER" "$CUR"; then
  echo "Stopped: the repository already holds Nestlyzer $CUR, newer than this release ($VER). Nothing was changed."; exit 1; fi
# 2.15 (audit 2): stop on unsaved work in the codespace, and on a same-numbered release with different sources
DIRTY=$(git status --porcelain | grep -v 'nestlyzer-codespaces-.*\.zip' || true)
if [ -n "$DIRTY" ]; then echo "Stopped: the codespace has unsaved changes (below). Nothing was changed."; echo "$DIRTY" | head -20 | sed 's/^/   /'; echo "   Keep them: commit them first. Drop them: git checkout -- . && git clean -fd   then run this again."; exit 1; fi
if [ "$CUR" = "$VER" ] && [ -n "$(diff -rq -x .git -x .github -x node_modules -x 'nestlyzer-codespaces-*.zip' src "$REL/src" 2>/dev/null)" ]; then
  echo "Stopped: the repository already holds Nestlyzer $VER, with different sources. A new release needs a new version number. Nothing was changed."; exit 1; fi
echo "1/4 GitHub limits"
python3 "$REL/build/check_github_limits.py" "$REL"
echo "2/4 What would change"
D=$(diff -rq -x .git -x .github -x node_modules -x 'nestlyzer-codespaces-*.zip' . "$REL" 2>/dev/null || true)
CH=$(echo "$D" | grep -c '^Files .* differ$' || true); AD=$(echo "$D" | grep -c "^Only in $REL" || true); RM=$(echo "$D" | grep '^Only in ' | grep -vc "^Only in $REL" || true)
echo "   $CH files changed, $AD added, $RM removed (Nestlyzer $CUR -> $VER)"
echo "$D" | head -12 | sed "s#$REL#release#g; s/^/   /"
if [ -f .github/workflows/site.yml ] && ! cmp -s "$REL/.github/workflows/site.yml" .github/workflows/site.yml; then echo "   Note: the release has a newer build workflow. A codespace may not change it; it is kept. To update it, edit .github/workflows/site.yml on github.com and paste the release's site.yml."; fi
read -r -p "3/4 Replace the files, commit and push Nestlyzer $VER now? [y/N] " ok
if [ "${ok,,}" != "y" ]; then echo "Nothing was changed."; exit 0; fi
BK="backup-before-$VER-$(date +%Y%m%d-%H%M)"; git tag "$BK" && echo "   Backup of the current state: tag $BK (undo with: git reset --hard $BK)"
find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .github -exec rm -rf {} +
( cd "$REL" && find . -mindepth 1 -maxdepth 1 ! -name .github -exec cp -a {} "$REPO"/ \; )
python3 build/check_github_limits.py .
echo "4/4 Commit and push"
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo nestlyzer)}" commit -qm "Nestlyzer $VER"
git push -q origin main || { echo "Push refused (message above). Nothing was published; the commit stays in the codespace."; exit 1; }
git push -q origin "$BK" 2>/dev/null && echo "   Backup tag $BK saved on GitHub too." || true
rm -rf "$REL"
echo "Done. Watch the build under the repository's Actions tab; the site is live when it turns green."
echo "If Settings > Pages > Source is not yet 'GitHub Actions', set it once."
