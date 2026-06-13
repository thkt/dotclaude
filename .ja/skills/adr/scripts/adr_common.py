"""Shared helpers for the adr skill scripts."""

import os
import re
import subprocess
import sys
from pathlib import Path


def fail(*lines):
    print(*lines, sep="\n", file=sys.stderr)
    sys.exit(1)


def resolve_adr_dir(arg=None):
    """ADR_DIR env > arg > <git-root>/docs/decisions."""
    if os.environ.get("ADR_DIR"):
        return Path(os.environ["ADR_DIR"])
    if arg:
        return Path(arg)
    git = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True
    )
    if git.returncode != 0:
        fail(
            "Error: not inside a git repository. ADRs require"
            " <git-root>/docs/decisions/. Set ADR_DIR env var to override."
        )
    return Path(git.stdout.strip()) / "docs" / "decisions"


def guard_skill_dir(adr_dir, hint):
    """Reject the skill-definition directory itself as an ADR archive."""
    if (adr_dir / "SKILL.md").is_file():
        fail(
            f"Error: {adr_dir} contains SKILL.md (skill-definition directory,"
            " not an ADR archive)",
            hint,
        )


def split_frontmatter(text):
    """(frontmatter lines, body lines) split on the first pair of --- delimiters."""
    parts = re.split(r"^---[ \t]*$\n?", text, maxsplit=2, flags=re.M)
    if len(parts) == 1:
        return [], parts[0].splitlines()
    body = parts[0] + parts[2] if len(parts) > 2 else parts[0]
    return parts[1].splitlines(), body.splitlines()
