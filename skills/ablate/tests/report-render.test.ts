/// <reference types="node" />
// Behavior tests for skills/ablate/scripts/report.ts's write_report: the render pass over
// build_report's result and the UTC-timestamped file it writes. Companion to report.test.ts,
// which drives build_report's aggregation alone -- neither exercises the render/write half the
// Python version's own _render and write_report covered, which is this unit's contract (the
// Python version's write_report and its render pass, mirrored onto report.ts).
//
// T-476 reads the template's section order from skills/ablate/templates/report-template.md
// itself rather than a list copied into this file, the same "the skeleton and _render name the
// same sections" comparison ablate-form.test.js's T-007 already made against the Python
// version's source -- this test makes it against report.ts's actual rendered output instead.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as report from "../scripts/report.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = join(HERE, "..", "templates", "report-template.md");

/** The "## " section headings inside the template's fenced skeleton, in the order they appear
 * -- read fresh from the template file every run, so a section report.ts's render gains and
 * the skeleton picks up is what this test compares against, never a hand-typed list frozen at
 * the moment this test was written. */
function templateSections(): string[] {
  const doc = readFileSync(TEMPLATE_PATH, "utf8");
  const fence = doc.split("```markdown")[1];
  assert.ok(fence, "report-template.md carries a markdown fence");
  return [...fence.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
}

/** The "## " section headings a rendered report carries, in order. */
function renderedSections(content: string): string[] {
  return [...content.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
}

test("T-476 the rendered report carries the template's sections in the template's order, read from the template file", () => {
  const root = mkdtempSync(join(tmpdir(), "report-render-root-"));
  const outDir = mkdtempSync(join(tmpdir(), "report-render-out-"));
  try {
    const reportPath = report.write_report(root, [], outDir);
    const content = readFileSync(reportPath, "utf8");
    assert.deepEqual(renderedSections(content), templateSections());
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
});

test("T-477 write_report names its output with the UTC timestamp shape and writes under the directory it was given", () => {
  const root = mkdtempSync(join(tmpdir(), "report-render-root-"));
  const outDir = mkdtempSync(join(tmpdir(), "report-render-out-"));
  try {
    const reportPath = report.write_report(root, [], outDir);
    assert.equal(dirname(reportPath), outDir, "writes under the out_dir it was given");
    // The Python version's write_report named its file "<YYYY-MM-DD>-<HHMMSS>-ablate.md" in
    // UTC (REPORT_NAME="ablate") -- only the shape is asserted, never the exact digits, since
    // the timestamp is real time at write.
    assert.match(
      basename(reportPath),
      /^\d{4}-\d{2}-\d{2}-\d{6}-ablate\.md$/,
      "the filename carries the UTC YYYY-MM-DD-HHMMSS-ablate.md shape",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
});
