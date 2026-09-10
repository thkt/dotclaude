#!/opt/homebrew/bin/bun
/// <reference types="node" />
// PreToolUse hook: rewrite a package manager command into its ni equivalent.
// TypeScript side of hooks/pre-bash/package_manager_rewrite.py (unit U-004). MANAGERS / convert
// / main carry the Python side's names and shapes; convert is exported the way the plan
// requires.
//
// which() ports Python's shutil.which("ni") via node:fs existence checks over PATH rather than
// node:child_process: a PATH search needs no subprocess, and every other gate in this hook
// (readFileSync, statSync) already goes through node:fs.
import { accessSync, constants, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { field, parse } from "../_lib/hook_payload.ts";

export const MANAGERS: ReadonlySet<string> = new Set(["npm", "npx", "pnpm", "yarn", "bun", "bunx"]);

/** The absolute path of the first executable named `name` on PATH, null when none resolves.
 *
 * Mirrors shutil.which(name): a plain existence check is not enough, since a matching name
 * that is not executable (X_OK) is not a usable command either. */
function which(name: string): string | null {
  const dirs = (process.env.PATH ?? "").split(path.delimiter);
  for (const dir of dirs) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    try {
      if (!statSync(candidate).isFile()) continue;
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      continue;
    }
  }
  return null;
}

/** The ni equivalent of an already-split command, empty for one to leave alone. */
export function convert(parts: readonly string[]): string {
  const manager = parts[0];
  const rest = parts.slice(1);

  if (manager === "npx" || manager === "bunx") {
    return rest.length ? `nlx ${rest.join(" ")}` : "";
  }
  if (rest.length === 0) {
    return "ni";
  }

  const subcmd = rest[0];
  const args = rest.slice(1).join(" ");
  // `na --version` answers with ni's own version rather than the manager's, so a flag must
  // not reach the subcommand table below.
  if (subcmd.startsWith("-")) {
    return "";
  }
  // bun's built-in test runner, which is not the package.json script `nr test` would run.
  if (manager === "bun" && (subcmd === "test" || subcmd === "t")) {
    return "";
  }

  if (subcmd === "install" || subcmd === "i" || subcmd === "add") {
    return args ? `ni ${args}` : "ni";
  }
  if (subcmd === "ci") {
    return "nci";
  }
  if (subcmd === "run") {
    return args ? `nr ${args}` : "";
  }
  if (subcmd === "test" || subcmd === "t") {
    return args ? `nr test ${args}` : "nr test";
  }
  if (subcmd === "start") {
    return args ? `nr start ${args}` : "nr start";
  }
  if (subcmd === "exec" || subcmd === "dlx" || subcmd === "x") {
    return args ? `nlx ${args}` : "";
  }
  if (subcmd === "uninstall" || subcmd === "remove" || subcmd === "rm" || subcmd === "un") {
    return args ? `nun ${args}` : "";
  }
  if (subcmd === "update" || subcmd === "up" || subcmd === "upgrade") {
    return args ? `nup ${args}` : "nup";
  }
  // na passes the subcommand to the detected agent verbatim, so a manager-specific one such
  // as `bun pm ls` still reaches the manager that understands it.
  return args ? `na ${subcmd} ${args}` : `na ${subcmd}`;
}

function main(): number {
  if (which("ni") === null) return 0;

  const payload = parse(readFileSync(0, "utf-8"));
  const command = field(field(payload, "tool_input"), "command");
  if (typeof command !== "string") return 0;

  const parts = command.split(/\s+/).filter(Boolean);
  if (parts.length === 0 || !MANAGERS.has(parts[0])) return 0;

  const rewritten = convert(parts);
  if (!rewritten) return 0;

  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: `auto-package-manager: ${parts[0]} → ${rewritten.split(/\s+/)[0]}`,
        updatedInput: { command: rewritten },
      },
    })}\n`,
  );
  return 0;
}

process.exit(main());
