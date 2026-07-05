#!/usr/bin/env python3
"""Tests for workflows/build/pr-body.py (deterministic draft-PR fact renderer).

Run: python3 workflows/build/tests/pr_body_test.py

render() is exercised directly; the CLI contract (stdin JSON -> stdout markdown,
fail-closed exit 1 on a bad payload) is exercised via subprocess.
"""

import importlib.util
import json
import subprocess
import sys
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCRIPT = HERE.parent / "pr-body.py"
# pr-body.py has a hyphen, so load it by path rather than import name.
_spec = importlib.util.spec_from_file_location("pr_body", SCRIPT)
pr_body = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(pr_body)

FULL = {
    "issue": "123",
    "assumptions": ["assume A", "assume B"],
    "backlog_candidates": [{"source": "issue", "summary": "cand one", "file": "x.js"}],
    "residual_blocking": [{"severity": "high", "summary": "leak", "file": "y.js"}],
    "reaudited": True,
    "code_anomalies": [{"unit": "U-001", "kind": "no-red", "notes": "flaky"}],
    "tests_pass": True,
    "gates_pass": True,
    "verify_output": "",
}
CLEAN = {"issue": "9", "reaudited": True, "tests_pass": True, "gates_pass": True}


class RenderTest(unittest.TestCase):
    def test_closes_and_status_line(self):
        body = pr_body.render(FULL)
        self.assertIn("Closes #123", body)
        # One-line status chip carries the safety-critical facts.
        self.assertIn("`verify tests=pass gates=pass` · `blocking 1`", body)

    def test_lists_use_bold_labels_and_bullets(self):
        body = pr_body.render(FULL)
        self.assertIn("**Assumptions (veto targets)**", body)
        self.assertIn("- assume A", body)
        self.assertIn("**Backlog — file via `/issue`**", body)
        self.assertIn("- [issue] cand one (x.js)", body)
        self.assertIn("**Unresolved critical/high**", body)
        self.assertIn("- [high] leak (y.js)", body)
        self.assertIn("**Anomalies (Red unconfirmed)**", body)
        self.assertIn("- U-001 (no-red): flaky", body)

    def test_clean_run_omits_empty_sections_and_stays_short(self):
        body = pr_body.render(CLEAN)
        # No "None" noise; informational sections are dropped entirely.
        self.assertNotIn("None", body)
        self.assertNotIn("**Assumptions", body)
        self.assertNotIn("**Backlog", body)
        self.assertNotIn("**Anomalies", body)
        # But the safety-critical status is still present.
        self.assertIn("`blocking 0`", body)
        # A clean run is compact: only Closes + the status line carry content
        # (plus the leading rule); no per-section "None" blocks.
        non_empty = [ln for ln in body.splitlines() if ln.strip() and ln.strip() != "---"]
        self.assertEqual(len(non_empty), 2, non_empty)

    def test_not_reaudited_warns_and_drops_the_clean_findings_list(self):
        body = pr_body.render({**FULL, "reaudited": False, "residual_blocking": []})
        self.assertIn("`blocking not re-audited`", body)
        self.assertIn("> **Not re-audited**", body)
        # When not re-audited the callout stands in for the findings list.
        self.assertNotIn("**Unresolved critical/high**", body)

    def test_verify_failure_uses_collapsed_details(self):
        body = pr_body.render({**FULL, "tests_pass": False, "verify_output": "boom stacktrace"})
        self.assertIn("`verify tests=FAIL gates=pass`", body)
        self.assertIn("<details><summary>verify output</summary>", body)
        self.assertIn("```\nboom stacktrace\n```", body)

    def test_verify_pass_has_no_details_block(self):
        body = pr_body.render(FULL)
        self.assertNotIn("<details>", body)
        self.assertNotIn("```", body)

    def test_leads_with_blank_line_and_rule_for_safe_append(self):
        # Appended after the agent's Summary via >>, the tail must start with a blank
        # line then a horizontal rule so the summary's last line is never parsed as a
        # setext heading and the two parts stay visually separated.
        self.assertTrue(pr_body.render(FULL).startswith("\n\n---\n\n"))


class CliTest(unittest.TestCase):
    def _run(self, stdin):
        return subprocess.run(
            [sys.executable, str(SCRIPT)], input=stdin, capture_output=True, text=True
        )

    def test_stdin_to_stdout(self):
        proc = self._run(json.dumps(FULL))
        self.assertEqual(proc.returncode, 0)
        self.assertIn("Closes #123", proc.stdout)

    def test_invalid_json_fails_closed(self):
        proc = self._run("not json")
        self.assertEqual(proc.returncode, 1)
        self.assertEqual(proc.stdout, "")

    def test_non_object_fails_closed(self):
        proc = self._run("[1,2,3]")
        self.assertEqual(proc.returncode, 1)


if __name__ == "__main__":
    unittest.main()
