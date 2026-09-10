/// <reference types="node" />
// Whether enforcer_map.py and enforcer_map.ts declare the same set of public names, compared as
// names rather than as a count (contract: hooks/_lib/tests/hook-payload-parity.test.ts:18's
// shape -- import the .ts module's exports directly and read the other side's names via
// pythonPublicNames). Value parity is enforcer-map.test.ts's and enforcer_map_test.py's job; this
// test never calls classify_line, classify_file, target_files, or map_all, only reads which
// names each side declares.
//
// pythonPublicNames (./_python-public-names.ts, the same helper arms-parity.test.ts and
// dr-gate-parity.test.ts already reuse rather than each hand-rolling their own AST reader) reads
// enforcer_map.py's own top-level bindings. enforcer_map.ts's EnforcerMapEntry is a TS
// `interface`, which carries no runtime value and so never lands in Object.keys() -- Python's
// enforcer_map.py has no matching class of its own (it types the same shape inline as
// list[dict[str, object]]), so this comparison never sees a mismatch from that type-only export.
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as enforcerMap from "../scripts/enforcer_map.ts";
import { pythonPublicNames } from "./_python-public-names.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = join(HERE, "..", "scripts");

test("T-358 enforcer_map exports the same set of public names on both sides", () => {
  const pyNames = pythonPublicNames(SCRIPTS_DIR, "enforcer_map");
  const tsNames = Object.keys(enforcerMap).sort();
  const tsOnly = tsNames.filter((name) => !pyNames.includes(name));
  const pyOnly = pyNames.filter((name) => !tsNames.includes(name));

  assert.deepEqual(
    tsNames,
    pyNames,
    `enforcer_map.ts and enforcer_map.py must declare the same public names -- ts-only: ${JSON.stringify(tsOnly)}, py-only: ${JSON.stringify(pyOnly)}`,
  );
});
