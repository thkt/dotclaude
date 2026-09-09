/// <reference types="node" />
// Behavior tests for skills/dr/scripts/update-index.ts: the TS port of the retired Python
// update-index's README.md generation (DR List table, By Status sections, atomic write).
// skills/dr/tests/fixtures/update-index-cases.json (built by U-001) freezes the retired Python
// update-index's own argv/env -> exit/stdout/README, so T-208 replays it through
// workflows/_lib/tests/_cli-fixture.ts's runCli rather than hand-writing cases that could drift
// from the Python script it must match. Unlike pre-check.ts and validate-dr.ts, this CLI's
// stdout is a bare path line, not JSON, so T-208 compares it and the written README.md
// directly instead of through _cli-fixture.ts's JSON-shaped assertStdoutShape. T-209..T-211
// isolate the number-ordering, unmatched-status, and atomic-write behavior the fixture cases
// only cover indirectly (one already-sorted case; no case exercises a leftover temp file).
//
// This unit is still Red (see update-index.ts's own header): every scenario below fails on its
// planned assertion against the scaffold's unconditional "not implemented" throw, not on a
// module/parse/type error.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { STATUS_SECTIONS } from "../scripts/update-index.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
// skills/dr/tests -> skills/dr -> skills -> repo root, the same climb
// skills/dr/tests/pre-check.test.ts's TS_SCRIPT makes from the same starting point.
const TS_SCRIPT = join(HERE, "..", "scripts", "update-index.ts");

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
  readFileSync(join(HERE, "fixtures", "update-index-cases.json"), "utf8"),
) as FixtureCase[];

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** Creates a fresh temp directory, writes `setup`'s files under it (each key a path relative
 * to the directory), runs `fn` against it, and removes it afterward whether `fn` returns or
 * throws -- so a case's leftover files never bleed into the next case. The same helper
 * skills/dr/tests/pre-check.test.ts's and skills/dr/tests/validate-dr.test.ts's withCaseDir
 * provide, duplicated here rather than shared: each CLI's fixture shape is unrelated beyond
 * this one setup step. */
function withCaseDir<T>(setup: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "update-index-case-"));
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

/** Compares an actual README.md against a fixture's expected content that carries exactly one
 * "<date>" placeholder (the footer's "*Last updated: <date>*" line) -- the literal text
 * before and after the placeholder must match exactly, and the placeholder's own actual text
 * must match DATE_SHAPE, since update-index.ts stamps today's date rather than a frozen one. */
function assertReadmeDateShape(actual: string, expectedWithPlaceholder: string, label: string): void {
  const [prefix, suffix] = expectedWithPlaceholder.split("<date>");
  assert.equal(actual.startsWith(prefix), true, `${label}: text up to the date placeholder matches`);
  assert.equal(actual.endsWith(suffix), true, `${label}: text after the date placeholder matches`);
  const dateSlice = actual.slice(prefix.length, actual.length - suffix.length);
  assert.match(dateSlice, DATE_SHAPE, `${label}: date shape`);
}

test("T-208 every frozen case in update-index-cases.json reproduces the python script's exit code, stdout path, and the README content with the date compared by shape", () => {
  for (const entry of CASES) {
    withCaseDir(entry.setup, (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      // The retired Python update-index's stdout is print(index_file) -- a bare path line, not
      // JSON, so this resolves the fixture's "<dr-dir>" placeholder to the case's own DR_DIR
      // and compares the line verbatim rather than routing through _cli-fixture.ts's
      // JSON-shaped assertStdoutShape.
      const expectedStdout = entry.stdout.replace("<dr-dir>", entry.env.DR_DIR ?? "");
      assert.equal(run.stdout, expectedStdout, `${entry.name}: stdout path`);
      for (const [relPath, expectedContent] of Object.entries(entry.files_after)) {
        const actual = readFileSync(join(dir, relPath), "utf8");
        if (expectedContent.includes("<date>")) {
          assertReadmeDateShape(actual, expectedContent, `${entry.name}: ${relPath}`);
        } else {
          assert.equal(actual, expectedContent, `${entry.name}: ${relPath}`);
        }
      }
    });
  }
});

test("T-209 the DR List rows follow file name order and each By Status section lists its entries sorted by number", () => {
  withCaseDir(
    {
      // Written out of numeric order, and titled in reverse-alphabetical order relative to
      // their numbers, so a sort that fell back to insertion order or title would produce a
      // different row/entry order than the file-name (number) order this test asserts.
      "archive/0003-alpha-decision.md": '---\nstatus: "proposed"\n---\n# Alpha Title\n\nbody\n',
      "archive/0001-charlie-decision.md": '---\nstatus: "proposed"\n---\n# Zulu Title\n\nbody\n',
      "archive/0002-bravo-decision.md": '---\nstatus: "proposed"\n---\n# Mike Title\n\nbody\n',
    },
    (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", [], { cwd: dir, env: { DR_DIR: "archive" } });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const readme = readFileSync(join(dir, "archive", "README.md"), "utf8");

      const listNumbers = [...readme.matchAll(/^\| \[(\d{4})\]/gm)].map((m) => m[1]);
      assert.deepEqual(
        listNumbers,
        ["0001", "0002", "0003"],
        "DR List rows follow file name (number) order, not the titles' reverse-alphabetical order",
      );

      const proposedSection = readme.slice(
        readme.indexOf("### Proposed"),
        readme.indexOf("## About MADR Format"),
      );
      const sectionNumbers = [...proposedSection.matchAll(/\*\*(\d{4})\*\*/g)].map((m) => m[1]);
      assert.deepEqual(
        sectionNumbers,
        ["0001", "0002", "0003"],
        "the Proposed section lists its entries sorted by number, not by title",
      );
    },
  );
});

test("T-210 a status value matching no section key is listed in the table and absent from every By Status section", () => {
  const status = "withdrawn";
  assert.equal(
    STATUS_SECTIONS.some(([key]) => status.startsWith(key)),
    false,
    `${status}: guard -- the fixture's chosen status must start with none of STATUS_SECTIONS' keys`,
  );

  withCaseDir(
    {
      "archive/0001-withdrawn-decision.md":
        `---\nstatus: "${status}"\n---\n# Withdrawn Decision\n\nbody\n`,
    },
    (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", [], { cwd: dir, env: { DR_DIR: "archive" } });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const readme = readFileSync(join(dir, "archive", "README.md"), "utf8");

      assert.match(
        readme,
        /\| \[0001\]\(0001-withdrawn-decision\.md\) \| Withdrawn Decision \| withdrawn \| Not set \|/,
        "the DR List row carries the unmatched status verbatim",
      );
      for (const [, heading] of STATUS_SECTIONS) {
        assert.equal(
          readme.includes(`### ${heading}`),
          false,
          `### ${heading}: section is absent since no DR's status matched it`,
        );
      }
      assert.equal(
        readme.includes("**0001**:"),
        false,
        "0001 is absent from every By Status section entry list",
      );
    },
  );
});

test("T-211 the README is replaced in one rename and no temporary file is left in the directory", () => {
  withCaseDir(
    {
      "archive/0001-first-decision.md":
        '---\nstatus: "proposed"\ndate: "2024-01-01"\n---\n# First Decision\n\nbody\n',
    },
    (dir) => {
      const run = runCli(TS_SCRIPT, dir, "", [], { cwd: dir, env: { DR_DIR: "archive" } });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const entries = readdirSync(join(dir, "archive")).sort();
      assert.deepEqual(
        entries,
        ["0001-first-decision.md", "README.md"],
        "only the source DR file and the freshly written README.md remain -- no stray temp file" +
          " from tempfile.mkstemp's replacement is left behind in the directory",
      );
    },
  );
});
