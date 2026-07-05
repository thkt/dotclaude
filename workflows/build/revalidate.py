#!/usr/bin/env python3
"""Usage: revalidate.py   (preconditions JSON on stdin)

Deterministically re-verify a plan's preconditions against the working tree so the
build workflow's Revalidate gate does not depend on an LLM faithfully running
test / grep. The build.js Revalidate agent is reduced to a launcher: it pipes the
preconditions JSON into this script and returns the stdout verbatim, so the drift
verdict is this script's, not the model's.

stdin:  JSON array of {path, pattern?} — existing code the issue's plan presupposes.
        path is relative to the process cwd (the repo root). pattern is an optional
        literal (fixed-string, not regex) substring expected to occur in that file.
stdout: JSON {results: [{path, pattern, exists, matches}]}, one per input in order.
          exists  = path is a regular file
          matches = with no pattern, equals exists; otherwise exists AND the literal
                    pattern occurs in the file's bytes
exit 0 on a completed run (read the verdict from JSON). exit 1 on usage / parse error
-- fail-closed: a malformed payload is never silently treated as "all preconditions
pass". The drift decision (any exists=false or matches=false) stays in build.js.
"""

import json
import sys
from pathlib import Path


def verify_one(root, entry):
    """Return {path, pattern, exists, matches} for one precondition entry.

    A non-object entry, or one whose file is unreadable, resolves to
    exists/matches false (fail-closed) rather than raising.
    """
    path = str(entry.get("path", "")) if isinstance(entry, dict) else ""
    raw_pattern = entry.get("pattern", "") if isinstance(entry, dict) else ""
    pattern = "" if raw_pattern is None else str(raw_pattern)
    exists = (root / path).is_file() if path else False
    if not pattern:
        matches = exists
    elif not exists:
        matches = False
    else:
        try:
            matches = pattern.encode("utf-8") in (root / path).read_bytes()
        except OSError:
            matches = False
    return {"path": path, "pattern": pattern, "exists": exists, "matches": matches}


def run(preconditions, root=Path(".")):
    """Verify every precondition against root, preserving input order and count."""
    return [verify_one(root, entry) for entry in preconditions]


def fail(message):
    print(message, file=sys.stderr)
    sys.exit(1)


def main():
    try:
        preconditions = json.loads(sys.stdin.read())
    except json.JSONDecodeError as exc:
        fail(f"Error: preconditions is not valid JSON: {exc}")
    if not isinstance(preconditions, list):
        fail("Error: preconditions must be a JSON array of {path, pattern?}")
    print(json.dumps({"results": run(preconditions)}))


if __name__ == "__main__":
    main()
