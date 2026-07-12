#!/usr/bin/env python3
"""Usage: merge-findings.py <findings.json>

Normalize severities and merge a findings list into the deduplicated issues set
(references/phase-1.md severity normalization + references/phase-4.md
§ Issue Set Construction). Input is the raw union of challenger / verifier /
adversarial findings; this script applies the two rules that were previously
prose-duplicated across phases:

  1. Severity normalization: P1 -> high, P2 -> medium, P3 -> drop. Values already
     in {high, medium, low} pass through; an unrecognized severity drops the
     finding (it cannot be ranked) and is reported on stderr.
  2. Dedup by file:line only (category schemas differ between sources). On
     collision keep the highest severity and union the source tags into a list.

Input JSON: array of objects with at least {file, line, severity, source}.
Other keys (description, evidence, category, ...) are preserved from the
highest-severity member of each group; ties keep the first seen.

stdout: JSON array sorted by severity (high, medium, low) then file, then line.
exit 0 on a parsed run; exit 1 on usage / file / JSON error.
"""

import json
import sys
from pathlib import Path

# P-scale -> normalized; P3 maps to None (drop). Already-normalized values map
# to themselves. Anything else is unrecognized and dropped with a warning.
# Codex emits bracketed forms ([P1]/[P2]/[P3]); severity_key strips the brackets
# so both [P1] and P1 take the same path (references/phase-1.md 1a).
SEVERITY_MAP = {
    "P1": "high", "P2": "medium", "P3": None,
    "high": "high", "medium": "medium", "low": "low",
}
SEVERITY_RANK = {"high": 3, "medium": 2, "low": 1}


def severity_key(raw):
    """Canonical lookup key: trimmed and with surrounding brackets removed."""
    return str(raw).strip().strip("[]")


def normalize_severity(raw):
    """Return the normalized severity, or None to drop (P3 or unrecognized)."""
    return SEVERITY_MAP.get(severity_key(raw))


def _entry(f, sev, sources):
    """Build a normalized issue entry from finding f."""
    return {**f, "severity": sev, "source": sources}


def merge(findings):
    """Normalize, drop P3/unknown, dedup by file:line, severity-max, union sources."""
    groups = {}
    for f in findings:
        raw = f.get("severity", "")
        sev = normalize_severity(raw)
        if sev is None:
            if severity_key(raw) != "P3":
                print(f"warn: dropping finding with unrecognized severity {raw!r} "
                      f"at {f.get('file')}:{f.get('line')}", file=sys.stderr)
            continue
        key = (f.get("file"), f.get("line"))
        src = f.get("source")
        if key not in groups:
            groups[key] = _entry(f, sev, [src] if src else [])
            continue
        g = groups[key]
        if src and src not in g["source"]:
            g["source"].append(src)
        # Keep the higher severity and its descriptive fields.
        if SEVERITY_RANK[sev] > SEVERITY_RANK[g["severity"]]:
            groups[key] = _entry(f, sev, g["source"])

    out = list(groups.values())
    out.sort(key=lambda g: (-SEVERITY_RANK[g["severity"]],
                            str(g.get("file") or ""),
                            g.get("line") or 0))
    return out


def main():
    if len(sys.argv) != 2:
        print("Usage: merge-findings.py <findings.json>", file=sys.stderr)
        sys.exit(1)
    path = Path(sys.argv[1])
    if not path.is_file():
        print(f"Error: not a file: {path}", file=sys.stderr)
        sys.exit(1)
    try:
        findings = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        print(f"Error: invalid JSON: {e}", file=sys.stderr)
        sys.exit(1)
    if not isinstance(findings, list):
        print("Error: top-level JSON must be an array", file=sys.stderr)
        sys.exit(1)
    print(json.dumps(merge(findings)))


if __name__ == "__main__":
    main()
