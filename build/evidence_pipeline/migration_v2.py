#!/usr/bin/env python3
"""Official ACS county age-migration acquisition, API or table-based bulk.

Raw files are retained. No automatic ranking or publication. Credentials are
read from CENSUS_API_KEY and never written to receipts, source URLs or errors.
The API's metadata endpoints do not require a key. Bulk data are key-free.
"""
from __future__ import annotations
import argparse, csv, datetime as dt, gzip, hashlib, io, json, math, os, re
import shutil, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path

HOSTS = {"api.census.gov", "www2.census.gov"}
AGES = ("65 to 69 years", "70 to 74 years", "75 years and over")
TABLES = ("B07001", "B07401")
LICENSE = "https://www.census.gov/about/policies/copyright.html"
FIELDS = ["record_id", "indicator_id", "geographic_unit", "geographic_code",
          "code_system", "value", "unit", "period", "source_url", "licence",
          "licence_url", "commercial_reuse_status", "hold_reason", "observation_status",
          "source_sha256", "dimensions"]

def sha_file(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for b in iter(lambda: f.read(1024 * 1024), b""): h.update(b)
    return h.hexdigest()

def write_json(path, value):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_name(path.name + ".part")
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")
    temp.replace(path)

def public_url(url):
    u = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((u.scheme, u.netloc, u.path,
        urllib.parse.urlencode([(k, v) for k, v in urllib.parse.parse_qsl(u.query)
                                if k.lower() not in {"key", "api_key", "token"}]), ""))

def approved(url):
    u = urllib.parse.urlsplit(url)
    if u.scheme != "https" or u.hostname not in HOSTS or u.username or u.password:
        raise ValueError("Source or redirect outside the official Census allowlist")

class SafeRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        approved(newurl)  # Validate BEFORE following, not after receiving the bytes.
        old = urllib.parse.urlsplit(req.full_url)
        new = urllib.parse.urlsplit(newurl)
        if old.hostname != new.hostname and any(k.lower() == "key" for k, _ in urllib.parse.parse_qsl(old.query)):
            raise ValueError("Credential-bearing cross-host redirect refused")
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def download(url, target, timeout=30, limit=300_000_000):
    approved(url); target = Path(target); target.parent.mkdir(parents=True, exist_ok=True)
    receipt = target.with_name(target.name + ".receipt.json")
    if target.exists():
        if not receipt.exists(): raise ValueError("Existing source lacks its receipt")
        r = json.loads(receipt.read_text())
        if r.get("source_url") != public_url(url) or r.get("sha256") != sha_file(target):
            raise ValueError("Cached source identity/hash mismatch")
        return target
    part = target.with_name(target.name + ".part"); n = 0; h = hashlib.sha256()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Nestlyzer-evidence-audit/1.0"})
        with urllib.request.build_opener(SafeRedirect()).open(req, timeout=timeout) as res, part.open("wb") as f:
            approved(res.url)
            for b in iter(lambda: res.read(1024 * 1024), b""):
                n += len(b)
                if n > limit: raise ValueError("Official response exceeds the bounded size limit")
                h.update(b); f.write(b)
        if n == 0: raise ValueError("Empty publisher response")
        with part.open("rb") as f: start = f.read(4096).lower().lstrip()
        if start.startswith(b"<!doctype html") or start.startswith(b"<html"):
            raise ValueError("Publisher returned an HTML page, not data; check API key/access")
        part.replace(target)
        write_json(receipt, {"source_url": public_url(url), "bytes": n, "sha256": h.hexdigest(),
                            "retrieved_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                            "credential_stored": False})
    except Exception as exc:
        part.unlink(missing_ok=True)
        # Do not propagate urllib errors containing credential-bearing request URLs.
        raise RuntimeError("Census acquisition failed: " + type(exc).__name__ +
                           "; endpoint=" + public_url(url)) from None
    return target

def select_variables(metadata, table):
    if table not in TABLES: raise ValueError("Unexpected migration table")
    out = {}
    for name, obj in metadata.get("variables", {}).items():
        label = obj.get("label", "")
        age = next((a for a in AGES if label.endswith("!!" + a)), None)
        if name.startswith(table + "_") and name.endswith("E") and label.startswith("Estimate!!") and age:
            moe = name[:-1] + "M"
            if moe not in metadata["variables"]: raise ValueError("Missing MOE metadata")
            out[name] = {"age_band": age, "label": label, "moe": moe}
    expected = 18 if table == "B07001" else 15
    if len(out) != expected or set(v["age_band"] for v in out.values()) != set(AGES):
        raise ValueError("Publisher cohort schema changed; refuse positional guessing")
    return dict(sorted(out.items()))

def published_number(value):
    # Negative Census sentinel codes, non-numeric suppression and empty cells remain missing.
    try: v = float(value)
    except (TypeError, ValueError): return None
    return v if math.isfinite(v) and v >= 0 else None

def api_rows(path, variables):
    payload = json.loads(Path(path).read_text(encoding="utf-8-sig"))
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[0], list):
        raise ValueError("Invalid or empty Census API response")
    head = payload[0]
    required = {"NAME", "state", "county", *variables, *(v["moe"] for v in variables.values())}
    if len(head) != len(set(head)) or not required.issubset(head): raise ValueError("API columns missing/duplicated")
    for row in payload[1:]:
        if len(row) != len(head): raise ValueError("Ragged API row")
        d = dict(zip(head, row)); code = str(d["state"]) + str(d["county"])
        yield code, d.get("NAME", ""), d

def api_name(header):
    # Official Table-Based Summary File uses B07001_E014, API uses B07001_014E.
    m = re.fullmatch(r"(B\d{5})_([EM])(\d{3})", header)
    return f"{m[1]}_{m[3]}{m[2]}" if m else header

def bulk_rows(path, variables):
    # Pipe-delimited file; only whole-county 0500000US geography, not subdivisions/tracts.
    with Path(path).open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f, delimiter="|")
        raw = next(reader, []); head = [api_name(x.strip()) for x in raw]
        required = {"GEO_ID", *variables, *(v["moe"] for v in variables.values())}
        if len(head) != len(set(head)) or not required.issubset(head):
            raise ValueError("Bulk summary-file columns missing/duplicated; wrong release or format")
        gi = head.index("GEO_ID")
        for row in reader:
            if not row: continue
            if len(row) != len(head): raise ValueError("Ragged bulk source row")
            m = re.fullmatch(r"0500000US(\d{5})", row[gi])
            if not m: continue
            d = dict(zip(head, row))
            yield m[1], d.get("NAME", ""), d

def observations(rows, variables, year, table, url, digest):
    seen = set()
    for code, name, values in rows:
        if not re.fullmatch(r"\d{5}", code) or code in seen:
            raise ValueError("Duplicate or invalid official county FIPS")
        seen.add(code)
        for var, meta in variables.items():
            value = published_number(values[var]); moe = published_number(values[meta["moe"]])
            dims = {"age_band": meta["age_band"], "publisher_label": meta["label"],
                    "acs_table": table, "moe90_published": moe, "county_name": name,
                    "cohort": "age 65 and over; not verified retirement/pension status",
                    "statistic": "ACS five-year estimate of prior-year mobility, not five-year accumulated moves",
                    "estimate_period_start": year - 4, "estimate_period_end": year,
                    "retirement_status_observed": False, "municipality_allocation_allowed": False}
            identity = f"US|{code}|{year}|{var}"
            yield dict(zip(FIELDS, [hashlib.sha256(identity.encode()).hexdigest()[:24], var,
                "county", code, "US Census county FIPS", "" if value is None else value,
                "persons", f"{year-4}-{year}", public_url(url), "US federal public domain", LICENSE,
                "Green", "cohort_definition_review;temporal_and_spatial_holdout_required",
                "published_estimate" if value is not None else "missing_or_suppressed", digest,
                json.dumps(dims, sort_keys=True)]))

def acquire(work, year=2024, timeout=30, transport="auto", local_root=None):
    if not 2018 <= year <= dt.date.today().year: raise ValueError("Invalid table-based ACS year")
    work = Path(work); raw = work / "raw"; stage = work / "stage"
    raw.mkdir(parents=True, exist_ok=True); stage.mkdir(parents=True, exist_ok=True)
    key = os.environ.get("CENSUS_API_KEY", "").strip()
    if transport == "auto": transport = "local" if local_root else ("api" if key else "bulk")
    if transport not in {"api", "bulk", "local"}: raise ValueError("Unknown transport")
    if transport == "api" and not key: raise ValueError("CENSUS_API_KEY is required for data queries; use bulk without a key")
    if transport == "local" and not local_root: raise ValueError("Local source directory required")
    all_rows = []; sets = []; receipts = []
    for table in TABLES:
        meta_url = f"https://api.census.gov/data/{year}/acs/acs5/groups/{table}.json"
        meta_path = Path(local_root) / f"{table}_{year}_metadata.json" if transport == "local" else download(meta_url, raw / f"{table}_{year}_metadata.json", timeout)
        variables = select_variables(json.loads(meta_path.read_text()), table)
        bulk_url = f"https://www2.census.gov/programs-surveys/acs/summary_file/{year}/table-based-SF/data/5YRData/acsdt5y{year}-{table.lower()}.dat"
        if transport == "api":
            fields = ["NAME"] + [x for name, v in variables.items() for x in (name, v["moe"])]
            if len(fields) > 50: raise ValueError("API request exceeds column limit")
            url = f"https://api.census.gov/data/{year}/acs/acs5?" + urllib.parse.urlencode({"get": ",".join(fields), "for": "county:*", "key": key})
            source = download(url, raw / f"{table}_{year}.json", timeout)
            iterator = api_rows(source, variables)
        else:
            url = bulk_url
            source = Path(local_root) / f"acsdt5y{year}-{table.lower()}.dat" if transport == "local" else download(url, raw / f"acsdt5y{year}-{table.lower()}.dat", timeout)
            iterator = bulk_rows(source, variables)
        digest = sha_file(source)
        rr = list(observations(iterator, variables, year, table, url, digest))
        if not rr: raise ValueError("No county observations; refuse successful empty output")
        sets.append(set(r["geographic_code"] for r in rr)); all_rows.extend(rr)
        receipts.append({"table": table, "source_url": public_url(url), "sha256": digest,
                         "metadata_source_url": meta_url, "metadata_sha256": sha_file(meta_path),
                         "counties": len(sets[-1]), "observations": len(rr)})
        if transport == "local":
            # Retain byte-exact inputs, never imply this run fetched them online.
            for p in (source, meta_path):
                dst = raw / p.name
                if p.resolve() != dst.resolve(): shutil.copyfile(p, dst)
    if sets[0] != sets[1]: raise ValueError("Inflow/outflow county rosters differ")
    # A deliberately supplied tiny fixture is not accepted as a nationwide successful run.
    if len(sets[0]) < 3000: raise ValueError("Incomplete national county roster; fewer than 3000 counties")
    dest = stage / "US_migration_age65_components.csv.gz"
    temp = dest.with_name(dest.name + ".part")
    with gzip.open(temp, "wt", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS); w.writeheader(); w.writerows(all_rows)
    temp.replace(dest)
    result = {"status": "acquired_staged", "transport": transport, "period": f"{year-4}-{year}",
              "counties": len(sets[0]), "rows": len(all_rows), "sources": receipts,
              "numeric_calibration_enabled": False, "publication_enabled": False,
              "notes": ["Age is not retirement status.", "Retain original estimates and MOE.",
                        "Domestic inflows and outflows require compatible definitions; total movers is not net migration.",
                        "Do not repeat county outcomes across towns in validation.",
                        "Overlapping five-year ACS windows are not independent temporal holdouts."]}
    write_json(stage / "US_migration_manifest.json", result)
    return result

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--work", required=True); p.add_argument("--year", type=int, default=2024)
    p.add_argument("--timeout", type=int, default=30)
    p.add_argument("--transport", choices=["auto", "api", "bulk", "local"], default="auto")
    p.add_argument("--local-root")
    a = p.parse_args()
    try: result = acquire(a.work, a.year, a.timeout, a.transport, a.local_root)
    except Exception as exc:
        result = {"status": "failed", "rows": 0, "error": str(exc), "publication_enabled": False}
    write_json(Path(a.work) / "run_status.json", result)
    print(json.dumps(result, indent=2)); return 0 if result["status"] == "acquired_staged" else 2
if __name__ == "__main__": sys.exit(main())
