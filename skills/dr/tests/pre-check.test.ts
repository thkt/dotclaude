/// <reference types="node" />
// Behavior tests for skills/dr/scripts/pre-check.ts: the TS port of the retired Python
// pre-check's validation, numbering, slug, and similar_drs logic.
// skills/dr/tests/fixtures/pre-check-cases.json (built by U-001) freezes the retired Python
// pre-check's own argv/env -> exit/stdout, so T-200 replays it through
// workflows/_lib/tests/_cli-fixture.ts's runCli rather than hand-writing cases that could drift
// from the Python script it must match. T-201..T-203 isolate the numbering and formatScore
// pieces the fixture cases only cover indirectly.
//
// This unit is still Red (see pre-check.ts's own header): every scenario below fails on its
// planned assertion against the scaffold's "not implemented" stub, not on a module/parse/type
// error.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertStdoutShape, fixture, runCli } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { formatScore, OUTPUT_KEYS } from "../scripts/pre-check.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/dr/tests -> skills/dr -> skills -> repo root, the same climb
// skills/_lib/tests/harness-hash-cli.test.ts's REPO_ROOT makes from the same starting point.
const TS_SCRIPT = join(HERE, "..", "scripts", "pre-check.ts");

interface FixtureCase {
  name: string;
  setup: Record<string, string>;
  argv: string[];
  env: Record<string, string>;
  exit: number;
  stdout: string;
  files_after: Record<string, string>;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "pre-check-cases.json"), "utf8"),
) as FixtureCase[];

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** Creates a fresh temp directory, writes `setup`'s files under it (each key a path relative
 * to the directory), runs `fn` against it, and removes it afterward whether `fn` returns or
 * throws -- so a case's leftover files never bleed into the next case. */
function withCaseDir<T>(setup: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "pre-check-case-"));
  try {
    for (const [relPath, content] of Object.entries(setup)) {
      const full = join(dir, relPath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("T-200 every frozen case in pre-check-cases.json reproduces the python script's exit code and stdout keys in the order OUTPUT_KEYS declares, with date compared by shape and dr_dir by the literal DR_DIR env value", () => {
  for (const entry of CASES) {
    withCaseDir(entry.setup, (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      assertStdoutShape(
        run.stdout,
        entry.stdout,
        // resolveDrDir returns DR_DIR verbatim (the retired Python pre-check's
        // Path(os.environ["DR_DIR"]) never resolves against cwd either), so every case's dr_dir
        // field is the literal env value -- confirmed against a real `DR_DIR=archive` run of
        // the retired Python pre-check script, whose stdout carried "archive", not a
        // cwd-joined path.
        { "<dr-dir>": entry.env.DR_DIR },
        { "<date>": DATE_SHAPE },
        entry.name,
      );
      if (entry.exit === 0) {
        const parsed = JSON.parse(run.stdout) as Record<string, unknown>;
        assert.deepEqual(
          Object.keys(parsed),
          [...OUTPUT_KEYS],
          `${entry.name}: stdout key order matches OUTPUT_KEYS`,
        );
        // JSON.stringify(parsed, null, 2) round-trips to the same text only when the original
        // stdout was already indented by 2 -- indent 4 or a single line would diverge here.
        assert.equal(
          run.stdout,
          `${JSON.stringify(parsed, null, 2)}\n`,
          `${entry.name}: stdout is JSON with a 2-space indent`,
        );
      }
    });
  }
});

test("T-201 the number is one more than the largest NNNN- prefix in the directory and 0001 in an empty one", () => {
  withCaseDir({}, (dir) => {
    const run = runCli(TS_SCRIPT, dir, "", ["Test Title Here"], { cwd: dir, env: { DR_DIR: "archive" } });
    assert.equal(run.status, 0, `empty dir: exit code (stderr: ${run.stderr})`);
    const parsed = JSON.parse(run.stdout) as { number: string };
    assert.equal(parsed.number, "0001", "an empty (or nonexistent) archive starts at 0001");
  });

  withCaseDir(
    { "archive/0002-a.md": "# A\n", "archive/0005-b.md": "# B\n" },
    (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", ["Test Title Here"], { cwd: dir, env: { DR_DIR: "archive" } });
      assert.equal(run.status, 0, `numbered dir: exit code (stderr: ${run.stderr})`);
      const parsed = JSON.parse(run.stdout) as { number: string };
      assert.equal(parsed.number, "0006", "the next number follows the largest prefix (0005), not the file count (2)");
    },
  );
});

test("T-202 a title outside 5 to 64 characters or carrying a forbidden character exits 1 with the python script's first stderr line and writes nothing", () => {
  withCaseDir({}, (dir) => {
    for (const name of ["title-under-5-chars-errors", "title-over-64-chars-errors"]) {
      const entry = fixture(CASES, name);
      const title = entry.argv[0];
      const run = runCli(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, 1, `${name}: exit code`);
      assert.equal(run.stdout, "", `${name}: stdout is empty`);
      assert.equal(
        run.stderr.split("\n")[0],
        `Error: title length ${title.length} chars (required 5-64)`,
        `${name}: first stderr line matches the retired Python pre-check's fail(f"Error: title length {len(title)} chars (required 5-64)")`,
      );
    }

    const forbidden = fixture(CASES, "title-with-forbidden-characters-errors");
    const run = runCli(TS_SCRIPT, dir, "", forbidden.argv, { cwd: dir, env: forbidden.env });
    assert.equal(run.status, 1, `${forbidden.name}: exit code`);
    assert.equal(run.stdout, "", `${forbidden.name}: stdout is empty`);
    assert.equal(
      run.stderr.split("\n")[0],
      'Error: forbidden characters in title (/:*?"<>|)',
      `${forbidden.name}: first stderr line matches the retired Python pre-check's fail('Error: forbidden characters in title (/:*?"<>|)')`,
    );
  });
});

test("T-203 formatScore renders an exact tie such as 0.625 as 0.62 the way python's .2f does, and renders 0.375 as 0.38", () => {
  // Verified against python3 -c "print(format(0.625, '.2f')); print(format(0.375, '.2f'))",
  // which prints 0.62 then 0.38 -- both ties land on the even digit, not the digit above.
  assert.equal(formatScore(0.625), "0.62");
  assert.equal(formatScore(0.375), "0.38");
});
