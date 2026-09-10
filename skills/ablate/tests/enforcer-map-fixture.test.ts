/// <reference types="node" />
// Fixture-freeze test for skills/ablate/scripts/enforcer_map.py, per
// docs/wiki/fixture-freeze-before-port.md: skills/ablate/tests/fixtures/enforcer-map-cases.json
// freezes the real python3 enforcer_map.py's own argv -> exit/stdout, captured by running it
// (with skills/_lib on PYTHONPATH, per the script's own docstring) against a constructed temp
// repo tree. This unit only freezes the fixture -- no TypeScript port exists yet -- so T-346
// replays it straight through python3.
import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runPythonCli, writeTree } from "../../_lib/tests/_python-cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "enforcer_map.py");
const LIB_DIR = join(HERE, "..", "..", "_lib");

const ROOT_PLACEHOLDER = "<root>";

interface FixtureCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "enforcer-map-cases.json"), "utf8"),
) as FixtureCase[];

test("T-346 every frozen case reproduces the python script's exit code and stdout, replayed through the real CLI", () => {
  assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
  for (const entry of CASES) {
    const root = writeTree("enforcer-map-case", entry.files);
    try {
      const argv = entry.argv.map((token) => (token === ROOT_PLACEHOLDER ? root : token));
      const run = runPythonCli(SCRIPT, argv, { env: { PYTHONPATH: LIB_DIR } });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      assert.equal(
        run.stdout,
        entry.stdout.replaceAll(ROOT_PLACEHOLDER, root),
        `${entry.name}: stdout`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});
