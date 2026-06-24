#!/usr/bin/env python3
"""External ADR reference detector (shared by /adrift and /census).

Scans a repo for `ADR-NNNN` references, then classifies each as local (a
matching `NNNN-*.md` exists in an ADR directory) or external (no local match).
External references mean a decision is governed by an ADR not promoted into this
repo, which is silent cross-repo drift worth surfacing.

Usage:
    python3 external-adr-refs.py [repo-root] [--adr-dir PATH] [--json]

    repo-root    scan root (default: current directory)
    --adr-dir    ADR directory, repo-root relative or absolute. May repeat.
                 If omitted, auto-detect the canonical locations below.
    --json       emit JSON instead of text

When --adr-dir is omitted (census path), the canonical locations are probed
relative to repo-root: docs/decisions, docs/adr, architecture/decisions, adr.
Local ids are the union across every directory that exists. If none exist,
every reference is external.
"""

import json
import os
import re
import sys
from pathlib import Path

REF_RE = re.compile(r"\bADR-(\d{4})\b", re.IGNORECASE)
LOCAL_RE = re.compile(r"^(\d{4})-.+\.md$")
SCAN_EXTS = {
    ".rs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".swift",
    ".md", ".toml", ".yaml", ".yml", ".sh",
}
SKIP_DIRS = {".git", "node_modules", "target", "dist", "build", ".venv", "vendor"}
CANONICAL_ADR_DIRS = ("docs/decisions", "docs/adr", "architecture/decisions", "adr")


def detect_adr_dirs(root: Path) -> list[Path]:
    return [root / rel for rel in CANONICAL_ADR_DIRS if (root / rel).is_dir()]


def local_ids(adr_dirs: list[Path]) -> set[str]:
    ids: set[str] = set()
    for adr_dir in adr_dirs:
        if not adr_dir.is_dir():
            continue
        for entry in adr_dir.iterdir():
            m = LOCAL_RE.match(entry.name)
            if m:
                ids.add(m.group(1))
    return ids


def scan_refs(root: Path, adr_dirs: list[Path]) -> list[tuple[str, int, str]]:
    adr_dir_abs = {d.resolve() for d in adr_dirs}
    refs: list[tuple[str, int, str]] = []
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        if Path(dirpath).resolve() in adr_dir_abs:
            dirnames[:] = []
            continue
        for name in filenames:
            if Path(name).suffix.lower() not in SCAN_EXTS:
                continue
            path = Path(dirpath) / name
            if "fixture" in str(path).lower():
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for lineno, line in enumerate(text.splitlines(), 1):
                for m in REF_RE.finditer(line):
                    rel = os.path.relpath(path, root)
                    refs.append((rel, lineno, m.group(1)))
    return refs


def classify(root: Path, adr_dirs: list[Path]):
    present = local_ids(adr_dirs)
    refs = scan_refs(root, adr_dirs)
    external = [
        {"file": f, "line": n, "id": f"ADR-{i}"}
        for f, n, i in refs
        if i not in present
    ]
    local_hits = sum(1 for _, _, i in refs if i in present)
    return present, external, local_hits


def parse_args(argv: list[str]):
    as_json = False
    adr_dir_args: list[str] = []
    positionals: list[str] = []
    i = 0
    while i < len(argv):
        arg = argv[i]
        if arg == "--json":
            as_json = True
        elif arg == "--adr-dir":
            i += 1
            if i >= len(argv):
                raise ValueError("--adr-dir requires a path argument")
            adr_dir_args.append(argv[i])
        elif arg.startswith("--adr-dir="):
            adr_dir_args.append(arg.split("=", 1)[1])
        elif arg.startswith("--"):
            raise ValueError(f"unknown flag: {arg}")
        else:
            positionals.append(arg)
        i += 1
    return positionals, adr_dir_args, as_json


def main(argv: list[str]) -> int:
    try:
        positionals, adr_dir_args, as_json = parse_args(argv)
    except ValueError as exc:
        print(f"{exc}", file=sys.stderr)
        print("Usage: external-adr-refs.py [repo-root] [--adr-dir PATH] [--json]", file=sys.stderr)
        return 2

    root = Path(positionals[0]) if positionals else Path.cwd()
    if not root.is_dir():
        print(f"repo root not found: {root}", file=sys.stderr)
        return 1

    if adr_dir_args:
        adr_dirs = [Path(a) if Path(a).is_absolute() else root / a for a in adr_dir_args]
        missing = [str(d) for d in adr_dirs if not d.is_dir()]
        if missing:
            print(f"ADR directory not found: {', '.join(missing)}", file=sys.stderr)
            return 1
    else:
        adr_dirs = detect_adr_dirs(root)

    present, external, local_hits = classify(root, adr_dirs)

    if as_json:
        print(json.dumps({
            "adr_dirs": [str(d) for d in adr_dirs],
            "local_ids": sorted(present),
            "local_ref_count": local_hits,
            "external_ref_count": len(external),
            "external_refs": external,
        }, ensure_ascii=False, indent=2))
        return 0

    print(f"ADR dirs: {', '.join(str(d) for d in adr_dirs) or '(none)'}  (local ADRs: {len(present)})")
    print(f"Local-covered references: {local_hits}")
    print(f"External references: {len(external)}")
    for ref in external:
        print(f"  {ref['file']}:{ref['line']}  {ref['id']} (not local)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
