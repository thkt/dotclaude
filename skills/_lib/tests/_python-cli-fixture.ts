/// <reference types="node" />
// Shared by the fixture-freeze-before-port tests for harness_elements.py, enforcer_map.py and
// usage_counts.py (skills/_lib/tests/harness-elements-fixture.test.ts,
// skills/ablate/tests/enforcer-map-fixture.test.ts,
// skills/ablate/tests/usage-counts-fixture.test.ts): each spawns the real python3 CLI against a
// constructed temp tree and compares its exit code and stdout against a frozen fixture case, per
// docs/wiki/fixture-freeze-before-port.md. Mirrors workflows/_lib/tests/_cli-fixture.ts's
// runCli/CliRun shape, for a python3 target instead of a node one.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { CliRun } from "../../../workflows/_lib/tests/_cli-fixture.ts";

// An absolute interpreter path, so the cleared PATH below cannot change which python3 a frozen
// case replays against. Resolved rather than written down: /opt/homebrew/bin/python3 is the
// macOS path the hook shebangs carry, and CI runs ubuntu, where that path holds nothing and
// spawnSync would answer `status: null` -- which a frozen case would then read as an exit code
// that never matches. Asking python3 for sys.executable finds the same interpreter this repo's
// own Python suite runs under, on either platform.
const PYTHON3 = (() => {
  const found = spawnSync("python3", ["-c", "import sys; print(sys.executable)"], {
    encoding: "utf8",
  });
  const path = (found.stdout ?? "").trim();
  assert.ok(path, `python3 must resolve to an interpreter path: ${found.stderr ?? found.error}`);
  return path;
})();

export interface RunPythonCliOptions {
  env?: Record<string, string>;
}

/** Runs `scriptPath` under python3 with `argv`, PATH cleared so the process cannot lean on
 * anything found via the ambient PATH -- the same isolation runCli gives a node CLI. */
export function runPythonCli(
  scriptPath: string,
  argv: readonly string[],
  options: RunPythonCliOptions = {},
): CliRun {
  const result = spawnSync(PYTHON3, [scriptPath, ...argv], {
    encoding: "utf8",
    env: { PATH: "", ...options.env },
  });
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** Writes `files` (relative path -> content, directories implied by "/" in the key) under a
 * fresh temp directory prefixed `prefix`, returning that directory's absolute path. */
export function writeTree(prefix: string, files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), `${prefix}-`));
  for (const [relativePath, content] of Object.entries(files)) {
    const target = join(root, relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
  return root;
}

// A tree-based CLI takes <repo-root> as its one argv token rather than reading stdin, which is
// the one thing workflows/_lib/tests/_cli-fixture.ts's own FixtureCase always requires -- so this
// carries its own shape (`files` builds the temp tree the argv's `<root>` token resolves to)
// instead of reusing that one.
export interface TreeFixtureCase {
  name: string;
  files: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const ROOT_PLACEHOLDER = "<root>";

/** Loads the frozen tree-fixture cases at `path` (one JSON array of TreeFixtureCase, as recorded
 * per docs/wiki/fixture-freeze-before-port.md). */
export function loadTreeFixtures(path: string): TreeFixtureCase[] {
  return JSON.parse(readFileSync(path, "utf8")) as TreeFixtureCase[];
}

/** Runs every case in `cases` against `run`: builds a fresh `treePrefix`-named temp tree from
 * the case's `files`, substitutes ROOT_PLACEHOLDER for that tree's own root in both the argv and
 * the expected stdout, and asserts the run's exit code and stdout match -- the loop
 * harness-elements-fixture.test.ts, harness-elements.test.ts, enforcer-map-fixture.test.ts,
 * enforcer-map.test.ts and usage-counts-fixture.test.ts each ran by hand before this collapsed
 * it to one place. The tree is removed afterward whether the assertion passes or throws. `run`
 * receives the tree's root alongside argv, for a caller (harness-elements.test.ts's and
 * enforcer-map.test.ts's .ts-CLI replay) that also runs the CLI with that root as its HOME. */
export function replayTreeFixtures(
  cases: readonly TreeFixtureCase[],
  treePrefix: string,
  run: (argv: readonly string[], root: string) => CliRun,
): void {
  assert.ok(cases.length > 0, "the frozen fixture carries at least one case");
  for (const entry of cases) {
    const root = writeTree(treePrefix, entry.files);
    try {
      const argv = entry.argv.map((token) => (token === ROOT_PLACEHOLDER ? root : token));
      const result = run(argv, root);
      assert.equal(
        result.status,
        entry.exit,
        `${entry.name}: exit code (stderr: ${result.stderr})`,
      );
      assert.equal(
        result.stdout,
        entry.stdout.replaceAll(ROOT_PLACEHOLDER, root),
        `${entry.name}: stdout`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
}
