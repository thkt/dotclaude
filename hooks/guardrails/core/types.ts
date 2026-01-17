export interface Violation {
  rule: string;
  severity: "critical" | "high" | "medium" | "low";
  what: string;
  why: string;
  failure: string;
  file: string;
  line?: number;
}

export interface Rule {
  name: string;
  filePattern: RegExp;
  check: (content: string, filePath: string) => Violation[];
}

export interface ToolInput {
  tool_name: string;
  tool_input: {
    file_path?: string;
    content?: string;
    new_string?: string;
    edits?: Array<{ new_string?: string }>;
  };
}

export interface Config {
  enabled: boolean;
  rules: {
    architecture: boolean;
    typeSafety: boolean;
    errorHandling: boolean;
    naming: boolean;
  };
  severity: {
    blockOn: ("critical" | "high" | "medium" | "low")[];
  };
}
