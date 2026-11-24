/// <reference types="node" />
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertStdoutShape, fixture, runCli, type RunCliOptions } from "../../_lib/tests/_cli-fixture.ts";
import { withTempRepo } from "../../_lib/tests/_git-repo.ts";
import { formatScore, OUTPUT_KEYS } from "../scripts/pre-check.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
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

function runCliWithoutHostDrHome(
  scriptPath: string,
  home: string,
  stdin: string,
  argv: readonly string[],
  options: RunCliOptions,
) {
  return runCli(scriptPath, home, stdin, argv, { ...options, env: { DR_HOME: "", ...options.env } });
}

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
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, entry.exit, `${entry.name}: exit code (stderr: ${run.stderr})`);
      assertStdoutShape(
        run.stdout,
        entry.stdout,
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
    const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", ["Test Title Here"], { cwd: dir, env: { DR_DIR: "archive" } });
    assert.equal(run.status, 0, `empty dir: exit code (stderr: ${run.stderr})`);
    const parsed = JSON.parse(run.stdout) as { number: string };
    assert.equal(parsed.number, "0001", "an empty (or nonexistent) archive starts at 0001");
  });

  withCaseDir(
    { "archive/0002-a.md": "# A\n", "archive/0005-b.md": "# B\n" },
    (dir) => {
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", ["Test Title Here"], { cwd: dir, env: { DR_DIR: "archive" } });
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
      const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", entry.argv, { cwd: dir, env: entry.env });
      assert.equal(run.status, 1, `${name}: exit code`);
      assert.equal(run.stdout, "", `${name}: stdout is empty`);
      assert.equal(
        run.stderr.split("\n")[0],
        `Error: title length ${title.length} chars (required 5-64)`,
        `${name}: first stderr line matches the retired Python pre-check's fail(f"Error: title length {len(title)} chars (required 5-64)")`,
      );
    }

    const forbidden = fixture(CASES, "title-with-forbidden-characters-errors");
    const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", forbidden.argv, { cwd: dir, env: forbidden.env });
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
  assert.equal(formatScore(0.625), "0.62");
  assert.equal(formatScore(0.375), "0.38");
});

const HOST_PATH_FOR_GIT = process.env.PATH ?? "";

const stderrLinesFromPreCheck = (stderr: string): string[] => stderr.split("\n").filter((line) => line.startsWith("pre-check: "));

interface FakeGh {
  changedFilesByPr?: Record<number, string[]>;
  prListStdout?: string;
  exit?: number;
}

const shellQuote = (text: string): string => `'${text.replaceAll("'", "'\\''")}'`;

function writeFakeGh(dir: string, fake: FakeGh): { bin: string; calledMarker: string } {
  const bin = join(dir, "fake-gh");
  const calledMarker = join(dir, "fake-gh-called");
  const changedFilesByPr = fake.changedFilesByPr ?? {};
  const list = fake.prListStdout ?? JSON.stringify(Object.keys(changedFilesByPr).map((n) => ({ number: Number(n) })));
  const diffs = Object.entries(changedFilesByPr)
    .map(([n, files]) => `  "pr diff ${n}") printf '%s\\n' ${files.map(shellQuote).join(" ")} ;;`)
    .join("\n");
  writeFileSync(
    bin,
    [
      "#!/bin/sh",
      `: > ${shellQuote(calledMarker)}`,
      ...(fake.exit ? [`echo 'gh: fake failure' >&2`, `exit ${fake.exit}`] : []),
      'case "$1 $2 $3" in',
      `  "pr list --state") printf '%s' ${shellQuote(list)} ;;`,
      diffs,
      "  *) exit 2 ;;",
      "esac",
      "",
    ].join("\n"),
    { mode: 0o755 },
  );
  return { bin, calledMarker };
}

function withGitRepoHoldingDrs0002And0005<T>(fn: (dir: string) => T): T {
  return withTempRepo((dir) => {
    mkdirSync(join(dir, "docs", "decisions"), { recursive: true });
    writeFileSync(join(dir, "docs", "decisions", "0002-a.md"), "# A\n");
    writeFileSync(join(dir, "docs", "decisions", "0005-b.md"), "# B\n");
    return fn(dir);
  });
}

function runWithGh(dir: string, bin: string, env: Record<string, string> = {}) {
  const run = runCliWithoutHostDrHome(TS_SCRIPT, dir, "", ["Test Title Here"], {
    cwd: dir,
    env: { PATH: HOST_PATH_FOR_GIT, CLAUDE_GH_BIN: bin, ...env },
  });
  assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
  const parsed = JSON.parse(run.stdout) as { number: string; filename: string };
  assert.deepEqual(Object.keys(parsed), [...OUTPUT_KEYS], "stdout keys stay in OUTPUT_KEYS order");
  return { ...run, parsed };
}

test("T-204 an open pull request adding 0007 to the archive above the local 0005 moves the number to 0008 and names 0007 and the pull request on stderr", () => {
  withGitRepoHoldingDrs0002And0005((dir) => {
    const { bin } = writeFakeGh(dir, { changedFilesByPr: { 12: ["docs/decisions/0007-x.md", "README.md"] } });
    const run = runWithGh(dir, bin);
    assert.equal(run.parsed.number, "0008");
    assert.ok(run.parsed.filename.startsWith("0008-"), `filename follows the number (${run.parsed.filename})`);
    assert.match(run.stderr, /0007 \(#12\)/, "stderr names the avoided number and the pull request");
  });
});

test("T-205 an open pull request number at or below the local maximum leaves the number at the local maximum plus one", () => {
  withGitRepoHoldingDrs0002And0005((dir) => {
    const { bin } = writeFakeGh(dir, { changedFilesByPr: { 12: ["docs/decisions/0003-x.md", "docs/decisions/0005-b.md"] } });
    const run = runWithGh(dir, bin);
    assert.equal(run.parsed.number, "0006");
    assert.deepEqual(stderrLinesFromPreCheck(run.stderr), [], "nothing was skipped, so pre-check writes no line");
  });
});

test("T-206 a numbered file an open pull request adds outside the archive, or inside a numbered subdirectory of it, leaves the number unchanged", () => {
  withGitRepoHoldingDrs0002And0005((dir) => {
    const { bin } = writeFakeGh(dir, {
      changedFilesByPr: { 12: ["notes/0009-x.md", "docs/decisions/0009-drafts/x.md", "docs/0009-x.md"] },
    });
    assert.equal(runWithGh(dir, bin).parsed.number, "0006");
  });
});

test("T-207 a DR at the 120th of 150 files a pull request changes still counts", () => {
  withGitRepoHoldingDrs0002And0005((dir) => {
    const files = Array.from({ length: 150 }, (_, i) => `src/file-${i}.ts`);
    files[119] = "docs/decisions/0009-late.md";
    const { bin } = writeFakeGh(dir, { changedFilesByPr: { 3: [], 799: files } });
    assert.equal(runWithGh(dir, bin).parsed.number, "0010");
  });
});

test("T-208 when gh fails or prints something other than JSON, the run exits 0 with the local maximum plus one and says on stderr that the check could not run", () => {
  for (const fake of [{ exit: 1 }, { prListStdout: "not json" }] satisfies FakeGh[]) {
    withGitRepoHoldingDrs0002And0005((dir) => {
      const { bin, calledMarker } = writeFakeGh(dir, fake);
      const run = runWithGh(dir, bin);
      assert.ok(existsSync(calledMarker), `${JSON.stringify(fake)}: the fake gh was reached`);
      assert.equal(run.parsed.number, "0006", `${JSON.stringify(fake)}: number`);
      const lines = stderrLinesFromPreCheck(run.stderr);
      assert.equal(lines.length, 1, `${JSON.stringify(fake)}: pre-check writes one line (${run.stderr})`);
      assert.match(lines[0], /could not check open pull requests/, `${JSON.stringify(fake)}: stderr`);
    });
  }
});

test("T-209 an archive outside a git work tree never calls gh and says on stderr that the check could not run", () => {
  withCaseDir({ "archive/0005-b.md": "# B\n" }, (dir) => {
    const { bin, calledMarker } = writeFakeGh(dir, { changedFilesByPr: { 12: ["archive/0007-x.md"] } });
    const run = runWithGh(dir, bin, { DR_DIR: join(dir, "archive") });
    assert.equal(existsSync(calledMarker), false, "the fake gh was not called");
    assert.equal(run.parsed.number, "0006");
    assert.match(run.stderr, /could not check open pull requests/);
  });
});

function withDrHome<T>(fn: (drHome: string) => T): T {
  const drHome = mkdtempSync(join(tmpdir(), "pre-check-dr-home-"));
  try {
    return fn(drHome);
  } finally {
    rmSync(drHome, { recursive: true, force: true });
  }
}

test("T-638 with DR_HOME set in a repository whose origin is https://example.invalid/owner/sample.git, the run exits 0, answers dr_dir as $DR_HOME/sample, and creates that directory", () => {
  withTempRepo((repo) => {
    spawnSync("git", ["-C", repo, "remote", "add", "origin", "https://example.invalid/owner/sample.git"]);
    withDrHome((drHome) => {
      const run = runCli(TS_SCRIPT, repo, "", ["Test Title Here"], {
        cwd: repo,
        env: { PATH: HOST_PATH_FOR_GIT, DR_HOME: drHome },
      });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const parsed = JSON.parse(run.stdout) as { dr_dir: string };
      assert.equal(parsed.dr_dir, join(drHome, "sample"));
      assert.ok(existsSync(join(drHome, "sample")), "the $DR_HOME/sample directory exists");
    });
  });
});

test("T-639 with DR_HOME set in a repository without an origin remote, the run exits 1, names DR_HOME and origin on stderr, writes nothing to stdout, and creates no directory under DR_HOME", () => {
  withTempRepo((repo) => {
    withDrHome((drHome) => {
      const run = runCli(TS_SCRIPT, repo, "", ["Test Title Here"], {
        cwd: repo,
        env: { PATH: HOST_PATH_FOR_GIT, DR_HOME: drHome },
      });
      assert.equal(run.status, 1, `exit code (stderr: ${run.stderr})`);
      assert.match(run.stderr, /DR_HOME/);
      assert.match(run.stderr, /origin/);
      assert.equal(run.stdout, "");
      assert.deepEqual(readdirSync(drHome), []);
    });
  });
});
