#!/usr/bin/env python3
"""T-033: contract test locking workflows/build.js's marker-wrapped validate copy to the
canonical veto.py validate_plan. build.js cannot import the canonical (its body is wrapped
as a workflow AsyncFunction, and it is JS), so the two are kept in lockstep here: the build.js
copy is extracted between CONTRACT-TEST markers, run via node on every shared plans fixture,
and asserted to return identical errors to the canonical. Marker absence raises loudly in
extract_body, so a dropped marker fails this test rather than silently skipping it.

Run: python3 hooks/veto/tests/contract_build_port.py
"""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from veto import validate_plan  # noqa: E402

BUILD_JS = HERE.parent.parent.parent / "workflows" / "build.js"
FIXTURES = HERE / "fixtures" / "plans"
BEGIN = "// CONTRACT-TEST-BEGIN validate"
END = "// CONTRACT-TEST-END validate"


def extract_body(source):
    """Extract the marker-delimited validate body. Marker absence raises loudly rather than
    silently skipping the contract check."""
    start = source.find(BEGIN)
    end = source.find(END)
    if start == -1 or end == -1 or end < start:
        raise ValueError(
            f"CONTRACT-TEST markers not found in build.js (start={start}, end={end})"
        )
    return source[start + len(BEGIN) : end]


def run_js_validate(source, plans):
    """Materialize the extracted body (`const validate = ...`) as an ES module once and run it on
    every plan in a single node invocation, returning the list of errors arrays."""
    body = extract_body(source)
    with tempfile.TemporaryDirectory(prefix="contract-") as d:
        d = Path(d)
        (d / "extracted.mjs").write_text(
            body + "\nexport { validate };\n", encoding="utf-8"
        )
        (d / "run.mjs").write_text(
            'import { readFileSync } from "node:fs";\n'
            'import { validate } from "./extracted.mjs";\n'
            'const plans = JSON.parse(readFileSync(process.argv[2], "utf8"));\n'
            "process.stdout.write(JSON.stringify(plans.map((p) => validate(p))));\n",
            encoding="utf-8",
        )
        (d / "plans.json").write_text(json.dumps(plans), encoding="utf-8")
        out = subprocess.run(
            ["node", str(d / "run.mjs"), str(d / "plans.json")],
            capture_output=True,
            text=True,
            check=True,
        )
        return json.loads(out.stdout)


def load_plans():
    """Only valid-JSON fixtures exercise validate; malformed.json tests the stdin parse boundary,
    which validate never sees, so it is skipped by the parse guard below."""
    plans = []
    for f in sorted(FIXTURES.glob("*.json")):
        try:
            plans.append((f.name, json.loads(f.read_text(encoding="utf-8"))))
        except json.JSONDecodeError:
            continue
    return plans


class ContractBuildPort(unittest.TestCase):
    def test_t033_build_js_validate_matches_canonical_on_every_fixture(self):
        source = BUILD_JS.read_text(encoding="utf-8")
        plans = load_plans()
        self.assertGreaterEqual(
            len(plans), 2, "expected at least the valid + invalid plans fixtures"
        )
        js_errors = run_js_validate(source, [plan for _, plan in plans])
        for (name, plan), js in zip(plans, js_errors):
            self.assertEqual(
                js,
                validate_plan(plan),
                f"build.js validate diverged from canonical on fixture {name}",
            )


if __name__ == "__main__":
    unittest.main()
