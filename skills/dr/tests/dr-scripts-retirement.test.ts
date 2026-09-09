/// <reference types="node" />
// Guards the retirement of skills/dr/scripts' 4 Python scripts (dr_common.py, pre-check.py,
// validate-dr.py, update-index.py) and their .ja mirror, the same way
// workflows/_lib/tests/ts-harness-retirement.test.ts guards run-workflow.js's: no tracked file
// outside docs/decisions/ and .claude/workspace/research/ (kept as historical record, per
// docs/wiki/retire-rename-procedure.md) still names one, /dr's SKILL.md invokes the .ts scripts
// by path instead, and the .ts scripts themselves keep the shebang/mode convention
// hooks/_lib/shebang_scope.ts already checks for hooks/.
//
// The walk and the historical-directory exclusions are offendersAmong (workflows/_lib/tests/_retirement.ts),
// shared with the other retirement tests; trackedEntries (hooks/_lib/shebang_scope.ts) is the
// git-mode/first-line reader T-214 shares with hooks/_lib/tests/shebang-scope.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import { assertDetectsAndMisses, offendersAmong, trackedFiles } from "../../../workflows/_lib/tests/_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));

// Flags a retired script name used as a word (not as part of a longer identifier), immediately
// followed by the literal ".py" extension -- e.g. "pre-check.py" or "scripts/dr_common.py", but
// not "pre-check.py.bak" (the trailing \b still lets that through; callers that care skip it
// on inspection) nor "not-pre-check.py" (the [^\w.-] boundary before the name).
const PY_NEEDLE = /(^|[^\w.-])(dr_common|pre-check|validate-dr|update-index)\.py\b/;

function referencesRetiredPyScript(content: string): boolean {
  return PY_NEEDLE.test(content);
}

test("T-212 no tracked file outside docs/decisions/and .claude/workspace/research/references dr_common.py, pre-check.py, validate-dr.py or update-index.py as a word, and the same predicate flags a fixture line carrying one", () => {
  assertDetectsAndMisses(referencesRetiredPyScript, "pre-check.py");

  const offenders = offendersAmong(
    trackedFiles(REPO_ROOT),
    (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
    referencesRetiredPyScript,
    [SELF_PATH],
  );
  assert.deepEqual(
    offenders,
    [],
    `files still naming a retired dr script by its .py extension (docs/decisions/ and ` +
      `.claude/workspace/research/ are kept as history, not counted): ${offenders.join(", ")}`,
  );
});

const SKILL_FILES = ["skills/dr/SKILL.md", ".ja/skills/dr/SKILL.md"];
const INVOCATION = /\$\{CLAUDE_SKILL_DIR\}\/scripts\/([\w-]+)\.(ts|py)\b/g;
const ALLOWED_TOOLS_SCRIPTS_GRANT = "Bash(${CLAUDE_SKILL_DIR}/scripts/*)";

test("T-213 the EN and .ja dr SKILL.md invoke pre-check, validate-dr and update-index by path as .ts, none as .py, and their allowed-tools still grant the scripts path", () => {
  for (const relPath of SKILL_FILES) {
    const content = readFileSync(join(REPO_ROOT, relPath), "utf8");

    const invokedNames = new Set<string>();
    for (const [, name, extension] of content.matchAll(INVOCATION)) {
      invokedNames.add(name);
      assert.equal(extension, "ts", `${relPath} (${name}) still invokes a python script`);
    }
    for (const expectedName of ["pre-check", "validate-dr", "update-index"]) {
      assert.ok(
        invokedNames.has(expectedName),
        `${relPath} never invokes ${expectedName} by its ${"${CLAUDE_SKILL_DIR}/scripts/"} path`,
      );
    }

    assert.ok(
      content.includes(ALLOWED_TOOLS_SCRIPTS_GRANT),
      `${relPath} allowed-tools no longer grants ${ALLOWED_TOOLS_SCRIPTS_GRANT}`,
    );
  }
});

const CLI_SCRIPT_NAMES = ["pre-check", "validate-dr", "update-index"];
const CLI_SHEBANG = "#!/usr/bin/env node";
const CLI_MODE = "100755";
const LIB_MODE = "100644";

test("T-214 the three CLI .ts files in EN and .ja are tracked with mode 100755 and open with #!/usr/bin/env node, and dr_common.ts is tracked with mode 100644 without a shebang", () => {
  const scriptsDirs = ["skills/dr/scripts", ".ja/skills/dr/scripts"];
  const entries = trackedEntries(scriptsDirs.map((dir) => `${dir}/*.ts`));
  const byPath = new Map(
    entries.map(([mode, absolutePath]) => [relative(REPO_ROOT, absolutePath), mode]),
  );

  for (const dir of scriptsDirs) {
    for (const name of CLI_SCRIPT_NAMES) {
      const relPath = `${dir}/${name}.ts`;
      const mode = byPath.get(relPath);
      assert.equal(mode, CLI_MODE, `${relPath} is tracked with mode ${mode}, expected ${CLI_MODE}`);
      const firstLine = readFileSync(join(REPO_ROOT, relPath), "utf8").split(/\r?\n/, 1)[0];
      assert.equal(
        firstLine,
        CLI_SHEBANG,
        `${relPath} opens with ${JSON.stringify(firstLine)}, expected ${JSON.stringify(CLI_SHEBANG)}`,
      );
    }

    const libPath = `${dir}/dr_common.ts`;
    const libMode = byPath.get(libPath);
    assert.equal(libMode, LIB_MODE, `${libPath} is tracked with mode ${libMode}, expected ${LIB_MODE}`);
    const libFirstLine = readFileSync(join(REPO_ROOT, libPath), "utf8").split(/\r?\n/, 1)[0];
    assert.ok(
      !libFirstLine.startsWith("#!"),
      `${libPath} still carries a shebang: ${JSON.stringify(libFirstLine)}`,
    );
  }
});
