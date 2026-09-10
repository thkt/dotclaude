/// <reference types="node" />
// Whether verdict.py and verdict.ts declare the same set of public names, compared as names
// rather than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's shape --
// import the .ts module's exports directly and read the other side's names via
// pythonPublicNames). Value parity is verdict.test.ts's and verdict_test.py's job; this test
// never calls classify, only reads which names each side declares. verdict.py stays live as
// report.py's import source until #646 retires it; this test retires with that slice.
//
// pythonPublicNames (./_python-public-names.ts) reads verdict.py's own AST rather than importing
// it and calling dir(): `from arms import UNMEASURED` binds UNMEASURED into verdict.py's
// namespace, so dir() would report it as one of verdict's own public names, but verdict.py's
// text never declares it -- verdict.ts reads UNMEASURED from arms.ts the same way and does not
// re-export it (see verdict.ts's header), so a dir()-based comparison would report a name
// neither side actually added or dropped. See _python-public-names.ts's header for how the AST
// read sidesteps it.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as verdict from "../scripts/verdict.ts";
import { pythonPublicNames } from "./_python-public-names.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

test("T-344 verdict exports the same set of public names on both sides", () => {
  const pyNames = pythonPublicNames(SCRIPTS_DIR, "verdict");
  const tsNames = Object.keys(verdict).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `verdict.ts and verdict.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
