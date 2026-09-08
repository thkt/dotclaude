/// <reference types="node" />
// Behavior tests for workflows/audit/snapshot.ts, the TypeScript port of the Python audit
// recorder workflows/audit/snapshot.py. T-131..T-133 replay the frozen fixture in
// tests/fixtures/snapshot-cases.json, produced by running the Python recorder itself before
// it was retired (U-001), and compare the port's stdin/stdout/record/exit against it case by
// case. Unlike workflows/build/record.ts (one growing history/build-runs.jsonl), this
// recorder writes one whole file per run named audit-<YYYY-MM-DD-HHMMSS>.json, so the
// written path itself is minted fresh on every run and is compared by shape
// ("<audit-record-path>"), exactly like the uuid4hex/timestamp placeholders. The replay
// primitives (runCli, withTempHome, historyPath, assertRowShape, assertStdoutShape, fixture)
// live in workflows/_lib/tests/_cli-fixture.ts, shared with workflows/build/tests/record.test.ts
// and workflows/assert/tests/record.test.ts.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  assertRowShape,
  assertStdoutShape,
  fixture,
  historyPath,
  runCli,
  withTempHome,
  type FixtureCase,
} from "../../_lib/tests/_cli-fixture.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "snapshot.ts");
const REPO_ROOT = join(HERE, "..", "..", "..");
const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "snapshot-cases.json"), "utf8"),
) as FixtureCase[];

const UTC_ISO8601_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
// The recorder's own filename, not a fixed history file name like build/assert's -- minted
// fresh (to the second) on every run, so it is checked by shape like the uuid4hex/timestamp
// placeholders rather than substituted for one known path.
const AUDIT_RECORD_PATH = /\.claude[\\/]history[\\/]audit-\d{4}-\d{2}-\d{2}-\d{6}\.json$/;
const SHAPE_CHECKS: Record<string, RegExp> = {
  "<utc-iso8601-Z>": UTC_ISO8601_Z,
  "<audit-record-path>": AUDIT_RECORD_PATH,
};

/** The fixture's stdout carries `path` as the shape-checked placeholder, not a resolvable
 * `<history-path>` (there is no fixed file name to resolve to), so the real path this run
 * wrote to is read back from the actual stdout instead. */
function writtenPath(stdout: string): string {
  return (JSON.parse(stdout) as { path: string }).path;
}

test(
  "T-131 every frozen case in snapshot-cases.json reproduces the python recorder's exit " +
    "code, stdout keys in order with path compared by shape, and the written record's keys " +
    "in order with generated_at compared by shape",
  () => {
    for (const testCase of FIXTURES) {
      withTempHome((home) => {
        const result = runCli(SCRIPT, home, testCase.stdin);
        assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
        assertStdoutShape(result.stdout, testCase.stdout, {}, SHAPE_CHECKS, testCase.name);

        const rows = testCase.rows ?? [];
        if (rows.length === 0) return;
        const path = writtenPath(result.stdout);
        const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
        assertRowShape(
          record,
          rows[0] as Record<string, unknown>,
          SHAPE_CHECKS,
          `${testCase.name}: record`,
        );
      });
    }
  },
);

test(
  "T-132 an unparseable or non-object payload exits 1, prints nothing to stdout, starts " +
    "stderr with the python recorder's message prefix, and writes no audit-*.json",
  () => {
    for (const name of ["not_json", "non_object_payload"]) {
      const testCase = fixture(FIXTURES, name);
      withTempHome((home) => {
        const result = runCli(SCRIPT, home, testCase.stdin);
        assert.equal(result.status, 1, `${name}: exit code`);
        assert.equal(result.stdout, "", `${name}: stdout`);
        assert.equal(result.stderr.startsWith("Error: "), true, `${name}: stderr prefix`);

        const dir = historyPath(home, "audit-probe.json").replace(/audit-probe\.json$/, "");
        const auditFiles = existsSync(dir)
          ? readdirSync(dir).filter((entry) => /^audit-.*\.json$/.test(entry))
          : [];
        assert.deepEqual(auditFiles, [], `${name}: no audit-*.json written`);
      });
    }
  },
);

test(
  "T-133 a record already present in the history directory does not change the content of " +
    "the record written after it apart from generated_at and path",
  () => {
    const testCase = fixture(FIXTURES, "counted_payload");

    const recordWithoutGeneratedAt = (home: string): Record<string, unknown> => {
      const result = runCli(SCRIPT, home, testCase.stdin);
      assert.equal(result.status, 0, "exit code");
      const path = writtenPath(result.stdout);
      const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      const { generated_at: _generated_at, ...rest } = record;
      return rest;
    };

    const withoutPriorRecord = withTempHome((home) => recordWithoutGeneratedAt(home));
    const withPriorRecord = withTempHome((home) => {
      const dir = historyPath(home, "audit-2020-01-01-000000.json");
      writeFileSync(dir, JSON.stringify({ unrelated: true }));
      return recordWithoutGeneratedAt(home);
    });

    assert.deepEqual(
      withPriorRecord,
      withoutPriorRecord,
      "a pre-existing history record changed the content of the newly written record",
    );
  },
);

test(
  "T-134 branch equals what git rev-parse --abbrev-ref HEAD prints for the checkout when " +
    "git is on PATH, and the frozen PATH-less case records unknown",
  () => {
    const expectedBranch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();

    withTempHome((home) => {
      // Unlike runCli (which clears PATH so a CLI cannot lean on the ambient environment),
      // this run keeps the real PATH and repo cwd on purpose, to exercise the git-found path
      // of git_branch against the same command the test used to compute expectedBranch.
      const result = spawnSync(process.execPath, [SCRIPT], {
        input: JSON.stringify({ scope: "HEAD", focus: "all" }),
        encoding: "utf8",
        cwd: REPO_ROOT,
        env: { ...process.env, HOME: home },
      });
      assert.equal(result.status, 0, "git-on-PATH case: exit code");
      const path = writtenPath(result.stdout);
      const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      assert.equal(record.branch, expectedBranch, "git-on-PATH case: branch");
    });

    const pathlessCase = fixture(FIXTURES, "resolved_fields_payload");
    withTempHome((home) => {
      const result = runCli(SCRIPT, home, pathlessCase.stdin);
      assert.equal(result.status, 0, "PATH-less case: exit code");
      const path = writtenPath(result.stdout);
      const record = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
      assert.equal(record.branch, "unknown", "PATH-less case: branch");
    });
  },
);
