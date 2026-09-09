import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runCli, withTempHome } from "../../../workflows/_lib/tests/_cli-fixture.ts";

// Behavior tests for skills/transcribe/scripts/cli.ts's three failure paths that never reach
// readXlsx: no command, an unknown command, and extract with an unknown profile. Each is
// checked against a real source file rather than a missing one, so an unwritten source-check
// path cannot masquerade as the command-routing failure under test. readFile(source) runs
// before the command branches, and workbook parsing happens only inside list/extract/verify,
// so an empty file satisfies every scenario here without ever being parsed as xlsx.
import { profiles } from "../scripts/convert.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "cli.ts");

/** Writes an empty file at `home`/source.xlsx and returns its path, standing in for a
 * readable-but-unparsed xlsx source. */
function emptySource(home: string): string {
  const path = join(home, "source.xlsx");
  writeFileSync(path, "");
  return path;
}

test("T-251 invoking cli.ts with no command prints the usage line to stderr and exits 2", () => {
  const run = withTempHome((home) => runCli(SCRIPT, home, "", []));
  assert.equal(run.status, 2, `exit code (stderr: ${run.stderr})`);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "usage: cli.ts <list|extract|verify> <xlsx> [args]\n");
});

test("T-252 an unknown command with a readable source file prints unknown command to stderr and exits 2", () => {
  const run = withTempHome((home) => runCli(SCRIPT, home, "", ["bogus", emptySource(home)]));
  assert.equal(run.status, 2, `exit code (stderr: ${run.stderr})`);
  assert.equal(run.stdout, "");
  assert.equal(run.stderr, "unknown command: bogus\n");
});

test("T-253 extract with an unknown profile prints the profile names to stderr and exits 2", () => {
  const run = withTempHome((home) =>
    runCli(SCRIPT, home, "", [
      "extract",
      emptySource(home),
      "--out",
      join(home, "out"),
      "--profile",
      "bogus",
    ]),
  );
  assert.equal(run.status, 2, `exit code (stderr: ${run.stderr})`);
  assert.equal(run.stdout, "");
  assert.equal(
    run.stderr,
    `no such profile: bogus (${Object.keys(profiles).join(", ")})\n`,
  );
});
