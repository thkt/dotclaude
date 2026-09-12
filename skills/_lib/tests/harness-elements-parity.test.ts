/// <reference types="node" />
// Whether harness_elements.py and harness_elements.ts declare the same set of public names,
// compared as names rather than as a count (contract: hooks/_lib/tests/hook-payload-
// parity.test.ts:18's shape -- import the .ts module's exports directly and read the other
// side's names via pythonPublicNames, the same shape skills/ablate/tests/arms-parity.test.ts and
// its dr_gate/verdict siblings already use). Value parity is harness-elements.test.ts's and
// harness_elements_test.py's job; this test never calls classify or enumerate_elements, only
// reads which names each side declares.
//
// pythonPublicNames (skills/ablate/tests/_python-public-names.ts, reused rather than hand-rolled
// per its own header) reads harness_elements.py's own AST and drops any name starting with "_",
// which is where harness_elements.py's own _frontmatter_lines / _unquote / _read_array fall --
// those three stay module-private helpers on the Python side. harness_elements.ts carries them
// under the same leading-underscore names (this port keeps Python's snake_case identifiers
// verbatim, per arms.ts's header), but a TS `export` still puts them in Object.keys() at
// runtime, since TS has no import-time notion of the leading-underscore convention Python
// enforces by starts-with-"_" only in this AST reader, not in the language. Filtering tsNames
// through the same starts-with-"_" rule keeps this comparison reading "public names" on both
// sides, not "every declared name" on one side and "public names" on the other.
//
// harness_elements.py's `class HarnessElement(TypedDict)` never reaches pyNames either:
// pythonPublicNames drops a top-level TypedDict class the same way it drops a leading-underscore
// name, because it is Python's shape-only type declaration, the role harness_elements.ts's
// `export interface HarnessElement` plays on the TS side -- an interface carries no runtime
// value, so it never lands in Object.keys() there. Without that drop this comparison would
// report a name only Python's side ever "had", though neither side's runtime API actually moved.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as harnessElements from "../harness_elements.ts";
import { pythonPublicNames } from "../../ablate/tests/_python-public-names.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB_DIR = join(HERE, "..");

test("T-357 harness_elements exports the same set of public names on both sides, compared as names rather than as a count", () => {
  const pyNames = pythonPublicNames(LIB_DIR, "harness_elements");
  const tsNames = Object.keys(harnessElements)
    .filter((name) => !name.startsWith("_"))
    .sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `harness_elements.ts and harness_elements.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
