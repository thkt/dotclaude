/// <reference types="node" />
// Behavioral parity tests for skills/research/scripts/find-prior-research.ts against the retired
// Python original, replayed from the frozen fixture
// skills/research/tests/fixtures/find-prior-research-cases.json (U-001). Reuses the shared
// runCli/withTempHome/fixture/assertStdoutShape harness from workflows/_lib/tests/_cli-fixture.ts
// (skills/outcome/tests/validate-outcome.test.ts carries the sibling pattern for
// skills/outcome/scripts/validate-outcome.ts), and hooks/_lib/shebang_scope.ts's trackedEntries
// for the git-index mode check (T-182) instead of a standalone statSync or spawn.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
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

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "find-prior-research.ts");

// One frozen replay case, shaped like skills/research/tests/fixtures/find-prior-research-cases.json
// (U-001): `files` writes each entry into a fresh temp dir that becomes the run's cwd -- the
// python script defaults its search-dir argument to "", which Path("") resolves as the current
// directory -- and `argv` carries only the slug, the same way every frozen case leaves the
// search-dir argument off.
interface FindPriorResearchCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "find-prior-research-cases.json"), "utf8"),
) as FindPriorResearchCase[];

/** Runs one fixture case: writes its `files` under a fresh temp dir, runs the CLI with that dir
 * as cwd, and asserts the CLI's exit code and stdout against the case. */
function runCase(testCase: FindPriorResearchCase, home: string): void {
  const workDir = mkdtempSync(join(tmpdir(), "find-prior-research-case-"));
  try {
    for (const [fileName, content] of Object.entries(testCase.files)) {
      writeFileSync(join(workDir, fileName), content);
    }
    const run = runCli(SCRIPT, home, "", testCase.argv, { cwd: workDir });
    assert.equal(run.status, testCase.exit, `${testCase.name}: exit code (stderr: ${run.stderr})`);
    assertStdoutShape(run.stdout, testCase.stdout, {}, {}, testCase.name);
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

test(
  "T-180 every frozen case in find-prior-research-cases.json reproduces the python scanner's " +
    "exit code and stdout JSON including the candidate order",
  () => {
    assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
    withTempHome((home) => {
      for (const testCase of CASES) {
        runCase(fixture(CASES, testCase.name), home);
      }
    });
  },
);

test("T-181 two candidates sharing the same count come back in file name order", () => {
  withTempHome((home) => {
    const workDir = mkdtempSync(join(tmpdir(), "find-prior-research-tie-"));
    try {
      // "apple-only" shares {apple} with the slug "apple-banana", and "banana-only" shares
      // {banana}: both count 1, so a shared-descending sort alone leaves the tie unresolved.
      // Writing "banana-only.md" first checks that the file-ascending tiebreak, not directory
      // arrival order, decides the order.
      writeFileSync(join(workDir, "banana-only.md"), "");
      writeFileSync(join(workDir, "apple-only.md"), "");
      const run = runCli(SCRIPT, home, "", ["apple-banana"], { cwd: workDir });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      const parsed = JSON.parse(run.stdout) as {
        candidates: Array<{ file: string; shared: number }>;
      };
      assert.deepEqual(parsed.candidates, [
        { file: "apple-only.md", shared: 1 },
        { file: "banana-only.md", shared: 1 },
      ]);
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});

test(
  "T-182 the script is tracked with mode 100755 in the git index and opens with " +
    "#!/usr/bin/env node",
  () => {
    const entries = trackedEntries(["skills/research/scripts/find-prior-research.ts"]);
    assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
    const [mode, absolutePath] = entries[0];
    assert.equal(mode, "100755", "git index mode");
    const firstLine = readFileSync(absolutePath, "utf8").split(/\r?\n/, 1)[0];
    assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");
  },
);

test("T-262 a broken symlink ending in .md is skipped and the real candidates are still reported", () => {
  // Python's Path.is_file() answers False for a broken symlink, so the scan walks past it.
  // statSync throws instead, which took the whole run down with a stack trace and exit 1.
  withTempHome((home) => {
    const workDir = mkdtempSync(join(tmpdir(), "find-prior-research-broken-link-"));
    try {
      writeFileSync(join(workDir, "target-thing.md"), "body\n");
      symlinkSync(join(workDir, "gone.md"), join(workDir, "dangling-thing.md"));

      const run = runCli(SCRIPT, home, "", ["thing"], { cwd: workDir });
      assert.equal(run.status, 0, `exit code (stderr: ${run.stderr})`);
      assert.deepEqual(JSON.parse(run.stdout), {
        candidates: [{ file: "target-thing.md", shared: 1 }],
        slug_words: 1,
      });
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});

test("multiple research roots preserve legacy-only sources and deduplicate identical migrations", () => {
  withTempHome((home) => {
    const repo = mkdtempSync(join(tmpdir(), "research-roots-"));
    try {
      for (const dir of ["docs/research", "research", ".claude/workspace/research"])
        mkdirSync(join(repo, dir), { recursive: true });
      writeFileSync(join(repo, "docs/research", "topic-shared.md"), "same source\n");
      writeFileSync(join(repo, ".claude/workspace/research", "topic-shared.md"), "same source\n");
      writeFileSync(join(repo, ".claude/workspace/research", "topic-legacy.md"), "legacy source\n");
      const run = runCli(
        SCRIPT,
        home,
        "",
        ["topic", "docs/research", "research", ".claude/workspace/research"],
        { cwd: repo },
      );
      assert.equal(run.status, 0, run.stderr);
      const rows = JSON.parse(run.stdout).candidates;
      assert.deepEqual(
        rows.map((row: { path: string }) => row.path),
        [".claude/workspace/research/topic-legacy.md", "docs/research/topic-shared.md"],
      );
      assert.deepEqual(rows[1].aliases, [
        "docs/research/topic-shared.md",
        ".claude/workspace/research/topic-shared.md",
      ]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

test("manual all scan includes new untracked reports and keeps differing same-name originals", () => {
  withTempHome((home) => {
    const repo = mkdtempSync(join(tmpdir(), "research-all-"));
    try {
      for (const dir of ["docs/research", "research", ".claude/workspace/research"])
        mkdirSync(join(repo, dir), { recursive: true });
      writeFileSync(join(repo, "docs/research", "source.md"), "new version\n");
      writeFileSync(join(repo, ".claude/workspace/research", "source.md"), "old version\n");
      writeFileSync(join(repo, "research", "README.md"), "index\n");
      writeFileSync(join(repo, "research", "raw.json"), "{}\n");
      symlinkSync(join(repo, "docs/research", "source.md"), join(repo, "research", "linked.md"));
      const run = runCli(
        SCRIPT,
        home,
        "",
        ["--all", "docs/research", "research", ".claude/workspace/research"],
        { cwd: repo },
      );
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(
        JSON.parse(run.stdout)
          .candidates.map((row: { path: string }) => row.path)
          .sort(),
        [".claude/workspace/research/source.md", "docs/research/source.md"],
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

test("manual all scan traverses nested originals and preserves their root-relative identity", () => {
  withTempHome((home) => {
    const repo = mkdtempSync(join(tmpdir(), "research-nested-"));
    try {
      for (const dir of ["docs/research/partition", "docs/research/other", "research/partition"])
        mkdirSync(join(repo, dir), { recursive: true });
      for (const dir of ["docs/research/partition", "docs/research/other", "research/partition"])
        writeFileSync(join(repo, dir, "topic.md"), "same content\n");
      symlinkSync(join(repo, "docs/research"), join(repo, "docs/research/loop"));
      const run = runCli(SCRIPT, home, "", ["--all", "docs/research", "research"], { cwd: repo });
      assert.equal(run.status, 0, run.stderr);
      const rows = JSON.parse(run.stdout).candidates;
      assert.deepEqual(
        rows.map((row: { file: string }) => row.file),
        ["other/topic.md", "partition/topic.md"],
      );
      assert.deepEqual(rows[1].aliases, [
        "docs/research/partition/topic.md",
        "research/partition/topic.md",
      ]);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  });
});

test("a symlinked ancestor cannot bring an external original into the repository scan", () => {
  withTempHome((home) => {
    const repo = mkdtempSync(join(tmpdir(), "research-boundary-"));
    const external = mkdtempSync(join(tmpdir(), "research-boundary-external-"));
    try {
      mkdirSync(join(external, "research"));
      writeFileSync(join(external, "research/topic.md"), "external source\n");
      symlinkSync(external, join(repo, "docs"));
      mkdirSync(join(repo, "research"));
      writeFileSync(join(repo, "research/topic-local.md"), "local source\n");
      const run = runCli(SCRIPT, home, "", ["--all", "docs/research", "research"], { cwd: repo });
      assert.equal(run.status, 0, run.stderr);
      assert.deepEqual(
        JSON.parse(run.stdout).candidates.map((row: { path: string }) => row.path),
        ["research/topic-local.md"],
      );
    } finally {
      rmSync(repo, { recursive: true, force: true });
      rmSync(external, { recursive: true, force: true });
    }
  });
});
