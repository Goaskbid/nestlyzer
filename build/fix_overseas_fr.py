#!/usr/bin/env python3
"""r15 data fix: the 130 places in France's overseas departments (Guadeloupe, Martinique, French Guiana, Reunion,
Mayotte) had their sea distance and other geography measured against the coast and networks of mainland Europe,
so Reunion seaside towns showed 4,000 km to the sea. Sea distance is re-measured on the Natural Earth 1:50m land
outline (public domain); distances that cannot be re-measured offline are cleared (unknown), never kept wrong.
Idempotent. Run: python3 build/fix_overseas_fr.py --write"""
import json, math, sys
import numpy as np
from scipy.spatial import cKDTree
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
t=json.load(open(ROOT+'/build/source/natural-earth_land-50m.topo.json'))
sx,sy=t['transform']['scale']; tx,ty=t['transform']['translate']
arcs=[]
for a in t['arcs']:
    x=y=0; pts=[]
    for dx,dy in a: x+=dx; y+=dy; pts.append((x*sx+tx, y*sy+ty))
    arcs.append(pts)
# every land boundary arc, densified to <=1 km steps, inside the tropics window that holds the overseas departments
P=[]
for pts in arcs:
    for (x0,y0),(x1,y1) in zip(pts,pts[1:]):
        if not (-70<x0<60 and -30<y0<20): continue
        d=math.hypot((x1-x0)*111.32*math.cos(math.radians(y0)),(y1-y0)*110.57); n=max(1,int(d))
        for k in range(n): P.append((x0+(x1-x0)*k/n, y0+(y1-y0)*k/n))
P=np.array(P); R=6371.0088
def xyz(lo,la):
    lo=np.radians(lo); la=np.radians(la); return np.c_[np.cos(la)*np.cos(lo),np.cos(la)*np.sin(lo),np.sin(la)]
tree=cKDTree(xyz(P[:,0],P[:,1]))
f=ROOT+'/data/c/FR.json'; d=json.load(open(f)); ci={k:i for i,k in enumerate(d['cols'])}
xf=ROOT+'/data/x/FR.json'; x=json.load(open(xf))
idx=[i for i,r in enumerate(d['rows']) if r[ci['lat']] is not None and not (20<r[ci['lat']]<80 and -40<r[ci['lon']]<55)]
q=xyz(np.array([d['rows'][i][ci['lon']] for i in idx]),np.array([d['rows'][i][ci['lat']] for i in idx]))
dist,_=tree.query(q); km=2*R*np.arcsin(np.minimum(1,dist/2))
lin=lambda v: max(0.0,min(100.0,100.0*(60-v)/58))
out=[]
for i,k in zip(idx,km):
    k=round(float(k),1); old=d['fr']['geo_coast_km'][i]
    d['fr']['geo_coast_km'][i]=k; d['fr']['geo_shore_km'][i]=k; d['fs']['geo_coast_km'][i]=round(lin(k),1)
    for col in ('sea','shore'):
        if col in x['cols'] and x['cols'][col][i] is not None: x['cols'][col][i]=None
    # distances that were measured against mainland Europe (thousands of km) are unknown here, not real: cleared
    for a,b in (('geo_hub_airport_km','geo_hub_airport_km'),('geo_airport_km',None),('geo_major_city_km','geo_major_city_km'),('commuter_anchor_km','commuter_access_v2'),('student_anchor_km','student_access_v2')):
        v=d['fr'].get(a)
        if v is not None and v[i] is not None and v[i]>1500:
            v[i]=None
            if b and b in d['fs']: d['fs'][b][i]=None
    for a,names in (('lake_km',('lake',)),('river_km',('river',)),('rail_km',()),('mway_km',()),('port_km',('port',)),('border_km',('border',)),('iport_km',('iport',)),('mport_km',('mport',)),('chem_km',('chem',))):
        v=x['cols'].get(a)
        if v is not None and v[i] is not None and v[i]>1500:
            v[i]=None
            for nm_ in names:
                if nm_ in x['cols']: x['cols'][nm_][i]=None
    for a in ('reach100k','reach300k'):
        v=x['cols'].get(a)
        if v is not None and v[i] is not None and v[i]>300: v[i]=None
    out.append((d['rows'][i][ci['name']],old,k))
print(len(out)); print(sorted(out,key=lambda o:-o[2])[:6]); print(out[:4])
if '--write' in sys.argv:
    json.dump(d,open(f,'w'),separators=(',',':'),ensure_ascii=False); json.dump(x,open(xf,'w',encoding='utf-8'),separators=(',',':'),ensure_ascii=False); print('written')
