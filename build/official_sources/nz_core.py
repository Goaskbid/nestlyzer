"""Shared, conservative data primitives. No function publishes or changes site scores."""
from __future__ import annotations
import contextlib, csv, datetime as dt, gzip, hashlib, io, json, math, re, sqlite3, time, urllib.error, urllib.parse, urllib.request, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
FIELDS = ['record_id','cc','geo_id','geo_name','geo_level','boundary_vintage','indicator_id','label','period','value','unit','statistical_universe','dimensions','source_id','source_url','source_release','retrieved_at','acquisition_method','observation_status','quality_flags','ingestion_status','score_eligible','publication_approved','hold_reasons','source_sha256']
APPROVAL_FIELDS = ['record_id','publication_approved','score_eligible','factor_id','domain','current_for_purpose','reviewer','evidence']

def js(value): return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',',':'))
def today(): return dt.datetime.now(dt.timezone.utc).date().isoformat()
def sha(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
    return h.hexdigest()
def jsonwrite(path, obj):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    part=path.with_suffix(path.suffix+'.part'); part.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');part.replace(path)
def truth(x): return str(x).strip().lower() in ('true','1','yes')
def number(value, *, decimal_comma=False, nonnegative=False):
    """Null symbols stay null. An empty value is never zero."""
    if value is None: return None, 'missing'
    s=str(value).strip().replace('\u00a0','').replace('\u202f','')
    if s in ('','NA','N/A','N/D','null','None','nan','NaN','..','...','(X)','X','x','*','**','***','-','--'):
        return None, 'suppressed' if s in ('x','X','*','**','***') else 'missing_or_not_applicable'
    if decimal_comma: s=s.replace(',','.')
    try: n=float(s)
    except (ValueError,TypeError): return None,'unparsed_source_value'
    if not math.isfinite(n): return None,'nonfinite_source_value'
    if nonnegative and n<0: return None,'negative_sentinel_or_invalid'
    return n,'published'

def observation(*, cc, geo_id, geo_name, geo_level, boundary, indicator, label, period, value, unit, source, url, release, dims=None, flags=None, status='published', universe='', source_hash='', holds=None):
    if value is not None and not math.isfinite(float(value)): raise ValueError('Nonfinite observation')
    if value is None and status=='published': raise ValueError('Null observation requires missing status')
    if not str(period) or not str(unit): raise ValueError('Period and unit are required')
    d=dims or {}
    # Identity excludes raw content hashes, retrieval dates and raw value. Revisions conflict explicitly.
    key=[cc,geo_id,str(boundary),indicator,str(period),d,source]
    r={k:'' for k in FIELDS}
    r.update(record_id=hashlib.sha256(js(key).encode()).hexdigest()[:32],cc=cc,geo_id=geo_id,geo_name=geo_name,geo_level=geo_level,boundary_vintage=str(boundary),indicator_id=indicator,label=label,period=str(period),value='' if value is None else format(float(value),'.15g'),unit=unit,statistical_universe=universe,dimensions=js(d),source_id=source,source_url=url,source_release=str(release),retrieved_at=today(),acquisition_method='official_source_adapter',observation_status=status,quality_flags=js(flags or []),ingestion_status='held_for_review',score_eligible='False',publication_approved='False',hold_reasons=js(holds or ['concept_and_geography_review','publication_approval_required']),source_sha256=source_hash)
    return r

@contextlib.contextmanager
def textopen(path, mode='rt'):
    path=Path(path)
    opener=gzip.open if path.suffix=='.gz' else open
    with opener(path,mode,encoding='utf-8-sig' if 'r' in mode else 'utf-8',newline='') as f: yield f

def readcsv(path):
    with textopen(path) as f: yield from csv.DictReader(f)

def writecsv(path, rows, fields=None, check_ids=False):
    path=Path(path)
    if path.exists(): raise FileExistsError('Refusing to overwrite '+str(path))
    path.parent.mkdir(parents=True,exist_ok=True)
    tmp=path.with_name(path.name+'.part'+('.gz' if path.suffix=='.gz' else ''))
    db=sqlite3.connect('') if check_ids else None
    if db:
        db.execute('PRAGMA journal_mode=OFF');db.execute('CREATE TABLE seen(id TEXT PRIMARY KEY, val TEXT)')
    count=0; numeric=0
    try:
        with textopen(tmp,'wt') as f:
            w=csv.DictWriter(f,fieldnames=fields or FIELDS);w.writeheader()
            for r in rows:
                if db:
                    try: db.execute('INSERT INTO seen VALUES (?,?)',(r['record_id'],r.get('value','')))
                    except sqlite3.IntegrityError: raise ValueError('Duplicate observation identity; inspect source dimensions: '+r['record_id'])
                w.writerow(r);count+=1;numeric+=bool(r.get('value',''))
        if count==0: raise ValueError('No rows produced; refusing an empty successful release')
        tmp.replace(path)
    finally:
        if tmp.exists(): tmp.unlink()
        if db: db.close()
    return {'rows':count,'numeric':numeric,'output':str(path),'sha256':sha(path),'publication_approved':0,'score_eligible':0}

class Client:
    """HTTPS requests with official-host allowlist, immutable raw cache and receipts."""
    def __init__(self, cache, delay=0.75, timeout=180):
        self.cache=Path(cache);self.cache.mkdir(parents=True,exist_ok=True)
        self.delay=delay;self.timeout=timeout;self.last=0
    def request(self,url,*,payload=None,name=None,max_bytes=2_000_000_000,headers=None,refresh=False):
        parsed=urllib.parse.urlparse(url)
        roots=('insee.fr','census.gov','statcan.gc.ca','abs.gov.au','ibge.gov.br','inegi.org.mx','admin.ch')
        if parsed.scheme!='https' or not any(parsed.hostname==x or parsed.hostname.endswith('.'+x) for x in roots):
            raise ValueError('Non-official or non-HTTPS host refused: '+str(parsed.hostname))
        body=None if payload is None else js(payload).encode()
        identity=hashlib.sha256(url.encode()+b'\n'+(body or b'')).hexdigest()
        path=self.cache/(name or identity+'.raw');receipt=path.with_name(path.name+'.receipt.json')
        if path.exists() and receipt.exists() and not refresh:
            meta=json.loads(receipt.read_text());
            if meta.get('request_id')!=identity or meta.get('sha256')!=sha(path): raise ValueError('Cache request/checksum mismatch: '+str(path))
            return path,meta
        if path.exists(): raise FileExistsError('Use a fresh cache directory for refreshed data: '+str(path))
        h={'User-Agent':'Nestlyzer-Official-Data/2.0 (+https://nestlyzer.com)','Accept':'*/*'}
        if body is not None:h['Content-Type']='application/json'
        h.update(headers or {})
        for attempt in range(4):
            wait=self.delay-(time.monotonic()-self.last)
            if wait>0:time.sleep(wait)
            tmp=path.with_name(path.name+'.part');total=0;digest=hashlib.sha256()
            try:
                self.last=time.monotonic()
                req=urllib.request.Request(url,data=body,headers=h)
                with urllib.request.urlopen(req,timeout=self.timeout) as response,tmp.open('wb') as f:
                    final=urllib.parse.urlparse(response.url)
                    if final.scheme!='https' or not any(final.hostname==x or final.hostname.endswith('.'+x) for x in roots):raise ValueError('Unexpected redirect')
                    ct=response.headers.get('Content-Type','')
                    if 'text/html' in ct.lower():raise ValueError('HTML returned instead of data; no parsing as statistics')
                    for b in iter(lambda:response.read(1024*1024),b''):
                        total+=len(b)
                        if total>max_bytes:raise ValueError('Configured download size exceeded')
                        digest.update(b);f.write(b)
                    hdr={k:response.headers.get(k) for k in ('Content-Type','Last-Modified','ETag')}
                if total==0:raise ValueError('Empty response')
                tmp.replace(path)
                meta={'request_id':identity,'source_url':url,'request':payload,'retrieved_at':today(),'bytes':total,'sha256':digest.hexdigest(),'headers':hdr,'status':'downloaded_not_approved'}
                jsonwrite(receipt,meta);return path,meta
            except urllib.error.HTTPError as e:
                if e.code not in (429,500,502,503,504) or attempt==3:raise
                retry=e.headers.get('Retry-After','')
                time.sleep(min(120,float(retry)) if retry.isdigit() else 2**(attempt+1))
            finally:
                if tmp.exists():tmp.unlink()
        raise RuntimeError('Request retries exhausted')
    def json(self,url,**kwargs):
        p,meta=self.request(url,**kwargs)
        with p.open(encoding='utf-8-sig') as f:data=json.load(f)
        return data,meta

def csv_members(path, required, encoding='utf-8-sig', delimiter=None):
    """Stream matching CSV members. Never extracts a ZIP onto the filesystem."""
    path=Path(path);found=False
    def read(raw):
        nonlocal found
        with io.TextIOWrapper(raw,encoding=encoding,newline='') as text:
            first=text.readline()
            sep=delimiter or (';' if first.count(';')>first.count(',') else ',')
            head=next(csv.reader([first],delimiter=sep))
            if not set(required).issubset(head):return
            found=True
            for values in csv.reader(text,delimiter=sep):
                if len(values)!=len(head):raise ValueError('Ragged CSV row')
                yield head,values
    if zipfile.is_zipfile(path):
        with zipfile.ZipFile(path) as z:
            for item in z.infolist():
                if item.filename.lower().endswith(('.csv','.txt','.dat')):
                    if item.file_size>12_000_000_000:raise ValueError('Unexpectedly large ZIP member')
                    with z.open(item) as raw:yield from read(raw)
    else:
        with path.open('rb') as raw:yield from read(raw)
    if not found:raise ValueError('No file has required schema: '+','.join(required))

def clean_code(value,width=None):
    s=str(value).strip()
    if s.endswith('.0') and s[:-2].isdigit():s=s[:-2]
    if not s.isdigit():raise ValueError('Non-numeric official code: '+s)
    return s.zfill(width) if width else str(int(s))
