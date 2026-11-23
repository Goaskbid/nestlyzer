#!/bin/bash
# r16 (audit NZ-AUD-19): ONE release gate for Nestlyzer. Builds the production artifact, runs every shipped suite plus the
# audit regressions and fault probes against it, and writes a receipt tied to the source and artifact hashes.
#   bash tests/release_gate.sh            (about 90 minutes; exit code 0 only if every step passed)
# Live checks that need the deployed site (Google traffic after consent, real-browser field speed, Search Console) are
# outside this gate and listed in the receipt as external.
cd "$(dirname "$0")/.." || exit 2
export NODE_OPTIONS=--max-old-space-size=5632
LOG=${NZ_GATE_LOG:-/tmp/nz-gate}; mkdir -p "$LOG"; : > "$LOG/results.txt"
SRC_HASH=$(find src build data cloudflare tests package.json package-lock.json -type f ! -path '*/__pycache__/*' ! -path 'tests/results/*' ! -name '*_results.json' -print0 2>/dev/null | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-16)
step(){ n=$1; shift; s=$(date +%s); if timeout 2400 "$@" > "$LOG/$n.log" 2>&1; then r=PASS; else r=FAIL; fi; echo "$r $n ($(( $(date +%s)-s ))s) :: $(tail -1 "$LOG/$n.log" | cut -c1-160)" | tee -a "$LOG/results.txt"; }
# 1. production build
step build node build/build_site.mjs
step public node build/public.mjs _site
step standalone_split env NZ_SPLIT=1 node build/standalone.mjs
step standalone_live env NZ_SINGLE_LIVE=1 node build/standalone.mjs
# 2. unit suites, audit regressions and fault probes
step npm npm test
step node_suites bash -c 'node --test tests/*.test.cjs tests/*.test.mjs tests/evidence_retry/context_labels.test.cjs tests/evidence_retry/static_assets.test.mjs build/test_seo.mjs'
step worker_faults node cloudflare/test-worker-faults.mjs
# 3. browser and artifact suites (local server on port 8787 mimics GitHub Pages)
(node tests/serve.mjs . 8787 > "$LOG/serve.log" 2>&1 &) ; sleep 2
for t in test_v28 split_test test_v27 test_v26 test_v25 test_v29 test_v210 test_v2103 test_v211 regress test_flat test_v2122 test_v2124 test_v213 test_v2133 test_mobile_journey test_world test_compare_upgrade data_use_trace world_benchmark test_arms test_evidence_ui test_everyday_prices test_politics test_map_picker test_context_2026_11_18 test_thumb_steps test_quick_wins test_r8_data test_r11_data test_rankings_layout test_ip_protection test_intermodal test_keep_published test_r13_arms test_r14_records boom_audit test_emblem_trail; do step "$t" python3 "tests/$t.py"; done
step smoke_repo python3 tests/smoke.py .
step smoke_site python3 tests/smoke.py _site
step voice python3 tests/test_r15_voice.py _site
step city_maps python3 tests/test_city_maps.py _site
step seovis python3 tests/test_seo_visibility.py _site
step swupgrade python3 tests/test_sw_upgrade.py _site tests/fixtures/sw_2.15.30_r5.js
step profiles node tests/profile_audit.js
step sanity node tests/profile_sanity.js
step evidence node tests/evidence_audit.js
step cloudflare_pack bash -c 'node cloudflare/pack.mjs _site /tmp/nz_cf_site && node cloudflare/test-worker.mjs _site /tmp/nz_cf_site'
step cloudflare_deploy bash tests/cloudflare_deploy_check.sh
step links python3 tests/test_release_links.py
step strict_crawl python3 build/validate_seo.py --site _site --registry .cache/seo/registry.json --report "$LOG/strict-crawl.json" --max-bytes 850000000
if [ -d "${NZ_PREVIOUS_LIVE:-/nonexistent}" ]; then step livesim python3 tests/livesim.py "$NZ_PREVIOUS_LIVE" dist/site; else echo "SKIP livesim :: needs NZ_PREVIOUS_LIVE (a checkout of the live repository)" | tee -a "$LOG/results.txt"; fi
pkill -f "[s]erve.mjs . 8787"
ART_HASH=$(cd _site && find . -type f -print0 | sort -z | xargs -0 sha256sum | sha256sum | cut -c1-16)
PASS=$(grep -c '^PASS' "$LOG/results.txt"); FAIL=$(grep -c '^FAIL' "$LOG/results.txt")
python3 - "$LOG" "$SRC_HASH" "$ART_HASH" "$PASS" "$FAIL" <<'PY'
import json, sys, os, datetime
log, src, art, p, f = sys.argv[1:6]
rows = [l.rstrip('\n') for l in open(os.path.join(log, 'results.txt'))]
rec = {'command': 'bash tests/release_gate.sh', 'when': datetime.datetime.utcnow().isoformat() + 'Z', 'source_hash': src, 'artifact_hash': art,
       'passed': int(p), 'failed': int(f), 'steps': rows,
       'external_checks': ['Google requests after consent withdrawal on the live domain', 'field Core Web Vitals', 'Search Console indexing',
                           'Cloudflare cutover responses (after the switch)']}
os.makedirs('docs/audit', exist_ok=True); json.dump(rec, open('docs/audit/release_gate_receipt.json', 'w'), indent=1)
print('RELEASE GATE:', 'PASS' if int(f) == 0 else 'FAIL', f'({p} passed, {f} failed, source {src}, artifact {art})')
PY
[ "$FAIL" = 0 ]
