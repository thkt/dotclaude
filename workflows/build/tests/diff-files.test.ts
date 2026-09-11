/// <reference types="node" />
// Behavior tests for workflows/build/diff-files.ts, the TypeScript port of the retired Python
// change-listing verifier it replaces. T-145 replays every frozen case in
// tests/fixtures/diff-files-cases.json, produced by running the Python verifier itself before
// it was retired (U-004, U-009), and compares the port's exit code and parsed stdout against it
// case by case. T-146 exercises the fail-closed stderr contract for a relative repo path, a missing
// base, and text that is not JSON. The replay (runCli, withTempHome, fixture) lives in
// workflows/_lib/tests/_cli-fixture.ts, shared with workflows/build/tests/record.test.ts and
// workflows/build/tests/revalidate.test.ts.
//
// Unlike revalidate.ts, this CLI's stdin names a real repository rather than a working-tree
// path relative to cwd, and its result depends on actual git history rather than files on
// disk. Each case's `setup` (write a file, or run a git subcommand) replays into a fresh temp
// git repository, the way workflows/build/tests/diff_files_test.py's setUp + per-test setup
// built the repos the frozen fixture recorded. The repository itself comes from
// workflows/_lib/tests/_git-repo.ts's withTempRepo, the same disposable-repo helper
// workflows/code/tests/verify-commit.test.ts's withUnitRepo shares. The fixture's stdin/stdout
// carry two placeholders this replay resolves before comparing:
//   <repo>       the temp repository's absolute path
//   the sentinel sha SENTINEL_BASE_SHA below, standing in for the repo's own root commit (the
//                "chore: seed" commit every case with a base commits first) -- git assigns
//                that commit a different sha on every run, so the fixture recorded one frozen
//                example and this replay substitutes this run's real one before piping stdin
//                in
// The CLI echoes its input `base` back into `base` on stdout verbatim, so the fixture's own
// stdout placeholder ("<base-sha>") is resolved to whatever this run's *resolved stdin* base
// turned out to be -- the sentinel's substitute for a real base, or, for the unknown-base
// case, the literal unresolvable value passed straight through.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fixture, runCli, withTempHome, type FixtureCase } from "../../_lib/tests/_cli-fixture.ts";
import { gcAutoValue, withTempRepo } from "../../_lib/tests/_git-repo.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "diff-files.ts");

// The frozen literal diff-files-cases.json uses in place of a real branch-point sha (git
// assigns a fresh one to the "chore: seed" commit on every run). Every case whose `setup`
// commits at least once commits "chore: seed" first, so that commit is always the repo's root
// commit -- the value this replay substitutes for the sentinel.
const SENTINEL_BASE_SHA = "3a2dd422111f2d257466b0c28d3542e362c1b5e5";

interface WriteStep {
  type: "write";
  path: string;
  content: string;
}
interface GitStep {
  type: "git";
  args: string[];
}
type SetupStep = WriteStep | GitStep;

interface DiffFilesFixtureCase extends FixtureCase {
  setup?: SetupStep[];
}

const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "diff-files-cases.json"), "utf8"),
) as DiffFilesFixtureCase[];

/** Replays a fixture case's `setup` into a fresh git repository, the way
 * workflows/build/tests/diff_files_test.py's setUp + per-test setup built the repos the
 * frozen fixture recorded: a fixed committer identity, then each step in order. Runs `fn`
 * against the repo's absolute path and, once at least one commit has been made, the repo's
 * root commit sha -- the real value standing in for SENTINEL_BASE_SHA in this run. `steps`
 * empty (the exit-1 cases, which never reach git) skips repo setup entirely, so those cases get
 * a plain temp directory instead of a repository through
 * workflows/_lib/tests/_git-repo.ts's withTempRepo. */
function buildRepo<T>(
  steps: readonly SetupStep[],
  fn: (repo: string, baseSha: string | null) => T,
): T {
  if (steps.length === 0) {
    const repo = mkdtempSync(join(tmpdir(), "diff-files-repo-"));
    try {
      return fn(repo, null);
    } finally {
      rmSync(repo, { recursive: true, force: true });
    }
  }

  return withTempRepo((repo) => {
    spawnSync("git", ["-C", repo, "config", "user.email", "t@example.com"]);
    spawnSync("git", ["-C", repo, "config", "user.name", "t"]);

    let committed = false;
    for (const step of steps) {
      if (step.type === "write") {
        const target = join(repo, step.path);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, step.content);
      } else {
        const result = spawnSync("git", ["-C", repo, ...step.args], { encoding: "utf8" });
        if (result.status !== 0) {
          throw new Error(`setup step \`git ${step.args.join(" ")}\` failed: ${result.stderr}`);
        }
        if (step.args[0] === "commit") committed = true;
      }
    }

    const baseSha = committed
      ? spawnSync("git", ["-C", repo, "rev-list", "--max-parents=0", "HEAD"], { encoding: "utf8" })
          .stdout.trim()
          .split("\n")[0]
      : null;
    return fn(repo, baseSha || null);
  });
}

/** Resolves `<repo>` and, when this case minted one, SENTINEL_BASE_SHA in a fixture case's raw
 * stdin template. */
function resolveStdin(rawStdin: string, repo: string, baseSha: string | null): string {
  let resolved = rawStdin.replaceAll("<repo>", repo);
  if (baseSha !== null) resolved = resolved.replaceAll(SENTINEL_BASE_SHA, baseSha);
  return resolved;
}

test(
  "T-145 every frozen case in diff-files-cases.json reproduces the python verifier's exit " +
    "code and parsed stdout after the repo placeholders are resolved",
  () => {
    for (const testCase of FIXTURES) {
      withTempHome((home) => {
        buildRepo(testCase.setup ?? [], (repo, baseSha) => {
          const stdin = resolveStdin(testCase.stdin, repo, baseSha);
          const result = runCli(SCRIPT, home, stdin, [], {
            cwd: repo,
            env: { PATH: process.env.PATH ?? "" },
          });
          assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
          if (testCase.stdout === "") {
            assert.equal(result.stdout, "", `${testCase.name}: stdout`);
            return;
          }
          // The CLI echoes its input `base` back verbatim, so the fixture's own "<base-sha>"
          // placeholder resolves to this run's resolved-stdin base, not necessarily baseSha
          // itself (the unknown-base case's base is never the sentinel).
          const echoedBase = (JSON.parse(stdin) as { base: string }).base;
          const expected = JSON.parse(
            testCase.stdout.replaceAll("<base-sha>", echoedBase),
          ) as unknown;
          assert.deepEqual(
            JSON.parse(result.stdout) as unknown,
            expected,
            `${testCase.name}: parsed stdout`,
          );
        });
      });
    }
  },
);

const STDERR_PREFIXES: Record<string, string> = {
  exits_1_on_a_relative_repo_path: "repo must be an absolute path",
  exits_1_when_base_is_missing: "base must be a non-empty string",
  exits_1_on_invalid_json: "stdin is not valid JSON: ",
};

test(
  "T-146 a relative repo path, a missing base, and text that is not JSON each exit 1 with " +
    "the python verifier's stderr prefix and no stdout",
  () => {
    for (const [name, prefix] of Object.entries(STDERR_PREFIXES)) {
      const testCase = fixture(FIXTURES, name);
      withTempHome((home) => {
        const result = runCli(SCRIPT, home, testCase.stdin, [], {
          cwd: home,
          env: { PATH: process.env.PATH ?? "" },
        });
        assert.equal(result.status, 1, `${name}: exit code`);
        assert.equal(result.stdout, "", `${name}: stdout`);
        assert.equal(result.stderr.startsWith(prefix), true, `${name}: stderr prefix`);
      });
    }
  },
);

test(
  "T-420 diff-files and verify-commit create their repositories through the helper",
  () => {
    buildRepo([{ type: "write", path: "a.txt", content: "a\n" }], (repo) => {
      assert.equal(gcAutoValue(repo), "0");
    });
  },
);
