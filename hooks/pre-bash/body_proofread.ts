#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PreToolUse hook: proofread the body a gh filing or a commit is about to write. TypeScript
// side of the retired Python proofreader (unit U-007, following U-006's target-selection
// primitives). HEREDOC / Mode / FILING / COMMIT / COMMIT_INLINE / COMMIT_FILE / _target /
// _heredoc_body / _flag / _lint_section / _checklist / main carry the Python side's names and
// shapes.
//
// _lint_section inlines hooks/_lib/textlint.py's runner-detection and lint() logic rather than
// importing a hooks/_lib/textlint.ts counterpart: no such module exists yet, and this is its
// only TypeScript call site, so a shared module would sit unused by a second caller (YAGNI
// Boundary -- the abstraction gate opens once a second caller needs it). hooks/_lib/japanese.ts's
// hasJapanese is japanese.py's has_japanese ported; japanese.py itself stays in the tree until
// #644 retires its last Python caller.
//
// Advisory, same as the Python side: findings ride back as additionalContext and never stop
// the call.
//
// main() ends in an unguarded process.exit(main()) (DR-0114, no isMainModule guard), so an
// in-process import would exit the test runner's own process the moment the import ran -- the
// same hazard hooks/pre-bash/tests/client-identifier-gate.test.ts avoids by spawning the hook
// instead. Both hooks/pre-bash/tests/body-proofread-target.test.ts (converted alongside this
// unit) and this unit's hooks/pre-bash/tests/body-proofread-notify.test.ts spawn this file
// through hooks/_lib/tests/_hook-harness.ts's run() for that reason, rather than importing its
// exports directly the way body-proofread-target.test.ts did before main() existed.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as commandScan from "../_lib/command_scan.ts";
import * as ghFiling from "../_lib/gh_filing.ts";
import { field, notify, parse } from "../_lib/hook_payload.ts";
import { hasJapanese } from "../_lib/japanese.ts";

// hooks/_lib/textlint.py's REPO_ROOT / CONFIG, computed the same way shebang_scope.ts computes
// its own REPO: not $HOME/.claude, which names the installed harness alone, but two levels up
// from this file (hooks/pre-bash -> hooks -> the checkout root), so a checkout run from
// anywhere else still finds its own config.
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TEXTLINT_CONFIG = join(REPO_ROOT, ".textlintrc.json");

/** bun x, then npx -- the same order hooks/_lib/textlint.py's _runner tries, and null when
 * neither is on PATH. */
function _textlint_runner(): readonly [string, ...string[]] | null {
  if (spawnSync("which", ["bun"]).status === 0) {
    return ["bun", "x"];
  }
  if (spawnSync("which", ["npx"]).status === 0) {
    return ["npx"];
  }
  return null;
}

/** The findings textlint prints for `path`, empty when textlint found none or could not run
 * (no config, or no runner) -- the caller cannot tell the two apart, and neither leaves it
 * anything to report (the retired Python proofreader's textlint.lint). */
function _textlint_lint(path: string): string {
  try {
    if (!statSync(TEXTLINT_CONFIG).isFile()) {
      return "";
    }
  } catch {
    return "";
  }
  const runner = _textlint_runner();
  if (runner === null) {
    return "";
  }
  // cwd, not --config alone: textlint resolves its presets from the working directory and
  // exits 1 from anywhere without node_modules above it, config or no config. That same exit
  // code is how it reports findings, so the exit status stays unchecked and only stdout is read.
  const result = spawnSync(runner[0], [...runner.slice(1), "textlint", path, "--config", TEXTLINT_CONFIG], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  });
  return result.stdout ?? "";
}

/** A heredoc marker, quoted or bare (the retired Python proofreader's HEREDOC). */
export const HEREDOC = /<<-?\s*(['"]?)(\w+)\1/;

export interface Mode {
  readonly label: string;
  readonly threshold: number | null;
  readonly checklist: boolean;
}

export const FILING: Mode = { label: "body", threshold: null, checklist: true };
// The checklist asks about an issue's readers, which a commit message has none of.
export const COMMIT: Mode = { label: "commit message", threshold: 10, checklist: false };

// git commit spells these its own way, and `-F` names --file here where it names --body-file
// on a gh filing.
export const COMMIT_INLINE: readonly string[] = ["-m", "--message"];
export const COMMIT_FILE: readonly string[] = ["-F", "--file"];

/** The body of the first heredoc, or null when its marker never closes. */
export function _heredoc_body(text: string): string | null {
  const match = HEREDOC.exec(text);
  if (!match) {
    return null;
  }
  const lines = text.split("\n");
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].includes(match[0])) {
      continue;
    }
    const body: string[] = [];
    for (const following of lines.slice(index + 1)) {
      if (following.trim() === match[2]) {
        return body.join("\n");
      }
      body.push(following);
    }
  }
  return null;
}

/** The value the tokens carry under any of the given flag spellings. */
export function _flag(tokens: readonly string[], names: readonly string[]): string | null {
  for (const name of names) {
    const value = commandScan.flag_value(tokens, name);
    if (value) {
      return value;
    }
  }
  return null;
}

function _read(target: string): string | null {
  try {
    if (!statSync(target).isFile()) {
      return null;
    }
    return readFileSync(target, "utf8");
  } catch {
    return null;
  }
}

/** The body a gh filing is about to write. A filing names its body through a flag, so a
 * heredoc on the same line is writing some other file, and reading it would proofread that
 * file under the issue's name. */
function _filing_body(filing: ghFiling.Filing): string | null {
  const inline = ghFiling.flag(filing, ghFiling.BODY_FLAGS);
  if (inline !== null) {
    return inline;
  }
  const target = ghFiling.body_file(filing);
  return target !== null ? _read(target) : null;
}

/** The message a commit is about to write. Its heredoc body is the message itself, and it
 * arrives as the value of an inline flag as well, so it is read before any flag. */
function _commit_body(command: string, tokens: readonly string[]): string | null {
  const body = _heredoc_body(command);
  if (body !== null) {
    return body;
  }
  const inline = _flag(tokens, COMMIT_INLINE);
  if (inline !== null) {
    return inline;
  }
  const path = _flag(tokens, COMMIT_FILE);
  if (path === null) {
    return null;
  }
  // A relative path stays unread: a commit carries no cd this hook can follow the way a
  // filing does, so the shell state that would resolve it is not on the command line.
  return isAbsolute(path) ? _read(path) : null;
}

/** What the command line is about to write, paired with how to label it.
 *
 * Read from tokens rather than from the raw string: a commit message that mentions
 * `gh issue create` would otherwise be taken for a filing, and the body would be looked for
 * in a filing that is not there, so the message reaches no one unproofread. */
export function _target(command: string): readonly [Mode, string] | null {
  try {
    const filing = ghFiling.find(command);
    if (filing !== null) {
      const body = _filing_body(filing);
      return body ? [FILING, body] : null;
    }
    for (const tokens of commandScan.commands(command)) {
      if (tokens[0] === "git" && commandScan.git_subcommand(tokens)[0] === "commit") {
        const body = _commit_body(command, tokens);
        return body ? [COMMIT, body] : null;
      }
    }
  } catch {
    return null; // an unclosed quote hides which command the line runs
  }
  return null;
}

/** The textlint findings section, empty below the mode's Japanese threshold or once textlint
 * itself has run (the retired Python proofreader's _lint_section). */
function _lint_section(body: string, mode: Mode): string {
  if (!hasJapanese(body, mode.threshold)) {
    return "";
  }
  const dir = mkdtempSync(join(tmpdir(), "body-proofread-"));
  try {
    const target = join(dir, "body.md");
    writeFileSync(target, `${body}\n`, "utf8");
    const output = _textlint_lint(target);
    if (!output.trim()) {
      return "";
    }
    const label = mode.label;
    // textlint prints the path on its own line above the findings, and repeats it inside each
    // one. Neither reaches a reader who never saw the temp file.
    const kept = output.split("\n").filter((line) => line.trim() !== target);
    const findings = kept.map((line) => line.replaceAll(target, label)).join("\n");
    return `## textlint 校正結果\n\nこの ${label} は作成済み。以下の指摘のうち直す価値があるものを編集で反映する。\n\n${findings}\n\n`;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** The structure questions, read from the sibling .md (the retired Python proofreader's _checklist).
 *
 * They live there so they read as prose and textlint reaches them, which it cannot do for a
 * string inside this file. Read from the first level-2 heading down, since the lines above it
 * describe the file to whoever edits it rather than to whoever receives the questions.
 *
 * Empty when the file is gone: the proofreading still has something to say, and a checklist
 * nobody can read adds nothing to it. */
function _checklist(): string {
  let body: string;
  try {
    body = readFileSync(new URL("./body_proofread.md", import.meta.url), "utf8");
  } catch {
    return "";
  }
  const marker = "\n## ";
  const at = body.indexOf(marker);
  if (at === -1) {
    return "";
  }
  return `## ${body.slice(at + marker.length)}`.trim();
}

/** Answer via notify. Not a top-level decision / additionalContext pair: PreToolUse reads
 * context only out of hookSpecificOutput, so findings written at that level reach no one. */
function main(): number {
  const raw = readFileSync(0, "utf-8");
  // Cheaper than a scan on a hook that fires for every Bash call. _target decides whether
  // this really writes a body; this only keeps the work off everything else.
  if (!((raw.includes("gh") && raw.includes("create")) || (raw.includes("git") && raw.includes("commit")))) {
    return 0;
  }

  const payload = parse(raw);
  const command = field(payload.tool_input, "command");
  if (typeof command !== "string" || !command) {
    return 0;
  }

  const target = _target(command);
  if (target === null) {
    return 0;
  }
  const [mode, body] = target;

  const parts = [_lint_section(body, mode)];
  if (mode.checklist) {
    parts.push(_checklist());
  }
  const context = parts.filter(Boolean).join("\n\n");
  if (!context) {
    return 0;
  }
  notify(context, "PreToolUse");
  return 0;
}

process.exit(main());
