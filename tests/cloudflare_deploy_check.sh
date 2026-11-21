#!/usr/bin/env bash
# 2.15.30-r11: the Cloudflare copy, tested on Cloudflare's own runtime (wrangler dev) with the real packed site.
# Needs _site built. Checks: pack within limits, Worker byte-identical, both configs pass wrangler's dry run,
# and live probes (home, sitemap, robots, TDM file, place pages, 404s, slash redirect, headers).
#   bash tests/cloudflare_deploy_check.sh
set -u; cd "$(dirname "$0")/.."; W="npx --yes wrangler@4.151.3"; P=8788; B=http://127.0.0.1:$P; fail=0
ok(){ echo "ok   $1"; }; no(){ echo "FAIL $1"; fail=1; }
node cloudflare/pack.mjs _site cf_site > /tmp/cfp.log 2>&1 && grep -q '"limit_ok":true' /tmp/cfp.log && ok "pack: $(cat /tmp/cfp.log)" || no "pack"
node cloudflare/test-worker.mjs _site cf_site > /tmp/cft.log 2>&1 && ok "worker byte-identical: $(cat /tmp/cft.log)" || no "worker: $(cat /tmp/cft.log)"
for c in wrangler.jsonc wrangler.live.jsonc; do $W deploy --dry-run --outdir /tmp/wdry --config cloudflare/$c > /tmp/cfd.log 2>&1 && ok "dry run $c" || no "dry run $c: $(tail -3 /tmp/cfd.log)"; done
grep -q '"pattern": "nestlyzer.com", "custom_domain": true' cloudflare/wrangler.live.jsonc && ! grep -q routes cloudflare/wrangler.jsonc && ok "domain only in the live config" || no "domain config"
$W dev --config cloudflare/wrangler.jsonc --port $P --ip 127.0.0.1 > /tmp/wdev.log 2>&1 & DP=$!
for i in $(seq 1 80); do curl -s -o /dev/null $B/VERSION.txt && break; sleep 3; done
s(){ curl -s -o /dev/null -w '%{http_code}' "$B$1"; }
for p in / /VERSION.txt /sitemap.xml /robots.txt /.well-known/tdmrep.json /rankings/ /insights/dutch-business-base-by-municipality/ $(cd _site && find places -mindepth 2 -maxdepth 2 -type d | sort | awk 'NR % 15000 == 1' | sed 's|^|/|; s|$|/|'); do [ "$(s $p)" = 200 ] && ok "200 $p" || no "$(s $p) $p"; done
for p in /places/zz/1/ /places/fr/99999x/ /.env /app.js.map /build/seo_expand.mjs; do [ "$(s $p)" = 404 ] && ok "404 $p" || no "$(s $p) $p (must be 404)"; done
[ "$(s /places/fr/50457)" = 301 ] && ok "301 place page without slash" || no "slash redirect"
for p in places/de/07133035 about insights/cost-of-living-malaysian-states; do curl -s $B/$p/ | cmp -s - _site/$p/index.html && ok "identical /$p/" || no "differs /$p/"; done
curl -sI $B/sw.js | grep -qi 'cache-control: no-cache' && ok "sw.js never cached (latest release loads)" || no "sw.js cache header"
curl -sI $B/ | grep -qi 'strict-transport-security' && ok "security headers" || no "security headers"
kill $DP 2>/dev/null; pkill -f "wrangler@4.151.3 dev" 2>/dev/null; pkill -f workerd 2>/dev/null; rm -rf cf_site
echo "CLOUDFLARE DEPLOY TEST: $([ $fail = 0 ] && echo PASS || echo FAIL)"; exit $fail
