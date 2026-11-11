#!/usr/bin/env python3
"""Guard against GitHub problems (2.12.2). Fails (exit 1) if the repository tree would break a limit:
  * any folder with more than 900 files (GitHub's web view truncates folders at 1,000 entries);
  * any file of 20 MiB or more (GitHub warns at 50 MB and refuses 100 MB; our rule is 20);
  * more than 25,000 files in total.
The built site (_site), dist, node_modules and .git are never part of the repository and are skipped.
    python3 build/check_github_limits.py [root]"""
import os, sys
root = sys.argv[1] if len(sys.argv) > 1 else '.'
SKIP = {'.git', '_site', 'dist', 'node_modules', '__pycache__', '.cache'}
import fnmatch, subprocess
UPLOAD = 'nestlyzer-update-*.zip'  # the uploaded update itself is never committed, in whatever folder it was dropped (2.15.16: it once landed in tests/)
MAXDIR, MAXFILE, MAXTOTAL = 900, 20 * 2 ** 20, 25000
bad, total = [], 0
for d, dirs, files in os.walk(root):
    dirs[:] = [x for x in dirs if x not in SKIP]
    # 2.15.16: generated, git-ignored build output (places/, rankings/, data/place-detail/ ...) is never committed
    if os.path.normpath(d) in (os.path.normpath(root), os.path.join(os.path.normpath(root), 'data')):
        dirs[:] = [x for x in dirs if subprocess.run(['git', '-C', root, 'check-ignore', '-q', os.path.relpath(os.path.join(d, x), root) + '/'], capture_output=True).returncode != 0]
    if len(files) + len(dirs) > MAXDIR: bad.append(f'folder {d}: {len(files) + len(dirs)} entries (limit {MAXDIR})')
    for f in files:
        if fnmatch.fnmatch(f, UPLOAD): continue
        total += 1; s = os.path.getsize(os.path.join(d, f))
        if s >= MAXFILE: bad.append(f'file {os.path.join(d, f)}: {s / 2 ** 20:.1f} MiB (limit 20)')
if total > MAXTOTAL: bad.append(f'{total} files in total (limit {MAXTOTAL})')
print('\n'.join(bad) or f'GitHub limits OK: {total} files, no folder over {MAXDIR}, no file of 20 MiB or more')
sys.exit(1 if bad else 0)
