#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PreToolUse hook: match a gh issue create body against the skeleton its title's type points
// at, and stop the filing when the two diverge. TypeScript side of the retired Python original (unit
// U-002, following U-001's skeleton-selection primitives). ROOT / VALIDATOR / TEMPLATES /
// _issue_type / _template / _errors / main carry the Python side's names and shapes; the
// runtime the validator runs under comes from hooks/_lib/executable.ts's tsRuntime.
//
// _unmatched_type_reason is not a Python-side name: it extracts the deny message
// the retired Python original's main() builds inline (the f-string after `if template is None`) into its
// own function, so unit U-001's tests could hold that wording to the contract's "deny の文言は1
// 文字も変えない" before this unit added main() and wired deny() to it. Its output stays
// byte-identical to that inline string; only the placement is factored out.
//
// main() ends in an unguarded process.exit(main()) (DR-0114, no isMainModule guard), so an
// in-process import would exit the test runner's own process the moment the import ran -- the
// same hazard hooks/pre-bash/tests/body-proofread-notify.test.ts avoids. This unit's own
// hooks/pre-bash/tests/issue-body-gate-validator.test.ts spawns this file through
// hooks/_lib/tests/_hook-harness.ts's run() for that reason, and this unit converts unit
// U-001's hooks/pre-bash/tests/issue-body-gate-template.test.ts to the same spawn shape --
// the conversion hooks/pre-bash/tests/body-proofread-target.test.ts made once
// hooks/pre-bash/body_proofread.ts grew a main() of its own.
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as ghFiling from "../_lib/gh_filing.ts";
import { tsRuntime } from "../_lib/executable.ts";
import { deny, field, parse } from "../_lib/hook_payload.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

// hooks/pre-bash/issue_body_gate.ts -> hooks/pre-bash -> hooks -> repo root, the same two
// levels the retired Python original's Path(__file__).resolve().parents[2] climbs.
export const ROOT: string = join(HERE, "..", "..");
export const VALIDATOR: string = join(ROOT, "skills", "issue", "scripts", "validate-issue-body.ts");
export const TEMPLATES: string = join(ROOT, "skills", "issue", "templates");

/** The lowercased type prefix, or null when the title does not open with one
 * (the retired Python original's _issue_type).
 *
 * `\p{L}` rather than `[A-Za-z]`: Python's `str.isalpha()` accepts any Unicode letter, not
 * ASCII alone, and this mirrors that rather than narrowing it. */
export function _issue_type(title: string): string | null {
  if (!title.startsWith("[") || !title.includes("]")) {
    return null;
  }
  const name = title.slice(1, title.indexOf("]"));
  return /^\p{L}+$/u.test(name) ? name.toLowerCase() : null;
}

function _isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The repository's own template wins over the skill's: that is what the web UI files against
 * (the retired Python original's _template). */
export function _template(issueType: string, repoDir: string): string | null {
  const forms = join(repoDir, ".github", "ISSUE_TEMPLATE");
  const candidates = [
    join(forms, `${issueType}.yml`),
    join(forms, `${issueType}.yaml`),
    join(forms, `${issueType}.md`),
    join(TEMPLATES, `${issueType}.md`),
  ];
  for (const candidate of candidates) {
    if (_isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

/** The deny wording for a type with no template on either path (the retired Python original's main(),
 * the branch taken when _template returns None). Byte-identical to that inline f-string; see
 * this module's header for why it is factored out here. */
export function _unmatched_type_reason(issueType: string): string {
  const known = readdirSync(TEMPLATES)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length))
    .sort()
    .join(", ");
  const choices = known ? `型を ${known} のいずれかにするか、` : "";
  return (
    `issue-body-template: 型 [${issueType}] に対応する骨格が .github/ISSUE_TEMPLATE/ にも ` +
    `skills/issue/templates/ にも無く本文を照合できない。${choices}` +
    `skills/issue/templates/${issueType}.md を足す`
  );
}

/** The validator's findings, or null when it did not report any (the retired Python original's
 * _errors). It exits 1 both for a rejected body and for its own crash, so the JSON on stdout
 * is what separates them. stderr stays unredirected so a traceback reaches the debug log. */
export function _errors(
  interpreter: string,
  template: string,
  title: string,
  bodyFile: string,
): string[] | null {
  const result = spawnSync(interpreter, [VALIDATOR, template, title, bodyFile], {
    encoding: "utf8",
  });
  const reported = field(parse(result.stdout ?? ""), "errors");
  if (!Array.isArray(reported)) {
    return null;
  }
  return reported.map((entry) => String(entry));
}

function main(): number {
  const raw = readFileSync(0, "utf8");
  // Cheaper than a parse on a hook that fires for every Bash call. The scan below decides
  // whether this really is a filing; this only keeps the work off everything else.
  if (!['"tool_name":"Bash"', "gh", "issue", "create"].every((word) => raw.includes(word))) {
    return 0;
  }

  const command = field(parse(raw).tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }

  let filing: ghFiling.Filing | null;
  try {
    filing = ghFiling.find(command, "issue");
  } catch {
    deny(
      "issue-body-template: 引用符が閉じておらずコマンドを分割できず、どの断片が起票かを決められない。引用符を閉じて再試行する",
    );
    return 0;
  }
  if (filing === null) {
    return 0;
  }

  const title = ghFiling.flag(filing, ghFiling.TITLE_FLAGS);
  const issueType = title ? _issue_type(title) : null;
  if (title === null || issueType === null) {
    deny(
      "issue-body-template: タイトルに型プレフィックス ([Bug] 等) が無く、どの骨格と照合するかを決められない。タイトルを型で始める",
    );
    return 0;
  }

  const path = ghFiling.body_file(filing);
  if (path === null) {
    deny(
      "issue-body-template: 本文が --body のインライン指定で骨格と照合できない。本文を一時ファイルへ書き --body-file にリテラルの絶対パスで渡す",
    );
    return 0;
  }

  // A hook carries none of the shell state the command will run under, so a path written as
  // `"$B"` or `$TMPDIR/body.md` arrives unexpanded and names nothing on disk.
  if (!_isFile(path)) {
    deny(
      `issue-body-template: --body-file の指す先 (${path}) が読めず本文を照合できない。パスを変数でなくリテラルの絶対パスで書く`,
    );
    return 0;
  }

  const template = _template(issueType, filing.directory);
  if (template === null) {
    deny(_unmatched_type_reason(issueType));
    return 0;
  }

  const interpreter = tsRuntime();
  if (interpreter === null) {
    deny(
      "issue-body-template: bun も node も見つからず validator " +
        `(${VALIDATOR}) を起動できない。CLAUDE_BUN_BIN を設定するか PATH に node を通す`,
    );
    return 0;
  }

  const errors = _errors(interpreter, template, title, path);
  if (errors === null) {
    deny(
      `issue-body-template: validator (${VALIDATOR}) が errors 配列を返さず本文を照合できない。bun か node で直接実行して出力を確かめる`,
    );
    return 0;
  }
  if (errors.length > 0) {
    deny(`issue-body-template: 本文の節構成が骨格と食い違う (${errors.join("; ")})`);
  }
  return 0;
}

process.exit(main());
