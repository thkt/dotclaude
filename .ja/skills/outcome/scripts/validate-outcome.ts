#!/usr/bin/env node
/// <reference types="node" />
// Usage: validate-outcome.ts <outcome-file>
//
// stdout: JSON { file, state, flow, errors, warnings, checks }
//   state: absent | empty | ok
//   flow:  generate | update
// exit: 0 if no errors (warnings allowed), 1 if errors
//
// validate-outcome.py の TypeScript 移植。skills/_lib/harness_hash.ts 自身の header と
// isMainModule(import.meta.url) という entry point の形をそのまま踏襲する。
// validate-outcome.py の REQUIRED_SECTIONS / FILLED_SECTIONS / INDICATORS /
// PLACEHOLDER_LINE / PLACEHOLDER_CELL / section_body / is_unfilled / report / main を
// node:* のみで移植する。
//
// Contract: skills/outcome/scripts/validate-outcome.py。
// skills/outcome/tests/validate-outcome.test.ts が検証し、
// skills/outcome/tests/fixtures/validate-outcome-cases.json (U-001) から再生する。
import { existsSync, readFileSync, statSync } from "node:fs";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const USAGE =
  "Usage: validate-outcome.ts <outcome-file>\n\n" +
  "stdout: JSON { file, state, flow, errors, warnings, checks }\n" +
  "  state: absent | empty | ok\n" +
  "  flow:  generate | update\n" +
  "exit: 0 if no errors (warnings allowed), 1 if errors\n";

const REQUIRED_SECTIONS = ["Outcome state", "Behavior", "Non-goals", "Constraints"] as const;
const FILLED_SECTIONS = ["Behavior", "Non-goals", "Constraints"] as const;
const INDICATORS = ["Time", "Error rate", "Value"] as const;

// テンプレートの穴埋めは {...} の形で、行全体か表セル全体を占める。位置を問わず
// brace に一致させると、{status, findings} のような JSON の形を書いた Behavior まで拾う。
const PLACEHOLDER_LINE = /^[ \t]*(\{[^{}\n]+\})[ \t]*$/gm;
const PLACEHOLDER_CELL = /\|[ \t]*(\{[^{}\n]+\})[ \t]*(?=\|)/g;

interface Results {
  errors: string[];
  warnings: string[];
  checks: string[];
}

// heading を RegExp のソース文字列へ埋め込むための、Python の re.escape(heading) 相当。
function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** `heading` 配下のテキストを、同レベル以上の次の heading まで返す。 */
function sectionBody(text: string, heading: string): string | null {
  const match = new RegExp(`^(#{2,3}) ${escapeRegExp(heading)}\\s*$`, "m").exec(text);
  if (!match) return null;
  const level = match[1].length;
  const rest = text.slice(match.index + match[0].length);
  const stop = new RegExp(`^#{1,${level}} `, "m").exec(rest);
  return stop ? rest.slice(0, stop.index) : rest;
}

/** 見出しの下に箇条書き記号と TBD しか無いとき true。 */
function isUnfilled(body: string): boolean {
  for (const line of body.split("\n")) {
    const content = line.replace(/^\s*([-*]|\d+\.)\s*/, "").trim();
    if (content === "" || content.toUpperCase() === "TBD") continue;
    return false;
  }
  return true;
}

/** 行全体または表セル全体を占める {...} の穴埋めを、出現順ですべて返す。 */
function placeholdersLeft(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER_LINE)) found.push(match[1]);
  for (const match of text.matchAll(PLACEHOLDER_CELL)) found.push(match[1]);
  return found;
}

/** 報告を出力し、終了コードを返す。errors があれば 1、無ければ 0。 */
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

  const indicators = sectionBody(text, "Indicators");
  if (indicators === null) {
    results.checks.push("indicators=omitted");
  } else {
    for (const label of INDICATORS) {
      const found = new RegExp(`^\\|\\s*${escapeRegExp(label)}\\s*\\|`, "m").test(indicators);
      if (found) {
        results.checks.push(`indicator:${label}=ok`);
      } else {
        results.warnings.push(`missing_indicator:${label}`);
      }
    }
  }

  return report(target, behaviorUnfilled ? "empty" : "ok", results);
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
