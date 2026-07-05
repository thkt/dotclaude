#!/usr/bin/env python3
"""Tests for workflows/build/pr-body.py (deterministic draft-PR fact renderer).

Run: python3 workflows/build/tests/pr_body_test.py

render() is exercised directly; the CLI contract (stdin JSON -> stdout markdown,
fail-closed exit 1 on a bad or incomplete payload) is exercised via subprocess.
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
        self.assertNotIn("None", body)
        self.assertNotIn("**Assumptions", body)
        self.assertNotIn("**Backlog", body)
        self.assertNotIn("**Unresolved", body)
        self.assertNotIn("**Anomalies", body)
        self.assertIn("`blocking 0`", body)
        non_empty = [ln for ln in body.splitlines() if ln.strip() and ln.strip() != "---"]
        self.assertEqual(len(non_empty), 2, non_empty)

    def test_not_reaudited_warns_and_still_lists_residual(self):
        # Round-3 cap: the warning appears AND the unverified findings are enumerated
        # (they are no longer hidden behind a generic warning).
        body = pr_body.render({**FULL, "reaudited": False})
        self.assertIn("`blocking 1 (not re-audited)`", body)
        self.assertIn("> **Not re-audited**", body)
        self.assertIn("**Unresolved critical/high**", body)
        self.assertIn("- [high] leak (y.js)", body)

    def test_verify_failure_uses_collapsed_details(self):
        body = pr_body.render({**FULL, "tests_pass": False, "verify_output": "boom stacktrace"})
        self.assertIn("`verify tests=FAIL gates=pass`", body)
        self.assertIn("<details><summary>verify output</summary>", body)
        self.assertIn("```\nboom stacktrace\n```", body)

    def test_verify_output_containing_a_fence_does_not_break_out(self):
        # A test log that itself contains ``` must not terminate the code block early.
        log = "assert failed on:\n```\nfoo\n```\nend"
        body = pr_body.render({**FULL, "gates_pass": False, "verify_output": log})
        # The chosen fence is longer than the longest backtick run in the log.
        self.assertIn("````\n" + log + "\n````", body)

    def test_verify_pass_has_no_details_block(self):
        body = pr_body.render(FULL)
        self.assertNotIn("<details>", body)
        self.assertNotIn("```", body)

    def test_non_dict_item_degrades_instead_of_crashing(self):
        # A malformed (non-dict) list item must not raise and drop the whole tail.
        body = pr_body.render({**CLEAN, "backlog_candidates": ["a bare string", None]})
        self.assertIn("**Backlog — file via `/issue`**", body)
        self.assertIn("- a bare string", body)

    def test_list_item_newline_stays_on_one_line(self):
        body = pr_body.render({**CLEAN, "assumptions": ["line one\n# not a heading"]})
        self.assertIn("- line one # not a heading", body)
        self.assertNotIn("\n# not a heading", body)

    def test_leads_with_blank_line_and_rule_for_safe_append(self):
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

    def test_missing_required_key_fails_closed(self):
        # A shipPayload that dropped a safety-critical key must not render a
        # plausible "clean" body — it must exit 1 so the caller's && chain aborts.
        for key in ("reaudited", "tests_pass", "gates_pass"):
            payload = {k: v for k, v in FULL.items() if k != key}
            proc = self._run(json.dumps(payload))
            self.assertEqual(proc.returncode, 1, f"missing {key} should fail closed")
            self.assertEqual(proc.stdout, "")


if __name__ == "__main__":
    unittest.main()
