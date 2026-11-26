/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const CLI_SCRIPTS = [
  "dr/scripts/pre-check.ts",
  "dr/scripts/validate-dr.ts",
  "dr/scripts/update-index.ts",
  "outcome/scripts/validate-outcome.ts",
  "scoping/scripts/find-prior-research.ts",
  "implement/scripts/launch.ts",
].flatMap((rel) => [`skills/${rel}`, `.ja/skills/${rel}`]);

const CLI_SHEBANG = "#!/usr/bin/env bun";
const CLI_MODE = "100755";
const LIB_MODE = "100644";

test("the CLI scripts in EN and .ja are tracked with mode 100755 and open with #!/usr/bin/env bun, and every other skill script is tracked with mode 100644", () => {
  const modeByPath = new Map(
    trackedEntries([":(glob)skills/*/scripts/*.ts", ":(glob).ja/skills/*/scripts/*.ts"]).map(
      ([mode, absolutePath]) => [relative(REPO_ROOT, absolutePath), mode],
    ),
  );

  for (const relPath of CLI_SCRIPTS) {
    assert.equal(modeByPath.get(relPath), CLI_MODE, `${relPath}: git index mode`);
    const firstLine = readFileSync(join(REPO_ROOT, relPath), "utf8").split(/\r?\n/, 1)[0];
    assert.equal(firstLine, CLI_SHEBANG, `${relPath}: first line`);
  }

  const others = [...modeByPath].filter(([relPath]) => !CLI_SCRIPTS.includes(relPath));
  assert.ok(others.length > 0, "the scripts directories hold files besides the CLI scripts");
  for (const [relPath, mode] of others) {
    assert.equal(mode, LIB_MODE, `${relPath}: git index mode`);
  }
});
