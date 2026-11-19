#!/opt/homebrew/bin/bun
/// <reference types="node" />
import { which } from "../_lib/executable.ts";
import { field, parse, readStdin } from "../_lib/hook_payload.ts";

export const MANAGERS: ReadonlySet<string> = new Set(["npm", "npx", "pnpm", "yarn", "bun", "bunx"]);

function toNi(args: string): string {
  return args ? `ni ${args}` : "ni";
}

function toNci(): string {
  return "nci";
}

function toNr(args: string): string {
  return args ? `nr ${args}` : "";
}

function toNrTest(args: string): string {
  return args ? `nr test ${args}` : "nr test";
}

function toNrStart(args: string): string {
  return args ? `nr start ${args}` : "nr start";
}

function toNlx(args: string): string {
  return args ? `nlx ${args}` : "";
}

function toNun(args: string): string {
  return args ? `nun ${args}` : "";
}

function toNup(args: string): string {
  return args ? `nup ${args}` : "nup";
}

const SUBCOMMAND_TABLE: ReadonlyMap<string, (args: string) => string> = new Map([
  ["install", toNi],
  ["i", toNi],
  ["add", toNi],
  ["ci", toNci],
  ["run", toNr],
  ["test", toNrTest],
  ["t", toNrTest],
  ["start", toNrStart],
  ["exec", toNlx],
  ["dlx", toNlx],
  ["x", toNlx],
  ["uninstall", toNun],
  ["remove", toNun],
  ["rm", toNun],
  ["un", toNun],
  ["update", toNup],
  ["up", toNup],
  ["upgrade", toNup],
]);

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
  if (subcmd.startsWith("-")) {
    return "";
  }
  if (manager === "bun" && (subcmd === "test" || subcmd === "t")) {
    return "";
  }

  const toRewritten = SUBCOMMAND_TABLE.get(subcmd);
  if (toRewritten) {
    return toRewritten(args);
  }
  return args ? `na ${subcmd} ${args}` : `na ${subcmd}`;
}

function main(): number {
  if (which("ni") === null) return 0;

  const payload = parse(readStdin());
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
