#!/usr/bin/env python3
"""r20 (audit NZ10-11): one definition of the release source fingerprint, used by the release gate (on the working tree
after the build) and by the packer (on the release archive before upload); both must print the same value.
Scope: src, build, data, cloudflare, tests, package.json, package-lock.json; local caches and test outputs excluded.
Usage: python3 tests/source_hash.py [root]   prints the 16-character fingerprint and, with --list, the files."""
import hashlib, os, sys
SCOPE = ['src', 'build', 'data', 'cloudflare', 'tests', 'package.json', 'package-lock.json']
SKIP_DIRS = {'__pycache__', '.wrangler', 'node_modules'}
SKIP_PATHS = ('tests/results/', 'build/.cache/')
SKIP_FILES = {'tests/boom_audit.json', 'data/downloads/places_lookup_for_mapping.csv'}
def files(root):
    out = []
    for s in SCOPE:
        p = os.path.join(root, s)
        if os.path.isfile(p): out.append(s); continue
        for d, ds, fs in os.walk(p):
            ds[:] = sorted(x for x in ds if x not in SKIP_DIRS)
            for f in fs:
                rel = os.path.relpath(os.path.join(d, f), root).replace(os.sep, '/')
                if rel.startswith(SKIP_PATHS) or rel in SKIP_FILES or f.endswith(('.pyc', '_results.json')): continue
                out.append(rel)
    return sorted(out)
def fingerprint(root):
    h = hashlib.sha256()
    for rel in files(root):
        h.update(rel.encode() + b'\0'); h.update(hashlib.sha256(open(os.path.join(root, rel), 'rb').read()).digest())
    return h.hexdigest()[:16]
if __name__ == '__main__':
    root = next((a for a in sys.argv[1:] if not a.startswith('--')), '.')
    if '--list' in sys.argv: print('\n'.join(files(root)))
    else: print(fingerprint(root))
