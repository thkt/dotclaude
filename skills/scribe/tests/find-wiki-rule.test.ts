/// <reference types="node" />
// Behavioral parity tests for skills/scribe/scripts/find_wiki_rule.ts against the retired
// Python original, replayed from the frozen fixture
// skills/scribe/tests/fixtures/find-wiki-rule-cases.json (U-001). Reuses the shared
// runCli/withTempHome/fixture/assertStdoutShape harness from workflows/_lib/tests/_cli-fixture.ts
// (skills/research/tests/find-prior-research.test.ts carries the sibling pattern), and
// hooks/_lib/shebang_scope.ts's trackedEntries for the git-index mode check, instead of a
// standalone statSync or spawn.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import {
  assertStdoutShape,
  fixture,
  runCli,
  withTempHome,
} from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { globToRegExp, readGlobs } from "../scripts/find_wiki_rule.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "find_wiki_rule.ts");
// skills/scribe/tests -> skills/scribe -> skills -> repo root, the same climb
// skills/research/tests/find-prior-research.test.ts's own SCRIPT constant makes.
const REPO_ROOT = join(HERE, "..", "..", "..");

// One frozen replay case, shaped like skills/scribe/tests/fixtures/find-wiki-rule-cases.json
// (U-001): `wiki` writes each entry into a fresh temp dir that becomes the wiki directory, and
// every "<wiki-dir>" token in `argv` is substituted with that temp dir's real path.
interface FindWikiRuleCase {
  name: string;
  wiki: Record<string, string>;
  argv: string[];
  exit: number;
  stdout: string;
}

const CASES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "find-wiki-rule-cases.json"), "utf8"),
) as FindWikiRuleCase[];

/** Runs one fixture case: writes its `wiki` pages under a fresh temp dir, substitutes that dir
 * for the "<wiki-dir>" placeholder in `argv`, runs the CLI, and asserts the CLI's exit code and
 * stdout against the case. */
function runCase(testCase: FindWikiRuleCase, home: string): void {
  const wikiDir = mkdtempSync(join(tmpdir(), "find-wiki-rule-case-"));
  try {
    for (const [pageName, content] of Object.entries(testCase.wiki)) {
      writeFileSync(join(wikiDir, pageName), content);
    }
    const argv = testCase.argv.map((arg) => (arg === "<wiki-dir>" ? wikiDir : arg));
    const run = runCli(SCRIPT, home, "", argv);
    assert.equal(run.status, testCase.exit, `${testCase.name}: exit code (stderr: ${run.stderr})`);
    assertStdoutShape(run.stdout, testCase.stdout, {}, {}, testCase.name);
  } finally {
    rmSync(wikiDir, { recursive: true, force: true });
  }
}

test(
  "T-215 every frozen case in find-wiki-rule-cases.json reproduces the python finder's exit code and its stdout keys in order and values",
  () => {
    assert.ok(CASES.length > 0, "the frozen fixture carries at least one case");
    withTempHome((home) => {
      for (const testCase of CASES) {
        runCase(fixture(CASES, testCase.name), home);
      }
    });
  },
);

test(
  "T-216 a double star crosses directories, a single star stops at one, a trailing double star matches no file, and a dot matches only a dot",
  () => {
    const crossing = globToRegExp("**/agents/**/*.md");
    assert.equal(crossing.test("agents/reviewers/x.md"), true, "** crosses one directory level");
    assert.equal(crossing.test(".ja/agents/x.md"), true, "** crosses a leading directory too");
    const single = globToRegExp("agents/*.md");
    assert.equal(single.test("agents/x.md"), true, "* matches within one directory");
    assert.equal(single.test("agents/reviewers/x.md"), false, "* stops at one directory level");

    // `**/.ja/**` leaves nothing to match the file name, so a page declaring it reaches no
    // implementation; the form that works ends with `/*`.
    assert.equal(globToRegExp("**/.ja/**").test(".ja/skills/x/SKILL.md"), false);
    assert.equal(globToRegExp("**/.ja/**/*").test(".ja/skills/x/SKILL.md"), true);

    assert.equal(globToRegExp("**/*.md").test("agents/xmd"), false, "a literal dot is not a wildcard");
  },
);

test(
  "T-217 a page with no globs key, a malformed globs line, or a globs string reads as an empty list rather than throwing or one glob per character",
  () => {
    const dir = mkdtempSync(join(tmpdir(), "find-wiki-rule-frontmatter-"));
    try {
      const noKey = join(dir, "no-key.md");
      writeFileSync(noKey, "# p\n");
      assert.deepEqual(readGlobs(noKey), []);

      // A malformed globs line (not valid JSON) drops that page, not the whole run.
      const malformed = join(dir, "malformed.md");
      writeFileSync(malformed, "---\nglobs: **/x/**\n---\n\n# p\n");
      assert.deepEqual(readGlobs(malformed), []);

      // A bare string is valid JSON, so it survives the parse; iterated as written it would
      // yield one glob per character, matching almost any file.
      const stringGlobs = join(dir, "string-globs.md");
      writeFileSync(stringGlobs, '---\nglobs: "**/*"\n---\n\n# p\n');
      assert.deepEqual(readGlobs(stringGlobs), []);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
);

test(
  "T-218 an unknown --scene value exits 2 with a stderr line starting with find_wiki_rule, the tracked find_wiki_rule.ts carries mode 100755 and opens with the env node shebang, and every glob a page in this repository declares matches a tracked file",
  () => {
    const wikiDir = mkdtempSync(join(tmpdir(), "find-wiki-rule-scene-"));
    try {
      withTempHome((home) => {
        const run = runCli(SCRIPT, home, "", [wikiDir, "x", "--scene", "not-a-real-scene"]);
        assert.equal(run.status, 2, `exit code (stderr: ${run.stderr})`);
        assert.match(run.stderr, /^find_wiki_rule/);
      });
    } finally {
      rmSync(wikiDir, { recursive: true, force: true });
    }

    const entries = trackedEntries(["skills/scribe/scripts/find_wiki_rule.ts"]);
    assert.equal(entries.length, 1, "the script is tracked exactly once in the git index");
    const [mode, absolutePath] = entries[0];
    assert.equal(mode, "100755", "git index mode");
    const firstLine = readFileSync(absolutePath, "utf8").split(/\r?\n/, 1)[0];
    assert.equal(firstLine, "#!/usr/bin/env node", "shebang line");

    // A glob matching nothing is either wrong or names files that no longer exist. Either way
    // the page never reaches the implementation it was written for.
    const tracked = execFileSync("git", ["ls-files"], { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    const wikiPagesDir = join(REPO_ROOT, "docs", "wiki");
    for (const pageName of readdirSync(wikiPagesDir).filter((name) => name.endsWith(".md")).sort()) {
      for (const glob of readGlobs(join(wikiPagesDir, pageName))) {
        const matcher = globToRegExp(glob);
        assert.ok(
          tracked.some((f) => matcher.test(f)),
          `${pageName}: ${glob} matches no tracked file`,
        );
      }
    }
  },
);
