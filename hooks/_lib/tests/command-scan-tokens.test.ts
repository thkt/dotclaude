/// <reference types="node" />
// Differential tests for command_scan.ts's commands_with_env() against the frozen table
// hooks/_lib/tests/fixtures/command-scan-tokens.json captured from the retired Python module,
// over the same corpus command-scan-corpus.test.ts already ties to that table (DR-0112). Unlike
// hook-payload-parity.test.ts's PY_DRIVER, this file never spawns python3 itself: the frozen
// table already is that retired module's answer for every corpus row, captured once by the unit
// that built it, so a fresh python3 call here would only re-derive what the fixture
// already holds.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { commands_with_env } from "../command_scan.ts";
import { commandScanCorpus } from "./_command-scan-corpus.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = join(HERE, "fixtures", "command-scan-tokens.json");

interface FrozenCase {
  readonly name: string;
  readonly command: string;
  readonly commands_with_env: unknown;
  readonly raises: string | null;
}

/** The frozen table, keyed by its exact command string -- the same key
 * command-scan-corpus.test.ts's T-273 matches rows on. */
function loadFrozenCases(): Map<string, FrozenCase> {
  const parsed = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as { cases: FrozenCase[] };
  return new Map(parsed.cases.map((row) => [row.command, row]));
}

function frozenRow(frozen: Map<string, FrozenCase>, command: string): FrozenCase {
  const row = frozen.get(command);
  assert.ok(row, `no frozen row for command ${JSON.stringify(command)}`);
  return row;
}

test("T-275 every corpus case reproduces the frozen commands_with_env output, compared as parsed JSON", () => {
  const frozen = loadFrozenCases();
  const corpus = commandScanCorpus();
  assert.ok(corpus.length > 0, "the corpus must not be empty");

  for (const { command } of corpus) {
    const row = frozenRow(frozen, command);
    if (row.raises) {
      // A raising case has no commands_with_env to compare; T-276 covers the raise itself.
      continue;
    }
    const actual = [...commands_with_env(command)];
    // Round-tripped through JSON, as the frozen table itself was captured: this is what
    // separates "structurally equal object" from "the same value once serialized", which
    // matters once env stops being an always-empty object.
    const actualAsJson = JSON.parse(JSON.stringify(actual)) as unknown;
    assert.deepEqual(
      actualAsJson,
      row.commands_with_env,
      `commands_with_env(${JSON.stringify(command)}) does not match the frozen table`,
    );
  }
});

test("T-276 every corpus case that records a raise throws, and one that does not record a raise returns without throwing", () => {
  const frozen = loadFrozenCases();
  const corpus = commandScanCorpus();
  const raising = corpus.filter((c) => frozenRow(frozen, c.command).raises !== null);
  const nonRaising = corpus.filter((c) => frozenRow(frozen, c.command).raises === null);
  assert.ok(raising.length > 0, "the corpus must carry at least one raising case");
  assert.ok(nonRaising.length > 0, "the corpus must carry at least one non-raising case");

  for (const { command } of raising) {
    assert.throws(
      () => [...commands_with_env(command)],
      `expected commands_with_env(${JSON.stringify(command)}) to throw`,
    );
  }

  const { command } = nonRaising[0];
  assert.doesNotThrow(
    () => [...commands_with_env(command)],
    `expected commands_with_env(${JSON.stringify(command)}) not to throw`,
  );
});

test("T-277 a command carrying a non-BMP character keeps that character inside its token instead of splitting at the surrogate pair", () => {
  // U+1F600 GRINNING FACE needs a UTF-16 surrogate pair; reading the command by UTF-16 code
  // unit instead of by Unicode code point would split the pair across two lexer reads and
  // hand back a token ending or starting mid-character.
  const face = "\u{1F600}";
  const command = `echo alpha${face}beta`;

  const result = [...commands_with_env(command)];
  assert.equal(result.length, 1, `expected exactly one command from ${JSON.stringify(command)}`);
  const [, tokens] = result[0];
  assert.deepEqual(tokens, ["echo", `alpha${face}beta`]);
});
