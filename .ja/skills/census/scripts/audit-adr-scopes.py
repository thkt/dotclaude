#!/usr/bin/env python3
"""Cross-repo ADR scope aggregator.

Scans ADR directories across configured repos for `scope` tag (YAML frontmatter
or `- Scope:` bullet), groups ADRs by scope, and detects same-scope title
clusters (potential horizontal expansion candidates).

Usage:
    python3 audit-adr-scopes.py [--json]

Default roots:
    ~/.claude/docs/decisions/
    ~/GitHub/cli/*/docs/decisions/
    ~/GitHub/apps/*/docs/decisions/
    ~/GitHub/plugins/*/docs/decisions/
"""

import json
import re
import sys
from collections import defaultdict
from pathlib import Path


def discover_roots() -> list[Path]:
    roots: list[Path] = []
    meta = Path.home() / ".claude" / "docs" / "decisions"
    if meta.exists():
        roots.append(meta)
    for prefix in ("cli", "apps", "plugins"):
        base = Path.home() / "GitHub" / prefix
        if not base.exists():
            continue
        for project in sorted(base.iterdir()):
            if not project.is_dir():
                continue
            d = project / "docs" / "decisions"
            if d.exists():
                roots.append(d)
    return roots


def extract_scope(path: Path) -> list[str]:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return []
    in_yaml = False
    for line in text.splitlines()[:40]:
        stripped = line.strip()
        if stripped == "---":
            in_yaml = not in_yaml
            continue
        if in_yaml:
            m = re.match(r"^scope:\s*(.+)$", stripped)
            if m:
                return parse_scope_value(m.group(1))
        else:
            m = re.match(r"^- Scope:\s*(.+)$", line)
            if m:
                return parse_scope_value(m.group(1))
    return []


def parse_scope_value(raw: str) -> list[str]:
    raw = raw.strip().strip("[").strip("]")
    return [s.strip() for s in raw.split(",") if s.strip()]


def extract_title(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return path.stem
    for line in text.splitlines()[:80]:
        if line.startswith("# "):
            return line[2:].strip()
    return path.stem


def extract_status(path: Path) -> str:
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return "unknown"
    in_yaml = False
    for line in text.splitlines()[:40]:
        stripped = line.strip()
        if stripped == "---":
            in_yaml = not in_yaml
            continue
        if in_yaml:
            m = re.match(r'^status:\s*"?([^"]+)"?\s*$', stripped)
            if m:
                return m.group(1).strip().lower()
        else:
            m = re.match(r"^- Status:\s*(.+)$", line)
            if m:
                value = m.group(1).strip()
                if value.lower().startswith("superseded"):
                    return "superseded"
                return value.split()[0].lower() if value else "unknown"
    return "unknown"


def normalize_title(title: str) -> str:
    key = title.lower()
    key = re.sub(r"^(adr[\s-]*)?[0-9]+:?\s*", "", key)
    key = re.sub(r":?\s*for\s+`?[a-z_-]+`?\s*$", "", key)
    return key.strip()


def collect(roots: list[Path]) -> dict[str, list[tuple[str, Path, str]]]:
    scopes: dict[str, list[tuple[str, Path, str]]] = defaultdict(list)
    for root in roots:
        for f in sorted(root.glob("*.md")):
            if f.name == "README.md":
                continue
            scope_list = extract_scope(f)
            if not scope_list:
                continue
            title = extract_title(f)
            status = extract_status(f)
            for s in scope_list:
                scopes[s].append((title, f, status))
    return scopes


def find_clusters(
    scopes: dict[str, list[tuple[str, Path, str]]],
) -> dict[str, dict[str, list[tuple[Path, str]]]]:
    result: dict[str, dict[str, list[tuple[Path, str]]]] = {}
    for s, items in scopes.items():
        buckets: dict[str, list[tuple[Path, str]]] = defaultdict(list)
        for title, path, status in items:
            buckets[normalize_title(title)].append((path, status))
        clustered = {k: v for k, v in buckets.items() if len(v) > 1}
        if clustered:
            result[s] = clustered
    return result


def cluster_is_resolved(entries: list[tuple[Path, str]]) -> bool:
    """A cluster is resolved if at least one entry is superseded —
    indicates the duplicate was already triaged."""
    return any(status == "superseded" for _, status in entries)


def relpath(p: Path) -> str:
    try:
        return str(p.relative_to(Path.home()))
    except ValueError:
        return str(p)


def report_text(scopes: dict[str, list[tuple[str, Path, str]]]) -> None:
    print("=== Scope distribution ===")
    for s, items in sorted(scopes.items(), key=lambda x: -len(x[1])):
        print(f"  {s}: {len(items)}")

    print()
    print("=== Per-scope listing ===")
    for s in sorted(scopes.keys()):
        print(f"--- {s} ({len(scopes[s])}) ---")
        for title, path, status in sorted(scopes[s], key=lambda x: str(x[1])):
            print(f"  {relpath(path)} [{status}]")
            print(f"    :: {title}")

    print()
    print("=== Title cluster detection (same scope, normalized title) ===")
    clusters = find_clusters(scopes)
    if not clusters:
        print("  (none)")
        return
    for s in sorted(clusters.keys()):
        print(f"scope={s}:")
        for k, entries in clusters[s].items():
            verdict = "RESOLVED (superseded present)" if cluster_is_resolved(entries) else "OPEN"
            print(f"  cluster: {k!r}  [{verdict}]")
            for p, status in entries:
                print(f"    - {relpath(p)} [{status}]")


def report_json(scopes: dict[str, list[tuple[str, Path, str]]]) -> None:
    clusters = find_clusters(scopes)
    payload = {
        "distribution": {s: len(items) for s, items in scopes.items()},
        "per_scope": {
            s: [{"title": t, "path": relpath(p), "status": st} for t, p, st in items]
            for s, items in scopes.items()
        },
        "clusters": {
            s: {
                k: {
                    "verdict": "resolved" if cluster_is_resolved(entries) else "open",
                    "entries": [
                        {"path": relpath(p), "status": st} for p, st in entries
                    ],
                }
                for k, entries in buckets.items()
            }
            for s, buckets in clusters.items()
        },
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))


def main(argv: list[str]) -> int:
    as_json = "--json" in argv
    roots = discover_roots()
    if not roots:
        print("No ADR root found.", file=sys.stderr)
        return 1
    scopes = collect(roots)
    if not scopes:
        print("No scope-tagged ADRs found.", file=sys.stderr)
        return 1
    if as_json:
        report_json(scopes)
    else:
        report_text(scopes)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
