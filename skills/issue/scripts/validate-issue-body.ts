#!/usr/bin/env node
/// <reference types="node" />
// Usage: validate-issue-body.ts <template-file> <title> <body-file>
//        validate-issue-body.ts --content-only <body-file>
//
// --content-only runs the checks that need no skeleton. The number route edits an issue filed
// against a template nobody recorded, so those are all it can run.
//
// stdout: JSON { errors, warnings, checks }
// exit: 0 if no errors (warnings allowed), 1 if errors
//
// TypeScript port of validate-issue-body.py. Contract: validate-issue-body.py's TYPE_PREFIX /
// FLOOR / FLOOR_ALIASES / ALLOWED_EXTRA / skeleton_text / skeleton_sections / form_sections /
// body_section_names / section_body / is_unfilled / placeholders_left / record_placeholders /
// report / content_only_report / main. Exercised by
// skills/issue/tests/validate-issue-body.test.ts. Python's snake_case names carry over as TS
// camelCase; FLOOR / FLOOR_ALIASES / ALLOWED_EXTRA stay upper-snake so U-005's
// skill-contract.test.js and slice/tests/contract.test.js can import the same identifiers
// instead of reading the source with a regex. Python's re.DOTALL/re.MULTILINE become the
// `[\s\S]` idiom / the `m` flag below; str.casefold() becomes toLowerCase() (the section names
// this validator compares are ASCII or Japanese, where the two do not diverge); Path.stem/
// .suffix become node:path's parse().name/.ext.
import { readFileSync } from "node:fs";
import { parse } from "node:path";
import { isMainModule } from "../../../workflows/_lib/entry-point.ts";

const USAGE =
  "Usage: validate-issue-body.ts <template-file> <title> <body-file>\n" +
  "       validate-issue-body.ts --content-only <body-file>";

const TYPE_PREFIX = /^\[([A-Za-z]+)\]/;
const HEADING = /^## (.+?)\s*$/gm;
// No 's' flag needed: '[\s\S]' already crosses newlines, matching Python's DOTALL without
// sharing global-flag lastIndex state with the replace-all variant built from it below.
const CODE_BLOCK = /```[^\n]*\n([\s\S]*?)```/;
const OPTIONAL_SUFFIX = /\s*\((?:optional|任意)\)\s*$/;
const FORM_SUFFIXES = [".yml", ".yaml"];
const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;
// The list marker and checkbox that open a line. What survives the strip is the content.
const MARKER = /^\s*(?:[-*]|\d+\.)?\s*(?:\[[ xX]\])?\s*/;
const PLACEHOLDER = /\{[^{}\n]+\}/g;
const PLACEHOLDER_ONLY = /^\{[^{}\n]+\}$/;

// The floor the skill keeps whatever the skeleton requires. A repository form states the web
// UI's minimum, which is thinner than what a filed issue has to carry: without this a feature
// issue passes with no acceptance criteria and a bug with no reproduction.
export const FLOOR: Record<string, readonly string[]> = {
  feature: ["Acceptance Criteria", "Testing Decisions"],
  bug: ["Steps to Reproduce", "Expected vs Actual"],
};
// A repository form names the floor sections in its own language. Each English floor name lists
// the labels that stand for the same section. Without this, a body passes only when it carries
// both the Japanese form's required section and the English floor.
export const FLOOR_ALIASES: Record<string, readonly string[]> = {
  "Steps to Reproduce": ["再現手順"],
  "Expected vs Actual": ["期待 / 実際"],
};
// Plan and Backlog candidates come with a transferred /think plan; Parent and Blocked by come
// from /slice, which wraps every skeleton it picks in the two. Faulting them for being absent
// from the skeleton would fail every body those two routes produce.
export const ALLOWED_EXTRA: ReadonlySet<string> = new Set([
  "Plan",
  "Backlog candidates",
  "Parent",
  "Blocked by",
]);

export interface ValidationResults {
  errors: string[];
  warnings: string[];
  checks: string[];
}

/** Replaces every fenced code block in `text` with the empty string. A separate global-flag
 * RegExp built from CODE_BLOCK's source, so a single-shot `.exec()` search elsewhere never
 * shares (and is never desynced by) this call's lastIndex state. */
function stripCodeBlocks(text: string): string {
  return text.replace(new RegExp(CODE_BLOCK.source, "g"), "");
}

/** The skeleton itself: the first code fence under "## Template".
 *
 * Reading up to the next heading is not available here: the skeleton itself is markdown full
 * of "## " headings inside the code fence, so that bound stops at the first of those instead of
 * at "## Guidelines". The code fence closes itself, so this locates the heading start only and
 * looks for the first fence after it.
 *
 * A file without "## Template" is a repository's own .github/ISSUE_TEMPLATE/<type>.md, whose
 * body is the skeleton as it stands. Without this branch no section is read and every heading
 * in a correct body is faulted as unknown_section.
 */
export function skeletonText(templateText: string): string {
  const headingMatch = /^## Template\s*$/m.exec(templateText);
  if (headingMatch === null) {
    return templateText.replace(FRONTMATTER, "");
  }
  const after = templateText.slice(headingMatch.index + headingMatch[0].length);
  const codeMatch = CODE_BLOCK.exec(after);
  return codeMatch ? codeMatch[1] : "";
}

/** (name, optional) pairs read from the skeleton. */
export function skeletonSections(templateText: string): Array<[string, boolean]> {
  const sections: Array<[string, boolean]> = [];
  for (const match of skeletonText(templateText).matchAll(HEADING)) {
    const name = match[1];
    const optional = OPTIONAL_SUFFIX.test(name);
    const bare = name.replace(OPTIONAL_SUFFIX, "");
    sections.push([bare, optional]);
  }
  return sections;
}

/** (name, optional) pairs read from a GitHub issue form's (.yml) body entries.
 *
 * The form turns each label into a heading when someone files through the web UI. Taking those
 * same labels as the skeleton for a CLI filing gives both routes the same sections. Only an
 * entry whose `validations.required` is true counts as required.
 *
 * No YAML parser ships with the standard library. An issue form's body is a flat `- type:`
 * sequence with no nesting, so splitting on that separator and reading each piece covers it.
 */
export function formSections(formText: string): Array<[string, boolean]> {
  const bodyStart = /^body:\s*$/m.exec(formText);
  if (bodyStart === null) return [];
  const entries = formText
    .slice(bodyStart.index + bodyStart[0].length)
    .split(/^\s*- type:\s*/m)
    .slice(1);
  const sections: Array<[string, boolean]> = [];
  for (const entry of entries) {
    if (entry.split("\n")[0].trim() === "markdown") continue;
    const labelMatch = /^\s*label:\s*(.+?)\s*$/m.exec(entry);
    if (labelMatch === null) continue;
    const name = labelMatch[1]
      .trim()
      .replace(/^["']+/, "")
      .replace(/["']+$/, "");
    const required = /^\s*required:\s*true\s*$/m.test(entry);
    sections.push([name, !required]);
  }
  return sections;
}

/** Section names in the body, counting nothing inside a code fence.
 *
 * The skeleton is read from inside a fence, but a `## ` fenced in the body is a quotation
 * rather than a section. Counting it turns a quotation the skeleton lacks into unknown_section
 * and fails a body that was right.
 */
export function bodySectionNames(bodyText: string): Set<string> {
  const outside = stripCodeBlocks(bodyText);
  const names = new Set<string>();
  for (const match of outside.matchAll(HEADING)) {
    names.add(match[1].replace(OPTIONAL_SUFFIX, ""));
  }
  return names;
}

/** The lines under `## <name>` in the body, up to the next h2 or the end. */
export function sectionBody(bodyText: string, name: string): string | null {
  const outside = stripCodeBlocks(bodyText);
  const matches = [...outside.matchAll(HEADING)];
  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    if (match[1].replace(OPTIONAL_SUFFIX, "") !== name) continue;
    const end = index + 1 < matches.length ? matches[index + 1].index : outside.length;
    return outside.slice(match.index + match[0].length, end);
  }
  return null;
}

/** Whether nothing but list markers, checkboxes, and TBD sits under a heading. */
export function isUnfilled(body: string): boolean {
  for (const line of body.split("\n")) {
    const content = line.replace(MARKER, "").trim();
    if (!content || content.toUpperCase() === "TBD") continue;
    return false;
  }
  return true;
}

/** The template prompts still sitting in the body.
 *
 * A line that is nothing but `{...}` once its marker comes off is unwritten wherever it came
 * from. Anything else has to match a prompt the skeleton itself carries, so a body naming a
 * JSON shape such as {status, findings} is not read as unwritten. A fenced block is quoted
 * sample text, so its braces stay out of the count.
 */
export function placeholdersLeft(bodyText: string, skeleton: string): string[] {
  const outside = stripCodeBlocks(bodyText);
  const left: string[] = [];
  for (const line of outside.split("\n")) {
    const content = line.replace(MARKER, "").trim();
    if (PLACEHOLDER_ONLY.test(content)) left.push(content);
  }
  const prompts = [...skeleton.matchAll(PLACEHOLDER)].map((m) => m[0]);
  const inBody = [...outside.matchAll(PLACEHOLDER)].map((m) => m[0]);
  for (const found of inBody) {
    if (prompts.includes(found) && !left.includes(found)) left.push(found);
  }
  return left;
}

/** Put the template prompts still left in the body into results. */
export function recordPlaceholders(
  bodyText: string,
  skeleton: string,
  results: ValidationResults,
): void {
  const left = placeholdersLeft(bodyText, skeleton);
  if (left.length > 0) {
    results.errors.push(`placeholder_left:${left.length} [${left[0]}]`);
  } else {
    results.checks.push("placeholder=none");
  }
}

/** Print the report and return the exit code: 1 when it carries an error, 0 otherwise. */
export function report(results: ValidationResults): number {
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
  return results.errors.length > 0 ? 1 : 0;
}

/** The number route's validation: the checks that run without a skeleton. */
export function contentOnlyReport(bodyPath: string): number {
  const results: ValidationResults = { errors: [], warnings: [], checks: [] };
  recordPlaceholders(readFileSync(bodyPath, "utf8"), "", results);
  return report(results);
}

export function main(argv: string[]): number {
  // The number route knows no skeleton, so it runs the checks that do not need one.
  if (argv.length > 1 && argv[0] === "--content-only") {
    return contentOnlyReport(argv[1]);
  }
  if (argv.length < 3) {
    process.stderr.write(`${USAGE}\n`);
    return 1;
  }
  const [templatePath, title, bodyPath] = argv;

  const templateText = readFileSync(templatePath, "utf8");
  const bodyText = readFileSync(bodyPath, "utf8");

  const results: ValidationResults = { errors: [], warnings: [], checks: [] };

  const titleMatch = TYPE_PREFIX.exec(title);
  const parsedTemplate = parse(templatePath);
  const templateType = parsedTemplate.name;
  if (titleMatch) {
    const titleType = titleMatch[1].toLowerCase();
    if (titleType !== templateType) {
      results.errors.push(`type_mismatch:title=${titleType} template=${templateType}`);
    } else {
      results.checks.push(`type_match:${titleType}=ok`);
    }
  } else {
    results.errors.push("type_mismatch:title has no bracketed type prefix");
  }

  const isForm = FORM_SUFFIXES.includes(parsedTemplate.ext);
  const ownTemplate = /^## Template\s*$/m.test(templateText);
  const sections = isForm ? formSections(templateText) : skeletonSections(templateText);
  // Zero sections is not an absence of requirements; it is a skeleton that could not be read.
  // Both the required and the unknown checks then pass over anything, so stop here instead.
  if (sections.length === 0) {
    results.errors.push(`unreadable_skeleton:${parsedTemplate.base}`);
  }
  const required = sections.filter(([, optional]) => !optional).map(([name]) => name);
  const present = bodySectionNames(bodyText);
  const known = new Set([...present, ...required].map((n) => n.toLowerCase()));
  for (const name of FLOOR[templateType] ?? []) {
    const names = [name, ...(FLOOR_ALIASES[name] ?? [])];
    if (!names.some((n) => known.has(n.toLowerCase()))) {
      required.push(name);
    }
  }
  for (const name of required) {
    if (present.has(name)) {
      results.checks.push(`section:${name}=ok`);
    } else {
      results.errors.push(`missing_section:${name}`);
    }
  }

  // A repository template states the web UI's minimum, so a CLI filing that adds sections to it
  // is not deviating. Only the skill's own templates are a closed set.
  if (isForm || !ownTemplate) {
    results.checks.push("unknown_section=skipped (repository template)");
  } else {
    const knownNames = new Set([...sections.map(([name]) => name), ...ALLOWED_EXTRA]);
    const extra = [...present].filter((name) => !knownNames.has(name)).sort();
    for (const name of extra) {
      results.errors.push(`unknown_section:${name}`);
    }
    if (extra.length === 0) {
      results.checks.push("unknown_section=none");
    }
  }

  recordPlaceholders(bodyText, isForm ? "" : skeletonText(templateText), results);

  const unfilled = required.filter(
    (name) => present.has(name) && isUnfilled(sectionBody(bodyText, name) ?? ""),
  );
  for (const name of unfilled) {
    results.errors.push(`unfilled_section:${name}`);
  }
  if (unfilled.length === 0) {
    results.checks.push("unfilled_section=none");
  }

  return report(results);
}

if (isMainModule(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
