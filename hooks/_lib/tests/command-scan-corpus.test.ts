/// <reference types="node" />
// Guards hooks/_lib/tests/_command-scan-corpus.ts's commandScanCorpus(), the single derivation
// hooks/_lib/tests/fixtures/command-scan-tokens.json's frozen-behavior table and
// command-scan-tokens.test.ts both read. T-273
// ties the corpus to the frozen table; T-274 ties it to the three products the contract
// describes (lexical x placement, heredoc forms, and the resolve layer) rather than to the
// curated cases layered on top, so a corpus that drops a product member cannot hide behind a
// count that still reaches the same total.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  commandScanCorpus,
  heredocCases,
  lexicalCases,
  resolveCases,
} from "./_command-scan-corpus.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = join(HERE, "fixtures", "command-scan-tokens.json");

interface FrozenCase {
  name: string;
  command: string;
  commands_with_env: unknown;
  raises: string | null;
}

function loadFrozenCases(): FrozenCase[] {
  const parsed = JSON.parse(readFileSync(FIXTURES_PATH, "utf8")) as { cases: FrozenCase[] };
  return parsed.cases;
}

test("T-273 the generated corpus carries at least 150 cases and every row of the frozen-behavior table appears in it by its exact command string", () => {
  const corpus = commandScanCorpus();
  assert.ok(corpus.length >= 150, `expected at least 150 corpus cases, got ${corpus.length}`);

  const commands = new Set(corpus.map((c) => c.command));
  for (const row of loadFrozenCases()) {
    assert.ok(
      commands.has(row.command),
      `frozen row ${row.name} (${JSON.stringify(row.command)}) is missing from the generated corpus`,
    );
  }
});

test("T-274 the corpus carries every input the generator's three products yield, compared as a set against a fresh call rather than as a count", () => {
  const corpus = commandScanCorpus();
  const corpusCommands = new Set(corpus.map((c) => c.command));

  // "a fresh call": re-derive the three products independently of commandScanCorpus()'s own
  // concatenation, so a corpus whose length merely reaches the expected total cannot pass this
  // the way a count comparison could if it substituted or dropped a product member.
  const freshProducts = new Set(
    [...lexicalCases(), ...heredocCases(), ...resolveCases()].map((c) => c.command),
  );
  assert.ok(
    freshProducts.size >= 100,
    `expected the three products to yield at least 100 cases fresh, got ${freshProducts.size}`,
  );

  for (const command of freshProducts) {
    assert.ok(
      corpusCommands.has(command),
      `corpus is missing product case ${JSON.stringify(command)}`,
    );
  }
});
