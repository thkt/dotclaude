/// <reference types="node" />
// Behavioral parity tests for skills/scribe/scripts/verify_run.ts against the retired Python
// original skills/scribe/scripts/verify_run.py (skills/scribe/tests/verify_run_test.py carries
// the same coverage there). Builds a real temp git repo the same way that Python suite's
// _init_worktree/_commit_pages/_candidates do, calls `verify` in-process for the report content,
// and reaches the CLI through the shared runCli/withTempHome harness from
// workflows/_lib/tests/_cli-fixture.ts (skills/scribe/tests/triage.test.ts carries the sibling
// pattern) for exit code and stdout/stderr, plus hooks/_lib/shebang_scope.ts's trackedEntries for
// the git-index mode check. runCli's cleared PATH is restored to the real one for these cases
// because verify_run.ts shells out to the real `git` binary against the temp repo.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import { runCli, withTempHome } from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { verify, type TriageReport, type TriageRow } from "../scripts/verify_run.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "verify_run.ts");

const GIT_ENV: Record<string, string> = {
  ...(process.env as Record<string, string>),
  GIT_AUTHOR_NAME: "scribe-test",
  GIT_AUTHOR_EMAIL: "scribe-test@example.com",
  GIT_COMMITTER_NAME: "scribe-test",
  GIT_COMMITTER_EMAIL: "scribe-test@example.com",
};

/** Runs a real `git` command against `repo`, throwing on a non-zero exit -- the same shape
 * verify_run_test.py's own `_git` helper gives its Python callers. */
function git(repo: string, ...args: string[]): string {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8", env: GIT_ENV });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout;
}

/** The `_candidates.md` store body: rows under 昇格待ち, 単発, and 棄却, in that order --
 * verify_run_test.py's `_candidates`. */
function candidates(waiting: string[], rejected: string[] = [], oneOff: string[] = []): string {
  const rows = waiting.map((n) => `- ${n}`);
  const dropped = rejected.map((n) => `- ${n}`);
  const solo = oneOff.map((n) => `- ${n}`);
  return [
    "# candidates",
    "",
    "## 昇格待ち",
    "",
    ...rows,
    "",
    "## 単発",
    "",
    ...solo,
    "",
    "## 棄却",
    "",
    ...dropped,
  ].join("\n");
}

/** Builds the branch point verify_run.ts is asked to diff against: a fresh git repo, optionally
 * seeded with a `_candidates.md` store, then one `docs(wiki):` commit every branch point in this
 * repository already carries. `startWaiting === null` leaves the store out entirely -- the branch
 * point a first run starts from. verify_run_test.py's `_init_worktree`. */
function initWorktree(root: string, startWaiting: string[] | null, startOneOff: string[] = []): string {
  const repo = join(root, "worktree");
  const wiki = join(repo, "docs", "wiki");
  spawnSync("mkdir", ["-p", wiki]);
  git(repo, "init", "-q");
  if (startWaiting !== null) {
    writeFileSync(join(wiki, "_candidates.md"), candidates(startWaiting, [], startOneOff));
    git(repo, "add", "-A");
    git(repo, "commit", "-q", "-m", "chore: seed candidates");
  }
  writeFileSync(join(wiki, "an-earlier-page.md"), "# earlier\n");
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", "docs(wiki): an-earlier-page を追加/更新");
  return repo;
}

/** One Phase 6 commit: writes `names` as wiki pages and drops their rows from 昇格待ち. Returns
 * the 昇格待ち rows left, for the caller to chain into the next commit.
 * verify_run_test.py's `_commit_pages`. */
function commitPages(repo: string, stillWaiting: string[], names: string[]): string[] {
  const wiki = join(repo, "docs", "wiki");
  for (const name of names) {
    writeFileSync(join(wiki, `${name}.md`), `# ${name}\n`);
  }
  const left = stillWaiting.filter((n) => !names.includes(n));
  writeFileSync(join(wiki, "_candidates.md"), candidates(left));
  git(repo, "add", "-A");
  git(repo, "commit", "-q", "-m", `docs(wiki): ${names.join(", ")} を追加/更新`);
  return left;
}

function base(repo: string): string {
  return git(repo, "rev-parse", "HEAD").trim();
}

const WAITING_SECTION = "昇格待ち";

/** A triage row as `verify` reads it -- verify_run_test.py's `_rows`. A plain default parameter
 * cannot carry this: JS triggers a default on an explicit `undefined` too, unlike Python's
 * `_rows(names, None)` where an explicit `None` stays `None`. `sectionArg`'s arity (0 args vs.
 * 1, even when that 1 is `undefined`) is what lets `rows(["brand-new"], undefined)` still mean
 * "no section" the way the Python original's explicit `None` does. */
function rows(names: string[], ...sectionArg: [string | undefined] | []): TriageRow[] {
  const section = sectionArg.length > 0 ? sectionArg[0] : WAITING_SECTION;
  return names.map((name) => ({ name, section }));
}

function report(commits: TriageRow[][], deferred: TriageRow[] = []): TriageReport {
  return { commits, deferred };
}

function assertMismatch(
  mismatches: readonly { field: string; expected: number; actual: number }[],
  field: string,
  expected: number,
  actual: number,
): void {
  const named = mismatches.filter((m) => m.field === field);
  assert.equal(named.length, 1, `${field} carries exactly one mismatch: ${JSON.stringify(mismatches)}`);
  assert.equal(named[0]?.expected, expected);
  assert.equal(named[0]?.actual, actual);
}

/** Runs the CLI with the real PATH restored (verify_run.ts shells out to the real `git`), per
 * this unit's contract: `runCli(script, home, stdin, argv, { cwd, env: { PATH } })`. */
function runVerify(home: string, repo: string, atBase: string, triageReport: TriageReport) {
  return runCli(SCRIPT, home, JSON.stringify(triageReport), [repo, atBase], {
    env: { PATH: process.env.PATH ?? "" },
  });
}

test(
  "T-223 a run whose docs(wiki) commit count and remaining waiting rows both match the report returns ok true and exits 0",
  () => {
    withTempHome((home) => {
      const tmp = mkdtempSync(join(tmpdir(), "verify-run-t223-"));
      try {
        const start = Array.from({ length: 5 }, (_, i) => `item${i}`);
        const repo = initWorktree(tmp, start);
        const atBase = base(repo);
        const left = commitPages(repo, start, ["item0", "item1", "item2"]);
        commitPages(repo, left, ["item3", "item4"]);
        const triageReport = report([
          rows(["item0", "item1", "item2"]),
          rows(["item3", "item4"]),
        ]);

        const result = verify(repo, triageReport, atBase);
        assert.equal(result.ok, true, JSON.stringify(result.mismatches));
        assert.deepEqual(result.mismatches, []);

        const run = runVerify(home, repo, atBase, triageReport);
        assert.equal(run.status, 0, run.stderr);
        assert.equal(JSON.parse(run.stdout).ok, true);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  },
);

test(
  "T-224 a run one commit short of the report returns ok false, exits 1, and names the commits field with expected and actual",
  () => {
    withTempHome((home) => {
      const tmp = mkdtempSync(join(tmpdir(), "verify-run-t224-"));
      try {
        const start = Array.from({ length: 5 }, (_, i) => `item${i}`);
        const repo = initWorktree(tmp, start);
        const atBase = base(repo);
        const left = commitPages(repo, start, ["item0", "item1", "item2"]);
        commitPages(repo, left, ["item3", "item4"]);
        // 2 commits actually ran, but the report expects 3 -- one short of what triage planned.
        const triageReport = report([
          rows(["item0", "item1"]),
          rows(["item2", "item3"]),
          rows(["item4"]),
        ]);

        const result = verify(repo, triageReport, atBase);
        assert.equal(result.ok, false);
        assertMismatch(result.mismatches, "commits", 3, 2);

        const run = runVerify(home, repo, atBase, triageReport);
        assert.equal(run.status, 1, run.stderr);
        const parsed = JSON.parse(run.stdout);
        assert.equal(parsed.ok, false);
        assertMismatch(parsed.mismatches, "commits", 3, 2);
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    });
  },
);

test(
  "T-225 a row moved to 棄却 and a deferred row entering 昇格待ち both move the expected remaining count, and a store absent at base counts as zero rows",
  () => {
    // (a) A row Phase 4 dropped into 棄却 clears an expected line the same way a committed page
    // does, so the run still balances.
    {
      const tmp = mkdtempSync(join(tmpdir(), "verify-run-t225a-"));
      try {
        const start = Array.from({ length: 5 }, (_, i) => `item${i}`);
        const repo = initWorktree(tmp, start);
        const atBase = base(repo);
        const wiki = join(repo, "docs", "wiki");
        for (const n of ["item0", "item1"]) {
          writeFileSync(join(wiki, `${n}.md`), `# ${n}\n`);
        }
        writeFileSync(join(wiki, "_candidates.md"), candidates(["item3", "item4"], ["item2"]));
        git(repo, "add", "-A");
        git(repo, "commit", "-q", "-m", "docs(wiki): item0, item1 を追加/更新");

        const result = verify(repo, report([rows(["item0", "item1"])]), atBase);
        assert.equal(result.ok, true, JSON.stringify(result.mismatches));
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }

    // (b) A deferred row entering 昇格待ち (a 単発 row promoted by a second piece of evidence, but
    // left uncommitted by the commit cap) grows the expected remaining count by the inflow.
    {
      const tmp = mkdtempSync(join(tmpdir(), "verify-run-t225b-"));
      try {
        const repo = initWorktree(tmp, ["item0", "item1"], ["solo"]);
        const atBase = base(repo);
        const wiki = join(repo, "docs", "wiki");
        for (const n of ["item0", "item1"]) {
          writeFileSync(join(wiki, `${n}.md`), `# ${n}\n`);
        }
        writeFileSync(join(wiki, "_candidates.md"), candidates(["solo"]));
        git(repo, "add", "-A");
        git(repo, "commit", "-q", "-m", "docs(wiki): item0, item1 を追加/更新");

        const triageReport = report(
          [rows(["item0", "item1"])],
          [{ name: "solo", section: "単発" }],
        );
        const result = verify(repo, triageReport, atBase);
        assert.equal(result.ok, true, JSON.stringify(result.mismatches));
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }

    // (c) The store is absent entirely at base (the first run in a repository with no store
    // yet); that absence counts as zero waiting rows, not an error.
    {
      const tmp = mkdtempSync(join(tmpdir(), "verify-run-t225c-"));
      try {
        const repo = initWorktree(tmp, null);
        const atBase = base(repo);
        const wiki = join(repo, "docs", "wiki");
        writeFileSync(join(wiki, "brand-new.md"), "# brand-new\n");
        writeFileSync(join(wiki, "_candidates.md"), candidates([]));
        git(repo, "add", "-A");
        git(repo, "commit", "-q", "-m", "docs(wiki): brand-new を追加/更新");

        const result = verify(repo, report([rows(["brand-new"], undefined)]), atBase);
        assert.equal(result.ok, true, JSON.stringify(result.mismatches));
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
  },
);

test(
  "T-226 a missing argument, non-JSON stdin, and a report without commits each exit 2 with a stderr line starting with usage:, and the tracked verify_run.ts carries mode 100755 and opens with the env node shebang",
  () => {
    withTempHome((home) => {
      const validReport = JSON.stringify({ commits: [], deferred: [] });

      const missingArg = runCli(SCRIPT, home, validReport, ["."], {
        env: { PATH: process.env.PATH ?? "" },
      });
      assert.equal(missingArg.status, 2, missingArg.stderr);
      assert.match(missingArg.stderr, /^usage:/);
      assert.equal(missingArg.stdout, "");

      const nonJsonStdin = runCli(SCRIPT, home, "not json", [".", "HEAD"], {
        env: { PATH: process.env.PATH ?? "" },
      });
      assert.equal(nonJsonStdin.status, 2, nonJsonStdin.stderr);
      assert.match(nonJsonStdin.stderr, /^usage:/);
      assert.equal(nonJsonStdin.stdout, "");

      const noCommits = runCli(SCRIPT, home, JSON.stringify({ deferred: [] }), [".", "HEAD"], {
        env: { PATH: process.env.PATH ?? "" },
      });
      assert.equal(noCommits.status, 2, noCommits.stderr);
      assert.match(noCommits.stderr, /^usage:/);
      assert.equal(noCommits.stdout, "");
    });

    const entries = trackedEntries(["skills/scribe/scripts/verify_run.ts"]);
    assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
    const [mode, absolutePath] = entries[0];
    assert.equal(mode, "100755", "git index mode");
    const firstLine = spawnSync("head", ["-n", "1", absolutePath], { encoding: "utf8" }).stdout.trim();
    assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");
  },
);
