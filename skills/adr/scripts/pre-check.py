#!/usr/bin/env python3
"""Usage: pre-check.py "ADR Title"

stdout: JSON with status, number, filename, slug, date, adr_dir, similar_adrs
stderr: validation failures with exit 1
"""

import json
import os
import re
import sys
from datetime import date

from adr_common import fail, guard_skill_dir, resolve_adr_dir


def similarity(title_a, title_b):
    """Shared distinct words between the titles, divided by title_a's word count."""
    words_a = title_a.lower().split()
    if not words_a:
        return 0.0
    return len(set(words_a) & set(title_b.lower().split())) / len(words_a)


def first_heading(path):
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("# "):
            return line[2:]
    return ""


def main():
    title = sys.argv[1] if len(sys.argv) > 1 else ""
    adr_dir = resolve_adr_dir()
    threshold = float(os.environ.get("DUPLICATE_THRESHOLD", "0.7"))

    if not 5 <= len(title) <= 64:
        fail(f"Error: title length {len(title)} chars (required 5-64)")
    if re.search(r'[/:*?"<>|]', title):
        fail('Error: forbidden characters in title (/:*?"<>|)')
    guard_skill_dir(
        adr_dir,
        "Set ADR_DIR env var or run from a project root where"
        " docs/decisions/ is the archive.",
    )

    adr_dir.mkdir(parents=True, exist_ok=True)
    if not os.access(adr_dir, os.W_OK):
        fail(f"Error: no write permission: {adr_dir}")

    numbers = [
        int(m.group(1))
        for name in os.listdir(adr_dir)
        if (m := re.match(r"(\d{4})-", name))
    ]
    next_num = f"{max(numbers, default=0) + 1:04d}"

    slug = re.sub(r"[^a-z0-9-]", "", title.lower().replace(" ", "-"))
    slug = re.sub(r"-{2,}", "-", slug).strip("-")

    similar_adrs = []
    for adr_file in sorted(adr_dir.rglob("*.md")):
        existing = first_heading(adr_file)
        if not existing:
            continue
        score = similarity(title, existing)
        if score >= threshold:
            similar_adrs.append(
                {"file": adr_file.name, "similarity": f"{score:.2f}", "title": existing}
            )

    print(json.dumps({
        "status": "ok",
        "number": next_num,
        "filename": f"{next_num}-{slug}.md",
        "slug": slug,
        "date": date.today().isoformat(),
        "adr_dir": str(adr_dir),
        "similar_adrs": similar_adrs,
    }, indent=2))


if __name__ == "__main__":
    main()
