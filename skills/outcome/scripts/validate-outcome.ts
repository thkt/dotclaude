#!/usr/bin/env node
/// <reference types="node" />
import { existsSync, readFileSync, statSync } from "node:fs";
import { isMainModule } from "../../_lib/entry-point.ts";

const USAGE =
  "Usage: validate-outcome.ts <outcome-file>\n\n" +
  "stdout: JSON { file, state, flow, errors, warnings, checks }\n" +
  "  state: absent | empty | ok\n" +
  "  flow:  generate | update\n" +
  "exit: 0 if no errors (warnings allowed), 1 if errors\n";

const REQUIRED_SECTIONS = ["Outcome state", "Behavior", "Non-goals", "Constraints"] as const;
const FILLED_SECTIONS = ["Behavior", "Non-goals", "Constraints"] as const;
const INDICATORS = ["Time", "Error rate", "Value"] as const;

const PLACEHOLDER_LINE = /^[ \t]*(\{[^{}\n]+\})[ \t]*$/gm;
const PLACEHOLDER_CELL = /\|[ \t]*(\{[^{}\n]+\})[ \t]*(?=\|)/g;

interface Results {
  errors: string[];
  warnings: string[];
  checks: string[];
}

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sectionBody(text: string, heading: string): string | null {
  const match = new RegExp(`^(#{2,3}) ${escapeRegExp(heading)}\\s*$`, "m").exec(text);
  if (!match) return null;
  const level = match[1].length;
  const rest = text.slice(match.index + match[0].length);
  const stop = new RegExp(`^#{1,${level}} `, "m").exec(rest);
  return stop ? rest.slice(0, stop.index) : rest;
}

function isUnfilled(body: string): boolean {
  for (const line of body.split("\n")) {
    const content = line.replace(/^\s*([-*]|\d+\.)\s*/, "").trim();
    if (content === "" || content.toUpperCase() === "TBD") continue;
    return false;
  }
  return true;
}

function placeholdersLeft(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_LINE)) found.push(match[1]);
  for (const match of text.matchAll(PLACEHOLDER_CELL)) found.push(match[1]);
  return found;
}

function checkIndicators(text: string, results: Results): void {
  const indicators = sectionBody(text, "Indicators");
  if (indicators === null) {
    results.checks.push("indicators=omitted");
    return;
  }
  for (const label of INDICATORS) {
    const found = new RegExp(`^\\|\\s*${escapeRegExp(label)}\\s*\\|`, "m").test(indicators);
    if (found) {
      results.checks.push(`indicator:${label}=ok`);
    } else {
      results.warnings.push(`missing_indicator:${label}`);
    }
  }
}

function report(target: string, state: string, results: Results): number {
  const payload = {
    file: target,
    state,
    flow: state === "ok" ? "update" : "generate",
    ...results,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  return results.errors.length > 0 ? 1 : 0;
}

export function main(argv: readonly string[]): number {
  if (argv.length < 1) {
    process.stderr.write(USAGE);
    return 1;
  }
  const target = argv[0];

  const results: Results = { errors: [], warnings: [], checks: [] };
  if (!existsSync(target) || !statSync(target).isFile()) {
    results.checks.push("file=absent");
    return report(target, "absent", results);
  }

  const text = readFileSync(target, "utf8");

  for (const section of REQUIRED_SECTIONS) {
    if (sectionBody(text, section) === null) {
      results.errors.push(`missing_section:${section}`);
    } else {
      results.checks.push(`section:${section}=ok`);
    }
  }

  const left = placeholdersLeft(text);
  if (left.length > 0) {
    results.errors.push(`placeholder_left:${left.length} [${left[0]}]`);
  } else {
    results.checks.push("placeholder=none");
  }

  const unfilled = FILLED_SECTIONS.filter((section) =>
    isUnfilled(sectionBody(text, section) ?? ""),
  );
  const behaviorUnfilled = unfilled.includes("Behavior");
  if (behaviorUnfilled) {
    results.checks.push("behavior=unfilled");
  }
  if (unfilled.length === FILLED_SECTIONS.length) {
    results.checks.push("all_sections=unfilled");
  }

  checkIndicators(text, results);

  return report(target, behaviorUnfilled ? "empty" : "ok", results);
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
