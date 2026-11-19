#!/usr/bin/env python3
"""2.15.30-r7: every Wikimedia thumbnail Nestlyzer asks for uses a standard width. Since February 2026 Wikimedia rate-limits
other widths, which made every coat of arms (96 px) fail to load. Static scan of the app and page sources.
    python3 tests/test_thumb_steps.py"""
import os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STEPS = {20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840}
files = [os.path.join(d, f) for base in ('src', 'build') for d, _, fs in os.walk(os.path.join(ROOT, base)) for f in fs if f.endswith(('.js', '.mjs', '.html', '.cjs')) and 'node_modules' not in d]
bad, seen = [], 0
for p in files:
    s = open(p, encoding='utf-8', errors='ignore').read()
    for m in re.finditer(r'iiurlwidth=(\d+)|Special:FilePath/[^\'"]*\?width=(\d+)|commonsFile\([^,()]*(?:\([^)]*\))?[^,()]*,\s*(\d+)\)|\?width=(\d+)|/(\d+)px-', s):
        w = int(next(g for g in m.groups() if g)); seen += 1
        if w not in STEPS: bad.append((os.path.relpath(p, ROOT), w))
print('thumbnail widths checked:', seen)
for b in bad: print('FAIL non-standard width', b)
ok = seen >= 6 and not bad; print('THUMBNAIL STEPS TEST:', 'PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)
