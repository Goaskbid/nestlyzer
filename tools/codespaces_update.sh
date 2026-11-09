#!/usr/bin/env bash
# Nestlyzer small update from GitHub Codespaces (2.15.7). Carries only the changed files (a few MB instead of 76 MB).
#   unzip -oq "$(find /workspaces -name 'nestlyzer-update-*.zip' | head -1)" -d /tmp/nzu && bash /tmp/nzu/tools/codespaces_update.sh
# Copies the files listed in UPDATE_FILES.txt over the repository, shows the change, asks once, commits ONLY those files
# and pushes. Unrelated untracked files are preserved. Any tracked edit stops the update, except a package-lock.json rewritten by npm, which is stashed (kept) after you confirm.
set -euo pipefail
REL=/tmp/nzu
REPO=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Run this inside the codespace terminal (the repository folder)."; exit 1; }
cd "$REPO"
case "$(git remote get-url origin 2>/dev/null)" in *[Nn]estlyzer*) ;; *) echo "Stopped: this is not the Nestlyzer codespace. Nothing was changed."; exit 1;; esac
[ "$(git rev-parse --abbrev-ref HEAD)" = main ] || { echo "Not on main. Run: git checkout main   then this again."; exit 1; }
[ -f "$REL/UPDATE_FILES.txt" ] || { echo "No unpacked update in $REL. Run the unzip command first."; exit 1; }
# Preflight before a pull can mutate the checkout. Do not discard any tracked edits.
# 2.15.11: npm in the codespace rewrites package-lock.json by itself. That alone does not stop the update: after you
# confirm, it is saved in a git stash (restorable with: git stash pop) before anything else changes. Any other edit stops.
LOCK=""; [ "$(git status --porcelain --untracked-files=no)" = " M package-lock.json" ] && LOCK=1
if [ -z "$LOCK" ] && [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Stopped: tracked edits or staged work exist, including package-lock.json. Commit or safely stash them yourself. Nothing changed."
  exit 1
fi
VER=$(python3 -c "import json;print(json.load(open('$REL/package.json'))['version'])")
CUR=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")
BASE=$(cat "$REL/UPDATE_BASE.txt")
if [ "$CUR" = "$VER" ]; then
  CONFLICT=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in /*|../*|*/../*|*/..) echo "Unsafe update path"; exit 1;; esac
    if ! cmp -s -- "$REL/$f" "$f"; then echo "Same-version content differs: $f"; CONFLICT=1; fi
  done < "$REL/UPDATE_FILES.txt"
  [ "$CONFLICT" = 0 ] || { echo "Stopped: same-version release conflict. No files changed."; exit 1; }
  echo "Identical release already installed."; exit 0
fi
case " $BASE " in *" $CUR "*) ;; *) echo "Stopped: this update needs Nestlyzer $BASE in the repository, found $CUR. Nothing was changed."; exit 1;; esac
# 2.15.4 (audit 3): never overwrite work. Stop if any tracked file has unsaved changes, or if an untracked file sits
# where the update would write. Stray zips elsewhere are fine. Then check the files this update builds on are present.
MOD=$(git status --porcelain --untracked-files=no)
if [ -z "$LOCK" ] && [ -n "$MOD" ]; then echo "Stopped: these files have unsaved changes and would be overwritten. Nothing was changed."; echo "$MOD" | head -15 | sed 's/^/   /'; echo "   Commit or safely stash the work before retrying."; exit 1; fi
UNT=$(git ls-files --others --exclude-standard | grep -x -F -f "$REL/UPDATE_FILES.txt" || true)
if [ -n "$UNT" ]; then echo "Stopped: these files exist in the codespace but not in the repository, and the update would overwrite them:"; echo "$UNT" | head -15 | sed 's/^/   /'; echo "Nothing was changed."; exit 1; fi
if [ -f "$REL/UPDATE_REQUIRES.txt" ]; then MISS=""; while IFS= read -r f; do [ -n "$f" ] && [ ! -e "$f" ] && MISS="$MISS $f"; done < "$REL/UPDATE_REQUIRES.txt"; [ -z "$MISS" ] || { echo "Stopped: this repository is missing files the update builds on:$MISS. Nothing was changed."; exit 1; }; fi
N=$(grep -c . "$REL/UPDATE_FILES.txt")
echo "Nestlyzer $CUR -> $VER: $N files"
read -r -p "Copy them, commit and push now? [y/N] " ok
[ "${ok,,}" = y ] || { echo "Nothing was changed."; exit 0; }
[ -n "$LOCK" ] && { git stash push -q -m "nestlyzer: package-lock.json before $VER" -- package-lock.json && echo "package-lock.json (rewritten by npm) kept in a git stash; restore with: git stash pop"; }
git pull -q --ff-only origin main || { echo "Stopped: pull failed. No release files were copied."; exit 1; }
AFTER=$(python3 -c "import json;print(json.load(open('package.json'))['version'])")
[ "$AFTER" = "$CUR" ] || { echo "Stopped: the repository version changed during pull. Recheck the update against the new checkout."; exit 1; }
BK="backup-before-$VER-$(date +%Y%m%d-%H%M)"; git tag "$BK"
while IFS= read -r f; do [ -n "$f" ] || continue; mkdir -p "$(dirname "$f")"; cp -a "$REL/$f" "$f"; done < "$REL/UPDATE_FILES.txt"
python3 build/check_github_limits.py . >/dev/null || { echo "Stopped: GitHub limits check failed. Undo with: git checkout -- . "; exit 1; }
git reset -q
git check-ignore --stdin < "$REL/UPDATE_FILES.txt" > /tmp/nzu_ign.txt || true
grep -v -x -F -f /tmp/nzu_ign.txt "$REL/UPDATE_FILES.txt" | grep . | xargs -d '\n' git add --
git -c user.name="${GIT_AUTHOR_NAME:-$(git config user.name || echo nestlyzer)}" commit -qm "Nestlyzer $VER"
git push -q origin main || { echo "Push refused (message above). Nothing was published."; exit 1; }
git push -q origin "$BK" 2>/dev/null || true
rm -rf "$REL"
echo "Done. Nestlyzer $VER is pushed. The Actions tab turns green in about 10 minutes."
