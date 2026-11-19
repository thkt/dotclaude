/// <reference types="node" />
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runCli, withTempHome } from "./_cli-fixture.ts";

test(
  "T-137 runCli launches the CLI in the cwd the caller passes, so a relative path in stdin " +
    "resolves under that directory",
  () => {
    const workDir = mkdtempSync(join(tmpdir(), "cli-fixture-cwd-"));
    try {
      writeFileSync(join(workDir, "note.txt"), "under-cwd-contents");
      const scriptPath = join(workDir, "read-relative.mjs");
      writeFileSync(
        scriptPath,
        [
          "import { readFileSync } from 'node:fs';",
          "const payload = JSON.parse(readFileSync(0, 'utf8'));",
          "process.stdout.write(readFileSync(payload.relPath, 'utf8'));",
        ].join("\n"),
      );

      withTempHome((home) => {
        const result = runCli(scriptPath, home, JSON.stringify({ relPath: "note.txt" }), [], {
          cwd: workDir,
        });
        assert.equal(
          result.stdout,
          "under-cwd-contents",
          "the relative path in stdin resolves under the passed cwd",
        );
      });
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  },
);

test("T-138 runCli's env option overrides the cleared PATH while HOME still points at the temp home", () => {
  const workDir = mkdtempSync(join(tmpdir(), "cli-fixture-env-"));
  try {
    const scriptPath = join(workDir, "spawn-git.mjs");
    writeFileSync(
      scriptPath,
      [
        "import { spawnSync } from 'node:child_process';",
        "const git = spawnSync('git', ['--version'], { encoding: 'utf8' });",
        "process.stdout.write(JSON.stringify({",
        "  home: process.env.HOME,",
        "  gitStatus: git.status,",
        "  gitError: git.error ? git.error.code : null,",
        "}));",
      ].join("\n"),
    );

    withTempHome((home) => {
      const result = runCli(scriptPath, home, "", [], {
        env: { PATH: process.env.PATH ?? "" },
      });
      const parsed = JSON.parse(result.stdout) as {
        home: string;
        gitStatus: number | null;
        gitError: string | null;
      };
      assert.equal(parsed.gitStatus, 0, "git resolves via the env option's restored PATH");
      assert.equal(parsed.home, home, "HOME still points at the temp home");
    });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
});
