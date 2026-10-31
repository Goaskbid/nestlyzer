#!/usr/bin/env python3
"""Hexagon land cells for the Business globe (run once; output kept in build/source/business/).

A hexagonal grid of points every 1.6 degrees of arc on the sphere, kept where it falls on land, each tagged with the
country it lies in. Source: Natural Earth 1:110m admin-0 countries (public domain).
Output: globe_hex.json = {"step": 1.6, "cells": [[lon, lat, "CC"], ...]} with CC as ISO 3166-1 alpha-2 ('' at sea edges)."""
import json, math, os, sys
from shapely.geometry import shape, Point
from shapely.strtree import STRtree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from geo_util import ne_path

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
feats = json.load(open(ne_path('ne_110m_admin_0_countries')))['features']
polys, codes = [], []
for f in feats:
    p = f['properties']; cc = p.get('ISO_A2_EH') or p.get('ISO_A2') or ''
    if cc in ('-99', '-1'): cc = ''
    polys.append(shape(f['geometry'])); codes.append(cc)
tree = STRtree(polys)
STEP = 1.6
cells = []
row = 0
lat = -84.0
while lat <= 84.0:
    dlon = STEP / max(0.05, math.cos(math.radians(lat)))
    off = (dlon / 2) if row % 2 else 0
    lon = -180.0 + off
    while lon < 180.0:
        pt = Point(lon, lat)
        for i in tree.query(pt):
            if polys[i].contains(pt):
                cells.append([round(lon, 2), round(lat, 2), codes[i]]); break
        lon += dlon
    lat += STEP * math.sqrt(3) / 2; row += 1
out = os.path.join(ROOT, 'build', 'source', 'business', 'globe_hex.json')
json.dump({'step': STEP, 'source': 'Natural Earth 1:110m admin-0 countries (public domain)', 'cells': cells}, open(out, 'w'), separators=(',', ':'))
print(len(cells), 'land cells', os.path.getsize(out), 'bytes')
