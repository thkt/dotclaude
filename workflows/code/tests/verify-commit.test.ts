/// <reference types="node" />
// Behavior tests for workflows/code/verify-commit.ts, the TypeScript port of
// workflows/code/verify-commit.py (commit postcondition verification). Mirrors
// workflows/code/tests/verify_commit_test.py's setUp/commit_unit/verify helpers directly:
// each test builds a temp repository with real git (a fixture standing in for the plumbing
// would not catch a check that reads the wrong git output) and calls verify() in-process
// rather than spawning the CLI, per this unit's contract.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { verify } from "../verify-commit.ts";

const BODY =
  "collapse repeated spaces\n\nUnit: U-001\nContract: src/x.ts squeeze\nTests: T-001\nSeam: false";

interface RepoHandle {
  repo: string;
  baseline: string;
}

/** Runs `git -C repo <args>`, mirroring VerifyCommitTest.git. Throws with stderr on a
 * non-zero exit so a broken setup step fails loudly instead of leaving a half-built repo. */
function git(repo: string, args: readonly string[]): string {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr}`);
  }
  return result.stdout.trim();
}

/** Writes `text` to `relative` under `repo`, creating parent directories as needed, mirroring
 * VerifyCommitTest.write. */
function write(repo: string, relative: string, text: string): void {
  const target = join(repo, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, text);
}

function head(repo: string): string {
  return git(repo, ["rev-parse", "HEAD"]);
}

/** Runs `fn` against a fresh temp repository seeded with a "chore: seed" root commit,
 * mirroring VerifyCommitTest.setUp. Removed once `fn` returns or throws. */
function withUnitRepo<T>(fn: (handle: RepoHandle) => T): T {
  const repo = mkdtempSync(join(tmpdir(), "verify-commit-test-"));
  try {
    git(repo, ["init", "--quiet", "--initial-branch", "main"]);
    git(repo, ["config", "user.email", "test@example.com"]);
    git(repo, ["config", "user.name", "test"]);
    write(repo, "README.md", "seed\n");
    git(repo, ["add", "README.md"]);
    git(repo, ["commit", "--quiet", "-m", "chore: seed"]);
    return fn({ repo, baseline: head(repo) });
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
}

/** Commits `files` (default src/x.ts) with `subject` + blank line + `body`, mirroring
 * VerifyCommitTest.commit_unit. */
function commitUnit(
  repo: string,
  subject: string,
  body: string = BODY,
  files: readonly string[] = ["src/x.ts"],
): void {
  for (const relative of files) {
    write(repo, relative, `// ${relative}\n`);
  }
  git(repo, ["add", "--", ...files]);
  const messagePath = join(repo, ".git", "COMMIT_INPUT");
  writeFileSync(messagePath, `${subject}\n\n${body}\n`);
  git(repo, ["commit", "--quiet", "-F", messagePath]);
}

/** Calls verify() with the default payload VerifyCommitTest.verify builds, overridden per
 * call. */
function verifyUnit(
  handle: RepoHandle,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    repo: handle.repo,
    baseline_head: handle.baseline,
    unit_files: ["src/x.ts", "tests/x.test.ts"],
    body: BODY,
    ...overrides,
  };
  return verify(payload);
}

test(
  "T-151 a single in-scope commit carrying the declared body passes with no blockers, " +
    "parent equal to the baseline, committed_files listing the unit file, and the report " +
    "keys in the python recorder's order",
  () => {
    withUnitRepo((handle) => {
      commitUnit(handle.repo, "feat(core): collapse repeated spaces");
      const report = verifyUnit(handle);
      assert.deepEqual(
        Object.keys(report),
        [
          "protocol",
          "verdict",
          "classification",
          "reason_codes",
          "failure_route",
          "blockers",
          "head",
          "parent",
          "committed_files",
          "outside_scope",
          "subject",
        ],
        "report key order",
      );
      assert.equal(report.verdict, "pass", "verdict");
      assert.deepEqual(report.blockers, [], "blockers");
      assert.deepEqual(report.committed_files, ["src/x.ts"], "committed_files");
      assert.equal(report.parent, handle.baseline, "parent");
    });
  },
);

test(
  "T-152 no new commit and a second commit on top of the unit commit each fail with the " +
    "blocker that names the HEAD condition",
  () => {
    withUnitRepo((handle) => {
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "fail", "no-commit case: verdict");
      assert.ok(
        (report.blockers as string[]).includes("HEAD did not move, so no commit was created"),
        `no-commit case: blockers ${JSON.stringify(report.blockers)}`,
      );
    });

    withUnitRepo((handle) => {
      commitUnit(handle.repo, "feat(core): collapse repeated spaces");
      write(handle.repo, "src/x.ts", "// again\n");
      git(handle.repo, ["add", "--", "src/x.ts"]);
      git(handle.repo, ["commit", "--quiet", "-m", "chore: extra"]);
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "fail", "second-commit case: verdict");
      assert.ok(
        (report.blockers as string[]).some((b) => b.includes("exactly one commit must land on it")),
        `second-commit case: blockers ${JSON.stringify(report.blockers)}`,
      );
    });
  },
);

test(
  "T-153 a file outside unit_files lands in outside_scope and a reworded body fails with " +
    "the verbatim-block blocker",
  () => {
    withUnitRepo((handle) => {
      commitUnit(handle.repo, "feat(core): collapse repeated spaces", BODY, [
        "src/x.ts",
        "src/other.ts",
      ]);
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "fail", "outside-scope case: verdict");
      assert.deepEqual(report.outside_scope, ["src/other.ts"], "outside_scope");
    });

    withUnitRepo((handle) => {
      commitUnit(
        handle.repo,
        "feat(core): collapse repeated spaces",
        BODY.replace("T-001", "T-002"),
      );
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "fail", "reworded-body case: verdict");
      assert.ok(
        (report.blockers as string[]).includes(
          "the commit message body does not match the declared block verbatim",
        ),
        `reworded-body case: blockers ${JSON.stringify(report.blockers)}`,
      );
    });
  },
);

test(
  "T-154 a subject that ends with a period, is not in type(scope): form, or exceeds 72 " +
    "characters fails with each named blocker, and a breaking-change marker passes",
  () => {
    withUnitRepo((handle) => {
      commitUnit(handle.repo, "Collapse repeated spaces.");
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "fail", "non-conventional case: verdict");
      assert.ok(
        (report.blockers as string[]).includes("subject ends with a period"),
        `non-conventional case: blockers ${JSON.stringify(report.blockers)}`,
      );
      assert.ok(
        (report.blockers as string[]).includes(
          "subject is not in <type>(<scope>): <description> form",
        ),
        `non-conventional case: blockers ${JSON.stringify(report.blockers)}`,
      );
    });

    withUnitRepo((handle) => {
      commitUnit(handle.repo, `feat(core): ${"x".repeat(70)}`);
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "fail", "over-length case: verdict");
      assert.ok(
        (report.blockers as string[]).some((b) => b.includes("over the 72 limit")),
        `over-length case: blockers ${JSON.stringify(report.blockers)}`,
      );
    });

    withUnitRepo((handle) => {
      commitUnit(handle.repo, "feat(core)!: collapse repeated spaces");
      const report = verifyUnit(handle);
      assert.equal(report.verdict, "pass", "breaking-change case: verdict");
    });
  },
);
