// Whether the two nesting checks reach CI and the whole tracked tree: test.yml invokes both
// linters with GitHub annotation output, each runs clean from the repository root under the
// committed config, and `.gitignore` hides no lintable tracked file (`vcs.useIgnoreFile` makes
// biome skip whatever git ignores). test.yml is read as text: package.json carries no YAML
// parser, and both commands are literal `run:` lines.
//
// T-021 pins every tracked JS/TS/JSON file under hooks/ under --error-on-warnings. Once #710
// raises the rule to error, T-016 carries this check and T-021 retires.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "..", "..");
const BIOME_BIN = path.join(ROOT, "node_modules", ".bin", "biome");
const OXLINT_BIN = path.join(ROOT, "node_modules", ".bin", "oxlint");
const TEST_YML = path.join(ROOT, ".github", "workflows", "test.yml");

// Exit code of `bin args` run from the repository root. A warn-level rule leaves both linters at
// exit 0, so a non-zero here means a config error, a parse error, or an error-level finding.
// With `captureStdout`, returns `{ code, stdout }` instead of the bare code, for a caller (T-020 to T-022)
// that also reads the tool's own report of how many files it checked.
function runFromRoot(bin, args, { captureStdout = false } = {}) {
  assert.ok(
    existsSync(bin),
    `${bin} is missing: run the repository's install step (bun install) before this suite`,
  );
  try {
    const stdout = execFileSync(bin, args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return captureStdout ? { code: 0, stdout } : 0;
  } catch (error) {
    const code = typeof error.status === "number" ? error.status : 1;
    return captureStdout ? { code, stdout: error.stdout || "" } : code;
  }
}

// The list a hand-written array could drift from silently. readdirSync reads the same directory
// entries oxlint's own `workflows/*.js` / `.ja/workflows/*.js` overrides match, one level deep.
function listWorkflowScripts(dir) {
  return readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
    .map((entry) => path.posix.join(dir, entry.name));
}

// T-020 covers tracked workflows/**/tests/, workflows/tests/, and tests/ files, by extension;
// hooks/**/tests/ is #712's range. Once #710 raises the rule to error, T-016 (bare `biome lint`
// from the root exits zero) carries this check and T-020 retires.
const T020_SCOPE_RE = /^(workflows\/.*\/tests\/|workflows\/tests\/|tests\/)/;
const T020_EXT_RE = /\.(js|ts|tsx|json)$/;

test("T-015 test.yml runs biome lint with --reporter=github in a step after an oxlint step that passes --format=github", () => {
  const source = readFileSync(TEST_YML, "utf8");
  const oxlint = source.search(/^\s+run: npx oxlint --format=github\s*$/m);
  const biome = source.search(/^\s+run: npx biome lint --reporter=github\s*$/m);
  assert.notEqual(oxlint, -1, "test.yml carries no `run: npx oxlint --format=github` step");
  assert.notEqual(biome, -1, "test.yml carries no `run: npx biome lint --reporter=github` step");
  assert.ok(biome > oxlint, "the biome step comes before the oxlint step");
});

test("T-016 biome lint run bare from the repository root exits zero", () => {
  assert.equal(runFromRoot(BIOME_BIN, ["lint"]), 0);
});

test("T-017 oxlint run bare from the repository root exits zero", () => {
  assert.equal(runFromRoot(OXLINT_BIN, []), 0);
});

test("T-018 no tracked .js or .ts file is hidden from Biome by .gitignore", () => {
  const ignoredTracked = execFileSync("git", ["ls-files", "-z", "-i", "-c", "--exclude-standard"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter((file) => /\.(js|mjs|cjs|jsx|ts|mts|cts|tsx)$/.test(file));
  assert.deepEqual(ignoredTracked, []);
});

// max-depth sits at "warn" in the workflows/.ja overrides (T-010), so only --deny-warnings turns
// a nesting hit into a non-zero exit; T-017's bare run stays green through it. This pins every
// workflow script's nesting to the override's limit, not just the fixtures oxlint-workflow-depth
// exercises. If #710 promotes max-depth to error, T-017's bare run would carry the same role and
// this check retires.
test("T-019 oxlint --deny-warnings over every workflow script in workflows/ and .ja/workflows/ exits zero", () => {
  const scripts = [...listWorkflowScripts("workflows"), ...listWorkflowScripts(".ja/workflows")];
  assert.ok(scripts.length > 0, "no *.js file found directly under workflows/ or .ja/workflows/");
  assert.equal(runFromRoot(OXLINT_BIN, ["--deny-warnings", ...scripts]), 0);
});

test("T-020 biome lint --error-on-warnings over every tracked test file under workflows/ and tests/ exits zero after checking every listed file", () => {
  const files = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
    .filter((file) => T020_SCOPE_RE.test(file) && T020_EXT_RE.test(file));
  assert.ok(files.length > 0, "the filtered file list is empty");

  const { code, stdout } = runFromRoot(BIOME_BIN, ["lint", "--error-on-warnings", ...files], {
    captureStdout: true,
  });
  const checked = stdout.match(/Checked (\d+) files?/);
  assert.ok(checked, "biome's stdout carries no `Checked N files` line");
  assert.equal(
    Number(checked[1]),
    files.length,
    "biome checked a different count than the list supplies",
  );
  assert.equal(code, 0);
});

test("T-021 biome lint --error-on-warnings over every tracked JS and TS file under hooks/ exits zero after checking every listed file", () => {
  const files = execFileSync("git", ["ls-files", "-z", "--", "hooks"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter((file) => /\.(js|ts|tsx|json)$/.test(file) && !file.includes("/fixtures/"));
  assert.ok(files.length > 0, "expected at least one tracked JS/TS/JSON file under hooks/");

  const { code, stdout } = runFromRoot(BIOME_BIN, ["lint", "--error-on-warnings", ...files], {
    captureStdout: true,
  });
  assert.equal(
    code,
    0,
    `biome lint --error-on-warnings over hooks/ must exit zero, stdout:\n${stdout}`,
  );

  // An argument biome skips (a git-ignored path, see T-018) leaves the count below the list
  // without any diagnostic, so the count is compared exactly rather than as a floor.
  const checked = stdout.match(/Checked (\d+) files?/);
  assert.ok(checked, `expected a "Checked N files" line in stdout, got:\n${stdout}`);
  assert.equal(Number(checked[1]), files.length);
});

// Every tracked JS/TS file that sits under a subdirectory of workflows/ or .ja/workflows/ (the
// top-level workflows/*.js and .ja/workflows/*.js entry points are excluded by biome.json
// itself, so they are left out here too), minus anything under a /tests/ directory -- tests are
// not part of this gate.
function trackedLintTargetsOutsideTests() {
  const SOURCE_EXT = /\.(js|mjs|cjs|ts|mts|cts)$/;
  const UNDER_A_SUBDIR = /^(\.ja\/)?workflows\/[^/]+\/.+$/;
  return execFileSync("git", ["ls-files", "-z", "workflows", ".ja/workflows"], {
    cwd: ROOT,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean)
    .filter(
      (file) => SOURCE_EXT.test(file) && UNDER_A_SUBDIR.test(file) && !file.includes("/tests/"),
    );
}

test("T-022 biome lint --error-on-warnings over every tracked JS and TS file under workflows subdirectories outside tests exits zero after checking every listed file", () => {
  const files = trackedLintTargetsOutsideTests();
  assert.ok(
    files.length > 0,
    "no tracked JS/TS files found under workflows subdirectories outside tests",
  );
  const result = runFromRoot(BIOME_BIN, ["lint", "--error-on-warnings", ...files], {
    captureStdout: true,
  });
  assert.equal(result.code, 0, `expected exit 0; biome stdout was:\n${result.stdout}`);
  assert.ok(
    result.stdout.includes(`Checked ${files.length} files`),
    `expected biome stdout to report "Checked ${files.length} files", got:\n${result.stdout}`,
  );
});

// Every tracked source file under skills/ or .ja/skills/ outside a test or tests directory,
// by extension. skills/*/test/cases/** (biome.json's own ignore) falls out of this the same
// way skills/*/tests/*.test.ts does.
const SKILLS_SOURCE_RE = /^(\.ja\/)?skills\//;
const SKILLS_TEST_SEGMENT = /\/tests?\//;
const SKILLS_EXT_RE = /\.(js|mjs|cjs|ts|mts|cts)$/;

function trackedSkillsFilesOutsideTests() {
  return execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
    .split("\0")
    .filter(
      (file) =>
        SKILLS_SOURCE_RE.test(file) && !SKILLS_TEST_SEGMENT.test(file) && SKILLS_EXT_RE.test(file),
    );
}

// Same shape as runFromRoot, but keeps stdout so T-023 can read the "Checked N files" line
// instead of only the exit code.
function runCaptureFromRoot(bin, args) {
  assert.ok(
    existsSync(bin),
    `${bin} is missing: run the repository's install step (bun install) before this suite`,
  );
  try {
    const stdout = execFileSync(bin, args, { cwd: ROOT, encoding: "utf8" });
    return { status: 0, stdout };
  } catch (error) {
    return {
      status: typeof error.status === "number" ? error.status : 1,
      stdout: typeof error.stdout === "string" ? error.stdout : "",
    };
  }
}

test("T-023 biome lint --error-on-warnings over every tracked JS and TS file under skills outside test directories exits zero after checking every listed file", () => {
  const files = trackedSkillsFilesOutsideTests();
  assert.ok(files.length > 0, "the tracked file list under skills/ is non-empty");
  const { status, stdout } = runCaptureFromRoot(BIOME_BIN, [
    "lint",
    "--error-on-warnings",
    ...files,
  ]);
  assert.equal(status, 0, `exit code (stdout: ${stdout})`);
  const checked = stdout.match(/Checked (\d+) files?/);
  assert.ok(checked, `stdout carries no "Checked N files" line: ${stdout}`);
  assert.equal(Number(checked[1]), files.length, "biome did not check every listed file");
});
