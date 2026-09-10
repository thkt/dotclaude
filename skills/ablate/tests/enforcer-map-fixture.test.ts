/// <reference types="node" />
// Fixture-freeze test for skills/ablate/scripts/enforcer_map.py, per
// docs/wiki/fixture-freeze-before-port.md: skills/ablate/tests/fixtures/enforcer-map-cases.json
// freezes the real python3 enforcer_map.py's own argv -> exit/stdout, captured by running it
// (with skills/_lib on PYTHONPATH, per the script's own docstring) against a constructed temp
// repo tree. This unit only freezes the fixture -- no TypeScript port exists yet -- so T-346
// replays it straight through python3.
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  loadTreeFixtures,
  replayTreeFixtures,
  runPythonCli,
} from "../../_lib/tests/_python-cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "enforcer_map.py");
const LIB_DIR = join(HERE, "..", "..", "_lib");

const CASES = loadTreeFixtures(join(HERE, "fixtures", "enforcer-map-cases.json"));

test("T-346 every frozen case reproduces the python script's exit code and stdout, replayed through the real CLI", () => {
  replayTreeFixtures(CASES, "enforcer-map-case", (argv) =>
    runPythonCli(SCRIPT, argv, { env: { PYTHONPATH: LIB_DIR } }),
  );
});
