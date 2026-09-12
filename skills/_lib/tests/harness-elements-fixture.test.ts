/// <reference types="node" />
// Fixture-freeze test for skills/_lib/harness_elements.py, per
// docs/wiki/fixture-freeze-before-port.md: skills/_lib/tests/fixtures/harness-elements-cases.json
// freezes the real python3 harness_elements.py's own argv -> exit/stdout, captured by running it
// against a constructed temp repo tree. This unit only freezes the fixture -- no TypeScript port
// exists yet -- so T-346 replays it straight through python3 rather than through a ported CLI,
// the way skills/census/tests/list-source-files.test.ts replays its own fixture once that port
// lands.
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadTreeFixtures, replayTreeFixtures, runPythonCli } from "./_python-cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "harness_elements.py");

const CASES = loadTreeFixtures(join(HERE, "fixtures", "harness-elements-cases.json"));

test("T-346 every frozen case reproduces the python script's exit code and stdout, replayed through the real CLI", () => {
  replayTreeFixtures(CASES, "harness-elements-case", (argv) => runPythonCli(SCRIPT, argv));
});
