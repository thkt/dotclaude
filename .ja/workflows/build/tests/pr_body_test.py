#!/usr/bin/env python3
"""Tests for workflows/build/pr-body.py (deterministic draft-PR body renderer).

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


class RenderTest(unittest.TestCase):
    def test_closes_reference(self):
        self.assertIn("Closes #123", pr_body.render(FULL))

    def test_all_required_headings_present(self):
        body = pr_body.render(FULL)
        for heading in [
            "## Assumptions (veto targets)",
            "## Backlog candidates",
            "## Unresolved critical/high findings",
            "## Red-unconfirmed anomalies",
            "## Independent verify",
        ]:
            self.assertIn(heading, body)

    def test_lists_are_rendered(self):
        body = pr_body.render(FULL)
        self.assertIn("- assume A", body)
        self.assertIn("[issue] cand one (x.js)", body)
        self.assertIn("[high] leak (y.js)", body)
        self.assertIn("U-001 (no-red): flaky", body)

    def test_empty_sections_show_placeholder(self):
        body = pr_body.render({"issue": "9", "reaudited": True, "tests_pass": True, "gates_pass": True})
        self.assertIn("_None recorded._", body)  # assumptions
        self.assertIn("_None; audit reached zero critical/high._", body)  # findings

    def test_not_reaudited_emits_warning_not_a_clean_list(self):
        body = pr_body.render({**FULL, "reaudited": False, "residual_blocking": []})
        self.assertIn("final fix round was not re-audited", body.lower())
        self.assertNotIn("_None; audit reached zero critical/high._", body)

    def test_verify_failure_includes_detail_block(self):
        body = pr_body.render({**FULL, "tests_pass": False, "verify_output": "boom stacktrace"})
        self.assertIn("tests: FAIL", body)
        self.assertIn("```\nboom stacktrace\n```", body)

    def test_verify_pass_has_no_detail_block(self):
        body = pr_body.render(FULL)
        self.assertIn("tests: pass, gates: pass", body)
        self.assertNotIn("```", body)


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
