#!/usr/bin/env node
/// <reference types="node" />
// Usage: validate-dr.ts <dr-file>
//
// stdout: JSON { file, errors, warnings, checks }
// exit: 0 if no errors (warnings allowed), 1 if errors
//
// TypeScript port of validate-dr.py, in the header/entry shape skills/_lib/harness_hash.ts,
// skills/dr/scripts/dr_common.ts, and skills/dr/scripts/pre-check.ts already use: a plain
// shebang + reference-types + Usage header, named exports for the pieces a test can drive
// directly, and the CLI's own process.exit(main()) guarded by workflows/_lib/entry-point.ts's
// isMainModule so importing this module for its exports never runs the CLI as a side effect.
//
// Contract: skills/dr/scripts/validate-dr.py's REQUIRED_SECTIONS, RECOMMENDED_SECTIONS,
// STATUS_VALUES, count_options, lint_check, and main. REQUIRED_SECTIONS/RECOMMENDED_SECTIONS/
// STATUS_VALUES are exported for skills/dr/tests/script-contract.test.js (U-008) to import.
// Exercised by skills/dr/tests/validate-dr.test.ts.
import { accessSync, constants, existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail, splitFrontmatter } from "./dr_common.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

// Confirmation is an h3 under Decision Outcome; the others are h2. Section detection allows
// either level so a valid h3 Confirmation is not flagged missing.
export const REQUIRED_SECTIONS = [
  "Context and Problem Statement",
  "Considered Options",
  "Decision Outcome",
  "Confirmation",
] as const;

// A remove-or-merge proposal reads this section to judge, so a DR without it leaves that
// judgment nothing to read. madr-format files it as recommended, so this warns rather than
// errors.
export const RECOMMENDED_SECTIONS = ["Reassessment Triggers"] as const;

// update-index.ts buckets By Status with status.startsWith(), so a value outside the lifecycle
// lands in no section and drops out of the index. The drop is invisible, so this errors.
// Anchored ^(?:...)$ the same way validate-dr.py's re.compile(...).fullmatch() requires the
// whole value to match, not merely contain, one of the alternatives.
export const STATUS_VALUES: RegExp =
  /^(?:proposed|accepted|rejected|deprecated|superseded by DR-\d{4})$/;

/** validate-dr.py's count_options: bullets or numbered items directly under the Considered
 * Options heading. A heading of the same or shallower depth ends the count; a deeper heading
 * is a subsection of Considered Options, so its bullets still count. */
export function countOptions(lines: readonly string[]): number {
  let depth = 0;
  let count = 0;
  for (const line of lines) {
    // Matching h2 alone reports zero options for a heading the section check calls present.
    const opening = /^(#{2,3}) Considered Options\s*$/.exec(line);
    if (opening) {
      depth = opening[1].length;
      continue;
    }
    if (!depth) continue;
    const heading = /^(#+) /.exec(line);
    if (heading && heading[1].length <= depth) break;
    if (/^\s*([-*]|\d+\.)\s/.test(line)) count += 1;
  }
  return count;
}

/** shutil.which("markdownlint-cli2"): true when a directory on PATH carries an executable
 * file of that name -- checked with accessSync's X_OK rather than spawning a subprocess per
 * PATH entry. */
function which(command: string): boolean {
  const dirs = (process.env.PATH ?? "").split(":").filter((dir) => dir !== "");
  for (const dir of dirs) {
    try {
      accessSync(join(dir, command), constants.X_OK);
      return true;
    } catch {
      // not in this PATH entry -- keep looking
    }
  }
  return false;
}

/** validate-dr.py's lint_check: ('checks' | 'warnings', message) from markdownlint-cli2, if
 * installed on PATH. Absent, this returns the skipped message rather than running anything. */
export function lintCheck(path: string): ["checks" | "warnings", string] {
  if (!which("markdownlint-cli2")) {
    return ["checks", "markdown_lint=skipped (markdownlint-cli2 not installed)"];
  }
  const config = [process.env.MARKDOWNLINT_CONFIG, ".markdownlint.json"].find(
    (candidate) => candidate && existsSync(candidate),
  );
  const args = [...(config ? ["--config", config] : []), path];
  const result = spawnSync("markdownlint-cli2", args, { encoding: "utf8" });
  if (result.status === 0) {
    return ["checks", "markdown_lint=ok"];
  }
  return ["warnings", "markdown_lint=issues (run markdownlint-cli2 for details)"];
}

/** validate-dr.py's main: reads argv[0] as a dr-file path, prints the validation JSON
 * (indent 2), and exits 1 only when results.errors is non-empty. */
export function main(argv: string[]): number {
  const drFile = argv[0] ?? "";
  if (!drFile || !existsSync(drFile)) {
    fail(`Error: file not found: ${drFile}`);
  }

  const text = readFileSync(drFile, "utf8");
  const lines = text.split("\n");
  const results: { errors: string[]; warnings: string[]; checks: string[] } = {
    errors: [],
    warnings: [],
    checks: [],
  };

  for (const section of [...REQUIRED_SECTIONS, ...RECOMMENDED_SECTIONS]) {
    const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const found = new RegExp(`^#{2,3} ${escaped}\\s*$`, "m").test(text);
    if (found) {
      results.checks.push(`section:${section}=ok`);
    } else if ((REQUIRED_SECTIONS as readonly string[]).includes(section)) {
      results.errors.push(`missing_section:${section}`);
    } else {
      results.warnings.push(`missing_section:${section} (recommended)`);
    }
  }

  // MADR v4 frontmatter: status and date are optional but recommended
  const [frontmatter] = splitFrontmatter(text);
  if (frontmatter.length > 0) {
    results.checks.push("frontmatter=present");
    for (const meta of ["status", "date"]) {
      const raw = frontmatter.find((line) => line.startsWith(`${meta}:`));
      if (raw !== undefined) {
        results.checks.push(`metadata:${meta}=ok [${raw}]`);
        const value = raw.split(":").slice(1).join(":").trim().replace(/^"|"$/g, "");
        if (meta === "status" && !STATUS_VALUES.test(value)) {
          results.errors.push(`invalid_status:${value}`);
        }
      } else {
        results.warnings.push(`missing_metadata:${meta} (recommended in MADR v4 frontmatter)`);
      }
    }
  } else {
    results.warnings.push(
      "missing_frontmatter (MADR v4 supports optional YAML frontmatter" +
        " for status/date/decision-makers)",
    );
  }

  const optionsCount = countOptions(lines);
  if (optionsCount >= 2) {
    results.checks.push(`options_count=${optionsCount}`);
  } else if (optionsCount === 1) {
    results.warnings.push("options_count=1 (recommended: 2+)");
  } else {
    results.errors.push("options_count=0");
  }

  if (lines.some((line) => line.startsWith("# "))) {
    results.checks.push("title_heading=ok");
  } else {
    results.errors.push("title_heading=missing");
  }

  const [kind, message] = lintCheck(drFile);
  results[kind].push(message);

  process.stdout.write(`${JSON.stringify({ file: basename(drFile), ...results }, null, 2)}\n`);
  return results.errors.length > 0 ? 1 : 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
