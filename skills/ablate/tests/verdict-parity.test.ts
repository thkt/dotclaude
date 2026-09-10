/// <reference types="node" />
// Whether verdict.py and verdict.ts declare the same set of public names, compared as names
// rather than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's shape --
// import the .ts module's exports directly and spawn python3 once to read the other side's
// names). Value parity is verdict.test.ts's and verdict_test.py's job; this test never calls
// classify, only reads which names each side declares. verdict.py stays live as report.py's
// import source until #646 retires it; this test retires with that slice.
//
// The python driver reads verdict.py's own AST rather than importing it and calling dir():
// `from arms import UNMEASURED` binds UNMEASURED into verdict.py's namespace, so dir() would
// report it as one of verdict's own public names, but verdict.py's text never declares it --
// verdict.ts reads UNMEASURED from arms.ts the same way and does not re-export it (see
// verdict.ts's header), so a dir()-based comparison would report a name neither side actually
// added or dropped. Reading the source's own top-level Assign/AnnAssign/FunctionDef/ClassDef
// targets sidesteps that: a name reaches this comparison only when verdict.py's text itself
// declares it, which is the "look at names, not values" contract.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as verdict from "../scripts/verdict.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

// Reads a python module's own top-level bindings from its source text and prints the ones that
// do not start with "_", sorted. No import, no execution: a name this driver cannot produce
// comes from a missing or unparseable file, not from a sibling import failing at runtime.
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

test("T-344 verdict exports the same set of public names on both sides", () => {
  const pyNames = pythonPublicNames("verdict");
  const tsNames = Object.keys(verdict).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `verdict.ts and verdict.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
