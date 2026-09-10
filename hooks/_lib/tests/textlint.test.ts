/// <reference types="node" />
// Differential tests for hooks/_lib/textlint.ts against its Python sibling (unit U-002,
// docs/decisions/0112-adopt-typescript-for-helper-scripts.md, still imported directly by
// hooks/pre-bash/body_proofread.py): for the same PATH and the same edited file, lint() must
// invoke the same runner + textlint command and read back the same result, and fix() must stay
// silent under the same conditions. Both modules resolve CONFIG from their own file's location
// (the real repo's .textlintrc.json), so this test controls the runner instead: a stub `bun` on
// PATH plays the same role hooks/_lib/tests/rust-target.test.ts's installStubCargo plays for
// that test's binary-resolution cases -- shutil.which and its TS mirror both search PATH, so
// replacing PATH is what controls which runner (if any) they find.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { fix, lint } from "../textlint.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const HOOKS_LIB_DIR = join(HERE, "..");

// Resolved once, before any test narrows process.env.PATH below: spawnSync needs to find the
// python3 binary itself, and a narrowed PATH built to make bun/npx unreachable would make
// python3 unreachable too if it were looked up by bare name at call time.
const PYTHON3_PATH: string = (() => {
  const found = spawnSync("which", ["python3"], { encoding: "utf8" }).stdout.trim();
  return found || "python3";
})();

/** A one-shot driver rather than a CLI: the Python sibling has no __main__, so this is the
 * smallest way to call its lint/fix from outside the process. Mirrors hook-payload-parity.test.ts's
 * PY_DRIVER for the same reason. */
const PY_DRIVER = `
import json
import sys

sys.path.insert(0, sys.argv[1])
import textlint as tl

spec = json.loads(sys.stdin.read())
fn = spec["fn"]
if fn == "lint":
    result = tl.lint(spec["path"])
elif fn == "fix":
    tl.fix(spec["path"])
    result = None
else:
    raise SystemExit(f"unknown fn: {fn}")
print(json.dumps({"result": result}))
`;

type PythonSpec = { fn: "lint" | "fix"; path: string };

function runPython(spec: PythonSpec): unknown {
  const result = spawnSync(PYTHON3_PATH, ["-c", PY_DRIVER, HOOKS_LIB_DIR], {
    input: JSON.stringify(spec),
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`python3 driver failed (exit ${result.status}): ${result.stderr}`);
  }
  return (JSON.parse(result.stdout) as { result: unknown }).result;
}

/** Runs fn with PATH replaced by exactly binDir -- a replaced (not merged) PATH is what makes
 * "no runner" true regardless of whether this machine happens to have a real bun/npx
 * installed, the same reasoning hooks/_lib/tests/rust-target.test.ts's withOnlyPath documents
 * for its own cargo stub. */
function withOnlyPath<T>(binDir: string, fn: () => T): T {
  const original = process.env.PATH;
  process.env.PATH = binDir;
  try {
    return fn();
  } finally {
    process.env.PATH = original;
  }
}

/** Writes an executable `bun` stub under root/bin that answers `bun x textlint <path> --config
 * <config>` -- the exact argv the Python sibling's _run builds -- with a fixed line naming the
 * path it was given, and returns that directory. */
function installStubBun(root: string): string {
  const binDir = join(root, "bin");
  mkdirSync(binDir, { recursive: true });
  const stub = join(binDir, "bun");
  writeFileSync(
    stub,
    [
      "#!/bin/sh",
      '[ "$1" = "x" ] && [ "$2" = "textlint" ] || exit 0',
      'echo "STUB_TEXTLINT_FINDING:$3"',
      "exit 1",
    ].join("\n") + "\n",
  );
  chmodSync(stub, 0o755);
  return binDir;
}

function makeFixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), "textlint-tests-"));
}

test("T-379 a lint run reports its findings in the shape the python version produced", () => {
  const root = makeFixtureRoot();
  const binDir = installStubBun(root);
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const { tsResult, pyResult } = withOnlyPath(binDir, () => ({
    tsResult: lint(targetPath),
    pyResult: runPython({ fn: "lint", path: targetPath }),
  }));

  assert.match(
    tsResult,
    /^STUB_TEXTLINT_FINDING:/,
    "textlint.ts: lint() must return the stub runner's stdout verbatim",
  );
  assert.equal(tsResult, pyResult, "textlint.ts and its Python sibling must read the same result");
});

test("T-380 an absent textlint binary leaves the hook silent", () => {
  const root = makeFixtureRoot();
  const emptyBinDir = join(root, "empty-bin");
  mkdirSync(emptyBinDir, { recursive: true });
  const targetPath = join(root, "example.md");
  writeFileSync(targetPath, "# stub target\n");

  const { tsResult, pyResult } = withOnlyPath(emptyBinDir, () => ({
    tsResult: lint(targetPath),
    pyResult: runPython({ fn: "lint", path: targetPath }),
  }));

  assert.equal(tsResult, "", "textlint.ts: an absent runner must read as no findings, not throw");
  assert.equal(pyResult, "", "the Python sibling: an absent runner must read as no findings");

  assert.doesNotThrow(() => {
    withOnlyPath(emptyBinDir, () => fix(targetPath));
  }, "textlint.ts: fix() must stay silent (no throw) when no runner is found");
});
