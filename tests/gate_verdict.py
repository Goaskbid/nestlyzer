#!/usr/bin/env python3
"""r19 (audit NZ9-04): verdict for one release-gate step. A step passes only if its process exited 0 AND its log
reports no failed assertion: no line starting with FAIL, no "N of M passed" with N < M, no "... TEST: FAIL".
Usage: gate_verdict.py <exit code> <log file>   prints "PASS|FAIL <passed assertions> <total assertions>"
       gate_verdict.py --selftest               checks itself with injected failures."""
import re, sys, tempfile, os


def verdict(rc, log):
    bad = [l for l in log.splitlines() if re.match(r'\s*FAIL\b', l) or re.search(r'\b(TEST|TRACE|AUDIT|GATE)\b[^\n]*?:?\s+FAIL\b', l)]
    counts = [(int(a), int(b)) for a, b in re.findall(r'\b(\d+) of (\d+)(?: checks)? passed', log)]
    ok = rc == 0 and not bad and not any(a < b for a, b in counts)
    return ('PASS' if ok else 'FAIL'), sum(a for a, b in counts), sum(b for a, b in counts)


if sys.argv[1:2] == ['--selftest']:
    cases = [(0, 'ok a\nFAIL injected synthetic failing assertion\n0 of 1 passed\n', 'FAIL'), (0, '7 of 8 passed\n', 'FAIL'),
             (0, 'X TEST: FAIL (2)\n', 'FAIL'), (1, '1 of 1 passed\n', 'FAIL'), (0, 'ok a\n1 of 1 passed\n', 'PASS')]
    good = sum(verdict(rc, log)[0] == want for rc, log, want in cases)
    print(f'gate self-test: {good} of {len(cases)} passed'); sys.exit(0 if good == len(cases) else 1)
v = verdict(int(sys.argv[1]), open(sys.argv[2], errors='replace').read())
print(f'{v[0]} {v[1]} {v[2]}')
