/// <reference types="node" />
// Guards the frozen table itself against staleness while command_scan.py still lives
// (hooks/_lib/tests/fixtures/command-scan-tokens.json, captured from command_scan.py by U-002).
// command-scan-tokens.test.ts diffs command_scan.ts against that frozen table, so a generation
// mistake, a python3 version bump that changes shlex's behavior, or a hand-edit to command_scan.py
// could all still leave that test green: none of them touch command_scan.ts. This file is the one
// test that runs command_scan.py itself, so it is the only path that catches such drift while the
// .py file is still in the tree. #645 retires command_scan.py and deletes this file with it.
//
// Same PY_DRIVER shape as hook-payload-parity.test.ts: python3 has no CLI of its own to call, so
// a -c script is the smallest way to reach its named exports from outside the process. Unlike
// that file, this one spawns python3 exactly once for the whole corpus (per the contract) rather
// than once per case, feeding the full command list in over stdin.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { commandScanCorpus } from "./_command-scan-corpus.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_LIB_DIR = join(HERE, "..");
const FIXTURES_PATH = join(HERE, "fixtures", "command-scan-tokens.json");

interface FrozenCase {
  readonly name: string;
  readonly command: string;
  readonly commands_with_env: unknown;
  readonly raises: string | null;
}

/** The frozen table, keyed by its exact command string -- the same key
 * command-scan-corpus.test.ts's T-273 and command-scan-tokens.test.ts match rows on. */
function loadFrozenCases(): Map<string, FrozenCase> {
  const parsed = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as { cases: FrozenCase[] };
  return new Map(parsed.cases.map((row) => [row.command, row]));
}

function frozenRow(frozen: Map<string, FrozenCase>, command: string): FrozenCase {
  const row = frozen.get(command);
  assert.ok(row, `no frozen row for command ${JSON.stringify(command)}`);
  return row;
}

interface PythonResult {
  readonly commands_with_env: unknown;
  readonly raises: string | null;
}

// One python3 spawn for the whole corpus: reads the command list off stdin as a JSON array and
// hands back command_scan.py's commands_with_env() output per command, in the same {commands_with_env,
// raises} shape the frozen table itself uses -- a raising command records the exception's type
// name and a null commands_with_env, the way U-002 captured the freeze.
const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
import command_scan

commands = json.loads(sys.stdin.read())
results = []
for command in commands:
    try:
        pairs = [[env, tokens] for env, tokens in command_scan.commands_with_env(command)]
        results.append({"commands_with_env": pairs, "raises": None})
    except Exception as exc:
        results.append({"commands_with_env": None, "raises": type(exc).__name__})
print(json.dumps(results))
`;

function runPython(commands: readonly string[]): PythonResult[] {
  const result = spawnSync("python3", ["-c", PY_DRIVER, HOOKS_LIB_DIR], {
    input: JSON.stringify(commands),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return JSON.parse(result.stdout) as PythonResult[];
}

test("T-278 running command_scan.py over the whole corpus reproduces the frozen expectations, so the freeze has not gone stale", () => {
  const frozen = loadFrozenCases();
  const corpus = commandScanCorpus();
  assert.ok(corpus.length > 0, "the corpus must not be empty");

  const commands = corpus.map((c) => c.command);
  const results = runPython(commands);
  assert.equal(
    results.length,
    commands.length,
    "the python3 driver must return one result per corpus command",
  );

  commands.forEach((command, index) => {
    const row = frozenRow(frozen, command);
    const actual = results[index];
    assert.equal(
      actual.raises,
      row.raises,
      `commands_with_env(${JSON.stringify(command)}): raises must match the frozen table`,
    );
    assert.deepEqual(
      actual.commands_with_env,
      row.commands_with_env,
      `commands_with_env(${JSON.stringify(command)}) does not match the frozen table`,
    );
  });
});
