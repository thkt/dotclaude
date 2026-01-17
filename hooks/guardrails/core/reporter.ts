import type { Violation } from "./types";

const SEVERITY_ICONS: Record<string, string> = {
  critical: "🚨",
  high: "⚠️",
  medium: "⚡",
  low: "💡",
};

export function formatViolations(violations: Violation[]): string {
  if (violations.length === 0) return "";

  const lines: string[] = [
    "",
    "═".repeat(60),
    "🛡️  GUARDRAILS CHECK",
    "═".repeat(60),
  ];

  for (const v of violations) {
    const icon = SEVERITY_ICONS[v.severity] || "⚠️";
    lines.push("");
    lines.push(`${icon} [${v.severity.toUpperCase()}] ${v.rule}`);
    lines.push(`   @what: ${v.what}`);
    lines.push(`   @why: ${v.why}`);
    lines.push(`   @failure: ${v.failure}`);
    lines.push(`   File: ${v.file}${v.line ? `:${v.line}` : ""}`);
  }

  lines.push("");
  lines.push("─".repeat(60));
  lines.push("This operation has been BLOCKED.");
  lines.push("Fix the issues above and try again.");
  lines.push("═".repeat(60));
  lines.push("");

  return lines.join("\n");
}
