/// <reference types="node" />
// Shared bun-shebang and git-discovery primitives for hooks/**'s TypeScript shebang checks: the
// .ts counterpart of hooks/_lib/tests/shebang_test.py's SHEBANG / STALE_SHEBANG / EXEC_MODE /
// _tracked_entries. Every exec-bit check and every shebang-content check reads the bun path from
// SHEBANG rather than typing the literal again.
//
// DR-0114 fixes the interpreter path: settings.json runs hooks on a truncated PATH, so the
// shebang line has to resolve without a shim, and Homebrew's `#!/opt/homebrew/bin/bun` is the
// one path stable across machines (bun.sh's installer default `~/.bun/bin/bun` is per-home).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// hooks/_lib/shebang_scope.ts -> hooks/_lib -> hooks -> repo root.
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** DR-0114's absolute bun interpreter path. */
export const SHEBANG: string = "#!/opt/homebrew/bin/bun";

/** The line the hooks/ checks treat as stale. `#!/usr/bin/env node` is not on this list: the two
 * tracked .ts files carrying it, skills/_lib/harness_hash.ts and workflows/_lib/gate.ts, sit
 * outside hooks/ and never enter these checks' subject set. */
export const STALE_SHEBANG: string = "#!/usr/bin/env bun";

const EXEC_MODE = "100755";

/** Where the positive-control fixtures live (docs/wiki/absence-test-positive-control-fixture.md).
 * They carry the violations on purpose, so a scan over real hooks/ files passes
 * FIXTURES_EXCLUDE alongside its pathspec; a scan that names a fixture path directly does not. */
export const FIXTURES_ROOT = "hooks/_lib/tests/fixtures";
export const FIXTURES_EXCLUDE = `:(exclude)${FIXTURES_ROOT}/**`;

/** (git file mode, absolute path) for every tracked file the pathspec matches, read from
 * `git ls-files -s` like shebang_test.py's `_tracked_entries`. git resolves the pathspec, so an
 * include glob and an `:(exclude)` token go in one call; nothing is added or removed here.
 *
 * Wildcards follow git's default matching, where `*` crosses `/`: `hooks/*.ts` reaches every
 * depth, while `hooks/** /*.ts` would skip hooks/'s direct children. */
export function trackedEntries(
  pathspec: string | readonly string[],
): Array<[mode: string, absolutePath: string]> {
  const tokens = typeof pathspec === "string" ? [pathspec] : [...pathspec];
  // -z: a path with non-ASCII bytes is otherwise C-quoted under core.quotePath and joins to a
  // path that does not exist.
  const output = execFileSync("git", ["-C", REPO, "ls-files", "-s", "-z", "--", ...tokens], {
    encoding: "utf8",
  });
  const entries: Array<[string, string]> = [];
  for (const line of output.split("\0")) {
    if (!line) continue;
    const tab = line.indexOf("\t");
    const mode = line.slice(0, tab).split(" ")[0] ?? "";
    entries.push([mode, path.join(REPO, line.slice(tab + 1))]);
  }
  return entries;
}

/** shebang_test.py's `is_file()` guard: an index entry whose file was removed with a plain `rm`
 * is skipped rather than aborting the scan. */
function readTextOrNull(absolutePath: string): string | null {
  try {
    return readFileSync(absolutePath, "utf8");
  } catch {
    return null;
  }
}

const LINE_BREAK = /\r?\n/;

function firstLine(text: string): string {
  return text.split(LINE_BREAK, 1)[0] ?? "";
}

function relative(absolutePath: string): string {
  return path.relative(REPO, absolutePath);
}

/** shebang_test.py's ExecutableShebang.test_T_001 with the pathspec and the expected shebang as
 * arguments, so one call scans hooks/'s real .ts files and another a positive-control fixture. */
export function executableShebangOffenders(
  pathspec: string | readonly string[],
  shebang: string,
): string[] {
  const offenders: string[] = [];
  for (const [mode, absolutePath] of trackedEntries(pathspec)) {
    if (mode !== EXEC_MODE) continue;
    const text = readTextOrNull(absolutePath);
    if (text !== null && firstLine(text) !== shebang) offenders.push(relative(absolutePath));
  }
  return offenders;
}

/** shebang_test.py's NoStaleShebang.test_T_002 with the pathspec and the stale line as arguments.
 * readFileSync's utf8 decoding never throws on invalid bytes, so the python side's
 * UnicodeDecodeError skip has no counterpart here. */
export function staleShebangOffenders(
  pathspec: string | readonly string[],
  staleLine: string,
): string[] {
  const offenders: string[] = [];
  for (const [, absolutePath] of trackedEntries(pathspec)) {
    const text = readTextOrNull(absolutePath);
    if (text !== null && text.split(LINE_BREAK).includes(staleLine)) {
      offenders.push(relative(absolutePath));
    }
  }
  return offenders;
}

/** shebang_test.py's `_settings_command_scripts`: the repo-relative .ts paths a settings tree
 * names as a hook command. */
function settingsCommandScripts(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) settingsCommandScripts(item, out);
    return;
  }
  if (node !== null && typeof node === "object") {
    const record = node as Record<string, unknown>;
    if (typeof record.command === "string") {
      for (const token of record.command.split(/\s+/)) {
        if (token.startsWith("~/.claude/") && token.endsWith(".ts")) {
          out.push(token.slice("~/.claude/".length));
        }
      }
    }
    for (const value of Object.values(record)) settingsCommandScripts(value, out);
  }
}

/** shebang_test.py's SettingsCommandShebang.test_T_003 with the settings tree as an argument, so
 * the same call checks the repository's settings.json and a settings-shaped fixture. The mode
 * map covers fixtures too, because the fixture names a path under fixtures/ on purpose. */
export function settingsCommandShebangOffenders(settings: unknown, shebang: string): string[] {
  const hooksNode =
    settings !== null && typeof settings === "object"
      ? (settings as Record<string, unknown>).hooks
      : undefined;
  const scripts: string[] = [];
  settingsCommandScripts(hooksNode ?? {}, scripts);

  const trackedModes = new Map(
    trackedEntries("hooks/*.ts").map(([mode, absolutePath]) => [relative(absolutePath), mode]),
  );
  const offenders: string[] = [];
  for (const rel of scripts) {
    const text = trackedModes.get(rel) === EXEC_MODE ? readTextOrNull(path.join(REPO, rel)) : null;
    if (text === null || firstLine(text) !== shebang) offenders.push(rel);
  }
  return offenders;
}

/** shebang_test.py's LibHasNoShebang.test_T_004 with the pathspec as an argument. */
export function libHasShebangOffenders(pathspec: string | readonly string[]): string[] {
  const offenders: string[] = [];
  for (const [, absolutePath] of trackedEntries(pathspec)) {
    const text = readTextOrNull(absolutePath);
    if (text !== null && firstLine(text).startsWith("#!")) offenders.push(relative(absolutePath));
  }
  return offenders;
}
