"""r15: house voice on place, ranking, profile, country and Insights pages; slimmer compact pages; one header look."""
import re, sys, pathlib, glob, random
S = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '_site'); R = pathlib.Path(__file__).resolve().parents[1]
BAN = re.compile(r"\b(nestled|vibrant|boasts?|hidden gem|tapestry|bustling|whether you'?re|in conclusion|delve|testament to)\b", re.I)
fails = []
def ok(c, m):
    print(('PASS ' if c else 'FAIL ') + m)
    if not c: fails.append(m)
txt = lambda p: (S / p).read_text(encoding='utf-8')
m = txt('switzerland/zurich/meilen/index.html')
story = re.search(r'nz-story"?>(.*?)</section>', m, re.S)
ok(story and len(re.sub(r'<[^>]+>', '', story.group(1))) > 300, 'Meilen has a story of 300+ characters')
ok('Good to know about Meilen' in m, 'Meilen keeps Good to know')
rk = txt('rankings/households/de/young-family/index.html')
ok('nz-take' in rk and 'places' in rk, 'German young-family ranking has commentary')
ok('nz-take' in txt('best/young-family/index.html'), 'Profile page has commentary')
ok('nz-story' in txt('germany/index.html'), 'Country page has a portrait')
ok('Statistics have a reputation for being dull' in txt('insights/index.html'), 'Insights hub has the new introduction')
pages = sorted(glob.glob(str(S / '*/*/*/index.html')))
random.seed(15); sample = [t for t in (pathlib.Path(p).read_text(encoding='utf-8') for p in random.sample(pages, min(1500, len(pages)))) if 'data-sarms' in t][:400]
stories = [re.search(r'nz-story"?>(.*?)</section>', t, re.S) for t in sample]
bodies = [re.sub(r'<[^>]+>', ' ', s.group(1)) for s in stories if s]
ok(len(sample) >= 100 and len(bodies) == len(sample), f'every sampled full place page has a story: {len(bodies)} of {len(sample)}')
ok(not any(BAN.search(b) for b in bodies), 'no machine words in stories')
ok(not any(re.search(r'up \+|lost -|\{\w+\}|undefined|NaN', b) for b in bodies), 'no template slips (signs, braces, NaN)')
firsts = {b.split('.')[0].split(' ', 3)[-1] for b in bodies}
ok(len(firsts) >= 12, f'opening sentences vary: {len(firsts)} distinct')
c = txt('places/sg/1880226/index.html')
ok(len(c.encode()) < 1700 and 'interactive view below' not in c and 'empirically validated' in c, f'compact page slimmer ({len(c.encode())} bytes), disclaimer kept')
css = ''.join(pathlib.Path(p).read_text() for p in glob.glob(str(S / 'assets/seo-*.css')))
ok('mark.svg' in css and 'nz-take' in css, 'compact pages share the main header look and commentary style')
ok(not BAN.search((R / 'build/voice.mjs').read_text().split('*/', 1)[1].split('export const BANNED')[0]), 'voice templates avoid machine words')
print(f'{10 + 3 - len(fails)} checks, {len(fails)} failed'); sys.exit(1 if fails else 0)
