#!/usr/bin/env node
/// <reference types="node" />
import { accessSync, constants, existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fail, splitFrontmatter } from "./dr_common.ts";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

export const REQUIRED_SECTIONS = [
  "Context and Problem Statement",
  "Considered Options",
  "Decision Outcome",
  "Confirmation",
] as const;

export const RECOMMENDED_SECTIONS = ["Reassessment Triggers"] as const;

export const STATUS_VALUES: RegExp =
  /^(?:proposed|accepted|rejected|deprecated|superseded by DR-\d{4})$/;

interface Results {
  errors: string[];
  warnings: string[];
  checks: string[];
}

export function countOptions(lines: readonly string[]): number {
  let depth = 0;
  let count = 0;
  for (const line of lines) {
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

function which(command: string): boolean {
  const dirs = (process.env.PATH ?? "").split(":").filter((dir) => dir !== "");
  for (const dir of dirs) {
    try {
      accessSync(join(dir, command), constants.X_OK);
      return true;
    } catch {
    }
  }
  return false;
}

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

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function checkSections(text: string, results: Results): void {
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
}

function checkFrontmatter(text: string, results: Results): void {
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
}

function checkOptions(lines: readonly string[], results: Results): void {
  const optionsCount = countOptions(lines);
  if (optionsCount >= 2) {
    results.checks.push(`options_count=${optionsCount}`);
  } else if (optionsCount === 1) {
    results.warnings.push("options_count=1 (recommended: 2+)");
  } else {
    results.errors.push("options_count=0");
  }
}

export function main(argv: string[]): number {
  const drFile = argv[0] ?? "";
  if (!isFile(drFile)) {
    fail(`Error: file not found: ${drFile}`);
  }

  const text = readFileSync(drFile, "utf8");
  const lines = text.split("\n");
  const results: Results = { errors: [], warnings: [], checks: [] };

  checkSections(text, results);
  checkFrontmatter(text, results);
  checkOptions(lines, results);

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
