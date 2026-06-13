#!/usr/bin/env python3
"""Usage: gate-decode.py <enhancer-output-file>

Decodes the fenced json decision block from the enhancer-evidence report.
stdout: decision JSON {gate, findings, build, tests} with exit 0
stderr: failure reason (missing/multiple block, parse error, enum violation,
        cross-check mismatch) with exit 1. The leader re-spawns the enhancer
        once; a second failure fail-closes to NotReady.
"""

import json
import re
import sys
from pathlib import Path

GATES = {"Ready", "NotReady"}
BUILDS = {"pass", "fail", "skipped"}
TESTS = {"pass", "fail", "skipped", "no-runner"}


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def main():
    if len(sys.argv) != 2:
        fail("Usage: gate-decode.py <enhancer-output-file>")
    path = Path(sys.argv[1])
    if not path.is_file():
        fail(f"Error: not a file: {path}")

    blocks = re.findall(
        r"^```json\s*\n(.*?)^```\s*$",
        path.read_text(encoding="utf-8"),
        re.DOTALL | re.MULTILINE,
    )
    if len(blocks) != 1:
        fail(f"Error: expected exactly 1 json block, found {len(blocks)}")
    try:
        decision = json.loads(blocks[0])
    except json.JSONDecodeError as e:
        fail(f"Error: json parse failed: {e}")

    gate = decision.get("gate")
    build = decision.get("build")
    tests = decision.get("tests")
    findings = decision.get("findings")

    if not isinstance(findings, list):
        fail("Error: findings must be a list")
    if gate not in GATES:
        fail(f"Error: gate must be one of {sorted(GATES)}, got {gate!r}")
    if build not in BUILDS:
        fail(f"Error: build must be one of {sorted(BUILDS)}, got {build!r}")
    if tests not in TESTS:
        fail(f"Error: tests must be one of {sorted(TESTS)}, got {tests!r}")
    if gate == "Ready" and (findings or build == "fail" or tests == "fail"):
        fail("Error: cross-check failed: gate=Ready requires findings=0 and no build/tests fail")

    print(json.dumps(
        {"gate": gate, "findings": len(findings), "build": build, "tests": tests}
    ))


if __name__ == "__main__":
    main()
