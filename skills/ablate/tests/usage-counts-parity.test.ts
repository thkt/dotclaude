/// <reference types="node" />
// Whether usage_counts.py and usage_counts.ts declare the same set of public names, compared as
// names rather than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's
// shape -- import the .ts module's exports directly and read the other side's names via
// pythonPublicNames). Value parity is usage-counts.test.ts's and usage_counts_test.py's job; this
// test never calls element_path, count_usage, or classify, only reads which names each side
// declares.
//
// pythonPublicNames (./_python-public-names.ts, the same helper arms-parity.test.ts and
// dr-gate-parity.test.ts already reuse rather than each hand-rolling their own AST reader) reads
// usage_counts.py's own top-level bindings. usage_counts.ts's ElementUsage and UsageResult are TS
// `interface`s, which carry no runtime value and so never land in Object.keys() -- Python's
// usage_counts.py types the same two shapes as TypedDict classes of the same names, which the
// AST reader does pick up as public, so this comparison still sees them on the Python side alone
// without that being a real skew.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as usageCounts from "../scripts/usage_counts.ts";
import { pythonPublicNames } from "./_python-public-names.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

test("T-359 usage_counts exports the same set of public names on both sides", () => {
  const pyNames = pythonPublicNames(SCRIPTS_DIR, "usage_counts");
  const tsNames = Object.keys(usageCounts).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `usage_counts.ts and usage_counts.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
