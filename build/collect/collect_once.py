#!/usr/bin/env python3
"""Bounded, read-only source capture. No scoring, publication, invented values or CI jobs.

A failed request remains a failed request. HTML error documents are never data files.
Run on a machine with direct access to the named publishers. Python 3.10+, stdlib only.
"""
from __future__ import annotations
import argparse, csv, datetime as dt, gzip, hashlib, io, json, os, re, socket, ssl
import tempfile, time, urllib.error, urllib.parse, urllib.request, zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

VERSION = '2026-11-19.1'
UA = 'Nestlyzer-Official-Data-Intake/1.0 (user-initiated; bounded requests)'
NUMERIC = re.compile(r'^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$')
MISSING = {'', ':', '..', '...', 'NA', 'N/A', 'null', 'NaN', '-'}

def now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()

def safe_name(value: str) -> str:
    if not re.fullmatch(r'[A-Za-z0-9_.-]+', value) or value in {'.','..'}:
        raise ValueError('Unsafe identifier')
    return value

def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

def parse_numeric(text: Any, decimal_comma: bool = False) -> tuple[float | None, str]:
    """A real zero survives. No thousands separators or band midpoints are inferred."""
    if text is None: return None, 'missing'
    if isinstance(text, bool): raise ValueError('Boolean is not an observation')
    raw = str(text).strip()
    if raw in MISSING or raw.startswith(': '): return None, raw or 'missing'
    candidate = raw.replace(',', '.') if decimal_comma else raw
    if not NUMERIC.fullmatch(candidate): raise ValueError('Non-numeric observation: '+raw)
    x = float(candidate)
    if x != x or abs(x) == float('inf'): raise ValueError('Nonfinite observation')
    return x, ''

def check_payload(path: Path, kind: str) -> dict:
    with path.open('rb') as f: head=f.read(512)
    low=head.lstrip().lower()
    if kind not in {'html','discovery'} and (low.startswith(b'<!doctype html') or low.startswith(b'<html')):
        raise ValueError('HTML returned instead of dataset')
    if kind=='json':
        obj=json.loads(path.read_text(encoding='utf-8-sig'))
        if isinstance(obj,dict) and ('error' in obj or obj.get('success') is False):
            raise ValueError('JSON error response, not dataset')
        return {'format':'json','root_type':type(obj).__name__}
    if kind=='csv_or_zip':
        return check_payload(path, 'zip' if head.startswith(b'PK') else 'csv')
    if kind=='text':
        if b'\x00' in head: raise ValueError('NUL in text document')
        return {'format':'text','data_payload':False}
    if kind=='zip':
        with zipfile.ZipFile(path) as z:
            if len(z.infolist())>50000: raise ValueError('Excess archive members')
            total=sum(x.file_size for x in z.infolist())
            if total>4_000_000_000: raise ValueError('Expanded archive exceeds safety limit')
            for x in z.infolist():
                if x.filename.startswith(('/', '\\')) or '..' in Path(x.filename.replace('\\','/')).parts:
                    raise ValueError('Unsafe archive path')
                if ((x.external_attr >> 16) & 0o170000)==0o120000: raise ValueError('Symlink in archive')
            bad=z.testzip()
            if bad: raise ValueError('Archive CRC error: '+bad)
        return {'format':'zip','members':len(z.infolist()),'expanded_bytes':total}
    if kind=='tsv.gz':
        if not head.startswith(b'\x1f\x8b'): raise ValueError('Not gzip')
        with gzip.open(path,'rt',encoding='utf-8-sig') as f:
            first=f.readline()
            if '\\TIME_PERIOD' not in first and '\\time' not in first.lower():
                raise ValueError('Eurostat dimension header absent')
        return {'format':'tsv.gz','header':first.strip()[:1000]}
    if kind in {'csv','tsv'}:
        text=head.decode('utf-8-sig',errors='replace')
        if '\x00' in text or not any(x in text for x in [';',',','\t']):
            raise ValueError('No delimited-text header')
        return {'format':kind,'header':text.splitlines()[0][:1000]}
    if kind=='parquet':
        with path.open('rb') as f:
            f.seek(-4,os.SEEK_END); tail=f.read()
        if not head.startswith(b'PAR1') or tail!=b'PAR1': raise ValueError('Not Parquet')
        return {'format':'parquet'}
    if kind in {'html','discovery'}: return {'format':'html_or_metadata','data_payload':False}
    if kind=='xlsx':
        with zipfile.ZipFile(path) as z:
            if '[Content_Types].xml' not in z.namelist(): raise ValueError('Not XLSX')
        return {'format':'xlsx'}
    raise ValueError('Unrecognised expected format')

class RestrictRedirect(urllib.request.HTTPRedirectHandler):
    def __init__(self, hosts: set[str]): self.hosts=hosts
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if urllib.parse.urlsplit(newurl).hostname not in self.hosts:
            raise ValueError('Unapproved redirect host: '+str(urllib.parse.urlsplit(newurl).hostname))
        return super().redirect_request(req,fp,code,msg,headers,newurl)

def fetch(job: dict, root: Path, timeout: float, attempts: int = 1) -> dict:
    ident=safe_name(job['id']); url=job['url']; parsed=urllib.parse.urlsplit(url)
    hosts=set(job.get('allowed_hosts',[]))|{parsed.hostname}
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError('Only explicit HTTPS publisher URLs are accepted')
    out=root/'originals';out.mkdir(parents=True,exist_ok=True)
    tmp=out/(ident+'.download.part'); dest=out/(ident+'.'+job['extension'])
    rec={'source_id':ident,'request_url':url,'retrieved_at':now(),'status':'not_acquired',
         'kind':job['kind'],'payload_role':job.get('role','data'),'attempts':[],
         'licence_status':job.get('licence_status','unverified'),
         'publication_approved':False,'score_eligible':False,'collector_version':VERSION}
    opener=urllib.request.build_opener(RestrictRedirect(hosts))
    for attempt in range(attempts):
        started=time.monotonic()
        try:
            req=urllib.request.Request(url,headers={'User-Agent':UA,'Accept-Encoding':'identity'})
            with opener.open(req,timeout=timeout) as r, tmp.open('wb') as f:
                if r.status != 200: raise ValueError('Unexpected HTTP status: '+str(r.status))
                n=0; limit=int(job.get('max_bytes',250_000_000))
                while True:
                    chunk=r.read(1024*1024)
                    if not chunk: break
                    n+=len(chunk)
                    if n>limit: raise ValueError('Payload exceeds declared byte budget')
                    f.write(chunk)
                status=r.status; effective=r.url; headers=dict(r.headers.items())
                declared=r.headers.get('Content-Length')
                if declared is not None and int(declared)!=n: raise ValueError('Content-Length mismatch')
            if not n: raise ValueError('Empty payload')
            validation=check_payload(tmp,job['kind'])
            sha=digest(tmp)
            if dest.exists() and digest(dest)!=sha:
                dest=out/(ident+'.'+sha[:12]+'.'+job['extension'])
            if not dest.exists(): tmp.replace(dest)
            else: tmp.unlink(missing_ok=True)
            rec.update(status='acquired_format_checked',http_status=status,effective_url=effective,
                       bytes=n,sha256=sha,path=str(dest.relative_to(root)),headers=headers,
                       format_check=validation)
            rec['attempts'].append({'number':attempt+1,'elapsed_seconds':round(time.monotonic()-started,3),'result':'success'})
            break
        except Exception as exc:
            tmp.unlink(missing_ok=True)
            rec['attempts'].append({'number':attempt+1,'elapsed_seconds':round(time.monotonic()-started,3),
                                    'error_type':type(exc).__name__,'message':str(exc)[:1200]})
            # No repeated DNS requests or access-control circumvention.
            reason=getattr(exc,'reason',None)
            if isinstance(reason,socket.gaierror) or isinstance(exc,(ValueError,urllib.error.HTTPError)):
                break
            if attempt+1<attempts: time.sleep(1)
    return rec

def read_eurostat(path: Path):
    """Yield source-native observations, all dimensions intact; no geographic assumptions."""
    with gzip.open(path,'rt',encoding='utf-8-sig',newline='') as f:
        reader=csv.reader(f,delimiter='\t'); header=next(reader)
        first=header[0]; split='\\TIME_PERIOD' if '\\TIME_PERIOD' in first else '\\time'
        if split not in first: raise ValueError('Unknown Eurostat header')
        dims=first.split(split)[0].split(','); periods=[x.strip() for x in header[1:]]
        if len(set(dims))!=len(dims) or len(set(periods))!=len(periods): raise ValueError('Duplicate dimensions/periods')
        for row_no,row in enumerate(reader,2):
            if not row: continue
            if len(row)!=len(header): raise ValueError(f'Width mismatch at row {row_no}')
            values=row[0].split(',')
            if len(values)!=len(dims): raise ValueError('Dimension tuple mismatch')
            dimension=dict(zip(dims,values))
            for period,cell in zip(periods,row[1:]):
                pieces=cell.strip().split(maxsplit=1)
                raw=pieces[0] if pieces else ''
                flags=pieces[1] if len(pieces)>1 else ''
                value,missing=parse_numeric(raw)
                yield {'dimensions':dimension,'period':period,'raw':cell,'value':value,
                       'flags':flags,'missing_status':missing,'source_row':row_no}

def read_ine(path: Path):
    data=json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(data,list) or not data: raise ValueError('INE root must be nonempty list')
    for block in data:
        if not {'IndicadorCod','Dados'} <= set(block): raise ValueError('INE schema not recognised')
        for period,rows in block['Dados'].items():
            for i,row in enumerate(rows):
                if not {'geocod','geodsg'} <= set(row): raise ValueError('Geography missing')
                # Do not choose a geography level by name or guessed code truncation.
                value,missing=parse_numeric(row.get('valor'))
                yield {'dataset_id':block['IndicadorCod'],'period':period,
                       'source_geo_code':str(row['geocod']),'source_geo_label':row['geodsg'],
                       'value':value,'missing_status':missing,'source_fields':row,
                       'last_updated':block.get('DataUltimoAtualizacao'),
                       'extraction_timestamp':block.get('DataExtracao'),
                       'source_row':i+1,'geographic_level':'requires_publisher_dictionary'}

def normalize(acquisitions: list[dict], root: Path) -> dict:
    target=root/'staging';target.mkdir(exist_ok=True)
    summary={}
    for rec in acquisitions:
        if rec['status']!='acquired_format_checked' or rec['payload_role']!='data': continue
        source=root/rec['path']; ident=rec['source_id']
        iterator=None
        if rec['kind']=='tsv.gz': iterator=read_eurostat(source)
        elif ident.startswith('PT_INE_') and rec['kind']=='json': iterator=read_ine(source)
        if iterator is None:
            summary[ident]={'status':'original_preserved_native_adapter_review_required','new_observations':0};continue
        dest=target/(ident+'.jsonl.gz');tmp=target/(ident+'.jsonl.gz.part');n=missing=0
        try:
            with gzip.open(tmp,'wt',encoding='utf8') as f:
                for row in iterator:
                    row.update(source_id=ident,source_url=rec['request_url'],source_sha256=rec['sha256'],
                               acquisition_method='official_download',publication_approved=False,score_eligible=False)
                    f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
                    n+=1; missing+=(row['value'] is None)
            tmp.replace(dest)
            summary[ident]={'status':'staged_not_published','rows':n,'numeric_rows':n-missing,
                            'missing_rows':missing,'path':str(dest.relative_to(root)),'sha256':digest(dest)}
        except Exception as exc:
            tmp.unlink(missing_ok=True)
            summary[ident]={'status':'native_schema_requires_review','error':str(exc),'new_observations':0}
    return summary

def make_bundle(root: Path, dest: Path):
    manifest={}
    for p in sorted(root.rglob('*')):
        if p.is_file() and p.name!='MANIFEST.json' and p.resolve()!=dest.resolve():
            manifest[str(p.relative_to(root))]={'sha256':digest(p),'bytes':p.stat().st_size}
    (root/'MANIFEST.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
    with zipfile.ZipFile(dest,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for p in sorted(root.rglob('*')):
            if p.is_file() and p.resolve()!=dest.resolve(): z.write(p,str(p.relative_to(root)))
    with zipfile.ZipFile(dest) as z:
        for name,info in manifest.items():
            if hashlib.sha256(z.read(name)).hexdigest()!=info['sha256']: raise RuntimeError('Bundle verification failed')
    return {'path':str(dest),'sha256':digest(dest),'bytes':dest.stat().st_size,'payload_files':len(manifest)}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--plan',type=Path,required=True)
    parser.add_argument('--out',type=Path,required=True)
    parser.add_argument('--only',nargs='*',default=[])
    parser.add_argument('--timeout',type=float,default=40)
    parser.add_argument('--workers',type=int,default=2,choices=[1,2,3])
    parser.add_argument('--attempts',type=int,default=1,choices=[1,2])
    parser.add_argument('--zip',type=Path)
    args=parser.parse_args()
    jobs=json.loads(args.plan.read_text())['jobs']
    if args.only:
        known={x['id'] for x in jobs}; unknown=set(args.only)-known
        if unknown: parser.error('Unknown source IDs: '+','.join(sorted(unknown)))
        jobs=[x for x in jobs if x['id'] in args.only]
    args.out.mkdir(parents=True,exist_ok=True)
    (args.out/'receipts').mkdir(exist_ok=True)
    acquisitions=[]
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs=[pool.submit(fetch,job,args.out,args.timeout,args.attempts) for job in jobs]
        for fut in as_completed(futs):
            rec=fut.result();acquisitions.append(rec)
            (args.out/'receipts'/(rec['source_id']+'.json')).write_text(json.dumps(rec,indent=2),encoding='utf8')
            print(rec['source_id'],rec['status'],flush=True)
    acquisitions.sort(key=lambda x:x['source_id'])
    staging=normalize(acquisitions,args.out)
    numerical=sum(v.get('numeric_rows',0) for v in staging.values())
    status={'finished_at':now(),'sources_attempted':len(acquisitions),
            'original_data_files_acquired':sum(r['status']=='acquired_format_checked' and r['payload_role']=='data' for r in acquisitions),
            'metadata_or_snapshot_files_acquired':sum(r['status']=='acquired_format_checked' and r['payload_role']!='data' for r in acquisitions),
            'source_native_numeric_cells_staged':numerical,'validated_place_joins':0,'production_changes':0,
            'all_data_gaps_closed':False,'live_gap_audit_completed':False,
            'staging':staging,'acquisitions':acquisitions,
            'limitations':['Format checks are not semantic validation or permission to publish.',
              'No name-based joins; place matching requires publisher keys, geographic vintage and official crosswalks.',
              'HTML snapshots cannot verify JavaScript journeys or current scoring.',
              'All configured sources attempted is not all countries or all gaps completed.']}
    (args.out/'RUN_STATUS.json').write_text(json.dumps(status,indent=2),encoding='utf8')
    if args.zip: print(json.dumps(make_bundle(args.out,args.zip),indent=2))
    failed=sum(r['status']!='acquired_format_checked' for r in acquisitions)
    print(json.dumps({'failed_sources':failed,'original_data_files_acquired':status['original_data_files_acquired'],
                      'numeric_cells_staged':numerical,'production_changes':0},indent=2))
    return 2 if failed else 0

if __name__=='__main__': raise SystemExit(main())
