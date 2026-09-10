/// <reference types="node" />
// Seam tests for the ablate skill's own documentation boundary: SKILL.md must call scripts
// and write branches only, and the integration that runs the measurement scripts in
// sequence must live in report.ts (this unit's contract). T-478 drives the real
// report.build_report across that boundary rather than asserting on a stub, so a call that was
// wired in name only (imported but never invoked, or invoked but never rendered) still
// shows up here. T-006 stays on SKILL.md's own text: a threshold copied into prose, or a
// second call site added alongside report.write_report, are both drift no execution test
// can catch.
//
// T-478 replaces the earlier T-005, which spawned a python3 driver script that imported the
// Python report module and called write_report -- report.ts is now the module under test,
// reached by a plain ESM import, the same "driver-less" shape report.test.ts's own header
// already states for build_report. T-479 replaces the earlier T-007 the same way: it reads the
// sections a real report.write_report(...) call renders (report.ts's output) instead of
// regex-scraping the Python source for its `lines += ["## ..."]` calls.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import * as report from "../scripts/report.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const at = (lang: "ja" | "en", ...parts: string[]) =>
  join(root, ...(lang === "ja" ? [".ja"] : []), "skills", ...parts);
const pair = (...parts: string[]) => ({ ja: at("ja", ...parts), en: at("en", ...parts) });

const skills = pair("ablate", "SKILL.md");

const eachLanguage = async (
  paths: { ja: string; en: string },
  check: (doc: string, lang: string) => void | Promise<void>,
) => {
  for (const [lang, path] of Object.entries(paths)) {
    await check(await readFile(path, "utf8"), lang);
  }
};

// The fixture record shape a real ~/.claude/projects/**/*.jsonl transcript carries, mirroring
// skills/ablate/tests/usage_counts_test.py's own _fire() fixture builder exactly: `command`
// carries the home-relative form the harness actually invokes
// ("~/.claude/hooks/sample_hook.py"), which usage_counts.element_path() strips down to the
// repo-root-relative element path harness_elements.ts itself uses.
const fireRecord = (command: string, timestamp: string) =>
  JSON.stringify({
    type: "attachment",
    attachment: {
      type: "hook_success",
      hookName: "PreToolUse:Bash",
      hookEvent: "PreToolUse",
      command,
      stdout: "",
      exitCode: 0,
    },
    timestamp,
  });

test("T-478 the form test drives report.ts directly instead of spawning python3, and reports the same observations", () => {
  const work = mkdtempSync(join(tmpdir(), "ablate-form-"));
  try {
    const repoRoot = join(work, "repo");
    const transcriptsRoot = join(work, "transcripts");
    const elementPath = "hooks/sample_hook.py";

    // A minimal real harness_elements.POPULATION_GLOBS member ("hooks/**/*.py"), so
    // report.build_report's own call to the real enumerator independently reports this path.
    mkdirSync(join(repoRoot, "hooks"), { recursive: true });
    writeFileSync(join(repoRoot, "hooks", "sample_hook.py"), "# fixture harness element\n");

    // usage_counts.ts's count_usage globs "**/*.jsonl" under the transcripts root it is
    // given, mirroring the real ~/.claude/projects/**/*.jsonl layout one directory level
    // down. report.build_report's `transcripts_root` parameter -- not a HOME env override or
    // a patched module binding -- is what points it at this fixture directory (report.ts's
    // own header states this deviation from the Python version's module-namespace
    // TRANSCRIPTS_ROOT read).
    const transcriptDir = join(transcriptsRoot, "proj-a");
    mkdirSync(transcriptDir, { recursive: true });
    writeFileSync(
      join(transcriptDir, "session-1.jsonl"),
      [
        fireRecord(`~/.claude/${elementPath}`, "2026-08-01T00:00:00.000Z"),
        fireRecord(`~/.claude/${elementPath}`, "2026-08-15T00:00:00.000Z"),
      ].join("\n") + "\n",
    );

    const result = report.build_report(repoRoot, [], transcriptsRoot, new Date("2026-08-27T00:00:00.000Z"));

    assert.ok(
      result.elements.some((element) => element.path === elementPath),
      `the fixture element ${elementPath} rides the report's enumerated elements`,
    );

    // Two fires, most recently on 2026-08-15: both must land on the fixture element's own
    // usage entry, not merely be present somewhere else in the result.
    assert.deepEqual(
      result.usage[elementPath],
      { fires: 2, last_used: "2026-08-15" },
      "the fixture element's usage entry carries its fire count and most recent fire date",
    );
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test("T-006 the skill document names one invocation route and no threshold of its own", () =>
  eachLanguage(skills, (doc, lang) => {
    // Counted from the first phase heading down, not over the whole document: the criteria
    // registry above the phases points at the same script on purpose. A second mention among
    // the phases is a second call site for it, which is the drift this contract rules out.
    const phaseBody = doc.slice(doc.search(/^## Phase 1:/m));
    const mentions = (phaseBody.match(/usage_counts/g) || []).length;
    assert.equal(
      mentions,
      1,
      `${lang}: usage_counts is named exactly once among the phases (found ${mentions})`,
    );

    // A phase added just for the usage counter would be a second invocation route running
    // alongside Phase 3's report.write_report call, rather than folded into it.
    const phases = [...doc.matchAll(/^## Phase (\d+):/gm)].map((m) => Number(m[1]));
    assert.deepEqual(
      phases,
      [1, 2, 3],
      `${lang}: no phase is added to launch the usage counter on its own`,
    );

    // The measurement window and the rare-by-design allowance stay script constants
    // (skills/ablate/scripts/usage_counts.ts); copying either into prose here is the second
    // half of this unit's contract, the same rule already stated for arms.ts / verdict.ts.
    assert.doesNotMatch(
      doc,
      /\b90\b/,
      `${lang}: the measurement-window day count is not copied into this body`,
    );
    assert.doesNotMatch(
      doc,
      /RARE_BY_DESIGN/,
      `${lang}: the rare-by-design set is not spelled out in this body`,
    );
  }));

// The one claim the skeleton still makes on its own: which sections _render emits, and in
// what order. Columns and row labels were removed from it because nothing pinned them, and
// the Harness Elements table had already fallen two columns behind _render by the time this
// test was written.
const templates = pair("ablate", "templates", "report-template.md");

test("T-479 the rendered sections still match the template, read from the template rather than restated", async () => {
  const work = mkdtempSync(join(tmpdir(), "ablate-form-render-"));
  try {
    const repoRoot = join(work, "repo");
    const outDir = join(work, "out");
    mkdirSync(outDir, { recursive: true });

    // report.write_report drives report.ts's own render pass (_render) rather than the Python
    // version's -- the sections it emits are read straight off this call's own output, not
    // scraped from either script's source, so this test compares the .ts render's actual
    // behavior against the template, never a list frozen at the moment the test was written.
    const reportPath = report.write_report(repoRoot, [], outDir);
    const rendered = [...readFileSync(reportPath, "utf8").matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    assert.ok(rendered.length > 0, "report.write_report's section headings are extractable");

    await eachLanguage(templates, (doc, lang) => {
      const fence = doc.split("```markdown")[1];
      assert.ok(fence, `${lang}: the skeleton carries a markdown fence`);
      const sections = [...fence.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
      assert.deepEqual(sections, rendered, `${lang}: the skeleton and the .ts render name the same sections`);
    });
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

// Columns live in _render alone. A header row copied back into the skeleton is the drift
// this unit removed, so its absence is what gets held.
test("T-008 the skeleton names no table column of its own", () =>
  eachLanguage(templates, (doc, lang) => {
    const fence = doc.split("```markdown")[1] ?? "";
    const tableRows = fence.split("\n").filter((line) => line.trim().startsWith("|"));
    assert.deepEqual(tableRows, [], `${lang}: the skeleton carries no table row`);
  }));
