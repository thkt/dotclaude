#!/usr/bin/env python3
"""Usage: parse-adversarial.py <codex-output-file> [--scoped-files N] [--promoted N]

Parse the ADVERSARIAL_RESULTS block from Codex adversarial-test output
(references/phase-2.md § Result Parsing) into structured JSON, and compute the
informational metrics (references/phase-3.md § Metrics).

The block is delimited by ADVERSARIAL_RESULTS_START / ADVERSARIAL_RESULTS_END;
records inside are separated by a line containing only `---`. A record is a set
of `key: value` lines (test_name, target, assertion, result, failure_detail).
When no block is present, this is 0 tests (Adversarial column = skipped); exit 0
with total=0 so the caller routes it without special-casing prose.

stdout: JSON {
  tests: [{test_name, target, assertion, result, failure_detail}],
  total, passed, failed,
  generation_rate,   # total / scoped_files, null when --scoped-files absent or 0
  survival_rate      # passed / (passed + promoted), null when --promoted absent
}
exit 0 on a parsed run (including 0 tests); exit 1 on usage / file error.

--promoted is the count of failing tests promoted in Phase 3 triage (an LLM
judgment); the arithmetic is delegated here so the rate is not hand-computed.
"""

import argparse
import json
import re
import sys
from pathlib import Path

START = "ADVERSARIAL_RESULTS_START"
END = "ADVERSARIAL_RESULTS_END"
FIELDS = ("test_name", "target", "assertion", "result", "failure_detail")
KEY_RE = re.compile(rf"^({'|'.join(FIELDS)})\s*:\s*(.*)$")


def extract_block(text):
    """Return the text strictly between START and END, or None if absent."""
    start = text.find(START)
    if start == -1:
        return None
    end = text.find(END, start)
    if end == -1:
        return None
    return text[start + len(START):end]


def parse_records(block):
    """Split the block on `---` lines and parse each into a field dict."""
    records = []
    for chunk in re.split(r"^\s*---\s*$", block, flags=re.MULTILINE):
        rec = {}
        for line in chunk.splitlines():
            m = KEY_RE.match(line.strip())
            if m:
                rec[m.group(1)] = m.group(2).strip()
        # A record counts only if it names a test and carries a result.
        if rec.get("test_name") and rec.get("result"):
            records.append({f: rec.get(f, "") for f in FIELDS})
    return records


def parse(text, scoped_files=None, promoted=None):
    block = extract_block(text)
    tests = parse_records(block) if block is not None else []
    passed = sum(1 for t in tests if t["result"].upper() == "PASS")
    failed = sum(1 for t in tests if t["result"].upper() == "FAIL")
    total = len(tests)

    generation_rate = None
    if scoped_files:
        generation_rate = round(total / scoped_files, 3)

    survival_rate = None
    if promoted is not None:
        denom = passed + promoted
        survival_rate = round(passed / denom, 3) if denom else None

    return {
        "tests": tests,
        "total": total,
        "passed": passed,
        "failed": failed,
        "generation_rate": generation_rate,
        "survival_rate": survival_rate,
    }


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("output_file")
    ap.add_argument("--scoped-files", type=int, default=None)
    ap.add_argument("--promoted", type=int, default=None)
    try:
        args = ap.parse_args()
    except SystemExit:
        print("Usage: parse-adversarial.py <codex-output-file> [--scoped-files N] [--promoted N]",
              file=sys.stderr)
        sys.exit(1)

    path = Path(args.output_file)
    if not path.is_file():
        print(f"Error: not a file: {path}", file=sys.stderr)
        sys.exit(1)

    text = path.read_text(encoding="utf-8", errors="replace")
    print(json.dumps(parse(text, args.scoped_files, args.promoted)))


if __name__ == "__main__":
    main()
