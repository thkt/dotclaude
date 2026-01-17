import * as fs from "fs";
import * as path from "path";
import type { Config, Rule, ToolInput, Violation } from "./types";
import { formatViolations } from "./reporter";

const CONFIG_PATH = path.join(import.meta.dir, "..", "config.json");
const DEFAULT_CONFIG: Config = {
  enabled: true,
  rules: {
    architecture: true,
    typeSafety: true,
    errorHandling: true,
    naming: true,
  },
  severity: {
    blockOn: ["critical", "high"],
  },
};

function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, "utf-8");
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    }
  } catch {
    // Use default config on error
  }
  return DEFAULT_CONFIG;
}

async function loadRules(config: Config): Promise<Rule[]> {
  const rules: Rule[] = [];
  const rulesDir = path.join(import.meta.dir, "..", "rules");

  const ruleModules: [string, keyof Config["rules"]][] = [
    ["architecture", "architecture"],
    ["type-safety", "typeSafety"],
    ["error-handling", "errorHandling"],
    ["naming", "naming"],
  ];

  for (const [file, key] of ruleModules) {
    if (!config.rules[key]) continue;
    try {
      const rulePath = path.join(rulesDir, `${file}.ts`);
      if (fs.existsSync(rulePath)) {
        const module = await import(rulePath);
        if (module.default) rules.push(module.default);
      }
    } catch {
      // Skip rules that fail to load
    }
  }

  return rules;
}

async function parseInput(): Promise<ToolInput | null> {
  try {
    const input = await Bun.stdin.text();
    return JSON.parse(input);
  } catch {
    return null;
  }
}

function getFileAndContent(
  input: ToolInput,
): { filePath: string; content: string } | null {
  const { tool_name, tool_input } = input;

  if (tool_name === "Write") {
    return {
      filePath: tool_input.file_path || "",
      content: tool_input.content || "",
    };
  }

  if (tool_name === "Edit") {
    return {
      filePath: tool_input.file_path || "",
      content: tool_input.new_string || "",
    };
  }

  if (tool_name === "MultiEdit") {
    const edits = tool_input.edits || [];
    return {
      filePath: tool_input.file_path || "",
      content: edits.map((e) => e.new_string || "").join("\n"),
    };
  }

  return null;
}

async function main(): Promise<void> {
  const config = loadConfig();

  if (!config.enabled) {
    process.exit(0);
  }

  const input = await parseInput();
  if (!input) {
    process.exit(0);
  }

  const fileInfo = getFileAndContent(input);
  if (!fileInfo || !fileInfo.filePath || !fileInfo.content) {
    process.exit(0);
  }

  const rules = await loadRules(config);
  const violations: Violation[] = [];

  for (const rule of rules) {
    if (!rule.filePattern.test(fileInfo.filePath)) continue;
    const found = rule.check(fileInfo.content, fileInfo.filePath);
    violations.push(...found);
  }

  const blocking = violations.filter((v) =>
    config.severity.blockOn.includes(v.severity),
  );

  if (blocking.length > 0) {
    console.error(formatViolations(blocking));
    process.exit(2);
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
