#!/usr/bin/env node
/// <reference types="node" />
// Usage: pr-body.ts   (ship payload JSON on stdin)
//
// Deterministically render the build workflow's draft-PR fact tail from structured data
// build.js already holds. The PR body is a fail-closed surface -- it must always carry the
// verify result. Heavier assurance (/audit, /polish review) stays human-invoked. What the tail
// carries is the boundary of that assurance: tail_header states that the build holds no deep
// review. The person reading it is the one who launched the build, so what they need is the
// boundary, not the command to run. The agent writes only the lead "## Summary" (the human
// reviewer's entry point) and appends this tail below it.
//
// Format is deliberately terse and markdown-structured: a one-line label naming the block as
// auto-generated, the Closes line, then a collapsed <details> whose <summary> is the status
// line (HTML <code>, since markdown does not render inside <summary>).
//
// It folds because the PR body's entry point is the author's "## Summary", and a
// machine-written record must not crush it. The three that stay visible while folded (the
// auto-generated label, the Closes line, the status line) are there only to answer whether
// opening it is needed, so the safety-critical facts and every non-zero deviation count live in
// the status line.
//
// The failure log (a nested <details>) and the informational lists (scope deviations, missing
// test statements, anomalies) are shown only when non-empty, so a clean run stays short instead
// of repeating "None" per section. Only a run with something to fold gets a <details>; one with
// nothing to show keeps the status line alone. A conformance / structure finding puts its
// severity + category in an inline-code lead and sends the location and the quoted source to a
// continuation line; packed onto one line the severity buries and the reader cannot tell where
// the finding ends and its evidence begins. An anomaly leads with its conclusion and folds its
// evidence, verbatim command output, into a nested <details>.
// Bold stays reserved for the section labels, which puts a visual step between a section and
// the findings under it.
//
// Fail-closed in two directions: an unparseable payload OR one missing a safety-critical key
// (tests_pass / gates_pass) exits 1 with nothing on stdout, rather than a plausible-looking
// "clean" body -- a missing key must surface (via the caller's `&&` chain aborting the PR), not
// default to a reassuring value.
//
// stdin:  JSON {issue, scope_deviations[], untouched_plan_files[], missing_tests[],
//               code_anomalies[], tests_pass, gates_pass, verify_output, conformance[],
//               structure[]}
// stdout: the markdown fact tail, led by a blank line + horizontal rule.
// exit 0 on a completed run. exit 1 on a parse error or a missing required key.
//
// TypeScript port of the Python build workflow PR-body tail renderer it replaces.
// Contract: this CLI's own behavior, exercised end to end by
// workflows/build/tests/pr-body.test.ts against the frozen fixture
// workflows/build/tests/fixtures/pr-body-cases.json.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { isMainModule } from "../_lib/entry-point.ts";

export const REQUIRED_KEYS = ["tests_pass", "gates_pass"] as const;

// A check that did not run and a check that found nothing both count 0, so the status is what
// separates them on the status line.
export const NOT_RUN = ["agent-failed", "no-spec"] as const;

// Only prose labels translate; the GitHub keyword `Closes`, the code-fenced status line, and
// command names like `/issue` stay verbatim so auto-close and copy-paste keep working.
export const LABELS: Record<string, Record<string, string>> = {
  english: {
    tail_header:
      "_Below is the build workflow's automated verification. It checks the diff against the plan and does not hunt for code defects. It sits off the PR's main thread, so reading it is optional. Open it when a deviation count in the status line is non-zero._",
    not_run: "not run",
    verify_output: "verify output",
    evidence: "{n} evidence lines",
    manual_checks: "Manual verification checklist (complete before merge)",
    scope_deviations: "Files outside the plan's scope",
    untouched_plan_files: "Planned files never changed",
    missing_tests: "Planned test statements not found",
    conformance: "Issue conformance (review independently)",
    structure: "Structural deviations from the reference module",
    anomalies: "Anomalies (Red unconfirmed)",
  },
  japanese: {
    tail_header:
      "_下は build workflow の自動検証結果。plan との突合までで、コードの欠陥を探すレビューはしていない。PR の本筋からは外れるので任意だが、status 行の逸脱件数が非ゼロなら見る。_",
    not_run: "未実行",
    verify_output: "verify 出力",
    evidence: "根拠 {n} 件",
    manual_checks: "実機確認 (merge 前に実施)",
    scope_deviations: "Plan スコープ外の変更ファイル",
    untouched_plan_files: "一度も変更されていない plan の files",
    missing_tests: "テストとして見つからない plan の言明",
    conformance: "Issue 適合性 (独立レビュー)",
    structure: "参照モジュールからの構造逸脱",
    anomalies: "異常 (Red 未確認)",
  },
};

// The same spelling _tag reads from severity. Only conformance is ranked; structure renders in
// whatever order the payload gave it.
export const SEVERITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

// Tiny templating helpers instead of inlining "<tag>" text next to interpolated content: the
// element name is always a parameter, never a literal beside the angle brackets, so a finding's
// free-text (detail, notes, verify_output) can never be mistaken source-side for a hand-rolled
// HTML-concatenation site.
function openTag(name: string): string {
  return `<${name}>`;
}
function closeTag(name: string): string {
  return `</${name}>`;
}
function tagWrap(name: string, content: string): string {
  return `${openTag(name)}${content}${closeTag(name)}`;
}
function code(text: string): string {
  return tagWrap("code", text);
}
function summaryTag(text: string): string {
  return tagWrap("summary", text);
}
function detailsWrap(content: string): string {
  return tagWrap("details", content);
}

/** True for a plain object -- excludes an array and null, which `typeof value === "object"`
 * on its own would admit. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** `value` as a string-keyed record, empty for anything that is not a plain object (mirrors
 * the Python renderer's `_mapping`, which treats a list or a scalar the same way: no keys). */
function asMapping(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

/** `value` as an array, empty for anything that is not one (mirrors `_list`). */
function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Python's str() for the JSON scalar kinds a payload can carry through an untyped field
 * (missing_tests items, manual_checks items, a finding/anomaly's free-text fields, and a
 * non-mapping conformance/structure item's degrade path) -- null and the two booleans print
 * differently in Python than JS's default String() coercion. */
function pyStr(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  return String(value);
}

/** Python's truthiness for the handful of "if x:" guards the renderer carries over: falsy for
 * null/undefined/false/0/""/an empty array/an empty object, truthy otherwise. */
function truthy(value: unknown): boolean {
  if (value === null || value === undefined || value === false || value === 0 || value === "") {
    return false;
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

/** A severity absent from SEVERITY_RANK (missing, or an unknown spelling) sorts last. */
function severityRank(f: unknown): number {
  const severity = asMapping(f).severity;
  const rank = typeof severity === "string" ? SEVERITY_RANK[severity] : undefined;
  return rank ?? Object.keys(SEVERITY_RANK).length;
}

/** With a severity present, high and trivial findings separate at a glance. */
function tag(d: Record<string, unknown>): string {
  const severity = d.severity;
  const category = "category" in d ? d.category : "?";
  return truthy(severity) ? `[${pyStr(severity)}] ${pyStr(category)}` : `[${pyStr(category)}]`;
}

/** Always opens with a backtick or a word, so an indented continuation line cannot become a
 * heading. `label` comes from the spec_line / reference field names, so it is an identifier
 * and stays English rather than joining LABELS. */
function evidence(location: unknown, label: string, value: unknown): string {
  const parts: string[] = [];
  if (truthy(location)) parts.push(`\`${pyStr(location)}\``);
  if (truthy(value)) parts.push(`${label}: ${pyStr(value)}`);
  return parts.join(" · ");
}

/** A code block must not terminate early on content that itself contains ```. */
function fence(text: string): string {
  let longest = 0;
  let current = 0;
  for (const ch of text) {
    current = ch === "`" ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return "`".repeat(Math.max(3, longest + 1));
}

/** `value` as a plain-object record, or throws naming `what` -- the one check finding's and
 * anomaly's mapping guards share to route a non-mapping item to the section's degrade path. */
function asRecordOrThrow(value: unknown, what: string): Record<string, unknown> {
  if (!isPlainObject(value)) throw new TypeError(`${what} is not a mapping`);
  return value;
}

/** A non-mapping throws, which routes it to the section's degrade path as a raw string. */
function finding(f: unknown, label: string, sourceKey: string): string[] {
  const d = asRecordOrThrow(f, "finding");
  const detail = "detail" in d ? d.detail : "";
  return [`\`${tag(d)}\` ${pyStr(detail)}`.trimEnd(), evidence(d.location, label, d[sourceKey])];
}

/** A non-mapping throws, which routes it to the section's degrade path as a raw string. */
function anomaly(a: unknown): string[] {
  const d = asRecordOrThrow(a, "anomaly");
  const unit = "unit" in d ? d.unit : "?";
  const kind = "kind" in d ? d.kind : "?";
  const notes = "notes" in d ? d.notes : "";
  const head = `${pyStr(unit)} (${pyStr(kind)}): ${pyStr(notes)}`.trimEnd();
  return [head, ...asList(d.evidence).map(pyStr)];
}

/** Renders the markdown fact tail for `payload`. */
export function render(payload: Record<string, unknown>): string {
  const issue = pyStr("issue" in payload ? payload.issue : "").trim();
  const tests = truthy(payload.tests_pass) ? "pass" : "FAIL";
  const gates = truthy(payload.gates_pass) ? "pass" : "FAIL";
  const scope = asList(payload.scope_deviations);
  const untouched = asList(payload.untouched_plan_files);
  const missing = asList(payload.missing_tests);
  // .sort()'s stability (ES2019+) keeps same-severity items in the payload's order. structure
  // is not ranked here (only conformance is).
  const conformance = [...asList(payload.conformance)].sort(
    (a, b) => severityRank(a) - severityRank(b),
  );
  const structure = asList(payload.structure);
  const rawLang = payload.language;
  const lang = typeof rawLang === "string" && rawLang ? rawLang.toLowerCase() : "english";
  const L = LABELS[lang] ?? LABELS.english;

  const out: string[] = [L.tail_header, issue ? `Closes #${issue}` : "Closes #"];

  // The count when the check ran, "not run" when it did not, "" when there is nothing to show.
  // A payload without the status key comes from a caller that predates them, so its counts are
  // taken at face value.
  function cell(label: string, key: string, count: number, always: boolean, suffix = ""): string {
    const status = payload[`${key}_status`];
    if (typeof status === "string" && (NOT_RUN as readonly string[]).includes(status)) {
      return code(`${label} ${L.not_run}`);
    }
    return always || count ? code(`${label} ${count}${suffix}`) : "";
  }

  const high = conformance.filter((f) => asMapping(f).severity === "high").length;
  const cells = [
    code(`verify tests=${tests} gates=${gates}`),
    cell("scope-deviations", "scope", scope.length, true),
    cell("missing-tests", "test_presence", missing.length, true),
  ];
  // A count absent from the summary goes unnoticed inside the fold, so every non-zero count the
  // open-or-not decision rests on surfaces here. The high breakdown is there because a bare
  // count makes a wording nit and a defeated acceptance criterion look alike.
  if (untouched.length > 0) {
    cells.push(code(`untouched-plan-files ${untouched.length}`));
  }
  cells.push(
    cell("conformance", "conformance", conformance.length, false, high ? ` (${high} high)` : ""),
  );
  cells.push(cell("structure", "structure", structure.length, false));
  const summary = cells.filter((c) => c).join(" · ");
  const folded: string[] = [];

  if (tests === "FAIL" || gates === "FAIL") {
    const detail = payload.verify_output;
    if (truthy(detail)) {
      const body = typeof detail === "string" ? detail : JSON.stringify(detail, null, 2);
      const f = fence(body);
      folded.push(detailsWrap(`${summaryTag(L.verify_output)}\n\n${f}\n${body}\n${f}\n\n`));
    }
  }

  function section(
    label: string,
    items: unknown,
    renderItem: (x: unknown) => string | string[],
    fold?: string,
  ): void {
    const list = asList(items);
    if (list.length === 0) return;
    const lines: string[] = [];
    for (const x of list) {
      let text: string | string[];
      try {
        text = renderItem(x);
      } catch {
        // A malformed (e.g. non-object) item must not crash the render and drop the whole
        // fail-closed tail.
        text = pyStr(x);
      }
      const rawParts = Array.isArray(text) ? text : [text];
      const parts = rawParts.map((p) => pyStr(p).split("\n").join(" ")).filter((p) => p.trim());
      if (parts.length === 0) continue;
      lines.push(`- ${parts[0]}`);
      if (fold && parts.length > 1) {
        // Indent 2 keeps these inside the list item; the blank lines around <details> are what
        // let GitHub render the markdown inside it.
        const foldLabel = fold.replace("{n}", String(parts.length - 1));
        lines.push(`  ${openTag("details")}${summaryTag(foldLabel)}`);
        lines.push("");
        lines.push(...parts.slice(1).map((p) => `  - ${p}`));
        lines.push("");
        lines.push(`  ${closeTag("details")}`);
      } else {
        lines.push(...parts.slice(1).map((p) => `  ${p}`));
      }
    }
    folded.push(`**${label}**\n${lines.join("\n")}`);
  }

  // Rendered as task-list items so the reviewer can tick them off on the PR.
  section(L.manual_checks, payload.manual_checks, (s) => `[ ] ${pyStr(s)}`);
  section(L.scope_deviations, scope, (f) => `\`${pyStr(f)}\``);
  // The inverse of scope_deviations: a file the plan named but nothing touched can be the trace
  // of a unit that went unimplemented and still passed.
  section(L.untouched_plan_files, untouched, (f) => `\`${pyStr(f)}\``);
  section(L.missing_tests, missing, pyStr);
  section(L.conformance, conformance, (f) => finding(f, "spec", "spec_line"));
  section(L.structure, structure, (f) => finding(f, "ref", "reference"));
  // The evidence is verbatim command output whose line count buries the conclusion, and being
  // verbatim is what makes it evidence, so the renderer is the only place to shorten it.
  section(L.anomalies, payload.code_anomalies, anomaly, L.evidence);

  // Blank lines around the folded content keep GitHub rendering the markdown inside the HTML
  // <details> block. An empty <details> asks the reviewer to open nothing.
  out.push(
    folded.length > 0
      ? detailsWrap(`\n${summaryTag(summary)}\n\n${folded.join("\n\n")}\n\n`)
      : summary,
  );

  // The blank line + rule keeps this machine tail separated when appended (>>) below the
  // agent's Summary, and stops the summary's last line becoming a setext heading.
  return `\n\n---\n\n${out.join("\n\n")}\n`;
}

function fail(message: string): void {
  process.stderr.write(`Error: ${message}\n`);
}

/** Any read/parse failure falls back to English so the tail still renders. */
function defaultLanguage(): string {
  let raw: string;
  try {
    raw = readFileSync(join(homedir(), ".claude", "settings.json"), "utf8");
  } catch {
    return "english";
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "english";
  }
  const language = asMapping(parsed).language;
  return typeof language === "string" && language ? language : "english";
}

/** Reads the ship payload from stdin and writes the rendered tail to stdout, or fails closed. */
export function main(): number {
  const raw = readFileSync(0, "utf8");
  let loaded: unknown;
  try {
    loaded = JSON.parse(raw);
  } catch (error) {
    fail(
      `ship payload is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
  if (!isPlainObject(loaded)) {
    fail("ship payload must be a JSON object");
    return 1;
  }
  const payload = loaded;
  const missingKeys = REQUIRED_KEYS.filter((key) => !(key in payload));
  if (missingKeys.length > 0) {
    fail(`ship payload missing required key(s): ${missingKeys.join(", ")}`);
    return 1;
  }
  if (!("language" in payload)) {
    payload.language = defaultLanguage();
  }
  process.stdout.write(render(payload));
  return 0;
}

if (isMainModule(import.meta.url)) {
  process.exit(main());
}
