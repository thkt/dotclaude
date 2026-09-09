/// <reference types="node" />
// Behavior tests for skills/issue/scripts/pick-plan.ts, the TypeScript port of the retired
// Python script. T-190 replays the frozen fixture in fixtures/pick-plan-cases.json, produced by
// running the Python script itself before it was retired (U-001), and compares the port's exit
// code and stdout against it case by case; the fixture's <draft-path>/<draft-dir> placeholders
// are text substituted for a temp directory this run seeds with the same drafts each case
// names. T-191 exercises slugify and rank directly. The five tests below them are the ones
// pick-plan.test.js carried before this port, driven through runCli against the .ts script
// instead of spawnSync("python3", ...). "both copies of the script carry the executable bit
// and print the same Usage line" compares the tracked en/ja .ts files directly.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { trackedEntries } from "../../../hooks/_lib/shebang_scope.ts";
import {
  runCli,
  withTempHome,
  type CliRun,
  type FixtureCase,
} from "../../../workflows/_lib/tests/_cli-fixture.ts";
import { rank, slugify } from "../scripts/pick-plan.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, "..", "scripts", "pick-plan.ts");
const FIXTURES = JSON.parse(
  readFileSync(join(HERE, "fixtures", "pick-plan-cases.json"), "utf8"),
) as FixtureCase[];

const DRAFT = (slug: string): string =>
  [
    "## Plan",
    "",
    `Outcome: ${slug} is done`,
    "",
    "### U-001 first",
    "",
    "- files: `a.js`",
    "",
    "## Backlog candidates",
    "",
    "- something out of scope",
    "",
    "## Notes",
    "",
    "- not transferred",
    "",
  ].join("\n");

const run = (...args: string[]): { status: number | null; out: Record<string, unknown> | null } => {
  const res: CliRun = withTempHome((home) => runCli(SCRIPT, home, "", args));
  return {
    status: res.status,
    out: res.stdout ? (JSON.parse(res.stdout) as Record<string, unknown>) : null,
  };
};

const withDrafts = <T>(slugs: Array<[string, string]>, body: (dir: string) => T): T => {
  const dir = mkdtempSync(join(tmpdir(), "pick-plan-"));
  try {
    for (const [date, slug] of slugs)
      writeFileSync(join(dir, `${date}-${slug}.plan.md`), DRAFT(slug), "utf8");
    return body(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

// The drafts each frozen fixture case expects to find in its temp <draft-dir> (or, for
// path_mode, the single draft its <draft-path> resolves to) -- the same slugs/dates the fixture
// was recorded against when it was still driven by the Python script.
const DRAFTS_BY_CASE: Record<string, Array<[string, string]>> = {
  path_mode: [["2026-08-19", "add-csv-export"]],
  ambiguous_tie: [
    ["2026-08-19", "build-stop-reasons"],
    ["2026-08-18", "build-unit-caps"],
  ],
  single_match: [
    ["2026-08-19", "add-csv-export"],
    ["2026-08-18", "rename-buttons"],
  ],
};

const resolvePlaceholders = (text: string, placeholders: Record<string, string>): string => {
  let out = text;
  for (const [key, value] of Object.entries(placeholders)) out = out.split(key).join(value);
  return out;
};

interface CaseSetup {
  placeholders: Record<string, string>;
  cleanup: () => void;
}

// missing_directory names a directory that must not exist (a missing directory is the no-match
// case under test), so it is the one case that does not go through withDrafts.
const setupCase = (name: string): CaseSetup => {
  if (name === "missing_directory") {
    return {
      placeholders: { "<draft-dir>": join(tmpdir(), "pick-plan-absent") },
      cleanup: () => {},
    };
  }
  const dir = mkdtempSync(join(tmpdir(), "pick-plan-"));
  const slugs = DRAFTS_BY_CASE[name] ?? [];
  for (const [date, slug] of slugs)
    writeFileSync(join(dir, `${date}-${slug}.plan.md`), DRAFT(slug), "utf8");
  const cleanup = () => rmSync(dir, { recursive: true, force: true });
  if (name === "path_mode") {
    const [date, slug] = slugs[0];
    return { placeholders: { "<draft-path>": join(dir, `${date}-${slug}.plan.md`) }, cleanup };
  }
  return { placeholders: { "<draft-dir>": dir }, cleanup };
};

test("T-190 every frozen pick-plan case reproduces the python cli's exit code and stdout json with the draft path placeholders resolved to this run's temp drafts", () => {
  for (const testCase of FIXTURES) {
    const { placeholders, cleanup } = setupCase(testCase.name);
    try {
      const argv = (testCase.argv ?? []).map((arg) => resolvePlaceholders(arg, placeholders));
      const result: CliRun = withTempHome((home) => runCli(SCRIPT, home, testCase.stdin, argv));
      assert.equal(result.status, testCase.exit, `${testCase.name}: exit code`);
      assert.equal(
        result.stdout,
        resolvePlaceholders(testCase.stdout, placeholders),
        `${testCase.name}: stdout`,
      );
    } finally {
      cleanup();
    }
  }
});

test("T-191 slugify strips the bracketed type, folds full-width characters through nfkc, and keeps only words longer than two letters for scoring", () => {
  assert.equal(
    slugify("[Feature] Add CSV export"),
    "add-csv-export",
    "the bracketed type is stripped",
  );
  assert.equal(
    slugify("Ｆｅａｔｕｒｅ　ｆｌａｇｓ"),
    "feature-flags",
    "full-width letters and the full-width space fold to ascii through nfkc",
  );

  withDrafts([["2026-08-19", "to-do-list"]], (dir) => {
    const rows = rank("to", dir);
    assert.equal(
      rows[0]?.score,
      0,
      "a two-letter word does not score even against a draft containing it",
    );
  });

  withDrafts(
    [
      ["2026-08-19", "chore-dependency-bumps"],
      ["2026-08-18", "feature-flags"],
    ],
    (dir) => {
      const withPrefix = rank("[Chore] flags", dir);
      const without = rank("flags", dir);
      assert.deepEqual(withPrefix, without, "the bracketed type changes nothing about the ranking");
      const top = without.filter((row) => row.score === without[0]?.score);
      assert.equal(top.length, 1, "one real word (flags) breaks the tie decisively");
      assert.match(top[0]?.path ?? "", /feature-flags/, "the matching word alone picks the draft");
    },
  );
});

// Phase 3 transfers the two sections verbatim. Taking the whole file would carry /think's own
// headings into the issue, and stopping at the first blank line would truncate a section.
test("a draft path returns the two sections and nothing else", () =>
  withDrafts([["2026-08-19", "add-csv-export"]], (dir) => {
    const { status, out } = run(join(dir, "2026-08-19-add-csv-export.plan.md"));
    assert.equal(status, 0);
    assert.match(String(out?.plan), /^## Plan\n/);
    assert.match(String(out?.plan), /### U-001 first/);
    assert.doesNotMatch(String(out?.plan), /## Backlog candidates/);
    assert.match(String(out?.backlog), /^## Backlog candidates\n/);
    assert.doesNotMatch(String(out?.backlog), /## Notes/);
  }));

// The slug comes from the title handed to /think and the issue title is written separately, so a
// tie is the normal outcome rather than an edge case. Choosing one anyway transfers a plan that
// belongs to another issue, and nothing downstream can tell.
test("several drafts sharing the top score are reported rather than chosen", () =>
  withDrafts(
    [
      ["2026-08-19", "build-stop-reasons"],
      ["2026-08-18", "build-unit-caps"],
    ],
    (dir) => {
      const { out } = run("[Feature] build の話", dir);
      assert.equal(out?.path, null, "it does not choose");
      assert.equal(out?.ambiguous, true, "it says the choice is open");
      assert.equal(
        ((out?.candidates as unknown[] | undefined) ?? []).length,
        2,
        "both are handed back",
      );
    },
  ));

test("one draft scoring alone is chosen and extracted", () =>
  withDrafts(
    [
      ["2026-08-19", "add-csv-export"],
      ["2026-08-18", "rename-buttons"],
    ],
    (dir) => {
      const { out } = run("[Feature] add csv export", dir);
      assert.match(String(out?.path), /add-csv-export/);
      assert.equal(out?.ambiguous, false);
      assert.match(String(out?.plan), /^## Plan\n/);
    },
  ));

// An issue filed before any planning is the normal first case. Exiting non-zero there would stop
// the skill on its most common path.
test("a missing directory is a no-match rather than a failure", () => {
  const { status, out } = run("[Feature] x", join(tmpdir(), "pick-plan-absent"));
  assert.equal(status, 0);
  assert.equal(out?.path, null);
  assert.deepEqual(out?.candidates, []);
});

// The type prefix is not part of the slug /think writes. Leaked into the score it becomes a word
// like any other, so a draft named after the type outranks the one the title is about. The second
// draft here exists to make that reordering visible.
test("the bracketed type does not enter the score", () =>
  withDrafts(
    [
      ["2026-08-19", "chore-dependency-bumps"],
      ["2026-08-18", "feature-flags"],
    ],
    (dir) => {
      // One real word, so a leaked type word ties the two drafts instead of losing to them.
      const withPrefix = run("[Chore] flags", dir);
      const without = run("flags", dir);
      assert.match(
        String(without.out?.path),
        /feature-flags/,
        "the bare title picks its own draft",
      );
      assert.equal(withPrefix.out?.path, without.out?.path, "the prefix changes nothing");
      assert.equal(withPrefix.out?.ambiguous, false, "the prefix does not create a tie");
    },
  ));

// SKILL.md invokes the script by its path and allowed-tools permits exactly that shape. Without
// the executable bit the call fails, and prefixing node to work around it no longer matches the
// permission. Both language copies ship the bit because either tree can be the loaded skill,
// and running each directly (no argument) has to fail the same way: the same Usage line, the
// same exit 1. trackedEntries reads the git index mode the way
// hooks/_lib/tests/shebang-scope.test.ts does, so a copy committed without the bit fails here
// rather than only at skill-invocation time.
test("both copies of the script carry the executable bit and print the same Usage line", () => {
  const entries = trackedEntries([
    "skills/issue/scripts/pick-plan.ts",
    ".ja/skills/issue/scripts/pick-plan.ts",
  ]);
  assert.equal(entries.length, 2, "both copies are tracked");
  const usage = entries.map(([mode, absolutePath]) => {
    assert.equal(mode, "100755", `${absolutePath}: carries the executable bit`);
    const result = spawnSync(absolutePath, [], { encoding: "utf8" });
    assert.equal(result.status, 1, `${absolutePath}: exits 1 with no argument`);
    return result.stderr;
  });
  assert.equal(usage[0], usage[1], "both copies print the same Usage line");
});
