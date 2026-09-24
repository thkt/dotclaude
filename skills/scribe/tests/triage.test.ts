/// <reference types="node" />
// Behavioral parity tests for skills/scribe/scripts/triage.ts against the retired Python
// original, replayed from the frozen fixture skills/scribe/tests/fixtures/triage-cases.json
// (U-001). Reuses the shared runCli/withTempHome/fixture/assertStdoutShape harness from
// workflows/_lib/tests/_cli-fixture.ts (skills/scribe/tests/find-wiki-rule.test.ts carries the
// sibling pattern), and hooks/_lib/shebang_scope.ts's trackedEntries for the git-index mode
// check, instead of a standalone statSync or spawn.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import {
  assertStdoutShape,
  fixture,
  runCli,
  withTempHome,
} from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { merge, readStore, triage, type Pattern } from "../scripts/triage.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "triage.ts");

// One frozen replay case, shaped like skills/scribe/tests/fixtures/triage-cases.json (U-001):
// `store` is the candidate store's content written to a fresh temp file before the run, or null
// when the run must see no store file at all; every "<store-path>" token in `argv` is
// substituted with that temp file's real path.
interface TriageCase {
  name: string;
  store: string | null;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "triage-cases.json"), "utf8"),
) as TriageCase[];

/** Runs one fixture case: writes `store` (when not null) to a fresh temp file that becomes the
 * candidate store, substitutes that file's path for the "<store-path>" placeholder in `argv`,
 * runs the CLI, and asserts the CLI's exit code and stdout against the case. */
function runCase(testCase: TriageCase, home: string): void {
  const dir = mkdtempSync(join(tmpdir(), "triage-case-"));
  try {
    const storePath = join(dir, "_candidates.md");
    if (testCase.store !== null) {
      writeFileSync(storePath, testCase.store);
    }
    const argv = testCase.argv.map((arg) => (arg === "<store-path>" ? storePath : arg));
    const run = runCli(SCRIPT, home, "", argv);
    assert.equal(run.status, testCase.exit, `${testCase.name}: exit code (stderr: ${run.stderr})`);
    assertStdoutShape(run.stdout, testCase.stdout, {}, {}, testCase.name);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test(
  "T-219 every frozen case in triage-cases.json reproduces the python triage's exit code and its stdout keys in order and values",
  () => {
    assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
    withTempHome((home) => {
      for (const testCase of CASES) {
        runCase(fixture(CASES, testCase.name), home);
      }
    });
  },
);

test(
  "T-220 a store row carrying no body after the evidence markers are cut is skipped, counted on stderr with its text, and adds no key to the stdout report",
  () => {
    withTempHome((home) => {
      const dir = mkdtempSync(join(tmpdir(), "triage-dropped-"));
      try {
        const storePath = join(dir, "_candidates.md");
        const bodylessLine = "- #123 (research)";
        writeFileSync(
          storePath,
          ["# candidates", "", "## 昇格待ち", "", bodylessLine, "", "## 単発", ""].join("\n"),
        );
        const run = runCli(SCRIPT, home, "", ["[]", storePath]);
        assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
        assert.match(run.stderr, /1/, "the dropped-row count reaches stderr");
        assert.ok(
          run.stderr.includes(bodylessLine),
          "the dropped row's own text reaches stderr",
        );
        const report = JSON.parse(run.stdout) as Record<string, unknown>;
        assert.deepEqual(
          Object.keys(report),
          ["pages", "candidates", "deferred", "commits"],
          "the dropped row adds no key to the stdout report",
        );
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    });
  },
);

test(
  "T-221 merge keeps the accumulated row first, unites its evidence with the fresh row's, and lets the fresh row's existing win",
  () => {
    const store: Pattern[] = [{ name: "acc", evidence: ["#1"], existing: "candidate" }];
    const fresh: Pattern[] = [
      { name: "acc", evidence: ["#2"], existing: "page" },
      { name: "z", evidence: ["#3", "#4", "#5"], existing: "none" },
    ];

    const merged = merge(store, fresh);

    assert.equal(merged[0]?.name, "acc", "the accumulated row stays first");
    assert.deepEqual(merged[0]?.evidence, ["#1", "#2"], "evidence unites without duplicating");
    assert.equal(merged[0]?.existing, "page", "the fresh row's existing wins");
  },
);

test(
  "T-222 a run missing the store argument exits 2 with a stderr line starting with usage:, and the tracked triage.ts carries mode 100755 and opens with the env node shebang",
  () => {
    withTempHome((home) => {
      const run = runCli(SCRIPT, home, "", ["[]"]);
      assert.equal(run.status, 2, `exit code (stderr: ${run.stderr})`);
      assert.match(run.stderr, /^usage:/);
    });

    const entries = trackedEntries(["skills/scribe/scripts/triage.ts"]);
    assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
    const [mode, absolutePath] = entries[0];
    assert.equal(mode, "100755", "git index mode");
    const firstLine = readFileSync(absolutePath, "utf8").split(/\r?\n/, 1)[0];
    assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");
  },
);

test("research links survive candidate round-trips and old and new paths count once", () => {
  const dir = mkdtempSync(join(tmpdir(), "triage-research-"));
  try {
    const store = join(dir, "_candidates.md");
    writeFileSync(
      store,
      "## 単発\n\n- retained pattern [prior](../../.claude/workspace/research/report.md)\n",
    );
    const rows = merge(readStore(store), [
      {
        name: "retained pattern",
        evidence: [
          "[research:report.md](../research/report.md)",
          "[root layout](../../research/report.md)",
          "[another label](../research/report.md)",
        ],
      },
    ]);
    const report = triage(rows);
    assert.equal(report.pages.length, 0, "one moved report cannot satisfy recurrence");
    assert.equal(report.candidates[0].name, "retained pattern");
    assert.deepEqual(report.candidates[0].evidence, [
      "[research:report.md](../research/report.md)",
    ]);
    writeFileSync(store, `## 単発\n\n- ${rows[0].name} ${rows[0].evidence?.join(" ")}\n`);
    assert.deepEqual(readStore(store)[0].evidence, report.candidates[0].evidence);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("distinct identified reports promote while duplicate markers do not", () => {
  const a = "[research:a.md](../research/a.md)";
  const b = "[research:b.md](../research/b.md)";
  const report = triage(
    merge(
      [],
      [
        { name: "one", evidence: [a, a] },
        { name: "two", evidence: [a, b] },
      ],
    ),
  );
  assert.deepEqual(
    report.pages.map((p) => [p.name, p.count]),
    [["two", 2]],
  );
  assert.deepEqual(
    report.candidates.map((p) => [p.name, p.count]),
    [["one", 1]],
  );
});

test("legacy unidentified research stays traceable without becoming an extra identified source", () => {
  const report = triage(
    merge(
      [
        { name: "old", evidence: ["(research)"] },
        { name: "retained", evidence: ["#12", "(research)"] },
      ],
      [{ name: "old", evidence: ["[research:a.md](../research/a.md)"] }],
    ),
  );
  assert.deepEqual(report.candidates[0].evidence, [
    "(research)",
    "[research:a.md](../research/a.md)",
  ]);
  assert.equal(
    report.candidates[0].count,
    1,
    "unidentified research is not evidence of a second source",
  );
  assert.equal(
    report.pages[0].name,
    "retained",
    "legacy candidate counts retain their established behavior",
  );
});
