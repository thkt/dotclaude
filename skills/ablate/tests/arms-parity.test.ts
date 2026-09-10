/// <reference types="node" />
// Whether arms.py and arms.ts declare the same set of public names, compared as names rather
// than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's shape -- import
// the .ts module's exports directly and read the other side's names via pythonPublicNames).
// Value parity is arms.test.ts's and arms_test.py's job; this test never calls either arm_command
// or measurement_status, only reads which names each side declares. arms.py stays live as
// report.py's and usage_counts.py's import source until #646 retires it; this test retires with
// that slice.
//
// pythonPublicNames (./_python-public-names.ts) reads arms.py's own AST rather than importing it
// and calling dir(), because `from __future__ import annotations` binds a module-level name
// (`annotations`) that dir() would report as public even though that name is a language flag,
// not a declaration arms.py's text made -- comparing it against arms.ts's export list would
// report a mismatch neither side's constant count actually moved. See that module's header for
// how the AST read sidesteps it.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as arms from "../scripts/arms.ts";
import { pythonPublicNames } from "./_python-public-names.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

test("T-343 arms exports the same set of public names on both sides, compared as names rather than as a count", () => {
  const pyNames = pythonPublicNames(SCRIPTS_DIR, "arms");
  const tsNames = Object.keys(arms).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `arms.ts and arms.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
