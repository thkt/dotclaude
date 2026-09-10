/// <reference types="node" />
// Shared by the fixture-freeze-before-port tests for harness_elements.py, enforcer_map.py and
// usage_counts.py (skills/_lib/tests/harness-elements-fixture.test.ts,
// skills/ablate/tests/enforcer-map-fixture.test.ts,
// skills/ablate/tests/usage-counts-fixture.test.ts): each spawns the real python3 CLI against a
// constructed temp tree and compares its exit code and stdout against a frozen fixture case, per
// docs/wiki/fixture-freeze-before-port.md. Mirrors workflows/_lib/tests/_cli-fixture.ts's
// runCli/CliRun shape, for a python3 target instead of a node one.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { CliRun } from "../../../workflows/_lib/tests/_cli-fixture.ts";

// Absolute path per docs/wiki/fixture-freeze-before-port.md's own instruction (record each case
// by running it through /opt/homebrew/bin/python3), bypassing PATH resolution so which python3 a
// developer's shell would find never changes what a frozen case replays against.
export const PYTHON3 = "/opt/homebrew/bin/python3";

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
