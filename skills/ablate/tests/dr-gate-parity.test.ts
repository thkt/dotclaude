/// <reference types="node" />
// Whether dr_gate.py and dr_gate.ts declare the same set of public names, compared as names
// rather than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's shape --
// import the .ts module's exports directly and read the other side's names via
// pythonPublicNames). Value parity is dr-gate.test.ts's and dr_gate_test.py's job; this test
// never calls gate, only reads which names each side declares. dr_gate.py stays live as
// report.py's import source until #646 retires it; this test retires with that slice.
//
// pythonPublicNames (./_python-public-names.ts) reads dr_gate.py's own AST rather than importing
// it and calling dir(): `import re`, `from pathlib import Path`, and `from verdict import
// DELETE_CANDIDATE` all bind names into dr_gate.py's namespace that dir() would report as
// public, but dr_gate.py's text never declares any of them as its own -- dr_gate.ts imports the
// same three kinds of names (readFileSync/globSync/join, DELETE_CANDIDATE) without re-exporting
// them (see dr_gate.ts's header), so a dir()-based comparison would report names neither side
// actually added or dropped. See _python-public-names.ts's header for how the AST read
// sidesteps it.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as drGate from "../scripts/dr_gate.ts";
import { pythonPublicNames } from "./_python-public-names.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

test("T-345 dr_gate exports the same set of public names on both sides", () => {
  const pyNames = pythonPublicNames(SCRIPTS_DIR, "dr_gate");
  const tsNames = Object.keys(drGate).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `dr_gate.ts and dr_gate.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
