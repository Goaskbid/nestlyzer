#!/usr/bin/env python3
"""Counterweights for the ten countries outside Europe (run after build_world.py; safe to run again).

Why: GeoNames gives a place's population but not its area, so these countries had only size and access factors.
Every one of them rewards being big, so the largest city won almost every household (Sydney, Taipei, Seoul, New York).
In Europe the same profiles are balanced by density factors (crowding, density balance). This step adds the same two
factors outside Europe, measured from real data: the residents of all places within 10 km, per km2 of that circle.

  fr.geo_density10_km2          people per km2 within 10 km (GeoNames places, whole-city entries excluded)
  fs.common_low_crowding        100 for the least crowded surroundings in the country, 0 for the most (percentile)
  fs.common_density_balance     0 below 80 people/km2, rising to 100 at 1,000 to 3,000, falling to 0 at 30,000

It writes nothing else and does not touch Europe."""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AREA10 = math.pi * 10 ** 2


def balance(d):
    if d is None or d <= 80: return 0.0
    l = math.log10(d)
    if d < 1000: return round(100 * (l - math.log10(80)) / (3 - math.log10(80)), 1)
    if d <= 3000: return 100.0
    return round(max(0.0, 100 * (math.log10(30000) - l) / (math.log10(30000) - math.log10(3000))), 1)


def main():
    meta = json.load(open(os.path.join(ROOT, 'data', 'meta.json')))
    for cc in meta['config'].get('worldCountries', []):
        sp, xp = os.path.join(ROOT, 'data', 'c', cc + '.json'), os.path.join(ROOT, 'data', 'x', cc + '.json')
        sh, xs = json.load(open(sp)), json.load(open(xp))
        p10 = xs['cols']['pop10']; n = len(sh['rows'])
        dens = [round(p / AREA10, 1) if p is not None else None for p in p10]
        vals = sorted(d for d in dens if d is not None)
        rank = {}
        for i, d in enumerate(vals): rank.setdefault(d, i)
        crowd = [None if d is None else round(100 * (1 - rank[d] / max(1, len(vals) - 1)), 1) for d in dens]
        sh['fs']['common_low_crowding'] = crowd
        sh['fs']['common_density_balance'] = [None if d is None else balance(d) for d in dens]
        sh['fr']['geo_density10_km2'] = dens
        json.dump(sh, open(sp, 'w'), separators=(',', ':'), ensure_ascii=False)
        print(cc, n, 'places; median people/km2 within 10 km', vals[len(vals) // 2] if vals else None)


if __name__ == '__main__':
    main()
