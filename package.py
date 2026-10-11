"""Packages the release into dist/:
  nestlyzer-source.zip          the sources (archive; build with npm ci && npm run build)
  nestlyzer-site-*.zip          the finished public site: this is what goes into the GitHub repo (no GitHub Actions)
  index.html                    the built app page
Also checks GitHub limits: every file < 25 MB (web upload), < 100 MB (git), site < 1 GB."""
import os, re, sys, zipfile, json, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, 'dist')
os.makedirs(DIST, exist_ok=True)

SRC_DIRS = ['.github', 'build', 'src', 'tests', 'vendor', 'assets', 'data', 'docs']
SRC_FILES = ['.gitignore', 'CNAME', 'package.json', 'package-lock.json', 'README.md', 'favicon.ico', 'favicon.svg']
SKIP_PARTS = {'node_modules', '__pycache__', 'shots', 'results', '.DS_Store', '.cache'}
GENERATED = {'data/routes.json', 'assets/consent.js', 'assets/hero-ch.svg', 'assets/site.css', 'data/hero.json', 'data/hero.bin', 'data/pages.json'}


def source_files():
    out = []
    for f in SRC_FILES:
        if os.path.exists(os.path.join(ROOT, f)):
            out.append(f)
    for d in SRC_DIRS:
        for base, dirs, files in os.walk(os.path.join(ROOT, d)):
            dirs[:] = sorted(x for x in dirs if x not in SKIP_PARTS)
            for f in sorted(files):
                rel = os.path.relpath(os.path.join(base, f), ROOT).replace(os.sep, '/')
                if f in SKIP_PARTS or rel in GENERATED or f.endswith('.pyc'):
                    continue
                out.append(rel)
    return out


def zipup(name, root, files):
    p = os.path.join(DIST, name)
    with zipfile.ZipFile(p, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in files:
            z.write(os.path.join(root, f), f)
    return p


def main():
    report = {}
    src = source_files()
    big = [(f, os.path.getsize(os.path.join(ROOT, f))) for f in src if os.path.getsize(os.path.join(ROOT, f)) > 25e6]
    if big:
        sys.exit('Files over the 25 MB web-upload limit: %s' % big)
    ver0 = json.load(open(os.path.join(ROOT, 'package.json')))['version']
    for f in os.listdir(DIST):
        if f.startswith('nestlyzer-repo-') or f == 'nestlyzer-source.zip':
            os.remove(os.path.join(DIST, f))
    import unicodedata
    low = {}
    for f in src:  # the repository itself must be safe on a Mac and on Windows
        k = unicodedata.normalize('NFC', f).lower()
        if k in low: sys.exit('case collision in sources: %s / %s' % (low[k], f))
        low[k] = f
    assert '.github/workflows/site.yml' in src and '.gitignore' in src and 'package-lock.json' in src
    p = zipup('nestlyzer-repo-%s.zip' % ver0, ROOT, src)
    batch_a = [f for f in src if not (f.startswith('assets/') or f.startswith('data/'))]
    batch_b = [f for f in src if f.startswith('assets/') or f.startswith('data/')]
    report['source'] = {'files': len(src), 'mb': round(sum(os.path.getsize(os.path.join(ROOT, f)) for f in src) / 1e6, 1),
                        'zip_mb': round(os.path.getsize(p) / 1e6, 1), 'largest_mb': round(max(os.path.getsize(os.path.join(ROOT, f)) for f in src) / 1e6, 1),
                        'upload_batch_A': len(batch_a), 'upload_batch_B': len(batch_b)}
    with open(os.path.join(DIST, 'source-file-list.txt'), 'w') as fh:
        fh.write('Upload batch A (code, tests, build tools):\n' + '\n'.join(batch_a) + '\n\nUpload batch B (assets and data):\n' + '\n'.join(batch_b) + '\n')

    site = os.path.join(ROOT, '_site')
    subprocess.run(['node', os.path.join(ROOT, 'build/public.mjs'), site], check=True)
    ver = json.load(open(os.path.join(ROOT, 'package.json')))['version']
    with open(os.path.join(site, 'README.md'), 'w') as fh:
        fh.write('# Nestlyzer ' + ver + '\n\nThe published website https://nestlyzer.com, served by GitHub Pages from this branch (main, root folder).\n\n'
                 'Everything here is generated. Do not edit files by hand: the sources and the build live in nestlyzer-source.zip, and each release replaces this folder in one commit (see the deploy guide).\n\n'
                 'No GitHub Actions are used. `.nojekyll` makes Pages serve the files as they are.\n\n'
                 'Operator: Torsten Sauter, Meilen, Switzerland. Legal notice: https://nestlyzer.com/legal/\n')
    sf = []
    for base, dirs, files in os.walk(site):
        dirs.sort()
        for f in sorted(files):
            sf.append(os.path.relpath(os.path.join(base, f), site).replace(os.sep, '/'))
    # split into zips under 28 MB each (chat upload limit 30 MB); unzip all into one folder
    import zlib, unicodedata
    # GitHub and Mac/Windows safety: no paths that differ only by case, no characters Windows or Git dislike, no huge files
    low = {}; probs = []
    for f in sf:
        k = unicodedata.normalize('NFC', f).lower()
        if k in low: probs.append('case collision: %s / %s' % (low[k], f))
        low[k] = f
        parts_ = f.split('/')
        if re.search(r'[\\:*?"<>|\x00-\x1f]', f) or any(x != x.strip() or x.endswith('.') or (x.startswith('.') and x != '.nojekyll') for x in parts_):
            probs.append('awkward name: ' + f)
        if f != unicodedata.normalize('NFC', f): probs.append('not NFC: ' + f)
        if len(f.encode()) > 240: probs.append('path too long: ' + f)
        if os.path.getsize(os.path.join(site, f)) > 50e6: probs.append('file over 50 MB: ' + f)
    if any(f.startswith('.github/') for f in sf): probs.append('a .github folder would bring workflows')
    if probs: sys.exit('GitHub compliance problems:\n' + '\n'.join(probs[:30]))
    report['github_checks'] = {'files': len(sf), 'case_collisions': 0, 'awkward_names': 0, 'non_nfc': 0, 'max_path_bytes': max(len(f.encode()) for f in sf), 'files_over_50mb': 0, 'workflows': 0}
    for f in os.listdir(DIST):
        if f.startswith('nestlyzer-site') or re.match(r'nestlyzer-[0-9.]+-site', f):
            os.remove(os.path.join(DIST, f))
    top = {}
    for f in sf:
        k = f.split('/')[0] if '/' in f else '(root)'
        top.setdefault(k, []).append(f)
    core = [k for k in top if k in ('(root)', 'assets', 'vendor', 'data')]
    pages = sorted(k for k in top if k not in core)
    est = {k: sum(len(zlib.compress(open(os.path.join(site, f), 'rb').read(), 6)) for f in top[k]) for k in pages}
    groups, cur, size = [], [], 0
    for k in pages:
        if cur and size + est[k] > 26e6:
            groups.append(cur); cur, size = [], 0
        cur.append(k); size += est[k]
    if cur: groups.append(cur)
    parts = [('nestlyzer-' + ver + '-site-1-app-and-data.zip', [f for k in core for f in top[k]])]
    for i, g in enumerate(groups):
        parts.append(('nestlyzer-%s-site-%d-pages-%s-to-%s.zip' % (ver, i + 2, g[0], g[-1]), [f for k in g for f in top[k]]))
    report['site_zips'] = []
    for name, files in parts:
        zp = zipup(name, site, files)
        mb = os.path.getsize(zp) / 1e6
        if mb > 29: sys.exit('zip too large: %s %.1f MB' % (name, mb))
        report['site_zips'].append({'zip': name, 'files': len(files), 'mb': round(mb, 1)})
    assert sum(z['files'] for z in report['site_zips']) == len(sf)
    report['site'] = {'files': len(sf), 'mb': round(sum(os.path.getsize(os.path.join(site, f)) for f in sf) / 1e6, 1),
                      'largest_mb': round(max(os.path.getsize(os.path.join(site, f)) for f in sf) / 1e6, 1)}
    print(json.dumps(report, indent=1))
    json.dump(report, open(os.path.join(DIST, 'package-report.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
