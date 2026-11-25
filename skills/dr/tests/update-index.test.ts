/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCli } from "../../_lib/tests/_cli-fixture.ts";
import { withTempRepo } from "../../_lib/tests/_git-repo.ts";
import { STATUS_SECTIONS } from "../scripts/update-index.ts";
import { type DrFixtureCase, runCliWithoutHostDrHome, withCaseDir } from "./_dr-cases.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const TS_SCRIPT = join(HERE, "..", "scripts", "update-index.ts");

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "update-index-cases.json"), "utf8"),
) as DrFixtureCase[];

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

function assertReadmeDateShape(actual: string, expectedWithPlaceholder: string, label: string): void {
  const [prefix, suffix] = expectedWithPlaceholder.split("<date>");
  assert.equal(actual.startsWith(prefix), true, `${label}: text up to the date placeholder matches`);
  assert.equal(actual.endsWith(suffix), true, `${label}: text after the date placeholder matches`);
  const dateSlice = actual.slice(prefix.length, actual.length - suffix.length);
  assert.match(dateSlice, DATE_SHAPE, `${label}: date shape`);
}

test("every frozen case in update-index-cases.json reproduces the frozen exit code, stdout path, and the README content with the date compared by shape", () => {
  for (const entry of CASES) {
    withCaseDir(entry.setup, (dir) => {
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
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

test("the DR List rows follow file name order and each By Status section lists its entries sorted by number", () => {
  withCaseDir(
    {
      "archive/0003-alpha-decision.md": '---\nstatus: "proposed"\n---\n# Alpha Title\n\nbody\n',
      "archive/0001-charlie-decision.md": '---\nstatus: "proposed"\n---\n# Zulu Title\n\nbody\n',
      "archive/0002-bravo-decision.md": '---\nstatus: "proposed"\n---\n# Mike Title\n\nbody\n',
    },
    (dir) => {
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", [], { cwd: dir, env: { DR_DIR: "archive" } });
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

test("a status value matching no section key is listed in the table and absent from every By Status section", () => {
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
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", [], { cwd: dir, env: { DR_DIR: "archive" } });
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

test("the README is replaced in one rename and no temporary file is left in the directory", () => {
  withCaseDir(
    {
      "archive/0001-first-decision.md":
        '---\nstatus: "proposed"\ndate: "2024-01-01"\n---\n# First Decision\n\nbody\n',
    },
    (dir) => {
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", [], { cwd: dir, env: { DR_DIR: "archive" } });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const entries = readdirSync(join(dir, "archive")).sort();
      assert.deepEqual(
        entries,
        ["0001-first-decision.md", "README.md"],
        "only the source DR file and the freshly written README.md remain -- no stray temp file" +
          " from the atomic README write is left behind in the directory",
      );
    },
  );
});

test("with DR_HOME set in a repository whose origin is https://example.invalid/owner/sample.git, the run exits 0 and writes $DR_HOME/sample/README.md", () => {
  withTempRepo((repo) => {
    spawnSync("git", ["-C", repo, "remote", "add", "origin", "https://example.invalid/owner/sample.git"]);
    const drHome = mkdtempSync(join(tmpdir(), "update-index-dr-home-"));
    try {
      mkdirSync(join(drHome, "sample"));
      writeFileSync(
        join(drHome, "sample", "0001-first-decision.md"),
        '---\nstatus: "proposed"\ndate: "2024-01-01"\n---\n# First Decision\n\nbody\n',
      );
      const run = runCli(TS_SCRIPT, repo, "", [], {
        cwd: repo,
        env: { PATH: process.env.PATH ?? "", DR_HOME: drHome },
      });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      assert.ok(existsSync(join(drHome, "sample", "README.md")), "$DR_HOME/sample/README.md exists");
    } finally {
      rmSync(drHome, { recursive: true, force: true });
    }
  });
});
