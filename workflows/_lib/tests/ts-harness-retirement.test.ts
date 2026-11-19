/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { assertDetectsAndMisses, assertNoResidualReferences } from "./_retirement.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const SELF_PATH = relative(REPO_ROOT, fileURLToPath(import.meta.url));
const PR_BODY_RETIREMENT_PATH = join(REPO_ROOT, "workflows", "_lib", "tests", "pr-body-retirement.test.ts");

const RETIRED_PATHS = ["_lib/run-workflow.js", "_lib/codex-run.js", "_lib/tests/_brace.js"];

function referencesPath(content: string, retiredPath: string): boolean {
  return content.includes(retiredPath);
}

test(
  "T-053 no tracked file outside docs/decisions/ and docs/research/ references " +
    "_lib/run-workflow.js, _lib/codex-run.js, or _lib/tests/_brace.js",
  () => {
    assertDetectsAndMisses((content) => referencesPath(content, "_lib/run-workflow.js"), "_lib/run-workflow.js");
    assertDetectsAndMisses((content) => referencesPath(content, "_lib/codex-run.js"), "_lib/codex-run.js");
    assertDetectsAndMisses((content) => referencesPath(content, "_lib/tests/_brace.js"), "_lib/tests/_brace.js");

    for (const retiredPath of RETIRED_PATHS) {
      assertNoResidualReferences(
        REPO_ROOT,
        (path) => readFileSync(join(REPO_ROOT, path), "utf8"),
        (content) => referencesPath(content, retiredPath),
        retiredPath,
        [SELF_PATH],
      );
    }
  },
);

test(
  "T-430 both retirement tests drive the shared scan, and each keeps its own historical-directory exclusions",
  () => {
    const read = (path: string): string => readFileSync(join(REPO_ROOT, path), "utf8");

    const prBodyRetiredName = ["pr-body", "py"].join(".");
    const prBodyPattern = new RegExp(`(^|[^\\w.-])${prBodyRetiredName.replace(".", "\\.")}\\b`);
    const prBodySelfPath = "workflows/_lib/tests/pr-body-retirement.test.ts";
    assert.doesNotThrow(
      () =>
        assertNoResidualReferences(
          REPO_ROOT,
          read,
          (content) => prBodyPattern.test(content),
          prBodyRetiredName,
          [prBodySelfPath],
        ),
      "pr-body-retirement.test.ts's own retirement scan, driven through the shared helper, must " +
        "stay clean under its own exclusions",
    );

    for (const retiredPath of RETIRED_PATHS) {
      assert.doesNotThrow(
        () =>
          assertNoResidualReferences(
            REPO_ROOT,
            read,
            (content) => referencesPath(content, retiredPath),
            retiredPath,
            [SELF_PATH],
          ),
        `ts-harness-retirement.test.ts's own scan for ${retiredPath}, driven through the ` +
          "shared helper, must stay clean under its own self-exclusion",
      );
    }

    assert.throws(
      () =>
        assertNoResidualReferences(
          REPO_ROOT,
          read,
          (content) => prBodyPattern.test(content),
          prBodyRetiredName,
          [SELF_PATH],
        ),
      "pr-body-retirement.test.ts's own self-exclusion must not be substitutable by another " +
        "file's, or the two retirement tests are not really keeping their own exclusions",
    );
  },
);

test(
  "T-431 a mistyped retired name makes the positive control fail, because the fixture is " +
    "built from a literal rather than from the searched constant",
  () => {
    const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");
    const prBodySource = readFileSync(PR_BODY_RETIREMENT_PATH, "utf8");

    for (const [label, source] of [
      ["pr-body-retirement.test.ts", prBodySource],
      ["ts-harness-retirement.test.ts", ownSource],
    ] as const) {
      const callLines = source.split("\n").filter((line) => {
        const idx = line.indexOf("assertDetectsAndMisses(");
        if (idx === -1) return false;
        const before = line[idx - 1];
        return before === undefined || !['"', "'", "`", "/"].includes(before);
      });
      assert.ok(callLines.length > 0, `${label} must call assertDetectsAndMisses`);
      for (const line of callLines) {
        const m = line.match(/assertDetectsAndMisses\(.*,\s*([^);]+)\);/);
        assert.ok(m, `${label}: could not read assertDetectsAndMisses's arguments from: ${line}`);
        const fixtureArg = (m as RegExpMatchArray)[1].trim();
        assert.ok(
          fixtureArg.startsWith('"') || fixtureArg.startsWith("'") || fixtureArg.startsWith("`"),
          `${label}: assertDetectsAndMisses's fixture argument (\`${fixtureArg}\`) must be a ` +
            "literal, not a reference to the constant the predicate searches for",
        );
      }
    }
  },
);

test(
  "T-432 the three paths T-042 and T-043 checked separately run through one loop and report " +
    "the offending path by name",
  () => {
    const ownSource = readFileSync(fileURLToPath(import.meta.url), "utf8");

    const testNames = [...ownSource.matchAll(/test\(\s*"([^"]+)"/g)].map((m) => m[1]);
    const splitSurvivors = testNames.filter(
      (name) => name.startsWith("T-042") || name.startsWith("T-043"),
    );
    assert.deepEqual(
      splitSurvivors,
      [],
      "T-042 and T-043 must be merged into one test that loops over all three retired paths, " +
        `not left as separate tests: ${splitSurvivors.join(", ")}`,
    );

    const namesAllThreePaths = RETIRED_PATHS.every((retiredPath) =>
      ownSource.includes(`"${retiredPath}"`),
    );
    assert.ok(
      namesAllThreePaths,
      "one shared loop over the three retired paths " +
        `(${RETIRED_PATHS.join(", ")}) must replace the two separate T-042/T-043 tests`,
    );

    const loopMatch = ownSource.match(/for \(const retiredPath of RETIRED_PATHS\)/);
    assert.ok(
      loopMatch,
      "the merged test must run the three paths through one `for` loop over RETIRED_PATHS so a " +
        "failure message names the offending path, rather than one assertion per path",
    );
  },
);
