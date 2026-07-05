#!/usr/bin/env python3
"""T-033: workflows/build.js の marker 囲み validate コピーを canonical な veto.py
validate_plan にロックする contract test。build.js は canonical を import できない
(本体が workflow の AsyncFunction として wrap され、かつ JS のため)。そこで両者を
ここで lockstep に保つ: build.js コピーを CONTRACT-TEST marker 間から抽出し、共有の
plans fixture 全件に node で実行し、canonical と同一の errors を返すことを assert する。
marker 不在は extract_body が大きく raise するので、marker 落ちは silent skip でなく
このテストの失敗になる。

実行: python3 hooks/veto/tests/contract_build_port.py
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
    """marker で区切られた validate 本体を抽出する。marker 不在は contract チェックを
    silent skip せず大きく raise する。"""
    start = source.find(BEGIN)
    end = source.find(END)
    if start == -1 or end == -1 or end < start:
        raise ValueError(
            f"CONTRACT-TEST markers not found in build.js (start={start}, end={end})"
        )
    return source[start + len(BEGIN) : end]


def run_js_validate(source, plans):
    """抽出した本体 (`const validate = ...`) を ES module として 1 度実体化し、node 1 回の
    起動で全 plan に実行して errors 配列のリストを返す。"""
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
    """validate を通すのは valid JSON の fixture のみ。malformed.json は stdin parse 境界の
    テスト用で validate には届かないため、下の parse ガードで skip する。"""
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
