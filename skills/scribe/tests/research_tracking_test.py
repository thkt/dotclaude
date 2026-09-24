"""Tests that docs/research/*.md is git-tracked while everything else under docs/research/ and
.claude/workspace/planning/ stays ignored, and that scribe's research scan counts a report
moved into docs/research/ as unchanged rather than new.

Run: python3 skills/scribe/tests/research_tracking_test.py
"""

import re
import subprocess
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
SKILL = ROOT / "skills" / "scribe" / "SKILL.md"


def check_ignore(path: Path) -> int:
    """git check-ignore's exit code for path: 0 when ignored, 1 when not ignored."""
    proc = subprocess.run(
        ["git", "-C", str(ROOT), "check-ignore", str(path.relative_to(ROOT))],
        capture_output=True,
        text=True,
        check=False,
    )
    return proc.returncode


def research_scan_command() -> str:
    """The committed-report scan scribe's Phase 2 step 3 names, read out of SKILL.md so the test
    runs the command the skill actually carries."""
    match = re.search(r"`(git log --since=[^`]+)`", SKILL.read_text(encoding="utf-8"))
    assert match, "SKILL.md names no git log --since research scan"
    return match.group(1)


def git(repo: Path, *args: str) -> None:
    _ = subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


class ResearchTracking(unittest.TestCase):
    def test_a_markdown_file_directly_under_docs_research_is_not_ignored(self) -> None:
        """T-535 git check-ignore exits nonzero for a markdown file directly under
        docs/research"""
        target = ROOT / "docs" / "research" / "sample.md"
        self.assertNotEqual(check_ignore(target), 0, f"{target} is git-ignored")

    def test_a_non_markdown_file_under_docs_research_stays_ignored(self) -> None:
        """T-536 git check-ignore keeps ignoring a non-markdown file under docs/research"""
        # SKILL.md Phase 2 step 4 reads *.md only, so a tracked non-md file would be published
        # without ever being scanned.
        target = ROOT / "docs" / "research" / "scratch.json"
        self.assertEqual(check_ignore(target), 0, f"{target} is not git-ignored")

    def test_a_markdown_file_in_a_subdirectory_of_docs_research_stays_ignored(self) -> None:
        """T-537 git check-ignore keeps ignoring a markdown file in a subdirectory of
        docs/research"""
        # A report's working notes live beside it in a subdirectory and stay unpublished.
        target = ROOT / "docs" / "research" / "sub" / "notes.md"
        self.assertEqual(check_ignore(target), 0, f"{target} is not git-ignored")

    def test_git_check_ignore_keeps_ignoring_a_file_under_claude_workspace_planning(
        self,
    ) -> None:
        """T-002 git check-ignore keeps ignoring a file under .claude/workspace/planning"""
        # check-ignore needs no real file, and the CI checkout carries no planning/ at all.
        target = ROOT / ".claude" / "workspace" / "planning" / "sample.md"
        self.assertEqual(check_ignore(target), 0, f"{target} is no longer git-ignored")

    def test_the_research_scan_lists_a_new_report_and_skips_one_moved_into_docs_research(
        self,
    ) -> None:
        """T-538 scribe's research scan lists a report added to docs/research after the cursor
        and skips a report git mv moved there"""
        # A move made with a pathspec naming only the new path reads as an addition, which would
        # hand every moved report back to scribe as new input.
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            git(repo, "init", "-q")
            git(repo, "config", "user.email", "t@example.com")
            git(repo, "config", "user.name", "t")
            old = repo / "old" / "research"
            old.mkdir(parents=True)
            _ = (old / "2026-01-01-moved.md").write_text("# moved\n\nbody line\n" * 5)
            git(repo, "add", ".")
            git(repo, "commit", "-q", "-m", "seed", "--date=2026-01-01T00:00:00Z")
            (repo / "docs" / "research").mkdir(parents=True)
            git(repo, "mv", "old/research/2026-01-01-moved.md", "docs/research/")
            _ = (repo / "docs" / "research" / "2026-01-02-new.md").write_text("# new\n")
            git(repo, "add", ".")
            git(repo, "commit", "-q", "-m", "move and add")

            command = research_scan_command().replace("<mergedAt>", "2000-01-01T00:00:00Z")
            proc = subprocess.run(
                command, shell=True, cwd=repo, capture_output=True, text=True, check=True
            )
            listed = proc.stdout.split()
            self.assertIn("docs/research/2026-01-02-new.md", listed)
            self.assertNotIn("docs/research/2026-01-01-moved.md", listed)


if __name__ == "__main__":
    _ = unittest.main(verbosity=2)
