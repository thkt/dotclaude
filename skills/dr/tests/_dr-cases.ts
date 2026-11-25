/// <reference types="node" />
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runCli, type RunCliOptions } from "../../_lib/tests/_cli-fixture.ts";

export interface DrFixtureCase {
  name: string;
  setup: Record<string, string>;
  argv: string[];
  env: Record<string, string>;
  exit: number;
  stdout: string;
  files_after: Record<string, string>;
}

export function runCliWithoutHostDrHome(
  scriptPath: string,
  home: string,
  stdin: string,
  argv: readonly string[],
  options: RunCliOptions,
) {
  return runCli(scriptPath, home, stdin, argv, { ...options, env: { DR_HOME: "", ...options.env } });
}

export function withCaseDir<T>(setup: Record<string, string>, fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "dr-case-"));
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
