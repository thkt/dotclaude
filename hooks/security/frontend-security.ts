#!/usr/bin/env bun
/**
 * Frontend Security Hook for Claude Code
 *
 * Detects security vulnerabilities in frontend code during Edit/Write/MultiEdit operations.
 * Based on Anthropic's security-guidance plugin, filtered for frontend patterns.
 *
 * Exit codes:
 * - 0: No issues found
 * - 2: Security issue detected (blocks the operation)
 */

import * as fs from "fs";
import * as path from "path";

type Severity = "critical" | "high" | "medium";

interface SecurityRule {
  pattern: RegExp;
  filePattern: RegExp;
  message: string;
  recommendation: string;
  severity: Severity;
}

interface Issue {
  rule: string;
  message: string;
  recommendation: string;
  severity: Severity;
  file: string;
}

interface ToolInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    new_string?: string;
    edits?: Array<{ new_string?: string }>;
  };
}

const FRONTEND_PATTERNS: Record<string, SecurityRule> = {
  "react-xss": {
    pattern: /dangerouslySetInnerHTML/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "XSS Risk: dangerouslySetInnerHTML detected",
    recommendation: "Use DOMPurify to sanitize HTML or avoid innerHTML entirely",
    severity: "high",
  },
  "dom-write": {
    pattern: /document\.write\s*\(/,
    filePattern: /\.(jsx?|tsx?|html?)$/,
    message: "XSS Risk: document.write() detected",
    recommendation: "Use DOM methods like createElement/appendChild instead",
    severity: "high",
  },
  "innerHTML-assignment": {
    pattern: /\.innerHTML\s*=/,
    filePattern: /\.(jsx?|tsx?|html?)$/,
    message: "XSS Risk: Direct innerHTML assignment detected",
    recommendation: "Use textContent for text, or sanitize with DOMPurify",
    severity: "high",
  },
  "eval-function": {
    pattern: /\beval\s*\(/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Code Injection Risk: eval() detected",
    recommendation: "Use JSON.parse() for JSON, or Function constructor with caution",
    severity: "critical",
  },
  "new-function": {
    pattern: /new\s+Function\s*\(/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Code Injection Risk: new Function() detected",
    recommendation: "Avoid dynamic code execution. Use tagged templates, JSON.parse(), or safe evaluator",
    severity: "critical",
  },
  "outerHTML-assignment": {
    pattern: /\.outerHTML\s*=/,
    filePattern: /\.(jsx?|tsx?|html?)$/,
    message: "XSS Risk: Direct outerHTML assignment detected",
    recommendation: "Use DOM methods for element manipulation",
    severity: "medium",
  },
  "setTimeout-string": {
    pattern: /setTimeout\s*\(\s*['\"`]/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Code Injection Risk: setTimeout with string argument detected",
    recommendation: "Use function reference: setTimeout(() => { ... }, delay)",
    severity: "high",
  },
  "setInterval-string": {
    pattern: /setInterval\s*\(\s*['\"`]/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Code Injection Risk: setInterval with string argument detected",
    recommendation: "Use function reference: setInterval(() => { ... }, delay)",
    severity: "high",
  },
  "postMessage-unsafe": {
    pattern: /\.postMessage\s*\([^,]+,\s*['\"`]\*['\"`]\s*\)/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Security Risk: postMessage with '*' targetOrigin detected",
    recommendation: "Specify exact origin instead of '*' to prevent data leakage",
    severity: "high",
  },
  "localStorage-sensitive": {
    pattern: /localStorage\.(setItem|getItem)\s*\(\s*['\"`](token|password|secret|key|auth|credential)/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Security Risk: Sensitive data stored in localStorage",
    recommendation: "Use httpOnly cookies for tokens/credentials",
    severity: "medium",
  },
  "sessionStorage-sensitive": {
    pattern: /sessionStorage\.(setItem|getItem)\s*\(\s*['\"`](token|password|secret|key|auth|credential)/,
    filePattern: /\.(jsx?|tsx?)$/,
    message: "Security Risk: Sensitive data stored in sessionStorage",
    recommendation: "Use httpOnly cookies for tokens/credentials",
    severity: "medium",
  },
};

const STATE_DIR = path.join(process.env.HOME || "", ".claude", "logs", "security-hooks");
const LOG_FILE = path.join(process.env.HOME || "", ".claude", "logs", "security-warnings.log");

function getSessionId(): string {
  return process.env.CLAUDE_SESSION_ID || "unknown";
}

function getStateFile(): string {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  return path.join(STATE_DIR, `warnings-${getSessionId()}.json`);
}

function loadWarnings(): Set<string> {
  const stateFile = getStateFile();
  try {
    if (fs.existsSync(stateFile)) {
      const data = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
      return new Set(data.warnings || []);
    }
  } catch {
    // Ignore errors
  }
  return new Set();
}

function saveWarning(warningKey: string): void {
  try {
    const stateFile = getStateFile();
    const warnings = loadWarnings();
    warnings.add(warningKey);
    fs.writeFileSync(stateFile, JSON.stringify({ warnings: [...warnings] }));
  } catch {
    // Ignore write errors
  }
}

function logCheck(message: string): void {
  try {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${timestamp}] ${message}\n`);
  } catch {
    // Ignore log errors
  }
}

function checkContent(content: string, filePath: string): Issue[] {
  const issues: Issue[] = [];
  const existingWarnings = loadWarnings();

  for (const [ruleName, rule] of Object.entries(FRONTEND_PATTERNS)) {
    if (!rule.filePattern.test(filePath)) continue;
    if (!rule.pattern.test(content)) continue;

    const warningKey = `${filePath}:${ruleName}`;
    if (existingWarnings.has(warningKey)) continue;

    issues.push({
      rule: ruleName,
      message: rule.message,
      recommendation: rule.recommendation,
      severity: rule.severity,
      file: filePath,
    });
    saveWarning(warningKey);
  }

  return issues;
}

function formatWarning(issues: Issue[]): string {
  const icons: Record<Severity, string> = {
    critical: "🚨",
    high: "⚠️",
    medium: "⚡",
  };

  const lines = ["\n" + "=".repeat(60)];
  lines.push("🛡️  FRONTEND SECURITY CHECK");
  lines.push("=".repeat(60));

  for (const issue of issues) {
    const icon = icons[issue.severity];
    lines.push(`\n${icon} [${issue.severity.toUpperCase()}] ${issue.message}`);
    lines.push(`   File: ${issue.file}`);
    lines.push(`   Recommendation: ${issue.recommendation}`);
  }

  lines.push("\n" + "-".repeat(60));
  lines.push("This operation has been BLOCKED for security review.");
  lines.push("Fix the issues above and try again.");
  lines.push("=".repeat(60) + "\n");

  return lines.join("\n");
}

async function main(): Promise<void> {
  try {
    const inputData: ToolInput = JSON.parse(await Bun.stdin.text());
    const { tool_name, tool_input } = inputData;

    let filePath = "";
    let content = "";

    if (tool_name === "Write") {
      filePath = tool_input.file_path || "";
      content = tool_input.content || "";
    } else if (tool_name === "Edit") {
      filePath = tool_input.file_path || "";
      content = tool_input.new_string || "";
    } else if (tool_name === "MultiEdit") {
      filePath = tool_input.file_path || "";
      content = (tool_input.edits || []).map((e) => e.new_string || "").join("\n");
    } else {
      process.exit(0);
    }

    if (!filePath || !content) {
      process.exit(0);
    }

    logCheck(`Checking ${tool_name} on ${filePath}`);
    const issues = checkContent(content, filePath);

    if (issues.length > 0) {
      logCheck(`Found ${issues.length} issue(s) in ${filePath}`);
      console.error(formatWarning(issues));
      process.exit(2);
    }

    logCheck(`No issues found in ${filePath}`);
  } catch {
    // Don't block on errors
  }

  process.exit(0);
}

main();
