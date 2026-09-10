/// <reference types="node" />
// Whether arms.py and arms.ts declare the same set of public names, compared as names rather
// than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's shape -- import
// the .ts module's exports directly and spawn python3 once to read the other side's names).
// Value parity is arms.test.ts's and arms_test.py's job; this test never calls either arm_command
// or measurement_status, only reads which names each side declares. arms.py stays live as
// report.py's and usage_counts.py's import source until #646 retires it; this test retires with
// that slice.
//
// The python driver reads arms.py's own AST rather than importing it and calling dir(): `from
// __future__ import annotations` binds a module-level name (`annotations`) that dir() would
// report as public, but that name is a language flag, not a declaration arms.py's text made --
// comparing it against arms.ts's export list would report a mismatch neither side's constant
// count actually moved. Reading the source's own top-level Assign/AnnAssign/FunctionDef/
// ClassDef targets sidesteps that: a name reaches this comparison only when arms.py's text
// itself declares it, which is the "look at names, not values" contract.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as arms from "../scripts/arms.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

// Reads a python module's own top-level bindings from its source text and prints the ones that
// do not start with "_", sorted. No import, no execution: a name this driver cannot produce
// comes from a missing or unparsceable file, not from a sibling import failing at runtime.
const PY_DRIVER = `
import ast
import json
import sys

with open(sys.argv[1], encoding="utf-8") as f:
    tree = ast.parse(f.read(), filename=sys.argv[1])

names = []
for node in tree.body:
    if isinstance(node, ast.Assign):
        names += [t.id for t in node.targets if isinstance(t, ast.Name)]
    elif isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        names.append(node.target.id)
    elif isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
        names.append(node.name)

print(json.dumps(sorted(n for n in names if not n.startswith("_"))))
`;

/** The public top-level names `${module}.py` declares, read via a single python3 spawn. */
function pythonPublicNames(module: string): string[] {
  const result = spawnSync("python3", ["-c", PY_DRIVER, join(SCRIPTS_DIR, `${module}.py`)], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as string[];
}

test("T-343 arms exports the same set of public names on both sides, compared as names rather than as a count", () => {
  const pyNames = pythonPublicNames("arms");
  const tsNames = Object.keys(arms).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `arms.ts and arms.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
